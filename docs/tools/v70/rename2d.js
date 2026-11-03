// v7.0 名前の変更：波形トレーダーズギルド／仲間「謎のタイムトラベラーM」（2D・jsdom）。旧セーブの名前の置きかえ
const load = require('../rpgload.js'); const { w } = load(); const State = w.State, World = w.World;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const LOG = []; w.Win.message = (lines, o) => { (Array.isArray(lines) ? lines : [lines]).forEach((l) => LOG.push(((o && o.name) ? o.name + '「' : '') + l)); return Promise.resolve(); };
w.Win.choice = () => Promise.resolve(0); w.Win.toast = () => {}; World.encounter = function () {};
const fs = require('fs'); const all = ['js/data/story3121.js', 'js/data/story3121-world.js', 'js/data/companions68.js', 'js/data/sky.js'].map((f) => fs.readFileSync((process.env.RPG_DIR || '/home/claude/mochipoyo-trade-quest/') + f, 'utf8')).join('\n');
ok(!/トレーダーズビルド/.test(all) && /波形トレーダーズギルド/.test(all), '「波形トレーダーズビルド」が残っていない・「波形トレーダーズギルド」になっている');
ok(w.COMPANIONS.mochipoyo.name === '謎のタイムトラベラーM', '仲間の表示名：謎のタイムトラベラーM（ID は mochipoyo のまま）');
ok(/謎のタイムトラベラーM/.test(w.ITEMS.porkbits_don.desc) && /謎のタイムトラベラーM/.test(w.JOBS.loop_trader.trait), '丼の説明・職業の特徴の名前');
State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start();
// 加入
d.tradia = d.tradia || {}; d.tradia.wins = {}; (w.TRADER_IDS || []).slice(0, 7).forEach((k) => { d.tradia.wins[k] = 1; }); State.addItem('porkbits_don', 3);
World.enterMap('tradia_tavern', 10, 7, 'right');
(async () => {
  const n = World.map.npcs.find((x) => x.id === 'mochipoyo'); World.busy = false; World.talk(n); for (let i = 0; i < 2000 && World.busy; i++) await new Promise((r) => setTimeout(r, 3));
  ok(d.companions.mochipoyo && d.companions.mochipoyo.name === '謎のタイムトラベラーM', '加入した仲間の名前：謎のタイムトラベラーM');
  ok(LOG.some((l) => /^謎のタイムトラベラーM「/.test(l)) && !LOG.some((l) => /^もちぽよ「/.test(l)) && LOG.some((l) => /謎のタイムトラベラーMが仲間になった/.test(l)), '会話の話し手・加入の文：謎のタイムトラベラーM');
  // 旧セーブ（名前が「もちぽよ」のまま）→ 読み込むと置きかわる。ほかの項目は同じ
  const old = JSON.parse(JSON.stringify(d)); old.companions.mochipoyo.name = 'もちぽよ'; const lv = old.companions.mochipoyo.level, sk = old.companions.mochipoyo.skills.join(',');
  const m = State.migrate(JSON.parse(JSON.stringify(old)));
  ok(m.companions.mochipoyo.name === '謎のタイムトラベラーM' && m.companions.mochipoyo.level === lv && m.companions.mochipoyo.skills.join(',') === sk && m.flags.mochipoyo_joined, '旧セーブ：名前だけ置きかわる（レベル・技・フラグはそのまま）');
  const mine = JSON.parse(JSON.stringify(old)); mine.companions.mochipoyo.name = 'ぽよ太'; ok(State.migrate(mine).companions.mochipoyo.name === 'ぽよ太', '名前を自分で変えていた場合はそのまま');
  const none = JSON.parse(JSON.stringify(old)); delete none.companions.mochipoyo; ok(!State.migrate(none).companions.mochipoyo, '加入していないセーブは変わらない');
  console.log('結果：' + pass + ' OK / ' + fail + ' NG');
})();
