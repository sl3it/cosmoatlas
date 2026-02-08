function qs(name){
  return new URLSearchParams(location.search).get(name);
}

async function initPlanet(){
  try{
    const id = qs('id')||'earth';
    let list;
    try{
      const res = await fetch('data/planets.json');
      if(!res.ok) throw new Error('status '+res.status);
      list = await res.json();
    }catch(e){
      if(window._PLANET_DATA && Array.isArray(window._PLANET_DATA.data)) list = window._PLANET_DATA.data;
      else throw e;
    }
  const p = list.find(x=>x.id===id) || list[2];
    document.getElementById('p-name').textContent = p.name;
    document.getElementById('p-meta').textContent = `${p.type} • ${p.distance} млн км • Радиус ${p.radius} km`;

  // Three.js scene + responsive renderer
    const mount = document.getElementById('viewer');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000814, 0.08);
  const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(mount.clientWidth, mount.clientHeight || 400);
  mount.innerHTML = '';
  mount.appendChild(renderer.domElement);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x080820, 0.6);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 3, 5);
  scene.add(dir);

  // Planet mesh with optional texture
  const geo = new THREE.SphereGeometry(1, 64, 64);
  const loader = new THREE.TextureLoader();
  let material = new THREE.MeshStandardMaterial({color: p.color || '#888', metalness:0.1, roughness:0.8});
  // try load texture from assets/textures/{id}.jpg if present
  const textureUrl = `assets/textures/${p.id}.jpg`;
  let textureLoaded = false;
  await new Promise((resolve)=>{
    loader.load(textureUrl, tex=>{
      material.map = tex; material.needsUpdate = true; textureLoaded = true; resolve();
    }, undefined, ()=>{resolve();});
  });

  const mesh = new THREE.Mesh(geo, material);
  scene.add(mesh);

  // simple atmosphere glow as slightly larger transparent sphere
  const atmMat = new THREE.MeshBasicMaterial({color:0x99d6ff, transparent:true, opacity:0.08, side:THREE.BackSide, blending:THREE.AdditiveBlending});
  const atmGeo = new THREE.SphereGeometry(1.03, 64, 64);
  const atmMesh = new THREE.Mesh(atmGeo, atmMat);
  scene.add(atmMesh);

    camera.position.z = 2.6;

    // handle resize
    function resize(){
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || 420;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }
  window.addEventListener('resize', resize);
  resize();

  // Simple auto-rotate and slow bob
  let t = 0;
  function animate(){
    requestAnimationFrame(animate);
    t += 0.008;
    mesh.rotation.y += 0.004 + (textureLoaded ? 0.002 : 0.0);
    mesh.rotation.x = Math.sin(t) * 0.02;
    atmMesh.rotation.y = mesh.rotation.y * 0.98;
    renderer.render(scene, camera);
  }
  animate();

  // Chart.js atmosphere (improved visuals)
  const atm = p.atmosphere || {};
  const labels = Object.keys(atm);
  const values = labels.map(k=>atm[k]);
  const palette = ['#60a5fa','#34d399','#f472b6','#f6e05e','#cbd5e1','#8b5cf6'];
  const ctx = document.getElementById('atmChart').getContext('2d');
  new Chart(ctx,{
    type: 'doughnut',
    data: {labels, datasets:[{data: values, backgroundColor: palette.slice(0, labels.length)}]},
    options: {
      plugins: {legend:{position:'bottom', labels:{color:'#cbd5e1'}}, tooltip:{callbacks:{label: ctx => `${ctx.label}: ${ctx.parsed}%`}}},
      maintainAspectRatio: false
    }
  });

    // Size comparison animation
    const earthRadius = (Array.isArray(list) && list.find(x=>x.id==='earth') && list.find(x=>x.id==='earth').radius) || 6371;
    const ratio = Math.max(4, Math.round((p.radius / earthRadius) * 100));
    const bar = document.getElementById('earth-bar');
    if(bar){
      bar.style.width = '8%';
      // trigger animated class then set width for CSS transition
      setTimeout(()=>{ bar.classList.add('animated'); bar.style.width = ratio + '%'; }, 80);
    }
    const lbl = document.getElementById('size-label');
    if(lbl) lbl.textContent = `${p.radius} km`;
  }catch(err){
    console.error('planet init failed',err);
    const mount = document.getElementById('viewer');
    if(mount) mount.innerHTML = '<div style="color:var(--muted);padding:24px">Не удалось загрузить данные планеты. Запустите локальный сервер или откройте сайт по HTTP.</div>';
  }
}

window.addEventListener('DOMContentLoaded', initPlanet);
