const standingsURL =
"https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/";

async function fetchStandings() {

  const response = await fetch(standingsURL);
  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const rows = doc.querySelectorAll("table tr");

  let standings = [];

  rows.forEach(row => {

    const cells = row.querySelectorAll("td");

    if (cells.length > 5) {

      const position = cells[0].innerText.trim();
      const name = cells[1].innerText.trim();
      const checkpoint = cells[3].innerText.trim();

      // dogs value usually appears in a cell containing a number
      let dogs = "";

      cells.forEach(c => {
        if (!dogs && /^\d+$/.test(c.innerText.trim())) {
          dogs = c.innerText.trim();
        }
      });

      if (!isNaN(position)) {

        standings.push({
          position: Number(position),
          name: name,
          checkpoint: checkpoint,
          dogs: dogs
        });

      }

    }

  });

  console.log("Standings loaded:", standings);

  return standings;

}

async function load() {

  document.getElementById("lastUpdated").innerText =
    "Updated: " + new Date().toLocaleTimeString();

  const standings = await fetchStandings();

  if (!standings.length) {
    console.error("No standings found");
    return;
  }

  const picks = await fetch("picks.json").then(r => r.json());

  updateStandings(standings);
  updateLeaderboard(standings, picks);

}

function updateStandings(standings) {

  const table = document.querySelector("#standings tbody");
  table.innerHTML = "";

  standings.forEach(s => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${s.position}</td>
      <td>${s.name}</td>
      <td>${s.checkpoint}</td>
      <td>${s.dogs}</td>
    `;

    table.appendChild(row);

  });

}

function updateLeaderboard(standings, picks) {

  let board = [];

  for (const player in picks) {

    let score = 0;

    picks[player].forEach(musher => {

      const found = standings.find(s =>
        s.name.toLowerCase().includes(musher.toLowerCase())
      );

      score += found ? found.position : 50;

    });

    board.push({
      player,
      mushers: picks[player].join(", "),
      score
    });

  }

  board.sort((a, b) => a.score - b.score);

  const table = document.querySelector("#leaderboard tbody");
  table.innerHTML = "";

  board.forEach(p => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${p.player}</td>
      <td>${p.mushers}</td>
      <td>${p.score}</td>
    `;

    table.appendChild(row);

  });

}

load();
setInterval(load, 300000);
