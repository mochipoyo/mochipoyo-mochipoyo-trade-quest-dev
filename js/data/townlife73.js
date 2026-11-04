/* =========================================================
   Data / v7.3 町のにぎわい：動物（犬・猫・家畜）と、個性的な町の人30人
   ・動物：すべての町（物語の場面のアサナ村・空の区画は除く）と城（リヴェル城・魔導王宮・王都の王宮 西棟）に、犬と猫、
     町のテーマに合わせた家畜（にわとり・牛・羊・豚・馬・らくだ）を置く。絵は js/core/animals73.js（2D）・three-src/src/entities/Animal3D.js（3D）
   ・個性的な町の人：仲間にはならない30人を各地に1〜2人ずつ。話しかけるたびに、その人らしい3つの話を順に話す（d.chat に回数を記録）
     見た目は新しい色の組（Chars.addPalette）。3D は共通の人のモデル（model3d）
   ・置く場所：その地図でいちばん大きくつながった歩ける場所のうち、周りの8マスも歩けて、出入口・人・宝箱・出来事・調べる所から離れたマス
     （1マスだけふさいでも周りを回れるので、行ける所は減らない）。決まった乱数（地図のID）で選ぶので毎回同じ場所
   ・元の地図の地形・人・出来事は変えない（人を足すだけ。印 v73）
   ========================================================= */
(function (root) {
  'use strict';
  var MAPS = root.MAP_DEFS; if (!MAPS || root.TOWNLIFE73) return;
  var X = root.TOWNLIFE73 = { animals: [], chars: [], skipped: [] };
  var TL = root.Tiles;
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function say(name, lines) { return async function (c) { await c.say(name, lines); }; }
  // 足す前の中身を def._pre71 に控える（テストで元と比べるため。ゲームでは使わない。v7.1・v7.2 で控えた町はそのまま）
  var cl = function (L) { return (L || []).map(function (o) { return o && typeof o === 'object' ? Object.assign({}, o) : o; }); };
  function pre(d) { if (!d._pre71) d._pre71 = { rows: d.rows.slice(), warps: cl(d.warps), events: cl(d.events), chests: cl(d.chests), npcs: cl(d.npcs), buildings: cl(d.buildings) }; }
  // 話しかけるたびに次の話（記録：d.chat['v73:ID']）
  function rotate(id, name, sets) {
    return async function (c) { var d = root.State && root.State.data; var st = d ? (d.chat || (d.chat = {})) : {}; var k = 'v73:' + id; var n = st[k] | 0; st[k] = n + 1; await c.say(name, sets[n % sets.length]); };
  }

  /* ---------- 置ける場所を探す ---------- */
  function grid(id) {
    var d = MAPS[id]; if (!d || typeof d.rows === 'function') return null;
    var H = d.rows.length, W = d.rows[0].length; var name = []; var solid = [];
    for (var y = 0; y < H; y++) { name.push([]); solid.push([]); for (var x = 0; x < W; x++) { var n = TL.byChar[d.rows[y][x]] || d.fallback || 'grass'; name[y].push(n); solid[y].push(TL.isSolid(n)); } }
    var busy = {}; var mark = function (x, y, r) { for (var yy = y - r; yy <= y + r; yy++) for (var xx = x - r; xx <= x + r; xx++) busy[xx + ',' + yy] = Math.max(busy[xx + ',' + yy] || 0, 1); };
    (d.buildings || []).forEach(function (b) { var bw = b.w || 5, bh = b.h || 3; for (var yy = b.y; yy < b.y + bh; yy++) for (var xx = b.x; xx < b.x + bw; xx++) if (solid[yy] && xx >= 0 && xx < W) solid[yy][xx] = true; var dx = b.x + (b.doorX === undefined ? 2 : b.doorX), dy = b.y + bh - 1; mark(dx, dy + 1, 2); });
    (d.warps || []).forEach(function (w) { mark(w.x, w.y, 2); });
    (d.events || []).forEach(function (e) { mark(e.x, e.y, 1); if (e.solid && solid[e.y]) solid[e.y][e.x] = true; });
    (d.chests || []).forEach(function (c) { mark(c.x, c.y, 1); });
    (d.npcs || []).forEach(function (n) { mark(n.x, n.y, 2); });
    (root.SEARCH_POINTS || []).forEach(function (p) { if (p.map === id) mark(p.x, p.y, 1); });
    var TM = root.TRADER_MASTERS || {}; Object.keys(TM).forEach(function (k) { var m = TM[k]; if (m && m.map === id) mark(m.x, m.y, 2); });   // 師匠の立つ所（js/rpg/masters.js が後から置く）
    // 外周の2マス（町の外への出口）は使わない
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) busy[x + ',' + y] = 1;
    // いちばん大きくつながった歩ける場所
    var comp = {}, best = null, bestN = 0, cid = 0;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (solid[y][x] || comp[x + ',' + y] !== undefined) continue; cid++; var q = [[x, y]]; comp[x + ',' + y] = cid; var cnt = 0;
      while (q.length) { var p = q.pop(); cnt++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) { var nx = p[0] + dd[0], ny = p[1] + dd[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H || solid[ny][nx] || comp[nx + ',' + ny] !== undefined) return; comp[nx + ',' + ny] = cid; q.push([nx, ny]); }); }
      if (cnt > bestN) { bestN = cnt; best = cid; }
    }
    return { d: d, W: W, H: H, name: name, solid: solid, busy: busy, comp: comp, main: best, used: [] };
  }
  function free(g, x, y) {
    if (g.comp[x + ',' + y] !== g.main || g.busy[x + ',' + y]) return false;
    for (var yy = y - 1; yy <= y + 1; yy++) for (var xx = x - 1; xx <= x + 1; xx++) if (g.solid[yy][xx]) return false;   // 周りの8マスも歩ける
    for (var i = 0; i < g.used.length; i++) if (Math.max(Math.abs(g.used[i][0] - x), Math.abs(g.used[i][1] - y)) < 3) return false;
    return true;
  }
  var GRASS = { grass: 1, grass2: 1, flowers: 1, crops: 1, sand: 1, snow: 1 };
  function near(g, x, y, r, test) { for (var yy = y - r; yy <= y + r; yy++) for (var xx = x - r; xx <= x + r; xx++) if (g.name[yy] && g.name[yy][xx] && test(g.name[yy][xx], xx, yy)) return true; return false; }
  // 好み：farm＝草地や畑・柵の近く、wall＝家の壁ぎわ、any＝どこでも
  function pick(g, pref, rnd) {
    var cands = [];
    for (var y = 2; y < g.H - 2; y++) for (var x = 2; x < g.W - 2; x++) {
      if (!free(g, x, y)) continue; var s = rnd();
      if (pref === 'farm') { if (GRASS[g.name[y][x]]) s += 1.2; if (near(g, x, y, 2, function (n) { return n === 'fence' || n === 'crops'; })) s += 1.5; }
      else if (pref === 'wall') { if (near(g, x, y, 2, function (n, xx, yy) { return g.solid[yy][xx] && !/tree|forest|water|deep|shallow/.test(n); })) s += 1; }
      else if (pref === 'road') { if (/road|stone|path_stone|floor_stone|carpet/.test(g.name[y][x])) s += 0.8; }
      cands.push([s, x, y]);
    }
    if (!cands.length) return null; cands.sort(function (a, b) { return b[0] - a[0]; }); var c = cands[0]; g.used.push([c[1], c[2]]); g.busy[c[1] + ',' + c[2]] = 1; return { x: c[1], y: c[2] };
  }

  /* ---------- 動物 ---------- */
  var VOICE = {
    dog: [['ワン！ ワンワン！', '（しっぽがちぎれそうなほど振っている）'], ['クゥーン……', '（なでてほしそうに、頭を寄せてきた）'], ['ワフッ！', '（毎朝、決まった時間に散歩に行くらしい。……規則正しい犬だ）']],
    cat: [['ニャー。', '（ちらっと見て、またそっぽを向いた）'], ['ゴロゴロ……', '（足もとにすり寄ってきた）'], ['……。', '（獲物が来るまで、じっと動かずに待っている。待つのも仕事のうちらしい）']],
    chicken: [['コケッ、コッコッ。', '（地面をつついて、何かを探している）'], ['コケコッコー！', '（胸を張って、元気よく鳴いた）']],
    cow: [['モォ〜〜。', '（のんびりと草をはんでいる）'], ['モォ。', '（大きな目で、じっとこちらを見ている）']],
    sheep: [['メェ〜。', '（もこもこの毛が、ふかふかだ）'], ['メェェ。', '（仲間のそばを、ぜったいに離れない）']],
    pig: [['ブヒッ、ブヒブヒ。', '（鼻をひくひくさせて、えさを探している）'], ['ブゥ。', '（日なたで、気持ちよさそうに寝転んだ）']],
    horse: [['ヒヒーン！', '（たてがみを揺らして、鼻を鳴らした）'], ['ブルルッ。', '（よく手入れされた、つやつやの毛並みだ）']],
    camel: [['グルル……。', '（長いまつげの下から、眠そうにこちらを見ている）'], ['ブフゥ。', '（何日でも砂の道を歩けそうな、どっしりした足だ）']]
  };
  // 町のテーマごとの家畜
  var STOCK = {
    pastoral: ['cow', 'sheep', 'sheep', 'pig', 'chicken', 'chicken', 'chicken'], forest: ['sheep', 'pig', 'chicken', 'chicken'], royal: ['horse', 'horse_w', 'chicken', 'chicken'],
    harbor: ['chicken', 'chicken', 'pig'], mine: ['horse', 'pig', 'chicken'], bureau: ['horse_k', 'chicken'], ruins: ['chicken_b', 'sheep_k'], clock: ['horse', 'chicken'],
    machine: ['chicken', 'pig'], arcane: ['sheep', 'chicken'], sky: ['sheep', 'chicken'], dark: ['horse', 'horse_k'], desert: ['camel', 'camel', 'sheep', 'chicken_b'],
    forge: ['horse', 'pig', 'chicken_b'], frost: ['sheep', 'sheep', 'horse_w'], casino: ['horse_w', 'chicken'], academy: ['sheep', 'chicken', 'chicken'], tech: ['chicken', 'chicken'],
    temple: ['sheep', 'chicken'], library: ['chicken']
  };
  var DOGS = ['dog', 'dog_w', 'dog_k', 'dog_s'], CATS = ['cat', 'cat_k', 'cat_g', 'cat_w'];
  var WANDER = { dog: 2, cat: 2, chicken: 2, pig: 1, sheep: 1, cow: 1, horse: 1, camel: 1 };
  function addAnimal(id, g, sp, pref, rnd, i) {
    var kind = sp.split('_')[0]; var at = pick(g, pref, rnd); if (!at) { X.skipped.push(id + ':' + sp); return; }
    var v = VOICE[kind]; var lines = v[(hash(id) + i) % v.length]; var nm = (root.AnimalArt && root.AnimalArt.NAMES[kind]) || '動物';
    var n = { id: id + '_a73_' + i, name: nm, x: at.x, y: at.y, sprite: 'animal_' + sp, dir: ['down', 'left', 'right', 'up'][Math.floor(rnd() * 4)], wander: WANDER[kind], animal: kind, noChatter: true, v73: true, talk: say(nm, lines) };
    pre(g.d); g.d.npcs = (g.d.npcs || []).concat([n]); X.animals.push({ map: id, kind: kind, sprite: n.sprite, x: at.x, y: at.y });
  }
  function themeOf(id) { var P = root.PLACE_DECOR; return (P && P.forMap && P.forMap(id)) || 'pastoral'; }
  var TOWNS = Object.keys(MAPS).filter(function (id) { var d = MAPS[id]; return d && (d.kind || 'town') === 'town' && !d.s3121 && !d.region && id !== 'tradia_sky' && typeof d.rows !== 'function'; });
  var CASTLES = ['rivel_castle', 'magicka_palace', 'sentra_palace_west'].filter(function (id) { return MAPS[id]; });
  X.TOWNS = TOWNS; X.CASTLES = CASTLES;
  TOWNS.forEach(function (id) {
    var g = grid(id); if (!g) { X.skipped.push(id); return; } var rnd = rng(hash(id + ':a73')); var k = themeOf(id); var big = g.W >= 66; var i = 0;
    addAnimal(id, g, DOGS[hash(id) % DOGS.length], 'road', rnd, i++); addAnimal(id, g, CATS[hash(id + 'c') % CATS.length], 'wall', rnd, i++);
    if (big) { addAnimal(id, g, DOGS[(hash(id) + 1) % DOGS.length], 'any', rnd, i++); addAnimal(id, g, CATS[(hash(id + 'c') + 1) % CATS.length], 'wall', rnd, i++); }
    if (k === 'harbor') addAnimal(id, g, CATS[(hash(id + 'c') + 2) % CATS.length], 'any', rnd, i++);   // 港には猫が多い
    (STOCK[k] || STOCK.pastoral).forEach(function (sp) { addAnimal(id, g, sp, 'farm', rnd, i++); });
  });
  CASTLES.forEach(function (id) {
    var g = grid(id); if (!g) return; var rnd = rng(hash(id + ':a73')); var i = 0;
    addAnimal(id, g, id === 'magicka_palace' ? 'cat_k' : 'dog_w', 'any', rnd, i++); addAnimal(id, g, id === 'magicka_palace' ? 'cat_g' : 'cat', 'wall', rnd, i++);
    if (id === 'rivel_castle') addAnimal(id, g, 'dog_s', 'any', rnd, i++);   // 城の番犬は2匹
  });

  /* ---------- 個性的な町の人30人（仲間にはならない） ---------- */
  // pal：H 髪・B 服・A 帯・L ズボン・T 靴・M 帽子（あれば）。model3d：3D の共通モデル
  var P = function (H, B, A, L, T, M) { var o = { H: H, B: B, A: A, L: L || '#3a3a4a', T: T || '#4a2e1a' }; if (M) o.M = M; return o; };
  var CHARS = [
    { id: 'toto', map: 'poyo_village', name: 'ねぼすけのトト', m: 'villager_m', pal: P('#e8a040', '#8aa8e0', '#f0f0f0', '#5a6aa8'), w: 0, lines: [
      ['ふわぁ……。おいらはトト。寝るのが仕事さ。', 'え、それは仕事じゃないって？ だいじょうぶ。起きる時間は、ちゃんと目覚ましに任せてある。'],
      ['相場も、寝ている間に動くんだって。', 'ずっと見張っているより、「ここまで来たら起こして」って決めて寝るほうが、ぐっすり眠れるらしいよ。'],
      ['……Zzz。', '（立ったまま寝ている。器用だ）']] },
    { id: 'rondo', map: 'rivel_town', name: '吟遊詩人ロンド', m: 'villager_m', pal: P('#3a2a5a', '#a83a6a', '#e8c050', '#2a2440'), w: 1, lines: [
      ['やあ、旅の人。ぼくはロンド、町から町へ歌を運ぶ吟遊詩人さ。', '♪上る坂には 下りもある～ 下りる坂にも 底がある～♪'],
      ['歌はね、同じ節をくり返すから覚えられるんだ。', '♪勝った日も 負けた日も 同じ手順で～♪……地味だけど、いい歌詞だろう？'],
      ['リヴェルの城の跳ね橋は、夕方がいちばんきれいだよ。', '歌が浮かばないときは、橋の上で、ひらめくのを気長に待つんだ。']] },
    { id: 'mil', map: 'rivel_town', name: '迷子のミル', m: 'child', pal: P('#c84a2a', '#f0c040', '#4a8a4a', '#5a4a3a'), w: 1, lines: [
      ['うぇーん……あ、ううん、迷子じゃないもん！ ちょっと道が分からないだけ！', '……それを迷子っていうの？'],
      ['ママがね、迷ったら高いところから町を見なさいって。', '塔の上から見ると、道がぜんぶつながって見えるんだよ！'],
      ['あたし、ミル！ 名札もってるの。', '（首から「まいごになったら しろのまえの ふんすいへ」と書いた札を下げている）']] },
    { id: 'sebas', map: 'rivel_castle', name: '老執事セバス', m: 'elder', pal: P('#d8d8d8', '#2a2a3a', '#f0f0f0', '#1a1a24', '#1a1a1a'), w: 0, lines: [
      ['これはこれは。わたくし、当城に五十年お仕えしております執事のセバスと申します。', 'お茶の時間は、毎日きっかり三時。一度も遅れたことはございません。'],
      ['決めた時刻に、決めたことをする。', '年寄りの知恵でございますが、それだけで、たいていの失敗は避けられるものでございます。'],
      ['王様は、ときどきお茶の時間を忘れて、会議に夢中になられます。', '……そのたびに、わたくしが三時をお知らせに参るのです。']] },
    { id: 'gante', map: 'rivel_artisan', name: '研ぎ師ガンテ', m: 'villager_m', pal: P('#4a3a2a', '#6a5a4a', '#c8a060', '#3a3028'), w: 0, lines: [
      ['研ぎ師のガンテだ。刃物なら何でも研ぐぞ。', '切れなくなった刃物を力まかせに使うから、余計に欠けるんだ。'],
      ['道具は毎日、少しずつ手入れするのがいい。', '一度にまとめてやろうとすると、どこが悪かったのか分からなくなるからな。'],
      ['おまえさんの決まりごとも、たまには研ぎ直してやれよ。', 'なまくらな決まりは、いざというとき役に立たん。']] },
    { id: 'porchi', map: 'dow_village', name: 'きのこ博士ポルチ', m: 'scholar', pal: P('#8a5a2a', '#a83a2a', '#f0e0c0', '#5a3a2a', '#4a2e1a', '#d0402a'), w: 1, lines: [
      ['ようこそ！ わしはきのこ博士のポルチ。この森のきのこは百二十種、ぜんぶ覚えておる。', 'この帽子かね？ 好きが高じて、こうなった。'],
      ['いいかね、食べられるきのこと毒きのこは、よく似ておる。', '形が似ているからといって、同じだと思いこむのが、いちばん危ない。'],
      ['迷ったら、食べない。', 'きのこでも何でも、それが長生きの秘訣じゃよ。']] },
    { id: 'drif', map: 'harbor_town', name: '船酔い船長ドリフ', m: 'sailor', pal: P('#2a2a2a', '#2a4a8a', '#f0f0f0', '#1a2a4a', '#1a1a1a', '#f0f0f0'), w: 0, lines: [
      ['おれは船長のドリフ。……うっぷ。', '海の男が船酔いとは笑うがいい。だが、おかげで波の変化には誰よりも敏感だ。'],
      ['波の高い日は、船を出さない。', '腕自慢の連中ほど、そういう日に限って出ていくんだがな。'],
      ['凪の日に、ゆっくり進む。それで十分、目当ての港に着く。', '……うっぷ。陸の上でも、ちょっと揺れてきた。']] },
    { id: 'sheri', map: 'harbor_town', name: '貝殻集めのシェリ', m: 'villager_f', pal: P('#f0d060', '#5ad0d0', '#f0a0b0', '#3a6a8a'), w: 1, lines: [
      ['見て見て！ 今朝ひろった貝殻！ 同じ形のは、一つもないのよ。', 'あたしはシェリ。浜辺のことなら何でも聞いて！'],
      ['潮が引いたあとの浜には、きれいな貝がたくさん残るの。', '満ち潮のときに慌てて探しても、波にさらわれるだけ。潮が引くのを待つのがコツね。'],
      ['集めた貝殻は、種類ごとにびんに分けてしまってあるの。', '分けておくと、どの貝が珍しいのか、ひと目で分かるでしょ？']] },
    { id: 'bardo', map: 'verum_town', name: '歌う坑夫バルド', m: 'villager_m', pal: P('#3a2a1a', '#8a6a3a', '#f0b030', '#4a3a2a', '#3a2a1a', '#e8c040'), w: 1, lines: [
      ['♪掘って～ 掘って～ また掘って～♪ おう、坑夫のバルドだ！', '坑道で歌うのはな、仲間に「ここにいるぞ」って知らせるためさ。'],
      ['いい鉱脈ほど、ゆっくり掘る。', '急いで掘ると、天井が落ちてくるからな。……ありゃあ二度と見たくねえ。'],
      ['ランプの油が切れたら、その日の仕事はおしまい。', 'どんなに鉱脈が近くても、だ。暗い中で掘っても、ろくなことはねえ。']] },
    { id: 'kenta', map: 'kalion_city', name: '数え屋ケンタ', m: 'villager_m', pal: P('#1a1a1a', '#e8e8e0', '#a83a3a', '#3a3a4a'), w: 0, lines: [
      ['いらっしゃい。ぼくは数え屋のケンタ。この町の石だたみは、ちょうど四千二百十一枚あります。', '数えましたから。三回。'],
      ['数えると、気分じゃなくて事実が分かるんです。', '「今日はよく勝った気がする」より「十回中六回」のほうが、ずっと役に立つでしょう？'],
      ['今日、ぼくに話しかけた人は、あなたで七人目です。', '……記録しておきます。']] },
    { id: 'painter', map: 'erased_village', name: '名もなき絵描き', m: 'villager_f', pal: P('#7a7a7a', '#8a7a6a', '#c8b8a0', '#5a5048'), w: 0, lines: [
      ['……わたしの名前？ ……思い出せないの。この村と同じね。', 'でも、絵なら描ける。覚えている景色だけを、少しずつ。'],
      ['記憶はあいまいでも、描いたものは残るわ。', 'だから毎日、見たものを描いて残しておくの。……忘れても、見返せるように。'],
      ['（キャンバスには、にぎやかだったころの村が描かれている）', '……ここに井戸があって、ここで子どもたちが遊んでいたの。']] },
    { id: 'poire', map: 'sentra_capital', name: '噂好きのマダム・ポワ', m: 'villager_f', pal: P('#a83a8a', '#e8a0c8', '#e8c050', '#8a4a7a'), w: 1, lines: [
      ['あら、ご存じ？ 王宮の帳簿係が、また新しい眼鏡を買ったんですって！', 'わたくし、王都の噂なら何でも知っていてよ。'],
      ['噂は聞くのは楽しいけれど、信じて動くのは別のお話。', 'わたくしも昔、「あの店がつぶれる」という噂を信じて、お気に入りのお店の会員券を手放して……あとで大後悔したわ。'],
      ['いちばん確かな噂の聞き方？ 自分の目で確かめることよ。', '……あら、それじゃ噂じゃなくなっちゃうわね。おほほ。']] },
    { id: 'yot', map: 'aruna_village', name: '流木彫りのヨット', m: 'villager_m', pal: P('#c8b080', '#5a7a5a', '#8a5a3a', '#4a4a3a'), w: 0, lines: [
      ['浜に流れ着いた木を彫っている。ヨットだ。', '木の形をよく見て、そこにいる生きものを彫り出すんだ。無理な形にはしない。'],
      ['木目に逆らって彫ると、割れる。', '流れに沿えば、すっと刃が入る。何でもそういうものさ。'],
      ['（手の中で、小さな木の魚ができあがりつつある）', '島の子どもたちに配るんだ。少しでも、笑ってほしくてな。']] },
    { id: 'riko', map: 'aruna_ruins', name: '瓦礫の庭師リコ', m: 'child', pal: P('#5a8a3a', '#c8a050', '#f0e080', '#5a4a2a'), w: 1, lines: [
      ['ここ、昔はおうちだったんだって。今は、わたしのお庭。', '瓦礫のすき間にも、花はちゃんと咲くのよ。'],
      ['毎日すこしずつ、石をどけて、土を入れて、種をまくの。', '一日じゃ何も変わらないけど、ひと月たつと、ちゃんと緑になるんだから。'],
      ['花の名前？ まだないの。', 'ここで初めて咲いた花だから、わたしが名前をつけてあげるの。']] },
    { id: 'chikuta', map: 'tempus_city', name: '遅刻魔のチクタ', m: 'villager_m', pal: P('#e8c040', '#4a8ad8', '#e8e8e8', '#2a3a5a'), w: 1, lines: [
      ['ああっ、また遅刻だ！ 鐘の都に住んでいるのに！', 'ぼくはチクタ。時計を三つも持っているのに、なぜか間に合わないんだ。'],
      ['原因？ 三つの時計が、ぜんぶ違う時刻を指しているから……かな。', 'どれを信じればいいか迷っているうちに、遅れちゃうんだ。'],
      ['今日から、見る時計を一つに決めたんだ！', '……でも、どれにするか決めるのに、まだ迷ってる。']] },
    { id: 'bit', map: 'node_city', name: '機械好きのビット', m: 'scholar', pal: P('#3ad0d0', '#3a3a4a', '#46e0ff', '#2a2a34'), w: 0, lines: [
      ['……ああ、ごめん。いま、この配電盤とお話ししてたんだ。ぼくはビット。', '機械はね、うそをつかないから好きなんだ。'],
      ['同じ入力には、同じ出力。', '人間もそうなら楽なのに、って思うよ。……でも、ぼく自身がいちばん気分屋なんだけどね。'],
      ['機械が止まったら、まず電源と配線を見る。', '難しいところを疑うのは、そのあとでいい。たいていは、単純な原因なんだ。']] },
    { id: 'rei', map: 'scheduled_district', name: '決まり破りのレイ', m: 'villager_f', pal: P('#2a2a2a', '#c83a3a', '#2a2a2a', '#2a2a34', '#1a1a1a'), w: 1, lines: [
      ['……何？ ここの決まりなら守ってないよ。あたしはレイ。', '誰かが決めた時刻に起きて、誰かが決めた時刻に寝るなんて、まっぴら。'],
      ['でもね、自分で決めた決まりは、ぜったい破らない。', 'それが、あたしのたった一つの決まり。'],
      ['人に決められた決まりは、破りたくなる。', '自分で決めた決まりは、破ると自分がかっこ悪い。……違いは、そこだけだよ。']] },
    { id: 'fizz', map: 'magicka_city', name: '魔導士見習いフィズ', m: 'scholar', pal: P('#a060ff', '#5a3a9a', '#ffd24a', '#3a2a5a', '#2a2440', '#5a3a9a'), w: 1, lines: [
      ['ボンッ！ ……けほっ、けほっ。あ、こんにちは。魔導士見習いのフィズです。', 'いまのは、お茶をわかす魔法……の、つもりでした。'],
      ['失敗した魔法は、ぜんぶノートに書いています。', '何をしたら、どうなったか。書いておくと、同じ失敗は二度としないんです。……たぶん。'],
      ['先生が言うには、失敗の数だけ上手になるんですって。', 'だとしたら、わたし、もうすぐ大魔導士です！']] },
    { id: 'stella', map: 'star_camp', name: '流れ星を数えるステラ', m: 'villager_f', pal: P('#e8e0f8', '#2a3a6a', '#fff0a0', '#1a2440'), w: 0, lines: [
      ['しーっ。いま、流れ星を数えているの。……三十七。', 'わたしはステラ。毎晩、空を見て、流れた数を記録しているわ。'],
      ['流れ星がたくさん見える夜もあれば、一つも見えない夜もある。', 'でも、一つも見えなかった夜の記録も、ちゃんと大事な記録なのよ。'],
      ['願いごと？ ……流れ星にはしないわ。', 'かなえたいことは、自分の手帳に書いておくの。そのほうが、忘れないもの。']] },
    { id: 'grill', map: 'dark_camp', name: '料理番のグリル軍曹', m: 'guard', pal: P('#3a2a1a', '#5a6a3a', '#f0f0f0', '#3a4028'), w: 0, lines: [
      ['おう、腹は減ってないか！ 料理番のグリル軍曹だ！', '戦の前の腹ごしらえ。これを抜いたやつから倒れていくんだ。'],
      ['兵士の腹を満たすには、毎日同じ量を、同じ時刻に作る。', '調子に乗って倍も作ると、たいてい余らせて捨てることになる。'],
      ['今日の献立は、豆と干し肉のスープだ。', '……昨日もそうだった？ 明日もそうだ。文句があるやつは自分で作れ！']] },
    { id: 'mirage', map: 'sahar_city', name: '蜃気楼売りのミラジュ', m: 'merchant', pal: P('#2a1a0a', '#e8a040', '#3a8ab8', '#6a4a2a'), w: 0, lines: [
      ['いらっしゃい！ 蜃気楼はいかが？ 砂漠のかなたに浮かぶ、きれいな湖だよ！', '……え、買えないのかって？ 見るのはタダさ。'],
      ['蜃気楼の湖をめざして歩いていった旅人を、何人も見たよ。', '見えているものが、そこにあるとは限らない。砂漠の常識さ。'],
      ['本物の水場はね、地図と、先に歩いた人の足跡で探すんだ。', 'きらきら光って見えるほうへ行くのは、だいたい外れだね。']] },
    { id: 'negi', map: 'mirror_market', name: '値切り名人のネギ婆', m: 'elder', pal: P('#c8c8c8', '#4a8a4a', '#e8e0a0', '#3a5a3a'), w: 0, lines: [
      ['ひっひっひ。わしはネギ婆。この市場で、言い値で買ったことは一度もないよ。', '先に「この値段なら買う」と決めておく。それより高けりゃ、さっさと帰る。'],
      ['店の主人が「今だけ」「最後の一つ」と言いだしたら、要注意さね。', '焦らせるのは、売る側の得意技だよ。'],
      ['何も買わずに帰る日があってもいいんだよ。', '欲しくもないものを安く買うより、何も買わないほうが、ずっと得さ。']] },
    { id: 'homura', map: 'ignas_town', name: '火の番のホムラ', m: 'villager_f', pal: P('#e84a2a', '#3a2a2a', '#ff8a30', '#2a1a1a'), w: 0, lines: [
      ['……火の番をしているの。ホムラ。', 'この炉の火は、百年消えていないのよ。'],
      ['強すぎる火は、鉄を焦がす。弱すぎる火では、鉄を鍛えられない。', 'ちょうどいい火加減を、ずっと保つ。それがいちばん難しいの。'],
      ['気持ちも、火と同じよ。', 'かっとなったら、ふいごを止めて、少し待つ。それだけで、たいていの失敗は防げるわ。']] },
    { id: 'tundra', map: 'ciel_port', name: '氷釣りのツンドラ爺', m: 'elder', pal: P('#f0f0f0', '#4a6a8a', '#c8a070', '#3a4a5a', '#3a2a1a', '#8a3a3a'), w: 0, lines: [
      ['……しっ。魚が逃げる。', '……わしはツンドラ。氷に穴をあけて、朝から釣り糸をたれておる。'],
      ['今日は、まだ一匹も釣れておらん。', 'だが、釣れないからと穴を移してまわる者ほど、何も釣れんものじゃ。'],
      ['（ぴくり、と糸が動いた）', '……まだじゃ。本当に食いつくまで、待つ。']] },
    { id: 'yuki', map: 'frost_town', name: '雪だるま職人のユキ', m: 'child', pal: P('#f0f0f8', '#a8e8ff', '#e84a4a', '#5a7a9a'), w: 1, lines: [
      ['いらっしゃい！ ユキの雪だるま工房へようこそ！', 'ちいさな雪玉を、ころころ転がして、少しずつ大きくするの！'],
      ['最初から大きな雪玉を作ろうとすると、くずれちゃうんだよ。', 'ちいさいのから、こつこつ。それがコツなの！'],
      ['この町の人は、思い出を売っちゃうんだって。', 'でも、雪だるまを作った思い出は、ユキ、ぜったい売らないもん。']] },
    { id: 'zero', map: 'luxbell', name: '一度も賭けない男ゼロ', m: 'villager_m', pal: P('#1a1a1a', '#1a1a2a', '#ffd24a', '#14141c', '#0a0a0a'), w: 0, lines: [
      ['……おれはゼロ。この街に十年いるが、一度も賭けたことがない。', '毎晩ここに来て、他人の勝ち負けを眺めている。'],
      ['十年見ていて、分かったことが一つある。', '最後まで勝っているのは、いつも胴元だ。……だから、おれは賭けない。'],
      ['勝ったときの顔より、負けたときの顔のほうが、その人をよく表す。', 'あんたは、負けたとき、どんな顔をする？']] },
    { id: 'repeat', map: 'volatilia', name: '七年生のリピート', m: 'scholar', pal: P('#8a6a3a', '#58c890', '#e8e0c0', '#3a5a4a'), w: 1, lines: [
      ['やあ、新入生？ ……ぼくは七年生のリピート。この学院の、いちばんの古株さ。', '同じ授業を七回受けたからね。どの先生の冗談も、ぜんぶ言えるよ。'],
      ['でもね、同じ授業でも、受けるたびに違うところに気づくんだ。', 'くり返しは、むだじゃない。……と、自分に言い聞かせてる。'],
      ['今年こそ卒業するんだ！ 復習は、もうばっちり。', '……あとは、試験の日に寝坊しなければ。']] },
    { id: 'genius', map: 'tradia', name: '自称天才アナリストのジーニャス', m: 'scholar', pal: P('#e8e8e8', '#46e0ff', '#ff4a8a', '#2a3a4a'), w: 1, lines: [
      ['フッ……ぼくはジーニャス。トレディアいちの天才アナリストさ。', '住宅街の「IQテストの館」？ もちろん受けたとも。……結果は、ひ・み・つ。'],
      ['天才のぼくにも、読めない相場はある。', 'そういうときは、何もしない。これが天才の判断さ。……凡人は、何かしたがるからね。'],
      ['IQテストの館に行ってみるといい。', 'ただし、あれは遊びだよ。点数が高くても低くても、相場の腕とは別の話さ。']] },
    { id: 'packet', map: 'tradia', name: '配達係のパケット', m: 'villager_m', pal: P('#ff8a3a', '#3a3a3a', '#46e0ff', '#2a2a2a'), w: 1, lines: [
      ['お届けものでーす！ ……あ、あなた宛てじゃなかった。配達係のパケットです！', 'この街は広いから、近道を覚えるのが大事なんです。'],
      ['いちばん速い道は、いちばん短い道とは限りません。', '人混みの大通りより、すいている裏道のほうが早く着くことも多いんですよ。'],
      ['今日は百二十件お届けしました！', '……あと一件、届け先が分からないんです。差出人も宛名もない手紙……。']] },
    { id: 'lunaria', map: 'magicka_palace', name: '宮廷占い師ルナリア', m: 'priest', pal: P('#c0c0e8', '#3a2a6a', '#c08aff', '#2a1a4a', '#1a1030', '#3a2a6a'), w: 0, lines: [
      ['ようこそ。宮廷占い師のルナリアです。', '……占いますか？ 先に申し上げておきますが、わたしの占いは、よく外れます。'],
      ['未来は、当てるものではありません。備えるものです。', '晴れても雨でも困らない支度をしておけば、占いなど要らないでしょう？'],
      ['（水晶玉をのぞきこんで）……見えます。あなたが、また話しかけてくるのが。', '……ほら、当たったでしょう？']] }
  ];
  X.CHARS = CHARS;
  var gcache = {};
  CHARS.forEach(function (ch) {
    var key = 'u73_' + ch.id; if (root.Chars && root.Chars.addPalette) root.Chars.addPalette(key, ch.pal);
    // 画像は作っていない（色だけで描く歩行キャラ）。素材の一覧に「missing」で登録する（v6.4 のトレーダーと同じ。js/data/asset-manifest.js）
    var MF = root.ASSET_MANIFEST; if (MF) { var ent = { name: ch.name, spriteId: key, anchor: 'bottom-center', path: null, status: 'missing', use: false, fallback: 'chars', style: 'procedural', note: 'v7.3 追加。画像未作成のためコード描画' };
      if (MF.npcs && !MF.npcs[key]) MF.npcs[key] = Object.assign({ kind: 'portrait' }, ent); if (MF.overworld && !MF.overworld[key]) MF.overworld[key] = Object.assign({ kind: 'walk' }, ent); }
    var g = gcache[ch.map] || (gcache[ch.map] = grid(ch.map)); if (!g) { X.skipped.push('char:' + ch.id); return; }
    var at = pick(g, 'road', rng(hash(ch.id + ':u73'))); if (!at) { X.skipped.push('char:' + ch.id); return; }
    var n = { id: 'u73_' + ch.id, name: ch.name, x: at.x, y: at.y, sprite: key, model3d: ch.m, dir: 'down', wander: ch.w, unique73: true, noChatter: true, v73: true, talk: rotate(ch.id, ch.name, ch.lines) };
    pre(g.d); g.d.npcs = (g.d.npcs || []).concat([n]); X.chars.push({ id: n.id, map: ch.map, name: ch.name, x: at.x, y: at.y });
  });
})(typeof window !== 'undefined' ? window : globalThis);
