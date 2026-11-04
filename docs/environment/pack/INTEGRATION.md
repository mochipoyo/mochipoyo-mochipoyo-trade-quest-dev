# 既存コードへ接続する方法

## コピー先

|パック|推奨配置先|
|---|---|
|`assets/`|`three-src/public/environment-v1/assets/`|
|`data/`のruntimeに必要なJSON|`three-src/public/environment-v1/data/`|
|`runtime/*.js`|`three-src/src/environment/`|
|設計書・コンセプト・参照画像|開発資料フォルダ。公開バンドルに含めない|

`three-src/public/environment-v1/`からビルド時に`3d/environment-v1/`へコピーされる構成を確認する。既存Vite設定は`emptyOutDir: true`なので、`3d/`だけに保存した素材はビルドで消える。

ランタイム用にはプロフィール/材料/モデルmanifestだけを読み込み、330マップの比較用snapshot全体は通常ゲームへ送らない。地形やscene recipeはマップ単位または地域単位で分割する。

## 接続例

以下は接続位置を示す例で、現在のアプリを調べてadaptする。既存rendererの参照は`Renderer3D.renderer`、具体的なアプリの所有フィールドを確認して渡す。

```js
import {EnvironmentCatalog} from './environment/EnvironmentCatalog.js';
import {addCutout} from './engine/Cutout.js';
// game document: /3d/index.html
const env = await new EnvironmentCatalog(
  new URL('./environment-v1/', document.baseURI).href,
  {renderer: actualThreeWebGLRenderer, decorateMaterial: addCutout}
).init();
```

`EnvironmentCatalog.profile(map.id)`を取得し、既存builderに渡す。GLBは`instantiate(id)`で取得し`instance.group`をsceneへ追加。マップ破棄時は`instance.release()`を呼ぶ。geometry/materialはカタログが共有するのでmapごとに破棄しない。

アプリ終了またはカタログ差替え時、全instanceをrelease後に`await env.dispose()`。`MapScene3D.dispose()`がscene全体を走査して材質をdisposeする場合は、**その走査前に補助レイヤーを外してrelease**する。既存のモデル共有と同じ方針で責任を明確にする。

## builder本体の改修

1. `MapScene3D.build()`のgeneric/done分岐に、個別recipeが存在する場合の経路を設ける。
2. Terrain/Worldの床と壁、Building、Interiorへprofileとrecipeを渡す。旧描画と新描画を二重に出さない。
3. `themes.js`の役割は地域の共通値へ縮める。mapごとの形状・材質・照明はprofileを優先。
4. 既存のLocationDesignの色、解放フラグによる外観変化、ランドマークの入口を維持して拡張する。
5. 床meshはチャンク化。地面と道の継ぎ目はブレンドまたは境界geometryで表現。画面内すべてを巨大な1meshにしてcullingを失わない。
6. 自然壁は輪郭を抽出して不規則な岩形状へ、建築壁は連続した壁面と開口部へ。タイルごとの細長い箱の継ぎ目を目立たせない。
7. 室内は屋根の扱い・カメラ側の壁・Cutoutを統一。建物内でカメラが壁の裏側を見ない。
8. 同梱26部品は再利用するが、目印となる大樹・各城の塔・天文台の外殻・各都市の主要建築は追加で作る。組み替えだけで全ロケーションの固有モデルが完成したと扱わない。

`EnvironmentLayer.js`は旧マップの通行不能な場所に補助物を安全に置く例。**道路・部屋の再設計や高低差を完成させる機能ではない。** 本体改修を省く用途には使わない。

`data/recipes/`には5地点の読込試験用レシピを同梱。比較用snapshotの通行不能セル上に少数の部品を置くもので、完成レイアウトではない。最新ゲームのsnapshotで再検証した後、`buildEnvironmentLayer(env, map, currentSnapshot, recipe, {heightAt})`で接続できる。旧snapshotのtilesと一致しない状態では明示的にエラーにする。接続できたら本来のレイアウトと固有建築の制作へ進む。

## 座標とレイアウト移行

1 tile = 1 world unit、Yが高さ、論理yを3DのZへ。タイル中心は`x + 0.5, y + 0.5`。階段は見える形とheightAtを一致させる。現在のエンジンは同じx,zで複数階を歩く完全な多層navmeshを前提としていないため、重なる上下階は既存の別マップ遷移を使う。

JSONの`layout`は部屋の関係、`compositionHints`は正規化した構図の目安。タイル座標ではない。直接`map.tiles`へ書き込まない。Claudeが実際の入口・進行制限・人物配置に合わせてタイル配置へ具体化し、下記migrationを埋める。

レイアウト変更時は、単なる表示用meshの移動では足りない。以下を同じ変更単位で更新：

- 対象mapのrows、buildings、doorX/doorAbs、interior/entry。
- NPCの初期位置、移動範囲、イベント後の位置、会話参照。
- chests/events/search/ooparts/boss/quizのIDと座標。
- 出るwarpsと、別mapからこのmapへ入る`tx/ty`。階段が複数ある場合はtoだけで同一視しない。
- 固定座標を使うクエスト誘導、演出、出口判定、乗り物、脱出帰還先。
- 旧セーブのプレイヤー位置と、歩いている仲間の再配置。
- ミニマップ・世界地図・未踏地名の表示条件。

3D専用の論理レイアウトを採用するか、2Dと共有のデータを更新するかは、座標を参照する処理を確認して決める。3D表示だけ座標をずらす方法は不可。共有データを変更するなら2Dでも歩行・イベントの検証を行う。

旧セーブ移行はversionを付けて一度だけ行い、旧mapIdを維持。ID付きの宝箱・イベントフラグを保つ。旧位置→新位置の写像がない場合は、**そのセーブ状態で到達済みの同じ区域内**の安全地点へ移す。未解放の区域へ近い床を選んでワープさせない。先に旧セーブをバックアップし、2D保存枠`mtq-rpg-v2-slot-*`を3Dの`mtq-3d-slot-*`で上書きしない。

## 負荷

data/quality_presetsは予算で実測ではない。共有GLBでもcloneを大量に置くとdraw callが増える。繰り返す同一meshはInstancedMesh、固定建築は材質別/チャンク別にmerge。画面外をcull。地域を離れたassetsは参照数に応じて解放し、全330mapのテクスチャをpreloadしない。

画像は元解像度の候補を同梱している。採用後に用途別の512/1024等とKTX2などへの変換を検討し、対応loader/codecの配置を実機で確認する。未対応の圧縮形式を拡張子だけ変えて配布しない。
