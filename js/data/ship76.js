/* =========================================================
   Data / v7.6：港町マリナの「修理中の船」に上がれる・中に入れる
   ・港町マリナ（町の拡張 v7.2 のあとの座標）：船の南の海に、桟橋（dock）から船のタラップ（扉のマス）までの板の通路を足す
     → 船の建物に interior（甲板）を付ける。扉のマスに乗ると甲板へ（ほかの建物と同じ入り方）
   ・新しいマップ：修理中の船・甲板（外。海が見える）／修理中の船・船室（甲板の昇降口から下りる）。どちらも種類はダンジョン（1つのまとまり。入口は桟橋だけ）
   ・物語・クエスト（船乗りの修理・潮の大蛇・小型帆船）は変えない。甲板と船室には調べられる物と宝箱1つだけ
   ・各変更は「いまの文字・建物が期待どおりのときだけ」当てる（後段の変更で地図がずれていたら当てずに記録＝SHIP76.skipped）
   ・3D版：船の形は three-src/src/world/ShipModel3D.js（町の建物）と environment/recipes/ship_deck.js（甲板）
   ========================================================= */
(function (root) {
  'use strict';
  var D = root.MAP_DEFS; if (!D) return;
  var R = root.SHIP76 = { version: 1, applied: [], skipped: [] };
  var town = D.harbor_town; if (!town || !Array.isArray(town.rows)) { R.skipped.push('harbor_town：rows がない'); return; }
  var ship = (town.buildings || []).filter(function (b) { return b.id === 'ship' && b.type === 'ship'; })[0];
  if (!ship || ship.x !== 10 || ship.y !== 28 || ship.w !== 10 || ship.h !== 4 || ship.doorX !== 4) { R.skipped.push('harbor_town：船の建物の位置が想定と違う ' + JSON.stringify(ship || null)); return; }
  var doorX = ship.x + ship.doorX, frontY = ship.y + ship.h;   // 扉 (14,31)・扉の前 (14,32)
  // 板の通路：扉の前 (14,32)〜(23,32) と (14,33)。いまは水（~）か、扉の前の小さな地面（.）
  var walk = []; for (var x = doorX; x <= 23; x++) walk.push([x, frontY]); walk.push([doorX, frontY + 1]);
  var bad = walk.filter(function (p) { var c = (town.rows[p[1]] || '').charAt(p[0]); return c !== '~' && c !== '.'; });
  var dockNext = (town.rows[frontY] || '').charAt(24) === 'd';
  if (bad.length || !dockNext) { R.skipped.push('harbor_town：通路のマスが想定と違う ' + JSON.stringify(bad) + ' 桟橋 ' + dockNext); return; }
  walk.forEach(function (p) { var row = town.rows[p[1]]; town.rows[p[1]] = row.substring(0, p[0]) + 'd' + row.substring(p[0] + 1); });
  ship.interior = 'harbor_ship_deck'; ship.entry = { x: 14, y: 10 }; R.tiles = walk.map(function (p) { return [p[0], p[1]]; });   // 変えたマス（テストが参照）
  R.applied.push('harbor_town：通路 ' + walk.length + 'マス・船に甲板への入口');

  var D_ = function () { return root.State && root.State.data; };
  var ready = function () { var d = D_(); return !!(d && d.flags && d.flags.ship_ready); };
  // 甲板（船首＝西・船尾＝東・タラップ＝南の舷）。I＝帆柱・>＝船室への昇降口・q/z＝樽と木箱
  D.harbor_ship_deck = { id: 'harbor_ship_deck', name: '修理中の船・甲板', kind: 'dungeon', bgm: 'town', fallback: 'floor_wood', noLayout: true, ship76: true,
    theme3d: { region: 'arcadia', place: 'deck' },
    rows: [
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~WWWWWWWWWWWWWWWWWWW~~',
      '~~~~~~WWW__________________W~~',
      '~~~~WW_____q________zz__z__W~~',
      '~~~W___q___________________W~~',
      '~~W________________________W~~',
      '~W_______I_____I___>__I____W~~',
      '~~W________________________W~~',
      '~~~W___q___________________W~~',
      '~~~~WW______________z___q__W~~',
      '~~~~~~WWW__________________W~~',
      '~~~~~~~~~WWWWW_WWWWWWWWWWWWW~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
    ],
    warps: [{ x: 14, y: 11, to: 'harbor_town', tx: 14, ty: 32, name: '桟橋へ下りる' }, { x: 19, y: 6, to: 'harbor_ship_cabin', tx: 9, ty: 5, name: '船室へ' }],
    chests: [],
    npcs: [],
    events: [
      { x: 25, y: 6, type: 'script', solid: true, run: async function (c) {
        if (ready()) { await c.msg(['大きな舵輪。新しい綱が巻き直してある。', '小型帆船は直って港の西の海へ出た。この大きな船は、まだ修理が続いている。']); return; }
        await c.msg(['大きな舵輪。嵐で舵の綱が切れ、輪はからからと空回りする。', '舵の前に、羅針盤を据える台だけが残っている。']); } },
      { x: 15, y: 6, type: 'script', solid: true, run: async function (c) {
        await c.msg(['主帆柱。見上げると、帆桁に破れた帆がたたまれている。', ready() ? '新しい帆布の切れ端が、帆桁に結んである。' : '帆を張り替えるには、丈夫な帆布が要りそうだ。']); } },
      { x: 20, y: 3, type: 'inspect', solid: true, text: ['船大工の覚え書きが木箱に釘で留めてある。', '「舷側の板 12 枚張り替え済み。残りは帆と舵。潮の機嫌が悪い日は作業しないこと」'] }
    ]
  };
  // 船室（甲板の昇降口から下りる。ハンモック＝E・海図の棚＝K・机＝t）
  // 船室も「ダンジョン」の種類（甲板と1つのまとまり＝脱出すると船の入口＝桟橋へ）。3D は船の木の部屋（theme3d：harbor）
  D.harbor_ship_cabin = { id: 'harbor_ship_cabin', name: '修理中の船・船室', kind: 'dungeon', bgm: 'town', fallback: 'floor_wood', noLayout: true, ship76: true,
    theme3d: { region: 'arcadia', place: 'harbor' },
    rows: [
      'WWWWWWWWWWWWWWWWWW',
      'WKK__E_E____qzz__W',
      'W________________W',
      'W__tt________E_E_W',
      'W________________W',
      'W_______<________W',
      'W_q____________zqW',
      'WWWWWWWWWWWWWWWWWW'
    ],
    warps: [{ x: 8, y: 5, to: 'harbor_ship_deck', tx: 19, ty: 7, name: '甲板へ' }],
    chests: [{ id: 'harbor_ship1', x: 2, y: 4, item: 'hi_potion', qty: 1 }],
    npcs: [],
    events: [
      { x: 3, y: 3, type: 'script', solid: true, run: async function (c) {
        await c.msg(['机の上に、潮で波打った航海日誌がある。', '「上げ潮の前に逆らうな。波の向きを確かめてから帆を張れ」', ready() ? '最後の頁に、新しい字で「小型帆船、出航」とある。' : '最後の頁は、嵐の日で止まっている。']); } },
      { x: 1, y: 1, type: 'inspect', solid: true, text: ['海図の棚。アルカディア相場大陸の沿岸が、細かく書き込まれている。'] }
    ]
  };
  R.applied.push('新しいマップ：harbor_ship_deck・harbor_ship_cabin');
})(typeof window !== 'undefined' ? window : globalThis);
