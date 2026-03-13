const standingsURL =
"https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/";

async function getStandings(){

const response = await fetch(standingsURL)
const html = await response.text()

const parser = new DOMParser()
const doc = parser.parseFromString(html,"text/html")

const rows = doc.querySelectorAll("table tbody tr")

let standings = []

rows.forEach((row,index)=>{

const nameCell = row.querySelector("td:nth-child(2)")

if(nameCell){

standings.push({
name:nameCell.innerText.trim(),
position:index+1
})

}

})

return standings
}

async function load(){

const standings = await getStandings()

const picks = await fetch("picks.json")
.then(r=>r.json())

createStandingsTable(standings)
createLeaderboard(standings,picks)

}

function createStandingsTable(standings){

const table = document.querySelector("#standings tbody")

standings.forEach(musher=>{

const row = document.createElement("tr")

row.innerHTML = `
<td>${musher.position}</td>
<td>${musher.name}</td>
`

table.appendChild(row)

})

}

function createLeaderboard(standings,picks){

let leaderboard=[]

for(const person in picks){

let total=0

picks[person].forEach(musher=>{

const found = standings.find(s=>s.name.includes(musher))

if(found) total+=found.position
else total+=50

})

leaderboard.push({
name:person,
score:total,
mushers:picks[person].join(", ")
})

}

leaderboard.sort((a,b)=>a.score-b.score)

const table = document.querySelector("#leaderboard tbody")

leaderboard.forEach(player=>{

const row=document.createElement("tr")

row.innerHTML=`
<td>${player.name}</td>
<td>${player.mushers}</td>
<td>${player.score}</td>
`

table.appendChild(row)

})

}

load()