# v6.8 の道具とテスト

- `cut_party68.py`：追加の仲間3人（カズト・もちぽよ・神聖犬ポン太）の4方向の絵を、ご提供の画像から切り出す（背景の除去・余白・縮小のみ）。出力は `assets/characters/party-directions-add68/`
- `companion68test.js`：追加の仲間3人のテスト（jsdom。作業環境の `rpgload.js` で動かす）。加入の条件・強さ・トレード呪文の消費MP・ポン太の別枠の行動・既存のセーブ
- `assettest.diff`：作業環境の `assettest.js`（素材の一覧のテスト）に、4方向の絵のパック（v3・add68）の manifest に載っているファイルを一覧に含める処理を足した差分
- `dumpmaps.diff`：作業環境の `dumpmaps.js`（マップの差分を比べるテストの下ごしらえ）で、追加の仲間3人の NPC を比べる対象から外した差分（`companion68test.js` で置き場所を確かめる）
- 3D版の確認：`three-src/tools/test3d/p68_party.js`（15人の4方向）・`p68b_newcomp.js`（追加の仲間3人・ポン太）
