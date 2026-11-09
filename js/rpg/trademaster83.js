/* =========================================================
   RPG / TradeMaster83（v8.3）：町・城・フィールドにいる「トレードマスター」と、話しかけて遊ぶリアルタイムのトレードバトル
   ・依頼（2026-11-08）：「全町と城とフィールドにリアルタイムトレードバトルができる『トレードマスター』の人間をたくさん配置し、話しかけると
     トレードバトルができるようにする。必殺技を使う時のようなトレード方式で、勝つとゴールドがもらえる。見た目は他の人間と区別する」
   ・バトル：必殺技と同じ「いま動くチャート」（js/ui/chartbattle.js の ChartBattleUI.open）。同じチャートで、相手（トレードマスター）も
     判断の時間のうちに、そのとき見えている足だけで売り買いを決める（相手の判断は画面に出る。紫の三角）。決済の決まりはプレイヤーと同じ（Market.settle）
     1 回の勝負：多く pips を取ったほうが勝ち（見送りは 0pips・差が 0.1pips 未満は引き分け）。1本勝負と 3本勝負（2本先取）
   ・賞金：場所の段階（序盤〜終盤）で決まる。同じトレードマスターの賞金は、受け取ってから 400 歩あるくまで出ない（勝負はできる。連続で稼ぎ続けないため）
   ・相場はすべて架空のシミュレーション（ChartBattleUI が「シミュレーション相場」と出す）。実在の銘柄・実際の値動きではない
   ・置く場所：その地図を初めて作るとき（World.getMap）に、地図の形から決める（同じ地図ならいつも同じ所。乱数は地図の ID から）。地図のデータ（def.npcs）には書かず、作った地図（m.npcs）にだけ足す
       入口から歩いて行ける・まわり 8 マスが通れる（置いても道をふさがない）・出入口や扉や人や出来事から離れた所。町は通りの近く、フィールドは町の入口の近く
   ・見た目：2D 版は足元の金の輪・頭の上のシルクハット・ローソク足の札（MAP_DRAW_LAYERS）。3D 版は金の帯のシルクハット・足元の金の輪・ローソク足の札（three-src の TradeMaster83.js）
   ・セーブ：State.data.tm83（なければ作る。古いセーブはそのまま読める）。トレードマスターは地図のデータには書かない（毎回同じ所に置く）
   ========================================================= */
(function (root) {
  'use strict';
  var TM = root.TradeMaster83 = { VERSION: 1, placed: {}, errors: [], COOL_STEPS: 400 };

  /* ---------- 場所ごとの段階（序盤 1 〜 終盤 5）：物語で訪れる順の目安 ---------- */
  var TIER = {
    poyo_village: 1, rivel_town: 1, rivel_artisan: 1, rivel_castle_approach: 1, rivel_castle: 1, dow_village: 1, asana_village: 1, asana_ruins: 1, asana_rebuilt: 1, world: 1,
    harbor_town: 2, verum_town: 2, kalion_city: 2, erased_village: 2, sentra_capital: 2, sentra_palace_approach: 2, sentra_palace_west: 2, tradia: 2, tradia_sky: 2, world_grania: 2, world_kalion: 2, world_islands: 2,
    aruna_village: 3, aruna_ruins: 3, tempus_city: 3, node_city: 3, scheduled_district: 3, volatilia: 3, luxbell: 3, sahar_city: 3, mirror_market: 3, world_tempus: 3, world_machine: 3, world_desert: 3,
    magicka_city: 4, magicka_palace_approach: 4, magicka_palace: 4, star_camp: 4, ignas_town: 4, ciel_port: 4, frost_town: 4, world_magicka: 4, world_sky: 4, world_dragon: 4, world_snow: 4,
    dark_camp: 5, neon_town: 5, meridian_shelter: 5, nereia_city: 5, nereia_old_hi: 5, nereia_old_lo: 5, world_dark: 5, world_neon: 5, world_meridian: 5, world_nereia: 5
  };
  // 物語の場面の地図（襲撃の夜）には置かない
  var SKIP = { asana_raid: 1 };
  var CASTLES = { rivel_castle: 1, magicka_palace: 1, sentra_palace_west: 1 };
  var FIELDS = { world: 1, world_grania: 1, world_kalion: 1, world_islands: 1, world_tempus: 1, world_machine: 1, world_magicka: 1, world_sky: 1, world_dark: 1, world_desert: 1, world_dragon: 1, world_snow: 1, world_neon: 1, world_meridian: 1, world_nereia: 1 };   // 地球の世界の新しい地域のフィールド（3D 版）も
  TM.TIER = TIER; TM.SKIP = SKIP; TM.CASTLES = CASTLES; TM.FIELDS = FIELDS;
  var TIER_NAME = ['', '駆け出し', '腕利き', '熟練', '凄腕', '伝説'];
  var PRIZE = [0, 60, 150, 320, 600, 1000];   // 1本勝負の賞金（3本勝負は 2.5 倍）
  var SKILL = [0, 0.35, 0.5, 0.62, 0.74, 0.86];
  var DIFF = [null, [1, 2], [1, 3], [2, 4], [3, 5], [4, 5]];
  TM.PRIZE = PRIZE;
  // 流派（得意な相場・見る指標・時間足）
  var STYLE = [
    { id: 'trend', name: '順張り', ind: ['ema', 'mtf'], cats: ['trend_up', 'trend_down', 'pullback_up', 'rally_down'], tf: 60, word: 'トレンドに逆らうな。流れに乗る者が勝つ。' },
    { id: 'contra', name: '逆張り', ind: ['ema', 'rci', 'range'], cats: ['range', 'fakeout', 'divergence'], tf: 15, word: '行き過ぎた値は戻る。皆が熱くなった所で逆を取る。' },
    { id: 'break', name: 'ブレイク', ind: ['ema', 'levels', 'swings'], cats: ['range_break', 'fakeout', 'trend_up', 'trend_down'], tf: 15, word: '高値と安値の線を抜けた瞬間が勝負だ。ダマシには気をつけな。' },
    { id: 'momentum', name: '勢い', ind: ['ema', 'macd'], cats: ['divergence', 'volatile', 'trend_up', 'trend_down'], tf: 5, word: '勢いは数字に出る。MACD の向きを見逃すな。' },
    { id: 'all', name: '万能', ind: ['ema', 'rci', 'levels'], cats: null, tf: 15, word: 'どんな相場でも、根拠がそろうまで待つ。それだけだ。' }
  ];
  TM.STYLE = STYLE;
  var NAMES = ['ガロ', 'ミルザ', 'ベルト', 'シオン', 'レンカ', 'ドルフ', 'ユーリ', 'カナメ', 'セドナ', 'ロウガ', 'ニーナ', 'ハルト', 'イリス', 'ザック', 'モーリス', 'ティナ', 'グレン', 'サヤ', 'オルカ', 'ジーナ',
    'ラッセル', 'フウカ', 'ボルド', 'エマ', 'クロウ', 'ミレイ', 'ダリオ', 'ノエル', 'ヴィクト', 'リコ', 'ゲイル', 'アンナ', 'トーマ', 'セラ', 'バルト', 'ヒナ', 'ルーク', 'マキ', 'オスカ', 'ネル',
    'カイル', 'ソフィ', 'ジン', 'レア', 'ギル', 'ミオ', 'エド', 'カレン', 'ロイ', 'ユナ', 'デン', 'ルル', 'アキム', 'ナナ', 'フェン', 'リズ', 'コウ', 'メイ', 'ラウル', 'シズ',
    'ブラム', 'ティオ', 'ハンナ', 'クリフ', 'ヨナ', 'マルコ', 'エリ', 'タオ', 'ルカ', 'ベス', 'ノア', 'イオ', 'ケン', 'ララ', 'ゼノ', 'ミカ', 'ドナ', 'パオ', 'リン', 'オト'];
  var SPRITES = ['merchant', 'scholar', 'master', 'bartender', 'villager_m', 'villager_f', 'elder', 'sailor'];
  var LOOK = ['#e8c15a', '#f0d27a', '#d8a83a'];   // 金の色（帯・輪）

  function hash(str) { var h = 2166136261 >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  TM.hash = hash;

  // その地図に置く人数（0＝置かない）
  TM.countFor = function (def, id) {
    if (!def || SKIP[id]) return 0;
    if (FIELDS[id]) return 3;
    if (CASTLES[id]) return 1;
    if (def.kind !== 'town') return 0;
    if (def.castle82) return 2;
    var rows = Array.isArray(def.rows) ? def.rows : null; var area = rows ? rows.length * rows[0].length : 2000;
    return area >= 3200 ? 3 : 2;
  };
  TM.tierOf = function (id) { return TIER[id] || 2; };

  /* ---------- 置く場所（地図を初めて作るとき） ---------- */
  function spots(m, id, n) {
    var d = root.State && root.State.data; var W = m.w, H = m.h; var D = root.MAP_DEFS || {};
    var near = function (list, x, y, r) { return (list || []).some(function (a) { return a && !a.hidden && Math.abs(a.x - x) <= r && Math.abs(a.y - y) <= r; }); };
    var chests = m.chests || [];
    var free = function (x, y) { return x >= 1 && y >= 1 && x < W - 1 && y < H - 1 && m.passable(x, y, d) && !m.npcAt(x, y) && !m.warpAt(x, y) && !m.eventAt(x, y) && !chests.some(function (c) { return c.x === x && c.y === y; }); };
    // 入口（地図の出入口のワープのとなり）から歩いて行ける所
    var seen = new Uint8Array(W * H); var q = [];
    (m.warps || []).forEach(function (w) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { var x = w.x + v[0], y = w.y + v[1]; if (x >= 0 && y >= 0 && x < W && y < H && m.passable(x, y, d) && !m.warpAt(x, y) && !seen[y * W + x]) { seen[y * W + x] = 1; q.push(x, y); } }); });
    var arr = m.def && m.def.remake81 && m.def.remake81.arrive; if (arr && m.passable(arr[0], arr[1], d) && !seen[arr[1] * W + arr[0]]) { seen[arr[1] * W + arr[0]] = 1; q.push(arr[0], arr[1]); }
    for (var qi = 0; qi < q.length; qi += 2) { var cx = q[qi], cy = q[qi + 1]; for (var k = 0; k < 4; k++) { var nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0); if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx]) continue; if (!m.passable(nx, ny, d) || m.warpAt(nx, ny)) continue; seen[ny * W + nx] = 1; q.push(nx, ny); } }
    var doors = []; (m.warps || []).forEach(function (w) { doors.push({ x: w.x, y: w.y }); });
    var extra = [].concat(root.QUIZ_MONSTERS || [], root.SEARCH_POINTS || []).filter(function (q) { return q && q.map === id && typeof q.x === 'number'; });
    // 通り道：入口（外への出口のとなり・着く所）から、全部の扉・出入口・人・調べる物までのいちばん短い道。そのマスと、となりのマスには立たない（まっすぐ歩く道をふさがない）
    var route = new Uint8Array(W * H);
    (function () {
      var par = new Int32Array(W * H).fill(-2); var qq = []; var D0 = root.MAP_DEFS || {};
      var exits = (m.warps || []).filter(function (w) { var t = D0[w.to]; return t && (t.kind === 'field' || t.region || (m.kind !== 'town' && !FIELDS[id])); }); if (!exits.length) exits = m.warps || [];
      var seed = function (x, y) { if (x >= 0 && y >= 0 && x < W && y < H && seen[y * W + x] && par[y * W + x] === -2) { par[y * W + x] = -1; qq.push(y * W + x); } };
      exits.forEach(function (w) { seed(w.x + 1, w.y); seed(w.x - 1, w.y); seed(w.x, w.y + 1); seed(w.x, w.y - 1); }); if (arr) seed(arr[0], arr[1]);
      for (var h = 0; h < qq.length; h++) { var c = qq[h], cx2 = c % W, cy2 = (c / W) | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { var nx2 = cx2 + v[0], ny2 = cy2 + v[1]; if (nx2 < 0 || ny2 < 0 || nx2 >= W || ny2 >= H) return; var k2 = ny2 * W + nx2; if (par[k2] !== -2 || !seen[k2]) return; par[k2] = c; qq.push(k2); }); }
      var mark = function (x, y) { var k3 = y * W + x; if (x < 0 || y < 0 || x >= W || y >= H || par[k3] === -2) return; for (var n3 = 0; n3 < W * H && k3 >= 0; n3++) { if (route[k3]) break; route[k3] = 1; k3 = par[k3]; } };
      var targets = [].concat(m.warps || [], m.npcs || [], m.events || [], chests);
      targets.forEach(function (o) { if (!o || typeof o.x !== 'number') return; mark(o.x + 1, o.y); mark(o.x - 1, o.y); mark(o.x, o.y + 1); mark(o.x, o.y - 1); });
    })();
    var onRoute = function (x, y) { for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && route[yy * W + xx]) return true; } return false; };
    var field = !!FIELDS[id]; var toTown = field ? (m.warps || []).filter(function (w) { var t = D[w.to]; return t && t.kind === 'town'; }) : [];
    // v9.1 開いた村・町（入口の範囲が広い印）：入口の範囲のマスから 2 マス以内には立たない（範囲のすぐ外に立つと、村から出てすぐ戻る・横から入る道をふさいでいた。dow_open_test の NG の原因）
    var nearFoot = new Uint8Array(W * H); if (field && root.World && root.World.landmarkFoot) { var foot = null; try { foot = root.World.landmarkFoot(m); } catch (e) { foot = null; }
      if (foot) Object.keys(foot).forEach(function (k) { var a = k.split(','), fx = +a[0], fy = +a[1]; for (var by = -2; by <= 2; by++) for (var bx = -2; bx <= 2; bx++) { var xx = fx + bx, yy = fy + by; if (xx >= 0 && yy >= 0 && xx < W && yy < H) nearFoot[yy * W + xx] = 1; } }); }
    var R = rng(hash('tm83:' + id)); var cand = [], loose = [];
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      if (!seen[y * W + x] || !free(x, y)) continue;
      var open = true; for (var dy = -1; dy <= 1 && open; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; if (!m.passable(x + dx, y + dy, d) || m.warpAt(x + dx, y + dy)) { open = false; break; } }
      if (!open) continue;
      if (near(doors, x, y, field ? 2 : 3) || nearFoot[y * W + x] || near(m.npcs, x, y, 2) || near(m.events, x, y, 2) || near(chests, x, y, 1)) continue;
      var strict = !onRoute(x, y) && !near(extra, x, y, 2);   // いちばん短い道の上・となり、クイズの魔物・調べる所のそばには立たない
      if (!strict && (route[y * W + x] || near(extra, x, y, 1))) continue;   // 狭い地図で足りないときだけ：道のとなりまでは許す（道の上には立たない）
      var sc = R() * 2;
      if (field) { var best = 99; toTown.forEach(function (w) { var dd = Math.abs(w.x - x) + Math.abs(w.y - y); if (dd < best) best = dd; }); if (best < 3 || best > 9) continue; sc += 10 - best; }
      else { var road = 0; for (var ry = -2; ry <= 2; ry++) for (var rx = -2; rx <= 2; rx++) { var t = m.tile(x + rx, y + ry); if (/road|path|stone|plaza|bridge|floor|carpet/.test(t || '')) road++; } sc += road * 0.4; }
      (strict ? cand : loose).push({ x: x, y: y, s: sc });
    }
    cand.sort(function (a, b) { return b.s - a.s; }); loose.sort(function (a, b) { return b.s - a.s; });
    var out = []; var gap = field ? 12 : Math.max(6, Math.min(12, Math.round(Math.min(W, H) / 4)));
    for (var i = 0; i < cand.length && out.length < n; i++) { var c = cand[i]; if (out.some(function (o) { return Math.abs(o.x - c.x) + Math.abs(o.y - c.y) < gap; })) continue; out.push(c); }
    for (var j = 0; j < cand.length && out.length < n; j++) { var c2 = cand[j]; if (out.some(function (o) { return Math.abs(o.x - c2.x) + Math.abs(o.y - c2.y) < 4; })) continue; out.push(c2); }   // 広くない地図：間を詰めて
    for (var l = 0; l < loose.length && out.length < n; l++) { var c3 = loose[l]; if (out.some(function (o) { return Math.abs(o.x - c3.x) + Math.abs(o.y - c3.y) < 4; })) continue; out.push(c3); }
    return out;
  }
  function makeNpc(id, i, sp, used) {
    var tier = TM.tierOf(id); var h = hash(id + '#' + i); var R = rng(h); R(); var st = STYLE[Math.floor(R() * STYLE.length)];
    var ni = Math.floor(R() * NAMES.length); for (var k = 0; k < NAMES.length && used && used[NAMES[ni]]; k++) ni = (ni + 7) % NAMES.length; var nm = NAMES[ni]; if (used) used[nm] = 1; var who = 'トレードマスター・' + nm;
    var info = { tier: tier, style: st.id, styleName: st.name, skill: SKILL[tier], diff: DIFF[tier], ind: st.ind, cats: st.cats, tf: st.tf, seed: h, color: LOOK[Math.floor(R() * LOOK.length)], short: nm, map: id, word: st.word };
    var npc = { id: 'tmb83_' + id + '_' + i, x: sp.x, y: sp.y, sprite: SPRITES[Math.floor(R() * SPRITES.length)], dir: 'down', wander: 0, name: who, tradeMaster83: info };
    npc.talk = function (c) { return TM.talk(npc, c); };
    return npc;
  }
  // 地図を作ったとき：置く場所を決めて（初回だけ）、地図のデータ（def.npcs）とその地図（m.npcs）に足す
  TM.placeOn = function (m) {
    if (!m || !m.def || m._tm83) return; m._tm83 = true; var id = m.id; var def = m.def; var n = TM.countFor(def, id); if (!n) return;
    try {
      if (!TM.placed[id]) { var sp = spots(m, id, n); var used = {}; TM.placed[id] = sp.map(function (s, i) { return makeNpc(id, i, s, used); }); if (sp.length < n) TM.errors.push(id + '：置ける所が ' + sp.length + '／' + n); }
      // 地図のデータ（def.npcs）には書かない（作り直しの確かめ・ほかの道具が見る人の数を変えない）。地図を作るたびに、その地図（m.npcs）にだけ足す
      TM.placed[id].forEach(function (npc) {
        if (!m.npcs.some(function (o) { return o.id === npc.id; })) m.npcs.push(Object.assign({ dir: 'down', frame: 0, moveTimer: 0, ox: npc.x, oy: npc.y, wander: 0 }, npc));
      });
    } catch (e) { TM.errors.push(id + '：' + (e && e.message)); }
  };
  TM.install = function () {
    var W = root.World; if (!W || !W.getMap || W._tm83) return; W._tm83 = true; var g0 = W.getMap;
    W.getMap = function (id) { var m = g0.apply(this, arguments); try { TM.placeOn(m); } catch (e) { TM.errors.push(id + '：' + (e && e.message)); } return m; };
  };
  // その地図のトレードマスターの立つマス（セーブの位置を写すとき、人の立つマスに着かないように。js/rpg/remake81.js の freeNear）
  TM.busyOn = function (id) { var D = root.MAP_DEFS || {}; if (!TM.countFor(D[id], id)) return []; if (!TM.placed[id] && root.World && root.World.getMap) { try { root.World.getMap(id); } catch (e) { return []; } } return (TM.placed[id] || []).map(function (n) { return { x: n.x, y: n.y }; }); };
  // 地図に入ったとき、主人公がトレードマスターと同じマスにいたら（古いセーブなど）、となりの空いたマスへ
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) {
    var W = root.World, d = root.State && root.State.data; var p = W && W.player; if (!m || !p || !m.npcAt) return; var n = m.npcAt(p.x, p.y); if (!n || !n.tradeMaster83) return;
    var seen = {}; var q = [[p.x, p.y]]; seen[p.x + ',' + p.y] = 1;
    while (q.length) { var c = q.shift(); var dirs = [[0, 1], [1, 0], [-1, 0], [0, -1]]; for (var i = 0; i < 4; i++) { var x = c[0] + dirs[i][0], y = c[1] + dirs[i][1]; if (seen[x + ',' + y] || Math.abs(x - p.x) + Math.abs(y - p.y) > 6) continue; seen[x + ',' + y] = 1; if (!m.passable(x, y, d) || (m.warpAt && m.warpAt(x, y))) continue; p.x = x; p.y = y; if ('px' in p) { p.px = x * 32; p.py = y * 32; } if (W.syncPos) W.syncPos(); return; } }
  });
  // 一覧（確かめの道具・図鑑用）：全部の対象の地図を作って置く
  TM.targets = function () { var D = root.MAP_DEFS || {}; return Object.keys(D).filter(function (id) { return TM.countFor(D[id], id) > 0; }); };

  /* ---------- セーブ ---------- */
  TM.ensure = function (d) { d = d || (root.State && root.State.data); if (!d) return null; if (!d.tm83 || typeof d.tm83 !== 'object') d.tm83 = { met: {}, paid: {}, wins: 0, losses: 0, draws: 0, gold: 0, recent: [] }; var t = d.tm83; t.met = t.met || {}; t.paid = t.paid || {}; t.recent = t.recent || []; return t; };
  TM.coolLeft = function (d, npcId) { var t = TM.ensure(d); var p = t.paid[npcId]; if (p === undefined || p === null) return 0; return Math.max(0, TM.COOL_STEPS - ((d.steps || 0) - p)); };
  TM.prize = function (tier, rounds) { var b = PRIZE[tier] || PRIZE[2]; return rounds > 1 ? Math.round(b * 2.5) : b; };

  /* ---------- 会話の顔の絵（その場で描く） ---------- */
  var FACE = {};
  TM.face = function (info) {
    var key = info.seed; if (FACE[key] !== undefined) return FACE[key]; var url = null;
    try {
      var c = document.createElement('canvas'); c.width = 128; c.height = 128; var g = c.getContext('2d'); if (!g || !g.fillRect) throw new Error('no canvas');
      var R = rng(info.seed); var skin = ['#f3c9a0', '#e8b48a', '#c98e64', '#a8704a'][Math.floor(R() * 4)]; var hair = ['#3a2a1a', '#8a5a2a', '#d8c8a8', '#2a2a3a', '#a83a2a'][Math.floor(R() * 5)];
      var ell = function (x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); if (g.ellipse) g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); else g.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); g.fill(); };
      g.fillStyle = '#141a30'; g.fillRect(0, 0, 128, 128);
      // 背景のローソク足
      for (var i = 0; i < 9; i++) { var up = R() < 0.55; var h = 14 + R() * 30; var y0 = 30 + R() * 50; g.fillStyle = up ? 'rgba(76,195,138,0.35)' : 'rgba(229,72,77,0.35)'; g.fillRect(6 + i * 13, y0, 7, h); g.fillRect(9 + i * 13, y0 - 6, 1.5, h + 12); }
      ell(64, 124, 50, 34, '#1e1e28'); g.fillStyle = info.color; g.fillRect(30, 104, 68, 4); g.fillRect(60, 96, 8, 26);   // 黒い上着・金のふち
      ell(64, 68, 25, 28, skin); ell(64, 48, 27, 12, hair);
      ell(54, 70, 3, 4, '#1b1b2a'); ell(74, 70, 3, 4, '#1b1b2a'); g.strokeStyle = '#7a3a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(58, 84); g.lineTo(70, 83); g.stroke();
      // シルクハット（金の帯）
      g.fillStyle = '#1a1a22'; g.fillRect(36, 36, 56, 7); g.fillRect(44, 6, 40, 32); g.fillStyle = info.color; g.fillRect(44, 28, 40, 6);
      // 右下の印（ローソク足）
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(96, 96, 28, 28); g.fillStyle = '#4cc38a'; g.fillRect(101, 104, 5, 12); g.fillRect(103, 100, 1.5, 20); g.fillStyle = '#e5484d'; g.fillRect(111, 108, 5, 10); g.fillRect(113, 104, 1.5, 18); g.fillStyle = info.color; g.fillRect(98, 121, 24, 2);
      url = c.toDataURL ? c.toDataURL('image/png') : null; if (url && url.length < 64) url = null;
    } catch (e) { url = null; }
    FACE[key] = url; return url;
  };

  /* ---------- 会話とトレードバトル ---------- */
  function fmtPips(p) { return (p > 0 ? '+' : '') + (Math.round(p * 10) / 10).toFixed(1) + 'pips'; }
  function sideJa(s) { return s === 'long' ? 'ロング' : s === 'short' ? 'ショート' : '見送り'; }
  function pipsOf(R) { return R && R.outcome !== 'skip' && typeof R.pips === 'number' ? R.pips : 0; }
  function outJa(R) { if (!R || R.outcome === 'skip') return '見送り（0pips）'; var why = R.exit && R.exit.reason === 'tp' ? '利確' : R.exit && R.exit.reason === 'sl' ? '損切り' : '時間切れ決済'; return sideJa(R.side) + ' → ' + why + ' ' + fmtPips(R.pips); }
  TM.judge = function (me, op) { var a = pipsOf(me), b = pipsOf(op); return a - b >= 0.1 ? 1 : b - a >= 0.1 ? -1 : 0; };
  function esc(s) { return root.Win && root.Win.esc ? root.Win.esc(s) : String(s); }
  // v8.8 あなたと相手を並べて比べる：判断・入った時刻（判断の時間が始まってから何本目の足か）・価格・判断した時点の見立て・結果
  TM.duelHtml = function (out, name) {
    var me = out.result, op = out.rival && out.rival.result; var j = TM.judge(me, op); var rv = out.rival || {};
    var SIDE = { long: 'ロング（買い）', short: 'ショート（売り）', skip: '見送り' }; var BIAS = { long: '上向きの根拠が多め', short: '下向きの根拠が多め', none: 'はっきりしない' };
    var when = function (pos) { if (!pos || out.bar0 === undefined) return '―'; return (pos.bar - out.bar0 + 1) + '本目' + (pos.tick < 7 ? '（形成中）' : ''); };
    var px = function (r) { return r && r.entry ? (Math.round(r.entry.price * 1000) / 1000).toFixed(3) : '―'; };
    var myBias = out.assessment ? BIAS[out.assessment.bias] || '' : '―';
    var row = function (k, a, b) { return '<tr><th>' + k + '</th><td>' + a + '</td><td>' + b + '</td></tr>'; };
    return '<div class="cb-duel ' + (j > 0 ? 'win' : j < 0 ? 'lose' : 'draw') + '"><b>' + (j > 0 ? 'この勝負：あなたの勝ち' : j < 0 ? 'この勝負：' + esc(name) + 'の勝ち' : 'この勝負：引き分け') + '</b>' +
      '<table class="tbl duel-cmp"><tr><th></th><th>あなた</th><th>' + esc(name) + '</th></tr>' +
      row('判断', esc(SIDE[out.side] || out.side) + (out.auto ? '（時間切れ）' : ''), esc(SIDE[rv.side] || rv.side || '―')) +
      row('入った時刻', esc(when(out.myPos)), esc(when(rv.pos))) + row('入った価格', px(me), px(op)) +
      row('その時点の見立て', esc(myBias), esc(BIAS[rv.bias] || '―')) + row('結果', esc(outJa(me)), esc(outJa(op))) + '</table>' +
      '<div class="muted small">相手は、決めておいた時刻（あなたの判断とは関係なく）に、その時点までに見えている足だけで判断する。勝敗は取った pips で決める（今までどおり）。</div></div>';
  };
  TM.rules = function (info) {
    return ['【トレードバトルのルール】', '必殺技と同じ「いま動くチャート」で、相手と同じ相場をトレードする。チャートが動き出したら、ロング（買い）・ショート（売り）・見送りのどれかを選ぶ。' + Math.round(((root.ChartBattleUI && root.ChartBattleUI.settings().decideMs) || 12000) / 1000) + '秒たつと見送りになる。',
      '相手も判断の時間のうちに売り買いを決める（チャートの紫の三角）。損切り・利確・時間切れ決済の決まりは同じ。',
      '取った pips が多いほうが勝ち（見送りは 0pips）。1本勝負と、3本勝負（2本先取）がある。勝つと賞金（' + TM.prize(info.tier, 1) + 'G／3本勝負は ' + TM.prize(info.tier, 3) + 'G）。',
      '同じ相手の賞金は、受け取ってから' + TM.COOL_STEPS + '歩あるくまで出ない（勝負はできる）。', '※ 相場はすべて架空のシミュレーション。実在の銘柄・実際の値動きではない。'];
  };
  TM.busy = false;
  TM.talk = async function (npc) {
    var Win = root.Win, State = root.State; var d = State.data; var t = TM.ensure(d); var info = npc.tradeMaster83; if (!info || TM.busy) return;
    var pt = TM.face(info); var say = function (lines) { return Win.message(lines, { name: npc.name, portrait: pt }); };
    if (!t.met[npc.id]) { t.met[npc.id] = 1; await say(['俺は' + TIER_NAME[info.tier] + 'のトレードマスター、' + info.short + '。' + info.styleName + '派だ。', info.word, 'チャートで勝負しないか？　勝てば賞金を出そう。']); }
    while (true) {
      var cool = TM.coolLeft(d, npc.id); var p1 = TM.prize(info.tier, 1), p3 = TM.prize(info.tier, 3);
      var tag = function (p) { return cool > 0 ? '（賞金なし：あと' + cool + '歩）' : '（勝てば ' + p + 'G）'; };
      var opts = ['1本勝負' + tag(p1), '3本勝負・2本先取' + tag(p3), 'ルールを聞く']; var adv = root.TradeDuel90 && root.PracticeUI ? opts.length : -1; if (adv >= 0) opts.push('上級の対戦（リスクR・規律。賞金なし）');   // v9.0 上級の対戦（js/rpg/tradeduel90.js）。pips 対戦・賞金・400歩は今までどおり
      opts.push('やめる');
      var c = await Win.choice(info.short + '：「' + (cool > 0 ? '賞金はさっき渡したばかりだ。腕試しなら受けて立つ。' : '勝負の形を選びな。') + '」', opts);
      if (c === 2) { await Win.message(TM.rules(info)); continue; }
      if (adv >= 0 && c === adv) { TM.busy = true; try { await root.TradeDuel90.talk(npc, info, say); } finally { TM.busy = false; } continue; }
      if (c !== 0 && c !== 1) { await say(['気が向いたらまた来な。相場はいつでも動いている。']); return; }
      TM.busy = true;
      try { await TM.duel(npc, c === 0 ? 1 : 3, cool <= 0); } finally { TM.busy = false; }
      var again = await Win.choice(info.short + '：「もう一勝負いくか？」', ['もう一度', 'やめる']); if (again !== 0) { await say(['いい勝負だった。またな。']); return; }
    }
  };
  // 勝負：rounds＝1 か 3（2本先取）。paid：賞金を出せる状態か。戻り値：{ win, me, op, rounds:[...], gold }
  TM.duel = async function (npc, rounds, paid, hooks) {
    var Win = root.Win, State = root.State, CB = root.ChartBattleUI, U = root.Ultimates; var d = State.data; var t = TM.ensure(d); var info = npc.tradeMaster83;
    if (!CB || !U) { await Win.message(['（チャートの画面が使えない）']); return null; }
    var need = rounds > 1 ? 2 : 1; var me = 0, op = 0, log = []; var R = rng((info.seed ^ ((d.steps || 0) * 2654435761)) >>> 0);
    for (var r = 1; r <= rounds && me < need && op < need; r++) {
      var scn = U.newScenario({ cats: info.cats || undefined, diff: info.diff, avoid: t.recent.slice(-20) });
      t.recent.push(scn.id); if (t.recent.length > 40) t.recent = t.recent.slice(-40);
      var label = rounds > 1 ? '第' + r + '戦（' + me + '勝' + op + '敗）' : '1本勝負';
      var badge = rounds > 1 ? '<span class="tm-score">あなた <b>' + me + '</b> － <b>' + op + '</b> ' + esc(info.short) + '</span><span class="tm-round">第' + r + '戦／2本先取（最大3戦）</span>' : '<span class="tm-round">1本勝負</span>';   // v8.8 スコアを常に出す
      var res = await CB.open({ mode: 'duel', title: 'トレードバトル', sub: npc.name + '（' + TIER_NAME[info.tier] + '・' + info.styleName + '派）｜' + label, badge: badge, ind: info.ind, tf: info.tf, scenario: scn, color: '#e8c15a',
        prompt: '相手より多く pips を取れば勝ち（見送りは 0pips）', rival: { name: npc.name, short: info.short, skill: info.skill, atFrac: 0.3 + R() * 0.5, seed: (info.seed + r * 977) >>> 0, independent: true },
        feedback: function (out) { return TM.duelHtml(out, info.short); } });
      if (!res || res.quit) break;
      var j = TM.judge(res.result, res.rival && res.rival.result); if (j > 0) me++; else if (j < 0) op++;
      log.push({ r: r, me: res.result, op: res.rival && res.rival.result, j: j });
      if (hooks && hooks.round) hooks.round(res, j);
    }
    var win = me > op, lose = op > me; var gold = 0;
    // v8.8 記録（実績の表示だけ。賞金・報酬は増やさない）：初勝利・連勝・3本勝負の初勝利・相手ごとの初勝利
    var ach = []; var done = log.length > 0;
    if (done) { if (!t.beat || typeof t.beat !== 'object') t.beat = {}; if (win) { t.streak = (t.streak || 0) + 1; t.bestStreak = Math.max(t.bestStreak || 0, t.streak); if (!t.wins) ach.push('はじめての勝利！'); if (rounds > 1 && !t.win3) { t.win3 = 1; ach.push('3本勝負ではじめての勝利！'); } if (!t.beat[npc.id]) { t.beat[npc.id] = 1; ach.push(info.short + 'に初勝利（勝った相手 ' + Object.keys(t.beat).length + '人）'); } if (t.streak >= 2) ach.push(t.streak + '連勝中（最高 ' + t.bestStreak + '連勝）'); } else t.streak = 0; }
    if (win) { t.wins++; if (paid) { gold = TM.prize(info.tier, rounds); d.gold = (d.gold || 0) + gold; t.gold = (t.gold || 0) + gold; t.paid[npc.id] = d.steps || 0; } }
    else if (lose) t.losses++; else t.draws++;
    var pt = TM.face(info); var say = function (lines) { return Win.message(lines, { name: npc.name, portrait: pt }); };
    var score = rounds > 1 ? '（' + me + '勝' + op + '敗' + (log.length - me - op ? log.length - me - op + '分' : '') + '）' : '';
    if (win) { if (root.Audio) root.Audio.sfx('coin'); await say(['……やるな。今回は俺の負けだ' + score + '。'].concat(gold ? ['賞金 ' + gold + 'G を受け取った！'] : ['（賞金はさっき受け取ったので、今回はなし）'])); }
    if (ach.length && root.Win) await root.Win.message(['【トレードバトルの記録】'].concat(ach).concat(['（通算 ' + t.wins + '勝 ' + t.losses + '敗 ' + t.draws + '分）']));
    else if (lose) await say(['今回は俺の勝ちだ' + score + '。', '根拠がそろうまで待つのも、立派な判断だぞ。']);
    else await say(['引き分けか' + score + '。いい読みだ。']);
    return { win: win, lose: lose, me: me, op: op, rounds: log, gold: gold, achievements: ach };
  };

  /* ---------- 2D 版の見た目：足元の金の輪・頭の上のシルクハット・ローソク足の札（近くでは名前） ---------- */
  TM.drawList = function (map, cam, x0, y0, x1, y1, TS) {
    if (!map || !map.npcs) return []; var p = root.World && root.World.player; var tt = Date.now() / 1000; var d = root.State && root.State.data; var t = d ? TM.ensure(d) : null;
    return map.npcs.filter(function (n) { return n.tradeMaster83 && !n.hidden && n.x >= x0 - 1 && n.x <= x1 + 1 && n.y >= y0 - 1 && n.y <= y1 + 2; }).map(function (n) {
      var info = n.tradeMaster83;
      return { y: n.y * TS + 0.95, draw: function (ctx) {
        var bx = n.x * TS + (n.ox_px || 0) - cam.x, by = n.y * TS + (n.oy_px || 0) - cam.y; var cx = bx + TS / 2; var col = info.color || '#e8c15a'; ctx.save();
        // 足元の金の輪（ゆっくり光る）
        ctx.globalAlpha = 0.55 + Math.sin(tt * 3 + n.x) * 0.2; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(cx, by + TS - 3, TS * 0.46, TS * 0.17, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        // シルクハット（頭の上）
        var hy = by - TS * 0.08; ctx.fillStyle = '#16161e'; ctx.fillRect(cx - TS * 0.28, hy, TS * 0.56, TS * 0.07); ctx.fillRect(cx - TS * 0.18, hy - TS * 0.26, TS * 0.36, TS * 0.27); ctx.fillStyle = col; ctx.fillRect(cx - TS * 0.18, hy - TS * 0.07, TS * 0.36, TS * 0.06);
        // 札（ローソク足の印）
        var top = hy - TS * 0.34 + Math.round(Math.sin(tt * 2.4 + n.x) * 1.5); var w = 20, h = 15;
        ctx.fillStyle = 'rgba(10,14,32,0.9)'; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - w / 2, top - h, w, h, 3); else ctx.rect(cx - w / 2, top - h, w, h); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4cc38a'; ctx.fillRect(cx - 6, top - h + 4, 3.5, 7); ctx.fillRect(cx - 4.8, top - h + 2, 1, 11); ctx.fillStyle = '#e5484d'; ctx.fillRect(cx + 1, top - h + 6, 3.5, 6); ctx.fillRect(cx + 2.2, top - h + 3.5, 1, 10);
        if (t && !t.met[n.id]) { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#ffd24a'; ctx.strokeText('！', cx + 14, top - h + 2); ctx.fillText('！', cx + 14, top - h + 2); }
        if (p && Math.abs(p.x - n.x) + Math.abs(p.y - n.y) <= 3) { var nm = 'トレードマスター ' + (info.short || ''); ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; var tw = ctx.measureText(nm).width + 8; ctx.fillStyle = 'rgba(10,14,32,0.85)'; ctx.fillRect(cx - tw / 2, top - h - 15, tw, 13); ctx.fillStyle = col; ctx.fillText(nm, cx, top - h - 8.5); }
        ctx.restore();
      } };
    });
  };
  (root.MAP_DRAW_LAYERS = root.MAP_DRAW_LAYERS || []).push(function (m, cam, x0, y0, x1, y1, TS) { return TM.drawList(m, cam, x0, y0, x1, y1, TS); });

  TM.install();
})(typeof window !== 'undefined' ? window : globalThis);
