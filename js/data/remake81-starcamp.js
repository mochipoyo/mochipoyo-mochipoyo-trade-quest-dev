/* =========================================================
   Data / v8.1 星見塔の野営地（star_camp）：雲の上の小さな野営地。焚き火の輪を天幕が囲み、東に星見広場
   ・住む理由：星見塔へ向かう人と、星を見に来た人が泊まる野営地。夜はみんなで焚き火を囲む
   ・入口から最初に見える物：南の門から短い小道。その先に丸太の腰かけに囲まれた焚き火、奥（北）に雲海を見下ろす柵
   ・道：小道（門 → 焚き火の輪 → 北の見晴らし）。西に観測者の天幕と小さな天幕。東の「星見広場」に天球儀・望遠鏡・星見台・天文家の家
   ・境界：林（自然の境界）。北は柵の向こうが雲海。出入りは南の門
   ・人・出来事（焚き火）・宝箱はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 42, H = 16, GX = 19, FX = 20, FY = 7;   // FX, FY：焚き火
  function rows(canvas) {
    var C = canvas(W, H, '.');
    C.frame(0, 0, W, H, 'f'); C.rect(GX, H - 1, 2, 1, 'r');
    for (var y = 3; y < 12; y++) for (var x = 15; x < 26; x++) { var d = Math.sqrt((x + 0.5 - FX - 0.5) * (x + 0.5 - FX - 0.5) + (y - FY) * (y - FY)); if (d < 4.2) C.set(x, y, 'P'); }
    C.rect(GX, 11, 2, H - 12, 'r'); C.rect(GX, 1, 2, 3, 'r');   // 小道（南の門・北の見晴らし）
    C.set(FX, FY, 'i');   // 焚き火
    [[17, 5], [23, 5], [17, 9], [23, 9]].forEach(function (p) { C.set(p[0], p[1], 'e'); });   // 丸太の腰かけ
    C.rect(13, 1, 4, 1, 'x'); C.rect(23, 1, 2, 1, 'x'); C.set(16, 2, 'e');   // 北の柵（雲海の見晴らし）
    // 小さな天幕と薪
    [[4, 9], [8, 11], [4, 13], [10, 8]].forEach(function (p) { C.set(p[0], p[1], 'A'); }); C.set(12, 9, 'z'); C.set(14, 12, 'q');
    // 星見広場（東）
    C.rect(26, 8, 14, 6, 'P'); C.set(32, 10, '*'); C.set(28, 12, '?'); C.set(37, 12, '?'); C.set(33, 13, 'X'); C.set(34, 13, 'X');
    C.rect(25, 8, 1, 1, 'P'); C.rect(24, 10, 2, 2, 'P');
    return C;
  }
  R.define('star_camp', {
    version: 1, rows: rows, arrive: [GX, 13],
    buildings: {
      a3_star_tent: { x: 3, y: 2, w: 6, h: 4, doorX: 2 }, x72_tower: { x: 26, y: 1, w: 6, h: 6, doorX: 2 }, x72_house: { x: 33, y: 1, w: 7, h: 5, doorX: 3 },
      bread_stall76: { x: 12, y: 12, w: 3, h: 2, doorX: 1 }
    },
    npcs: {
      scm_keeper: [16, 8, 'right', 0], aunt67_star_camp: [11, 4, 'down', 1], ponta: [6, 12, 'down', 0], s3121_sc_visitor: [24, 4, 'down', 0],
      starcamp_x72_kid: [29, 11, 'down', 1], starcamp_x72_vendor: [35, 11, 'down', 0], starcamp_x72_elder: [38, 12, 'down', 0],
      star_camp_a73_0: [24, 13, 'down', 2], star_camp_a73_1: [8, 7, 'down', 2], star_camp_a73_2: [12, 2, 'down', 1], star_camp_a73_3: [10, 12, 'down', 2],
      u73_stella: [33, 9, 'down', 0], tmaster_ordis: [22, 10, 'down', 0], star_camp_bread76: [13, 12, 'down', 0]
    },
    events: [[9, 6, FX, FY], [23, 10, 25, 11]],
    chests: { scm1: [18, 1] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: H - 1, to: 'world_sky', tx: 42, ty: 88, name: '島へ' }; }),
    anchors: [[9, 12, GX, 14], [10, 12, GX + 1, 14], [9, 11, GX, 13], [10, 11, GX + 1, 13]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 25 && e.y === 11) e.text = ['【東の星見広場】', '天球儀と望遠鏡、星見台と天文家の家。', '焚き火の北の柵からは、雲海が見下ろせる。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'starcamp_x72_kid') n.talk = say('子ども', ['星見台、てっぺんまで登ったことある？　星見塔の野営地がぜんぶ見えるんだよ！', '上から見ると、天幕がぜんぶ焚き火のほうを向いてるんだって。']);
        if (n.id === 'starcamp_x72_elder') n.talk = say('町の古老', ['この星見広場も、昔はただの草地だった。少しずつ道具が増えて、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('star_camp', 'v81_starcamp_view', { x: FX, y: 1, z: 7, dist: 20, pitch: 40 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
