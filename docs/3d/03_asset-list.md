# 3D アセット制作リスト

すべて `three-src/tools/blender/build_assets.py`（Blender 5.2 の Python）と `three-src/tools/textures/make_textures.py` で **スクリプトから生成** しています（外部の素材・有料素材・既存作品の模写は使っていません）。
管理表は `three-src/src/assets/manifest.js`（modelId・パス・拡大率・向き・足元・アニメーション・LOD・代替・状態）。

## 1. Phase 1 で作成済み（ポヨ村）

### 1-1. キャラクター（スキンつき、骨17本、アニメーション9種）

アニメーション：Idle（待機）／Walk（歩き）／Run（走り）／Attack（攻撃）／Cast（呪文）／Hit（被弾）／Defend（防御）／Victory（勝利）／Defeat（倒れる）

| modelId | 用途（2D版の sprite） | 三角形 | 備考 |
|---|---|---|---|
| hero | 主人公 | 約8,300 | 剣・盾・鎧・肩当て・マント・スカーフ。**職業ごとの見た目の違いは未対応** |
| villager_m | 村人（男）、ほか代用 | 約6,000 | |
| villager_f | 村人（女） | 約6,800 | |
| child | 子ども | 約6,100 | 0.82倍 |
| elder | 村長・長老 | 約6,300 | ひげ・ローブ・杖・前かがみ |
| priest | 神父 | 約7,300 | フード・ローブ・金の杖 |
| merchant | 商人・道具屋 | 約7,100 | 帽子・背負い袋 |
| master | 師匠ハケイ | 約7,100 | |
| innkeeper | 宿屋の主人 | 約6,300 | エプロン |
| lina | リナ | 約7,300 | 帽子・杖 |

読み込み時に部品を結合（`engine/Flatten.js`）：1体あたり描画1〜2回＋武器。

### 1-2. 建物（コードで組み立て：`world/BuildingBuilder3D.js`）

村長の家（2階建て）・道具屋・宿屋（2階建て）・教会（鐘楼・尖塔・バラ窓）・トレード修行場（幟）・農夫の家。
石の土台／しっくい壁／木組み（柱・梁・筋かい）／2階のせり出し／板瓦を段に重ねた切妻屋根／破風板／ドーマー窓／窓（枠・桟・よろい戸・花箱・夜は灯る）／扉（枠・金具・取っ手・石段）／壁掛けランタン／煙突と煙／名札／吊り看板（施設のアイコン）。

### 1-3. 小物・家具・植物（GLB）

| 種類 | modelId |
|---|---|
| 村の小物 | lamppost（街灯）、wall_lantern、barrel、crate、bench、well（井戸）、flowerbed、fence、sign、crops |
| 看板のアイコン | icon_potion、icon_bed、icon_sword、icon_bell、icon_chart、icon_scroll |
| 家具 | furn_bed、furn_table、furn_counter、furn_bookshelf、furn_pillar、furn_crystal |
| 木・岩 | tree_pine_a/b/c、tree_oak_a/b/c（各 LOD1 つき＝遠景用の低ポリゴン版）、bush_a、rock_a/b |
| コードで生成 | 宝箱（ふたが開く）、村の門、教会の長椅子、祭壇のろうそく、暖炉、人工チャートの掲示板、草（風で揺れる）、花 |

### 1-4. テクスチャ（512〜1024px、周期的）

grass・dirt・cobble（＋高さ）・plaster・timber・planks・shingles・stonewall・carpet（各 albedo＋normal）

## 2. 代替で表示しているもの（status：fallback）

2D版の sprite のうち、3Dモデルがまだないものは近いモデルで表示します（`characterModelFor`）。

| 2D版 sprite | 代わりに使うモデル |
|---|---|
| bartender | innkeeper |
| guard、sailor | villager_m |
| king、scholar | elder |
| shadow | priest |
| その他（kyle、seris、mina、lucia、gald、federal_soldier、royal_guard、rune_knight、minister、desert_raider、debt_collector、hero_sage） | villager_m |

※ ポヨ村に登場する NPC（child・villager_f・villager_m・elder・priest・lina・master・merchant・innkeeper）は代替なしで専用モデルがあります。

## 3. Phase 2 以降で作るもの（予定）

| 区分 | 数（2D版の実数） | 方針 |
|---|---|---|
| NPC の専用モデル | 2D版の sprite 27種のうち残り約17種 | 地域ごとに必要な分から |
| 仲間キャラクター | 14人 | 戦闘の3D化（Phase 3）に合わせて |
| 主人公の職業別の見た目 | 職業20 | 装備の付け替え（武器・服の色・帽子）で対応予定 |
| モンスター | 191種（`ENEMIES` のキー数。依頼文の「192種類」とは1種の差があり、要確認） | **一度に簡易モデルへ置き換えない**。地域ごと・系統ごと（スライム系など）に高品質の基本形を作り、色・装飾で派生 |
| 建物の種類 | 武器屋10・防具屋9・酒場6・ギルド8・銀行5・城6・倉庫2・船1（2D版の配置数） | BuildingBuilder3D に種類ごとの形を追加 |
| 地形 | 水・海・砂・雪・溶岩・洞窟・雲 など（2D版のタイル68種） | 地域ごとに追加 |
| 乗り物 | 3（船・飛空艇ほか） | Phase 4 |
