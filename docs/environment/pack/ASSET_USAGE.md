# 素材の使い方と制作範囲

26 GLBはオリジナルのモジュール形状をJavaScriptから生成したもの。再生成は `npm run build:models`。1mapの大部分を単一の箱で覆う代わりに、支持構造・装飾・設備の部品として使う。

|用途|部品|
|---|---|
|城・神殿|wall_ashlar, arch_round, column_classic, stairs_stone, parapet, floor_medallion, courtyard_fountain|
|洞窟・鉱山|rock_cluster, stalagmites, mine_support, minecart, rail_section, ore_lift|
|町・港|market_stall, dock_section, mooring_post, waterwheel, roof_gable, half_timber_bay|
|時間・学術|clock_monument, magic_ring, library_shelf|
|機械・魔王・雪|server_pillar, pipe_bridge, basalt_ribs, ice_spires|

## GLB仕様

- glTF 2.0 binary、Y-up、tile/world単位。サイズと境界はmodel_manifestに記録。
- static。コリジョン、LOD、スケルトン、アニメーションは含まない。
- 各meshは材質別に結合。複数部品の大量配置はInstancedMesh等でさらに最適化。
- GLBに色と粗さの材質を持つ。画像は外部PNGとして別途EnvironmentCatalogでmaterial.nameに対応付ける。一般的なGLBビューアへ単独で開いた場合はPNGが自動適用されず基礎色表示になる。
- 画像のためにモデルを左右反転して法線を壊さない。負スケールを使うなら法線/面向きも確認。
- メインの巨大建築をこれらの部品だけで完成扱いにしない。追加モデルの制作項目はproduction_backlogを参照。

## 画像と権利の区別

- `assets/textures/`：この依頼で新規生成した6枚。ゲーム材質候補。
- `concepts/`：この依頼で新規生成した目標イメージ。3Dモデルではない。
- `references/`：ユーザーが添付した参考画像。ゲームのtexture・背景・UIとして転載する素材ではない。公開ビルドへコピーしない。
- このパックのオリジナルコードと生成した部品はトレードクエストへの使用・改変を想定。参考作品の公式素材や公式監修を示すものではない。
- `three`は元リポジトリと同じ固定バージョンをpackage.jsonで指定。依存ライブラリ自体はZIPに含めない。
