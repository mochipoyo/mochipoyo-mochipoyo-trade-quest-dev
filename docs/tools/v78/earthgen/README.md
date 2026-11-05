# 地球の地形データの作り方（v7.8）

`js/data/earth78-terrain.js` を作る道具。手順（Node.js）：

```
npm install world-atlas@2.0.2 topojson-client@3.1.0
node land.js      # Natural Earth（1:50m）の陸の形をミラー図法 1440×840 に塗る → land.bin
node biome.js     # 地形の種類（緯度・経度の手書きの範囲＋ノイズ） → biome.bin
node finish.js    # 南緯 77° より南を棚氷に・船の通る海峡を開ける・1 行ずつ RLE → rows.json
```

rows.json を `js/data/earth78-terrain.js` の rows に入れる。陸の形のデータは Natural Earth（パブリックドメイン）を world-atlas（ISC）経由で使う。
