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
    }, undefined, ()=>{
      // try remote placeholder fallback using same color and planet name
      const fallbackUrl = `https://placehold.co/1024x1024/${(p.color||'#444').replace('#','')}/ffffff?text=${encodeURIComponent(p.name)}`;
      loader.load(fallbackUrl, ftex=>{ material.map = ftex; material.needsUpdate = true; textureLoaded = true; resolve(); }, undefined, ()=>{ resolve(); });
    });
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
  // Simple auto-rotate, slow bob and interactive drag-to-rotate
  let t = 0;
  // interactive rotation state
  let isPointerDown = false;
  let lastX = 0, lastY = 0;
  let velX = 0, velY = 0; // inertia velocities
  let userRotX = 0; // user-controlled X rotation offset
  const sensitivity = 0.005;
  const damping = 0.92;

  // Prevent default touch actions so dragging works consistently
  renderer.domElement.style.touchAction = 'none';

  renderer.domElement.addEventListener('pointerdown', (ev)=>{
    isPointerDown = true;
    lastX = ev.clientX; lastY = ev.clientY;
    try{ renderer.domElement.setPointerCapture(ev.pointerId); }catch(e){}
  });
  renderer.domElement.addEventListener('pointermove', (ev)=>{
    if(!isPointerDown) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    // horizontal drag rotates around Y axis, vertical adjusts X offset
    mesh.rotation.y += dx * sensitivity;
    userRotX += dy * sensitivity;
    // clamp user X rotation so planet doesn't flip upside-down
    userRotX = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, userRotX));
    // update inertia
    velX = dx * sensitivity;
    velY = dy * sensitivity;
    lastX = ev.clientX; lastY = ev.clientY;
  });
  function endPointer(ev){ isPointerDown = false; try{ renderer.domElement.releasePointerCapture(ev && ev.pointerId); }catch(e){} }
  renderer.domElement.addEventListener('pointerup', endPointer);
  renderer.domElement.addEventListener('pointercancel', endPointer);
  renderer.domElement.addEventListener('pointerleave', ()=>{ isPointerDown = false; });

  function animate(){
    requestAnimationFrame(animate);
    t += 0.008;
    const baseAuto = 0.004 + (textureLoaded ? 0.002 : 0.0);
    // apply inertia when user released
    if(!isPointerDown){
      // apply small inertia velocities
      if(Math.abs(velX) > 0.00001){ mesh.rotation.y += velX; velX *= damping; }
      else { mesh.rotation.y += baseAuto; }
      if(Math.abs(velY) > 0.00001){ userRotX += velY; velY *= damping; }
    }
    // gentle procedural bob + user X rotation
    mesh.rotation.x = Math.sin(t) * 0.02 + userRotX;
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
