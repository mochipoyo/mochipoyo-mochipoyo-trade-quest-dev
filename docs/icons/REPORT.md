# 装備・道具・オーパーツの絵（v9.5）の報告

- ブランチ：`feature/item-icons`（dev リポジトリ `mochipoyo/mochipoyo-mochipoyo-trade-quest-dev`）。main・公開本番には入れていない
- 参照コミット：`483fd5f5553c60f770b8f9efb4413258daba7285`
- 素材：`TradeQuest_All_Equipment_Item_Icons_483fd5f.zip`（artVersion `20261111-v1`）
- 絵は表示だけの追加。ITEMS・OOPARTS の ID／名前／性能／効果／値段／ドロップ／ボス固有報酬の制限、セーブの形式とキーは変えていない（下の「4」で確認）

## 1. 変更ファイル

| 種類 | ファイル |
|---|---|
| 追加（素材） | `assets/item-icons/webp128/`・`webp256/`・`png256/` 各 665 枚（計 1,995 枚・約 66MB。うち PNG が約 46MB）。`js/data/item-icon-manifest.js`（素材のまま・データだけ） |
| 追加（仕組み） | `js/ui/item-icons.js`（素材版を元に、このゲームの 2D／3D の置き場所に合わせたもの）、`styles/item-icons.css` |
| 変更（表示だけ） | `js/ui/windows.js`（Win.list の `itemId`・Win.choice の `opts.itemIds`）、`js/ui/menu.js`、`js/ui/services.js`、`js/ui/casino.js`、`js/ui/battle.js`、`js/ui/ooparts.js`、`js/rpg/boss-unique-gear.js`、`js/rpg/events.js`（choice に 3 つ目の引数を通すだけ）、`js/data/dragon.js`・`js/data/expand-a6.js`（選択肢に ID を渡すだけ）、`index.html`（CSS 1 行・script 2 行） |
| 作り直し（手で書いていない） | `dist/mtq.min.js`、`3d/index.html`、`3d/assets/main-*.js`、`js/core/version.js`、`sw.js`（VERSION の 1 行だけ）、`version.json` |
| 確かめ用 | `docs/tools/icons/`（id_match.js・data_hash.js・icons_test.js・make_save483.js・fixtures/save_483fd5f.json・browser/icons_browser.js・browser/icons_samples.js）、`docs/icons/logs/`、`docs/icons/shots/`、この報告 |

素材の管理用ファイル（`ITEM_ICON_MANIFEST.json`・`ITEM_ICON_CATALOG.csv`・`qa/`・`PREVIEW.html`・生成用プロンプト）はリポジトリに入れておらず、公開ページからもリンクしていない。

## 2. 画面ごとの実装結果

| 画面 | 一覧（48px。左に絵） | 詳細（PC 160px／スマホ 112px） |
|---|---|---|
| どうぐ | 全行（ID で紐付け） | 大きい絵の隣に名前・種類・所持数・効果 |
| そうび（枠の一覧） | 装備している枠だけ。空き枠は絵なし | ― |
| そうびの候補 | 候補の装備に絵。「はずす」は絵なし | 変更先の大きい絵の隣に、名前・いまの装備（32px）・変わる能力。能力の表はそのまま下に（スマホは 96px） |
| パーティの装備 | 装備している品だけ 44px | ― |
| アイテム図鑑 | 知っている品だけ。「？？？」の行は絵なし（名前の位置だけそろえる） | ― |
| 店（買う／売る） | 両方の行に絵。買えない行は今までどおり無効 | 買う画面の詳細に大きい絵（売る画面は元から詳細なし） |
| カジノの景品交換 | 景品に絵 | 大きい絵の隣に説明 |
| 鍛え直し（竜の鱗）・墓標の供え物 | 選択肢の先頭に 44px | ― |
| ボス固有装備の一覧 | 出会ったボスの品だけ。「？？？」は絵なし | 大きい絵の隣に固有の説明。戦闘の結果の固有装備は 64px |
| 戦闘の「どうぐ」 | 戦闘で使える道具の行に絵（絞り込みは今までどおり） | ― |
| 戦闘の結果（演出あり） | 落とした品の行に 44px | ― |
| オーパーツ | 見つけたものだけ 48px。まだのものは今までどおり「？？？」 | 礼の品は名前が見える（達成した）ときだけ 32px |

PC で絵と詳細がある一覧は、一覧（左）と詳細（右）を横に並べる形にした（そのままの縦並びでは大きい絵と装備の比較の表が窓に入りきらなかったため）。スマホは今までの並び（縦は一覧の下に詳細、横は左右）のまま。絵のない一覧は今までと同じ HTML（テストで 1 文字も同じことを確認）。

絵が読み込めないときの「？」の印は CSS で出しているので、行の文字（textContent）は今までと同じ（名前・右の値・説明だけ）。

絵を付けていない所（文字のまま）：通知・クエストの報酬（アイテム ID を受け取っていないため、文字から推測しない方針どおり）、演出なしの簡易な戦闘結果の 1 行。

## 3. ID の照合（起動したあとの `ITEMS`・`OOPARTS` と素材の対応表）

- ITEMS 564（武器 173・防具 145・装飾品 68・消費 60・大事なもの 118）＋ OOPARTS 100 ＝ 664 のうち、**一致 659**（2D・3D とも同じ）
- **追加ID（ゲームにあって素材にない）5 件**：`explorer_ring`・`ancient_shield`・`starseer_staff`・`spacetime_armor`・`archeion_blade`。`js/rpg/ooparts.js` が起動時に足すオーパーツの礼の品で、素材の一覧（`source_item_catalog.json`）にもない。この 5 件は「？」の枠で表示（ほかの絵は流用していない）
- **削除ID（素材にあってゲームにない）0 件**、**名前が違う ID 0 件**
- 予約の 6 件は ITEMS に作っていない。装飾品は `cat=armor`・`type=acc` のまま
- 素材 ZIP の `node qa/check-item-icons.cjs`：ok（active 659・reserved 6・画像 1,995・2D/3D の置き場所 ok）
- `ItemIcons.coverage(window.ITEMS, window.OOPARTS)` → expected 664・matched 659・missing は上の 5 件
- したがって「全部の品に絵がある（100%）」ではない

## 4. 参照コミットとの差分（データが変わっていないこと）

- 起動したあとのデータのハッシュが参照コミットと同じ（2D・3D の読み込みとも）：ITEMS・OOPARTS・SHOP_ADD・SHOP_EXTRAS・ENEMIES・QUESTS・オーパーツの礼の品（`docs/icons/logs/ids.log`）
  - 注：このハッシュの道具の「RECIPES」は `window.RECIPES` が無いため比較になっていない。代わりに、レシピを持つファイル（bonds94・env76・towns76・ship76・buildings など）は差分がないことを git diff で確認
- 画面を開いても `State.data` と ITEMS は 1 文字も変わらず、セーブに絵の URL・読み込みの状態が入らない（jsdom）
- 旧セーブ 2 つ（参照コミット 483fd5f のゲームで作った遊んでいる途中のセーブ `docs/tools/icons/fixtures/save_483fd5f.json`・v9.4 より前の版 6b4d2a9 のゲームで作ったクリア済みのセーブ `docs/tools/rpg94/fixtures/old_cleared.json`）を jsdom の中の LocalStorage だけで読み込み、見ただけでは中身が変わらないこと、そのセーブのまま買う・売る・使う・装備をして、所持数・お金・HP・攻撃力が期待どおりに変わること（攻撃力は変える前の比較の表と同じ値）、そのあともセーブに絵のものが入らないことを確認（元のファイルは書き換えていない）
- Service Worker はまとめて先に保存する仕組みを足していない（`sw.js` は VERSION の 1 行だけ）
- 起動用のまとめ（`dist/mtq.min.js`）が 4,246,235 → 4,483,021 バイト（約 +237KB。gzip では約 +28KB）。ほぼ対応表（manifest）の分

## 5. 検証結果

最後の形は版 `b7eddfd106`。途中で「装備の比較のスマホの並び」と「「？」の印を CSS で出す（行の文字に ? を混ぜない）」を直したので、絵まわりの確かめはその後にやり直した。既存の長い回帰は、その 1 つ前の版 `8aeea8cbcd`（違いは「？」の印の出し方だけ）で実行した。

| 確かめ | 版 | 結果 |
|---|---|---|
| 絵の確かめ（jsdom）`icons_test.js` 3D の読み込み／2D（旧セーブ 2 つを含む） | 最後 | 62 OK・0 NG ／ 62 OK・0 NG |
| 絵のブラウザの確かめ 2D・3D × PC 1280・スマホ縦 360・スマホ横 | 最後 | 6 通りとも 28 OK・0 NG |
| 見本の品の絵（画像を止めない）2D／3D | 最後 | 18 OK・0 NG ／ 18 OK・0 NG |
| 既存 ui93（メニュー）ブラウザ 6 通り | 最後 | 6 通りとも 29 OK・0 NG |
| 既存 jsdom：menu92・ui88・battle88・rpg93（各 2D／3D） | 最後 | すべて NG 0（89・62・22・89 OK） |
| 素材 ZIP の `qa/check-item-icons.cjs`・ID の照合・データのハッシュ | 8aeea8cbcd | ok・一致 659・ハッシュ同じ |
| 既存ブラウザ：ui93 6・bonds94 6・bonds941 6・flow89 4・ui87 | 8aeea8cbcd | すべて NG 0 |
| 仲間の絆 jsdom（bonds94・bonds941 各 2D／3D） | 8aeea8cbcd | 67・77 OK、NG 0 |
| 既存 jsdom：layout_menu・smooth89 | 8aeea8cbcd | NG 0 |
| トレード学習まわり（tl・tradia・ult・learn・savecompat64 など） | 8aeea8cbcd | tl_ui_test 1 NG（2D・3D）・tradiatest 1 NG・learntest 1 件。参照コミットの記録（`docs/rpg94/logs/tests_regress_tl.log`）と結果の行がすべて同じ＝絵の追加で増えた NG はない（もとの NG の原因は今回は調べていない） |

記録：`docs/icons/logs/`（tests_final・browser_icons・browser_samples・browser_ui93_final・ids・tests_icons・tests_regress・tests_regress_tl・browser_regress）

ブラウザの確かめの中身：起動時の絵の読み込み 0 件、60 行の一覧のスクロールと遅延読み込み、長い名前、絵が読み込まれても行が跳ねない、キー・クリック・タップ、詳細の絵の大きさ、Esc で戻る、所持品なし、装備の比較（変わる能力が詳細欄の中に見える）、店の無効な行、オーパーツと図鑑の未入手、戦闘のどうぐと結果、ポーションの WebP を止める → PNG に切り替わる、ポークビッツ丼の WebP と PNG を両方止める → 「？」になり名前と操作は残る、ページ・コンソールのエラーなし、思いがけない 404 なし。

見本の品（木の剣・鋼の剣・損切りの盾・笑わぬ大盾・ポーション・勇者のバゲット・ポークビッツ丼・森の鍵・op_001 古代文明の歯車・ダウの大剣＋・革の帽子・力の指輪・コーヒー・フルーツジュース・モグランのかじった単語帳）は、画像を止めない別の確かめ（`icons_samples.js`）で webp128・webp256・png256 がすべて開けること、ゲームの名前と対応表の名前が同じことを確認し、一覧表の画面写真（`docs/icons/shots/icons_samples_*.jpg`）で名前と絵が合っていることを目で見た。画面写真は `docs/icons/shots/`。

## 6. 未確認・残り

- 実機（iPhone・Android）・Windows／Mac の実ブラウザ・GPU のある環境での表示は**未検証**（この作業環境は GPU なしの Chromium だけ。3D の画面写真はソフトウェア描画）
- 低い性能の端末での速さ、遅い回線での見え方は**未検証**
- 素材の追加 5 件（上の「3」）は絵がないまま。素材を足すかどうかは要確認
- 素材（約 66MB）をリポジトリに入れたため、clone・公開の容量が増える
