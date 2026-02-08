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
  // small point light for specular highlight
  const point = new THREE.PointLight(0xffffff, 0.6);
  point.position.set(3, 1.6, 2.5);
  scene.add(point);

  // Planet mesh with optional texture
  const geo = new THREE.SphereGeometry(1, 64, 64);
  const loader = new THREE.TextureLoader();
  renderer.physicallyCorrectLights = true;
  let material = new THREE.MeshStandardMaterial({color: p.color || '#888', metalness:0.0, roughness:0.7});
  // prepare candidate texture URLs: prefer curated remote textures, then placeholder (no local files required)
  const remoteMap = {
    earth: ['https://upload.wikimedia.org/wikipedia/commons/6/6f/Earth_Eastern_Hemisphere.jpg'],
    mars: ['https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg'],
    jupiter: ['https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg'],
    saturn: ['https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg'],
    // try multiple mercury variants (thumb and full) to improve chance of loading
    mercury: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercury_in_true_color.jpg/800px-Mercury_in_true_color.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercury_in_true_color.jpg/400px-Mercury_in_true_color.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/2/2e/Mercury_in_true_color.jpg'
    ],
    venus: ['https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg'],
    uranus: ['https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg'],
    neptune: ['https://upload.wikimedia.org/wikipedia/commons/5/56/Neptune_Full.jpg']
  };
  const placeholder = `https://placehold.co/1024x1024/${(p.color||'#444').replace('#','')}/ffffff?text=${encodeURIComponent(p.name)}`;
  const candidates = [];
  if(remoteMap[p.id]){
    // remoteMap entries are arrays of candidate URLs
    const arr = Array.isArray(remoteMap[p.id]) ? remoteMap[p.id] : [remoteMap[p.id]];
    for(const u of arr) candidates.push(u);
  }
  candidates.push(placeholder);

  let textureLoaded = false;
  async function tryLoadList(list){
    for(const url of list){
      try{
        const tex = await new Promise((resolve, reject)=>{
          loader.load(url, resolve, undefined, reject);
        });
        return tex;
      }catch(e){
        // try next
      }
    }
    return null;
  }
  const tex = await tryLoadList(candidates);
  if(tex){ material.map = tex; material.needsUpdate = true; textureLoaded = true; }

  const mesh = new THREE.Mesh(geo, material);
  scene.add(mesh);

  // simple atmosphere glow as slightly larger transparent sphere
  const atmMat = new THREE.MeshBasicMaterial({color:0x99d6ff, transparent:true, opacity:0.08, side:THREE.BackSide, blending:THREE.AdditiveBlending});
  const atmGeo = new THREE.SphereGeometry(1.03, 64, 64);
  const atmMesh = new THREE.Mesh(atmGeo, atmMat);
  scene.add(atmMesh);

    // handle resize and frame the sphere so it stays centered and fully visible
    function frameCamera(){
      const fov = camera.fov * (Math.PI/180);
      // distance needed to fully frame a unit sphere with some padding
      const distance = 1.15 / Math.tan(fov/2);
      camera.position.set(0, 0, distance);
      camera.lookAt(0,0,0);
    }

    // initial camera frame
    frameCamera();

    // handle resize
    function resize(){
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || 420;
      // update renderer and ensure DOM element fills the container
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      frameCamera();
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
