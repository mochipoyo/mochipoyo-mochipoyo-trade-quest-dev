/* =========================================================
   Data / Towns : 町・村・城と建物内部のマップ・NPC・会話
   会話は async function(c) で記述（c はイベントAPI：say/choice/shop/inn/…）
   ========================================================= */
(function (root) {
  'use strict';

  var MAPS = root.MAP_DEFS = root.MAP_DEFS || {};
  function add(def) { MAPS[def.id] = def; return def; }

  /* ---------- 建物内部の共通テンプレート ---------- */
  // 店：カウンターの奥に店主
  function shopInterior(id, name, town, exitX, exitY, keeper, shopKind, stock, extraLines) {
    var rows = shopKind === 'weapon' ? [
      '############', '#KK_qq__zKK#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#_z______q_#', '#__t____t__#', '#__________#', '#####D######'
    ] : shopKind === 'armor' ? [
      '############', '#KK__II__KK#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#_z________#', '#__t____t__#', '#__________#', '#####D######'
    ] : [
      '############', '#KKK_qq_KKK#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#__zz______#', '#__t____t__#', '#__________#', '#####D######'
    ];
    return add({ id: id, name: name, kind: 'interior', bgm: 'town', rows: rows, warps: [{ x: 5, y: 8, to: town, tx: exitX, ty: exitY }],
      npcs: [{ id: id + '_keeper', x: 5, y: 2, sprite: keeper, dir: 'down', wander: 0, talk: async function (c) { if (extraLines) await c.say(name, extraLines); await c.shop(shopKind, stock); } }] });
  }
  function innInterior(id, name, town, exitX, exitY, price) {
    return add({ id: id, name: name, kind: 'interior', bgm: 'town', rows: [
      '############', '#E__E__E__E#', '#__________#', '#_pppppppp_#', '#TTTT_pppp_#', '#____tppppt#', '#_q___pp___#', '#__________#', '#####D######'
    ], warps: [{ x: 5, y: 8, to: town, tx: exitX, ty: exitY }],
      npcs: [{ id: id + '_keeper', x: 2, y: 3, sprite: 'innkeeper', dir: 'down', wander: 0, talk: async function (c) { await c.inn(price); } },
        { id: id + '_guest', x: 8, y: 2, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('宿の客', ['旅の疲れは宿で取るに限る。戦闘不能の仲間は教会でしか治らないから気をつけな。']); } }] });
  }
  function churchInterior(id, name, town, exitX, exitY) {
    return add({ id: id, name: name, kind: 'interior', bgm: 'church', rows: [
      '############', '#I___XX___I#', '#__ppppppp_#', '#_ppppppppp#', '#_t_tppt_t_#', '#_t_tppt_t_#', '#_t_tppt_t_#', '#I___pp___I#', '#####D######'
    ], warps: [{ x: 5, y: 8, to: town, tx: exitX, ty: exitY }],
      npcs: [{ id: id + '_priest', x: 5, y: 2, sprite: 'priest', dir: 'down', wander: 0, talk: async function (c) { await c.church(); } }] });
  }

  /* =========================================================
     ポヨ村（始まりの村）
     ========================================================= */
  add({ id: 'poyo_village', name: 'ポヨ村', kind: 'town', bgm: 'town', fallback: 'grass', style: 'wood', rows: [
    'ffffffffffffffffffffffff',
    'ffBBBBBB..rr..f.BBBBB..f',
    'f.BBBBBBa.rr.j..BBBBB..f',
    'f.BBBBBB..rr....BBBBB..f',
    'f....rrrrrrrrrrrrrr..6.f',
    'f.6.......rr...........f',
    'f........yrry..BBBBBB..f',
    'f.BBBBBB.,rr...BBBBBB..f',
    'f.BBBBBBa.rr.e.BBBBBB..f',
    'f.BBBBBB..rr...BBBBBB..f',
    'f....rrrrrrrrrrrrrr..xHf',
    'fxxxx.....rr.........xHf',
    'f..,.....yrry..BBBBBBxHf',
    'ffBBBB....rr.qzBBBBBB..f',
    'f.BBBB....rr.f.BBBBBB..f',
    'ffBBBB....rrrrrrrrr....f',
    'f..rrrrrrrrr...f.......f',
    'f.........rr...........f',
    'f..S......rr...........f',
    'ffffffffffrrffffffffffff'
  ],
  buildings: [
    { id: 'elder', type: 'elder', name: '村長の家', x: 2, y: 1, w: 6, h: 3, doorX: 3, interior: 'poyo_elder_house', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: 'ポヨ村の道具屋', x: 16, y: 1, w: 5, h: 3, doorX: 2, interior: 'poyo_item_shop', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: 'ポヨ村の宿屋', x: 2, y: 7, w: 6, h: 3, doorX: 3, interior: 'poyo_inn', entry: { x: 5, y: 7 } },
    { id: 'church', type: 'church', name: 'ポヨ村の教会', x: 15, y: 6, w: 6, h: 4, doorX: 3, interior: 'poyo_church', entry: { x: 5, y: 7 } },
    { id: 'dojo', type: 'dojo', name: 'トレード修行場', x: 15, y: 12, w: 6, h: 3, doorX: 3, interior: 'poyo_dojo', entry: { x: 5, y: 7 } },
    { id: 'house', type: 'house', name: '農夫の家', x: 2, y: 13, w: 4, h: 3, doorX: 1, interior: 'poyo_house', entry: { x: 5, y: 7 } }
  ],
  warps: [{ x: 10, y: 19, to: 'world', tx: 28, ty: 59, name: '村の外へ' }, { x: 11, y: 19, to: 'world', tx: 28, ty: 59, name: '村の外へ' }],
  chests: [{ id: 'poyo1', x: 1, y: 17, item: 'herb', qty: 2 }],
  npcs: [
    { id: 'poyo_child', x: 13, y: 7, sprite: 'child', dir: 'down', wander: 2, talk: async function (c) { await c.say('村の子ども', ['ねえねえ、しってる？ 相場の波は上がったり下がったりするんだって。', 'おじいちゃんが「高値と安値を見ろ」っていつも言ってる！']); } },
    { id: 'poyo_woman', x: 7, y: 5, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) {
      if (!c.flag('met_elder')) await c.say('村の女性', ['あなた、見かけない顔ね。村長が北西の大きな家で待っているわ。まず話を聞いてきなさいな。']);
      else await c.say('村の女性', ['南の道を行けば港町マリナ、北へ行けばリヴェル城下町よ。東の森には近づかないほうがいいわ。']); } },
    { id: 'poyo_farmer', x: 20, y: 11, sprite: 'villager_m', dir: 'left', wander: 1, talk: async function (c) { await c.say('農夫', ['うちの畑に出るスライムくらいなら、木の剣でも何とかなるさ。', '東の家は「トレード修行場」。師匠がチャートの読み方を教えてくれる。冒険の合間に通うといい。']); } },
    { id: 'poyo_traveler', x: 7, y: 11, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('旅人', ['宿屋の前で休ませてもらってる。この村の宿は安くていいね。', '教会でリーナって僧侶を見かけたよ。旅の仲間を探してるみたいだった。']); } }
  ],
  events: [{ x: 3, y: 18, type: 'inspect', text: ['【立て札】ポヨ村へようこそ。\n北西：村長の家　北東：道具屋\n西：宿屋　東：教会／トレード修行場\n南の道→港町マリナ　北の道→リヴェル城下町'] }]
  });

  add({ id: 'poyo_house', name: '農夫の家', kind: 'interior', bgm: 'town', rows: [
    '############', '#E__K__q___#', '#__________#', '#__t__t____#', '#__________#', '#_______zz_#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'poyo_village', tx: 3, ty: 16 }],
    npcs: [{ id: 'farmer_wife', x: 4, y: 4, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('農夫の妻', ['畑の野菜は村の自慢よ。', '夫が言うには、相場も畑も「種をまく時期を間違えない」ことが大事なんですって。']); } }] });

  add({ id: 'poyo_elder_house', name: '村長の家', kind: 'interior', bgm: 'town', rows: [
    '############',
    '#KK___E____#',
    '#__________#',
    '#__t_____t_#',
    '#__________#',
    '#__________#',
    '#_____KK___#',
    '#__________#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'poyo_village', tx: 5, ty: 4 }],
    npcs: [{ id: 'elder_mochizo', x: 5, y: 3, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
      if (!c.flag('met_elder')) {
        await c.say('村長モチゾウ', ['おお……目を覚ましたか。お前さんは三日前、村はずれの草原で倒れておったんじゃ。', 'ここはアルカディア相場大陸、ポヨ村。世界を支えておった「均衡のクリスタル」が砕けてから、人の欲望や恐怖が魔物の姿をとって彷徨っておる。', 'お前さんの胸に光る痣……それは「波を読む者」の印じゃ。古い伝承にある。', 'まずは北のリヴェル城下町へ行き、王に会うがよい。路銀として、これを持っていきなさい。']);
        c.addGold(100); c.give('herb', 3); c.give('wooden_sword', 1);
        await c.msg(['100Gと薬草3つ、木の剣を手に入れた！']);
        await c.say('村長モチゾウ', ['教会にいる僧侶のリーナも、お前さんと同じ日に村へ来た旅の者じゃ。一緒に行くとよかろう。', '道具は東の道具屋、休むなら宿屋じゃ。東の修行場では「波の読み方」も学べる。']);
        c.setFlag('met_elder', true); c.questStart('main_1');
      } else if (!c.flag('king_quest1')) {
        await c.say('村長モチゾウ', ['北の道を進めばリヴェル城下町じゃ。王に会うのじゃぞ。']);
      } else {
        await c.say('村長モチゾウ', ['王からの依頼を引き受けたか。無理はするでないぞ。負けそうなときは逃げるのも立派な判断じゃ。']);
      }
    } }] });

  shopInterior('poyo_item_shop', '道具屋', 'poyo_village', 18, 4, 'merchant', 'item', ['herb', 'antidote', 'wake_bell', 'potion', 'escape_wing', 'tent'], ['いらっしゃい！ 薬草は冒険の必需品だよ。']);
  innInterior('poyo_inn', 'ポヨ村の宿屋', 'poyo_village', 5, 10, 10);
  add({ id: 'poyo_church', name: 'ポヨ村の教会', kind: 'interior', bgm: 'church', rows: [
    '############',
    '#I___XX___I#',
    '#__ppppppp_#',
    '#_ppppppppp#',
    '#_t_tppt_t_#',
    '#_t_tppt_t_#',
    '#_t_tppt___#',
    '#I___pp___I#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'poyo_village', tx: 18, ty: 10 }],
    npcs: [
      { id: 'poyo_priest', x: 5, y: 2, sprite: 'priest', dir: 'down', wander: 0, talk: async function (c) { await c.church(); } },
      { id: 'lina', x: 8, y: 6, sprite: 'lina', dir: 'left', wander: 0, talk: async function (c) {
        if (c.hasCompanion('lina')) return;
        if (!c.flag('met_elder')) { await c.say('リーナ', ['あなたも村長さんに拾われた旅の人？ まずは村長さんの話を聞いてきて。']); return; }
        await c.say('リーナ', ['私はリーナ。巡礼の途中で魔物に襲われて、この村に逃げ込んだの。', '村長さんから聞いたわ。リヴェルの王様に会いに行くのね。回復魔法なら任せて。一緒に行ってもいい？']);
        var a = await c.choice('リーナを仲間にしますか？', ['はい', 'いいえ']);
        if (a === 0) { c.join('lina'); await c.msg(['リーナが仲間になった！', 'メニューの「なかま」で編成を確認できる。']); }
        else await c.say('リーナ', ['そう……気が変わったら、また声をかけてね。']);
      } }
    ] });

  // トレード修行場（学習施設）
  add({ id: 'poyo_dojo', name: 'トレード修行場', kind: 'interior', bgm: 'town', rows: [
    '############',
    '#KKKK__KKKK#',
    '#__________#',
    '#_pppppppp_#',
    '#_t_pppp_t_#',
    '#_t_pppp_t_#',
    '#_pppppppp_#',
    '#__________#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'poyo_village', tx: 18, ty: 15 }],
    npcs: [
      { id: 'master_hakei', x: 5, y: 2, sprite: 'master', dir: 'down', wander: 0, talk: async function (c) { await c.dojo('poyo'); } },
      { id: 'dojo_student', x: 9, y: 6, sprite: 'villager_m', dir: 'left', wander: 1, talk: async function (c) { await c.say('修行中の若者', ['師匠は「勝てる場面を探すより、戦わない場面を知れ」って言うんだ。', '修行場のチャートは学習用に作られたものだから、何度失敗しても資金は減らない。安心して練習しなよ。']); } }
    ] });

  /* =========================================================
     リヴェル城下町（始まりの王国の都）
     ========================================================= */
  add({ id: 'rivel_town', name: 'リヴェル城下町', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'C==========BBBBBBBBBB==========C',
    'C========..BBBBBBBBBB..========C',
    'C=6======.=BxxBBBBxxB=.======6=C',
    'C=6========BBBBBBBBBB========6=C',
    'C==========BBBBBBBBBB==========C',
    'C==============rr==============C',
    'C=BBBBBB=======rr=======BBBBBB=C',
    'C=BBBBBB=y=====rr=====y=BBBBBB=C',
    'C=BBB=======================BB=C',
    'C====rrrrrrrrrrrrrrrrrrrrrr====C',
    'C===========y==rr==y===========C',
    'C=BBBBBB=====e=rr=e=====BBBBBB=C',
    'C=BBBBBB=======rr=======BBBBBB=C',
    'C=BBBBBB=======rr=======BBBBBB=C',
    'C====rrrrrrrrrrrrrrrrrrrrrr====C',
    'C============a=rr=a============C',
    'C=BBBBBB====y==rr==y====BBBBBB=C',
    'C=BBBBBB=======rr=======BBBBBB=C',
    'C=BBBBBB=======rr=======BBBBBB=C',
    'C=BBBBBB=y=====rr=====y========C',
    'C====rrrrrrrrrrrrrrrrrrrrrr====C',
    'C=BBBBBB=======rr=======BBBBBB=C',
    'C=BBBBBB=======rr=======BBBBBB=C',
    'C=BBBBBB==AA===rr===AA==BBBBBB=C',
    'C====rrrrrrrrrrrrrrrrrrrrrr====C',
    'C==S=====q=====rr=====zz====6==C',
    'CCCCCCCCCCCCCCCrrCCCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'castle', type: 'castle', name: 'リヴェル城', x: 11, y: 1, w: 10, h: 5, doorX: 4, interior: 'rivel_castle', entry: { x: 7, y: 12 } },
    { id: 'weapon', type: 'weapon', name: 'リヴェル武器屋', x: 2, y: 7, w: 6, h: 3, doorX: 2, interior: 'rivel_weapon_shop', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: 'リヴェル防具屋', x: 24, y: 7, w: 6, h: 3, doorX: 2, interior: 'rivel_armor_shop', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: 'リヴェル道具屋', x: 2, y: 12, w: 6, h: 3, doorX: 2, interior: 'rivel_item_shop', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: 'リヴェルの宿屋', x: 24, y: 12, w: 6, h: 3, doorX: 2, interior: 'rivel_inn', entry: { x: 5, y: 7 } },
    { id: 'church', type: 'church', name: 'リヴェル教会', x: 2, y: 17, w: 6, h: 4, doorX: 2, interior: 'rivel_church', entry: { x: 5, y: 7 } },
    { id: 'tavern', type: 'tavern', name: 'リヴェルの酒場', x: 24, y: 17, w: 6, h: 3, doorX: 2, interior: 'rivel_tavern', entry: { x: 5, y: 7 } },
    { id: 'guild', type: 'guild', name: '冒険者ギルド', x: 2, y: 22, w: 6, h: 3, doorX: 2, interior: 'rivel_guild', entry: { x: 5, y: 7 } },
    { id: 'bank', type: 'bank', name: 'リヴェル銀行', x: 24, y: 22, w: 6, h: 3, doorX: 2, interior: 'rivel_bank', entry: { x: 5, y: 7 } }
  ],
  warps: [{ x: 15, y: 27, to: 'world', tx: 40, ty: 49, name: '町の外へ' }, { x: 16, y: 27, to: 'world', tx: 40, ty: 49, name: '町の外へ' }],
  chests: [{ id: 'rivel1', x: 29, y: 1, item: 'potion', qty: 1 }],
  npcs: [
    { id: 'rivel_guard1', x: 14, y: 6, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say('城門の衛兵', ['ここはリヴェル城。王はいつでも「波を読む者」との謁見を望んでおられる。中へどうぞ。']); } },
    { id: 'rivel_guard2', x: 17, y: 6, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say('城門の衛兵', ['城下町では武器屋・道具屋・教会・ギルドが西側、防具屋・宿屋・酒場・銀行が東側だ。']); } },
    { id: 'rivel_woman', x: 13, y: 13, sprite: 'villager_f', dir: 'down', wander: 2, talk: async function (c) { await c.say('町の女性', ['噴水の広場は町の自慢よ。看板を見れば、どの建物が何の店かすぐわかるわ。', '酒場では旅の仲間が待っているって聞いたわ。']); } },
    { id: 'rivel_man', x: 18, y: 19, sprite: 'villager_m', dir: 'down', wander: 2, talk: async function (c) { await c.say('町の男', ['北のエマール山道には山賊が出る。頭目のガロンはやたら強いらしい。', '銀行にゴールドを預けておけば、全滅しても減らないぞ。']); } },
    { id: 'rivel_child', x: 19, y: 12, sprite: 'child', dir: 'down', wander: 2, talk: async function (c) { await c.say('城下町の子ども', ['王様はね、むかし「相場の勇者」と一緒に魔王をふうじこめたんだって！']); } },
    { id: 'rivel_merchant', x: 12, y: 24, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('露店の商人', ['新鮮な果物はいかが？ ……と言いたいが、売り物は道具屋に卸してしまったよ。', '武器屋の主人は腕のいい鍛冶屋だ。鉄の剣なら間違いない。']); } },
    { id: 'rivel_scholar', x: 21, y: 26, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('学者', ['均衡のクリスタルは大陸に10個あったと記録にある。欲望と恐怖の魔物が増えたのは、それが砕けてからだ。', 'ダウの村の師匠ハケイは、波形を読む術を極めた人物だ。彼に会えば「波形剣士」の道も開けるだろう。']); } },
    { id: 'rivel_traveler', x: 27, y: 15, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('旅人', ['宿屋の前で一息ついてるところさ。この町の宿は少し高いが、ベッドが柔らかい。']); } }
  ],
  events: [{ x: 3, y: 26, type: 'inspect', text: ['【立て札】リヴェル城下町\n北：リヴェル城\n西側：武器屋・道具屋・教会・冒険者ギルド\n東側：防具屋・宿屋・酒場・銀行'] }]
  });

  shopInterior('rivel_weapon_shop', '武器屋', 'rivel_town', 4, 10, 'merchant', 'weapon', ['wooden_sword', 'copper_sword', 'iron_sword', 'dagger', 'bronze_dagger', 'spear', 'hand_axe', 'short_bow', 'oak_staff', 'mage_staff', 'club', 'leather_claw'], ['いらっしゃい。職業によって持てる武器が違うから、よく見て選ぶんだぞ。']);
  shopInterior('rivel_armor_shop', '防具屋', 'rivel_town', 26, 10, 'merchant', 'armor', ['cloth', 'leather_armor', 'chain_mail', 'robe', 'wooden_shield', 'iron_shield', 'leather_cap', 'feather_hat', 'iron_helm', 'ring_guard', 'amulet_life'], ['防具は命を守る。ケチると後悔するよ。']);
  shopInterior('rivel_item_shop', '道具屋', 'rivel_town', 4, 15, 'merchant', 'item', ['herb', 'potion', 'ether', 'antidote', 'wake_bell', 'calm_water', 'bomb', 'escape_wing', 'tent'], ['冒険の必需品、そろえてるよ。']);
  innInterior('rivel_inn', 'リヴェルの宿屋', 'rivel_town', 26, 15, 20);
  churchInterior('rivel_church', 'リヴェル教会', 'rivel_town', 4, 21);

  // 酒場（仲間の加入・入れ替え）
  add({ id: 'rivel_tavern', name: 'リヴェルの酒場', kind: 'interior', bgm: 'tavern', rows: [
    '############',
    '#TTTTT_qqq_#',
    '#______q___#',
    '#_t__t__t__#',
    '#__________#',
    '#_t__t__t__#',
    '#__________#',
    '#q________z#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'rivel_town', tx: 26, ty: 20 }],
    npcs: [
      { id: 'rivel_bartender', x: 2, y: 2, sprite: 'bartender', dir: 'down', wander: 0, talk: async function (c) { await c.tavern(); } },
      { id: 'kyle', x: 8, y: 4, sprite: 'kyle', dir: 'left', wander: 0, talk: async function (c) {
        if (c.hasCompanion('kyle')) return;
        if (!c.flag('king_quest1')) { await c.say('カイル', ['俺はカイル、元・王国騎士団だ。……今は訳あって酒場で燻っている。', '王の依頼を受けた者がいれば、手を貸してもいいんだがな。']); return; }
        await c.say('カイル', ['王の依頼を受けたのか。迷いの森は騎士団でも手を焼いた場所だ。', '俺の盾でお前を守らせてくれ。それが俺の、騎士としての落とし前だ。']);
        var a = await c.choice('カイルを仲間にしますか？', ['はい', 'いいえ']);
        if (a === 0) { c.join('kyle'); await c.msg(['カイルが仲間になった！']); }
      } },
      { id: 'seris', x: 8, y: 6, sprite: 'seris', dir: 'left', wander: 0, hidden: true, talk: async function (c) {
        if (c.hasCompanion('seris')) return;
        await c.say('セリス', ['私はセリス。マクディア魔導王国の魔法使いよ。クリスタルの研究をしているの。', '欲望のゴーレムを倒したあなたたちなら、クリスタルの欠片の謎を解けるかもしれない。同行させて。']);
        var a = await c.choice('セリスを仲間にしますか？', ['はい', 'いいえ']);
        if (a === 0) { c.join('seris'); await c.msg(['セリスが仲間になった！']); }
      }, showIf: 'cave_boss' },
      { id: 'tavern_drunk', x: 4, y: 6, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('酔っ払い', ['ヒック……俺は全財産を「一発逆転」に賭けて、スライムにも負けるようになっちまった……', '損切りだけは……ちゃんとしろよ……']); } }
    ] });

  // 冒険者ギルド（転職・クエスト掲示板）
  add({ id: 'rivel_guild', name: '冒険者ギルド', kind: 'interior', bgm: 'town', rows: [
    '############',
    '#KK_TTTT_KK#',
    '#____pp____#',
    '#____pp____#',
    '#_S__pp_II_#',
    '#____pp____#',
    '#_t__pp__t_#',
    '#__________#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'rivel_town', tx: 4, ty: 25 }],
    npcs: [
      { id: 'guild_master', x: 5, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.guild(); } },
      { id: 'guild_board', x: 2, y: 5, sprite: 'guard', dir: 'down', wander: 0, hidden: true }
    ],
    events: [{ x: 2, y: 4, type: 'board' }] });

  // 銀行
  add({ id: 'rivel_bank', name: 'リヴェル銀行', kind: 'interior', bgm: 'town', rows: [
    '############',
    '#I_zz__zz_I#',
    '#_TTTTTTTT_#',
    '#__pppppp__#',
    '#__pppppp__#',
    '#__pppppp__#',
    '#It______tI#',
    '#__________#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'rivel_town', tx: 26, ty: 25 }],
    npcs: [{ id: 'banker', x: 5, y: 1, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.bank(); } }] });

  // リヴェル城
  add({ id: 'rivel_castle', name: 'リヴェル城', kind: 'interior', bgm: 'castle', rows: [
    'CCCCCCCCCCCCCCC',
    'C:::::pppp::::C',
    'C:I:::pppp:::IC',
    'C:::::pppp::::C',
    'C:::::pppp::::C',
    'C:I:::pppp:::IC',
    'C:::::pppp::::C',
    'C:::::pppp::::C',
    'C:I:::pppp:::IC',
    'C:::::pppp::::C',
    'C:::::pppp::::C',
    'C:I:::pppp:::IC',
    'C:::::pppp::::C',
    'CCCCCCCDCCCCCCC'
  ], warps: [{ x: 7, y: 13, to: 'rivel_town', tx: 15, ty: 6 }],
    chests: [{ id: 'castle1', x: 1, y: 1, item: 'ring_power', qty: 1 }, { id: 'castle2', x: 13, y: 1, gold: 200 }],
    npcs: [
      { id: 'king', x: 7, y: 1, sprite: 'king', dir: 'down', wander: 0, talk: async function (c) {
        if (!c.flag('king_quest1')) {
          await c.say('リヴェル王', ['よく来た、「波を読む者」よ。余はリヴェル王。', '均衡のクリスタルが砕けてから、魔物は人の欲望と恐怖を喰らって強くなっておる。東の「迷いの森」には、旅人を惑わす魔物「トレンド迷子」が棲みついた。', '森の奥にはクリスタルの力を宿した古い祠があるという。トレンド迷子を討ち、祠を調べてまいれ。', '森の魔物は「相場の試練」を仕掛けてくる。高値と安値を見失うな。酒場の騎士カイルも力になるだろう。']);
          c.setFlag('king_quest1', true); c.questComplete('main_1'); c.questStart('main_2'); c.addGold(300);
          await c.msg(['支度金として300Gを受け取った！']);
        } else if (!c.flag('forest_boss')) {
          await c.say('リヴェル王', ['迷いの森は城下町の東、ダウの大森林の中にある。森の奥の祠を頼んだぞ。']);
        } else if (!c.flag('king_quest2')) {
          await c.say('リヴェル王', ['トレンド迷子を討ったか！ 見事だ。', 'だが悪い知らせもある。南の「忘却の洞窟」に、クリスタルの欠片を喰らった「欲望のゴーレム」が現れた。洞窟の若者たちが帰ってこぬ。', '欠片を取り戻してくれ。洞窟の封印扉はこの鍵で開く。']);
          c.give('cave_key', 1); c.setFlag('king_quest2', true); c.questComplete('main_2'); c.questStart('main_3');
          await c.msg(['洞窟の鍵を手に入れた！']);
        } else if (!c.flag('cave_boss')) {
          await c.say('リヴェル王', ['忘却の洞窟はポヨ村の南東だ。奥の封印扉は鍵で開く。無理はするな。']);
        } else if (!c.flag('shard_returned')) {
          await c.say('リヴェル王', ['クリスタルの欠片を取り戻したか……！ この輝き、間違いない。', '欠片は他にも9つある。港町マリナの船は今、修理中だが、余の親書があれば優先して直すだろう。これを持っていけ。', '次の欠片はエマール山脈の向こう、時の神殿領にあると伝わる。山道の山賊には気をつけよ。']);
          c.give('royal_letter', 1); c.setFlag('shard_returned', true); c.questComplete('main_3'); c.questStart('main_4'); c.addGold(1000);
          await c.msg(['王の親書と1000Gを受け取った！']);
        } else {
          await c.say('リヴェル王', ['港町マリナで船の修理を頼むのだ。そして北の山道の先に向かえ。……この先は、まだ開拓中の物語だ。']);
        }
      } },
      { id: 'castle_guard_l', x: 4, y: 3, sprite: 'guard', dir: 'right', wander: 0, talk: async function (c) { await c.say('近衛兵', ['王の前では礼儀正しくな。']); } },
      { id: 'castle_guard_r', x: 10, y: 3, sprite: 'guard', dir: 'left', wander: 0, talk: async function (c) { await c.say('近衛兵', ['城の宝箱は冒険者への支援だ。遠慮なく持っていけ、とは王のお言葉だ。']); } },
      { id: 'castle_minister', x: 3, y: 9, sprite: 'scholar', dir: 'down', wander: 1, talk: async function (c) { await c.say('大臣', ['魔物は「欲望」「恐怖」「損失」そのもの。剣だけでは倒せん。相場の試練を切り抜ける知恵が要る。', 'ポヨ村とダウの村の修行場で学ぶがいい。学んだ者だけが就ける職業もあるそうだ。']); } }
    ] });

  /* =========================================================
     ダウの村（森の村・師匠ハケイ）
     ========================================================= */
  add({ id: 'dow_village', name: 'ダウの村', kind: 'town', bgm: 'town', fallback: 'grass', style: 'wood', rows: [
    'FFFFFFFFFFFFFFFFFFFFFF',
    'FffffffffffffffffffffF',
    'Ff.BBBBBB....BBBBB..fF',
    'Ff.BBBBBBPP..BBBBB.,fF',
    'Ff.BBBBBBPP..BBBBB..fF',
    'Ff.f..rrrrrrrrrr..j.fF',
    'FffZ...6.PP..6...Z..fF',
    'Ff.....fyPPy....,...fF',
    'Ff.......PP..BBBBB.ffF',
    'Ff.BBBB..PP..BBBBB..fF',
    'Ff.BBBB..PP..BBBBB..fF',
    'Ff.BBBB..Prrrrrr....fF',
    'Ff...rrrrrP.........fF',
    'Ff......NPP..J......fF',
    'FfS....f.PP.e..qq...fF',
    'Ff..xHHx.PP.........fF',
    'Ff...,...PP.........fF',
    'FFFFFFFFFPPFFFFFFFFFFF'
  ],
  buildings: [
    { id: 'dojo', type: 'dojo', name: '師匠ハケイの修行場', x: 3, y: 2, w: 6, h: 3, doorX: 3, interior: 'dow_dojo', entry: { x: 5, y: 7 } },
    { id: 'weapon', type: 'weapon', name: '森の武器屋', x: 13, y: 2, w: 5, h: 3, doorX: 2, interior: 'dow_weapon_shop', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: 'ダウの村の宿屋', x: 13, y: 8, w: 5, h: 3, doorX: 2, interior: 'dow_inn', entry: { x: 5, y: 7 } },
    { id: 'house', type: 'house', name: '狩人の家', x: 3, y: 9, w: 4, h: 3, doorX: 1, interior: 'dow_house', entry: { x: 5, y: 7 } }
  ],
  warps: [{ x: 9, y: 17, to: 'world', tx: 55, ty: 71, name: '村の外へ' }, { x: 10, y: 17, to: 'world', tx: 55, ty: 71, name: '村の外へ' }],
  chests: [{ id: 'dow1', x: 19, y: 15, item: 'ether', qty: 2 }],
  npcs: [
    { id: 'dow_hunter', x: 12, y: 13, sprite: 'villager_m', dir: 'down', wander: 2, talk: async function (c) { await c.say('狩人', ['この村は森の民の村だ。師匠ハケイは北西の家にいる。', '迷いの森で「トレンド迷子」を見た。あいつに惑わされると、上下がわからなくなるんだ。']); } },
    { id: 'mina', x: 4, y: 13, sprite: 'mina', dir: 'down', wander: 1, talk: async function (c) {
      if (c.hasCompanion('mina')) return;
      if (!c.flag('forest_boss')) { await c.say('ミナ', ['あたしはミナ。森の宝を探してるんだけど、トレンド迷子が邪魔で奥に行けないのよね。']); return; }
      await c.say('ミナ', ['トレンド迷子を倒したの!? すごいじゃない！', 'あたし、盗賊のミナ。宝箱を開けるのと逃げ足には自信があるの。あんたたちについていけば、お宝にありつけそう。仲間にしてよ！']);
      var a = await c.choice('ミナを仲間にしますか？', ['はい', 'いいえ']);
      if (a === 0) { c.join('mina'); await c.msg(['ミナが仲間になった！']); }
    } },
    { id: 'dow_elder_f', x: 17, y: 13, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('村のおばあさん', ['森の恵みで暮らす村じゃよ。倒木や根っこに足を取られぬようにな。', '昔は迷いの森の祠に、みんなでお参りしたものじゃ。']); } }
  ],
  events: [{ x: 2, y: 14, type: 'inspect', text: ['【立て札】ダウの村\n北西：師匠ハケイの修行場　北東：武器屋\n東：宿屋　西：狩人の家'] }]
  });
  add({ id: 'dow_house', name: '狩人の家', kind: 'interior', bgm: 'town', rows: [
    '############', '#E___K_qq__#', '#__________#', '#__t_______#', '#________z_#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'dow_village', tx: 4, ty: 12 }],
    npcs: [{ id: 'hunter_boy', x: 7, y: 4, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('狩人の息子', ['父さんは弓の名人なんだ。ぼくも森の武器屋で弓を買ってもらうんだ！']); } }] });

  add({ id: 'dow_dojo', name: '師匠ハケイの修行場', kind: 'interior', bgm: 'town', rows: [
    '############',
    '#KKKKKKKKKK#',
    '#__________#',
    '#__________#',
    '#_t______t_#',
    '#__________#',
    '#__________#',
    '#__________#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'dow_village', tx: 6, ty: 5 }],
    npcs: [
      { id: 'master_hakei2', x: 5, y: 2, sprite: 'master', dir: 'down', wander: 0, talk: async function (c) { await c.dojo('dow'); } },
      { id: 'lucia', x: 9, y: 5, sprite: 'lucia', dir: 'left', wander: 0, talk: async function (c) {
        if (c.hasCompanion('lucia')) return;
        if (!c.flag('learned_dow') || !c.flag('learned_ema')) { await c.say('ルシア', ['私はルシア。師匠の一番弟子……のつもり。', '波形と移動平均の教えを修めた人となら、一緒に旅をしてもいい。']); return; }
        await c.say('ルシア', ['あなた、師匠の教えを二つも修めたのね。', '私は「波を読む力」をもっと高めたい。一緒に行かせて。']);
        var a = await c.choice('ルシアを仲間にしますか？', ['はい', 'いいえ']);
        if (a === 0) { c.join('lucia'); await c.msg(['ルシアが仲間になった！']); }
      } }
    ] });
  shopInterior('dow_weapon_shop', '森の武器屋', 'dow_village', 15, 5, 'merchant', 'weapon', ['copper_sword', 'iron_sword', 'bronze_dagger', 'spear', 'hunter_bow', 'iron_club', 'iron_claw', 'leather_armor', 'scale_armor', 'feather_hat'], ['森の狩人御用達。弓と爪が自慢だ。']);
  innInterior('dow_inn', 'ダウの村の宿屋', 'dow_village', 15, 11, 15);

  /* =========================================================
     港町マリナ
     ========================================================= */
  add({ id: 'harbor_town', name: '港町マリナ', kind: 'town', bgm: 'town', fallback: 'grass', style: 'harbor', rows: [
    '............==............',
    '..BBBBBB....==..BBBBBB....',
    '..BBBBBB...y==y.BBBBBB....',
    '..BBBBBB....==..BBBBBB.xa.',
    '.....===============...x..',
    '............==.........x..',
    '..BBBBB..BBB==..BBBBB.....',
    '..BBBBB..BBB==..BBBBB.....',
    '..BBBBB..BBB==..BBBBB.....',
    '....===============.......',
    '...........y==y...........',
    '...AAA..qq..==...zz.AA....',
    'ssssssssssssddssssssssssss',
    'ssssssssssssddssssssssssss',
    'wwwwwwwwwwwwddwwwwwwwwwwww',
    'wwwwwwwwwwwwddwwwwwwwwwwww',
    '~~~~~~~~~~~~dd~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~'
  ],
  buildings: [
    { id: 'inn', type: 'inn', name: 'マリナの宿屋', x: 2, y: 1, w: 6, h: 3, doorX: 3, interior: 'harbor_inn', entry: { x: 5, y: 7 } },
    { id: 'tavern', type: 'tavern', name: 'マリナの酒場', x: 16, y: 1, w: 6, h: 3, doorX: 3, interior: 'harbor_tavern', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '港の道具屋', x: 2, y: 6, w: 5, h: 3, doorX: 2, interior: 'harbor_item_shop', entry: { x: 5, y: 7 } },
    { id: 'house', type: 'house', name: '漁師の家', x: 9, y: 6, w: 3, h: 3, doorX: 1, interior: 'harbor_house', entry: { x: 5, y: 7 } },
    { id: 'warehouse', type: 'warehouse', name: '港の倉庫', x: 16, y: 6, w: 5, h: 3, doorX: 2, interior: 'harbor_warehouse', entry: { x: 5, y: 7 } },
    { id: 'ship', type: 'ship', name: '修理中の船', x: 5, y: 14, w: 5, h: 2, doorX: 2 }
  ],
  warps: [{ x: 12, y: 0, to: 'world', tx: 22, ty: 71, name: '町の外へ' }, { x: 13, y: 0, to: 'world', tx: 22, ty: 71, name: '町の外へ' }],
  chests: [{ id: 'harbor1', x: 24, y: 10, item: 'ring_speed', qty: 1 }],
  npcs: [
    { id: 'sailor', x: 12, y: 13, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) {
      if (c.has('royal_letter')) await c.say('船乗り', ['王の親書だって!? こりゃ急がねえと。……だが正直に言うと、帆も舵も壊れてて、直すには時の神殿領の部品が要る。', '山道を越えて部品を持ってきてくれたら、この船で海を渡れる。（※この先の物語は今後の更新で追加予定）']);
      else await c.say('船乗り', ['船は嵐でやられちまってな。修理には時間がかかる。王様の口添えでもあれば別だが。']); } },
    { id: 'harbor_fisher', x: 7, y: 10, sprite: 'villager_m', dir: 'down', wander: 2, talk: async function (c) { await c.say('漁師', ['海の向こうには砂漠の国や魔導王国があるって話だ。', '波を読むのは漁師も同じさ。大きな波（上位足）を見ずに小舟（5分足）だけ見てたら沈んじまう。']); } },
    { id: 'harbor_vendor', x: 4, y: 10, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { await c.say('市場の女', ['朝獲れの魚だよ！ ……冒険者さんには道具屋のほうが役に立つかもね。']); } },
    { id: 'harbor_guard', x: 11, y: 1, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say('港の衛兵', ['港町マリナへようこそ。北の道はポヨ村へ続いている。']); } }
  ],
  events: [{ x: 2, y: 12, type: 'inspect', text: ['【立て札】港町マリナ\n北西：宿屋　北東：酒場\n西：道具屋　東：倉庫　南：桟橋と市場'] }]
  });
  add({ id: 'harbor_house', name: '漁師の家', kind: 'interior', bgm: 'town', rows: [
    '############', '#E___K_____#', '#______qq__#', '#__t_______#', '#__________#', '#_z________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'harbor_town', tx: 10, ty: 9 }],
    npcs: [{ id: 'fisher_wife', x: 7, y: 4, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('漁師の妻', ['夫は海ばかり見ているわ。「潮の流れを読めない者は沖に出るな」が口癖なの。']); } }] });
  add({ id: 'harbor_warehouse', name: '港の倉庫', kind: 'interior', bgm: 'town', rows: [
    '############', '#zzz__qq_zz#', '#zz______qq#', '#__________#', '#_qq___zz__#', '#__________#', '#zz_____qqq#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'harbor_town', tx: 18, ty: 9 }],
    chests: [{ id: 'wh1', x: 5, y: 1, item: 'hi_potion', qty: 1 }],
    npcs: [{ id: 'warehouse_man', x: 6, y: 4, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('倉庫番', ['船が直ったら、この荷物を全部積み込むんだ。', '奥の箱は勝手に開けるなよ……って、冒険者には言っても無駄か。']); } }] });

  shopInterior('harbor_item_shop', '港の道具屋', 'harbor_town', 4, 9, 'merchant', 'item', ['herb', 'potion', 'hi_potion', 'ether', 'antidote', 'calm_water', 'phoenix_feather', 'bomb', 'escape_wing', 'tent'], ['船乗り相手の商売だ。品揃えは自慢だよ。']);
  innInterior('harbor_inn', 'マリナの宿屋', 'harbor_town', 5, 4, 25);
  add({ id: 'harbor_tavern', name: 'マリナの酒場', kind: 'interior', bgm: 'tavern', rows: [
    '############',
    '#TTTTT_____#',
    '#__________#',
    '#_t__t__t__#',
    '#__________#',
    '#_t__t__t__#',
    '#__________#',
    '#__________#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'harbor_town', tx: 19, ty: 4 }],
    npcs: [
      { id: 'harbor_bartender', x: 2, y: 2, sprite: 'bartender', dir: 'down', wander: 0, talk: async function (c) { await c.tavern(); } },
      { id: 'gald', x: 8, y: 4, sprite: 'gald', dir: 'left', wander: 0, talk: async function (c) {
        if (c.hasCompanion('gald')) return;
        await c.say('ガルド', ['俺はガルド。傭兵だ。……船が動かねえから、ここで飲んだくれてる。', '報酬は要らねえ。魔物と戦えるなら、それでいい。仲間に入れてくれ。']);
        var a = await c.choice('ガルドを仲間にしますか？', ['はい', 'いいえ']);
        if (a === 0) { c.join('gald'); await c.msg(['ガルドが仲間になった！']); }
      } }
    ] });

})(typeof window !== 'undefined' ? window : globalThis);
