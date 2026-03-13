const standingsURL =
  "https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/";

const checkpoints = [
  "Anchorage",
  "Willow",
  "Yentna",
  "Skwentna",
  "Finger Lake",
  "Rainy Pass",
  "Rohn",
  "Nikolai",
  "McGrath",
  "Takotna",
  "Ophir",
  "Cripple",
  "Ruby",
  "Galena",
  "Nulato",
  "Kaltag",
  "Unalakleet",
  "Shaktoolik",
  "Koyuk",
  "Elim",
  "Golovin",
  "White Mountain",
  "Safety",
  "Nome"
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[char];
  });
}

function cleanLine(line) {
  return line
    .replace(/•/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStandingsLine(line) {
  const cleaned = cleanLine(line);
  if (!/^\d+\s/.test(cleaned)) return null;

  const tokens = cleaned.split(" ");
  const position = parseInt(tokens[0], 10);
  if (Number.isNaN(position)) return null;

  let bibIndex = -1;
  for (let i = 1; i < tokens.length; i += 1) {
    if (/^\d+$/.test(tokens[i])) {
      bibIndex = i;
      break;
    }
  }

  if (bibIndex === -1) return null;

  const name = tokens.slice(1, bibIndex).join(" ").trim();
  const bib = parseInt(tokens[bibIndex], 10);
  if (!name || Number.isNaN(bib)) return null;

  let checkpoint = "";
  let afterCheckpoint = "";

  for (const cp of [...checkpoints].sort((a, b) => b.length - a.length)) {
    const pattern = new RegExp(
      `^\\d+\\s+.+?\\s+${bib}\\s+${cp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.+)$`
    );
    const match = cleaned.match(pattern);
    if (match) {
      checkpoint = cp;
      afterCheckpoint = match[1];
      break;
    }
  }

  if (!checkpoint) return null;

  // Grab date/time + dogs pairs after the checkpoint.
  // If there are two dog counts (in + out), use the last one as the current dogs.
  const dogMatches = [...afterCheckpoint.matchAll(/(\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\d+)/g)];
  let dogs = null;

  if (dogMatches.length > 0) {
    dogs = parseInt(dogMatches[dogMatches.length - 1][2], 10);
  } else {
    const fallback = afterCheckpoint.match(/\b(\d{1,2})\b/);
    if (fallback) {
      dogs = parseInt(fallback[1], 10);
    }
  }

  return {
    name,
    bib,
    position,
    checkpoint,
    dogs: Number.isNaN(dogs) ? null : dogs
  };
}

async function fetchStandings() {
  const response = await fetch(standingsURL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Standings fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const text = doc.body ? doc.body.innerText : "";

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const racingIndex = lines.findIndex((line) => line.trim() === "Racing");
  if (racingIndex === -1) {
    throw new Error("Could not find Racing section on standings page.");
  }

  const standings = [];
  const seenBibs = new Set();

  for (let i = racingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];

    if (line === "Expedition" || line === "Close" || line.startsWith("Next Race:")) {
      break;
    }

    const parsed = parseStandingsLine(line);
    if (!parsed) continue;

    if (!seenBibs.has(parsed.bib)) {
      standings.push(parsed);
      seenBibs.add(parsed.bib);
    }
  }

  standings.sort((a, b) => a.position - b.position);
  return standings;
}

function updateStandingsTable(standings) {
  const table = document.querySelector("#standings tbody");
  table.innerHTML = "";

  standings.forEach((musher) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(musher.name)}</td>
      <td>${musher.bib}</td>
      <td>${musher.position}</td>
      <td>${escapeHtml(musher.checkpoint)}</td>
      <td>${musher.dogs ?? ""}</td>
    `;
    table.appendChild(row);
  });
}

function updateLeaderboard(standings, picks) {
  const table = document.querySelector("#leaderboard tbody");
  table.innerHTML = "";

  const leaderboard = Object.entries(picks).map(([person, bibs]) => {
    let points = 0;
    let totalDogs = 0;

    bibs.forEach((bib) => {
      const musher = standings.find((s) => s.bib === Number(bib));
      if (musher) {
        points += musher.position;
        totalDogs += musher.dogs ?? 0;
      } else {
        points += 50;
      }
    });

    return {
      person,
      bibs,
      points,
      totalDogs
    };
  });

  leaderboard.sort((a, b) => a.points - b.points || b.totalDogs - a.totalDogs);

  leaderboard.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(entry.person)}</td>
      <td>${entry.bibs.join(", ")}</td>
      <td>${entry.points}</td>
      <td>${entry.totalDogs}</td>
    `;
    table.appendChild(row);
  });
}

async function load() {
  document.getElementById("lastUpdated").innerText =
    "Last Updated: " + new Date().toLocaleTimeString();

  try {
    const [standings, picks] = await Promise.all([
      fetchStandings(),
      fetch("picks.json", { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error(`picks.json fetch failed: ${r.status}`);
        return r.json();
      })
    ]);

    updateStandingsTable(standings);
    updateLeaderboard(standings, picks);
  } catch (error) {
    console.error("Error loading race data:", error);

    const leaderboard = document.querySelector("#leaderboard tbody");
    const standings = document.querySelector("#standings tbody");

    leaderboard.innerHTML = `
      <tr>
        <td colspan="4">Could not load leaderboard data. Check browser console.</td>
      </tr>
    `;

    standings.innerHTML = `
      <tr>
        <td colspan="5">Could not load race standings. Check browser console.</td>
      </tr>
    `;
  }
}

load();
setInterval(load, 300000);
