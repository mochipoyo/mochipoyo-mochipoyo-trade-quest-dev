// 装備の外見の表を作るための材料：起動したあとの ITEMS（武器・防具）を JSON に書き出す（jsdom。ゲームのデータは読むだけ）
//   node tools/appear/dump_items.js <出力.json>
const path = require('path'); const fs = require('fs'); const load = require(path.resolve(__dirname, '../../docs/tools/v78/load78.js'));
const A = load({ earth: false, join: false }); const w = A.w;
(async () => {
  try { w.Engine.Input.init(); } catch (e) { } if (w.MochiQuest && w.MochiQuest.boot) w.MochiQuest.boot(); await new Promise((r) => setTimeout(r, 300));
  const out = {};
  for (const [id, it] of Object.entries(w.ITEMS)) { if (it.cat !== 'weapon' && it.cat !== 'armor') continue; out[id] = { name: it.name, cat: it.cat, type: it.type, boss: !!it.bossExclusive, uniqueName: it.uniqueName || null }; }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log('items', Object.keys(out).length, 'loadErrors', A.errors.length); process.exit(0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
