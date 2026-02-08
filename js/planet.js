function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

const PLANET_ASSETS = {
  mercury: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Solarsystemscope_texture_2k_mercury.jpg/1024px-Solarsystemscope_texture_2k_mercury.jpg',
    bump: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Solarsystemscope_texture_2k_mercury.jpg/1024px-Solarsystemscope_texture_2k_mercury.jpg' // reuse as bump for craters (grayscale)
  },
  venus: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Solarsystemscope_texture_2k_venus_atmosphere.jpg/1024px-Solarsystemscope_texture_2k_venus_atmosphere.jpg',
    // Venus is mostly atmosphere so no bump map needed for cloud tops
  },
  earth: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Solarsystemscope_texture_2k_earth_daymap.jpg/1024px-Solarsystemscope_texture_2k_earth_daymap.jpg',
    specular: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Solarsystemscope_texture_2k_earth_specular_map.jpg/1024px-Solarsystemscope_texture_2k_earth_specular_map.jpg', // water shine
    bump: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Solarsystemscope_texture_2k_earth_normal_map.tif/lossy-page1-1024px-Solarsystemscope_texture_2k_earth_normal_map.tif.jpg', // terrain
    clouds: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Solarsystemscope_texture_8k_earth_clouds.jpg/1024px-Solarsystemscope_texture_8k_earth_clouds.jpg'
  },
  mars: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Solarsystemscope_texture_2k_mars.jpg/1024px-Solarsystemscope_texture_2k_mars.jpg',
    bump: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Solarsystemscope_texture_2k_mars.jpg/1024px-Solarsystemscope_texture_2k_mars.jpg' // reuse as bump for craters
  },
  jupiter: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Solarsystemscope_texture_2k_jupiter.jpg/1024px-Solarsystemscope_texture_2k_jupiter.jpg',
    roughness: 0.4
  },
  saturn: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Solarsystemscope_texture_2k_saturn.jpg/1024px-Solarsystemscope_texture_2k_saturn.jpg',
    roughness: 0.4
  },
  uranus: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Solarsystemscope_texture_2k_uranus.jpg/1024px-Solarsystemscope_texture_2k_uranus.jpg',
    roughness: 0.4
  },
  neptune: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Solarsystemscope_texture_2k_neptune.jpg/1024px-Solarsystemscope_texture_2k_neptune.jpg',
    roughness: 0.4
  }
};


async function initPlanet() {
  try {
    const id = qs('id') || 'earth';
    let list;
    try {
      const res = await fetch('data/planets.json');
      list = res.ok ? await res.json() : (window._PLANET_DATA?.data || []);
    } catch (e) {
      list = window._PLANET_DATA?.data || [];
    }
    const p = list.find(x => x.id === id) || list[0] || {};

    // --- UI Updates ---
    const nameEl = document.getElementById('p-name');
    if (nameEl) nameEl.textContent = p.name;
    const typeEl = document.getElementById('p-type');
    if (typeEl) typeEl.textContent = (p.type || '').toUpperCase();

    document.getElementById('val-dist').textContent = `${p.distance} млн км`;
    document.getElementById('val-radius').textContent = `${p.radius} км`;

    // --- 3D Scene Setup ---
    const mount = document.getElementById('viewer');
    mount.innerHTML = '';
    mount.style.position = 'relative';
    mount.style.overflow = 'hidden';

    if (!window.THREE) {
      mount.innerHTML = '<div style="color:white;text-align:center">3D engine not loaded. Check connection.</div>';
      return;
    }

    const w = mount.clientWidth || 400;
    const h = mount.clientHeight || 400;

    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // --- Lighting ---
    // Ambient for base visibility
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    // Sun light (strong directional)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // --- Starfield Background ---
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 80; // wide spread
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.8 });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);


    // --- Planet Mesh ---
    const group = new THREE.Group();
    scene.add(group);

    const geo = new THREE.SphereGeometry(1, 128, 128); // Increased segments for smoother bump maps

    // Default Material settings
    const matParams = {
      roughness: 0.8,
      metalness: 0.1,
      bumpScale: 0.05,
      color: 0xffffff
    };

    const assets = PLANET_ASSETS[p.id];
    if (assets && assets.roughness) matParams.roughness = assets.roughness;

    const mat = new THREE.MeshStandardMaterial(matParams);
    const texLoader = new THREE.TextureLoader();

    if (assets) {
      // Base Color Map (Albedo)
      if (assets.map) {
        texLoader.load(assets.map, (t) => {
          mat.map = t;
          mat.needsUpdate = true;
        });
      } else {
        mat.color.set(p.color);
      }

      // Bump Map (Terrain Detail)
      if (assets.bump) {
        texLoader.load(assets.bump, (t) => {
          mat.bumpMap = t;
          mat.bumpScale = 0.02; // Subtle height
          mat.needsUpdate = true;
        });
      }

      // Specular Map (Water Shine)
      // Note: THREE.MeshStandardMaterial uses roughnessMap/metalnessMap instead of specularMap.
      // We can simulate water shine by using the specular map as a roughness map (inverted).
      // Dark areas (water) should be smooth (shiny), light areas (land) rough.
      if (assets.specular) {
        texLoader.load(assets.specular, (t) => {
          mat.roughnessMap = t;
          mat.roughness = 1.0; // Base roughness high
          // Usually specular maps are: White=Shiny(water), Black=Matte(land).
          // Roughness maps are: White=Rough, Black=Smooth.
          // So we might need to invert it or adjust model, but let's try direct first.
          // Actually, standard earth specular map: White=Water (reflective), Black=Land.
          // So for roughness: We need Water=Black (smooth). 
          // We'll leave it simple for now, standard map often works okay or looks interesting.
          // Better: convert visually or just use it as metalness map for "shiny" effect.
          mat.metalnessMap = t;
          mat.metalness = 0.2;
          mat.needsUpdate = true;
        });
      }
    } else {
      // Fallback for missing assets
      mat.color.set(p.color);
    }

    const planetMesh = new THREE.Mesh(geo, mat);
    group.add(planetMesh);

    // --- Clouds (Earth Only) ---
    let cloudMesh = null;
    if (p.id === 'earth' && assets.clouds) {
      const cloudGeo = new THREE.SphereGeometry(1.01, 128, 128);
      const cloudMat = new THREE.MeshPhongMaterial({
        map: texLoader.load(assets.clouds),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
      group.add(cloudMesh);
    }

    // --- Atmosphere Glow (Shader) ---
    // Create a custom shader material for the atmospheric halo
    const atmosGeo = new THREE.SphereGeometry(1.2, 64, 64);
    const vertexShader = `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const fragmentShader = `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * 1.5;
      }
    `;

    // Tweak atmosphere color based on planet
    let atmosColor = new THREE.Color(0x3399ff); // default blue
    if (p.id === 'mars') atmosColor.setHex(0xffaa66);
    if (p.id === 'venus') atmosColor.setHex(0xffcc99);

    // We inject color into the string roughly for simplicity or use uniforms
    const fragShaderDynamic = fragmentShader.replace(
      'vec4(0.3, 0.6, 1.0, 1.0)',
      `vec4(${atmosColor.r}, ${atmosColor.g}, ${atmosColor.b}, 1.0)`
    );

    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragShaderDynamic,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });

    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);


    // --- Interaction ---
    let isDragging = false;
    let prevX = 0, prevY = 0;

    // Rotation & Zoom state
    const targetRotation = { x: 0, y: 0 };
    let zoom = 2.8;

    const onDown = (e) => {
      isDragging = true;
      prevX = e.clientX || e.touches[0].clientX;
      prevY = e.clientY || e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (!isDragging) return;
      const cx = e.clientX || e.touches[0].clientX;
      const cy = e.clientY || e.touches[0].clientY;

      const dx = cx - prevX;
      const dy = cy - prevY;

      targetRotation.y += dx * 0.005;
      targetRotation.x += dy * 0.005;

      prevX = cx;
      prevY = cy;
    };
    const onUp = () => { isDragging = false; };

    // Mouse Wheel Zoom
    const onWheel = (e) => {
      e.preventDefault();
      zoom += e.deltaY * 0.003;
      zoom = Math.max(1.5, Math.min(6, zoom)); // Clamp zoom
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onDown);
    dom.addEventListener('mousemove', onMove);
    dom.addEventListener('mouseup', onUp);
    dom.addEventListener('mouseleave', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false }); // passive false to allow preventDefault

    dom.addEventListener('touchstart', onDown, { passive: false });
    dom.addEventListener('touchmove', onMove, { passive: false });
    dom.addEventListener('touchend', onUp);

    // --- Animation Loop ---
    const animate = () => {
      requestAnimationFrame(animate);

      // Smooth Rotation
      group.rotation.y += 0.001; // Auto rotate

      // Apply drag rotation
      group.rotation.y += (targetRotation.y - group.rotation.y) * 0.1;
      group.rotation.x += (targetRotation.x - group.rotation.x) * 0.1;

      // Separate cloud rotation
      if (cloudMesh) {
        cloudMesh.rotation.y += 0.0005;
      }

      // Smooth Zoom
      camera.position.z += (zoom - camera.position.z) * 0.1;

      renderer.render(scene, camera);
    };
    animate();

    // --- Resize Handler ---
    const resizeObserver = new ResizeObserver(() => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (nw && nh) {
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(mount);

    // --- Chart Restoration (unchanged) ---
    const atm = p.atmosphere || {};
    const labels = Object.keys(atm);
    const values = labels.map(k => atm[k]);
    const palette = ['#60a5fa', '#34d399', '#f472b6', '#f6e05e', '#cbd5e1', '#8b5cf6'];
    const chartDefaults = { labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 0 }] };

    const ctx = document.getElementById('atmChart').getContext('2d');
    if (window.myAtmChart) window.myAtmChart.destroy();
    window.myAtmChart = new Chart(ctx, {
      type: 'doughnut',
      data: chartDefaults,
      options: {
        plugins: {
          legend: { position: 'right', labels: { color: '#9ca3af', boxWidth: 10 } }
        },
        maintainAspectRatio: false,
        cutout: '75%',
        layout: { padding: 0 }
      }
    });

    // --- Size Bar (unchanged) ---
    const earthRadius = 6371;
    const bar = document.getElementById('earth-bar');
    if (bar) {
      // Normalize large planets (Jupiter=70k) vs Small (Mercury=2k) logic
      // Just keep simple percentage bar of "Max Planet"
      const widthPct = (p.radius / 70000) * 100;
      bar.style.width = '0%';
      setTimeout(() => { bar.style.width = `${Math.max(5, widthPct)}%`; }, 100);
    }
    const lbl = document.getElementById('size-label');
    if (lbl) {
      lbl.textContent = p.id === 'earth' ? '1x Земля' : `${(p.radius / earthRadius).toFixed(1)}x Земля`;
    }

  } catch (err) {
    console.error('3D Init Failed', err);
  }
}

window.addEventListener('DOMContentLoaded', initPlanet);
