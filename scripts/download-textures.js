// download-textures.js
// Usage: node scripts/download-textures.js
// Downloads a set of planet textures to assets/textures/{id}.jpg

const fs = require('fs');
const {dirname} = require('path');
const http = require('http');
const https = require('https');
const {URL} = require('url');

const outDir = 'assets/textures';
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const map = {
  mercury: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Mercury_in_true_color.jpg',
  venus: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg',
  earth: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Earth_Eastern_Hemisphere.jpg',
  mars: 'https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg',
  jupiter: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg',
  saturn: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg',
  uranus: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg',
  neptune: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Neptune_Full.jpg'
};

function httpGetFollow(url){
  return new Promise((resolve, reject)=>{
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(u, (res)=>{
      if(res.statusCode >= 300 && res.statusCode < 400 && res.headers.location){
        // follow redirect
        resolve(httpGetFollow(res.headers.location));
        return;
      }
      if(res.statusCode !== 200){
        reject(new Error('Status ' + res.statusCode + ' for ' + url));
        return;
      }
      resolve(res);
    });
    req.on('error', reject);
  });
}

async function download(url, dest){
  if(fs.existsSync(dest)){
    console.log('Exists, skip:', dest);
    return;
  }
  try{
    console.log('Downloading', url);
    const res = await httpGetFollow(url);
    await new Promise((resolve, reject)=>{
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', ()=>{ file.close(resolve); });
      file.on('error', (err)=>{ fs.unlink(dest, ()=>{}); reject(err); });
    });
    console.log('Saved', dest);
  }catch(e){
    console.error('Failed', url, e.message);
  }
}

(async ()=>{
  for(const id of Object.keys(map)){
    const url = map[id];
    const dest = `${outDir}/${id}.jpg`;
    await download(url, dest);
  }
  console.log('Done.');
})();

// Optional optimization step using sharp (if installed): resize to max 1024px and re-encode
try{
  const sharp = require('sharp');
  (async ()=>{
    console.log('Optimizing images with sharp...');
    for(const id of Object.keys(map)){
      const dest = `${outDir}/${id}.jpg`;
      if(!fs.existsSync(dest)) continue;
      try{
        const tmp = dest + '.opt.jpg';
        await sharp(dest).resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(tmp);
        fs.renameSync(tmp, dest);
        console.log('Optimized', dest);
      }catch(err){ console.warn('Optimize failed for', dest, err.message); }
    }
    console.log('Optimization complete.');
  })();
}catch(e){
  console.log('sharp not installed — skipping image optimization. To enable, run: npm install sharp');
}
