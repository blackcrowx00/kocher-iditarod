let map

function initMap(){

map = L.map("map").setView([63.5,-158],5)

L.tileLayer(
"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
{ attribution:"© OpenStreetMap"}
).addTo(map)

checkpoints.forEach(cp=>{

L.marker([cp.lat,cp.lon])
.addTo(map)
.bindPopup(cp.name)

})

}

initMap()
