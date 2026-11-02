# 追加の仲間3人の4方向の絵（v6.8）

- `source/`：2026-11-02 にご提供いただいた画像（カズト・もちぽよ・神聖犬ポン太）。ゲームでは読み込まない
- 切り出し：`docs/tools/v68/cut_party68.py`（背景の除去・余白・縮小のみ。描き直しなし）
  `python3 docs/tools/v68/cut_party68.py docs/party-directions-add68/source/kazuto_src.png docs/party-directions-add68/source/mochipoyo_src.png docs/party-directions-add68/source/ponta_src.png .`
- 出力：`assets/characters/party-directions-add68/`（`sprites/<人物ID>/<向き>.png` 12枚＋`manifest.json`。v3 のパックと同じ形）
- もちぽよのシートの向き：左上＝正面、右上＝左向き、左下＝右向き、右下＝背面（顔の向きを見て判断）
