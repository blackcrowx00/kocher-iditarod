/**
 * scrape-standings.js
 * Fetches iditarod.com/race/2026/standings/ using a real headless browser
 * (no login required — standings are publicly visible).
 * Saves results to standings.json.
 */

const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Block heavy assets to speed up
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,mp4,mp3,pdf}', r => r.abort());

  console.log('Loading standings page...');
  await page.goto('https://iditarod.com/race/2026/standings/', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Give JS extra time to render the standings table
  await page.waitForTimeout(5000);

  // Log page title so we can confirm it loaded
  const title = await page.title();
  console.log('Page title:', title);

  // Try to wait for any table or race data element
  await page.waitForSelector('table, [class*="standing"], [class*="musher"], [class*="racer"]', {
    timeout: 15000
  }).catch(() => console.log('No specific selector found, extracting whatever rendered...'));

  // Dump the full rendered text so we can debug if needed
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('Page text preview:\n', bodyText);

  const standings = await page.evaluate(() => {
    const results = [];

    // Strategy 1: Standard HTML table rows
    for (const table of document.querySelectorAll('table')) {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length < 3) continue;
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim());
        if (cells.length < 2) continue;
        const pos  = cells.find(c => /^\d{1,3}$/.test(c));
        const name = cells.find(c =>
          /^[A-Z][a-z]/.test(c) && c.split(' ').length >= 2 && c.length > 4 &&
          !/^(Racing|Finished|Scratched|DNF|Status|Position|Musher|Checkpoint|Time|Bib)$/i.test(c)
        );
        if (!pos || !name) continue;
        const statusRaw = cells.find(c => /^(Racing|Finished|Scratched|DNF)$/i.test(c)) || '';
        const checkpoint = cells.find(c =>
          c !== name && c !== pos && c !== statusRaw &&
          c.length > 2 && !/^\d+$/.test(c) &&
          !/^(Racing|Finished|Scratched|DNF)$/i.test(c)
        ) || '';
        results.push({
          pos: parseInt(pos),
          name,
          status: /finish/i.test(statusRaw) ? 'Finished' : /scratch|dnf/i.test(statusRaw) ? 'Scratched' : 'Racing',
          checkpoint
        });
      }
      if (results.length > 5) break;
    }

    // Strategy 2: CSS class-based rendered rows (React/Vue SPA)
    if (results.length === 0) {
      for (const sel of ['[class*="musher"]', '[class*="standing"]', '[class*="racer"]', '[class*="entry"]']) {
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
          if (name && pos) results.push({
            pos: parseInt(pos), name,
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
    console.error('❌ No standings extracted. Dumping page HTML for debugging...');
    // Don't overwrite existing standings.json with empty data
    process.exit(1);
  }

  // Sort and deduplicate
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
