# 3D版の確認用スクリプト（Phase 1〜2。開発用）

報告書（`docs/3d/09_phase1-2-report.md`）の「テスト」の表に書いたスクリプトです。作業環境（クラウド）で使ったものを、そのまま保存しています。

## 動かし方（作業環境で使った手順）
1. ビルド：`cd three-src && npx vite build`、続けてリポジトリの一番上で `node tools/stamp-version.js`（JS の ?v= と版の番号。v6.6）
2. リポジトリの一番上で静的サーバー：`python3 -m http.server 8770`
3. Playwright（Chromium）で実行：例 `node p2_battle.js rivel_castle:boss_valen`

## 注意
- 画面の保存先・結果の JSON は、作業環境のフォルダ（`/home/claude/work/p3d/…`）に固定で書いてあります。ほかの環境で使うときは書き換えてください。
- ソフトウェア描画（GPU なし）での確認用です。fps・同期のずれの数値は実機の値ではありません。
- 2D版の回帰テスト一式（`regress65.sh` ほか）は、このリポジトリには入っていません（作業環境のフォルダにあるもの）。

| スクリプト | 内容 |
|---|---|
| p1_allmaps.js | 全マップを表示せずに組み立てる |
| p1_maps.js | 指定したマップに入って描画・計測（ZOOM・TAG） |
| p1_walk.js | 歩く・出入り・外周退出・乗船 |
| p2_battle.js | 3Dの戦闘の開始画面（"マップ:敵,敵"） |
| p2_turn.js / p2_frames.js | 1ターンの流れ・連続画面 |
| p2_sync.js | 動きと命中の時刻のずれ（オート戦闘） |
| p2_layout.js | 敵どうしの重なり・味方の位置 |
| p2_pxkinds.js | 味方のドット絵にどの絵を使ったか |
| p2_bosssym.js | 探索中のボスのシンボル |
| p2_mobile.js | スマホの横・縦 |
| p2_mobile2.js | スマホの戦闘：画面部品が3Dの敵・味方を隠す割合（端末名を並べて指定。SETS="マップ:敵,敵|…"） |
| p2_mobile_play.js | スマホ（縦）でタップして戦闘を最後まで・途中で横向き・戦闘後に元へ戻るか |
| p2_robust.js | 3Dの素材の読み込み中の戦闘・WebGL の文脈が失われたとき・例外のとき（2Dと理由の表示→次の戦闘で戻る） |
| p2_wipesave.js | 全滅のメッセージの間に読み込み直したときのセーブと、次の戦闘（PAGE=2d／3d） |
| p2_battleguard.js | 全員倒れたままの戦闘・戦闘中の例外・味方がドット絵に固定されていること |
| p2_deadstart.js / p2_wipe.js | 全員倒れたまま戦闘を始めたとき／オート戦闘で全滅させたとき |
| p2_taint.js ＋ cors_server.py | 画像を別のサイト扱いにして（iPhone の Safari と同じ条件）3Dの戦闘が止まらないか。`python3 cors_server.py 8771 1`（CORS 許可）／`8772 0`（許可なし）を立ててから ORIGIN を指定 |
| p2_tools2d.js | 2Dのマップでも3D設定のボタンが出るか・3Dへ戻せるか・ページがずれたら戻るか |
| p2_scroll.js | スマホでページの高さ・ゲーム画面・ミニマップの位置（2D版・3D版） |
| p2_mapbtn.js | 全体マップを開いたとき3D設定が重ならないか・画面全体の拡大の合図を止めているか |
| p2_zoomreset.js | 画面全体が拡大されたままになったとき、等倍に戻すか |
| p2_2dmobile.js | 2D版のスマホの戦闘画面に3D版だけの変更が入っていないこと |
| p2_2dcheck.js | 2D版の戦闘画面が変わっていないこと |
| p3_save.js | セーブの互換（3D版の枠・2D版のキー） |
| viewer_shots.js | モデルの確認画面の撮影 |
| p2_battlebg.js | v6.6 戦闘背景の画像：場所ごとに戦闘を始めて撮る（PAGE=2d／3d、VIEW=pc／port／land、QUERY='?layout=side'、BLOCK=1 で画像を 404、SLOW=ミリ秒で遅延・EARLY=ミリ秒で読み込み前も撮る） |
| p2_landmarks.js | v6.6 フィールドの町・城・洞窟・塔（57か所）の昼・夜の画面（LOC=場所のID で1か所だけ、PORT=以前の版と比べるとき） |
| touch2d.cjs | v6.6 触れたら入る（2D版の処理を jsdom で）：入口の横・上・下から触れる・範囲の中を歩くだけ・閉ざされた場所・隠し場所 |
| p2_touch.js | v6.6 触れたら入る（3D版）：建物に向かって歩き、どこで入るか・閉ざされた場所・町から出た直後に入り直さないか |
| p2_hpbar.js | v6.6 敵のHPバー：初期値は表示しない・「表示する」で出る（2D版の戦闘の画面の緑の画素を数える）・設定の項目があるか |
| p2_update.js | v6.6 更新のお知らせ：JS がすべて ?v= つきで読まれるか・版が違えば「新しい版があります」・戦闘中は読み込み直さない・探索中は自動セーブして読み込み直す（PAGE=2d／3d） |
| p2_lampflicker.js | v6.6 夜の町の街灯のチラつき：歩きながら街灯ごとの明かりの急な変化を数える（PORT で以前の版と比べる） |
| （ルート）tools/check-battle-backgrounds.js | 戦闘背景の画像：対応表＝BattleBG65.PLACES、ファイル・WebP・寸法（`node tools/check-battle-backgrounds.js`） |
