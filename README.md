# 🐕 Kocher Iditarod Family Tracker

A free, static website hosted on GitHub Pages to track your family's Iditarod picks.

## Live Site
**https://blackcrowx00.github.io/kocher-iditarod/**

---

## How It Works

- Pulls live standings from `iditarod.com/race/2026/standings/` via a CORS proxy
- Each family member picks 3 mushers — the site scores them by race position
- Scoring: higher position = more points (best = 100 pts for 1st place)
- Falls back to demo data if live fetch fails (site always works)
- Config is saved in browser localStorage — each family member sets their own picks

---

## Setup Instructions (One-Time)

### 1. Push this code to GitHub

```bash
git clone https://github.com/blackcrowx00/kocher-iditarod.git
cd kocher-iditarod

# Copy these files into the folder, then:
git add .
git commit -m "Initial Iditarod tracker"
git push origin main
```

### 2. Enable GitHub Pages

1. Go to your repo: https://github.com/blackcrowx00/kocher-iditarod
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **GitHub Actions**
4. Click Save

The site will auto-deploy in ~1 minute. Your URL will be:
**https://blackcrowx00.github.io/kocher-iditarod/**

### 3. Set Your Family Picks

1. Visit the live site
2. Click **⚙️ Configure Picks**
3. Enter each family member's name and their 3 musher picks
4. Click **💾 Save Configuration**

> Note: Picks are saved in your browser. Each family member should enter their own picks on their own device, OR one person sets it up and everyone uses the same device/browser.

---

## Updating Picks Each Year

1. Edit `index.html` — find `DEFAULT_CONFIG` near the top of the `<script>` section
2. Update the musher names to match the new year's roster
3. Change the year badge: find `2026 SEASON` and update it
4. Push to GitHub — auto-deploys in ~1 minute

---

## Cost

**$0.00** — GitHub Pages is completely free for public repositories.

---

## File Structure

```
kocher-iditarod/
├── index.html              # The entire app (single file)
├── .github/
│   └── workflows/
│       └── deploy.yml      # Auto-deploy to GitHub Pages
└── README.md
```
