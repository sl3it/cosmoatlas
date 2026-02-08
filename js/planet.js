function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

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

async function initPlanet() {
  try {
    const id = qs('id') || 'earth';
    let list;
    try {
      const res = await fetch('data/planets.json');
      if (!res.ok) throw new Error('status ' + res.status);
      list = await res.json();
    } catch (e) {
      if (window._PLANET_DATA && Array.isArray(window._PLANET_DATA.data)) list = window._PLANET_DATA.data;
      else throw e;
    }
    const p = list.find(x => x.id === id) || list[2];

    // Update Text Info
    document.getElementById('p-name').textContent = p.name;
    document.getElementById('p-meta').textContent = `${p.type} • ${p.distance} млн км • Радиус ${p.radius} km`;

    // Render Photo Viewer
    const mount = document.getElementById('viewer');
    mount.innerHTML = '';
    mount.style.display = 'flex';
    mount.style.alignItems = 'center';
    mount.style.justifyContent = 'center';
    mount.style.position = 'relative';
    mount.style.overflow = 'hidden';

    // Background glow
    const glow = document.createElement('div');
    glow.style.position = 'absolute';
    glow.style.width = '60%';
    glow.style.height = '60%';
    glow.style.background = p.color;
    glow.style.opacity = '0.15';
    glow.style.filter = 'blur(60px)';
    glow.style.borderRadius = '50%';
    glow.style.zIndex = '0';
    mount.appendChild(glow);

    // Main Image
    const img = document.createElement('img');
    const photoUrl = REMOTE_PLANET_PHOTOS[p.id] || `https://placehold.co/800x800/${p.color.replace('#', '')}/ffffff?text=${encodeURIComponent(p.name)}`;

    img.src = photoUrl;
    img.alt = p.name;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';
    img.style.zIndex = '1';
    img.style.borderRadius = '50%'; // Make it look round even if image is square-ish
    img.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
    img.style.transition = 'transform 0.5s ease-out';

    // Simple entrance animation
    img.style.transform = 'scale(0.9) translateY(10px) opacity(0)';
    img.onload = () => {
      img.style.transform = 'scale(1) translateY(0) opacity(1)';
    };
    // Fallback if load fails (remove opacity/transform so it doesn't stay invisible)
    img.onerror = () => {
      img.style.transform = 'scale(1)';
    }

    mount.appendChild(img);

    // Chart.js atmosphere
    const atm = p.atmosphere || {};
    const labels = Object.keys(atm);
    const values = labels.map(k => atm[k]);
    const palette = ['#60a5fa', '#34d399', '#f472b6', '#f6e05e', '#cbd5e1', '#8b5cf6'];
    const ctx = document.getElementById('atmChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 0 }] },
      options: {
        plugins: {
          legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
        },
        maintainAspectRatio: false,
        cutout: '70%'
      }
    });

    // Size comparison animation
    const earthRadius = (Array.isArray(list) && list.find(x => x.id === 'earth') && list.find(x => x.id === 'earth').radius) || 6371;
    const ratio = Math.max(4, Math.round((p.radius / earthRadius) * 100));
    const bar = document.getElementById('earth-bar');
    if (bar) {
      bar.style.width = '8%';
      setTimeout(() => { bar.classList.add('animated'); bar.style.width = ratio + '%'; }, 80);
    }
    const lbl = document.getElementById('size-label');
    if (lbl) lbl.textContent = `${p.radius} km`;

  } catch (err) {
    console.error('planet init failed', err);
    const mount = document.getElementById('viewer');
    if (mount) mount.innerHTML = '<div style="color:var(--muted);padding:24px;text-align:center">Не удалось загрузить данные планеты.</div>';
  }
}

window.addEventListener('DOMContentLoaded', initPlanet);
