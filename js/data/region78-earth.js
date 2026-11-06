/* =========================================================
   Data / Region78 earth（v7.8）：町のない大陸に「地球の記録」を置く（3D 版の地球の世界だけ）
   ・南アメリカ・アフリカ・オーストラリア・シベリア・ゴビ・北アメリカ西部の 8 か所に、調べられる遺跡（石の柱）
   ・サブクエスト「失われた地球の記録」：アルカディアの港のそばの「大洋の地図売り」から。8 か所を調べて報告すると、地球儀のブローチ
   ・遺跡の場所は経度・緯度。外の地図（w78_*）を作るときに、いちばん近い歩ける陸へ置く（js/rpg/earth78.js の fillerDef）
   ・地球の世界でないとき（2D 版など）は、クエストは掲示しない・案内は外す（R78.finish）。アイテムの定義は残す
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.R78; if (!R) return; var D = R.D;
  var Q = 'earth78_records';
  R.armor('earth_globe', '地球儀のブローチ', 'acc', 5, 0, { desc: '小さな地球儀を閉じこめたブローチ。最大HP+30・魔法防御+5・すばやさ+3', hp: 30, mdef: 5, agi: 3 });
  var SITES = root.EARTH78_SITES = [
    { id: 'amazon', flag: 'erec_amazon', lon: -62.5, lat: -3.5, name: '沈んだ天文台', area: '南アメリカ（アマゾンの密林）', item: 'hi_ether',
      text: ['密林に半分のみこまれた、白い丸屋根の天文台。', '壁の記録板：「大雨の百年。川は町をのみ、森は道をのみこんだ。それでも、ここから星の位置を測り続けた」', '……最後の観測日の欄だけが、空いたまま残っている。'] },
    { id: 'andes', flag: 'erec_andes', lon: -71.5, lat: -13.5, name: '空の段々畑', area: '南アメリカ（アンデスの山）', item: 'elixir',
      text: ['山の斜面に刻まれた、石の段々畑。今も誰かが手入れをしているように、緑が残っている。', '石碑：「水を分け合う決まりは、どの王よりも長生きした」'] },
    { id: 'rift', flag: 'erec_rift', lon: 36.3, lat: -1.5, name: '大地の裂け目の足跡', area: 'アフリカ東部（大地溝帯）', item: 'phoenix_feather',
      text: ['大地の裂け目に沿って、化石になった足跡が続いている。', '記録板：「人がはじめて歩いた道。何万年たっても、足跡は同じ向きを向いている」'] },
    { id: 'cape', flag: 'erec_cape', lon: 19.5, lat: -33.8, name: '岬の灯台跡', area: 'アフリカ南端', item: 'hi_ether',
      text: ['二つの海がぶつかる岬に、崩れた灯台が立っている。', '灯室の記録：「嵐の岬と呼ばれ、のちに希望の岬と名を変えた。名前を変えたのは、岬ではなく人のほうだった」'] },
    { id: 'uluru', flag: 'erec_uluru', lon: 131.0, lat: -25.3, name: '赤い一枚岩の観測所', area: 'オーストラリア（中央の砂漠）', item: 'elixir',
      text: ['砂漠のまんなかに、赤く大きな一枚岩。ふもとに、無人の観測所がある。', '記録板：「夕方、岩の色が変わる時刻を、千年分書きとめた。同じ色の日は、一日もなかった」'] },
    { id: 'siberia', flag: 'erec_siberia', lon: 105.0, lat: 62.0, name: '凍った鉄路の駅', area: 'シベリア（針葉樹の森）', item: 'phoenix_feather',
      text: ['針葉樹の森の中に、雪に埋もれた駅舎。線路は東と西へ、どこまでも続いている。', '時刻表：「次の列車：未定」。……その下に、子どもの字で「でも、まってる」。'] },
    { id: 'gobi', flag: 'erec_gobi', lon: 106.0, lat: 41.0, name: '砂に埋もれた長い城壁', area: 'アジア内陸（ゴビの南）', item: 'hi_ether',
      text: ['砂丘から、城壁の上だけが顔を出している。東西に、地平線まで。', '記録板：「外から守るために築いた壁が、今は砂から町を守っている」'] },
    { id: 'canyon', flag: 'erec_canyon', lon: -112.1, lat: 36.1, name: '赤い岩の大峡谷', area: '北アメリカ西部', item: 'elixir',
      text: ['足もとが、いきなり切れ落ちている。はるか下を、細い川が流れている。', '記録板：「川が一年に削るのは、紙一枚ぶん。それを二十億年続けると、こうなる」'] }
  ];
  var found = function () { var d = D(); return SITES.filter(function (s) { return d.flags[s.flag]; }).length; };
  R.earthRecords = { sites: SITES, found: found, quest: Q };
  // 調べたとき（js/rpg/earth78.js が外の地図の出来事にする）
  SITES.forEach(function (s) {
    s.run = async function (c) {
      var d = D(); await c.msg(['【' + s.name + '】（' + s.area + '）'].concat(s.text));
      if (d.flags[s.flag]) { await c.msg(['（地球の記録 ' + found() + '/' + SITES.length + '）']); return; }
      d.flags[s.flag] = true; if (s.item) { c.give(s.item, 1); var it = root.ITEMS && root.ITEMS[s.item]; await c.msg(['足もとに、' + (it ? it.name : s.item) + 'が落ちていた。']); }
      var n = found(); await c.msg(['地球の記録を書き写した。（' + n + '/' + SITES.length + '）'].concat(n >= SITES.length ? ['……これで全部だ。アルカディアの港のそばの、大洋の地図売りに見せよう。'] : []));
      if (root.State && root.State.autosave) root.State.autosave();
    };
  });
  R.quest(Q, { title: '失われた地球の記録', theme: '町のない大陸を歩く', desc: 'アルカディアの港のそばの「大洋の地図売り」は、町のない大陸に残る古い記録を集めている。8 か所の遺跡を調べて、記録を書き写して見せてほしいという。',
    steps: SITES.map(function (s) { return [s.flag, s.area + 'の「' + s.name + '」を調べる']; }).concat([['erec_done', '大洋の地図売りに、8 つの記録を見せる']]),
    reward: { exp: 8000, gold: 5000, item: 'earth_globe' } });
  SITES.forEach(function (s) {
    var e = { q: Q, done: s.flag, h: [s.area + '。', '「' + s.name + '」の石の柱。', s.area + 'の「' + s.name + '」へ行き、石の柱を調べよう。（船で海岸に上陸して歩く）'], side: true };
    Object.defineProperty(e, 't', { enumerable: true, get: function () { return s.map ? 'ev:' + s.map + ':' + s.x + ',' + s.y : 'map:world'; } });
    if (root.OBJECTIVES) { root.OBJECTIVES.push(e); R.objs.push(e); }
  });
  R.obj(Q, 'erec_done', 'npc:world:w_mapseller78', ['アルカディア相場大陸。', '港町マリナのそばの「大洋の地図売り」。', '大洋の地図売りに、8 つの記録を見せよう。']);
  // 大洋の地図売り（js/rpg/earth78.js が地球の世界のアルカディアに置く）の会話から呼ぶ
  R.earthRecords.talk = async function (c) {
    var d = D(); var n = found(), N = SITES.length;
    if (c.questDone(Q)) { await c.say('大洋の地図売り', ['あの記録の写し、毎晩読み返してるよ。', '……地図には、町の名前しか書けない。でも、あそこに人がいたことは、書いておきたいんだ。']); return; }
    if (!c.questActive(Q)) {
      await c.say('大洋の地図売り', ['海の向こうには、町のない大陸がいくつもある。', 'でも、人がいなかったわけじゃない。石の柱に、古い記録が残ってるって話だ。', 'アマゾンの密林、アンデスの山、アフリカの東と南の端、オーストラリアのまんなか、シベリアの森、ゴビの砂、北アメリカの西の大峡谷。全部で ' + N + ' か所。']);
      var ch = await c.choice('記録を書き写して、見せてくれないか？', ['引き受ける', 'あとにする']); if (ch !== 0) return;
      c.questStart(Q); await c.msg(['クエスト「失われた地球の記録」を引き受けた。（遠洋航海船で海岸に上陸して、石の柱を調べる）']);
      if (n) await c.msg(['（もう ' + n + ' か所の記録を書き写している）']);
      if (n < N) return;
    }
    if (n < N) { var rest = SITES.filter(function (s) { return !d.flags[s.flag]; }).map(function (s) { return s.area + '「' + s.name + '」'; });
      await c.say('大洋の地図売り', ['いま ' + n + '/' + N + ' か所。', 'まだのところ：' + rest.join('、')]); return; }
    await c.say('大洋の地図売り', ['……全部そろってる。', '天文台の空いた欄、段々畑の決まり、足跡、岬の名前、岩の色、まだ待ってる駅、砂の壁、紙一枚ずつの峡谷。', 'ありがとう。これは、おれが若いころに作ったブローチだ。地球をひとつ、持っていってくれ。']);
    d.flags.erec_done = true; await c.questComplete(Q);
  };
})(typeof window !== 'undefined' ? window : globalThis);
