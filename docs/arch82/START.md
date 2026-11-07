# v8.2 町・城・学院・内装の大改修：開始時の記録

- 記録日時：2026-11-07 14:40（日本時間）
- 開始時の HEAD：`d6e28117632f64085a89a2905c9c65022a785030`（dev リポジトリ `mochipoyo/mochipoyo-mochipoyo-trade-quest-dev` の `feature/earth78`）
- 開始時の作業ツリー：未コミットの変更なし（`git status` が空）
- 作業ブランチ：`feature/arch82`（上の HEAD から分岐。`feature/earth78` の進行中の変更をすべて含む）
- 資料（03_SOURCE_AUDIT.md）の確認時 HEAD は `1f8e272`。その後の `feature/earth78` のコミット（§24 の骨組み・木と岩山・光・回帰の直し）を含む今の HEAD を基準にする
- 確認 URL の `?_v=0c64fc600e` はコミットではなく `tools/stamp-version.js` が書く版の印（`version.json`）。0c64fc600e は 176bd35 のころの版の印で、開始時の版の印は `4c6a6f52ee`（9b4a3c9 以降）

## 起動方法（この環境で使っている方法）
1. リポジトリの最上位を静的に配信する：`python3 -m http.server 8772 --directory <リポジトリ>`
2. 3D 版：`http://localhost:8772/3d/index.html`（2D 版：`http://localhost:8772/index.html`）
3. 3D のビルド：`cd three-src && npx vite build`（`../3d` に出力）→ `node tools/stamp-version.js`（版の印を `3d/index.html`・`index.html`・`version.json` に書く）
4. jsdom の確かめ：`docs/tools/v78/load78.js` で 2D 版／地球の世界を読み込む（`docs/tools/v81/*.js` など）
