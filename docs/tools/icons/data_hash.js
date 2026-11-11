// 起動したあとのゲームのデータ（ITEMS・OOPARTS・店の品ぞろえ・ボス固有装備の表など）のハッシュ。参照コミットと比べて、絵の追加でデータが変わっていないかを見る
//   RPG_DIR=<取り出した場所>/ node docs/tools/icons/data_hash.js [2d]
const path = require('path'); const crypto = require('crypto'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const two = process.argv.includes('2d'); const A = load(Object.assign(two ? { earth: false, join: false } : {}, process.env.RPG_DIR ? { dir: process.env.RPG_DIR } : {})); const w = A.w;
(async () => {
  try { w.Engine.Input.init(); } catch (e) { } if (w.MochiQuest && w.MochiQuest.boot) w.MochiQuest.boot(); await new Promise((r) => setTimeout(r, 300));
  const h = (o) => crypto.createHash('sha256').update(JSON.stringify(o, (k, v) => typeof v === 'function' ? 'fn:' + String(v).length : v)).digest('hex').slice(0, 16);
  const out = { loadErrors: A.errors.length, ITEMS: h(w.ITEMS), itemCount: Object.keys(w.ITEMS).length, OOPARTS: h(w.OOPARTS), SHOP_ADD: h(w.SHOP_ADD || null), SHOP_EXTRAS: h(w.SHOP_EXTRAS || null), ENEMIES: h(w.ENEMIES), QUESTS: h(w.QUESTS), RECIPES: h(w.RECIPES || w.FORGE_RECIPES || null), REWARDS: h(w.Ooparts && w.Ooparts.REWARDS) };
  console.log(JSON.stringify(out)); process.exit(0);
})();
