# 追加の敵35体：対応表（正式名 → 最終ID → 画像 → 実際の出現）

素材：`trade_quest_additional_enemies_35_20261104.zip`（manifest.json を正本として照合。パックの manifest は `docs/enemies-add35-manifest.json` にそのまま置いた）。
データ：`js/data/enemies-add35.js`（画像の表 `ENEMY_ADD35.list`・新しい敵25体・新しい行動・出現表）。表は `docs/tools/v75/mkmapping.js` で、いまのゲームのデータ（MAP_DEFS・ENEMIES）から作った。

## 区分（新規登録 25・既存IDを使う 10・未接続 0）

- **新規登録（25体）**：ID は manifest の提案ID（`tq_add_*`）のまま。図鑑では既存の敵のあと（既存の番号はずれない）。
- **既存IDを使う（10体）**：ゲームにもとからいる敵と同じ人物と判断した。新しいIDは作らず、既存のIDにこのパックの名前と画像をつないだ。能力・出現・報酬・物語での使われ方は変えていない（4体は外見に合わせた行動を「足した」。下の表）。
- **未接続**：なし。

### 既存IDを使う10体：判断の根拠と差分

判断の根拠：10体とも、ゲームのもとの名前（`ENEMIES[id].legacyName`＝v7.2 で名前を変える前の名前）が、パックの名前と同じか、ほぼ同じ（「シンプル教信徒」と「シンプル教の信徒」・「インジケーター依存メイジ」と「インジ依存メイジ」）。どれも同じトレードの考え方の敵（陽線・陰線・逆張り・損切り・ナンピン・フルレバ・コツコツドカン・ポジポジ・インジケーター依存）で、パックが求める個性（フルレバオーガ＝高火力、コツコツドカンナイト＝ドカン、ナンピンゴブリン＝買い増し、ポジポジファントム＝弱い連続行動）も、もとの敵が持っている。

| パックの名前 | 既存ID | もとの名前 | v7.2（164体の差し替え）の名前 → いまの名前 | 変えたこと | 変えていないこと |
|---|---|---|---|---|---|
| 陽線スライム | `yosen_slime` | 陽線スライム | 朱陽の伸柱蟲 → 陽線スライム | 名前・画像 | 能力・行動・出現・報酬 |
| 陰線スライム | `insen_slime` | 陰線スライム | 蒼陰の垂錘獣 → 陰線スライム | 名前・画像 | 同上 |
| 逆張りバット | `contrarian_bat` | 逆張りバット | 逆波翼の返り蝠 → 逆張りバット | 名前・画像・行動「逆張りの構え」を足した | 能力・もとの行動（逆張り突撃・吸血）・出現・報酬 |
| 損切りゾンビ | `stoploss_zombie` | 損切りゾンビ | 断札鋏の亡者 → 損切りゾンビ | 名前・画像 | 能力・行動・出現・報酬 |
| ナンピンゴブリン | `nanpin_goblin` | ナンピンゴブリン | 買増袋の坑小鬼 → ナンピンゴブリン | 名前・画像・行動「買い増し」（攻撃力の重ねがけ）を足した | 能力・もとの行動（仲間を増やす）・出現・報酬 |
| シンプル教の信徒 | `simple_cultist` | シンプル教信徒 | 一線杖の修験者 → シンプル教の信徒 | 名前・画像 | 能力・行動・出現・報酬 |
| フルレバオーガ | `fullleva_ogre` | フルレバオーガ | 過積錘の巨漢 → フルレバオーガ | 名前・画像・「フルレバ一撃」のあとに隙（2ターン 守備−40%・素早さ−30%） | 能力・一撃の威力1.8・出現・報酬 |
| コツコツドカンナイト | `kotsukotsu_knight` | コツコツドカンナイト | 積銭鎧の崩騎士 → コツコツドカンナイト | 名前・画像・「ドカン」の前に予告（溜め）を入れた | 能力・ドカンの威力2.2・コツコツ・硬化・出現・報酬 |
| ポジポジファントム | `pojipoji_phantom` | ポジポジファントム | 注文環の迷走霊 → ポジポジファントム | 名前・画像（弱い連続行動はもとからある） | 能力・行動・出現・報酬 |
| インジ依存メイジ | `indicator_mage` | インジケーター依存メイジ | 多針盤の盲術師 → インジ依存メイジ | 名前・画像 | 能力・行動・出現・報酬 |

- v7.2 の164体の差し替えの表（`js/data/enemy-redesign.js`）は消していない。この10体については、今回のパックの名前・画像を優先する（`js/core/enemyart.js`）。v7.2 の名前・画像に戻したいときは、`js/data/enemies-add35.js` の画像の表からその行を外す（または `reuse` の10体だけを外す）。
- URL に `?enemyart=old` をつけたときは、従来どおり新しい名前・画像を使わない（この10体はもとの名前・もとの絵。新しい25体はほかの絵がないので、このパックの絵）。

### 重複の確認（パックが名指しした3体など）

- **悪徳議員**：同じ名前・似た名前の敵はない。近いものは章ボス「裏切りの大臣ヴォルク」（`boss_minister`。ボス・別の人物）だけ → 新規登録。
- **強盗**：同じ名前の敵はない。近いものは「荒野の曲刀賊」（`bandit`。もとの名前「山賊」）・「楔弓の崖盗」（`bandit_archer`）→ 山賊と強盗は別の敵として新規登録（同じ出現表に一緒に出ることがある）。
- **ギャランティック星人**：宇宙人の敵はゲームにない → 新規登録。
- そのほかの22体：同じ名前・同じ考え方の敵はない（「インプ」と「飽性の小悪魔」、「監視ドローン群」（ボス）と「人間監視用AIドローン」は、名前も役割も別）。

## 35体の対応表

| 番号 | 正式名（name_ja） | 区分 | 最終ID | 画像（ゲームが読むもの） | 実際の出現（マップ名［マップID］・出現表・適正レベル） | Lv | 体格 |
|---|---|---|---|---|---|---|---|
| 001 | サイバーヒューマン | 新規登録 | `tq_add_cyber_human` | `assets/enemies_add35/001_tq_add_cyber_human.webp` | ゼロメア［world_machine］・旧都市の崖・25<br>オラクル中枢 第2層（記録層）［oracle_core_2］・中枢・26<br>（同じ出現表を使う隠し区画：a6_or_lamps） | 25 | normal |
| 002 | 飽性の小悪魔 | 新規登録 | `tq_add_boredom_imp` | `assets/enemies_add35/002_tq_add_boredom_imp.webp` | 忘却の洞窟 1階［oblivion_cave_1］・忘却の洞窟・5<br>忘却の洞窟 2階［oblivion_cave_2］・忘却の洞窟・6 | 5 | small |
| 003 | ワカメ頭 | 新規登録 | `tq_add_wakame_head` | `assets/enemies_add35/003_tq_add_wakame_head.webp` | 断裂群島［world_islands］・灰灯島の草地・18<br>霧の島［mist_isle］・霧の島・20<br>（同じ出現表を使う隠し区画：a6_mi_spring） | 18 | small |
| 004 | 陽線スライム | 既存IDを使う | `yosen_slime`（提案ID `tq_add_bullish_slime` は使わない） | `assets/enemies_add35/004_tq_add_bullish_slime.webp` | アルカディア相場大陸［world］・始まりの草原・1<br>アルカディア相場大陸［world］・ダウの大森林・3 | 2 | small |
| 005 | 陰線スライム | 既存IDを使う | `insen_slime`（提案ID `tq_add_bearish_slime` は使わない） | `assets/enemies_add35/005_tq_add_bearish_slime.webp` | アルカディア相場大陸［world］・始まりの草原・1<br>アルカディア相場大陸［world］・ダウの大森林・3 | 3 | small |
| 006 | シンプル教の信徒 | 既存IDを使う | `simple_cultist`（提案ID `tq_add_simplicity_acolyte` は使わない） | `assets/enemies_add35/006_tq_add_simplicity_acolyte.webp` | グラニア鉱業地方［world_grania］・グラニアの灰野・10 | 11 | normal |
| 007 | 損切りゾンビ | 既存IDを使う | `stoploss_zombie`（提案ID `tq_add_stoploss_zombie` は使わない） | `assets/enemies_add35/007_tq_add_stoploss_zombie.webp` | 忘却の洞窟 1階［oblivion_cave_1］・忘却の洞窟・5<br>忘却の洞窟 2階［oblivion_cave_2］・忘却の洞窟・6 | 6 | normal |
| 008 | ナンピンゴブリン | 既存IDを使う | `nanpin_goblin`（提案ID `tq_add_averaging_goblin` は使わない） | `assets/enemies_add35/008_tq_add_averaging_goblin.webp` | アルカディア相場大陸［world］・エマール山脈・7<br>エマール山道［emal_pass］・エマール山道・8<br>（同じ出現表を使う隠し区画：a6_em_hut） | 8 | small |
| 009 | フルレバオーガ | 既存IDを使う | `fullleva_ogre`（提案ID `tq_add_full_leverage_ogre` は使わない） | `assets/enemies_add35/009_tq_add_full_leverage_ogre.webp` | カリオン徴収連邦［world_kalion］・カリオン平野・13<br>カリオン徴収連邦［world_kalion］・王都周辺・15 | 14 | big |
| 010 | 逆張りバット | 既存IDを使う | `contrarian_bat`（提案ID `tq_add_contrarian_bat` は使わない） | `assets/enemies_add35/010_tq_add_contrarian_bat.webp` | アルカディア相場大陸［world］・南の荒野・4<br>忘却の洞窟 1階［oblivion_cave_1］・忘却の洞窟・5 | 5 | small・浮遊 |
| 011 | コツコツドカンナイト | 既存IDを使う | `kotsukotsu_knight`（提案ID `tq_add_boom_bust_knight` は使わない） | `assets/enemies_add35/011_tq_add_boom_bust_knight.webp` | 断裂群島［world_islands］・廃墟側の荒地・19 | 19 | normal |
| 012 | ポジポジファントム | 既存IDを使う | `pojipoji_phantom`（提案ID `tq_add_overtrading_phantom` は使わない） | `assets/enemies_add35/012_tq_add_overtrading_phantom.webp` | 時の神殿領［world_tempus］・鐘都の平野・22<br>地下契約室 1階［time_bank_vault_1］・契約室・22<br>（同じ出現表を使う隠し区画：a6_tb_exchange） | 22 | normal・浮遊 |
| 013 | インジ依存メイジ | 既存IDを使う | `indicator_mage`（提案ID `tq_add_indicator_mage` は使わない） | `assets/enemies_add35/013_tq_add_indicator_mage.webp` | マクディア魔導王国［world_magicka］・マクディア平原・28<br>禁書庫 1階［forbidden_archive_1］・禁書庫・28 | 26 | normal |
| 014 | 悪徳議員 | 新規登録 | `tq_add_corrupt_politician` | `assets/enemies_add35/014_tq_add_corrupt_politician.webp` | カリオン徴収連邦［world_kalion］・王都周辺・15<br>王宮［sentra_palace_1］・王宮・16 | 15 | normal |
| 015 | 裏金官僚 | 新規登録 | `tq_add_slush_fund_bureaucrat` | `assets/enemies_add35/015_tq_add_slush_fund_bureaucrat.webp` | 地下記録庫 1階［kalion_archive_1］・地下記録庫・14<br>地下記録庫 2階（黒い帳簿）［kalion_archive_2］・地下記録庫・15<br>（同じ出現表を使う隠し区画：a6_ka_ledger） | 14 | normal |
| 016 | 汚職市長 | 新規登録 | `tq_add_corrupt_mayor` | `assets/enemies_add35/016_tq_add_corrupt_mayor.webp` | カリオン徴収連邦［world_kalion］・カリオン平野・13 | 13 | normal |
| 017 | 洗脳メディア司会者 | 新規登録 | `tq_add_propaganda_host` | `assets/enemies_add35/017_tq_add_propaganda_host.webp` | オラクル中枢 第1層［oracle_core_1］・中枢・26<br>オラクル中枢 第2層（記録層）［oracle_core_2］・中枢・26<br>（同じ出現表を使う隠し区画：a6_or_lamps） | 26 | normal |
| 018 | 強盗 | 新規登録 | `tq_add_robber` | `assets/enemies_add35/018_tq_add_robber.webp` | アルカディア相場大陸［world］・エマール山脈・7<br>エマール山道［emal_pass］・エマール山道・8<br>（同じ出現表を使う隠し区画：a6_em_hut） | 8 | normal |
| 019 | 闇金取り立て屋 | 新規登録 | `tq_add_loan_shark_enforcer` | `assets/enemies_add35/019_tq_add_loan_shark_enforcer.webp` | 時の神殿領［world_tempus］・鐘都の平野・22<br>地下契約室 1階［time_bank_vault_1］・契約室・22<br>（同じ出現表を使う隠し区画：a6_tb_exchange） | 22 | normal |
| 020 | ギャランティック星人 | 新規登録 | `tq_add_galantic_alien` | `assets/enemies_add35/020_tq_add_galantic_alien.webp` | 天空群島［world_sky］・天空神殿の島・32<br>星見塔［star_tower_1］・星見塔・31<br>（同じ出現表を使う隠し区画：a6_st_rings） | 31 | normal |
| 021 | 洗脳グレイ | 新規登録 | `tq_add_brainwashed_grey` | `assets/enemies_add35/021_tq_add_brainwashed_grey.webp` | 地下実験施設 1階［vol_under_1］・地下実験施設・24<br>地下実験施設 2階［vol_under_2］・地下実験施設 2階・26<br>（同じ出現表を使う隠し区画：a6_vu_numbers） | 25 | small |
| 022 | レプタイプヒューマン | 新規登録 | `tq_add_reptile_human` | `assets/enemies_add35/022_tq_add_reptile_human.webp` | 地下施設 1階［aruna_underground_1］・地下施設・20<br>（同じ出現表を使う隠し区画：a4_au_lamps） | 20 | normal |
| 023 | 侵略宇宙商人 | 新規登録 | `tq_add_alien_invasion_merchant` | `assets/enemies_add35/023_tq_add_alien_invasion_merchant.webp` | 天空群島［world_sky］・天空群島・31<br>星見塔［star_tower_1］・星見塔・31<br>（同じ出現表を使う隠し区画：a6_st_rings） | 31 | big |
| 024 | 失念の戦国侍 | 新規登録 | `tq_add_forgetful_samurai` | `assets/enemies_add35/024_tq_add_forgetful_samurai.webp` | グラニア鉱業地方［world_grania］・グラニアの灰野・10<br>灰の峠［grania_pass］・エマール山脈・12<br>（同じ出現表を使う隠し区画：a6_gp_shelter） | 12 | normal |
| 025 | 地球1992からの侵略者 | 新規登録 | `tq_add_earth1992_invader` | `assets/enemies_add35/025_tq_add_earth1992_invader.webp` | ゼロメア［world_machine］・旧都市の崖・25<br>廃棄された旧都市［old_city_1］・旧都市・25<br>（同じ出現表を使う隠し区画：a6_oc_vault） | 25 | normal |
| 026 | 学びを辞めた者 | 新規登録 | `tq_add_one_who_stopped_learning` | `assets/enemies_add35/026_tq_add_one_who_stopped_learning.webp` | 記憶の図書館［memory_library］・記憶の図書館・21<br>（同じ出現表を使う隠し区画：a4_ml_closed） | 21 | normal |
| 027 | 感謝を忘れた亡霊 | 新規登録 | `tq_add_ungrateful_ghost` | `assets/enemies_add35/027_tq_add_ungrateful_ghost.webp` | 廃墟の街［aruna_ruins］・廃墟の街・19<br>時計塔 1階［aruna_ruins_1］・時計塔・19<br>（同じ出現表を使う隠し区画：a6_ar_light） | 19 | normal・浮遊 |
| 028 | 大喰らいのアリエンティ | 新規登録 | `tq_add_glutton_arienti` | `assets/enemies_add35/028_tq_add_glutton_arienti.webp` | リシア砂漠［world_desert］・南の砂漠・24<br>砂嵐の回廊［sandstorm_corridor_1］・砂嵐の回廊・23<br>砂嵐の回廊 2階［sandstorm_corridor_2］・砂嵐の回廊・23<br>（同じ出現表を使う隠し区画：a4_sc_shrine） | 24 | big |
| 029 | 人口調整用ドローン | 新規登録 | `tq_add_population_control_drone` | `assets/enemies_add35/029_tq_add_population_control_drone.webp` | 自動工場 2階（制御室）［auto_factory_2］・自動工場・25<br>オラクル中枢 第1層［oracle_core_1］・中枢・26 | 26 | big・浮遊 |
| 030 | 裏切りトロール | 新規登録 | `tq_add_betrayal_troll` | `assets/enemies_add35/030_tq_add_betrayal_troll.webp` | 精霊の森［spirit_forest_1］・精霊の森・26<br>（同じ出現表を使う隠し区画：a4_sf_spring） | 26 | big |
| 031 | 肉欲の愚者 | 新規登録 | `tq_add_fool_of_desire` | `assets/enemies_add35/031_tq_add_fool_of_desire.webp` | 暗黒大陸［world_dark］・魔王城の山麓・36<br>魔王城 2階 欲望の間［demon_castle_2］・魔王城・37<br>（同じ出現表を使う隠し区画：a6_dc_statues） | 37 | normal |
| 032 | 貪欲の盲者 | 新規登録 | `tq_add_blinded_by_greed` | `assets/enemies_add35/032_tq_add_blinded_by_greed.webp` | 竜脈洞窟［dragon_vein_1］・竜脈洞窟・31<br>竜脈洞窟 古竜の間［dragon_vein_2］・竜脈洞窟・31<br>（同じ出現表を使う隠し区画：a4_dv_pool） | 31 | normal |
| 033 | 祟られ人 | 新規登録 | `tq_add_cursed_one` | `assets/enemies_add35/033_tq_add_cursed_one.webp` | 断裂群島［world_islands］・廃墟側の荒地・19<br>霧の島［mist_isle］・霧の島・20<br>（同じ出現表を使う隠し区画：a6_mi_spring） | 20 | normal |
| 034 | キーボードクラッシャーズ | 新規登録 | `tq_add_keyboard_crushers` | `assets/enemies_add35/034_tq_add_keyboard_crushers.webp` | 廃棄された旧都市［old_city_1］・旧都市・25<br>自動工場 2階（制御室）［auto_factory_2］・自動工場・25<br>（同じ出現表を使う隠し区画：a6_oc_vault） | 25 | normal |
| 035 | 人間監視用AIドローン | 新規登録 | `tq_add_ai_surveillance_drone` | `assets/enemies_add35/035_tq_add_ai_surveillance_drone.webp` | ゼロメア［world_machine］・ゼロメアの平野・24<br>自動工場 1階［auto_factory_1］・自動工場・24<br>（同じ出現表を使う隠し区画：a6_af_control） | 24 | small・浮遊 |
