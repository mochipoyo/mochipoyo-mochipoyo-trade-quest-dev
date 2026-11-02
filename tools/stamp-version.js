// 版の番号（キャッシュ対策・v6.6）：node tools/stamp-version.js [--check]
//   index.html と 3d/index.html が読むファイル（js/・styles.css）に「?v=中身のハッシュ」を付け直す。中身が変わったファイルだけ URL が変わる
//   → ブラウザや配信元（githack・GitHub Pages）の古いファイルが使われ続けない
//   js/core/version.js（MTQ_VERSION）と version.json（公開中の版）を書き出す。ゲームは version.json と比べて「新しい版があります」を出す（js/core/update-check.js）
//   手順：three-src で npx vite build（3d/index.html を作る）→ このスクリプト → コミット。--check：付け直しが必要なら終了コード 1（書き換えない）
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..'); const CHECK = process.argv.includes('--check');
const PAGES = ['index.html', '3d/index.html'];
const VER_JS = 'js/core/version.js';
const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const local = (u) => !/^(https?:|data:|#|mailto:|\/\/)/.test(u);
const hashedName = (u, pg) => pg === '3d/index.html' && /^\.\/assets\/[^/]+\.(js|css)$/.test(u);   // vite が出力した 3d/assets/（名前にハッシュつき）はそのまま
let bad = 0; const files = {}; const pages = {};
for (const pg of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, pg), 'utf8'); pages[pg] = html;
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = m[1].replace(/\?.*$/, ''); if (!local(m[1]) || hashedName(u, pg)) continue;
    const abs = path.resolve(path.dirname(path.join(ROOT, pg)), u); const rel = path.relative(ROOT, abs);
    if (!fs.existsSync(abs)) { console.log('NG  ' + pg + '：ファイルがない ' + m[1]); bad++; continue; }
    if (rel !== VER_JS) files[rel] = hash(fs.readFileSync(abs));
  }
}
// 3D版の本体（vite のハッシュつき）も版に含める
for (const m of (pages['3d/index.html'] || '').matchAll(/src="\.\/assets\/([^"]+\.js)"/g)) files['3d/assets/' + m[1]] = m[1];
const version = hash(Object.keys(files).sort().map((k) => k + ':' + files[k]).join('\n'));
const jst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') + ' JST';
const verJs = '/* 自動生成（tools/stamp-version.js）。手で書き換えない */\nwindow.MTQ_VERSION = \'' + version + '\';\n';
const verPath = path.join(ROOT, VER_JS); const oldVerJs = fs.existsSync(verPath) ? fs.readFileSync(verPath, 'utf8') : '';
if (oldVerJs !== verJs) { if (CHECK) { console.log('NG  ' + VER_JS + ' が古い'); bad++; } else fs.writeFileSync(verPath, verJs); }
files[VER_JS] = hash(Buffer.from(verJs));
const vj = path.join(ROOT, 'version.json'); let oldV = null; try { oldV = JSON.parse(fs.readFileSync(vj, 'utf8')).version; } catch (e) { }
if (oldV !== version) { if (CHECK) { console.log('NG  version.json が古い'); bad++; } else fs.writeFileSync(vj, JSON.stringify({ version, built: jst }, null, 1) + '\n'); }
for (const pg of PAGES) {
  const out = pages[pg].replace(/((?:src|href)=")([^"]+)(")/g, (all, a, u, b) => {
    const bare = u.replace(/\?.*$/, ''); if (!local(u) || hashedName(bare, pg)) return all;
    const rel = path.relative(ROOT, path.resolve(path.dirname(path.join(ROOT, pg)), bare)); const hv = files[rel]; if (!hv) return all;
    return a + bare + '?v=' + hv + b;
  });
  if (out !== pages[pg]) { if (CHECK) { console.log('NG  ' + pg + ' の ?v= が古い'); bad++; } else fs.writeFileSync(path.join(ROOT, pg), out); }
}
console.log((CHECK ? '確認' : '書き出し') + '：版 ' + version + '（' + Object.keys(files).length + ' ファイル）' + (bad ? ' / 問題 ' + bad + ' 件' : ''));
process.exit(bad ? 1 : 0);
