# 変更ファイル一覧（3D版 Phase 0・Phase 1）

ブランチ：`feature/3d-remaster`（2D版 v5.6＋確認用メニュー `ea92017` から分岐）

## 1. 既存ファイルの変更（2D版）

| ファイル | 変更 | 2D版への影響 |
|---|---|---|
| `js/rpg/state.js` | 3D版用の保存先（`window.MTQ_SAVE_PREFIX` が `mtq-3d-…slot-` のときだけ使う）と `State.keyPrefix` を追加（4行） | なし（2D版では `MTQ_SAVE_PREFIX` が未定義なので従来どおり `mtq-rpg-v2-slot-*`）。2D版の回帰テストで確認 |
| `README.md` | 先頭に「3D版（開発プレビュー）」の節を追加 | なし |

2D版の `index.html`・`styles.css`・`js/`（state.js 以外）・`assets/` は **変更していません**。

## 2. 追加したファイル

### 2-1. 公開用（ビルド済み）`3d/`（71ファイル・約7.6MB）

| パス | 内容 |
|---|---|
| `3d/index.html` | 3D版の入口（2D版の画面部品・スクリプト一覧をビルド時に取り込み済み） |
| `3d/viewer.html` | モデル・アニメーション確認ページ |
| `3d/assets/*.js` | Three.js とゲーム側の3Dコード（ビルド結果3ファイル） |
| `3d/models/*.glb` | 3Dモデル47（キャラクター10・小物・家具・木（LOD つき）・岩） |
| `3d/textures/*.jpg` | テクスチャ19 |

### 2-2. 開発用ソース `three-src/`（`node_modules` を除く 91ファイル）

| パス | 内容 |
|---|---|
| `three-src/package.json`・`package-lock.json`・`vite.config.js`・`.gitignore` | ビルド設定（`npm run build` → `../3d/`） |
| `three-src/index.html`・`viewer.html` | ページの元 |
| `three-src/src/**/*.js` | 3D のソース（設計書 3-1 のモジュール一覧） |
| `three-src/public/models`・`public/textures` | 生成済みのモデル・テクスチャ（ビルドで `3d/` へコピー） |
| `three-src/tools/blender/build_assets.py` | Blender（bpy）でキャラクター・小物・木を生成するスクリプト |
| `three-src/tools/textures/make_textures.py` | テクスチャ生成スクリプト |

### 2-3. 資料 `docs/3d/`

`01_3d-design.md`・`02_feature-checklist.md`・`03_asset-list.md`・`04_roadmap.md`・`05_phase1-test-results.md`・`06_changed-files.md`・`images/`（画面写真）
