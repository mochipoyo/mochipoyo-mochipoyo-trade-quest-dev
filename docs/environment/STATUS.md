# 環境リデザイン：マップごとの状態（自動生成：docs/tools/env/status.js）

状態の意味：design_only（レシピなし・従来の表示）／integrated（レシピを当て、全マップの自動の確認＝組み立てで失敗しない・ページのエラーなし・レシピと建物の形が歩けるマスの体の高さに入らない）／visual_checked（画面を撮って目で確認）／gameplay_checked（env=off と v1 の比較・論理を変えたマップの行ける所・3Dの回帰一式）／verified（実機・GPU・速さ。**この作業環境ではしていない＝0**）

## 数

| 種類 | design_only | integrated | visual_checked | gameplay_checked | verified |
|---|---|---|---|---|---|
| dungeon | 18 | 101 | 6 | 1 | 0 |
| field | 12 | 0 | 0 | 0 | 0 |
| interior | 32 | 394 | 2 | 1 | 0 |
| town | 2 | 14 | 11 | 3 | 0 |
| 合計 | 64 | 509 | 19 | 5 | 0 |

## マップごと

| マップID | 種類 | レシピ | 状態 | 前後の比較 | メモ |
|---|---|---|---|---|---|
| a3_aruna_hut | interior | room_kit.v1:plaster | integrated | - |  |
| a3_ciel_lookout | interior | room_kit.v1:plaster | integrated | - |  |
| a3_dark_command | interior | room_kit.v1:plank | integrated | - |  |
| a3_district_9 | interior | room_kit.v1:plaster | integrated | - |  |
| a3_dow_hunter | interior | room_kit.v1:plaster | integrated | - |  |
| a3_erased_cellar | interior | room_kit.v1:ashlar | integrated | - |  |
| a3_frost_keeper | interior | room_kit.v1:plaster | integrated | - |  |
| a3_harbor_net | interior | room_kit.v1:plaster | integrated | - |  |
| a3_ignas_smith_home | interior | room_kit.v1:panel | integrated | - |  |
| a3_kalion_estate | interior | room_kit.v1:plaster | integrated | - |  |
| a3_luxbell_dice | interior | room_kit.v1:plaster | integrated | - |  |
| a3_magicka_crafter | interior | room_kit.v1:plaster | integrated | - |  |
| a3_mirror_changer | interior | room_kit.v1:plaster | integrated | - |  |
| a3_mirror_changer_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| a3_node_family | interior | room_kit.v1:plaster | integrated | - |  |
| a3_ruins_keeper | interior | room_kit.v1:plaster | integrated | - |  |
| a3_sahar_water | interior | room_kit.v1:plaster | integrated | - |  |
| a3_sahar_water_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| a3_sentra_noble | interior | room_kit.v1:plaster | integrated | - |  |
| a3_star_tent | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a3_star_tent_x72_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a3_tempus_clock | interior | room_kit.v1:plaster | integrated | - |  |
| a3_tempus_clock_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| a3_verum_row | interior | room_kit.v1:plaster | integrated | - |  |
| a3_vol_lodging | interior | room_kit.v1:panel | integrated | - |  |
| a3_vol_lodging_x72_2f | interior | room_kit.v1:panel | integrated | - |  |
| a4_ac_press | dungeon | room_kit.v1:rock | integrated | - |  |
| a4_au_lamps | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a4_dv_pool | dungeon | room_kit.v1:rock | integrated | - |  |
| a4_fa_seal | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a4_im_old | dungeon | room_kit.v1:rock | integrated | - |  |
| a4_lf_glade | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a4_ml_closed | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a4_sc_shrine | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a4_sf_spring | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a4_tt_sand | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_af_control | dungeon | room_kit.v1:panel | integrated | - |  |
| a6_ap_canal | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_ar_light | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_bd_store | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_ca_forge | dungeon | room_kit.v1:panel | integrated | - |  |
| a6_dc_statues | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_dd_vents | dungeon | room_kit.v1:rock | integrated | - |  |
| a6_el_current | dungeon | room_kit.v1:rock | integrated | - |  |
| a6_em_hut | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a6_fg_armory | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_ft_ice | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_gp_shelter | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a6_ka_ledger | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_kl_scale | dungeon | room_kit.v1:panel | integrated | - |  |
| a6_mi_spring | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a6_mt_mirage | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_mv_echo | dungeon | room_kit.v1:rock | integrated | - |  |
| a6_oc_vault | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_od_scan | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_ol_mixing | dungeon | room_kit.v1:panel | integrated | - |  |
| a6_or_lamps | dungeon | room_kit.v1:panel | integrated | - |  |
| a6_pn_cave | dungeon | room_kit.v1:rock | integrated | - |  |
| a6_sk_clouds | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a6_sr_hold | dungeon | room_kit.v1:plank | integrated | - |  |
| a6_st_rings | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| a6_tb_exchange | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_vh_store | dungeon | room_kit.v1:ashlar | integrated | - |  |
| a6_vu_numbers | dungeon | room_kit.v1:panel | integrated | - |  |
| a6_vw_doors | dungeon | room_kit.v1:ashlar | integrated | - |  |
| aruna_house_iris | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_house_yorn | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_house_yorn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_inn | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_item | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| aruna_lighthouse | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| aruna_lighthouse_top | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_ruins | town | town_kit.v1 | integrated | 済 |  |
| aruna_ruins_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| aruna_ruins_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| aruna_ruins_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_ruins_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_ruins_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_ruins_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_ruins_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_ruins_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| aruna_ruins_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| aruna_ruins_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| aruna_underground_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| aruna_underground_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| aruna_village | town | town_kit.v1 | visual_checked | 済 |  |
| aruna_village_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_village_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_village_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| aruna_village_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| aruna_village_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| aruna_village_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| asana_home | interior | room_kit.v1:plaster | integrated | - |  |
| asana_raid | town | town_kit.v1 | integrated | - |  |
| asana_rebuilt | town | town_kit.v1 | integrated | - |  |
| asana_ruins | town | town_kit.v1 | integrated | 済 |  |
| asana_village | town | town_kit.v1 | integrated | 済 |  |
| ash_cape | dungeon | room_kit.v1:ashlar | integrated | - |  |
| ash_cave_1 | dungeon | room_kit.v1:rock | integrated | - |  |
| ash_cave_2 | dungeon | room_kit.v1:rock | integrated | - |  |
| ash_shore_hut | interior | room_kit.v1:plaster | integrated | - |  |
| auto_factory_1 | dungeon | room_kit.v1:panel | visual_checked | 済 |  |
| auto_factory_2 | dungeon | room_kit.v1:panel | integrated | - |  |
| bandit_hideout | dungeon | room_kit.v1:ashlar | integrated | - |  |
| cave_hidden_room | dungeon | room_kit.v1:rock | integrated | - |  |
| ciel_harbor | interior | room_kit.v1:plaster | integrated | - |  |
| ciel_inn | interior | room_kit.v1:plaster | integrated | - |  |
| ciel_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| ciel_item | interior | room_kit.v1:plaster | integrated | - |  |
| ciel_item_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| ciel_port | town | town_kit.v1 | integrated | 済 |  |
| ciel_port_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| ciel_port_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| ciel_port_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| ciel_port_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| ciel_port_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| ciel_port_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| ciel_weapon | interior | room_kit.v1:plaster | integrated | - |  |
| crater_altar | dungeon | room_kit.v1:rock | integrated | - |  |
| dark_armory | interior | room_kit.v1:plaster | integrated | - |  |
| dark_camp | town | town_kit.v1 | visual_checked | 済 |  |
| dark_camp_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| dark_camp_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| dark_camp_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| dark_camp_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| dark_camp_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| dark_camp_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| dark_inn | interior | room_kit.v1:plaster | integrated | - |  |
| dark_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| dark_shop | interior | room_kit.v1:plaster | integrated | - |  |
| dark_tent_hald | interior | room_kit.v1:plank | integrated | - |  |
| dark_tent_hald_x72_2f | interior | room_kit.v1:plank | integrated | - |  |
| demon_castle_1 | dungeon | room_kit.v1:ashlar | visual_checked | 済 |  |
| demon_castle_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| demon_castle_3 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| demon_castle_4 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| demon_castle_5 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| demon_castle_gate | dungeon | room_kit.v1:ashlar | integrated | - |  |
| district_house | interior | room_kit.v1:plaster | integrated | - |  |
| district_house_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| district_inn | interior | room_kit.v1:plaster | integrated | - |  |
| district_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| district_ration | interior | room_kit.v1:plaster | integrated | - |  |
| dow_dojo | interior | room_kit.v1:plaster | integrated | - |  |
| dow_house | interior | room_kit.v1:plaster | integrated | - |  |
| dow_house_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| dow_inn | interior | room_kit.v1:plaster | integrated | - |  |
| dow_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| dow_village | town | town_kit.v1 | integrated | 済 |  |
| dow_village_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| dow_village_x72_ex1 | interior | room_kit.v1:plaster | integrated | - |  |
| dow_village_x72_ex1_2f | interior | room_kit.v1:plaster | integrated | - |  |
| dow_village_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| dow_village_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| dow_village_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| dow_village_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| dow_village_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| dow_village_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| dow_weapon_shop | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| dragon_vein_1 | dungeon | room_kit.v1:rock | integrated | - |  |
| dragon_vein_2 | dungeon | room_kit.v1:rock | integrated | - |  |
| dragon_vein_deep_1 | dungeon | room_kit.v1:rock | integrated | - |  |
| dragon_vein_deep_2 | dungeon | room_kit.v1:rock | integrated | - |  |
| elmina_undersea | dungeon | room_kit.v1:rock | integrated | - |  |
| emal_pass | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| erased_elder | interior | room_kit.v1:plaster | integrated | - |  |
| erased_elder_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| erased_house | interior | room_kit.v1:plaster | integrated | - |  |
| erased_house_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| erased_village | town | town_kit.v1 | integrated | 済 |  |
| erased_village_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| erased_village_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| erased_village_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| erased_village_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| erased_village_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| forbidden_archive_1 | dungeon | room_kit.v1:ashlar | visual_checked | 済 |  |
| forbidden_archive_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| forbidden_archive_3 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| forest_hidden_room | dungeon | room_kit.v1:ashlar | integrated | - |  |
| frost_armor | interior | room_kit.v1:plaster | integrated | - |  |
| frost_house | interior | room_kit.v1:plaster | integrated | - |  |
| frost_house_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| frost_inn | interior | room_kit.v1:plaster | integrated | - |  |
| frost_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| frost_item | interior | room_kit.v1:plaster | integrated | - |  |
| frost_town | town | town_kit.v1 | visual_checked | 済 |  |
| frost_town_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| frost_town_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| frost_town_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| frost_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| frost_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| frost_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| frost_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| frost_weapon | interior | room_kit.v1:plaster | integrated | - |  |
| frozen_tower_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| frozen_tower_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| frozen_tower_3 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| frozen_tower_4 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| grania_pass | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| harbor_house | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_inn | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_item_shop | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_tavern | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_town | town | town_kit.v1 | integrated | 済 |  |
| harbor_town_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_town_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| harbor_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| harbor_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| harbor_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| harbor_warehouse | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_armor | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_forge | interior | room_kit.v1:panel | integrated | - |  |
| ignas_hall | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_house_1 | interior | room_kit.v1:panel | integrated | - |  |
| ignas_house_1_x72_2f | interior | room_kit.v1:panel | integrated | - |  |
| ignas_house_2 | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_inn | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_item | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_town | town | town_kit.v1 | visual_checked | 済 |  |
| ignas_town_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_town_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| ignas_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| ignas_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| ignas_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| iron_fort_gate | dungeon | room_kit.v1:ashlar | integrated | - |  |
| iron_mine_1 | dungeon | iron_mine_1.v1 | gameplay_checked | 済 |  |
| iron_mine_2 | dungeon | room_kit.v1:rock | visual_checked | 済 |  |
| iron_mine_3 | dungeon | room_kit.v1:rock | integrated | - |  |
| kalion_archive_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| kalion_archive_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| kalion_armor | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_church | interior | room_kit.v1:ashlar | visual_checked | 済 |  |
| kalion_city | town | town_kit.v1 | visual_checked | 済 |  |
| kalion_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_ex1 | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_ex2 | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_ex2_2f | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_ex3 | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_ex4 | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_ex4_2f | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| kalion_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| kalion_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| kalion_finance | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_inn | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_item | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_lab | dungeon | room_kit.v1:panel | integrated | - |  |
| kalion_tavern | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_tax | interior | room_kit.v1:plaster | integrated | - |  |
| kalion_weapon | interior | room_kit.v1:plaster | integrated | - |  |
| lost_forest | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| lost_forest_shrine | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| lost_forest_treasure | dungeon | room_kit.v1:ashlar | integrated | - |  |
| luxbell | town | - | design_only | - | 近未来・機械・娯楽の町：ガラスと金属の汎用の建物のまま |
| luxbell_casino | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_dining | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_dining_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_inn | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_item | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_labs | interior | room_kit.v1:panel | integrated | - |  |
| luxbell_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| luxbell_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| luxbell_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| luxbell_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_academy | interior | room_kit.v1:panel | integrated | - |  |
| magicka_armor | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_church | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_city | town | town_kit.v1 | visual_checked | 済 |  |
| magicka_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_city_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_city_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_city_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_inn | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_item | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_palace | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_palace_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_palace_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_palace_b1 | interior | room_kit.v1:ashlar | integrated | - |  |
| magicka_tavern | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| magicka_weapon | interior | room_kit.v1:plaster | integrated | - |  |
| memory_library | dungeon | room_kit.v1:ashlar | integrated | - |  |
| memory_library_seal | dungeon | room_kit.v1:ashlar | integrated | - |  |
| memory_market | interior | room_kit.v1:plaster | integrated | - |  |
| memory_vault | dungeon | room_kit.v1:rock | integrated | - |  |
| mirage_temple_1 | dungeon | room_kit.v1:ashlar | integrated | 済 |  |
| mirage_temple_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| mirage_temple_3 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| mirage_temple_4 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| mirror_market | town | town_kit.v1 | integrated | 済 |  |
| mirror_market_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| mirror_market_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| mirror_market_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| mirror_market_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| mirror_market_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| mist_isle | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| no_failure_school | interior | room_kit.v1:panel | integrated | - |  |
| node_armor | interior | room_kit.v1:plaster | integrated | - |  |
| node_city | town | node_city.v1 | gameplay_checked | 済 |  |
| node_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| node_city_x72_ex1 | interior | room_kit.v1:plaster | integrated | - |  |
| node_city_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| node_city_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| node_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| node_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| node_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| node_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| node_house | interior | room_kit.v1:plaster | integrated | - |  |
| node_inn | interior | room_kit.v1:plaster | integrated | - |  |
| node_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| node_market | interior | room_kit.v1:plaster | integrated | - |  |
| node_market_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| node_ration | interior | room_kit.v1:plaster | integrated | - |  |
| node_registry | interior | room_kit.v1:plaster | integrated | - |  |
| oblivion_cave_1 | dungeon | room_kit.v1:rock | visual_checked | 済 |  |
| oblivion_cave_2 | dungeon | room_kit.v1:rock | integrated | - |  |
| oblivion_cave_3 | dungeon | room_kit.v1:rock | integrated | - |  |
| oblivion_cave_lake | dungeon | room_kit.v1:rock | integrated | - |  |
| old_city_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| old_city_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| old_city_deep_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| old_city_deep_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| oracle_core_1 | dungeon | room_kit.v1:panel | integrated | - |  |
| oracle_core_2 | dungeon | room_kit.v1:panel | integrated | - |  |
| oracle_core_3 | dungeon | room_kit.v1:panel | integrated | - |  |
| origin_lab_1 | dungeon | room_kit.v1:panel | integrated | - |  |
| origin_lab_2 | dungeon | room_kit.v1:panel | integrated | - |  |
| pirate_nest | dungeon | room_kit.v1:ashlar | integrated | - |  |
| poyo_barn | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_barn_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_church | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_church_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_church_3f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_dojo | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_elder_house | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_elder_house_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_hall | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_hall_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_house | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_inn | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_inn_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_item_shop | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_mill | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_village | town | poyo_village.v1 | gameplay_checked | 済 |  |
| poyo_watch | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_watch_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| poyo_watch_3f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| rivel_armor_shop | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan | town | town_kit.v1 | integrated | 済 |  |
| rivel_artisan_herbal | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan_smith | interior | room_kit.v1:panel | integrated | - |  |
| rivel_artisan_smith_x72_2f | interior | room_kit.v1:panel | integrated | - |  |
| rivel_artisan_weaver | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan_weaver_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_artisan_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_artisan_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_artisan_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_bank | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_castle | interior | rivel_castle.v1 | gameplay_checked | 済 |  |
| rivel_castle_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_castle_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_castle_4f | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_castle_b1 | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_castle_library | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_church | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_guild | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_inn | interior | room_kit.v1:plaster | visual_checked | 済 |  |
| rivel_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_item_shop | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_tavern | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town | town | town_kit.v1 | visual_checked | 済 |  |
| rivel_town_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_ex1 | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_ex1_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_ex2 | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_ex3 | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_ex3_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_ex4 | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_ex4_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_ex5 | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| rivel_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_wave_temple | interior | room_kit.v1:ashlar | integrated | - |  |
| rivel_weapon_shop | interior | room_kit.v1:plaster | integrated | - |  |
| ruins_post | interior | room_kit.v1:ashlar | integrated | - |  |
| ruins_post_x72_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| ruins_store | interior | room_kit.v1:ashlar | integrated | - |  |
| ruins_store_x72_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| sahar_armor | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_church | interior | room_kit.v1:ashlar | integrated | - |  |
| sahar_city | town | town_kit.v1 | visual_checked | 済 |  |
| sahar_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_city_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_city_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_city_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| sahar_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| sahar_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| sahar_guild | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_inn | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_item | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_water_office | interior | room_kit.v1:plaster | integrated | - |  |
| sahar_weapon | interior | room_kit.v1:plaster | integrated | - |  |
| sandstorm_corridor_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| sandstorm_corridor_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| scheduled_district | town | scheduled_district.v1 | visual_checked | 済 |  |
| scheduled_district_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| scheduled_district_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| scheduled_district_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| scheduled_district_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| scheduled_district_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| scheduled_district_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| school_roof | interior | room_kit.v1:panel | integrated | - |  |
| sentra_armor | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital | town | town_kit.v1 | integrated | 済 |  |
| sentra_capital_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital_x72_ex1 | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital_x72_ex2 | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital_x72_ex2_2f | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_capital_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| sentra_capital_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| sentra_capital_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| sentra_inn | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_item | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_knights | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_office | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_palace_1 | dungeon | room_kit.v1:ashlar | visual_checked | 済 |  |
| sentra_palace_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| sentra_palace_vault | interior | room_kit.v1:ashlar | integrated | - |  |
| sentra_palace_west | interior | room_kit.v1:ashlar | integrated | - |  |
| sentra_palace_west_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| sentra_tavern | interior | room_kit.v1:plaster | integrated | - |  |
| sentra_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| sky_temple_1 | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| sky_temple_2 | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| spirit_forest_1 | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| spirit_forest_2 | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| star_camp | town | town_kit.v1 | integrated | 済 |  |
| star_camp_x72_house | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| star_camp_x72_house_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| star_camp_x72_tower | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| star_camp_x72_tower_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| star_camp_x72_tower_3f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| star_tower_1 | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| star_tower_2 | dungeon | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| sunken_reef_1 | dungeon | room_kit.v1:plank | integrated | 済 |  |
| sunken_reef_2 | dungeon | room_kit.v1:plank | integrated | - |  |
| temple_of_time_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| temple_of_time_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| temple_of_time_3 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| tempus_armor | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_bell | interior | room_kit.v1:ashlar | integrated | - |  |
| tempus_church | interior | room_kit.v1:ashlar | integrated | - |  |
| tempus_city | town | town_kit.v1 | visual_checked | 済 |  |
| tempus_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_city_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_city_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_city_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| tempus_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| tempus_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| tempus_inn | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_item | interior | room_kit.v1:plaster | integrated | - |  |
| tempus_weapon | interior | room_kit.v1:plaster | integrated | - |  |
| time_bank | interior | room_kit.v1:plaster | integrated | - |  |
| time_bank_vault_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| time_bank_vault_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| tradia | town | tradia.v1 | gameplay_checked | 済 |  |
| tradia_arena | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_armor | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_bank | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_exchange | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_foundation | interior | room_kit.v1:ashlar | integrated | - |  |
| tradia_guild | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_house | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_inn | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_iq73 | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_item | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_lab | interior | room_kit.v1:panel | integrated | - |  |
| tradia_levex | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_mansion | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_sky | town | - | design_only | - | 近未来・機械・娯楽の町：ガラスと金属の汎用の建物のまま |
| tradia_sky_boutique | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| tradia_sky_exchange | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| tradia_sky_lounge | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| tradia_sky_lounge_2f | interior | - | design_only | - | 屋外のダンジョン・森・専用に作り込んだ3D（ポヨ村の屋内）などで対象外 |
| tradia_tavern | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_weapon | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_ex1 | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_ex1_2f | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_ex2 | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_ex2_2f | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_ex3 | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_ex4 | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| tradia_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| tradia_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| tradia_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| verum_dorm | interior | room_kit.v1:plaster | integrated | - |  |
| verum_dorm_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| verum_factory | interior | room_kit.v1:panel | integrated | - |  |
| verum_hideout | dungeon | room_kit.v1:ashlar | integrated | - |  |
| verum_inn | interior | room_kit.v1:plaster | integrated | - |  |
| verum_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - |  |
| verum_overseer_house | interior | room_kit.v1:plaster | integrated | - |  |
| verum_ration | interior | room_kit.v1:plaster | integrated | - |  |
| verum_school | interior | room_kit.v1:plaster | integrated | - |  |
| verum_town | town | town_kit.v1 | visual_checked | 済 |  |
| verum_town_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| verum_town_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| verum_town_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| verum_town_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| verum_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| verum_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| verum_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| verum_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| void_wasteland_1 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| void_wasteland_2 | dungeon | room_kit.v1:ashlar | integrated | - |  |
| vol_ancient | interior | room_kit.v1:panel | integrated | - |  |
| vol_dean | interior | room_kit.v1:panel | integrated | - |  |
| vol_dorm | interior | room_kit.v1:panel | integrated | - |  |
| vol_dorm_x72_2f | interior | room_kit.v1:panel | integrated | - |  |
| vol_lecture | interior | room_kit.v1:panel | integrated | - |  |
| vol_library | interior | room_kit.v1:ashlar | integrated | - |  |
| vol_mind | interior | room_kit.v1:panel | integrated | - |  |
| vol_observatory | interior | room_kit.v1:ashlar | integrated | - |  |
| vol_quantum | interior | room_kit.v1:panel | integrated | - |  |
| vol_under_1 | dungeon | room_kit.v1:panel | integrated | - |  |
| vol_under_2 | dungeon | room_kit.v1:panel | integrated | - |  |
| vol_under_gate | interior | room_kit.v1:panel | integrated | - |  |
| volatilia | town | town_kit.v1 | integrated | 済 |  |
| volatilia_x72_ex0 | interior | room_kit.v1:plaster | integrated | - |  |
| volatilia_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - |  |
| volatilia_x72_ex1 | interior | room_kit.v1:plaster | integrated | - |  |
| volatilia_x72_hall | interior | room_kit.v1:plaster | integrated | - |  |
| volatilia_x72_house | interior | room_kit.v1:plaster | integrated | - |  |
| volatilia_x72_house_2f | interior | room_kit.v1:plaster | integrated | - |  |
| volatilia_x72_tower | interior | room_kit.v1:ashlar | integrated | - |  |
| volatilia_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - |  |
| volatilia_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - |  |
| world | field | - | design_only | - | フィールド：未着手 |
| world_dark | field | - | design_only | - | フィールド：未着手 |
| world_desert | field | - | design_only | - | フィールド：未着手 |
| world_dragon | field | - | design_only | - | フィールド：未着手 |
| world_grania | field | - | design_only | - | フィールド：未着手 |
| world_islands | field | - | design_only | - | フィールド：未着手 |
| world_kalion | field | - | design_only | - | フィールド：未着手 |
| world_machine | field | - | design_only | - | フィールド：未着手 |
| world_magicka | field | - | design_only | - | フィールド：未着手 |
| world_sky | field | - | design_only | - | フィールド：未着手 |
| world_snow | field | - | design_only | - | フィールド：未着手 |
| world_tempus | field | - | design_only | - | フィールド：未着手 |
