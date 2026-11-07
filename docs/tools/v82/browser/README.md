# v8.2 の撮影・動画・回帰の道具（この作業環境で使った物の写し）

- `shots82.js`：ヘッドレス Chromium（Playwright）で地図ごとに画面を撮る。環境変数 `PORT`・`IDS`（地図 ID をカンマで）・`TAG`・`VP`（1920x1080 など）・`Q`（low/high）・`SHOT`（出力先）・`AT=id:x:y[:dir]`（立つ所）・`CINE=id:x:z:dist:pitch`（見せ場のカメラ）・`QS`（URL の後ろ。例 `layout=off`）
- `video82.js`：`MODE=ticker`（証券市場の中で 12 秒）・`ticker_town`（広場）・`ship`（船でリングの下を通る。海流で流されるのを止める）・`chunks`（大洋のチャンクの境を東西南北から越える。となりの海の物語の鍵を開ける）・`leak`（6 地図を 4 周。`LEAKSEQ=id:x:y,...`・`LEAKN`）
- `run82finalA.sh`・`run82finalB.sh`：最終の撮影（スナップショット `envsnap_a82t4`＝コミット ec4ddbb を静的に配信）
- `reg82_main.sh`・`reg82_rest.sh`：回帰のテストの実行（`/home/claude/work/*.js` は、この作業環境で前から使っているリポジトリの外のテスト）
- パスはこの作業環境の物（`/home/claude/...`）。別の環境では書き換えて使う
