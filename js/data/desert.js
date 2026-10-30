/* =========================================================
   Data / Desert (v5.5 Phase 7-1) : リシア砂漠——砂都サハル、鏡の市場、砂嵐の回廊、蜃気楼神殿、水の権利
   ・到達：断裂群島の南端から「南の遠洋航路」（遠洋航海船／飛空艇。main_8 達成後）
   ・mirror_market「鏡の市場」：3日間、噂に乗る／実需を確かめる／見送る を選んで売買（ゲーム内G・学習用の架空市場）
       報酬を受け取ったあとは「練習」として何度でも遊べる（Gは動かない）
   ・sahar_caravan「隊商護衛」：砂嵐の回廊（視界制限。上位足の眼鏡で広がる）を2階層、襲撃2回＋頭目
   ・sahar_mirage「蜃気楼神殿」：各階の石板で上位足（日足）の向きを読み、正しい扉を選ぶ（誤ると入口へ戻される）
   ・sahar_water「水の権利」：四十年分の水位の記録（長期は下降、今月だけ上昇）をもとに水の配分を調停する
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function D() { return root.State.data; }
  function esc(s) { return root.Win ? root.Win.esc(s) : String(s); }

  /* ---------- 学習用の模式図（SVG。実在の相場ではない） ---------- */
  var SHAPES = {
    up: [[0, 82], [16, 62], [26, 70], [44, 46], [54, 55], [72, 30], [82, 38], [100, 14]],
    range: [[0, 30], [16, 70], [32, 32], [50, 72], [68, 30], [84, 70], [100, 34]],
    pull_down: [[0, 18], [18, 40], [30, 32], [50, 58], [62, 50], [84, 76], [100, 70]],
    spike: [[0, 62], [20, 66], [40, 60], [60, 64], [74, 48], [88, 24], [100, 8]],
    water: [[0, 10], [12, 18], [20, 15], [34, 30], [44, 26], [58, 44], [68, 40], [80, 62], [88, 58], [94, 76], [100, 64]]
  };
  SHAPES.down = SHAPES.up.map(function (p) { return [p[0], 96 - p[1]]; });
  SHAPES.pull_up = SHAPES.pull_down.map(function (p) { return [p[0], 96 - p[1]]; });
  function svgChart(kind, cap) {
    var pts = SHAPES[kind].map(function (p) { return Math.round(10 + p[0] * 1.6) + ',' + Math.round(8 + p[1] * 0.9); }).join(' ');
    return '<div style="display:inline-block;margin:4px;text-align:center"><div style="color:#ffd24a;font-size:12px;margin-bottom:2px">' + esc(cap) + '</div><svg viewBox="0 0 180 104" width="180" height="104" style="background:#0b1226;border:1px solid #c9a24a;border-radius:4px"><line x1="10" y1="52" x2="170" y2="52" stroke="#2a3a5a" stroke-dasharray="3 3"/><polyline points="' + pts + '" fill="none" stroke="#ffd24a" stroke-width="2.5" stroke-linejoin="round"/></svg></div>';
  }
  function tablet(title, charts, lines) {
    var html = '<div class="rw-title">' + esc(title) + '</div><div style="display:flex;flex-wrap:wrap;justify-content:center">' + charts.map(function (c) { return svgChart(c[0], c[1]); }).join('') + '</div>' + lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '<p class="muted small">学習用の模式図です（実在の相場・価格ではありません）。</p>';
    return root.Win.panel(html);
  }

  /* =========================================================
     砂都サハル
     ========================================================= */
  add({ id: 'sahar_city', name: '砂都サハル', kind: 'town', bgm: 'town', fallback: 'sand', style: 'adobe', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CssssssssssssssBBBBBBBBBBssssssssssssssC',
    'CssssssssssssssBBBBBBBBBBssssssssssssssC',
    'CssBBBBBBBBssssBBBBBBBBBBssssBBBBBBBBssC',
    'CssBBBBBBBBssssBBBBBBBBBBssssBBBBBBBBssC',
    'CssBBBBBBBBssssBBBBBBBBBBssssBBBBBBBBssC',
    'CssBBBBBBBBssssBBBBBBBBBBssssBBBBBBBBssC',
    'CssBBBBBBBBssssssssrrssssssssBBBBBBBBssC',
    'CsssssssssssssyssssrrssssysssssssssssssC',
    'CsrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrsC',
    'CsrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrsC',
    'CssssssssssssssssssrrssssssssssssssssssC',
    'CssssssssssssssssAsrrsAssssssssssssssssC',
    'CssBBBBBBBBssssssssrrssssssssBBBBBBBBssC',
    'CssBBBBBBBBssssssAsrrsAssssssBBBBBBBBssC',
    'CssBBBBBBBBssssssssrrssssssssBBBBBBBBssC',
    'CssBBBBBBBBssssssAsrrsAssssssBBBBBBBBssC',
    'CssBBBBBBBBssssssssrrssssssssBBBBBBBBssC',
    'CsrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrsC',
    'CsrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrsC',
    'CssssssssssssssssssrrssssssssssssssssssC',
    'CssBBBBBBBBssssssssrrssssssssBBBBBBBBssC',
    'CssBBBBBBBBss6~~~~srrs~~~~6ssBBBBBBBBssC',
    'CssBBBBBBBBsss~~~~wrrw~~~~sssBBBBBBBBssC',
    'CssBBBBBBBBs6s~~~~wrrw~~~~s6sBBBBBBBBssC',
    'CssBBBBBBBBsss~~~~wrrw~~~~sssBBBBBBBBssC',
    'Cssssssssssss6~~~~srrs~~~~6ssssssssssssC',
    'CsssssssssssssssqssrrsszsssssssssssssssC',
    'CssssssssssssssssssrrssssssssssssssssssC',
    'CCCCCCCCCCCCCCCCCCCrrCCCCCCCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'guild', type: 'guild', name: '隊商ギルド', x: 15, y: 1, w: 10, h: 6, doorX: 4, interior: 'sahar_guild', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '砂の宿', x: 3, y: 3, w: 8, h: 5, doorX: 3, interior: 'sahar_inn', entry: { x: 5, y: 7 } },
    { id: 'weapon', type: 'weapon', name: '曲刀の店', x: 29, y: 3, w: 8, h: 5, doorX: 3, interior: 'sahar_weapon', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '水と道具の店', x: 3, y: 13, w: 8, h: 5, doorX: 3, interior: 'sahar_item', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: '布と鎧の店', x: 29, y: 13, w: 8, h: 5, doorX: 3, interior: 'sahar_armor', entry: { x: 5, y: 7 } },
    { id: 'water', type: 'elder', name: '水番所', x: 3, y: 21, w: 8, h: 5, doorX: 3, interior: 'sahar_water_office', entry: { x: 5, y: 7 } },
    { id: 'church', type: 'church', name: 'オアシスの祠', x: 29, y: 21, w: 8, h: 5, doorX: 3, interior: 'sahar_church', entry: { x: 5, y: 7 } }
  ],
  warps: [19, 20].map(function (x) { return { x: x, y: 29, to: 'world_desert', tx: 50, ty: 35, name: '砂漠へ' }; }),
  chests: [{ id: 'sh1', x: 37, y: 1, item: 'hi_ether', qty: 1 }],
  events: [{ x: 18, y: 24, type: 'inspect', solid: false, text: ['オアシスの水。岸の石に、年ごとの水位の線が刻まれている。', 'いちばん上の線は、いまの水面よりずっと高い。'] }],
  npcs: [
    { id: 'sh_gate', x: 21, y: 27, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) {
      if (!c.flag('desert_arrived')) c.setFlag('desert_arrived', true);
      await c.say('サハルの門番', ['砂都サハルへようこそ。日干し煉瓦と布の町だ。', '東の「鏡の市場」では、品の値段が噂で毎日変わる。……噂を売る者もいるから、気をつけな。', '南へ行きたいなら隊商ギルドへ。中央の断崖は、砂嵐の回廊でしか越えられない。']);
      await c.remark('nagi', ['砂の海、か。波はないのに、風で模様が変わっていく。', '……海と同じ。目の前の模様より、風の向きを見るんだ。'], 'nagi_remark_desert');
    } },
    { id: 'sh_child', x: 12, y: 20, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('サハルの子ども', ['きのう、香辛料が倍になるって聞いたんだ！ お父さんが買いに走ってった。', '……でも、帰ってきたら怒ってた。なんでだろう。']); } },
    { id: 'sh_weaver', x: 26, y: 11, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('布織りの女', ['布の値段は、隊商が来る季節に上がって、出ていくと下がる。毎年同じ。', 'それを知っていれば、噂に振り回されずにすむのよ。']); } },
    { id: 'sh_old', x: 8, y: 11, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (d.flags.sahar_water_choice !== undefined) { await c.say('サハルの古老', [['今月は隊商に水が多く回っておる。……来年の水位が、どうなるか。', '畑には水が戻った。隊商は減ったが、子らの顔色はいい。', '貯水池の工事が始まった。皆、少しずつ我慢しておる。四十年ぶりに、水の線が下げ止まるかもしれん。'][d.flags.sahar_water_choice]]); return; }
      await c.say('サハルの古老', ['オアシスの水は、四十年かけて少しずつ減ってきた。', '水番所で隊商ギルドと畑の民が揉めておる。今月は雨で水位が上がったから、隊商が「もっと寄こせ」と言い出してな。']); } }
  ] });
  K.innInterior('sahar_inn', '砂の宿', 'sahar_city', 6, 8, 60);
  K.shopInterior('sahar_weapon', '曲刀の店', 'sahar_city', 32, 8, 'merchant', 'weapon', ['scimitar', 'sun_spear', 'caravan_bow', 'halberd', 'tiger_claw', 'chrono_staff', 'holy_mace'], ['砂漠の鍛冶が打った曲刀だ。軽くて、よく切れる。']);
  K.shopInterior('sahar_armor', '布と鎧の店', 'sahar_city', 32, 18, 'villager_f', 'armor', ['dune_cloak', 'sand_turban', 'knight_armor', 'temporal_robe', 'knight_shield', 'knight_helm', 'ring_speed'], ['砂避けのマントは、砂嵐の回廊を抜けるなら必需品よ。']);
  K.shopInterior('sahar_item', '水と道具の店', 'sahar_city', 6, 18, 'merchant', 'item', ['potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'wake_bell', 'phoenix_feather', 'tent', 'escape_wing'], ['水は売り物じゃない。……と言いたいが、この町じゃ水がいちばんの売り物だ。']);
  K.churchInterior('sahar_church', 'オアシスの祠', 'sahar_city', 32, 26);

  /* ---------- 隊商ギルド（隊商長ハミド：隊商護衛 → 蜃気楼神殿） ---------- */
  add({ id: 'sahar_guild', name: '隊商ギルド', kind: 'interior', bgm: 'town', rows: [
    '############',
    '#KK_qqzz_KK#',
    '#__________#',
    '#_tt____tt_#',
    '#__________#',
    '#_z______q_#',
    '#__________#',
    '#__________#',
    '#####D######'
  ],
  warps: [{ x: 5, y: 8, to: 'sahar_city', tx: 19, ty: 7 }],
  npcs: [
    { id: 'sg_hamid', x: 5, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (c.questDone('sahar_caravan')) {
        await c.say('隊商長ハミド', ['あんたたちのおかげで、隊商は無事に南のオアシスへ着いた。', '南の砂漠の奥に「蜃気楼神殿」がある。古い祭司たちは、遠くの星を見て砂漠を渡ったそうだ。', '神殿の扉は、目の前の轍（わだち）だけを見る者を迷わせる。……行くなら、石板をよく読め。']);
        if (!c.questActive('sahar_mirage') && !c.questDone('sahar_mirage')) c.questStart('sahar_mirage');
        return;
      }
      if (c.questActive('sahar_caravan')) { await c.say('隊商長ハミド', ['隊商は砂嵐の回廊の北口で待っている。市場の東、断崖の手前だ。', '嵐の中では数歩先しか見えない。遠くを見る道具があれば、ずいぶん楽になるんだが。']); return; }
      await c.say('隊商長ハミド', ['隊商ギルドの隊商長、ハミドだ。', '南のオアシスへ荷を運びたい。だが砂嵐の回廊には盗賊が出る。嵐に紛れて荷を狙うんだ。', '護衛を頼めるか？ 報酬は弾む。']);
      var ch = await c.choice('隊商を護衛しますか？', ['引き受ける', 'あとにする']);
      if (ch !== 0) { await c.say('隊商長ハミド', ['気が変わったら来てくれ。']); return; }
      c.questStart('sahar_caravan'); c.setFlag('caravan_escort', true);
      await c.say('隊商長ハミド', ['ありがたい。隊商は回廊の北口で待たせておく。', '回廊では、わしが先頭に立って嵐の壁を開ける。……轍は風で消える。星を見て進むんだ。']);
      await c.remark('mina', ['盗賊から荷を守る側、か。……宝箱を開ける側じゃないのは、ちょっと新鮮。'], 'mina_remark_caravan');
    } },
    { id: 'sg_clerk', x: 9, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('ギルドの帳簿係', ['隊商の荷は、出発の三日前に注文帳へ書く決まりだ。', 'だから注文帳を見れば、何がこれから売れるか、だいたいわかる。噂より、ずっと確かにね。']); } }
  ] });

  /* ---------- 水番所（水の権利） ---------- */
  add({ id: 'sahar_water_office', name: '水番所', kind: 'interior', bgm: 'town', rows: [
    '############',
    '#KKK_qq_KKK#',
    '#__________#',
    '#_TTTTTTTT_#',
    '#__________#',
    '#__zz______#',
    '#__________#',
    '#__________#',
    '#####D######'
  ],
  warps: [{ x: 5, y: 8, to: 'sahar_city', tx: 6, ty: 26 }],
  events: [{ x: 9, y: 1, type: 'script', solid: true, run: async function (c) { var d = D();
    if (!c.questActive('sahar_water')) { await c.msg(['棚に、分厚い帳面が並んでいる。表紙に「水位」とある。']); return; }
    if (c.has('water_record') || d.flags.water_record_got) { await c.msg(['水位の記録の棚。いちばん古い帳面は、四十年前のものだ。']); return; }
    await c.msg(['棚から、四十年分の水位の記録を取り出した。', '……毎年の線を並べると、ゆっくりと、だが確かに下がっている。今月の線だけが、少し上にある。']);
    c.give('water_record', 1); d.flags.water_record_got = true; await c.msg(['水位の記録を手に入れた。水番ナジャに見せよう。']);
  } }],
  npcs: [
    { id: 'sw_naja', x: 5, y: 2, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (c.questDone('sahar_water')) { await c.say('水番ナジャ', ['決めたことは、帳面に書いておいた。次の水番が、同じ争いを一からやり直さなくてすむように。']); return; }
      if (!c.questActive('sahar_water')) {
        await c.say('水番ナジャ', ['水番のナジャだよ。オアシスの水を、隊商と畑に分けるのがあたしの仕事さ。', '今月は雨で水位が上がった。隊商ギルドは「水が戻った、隊商の分を増やせ」。畑の民は「次の日照りに備えろ」。', '……よそ者のあんたたちなら、どちらの肩も持たずに聞ける。調停を手伝ってくれないかい。', '奥の棚に、四十年分の水位の記録がある。まずは、それを見ておくれ。']);
        c.questStart('sahar_water'); return;
      }
      if (!c.has('water_record')) { await c.say('水番ナジャ', ['奥の棚の、水位の記録を見ておくれ。いちばん右の棚だよ。']); return; }
      await c.say('水番ナジャ', ['記録を持ってきたね。……並べて見てごらん。']);
      await tablet('四十年分の水位の記録', [['water', '年ごとの水位（左が四十年前、右が今月）']], ['山と谷をつなぐと、高値も安値も、少しずつ切り下がっている。', '右端——今月だけ、雨で水位が跳ね上がった。']);
      await c.say('隊商ギルドの代表', ['見ろ、今月は上がった！ 水は戻ったんだ。隊商の分を増やしてくれ。隊商が来なけりゃ、町の稼ぎもない。']);
      await c.say('畑の民の代表', ['一か月上がっただけだ。来年も上がる保証がどこにある。畑が枯れたら、子どもが飢える。']);
      var ch = await c.choice('どう調停する？', ['今月は水位が上がった。隊商の分を増やす', '畑を優先する。隊商は他の水場を探してもらう', '長い流れは下向き。今月の上昇に乗らず、両方を少しずつ減らし、隊商の稼ぎで貯水池を作る']);
      if (ch < 0) { await c.say('水番ナジャ', ['すぐには決められないか。……決まったら、また来ておくれ。']); return; }
      d.flags.sahar_water_choice = ch;
      if (ch === 0) {
        await c.say('隊商ギルドの代表', ['話がわかる！ これで隊商が増える。']);
        await c.say('畑の民の代表', ['……来年、また水位が下がったら、そのとき減らされるのは畑の分だ。覚えておいてくれ。']);
        await c.say('水番ナジャ', ['今月の線だけ見て決めた、ということになるね。……それも一つの決め方さ。来年の線を、あたしが記録しておくよ。']);
      } else if (ch === 1) {
        await c.say('畑の民の代表', ['ありがたい……！']);
        await c.say('隊商ギルドの代表', ['隊商は西の水場へ移る。サハルの市場は寂しくなるぞ。']);
        await c.say('水番ナジャ', ['畑は守れた。そのかわり、町の稼ぎが細る。……どちらも、町の暮らしなんだけどね。']);
      } else {
        await c.say('隊商ギルドの代表', ['……四十年、下がり続けている、か。今月の線だけ見て騒いでいたのは、うちのほうだな。']);
        await c.say('畑の民の代表', ['畑の分も減るのは辛い。だが、貯水池ができれば、日照りの年をしのげる。']);
        await c.say('水番ナジャ', ['一か月の跳ね上がりに飛びつかず、長い流れを見て決める。……いい調停だよ。', '貯水池の工事は、隊商ギルドが費用を出す。完成したら、記録の線がどう動くか見ものだね。']);
        await c.remark('elna', ['四十年分の記録から決める。帳簿と同じね。', '一行だけ見て決めると、たいてい間違える。'], 'elna_remark_water');
      }
      c.take('water_record', 1); await c.questComplete('sahar_water');
      await c.remark('sophia', ['未来がどう転ぶかは、まだ見えない。……でも、見えないなりに備えるのは、できる。'], 'sophia_remark_water');
    } }
  ] });

  /* =========================================================
     鏡の市場（3日間の売買）
     ========================================================= */
  var GOODS = { spice: '香辛料', salt: '塩', silk: '絹' };
  var LOT = 500;   // 1ロット＝500G分
  var PRICES = [{ spice: 120, salt: 40, silk: 300 }, { spice: 84, salt: 44, silk: 300 }, { spice: 84, salt: 49, silk: 225 }];
  var DAYS = [
    { rumor: ['聞いたか！ 香辛料が品薄だ。今日のうちに倍になるぞ！', '早い者勝ちだ。考えてる暇はない！'], rumorGood: 'spice', rumorMove: -0.30,
      real: ['倉庫番に頼んで倉庫を見せてもらった。香辛料の倉庫は天井まで満杯だ。昨夜、大きな隊商が香辛料を運び込んだらしい。', '隊商ギルドの注文帳：三日後に出発する隊商三組が、塩を多めに注文している。'], realGood: 'salt', realMove: 0.10,
      result: { spice: '香辛料は売り手が殺到して、3割下げた。噂を流したのは、在庫を抱えた商人だったらしい。', salt: '塩は隊商の買い付けで、1割上げた。' }, close: ['夕方。香辛料は3割安、塩は1割高、絹は変わらず。'] },
    { rumor: ['絹だ！ 王都で絹の服が大流行してる。買えるだけ買え、明日には手に入らないぞ！'], rumorGood: 'silk', rumorMove: -0.25,
      real: ['注文帳には、絹の注文が一件もない。王都からの便りも届いていない。', '塩：出発前の隊商が、まだ買い足している。きのうより注文が増えた。'], realGood: 'salt', realMove: 0.12,
      result: { silk: '朝のうちは絹に人が群がった。昼には噂が嘘だとわかり、2割5分下げた。', salt: '塩は出発前の買い足しで、さらに1割2分上げた。' }, close: ['夕方。絹は2割5分安、塩は1割2分高、香辛料は変わらず。'] },
    { rumor: ['塩だよ塩！ 二日で2割も上がった。今日も上がる、昨日の倍だ！', '乗り遅れるな！'], rumorGood: 'salt', rumorMove: -0.15,
      real: ['隊商は今朝、三組とも出発した。注文帳の塩の欄は、今日から空白だ。', '香辛料と絹にも、目立った注文はない。'], realGood: null, realMove: 0,
      result: { salt: '買い手の隊商がいなくなり、塩は1割5分下げた。上がり続けたものに最後に飛び乗った者が、損をかぶった。' }, close: ['夕方。塩は1割5分安、香辛料と絹は変わらず。'] }
  ];
  function boardHtml(i, total, practice) {
    var p = PRICES[i], q = i > 0 ? PRICES[i - 1] : null;
    var rows = Object.keys(GOODS).map(function (g) { var ch = q ? Math.round((p[g] / q[g] - 1) * 100) : 0; return '<tr><td style="padding:2px 10px">' + GOODS[g] + '</td><td style="padding:2px 10px;text-align:right">' + p[g] + 'G</td><td style="padding:2px 10px;text-align:right;color:' + (ch > 0 ? '#5fd07a' : ch < 0 ? '#ff7a6a' : '#ccc') + '">' + (q ? (ch > 0 ? '+' : '') + ch + '%' : '―') + '</td></tr>'; }).join('');
    return '<div class="rw-title">鏡の市場　' + (i + 1) + '日目の朝' + (practice ? '（練習：Gは動きません）' : '') + '</div><table style="margin:0 auto;border-collapse:collapse"><tr style="color:#ffd24a"><td style="padding:2px 10px">品</td><td style="padding:2px 10px">1単位の値</td><td style="padding:2px 10px">前日比</td></tr>' + rows + '</table>' +
      '<p>売買は1日で手じまい（朝に買って夕方に売る）。1ロット＝' + LOT + 'G分。ここまでの損益：<b>' + (total >= 0 ? '+' : '') + total + 'G</b></p><p class="muted small">ゲーム内の架空の市場です。実在の商品・価格・相場とは関係ありません。</p>';
  }
  async function chooseLots(c, practice) {
    var d = D(); var opts = [], vals = [];
    if (practice || d.gold >= LOT) { opts.push('1ロット（' + LOT + 'G分）'); vals.push(1); }
    if (practice || d.gold >= LOT * 3) { opts.push('3ロット（' + (LOT * 3) + 'G分）'); vals.push(3); }
    if (!opts.length) { await c.msg(['所持金が足りず、買えなかった。（1ロット＝' + LOT + 'G分）']); return 0; }
    opts.push('やっぱりやめる'); vals.push(0);
    var i = await c.choice('どれだけ買う？', opts); return i < 0 ? 0 : vals[i];
  }
  async function runMarket(c) {
    var d = D(); var practice = !!d.flags.mirror_rewarded;
    var total = 0, rode = false, bigLots = 0, traded = 0;
    for (var i = 0; i < 3; i++) {
      var day = DAYS[i];
      await root.Win.panel(boardHtml(i, total, practice));
      await c.say('噂屋', day.rumor);
      var ch = await c.choice((i + 1) + '日目：どうする？', ['噂に乗る（' + GOODS[day.rumorGood] + 'を買う）', '実需を確かめる（倉庫と注文帳を見る）', '今日は見送る']);
      var good = null;
      if (ch === 0) { good = day.rumorGood; }
      else if (ch === 1) {
        await c.msg(day.real);
        var opts = day.realGood ? [GOODS[day.realGood] + 'を買う（注文がある）', '見送る'] : [GOODS[day.rumorGood] + 'を買う（噂どおり）', '見送る'];
        var c2 = await c.choice('確かめた結果、どうする？', opts);
        if (c2 === 0) good = day.realGood || day.rumorGood;
      }
      var lots = good ? await chooseLots(c, practice) : 0;
      if (!lots) good = null;
      if (good === day.rumorGood && day.rumorGood !== day.realGood) rode = true;
      var move = good ? (good === day.rumorGood ? day.rumorMove : day.realMove) : 0;
      var pl = Math.round(LOT * lots * move);
      if (lots && !practice) d.gold = Math.max(0, d.gold + pl);
      total += pl; if (lots >= 3) bigLots++; if (lots) traded++;
      await c.msg(day.close.concat(good ? [day.result[good], GOODS[good] + 'を' + lots + 'ロット：' + (pl >= 0 ? '+' : '') + pl + 'G' + (practice ? '（練習）' : '')] : ['今日は見送った。損益 0G']));
      if (c.questActive('mirror_market')) d.flags['market_day_' + (i + 1)] = true;
    }
    return { total: total, rode: rode, bigLots: bigLots, traded: traded, practice: practice };
  }
  add({ id: 'mirror_market', name: '鏡の市場', kind: 'town', bgm: 'town', fallback: 'sand', style: 'adobe', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CssssssssssssssssssssssssssssssC',
    'CsqqssssssssssssssssssssssszzssC',
    'CsssssssssssTTTsTTTssssssssszssC',
    'CssssssssssssssrrssssssssssssssC',
    'CssssssssssssssrrssssssssssssssC',
    'CsssAAAsssAAsssrrsssAAsssAAAsssC',
    'CssssssssssssssrrssssssssssssssC',
    'CssssssssssssssrrssssssssssssssC',
    'CssssssssssssssrrssssssssssssssC',
    'CssssssssssssssQrssssssssssssssC',
    'CsrrrrrrrrrrrrrrrrrrrrrrrrrrrrsC',
    'CsrrrrrrrrrrrrrrrrrrrrrrrrrrrrsC',
    'CssssssssssssssrrssssssssssssssC',
    'CssssssssssssssrrssssssssssssssC',
    'CssssssssssssssrrssssssssssssssC',
    'CsssAAssssssssArAAssssssAAsAsssC',
    'CssssssssssssssrrssssssssssssssC',
    'CszssssssssssssrrssssssssssssqsC',
    'CssssssssssssssrrssssssssssssssC',
    'CssssssssssssssrrssssssssssssssC',
    'CCCCCCCCCCCCCCCrrCCCCCCCCCCCCCCC'
  ],
  warps: [15, 16].map(function (x) { return { x: x, y: 21, to: 'world_desert', tx: 86, ty: 35, name: '砂漠へ' }; }),
  chests: [{ id: 'mm1', x: 2, y: 1, item: 'calm_water', qty: 2 }],
  events: [{ x: 15, y: 10, type: 'inspect', solid: true, text: ['市場の真ん中の泉。水面に、市場の屋台が逆さに映っている。', '台座の文字：「鏡に映るのは噂。鏡の外にあるのが、品物」'] }],
  npcs: [
    { id: 'mm_clerk', x: 13, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (!c.questActive('mirror_market') && !c.questDone('mirror_market')) {
        await c.say('市場の帳場係', ['鏡の市場へようこそ。ここでは、品の値段が噂で毎日変わる。', '旅の方も、三日間だけ商いができる。香辛料・塩・絹。朝に買って、夕方に売る。1ロットは500G分だ。', '噂屋の話に乗るもよし、倉庫と注文帳を確かめるもよし、見送るもよし。', '……ただし、儲かっても損しても、本物のお金だよ。（ゲーム内のG）']);
        c.questStart('mirror_market');
      }
      var practice = !!d.flags.mirror_rewarded;
      var go = await c.choice(practice ? '三日間の商いをもう一度（練習：Gは動きません）' : '三日間の商いを始めますか？', ['始める', 'やめておく']);
      if (go !== 0) return;
      var r = await runMarket(c);
      await c.msg(['三日間の商いが終わった。合計の損益：' + (r.total >= 0 ? '+' : '') + r.total + 'G' + (r.practice ? '（練習）' : '')]);
      var lines = [];
      if (r.rode) lines.push('噂に乗った日があったね。噂が当たる日もある。だが、確かめずに乗った時点で、それは商いじゃなく賭けだ。');
      if (!r.traded) lines.push('三日とも見送り、か。見送りは立派な判断だ。だが、確かめれば根拠のある日もあった。');
      if (r.bigLots) lines.push('3ロットで張った日があったね。当たれば3倍、外れても3倍。外れたときに続けられる量かどうか、先に決めておくんだ。');
      if (!r.rode && r.total > 0) lines.push('噂に乗らず、確かめてから動いた。最後の日、上がり続けた塩に飛び乗らなかったのも見事だ。');
      await c.say('老商人オマル', lines.length ? lines : ['……ふむ。']);
      if (!r.rode && r.total > 0 && !d.flags.mirror_rewarded) {
        d.flags.mirror_rewarded = true; c.give('cloak_volatility', 1);
        await c.say('老商人オマル', ['これを持っていきなさい。「変動相場のマント」。値動きの荒い日ほど、身をかわせる。', 'それと、この天秤も。勝ったときに少し多く、負けたときに少し少なく受け取る。……傷を負わずに勝てたら、の話だがね。']);
        await c.msg(['変動相場のマントを手に入れた！']);
        await c.questComplete('mirror_market');
        await c.remark('lucia', ['噂は波じゃない。波に映った影。……師匠なら、そう言うと思う。'], 'lucia_remark_market');
      } else if (!d.flags.mirror_rewarded) { await c.say('市場の帳場係', ['また商いをしたくなったら声をかけて。何度でも、三日間をやり直せるよ。']); }
    } },
    { id: 'mm_rumor', x: 8, y: 9, sprite: 'bartender', dir: 'down', wander: 1, talk: async function (c) { await c.say('噂屋', ['噂ってのは、早く聞いた者が得をする。……ってことにしておけば、噂がよく売れるのさ。', 'おっと、今のは聞かなかったことに。']); } },
    { id: 'mm_omar', x: 23, y: 9, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('老商人オマル', ['わしは五十年、この市場で商いをしてきた。', '噂で値が動くのは本当だ。だが、噂で動いた値は、品物の量と注文の量に、いずれ引き戻される。', '倉庫と注文帳。それが、鏡の外にある本物だよ。']); } },
    { id: 'mm_keeper', x: 26, y: 4, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { await c.say('倉庫番', ['倉庫を見たい？ 商いの最中に声をかけてくれれば、見せてやるよ。', '噂屋は一度も倉庫を見に来たことがない。不思議だろ？']); } },
    { id: 'mm_spice', x: 5, y: 15, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('香辛料商', ['香辛料は隊商が来るたびにどっと入る。品薄なんて、めったにないさ。']); } },
    { id: 'mm_salt', x: 15, y: 17, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { await c.say('塩商', ['塩は、隊商が砂漠を渡る前に買い込む。出発の日が過ぎれば、ぱったり売れなくなる。']); } },
    { id: 'mm_silk', x: 25, y: 15, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('絹商', ['王都で流行り？ 聞いたことないねえ。うちに注文は来てないよ。']); } }
  ] });

  /* =========================================================
     砂嵐の回廊（2階層・視界制限：上位足の眼鏡で広がる）
     ========================================================= */
  var CORRIDOR_ENC = { rate: 0.045, zones: [{ name: '砂嵐の回廊', test: function () { return true; }, groups: [['dust_djinn'], ['caravan_raider', 'caravan_raider'], ['sand_worm'], ['dust_djinn', 'mirage_fox'], ['caravan_raider', 'dune_scorpion']], level: 23 }] };
  function ambush(id, x, y, flag, enemies, lines) {
    return { id: id, x: x, y: y, sprite: 'desert_raider', dir: 'left', wander: 0, showIf: 'storm_gate_open', hideIf: flag, talk: async function (c) {
      await c.say('隊商荒らし', lines);
      var r = await c.battle(enemies, {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
      c.setFlag(flag, true); root.World.applyState(root.World.map);
      await c.say('隊商長ハミド', [flag === 'caravan_ambush_1' ? '荷は無事だ！ ……嵐が濃くなる。2階は、もっと見えないぞ。' : '助かった。出口は近い。……だが、この先に頭目がいる。嵐の中で、ずっと待ち伏せしていた奴だ。']);
    } };
  }
  add({ id: 'sandstorm_corridor_1', name: '砂嵐の回廊', kind: 'dungeon', bgm: 'dungeon', fallback: 'sand', vision: 3.5, rows: [
    'cccccccccccccccccccccccccccccc',
    'ccccccccccsccccccccccccccccccc',
    'ccccccccccsccccccccccccccccccc',
    'ccccccccccsccccccccccccccccccc',
    'ccccccsssssssssccccccccccccccc',
    'ccccccscccccccsccccccccccccccc',
    'ccccccscccccccscccccccsssssscc',
    'ccccccsccccccsssccccccsccccscc',
    'ccssccscccccccscccccccsccccscc',
    'csssssscccccccsccccccssscccs>c',
    'ccccccccccccccscccccccsccccccc',
    'ccccccccccccccscccccccsccccccc',
    'ccccccccccccccsssssssssccccccc',
    'ccccccccccccccccccsccccccccccc',
    'ccccccccccccccccccsccccccccccc',
    'ccccccccccccccccccsccccccccccc',
    'cccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccc'
  ],
  warps: [{ x: 1, y: 9, to: 'world_desert', tx: 98, ty: 50, name: '砂漠へ（北口）' }, { x: 28, y: 9, to: 'sandstorm_corridor_2', tx: 2, ty: 9 }],
  chests: [{ id: 'sc1', x: 10, y: 1, item: 'hi_potion', qty: 2 }, { id: 'sc2', x: 18, y: 15, item: 'dune_cloak', qty: 1 }],
  events: [{ x: 4, y: 9, type: 'gate', solid: true, needFlag: 'caravan_escort', doneFlag: 'storm_gate_open', text: ['砂嵐が壁のように立ちはだかっている。数歩先も見えない。', '案内人なしで進めば、方向を失う。……サハルの隊商ギルドで、回廊を知る者を探そう。'], openText: ['隊商長ハミドが先頭に立ち、砂嵐の壁に布を掲げた。', 'ハミド「轍は風で消える。星を見て進め。……嵐の中では、遠くを見る者が生き残る」'] }],
  npcs: [
    { id: 'sc_hamid', x: 3, y: 8, sprite: 'merchant', dir: 'down', wander: 0, showIf: 'caravan_escort', hideIf: 'caravan_done', talk: async function (c) { await c.say('隊商長ハミド', ['隊商は後ろからついてくる。盗賊は荷車を狙う。前に出て、追い払ってくれ。', '嵐の中では、足元しか見えない。……遠くまで見える道具があれば、少しは違うんだがな。']); await c.remark('iris', ['見えない場所は、地図に描けない。……一歩ずつ、描いていく。'], 'iris_remark_storm'); } },
    ambush('sc_raider1', 14, 8, 'caravan_ambush_1', ['caravan_raider', 'caravan_raider', 'dust_djinn'], ['へへ、嵐の中なら誰にも見えねえ。荷はいただくぜ！'])
  ],
  encounters: CORRIDOR_ENC });
  add({ id: 'sandstorm_corridor_2', name: '砂嵐の回廊 2階', kind: 'dungeon', bgm: 'dungeon', fallback: 'sand', vision: 3, rows: [
    'cccccccccccccccccccccccccccccc',
    'ccccccccccccccccsccccccccccccc',
    'ccccccccccccccccsccccccccccccc',
    'ccccccccccccccccsccccccccccccc',
    'ccccccccccccccccsccccccccccccc',
    'cccccccccccccssssssssccccccccc',
    'cccccccccccccsccccccsccccccccc',
    'cccccccccccccsccccccsccccccccc',
    'cccccccccccccsccccccscccsssccc',
    'c<sssscccccccsccccccsssssssssc',
    'cccccscccccccscccccccccccccccc',
    'cccccscccccccscccccccccccccccc',
    'cccccscccccccscccccccccccccccc',
    'cccccsccsssccscccccccccccccccc',
    'ccsssssssssssscccccccccccccccc',
    'ccccccccsssccccccccccccccccccc',
    'cccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccc'
  ],
  warps: [{ x: 1, y: 9, to: 'sandstorm_corridor_1', tx: 27, ty: 9 }, { x: 28, y: 9, to: 'world_desert', tx: 98, ty: 63, name: '砂漠へ（南口）' }],
  chests: [{ id: 'sc3', x: 16, y: 1, item: 'elixir', qty: 1 }, { id: 'sc4', x: 2, y: 14, gold: 1500 }, { id: 'sc5', x: 8, y: 15, item: 'hi_ether', qty: 1 }],
  events: [{ x: 23, y: 9, type: 'boss', solid: true, doneFlag: 'caravan_done', requireFlag: 'caravan_ambush_2', lockedText: ['砂嵐の向こうに、人影がいくつも動いている。', '……隊商を連れずに近づけば、囲まれて終わりだ。'], enemies: ['boss_storm_chief', 'caravan_raider'],
    intro: ['嵐の切れ目から、曲刀を下げた男が現れた。', '砂嵐の頭目ザイード「隊商ギルドの犬どもか。嵐の中じゃ、誰も遠くは見えねえ。……見えねえ奴から、奪われるのさ」'],
    after: ['頭目ザイードは曲刀を落とし、嵐の中へ逃げていった。', '砂嵐が、少しずつ弱まっていく。回廊の出口の先に、南の砂漠が見えた。'], questComplete: 'sahar_caravan' }],
  npcs: [
    { id: 'sc_hamid2', x: 25, y: 8, sprite: 'merchant', dir: 'down', wander: 0, showIf: 'caravan_done', talk: async function (c) {
      await c.say('隊商長ハミド', ['ありがとう。隊商はこのまま南のオアシスへ向かう。', 'そうだ——南の砂漠の奥に「蜃気楼神殿」がある。古い祭司たちは、遠くの星を見て砂漠を渡ったそうだ。', '神殿の扉は、目の前の轍だけを見る者を迷わせる。行くなら、石板をよく読め。']);
      if (!c.questActive('sahar_mirage') && !c.questDone('sahar_mirage')) c.questStart('sahar_mirage');
    } },
    ambush('sc_raider2', 12, 14, 'caravan_ambush_2', ['caravan_raider', 'caravan_raider', 'dune_scorpion'], ['二度目はねえと思ったか？ 嵐の中は、俺たちの庭だ！'])
  ],
  encounters: CORRIDOR_ENC });

  /* =========================================================
     蜃気楼神殿（3階層＋最奥）：石板の上位足を読み、正しい扉を選ぶ
     ========================================================= */
  var DOOR_LABEL = { up: '↗ 上昇の道', skip: '→ 見送りの道', down: '↘ 下降の道' };
  var FLOORS = [
    { map: 'mirage_temple_1', flag: 'mirage_1', next: ['mirage_temple_2', 9, 12], doors: ['down', 'up', 'skip'], answer: 'up', charts: [['up', '日足（上位足）'], ['pull_down', '15分足（目の前の足）']],
      lines: ['【石板】日足：高値も安値も切り上げている。EMA20・30・40は上向きに並ぶ。', '15分足：直近は高値・安値を切り下げ、EMA20の下にいる。', '「足元の轍は、風でいくらでも向きを変える。遠くの星を見よ」'] },
    { map: 'mirage_temple_2', flag: 'mirage_2', next: ['mirage_temple_3', 9, 12], doors: ['up', 'skip', 'down'], answer: 'down', charts: [['down', '日足（上位足）'], ['pull_up', '1時間足（目の前の足）']],
      lines: ['【石板】日足：高値も安値も切り下げている。EMA20・30・40は下向きに並ぶ。', '1時間足：直近は反発して高値を切り上げ、EMA20の上に出た。', '「戻りは、流れの向きを変えたのではない。息継ぎをしているだけだ」'] },
    { map: 'mirage_temple_3', flag: 'mirage_3', next: ['mirage_temple_4', 7, 10], doors: ['skip', 'down', 'up'], answer: 'skip', charts: [['range', '日足（上位足）'], ['spike', '4時間足（目の前の足）']],
      lines: ['【石板】日足：高値の切り上げと安値の切り下げが揃わず、同じ幅を行き来している。', '4時間足：たった今、急に駆け上がった。', '「向きの決まらぬ砂漠で、走り出した影を追う者は、砂に呑まれる」'] }
  ];
  var TEMPLE_ENC = { rate: 0.04, zones: [{ name: '蜃気楼神殿', test: function () { return true; }, groups: [['temple_sentinel'], ['rumor_mimic', 'mirage_fox'], ['dust_djinn', 'temple_sentinel'], ['mirage_fox', 'mirage_fox', 'dust_djinn']], level: 24 }] };
  FLOORS.forEach(function (F, fi) {
    var events = [{ x: 9, y: 9, type: 'script', solid: true, run: async function (c) {
      if (!c.questActive('sahar_mirage') && !c.questDone('sahar_mirage')) c.questStart('sahar_mirage');
      await tablet('第' + (fi + 1) + '階の石板', F.charts, F.lines);
    } }];
    [3, 9, 15].forEach(function (x, di) {
      var kind = F.doors[di];
      events.push({ x: x, y: 2, type: 'script', solid: true, run: async function (c) {
        var d = D();
        await c.msg(['扉に「' + DOOR_LABEL[kind] + '」と刻まれている。']);
        var go = await c.choice('この扉を開けますか？', ['開ける', 'やめておく']); if (go !== 0) return;
        if (kind === F.answer) {
          await c.msg(['扉の向こうの砂が固まり、確かな床になった。……正しい道だ。']);
          if (!d.flags[F.flag]) { d.flags[F.flag] = true; }
          c.warp(F.next[0], F.next[1], F.next[2]); return;
        }
        await c.msg(['扉の向こうに、水をたたえたオアシスが見えた。駆け寄ると——景色が揺らいだ。', '……蜃気楼だった。']);
        var r = await c.battle(fi === 2 ? ['rumor_mimic', 'mirage_fox'] : ['mirage_fox', 'mirage_fox'], {});
        if (r === 'lost') { await root.World.gameOver(); return; }
        await c.msg(['気がつくと、階の入口に立っていた。石板をもう一度読もう。']);
        c.warp(F.map, 9, 12);
      } });
    });
    add({ id: F.map, name: '蜃気楼神殿' + (fi ? ' ' + (fi + 1) + '階' : ''), kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
      'CCCCCCCCCCCCCCCCCCC',
      'CCCCCCCCCCCCCCCCCCC',
      'CCCUCCCCCUCCCCCUCCC',
      'CCC:CCCCC:CCCCC:CCC',
      'CCC:CCCCC:CCCCC:CCC',
      'CCC:CCCCC:CCCCC:CCC',
      'CC:::::::::::::::CC',
      'CC:I:::::::::::I:CC',
      'CC:::::::::::::::CC',
      'CC:::::::S:::::::CC',
      'CC::I:::::::::I::CC',
      'CC:::::::::::::::CC',
      'CC:::::::::::::::CC',
      'CCCCCCCCC<CCCCCCCCC',
      'CCCCCCCCCCCCCCCCCCC'
    ],
    warps: [fi === 0 ? { x: 9, y: 13, to: 'world_desert', tx: 122, ty: 99, name: '砂漠へ' } : { x: 9, y: 13, to: FLOORS[fi - 1].map, tx: 9, ty: 8 }],
    chests: [[{ id: 'mt1', x: 2, y: 6, item: 'hi_potion', qty: 3 }], [{ id: 'mt2', x: 16, y: 6, item: 'sun_spear', qty: 1 }], [{ id: 'mt3', x: 2, y: 12, gold: 2500 }]][fi],
    events: events, encounters: TEMPLE_ENC });
  });
  add({ id: 'mirage_temple_4', name: '蜃気楼神殿 最奥', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCC',
    'C::::XXXXX::::C',
    'C::I:::S:::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::I:::::::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'C::I:::::::I::C',
    'C:::::::::::::C',
    'C:::::::::::::C',
    'CCCCCCC<CCCCCCC'
  ],
  warps: [{ x: 7, y: 11, to: 'mirage_temple_3', tx: 9, ty: 8 }],
  chests: [{ id: 'mt4', x: 13, y: 10, item: 'phoenix_feather', qty: 1 }],
  events: [
    { x: 7, y: 6, type: 'boss', solid: true, doneFlag: 'mirage_lord', enemy: 'boss_mirage_lord', intro: ['祭壇の前の空気が揺らぎ、砂の上に巨大な影が立ち上がった。', '蜃気楼の主「よく来た。……だが、遠くを見るのは疲れるだろう？ 目の前の足だけ見ていれば、楽だ」'], after: ['蜃気楼の主は、砂の粒になって崩れた。', '祭壇の奥の石板が、光を帯びている。'] },
    { x: 7, y: 2, type: 'script', solid: true, run: async function (c) { var d = D();
      if (!d.flags.mirage_lord) { await c.msg(['古い文字が刻まれた石板。蜃気楼の主の影が、石板を覆っている。']); return; }
      await c.msg(['【古代の記録】', '「我らは砂漠を渡る民。足元の轍は、一夜の風で消える。ゆえに我らは、星を見て歩いた」', '「市に立つ噂もまた、轍に似る。近づけば消える水場のように、追う者を砂へ誘う」', '「遠くの星——長い流れ——に従い、流れの見えぬ夜は、動かずに待て」', '「やがて北の空の民が、波を穏やかにする石を作ると聞いた。……穏やかな波もまた、蜃気楼でなければよいが」']);
      if (!d.flags.mirage_record) { d.flags.mirage_record = true; await c.questComplete('sahar_mirage'); }
      await c.remark('seris', ['北の空の民……天空群島の、クリスタルを作った人たちのこと？', 'この民は、クリスタルができる前から、それを疑っていたのね。'], 'seris_remark_mirage');
      await c.remark('lucia', ['流れの見えない夜は、動かずに待つ。……師匠の口癖と、同じ。'], 'lucia_remark_mirage');
    } }
  ],
  encounters: null });
})(typeof window !== 'undefined' ? window : globalThis);
