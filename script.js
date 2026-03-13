const standingsURL = "https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/";

// Fetch the live standings table
async function fetchStandings() {
    const response = await fetch(standingsURL);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const rows = doc.querySelectorAll("table tbody tr");
    let standings = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if(cells.length >= 8){
            const position = parseInt(cells[0].innerText.trim());
            const bib = parseInt(cells[1].innerText.trim());
            const name = cells[2].innerText.trim();
            const checkpoint = cells[3].innerText.trim();
            const dogs = parseInt(cells[7].innerText.trim());

            standings.push({ position, bib, name, checkpoint, dogs });
        }
    });

    return standings;
}

// Update the Race Standings Table
function updateStandingsTable(standings) {
    const table = document.querySelector("#standings tbody");
    table.innerHTML = "";

    standings.forEach(s => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${s.name}</td>
            <td>${s.bib}</td>
            <td>${s.position}</td>
            <td>${s.checkpoint}</td>
            <td>${s.dogs}</td>
        `;
        table.appendChild(row);
    });
}

// Update the Family Leaderboard
function updateLeaderboard(standings, picks) {
    const table = document.querySelector("#leaderboard tbody");
    table.innerHTML = "";

    for (const person in picks) {
        const bibs = picks[person];
        let points = 0;
        let totalDogs = 0;

        bibs.forEach(bib => {
            const musher = standings.find(s => s.bib === bib);
            if (musher) {
                points += musher.position;
                totalDogs += musher.dogs;
            } else {
                // if not found, add default high points
                points += 50;
            }
        });

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${person}</td>
            <td>${bibs.join(", ")}</td>
            <td>${points}</td>
            <td>${totalDogs}</td>
        `;
        table.appendChild(row);
    }
}

// Main load function
async function load() {
    document.getElementById("lastUpdated").innerText =
        "Last Updated: " + new Date().toLocaleTimeString();

    try {
        const standings = await fetchStandings();
        const picks = await fetch("picks.json").then(r => r.json());

        updateStandingsTable(standings);
        updateLeaderboard(standings, picks);

    } catch (error) {
        console.error("Error loading race data:", error);
    }
}

// Initial load
load();

// Auto-refresh every 5 minutes
setInterval(load, 300000);
