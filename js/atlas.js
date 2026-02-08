let _planets = [];

// High-quality photos from Wikimedia (same as previously used for 3D textures)
const REMOTE_PLANET_PHOTOS = {
  earth: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Earth_Eastern_Hemisphere.jpg',
  mars: 'https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg',
  jupiter: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg',
  saturn: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg',
  mercury: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Mercury_in_true_color.jpg',
  venus: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg',
  uranus: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg',
  neptune: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Neptune_Full.jpg'
};

// Fallback thumbnails to serve if the main photo is too heavy or fails
const REMOTE_PLANET_THUMBS = {
  mercury: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercury_in_true_color.jpg/800px-Mercury_in_true_color.jpg',
  venus: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/400px-Venus-real_color.jpg',
  earth: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Earth_Eastern_Hemisphere.jpg/400px-Earth_Eastern_Hemisphere.jpg',
  mars: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/400px-OSIRIS_Mars_true_color.jpg',
  jupiter: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Jupiter.jpg/400px-Jupiter.jpg',
  saturn: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/400px-Saturn_during_Equinox.jpg',
  uranus: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/400px-Uranus2.jpg',
  neptune: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/400px-Neptune_Full.jpg'
};

function renderAtlas(list) {
  const container = document.getElementById('atlas');
  container.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('a');
    card.className = 'planet-card';
    card.href = `planet.html?id=${p.id}`;

    // Choose image: prefer thumb first, fallback to placeholder
    const fallback = `https://placehold.co/400x400/${p.color.replace('#', '')}/ffffff?text=${encodeURIComponent(p.name)}`;
    // If available, use thumb, and plan to switch to high-res on load? Or just thumb is fine for grid.
    const thumb = REMOTE_PLANET_THUMBS[p.id] || REMOTE_PLANET_PHOTOS[p.id] || fallback;
    const full = REMOTE_PLANET_PHOTOS[p.id] || thumb;

    card.innerHTML = `
      <div style="height:140px;display:flex;align-items:center;justify-content:center;position:relative">
         <div class="planet-bubble" style="background:${p.color};width:100px;height:100px;position:absolute;opacity:0.6;filter:blur(24px)"></div>
         <img class="planet-thumb" src="${thumb}" alt="${p.name}" 
              style="width:120px;height:120px;object-fit:cover;border-radius:50%;position:relative;z-index:2;box-shadow:0 8px 30px rgba(0,0,0,0.5)"
              loading="lazy" decoding="async" 
              data-full="${full}"
              onerror="this.onerror=null;this.src='${fallback}'">
      </div>
      <div class="planet-name" style="margin-top:12px">${p.name}</div>
      <div class="planet-meta">${p.type} • ${p.distance} млн км</div>`;
    container.appendChild(card);
  });
}

function applyFilters() {
  const type = document.getElementById('filter-type').value;
  const sort = document.getElementById('sort-by').value;
  const q = document.getElementById('search').value.trim().toLowerCase();
  let out = _planets.slice();
  if (type && type !== 'all') out = out.filter(p => p.type === type);
  if (q) out = out.filter(p => p.name.toLowerCase().includes(q));
  if (sort === 'distance-asc') out.sort((a, b) => a.distance - b.distance);
  else if (sort === 'distance-desc') out.sort((a, b) => b.distance - a.distance);
  else if (sort === 'name-asc') out.sort((a, b) => a.name.localeCompare(b.name));
  renderAtlas(out);
}

async function loadAtlas() {
  try {
    let res, json;
    try {
      res = await fetch('data/planets.json');
      if (!res.ok) throw new Error('status ' + res.status);
      json = await res.json();
    } catch (fetchErr) {
      if (window._PLANET_DATA && Array.isArray(window._PLANET_DATA.data)) {
        json = window._PLANET_DATA.data;
      } else throw fetchErr;
    }
    _planets = Array.isArray(json) ? json : json.data || [];
    _planets.sort((a, b) => a.distance - b.distance);
    renderAtlas(_planets);

    const type = document.getElementById('filter-type');
    const sort = document.getElementById('sort-by');
    const search = document.getElementById('search');
    [type, sort].forEach(el => el.addEventListener('change', applyFilters));
    search.addEventListener('input', () => { clearTimeout(search._t); search._t = setTimeout(applyFilters, 220) });
  } catch (err) {
    console.error(err);
    const container = document.getElementById('atlas');
    if (container) container.innerHTML = '<div style="padding:28px;text-align:center;color:var(--muted)">Ошибка загрузки данных.</div>';
  }
}

loadAtlas();
