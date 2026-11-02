// v6.8 船に乗っているときの戦闘背景：船の甲板の画像（16_battle_ship_deck.webp）
const fs = require('fs'); const load = require('./rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World, BG = w.BattleBG65;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
State.newGame('t', 'warrior'); const d = State.data; World.enterMap('world', 19, 72, 'down');
const info = (zone) => BG.infoFor({ enemies: [] }, { zone: zone });
d.aboard = 'sailboat'; let i = info('沿岸の海'); ok(i.place === 'sea' && i.variant === 'ship_deck' && BG.photoKey(i) === 'ship_deck', '小型帆船に乗っているとき：甲板の画像（' + JSON.stringify([i.place, i.variant, BG.photoKey(i)]) + '）');
d.aboard = 'galleon'; i = info('外洋'); ok(BG.photoKey(i) === 'ship_deck', '遠洋航海船に乗っているとき：甲板の画像');
d.aboard = 'airship'; i = info(''); ok(BG.photoKey(i) !== 'ship_deck', '飛空艇（空を飛ぶ乗り物）は甲板の画像にしない（' + BG.photoKey(i) + '）');
d.aboard = null; i = info(''); ok(BG.photoKey(i) !== 'ship_deck', '船に乗っていないとき（フィールド）は従来どおり（' + BG.photoKey(i) + '）');
const sea = Object.keys(w.MAP_DEFS).filter((id) => /海底|沈没|礁/.test(w.MAP_DEFS[id].name || '')).slice(0, 3);
for (const id of sea) { World.enterMap(id, 2, 2, 'down'); i = info(''); ok(i.place === 'sea' && BG.photoKey(i) === 'sea', '海の中・沈没船などのダンジョン（' + id + '）は従来の海の画像のまま'); }
const p = '/home/claude/mochipoyo-trade-quest/' + BG.PHOTO_DIR + BG.PHOTO_VARIANT.ship_deck; const b = fs.readFileSync(p);
ok(b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' && /16_battle_ship_deck\.webp$/.test(BG.photoUrl('ship_deck')), '画像のファイル（WebP）と URL');
const man = JSON.parse(fs.readFileSync('/home/claude/mochipoyo-trade-quest/docs/battle-backgrounds-manifest.json', 'utf8')); ok(man.optionalVariants.ship_deck && man.optionalVariants.ship_deck.path === 'assets/battle-backgrounds/16_battle_ship_deck.webp', '戦闘背景の一覧（docs/battle-backgrounds-manifest.json）に登録');
ok(errors.length === 0, 'エラーなし ' + errors.slice(0, 2).join('|'));
console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
