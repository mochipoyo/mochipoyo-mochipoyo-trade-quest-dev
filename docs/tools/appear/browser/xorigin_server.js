// 確かめ用：別のサイト（別のポート）からファイルを返す小さなサーバー。githack などで画像が「別のサイト扱い」になる状況をまねる
//   node xorigin_server.js <フォルダ> <ポート> [cors|nocors]   cors＝Access-Control-Allow-Origin: * を付ける
const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.resolve(process.argv[2]); const port = Number(process.argv[3]); const cors = process.argv[4] !== 'nocors';
const TYPES = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html' };
http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (err, buf) => {
    const h = { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }; if (cors) h['Access-Control-Allow-Origin'] = '*';
    if (err) { res.writeHead(404, h); res.end(); return; } res.writeHead(200, h); res.end(buf);
  });
}).listen(port, () => console.log('xorigin', port, cors ? 'cors' : 'nocors'));
