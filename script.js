const standingsURL =
"https://api.allorigins.win/raw?url=https://iditarod.com/race/2026/standings/"

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
const bib=parseInt(cells[1].innerText.trim())
const name=cells[2].innerText.trim()
const checkpoint=cells[3].innerText.trim()
const dogs=parseInt(cells[7].innerText.trim())

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

function updateStandings(standings){

const table=document.querySelector("#standings tbody")
table.innerHTML=""

standings.forEach(s=>{

const row=document.createElement("tr")

row.innerHTML=`
<td>${s.name}</td>
<td>${s.bib}</td>
<td>${s.position}</td>
<td>${s.checkpoint}</td>
<td>${s.dogs}</td>
`

table.appendChild(row)

})

}

function updateLeaderboard(standings,picks){

let leaderboard=[]

for(const person in picks){

let mushers=picks[person]

let points=0
let dogs=0

mushers.forEach(bib=>{

const found=standings.find(s=>s.bib===bib)

if(found){

points+=found.position
dogs+=found.dogs

}else{

points+=50

}

})

leaderboard.push({

person,
mushers:mushers.join(", "),
points,
dogs

})

}

leaderboard.sort((a,b)=>a.points-b.points)

const table=document.querySelector("#leaderboard tbody")
table.innerHTML=""

leaderboard.forEach(p=>{

const row=document.createElement("tr")

row.innerHTML=`
<td>${p.person}</td>
<td>${p.mushers}</td>
<td>${p.points}</td>
<td>${p.dogs}</td>
`

table.appendChild(row)

})

}

async function load(){

document.getElementById("lastUpdated").innerText =
"Last Updated: " + new Date().toLocaleTimeString()

const standings=await fetchStandings()

const picks=await fetch("picks.json").then(r=>r.json())

updateStandings(standings)

updateLeaderboard(standings,picks)

}

load()

setInterval(load,300000)