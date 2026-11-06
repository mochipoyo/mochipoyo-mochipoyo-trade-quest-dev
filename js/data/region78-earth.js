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
    { id: 'amazon', flag: 'erec_amazon', lon: -62.5, lat: -3.5, name: '沈んだ天文台', area: '南メリカ（アマゾナの密林）', item: 'hi_ether',
      text: ['密林に半分のみこまれた、白い丸屋根の天文台。', '壁の記録板：「大雨の百年。川は町をのみ、森は道をのみこんだ。それでも、ここから星の位置を測り続けた」', '……最後の観測日の欄だけが、空いたまま残っている。'] },
    { id: 'andes', flag: 'erec_andes', lon: -71.5, lat: -13.5, name: '空の段々畑', area: '南メリカ（アンデラの山）', item: 'elixir',
      text: ['山の斜面に刻まれた、石の段々畑。今も誰かが手入れをしているように、緑が残っている。', '石碑：「水を分け合う決まりは、どの王よりも長生きした」'] },
    { id: 'rift', flag: 'erec_rift', lon: 36.3, lat: -1.5, name: '大地の裂け目の足跡', area: 'アフリア東部（大裂溝）', item: 'phoenix_feather',
      text: ['大地の裂け目に沿って、化石になった足跡が続いている。', '記録板：「人がはじめて歩いた道。何万年たっても、足跡は同じ向きを向いている」'] },
    { id: 'cape', flag: 'erec_cape', lon: 19.5, lat: -33.8, name: '岬の灯台跡', area: 'アフリア南端', item: 'hi_ether',
      text: ['二つの海がぶつかる岬に、崩れた灯台が立っている。', '灯室の記録：「嵐の岬と呼ばれ、のちに希望の岬と名を変えた。名前を変えたのは、岬ではなく人のほうだった」'] },
    { id: 'uluru', flag: 'erec_uluru', lon: 131.0, lat: -25.3, name: '赤い一枚岩の観測所', area: 'オストラリス（中央の砂漠）', item: 'elixir',
      text: ['砂漠のまんなかに、赤く大きな一枚岩。ふもとに、無人の観測所がある。', '記録板：「夕方、岩の色が変わる時刻を、千年分書きとめた。同じ色の日は、一日もなかった」'] },
    { id: 'siberia', flag: 'erec_siberia', lon: 105.0, lat: 62.0, name: '凍った鉄路の駅', area: 'シビリア（針葉樹の森）', item: 'phoenix_feather',
      text: ['針葉樹の森の中に、雪に埋もれた駅舎。線路は東と西へ、どこまでも続いている。', '時刻表：「次の列車：未定」。……その下に、子どもの字で「でも、まってる」。'] },
    { id: 'gobi', flag: 'erec_gobi', lon: 106.0, lat: 41.0, name: '砂に埋もれた長い城壁', area: 'アジエ内陸（ゴビアの南）', item: 'hi_ether',
      text: ['砂丘から、城壁の上だけが顔を出している。東西に、地平線まで。', '記録板：「外から守るために築いた壁が、今は砂から町を守っている」'] },
    { id: 'canyon', flag: 'erec_canyon', lon: -112.1, lat: 36.1, name: '赤い岩の大峡谷', area: '北メリカ西部', item: 'elixir',
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
  // 次の目的地（v7.9）：まだ調べていない遺跡のうち「いま行ける」もの（その外の地図の条件を満たしている）を、いまいる所から近い順に案内する。
  //   行ける遺跡がないときは、目的地の印を出さずに、条件（遠洋航海船・断裂群島での用事のあと など）を文で出す（前は一覧の順に、まだ行けないアマゾナを指していた）
  var siteG = function (s) { var L = root.EARTH78_LAYOUT; return L && L.tile ? L.tile(s.lon, s.lat) : { x: 0, y: 0 }; };
  var reachable = function (s) { var W = root.World76; return !!(s.map && W && W.unlocked && W.unlocked(s.map)); };
  var playerG = function () { var W = root.World76, Wd = root.World; try { var id = Wd && Wd.map && Wd.map.id; if (!W || !id) return null; if (W.inGrid(id)) return W.toGlobal(id, Wd.player.x, Wd.player.y); var wp = root.Minimap && root.Minimap.worldPosOf ? root.Minimap.worldPosOf(id) : null; if (wp && wp.region && W.inGrid(wp.region)) return W.toGlobal(wp.region, wp.x, wp.y); } catch (e) { /* 位置がわからなければ一覧の順 */ } return null; };
  var distG = function (a, b) { var W = root.World76; var dx = W && W.dxWrap ? W.dxWrap(a.x - b.x) : a.x - b.x; return Math.abs(dx) + Math.abs(a.y - b.y); };
  var rest = function () { var d = D(); return SITES.filter(function (s) { return !d.flags[s.flag]; }); };
  var order = function () { var o = rest().filter(reachable); var pg = playerG(); if (pg) o.sort(function (a, b) { return distG(siteG(a), pg) - distG(siteG(b), pg); }); return o; };
  var condText = function () { var cs = []; rest().forEach(function (s) { var t = s.map && root.World76 && root.World76.gateText ? root.World76.gateText(s.map) : ''; var m = /（([^（）]*)）\s*$/.exec(t || ''); if (m && cs.indexOf(m[1]) < 0) cs.push(m[1]); }); return cs.join('／') || '物語を進めると行ける'; };
  var ref = function (s) { return 'ev:' + s.map + ':' + s.x + ',' + s.y; };
  R.earthRecords.order = order; R.earthRecords.condText = condText;
  var OBJ = { q: Q, side: true };
  var prop = function (k, fn, fb) { Object.defineProperty(OBJ, k, { enumerable: true, configurable: true, get: function () { try { return fn(); } catch (e) { return fb; } }, set: function () { /* 文の置きかえ（js/rpg/earth78.js の applyTexts）は使わない：毎回作る */ } }); };
  prop('done', function () { return found() >= SITES.length ? SITES[0].flag : 'erec_all'; }, 'erec_all');
  prop('any', function () { return order().map(function (s) { return { done: s.flag, t: ref(s) }; }); }, []);
  prop('t', function () { var o = order(); return o.length ? ref(o[0]) : null; }, null);
  prop('text', function () { var o = order(); return o.length ? o[0].area + 'の「' + o[0].name + '」を調べる（いま行ける遺跡 ' + o.length + ' か所）' : 'いまはまだ、行ける遺跡がない（' + condText() + '）'; }, '町のない大陸の遺跡を調べる');
  prop('h', function () { var o = order(); if (!o.length) return ['町のない大陸。', 'まだ近づけない遺跡。', 'いまはまだ、どの遺跡にも行けない。（' + condText() + '）']; var s = o[0]; return [s.area + '。', '「' + s.name + '」の石の柱。', s.area + 'の「' + s.name + '」へ行き、石の柱を調べよう。（船で海岸に上陸して歩く）']; }, ['町のない大陸。', '石の柱。', '町のない大陸の遺跡を調べよう。']);
  if (root.OBJECTIVES) { root.OBJECTIVES.push(OBJ); R.objs.push(OBJ); }
  R.obj(Q, 'erec_done', 'npc:world:w_mapseller78', ['アルカディア相場大陸。', '港町マリナのそばの「大洋の地図売り」。', '大洋の地図売りに、8 つの記録を見せよう。']);
  // 大洋の地図売り（js/rpg/earth78.js が地球の世界のアルカディアに置く）の会話から呼ぶ
  R.earthRecords.talk = async function (c) {
    var d = D(); var n = found(), N = SITES.length;
    if (c.questDone(Q)) { await c.say('大洋の地図売り', ['あの記録の写し、毎晩読み返してるよ。', '……地図には、町の名前しか書けない。でも、あそこに人がいたことは、書いておきたいんだ。']); return; }
    if (!c.questActive(Q)) {
      await c.say('大洋の地図売り', ['海の向こうには、町のない大陸がいくつもある。', 'でも、人がいなかったわけじゃない。石の柱に、古い記録が残ってるって話だ。', 'アマゾナの密林、アンデラの山、アフリアの東と南の端、オストラリスのまんなか、シビリアの森、ゴビアの砂、北メリカの西の大峡谷。全部で ' + N + ' か所。']);
      var ch = await c.choice('記録を書き写して、見せてくれないか？', ['引き受ける', 'あとにする']); if (ch !== 0) return;
      c.questStart(Q); await c.msg(['クエスト「失われた地球の記録」を引き受けた。（遠洋航海船で海岸に上陸して、石の柱を調べる）']);
      if (n < N && !order().length) await c.say('大洋の地図売り', ['……といっても、いまの船じゃ、どの大陸にも近づけないだろう。', '（' + condText() + '）', '行けるようになったら、近いところから回ってくれ。']);
      if (n) await c.msg(['（もう ' + n + ' か所の記録を書き写している）']);
      if (n < N) return;
    }
    if (n < N) { var rest = SITES.filter(function (s) { return !d.flags[s.flag]; }).map(function (s) { return s.area + '「' + s.name + '」'; });
      var op = order(); await c.say('大洋の地図売り', ['いま ' + n + '/' + N + ' か所。', 'まだのところ：' + rest.join('、')].concat(op.length ? ['いま行けそうなのは：' + op.map(function (s) { return s.area + '「' + s.name + '」'; }).join('、')] : ['いまはまだ、どこにも近づけないだろう。（' + condText() + '）'])); return; }
    await c.say('大洋の地図売り', ['……全部そろってる。', '天文台の空いた欄、段々畑の決まり、足跡、岬の名前、岩の色、まだ待ってる駅、砂の壁、紙一枚ずつの峡谷。', 'ありがとう。これは、おれが若いころに作ったブローチだ。地球をひとつ、持っていってくれ。']);
    d.flags.erec_done = true; await c.questComplete(Q);
  };
})(typeof window !== 'undefined' ? window : globalThis);
