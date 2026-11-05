/* =========================================================
   Data / Region78 アエリア（v7.8）：太平洋上空「浮天城アエリア」（地球の上の別の空間）
   ・到達：星界航行船アストラ号（クリアのあと）を手に入れてから。太平洋のアエリアの上空へ飛ぶと、上空の船着き場に接舷できる（js/rpg/astra78.js）
       それまでは、船で太平洋のその海を通ると、雲の上から城の影が落ちるだけ（近づけない）
   ・城は傾き始めている。庭園の水門を操作すると水位が下がり（満水の庭園 → 水の引いた庭園の地図）、水没していた回廊が現れる
   ・物語「浮天城の浮力炉」（aeria78_float）：回廊の奥の浮力炉を修復し、城を救う
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.R78; if (!R) return; var A = R.A; var D = R.D;

  /* ---------- 敵（Lv42〜45） ---------- */
  R.special('updraft', { name: '上昇気流', msg: 'は強い上昇気流を巻き起こした！ 足が地につかない……', power: 0.7, all: true, debuff: { def: -0.25 }, turns: 3 });
  R.special('ballast_drop', { name: '重りの落下', msg: 'は浮力を失った重りを落とした！', power: 1.7 });
  R.monster('cloud_manta', { name: '雲海のマンタ', lv: 42, arche: 'fast', art: { family: 'ray', c: { base: '#e8f0ff', accent: '#8ab0e0', eye: '#2a4a8a' } }, family: '鳥系', area: '浮天城アエリア', resist: { thunder: 1.5, wind: 0.5 }, actions: [A('attack', 3), A('special', 'updraft', 1)], drops: [{ item: 'hi_ether', rate: 0.2 }], desc: '城の下の雲海を泳ぐ。城の影に住みついた。' });
  R.monster('garden_undine', { name: '庭園の水妖', lv: 43, arche: 'mage', art: { family: 'spirit', c: { base: '#6ac0ff', accent: '#e0fff8', eye: '#2a6a8a' } }, family: '精霊系', area: '浮天城の庭園', resist: { thunder: 1.6, ice: 0, fire: 0.7 }, actions: [A('attack', 1), A('skill', 'blizzard', 1), A('skill', 'ice', 2)], drops: [{ item: 'elixir', rate: 0.04 }], desc: '傾いた庭園の水たまりに宿った精。' });
  R.monster('buoy_spirit', { name: '浮力の精', lv: 42, arche: 'glass', art: { family: 'crystal', c: { base: '#c0e8ff', accent: '#ffffff', eye: '#4a8aff' } }, family: '精霊系', area: '水没の回廊', resist: { dark: 1.5, light: 0.5 }, actions: [A('attack', 2), A('skill', 'wind_blade', 1)], drops: [{ item: 'hi_ether', rate: 0.2 }], desc: '浮力炉から漏れた力の欠片。' });
  R.monster('castle_guardian', { name: '城の守護騎士', lv: 44, arche: 'tank', art: { family: 'knight', c: { base: '#d0d8e8', accent: '#ffd24a', eye: '#4affff' } }, family: '魔法生物系', area: '水没の回廊', resist: { thunder: 1.3, dark: 1.3 }, actions: [A('attack', 2), A('skill', 'full_slash', 1)], drops: [{ item: 'hi_potion', rate: 0.4 }], desc: '城を造った人々の、最後の命令を守る鎧。' });
  R.monster('storm_hawk', { name: '嵐の鷹', lv: 43, arche: 'fast', art: { family: 'bird', c: { base: '#5a6a8a', accent: '#ffe08a', eye: '#ff3a3a' } }, family: '鳥系', area: '浮天城アエリア', resist: { thunder: 1.4, wind: 0.6 }, actions: [A('attack', 3), A('skill', 'wind_blade', 1)], drops: [{ item: 'hi_potion', rate: 0.3 }], desc: '城の塔に巣をかけた鷹。' });
  R.monster('boss_anchor_core', { name: '暴走炉心アンカー・コア', lv: 46, arche: 'tank', boss: true, hpMult: 3.0, art: { family: 'crystal', size: 'boss', c: { base: '#4a8aff', accent: '#ffe08a', eye: '#ff3a3a' } }, family: '魔法生物系', area: '浮力炉', resist: { dark: 1.4, light: 0.6, thunder: 1.2 },
    actions: [A('attack', 2), A('special', 'ballast_drop', 1), A('special', 'updraft', 1), A('skill', 'thunder', 1), { type: 'special', id: 'call', summon: 'buoy_spirit', w: 1, hpBelow: 0.5 }], drops: [{ item: 'elixir', rate: 1 }], desc: '片側だけに力を送り続け、城を傾けている暴走した炉心。' });

  /* ---------- 報酬 ---------- */
  R.weapon('azure_sword', '蒼天の剣', 'sword', 58, 0, { desc: '浮天城の守護騎士が掲げた剣。風の力を帯びる', element: 'wind' });
  R.armor('aeria_robe', '浮天の羽衣', 'robe', 40, 0, { desc: '雲を織った羽衣。素早さ+4・魔力+4', agi: 4, mag: 4 });
  R.armor('reactor_shard', '浮力炉の欠片', 'acc', 4, 0, { desc: '修復した炉から外れた欠片。素早さ+4・魔法防御+4', agi: 4, mdef: 4 });
  R.key('aer_gate_key', '水門の鍵', '浮天城の庭園の水門の鍵。城守の人形から預かった。');

  /* ---------- クエスト ---------- */
  R.quest('aeria78_float', { title: '浮天城の浮力炉', theme: '傾きを、元に戻す', desc: '太平洋の上空に浮かぶ浮天城アエリアが、傾き始めている。庭園の水門で水位を下げ、水没していた回廊の奥の浮力炉を修復する。',
    steps: [['aer_docked', 'アストラ号で、浮天城アエリアの上空の船着き場に接舷する'], ['aer_heard', '城守の人形から、城の傾きの話を聞く'], ['aer_gate', '庭園の水門を操作して、水位を下げる'], ['aer_corridor', '現れた回廊の奥へ進む'], ['aer_reactor', '浮力炉を修復する'], ['aer_done', '城守の人形に報告する']],
    reward: { exp: 20000, gold: 12000, item: 'azure_sword' } });
  R.obj('aeria78_float', 'aer_docked', 'map:aeria_dock', ['太平洋の上空。', '浮天城アエリアの上空の船着き場。', 'アストラ号で太平洋の真ん中（ハワイの近く）の上空へ。城の影の上で降りる（決定）と接舷できる。']);
  R.obj('aeria78_float', 'aer_heard', 'npc:aeria_dock:ad_keeper', ['浮天城アエリア。', '船着き場の城守の人形。', '船着き場の城守の人形に話しかけよう。']);
  R.obj('aeria78_float', 'aer_gate', 'ev:aeria_garden_hi:2,9', ['浮天城アエリアの庭園。', '庭園の西の端の水門。', '庭園の西の端の水門を、水門の鍵で操作しよう。']);
  R.obj('aeria78_float', 'aer_corridor', 'map:aeria_corridor', ['水の引いた庭園。', '庭園の東の、現れた階段。', '水の引いた庭園の東の階段から、回廊へ下りよう。']);
  R.obj('aeria78_float', 'aer_reactor', 'ev:aeria_reactor:8,2', ['回廊の奥。', '浮力炉。', '回廊の奥の浮力炉を修復しよう。']);
  R.obj('aeria78_float', 'aer_done', 'npc:aeria_dock:ad_keeper', ['浮天城アエリアの船着き場。', '城守の人形。', '城守の人形に報告しよう。']);

  /* ---------- 上空の船着き場 ---------- */
  var DOCK = 'aeria_dock';
  R.add({ id: DOCK, name: '浮天城アエリア 上空の船着き場', kind: 'dungeon', bgm: 'town', fallback: 'path_stone', sky78: true, rows: [
    'CCCCCCCCCCCCCCCCCCC',
    'C:::::::CDC:::::::C',
    'C:I:::::P:P:::::I:C',
    'C:::a:::PPP:::a:::C',
    'C:::::::PPP:::::::C',
    'C:I:::::PPP:::::I:C',
    'C::Q::::PPP::::Q::C',
    'C:::::::PPP:::::::C',
    'CCCCCCC:PPP:CCCCCCC',
    '7777777dPPPd7777777',
    '7777777ddddd7777777',
    '7777777ddddd7777777',
    '7777777ddddd7777777',
    '7777777777777777777'
  ], warps: [{ x: 9, y: 1, to: 'aeria_garden_hi', tx: 9, ty: 12 }],
    events: [
      { x: 9, y: 12, type: 'script', solid: true, tile: 'crate', run: async function (c) { var ch = await c.choice('星界航行船アストラ号が、船着き場に係留されている。', ['飛び立つ', 'やめる']); if (ch !== 0) return; if (root.Astra && root.Astra.takeOffAeria) root.Astra.takeOffAeria(); } },
      { x: 6, y: 9, type: 'inspect', solid: true, text: ['船着き場の縁から下を見ると、雲の海。その切れ間の、はるか下に、太平洋が光っている。'] }
    ],
    npcs: [
      { id: 'ad_keeper', x: 9, y: 7, sprite: 'golem', dir: 'down', wander: 0, talk: async function (c) {
        var d = D();
        if (c.questDone('aeria78_float')) { await c.say('城守の人形', ['城は、水平に戻りました。庭園の水も、もう片側に寄りません。', '城を造った人々は、とうにいません。けれど、城は、あなたのような訪問者のために浮かび続けます。']); return; }
        if (d.flags.aer_reactor) { await c.say('城守の人形', ['……浮力炉の音が変わりました。均等な、静かな音。', '城の傾き、ゼロ。浮天城アエリアは、救われました。']); d.flags.aer_done = true; await c.questComplete('aeria78_float'); c.give('aeria_robe', 1); c.give('reactor_shard', 1); await c.msg(['浮天の羽衣と、浮力炉の欠片も受け取った。']); return; }
        if (!c.questActive('aeria78_float')) {
          await c.say('城守の人形', ['船着き場への接舷を確認。……訪問者は、百二十年ぶりです。', 'ここは浮天城アエリア。太平洋の上空に浮かぶ城です。浮力炉が片側にだけ力を送り始め、城が傾いています。', '傾きのせいで、庭園の水が片側に寄り、浮力炉へ続く回廊が水没しました。わたしは水に入れません。']);
          var ch = await c.choice('浮力炉を、修復してほしい。', ['引き受ける', 'あとにする']); if (ch !== 0) return;
          c.questStart('aeria78_float'); d.flags.aer_docked = true; d.flags.aer_heard = true; c.give('aer_gate_key', 1);
          await c.msg(['水門の鍵を受け取った。']);
          await c.say('城守の人形', ['庭園の西の端に、水門があります。鍵で開ければ、水は雲の海へ落ち、回廊が現れます。', '回廊の奥が浮力炉です。……どうか、気をつけて。城の守護騎士たちは、まだ命令を守っています。']); return;
        }
        await c.say('城守の人形', ['庭園の西の端の水門を開けてください。回廊の奥が浮力炉です。']);
      } },
      { id: 'ad_gardener', x: 4, y: 5, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { var ch = await c.choice('庭師の老婆「休んでいくかい？ 雲の上の寝床は、よく眠れるよ」', ['休む（300G）', '話を聞く', 'やめる']); if (ch === 0) { await c.inn(300); return; } if (ch === 1) await c.say('庭師の老婆', ['わたしは、この城で生まれた最後の一人さ。下の世界へは、一度も降りたことがない。', '雲の切れ間から、大きな海と、遠くの島々が見えるんだ。……あれが太平洋。東へ行けばアメリカ、西へ行けば日本。']); } },
      { id: 'ad_merchant', x: 14, y: 5, sprite: 'golem', dir: 'down', wander: 0, talk: async function (c) { await c.shop('item', ['elixir', 'hi_potion', 'hi_ether', 'phoenix_feather', 'wake_bell']); } }
    ], encounters: null });

  /* ---------- 庭園（満水／水の引いた） ---------- */
  var GENC = { rate: 0.045, zones: [{ name: '浮天城の庭園', test: function () { return true; }, groups: [['garden_undine'], ['cloud_manta', 'storm_hawk'], ['garden_undine', 'cloud_manta'], ['storm_hawk', 'storm_hawk']] }] };
  function garden(hi) {
    var w = hi ? '~' : 'P'; var rows = [
      'CCCCCCCCCCCCCCCCCCC',
      'C::a::::fff::::a::C',
      'C:::::I:::::I:::::C',
      'C::fff::::::::fff:C',
      'C:::::::::::::' + (hi ? '~~~' : ':::') + ':C',
      'C:I::::::::::' + (hi ? '~~~~' : '::::') + ':C',
      'C::::::::::' + (hi ? '~~~~~~' : '::::::') + ':C',
      'C:::fff:::' + (hi ? '~~~~~~~' : ':::::::') + ':C',
      'C:::::::' + w + w + (hi ? '~~~~~~~' : '::::::>') + ':C',
      'CUv:::::' + w + w + w + w + w + w + w + w + w + ':C',
      'C:::::::' + w + w + w + w + w + w + w + w + w + ':C',
      'C:I::::::::::::::IC',
      'C::::::::P:::::::C'.slice(0, 18) + 'C'
    ].concat(['CCCCCCCCCCCCCCCCCCC']);
    var id = hi ? 'aeria_garden_hi' : 'aeria_garden_lo';
    var warps = [{ x: 9, y: 13, to: DOCK, tx: 9, ty: 2 }]; if (!hi) warps.push({ x: 16, y: 8, to: 'aeria_corridor', tx: 1, ty: 7 });
    rows[13] = 'CCCCCCCCCDCCCCCCCCC';
    R.add({ id: id, name: '浮天城アエリア 庭園' + (hi ? '（傾いた水）' : '（水の引いた）'), kind: 'dungeon', bgm: 'dungeon', fallback: 'path_stone', sky78: true, rows: rows, warps: warps,
      chests: hi ? [{ id: 'ag1', x: 16, y: 1, item: 'elixir', qty: 1 }] : [{ id: 'ag2', x: 12, y: 10, gold: 5000 }],
      events: [{ x: 2, y: 9, type: 'script', solid: true, tile: 'lever', run: async function (c) { var d = D();
        if (!hi) { await c.msg(['水門は開いている。庭園の水は、雲の海へ落ちていった。']); return; }
        if (!c.has('aer_gate_key')) { await c.msg(['鍵のかかった水門。庭園の水は、傾きに沿って東の端に寄っている。']); return; }
        var ch = await c.choice('水門の鍵で、水門を開ける？', ['開ける', 'やめる']); if (ch !== 0) return;
        await c.msg(['鍵を回すと、水門が軋みながら開いた。', '寄っていた水が、ごうごうと音を立てて、城の外の雲の海へ落ちていく……', '水の下から、東の端に石の階段が現れた。']);
        d.flags.aer_gate = true; root.World.enterMap('aeria_garden_lo', 3, 9, 'right', { raw: true }); } },
        { x: 9, y: 12, type: 'script', solid: false, run: async function (c) { var d = D(); if (hi && !d.flags.aer_tilt_seen) { d.flags.aer_tilt_seen = true; await c.msg(['……床が、わずかに傾いている。', '庭園の池の水が、東の端に寄って、そこにあったはずの回廊の入口を沈めている。']); } } }],
      encounters: GENC });
  }
  garden(true); garden(false);
  // 船着き場の門：水門を開けたあとは、水の引いた庭園へ
  (function () { var dock = root.MAP_DEFS[DOCK]; var w = dock.warps[0]; Object.defineProperty(w, 'to', { enumerable: true, configurable: true, get: function () { var d = D(); return d && d.flags && d.flags.aer_gate ? 'aeria_garden_lo' : 'aeria_garden_hi'; } }); })();

  /* ---------- 水没の回廊・浮力炉 ---------- */
  var CENC = { rate: 0.05, zones: [{ name: '水没の回廊', test: function () { return true; }, groups: [['castle_guardian'], ['buoy_spirit', 'buoy_spirit'], ['castle_guardian', 'buoy_spirit'], ['garden_undine', 'storm_hawk']] }] };
  R.add({ id: 'aeria_corridor', name: '浮天城アエリア 水没していた回廊', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', sky78: true, rows: [
    '#########################',
    '#:::::::#:::::::#:::::::#',
    '#:I:u:I:#:I:::I:#:I:u:I:#',
    '#:::::::#:::::::#:::::::#',
    '#:::u:::D:::u:::D:::::::#',
    '#:::::::#:::::::#:::u:::#',
    '####D####:::::::####D####',
    '<:::::::::::I:::::::::::#',
    '####D####:::::::####D####',
    '#:::::::#:::::::#:::::::#',
    '#:::u:::D:::u:::D:::u:::#',
    '#:I:::I:#:I:::I:#:I:::I:#',
    '#::$::::#:::::::#::::::>#',
    '#########################'
  ], warps: [{ x: 0, y: 7, to: 'aeria_garden_lo', tx: 15, ty: 8 }, { x: 23, y: 12, to: 'aeria_reactor', tx: 8, ty: 8 }],
    chests: [{ id: 'ac1', x: 3, y: 12, item: 'phoenix_feather', qty: 2 }],
    events: [{ x: 2, y: 7, type: 'script', solid: false, run: async function (c) { var d = D(); if (!d.flags.aer_corridor) { d.flags.aer_corridor = true; await c.msg(['壁に、水の跡が残っている。何十年も水の底だった回廊だ。', '奥から、低い、不規則な唸りが聞こえる。……浮力炉の音だ。']); } } }],
    encounters: CENC });
  R.add({ id: 'aeria_reactor', name: '浮天城アエリア 浮力炉', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', sky78: true, rows: [
    '#################',
    '#::::::KXK::::::#',
    '#::I:::::::::I::#',
    '#:::::::::::::::#',
    '#::u:::::::::u::#',
    '#:::::::::::::::#',
    '#::I:::::::::I::#',
    '#:::::::::::::::#',
    '#:::::::<:::::::#',
    '#################'
  ], warps: [{ x: 8, y: 8, to: 'aeria_corridor', tx: 22, ty: 12 }],
    events: [{ x: 8, y: 2, type: 'script', solid: true, tile: 'crystal', run: async function (c) {
      var d = D(); if (d.flags.aer_reactor) { await c.msg(['浮力炉は、均等な、静かな音を立てている。']); return; }
      await c.msg(['巨大な青い結晶の炉心。片側だけが、まぶしく光っている。', '……炉心が、こちらを見た。暴走した力が、形を持って起き上がる。']);
      var r = await c.battle(['boss_anchor_core'], { boss: true }); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
      await c.msg(['暴走していた力が抜け、炉心の光が全体に広がった。', '炉の制御盤に手を置くと、力の配分の目盛りが、ゆっくりと真ん中に戻っていく。', '城が、かすかに揺れて——止まった。床の傾きが、なくなった。']);
      d.flags.aer_reactor = true; root.State.autosave();
    } }], encounters: null });
  /* ---------- 見た目（3D 版のテーマ・戦闘の背景） ---------- */
  R.tag(['aeria_dock', 'aeria_garden_hi', 'aeria_garden_lo', 'aeria_corridor', 'aeria_reactor'], 'aeria', 'sky', 'sky');
  R.look(['aeria_dock', 'aeria_garden_hi', 'aeria_garden_lo', 'aeria_corridor', 'aeria_reactor'], { decor: 'sky' });
})(typeof window !== 'undefined' ? window : globalThis);
