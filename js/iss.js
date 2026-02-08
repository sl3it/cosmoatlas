let map, marker, trail;
const issPositions = [];
const MAX_TRAIL = 80;

function initMap(){
  const el = document.getElementById('map');
  if(!el) return false;
  map = L.map('map').setView([0,0],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);

  const issHtml = `<div class="iss-icon">🛰️</div>`;
  const issIcon = L.divIcon({html:issHtml,className:'iss-icon-wrap',iconSize:[36,36],iconAnchor:[18,18]});
  marker = L.marker([0,0],{icon:issIcon}).addTo(map);
  trail = L.polyline([], {color: '#7dd3fc', weight: 2, opacity: 0.9}).addTo(map);
  return true;
}

async function updateISS(){
  if(!map || !marker) return;
  try{
    const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    if(!r.ok) throw new Error('status ' + r.status);
    const j = await r.json();
    const lat = Number(j.latitude), lon = Number(j.longitude);
    const alt = j.altitude ? `${j.altitude.toFixed(1)} km` : '—';
    const vel = j.velocity ? `${j.velocity.toFixed(1)} km/h` : '—';
    const ts = j.timestamp ? new Date(j.timestamp * 1000) : new Date();

    marker.setLatLng([lat,lon]);
    issPositions.push([lat,lon]);
    if(issPositions.length > MAX_TRAIL) issPositions.shift();
    trail.setLatLngs(issPositions);

    const popupHtml = `МКС<br><b>${lat.toFixed(2)}, ${lon.toFixed(2)}</b><br>Высота: ${alt}<br>Скорость: ${vel}<br><small>Обновлено: ${ts.toUTCString()}</small>`;
    marker.bindPopup(popupHtml);
    // smoothly pan map to marker unless user has zoomed/panned recently
    map.panTo([lat,lon],{animate:true,duration:0.8});
  }catch(e){
    console.error('ISS fetch failed',e);
  }
}

window.addEventListener('DOMContentLoaded',()=>{
  const ok = initMap();
  if(!ok) return;
  updateISS();
  setInterval(updateISS,5000);
});
