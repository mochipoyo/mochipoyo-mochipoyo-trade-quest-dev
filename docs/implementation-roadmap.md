# 実装ロードマップ（implementation-roadmap）

## 0. 共通方針
- 作業ブランチ `feature/graphics-v3` で進め、main は上書きしない。各Phase完了時に GitHub Pages へそのままアップできる一式を ZIP で納品（100ファイル制限のため分割）
- セーブ互換：`State.migrate` のテンプレート補完で新フィールドを追加（vehicles, aboard, 新フラグ）。既存の pos / quests / flags / jobLevels / trade は変更しない。`SAVE_VERSION` は構造変更時のみ上げる
- 二重加算なし：クエスト報酬は `Events.questComplete`、学習報酬は Learning、ランク・実績は Growth に一本化
- ロジック／描画の分離（3D化準備）：
  - データ：`js/data/*`（世界・物語・章・クエスト・NPC・仲間・職業・アイテム・地域・乗り物・イベント・エンディング）。描画に依存しない
  - ロジック：`js/rpg/*`（クエスト進行＝events.js、フラグ＝state.js、乗り物＝vehicle.js、マップ接続＝world.js の enterMap/warp 部分、仲間加入・転職＝actors.js、アイテム、戦闘＝combat.js、学習＝learning.js/growth.js）。DOM・Canvas を直接触らない（UI呼び出しは `root.Win` 経由の抽象に限定）
  - 描画：`js/core/*`、`js/ui/*`（Canvas 2D、ウィンドウ、ミニマップ、戦闘UI）。Three.js 導入時はここだけ差し替える
  - NPCの会話（talk）はデータ側に置くが、条件分岐は flags/quests のみ参照し描画APIを使わない
- テストは jsdom（scratchpad の *test.js）＋ Playwright 実ブラウザ。納品前に ZIP 展開物を起動する「zipcheck」を必ず実施

## Phase 0：世界設定と全章の設計【今回】
- docs/world-bible.md, story-full.md, characters.md, quest-design.md, world-map-design.md, transport-system.md, jobs-and-equipment.md, trade-learning-integration.md, implementation-roadmap.md
- 納品物：上記9ファイル

## Phase 1：ワールドと船の基本機能【今回】
作業項目：
1. `js/data/world.js` の生成関数を汎用化（`WorldGen.region`）。既存 `world` の出力が変わらないことをテスト（行ハッシュ比較）
2. `js/data/world-grania.js`：グラニア鉱業地方（160×120）、場所（ヴェルム・鉱山・灰の洞窟・駐屯地・船着き場・岬）、エンカウント
3. `js/data/vehicles.js`（VEHICLES, SEA_ROUTES）、`js/rpg/vehicle.js`（乗降・通行・海路・海上エンカウント・港・全滅復帰・ロード補正）
4. world.js（rpg）：乗船中の移動判定・描画、マリナ船着き場（dock）、海路ワープ
5. 第4章の完成：倉庫の魔物→帆布、道具屋→羅針盤、船乗り→進水（ship_ready、main_4 達成、main_5 受注）
6. ミニマップ／ワールド画面に乗り物アイコンと「世界」タブ
7. セーブ・ロード・旧データ移行
テスト：船の乗降、衝突、海路往復、海上セーブ→ロード、全滅時の復帰、入港、旧セーブ移行、既存37→新マップ到達性（maptest）、playtest 回帰
納品物：ZIP（v5.0 に Phase 2 と同梱）

## Phase 2：第5章・鉱山都市【今回】
作業項目：
1. 町 verum_town（解放前／後の2状態をフラグで切替：NPC表示・看守・店・学校）、内部 verum_dorm / verum_ration / verum_overseer_house / verum_factory / verum_hideout
2. 鉄鎖鉱山 iron_mine_1〜3（複数フロア・宝箱・隠し部屋・鎖の扉・帳簿の切れ端・救出イベント・ボス）
3. 敵12種＋ボス（boss_overseer）、グロート撤退演出
4. クエスト main_5、verum_ledger、verum_supply、gald_reunion、verum_school、verum_market、verum_lost_workers。クエスト目的の画面表示（steps）
5. ガルドの会話イベント5つ、ガネス加入、工匠職、トレード装備（第5章分）の効果ロジック
6. 学習：learn_risk を verum_hideout へ、石碑 practice_mine
7. 解放後の変化：市場再開、学校、新NPC、会話変化、ポヨ村・リヴェル王の会話変化
8. 第1〜3章の伏線追加（会話テキストのみ）
テスト：新規開始から main_5 達成までの通しプレイ（jsdom）、報酬の二重付与なし、NPC状態変化、ボス後の進行、旧セーブからの継続、到達性
納品物：ZIP v5.0（一式＋GitHub用分割）

## Phase 3：第6〜7章・政府編【v5.1 実装済】
実装：world_kalion（灰の峠 grania_pass 経由。第5章クリアで関所が開く）、徴収都市カリオン（財務局・税務庁舎・店・宿・酒場・教会・南区）、地下記録庫1〜2階、秘密研究所、地図から消えた村、王都セントラ（騎士団詰所・監察官の事務所・テント村・店）、王宮1階・帳簿中枢。エルナ加入（監査官職・スキル3種）、証拠の扱いの選択（3択）、ヴァレン一騎打ち（カイル同行で専用会話＋サブ kyle_oath）、帳簿中枢の守護機構、セヴラン対峙（戦闘なし・処遇3択）、財産返還令の執行と町の変化、復興クエスト sentra_rebuild、オルド加入（誓約騎士職）、学習イベント learn_record（記録と検証）＋石碑2つ。
未着手（Phase 7 へ）：リーナ診療所（lina_clinic）、エルナ個別 elna_audit、オルド個別 ord_penance、セヴランの公開演説イベント、王都の牢（オルドは騎士団詰所前で加入に変更）、信頼度システム

## Phase 4：廃墟の島・海底都市【未着手】
遠洋航海船（ナギ加入・航海士職）、外海（海流・海賊・嵐・隠し島）、灰灯島、灯台、廃墟、地下施設、海底都市、記憶の図書館、ミナ個別、イーリス加入、測量士職

## Phase 5：異空間とAIの島【未着手】
時の神殿領（時間銀行・MTF試練・ソフィア）、転移門、ゼロメア（演算都市、第7居住区、学校、オラクル中枢、イオ、統治再設計の選択、解放後の変化）

## Phase 6：魔導王国・天空・魔王領【未着手】
マクディア（禁書庫・裏切り・セリス個別・複合分析試練）、飛空艇（操作可能）、天空群島、暗黒大陸、魔王城、最終決戦、エンディングA/B、エピローグ

## Phase 7：職業・仲間・装備・サブクエスト【各Phaseで順次】
残りの新職業（精霊守・時詠み師・機巧師・誓約騎士・測量士・監査官・航海士の高位スキル）、残りの仲間、トレード装備の残り、サブクエスト60本、隠しダンジョン5

## テスト条件（仕様書 §18 に対応）
| 条件 | 確認方法 | Phase |
|---|---|---|
| 既存の第1〜4章が正常に動作 | playtest.js（通し） | 毎回 |
| 既存セーブデータが読み込める | migrate テスト（v2/v3/v4 形式のJSON） | 毎回 |
| 新メインクエストの開始・進行・完了 | chapter5test.js | 2 |
| 報酬の二重付与なし | questComplete の2回呼び出し | 2 |
| 仲間の加入 | ガネス加入テスト | 2 |
| 転職の反映 | 工匠の装備制限・スキル | 2 |
| 船の海上移動・上陸・セーブロード | vehicletest.js | 1 |
| マップ間ワープ・必須ダンジョン到達・鍵入手 | maptest.js（到達性）＋ 通しプレイ | 毎回 |
| NPC状態の変化・ボス後の進行 | chapter5test.js | 2 |
| 学習システム正常 | learntest / growthtest / tradetest | 毎回 |
| 進行不能箇所なし | 各Phaseの通しプレイ（エンディングまでは Phase 6） | 各Phase |
| 重要アイテムを失って詰まない | key カテゴリは捨てられない・売れない | 毎回 |

## 納品の形式
- `mochipoyo-trade-quest-v5.x.zip`（一式）、`upload/…-1_root_js.zip`（ルート＋js＋docs、100ファイル未満）、画像アセットに変更があれば別ZIP
- README に各Phaseの「完成／未完成／未検証」を明記
