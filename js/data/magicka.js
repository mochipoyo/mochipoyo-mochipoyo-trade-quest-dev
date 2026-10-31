/* =========================================================
   Data / Magicka (v5.4 第13章) : マクディア魔導王国——魔導都マクディア（王宮・王立学院・店）、禁書庫3階層、起源の実験室2階層（飛空艇の格納庫）
   main_13「魔導王国の秘密」：
     魔導都 → 王立学院の学院長（テオドルの記録を見せる）→ 禁書庫の入館許可 → 古文書3巻（クリスタル／演算機構／利用者名簿）
     → 最深部で大臣ヴォルクの裏切り（召喚魔獣と戦闘）→ MACDと複合分析の試練（learn_macd）→ 起源の実験室でテオドルの手記
     → 国王に報告し、研究の扱いを選ぶ（公開／監査つきの公開／封印）→ 達成（欠片）
   main_14 の始まり：起源の実験室の格納庫で、欠片3つを動力に飛空艇を復活させる（イオ同行で専用会話）
   ・サブ：禁書庫の番人の問い（archive_keeper）、師の最後の手記（seris_origin・セリス）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function D() { return root.State.data; }
  function inParty(id) { var d = D(); return !!(d.companions[id] && d.party.indexOf(id) >= 0); }
  function tomes() { var d = D(); return ['tome_1', 'tome_2', 'tome_3'].filter(function (f) { return d.flags[f]; }).length; }

  /* ---------- 魔導都マクディア ---------- */
  add({ id: 'magicka_city', name: '魔導都マクディア', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'C================BBBBBBBBBB================C',
    'C================BBBBBBBBBB================C',
    'C==BBBBBBBBBB====BBBBBBBBBB====BBBBBBBBBB==C',
    'C==BBBBBBBBBB====BBBBBBBBBB====BBBBBBBBBB==C',
    'C==BBBBBBBBBB====BBBBBBBBBB====BBBBBBBBBB==C',
    'C==BBBBBBBBBB====BBBBBBBBBB====BBBBBBBBBB==C',
    'C==BBBBBBBBBB=======rrrr=======BBBBBBBBBB==C',
    'C==============y====rrrr====y==============C',
    'C===================rrrr===================C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C============rr=====rrrr=====rr============C',
    'C==BBBBBBBB==rr=====rrrr=====rr==BBBBBBBB==C',
    'C==BBBBBBBB==rr=====rQrr=====rr==BBBBBBBB==C',
    'C==BBBBBBBB==rr=a===rrrr===a=rr==BBBBBBBB==C',
    'C==BBBBBBBB==rr=====rrrr=====rr==BBBBBBBB==C',
    'C==BBBBBBBB==rr=====rrrr=====rr==BBBBBBBB==C',
    'C============rr=====rrrr=====rr============C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C===================rrrr===================C',
    'C==BBBBBBBB======BBBBBBBBBB======BBBBBBBB==C',
    'C==BBBBBBBB======BBBBBBBBBB======BBBBBBBB==C',
    'C==BBBBBBBB======BBBBBBBBBB======BBBBBBBB==C',
    'C==BBBBBBBB======BBBBBBBBBB======BBBBBBBB==C',
    'C==BBBBBBBB======BBBBBBBBBB======BBBBBBBB==C',
    'C===================rrrr===================C',
    'C=========y=========rrrr=========y=========C',
    'C===============e===rrrr===e===============C',
    'C===================rrrr===================C',
    'CCCCCCCCCCCCCCCCCCCCrrrrCCCCCCCCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'palace', type: 'castle', name: '魔導王宮', x: 17, y: 1, w: 10, h: 6, doorX: 4, interior: 'magicka_palace', entry: { x: 7, y: 12 } },
    { id: 'academy', type: 'guild', name: '王立学院', x: 3, y: 3, w: 10, h: 5, doorX: 4, interior: 'magicka_academy', entry: { x: 5, y: 8 } },
    { id: 'church', type: 'church', name: '魔導教会', x: 31, y: 3, w: 10, h: 5, doorX: 4, interior: 'magicka_church', entry: { x: 5, y: 7 } },
    { id: 'weapon', type: 'weapon', name: '魔導武具店', x: 3, y: 13, w: 8, h: 5, doorX: 3, interior: 'magicka_weapon', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: '魔導防具店', x: 33, y: 13, w: 8, h: 5, doorX: 3, interior: 'magicka_armor', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '魔導具店', x: 3, y: 22, w: 8, h: 5, doorX: 3, interior: 'magicka_item', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '星詠みの宿', x: 33, y: 22, w: 8, h: 5, doorX: 3, interior: 'magicka_inn', entry: { x: 5, y: 7 } },
    { id: 'tavern', type: 'tavern', name: '魔導士の酒場', x: 17, y: 22, w: 10, h: 5, doorX: 4, interior: 'magicka_tavern', entry: { x: 5, y: 7 } }
  ],
  warps: [20, 21, 22, 23].map(function (x) { return { x: x, y: 31, to: 'world_magicka', tx: 80, ty: 60, name: '都の外へ' }; }),
  chests: [{ id: 'mc1', x: 42, y: 30, item: 'hi_ether', qty: 2 }],
  events: [{ x: 21, y: 14, type: 'inspect', solid: false, text: ['広場の魔導噴水。水が、空中で止まっては落ちる。', '台座の文字：「技術は国の宝。宝は、国が守る」'] }],
  npcs: [
    { id: 'mc_gate', x: 22, y: 28, sprite: 'rune_knight', dir: 'down', wander: 0, talk: async function (c) { if (!c.flag('magicka_arrived')) { c.setFlag('magicka_arrived', true); if (!c.questActive('main_13') && !c.questDone('main_13')) c.questStart('main_13'); } await c.say('魔導騎士', ['魔導都マクディアへようこそ。魔導の研究と、その成果を守る国だ。', '禁書庫に入りたい？ 王立学院の学院長の許可が要る。……十年、誰も許可されていないがな。']); await c.remark('seris', ['……帰ってきた。師と最後に別れた街。', '師テオドルは、この国の学院から追放された。理由は誰も教えてくれなかった。'], 'seris_remark_magicka'); } },
    { id: 'mc_student', x: 10, y: 9, sprite: 'scholar', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('magicka_choice_done')) await c.say('学院生', [D().flags.magicka_choice === 2 ? '研究は封印された。……安全になった、のかな。でも、何が危険だったのかも、わからなくなった。' : '古文書の写しが学院の図書室に置かれた！ 読める。でも、読んだ人の名前も記録される。責任ってやつだって。', '技術は悪くない、と先生は言う。使う人が考えろ、と。考えるのって、疲れるね。']); else await c.say('学院生', ['禁書庫には、クリスタルの作り方が書いてあるらしい。', '先生たちは「知らない方がいい」って言う。知らないで、どうやって正しく使えるんだろう。']); } },
    { id: 'mc_merchant', x: 30, y: 16, sprite: 'merchant', dir: 'down', wander: 1, talk: async function (c) { await c.say('魔導具商', ['最近、魔導具がよく売れる。カリオンの役人、ゼロメアの技師……暗黒大陸の「誰か」まで。', '誰に売っているのか、大臣様は気にしなくていいとおっしゃる。']); } },
    { id: 'mc_old', x: 36, y: 28, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('老魔導士', ['テオドルを知っているか？ 学院一の天才だった。そして、学院一の臆病者だった。', '危険だと知っていて、作るのをやめなかった。やめたら、別の誰かがもっと悪い形で作るから——そう言っていたよ。']); } }
  ] });
  add({ id: 'magicka_palace', name: '魔導王宮', kind: 'interior', bgm: 'castle', rows: [
    'CCCCCCCCCCCCCCCC',
    'C::I:::pp:::I::C',
    'C::::::pp::::::C',
    'C::I:::pp:::I::C',
    'C::::::pp::::::C',
    'C:KK:::pp:::KK:C',
    'C::::::pp::::::C',
    'C::I:::pp:::I::C',
    'C::::::pp::::::C',
    'C::::::pp::::::C',
    'C::::::pp::::::C',
    'C::::::pp::::::C',
    'C::::::pp::::::C',
    'CCCCCCCDDCCCCCCC'
  ], warps: [{ x: 7, y: 13, to: 'magicka_city', tx: 21, ty: 8 }, { x: 8, y: 13, to: 'magicka_city', tx: 21, ty: 8 }],
    npcs: [
      { id: 'mp_king', x: 7, y: 1, sprite: 'king', dir: 'down', wander: 0, talk: async function (c) {
        var d = D();
        if (d.flags.magicka_choice_done) { await c.say('魔導王', [d.flags.magicka_choice === 2 ? '研究は封印した。……封印しても、知っている者はいる。それが一番恐ろしい。' : '研究の写しは学院に置いた。読む者の名と目的を記録する。それが、私にできる責任の取り方だ。', '天空神殿の制御装置……。飛空艇は格納庫だ。行け。']); return; }
        if (!d.flags.origin_notes) { await c.say('魔導王', ['クリスタルの研究は、この国の財産だ。公開はせぬ。', '……大臣ヴォルクがそう進言した。私もそれが正しいと思っている。']); if (d.flags.minister_defeated) await c.say('魔導王', ['ヴォルクが……魔王軍と通じていたと？ ……起源の実験室を調べよ。テオドルの手記が残っているはずだ。']); return; }
        await c.say('魔導王', ['古文書3巻、ヴォルクの裏切り、そしてテオドルの手記……。', 'クリスタルもオラクルも、カリオンの魔法帳簿も、魔王軍の力も——すべてこの国の研究から生まれた。我々は「財産」を守っているつもりで、売っていたのだな。', 'お前たちに問う。この研究を、どう扱うべきか。']);
        var a = await c.choice('研究の扱いを選ぶ', ['公開する（誰でも読めるように）', '監査つきで公開する（読んだ者の名と目的を記録する）', '封印する（二度と誰も使えないように）']);
        d.flags.magicka_choice = a < 0 ? 1 : a; d.flags.magicka_choice_done = true;
        await c.msg([a === 0 ? '研究は公開されることになった。学院の前に、読む者の列ができた。危険を承知で。' : a === 2 ? '研究は封印されることになった。……だが、すでに知っている者の頭の中までは封印できない。' : '研究は「監査つき」で公開されることになった。読む者は名と目的を記す。その記録も、誰でも読める。']);
        await c.say('魔導王', ['古文書によれば、クリスタルの「制御装置」——未来を一つに固定する機能——は、天空神殿に封印されている。', '起源の実験室の格納庫に、古代の飛空艇がある。動力はクリスタルの欠片。欠片が3つあれば、空へ届く。これを持っていけ。']);
        await c.questComplete('main_13'); if (!c.questActive('main_14') && !c.questDone('main_14')) c.questStart('main_14');
        await c.remark('elna', ['読んだ者の名を記録する公開……帳簿と同じね。', '記録は、書く人も読む人も守る。'], 'elna_remark_magicka');
      } },
      { id: 'mp_volk', x: 9, y: 3, sprite: 'minister', dir: 'down', wander: 0, hideIf: 'minister_defeated', talk: async function (c) { await c.say('大臣ヴォルク', ['禁書庫に入りたいと？ 研究は国の財産だ。財産は、売れる相手に、売れるときに売る。それが国益というものだ。', '……おっと、今のは聞かなかったことに。']); } },
      { id: 'mp_guard', x: 3, y: 9, sprite: 'rune_knight', dir: 'right', wander: 0, talk: async function (c) { await c.say('近衛騎士', [c.flag('minister_defeated') ? 'ヴォルク大臣の執務室から、魔王軍との取引の記録が出た。……私は、何を守っていたのだろう。' : '陛下の御前だ。用件は手短に。']); } }
    ] });
  add({ id: 'magicka_academy', name: '王立学院', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKKKTTKKKK#', '#__________#', '#_t_t__t_t_#', '#__________#', '#_t_t__t_t_#', '#__________#', '#KK______KK#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 9, to: 'magicka_city', tx: 7, ty: 8 }],
    npcs: [{ id: 'ma_mireille', x: 5, y: 2, sprite: 'priest', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (d.flags.archive_permit) { await c.say('学院長ミレイユ', [d.flags.origin_notes ? 'テオドルの手記を読んだのね。……あの人は臆病で、誠実だった。両方なのよ。' : '禁書庫は北の丘。三階まで、古文書が一巻ずつ。最深部には……試練の石碑がある。', '読んだことを、どう使うか。それは私にも決められない。']); return; }
      await c.say('学院長ミレイユ', ['王立学院の学院長、ミレイユです。禁書庫の許可？ ……十年、誰にも出していません。', '理由がない限り、出せない。あなたたちは、なぜ読みたいの？']);
      if (c.has('theodor_record') || d.flags.core_2) {
        await c.msg(['テオドルの記録を見せた。']);
        await c.say('学院長ミレイユ', ['……テオドルの字。オラクル中枢に、こんなものを残していたなんて。', '「予測は、選択の代わりにはならない」……あの人が最後まで言えなかったことを、ここに書いていた。', 'いいわ。許可します。テオドルが何を作り、なぜ作り続けたのか——あなたたちは知るべき人たちよ。']);
      } else { await c.say('学院長ミレイユ', ['……クリスタルの起源を知りたい、と。その目は、本気ね。許可します。']); }
      c.give('archive_permit_doc', 1); d.flags.archive_permit = true; await c.msg(['禁書庫の入館許可証を手に入れた！ 北の丘の禁書庫に入れる。']);
      await c.remark('seris', ['ミレイユ先生……。師の同期だった人。', '師が追放された理由を、先生は知っているはず。……今は、聞かない。禁書庫で、自分で読む。'], 'seris_remark_academy');
    } }] });
  K.shopInterior('magicka_weapon', '魔導武具店', 'magicka_city', 6, 18, 'merchant', 'weapon', ['rune_blade', 'arcane_staff', 'astral_spear', 'balance_mace', 'void_dagger', 'shadow_claw', 'gear_bow', 'chrono_staff', 'macd_twin', 'knight_sword', 'halberd'], ['魔導の武具だ。値は張るが、命の値段よりは安い。']);
  K.shopInterior('magicka_armor', '魔導防具店', 'magicka_city', 36, 18, 'merchant', 'armor', ['rune_mail', 'star_cloak', 'sky_robe', 'aegis_shield', 'star_helm', 'arcane_hat', 'temporal_robe', 'knight_armor', 'amulet_macd', 'ring_guard', 'amulet_life'], ['ルーンメイルは雷をはじく。……らしい。']);
  K.shopInterior('magicka_item', '魔導具店', 'magicka_city', 6, 27, 'merchant', 'item', ['potion', 'hi_potion', 'ether', 'hi_ether', 'elixir', 'antidote', 'calm_water', 'wake_bell', 'phoenix_feather', 'tent', 'escape_wing'], ['エリクサーもある。値段を見て驚くなよ。']);
  K.innInterior('magicka_inn', '星詠みの宿', 'magicka_city', 36, 27, 120);
  K.churchInterior('magicka_church', '魔導教会', 'magicka_city', 35, 8);
  add({ id: 'magicka_tavern', name: '魔導士の酒場', kind: 'interior', bgm: 'tavern', rows: [
    '############', '#TTTTT_____#', '#__________#', '#_t__t__t__#', '#__________#', '#_t__t__t__#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'magicka_city', tx: 21, ty: 27 }],
    npcs: [
      { id: 'mt_bartender', x: 2, y: 2, sprite: 'bartender', dir: 'down', wander: 0, talk: async function (c) { await c.tavern(); } },
      { id: 'mt_mage', x: 8, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('酔った魔導士', ['クリスタルを作った連中は、空に逃げたって話だ。雲の上の島に。', '自分たちの作ったものが地上でどうなるか、見たくなかったんだろうよ。……わかるよ。俺も見たくない。']); } }
    ] });

  /* ---------- 禁書庫（3階層） ---------- */
  add({ id: 'forbidden_archive_1', name: '禁書庫 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_wood', rows: [
    '######################',
    '#KKKK___#_______KKKKK#',
    '#_______#____________#',
    '#_KK_KK_#_KK_KK_KK___#',
    '#_______#____________#',
    '#___#####__#######___#',
    '#___#______#_____#___#',
    '#___#_KKKK_#_KKK_#__>#',
    '#___#______#_____#___#',
    '#___####_###_###_#___#',
    '#____________________#',
    '#_KK__KK___i___KK_KK_#',
    '#____________________#',
    '#_________D__________#',
    '######################'
  ],
  warps: [{ x: 10, y: 13, to: 'world_magicka', tx: 80, ty: 32 }, { x: 20, y: 7, to: 'forbidden_archive_2', tx: 1, ty: 12 }],
  chests: [{ id: 'fa1', x: 6, y: 2, item: 'hi_ether', qty: 2 }, { id: 'fa2', x: 15, y: 6, gold: 3000 }],
  events: [{ x: 8, y: 7, type: 'script', solid: false, run: async function (c) { var d = D(); await c.msg(['【古文書 第一巻：均衡のクリスタル】', '「富が偏れば、波は荒れる。我らはクリスタルに、富の流れを均す力を込めた」', '「副産物として、クリスタルは未来の波形を『計算』できることがわかった。計算できるものは、固定できる」', '「固定してはならない。我らはその機能を切り離す」']); if (!d.flags.tome_1) { d.flags.tome_1 = true; c.give('ancient_tome', 1); await c.msg(['古文書を読んだ。（' + tomes() + '/3）']); } } }],
  npcs: [{ id: 'fa_keeper', x: 11, y: 10, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
    var d = D();
    if (c.questDone('archive_keeper')) { await c.say('禁書庫の番人', ['技術は道具。道具は、持つ者の手の形になる。……お前たちの手の形を、わしは見た。']); return; }
    if (!c.questActive('archive_keeper')) { c.questStart('archive_keeper'); await c.say('禁書庫の番人', ['ここに来る者は二種類だ。技術を盗む者と、技術を否定する者。', 'お前たちはどちらだ？ ……答えは急がん。三巻を読んでから、もう一度来い。']); return; }
    if (tomes() < 3) { await c.say('禁書庫の番人', ['三巻すべて読んでから来い。（' + tomes() + '/3）']); return; }
    await c.say('禁書庫の番人', ['読んだな。問う。お前たちは、技術を否定するのか？']);
    var a = await c.choice('番人に答える', ['「否定しない。誰が、何のために、どんな責任で使うかを問う」', '「危険な技術は、なくすべきだ」', '「使う者が決めればいい。技術に善悪はない」']);
    if (a === 0) await c.say('禁書庫の番人', ['……誰が、何のために、どんな責任で。三つ揃えて答えた者は、テオドル以来だ。', 'これを持っていけ。テオドルが置いていった杖だ。']);
    else if (a === 1) await c.say('禁書庫の番人', ['なくす、か。なくしても、知っている者の頭には残る。そして、隠れて使う者が現れる。', '……だが、その恐れを持つ者が、いちばん慎重に使う。持っていけ。']);
    else await c.say('禁書庫の番人', ['善悪はない、か。では、使った結果の責任は誰が取る？ ……ヴォルクも、同じことを言っていた。', 'それでも、考えて答えたことは認める。持っていけ。']);
    d.flags.archive_keeper_answer = a < 0 ? 0 : a; await c.questComplete('archive_keeper');
  } }],
  encounters: { rate: 0.04, zones: [{ name: '禁書庫', test: function () { return true; }, groups: [['indicator_mage', 'arcane_eye'], ['grimoire', 'grimoire'], ['arcane_eye', 'arcane_eye'], ['mana_golem'], ['grimoire', 'arcane_eye']], level: 28 }] } });
  add({ id: 'forbidden_archive_2', name: '禁書庫 2階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_wood', rows: [
    '######################',
    '#____#________#_____>#',
    '#_KK_#_KKKKKK_#______#',
    '#____#________#__KK__#',
    '#____####__####______#',
    '#____________________#',
    '#_####_####__####_##_#',
    '#_#__#_#__#__#__#_#__#',
    '#_#X_#_#__#__#__#_#__#',
    '#_##_#_##_#__#_##_#__#',
    '#____________________#',
    '#_____KK_______KK____#',
    '#<___________________#',
    '######################'
  ],
  warps: [{ x: 1, y: 12, to: 'forbidden_archive_1', tx: 19, ty: 7 }, { x: 20, y: 1, to: 'forbidden_archive_3', tx: 1, ty: 10 }],
  chests: [{ id: 'fa3', x: 9, y: 8, item: 'elixir', qty: 1 }, { id: 'fa4', x: 15, y: 8, item: 'rune_mail', qty: 1 }],
  events: [{ x: 3, y: 7, type: 'script', solid: false, run: async function (c) { var d = D(); await c.msg(['【古文書 第二巻：演算機構】', '「クリスタルから切り離した計算の理論は、別の器に移せる。我らはそれを『演算機構』と名づけた」', '「——数百年後の追記（テオドルの字）：演算機構の理論を、災害予測のために再構築する。名はオラクル」', 'クリスタルとオラクルは、同じ魔導技術から生まれた。']); if (!d.flags.tome_2) { d.flags.tome_2 = true; c.give('ancient_tome', 1); await c.msg(['古文書を読んだ。（' + tomes() + '/3）']); } await c.remark('io', ['……わたしの、おかあさんの、おかあさんの理論。', 'クリスタルとわたしは、親戚みたいなもの？ ……変な気持ち。'], 'io_remark_tome'); } }],
  encounters: { rate: 0.04, zones: [{ name: '禁書庫', test: function () { return true; }, groups: [['grimoire', 'mana_golem'], ['rune_knight', 'arcane_eye'], ['grimoire', 'grimoire', 'arcane_eye']], level: 29 }] } });
  add({ id: 'forbidden_archive_3', name: '禁書庫 最深部', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_wood', rows: [
    '##################',
    '#KKKK___XX___KKKK#',
    '#________________#',
    '#__i__________i__#',
    '#________________#',
    '#________________#',
    '#__i__________i__#',
    '#________________#',
    '#________________#',
    '#________________#',
    '#<_______________#',
    '##################'
  ],
  warps: [{ x: 1, y: 10, to: 'forbidden_archive_2', tx: 19, ty: 1 }],
  chests: [{ id: 'fa5', x: 15, y: 9, item: 'aegis_shield', qty: 1 }],
  events: [
    { x: 8, y: 3, type: 'script', solid: false, run: async function (c) { var d = D(); await c.msg(['【古文書 第三巻：利用者名簿】', '「演算機構の写しを求めた者の名簿」', '……カリオン徴収政府 財務局（魔法帳簿の演算に使用）。ゼロメア第二植民地（オラクル）。そして——「暗黒大陸 某」。', '仲介者の欄に、同じ署名が並んでいる。「大臣 ヴォルク」']); if (!d.flags.tome_3) { d.flags.tome_3 = true; c.give('ancient_tome', 1); await c.msg(['古文書を読んだ。（' + tomes() + '/3）']); } } },
    { x: 8, y: 5, type: 'boss', solid: false, doneFlag: 'minister_defeated', requireFlag: 'tome_3', lockedText: ['静かな部屋。奥の書架に、第三巻がある。'], enemies: ['boss_minister', 'summoned_chimera'], intro: ['背後で扉が閉じた。', '大臣ヴォルク「読んでしまったか。……カリオンにも、ゼロメアにも、魔王軍にも、売ったのは私だ」', '「技術は売れる者に売る。止めれば、別の誰かがもっと高く売る。それが国益だ」', 'ヴォルクが禁書を開くと、魔獣が現れた！'], after: ['ヴォルクは膝をついた。「……テオドルも同じことを言っていた。止めれば別の誰かが、と。私は、その言葉を自分の都合で使っただけだ」', '衛兵が駆け込んできた。ヴォルクは連行された。'] },
    { x: 13, y: 3, type: 'learn', solid: false, learnId: 'learn_macd' }
  ],
  encounters: null });

  /* ---------- 起源の実験室（2階層＋格納庫） ---------- */
  add({ id: 'origin_lab_1', name: '起源の実験室', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '########################',
    '#______#______#_______>#',
    '#_XX___#__KK__#__q_____#',
    '#______#______#________#',
    '#__######__####__####__#',
    '#______________________#',
    '#_####__######__####___#',
    '#_#__#__#____#__#__#___#',
    '#_#XX#__#_i__#__#__#___#',
    '#_#__#__#____#__#__#___#',
    '#_##_#__##_###__##_#___#',
    '#______________________#',
    '#______________________#',
    '########################'
  ],
  warps: [{ x: 1, y: 12, to: 'world_magicka', tx: 124, ty: 58 }, { x: 22, y: 1, to: 'origin_lab_2', tx: 1, ty: 10 }],
  chests: [{ id: 'ol1', x: 4, y: 8, item: 'star_helm', qty: 1 }, { id: 'ol2', x: 18, y: 8, gold: 3500 }],
  events: [{ x: 2, y: 2, type: 'inspect', solid: false, text: ['結晶の培養槽。中は空だ。', 'ラベル：「均衡のクリスタル 試作第7号」——本物のクリスタルは、ここで生まれた。'] }],
  encounters: { rate: 0.04, zones: [{ name: '起源の実験室', test: function () { return true; }, groups: [['mana_golem', 'arcane_eye'], ['rune_knight', 'rune_knight'], ['mana_golem', 'grimoire'], ['arcane_eye', 'arcane_eye', 'grimoire']], level: 29 }] } });
  add({ id: 'origin_lab_2', name: '起源の実験室 最深部・格納庫', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '##########################',
    '#KKK___#_________________#',
    '#______#_________________#',
    '#_t____#____5____________#',
    '#______#_________________#',
    '#______#_________________#',
    '#__________i_______i_____#',
    '#______#_________________#',
    '#______#_________________#',
    '#______#_________________#',
    '#<_____#_________________#',
    '##########################'
  ],
  warps: [{ x: 1, y: 10, to: 'origin_lab_1', tx: 21, ty: 1 }],
  chests: [{ id: 'ol3', x: 24, y: 9, item: 'elixir', qty: 2 }],
  events: [
    { x: 2, y: 2, type: 'script', solid: false, run: async function (c) { var d = D(); var ws = inParty('seris');
      if (d.flags.origin_notes) { await c.msg(['テオドルの机。手記は、もう読んだ。', '最後の頁：「読むのは波で、決めるのは——」']); return; }
      if (ws) await c.say('セリス', ['師の机……。ここで、全部書いていたのね。']);
      await c.msg(['【テオドルの手記】', '「演算機構は危険だ。予測は、いつか保証を求める声に変わる。わかっている」', '「それでも私は作り続ける。止めれば、ヴォルクのような者が、もっと悪い形で作る。だから私が、一番ましな形で作る」', '「——これは言い訳だ。わかっている。危険を知りながら作り続ける者は、知らずに作る者より罪が重い」', '「弟子へ。私は止められなかった。お前は、止める勇気と、作る勇気の、両方を持ってくれ。どちらか一方だけでは、私と同じになる」']);
      d.flags.origin_notes = true; c.give('theodor_notes', 1); await c.msg(['テオドルの手記を手に入れた。魔導王に報告しよう。']);
      if (ws) { await c.say('セリス', ['……止める勇気と、作る勇気。', '師は、作る勇気しか持てなかった。私は……両方を、持ちたい。この旅で、少しずつ。']); if (!c.questDone('seris_origin')) { if (!c.questActive('seris_origin')) c.questStart('seris_origin'); await c.questComplete('seris_origin'); } }
      await c.remark('lucia', ['止めれば別の誰かが……。トレードでも同じ言い訳をする人がいる。「自分が入らなくても誰かが入る」。', '誰かが、じゃない。自分がどうするか、よ。'], 'lucia_remark_theodor2');
    } },
    { x: 12, y: 3, type: 'script', solid: true, run: async function (c) { var d = D();
      if (d.flags.airship_owned) { await c.msg(['格納庫は空だ。飛空艇は外に出してある。']); return; }
      if (!d.flags.magicka_choice_done) { await c.msg(['格納庫の奥に、巨大な船が眠っている。帆のかわりに、金色の気嚢。', '動力炉は空だ。……魔導王に報告してから、改めて調べよう。']); return; }
      var n = (d.inventory.crystal_shard || 0);
      await c.msg(['古代の飛空艇。動力炉に、欠片を収める窪みが3つある。']);
      if (n < 3) { await c.msg(['均衡のクリスタルの欠片が足りない。（' + n + '/3）', '欠片は、忘却の洞窟（第3章）、時の神殿（第10章）、魔導王（第13章）から手に入る。']); return; }
      if (inParty('io')) { await c.say('イオ', ['この動力炉、演算機構と同じ規格。……わたし、わかる。', '欠片を3つ、ここと、ここと、ここ。……回路、つないだ。起動する。']); }
      else await c.msg(['実験室の古い手順書どおりに、欠片を3つ収めた。']);
      c.take('crystal_shard', 3); d.flags.airship_owned = true; if (root.Vehicle) root.Vehicle.unlockIfReady();
      await c.msg(['動力炉が光り、気嚢がふくらんだ。', '飛空艇が復活した！ 起源の実験室の外に出してある。', '飛空艇：乗ると山も海も越えて飛べる。決定キーで着陸（草原・砂地・道などの平地のみ）。飛行中は魔物に出会わない。', 'アルカディア相場大陸の北の空の果てから「北の空路」で天空群島へ。']);
      await c.remark('nagi', ['空の航路図……。父さんは、ここまでは描けなかった。', '私が描く。海と空を、一枚の地図に。'], 'nagi_remark_airship');
    } }
  ],
  encounters: null });
})(typeof window !== 'undefined' ? window : globalThis);
