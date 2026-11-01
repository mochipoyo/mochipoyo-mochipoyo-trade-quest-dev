# 既存の通常敵164体：新しい表示名・戦闘画像への差し替え（対応表）

素材：`trade_quest_redesign_001_164_for_claude.zip`（`enemy_name_mapping.json`・`png_512/`・`png_1024/`・`sheets/`）

- 差し替え完了：**157 / 164体**（表示名と戦闘画像を一組で変更）
- 保留：**7体**（011 skeleton、012 lizard、013 mole、014 golem、015 imp、018 bug_poison、019 fear_shadow）。画像に問題があるため、旧名・旧画像を一組で維持
- 対象外（変更なし）：ボス、v6.5 の新規通常敵40体、主人公・仲間・NPC

## しくみ

- 対応データ：`js/data/enemy-redesign.js`（番号・既存敵ID・新名称・画像・採用／保留・保留の理由・不透明部分の範囲・戦闘の基本サイズ・浮かせる量）。素材の `enemy_name_mapping.json` の **id で既存の敵と照合**（ファイルの並び順や見た目では紐付けていない）
- 表示名：`js/core/enemyart.js` が読み込み時に `ENEMIES[id].name` を新名称にする（**内部IDは変えない**。もとの名前は `ENEMIES[id].legacyName`）。戦闘・ターゲット選択・戦闘のメッセージ・図鑑は `name` を使うので、すべて新名称になる
- 画像：`assets/enemies_redesign/<番号>_<ID>.png`（素材の **512px版をそのまま**コピー。バイト単位で同一）。戦闘・図鑑で、不透明部分で切り抜いてから縦横比を保って縮小（枠を埋めるための切り抜き・引き伸ばしはしない）
- 読み込み：起動時には読まない。マップに入ったときにそのマップの出現表の敵（最大12体）、戦闘の直前にその戦闘の敵（呼ぶ仲間も）を読む（最大1.5秒待ち、間に合わなければ従来の絵で始めて、読めたら切り替え）。図鑑は画面に見えた欄から読む。**1024px版は戦闘の表示（最大 180×170 程度）に対して大きすぎるため、ゲームでは使わない**（検品の拡大確認にだけ使用）。一覧画像（sheets）は確認用で、ゲームでは使わない
- キャッシュ：新しい画像は新しいパス（`assets/enemies_redesign/`）なので、古い画像が残って表示されることはない（Service Worker なし）。セーブ領域は触らない
- 2D版と3D版：3D版の戦闘は、3Dの舞台の手前に2D版と同じ `battle.js` が敵の絵を描く方式（板状）なので、同じ敵IDで同じ新画像・新名称になる（立体モデルへの置き換えではない）
- 大きさ：小型 118・普通 144・大型 170px（高さの基準。幅は最大236px）。飛ぶ敵（35体）は高さの約1割だけ浮かせ、影を小さく薄くする。複数体のときは従来どおり、1体ぶんの幅に収まるよう縮小
- 切替（確認用）：URL に `?enemyart=old` で旧名・旧画像、`?enemyart=new` で新しいもの。セーブには保存しない
- 確認ページ：`enemy-redesign-preview.html`（164体の番号・ID・旧名→新名称・戦闘と同じ加工の画像・保留の理由。背景の切替・切り抜き範囲の表示）

## 検品の方法

1. 素材の対応表（164件）とゲームの敵データを照合：番号001〜164の欠番・重複なし、IDの重複なし、全IDがゲームに存在、ボスを含まない、残りの通常敵40体はすべて v6.5 の新規通常敵
2. 各PNG（512px・1024px）を機械的に確認：透過チャンネルの有無、白・市松の焼き込み、四辺の透明余白、四辺・内部の直線的な切れ目、半透明の残り（もや）、本体から離れた小さな部品（別素材・番号・枠の混入）
3. 全164体を、番号付きの一覧画像（sheets）と並べて目視で照合（番号・名前・キャラクターが対応表どおりか）。011〜020は拡大して輪郭・切れ目を個別に確認
4. 問題のある画像は採用せず、旧名・旧画像を一組で維持（再生成・強引なトリミングはしていない）

## 対応表（164体）

| 番号 | 既存敵ID | 旧名 | 新名称 | 採用画像 | 差し替え状況 |
|---|---|---|---|---|---|
| 001 | `slime` | スライム | 蒼葉の雫精 | `assets/enemies_redesign/001_slime.png` | 差し替え済み（small・119×118） |
| 002 | `slime_red` | レッドスライム | 灼核の熔妖 | `assets/enemies_redesign/002_slime_red.png` | 差し替え済み（small・144×118） |
| 003 | `bee` | キラービー | 碧金の刃蜂 | `assets/enemies_redesign/003_bee.png` | 差し替え済み（small・118×118・浮かせる12px） |
| 004 | `mushroom` | まよいキノコ | 朽茸の菌鬼 | `assets/enemies_redesign/004_mushroom.png` | 差し替え済み（normal・129×144） |
| 005 | `bug` | レンジバッタ | 深緑の鎌跳獣 | `assets/enemies_redesign/005_bug.png` | 差し替え済み（small・122×118） |
| 006 | `bat` | 乖離コウモリ | 紫煙の幻翼 | `assets/enemies_redesign/006_bat.png` | 差し替え済み（small・151×118・浮かせる12px） |
| 007 | `wolf` | グレイウルフ | 蒼紋の呪狼 | `assets/enemies_redesign/007_wolf.png` | 差し替え済み（normal・178×144） |
| 008 | `snake` | ならびヘビ | 蔓鱗の森蛇 | `assets/enemies_redesign/008_snake.png` | 差し替え済み（small・122×118） |
| 009 | `bandit` | 山賊 | 荒野の曲刀賊 | `assets/enemies_redesign/009_bandit.png` | 差し替え済み（normal・122×144） |
| 010 | `ghost` | 5分足ゴースト | 時囚の亡影 | `assets/enemies_redesign/010_ghost.png` | 差し替え済み（normal・124×144・浮かせる14px） |
| 011 | `skeleton` | スケルトン | 骨装の墓守 | （採用なし。素材 `png_512/011_skeleton.png` は不採用） | **保留**（旧名・旧画像のまま）：体のまわりに白っぽい半透明の背景の残り（暗い背景で灰色の縁として見える。足もとで直線的に切れている） |
| 012 | `lizard` | ダマシトカゲ | 偽紋の鱗蜥 | （採用なし。素材 `png_512/012_lizard.png` は不採用） | **保留**（旧名・旧画像のまま）：別の素材の印（水色の円とひし形のマーク）が混入。左端・下端が直線的に切れている。拡大でぼやけている |
| 013 | `mole` | 反転モグラ | 地脈の反転獣 | （採用なし。素材 `png_512/013_mole.png` は不採用） | **保留**（旧名・旧画像のまま）：右端と下端が直線的に切れている（体が欠けている）。拡大でぼやけている |
| 014 | `golem` | ストーンゴーレム | 岩脈の巨兵 | （採用なし。素材 `png_512/014_golem.png` は不採用） | **保留**（旧名・旧画像のまま）：体のまわりの半透明の残りが、右と下で直線的に切れている（暗い背景で縦・横の線として見える） |
| 015 | `imp` | インプ | 灼角の小鬼 | （採用なし。素材 `png_512/015_imp.png` は不採用） | **保留**（旧名・旧画像のまま）：左右が直線的に切れている。右側に枠線の残り（縦の点線）。白い縁どりが残っている |
| 016 | `dark_mage` | 闇の魔道士 | 影紋の禁術師 | `assets/enemies_redesign/016_dark_mage.png` | 差し替え済み（normal・107×144） |
| 017 | `slime_metal` | メタルスライム | 銀鏡の流体精 | `assets/enemies_redesign/017_slime_metal.png` | 差し替え済み（small・103×118） |
| 018 | `bug_poison` | ポイズンビートル | 毒棘の甲虫 | （採用なし。素材 `png_512/018_bug_poison.png` は不採用） | **保留**（旧名・旧画像のまま）：右の羽の先が縦の直線で切れている（羽が欠けている） |
| 019 | `fear_shadow` | 恐怖の影 | 恐慌の黒影 | （採用なし。素材 `png_512/019_fear_shadow.png` は不採用） | **保留**（旧名・旧画像のまま）：左端に、本体から離れた縦長の帯（枠・隣のコマの残り）が混入。下端が直線的に切れている |
| 020 | `crab` | 岩ガニ | 礁岩の鋏獣 | `assets/enemies_redesign/020_crab.png` | 差し替え済み（small・124×118） |
| 021 | `bat_fire` | ファイアバット | 火口の炉翼蝠 | `assets/enemies_redesign/021_bat_fire.png` | 差し替え済み（small・125×118・浮かせる12px） |
| 022 | `sand_mole` | 砂モグラ | 砂鐘の掘削獣 | `assets/enemies_redesign/022_sand_mole.png` | 差し替え済み（small・137×118） |
| 023 | `snake_ice` | フロストサーペント | 氷鏡の環蛇 | `assets/enemies_redesign/023_snake_ice.png` | 差し替え済み（small・110×118） |
| 024 | `wolf_dark` | シャドウウルフ | 影縫いの裂尾狼 | `assets/enemies_redesign/024_wolf_dark.png` | 差し替え済み（normal・142×144） |
| 025 | `golem_iron` | アイアンゴーレム | 鋲炉の鉄歩兵 | `assets/enemies_redesign/025_golem_iron.png` | 差し替え済み（big・171×170） |
| 026 | `ghost_dark` | ダークレイス | 喪鐘の帳霊 | `assets/enemies_redesign/026_ghost_dark.png` | 差し替え済み（normal・127×144・浮かせる14px） |
| 027 | `bug_armor` | アーマービートル | 峰盾の重甲虫 | `assets/enemies_redesign/027_bug_armor.png` | 差し替え済み（normal・150×144） |
| 028 | `slime_gold` | ゴールドスライム | 金箔の折鶴精 | `assets/enemies_redesign/028_slime_gold.png` | 差し替え済み（small・123×118） |
| 029 | `slime_green` | グリーンスライム | 翠脈の胞嚢獣 | `assets/enemies_redesign/029_slime_green.png` | 差し替え済み（small・105×118） |
| 030 | `rabbit` | ツノウサギ | 月鋏の草跳兎 | `assets/enemies_redesign/030_rabbit.png` | 差し替え済み（small・106×118） |
| 031 | `sparrow_hawk` | ハイタカ | 銅羽の風切鷹 | `assets/enemies_redesign/031_sparrow_hawk.png` | 差し替え済み（small・123×118・浮かせる12px） |
| 032 | `petal` | ハナビラ | 花弁紡ぎの糸車 | `assets/enemies_redesign/032_petal.png` | 差し替え済み（small・114×118） |
| 033 | `slime_blue_big` | ビッグスライム | 群青の潮織獣 | `assets/enemies_redesign/033_slime_blue_big.png` | 差し替え済み（big・173×170） |
| 034 | `crow` | 森ガラス | 黒樹皮の鍵烏 | `assets/enemies_redesign/034_crow.png` | 差し替え済み（small・110×118） |
| 035 | `boar` | イノシシ | 赤土の犂牙獣 | `assets/enemies_redesign/035_boar.png` | 差し替え済み（normal・148×144） |
| 036 | `maneater` | マンイーター | 牙籠の罠花 | `assets/enemies_redesign/036_maneater.png` | 差し替え済み（normal・131×144） |
| 037 | `mushroom_king` | キノコ大王 | 菌傘の巡礼王 | `assets/enemies_redesign/037_mushroom_king.png` | 差し替え済み（big・162×170） |
| 038 | `forest_fairy` | 森の精霊 | 若枝の灯織り | `assets/enemies_redesign/038_forest_fairy.png` | 差し替え済み（small・110×118・浮かせる12px） |
| 039 | `treant` | トレント | 洞木の歩廊守 | `assets/enemies_redesign/039_treant.png` | 差し替え済み（big・157×170） |
| 040 | `vulture` | ハゲワシ | 白炉の葬翼 | `assets/enemies_redesign/040_vulture.png` | 差し替え済み（normal・143×144） |
| 041 | `scorpion` | サソリ | 琥珀針の砂鋏 | `assets/enemies_redesign/041_scorpion.png` | 差し替え済み（normal・145×144） |
| 042 | `wild_dog` | ワイルドドッグ | 風笛耳の斥候犬 | `assets/enemies_redesign/042_wild_dog.png` | 差し替え済み（small・115×118） |
| 043 | `mimic` | ミミック | 蝶番顎の旅鞄 | `assets/enemies_redesign/043_mimic.png` | 差し替え済み（normal・136×144） |
| 044 | `sand_lizard` | 荒野トカゲ | 乾裂紋の走蜥 | `assets/enemies_redesign/044_sand_lizard.png` | 差し替え済み（normal・148×144） |
| 045 | `cave_crab` | 洞窟ガニ | 蒼晶背の洞鋏 | `assets/enemies_redesign/045_cave_crab.png` | 差し替え済み（small・118×118） |
| 046 | `stalactite_golem` | 鍾乳石ゴーレム | 石筍肋の洞守 | `assets/enemies_redesign/046_stalactite_golem.png` | 差し替え済み（normal・131×144） |
| 047 | `zombie` | ゾンビトレーダー | 亡札の相場師 | `assets/enemies_redesign/047_zombie.png` | 差し替え済み（normal・138×144） |
| 048 | `floating_eye` | ウォッチャー | 瞼環の望遠蟲 | `assets/enemies_redesign/048_floating_eye.png` | 差し替え済み（normal・139×144） |
| 049 | `ore_slime` | 鉱石スライム | 鉱脈織りの晶繭 | `assets/enemies_redesign/049_ore_slime.png` | 差し替え済み（small・119×118） |
| 050 | `candle_golem` | ローソク足ゴーレム | 陽陰炉の柱兵 | `assets/enemies_redesign/050_candle_golem.png` | 差し替え済み（normal・98×144） |
| 051 | `bear_shadow` | ベアの影 | 熊爪の影裂き | `assets/enemies_redesign/051_bear_shadow.png` | 差し替え済み（big・158×170） |
| 052 | `bandit_archer` | 山賊弓兵 | 楔弓の崖盗 | `assets/enemies_redesign/052_bandit_archer.png` | 差し替え済み（normal・142×144） |
| 053 | `rock_lizard` | ロックリザード | 岩扇の盾蜥 | `assets/enemies_redesign/053_rock_lizard.png` | 差し替え済み（normal・146×144） |
| 054 | `mountain_hawk` | 山鷹 | 山稜の帆翼鷹 | `assets/enemies_redesign/054_mountain_hawk.png` | 差し替え済み（normal・137×144） |
| 055 | `mountain_cat` | ヤマネコ | 鈴石踏みの山猫 | `assets/enemies_redesign/055_mountain_cat.png` | 差し替え済み（normal・136×144） |
| 056 | `rock_golem` | ロックゴーレム | 断層肩の岩運び | `assets/enemies_redesign/056_rock_golem.png` | 差し替え済み（big・145×170） |
| 057 | `harpy` | ハーピー | 歌骨の羽奏者 | `assets/enemies_redesign/057_harpy.png` | 差し替え済み（big・165×170） |
| 058 | `slime_rainbow` | レインボースライム | 虹膜の光帆獣 | `assets/enemies_redesign/058_slime_rainbow.png` | 差し替え済み（small・115×118） |
| 059 | `jelly_float` | フロートジェリー | 浮鐘の透海月 | `assets/enemies_redesign/059_jelly_float.png` | 差し替え済み（normal・142×144・浮かせる14px） |
| 060 | `reef_crab` | リーフクラブ | 葉舟背の汀鋏 | `assets/enemies_redesign/060_reef_crab.png` | 差し替え済み（normal・154×144） |
| 061 | `gull_pirate` | カモメ海賊 | 潮笛の略奪鴎 | `assets/enemies_redesign/061_gull_pirate.png` | 差し替え済み（normal・142×144） |
| 062 | `sea_serpent` | シーサーペント | 海図鱗の環蛇 | `assets/enemies_redesign/062_sea_serpent.png` | 差し替え済み（big・170×170） |
| 063 | `smoke_wraith` | 煤煙の亡霊 | 煤面の煙突霊 | `assets/enemies_redesign/063_smoke_wraith.png` | 差し替え済み（normal・116×144・浮かせる14px） |
| 064 | `iron_beetle` | 鉄甲虫 | 鋲殻の炉甲虫 | `assets/enemies_redesign/064_iron_beetle.png` | 差し替え済み（normal・144×144） |
| 065 | `chain_hound` | 鎖の猟犬 | 軛鎖の追跡犬 | `assets/enemies_redesign/065_chain_hound.png` | 差し替え済み（normal・153×144） |
| 066 | `ash_golem` | 灰のゴーレム | 灰窯の歩行炉 | `assets/enemies_redesign/066_ash_golem.png` | 差し替え済み（normal・139×144） |
| 067 | `mine_imp` | 鉱山インプ | 鉱灯耳の坑鬼 | `assets/enemies_redesign/067_mine_imp.png` | 差し替え済み（normal・115×144） |
| 068 | `ore_bat` | 鉱石コウモリ | 晶洞翼の夜蝠 | `assets/enemies_redesign/068_ore_bat.png` | 差し替え済み（small・130×118・浮かせる12px） |
| 069 | `chain_warden` | 鎖の看守 | 環鎖の牢番 | `assets/enemies_redesign/069_chain_warden.png` | 差し替え済み（normal・137×144） |
| 070 | `drill_golem` | ドリルゴーレム | 螺旋杭の掘進兵 | `assets/enemies_redesign/070_drill_golem.png` | 差し替え済み（normal・143×144） |
| 071 | `tax_hound` | 徴税猟犬 | 封蝋鼻の徴収犬 | `assets/enemies_redesign/071_tax_hound.png` | 差し替え済み（normal・136×144） |
| 072 | `paper_wraith` | 帳簿の亡霊 | 勘定綴じの帳霊 | `assets/enemies_redesign/072_paper_wraith.png` | 差し替え済み（normal・142×144・浮かせる14px） |
| 073 | `coin_golem` | 金貨ゴーレム | 穴銭輪の転兵 | `assets/enemies_redesign/073_coin_golem.png` | 差し替え済み（normal・144×144） |
| 074 | `federal_soldier` | 連邦兵 | 銅票盾の連兵 | `assets/enemies_redesign/074_federal_soldier.png` | 差し替え済み（normal・143×144） |
| 075 | `federal_captain` | 連邦隊長 | 藍章の旗槍長 | `assets/enemies_redesign/075_federal_captain.png` | 差し替え済み（normal・143×144） |
| 076 | `ledger_mimic` | 帳簿ミミック | 算盤牙の帳喰い | `assets/enemies_redesign/076_ledger_mimic.png` | 差し替え済み（normal・146×144） |
| 077 | `archive_golem` | 記録庫の守衛 | 書庫梁の鍵番 | `assets/enemies_redesign/077_archive_golem.png` | 差し替え済み（normal・141×144） |
| 078 | `royal_guard` | 親衛隊 | 白封の近衛槍 | `assets/enemies_redesign/078_royal_guard.png` | 差し替え済み（normal・144×144） |
| 079 | `salt_wolf` | 潮風の狼 | 潮泡鬣の浜狼 | `assets/enemies_redesign/079_salt_wolf.png` | 差し替え済み（normal・138×144） |
| 080 | `rust_crab` | 錆びガニ | 錆錨の横歩き | `assets/enemies_redesign/080_rust_crab.png` | 差し替え済み（normal・144×144） |
| 081 | `ruin_shade` | 廃墟の影 | 崩梁の影縫い | `assets/enemies_redesign/081_ruin_shade.png` | 差し替え済み（normal・141×144） |
| 082 | `lantern_wisp` | ランタンの火 | 燈芯角の灯蛾 | `assets/enemies_redesign/082_lantern_wisp.png` | 差し替え済み（normal・140×144・浮かせる14px） |
| 083 | `drift_golem` | 流木のゴーレム | 舟肋の漂木兵 | `assets/enemies_redesign/083_drift_golem.png` | 差し替え済み（normal・137×144） |
| 084 | `pirate_raider` | 外海の海賊 | 帆布面の外海賊 | `assets/enemies_redesign/084_pirate_raider.png` | 差し替え済み（normal・143×144） |
| 085 | `storm_ray` | 嵐エイ | 雷帆の飛電鱝 | `assets/enemies_redesign/085_storm_ray.png` | 差し替え済み（normal・146×144・浮かせる14px） |
| 086 | `kraken_arm` | クラーケンの腕 | 断潮の腕冠 | `assets/enemies_redesign/086_kraken_arm.png` | 差し替え済み（big・162×170） |
| 087 | `deep_guard` | 深海の番人 | 深灯の潜門衛 | `assets/enemies_redesign/087_deep_guard.png` | 差し替え済み（normal・133×144・浮かせる14px） |
| 088 | `coral_wraith` | 珊瑚の亡霊 | 珊瑚笛の葬霊 | `assets/enemies_redesign/088_coral_wraith.png` | 差し替え済み（normal・125×144・浮かせる14px） |
| 089 | `archive_eel` | 記録ウナギ | 刻文鰭の巻鰻 | `assets/enemies_redesign/089_archive_eel.png` | 差し替え済み（normal・142×144・浮かせる14px） |
| 090 | `chrono_moth` | 時蛾 | 秒針翅の宵蛾 | `assets/enemies_redesign/090_chrono_moth.png` | 差し替え済み（normal・142×144・浮かせる14px） |
| 091 | `hourglass_golem` | 砂時計のゴーレム | 落砂腰の時守 | `assets/enemies_redesign/091_hourglass_golem.png` | 差し替え済み（normal・125×144） |
| 092 | `bell_wraith` | 鐘の亡霊 | 鐘舌衣の響霊 | `assets/enemies_redesign/092_bell_wraith.png` | 差し替え済み（normal・135×144・浮かせる14px） |
| 093 | `debt_collector` | 時間の取立人 | 余刻刈りの徴収官 | `assets/enemies_redesign/093_debt_collector.png` | 差し替え済み（normal・141×144） |
| 094 | `patrol_drone` | 監視ドローン | 巡視環の翼機 | `assets/enemies_redesign/094_patrol_drone.png` | 差し替え済み（normal・147×144・浮かせる14px） |
| 095 | `sentry_unit` | 警備ユニット | 三盾脚の門機 | `assets/enemies_redesign/095_sentry_unit.png` | 差し替え済み（normal・142×144） |
| 096 | `repair_bot` | 修理ボット | 縫接針の補修虫 | `assets/enemies_redesign/096_repair_bot.png` | 差し替え済み（normal・145×144） |
| 097 | `data_leech` | データリーチ | 符号吸いの硝子蛭 | `assets/enemies_redesign/097_data_leech.png` | 差し替え済み（normal・148×144） |
| 098 | `rust_sentinel` | 錆びた番兵 | 酸化甲の廃哨兵 | `assets/enemies_redesign/098_rust_sentinel.png` | 差し替え済み（normal・144×144） |
| 099 | `core_defender` | 中枢防衛ユニット | 隔壁殻の核衛機 | `assets/enemies_redesign/099_core_defender.png` | 差し替え済み（normal・141×144） |
| 100 | `rune_knight` | ルーンの騎士 | 刻紋刃の碑騎士 | `assets/enemies_redesign/100_rune_knight.png` | 差し替え済み（normal・144×144） |
| 101 | `grimoire` | 飛び回る魔導書 | 頁翼の飛書獣 | `assets/enemies_redesign/101_grimoire.png` | 差し替え済み（normal・147×144・浮かせる14px） |
| 102 | `mana_golem` | マナゴーレム | 魔脈導管の歩塔 | `assets/enemies_redesign/102_mana_golem.png` | 差し替え済み（normal・128×144） |
| 103 | `arcane_eye` | 魔導の眼 | 虹彩儀の浮眼 | `assets/enemies_redesign/103_arcane_eye.png` | 差し替え済み（normal・124×144・浮かせる14px） |
| 104 | `summoned_chimera` | 召喚魔獣キマイラ | 三相角の継獣 | `assets/enemies_redesign/104_summoned_chimera.png` | 差し替え済み（big・175×170） |
| 105 | `storm_harpy` | 嵐のハーピー | 雷弦翼の嵐歌姫 | `assets/enemies_redesign/105_storm_harpy.png` | 差し替え済み（normal・144×144・浮かせる14px） |
| 106 | `cloud_slime` | クラウドスライム | 雲帆の浮航獣 | `assets/enemies_redesign/106_cloud_slime.png` | 差し替え済み（normal・148×144・浮かせる14px） |
| 107 | `star_sentinel` | 星見の番人 | 星盤角の夜番 | `assets/enemies_redesign/107_star_sentinel.png` | 差し替え済み（normal・137×144） |
| 108 | `greed_shade` | 欲望の残響 | 願貨の反響貝 | `assets/enemies_redesign/108_greed_shade.png` | 差し替え済み（normal・144×144） |
| 109 | `fear_shade` | 恐怖の残響 | 怯声の折耳獣 | `assets/enemies_redesign/109_fear_shade.png` | 差し替え済み（normal・142×144） |
| 110 | `control_shade` | 支配の残響 | 王令の共鳴冠 | `assets/enemies_redesign/110_control_shade.png` | 差し替え済み（normal・143×144） |
| 111 | `void_beast` | 虚無の獣 | 空洞肋の夜行獣 | `assets/enemies_redesign/111_void_beast.png` | 差し替え済み（big・166×170） |
| 112 | `cactus` | サボテンマン | 水甕胴の棘仙掌 | `assets/enemies_redesign/112_cactus.png` | 差し替え済み（small・122×118） |
| 113 | `mummy` | ミイラ | 砂布の織骸 | `assets/enemies_redesign/113_mummy.png` | 差し替え済み（normal・130×144） |
| 114 | `snow_wolf` | スノーウルフ | 霜針鬣の雪狼 | `assets/enemies_redesign/114_snow_wolf.png` | 差し替え済み（normal・144×144） |
| 115 | `ice_spirit` | 氷の精霊 | 氷琴羽の薄精 | `assets/enemies_redesign/115_ice_spirit.png` | 差し替え済み（normal・139×144・浮かせる14px） |
| 116 | `yeti` | イエティ | 雪庇肩の白毛巨獣 | `assets/enemies_redesign/116_yeti.png` | 差し替え済み（big・169×170） |
| 117 | `gargoyle` | ガーゴイル | 雨樋翼の石伏獣 | `assets/enemies_redesign/117_gargoyle.png` | 差し替え済み（normal・150×144） |
| 118 | `magitek` | 魔導機兵 | 呪盤胸の装甲兵 | `assets/enemies_redesign/118_magitek.png` | 差し替え済み（normal・131×144） |
| 119 | `bull_shadow` | ブルの影 | 雄角の影突き | `assets/enemies_redesign/119_bull_shadow.png` | 差し替え済み（big・179×170） |
| 120 | `chart_wraith` | チャートの亡霊 | 蝋線衣の相場霊 | `assets/enemies_redesign/120_chart_wraith.png` | 差し替え済み（small・102×118） |
| 121 | `demon_knight` | デーモンナイト | 燼刃の獄騎士 | `assets/enemies_redesign/121_demon_knight.png` | 差し替え済み（big・166×170） |
| 122 | `dark_slime` | ダークスライム | 夜膜の折扇獣 | `assets/enemies_redesign/122_dark_slime.png` | 差し替え済み（normal・144×144） |
| 123 | `wisp` | ウィスプ | 燐糸巻きの灯虫 | `assets/enemies_redesign/123_wisp.png` | 差し替え済み（small・116×118・浮かせる12px） |
| 124 | `pirate` | 海賊 | 錨鉤の甲板賊 | `assets/enemies_redesign/124_pirate.png` | 差し替え済み（normal・142×144） |
| 125 | `ruin_guardian` | 遺跡の守護者 | 碑鍵腕の遺構衛 | `assets/enemies_redesign/125_ruin_guardian.png` | 差し替え済み（normal・144×144） |
| 126 | `sand_worm` | 砂潜りワーム | 砂潜りの筒顎虫 | `assets/enemies_redesign/126_sand_worm.png` | 差し替え済み（big・167×170） |
| 127 | `mirage_fox` | 蜃気楼ギツネ | 陽炎尾の玻璃狐 | `assets/enemies_redesign/127_mirage_fox.png` | 差し替え済み（normal・143×144） |
| 128 | `dune_scorpion` | 砂丘サソリ | 砂帆尾の丘鋏 | `assets/enemies_redesign/128_dune_scorpion.png` | 差し替え済み（normal・146×144） |
| 129 | `dust_djinn` | 砂塵の精 | 砂紋の風編み | `assets/enemies_redesign/129_dust_djinn.png` | 差し替え済み（normal・146×144・浮かせる14px） |
| 130 | `caravan_raider` | 隊商荒らし | 瓢荷狙いの隊商賊 | `assets/enemies_redesign/130_caravan_raider.png` | 差し替え済み（normal・131×144） |
| 131 | `rumor_mimic` | 噂のミミック | 耳殻の噂喰い | `assets/enemies_redesign/131_rumor_mimic.png` | 差し替え済み（normal・142×144） |
| 132 | `temple_sentinel` | 神殿の砂像 | 奉砂の仮面像 | `assets/enemies_redesign/132_temple_sentinel.png` | 差し替え済み（normal・131×144） |
| 133 | `fire_drake` | ファイアドレイク | 火笛喉の赤翼竜 | `assets/enemies_redesign/133_fire_drake.png` | 差し替え済み（normal・146×144） |
| 134 | `magma_slime` | マグマスライム | 熔玻璃の脚輪獣 | `assets/enemies_redesign/134_magma_slime.png` | 差し替え済み（normal・153×144） |
| 135 | `cinder_bird` | 火の粉鳥 | 火種頬の燠鳥 | `assets/enemies_redesign/135_cinder_bird.png` | 差し替え済み（normal・142×144） |
| 136 | `obsidian_golem` | 黒曜石のゴーレム | 黒鏡肩の石衛 | `assets/enemies_redesign/136_obsidian_golem.png` | 差し替え済み（normal・133×144） |
| 137 | `flame_spirit` | 炎の精 | 熱紗の火舞精 | `assets/enemies_redesign/137_flame_spirit.png` | 差し替え済み（normal・121×144） |
| 138 | `vein_wyrmling` | 竜脈の幼竜 | 竜脈灯の幼角竜 | `assets/enemies_redesign/138_vein_wyrmling.png` | 差し替え済み（normal・147×144） |
| 139 | `frost_wolf` | フロストウルフ | 凍霞脚の氷原狼 | `assets/enemies_redesign/139_frost_wolf.png` | 差し替え済み（normal・146×144） |
| 140 | `ice_wraith` | アイスレイス | 氷葬衣の漂霊 | `assets/enemies_redesign/140_ice_wraith.png` | 差し替え済み（normal・129×144・浮かせる14px） |
| 141 | `snow_golem` | スノーゴーレム | 雪輪腹の圧雪兵 | `assets/enemies_redesign/141_snow_golem.png` | 差し替え済み（normal・144×144） |
| 142 | `frost_harpy` | 吹雪のハーピー | 白風羽の雪唱者 | `assets/enemies_redesign/142_frost_harpy.png` | 差し替え済み（normal・145×144・浮かせる14px） |
| 143 | `memory_eater` | 記憶喰い | 思い出紡錘の喰蛾 | `assets/enemies_redesign/143_memory_eater.png` | 差し替え済み（normal・150×144・浮かせる14px） |
| 144 | `clock_soldier` | 時計仕掛けの衛兵 | 歯車襟の時衛兵 | `assets/enemies_redesign/144_clock_soldier.png` | 差し替え済み（normal・138×144） |
| 145 | `ash_wraith` | 灰の亡霊 | 灰帳の弔い霊 | `assets/enemies_redesign/145_ash_wraith.png` | 差し替え済み（normal・142×144・浮かせる14px） |
| 146 | `cinder_hound` | 燃えさしの猟犬 | 燠脊の焦跡犬 | `assets/enemies_redesign/146_cinder_hound.png` | 差し替え済み（normal・147×144） |
| 147 | `drowned_sailor` | 溺れた水夫 | 塩縄衣の沈船員 | `assets/enemies_redesign/147_drowned_sailor.png` | 差し替え済み（normal・123×144） |
| 148 | `reef_lurker` | 礁に潜むもの | 礁穴の鉤腕貝 | `assets/enemies_redesign/148_reef_lurker.png` | 差し替え済み（normal・142×144） |
| 149 | `core_sentinel` | 深層の番兵 | 深圧殻の門番 | `assets/enemies_redesign/149_core_sentinel.png` | 差し替え済み（normal・144×144） |
| 150 | `data_phantom` | データの亡霊 | 欠番符の漂霊 | `assets/enemies_redesign/150_data_phantom.png` | 差し替え済み（normal・136×144・浮かせる14px） |
| 151 | `yosen_slime` | 陽線スライム | 朱陽の伸柱蟲 | `assets/enemies_redesign/151_yosen_slime.png` | 差し替え済み（small・117×118） |
| 152 | `insen_slime` | 陰線スライム | 蒼陰の垂錘獣 | `assets/enemies_redesign/152_insen_slime.png` | 差し替え済み（small・121×118） |
| 153 | `contrarian_bat` | 逆張りバット | 逆波翼の返り蝠 | `assets/enemies_redesign/153_contrarian_bat.png` | 差し替え済み（small・117×118・浮かせる12px） |
| 154 | `stoploss_zombie` | 損切りゾンビ | 断札鋏の亡者 | `assets/enemies_redesign/154_stoploss_zombie.png` | 差し替え済み（normal・140×144） |
| 155 | `nanpin_goblin` | ナンピンゴブリン | 買増袋の坑小鬼 | `assets/enemies_redesign/155_nanpin_goblin.png` | 差し替え済み（small・107×118） |
| 156 | `simple_cultist` | シンプル教信徒 | 一線杖の修験者 | `assets/enemies_redesign/156_simple_cultist.png` | 差し替え済み（normal・115×144） |
| 157 | `fullleva_ogre` | フルレバオーガ | 過積錘の巨漢 | `assets/enemies_redesign/157_fullleva_ogre.png` | 差し替え済み（big・180×170） |
| 158 | `kotsukotsu_knight` | コツコツドカンナイト | 積銭鎧の崩騎士 | `assets/enemies_redesign/158_kotsukotsu_knight.png` | 差し替え済み（normal・143×144） |
| 159 | `pojipoji_phantom` | ポジポジファントム | 注文環の迷走霊 | `assets/enemies_redesign/159_pojipoji_phantom.png` | 差し替え済み（normal・135×144・浮かせる14px） |
| 160 | `indicator_mage` | インジケーター依存メイジ | 多針盤の盲術師 | `assets/enemies_redesign/160_indicator_mage.png` | 差し替え済み（normal・145×144） |
| 161 | `lab_drone` | 観測ドローン | 干渉輪の観測機 | `assets/enemies_redesign/161_lab_drone.png` | 差し替え済み（normal・135×144） |
| 162 | `superposition_cat` | 重ね合わせ猫 | 二相尾の重映猫 | `assets/enemies_redesign/162_superposition_cat.png` | 差し替え済み（normal・148×144） |
| 163 | `quantum_shade` | 量子の影 | 確率膜の影渡り | `assets/enemies_redesign/163_quantum_shade.png` | 差し替え済み（normal・143×144・浮かせる14px） |
| 164 | `zero_wisp` | ゼロ点の鬼火 | 真空鈴の微光精 | `assets/enemies_redesign/164_zero_wisp.png` | 差し替え済み（small・113×118・浮かせる12px） |
