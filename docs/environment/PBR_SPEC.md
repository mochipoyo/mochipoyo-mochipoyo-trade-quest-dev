# PBR（法線・AO・粗さ）の画像：現状と素材仕様

更新：2026-11-04（v7.6 環境リデザイン・追加作業）

## 1. 現状（正直な区分）

| 対象 | 法線 | AO | 粗さ | 区分 |
|---|---|---|---|---|
| コードで描く模様（切石・石畳・板・六角タイル・陶板）：tradia の `tr_ashlar` `tr_ashlarD` `tr_setts` `tr_settsS` `tr_cobW` `tr_slabs`、node_city の `ceramic` `hexL` `hexD` `hexP`、町の作り直し（town_kit）の `tk_*`、屋内・ダンジョン（room_kit）の `rk_*` | あり | あり | あり | **手続き的なPBR（コードで作る）**。高画質だけ |
| tradia の放射状の広場 `tr_radial`・掲示板 `tr_board`・番号札・掲示 | なし | なし | なし | 対象外（模様の高さを定義していない） |
| パックの写真風の画像 6 枚（下の表） | なし | なし | なし | **未制作**（仕様と読み込み口のみ） |

### 手続き的なPBR の作り方（`three-src/src/environment/ProcPBR.js`）
- 色の画像と**同じ並び**（石の幅・高さ・段のずれ・目地 1.5 画素）で「高さ」を計算する。石＝1、目地＝0、角は面取り（なだらか）。石ごとにわずかな傾き。
- 高さから、法線（傾き）・AO（まわりより低い所＝目地を暗く）・粗さ（目地を粗く、石の上を少し滑らかに）を計算する。
- **色の画像の明暗からは作っていない**（パックの materials.json の注意「画像の明暗から法線を自動捏造しない」に従う）。
- 計測（スキャン）や制作ソフトで作られたPBRではない。形が単純な模様（四角い石・六角タイル）だから成り立つ方法。
- 画像は 2 枚：`normal`（RGB＝法線、OpenGL の向き）と `orm`（R＝AO、G＝粗さ）。three.js の aoMap は R、roughnessMap は G を読む。
- 高画質（設定の画質＝高）だけで作る・付ける。低画質では作らない（材質・見た目は従来どおり）。
- URL に `?pbr=off` を付けると付けない（撮り比べ用）。

## 2. パックの写真風の画像 6 枚：素材仕様（未制作）

置けば読み込まれる：`three-src/public/environment-v1/data/materials.json` の各項目に、下のファイル名を書く（`normalMap` は既にある項目。`aoMap`・`roughnessMap` は新しく足す）。読み込みは `EnvironmentCatalog.material()`（高画質のときだけ）。

| 名前 | 色の画像（既存） | 法線（作る） | AO（作る） | 粗さ（作る） | 繰り返し |
|---|---|---|---|---|---|
| stone_courtyard | textures/stone_courtyard.jpg | textures/stone_courtyard_n.png | textures/stone_courtyard_ao.jpg | textures/stone_courtyard_r.jpg | 3 m |
| stone_fortress | textures/stone_fortress.jpg | textures/stone_fortress_n.png | textures/stone_fortress_ao.jpg | textures/stone_fortress_r.jpg | 3 m |
| stone_sandstone | textures/stone_sandstone.jpg | textures/stone_sandstone_n.png | textures/stone_sandstone_ao.jpg | textures/stone_sandstone_r.jpg | 3 m |
| wood_oak | textures/wood_oak.jpg | textures/wood_oak_n.png | textures/wood_oak_ao.jpg | textures/wood_oak_r.jpg | 2 m |
| rock_basalt | textures/rock_basalt.jpg | textures/rock_basalt_n.png | textures/rock_basalt_ao.jpg | textures/rock_basalt_r.jpg | 3 m |
| metal_industrial | textures/metal_industrial.jpg | textures/metal_industrial_n.png | textures/metal_industrial_ao.jpg | textures/metal_industrial_r.jpg | 3 m |

共通の条件：
- 解像度 1024×1024（色の画像と同じ）。上下左右がつながる（シームレス）。色の画像と**同じ形**から作る（色の画像の明暗を変換しただけのものは不可）。
- 法線：接空間・**OpenGL の向き（緑＝上）**。PNG（8 bit）。JPEG は不可（ブロックのノイズが光って見える）。
- AO・粗さ：グレースケール・リニア（sRGB にしない）。JPEG 品質 90 以上でよい。粗さは「白＝粗い」。materials.json の `roughness` の値が画像に掛かる（画像を使うときは `roughness` を 1.0 にする）。
- 出所（作った方法・ソフト・元の画像）を materials.json の `source` に書く。`status` を「authored PBR」などに変える。
- 作れるのは：写真測量・スキャン、Substance などの制作ソフトで高さから作る、または元の 3D の形から焼き付け。

## 3. 確認の状況
- 手続き的なPBR：ヘッドレスのブラウザ（ソフトウェア描画）で、高画質の付けた／付けないを撮り比べた（docs/images/environment/ の pbr_*.jpg）。実機の GPU での見え方・速さは**未検証**。
- パックの 6 枚：画像がないので未検証（読み込み口は、ファイルがないときに何もしないことだけ確認）。
