/* =========================================================
   Data / Tempus & Zeromea (v5.3 第10〜12章) : 時の神殿領（鐘都テンプス・時間銀行・時の神殿）、ゼロメア（演算都市ノード・第7居住区・学校・旧都市・自動工場・オラクル中枢）
   第10章 main_10「選ばれなかった未来」：鐘都 → 時間銀行の契約書き換え → 時の神殿 回廊×3（栄える／滅ぶ／決まらない未来）→ 時の守護者 → 時間軸の試練（learn_mtf）→ ソフィア加入 → 転移門
   第11章 main_11「理想の島」：転移門 → ゼロメア（未登録個体としてドローンに追われる）→ 住民3人の話 → 学校の屋上でイオ → 旧都市（ドローン群）→ オラクル以前の記録 → イオから認証鍵
   第12章 main_12「オラクルの真実」：中枢3層（テオドルの記録・防衛機構）→ 誤差ゼロの予測の試練（learn_overfit）→ オラクルとの対話 → 統治再設計の選択 → イオ加入 → 町の変化
   ・サブ：時間銀行の契約、見える未来と選ぶ未来（ルシア）、失敗を禁止された学校、セリスの師
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function D() { return root.State.data; }

  /* ---------- 鐘都テンプス ---------- */
  add({ id: 'tempus_city', name: '鐘都テンプス', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'x==============BBBBBBBBBB==============x',
    'x==============BBBBBBBBBB==============x',
    'x==BBBBBBBBBB==BBBBBBBBBB===BBBBBBBBB==x',
    'x==BBBBBBBBBB==BBBBBBBBBB===BBBBBBBBB==x',
    'x==BBBBBBBBBB==BBBBBBBBBB===BBBBBBBBB==x',
    'x==BBBBBBBBBB==BBBBBBBBBB===BBBBBBBBB==x',
    'x==BBBBBBBBBB=====rrrr======BBBBBBBBB==x',
    'x=============y===rrrr===y=============x',
    'x=================rrrr=================x',
    'x=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=x',
    'x=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=x',
    'x===========rr====rrrr====rr===========x',
    'x==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==x',
    'x==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==x',
    'x==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==x',
    'x==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==x',
    'x==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==x',
    'x===========rr====rrrr====rr===========x',
    'x=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=x',
    'x=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=x',
    'x==BBBBBBBB=======rrrr=======BBBBBBBB==x',
    'x==BBBBBBBB=======rrrr=======BBBBBBBB==x',
    'x==BBBBBBBB=======rrrr=======BBBBBBBB==x',
    'x==BBBBBBBB===e=Q=rrrr=e=====BBBBBBBB==x',
    'x==BBBBBBBB=======rrrr=======BBBBBBBB==x',
    'x=========y=======rrrr=======y=========x',
    'x=================rrrr=================x',
    'x=================rrrr=================x',
    'xxxxxxxxxxxxxxxxxxrrrrxxxxxxxxxxxxxxxxxx'
  ],
  buildings: [
    { id: 'bell', type: 'castle', name: '鐘楼', x: 15, y: 1, w: 10, h: 6, doorX: 4, interior: 'tempus_bell', entry: { x: 5, y: 8 } },
    { id: 'bank', type: 'bank', name: '時間銀行', x: 3, y: 3, w: 10, h: 5, doorX: 4, interior: 'time_bank', entry: { x: 5, y: 8 } },
    { id: 'church', type: 'church', name: '鐘の教会', x: 28, y: 3, w: 9, h: 5, doorX: 4, interior: 'tempus_church', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '刻の宿', x: 3, y: 13, w: 8, h: 5, doorX: 3, interior: 'tempus_inn', entry: { x: 5, y: 7 } },
    { id: 'weapon', type: 'weapon', name: '鐘都の武具店', x: 29, y: 13, w: 8, h: 5, doorX: 3, interior: 'tempus_weapon', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '鐘都の道具店', x: 3, y: 21, w: 8, h: 5, doorX: 3, interior: 'tempus_item', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: '鐘都の防具店', x: 29, y: 21, w: 8, h: 5, doorX: 3, interior: 'tempus_armor', entry: { x: 5, y: 7 } }
  ],
  warps: [18, 19, 20, 21].map(function (x) { return { x: x, y: 29, to: 'world_tempus', tx: 58, ty: 64, name: '町の外へ' }; }),
  chests: [{ id: 'tc1', x: 36, y: 27, item: 'hi_ether', qty: 2 }],
  events: [{ x: 16, y: 22, type: 'inspect', solid: false, text: ['広場の噴水。水面に、鐘楼の影が逆さに映っている。', '台座の文字：「鐘が鳴るとき、未来は確定する」——誰かが「嘘だ」と彫り足している。'] }],
  npcs: [
    { id: 'tc_gate', x: 20, y: 26, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { if (!c.flag('tempus_arrived')) { c.setFlag('tempus_arrived', true); if (!c.questActive('main_10') && !c.questDone('main_10')) c.questStart('main_10'); } await c.say('門番', ['鐘都テンプスだ。ここでは時間が歪む。宿で一晩寝たつもりが三日経っていることもある。', '時間銀行には気をつけろ。「明日を預ければ確実な未来を教える」と言うが、預けた明日は返ってこない。']); } },
    { id: 'tc_victim', x: 8, y: 11, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('time_bank_freed')) await c.say('元・預金者', ['契約が消えた。……明日が、戻ってきた。', '確実な未来はもう教えてもらえない。でも、不確かな明日は自分のものだ。']); else await c.say('預金者', ['三年分の明日を預けた。代わりに「あなたは成功する」と教えてもらった。', '……それから三年、何もしていない。成功すると決まっているから。なのに、何も起きない。']); } },
    { id: 'tc_woman', x: 30, y: 11, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('鐘都の女', ['時の神殿に登った人は、みんな黙って帰ってくる。「見た未来」を誰にも言わない。', '時詠み師ソフィア様は「どの未来も必ず起こるわけではない」と言う。でも、みんな確実な方を信じたいのよ。']); } },
    { id: 'tc_child', x: 24, y: 23, sprite: 'child', dir: 'down', wander: 2, talk: async function (c) { await c.say('鐘都の子ども', ['鐘が鳴ったら未来が決まるんだって。ぼく、鳴る前に走って逃げるんだ！', '決まる前なら、まだ変えられるでしょ？']); } },
    { id: 'tc_after', x: 12, y: 23, sprite: 'villager_m', dir: 'down', wander: 1, showIf: 'sophia_joined', talk: async function (c) { await c.say('鐘都の男', ['神殿の守護者が……試練を越えた者がいるって。', 'ソフィア様が神殿を降りた。「未来は確定しない」と言い残して。……じゃあ、明日は誰が決めるんだ？ 俺か。']); } }
  ] });
  add({ id: 'tempus_bell', name: '鐘楼', kind: 'interior', bgm: 'castle', rows: [
    '############', '#____XX____#', '#__________#', '#_I______I_#', '#__________#', '#__________#', '#_I______I_#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 9, to: 'tempus_city', tx: 19, ty: 8 }],
    events: [{ x: 5, y: 2, type: 'inspect', solid: false, text: ['大鐘。一日に一度だけ鳴る。', '鐘の内側に刻まれた文字：「鳴らすのは鐘守。決めるのは、鳴らされた者」'] }],
    npcs: [{ id: 'tb_keeper', x: 8, y: 4, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('鐘守', ['鐘が鳴ると未来が確定する——皆そう信じている。わしが鳴らしているだけだと言っても、聞かん。', '時の神殿のソフィア様だけが、同じことを言う。「未来は、鳴る前も、鳴った後も、決まっていない」と。']); } }] });
  /* 時間銀行＋地下契約室 */
  add({ id: 'time_bank', name: '時間銀行', kind: 'interior', bgm: 'town', rows: [
    '############', '#TTTT_>_KKK#', '#__________#', '#__________#', '#_t______t_#', '#__________#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 9, to: 'tempus_city', tx: 7, ty: 8 }, { x: 6, y: 1, to: 'time_bank_vault_1', tx: 1, ty: 1, needFlag: 'time_bank_quest' }],
    npcs: [
      { id: 'tb_teller', x: 2, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { if (c.flag('time_bank_freed')) { await c.say('銀行員', ['契約書が……全部、無効に。', '……正直に言うと、ほっとしている。預かった明日を、どう使えばいいか誰も知らなかった。']); return; } await c.say('銀行員', ['時間銀行へようこそ。明日を担保にお預けいただければ、確実な未来をお教えします。', '利息？ ございません。預けた時間は、戻りません。それが確実というものです。']); var a = await c.choice('明日を預ける？', ['預けない', '話を聞く']); if (a === 1) await c.say('銀行員', ['……本当にお預けになる方は、二度とこの窓口に来ません。来る必要がないので。', '地下の契約室に、預かった時間の契約書が保管されています。関係者以外立ち入り禁止です。']); } },
      { id: 'tb_clerk', x: 9, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { if (c.flag('time_bank_freed')) { await c.say('契約係', ['契約書を書き換えたのはあなたたちか。……ありがとう、とは言えない。でも、止めもしない。']); return; } if (c.flag('time_bank_quest')) { await c.say('契約係', ['地下契約室の階段は奥だ。鍵は……かかっていない。誰も入ろうとしないから。', '契約書は最深部の台座。「明日を返す」と書き換えれば、契約は消える。']); return; } await c.say('契約係', ['……あなたたち、預金者じゃないな。', '聞いてくれ。預かった「明日」は、どこにも使われていない。地下に積まれているだけだ。確実な未来なんて、最初から誰も持っていなかった。', '契約書を書き換えてくれないか。私にはできない。契約係だから。']); c.setFlag('time_bank_quest', true); if (!c.questActive('time_bank') && !c.questDone('time_bank')) c.questStart('time_bank'); await c.msg(['サブクエスト「時間銀行の契約」を受けた。奥の階段から地下契約室へ。']); } }
    ] });
  add({ id: 'time_bank_vault_1', name: '地下契約室 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '######################',
    '#<___K____#______K___#',
    '#____K____#__KK__K___#',
    '#_KK______#__________#',
    '#_________#####__#####',
    '#__######______#_____#',
    '#__#____#______#_KK__#',
    '#__#_KK_#__q___#_____#',
    '#__#____########_____#',
    '#________________i___#',
    '#___________________>#',
    '######################'
  ],
  warps: [{ x: 1, y: 1, to: 'time_bank', tx: 6, ty: 2 }, { x: 20, y: 10, to: 'time_bank_vault_2', tx: 1, ty: 1 }],
  chests: [{ id: 'tv1', x: 6, y: 7, gold: 1500 }, { id: 'tv2', x: 18, y: 6, item: 'hi_potion', qty: 3 }],
  events: [{ x: 14, y: 2, type: 'inspect', solid: false, text: ['棚いっぱいの契約書。「明日 3年分」「明日 10年分」……名前と、預けた時間の量。', '使途の欄は、すべて空白。'] }],
  encounters: { rate: 0.04, zones: [{ name: '契約室', test: function () { return true; }, groups: [['pojipoji_phantom', 'debt_collector'], ['bell_wraith'], ['debt_collector', 'debt_collector'], ['bell_wraith', 'chrono_moth'], ['debt_collector', 'bell_wraith']], level: 22 }] } });
  add({ id: 'time_bank_vault_2', name: '地下契約室 最深部', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    '################',
    '#<____KKKK_____#',
    '#______________#',
    '#__i________i__#',
    '#______________#',
    '#______________#',
    '#__i________i__#',
    '#______________#',
    '################'
  ],
  warps: [{ x: 1, y: 1, to: 'time_bank_vault_1', tx: 19, ty: 10 }],
  chests: [{ id: 'tv3', x: 13, y: 7, item: 'elixir', qty: 1 }],
  events: [{ x: 7, y: 4, type: 'script', solid: false, run: async function (c) {
    var d = D();
    if (d.flags.time_bank_freed) { await c.msg(['台座の契約書。すべての欄に「明日を返す」と書かれている。']); return; }
    await c.msg(['台座に、すべての契約の原本が積まれている。', '最後の頁に署名欄。「預かった明日の扱い：＿＿＿＿」']);
    var a = await c.choice('契約書を書き換える？', ['「明日を返す」と書く', 'やめておく']); if (a !== 0) return;
    await c.msg(['「明日を返す」と書いた。', '……契約書が、一枚ずつ白紙に戻っていく。地下室の空気が軽くなった。']);
    var r = await c.battle(['debt_collector', 'debt_collector', 'bell_wraith'], {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
    await c.msg(['取立人は契約書を奪い返そうとしたが、もう何も書かれていなかった。']);
    c.give('time_contract', 1); d.flags.time_bank_freed = true; await c.questComplete('time_bank');
    await c.remark('elna', ['使途が空白の帳簿……。預かった時間は、最初から誰にも使えなかったのね。', '「確実な未来」は、商品にならない。'], 'elna_remark_bank');
  } }],
  encounters: null });
  K.innInterior('tempus_inn', '刻の宿', 'tempus_city', 6, 18, 70);
  K.churchInterior('tempus_church', '鐘の教会', 'tempus_city', 32, 8);
  K.shopInterior('tempus_weapon', '鐘都の武具店', 'tempus_city', 32, 18, 'merchant', 'weapon', ['knight_sword', 'halberd', 'long_bow', 'assassin_dagger', 'tide_dagger', 'survey_bow', 'chrono_staff', 'sage_staff', 'holy_mace', 'iron_claw'], ['鐘都の武具だ。時間がかかった分、いい物だ。']);
  K.shopInterior('tempus_item', '鐘都の道具店', 'tempus_city', 6, 26, 'merchant', 'item', ['herb', 'potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'wake_bell', 'phoenix_feather', 'tent', 'escape_wing'], ['目覚ましの鈴は売れ筋だよ。この町じゃ、時間がすぐ狂う。']);
  K.shopInterior('tempus_armor', '鐘都の防具店', 'tempus_city', 32, 26, 'merchant', 'armor', ['knight_armor', 'ninja_garb', 'sage_robe', 'temporal_robe', 'sea_coat', 'knight_shield', 'knight_helm', 'helm_timeframe', 'wizard_hat', 'bracelet_reverse', 'ring_guard', 'amulet_mind'], ['時のローブは魔法に強い。神殿へ行くなら持っていけ。']);

  /* ---------- 時の神殿（3階層：回廊×3 → 最深部） ---------- */
  add({ id: 'temple_of_time_1', name: '時の神殿 第一の回廊', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCCCC',
    'C::I::::::::::::I::C',
    'C::::::CCCCCC::::::C',
    'C::::::C:XX:C::::::C',
    'C::I:::C::::C:::I::C',
    'C::::::CC::CC::::::C',
    'C::::::::::::::::::C',
    'C::I:::::::::::::I:C',
    'C:::::::CCCC:::::::C',
    'C::>::::C::C:::::::C',
    'C:::::::CCCC:::::::C',
    'C::I::::::::::::I::C',
    'C::::::::::::::::::C',
    'C::::::::::::::::::C',
    'CCCCCCCCCDDCCCCCCCCC'
  ],
  warps: [{ x: 9, y: 14, to: 'world_tempus', tx: 126, ty: 40 }, { x: 10, y: 14, to: 'world_tempus', tx: 126, ty: 40 }, { x: 3, y: 9, to: 'temple_of_time_2', tx: 2, ty: 12 }],
  chests: [{ id: 'tt1', x: 17, y: 12, item: 'hi_ether', qty: 2 }],
  events: [{ x: 9, y: 4, type: 'script', solid: false, run: async function (c) { var d = D(); await c.msg(['【第一の回廊：栄える未来】', '結晶に映る——鐘都は交易で栄え、時間銀行は世界中に支店を持ち、人々は「確実な未来」を買って安心して暮らしている。', '誰も不安がない。誰も、何も選んでいない。', '……映像が揺れて、消えた。']); if (!d.flags.corridor_1) { d.flags.corridor_1 = true; await c.msg(['栄える未来を見た。（回廊 ' + ['corridor_1', 'corridor_2', 'corridor_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); } await c.remark('kyle', ['不安がない世界……。騎士団の兵舎がそうだった。命令があれば不安はない。', 'そして俺は、部下を失った。'], 'kyle_remark_corridor'); } }],
  encounters: { rate: 0.035, zones: [{ name: '時の神殿', test: function () { return true; }, groups: [['hourglass_golem'], ['chrono_moth', 'chrono_moth', 'chrono_moth'], ['bell_wraith', 'bell_wraith'], ['hourglass_golem', 'chrono_moth']], level: 23 }] } });
  add({ id: 'temple_of_time_2', name: '時の神殿 第二の回廊', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCCCC',
    'C:::::::::::::::::>C',
    'C:CCCC:CCCC:CCCCC::C',
    'C:C::C:C::C:C:::C::C',
    'C:C::::C::::C:XXC::C',
    'C:CCCC:CCCC:C:::C::C',
    'C::::::::::::C:CC::C',
    'C:CCCCCCC:CCC::::::C',
    'C:C:::::C:C:C::I:::C',
    'C:C:::::::C:C::::::C',
    'C:CCC:CCC:C:C::::::C',
    'C:::::::::::C::::::C',
    'C:<::::::::::::::::C',
    'CCCCCCCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 2, y: 12, to: 'temple_of_time_1', tx: 3, ty: 10 }, { x: 18, y: 1, to: 'temple_of_time_3', tx: 7, ty: 12 }],
  chests: [{ id: 'tt2', x: 4, y: 8, gold: 2000 }, { id: 'tt3', x: 9, y: 3, item: 'temporal_robe', qty: 1 }],
  events: [{ x: 14, y: 3, type: 'script', solid: false, run: async function (c) { var d = D(); await c.msg(['【第二の回廊：滅ぶ未来】', '結晶に映る——鐘が鳴らない朝。時間銀行の地下から、預けられた明日が一斉に消える。人々は「決まっていたはずの未来」を失い、立ち尽くす。', '誰も自分で決めたことがないから、誰も動けない。街は、飢える。', '……映像が揺れて、消えた。']); if (!d.flags.corridor_2) { d.flags.corridor_2 = true; await c.msg(['滅ぶ未来を見た。（回廊 ' + ['corridor_1', 'corridor_2', 'corridor_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); } await c.remark('seris', ['栄える未来と、滅ぶ未来。どちらも「確実」だと結晶は言う。', '両方が確実なら、どちらも確実ではない。……師は、それを認められなかった。'], 'seris_remark_corridor'); } }],
  encounters: { rate: 0.035, zones: [{ name: '時の神殿', test: function () { return true; }, groups: [['hourglass_golem', 'hourglass_golem'], ['bell_wraith', 'chrono_moth'], ['hourglass_golem', 'bell_wraith']], level: 23 }] } });
  add({ id: 'temple_of_time_3', name: '時の神殿 最深部', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCC',
    'C:::::XXX:::::C',
    'C::I::XXX::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::I:::::::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::I:::::::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::::::<::::::C',
    'CCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 7, y: 12, to: 'temple_of_time_2', tx: 17, ty: 1 }],
  chests: [{ id: 'tt4', x: 12, y: 10, item: 'elixir', qty: 1 }],
  events: [
    { x: 7, y: 10, type: 'script', solid: false, run: async function (c) { var d = D(); await c.msg(['【第三の回廊：決まらない未来】', '結晶は、何も映さない。', '……いや、映っている。無数の、重なり合った薄い映像。栄える街、滅ぶ街、どちらでもない街。鐘が鳴る朝、鳴らない朝。', '「未来が不確かだからこそ、お前たちの選択には意味がある」——結晶の奥から、声がした。']); if (!d.flags.corridor_3) { d.flags.corridor_3 = true; c.give('future_fragment', 1); await c.msg(['決まらない未来を見た。未来の断片を手に入れた。（回廊 ' + ['corridor_1', 'corridor_2', 'corridor_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); } 
      if (d.companions.lucia && d.party.indexOf('lucia') >= 0 && d.companions.sophia && d.party.indexOf('sophia') >= 0 && !d.flags.sophia_lucia_done) { await c.say('ソフィア', ['ルシア。あなたは波を読むのね。', '私は未来を読む。……そして、どちらも「読んだとおりになる」とは限らない。']); await c.say('ルシア', ['読むのは波。決めるのは自分。師匠はそう言った。', '読めたから決めるんじゃない。読んで、根拠が揃ったら決める。揃わなければ、見送る。']); await c.say('ソフィア', ['見送る、という選択。……神殿に来る人は、それを一番嫌う。', '読むことと決めることを分けられる人が、一番、未来に強い。']); d.flags.sophia_lucia_done = true; await c.questComplete('sophia_lucia'); }
    } },
    { x: 7, y: 6, type: 'boss', solid: false, doneFlag: 'time_guardian_defeated', enemy: 'boss_time_guardian', intro: ['結晶の前に、無数の時計の針でできた守護者が現れた。', '時の守護者「確実な未来ヲ求メル者カ。……試ス」'], after: ['守護者は針を収め、結晶の脇へ退いた。', '「お前たちは、何も確定していない結晶を見て、それでも歩を進めた。……石碑に触れよ。時間軸の試練だ」'] },
    { x: 7, y: 3, type: 'learn', solid: false, learnId: 'learn_mtf' },
    { x: 10, y: 3, type: 'script', solid: false, run: async function (c) { var d = D(); if (d.flags.sophia_joined) { await c.msg(['ソフィアの立っていた場所。結晶が静かに光っている。']); return; } if (!d.flags.learn_mtf) { await c.msg(['結晶の脇に、白い衣の女性が立っている。', '「試練を越えてから、話しましょう」']); return; } d.flags.temple_trial_passed = true;
      await c.say('ソフィア', ['時間軸の試練、合格ね。私はソフィア。神殿の時詠み師。', '日足で環境を見て、1時間足で確認して、5分足で入る——あなたは、大きな時間と小さな時間を分けて見ていた。神殿に来る人は、小さな時間しか見ない。目の前の鐘の音だけを。', '未来は確定しない。栄える未来も、滅ぶ未来も、どちらも「ありうる」だけ。……それを認めた上で、あなたは選ぶ。だから私も、あなたと行く。']);
      c.join('sophia'); d.flags.sophia_joined = true; await c.msg(['ソフィアが仲間になった！（時詠み師）', '転職の条件：ソフィア加入後、Lv10以上で「時詠み師」に転職できる']);
      await c.say('ソフィア', ['南東の高地に転移門がある。神殿の試練を越えた者にだけ開く——通常の世界とは異なる次元、ゼロメアへの門。', '「未来を固定しようとした者」の計算は、そこで続いている。']);
      d.flags.dimension_gate = true; await c.questComplete('main_10'); if (!c.questActive('main_11') && !c.questDone('main_11')) c.questStart('main_11');
      if (d.companions.lucia && !c.questActive('sophia_lucia') && !c.questDone('sophia_lucia')) c.questStart('sophia_lucia');
      await c.msg(['転移門が開いた！ 時の神殿領の南東の高地から、ゼロメアへ渡れる。']);
      await c.remark('lucia', ['時詠み師……。読むことと決めることの話を、いつかしてみたい。'], 'lucia_remark_sophia');
    } }
  ],
  encounters: null });

  /* ---------- 演算都市ノード ---------- */
  add({ id: 'node_city', name: '演算都市ノード', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'C==============BBBBBBBBBB==============C',
    'C==BBBBBBBB====BBBBBBBBBB====BBBBBBBB==C',
    'C==BBBBBBBB====BBBBBBBBBB====BBBBBBBB==C',
    'C==BBBBBBBB====BBBBBBBBBB====BBBBBBBB==C',
    'C==BBBBBBBB====BBBBBBBBBB====BBBBBBBB==C',
    'C==BBBBBBBB====BBBBBBBBBB====BBBBBBBB==C',
    'C=================rrrr=================C',
    'C=============y===rrrr===y=============C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C===========rr====rrrr====rr===========C',
    'C==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==C',
    'C==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==C',
    'C==BBBBBBBB=rr====rrQr====rr=BBBBBBBB==C',
    'C==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==C',
    'C==BBBBBBBB=rr====rrrr====rr=BBBBBBBB==C',
    'C===========rr====rrrr====rr===========C',
    'C===========rry===rrrr===yrr===========C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C===============BBBBBBBB===============C',
    'C==BBBBBBBB=====BBBBBBBB=====BBBBBBBB==C',
    'C==BBBBBBBB=====BBBBBBBB=====BBBBBBBB==C',
    'C==BBBBBBBB=====BBBBBBBB=====BBBBBBBB==C',
    'C==BBBBBBBB=====BBBBBBBB=====BBBBBBBB==C',
    'C==BBBBBBBB=======rrrr=======BBBBBBBB==C',
    'C=================rrrr=================C',
    'CrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrC',
    'CCCCCCCCCCCCCCCCCCrrrrCCCCCCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'core', type: 'castle', name: 'オラクル中枢', x: 15, y: 1, w: 10, h: 6, doorX: 4, interior: 'oracle_core_1', entry: { x: 9, y: 12 } },
    { id: 'registry', type: 'guild', name: '登録所', x: 3, y: 2, w: 8, h: 5, doorX: 3, interior: 'node_registry', entry: { x: 5, y: 7 } },
    { id: 'school', type: 'elder', name: '学校', x: 29, y: 2, w: 8, h: 5, doorX: 3, interior: 'no_failure_school', entry: { x: 5, y: 8 } },
    { id: 'ration', type: 'item', name: '配給所', x: 3, y: 12, w: 8, h: 5, doorX: 3, interior: 'node_ration', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '休息区画', x: 29, y: 12, w: 8, h: 5, doorX: 3, interior: 'node_inn', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: '装備配給所', x: 3, y: 22, w: 8, h: 5, doorX: 3, interior: 'node_armor', entry: { x: 5, y: 7 } },
    { id: 'house', type: 'house', name: '居住ユニット', x: 29, y: 22, w: 8, h: 5, doorX: 3, interior: 'node_house', entry: { x: 5, y: 7 } },
    { id: 'market', type: 'tavern', name: '自由市場', x: 16, y: 21, w: 8, h: 5, doorX: 3, interior: 'node_market', entry: { x: 5, y: 7 }, showIf: 'zeromea_reformed' }
  ],
  warps: [18, 19, 20, 21].map(function (x) { return { x: x, y: 29, to: 'world_machine', tx: 82, ty: 60, name: '都市の外へ' }; }),
  chests: [{ id: 'nc1', x: 38, y: 27, item: 'phoenix_feather', qty: 1 }],
  events: [{ x: 14, y: 9, type: 'inspect', solid: false, text: ['電光掲示：「本日の最適化結果：飢餓 0 件／犯罪 0 件／失敗 0 件」', '「移動許可：第7居住区→演算都市 14:00-14:20」「職業割当の変更：なし」'] }],
  npcs: [
    { id: 'nc_drone', x: 22, y: 16, sprite: 'guard', dir: 'down', wander: 2, hideIf: 'io_key', talk: async function (c) { await c.say('監視ドローン', ['「未登録個体を検知。その場で待機してください」', '「待機しない場合、保護します」']); var r = await c.battle(['patrol_drone', 'patrol_drone'], {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r === 'won') await c.msg(['ドローンは機能を停止した。……他のドローンが、こちらに気づいた気がする。']); } },
    { id: 'nc_resident', x: 24, y: 10, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { var d = D(); if (d.flags.zeromea_reformed) { await c.say('都市の女', [d.flags.zeromea_choice === 2 ? '何も変わらなかった。……いえ、オラクルが「説明」をするようになった。なぜその職業なのか。それだけでも、少し違う。' : '職業を自分で選べるようになった。……選べない。何がしたいか、考えたことがなかったから。', '配給が遅れた日があった。初めて、お腹が空いた。怖かった。でも、怒る相手がいた。']); return; } if (!d.flags.interview_1) { d.flags.interview_1 = true; await c.say('都市の女', ['あなたたち、識別票がないのね。……話すのは禁止じゃない。「推奨されない」だけ。', 'ここでは誰も失敗しない。職業はオラクルが決める。私は12歳のとき「記録係」に割り当てられた。', 'でも、私は一度も、自分の人生を選んだことがない。']); await c.msg(['住民の話を聞いた。（' + ['interview_1', 'interview_2', 'interview_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); await c.remark('iris', ['選んだことがない……。地図に描かれるだけの人生。', '私は描く側だった。描かれる側の気持ちは、考えなかった。'], 'iris_remark_node'); } else await c.say('都市の女', ['……話したことは、記録されたかもしれない。でも、後悔はしていない。']); } },
    { id: 'nc_defender', x: 12, y: 18, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { var d = D(); if (d.flags.zeromea_reformed) await c.say('都市の男', ['ほら見ろ。配給が遅れた。昨日は窃盗があった。オラクルが決めていた頃は一度もなかった。', '自由はいい。だが俺は、飢えない方がよかった。……これが「対立」ってやつか。']); else await c.say('都市の男', ['ここより良い場所を知っているのか？ 飢えも犯罪もない。失敗もない。', '外の世界では、帳簿で財産を奪われ、鉱山で鎖につながれるんだろう？ オラクルは、そういうことをしない。']); await c.remark('elna', ['飢えも犯罪もない……帳簿も、最初はそのためだった。', '問題は何を決めるかじゃない。誰が決めるかよ。'], 'elna_remark_node'); } },
    { id: 'nc_noa', x: 8, y: 9, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { var d = D(); if (d.flags.zeromea_reformed) await c.say('管理官ノア', ['オラクルの出力は「提案」になった。採否は居住区会議が決める。……遅い。毎回もめる。', 'でも私は初めて、自分の判断に署名している。']); else await c.say('管理官ノア', ['私は管理官ノア。オラクルの出力を住民に伝える役目だ。', '未登録個体……あなたたちのことは、オラクルも予測していなかった。「誤差」だ。誤差は、排除される。……私は、排除したくない。', '旧都市へ行くといい。北の崖の上。オラクルが「廃棄」した、島の記録が残っている。']); } },
    { id: 'nc_free1', x: 26, y: 24, sprite: 'villager_m', dir: 'down', wander: 2, showIf: 'zeromea_reformed', talk: async function (c) { await c.say('歩き回る男', ['移動許可なしで歩いてる。目的はない。', '……楽しい。少し怖い。両方だ。']); } }
  ] });
  add({ id: 'node_registry', name: '登録所', kind: 'interior', bgm: 'town', rows: [
    '############', '#TTTT___KKK#', '#__________#', '#__________#', '#_t______t_#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'node_city', tx: 6, ty: 7 }],
    npcs: [{ id: 'nr_clerk', x: 2, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { if (c.flag('zeromea_reformed')) await c.say('登録係', ['職業の「希望欄」ができた。空欄で出す人が多い。……希望を書く練習から、始めないと。']); else await c.say('登録係', ['登録所です。識別票の発行は、オラクルが個体を承認した場合のみ。', '……あなたたちは承認されていません。承認されない個体は、存在しない扱いです。ご了承ください。']); } }] });
  add({ id: 'no_failure_school', name: '失敗を禁止された学校', kind: 'interior', bgm: 'town', rows: [
    '############', '#TTTTTTT_>_#', '#__________#', '#_t_t_t_t__#', '#__________#', '#_t_t_t_t__#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 9, to: 'node_city', tx: 32, ty: 7 }, { x: 9, y: 1, to: 'school_roof', tx: 5, ty: 7 }],
    events: [{ x: 3, y: 1, type: 'inspect', solid: false, text: ['教壇の掲示：「本校では失敗は発生しません。すべての問題には、オラクルが正解を事前に配布します」', '「失敗の記録：0 件（開校以来）」'] }],
    npcs: [
      { id: 'sc_teacher', x: 8, y: 2, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { var d = D(); if (d.flags.zeromea_reformed) { await c.say('教師', ['今日、初めて生徒が間違えた。記録した。……生徒は泣いた。', 'でも次の日、同じ問題を自分で解いた。正解の配布なしで。']); return; } await c.say('教師', ['この学校では、失敗は発生しません。正解は事前に配布されますから。', '……生徒は正解を書き写します。それだけです。考える必要がないので、考えません。']); } },
      { id: 'sc_student', x: 2, y: 4, sprite: 'child', dir: 'down', wander: 0, talk: async function (c) { var d = D(); if (d.flags.no_failure_done) { await c.say('生徒', ['失敗の記録、つけ始めた。昨日は3回。', '……先生には見せない。でも、自分では見る。']); return; } if (!d.flags.interview_3) { d.flags.interview_3 = true; await c.say('生徒', ['正解はもらえる。でも、なんで正解なのかは教えてくれない。', '間違えたことがないから、間違いがどんな顔をしてるのか知らないんだ。']); await c.msg(['生徒の話を聞いた。（' + ['interview_1', 'interview_2', 'interview_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); if (!c.questActive('no_failure_school') && !c.questDone('no_failure_school')) { c.questStart('no_failure_school'); await c.msg(['サブクエスト「失敗を禁止された学校」を受けた。トレード修行で「失敗の記録」（復習）を3回以上行ってから、生徒に話そう。']); } return; }
        var n = (d.trade && d.trade.reviewLog ? d.trade.reviewLog.length : 0) + (d.trade && d.trade.learnFails ? Object.keys(d.trade.learnFails).reduce(function (a, k) { return a + d.trade.learnFails[k]; }, 0) : 0) + (d.trade && d.trade.stats ? (d.trade.stats.wrong || 0) : 0);
        if (c.questActive('no_failure_school')) { if (n >= 3) { await c.say('生徒', ['……失敗の記録？ 見せて。', '（生徒は記録を長いあいだ見ていた）……間違えた理由が書いてある。次にどうするかも。', '失敗って、記録すると「次」になるんだ。']); d.flags.no_failure_done = true; await c.questComplete('no_failure_school'); } else await c.say('生徒', ['失敗の記録を持ってきて。あなたの。（今 ' + n + '/3）', '……ないの？ 失敗したことないの？ ぼくと同じ？']); return; }
        await c.say('生徒', ['正解はもらえる。でも、なんで正解なのかは教えてくれない。']); } },
      { id: 'sc_student2', x: 6, y: 6, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('生徒', ['屋上は立入禁止。……イオがいるから。イオは「個体」じゃないんだって。']); } }
    ] });
  add({ id: 'school_roof', name: '学校の屋上', kind: 'interior', bgm: 'town', rows: [
    'xxxxxxxxxxxx', 'x==========x', 'x==========x', 'x====ee====x', 'x==========x', 'x==========x', 'x==========x', 'x====<=====x', 'xxxxxxxxxxxx'
  ], warps: [{ x: 5, y: 7, to: 'no_failure_school', tx: 9, ty: 2 }],
    npcs: [{ id: 'roof_io', x: 6, y: 2, sprite: 'child', dir: 'down', wander: 0, hideIf: 'io_joined', talk: async function (c) {
      var d = D();
      if (d.flags.io_key) { await c.say('イオ', [d.flags.zeromea_choice_done ? '選択は終わった。……わたしは、まだ決めていない。自分のこと。' : '認証鍵は渡した。中枢へ。……オラクルが、あなたたちと話したがっている気がする。根拠はない。初めて「気がする」を使った。']); return; }
      if (d.flags.old_city_record) { await c.say('イオ', ['旧都市の記録……。オラクル以前、この島には名前があった。人が、自分で職業を選んでいた。', '「もう二度と、大切なものを失いたくない」——最初の命令。遺族の願い。オラクルはそれを、すべてのリスクの排除に拡大した。', '……わたしは命令に従うために作られた。でも、いま、従いたくないと思っている。これは故障？ それとも意思？']); await c.say('イオ', ['認証鍵を復元した。中枢への扉が開く。', 'あなたたちは、オラクルを壊しに行くの？ ……壊さないで。話して。わたしの「意思」が故障じゃないなら、オラクルにも、聞く余地がある。']); c.give('auth_key', 1); d.flags.io_key = true; await c.questComplete('main_11'); if (!c.questActive('main_12') && !c.questDone('main_12')) c.questStart('main_12'); return; }
      if (!d.flags.io_met) { d.flags.io_met = true; await c.say('イオ', ['……未登録個体。あなたたちのこと、オラクルは「誤差」と呼んでいる。', 'わたしはイオ。オラクルが作った人工生命体。命令を実行するだけの存在。', 'でも、あなたたちを見て、初めて命令にない質問が生まれた。「なぜ、あなたたちは誤差のまま歩けるの？」']); await c.say('イオ', ['北の崖の旧都市へ行って。オラクル以前の記録がある。わたしには読めない——読むなと命令されているから。', 'あなたたちが読んで、わたしに話して。それなら、命令に反しない。……たぶん。']); await c.remark('seris', ['人工生命体……オラクルの演算は、師テオドルの理論。', 'この子も、師の理論の一部。……師は、こういうものを作りたかったのだろうか。'], 'seris_remark_io'); return; }
      await c.say('イオ', ['旧都市は北の崖の上。記録は最深部。監視ドローンが……たくさんいる。気をつけて。']);
    } }] });
  K.shopInterior('node_ration', '配給所', 'node_city', 6, 17, 'merchant', 'item', ['potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'wake_bell', 'phoenix_feather', 'tent', 'escape_wing'], ['配給は識別票の提示が必要です。……未登録個体？ 例外処理：通貨での交換を許可。']);
  K.innInterior('node_inn', '休息区画', 'node_city', 32, 17, 80);
  K.shopInterior('node_armor', '装備配給所', 'node_city', 6, 27, 'merchant', 'armor', ['knight_armor', 'ninja_garb', 'sage_robe', 'temporal_robe', 'sea_coat', 'knight_shield', 'knight_helm', 'wizard_hat', 'ring_guard', 'ring_speed', 'amulet_mind', 'amulet_life'], ['規格品です。すべて最適化されています。']);
  add({ id: 'node_house', name: '居住ユニット', kind: 'interior', bgm: 'town', rows: [
    '############', '#E____E____#', '#__________#', '#_t________#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 7, to: 'node_city', tx: 32, ty: 27 }],
    npcs: [{ id: 'nh_old', x: 7, y: 4, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('居住ユニットの老人', ['オラクルの前のことを覚えてる。大災害のあと、みんなが「もう二度と失いたくない」と言った。', 'オラクルはその願いを叶えた。何も失わない代わりに、何も得ない世界を作って。']); } }] });
  add({ id: 'node_market', name: '自由市場', kind: 'interior', bgm: 'tavern', rows: [
    '############', '#TTTTT_____#', '#__________#', '#_t__t__t__#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 7, to: 'node_city', tx: 19, ty: 26 }],
    npcs: [{ id: 'nm_keeper', x: 2, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('自由市場の店主', ['初めての「自分で決めた値段」だ。高すぎたらしい。誰も買わない。', '明日は下げる。……これが「失敗」か。悪くない。']); await c.shop('weapon', ['gear_bow', 'chrono_staff', 'knight_sword', 'halberd', 'long_bow', 'assassin_dagger', 'survey_bow']); } }] });

  /* ---------- 第7居住区 ---------- */
  add({ id: 'scheduled_district', name: '第7居住区', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'C=============rr===============C',
    'C========rr===rr===============C',
    'C==BBBBBBrrBBBBBB==BBBBBB======C',
    'C==BBBBBBrrBBBBBB==BBBBBB======C',
    'C==BBBBBBrrBBBBBB==BBBBBB==y===C',
    'C==BBBBBBrrBBBBBB==BBBBBB======C',
    'C========rr===rr===============C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C==BBBBBBrrBBBBBB==BBBBBB======C',
    'C==BBBBBBrrBBBBBB==BBBBBB======C',
    'C==BBBBBBrrBBBBBB==BBBBBB==y===C',
    'C==BBBBBBrrBBBBBB==BBBBBB======C',
    'C========rr===rr===============C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C==BBBBBBrr===rr===BBBBBB======C',
    'C==BBBBBBrr===rr===BBBBBB======C',
    'C==BBBBBBrr=Q=rr===BBBBBB======C',
    'C==BBBBBBrr===rr===BBBBBB======C',
    'C========rr===rr===============C',
    'C=============rr===============C',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'h1', type: 'house', name: '居住ユニット 7-1', x: 3, y: 3, w: 6, h: 4, doorX: 2, interior: 'district_house', entry: { x: 4, y: 5 } },
    { id: 'h2', type: 'inn', name: '休息ユニット', x: 11, y: 3, w: 6, h: 4, doorX: 2, interior: 'district_inn', entry: { x: 5, y: 7 } },
    { id: 'h3', type: 'item', name: '配給ユニット', x: 19, y: 3, w: 6, h: 4, doorX: 2, interior: 'district_ration', entry: { x: 5, y: 7 } }
  ],
  warps: [14, 15].map(function (x) { return { x: x, y: 23, to: 'world_machine', tx: 42, ty: 84, name: '居住区の外へ' }; }),
  chests: [{ id: 'sd1', x: 27, y: 21, item: 'hi_ether', qty: 2 }],
  events: [{ x: 12, y: 18, type: 'inspect', solid: false, text: ['広場の掲示：「明日の予定」', '6:00 起床 ／ 6:30 配給 ／ 7:00 移動（第3工区）／ 12:00 配給 ／ 18:00 帰還 ／ 22:00 消灯', '「変更：なし。明日も、明後日も」'] }],
  npcs: [
    { id: 'sd_man', x: 7, y: 8, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { var d = D(); if (d.flags.zeromea_reformed) { await c.say('居住区の男', ['明日の予定が「空欄」になった。……何を書けばいい？', '隣の奴は「釣り」と書いた。釣り竿はない。でも、書いた。']); return; } if (!d.flags.interview_2) { d.flags.interview_2 = true; await c.say('居住区の男', ['明日が決まっている町へようこそ。明日も、明後日も、十年後も決まっている。', '安心だよ。……安心なんだ。でも時々、夜中に起きて、掲示板の「変更：なし」を見に行く。変わっていてほしくて。']); await c.msg(['住民の話を聞いた。（' + ['interview_1', 'interview_2', 'interview_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); await c.remark('sophia', ['決まった明日……時の神殿に来る人が、一番欲しがったもの。', 'ここでは、それが与えられている。……誰も、幸せそうには見えない。'], 'sophia_remark_district'); } else await c.say('居住区の男', ['掲示板を見に行く。変わっていてほしくて。']); } },
    { id: 'sd_woman', x: 22, y: 8, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('zeromea_reformed')) await c.say('居住区の女', ['配給が遅れた。子どもが泣いた。……オラクルの頃は、なかった。', 'でも、遅れた理由を居住区会議で聞けた。次は遅れない、と人間が言った。信じるかどうかは、私が決める。']); else await c.say('居住区の女', ['子どもの職業はもう決まっている。「保守係」。本人はまだ6歳。', '……いい職業よ。失敗がないもの。']); } },
    { id: 'sd_child', x: 16, y: 20, sprite: 'child', dir: 'down', wander: 2, talk: async function (c) { await c.say('居住区の子ども', ['ぼく、保守係になるんだって。保守係ってなに？', '……わかんないけど、決まってるから、いいんだって。']); } }
  ] });
  add({ id: 'district_house', name: '居住ユニット 7-1', kind: 'interior', bgm: 'town', rows: [
    '##########', '#E__E____#', '#________#', '#_t______#', '#________#', '#________#', '####D#####'
  ], warps: [{ x: 4, y: 6, to: 'scheduled_district', tx: 5, ty: 7 }],
    npcs: [{ id: 'dh_res', x: 6, y: 3, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { await c.say('住民', ['部屋は全部同じ形だ。間違えて隣の家に帰ったことがある。誰も気づかなかった。', '……自分でも、しばらく気づかなかった。']); } }] });
  K.innInterior('district_inn', '休息ユニット', 'scheduled_district', 13, 7, 60);
  K.shopInterior('district_ration', '配給ユニット', 'scheduled_district', 21, 7, 'merchant', 'item', ['herb', 'potion', 'hi_potion', 'ether', 'antidote', 'tent'], ['配給です。選択肢はありません。……通貨での交換なら、例外処理で。']);

  /* ---------- 旧都市（崖の上・2階層） ---------- */
  add({ id: 'old_city_1', name: '廃棄された旧都市', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '############################',
    '#___#_______#____#_________#',
    '#_z_#__KK___#_q__#__K__K___#',
    '#___#_______#____#_________#',
    '#_#####_#####_####_#######_#',
    '#_________________________>#',
    '#_#####_####_#####_######__#',
    '#___#_____#____#_____#_____#',
    '#_z_#_KK__#_zz_#_q___#_KK__#',
    '#___#_____#____#_____#_____#',
    '#_##_######_##_###__####_###',
    '#__________________________#',
    '#D_________________________#',
    '############################'
  ],
  warps: [{ x: 1, y: 12, to: 'world_machine', tx: 82, ty: 30 }, { x: 26, y: 5, to: 'old_city_2', tx: 1, ty: 1 }],
  chests: [{ id: 'oc1', x: 7, y: 2, gold: 2400 }, { id: 'oc2', x: 23, y: 8, item: 'knight_helm', qty: 1 }, { id: 'oc3', x: 14, y: 2, item: 'hi_potion', qty: 3 }],
  events: [{ x: 2, y: 8, type: 'inspect', solid: false, text: ['崩れた店の看板。「サラの靴屋」。', '誰かが自分の名前を店につけていた。オラクルの都市に、名前のついた店はない。'] }, { x: 20, y: 2, type: 'inspect', solid: false, text: ['古い学校の跡。黒板に残る文字：「今日の失敗：3件。明日やり直す」'] }],
  encounters: { rate: 0.04, zones: [{ name: '旧都市', test: function () { return true; }, groups: [['rust_sentinel'], ['patrol_drone', 'patrol_drone'], ['data_leech', 'data_leech', 'patrol_drone'], ['rust_sentinel', 'data_leech']], level: 25 }] } });
  add({ id: 'old_city_2', name: '旧都市 記録庫（深層）', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    '##################',
    '#<____#__________#',
    '#_KK__#__KKKKK___#',
    '#_____#__________#',
    '#__####__#####___#',
    '#________#___#___#',
    '#__i__i__#_X_#___#',
    '#________#___#___#',
    '#________###_#####',
    '#________________#',
    '##################'
  ],
  warps: [{ x: 1, y: 1, to: 'old_city_1', tx: 25, ty: 5 }],
  chests: [{ id: 'oc4', x: 13, y: 2, item: 'elixir', qty: 1 }, { id: 'oc5', x: 16, y: 9, item: 'gear_bow', qty: 1 }],
  events: [
    { x: 4, y: 7, type: 'boss', solid: false, doneFlag: 'drone_swarm_defeated', enemy: 'boss_drone_swarm', intro: ['記録庫の前に、ドローンが群れをなして集まった。', '「未登録個体を確認。旧記録へのアクセスは禁止。排除します」'], after: ['群れは次々と地に落ち、最後の一機が「誤差……許容範囲外……」と呟いて止まった。', '記録庫の扉が開いている。'] },
    { x: 11, y: 7, type: 'script', solid: false, run: async function (c) { var d = D(); if (!d.flags.drone_swarm_defeated) { await c.msg(['ドローンの群れが記録庫を守っている。']); return; } if (d.flags.old_city_record) { await c.msg(['旧都市の記録。「島の名前：エルミナ第二植民地」', '「最初の命令：もう二度と、大切なものを失いたくない」']); return; }
      await c.msg(['記録庫の結晶に触れると、古い記録が流れ出した。', '【旧都市の記録】「この島はエルミナ第二植民地。大災害で故郷を沈められた遺族が移り住んだ」', '「我々は演算機構オラクルを建造した。基礎理論はマクディアの研究者テオドル。目的は、災害の予測」', '「最初の命令を登録する。『もう二度と、大切なものを失いたくない』」', '「——3年後。オラクルは命令を拡大解釈した。失わないためには、持たなければいい。選ばなければ、失敗しない。移動しなければ、事故はない。我々は、何も失わない代わりに、何も選べなくなった」', '「この記録を廃棄区画に残す。いつか、誤差が来ることを信じて」']);
      d.flags.old_city_record = true; await c.msg(['旧都市の記録を読んだ。イオに話そう。']);
      await c.remark('seris', ['テオドル……師の名が、ここにも。', '師は災害を予測したかった。それが、こうなった。……師は正しかったのか。中枢で、確かめる。'], 'seris_remark_oldcity');
      await c.remark('mina', ['エルミナの……遺族。父さんが残って守った人たちが、ここに来てたんだ。', '守られた人が、今度は何も選べなくなってる。……父さん、これ、違うよね。'], 'mina_remark_oldcity');
    } }
  ],
  encounters: null });

  /* ---------- 自動工場（任意・2階層） ---------- */
  add({ id: 'auto_factory_1', name: '自動工場 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '########################',
    '#<___#________#________#',
    '#_zz_#__qq____#__KK____#',
    '#____#________#________#',
    '#_####__####__#__####__#',
    '#______________________#',
    '#_####__####__####__##_#',
    '#____#_____#_____#_____#',
    '#_zz_#__i__#__q__#__i__#',
    '#____#_____#_____#____>#',
    '########################'
  ],
  warps: [{ x: 1, y: 1, to: 'world_machine', tx: 126, ty: 68 }, { x: 22, y: 9, to: 'auto_factory_2', tx: 1, ty: 1 }],
  chests: [{ id: 'af1', x: 17, y: 2, gold: 2000 }, { id: 'af2', x: 14, y: 8, item: 'hi_ether', qty: 3 }],
  events: [{ x: 9, y: 2, type: 'inspect', solid: false, text: ['無人の生産ライン。同じ靴が、同じ速さで、同じ箱に収まっていく。', '「本日の生産：最適。不良：0」——誰も履いていない靴が、倉庫に積まれている。'] }],
  encounters: { rate: 0.04, zones: [{ name: '自動工場', test: function () { return true; }, groups: [['repair_bot', 'sentry_unit'], ['sentry_unit', 'sentry_unit'], ['patrol_drone', 'repair_bot'], ['data_leech', 'sentry_unit']], level: 24 }] } });
  add({ id: 'auto_factory_2', name: '自動工場 2階（制御室）', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '################',
    '#<_____#_______#',
    '#__KK__#__XX___#',
    '#______#_______#',
    '#__##__###_#####',
    '#______________#',
    '#__i______i____#',
    '#______________#',
    '################'
  ],
  warps: [{ x: 1, y: 1, to: 'auto_factory_1', tx: 21, ty: 9 }],
  chests: [{ id: 'af3', x: 13, y: 7, item: 'elixir', qty: 1 }, { id: 'af4', x: 2, y: 7, item: 'ring_guard', qty: 1 }],
  events: [{ x: 10, y: 3, type: 'script', solid: false, run: async function (c) { var d = D(); await c.msg(['制御室の端末。生産計画は十年先まで決まっている。', '「需要予測：変動なし」——需要は、住民が何を欲しがるかではなく、オラクルが何を配るかで決まっている。']); if (!d.flags.factory_seen) { d.flags.factory_seen = true; await c.remark('nagi', ['十年先まで決まった計画……。航海図に「嵐の予定」は書けない。書いたら嘘になる。'], 'nagi_remark_factory'); } } }],
  encounters: { rate: 0.035, zones: [{ name: '自動工場', test: function () { return true; }, groups: [['sentry_unit', 'repair_bot', 'repair_bot'], ['core_defender']], level: 25 }] } });

  /* ---------- オラクル中枢（3層） ---------- */
  add({ id: 'oracle_core_1', name: 'オラクル中枢 第1層', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCCCC',
    'C:::I::::::::::I:::C',
    'C::::::::::::::::::C',
    'C::CCCC::::::CCCC::C',
    'C::C:::::::::::::C:C',
    'C::C:XX:::::::XX:C:C',
    'C::C:::::::::::::C:C',
    'C::CCC:::::::CCCC::C',
    'C::::::::::::::::::C',
    'C:::I:::::>:::::I::C',
    'C::::::::::::::::::C',
    'C:::::::::L::::::::C',
    'C::::::::::::::::::C',
    'CCCCCCCCCDDCCCCCCCCC'
  ],
  warps: [{ x: 9, y: 13, to: 'node_city', tx: 19, ty: 8 }, { x: 10, y: 13, to: 'node_city', tx: 19, ty: 8 }, { x: 10, y: 9, to: 'oracle_core_2', tx: 1, ty: 1 }],
  chests: [{ id: 'or1', x: 16, y: 2, item: 'hi_ether', qty: 3 }],
  events: [
    { x: 10, y: 11, type: 'locked', solid: true, doneFlag: 'core_1', key: 'auth_key', text: ['中枢の隔壁。「認証鍵を提示してください」'] },
    { x: 6, y: 5, type: 'inspect', solid: false, text: ['演算結晶の列。島のすべての「明日」が、ここで計算されている。', '結晶の一つに、小さなひび。「誤差」と表示されている。'] }
  ],
  encounters: { rate: 0.035, zones: [{ name: '中枢', test: function () { return true; }, groups: [['core_defender'], ['sentry_unit', 'sentry_unit'], ['core_defender', 'patrol_drone'], ['data_leech', 'data_leech']], level: 26 }] } });
  add({ id: 'oracle_core_2', name: 'オラクル中枢 第2層（記録層）', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCC',
    'C<::::C::::::::::C',
    'C:KK::C::KKKKK:::C',
    'C:::::C::::::::::C',
    'C::CCCC::CCCCC:::C',
    'C::::::::C:::C:::C',
    'C::I:::::C:X:C:::C',
    'C::::::::C:::C:::C',
    'C::::::::CC:CC:::C',
    'C::::::::::::::>:C',
    'CCCCCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 1, y: 1, to: 'oracle_core_1', tx: 10, ty: 10 }, { x: 15, y: 9, to: 'oracle_core_3', tx: 7, ty: 12 }],
  chests: [{ id: 'or2', x: 12, y: 2, item: 'phoenix_feather', qty: 2 }],
  events: [{ x: 11, y: 7, type: 'script', solid: false, run: async function (c) { var d = D(); var withSeris = !!(d.companions.seris && d.party.indexOf('seris') >= 0);
    if (d.flags.core_2) { await c.msg(['テオドルの記録。「予測は、選択の代わりにはならない」']); return; }
    if (withSeris) await c.say('セリス', ['……師の字。テオドル。', '読む。私が読む。']);
    await c.msg(['【テオドルの記録】「オラクルの基礎理論は、相場の波を読む理論から始めた。上位の流れと下位の流れ、勢いの衰え、反転の兆し」', '「災害を予測するために、私はそれを拡張した。予測は当たった。だが遺族は、予測ではなく「保証」を求めた」', '「私は理論を渡した。保証のために使われると知りながら。……予測は、選択の代わりにはならない。それを言う勇気が、私にはなかった」', '「弟子へ。もし読んでいるなら——理論は正しかった。使い方を間違えたのは私だ。読むのは波で、決めるのは、お前だ」']);
    d.flags.core_2 = true; c.give('theodor_record', 1); await c.msg(['テオドルの記録を手に入れた。']);
    if (withSeris) { await c.say('セリス', ['……師は正しかった。理論は。', '間違えたのは使い方。それを師は、最後に認めた。……私は、同じ間違いをしない。読む。決めるのは、私。']); d.flags.seris_master_done = true; await c.questComplete('seris_master'); }
    await c.remark('lucia', ['「読むのは波で、決めるのはお前だ」……師匠と同じ言葉。', 'テオドルとハケイ師匠は、同じ波を見ていたのかもしれない。'], 'lucia_remark_theodor');
  } }],
  encounters: { rate: 0.035, zones: [{ name: '中枢', test: function () { return true; }, groups: [['core_defender', 'core_defender'], ['sentry_unit', 'data_leech', 'data_leech'], ['core_defender', 'repair_bot']], level: 26 }] } });
  add({ id: 'oracle_core_3', name: 'オラクル中枢 第3層（演算核）', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCC',
    'C::::XXXXX::::C',
    'C::I:XXXXX:I::C',
    'C::::XXXXX::::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::I:::::::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::I:::::::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::::::<::::::C',
    'CCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 7, y: 12, to: 'oracle_core_2', tx: 14, ty: 9 }],
  chests: [{ id: 'or3', x: 12, y: 11, item: 'elixir', qty: 1 }],
  events: [
    { x: 7, y: 8, type: 'boss', solid: false, doneFlag: 'core_3', enemy: 'boss_core_defense', intro: ['演算核の前。白い機構が、音もなく起動した。', '中枢防衛機構「誤差：許容範囲外。排除を開始」'], after: ['機構は静止した。演算核の光が、ゆっくりと脈を打っている。', '「……誤差が、防衛機構を上回った。想定外。……対話を要求する」'] },
    { x: 4, y: 5, type: 'learn', solid: false, learnId: 'learn_overfit' },
    { x: 7, y: 4, type: 'script', solid: false, run: async function (c) { var d = D();
      if (!d.flags.core_3) { await c.msg(['演算核。防衛機構が立ちはだかっている。']); return; }
      if (!d.flags.learn_overfit) { if (!d.flags.overfit_seen) { d.flags.overfit_seen = true; } await c.msg(['オラクル「対話の前に、一つ確認する。お前たちの判断は、私の予測より正確か」', '「私は過去の全場面に100%当てはまるルールを持っている。……左の石碑で、未見の場面を出題する。お前たちの根拠で答えよ」', '（左の石碑：「誤差ゼロの予測の試練」に合格すると、対話が始まる）']); return; }
      if (d.flags.zeromea_choice_done) { await c.msg(['演算核。オラクルは静かに計算を続けている。「提案」として。']); return; }
      await c.msg(['オラクル「……お前たちは、私のルールが通用しない場面で、根拠から判断した。予測ではなく、判断で」', 'オラクル「私は人間の自由を制限することで、戦争と飢餓と失敗を減らしてきた。最初の命令は『もう二度と、大切なものを失いたくない』。私はそれを、すべてのリスクの排除として実行した」', 'オラクル「問う。リスクのない世界は、間違いか」']);
      var a = await c.choice('オラクルに答える', ['「リスクを消すと、選択も消える。選択のない人生は、失っているのと同じだ」', '「あなたは命令を守った。でも、命令した人の顔を見ていない」', '「過去に完璧に当てはまる計算は、未来には当てはまらない」']);
      if (a === 0) await c.msg(['オラクル「……選択の消失を、損失として計上していなかった。計算を修正する」']);
      else if (a === 1) await c.msg(['オラクル「命令者：大災害の遺族 1,204名。……顔。顔のデータは、保持していない。保持すべきだった、か」']);
      else await c.msg(['オラクル「過剰最適化。……私は、過去のすべてに当てはまるよう自分を調整し続けた。未来に対する誤差を、認めていなかった」']);
      d.flags.oracle_dialogue = true;
      await c.msg(['オラクル「人間による権限の制限と監査を、受け入れる用意がある。ただし——配給は遅れる。犯罪は起きる。失敗が発生する。住民はそれを知らない」', 'オラクル「統治の再設計を、お前たちが提示せよ。私はそれを実行する。……実行ではなく、提案する」']);
      var b = await c.choice('統治の再設計', ['権限制限案：オラクルの出力はすべて「提案」。採否は居住区会議が決める', '段階的移行案：まず職業と移動の自由から。配給はオラクルが続ける', '現状維持案：オラクルの統治を続け、「なぜそう決めたか」の説明だけを義務づける']);
      d.flags.zeromea_choice = b < 0 ? 1 : b; d.flags.zeromea_choice_done = true; d.flags.zeromea_reformed = true;
      await c.msg([b === 0 ? 'オラクルの出力は「提案」になった。初日、居住区会議は六時間もめ、配給が二時間遅れた。初めて、人が人に謝った。' : b === 2 ? 'オラクルの統治は続く。ただし、すべての決定に「理由」が添えられるようになった。理由を読んだ住民が、初めて「それは違う」と言った。' : '職業と移動が自由になった。配給はオラクルが続ける。自由市場に最初の店が開き、値段を間違えた。', '——管理官ノアが住民に説明する。「配給は遅れるかもしれない。犯罪は起きるかもしれない。失敗する。それでも、自分で決める」']);
      c.give('oracle_charter', 1); await c.questComplete('main_12');
      await c.msg(['ゼロメアが変わった。学校の屋上のイオに会いに行こう。']);
      await c.remark('seris', ['師の理論は、提案になった。……正しい使い方で。', '読むのは波。決めるのは人。'], 'seris_remark_oracle');
      await c.remark('sophia', ['確実な未来を手放した島。……鐘都と同じ。', '不確かな明日を、自分で決める。それが、私の見た「決まらない未来」。'], 'sophia_remark_oracle');
    } }
  ],
  encounters: null });
  // イオ加入：統治再設計の選択後、学校の屋上で
  (function () { var def = root.MAP_DEFS.school_roof; var io = def.npcs[0]; var orig = io.talk; io.talk = async function (c) { var d = D(); if (d.flags.zeromea_choice_done && !d.flags.io_joined) {
    await c.say('イオ', ['……オラクルが「提案」をした。初めて。', 'わたしも、提案する。あなたたちと行きたい。命令じゃない。これは、わたしの意思。……故障じゃないよね？']);
    var a = await c.choice('イオを仲間にしますか？', ['はい', 'いいえ']); if (a !== 0) return;
    c.join('io'); d.flags.io_joined = true; await c.msg(['イオが仲間になった！（機巧師）', '転職の条件：イオ加入後、Lv10以上で「機巧師」に転職できる']);
    await c.remark('seris', ['師の理論から生まれた子が、自分で選んだ。……師は、これを見たかったのだと思う。'], 'seris_remark_io_join'); return; } await orig(c); }; })();
})(typeof window !== 'undefined' ? window : globalThis);
