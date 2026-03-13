const standingsURL =
  "https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/";

const knownCheckpoints = [
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

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

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

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractDogsFromRemainder(remainder) {
  const datedDogMatches = [
    ...remainder.matchAll(/(\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\d+)/g)
  ];

  if (datedDogMatches.length > 0) {
    return Number(datedDogMatches[datedDogMatches.length - 1][2]);
  }

  return "";
}

function parseRacingLine(line) {
  const cleaned = normalizeWhitespace(line);

  if (!/^\d+\s/.test(cleaned)) return null;

  const firstSpace = cleaned.indexOf(" ");
  const position = Number(cleaned.slice(0, firstSpace));
  if (!Number.isFinite(position)) return null;

  const sortedCheckpoints = [...knownCheckpoints].sort((a, b) => b.length - a.length);

  for (const checkpoint of sortedCheckpoints) {
    const checkpointIndex = cleaned.indexOf(` ${checkpoint} `);
    if (checkpointIndex === -1) continue;

    const beforeCheckpoint = cleaned.slice(firstSpace + 1, checkpointIndex).trim();
    const beforeParts = beforeCheckpoint.split(" ");
    const bibText = beforeParts[beforeParts.length - 1];
    const bib = Number(bibText);

    if (!Number.isFinite(bib)) continue;

    const name = beforeParts.slice(0, -1).join(" ").trim();
    if (!name) continue;

    const remainder = cleaned.slice(checkpointIndex + checkpoint.length + 2).trim();
    const dogs = extractDogsFromRemainder(remainder);

    return {
      name,
      bib,
      position,
      checkpoint,
      dogs
    };
  }

  return null;
}

async function fetchStandings() {
  const response = await fetch(standingsURL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Standings fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const pageText = doc.body ? doc.body.innerText : "";

  const lines = pageText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const racingIndex = lines.findIndex((line) => line === "Racing");
  if (racingIndex === -1) {
    throw new Error("Could not find Racing section.");
  }

  const standings = [];
  const seenBibs = new Set();

  for (let i = racingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];

    if (
      line === "Expedition" ||
      line === "Close" ||
      line.startsWith("Next Race:")
    ) {
      break;
    }

    const parsed = parseRacingLine(line);
    if (!parsed) continue;

    if (!seenBibs.has(parsed.bib)) {
      seenBibs.add(parsed.bib);
      standings.push(parsed);
    }
  }

  standings.sort((a, b) => a.position - b.position);
  return standings;
}

function updateStandingsTable(standings) {
  const tbody = document.querySelector("#standings tbody");
  tbody.innerHTML = "";

  standings.forEach((musher) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(musher.name)}</td>
      <td>${musher.bib}</td>
      <td>${musher.position}</td>
      <td>${escapeHtml(musher.checkpoint)}</td>
      <td>${musher.dogs}</td>
    `;
    tbody.appendChild(row);
  });
}

function updateLeaderboard(standings, picks) {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";

  const leaderboard = Object.entries(picks).map(([person, bibs]) => {
    let points = 0;

    bibs.forEach((bib) => {
      const musher = standings.find((entry) => entry.bib === Number(bib));
      points += musher ? musher.position : 50;
    });

    return {
      person,
      bibs,
      points
    };
  });

  leaderboard.sort((a, b) => a.points - b.points);

  leaderboard.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(entry.person)}</td>
      <td>${entry.bibs.join(", ")}</td>
      <td>${entry.points}</td>
    `;
    tbody.appendChild(row);
  });
}

function showError(message) {
  document.querySelector("#leaderboard tbody").innerHTML = `
    <tr class="error-row">
      <td colspan="3">${escapeHtml(message)}</td>
    </tr>
  `;

  document.querySelector("#standings tbody").innerHTML = `
    <tr class="error-row">
      <td colspan="5">${escapeHtml(message)}</td>
    </tr>
  `;
}

async function load() {
  document.getElementById("lastUpdated").innerText =
    `Last Updated: ${formatTime(new Date())}`;

  try {
    const [standings, picks] = await Promise.all([
      fetchStandings(),
      fetch("picks.json", { cache: "no-store" }).then((response) => {
        if (!response.ok) {
          throw new Error(`picks.json fetch failed: ${response.status}`);
        }
        return response.json();
      })
    ]);

    console.log("Parsed standings:", standings);
    console.log("Picks:", picks);

    updateStandingsTable(standings);
    updateLeaderboard(standings, picks);
  } catch (error) {
    console.error(error);
    showError("Could not load race data. Check browser console.");
  }
}

load();
setInterval(load, 300000);
