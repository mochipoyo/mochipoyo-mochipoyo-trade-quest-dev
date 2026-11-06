/* =========================================================
   Data / Earth78 layout（v7.8）：地球に近い「未来の地球」の配置（3D 版の世界。2D 版は使わない＝セーブの戻しにだけ使う）
   ・図法：ミラー図法。1440×840 マス（経度 1° ＝ 4 マス）。左端は西経 169°（ベーリング海峡）。東西は一周する（右端の次は左端）。北緯 80°〜南緯 80°
   ・地域：40×30 マスの「ブロック」単位の長方形（rect: [左のブロック, 上のブロック, 幅, 高さ]）。地域のないブロックは「外の地図」（陸も海もある）
   ・pins：その地域の町・城・港・ダンジョンの入口の新しい場所（経度, 緯度）。旧座標 → 新座標の変換はこの対応から作る（js/rpg/earth78.js）
   ・gate：進入の条件（フラグ）。vehicles：入れる乗り物（徒歩は 'walk'）
   ・新しい地域（world_neon / world_meridian / world_nereia）は js/data/region78-*.js
   ========================================================= */
(function (root) {
  'use strict';
  var L = {
    VERSION: 'e78.4', W: 1440, H: 840, BW: 40, BH: 30, LON0: -169, LAT_N: 80,
    regions: {
      world: { rect: [15, 5, 3, 5], name: 'アルカディア相場大陸', area: '西グランメリア',
        // v7.8 e78.2：町どうしの歩く距離を前の地図と同じくらいに広げた（ポヨ村＝ロワール、リヴェル＝パリの北、港町マリナ＝ビスケー湾の海岸、迷いの森＝黒い森、ダウの村＝リヨンの西、忘却の洞窟＝ピレネーの北東、エマール峠＝フランドルの丘）
        // v7.9.2 e78.4：ポヨ村・リヴェル城・港町マリナのあいだをさらに広げた（歩いて 20 歩ほど → 30 歩あまり。ポヨ村＝アンジュー、リヴェル＝エノー、港町マリナ＝ビスケー湾の南の海岸、エマール峠＝ホラントの南。迷いの森・ダウの村・忘却の洞窟は少しだけ）
        pins: { poyo_village: [-0.6, 47.3], rivel_castle_town: [3.6, 50.7], lost_forest: [7.9, 48.1], dow_village: [4.6, 45.5], oblivion_cave: [2.6, 43.0], emal_pass: [4.5, 51.9], harbor: [-2.6, 43.4] },
        hills: [[4.9, 52.2, 1.4, 0.9]] },   // エマール山脈（[経度, 緯度, 半径（度）, 濃さ]）
      world_grania: { rect: [18, 7, 4, 2], name: 'グラニア鉱業地方', area: '長靴の半島と山の半島', gate: 'ship_ready',
        gateText: 'グラニアへは海から。（港町マリナの船を直してから）',
        // v7.9 e78.3：町どうしの歩く距離を前の地図と同じくらいに（イタリア半島は細くて町が近すぎたので、前の並びのままバルカン・ドナウ側へ広げた：灰の浜＝ダルマチアの海岸、灰鉱町ヴェルム＝バルカンの山地、灰の洞窟＝パンノニアの南、灰の峠の南口＝カルパチア、鉱山・砦＝ドナウの東）
        pins: { grania_pass_s: [23.7, 47.9], ash_shore: [17.3, 43.05], verum_town: [22.6, 41.9], ash_cave: [19.7, 45.9], iron_mine: [29.8, 46.9], iron_fort: [34.8, 47.9], sunken_reef: [25.4, 36.5], pirate_nest: [12.1, 37.9], ash_cape: [29.2, 43.0] },
        islets: ['sunken_reef', 'pirate_nest', 'ash_cape'], ash: true },
      world_kalion: { rect: [18, 4, 2, 3], name: 'カリオン徴収連邦', area: '中央グランメリア・灰の内海', gate: 'kalion_open',
        // v7.8 e78.2：前の地図の並びのまま広げた（カリオン市＝ポーランド中部、灰の峠の北口＝タトラ山地、セントラ＝バルト海の東岸）
        pins: { grania_pass_n: [20.6, 49.2], kalion_city: [20.6, 51.9], luxbell: [30.1, 50.4], asana_ruins: [11.6, 52.8], erased_village: [16.6, 54.5], secret_lab: [28.6, 54.1], sentra_capital: [22.9, 57.5] } },
      world_islands: { rect: [13, 8, 2, 3], name: '断裂群島', area: 'オルディス海・霧の島々', gate: 'galleon_ready', vehicles: ['galleon', 'airship'],
        oldMask: { s: 0.6, cx: 80, cy: 62, gx: 560, gy: 286 } },   // 架空の島々：旧地図の陸の形を縮めて置く（島・小島の分かれ方がそのまま）
      world_desert: { rect: [15, 10, 5, 2], name: 'リシア砂漠', area: '砂の海', gate: 'yorn_letter_done',
        // v7.9 e78.3：南北の間を広げた（前の地図より縦が詰まっていた。砂嵐の回廊の北口・南口を南東へ、蜃気楼の神殿を盆地の南東へ）
        pins: { sahar_city: [-2.0, 28.6], mirror_market: [6.0, 28.2], storm_north: [10.6, 25.8], storm_south: [10.6, 22.8], mirage_temple: [18.5, 17.4] },
        basin: { lon: 12, lat: 20.5, rx: 58, ry: 20 } },   // 南の「蜃気楼の盆地」：砂嵐の崖の輪で囲む（輪の中へは砂嵐の回廊だけ）
      world_tempus: { rect: [20, 9, 3, 3], name: '時の神殿領', area: '砂の王朝・砂の湾・二つの川', gate: 'yorn_letter_done',
        pins: { tempus_city: [31.6, 30.2], temple_of_time: [51.0, 34.4], volatilia: [46.7, 24.7], dimension_gate: [55.3, 23.4] } },
      world_magicka: { rect: [23, 9, 3, 4], name: 'マクディア魔導王国', area: '翠玉海の北岸', gate: 'zeromea_choice_done',
        pins: { magicka_city: [78.0, 19.0], forbidden_archive: [78.1, 25.6], tradia: [74.9, 13.3], origin_lab: [85.6, 20.3] } },   // v7.8 e78.2：デカン高原・ガンジス平原・カルナータカの海岸・オディシャへ広げた
      world_snow: { rect: [20, 2, 4, 4], name: '忘却の雪原', area: '北グランメリア・白海', gate: 'yorn_letter_done',
        pins: { ciel_port: [40.2, 64.7], frost_town: [45.5, 65.5], spirit_forest: [35.5, 67.3], frozen_tower: [62.0, 67.6] } },
      world_dragon: { rect: [26, 12, 5, 3], name: '竜炎火山群島', area: '竜脈の島々', gate: 'magicka_arrived',
        pins: { ignas_town: [100.6, -0.6], crater_altar: [101.6, 1.0], dragon_vein: [114.6, 0.4] }, islets: [] },
      world_dark: { rect: [16, 24, 4, 4], name: '暗黒大陸', area: 'ニヴェリス', gate: 'dark_route_open', vehicles: ['airship'],
        gateText: '暗黒大陸（ニヴェリス）は黒い嵐に包まれていて近づけない。（闇の空路が開いてから）', vtext: '黒い嵐が海を荒らしていて、船では近づけない。（飛空艇で空から）',
        pins: { demon_castle: [8.0, -71.6], void_wasteland: [8.0, -74.6], dark_camp: [8.0, -77.2] } },
      // 新しい地域（中身は js/data/region78-*.js）
      world_neon: { rect: [28, 7, 4, 4], name: '錆雨市ネオン・ドック', area: '東方の沿岸', gate: 'magicka_arrived', isNew: true,
        gateText: '東方の沖は酸の雨と霧に閉ざされている。（マクディア魔導王国に着いてから）' },
      world_meridian: { rect: [8, 7, 3, 3], name: '灰岸都市メリディアン', area: 'エルドラン東岸', gate: 'yorn_letter_done', isNew: true,
        gateText: 'エルドランの東岸は灰の嵐に閉ざされている。（断裂群島での用事を済ませると通れる）' },
      world_nereia: { rect: [14, 13, 2, 3], name: '環潮大陸ネレイア', area: 'オルディス海・赤道', gate: 'galleon_ready', vehicles: ['galleon', 'airship'], isNew: true,
        gateText: 'ネレイアの外礁は荒波が砕けている。（遠洋航海船が必要）', vtext: '外礁の荒波で、この船では近づけない。（遠洋航海船で外礁の切れ目を抜けよう）' }
    },
    // 地域の境目の山並み（陸だけ）：[地域 a, 地域 b, 文字]。v7.8 では使わない（進入の条件で止める。まっすぐな山並みが地図に出ないように）
    walls: [],
    // 地域の雰囲気（灰・雪・火山・暗黒の地）：入口のまわりに、ゆらぎのある形で広がる（地域の長方形の外の地図にも同じように）。[地域, 広がり（マス）]
    themes: [['world_grania', 26], ['world_tempus', 34], ['world_snow', 34], ['world_dragon', 24], ['world_dark', 44]],
    sail: ['world', 'world_grania'],   // 小型帆船で出られる地図（その地域と、いちばん近い地域がそこである外の地図）
    // 浮天城アエリアの影が落ちる海（太平洋の上空。アストラ号で接舷）
    aeria: { lon: -152, lat: 21, r: 7 },
    // 前の版の配置（セーブの引き継ぎ：その版の地球の座標 → 旧座標 → いまの地球の座標）。ここにない地域は前の版と同じ
    prev: { 'e78.3': {   // v7.9.2：e78.3 のアルカディアの配置（ほかの地域は e78.3 と同じ）
      world: { pins: { poyo_village: [0.1, 47.1], rivel_castle_town: [2.6, 49.0], lost_forest: [7.6, 48.0], dow_village: [4.4, 45.3], oblivion_cave: [2.9, 43.2], emal_pass: [4.2, 50.9], harbor: [-1.1, 44.0] } } },
      'e78.2': {   // v7.9：e78.2 のグラニア・リシア砂漠・アルカディアの配置（アルカディアは e78.3 と同じ。ほかの地域は e78.2 と同じ）
      world: { pins: { poyo_village: [0.1, 47.1], rivel_castle_town: [2.6, 49.0], lost_forest: [7.6, 48.0], dow_village: [4.4, 45.3], oblivion_cave: [2.9, 43.2], emal_pass: [4.2, 50.9], harbor: [-1.1, 44.0] } },
      world_grania: { pins: { grania_pass_s: [11.6, 45.4], ash_shore: [11.3, 42.5], verum_town: [14.7, 41.0], ash_cave: [13.2, 42.8], iron_mine: [18.4, 44.2], iron_fort: [21.4, 45.0], sunken_reef: [25.4, 36.5], pirate_nest: [12.1, 37.9], ash_cape: [29.2, 43.0] } },
      world_desert: { pins: { sahar_city: [-2.0, 28.6], mirror_market: [6.0, 28.2], storm_north: [9.6, 27.0], storm_south: [9.6, 24.0], mirage_temple: [15.5, 20.2] } } },
      'e78.1': {
      world_grania: { pins: { grania_pass_s: [11.6, 45.4], ash_shore: [11.3, 42.5], verum_town: [14.7, 41.0], ash_cave: [13.2, 42.8], iron_mine: [18.4, 44.2], iron_fort: [21.4, 45.0], sunken_reef: [25.4, 36.5], pirate_nest: [12.1, 37.9], ash_cape: [29.2, 43.0] } },
      world_desert: { pins: { sahar_city: [-2.0, 28.6], mirror_market: [6.0, 28.2], storm_north: [9.6, 27.0], storm_south: [9.6, 24.0], mirage_temple: [15.5, 20.2] } },
      world: { pins: { poyo_village: [0.3, 46.6], rivel_castle_town: [2.3, 48.8], lost_forest: [5.4, 47.4], dow_village: [4.8, 45.6], oblivion_cave: [1.0, 43.4], emal_pass: [1.0, 50.3], harbor: [-1.1, 45.4] } },
      world_kalion: { pins: { grania_pass_n: [12.2, 49.4], kalion_city: [14.0, 51.0], luxbell: [19.8, 50.2], asana_ruins: [11.9, 52.2], erased_village: [13.6, 53.6], secret_lab: [21.5, 54.2], sentra_capital: [17.4, 54.5] } },
      world_magicka: { pins: { magicka_city: [77.6, 17.6], forbidden_archive: [77.2, 23.1], tradia: [74.2, 15.6], origin_lab: [82.6, 20.6] } } } },
    order: ['world', 'world_grania', 'world_kalion', 'world_islands', 'world_nereia', 'world_desert', 'world_tempus', 'world_meridian', 'world_snow', 'world_magicka', 'world_dragon', 'world_neon', 'world_dark']
  };
  var R = L.W / (2 * Math.PI);
  function Yf(lat) { return 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180)); }
  var YMAX = Yf(L.LAT_N);
  L.xOf = function (lon) { var d = lon - L.LON0; d = ((d % 360) + 360) % 360; return d * L.W / 360; };
  L.yOf = function (lat) { return (YMAX - Yf(lat)) * R; };
  L.latOf = function (y) { var v = YMAX - y / R; return (Math.atan(Math.exp(v / 1.25)) - Math.PI / 4) / 0.4 * 180 / Math.PI; };
  L.lonOf = function (x) { var l = L.LON0 + x * 360 / L.W; return l > 180 ? l - 360 : l; };
  L.tile = function (lon, lat) { return { x: Math.floor(L.xOf(lon)), y: Math.floor(L.yOf(lat)) }; };
  L.rectOf = function (id) { var r = L.regions[id] && L.regions[id].rect; return r ? { x: r[0] * L.BW, y: r[1] * L.BH, w: r[2] * L.BW, h: r[3] * L.BH } : null; };
  root.EARTH78_LAYOUT = L;
})(typeof window !== 'undefined' ? window : globalThis);
