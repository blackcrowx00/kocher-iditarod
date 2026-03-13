const standingsURL =
  "https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/";

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

function parseStandingsLine(line) {
  const cleaned = normalizeWhitespace(line);

  // Example:
  // 4 Ryan Redington 5 Cripple 3/12 19:08:00 16 3/12 19:30:00 16 ...
  const match = cleaned.match(/^(\d+)\s+(.+?)\s+(\d+)\s+([A-Za-z][A-Za-z\s]+?)\s+(\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\d+)/);

  if (!match) return null;

  const position = Number(match[1]);
  const name = match[2].trim();
  const bib = Number(match[3]);
  const checkpoint = match[4].trim();
  const dogs = Number(match[6]);

  if (!Number.isFinite(position) || !Number.isFinite(bib)) {
    return null;
  }

  return { position, name, bib, checkpoint, dogs };
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

  // Skip the 3 header lines after "Racing"
  for (let i = racingIndex + 4; i < lines.length; i += 1) {
    const line = lines[i];

    // Stop once standings rows end
    if (!/^\d+\s/.test(line)) {
      if (standings.length > 0) break;
      continue;
    }

    const parsed = parseStandingsLine(line);
    if (!parsed) continue;

    if (!seenBibs.has(parsed.bib)) {
      seenBibs.add(parsed.bib);
      standings.push(parsed);
    }
  }

  standings.sort((a, b) => a.position - b.position);

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

  const bibToPosition = new Map();
  standings.forEach((musher) => {
    bibToPosition.set(Number(musher.bib), Number(musher.position));
  });

  const leaderboard = Object.entries(picks).map(([person, bibs]) => {
    let points = 0;

    bibs.forEach((bib) => {
      const position = bibToPosition.get(Number(bib));
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

    updateStandingsTable(standings);
    updateLeaderboa:contentReference[oaicite:2]{index=2}
