# 追加敵35体：パックの manifest.json から、ゲームで使う表示の表（切り出し範囲・足もと・大きさ）を作る
#   使い方：python3 -I build_add35.py <パックのフォルダ> <出力 JSON>
import json, sys, hashlib
from PIL import Image
import numpy as np
P = sys.argv[1].rstrip('/') + '/'; OUT = sys.argv[2]
m = json.load(open(P + 'manifest.json', encoding='utf-8'))
sums = {}
for ln in open(P + 'SHA256SUMS.txt', encoding='utf-8'):
    h, f = ln.strip().split(None, 1); sums[f.strip()] = h
# 既存の敵と同じ人物（以前の名前が同じ・同じ考え方の敵）＝既存のIDを使う
REUSE = {'tq_add_bullish_slime': 'yosen_slime', 'tq_add_bearish_slime': 'insen_slime', 'tq_add_contrarian_bat': 'contrarian_bat',
         'tq_add_stoploss_zombie': 'stoploss_zombie', 'tq_add_averaging_goblin': 'nanpin_goblin', 'tq_add_simplicity_acolyte': 'simple_cultist',
         'tq_add_full_leverage_ogre': 'fullleva_ogre', 'tq_add_boom_bust_knight': 'kotsukotsu_knight', 'tq_add_overtrading_phantom': 'pojipoji_phantom',
         'tq_add_indicator_mage': 'indicator_mage'}
# 体格（見える部分の高さの基準。既存の新しい画像の small 118・normal 144・big 170 と同じ）
SIZE = {'tq_add_boredom_imp': 'small', 'tq_add_wakame_head': 'small', 'tq_add_bullish_slime': 'small', 'tq_add_bearish_slime': 'small',
        'tq_add_averaging_goblin': 'small', 'tq_add_contrarian_bat': 'small', 'tq_add_brainwashed_grey': 'small', 'tq_add_ai_surveillance_drone': 'small',
        'tq_add_full_leverage_ogre': 'big', 'tq_add_betrayal_troll': 'big', 'tq_add_glutton_arienti': 'big', 'tq_add_population_control_drone': 'big',
        'tq_add_alien_invasion_merchant': 'big'}
TH = {'small': 118, 'normal': 144, 'big': 170}; LIFT = {'small': 12, 'normal': 14, 'big': 17}; PAD = 8; MAXW = 236
rows = []
for e in m['enemies']:
    f = e['files']['webp']; data = open(P + f, 'rb').read(); sha = hashlib.sha256(data).hexdigest()
    assert sums.get(f) == sha, 'SHA-256 がパックの一覧と違う ' + f
    im = Image.open(P + f); W, H = im.size; assert (W, H) == (1024, 1024) and im.mode == 'RGBA', f
    a = np.array(im.getchannel('A'))
    l, t, r, b = e['visible_bbox']['pixels']
    # 確認：パックの visible_bbox（アルファ32以上）と、実際の画像が一致する
    ys, xs = np.where(a >= 32); assert [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1] == [l, t, r, b] or abs(int(xs.max()) + 1 - r) <= 1, f
    x0, y0, x1, y1 = max(0, l - PAD), max(0, t - PAD), min(W, r + PAD), min(H, b + PAD)
    # 確認：切り出し範囲の外には、ほとんど見えない画素（アルファ4未満）しかない
    out = a.copy(); out[y0:y1, x0:x1] = 0; assert int(out.max()) < 4, (f, int(out.max()))
    ay = e['ground_anchor']['normalized'][1] * 1024; ax = e['ground_anchor']['normalized'][0] * 1024
    size = SIZE.get(e['id'], 'normal'); T = TH[size]; visH = b - t; cw, ch = x1 - x0, y1 - y0
    s = T / visH
    if cw * s > MAXW: s = MAXW / cw
    draw = [round(cw * s), round(ch * s)]
    foot = round((y1 - ay) / ch, 4)
    rows.append({'no': e['pack_number'], 'packId': e['id'], 'id': REUSE.get(e['id'], e['id']), 'reuse': e['id'] in REUSE, 'name': e['name_ja'],
                 'file': 'assets/enemies_add35/' + f.split('/')[-1], 'sha256': sha, 'bytes': len(data), 'ref': 1024,
                 'bbox': [x0, y0, cw, ch], 'visible': [l, t, r - l, b - t], 'anchor': [round(ax, 1), round(ay, 1)], 'size': size, 'draw': draw,
                 'lift': LIFT[size] if e['floating'] else 0, 'foot': foot, 'floating': e['floating'], 'family': e['family']})
json.dump(rows, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for r in rows: print(r['no'], r['id'], r['name'], r['size'], r['draw'], 'lift', r['lift'], 'foot', r['foot'], r['bbox'])
