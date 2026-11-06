/* =========================================================
   Data / BossLair19（v8.0）：町のない大陸の「異界の門」と「ボスの間」（3D 版の地球の世界だけ）
   ・新しいボス 19 体（js/data/bosses19.js）を、町や施設のない外の地図（w78_*：エルドラン・シルヴァーナ・ソルディア・ルベラ・グランメリアの奥地・白鯨島・ニヴェリス）の
     19 か所に置く。場所は経度・緯度。外の地図を作るとき（js/rpg/earth78.js の fillerDef）に、いちばん近い「まわりも歩ける陸」へ門（ワープの床）を置く
   ・門を調べる → ボスの名前と推奨レベル → 「入る」で、そのボスだけの「ボスの間」（小さなダンジョン）へ。入口の魔法陣で外へ戻れる
   ・ボスの間の奥にボスの姿（js/rpg/bosssymbol.js のシンボル）。調べると「戦う？」と聞く（いつでもやめられる）。負けても全滅のふつうの扱い
   ・勝つと：そのボスだけの装備・能力の最大値を上げる道具 2 つ・ゴールド。19 体すべてに勝つと「十九の契約印」。倒したボスは消える（門・ボスの間はそのまま）
   ・入れる条件：その外の地図の条件（いちばん近い地域と同じ。ニヴェリスは闇の空路と飛空艇）。ボスごとの条件は足していない
   ・2D 版（地球の世界を使わない設定）では、外の地図がないので門もない。ボスの間の地図・ボスの敵は外す（R78.finish。前の地域と同じ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.R78, BB = root.BOSS19; if (!R || !BB) return; var D = R.D;
  // ボスの間の形（21×16）。B＝ボスの立つ所（床）・@＝出入口の魔法陣（外へ）。文字は地形（js/core/tiles.js）
  function rows(st) {
    var T = { castle: { w: '#', f: ':', c: 'p', p: 'I', t: 'i' }, sand: { w: '#', f: '=', c: 'p', p: 'I', t: 'i' }, cave: { w: 'G', f: 'g', c: 'g', p: 'Y', t: 'X' }, ice: { w: 'G', f: 'g', c: 'g', p: 'X', t: 'i' },
      dark: { w: '#', f: '+', c: '+', p: 'X', t: 'i' }, forest: { w: 'F', f: '.', c: 'P', p: 'f', t: 'Z' }, machine: { w: '#', f: ':', c: '=', p: 'X', t: 'y' }, sky: { w: '#', f: ':', c: 'p', p: 'I', t: 'X' } }[st] || {};
    var G = [
      '#####################',
      '#tPPPPPPPPPPPPPPPPPt#',
      '#P:::::::::::::::::P#',
      '#P::::ccccccccc::::P#',
      '#P::::ccccccccc::::P#',
      '#P::::ccccccccc::::P#',
      '#P:::::::ccc:::::::P#',
      '#P::P::::ccc::::P::P#',
      '#P:::::::ccc:::::::P#',
      '#P::P::::ccc::::P::P#',
      '#tPPPPPP:ccc:PPPPPPt#',
      '########:ccc:########',
      '########:ccc:########',
      '########:ccc:########',
      '########::@::########',
      '#####################'
    ];
    var M = { '#': T.w, ':': T.f, c: T.c, P: T.p, t: T.t };   // 1 文字ずつ置きかえる（続けて置きかえると、置いた文字をまた置きかえてしまう）
    return G.map(function (r) { return r.split('').map(function (ch) { return M[ch] || ch; }).join(''); });
  }
  // ボスの間の名前・見た目（3D の地域と場所・戦闘の背景）・入口の石板の文
  var LAIR = {
    mochiko: { name: '餅蔵の御殿', st: 'castle', region: 'snow', place: 'castle', text: '石板「白い餅の女帝、ここに座す。黄金の杵の一撃は、山をも平らにする」' },
    anxiety: { name: '鳴りやまぬ鐘の氷洞', st: 'ice', region: 'snow', place: 'cave', text: '氷の壁に刻まれた字「ここで鐘の音を聞いた者は、まだ起きていないことを恐れはじめる」' },
    mesaki: { name: '目先の宝石宮', st: 'sand', region: 'desert', place: 'castle', text: '石板「すぐそこの輝きに手を伸ばす姫。その手の先の宝石は、近づくほど遠くなる」' },
    darkmatter: { name: '暗黒物質の落下孔', st: 'dark', region: 'dark', place: 'dark', text: '黒い岩に刻まれた字「見えない重さが、ここに落ちてきた。光も音も、のみこまれる」' },
    betrayal: { name: '裏切りの礼拝堂', st: 'castle', region: 'snow', place: 'castle', text: '石板「微笑む仮面を差し出す者を、信じすぎるな。袖の中まで見よ」' },
    desire: { name: '欲望の青銅遺跡', st: 'sand', region: 'desert', place: 'castle', text: '石板「何千年たっても、手は伸び続ける。満たされない心の形のまま」' },
    nanpin: { name: '下落の砦', st: 'castle', region: 'grania', place: 'castle', text: '石板「下がるたびに重ねた皇子。その鎧は、下ほど重い」' },
    remnant: { name: '砕けた石板の環', st: 'dark', region: 'snow', place: 'dark', text: '砕けた石板「かつて支配した意識の残り火。体はもう、どこにもない」' },
    shield: { name: '笑わぬ守りの砦', st: 'castle', region: 'snow', place: 'castle', text: '石板「笑わぬ大盾は、うかつに打ちかかる者に、同じ力を返す」' },
    gamemaster: { name: '盤上の神殿', st: 'machine', region: 'islands', place: 'magic_city', text: '床の白と黒の升目「ここでは、すべての一手が見られている。王手のあとに詰みが来る」' },
    manjaro: { name: '白磁の聖堂', st: 'sky', region: 'sky', place: 'sky', text: '石板「理想の姿だけを映す鏡。そこに映らない自分を、責めることはない」' },
    fomsy: { name: '金利の時計塔', st: 'machine', region: 'machine', place: 'machine_city', text: '真鍮の札「針が右へ振れれば重く、左へ振れれば軽く。番人は、世界の速さを決めている」' },
    cybern: { name: '電子法廷', st: 'machine', region: 'machine', place: 'machine_city', text: '光る札「正義の番人は、電子の封印で口をふさぐ。判決は、ひと太刀」' },
    ubud: { name: '追憶の森の奥', st: 'forest', region: 'islands', place: 'forest', text: '古木の幹に刻まれた字「琥珀の記憶に見とれていると、眠ってしまう」' },
    lookism: { name: '品定めの鏡殿', st: 'dark', region: 'dark', place: 'dark', text: '鏡の破片「いくつもの仮面が、あなたを品定めする。うかつに打つと、棘が返る」' },
    velo: { name: '香炉の宮殿', st: 'sand', region: 'desert', place: 'castle', text: '石板「甘い香りと鈴の音。気持ちよさに身をまかせた者は、二度と目を覚まさない」' },
    probability: { name: '出目の水晶洞', st: 'cave', region: 'desert', place: 'cave', text: '水晶の壁「出目はひとつ。けれど、腕はいくつにも分かれて来る」' },
    balance: { name: '星の天秤の台座', st: 'dark', region: 'dark', place: 'dark', text: '台座の字「白い星と黒い点。天秤が傾くと、足もとも傾く」' },
    crossroads: { name: '四辻の悪魔の祠', st: 'dark', region: 'islands', place: 'dark', text: '道しるべ「二枚の契約札。どちらを選んでも、代償は払う」' }
  };
  var LAIRS = root.EARTH78_LAIRS = [];
  var EX = { x: 10, y: 14 }, IN = { x: 10, y: 13 }, BOSS = { x: 10, y: 4 };   // 出入口の魔法陣・入ったときに立つ所・ボスの立つ所
  var nameOf = function (id) { return (root.ENEMIES[id] || {}).name || id; };
  // 推奨レベル（ボスの間・門の表示）：シミュレーションの結果（bosses19.js の rec。なければ地帯の推奨レベルの上の数から）
  function recOf(b) { if (b.rec) return b.rec; var RL = root.RecLevel; var r = RL && RL.range ? RL.range(b.z) : [b.lv, b.lv + 6]; return [r[1], r[1] + 6]; }
  var countWon = function () { var d = D(); return BB.bosses.filter(function (b) { return d.flags['b19_' + b.key]; }).length; };
  BB.bosses.forEach(function (b) {
    var lz = LAIR[b.key]; var mapId = 'lair19_' + b.key, flag = 'b19_' + b.key; var L = { id: mapId, key: b.key, boss: b.id, map: b.map, lon: b.lon, lat: b.lat, flag: flag, name: lz.name, lv: b.lv, b: b };
    L.rec = function () { return recOf(b); };
    // 門（外の地図の上。js/rpg/earth78.js の fillerDef が置く）
    L.run = async function (c) {
      var d = D(); var won = !!d.flags[flag]; var r = recOf(b);
      await c.msg(['【異界の門】' + lz.name].concat(won ? ['門の奥は静かだ。' + nameOf(b.id) + 'の気配は、もうない。'] : ['門の奥から、強大な気配がする……', '「' + nameOf(b.id) + '」（推奨レベル Lv ' + r[0] + '〜' + r[1] + '）']));
      var i = await c.choice('門の中へ入る？', ['入る', 'やめておく']); if (i !== 0) return;
      if (L.ox !== undefined) d.dungeonEntry = { map: L.map, x: L.ox, y: L.oy };
      if (root.Audio && root.Audio.sfx) { try { root.Audio.sfx('warp'); } catch (e) { /* 音がなくても続ける */ } }
      root.World.enterMap(mapId, IN.x, IN.y, 'up', { raw: true });
    };
    LAIRS.push(L);
    // ボスの間から出る所（門の前）。外の地図を作る＝門の位置が決まる。門が置けなかったときは地図のまんなかの近く
    var outPos = function () {
      var W = root.World; var m = W.getMap(L.map); var x = L.ox, y = L.oy;
      if (x === undefined) { x = Math.floor(m.w / 2); y = Math.floor(m.h / 2); var nf = W.nearestFree && W.nearestFree(m, x, y); if (nf) { x = nf.x; y = nf.y; } }
      return { x: x, y: y };
    };
    var exitRun = async function () { var q = outPos(); root.World.enterMap(L.map, q.x, q.y, 'down', { raw: true }); };
    // 脱出の羽・帰還の術（js/rpg/dungeonexit.js）：出口がワープでなく魔法陣なので、行き先（門の前）を登録する
    if (root.DungeonExit && root.DungeonExit.DEFS) root.DungeonExit.DEFS[mapId] = { get map() { return L.map; }, get x() { return outPos().x; }, get y() { return outPos().y; }, label: '異界の門（' + lz.name + '）の前' };
    R.add({ id: mapId, name: lz.name, kind: 'dungeon', bgm: 'boss_area', fallback: lz.st === 'forest' ? 'grass' : lz.st === 'cave' || lz.st === 'ice' ? 'cave_floor' : 'floor_stone', rows: rows(lz.st),
      theme3d: { region: lz.region, place: lz.place }, bgRegion: lz.region, lair19: b.key, recLevel: recOf(b),
      entries: [{ x: IN.x, y: IN.y, from: b.map }],   // ワープでなく台本（門を調べて「入る」）で着く所。確認ツール（docs/tools/v78/region78_check.js）が入口として使う
      warps: [], npcs: [], chests: [],
      events: [
        { x: EX.x, y: EX.y, type: 'script', solid: false, tile: 'warp', run: async function (c) { var i = await c.choice('魔法陣が光っている。外へ出る？', ['出る', 'やめておく']); if (i === 0) await exitRun(); } },
        { x: 12, y: 13, type: 'inspect', solid: true, tile: 'sign', text: [lz.text, '（' + nameOf(b.id) + '・推奨レベル Lv ' + recOf(b)[0] + '〜' + recOf(b)[1] + '）'] },
        { x: BOSS.x, y: BOSS.y, type: 'boss', enemies: [b.id], doneFlag: flag, optional: true,
          intro: [nameOf(b.id) + 'が、こちらを見下ろしている……'],
          after: [nameOf(b.id) + 'を倒した！'],
          onWin: async function (c) {
            var d = D(); var eq = BB.reward[b.key]; var lines = [];
            if (eq && root.ITEMS[eq]) { c.give(eq, 1); lines.push('【' + root.ITEMS[eq].name + '】を手に入れた！'); }
            if (b.grow && root.ITEMS[b.grow]) { c.give(b.grow, 2); lines.push(root.ITEMS[b.grow].name + 'を 2 つ手に入れた！'); }
            var g = b.lv * 150; c.addGold(g); lines.push(g + 'G を手に入れた！');
            var n = countWon(); lines.push('（異界の門のボス ' + n + '/' + BB.bosses.length + '）');
            await c.msg(lines);
            if (n >= BB.bosses.length && !d.flags.b19_all) { d.flags.b19_all = true; c.give(BB.allReward, 1); await c.msg(['異界の門のボス 19 体すべてに勝った！', '【' + root.ITEMS[BB.allReward].name + '】を手に入れた！']); }
            if (root.Minimap && root.Minimap.markDirty) root.Minimap.markDirty(L.map);
          } }
      ] });
  });
  // 2D 版では敵も外す（前の地域の敵と同じ。図鑑の数に入れない）
  BB.bosses.forEach(function (b) { if (R.monsters.indexOf(b.id) < 0) R.monsters.push(b.id); });
  R.bossLairs = { list: LAIRS, won: countWon };
})(typeof window !== 'undefined' ? window : globalThis);
