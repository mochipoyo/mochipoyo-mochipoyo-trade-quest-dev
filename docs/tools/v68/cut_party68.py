# v6.8 追加の仲間3人（カズト・もちぽよ・神聖犬ポン太）の4方向の絵を、ご提供の画像から切り出して
#   assets/characters/party-directions-add68/（v3 パックと同じ形：320×320・透過・足もとの基準点 pivot=[160,304]）に書き出す
# ・カズト・ポン太：カード（背景色 #1d2b3d）の画像 → カードの外側から背景色を塗りつぶして透明に（キャラの内側の暗い色は消さない）。
#   ふちの1ドットは背景色との混ざりを外して半透明に（白っぽい・青っぽいふちが残らないように）。地面の点線は切り出し範囲の外
# ・もちぽよ：透過の 1254×1254 シート（左上＝正面・右上＝左向き・左下＝右向き・右下＝背面）を空白の行・列で4つに分ける
# ・絵は描き直さない（切り出し・余白・縮小だけ）。同じ人物の4方向は同じ縮尺。足もと（いちばん下の不透明な行の近くの中心）を基準点へ
# 使い方：python3 cut_party68.py <カズトの画像> <もちぽよの画像> <ポン太の画像> <出力先（リポジトリの一番上）>
import sys, os, json, hashlib
import numpy as np
from PIL import Image
from collections import deque

KAZ, MOCHI, PONTA, ROOT = sys.argv[1:5]
OUT = os.path.join(ROOT, 'assets/characters/party-directions-add68')
CANVAS, PIVOT, MAXH, ALPHA_MIN = 320, (160, 304), 278, 16
BG = np.array([29, 43, 61])
CARDS_X = [(24, 343), (352, 671), (680, 999), (1008, 1327)]

def cut_card(path, x0, x1, y0, y1):
    a = np.array(Image.open(path).convert('RGB')).astype(int)[y0:y1, x0:x1]
    h, w = a.shape[:2]; d = np.abs(a - BG).max(2)
    bg = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if d[y, x] <= 10 and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if d[y, x] <= 10 and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and not bg[yy, xx] and d[yy, xx] <= 10: bg[yy, xx] = True; q.append((yy, xx))
    alpha = np.where(bg, 0, 255).astype(float); rgb = a.astype(float)
    # ふちの1ドット：背景と混ざった色を外して半透明に
    edge = (~bg) & (np.roll(bg, 1, 0) | np.roll(bg, -1, 0) | np.roll(bg, 1, 1) | np.roll(bg, -1, 1))
    ys, xs = np.where(edge)
    for y, x in zip(ys, xs):
        k = min(1.0, d[y, x] / 70.0)
        if k < 0.12: alpha[y, x] = 0; continue
        alpha[y, x] = round(255 * k); rgb[y, x] = np.clip((a[y, x] - (1 - k) * BG) / k, 0, 255)
    # カードの角の丸み（ふちの色）など、本体とつながらない小さなかけら（60ドット未満）は消す
    vis = alpha > 0; lab = np.zeros((h, w), int); n = 0
    for sy in range(h):
        for sx in range(w):
            if vis[sy, sx] and not lab[sy, sx]:
                n += 1; lab[sy, sx] = n; q2 = deque([(sy, sx)]); pts = [(sy, sx)]
                while q2:
                    y, x = q2.popleft()
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and vis[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; q2.append((yy, xx)); pts.append((yy, xx))
                if len(pts) < 60:
                    for (y, x) in pts: alpha[y, x] = 0
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def bbox(im):
    al = np.array(im)[:, :, 3]; ys, xs = np.where(al > ALPHA_MIN)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def feet_x(im):
    al = np.array(im)[:, :, 3]; x0, y0, x1, y1 = bbox(im); band = max(6, int((y1 - y0) * 0.08))
    ys, xs = np.where(al[y1 - band:y1] > 128)
    return (xs.min() + xs.max() + 1) / 2.0 if len(xs) else (x0 + x1) / 2.0

def place(ims, ratio):
    hs = [bbox(i)[3] - bbox(i)[1] for i in ims]; maxh = max(hs)
    s = min(1.0, MAXH / maxh)   # 拡大はしない（ぼけるため）。大きい絵だけ縮める
    for im in ims:   # 横にはみ出すなら、その人物の4方向とも少し小さく
        x0, y0, x1, y1 = bbox(im); fx = feet_x(im); half = max(fx - x0, x1 - fx)
        if half * s > PIVOT[0] - 4: s = (PIVOT[0] - 4) / half
    outs = []
    for im in ims:
        x0, y0, x1, y1 = bbox(im); fx = feet_x(im)
        crop = im.crop((x0, y0, x1, y1))
        if s != 1.0: crop = crop.resize((max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s))), Image.LANCZOS)
        c = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
        ox = round(PIVOT[0] - (fx - x0) * s); oy = PIVOT[1] - crop.height
        c.alpha_composite(crop, (ox, oy)); outs.append(c)
    return outs, s

def split_sheet(path):
    a = Image.open(path).convert('RGBA'); return {'front': a.crop((0, 0, 660, 628)), 'left': a.crop((660, 0, 1254, 628)), 'right': a.crop((0, 628, 660, 1254)), 'back': a.crop((660, 628, 1254, 1254))}

DIRS = ['front', 'left', 'right', 'back']
src = {
  'kazuto': ({d: cut_card(KAZ, CARDS_X[i][0] + 4, CARDS_X[i][1] - 3, 44, 342) for i, d in enumerate(DIRS)}, 1.04, 'カズト', 'kazuto_src'),
  'mochipoyo': (split_sheet(MOCHI), 1.0, 'もちぽよ', 'mochipoyo_src'),
  'ponta': ({d: cut_card(PONTA, CARDS_X[i][0] + 4, CARDS_X[i][1] - 3, 9, 307) for i, d in enumerate(DIRS)}, 0.7, '神聖犬ポン太', 'ponta_src'),
}
man = {'schemaVersion': 1, 'packVersion': 'add68-1', 'date': '2026-11-02', 'canvas': [CANVAS, CANVAS], 'pivot': list(PIVOT),
       'directions': {'front': '顔が手前', 'back': '背中が手前・顔は奥', 'left': '画面左を向く', 'right': '画面右を向く'},
       'note': 'ご提供の画像（2026-11-02）から docs/tools/v68/cut_party68.py で切り出し（背景の除去・余白・縮小のみ。描き直しなし）',
       'identityPolicy': 'actor.id -> same actor base（v3 と同じ）', 'jobCostumesIncluded': False, 'actors': {}}
for aid, (dirs, ratio, name, srcname) in src.items():
    ims = [dirs[d] for d in DIRS]; outs, s = place(ims, ratio)
    ent = {'id': aid, 'name': name, 'pivot': list(PIVOT), 'worldHeightRatio': ratio, 'scaleFromSource': round(s, 4), 'source': srcname, 'directions': {}}
    hs = []
    for d, im in zip(DIRS, outs):
        rel = 'sprites/%s/%s.png' % (aid, d); p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p, optimize=True)
        b = [int(v) for v in bbox(im)]; hs.append(b[3] - b[1])
        ent['directions'][d] = {'path': rel, 'source': 'user_provided', 'sha256': hashlib.sha256(open(p, 'rb').read()).hexdigest(), 'opaqueBounds': b}
    ent['referencePixelHeight'] = max(hs); man['actors'][aid] = ent
    print(aid, 'scale', round(s, 3), 'heights', hs, [ent['directions'][d]['opaqueBounds'] for d in DIRS])
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
