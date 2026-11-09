# Phase 0 監査：トレードロジックの現状（基準コミット 9284c1d／作業開始時の HEAD afb3221）

- 作業ブランチ：`feature/trading-learning-accuracy-20261109`（`afb3221` から作成。`9284c1d` はこのブランチの祖先であることを `git merge-base --is-ancestor` で確認。9284c1d 以降はチャートの高さ（スマホ）の CSS・表示の変更だけで、売買ロジックのファイル（`js/trading.js`・`js/indicators.js`・`js/rpg/market.js` など）は 9284c1d と同じ）
- 再現の記録：`docs/tools/tl/baseline_probe.js` → `docs/trading-learning/logs/baseline_probe.json`（変更前のコードで実行）
- 変更前の回帰テスト：`docs/trading-learning/logs/regress_baseline.log`（`docs/tools/v89/regress89.sh` 一式）

## 1. ロジックの 2 系統と依存関係

```
[A 詳細問題の系統]                                   [B 動くチャートの系統]
js/config.js ─┬─ js/indicators.js（EMA/RCI/MACD/ZigZag/ダウ/ダイバ/analyze）
              │      │                                    │
              │  js/scenarios.js（5分足 60日分→各時間足に集約）   js/rpg/market.js（500 シナリオ・340本・8ティック/本）
              │      │                                    │  Market.indicators / assess / settle / Sim / StepSim
              │  js/trading.js（TradeEval）                │
              │   truth / evaluateFull / simulate /       js/rpg/ultimates.js（必殺技の威力・試験の採点 Ultimates.score / reasonMatch）
              │   applyResult / lotFor / suggestLevels     │
              │      │                                    js/ui/chartbattle.js（ChartBattleUI：描画・判断・結果・振り返り・upperOf）
              │  js/ui/trade.js（TradeUI.trial / quick）     │
              │  js/rpg/tradebattle.js（12人の NPC 戦略）     js/ui/dojo.js（師匠の修行・試験）
              │  js/ui/tradia.js（トレードバトル）            js/rpg/trademaster83.js（pips 対戦）
              │  js/rpg/learning.js・events.js（クエストの試練）  js/ui/battle.js（必殺技の発動）
              └─ js/rpg/leverage.js（トレディアのレバレッジ。Scenarios._internal.buildCandles を使う独立の計算）
```

## 2. 機能ごとの監査表

| 機能（入口） | 系統 | 見えるデータ | 採点 | 決済 | R 値・単位 |
|---|---|---|---|---|---|
| チャートの試練（`TradeUI.trial`：クエスト・学院・修行場の試練）<br>相場の試練（`TradeUI.quick`：戦闘中） | A | 5分足から集約した 5m/15m/1h/4h/1d。判断時点まで（`scn.base`） | `TradeEval.evaluateFull`：分析5問（35点）＋高値安値（5）＋行動（30）＋理由（10）＋注文/見送り（20）。行動の正解は `def.correct`、理由の正解は `REASON_OF[def.id]`（シナリオ ID ごとの固定） | `TradeEval.simulate`：エントリー＝判断時点の終値（スプレッドなし）、SL/TP は指定価格ちょうど、同じ足で両方→損切り（`ambiguous`）、96本で時間切れ | pips（pip=0.01）。資金への反映は `applyResult`：損益＝許容損失円×(pips÷損切りpips)。損切りなし・逆側は 0.5万通貨固定 |
| トレードバトル（トレディア `TradiaUI`） | A | NPC は `TradeBattle.npcView`（`scn.base` だけ） | `TradeBattle.score`：判断（evaluateFull×0.6）＋結果（25）＋規律（15）。過大リスクは上限40 | `TradeEval.simulate`（96本） | 結果 R＝pips÷損切りpips（損切りなしは 30pips を 1）。表の「最大ドローダウン」＝**取引中の最大逆行幅（MAE）** |
| 必殺技（戦闘 `battle.js` → `ChartBattleUI.open`） | B | 架空ペア POYO/MOCHI の 340 本（0〜39 は表示しない準備期間）。判断時点の形成中の足まで | 威力 `Ultimates.resolve`：利益は `R.r`（損益÷ATR）0.15→1.8 で補間 × 追加威力（`Market.assess` の条件） | `Market.settle`：ティック順。SL＝ATR×1.0、TP＝ATR×1.8、12本、スプレッド0.6・損切りスリッページ0.3・入口0〜0.2pips、ギャップ時は飛んだ価格 | `r`＝損益÷ATR（ATR は入口の1本前まで）。既定では SL＝1ATR なので「損益÷初期リスク」と数値は一致するが、意味は ATR 倍数 |
| 師匠の修行・試験（`TraderDojo`） | B | 同上 | `Ultimates.score`：過程60（`Market.assess` の見立てと同じ向きか）＋結果25＋理由15（上級のみ `reasonMatch`）。合格：初級 平均60・逆張り1問まで／上級 平均65・無謀2問まで、1問以上エントリー | `Market.settle` | 同上 |
| トレードマスター（`TradeMaster83`） | B | 同上。相手は判断時点の足だけで `Market.assess`＋腕前の乱数 | 多く pips を取ったほうが勝ち（差0.1未満は引き分け） | `Market.settle`（相手も同じ） | pips |
| クイズモンスターのチャート問題 | 別（固定の出題） | 問題ごとの小さなチャート | 固定の正解 | なし | なし |
| レバレッジ取引（トレディア） | 独立 | `Scenarios._internal.buildCandles` の 15分足 | なし（損益） | `Leverage`：証拠金・ロスカット・手数料・スワップ。**注文の検証はすでにある**（`LV.preview`） | TG（ゲーム内通貨） |

## 3. 指示書の指摘の確認（変更前のコードで再現）

| # | 指摘 | 確認結果（baseline_probe.json） | 重さ |
|---|---|---|---|
| 1 | 不正な損切り側でも注文が成立する | **再現**：買いで損切りをエントリーの 30pips 上 → 注文成立、1本目で「損切り」＋30pips、成績と資金に +1,500円・取引1回が入る（`applyResult` が損切りpips≤0 を「損切りなし」と同じ 0.5万通貨で計算） | P0 |
| 2 | 利確が逆側でも成立 | **再現**：買いで利確がエントリーより下 → 「利確」で −10pips | P0 |
| 3 | 最小ロットの強制で許容リスクを超える | **再現**：`lotFor(1万円, 0.5%, 200pips)` → 0.01（許容 50円に対し実際 200円）。`lotFor(NaN,1,30)` → NaN、`lotFor(100万, −1%, 30)` → 0.01 | P0 |
| 4 | 損切りが NaN の注文 | **再現**：成立し、`sl` が NaN のまま。損切りなしの含み損（`worstPips`）も記録されない | P0 |
| 5 | 同じ足で SL/TP の両方 | `TradeEval.simulate` は損切り扱い＋`ambiguous:true`（画面には出していない）。`Market.settleOHLC` は `both` を返すが使う所なし。`Market.settle` はティック順で判定（両方は起きない） | P1 |
| 6 | `Market.settle` の `r` | 既定（SL＝ATR×1.0）では r＝損益÷初期リスク（−1.03 と −1.03）。**SL＝ATR×1.5 にすると r 0.57・損益÷初期リスク 0.38 と食い違う**。`riskR`・`atrMultiple` の項目はない。画面は「損益÷ATR」と表示（意味は正しく表示されている） | P0（意味の区別） |
| 7 | RCI の反転判定 | **再現**：RCI −93→−78→−65→−80（いまは下向き）を「−70圏から反転して上がり始めた」と判定（過去8本の最小から +10 で反転） | P1 |
| 8 | 上位足の設問と採点の時間足 | 340 場面（34 シナリオ×練習用シード）のうち **7 場面**で、4時間足がレンジ・不明瞭なのに日足の向きを正解にしている（設問は「上位足（4時間足）の方向は？」） | P1 |
| 9 | ダイバージェンスの選び方 | 340 場面のうち **44 場面**で、高値側と安値側の両方にダイバージェンスが出ている。どれを正解にするかを**シナリオ ID の名前**（`regular` で始まるか）で決めている | P1 |
| 10 | トレードバトルの「最大ドローダウン」 | **再現**：中身は取引中の最大逆行幅（MAE、pips）。口座の最大 DD ではない | P0（名称） |
| 11 | `Ultimates.reasonMatch('divergence')` | ダイバージェンスがなくても RCI の反転だけで「理由が合っている」になる（選択肢の文も「ダイバージェンス・RCIの反転」とまとめている） | P1 |
| 12 | 注文画面の確定ボタン | `js/ui/trade.js` の「注文を確定」は入力の検証をせずに `decide` へ進む（逆側・空欄・0 もそのまま） | P0 |
| 13 | `TradeEval.evaluate`（旧） | 使われていない古い関数。中で未定義の `truth` を参照する分岐がある（呼ばれないので実害なし。互換のため残す） | 低 |
| 14 | 上位足の集約（B 系統） | `ChartBattleUI.upperOf` は 3 または 4 本ずつまとめるだけ（5分→15分、15分→1時間、1時間→4時間）。日足・4時間足の環境認識はできない。340 本では日足 EMA40 の履歴は作れない | P1（実践道場で別に作る） |
| 15 | コストの前提の違い | A 系統はスプレッド・スリッページなし、B 系統はスプレッド 0.6pips・スリッページあり。同じ「損切り」でも金額の前提が違う | P1（実践道場は共通の決済） |

## 4. 単位・前提（変更前）
- pip＝0.01（`CONFIG.market.pip`）。1万通貨で 1pip＝100円は**学習用の仮定**（`lotFor` のコメント）。実在の通貨ペア・金属の仕様ではない。
- 架空ペアの名前：A 系統 `学習用仮想ペア POYO/MOCHI`、B 系統 `架空ペア POYO/MOCHI（シミュレーション相場）`。
- 時間：A 系統は 5分足の通し番号（`t`）。1日＝288 本、週末なし。B 系統は足の番号だけ（時刻なし）。
- 資金：100万円（`CONFIG.risk.capital`）、既定リスク 1%、安全なリスクの上限 2%（`maxSafeRiskPercent`）、RR の目安 1.5／2／3。

## 5. 変えない約束（互換）
- `Market.settle` の `r` は意味を変えない（必殺技の威力・記録 `ultimate.stats.sumR`・振り返り `rec.R.r` が使っている）。新しい項目を足す。
- 必殺技の威力式・試験の合格条件・トレードマスターの pips 対戦・賞金・400歩は変えない。
- `TradeEval.truth` の `htf`・`action`・`reason` の決まり（既存の試練の固定の正解）は残す。設問の文・解説を採点と一致させる。
- セーブ：`State.migrate` の初期値で補う形だけで足す。
