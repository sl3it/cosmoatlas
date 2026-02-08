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
      sample.forEach(p=>{
        const el = document.createElement('a');
        el.className = 'preview-card';
        el.href = `planet.html?id=${p.id}`;
        const fallback = `https://placehold.co/200x200/${p.color.replace('#','')}/ffffff?text=${encodeURIComponent(p.name)}`;
        el.innerHTML = `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;height:88px;width:88px">
            <div class=\"bubble\" style=\"background:${p.color}\"></div>
            <img class=\"planet-thumb small\" src=\"assets/images/${p.id}.jpg\" alt=\"${p.name}\" data-fallback=\"${fallback}\" onerror=\"this.onerror=null;this.src=this.dataset.fallback\">
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
});


