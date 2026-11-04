# 現状コードの確認結果

## 確認できた事実

対象コミットは `62900a3d3df0f50fa9fe32e2fe7e119eea89e960`。リンクの `_v=937f5dd0a6` はクエリであり、ブランチ先頭の固定を保証しない。

|場所|確認した役割|今回の対応|
|---|---|---|
|`three-src/src/world/MapScene3D.js`|専用/汎用の分岐、建物・NPC・宝箱・高さの接続|個別のscene recipeへ分岐する拡張点|
|`three-src/src/world/coverage.js`|専用対象以外をgenericへ振り分け|視覚品質の検証後にのみ個別完成扱いへ|
|`three-src/src/world/themes.js`|12地域/14場所、色・壁材・霧などのテーマ|色以外の建築・地形・レイアウトを別データへ|
|`three-src/src/world/WorldBuilder3D.js`|タイル由来の床・壁・水・小物を生成|自然/建築の形状、床割り、部材組みを拡張|
|`three-src/src/world/BuildingBuilder3D.js`|建物の生成とLocationDesignの反映|建物用途と地域に応じた輪郭、屋根、基壇|
|`three-src/src/world/InteriorBuilder3D.js`|屋内生成|部屋の用途、家具、壁の高さ、可視性|
|`three-src/src/engine/Materials.js`|主に既存albedo/normalと共通材質|新素材のオンデマンド読込、共有、破棄管理|
|`three-src/src/engine/Renderer3D.js`|high/low、影、Bloom、トーンマッピング|既存を拡張し測定して調整|
|`three-src/src/engine/Cutout.js`|主人公付近の遮蔽物を網目状に抜く|新素材にも接続、旧処理と二重実装しない|
|`three-src/src/bridge/GameBridge.js`|マップcache・生成・高さ・移動との接続|scene lifecycleと共有resourceの寿命を区別|
|`js/core/map.js`|タイル、建物の足元、入口、NPC、イベント、通行判定|可視メッシュと論理マップの整合の中心|
|`js/data/towns.js`|店・宿・教会の共通テンプレート|用途と地域ごとに間取りを個別化|
|`js/data/designs.js`|既存の固有建築指定|上書き破棄せず拡張|
|`js/data/expand-a*.js`等|後段の拡大・追加|ファイル冒頭だけ読んだ古い座標で作業しない|
|`three-src/vite.config.js`|`../3d`へ出力、emptyOutDir=true|出力先だけに素材を置くと消えるためpublic等に原本を置く|

全330件の内訳：field 12、town 25、interior 167、dungeon 126。

後段の変更を反映した例：`poyo_village` は48×40、`rivel_castle` は30×28。`towns.js`の初期定義だけの24×20などを使わない。

## 設計上の推論

現状にはすでに有機的な地形や丸め処理、固有ランドマークの実装もある。「全て単純な箱である」とは断定しない。一方、共通のタイル構造とテンプレートの再利用に依存すると、地域色を変えても歩いた感触や空間の比率が似やすい。今回の改善はこの層を対象にする。

## 未確認

このパック作成時点では、公開URLのゲームを実機で操作した全景比較、GPU上のFPS、全ストーリーのプレイ検証は実施していない。コード監査とパック内部の検証を、実機統合結果として扱わない。

出典：上記各ファイルの固定コミット。`data/provenance.json`に取得したファイルのSHA-256を記録。再取得には次を使用：

`https://github.com/mochipoyo/mochipoyo-mochipoyo-trade-quest-dev/tree/62900a3d3df0f50fa9fe32e2fe7e119eea89e960`
