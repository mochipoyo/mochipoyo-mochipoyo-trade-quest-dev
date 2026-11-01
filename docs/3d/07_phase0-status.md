# Phase 0：現状分析と開発環境の確認（本格フル3D化プロジェクト）

作業日：2026-11-01　ブランチ：`feature/3d-full`（`feature/3d-remaster` の `0fbc8a3` から分岐）　**本番（GitHub main）には反映していません**

## 1. 確認できている事実

### 1-1. 3D版のソースの場所
| 項目 | 内容 |
|---|---|
| 3Dのソース | `three-src/`（Three.js 0.186.1 ＋ Vite 8.3.4）。作業用のリポジトリ（この環境の `/home/claude/mochipoyo-trade-quest`）のブランチ `feature/3d-remaster` / `feature/3d-full` にだけある |
| 公開用リポジトリ | GitHub `mochipoyo/mochipoyo-trade-quest` の main には **ビルド済みの `3d/` だけ** があり、`three-src/`（ソース）は入っていない |
| 起動 | `cd three-src && npx vite build` → `3d/` に出力。`3d/index.html` が入口（2D版の `index.html` の画面部品・スクリプトをビルド時に取り込む） |
| Blender | この環境には Blender 本体（実行ファイル）は無く、Python モジュールの **bpy 5.2.3 LTS（Python 3.13）** で同じ処理を実行できる |

**リスク：** ソース（`three-src/`）がこのクラウドの作業環境にしか無い（作業環境は一定時間で消える）。

**対策（実施済み）：**
- `git bundle --all`（110MB・全ブランチ。検証済み）を作成。
- `three-src`（node_modules を除く）と `docs/3d` を tar.gz（5.8MB）にまとめ、お渡し済み。
- 非公開リポジトリ `mochipoyo/mochipoyo-trade-quest-dev` への保存をお願いしています。2026-11-01 時点では**未作成**で、このセッションからはまだ押し上げられていません。リポジトリの作成はこのセッションの権限ではできませんでした（403）。

### 1-2. セーブデータの扱い（変更なし）
- 2D版：`mtq-rpg-v2-slot-*`。3D版：`mtq-3d-slot-*`（3D版は2D版のセーブを読むだけ。コピーして3D版の枠へ保存）。
- 3D版の設定（セーブとは別）：`mtq3d-quality`・`mtq3d-pitch`・`mtq3d-battle` は既存です。今回 `mtq3d-scope`・`mtq3d-battle-actors` を追加しました。
- セーブデータの形式（`State`）は今回変更していません。

### 1-3. 実データの棚卸し（jsdom で2D版のスクリプトをそのまま実行して数えた）
| 区分 | 数 | 内訳 |
|---|---|---|
| マップ | 330 | field 12（すべて 160×120）・town 25・interior 167・dungeon 126 |
| タイルの種類 | 80 | 地形・壁・家具・ギミック・ワールドマップの目印など |
| 敵 | 248 | うちボス 44。art.family は47種類。art の無い敵が16体（盗賊・兵士・海賊など） |
| NPC | 473 | 配置の定義の数。見た目（スプライト）は56種類 |
| 職業 | 20 | |
| 仲間 | 14 | lina・kyle・mina・seris・gald・lucia・elna・nagi・iris・sophia・io・ganes・aster・ord |
| 乗り物 | 3＋1 | sailboat・galleon・airship ＋ アストラ号 |
| 重要イベント | 313 | マップの出来事のうち script 275・boss 34・trial 2・board 1・dive 1 |

### 1-4. 3D化済みの範囲（Phase 0 時点）
- **マップ**：ポヨ村と屋内6か所（`MAPS_3D`）だけが3D表示。そのほかは2D版の画面のまま。
- **モデル**：GLB は47個。
  - キャラクター10体：主人公・村人など。17ボーン・アニメーション9種。
  - 小物・家具・木・岩。
- **戦闘**：3Dの舞台（背景）だけ。敵は2D版の絵、味方は表示していない。

### 1-5. 描画負荷の計測（ソフトウェア描画。**実機の fps ではありません**）
Playwright の Chromium（SwiftShader＝GPU を使わない描画）で計測しました。

| 項目 | 値 |
|---|---|
| 3D の準備完了まで | 2,620ms（WebGL2・画質「高」） |
| ポヨ村 | 描画 150回・約78万三角形・形状 71・テクスチャ 48・組み立て 753ms・JSヒープ 57MB |
| ループの fps | 1（ソフトウェア描画のため。1フレームの描画 8〜21ms はGPUの処理を含まない参考値） |
| 戦闘の舞台 | 組み立て 29ms（草原） |

## 2. 推測・可能性
- 実機（GPU あり）では、ポヨ村の 150描画・78万三角形はPCでは問題ない範囲と推測します。スマホでは画質「軽量」が必要になる可能性があります。**未計測です。**
- `three-src` を作業環境の外へ保存するまでは、作業環境が消えると3Dのソースを失う可能性があります。

## 3. 追加確認が必要な点
- 非公開リポジトリ `mochipoyo/mochipoyo-trade-quest-dev` の作成。作成後、このセッションから全ブランチを押し上げます。
- GPU のある実機（PC・iPhone・Android）での fps。
