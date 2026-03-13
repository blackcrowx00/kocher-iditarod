# 🐕‍🦺 Kocher Iditarod Family Tracker

A free, automated family scoreboard for the Iditarod dog sled race. Each family member picks 3 mushers before the race — the site scores everyone using live standings scraped automatically from iditarod.com every 3 hours.

**Live Site:** https://blackcrowx00.github.io/kocher-iditarod/

---

## 📁 File Structure

Every file must be in exactly the right location in the repo or things will break.

```
kocher-iditarod/                        ← repo root
├── index.html                          ← the website (single file, entire app)
├── scrape-standings.js                 ← Node.js script that scrapes iditarod.com
├── standings.json                      ← race data (auto-updated by scraper)
├── README.md                           ← this file
└── .github/                            ← hidden folder — GitHub Actions lives here
    └── workflows/
        ├── deploy.yml                  ← auto-deploys site to GitHub Pages on every push
        └── scrape-standings.yml        ← runs scraper every 3 hours during race month
```

> ⚠️ The `.github` folder starts with a dot which makes it invisible in some file explorers (Mac Finder, Windows Explorer). Make sure it gets uploaded — check your repo on GitHub and confirm you can see a `.github` folder in the file list.

---

## 🚀 How To Upload Files To GitHub (Step By Step)

### Option A — Using the GitHub Website (easiest, no coding required)

**Step 1 — Upload the main files**
1. Go to https://github.com/blackcrowx00/kocher-iditarod
2. Click **Add file → Upload files**
3. Drag and drop these 4 files:
   - `index.html`
   - `scrape-standings.js`
   - `standings.json`
   - `README.md`
4. Scroll down and click **Commit changes**

**Step 2 — Create the workflows folder and deploy.yml**
1. Click **Add file → Create new file**
2. In the filename box type exactly: `.github/workflows/deploy.yml`
   - GitHub will automatically create the folders as you type the slashes
3. Paste the contents of your `deploy.yml` file into the editor
4. Click **Commit changes**

**Step 3 — Create scrape-standings.yml**
1. Click **Add file → Create new file**
2. In the filename box type exactly: `.github/workflows/scrape-standings.yml`
3. Paste the contents of your `scrape-standings.yml` file into the editor
4. Click **Commit changes**

---

### Option B — Using Git on your computer (faster for future updates)

```bash
# First time only — clone the repo to your computer
git clone https://github.com/blackcrowx00/kocher-iditarod.git
cd kocher-iditarod

# Copy your files into this folder, then run:
git add -A
git commit -m "Initial upload"
git push origin main
```

For future updates (e.g. changing picks next year):
```bash
# Edit your files, then:
git add -A
git commit -m "Update 2027 picks"
git push origin main
```

---

## ⚙️ One-Time GitHub Setup

### 1. Enable GitHub Pages
1. Go to your repo → **Settings** (top menu bar)
2. In the left sidebar click **Pages**
3. Under **Source** select **GitHub Actions**
4. Click **Save**

Your site will be live at **https://blackcrowx00.github.io/kocher-iditarod/** within about 1 minute of your first push.

### 2. Enable GitHub Actions
1. Go to your repo → **Actions** tab
2. If you see a yellow banner saying workflows are disabled, click **"I understand my workflows, enable them"**

### 3. Test the Scraper Manually
1. Go to **Actions** tab
2. Click **Scrape Iditarod Standings** in the left sidebar
3. Click **Run workflow → Run workflow**
4. Click into the running job → expand the **"Scrape standings"** step
5. You should see `✅ Saved X mushers to standings.json` in the logs
6. Go back to your repo root and click `standings.json` — it should now contain real musher data

---

## 🏆 How Scoring Works

Each family member picks 3 mushers before the race starts. Points are awarded based on each musher's current race position:

| Race Position | Points |
|---|---|
| 1st | 10 pts |
| 2nd | 8 pts |
| 3rd | 6 pts |
| 4th | 5 pts |
| 5th | 4 pts |
| 6th | 3 pts |
| 7th | 2 pts |
| 8th, 9th, 10th | 1 pt each |
| 11th or lower | 0 pts |
| Scratched / DNF | 0 pts |

Each family member's **total score = sum of points from their 3 mushers**. Highest score wins.

---

## 🤖 How The Automatic Data Works

1. GitHub Actions runs `scrape-standings.yml` **every 3 hours during March**
2. It installs Node.js and Playwright (a headless Chrome browser)
3. `scrape-standings.js` launches Chrome, loads `iditarod.com/race/2026/standings/`, waits for the page to fully render, and extracts the standings table
4. The data is saved to `standings.json` and committed back to the repo automatically
5. The website (`index.html`) fetches `standings.json` every time someone loads the page

**No login or credentials are required** — the standings page is publicly visible on iditarod.com.

You can also trigger a manual scrape any time from the **Actions tab → Scrape Iditarod Standings → Run workflow**.

---

## ✏️ Updating Family Picks Each Year

Open `index.html` in any text editor and find this section near the bottom:

```javascript
const DEFAULT_CONFIG = {
  members:[
    {name:"Makayla", color:"#38bdf8", picks:["Michelle Phillips","Ryan Redington","Riley Dyche"]},
    {name:"Ryan",    color:"#3ecf8e", picks:["Jessie Holmes","Jeff Deeter","Wade Marrs"]},
    {name:"Kit",     color:"#a78bfa", picks:["Matt Hall","Travis Beals","Peter Kaiser"]},
    {name:"Chuck",   color:"#f59e0b", picks:["Paige Drobny","Mille Porsild","Bailey Vitello"]}
  ]
};
```

- Replace musher names with your new picks for that year
- Musher names must match **exactly** as they appear on iditarod.com (check the Race Standings tab on the live site)
- You can also change member names and colors here

Also update the year in two places in `index.html`:
- Find `2026 SEASON` and change to `2027 SEASON`

And in `scrape-standings.js`:
- Find `iditarod.com/race/2026/standings/` and change `2026` to `2027`

Then push the changes to GitHub — the site redeploys automatically in about 1 minute.

---

## 🐛 Troubleshooting

**Site not updating / shows old data**
- Go to Actions tab and check if the scraper ran successfully (green checkmark)
- If it failed, click into the run and read the error in the "Scrape standings" step
- Try running it manually: Actions → Scrape Iditarod Standings → Run workflow

**Scraper says "No standings extracted"**
- iditarod.com may have changed their page structure
- Check the "Page text preview" in the scraper logs — if it shows real musher names, the selectors need updating
- Open an issue or update the selectors in `scrape-standings.js`

**Workflow doesn't appear in Actions tab**
- Confirm `.github/workflows/scrape-standings.yml` exists in your repo (check the file tree)
- The `.github` folder must be in the repo root, not inside another folder
- File names are case-sensitive — must be `scrape-standings.yml` not `Scrape-Standings.yml`

**Musher shows `—` with 0 points**
- The name in `DEFAULT_CONFIG` doesn't exactly match what iditarod.com uses
- Go to the Race Standings tab on the live site, find the musher, and copy their name exactly into `index.html`

**GitHub Pages site not loading**
- Go to Settings → Pages and confirm Source is set to **GitHub Actions**
- Go to Actions tab and check the **Deploy to GitHub Pages** workflow ran successfully

---

## 💰 Cost

**$0.00 forever.** GitHub Pages and GitHub Actions are both completely free for public repositories.

---

## 📅 Yearly Maintenance Checklist

Each year before the race starts:

- [ ] Update musher picks in `index.html` → `DEFAULT_CONFIG`
- [ ] Update year from `2026` to new year in `index.html` (2 places)
- [ ] Update year in `scrape-standings.js` (1 place)
- [ ] Push changes to GitHub
- [ ] Run scraper manually from Actions tab to confirm it works with the new year's URL
- [ ] Share the link with the family!
