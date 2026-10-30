# ワールドマップ設計（world-map-design）

## 1. 基本方針
- 既存の `world`（160×120、アルカディア相場大陸）とその保存座標（`pos`, `lastInn`, 宝箱ID、ワープ先）は**変更しない**。拡大・座標変換は行わない
- 新しい地域はそれぞれ独立した「地域マップ」（kind: 'field'）として追加する。IDは `world_*`。各地域は 40×30 の設計図（MACRO）を4倍に拡大する既存の生成方式（`js/data/world.js` の generate を汎用化した `WorldGen.region(def)`）で作る
- 地域間は**海路**（SEA_ROUTES：乗り物で地域マップの端に達すると隣の地域へ移る）、**山道**（ダンジョン経由のワープ）、**転移門**（イベントワープ）で接続する
- 読み込みは「現在の地域だけ」：`World.getMap(id)` は要求されたマップだけ生成・キャッシュする（既存の遅延生成を踏襲）。全地域を同時には生成しない
- ワールドマップ画面（Mキー／ミニマップ拡大）は「現在の地域」タブに加えて「世界」タブで12地域の位置関係を模式図として表示する【未着手：v5.0 では「現在のエリア」タブが現在いる地域（world / world_grania）を表示し、停泊中の船を表示する。12地域の模式図タブは次フェーズ＋未解放地域はシルエット表示】

## 2. 地域接続図

```
                 [天空群島 world_sky]（飛空艇のみ・第14章）
                        |
 [忘却の雪原 world_snow]─[時の神殿領 world_tempus]─[マクディア world_magicka]
        |                       |（転移門）               |
 [カリオン連邦 world_kalion]  [ゼロメア world_machine]  [竜炎火山群島 world_dragon]
        | 海路（遠洋船）                                  | 海路（遠洋船）
 [アルカディア world]══海路（小型帆船・東端⇄西端）══[グラニア world_grania]
        | 海路（遠洋船・南）
 [断裂群島 world_islands]──潜航装置──[海底都市]
        |
 [リシア砂漠 world_desert]（遠洋船・南西）
                 ・
 [暗黒大陸 world_dark]（飛空艇のみ・第15章）
```

- 第4章：小型帆船で world の沿岸と東の海路 → world_grania（第5章）
- 第6〜7章：world_grania の北の山道（ダンジョン「灰の峠」）→ world_kalion（データのみ）
- 第8章：遠洋航海船で world 南 → world_islands。砂漠・竜炎・雪原も遠洋船で
- 第10章：world_tempus（v5.3：断裂群島の東端から遠洋航路。雪原経由は未実装）→ 転移門 → world_machine（v5.3 実装）
- 第14章：飛空艇で world_sky、第15章：world_dark

## 3. 拠点（町・村・城）一覧：24か所以上

| # | 地域 | 拠点ID | 名前 | 到達章 | 状況 |
|---|---|---|---|---|---|
| 1 | world | poyo_village | ポヨ村 | 1 | 実装済 |
| 2 | world | rivel_town / rivel_castle | リヴェル城下町・城 | 1 | 実装済 |
| 3 | world | dow_village | ダウの村 | 2 | 実装済 |
| 4 | world | harbor_town | 港町マリナ | 4 | 実装済（船着き場追加：今回） |
| 5 | world_grania | verum_town | 灰鉱町ヴェルム | 5 | 今回 |
| 6 | world_grania | grania_outpost | 灰の峠の駐屯地（小集落） | 5 | 今回（宿・店のみ） |
| 7 | world_kalion | kalion_city | 徴収都市カリオン | 6 | データ |
| 8 | world_kalion | sentra_capital | 王都セントラ | 7 | データ |
| 9 | world_kalion | erased_village | 地図から消えた村 | 6〜 | 未着手 |
| 10 | world_islands | aruna_village | 灰灯島アルナ・生存者の村 | 8 | v5.2 実装 |
| 11 | world_islands | aruna_ruins | 廃墟の街（拠点扱い） | 8 | v5.2 実装 |
| 12 | world_islands | elmina_undersea | 海底都市エルミナ | 9 | v5.2 実装 |
| 13 | world_desert | sahar_city | 砂都サハル | 9〜 | 未着手 |
| 14 | world_desert | mirror_market | 鏡の市場 | 9〜 | 未着手 |
| 15 | world_snow | ciel_port | 氷港シエル | 9〜 | 未着手 |
| 16 | world_snow | frost_town | 記憶を売る町フロスト | 9〜 | 未着手 |
| 17 | world_tempus | tempus_city | 鐘都テンプス | 10 | v5.3 実装 |
| 18 | world_magicka | magicka_city | 魔導都マクディア | 13 | v5.4 実装 |
| 19 | world_machine | node_city | 演算都市ノード | 11 | v5.3 実装 |
| 20 | world_machine | scheduled_district | 明日が決まっている町（第7居住区） | 11 | v5.3 実装 |
| 21 | world_machine | no_failure_school | 失敗を禁止された学校（屋上あり） | 11 | v5.3 実装 |
| 22 | world_dragon | ignas_town | 鍛冶街イグナス | 13〜 | 未着手 |
| 23 | world_sky | star_camp | 星見塔の野営地 | 14 | v5.4 実装 |
| 24 | world_dark | dark_camp | 虚無の荒野の前線基地 | 15 | v5.4 実装 |
| 25 | world_grania | verum_hideout | 地下の抵抗組織（拠点機能：休憩・修行） | 5 | 今回 |

## 4. ダンジョン一覧：30か所以上

| # | 地域 | ID | 名前 | 階層 | 仕掛け | 状況 |
|---|---|---|---|---|---|---|
| 1 | world | lost_forest（+shrine, treasure） | 迷いの森 | 3 | 試練の扉・鍵・隠しボス | 実装済 |
| 2 | world | oblivion_cave_1〜3 | 忘却の洞窟 | 3 | 落とし穴・封印扉・隠しボス | 実装済 |
| 3 | world | emal_pass / bandit_hideout | エマール山道・山賊のアジト | 2 | 学習石碑 | 実装済 |
| 4 | world | harbor_warehouse（魔物） | 港の倉庫 | 1 | 魔物戦・帆布 | 今回 |
| 5 | world_grania | iron_mine_1〜3 | 鉄鎖鉱山 | 3 | 鎖の扉（労働者救出で開く）、帳簿の切れ端、隠し部屋、トロッコ跡の近道、ボス | 今回 |
| 6 | world_grania | verum_factory | 工場 | 1 | 搬出記録、ガネス | 今回 |
| 7 | world_grania | ash_cave | 灰の洞窟（隠し1） | 2 | ランクC扉 | 今回 |
| 8 | world_grania | grania_pass | 灰の峠（→カリオン） | 2 | 山道 | データ |
| 9 | 海 | sunken_reef | 沈没船の礁（隠し2） | 1 | 船でのみ | データ |
| 10 | world_kalion | finance_bureau | 財務局 | 2 | 帳簿照合パズル | データ |
| 11 | world_kalion | underground_archive | 地下記録庫 | 3 | 鍵・守護者 | データ |
| 12 | world_kalion | secret_lab | 秘密研究所 | 2 | 欠片の研究記録 | データ |
| 13 | world_kalion | sentra_palace | 王宮 | 3 | 親衛隊・帳簿中枢 | データ |
| 14 | world_islands | aruna_lighthouse | 灯台 | 2 | 部品修復 | v5.2 実装 |
| 15 | world_islands | aruna_ruins_1/2 | 時計塔（廃墟街） | 2 | 手紙・時計・物資・廃墟の記憶 | v5.2 実装 |
| 16 | world_islands | aruna_underground_1/2 | 地下施設 | 2 | 天秤の鏡・潜航装置 | v5.2 実装 |
| 17 | world_islands | memory_library(+seal) | 記憶の図書館 | 2 | 3区画＋封印区画・守護機構 | v5.2 実装 |
| 18 | world_desert | mirage_temple | 蜃気楼神殿 | 3 | 幻の道 | 未着手 |
| 19 | world_desert | sandstorm_corridor | 砂嵐の回廊 | 2 | 視界制限 | 未着手 |
| 20 | world_snow | frozen_clock_tower | 凍結時計塔（隠し3） | 4 | 時限ギミック | 未着手 |
| 21 | world_snow | spirit_forest | 精霊の森 | 2 | 精霊の試練 | 未着手 |
| 22 | world_snow | memory_vault | 記憶庫 | 1 | 選択肢 | 未着手 |
| 23 | world_tempus | time_bank_vault_1/2 | 時間銀行 地下契約室 | 2 | 契約の書き換え | v5.3 実装 |
| 24 | world_tempus | temple_of_time_1/2/3 | 時の神殿 | 3 | 未来の回廊×3・時の守護者・MTF試練 | v5.3 実装 |
| 25 | world_magicka | forbidden_archive_1/2/3 | 禁書庫 | 3 | 古文書3巻・裏切り・複合分析の試練 | v5.4 実装 |
| 26 | world_magicka | origin_lab_1/2 | 起源の実験室 | 2 | 師の手記・飛空艇の格納庫 | v5.4 実装 |
| 27 | world_machine | oracle_core_1/2/3 | オラクル中枢 | 3 | 認証鍵・テオドルの記録・防衛機構・対話 | v5.3 実装 |
| 28 | world_machine | auto_factory_1/2 | 自動工場 | 2 | 機械敵・制御室 | v5.3 実装（任意） |
| 29 | world_machine | old_city_1/2 | 廃棄された旧都市 | 2 | ドローン群・旧記録 | v5.3 実装 |
| 30 | world_dragon | dragon_vein_cave | 竜脈洞窟（隠し5：最深部） | 4 | 竜との対話 | 未着手 |
| 31 | world_dragon | crater_altar | 火口の祭壇 | 1 | 祭り | 未着手 |
| 32 | world_sky | star_tower_1/2 | 星見塔 | 2 | 記録者 | v5.4 実装 |
| 33 | world_sky | sky_temple_1/2 | 天空神殿 | 2 | 守護者・制御装置の間 | v5.4 実装 |
| 34 | world_dark | void_wasteland_1/2 | 虚無の荒野 | 2 | ザルグの残滓・セヴランの影 | v5.4 実装 |
| 35 | world_dark | demon_castle_gate＋1〜5 | 魔王城 | 5＋門 | 封印3・相場魔王3連戦 | v5.4 実装 |

## 5. 章ごとの到達範囲
| 章 | 到達できる地域 | 解放される移動手段 |
|---|---|---|
| 1〜3 | world（徒歩） | ― |
| 4 | world 沿岸・海 | 小型帆船 |
| 5 | world_grania | ― |
| 6〜7 | world_kalion（灰の峠経由） | ― |
| 8〜9 | world_islands、海底 | 遠洋航海船、潜航装置 |
| 9〜10 | world_desert、world_snow、world_tempus | 遠洋船・陸路 |
| 11〜12 | world_machine | 転移門 |
| 13 | world_magicka、world_dragon | 遠洋船 |
| 14 | world_sky | 飛空艇 |
| 15〜16 | world_dark | 飛空艇 |

## 6. グラニア鉱業地方（world_grania）の設計図【今回実装】
- サイズ：40×30 MACRO → 160×120。西岸（x≈8〜12）に浅瀬と船着き場、中央に灰の平野（草原＋丘、煤けた色調）、北東に山地と鉱山入口、南東に工場地帯の煙、北に灰の峠（→カリオン、今回はダンジョン入口のみ「封鎖中」）
- 場所：verum_town（町、x≈60,y≈56）、iron_mine（北東 x≈92,y≈40）、ash_cave（隠し、北 x≈48,y≈22）、grania_outpost（北西 x≈40,y≈30）、grania_dock（西岸 x≈12,y≈58：船の停泊位置）、grania_cape（灰の岬・船でのみ：南西の岩礁）
- 海路：world_grania の西端（x=0〜1、水上）⇄ world の東端（x=158〜159、水上）。同じ相対 y で移る
- エンカウント：灰の平野（smoke_wraith, iron_beetle, chain_hound, ash_golem、Lv9〜11）、沿岸の海（sea_serpent, gull_pirate, jelly_float, reef_crab、Lv8〜10。乗船中のみ）

## 7. ワールド画面の表示【一部実装】
- 「現在のエリア」タブ：既存のミニマップ拡大（地域マップ・町・ダンジョン）
- 「世界」タブ：12地域の模式図。到達済みは名前と色、未到達はシルエット＋「？」。乗り物の現在位置、主人公の位置、海路を線で表示【未着手】
- ミニマップ（拡大表示）に乗り物のアイコン（停泊中の船）を表示【今回実装】
