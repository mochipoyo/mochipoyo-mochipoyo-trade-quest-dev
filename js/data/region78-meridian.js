/* =========================================================
   Data / Region78 メリディアン（v7.8）：北米東岸「灰岸都市メリディアン」（地球の世界の新しい地域）
   ・到達：断裂群島での用事のあと（yorn_letter_done）。遠洋航海船で大西洋を西へ（飛空艇でも）
   ・大災害で完全に廃墟となった港湾都市。郊外の避難所を拠点に、塩に覆われた平野・倒壊した高架道路・浸水した地下鉄を探索する
   ・物語「最後の避難列車」（meridian78_train）：最後の避難列車は、路線図にない駅で止まった。なぜ止まったのかを追い、
       乗客名簿と、残された伝言を、避難所で待つ家族へ届ける
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.R78; if (!R) return; var A = R.A; var D = R.D;
  var F = 'world_meridian';

  /* ---------- 敵（Lv25〜29） ---------- */
  R.special('salt_wind', { name: '塩の風', msg: 'は塩の混じった風を吹きつけた！ 目にしみる……', power: 0.55, all: true, status: { id: 'confuse', chance: 0.2 } });
  R.special('red_signal', { name: '赤信号', msg: 'は赤い灯を点した！「停止セヨ」', debuff: { agi: -0.35 }, turns: 3, target: 'allies' });
  R.special('rail_rush', { name: '暴走', msg: 'は線路の上を一直線に突っ込んできた！', power: 1.6 });
  R.monster('salt_ghost', { name: '塩の亡霊', lv: 26, arche: 'mage', art: { family: 'undead', c: { base: '#e8e4dc', accent: '#9ab0c0', eye: '#4a6a8a' } }, family: '不死系', area: '塩の平野', resist: { light: 1.6, dark: 0, ice: 0.6 }, actions: [A('attack', 1), A('special', 'salt_wind', 2), A('skill', 'ice', 1)], drops: [{ item: 'hi_ether', rate: 0.12 }], desc: '塩に覆われた平野をさまよう影。誰かを探しているように見える。' });
  R.monster('rubble_golem', { name: '瓦礫ゴーレム', lv: 27, arche: 'tank', art: { family: 'golem', c: { base: '#8a8478', accent: '#c0b090', eye: '#ff8a3a' } }, family: '魔法生物系', area: '倒壊した高架道路', resist: { thunder: 0.6, wind: 1.4 }, actions: [A('attack', 2), A('special', 'crush', 1)], drops: [{ item: 'hi_potion', rate: 0.3 }], desc: '崩れた高架の破片が、形を覚えて立ち上がった。' });
  R.monster('guard_bot', { name: '錆びた警備ロボ', lv: 26, arche: 'fast', art: { family: 'machine', c: { base: '#6a7a6a', accent: '#ffd24a', eye: '#ff3a3a' } }, family: '機械系', area: '倒壊した高架道路', resist: { thunder: 1.5 }, actions: [A('attack', 3), A('skill', 'thunder', 1)], drops: [{ item: 'antidote', rate: 0.3 }], desc: '避難の誘導を続ける警備ロボ。案内の声は、もうかすれている。' });
  R.monster('subway_rats', { name: '地下鉄のネズミ群', lv: 27, arche: 'glass', art: { family: 'swarm', c: { base: '#5a4a3a', accent: '#c09a6a', eye: '#ffea4a' } }, family: '獣系', area: '浸水した地下鉄', resist: { fire: 1.5 }, actions: [A('attack', 2), A('special', 'toxic_bite', 1)], drops: [{ item: 'antidote', rate: 0.4 }], desc: '線路の下で増えた。水の来ない場所を、よく知っている。' });
  R.monster('flood_gator', { name: '浸水の大ワニ', lv: 28, arche: 'tank', art: { family: 'reptile', c: { base: '#3a5a3a', accent: '#8ab06a', eye: '#ffd24a' } }, family: '魔物系', area: '浸水した地下鉄', resist: { ice: 1.4, thunder: 1.2 }, actions: [A('attack', 2), A('special', 'devour', 1)], drops: [{ item: 'hi_potion', rate: 0.3 }], desc: '水没したホームに棲みついた。' });
  R.monster('boss_block_signal', { name: '閉塞信号機ブロック・シグナル', lv: 30, arche: 'tank', boss: true, hpMult: 17.25, hpMult78: 12.5, atkMult: 2.2, magMult: 2.2, art: { family: 'turret', size: 'boss', c: { base: '#3a3a3a', accent: '#ff3a3a', eye: '#3aff6a' } }, family: '機械系', area: '路線図にない駅', resist: { thunder: 1.5, light: 0.8 },
    actions: [A('attack', 2), A('special', 'red_signal', 1), A('special', 'rail_rush', 1), { type: 'special', id: 'call', summon: 'guard_bot', w: 1, hpBelow: 0.5 }], drops: [{ item: 'elixir', rate: 1 }], desc: '最後の列車の前で、赤い灯を点し続けた信号機。「この先、崩落。停止セヨ」' });

  /* ---------- 報酬 ---------- */
  R.weapon('guide_flag_spear', '誘導の旗槍', 'spear', 40, 0, { desc: '避難誘導の旗を結んだ槍。光の力を帯びる', element: 'light' });
  R.armor('ashshore_coat', '灰岸のコート', 'light', 30, 3800, { desc: '塩と灰を払う厚手のコート。魔法防御+4', mdef: 4 });
  R.armor('conductor_watch', '車掌の懐中時計', 'acc', 2, 0, { desc: '最後の列車の車掌の時計。素早さ+6', agi: 6 });
  R.key('mer_passenger_list', '乗客名簿', '最後の避難列車の乗客名簿。二百十四名。全員の名前の横に「降車」と書かれている。');
  R.key('mer_letters', '残された伝言', '列車の掲示板に残されていた、家族あての伝言。三通。');

  /* ---------- クエスト ---------- */
  R.quest('meridian78_train', { title: '最後の避難列車', theme: '待つ人へ、知らせを届ける', desc: '灰岸都市メリディアンの最後の避難列車は、路線図にない駅で止まった。なぜ止まったのかを追い、乗客名簿と伝言を、避難所の家族へ届ける。',
    steps: [['mer_heard', '郊外の避難所の駅長代理グレイから、最後の列車の話を聞く'], ['mer_highway', '塩の平野の先、倒壊した高架道路を越える'], ['mer_found', '浸水した地下鉄の奥で、止まった列車を見つける'], ['mer_why', '路線図にない駅で、列車が止まった理由を知る'], ['mer_delivered', '避難所の家族3人に、伝言を届ける'], ['mer_done', '駅長代理グレイに報告する']],
    reward: { exp: 6500, gold: 4500, item: 'guide_flag_spear' } });
  R.obj('meridian78_train', 'mer_heard', 'npc:meridian_shelter:ms_grey', ['オルディス海の西、エルドランの東岸。', '「郊外の避難所」の駅長代理グレイ。', '灰岸都市メリディアンの郊外の避難所で、駅長代理グレイに話しかけよう。']);
  R.obj('meridian78_train', 'mer_highway', 'map:meridian_highway', ['避難所の東。', '塩の平野の先の「倒壊した高架道路」。', '塩の平野を東へ進み、倒壊した高架道路に入ろう。']);
  R.obj('meridian78_train', 'mer_found', 'ev:meridian_subway_2:24,6', ['灰岸の街の中心。', '「浸水した地下鉄」の奥の線路。', '浸水した地下鉄の下の階、線路の奥で止まった列車を探そう。']);
  R.obj('meridian78_train', 'mer_why', 'ev:meridian_station:8,3', ['浸水した地下鉄の最深部。', '「路線図にない駅」の信号機。', '路線図にない駅で、赤い灯を点し続ける信号機を止めよう。']);
  R.obj('meridian78_train', 'mer_delivered', 'npc:meridian_shelter:ms_mother', ['郊外の避難所。', '避難所で家族を待つ人たち（母親・老人・少女）。', '避難所に戻り、待っている3人に伝言を届けよう。']);
  R.obj('meridian78_train', 'mer_done', 'npc:meridian_shelter:ms_grey', ['郊外の避難所。', '駅長代理グレイ。', '駅長代理グレイに、伝言を届けたことを報告しよう。']);

  /* ---------- フィールド（北米東岸） ---------- */
  R.field({ id: F, name: '灰岸都市メリディアン', fallback: 'grass2', theme3d: { region: 'meridian' },
    locations: [
      { id: 'mer_shelter', name: '郊外の避難所', icon: 'village', lon: -75.4, lat: 40.2, to: 'meridian_shelter', tx: 14, ty: 18 },
      { id: 'mer_highway', name: '倒壊した高架道路', icon: 'cave_icon', lon: -74.55, lat: 40.55, to: 'meridian_highway', tx: 1, ty: 7 },
      { id: 'mer_subway', name: '浸水した地下鉄', icon: 'cave_icon', lon: -73.95, lat: 40.75, to: 'meridian_subway_1', tx: 1, ty: 2 },
      { id: 'mer_harbor', name: '灰岸の港', icon: 'tower_icon', lon: -74.05, lat: 40.6, to: 'meridian_harbor', tx: 5, ty: 7 }
    ],
    npcs: [
      { id: 'mf_scout', at: ['mer_shelter', 4, 1], sprite: 'hero_hunter', dir: 'down', wander: 0, talk: async function (c) { await c.say('避難所の見張り', ['東の平野は、塩に覆われてる。海が上がって、引いたあとに塩だけが残ったんだ。', '高架道路は崩れてるが、上を歩けば街まで行ける。……下はもう海だ。']); } }
    ],
    chests: [{ id: 'mf1', at: ['mer_highway', -3, 3], item: 'hi_ether', qty: 2 }, { id: 'mf2', at: ['mer_harbor', 2, -2], gold: 1500 }],
    events: [{ at: ['mer_shelter', 8, 0], type: 'inspect', solid: false, text: ['地面が白い。……雪ではなく、塩だ。踏むと、さくさくと鳴る。', '錆びた標識：「メリディアン中央駅まで 22km」'] }],
    encounters: { rate: 0.04, zones: [{ name: '塩の平野', test: function () { return true; }, groups: [['salt_ghost'], ['salt_ghost', 'guard_bot'], ['rubble_golem'], ['guard_bot', 'guard_bot'], ['salt_ghost', 'salt_ghost']] }] },
    earth: {} });
  R.blob(F, 11, function (b, gx, gy, n) { if (b === 'M' || b === 'W') return null; var v = root.Earth78.vnoise(gx, gy, 7, 91); return v > 0.55 ? (n < 0.015 ? 'c' : n < 0.25 ? ',' : 'n') : n < 0.035 ? '9' : n < 0.14 ? 'h' : n < 0.5 ? ',' : '.'; }   /* v7.9 崖・鉱滓を減らした */, [[-74.9, 40.35]]);

  /* ---------- 郊外の避難所 ---------- */
  var S = 'meridian_shelter';
  R.add({ id: S, name: '郊外の避難所', kind: 'town', bgm: 'town', fallback: 'dirt', style: 'wood', rows: [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'x,,,,RRRRRRRR,,,,,,,BBBBBB,,,x',
    'x,,,,RRRRRRRR,,,,,,,BBBBBB,,,x',
    'x,,,,RRRRRRRR,,,q,,,BBBBBB,,,x',
    'x,,,,RRRRRRRR,,,,,,,BBBBBB,z,x',
    'x,y,,,,,,,,,,rrrr,,,,,,,,,,,,x',
    'x,,,,,,,,,,,,rrrr,,,,,,,,y,,,x',
    'x,,VVVVV,,,,,rrrr,,,,,VVVVV,,x',
    'x,,VVVVV,,a,,rrrr,,a,,VVVVV,,x',
    'x,,VVVVV,,,,,rrrr,,,,,VVVVV,,x',
    'x,,,,,,,,,,,,rrrr,,,,,,,,,,,,x',
    'xrrrrrrrrrrrrrrrrrrrrrrrrrrrrx',
    'x,,,,,,,,,,,,rrrr,,,,,,,,,,,,x',
    'x,,BBBBB,,,,,rrrr,,,,,S,,,,,,x',
    'x,,BBBBB,,j,,rrrr,,,,,,,,,,,,x',
    'x,,BBBBB,,,,,rrrr,,,,,,,,,q,,x',
    'x,,,,,,,,,z,,rrrr,,,,,,,,,,,,x',
    'x,,,,,,,,,,,,rrrr,,,,,,,,,,,,x',
    'xxxxxxxxxxxxxrrrrxxxxxxxxxxxxx'
  ],
  buildings: [
    { id: 'hq', type: 'guild', name: '避難所の本部', x: 5, y: 1, w: 8, h: 4, doorX: 4, interior: 'meridian_hq', entry: { x: 5, y: 7 } },
    { id: 'clinic', type: 'inn', name: '診療テント', x: 20, y: 1, w: 6, h: 4, doorX: 3, interior: 'meridian_inn', entry: { x: 5, y: 7 } },
    { id: 'tent1', type: 'house', name: '家族のテント', x: 3, y: 7, w: 5, h: 3, doorX: 2, interior: 'meridian_tent', entry: { x: 5, y: 7 } },
    { id: 'depot', type: 'item', name: '物資の配給所', x: 22, y: 7, w: 5, h: 3, doorX: 2, interior: 'meridian_shop', entry: { x: 5, y: 7 } },
    { id: 'outfit', type: 'armor', name: '古着の仕立て場', x: 3, y: 13, w: 5, h: 3, doorX: 2, interior: 'meridian_gear', entry: { x: 5, y: 7 } }
  ],
  warps: [13, 14, 15, 16].map(function (x) { return R.warp(x, 18, F, 'mer_shelter', '外へ'); }),
  chests: [{ id: 'ms1', x: 28, y: 1, item: 'hi_potion', qty: 3 }],
  events: [{ x: 22, y: 13, type: 'script', solid: true, tile: 'sign', run: async function (c) { var d = D(); await c.msg(d.flags.mer_delivered ? ['尋ね人の掲示板。三枚の貼り紙の上に、「見つかった」と書き足されている。', '……「降車」の二文字が、こんなに重い言葉だとは思わなかった。'] : ['尋ね人の掲示板。たくさんの貼り紙。', '「最後の避難列車に乗った息子を探しています」「妻の消息を」「パパへ」', 'どの貼り紙にも、同じ列車の番号が書いてある。']); } }],
  npcs: [
    { id: 'ms_grey', x: 18, y: 12, sprite: 'royal_guard', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (c.questDone('meridian78_train')) { await c.say('駅長代理グレイ', ['三人とも、泣いて、それから笑っていた。……待つのをやめて、会いに行く準備を始めたよ。', '列車は止まった。でも、止めた人がいた。それを知るだけで、人は前に進める。']); return; }
      if (d.flags.mer_delivered) {
        await c.say('駅長代理グレイ', ['……届けてくれたのか。三人とも。', '二百十四名、全員「降車」。車掌は、崩れる前のトンネルの手前で、列車を止めて、全員を地上の非常口へ降ろしたんだな。', '路線図にない駅は、工事の途中で放っておかれた避難用のホームだった。……誰も知らなかった。車掌以外は。']);
        d.flags.mer_done = true; await c.questComplete('meridian78_train'); c.give('conductor_watch', 1); await c.msg(['車掌の懐中時計も受け取った。']);
        await c.say('駅長代理グレイ', ['その時計は、乗客が線路に置いていったものだ。車掌に返してやれなかった。……あんたが持っていてくれ。']); return;
      }
      if (!c.questActive('meridian78_train')) {
        await c.say('駅長代理グレイ', ['灰岸都市メリディアンへようこそ。……と言っても、街はもうない。ここは郊外の避難所だ。', '大災害の日、最後の避難列車が中央駅を出た。ここが終点のはずだった。', '列車は着かなかった。路線図にない場所で止まった、という通信が最後だ。……十年、誰も確かめに行けていない。']);
        var ch = await c.choice('最後の列車の行方を、確かめてほしい。', ['引き受ける', 'あとにする']); if (ch !== 0) return;
        c.questStart('meridian78_train'); d.flags.mer_heard = true;
        await c.say('駅長代理グレイ', ['東の塩の平野を越えて、崩れた高架道路の上を行け。その先が街の中心だ。', '地下鉄の入口は街の真ん中。中は浸水している。……線路をたどれば、列車がいるはずだ。']); return;
      }
      await c.say('駅長代理グレイ', ['東の塩の平野、崩れた高架道路、そして浸水した地下鉄。……線路をたどってくれ。']);
    } },
    { id: 'ms_mother', x: 9, y: 9, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { await deliver(c, 'mother', '息子を待つ母親', ['息子は、あの列車の運転席の後ろに乗ったの。窓から手を振ってた。'], ['「母さんへ。電車が止まった。でも車掌さんが、歩いて出られる道を教えてくれた。先に北の町へ行く。必ず迎えに行く」'], ['……北の町。あの子、生きて……。', '十年、ここで待ってた。待つのは、やめる。わたしが迎えに行く。']); } },
    { id: 'ms_oldman', x: 20, y: 9, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await deliver(c, 'oldman', '妻を待つ老人', ['妻は、病院の看護師だった。最後の列車で、患者に付き添って乗ったんだ。'], ['「あなたへ。患者さんたちは全員、非常口から出られました。わたしは最後に降ります。海辺の療養所で会いましょう」'], ['最後に降りる、か。……あいつらしい。', '海辺の療養所なら、知っている。杖をついてでも行くさ。']); } },
    { id: 'ms_girl', x: 15, y: 16, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await deliver(c, 'girl', '父を待つ少女', ['パパは、駅で働いてたの。最後の列車を見送るって言ってた。'], ['「アンナへ。パパは列車を見送ったあと、車掌さんと一緒に信号を守った。みんなが降りるまで。ごめんな、約束の時間に帰れなくて。大好きだよ」'], ['……パパ、信号を守ったんだ。', 'えらいね、って言いたいけど、ちょっと怒ってる。……ちょっとだけ。']); } },
    { id: 'ms_medic', x: 25, y: 16, sprite: 'priest', dir: 'down', wander: 1, talk: async function (c) { await c.say('避難所の医師', ['塩の平野には亡霊が出る。名前を呼ぶと、少しだけ立ち止まるんだ。', '……誰かを探しているのかもしれないね。']); } }
  ] });
  // 伝言を届ける（3人）
  async function deliver(c, key, who, before, letter, after) {
    var d = D(); var f = 'mer_gave_' + key;
    if (d.flags[f]) { await c.say(who, after.slice(-1)); return; }
    if (!c.has('mer_letters')) { await c.say(who, before.concat(['……あの列車がどこで止まったのか、誰も教えてくれない。'])); return; }
    await c.msg(['残された伝言を一通、手渡した。']); await c.msg(letter); await c.say(who, after); d.flags[f] = true;
    if (d.flags.mer_gave_mother && d.flags.mer_gave_oldman && d.flags.mer_gave_girl) { d.flags.mer_delivered = true; c.take('mer_letters', 1); await c.msg(['三通の伝言を、すべて届けた。']); }
  }
  R.inn('meridian_inn', '診療テント', S, 23, 5, 110);
  R.shop('meridian_shop', '物資の配給所', S, 24, 10, 'merchant', 'item', ['hi_potion', 'hi_ether', 'antidote', 'calm_water', 'escape_wing', 'escape_feather', 'tent', 'phoenix_feather'], ['物資は、みんなで分ける。……旅の人の分も、ちゃんとある。']);
  R.shop('meridian_gear', '古着の仕立て場', S, 5, 16, 'merchant', 'armor', ['ashshore_coat', 'knight_armor', 'iron_helm', 'knight_shield'], ['塩を払うには、厚手のコートがいちばんだよ。']);
  R.add({ id: 'meridian_hq', name: '避難所の本部', kind: 'interior', bgm: 'town', rows: ['############', '#KK_SS__KK_#', '#__________#', '#_TTTT__t__#', '#__________#', '#_t___t_q__#', '#__________#', '#__________#', '#####D######'], warps: [{ x: 5, y: 8, to: S, tx: 9, ty: 5 }],
    npcs: [{ id: 'mh_radio', x: 6, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('通信係', c.flag('mer_why') ? ['信号機の記録、読ませてもらった。「崩落ノ危険。停止」……最後まで正しく働いてたんだな、あの信号は。'] : ['最後の通信は「路線図にない駅に停車」。……そんな駅、どの地図にも載っていない。', '工事の途中で止まった計画があった、という噂はある。地下の避難用ホームの話だ。']); } }],
    events: [{ x: 4, y: 1, type: 'inspect', solid: true, text: ['壁の路線図。中央駅から郊外の避難所まで、一本の線。', '線の途中に、鉛筆で小さな丸が書き足してある。「ここ？」'] }] });
  R.add({ id: 'meridian_tent', name: '家族のテント', kind: 'interior', bgm: 'town', rows: ['############', '#E__E__E__E#', '#__________#', '#_t______q_#', '#__________#', '#_z________#', '#__________#', '#__________#', '#####D######'], warps: [{ x: 5, y: 8, to: S, tx: 5, ty: 10 }],
    npcs: [{ id: 'mt_boy', x: 6, y: 4, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('避難所の男の子', ['ぼくのお兄ちゃんは、列車に乗れなかったの。だから、ここにいる。', '乗れた人たちは、どこに行っちゃったんだろう。']); } }] });
  R.add({ id: 'meridian_harbor', name: '灰岸の港', kind: 'interior', bgm: 'town', rows: ['############', '#o___XX___o#', '#__________#', '#____II____#', '#__________#', '#_t______q_#', '#__________#', '#__________#', '#####D######'], warps: [R.warp(5, 8, F, 'mer_harbor', '外へ')],
    events: [{ x: 5, y: 1, type: 'inspect', solid: true, text: ['港の見張り台の窓から、灰色の海が見える。', '水の上に、ビルの先だけが並んでいる。……灰岸都市メリディアンの中心は、いまは海の中だ。', '遠く、オルディス海の向こうは、旧大陸の方角だ。'] }] });

  /* ---------- 倒壊した高架道路 ---------- */
  var HW_ENC = { rate: 0.05, zones: [{ name: '倒壊した高架道路', test: function () { return true; }, groups: [['rubble_golem'], ['guard_bot', 'guard_bot'], ['salt_ghost', 'rubble_golem'], ['guard_bot', 'salt_ghost']] }] };
  R.add({ id: 'meridian_highway', name: '倒壊した高架道路', kind: 'dungeon', bgm: 'dungeon', fallback: 'stone', rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~======~~~~~~=========~~~~~~~~~~~~~',
    '~~======~~~~~~=c=====c=~~~~=====~~~~',
    '~~==c===========c===c===~~~=======~~',
    '~~======~~~~~~=====c====~~~==c====~~',
    '~~~~=~~~~~~~~~=========~~~~=======~~',
    '~~~~=~~~~~~~~~~~~=~~~~~~~~~====c==~~',
    '=====~~~~~====~~~=~~~~~~~~~=======~~',
    '~~~~=~~~~~=$=~~~~=~~~~~=========~~~~',
    '~~~~=======c=====================~~~',
    '~~~~~~~~~~=====~~~~~~~~=====~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~=============',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
  ], warps: [R.warp(0, 7, F, 'mer_highway', '西へ戻る'), R.warp(35, 11, F, 'mer_subway', '街の中心へ', -1, 0)],
    chests: [{ id: 'mh1', x: 11, y: 8, item: 'elixir', qty: 1 }],
    events: [{ x: 18, y: 6, type: 'script', solid: false, run: async function (c) { var d = D(); if (!d.flags.mer_highway && c.questActive('meridian78_train')) { d.flags.mer_highway = true; await c.msg(['崩れた高架の切れ目から、下を見下ろした。……海だ。道路の下を、波が通り抜けている。', '東の先に、ビルの影が見える。灰岸都市メリディアンの中心だ。']); } } },
      { x: 3, y: 3, type: 'inspect', solid: false, text: ['横倒しのバス。窓に、子どもの字で「いってきます」。'] }],
    encounters: HW_ENC });

  /* ---------- 浸水した地下鉄（2層）・路線図にない駅 ---------- */
  var SW_ENC = { rate: 0.05, zones: [{ name: '浸水した地下鉄', test: function () { return true; }, groups: [['subway_rats'], ['subway_rats', 'subway_rats'], ['flood_gator'], ['guard_bot', 'subway_rats'], ['flood_gator', 'subway_rats']] }] };
  R.add({ id: 'meridian_subway_1', name: '浸水した地下鉄 中央駅', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '############################',
    '#::::::::::::::#::::::::::$#',
    '#<:::I::::I::::#::I::::I:::#',
    '#::::::::::::::D:::::::::::#',
    '#~~~~~~:~~~~~~~#~~~~~~~~~~~#',
    '#~~~~~~:~~~~~~~#~~~~~~~~~~~#',
    '#::::::::::::::::::::::::::#',
    '#::I:::::I:::::::I:::::I:::#',
    '#~~~~~~~~~~::::::~~~~~~~~~~#',
    '#~~~~~~~~~~::::::~~~~~~~~~~#',
    '#::::::::::::::::::::::::>:#',
    '############################'
  ], warps: [R.warp(1, 2, F, 'mer_subway', '地上へ'), { x: 25, y: 10, to: 'meridian_subway_2', tx: 1, ty: 6 }],
    chests: [{ id: 'msw1', x: 26, y: 1, item: 'hi_ether', qty: 2 }],
    events: [{ x: 7, y: 1, type: 'inspect', solid: false, text: ['ホームの電光掲示板。最後の表示のまま、止まっている。', '「最終 避難列車　郊外の避難所 行き　——発車済み」'] }],
    encounters: SW_ENC });
  R.add({ id: 'meridian_subway_2', name: '浸水した地下鉄 線路の奥', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '##############################',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#::::::::::::::::::::::::::::#',
    '#:WWWWWWW::WWWWWWW::WWWWWWW::#',
    '#:W_____W::W_____W::W_____D::#',
    '#<__________________________:#',
    '#:W_____W::W_____W::W_____W::#',
    '#:WWWWWWW::WWWWWWW::WWWWWWW::#',
    '#::::::::::::::::::::::::::::#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~>~~~#',
    '##############################'
  ], warps: [{ x: 1, y: 6, to: 'meridian_subway_1', tx: 24, ty: 10 }, { x: 25, y: 10, to: 'meridian_station', tx: 8, ty: 8 }],
    events: [{ x: 24, y: 6, type: 'script', solid: false, run: async function (c) { var d = D(); if (d.flags.mer_found) return; d.flags.mer_found = true; await c.msg(['線路の上に、列車が止まっている。三両。どの車両も、空っぽだ。', '先頭の車両の扉だけが開いている。その先の線路は、水の中へ沈んでいる……いや、脇に、細い階段がある。', '「非常口 → 地上」と書かれた板が、階段の手すりに結びつけてある。']); } },
      { x: 13, y: 6, type: 'inspect', solid: false, text: ['座席に、誰かの手袋が片方だけ置いてある。急いで、でも慌てずに降りたように見える。'] }],
    encounters: SW_ENC });
  R.add({ id: 'meridian_station', name: '路線図にない駅', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    '#################',
    '#:::::::KSK:::::#',
    '#::I:::::::::I::#',
    '#:::::::::::::::#',
    '#~~~~~~:::~~~~~~#',
    '#~~~~~~:::~~~~~~#',
    '#::I:::::::::I::#',
    '#:::::::::::::::#',
    '#:::::::<:::::::#',
    '#################'
  ], warps: [{ x: 8, y: 8, to: 'meridian_subway_2', tx: 25, ty: 9 }],
    npcs: [{ id: 'mst_conductor', x: 12, y: 3, sprite: 'phantom', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (!d.flags.mer_why) { await c.say('車掌の影', ['……この先は、通れない。信号が、赤だ。', '信号が赤のあいだは、わたしは、列車を出せない。']); return; }
      if (d.flags.mer_got_list) { await c.say('車掌の影', ['名簿と伝言を、頼んだよ。', '……ああ、やっと、休める。']); return; }
      await c.say('車掌の影', ['信号が、消えた。……ありがとう。', 'あの日、この先のトンネルが崩れかけていた。信号は赤を点し、わたしは列車を止めた。', 'ここは、工事が止まったままの避難用ホームだ。路線図には載っていない。でも、非常口は地上へ通じていた。', '二百十四名、全員をここで降ろした。……ただ、それを伝える手段がなかった。']);
      d.flags.mer_got_list = true; c.give('mer_passenger_list', 1); c.give('mer_letters', 1);
      await c.msg(['乗客名簿と、残された伝言を受け取った！']);
      await c.say('車掌の影', ['掲示板に残された伝言だ。三通。郊外の避難所で、待っている人がいるはずだ。', '……届けてくれ。わたしの列車は、終点に着けなかったから。']);
    } }],
    events: [{ x: 8, y: 3, type: 'script', solid: true, tile: 'sign', run: async function (c) {
      var d = D(); if (d.flags.mer_why) { await c.msg(['信号機は消えている。もう赤い灯は点らない。']); return; }
      if (!d.flags.mer_found) { await c.msg(['赤い灯を点し続ける信号機。……線路の奥の列車を、先に確かめよう。']); return; }
      await c.msg(['赤い灯を点し続ける信号機。十年、ずっと「停止」を示している。', '信号機「コノ先、崩落ノ危険。停止セヨ。停止セヨ。停止セヨ」', '……近づくと、信号機の灯が、こちらを向いた。']);
      var r = await c.battle(['boss_block_signal'], { boss: true }); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
      d.flags.mer_why = true; await c.msg(['信号機の灯が、ゆっくりと消えた。', '記録装置に、最後の記録が残っていた。「崩落ノ危険ヲ検知。列車ヲ停止。乗客ノ降車ヲ確認——二百十四名」', 'ホームの端で、誰かが帽子を取った。……車掌の影だ。']); root.State.autosave();
    } }], encounters: null });
  /* ---------- 見た目（3D 版のテーマ・戦闘の背景） ---------- */
  // 場所の外観（2D の地図の絵・3D の目印）
  R.design('mer_shelter', { architectureStyle: '倒れた家の材木と板で補修した避難所の集落', silhouette: 'survivor_village', roofStyle: 'patched', materials: { wall: '#a8a49a', wallD: '#76726a', wood: '#6a5a4a', roof: '#6a625a', roofD: '#4a4440', patch: '#8a7a5a', glow: '#ffb070' }, decoration: ['patches', 'laundry'], environment: ['rubble'] });
  R.design('mer_highway', { architectureStyle: '灰に埋もれた、崩れた高架道路', silhouette: 'ruins', roofStyle: 'broken', materials: { wall: '#9a968c', wallD: '#6a665e', mortar: '#7a766e', roof: '#5a5650', moss: '#8a8478' }, decoration: [], environment: ['rubble'] });
  R.design('mer_subway', { architectureStyle: '灰の平野に口を開けた地下鉄の入口', silhouette: 'bunker', roofStyle: 'none', materials: { rock: '#8a857c', rockL: '#b0aaa0', rockD: '#5a564e', metal: '#7a8088', glow: '#ffcc66' }, decoration: ['vault_door'], environment: ['rocks'] });
  R.design('mer_harbor', { architectureStyle: '灰の浜の見張り小屋と船着き場', silhouette: 'shore_hut', roofStyle: 'shed', materials: { wall: '#9a948a', wallD: '#6e6a62', wood: '#5a4a3a', roof: '#5a5a62', roofD: '#3a3a42', glow: '#ffcc66' }, decoration: ['lantern'], environment: ['beach', 'pier'] });
  R.tag(['world_meridian', 'meridian_highway'], 'meridian', 'grassland', 'grania', R.MOOD.ashSky);
  R.tag(['meridian_shelter'], 'meridian', null, 'grania', R.MOOD.ashSky);
  R.tag(['meridian_inn', 'meridian_shop', 'meridian_gear', 'meridian_hq', 'meridian_tent', 'meridian_harbor'], 'meridian', null, 'grania');
  R.bossSym('meridian_station', 8, 3, 'boss_block_signal', function (f) { return f.mer_found && !f.mer_why; });
  R.tag(['meridian_subway_1', 'meridian_subway_2', 'meridian_station'], 'meridian', 'machine_city', 'machine');
  R.look(['meridian_subway_1', 'meridian_subway_2', 'meridian_station'], { room: 'factory', decor: 'machine' });
  R.look(['meridian_shelter'], { decor: 'ruins' });
})(typeof window !== 'undefined' ? window : globalThis);
