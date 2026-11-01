/* =========================================================
   RPG / Masters（TraderMasterManager）：10人のトレーダー師匠をマップに置く・歩く姿の色・会話の顔の絵
   ・置く場所は js/data/ultimates.js の TRADER_MASTERS（map・x・y）。物語で訪れる順（序盤→終盤）の町・村・学院に1人ずつ
       置く前に、そのマスが通れること・ほかの NPC／出入口／宝箱／イベントの近くでないこと・置いても行けなくなる場所が出ないことを確かめてある
       （docs/ultimates-50.md。実行時にもふさがっていたら近くの空きマスへずらす）
   ・動かない NPC（wander: 0）。話しかけると修行場（js/ui/dojo.js の TraderDojo.open）
   ・歩く姿は既存の NPC の画像を使う（js/core/chars.js のパレットは増やさない）。既存の NPC・会話・クエストは変えない（マップの NPC の一覧に足すだけ。同じ ID がすでにあれば足さない）
   ・3D 版：師匠のいるマップは 3D 化していない（2D の表示）ので、3D のモデルは使わない
   ========================================================= */
(function (root) {
  'use strict';
  var MASTERS = root.TRADER_MASTERS || {};
  var TM = { installed: [], moved: [] };
  var SKIN_EYE = '#1b1b2a';

  // 歩く姿：既存の NPC の歩行画像（assets/characters/overworld）を使う（ほかの NPC と同じ絵柄にそろえる。新しい画像ファイルは足さない）
  //   師匠ごとの見た目の違いは、会話の顔の絵（TM.portrait。色・髪型・流派の印）で出す
  var SPRITE = { galen: 'elder', seiran: 'sailor', bard: 'bartender', mirea: 'priest', lione: 'scholar', chrono: 'master', volte: 'villager_m', raizen: 'guard', arzen: 'scholar', ordis: 'elder' };
  TM.spriteOf = function (mid) { return SPRITE[mid] || 'villager_m'; };

  // 置けるか（通れるマス・出入口やほかの NPC の近くでない）を、マップのデータ（rows・buildings・npcs・warps）から調べる
  function solidAt(def, x, y) {
    var rows = typeof def.rows === 'function' ? null : def.rows; if (!rows) return false;   // 行が関数のマップは実行時に作るので、ここでは調べない（置く場所は事前に確認済み）
    if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return true;
    var T = root.Tiles; var ch = rows[y][x]; var name = T && T.byChar ? T.byChar[ch] : null; if (name && T.isSolid && T.isSolid(name)) return true;
    var bl = (def.buildings || []).some(function (b) { var w = b.w || 5, h = b.h || 3; return x >= b.x && x < b.x + w && y >= b.y && y < b.y + h; }); if (bl) return true;
    return false;
  }
  function crowded(def, x, y) {
    var near = function (arr, r) { return (arr || []).some(function (a) { return Math.abs(a.x - x) <= r && Math.abs(a.y - y) <= r; }); };
    if (near(def.npcs, 0) || near(def.warps, 1) || near(def.chests, 0) || near(def.events, 1)) return true;
    return (def.buildings || []).some(function (b) { var dx = b.x + (b.doorX === undefined ? 2 : b.doorX), dy = b.y + (b.h || 3) - 1; return Math.abs(dx - x) <= 1 && Math.abs(dy - y) <= 1; });
  }
  TM.spotFor = function (def, x, y) {
    if (!solidAt(def, x, y) && !crowded(def, x, y)) return { x: x, y: y, moved: false };
    for (var r = 1; r <= 4; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var nx = x + dx, ny = y + dy; if (!solidAt(def, nx, ny) && !crowded(def, nx, ny)) return { x: nx, y: ny, moved: true }; }
    return null;
  };
  TM.npcId = function (mid) { return 'tmaster_' + mid; };
  TM.install = function () {
    var MD = root.MAP_DEFS; if (!MD) return;
    Object.keys(MASTERS).forEach(function (mid) {
      var m = MASTERS[mid]; var def = MD[m.map]; if (!def) return; def.npcs = def.npcs || [];
      if (def.npcs.some(function (n) { return n.id === TM.npcId(mid); })) return;
      var spot = TM.spotFor(def, m.x, m.y); if (!spot) { if (root.console) console.warn('trader master: no spot', mid); return; }
      if (spot.moved) TM.moved.push(mid);
      def.npcs.push({ id: TM.npcId(mid), x: spot.x, y: spot.y, sprite: TM.spriteOf(mid), dir: m.dir || 'down', wander: 0, name: m.name, traderMaster: mid,
        talk: function (c) { return root.TraderDojo ? root.TraderDojo.open(mid, c) : c.say(m.name, ['……修行の準備がまだ整っていないようだ。']); } });
      TM.installed.push(mid);
    });
  };
  TM.where = function (mid) { var m = MASTERS[mid]; if (!m) return null; var def = (root.MAP_DEFS || {})[m.map]; var n = def && (def.npcs || []).filter(function (x) { return x.id === TM.npcId(mid); })[0]; return { map: m.map, mapName: def ? def.name : m.map, x: n ? n.x : m.x, y: n ? n.y : m.y, place: m.place }; };

  /* ---------- 会話の顔の絵（その場で描く。画像ファイルは使わない） ---------- */
  var PORTRAIT = {};
  var HAIR = { white_long: ['long'], blue_bun: ['bun'], short_beard: ['short', 'beard'], lilac_long: ['long'], pink_twin: ['twin'], silver_hood: ['hood'], spiky_gold: ['spiky'], short_gray: ['short'], green_braid: ['braid'], long_white_beard: ['long', 'beard'] };
  TM.portrait = function (mid) {
    if (PORTRAIT[mid] !== undefined) return PORTRAIT[mid];
    var m = MASTERS[mid]; var url = null;
    try {
      var L = m.look || {}; var c = document.createElement('canvas'); c.width = 128; c.height = 128; var g = c.getContext('2d'); if (!g || !g.fillRect) throw new Error('no canvas');
      var bg = g.createLinearGradient ? g.createLinearGradient(0, 0, 0, 128) : null; if (bg && bg.addColorStop) { bg.addColorStop(0, L.bg || '#2a3a5a'); bg.addColorStop(1, '#0b1226'); g.fillStyle = bg; } else g.fillStyle = L.bg || '#2a3a5a';
      g.fillRect(0, 0, 128, 128);
      var st = HAIR[L.hair] || ['short']; var H = L.H || '#4a2e1a', F = L.skin || '#f3c9a0', B = L.B || '#2b5fb3', A = L.A || '#e8c15a', M = L.M || B;
      function ell(x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); if (g.ellipse) g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); else g.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); g.fill(); }
      function rect(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
      if (st.indexOf('long') >= 0) rect(34, 40, 60, 62, H);                                   // 後ろ髪
      if (st.indexOf('hood') >= 0) ell(64, 58, 40, 44, M);                                     // フード
      ell(64, 124, 50, 34, B); rect(30, 108, 68, 20, B); rect(58, 92, 12, 14, F);             // 体・首
      g.fillStyle = A; g.fillRect(44, 104, 40, 5);                                             // 飾り
      ell(64, 64, 25, 29, F);                                                                  // 顔
      if (st.indexOf('hood') < 0) { ell(64, 44, 28, 15, H); rect(37, 42, 8, 22, H); rect(83, 42, 8, 22, H); }   // 前髪
      if (st.indexOf('bun') >= 0) ell(64, 24, 12, 11, H);
      if (st.indexOf('twin') >= 0) { ell(32, 70, 9, 22, H); ell(96, 70, 9, 22, H); }
      if (st.indexOf('braid') >= 0) { ell(88, 84, 7, 9, H); ell(90, 98, 6, 8, H); }
      if (st.indexOf('spiky') >= 0) { g.fillStyle = H; g.beginPath(); for (var k = 0; k < 6; k++) { var x0 = 38 + k * 10; g.moveTo(x0, 40); g.lineTo(x0 + 5, 18 + (k % 2) * 6); g.lineTo(x0 + 10, 40); } g.fill(); }
      ell(54, 66, 3, 4, SKIN_EYE); ell(74, 66, 3, 4, SKIN_EYE);                                 // 目
      if (st.indexOf('beard') >= 0) { g.fillStyle = H; g.beginPath(); g.moveTo(44, 74); g.quadraticCurveTo(64, 86, 84, 74); g.lineTo(78, 100); g.lineTo(64, 108); g.lineTo(50, 100); g.closePath(); g.fill(); }
      g.strokeStyle = st.indexOf('beard') >= 0 ? '#5a4a3a' : '#7a3a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(58, 80); g.lineTo(70, 80); g.stroke();   // 口
      if (L.mark === 'goggles') { g.strokeStyle = '#3a2a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(36, 46); g.lineTo(92, 46); g.stroke(); ell(54, 46, 9, 8, '#3a2a1a'); ell(74, 46, 9, 8, '#3a2a1a'); ell(54, 46, 6, 5, '#9fe0ff'); ell(74, 46, 6, 5, '#9fe0ff'); }
      if (L.mark === 'scarf') { rect(46, 94, 36, 9, A); rect(70, 100, 8, 18, A); }
      // 右下の印（流派の印）
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(96, 96, 28, 28); g.fillStyle = A; g.strokeStyle = A; g.lineWidth = 3;
      var mk = L.mark; g.beginPath();
      if (mk === 'bolt') { g.moveTo(112, 99); g.lineTo(102, 112); g.lineTo(110, 112); g.lineTo(106, 122); g.lineTo(118, 107); g.lineTo(110, 107); g.closePath(); g.fill(); }
      else if (mk === 'shield') { g.moveTo(100, 100); g.lineTo(120, 100); g.lineTo(120, 110); g.lineTo(110, 121); g.lineTo(100, 110); g.closePath(); g.fill(); }
      else if (mk === 'star') { for (var q = 0; q < 10; q++) { var ang = -Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? 5 : 11; g.lineTo(110 + Math.cos(ang) * rr, 110 + Math.sin(ang) * rr); } g.closePath(); g.fill(); }
      else if (mk === 'hourglass') { g.moveTo(101, 100); g.lineTo(119, 100); g.lineTo(101, 120); g.lineTo(119, 120); g.closePath(); g.fill(); }
      else if (mk === 'scales') { g.moveTo(110, 100); g.lineTo(110, 120); g.moveTo(100, 104); g.lineTo(120, 104); g.stroke(); g.beginPath(); g.arc(102, 112, 4, 0, Math.PI); g.arc(118, 112, 4, 0, Math.PI); g.fill(); }
      else if (mk === 'pickaxe') { g.moveTo(100, 104); g.quadraticCurveTo(110, 96, 120, 104); g.moveTo(110, 101); g.lineTo(110, 122); g.stroke(); }
      else if (mk === 'shell') { g.arc(110, 114, 9, Math.PI, 0); g.fill(); }
      else { g.moveTo(98, 112); for (var w2 = 0; w2 < 4; w2++) g.quadraticCurveTo(101 + w2 * 6, 104 + (w2 % 2) * 14, 104 + w2 * 6, 112); g.stroke(); }   // 波・風
      url = c.toDataURL ? c.toDataURL('image/png') : null; if (url && url.length < 64) url = null;
    } catch (e) { url = null; }
    PORTRAIT[mid] = url; return url;
  };

  TM.install();
  root.TraderMasterManager = TM;
})(typeof window !== 'undefined' ? window : globalThis);
