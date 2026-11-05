const P = require('./proj.js'); const { rings, fillRings } = require('./rast.js'); const tc = require('topojson-client'); const fs = require('fs');
const T = require('world-atlas/land-50m.json'); const f = tc.feature(T, T.objects.land);
const land = new Uint8Array(P.W * P.H);
f.features.forEach((ft) => { const geom = ft.geometry; const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; polys.forEach((poly) => { const tmp = new Uint8Array(P.W * P.H); fillRings(tmp, poly, 1); for (let i = 0; i < tmp.length; i++) if (tmp[i]) land[i] = 1; }); });
fs.writeFileSync('land.bin', land); let n = 0; for (const v of land) n += v; console.log('land cells', n, (n / land.length * 100).toFixed(1) + '%');
