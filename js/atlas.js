let _planets = [];
function renderAtlas(list){
  const container = document.getElementById('atlas');
  container.innerHTML = '';
  list.forEach(p=>{
    const card = document.createElement('a');
    card.className = 'planet-card';
    card.href = `planet.html?id=${p.id}`;
    // fallback image URL (generated placeholder matching planet color)
    const fallback = `https://placehold.co/400x400/${p.color.replace('#','')}/ffffff?text=${encodeURIComponent(p.name)}`;
    card.innerHTML = `
      <div style="height:110px;display:flex;align-items:center;justify-content:center;position:relative">
        <div class=\"planet-bubble\" style=\"background:${p.color}\"></div>
        <img class=\"planet-thumb\" src=\"assets/images/${p.id}.jpg\" alt=\"${p.name}\" data-fallback=\"${fallback}\" onerror=\"this.onerror=null;this.src=this.dataset.fallback\">
      </div>
      <div class=\"planet-name\">${p.name}</div>
      <div class=\"planet-meta\">${p.type} • ${p.distance} млн км</div>`;
    container.appendChild(card);
  });
}

function applyFilters(){
  const type = document.getElementById('filter-type').value;
  const sort = document.getElementById('sort-by').value;
  const q = document.getElementById('search').value.trim().toLowerCase();
  let out = _planets.slice();
  if(type && type!=='all') out = out.filter(p=>p.type===type);
  if(q) out = out.filter(p=>p.name.toLowerCase().includes(q));
  if(sort==='distance-asc') out.sort((a,b)=>a.distance-b.distance);
  else if(sort==='distance-desc') out.sort((a,b)=>b.distance-a.distance);
  else if(sort==='name-asc') out.sort((a,b)=>a.name.localeCompare(b.name));
  renderAtlas(out);
}

async function loadAtlas(){
  try{
    let res, json;
    try{
      res = await fetch('data/planets.json');
      if(!res.ok) throw new Error('status '+res.status);
      json = await res.json();
    }catch(fetchErr){
      // fallback to inline data if available (useful for file:// preview)
      if(window._PLANET_DATA && Array.isArray(window._PLANET_DATA.data)){
        json = window._PLANET_DATA.data;
      } else throw fetchErr;
    }
    _planets = Array.isArray(json) ? json : json.data || [];
    // initial sort by distance asc
    _planets.sort((a,b)=>a.distance-b.distance);
    renderAtlas(_planets);

    // wire up controls
    const type = document.getElementById('filter-type');
    const sort = document.getElementById('sort-by');
    const search = document.getElementById('search');
    [type, sort].forEach(el=>el.addEventListener('change', applyFilters));
    search.addEventListener('input', ()=>{ clearTimeout(search._t); search._t = setTimeout(applyFilters,220)});
  }catch(err){
    console.error(err);
    const container = document.getElementById('atlas');
    if(container) container.innerHTML = '<div style="padding:28px;text-align:center;color:var(--muted)">Ошибка загрузки данных — если вы открыли файл локально, запустите простой HTTP сервер (например, `python -m http.server`) и откройте сайт по http://localhost:8000</div>';
  }
}

loadAtlas();
