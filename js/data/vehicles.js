/* =========================================================
   Data / Vehicles (v5.0) : 乗り物と海路
   ・sailboat（小型帆船・第4章）: 今回実装。galleon（遠洋航海船・第8章）, airship（飛空艇・第14章）: 将来データ
   ・terrain: 乗ったまま進めるタイル名。landing: 乗ったまま隣の陸（通れるタイル）へ降りられる
   ・encounters: 乗船中のエンカウント（地域マップのゾーンではなく乗り物固有）
   ・SEA_ROUTES: 地域マップの端から別の地域へ（乗り物ごと移動）。edge: east/west/north/south
   ========================================================= */
(function (root) {
  'use strict';
  var VEHICLES = {
    sailboat: { id: 'sailboat', name: '小型帆船', unlockFlag: 'ship_ready', terrain: ['water', 'shallow'], landing: true, speedMul: 1.35,
      home: { map: 'world', x: 19, y: 72 },   // 港町マリナ西の海（ship_ready で出現）
      encounters: { rate: 0.03, zones: [{ name: '沿岸の海', test: function () { return true; }, groups: [['jelly_float', 'jelly_float'], ['reef_crab'], ['gull_pirate', 'gull_pirate'], ['sea_serpent'], ['reef_crab', 'jelly_float'], ['gull_pirate', 'jelly_float', 'jelly_float']], level: 9 }] },
      desc: '沿岸を航海できる小さな帆船。港町マリナの船乗りが修理した。' },
    galleon: { id: 'galleon', name: '遠洋航海船', unlockFlag: 'galleon_ready', terrain: ['water', 'shallow', 'deep'], landing: true, speedMul: 1.6, home: { map: 'world', x: 19, y: 72 },
      encounters: { rate: 0.03, zones: [
        { name: '外海', test: function (x, y, map) { return map && map.tiles[y][x] === 'deep'; }, groups: [['pirate_raider', 'pirate_raider'], ['storm_ray'], ['kraken_arm'], ['pirate_raider', 'gull_pirate', 'gull_pirate'], ['storm_ray', 'storm_ray'], ['kraken_arm', 'storm_ray']], level: 19 },
        { name: '沿岸の海', test: function () { return true; }, groups: [['sea_serpent'], ['reef_crab', 'reef_crab'], ['gull_pirate', 'gull_pirate', 'gull_pirate'], ['jelly_float', 'jelly_float', 'reef_crab'], ['sea_serpent', 'jelly_float']], level: 12 }
      ] },
      desc: '外海の海流を越えられる大型船。ナギの父の航路図をもとに、ヴェルムの鉄の竜骨で建造した。' },
    airship: { id: 'airship', name: '飛空艇', unlockFlag: 'airship_ready', terrain: ['*'], landing: true, speedMul: 2.2, future: true, home: { map: 'world', x: 40, y: 44 }, desc: '空を飛び、山脈を越える古代の船（第14章で解放予定）' }
  };
  // 海路：from の端に乗り物で到達すると to の反対側の端へ（y または x はそのまま、通れる海を探して着水）
  var SEA_ROUTES = [
    { vehicle: ['sailboat', 'galleon'], from: { map: 'world', edge: 'east' }, to: { map: 'world_grania', edge: 'west' }, name: '東の海路（グラニア鉱業地方へ）' },
    { vehicle: ['sailboat', 'galleon'], from: { map: 'world_grania', edge: 'west' }, to: { map: 'world', edge: 'east' }, name: '西の海路（アルカディア相場大陸へ）' },
    // v5.2: 遠洋航路（遠洋航海船のみ）
    { vehicle: ['galleon'], from: { map: 'world', edge: 'south' }, to: { map: 'world_islands', edge: 'north' }, name: '南の遠洋航路（断裂群島へ）' },
    { vehicle: ['galleon'], from: { map: 'world_islands', edge: 'north' }, to: { map: 'world', edge: 'south' }, name: '北の遠洋航路（アルカディア相場大陸へ）' },
    // v5.3: 時の神殿領へ（失われた航海図＝main_8 達成後）
    { vehicle: ['galleon'], from: { map: 'world_islands', edge: 'east' }, to: { map: 'world_tempus', edge: 'west' }, name: '東の遠洋航路（時の神殿領へ）', needFlag: 'yorn_letter_done' },
    { vehicle: ['galleon'], from: { map: 'world_tempus', edge: 'west' }, to: { map: 'world_islands', edge: 'east' }, name: '西の遠洋航路（断裂群島へ）' }
  ];
  root.VEHICLES = VEHICLES; root.SEA_ROUTES = SEA_ROUTES;
})(typeof window !== 'undefined' ? window : globalThis);
