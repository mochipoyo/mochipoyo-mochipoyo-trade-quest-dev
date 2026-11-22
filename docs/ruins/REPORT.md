# v9.11 旧時代の廃墟（地球の世界・3D 版）

ブランチ `feature/earth-ruins`（`feature/equip-appearance` の f2f1c54 から分岐）。main・公開本番には触れていない。

## 1. 入れたもの（確認できている事実）

- 地球の世界（3D 版の 100 地図）に、旧時代の建物・乗り物・設備の残骸を置いた。合計 1268 個（`node docs/tools/ruins/ruins_check.js` の値）
  - 名のある残骸 69 個（一覧 70 のうち）。実際の経度・緯度から地図上の位置を決めている
  - 都市の跡 394 個（一覧 54 都市のうち 53 都市）。ビル・骨組み・高架・バスなどを都市の位置のまわりに置く
  - まばらな残骸 805 個（車・鉄塔・街灯・看板・家・戦車・風車・飛行機・難破船など）。都市の跡に近いほど多く、遠いほど少ない。南緯 58° より南・北緯 72° より北には置かない
- 残骸のある地図は 100 のうち 54。1 つの地図で最も多いのは world_neon の 90 個
- 形はすべてプログラムで作った立体（画像・外部モデルは使っていない）。添付の 19 枚は雰囲気の参考にだけ使い、絵そのものは取り込んでいない
- 置けなかったもの：`moai`（その経度・緯度のまわりに陸も浅瀬もない）、都市 `osaka`（まわりが町・ほこら・港で埋まっている）

### 名のある残骸の一覧（ID・形・地図）

北・中央・南アメリカ：liberty（埋もれた像・world_meridian の浅瀬）、golden_gate、capitol、gateway_arch、launch_pad、chichen_itza、arecibo、needle、cn_tower、mt_heads、gulf_rig、vegas、teotihuacan、christ、machu、panama、brasilia

ヨーロッパ：eiffel、big_ben、london_eye、stonehenge、colosseum、pisa、parthenon、sagrada、brandenburg、windmills、kremlin、north_sea_rig、chernobyl、hagia、arc、atomium、neuschwanstein

アフリカ・中東：giza、abu_simbel、burj、petra、suez_ship、kilwa、lagos_rig、table_mt、kaaba_towers

アジア：taj、great_wall_a〜c、tokyo_tower、skytree、daibutsu、torii、osaka_castle、pearl、petronas、angkor、marina、seoul_tower、hk_carrier、baikonur、potala、borobudur、taipei、gateway_india

オセアニア・南極：opera、harbour_bridge、uluru_dish、nz_tanker、mcmurdo、antarctic_plane

## 2. 決めたこと

- **見た目だけ**。当たり判定はない（主人公は残骸をすり抜ける。手前に来た残骸は既存の仕組みで透ける）。地図のタイル・町・ほこら・宝箱・敵・セーブ形式は変えていない
- 町・ダンジョンの入口（半径 6 マス）、ワープ・宝箱・人・イベント（半径 2 マス）、港、乗り物の置き場、道・橋・山・崖・溶岩の上には置かない
- 位置は世界の座標から毎回同じに決まる（乱数の保存なし）
- ゲーム内の文章は足していない（`docs/earth3121-lore.md` の「どの土地が旧時代のどこかを文章で断定しない」に合わせた）
- 2D 版・「地域ごと」の世界では何も置かない

## 3. 変えたファイル

- `js/data/ruins3121.js`（新規）：一覧と配置の計算。`index.html` の読み込み一覧に追加
- `three-src/src/world/Ruins3121.js`（新規）：形と、地図ごとの組み立て
- `three-src/src/world/WorldBuilder3D.js`：フィールドを作るときに残骸を足す。残骸の位置には木・岩などの飾りを置かない
- `3d/`：`npx vite build` で作り直し（`3d/assets/main-iu0ykk9f.js`）。版 caeb67d04a
- `docs/tools/ruins/ruins_check.js`・`ruins_shots.js`（新規）

## 4. 確認したこと

| 確認 | 結果 |
|---|---|
| `node docs/tools/ruins/ruins_check.js`（配置の決まり・2D では置かない・形がそろっている） | NG 0 |
| `PORT=8894 QUALITY=low node docs/tools/ruins/ruins_shots.js <全 ID>`（3D 版で 1 つずつ表示。形の作り損ない・ページのエラーを見る） | 本文末尾の「撮影の結果」を参照 |
| 同 `QUALITY=high` で 10 か所（liberty・giza・tokyo_tower・eiffel・colosseum・abu_simbel・petra・new_york・tokyo・tower） | NG 0・ページのエラーなし |
| `node docs/tools/v78/earth78_check.js` | すべて OK |
| `node docs/tools/v78/earth78_save.js` | すべて OK |
| `node docs/tools/appear/appear_pixel_test.js`／同 `2d` | OK 77 / NG 0（両方） |
| `node tools/stamp-version.js --check` | 版 caeb67d04a・272 ファイル |

画像：`docs/ruins/shots/ruin_<ID>.jpg`

## 5. 未検証

- 実機（PC の GPU・スマートフォン）での見え方と速さ。撮影はソフトウェア描画のヘッドレス Chromium で、実表示の確認にはならない
- 描画の重さ。1 つの地図で増える量は、最大の world_neon で三角形およそ 5.3 万・形のまとまり 30（撮影時の記録）。実機でのコマ落ちの有無は測っていない
- `run_v98.sh`（全体の回帰。2 時間を超える）と、Playwright を使う v78 の 3D テスト（`earth78_3d.js` など）は今回実行していない

## 6. 分かっている課題

- すり抜ける（当たり判定なし）
- 始まりの村のある地図（world）に、パリ・ロンドンにあたる跡が集まっていて、序盤から塔やビルの残骸が多く見える
- 小さな島・暗い天気の地図では見えにくいものがある（arecibo、hk_carrier など）
- 隣り合う地図の境目では、隣の地図の残骸は、その地図が読み込まれるまで出ない（既存の地形と同じ動き）

## 7. 決めてほしい点

1. 当たり判定を付けるか（付けると通れない場所ができるので、道をふさがない確認が要る）
2. 量（今は合計 1268）。増やす・減らす・序盤の地図だけ減らす
3. 追加・変更したい残骸（場所と、どんな形か）
