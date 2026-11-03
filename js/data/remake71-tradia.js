/* =========================================================
   Data / v7.1 相場都市トレディアの「空の区画」（乗れるエレベーター・行ける区画）
   ・トレディアの南西の広場（15〜17列・34〜35行）にエレベーターの塔。扉に入ると「乗りますか？」→ 上昇の演出 → 空の区画へ
     3D 版：かごに乗った主人公が上へ動き、カメラもついていく（MTQ3D.ride）。2D 版：画面に高さの表示
   ・空の区画 tradia_sky（雲の上の浮島）：スカイ取引所・展望ラウンジ（2階まで）・スカイ・ブティック（店）・空中庭園・展望デッキ（橋でつながる）
   ・物語・クエストの進行には関わらない（いつでも行ける・戻れる）。既存の建物・人・出来事の座標は変えない
   ========================================================= */
(function (root) {
  'use strict';
  var MAPS = root.MAP_DEFS; if (!MAPS || !MAPS.tradia) return;
  var T = MAPS.tradia; if (T._v71) return;

  /* ---------- 乗り物の演出（2D・3D 共通の入口） ---------- */
  var Ride = root.Ride = root.Ride || {};
  function overlay(on, text) {
    var st = document.getElementById('stage') || document.body; var el = document.getElementById('ride-overlay');
    if (!on) { if (el) el.remove(); return null; }
    if (!el) { el = document.createElement('div'); el.id = 'ride-overlay'; el.style.cssText = 'position:absolute;left:50%;top:18%;transform:translateX(-50%);padding:10px 18px;border-radius:12px;background:rgba(6,16,28,0.78);border:2px solid #46e0ff;color:#bff4ff;font:bold 18px sans-serif;z-index:60;pointer-events:none;text-align:center;letter-spacing:0.05em'; st.appendChild(el); }
    el.textContent = text; return el;
  }
  function D3() { var A = root.MTQ3D; return A && !A.disabled && typeof A.ride === 'function' && A.mode3D && A.mode3D(); }
  Ride.play = function (w) {
    var up = w.ride !== 'down'; var t0 = Date.now(); var el = overlay(true, (up ? '▲ ' : '▼ ') + 'エレベーター ' + (up ? '上昇中' : '下降中'));
    var timer = setInterval(function () { if (!el || !el.parentNode) return clearInterval(timer); var k = Math.min(1, (Date.now() - t0) / 1600); var m = Math.round(up ? k * 420 : 420 - k * 420); el.textContent = (up ? '▲ ' : '▼ ') + 'エレベーター ' + (up ? '上昇中' : '下降中') + '　' + m + 'm'; }, 80);
    var done = function () { clearInterval(timer); };
    var p = D3() ? root.MTQ3D.ride(up ? 'up' : 'down', 'go') : (root.Win && root.Win.sleep ? root.Win.sleep(1300) : Promise.resolve());
    return Promise.resolve(p).then(done, done);
  };
  Ride.arrive = function (w) {
    var up = w.ride !== 'down'; overlay(true, up ? '空の区画　トレディア・スカイ' : '相場都市トレディア');
    var p = D3() ? root.MTQ3D.ride(up ? 'up' : 'down', 'arrive') : (root.Win && root.Win.sleep ? root.Win.sleep(700) : Promise.resolve());
    return Promise.resolve(p).then(function () { overlay(false); }, function () { overlay(false); });
  };

  /* ---------- トレディア：エレベーターの塔 ---------- */
  T.buildings.push({ id: 'td_sky_elevator', type: 'elevator', name: '空の区画へのエレベーター', x: 15, y: 34, w: 3, h: 2, doorX: 1, v71: true });
  T.warps.push({ x: 16, y: 35, to: 'tradia_sky', tx: 19, ty: 19, name: '空の区画へ', ride: 'up', v71: true, ask: 'エレベーターに乗って、空の区画へ行きますか？' });
  T.events.push({ x: 14, y: 36, type: 'inspect', solid: false, v71: true, text: ['【案内板】空の区画「トレディア・スカイ」', '雲の上の浮島。スカイ取引所・展望ラウンジ・スカイ・ブティック・空中庭園・展望デッキ', 'エレベーターは昼も夜も動いています。'] });
  T.npcs.push({ id: 'td_elevator_staff', x: 18, y: 36, sprite: 'guard', dir: 'left', wander: 0, v71: true, talk: async function (c) { await c.say('エレベーター係', ['この塔のてっぺん、雲の上に「空の区画」があるんです。', '下からは見えませんが、上はちょっとした町ですよ。どうぞ、扉からお乗りください。']); } });

  /* ---------- 空の区画（40×30・雲の上の浮島） ---------- */
  var W = 40, H = 30; var g = []; for (var y = 0; y < H; y++) { g.push(new Array(W + 1).join('7').split('')); }
  function set(x, y, ch) { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; }
  function fill(x0, y0, x1, y1, ch) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) set(x, y, ch); }
  // 大きな浮島（角を落とす）
  fill(4, 3, 35, 20, '='); [[4, 3], [35, 3], [4, 20], [35, 20], [5, 3], [34, 3], [4, 4], [35, 4]].forEach(function (p) { set(p[0], p[1], '7'); });
  // 空中庭園（芝・木・花壇・噴水・ベンチ）
  fill(24, 12, 34, 19, '.'); [[25, 13], [33, 13], [25, 18], [33, 18]].forEach(function (p) { set(p[0], p[1], '6'); });
  [[27, 13], [31, 13], [27, 18], [31, 18], [24, 15], [34, 15]].forEach(function (p) { set(p[0], p[1], 'a'); }); set(29, 15, 'Q'); set(27, 16, 'e'); set(31, 16, 'e');
  // 街灯・花壇（広場）
  [[16, 10], [22, 10], [16, 15], [22, 15], [6, 11], [12, 11]].forEach(function (p) { set(p[0], p[1], 'y'); }); [[14, 19], [24, 20]].forEach(function (p) { set(p[0], p[1], 'a'); });
  // 橋と展望デッキ
  fill(18, 21, 20, 22, 'b'); fill(13, 23, 25, 27, ':'); fill(13, 23, 25, 23, 'x'); fill(13, 27, 25, 27, 'x'); fill(13, 23, 13, 27, 'x'); fill(25, 23, 25, 27, 'x'); fill(18, 23, 20, 23, ':');
  set(15, 25, 't'); set(23, 25, 't');
  var rows = g.map(function (r) { return r.join(''); });
  function say(name, lines) { return async function (c) { await c.say(name, lines); }; }
  MAPS.tradia_sky = { id: 'tradia_sky', name: '空の区画トレディア・スカイ', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: rows, v71: true, theme3d: { region: 'sky', place: 'machine_city' },
    buildings: [
      { id: 'sky_elevator', type: 'elevator', name: 'エレベーター（地上へ）', x: 18, y: 17, w: 3, h: 2, doorX: 1, v71: true },
      { id: 'sky_exchange', type: 'bank', name: 'スカイ取引所', x: 5, y: 4, w: 10, h: 5, doorX: 4, interior: 'tradia_sky_exchange', entry: { x: 5, y: 7 }, v71: true },
      { id: 'sky_lounge', type: 'inn', name: '展望ラウンジ', x: 25, y: 4, w: 10, h: 5, doorX: 4, interior: 'tradia_sky_lounge', entry: { x: 5, y: 7 }, v71: true },
      { id: 'sky_boutique', type: 'item', name: 'スカイ・ブティック', x: 5, y: 13, w: 7, h: 4, doorX: 3, interior: 'tradia_sky_boutique', entry: { x: 5, y: 7 }, v71: true }
    ],
    warps: [{ x: 19, y: 18, to: 'tradia', tx: 16, ty: 36, name: '地上へ', ride: 'down', ask: 'エレベーターに乗って、地上のトレディアへ戻りますか？' }],
    chests: [{ id: 'sky1', x: 34, y: 12, item: 'mystic_water', qty: 1 }],
    npcs: [
      { id: 'sky_concierge', x: 21, y: 19, sprite: 'guard', dir: 'down', wander: 0, talk: say('案内係', ['ようこそ、空の区画「トレディア・スカイ」へ。', '北西がスカイ取引所、北東が展望ラウンジ、南西がスカイ・ブティック。南の橋の先が展望デッキです。']) },
      { id: 'sky_trader_a', x: 10, y: 10, sprite: 'merchant', dir: 'down', wander: 1, talk: say('スカイの取引人', ['ここは地上より、ずっと見晴らしがいい。', 'でもね、高い所ほど、落ちたときは痛いんだ。レバレッジと同じさ。登る前に、降り方を決めておく。']) },
      { id: 'sky_trader_b', x: 19, y: 12, sprite: 'scholar', dir: 'left', wander: 1, talk: say('若い取引人', ['雲の上からだと、下の町の人の流れがよく見えるんです。', '人が一斉に同じ方向へ走りだしたら……それはたいてい、もう遅いサインです。']) },
      { id: 'sky_gardener', x: 26, y: 15, sprite: 'villager_m', dir: 'right', wander: 1, talk: say('空の庭師', ['雲の上でも、花はちゃんと咲くよ。水と日の光と、時間さえあればね。', '急いで肥料をやりすぎると、根が焼けて枯れてしまうんだ。']) },
      { id: 'sky_child', x: 30, y: 17, sprite: 'child', dir: 'down', wander: 2, talk: say('空の区画の子ども', ['展望デッキの望遠鏡、見た？ ポヨ村まで見えるって、ほんとかな！']) },
      { id: 'sky_lookout', x: 22, y: 24, sprite: 'guard', dir: 'up', wander: 0, talk: say('デッキの見張り', ['ここから大陸を見下ろすと、どの道がどの町へつながっているか、ひと目でわかる。', '地上で迷ったら、一度高い所から見直すといい。']) }
    ],
    events: [
      { x: 17, y: 19, type: 'inspect', solid: false, text: ['【案内板】トレディア・スカイ', '北西：スカイ取引所　北東：展望ラウンジ　南西：スカイ・ブティック', '東：空中庭園　南の橋の先：展望デッキ'] },
      { x: 29, y: 15, type: 'inspect', solid: true, text: ['雲の上の噴水だ。どこから水を引いているのかは、誰も知らないらしい。'] },
      { x: 15, y: 25, type: 'inspect', solid: true, text: ['望遠鏡をのぞいた。', '雲のすき間から、マクディアの魔導都と、遠くの海が見える。', '地上では見えなかった道のつながりが、ここからだとよくわかる。'] },
      { x: 23, y: 25, type: 'inspect', solid: true, text: ['望遠鏡をのぞいた。', 'はるか西の地平線に、アルカディア大陸の山なみがかすんでいる。', 'ずいぶん遠くまで来たものだ。'] }
    ] };
  // 屋内
  function add(def) { def.v71 = true; MAPS[def.id] = def; return def; }
  add({ id: 'tradia_sky_exchange', name: 'スカイ取引所', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKKK__KKKK#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#_t__t__t__#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'tradia_sky', tx: 9, ty: 9 }],
    npcs: [
      { id: 'sky_broker', x: 5, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: say('取引所の係', ['スカイ取引所へようこそ。ここの画面には、大陸じゅうの相場が映っています。', 'もっとも、画面が大きくても、見るべきものは同じ。まず大きな流れ、それから入る場所です。']) },
      { id: 'sky_analyst', x: 8, y: 6, sprite: 'scholar', dir: 'up', wander: 1, talk: say('分析係', ['毎日、上の足から順に見ていきます。日足、4時間足、それから1時間足。', '下の足の小さな動きだけ見ていると、大きな流れに逆らっていることに気づけないんです。']) }
    ],
    events: [{ x: 1, y: 1, type: 'inspect', solid: true, text: ['壁いっぱいの相場の画面だ。ローソク足が、静かに一本ずつ増えていく。', '（学習用の人工の相場です。実在の値動きではありません）'] }] });
  add({ id: 'tradia_sky_lounge', name: '展望ラウンジ 1階', kind: 'interior', bgm: 'town', rows: [
    '############', '#TTTT_____<#', '#__________#', '#_t__t__t__#', '#__________#', '#_t__t__t__#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'tradia_sky', tx: 29, ty: 9 }, { x: 10, y: 1, to: 'tradia_sky_lounge_2f', tx: 10, ty: 2, name: '2階へ' }],
    npcs: [
      { id: 'sky_bartender', x: 2, y: 2, sprite: 'bartender', dir: 'down', wander: 0, talk: say('ラウンジの店主', ['いらっしゃい。雲の上で飲むスカイティーは格別ですよ。', 'お客さんの中には、大きく勝った日ほど早く帰る人がいます。……ああいう人が、長くここに来られるんです。']) },
      { id: 'sky_guest', x: 7, y: 4, sprite: 'villager_f', dir: 'left', wander: 0, talk: say('ラウンジの客', ['2階の窓からの眺め、おすすめよ。夕方は雲が金色になるの。']) }
    ] });
  add({ id: 'tradia_sky_lounge_2f', name: '展望ラウンジ 2階', kind: 'interior', bgm: 'town', rows: [
    '############', '#_________>#', '#__________#', '#__tt__tt__#', '#__________#', '#__tt__tt__#', '#__________#', '#__________#', '############'
  ], warps: [{ x: 10, y: 1, to: 'tradia_sky_lounge', tx: 9, ty: 1, name: '1階へ' }],
    events: [{ x: 3, y: 3, type: 'inspect', solid: true, text: ['大きな窓の外は、一面の雲の海だ。', '雲の切れ目から、ときどき地上の町の明かりがのぞく。'] }],
    npcs: [{ id: 'sky_painter', x: 8, y: 6, sprite: 'villager_m', dir: 'up', wander: 0, talk: say('絵描き', ['雲は毎日ちがう形をしている。同じ雲は二度と来ない。', 'だから描くときは、目の前の雲だけを見るんだ。昨日の雲を思い出してもしかたない。']) }] });
  add({ id: 'tradia_sky_boutique', name: 'スカイ・ブティック', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKK_qq_KKK#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#__zz______#', '#__t____t__#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'tradia_sky', tx: 8, ty: 17 }],
    npcs: [{ id: 'sky_boutique_keeper', x: 5, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('ブティックの店主', ['雲の上の特別な品をそろえております。お値段も、少々雲の上ですが。']); await c.shop('item', ['hi_ether', 'phoenix_feather', 'spirit_drop', 'mystic_water', 'elixir']); } }] });
  T._v71 = true;
  root.REMAKE71 = root.REMAKE71 || {}; root.REMAKE71.tradiaSky = { maps: ['tradia_sky', 'tradia_sky_exchange', 'tradia_sky_lounge', 'tradia_sky_lounge_2f', 'tradia_sky_boutique'] };
})(typeof window !== 'undefined' ? window : globalThis);
