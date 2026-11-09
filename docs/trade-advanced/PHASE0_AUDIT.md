# トレード上級（Phase 6〜8・追加 A〜D）Phase 0 の監査

作業日：2026-11-09　対象：もちぽよトレードクエスト（2D 版 `index.html`・3D 版 `3d/index.html`）

## 1. コミットとブランチ

| 項目 | 値（確認済み） |
|---|---|
| 作業を始めたときの HEAD | `4f4f6e30eec63208ed5896ab6c052007c7068657`（2026-11-09 15:17:53 +0900「トレード学習：報告に確認した開発版の URL を記入」） |
| 指定のコミット | `903cf05721091337ea14364c5760a339500ae82c`（2026-11-09 15:17:21 +0900「トレード学習 Phase 7：最終の回帰テスト・性能の比較・報告」） |
| 2 つの関係 | `903cf05` は HEAD の祖先（`git merge-base --is-ancestor` で確認）。HEAD は `903cf05` の 1 つ後（報告書に URL を書き足しただけのコミット） |
| 作業用のブランチ | `feature/trade-advanced-phase6-8-20261109`（HEAD `4f4f6e3` から作成。最新の作業を失わない） |
| 押し先 | 開発用のリポジトリ `dev`（mochipoyo/mochipoyo-mochipoyo-trade-quest-dev）だけ。`main`・公開の本番へは、マージも公開もしない |
| 開始時の作業ツリー | 変更なし（`git status` が空） |

## 2. 読んだ資料

`README.md`（版の記録）・`docs/trading-learning/REPORT.md`（v9.0）・`AUDIT` 系・`docs/perf89`（v8.9）・`docs/ux88`（v8.8）・`docs/tools/tl`（v9.0 のテスト）・`docs/tools/v89`。
セーブは 3D が `mtq-3d-slot-*`、2D が `mtq-rpg-v2-slot-*`（別のキー。v8.x から変えていない）。

## 3. 変更前の基準のテスト（HEAD `4f4f6e3`）

- v9.0 のテスト一式（`docs/trade-advanced/logs/baseline_tl.log`）：tl_p1 64・tl_p2 49・tl_p3 37・tl_p4 9・tl_p5 10・tl_save 9×2・tl_ui 39×2、すべて OK
- v8.9 の一式（`docs/tools/v89/regress89.sh`）と既存のトレード関係（`docs/tools/tl/tradetests.sh`）：v9.0 の報告（`docs/trading-learning/REPORT.md` 7 章）に書いた結果と同じ。既知の NG は次の 4 つ

## 4. 既知の NG の分類（6.6）

| テスト | 内容 | 分類 | 根拠 | 対応 |
|---|---|---|---|---|
| `v81/dow_open_test`（3D 相当 NG 2・2D NG 1） | 3D：「right −2：その並びに外から入れる範囲のマスがない」「right から入ると…同じ順 [19,39]」。2D：「北へ出て、すぐ振り返って南へ 1 歩 → 村の北の辺に戻る」 | **本当の不具合**（フィールドのトレードマスターの立つ場所） | 二分探索（コミットごとに 3D・2D を実行）で 2D の NG は `d6bea16`（v8.3：フィールドにもトレードマスターを置いた）から。2D では `tmb83_world_0` が村の北の出口のすぐ南（55,67）に立っていて、村へ戻る 1 歩をふさいでいた。3D では `tmb83_world_2`（97,73）が村の入口の範囲の右のすぐ外に立ち、右の −1 の並びから入る道をふさいでいた（−2 の並びは森で、もともと入れない）。置く場所を選ぶ処理（`js/rpg/trademaster83.js` の spots）が、開いた村の「入口の範囲」（`World.landmarkFoot`）を出入口として見ていなかった | 修正：入口の範囲のマスから 2 マス以内には置かない。修正の後 3D・2D とも「すべて OK」。フィールド 15（3D）・12（2D）でトレードマスター 3 人ずつ置けている（`TM.errors` は空）。tm88・tm83・route88（3D・2D）も OK |
| `tradiatest`（62 OK／1 NG「建物の中から出ると入口の前に戻る」） | 地図のデータ（`MAP_DEFS`）の扉の座標と出口の座標を、そのまま比べていた | **テストの想定が古い** | v8.1 で町の地図を作り直し（`MapRemake.pos` で座標を写す）たあと、実際に建物から出た位置は扉のとなり（ゲームを動かして 24/24 で確認）。比べるべきは作り直した後の座標 | 更新版 `docs/tools/tl2/updated-tests/tradiatest.js`：作り直した後の座標で比べる（20 個以上の出口すべてが扉の隣）。63 OK / 0 NG。元のテストは消さずに残す |
| `learntest`（ときどき「practice no double reward」が NG） | 毎回ではない | **テストの手順の問題** | タイトル画面のメニューが残ったまま次の操作をすると、テストの自動の操作が「はじめから」を押して `State.newGame` を呼び、記録が消えて二重の報酬の確かめが崩れていた（ゲームの報酬の処理は二重に出していない） | 更新版 `updated-tests/learntest.js`：起動の後に残ったタイトルの窓を片付けてから進める。5/5 回 OK |
| `ult/dojo_test`（4 件） | 「ガレン on dow_dojo (6,5)」「practice count 2: 1」「practice stats」「ultTime cycled -> 8」 | **テストの想定が古い** | ①ガレンの位置：v8.1 の地図の作り直しで (15,7)（`MapRemake.pos('dow_dojo',6,5)`）。②③チャート修行：v8.8 で最初に「時間の進め方」を選ぶ質問が増え、テストの選ぶ順が 1 つずれていた。④必殺技の判断時間：v8.8 で設定の画面がタブ（「戦闘・トレード」）に分かれ、最初のタブに項目がない | 更新版 `updated-tests/dojo_test.js`：作り直した後の座標・質問の順・タブを押してから選ぶ。21 OK（ALL OK）。元のテストは残す |

※ v9.1 の表示名の変更（「予想最大損失」→「通常約定時の推定損失」。指示書 6.2）で、v9.0 の `tl/tl_ui_test.js` の 1 項目（文言の確かめ）が NG になる。これは仕様どおりの変更なので、文言だけを新しい名前に合わせた更新版 `updated-tests/tl_ui_test.js`（39 OK）を置いた。元のテストは消していない（元のまま動かすと 38 OK / 1 NG：その 1 件は文言だけ）。

### 再現方法と影響範囲

| テスト | 再現方法（リポジトリの直下で） | 影響範囲 |
|---|---|---|
| dow_open_test | `node docs/tools/v81/dow_open_test.js`（3D 相当）・`node docs/tools/v81/dow_open_test.js 2d`。修正の前の版（例：`4f4f6e3`）で NG、`bda86ac` 以後は すべて OK | プレイヤーへの影響あり（修正済み）：ダウの村から北へ出てすぐ戻る 1 歩（2D）・右の 1 つの並びから村へ入る道（3D）が、トレードマスターの NPC にふさがれていた。遠回りすれば入れたので、進行が止まることはなかった。修正でトレードマスターの立つ場所が変わる（セーブには位置を保存していないので、旧セーブへの影響なし） |
| tradiatest | `cd /home/claude/work && RPG_DIR=<リポジトリ>/ node tradiatest.js`（元：62 OK / 1 NG）・`RPG_DIR=<リポジトリ>/ node <リポジトリ>/docs/tools/tl2/updated-tests/tradiatest.js`（更新版：63 OK） | テストだけ（ゲームは正しく動く） |
| learntest | `cd /home/claude/work && RPG_DIR=<リポジトリ>/ node learntest.js` をくり返す（ときどき「practice no double reward」）・更新版は `docs/tools/tl2/updated-tests/learntest.js` | テストだけ（二重の報酬は出ていない） |
| ult/dojo_test | `cd /home/claude/work && RPG_DIR=<リポジトリ>/ node ult/dojo_test.js`（元：FAIL 4 件）・更新版 `docs/tools/tl2/updated-tests/dojo_test.js`（ALL OK） | テストだけ |
| tl/tl_ui_test（v9.1 の仕様変更） | `node docs/tools/tl/tl_ui_test.js`（元：38 OK / 1 NG）・`node docs/tools/tl2/updated-tests/tl_ui_test.js`（39 OK） | テストだけ（表示名を仕様どおりに変えたため） |

更新版に置き換えて全体を動かすスクリプト：`docs/tools/tl2/regress_v91.sh`（v8.8 で ftmenu・layout_menu を更新版に置き換えたのと同じ考え方。元のテストは消していない）。

## 5. Phase 6 で見つけて直した不具合（v9.0 のコード）

- `StrategyProfiles.evaluateEntry`：上位足と逆（htf_against）を「注意だけ」にした設定で、`else` のせいで日足と 4 時間足の食い違い（htf_conflict）の妨げが判定されなかった → 2 つを別々に判定
- 上位足の「履歴不足」と「レンジ」が同じ扱いになりうる表示 → 状態を 上昇／下降／レンジ／履歴不足（判定不可）に分けた
- 成績の最大DD：金額の最大と割合の最大を同じ区間として出していた → 別々に求める
- 記録の上限（300 件）を超えると古い記録が消え、成績の資金曲線の始まりが分からなくなっていた → archive と残りの記録の最初の資金を保存
- 実践道場の画面の大きさの変化で `root.onresize` を上書きしていた → `addEventListener` にして閉じるときに外す

## 6. 確かめていないこと

- 実機（スマホ・タブレット）での操作、GPU での 3D の表示：作業環境に実機がないため未検証（ヘッドレス Chromium での自動の確かめだけ）
- 開発版の URL を外のブラウザで開くこと：作業環境から外へのブラウザの接続ができないため未検証
