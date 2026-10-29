# もちぽよFXクエスト ～波形の勇者と相場の魔王～（JRPG版 v3）

2DトップビューのJRPGとして、アルカディア相場大陸を歩き、町で買い物をし、仲間を集め、ダンジョンに挑み、ターン制バトルで戦いながら、FXトレードの判断（上位足・ダウ理論・EMA・RCI・MACD・資金管理）を「チャートの試練」で学べるブラウザゲームです。

- 公開URL: https://mochipoyo.github.io/mochipoyo-trade-quest/
- HTML / CSS / Vanilla JavaScript / Canvas 2D のみ。ビルド・サーバー・外部CDN・外部API・画像ファイル不要（ドット絵はすべてコードで生成）
- ゲーム内のチャートは **学習用の人工データ** です。実際の市場データではありません
- セーブはブラウザの LocalStorage（3スロット＋オートセーブ）。JSONの書き出し／読み込みも可能

---

## v3 品質向上プロジェクト 報告（グラフィック・建築物・戦闘・モンスター）

> 作業ブランチ: `feature/graphics-v3`（main は上書きしていません）。セーブデータ互換（`mtq-rpg-v2-slot-*`）・既存ID（敵32種、アイテム、特技、マップ、フラグ）はすべて維持しています。

### 1) 変更したファイル一覧
| ファイル | 変更内容 |
|---|---|
| `index.html` | `js/core/buildings.js`・`js/core/monsterart.js` の読み込み追加、施設名ラベル `#place-label` 追加 |
| `styles.css` | 施設名ラベル、戦闘リザルト画面、モンスター図鑑のスタイル追加 |
| `js/core/tiles.js` | **全面書き直し**。73種のプロシージャル生成タイル（バリエーション・2フレームアニメ・水際/影/草縁のオートタイル境界）、小物（柵・街灯・井戸・樽・木箱・ベンチ・花壇・屋台・畑・石畳・苔・鍾乳石・水たまり・鉱石・根・丸太・茂み・桟橋）、隠しボスの魔法陣 |
| `js/core/buildings.js` | **新規**。複数タイル建物の合成描画（12種類の施設タイプ、屋根/壁3スタイル、看板アイコン、名前プレート、窓、煙突、城、船） |
| `js/core/map.js` | **書き直し**。建物のフットプリント/出入口の自動生成、タイル境界オーバーレイ、夜間の街灯・松明・扉の灯り、エンティティの足元影、`buildingAt/buildingNear` |
| `js/core/monsterart.js` | **新規**。モンスターのプロシージャル描画（14ファミリー × 特徴フラグ × 4サイズ、色違いだけに頼らない形状差） |
| `js/data/towns.js` | 4町すべて書き直し（`buildings:[...]` データ駆動、町ごとの小物・NPC配置、室内テンプレート刷新、新室内4件） |
| `js/data/dungeons.js` | 5ダンジョンに装飾（松明/鉱石/鍾乳石/水たまり/苔/根/丸太）、エンカウント表拡張、隠しボス2体のイベント追加 |
| `js/data/world.js` | ワールドのエンカウント表に新モンスターを登録（4地域） |
| `js/data/enemies.js` | **書き直し**。既存32種を維持しつつ83種へ（art・説明文・出現地域・行動・ドロップ） |
| `js/rpg/combat.js` | 新行動（仲間を呼ぶ/自己回復/連続攻撃/全体攻撃/沈黙/怒り）、HP割合によるボスのフェーズ行動、沈黙状態、逃走のみで終了した戦闘の扱い、報酬の確定を1回に限定（`Combat.distribute`） |
| `js/rpg/events.js` | ボスイベントの `optional`（挑戦確認）・`requireFlag`（出現条件）・`enemies`（複数体）対応 |
| `js/rpg/world.js` | 入口付近での施設名表示、隠しボスの魔法陣タイル |
| `js/ui/battle.js` | **書き直し**。場所ごとのレイヤー背景（8テーマ）、MonsterArt描画、敵の待機/攻撃踏み込み/被弾フラッシュ/死亡/召喚/フェーズ演出、ボス登場演出、勝利演出、VICTORYリザルト画面 |
| `js/ui/windows.js` | パネルの閉じるボタン文言指定、`noClose` パネルのキー無視 |
| `js/ui/menu.js` | モンスター図鑑を刷新（グラフィック・系統・地域・討伐数・弱点/耐性・ドロップ・説明・達成率） |
| `docs/` | before/after スクリーンショット、モンスター一覧、戦闘画面（報告用。ゲームには不要） |

### 2) 新規アセット
画像ファイルは引き続きゼロ（すべてコード生成）。
- タイル 73種（v2: 約30種）、建物タイプ 12種 × スタイル 3種、看板アイコン 12種
- モンスター基本形状: **57種**（family + 特徴フラグ + サイズの組み合わせ。色だけが違うものは1種として数えています）＋人間系キャラスプライト 4種
- 戦闘背景テーマ 8種（草原・森・荒野・山・洞窟・祠・町・屋内）

### 3) 改善した町・ダンジョン
- 町 4/4（ポヨ村・リヴェル城下町・ダウの村・港町マリナ）＋室内 24 マップのテンプレート刷新
- ダンジョン 8 マップ中 5 に装飾（迷いの森・忘却の洞窟1〜3階・エマール山道）。残り3（森の祠・祠の宝物庫・山賊のアジト）は小部屋のため v2 のまま＋隠しボス部屋として宝物庫・洞窟最深部にイベント追加

### 4) 看板・名前付き建物
**25棟すべて**に名前プレートと施設タイプの看板アイコン（ポヨ村6・リヴェル城下町9・ダウの村4・港町マリナ6）。入口の前に立つと画面上部に施設名を表示。

### 5) 戦闘リザルト画面
VICTORY → 倒した敵（種類×数）→ 獲得EXP → 獲得ゴールド（商人ボーナスの内訳）→ 仲間ごとの実際の獲得EXP・レベル・LEVEL UP!・次のレベルまでのEXP・経験値バー（レベルアップ時は満タン→リセットの演出）・上昇ステータス・習得特技 → 入手アイテム。報酬は `Combat.distribute` が1回だけ確定し、再表示しても二重加算しません（自動テストで確認）。

### 6) モンスター
- 合計 **83種**（既存32種を維持＋新規51種）。うち現在到達できる地域に出現: **55種**、未解放大陸用のデータのみ: 28種（砂漠・雪原・魔導王国・海・暗黒大陸・時の神殿・魔王城）
- 目標の「150種以上」には未到達です（品質優先で、色違いの水増しをしていません）
- 系統 16、ボス 10（うち隠しボス2: 森の狼王・クリスタルゴーレム、未解放4）、相場の試練を仕掛ける魔物 10
- 新行動: 仲間を呼ぶ（最大5体）、自己回復、2回攻撃、全体攻撃、沈黙（MPを使う技を封じる）、怒り、HP割合によるボスのフェーズ（60%/30%でメッセージ＋行動変化）、逃げる、高防御、属性弱点/耐性
- 新モンスターは全員、適切な地域のエンカウント表（ワールド4地域＋ダンジョン5）または隠しボスイベントに登録済み（自動テストで「到達可能なのに未登録」が0であることを確認）
- 図鑑: グラフィック・名前・系統・出現地域・討伐数・弱点/耐性・ドロップ（3体討伐かスキャンで判明）・説明文・達成率

### 7) テスト結果（すべて今回の最終コードで実行）
- **Node.js + jsdom 自動テスト**: 全37マップの到達性 OK、通しプレイ（新規開始〜落とし穴まで22項目）エラー0、敵データ整合性（ID重複なし・特技/アイテム/召喚先の存在・グラフィック生成・登録漏れ0）、新行動（召喚・召喚上限・自己回復・2回攻撃・全体攻撃・沈黙と技封じ・フェーズ・高HPでの解禁行動不使用・逃走敵の報酬除外・召喚敵の報酬加算・報酬の二重加算なし）、戦闘バランス（草原〜山道・ボス・隠しボス 40ケース×30試行）
- **実ブラウザ（Chromium / Playwright、デスクトップ 900×640 と モバイル相当 390×780 タッチ）**: タイトル→新規開始→村→各地域の戦闘背景（草原・森・洞窟・祠・山・荒野）→ボス登場演出→フェーズ変化→相場の試練→勝利→リザルト画面→召喚→図鑑→隠しボス（ロック文・魔法陣・挑戦確認・2体戦闘）をスクリーンショット付きで確認。JSエラー 0件（`docs/battle_v3.png` 参照）
- before/after: `docs/before_after.png`（町3・洞窟・戦闘）

### 8) 未検証・未実施（正直な報告）
- iPhone Safari / Android Chrome の実機（タッチ操作感・音・画面サイズ）は未確認。確認したのはヘッドレスChromiumのみ
- fps は未計測（背景は戦闘開始時に1回だけ描画してキャッシュ、モンスター画像もキャッシュ）
- 「150種以上」は未達（83種）。追加は `js/data/enemies.js` に `M(...)` を1行足し、エンカウント表に登録するだけで可能
- 未解放大陸（砂漠・雪原など）の28種は出現しません（到達手段が未実装のため）
- 音（新規SE・BGM）は追加していません

---

## 1. GitHub Pages へのアップロード手順

1. ZIPを展開し、**中身**（`index.html`・`styles.css`・`README.md`・`.nojekyll`・`js/` フォルダ、任意で `docs/`）を `mochipoyo-trade-quest` リポジトリにアップロードする（既存ファイルは置き換え。`js/` は**フォルダごと**ドラッグ＆ドロップ。`js/core/buildings.js` と `js/core/monsterart.js` が新規ファイルなので、`js/core/` フォルダの中身が揃っていることを確認）。main を直接上書きしたくない場合は、GitHub上で `feature/graphics-v3` ブランチを作ってそこへアップロードし、Pull Request で main に取り込む
2. 旧バージョンの `js/game.js`・`js/ui.js`・`js/data.js`・`js/battle.js` はリポジトリから削除してよい（新版では使わない。`js/data.js` の教材は `js/data/learning.js` へ、`js/battle.js` の判定は `js/trading.js` へ移動した）
3. 初回のみ **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save**
4. 数分後に上記URLで公開される。更新時はファイルを上書きコミットするだけ

```
mochipoyo-trade-quest/
├── index.html / styles.css / README.md / .nojekyll
└── js/
    ├── config.js        設定（EMA・RCI・MACD・リスク%・時間足）※旧版から継続
    ├── indicators.js    EMA / RCI / MACD / ZigZag / ダウ / ダイバージェンス計算 ※旧版から継続
    ├── scenarios.js     学習シナリオ14本（固定シード・検証つき）※旧版から継続
    ├── trading.js       トレード判定・値動き再生・成績（旧 battle.js）
    ├── chart.js         チャート描画 ※旧版から継続
    ├── sprites.js       モンスターのドット絵（旧版＋亜種追加API）
    ├── core/   engine.js(ループ・入力・シーン) tiles.js(タイルセット73種) chars.js(4方向歩行キャラ) buildings.js(建物の合成描画) monsterart.js(モンスター描画) map.js(タイルマップ・建物・衝突・描画)
    ├── data/   jobs.js(職業12) skills.js(特技・呪文59) items.js(武器防具道具70) enemies.js(モンスター83) world.js(ワールド160×120)
    │           towns.js(町・建物内部・NPC会話) dungeons.js(ダンジョン・ギミック・ボス) story.js(仲間・クエスト・講義) learning.js(教材・用語辞典)
    ├── rpg/    actors.js(成長・装備・転職) state.js(セーブ・移行) combat.js(ターン制戦闘ロジック) world.js(探索シーン) events.js(イベントAPI)
    ├── ui/     windows.js(RPG風ウィンドウ) battle.js(戦闘画面) menu.js services.js(店・宿・教会・酒場・ギルド・銀行・修行場) trade.js(チャートの試練) title.js audio.js
    └── main.js
└── docs/   before_after.png monsters_v3.png battle_v3.png（報告用スクリーンショット。公開には不要）
```

---

## 2. 操作方法

| 操作 | PC | スマートフォン |
|---|---|---|
| 移動 | 矢印キー / WASD | 画面下の十字キー |
| 決定・調べる・話す | Enter / Z / Space | 「決定」ボタン |
| メニュー・キャンセル | Esc / X | 「メニュー」ボタン |
| メニュー操作 | キーボードまたはマウスクリック | タップ |

---

## 3. 公開後の動作確認

1. タイトル → 「はじめから」→ 名前入力 → 職業選択（8種から）→ ポヨ村で目覚める
2. 矢印キーで歩ける。木や壁は通れない。村長の家（北西の赤い屋根）に入り村長と話す → 100G・薬草・木の剣をもらう
3. 教会でリーナを仲間にする。道具屋で薬草を買う。宿屋で休む
4. 村の南の出口からフィールドへ。歩くとランダムエンカウント。「たたかう／じゅもん・とくぎ／どうぐ／ぼうぎょ／にげる」で戦う
5. 北の道でリヴェル城下町へ。城で王に謁見 → クエスト。酒場でカイル加入。武器屋・防具屋で装備を買う。ギルドで転職。銀行で預金
6. 東の森「迷いの森」へ。試練の扉でチャート分析（60点以上で開く）→ 祠でボス「トレンド迷子」→ 鍵の扉 → 伝説の「波形の剣」
7. 王に報告 → 洞窟の鍵 → 南東の「忘却の洞窟」（3階・落とし穴・封印扉・試練の扉）→ ボス「欲望のゴーレム」→ クリスタルの欠片
8. 修行場（ポヨ村・ダウの村）で講義・チャートの試練・学習クエスト。ダウの村でミナ、港町でガルド、講義修了後にルシアが仲間になる
9. メニュー → セーブ。再読み込み → 「つづきから」で再開できる

---

## 4. 開発フェーズの進捗
- v1: 学習ゲーム（エリア選択式）
- v2: 本格JRPG化（ワールド・町・ダンジョン・仲間・職業・戦闘・学習統合）
- v3: グラフィック・建築物・戦闘・モンスター品質向上（上記報告）

## 5. テスト済み項目
- 全37マップの到達性（入口から全ワープ・宝箱・イベント・NPCに到達、ワープ先が壁でない、NPCが壁や建物の中にいない）
- 通しプレイ（jsdom）：新規開始→移動→会話→加入→買い物→宿→戦闘→特技→宝箱→王→装備→試練の扉→ボス→鍵扉→セーブ/ロード→転職→講義→全滅→落とし穴
- 敵データ整合性・新行動・報酬確定の単体テスト、戦闘バランスのシミュレーション
- Chromium（Playwright）での実動作確認（デスクトップ/モバイル相当）、スクリーンショットの目視確認
- 全JSの構文チェック

## 6. 未検証・既知の制限
- iPhone Safari / Android Chrome の実機確認は未実施（レイアウト・仮想パッド・音・fps）
- 船・新大陸（砂漠・雪原・魔導王国・暗黒大陸）はワールド上に地形のみ。到達手段は未実装（敵データのみ用意）
- 既知：NPCのランダム徘徊はワープタイルを避けるが、プレイヤーの目の前に立ち止まることがある
- 教材文は指定ルールと一般的なテクニカル分析に基づく。表現の修正は `js/data/learning.js`・`js/scenarios.js`

## 7. 追加・調整のしかた
- 町：`js/data/towns.js` の `buildings:[{ type, name, x, y, w, h, doorX, interior, entry }]`。`type` は weapon/armor/item/inn/church/tavern/bank/guild/dojo/house/elder/warehouse/castle/ship。扉と室内への移動は自動生成
- ダンジョン：`js/data/dungeons.js` に `add({...})`（ASCIIマップ＋warps/chests/events/encounters）。装飾は `decorate(rows)` を通すだけ
- モンスター：`js/data/enemies.js` の `M(id, { name, lv, arche, art:{ family, ...特徴 }, family, area, actions, drops, resist, desc })`。`lv` と `arche`（normal/tank/fast/mage/glass/rare）からステータスを自動生成。出現させるには `world.js` / `dungeons.js` の `groups` に追加
- モンスターの見た目：`art.family`（slime/beast/bird/insect/plant/aquatic/reptile/undead/demon/golem/spirit/magical/machine/market）＋特徴フラグ（horns/tusks/teeth/stripes/wings/striped/stinger/mandibles/shell/petals/mushroom/crown/crab/octopus/snake/frill/dragon/ghost/zombie/weapon/trident/gem/rune/antenna/core/spikes/metal/drip/big/angry/crest/mimic/candle/bear/bull）＋`size`（small/normal/big/boss）＋`c.base` などの色
- 敵の行動：`actions` の `{ type:'special', id, w, hpBelow }`。`hpBelow: 0.4` でHP40%以下のときだけ選ばれる。`id:'call', summon:'slime'` で召喚
- 戦闘背景：`js/ui/battle.js` の `themeFor()`（地域名/マップIDからテーマを決定）と `BattleBG.render()`
- 職業・特技・アイテム：`js/data/jobs.js` `skills.js` `items.js` にデータ追加のみ
- 学習シナリオ：`js/scenarios.js` の `SCENARIO_DEFS`。試練の扉・魔物の `trialScenarios` で参照
- 戦闘計算式：`js/rpg/combat.js` の `physDamage` / `magDamage`
