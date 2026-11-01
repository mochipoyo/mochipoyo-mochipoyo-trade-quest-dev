# ボス44体：新しい戦闘画像への差し替え（対応表）

素材：`trade_quest_bosses_44_redesign_for_claude.zip`（`documentation/boss_mapping.json`・`images_512/`・`images_1024/`・`originals/`・`previews/`）

- 差し替え完了：**44 / 44体**（保留なし）
- 変えたのは戦闘・図鑑・マップのシンボルで使う画像だけ。敵ID・名前・能力・行動・報酬・出現条件・物語・セーブは変えていない
- 配置未確認の6体（B004 boss_greed_demon（欲望の魔人）、B009 boss_grote（鉄冠将軍グロート）、B027 sphinx（スフィンクス像）、B028 kraken（クラーケン）、B029 dragon_red（レッドドラゴン）、B030 demon_lord（相場魔王））も画像は差し替えたが、出現・戦闘は追加していない
- 対象外（変更なし）：通常敵164体、新規通常敵40体、特殊戦闘のカットイン5種、主人公・仲間・NPC

## しくみ

- 対応データ：`js/data/boss-redesign.js`（番号・敵ID・名前・画像・不透明部分の範囲・収める枠・浮かせる量・注記）。読み込み時に `ASSET_MANIFEST.monsters[敵ID]` の画像の項目を新画像に差し替える
- 画像：`assets/bosses_v2/<敵ID>.png`（素材の **512px版をそのまま**。ハッシュは素材の `image_qa.json` と一致）。**1024px版は使わない**（戦闘の表示は最大でおよそ 290×208 のため）。一覧画像（previews）・原画（originals）もゲームでは使わない
- 表示：`js/core/bossart.js` が不透明部分で切り抜き、縦横比を保って枠に収める（拡大はしない。cover の切り抜きはしない）。枠は 260×200（浮くボス 260×186、魔王 290×208・浮く魔王 290×194）。浮くボス（10体）は14px浮かせ、影を小さく薄く
- 画面の上の表示（メッセージ欄・パーティのHP・オートボタン）に名前が隠れないよう、`js/ui/battle.js` がその位置を測り、必要なときだけ絵を縮める（足元はそのまま）。このため実際の大きさは画面で変わる：PC（1280×800）ではボスの高さは最大およそ173px、スマホ縦向きでは表の大きさのまま、スマホ横向きではおよそ140px
- v6.3 の画像のための表示時の加工（枠線・白い背景・切り口の除去）と古い範囲（bbox）は、新画像には使わない
- v6.3 の画像の情報はマニフェストの `v63` に残した（ファイル `assets/bosses_new/` も消していない）
- 新画像が読めないとき：v6.3 より前の画像（prev）→ コードで描く絵、の順に切り替える（従来どおり）
- 切替（確認用）：URL に `?bossart=old`（ボスの画像のパックを使わない）／`?bossart=v63`（v6.3 の画像を、そのときの採用・保留のとおりに）。`localStorage` の `mtq-bossart` でも同じ。セーブには保存しない
- 読み込み：起動時には読まない。ボスのいるマップに入ったとき・戦闘の直前に、そのボスの画像だけ読む（従来どおり）
- 確認ページ：`boss-redesign-preview.html`（44体を戦闘と同じ処理で表示。配置未確認・浮く・魔王で絞り込み）

## 検品

1. 素材の対応表とゲームのボス（`boss: true` の44体）を照合：ID・名前とも一致。B001〜B044 の欠番・重複なし。同じ名前のグロート（`boss_grote`・`boss_grote_2`）は別のID・別の画像
2. 512px版・1024px版・原画を機械的に確認：透過チャンネル、四辺の透明余白（512px で最小79px）、白い背景の焼き込み、直線的な切れ、本体から離れた部品、薄いもや。原画の端に近い部分は拡大して目視
3. 44体すべてを、名前とデザインの指示（`design_prompts.json`）・一覧画像と見比べて目視
4. 問題：**B007 潮の大蛇ウルガの1024px版（`images_1024/boss_tide_serpent.png`）が途中で切れた壊れたファイル**（819,200バイト。素材のハッシュと不一致）。ゲームは512px版を使うので影響なし（512px版はハッシュ一致・正常）

## 対応表（44体）

| 番号 | 既存敵ID | 名前 | 配置 | 採用画像 | 差し替え状況（1体のときの大きさ） | v6.3 のとき | 注記 |
|---|---|---|---|---|---|---|---|
| B001 | `boss_lost_trend` | トレンド迷子 | あり | `assets/bosses_v2/boss_lost_trend.png` | 差し替え済み（157×186・浮かせる14px） | 採用 |  |
| B002 | `boss_greed_golem` | 欲望のゴーレム | あり | `assets/bosses_v2/boss_greed_golem.png` | 差し替え済み（218×200） | 採用 |  |
| B003 | `boss_bandit_chief` | 山賊の頭目ガロン | あり | `assets/bosses_v2/boss_bandit_chief.png` | 差し替え済み（155×200） | 採用 |  |
| B004 | `boss_greed_demon` | 欲望の魔人 | **未確認** | `assets/bosses_v2/boss_greed_demon.png` | 差し替え済み（177×200） | 保留（既存画像を優先） |  |
| B005 | `wolf_king` | 森の狼王 | あり | `assets/bosses_v2/wolf_king.png` | 差し替え済み（190×200） | 採用 |  |
| B006 | `crystal_golem` | クリスタルゴーレム | あり | `assets/bosses_v2/crystal_golem.png` | 差し替え済み（192×200） | 採用 |  |
| B007 | `boss_tide_serpent` | 潮の大蛇ウルガ | あり | `assets/bosses_v2/boss_tide_serpent.png` | 差し替え済み（196×200） | 採用 | 素材の1024px版は壊れたファイル（途中で切れている。ハッシュ不一致）。ゲームは512px版を使うので影響なし |
| B008 | `boss_overseer` | 監督官ザルグ | あり | `assets/bosses_v2/boss_overseer.png` | 差し替え済み（200×200） | 採用 |  |
| B009 | `boss_grote` | 鉄冠将軍グロート | **未確認** | `assets/bosses_v2/boss_grote.png` | 差し替え済み（184×200） | 採用 |  |
| B010 | `boss_ledger_guardian` | 帳簿の守護者 | あり | `assets/bosses_v2/boss_ledger_guardian.png` | 差し替え済み（219×200） | 採用 |  |
| B011 | `boss_valen` | 騎士団長ヴァレン | あり | `assets/bosses_v2/boss_valen.png` | 差し替え済み（154×200） | 採用 |  |
| B012 | `boss_royal_captain` | 親衛隊長ドレク | あり | `assets/bosses_v2/boss_royal_captain.png` | 差し替え済み（185×200） | 採用 |  |
| B013 | `boss_ledger_core` | 帳簿中枢の守護機構 | あり | `assets/bosses_v2/boss_ledger_core.png` | 差し替え済み（185×200） | 採用 |  |
| B014 | `boss_ruin_memory` | 廃墟の記憶 | あり | `assets/bosses_v2/boss_ruin_memory.png` | 差し替え済み（145×186・浮かせる14px） | 採用 |  |
| B015 | `boss_library_guardian` | 図書館の守護機構 | あり | `assets/bosses_v2/boss_library_guardian.png` | 差し替え済み（205×200） | 採用 |  |
| B016 | `boss_time_guardian` | 時の守護者 | あり | `assets/bosses_v2/boss_time_guardian.png` | 差し替え済み（185×200） | 採用 |  |
| B017 | `boss_drone_swarm` | 監視ドローン群 | あり | `assets/bosses_v2/boss_drone_swarm.png` | 差し替え済み（197×186・浮かせる14px） | 採用 |  |
| B018 | `boss_core_defense` | 中枢防衛機構 | あり | `assets/bosses_v2/boss_core_defense.png` | 差し替え済み（226×200） | 採用 |  |
| B019 | `boss_minister` | 裏切りの大臣ヴォルク | あり | `assets/bosses_v2/boss_minister.png` | 差し替え済み（143×200） | 採用 |  |
| B020 | `boss_sky_guardian` | 天空の守護者 | あり | `assets/bosses_v2/boss_sky_guardian.png` | 差し替え済み（190×186・浮かせる14px） | 採用 |  |
| B021 | `boss_zarg_remnant` | ザルグの残滓 | あり | `assets/bosses_v2/boss_zarg_remnant.png` | 差し替え済み（174×186・浮かせる14px） | 採用 |  |
| B022 | `boss_sevran_shadow` | セヴランの影 | あり | `assets/bosses_v2/boss_sevran_shadow.png` | 差し替え済み（179×200） | 採用 |  |
| B023 | `boss_grote_2` | 鉄冠将軍グロート | あり | `assets/bosses_v2/boss_grote_2.png` | 差し替え済み（191×200） | 採用 |  |
| B024 | `boss_demon_fear` | 相場魔王〈恐怖〉 | あり | `assets/bosses_v2/boss_demon_fear.png` | 差し替え済み（196×208・魔王） | 採用 |  |
| B025 | `boss_demon_greed` | 相場魔王〈欲望〉 | あり | `assets/bosses_v2/boss_demon_greed.png` | 差し替え済み（197×208・魔王） | 採用 |  |
| B026 | `boss_demon_fixed` | 相場魔王〈固定〉 | あり | `assets/bosses_v2/boss_demon_fixed.png` | 差し替え済み（180×194・浮かせる14px・魔王） | 採用 |  |
| B027 | `sphinx` | スフィンクス像 | **未確認** | `assets/bosses_v2/sphinx.png` | 差し替え済み（188×200） | 保留（既存画像を優先） |  |
| B028 | `kraken` | クラーケン | **未確認** | `assets/bosses_v2/kraken.png` | 差し替え済み（204×200） | 保留（既存画像を優先） |  |
| B029 | `dragon_red` | レッドドラゴン | **未確認** | `assets/bosses_v2/dragon_red.png` | 差し替え済み（204×200） | 保留（既存画像を優先） |  |
| B030 | `demon_lord` | 相場魔王 | **未確認** | `assets/bosses_v2/demon_lord.png` | 差し替え済み（189×208・魔王） | 保留（既存画像を優先） |  |
| B031 | `boss_storm_chief` | 砂嵐の頭目ザイード | あり | `assets/bosses_v2/boss_storm_chief.png` | 差し替え済み（193×200） | 採用 |  |
| B032 | `boss_mirage_lord` | 蜃気楼の主 | あり | `assets/bosses_v2/boss_mirage_lord.png` | 差し替え済み（154×186・浮かせる14px） | 採用 | 原画で上下の細い先端が端から1〜3pxまで近い（薄い先端。目視で欠けは見られない） |
| B033 | `boss_magma_wyrm` | 溶岩の番竜 | あり | `assets/bosses_v2/boss_magma_wyrm.png` | 差し替え済み（245×200） | 採用 |  |
| B034 | `boss_primal_flame` | 原初の炎竜 | あり | `assets/bosses_v2/boss_primal_flame.png` | 差し替え済み（190×200） | 採用 |  |
| B035 | `boss_frost_spirit` | 凍てついた大精霊 | あり | `assets/bosses_v2/boss_frost_spirit.png` | 差し替え済み（159×200） | 採用 |  |
| B036 | `boss_memory_keeper` | 記憶庫の番人 | あり | `assets/bosses_v2/boss_memory_keeper.png` | 差し替え済み（179×200） | 採用 |  |
| B037 | `boss_clock_warden` | 凍結の時計守 | あり | `assets/bosses_v2/boss_clock_warden.png` | 差し替え済み（211×200） | 採用 |  |
| B038 | `boss_ash_lord` | 灰の王 | あり | `assets/bosses_v2/boss_ash_lord.png` | 差し替え済み（161×200） | 採用 |  |
| B039 | `boss_ghost_captain` | 幽霊船長 | あり | `assets/bosses_v2/boss_ghost_captain.png` | 差し替え済み（196×200） | 採用 |  |
| B040 | `boss_old_core` | 旧都市の演算核 | あり | `assets/bosses_v2/boss_old_core.png` | 差し替え済み（196×186・浮かせる14px） | 採用 |  |
| B041 | `boss_gull_admiral` | 海賊カモメの頭 | あり | `assets/bosses_v2/boss_gull_admiral.png` | 差し替え済み（185×200） | 採用 | くちばしがカモメよりワシに近い見た目（名前・設定どおりの海賊の海鳥の提督） |
| B042 | `observer_echo` | 観測者の残響 | あり | `assets/bosses_v2/observer_echo.png` | 差し替え済み（171×186・浮かせる14px） | 採用 |  |
| B043 | `soul_warden` | 魂の番人 | あり | `assets/bosses_v2/soul_warden.png` | 差し替え済み（134×200） | 採用 |  |
| B044 | `zero_echo` | ゼロポイントの残響 | あり | `assets/bosses_v2/zero_echo.png` | 差し替え済み（175×186・浮かせる14px） | 採用 |  |
