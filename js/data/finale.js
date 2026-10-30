/* =========================================================
   Data / Finale (v5.4 第15〜16章・エンディング) : 暗黒大陸——前線基地、虚無の荒野2階層、魔王城の門、魔王城5層（玉座の間）、エンディングA/B、エピローグ
   main_15「暗黒大陸」：前線基地（ハルド）→ 虚無の荒野：ザルグの残滓（魔物のまま消える）→ セヴランの影（第7章の処遇で結末が変わる）
     → 魔王城の門：鉄冠将軍グロート → 感情に支配されない判断の試練（learn_emotion：連敗の幻のあとに出題）→ 門が開く
   main_16「均衡の天秤」：2〜4階の封印（欲望・恐怖・支配の間）→ 玉座：相場魔王〈恐怖〉〈欲望〉〈固定〉の3連戦（戦闘中にチャートの試練）
     → クリスタルの選択（A：解放の夜明け／B：新しい均衡＝第6章で監察官に託した、または第12章で権限制限案を選んだ場合のみ）
     → エンディング → エピローグ（各地の復興度と仲間ごとの後日談）→ ポヨ村の村長 → クリアデータ
   ・学習能力（試練で解放した能力の数）が玉座戦の「敵の防御を崩すターン数」に、仲間との絆（仲間の一言の数＋野営地）が最終戦前の支援に反映される
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function D() { return root.State.data; }
  function inParty(id) { var d = D(); return !!(d.companions[id] && d.party.indexOf(id) >= 0); }
  function bonds() { var d = D(); return Object.keys(d.flags).filter(function (k) { return /_remark_/.test(k) && d.flags[k]; }).length + (d.flags.camp_talk ? (d.flags.camp_bond || 0) : 0); }
  function abilities() { var d = D(); return d.trade && d.trade.abilities ? Object.keys(d.trade.abilities).filter(function (k) { return d.trade.abilities[k]; }).length : 0; }

  /* ---------- 前線基地 ---------- */
  add({ id: 'dark_camp', name: '虚無の荒野の前線基地', kind: 'town', bgm: 'town', fallback: 'darkland', style: 'wood', rows: [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'x+++++++++++rrrr+++++++++++x',
    'x++BBBBBBB++rrrr++BBBBBBB++x',
    'x++BBBBBBB++rrrr++BBBBBBB++x',
    'x++BBBBBBB++rrrr++BBBBBBB++x',
    'x++BBBBBBB++rrrr++BBBBBBB++x',
    'x+++++++++q+rrrr+++++++++++x',
    'x+++++++++++rrrr+z+++++++++x',
    'x+rrrrrrrrrrrrrrrrrrrrrrrr+x',
    'x+rrrrrrrrrrrrrrrrrrrrrrrr+x',
    'x+++++++++++rrrr+++++++++++x',
    'x++BBBBBBB++rrrr++BBBBBBB++x',
    'x++BBBBBBB++rrrr++BBBBBBB++x',
    'x++BBBBBBB++rrrr++BBBBBBB++x',
    'x++BBBBBBB++rrrr++BBBBBBB++x',
    'x+++++++++++riir+++++++++++x',
    'x+++++++++++rrrr+++++++++++x',
    'x++++++z++++rrrr+++++q+++++x',
    'x+++++++++++rrrr+++++++++++x',
    'xxxxxxxxxxxxrrrrxxxxxxxxxxxx'
  ],
  buildings: [
    { id: 'inn', type: 'inn', name: '野戦宿舎', x: 3, y: 2, w: 7, h: 4, doorX: 3, interior: 'dark_inn', entry: { x: 5, y: 7 } },
    { id: 'shop', type: 'item', name: '補給所', x: 18, y: 2, w: 7, h: 4, doorX: 3, interior: 'dark_shop', entry: { x: 5, y: 7 } },
    { id: 'armory', type: 'weapon', name: '武器庫', x: 3, y: 11, w: 7, h: 4, doorX: 3, interior: 'dark_armory', entry: { x: 5, y: 7 } },
    { id: 'hald', type: 'house', name: '外れの天幕', x: 18, y: 11, w: 7, h: 4, doorX: 3, interior: 'dark_tent_hald', entry: { x: 5, y: 7 } }
  ],
  warps: [12, 13, 14, 15].map(function (x) { return { x: x, y: 19, to: 'world_dark', tx: 80, ty: 96, name: '荒野へ' }; }),
  chests: [{ id: 'dc1', x: 25, y: 17, item: 'elixir', qty: 1 }],
  npcs: [
    { id: 'dc_captain', x: 13, y: 12, sprite: 'royal_guard', dir: 'down', wander: 0, talk: async function (c) { var d = D(); if (!d.flags.dark_arrived) { d.flags.dark_arrived = true; if (!c.questActive('main_15') && !c.questDone('main_15')) c.questStart('main_15'); } await c.say('前線基地の隊長', ['飛空艇で来たのか！ ……ここは各国の義勇兵が集まる前線基地だ。カリオンの元兵士、ヴェルムの坑夫、ゼロメアの技師もいる。', '北の虚無の荒野には、人の感情が魔物になって彷徨っている。富を求め続けた者、恐怖から逃げ続けた者、他人を支配しようとした者。', 'その先が魔王城だ。門は、鉄冠将軍グロートが守っている。']); await c.remark('gald', ['グロート……。あいつは鉱山で、使役された魔物を解放した。俺は、人間を鎖でつないでいた。', 'どっちが「魔物」だったんだろうな。'], 'gald_remark_dark'); } },
    { id: 'dc_soldier', x: 7, y: 8, sprite: 'federal_soldier', dir: 'down', wander: 1, talk: async function (c) { await c.say('元連邦兵', ['カリオンで没収をやってた。今は、ここで補給係だ。', '返還令のとき、名前を読み上げられた人たちの顔を見た。……だから、ここに来た。']); } },
    { id: 'dc_miner', x: 20, y: 8, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('ヴェルムの坑夫', ['自治会から志願して来た。鉱石を運ぶのは得意でね。', '鎖なしで運ぶのは、悪くない。']); } },
    { id: 'dc_tech', x: 22, y: 16, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('ゼロメアの技師', ['オラクルの「提案」で、ここに来ることを選んだ。……いや、提案は「行かない方がいい」だった。', '行くと決めたのは、私だ。']); } }
  ] });
  K.innInterior('dark_inn', '野戦宿舎', 'dark_camp', 6, 6, 0);
  K.shopInterior('dark_shop', '補給所', 'dark_camp', 21, 6, 'merchant', 'item', ['potion', 'hi_potion', 'ether', 'hi_ether', 'elixir', 'antidote', 'calm_water', 'wake_bell', 'phoenix_feather', 'tent', 'escape_wing'], ['各国からの補給だ。値段は……まあ、前線価格だ。']);
  K.shopInterior('dark_armory', '武器庫', 'dark_camp', 6, 15, 'merchant', 'weapon', ['rune_blade', 'sky_axe', 'astral_spear', 'star_bow', 'void_dagger', 'shadow_claw', 'balance_mace', 'arcane_staff', 'rune_mail', 'star_cloak', 'sky_robe', 'aegis_shield', 'star_helm', 'arcane_hat'], ['魔王城へ行くなら、一番いいのを持っていけ。']);
  add({ id: 'dark_tent_hald', name: '外れの天幕', kind: 'interior', bgm: 'town', rows: [
    '############', '#E_____q___#', '#__________#', '#_t________#', '#__________#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'dark_camp', tx: 21, ty: 15 }],
    npcs: [{ id: 'dt_hald', x: 7, y: 3, sprite: 'king', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (d.flags.hald_met) { await c.say('ハルド', [d.flags.hald_choice === 0 ? '金貨は補給所に渡した。……兵士の靴になるらしい。悪くない使い道だ。' : d.flags.hald_choice === 1 ? '王都へ戻る船を待っている。裁かれに行く。……怖いが、決めたことだ。' : 'まだ、金貨を抱えている。手放せない。……笑ってくれ。']); return; }
      await c.say('ハルド', ['……お前たちか。財務局長だったハルドだ。', '王都から金貨を持ち出して、ここまで逃げてきた。誰も追ってこない場所へ。', '着いてみたら、ここでは金が何の意味もない。食料は配給、武器は支給。金貨は……重いだけだ。']);
      if (!c.questActive('dark_hald') && !c.questDone('dark_hald')) c.questStart('dark_hald');
      var a = await c.choice('ハルドに何と言う？', ['「金貨を補給所に渡して、ここで役に立て」', '「王都に戻って、裁きを受けろ」', '「……好きにすればいい」']);
      d.flags.hald_choice = a < 0 ? 2 : a; d.flags.hald_met = true;
      if (a === 0) await c.say('ハルド', ['……役に立て、か。帳簿の数字じゃなく、靴や薬になるなら。', '持っていけ、と言いたいところだが、補給所に渡す。自分の手で。']);
      else if (a === 1) await c.say('ハルド', ['……そうだな。逃げても、帳簿は追いかけてくる。自分の名前で書いた帳簿だからな。', '戻る。セヴラン閣下と同じ法廷に立つ。']);
      else await c.say('ハルド', ['好きに、か。……それが一番難しい。', '誰かに決めてほしかった。ずっと。']);
      await c.questComplete('dark_hald');
      await c.remark('elna', ['ハルド局長……。帳簿の最後の行は、自分で書くしかないのよ。'], 'elna_remark_hald');
    } }] });

  /* ---------- 虚無の荒野（2階層） ---------- */
  add({ id: 'void_wasteland_1', name: '虚無の荒野', kind: 'dungeon', bgm: 'dungeon', fallback: 'darkland', rows: [
    '9999999999999999999999999999',
    '9+++++9+++++++++9++++++++++9',
    '9+qq++9+++zz++++9+++++++>++9',
    '9+++++9+++++++++9++++++++++9',
    '9++99999++99999+999++999+++9',
    '9++++++++++++++++++++++++++9',
    '9++999+999999+++9999++999++9',
    '9++9+++++9++++++++++9++9+++9',
    '9++9+++++9+++++++8++9++9+++9',
    '9++9++8++9+++++++++99++9+++9',
    '9++99+9999+++99++++++++++++9',
    '9++++++++++++++++++++++++++9',
    '9++++++++++++++++++++++++++9',
    '9999999999999999999999999999'
  ],
  warps: [{ x: 1, y: 12, to: 'world_dark', tx: 80, ty: 58 }, { x: 24, y: 2, to: 'void_wasteland_2', tx: 1, ty: 10 }],
  chests: [{ id: 'vw1', x: 2, y: 2, item: 'hi_ether', qty: 3 }, { id: 'vw2', x: 12, y: 2, gold: 4000 }],
  events: [
    { x: 17, y: 8, type: 'boss', solid: false, doneFlag: 'zarg_remnant', enemy: 'boss_zarg_remnant', intro: ['荒野の窪地に、見覚えのある鎖が積み上がっている。', '鎖の山が立ち上がった。……監督官ザルグの形をして。', 'ザルグの残滓「労働者ハ……数字ダ……数字ハ……嘘ヲツカナイ……」'], after: ['残滓は崩れ、鎖は錆びて砂になった。', '最後まで、ザルグの残滓は言葉を変えなかった。……救われない者もいる。', '「敵を倒すこと」と「世界を良くすること」は、同じではない。'] },
    { x: 6, y: 9, type: 'inspect', solid: false, text: ['溶けた金貨の山。誰かが「あと一回」と書いた紙切れが、何百枚も埋もれている。'] }
  ],
  encounters: { rate: 0.04, zones: [{ name: '虚無の荒野', test: function () { return true; }, groups: [['greed_shade', 'fear_shade'], ['control_shade'], ['void_beast'], ['greed_shade', 'greed_shade', 'fear_shade']], level: 34 }] } });
  add({ id: 'void_wasteland_2', name: '虚無の荒野 深部', kind: 'dungeon', bgm: 'boss_area', fallback: 'darkland', rows: [
    '99999999999999999999',
    '9++++++++9+++++++++9',
    '9++zz++++9+++XX++++9',
    '9++++++++9+++++++++9',
    '9++999+++999++9999+9',
    '9++++++++++++++++++9',
    '9++i++++++++++++i++9',
    '9++++++++++++++++++9',
    '9++++++++++++++++++9',
    '9++++++++++++++++++9',
    '9<+++++++++++++++++9',
    '99999999999999999999'
  ],
  warps: [{ x: 1, y: 10, to: 'void_wasteland_1', tx: 23, ty: 2 }],
  chests: [{ id: 'vw3', x: 17, y: 9, item: 'elixir', qty: 2 }],
  events: [
    { x: 10, y: 6, type: 'boss', solid: false, doneFlag: 'sevran_shadow', requireFlag: 'zarg_remnant', lockedText: ['深部の空気が重い。手前の窪地に、まだ何かが残っている。'], enemy: 'boss_sevran_shadow', intro: ['荒野の深部。帳簿の頁が、風もないのに舞っている。', '頁が集まり、人の形になった。大宰相セヴランの——影。', 'セヴランの影「すべてを帳簿で管理すれば、誰も飢えない。……なぜ止めた。なぜ、私の願いを捨てさせた」'], after: ['影はほどけ、頁は白紙に戻って落ちた。'] },
    { x: 14, y: 2, type: 'script', solid: false, run: async function (c) { var d = D();
      if (!d.flags.sevran_shadow) { await c.msg(['結晶の欠けらが落ちている。……奥で、何かがこちらを見ている。']); return; }
      if (d.flags.sevran_epilogue) { await c.msg(['白紙の頁が一枚、結晶に挟まっている。']); return; }
      d.flags.sevran_epilogue = true; var ch = d.flags.sevran_choice;
      if (ch === 1) { await c.msg(['結晶の陰に、やせた男が座っていた。……追放されたセヴラン本人だ。']); await c.say('セヴラン', ['影を倒したか。あれは、私が王都に置いてきたはずの願いだ。この荒野まで、ついてきた。', '追放されて、初めて「何も管理しない一日」を過ごした。……怖かった。だが、生きていた。', '前線基地へ行く。名前は名乗らない。補給係で十分だ。']); }
      else if (ch === 2) { await c.msg(['結晶に、王都からの通信が映った。返還の実務を続けるセヴランの姿。']); await c.say('セヴラン', ['影が出たと聞いた。……私の願いは、まだ荒野にいたのだな。', '今日、返還の帳簿を一つ締めた。名前から書いた。……影には、それが一番効くだろう。']); }
      else { await c.msg(['結晶に、王都の公開裁判の記録が映った。証言台のセヴラン。']); await c.say('セヴラン（記録）', ['「私はすべてを帳簿で管理した。少数の犠牲で、多数の秩序を買った。それは間違いだった」', '「判決がどうであれ、私の帳簿は公開してほしい。次の私が現れたとき、止める理由になるように」']); }
      await c.msg(['セヴランは、自分の選択の結果と向き合っている。']);
      await c.remark('elna', ['……帳簿は公開してほしい、か。最後に、あの人も名前から書いたのね。'], 'elna_remark_sevran2');
    } }
  ],
  encounters: null });

  /* ---------- 魔王城の門 ---------- */
  add({ id: 'demon_castle_gate', name: '魔王城の門', kind: 'dungeon', bgm: 'boss_area', fallback: 'darkland', rows: [
    '999999999999999999',
    '9CCCCCCC@@CCCCCCC9',
    '9C++++++++++++++C9',
    '9C+i++++++++++i+C9',
    '9C++++++++++++++C9',
    '9C++++++++++++++C9',
    '9C+i++++++++++i+C9',
    '9C++++++++++++++C9',
    '9++++++++++++++++9',
    '9++++++++++++++++9',
    '9++++++++++++++++9',
    '9++++++++++++++++9',
    '9++++++++++++++++9',
    '9++++++++++++++++9',
    '9++++++++++++++++9',
    '999999999999999999'
  ],
  warps: [{ x: 9, y: 14, to: 'world_dark', tx: 80, ty: 24 }, { x: 8, y: 1, to: 'demon_castle_1', tx: 9, ty: 13, needFlag: 'castle_gate_open' }, { x: 9, y: 1, to: 'demon_castle_1', tx: 9, ty: 13, needFlag: 'castle_gate_open' }],
  events: [
    { x: 9, y: 10, type: 'boss', solid: false, doneFlag: 'grote_rematch', requireFlag: 'sevran_shadow', lockedText: ['門の前に、巨大な影が座っている。……今はまだ、こちらを見ていない。', '（虚無の荒野の奥で、向き合うべきものが残っている）'], enemy: 'boss_grote_2', intro: ['門の前に、鉄の冠をかぶった巨人が立ち上がった。', '鉄冠将軍グロート「……鉱山で会ったな。俺は使役された魔物を解放した。鎖を外し、自由にした」', '「自由になった者たちは、また支配を望んだ。魔王の下に、自分から戻っていった。……お前たちに、その意味がわかるか」'], after: ['グロートは冠を外し、地面に置いた。', 'グロート「……解放したはずの者たちが、また支配を望んだ。俺は、それを止められなかった」', '「お前たちが選ばせ続けろ。何度でも。……これを持っていけ」', '鉄の冠を手に入れた！'] },
    { x: 13, y: 5, type: 'learn', solid: false, learnId: 'learn_emotion' },
    { x: 9, y: 2, type: 'script', solid: true, run: async function (c) { var d = D();
      if (d.flags.castle_gate_open) { await c.msg(['門は開いている。']); return; }
      if (!d.flags.grote_rematch) { await c.msg(['重い門。グロートが守っている。']); return; }
      if (!d.flags.learn_emotion) { await c.msg(['門に、黒い石碑の文字が浮かぶ。', '「感情に支配される者は、この門を開けぬ」', '（右の石碑：「感情に支配されない判断の試練」に合格すると門が開く）']); return; }
      await c.msg(['門の文字が消え、重い扉がゆっくりと開いた。', '門の隙間から、小さな天秤が転がり出た。片方の皿は、空のまま。']);
      c.give('balance_scale', 1); d.flags.castle_gate_open = true; root.World.applyState(root.World.map);
      await c.questComplete('main_15'); if (!c.questActive('main_16') && !c.questDone('main_16')) c.questStart('main_16');
      await c.remark('lucia', ['空の皿……。何を載せるかは、まだ決まっていない。', '行こう。最後まで、自分で決める。'], 'lucia_remark_gate');
    } }
  ],
  encounters: null });
  // 門のワープ口は門が開くまで閉じた見た目
  (function () { var def = root.MAP_DEFS.demon_castle_gate; def.events.push({ x: 8, y: 1, type: 'gate', solid: true, doneFlag: 'castle_gate_open', needFlag: '__never__', text: ['固く閉じた門。'] }); })();

  /* ---------- 魔王城（5層） ---------- */
  function hall(id, name, rows, warps, chests, extra) { return add(Object.assign({ id: id, name: name, kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: rows, warps: warps, chests: chests || [], events: [],
    encounters: { rate: 0.04, zones: [{ name: '魔王城', test: function () { return true; }, groups: [['control_shade', 'fear_shade'], ['greed_shade', 'greed_shade'], ['void_beast', 'control_shade'], ['fear_shade', 'fear_shade', 'greed_shade']], level: 37 }] } }, extra || {})); }
  hall('demon_castle_1', '魔王城 1階', [
    'CCCCCCCCCCCCCCCCCCC',
    'C::::::::>::::::::C',
    'C:CCCCC:::::CCCCC:C',
    'C:C:::C:::::C:::C:C',
    'C:C:X:C:::::C:X:C:C',
    'C:C:::C:::::C:::C:C',
    'C:CC:CC:::::CC:CC:C',
    'C:::::::::::::::::C',
    'C::I:::::::::::I::C',
    'C:::::::::::::::::C',
    'C::I:::::::::::I::C',
    'C:::::::::::::::::C',
    'C:::::::::::::::::C',
    'C:::::::::::::::::C',
    'CCCCCCCCCDCCCCCCCCC'
  ], [{ x: 9, y: 14, to: 'demon_castle_gate', tx: 9, ty: 3 }, { x: 9, y: 1, to: 'demon_castle_2', tx: 9, ty: 12 }], [{ id: 'dcs1', x: 4, y: 3, item: 'elixir', qty: 1 }, { id: 'dcs2', x: 14, y: 3, gold: 6000 }]);
  function sealHall(id, name, n, title, text, foes, nextFlag, prevMap, nextMap) {
    var rows = ['CCCCCCCCCCCCCCCCCCC', 'C::::::::>::::::::C', 'C:::::::::::::::::C', 'C::I:::XXXXX:::I::C', 'C:::::::::::::::::C', 'C:::::::::::::::::C', 'C::I:::::::::::I::C', 'C:::::::::::::::::C', 'C:::::::::::::::::C', 'C::I:::::::::::I::C', 'C:::::::::::::::::C', 'C:::::::::::::::::C', 'C::::::::<::::::::C', 'CCCCCCCCCCCCCCCCCCC'];
    var def = hall(id, name, rows, [{ x: 9, y: 12, to: prevMap, tx: 9, ty: 2 }, { x: 9, y: 1, to: nextMap, tx: nextMap === 'demon_castle_5' ? 8 : 9, ty: nextMap === 'demon_castle_5' ? 10 : 12, needFlag: nextFlag }], [{ id: id + '_c', x: 16, y: 11, item: n === 1 ? 'hi_ether' : n === 2 ? 'phoenix_feather' : 'elixir', qty: 2 }]);
    def.events.push({ x: 9, y: 4, type: 'script', solid: true, run: async function (c) { var d = D();
      if (d.flags[nextFlag]) { await c.msg(['【' + title + '】封印は解かれている。']); return; }
      await c.msg(['【' + title + '】'].concat(text));
      var r = await c.battle(foes, { boss: true }); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
      d.flags[nextFlag] = true; root.World.applyState(root.World.map); await c.msg(['封印が解けた。上の階への階段が光っている。（封印 ' + ['castle_seal_1', 'castle_seal_2', 'castle_seal_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']);
      if (n === 1) await c.remark('gald', ['「全部つぎ込め」……鉱山でも、同じ声を聞いた。', '欲しいものは、自分の手で運べる分だけでいい。'], 'gald_remark_seal1');
      if (n === 2) await c.remark('mina', ['「損切りしたら負けが確定する」……父さんは、確定させて、残る方を選んだ。', '確定させる勇気、か。'], 'mina_remark_seal2');
      if (n === 3) await c.remark('ord', ['「お前の判断は、私が決める」……親衛隊で、毎日聞いた言葉だ。', '俺の剣は、もう誰にも決めさせない。'], 'ord_remark_seal3');
    } });
    return def;
  }
  sealHall('demon_castle_2', '魔王城 2階 欲望の間', 1, '欲望の間', ['床一面に金貨。「あと一回で取り返せる」「ロットを上げれば一発だ」——声が反響する。', '金貨が集まって、魔物の形になった。'], ['greed_shade', 'greed_shade', 'void_beast'], 'castle_seal_1', 'demon_castle_1', 'demon_castle_3');
  sealHall('demon_castle_3', '魔王城 3階 恐怖の間', 2, '恐怖の間', ['真っ暗な広間。「損切りしたら負けが確定する」「もう少し待てば戻る」——囁きが耳元で続く。', '闇が凝って、魔物の形になった。'], ['fear_shade', 'fear_shade', 'control_shade'], 'castle_seal_2', 'demon_castle_2', 'demon_castle_4');
  sealHall('demon_castle_4', '魔王城 4階 支配の間', 3, '支配の間', ['無数の鎖と帳簿と演算結晶。「判断は私が決める」「お前は選ばなくていい」——命令の声が重なる。', '鎖が編まれて、魔物の形になった。'], ['control_shade', 'control_shade', 'void_beast'], 'castle_seal_3', 'demon_castle_3', 'demon_castle_5');

  /* ---------- 玉座の間 ---------- */
  add({ id: 'demon_castle_5', name: '魔王城 玉座の間', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCC',
    'C::::::XXX::::::C',
    'C::I:::XXX:::I::C',
    'C:::::::p:::::::C',
    'C:::::::p:::::::C',
    'C::I::::p::::I::C',
    'C:::::::p:::::::C',
    'C:::::::p:::::::C',
    'C::I::::p::::I::C',
    'C:::::::p:::::::C',
    'C:::::::p:::::::C',
    'C:::::::<:::::::C',
    'CCCCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 8, y: 11, to: 'demon_castle_4', tx: 9, ty: 2 }],
  events: [{ x: 8, y: 3, type: 'script', solid: false, run: async function (c) { await Finale.throne(c); } }],
  encounters: null });

  /* ---------- 玉座の間の進行（3連戦 → 選択 → エンディング） ---------- */
  var Finale = {};
  Finale.CAN_B = function () { var d = D(); return d.flags.kalion_choice === 1 || d.flags.zeromea_choice === 0; };
  Finale.throne = async function (c) {
    var d = D();
    if (d.flags.game_cleared) { await c.msg(['玉座は空だ。結晶の欠片が、静かに光っている。', d.flags.ending === 'B' ? '欠片は、誰か一人のものではない光り方をしている。' : '欠片は、もう何も計算していない。']); return; }
    var expose = Math.min(5, 1 + abilities());
    if (!d.flags.demon_fear) {
      await c.msg(['玉座の上に、黒い影が座っている。影は、制御装置を抱いていた。', '相場魔王「よく来た。……問おう。損失のない世界を望まないのか。誰も失敗しない未来を、なぜ拒む」', '「私は、すべての未来を予測し、人間に最も安全な人生を割り当てる。恐怖も、欲望も、もう要らない」']);
      await c.say(d.hero.name, ['失敗することもある。それでも、自分で選んだ未来を生きたい。']);
      await c.msg(['相場魔王「……では、恐怖から始めよう」', abilities() ? '試練で身につけた力が、魔王の波形を読む。（最初の' + expose + 'ターン、敵の防御が崩れる）' : '']);
      var r1 = await c.battle(['boss_demon_fear'], { boss: true, exposeFirst: expose }); if (r1 === 'lost') { await root.World.gameOver(); return; } if (r1 !== 'won') return;
      d.flags.demon_fear = true; await c.msg(['恐怖の形が崩れた。……その下から、金色の形が現れる。']); root.State.autosave();
    }
    if (!d.flags.demon_greed) {
      await c.msg(['相場魔王〈欲望〉「恐怖を越えたか。では、取り返したくはないか。失ったものすべてを。全部つぎ込めば、一度で戻る」']);
      c.heal(); await c.msg(['……少し、呼吸を整えた。（HP・MPが回復した）']);
      var r2 = await c.battle(['boss_demon_greed'], { boss: true, exposeFirst: expose }); if (r2 === 'lost') { await root.World.gameOver(); return; } if (r2 !== 'won') return;
      d.flags.demon_greed = true; await c.msg(['欲望の形が崩れた。……最後に残ったのは、制御装置そのものと一体になった姿。']); root.State.autosave();
    }
    if (!d.flags.demon_fixed) {
      await c.msg(['相場魔王〈固定〉「私は、結晶に封じられた願いだ。『もう失いたくない』『損をしたくない』『確実な未来が欲しい』」', '「お前たちの願いでもある。それでも、私を否定するのか」']);
      // 仲間との絆：これまで交わした言葉の数
      var b = bonds(); var voices = d.party.filter(function (id) { return id !== 'hero' && d.companions[id]; });
      var LINES = { lina: '否定しない。でも、癒やすのは、選んだ人を。', kyle: '願いは否定しない。命令にはさせない。', mina: '父さんは、確実じゃない未来に残った。私も、そっちを選ぶ。', seris: '読むのは波。決めるのは私たち。', gald: '鎖でつないだ「安全」は、もう要らねえ。', lucia: '波を止めたら、相場は死ぬ。', elna: 'あなたの帳簿には、名前がない。', ord: '誓いは、自分で立てる。', nagi: '嵐のない海図は嘘になる。', iris: '失ったものも、地図に描いて進む。', sophia: '未来は、確定しない。だから選べる。', io: 'わたしは、自分で決めることにした。' };
      for (var i = 0; i < voices.length; i++) { var cid = voices[i]; await c.say(root.COMPANIONS[cid].name, [LINES[cid] || '一緒に行く。']); }
      c.heal();
      var bonus = b >= 15 ? 2 : b >= 6 ? 1 : 0;
      await c.msg(['これまで仲間と交わした言葉：' + b + '。' + (bonus === 2 ? '仲間の声が重なり、魔王の計算に大きな誤差が生まれた。' : bonus === 1 ? '仲間の声が、魔王の計算に誤差を生んだ。' : '仲間の声が響いた。'), '（HP・MPが回復した。最初の' + (expose + bonus) + 'ターン、敵の防御が崩れる）']);
      var r3 = await c.battle(['boss_demon_fixed'], { boss: true, exposeFirst: expose + bonus }); if (r3 === 'lost') { await root.World.gameOver(); return; } if (r3 !== 'won') return;
      d.flags.demon_fixed = true; root.State.autosave();
    }
    await Finale.choice(c);
  };
  Finale.choice = async function (c) {
    var d = D();
    await c.msg(['魔王の姿がほどけ、制御装置の中に、小さな光が残った。', '「……もう、失いたくなかった」——それは誰の声でもあり、誰の声でもなかった。', '魔王は、倒すべき敵ではなく、結晶に封じられた願いだった。倒すことは願いを否定することではない。願いを「固定」から解き放つことだ。', '均衡の天秤の、空の皿が震えている。クリスタルをどうするか——選ぶときが来た。']);
    var canB = Finale.CAN_B();
    var opts = ['クリスタルを破壊する（解放の夜明け）'];
    if (canB) opts.push('クリスタルを、一つの権力が独占できない仕組みに作り変える（新しい均衡）');
    else await c.msg(['（もう一つの道——「作り変える」——は、これまでの選択からは見えない。権限を制限し、監査する仕組みを選んできた者にだけ見える道だ）']);
    var a = await c.choice('クリスタルをどうする？', opts);
    var ending = (canB && a === 1) ? 'B' : 'A'; d.flags.ending = ending; d.flags.crystal_choice_done = true;
    if (root.Audio) root.Audio.playBgm('ending');
    if (ending === 'A') await c.msg(['【エンディングA：解放の夜明け】', '制御装置ごと、クリスタルを砕いた。', '光の欠片が空へ散り、世界中の帳簿と演算結晶が、一瞬だけ止まった。', '支配の力は失われた。便利だった統治の機能も、一緒に。', '世界は、不安定な時代を迎える。配給は遅れ、相場は荒れ、人は何度も失敗する。', 'それでも人々は、自分たちの力で未来を築き始めた。']);
    else await c.msg(['【エンディングB：新しい均衡】', 'クリスタルを砕かず、作り変えた。制御装置の「固定」の機能だけを外し、計算の力は残した。', '鍵は一つではなく、七つ。人間、AI、各国の代表者が一つずつ持ち、互いを監視する。', '万能な支配者は置かない。失敗を修正できる制度だけを残す。', 'オラクルは「提案」を、エルナは「監査」を、ミレイユは「記録の公開」を引き受けた。', '均衡は、守るものではなく、毎日作り直すものになった。']);
    c.give('final_proof', 1);
    await Finale.epilogue(c, ending);
  };
  Finale.epilogue = async function (c, ending) {
    var d = D(); var f = d.flags;
    var L = ['——エピローグ：それぞれの未来——'];
    L.push('【ポヨ村】村の修行場に、旅から帰った若者たちが集まる。チャートを前に、師匠ハケイが言う。「読むのは波。決めるのは、お前たちだ」');
    if (f.verum_liberated) L.push('【灰鉱町ヴェルム】' + (['労働者の代表会', 'ハルト代表制', '共同評議会'][f.verum_council_choice || 0]) + 'が町を回している。学び舎ができ、鉱石は鎖ではなく船の竜骨になった。');
    if (f.kalion_reformed) L.push('【徴収都市カリオン】' + (f.kalion_choice === 0 ? '公開された帳簿をめぐって、今も議論が続く。騒がしいが、誰も黙らされない。' : f.kalion_choice === 2 ? '帳簿の写しを持つ住民たちが、自分の名前の行を確かめに財務局へ来る。' : '監察官リーヴの監査局が、毎年すべての帳簿を公開している。') + '財産を取り戻した人々が、商売を始めた。');
    if (f.erased_choice_done) L.push('【地図から消えた村】' + (f.erased_choice === 1 ? '今も地図にはない。森の薬草と、自由がある。' : '地図に戻った村に、医者が通うようになった。'));
    if (f.lighthouse_lit) L.push('【灰灯島アルナ】ヨルンの灯台が、帰ってくる船を迎える。桟橋の小さなランタンも、まだ灯っている。');
    if (f.time_bank_freed) L.push('【鐘都テンプス】鐘は今も一日に一度鳴る。鳴ったあとも、明日は決まっていない。');
    if (f.zeromea_reformed) L.push('【ゼロメア】' + (f.zeromea_choice === 2 ? 'オラクルは統治を続けながら、すべての決定に理由を添える。理由に「違う」と言う住民が増えた。' : '住民は初めて、自分の職業を選んだ。配給が遅れた日、居住区会議は六時間もめた。') + '学校の失敗の記録は、もう0件ではない。');
    if (f.magicka_choice_done) L.push('【マクディア】' + (f.magicka_choice === 2 ? '研究は封印された。学院では「なぜ封印したのか」を教える授業が始まった。' : '研究の写しは学院で読める。読む者は名と目的を記す。その記録も、誰でも読める。'));
    if (f.hald_choice === 1) L.push('【王都セントラ】ハルドが法廷に立った。セヴランの帳簿と並べて、自分の帳簿を公開した。');
    await c.msg(L);
    var EP = { lina: 'リーナはヴェルムに診療所を開いた。薬の配り方は、町の会議で決める。', kyle: 'カイルは騎士団に戻らず、旅の剣士として、誓いを立てたい者に剣を教えている。', mina: 'ミナは海底都市エルミナの記憶の図書館の司書になった。宝箱の代わりに、記録の箱を開けている。', seris: 'セリスはマクディアの学院で教えている。最初の授業は「止める勇気と、作る勇気」。', gald: 'ガルドはヴェルムで、元・坑夫たちと運送屋を始めた。鎖は一本もない。', lucia: 'ルシアはポヨ村の修行場で、師匠ハケイの隣に立っている。', elna: 'エルナは各地の帳簿を監査して回っている。どの帳簿も、名前から書かせる。', ord: 'オルドは前線基地に残り、荒野から帰ってくる者たちを迎えている。', nagi: 'ナギは海と空の航路図を一枚にまとめた。誰でも写せるように。', iris: 'イーリスは灰灯島の地図を描き直している。失ったものと、見つけたもの、両方を。', sophia: 'ソフィアは鐘都で「未来の読み方」を教えている。最後の言葉はいつも同じ。「でも、決めるのはあなた」。', io: 'イオはゼロメアの居住区会議の書記になった。自分の意見も、たまに書く。' };
    var ce = Object.keys(EP).filter(function (id) { return d.companions[id]; }).map(function (id) { return EP[id]; });
    if (ce.length) await c.msg(['——仲間たちの、それから——'].concat(ce));
    await c.msg(['すべての問題がなくなったわけではない。', 'それでも、人々は未来を選べるようになった。']);
    // ポヨ村へ帰る
    root.World.enterMap('poyo_elder_house', 5, 5, 'up');
    await c.say('村長モチゾウ', ['……おお、帰ったか。ずいぶん遠くまで行っておったようじゃな。', '世界を、救ったのか？']);
    await c.say(d.hero.name, ['いいえ。', 'みんなが、自分の世界を守れるようになっただけです。']);
    await c.say('村長モチゾウ', ['……そうか。それが一番、難しいことじゃよ。', 'さあ、修行場へ顔を出してやれ。ハケイが待っておる。']);
    f.game_cleared = true; d.clearedAt = Date.now();
    await c.questComplete('main_16');
    await c.msg(['〜 もちぽよFXクエスト　波形の勇者と相場の魔王　おしまい 〜', 'クリアデータを記録しました。このまま冒険を続けられます（行っていない町、石碑、サブクエスト、トレード修行）。', 'このゲームのチャートはすべて学習用の人工データです。ゲームで学んだ判断の型は、実際の相場で勝つことを保証するものではありません。損切りと資金管理を忘れずに。']);
    if (root.Audio) root.Audio.playBgm('town'); root.State.autosave();
  };
  root.Finale = Finale;

  // ポヨ村の村長：クリア後の会話
  (function () { var def = root.MAP_DEFS.poyo_elder_house; if (!def) return; var n = def.npcs.filter(function (x) { return x.id === 'elder_mochizo'; })[0]; if (!n) return; var orig = n.talk; n.talk = async function (c) { if (c.flag('game_cleared')) { await c.say('村長モチゾウ', ['世界は、相変わらず波だらけじゃ。上がって、下がって、また上がる。', '……それでいい。波のない世界を、お前さんは選ばなかった。わしは、それが誇らしい。']); return; } await orig(c); }; })();
})(typeof window !== 'undefined' ? window : globalThis);
