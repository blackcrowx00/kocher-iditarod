const standingsURL =
  "https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/";

const checkpointNames = [
  "White Mountain",
  "Finger Lake",
  "Rainy Pass",
  "Unalakleet",
  "Shaktoolik",
  "Skwentna",
  "Anchorage",
  "McGrath",
  "Takotna",
  "Nikolai",
  "Golovin",
  "Safety",
  "Willow",
  "Yentna",
  "Cripple",
  "Galena",
  "Nulato",
  "Kaltag",
  "Koyuk",
  "Elim",
  "Ophir",
  "Rohn",
  "Ruby",
  "Nome"
];

const checkpointPattern = checkpointNames
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

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

function cleanText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/•/g, " ")
    .replace(/\(r\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDogs(remainder) {
  const dateDogPairs = [
    ...remainder.matchAll(/(\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\d+)/g)
  ];

  if (dateDogPairs.length > 0) {
    return Number(dateDogPairs[dateDogPairs.length - 1][2]);
  }

  return "";
}

function parseRacingSectionText(sectionText) {
  const standings = [];
  const seenBibs = new Set();

  const lines = sectionText
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);

  const rowRegex = new RegExp(
    `^(\\d+)\\s+(.+?)\\s+(\\d+)\\s+(${checkpointPattern})\\s+(.+)$`
  );

  for (const rawLine of lines) {
    const line = rawLine.replace(/,/g, " ");
    const match = line.match(rowRegex);

    if (!match) continue;

    const position = Number(match[1]);
    const name = cleanText(match[2]);
    const bib = Number(match[3]);
    const checkpoint = match[4];
    const remainder = match[5];
    const dogs = extractDogs(remainder);

    if (!Number.isFinite(position) || !Number.isFinite(bib) || !name) {
      continue;
    }

    if (seenBibs.has(bib)) continue;
    seenBibs.add(bib);

    standings.push({
      name,
      bib,
      position,
      checkpoint,
      dogs
    });
  }

  standings.sort((a, b) => a.position - b.position);
  return standings;
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

  const racingMatch = pageText.match(
    /##\s*Racing([\s\S]*?)##\s*(Out of Race|Expedition)/
  );

  if (!racingMatch) {
    throw new Error("Could not isolate Racing section.");
  }

  const racingSection = racingMatch[1];
  const standings = parseRacingSectionText(racingSection);

  if (standings.length === 0) {
    throw new Error("Parsed zero standings rows.");
  }

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

  const bibToPosition = new Map(
    standings.map((musher) => [Number(musher.bib), Number(musher.position)])
  );

  const leaderboard = Object.entries(picks).map(([person, bibs]) => {
    let points = 0;

    bibs.forEach((bib) => {
      const numericBib = Number(bib);
      const position = bibToPosition.get(numericBib);
      points += Number.isFinite(position) ? position : 50;
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
    console.log(
      "Bib to position:",
      Object.fromEntries(standings.map((m) => [m.bib, m.position]))
    );
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
