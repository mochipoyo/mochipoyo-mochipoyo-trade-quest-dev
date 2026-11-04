# 環境リデザイン：マップごとの状態（自動生成：docs/tools/env/status.js）

状態の意味：design_only（レシピなし・従来の表示）／integrated（レシピを当て、全マップの自動の確認＝組み立てで失敗しない・ページのエラーなし・レシピと建物の形が歩けるマスの体の高さに入らない）／visual_checked（画面を撮って目で確認）／gameplay_checked（env=off と v1 の比較・論理を変えたマップの行ける所・3Dの回帰一式）／verified（実機・GPU・速さ。**この作業環境ではしていない＝0**）

## 数

| 種類 | design_only | integrated | visual_checked | gameplay_checked | verified |
|---|---|---|---|---|---|
| dungeon | 0 | 112 | 15 | 1 | 0 |
| field | 0 | 6 | 6 | 0 | 0 |
| interior | 0 | 419 | 9 | 1 | 0 |
| town | 0 | 13 | 14 | 3 | 0 |
| 合計 | 0 | 550 | 44 | 5 | 0 |

## マップごと

| マップID | 種類 | レシピ | 状態 | 前後の比較 | 論理の間取り（envlayout） | メモ |
|---|---|---|---|---|---|---|
| a3_aruna_hut | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_ciel_lookout | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_dark_command | interior | room_kit.v1:plank | integrated | - | - |  |
| a3_district_9 | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_dow_hunter | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_erased_cellar | interior | room_kit.v1:ashlar | integrated | - | - |  |
| a3_frost_keeper | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_harbor_net | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_ignas_smith_home | interior | room_kit.v1:panel | integrated | - | - |  |
| a3_kalion_estate | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_luxbell_dice | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_magicka_crafter | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_mirror_changer | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_mirror_changer_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_node_family | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_ruins_keeper | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_sahar_water | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_sahar_water_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_sentra_noble | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_star_tent | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| a3_star_tent_x72_2f | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| a3_tempus_clock | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_tempus_clock_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_verum_row | interior | room_kit.v1:plaster | integrated | - | - |  |
| a3_vol_lodging | interior | room_kit.v1:panel | integrated | - | - |  |
| a3_vol_lodging_x72_2f | interior | room_kit.v1:panel | integrated | - | - |  |
| a4_ac_press | dungeon | room_kit.v1:rock | integrated | - | 対象外（onStep） |  |
| a4_au_lamps | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow/n1 main climax |  |
| a4_dv_pool | dungeon | room_kit.v1:rock | integrated | - | 対象外（奥が近い（7）） |  |
| a4_fa_seal | dungeon | room_kit.v1:ashlar | integrated | - | 4マス・entry narrow main/p4 climax |  |
| a4_im_old | dungeon | room_kit.v1:rock | integrated | - | 17マス・entry narrow main+15/p2 climax |  |
| a4_lf_glade | dungeon | outdoor_kit.v1:forest | integrated | - | 2マス・entry narrow main/p2 climax |  |
| a4_ml_closed | dungeon | room_kit.v1:ashlar | integrated | - | 変更なし |  |
| a4_sc_shrine | dungeon | room_kit.v1:ashlar | integrated | - | 6マス・entry narrow/n3 main/p3 climax |  |
| a4_sf_spring | dungeon | outdoor_kit.v1:forest | integrated | - | 対象外（onStep） |  |
| a4_tt_sand | dungeon | room_kit.v1:ashlar | integrated | - | 4マス・entry narrow/n2 main/p2 climax |  |
| a6_af_control | dungeon | room_kit.v1:panel | integrated | - | 変更なし |  |
| a6_ap_canal | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（奥が近い（11）） |  |
| a6_ar_light | dungeon | room_kit.v1:ashlar | integrated | - | 変更なし |  |
| a6_bd_store | dungeon | room_kit.v1:ashlar | integrated | - | 2マス・entry narrow main/p2 climax |  |
| a6_ca_forge | dungeon | room_kit.v1:panel | integrated | - | 変更なし |  |
| a6_dc_statues | dungeon | room_kit.v1:ashlar | visual_checked | - | 1マス・entry narrow main/p1 climax |  |
| a6_dd_vents | dungeon | room_kit.v1:rock | integrated | - | 対象外（onStep） |  |
| a6_el_current | dungeon | room_kit.v1:rock | integrated | - | 対象外（onStep） |  |
| a6_em_hut | dungeon | outdoor_kit.v1:pass | integrated | 済 | 変更なし |  |
| a6_fg_armory | dungeon | room_kit.v1:ashlar | integrated | - | 3マス・entry narrow/n1 main/p2 climax |  |
| a6_ft_ice | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（onStep） |  |
| a6_gp_shelter | dungeon | outdoor_kit.v1:pass | integrated | 済 | 2マス・entry narrow main/p2 climax |  |
| a6_ka_ledger | dungeon | room_kit.v1:ashlar | integrated | - | 変更なし |  |
| a6_kl_scale | dungeon | room_kit.v1:panel | integrated | - | 変更なし |  |
| a6_mi_spring | dungeon | outdoor_kit.v1:pass | integrated | 済 | 変更なし |  |
| a6_mt_mirage | dungeon | room_kit.v1:ashlar | integrated | - | 3マス・entry narrow main/p3 climax |  |
| a6_mv_echo | dungeon | room_kit.v1:rock | integrated | - | 2マス・entry narrow main/p2 climax |  |
| a6_oc_vault | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow main/p1 climax |  |
| a6_od_scan | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow main/p1 climax |  |
| a6_ol_mixing | dungeon | room_kit.v1:panel | integrated | - | 変更なし |  |
| a6_or_lamps | dungeon | room_kit.v1:panel | integrated | - | 2マス・entry narrow main/p2 climax |  |
| a6_pn_cave | dungeon | room_kit.v1:rock | integrated | - | 2マス・entry narrow/n1 main/p1 climax |  |
| a6_sk_clouds | dungeon | outdoor_kit.v1:sky | integrated | - | 対象外（onStep） |  |
| a6_sr_hold | dungeon | room_kit.v1:plank | integrated | - | 変更なし |  |
| a6_st_rings | dungeon | outdoor_kit.v1:sky | integrated | - | 1マス・entry narrow main/p1 climax |  |
| a6_tb_exchange | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow main/p1 climax |  |
| a6_vh_store | dungeon | room_kit.v1:ashlar | integrated | - | 2マス・entry narrow/n2 main climax |  |
| a6_vu_numbers | dungeon | room_kit.v1:panel | integrated | - | 1マス・entry narrow main/p1 climax |  |
| a6_vw_doors | dungeon | room_kit.v1:ashlar | integrated | - | 3マス・entry narrow/n2 main climax/p1 |  |
| aruna_house_iris | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_house_yorn | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_house_yorn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_item | interior | room_kit.v1:plaster | visual_checked | 済 | - |  |
| aruna_lighthouse | interior | room_kit.v1:plaster | integrated | 済 | - |  |
| aruna_lighthouse_top | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_ruins | town | town_kit.v1 | integrated | 済 | 84マス・目印 clocktower |  |
| aruna_ruins_1 | dungeon | room_kit.v1:ashlar | integrated | - | 9マス・entry narrow/n1 main+3/p3 climax/p2 |  |
| aruna_ruins_2 | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow/n1 main climax |  |
| aruna_ruins_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_ruins_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_ruins_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_ruins_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_ruins_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_ruins_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| aruna_ruins_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| aruna_ruins_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| aruna_underground_1 | dungeon | room_kit.v1:ashlar | integrated | - | 16マス・entry narrow/n3 main+8/p4 climax/p1 |  |
| aruna_underground_2 | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow/n1 main climax |  |
| aruna_village | town | town_kit.v1 | visual_checked | 済 | 114マス・目印 lighthouse |  |
| aruna_village_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_village_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_village_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| aruna_village_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| aruna_village_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| aruna_village_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| asana_home | interior | room_kit.v1:plaster | integrated | - | - |  |
| asana_raid | town | town_kit.v1 | integrated | - | 対象外（s3121） |  |
| asana_rebuilt | town | town_kit.v1 | integrated | - | 対象外（s3121） |  |
| asana_ruins | town | town_kit.v1 | integrated | 済 | 対象外（s3121） |  |
| asana_village | town | town_kit.v1 | integrated | 済 | 対象外（s3121） |  |
| ash_cape | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（奥が近い（10）） |  |
| ash_cave_1 | dungeon | room_kit.v1:rock | integrated | - | 43マス・entry+3 narrow/n2 main+24/p4 climax+8/p2 |  |
| ash_cave_2 | dungeon | room_kit.v1:rock | integrated | - | 4マス・entry narrow/n2 main/p2 climax |  |
| ash_shore_hut | interior | room_kit.v1:plaster | integrated | - | - |  |
| auto_factory_1 | dungeon | room_kit.v1:panel | visual_checked | 済 | 11マス・entry narrow/n6 main/p4 climax/p1 |  |
| auto_factory_2 | dungeon | room_kit.v1:panel | integrated | - | 2マス・entry narrow/n1 main/p1 climax |  |
| bandit_hideout | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow/n1 main climax |  |
| cave_hidden_room | dungeon | room_kit.v1:rock | integrated | - | 対象外（奥が近い（11）） |  |
| ciel_harbor | interior | room_kit.v1:plaster | integrated | - | - |  |
| ciel_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| ciel_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| ciel_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| ciel_item_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| ciel_port | town | town_kit.v1 | integrated | 済 | 122マス・目印 crane |  |
| ciel_port_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| ciel_port_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| ciel_port_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| ciel_port_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| ciel_port_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| ciel_port_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| ciel_weapon | interior | room_kit.v1:plaster | integrated | - | - |  |
| crater_altar | dungeon | room_kit.v1:rock | integrated | - | 13マス・entry+4 narrow/n4 main+4/p1 climax |  |
| dark_armory | interior | room_kit.v1:plaster | integrated | - | - |  |
| dark_camp | town | town_kit.v1 | visual_checked | 済 | 85マス・目印 banner |  |
| dark_camp_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| dark_camp_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| dark_camp_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| dark_camp_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| dark_camp_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| dark_camp_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| dark_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| dark_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| dark_shop | interior | room_kit.v1:plaster | integrated | - | - |  |
| dark_tent_hald | interior | room_kit.v1:plank | integrated | - | - |  |
| dark_tent_hald_x72_2f | interior | room_kit.v1:plank | integrated | - | - |  |
| demon_castle_1 | dungeon | room_kit.v1:ashlar | visual_checked | 済 | 13マス・entry narrow/n5 main/p4 climax/p4 |  |
| demon_castle_2 | dungeon | room_kit.v1:ashlar | integrated | - | 5マス・entry narrow/n1 main/p4 climax |  |
| demon_castle_3 | dungeon | room_kit.v1:ashlar | integrated | - | 5マス・entry narrow/n1 main/p4 climax |  |
| demon_castle_4 | dungeon | room_kit.v1:ashlar | integrated | - | 5マス・entry narrow/n1 main/p4 climax |  |
| demon_castle_5 | dungeon | room_kit.v1:ashlar | integrated | - | 5マス・entry narrow/n2 main/p3 climax |  |
| demon_castle_gate | dungeon | room_kit.v1:ashlar | integrated | - | 6マス・entry narrow/n1 main/p4 climax/p1 |  |
| district_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| district_house_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| district_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| district_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| district_ration | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_dojo | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_house_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_village | town | town_kit.v1 | integrated | 済 | 167マス・目印 bigtree |  |
| dow_village_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_village_x72_ex1 | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_village_x72_ex1_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_village_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_village_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_village_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| dow_village_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| dow_village_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| dow_village_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| dow_weapon_shop | interior | outdoor_kit.v1:forest | integrated | - | - |  |
| dragon_vein_1 | dungeon | room_kit.v1:rock | integrated | - | 38マス・entry narrow/n5 main+13/p3 climax+13/p4 |  |
| dragon_vein_2 | dungeon | room_kit.v1:rock | integrated | - | 9マス・entry narrow main+9 climax |  |
| dragon_vein_deep_1 | dungeon | room_kit.v1:rock | integrated | - | 13マス・entry narrow/n1 main+11/p1 climax |  |
| dragon_vein_deep_2 | dungeon | room_kit.v1:rock | integrated | - | 6マス・entry narrow/n1 main/p4 climax/p1 |  |
| elmina_undersea | dungeon | room_kit.v1:rock | integrated | - | 5マス・entry narrow/n1 main/p4 climax |  |
| emal_pass | dungeon | outdoor_kit.v1:pass | visual_checked | 済 | 1マス・entry narrow/n1 main climax |  |
| erased_elder | interior | room_kit.v1:plaster | integrated | - | - |  |
| erased_elder_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| erased_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| erased_house_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| erased_village | town | town_kit.v1 | integrated | 済 | 56マス・目印 well |  |
| erased_village_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| erased_village_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| erased_village_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| erased_village_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| erased_village_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| forbidden_archive_1 | dungeon | room_kit.v1:ashlar | visual_checked | 済 | 9マス・entry narrow/n3 main/p2 climax/p4 |  |
| forbidden_archive_2 | dungeon | room_kit.v1:ashlar | integrated | - | 13マス・entry narrow/n6 main/p4 climax/p3 |  |
| forbidden_archive_3 | dungeon | room_kit.v1:ashlar | integrated | - | 6マス・entry narrow/n1 main/p4 climax/p1 |  |
| forest_hidden_room | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（奥が近い（11）） |  |
| frost_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_house_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_town | town | town_kit.v1 | visual_checked | 済 | 150マス・目印 glasslamps |  |
| frost_town_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_town_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_town_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| frost_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| frost_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| frost_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| frost_weapon | interior | room_kit.v1:plaster | integrated | - | - |  |
| frozen_tower_1 | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（onStep） |  |
| frozen_tower_2 | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（onStep） |  |
| frozen_tower_3 | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（onStep） |  |
| frozen_tower_4 | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（onStep） |  |
| grania_pass | dungeon | outdoor_kit.v1:pass | visual_checked | 済 | 1マス・entry narrow/n1 main climax |  |
| harbor_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_item_shop | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_ship_cabin | dungeon | ship_cabin.v1 | visual_checked | 済 | 対象外（noLayout） |  |
| harbor_ship_deck | dungeon | ship_deck.v1 | visual_checked | 済 | 対象外（noLayout） |  |
| harbor_tavern | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_town | town | town_kit.v1 | visual_checked | 済 | 235マス・目印 crane |  |
| harbor_town_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_town_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| harbor_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| harbor_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| harbor_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| harbor_warehouse | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_forge | interior | room_kit.v1:panel | integrated | - | - |  |
| ignas_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_house_1 | interior | room_kit.v1:panel | visual_checked | - | - |  |
| ignas_house_1_x72_2f | interior | room_kit.v1:panel | integrated | - | - |  |
| ignas_house_2 | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_town | town | town_kit.v1 | visual_checked | 済 | 126マス・目印 forge |  |
| ignas_town_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_town_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| ignas_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| ignas_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| ignas_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| iron_fort_gate | dungeon | room_kit.v1:ashlar | integrated | - | 2マス・entry narrow/n1 main/p1 climax |  |
| iron_mine_1 | dungeon | iron_mine_1.v1 | gameplay_checked | 済 | 対象外（専用レシピ） |  |
| iron_mine_2 | dungeon | room_kit.v1:rock | visual_checked | 済 | 6マス・entry narrow/n1 main/p2 climax/p3 |  |
| iron_mine_3 | dungeon | room_kit.v1:rock | integrated | - | 1マス・entry narrow main climax/p1 |  |
| kalion_archive_1 | dungeon | room_kit.v1:ashlar | integrated | - | 15マス・entry narrow/n3 main/p4 climax+4/p4 |  |
| kalion_archive_2 | dungeon | room_kit.v1:ashlar | integrated | - | 6マス・entry narrow main/p4 climax/p2 |  |
| kalion_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_church | interior | room_kit.v1:ashlar | visual_checked | 済 | - |  |
| kalion_city | town | town_kit.v1 | visual_checked | 済 | 191マス・目印 colonnade |  |
| kalion_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_ex1 | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_ex2 | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_ex2_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_ex3 | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_ex4 | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_ex4_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| kalion_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| kalion_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| kalion_finance | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_lab | dungeon | room_kit.v1:panel | integrated | - | 1マス・entry narrow main/p1 climax |  |
| kalion_tavern | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_tax | interior | room_kit.v1:plaster | integrated | - | - |  |
| kalion_weapon | interior | room_kit.v1:plaster | integrated | - | - |  |
| lost_forest | dungeon | outdoor_kit.v1:forest | visual_checked | 済 | 6マス・entry narrow/n4 main/p2 climax |  |
| lost_forest_shrine | dungeon | outdoor_kit.v1:forest | integrated | - | 4マス・entry narrow main/p3 climax/p1 |  |
| lost_forest_treasure | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（奥が近い（9）） |  |
| luxbell | town | town_kit.v1:casino | visual_checked | 済 | 173マス・目印 bell |  |
| luxbell_casino | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_dining | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_dining_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_labs | interior | room_kit.v1:panel | integrated | - | - |  |
| luxbell_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| luxbell_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| luxbell_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| luxbell_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| magicka_academy | interior | room_kit.v1:panel | integrated | - | - |  |
| magicka_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_church | interior | room_kit.v1:ashlar | integrated | - | - |  |
| magicka_city | town | town_kit.v1 | visual_checked | 済 | 155マス・目印 armillary |  |
| magicka_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_city_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_city_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_city_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| magicka_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| magicka_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| magicka_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_palace | interior | room_kit.v1:ashlar | visual_checked | 済 | - |  |
| magicka_palace_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| magicka_palace_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| magicka_palace_b1 | interior | room_kit.v1:ashlar | integrated | - | - |  |
| magicka_tavern | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| magicka_weapon | interior | room_kit.v1:plaster | integrated | - | - |  |
| memory_library | dungeon | room_kit.v1:ashlar | integrated | - | 10マス・entry narrow/n3 main+4/p2 climax/p1 |  |
| memory_library_seal | dungeon | room_kit.v1:ashlar | integrated | - | 変更なし |  |
| memory_market | interior | room_kit.v1:plaster | integrated | - | - |  |
| memory_vault | dungeon | room_kit.v1:rock | integrated | - | 9マス・entry narrow main climax+9 |  |
| mirage_temple_1 | dungeon | room_kit.v1:ashlar | integrated | 済 | 2マス・entry narrow/n1 main/p1 climax |  |
| mirage_temple_2 | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow/n1 main climax |  |
| mirage_temple_3 | dungeon | room_kit.v1:ashlar | integrated | - | 6マス・entry narrow/n1 main+4/p1 climax |  |
| mirage_temple_4 | dungeon | room_kit.v1:ashlar | integrated | - | 2マス・entry narrow/n2 main climax |  |
| mirror_market | town | town_kit.v1 | integrated | 済 | 32マス・目印 mirrors |  |
| mirror_market_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| mirror_market_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| mirror_market_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| mirror_market_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| mirror_market_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| mist_isle | dungeon | outdoor_kit.v1:pass | visual_checked | 済 | 変更なし |  |
| no_failure_school | interior | room_kit.v1:panel | integrated | - | - |  |
| node_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_city | town | node_city.v1 | gameplay_checked | 済 | 対象外（専用レシピ） |  |
| node_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_city_x72_ex1 | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_city_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_city_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| node_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| node_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| node_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_market | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_market_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_ration | interior | room_kit.v1:plaster | integrated | - | - |  |
| node_registry | interior | room_kit.v1:plaster | integrated | - | - |  |
| oblivion_cave_1 | dungeon | room_kit.v1:rock | visual_checked | 済 | 26マス・entry narrow/n2 main+12/p3 climax+8/p1 |  |
| oblivion_cave_2 | dungeon | room_kit.v1:rock | integrated | - | 32マス・entry narrow/n2 main+16/p4 climax+9/p1 |  |
| oblivion_cave_3 | dungeon | room_kit.v1:rock | integrated | - | 36マス・entry narrow/n2 main+23/p4 climax+6/p1 |  |
| oblivion_cave_lake | dungeon | room_kit.v1:rock | integrated | - | 7マス・entry narrow/n3 main/p2 climax/p2 |  |
| old_city_1 | dungeon | room_kit.v1:ashlar | integrated | - | 16マス・entry narrow/n6 main+4/p4 climax/p2 |  |
| old_city_2 | dungeon | room_kit.v1:ashlar | integrated | - | 5マス・entry narrow main/p4 climax/p1 |  |
| old_city_deep_1 | dungeon | room_kit.v1:ashlar | integrated | - | 8マス・entry narrow main+8 climax |  |
| old_city_deep_2 | dungeon | room_kit.v1:ashlar | integrated | - | 6マス・entry narrow/n1 main/p4 climax/p1 |  |
| oracle_core_1 | dungeon | room_kit.v1:panel | integrated | - | 3マス・entry narrow/n2 main/p1 climax |  |
| oracle_core_2 | dungeon | room_kit.v1:panel | integrated | - | 7マス・entry narrow/n3 main/p4 climax |  |
| oracle_core_3 | dungeon | room_kit.v1:panel | integrated | - | 1マス・entry narrow/n1 main climax |  |
| origin_lab_1 | dungeon | room_kit.v1:panel | integrated | - | 14マス・entry narrow/n7 main/p3 climax/p4 |  |
| origin_lab_2 | dungeon | room_kit.v1:panel | integrated | - | 9マス・entry narrow/n2 main/p4 climax/p3 |  |
| pirate_nest | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（奥が近い（10）） |  |
| poyo_barn | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_barn_2f | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_church | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_church_2f | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_church_3f | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_dojo | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_elder_house | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_elder_house_2f | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_hall | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_hall_2f | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_house | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_inn | interior | poyo_interior.v1 | visual_checked | 済 | - |  |
| poyo_inn_2f | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_item_shop | interior | poyo_interior.v1 | visual_checked | 済 | - |  |
| poyo_mill | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_village | town | poyo_village.v1 | gameplay_checked | 済 | 対象外（専用レシピ） |  |
| poyo_watch | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_watch_2f | interior | poyo_interior.v1 | integrated | 済 | - |  |
| poyo_watch_3f | interior | poyo_interior.v1 | integrated | 済 | - |  |
| rivel_armor_shop | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan | town | town_kit.v1 | integrated | 済 | 48マス・目印 forge |  |
| rivel_artisan_herbal | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan_smith | interior | room_kit.v1:panel | integrated | - | - |  |
| rivel_artisan_smith_x72_2f | interior | room_kit.v1:panel | integrated | - | - |  |
| rivel_artisan_weaver | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan_weaver_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_artisan_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_artisan_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_artisan_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_bank | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_castle | interior | rivel_castle.v1 | gameplay_checked | 済 | - |  |
| rivel_castle_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_castle_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_castle_4f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_castle_b1 | interior | room_kit.v1:ashlar | visual_checked | 済 | - |  |
| rivel_castle_library | interior | room_kit.v1:ashlar | visual_checked | 済 | - |  |
| rivel_church | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_guild | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_inn | interior | room_kit.v1:plaster | visual_checked | 済 | - |  |
| rivel_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_item_shop | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_tavern | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town | town | town_kit.v1 | visual_checked | 済 | 253マス・目印 fountain |  |
| rivel_town_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_ex1 | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_ex1_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_ex2 | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_ex3 | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_ex3_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_ex4 | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_ex4_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_ex5 | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| rivel_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_wave_temple | interior | room_kit.v1:ashlar | integrated | - | - |  |
| rivel_weapon_shop | interior | room_kit.v1:plaster | integrated | - | - |  |
| ruins_post | interior | room_kit.v1:ashlar | integrated | - | - |  |
| ruins_post_x72_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| ruins_store | interior | room_kit.v1:ashlar | integrated | - | - |  |
| ruins_store_x72_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sahar_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_church | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sahar_city | town | town_kit.v1 | visual_checked | 済 | 139マス・目印 cistern |  |
| sahar_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_city_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_city_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_city_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sahar_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sahar_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sahar_guild | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_water_office | interior | room_kit.v1:plaster | integrated | - | - |  |
| sahar_weapon | interior | room_kit.v1:plaster | integrated | - | - |  |
| sandstorm_corridor_1 | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（奥が近い（7）） |  |
| sandstorm_corridor_2 | dungeon | room_kit.v1:ashlar | integrated | - | 1マス・entry narrow main/p1 climax |  |
| scheduled_district | town | scheduled_district.v1 | visual_checked | 済 | 対象外（専用レシピ） |  |
| scheduled_district_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| scheduled_district_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| scheduled_district_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| scheduled_district_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| scheduled_district_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| scheduled_district_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| school_roof | interior | room_kit.v1:panel | integrated | - | - |  |
| sentra_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital | town | town_kit.v1 | integrated | 済 | 58マス・目印 pool |  |
| sentra_capital_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital_x72_ex1 | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital_x72_ex2 | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital_x72_ex2_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_capital_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sentra_capital_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sentra_capital_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sentra_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_knights | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_office | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_palace_1 | dungeon | room_kit.v1:ashlar | visual_checked | 済 | 4マス・entry narrow/n1 main/p2 climax/p1 |  |
| sentra_palace_2 | dungeon | room_kit.v1:ashlar | visual_checked | 済 | 2マス・entry narrow/n2 main climax |  |
| sentra_palace_vault | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sentra_palace_west | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sentra_palace_west_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| sentra_tavern | interior | room_kit.v1:plaster | integrated | - | - |  |
| sentra_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| sky_temple_1 | dungeon | outdoor_kit.v1:sky | visual_checked | 済 | 12マス・entry narrow/n4 main/p4 climax/p4 |  |
| sky_temple_2 | dungeon | outdoor_kit.v1:sky | integrated | - | 1マス・entry narrow/n1 main climax |  |
| spirit_forest_1 | dungeon | outdoor_kit.v1:forest | integrated | - | 7マス・entry narrow/n6 main climax/p1 |  |
| spirit_forest_2 | dungeon | outdoor_kit.v1:forest | integrated | - | 2マス・entry narrow/n1 main/p1 climax |  |
| star_camp | town | town_kit.v1 | integrated | 済 | 36マス |  |
| star_camp_x72_house | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| star_camp_x72_house_2f | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| star_camp_x72_tower | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| star_camp_x72_tower_2f | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| star_camp_x72_tower_3f | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| star_tower_1 | dungeon | outdoor_kit.v1:sky | integrated | - | 12マス・entry+4 narrow/n1 main+5/p2 climax |  |
| star_tower_2 | dungeon | outdoor_kit.v1:sky | integrated | - | 対象外（道が短い） |  |
| sunken_reef_1 | dungeon | room_kit.v1:plank | integrated | 済 | 8マス・entry narrow/n1 main climax+7 |  |
| sunken_reef_2 | dungeon | room_kit.v1:plank | integrated | - | 5マス・entry narrow/n2 main/p3 climax |  |
| temple_of_time_1 | dungeon | room_kit.v1:ashlar | integrated | - | 対象外（道が短い） |  |
| temple_of_time_2 | dungeon | room_kit.v1:ashlar | integrated | - | 5マス・entry narrow/n4 main/p1 climax |  |
| temple_of_time_3 | dungeon | room_kit.v1:ashlar | integrated | - | 変更なし |  |
| tempus_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_bell | interior | room_kit.v1:ashlar | integrated | - | - |  |
| tempus_church | interior | room_kit.v1:ashlar | integrated | - | - |  |
| tempus_city | town | town_kit.v1 | visual_checked | 済 | 136マス・目印 belltower |  |
| tempus_city_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_city_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_city_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_city_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_city_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_city_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| tempus_city_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| tempus_city_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| tempus_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| tempus_weapon | interior | room_kit.v1:plaster | integrated | - | - |  |
| time_bank | interior | room_kit.v1:plaster | integrated | - | - |  |
| time_bank_vault_1 | dungeon | room_kit.v1:ashlar | integrated | - | 変更なし |  |
| time_bank_vault_2 | dungeon | room_kit.v1:ashlar | integrated | - | 2マス・entry narrow main/p2 climax |  |
| tradia | town | tradia.v1 | gameplay_checked | 済 | 対象外（専用レシピ） |  |
| tradia_arena | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_armor | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_bank | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_exchange | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_foundation | interior | room_kit.v1:ashlar | integrated | - | - |  |
| tradia_guild | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_iq73 | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_item | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_lab | interior | room_kit.v1:panel | integrated | - | - |  |
| tradia_levex | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_mansion | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_sky | town | town_kit.v1:skyterrace | visual_checked | 済 | 8マス・目印 armillary |  |
| tradia_sky_boutique | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| tradia_sky_exchange | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| tradia_sky_lounge | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| tradia_sky_lounge_2f | interior | outdoor_kit.v1:sky | integrated | - | - |  |
| tradia_tavern | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_tavern_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_weapon | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_ex1 | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_ex1_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_ex2 | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_ex2_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_ex3 | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_ex4 | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| tradia_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| tradia_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| tradia_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| verum_dorm | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_dorm_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_factory | interior | room_kit.v1:panel | integrated | - | - |  |
| verum_hideout | dungeon | room_kit.v1:ashlar | integrated | - | 変更なし |  |
| verum_inn | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_inn_x72_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_overseer_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_ration | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_school | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_town | town | town_kit.v1 | visual_checked | 済 | 84マス・目印 headframe |  |
| verum_town_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_town_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_town_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_town_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_town_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| verum_town_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| verum_town_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| verum_town_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| void_wasteland_1 | dungeon | room_kit.v1:ashlar | integrated | - | 4マス・entry narrow main/p3 climax/p1 |  |
| void_wasteland_2 | dungeon | room_kit.v1:ashlar | integrated | - | 7マス・entry narrow/n2 main/p4 climax/p1 |  |
| vol_ancient | interior | room_kit.v1:panel | integrated | - | - |  |
| vol_dean | interior | room_kit.v1:panel | integrated | - | - |  |
| vol_dorm | interior | room_kit.v1:panel | integrated | - | - |  |
| vol_dorm_x72_2f | interior | room_kit.v1:panel | integrated | - | - |  |
| vol_lecture | interior | room_kit.v1:panel | integrated | - | - |  |
| vol_library | interior | room_kit.v1:ashlar | integrated | - | - |  |
| vol_mind | interior | room_kit.v1:panel | integrated | - | - |  |
| vol_observatory | interior | room_kit.v1:ashlar | integrated | - | - |  |
| vol_quantum | interior | room_kit.v1:panel | integrated | - | - |  |
| vol_under_1 | dungeon | room_kit.v1:panel | integrated | - | 11マス・entry narrow/n1 main/p3 climax+4/p3 |  |
| vol_under_2 | dungeon | room_kit.v1:panel | integrated | - | 5マス・entry narrow/n2 main/p3 climax |  |
| vol_under_gate | interior | room_kit.v1:panel | integrated | - | - |  |
| volatilia | town | town_kit.v1 | integrated | 済 | 194マス・目印 dome |  |
| volatilia_x72_ex0 | interior | room_kit.v1:plaster | integrated | - | - |  |
| volatilia_x72_ex0_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| volatilia_x72_ex1 | interior | room_kit.v1:plaster | integrated | - | - |  |
| volatilia_x72_hall | interior | room_kit.v1:plaster | integrated | - | - |  |
| volatilia_x72_house | interior | room_kit.v1:plaster | integrated | - | - |  |
| volatilia_x72_house_2f | interior | room_kit.v1:plaster | integrated | - | - |  |
| volatilia_x72_tower | interior | room_kit.v1:ashlar | integrated | - | - |  |
| volatilia_x72_tower_2f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| volatilia_x72_tower_3f | interior | room_kit.v1:ashlar | integrated | - | - |  |
| world | field | field_kit.v1 | visual_checked | 済 | - |  |
| world_dark | field | field_kit.v1 | integrated | 済 | - |  |
| world_desert | field | field_kit.v1 | integrated | 済 | - |  |
| world_dragon | field | field_kit.v1 | integrated | 済 | - |  |
| world_grania | field | field_kit.v1 | visual_checked | 済 | - |  |
| world_islands | field | field_kit.v1 | visual_checked | 済 | - |  |
| world_kalion | field | field_kit.v1 | integrated | 済 | - |  |
| world_machine | field | field_kit.v1 | visual_checked | 済 | - |  |
| world_magicka | field | field_kit.v1 | visual_checked | 済 | - |  |
| world_sky | field | field_kit.v1 | integrated | 済 | - |  |
| world_snow | field | field_kit.v1 | integrated | 済 | - |  |
| world_tempus | field | field_kit.v1 | visual_checked | 済 | - |  |
