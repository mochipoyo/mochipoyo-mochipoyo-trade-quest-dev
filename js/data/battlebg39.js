/* =========================================================
   Data / 39ダンジョンの戦闘背景（2026-11-04 ご提供の画像パック「TradeQuest_Battle_Backgrounds_39」）
   ・画像：assets/battle-backgrounds/dungeons39/（39枚・1672×941・WebP。描き直し・拡大はしていない）
   ・対応：マップIDの完全一致だけ（パックの dungeon-backgrounds.json と同じ 116 マップ。名前や似た ID からの推測はしない）
     同じエリアの階・隠し区画は同じ1枚。対応の正本は docs/battle-backgrounds-dungeons39.json（tools/check-battle-backgrounds.js で一致を確認）
   ・使う所：js/ui/battlebg65.js（BattleBG65.infoFor が、ダンジョン（kind が dungeon）にいて乗り物に乗っていないときだけ選ぶ）
   ・horizon：画像の中で床が奥の景色に接する高さ（画像の高さに対する割合）。3D版の「3Dの景色」で遠景の板の地平線を合わせる（目で見て決めた値）
   ・ground（手前・奥）・fog：3D版の「3Dの景色」で、3Dの地面と遠くの霧の色を絵に合わせる（画像の床の手前・地平線のすぐ下・すぐ上の平均の色。画像から自動で出した値）
   ========================================================= */
(function (root) {
  'use strict';
  root.BATTLE_BG39 = {
    version: 1, dir: 'dungeons39/',
    files: {
    "d39_emal_pass": "dungeons39/01_emal_pass.webp", "d39_bandit_hideout": "dungeons39/02_bandit_hideout.webp",
    "d39_verum_hideout": "dungeons39/03_verum_hideout.webp", "d39_iron_fort_gate": "dungeons39/04_iron_fort_gate.webp",
    "d39_iron_mine": "dungeons39/05_iron_mine.webp", "d39_grania_pass": "dungeons39/06_grania_pass.webp",
    "d39_ash_cave": "dungeons39/07_ash_cave.webp", "d39_sunken_reef": "dungeons39/08_sunken_reef.webp",
    "d39_pirate_nest": "dungeons39/09_pirate_nest.webp", "d39_ash_cape": "dungeons39/10_ash_cape.webp",
    "d39_kalion_archive": "dungeons39/11_kalion_archive.webp", "d39_kalion_lab": "dungeons39/12_kalion_lab.webp",
    "d39_sentra_palace": "dungeons39/13_sentra_palace.webp", "d39_aruna_clocktower": "dungeons39/14_aruna_clocktower.webp",
    "d39_aruna_underground": "dungeons39/15_aruna_underground.webp", "d39_mist_isle": "dungeons39/16_mist_isle.webp",
    "d39_elmina_undersea": "dungeons39/17_elmina_undersea.webp", "d39_memory_library": "dungeons39/18_memory_library.webp",
    "d39_time_bank_vault": "dungeons39/19_time_bank_vault.webp", "d39_temple_of_time": "dungeons39/20_temple_of_time.webp",
    "d39_vol_under": "dungeons39/21_vol_under.webp", "d39_old_city": "dungeons39/22_old_city.webp",
    "d39_old_city_deep": "dungeons39/23_old_city_deep.webp", "d39_auto_factory": "dungeons39/24_auto_factory.webp",
    "d39_oracle_core": "dungeons39/25_oracle_core.webp", "d39_forbidden_archive": "dungeons39/26_forbidden_archive.webp",
    "d39_origin_lab": "dungeons39/27_origin_lab.webp", "d39_star_tower": "dungeons39/28_star_tower.webp",
    "d39_sky_temple": "dungeons39/29_sky_temple.webp", "d39_void_wasteland": "dungeons39/30_void_wasteland.webp",
    "d39_demon_castle": "dungeons39/31_demon_castle.webp", "d39_sandstorm_corridor": "dungeons39/32_sandstorm_corridor.webp",
    "d39_mirage_temple": "dungeons39/33_mirage_temple.webp", "d39_crater_altar": "dungeons39/34_crater_altar.webp",
    "d39_dragon_vein": "dungeons39/35_dragon_vein.webp", "d39_dragon_vein_deep": "dungeons39/36_dragon_vein_deep.webp",
    "d39_memory_vault": "dungeons39/37_memory_vault.webp", "d39_spirit_forest": "dungeons39/38_spirit_forest.webp",
    "d39_frozen_tower": "dungeons39/39_frozen_tower.webp"
  },
    maps: {
    "emal_pass": "d39_emal_pass", "a6_em_hut": "d39_emal_pass", "bandit_hideout": "d39_bandit_hideout", "a6_bd_store": "d39_bandit_hideout",
    "verum_hideout": "d39_verum_hideout", "a6_vh_store": "d39_verum_hideout", "iron_fort_gate": "d39_iron_fort_gate", "a6_fg_armory": "d39_iron_fort_gate",
    "iron_mine_1": "d39_iron_mine", "iron_mine_2": "d39_iron_mine", "iron_mine_3": "d39_iron_mine", "a4_im_old": "d39_iron_mine",
    "grania_pass": "d39_grania_pass", "a6_gp_shelter": "d39_grania_pass", "ash_cave_1": "d39_ash_cave", "ash_cave_2": "d39_ash_cave",
    "a4_ac_press": "d39_ash_cave", "sunken_reef_1": "d39_sunken_reef", "sunken_reef_2": "d39_sunken_reef", "a6_sr_hold": "d39_sunken_reef",
    "pirate_nest": "d39_pirate_nest", "a6_pn_cave": "d39_pirate_nest", "ash_cape": "d39_ash_cape", "a6_ap_canal": "d39_ash_cape",
    "kalion_archive_1": "d39_kalion_archive", "kalion_archive_2": "d39_kalion_archive", "a6_ka_ledger": "d39_kalion_archive", "kalion_lab": "d39_kalion_lab",
    "a6_kl_scale": "d39_kalion_lab", "sentra_palace_1": "d39_sentra_palace", "sentra_palace_2": "d39_sentra_palace", "aruna_ruins_1": "d39_aruna_clocktower",
    "aruna_ruins_2": "d39_aruna_clocktower", "a6_ar_light": "d39_aruna_clocktower", "aruna_underground_1": "d39_aruna_underground", "aruna_underground_2": "d39_aruna_underground",
    "a4_au_lamps": "d39_aruna_underground", "mist_isle": "d39_mist_isle", "a6_mi_spring": "d39_mist_isle", "elmina_undersea": "d39_elmina_undersea",
    "a6_el_current": "d39_elmina_undersea", "memory_library": "d39_memory_library", "memory_library_seal": "d39_memory_library", "a4_ml_closed": "d39_memory_library",
    "time_bank_vault_1": "d39_time_bank_vault", "time_bank_vault_2": "d39_time_bank_vault", "a6_tb_exchange": "d39_time_bank_vault", "temple_of_time_1": "d39_temple_of_time",
    "temple_of_time_2": "d39_temple_of_time", "temple_of_time_3": "d39_temple_of_time", "a4_tt_sand": "d39_temple_of_time", "vol_under_1": "d39_vol_under",
    "vol_under_2": "d39_vol_under", "a6_vu_numbers": "d39_vol_under", "old_city_1": "d39_old_city", "old_city_2": "d39_old_city",
    "a6_oc_vault": "d39_old_city", "old_city_deep_1": "d39_old_city_deep", "old_city_deep_2": "d39_old_city_deep", "a6_od_scan": "d39_old_city_deep",
    "auto_factory_1": "d39_auto_factory", "auto_factory_2": "d39_auto_factory", "a6_af_control": "d39_auto_factory", "oracle_core_1": "d39_oracle_core",
    "oracle_core_2": "d39_oracle_core", "oracle_core_3": "d39_oracle_core", "a6_or_lamps": "d39_oracle_core", "forbidden_archive_1": "d39_forbidden_archive",
    "forbidden_archive_2": "d39_forbidden_archive", "forbidden_archive_3": "d39_forbidden_archive", "a4_fa_seal": "d39_forbidden_archive", "origin_lab_1": "d39_origin_lab",
    "origin_lab_2": "d39_origin_lab", "a6_ol_mixing": "d39_origin_lab", "star_tower_1": "d39_star_tower", "star_tower_2": "d39_star_tower",
    "a6_st_rings": "d39_star_tower", "sky_temple_1": "d39_sky_temple", "sky_temple_2": "d39_sky_temple", "a6_sk_clouds": "d39_sky_temple",
    "void_wasteland_1": "d39_void_wasteland", "void_wasteland_2": "d39_void_wasteland", "a6_vw_doors": "d39_void_wasteland", "demon_castle_gate": "d39_demon_castle",
    "demon_castle_1": "d39_demon_castle", "demon_castle_2": "d39_demon_castle", "demon_castle_3": "d39_demon_castle", "demon_castle_4": "d39_demon_castle",
    "demon_castle_5": "d39_demon_castle", "a6_dc_statues": "d39_demon_castle", "sandstorm_corridor_1": "d39_sandstorm_corridor", "sandstorm_corridor_2": "d39_sandstorm_corridor",
    "a4_sc_shrine": "d39_sandstorm_corridor", "mirage_temple_1": "d39_mirage_temple", "mirage_temple_2": "d39_mirage_temple", "mirage_temple_3": "d39_mirage_temple",
    "mirage_temple_4": "d39_mirage_temple", "a6_mt_mirage": "d39_mirage_temple", "crater_altar": "d39_crater_altar", "a6_ca_forge": "d39_crater_altar",
    "dragon_vein_1": "d39_dragon_vein", "dragon_vein_2": "d39_dragon_vein", "a4_dv_pool": "d39_dragon_vein", "dragon_vein_deep_1": "d39_dragon_vein_deep",
    "dragon_vein_deep_2": "d39_dragon_vein_deep", "a6_dd_vents": "d39_dragon_vein_deep", "memory_vault": "d39_memory_vault", "a6_mv_echo": "d39_memory_vault",
    "spirit_forest_1": "d39_spirit_forest", "spirit_forest_2": "d39_spirit_forest", "a4_sf_spring": "d39_spirit_forest", "frozen_tower_1": "d39_frozen_tower",
    "frozen_tower_2": "d39_frozen_tower", "frozen_tower_3": "d39_frozen_tower", "frozen_tower_4": "d39_frozen_tower", "a6_ft_ice": "d39_frozen_tower"
  },
    horizon: {
    "d39_emal_pass": 0.55, "d39_bandit_hideout": 0.45, "d39_verum_hideout": 0.48, "d39_iron_fort_gate": 0.63, "d39_iron_mine": 0.44,
    "d39_grania_pass": 0.4, "d39_ash_cave": 0.43, "d39_sunken_reef": 0.44, "d39_pirate_nest": 0.47, "d39_ash_cape": 0.48,
    "d39_kalion_archive": 0.55, "d39_kalion_lab": 0.46, "d39_sentra_palace": 0.55, "d39_aruna_clocktower": 0.52, "d39_aruna_underground": 0.5,
    "d39_mist_isle": 0.43, "d39_elmina_undersea": 0.52, "d39_memory_library": 0.57, "d39_time_bank_vault": 0.5, "d39_temple_of_time": 0.5,
    "d39_vol_under": 0.5, "d39_old_city": 0.5, "d39_old_city_deep": 0.5, "d39_auto_factory": 0.41, "d39_oracle_core": 0.52,
    "d39_forbidden_archive": 0.57, "d39_origin_lab": 0.49, "d39_star_tower": 0.49, "d39_sky_temple": 0.43, "d39_void_wasteland": 0.4,
    "d39_demon_castle": 0.5, "d39_sandstorm_corridor": 0.47, "d39_mirage_temple": 0.47, "d39_crater_altar": 0.49, "d39_dragon_vein": 0.4,
    "d39_dragon_vein_deep": 0.42, "d39_memory_vault": 0.54, "d39_spirit_forest": 0.42, "d39_frozen_tower": 0.57
  },
    ground: {
    "d39_emal_pass": ["#776558", "#937d6a"], "d39_bandit_hideout": ["#6b4732", "#95684c"],
    "d39_verum_hideout": ["#58463d", "#6a5041"], "d39_iron_fort_gate": ["#5d595c", "#777274"],
    "d39_iron_mine": ["#524640", "#6a5d58"], "d39_grania_pass": ["#615c5a", "#757375"],
    "d39_ash_cave": ["#544f51", "#777173"], "d39_sunken_reef": ["#4d5256", "#737575"],
    "d39_pirate_nest": ["#a68065", "#d3a983"], "d39_ash_cape": ["#515357", "#6a6e75"],
    "d39_kalion_archive": ["#6a574d", "#8e7565"], "d39_kalion_lab": ["#6b5b56", "#837266"],
    "d39_sentra_palace": ["#85807d", "#99928d"], "d39_aruna_clocktower": ["#7a674f", "#98866f"],
    "d39_aruna_underground": ["#6a5c51", "#8e7e72"], "d39_mist_isle": ["#797265", "#a49a8b"],
    "d39_elmina_undersea": ["#b4afaa", "#c2beb7"], "d39_memory_library": ["#66858d", "#8b9590"],
    "d39_time_bank_vault": ["#4d363b", "#6c4d4f"], "d39_temple_of_time": ["#c08873", "#cc9084"],
    "d39_vol_under": ["#696872", "#8d8f9c"], "d39_old_city": ["#525351", "#787877"],
    "d39_old_city_deep": ["#353537", "#3e4245"], "d39_auto_factory": ["#615a59", "#827876"],
    "d39_oracle_core": ["#494e58", "#5c6878"], "d39_forbidden_archive": ["#665565", "#7e6a7f"],
    "d39_origin_lab": ["#a58986", "#bb9da2"], "d39_star_tower": ["#717186", "#848294"],
    "d39_sky_temple": ["#b4a6a1", "#c9bbb3"], "d39_void_wasteland": ["#393239", "#423843"],
    "d39_demon_castle": ["#3b3140", "#594862"], "d39_sandstorm_corridor": ["#ac6938", "#c6824b"],
    "d39_mirage_temple": ["#b18059", "#d0a379"], "d39_crater_altar": ["#423533", "#5e4843"],
    "d39_dragon_vein": ["#352f32", "#483f42"], "d39_dragon_vein_deep": ["#2f2322", "#53362c"],
    "d39_memory_vault": ["#565b67", "#747b88"], "d39_spirit_forest": ["#879dc6", "#92aad2"],
    "d39_frozen_tower": ["#60718b", "#859ab8"]
  },
    fog: {
    "d39_emal_pass": "#606669", "d39_bandit_hideout": "#4e4037", "d39_verum_hideout": "#4b2f1f",
    "d39_iron_fort_gate": "#403837", "d39_iron_mine": "#3d4550", "d39_grania_pass": "#7f8289",
    "d39_ash_cave": "#4b4a4c", "d39_sunken_reef": "#496d7e", "d39_pirate_nest": "#728c91",
    "d39_ash_cape": "#595c5f", "d39_kalion_archive": "#503b2f", "d39_kalion_lab": "#534538",
    "d39_sentra_palace": "#6b665d", "d39_aruna_clocktower": "#79776a", "d39_aruna_underground": "#585a54",
    "d39_mist_isle": "#6f7b6a", "d39_elmina_undersea": "#4b9dac", "d39_memory_library": "#5a645b",
    "d39_time_bank_vault": "#4a3136", "d39_temple_of_time": "#9b6c6a", "d39_vol_under": "#54585f",
    "d39_old_city": "#4c5a61", "d39_old_city_deep": "#3d505a", "d39_auto_factory": "#54463f",
    "d39_oracle_core": "#56748d", "d39_forbidden_archive": "#583f67", "d39_origin_lab": "#90787a",
    "d39_star_tower": "#526080", "d39_sky_temple": "#b4a69a", "d39_void_wasteland": "#6f4558",
    "d39_demon_castle": "#443352", "d39_sandstorm_corridor": "#c68146", "d39_mirage_temple": "#a98056",
    "d39_crater_altar": "#5e3d32", "d39_dragon_vein": "#723e36", "d39_dragon_vein_deep": "#914a25",
    "d39_memory_vault": "#536170", "d39_spirit_forest": "#6998b5", "d39_frozen_tower": "#597494"
  },
    names: {
    "d39_emal_pass": "エマール山道", "d39_bandit_hideout": "山賊のアジト", "d39_verum_hideout": "地下の集会所", "d39_iron_fort_gate": "鉄冠将軍の砦",
    "d39_iron_mine": "鉄鎖鉱山", "d39_grania_pass": "灰の峠", "d39_ash_cave": "灰の洞窟", "d39_sunken_reef": "沈没船の礁",
    "d39_pirate_nest": "海賊カモメの巣", "d39_ash_cape": "灰の岬", "d39_kalion_archive": "地下記録庫", "d39_kalion_lab": "秘密研究所",
    "d39_sentra_palace": "王宮・帳簿中枢", "d39_aruna_clocktower": "時計塔〈アルナ〉", "d39_aruna_underground": "地下施設〈アルナ〉", "d39_mist_isle": "霧の島",
    "d39_elmina_undersea": "海底都市エルミナ", "d39_memory_library": "記憶の図書館", "d39_time_bank_vault": "地下契約室", "d39_temple_of_time": "時の神殿",
    "d39_vol_under": "地下実験施設〈ボラティリティア学院〉", "d39_old_city": "廃棄された旧都市", "d39_old_city_deep": "旧都市 深層", "d39_auto_factory": "自動工場",
    "d39_oracle_core": "オラクル中枢", "d39_forbidden_archive": "禁書庫", "d39_origin_lab": "起源の実験室", "d39_star_tower": "星見塔",
    "d39_sky_temple": "天空神殿", "d39_void_wasteland": "虚無の荒野", "d39_demon_castle": "魔王城", "d39_sandstorm_corridor": "砂嵐の回廊",
    "d39_mirage_temple": "蜃気楼神殿", "d39_crater_altar": "火口の祭壇", "d39_dragon_vein": "竜脈洞窟", "d39_dragon_vein_deep": "竜脈の最深部",
    "d39_memory_vault": "記憶庫", "d39_spirit_forest": "精霊の森", "d39_frozen_tower": "凍結時計塔"
  }
  };
})(typeof window !== 'undefined' ? window : globalThis);
