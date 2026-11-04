# マップIDの差分（パックの330件 ↔ いまのゲーム）

作成：`docs/tools/env/build_profiles.js`（いまのゲームの全 MAP_DEFS を、後段の拡張・追加を読み込んだあとで数えた）。

- いまのゲーム：597件（interior 429・dungeon 126・town 30・field 12）
- パック（62900a3 時点）：330件
- 両方にある：330件
- 増えたID（パックにない）：267件（interior 262・town 5）。親のマップ（入口）・地域・建物の種類からプロファイルを作った（source: derived。設計の目安で、未実装）
- 消えたID（パックにあって、いまのゲームにない）：0件

## 増えたID

|mapId|名前|種類|地域|用途の系統|親|
|---|---|---|---|---|---|
|a3_mirror_changer_x72_2f|両替商の家 2階|interior|desert|house|a3_mirror_changer|
|a3_sahar_water_x72_2f|水売りの家 2階|interior|desert|house|a3_sahar_water|
|a3_star_tent_x72_2f|観測者の天幕 2階|interior|sky|observatory|a3_star_tent|
|a3_tempus_clock_x72_2f|時計職人の家 2階|interior|tempus|house|a3_tempus_clock|
|a3_vol_lodging_x72_2f|研究生の下宿 2階|interior|tempus|lab|a3_vol_lodging|
|aruna_house_yorn_x72_2f|ヨルンの家 2階|interior|islands|house|aruna_house_yorn|
|aruna_inn_x72_2f|灯りの宿 2階|interior|islands|inn|aruna_inn|
|aruna_ruins_x72_ex0|古道具屋|interior|islands|house|aruna_ruins|
|aruna_ruins_x72_ex0_2f|古道具屋 2階|interior|islands|house|aruna_ruins|
|aruna_ruins_x72_hall|寄り合い所|interior|islands|tavern|aruna_ruins|
|aruna_ruins_x72_house|空き家|interior|islands|house|aruna_ruins|
|aruna_ruins_x72_house_2f|空き家 2階|interior|islands|house|aruna_ruins|
|aruna_ruins_x72_tower|崩れかけた塔 1階|interior|islands|tower|aruna_ruins|
|aruna_ruins_x72_tower_2f|崩れかけた塔 2階|interior|islands|tower|aruna_ruins|
|aruna_ruins_x72_tower_3f|崩れかけた塔 3階（てっぺん）|interior|islands|tower|aruna_ruins|
|aruna_village_x72_hall|船乗りの酒場|interior|islands|tavern|aruna_village|
|aruna_village_x72_house|網元の家|interior|islands|house|aruna_village|
|aruna_village_x72_house_2f|網元の家 2階|interior|islands|house|aruna_village|
|aruna_village_x72_tower|小さな灯台 1階|interior|islands|tower|aruna_village|
|aruna_village_x72_tower_2f|小さな灯台 2階|interior|islands|tower|aruna_village|
|aruna_village_x72_tower_3f|小さな灯台 3階（てっぺん）|interior|islands|tower|aruna_village|
|asana_home|アサナ村・家|interior|arcadia|house|asana_village|
|asana_raid|アサナ村（襲撃の夜）|town|arcadia|village||
|asana_rebuilt|アサナ村（復興）|town|kalion|village||
|asana_ruins|アサナ村跡|town|kalion|ruin|world_kalion|
|asana_village|アサナ村|town|arcadia|village|asana_home|
|ciel_inn_x72_2f|流氷の宿 2階|interior|snow|inn|ciel_inn|
|ciel_item_x72_2f|港の道具屋 2階|interior|snow|shop|ciel_item|
|ciel_port_x72_hall|船乗りの酒場|interior|snow|tavern|ciel_port|
|ciel_port_x72_house|網元の家|interior|snow|house|ciel_port|
|ciel_port_x72_house_2f|網元の家 2階|interior|snow|house|ciel_port|
|ciel_port_x72_tower|小さな灯台 1階|interior|snow|tower|ciel_port|
|ciel_port_x72_tower_2f|小さな灯台 2階|interior|snow|tower|ciel_port|
|ciel_port_x72_tower_3f|小さな灯台 3階（てっぺん）|interior|snow|tower|ciel_port|
|dark_camp_x72_hall|作戦室|interior|dark|house|dark_camp|
|dark_camp_x72_house|兵士の宿舎|interior|dark|house|dark_camp|
|dark_camp_x72_house_2f|兵士の宿舎 2階|interior|dark|house|dark_camp|
|dark_camp_x72_tower|物見やぐら 1階|interior|dark|tower|dark_camp|
|dark_camp_x72_tower_2f|物見やぐら 2階|interior|dark|tower|dark_camp|
|dark_camp_x72_tower_3f|物見やぐら 3階（てっぺん）|interior|dark|tower|dark_camp|
|dark_inn_x72_2f|野戦宿舎 2階|interior|dark|inn|dark_inn|
|dark_tent_hald_x72_2f|外れの天幕 2階|interior|dark|camp|dark_tent_hald|
|district_house_x72_2f|居住ユニット 7-1 2階|interior|machine|house|district_house|
|district_inn_x72_2f|休息ユニット 2階|interior|machine|inn|district_inn|
|dow_house_x72_2f|狩人の家 2階|interior|arcadia|house|dow_house|
|dow_inn_x72_2f|ダウの村の宿屋 2階|interior|arcadia|inn|dow_inn|
|dow_village_x72_ex0|パン屋|interior|arcadia|house|dow_village|
|dow_village_x72_ex1|古道具屋|interior|arcadia|house|dow_village|
|dow_village_x72_ex1_2f|古道具屋 2階|interior|arcadia|house|dow_village|
|dow_village_x72_hall|狩人の小屋|interior|arcadia|tavern|dow_village|
|dow_village_x72_house|木こりの家|interior|arcadia|house|dow_village|
|dow_village_x72_house_2f|木こりの家 2階|interior|arcadia|house|dow_village|
|dow_village_x72_tower|樹上の見張り台 1階|interior|arcadia|tower|dow_village|
|dow_village_x72_tower_2f|樹上の見張り台 2階|interior|arcadia|tower|dow_village|
|dow_village_x72_tower_3f|樹上の見張り台 3階（てっぺん）|interior|arcadia|tower|dow_village|
|erased_elder_x72_2f|村長の家 2階|interior|kalion|house|erased_elder|
|erased_house_x72_2f|病人の家 2階|interior|kalion|house|erased_house|
|erased_village_x72_house|空き家|interior|kalion|house|erased_village|
|erased_village_x72_house_2f|空き家 2階|interior|kalion|house|erased_village|
|erased_village_x72_tower|崩れかけた塔 1階|interior|kalion|tower|erased_village|
|erased_village_x72_tower_2f|崩れかけた塔 2階|interior|kalion|tower|erased_village|
|erased_village_x72_tower_3f|崩れかけた塔 3階（てっぺん）|interior|kalion|tower|erased_village|
|frost_house_x72_2f|リクの家 2階|interior|snow|house|frost_house|
|frost_inn_x72_2f|雪灯りの宿 2階|interior|snow|inn|frost_inn|
|frost_town_x72_ex0|学者の家|interior|snow|house|frost_town|
|frost_town_x72_hall|暖炉の集会所|interior|snow|tavern|frost_town|
|frost_town_x72_house|漁師の家|interior|snow|house|frost_town|
|frost_town_x72_house_2f|漁師の家 2階|interior|snow|house|frost_town|
|frost_town_x72_tower|氷の見張り塔 1階|interior|snow|tower|frost_town|
|frost_town_x72_tower_2f|氷の見張り塔 2階|interior|snow|tower|frost_town|
|frost_town_x72_tower_3f|氷の見張り塔 3階（てっぺん）|interior|snow|tower|frost_town|
|harbor_inn_x72_2f|マリナの宿屋 2階|interior|arcadia|inn|harbor_inn|
|harbor_tavern_x72_2f|マリナの酒場 2階|interior|arcadia|tavern|harbor_tavern|
|harbor_town_x72_hall|船乗りの酒場|interior|arcadia|tavern|harbor_town|
|harbor_town_x72_house|網元の家|interior|arcadia|house|harbor_town|
|harbor_town_x72_house_2f|網元の家 2階|interior|arcadia|house|harbor_town|
|harbor_town_x72_tower|小さな灯台 1階|interior|arcadia|tower|harbor_town|
|harbor_town_x72_tower_2f|小さな灯台 2階|interior|arcadia|tower|harbor_town|
|harbor_town_x72_tower_3f|小さな灯台 3階（てっぺん）|interior|arcadia|tower|harbor_town|
|ignas_house_1_x72_2f|鍛冶職人の家 2階|interior|dragon|factory|ignas_house_1|
|ignas_inn_x72_2f|熾火の宿 2階|interior|dragon|inn|ignas_inn|
|ignas_town_x72_hall|鍛冶の工房|interior|dragon|house|ignas_town|
|ignas_town_x72_house|鍛冶師の家|interior|dragon|house|ignas_town|
|ignas_town_x72_house_2f|鍛冶師の家 2階|interior|dragon|house|ignas_town|
|ignas_town_x72_tower|火の見やぐら 1階|interior|dragon|tower|ignas_town|
|ignas_town_x72_tower_2f|火の見やぐら 2階|interior|dragon|tower|ignas_town|
|ignas_town_x72_tower_3f|火の見やぐら 3階（てっぺん）|interior|dragon|tower|ignas_town|
|kalion_city_x72_ex0|学者の家|interior|kalion|house|kalion_city|
|kalion_city_x72_ex1|花屋|interior|kalion|house|kalion_city|
|kalion_city_x72_ex2|仕立て屋|interior|kalion|house|kalion_city|
|kalion_city_x72_ex2_2f|仕立て屋 2階|interior|kalion|house|kalion_city|
|kalion_city_x72_ex3|パン屋|interior|kalion|house|kalion_city|
|kalion_city_x72_ex4|古道具屋|interior|kalion|house|kalion_city|
|kalion_city_x72_ex4_2f|古道具屋 2階|interior|kalion|house|kalion_city|
|kalion_city_x72_hall|公文書館|interior|kalion|house|kalion_city|
|kalion_city_x72_house|書記官の家|interior|kalion|house|kalion_city|
|kalion_city_x72_house_2f|書記官の家 2階|interior|kalion|house|kalion_city|
|kalion_city_x72_tower|記録の塔 1階|interior|kalion|tower|kalion_city|
|kalion_city_x72_tower_2f|記録の塔 2階|interior|kalion|tower|kalion_city|
|kalion_city_x72_tower_3f|記録の塔 3階（てっぺん）|interior|kalion|tower|kalion_city|
|kalion_inn_x72_2f|徴収都市の宿 2階|interior|kalion|inn|kalion_inn|
|kalion_tavern_x72_2f|裏通りの酒場 2階|interior|kalion|tavern|kalion_tavern|
|luxbell_dining_x72_2f|ラックスベル食堂 2階|interior|kalion|tavern|luxbell_dining|
|luxbell_inn_x72_2f|金の鈴亭 2階|interior|kalion|house|luxbell_inn|
|luxbell_x72_ex0|古道具屋|interior|kalion|house|luxbell|
|luxbell_x72_ex0_2f|古道具屋 2階|interior|kalion|house|luxbell|
|luxbell_x72_hall|小さな劇場|interior|kalion|tavern|luxbell|
|luxbell_x72_house|踊り子の家|interior|kalion|house|luxbell|
|luxbell_x72_house_2f|踊り子の家 2階|interior|kalion|house|luxbell|
|luxbell_x72_tower|展望タワー 1階|interior|kalion|tower|luxbell|
|luxbell_x72_tower_2f|展望タワー 2階|interior|kalion|tower|luxbell|
|luxbell_x72_tower_3f|展望タワー 3階（てっぺん）|interior|kalion|tower|luxbell|
|magicka_city_x72_ex0|仕立て屋|interior|magicka|house|magicka_city|
|magicka_city_x72_ex0_2f|仕立て屋 2階|interior|magicka|house|magicka_city|
|magicka_city_x72_hall|魔導書の書庫|interior|magicka|house|magicka_city|
|magicka_city_x72_house|魔導士の家|interior|magicka|house|magicka_city|
|magicka_city_x72_house_2f|魔導士の家 2階|interior|magicka|house|magicka_city|
|magicka_city_x72_tower|魔導の塔 1階|interior|magicka|tower|magicka_city|
|magicka_city_x72_tower_2f|魔導の塔 2階|interior|magicka|tower|magicka_city|
|magicka_city_x72_tower_3f|魔導の塔 3階（てっぺん）|interior|magicka|tower|magicka_city|
|magicka_inn_x72_2f|星詠みの宿 2階|interior|magicka|inn|magicka_inn|
|magicka_palace_3f|魔導王宮 3階（天文の間）|interior|magicka|castle|magicka_palace_2f|
|magicka_tavern_x72_2f|魔導士の酒場 2階|interior|magicka|tavern|magicka_tavern|
|mirror_market_x72_house|隊商の家|interior|desert|house|mirror_market|
|mirror_market_x72_house_2f|隊商の家 2階|interior|desert|house|mirror_market|
|mirror_market_x72_tower|物見やぐら 1階|interior|desert|tower|mirror_market|
|mirror_market_x72_tower_2f|物見やぐら 2階|interior|desert|tower|mirror_market|
|mirror_market_x72_tower_3f|物見やぐら 3階（てっぺん）|interior|desert|tower|mirror_market|
|node_city_x72_ex0|学者の家|interior|machine|house|node_city|
|node_city_x72_ex1|花屋|interior|machine|house|node_city|
|node_city_x72_hall|整備工場|interior|machine|house|node_city|
|node_city_x72_house|技師の家|interior|machine|house|node_city|
|node_city_x72_house_2f|技師の家 2階|interior|machine|house|node_city|
|node_city_x72_tower|観測塔 1階|interior|machine|tower|node_city|
|node_city_x72_tower_2f|観測塔 2階|interior|machine|tower|node_city|
|node_city_x72_tower_3f|観測塔 3階（てっぺん）|interior|machine|tower|node_city|
|node_inn_x72_2f|休息区画 2階|interior|machine|inn|node_inn|
|node_market_x72_2f|自由市場 2階|interior|machine|house|node_market|
|poyo_barn|ポヨ村の納屋|interior|arcadia|house|poyo_barn_2f|
|poyo_barn_2f|ポヨ村の納屋（屋根裏）|interior|arcadia|house|poyo_barn|
|poyo_church_2f|ポヨ村の教会 2階（聖歌隊席）|interior|arcadia|church|poyo_church|
|poyo_church_3f|ポヨ村の教会 3階（鐘楼）|interior|arcadia|church|poyo_church|
|poyo_elder_house_2f|村長の家 2階|interior|arcadia|house|poyo_elder_house|
|poyo_hall|ポヨ村の集会所|interior|arcadia|house|poyo_hall_2f|
|poyo_hall_2f|ポヨ村の集会所 2階（記録の部屋）|interior|arcadia|house|poyo_hall|
|poyo_inn_2f|ポヨ村の宿屋 2階（客室）|interior|arcadia|inn|poyo_inn|
|poyo_mill|ポヨ村の水車小屋|interior|arcadia|house|poyo_village|
|poyo_watch|見張り台 1階|interior|arcadia|tower|poyo_village|
|poyo_watch_2f|見張り台 2階|interior|arcadia|tower|poyo_village|
|poyo_watch_3f|見張り台 3階（てっぺん）|interior|arcadia|tower|poyo_village|
|rivel_artisan_smith_x72_2f|鍛冶屋の工房 2階|interior|arcadia|factory|rivel_artisan_smith|
|rivel_artisan_weaver_x72_2f|機織りの家 2階|interior|arcadia|house|rivel_artisan_weaver|
|rivel_artisan_x72_ex0|仕立て屋|interior|arcadia|house|rivel_artisan|
|rivel_artisan_x72_ex0_2f|仕立て屋 2階|interior|arcadia|house|rivel_artisan|
|rivel_artisan_x72_hall|騎士の詰所|interior|arcadia|house|rivel_artisan|
|rivel_artisan_x72_house|騎士の家|interior|arcadia|house|rivel_artisan|
|rivel_artisan_x72_house_2f|騎士の家 2階|interior|arcadia|house|rivel_artisan|
|rivel_artisan_x72_tower|見張りの塔 1階|interior|arcadia|tower|rivel_artisan|
|rivel_artisan_x72_tower_2f|見張りの塔 2階|interior|arcadia|tower|rivel_artisan|
|rivel_artisan_x72_tower_3f|見張りの塔 3階（てっぺん）|interior|arcadia|tower|rivel_artisan|
|rivel_castle_4f|リヴェル城 屋上（物見台）|interior|arcadia|castle|rivel_castle_3f|
|rivel_castle_library|リヴェル城 王立図書室|interior|arcadia|castle|rivel_castle_2f|
|rivel_inn_x72_2f|リヴェルの宿屋 2階|interior|arcadia|inn|rivel_inn|
|rivel_tavern_x72_2f|リヴェルの酒場 2階|interior|arcadia|tavern|rivel_tavern|
|rivel_town_x72_ex0|花屋|interior|arcadia|house|rivel_town|
|rivel_town_x72_ex1|仕立て屋|interior|arcadia|house|rivel_town|
|rivel_town_x72_ex1_2f|仕立て屋 2階|interior|arcadia|house|rivel_town|
|rivel_town_x72_ex2|パン屋|interior|arcadia|house|rivel_town|
|rivel_town_x72_ex3|古道具屋|interior|arcadia|house|rivel_town|
|rivel_town_x72_ex3_2f|古道具屋 2階|interior|arcadia|house|rivel_town|
|rivel_town_x72_ex4|画家のアトリエ|interior|arcadia|house|rivel_town|
|rivel_town_x72_ex4_2f|画家のアトリエ 2階|interior|arcadia|house|rivel_town|
|rivel_town_x72_ex5|学者の家|interior|arcadia|house|rivel_town|
|rivel_town_x72_hall|騎士の詰所|interior|arcadia|house|rivel_town|
|rivel_town_x72_house|騎士の家|interior|arcadia|house|rivel_town|
|rivel_town_x72_house_2f|騎士の家 2階|interior|arcadia|house|rivel_town|
|rivel_town_x72_tower|見張りの塔 1階|interior|arcadia|tower|rivel_town|
|rivel_town_x72_tower_2f|見張りの塔 2階|interior|arcadia|tower|rivel_town|
|rivel_town_x72_tower_3f|見張りの塔 3階（てっぺん）|interior|arcadia|tower|rivel_town|
|rivel_wave_temple|波形聖堂|interior|arcadia|church|rivel_town|
|ruins_post_x72_2f|郵便局跡 2階|interior|islands|ruin|ruins_post|
|ruins_store_x72_2f|倉庫跡 2階|interior|islands|ruin|ruins_store|
|sahar_city_x72_ex0|仕立て屋|interior|desert|house|sahar_city|
|sahar_city_x72_ex0_2f|仕立て屋 2階|interior|desert|house|sahar_city|
|sahar_city_x72_hall|隊商宿|interior|desert|tavern|sahar_city|
|sahar_city_x72_house|隊商の家|interior|desert|house|sahar_city|
|sahar_city_x72_house_2f|隊商の家 2階|interior|desert|house|sahar_city|
|sahar_city_x72_tower|物見やぐら 1階|interior|desert|tower|sahar_city|
|sahar_city_x72_tower_2f|物見やぐら 2階|interior|desert|tower|sahar_city|
|sahar_city_x72_tower_3f|物見やぐら 3階（てっぺん）|interior|desert|tower|sahar_city|
|sahar_inn_x72_2f|砂の宿 2階|interior|desert|inn|sahar_inn|
|scheduled_district_x72_hall|整備工場|interior|machine|house|scheduled_district|
|scheduled_district_x72_house|技師の家|interior|machine|house|scheduled_district|
|scheduled_district_x72_house_2f|技師の家 2階|interior|machine|house|scheduled_district|
|scheduled_district_x72_tower|観測塔 1階|interior|machine|tower|scheduled_district|
|scheduled_district_x72_tower_2f|観測塔 2階|interior|machine|tower|scheduled_district|
|scheduled_district_x72_tower_3f|観測塔 3階（てっぺん）|interior|machine|tower|scheduled_district|
|sentra_capital_x72_ex0|仕立て屋|interior|kalion|house|sentra_capital|
|sentra_capital_x72_ex0_2f|仕立て屋 2階|interior|kalion|house|sentra_capital|
|sentra_capital_x72_ex1|パン屋|interior|kalion|house|sentra_capital|
|sentra_capital_x72_ex2|古道具屋|interior|kalion|house|sentra_capital|
|sentra_capital_x72_ex2_2f|古道具屋 2階|interior|kalion|house|sentra_capital|
|sentra_capital_x72_hall|公文書館|interior|kalion|house|sentra_capital|
|sentra_capital_x72_house|書記官の家|interior|kalion|house|sentra_capital|
|sentra_capital_x72_house_2f|書記官の家 2階|interior|kalion|house|sentra_capital|
|sentra_capital_x72_tower|記録の塔 1階|interior|kalion|tower|sentra_capital|
|sentra_capital_x72_tower_2f|記録の塔 2階|interior|kalion|tower|sentra_capital|
|sentra_capital_x72_tower_3f|記録の塔 3階（てっぺん）|interior|kalion|tower|sentra_capital|
|sentra_inn_x72_2f|王都の宿 2階|interior|kalion|inn|sentra_inn|
|sentra_palace_west_3f|王宮 西棟 3階|interior|kalion|castle|sentra_palace_west|
|sentra_tavern_x72_2f|王都の酒場 2階|interior|kalion|tavern|sentra_tavern|
|star_camp_x72_house|天文家の家|interior|sky|house|star_camp|
|star_camp_x72_house_2f|天文家の家 2階|interior|sky|house|star_camp|
|star_camp_x72_tower|星見台 1階|interior|sky|tower|star_camp|
|star_camp_x72_tower_2f|星見台 2階|interior|sky|tower|star_camp|
|star_camp_x72_tower_3f|星見台 3階（てっぺん）|interior|sky|tower|star_camp|
|tempus_city_x72_ex0|画家のアトリエ|interior|tempus|house|tempus_city|
|tempus_city_x72_ex0_2f|画家のアトリエ 2階|interior|tempus|house|tempus_city|
|tempus_city_x72_hall|時計工房|interior|tempus|house|tempus_city|
|tempus_city_x72_house|時計職人の家|interior|tempus|house|tempus_city|
|tempus_city_x72_house_2f|時計職人の家 2階|interior|tempus|house|tempus_city|
|tempus_city_x72_tower|小さな時計塔 1階|interior|tempus|tower|tempus_city|
|tempus_city_x72_tower_2f|小さな時計塔 2階|interior|tempus|tower|tempus_city|
|tempus_city_x72_tower_3f|小さな時計塔 3階（てっぺん）|interior|tempus|tower|tempus_city|
|tempus_inn_x72_2f|刻の宿 2階|interior|tempus|inn|tempus_inn|
|tradia_foundation|トレード財団 本部|interior|magicka|archive|tradia|
|tradia_inn_x72_2f|宿屋「満期の宿」 2階|interior|magicka|inn|tradia_inn|
|tradia_iq73|IQテストの館|interior|magicka|house|tradia|
|tradia_sky|空の区画トレディア・スカイ|town|magicka|magic|tradia|
|tradia_sky_boutique|スカイ・ブティック|interior|magicka|shop|tradia|
|tradia_sky_exchange|スカイ取引所|interior|magicka|house|tradia|
|tradia_sky_lounge|展望ラウンジ 1階|interior|magicka|inn|tradia|
|tradia_sky_lounge_2f|展望ラウンジ 2階|interior|magicka|inn|tradia|
|tradia_tavern_x72_2f|トレーダーの酒場「損切り亭」 2階|interior|magicka|tavern|tradia_tavern|
|tradia_x72_ex0|パン屋|interior|magicka|house|tradia|
|tradia_x72_ex1|古道具屋|interior|magicka|house|tradia|
|tradia_x72_ex1_2f|古道具屋 2階|interior|magicka|house|tradia|
|tradia_x72_ex2|画家のアトリエ|interior|magicka|house|tradia|
|tradia_x72_ex2_2f|画家のアトリエ 2階|interior|magicka|house|tradia|
|tradia_x72_ex3|学者の家|interior|magicka|house|tradia|
|tradia_x72_ex4|花屋|interior|magicka|house|tradia|
|tradia_x72_hall|トレーダーの研究室|interior|magicka|house|tradia|
|tradia_x72_house|エンジニアの家|interior|magicka|house|tradia|
|tradia_x72_house_2f|エンジニアの家 2階|interior|magicka|house|tradia|
|tradia_x72_tower|展望塔 1階|interior|magicka|tower|tradia|
|tradia_x72_tower_2f|展望塔 2階|interior|magicka|tower|tradia|
|tradia_x72_tower_3f|展望塔 3階（てっぺん）|interior|magicka|tower|tradia|
|verum_dorm_x72_2f|労働者の宿舎 2階|interior|grania|inn|verum_dorm|
|verum_inn_x72_2f|坑夫の宿 2階|interior|grania|inn|verum_inn|
|verum_town_x72_ex0|画家のアトリエ|interior|grania|house|verum_town|
|verum_town_x72_ex0_2f|画家のアトリエ 2階|interior|grania|house|verum_town|
|verum_town_x72_hall|坑夫の休み処|interior|grania|tavern|verum_town|
|verum_town_x72_house|坑夫の長屋|interior|grania|house|verum_town|
|verum_town_x72_house_2f|坑夫の長屋 2階|interior|grania|house|verum_town|
|verum_town_x72_tower|立坑のやぐら 1階|interior|grania|tower|verum_town|
|verum_town_x72_tower_2f|立坑のやぐら 2階|interior|grania|tower|verum_town|
|verum_town_x72_tower_3f|立坑のやぐら 3階（てっぺん）|interior|grania|tower|verum_town|
|vol_dorm_x72_2f|研究者の居住区 2階|interior|tempus|lab|vol_dorm|
|volatilia_x72_ex0|画家のアトリエ|interior|tempus|house|volatilia|
|volatilia_x72_ex0_2f|画家のアトリエ 2階|interior|tempus|house|volatilia|
|volatilia_x72_ex1|学者の家|interior|tempus|house|volatilia|
|volatilia_x72_hall|学生の自習室|interior|tempus|house|volatilia|
|volatilia_x72_house|学生寮|interior|tempus|house|volatilia|
|volatilia_x72_house_2f|学生寮 2階|interior|tempus|house|volatilia|
|volatilia_x72_tower|天文塔 1階|interior|tempus|tower|volatilia|
|volatilia_x72_tower_2f|天文塔 2階|interior|tempus|tower|volatilia|
|volatilia_x72_tower_3f|天文塔 3階（てっぺん）|interior|tempus|tower|volatilia|
