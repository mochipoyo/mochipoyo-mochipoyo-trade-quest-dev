/* =========================================================
   Data / Location designs (v6.2) : 町・城・施設ごとの固有の外観（2D の地図の建物絵と 3D の建物の両方から読む）
   ・1件 = 1つの場所（地域マップの LOCATIONS の id）。色違いではなく、形（silhouette）・屋根・塔・装飾・入口・周りの環境を変える
     architectureStyle：建築様式（説明） / silhouette：建物の形（js/core/landmarks.js の組み立て方） / materials：建材の色と質感
     roofStyle：屋根の形 / decoration：固有の装飾 / environment：周りの環境 / entrance：入口（＝ワープのマス。絵の下中央に来る）
     unlockAppearance：物語の進行で変わる見た目（flag が立つと set の内容で上書き）
   ・3D 版（three-src）は materials.roof3d / wall3d / roofStyle を読む（今は3D化した地図＝ポヨ村のみ）
   ・ランダムな色ではなく、場所ごとに固定。描画キャッシュは場所ごと（id と進行状態）に分ける
   ========================================================= */
(function (root) {
  'use strict';
  var D = {};
  function L(id, o) { o.id = id; D[id] = o; }
  /* ---------- アルカディア相場大陸 ---------- */
  L('poyo_village', { architectureStyle: '木造の農家・茅葺き屋根', silhouette: 'farm_village', roofStyle: 'thatch',
    materials: { wall: '#e8d2a6', wallD: '#c4a676', wood: '#7a4f2a', roof: '#d8b25a', roofD: '#a8823a', accent: '#e86a6a', roof3d: { default: '#c8a24e', church: '#8a6a3a', dojo: '#5a7a9a' }, thatch3d: true },
    decoration: ['flowerbeds', 'scarecrow'], environment: ['fields', 'well', 'fence', 'broadleaf'] });
  L('rivel_castle_town', { architectureStyle: '白い石の城郭都市・青い尖塔の王城', silhouette: 'castle_town', roofStyle: 'spire',
    materials: { wall: '#eef0f6', wallD: '#b6bccc', mortar: '#c8ccd8', roof: '#3f6fc8', roofD: '#2a4c94', accent: '#f0c84a', banner: '#3f6fc8' },
    decoration: ['crest', 'banners', 'spires5'], environment: ['moat', 'road'] });
  L('dow_village', { architectureStyle: '巨木と吊り橋・森に溶け込む木の家', silhouette: 'tree_village', roofStyle: 'leaf',
    materials: { wall: '#a8784a', wallD: '#7a5230', wood: '#6a4426', roof: '#4f8a3a', roofD: '#2f5a26', accent: '#e8c86a' },
    decoration: ['rope_bridge', 'lanterns'], environment: ['giant_tree', 'forest'] });
  L('harbor', { architectureStyle: '灯台と倉庫の港町・海辺の市場', silhouette: 'port_town', roofStyle: 'gable',
    materials: { wall: '#f2e6cc', wallD: '#c8b490', wood: '#7a5530', roof: '#d0603a', roofD: '#9a4026', stripe: '#d83a3a', accent: '#3a8ad8' },
    decoration: ['lighthouse', 'awnings', 'nets'], environment: ['pier', 'boats', 'sea'] });
  L('lost_forest', { architectureStyle: '絡み合う木々のアーチ', silhouette: 'forest_arch', roofStyle: 'none', materials: { wood: '#5a3a22', leaf: '#2f6a2e', leafL: '#4f8f3a', glow: '#bfffa0' }, decoration: ['wisps'], environment: ['forest'] });
  L('oblivion_cave', { architectureStyle: '木枠で補強した岩の洞窟', silhouette: 'cave', roofStyle: 'none', materials: { rock: '#8c8478', rockL: '#b4ab9c', rockD: '#5e574e', wood: '#6a4426', glow: '#ff9a3a' }, decoration: ['torches', 'timber'], environment: ['rocks'] });
  L('emal_pass', { architectureStyle: '山あいの峠道', silhouette: 'mountain_pass', roofStyle: 'none', materials: { rock: '#8a7e70', rockL: '#b6aa98', rockD: '#5a5248', snow: '#f4f6ff', wood: '#6a4426' }, decoration: ['signpost'], environment: ['peaks'] });
  /* ---------- グラニア鉱業地方 ---------- */
  L('verum_town', { architectureStyle: '黒ずんだ石造りの工業都市・煙突と製鉄所', silhouette: 'industrial_town', roofStyle: 'sawtooth',
    materials: { wall: '#6e6470', wallD: '#4a424e', mortar: '#3a343e', roof: '#4a3a3a', roofD: '#2e2424', metal: '#7a7a86', glow: '#ff8a2a', smoke: 'rgba(70,64,72,0.75)' },
    decoration: ['smokestacks4', 'furnace', 'chains'], environment: ['rails', 'slag'],
    unlockAppearance: [{ flag: 'verum_liberated', set: { smoke: 'rgba(170,170,180,0.45)', banner: '#3aa060', liberated: true, decorationAdd: ['school_flag'], note: '解放後：煙が薄くなり、自治会の旗' } }] });
  L('iron_mine', { architectureStyle: '鉱山鉄道の坑道入口', silhouette: 'mine', roofStyle: 'none', materials: { rock: '#6a5e58', rockL: '#8e827a', rockD: '#3e3632', wood: '#5a3a24', metal: '#8a8a96', glow: '#ffb04a' }, decoration: ['minecart', 'rails'], environment: ['ore'] });
  L('ash_shore', { architectureStyle: '浜辺の見張り小屋', silhouette: 'shore_hut', roofStyle: 'shed', materials: { wall: '#9a8a76', wallD: '#6e6052', wood: '#5a3a24', roof: '#5a5a6a', roofD: '#3a3a4a', glow: '#ffcc66' }, decoration: ['lantern'], environment: ['beach', 'pier'],
    unlockAppearance: [{ flag: 'verum_supply_done', set: { lit: true, note: '物資が届いたあと：浜に灯り' } }] });
  L('iron_fort', { architectureStyle: '鉄壁と巨大な歯車の軍事要塞', silhouette: 'iron_fortress', roofStyle: 'spike',
    materials: { wall: '#4a4a56', wallD: '#2a2a34', metal: '#7a7a88', rivet: '#a8a8b8', roof: '#1e1e26', glow: '#ff5a2a', chain: '#8a8a96' },
    decoration: ['giant_gear', 'chains', 'black_spires3', 'rivets'], environment: ['slag', 'spikes'] });
  L('grania_pass_s', { architectureStyle: '灰の積もる峠の関門', silhouette: 'mountain_pass', roofStyle: 'none', materials: { rock: '#7a7076', rockL: '#a49aa0', rockD: '#4a4248', snow: '#b8b0b4', wood: '#5a3a24' }, decoration: ['signpost', 'gatepost'], environment: ['ash'] });
  L('ash_cave', { architectureStyle: '灰色の岩と噴気孔の洞窟', silhouette: 'vent_cave', roofStyle: 'none', materials: { rock: '#6a6470', rockL: '#948e98', rockD: '#3e3a44', glow: '#ff7a3a', smoke: 'rgba(150,140,150,0.6)' }, decoration: ['vents'], environment: ['ash'] });
  L('sunken_reef', { architectureStyle: '岩礁に乗り上げた沈没船', silhouette: 'wreck', roofStyle: 'none', materials: { wood: '#5a3e26', woodL: '#8a6440', rock: '#5a6470', rockL: '#8a96a0', sail: '#d8d0b8' }, decoration: ['mast', 'barnacles'], environment: ['sea', 'reef'] });
  L('pirate_nest', { architectureStyle: '高床の小屋が並ぶ海賊の根城', silhouette: 'stilt_shacks', roofStyle: 'shed', materials: { wall: '#7a5a3a', wallD: '#5a3e26', wood: '#4a3020', roof: '#6a4a2a', roofD: '#4a301a', flag: '#1a1a1a', accent: '#f4f4f4' }, decoration: ['skull_flag', 'barrels'], environment: ['sea', 'stilts'] });
  L('ash_cape', { architectureStyle: '岬の小さな祠', silhouette: 'cape_shrine', roofStyle: 'gable', materials: { wall: '#a49a90', wallD: '#7a7066', roof: '#5a4a6a', roofD: '#3a2e48', rock: '#6e6670', rockL: '#9a929c', glow: '#ffd27a' }, decoration: ['stone_lantern'], environment: ['cliff', 'sea'] });
  /* ---------- カリオン徴収連邦 ---------- */
  L('kalion_city', { architectureStyle: '巨大な税務庁舎と監視塔の行政都市', silhouette: 'admin_city', roofStyle: 'flat',
    materials: { wall: '#b8b2a6', wallD: '#86806f', mortar: '#9a9484', roof: '#5a5650', roofD: '#3a3832', accent: '#c8a24a', banner: '#7a2a2a' },
    decoration: ['watchtowers2', 'columns', 'seal_banner'], environment: ['plaza'],
    unlockAppearance: [{ flag: 'kalion_reformed', set: { banner: '#3a8a5a', note: '財産返還令のあと：旗が自治組織の緑に' } }] });
  L('sentra_capital', { architectureStyle: '大宮殿と大理石の柱・官庁街の王都', silhouette: 'capital', roofStyle: 'dome',
    materials: { wall: '#f4f0e6', wallD: '#c8c0ac', mortar: '#d8d2c2', roof: '#3a6a9a', roofD: '#244a72', accent: '#e8c040', banner: '#8a2a3a' },
    decoration: ['palace_dome', 'marble_columns', 'ministries', 'high_walls'], environment: ['avenue'],
    unlockAppearance: [{ flag: 'sevran_fallen', set: { banner: '#3a6a9a', note: '大宰相が倒れたあと：旗の色が変わる' } }] });
  L('grania_pass_n', { architectureStyle: '連邦側の峠の関所', silhouette: 'mountain_pass', roofStyle: 'none', materials: { rock: '#7a7468', rockL: '#a69e90', rockD: '#4c463e', snow: '#e8ecf4', wood: '#5a3a24' }, decoration: ['gatepost', 'banner'], environment: ['peaks'] });
  L('erased_village', { architectureStyle: '色あせて消えかけた村', silhouette: 'faded_village', roofStyle: 'gable', materials: { wall: '#c8c4cc', wallD: '#9a96a2', roof: '#8a86a0', roofD: '#6a6680', wood: '#7a7280' }, decoration: ['fade'], environment: ['mist'] });
  L('secret_lab', { architectureStyle: '岩山に埋め込まれた研究所', silhouette: 'bunker', roofStyle: 'none', materials: { rock: '#7a7468', rockL: '#a49c90', rockD: '#4c463e', metal: '#8a96a0', glow: '#7ae8ff' }, decoration: ['pipes', 'vault_door'], environment: ['rocks'] });
  L('luxbell', { architectureStyle: '金色の塔とネオンの娯楽都市', silhouette: 'casino_city', roofStyle: 'dome',
    materials: { wall: '#3a2a4a', wallD: '#24182e', roof: '#e8c040', roofD: '#b08a20', accent: '#ff4aa8', glow: '#ffd84a', neon: '#4ae8ff' }, decoration: ['neon', 'roulette_sign', 'gold_towers'], environment: ['plaza'] });
  /* ---------- 断裂群島 ---------- */
  L('aruna_village', { architectureStyle: '荒れた石の家を直した生存者の村', silhouette: 'survivor_village', roofStyle: 'patched',
    materials: { wall: '#9a948a', wallD: '#6e685e', wood: '#6a4a2e', roof: '#7a6a5a', roofD: '#54483c', patch: '#a8743a', glow: '#ffcc66' }, decoration: ['patches', 'laundry'], environment: ['rubble', 'beach'],
    unlockAppearance: [{ flag: 'lighthouse_lit', set: { lit: true, note: '灯台に灯りが戻ったあと：家々に明かり' } }] });
  L('aruna_ruins', { architectureStyle: '崩れた石造りの街と時計塔', silhouette: 'ruins', roofStyle: 'broken', materials: { wall: '#8a8478', wallD: '#5e584e', mortar: '#6e685e', roof: '#5a5048', moss: '#5a7a4a' }, decoration: ['broken_clock', 'ivy'], environment: ['rubble'] });
  L('aruna_lighthouse', { architectureStyle: '紅白の灯台', silhouette: 'lighthouse', roofStyle: 'cone', materials: { wall: '#f0ece4', wallD: '#c8c0b4', stripe: '#c83a3a', roof: '#3a3a4a', glow: '#fff2a0' }, decoration: ['lamp'], environment: ['cliff', 'sea'],
    unlockAppearance: [{ flag: 'lighthouse_lit', set: { lit: true, note: '灯りを戻したあと：灯室が光る' } }] });
  L('mist_isle', { architectureStyle: '霧に包まれた岩の島', silhouette: 'mist_rocks', roofStyle: 'none', materials: { rock: '#6e7684', rockL: '#9aa2b0', rockD: '#464e5a', mist: 'rgba(230,236,246,0.6)' }, decoration: ['fog'], environment: ['sea'] });
  /* ---------- 時の神殿領 ---------- */
  L('tempus_city', { architectureStyle: '巨大な時計塔と鐘楼・古代の石造建築', silhouette: 'clock_city', roofStyle: 'pyramid',
    materials: { wall: '#d8c8a0', wallD: '#a8946a', mortar: '#b8a47a', roof: '#6a4a8a', roofD: '#4a3266', accent: '#e8c040', clock: '#f8f0d8' }, decoration: ['giant_clock', 'bell_towers2', 'gears'], environment: ['road'] });
  L('temple_of_time', { architectureStyle: '列柱と階段の古代神殿', silhouette: 'temple', roofStyle: 'pediment', materials: { wall: '#e8e0c8', wallD: '#b8ac90', roof: '#c8b890', roofD: '#9a8a68', accent: '#e8c040', glow: '#c8e0ff' }, decoration: ['columns6', 'hourglass'], environment: ['stairs'] });
  L('dimension_gate', { architectureStyle: '光が渦を巻く石の環', silhouette: 'portal', roofStyle: 'none', materials: { stone: '#a8a2b8', stoneL: '#d0cce0', stoneD: '#6e6884', glow: '#8ae0ff', glow2: '#c88aff' }, decoration: ['runes'], environment: ['stones'] });
  L('volatilia', { architectureStyle: '天文台と図書館の学院', silhouette: 'academy', roofStyle: 'dome', materials: { wall: '#e4dcd0', wallD: '#b4aa98', roof: '#4a5a8a', roofD: '#2e3a62', accent: '#e8c040', glow: '#a8d8ff' }, decoration: ['observatory', 'arch_gate', 'banners'], environment: ['lawn'] });
  /* ---------- ゼロメア ---------- */
  L('node_city', { architectureStyle: '白い幾何学建築と発光する回路の未来都市', silhouette: 'future_city', roofStyle: 'dome',
    materials: { wall: '#f0f4f8', wallD: '#b8c4d0', roof: '#dfe8f2', roofD: '#a8b8c8', glow: '#4ae8ff', accent: '#ff4a6a' }, decoration: ['circuits', 'watch_tower', 'domes'], environment: ['grid'],
    unlockAppearance: [{ flag: 'zeromea_reformed', set: { glow: '#ffd27a', note: '統治の再設計のあと：回路の光がやわらかい色に' } }] });
  L('scheduled_district', { architectureStyle: 'まったく同じ白い住居が並ぶ区画', silhouette: 'uniform_blocks', roofStyle: 'flat', materials: { wall: '#e8ecf0', wallD: '#b0b8c4', roof: '#c8d0dc', glow: '#7ae0ff' }, decoration: ['numbers'], environment: ['grid'] });
  L('old_city', { architectureStyle: '崩れかけた高層の旧都市', silhouette: 'old_city', roofStyle: 'broken', materials: { wall: '#8a8e96', wallD: '#5a5e66', glow: '#6ad8a0', moss: '#4a6a4a' }, decoration: ['broken_windows'], environment: ['rubble'] });
  L('auto_factory', { architectureStyle: 'のこぎり屋根と搬送路の自動工場', silhouette: 'factory', roofStyle: 'sawtooth', materials: { wall: '#c8ccd4', wallD: '#8e94a0', roof: '#6a7080', roofD: '#4a5060', metal: '#9aa2b0', glow: '#ff4a4a' }, decoration: ['conveyor', 'warning_light'], environment: ['grid'] });
  L('gate_back', { architectureStyle: '帰り道の石の環', silhouette: 'portal', roofStyle: 'none', materials: { stone: '#9aa2b0', stoneL: '#c8d0dc', stoneD: '#646c7a', glow: '#ffd27a', glow2: '#8ae0ff' }, decoration: ['runes', 'tech_frame'], environment: ['grid'] });
  /* ---------- マクディア魔導王国 ---------- */
  L('magicka_city', { architectureStyle: '魔法の結晶と浮遊する建築・光る魔法塔', silhouette: 'arcane_city', roofStyle: 'spire',
    materials: { wall: '#4a3a6a', wallD: '#2e2448', roof: '#6a4ab0', roofD: '#43307a', crystal: '#9ad8ff', crystal2: '#d08aff', glow: '#b88aff' }, decoration: ['crystals', 'floating_houses', 'magic_towers3'], environment: ['runes'] });
  L('forbidden_archive', { architectureStyle: '封印の紋章を刻んだ書庫塔', silhouette: 'archive_tower', roofStyle: 'pyramid', materials: { wall: '#5a4a6a', wallD: '#3a2e48', roof: '#2e2440', roofD: '#1e1830', glow: '#ff8aa8', accent: '#e8c040' }, decoration: ['seal', 'book_windows'], environment: ['hill'] });
  L('origin_lab', { architectureStyle: '丘に埋まった古い実験施設', silhouette: 'bunker', roofStyle: 'none', materials: { rock: '#6a6478', rockL: '#948ea2', rockD: '#423c50', metal: '#a8a0c0', glow: '#b88aff' }, decoration: ['pipes', 'vault_door', 'crystal_core'], environment: ['rocks'] });
  /* ---------- 天空群島 ---------- */
  L('star_tower', { architectureStyle: '望遠鏡のドームを載せた観測塔', silhouette: 'observatory', roofStyle: 'dome', materials: { wall: '#e8ecf6', wallD: '#aab2c8', roof: '#3a4a8a', roofD: '#24305e', metal: '#c8ccd8', glow: '#ffe88a' }, decoration: ['telescope', 'stars'], environment: ['clouds'] });
  L('star_camp', { architectureStyle: '焚き火を囲むテントの野営地', silhouette: 'camp', roofStyle: 'tent', materials: { cloth: '#d8c8a0', clothD: '#a89870', cloth2: '#8aa0c8', wood: '#6a4a2e', glow: '#ffb04a' }, decoration: ['campfire', 'flag'], environment: ['clouds'] });
  L('sky_temple', { architectureStyle: '雲上の白い神殿・金の装飾・浮かぶ石柱', silhouette: 'sky_temple', roofStyle: 'pediment', materials: { wall: '#f8f8ff', wallD: '#c8ccdc', roof: '#f0e6c0', roofD: '#c8b880', accent: '#e8c040', glow: '#fff4c0' }, decoration: ['floating_pillars', 'gold_trim'], environment: ['clouds'] });
  /* ---------- 暗黒大陸 ---------- */
  L('dark_camp', { architectureStyle: '柵と天幕の前線基地', silhouette: 'war_camp', roofStyle: 'tent', materials: { cloth: '#6a5a4a', clothD: '#4a3e32', cloth2: '#5a6a7a', wood: '#4a3424', glow: '#ff8a3a', banner: '#3a6a9a' }, decoration: ['barricade', 'banners', 'campfire'], environment: ['darkland'] });
  L('void_wasteland', { architectureStyle: '裂けた大地と紫の霧', silhouette: 'void_rift', roofStyle: 'none', materials: { rock: '#3a3048', rockL: '#5a4a6e', rockD: '#1e1828', glow: '#b84aff', mist: 'rgba(150,90,200,0.45)' }, decoration: ['rift'], environment: ['darkland'] });
  L('demon_castle', { architectureStyle: '黒曜石の城壁・禍々しい巨大尖塔・赤黒く光る城門', silhouette: 'demon_castle', roofStyle: 'spike',
    materials: { wall: '#2a2230', wallD: '#16121a', mortar: '#3e3446', roof: '#1a1420', roofD: '#0e0a12', glow: '#ff2a3a', glow2: '#8a1a2a' }, decoration: ['giant_spires', 'red_gate', 'skull_crest'], environment: ['darkland', 'lava_cracks'],
    unlockAppearance: [{ flag: 'game_cleared', set: { glow: '#8aa0c8', glow2: '#4a5a7a', note: 'クリア後：赤い光が消え、静かな青に' } }] });
  /* ---------- リシア砂漠 ---------- */
  L('sahar_city', { architectureStyle: '砂岩の大ドームとアーチ門・砂漠の市場', silhouette: 'desert_city', roofStyle: 'dome', materials: { wall: '#e4c48c', wallD: '#b8945a', mortar: '#c8a46a', roof: '#3a8ab8', roofD: '#24628a', accent: '#d8743a', cloth: '#c83a3a' }, decoration: ['big_dome', 'minarets2', 'arch_gate', 'awnings'], environment: ['palms', 'dunes'] });
  L('mirror_market', { architectureStyle: '鏡がきらめく天幕の市場', silhouette: 'bazaar', roofStyle: 'tent', materials: { cloth: '#d84a6a', clothD: '#a8344e', cloth2: '#4a8ad8', cloth3: '#e8b83a', wood: '#7a5a30', glint: '#ffffff' }, decoration: ['mirrors', 'awnings'], environment: ['dunes', 'palms'] });
  L('storm_north', { architectureStyle: '砂嵐が吹き抜ける岩の回廊', silhouette: 'sand_canyon', roofStyle: 'none', materials: { rock: '#c49a62', rockL: '#e4c08a', rockD: '#8a6a3e', sand: 'rgba(230,200,140,0.55)' }, decoration: ['sand_swirl'], environment: ['dunes'] });
  L('storm_south', { architectureStyle: '砂嵐の回廊の南の出口', silhouette: 'sand_canyon', roofStyle: 'none', materials: { rock: '#b8905a', rockL: '#dab480', rockD: '#7e6036', sand: 'rgba(230,200,140,0.55)' }, decoration: ['sand_swirl', 'bones'], environment: ['dunes'] });
  L('mirage_temple', { architectureStyle: '砂から現れる古代遺跡・黄金の塔', silhouette: 'mirage_temple', roofStyle: 'pyramid', materials: { wall: '#d8b46a', wallD: '#a8843e', roof: '#f0c840', roofD: '#c09a20', accent: '#3ad8c8', glow: '#ffe88a' }, decoration: ['gold_tower', 'hieroglyphs', 'shimmer'], environment: ['dunes'] });
  /* ---------- 竜炎火山群島 ---------- */
  L('ignas_town', { architectureStyle: '溶岩の水路と巨大な炉・鉄骨の建物・炎の煙突', silhouette: 'forge_town', roofStyle: 'iron', materials: { wall: '#4a3a36', wallD: '#2e2420', metal: '#6a6a76', roof: '#3a3034', roofD: '#221c1e', glow: '#ff6a1a', lava: '#ff8a2a' }, decoration: ['great_furnace', 'flame_chimneys3', 'girders'], environment: ['lava_channels'] });
  L('crater_altar', { architectureStyle: '火口のふちの石の祭壇', silhouette: 'altar', roofStyle: 'none', materials: { stone: '#6a5a58', stoneL: '#948480', stoneD: '#3e3432', glow: '#ff5a1a', lava: '#ff8a2a' }, decoration: ['brazier', 'dragon_horns'], environment: ['crater'] });
  L('dragon_vein', { architectureStyle: '赤い竜脈が光る洞窟', silhouette: 'vein_cave', roofStyle: 'none', materials: { rock: '#4a3a3a', rockL: '#6e5a58', rockD: '#2a2020', glow: '#ff4a2a' }, decoration: ['veins'], environment: ['ash'] });
  /* ---------- 忘却の雪原 ---------- */
  L('ciel_port', { architectureStyle: '雪に覆われた港・氷の灯台・寒冷地の木造建築', silhouette: 'snow_port', roofStyle: 'steep', materials: { wall: '#8a5a3a', wallD: '#5e3c26', wood: '#5a3a24', roof: '#3a5a7a', roofD: '#24405a', ice: '#bfe8ff', glow: '#c8f0ff' }, decoration: ['ice_lighthouse', 'icicles'], environment: ['snow', 'pier', 'ice_sea'] });
  L('frost_town', { architectureStyle: '冬の石造都市・記憶の結晶・静かな市場', silhouette: 'winter_city', roofStyle: 'steep', materials: { wall: '#b8bcc8', wallD: '#848a9a', mortar: '#9aa0ae', roof: '#4a5070', roofD: '#2e344c', crystal: '#a8e0ff', glow: '#d8f4ff' }, decoration: ['memory_crystals', 'quiet_stalls'], environment: ['snow'] });
  L('spirit_forest', { architectureStyle: '精霊の光が漂う雪の森', silhouette: 'spirit_forest', roofStyle: 'none', materials: { wood: '#4a3a2e', leaf: '#2f5a4a', leafL: '#4a7a66', snow: '#ffffff', glow: '#bff4ff' }, decoration: ['spirit_lights'], environment: ['snow', 'pines'] });
  L('frozen_tower', { architectureStyle: '氷に覆われた巨大時計塔・止まった針', silhouette: 'frozen_clock', roofStyle: 'spire', materials: { wall: '#a8c4dc', wallD: '#6e8aa8', ice: '#dff4ff', roof: '#4a6a9a', roofD: '#2e4a72', clock: '#e8f6ff', glow: '#bfe8ff' }, decoration: ['stopped_clock', 'icicles'], environment: ['snow'],
    unlockAppearance: [{ flag: 'clock_warden_defeated', set: { moving: true, glow: '#ffe8a0', note: '時計の番人を倒したあと：針が動き、灯りが暖かく' } }] });

  /* ---------- API ---------- */
  var LocationDesign = { DESIGNS: D };
  LocationDesign.get = function (id) { return D[id] || null; };
  LocationDesign.all = function () { return Object.keys(D).map(function (k) { return D[k]; }); };
  // 物語の進行を反映した見た目（unlockAppearance を適用したコピー）と、その状態のキー（キャッシュ用）
  LocationDesign.resolve = function (id, flags) {
    var d = D[id]; if (!d) return null; flags = flags || {}; var on = (d.unlockAppearance || []).filter(function (u) { return flags[u.flag]; });
    if (!on.length) return { design: d, key: id + ':base' };
    var m = {}; for (var k in d.materials) m[k] = d.materials[k]; var dec = (d.decoration || []).slice(); var extra = {};
    on.forEach(function (u) { for (var k2 in u.set) { if (k2 === 'decorationAdd') dec = dec.concat(u.set[k2]); else if (k2 === 'note') continue; else if (k2 in m) m[k2] = u.set[k2]; else extra[k2] = u.set[k2]; } });
    var out = {}; for (var k3 in d) out[k3] = d[k3]; out.materials = m; out.decoration = dec; for (var k4 in extra) out[k4] = extra[k4];
    return { design: out, key: id + ':' + on.map(function (u) { return u.flag; }).join('+') };
  };
  // 地図（町・建物の中）から、その場所のデザイン（3D の建物用）
  LocationDesign.forMap = function (mapId) {
    var defs = root.MAP_DEFS || {}; var hit = null;
    Object.keys(defs).some(function (k) { var df = defs[k]; if (!df.region || !df.locations) return false; return df.locations.some(function (Lc) { if (Lc.to === mapId && D[Lc.id]) { hit = D[Lc.id]; return true; } return false; }); });
    return hit;
  };
  // entrance：入口の座標と向き。地域マップの場所（LOCATIONS）から取る（絵の下中央＝そのマス。門・洞窟の口は南向き＝下側に描く）
  Object.keys(root.MAP_DEFS || {}).forEach(function (rid) { var df = root.MAP_DEFS[rid]; if (!df.region || !df.locations) return; df.locations.forEach(function (Lc) { var d = D[Lc.id]; if (d) d.entrance = { map: rid, x: Lc.x, y: Lc.y, face: 'south', to: Lc.to }; }); });
  root.LocationDesign = LocationDesign; root.LOCATION_DESIGNS = D;
})(typeof window !== 'undefined' ? window : globalThis);
