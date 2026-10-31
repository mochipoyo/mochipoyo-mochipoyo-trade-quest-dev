/* =========================================================
   Data / Phase A（v6.4）：マップの拡張・第1段階（主要な所から）
   ・リヴェル城：2階（会議室・図書室・客室・執務室）、3階（王の私室・展望台・宝物庫）、地下（牢獄・倉庫・秘密通路・古代遺跡）
   ・リヴェル城下町の東に新しい区画「職人通り」（不揃いな家並み・路地・水路と橋・広場と井戸・菜園・庭園、民家3軒、住民、小さな出来事）
   ・忘却の洞窟：2階の行き止まりの奥に隠された「地底湖」（2つのレバーで水門を開ける仕掛け・宝箱・希少な魔物）
   セーブの互換：既存のマップIDと座標は変えない。既存の地図には「階段2マス（城）」「東の門の2マス（城下町）」「洞窟の壁のひび（見た目は岩のまま）」を足しただけ。
   新しい場所は別のマップIDで、出入り口のワープを両方向に置く。旧セーブの主人公・宝箱・NPC の位置はそのまま
   このファイルは towns.js（城下町と城を2倍に拡大する処理）より後に読む → ここで使う座標は拡大後の座標
   ========================================================= */
(function (root) {
  'use strict';
  var M = root.MAP_DEFS; var K = root.TownKit; var add = K.add;
  function D() { return root.State.data; }
  function Grid(W, H, ch) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push(ch); } return {
    set: function (x, y, c) { if (g[y] && g[y][x] !== undefined) g[y][x] = c; return this; },
    rect: function (x, y, w, h, c) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) this.set(xx, yy, c); return this; },
    border: function (c) { for (var x = 0; x < W; x++) { g[0][x] = c; g[H - 1][x] = c; } for (var y = 0; y < H; y++) { g[y][0] = c; g[y][W - 1] = c; } return this; },
    rows: function () { return g.map(function (r) { return r.join(''); }); } }; }
  function setRow(def, x, y, ch) { var r = def.rows[y]; def.rows[y] = r.slice(0, x) + ch + r.slice(x + 1); }
  function flag(k) { return !!(D() && D().flags[k]); }
  root.EXPAND_A = { maps: [], patched: [] };
  function reg(def) { add(def); root.EXPAND_A.maps.push(def.id); return def; }

  /* =========================================================
     リヴェル城（玉座の間 30×28）に階段を2つ：左下（2,24）＝2階へ、右下（27,24）＝地下へ
     ========================================================= */
  var RC = M.rivel_castle;
  if (RC && RC.rows[24][2] === ':' && RC.rows[24][27] === ':') {
    setRow(RC, 2, 24, '<'); setRow(RC, 27, 24, '>');
    RC.warps.push({ x: 2, y: 24, to: 'rivel_castle_2f', tx: 2, ty: 9, name: '2階へ', _scaled: true }, { x: 27, y: 24, to: 'rivel_castle_b1', tx: 26, ty: 2, name: '地下へ', _scaled: true });
    RC.npcs.push({ id: 'castle_steward', x: 3, y: 22, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) {
      await c.say('城の案内係', ['左の階段は2階：会議室・図書室・客室・執務室。さらに上の3階には王の私室と展望台、宝物庫がある。', '右の階段は地下：牢と倉庫だ。地下の奥には古い遺跡の扉があるが、誰も開け方を知らん。']); } });
    root.EXPAND_A.patched.push('rivel_castle');
  }

  /* ---------- 2階（30×20） ---------- */
  var f2 = Grid(30, 20, ':').border('C');
  f2.rect(1, 8, 28, 1, 'C').rect(1, 11, 28, 1, 'C'); f2.set(7, 8, ':').set(22, 8, ':').set(7, 11, ':').set(22, 11, ':');
  f2.rect(14, 1, 2, 7, 'C').rect(14, 12, 2, 7, 'C');
  f2.rect(4, 3, 7, 2, 'T'); f2.set(2, 2, 'I').set(12, 2, 'I');                                   // 会議室：長い机
  f2.rect(16, 1, 13, 1, 'K'); f2.rect(17, 4, 4, 1, 'K').rect(23, 4, 5, 1, 'K'); f2.set(19, 6, 't').set(25, 6, 't');   // 図書室
  f2.set(2, 13, 'E').set(5, 13, 'E').set(2, 17, 'E').set(5, 17, 'E').set(10, 15, 't').set(12, 13, 'q');               // 客室
  f2.rect(19, 14, 5, 1, 'T'); f2.rect(16, 12, 3, 1, 'K'); f2.set(27, 13, 'I').set(27, 17, 'I').set(17, 17, 'z');      // 執務室
  f2.set(1, 9, '>').set(28, 10, '<'); f2.rect(5, 9, 1, 2, 'p').rect(10, 9, 1, 2, 'p').rect(19, 9, 1, 2, 'p').rect(24, 9, 1, 2, 'p');
  reg({ id: 'rivel_castle_2f', name: 'リヴェル城 2階', kind: 'interior', bgm: 'castle', rows: f2.rows(),
    warps: [{ x: 1, y: 9, to: 'rivel_castle', tx: 3, ty: 24, name: '玉座の間へ', _scaled: true }, { x: 28, y: 10, to: 'rivel_castle_3f', tx: 14, ty: 13, name: '3階へ' }],
    chests: [{ id: 'rc2_1', x: 26, y: 17, item: 'ether', qty: 2 }],
    events: [
      { x: 7, y: 0, type: 'inspect', solid: true, text: ['会議室の壁の地図：相場大陸の西半分。港町マリナの横に、誰かが「船の修理費」と書き込んでいる。'] },
      { x: 21, y: 14, type: 'inspect', solid: true, text: ['執務室の机の書類：「クリスタルの欠片の捜索費」「魔物の被害の見舞金」「港の修理」……。どの欄も、収入より支出が多い。'] }
    ],
    npcs: [
      { id: 'rc2_scribe', x: 7, y: 5, sprite: 'scholar', dir: 'up', wander: 0, talk: async function (c) {
        if (flag('shard_returned')) await c.say('書記官', ['欠片が戻ってから、会議の空気が変わりました。「次は船だ」と。', '……予算の数字だけは、変わりませんけれどね。']);
        else await c.say('書記官', ['ここは会議室。毎朝、魔物の被害と、クリスタルの欠片の噂を報告し合います。', '噂の半分は外れです。でも、どの半分かは行ってみないとわからない。']); } },
      { id: 'rc2_librarian', x: 22, y: 2, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('図書係', ['城の図書室へようこそ。本棚を調べれば、どれでも読んでいい。', '読んだ本は旅の記録の「読んだ本」に数えられるよ。']); } },
      { id: 'rc2_envoy', x: 8, y: 16, sprite: 'merchant', dir: 'left', wander: 1, talk: async function (c) {
        if (flag('kalion_reformed')) await c.say('隣国の使者', ['カリオンの税の改革の話は、この城にも届いています。帳簿を公開する……簡単なようで、勇気のいることです。']);
        else await c.say('隣国の使者', ['北のカリオン徴収連邦から来ました。……いえ、税の取り立てではありません。今日は客として。', '連邦の帳簿は、誰にも見せられない形になっているそうです。']); } },
      { id: 'rc2_clerk', x: 21, y: 15, sprite: 'villager_m', dir: 'up', wander: 0, talk: async function (c) {
        await c.say('執務官', ['上の宝物庫の鍵は、王がお持ちだ。クリスタルの欠片を取り戻した者になら、王はきっと扉を開けるだろう。']); } },
      { id: 'rc2_guard', x: 26, y: 9, sprite: 'guard', dir: 'left', wander: 0, talk: async function (c) { await c.say('近衛兵', ['この先の階段は3階。王の私室と展望台、宝物庫だ。私室には入ってもいいが、物には触れるなよ。']); } }
    ] });

  /* ---------- 3階（30×16）：王の私室（西）・展望台（北）・宝物庫（東） ---------- */
  var f3 = Grid(30, 16, ':').border('C');
  f3.rect(1, 4, 28, 1, 'C'); f3.set(14, 4, ':').set(15, 4, ':');                                   // 展望台と室内の境の壁（中央に出入り口）
  f3.rect(1, 1, 28, 3, '_');                                                                       // 展望台の板張りの床
  f3.rect(10, 5, 1, 10, 'C').rect(19, 5, 1, 10, 'C'); f3.set(10, 12, ':').set(19, 12, 'U');        // 私室・宝物庫の壁（宝物庫は扉）
  f3.set(2, 6, 'E').set(5, 6, 'K').set(6, 6, 'K').set(4, 9, 't').set(8, 13, 'I').set(2, 13, 'a');  // 王の私室
  f3.set(21, 6, 'I').set(28, 6, 'I'); f3.rect(13, 7, 4, 1, 'p'); f3.rect(14, 8, 2, 5, 'p');        // 中央の廊下
  f3.set(14, 14, '>');
  reg({ id: 'rivel_castle_3f', name: 'リヴェル城 3階', kind: 'interior', bgm: 'castle', rows: f3.rows(),
    warps: [{ x: 14, y: 14, to: 'rivel_castle_2f', tx: 27, ty: 10, name: '2階へ' }],
    chests: [{ id: 'rc3_1', x: 24, y: 9, item: 'phoenix_feather', qty: 1 }, { id: 'rc3_2', x: 27, y: 9, gold: 1500 }, { id: 'rc3_3', x: 24, y: 13, item: 'hi_potion', qty: 3 }],
    events: [
      { x: 19, y: 12, type: 'gate', solid: true, needFlag: 'shard_returned', doneFlag: 'rivel_treasury_open', tile: 'door_locked', doneTile: 'door', tileFlag: 'rivel_treasury_open', text: ['宝物庫の扉。王家の紋章の錠がかかっている。', '（解放条件：第3章で、リヴェル王にクリスタルの欠片を届ける）'], openText: ['近衛兵「王より、宝物庫を開けよとのお達しだ。欠片を取り戻した礼だそうだ」', '宝物庫の扉が開いた。'] },
      { x: 14, y: 1, type: 'script', solid: true, tile: 'crystal', run: async function () { await root.ExpandA.telescope(); } },
      { x: 5, y: 6, type: 'script', solid: true, run: async function () { await root.ExpandA.kingDiary(); } },
      { x: 6, y: 6, type: 'script', solid: true, run: async function () { await root.ExpandA.kingDiary(); } }
    ],
    npcs: [
      { id: 'rc3_maid', x: 7, y: 10, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('侍女', ['王さまは毎晩、日記をお書きになります。……読んではいけませんよ？', '……本棚の端の一冊です。']); } },
      { id: 'rc3_guard', x: 18, y: 10, sprite: 'guard', dir: 'right', wander: 0, talk: async function (c) { await c.say('宝物庫の番兵', flag('rivel_treasury_open') ? ['宝物庫の品は、王が冒険のために用意されたものだ。役立ててくれ。'] : ['宝物庫は、王のお許しがなければ開けられん。', '欠片を取り戻した者になら、王はお許しになるだろう。']); } },
      { id: 'rc3_astronomer', x: 20, y: 2, sprite: 'scholar', dir: 'left', wander: 0, talk: async function (c) { await c.say('城の天文係', ['展望台の真ん中の水晶は、遠くを見るための望遠鏡だ。調べてごらん。', '晴れた日には、北の山脈の向こうまで見える……と言われている。']); } }
    ] });

  /* ---------- 地下（30×16）：牢獄（西）・倉庫（中央）・秘密通路と古代遺跡（東） ---------- */
  var b1 = Grid(30, 16, '#').border('#');
  b1.rect(1, 1, 28, 3, ':');                                                                       // 上の通路
  b1.rect(1, 5, 9, 9, ':'); b1.rect(1, 9, 9, 1, '#').rect(5, 10, 1, 4, '#'); b1.set(3, 9, 'L').set(7, 9, 'L');   // 牢獄（下の段が牢屋2つ）
  b1.rect(4, 4, 1, 1, ':'); b1.rect(12, 5, 7, 7, ':'); b1.set(15, 4, ':');                         // 倉庫
  b1.set(13, 6, 'z').set(14, 6, 'z').set(17, 6, 'q').set(13, 10, 'q').set(17, 10, 'z').set(16, 8, 'z');
  b1.rect(21, 4, 1, 9, ':'); b1.rect(21, 12, 7, 1, ':');                                           // 秘密通路（細い道）
  b1.rect(23, 6, 6, 5, 'g'); b1.set(26, 11, 'L');                                                  // 古代遺跡（扉の奥）
  b1.set(24, 7, 'X').set(27, 7, 'X').set(25, 9, 'I');
  b1.set(27, 2, '<'); b1.set(1, 2, '<');
  reg({ id: 'rivel_castle_b1', name: 'リヴェル城 地下', kind: 'interior', bgm: 'dungeon', rows: b1.rows(),
    warps: [{ x: 27, y: 2, to: 'rivel_castle', tx: 26, ty: 24, name: '玉座の間へ', _scaled: true }, { x: 1, y: 2, to: 'rivel_artisan', tx: 29, ty: 19, name: '古井戸へ（職人通り）' }],
    chests: [{ id: 'rcb_1', x: 18, y: 11, item: 'healing_salve', qty: 2 }, { id: 'rcb_2', x: 24, y: 9, item: 'elixir', qty: 1 }],
    events: [
      { x: 3, y: 9, type: 'script', solid: true, run: async function (c) { await root.Win.message(['牢の扉。鍵がかかっている。鉄格子の窓から、中の男が話しかけてきた。']); await root.ExpandA.prisonerTalk(c); } },
      { x: 7, y: 9, type: 'inspect', solid: true, text: ['空の牢。壁に、日付を数えた線が刻まれている。'] },
      { x: 26, y: 11, type: 'script', solid: true, doneFlag: 'rc_ruin_open', tile: 'door_locked', doneTile: 'door', tileFlag: 'rc_ruin_open', run: async function () { await root.ExpandA.ruinDoor(); } },
      { x: 21, y: 4, type: 'script', solid: true, doneFlag: 'rcb_secret', tile: 'wall', doneTile: 'floor_stone', tileFlag: 'rcb_secret', run: async function () { await root.ExpandA.secretWall(); } },
      { x: 24, y: 7, type: 'inspect', solid: true, text: ['古い石碑：「均衡は、ひとつの数字では測れない」', '……とても古い文字だ。今の相場大陸の言葉と、少しだけ似ている。'] },
      { x: 27, y: 7, type: 'inspect', solid: true, text: ['古い石碑：「上がるものは下がり、下がるものは上がる。ただし、いつかは誰にもわからない」'] }
    ],
    npcs: [
      { id: 'rcb_jailer', x: 5, y: 6, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say('牢番', ['ここは城の牢だ。今は山賊が一人入っているだけだ。', '奥の通路の先に古い遺跡の扉があるが、王家の記録にも開け方が残っていない。古代の遺物にくわしい者なら、何かわかるかもしれん。']); } },
      { id: 'rcb_prisoner', x: 3, y: 10, sprite: 'villager_m', dir: 'up', wander: 0, talkVia: { x: 3, y: 9 }, talk: async function (c) { await root.ExpandA.prisonerTalk(c); } },   // talkVia：牢の扉（3,9）越しに話す
      { id: 'rcb_keeper', x: 15, y: 9, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('倉庫番', ['城の倉庫だ。非常食と、壊れた鎧と……あとは何に使うのかわからない古い箱だ。', '西の端の梯子は、城下町の古井戸につながっている。昔の抜け道さ。']); } }
    ] });

  /* =========================================================
     リヴェル城下町（64×56）の東の壁に門（62〜63, 20〜21）→ 職人通り
     ========================================================= */
  var RT = M.rivel_town;
  if (RT && RT.rows[20][62] === 'C' && RT.rows[21][62] === 'C') {
    for (var gx = 62; gx <= 63; gx++) { setRow(RT, gx, 20, '='); setRow(RT, gx, 21, '='); }   // 城壁の2マス×2段だけを石だたみに（その内側はもともと石だたみ）
    RT.warps.push({ x: 63, y: 20, to: 'rivel_artisan', tx: 1, ty: 15, name: '職人通りへ', _scaled: true }, { x: 63, y: 21, to: 'rivel_artisan', tx: 1, ty: 16, name: '職人通りへ', _scaled: true });
    RT.npcs.push({ id: 'rivel_gate_e', x: 60, y: 19, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say('東門の門番', ['この先は職人通り。鍛冶屋や機織り、菜園の家が並ぶ下町だ。', '水路の橋が古いから、走って落ちるなよ。']); } });
    root.EXPAND_A.patched.push('rivel_town');
  }

  /* ---------- 職人通り（44×32）：不揃いな家・路地・水路と橋・広場と井戸・菜園・庭園 ---------- */
  var ar = Grid(44, 32, '.').border('C');
  ar.rect(0, 15, 2, 2, 'r');                                                                       // 西の門（城下町へ）
  ar.rect(1, 15, 22, 2, 'r'); ar.rect(22, 6, 2, 20, 'r'); ar.rect(22, 25, 18, 2, 'r');            // 曲がった表通り
  ar.rect(8, 4, 1, 11, 'P'); ar.rect(8, 4, 14, 1, 'P'); ar.rect(30, 8, 1, 17, 'P'); ar.rect(24, 12, 7, 1, 'P');   // 石だたみの路地
  ar.rect(34, 1, 2, 30, '~'); ar.set(34, 13, 'b').set(35, 13, 'b').set(34, 25, 'b').set(35, 25, 'b').set(34, 26, 'b').set(35, 26, 'b');   // 水路と橋
  ar.rect(24, 17, 9, 6, '='); ar.set(28, 19, 'j');                                                 // 広場と古井戸
  ar.rect(37, 3, 6, 8, 'H'); ar.rect(37, 16, 6, 7, 'H'); ar.rect(36, 12, 7, 1, ','); ar.rect(36, 24, 7, 3, ',');   // 菜園（水路の東）
  ar.rect(2, 22, 12, 8, '.'); [[3, 23], [6, 23], [9, 23], [12, 23], [4, 27], [8, 27], [12, 27]].forEach(function (p) { ar.set(p[0], p[1], 'a'); }); [[2, 26], [13, 25], [6, 29]].forEach(function (p) { ar.set(p[0], p[1], '6'); });   // 庭園
  ar.rect(2, 2, 5, 4, 'B'); ar.rect(10, 6, 7, 4, 'B'); ar.rect(2, 9, 4, 4, 'B'); ar.rect(13, 18, 6, 4, 'B'); ar.rect(25, 3, 7, 5, 'B'); ar.rect(16, 27, 5, 3, 'B'); ar.rect(26, 27, 6, 3, 'B');   // 家と工房（大きさも向きも揃えない）
  [[20, 14], [25, 14], [21, 24], [32, 16], [9, 17], [17, 4]].forEach(function (p) { ar.set(p[0], p[1], 'y'); });
  [[26, 21], [31, 21], [7, 20]].forEach(function (p) { ar.set(p[0], p[1], 'e'); }); [[19, 8], [11, 12], [27, 9], [32, 29]].forEach(function (p) { ar.set(p[0], p[1], 'q'); }); [[12, 5], [18, 12]].forEach(function (p) { ar.set(p[0], p[1], 'z'); });
  reg({ id: 'rivel_artisan', name: 'リヴェル城下・職人通り', kind: 'town', bgm: 'town', fallback: 'grass', style: 'wood', rows: ar.rows(),
    buildings: [
      { id: 'ra_smith', type: 'house', name: '鍛冶屋の工房', x: 25, y: 3, w: 7, h: 5, doorX: 3, interior: 'rivel_artisan_smith', entry: { x: 5, y: 7 } },
      { id: 'ra_weaver', type: 'house', name: '機織りの家', x: 10, y: 6, w: 7, h: 4, doorX: 2, interior: 'rivel_artisan_weaver', entry: { x: 5, y: 7 } },
      { id: 'ra_herbal', type: 'house', name: '薬草師の家', x: 13, y: 18, w: 6, h: 4, doorX: 2, interior: 'rivel_artisan_herbal', entry: { x: 5, y: 7 } },
      { id: 'ra_h1', type: 'house', name: '民家', x: 2, y: 2, w: 5, h: 4, doorX: 2 },
      { id: 'ra_h2', type: 'house', name: '民家', x: 2, y: 9, w: 4, h: 4, doorX: 1 },
      { id: 'ra_h3', type: 'house', name: '民家', x: 16, y: 27, w: 5, h: 3, doorX: 2 },
      { id: 'ra_h4', type: 'warehouse', name: '倉庫', x: 26, y: 27, w: 6, h: 3, doorX: 2 }
    ],
    warps: [{ x: 0, y: 15, to: 'rivel_town', tx: 62, ty: 20, name: '城下町へ', _scaled: true }, { x: 0, y: 16, to: 'rivel_town', tx: 62, ty: 21, name: '城下町へ', _scaled: true }],
    chests: [{ id: 'ra1', x: 42, y: 30, item: 'potion', qty: 3 }, { id: 'ra2', x: 2, y: 30, gold: 250 }],
    events: [
      { x: 28, y: 19, type: 'script', solid: true, run: async function () { await root.ExpandA.oldWell(); } },
      { x: 24, y: 15, type: 'inspect', solid: false, text: ['案内板：「職人通り——北：鍛冶屋の工房・機織りの家　南西：庭園　東：水路の向こうに菜園　広場の古井戸は立ち入り禁止」'] },
      { x: 37, y: 13, type: 'script', solid: true, tile: 'crops', run: async function () { await root.ExpandA.lostCat(); } }
    ],
    npcs: [
      { id: 'ra_kid', x: 26, y: 20, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('職人通りの子ども', ['ねえ、うちの猫のミケを見なかった？　菜園のほうへ走っていったの。', '……古井戸？　あそこは大人が「入っちゃだめ」って言うの。']); } },
      { id: 'ra_farmer', x: 39, y: 14, sprite: 'villager_m', dir: 'left', wander: 1, talk: async function (c) { await c.say('菜園の農夫', ['水路の水で野菜を育ててる。今年は豊作……と言いたいが、天気だけは読めん。', '読めないものは、植える量を分けておくのさ。全部を一つの畑に賭けない。']); } },
      { id: 'ra_gardener', x: 8, y: 25, sprite: 'elder', dir: 'down', wander: 1, talk: async function (c) { await c.say('庭師の老人', ['この庭は、昔の王妃さまが好きだった花を植えている。', '花は毎日見ても伸びないが、ひと月たつと驚くほど伸びている。……焦らんことだ。']); } },
      { id: 'ra_bridge', x: 33, y: 14, sprite: 'villager_f', dir: 'right', wander: 0, talk: async function (c) { await c.say('橋のたもとの女', ['この橋は祖父の代からあるの。直す話は毎年出るけど、予算はいつも「来年」。', 'お城の執務室の机の上に、書類が積んであるらしいわよ。']); } },
      { id: 'ra_apprentice', x: 23, y: 9, sprite: 'villager_m', dir: 'right', wander: 0, talk: async function (c) { await c.say('鍛冶の見習い', ['親方は「火を見ろ、焦るな」としか言わない。……三年目で、やっと意味がわかってきた。']); } },
      { id: 'ra_alley', x: 8, y: 10, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('路地の住人', ['この路地は、表通りより近道なの。地図には載ってないけどね。']); } }
    ] });

  /* ---------- 職人通りの家（3軒）：家具・本棚・住民・調べる所 ---------- */
  var sm = Grid(12, 9, '_').border('#'); sm.set(1, 1, 'i').set(10, 1, 'i'); sm.rect(2, 2, 3, 1, 'T'); sm.set(8, 2, 'z').set(9, 2, 'z').set(9, 5, 'q').set(2, 5, 'K'); sm.set(5, 8, 'D');
  reg({ id: 'rivel_artisan_smith', name: '鍛冶屋の工房', kind: 'interior', bgm: 'town', rows: sm.rows(), warps: [{ x: 5, y: 8, to: 'rivel_artisan', tx: 28, ty: 8 }],
    events: [{ x: 3, y: 2, type: 'inspect', solid: true, text: ['炉の火が赤々と燃えている。打ちかけの剣の刃に、細かい目盛りが刻まれている。'] }],
    npcs: [{ id: 'ra_smith_master', x: 6, y: 3, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) {
      if (!flag('ra_smith_talked')) { c.setFlag('ra_smith_talked', true); await c.say('鍛冶の親方', ['刃物はな、鋼を何度も熱して叩いて、少しずつ形にする。一度に叩いても割れるだけだ。', 'ほら、見習いが打った青銅のナイフだ。刃はまっすぐだ、持っていけ。']); c.give('bronze_dagger', 1); await c.msg(['青銅のナイフを手に入れた！']); }
      else await c.say('鍛冶の親方', ['城の宝物庫の剣も、うちの先祖が打ったと言われている。……本当かどうかは知らんがな。']); } }] });
  var wv = Grid(12, 9, '_').border('#'); wv.set(2, 2, 't').set(3, 2, 't').set(9, 1, 'K').set(10, 1, 'K').set(1, 6, 'E').set(9, 6, 'a'); wv.set(5, 8, 'D');
  reg({ id: 'rivel_artisan_weaver', name: '機織りの家', kind: 'interior', bgm: 'town', rows: wv.rows(), warps: [{ x: 5, y: 8, to: 'rivel_artisan', tx: 12, ty: 10 }],
    events: [{ x: 2, y: 2, type: 'inspect', solid: true, text: ['機織り機。縦糸と横糸が、規則正しく交わっている。一本でも飛ばすと、布全体がゆがむらしい。'] }],
    npcs: [{ id: 'ra_weaver', x: 5, y: 4, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('機織りの女', ['一日に織れるのは、手のひらひとつ分。それでも、ひと冬で一枚のマントになるのよ。', '本棚の本？　亡くなった夫のもの。読んでいいわよ。']); } },
      { id: 'ra_weaver_cat', x: 9, y: 4, sprite: 'child', dir: 'left', wander: 1, talk: async function (c) { await c.say('機織りの家の子', ['お母さんの布、市場で一番高く売れるんだよ。……時間がかかるからだって。']); } }] });
  var hb = Grid(12, 9, '_').border('#'); hb.rect(1, 1, 4, 1, 'K'); hb.set(8, 2, 't').set(9, 2, 'q').set(2, 5, 'a').set(3, 5, 'a').set(9, 6, 'E'); hb.set(5, 8, 'D');
  reg({ id: 'rivel_artisan_herbal', name: '薬草師の家', kind: 'interior', bgm: 'town', rows: hb.rows(), warps: [{ x: 5, y: 8, to: 'rivel_artisan', tx: 15, ty: 22 }],
    events: [{ x: 8, y: 2, type: 'inspect', solid: true, text: ['机の上の帳面：「薬草の効き目は人によって違う。同じ量を毎日ためし、記録すること」'] }],
    npcs: [{ id: 'ra_herbalist', x: 6, y: 3, sprite: 'priest', dir: 'down', wander: 0, talk: async function (c) {
      if (!flag('ra_herb_gift')) { c.setFlag('ra_herb_gift', true); await c.say('薬草師', ['旅の人ね。薬草は、効くと思って一度にたくさん飲んでも、早く治るわけじゃないの。', '少しずつ、決めた量を。……はい、これは試しに作った軟膏。']); c.give('healing_salve', 1); await c.msg(['治癒膏を手に入れた！']); }
      else await c.say('薬草師', ['菜園の農夫さんの野菜で、薬草のスープを作っているの。体が温まるわよ。']); } }] });

  /* =========================================================
     忘却の洞窟 2階の東の行き止まり（27,5）の奥（27,6）の壁に「ひび」→ 地底湖
     ========================================================= */
  var OC = M.oblivion_cave_2;
  if (OC && OC.rows[6][27] === 'G' && (OC.rows[5][27] === 'u' || OC.rows[5][27] === 'g')) {
    OC.events.push({ x: 27, y: 6, type: 'script', solid: true, doneFlag: 'ocl_found', tile: 'cave_wall', doneTile: 'cave_floor', tileFlag: 'ocl_found', run: async function () { await root.ExpandA.caveCrack(); } });
    OC.warps.push({ x: 27, y: 6, to: 'oblivion_cave_lake', tx: 2, ty: 8, needFlag: 'ocl_found', hidden: true, name: '地底湖へ' });   // ひびを広げた後だけ通れる（それまでは岩の壁）
    OC.events.push({ x: 27, y: 4, type: 'inspect', solid: false, text: ['足もとの水たまりが、かすかに揺れている。……奥の壁のほうから、水の音がする。'] });
    root.EXPAND_A.patched.push('oblivion_cave_2');
  }
  // 地底湖（30×18）：中央の湖。2つのレバーを倒すと水門（柵）が開いて、奥の宝の部屋へ
  var lk = Grid(30, 18, 'G'); lk.rect(1, 1, 28, 16, 'g');
  lk.rect(8, 5, 14, 8, '~'); lk.rect(7, 6, 1, 6, 'w').rect(22, 6, 1, 6, 'w');                      // 湖と浅瀬
  lk.rect(14, 4, 2, 1, 'b').rect(14, 13, 2, 1, 'b');
  lk.rect(23, 1, 6, 4, 'G'); lk.rect(24, 1, 4, 3, 'g'); lk.set(25, 4, 'g');                       // 奥の宝の部屋（入口 25,4）
  [[3, 3], [5, 14], [12, 2], [19, 15], [26, 9], [2, 9]].forEach(function (p) { lk.set(p[0], p[1], 'Y'); }); [[4, 6], [25, 13], [17, 2]].forEach(function (p) { lk.set(p[0], p[1], 'k'); });
  lk.set(1, 8, '<');
  reg({ id: 'oblivion_cave_lake', name: '忘却の洞窟・地底湖', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: lk.rows(),
    warps: [{ x: 1, y: 8, to: 'oblivion_cave_2', tx: 27, ty: 5, name: '洞窟2階へ' }],
    chests: [{ id: 'ocl_1', x: 24, y: 1, item: 'phoenix_feather', qty: 1 }, { id: 'ocl_2', x: 27, y: 1, item: 'pinbar_dagger', qty: 1 }, { id: 'ocl_3', x: 3, y: 15, item: 'ether', qty: 2 }],
    events: [
      { x: 2, y: 2, type: 'script', solid: true, tile: 'lever', doneTile: 'lever', tileFlag: 'ocl_lever_w', run: async function () { await root.ExpandA.lakeLever('w'); } },
      { x: 27, y: 15, type: 'script', solid: true, tile: 'lever', doneTile: 'lever', tileFlag: 'ocl_lever_e', run: async function () { await root.ExpandA.lakeLever('e'); } },
      { x: 25, y: 4, type: 'gate', solid: true, needFlag: 'ocl_levers', doneFlag: 'ocl_gate_open', text: ['水門の柵。びくともしない。', '湖の西と東に、古いレバーが一つずつある。'], openText: ['水門の柵が、ゆっくりと上がっていく……'] },
      { x: 14, y: 14, type: 'inspect', solid: false, text: ['湖の水は驚くほど澄んでいる。底に、砕けたクリスタルのような光が沈んで見える。'] }
    ],
    encounters: { rate: 0.045, zones: [{ name: '忘却の洞窟・地底湖', test: function () { return true; }, groups: [['ghost', 'bat'], ['lizard', 'lizard'], ['imp'], ['mole', 'mole', 'bat'], ['ghost', 'ghost'], ['floating_eye'], ['ore_slime', 'cave_crab'], ['skeleton']], rare: [['slime_metal']], rareRate: 0.04, level: 6 }] } });

  /* ---------- 探索ポイント（手で置いたもの：通路をふさがない光る場所と壺） ---------- */
  root.SEARCH_POINTS = (root.SEARCH_POINTS || []).concat([
    { id: 'sp_rivel_artisan_42_1', map: 'rivel_artisan', x: 42, y: 1, kind: 'sparkle', loot: { item: 'green_tea', qty: 1 }, respawn: 'inn' },
    { id: 'sp_rivel_artisan_3_29', map: 'rivel_artisan', x: 3, y: 29, kind: 'sparkle', loot: { gold: 120 } },
    { id: 'sp_rivel_castle_b1_18_5', map: 'rivel_castle_b1', x: 18, y: 5, kind: 'pot', loot: { item: 'onigiri', qty: 2 } },
    { id: 'sp_oblivion_cave_lake_27_16', map: 'oblivion_cave_lake', x: 27, y: 16, kind: 'sparkle', loot: { item: 'ether', qty: 1 } }
  ]);

  /* ---------- 出来事（話す・調べる） ---------- */
  var EA = root.ExpandA = {};
  EA.telescope = async function () {
    var lines = ['望遠鏡をのぞいた。', '北にはエマール山脈。東にはダウの大森林が広がっている。南西のずっと先に、港町マリナの方角の空が明るく見える。'];
    try { var nv = root.Nav && root.Nav.compute ? root.Nav.compute(true) : null; if (nv && nv.text && !nv.none) lines.push('（次の目的：' + nv.text + '）'); } catch (e) { }
    if (!flag('rc_telescope')) { D().flags.rc_telescope = true; lines.push('展望台の床に、誰かが落とした硬貨が光っている。'); D().gold += 100; lines.push('100Gを拾った。'); }
    await root.Win.message(lines);
  };
  EA.kingDiary = async function () {
    var l = ['王の日記。……侍女の言ったとおり、本棚の端にある。'];
    if (flag('shard_returned')) l.push('「欠片がひとつ戻った。先はまだ長い。残りを数えて焦るのはやめよう。ひとつずつ、確かめるのだ」');
    else if (flag('king_quest1')) l.push('「波を読む者が来た。若い。だが、わからないことを『わからない』と言える目をしている」');
    else l.push('「今日も魔物の報告。均衡のクリスタルが砕けてから、魔物は人の欲望と恐怖を喰らって強くなっている」');
    await root.Win.message(l);
  };
  EA.ruinDoor = async function () {
    var d = D(); var n = root.Ooparts && root.Ooparts.count ? root.Ooparts.count() : 0;
    if (d.flags.rc_ruin_open) { await root.Win.message(['古代遺跡の扉は開いている。']); return; }
    if (n >= 5) { d.flags.rc_ruin_open = true; World().applyState(World().map); await root.Win.message(['集めた古代の遺物が、扉の模様に呼応して光った……', '古代遺跡の扉が開いた！（オーパーツ ' + n + '個）']); return; }
    await root.Win.message(['古代遺跡の扉。表面に、各地で見つかる古代の遺物と同じ模様が刻まれている。', '（解放条件：オーパーツを5つ集める。いま ' + n + '個。オーパーツは各地の光る場所や壺で見つかる）']);
  };
  function World() { return root.World; }
  EA.secretWall = async function () {
    var d = D(); if (d.flags.rcb_secret) return;
    await root.Win.message(['壁の石のひとつだけ、色が新しい。押してみると、奥へずれた……']);
    d.flags.rcb_secret = true; World().applyState(World().map);
    await root.Win.message(['細い通路が現れた。奥から、冷たい空気が流れてくる。']);
  };
  EA.oldWell = async function () {
    var c = await root.Win.choice('古井戸。底に梯子がかかっている。降りる？', ['降りる', 'やめる']);
    if (c !== 0) return;
    if (!flag('ra_well_found')) { D().flags.ra_well_found = true; await root.Win.message(['梯子を降りると、石の通路が続いていた。……城の地下につながる抜け道だ。']); }
    World().enterMap('rivel_castle_b1', 2, 2, 'right');
  };
  EA.lostCat = async function () {
    var d = D();
    if (d.flags.ra_cat_found) { await root.Win.message(['菜園の土に、小さな足あとが残っている。']); return; }
    d.flags.ra_cat_found = true; root.State.addItem('herb_soup', 2);
    await root.Win.message(['菜園の畝のあいだで、三毛猫が丸くなっている。……職人通りの子どもが探していたミケだ。', '猫を抱えて連れて帰ると、子どもの親から薬草スープをもらった。（薬草スープ×2）']);
  };
  EA.caveCrack = async function () {
    var d = D();
    if (!d.flags.ocl_found) { await root.Win.message(['岩の壁に、細いひびが入っている。ひびの奥から、冷たい風と水の音……']); var c = await root.Win.choice('ひびを押し広げて、奥へ進む？', ['進む', 'やめる']); if (c !== 0) return; d.flags.ocl_found = true; World().applyState(World().map); }
    World().enterMap('oblivion_cave_lake', 2, 8, 'right');
  };
  EA.prisonerTalk = async function (c) {
    if (flag('bandit_boss')) await c.say('捕まった山賊', ['……頭目のガロンが負けたって？　嘘だろ。', 'あの人は「勝ってる間はやめるな、負けてる間もやめるな」が口ぐせだった。……やめどきを知らない人だったんだ。']);
    else await c.say('捕まった山賊', ['俺はガロンの手下だった。山の上の隠れ家で、取ったものを全部次の賭けに回してた。', '一度も「取り分を残す」って考えがなかったんだ。……だから、ここにいる。']);
  };
  EA.lakeLever = async function (side) {
    var d = D(); var key = 'ocl_lever_' + side;
    if (d.flags[key]) { await root.Win.message(['レバーはもう倒してある。']); return; }
    d.flags[key] = true; if (d.flags.ocl_lever_w && d.flags.ocl_lever_e) d.flags.ocl_levers = true;
    World().applyState(World().map);
    await root.Win.message(['古いレバーを倒した。湖のどこかで、歯車の回る音がした。', d.flags.ocl_levers ? '……2つ目だ。奥の水門の柵が動ける状態になった。水門を調べてみよう。' : '（もう1つ、反対側にもレバーがある）']);
  };
})(typeof window !== 'undefined' ? window : globalThis);
