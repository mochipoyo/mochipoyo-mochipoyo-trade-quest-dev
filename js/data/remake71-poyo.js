/* =========================================================
   Data / v7.1 ポヨ村の作り込み（いちばん最初の村から順に）
   ・村を東へ広げる（48 → 76 マス）：川と2本の橋・水車小屋・市場の広場・釣りの池・果樹園・見張り台（3階まで）・納屋（2階の屋根裏）・集会所（2階の書庫）・畑
   ・既存の建物・人・出来事・出入口の座標は変えない（東へ足すだけ。旧セーブの位置・物語の場面・テストの座標はそのまま）
     変えたのは東の端の木の列のうち、道の2本（8〜9行目・30〜31行目）を東へ延ばした所だけ
   ・2階・3階：村長の家（2階）・宿屋（2階の客室）・教会（2階の聖歌隊席・3階の鐘楼）・見張り台（2階・3階）・納屋（屋根裏）・集会所（2階）
     既存の屋内へは、空いている床1マスを上り階段にしただけ（村長の家 10,1・宿屋 10,7・教会 10,6）
   ・座標は町の拡大（towns.js の ENLARGE）のあとの値。この読み込みはすべての町のデータのあと
   ========================================================= */
(function (root) {
  'use strict';
  var MAPS = root.MAP_DEFS; if (!MAPS || !MAPS.poyo_village) return;
  var V = MAPS.poyo_village; if (V._v71) return;
  var OLD_W = V.rows[0].length, H = V.rows.length, ADD = 28, W = OLD_W + ADD;
  var g = V.rows.map(function (r) { return (r + new Array(ADD + 1).join('.')).split(''); });
  function set(x, y, ch) { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; }
  function fill(x0, y0, x1, y1, ch) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) set(x, y, ch); }
  var E = OLD_W;   // 東の地区の左端（48）
  var L = function (c) { return E + c; };
  // 外周の木
  fill(E, 0, W - 1, 1, 'f'); fill(E, H - 2, W - 1, H - 1, 'f'); fill(W - 2, 0, W - 1, H - 1, 'f');
  // 旧い東の端（木の2列）を、2本の道のところだけ開く
  [8, 9, 30, 31].forEach(function (y) { for (var x = 38; x < E; x++) set(x, y, 'r'); });
  // 川（南北）と橋
  fill(L(8), 2, L(10), H - 3, '~'); [8, 9, 30, 31].forEach(function (y) { fill(L(8), y, L(10), y, 'b'); });
  // 道：東西2本＋東岸の南北の道
  [8, 9].forEach(function (y) { fill(L(0), y, L(7), y, 'r'); fill(L(11), y, L(24), y, 'r'); });
  [30, 31].forEach(function (y) { fill(L(0), y, L(7), y, 'r'); fill(L(11), y, L(14), y, 'r'); });
  fill(L(13), 10, L(14), 29, 'r');
  // 西岸：花の庭
  [[6, 2], [6, 4], [0, 6], [4, 6]].forEach(function (p) { set(L(p[0]), p[1], 'a'); });   // 風車（下の buildings：1〜4列・2〜5行）のまわりの花壇
  set(L(7), 3, 'e'); set(L(0), 7, 'y'); set(L(6), 6, 'S'); set(L(0), 2, 'Z'); set(L(7), 6, 'Z');
  // 水車小屋（建物）と水車の軸（丸太）・小屋の前の道
  fill(L(7), 12, L(7), 14, 'N'); fill(L(3), 16, L(3), 17, 'P'); set(L(1), 16, 'q'); set(L(5), 16, 'z'); set(L(6), 16, 'z');
  // 市場の広場（石の舗装・露店・井戸・ベンチ・街灯・樽と木箱）
  fill(L(0), 18, L(7), 27, 'P');
  [1, 3, 5].forEach(function (c) { set(L(c), 19, 'A'); set(L(c), 26, 'A'); });
  set(L(4), 22, 'j'); set(L(0), 22, 'e'); set(L(7), 22, 'e'); set(L(0), 18, 'y'); set(L(7), 18, 'y'); set(L(0), 27, 'y'); set(L(7), 27, 'y');
  set(L(6), 24, 'q'); set(L(6), 25, 'z'); set(L(1), 24, 'z'); set(L(1), 23, 'a'); set(L(6), 21, 'a');
  // 釣りの池と桟橋
  fill(L(1), 33, L(6), H - 3, '~'); fill(L(3), 32, L(3), 35, 'd'); set(L(0), 33, 'Z'); set(L(7), 34, 'e'); set(L(5), 32, 'S');
  // 東岸の川べり：街灯
  [4, 14, 24, 35].forEach(function (y) { set(L(11), y, 'y'); });
  // 果樹園
  [16, 18, 20, 22, 24].forEach(function (c) { set(L(c), 3, '6'); set(L(c), 5, '6'); }); set(L(15), 7, 'S');
  // 見張り台の横の花壇とベンチ
  fill(L(22), 11, L(25), 11, 'a'); set(L(23), 13, 'e'); set(L(25), 14, 'Z'); set(L(22), 15, 'y');
  // 畑（柵で囲む・入口・案山子）
  fill(L(15), 23, L(25), 23, 'x'); fill(L(15), 28, L(25), 28, 'x'); fill(L(15), 23, L(15), 28, 'x'); fill(L(25), 23, L(25), 28, 'x');
  set(L(19), 23, '.'); fill(L(16), 24, L(24), 27, 'H'); set(L(20), 25, 'S');
  set(L(23), 21, 'q'); set(L(24), 21, 'q'); set(L(23), 20, 'z');
  // 集会所への小道
  fill(L(15), 32, L(15), H - 3, 'P'); fill(L(15), H - 3, L(24), H - 3, 'P'); set(L(25), 33, 'y'); set(L(14), 35, 'Z');
  V.rows = g.map(function (r) { return r.join(''); });
  V.w71 = { oldW: OLD_W, addEast: ADD };

  // ---- 建物（ENLARGE のあとの座標。_jittered：位置はこのまま）
  V.buildings.push(
    { id: 'windmill', type: 'windmill', name: 'ポヨ村の風車', x: L(1), y: 2, w: 4, h: 4, doorX: 1, v71: true, noSign: true },   // 中には入れない（3D は風車の塔と回る羽根）
    { id: 'mill', type: 'house', name: 'ポヨ村の水車小屋', x: L(1), y: 11, w: 6, h: 5, doorX: 2, interior: 'poyo_mill', entry: { x: 5, y: 7 }, v71: true },
    { id: 'watch', type: 'watchtower', name: 'ポヨ村の見張り台', x: L(16), y: 10, w: 6, h: 6, doorX: 2, interior: 'poyo_watch', entry: { x: 5, y: 7 }, v71: true },
    { id: 'barn', type: 'warehouse', name: 'ポヨ村の納屋', x: L(16), y: 17, w: 6, h: 5, doorX: 3, interior: 'poyo_barn', entry: { x: 5, y: 7 }, v71: true },
    { id: 'hall', type: 'elder', name: 'ポヨ村の集会所', x: L(16), y: 32, w: 8, h: 5, doorX: 4, interior: 'poyo_hall', entry: { x: 5, y: 7 }, v71: true }
  );
  // ---- 人（村の暮らし。物語には関わらない）
  function say(name, lines) { return async function (c) { await c.say(name, lines); }; }
  V.npcs.push(
    { id: 'poyo_east_merchant', x: L(1), y: 20, sprite: 'merchant', dir: 'up', wander: 0, v71: true, talk: async function (c) {
      await c.say('露店の商人', ['東の市場へようこそ！ 朝どれの野菜で作ったおにぎりと、村の畑のお茶だよ。']);
      await c.shop('item', ['onigiri', 'green_tea', 'herb']); } },
    { id: 'poyo_east_baker', x: L(5), y: 25, sprite: 'villager_f', dir: 'down', wander: 0, v71: true, talk: say('パン屋の娘', ['水車小屋で挽いた粉でパンを焼くの。毎日同じ量だけ挽いて、同じ量だけ焼く。', '欲張って一度にたくさん作ると、売れ残って全部だめになっちゃうのよ。']) },
    { id: 'poyo_fisher', x: L(3), y: 35, sprite: 'villager_m', dir: 'down', wander: 0, v71: true, talk: say('釣り人', ['釣りはね、待つのが仕事さ。', '魚がいないときに竿を振り回しても、疲れるだけだよ。来るまで待って、来たら迷わず上げる。']) },
    { id: 'poyo_east_kid', x: L(12), y: 20, sprite: 'child', dir: 'down', wander: 2, v71: true, talk: say('村の子ども', ['見張り台のてっぺんに登ったことある？ 村も森も、ぜーんぶ見えるんだよ！']) },
    { id: 'poyo_field_farmer', x: L(17), y: 26, sprite: 'villager_m', dir: 'right', wander: 1, v71: true, talk: say('畑の農夫', ['畑は1日で育たない。種をまいて、水をやって、待つ。', '待てずに掘り返したら、芽はそこで終わりさ。']) },
    { id: 'poyo_bench_granny', x: L(23), y: 14, sprite: 'villager_f', dir: 'down', wander: 0, v71: true, talk: say('ひなたぼっこのおばあさん', ['このベンチから見る川がいちばん好きでねえ。', '水は上から下へ流れる。逆らって泳ぐより、流れに乗るほうがずっと楽なのさ。']) }
  );
  V.chests.push({ id: 'poyo_e1', x: L(25) - 1, y: 4, item: 'herb', qty: 2, v71: true });
  V.events.push(
    { x: L(6), y: 6, type: 'inspect', solid: false, v71: true, text: ['【立て札】ポヨ村・東の地区', '西岸：風車と花の庭・水車小屋・市場の広場・釣りの池', '東岸：果樹園・見張り台・納屋・畑・集会所'] },
    { x: L(2), y: 6, type: 'inspect', solid: false, v71: true, text: ['ポヨ村の風車だ。風がある日は、羽根がゆっくり回って麦を挽く。', '風のない日は、ただ待つしかない。風は呼んでも来ないのだ。'] },
    { x: L(15), y: 7, type: 'inspect', solid: false, v71: true, text: ['【立て札】果樹園', '実がなるまで、何年もかかる木もある。'] },
    { x: L(20), y: 25, type: 'inspect', solid: false, v71: true, text: ['案山子だ。「カラスより、待てない人間のほうが畑を荒らす」と書かれた札がぶら下がっている。'] },
    { x: L(5), y: 32, type: 'inspect', solid: false, v71: true, text: ['【立て札】釣りの池', '釣れた魚は池に返すこと。'] }
  );

  // ---- 屋内（新しい部屋）
  var TK = root.TownKit; function add(def) { def.v71 = true; MAPS[def.id] = def; return def; }
  function door(id, x, y) { return { x: 5, y: 8, to: 'poyo_village', tx: x, ty: y }; }
  add({ id: 'poyo_mill', name: 'ポヨ村の水車小屋', kind: 'interior', bgm: 'town', rows: [
    '############', '#qq__TT__zz#', '#__________#', '#__________#', '#____II____#', '#__________#', '#zz______qq#', '#__________#', '#####D######'
  ], warps: [door('mill', L(3), 16)],
    npcs: [{ id: 'poyo_miller', x: 3, y: 3, sprite: 'villager_m', dir: 'down', wander: 0, talk: say('粉屋', ['水車は川がある限り、休まず回る。一回まわるごとに、ほんの少しずつ粉ができる。', '少しずつでも止めずに続ければ、ひと冬ぶんの粉になるんだ。']) }],
    events: [{ x: 5, y: 4, type: 'inspect', solid: true, text: ['大きな石臼だ。川の水の力で、ゆっくりと回っている。'] }] });
  add({ id: 'poyo_watch', name: '見張り台 1階', kind: 'interior', bgm: 'town', rows: [
    '############', '#K____t___<#', '#__________#', '#_t____zz__#', '#__________#', '#q________q#', '#__________#', '#__________#', '#####D######'
  ], warps: [door('watch', L(18), 16), { x: 10, y: 1, to: 'poyo_watch_2f', tx: 10, ty: 2, name: '2階へ' }],
    npcs: [{ id: 'poyo_watch_guard', x: 3, y: 4, sprite: 'guard', dir: 'down', wander: 0, talk: say('見張りの番人', ['3階まで登れば、村の外まで見渡せるぞ。', '地面にいると目の前の木しか見えん。高い所から見れば、森がどっちへ続いているかがわかる。']) }] });
  add({ id: 'poyo_watch_2f', name: '見張り台 2階', kind: 'interior', bgm: 'town', rows: [
    '############', '#_________>#', '#__________#', '#_KK____KK_#', '#__________#', '#____tt____#', '#__________#', '#<_________#', '############'
  ], warps: [{ x: 10, y: 1, to: 'poyo_watch', tx: 9, ty: 1, name: '1階へ' }, { x: 1, y: 7, to: 'poyo_watch_3f', tx: 2, ty: 7, name: '3階へ' }],
    events: [{ x: 5, y: 5, type: 'inspect', solid: true, text: ['見張りの記録帳だ。「晴れ・西風・森の上空に鳥の群れ。異常なし」と毎日書かれている。'] }] });
  add({ id: 'poyo_watch_3f', name: '見張り台 3階（てっぺん）', kind: 'interior', bgm: 'town', rows: [
    '############', '#__________#', '#__________#', '#__________#', '#____tt____#', '#__________#', '#__________#', '#>_________#', '############'
  ], warps: [{ x: 1, y: 7, to: 'poyo_watch_2f', tx: 2, ty: 7, name: '2階へ' }],
    npcs: [{ id: 'poyo_lookout', x: 8, y: 3, sprite: 'guard', dir: 'left', wander: 0, talk: say('見張り', ['ここからなら、北のリヴェルの城も、南の港も見える。', '下にいると「目の前の一歩」しか見えんが、上から見れば「どっちへ向かう道か」がわかるんだ。']) }],
    events: [{ x: 5, y: 4, type: 'inspect', solid: true, text: ['望遠鏡をのぞいた。', '北にはリヴェル城下町の城壁、南には港町マリナの海、東には深い森が広がっている。', '高い所から見ると、道がどこへ続いているかがよくわかる。'] }] });
  add({ id: 'poyo_barn', name: 'ポヨ村の納屋', kind: 'interior', bgm: 'town', rows: [
    '############', '#zzz___qqq<#', '#__________#', '#_zz____zz_#', '#__________#', '#__________#', '#q________q#', '#__________#', '#####D######'
  ], warps: [door('barn', L(19), 22), { x: 10, y: 1, to: 'poyo_barn_2f', tx: 10, ty: 2, name: '屋根裏へ' }],
    npcs: [{ id: 'poyo_barn_farmer', x: 5, y: 4, sprite: 'villager_m', dir: 'down', wander: 1, talk: say('納屋の農夫', ['収穫したぶんは全部食べずに、次の種のぶんを残しておく。', '全部使っちまったら、来年まくものがなくなるからな。']) }] });
  add({ id: 'poyo_barn_2f', name: 'ポヨ村の納屋（屋根裏）', kind: 'interior', bgm: 'town', rows: [
    '############', '#zz_______>#', '#__________#', '#_zz___zz__#', '#__________#', '#__q____q__#', '#__________#', '#__________#', '############'
  ], warps: [{ x: 10, y: 1, to: 'poyo_barn', tx: 10, ty: 2, name: '1階へ' }],
    chests: [{ id: 'poyo_loft1', x: 2, y: 6, item: 'potion', qty: 1 }],
    npcs: [{ id: 'poyo_loft_kid', x: 6, y: 6, sprite: 'child', dir: 'down', wander: 0, talk: say('隠れている子ども', ['しーっ！ かくれんぼ中なの。', 'ここはね、村でいちばん見つからない場所なんだ。']) }] });
  add({ id: 'poyo_hall', name: 'ポヨ村の集会所', kind: 'interior', bgm: 'town', rows: [
    '############', '#KK__TT_KK<#', '#__________#', '#_tt____tt_#', '#__________#', '#_tt____tt_#', '#__________#', '#__________#', '#####D######'
  ], warps: [door('hall', L(20), 37), { x: 10, y: 1, to: 'poyo_hall_2f', tx: 10, ty: 2, name: '2階へ' }],
    npcs: [
      { id: 'poyo_hall_chair', x: 5, y: 2, sprite: 'elder', dir: 'down', wander: 0, talk: say('集会所の世話役', ['ここは村の寄り合いの場所じゃ。畑の水の分け方も、祭りの段取りも、ここで決める。', '大事なことほど、ひとりで決めずに記録を見返すんじゃよ。2階に村の記録がある。']) },
      { id: 'poyo_hall_woman', x: 8, y: 6, sprite: 'villager_f', dir: 'up', wander: 1, talk: say('寄り合いの女性', ['去年は大雨で川があふれたの。だから今年は、早めに堤を直すことにしたのよ。']) }
    ] });
  add({ id: 'poyo_hall_2f', name: 'ポヨ村の集会所 2階（記録の部屋）', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKKK__KKK>#', '#__________#', '#_t______t_#', '#__________#', '#____pp____#', '#____pp____#', '#__________#', '############'
  ], warps: [{ x: 10, y: 1, to: 'poyo_hall', tx: 10, ty: 2, name: '1階へ' }],
    events: [
      { x: 2, y: 1, type: 'inspect', solid: true, text: ['『ポヨ村の歩み』', '日照りの年・大雨の年・豊作の年。何十年ぶんの天気と収穫が、几帳面な字で記されている。', '最後のページに「よい年も悪い年も、記録を残せば次の年の役に立つ」とある。'] },
      { x: 1, y: 3, type: 'inspect', solid: true, text: ['机の上に、村のまわりの手描きの地図が広げてある。', '北にリヴェル城下町、南に港町マリナ。東の森には「迷いやすい・近づくな」と赤い字。'] }
    ] });
  // 既存の建物の上の階
  add({ id: 'poyo_elder_house_2f', name: '村長の家 2階', kind: 'interior', bgm: 'town', rows: [
    '############', '#KK_E_____>#', '#__________#', '#_t______K_#', '#__________#', '#____pp____#', '#__________#', '#__________#', '############'
  ], warps: [{ x: 10, y: 1, to: 'poyo_elder_house', tx: 9, ty: 1, name: '1階へ' }],
    events: [
      { x: 1, y: 1, type: 'inspect', solid: true, text: ['村長の本棚だ。農業の本、天気の本、古い帳簿の綴りが並んでいる。'] },
      { x: 2, y: 3, type: 'inspect', solid: true, text: ['机の上に書きかけの手紙がある。「今年も無事に収穫できますように」とだけ書かれている。'] }
    ] });
  add({ id: 'poyo_inn_2f', name: 'ポヨ村の宿屋 2階（客室）', kind: 'interior', bgm: 'town', rows: [
    '############', '#E_E_E_E__>#', '#__________#', '#_t__t__t__#', '#__________#', '#E_E_E_E___#', '#__________#', '#__________#', '############'
  ], warps: [{ x: 10, y: 1, to: 'poyo_inn', tx: 9, ty: 7, name: '1階へ' }],
    npcs: [{ id: 'poyo_inn_peddler', x: 6, y: 4, sprite: 'merchant', dir: 'down', wander: 1, talk: say('泊まりの行商人', ['南の港町から来たんだ。明日はリヴェルへ向かうよ。', '荷物はいつも、運べる分だけ。欲張って背負いすぎると、山道で倒れちまう。']) }] });
  add({ id: 'poyo_church_2f', name: 'ポヨ村の教会 2階（聖歌隊席）', kind: 'interior', bgm: 'church', rows: [
    '############', '#K___XX___>#', '#__________#', '#_t_t__t_t_#', '#__________#', '#__pppppp__#', '#__________#', '#<_________#', '############'
  ], warps: [{ x: 10, y: 1, to: 'poyo_church', tx: 9, ty: 6, name: '1階へ' }, { x: 1, y: 7, to: 'poyo_church_3f', tx: 2, ty: 7, name: '鐘楼へ' }],
    events: [{ x: 5, y: 1, type: 'inspect', solid: true, text: ['小さなパイプオルガンだ。鍵盤にそっと触れると、やわらかな音が響いた。'] }] });
  add({ id: 'poyo_church_3f', name: 'ポヨ村の教会 3階（鐘楼）', kind: 'interior', bgm: 'church', rows: [
    '############', '#__________#', '#__________#', '#____XX____#', '#__________#', '#__________#', '#__________#', '#>_________#', '############'
  ], warps: [{ x: 1, y: 7, to: 'poyo_church_2f', tx: 2, ty: 7, name: '2階へ' }],
    events: [{ x: 5, y: 3, type: 'inspect', solid: true, text: ['村の鐘だ。朝と夕方に一度ずつ鳴らすのだという。', '鐘のふちに「時を告げる者は、時を急がせない」と彫られている。'] }] });
  // 既存の屋内へ上り階段を1マスずつ（空いている床）
  function stairs(id, x, y, to, tx, ty, name) {
    var d = MAPS[id]; if (!d || d._v71stairs) return; var r = d.rows[y].split(''); if (r[x] !== '_') return; r[x] = '<'; d.rows[y] = r.join('');
    d.warps.push({ x: x, y: y, to: to, tx: tx, ty: ty, name: name, v71: true }); d._v71stairs = true;
  }
  stairs('poyo_elder_house', 10, 1, 'poyo_elder_house_2f', 10, 2, '2階へ');
  stairs('poyo_inn', 10, 7, 'poyo_inn_2f', 10, 2, '2階へ');
  stairs('poyo_church', 10, 6, 'poyo_church_2f', 10, 2, '2階へ');
  V._v71 = true;
  root.REMAKE71 = root.REMAKE71 || {}; root.REMAKE71.poyo = { oldW: OLD_W, w: W, interiors: ['poyo_mill', 'poyo_watch', 'poyo_watch_2f', 'poyo_watch_3f', 'poyo_barn', 'poyo_barn_2f', 'poyo_hall', 'poyo_hall_2f', 'poyo_elder_house_2f', 'poyo_inn_2f', 'poyo_church_2f', 'poyo_church_3f'] };
})(typeof window !== 'undefined' ? window : globalThis);
