// v9.3 読み込みを速くする：index.html の <template id="mtq-src"> の中のスクリプトの一覧（この順）を 1 つにまとめて縮める（esbuild）
//   ・tools/stamp-version.js から呼ぶ（版の印を付けるときに必ず作り直す → まとめたファイルが古いまま公開されない）
//   ・縮めるのは空白・コメント・関数の中の名前だけ（ファイルの一番外の名前・window に付ける名前は変えない）。どのファイルも即時関数で囲まれている
//   ・esbuild がないとき：cd tools && npm install（esbuild の版は tools/package.json で固定。同じ入力から同じ出力になる）
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function sources(html) { const t = (html.match(/<template id="mtq-src">([\s\S]*?)<\/template>/) || [])[1]; if (!t) throw new Error('index.html に <template id="mtq-src"> がない'); return [...t.matchAll(/<script src="(js\/[^"?]+)(?:\?[^"]*)?"><\/script>/g)].map((m) => m[1]); }
function esbuild() { try { return require(path.join(__dirname, 'node_modules', 'esbuild')); } catch (e) { throw new Error('esbuild がない：cd tools && npm install を実行する'); } }
function build() {
  const list = sources(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  const src = list.map((f) => '/* ' + f + ' */\n' + fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n;\n').join('');
  const r = esbuild().transformSync(src, { minify: true, target: 'es2017', charset: 'utf8', legalComments: 'none' });
  const head = '/* 自動生成（tools/bundle.js・tools/stamp-version.js）。手で書き換えない。中身は index.html の <template id="mtq-src"> の ' + list.length + ' ファイル */\n';
  return { code: head + r.code, files: list };
}
module.exports = { build, sources, OUT: 'dist/mtq.min.js' };
