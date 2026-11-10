// 3D と同じ読み込み（MTQ_JOIN76 ＋ 地球の地形を world76.js の前に）。opts.earth=false で地形なし
const { JSDOM } = require(process.env.JSDOM_PATH || (() => { try { return require.resolve('jsdom'); } catch (e) { return '/home/claude/work/node_modules/jsdom'; } })()); const fs = require('fs');
module.exports = function load(opts) {
  opts = opts || {}; const dir = opts.dir || process.env.RPG_DIR || require('path').resolve(__dirname, '../../..') + '/';
  const html = fs.readFileSync(dir + 'index.html', 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://mochipoyo.github.io/mochipoyo-trade-quest/3d/' + (opts.query ? '?' + opts.query : '') /* v8.1 opts.query（例 layout=off） */ }); const w = dom.window;
  const ctxStub = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => {} });
  w.HTMLCanvasElement.prototype.getContext = function () { return ctxStub; }; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.URL.createObjectURL = () => 'blob:x'; w.AudioContext = function () { return { createGain: () => ({ connect() {}, gain: {} }), destination: {} }; };
  const errors = []; w.addEventListener('error', (e) => errors.push(e.message));
  if (opts.join !== false) w.MTQ_JOIN76 = true;
  if (typeof opts.before === 'function') opts.before(w);   // v9.4.1 スクリプトを読む前に（例：3D 版のセーブの置き場所 MTQ_SAVE_PREFIX）
  if (opts.setting) w.localStorage.setItem('mtq3d-join', opts.setting);
  const srcs = [...html.matchAll(/src="(js\/[^"]+)"/g)].map((m) => m[1].replace(/\?.*$/, ''));
  for (const f of srcs) { if (f === 'js/rpg/world76.js' && opts.join !== false && opts.earth !== false) w.eval(fs.readFileSync(dir + 'js/data/earth78-terrain.js', 'utf8')); try { w.eval(fs.readFileSync(dir + f, 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
  return { w, errors };
};
