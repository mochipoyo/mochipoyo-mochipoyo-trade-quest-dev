/* =========================================================
   Data / Snow (v5.6 Phase 7-2) : 忘却の雪原——氷港シエル、記憶を売る町フロスト（記憶市場・記憶庫）、精霊の森（アステル加入）、凍結時計塔（隠しダンジョン3）
   ・memory_town「記憶を売る町」：母の記憶を売った少年リク。記憶庫の番人を退け、核の前で ①記憶庫を壊す ②リクの記憶だけ買い戻す（5000G）③記憶商人ヴェルと売買の上限を決める
       （③はヴェルと話してから）。報酬：見送りの首飾り
   ・aster_spirits「精霊の森」：1階で精霊の灯を3つともして扉を開く → 2階で凍てついた大精霊 → アステル加入（精霊守）
   ・hidden_frozen_tower「凍結時計塔」：アステル加入後。各階のレバーで時計を動かすと、決まった歩数のあいだだけ階段の前の扉が開く（歩数を使い切ると扉が凍り、入口へ戻される）
       → 4階で凍結の時計守（任意の強敵）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function D() { return root.State.data; }
  function inParty(id) { var d = D(); return !!(d.companions[id] && d.party.indexOf(id) >= 0); }

  /* =========================================================
     氷港シエル
     ========================================================= */
  add({ id: 'ciel_port', name: '氷港シエル', kind: 'town', bgm: 'town', fallback: 'snow', style: 'harbor', rows: [
    'xxxxxxxxxxxxxxrrxxxxxxxxxxxxxxxx',
    'xnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnx',
    'xnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnx',
    'xnnBBBBBBBBnnnrrnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnrrnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnrrnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnynrrnynnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnrrnnnnnBBBBBBBBnnx',
    'xnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnx',
    'xnrrrrrrrrrrrrrrrrrrrrrrrrrrrrnx',
    'xnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnx',
    'xnnBBBBBBBBnnnrrnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnrrnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnrrnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnqnrrnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnrrnnznnBBBBBBBBnnx',
    'xnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnx',
    'xnnnnnnnnnnnndrrdnnnnnnnnnnnnnnx',
    'xnnnn6nnnnnnndrrdnnnnnnnnn6nnnnx',
    'x~~~~~~~~~~~~~rr~~~~~~~~~~~~~~~x',
    'x~~~~~~~~~~~~~rr~~~~~~~~~~~~~~~x',
    'x~~~~~~~~~~~~~rr~~~~~~~~~~~~~~~x',
    'x~~~~~~~~~~~~~rr~~~~~~~~~~~~~~~x',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  ],
  buildings: [
    { id: 'inn', type: 'inn', name: '流氷の宿', x: 3, y: 3, w: 8, h: 5, doorX: 3, interior: 'ciel_inn', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '港の道具屋', x: 21, y: 3, w: 8, h: 5, doorX: 3, interior: 'ciel_item', entry: { x: 5, y: 7 } },
    { id: 'weapon', type: 'weapon', name: '氷港の武具店', x: 3, y: 11, w: 8, h: 5, doorX: 3, interior: 'ciel_weapon', entry: { x: 5, y: 7 } },
    { id: 'harbor', type: 'house', name: '港の詰所', x: 21, y: 11, w: 8, h: 5, doorX: 3, interior: 'ciel_harbor', entry: { x: 5, y: 7 } }
  ],
  warps: [14, 15].map(function (x) { return { x: x, y: 0, to: 'world_snow', tx: 58, ty: 93, name: '雪原へ' }; }),
  chests: [{ id: 'cp1', x: 29, y: 1, item: 'hi_potion', qty: 2 }],
  events: [{ x: 13, y: 18, type: 'inspect', solid: false, text: ['桟橋の柱に、船の名前がたくさん刻まれている。', '新しい名前の横に、古い名前を消した跡がある。……消した者は、その船のことをもう覚えていないのかもしれない。'] }],
  npcs: [
    { id: 'ci_sailor', x: 17, y: 16, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) {
      if (!c.flag('snow_arrived')) c.setFlag('snow_arrived', true);
      await c.say('氷港の船乗り', ['氷港シエルへようこそ。南の時の神殿領から来たのか。', '北の町フロストでは、記憶が売り買いされてる。貧しい者は、家族の思い出まで売っちまう。', '北西の森には精霊守がいるって話だ。……ここ数年、誰も会ってないがな。']);
      await c.remark('nagi', ['……港の柱の名前、消された船があった。', '忘れられた船の航路図も、どこかに残ってるのかな。'], 'nagi_remark_ciel');
    } },
    { id: 'ci_child', x: 8, y: 8, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('港の子ども', ['お母さんがね、去年の夏の記憶を売ったんだって。そのお金で、このコートを買ってくれた。', '……夏って、楽しかったのかな。お母さん、覚えてないって。']); } }
  ] });
  K.innInterior('ciel_inn', '流氷の宿', 'ciel_port', 6, 8, 70);
  K.shopInterior('ciel_item', '港の道具屋', 'ciel_port', 24, 8, 'merchant', 'item', ['potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'wake_bell', 'phoenix_feather', 'tent', 'escape_wing'], ['寒さで薬が凍らないように、懐に入れておきな。']);
  K.shopInterior('ciel_weapon', '氷港の武具店', 'ciel_port', 6, 16, 'merchant', 'weapon', ['ice_staff', 'fur_coat', 'halberd', 'survey_bow', 'knight_armor', 'knight_helm', 'temporal_robe'], ['北の寒さには毛皮のコートだ。']);
  add({ id: 'ciel_harbor', name: '港の詰所', kind: 'interior', bgm: 'town', rows: ['############', '#KK_qq___KK#', '#__________#', '#_tt____tt_#', '#__________#', '#_z______q_#', '#__________#', '#__________#', '#####D######'],
  warps: [{ x: 5, y: 8, to: 'ciel_port', tx: 24, ty: 16 }],
  npcs: [{ id: 'ch_master', x: 5, y: 2, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) { await c.say('港長', ['船の出入りの記録は、ここに全部ある。……全部、のはずだった。', '記録係が、自分の若い頃の記憶を売ってね。帳簿の読み方を忘れちまった。記録は残っても、読める者がいなけりゃ、ないのと同じさ。']); await c.remark('elna', ['記録を残すのと、読める人を残すのは、別の仕事なのね。'], 'elna_remark_ciel'); } }] });

  /* =========================================================
     記憶を売る町フロスト
     ========================================================= */
  add({ id: 'frost_town', name: '記憶を売る町フロスト', kind: 'town', bgm: 'town', fallback: 'snow', style: 'wood', rows: [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'xnnnnnnnnnnnnnnBBBBBBBBBBnnnnnnnnnnnnnnx',
    'xnnnnnnnnnnnnnnBBBBBBBBBBnnnnnnnnnnnnnnx',
    'xnnBBBBBBBBnnnnBBBBBBBBBBnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnBBBBBBBBBBnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnBBBBBBBBBBnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnBBBBBBBBBBnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnnnnnnnnnnnnynnnnrrnnnnynnnnnnnnnnnnnx',
    'xnnnnnnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnnnnx',
    'xnrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrnx',
    'xnrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrnx',
    'xnnnnnnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnnnnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnn6nnrQnn6nnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnnnnnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnnnnx',
    'xnrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrnx',
    'xnrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnnennrrnnennnnnBBBBBBBBnnx',
    'xnnBBBBBBBBnnnnnnnnrrnnnnnnnnBBBBBBBBnnx',
    'xnnnnnnnnnnnqnnnnnnrrnnnnnnznnnnnnnnnnnx',
    'xnnnnnnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnnnnx',
    'xnnnnnnnnnnnnnnnnnnrrnnnnnnnnnnnnnnnnnnx',
    'xxxxxxxxxxxxxxxxxxxrrxxxxxxxxxxxxxxxxxxx'
  ],
  buildings: [
    { id: 'market', type: 'guild', name: '記憶市場', x: 15, y: 1, w: 10, h: 6, doorX: 4, interior: 'memory_market', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '雪灯りの宿', x: 3, y: 3, w: 8, h: 5, doorX: 3, interior: 'frost_inn', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: 'フロストの道具屋', x: 29, y: 3, w: 8, h: 5, doorX: 3, interior: 'frost_item', entry: { x: 5, y: 7 } },
    { id: 'weapon', type: 'weapon', name: 'フロストの武器屋', x: 3, y: 13, w: 8, h: 5, doorX: 3, interior: 'frost_weapon', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: 'フロストの防具屋', x: 29, y: 13, w: 8, h: 5, doorX: 3, interior: 'frost_armor', entry: { x: 5, y: 7 } },
    { id: 'vault', type: 'bank', name: '記憶庫', x: 3, y: 21, w: 8, h: 5, doorX: 3, interior: 'memory_vault', entry: { x: 10, y: 14 } },
    { id: 'house', type: 'house', name: 'リクの家', x: 29, y: 21, w: 8, h: 5, doorX: 3, interior: 'frost_house', entry: { x: 5, y: 7 } }
  ],
  warps: [19, 20].map(function (x) { return { x: x, y: 29, to: 'world_snow', tx: 82, ty: 55, name: '雪原へ' }; }),
  chests: [{ id: 'ft_c1', x: 38, y: 1, item: 'ether', qty: 2 }],
  events: [{ x: 20, y: 15, type: 'inspect', solid: true, text: ['凍った噴水。台座に「思い出は、売れる。だから、売るな」と刻まれ、「売るな」の部分だけ削られている。'] }],
  npcs: [
    { id: 'fr_riku', x: 22, y: 16, sprite: 'child', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (c.questDone('memory_town')) { await c.say('リク', [['母さんの顔、思い出せた。……怒ってる顔も、笑ってる顔も。', '記憶、戻ってきた。値段のつかないものって、あるんだね。', '町の決まりができたんだ。思い出は、半分までしか売れないって。……母さんの記憶、全部は売らなくてよかった。'][d.flags.memory_choice || 0]]); return; }
      if (d.flags.memory_core_done) {
        await c.say('リク', ['……あ。', '母さんが、首にかけてたもの。思い出した。「迷ったら、見送ってもいいんだよ」って、いつも言ってた。']);
        await c.say('リク', ['これ、あげる。母さんの首飾り。ずっと持ってたのに、誰のものか分からなかったんだ。']);
        await c.questComplete('memory_town'); await c.msg(['見送りの首飾りを受け取った！（防御中の被ダメージをさらに40%軽減）']);
        await c.remark('lina', ['お金じゃ買い戻せないもの……。癒やし手にも、治せないものがある。', 'でも、思い出す手伝いなら、できるのかもしれない。'], 'lina_remark_riku');
        return;
      }
      if (!c.questActive('memory_town')) {
        await c.say('リク', ['……母さんの記憶を売ったんだ。冬に、パンが買えなくて。', '母さんはもういない。だから、記憶があっても腹はふくれないと思った。', 'でも、母さんの顔が思い出せないんだ。……思い出せないって、こんなに寒いんだね。']);
        c.questStart('memory_town'); d.flags.memory_town_started = true;
        await c.say('リク', ['僕の記憶は、町の南西の「記憶庫」に預けられてる。記憶市場のヴェルさんが、売り買いを仕切ってる。']);
        return;
      }
      await c.say('リク', ['記憶庫は町の南西。記憶市場は北の大きな建物だよ。']);
    } },
    { id: 'fr_yoan', x: 14, y: 26, sprite: 'merchant', dir: 'down', wander: 1, talk: async function (c) { var d = D();
      if (d.flags.memory_choice === 0) { await c.say('ヨアン', ['買った記憶が、全部消えた。……他人の母親の記憶だったが、温かかったんだ。', 'わかってる。もともと、俺のものじゃなかった。']); return; }
      await c.say('裕福な男ヨアン', ['俺は子どもの頃に母を亡くして、顔を覚えていない。', 'だから記憶市場で「母の記憶」を買った。誰の母かは知らない。……温かいんだよ。', '盗んだわけじゃない。金を払って買ったんだ。']); } },
    { id: 'fr_elder', x: 10, y: 8, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('フロストの古老', ['この町は、昔は記録の町だった。一族の歴史を、壁に刻んで残していた。', 'それが「重い」と言い出す者が出て、記憶を売るようになった。軽くなって、楽になって……今は、自分が誰かも曖昧な者が多い。', '北西の森の精霊が眠ったのも、その頃からじゃ。名を呼ぶ者がいなくなったからの。']); } },
    { id: 'fr_gate', x: 21, y: 27, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say('町の番兵', ['記憶を売りに来たのか？ 買いに来たのか？ ……どっちでもない？ 珍しいな。', '記憶市場は北、記憶庫は南西だ。']); } }
  ] });
  K.innInterior('frost_inn', '雪灯りの宿', 'frost_town', 6, 8, 70);
  K.shopInterior('frost_item', 'フロストの道具屋', 'frost_town', 32, 8, 'merchant', 'item', ['potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'wake_bell', 'phoenix_feather', 'tent', 'escape_wing'], ['薬は売るよ。記憶は、売ってない。']);
  K.shopInterior('frost_weapon', 'フロストの武器屋', 'frost_town', 6, 18, 'merchant', 'weapon', ['ice_staff', 'tiger_claw', 'halberd', 'survey_bow', 'gear_bow', 'chrono_staff'], ['氷晶の杖は、精霊守の杖を真似て作ったんだ。']);
  K.shopInterior('frost_armor', 'フロストの防具屋', 'frost_town', 32, 18, 'villager_f', 'armor', ['fur_coat', 'knight_armor', 'temporal_robe', 'knight_shield', 'knight_helm', 'wizard_hat'], ['毛皮のコートは、雪原の必需品よ。']);
  add({ id: 'frost_house', name: 'リクの家', kind: 'interior', bgm: 'town', rows: ['############', '#E__KK___E_#', '#__________#', '#_t______q_#', '#__________#', '#_z________#', '#__________#', '#__________#', '#####D######'],
  warps: [{ x: 5, y: 8, to: 'frost_town', tx: 32, ty: 26 }],
  npcs: [{ id: 'fh_grandma', x: 6, y: 3, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('リクの祖母', ['あの子の母親は、わたしの娘だよ。', '娘のことは、わたしが覚えている。でも、わたしの記憶をあの子に渡すことはできないんだよ。……記憶は、自分で持つしかないのさ。']); } }] });

  /* ---------- 記憶市場（記憶商人ヴェル） ---------- */
  add({ id: 'memory_market', name: '記憶市場', kind: 'interior', bgm: 'town', rows: ['############', '#XXX_qq_XXX#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#_X______X_#', '#__________#', '#__________#', '#####D######'],
  warps: [{ x: 5, y: 8, to: 'frost_town', tx: 19, ty: 7 }],
  npcs: [
    { id: 'mm_vel', x: 5, y: 2, sprite: 'debt_collector', dir: 'down', wander: 0, talk: async function (c) { var d = D();
      if (c.questDone('memory_town')) { await c.say('記憶商人ヴェル', [['……記憶庫は壊れた。商売もおしまいだ。', '金で買い戻すとはね。……あんたのほうが、俺より商人らしい。', '上限つきの市場、か。儲けは減ったが、客は減らなかった。売りすぎて壊れる客がいなくなったからな。'][d.flags.memory_choice || 0]]); return; }
      d.flags.vel_talked = true;
      await c.say('記憶商人ヴェル', ['記憶市場へようこそ。記憶は結晶にして、記憶庫に保管している。', '売るのは自由、買うのも自由。俺は値をつけて、取引を記録するだけだ。']);
      if (c.questActive('memory_town')) {
        await c.say('記憶商人ヴェル', ['リクの母親の記憶？ ……ああ、買い手がついている。ヨアンって男だ。', '買い戻すなら5000G。安くはないが、記憶の値段としては普通だ。', 'それとも、あんたたちは市場ごと壊しに来たのか？ 壊せば、全員の記憶が戻る。代わりに、金を払って買った者は、買った記憶を失う。']);
        var ch = await c.choice('ヴェルに何と言う？', ['売買に上限を決めないか', '……考えておく']);
        if (ch === 0) { d.flags.vel_cap_offered = true; await c.say('記憶商人ヴェル', ['上限？ ……思い出は半分まで、とでも？', '面白い。売りすぎて、自分が誰かわからなくなった客は、二度と市場に来ない。商売としても損だ。', '記憶庫の核の前で決めな。番人を退けられたら、の話だがね。']); }
      }
    } },
    { id: 'mm_seller', x: 2, y: 6, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { await c.say('記憶を売りに来た女', ['夫と喧嘩した日の記憶を売るの。嫌な記憶は、高く売れないけど。', '……でも、仲直りした日の記憶まで薄くなるのは、なぜかしら。']); } }
  ] });

  /* ---------- 記憶庫（1階層：番人 → 核の前の選択） ---------- */
  add({ id: 'memory_vault', name: '記憶庫', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCC:X::X:CCCCCCCC',
    'CCCCCCCC::::::CCCCCCCC',
    'CCCCCCCC::::::CCCCCCCC',
    'CCC::::::::::::::::CCC',
    'CCC:CCCCCCCCCCCCCC:CCC',
    'CCC:CCCCCCCCCCCCCC:CCC',
    'CCC:CCCCCCCCCCCCCC:CCC',
    'CCC:CCCCCCCCCCCCCC:CCC',
    'CCC:CCCCCCCCCCCCCC:CCC',
    'CCC::::::::::::::::CCC',
    'CCCCC:CCCC::CCCC:CCCCC',
    'CCCCC::CCC::CCC::CCCCC',
    'CCCCC::CCC::CCC::CCCCC',
    'CCCCCCCCCC::CCCCCCCCCC',
    'CCCCCCCCCC<<CCCCCCCCCC'
  ],
  warps: [10, 11].map(function (x) { return { x: x, y: 15, to: 'frost_town', tx: 6, ty: 26 }; }),
  chests: [{ id: 'mv1', x: 5, y: 12, item: 'hi_ether', qty: 1 }, { id: 'mv2', x: 16, y: 12, item: 'elixir', qty: 1 }],
  events: [
    { x: 11, y: 3, type: 'boss', solid: true, tile: 'boss_mark', doneTile: 'floor_stone', doneFlag: 'memory_keeper_defeated', requireFlag: 'memory_town_started', lockedText: ['記憶の結晶が、壁一面に並んでいる。奥に大きな影がある。……今は近づかないほうがいい。'], enemy: 'boss_memory_keeper', intro: ['結晶の光が集まり、仮面の番人が立ち上がった。', '記憶庫の番人「売ラレタ記憶ハ、買イ手ノモノ。持チ出スナラ、オ前ノ記憶ヲ置イテイケ」'], after: ['番人は結晶の粉になって崩れた。', '奥の核の結晶が、静かに脈打っている。'] },
    { x: 10, y: 1, type: 'script', solid: true, tile: 'crystal', run: async function (c) { var d = D();
      if (!d.flags.memory_keeper_defeated) { await c.msg(['記憶庫の核。町じゅうの記憶の結晶が、ここにつながっている。番人が守っている。']); return; }
      if (d.flags.memory_core_done) { await c.msg(['記憶庫の核。' + ['光は消えている。', 'リクの記憶の結晶だけが、取り出されている。', '結晶のひとつひとつに、「半分まで」と刻まれた札がかけられている。'][d.flags.memory_choice || 0]]); return; }
      await c.msg(['核の結晶に、リクの母の記憶が見える。雪の日、小さな手を引いて歩く女性の背中。']);
      var opts = ['記憶庫を壊す（全員の売った記憶が戻る。買った者は失う）', 'リクの記憶だけ買い戻す（5000G）'];
      if (d.flags.vel_cap_offered) opts.push('ヴェルと決めたとおり、売買に上限を設ける（思い出は半分まで）');
      opts.push('今は決めない');
      var ch = await c.choice('どうする？', opts);
      if (ch < 0 || ch === opts.length - 1) return;
      if (ch === 1 && d.gold < 5000) { await c.msg(['所持金が足りない。（5000G）']); return; }
      if (ch === 0) { await c.msg(['核の結晶を砕いた。', '町じゅうに光の粒が散っていく。……売られた記憶が、もとの持ち主へ帰っていく。', '代わりに、金を払って記憶を買った者たちの胸から、温かいものが消えていった。']); }
      else if (ch === 1) { d.gold -= 5000; await c.msg(['ヴェルの帳簿に5000Gを記した。', 'リクの母の記憶の結晶だけが、核から外れた。']); }
      else { await c.msg(['ヴェルを呼び、核の前で取り決めを交わした。', '「思い出は半分まで。残りの半分は、売った者が持っていること」', 'リクの記憶の半分が、取り決めの最初の一件として、リクのもとへ戻された。']); }
      d.flags.memory_choice = ch; d.flags.memory_core_done = true;
      await c.msg(['リクのところへ戻ろう。']);
      await c.remark('sophia', ['記憶は、過去を見るためのもの。未来を見るわたしには……少し、うらやましい。'], 'sophia_remark_vault');
    } }
  ],
  encounters: { rate: 0.04, zones: [{ name: '記憶庫', test: function () { return true; }, groups: [['memory_eater'], ['ice_wraith', 'memory_eater'], ['memory_eater', 'memory_eater']], level: 26 }] } });

  /* =========================================================
     精霊の森（2階層）：精霊の灯 → 凍てついた大精霊 → アステル
     ========================================================= */
  var FOREST_ENC = { rate: 0.04, zones: [{ name: '精霊の森', test: function () { return true; }, groups: [['frost_wolf', 'frost_wolf'], ['ice_wraith'], ['frost_harpy', 'ice_wraith'], ['snow_golem']], level: 26 }] };
  function lightStone(n, x, y) { return { x: x, y: y, type: 'script', solid: true, tile: 'lamp', doneTile: 'torch', tileFlag: 'spirit_light_' + n, run: async function (c) { var d = D(); var f = 'spirit_light_' + n;
    if (d.flags[f]) { await c.msg(['精霊の灯が、青白く燃えている。']); return; }
    await c.msg(['凍りついた灯籠。表面に古い文字で、精霊の名前が刻まれている。', '……声に出して、その名を読んだ。']);
    d.flags[f] = true; var lit = [1, 2, 3].filter(function (i) { return d.flags['spirit_light_' + i]; }).length;
    await c.msg(['灯籠に、青白い火がともった。（精霊の灯 ' + lit + '/3）']);
    if (lit >= 3) { d.flags.spirit_lights = true; await c.msg(['森の奥で、凍った扉がきしむ音がした。']); }
  } }; }
  add({ id: 'spirit_forest_1', name: '精霊の森', kind: 'dungeon', bgm: 'dungeon', fallback: 'snow', rows: [
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFF>FF',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFnFF',
    'FFFnnnnnnnnnnnnFFFFFFFFFFFFnFF',
    'FFFnFFFFFFFFFFnFFFFFFFFFFFFnFF',
    'FFFnFFFFFFFFFFnFFFFFFFFFFFFnFF',
    'FFFnFFFFFFnnnFnFFFFFFFnnnnnnFF',
    'FFFnFFFFFFnnnnnFFFFFFFnFFFFFFF',
    'FFFnFFFFFFnnnFnFFFFFFFnFFFFFFF',
    'FFFnFFFFFFFFFFnFFFnnnnnFFFFFFF',
    'FFFnnnnnnFFFFFnFFFnnnFnnnnnnFF',
    'FFFFFFFFnFFFFFnFFFFFFFnFFFFFFF',
    'FFFFFFFFnFFFFFnFFFFFFFnFFFFFFF',
    'FFFFFFFFnFFFFFnnnnnnnnnFFFFFFF',
    'FFFFFFFFnFFFFFFFFFFFFFFFFFFFFF',
    'nnnnnnnnnFFFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
  ],
  warps: [{ x: 0, y: 15, to: 'world_snow', tx: 34, ty: 31, name: '森の外へ' }, { x: 27, y: 1, to: 'spirit_forest_2', tx: 2, ty: 14 }],
  chests: [{ id: 'sf_c1', x: 12, y: 8, item: 'hi_potion', qty: 2 }, { id: 'sf_c2', x: 20, y: 10, item: 'fur_coat', qty: 1 }],
  events: [lightStone(1, 10, 6), lightStone(2, 18, 9), lightStone(3, 27, 10),
    { x: 27, y: 4, type: 'gate', solid: true, needFlag: 'spirit_lights', doneFlag: 'spirit_gate', text: ['氷に閉ざされた木の扉。三つの灯籠の名が刻まれている。', '……森の灯籠に火をともせば、開くのかもしれない。'], openText: ['三つの灯の光が集まり、扉の氷が溶けた。'], questStart: 'aster_spirits' }],
  encounters: FOREST_ENC });
  add({ id: 'spirit_forest_2', name: '精霊の森 奥', kind: 'dungeon', bgm: 'boss_area', fallback: 'snow', rows: [
    'FFFFFFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFnnnnnnnnnnnFFF',
    'FFFFFFFFFFnnnnnnnnnnnFFF',
    'FFFFFFFFFFnnnnnnnnnnnFFF',
    'FFFFFFFFFFnnnnnnnnnnnFFF',
    'FFFFFFFFFFnnnnnnnnnnnFFF',
    'FFFFFFFFFFFFnFFFFFFFFFFF',
    'FFFFFFnnnnnnnFFFFFFFFFFF',
    'FFFFFFnFFFFFFFFFFFFFFFFF',
    'FFFFFFnFFFFFFFFFFFFFFFFF',
    'FFFFFFnFFFFFFFFFFFFFFFFF',
    'FFnnFFnFFFFFFFFFFFFFFFFF',
    'FFnnFFnFFFFFFFFFFFFFFFFF',
    'F<nnnnnFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFF'
  ],
  warps: [{ x: 1, y: 14, to: 'spirit_forest_1', tx: 27, ty: 2 }],
  chests: [{ id: 'sf_c3', x: 2, y: 12, item: 'phoenix_feather', qty: 1 }],
  events: [
    { x: 12, y: 7, type: 'boss', solid: true, tile: 'boss_mark', doneTile: 'snow', doneFlag: 'frost_spirit_freed', enemy: 'boss_frost_spirit', intro: ['氷の柱の奥で、巨大な精霊がうめいている。名を失い、凍りかけた大精霊だ。', '凍てついた大精霊「……ワタシハ……ダレ……ダ……」'], after: ['大精霊の氷が砕け、やわらかな光が森に広がった。', '奥から、杖を持った女性が駆けてくる。'] },
    { x: 16, y: 2, type: 'inspect', solid: true, tile: 'pillar', text: ['氷が溶けた大精霊の祠。祠の柱に、精霊の名と、名を呼んだ人々の名が刻まれている。'] }
  ],
  npcs: [{ id: 'aster', x: 15, y: 4, sprite: 'hero_sage', dir: 'down', wander: 0, showIf: 'frost_spirit_freed', talk: async function (c) { var d = D();
    if (d.flags.aster_joined) return;
    await c.say('アステル', ['……大精霊を、鎮めてくれたのね。ありがとう。わたしはアステル。この森の精霊守。', '精霊は、名を呼ばれることで形を保つの。フロストの人たちが記憶を売るようになって、精霊の名を覚えている人がいなくなった。', 'わたし一人では、名を呼び続けるのが精一杯だった。']);
    if (inParty('lina')) {
      await c.say('リーナ', ['ずっと一人で、呼び続けていたの？', '……わたしも癒やし手として、全員は救えないって思い知った。あなたは、どうやって折り合いをつけたの？']);
      await c.say('アステル', ['折り合いなんて、ついてない。', 'でも、救えなかった精霊の名も、わたしは覚えている。救うって、忘れないことでもあると思うの。']);
      await c.say('リーナ', ['……忘れないこと。うん。覚えておく。']);
    }
    await c.say('アステル', ['あなたたちと行かせて。精霊の名を、外の世界でも呼びたい。', 'それに、北東の凍結時計塔——あの扉は、精霊の火でしか溶けない。わたしが一緒なら、開けられる。']);
    c.join('aster'); d.flags.aster_joined = true;
    await c.msg(['アステルが仲間になった！（精霊守）', '転職の条件：アステル加入後、Lv10以上で「精霊守」に転職できる', '北東の凍結時計塔へ入れるようになった。']);
    await c.questComplete('aster_spirits');
  } }],
  encounters: null });

  /* =========================================================
     凍結時計塔（隠しダンジョン3・4階層）：レバーで時計を動かすと、決まった歩数のあいだだけ扉が開く
     ========================================================= */
  var TOWER = [
    { id: 'frozen_tower_1', n: 1, lever: [3, 11], gate: [19, 2], limit: 33, back: ['world_snow', 146, 39], rows: [
    'CCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCC>C',
    'CCCCCCCCCCCCCCCCCCC:C',
    'CCCCCCCCCCCCCCCCCCC:C',
    'CCCCCCCCCCCCCCCCCCC:C',
    'CCCCCCCCCCCCCC::::::C',
    'CCCCCCCCCCCCCC:CCCCCC',
    'CCCCCCCCCCCCCC:CCCCCC',
    'CCCCCCCCCCCCCC:CCCCCC',
    'CCCCCC:::::::::CCCCCC',
    'CCCCCC:CCCCCCCCCCCCCC',
    'CC::CC:CCCCCCCCCCCCCC',
    'CC::CC:CCCCCCCCCCCCCC',
    'C<:::::CCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCC'
  ] },
    { id: 'frozen_tower_2', n: 2, lever: [2, 11], gate: [19, 2], limit: 30, back: ['frozen_tower_1', 19, 3], rows: [
    'CCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCC>C',
    'CCCCCCCCCCCCCCCCC:::C',
    'CCCCCCCCCCCCCCCCC:CCC',
    'CCCCCCCCCCCCCCCCC:CCC',
    'CCCCCCCCCCCCCCCCC:CCC',
    'CCC:::::::::::::::CCC',
    'CCC:CCCCCCCCCCCCCCCCC',
    'CCC:CCCCCCCCCCCCCCCCC',
    'CCC:CCCCCCCCCCCCCCCCC',
    'CCC::::::::::CCCCCCCC',
    'CC::CCCCCCCC:CCCCCCCC',
    'CC::CCCCCCCC:CCCCCCCC',
    'C<:::::::::::CCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCC'
  ] },
    { id: 'frozen_tower_3', n: 3, lever: [2, 12], gate: [19, 2], limit: 58, back: ['frozen_tower_2', 18, 2], rows: [
    'CCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCC>C',
    'CCCCCCCCCCCCCCCC::::C',
    'CCCCCCCCCCCCCCCC:CCCC',
    'CCCCC::::::::::::CCCC',
    'CCCCC:CCCCCCCCCCCCCCC',
    'CCCCC:CCCCCCCCCCCCCCC',
    'CCCCC:CCCCCCCCCCCCCCC',
    'CCCCC:::::::::::::CCC',
    'CCCCCCCCCCCCCCCCC:CCC',
    'CCCCCCCCCCCCCCCCC:CCC',
    'CC::::::::::::::::CCC',
    'CC:::CCCCCCCCCCCCCCCC',
    'C<:::CCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCC'
  ] }
  ];
  var TOWER_ENC = { rate: 0.03, zones: [{ name: '凍結時計塔', test: function () { return true; }, groups: [['clock_soldier', 'ice_wraith'], ['snow_golem', 'clock_soldier'], ['clock_soldier', 'clock_soldier'], ['memory_eater', 'frost_harpy']], level: 36 }] };
  // 歩数の時限：d.ftTimer = { map, left, gate, done }。マップ定義の onStep から呼ばれる（world.js）
  // 塔の階を出入りしたとき：時間内に次の階へ入れば扉は開いたまま、それ以外の場所へ出たら扉は閉じる
  function towerEnter(m) {
    var d = D(); var t = d && d.ftTimer; if (!t || t.map === m.id) return;
    if (m.id === t.next) d.flags[t.done] = true; else d.flags[t.gate] = false;
    d.ftTimer = null;
  }
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(towerEnter);
  function towerStep(m, p, warping) {
    var d = D(); var t = d.ftTimer; if (!t || warping) return false;
    if (t.map !== m.id) { if (m.id === t.next) d.flags[t.done] = true; else d.flags[t.gate] = false; d.ftTimer = null; return false; }   // 時間内に上の階へ：扉は開いたまま／下りた・出た：扉は閉じる
    t.left -= 1;
    if (t.left > 0) { if (t.left <= 10 || t.left % 5 === 0) root.Win.toast('時計の針：残り ' + t.left + ' 歩'); return false; }
    d.ftTimer = null; d.flags[t.gate] = false; root.World.applyState(m);
    root.World.busy = true;
    root.Win.message(['時計の針が止まった。', '階段の前の扉が、ふたたび凍りついた。……足元の氷が割れ、入口まで滑り落ちた。']).then(function () { root.World.busy = false; root.World.enterMap(m.id, 2, 13, 'up'); });
    return true;
  }
  TOWER.forEach(function (F) {
    var gateFlag = 'ft' + F.n + '_gate', doneFlag = 'ft' + F.n + '_done';
    add({ id: F.id, name: '凍結時計塔' + (F.n > 1 ? ' ' + F.n + '階' : ''), kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: F.rows, onStep: towerStep,
      warps: [{ x: 1, y: 13, to: F.back[0], tx: F.back[1], ty: F.back[2] }, { x: 19, y: 1, to: 'frozen_tower_' + (F.n + 1), tx: 2, ty: 13 }],
      chests: [[{ id: 'ftc1', x: 2, y: 12, item: 'hi_ether', qty: 2 }], [{ id: 'ftc2', x: 2, y: 12, item: 'elixir', qty: 1 }], [{ id: 'ftc3', x: 3, y: 12, item: 'phoenix_feather', qty: 2 }]][F.n - 1],
      events: [
        { x: F.lever[0], y: F.lever[1], type: 'script', solid: true, tile: 'lever', run: async function (c) { var d = D();
          if (F.n === 1 && !c.questActive('hidden_frozen_tower') && !c.questDone('hidden_frozen_tower')) c.questStart('hidden_frozen_tower');
          if (d.flags[doneFlag] || d.flags[gateFlag]) { await c.msg(['凍った時計のレバー。針はもう動いている。']); return; }
          await c.msg(['凍った大時計のレバー。押せば、時計が動き出しそうだ。', '扉に刻まれた文字：「針の進むあいだだけ、扉は開く。針は ' + F.limit + ' 歩で止まる」']);
          var go = await c.choice('レバーを押しますか？', ['押す', 'やめる']); if (go !== 0) return;
          d.flags[gateFlag] = true; d.ftTimer = { map: F.id, next: 'frozen_tower_' + (F.n + 1), left: F.limit, gate: gateFlag, done: doneFlag }; root.World.applyState(root.World.map);
          await c.msg(['ガチン、と音がして、大時計の針が動き出した。', '階段の前の扉の氷が溶けていく。……針が止まる前に、階段へ！（' + F.limit + '歩）']);
        } },
        { x: F.gate[0], y: F.gate[1], type: 'gate', solid: true, doneFlag: gateFlag, text: ['凍りついた扉。大時計の針が止まっているあいだは、開かない。'] }
      ],
      encounters: TOWER_ENC });
  });
  add({ id: 'frozen_tower_4', name: '凍結時計塔 最上階', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', onStep: towerStep, rows: [
    'CCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCC',
    'CCC:::::::::::::::CCC',
    'CCC:CCCCCC:CCCCCC:CCC',
    'CCC:CCCCCC:CCCCCC:CCC',
    'CCC:CC:::::::::CC:CCC',
    'CCC:CC:::::::::CC:CCC',
    'CCC:CC:::::::::CC:CCC',
    'CCC:CCCCCC:CCCCCC:CCC',
    'CCC:CCCCCC:CCCCCC:CCC',
    'CCC:::::::::::::::CCC',
    'CCCCCCCCCC:CCCCCCCCCC',
    'C<:::::::::CCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 1, y: 13, to: 'frozen_tower_3', tx: 18, ty: 2 }],
  chests: [{ id: 'ftc4', x: 3, y: 3, item: 'elixir', qty: 2 }, { id: 'ftc5', x: 17, y: 3, gold: 6000 }],
  events: [
    { x: 10, y: 7, type: 'boss', solid: true, optional: true, doneFlag: 'clock_warden_defeated', enemy: 'boss_clock_warden', intro: ['塔の中心で、凍りついた大時計が軋んだ。', '凍結の時計守「時ヲ止メレバ、何モ失ワナイ。何モ忘レナイ。……ナゼ、針ヲ動カス」'], after: ['時計守は砕け、大時計の針が、ゆっくりと一周した。', '塔の窓から差す光が、雪原へ伸びていく。'], questComplete: 'hidden_frozen_tower' },
    { x: 10, y: 12, type: 'inspect', solid: false, text: ['床に刻まれた文字：「この塔は、記録を守るために時を止めた。だが止まった記録は、誰にも読まれなかった」'] }
  ],
  encounters: null });
})(typeof window !== 'undefined' ? window : globalThis);
