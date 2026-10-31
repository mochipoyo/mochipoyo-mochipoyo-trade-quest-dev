/* =========================================================
   Data / Phase A 第6段階（v6.4）：残りのダンジョン29か所に隠し区画（仕掛けはすべて別のもの。第4段階の10種とも重ならない）
   ・入口は既存のダンジョンの「ふつうの壁」の1マス（向こう側も壁の厚い所）。調べると手がかりが出て、「進む」と通路になる
     （地形の行は変えず、イベントとフラグつきの出入口で切り替え。第4段階と同じしくみ）
   ・中は「手前の部屋（仕掛け）」と「奥の小部屋（宝箱2つ・調べる物）」。仕掛けを解くと奥の扉が開く
   ・魔物は入口のダンジョンと同じ群れ・同じ強さ（エンカウントの設定をそのまま使う。もともと出ない所は出ない）
   ・既存のボス・必須イベント・宝箱・人・ワープは変えない
   ========================================================= */
(function (root) {
  'use strict';
  var M = root.MAP_DEFS; var add = root.TownKit.add;
  function D() { return root.State.data; }
  function W() { return root.World; }
  function F() { return D().flags; }
  function msg(l) { return root.Win.message(l); }
  function choice(p, o) { return root.Win.choice(p, o); }
  function refresh() { if (W().map) W().applyState(W().map); }
  function Grid(Wd, H, ch) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < Wd; x++) g[y].push(ch); } return {
    set: function (x, y, c) { if (g[y] && g[y][x] !== undefined) g[y][x] = c; return this; },
    rect: function (x, y, w, h, c) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) this.set(xx, yy, c); return this; },
    border: function (c) { for (var x = 0; x < Wd; x++) { g[0][x] = c; g[H - 1][x] = c; } for (var y = 0; y < H; y++) { g[y][0] = c; g[y][Wd - 1] = c; } return this; },
    pts: function (list, c) { var self = this; list.forEach(function (p) { self.set(p[0], p[1], c); }); return this; },
    rows: function () { return g.map(function (r) { return r.join(''); }); } }; }
  // 共通の形：外周は壁、上に奥の小部屋（x = cx-3〜cx+3、y = 1〜2）、y = 3 は壁（扉は cx）、下の中央 (cx, h-1) が戻り口
  function base(w, h, wall, floor) {
    var g = Grid(w, h, floor).border(wall); var cx = Math.floor(w / 2);
    g.rect(1, 3, w - 2, 1, wall).rect(1, 1, cx - 4, 2, wall).rect(cx + 4, 1, w - cx - 5, 2, wall).set(cx, h - 1, floor);
    g.cx = cx; g.h = h; return g;
  }
  var EX = root.EXPAND_A = root.EXPAND_A || { maps: [], patched: [] }; var S6 = EX.stage6 = { maps: [], patched: [], areas: [] };
  var A6 = root.ExpandA6 = {};

  // 隠し区画を登録（第4段階の hidden と同じ形。フラグは a6_<key>_found）
  function hidden6(o) {
    var H = M[o.host]; if (!H) return;
    var foundFlag = 'a6_' + o.key + '_found';
    H.events = H.events || []; H.warps = H.warps || [];
    H.events.push({ x: o.wall[0], y: o.wall[1], type: 'script', solid: true, doneFlag: foundFlag, tile: o.wallTile, doneTile: o.floorTile, tileFlag: foundFlag, a6entry: o.key, run: async function () {
      var d = D();
      if (!d.flags[foundFlag]) { await msg(o.hint); var c = await choice(o.ask || '奥へ進む？', ['進む', 'やめる']); if (c !== 0) return; d.flags[foundFlag] = true; refresh(); }
      W().enterMap(o.id, o.arrive[0], o.arrive[1], 'up');
    } });
    H.warps.push({ x: o.wall[0], y: o.wall[1], to: o.id, tx: o.arrive[0], ty: o.arrive[1], needFlag: foundFlag, hidden: true, name: o.name });
    (o.hostEvents || []).forEach(function (e) { H.events.push(e); });
    if (EX.patched.indexOf(o.host) < 0) EX.patched.push(o.host); if (S6.patched.indexOf(o.host) < 0) S6.patched.push(o.host);
    var def = Object.assign({ id: o.id, name: o.name, kind: 'dungeon', bgm: H.bgm || 'dungeon', fallback: o.fallback, encounters: H.encounters || null }, o.def);
    def.warps = [{ x: o.back[0], y: o.back[1], to: o.host, tx: o.dead[0], ty: o.dead[1], name: H.name + 'へ' }].concat(def.warps || []);
    add(def); EX.maps.push(o.id); S6.maps.push(o.id);
    S6.areas.push({ key: o.key, host: o.host, id: o.id, dead: o.dead, wall: o.wall, found: foundFlag, open: o.openFlag, gimmick: o.gimmick, gate: o.gate || null, ch: o.ch });
  }
  // 仕掛けのフラグが立つと開く扉（第4段階の gateEv と同じ）
  function gateEv(x, y, flagName, text, openText, tile, doneTile) { return { x: x, y: y, type: 'gate', solid: true, needFlag: flagName, doneFlag: flagName, tile: tile || 'door_locked', doneTile: doneTile || 'door', tileFlag: flagName, text: text, openText: openText }; }
  function look(x, y, tile, text) { return { x: x, y: y, type: 'inspect', solid: true, tile: tile, text: text }; }
  function scr(x, y, tile, fn, extra) { return Object.assign({ x: x, y: y, type: 'script', solid: true, tile: tile, run: async function (c) { await fn(c); } }, extra || {}); }
  function open(flag, lines) { F()[flag] = true; refresh(); if (root.Audio) root.Audio.sfx('door'); return msg(lines); }
  function val(k, def) { var v = F()[k]; return v === undefined ? def : v; }

  /* ========== ① エマール山道：道標の向き（三本をそろえる。長期の道標は動かない） ========== */
  var em = base(18, 12, 'm', '.'); em.pts([[2, 5], [15, 9], [16, 5]], 'f').pts([[3, 9], [14, 5], [2, 8]], 'a').pts([[4, 10], [13, 10]], 'h');
  var DIR4 = ['北', '東', '南', '西'];
  A6.emPost = async function (k) {
    if (F().a6_em_open) { await msg(['道標。三本とも北を向いている。']); return; }
    if (k === 'l') { await msg(['「長期」と刻まれた道標。北を指したまま、地面に深く打ち込まれている。', 'びくとも動かない。']); return; }
    var key = 'a6_em_' + k, cur = val(key, k === 's' ? 2 : 3);
    var c = await choice('「' + (k === 's' ? '短期' : '中期') + '」の道標。いまは「' + DIR4[cur] + '」を指している。', ['回す', 'そのまま']); if (c !== 0) return;
    cur = (cur + 1) % 4; F()[key] = cur;
    if (val('a6_em_s', 2) === 0 && val('a6_em_m', 3) === 0) await open('a6_em_open', ['道標が「北」を指した。', '三本の道標がそろった瞬間、奥の岩がごとりと横へずれた。']);
    else await msg(['道標を回した。いまは「' + DIR4[cur] + '」を指している。']);
  };
  hidden6({ key: 'em', ch: 3, host: 'emal_pass', dead: [26, 8], wall: [25, 8], wallTile: 'mountain', floorTile: 'grass', id: 'a6_em_hut', name: 'エマール山道・道標の谷', fallback: 'grass', back: [em.cx, 11], arrive: [em.cx, 10], openFlag: 'a6_em_open', gimmick: 'rotate',
    hint: ['岩肌に、細い割れ目。風が向こうから吹き抜けてくる。', '割れ目の脇に、古い道標の矢印が彫ってある。'], ask: '割れ目を抜けて進む？',
    def: { rows: em.rows(), chests: [{ id: 'a6em_1', x: 7, y: 1, item: 'pullback_spear', qty: 1 }, { id: 'a6em_2', x: 11, y: 1, item: 'healing_salve', qty: 3 }],
      events: [
        look(4, 7, 'sign', ['古い石板。「三本の線が同じ向きを指すとき、峠の道は開く」', '「長い線は、ゆっくりとしか曲がらない。短い線と中くらいの線を、長い線に合わせよ」']),
        scr(6, 7, 'sign', function () { return A6.emPost('s'); }), scr(9, 7, 'sign', function () { return A6.emPost('m'); }), scr(12, 7, 'sign', function () { return A6.emPost('l'); }),
        gateEv(9, 3, 'a6_em_open', ['大きな岩が道をふさいでいる。', '（三本の道標を同じ向きに）'], ['岩がずれて、奥への道が開いた。'], 'hill', 'grass'),
        look(9, 1, 'sign', ['峠の見張りの記録。「短い線はすぐ向きを変える。長い線はなかなか変わらない。三本がそろうのは、流れがはっきりした時だけだ」', '「そろわない日は、峠を越えなかった。それで命を拾った日が、何度もある」'])] } });

  /* ========== ② 山賊のアジト：合言葉の切れ端（三つを読んで、扉に答える） ========== */
  var bd = base(16, 10, '#', '_'); bd.pts([[2, 5]], 'z').pts([[13, 5]], 'q').pts([[8, 6]], 't').pts([[2, 8], [13, 8]], 'q');
  var BD_SCRAP = { 1: '「勝って」', 2: '「兜の」', 3: '「緒を締めよ」' };
  A6.bdScrap = async function (n) { F()['a6_bd_s' + n] = true; await msg(['破れた紙の切れ端。合言葉の一部らしい。', BD_SCRAP[n] + '……（' + n + '枚目）']); };
  A6.bdLock = async function () {
    if (F().a6_bd_open) return;
    await msg(['奥の扉。のぞき窓から、しゃがれた声。「……合言葉は？」']);
    var a = await choice('合言葉', ['勝ってるうちは、やめるな', '勝って兜の緒を締めよ', '負けたら倍に張れ', '兜を脱いで勝ちを祝え']);
    if (a !== 1) { await msg(['「……違うな」のぞき窓がぴしゃりと閉まった。', '（部屋のどこかに、合言葉の切れ端があるはずだ）']); return; }
    await open('a6_bd_open', ['「……ふん。先代の言葉を知ってるやつが、まだいたか」', 'かんぬきの外れる音がして、扉が開いた。のぞき窓の向こうには、誰もいなかった。']);
  };
  hidden6({ key: 'bd', ch: 3, host: 'bandit_hideout', dead: [1, 1], wall: [0, 1], wallTile: 'wall', floorTile: 'floor_wood', id: 'a6_bd_store', name: '山賊のアジト・先代の物置', fallback: 'floor_wood', back: [bd.cx, 9], arrive: [bd.cx, 8], openFlag: 'a6_bd_open', gimmick: 'password',
    hint: ['壁の板の一枚だけ、釘が抜けている。', '板の隙間から、かび臭い風が吹いてくる。'], ask: '板を外して、奥へ進む？',
    def: { rows: bd.rows(), chests: [{ id: 'a6bd_1', x: 6, y: 1, gold: 900 }, { id: 'a6bd_2', x: 10, y: 1, item: 'smoked_helm', qty: 1 }],
      events: [scr(2, 5, 'crate', function () { return A6.bdScrap(1); }), scr(13, 5, 'barrel', function () { return A6.bdScrap(2); }), scr(8, 6, 'table', function () { return A6.bdScrap(3); }),
        scr(8, 3, 'door_locked', A6.bdLock, { doneFlag: 'a6_bd_open', doneTile: 'door', tileFlag: 'a6_bd_open' }),
        look(8, 1, 'table', ['古い帳面。表紙に「先代」。', '「勝った夜ほど、見張りを倍にしろ。負けた夜は、黙って寝ろ」', '最後のページに、別の字で大きく「勝ってる間はやめるな」。……その下に小さく「先代は正しかった。おれは守れなかった」'])] } });

  /* ========== ③ 地下の集会所：木箱を押して床の板に載せる ========== */
  var vh = base(18, 12, 'G', 'g'); vh.pts([[8, 9], [8, 10]], 'q').pts([[15, 9]], 'z');
  var VH_HOME = [5, 9], VH_PLATE = [12, 5], VH_ZONE = [1, 4, 16, 10];
  var vhCrate = { type: 'script', solid: true, tile: 'crate', run: async function () { await A6.vhPush(); } };
  Object.defineProperty(vhCrate, 'x', { enumerable: true, get: function () { var d = root.State && root.State.data; return d && d.flags.a6_vh_x !== undefined ? d.flags.a6_vh_x : VH_HOME[0]; } });
  Object.defineProperty(vhCrate, 'y', { enumerable: true, get: function () { var d = root.State && root.State.data; return d && d.flags.a6_vh_y !== undefined ? d.flags.a6_vh_y : VH_HOME[1]; } });
  A6.vhPush = async function () {
    var d = D(), m = W().map, p = W().player;
    if (d.flags.a6_vh_open) { await msg(['木箱は床の板にはまって、もう動かない。']); return; }
    var dd = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir]; var ox = vhCrate.x, oy = vhCrate.y; var nx = ox + dd[0], ny = oy + dd[1];
    var inZone = nx >= VH_ZONE[0] && ny >= VH_ZONE[1] && nx <= VH_ZONE[2] && ny <= VH_ZONE[3];
    var other = m.events.filter(function (e) { return e !== vhCrate && e.x === nx && e.y === ny && !(nx === VH_PLATE[0] && ny === VH_PLATE[1]); }).length;
    if (!inZone || other || !m.passable(nx, ny, d) || m.chestAt(nx, ny) || (nx === p.x && ny === p.y)) { await msg(['重い木箱。この向きには、これ以上押せない。', '（入口の近くのレバーで、木箱を元の場所に戻せる）']); return; }
    d.flags.a6_vh_x = nx; d.flags.a6_vh_y = ny; m.setTile(ox, oy, 'cave_floor'); refresh(); if (root.Audio) root.Audio.sfx('step');
    if (nx === VH_PLATE[0] && ny === VH_PLATE[1]) await open('a6_vh_open', ['ずしん。木箱が床の板に載った。', '板が沈み、奥の扉の鎖がじゃらりと上がった。']);
  };
  A6.vhReset = async function () {
    var d = D(); if (d.flags.a6_vh_open) { await msg(['錆びたレバー。もう動かす必要はない。']); return; }
    var c = await choice('錆びたレバー。「荷を戻す」と書いてある。', ['倒す', 'やめる']); if (c !== 0) return;
    var m = W().map; m.setTile(vhCrate.x, vhCrate.y, 'cave_floor'); delete d.flags.a6_vh_x; delete d.flags.a6_vh_y; refresh(); await msg(['ガラガラと音がして、木箱が元の場所へ引き戻された。']);
  };
  hidden6({ key: 'vh', ch: 5, host: 'verum_hideout', dead: [14, 3], wall: [15, 3], wallTile: 'cave_wall', floorTile: 'cave_floor', id: 'a6_vh_store', name: '地下の集会所・古い荷置き場', fallback: 'cave_floor', back: [vh.cx, 11], arrive: [vh.cx, 10], openFlag: 'a6_vh_open', gimmick: 'push',
    hint: ['岩壁に、木の扉の枠だけが埋まっている。', '枠の下の土に、何かを引きずった跡。'], ask: '枠の中の板を押して、奥へ進む？',
    def: { rows: vh.rows(), chests: [{ id: 'a6vh_1', x: 7, y: 1, item: 'phoenix_feather', qty: 2 }, { id: 'a6vh_2', x: 11, y: 1, gold: 1200 }],
      events: [vhCrate,
        { x: VH_PLATE[0], y: VH_PLATE[1], type: 'inspect', solid: false, tile: 'learn_rune', doneTile: 'crate', tileFlag: 'a6_vh_open', text: ['床に、四角い板がはめこまれている。重い物を載せると沈みそうだ。'] },
        scr(2, 5, 'lever', A6.vhReset), look(4, 9, 'sign', ['壁の落書き。「鎖の扉は、床の板に重しを載せている間だけ開く」', '「荷は、押すことはできても、引くことはできない。押す前に、よく考えろ」']),
        gateEv(9, 3, 'a6_vh_open', ['鎖で吊られた扉。下りたままだ。', '（床の板に、何か重い物を載せる）'], ['鎖が上がり、扉が開いた。']),
        look(9, 1, 'barrel', ['古い樽に、焼き印。「灰鉱の仲間たちへ。いつか、取り分を数えに戻る」', '中は空だ。……数えに戻った者は、いたのだろうか。'])] } });

  /* ========== ④ 鉄冠将軍の砦・門前：番兵を倒す ========== */
  var fg = base(18, 12, 'C', ':'); fg.pts([[2, 5], [2, 6], [15, 5], [15, 6]], 'K').pts([[4, 9], [13, 9]], 'q');
  A6.fgGuard = async function (c) {
    if (F().a6_fg_open) return;
    await msg(['錆びた鉄の番兵が、扉の前に立っている。', '番兵「……シンニュウシャ。……ハイジョスル」']);
    var go = await choice('番兵と戦う？', ['戦う', 'やめておく']); if (go !== 0) return;
    var r = await c.battle(['chain_warden', 'chain_warden', 'mine_imp'], {});
    if (r === 'won') await open('a6_fg_open', ['番兵の目の光が消えた。', '番兵が崩れ落ちると、後ろの扉の錠がカチリと外れた。']);
    else if (r === 'lost') await W().gameOver();
  };
  hidden6({ key: 'fg', ch: 5, host: 'iron_fort_gate', dead: [10, 1], wall: [11, 1], wallTile: 'castle_wall', floorTile: 'ash', id: 'a6_fg_armory', name: '鉄冠将軍の砦・古い武器庫', fallback: 'floor_stone', back: [fg.cx, 11], arrive: [fg.cx, 10], openFlag: 'a6_fg_open', gimmick: 'battle',
    hint: ['城壁の石が一つ、ほかより新しい。', '石の継ぎ目から、油のにおい。……向こうで、何かが動く音がした。'], ask: '石を押して、奥へ進む？',
    def: { rows: fg.rows(), chests: [{ id: 'a6fg_1', x: 7, y: 1, item: 'nonslip_charm', qty: 1 }, { id: 'a6fg_2', x: 11, y: 1, item: 'field_kit', qty: 2 }],
      events: [scr(9, 5, 'pillar', A6.fgGuard, { doneFlag: 'a6_fg_open', doneTile: 'floor_stone', tileFlag: 'a6_fg_open' }),
        gateEv(9, 3, 'a6_fg_open', ['鉄の扉。番兵が守っている。'], ['扉が開いた。']),
        look(9, 1, 'bookshelf', ['武器庫の台帳。「剣、三百。槍、二百。……兵、不足」', '「足りない分は、鉄の番兵で埋めよ。番兵は給料を求めず、逃げず、迷わない」', '……迷わない兵は、引くべき時にも引かなかったのだろう。'])] } });

  /* ========== ⑤ 灰の峠：落とした鍵を探す（鍵は峠のほうに埋まっている） ========== */
  var gp = base(16, 10, 'G', 'g'); gp.pts([[2, 5], [13, 5]], 'q').pts([[3, 8]], 'E').pts([[12, 8]], 't');
  A6.gpDig = async function () {
    var d = D(); if (d.flags.a6_gp_key) { await msg(['掘り返した跡がある。']); return; }
    if (!d.flags.a6_gp_note) { await msg(['足もとの土が、少しだけ柔らかい。']); return; }
    d.flags.a6_gp_key = true; await msg(['ここだ。広場のいちばん東の端。', '土を掘ると、油紙に包んだ錆びた鍵が出てきた！']);
  };
  A6.gpChest = async function () {
    var d = D(); if (d.flags.a6_gp_open) return;
    if (!d.flags.a6_gp_key) { await msg(['頑丈な鉄格子の戸。鍵穴がある。', d.flags.a6_gp_note ? '（鍵は、峠の北の広場の東の端に埋めたと書いてあった）' : '（どこかに、鍵の手がかりはないだろうか）']); return; }
    await open('a6_gp_open', ['錆びた鍵を差しこむと、ぎしりと回った。', '鉄格子の戸が開いた。']);
  };
  hidden6({ key: 'gp', ch: 6, host: 'grania_pass', dead: [6, 7], wall: [6, 8], wallTile: 'mountain', floorTile: 'grass', id: 'a6_gp_shelter', name: '灰の峠・坑夫の避難小屋', fallback: 'cave_floor', back: [gp.cx, 9], arrive: [gp.cx, 8], openFlag: 'a6_gp_open', gimmick: 'lostkey',
    hint: ['岩のくぼみに、板で隠した穴。', '板には、坑夫の符丁で「避難所」。'], ask: '板をずらして、穴に入る？',
    hostEvents: [{ x: 10, y: 4, type: 'script', solid: false, a6dig: 'gp', run: async function () { await A6.gpDig(); } }],
    def: { rows: gp.rows(), chests: [{ id: 'a6gp_1', x: 6, y: 1, item: 'scalein_ring', qty: 1 }, { id: 'a6gp_2', x: 10, y: 1, item: 'mountain_stew', qty: 3 }],
      events: [scr(12, 8, 'table', async function () { F().a6_gp_note = true; await msg(['机の上の書き置き。「奥の格子の鍵は、峠に埋めた。北の出口を下りてすぐの広場の、いちばん東の端だ」', '「小屋に置くと、落盤のとき一緒に埋まる。……分けて置け。それが坑夫の知恵だ」']); }),
        scr(8, 3, 'gate', A6.gpChest, { doneFlag: 'a6_gp_open', doneTile: 'cave_floor', tileFlag: 'a6_gp_open' }),
        look(8, 1, 'barrel', ['水と乾パンの樽。底に刻み文字。「灰が降る日は、掘るな。降りやむまで待て。待つのも仕事だ」'])] } });

  /* ========== ⑥ 地下記録庫：帳簿の損益を計算する（手数料も含めて） ========== */
  var ka = base(18, 12, '#', '_'); ka.rect(1, 5, 1, 4, 'K').rect(16, 5, 1, 4, 'K').pts([[5, 9], [12, 9]], 't');
  A6.kaLock = async function () {
    if (F().a6_ka_open) return;
    await msg(['帳簿庫の扉。錠の上に札。「三つの取引の、差し引きの損益を合わせよ」']);
    var a = await choice('錠の数字', ['＋1,450G', '＋550G', '＋500G', '−150G']);
    if (a !== 2) { await msg(['錠は動かない。……棚の帳簿と、手数料の控えを、もう一度見てみよう。']); return; }
    await open('a6_ka_open', ['カチリ。数字が合った。', '帳簿庫の扉が開いた。']);
  };
  hidden6({ key: 'ka', ch: 6, host: 'kalion_archive_1', dead: [8, 10], wall: [8, 11], wallTile: 'wall', floorTile: 'floor_wood', id: 'a6_ka_ledger', name: '地下記録庫・古い帳簿庫', fallback: 'floor_wood', back: [ka.cx, 11], arrive: [ka.cx, 10], openFlag: 'a6_ka_open', gimmick: 'ledger',
    hint: ['床に近い壁の一角だけ、石の色が違う。', '石には「旧帳簿庫　監査のとき以外、開けるべからず」。'], ask: '石を押して、奥へ進む？',
    def: { rows: ka.rows(), chests: [{ id: 'a6ka_1', x: 7, y: 1, item: 'margin_hammer', qty: 1 }, { id: 'a6ka_2', x: 11, y: 1, gold: 2000 }],
      events: [look(4, 6, 'bookshelf', ['帳簿『取引の一』。「麦を買い、売った。差し引き ＋300G」']), look(9, 6, 'bookshelf', ['帳簿『取引の二』。「塩を買い、値が下がって売った。差し引き −450G」']),
        look(13, 6, 'bookshelf', ['帳簿『取引の三』。「布を買い、売った。差し引き ＋700G」']), look(5, 9, 'table', ['手数料の控え。「三回の取引で、仲買人へ合わせて 50G」']),
        scr(9, 3, 'door_locked', A6.kaLock, { doneFlag: 'a6_ka_open', doneTile: 'door', tileFlag: 'a6_ka_open' }),
        look(9, 1, 'bookshelf', ['記録庫の主任の覚え書き。「勝った回数を数える者は多い。差し引きを数える者は少ない」', '「二勝一敗でも、負けが大きければ損だ。手数料も、損のうちだ」'])] } });

  /* ========== ⑦ 秘密研究所：天秤をつり合わせる（おもりを選ぶ） ========== */
  var kl = base(16, 10, '#', ':'); kl.pts([[2, 5], [13, 5]], 'K');
  A6.klSum = function () { return [1, 3, 5, 9].reduce(function (s, k) { return s + (F()['a6_kl_' + k] ? k : 0); }, 0); };
  A6.klWeight = async function (k) {
    if (F().a6_kl_open) { await msg(['天秤はつり合ったままだ。']); return; }
    var on = !!F()['a6_kl_' + k]; var c = await choice(k + 'の重さのおもり。' + (on ? '右の皿に載っている。' : '棚に置いてある。'), [on ? '皿から下ろす' : '右の皿に載せる', 'やめる']); if (c !== 0) return;
    F()['a6_kl_' + k] = !on; refresh(); var s = A6.klSum();
    if (s === 13) await open('a6_kl_open', ['左の皿 13、右の皿 ' + s + '。天秤が、ぴたりとつり合った。', '天秤の針が中央を指すと、奥の扉の留め金が外れた。']);
    else await msg(['左の皿 13、右の皿 ' + s + '。' + (s < 13 ? '右が軽い。' : '右が重い。')]);
  };
  hidden6({ key: 'kl', ch: 6, host: 'kalion_lab', dead: [10, 2], wall: [11, 2], wallTile: 'wall', floorTile: 'floor_wood', id: 'a6_kl_scale', name: '秘密研究所・計量室', fallback: 'floor_stone', back: [kl.cx, 9], arrive: [kl.cx, 8], openFlag: 'a6_kl_open', gimmick: 'balance',
    hint: ['壁に、細い隙間。中から、金属がきしむ音。', '隙間の上に、小さく「計量室」。'], ask: '隙間を押し広げて、奥へ進む？',
    def: { rows: kl.rows(), chests: [{ id: 'a6kl_1', x: 6, y: 1, item: 'stats_staff', qty: 1 }, { id: 'a6kl_2', x: 10, y: 1, item: 'mana_tea', qty: 2 }],
      events: [scr(8, 5, 'stall', async function () { var s = A6.klSum(); await msg(['大きな天秤。左の皿に 13 の重さのおもりが固定されている。', '右の皿：' + s + '。' + (F().a6_kl_open ? 'つり合っている。' : '扉の留め金は、天秤がつり合ったときだけ外れるらしい。')]); }),
        scr(3, 6, 'ore', function () { return A6.klWeight(1); }), scr(5, 7, 'ore', function () { return A6.klWeight(3); }),
        scr(10, 7, 'ore', function () { return A6.klWeight(5); }), scr(12, 6, 'ore', function () { return A6.klWeight(9); }),
        gateEv(8, 3, 'a6_kl_open', ['留め金のかかった扉。', '（天秤をつり合わせる）'], ['扉が開いた。']),
        look(8, 1, 'bookshelf', ['研究員の手帳。「同じ量を、別の物で量りなおす。数字が合わなければ、どちらかがうそをついている」', '「帳簿も、天秤と同じだ」'])] } });

  /* ========== ⑧ 時計塔（アルナの廃墟）：鏡で光を導く ========== */
  var ar = base(18, 12, '#', ':'); ar.pts([[3, 5], [15, 10]], 'I');
  var AR_M = { A: [6, 9], B: [6, 5], C: [13, 5] }; var AR_SRC = [2, 9], AR_RECV = [13, 8];
  A6.arPath = function () {
    var m = W().map; var x = AR_SRC[0], y = AR_SRC[1], dx = 1, dy = 0; var at = {}; Object.keys(AR_M).forEach(function (k) { at[AR_M[k].join(',')] = k; });
    for (var i = 0; i < 60; i++) {
      x += dx; y += dy; var k = at[x + ',' + y];
      if (x === AR_RECV[0] && y === AR_RECV[1]) return { hit: 'recv' };
      if (k) { var s = val('a6_ar_' + k, k === 'C' ? 0 : 1); var t; if (s === 0) { t = dx; dx = -dy; dy = -t; } else { t = dx; dx = dy; dy = t; } continue; }   // 0＝「／」（東→北）、1＝「＼」（東→南）
      if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h || root.Tiles.isSolid(m.tiles[y][x])) return { hit: 'wall', x: x, y: y, dir: dx === 1 ? '東' : dx === -1 ? '西' : dy === -1 ? '北' : '南' };
    }
    return { hit: 'wall' };
  };
  A6.arMirror = async function (k) {
    if (F().a6_ar_open) { await msg(['鏡は、光を受け止めたまま止まっている。']); return; }
    var key = 'a6_ar_' + k, s = val(key, k === 'C' ? 0 : 1);
    var c = await choice('古い鏡（' + k + '）。いまの向きは「' + (s === 0 ? '／' : '＼') + '」。', ['向きを変える', 'そのまま']); if (c !== 0) return;
    F()[key] = 1 - s; var r = A6.arPath();
    if (r.hit === 'recv') await open('a6_ar_open', ['鏡を回した。光が鏡から鏡へ渡り……受け皿の水晶に届いた！', '水晶が輝き、奥の扉がゆっくりと開いた。']);
    else await msg(['鏡を回した。いまの向きは「' + (1 - s === 0 ? '／' : '＼') + '」。', '光は' + r.dir + 'へ進み、壁に当たって消えている。']);
  };
  hidden6({ key: 'ar', ch: 8, host: 'aruna_ruins_1', dead: [13, 1], wall: [13, 0], wallTile: 'wall', floorTile: 'floor_wood', id: 'a6_ar_light', name: '時計塔・光路の間', fallback: 'floor_stone', back: [ar.cx, 11], arrive: [ar.cx, 10], openFlag: 'a6_ar_open', gimmick: 'mirror',
    hint: ['天井近くの壁に、細い光が差しこむ穴。', '穴の下の壁が、扉のように浮いている。'], ask: '壁を押して、奥へ進む？',
    def: { rows: ar.rows(), chests: [{ id: 'a6ar_1', x: 7, y: 1, item: 'market_bell', qty: 1 }, { id: 'a6ar_2', x: 11, y: 1, item: 'hi_ether', qty: 2 }],
      events: [look(AR_SRC[0], AR_SRC[1], 'lamp', ['灯守りの灯。東へ、まっすぐ光を投げている。']),
        scr(AR_RECV[0], AR_RECV[1], 'pillar', async function () { await msg(F().a6_ar_open ? ['受け皿の水晶。光を受けて輝いている。'] : ['受け皿の水晶。光が届けば、扉が開くらしい。', '（灯の光を、鏡で受け皿まで導く。「／」は東からの光を北へ、「＼」は南へ曲げる）']); }, { doneTile: 'lamp', tileFlag: 'a6_ar_open' }),
        scr(AR_M.A[0], AR_M.A[1], 'crystal', function () { return A6.arMirror('A'); }), scr(AR_M.B[0], AR_M.B[1], 'crystal', function () { return A6.arMirror('B'); }), scr(AR_M.C[0], AR_M.C[1], 'crystal', function () { return A6.arMirror('C'); }),
        gateEv(9, 3, 'a6_ar_open', ['重い扉。受け皿の水晶とつながっているらしい。'], ['扉が開いた。']),
        look(9, 1, 'bookshelf', ['灯守りの手記。「灯は、遠くの船のためにある。光は曲げられても、灯そのものの場所は変えられない」'])] } });

  /* ========== ⑨ 霧の島：水がめで量る（三と五の水がめで、ちょうど四） ========== */
  var mi = base(16, 10, 'G', 'g'); mi.pts([[7, 8], [8, 8]], 'u').pts([[2, 5], [13, 8]], 'Y');
  function miShow() { return '三の水がめ：' + val('a6_mi_a', 0) + '　五の水がめ：' + val('a6_mi_b', 0); }
  A6.miJar = async function (k) {
    if (F().a6_mi_open) { await msg(['水がめ。もう使わなくてよさそうだ。']); return; }
    var a = val('a6_mi_a', 0), b = val('a6_mi_b', 0);
    var opts = k === 'a' ? ['泉の水で満たす', '空ける', '五の水がめへ注ぐ', 'やめる'] : ['泉の水で満たす', '空ける', '三の水がめへ注ぐ', '水盤へ注ぐ', 'やめる'];
    var c = await choice((k === 'a' ? '三' : '五') + 'の水がめ。（' + miShow() + '）', opts); if (c < 0 || opts[c] === 'やめる') return;
    if (k === 'a') { if (c === 0) a = 3; else if (c === 1) a = 0; else { var t = Math.min(a, 5 - b); a -= t; b += t; } }
    else { if (c === 0) b = 5; else if (c === 1) b = 0; else if (c === 2) { var t2 = Math.min(b, 3 - a); b -= t2; a += t2; } else {
      if (b === 4) { F().a6_mi_a = a; F().a6_mi_b = 0; await open('a6_mi_open', ['水盤に水を注いだ。……水面が、刻まれた線にぴたりと止まった。', '霧が晴れるように、奥の岩戸が開いた。']); return; }
      F().a6_mi_b = 0; F().a6_mi_a = a; await msg(['水盤に ' + b + ' の水を注いだ。……' + (b > 4 ? 'あふれて' : '線に届かず、') + '水は地面にしみこんでしまった。', '（水盤の線は「四」）']); return; } }
    F().a6_mi_a = a; F().a6_mi_b = b; await msg([miShow()]);
  };
  hidden6({ key: 'mi', ch: 8, host: 'mist_isle', dead: [14, 3], wall: [15, 3], wallTile: 'mountain', floorTile: 'grass', id: 'a6_mi_spring', name: '霧の島・湧き水の洞', fallback: 'cave_floor', back: [mi.cx, 9], arrive: [mi.cx, 8], openFlag: 'a6_mi_open', gimmick: 'jugs',
    hint: ['岩の裂け目から、冷たい水の音。', '裂け目の脇に、苔むした小さな祠。'], ask: '裂け目に入る？',
    def: { rows: mi.rows(), chests: [{ id: 'a6mi_1', x: 6, y: 1, item: 'revive_lantern', qty: 3 }, { id: 'a6mi_2', x: 10, y: 1, gold: 2500 }],
      events: [scr(4, 6, 'barrel', function () { return A6.miJar('a'); }), scr(11, 6, 'barrel', function () { return A6.miJar('b'); }),
        look(8, 5, 'well', ['石の水盤。内側に一本の線と「四」の字。', '「多すぎても、少なすぎても、霧は晴れない」']),
        gateEv(8, 3, 'a6_mi_open', ['苔むした岩戸。', '（水盤に、ちょうど「四」の水を）'], ['岩戸が開いた。'], 'cave_wall', 'cave_floor'),
        look(8, 1, 'well', ['祠の奥の石。「量れない物は、量れる物の組み合わせで量れ」', '霧の島の漁師は、網の目と潮の時刻で、見えない魚の数を数えたという。'])] } });

  /* ========== ⑩ 海底都市エルミナ：潮の流れに乗る（流れのマスに入ると運ばれる） ========== */
  var el = Grid(18, 12, ':').border('C'); el.rect(1, 3, 16, 1, 'C').rect(1, 1, 5, 2, 'C').rect(13, 1, 4, 2, 'C').set(9, 11, ':');
  var EL_ROWS = { 5: '########.######.', 6: '>>>>>>>>^<<<<<<v', 7: 'v<<<<<^>>>>>>>vv' }; var EL_FLOW = {};
  Object.keys(EL_ROWS).forEach(function (yy) { var s = EL_ROWS[yy]; for (var i = 0; i < s.length; i++) { var x = i + 1, y = +yy; if (s[i] === '#') el.set(x, y, 'C'); else if (s[i] === '.') el.set(x, y, ':'); else { el.set(x, y, 'u'); EL_FLOW[x + ',' + y] = s[i]; } } });
  A6.EL_FLOW = EL_FLOW;
  function elStep(m, p, warping) {
    if (warping) return false; var d = D();
    if (p.y === 4 && !d.flags.a6_el_open) { d.flags.a6_el_open = true; refresh(); root.Win.toast && root.Win.toast('潮の流れを抜けた！ 奥の扉が開いた'); }
    var f = EL_FLOW[p.x + ',' + p.y]; if (!f) return false;
    var dd = { '^': [0, -1], 'v': [0, 1], '<': [-1, 0], '>': [1, 0] }[f]; var nx = p.x + dd[0], ny = p.y + dd[1];
    if (!m.passable(nx, ny, d) || m.eventAt(nx, ny)) return false;
    p.tx = nx; p.ty = ny; p.moving = true; p.progress = 0; return true;   // 次のマスへ流される（着いたらまた onStep）
  }
  hidden6({ key: 'el', ch: 9, host: 'elmina_undersea', dead: [20, 18], wall: [21, 18], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a6_el_current', name: '海底都市・潮流の回廊', fallback: 'floor_stone', back: [9, 11], arrive: [9, 10], openFlag: 'a6_el_open', gimmick: 'current',
    hint: ['壁の向こうから、水の流れる低い音。', '壁の石に、波の紋章。指でなぞると、石がわずかに沈んだ。'], ask: '紋章を押して、奥へ進む？',
    def: { rows: el.rows(), onStep: elStep, chests: [{ id: 'a6el_1', x: 7, y: 1, item: 'sandstorm_cloak', qty: 1 }, { id: 'a6el_2', x: 11, y: 1, item: 'hi_potion', qty: 3 }],
      events: [look(4, 10, 'sign', ['水路の案内板。「流れのマスに入ると、流れの向きへ運ばれる」', '「奥へ上る潮は一筋だけ。『七』の柱から、まっすぐ北の流れ。ほかの潮は、手前へ戻る」']),
        look(2, 9, 'pillar', ['柱。「二」と刻まれている。']), look(7, 9, 'pillar', ['柱。「七」と刻まれている。']), look(12, 9, 'pillar', ['柱。「十二」と刻まれている。']),
        gateEv(9, 3, 'a6_el_open', ['水門。上の通路まで来れば開くらしい。'], ['水門が開いた。']),
        look(9, 1, 'crystal', ['海底都市の航海士の碑。「流れに逆らって泳ぐ者は、力尽きる。流れを選んで乗る者が、遠くへ行く」'])] } });

  /* ========== ⑪ 地下契約室：両替の往復で、差額の分だけ減る ========== */
  var tb = base(18, 12, '#', '_'); tb.rect(1, 5, 1, 4, 'K').rect(16, 5, 1, 4, 'K').pts([[6, 8], [7, 8], [10, 8], [11, 8]], 'T');
  A6.tbLock = async function () {
    if (F().a6_tb_open) return;
    await msg(['金庫番の像が問う。「手元に 1,000ルーメ。ポヨに替え、すぐにルーメへ戻すと、何ルーメになる？（1ルーメに満たない分は切り捨て）」']);
    var a = await choice('答え', ['1,000ルーメ', '1,013ルーメ', '986ルーメ', '993ルーメ']);
    if (a !== 2) { await msg(['像は黙ったままだ。……両替の表を、もう一度見てみよう。']); return; }
    await open('a6_tb_open', ['像「……そのとおり。往復するだけで、差額のぶん減る」', '金庫の扉が開いた。']);
  };
  hidden6({ key: 'tb', ch: 10, host: 'time_bank_vault_1', dead: [11, 1], wall: [11, 0], wallTile: 'wall', floorTile: 'floor_wood', id: 'a6_tb_exchange', name: '地下契約室・古い両替所', fallback: 'floor_wood', back: [tb.cx, 11], arrive: [tb.cx, 10], openFlag: 'a6_tb_open', gimmick: 'exchange',
    hint: ['壁の金具に、古い両替商の看板が引っかかっている。', '看板の裏の壁が、扉のように切れている。'], ask: '看板の裏から、奥へ進む？',
    def: { rows: tb.rows(), chests: [{ id: 'a6tb_1', x: 7, y: 1, item: 'vol_earring', qty: 1 }, { id: 'a6tb_2', x: 11, y: 1, gold: 4000 }],
      events: [look(4, 6, 'sign', ['両替の表。「ルーメをポヨに替えるとき：1ルーメ＝149ポヨ」', '「ポヨをルーメに替えるとき：151ポヨで1ルーメ」']),
        look(13, 6, 'sign', ['両替商の張り紙。「替える値と、戻す値は違います。その差が、わたしどもの手間賃です」']),
        scr(9, 3, 'door_locked', A6.tbLock, { doneFlag: 'a6_tb_open', doneTile: 'door', tileFlag: 'a6_tb_open' }),
        look(9, 1, 'bookshelf', ['両替商の帳面。「何度も行き来する客ほど、気づかぬうちに削られていく」', '「替えるのは、替える理由があるときだけにしなされ」'])] } });

  /* ========== ⑫ 廃棄された旧都市：暗号（かなを一つずらす）を解く ========== */
  var oc = base(18, 12, '#', ':'); oc.pts([[2, 9], [15, 9]], 'q');
  A6.ocLock = async function () {
    if (F().a6_oc_open) return;
    await msg(['隔壁の端末。「認証語を入力せよ。記録上の認証語は『ふりこ』」']);
    var a = await choice('認証語', ['ふりこ', 'ひらけ', 'はらか', 'へるさ']);
    if (a !== 1) { await msg(['端末「認証語が違います」', '（記録の言葉は、そのままでは使えないらしい。もう一つの端末に、記録のしかたが残っている）']); return; }
    await open('a6_oc_open', ['端末「認証しました」', '隔壁が音もなく開いた。']);
  };
  hidden6({ key: 'oc', ch: 11, host: 'old_city_1', dead: [11, 1], wall: [11, 0], wallTile: 'wall', floorTile: 'floor_wood', id: 'a6_oc_vault', name: '旧都市・暗号保管室', fallback: 'floor_stone', back: [oc.cx, 11], arrive: [oc.cx, 10], openFlag: 'a6_oc_open', gimmick: 'cipher',
    hint: ['壁の一部が、ほかより新しい金属でふさがれている。', '小さな表示が点滅している。「保管室：手動で開放可」'], ask: '表示を押して、奥へ進む？',
    def: { rows: oc.rows(), chests: [{ id: 'a6oc_1', x: 7, y: 1, item: 'observer_lens', qty: 1 }, { id: 'a6oc_2', x: 11, y: 1, item: 'panacea', qty: 3 }],
      events: [look(4, 6, 'counter', ['記録端末。「記録の規則：言葉は、五十音の同じ行で一つ後ろの文字にして記録する」', '「例：『あさ』は『いし』と記録する」']),
        look(14, 6, 'counter', ['作業日誌。「認証語を、そのまま書き残す者がいた。だから、ずらして書くことにした」']),
        scr(9, 3, 'door_locked', A6.ocLock, { doneFlag: 'a6_oc_open', doneTile: 'door', tileFlag: 'a6_oc_open' }),
        look(9, 1, 'counter', ['保管室の記録。「鍵を隠すより、鍵の作り方を隠すほうが難しい」'])] } });

  /* ========== ⑬ 自動工場：回路のスイッチ（主灯を点け、警報は鳴らさない） ========== */
  var af = base(18, 12, '#', ':'); af.pts([[2, 9], [15, 9], [2, 5]], 'z');
  function afState() { var A = !!F().a6_af_a, B = !!F().a6_af_b, C = !!F().a6_af_c; return { x: (A && B) || C, y: A && C, A: A, B: B, C: C }; }
  A6.afLever = async function (k) {
    if (F().a6_af_open) { await msg(['レバー。搬出口はもう開いている。']); return; }
    var key = 'a6_af_' + k; F()[key] = !F()[key]; var s = afState(); F().a6_af_lx = s.x; F().a6_af_ly = s.y; refresh();
    var line = 'スイッチ' + k.toUpperCase() + 'を' + (F()[key] ? '入れた' : '切った') + '。主灯：' + (s.x ? '点灯' : '消灯') + '　警報：' + (s.y ? '鳴っている' : '静か');
    if (s.x && !s.y) await open('a6_af_open', [line, '主灯が点き、警報は静かなまま。……搬出口のシャッターが上がった。']);
    else await msg([line]);
  };
  hidden6({ key: 'af', ch: 11, host: 'auto_factory_1', dead: [16, 9], wall: [16, 10], wallTile: 'wall', floorTile: 'floor_wood', id: 'a6_af_control', name: '自動工場・配電室', fallback: 'floor_stone', back: [af.cx, 11], arrive: [af.cx, 10], openFlag: 'a6_af_open', gimmick: 'circuit',
    hint: ['床すれすれの壁に、点検口。', '点検口の札：「配電室。警報が鳴ったら、すぐに離れること」'], ask: '点検口から、奥へ進む？',
    def: { rows: af.rows(), chests: [{ id: 'a6af_1', x: 7, y: 1, item: 'field_kit', qty: 3 }, { id: 'a6af_2', x: 11, y: 1, gold: 4500 }],
      events: [scr(5, 7, 'lever', function () { return A6.afLever('a'); }), scr(8, 7, 'lever', function () { return A6.afLever('b'); }), scr(11, 7, 'lever', function () { return A6.afLever('c'); }),
        look(13, 5, 'pillar', ['主灯。']), look(15, 5, 'pillar', ['警報灯。']),
        look(4, 9, 'sign', ['配線図。「主灯：スイッチAとBが両方入っているとき、またはCが入っているときに点く」', '「警報：AとCが両方入っていると鳴る」「主灯が点き、警報が鳴っていないとき、搬出口が開く」']),
        gateEv(9, 3, 'a6_af_open', ['搬出口のシャッター。', '（主灯を点け、警報は鳴らさない）'], ['シャッターが上がった。']),
        look(9, 1, 'crate', ['出荷されなかった箱。札に「検品不合格：理由　警報を無視したため」'])] } });
  // 主灯・警報灯の見た目（点灯・警報のときに絵を変える）
  (function () { var ev = M.a6_af_control.events; ev.forEach(function (e) { if (e.x === 13 && e.y === 5) { e.doneTile = 'lamp'; e.tileFlag = 'a6_af_lx'; } if (e.x === 15 && e.y === 5) { e.doneTile = 'torch'; e.tileFlag = 'a6_af_ly'; } }); })();

  /* ========== ⑭ オラクル中枢 第2層：数を二進法の灯で写す（5・2・5） ========== */
  var orc = base(18, 12, 'C', ':');
  var OR_TARGET = [1, 0, 1, 0, 1, 0, 1, 0, 1];   // 101／010／101
  function orIdx(i) { return [6 + (i % 3) * 3, 5 + Math.floor(i / 3) * 2]; }
  A6.orPanel = async function (i) {
    if (F().a6_or_open) { await msg(['灯の板。記録層の鍵は、もう開いている。']); return; }
    var k = 'a6_or_p' + i; F()[k] = !F()[k]; refresh();
    var ok = OR_TARGET.every(function (t, j) { return !!F()['a6_or_p' + j] === !!t; });
    if (ok) await open('a6_or_open', ['九つの灯が、記録の形にそろった。', '記録層の鍵が解け、奥の扉が開いた。']);
  };
  var orEv = [];
  for (var oi = 0; oi < 9; oi++) (function (i) { var p = orIdx(i); orEv.push(scr(p[0], p[1], 'pillar', function () { return A6.orPanel(i); }, { doneTile: 'lamp', tileFlag: 'a6_or_p' + i })); })(oi);
  hidden6({ key: 'or', ch: 12, host: 'oracle_core_2', dead: [7, 1], wall: [7, 0], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a6_or_lamps', name: 'オラクル中枢・記録の鍵の間', fallback: 'floor_stone', back: [orc.cx, 11], arrive: [orc.cx, 10], openFlag: 'a6_or_open', gimmick: 'pattern',
    hint: ['壁に、九つの小さな灯の模様。', '模様の下に「記録層・保守用」。押すと、壁が奥へ沈んだ。'], ask: '奥へ進む？',
    def: { rows: orc.rows(), chests: [{ id: 'a6or_1', x: 7, y: 1, item: 'elixir', qty: 1 }, { id: 'a6or_2', x: 11, y: 1, item: 'hi_ether', qty: 3 }],
      events: orEv.concat([look(15, 8, 'counter', ['保守端末。「記録層の鍵：上の段から順に 5・2・5」', '「数は灯の点き方で表す。一段に灯は三つ。左から 4・2・1 の位。点いた灯の位を足すと、その段の数になる」']),
        gateEv(9, 3, 'a6_or_open', ['記録層の扉。', '（九つの灯を、鍵の数の形に点ける）'], ['扉が開いた。']),
        look(9, 1, 'counter', ['保守係の書き置き。「オラクルは、0と1だけで未来を語った。だが、相場は0と1のあいだで動いていた」'])]) } });

  /* ========== ⑮ 起源の実験室：薬品の色を混ぜる（緑と紫） ========== */
  var ol = base(18, 12, '#', ':'); ol.pts([[2, 5], [15, 5]], 'K');
  var OL_MIX = ['赤と青を注ぐ', '赤と黄を注ぐ', '青と黄を注ぐ', 'やめる']; var OL_COL = ['紫', '橙', '緑'];
  A6.olVat = async function (n) {
    var key = 'a6_ol_v' + n; if (F()[key]) { await msg(['封の器。もう' + (n === 1 ? '緑' : '紫') + 'の液で満ちている。']); return; }
    var c = await choice('封の器（' + (n === 1 ? '左' : '右') + '）。空っぽだ。', OL_MIX); if (c < 0 || c === 3) return;
    var want = n === 1 ? 2 : 0;
    if (c !== want) { await msg(['二つの薬品を注ぐと、液は' + OL_COL[c] + 'になった。', '……器の封は反応しない。液は器の底から抜けていった。']); return; }
    F()[key] = true; refresh(); await msg(['二つの薬品を注ぐと、液は' + OL_COL[c] + 'に変わった。器の封が、かちりと外れた。']);
    if (F().a6_ol_v1 && F().a6_ol_v2) await open('a6_ol_open', ['二つの器の封が外れると、奥の排気口の扉が開いた。']);
  };
  hidden6({ key: 'ol', ch: 13, host: 'origin_lab_1', dead: [13, 1], wall: [13, 0], wallTile: 'wall', floorTile: 'floor_wood', id: 'a6_ol_mixing', name: '起源の実験室・調合室', fallback: 'floor_stone', back: [ol.cx, 11], arrive: [ol.cx, 10], openFlag: 'a6_ol_open', gimmick: 'mix',
    hint: ['壁の換気口から、つんとするにおい。', '換気口の下の壁が、手で押すとわずかに動く。'], ask: '壁を押して、奥へ進む？',
    def: { rows: ol.rows(), chests: [{ id: 'a6ol_1', x: 7, y: 1, item: 'thinice_brooch', qty: 1 }, { id: 'a6ol_2', x: 11, y: 1, item: 'spirit_drop', qty: 2 }],
      events: [look(4, 7, 'barrel', ['薬品の樽。「赤」']), look(7, 7, 'barrel', ['薬品の樽。「青」']), look(10, 7, 'barrel', ['薬品の樽。「黄」']),
        scr(6, 5, 'well', function () { return A6.olVat(1); }, { doneTile: 'fountain', tileFlag: 'a6_ol_v1' }), scr(12, 5, 'well', function () { return A6.olVat(2); }, { doneTile: 'fountain', tileFlag: 'a6_ol_v2' }),
        look(14, 9, 'sign', ['実験の手順書。「左の器には緑、右の器には紫。二つの色がそろうと、排気口の封が外れる」']),
        gateEv(9, 3, 'a6_ol_open', ['排気口の扉。', '（二つの器に、決められた色の液を）'], ['扉が開いた。']),
        look(9, 1, 'bookshelf', ['研究者の記録。「一つの色だけでは、何も起きなかった。混ぜたときにだけ、別の色が生まれた」'])] } });

  /* ========== ⑯ 星見塔：星の輪を移す（三枚の輪。大きい輪を小さい輪の上に置けない） ========== */
  var st = base(18, 12, 'C', ':');
  var RING = { '1': '小', '2': '中', '3': '大' }; var ST_P = ['左', '中', '右'];
  function stGet(i) { return val('a6_st_p' + i, i === 0 ? '321' : ''); }
  function stShow() { return ST_P.map(function (n, i) { var s = stGet(i); return n + '：' + (s ? s.split('').map(function (c) { return RING[c]; }).join('・') : '—'); }).join('　') + '　（手：' + (F().a6_st_hold ? RING[F().a6_st_hold] + 'の輪' : 'なし') + '）'; }
  A6.stPillar = async function (i) {
    if (F().a6_st_open) { await msg(['星の柱。三枚の輪が、右の柱にそろっている。']); return; }
    var s = stGet(i), h = F().a6_st_hold || '';
    if (!h) { if (!s) { await msg(['この柱には、輪がない。', stShow()]); return; } F().a6_st_hold = s.slice(-1); F()['a6_st_p' + i] = s.slice(0, -1); await msg([RING[F().a6_st_hold] + 'の輪を取った。', stShow()]); return; }
    if (s && s.slice(-1) < h) { await msg(['小さい輪の上に、大きい輪は置けない。', stShow()]); return; }
    F()['a6_st_p' + i] = s + h; F().a6_st_hold = '';
    if (stGet(2) === '321') { await open('a6_st_open', ['三枚の輪が、右の柱にそろった。', '天井の星図が回り、奥の扉が開いた。']); return; }
    await msg([RING[h] + 'の輪を置いた。', stShow()]);
  };
  A6.stReset = async function () { if (F().a6_st_open) { await msg(['星図の台座。']); return; } var c = await choice('星図の台座。「輪を初めに戻す」', ['戻す', 'やめる']); if (c !== 0) return; F().a6_st_p0 = '321'; F().a6_st_p1 = ''; F().a6_st_p2 = ''; F().a6_st_hold = ''; await msg(['輪が、すべて左の柱に戻った。', stShow()]); };
  hidden6({ key: 'st', ch: 14, host: 'star_tower_1', dead: [1, 1], wall: [0, 1], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a6_st_rings', name: '星見塔・星の輪の間', fallback: 'floor_stone', back: [st.cx, 11], arrive: [st.cx, 10], openFlag: 'a6_st_open', gimmick: 'hanoi',
    hint: ['壁の石に、三つの輪の模様。', '模様の一つを押すと、壁が回るように動いた。'], ask: '奥へ進む？',
    def: { rows: st.rows(), chests: [{ id: 'a6st_1', x: 7, y: 1, item: 'elixir', qty: 2 }, { id: 'a6st_2', x: 11, y: 1, gold: 6000 }],
      events: [scr(5, 7, 'pillar', function () { return A6.stPillar(0); }), scr(9, 7, 'pillar', function () { return A6.stPillar(1); }), scr(13, 7, 'pillar', function () { return A6.stPillar(2); }),
        scr(3, 9, 'sign', A6.stReset), look(15, 9, 'sign', ['碑文。「三枚の星の輪を、左の柱から右の柱へ。一度に動かせるのは一枚。大きい輪を、小さい輪の上に置いてはならない」']),
        gateEv(9, 3, 'a6_st_open', ['星図の扉。', '（三枚の輪を、右の柱へ）'], ['扉が開いた。']),
        look(9, 1, 'pillar', ['星見の記録。「大きな周期は、小さな周期を何度も重ねて、やっと一つ動く」'])] } });

  /* ========== ⑰ 天空神殿：見えない雲の道（安全なマスの並びは石板の図） ========== */
  var sk = base(18, 12, 'C', ':'); sk.rect(1, 5, 5, 5, 'C').rect(12, 5, 5, 5, 'C').rect(6, 5, 1, 5, 'C').rect(7, 5, 5, 5, 'P');
  var SK_SAFE = {}; [[11, 5], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [7, 7], [7, 8], [8, 8], [9, 8], [9, 9]].forEach(function (q) { SK_SAFE[q[0] + ',' + q[1]] = true; });
  A6.SK_SAFE = SK_SAFE;
  function skStep(m, p, warping) {
    if (warping) return false; var d = D();
    if (p.y === 4 && !d.flags.a6_sk_open) { d.flags.a6_sk_open = true; refresh(); }
    if (p.x >= 7 && p.x <= 11 && p.y >= 5 && p.y <= 9 && !SK_SAFE[p.x + ',' + p.y]) {
      W().busy = true; msg(['足もとの雲が抜けた！', '……ふわりと下の雲に受け止められ、入口の前まで運ばれた。']).then(function () { W().busy = false; W().enterMap('a6_sk_clouds', 9, 10, 'up'); }); return true;
    }
    return false;
  }
  hidden6({ key: 'sk', ch: 14, host: 'sky_temple_1', dead: [1, 3], wall: [0, 3], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a6_sk_clouds', name: '天空神殿・雲の回廊', fallback: 'floor_stone', back: [9, 11], arrive: [9, 10], openFlag: 'a6_sk_open', gimmick: 'invisible',
    hint: ['壁の向こうから、風の音。', '壁の石が一枚、雲のように白く、触れると冷たい。'], ask: '白い石を押して、奥へ進む？',
    def: { rows: sk.rows(), onStep: skStep, chests: [{ id: 'a6sk_1', x: 7, y: 1, item: 'phoenix_ash', qty: 1 }, { id: 'a6sk_2', x: 11, y: 1, item: 'mana_soda', qty: 2 }],
      events: [look(4, 10, 'sign', ['石板の図（上が北、雲の床は横に五つ・縦に五つ）。', '□□□□■', '■■■■■', '■□□□□', '■■■□□', '□□■□□', '「■の雲だけが、人の重さを支える」']),
        gateEv(9, 3, 'a6_sk_open', ['神殿の扉。雲の床を渡りきれば開く。'], ['扉が開いた。']),
        look(9, 1, 'pillar', ['天空の守り手の言葉。「見えないものを、見えるものの記録で渡れ」'])] } });

  /* ========== ⑱ 虚無の荒野：リスクリワードの扉（損切りと利確の幅の比が最も大きい扉） ========== */
  var vw = base(18, 12, '9', '+'); vw.set(6, 3, '9').set(12, 3, '9'); vw.pts([[3, 7], [14, 8]], '9');
  var VW_DOOR = { 6: ['損切り 50', '利確 50'], 9: ['損切り 80', '利確 120'], 12: ['損切り 30', '利確 90'] };
  A6.vwDoor = async function (x) {
    if (F().a6_vw_open) { if (x === 12) return; await msg(['扉は閉ざされたままだ。右の扉が開いている。']); return; }
    var t = VW_DOOR[x]; var c = await choice('扉の札：「' + t[0] + '／' + t[1] + '」', ['開ける', 'やめる']); if (c !== 0) return;
    if (x !== 12) { await msg(['扉は冷たく閉ざされたまま、びくともしない。', '（三つの扉の札を、見比べてみよう）']); return; }
    await open('a6_vw_open', ['扉が、音もなく開いた。', '……失うかもしれない幅は小さく、得られるかもしれない幅は大きい。三つのうち、いちばん割のよい扉だった。']);
  };
  hidden6({ key: 'vw', ch: 15, host: 'void_wasteland_1', dead: [10, 1], wall: [10, 0], wallTile: 'slag', floorTile: 'darkland', id: 'a6_vw_doors', name: '虚無の荒野・三つの扉の間', fallback: 'darkland', back: [vw.cx, 11], arrive: [vw.cx, 10], openFlag: 'a6_vw_open', gimmick: 'riskreward',
    hint: ['黒い岩の壁に、三本の線が刻まれている。', '線をなぞると、岩が煙のように薄れた。'], ask: '奥へ進む？',
    def: { rows: vw.rows(), chests: [{ id: 'a6vw_1', x: 7, y: 1, item: 'elixir', qty: 2 }, { id: 'a6vw_2', x: 11, y: 1, item: 'phoenix_ash', qty: 1 }],
      events: [scr(6, 3, 'door_locked', function () { return A6.vwDoor(6); }), scr(9, 3, 'door_locked', function () { return A6.vwDoor(9); }),
        scr(12, 3, 'door_locked', function () { return A6.vwDoor(12); }, { doneFlag: 'a6_vw_open', doneTile: 'door', tileFlag: 'a6_vw_open' }),
        look(9, 7, 'sign', ['碑。「失うかもしれない幅と、得られるかもしれない幅。その比がいちばん大きい扉だけが開く」', '「どの扉も、必ず得られるとは書いていない。……それでも、割のよい扉を選べ」']),
        look(9, 1, 'slag', ['虚無の旅人の言葉。「勝てるかどうかは、扉を開けるまで分からない。分かるのは、負けたときにいくら失うかだけだ」'])] } });

  /* ========== ⑲ 魔王城 2階：本物の像を見抜く（一つだけ違う像） ========== */
  var dc = base(18, 12, 'C', ':'); dc.pts([[2, 9], [15, 9]], 'I');
  var DC_TXT = { 4: '目は閉じている', 7: '目は閉じている', 11: '目は、かっと見開いている', 14: '目は閉じている' };
  A6.dcStatue = async function (x) {
    if (F().a6_dc_open) { await msg(['像。台座はもう動かない。']); return; }
    await msg(['欲望の像。金貨を握りしめた右手。' + DC_TXT[x] + '。', '台座に「欲は尽きず」。']);
    var c = await choice('台座を押す？', ['押す', 'やめる']); if (c !== 0) return;
    if (x !== 11) { await msg(['台座はびくともしない。……像の口元が、笑った気がした。']); return; }
    await open('a6_dc_open', ['台座が沈み、奥の扉が開いた。', '自分の欲を見開いた目で見ている像。それだけが、欲に飲まれていなかった。']);
  };
  hidden6({ key: 'dc', ch: 16, host: 'demon_castle_2', dead: [17, 7], wall: [18, 7], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a6_dc_statues', name: '魔王城・像の回廊', fallback: 'floor_stone', back: [dc.cx, 11], arrive: [dc.cx, 10], openFlag: 'a6_dc_open', gimmick: 'oddone',
    hint: ['壁の燭台の一つが、ほかと逆さに付いている。', '燭台を戻すと、壁の向こうで何かがずれる音がした。'], ask: '壁の隙間から、奥へ進む？',
    def: { rows: dc.rows(), chests: [{ id: 'a6dc_1', x: 7, y: 1, item: 'phoenix_ash', qty: 2 }, { id: 'a6dc_2', x: 11, y: 1, item: 'legend_bento', qty: 2 }],
      events: [scr(4, 6, 'pillar', function () { return A6.dcStatue(4); }), scr(7, 6, 'pillar', function () { return A6.dcStatue(7); }), scr(11, 6, 'pillar', function () { return A6.dcStatue(11); }), scr(14, 6, 'pillar', function () { return A6.dcStatue(14); }),
        look(9, 9, 'sign', ['床の銘板。「欲望の間の像は四つ。三つは欲に目を閉じ、一つだけが違う」', '「違う像の台座だけが、奥への道を開く」']),
        gateEv(9, 3, 'a6_dc_open', ['重い扉。'], ['扉が開いた。']),
        look(9, 1, 'pillar', ['古い王の言葉。「欲を消せと言う者は、うそつきだ。欲を見よ、と言う者だけを信じよ」'])] } });

  /* ========== ⑳ 蜃気楼神殿 2階：正直者と嘘つきの幻（一つだけ質問して、扉を選ぶ） ========== */
  var mt = base(18, 12, 'C', ':'); mt.set(9, 3, 'C');
  function mtSide() { return val('a6_mt_side', 0); }   // 0＝左の扉が本物、1＝右
  A6.mtGuard = async function (who) {   // who 0＝左の幻（正直者）、1＝右の幻（嘘つき）。どちらがどちらかは明かさない
    var real = mtSide() === 0 ? '左' : '右', fake = mtSide() === 0 ? '右' : '左';
    var q = await choice((who === 0 ? '左' : '右') + 'の幻「……問いは一つだけ聞こう」', ['あなたは正直者？', '本物の扉はどっち？', 'もう一人に「本物の扉はどっち？」と聞いたら、どっちを指す？', 'やめる']);
    if (q < 0 || q === 3) return;
    var ans = q === 0 ? '「そうだ」' : q === 1 ? '「' + (who === 0 ? real : fake) + 'の扉だ」' : '「' + fake + 'の扉を指すだろう」';
    await msg([(who === 0 ? '左' : '右') + 'の幻' + ans, '（二人の幻のうち、一人はいつも本当のことを、一人はいつもうそを言う）']);
  };
  A6.mtDoor = async function (side) {
    if (F().a6_mt_open) { if (!F()['a6_mt_door' + side]) await msg(['幻の扉。もう一つの扉が開いている。']); return; }
    var c = await choice((side === 0 ? '左' : '右') + 'の扉。', ['くぐる', 'やめる']); if (c !== 0) return;
    if (side !== mtSide()) { F().a6_mt_side = Math.random() < 0.5 ? 0 : 1; W().busy = true; await msg(['扉をくぐると、景色がゆらいだ……', '気がつくと、入口の前に立っていた。幻の扉だったらしい。（二つの扉の本物が、入れ替わったかもしれない）']); W().busy = false; W().enterMap('a6_mt_mirage', 9, 10, 'up'); return; }
    F()['a6_mt_door' + side] = true; await open('a6_mt_open', ['扉は本物だった。くぐった先に、奥の部屋が続いている。']);
  };
  hidden6({ key: 'mt', ch: 9, host: 'mirage_temple_2', dead: [16, 12], wall: [17, 12], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a6_mt_mirage', name: '蜃気楼神殿・二つの幻の間', fallback: 'floor_stone', back: [mt.cx, 11], arrive: [mt.cx, 10], openFlag: 'a6_mt_open', gimmick: 'liar',
    hint: ['壁がかげろうのように揺れている。', '手を伸ばすと、指先が壁の中へ沈んだ。'], ask: '揺れる壁の中へ進む？',
    def: { rows: mt.rows(), chests: [{ id: 'a6mt_1', x: 7, y: 1, item: 'desert_star_hat', qty: 1 }, { id: 'a6mt_2', x: 11, y: 1, item: 'spice_soup', qty: 3 }],
      events: [scr(6, 6, 'crystal', function () { return A6.mtGuard(0); }), scr(12, 6, 'crystal', function () { return A6.mtGuard(1); }),
        scr(7, 3, 'door_locked', function () { return A6.mtDoor(0); }, { doneFlag: 'a6_mt_door0', doneTile: 'door', tileFlag: 'a6_mt_door0' }), scr(11, 3, 'door_locked', function () { return A6.mtDoor(1); }, { doneFlag: 'a6_mt_door1', doneTile: 'door', tileFlag: 'a6_mt_door1' }),
        look(9, 8, 'sign', ['碑文。「二人の幻のうち、一人は真を、一人は偽を語る。問いは一つ。くぐれる扉も一つ」']),
        look(9, 1, 'pillar', ['蜃気楼の主の言葉。「誰がうそをついているか分からなくても、うそのしくみが分かれば、真に届く」'])] } });

  /* ========== ㉑ 火口の祭壇：鍛冶の火加減（熱が八か九のときに打つ。十を超えると溶ける） ========== */
  var ca = base(18, 12, 'G', '8'); ca.pts([[2, 5], [15, 5], [15, 10]], 'l');
  A6.caBellows = async function () {
    if (F().a6_ca_open) { await msg(['ふいご。火はもう落としてある。']); return; }
    var h = val('a6_ca_heat', 0) + (Math.random() < 0.5 ? 2 : 3); F().a6_ca_heat = h;
    if (h > 9) { F().a6_ca_heat = 0; await msg(['ふいごを踏んだ。炉の熱：' + h + '。', '……熱すぎた！ 鉄が溶けて流れてしまった。（熱は 0 に戻った。炉の脇の鉄の塊で、やり直せる）']); return; }
    await msg(['ふいごを踏んだ。炉の熱：' + h + '。']);
  };
  A6.caAnvil = async function () {
    if (F().a6_ca_open) { await msg(['金床。']); return; }
    var h = val('a6_ca_heat', 0);
    if (h >= 8 && h <= 9) { F().a6_ca_heat = 0; await open('a6_ca_open', ['カーン！ カーン！', '熱の乗った鉄が、鍵の形に打ち上がった。鍵を差しこむと、奥の扉が開いた。']); return; }
    await msg(['金床で叩いた。……炉の熱：' + h + '。まだ硬くて、形にならない。', '（熱が 8 か 9 のときに打つ）']);
  };
  hidden6({ key: 'ca', ch: 13, host: 'crater_altar', dead: [7, 2], wall: [7, 1], wallTile: 'cave_wall', floorTile: 'ash', id: 'a6_ca_forge', name: '火口の祭壇・古い鍛冶場', fallback: 'ash', back: [ca.cx, 11], arrive: [ca.cx, 10], openFlag: 'a6_ca_open', gimmick: 'forge',
    hint: ['岩壁から、金槌の音が聞こえた気がした。', '岩に、イグナスの鍛冶の紋。押すと、岩がずれた。'], ask: '奥へ進む？',
    def: { rows: ca.rows(), chests: [{ id: 'a6ca_1', x: 7, y: 1, item: 'deluxe_steak', qty: 3 }, { id: 'a6ca_2', x: 11, y: 1, gold: 5000 }],
      events: [scr(6, 7, 'barrel', A6.caBellows), scr(11, 7, 'counter', A6.caAnvil),
        look(4, 9, 'sign', ['鍛冶の心得。「鉄は、熱が八か九のときに打て。七ではまだ硬い。十を超えれば溶けて流れる」', '「ふいごは、踏むたびに二か三、熱を上げる。どちらになるかは、踏んでみるまで分からん」']),
        gateEv(9, 3, 'a6_ca_open', ['鍵のない扉。鍵穴の形だけがある。', '（金床で、鍵を打ち上げる）'], ['扉が開いた。']),
        look(9, 1, 'counter', ['鍛冶の親方の言葉。「あと一回、と踏みこんだ職人の鉄は、たいてい流れた」'])] } });

  /* ========== ㉒ 竜脈の最深部：熱の波に合わせて渡る（噴き出し口は歩くたびに順に熱くなる） ========== */
  var dd = base(18, 12, 'G', 'g'); dd.rect(1, 5, 8, 5, 'G').rect(10, 5, 7, 5, 'G');
  function ddHot(y) { return (val('a6_dd_t', 0) + y) % 3 === 0; }
  A6.ddHot = ddHot;
  function ddStep(m, p, warping) {
    if (warping) return false; var d = D();
    if (p.y === 4 && !d.flags.a6_dd_open) { d.flags.a6_dd_open = true; refresh(); }
    d.flags.a6_dd_t = (val('a6_dd_t', 0) + 1) % 3; refresh();
    if (p.x === 9 && p.y >= 5 && p.y <= 9 && ddHot(p.y)) {
      root.State.partyActors().forEach(function (a) { if (!a.dead) a.hp = Math.max(1, a.hp - Math.ceil(root.Actors.stats(a).maxHp * 0.1)); });
      W().busy = true; msg(['足もとから熱が噴き出した！（全員 HP −10%）', '……熱に押し戻され、入口の前まで下がった。']).then(function () { W().busy = false; W().updateHud && W().updateHud(); W().enterMap('a6_dd_vents', 9, 10, 'up'); }); return true;
    }
    return false;
  }
  var ddEv = []; for (var dy = 5; dy <= 9; dy++) (function (y) { var e = { x: 9, y: y, type: 'inspect', solid: false, a6vent: true, timed: 'ash', text: ['熱の噴き出し口。歩くたびに、熱くなる口が順に移っていく。'] }; Object.defineProperty(e, 'tile', { enumerable: true, get: function () { return (root.State && root.State.data && ddHot(y)) ? 'lava' : 'ash'; } }); ddEv.push(e); })(dy);   // 熱い口は溶岩（通れない）、冷めた口は灰。timed＝歩くたびに通れる／通れないが変わるマス（地図の到達チェックでは、通れるときの絵 'ash' として扱う）
  hidden6({ key: 'dd', ch: 13, host: 'dragon_vein_deep_1', dead: [9, 2], wall: [9, 3], wallTile: 'cave_wall', floorTile: 'cave_floor', id: 'a6_dd_vents', name: '竜脈の最深部・熱の通り道', fallback: 'cave_floor', back: [dd.cx, 11], arrive: [dd.cx, 10], openFlag: 'a6_dd_open', gimmick: 'rhythm',
    hint: ['岩の割れ目から、規則正しく熱い風が吹き出している。', '……三拍子。割れ目の奥に、細い通り道が見える。'], ask: '割れ目に入る？',
    def: { rows: dd.rows(), onStep: ddStep, chests: [{ id: 'a6dd_1', x: 7, y: 1, item: 'elixir', qty: 2 }, { id: 'a6dd_2', x: 11, y: 1, item: 'mystic_water', qty: 1 }],
      events: ddEv.concat([look(5, 10, 'sign', ['竜脈の番人の碑。「熱は三拍子で上ってくる。熱の波と同じ速さで歩けば、焼かれずに渡れる」', '「足を止めたいときは、手前の広い所で、熱が回るのを待て」']),
        gateEv(9, 3, 'a6_dd_open', ['岩戸。通り道を渡りきれば開く。'], ['岩戸が開いた。'], 'cave_wall', 'cave_floor'),
        { x: 15, y: 4, type: 'hole', to: 'a6_dd_vents', tx: 9, ty: 10, text: ['足もとの岩が抜け、下の通路へ滑り落ちた。'] },
        look(9, 1, 'crystal', ['竜の鱗の欠片。「大きな流れには、拍がある。拍を知る者は、流れの中を歩ける」'])]) } });

  /* ========== ㉓ 記憶庫：記憶の再現（見せられた光の順に、色の結晶に触れる） ========== */
  var mv = base(18, 12, 'C', ':');
  var MV_COL = { R: '赤', B: '青', G: '緑' };
  A6.mvShow = async function () {
    if (F().a6_mv_open) { await msg(['記憶の結晶。もう光らない。']); return; }
    var s = ''; for (var i = 0; i < 4; i++) s += 'RBG'[Math.floor(Math.random() * 3)];
    F().a6_mv_seq = s; F().a6_mv_i = 0; await msg(['記憶の結晶に触れると、光が流れた。', s.split('').map(function (c) { return MV_COL[c]; }).join('、') + '。', '（同じ順に、色の結晶に触れる）']);
  };
  A6.mvTouch = async function (c) {
    if (F().a6_mv_open) { await msg([MV_COL[c] + 'の結晶。']); return; }
    var s = F().a6_mv_seq, i = F().a6_mv_i || 0; if (!s) { await msg([MV_COL[c] + 'の結晶。……まず、中央の記憶の結晶に触れてみよう。']); return; }
    if (s[i] !== c) { F().a6_mv_seq = ''; F().a6_mv_i = 0; await msg([MV_COL[c] + 'の結晶に触れた。……光がすべて消えた。', '（順番が違った。中央の結晶で、もう一度記憶を見よう）']); return; }
    i++; F().a6_mv_i = i;
    if (i >= 4) { await open('a6_mv_open', [MV_COL[c] + 'の結晶が光った。（4/4）', '四つの光がそろうと、奥の扉が開いた。']); return; }
    await msg([MV_COL[c] + 'の結晶が光った。（' + i + '/4）']);
  };
  hidden6({ key: 'mv', ch: 10, host: 'memory_vault', dead: [3, 7], wall: [2, 7], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a6_mv_echo', name: '記憶庫・残響の間', fallback: 'floor_stone', back: [mv.cx, 11], arrive: [mv.cx, 10], openFlag: 'a6_mv_open', gimmick: 'memory',
    hint: ['壁の奥から、かすかな声。誰かの記憶の残響らしい。', '壁に触れると、石が淡く光って薄れた。'], ask: '奥へ進む？',
    def: { rows: mv.rows(), chests: [{ id: 'a6mv_1', x: 7, y: 1, item: 'seachart_helm', qty: 1 }, { id: 'a6mv_2', x: 11, y: 1, item: 'hot_milk', qty: 3 }],
      events: [scr(9, 6, 'crystal', A6.mvShow), scr(5, 8, 'crystal', function () { return A6.mvTouch('R'); }), scr(9, 8, 'crystal', function () { return A6.mvTouch('B'); }), scr(13, 8, 'crystal', function () { return A6.mvTouch('G'); }),
        look(3, 10, 'sign', ['記憶庫の番人の札。「記憶は、思い出すたびに少し変わる。だから、すぐに、同じ順で」', '（左の結晶は赤、中央の下は青、右は緑）']),
        gateEv(9, 3, 'a6_mv_open', ['残響の扉。', '（中央の結晶が見せる光の順に、色の結晶に触れる）'], ['扉が開いた。']),
        look(9, 1, 'crystal', ['誰かの記憶の欠片。「上限を決めたあの日の自分を、まだ覚えている」'])] } });

  /* ========== ㉔ 凍結時計塔：薄氷の床（二十枚を一度ずつ踏んで渡る。同じ所を踏むと割れる） ========== */
  var ft = base(18, 12, 'C', ':'); ft.rect(1, 5, 16, 5, 'C').rect(7, 5, 5, 4, 'n').set(7, 9, ':');
  function ftCells() { var a = []; for (var y = 5; y <= 8; y++) for (var x = 7; x <= 11; x++) a.push([x, y]); return a; }
  function ftIdx(x, y) { return (y - 5) * 5 + (x - 7); }
  function ftVisited() { return val('a6_ft_v', ''); }
  function ftReset() { var f = F(); f.a6_ft_v = ''; for (var i = 0; i < 20; i++) delete f['a6_ft_c' + i]; }
  function ftStep(m, p, warping) {
    if (warping) return false; var d = D(); if (d.flags.a6_ft_open) return false;
    var inZone = p.x >= 7 && p.x <= 11 && p.y >= 5 && p.y <= 8;
    if (p.y === 4) {
      if (ftVisited().length === 20) { d.flags.a6_ft_open = true; refresh(); if (root.Audio) root.Audio.sfx('door'); W().busy = true; msg(['二十枚の薄氷を、一度ずつ渡りきった。', '氷の床が厚く凍りつき、奥の扉の封が解けた。']).then(function () { W().busy = false; }); return true; }
      ftReset(); W().busy = true; msg(['踏んでいない氷が残っている。……扉の封は解けない。', '足もとの氷が崩れ、下の通路へ滑り落ちた。']).then(function () { W().busy = false; W().enterMap('a6_ft_ice', 9, 10, 'up'); }); return true;
    }
    if (!inZone) { if (ftVisited().length) { ftReset(); refresh(); } return false; }
    var k = String.fromCharCode(65 + ftIdx(p.x, p.y));
    if (ftVisited().indexOf(k) >= 0) { ftReset(); W().busy = true; msg(['ピシッ……！ 一度踏んだ氷が割れた！', '冷たい水に落ち、入口の前まで這い上がった。氷の床は元に戻った。']).then(function () { W().busy = false; W().enterMap('a6_ft_ice', 9, 10, 'up'); }); return true; }
    d.flags.a6_ft_v = ftVisited() + k; d.flags['a6_ft_c' + ftIdx(p.x, p.y)] = true; refresh(); return false;
  }
  var ftEv = ftCells().map(function (c) { return { x: c[0], y: c[1], type: 'inspect', solid: false, tile: 'snow', doneTile: 'puddle', tileFlag: 'a6_ft_c' + ftIdx(c[0], c[1]), text: ['薄い氷の床。'] }; });
  hidden6({ key: 'ft', ch: 10, host: 'frozen_tower_1', dead: [11, 9], wall: [11, 10], wallTile: 'castle_wall', floorTile: 'floor_stone', id: 'a6_ft_ice', name: '凍結時計塔・薄氷の間', fallback: 'floor_stone', back: [ft.cx, 11], arrive: [ft.cx, 10], openFlag: 'a6_ft_open', gimmick: 'onestroke',
    hint: ['床すれすれの壁に、霜の降りた小さな扉。', '扉の表に「薄氷の間。踏み残しも、踏み直しもならぬ」'], ask: '霜の扉から、奥へ進む？',
    def: { rows: ft.rows(), onStep: ftStep, chests: [{ id: 'a6ft_1', x: 7, y: 1, item: 'elixir', qty: 2 }, { id: 'a6ft_2', x: 11, y: 1, gold: 8000 }],
      events: ftEv.concat([look(4, 10, 'sign', ['霜のついた札。「薄氷は二十枚。一枚に一度だけ足を置け。一度踏んだ氷は、二度目に割れる」', '「左下から入り、すべての氷を踏んでから、上の通路へ出よ」']),
        gateEv(9, 3, 'a6_ft_open', ['凍りついた扉。', '（薄氷の床を、すべて一度ずつ踏んで渡る）'], ['扉が開いた。']),
        look(9, 1, 'pillar', ['時計守の言葉。「同じ所を二度踏むのは、たいてい、急いだときだ」'])]) } });

  /* ========== ㉕ 沈没船の礁：船長の好物を供える ========== */
  var sr = base(18, 12, 'W', '_'); sr.pts([[2, 5], [15, 5], [2, 9]], 'q').pts([[15, 9]], 'z');
  var SR_WANT = 'ramen';
  A6.srAltar = async function () {
    var d = D(); if (d.flags.a6_sr_open) { await msg(['船長の墓標。供えたラーメンの器が、きれいに空になっている。']); return; }
    var inv = Object.keys(d.inventory || {}).filter(function (id) { return d.inventory[id] > 0 && root.ITEMS[id] && root.ITEMS[id].cat === 'consumable'; });
    if (!inv.length) { await msg(['船長の墓標。「供え物を」と刻まれている。', '……いまは、供えられる物を持っていない。']); return; }
    var c = await choice('船長の墓標に、何を供える？', inv.map(function (id) { return root.ITEMS[id].name; }).concat(['やめる'])); if (c < 0 || c >= inv.length) return;
    if (inv[c] !== SR_WANT) { await msg([root.ITEMS[inv[c]].name + 'を供えようとすると、波が寄せて押し返された。', '（船長の好物ではないらしい。航海日誌を読んでみよう）']); return; }
    root.State.addItem(SR_WANT, -1);
    await open('a6_sr_open', ['ラーメンを供えた。……湯気の向こうで、誰かが笑った気がした。', '墓標の後ろの船倉の扉が、ぎいと開いた。']);
  };
  hidden6({ key: 'sr', ch: 9, host: 'sunken_reef_1', dead: [3, 5], wall: [4, 5], wallTile: 'wall_wood', floorTile: 'floor_wood', id: 'a6_sr_hold', name: '沈没船の礁・船長室の奥', fallback: 'floor_wood', back: [sr.cx, 11], arrive: [sr.cx, 10], openFlag: 'a6_sr_open', gimmick: 'offering',
    hint: ['船の壁板が、内側から打ちつけてある。', '板の隙間から、湯気のような白い霧がもれている。'], ask: '板を外して、奥へ進む？',
    def: { rows: sr.rows(), chests: [{ id: 'a6sr_1', x: 7, y: 1, item: 'seafood_hotpot', qty: 3 }, { id: 'a6sr_2', x: 11, y: 1, item: 'phoenix_feather', qty: 3 }],
      events: [scr(9, 6, 'pillar', A6.srAltar), look(4, 8, 'bookshelf', ['航海日誌。「港に着くと、船長はまずラーメンをすすった。どんな嵐の夜のあとでも」', '「『うまいものを食えば、次の航海の怖さを忘れる。忘れたら、また出られる』と」']),
        gateEv(9, 3, 'a6_sr_open', ['船倉の扉。', '（船長の墓標に、供え物を）'], ['扉が開いた。'], 'wall_wood', 'floor_wood'),
        look(9, 1, 'barrel', ['船長の私物の樽。「嵐で失った積み荷は、追わない。追えば、船ごと沈む」'])] } });

  /* ========== ㉖ 旧都市 深層：探知機の反応（近いほど強く鳴る） ========== */
  var od = base(18, 12, '#', ':');
  var OD_P = [[1, 5], [1, 8], [16, 5], [16, 8], [4, 4], [13, 4], [4, 10], [13, 10]]; var OD_OK = 5;
  A6.odPanel = async function (i) {
    if (F().a6_od_open) { await msg(['隔壁の継ぎ目。もう開いている。']); return; }
    if (i === OD_OK) { await open('a6_od_open', ['探知機「ピピピピピ！」', '壁の継ぎ目に指をかけると、隠し隔壁がずれて、奥の扉の錠が外れた。']); return; }
    var t = OD_P[OD_OK], p = OD_P[i]; var dist = Math.abs(t[0] - p[0]) + Math.abs(t[1] - p[1]);
    await msg(['壁を探知機でなぞった。', dist <= 4 ? '探知機「ピピッ、ピピッ」（反応：強）' : dist <= 9 ? '探知機「ピッ……ピッ……」（反応：中）' : '探知機「……ピ…………」（反応：弱）']);
  };
  hidden6({ key: 'od', ch: 11, host: 'old_city_deep_1', dead: [3, 6], wall: [2, 6], wallTile: 'wall', floorTile: 'floor_stone', id: 'a6_od_scan', name: '旧都市 深層・探知室', fallback: 'floor_stone', back: [od.cx, 11], arrive: [od.cx, 10], openFlag: 'a6_od_open', gimmick: 'hotcold',
    hint: ['壁に、手のひらの形のくぼみ。', '手を当てると、壁がかすかに震えて開いた。'], ask: '奥へ進む？',
    def: { rows: od.rows(), chests: [{ id: 'a6od_1', x: 7, y: 1, item: 'phoenix_ash', qty: 1 }, { id: 'a6od_2', x: 11, y: 1, item: 'elixir', qty: 1 }],
      events: OD_P.map(function (q, i) { return scr(q[0], q[1], 'counter', function () { return A6.odPanel(i); }); }).concat([
        look(9, 7, 'counter', ['探知機の台。「八つの壁の端末のどれか一つの裏に、隠し隔壁がある」', '「端末を調べると、隠し隔壁までの近さで、探知機の鳴り方が変わる」']),
        gateEv(9, 3, 'a6_od_open', ['錠のかかった扉。', '（隠し隔壁を見つける）'], ['扉が開いた。']),
        look(9, 1, 'counter', ['旧都市の技師の記録。「近いか遠いかが分かれば、答えが一つでなくても、たどり着ける」'])]) } });

  /* ========== ㉗ 海賊カモメの巣：宝の地図（錨の杭から、北へ四歩・東へ五歩） ========== */
  var pn = base(18, 12, 'G', 's'); pn.pts([[2, 5], [16, 9]], 'q').pts([[15, 5]], 'z').pts([[13, 10], [14, 10]], 'u');
  A6.pnDig = async function () {
    var d = D(); if (d.flags.a6_pn_open) { await msg(['掘り返した穴。']); return; }
    var c = await choice('砂を掘る？', ['掘る', 'やめる']); if (c !== 0) return;
    await open('a6_pn_open', ['砂の下から、鉄の取っ手！', '引き上げると、床の下で鎖が鳴り、奥の扉が開いた。']);
  };
  hidden6({ key: 'pn', ch: 5, host: 'pirate_nest', dead: [6, 4], wall: [6, 3], wallTile: 'slag', floorTile: 'sand', id: 'a6_pn_cave', name: '海賊カモメの巣・岩の下の洞', fallback: 'sand', back: [pn.cx, 11], arrive: [pn.cx, 10], openFlag: 'a6_pn_open', gimmick: 'treasuremap',
    hint: ['岩の根元に、人が這って通れるほどの穴。', '穴のふちの砂に、カモメの足あとと、人の足あと。'], ask: '穴に入る？',
    def: { rows: pn.rows(), chests: [{ id: 'a6pn_1', x: 7, y: 1, gold: 3000 }, { id: 'a6pn_2', x: 11, y: 1, item: 'seabreeze_charm', qty: 2 }],
      events: [look(3, 9, 'pillar', ['錨をつなぐ太い杭。']), { x: 8, y: 5, type: 'script', solid: false, run: async function () { await A6.pnDig(); } },
        look(14, 8, 'barrel', ['樽に貼られた宝の地図の切れ端。「錨の杭から、北へ四歩、東へ五歩。そこを掘れ」']),
        gateEv(9, 3, 'a6_pn_open', ['鎖で閉じた扉。床の下のどこかと、鎖でつながっているらしい。'], ['扉が開いた。'], 'cave_wall', 'sand'),
        look(9, 1, 'barrel', ['海賊カモメの頭の手紙。「宝を埋めた場所は、地図にしか書くな。頭の中だけの宝は、酒を飲むと消える」'])] } });

  /* ========== ㉘ 灰の岬：渡し守に渡し賃を払う ========== */
  var ap = base(18, 12, 'G', 'g'); ap.rect(1, 6, 16, 2, '~').set(9, 6, 'g').set(9, 7, 'g');
  var AP_FEE = 500;
  A6.apFerry = async function () {
    var d = D(); if (d.flags.a6_ap_open) { await msg(['渡し守「また乗るかい。……もう渡し賃はいらんよ」']); return; }
    await msg(['小舟の渡し守「向こう岸の洞まで渡してやろう。渡し賃は ' + AP_FEE + 'G。前払いだ」', '「向こうに何があるかは、渡った者にしか分からん」']);
    var c = await choice('渡し賃 ' + AP_FEE + 'G を払う？（所持金 ' + d.gold + 'G）', ['払う', 'やめる']); if (c !== 0) return;
    if (d.gold < AP_FEE) { await msg(['渡し守「足りんな。……金ができたら、また来な」']); return; }
    d.gold -= AP_FEE; W().updateHud && W().updateHud();
    await open('a6_ap_open', ['渡し賃を払った。（−' + AP_FEE + 'G）', '小舟が水路を渡り、向こう岸の洞の扉が開いた。']);
  };
  hidden6({ key: 'ap', ch: 5, host: 'ash_cape', dead: [8, 3], wall: [8, 2], wallTile: 'mountain', floorTile: 'sand', id: 'a6_ap_canal', name: '灰の岬・地下の水路', fallback: 'cave_floor', back: [ap.cx, 11], arrive: [ap.cx, 10], openFlag: 'a6_ap_open', gimmick: 'toll',
    hint: ['岩の裏に、下へ続く石段。', '石段の下から、櫂で水をかく音。'], ask: '石段を下りる？',
    def: { rows: ap.rows(), chests: [{ id: 'a6ap_1', x: 7, y: 1, gold: 1500 }, { id: 'a6ap_2', x: 11, y: 1, item: 'danger_bell', qty: 2 }],
      events: [scr(10, 8, 'pillar', A6.apFerry), gateEv(9, 7, 'a6_ap_open', ['水路。泳いで渡るには流れが速い。', '（渡し守に頼む）'], ['小舟が橋のように並んだ。'], 'water', 'bridge'),
        gateEv(9, 6, 'a6_ap_open', ['水路。'], ['……'], 'water', 'bridge'),
        gateEv(9, 3, 'a6_ap_open', ['洞の扉。'], ['扉が開いた。'], 'cave_wall', 'cave_floor'),
        look(9, 1, 'barrel', ['渡し守の帳面。「渡し賃をけちって泳いだ者は、だいたい戻ってこなかった」', '「払う価値があるかどうかは、払う前に考えるもんだ」'])] } });

  /* ========== ㉙ 地下実験施設：数列の扉（三つの数列の続き） ========== */
  var vu = base(18, 12, '#', ':'); vu.pts([[2, 9], [15, 9]], 'z');
  var VU_Q = { 1: ['2・4・8・16・□', ['18', '24', '32', '20'], 2], 2: ['1・1・2・3・5・8・□', ['11', '13', '12', '16'], 1], 3: ['1・4・9・16・□', ['20', '25', '24', '32'], 1] };
  A6.vuDial = async function (n) {
    var key = 'a6_vu_d' + n; if (F()[key]) { await msg(['ダイヤル。正しい数に合わせてある。']); return; }
    var q = VU_Q[n]; var c = await choice('ダイヤル' + n + '：「' + q[0] + '」', q[1]); if (c < 0) return;
    if (c !== q[2]) { await msg(['ダイヤルを ' + q[1][c] + ' に合わせた。……ブッ、と低い音。違うらしい。']); return; }
    F()[key] = true; refresh(); await msg(['ダイヤルを ' + q[1][c] + ' に合わせた。ピッ、と澄んだ音。']);
    if (F().a6_vu_d1 && F().a6_vu_d2 && F().a6_vu_d3) await open('a6_vu_open', ['三つのダイヤルがそろうと、実験室の扉が開いた。']);
  };
  hidden6({ key: 'vu', ch: 12, host: 'vol_under_1', dead: [15, 14], wall: [15, 15], wallTile: 'wall', floorTile: 'floor_stone', id: 'a6_vu_numbers', name: '地下実験施設・数の実験室', fallback: 'floor_stone', back: [vu.cx, 11], arrive: [vu.cx, 10], openFlag: 'a6_vu_open', gimmick: 'sequence',
    hint: ['床の近くの壁に、数字の書かれた小さな扉。', '扉には「数の実験室　学院関係者以外立入禁止」。'], ask: '扉を開けて、奥へ進む？',
    def: { rows: vu.rows(), chests: [{ id: 'a6vu_1', x: 7, y: 1, item: 'mana_soda', qty: 3 }, { id: 'a6vu_2', x: 11, y: 1, item: 'elixir', qty: 1 }],
      events: [scr(5, 6, 'counter', function () { return A6.vuDial(1); }, { doneTile: 'lamp', tileFlag: 'a6_vu_d1' }), scr(9, 6, 'counter', function () { return A6.vuDial(2); }, { doneTile: 'lamp', tileFlag: 'a6_vu_d2' }), scr(13, 6, 'counter', function () { return A6.vuDial(3); }, { doneTile: 'lamp', tileFlag: 'a6_vu_d3' }),
        look(4, 9, 'sign', ['実験の札。「三つの数列の、次の数にダイヤルを合わせよ」', '「数列には、それぞれ決まり（倍・前の二つの和・何かの二乗）がある」']),
        gateEv(9, 3, 'a6_vu_open', ['実験室の扉。', '（三つのダイヤルを合わせる）'], ['扉が開いた。']),
        look(9, 1, 'bookshelf', ['学院の研究ノート。「決まりを見つけると、次の数が読める。……ただし、相場の値動きは、こういう決まりどおりには並ばない」'])] } });
})(typeof window !== 'undefined' ? window : globalThis);
