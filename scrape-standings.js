/**
 * scrape-standings.js
 * Logs into iditarod.com using your Insider credentials (stored as GitHub Secrets),
 * scrapes the live standings page, and saves standings.json.
 *
 * Required GitHub Secrets (set in repo Settings → Secrets → Actions):
 *   IDITAROD_USERNAME  — your iditarod.com login email or username
 *   IDITAROD_PASSWORD  — your iditarod.com password
 */

const { chromium } = require('playwright');
const fs = require('fs');

const USERNAME = process.env.IDITAROD_USERNAME;
const PASSWORD = process.env.IDITAROD_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error('Missing IDITAROD_USERNAME or IDITAROD_PASSWORD environment variables.');
  console.error('Add them as GitHub Secrets: repo Settings → Secrets and variables → Actions → New repository secret');
  process.exit(1);
}

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Block images/media to speed up load
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,mp4,mp3}', r => r.abort());

  // ── STEP 1: Log in ──────────────────────────────────────────────
  console.log('Navigating to login page...');
  await page.goto('https://iditarod.com/my-account/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.fill('input[name="username"]', USERNAME);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
    page.click('button[name="login"], input[type="submit"]')
  ]).catch(() => {});

  const currentUrl = page.url();
  console.log('After login URL:', currentUrl);
  if (currentUrl.includes('my-account') && !currentUrl.includes('login')) {
    console.log('✅ Login successful');
  } else {
    console.warn('⚠️  Login may have failed — continuing anyway');
  }

  // ── STEP 2: Load the standings page ────────────────────────────
  console.log('Loading standings page...');
  await page.goto('https://iditarod.com/race/2026/standings/', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Give JS extra time to render the standings
  await page.waitForTimeout(4000);

  await page.waitForSelector('table tr td, [class*="musher"], [class*="standing"], [class*="racer"]', {
    timeout: 15000
  }).catch(() => console.log('Selector wait timed out — proceeding with what rendered'));

  // ── STEP 3: Extract standings data ─────────────────────────────
  console.log('Extracting standings data...');
  const standings = await page.evaluate(() => {
    const results = [];

    // Strategy 1: Look for HTML tables with position + name cells
    for (const table of document.querySelectorAll('table')) {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length < 3) continue;
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim());
        if (cells.length < 2) continue;
        const posMatch = cells.find(c => /^\d{1,3}$/.test(c));
        const nameMatch = cells.find(c =>
          /^[A-Z][a-z]/.test(c) && c.split(' ').length >= 2 && c.length > 4 &&
          !/^(Racing|Finished|Scratched|DNF|Status|Musher|Position|Place|Checkpoint|Time)$/i.test(c)
        );
        if (!posMatch || !nameMatch) continue;
        const statusRaw = cells.find(c => /^(Racing|Finished|Scratched|DNF)$/i.test(c)) || '';
        const checkpoint = cells.find(c =>
          c !== nameMatch && c !== posMatch && c !== statusRaw &&
          c.length > 2 && !/^\d+(\.\d+)?$/.test(c) && !/^(Racing|Finished|Scratched|DNF)$/i.test(c)
        ) || '';
        results.push({
          pos: parseInt(posMatch),
          name: nameMatch,
          status: /finish/i.test(statusRaw) ? 'Finished' : /scratch|dnf/i.test(statusRaw) ? 'Scratched' : 'Racing',
          checkpoint
        });
      }
      if (results.length > 5) break;
    }

    // Strategy 2: CSS class-based rows (React/Vue rendered standings)
    if (results.length === 0) {
      const rowSelectors = [
        '[class*="musher-row"]', '[class*="racer-row"]', '[class*="standing-row"]',
        '[class*="standing-item"]', '[class*="race-entry"]', '[class*="leaderboard"] > *'
      ];
      for (const sel of rowSelectors) {
        const els = document.querySelectorAll(sel);
        if (els.length < 3) continue;
        els.forEach((el, i) => {
          const parts = el.innerText.trim().split(/\n+/).map(s => s.trim()).filter(Boolean);
          const pos  = parts.find(t => /^\d{1,3}$/.test(t));
          const name = parts.find(t =>
            /^[A-Z][a-z]/.test(t) && t.split(' ').length >= 2 &&
            !/^(Racing|Finished|Scratched|DNF)$/i.test(t)
          );
          const status = parts.find(t => /^(Racing|Finished|Scratched|DNF)$/i.test(t)) || 'Racing';
          const checkpoint = parts.find(t =>
            t !== name && t !== pos && !/^\d+$/.test(t) && !/^(Racing|Finished|Scratched|DNF)$/i.test(t)
          ) || '';
          if (name) results.push({
            pos: pos ? parseInt(pos) : i + 1,
            name,
            status: /finish/i.test(status) ? 'Finished' : /scratch|dnf/i.test(status) ? 'Scratched' : 'Racing',
            checkpoint
          });
        });
        if (results.length > 5) break;
      }
    }

    return results;
  });

  await browser.close();

  if (standings.length === 0) {
    console.error('❌ No standings extracted. Login may have failed or page structure changed.');
    console.error('Try running the scraper manually: workflow_dispatch from the Actions tab.');
    process.exit(1);
  }

  // Sort, deduplicate
  standings.sort((a, b) => a.pos - b.pos);
  const seen = new Set();
  const mushers = standings.filter(m => {
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });

  const output = {
    updated: new Date().toISOString(),
    source: 'https://iditarod.com/race/2026/standings/',
    count: mushers.length,
    mushers
  };

  fs.writeFileSync('standings.json', JSON.stringify(output, null, 2));
  console.log(`✅ Saved ${mushers.length} mushers to standings.json`);
  console.log('Top 5:', mushers.slice(0, 5).map(m => `${m.pos}. ${m.name}`).join(' | '));
})();
