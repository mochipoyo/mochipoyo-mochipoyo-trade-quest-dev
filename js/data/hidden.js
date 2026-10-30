/* =========================================================
   Data / Hidden (v5.6 Phase 7-2) : 隠しダンジョン1・2・4と、グラニアの海の小島
   ・隠し1「灰の洞窟」（グラニア平野の北）：1階の奥、波形の紋章の扉（トレーダーランクC）→ 2階に灰の王（任意の強敵）
   ・隠し2「沈没船の礁」（グラニアの南東の海。船でのみ到達）：船倉 → 船長室に幽霊船長（任意の強敵）。ナギの父の航海日誌（nagi_chart）
   ・隠し4「旧都市 深層」（ゼロメアの旧都市2階の封印昇降機。トレーダーランクA）→ 2階に旧都市の演算核（任意の強敵）
   ・海賊カモメの巣（グラニアの南西の海）・灰の岬（北東の海）：grania_sea_pirates / grania_lighthouse_rock（sidequests2.js）
   ========================================================= */
(function (root) {
  'use strict';
  var add = root.TownKit.add; var M = root.MAP_DEFS;
  function D() { return root.State.data; }
  function inParty(id) { var d = D(); return !!(d.companions[id] && d.party.indexOf(id) >= 0); }

  /* ---------- 隠し1：灰の洞窟 ---------- */
  var ASH_ENC = { rate: 0.045, zones: [{ name: '灰の洞窟', test: function () { return true; }, groups: [['ash_wraith', 'ash_wraith'], ['cinder_hound'], ['ash_wraith', 'cinder_hound'], ['ash_golem', 'ash_wraith']], level: 18 }] };
  add({ id: 'ash_cave_1', name: '灰の洞窟', kind: 'dungeon', bgm: 'dungeon', fallback: 'ash', rows: [
      'GGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGG88888888GGG',
      'GG89888GGGGGG8GGGGGG8GGG',
      'GG88888GGGGGG8GGGGGG8GGG',
      'GGGGGG8GGGGGG8GGGGGG8GGG',
      'GGGGGG8GGGGGG8GGGGGG8GGG',
      'GGGGGG88888888GGGGGG8GGG',
      'GGGGGG8GGGGGGGGGGGGG8GGG',
      'GGGGGG88888GGGGGGGGG8GGG',
      'GGGGGG8GG88GGGGG88888GGG',
      'GGGGGG8GG89GGGGG8GGGGGGG',
      '8888888GGGGGGGGG8GGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGG'
    ],
    warps: [{ x: 0, y: 12, to: 'world_grania', tx: 44, ty: 39, name: '洞窟の外へ' }, { x: 16, y: 12, to: 'ash_cave_2', tx: 9, ty: 9 }],
    chests: [{ id: 'ac_c1', x: 2, y: 4, item: 'hi_potion', qty: 2 }, { id: 'ac_c2', x: 10, y: 10, gold: 1200 }],
    events: [
      { x: 16, y: 12, type: 'rank_door', solid: true, doneFlag: 'ash_cave_open', rank: 3, text: ['灰に埋もれた石の扉。波形の紋章が刻まれている。奥から熱い風が吹いてくる。'] },
      { x: 13, y: 5, type: 'inspect', solid: false, text: ['壁に、古い坑夫の落書き。「灰の王は、急ぐ者から食う」'] }
    ],
    encounters: ASH_ENC });
  add({ id: 'ash_cave_2', name: '灰の洞窟 奥', kind: 'dungeon', bgm: 'boss_area', fallback: 'ash', rows: [
      'GGGGGGGGGGGGGGGGGGGG',
      'G888888889988888888G',
      'G889888888888888988G',
      'G888888888888888888G',
      'G888888888888888888G',
      'G888888888888888888G',
      'G888888888888888888G',
      'G888888888888888888G',
      'G889888888888888988G',
      'G888888888888888888G',
      'GGGGGGGGG<GGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGG'
    ],
    warps: [{ x: 9, y: 10, to: 'ash_cave_1', tx: 16, ty: 11 }],
    chests: [{ id: 'ac_c3', x: 1, y: 1, item: 'elixir', qty: 1 }],
    events: [{ x: 9, y: 4, type: 'boss', solid: true, optional: true, doneFlag: 'ash_lord_defeated', enemy: 'boss_ash_lord', intro: ['灰の山が崩れ、溶けた鉄の目をした巨人が立ち上がった。', '灰の王「……鉱山ノ連中ハ、急イデ掘ッタ。急イデ崩レタ。オ前ハ、ドウダ」'], after: ['灰の王は、ただの灰の山に戻った。', '灰の中から、重い大槌が出てきた。'], questComplete: 'hidden_grania_cave' }],
    encounters: null });

  /* ---------- 隠し2：沈没船の礁（船でのみ到達） ---------- */
  var REEF_ENC = { rate: 0.045, zones: [{ name: '沈没船の礁', test: function () { return true; }, groups: [['drowned_sailor', 'drowned_sailor'], ['reef_lurker'], ['drowned_sailor', 'reef_lurker'], ['sea_serpent']], level: 19 }] };
  add({ id: 'sunken_reef_1', name: '沈没船の礁', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_wood', rows: [
      'WWWWWWWWWWWWWWWWWWWWWW',
      'WWWWWWWW__>___WWWWWWWW',
      'WWWWWWWW______WWWWWWWW',
      'WWW_________u______WWW',
      'WWW_WWWWWWWWWWWWWW_WWW',
      'WWW_WWWWWWWWWWWWWW_WWW',
      'WWW_WWWWWWWWWWWWWW_WWW',
      'WWW_WWWWWWWWWWWWWW_WWW',
      'WWW__u_________u___WWW',
      'WWWWWWWWWW_WWWWW_WWWWW',
      'WWWWWWWWWW_WWW___WWWWW',
      'WWWWWWWWWW_WWW___WWWWW',
      'W<_________WWW___WWWWW',
      'WWWWWWWWWWWWWWWWWWWWWW'
    ],
    warps: [{ x: 1, y: 12, to: 'world_grania', tx: 134, ty: 96, name: '礁の外へ' }, { x: 10, y: 1, to: 'sunken_reef_2', tx: 7, ty: 9 }],
    chests: [{ id: 'sr_c1', x: 15, y: 12, item: 'hi_ether', qty: 2 }, { id: 'sr_c2', x: 3, y: 3, gold: 1500 }],
    events: [{ x: 18, y: 5, type: 'inspect', solid: false, text: ['傾いた船倉の壁に、船の名前が焼き印で押してある。「暁の羅針号」。', '舳先には、波形の旗の切れ端が絡まっている。'] }],
    encounters: REEF_ENC });
  add({ id: 'sunken_reef_2', name: '沈没船 船長室', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_wood', rows: [
      'WWWWWWWWWWWWWWWW',
      'W______________W',
      'W_t____KK____t_W',
      'W______________W',
      'W______________W',
      'W__u________u__W',
      'W______________W',
      'W______________W',
      'W_q__________z_W',
      'W______________W',
      'WWWWWWW<WWWWWWWW'
    ],
    warps: [{ x: 7, y: 10, to: 'sunken_reef_1', tx: 10, ty: 2 }],
    events: [
      { x: 7, y: 4, type: 'boss', solid: true, optional: true, doneFlag: 'ghost_captain_defeated', enemy: 'boss_ghost_captain', intro: ['船長室の机の向こうに、濡れた外套の影が立っていた。', '幽霊船長「嵐を読み違えた。……いや、読んでいた。それでも出航した。積荷の値が、明日には下がると聞いたからだ」'], after: ['幽霊船長は、静かに帽子を取った。「……急ぐ理由が、正しく思えた。それが一番、危ない」', '影は、海の光に溶けていった。'], questComplete: 'hidden_sea_reef' },
      { x: 7, y: 2, type: 'script', solid: true, run: async function (c) { var d = D();
        if (!d.flags.ghost_captain_defeated) { await c.msg(['船長の机。濡れた外套の影が、机を離れない。']); return; }
        if (c.questActive('nagi_chart') && !d.flags.nagi_log_found) {
          await c.msg(['机の引き出しに、油紙で包まれた航海日誌が残っていた。表紙に「ハヤテ」と名前がある。']);
          await c.say('ナギ', ['……父さんの字だ。', '「この船の船長は嵐の中で出航した。わたしは止めた。止められなかった」……父さんは、この船に乗っていたんだ。']);
          await c.say('ナギ', ['最後の頁。「航路図は、読む者が自分で引き直すもの。私の線をなぞるな。だが、私の失敗は読め」', '……読むよ、父さん。']);
          d.flags.nagi_log_found = true; c.give('father_log', 1); await c.msg(['ナギの父の航海日誌を手に入れた。']); await c.questComplete('nagi_chart'); return;
        }
        await c.msg(['船長の机。海図は塩で読めなくなっている。']);
      } }
    ],
    encounters: null });

  /* ---------- 隠し4：旧都市 深層（旧都市2階の封印昇降機・ランクA） ---------- */
  if (M.old_city_2) {
    M.old_city_2.warps.push({ x: 16, y: 1, to: 'old_city_deep_1', tx: 2, ty: 12 });
    M.old_city_2.events.push({ x: 16, y: 1, type: 'rank_door', solid: true, doneFlag: 'old_city_deep_open', rank: 5, text: ['壁の奥に、封印された昇降機の扉。演算都市の紋章の上から、波形の紋章が重ねて刻まれている。'] });
  }
  var DEEP_ENC = { rate: 0.045, zones: [{ name: '旧都市 深層', test: function () { return true; }, groups: [['core_sentinel'], ['data_phantom', 'data_phantom'], ['core_sentinel', 'data_phantom'], ['rust_sentinel', 'data_phantom']], level: 38 }] };
  add({ id: 'old_city_deep_1', name: '旧都市 深層', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
      '########################',
      '########################',
      '###::::::::::::::::::###',
      '###:################:###',
      '###:################:###',
      '###:##########::::##:###',
      '###::::::#####:::::::###',
      '########:#####::::##:###',
      '########:###>#:#####:###',
      '########:###:#######:###',
      '########:###:#######:###',
      '########:###:::::::::###',
      '#<:::::::###############',
      '########################'
    ],
    warps: [{ x: 1, y: 12, to: 'old_city_2', tx: 16, ty: 2 }, { x: 12, y: 8, to: 'old_city_deep_2', tx: 8, ty: 11 }],
    chests: [{ id: 'od_c1', x: 15, y: 6, item: 'elixir', qty: 2 }, { id: 'od_c2', x: 3, y: 2, gold: 5000 }],
    events: [{ x: 8, y: 9, type: 'inspect', solid: false, text: ['壁の端末に、最初期の演算記録が残っている。', '「予測の精度：99.2%。残り0.8%の誤差を、我々は『運』と呼んで切り捨てた」'] }],
    encounters: DEEP_ENC });
  add({ id: 'old_city_deep_2', name: '旧都市 深層 演算核', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
      '#################',
      '#::::::XXX::::::#',
      '#:i:::::::::::i:#',
      '#:::::::::::::::#',
      '#:::::::::::::::#',
      '#:::::::::::::::#',
      '#:::::::::::::::#',
      '#:::::::::::::::#',
      '#:::::::::::::::#',
      '#:::::::::::::::#',
      '#:i:::::::::::i:#',
      '#:::::::::::::::#',
      '########<########'
    ],
    warps: [{ x: 8, y: 12, to: 'old_city_deep_1', tx: 12, ty: 9 }],
    events: [
      { x: 8, y: 6, type: 'boss', solid: true, optional: true, doneFlag: 'old_core_defeated', enemy: 'boss_old_core', intro: ['部屋の中心で、古い演算核が赤く点滅した。', '旧都市の演算核「誤差0.8%ヲ排除スル。排除対象：オ前タチ」'], after: ['演算核の光が消えた。最後に、短い記録が流れた。', '「……0.8%ノ中ニ、人間ガ、イタ」'], questComplete: 'hidden_old_city' },
      { x: 8, y: 1, type: 'inspect', solid: true, text: ['演算核の台座。最初の設計図に、手書きのメモが残っている。「誤差をなくすな。誤差を、扱え」'] }
    ],
    encounters: null });

  /* ---------- グラニアの海の小島（海賊カモメの巣・灰の岬） ---------- */
  add({ id: 'pirate_nest', name: '海賊カモメの巣', kind: 'dungeon', bgm: 'field', fallback: 'sand', rows: [
      '~~~~~~~~~~~~~~~~',
      '~~~~wwwwwwww~~~~',
      '~~~ws......sw~~~',
      '~~ws..9.....sw~~',
      '~~ws........sw~~',
      '~~ws...9....sw~~',
      '~~~ws......sw~~~',
      '~~~~wwwddwww~~~~',
      '~~~~~~~dd~~~~~~~'
    ],
    warps: [7, 8].map(function (x) { return { x: x, y: 8, to: 'world_grania', tx: 20, ty: 100, name: '船へ' }; }),
    chests: [{ id: 'pn_c1', x: 10, y: 3, item: 'hi_potion', qty: 3 }],
    encounters: null });
  add({ id: 'ash_cape', name: '灰の岬', kind: 'dungeon', bgm: 'field', fallback: 'sand', rows: [
      '~~~~~~~~~~~~~~~~',
      '~~~wwwwwwwww~~~~',
      '~~ws....m..sw~~~',
      '~~ws.......sw~~~',
      '~~ws...mm...sw~~',
      '~~~ws.......sw~~',
      '~~~~wwwwddwww~~~',
      '~~~~~~~~dd~~~~~~'
    ],
    warps: [8, 9].map(function (x) { return { x: x, y: 7, to: 'world_grania', tx: 128, ty: 20, name: '船へ' }; }),
    encounters: null });
})(typeof window !== 'undefined' ? window : globalThis);
