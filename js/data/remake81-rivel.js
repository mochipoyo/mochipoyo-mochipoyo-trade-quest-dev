/* =========================================================
   Data / v8.1 リヴェル城下町（rivel_town）とリヴェル城（rivel_castle）：城壁に意味がある町
   ・住む理由：堀に囲まれた城の島。城を守る内郭（城の前庭：騎士の詰所・見張りの塔・厩・波形聖堂）と、その外の町を外の城壁が囲む
   ・入口から最初に見える物：南の楼門をくぐると、まっすぐ北へ王道。その先の内門の両わきの紋章、さらに奥の堀と跳ね橋、城の正面の紋章と垂れ幕
   ・道：王道（門→内門→城の前庭→跳ね橋→城）は町の真ん中をまっすぐ。商店通りは門から少し入った所で西へ分かれ、北へ折れて城壁沿いまで
     東は職人通りへの小路（冒険者ギルド・銀行の横から東門へ。東門の先が職人通り）。小路の途中から北の通用門で城の前庭へ入れる（脇道）
   ・境界：外の城壁（防御型）。出入りは南の楼門と東門。内郭の壁は内門と通用門だけ（城の島へは跳ね橋だけ）
   ・増築地区（旧・東の新市街）の建物は、騎士の家・詰所・見張りの塔を城の前庭へ、店は商店通り、アトリエ・学者の家は小路へ移した
   ・建物の id・中の地図・人・出来事はそのまま（位置だけ）。座標は js/rpg/remake81.js が旧座標から写す
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 72, H = 60, RX = 34;   // RX：王道の西の端（34〜37 の 4 マス）
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'C'); C.frame(1, 1, W - 2, H - 2, 'C');   // 外の城壁（2 重）
    C.rect(RX, H - 2, 4, 2, 'P');   // 南の楼門
    C.rect(W - 2, 39, 2, 3, 'r');   // 東門（職人通りへ）
    /* ---------- 城の島・堀・跳ね橋 ---------- */
    C.rect(22, 2, 28, 14, '~'); C.rect(24, 2, 24, 12, '='); C.rect(RX, 14, 4, 2, 'b');
    /* ---------- 内郭の壁（内門・通用門） ---------- */
    C.rect(2, 26, W - 4, 1, 'C'); C.rect(RX, 26, 4, 1, 'P'); C.rect(59, 26, 3, 1, 'r');
    /* ---------- 王道（門 → 内門 → 前庭 → 跳ね橋） ---------- */
    C.rect(RX, 16, 4, 10, 'P'); C.rect(RX, 27, 4, H - 29, 'P');
    for (var y = 17; y < H - 3; y += 4) { if (y === 25 || y === 26 || y === 27) continue; C.set(RX - 1, y, 'y'); C.set(RX + 4, y, 'y'); }
    C.rect(30, 53, 12, 5, 'P');   // 門の内側の広場
    /* ---------- 城の前庭（内郭） ---------- */
    // 西：騎士の区画（騎士の家・詰所・稽古場・厩・見張りの塔）
    C.rect(11, 11, 10, 4, ','); [12, 15, 18].forEach(function (x) { C.set(x, 11, '&'); });
    C.frame(3, 11, 7, 5, 'x'); C.rect(4, 12, 5, 3, ','); C.set(6, 15, ','); C.set(4, 12, 'z'); C.set(8, 12, 'q');
    C.set(11, 18, 'y'); C.set(19, 18, 'y'); C.set(15, 21, 'j'); C.set(12, 23, '6'); C.set(19, 23, '6');
    // 東：波形聖堂への道と庭（通用門から北へ）
    C.rect(59, 8, 3, 18, 'r'); C.blob(53, 12, [[0, 0], [1, 0], [0, 1], [1, 1]], 'a'); C.blob(65, 12, [[0, 0], [1, 0], [0, 1], [1, 1]], 'a');
    [[52, 18], [55, 22], [66, 17], [68, 22], [53, 9], [68, 9]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    C.set(64, 20, 'e'); C.set(56, 20, 'e');
    // 前庭の広場：王道の両わきに花壇
    [[29, 18], [41, 18], [29, 23], [41, 23]].forEach(function (p) { C.blob(p[0], p[1], [[0, 0], [1, 0]], 'a'); });
    /* ---------- 西：商店通り（門の少し北で西へ → 北へ折れて城壁沿いまで） ---------- */
    C.rect(9, 50, RX - 9, 2, 'r'); C.rect(9, 27, 3, 25, 'r'); C.rect(2, 27, 32, 1, '=');
    // 教会の前の小さな広場（王道に面する）・墓地の庭
    C.rect(22, 37, 12, 2, 'P'); C.rect(22, 39, 11, 5, ','); [[23, 40], [26, 42], [31, 40]].forEach(function (p) { C.set(p[0], p[1], 'a'); }); C.set(29, 42, '6'); C.set(24, 42, 'e');
    // 通りの南の市（露店・ベンチ）と西の角の井戸
    C.set(20, 55, 'e'); C.set(22, 55, 'e'); C.set(26, 54, 'a'); C.set(27, 54, 'a'); C.set(11, 56, '6'); C.set(29, 56, '6');
    C.rect(2, 49, 7, 9, ','); C.set(4, 52, 'j'); C.set(2, 56, '6'); C.set(7, 50, '6');
    /* ---------- 東：職人通りへの小路（王道 → 東門）と通用門への道 ---------- */
    C.rect(38, 39, W - 38, 3, 'r'); C.rect(59, 27, 3, 12, 'r'); C.rect(38, 48, W - 40, 2, 'r');
    // 鍛冶の作業場（炉・道具かけ・木箱・樽）
    C.set(65, 35, '('); C.set(67, 34, ')'); C.set(68, 34, ')'); C.set(63, 37, 'z'); C.set(64, 37, 'q'); C.set(68, 37, 'z');
    // アトリエの前の小さな中庭
    C.rect(52, 28, 6, 4, ','); C.set(53, 29, 'a'); C.set(56, 30, '6');
    // 朝市の露店（南東）と木
    [57, 60, 63, 66].forEach(function (x) { C.set(x, 45, 'A'); }); C.set(58, 52, '6'); C.set(65, 54, '6'); C.set(61, 55, 'j'); C.set(68, 51, 'e');
    return C;
  }
  R.define('rivel_town', {
    version: 1, rows: rows, arrive: [35, 56],
    buildings: {
      castle: { x: 26, y: 3, w: 20, h: 10, doorX: 9 },
      // 城の前庭（西の騎士の区画・東の聖堂）
      x72_house: { x: 3, y: 3, w: 7, h: 5, doorX: 3 }, x72_hall: { x: 12, y: 3, w: 8, h: 5, doorX: 3 }, x72_tower: { x: 3, y: 18, w: 6, h: 6, doorX: 2 },
      rv_wave_temple: { x: 57, y: 4, w: 8, h: 4, doorX: 4 },
      // 商店通り（西）
      x72_ex0: { x: 2, y: 29, w: 7, h: 5, doorSide: 'right', doorY: 2 }, x72_ex1: { x: 2, y: 36, w: 7, h: 5, doorSide: 'right', doorY: 2 }, x72_ex3: { x: 2, y: 43, w: 7, h: 5, doorSide: 'right', doorY: 2 },
      armor: { x: 12, y: 29, w: 10, h: 6, doorSide: 'left', doorY: 3 }, x72_ex2: { x: 12, y: 37, w: 7, h: 5, doorSide: 'left', doorY: 2 },
      item: { x: 12, y: 44, w: 10, h: 6, doorX: 4 }, weapon: { x: 22, y: 44, w: 11, h: 6, doorX: 5 },
      church: { x: 22, y: 29, w: 11, h: 8, doorX: 5 },
      bread_stall76: { x: 14, y: 53, w: 3, h: 2, doorX: 1 },
      // 王道の東（ギルド・銀行）・小路（アトリエ・学者の家）・南東（酒場・宿屋）
      guild: { x: 40, y: 27, w: 12, h: 6, doorSide: 'left', doorY: 3 }, bank: { x: 40, y: 33, w: 12, h: 6, doorX: 5 },
      x72_ex4: { x: 52, y: 33, w: 7, h: 5, doorSide: 'right', doorY: 2 }, x72_ex5: { x: 63, y: 28, w: 7, h: 5, doorSide: 'left', doorY: 2 },
      tavern: { x: 42, y: 42, w: 10, h: 6, doorX: 4 }, inn: { x: 42, y: 50, w: 12, h: 6, doorSide: 'left', doorY: 3 }
    },
    npcs: {
      rivel_guard1: [33, 13, 'down', 0], rivel_guard2: [37, 13, 'down', 0], rivel_gate_e: [69, 38, 'left', 0],
      rivel_woman: [24, 52, 'left', 2], rivel_man: [45, 49, 'down', 2], rivel_child: [28, 40, 'down', 2], rivel_merchant: [19, 53, 'up', 0],
      rivel_scholar: [55, 29, 'left', 0], rivel_traveler: [39, 45, 'right', 1], aunt67_rivel_town: [30, 39, 'down', 1],
      riveltown_x72_kid: [10, 20, 'right', 1], riveltown_x72_vendor: [61, 46, 'down', 0], riveltown_x72_elder: [56, 43, 'up', 0],
      rivel_town_a73_0: [20, 52, 'left', 2], rivel_town_a73_1: [54, 31, 'down', 2], rivel_town_a73_2: [66, 52, 'left', 2], rivel_town_a73_3: [25, 41, 'down', 2],
      rivel_town_a73_4: [6, 13, 'down', 1], rivel_town_a73_5: [66, 20, 'left', 1], rivel_town_a73_6: [5, 54, 'down', 2], rivel_town_a73_7: [17, 20, 'down', 2],
      u73_rondo: [48, 49, 'up', 1], u73_mil: [64, 23, 'left', 1], rivel_bread76: [15, 53, 'down', 0]
    },
    events: [[6, 52, 32, 55], [72, 27, 62, 38]],
    chests: { rivel1: [67, 3] },
    points: { sp_rivel_town_8_22: [4, 51], opt_001: [27, 41] },
    warps: [].concat(
      [56, 57].map(function (y) { return [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: y + 2, to: 'world', tx: 40, ty: 49 }; }); }).reduce(function (a, b) { return a.concat(b); }, []),
      [{ x: W - 1, y: 39, to: 'rivel_artisan', tx: 1, ty: 15 }, { x: W - 1, y: 40, to: 'rivel_artisan', tx: 1, ty: 16 }, { x: W - 1, y: 41, to: 'rivel_artisan', tx: 1, ty: 16 }]),
    anchors: [[86, 20, W - 3, 39], [86, 21, W - 3, 40]],
    after: function (def) {
      def.events.forEach(function (e) {
        if (e.x === 32 && e.y === 55) e.text = ['【立て札】リヴェル城下町\n北：王道の先に内門と堀・跳ね橋、リヴェル城（城の前庭に騎士の詰所・見張りの塔・波形聖堂）\n西：商店通り（武器屋・道具屋・防具屋・パン屋・花屋・仕立て屋・古道具屋）・教会\n東：冒険者ギルド・銀行・酒場・宿屋。小路の先の東門から職人通りへ'];
        if (e.x === 62 && e.y === 38) e.text = ['【職人通りへの小路】', 'この先の東門を出ると職人通り。小路には画家のアトリエ・学者の家・鍛冶の作業場。', '北の通用門から、城の前庭（騎士の区画・波形聖堂）へ入れる。'];
      });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'riveltown_x72_kid') n.talk = say('子ども', ['城の前庭の見張りの塔、てっぺんまで登ったことある？　リヴェル城下町がぜんぶ見えるんだよ！', '下から見ると大きな建物も、上から見ると小さな四角なんだって。']);
        if (n.id === 'rivel_guard2') n.talk = say('城門の衛兵', ['城下町では、武器屋・道具屋・防具屋・教会が西の商店通り、冒険者ギルド・銀行・酒場・宿屋が王道の東側だ。', '城の前庭には騎士の詰所と見張りの塔、東の奥に波形聖堂がある。']);
        if (n.id === 'rivel_woman') n.talk = say('町の女性', ['門からまっすぐの王道は町の自慢よ。内門と城の紋章が、門からでも見えるでしょう。看板を見れば、どの建物が何の店かすぐわかるわ。', '酒場では旅の仲間が待っているって聞いたわ。']);
        if (n.id === 'riveltown_x72_elder') n.talk = say('町の古老', ['この職人通りへの小路も、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
      def.crests81 = [
        { x: 36, y: 13.05, face: 's', kind: 'rivel', h: 5.2, size: 1.5, banner: true },   // 城の正面
        { x: 32.0, y: 27.06, face: 's', kind: 'rivel', h: 1.5, size: 0.85, banner: true }, { x: 40.0, y: 27.06, face: 's', kind: 'rivel', h: 1.5, size: 0.85, banner: true }   // 内門の両わき
      ];
    }
  });
  // 初めて城下町に入ったとき（3D）：門の内側から王道の先の内門の紋章・堀・城の正面の紋章へ（4 秒）
  R.firstView('rivel_town', 'v81_rivel_view', { x: 36, y: 4, z: 24, dist: 34, pitch: 28 }, 4000);

  /* ---------- リヴェル城 1 階：衛兵の検問 → 中庭 → 謁見の間／中庭の左右から職務と暮らしの区画（西の階段は 2 階・王立図書室・屋上へ、東の階段は地下へ） ---------- */
  R.define('rivel_castle', {
    version: 1, arrive: [16, 30],
    rows: function (canvas) {
      var C = canvas(34, 32, ':'); C.frame(0, 0, 34, 32, 'C');
      C.rect(7, 1, 1, 22, 'C'); C.rect(26, 1, 1, 22, 'C'); C.rect(7, 13, 20, 1, 'C'); C.rect(1, 22, 32, 1, 'C'); C.rect(12, 22, 1, 9, 'C'); C.rect(21, 22, 1, 9, 'C');
      C.rect(1, 10, 6, 1, 'C'); C.rect(27, 10, 6, 1, 'C');
      // 出入り口（門・中庭への口・各区画の戸口）
      C.set(16, 31, 'D'); C.set(17, 31, 'D'); C.rect(15, 22, 4, 1, 'P'); C.rect(15, 13, 4, 1, 'p'); C.set(7, 17, ':'); C.set(26, 17, ':'); C.set(4, 22, ':'); C.set(29, 22, ':'); C.set(3, 10, ':'); C.set(30, 10, ':');
      // 謁見の間：玉座の段・まっすぐの通路（敷物）・両側の傍聴席・柱
      C.rect(13, 1, 8, 2, 'p'); C.rect(15, 3, 4, 10, 'p');
      [4, 6, 8, 10].forEach(function (y) { C.rect(10, y, 4, 1, 'e'); C.rect(20, y, 4, 1, 'e'); });
      [3, 7, 11].forEach(function (y) { C.set(9, y, 'I'); C.set(24, y, 'I'); });
      // 中庭：芝生・十字の石畳・井戸・花壇・木
      C.rect(8, 14, 18, 8, ','); C.rect(15, 14, 4, 8, 'P'); C.rect(8, 17, 18, 1, 'P'); C.set(11, 15, 'j'); C.set(22, 20, 'j');
      [[9, 15], [24, 15], [9, 20], [24, 20]].forEach(function (p) { C.set(p[0], p[1], '6'); }); C.blob(11, 19, [[0, 0], [1, 0]], 'a'); C.blob(21, 15, [[0, 0], [1, 0]], 'a');
      // 衛兵の検問：門からの石畳・両わきの番所（台と道具かけ）
      C.rect(15, 23, 4, 8, 'P'); C.set(13, 24, 'T'); C.set(14, 24, 'T'); C.set(19, 24, 'T'); C.set(20, 24, 'T'); C.set(13, 29, ')'); C.set(20, 29, ')'); C.set(13, 27, 'i'); C.set(20, 27, 'i');
      // 西・北：暮らし（食堂と 2 階への階段）
      C.set(3, 1, '<'); C.rect(2, 5, 4, 2, 'T'); C.set(6, 1, '{'); C.set(1, 8, 'q'); C.set(6, 8, 'z');
      // 西・中：職務（大臣の執務室：机と書棚）
      C.rect(1, 12, 1, 8, 'K'); C.set(4, 13, 't'); C.set(5, 13, 't'); C.set(4, 19, 't'); C.set(6, 21, 'K');
      // 西・南：厨房（真ん中の作業台をかまど・流し・食器棚・樽が囲む）
      C.rect(4, 26, 4, 2, 'T'); C.set(1, 24, '^'); C.set(1, 25, '^'); C.set(1, 27, ']'); C.set(1, 28, ']'); C.set(11, 24, '{'); C.set(11, 25, '{'); C.set(1, 30, 'q'); C.set(2, 30, 'q'); C.set(11, 30, 'z');
      // 東・北：倉庫と地下への階段
      C.set(30, 1, '>'); [[27, 1], [28, 1], [32, 1], [32, 2], [27, 8], [32, 8]].forEach(function (p) { C.set(p[0], p[1], p[0] % 2 ? 'z' : 'q'); });
      // 東・中：厩舎の番所（干し草の箱・柵）
      C.rect(30, 12, 3, 1, 'x'); C.rect(30, 12, 1, 4, 'x'); C.set(31, 13, 'z'); C.set(32, 13, 'z'); C.set(32, 15, 'q'); C.set(27, 20, 't');
      // 東・南：衛兵の詰所（真ん中の作業台を道具かけ・寝台が囲む）
      C.rect(25, 26, 4, 2, 'T'); C.set(32, 24, ')'); C.set(32, 25, ')'); C.set(22, 24, ')'); C.set(31, 30, 'E'); C.set(32, 30, 'E'); C.set(22, 30, 'q'); C.set(27, 23, 'i');
      return C;
    },
    npcs: {
      king: [16, 2, 'down', 0], castle_guard_l: [14, 3, 'right', 0], castle_guard_r: [19, 3, 'left', 0],
      castle_steward: [14, 26, 'right', 0], castle_minister: [4, 16, 'down', 1], u73_sebas: [6, 25, 'left', 0], castle_stable79: [29, 15, 'left', 0],
      rivel_castle_a73_0: [24, 29, 'left', 2], rivel_castle_a73_1: [9, 29, 'left', 2], rivel_castle_a73_2: [28, 5, 'down', 2]
    },
    chests: { castle1: [9, 1], castle2: [24, 1] },   // 謁見の間の奥の両隅（近衛兵の言う「城の宝箱」）
    warps: [{ x: 16, y: 31, to: 'rivel_town', tx: 30, ty: 12 }, { x: 17, y: 31, to: 'rivel_town', tx: 30, ty: 12 },
      { x: 3, y: 1, to: 'rivel_castle_2f', tx: 2, ty: 9 }, { x: 30, y: 1, to: 'rivel_castle_b1', tx: 26, ty: 2 }],
    anchors: [[3, 24, 3, 2], [26, 24, 30, 2]],
    after: function (def) {
      def.npcs.forEach(function (n) {
        if (n.id === 'castle_steward') n.talk = async function (c) { await c.say('城の案内係', ['ここは城の検問だ。まっすぐ中庭を抜けた奥が謁見の間。', '中庭の左（西）の戸口から、執務室・厨房と、2階への階段。2階には会議室・図書室・客室・執務室、さらに上の3階には王の私室と展望台、宝物庫がある。', '中庭の右（東）の戸口から、厩舎の番所・衛兵の詰所と、地下への階段。地下は牢と倉庫だ。地下の奥には古い遺跡の扉があるが、誰も開け方を知らん。']); };
      });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
