/* =========================================================
   Data / Sky (v5.4 第14章) : 天空群島——星見塔の野営地（キャンプ会話）、星見塔（記録者）、天空神殿（守護者・制御装置の間）
   main_14「天空への航路」：飛空艇の復活（magicka.js）→ 北の空路で天空群島 → 3島の記録碑（飛空艇で島を渡る）→ 野営地で仲間と語る
     → 星見塔の最上階で記録者と対話 → 天空神殿の守護者 → 制御装置の間：封印を破ったのは魔王に導かれた「人間たち」→ 暗黒大陸への空路
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function D() { return root.State.data; }
  // 野営地の焚き火：加入した仲間それぞれが、自分の過去を一言ずつ語る
  var CAMP = {
    lina: ['リーナ', ['ヴェルムの配給所で、薬を誰に先に渡すか決めたとき、手が震えた。', '癒やし手は、全員を救えない。それを認めてから、少しだけ強くなれた気がする。']],
    kyle: ['カイル', ['迷いの森で部下を失ったのは、命令に従ったからだ。ヴァレン団長と剣を交えて、やっとそれを口に出せた。', '命令ではなく、自分で決めた誓いを守る。それが今の俺だ。']],
    mina: ['ミナ', ['父さんは逃げ遅れたんじゃなかった。守るために残った。', '宝箱を開けるのが好きなのは、父さんゆずりかも。中に何が入ってるか、開けるまでわからないから。']],
    seris: ['セリス', ['師は、止める勇気を持てなかった。私は、両方を持ちたい。', '……魔法は、波を読むためにある。波を止めるためじゃない。']],
    gald: ['ガルド', ['鎖を持って労働者を見張っていた。あれが「守る」ことだと思ってた。', '今はわかる。守るってのは、相手が自分で歩けるようにすることだ。']],
    lucia: ['ルシア', ['師匠の一番弟子でいることに、ずっとこだわってた。', 'でも、読むのは波で、決めるのは自分。師匠の言葉を、やっと自分の言葉にできた。']],
    elna: ['エルナ', ['帳簿の最後の行を、自分で書いた。名前から書く帳簿。', '次は、この旅の帳簿を書きたい。全部、名前から。']],
    ord: ['オルド', ['三十二軒。俺が没収した家の数だ。', '償いになるかはわからない。だが、剣を守るために使うと決めた。決めたことは、守る。']],
    nagi: ['ナギ', ['父さんの航路図に、空の航路はなかった。', 'だから私が描く。描いた航路図は、誰かが引き継げるように残す。']],
    iris: ['イーリス', ['失ったものを数えるために、地図を描いてきた。', 'これからは、見つけるために描く。……この島々も、ちゃんと描いておく。']],
    sophia: ['ソフィア', ['未来はいくつも見える。でも、どれも確定しない。', '神殿にいた頃は、それが怖かった。今は……少しだけ、楽しみ。']],
    io: ['イオ', ['命令がないとき、何をすればいいかわからなかった。', '今は、自分で「次はこれ」って決める。間違えることもある。それも、わたしのもの。']]
  };
  add({ id: 'star_camp', name: '星見塔の野営地', kind: 'town', bgm: 'town', fallback: 'grass', style: 'wood', rows: [
    'ffffffffffffffffffff',
    'f........rr........f',
    'f........rr........f',
    'f........rr........f',
    'f....z...rr...q....f',
    'f........rr........f',
    'f........ir........f',
    'f........rr........f',
    'f........rr........f',
    'f...e....er....e...f',
    'f........rr........f',
    'f........rr........f',
    'f........rr........f',
    'fffffffffrrfffffffff'
  ],
  warps: [9, 10].map(function (x) { return { x: x, y: 13, to: 'world_sky', tx: 42, ty: 88, name: '島へ' }; }),
  chests: [{ id: 'scm1', x: 17, y: 2, item: 'hi_ether', qty: 2 }],
  events: [{ x: 9, y: 6, type: 'script', solid: true, run: async function (c) {
    var d = D(); var ids = Object.keys(CAMP).filter(function (id) { return d.companions[id]; });
    await c.msg(['焚き火を囲んだ。雲海の上に、星が近い。', '……誰からともなく、話し始めた。']);
    for (var i = 0; i < ids.length; i++) { var e = CAMP[ids[i]]; await c.say(e[0], e[1]); }
    if (!ids.length) await c.msg(['ひとりで火を見つめた。旅の始まりから、ずいぶん遠くまで来た。']);
    await c.say(d.hero.name, ['……みんな、自分で選んできたんだな。', '明日は天空神殿だ。']);
    if (!d.flags.camp_talk) { d.flags.camp_talk = true; d.flags.camp_bond = ids.length; State_heal(c); await c.msg(['仲間との絆が深まった。（語り合った仲間：' + ids.length + '人）', 'パーティーの体力と魔力が回復した。']); }
  } }],
  npcs: [{ id: 'scm_keeper', x: 14, y: 8, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { await c.say('野営地の番人', ['星見塔に登る者は、ここで一晩過ごす決まりだ。', '塔の最上階の記録者は、三つの記録碑を読んだ者としか話さない。']); await c.inn(0); } }] });
  function State_heal(c) { c.heal(); }

  /* ---------- 星見塔（2階層） ---------- */
  add({ id: 'star_tower_1', name: '星見塔', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCC',
    'C::::::>::::::C',
    'C:CCCCC:CCCCC:C',
    'C:C:::::::::C:C',
    'C:C:CCC:CCC:C:C',
    'C:::C:::::C:::C',
    'C:C:C:XXX:C:C:C',
    'C:C:C:::::C:C:C',
    'C:C:CCC:CCC:C:C',
    'C:C:::::::::C:C',
    'C:CCCCC:CCCCC:C',
    'C:::::::::::::C',
    'C::::::D::::::C',
    'CCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 7, y: 12, to: 'world_sky', tx: 48, ty: 78 }, { x: 7, y: 1, to: 'star_tower_2', tx: 7, ty: 10 }],
  chests: [{ id: 'st1', x: 3, y: 5, item: 'star_cloak', qty: 1 }, { id: 'st2', x: 11, y: 5, gold: 3000 }],
  encounters: { rate: 0.04, zones: [{ name: '星見塔', test: function () { return true; }, groups: [['star_sentinel'], ['cloud_slime', 'storm_harpy'], ['star_sentinel', 'cloud_slime']], level: 31 }] } });
  add({ id: 'star_tower_2', name: '星見塔 最上階', kind: 'dungeon', bgm: 'castle', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCC',
    'C:::::XXX:::::C',
    'C::I:::::::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::I:::::::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::::::<::::::C',
    'CCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 7, y: 10, to: 'star_tower_1', tx: 7, ty: 2 }],
  npcs: [{ id: 'st_recorder', x: 7, y: 3, sprite: 'shadow', dir: 'down', wander: 0, talk: async function (c) {
    var d = D(); var n = ['sky_1', 'sky_2', 'sky_3'].filter(function (f) { return d.flags[f]; }).length;
    if (d.flags.sky_record) { await c.say('記録者', ['天空神殿は北の島。制御装置の間で、何を見ても、選ぶのはお前たちだ。']); return; }
    if (n < 3) { await c.say('記録者', ['……三つの記録碑を読んでから来なさい。星見島、風の島、神殿島。（' + n + '/3）', '島と島の間は雲海。飛空艇で渡りなさい。']); return; }
    if (!d.flags.camp_talk) { await c.say('記録者', ['記録碑は読んだのね。……では、野営地の焚き火で、仲間と話してきなさい。', '何を守るために来たのか。それを確かめずに神殿へ行く者は、帰ってこなかった。']); return; }
    await c.say('記録者', ['私は記録者。クリスタルを作った者たちの、最後の一人の影。', '我らは未来を固定する機能を切り離し、天空神殿に封印した。鍵は人の側に置いた。人が自ら望まぬ限り、封印は破れぬように。', '……けれど、封印は破られた。誰が破ったかは、神殿で見なさい。我らが、見る勇気を持てなかったものを。']);
    d.flags.sky_record = true; await c.msg(['天空神殿への道が開いた。北の島へ、飛空艇で渡ろう。']);
    await c.remark('sophia', ['作った人たちは、見届けなかった。……私も、神殿に閉じこもっていた。', '見に行こう。今度は、ちゃんと。'], 'sophia_remark_recorder');
  } }],
  encounters: null });

  /* ---------- 天空神殿（2階層） ---------- */
  add({ id: 'sky_temple_1', name: '天空神殿', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCCC',
    'C::::::::>::::::::C',
    'C:CCCCCC:::CCCCCC:C',
    'C:C::::C:::C::::C:C',
    'C:C:XX:C:::C:XX:C:C',
    'C:C::::C:::C::::C:C',
    'C:CC:CCC:::CCC:CC:C',
    'C:::::::::::::::::C',
    'C::I:::::::::::I::C',
    'C:::::::CCC:::::::C',
    'C:CCCC::C:C::CCCC:C',
    'C:::::::::::::::::C',
    'C::I:::::::::::I::C',
    'C:::::::::::::::::C',
    'C::::::::D::::::::C',
    'CCCCCCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 9, y: 14, to: 'world_sky', tx: 76, ty: 26 }, { x: 9, y: 1, to: 'sky_temple_2', tx: 7, ty: 11 }],
  chests: [{ id: 'sty1', x: 5, y: 3, item: 'phoenix_feather', qty: 2 }, { id: 'sty2', x: 14, y: 3, item: 'sky_axe', qty: 1 }],
  encounters: { rate: 0.04, zones: [{ name: '天空神殿', test: function () { return true; }, groups: [['star_sentinel', 'storm_harpy'], ['star_sentinel', 'star_sentinel'], ['storm_harpy', 'storm_harpy', 'cloud_slime']], level: 32 }] } });
  add({ id: 'sky_temple_2', name: '天空神殿 制御装置の間', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCC',
    'C::::XXXXX::::C',
    'C::I:XXXXX:I::C',
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
  warps: [{ x: 7, y: 11, to: 'sky_temple_1', tx: 9, ty: 2 }],
  chests: [{ id: 'sty3', x: 12, y: 10, item: 'elixir', qty: 2 }],
  events: [
    { x: 7, y: 7, type: 'boss', solid: false, doneFlag: 'sky_guardian_defeated', enemy: 'boss_sky_guardian', intro: ['制御装置の前に、白い守護者が降り立った。', '天空の守護者「封印ヲ破ッタ者ノ仲間カ。……審判スル」'], after: ['守護者は膝をつき、光の粒になって制御装置へ還っていった。', '「……オ前タチハ、破ッタ者デハナイ。見ヨ」'] },
    { x: 7, y: 3, type: 'script', solid: false, run: async function (c) { var d = D();
      if (!d.flags.sky_guardian_defeated) { await c.msg(['守護者が制御装置を守っている。']); return; }
      if (d.flags.control_room) { await c.msg(['空の台座。制御装置は、ここにはない。']); return; }
      await c.msg(['制御装置の台座は……空だった。', '台座に残された記録の映像が浮かぶ。', '——人々が、列をなしてこの神殿に登ってくる。商人、役人、学者、王。', '「損をしない未来が欲しい」「失敗しない人生が欲しい」「大切なものを失いたくない」', '誰かが鍵を開けた。声を合わせて。……その背後に、黒い影が立っている。影は手を貸しただけだ。鍵を回したのは、人間の手だった。']);
      await c.msg(['封印を破ったのは、魔王ではなかった。魔王に導かれた——人間たち自身だった。', '制御装置は、暗黒大陸の魔王城に運ばれた。']);
      c.give('sky_navigator', 1); d.flags.control_room = true; d.flags.dark_route_open = true;
      await c.questComplete('main_14'); if (!c.questActive('main_15') && !c.questDone('main_15')) c.questStart('main_15');
      await c.msg(['天空の航行装置を手に入れた。天空群島の北の空の果てから「闇の空路」で暗黒大陸へ渡れる。']);
      await c.remark('kyle', ['魔王が悪い、で終われたら楽だった。', '……鍵を回したのは、俺たちと同じ人間か。'], 'kyle_remark_control');
      await c.remark('elna', ['「損をしない未来が欲しい」……カリオンで何千回も聞いた言葉。', 'みんな悪人じゃない。だから厄介なのよ。'], 'elna_remark_control');
    } }
  ],
  encounters: null });
})(typeof window !== 'undefined' ? window : globalThis);
