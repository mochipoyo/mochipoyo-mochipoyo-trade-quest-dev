/* =========================================================
   Data / World region : ゼロメア（異空間の島・第11〜12章）。40×30 の設計図 → 160×120 タイル
   ・時の神殿領の転移門から入る（海路なし。周囲の海は静かで、船は来ない）
   ・中央に演算都市ノード（オラクル中枢）、南西に第7居住区、北の崖の上に旧都市、東の丘に自動工場、南に転移門（帰還）
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooo~~~~~ooooooooooooooooo',
    'oooooooooooo~~~~~~~~~~~~~~~~~ooooooooooo',
    'oooooooooo~~~~~~~~~~~~~~~~~~~~~ooooooooo',
    'ooooooooo~~~~~..cchhhhhcc..~~~~~oooooooo',
    'ooooooo~~~~~.....ccccccc.....~~~~~oooooo',
    'oooooo~~~~~...................~~~~~ooooo',
    'oooooo~~~.......................~~~ooooo',
    'ooooo~~~.........................~~~oooo',
    'ooooo~~~.........................~~~oooo',
    'ooooo~~...........................~~oooo',
    'oooo~~~.........................h.~~~ooo',
    'oooo~~~FFF....................hhhh~~~ooo',
    'oooo~~FFFFF..................hhhhhh~~ooo',
    'oooo~~~FFFFF................hhhhhh~~~ooo',
    'oooo~~~FFFF..................hhhhh~~~ooo',
    'ooooo~~FFF....................hhhh~~oooo',
    'ooooo~~~........................h~~~oooo',
    'ooooo~~~.........................~~~oooo',
    'oooooo~~~.......................~~~ooooo',
    'oooooo~~~~~...................~~~~~ooooo',
    'ooooooo~~~~~.................~~~~~oooooo',
    'ooooooooo~~~~~.............~~~~~oooooooo',
    'oooooooooo~~~~~~~~~~.~~~~~~~~~~ooooooooo',
    'oooooooooooo~~~~~~~~~~~~~~~~~ooooooooooo',
    'oooooooooooooooooo~~~~~ooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo'
  ];
  var LOCATIONS = [
    { id: 'node_city', name: '演算都市ノード', icon: 'castle_icon', x: 82, y: 58, to: 'node_city', tx: 19, ty: 28 },
    { id: 'scheduled_district', name: '第7居住区', icon: 'village', x: 42, y: 86, to: 'scheduled_district', tx: 14, ty: 22 },
    { id: 'old_city', name: '廃棄された旧都市', icon: 'cave_icon', x: 82, y: 28, to: 'old_city_1', tx: 1, ty: 12 },
    { id: 'auto_factory', name: '自動工場', icon: 'cave_icon', x: 126, y: 66, to: 'auto_factory_1', tx: 1, ty: 1 },
    { id: 'gate_back', name: '転移門（帰還）', icon: 'cave_icon', x: 82, y: 98, to: 'world_tempus', tx: 134, ty: 88 }
  ];
  var ROADS = [[[82, 98], [82, 58]], [[82, 58], [42, 86]], [[82, 58], [126, 66]], [[82, 58], [82, 28]]];
  var def = root.makeWorldRegion({
    id: 'world_machine', name: 'ゼロメア', MACRO: MACRO, W: 160, H: 120, SEED: 20261205, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field',
    chests: [{ id: 'z1', x: 36, y: 57, item: 'elixir', qty: 1 }, { id: 'z2', x: 120, y: 40, gold: 2200 }, { id: 'z3', x: 60, y: 100, item: 'phoenix_feather', qty: 2 }, { id: 'z4', x: 110, y: 90, item: 'hi_ether', qty: 3 }],
    npcs: [
      { id: 'zw_walker', x: 70, y: 76, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { if (c.flag('zeromea_reformed')) await c.say('散歩する男', ['散歩だ。目的地はない。……許可も要らない。', '初めてだよ、行き先を決めずに歩くのは。少し怖い。']); else await c.say('移動中の男', ['第7居住区から演算都市へ、移動許可は14時から14時20分まで。遅れると次の許可は明日だ。', '……あなたたち、識別票がない。未登録個体？ ドローンに見つかる前に行った方がいい。']); } },
      { id: 'zw_drone_sign', x: 82, y: 70, sprite: 'guard', dir: 'down', wander: 0, hideIf: 'zeromea_reformed', talk: async function (c) { await c.say('案内機', ['「ようこそゼロメアへ。この島では飢えも犯罪も存在しません。すべてはオラクルが最適化しています」', '「未登録個体を検知。登録手続きのため、その場で待機してください」', '……待機する気はない。']); } }
    ],
    events: [{ x: 60, y: 70, type: 'learn', solid: false, learnId: 'practice_zeromea' }],
    encounters: { rate: 0.035, zones: [
      { name: '旧都市の崖', test: function (x, y) { return y <= 36; }, groups: [['rust_sentinel'], ['rust_sentinel', 'data_leech'], ['patrol_drone', 'patrol_drone', 'data_leech']], level: 25 },
      { name: 'ゼロメアの平野', test: function () { return true; }, groups: [['patrol_drone'], ['patrol_drone', 'patrol_drone'], ['sentry_unit'], ['data_leech', 'data_leech'], ['patrol_drone', 'sentry_unit'], ['repair_bot', 'sentry_unit']], level: 24 }
    ] }
  });
  // 改革後はドローンのエンカウントが減る
  var baseRate = def.encounters.rate; Object.defineProperty(def.encounters, 'rate', { get: function () { var d = root.State && root.State.data; return (d && d.flags && d.flags.zeromea_reformed) ? baseRate * 0.5 : baseRate; }, set: function (v) { baseRate = v; }, configurable: true });
  root.MACHINE_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
