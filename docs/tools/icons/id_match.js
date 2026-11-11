// 装備・アイテムのアイコン：ゲームを起動したあとの ITEMS・OOPARTS と、素材のマニフェストを照合する（jsdom。2D と 3D の読み込み）
//   node docs/tools/icons/id_match.js [2d] <ITEM_ICON_MANIFEST.json のパス> [<qa/source_item_catalog.json のパス>]
const path = require('path'); const fs = require('fs'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const two = process.argv.includes('2d'); const args = process.argv.slice(2).filter((a) => a !== '2d');
const man = JSON.parse(fs.readFileSync(args[0], 'utf8')); const cat = args[1] ? JSON.parse(fs.readFileSync(args[1], 'utf8')) : null;
const A = load(two ? { earth: false, join: false } : {}); const w = A.w;
(async () => {
  try { w.Engine.Input.init(); } catch (e) { }
  if (w.MochiQuest && w.MochiQuest.boot) w.MochiQuest.boot(); await new Promise((r) => setTimeout(r, 300));
  const items = Object.keys(w.ITEMS); const oo = (w.OOPARTS || []).map((o) => o.id);
  const E = man.entries; const act = (ns) => Object.keys(E).filter((k) => E[k].namespace === ns);
  const add = items.filter((id) => !E[id] || E[id].namespace !== 'items').concat(oo.filter((id) => !E[id] || E[id].namespace !== 'ooparts'));
  const del = act('items').filter((id) => !w.ITEMS[id]).concat(act('ooparts').filter((id) => oo.indexOf(id) < 0));
  const name = items.filter((id) => E[id] && E[id].name !== w.ITEMS[id].name).map((id) => id + '：ゲーム「' + w.ITEMS[id].name + '」／素材「' + E[id].name + '」')
    .concat((w.OOPARTS || []).filter((o) => E[o.id] && E[o.id].name !== o.name).map((o) => o.id + '：ゲーム「' + o.name + '」／素材「' + E[o.id].name + '」'));
  const reservedInGame = act('reserved').filter((id) => w.ITEMS[id]);
  const cnt = {}; items.forEach((id) => { const it = w.ITEMS[id]; const k = it.cat === 'armor' && it.type === 'acc' ? 'acc' : it.cat; cnt[k] = (cnt[k] || 0) + 1; });
  let catDiff = null; if (cat) { const ci = Object.keys(cat.items); catDiff = { notInGame: ci.filter((id) => !w.ITEMS[id]), notInCatalog: items.filter((id) => !cat.items[id]) }; }
  console.log(JSON.stringify({ mode: two ? '2D' : '3D と同じ読み込み', loadErrors: A.errors.length, items: items.length, ooparts: oo.length, byCat: cnt, matched: items.length + oo.length - add.length, addedIds: add, removedIds: del, nameDiffIds: name, reservedPresentInItems: reservedInGame, catalogDiff: catDiff }, null, 1));
  process.exit(0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
