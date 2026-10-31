/* =========================================================
   Data / Phase A 第4段階（v6.4）：ダンジョンの隠し区画（10のダンジョンに1つずつ。仕掛けはダンジョンごとに別のもの）
   ・入口は既存の行き止まりの奥の壁。調べると手がかりが出て、「進む」と壁が通路になる（地形の行は変えず、イベントとフラグつきの出入口で切り替え）
   ・中の仕掛け：①ダウ理論の順に道しるべの石（迷いの森）②線路の切り替え（鉄の鉱山）③灯を三つ（アルナの地下）④砂時計の向き（時の神殿）
     ⑤封印の問い（禁書庫）⑥溶岩を冷ます弁（竜脈）⑦精霊の光を踏む順（精霊の森）⑧圧力板（灰の洞窟）⑨砂山を掘る（砂嵐の回廊）⑩年号の錠（記憶の図書館）
   ・魔物は入口のダンジョンと同じ群れ・同じ強さ（エンカウントの設定をそのまま使う）。既存のボス・必須イベント・宝箱は変えない
   ========================================================= */
(function (root) {
  'use strict';
  var M = root.MAP_DEFS; var add = root.TownKit.add;
  function D() { return root.State.data; }
  function W() { return root.World; }
  function msg(l) { return root.Win.message(l); }
  function refresh() { W().applyState(W().map); }
  function Grid(Wd, H, ch) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < Wd; x++) g[y].push(ch); } return {
    set: function (x, y, c) { if (g[y] && g[y][x] !== undefined) g[y][x] = c; return this; },
    rect: function (x, y, w, h, c) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) this.set(xx, yy, c); return this; },
    border: function (c) { for (var x = 0; x < Wd; x++) { g[0][x] = c; g[H - 1][x] = c; } for (var y = 0; y < H; y++) { g[y][0] = c; g[y][Wd - 1] = c; } return this; },
    pts: function (list, c) { var self = this; list.forEach(function (p) { self.set(p[0], p[1], c); }); return this; },
    rows: function () { return g.map(function (r) { return r.join(''); }); } }; }
  var EX = root.EXPAND_A = root.EXPAND_A || { maps: [], patched: [] }; var S4 = EX.stage4 = { maps: [], patched: [], areas: [] };
  var A4 = root.ExpandA4 = {};

  // 隠し区画を登録：host の行き止まり dead の奥の壁 wall に入口。def は新しいマップ（warps[0] が戻り口）。arrive は着く所
  function hidden(o) {
    var H = M[o.host]; if (!H) return;
    var wallCh = H.rows[o.wall[1]][o.wall[0]];
    var foundFlag = 'a4_' + o.key + '_found';
    H.events = H.events || []; H.warps = H.warps || [];
    H.events.push({ x: o.wall[0], y: o.wall[1], type: 'script', solid: true, doneFlag: foundFlag, tile: o.wallTile, doneTile: o.floorTile, tileFlag: foundFlag, run: async function () {
      var d = D();
      if (!d.flags[foundFlag]) { await msg(o.hint); var c = await root.Win.choice(o.ask || '奥へ進む？', ['進む', 'やめる']); if (c !== 0) return; d.flags[foundFlag] = true; if (o.onFound) o.onFound(d); refresh(); }
      W().enterMap(o.id, o.arrive[0], o.arrive[1], o.arriveDir || 'down');
    } });
    H.warps.push({ x: o.wall[0], y: o.wall[1], to: o.id, tx: o.arrive[0], ty: o.arrive[1], needFlag: foundFlag, hidden: true, name: o.name });
    if (EX.patched.indexOf(o.host) < 0) EX.patched.push(o.host); S4.patched.push(o.host);
    var def = Object.assign({ id: o.id, name: o.name, kind: 'dungeon', bgm: H.bgm || 'dungeon', fallback: o.fallback, encounters: H.encounters || null }, o.def);
    def.warps = [{ x: o.back[0], y: o.back[1], to: o.host, tx: o.dead[0], ty: o.dead[1], name: H.name + 'へ' }].concat(def.warps || []);
    add(def); EX.maps.push(o.id); S4.maps.push(o.id); S4.areas.push({ key: o.key, host: o.host, id: o.id, dead: o.dead, wall: o.wall, found: foundFlag, open: o.openFlag, gimmick: o.gimmick });
  }
  // 仕掛けを解いたら（フラグが立ったら）すぐ開く扉。manual なら、フラグが立ったあとに扉を調べて開ける（鍵を使う場面）
  function gateEv(x, y, flagName, text, openText, tile, doneTile, manual) { var df = manual ? flagName + '_gate' : flagName; return { x: x, y: y, type: 'gate', solid: true, needFlag: flagName, doneFlag: df, tile: tile || 'door_locked', doneTile: doneTile || 'door', tileFlag: df, text: text, openText: openText }; }

  /* ---------- ① 迷いの森：ダウ理論の順に道しるべの石 ---------- */
  var lf = Grid(22, 14, '.').border('F'); lf.set(10, 0, '.');
  lf.rect(7, 10, 7, 1, 'F').rect(7, 11, 1, 2, 'F').rect(13, 11, 1, 2, 'F'); lf.set(10, 10, '.');
  lf.pts([[3, 2], [18, 2], [2, 7], [19, 7], [12, 6], [17, 11]], 'f').pts([[3, 11], [5, 12], [18, 12]], 'a').pts([[1, 4], [20, 4]], 'Z');
  lf.pts([[15, 4], [5, 4], [16, 9], [6, 9], [8, 2]], 'S');
  var LF_STONES = { '15,4': 10, '5,4': 14, '16,9': 12, '6,9': 16 }; var LF_ORDER = [10, 14, 12, 16];
  A4.lfStone = async function (x, y) {
    var d = D(); if (d.flags.a4_lf_open) { await msg(['道しるべの石。もう光は消えている。']); return; }
    var v = LF_STONES[x + ',' + y]; var step = d.flags.a4_lf_step || 0;
    if (v === LF_ORDER[step]) { step++; d.flags.a4_lf_step = step; if (step >= 4) { d.flags.a4_lf_open = true; refresh(); await msg(['道しるべの石「' + v + '」が光った。', '四つの石が一度に光り、南の茂みがざわざわと開いた。']); } else await msg(['道しるべの石「' + v + '」が淡く光った。（' + step + '/4）']); }
    else { d.flags.a4_lf_step = 0; await msg(['道しるべの石「' + v + '」に触れた。……ほかの石の光まで消えてしまった。', '（順番が違うようだ。石板をもう一度読んでみよう）']); }
  };
  hidden({ key: 'lf', host: 'lost_forest', dead: [17, 10], wall: [17, 11], wallTile: 'forest', floorTile: 'grass', id: 'a4_lf_glade', name: '迷いの森・獣道の奥', fallback: 'grass', back: [10, 0], arrive: [10, 1], openFlag: 'a4_lf_open', gimmick: 'order',
    hint: ['茂みの向こうに、踏み固められた獣道が続いている。', '獣道の入口に、古い道しるべ。「迷った者は、波の形を思い出せ」'], ask: '茂みをかき分けて進む？',
    def: { rows: lf.rows(), chests: [{ id: 'a4lf_1', x: 9, y: 12, item: 'dow_buckler', qty: 1 }, { id: 'a4lf_2', x: 11, y: 12, item: 'ether', qty: 2 }],
      events: [
        { x: 8, y: 2, type: 'inspect', solid: true, text: ['苔むした石板。「森の獣は、まず安値をつけ、次に高値へ。浅く戻って、前より高い安値。そして、前より高い高値へ」', '「その順に、道しるべに触れよ」……四つの石に、それぞれ数が刻まれている。'] },
        { x: 15, y: 4, type: 'script', solid: true, run: async function () { await A4.lfStone(15, 4); } },
        { x: 5, y: 4, type: 'script', solid: true, run: async function () { await A4.lfStone(5, 4); } },
        { x: 16, y: 9, type: 'script', solid: true, run: async function () { await A4.lfStone(16, 9); } },
        { x: 6, y: 9, type: 'script', solid: true, run: async function () { await A4.lfStone(6, 9); } },
        gateEv(10, 10, 'a4_lf_open', ['茂みが絡み合って、通れない。', '（石板の順に、道しるべの石に触れる）'], ['茂みがほどけて、奥への道が開いた。'], 'bush', 'grass')
      ] } });

  /* ---------- ② 鉄の鉱山：線路の切り替え（上の線路か下の線路のどちらか一方だけが通れる） ---------- */
  var im = Grid(24, 12, 'G'); im.rect(1, 5, 11, 2, 'g').rect(11, 2, 2, 8, 'g').rect(13, 2, 9, 2, 'g').rect(13, 8, 9, 2, 'g'); im.set(0, 6, 'g');
  im.rect(1, 6, 11, 1, 'r').rect(13, 3, 9, 1, 'r').rect(13, 9, 9, 1, 'r').rect(11, 3, 1, 7, 'r'); im.pts([[3, 4], [17, 4], [8, 7], [19, 7]], 'k').set(6, 4, 'v');
  A4.imLever = async function () {
    var d = D(); var toB = !d.flags.a4_im_b_free; d.flags.a4_im_b_free = toB; d.flags.a4_im_a_free = !toB; refresh();
    await msg(['錆びたレバーを倒した。ガタン、と遠くで線路の切り替わる音。', toB ? '上の線路の柵が閉じ、下の線路の柵が開いた。' : '下の線路の柵が閉じ、上の線路の柵が開いた。']);
  };
  var imBlock = function (x, y, f) { return { x: x, y: y, type: 'script', solid: true, doneFlag: f, tile: 'door_locked', doneTile: 'cave_floor', tileFlag: f, run: async function () { await msg(['線路の切り替え柵。閉じている。', '（入口の近くのレバーで、上と下の線路を切り替える）']); } }; };
  hidden({ key: 'im', host: 'iron_mine_2', dead: [27, 13], wall: [28, 13], wallTile: 'cave_wall', floorTile: 'cave_floor', id: 'a4_im_old', name: '鉄の鉱山・廃坑道', fallback: 'cave_floor', back: [0, 6], arrive: [1, 6], arriveDir: 'right', openFlag: 'a4_im_b_free', gimmick: 'switch',
    hint: ['坑道の壁の板が、外れかけている。板の隙間から、古い線路が奥へ続いているのが見える。'], ask: '板を外して、廃坑道へ入る？', onFound: function (d) { d.flags.a4_im_a_free = true; },
    def: { rows: im.rows(), chests: [{ id: 'a4im_1', x: 21, y: 2, gold: 1500 }, { id: 'a4im_2', x: 21, y: 9, item: 'reversal_warning', qty: 1 }],
      events: [{ x: 6, y: 4, type: 'script', solid: true, tile: 'lever', run: async function () { await A4.imLever(); } },
        imBlock(13, 2, 'a4_im_a_free'), imBlock(13, 3, 'a4_im_a_free'), imBlock(13, 8, 'a4_im_b_free'), imBlock(13, 9, 'a4_im_b_free'),
        { x: 3, y: 4, type: 'inspect', solid: true, text: ['壁の鉱脈に、掘りかけのつるはしが刺さったまま。', '柄に刻まれた字：「上か、下か。両方は掘れない。決めたら、もう片方は忘れろ」'] }] } });

  /* ---------- ③ アルナの地下：灯を三つ ---------- */
  var au = Grid(20, 12, '#'); au.rect(1, 6, 18, 5, ':'); au.rect(3, 1, 14, 3, ':'); au.set(10, 4, '#').set(10, 5, ':'); au.rect(1, 4, 18, 1, '#'); au.set(10, 11, ':');
  au.pts([[3, 7], [16, 7], [10, 9]], 'I').pts([[5, 1], [14, 1]], 'K').pts([[1, 10], [18, 10]], 'q');
  A4.auLamp = async function (n) {
    var d = D(); var k = 'a4_au_l' + n; if (d.flags[k]) { await msg(['灯台の台座。火がともっている。']); return; }
    d.flags[k] = true; var lit = [1, 2, 3].filter(function (i) { return d.flags['a4_au_l' + i]; }).length; if (lit >= 3) d.flags.a4_au_lit = true; refresh();
    await msg(['古い灯台の台座に、火をともした。（' + lit + '/3）', lit >= 3 ? '三つの灯がそろった。北の扉の封が、音もなく外れた。' : 'あと ' + (3 - lit) + 'つ。']);
  };
  // 既存の不具合の修正：地下1階の東側（宝箱 ug2・ug_pat がある所）へは、2階への階段（15,11）を踏まないと行けず、踏むと2階へ移動してしまうため実際には行けなかった。
  // 階段の上の壁1マス（15,10）を床にして、階段をよけて東側へ回れるようにする（隠し区画の入口もこの東側にある）
  (function () { var U = M.aruna_underground_1; if (U && U.rows[10][15] === '#' && U.rows[11][15] === '>') { var r = U.rows[10]; U.rows[10] = r.slice(0, 15) + '_' + r.slice(16); S4.fixes = (S4.fixes || []).concat(['aruna_underground_1:15,10']); } })();
  hidden({ key: 'au', host: 'aruna_underground_1', dead: [20, 5], wall: [20, 4], wallTile: 'wall', floorTile: 'floor_wood', id: 'a4_au_lamps', name: 'アルナの地下・灯りの間', fallback: 'floor_stone', back: [10, 11], arrive: [10, 10], arriveDir: 'up', openFlag: 'a4_au_lit', gimmick: 'light',
    hint: ['壁の煉瓦の目地から、かすかな光がもれている。', '押すと、煉瓦がひとつ奥へずれた。'], ask: '煉瓦の奥へ進む？',
    def: { rows: au.rows(), chests: [{ id: 'a4au_1', x: 6, y: 2, item: 'star_compass', qty: 1 }, { id: 'a4au_2', x: 13, y: 2, gold: 2000 }],
      events: [
        { x: 3, y: 7, type: 'script', solid: true, tile: 'pillar', doneTile: 'torch', tileFlag: 'a4_au_l1', run: async function () { await A4.auLamp(1); } },
        { x: 16, y: 7, type: 'script', solid: true, tile: 'pillar', doneTile: 'torch', tileFlag: 'a4_au_l2', run: async function () { await A4.auLamp(2); } },
        { x: 10, y: 9, type: 'script', solid: true, tile: 'pillar', doneTile: 'torch', tileFlag: 'a4_au_l3', run: async function () { await A4.auLamp(3); } },
        { x: 1, y: 7, type: 'inspect', solid: false, text: ['壁の文字：「灯を三つ。ひとつでも欠ければ、船は帰らない」'] },
        gateEv(10, 4, 'a4_au_lit', ['北の扉。灯台の紋章の封がかかっている。', '（部屋の三つの台座に火をともす）'], ['扉が開いた。'])
      ] } });

  /* ---------- ④ 時の神殿：砂時計の向き（1つ回すと、両隣も一緒に回る） ---------- */
  var tt = Grid(20, 12, 'C'); tt.rect(1, 4, 18, 7, ':'); tt.rect(3, 1, 11, 2, ':'); tt.set(8, 3, ':'); tt.set(19, 6, ':');
  tt.pts([[2, 9], [17, 9]], 'I').pts([[1, 4], [18, 4]], 'K');
  A4.ttTurn = async function (i) {
    var d = D(); if (d.flags.a4_tt_done) { await msg(['砂時計。砂は上から下へ、静かに落ち続けている。']); return; }
    [i - 1, i, i + 1].forEach(function (k) { if (k >= 1 && k <= 4) d.flags['a4_tt_h' + k] = !d.flags['a4_tt_h' + k]; });
    var up = [1, 2, 3, 4].filter(function (k) { return d.flags['a4_tt_h' + k]; }).length; if (up === 4) d.flags.a4_tt_done = true; refresh();
    await msg(['砂時計を回した。……両隣の砂時計も、つられて回った。（上向き ' + up + '/4）'].concat(up === 4 ? ['四つの砂時計の砂が、そろって落ちはじめた。北の扉が開いた。'] : []));
  };
  var ttHG = function (x, i) { return { x: x, y: 6, type: 'script', solid: true, tile: 'pillar', doneTile: 'crystal', tileFlag: 'a4_tt_h' + i, run: async function () { await A4.ttTurn(i); } }; };
  hidden({ key: 'tt', host: 'temple_of_time_2', dead: [3, 9], wall: [2, 9], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a4_tt_sand', name: '時の神殿・砂時計の間', fallback: 'floor_stone', back: [19, 6], arrive: [18, 6], arriveDir: 'left', openFlag: 'a4_tt_done', gimmick: 'toggle',
    hint: ['壁の継ぎ目から、細い砂が上から下へ流れ続けている。', '砂の流れの奥に、空洞がある。'], ask: '砂の流れる壁の奥へ進む？',
    def: { rows: tt.rows(), chests: [{ id: 'a4tt_1', x: 4, y: 1, item: 'breakeven_crest', qty: 1 }, { id: 'a4tt_2', x: 12, y: 1, item: 'hi_ether', qty: 2 }],
      events: [ttHG(5, 1), ttHG(8, 2), ttHG(11, 3), ttHG(14, 4),
        { x: 9, y: 9, type: 'inspect', solid: false, text: ['床の銘：「四つの時を、すべて上に。ひとつを動かせば、隣の時も動く」', '「急いで回すほど、時はばらばらになる。一度に一つ、結果を見てから」'] },
        gateEv(8, 3, 'a4_tt_done', ['北の扉。四つの砂時計の紋章が刻まれている。', '（四つの砂時計をすべて上向きにする）'], ['扉が開いた。'])] } });

  /* ---------- ⑤ 禁書庫：封印の問い（部屋の三つの書見台の文から答える） ---------- */
  var fa = Grid(18, 12, '#'); fa.rect(1, 1, 16, 6, '_'); fa.set(0, 6, '_'); fa.rect(6, 9, 7, 2, '_'); fa.set(9, 8, '_'); fa.rect(1, 7, 16, 1, '_');
  fa.pts([[4, 2], [9, 2], [14, 2]], 't').rect(1, 1, 2, 1, 'K').rect(15, 1, 2, 1, 'K').pts([[6, 10], [12, 10]], 'K');
  A4.faSeal = async function () {
    var d = D(); if (d.flags.a4_fa_open) return;
    await msg(['封印の書架。表面に、三つの問いが浮かび上がる。']);
    var Q = [['「予測は、選択の代わりには ――」', ['なる', 'ならない', 'なりうる'], 1], ['「読む者の名と目的を ―― する」', ['隠す', '記録', '忘れる'], 1], ['「迷いが大きいほど、欠片は ―― 光る」', ['弱く', '強く', '光らない'], 1]];
    for (var i = 0; i < Q.length; i++) { var a = await root.Win.choice(Q[i][0], Q[i][1]); if (a !== Q[i][2]) { await msg(['封印は、何も応えない。……どこかで読んだ言葉のはずだ。', '（部屋の三つの書見台を読んでみよう）']); return; } }
    d.flags.a4_fa_open = true; refresh(); await msg(['三つの答えに、封印が淡く光った。書架が横へずれ、奥の書庫が現れた。']);
  };
  hidden({ key: 'fa', host: 'forbidden_archive_2', dead: [15, 7], wall: [16, 7], wallTile: 'wall', floorTile: 'floor_wood', id: 'a4_fa_seal', name: '禁書庫・封印の書架', fallback: 'floor_wood', back: [0, 6], arrive: [1, 6], arriveDir: 'right', openFlag: 'a4_fa_open', gimmick: 'riddle',
    hint: ['壁の一部が、本棚の形にくぼんでいる。くぼみに手を当てると、奥へ押し込めそうだ。'], ask: 'くぼみを押して奥へ進む？',
    def: { rows: fa.rows(), chests: [{ id: 'a4fa_1', x: 7, y: 10, item: 'candle_stone', qty: 1 }, { id: 'a4fa_2', x: 11, y: 10, item: 'elixir', qty: 1 }],
      events: [
        { x: 4, y: 2, type: 'inspect', solid: true, text: ['書見台の手記。テオドルの字だ。', '「予測は、選択の代わりにはならない。……私はそれを、最後まで言えなかった」'] },
        { x: 9, y: 2, type: 'inspect', solid: true, text: ['書見台の規則集。', '「研究を公開するときは、読む者の名と目的を記録すること。記録は、書く者も読む者も守る」'] },
        { x: 14, y: 2, type: 'inspect', solid: true, text: ['書見台の研究帳。', '「欠片の共鳴は、持ち主の迷いが大きいほど強くなる。迷いが大きいほど、欠片は強く光る」'] },
        { x: 9, y: 8, type: 'script', solid: true, doneFlag: 'a4_fa_open', tile: 'bookshelf', doneTile: 'floor_wood', tileFlag: 'a4_fa_open', run: async function () { await A4.faSeal(); } }
      ] } });

  /* ---------- ⑥ 竜脈：溶岩を冷ます弁（手前の弁で手前の溶岩、奥の弁で奥の溶岩） ---------- */
  var dv = Grid(24, 12, 'G'); dv.rect(1, 5, 18, 2, 'g'); dv.set(0, 5, 'g'); dv.rect(19, 2, 4, 8, 'g'); dv.rect(3, 3, 3, 2, 'g').rect(11, 3, 3, 2, 'g');
  dv.rect(7, 5, 3, 2, 'l').rect(15, 5, 3, 2, 'l'); dv.pts([[4, 3], [12, 3]], 'v').pts([[20, 2], [22, 9]], 'k');
  var dvLava = []; [7, 8, 9].forEach(function (x) { [5, 6].forEach(function (y) { dvLava.push({ x: x, y: y, f: 'a4_dv_v1' }); }); }); [15, 16, 17].forEach(function (x) { [5, 6].forEach(function (y) { dvLava.push({ x: x, y: y, f: 'a4_dv_v2' }); }); });
  A4.dvValve = async function (n) {
    var d = D(); var k = 'a4_dv_v' + n; if (d.flags[k]) { await msg(['弁はもう開いている。地下水が流れる音がする。']); return; }
    d.flags[k] = true; refresh(); await msg(['錆びた弁を回した。地下水が噴き出し、' + (n === 1 ? '手前' : '奥') + 'の溶岩が冷えて固まった。']);
  };
  hidden({ key: 'dv', host: 'dragon_vein_1', dead: [20, 6], wall: [21, 6], wallTile: 'cave_wall', floorTile: 'cave_floor', id: 'a4_dv_pool', name: '竜脈・溶岩の溜まり', fallback: 'cave_floor', back: [0, 5], arrive: [1, 5], arriveDir: 'right', openFlag: 'a4_dv_v2', gimmick: 'cool',
    hint: ['岩の割れ目から、熱い風が吹き出している。', '割れ目の奥は広い空洞のようだ。'], ask: '割れ目を広げて奥へ進む？',
    def: { rows: dv.rows(), chests: [{ id: 'a4dv_1', x: 21, y: 3, item: 'phoenix_feather', qty: 2 }, { id: 'a4dv_2', x: 21, y: 8, gold: 3000 }],
      events: [{ x: 4, y: 3, type: 'script', solid: true, tile: 'lever', run: async function () { await A4.dvValve(1); } }, { x: 12, y: 3, type: 'script', solid: true, tile: 'lever', run: async function () { await A4.dvValve(2); } },
        { x: 2, y: 6, type: 'inspect', solid: false, text: ['岩に刻まれた鉱夫の印。「熱は、水で冷ます。手前から順に。奥の弁は、手前を渡らねば届かぬ」'] }].concat(dvLava.map(function (t) { return { x: t.x, y: t.y, type: 'script', solid: true, doneFlag: t.f, tile: 'lava', doneTile: 'ash', tileFlag: t.f, run: async function () { await msg(['溶岩が流れていて、進めない。', '（近くの弁を回して、地下水で冷ます）']); } }; })) } });

  /* ---------- ⑦ 精霊の森：精霊の光を踏む順（北・東・南・西） ---------- */
  var sf = Grid(22, 14, 'n').border('F'); sf.set(21, 7, 'n');
  sf.rect(9, 5, 4, 4, 'w'); sf.rect(7, 11, 8, 1, 'F').rect(7, 12, 1, 1, 'F').rect(14, 12, 1, 1, 'F'); sf.set(10, 11, 'n');
  sf.pts([[10, 3], [15, 6], [10, 10], [5, 6]], 'u').pts([[3, 2], [18, 2], [2, 11], [19, 11], [4, 9]], 'f');
  var SF_ORDER = ['10,3', '15,6', '10,10', '5,6'];
  function sfStep(m, p) {
    var d = D(); if (!d || d.flags.a4_sf_open) return false; var k = p.x + ',' + p.y; var idx = SF_ORDER.indexOf(k); if (idx < 0) return false;
    var step = d.flags.a4_sf_step || 0;
    if (idx === step) { step++; d.flags.a4_sf_step = step; if (step >= 4) { d.flags.a4_sf_open = true; refresh(); root.Win.toast('精霊の光が四つそろい、南の木々が道を開けた'); } else root.Win.toast('精霊の光が強くなった（' + step + '/4）'); }
    else if (idx !== step - 1) { d.flags.a4_sf_step = 0; root.Win.toast('光が消えた……（順番が違うようだ）'); }
    return false;
  }
  hidden({ key: 'sf', host: 'spirit_forest_1', dead: [18, 10], wall: [17, 10], wallTile: 'forest', floorTile: 'snow', id: 'a4_sf_spring', name: '精霊の森・精霊の泉', fallback: 'snow', back: [21, 7], arrive: [20, 7], arriveDir: 'left', openFlag: 'a4_sf_open', gimmick: 'steps',
    hint: ['木々の間に、青い光が揺れている。', '光は、こちらを誘うように奥へ遠ざかっていく。'], ask: '光を追って、木々の奥へ進む？',
    def: { rows: sf.rows(), onStep: sfStep, chests: [{ id: 'a4sf_1', x: 9, y: 12, item: 'icecrystal_hood', qty: 1 }, { id: 'a4sf_2', x: 12, y: 12, item: 'spirit_drop', qty: 2 }],
      events: [gateEv(10, 11, 'a4_sf_open', ['凍った木々が、からみ合って道をふさいでいる。', '（泉のまわりの精霊の光を、精霊の言う順に踏む）'], ['木々がほどけて、奥への道が開いた。'], 'forest', 'snow')],
      npcs: [{ id: 'a4_sf_spirit', x: 17, y: 3, sprite: 'shadow', dir: 'down', wander: 0, talk: async function (c) { await c.say('泉の精霊', D().flags.a4_sf_open ? ['……ありがとう。順番を守る者は、珍しい。'] : ['……水面に映る光を、北から。日の出の方角へ回り、南を通って、日の沈む方角で終える。', '……順を飛ばせば、光は消える。急がなくていい。']); } }] } });

  /* ---------- ⑧ 灰の洞窟：圧力板（三枚とも踏むと、奥の扉が開く） ---------- */
  var ac = Grid(22, 12, 'G'); ac.rect(1, 1, 16, 10, '8'); ac.set(0, 6, '8'); ac.rect(17, 1, 1, 10, 'G'); ac.rect(18, 4, 3, 5, '8');
  ac.rect(6, 1, 1, 7, 'G').rect(11, 4, 1, 7, 'G'); ac.pts([[3, 9], [14, 2], [8, 9]], 'Y');
  var AC_PL = { '4,2': 1, '14,8': 2, '9,4': 3 };
  function acStep(m, p) {
    var d = D(); if (!d) return false; var n = AC_PL[p.x + ',' + p.y]; if (!n || d.flags['a4_ac_p' + n]) return false;
    d.flags['a4_ac_p' + n] = true; var c = [1, 2, 3].filter(function (i) { return d.flags['a4_ac_p' + i]; }).length; if (c >= 3) d.flags.a4_ac_open = true; refresh();
    root.Win.toast(c >= 3 ? '三枚目の圧力板が沈んだ。奥の扉の閂が外れる音がした' : '圧力板が沈んだ（' + c + '/3）'); return false;
  }
  hidden({ key: 'ac', host: 'ash_cave_1', dead: [10, 9], wall: [11, 9], wallTile: 'cave_wall', floorTile: 'ash', id: 'a4_ac_press', name: '灰の洞窟・圧力の間', fallback: 'ash', back: [0, 6], arrive: [1, 6], arriveDir: 'right', openFlag: 'a4_ac_open', gimmick: 'plates',
    hint: ['灰の壁を叩くと、奥が空洞の音がする。', '灰を払うと、人の手で積んだ石が見えた。'], ask: '石を崩して奥へ進む？',
    def: { rows: ac.rows(), onStep: acStep, chests: [{ id: 'a4ac_1', x: 20, y: 5, item: 'streak_charm', qty: 1 }, { id: 'a4ac_2', x: 20, y: 7, item: 'hi_potion', qty: 2 }],
      events: [
        { x: 4, y: 2, type: 'script', solid: false, tile: 'stone', doneTile: 'floor_stone', tileFlag: 'a4_ac_p1', run: async function () { await msg(['石の圧力板。上に乗ると沈みそうだ。']); } },
        { x: 14, y: 8, type: 'script', solid: false, tile: 'stone', doneTile: 'floor_stone', tileFlag: 'a4_ac_p2', run: async function () { await msg(['石の圧力板。上に乗ると沈みそうだ。']); } },
        { x: 9, y: 4, type: 'script', solid: false, tile: 'stone', doneTile: 'floor_stone', tileFlag: 'a4_ac_p3', run: async function () { await msg(['石の圧力板。上に乗ると沈みそうだ。']); } },
        { x: 2, y: 5, type: 'inspect', solid: false, text: ['壁の落書き。「板は三枚。一枚だけ踏んで満足するな。三枚そろって、はじめて扉は動く」'] },
        gateEv(17, 6, 'a4_ac_open', ['重い石の扉。閂がかかっている。', '（部屋の三枚の圧力板を、すべて踏む）'], ['石の扉が開いた。'])] } });

  /* ---------- ⑨ 砂嵐の回廊：砂山を掘る（鍵は日の沈む方角の砂山） ---------- */
  var sc = Grid(22, 12, 'c'); sc.rect(1, 1, 20, 6, 's').rect(6, 7, 15, 4, 's'); sc.set(21, 6, 's'); sc.rect(1, 8, 4, 3, 's'); sc.rect(1, 7, 5, 1, 'c'); sc.set(3, 7, 's');
  sc.pts([[9, 2], [17, 9]], 'Y').pts([[12, 5]], 'X');
  A4.scMound = async function (n) {
    var d = D(); var k = 'a4_sc_m' + n; if (d.flags[k]) { await msg(['掘り返した砂山の跡。']); return; }
    d.flags[k] = true; refresh();
    if (n === 1) { d.flags.a4_sc_key = true; await msg(['砂山を掘ると、錆びた鍵が出てきた。祠の鍵だ。']); }
    else if (n === 2) { d.gold += 300; await msg(['砂の中から、古い金貨が出てきた。（300G）']); }
    else if (n === 3) { root.State.addItem('spice_soup', 2); await msg(['砂の中から、封をした壺。中身は香辛料スープだ。（香辛料スープ×2）']); }
    else await msg(['掘っても、砂しか出てこなかった。']);
  };
  var scMound = function (x, y, n) { return { x: x, y: y, type: 'script', solid: true, doneFlag: 'a4_sc_m' + n, tile: 'hill', doneTile: 'sand', tileFlag: 'a4_sc_m' + n, run: async function () { await A4.scMound(n); } }; };
  hidden({ key: 'sc', host: 'sandstorm_corridor_1', dead: [13, 7], wall: [12, 7], wallTile: 'cliff', floorTile: 'sand', id: 'a4_sc_shrine', name: '砂嵐の回廊・砂に埋もれた祠', fallback: 'sand', back: [21, 6], arrive: [20, 6], arriveDir: 'left', openFlag: 'a4_sc_key', gimmick: 'dig',
    hint: ['崖の下に、砂に半分埋もれた石の扉。', '扉の隙間から、砂が中へ吸い込まれていく。'], ask: '砂をかき出して、扉の奥へ進む？',
    def: { rows: sc.rows(), chests: [{ id: 'a4sc_1', x: 2, y: 9, item: 'ev_bracelet', qty: 1 }, { id: 'a4sc_2', x: 2, y: 10, gold: 1800 }],
      events: [scMound(2, 2, 1), scMound(8, 9, 2), scMound(15, 2, 3), scMound(18, 4, 4),
        { x: 12, y: 5, type: 'inspect', solid: true, text: ['砂に埋もれた石碑。「祠の鍵は、日の沈む方角の砂山に眠る」', '……この部屋の砂山は四つ。闇雲に掘ると、時間と体力ばかり減る。'] },
        gateEv(3, 7, 'a4_sc_key', ['祠の扉。鍵穴がある。', '（祠の鍵は、部屋の砂山のどこかに埋まっている）'], ['錆びた鍵が回り、祠の扉が開いた。'], null, null, true)] } });

  /* ---------- ⑩ 記憶の図書館：年号の錠（三冊の本の年号を古い順に） ---------- */
  var ml = Grid(18, 12, 'C'); ml.rect(1, 5, 16, 5, ':'); ml.set(2, 11, ':').set(2, 10, ':'); ml.rect(3, 1, 12, 3, ':'); ml.set(9, 4, ':');
  ml.rect(1, 5, 1, 4, 'K').rect(16, 5, 1, 4, 'K').pts([[4, 1], [5, 1], [12, 1], [13, 1]], 'K').pts([[5, 7], [9, 7], [13, 7]], 't');
  A4.mlLock = async function () {
    var d = D(); if (d.flags.a4_ml_open) return;
    await msg(['閉架書庫の扉。数字の錠がついている。「三つの年を、古い順に」']);
    var a = await root.Win.choice('錠の数字を合わせる', ['812・640・905', '640・812・905', '905・812・640', '640・905・812']);
    if (a !== 1) { await msg(['カチリとも言わない。……書見台の本に、年号が書いてあったはずだ。']); return; }
    d.flags.a4_ml_open = true; refresh(); await msg(['錠が外れ、閉架書庫の扉が開いた。']);
  };
  hidden({ key: 'ml', host: 'memory_library', dead: [1, 7], wall: [1, 6], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a4_ml_closed', name: '記憶の図書館・閉架書庫', fallback: 'floor_stone', back: [2, 11], arrive: [2, 10], arriveDir: 'up', openFlag: 'a4_ml_open', gimmick: 'lock',
    hint: ['書架の裏の壁に、小さな札。「閉架書庫　許可なき者の立ち入りを禁ず」', '札の下の壁は、扉のように継ぎ目がある。'], ask: '継ぎ目を押して、奥へ進む？',
    def: { rows: ml.rows(), chests: [{ id: 'a4ml_1', x: 6, y: 2, item: 'pivot_ring', qty: 1 }, { id: 'a4ml_2', x: 11, y: 2, item: 'hi_ether', qty: 2 }],
      events: [
        { x: 5, y: 7, type: 'inspect', solid: true, text: ['書見台の本『大火の記録』。「王国暦812年。書庫の半分が焼けた。焼けなかった記録だけが、歴史になった」'] },
        { x: 9, y: 7, type: 'inspect', solid: true, text: ['書見台の本『記録の始まり』。「王国暦640年。最初の帳面は、麦の収穫と借りの記録だった」'] },
        { x: 13, y: 7, type: 'inspect', solid: true, text: ['書見台の本『封印の年』。「王国暦905年。ある研究の記録が、閉架に移された」'] },
        { x: 9, y: 4, type: 'script', solid: true, doneFlag: 'a4_ml_open', tile: 'door_locked', doneTile: 'door', tileFlag: 'a4_ml_open', run: async function () { await A4.mlLock(); } }
      ] } });
})(typeof window !== 'undefined' ? window : globalThis);
