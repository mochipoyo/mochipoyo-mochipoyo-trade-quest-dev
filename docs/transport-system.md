# 乗り物システム設計（transport-system）

## 1. 乗り物の種類

| ID | 名前 | 解放 | 航行できる地形 | 乗降 | 状況 |
|---|---|---|---|---|---|
| sailboat | 小型帆船「ポヨ号」 | 第4章 main_4 達成（ship_ready） | 浅瀬（shallow）・深海（water）・船着き場（dock）。海路は SEA_ROUTES に登録された沿岸航路のみ（world ⇄ world_grania） | 船の隣の陸から船に向かって移動すると乗船。乗船中に通行可能な陸タイル（草・砂・道・船着き場）へ移動すると下船し、船はその海タイルに残る | **今回実装** |
| galleon | 遠洋航海船 | 第8章前後（ナギ加入） | 上記＋外海（deep：海流ゾーン）。遠洋ルート（断裂群島・砂漠・雪原・竜炎） | 同上 | データのみ |
| airship | 飛空艇 | 第14章 | すべての地形の上空。着陸は「平地（草・砂・雪・丘）」のみ。山脈・森・水上には着陸不可 | 着陸地点で降りる。離陸はその場 | データのみ |
| submarine | 潜航装置 | 第9章 | 海底都市への特殊ワープ（移動操作なし） | ― | データのみ |

## 2. データ構造（セーブ）
```js
State.data.vehicles = {
  sailboat: { owned: true, map: 'world', x: 18, y: 72, port: { map: 'world', x: 18, y: 72 } },
  galleon:  { owned: false, map: null, x: 0, y: 0, port: null },
  airship:  { owned: false, map: null, x: 0, y: 0, port: null }
};
State.data.aboard = null | 'sailboat' | 'galleon' | 'airship';
```
- `map/x/y`：乗り物の現在位置（降りているときは停泊位置、乗っているときはプレイヤーと同じ）
- `port`：最後に出航した港（全滅時の復帰先）。入港（港の隣接海タイル＝港タイル）で更新
- 旧セーブ：`State.migrate` でテンプレートから補完（vehicles 全て owned:false、aboard:null）。ship_ready フラグが立っている旧データは sailboat.owned=true・マリナの船着き場に配置

定義データ（`js/data/vehicles.js`）：
```js
VEHICLES = {
  sailboat: { name: '小型帆船', speed: 1.6, passable: ['water', 'shallow', 'dock'], landOn: ['grass','grass2','sand','road','dock','path_stone','hill','snow'], encounterRate: 0.03, sprite: 'ship', mapIcon: '5', routes: ['coastal'] },
  galleon:  { ..., routes: ['coastal','ocean'] },
  airship:  { passable: '*', landOn: ['grass','grass2','sand','snow','hill','road'], encounterRate: 0 }
};
SEA_ROUTES = [ { id: 'east_passage', vehicle: ['sailboat','galleon'], a: { map: 'world', edge: 'east' }, b: { map: 'world_grania', edge: 'west' } }, ... ];
```

## 3. ロジック（`js/rpg/vehicle.js`、描画非依存）
- `Vehicle.canBoard(map, x, y)`：隣接タイルに乗り物がある
- `Vehicle.board(id)` / `Vehicle.land(x, y)`：状態遷移。乗船中は `World.player.aboard = id`
- `Vehicle.passable(map, x, y)`：乗船中の通行判定（VEHICLES[id].passable に含まれるタイル名のみ。イベント・NPC・他の乗り物は不可）
- `Vehicle.tryLand(map, x, y)`：移動先が landOn かつ通常の歩行で通れる → 下船して歩く（乗り物はその場に残る）
- `Vehicle.onStep()`：海上エンカウント（海のゾーン表、乗り物ごとの rate）、海路（地図端で SEA_ROUTES 判定 → 乗り物ごと隣の地域へ、相対 y を維持）、港判定（港の隣で port 更新）
- `Vehicle.onGameOver()`：乗船中に全滅したら、乗り物は `port` に戻り、プレイヤーは lastInn（宿）へ。乗り物を失わない
- `Vehicle.onLoad()`：ロード時に乗船中なら乗り物位置＝プレイヤー位置に揃える。海上でセーブ・再開して陸上に出現しない（位置が通行不能なら最寄りの航行可能タイルへ）
- 衝突：陸・岩礁（cliff）・他の乗り物・ワープ以外の場所イベントには進めない。地域マップの端（海路でない）は進めない
- ミニマップ・ワールドマップ：乗り物アイコンを表示（停泊中も）。「世界」タブでは各乗り物の現在地域を表示

## 4. 描画（2D：`js/rpg/world.js` の draw）
- 乗船中：プレイヤースプライトの代わりに船スプライト（Tiles 'ship' の4方向版を `Vehicle.frame(dir, anim)` で）を描く。波しぶきのアニメ
- 停泊中：船タイルをマップ上に描く（`World.applyState` でタイル差し替えはせず、オーバーレイ描画）
- 3D化時：Vehicle のロジック（状態・通行判定・海路・エンカウント）はそのまま使い、描画だけ差し替える

## 5. 港・入港・上陸
- 港：各港町の world 上の場所の隣接海タイルを「船着き場」とする（マリナ：location.x−? の最寄り水タイルに dock タイル 'd' を敷く）。船着き場に乗り物を置いたまま町へ入れる
- 上陸：沿岸の歩ける陸タイルならどこでも下船できる（島への上陸）。断崖（cliff）・森・山には下船不可
- 第8章以降：外海（海流ゾーン）は遠洋航海船のみ。小型帆船で外海タイルに進むと「潮流が強く、小型帆船では進めない」

## 6. 海上の敵・航海イベント
- 沿岸の海（今回）：sea_serpent（海蛇）、gull_pirate（海賊カモメ）、jelly_float（浮遊クラゲ）、reef_crab（岩礁ガニ）。戦闘背景は 'sea'
- 外海（将来）：海賊船（戦闘＋船の損傷イベント）、嵐（数歩の間ランダムに流される）、海流（一方向に押される）、隠された島（霧の中にのみ現れる）、航海イベント（漂流者の救助、難破船の宝）
- 全滅時：port へ復帰（上記）

## 7. テスト項目
- 船の乗降（陸→船→海→陸）、通行不能地形への衝突、海路での地域移動（往復）、海上でのセーブ・ロード（位置・乗船状態の復元）、全滅時の復帰、港への入港と町への出入り、ミニマップ表示、旧セーブの移行（vehicles 補完、ship_ready なら船が出現）、移動不能にならないこと（船を置いたまま別の方法で陸へ戻ったとき：各港に「船を呼ぶ」NPC＝船乗りが、所有船を最寄りの港へ回航する）
