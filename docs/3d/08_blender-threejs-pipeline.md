# Blender と Three.js による3D制作方式（統一ルール）

既存のパイプラインを使い続けています（別の方式へ全面的には移していません）。
- `three-src/tools/blender/build_assets.py`
- `three-src/tools/textures/make_textures.py`
- `three-src/src/assets/manifest.js`
- `three-src/public/models/`
- `three-src/src/world/`

## 1. 役割の分担
| 担当 | 作るもの |
|---|---|
| **Blender**（bpy。この環境は Blender 本体なしで bpy 5.2.3 を実行） | キャラクター・NPC・モンスター・ボス・骨（リグ）・アニメーション・武器と防具・建物の部品・小物・船・飛空艇・アストラ号 → **GLB** |
| **Three.js** | 地形（タイルから手続き型で生成）・配置・光・カメラ・移動・戦闘・その場の演出（粒・光の柱・溶ける消え方） |
| **Three.js（2.5D）** | 戦闘の敵：2D版の絵から厚みのある立体を自動生成（`src/battle/ArtVolume.js`）。元のデザインを保つため、Blender でモデルを作り直さない |

## 2. 流れ（作る → 変換 → 検証 → 登録）
1. **作る**：`tools/blender/*.py` を実行する。GLB を書き出すたびに、同じ場面を `.blend`（圧縮）で `three-src/blender/` に保存する（`pipeline.py`）。
2. **登録**：同じタイミングで、`three-src/assets/registry.json` に書き込む。
   - id・種類・状態・作ったスクリプト・パラメータ・`.blend`・GLB・マテリアル・アニメーション
3. **検証**：`node tools/validate_assets.mjs [--strict]` を実行する。結果は `tools/asset_report.md` / `.json` に書かれ、実際の三角形数が登録表に入る。確認する項目：
   - GLB の形式
   - 骨とアニメーションがそろっているか
   - 色を差し替えるマテリアルがあるか
   - 三角形数が予算内か
   - `manifest.js`・登録表・`.blend` の対応
4. **使う**：`src/assets/manifest.js` に載せる。Phase 1〜2 で追加したモデルは `lazy: true` で、使うときに読み込む（起動の時間を増やさない）。

| スクリプト | 作るもの | 状態 |
|---|---|---|
| `build_assets.py`（既存） | 主人公・リナ・村人など10体、小物・家具・木・岩 | done（既存。作り直していない） |
| `import_existing.py`（追加） | 既存のGLB 47個を読み込んで `.blend` として保存（GLB は書き換えない） | — |
| `build_world.py`（追加） | 地域の木（ヤシ・枯れ木・雪の針葉樹・サボテン）、小物（たいまつ・噴水・露店・石筍・鉱石・倒木・根・レバー・鉄格子・階段・ルーン・ボスの印・鍵の扉・魔法陣・茸）、ワールドマップの目印（村・城・洞窟・塔）、乗り物（帆船・大型船・飛空艇） | provisional（仮3D） |
| `build_party.py`（追加） | 仲間5人（kyle・mina・seris・gald・lucia）と NPC 7種（guard・king・scholar・sailor・bartender・shadow・hero_sage）。2D版の配色（`js/core/chars.js` の PALS）から自動生成。体の作りとアニメーション9種は主人公と同じ | provisional（仮3D） |
| `build_creatures.py`（追加） | モンスターの型14（slime・beast・reptile・bird・insect・plant・fish・spirit・knight・undead・demon・humanoid・golem・machine）。色は実行時に差し替え（`tint_body` / `tint_accent`） | provisional。**戦闘では使っていない**（敵は元の絵から立体化する方式に変更したため）。資産として残す |

## 3. 置き換えやすくするための約束
- **モデルの id は2D版の id に合わせる**（キャラクター＝スプライトの id、乗り物＝`veh_` ＋乗り物の id）。高品質なモデルに替えるときは、同じ id で GLB を差し替え、`manifest.js` の `status` を `done` にする。
- 骨の名前（17本）とアニメーション名（Idle・Walk・Run・Attack・Cast・Hit・Defend・Victory・Defeat）は共通にする。
  - 手作業で作ったモデルも、この名前にそろえれば、そのまま戦闘と探索で動く。
- 状態の区別：`done`（作り込み済み）と `provisional`（仮3D）。形を組み合わせただけのものや自動生成したものは `provisional` にし、完成扱いにしない。
- 性能の予算（`validate_assets.mjs` の BUDGET）：

  | 種類 | 三角形数 |
  |---|---|
  | キャラクター | 20,000 |
  | モンスター | 14,000 |
  | 小物 | 6,000 |
  | 木 | 4,000 |
  | 木の遠景（LOD） | 1,500 |
  | 目印 | 6,000 |
  | 乗り物 | 10,000 |

  既存の井戸（6,320）が小物の予算を超えている（注意として記録。作り直していない）。

## 4. 注意（確認できていること・いないこと）
- **できていること**：自動生成のモデルは、検証スクリプトで形式・骨・アニメーションを確認しています。見た目は確認ページ（`3d/viewer.html?lineup=characters` / `?lineup=creatures`）の画面で確認しました。
- **できていないこと**：
  - 美術品質の作り込み（顔・髪型・装備・ボス専用のモデル）。
  - Blender 本体の画面（GUI）での手作業の調整。
