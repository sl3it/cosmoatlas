# CosmoAtlas — demo static site

Static prototype showing:
- Landing page with NASA Photo of the Day (APOD)
- Atlas page with planet cards (data/planets.json)
- Planet detail page with Three.js viewer and Chart.js atmosphere
- Live ISS tracker using Leaflet and `wheretheiss.at` API

Quick start (serve site locally):

```bash
# From project folder
python -m http.server 8000
# then open http://localhost:8000
```

Files of interest:
- index.html — landing
- atlas.html — grid of planets
- planet.html — dynamic planet view
- iss.html — live ISS map
