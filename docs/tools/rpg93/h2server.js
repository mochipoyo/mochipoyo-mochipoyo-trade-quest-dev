// 計測用：HTTP/2（TLS）＋ gzip（GitHub Pages に近い条件）。ROOT 以下を配る。キャッシュは max-age=600（GitHub Pages と同じ値）
const http2 = require('http2'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = process.env.ROOT, PORT = +process.env.PORT || 8443; const DIR = process.env.CERT_DIR || __dirname;   // 自己署名の証明書（key.pem・cert.pem）は作業用のフォルダに置く（リポジトリに入れない）
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.opus': 'audio/ogg', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.gif': 'image/gif', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const gzCache = new Map();
const srv = http2.createSecureServer({ key: fs.readFileSync(DIR + '/key.pem'), cert: fs.readFileSync(DIR + '/cert.pem'), allowHTTP1: true });
srv.on('stream', (st, h) => {
  let p = decodeURIComponent((h[':path'] || '/').split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { st.respond({ ':status': 404 }); st.end(); return; }
  const ext = path.extname(f).toLowerCase(); const type = TYPES[ext] || 'application/octet-stream'; const text = /text|javascript|json|svg|manifest/.test(type);
  const ae = h['accept-encoding'] || ''; const hdr = { ':status': 200, 'content-type': type, 'cache-control': 'max-age=600' };
  if (text && /gzip/.test(ae)) { let b = gzCache.get(f); if (!b) { b = zlib.gzipSync(fs.readFileSync(f), { level: 6 }); gzCache.set(f, b); } hdr['content-encoding'] = 'gzip'; hdr['content-length'] = b.length; st.respond(hdr); st.end(b); return; }
  const b = fs.readFileSync(f); hdr['content-length'] = b.length; st.respond(hdr); st.end(b);
});
srv.listen(PORT, () => console.log('h2 ready ' + PORT));
