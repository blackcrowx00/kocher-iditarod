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

function normalizeLine(line) {
  return line
    .replace(/•/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDogs(textAfterCheckpoint) {
  const datedDogMatches = [
    ...textAfterCheckpoint.matchAll(/(\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\d+)/g)
  ];

  if (datedDogMatches.length > 0) {
    return Number(datedDogMatches[datedDogMatches.length - 1][2]);
  }

  const plainNumbers = textAfterCheckpoint.match(/\b\d+\b/g);
  if (!plainNumbers || plainNumbers.length === 0) return "";

  return Number(plainNumbers[0]);
}

function parseStandingsLine(line) {
  const cleaned = normalizeLine(line);

  if (!/^\d+\s/.test(cleaned)) return null;

  const tokens = cleaned.split(" ");
  const position = Number(tokens[0]);
  if (!Number.isFinite(position)) return null;

  let bibIndex = -1;
  for (let i = 1; i < tokens.length; i += 1) {
    if (/^\d+$/.test(tokens[i])) {
      bibIndex = i;
      break;
    }
  }

  if (bibIndex === -1) return null;

  const name = tokens.slice(1, bibIndex).join(" ").trim();
  const bib = Number(tokens[bibIndex]);

  if (!name || !Number.isFinite(bib)) return null;

  let checkpoint = "";
  let remainder = "";

  const sortedCheckpoints = [...knownCheckpoints].sort((a, b) => b.length - a.length);

  for (const cp of sortedCheckpoints) {
    const escaped = cp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `^\\d+\\s+.+?\\s+${bib}\\s+${escaped}\\s+(.+)$`
    );
    const match = cleaned.match(pattern);

    if (match) {
      checkpoint = cp;
      remainder = match[1];
      break;
    }
  }

  if (!checkpoint) return null;

  const dogs = extractDogs(remainder);

  return {
    name,
    bib,
    position,
    checkpoint,
    dogs
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
  const leaderboardBody = document.querySelector("#leaderboard tbody");
  const standingsBody = document.querySelector("#standings tbody");

  leaderboardBody.innerHTML = `
    <tr class="error-row">
      <td colspan="3">${escapeHtml(message)}</td>
    </tr>
  `;

  standingsBody.innerHTML = `
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

    updateStandingsTable(standings);
    updateLeaderboard(standings, picks);
  } catch (error) {
    console.error(error);
    showError("Could not load race data. Check browser console.");
  }
}

load();
setInterval(load, 300000);
