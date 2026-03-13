const standingsURL =
"https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/"

// -----------------------------
// Fetch race standings
// -----------------------------
async function fetchStandings(){

const response = await fetch(standingsURL)
const html = await response.text()

const parser = new DOMParser()
const doc = parser.parseFromString(html,"text/html")

const rows = doc.querySelectorAll("table tbody tr")

let standings=[]

rows.forEach(row=>{

const cells=row.querySelectorAll("td")

if(cells.length>=8){

const position=parseInt(cells[0].innerText.trim())
const bib=cells[1].innerText.trim()
const name=cells[2].innerText.trim()
const checkpoint=cells[3].innerText.trim()
const dogs=cells[7].innerText.trim()

standings.push({
position,
bib,
name,
checkpoint,
dogs
})

}

})

return standings

}

// -----------------------------
// Update race standings table
// -----------------------------
function updateStandings(standings){

const table=document.querySelector("#standings tbody")
table.innerHTML=""

standings.forEach(s=>{

const row=document.createElement("tr")

row.innerHTML=`
<td>${s.position}</td>
<td>${s.bib}</td>
<td>${s.name}</td>
<td>${s.checkpoint}</td>
<td>${s.dogs}</td>
`

table.appendChild(row)

})

}

// -----------------------------
// Update family leaderboard
// -----------------------------
function updateLeaderboard(standings,picks){

let board=[]

for(const player in picks){

let score=0
let mushers=picks[player].mushers

mushers.forEach(musher=>{

const found=standings.find(s=>
s.name.toLowerCase()===musher.toLowerCase()
)

score+=found ? found.position : 50

})

board.push({
player,
mushers:mushers.join(", "),
score,
color:picks[player].color
})

}

board.sort((a,b)=>a.score-b.score)

const table=document.querySelector("#leaderboard tbody")
table.innerHTML=""

board.forEach(p=>{

const row=document.createElement("tr")

row.innerHTML=`
<td style="color:${p.color};font-weight:bold">${p.player}</td>
<td>${p.mushers}</td>
<td>${p.score}</td>
`

table.appendChild(row)

})

}

// -----------------------------
// Load everything
// -----------------------------
async function load(){

document.getElementById("lastUpdated").innerText =
"Updated: " + new Date().toLocaleTimeString()

try{

const standings=await fetchStandings()

const picks=await fetch("picks.json")
.then(r=>r.json())

updateStandings(standings)

updateLeaderboard(standings,picks)

// update map markers if map.js exists
if(typeof updateMusherMarkers==="function"){
updateMusherMarkers(standings,picks)
}

}catch(error){

console.error("Error loading race data:",error)

}

}

// -----------------------------
// Initial load
// -----------------------------
load()

// -----------------------------
// Auto refresh every 5 minutes
// -----------------------------
setInterval(load,300000)
