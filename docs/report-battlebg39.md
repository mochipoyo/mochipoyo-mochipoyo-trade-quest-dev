# 報告：39ダンジョンの戦闘背景（TradeQuest_Battle_Backgrounds_39）

ブランチ：`feature/battlebg39`（v7.3 の `feature/variety-v73` 4c62f46 から）。push 先は dev リポジトリだけ（本番の main には push していない・公開はしていない）。

ご提供のパック（2026-11-04 12:15。画像39枚・対応表・アダプター・確認スクリプト・実装指示）の `CLAUDE_IMPLEMENTATION_PROMPT.md` に沿って組み込んだ。画像は描き直し・拡大・再圧縮をしていない（SHA-256 がパックと同じ）。

## 1. 実装済み

| 内容 | やったこと |
|---|---|
| 画像 | `assets/battle-backgrounds/dungeons39/` に39枚（ファイル名そのまま。既存の16枚は上書きしていない。3d/assets/ には置いていない） |
| 対応（39エリア・116マップ） | `js/data/battlebg39.js`（パックの `dungeon-backgrounds.json` から作った。マップIDの完全一致だけ。名前や似たIDからの推測はしない）。パックの対応表は `docs/battle-backgrounds-dungeons39.json`・`docs/battle-backgrounds-dungeons39-mapping.md` に置いた |
| 選び方 | 既存の `BattleBG65`（js/ui/battlebg65.js）に直接入れた（アダプターで包む形にはしていない。二重には入らない）。`BattleBG65.dungeonVariant(マップID, 種類, 乗り物)`：ダンジョンにいて、乗り物に乗っていないときだけ、そのエリアの絵（`d39_*`）。同じエリアの階・隠し区画は同じ1枚。通常の戦闘もボス戦も同じ絵で、ボスの色・光・粒・天気は従来どおり。戦闘の情報（`bg65`）に `mapId` を入れた |
| 先読み | 対象のダンジョンに入ったとき、その絵だけを先に読む（従来の汎用の絵は読まない。39枚の一括読み込みはしない）。読み込み中は従来の背景で、読めたら2Dの背景・3Dの写真背景・3Dの遠景の板が差し替わる（既存の仕組み） |
| URL | 既存の `Assets.base` ＋ `assets/battle-backgrounds/` ＋ `dungeons39/…`。2D版（index.html）と3D版（3d/index.html）のどちらからも同じ画像を指す（`../` の二重付与なし） |
| 3D「前後＋写真背景」 | 画面いっぱいに絵（縦横比はそのまま。はみ出す分は切る＝既存の cover） |
| 3D「3Dの景色／横並び」 | 遠景の板に絵。39枚それぞれの地平線（床が奥の景色に接する高さ）を見て決め、3Dの地平線に合わせた。3Dの地面の色（手前・奥）と霧の色を、それぞれの絵の床の色に合わせた（画像から自動で出した色）。この39エリアでは、場所ごとの3Dの飾り（城の柱・旗・絨毯、機械都市の柱、雲の床、海の水面と桟橋、サボテンなど）を置かないようにした。絵の景色と重なって不自然だったため。ほかのダンジョン・フィールドの3Dの景色は従来どおり |
| 読み込み | `js/data/battlebg39.js` を index.html の `fx65.js` の後（`battlebg65.js` より前）に足した。3d/index.html はビルド（vite）で作り直した。ハッシュつきの JavaScript は直接いじっていない |
| 確認の道具 | `tools/check-battle-backgrounds.js` に、39枚・116マップ・SHA-256・寸法・地平線の値・選び方の確認を足した |

### 変えていないもの
マップ・敵・宝箱・出来事・入口の条件・出現率・セーブの形。通常の出現がない場所に戦闘は足していない（対応表の116マップのうち34マップは通常の出現がない。ボス・出来事の戦闘があればその絵になる）。「鉄冠将軍の砦」の内部マップは作っていない（門前と古い武器庫だけ）。迷いの森・忘却の洞窟は今回の対象外で、従来の背景のまま。船の上の戦闘（甲板の絵）・乗り物・フィールド・町は従来どおり。設定「戦闘背景の品質」・3Dの表示設定は変えていない（強制しない）。

## 2. 変えたファイル
- 追加：`assets/battle-backgrounds/dungeons39/*.webp`（39枚・6.57MB）、`js/data/battlebg39.js`、`docs/battle-backgrounds-dungeons39.json`、`docs/battle-backgrounds-dungeons39-mapping.md`、`docs/report-battlebg39.md`、`docs/images/battlebg39/`、`docs/tools/v74/`
- 変更：`js/ui/battlebg65.js`（39エリアの選び方・先読み・地平線・3Dの地面と霧の色の表を返す関数・`mapId`）、`three-src/src/battle/BattleStage3D.js`（3Dの景色で地面と霧の色・飾りを置かない）、`index.html`（読み込み）、`3d/index.html`・`3d/assets/main-*.js`（ビルド）、`tools/check-battle-backgrounds.js`、`js/core/version.js`・`version.json`（版の印）

## 3. 確認したこと（この環境で実行）

### パック・対応
- `node integration/verify-pack.cjs`：PASS（パック単体）。`node integration/verify-pack.cjs <リポジトリ>/js/ui/battlebg65.js <いまの MAP_DEFS>`：PASS（116のマップがいまのゲームにあり、すべてダンジョン）
- `node tools/check-battle-backgrounds.js`：問題なし（既存16枚＋39枚・116マップ・SHA-256・寸法 1672×941・地平線の値）
- いまの `MAP_DEFS` と照合：116マップすべてあり（無くなった・名前の変わったマップなし）。v7.1 で作り直したダンジョンもマップIDは同じ

### 2D（jsdom・docs/tools/v74/bg39test.js）：17 OK / 0 NG
- 116マップ：通常の戦闘もボス戦もそのエリアの絵・場所（粒や霧の種類）は前と同じ・ボスの色つき・画像のURLとファイル
- 隠し区画（38マップ）も主エリアの絵／39枚の地平線の値
- 対象外のマップ 469（迷いの森・忘却の洞窟・フィールド・町・屋内など）は v7.3 と同じ場所・地域・絵
- 乗り物に乗っているときはダンジョンの絵にしない／海の上の船の戦闘は従来どおり甲板の絵
- 対象のダンジョンに入ると、その絵だけを先に読む
- 品質「軽量」は画像を使わない／画像がまだ・読めないときは従来の手描きの背景（例外なし）
- 実際の戦闘：鉄鎖鉱山2階・魔王城の隠し区画のボス戦・別のエリア（天空神殿）へ移ってからの戦闘・対象外（迷いの森）

### 3D版・2D版のページ（ヘッドレス Chromium・ソフトウェア描画。実機ではない）
- PC 横長（1280×720）：39エリアすべてで、3D「前後＋写真背景」・3D「3Dの景色／横並び」・2D版の戦闘を始め、絵の取り違え・読み込み失敗がない（画像 1672×941 を読めた・戦闘の絵のキー・URL・3Dの写真背景／遠景の板が絵になっている）。117場面すべて OK・ページのエラーなし（docs/images/battlebg39 の pc_*.jpg）
- スマホ縦（iPhone 13 相当 390×664）：12エリア（1・4・9・13・17・20・23・26・29・31・35・38）× 3D 前後・3D の景色・2D の 36 場面すべて OK。敵・味方・HP・コマンドが見え、絵は縦横比を保って切り取られる（phone_portrait_12areas.jpg）
- 隠し区画のボス戦（砦の古い武器庫・魔王城の像の回廊）・王宮のボス戦：3D 前後・3D の景色・2D で、その絵とボスの紋章・光（hidden_boss）
- 画像が404：従来の手描きの背景・3Dの景色で戦闘が進む（ページのエラーなし）
- 品質「軽量」：画像を読まず（通信0）、従来の軽い2Dの背景（3Dの舞台も使わない）
- WebGL が使えない：2Dの戦闘画面で、その絵（魔王城）
- 既存の戦闘背景のテスト bg65test：25 OK / 0 NG

### 回帰テスト
（下に追記）

## 4. 未検証・注意
- 実機（スマホ・GPU のある PC）での表示と読み込みの速さ（この環境はソフトウェア描画）
- 地平線の値は、絵を見て目で決めた値（0.40〜0.63）。「3Dの景色」で床のつながりが気になる絵があれば、`js/data/battlebg39.js` の horizon を直す
- 3Dの地面と霧の色は、絵の床の平均の色から自動で出した値。3Dの景色の地面は絵の床の模様までは再現しない
- 「3Dの景色」では、この39エリアだけ場所ごとの3Dの飾りを置かない（絵と重なるため）。従来の飾りを残したい場合は戻せる（BattleStage3D の1行）
- 絵は新しく描かれた美術で、描かれた扉・機械・祭壇などがゲームの出来事として実装されているわけではない（パックの説明どおり）

## 5. 遊ぶ（dev）
- 3D 版：https://raw.githack.com/mochipoyo/mochipoyo-mochipoyo-trade-quest-dev/feature/battlebg39/3d/index.html
- 2D 版：https://raw.githack.com/mochipoyo/mochipoyo-mochipoyo-trade-quest-dev/feature/battlebg39/index.html
