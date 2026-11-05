/* =========================================================
   Data / Region78 ネレイア（v7.8）：大西洋の赤道付近「環潮大陸ネレイア」（地球の世界の新しい地域。架空の大陸）
   ・到達：遠洋航海船（galleon_ready）。外礁（岩の輪）の切れ目を、遠洋航海船で抜ける（飛空艇でも）
   ・環状の大陸。内側は潟（ラグーン）。北の内岸に、水路を舟が行き交う「環状都市ネレイア」。東に「旧市街」
   ・旧市街は潮の満ち引きで通れる道が変わる（満潮の地図／干潮の地図。潮見の鐘を鳴らすと潮が変わる）
       満潮：水路に水があり、渡し舟で中島の「潮守の記録庫」へ渡れる（潮読みの貝）
       干潮：水路の底が現れ、南の端に海底神殿への階段が出る
   ・物語「大潮の潮門」（nereia78_tide）：海底神殿の奥で古代の潮門を開き、次の大潮から街を守る
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.R78; if (!R) return; var A = R.A; var D = R.D;
  var F = 'world_nereia'; var L = root.EARTH78_LAYOUT;
  var C0 = L.tile(-19.5, -3.0);   // 大陸の中心（世界の座標）

  /* ---------- 敵（Lv22〜26） ---------- */
  R.special('riptide', { name: '離岸流', msg: 'は渦を巻いて、全員を沖へ引きずった！', power: 0.6, all: true, debuff: { agi: -0.2 }, turns: 2 });
  R.special('spring_tide', { name: '大潮', msg: 'の呼ぶ大潮が押し寄せた！', power: 0.9, all: true });
  R.monster('tide_crab', { name: '潮だまりの大蟹', lv: 22, arche: 'tank', art: { family: 'aquatic', c: { base: '#c05a3a', accent: '#ffd0a0', eye: '#2a2a2a' } }, family: '水棲系', area: 'ネレイアの浜', resist: { thunder: 1.5, ice: 0.7 }, actions: [A('attack', 3), A('special', 'crush', 1)], drops: [{ item: 'hi_potion', rate: 0.25 }], desc: '潮が引くと現れる。満ちると、どこかへ消える。' });
  R.monster('coral_knight', { name: '珊瑚の騎士', lv: 24, arche: 'tank', art: { family: 'knight', c: { base: '#e06a8a', accent: '#ffe0c0', eye: '#4af0ff' } }, family: '魔法生物系', area: '海底神殿', resist: { thunder: 1.4, fire: 0.6 }, actions: [A('attack', 2), A('skill', 'full_slash', 1)], drops: [{ item: 'hi_potion', rate: 0.3 }], desc: '神殿を守るために珊瑚が組み上げた騎士。命令は千年前のまま。' });
  R.monster('whirl_jelly', { name: '潮渦のクラゲ', lv: 23, arche: 'mage', art: { family: 'jelly', c: { base: '#6ad0e0', accent: '#ffffff', eye: '#2a6a8a' } }, family: '水棲系', area: 'ネレイアの浜', resist: { thunder: 1.6, fire: 1.2 }, actions: [A('attack', 1), A('special', 'riptide', 2), A('skill', 'ice', 1)], drops: [{ item: 'ether', rate: 0.2 }], desc: '潮の渦に乗って浮かぶ。' });
  R.monster('atoll_shark', { name: '環礁のサメ', lv: 25, arche: 'glass', art: { family: 'shark', c: { base: '#4a6a8a', accent: '#d0e0f0', eye: '#ff3a3a' } }, family: '水棲系', area: '海底神殿', resist: { thunder: 1.4 }, actions: [A('attack', 3), A('special', 'devour', 1)], drops: [{ item: 'hi_ether', rate: 0.1 }], desc: '外礁の切れ目を回遊している。' });
  R.monster('foam_spirit', { name: '泡の精', lv: 24, arche: 'fast', art: { family: 'spirit', c: { base: '#e0f4ff', accent: '#8ad0ff', eye: '#2a4a8a' } }, family: '精霊系', area: 'ネレイアの浜', resist: { wind: 1.5, dark: 1.2 }, actions: [A('attack', 2), A('skill', 'sleep', 1)], drops: [{ item: 'calm_water', rate: 0.3 }], desc: '波の泡から生まれ、波の泡に帰る。' });
  R.monster('boss_tides', { name: '大潮の番人ティデス', lv: 27, arche: 'tank', boss: true, hpMult: 2.6, art: { family: 'hydra', size: 'boss', c: { base: '#2a6a8a', accent: '#ffe0a0', eye: '#4affe0' } }, family: '魔物系', area: '海底神殿 潮門の間', resist: { thunder: 1.5, ice: 0.5, fire: 0.8 },
    actions: [A('attack', 2), A('special', 'spring_tide', 1), A('special', 'riptide', 1), A('special', 'hydra_breath', 1)], drops: [{ item: 'elixir', rate: 1 }], desc: '潮門の前で、閉じた門を守り続けた番人。「門ハ、閉ジテイル。ダカラ、守ル」' });

  /* ---------- 報酬 ---------- */
  R.weapon('tidegate_staff', '潮門の鍵杖', 'staff', 36, 0, { desc: '古代の潮門を開いた鍵の杖。魔力+8', mag: 8, element: 'ice' });
  R.armor('coral_mail', '珊瑚の鎧', 'heavy', 32, 4200, { desc: '珊瑚を重ねた軽い鎧' });
  R.armor('surf_earring', '潮騒の耳飾り', 'acc', 2, 0, { desc: '貝殻の耳飾り。潮の音がする。魔法防御+6', mdef: 6 });
  R.key('ner_shell', '潮読みの貝', '潮守の記録庫の貝。耳に当てると、潮の満ち引きの音がする。海底神殿の封印に合う形。');

  /* ---------- クエスト ---------- */
  R.quest('nereia78_tide', { title: '大潮の潮門', theme: '満ちる時と、引く時を読む', desc: '環潮大陸ネレイアに、百年に一度の大潮が近づいている。旧市街の潮の満ち引きを読み、海底神殿の奥で古代の潮門を開いて、街を守る。',
    steps: [['ner_heard', '環状都市の潮守ミラから、大潮の話を聞く'], ['ner_bell', '旧市街の潮見の鐘で、潮の満ち引きを確かめる'], ['ner_has_shell', '満潮のとき、渡し舟で中島の記録庫へ渡り、潮読みの貝を手に入れる'], ['ner_stairs', '干潮のとき、水路の底の南の端の階段から、海底神殿へ入る'], ['ner_gate', '海底神殿の奥で、古代の潮門を開く'], ['ner_done', '潮守ミラに報告する']],
    reward: { exp: 4800, gold: 3600, item: 'tidegate_staff' } });
  R.obj('nereia78_tide', 'ner_heard', 'npc:nereia_city:nc_mira', ['大西洋の赤道付近、環潮大陸ネレイア。', '環状都市ネレイアの潮守ミラ。', '外礁の切れ目を遠洋航海船で抜け、環状都市の潮守ミラに話しかけよう。']);
  R.obj('nereia78_tide', 'ner_bell', 'ev:nereia_old_hi:3,8', ['ネレイアの東の旧市街。', '旧市街の大通りの「潮見の鐘」。', '旧市街の大通りの西にある潮見の鐘を鳴らしてみよう。']);
  R.obj('nereia78_tide', 'ner_has_shell', 'npc:nereia_old_hi:no_ferry', ['旧市街（満潮）。', '西の桟橋の渡し守。', '満潮のとき、西の桟橋の渡し守に頼んで、中島の記録庫へ渡ろう。']);
  R.obj('nereia78_tide', 'ner_stairs', 'map:nereia_temple_1', ['旧市街（干潮）。', '水路の底の南の端の階段。', '干潮のとき、水路の底を南へ歩き、海底神殿への階段を下りよう。']);
  R.obj('nereia78_tide', 'ner_gate', 'ev:nereia_temple_2:9,2', ['海底神殿。', '奥の「潮門の間」。', '神殿の封印を潮読みの貝で開き、奥の潮門の間へ。']);
  R.obj('nereia78_tide', 'ner_done', 'npc:nereia_city:nc_mira', ['環状都市ネレイア。', '潮守ミラ。', '潮守ミラに、潮門を開いたことを報告しよう。']);

  /* ---------- フィールド：環状の大陸と外礁 ---------- */
  var ringR = function (gx, gy) { var dx = gx - C0.x, dy = (gy - C0.y) * 1.05; var r = Math.sqrt(dx * dx + dy * dy); var a = Math.atan2(dy, dx); var V = root.Earth78 && root.Earth78.vnoise; var n = V ? V(Math.cos(a) * 30 + 200, Math.sin(a) * 30 + 200, 7, 71) : 0.5; var n2 = V ? V(gx, gy, 4, 72) : 0.5; return { r: r, a: a, outer: 25 + n * 6 + (n2 - 0.5) * 2, inner: 9.5 + n * 2.5 }; };
  var channel = function (gx, gy) { var dy = gy - C0.y; return gx < C0.x && Math.abs(dy - (gx - C0.x) * 0.15) < 1.6; };   // 潟と外の海をつなぐ西の水路
  R.field({ id: F, name: '環潮大陸ネレイア', fallback: 'sand', theme3d: { region: 'nereia' },
    locations: [
      { id: 'ner_city', name: '環状都市ネレイア', icon: 'castle_icon', lon: -19.5, lat: -0.9, to: 'nereia_city', tx: 15, ty: 18 },
      { id: 'ner_oldtown', name: '旧市街', icon: 'village', lon: -17.0, lat: -3.1, to: 'nereia_old_hi', tx: 12, ty: 14 },
      { id: 'ner_reeflight', name: '外礁の灯標', icon: 'tower_icon', lon: -22.6, lat: -3.6, to: 'nereia_beacon', tx: 5, ty: 7 }
    ],
    npcs: [{ id: 'nf_diver', at: ['ner_oldtown', -2, 2], sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) { await c.say('貝採りの潜り手', ['ネレイアは、輪の形の大陸さ。真ん中の潟には、外の海から西の水路で入れる。', '外礁の切れ目は三つ。遠洋航海船なら抜けられる。小舟じゃ、波に砕かれるよ。']); } }],
    chests: [{ id: 'nf1', at: ['ner_city', 5, 3], item: 'hi_ether', qty: 1 }, { id: 'nf2', at: ['ner_oldtown', 3, -3], gold: 1200 }],
    events: [{ at: ['ner_city', -5, 1], type: 'inspect', solid: false, text: ['輪の内側に、静かな潟が広がっている。', '水路を、小さな舟がいくつも行き交っている。'] }],
    encounters: { rate: 0.04, zones: [{ name: 'ネレイアの浜', test: function () { return true; }, groups: [['tide_crab'], ['whirl_jelly', 'foam_spirit'], ['tide_crab', 'whirl_jelly'], ['foam_spirit', 'foam_spirit'], ['atoll_shark']] }] },
    earth: {
      // 陸：輪の大陸だけ（この長方形の中の地球の陸＝リベリアの海岸の端は、海にする）
      land: function (gx, gy) { var q = ringR(gx, gy); if (q.r < q.outer && q.r > q.inner && !channel(gx, gy)) return 1; return 0; },
      theme: function (b, gx, gy, n) { var q = ringR(gx, gy); var edge = Math.min(q.outer - q.r, q.r - q.inner); if (edge < 2.2) return 's'; var v = root.Earth78.vnoise(gx, gy, 5, 73); return v > 0.66 ? 'F' : n < 0.12 ? 'f' : n < 0.5 ? ',' : '.'; },
      // 外礁：輪の外の海に、岩の輪（切れ目 3 つ）
      post: function (G, ctx) { var r = ctx.r; for (var y = 0; y < ctx.Hd; y++) for (var x = 0; x < ctx.Wd; x++) { var gx = r.x + x, gy = r.y + y; var q = ringR(gx, gy); if (G[y][x] !== '0' && G[y][x] !== '~') continue; var d = q.r - (q.outer + 6.5); if (Math.abs(d) > 0.8) continue;
        var deg = (q.a * 180 / Math.PI + 360) % 360; if (Math.abs(deg - 180) < 9 || Math.abs(deg - 55) < 8 || Math.abs(deg - 300) < 8) continue; if (root.Earth78.hash2(gx, gy, 74) < 0.86) ctx.set(x, y, 'c'); } }
    } });
  R.blob(F, 30, root.MAP_DEFS[F].earth.theme);   // 輪の大陸の地形（砂浜・密林・草地）

  /* ---------- 環状都市ネレイア ---------- */
  var CT = 'nereia_city';
  R.add({ id: CT, name: '環状都市ネレイア', kind: 'town', bgm: 'town', fallback: 'path_stone', style: 'harbor', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'C,,,,BBBBBB,,,,~~~~,,,,BBBBBB,,C',
    'C,,,,BBBBBB,,,,~~~~,,,,BBBBBB,,C',
    'C,,,,BBBBBB,,,,~~~~,,,,BBBBBB,,C',
    'C,y,,,,,,,,,,,,bbbb,,,,,,,,,,y,C',
    'C~~~~~~~~~bbbb~~~~~~bbbb~~~~~~~C',
    'C~~~~~~~~~bbbb~~~~~~bbbb~~~~~~~C',
    'C,,,,,,,,,,,,,,~~~~,,,,,,,,,,,,C',
    'C,VVVV,,,a,,,,,~~~~,,,,,a,,RRRRC',
    'C,VVVV,,,,,,,,,bbbb,,,,,,,,RRRRC',
    'C,VVVV,,,,j,,,,~~~~,,,,,,,,RRRRC',
    'C,,,,,,,,,,,,,,~~~~,,,,,,,,,,,,C',
    'C~~~~~~~~~bbbb~~~~~~bbbb~~~~~~~C',
    'C~~~~~~~~~bbbb~~~~~~bbbb~~~~~~~C',
    'C,,,,,,,dd,,,,,,,,,,,,,,dd,,,,,C',
    'C,,y,,,,,,,,,,,,,,,,,,,,,,,,y,,C',
    'C,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,C',
    'C,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,C',
    'CCCCCCCCCCCCCrrrrrrCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'hall', type: 'guild', name: '潮守の館', x: 5, y: 1, w: 6, h: 3, doorX: 3, interior: 'nereia_hall', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '宿「満ち潮」', x: 23, y: 1, w: 6, h: 3, doorX: 3, interior: 'nereia_inn', entry: { x: 5, y: 7 } },
    { id: 'shop', type: 'item', name: '潟の市場', x: 2, y: 8, w: 4, h: 3, doorX: 2, interior: 'nereia_shop', entry: { x: 5, y: 7 } },
    { id: 'gear', type: 'armor', name: '珊瑚細工の店', x: 27, y: 8, w: 4, h: 3, doorX: 1, interior: 'nereia_gear', entry: { x: 5, y: 7 } }
  ],
  warps: [13, 14, 15, 16, 17, 18].map(function (x) { return R.warp(x, 18, F, 'ner_city', '外へ'); }),
  chests: [{ id: 'nc1', x: 30, y: 16, item: 'hi_potion', qty: 3 }],
  events: [{ x: 16, y: 16, type: 'inspect', solid: false, text: ['街の石畳に、輪の形の紋章。中に、満ちる波と引く波が刻まれている。', '「潮を読む者は、潮に逆らわない」'] }],
  npcs: [
    { id: 'nc_mira', x: 12, y: 15, sprite: 'npc_priestess', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (c.questDone('nereia78_tide')) { await c.say('潮守ミラ', ['潮門が開いて、大潮は外礁で砕けた。街は、一滴も濡れなかった。', '……潮は止められない。でも、通り道を作ってやることはできる。']); return; }
      if (d.flags.ner_gate) { await c.say('潮守ミラ', ['潮門の音が、ここまで聞こえた。低い、長い音。……千年ぶりの音よ。', '次の大潮は、外礁の向こうへ流れていく。ネレイアは守られた。']); d.flags.ner_done = true; await c.questComplete('nereia78_tide'); c.give('surf_earring', 1); await c.msg(['潮騒の耳飾りも受け取った。']); return; }
      if (!c.questActive('nereia78_tide')) {
        await c.say('潮守ミラ', ['環状都市ネレイアへようこそ。わたしは潮守のミラ。潮の満ち引きを読んで、街に知らせる役目よ。', '百年に一度の大潮が、もうすぐ来る。前の大潮では、旧市街の半分が沈んだ。', '海底神殿の奥に、古代の「潮門」がある。門を開けば、大潮は外礁の向こうへ流れていく。……でも、神殿への階段は干潮のときしか現れない。']);
        var ch = await c.choice('潮門を開いて、街を守ってほしい。', ['引き受ける', 'あとにする']); if (ch !== 0) return;
        c.questStart('nereia78_tide'); d.flags.ner_heard = true;
        await c.say('潮守ミラ', ['旧市街は輪の東。大通りの潮見の鐘を鳴らすと、古い仕掛けが潮を呼ぶの。', '神殿の封印には「潮読みの貝」が要る。中島の記録庫にあるけれど、そこへは満潮のときに舟でしか渡れない。', '満ちる時と、引く時。どちらも、使うのよ。']); return;
      }
      await c.say('潮守ミラ', ['満潮で記録庫へ、干潮で神殿へ。潮見の鐘で、潮を変えられる。']);
    } },
    { id: 'nc_boatman', x: 8, y: 14, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) { await c.say('水路の舟人', ['この街の道の半分は水路さ。橋を渡るか、舟で行くか。', '外の海からは、西の水路で潟に入れる。遠洋航海船は大きすぎて、潟の奥までは入れないがな。']); } },
    { id: 'nc_kid', x: 20, y: 10, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('街の子ども', ['旧市街の鐘を鳴らすと、潮が変わるんだよ！ ほんとだよ！', 'おばあちゃんは、鐘じゃなくて月が潮を呼ぶって言うけど。']); } },
    { id: 'nc_scholar', x: 25, y: 4, sprite: 'scholar', dir: 'down', wander: 1, talk: async function (c) { await c.say('潮の学者', ['ネレイアは、大西洋の真ん中に浮かぶ輪の大陸だ。西に南アメリカ、東にアフリカ。', '昔の人は、海に沈んだ大陸の伝説を語った。……ここが沈まずに済んでいるのは、潮門のおかげかもしれない。']); } }
  ] });
  R.inn('nereia_inn', '宿「満ち潮」', CT, 26, 4, 90);
  R.shop('nereia_shop', '潟の市場', CT, 4, 11, 'merchant', 'item', ['hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'escape_wing', 'tent'], ['潟で採れた貝の干物もあるよ。……薬の話だったね。']);
  R.shop('nereia_gear', '珊瑚細工の店', CT, 28, 11, 'merchant', 'armor', ['coral_mail', 'knight_armor', 'knight_shield', 'iron_helm'], ['珊瑚の鎧は軽いよ。泳いでも沈まない……かもしれない。']);
  R.add({ id: 'nereia_hall', name: '潮守の館', kind: 'interior', bgm: 'town', rows: ['############', '#KK_XX__KK_#', '#__________#', '#_TTTT_____#', '#__________#', '#_t___t_q__#', '#__________#', '#__________#', '#####D######'], warps: [{ x: 5, y: 8, to: CT, tx: 8, ty: 4 }],
    events: [{ x: 4, y: 1, type: 'inspect', solid: true, text: ['潮の記録。何百年分もの、満ちる時と引く時が並んでいる。', '百年ごとに、ひときわ高い印。「大潮」。最後の印の横に「次」とだけ書いてある。'] }] });
  R.add({ id: 'nereia_beacon', name: '外礁の灯標', kind: 'interior', bgm: 'town', rows: ['############', '#o___XX___o#', '#__________#', '#____II____#', '#__________#', '#_t______q_#', '#__________#', '#__________#', '#####D######'], warps: [R.warp(5, 8, F, 'ner_reeflight', '外へ')],
    npcs: [{ id: 'nb_keeper', x: 5, y: 2, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) { await c.say('灯標守', ['外礁の切れ目は三つ。西と、北東と、南東。', '灯標の光は、切れ目の向きを示してる。……小舟は来るな、という合図でもある。']); } }] });

  /* ---------- 旧市街（満潮／干潮） ---------- */
  var OLD = function (tide) { var hi = tide === 'hi';
    var W = hi ? '~' : 's';   // 水路：満潮は水、干潮は乾いた底
    var rows = [
      '############################',
      '#,,,,,,,,,,,====,,,,,,,,,,,#',
      '#,VVVVV,,,,,cccc,,,,BBBBB,,#',
      '#,VVVVV,,,,' + W + 'cRRc' + W + ',,,BBBBB,,#',
      '#,VVVVV,,,,' + W + 'cRRc' + W + ',,,BBBBB,,#',
      '#,,,,,,,,,,' + W + (hi ? 'cddc' : 'cccc') + W + ',,,,,,,,,,#',
      '#,y,,,,,,d,' + W + W + W + W + W + W + ',d,,,,,y,,#',
      '#,,,,,,,,d' + W + W + W + W + W + W + W + W + 'd,,,,,,,,#',
      '#=========' + W + W + W + W + W + W + W + W + '=========#',
      '#,,,,,,,,,' + W + W + W + W + W + W + W + W + ',,,,,,,,,#',
      '#,VVVV,,,,' + W + W + W + W + W + W + W + W + ',,,,RRRR,#',
      '#,VVVV,,,,' + W + W + W + W + W + W + W + W + ',,,,RRRR,#',
      '#,,,,,,,,,' + W + W + W + W + W + W + W + W + ',,,,,,,,,#',
      '#,,,,,,,,,' + W + W + W + (hi ? '~' : '>') + W + W + W + W + ',,,,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '##########,,,,,,############'
    ];
    var id = 'nereia_old_' + tide, other = 'nereia_old_' + (hi ? 'lo' : 'hi');
    var warps = [10, 11, 12, 13, 14, 15].map(function (x) { return R.warp(x, 15, F, 'ner_oldtown', '外へ'); });
    if (!hi) warps.push({ x: 13, y: 13, to: 'nereia_temple_1', tx: 9, ty: 12 });
    var npcs = [
      { id: 'no_ferry', x: 8, y: 7, sprite: 'sailor', dir: 'right', wander: 0, talk: async function (c) {
        if (!hi) { await c.say('渡し守', ['見てのとおり、潮が引いて水路は泥の底さ。舟は出せない。', '中島の桟橋は、底からじゃ高すぎて上がれないよ。満ち潮を待ちな。']); return; }
        var ch = await c.choice('渡し守「中島の記録庫へ渡るかい？」', ['渡る', 'やめる']); if (ch !== 0) return;
        await c.msg(['小舟が、満ちた水路をすべるように進んだ。']); root.World.enterMap(id, 13, 5, 'up', { raw: true });
      } },
      { id: 'no_ferry2', x: 14, y: 5, sprite: 'villager_f', dir: 'left', wander: 0, talk: async function (c) {
        if (!hi) { await c.say('渡し守の娘', ['潮が引いてる間は、父さんも舟を出さないの。']); return; }
        var ch = await c.choice('渡し守の娘「西の桟橋へ戻る？」', ['戻る', 'やめる']); if (ch !== 0) return;
        root.World.enterMap(id, 9, 8, 'down', { raw: true });
      } },
      { id: 'no_elder', x: 22, y: 13, sprite: 'elder', dir: 'down', wander: 1, talk: async function (c) { await c.say('旧市街の古老', hi ? ['満ち潮だ。水路が道を飲み込む。', '前の大潮のときは、この大通りまで水が来た。わしの家は、まだ二階しか使えん。'] : ['引き潮だ。水路の底を歩けるのは、今だけじゃよ。', '南の端の階段は、海の底の神殿へ続いておる。子どもの頃、一度だけ見た。']); } }
    ];
    if (!hi) npcs.splice(1, 1);   // 干潮：中島の桟橋に人はいない（水路の底から上がれない）
    R.add({ id: id, name: '旧市街（' + (hi ? '満潮' : '干潮') + '）', kind: 'town', bgm: 'town', fallback: 'grass2', style: 'harbor', tide78: tide, rows: rows,
      buildings: hi ? [{ id: 'archive', type: 'house', name: '潮守の記録庫', x: 13, y: 3, w: 2, h: 2, doorX: 0, interior: 'nereia_archive', entry: { x: 5, y: 7 } }] : [],   // 干潮：中島の桟橋に上がれない（記録庫の扉は満潮の地図だけ）
      warps: warps, npcs: npcs, chests: hi ? [{ id: 'no_hi1', x: 2, y: 14, item: 'hi_ether', qty: 1 }] : [{ id: 'no_lo1', x: 16, y: 12, gold: 1600 }],
      events: [{ x: 3, y: 8, type: 'script', solid: true, tile: 'lamp', run: async function (c) { var d = D();
        await c.msg(hi ? ['潮見の鐘。鳴らすと、古い仕掛けが潮を呼ぶという。', '……今は満ち潮。水路は水でいっぱいだ。'] : ['潮見の鐘。……今は引き潮。水路の底が見えている。']);
        var ch = await c.choice('鐘を鳴らす？', ['鳴らす', 'やめる']); if (ch !== 0) return;
        if (root.Audio) root.Audio.sfx('magic'); await c.msg(['ゴォン……と、低い音が旧市街に響いた。', hi ? '水路の水が、ゆっくりと引いていく……' : '水路に、海の水が満ちてくる……']);
        if (c.questActive('nereia78_tide')) d.flags.ner_bell = true; d.flags.ner_tide = hi ? 'lo' : 'hi';
        root.World.enterMap(other, 3, 9, 'down', { raw: true }); } }],
      encounters: null });
  };
  OLD('hi'); OLD('lo');
  R.add({ id: 'nereia_archive', name: '潮守の記録庫', kind: 'interior', bgm: 'town', rows: ['############', '#KK_KK_KK_K#', '#__________#', '#_t__XX__t_#', '#__________#', '#_q______q_#', '#__________#', '#__________#', '#####D######'], warps: [{ x: 5, y: 8, to: 'nereia_old_hi', tx: 13, ty: 5 }],
    events: [{ x: 5, y: 3, type: 'script', solid: true, tile: 'crystal', run: async function (c) { var d = D(); if (d.flags.ner_has_shell) { await c.msg(['台座は空だ。貝の形のくぼみだけが残っている。']); return; }
      await c.msg(['台座に、大きな巻き貝が置かれている。耳に当てると、満ちる音と、引く音が、交互に聞こえる。', '台座の文字：「潮読みの貝。神殿の封印に。満ちる時に取り、引く時に使え」']); c.give('ner_shell', 1); d.flags.ner_has_shell = true; await c.msg(['潮読みの貝を手に入れた！']); } }] });

  /* ---------- 海底神殿（2層） ---------- */
  var TP_ENC = { rate: 0.05, zones: [{ name: '海底神殿', test: function () { return true; }, groups: [['coral_knight'], ['atoll_shark', 'whirl_jelly'], ['coral_knight', 'foam_spirit'], ['atoll_shark', 'atoll_shark'], ['tide_crab', 'coral_knight']] }] };
  R.add({ id: 'nereia_temple_1', name: '海底神殿 満ち引きの回廊', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '###################',
    '#::::::::>::::::::#',
    '#:I:~~~:::::~~~:I:#',
    '#:::~~~:::::~~~:::#',
    '#:::::::#L#:::::::#',
    '#:~~~:::#:#:::~~~:#',
    '#:~~~:::#:#:::~~~:#',
    '#:::::::#:#:::::::#',
    '#:I:::::::::::::I$#',
    '#::::~~~:::~~~::::#',
    '#::::~~~:::~~~::::#',
    '#:::::::::::::::::#',
    '#::::::::<::::::::#',
    '###################'
  ], warps: [{ x: 9, y: 12, to: 'nereia_old_lo', tx: 13, ty: 12 }, { x: 9, y: 1, to: 'nereia_temple_2', tx: 9, ty: 9 }],
    chests: [{ id: 'nt1', x: 17, y: 8, item: 'hi_ether', qty: 2 }],
    events: [
      { x: 9, y: 4, type: 'locked', solid: true, doneFlag: 'ner_seal_open', key: 'ner_shell', text: ['貝の形のくぼみがある封印の扉。……合う形の物がない。'] },
      { x: 9, y: 11, type: 'script', solid: false, run: async function (c) { var d = D(); if (!d.flags.ner_stairs) { d.flags.ner_stairs = true; await c.msg(['ひんやりとした空気。壁の向こうから、潮の音が聞こえる。', '……ここは海の底だ。神殿は、潮が満ちても沈まないように造られている。']); } } }
    ], encounters: TP_ENC });
  R.add({ id: 'nereia_temple_2', name: '海底神殿 潮門の間', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    '###################',
    '#~~~~~~~~UUU~~~~~~#',
    '#~~~~~~~:::::~~~~~#',
    '#:::I:::::::::I:::#',
    '#:::::::::::::::::#',
    '#::~~~:::::::~~~::#',
    '#::~~~:::::::~~~::#',
    '#:::::::::::::::::#',
    '#:::I:::::::::I:::#',
    '#::::::::<::::::::#',
    '###################'
  ], warps: [{ x: 9, y: 9, to: 'nereia_temple_1', tx: 9, ty: 2 }],
    events: [{ x: 9, y: 2, type: 'script', solid: true, tile: 'lever', run: async function (c) {
      var d = D(); if (d.flags.ner_gate) { await c.msg(['潮門は開いている。外礁の向こうへ、潮の通り道ができた。']); return; }
      await c.msg(['巨大な石の門。水の重さで、千年閉じたままだ。門の前の床に、大きなハンドルがある。', '……水の中から、多くの首を持つ影が起き上がった。', '大潮の番人「門ハ、閉ジテイル。ダカラ、守ル。開ケル者ハ、沈メル」']);
      var r = await c.battle(['boss_tides'], { boss: true }); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
      await c.msg(['番人は、泡になって消えた。……最後に、少しだけ頭を下げたように見えた。', 'ハンドルを回した。ゴゴゴ……と、低く、長い音。', '潮門が開いた。神殿の外で、潮の流れが向きを変える音がする。']);
      d.flags.ner_gate = true; root.State.autosave();
    } }], encounters: null });
  /* ---------- 見た目（3D 版のテーマ・戦闘の背景） ---------- */
  R.tag(['world_nereia', 'nereia_city', 'nereia_old_hi', 'nereia_old_lo', 'nereia_inn', 'nereia_shop', 'nereia_gear', 'nereia_hall', 'nereia_beacon', 'nereia_archive'], 'nereia', null, 'islands');
  R.tag(['nereia_temple_1', 'nereia_temple_2'], 'nereia', 'sea', 'islands');
})(typeof window !== 'undefined' ? window : globalThis);
