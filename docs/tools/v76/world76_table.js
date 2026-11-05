// v7.6 つないだ世界：全マップの対応表を作る（jsdom・実行時のデータから）→ docs/environment/WORLD76_MAPS.md
//   node docs/tools/v76/world76_table.js [出力先]
const { JSDOM } = require(process.env.JSDOM_PATH || (() => { try { return require.resolve('jsdom'); } catch (e) { return '/home/claude/work/node_modules/jsdom'; } })()); const fs = require('fs'); const path = require('path');
const dir = process.env.RPG_DIR || path.resolve(__dirname, '../../..') + '/';
const html = fs.readFileSync(dir + 'index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://mochipoyo.github.io/mochipoyo-trade-quest/' }); const w = dom.window;
const ctxStub = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => {} });
w.HTMLCanvasElement.prototype.getContext = function () { return ctxStub; }; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.URL.createObjectURL = () => 'blob:x'; w.AudioContext = function () { return { createGain: () => ({ connect() {}, gain: {} }), destination: {} }; };
w.MTQ_JOIN76 = true;
const srcs = [...html.matchAll(/src="(js\/[^"]+)"/g)].map((m) => m[1]); for (const f of srcs) w.eval(fs.readFileSync(dir + f.replace(/\?.*$/, ''), 'utf8'));
w.State.newGame('t', 'warrior'); w.World.start();
const W = w.World76; const DEFS = w.MAP_DEFS; const ids = Object.keys(DEFS);
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '／').replace(/\n/g, ' ');
// どの地図から入るか（warps の逆引き）
const parents = {}; ids.forEach((id) => { let m; try { m = w.World.getMap(id); } catch (e) { return; } (m.warps || []).forEach((wp) => { if (!wp.to || wp.to === id) return; (parents[wp.to] = parents[wp.to] || []).push({ from: id, x: wp.x, y: wp.y, need: wp.needFlag || '' }); }); });
// 地域の locations（入口）
const locOf = {}; W.REGIONS.forEach((rid) => (DEFS[rid].locations || []).forEach((L) => { (locOf[L.to] = locOf[L.to] || []).push({ region: rid, L }); }));
function regionOfMap(id, seen) { seen = seen || {}; if (W.inGrid(id) || id === 'world_sky' || id === 'world_machine') return id; if (seen[id]) return null; seen[id] = 1; const ps = parents[id] || []; for (const p of ps) { const r = regionOfMap(p.from, seen); if (r) return r; } return null; }
const rows = []; const kinds = {};
ids.sort().forEach((id) => {
  let m; try { m = w.World.getMap(id); } catch (e) { rows.push([id, esc(DEFS[id].name), '（読み込めない）', '', '', '', '', '', '']); return; }
  const def = DEFS[id]; const kind = m.kind || def.kind || '?'; kinds[kind] = (kinds[kind] || 0) + 1;
  let world = '', place = '', move = '', entry = '', cond = '', veh = '';
  if (W.isRegion(id)) { const r = W.rect(id); world = '地上の世界（地域）'; place = 'x ' + r.x + '〜' + (r.x + r.w - 1) + '・y ' + r.y + '〜' + (r.y + r.h - 1); move = '世界の座標 = (' + r.x + ' + x, ' + r.y + ' + y)'; const g = W.GATE[id]; cond = g ? g.flag : 'なし'; veh = g && g.vehicles ? g.vehicles.join('・') + 'だけ' : id === 'world' || id === 'world_grania' ? '徒歩・船・飛空艇（小型帆船はここだけ）' : '徒歩・遠洋航海船・飛空艇'; entry = '境目（画面の切り替えなし）'; }
  else if (W.isSea(id)) { const r = W.rect(id); world = '地上の世界（共通の海・新規）'; place = 'x ' + r.x + '〜' + (r.x + r.w - 1) + '・y ' + r.y + '〜' + (r.y + r.h - 1); move = '新しい地図（前の版になし）'; cond = 'なし'; veh = '遠洋航海船・飛空艇'; entry = '境目'; }
  else {
    const reg = regionOfMap(id); const lo = (locOf[id] || [])[0]; const ps = parents[id] || [];
    if (id === 'world_sky' || id === 'world_machine') { world = '別の空間（' + (id === 'world_sky' ? '空の上' : '異空間') + '）'; move = '切り替えのまま'; entry = id === 'world_sky' ? '飛空艇で世界の北の果てから上へ（天空群島から降りるとアルカディアの北へ）' : '時の神殿領の転移門'; }
    else if (reg === 'world_sky' || reg === 'world_machine') { world = '別の空間（' + (reg === 'world_sky' ? '空の上' : '異空間') + '）の中の' + ({ town: '町', dungeon: 'ダンジョン', interior: '建物の中', field: '地図' }[kind] || kind); move = '切り替えのまま'; }
    else if (reg) { world = '地上の世界の中の' + ({ town: '町', dungeon: 'ダンジョン', interior: '建物の中' }[kind] || kind); move = '切り替えのまま（場面の切り替え）'; }
    else { world = '物語の場面など（地上の地域の出入口から直接はつながらない）'; move = '切り替えのまま'; }
    if (lo) { const g = W.toGlobal(lo.region, lo.L.x, lo.L.y); place = DEFS[lo.region].name + ' ' + lo.L.x + ',' + lo.L.y + '（世界 ' + g.x + ',' + g.y + '）'; entry = esc(lo.L.name); cond = lo.L.needFlag || ''; }
    else if (ps.length) { const p0 = ps[0]; place = (DEFS[p0.from] ? DEFS[p0.from].name : p0.from) + ' ' + p0.x + ',' + p0.y + (ps.length > 1 ? ' ほか' + (ps.length - 1) : ''); entry = '入口・扉'; cond = [...new Set(ps.map((q) => q.need).filter(Boolean))].join('・'); }
    if (reg && !W.isRegion(id) && W.GATE[reg] && !cond) cond = '（地域の条件 ' + W.GATE[reg].flag + '）';
  }
  rows.push([id, esc(def.name || m.name), world, m.w + '×' + m.h, esc(entry), esc(cond), esc(veh), esc(place), esc(move)]);
});
const out = ['# つないだ世界：全マップの対応表（自動生成）', '', '`node docs/tools/v76/world76_table.js` で実行時のデータ（MAP_DEFS・warps・locations・World76 の配置。拡大の補正をすべて反映したあとの大きさ）から作った。手で書き換えない。',
  '', '- 地図の数：' + ids.length + '（' + Object.keys(kinds).map((k) => k + ' ' + kinds[k]).join('・') + '）', '- 世界の大きさ：' + W.size().w + '×' + W.size().h + ' マス（40×30 マスのブロック ' + W.size().bw + '×' + W.size().bh + '）', '',
  '| 旧mapId | 名称 | 同じ世界か別の空間か | 幅×高さ | 出入口 | 進入条件（フラグ） | 乗り物の条件 | 世界の中の位置 | 移行の方法 |', '|---|---|---|---|---|---|---|---|---|'];
rows.forEach((r) => out.push('| ' + r.join(' | ') + ' |'));
const file = process.argv[2] || path.resolve(__dirname, '../../environment/WORLD76_MAPS.md');
fs.writeFileSync(file, out.join('\n') + '\n'); console.log('書き出し', file, rows.length, '行');
