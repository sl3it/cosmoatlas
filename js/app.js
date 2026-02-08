document.addEventListener('DOMContentLoaded',()=>{
  AOS?.init();

  // Video background is used instead of particles.js

  // Parallax effect on mouse move
  const hero = document.querySelector('.hero');
  const heroInner = document.querySelector('.hero-inner');
  const apod = document.querySelector('.apod');
  if(hero && heroInner && apod){
    hero.addEventListener('mousemove', (ev)=>{
      const r = hero.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5; // -0.5..0.5
      const y = (ev.clientY - r.top) / r.height - 0.5;
      const tx = x * 12; const ty = y * 8;
      heroInner.style.transform = `translate3d(${ -tx }px, ${ -ty }px, 0) scale(1.01)`;
      apod.style.transform = `translate3d(${ tx/1.6 }px, ${ ty/1.4 }px, 0)`;
    });
    hero.addEventListener('mouseleave', ()=>{
      heroInner.style.transform = '';
      apod.style.transform = '';
    });
  }

  // Fetch NASA APOD (demo key allowed)
  const apodInner = document.getElementById('apod-inner');
  if(apodInner){
    const nasaUrl = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
    const showFallback = (msg)=>{
      apodInner.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
          <svg width="240" height="140" viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="140" rx="8" fill="#071024"/><g fill="#3aa0ff" opacity="0.12"><circle cx="40" cy="40" r="28"/><circle cx="120" cy="60" r="18"/><circle cx="190" cy="28" r="12"/></g><text x="50%" y="78%" text-anchor="middle" fill="#cbd5e1" font-size="12">APOD недоступен</text></svg>
          <div style="color:var(--muted);font-size:13px;text-align:center">${msg}<br><a href="https://apod.nasa.gov" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">Открыть APOD на сайте NASA</a></div>
        </div>`;
    };

    async function tryFetch(){
      try{
        const r = await fetch(nasaUrl);
        if(!r.ok) throw new Error('status '+r.status);
        const data = await r.json();
        if(data.url && data.media_type!=='video'){
          apodInner.innerHTML = `<img alt="${data.title}" src="${data.url}"><p style=\"color:var(--muted);font-size:13px;margin-top:8px\">${data.title}</p>`;
          return;
        } else if(data.media_type==='video'){
          apodInner.innerHTML = `<a href="${data.url}" target=_blank rel=noopener>Открыть видео APOD</a>`;
          return;
        }
        throw new Error('no media');
      }catch(e){
        // Try proxy to avoid CORS/file:// restrictions
        try{
          const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(nasaUrl);
          const pr = await fetch(proxy);
          if(!pr.ok) throw new Error('proxy status '+pr.status);
          const pdata = await pr.json();
          if(pdata.url && pdata.media_type!=='video'){
            apodInner.innerHTML = `<img alt="${pdata.title}" src="${pdata.url}"><p style=\"color:var(--muted);font-size:13px;margin-top:8px\">${pdata.title}</p>`;
            return;
          } else if(pdata.media_type==='video'){
            apodInner.innerHTML = `<a href="${pdata.url}" target=_blank rel=noopener>Открыть видео APOD</a>`;
            return;
          }
          throw new Error('proxy no media');
        }catch(err){
          console.warn('APOD fetch failed, falling back',e,err);
          showFallback('Не удалось загрузить APOD — возможно проблема с сетью или CORS.');
        }
      }
    }
    tryFetch();
  }
  // Home preview: show first few planets from data
  async function loadHomePreview(){
    const grid = document.getElementById('preview-grid');
    if(!grid) return;
    try{
      let arr;
      try{
        const res = await fetch('data/planets.json');
        arr = await res.json();
      }catch(_){
        if(window._PLANET_DATA && Array.isArray(window._PLANET_DATA.data)) arr = window._PLANET_DATA.data;
        else throw _;
      }
      const sample = arr.slice(0,6);
      grid.innerHTML = '';
      const REMOTE_PLANET_IMAGES = {
        mercury: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Mercury_in_true_color.jpg',
        venus: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg',
        earth: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Earth_Eastern_Hemisphere.jpg',
        mars: 'https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg',
        jupiter: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg',
        saturn: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg',
        uranus: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg',
        neptune: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Neptune_Full.jpg'
      };
      // smaller thumb variants to reduce bandwidth on previews
      const REMOTE_PLANET_THUMBS = {
        // try a slightly larger thumb first (800px) then 400px as fallback
        mercury: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercury_in_true_color.jpg/800px-Mercury_in_true_color.jpg',
        venus: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/400px-Venus-real_color.jpg',
        earth: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Earth_Eastern_Hemisphere.jpg/400px-Earth_Eastern_Hemisphere.jpg',
        mars: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/400px-OSIRIS_Mars_true_color.jpg',
        jupiter: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Jupiter.jpg/400px-Jupiter.jpg',
        saturn: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/400px-Saturn_during_Equinox.jpg',
        uranus: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/400px-Uranus2.jpg',
        neptune: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/400px-Neptune_Full.jpg'
      };

      sample.forEach(p=>{
        const el = document.createElement('a');
        el.className = 'preview-card';
        el.href = `planet.html?id=${p.id}`;
        const fallback = `https://placehold.co/200x200/${p.color.replace('#','')}/ffffff?text=${encodeURIComponent(p.name)}`;
        const thumb = REMOTE_PLANET_THUMBS[p.id] || REMOTE_PLANET_IMAGES[p.id] || fallback;
        el.innerHTML = `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;height:88px;width:88px">
            <div class=\"bubble\" style=\"background:${p.color}\"></div>
            <img class=\"planet-thumb small\" src=\"${thumb}\" alt=\"${p.name}\" loading=\"lazy\" decoding=\"async\" data-fallback=\"${fallback}\" onerror=\"this.onerror=null;this.src=this.dataset.fallback\">
          </div>
          <div class=\"pname\">${p.name}</div>
          <div class=\"pmeta\">${p.type} • ${p.distance} млн км</div>`;
        grid.appendChild(el);
      });
    }catch(e){
      console.error('home preview failed',e);
    }
  }
  loadHomePreview();

  // Planet of the week: choose a planet deterministically by week number
  async function setPlanetOfWeek(){
    const card = document.getElementById('planet-of-week');
    if(!card) return;
    try{
      let arr;
      try{ const r = await fetch('data/planets.json'); arr = await r.json(); }catch(_){ arr = (window._PLANET_DATA && Array.isArray(window._PLANET_DATA.data)) ? window._PLANET_DATA.data : null; }
      if(!Array.isArray(arr) || arr.length===0) return;
      // compute week index: number of weeks since epoch modulo length
      const weeks = Math.floor(Date.now() / (1000*60*60*24*7));
      const idx = weeks % arr.length;
      const p = arr[idx];
      // update UI inside the card
      const pname = card.querySelector('.pname');
      const pmeta = card.querySelector('.pmeta');
      const btn = card.querySelector('.btn');
      if(pname) pname.textContent = p.name;
      if(pmeta) pmeta.textContent = (p.description || `${p.type} — ${p.distance} млн км`);
      if(btn) btn.href = `planet.html?id=${p.id}`;
      // thumbnail: try local asset, then curated remote texture, then placeholder
      const thumb = card.querySelector('.planet-week-img');
      if(thumb){
        const local = `assets/images/${p.id}.jpg`;
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
        const placeholder = `https://placehold.co/400x400/${p.color.replace('#','')}/ffffff?text=${encodeURIComponent(p.name)}`;
        thumb.alt = p.name;
        // Try local first, then thumbnail remote, then full remote, then placeholder
        thumb.src = local;
        thumb.loading = 'lazy';
        thumb.onerror = function handler(){
          this.onerror = null;
          if(REMOTE_PLANET_THUMBS[p.id]){
            this.src = REMOTE_PLANET_THUMBS[p.id];
            this.onerror = function(){ this.onerror = null; this.src = (REMOTE_PLANET_THUMBS[p.id]||placeholder); };
          } else if (typeof REMOTE_PLANET_IMAGES !== 'undefined' && REMOTE_PLANET_IMAGES[p.id]){
            this.src = REMOTE_PLANET_IMAGES[p.id];
            this.onerror = function(){ this.onerror = null; this.src = placeholder; };
          } else {
            this.src = placeholder;
          }
        };
      }
    }catch(e){ console.warn('setPlanetOfWeek failed', e); }
  }
  setPlanetOfWeek();
});


