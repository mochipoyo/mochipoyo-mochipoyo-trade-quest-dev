/* =========================================================
   Data / Luxbell (v6.1) : 娯楽都市ラックスベル（カリオン徴収連邦の東）——カジノと確率・投資の研究室
   ・カジノ：受付・コイン交換所・スロット・ルーレット・ハイ＆ロー・景品交換所・支配人・常連客・伝説のディーラー
   ・研究棟：確率研究室（大数の法則・期待値・ギャンブラーの誤謬・マーチンゲール法）／投資戦略研究室（増し玉シミュレーター）
   ・カジノコインはゴールドから交換するだけ（ゴールドへ戻せない）。現実のお金・換金は一切ない
   ・景品の装備はすべて通常の装備として使える（カジノを使わなくても冒険は進められる強さに調整）
   ・ワールドの入口：world_kalion (96,80)。徴収都市カリオンから東への道（js/data/world-kalion.js）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add; var ITEMS = root.ITEMS;

  /* ---------- 景品の装備（ゲーム世界の伝承つき） ---------- */
  function eq(id, o) { ITEMS[id] = Object.assign({ id: id, price: 0 }, o); if (root.ITEM_LIST && root.ITEM_LIST.indexOf(id) < 0) root.ITEM_LIST.push(id); }
  eq('lucky_ring', { name: '幸運の指輪', cat: 'armor', type: 'acc', def: 2, agi: 5, fx: { evade: 0.06 }, desc: '素早さ+5。敵の単体攻撃を6%の確率でかわす。「運は呼ぶものではなく、備えた者の前を通るもの」と内側に刻まれている' });
  eq('gambler_cloak', { name: '勝負師のマント', cat: 'armor', type: 'light', def: 20, agi: 4, fx: { evade: 0.12 }, desc: '素早さ+4。敵の単体攻撃を12%の確率でかわす。ラックスベルの初代ディーラーが「勝負しない日」に羽織っていたという' });
  eq('golden_shield', { name: '黄金の盾', cat: 'armor', type: 'shield', def: 22, mdef: 8, desc: '魔法防御+8。カジノの金庫の扉を打ち直した盾。「守るべきは元手」' });
  eq('prob_sword', { name: '確率の剣', cat: 'weapon', type: 'sword', atk: 40, fx: { critUp: 0.1 }, desc: '会心の一撃の確率+10%。刀身に1/16から始まる分数が刻まれている。確率を上げても、外れる日はある' });
  eq('ev_staff', { name: '期待値の杖', cat: 'weapon', type: 'staff', atk: 12, mag: 18, mp: 20, fx: { supportBoost: 1.4 }, desc: '魔力+18・最大MP+20。補助魔法を使った次のターン、攻撃魔法が1.4倍。「一回の結果ではなく、積み重ねを見よ」' });
  eq('legend_gambler_armor', { name: '伝説の勝負師の鎧', cat: 'armor', type: 'heavy', def: 36, fx: { bigHitCut: { over: 0.25, cut: 0.3 } }, desc: '最大HPの25%を超える一撃を30%軽減。伝説のディーラーが若いころ着ていた鎧。一度の大負けで退場しないための鎧' });
  eq('fate_blade', { name: '運命を切り拓く剣', cat: 'weapon', type: 'sword', atk: 52, fx: { critUp: 0.12 }, desc: '会心の一撃の確率+12%。「運命は選べないが、賭け方は選べる」——ラックスベルの古い札に描かれた剣' });
  eq('lln_charm', { name: '大数の法則の護符', cat: 'armor', type: 'acc', def: 5, hp: 60, immune: ['confuse'], fx: { guts: 0.2 }, desc: '最大HP+60。混乱しない。倒れるダメージを20%の確率でHP1で踏みとどまる（戦闘中1回）。回数を重ねた者だけが知る、平均の重み' });
  root.LUXBELL_PRIZES = [
    { item: 'lucky_ring', cost: 300 }, { item: 'gambler_cloak', cost: 1200 }, { item: 'golden_shield', cost: 3000 }, { item: 'prob_sword', cost: 6000 },
    { item: 'ev_staff', cost: 9000 }, { item: 'legend_gambler_armor', cost: 20000 }, { item: 'fate_blade', cost: 40000 }, { item: 'lln_charm', cost: 60000 }
  ];

  /* ---------- 小さな地図ビルダー（行の文字列を組み立てる） ---------- */
  function Grid(W, H, ch) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push(ch); } return {
    set: function (x, y, c) { if (g[y] && g[y][x] !== undefined) g[y][x] = c; return this; },
    rect: function (x, y, w, h, c) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) this.set(xx, yy, c); return this; },
    border: function (c) { for (var x = 0; x < W; x++) { g[0][x] = c; g[H - 1][x] = c; } for (var y = 0; y < H; y++) { g[y][0] = c; g[y][W - 1] = c; } return this; },
    rows: function () { return g.map(function (r) { return r.join(''); }); } }; }
  root.MapGrid = root.MapGrid || Grid;

  /* ---------- 娯楽都市ラックスベル（40×30） ---------- */
  var t = Grid(40, 30, '=').border('x');
  t.rect(18, 29, 4, 1, 'r');                     // 南の出入口
  t.rect(19, 10, 2, 19, 'r'); t.rect(2, 11, 36, 2, 'r');   // 大通り
  t.rect(11, 2, 18, 8, 'B');                     // カジノ
  t.rect(3, 14, 8, 5, 'B'); t.rect(3, 21, 8, 5, 'B');      // 宿・道具屋
  t.rect(29, 14, 8, 5, 'B'); t.rect(29, 21, 8, 5, 'B');    // 食堂・研究棟
  t.set(15, 16, 'Q'); [[13, 14], [17, 14], [13, 18], [17, 18]].forEach(function (p) { t.set(p[0], p[1], 'a'); });   // 噴水広場
  t.set(25, 16, 'Q'); [[23, 14], [27, 14], [23, 18], [27, 18]].forEach(function (p) { t.set(p[0], p[1], 'a'); });
  [[8, 10], [31, 10], [17, 13], [22, 13], [17, 22], [22, 22], [17, 27], [22, 27], [2, 9], [37, 9]].forEach(function (p) { t.set(p[0], p[1], 'y'); });   // 街灯
  [[13, 24], [14, 24], [25, 24], [26, 24]].forEach(function (p) { t.set(p[0], p[1], 'A'); });   // 屋台
  [[2, 2], [5, 2], [34, 2], [37, 2], [2, 6], [37, 6], [12, 27], [27, 27]].forEach(function (p) { t.set(p[0], p[1], '6'); });
  [[9, 27], [30, 27]].forEach(function (p) { t.set(p[0], p[1], 'e'); });
  add({ id: 'luxbell', name: '娯楽都市ラックスベル', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: t.rows(),
    buildings: [
      { id: 'lx_casino', type: 'casino', name: 'グランカジノ・ラックスベル', x: 11, y: 2, w: 18, h: 8, doorX: 9, interior: 'luxbell_casino', entry: { x: 11, y: 12 } },
      { id: 'lx_inn', type: 'inn', name: '金の鈴亭', x: 3, y: 14, w: 8, h: 5, doorX: 3, interior: 'luxbell_inn', entry: { x: 5, y: 7 } },
      { id: 'lx_item', type: 'item', name: 'ラックスベル雑貨店', x: 3, y: 21, w: 8, h: 5, doorX: 3, interior: 'luxbell_item', entry: { x: 5, y: 7 } },
      { id: 'lx_dining', type: 'tavern', name: 'ラックスベル食堂', x: 29, y: 14, w: 8, h: 5, doorX: 3, interior: 'luxbell_dining', entry: { x: 5, y: 7 } },
      { id: 'lx_labs', type: 'guild', name: 'カジノ研究棟', x: 29, y: 21, w: 8, h: 5, doorX: 3, interior: 'luxbell_labs', entry: { x: 9, y: 8 } }
    ],
    warps: [18, 19, 20, 21].map(function (x) { return { x: x, y: 29, to: 'world_kalion', tx: 96, ty: 81, name: '町の外へ' }; }),
    chests: [{ id: 'lx1', x: 36, y: 27, item: 'curry_rice', qty: 2 }],
    events: [
      { x: 21, y: 26, type: 'inspect', solid: false, text: ['案内板：「娯楽都市ラックスベル——北：グランカジノ　東：食堂・カジノ研究棟　西：宿・雑貨店」', '小さな字で：「カジノコインはゴールドに戻せません。遊ぶ前に、使ってよい額を決めましょう。」'] }
    ],
    npcs: [
      { id: 'lx_guide', x: 22, y: 28, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) {
        if (!c.flag('luxbell_visited')) c.setFlag('luxbell_visited', true);
        await c.say('町の案内人', ['娯楽都市ラックスベルへようこそ。徴収都市の税から逃げてきた職人たちが、遊びと学びの町を作ったんだ。', 'カジノのコインはゴールドから交換するだけ。コインをゴールドに戻すことはできない。景品と交換するか、遊ぶかだ。', '東の研究棟では、確率や増し玉の仕組みを無料で学べる。……正直、カジノよりそっちを勧めるね。']); } },
      { id: 'lx_exgambler', x: 25, y: 20, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('元ギャンブラーの男', ['負けを取り返そうとして、賭け金を倍、倍……。気づいたら上限に届いて、一晩で全部なくした。', '取り返そうとした瞬間から、遊びじゃなくなるんだ。今は研究棟で掃除の仕事をしている。']); } },
      { id: 'lx_child', x: 16, y: 20, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('町の子ども', ['カジノは大人の遊び場なんだって。でも研究棟のおじさんは、サイコロの実験を見せてくれるよ！', '100回ふると、1の目はだいたい17回くらい。でも毎回ちがうんだ。']); } },
      { id: 'lx_merchant', x: 10, y: 12, sprite: 'merchant', dir: 'down', wander: 1, talk: async function (c) { await c.say('旅の商人', ['カリオンの財務局が改革されてから、ここにも客が戻ってきた。', '……景品の装備？ 強いさ。だが、なくても旅はできる。コインに使う前に、宿代と薬代は残しておけよ。']); } }
    ] });

  /* ---------- グランカジノ（24×14） ---------- */
  var cg = Grid(24, 14, ':').border('#');
  cg.set(1, 1, 'I').set(22, 1, 'I').set(1, 10, 'I').set(22, 10, 'I');
  cg.rect(11, 1, 2, 12, 'p');                    // 中央の赤じゅうたん
  cg.rect(2, 2, 4, 1, 'T'); cg.rect(18, 2, 4, 1, 'T');     // 景品交換所・コイン交換所のカウンター
  cg.rect(2, 5, 4, 1, '!'); cg.rect(2, 8, 4, 1, '!');      // スロットマシン（js/core/tiles.js の slot_machine）
  cg.rect(18, 5, 4, 1, 'T'); cg.rect(18, 8, 4, 1, 'T');    // カード台・ルーレット台
  cg.set(11, 13, 'D');
  var SLOT_EVENTS = []; [5, 8].forEach(function (y) { for (var x = 2; x <= 5; x++) SLOT_EVENTS.push({ x: x, y: y, type: 'script', solid: true, run: async function () { await root.CasinoUI.slot(); } }); });
  function casinoIntro(c) { if (!c.flag('casino_intro')) { c.setFlag('casino_intro', true); return c.say('カジノ受付', ['グランカジノへようこそ。はじめての方に三つだけ。', '一、コインはゴールドから交換（1枚 ' + root.Casino.COIN_PRICE + 'G）。コインはゴールドに戻せません。', '二、どのゲームも、当たる確率と払い戻しを台に掲示しています。結果は毎回の抽選だけで決まり、裏で調整することはありません。', '三、どのゲームも期待値はマイナスです。長く遊ぶほど、平均すると少しずつ減ります。……楽しむ額を決めて遊んでください。']); } return null; }
  add({ id: 'luxbell_casino', name: 'グランカジノ・ラックスベル', kind: 'interior', bgm: 'tavern', rows: cg.rows(),
    warps: [{ x: 11, y: 13, to: 'luxbell', tx: 20, ty: 10 }],
    events: SLOT_EVENTS.concat([
      { x: 12, y: 13, type: 'inspect', solid: true, text: ['掲示：各ゲームの還元率（理論値）', 'スロット「ドリームリール」 約94.7%　／　ルーレット（0〜36） 約97.3%　／　ハイ＆ロー 約92〜95%（予想の向きと表の札で変わる）', '「還元率」は、賭けたコインのうち平均して戻ってくる割合です。100%未満なので、続けるほど平均は減っていきます。'] }
    ]),
    npcs: [
      { id: 'lx_reception', x: 14, y: 12, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) {
        var first = casinoIntro(c); if (first) { await first; return; }
        var st = root.Casino.stats(); var tot = ['slot', 'roulette', 'card'].reduce(function (a, k) { var g = st[k]; if (g) { a.bet += g.bet; a.paid += g.paid; a.plays += g.plays; } return a; }, { bet: 0, paid: 0, plays: 0 });
        await c.say('カジノ受付', ['コインの残りは ' + root.Casino.coins() + '枚です。', tot.plays ? 'これまでに ' + tot.plays + '回遊び、' + tot.bet + '枚賭けて ' + tot.paid + '枚戻りました（差し引き ' + (tot.paid - tot.bet >= 0 ? '+' : '') + (tot.paid - tot.bet) + '枚）。' : 'まだ一度も遊んでいませんね。', '研究棟の確率研究室では、ゲームの仕組みを無料で試せます。学習の記念にコインがもらえることも。']); } },
      { id: 'lx_exchange', x: 20, y: 1, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { var f = casinoIntro(c); if (f) await f; await c.say('コイン交換所', ['コインの交換ですね。1枚 ' + root.Casino.COIN_PRICE + 'G です。コインからゴールドへの交換はしていません。']); await root.CasinoUI.exchange(); } },
      { id: 'lx_prize', x: 3, y: 1, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('景品交換所', ['コインを景品の装備と交換できます。どれも普通の武器・防具として、冒険でそのまま使えますよ。']); await root.CasinoUI.prizes(root.LUXBELL_PRIZES); } },
      { id: 'lx_card_dealer', x: 19, y: 4, sprite: 'bartender', dir: 'down', wander: 0, talk: async function (c) { await c.say('カードのディーラー', ['ハイ＆ローへようこそ。表の札より次の札が上か下か、それだけです。', '払い戻しの倍率は、当たる確率から計算して決めています。どちらを選んでも、期待値はほぼ同じですよ。']); await root.CasinoUI.card(); } },
      { id: 'lx_roulette_dealer', x: 19, y: 7, sprite: 'bartender', dir: 'down', wander: 0, talk: async function (c) { await c.say('ルーレットのディーラー', ['ルーレットは0から36の37区画。赤と黒は18ずつ、緑の0が1つ。', '0があるぶん、赤に賭けても当たる確率は半分より少し低い。それが店の取り分です。']); await root.CasinoUI.roulette(); } },
      { id: 'lx_manager', x: 11, y: 1, sprite: 'king', dir: 'down', wander: 0, talk: async function (c) {
        if (c.flag('kalion_reformed')) await c.say('カジノ支配人ベルモント', ['カリオンの改革で、うちの帳簿も監査が入った。……結構なことだ。数字を隠さない店は、長く続く。', 'カジノは「期待値がマイナスの遊び」を、楽しさと引き換えに売っている。それを隠さないのがこの店の誇りだ。']);
        else await c.say('カジノ支配人ベルモント', ['支配人のベルモントだ。この町は、徴収都市の重税から逃げてきた者たちが作った。', '税は奪うが、カジノは「確率どおりに」取る。違いは、ルールが見えていることだ。', '……だから、確率の表は全部掲示している。見ない客のほうが多いがね。']);
        if (root.Ooparts && root.Ooparts.count() >= 5 && !c.flag('lx_manager_oopart')) { c.setFlag('lx_manager_oopart', true); await c.say('カジノ支配人ベルモント', ['ほう、古い遺物を集めているのか。研究棟の裏の壺に、町ができる前の「富くじの版木」が眠っているという噂がある。']); }
      } },
      { id: 'lx_regular', x: 8, y: 6, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) {
        var L = root.Casino.state().lab || {}; var learned = L.rewards && L.rewards.fallacy;
        if (learned) await c.say('カジノの常連客', ['あんた、研究室でサイコロの話を聞いたのか。……赤が5回続いても、次の赤は同じ確率、か。', '頭ではわかった。でも、続くと「そろそろ」って思っちまうんだよな。それが人間なんだろう。今日は帰って寝るよ。']);
        else await c.say('カジノの常連客', ['見ろよ、ルーレットで赤が5回続いた。次は黒が来る番だ！ 確率は収束するんだろ？', '……研究棟の学者は「それは誤解だ」って言うんだ。あんた、確かめてきてくれないか。']); } },
      { id: 'lx_legend_dealer', x: 3, y: 11, sprite: 'master', dir: 'down', wander: 0, talk: async function (c) {
        if (c.flag('legend_dealer_done')) { await c.say('伝説のディーラー', ['勝つ日も負ける日もある。だが、賭け方は毎日選べる。', 'あのサイコロは、正直だっただろう？']); return; }
        await c.say('伝説のディーラー', ['……わしは四十年、台に立った。勝ち続けた客は一人もおらん。', 'だが、負けても帰れる客と、帰れなくなる客がいた。違いは三つの問いに答えられるかどうかだ。試すかね？']);
        var a = await c.choice('伝説のディーラーの問いに答える？', ['答える', 'やめる']); if (a !== 0) return;
        var Q = [
          { q: '問一：期待値がマイナスのゲームで、確実に勝ち越す賭け方はあるか？', o: ['倍賭けを続ければある', '賭け方では期待値は変わらない', '運の良い日を選べばある'], a: 1 },
          { q: '問二：赤が7回続いた。次に赤が出る確率は？', o: ['とても低い', '前と同じ（18/37）', 'とても高い'], a: 1 },
          { q: '問三：遊ぶ前にいちばん大事なことは？', o: ['勝つまでやめないと決める', '使ってよい額とやめる時を決める', '大きく賭けて早く終える'], a: 1 }
        ];
        for (var i = 0; i < Q.length; i++) { var r = await c.choice(Q[i].q, Q[i].o); if (r !== Q[i].a) { await c.say('伝説のディーラー', ['……ふむ。研究棟で学んでから、また来るといい。']); return; } }
        await c.say('伝説のディーラー', ['見事だ。これは若いころ、ある遺跡で拾ったサイコロだ。どの面も同じ確率で出る——ただそれだけの、正直なサイコロ。', '正直なものは、古代でも珍しかったらしい。持っていけ。']);
        c.setFlag('legend_dealer_done', true); if (root.Ooparts) await root.Ooparts.collect('op_033', []);
      } },
      { id: 'lx_guest', x: 15, y: 9, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('観光客', ['スロットの配当表、ちゃんと見たことある？ 777は500倍だけど、出る確率は8000回に1回なのよ。', '……夢を買うなら、値段を知ってから買いたいわよね。']); } }
    ] });

  /* ---------- カジノ研究棟（確率研究室・投資戦略研究室） 20×10 ---------- */
  var lg = Grid(20, 10, '_').border('#');
  lg.rect(9, 1, 1, 5, '#');                      // 部屋の仕切り（下は通れる）
  lg.rect(1, 1, 7, 1, 'K').rect(10, 1, 8, 1, 'K');   // 本棚（(5,1)・(17,1) は黒板のイベント）
  lg.set(2, 3, 't').set(6, 3, 't').set(2, 6, 't');
  lg.rect(12, 3, 4, 1, 'T'); lg.set(12, 6, 't').set(15, 6, 't');
  lg.set(9, 9, 'D');
  add({ id: 'luxbell_labs', name: 'カジノ研究棟', kind: 'interior', bgm: 'town', rows: lg.rows(),
    warps: [{ x: 9, y: 9, to: 'luxbell', tx: 32, ty: 26 }],
    events: [
      { x: 5, y: 1, type: 'inspect', solid: true, text: ['確率研究室の黒板：「確率＝その事が起こる場合の数÷すべての場合の数（どれも同じくらい起こりやすいとき）」', '「期待値＝Σ（確率×そのときの損益）」'] },
      { x: 17, y: 1, type: 'inspect', solid: true, text: ['投資戦略研究室の黒板：「増し玉の前に決めること——①どこで間違いと認めるか（損切り）②増やした後の合計の損失はいくらか③それは資金の何%か」'] }
    ],
    npcs: [
      { id: 'lx_probabilist', x: 4, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) {
        await c.say('確率学者ノルン', ['ようこそ、確率研究室へ。ここではコインを1枚も使わずに、カジノの仕組みを試せる。', '大数の法則、期待値、ギャンブラーの誤謬、マーチンゲール法。どれも、トレードの資金管理につながる話だ。']);
        await root.Labs.probLab(); } },
      { id: 'lx_assistant', x: 6, y: 6, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('研究助手', ['ここの実験もカジノの台も、コンピュータの「擬似乱数」で抽選しています。', '本物のサイコロとは仕組みが違いますが、決まった確率で、前の結果に左右されずに出るように作られています。']); } },
      { id: 'lx_strategist', x: 13, y: 2, sprite: 'npc_scholar', dir: 'down', wander: 0, talk: async function (c) {
        await c.say('主任研究員グレイス', ['投資戦略研究室だ。ここでは仮想の値動きで「増し玉」を試せる。カジノとは別物——賭けではなく、ポジションの管理の練習だ。', '含み益の方向に小さく積むピラミッティング、逆行に積むナンピン、倍々のマーチンゲール。同じ値動きでどう違うか、見比べてごらん。']);
        await root.Labs.strategy(); } },
      { id: 'lx_researcher', x: 16, y: 7, sprite: 'scholar', dir: 'down', wander: 1, talk: async function (c) { await c.say('研究員', ['ピラミッティングで大事なのは「増やすほど、損切りに当たったときの損も増える」ことだ。', 'だから増し玉のたびに損切りを引き上げて、合計の損失が最初に決めた額を超えないようにする。急反転のシナリオで試してみるといい。']); } }
    ] });

  /* ---------- 宿・雑貨店・食堂 ---------- */
  K.innInterior('luxbell_inn', '金の鈴亭', 'luxbell', 6, 19, 60);
  K.shopInterior('luxbell_item', 'ラックスベル雑貨店', 'luxbell', 6, 26, 'merchant', 'item', ['potion', 'hi_potion', 'ether', 'antidote', 'calm_water', 'wake_bell', 'escape_wing', 'tent', 'onigiri', 'yakitori', 'ramen', 'curry_rice', 'green_tea', 'coffee', 'fruit_juice'], ['いらっしゃい。カジノで勝っても負けても、薬は必要だよ。']);
  var dg = Grid(12, 9, '_').border('#'); dg.rect(1, 2, 5, 1, 'T'); dg.set(2, 4, 't').set(5, 4, 't').set(8, 4, 't').set(2, 6, 't').set(8, 6, 't'); dg.set(10, 1, 'q').set(10, 2, 'z'); dg.set(5, 8, 'D');
  add({ id: 'luxbell_dining', name: 'ラックスベル食堂', kind: 'interior', bgm: 'tavern', rows: dg.rows(), warps: [{ x: 5, y: 8, to: 'luxbell', tx: 32, ty: 19 }],
    npcs: [
      { id: 'lx_cook', x: 3, y: 1, sprite: 'innkeeper', dir: 'down', wander: 0, talk: async function (c) { await c.say('食堂の主人', ['いらっしゃい！ 勝った人も負けた人も、腹は減る。']); await root.Services.foodStand(root.FOOD_STANDS.luxbell_dining, 'ラックスベル食堂'); } },
      { id: 'lx_diner', x: 9, y: 5, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { await c.say('食堂の客', ['カジノで負けた分を取り返そうと思ったが、ここのカレーを食べたら落ち着いた。', '……腹が減ってるときの判断は、だいたい間違ってるんだよな。']); } }
    ] });
  root.FOOD_STANDS = root.FOOD_STANDS || {}; root.FOOD_STANDS.luxbell_dining = ['onigiri', 'yakitori', 'ramen', 'curry_rice', 'deluxe_steak', 'green_tea', 'coffee', 'fruit_juice', 'mana_soda'];
})(typeof window !== 'undefined' ? window : globalThis);
