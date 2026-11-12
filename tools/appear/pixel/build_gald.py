# v9.8 装備の外見（ドット絵の差分）：ガルドの「メニュー正面（companions/gald.png 255×277）」「戦闘の背面（party-directions-v3 の gald/back.png）」
#   戦闘の正面（勝利の振り向き）は gald/front.png が gald.png と同じ絵を (33, 27) に置いたものなので、メニュー正面の部品を座標だけずらして使う
#   元の絵は読むだけ。作った部品は assets/characters/equip-pixels/gald/<向き>/、ガルドの対応表は gald/actor.json に書き、manifest.py でまとめる
#   python3 tools/appear/pixel/build_gald.py [確かめの絵の出力フォルダ]
#
#   部品（どれも元の絵と同じ座標）
#     base_plain      素の絵：斧を外して後ろを埋め（手は握ったまま空）、裸の胸と上腕に「麻の半袖シャツ」を着せたもの（毛皮の肩掛け・腰布・帯はそのまま）
#     armor_shape_f   重鎧：板金（胸当て・肩当て・上腕・前腕・膝と脛）の元の色（主人公の板金の色）と、縁取り・輪郭
#     armor_heavy_t   重鎧の板金の灰色の層（色のある品だけ品の色で塗る。灰色の品は armor_shape_f の色のまま）
#     armor_light_t   軽装：シャツを品の色にする灰色の層
#     weapon_axe      斧：元の絵から切り離した斧（どの斧も同じ形）
#     weapon_sword    v9.8.1 剣：描いて作った剣（斧と同じ握り・同じ向き。拳の上に鍔、刃は上へ。どの剣も同じ形）
#     shield_t/f      v9.8.1 盾：描いて作ったヒーター形の盾（もう一方の腕。面＝品の色・灰色の品は鉄の色、縁＝青銅、中央の鋲＝鉄）
#     hand            斧・剣を握る拳（柄の上に描き直す）
#   重ね順：肩当ては毛皮の肩掛けの「上」（毛皮の下に隠れると、背面では重鎧と素の違いが見えないため）。胸当ては毛皮の襟・ひげ・帯・革紐の下
import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pxlib as P
import build_hero as H
import gear as GR

ROOT = H.ROOT
OUT = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels', 'gald')
CHECK = sys.argv[1] if len(sys.argv) > 1 else None
OUTLINE = (30, 18, 14)
FRONT_SRC = 'assets/characters/companions/gald.png'
FRONT_BATTLE_SRC = 'assets/characters/party-directions-v3/sprites/gald/front.png'
BACK_SRC = 'assets/characters/party-directions-v3/sprites/gald/back.png'
FDX, FDY = 33, 27     # gald/front.png の中の gald.png の位置（差 0 で一致することを確かめてある）

PLATE = ['#262022', '#40373a', '#615657', '#8b7f7d', '#cbbfb3']     # 板金（鉄。毛皮・赤い髪の中で沈みすぎず、白く飛ばない明るさ）
BRONZE = ['#4a3420', '#6f533a', '#937152', '#c39e79', '#e6c9a0']    # 縁取り（オルドの鎧の金具に近い色）
SHIRT = ['#3b3026', '#6f604c', '#a8977a', '#d2c4a4', '#eee5cc']      # 麻のシャツ（旅装）


def cls(a):
    h, s, v = P.hsv(a); op = P.opaque(a)
    return {'skin': op & (h >= 4) & (h <= 32) & (s >= 0.4) & (s <= 0.74) & (v > 0.5),   # 肌は橙寄り（毛皮の明るい所は彩度が低い）
            'brown': op & (h >= 8) & (h <= 42) & (s >= 0.22) & (v >= 0.14) & (v <= 0.62),
            'fur': op & (h >= 18) & (h <= 52) & (s < 0.36) & (v > 0.42),
            'navy': op & (((h >= 190) & (h <= 275)) | ((s < 0.3) & (v < 0.42))),
            'red': op & ((h <= 12) | (h >= 340)) & (s >= 0.6) & (v > 0.3),
            'dark': op & (P.lum(a) < 46)}


def poly(a, pts):
    return P.poly_mask(a.shape[0], a.shape[1], pts)


def band(a, p0, p1, half):
    """2 点を結ぶ太さ 2×half の帯（斜めの柄）"""
    Hh, Ww = a.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    (x0, y0), (x1, y1) = p0, p1; dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy
    t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / L2, 0, 1)
    return np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy)) <= half


def fill_side(a, removed, side, k=None):
    """消した所を、行ごとに片側（'left'／'right'）の絵だけで埋める（k ドットまで。None は全部）"""
    Hh, Ww = a.shape[:2]; filled = np.zeros((Hh, Ww), bool)
    for y in range(Hh):
        xs = np.where(removed[y])[0]
        if not len(xs): continue
        for r in np.split(xs, np.where(np.diff(xs) > 1)[0] + 1):
            x0, x1 = int(r[0]), int(r[-1]); n = x1 - x0 + 1 if k is None else min(k, x1 - x0 + 1)
            for i in range(n):
                if side == 'right': x, sx = x1 - i, x1 + 1 + i
                else: x, sx = x0 + i, x0 - 1 - i
                if sx < 0 or sx >= Ww or a[y, sx, 3] < 40: break
                a[y, x] = a[y, sx]; filled[y, x] = True
    return filled


def unaxe(o, m, hand, fills, mirror=None):
    """斧を消して後ろを埋める。fills＝[(範囲の多角形, 'left'|'right', 何ドット)]：その範囲は片側の絵で埋める
       mirror＝(範囲の多角形, 中心の x)：斧の後ろに隠れていた髪の先を、反対側の髪を鏡に写して描く"""
    a = o.copy(); was = P.opaque(a)
    a[m] = 0
    if mirror:
        pts, cx = mirror; h, s, v = P.hsv(o); Hh, Ww = a.shape[:2]
        hair = (((h <= 30) | (h >= 345)) & (s > 0.6) & (v > 0.3)) | (P.lum(o) < 50)
        ys, xs = np.where(m & poly(a, pts))
        for y, x in zip(ys, xs):
            sx = int(round(2 * cx - x))
            if 0 <= sx < Ww and o[y, sx, 3] > 40 and hair[y, sx] and not m[y, sx]: a[y, x] = o[y, sx]
    for pts, side, k in fills:
        fill_side(a, m & poly(a, pts), side, k)
    P.outline_edges(a, was, OUTLINE)
    P.drop_specks(a, 30); P.fill_holes(a, 30)
    return a


# ============================================================
# 板金：元の絵の明るさ（筋肉の陰影・布のしわ）を、ならして段にし、板金の色にする
# ============================================================
def smooth(v, m, k=1):
    Hh, Ww = m.shape
    for _ in range(k):
        acc = np.zeros_like(v); n = np.zeros_like(v); pv = np.pad(v, 1); pm = np.pad(m, 1)
        for dy in range(3):
            for dx in range(3):
                mm = pm[dy:dy + Hh, dx:dx + Ww]; acc += np.where(mm, pv[dy:dy + Hh, dx:dx + Ww], 0); n += mm
        v = np.where(m, acc / np.maximum(n, 1), v)
    return v


def plate_values(a, m, lo=0.22, hi=0.92, k=2):
    """板金の明るさ（0〜1）：元の明るさを範囲の中でならして並べ直す。縁は 1 段暗く、左上の縁は明るく（丸み）"""
    L = P.lum(a).astype(float); vals = L[m]
    if not len(vals): return np.zeros(m.shape)
    l0, l1 = np.percentile(vals, 4), np.percentile(vals, 96)
    v = lo + (hi - lo) * np.clip((L - l0) / max(1.0, l1 - l0), 0, 1)
    v = smooth(v, m, k)
    v = H.texturize(v, 0.25, 1, 2)
    edge = m & P.neighbors4(~m)
    up = m & ~np.roll(m, 1, 0); left = m & ~np.roll(m, 1, 1)
    v = np.where(edge, v - 0.2, v); v = np.where((up | left) & ~(edge & ~(up | left)), v + 0.28, v)
    return H.quant(np.clip(v, 0, 1))


def dome(Hh, Ww, cx, cy, rx, ry, lames=2, flip=False):
    """肩当て：丸い笠（いちばん上）の下に、少しずつ広がる板（lames 枚）が重なる。下の縁は青銅の縁取り。光は左上"""
    yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    m = np.zeros((Hh, Ww), bool); v = np.zeros((Hh, Ww)); seams = np.zeros((Hh, Ww), bool); rim = np.zeros((Hh, Ww), bool)
    pieces = [(cx, cy, rx, ry)] + [(cx + (i + 1) * (1.5 if flip else -1.5), cy + ry * (0.62 + 0.5 * i), rx * (1.04 + 0.05 * i), ry * (0.62 - 0.05 * i)) for i in range(lames)]
    for k, (px, py, prx, pry) in enumerate(pieces):
        nx = (xx - px) / prx; ny = (yy - py) / pry
        if k == 0: shp = (nx ** 2 + np.clip(ny, -9, 0) ** 2 <= 1.0) & (ny <= 0.5 - 0.35 * nx ** 2)
        else: shp = (nx ** 2 + ny ** 2 <= 1.0) & (ny >= -0.1)
        shp &= ~m if k == 0 else ~m
        nz = np.sqrt(np.clip(1 - nx ** 2 - np.clip(ny, -1, 0) ** 2, 0.05, 1))
        d = nx * -0.5 + np.clip(ny, -1, 0) * -0.7 + nz * 0.5 - (0.18 * np.clip(ny, 0, 1) if k else 0)
        vk = np.select([d > 0.85, d > 0.62, d > 0.38, d > 0.12], [0.92, 0.72, 0.55, 0.4], 0.26)
        top_edge = shp & ~np.roll(shp, 1, 0)
        if k: seams |= top_edge & P.neighbors4(m)                          # 上の板との境い目（影の線）
        v = np.where(shp, vk, v); m |= shp
        if k == len(pieces) - 1:
            bot = shp & ~np.roll(shp, -1, 0); rim |= bot | (np.roll(bot, -1, 0) & shp)
    v = H.texturize(v, 0.25, 3, 1)
    # 笠の上に鋲（左右に 1 つずつ）
    for sx in (-0.45, 0.45):
        rx_, ry_ = int(round(cx + sx * rx)), int(round(cy - ry * 0.15))
        if 0 <= ry_ < Hh and 0 <= rx_ < Ww and m[ry_, rx_]: v[ry_, rx_] = 1.0; seams[ry_ + 1, rx_] = True
    return m, H.quant(np.clip(v, 0, 1)), seams & m, rim & m


def paint_plate(shape_f, gray, m, v, fixed_lines=None, rim=None, trim=None):
    """板金を 2 つの層に：shape_f（板金の色・縁取り・輪郭）と gray（色のある品のための灰色の層。板の面だけ）"""
    face = m.copy()
    if fixed_lines is not None: face &= ~fixed_lines
    if rim is not None: face &= ~rim
    if trim is not None: face &= ~trim
    H.ramp_fill(shape_f, face, v, PLATE)
    gray[face] = 0; gray[face, 0] = gray[face, 1] = gray[face, 2] = np.round(v[face] * 255).astype(np.int32); gray[face, 3] = 255
    if fixed_lines is not None: H.paint_fixed(shape_f, fixed_lines & m, OUTLINE)
    if rim is not None: H.ramp_fill(shape_f, rim & m, np.clip(v + 0.1, 0, 1), BRONZE)
    if trim is not None: H.ramp_fill(shape_f, trim, np.clip(v, 0.3, 1), BRONZE)


def outline_ring(layer, m, base_op):
    """板金のまわり 1 ドットに輪郭（元の絵の上に重ねる層なので、人物の外にも引く）"""
    ring = P.neighbors4(m) & ~m
    H.paint_fixed(layer, ring, OUTLINE)


def shirt(a, m):
    """麻のシャツ：元の明るさ（筋肉の陰影）をならして、生成りの段で塗る。縁は 1 段暗く"""
    v = plate_values(a, m, 0.34, 0.9, k=2); v = np.where(m & P.neighbors4(~m), v - 0.12, v)
    t = a.copy(); H.ramp_fill(t, m, np.clip(v, 0, 1), SHIRT)
    return t, v


# ============================================================
# 向きごとの範囲（元の絵を見て決めた多角形）
# ============================================================
FRONT = {
    'axe': [band, ((57, 80), (36, 125), 10)],
    'head': [(0, 0), (98, 0), (98, 72), (88, 84), (70, 94), (60, 100), (52, 104), (28, 104), (0, 100)],
    'shaft_low': [(12, 150), (38, 150), (34, 176), (31, 208), (14, 208), (12, 180)],
    'hand': [(17, 117), (57, 117), (58, 135), (55, 157), (20, 158), (16, 138)],
    'fills': [([(40, 82), (66, 82), (66, 124), (40, 124)], 'right', 6), ([(12, 150), (40, 150), (40, 208), (12, 208)], 'right', 5)],
    'chest': [(96, 124), (160, 124), (167, 160), (96, 160)],
    'uparm_l': [(58, 122), (99, 122), (99, 170), (58, 170)],
    'uparm_r': [(148, 132), (206, 132), (206, 178), (148, 178)],
    'wrap_l': [(46, 124), (80, 124), (82, 166), (46, 166)],
    'wrap_r': [(160, 156), (210, 156), (210, 186), (160, 186)],
    'legs': [[(60, 208), (106, 208), (106, 245), (60, 245)], [(160, 222), (214, 222), (214, 247), (160, 247)]],
    'pauldrons': [(80, 120, 23, 17, False), (178, 134, 26, 18, True)],
    # v9.8.1 剣：斧の柄と同じ握り・向き（拳の中心 grip、柄の上向き up）。盾：下ろした左の拳と前腕の上（正面から見た面）
    'sword': {'grip': (37, 137), 'up': (0.423, -0.906), 'guard_at': 23},
    'shield': (186, 190, 62, 76, 1.0),
    'hairbox': [(80, 20), (200, 20), (200, 120), (80, 120)],
}
BACK = {
    'head': [(182, 30), (280, 30), (280, 132), (246, 134), (236, 116), (226, 108), (204, 110), (182, 106)],
    'axe': [band, ((219, 100), (263, 214), 11)],
    'spike': [(248, 186), (276, 186), (278, 226), (258, 228), (248, 206)],
    'hand': [(229, 139), (264, 139), (264, 162), (252, 172), (232, 172), (227, 156)],
    'fills': [([(214, 122), (250, 122), (250, 142), (214, 142)], 'left', 6), ([(236, 165), (280, 165), (280, 230), (236, 230)], 'left', 6)],
    'uparm_l': [(50, 160), (106, 160), (106, 202), (50, 202)],
    'uparm_r': [(227, 163), (252, 163), (255, 198), (229, 198), (225, 180)],
    'wrap_l': [(54, 192), (104, 192), (104, 216), (54, 216)],
    'wrap_r': [(226, 150), (266, 150), (266, 178), (226, 178)],
    'legs': [[(88, 238), (148, 238), (148, 274), (88, 274)], [(168, 238), (236, 238), (236, 274), (168, 274)]],
    'pauldrons': [(98, 168, 22, 16, False), (222, 152, 20, 15, True)],
    'sword': {'grip': (246, 156), 'up': (-0.36, -0.933), 'guard_at': 19},
    'shield': (72, 212, 62, 74, 0.78),   # 背面：左腕の外側。少し横に縮めて斜めから見た形
    'hairbox': [(110, 40), (214, 40), (214, 130), (110, 130)],
    'mirror': ([(178, 50), (216, 50), (216, 122), (178, 122)], 158),
}


def axe_mask(o, R):
    Hh, Ww = o.shape[:2]; C = cls(o); h, s, v = P.hsv(o)
    hair = ((h <= 30) | (h >= 345)) & (s > 0.6) & (v > 0.4)          # 赤い髪は斧ではない（hairbox の中だけ。顔の肌はその外）
    m = poly(o, R['head']) & ~(hair & poly(o, R['hairbox']))
    fn, (p0, p1, hw) = R['axe']
    m = m | fn(o, p0, p1, hw)
    if 'shaft_low' in R: m |= poly(o, R['shaft_low'])
    if 'spike' in R: m |= poly(o, R['spike'])
    hand = poly(o, R['hand']) & P.opaque(o)
    # 斧の範囲のうち、体（毛皮・肌・腕の巻き布）は除く：斧の色（灰色の刃・茶色の柄・輪郭）だけ
    body = (C['fur'] & ~((s < 0.12) & (v > 0.5))) | (C['skin'] & (v > 0.74))      # 柄の木は肌と色が近いので、明るい肌だけ体とみなす
    m &= (o[..., 3] > 0) & ~hand & ~(body & ~poly(o, R['head']))
    return m, hand


def close(m, k):
    d = m.copy()
    for _ in range(k): d = d | P.neighbors4(d)
    for _ in range(k): d = d & ~P.neighbors4(~d)
    return d | m


def zones(a, R):
    C = cls(a)
    skin = C['skin']
    op = P.opaque(a)
    chest = (close(poly(a, R['chest']) & skin, 2) & poly(a, R['chest']) & op) if 'chest' in R else np.zeros(a.shape[:2], bool)
    ap = poly(a, R['uparm_l']) | poly(a, R['uparm_r'])
    arms = close(ap & skin, 3) & ap & op & ~C['fur']
    wraps = (poly(a, R['wrap_l']) | poly(a, R['wrap_r'])) & (C['brown'] | C['dark'] & ~skin) & ~skin
    wraps &= P.opaque(a)
    legs = np.zeros(a.shape[:2], bool)
    for pts in R['legs']: legs |= poly(a, pts)
    h_, s_, v_ = P.hsv(a)
    legs &= (C['fur'] | C['navy'] | ((s_ < 0.16) & (v_ > 0.45))) & P.opaque(a) & ~C['red']
    lp = np.zeros(a.shape[:2], bool)
    for pts in R['legs']: lp |= poly(a, pts)
    legs = close(legs, 4) & lp & P.opaque(a) & ~C['red']
    # 中に閉じこめられた暗い線（筋肉の影・巻き布の縫い目）も板金のうち
    def fill_dark(z):
        d = C['dark'] & P.opaque(a)
        for _ in range(2):
            cnt = sum(np.roll(np.roll(z, dy, 0), dx, 1).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            z = z | (d & (cnt >= 3))
        return z
    return fill_dark(chest), fill_dark(arms), fill_dark(wraps), fill_dark(legs)


def heavy(a, R):
    Hh, Ww = a.shape[:2]
    chest, arms, wraps, legs = zones(a, R)
    shape_f = P.blank(Hh, Ww); gray = P.blank(Hh, Ww)
    body = chest | arms | wraps | legs
    v = plate_values(a, body, 0.26, 0.9, k=2)
    v = np.where(legs, plate_values(a, legs, 0.32, 0.84, k=4), v)            # 膝・脛（元は毛皮の巻き布：細かな毛並みを強くならす）
    # 胸当て：首の下に縁取り（金具）、真ん中に縦の稜線（明るく）
    trim = chest & ~np.roll(chest, 1, 0); trim = trim | (np.roll(trim, 1, 0) & chest)
    cx = None
    if chest.any():
        ys, xs = np.where(chest); cx = int(round(np.median(xs)))
        ridge = chest & (np.abs(np.mgrid[0:Hh, 0:Ww][1] - cx) < 0.6) & ~trim
        v = np.where(ridge, np.clip(v + 0.22, 0, 1), v)
    # 前腕・脛：縁に縁取りの帯（板の端）
    cuffs = (wraps | legs) & ~np.roll(wraps | legs, 1, 0)
    paint_plate(shape_f, gray, body, H.quant(np.clip(v, 0, 1)), trim=(trim | cuffs) & body)
    outline_ring(shape_f, body, P.opaque(a))
    # 肩当て（毛皮の上）
    pm_all = np.zeros((Hh, Ww), bool)
    for (cx_, cy_, rx, ry, fl) in R['pauldrons']:
        m, vv, lines, rim = dome(Hh, Ww, cx_, cy_, rx, ry, 2, fl)
        sf = P.blank(Hh, Ww); gr = P.blank(Hh, Ww)
        paint_plate(sf, gr, m, vv, fixed_lines=lines, rim=rim)
        outline_ring(sf, m, None)
        shape_f = P.over(shape_f, sf); gray[m] = 0; gray = P.over(gray, gr); pm_all |= m
    return shape_f, gray, body | pm_all


def travel(a, R):
    chest, arms, wraps, legs = zones(a, R)
    m = chest | arms
    t, v = shirt(a, m)
    # 袖口：上腕の下の端に 1 ドットの縫い目（暗い麻）
    cuff = arms & ~np.roll(arms, -1, 0)
    H.ramp_fill(t, cuff, np.full(cuff.shape, 0.25), SHIRT)
    g, _ = P.to_gray(t, m, out_lo=0.16, out_hi=0.95)
    return t, smooth_gray(g, m), m


def smooth_gray(g, m):
    v = smooth(g[..., 0].astype(float), m, 1); o = g.copy(); o[m, 0] = o[m, 1] = o[m, 2] = np.round(v[m]).astype(np.int32); return o


def build(o, R):
    m, hand = axe_mask(o, R)
    p = unaxe(o, m, hand, R['fills'], R.get('mirror'))
    t, light_g, shirt_m = travel(p, R)
    shape_f, heavy_g, _ = heavy(p, R)
    parts = {'base_plain': t, 'armor_shape_f': shape_f, 'armor_heavy_t': heavy_g, 'armor_light_t': light_g,
             'weapon_axe': H.take(o, m & P.opaque(o)), 'hand': H.take(t, hand & P.opaque(t))}
    Hh, Ww = o.shape[:2]; sw = R['sword']
    parts['weapon_sword'] = GR.sword(Hh, Ww, sw['grip'], sw['up'], blade_len=108, blade_w=13, tip=20, guard_w=34, guard_at=sw['guard_at'], pommel_at=-(sw['guard_at'] + 4), pommel_r=5)
    parts['shield_t'], parts['shield_f'], _ = GR.heater(Hh, Ww, *R['shield'], rim_ramp=GR.BRONZE)
    return parts, p, m


if __name__ == '__main__':
    fo = P.load(os.path.join(ROOT, FRONT_SRC)); bo = P.load(os.path.join(ROOT, BACK_SRC))
    H.set_texture(P.load(os.path.join(ROOT, 'assets/characters/party-directions-v3/sprites/ord/front.png')), (120, 120, 190, 180))   # オルドの鎧の板金のムラ
    FH, FW = fo.shape[:2]; BH, BW = bo.shape[:2]
    pf, fp, mf = build(fo, FRONT); pb, bp, mb = build(bo, BACK)
    if CHECK:
        os.makedirs(CHECK, exist_ok=True)
        for n, arr in (('fp', fp), ('bp', bp), ('tf', pf['base_plain']), ('tb', pb['base_plain'])): P.save(arr, os.path.join(CHECK, 'gald_' + n + '.png'))
        for n, mm, oo in (('axe_f', mf, fo), ('axe_b', mb, bo)):
            v = oo.copy(); v[~mm] = (v[~mm] * [0.35, 0.35, 0.35, 1]).astype(np.int32); v[mm, 0] = 255; P.save(v, os.path.join(CHECK, 'gald_mask_' + n + '.png'))
    recF = H.save_parts(os.path.join(OUT, 'menu'), pf, {})
    recB = H.save_parts(os.path.join(OUT, 'back'), pb, {})
    def box(arr):
        bb = P.bbox(P.opaque(arr)); return {'x0': bb[0], 'y0': bb[1], 'x1': bb[2], 'y1': bb[3]}
    def shiftbox(b, dx, dy): return {'x0': b['x0'] + dx, 'y0': b['y0'] + dy, 'x1': b['x1'] + dx, 'y1': b['y1'] + dy}
    def shiftparts(rec, dx, dy): return {k: dict(v, x=v['x'] + dx, y=v['y'] + dy) for k, v in rec.items()}
    def frame(rec, w, h, m=2):
        x0 = min([0] + [r['x'] for r in rec.values()]) - m; x1 = max([w] + [r['x'] + r['w'] for r in rec.values()]) + m
        y0 = min([0] + [r['y'] for r in rec.values()]) - m; half = max(w / 2 - x0, x1 - w / 2)
        return {'x0': int(np.floor(w / 2 - half)), 'y0': int(y0), 'x1': int(np.ceil(w / 2 + half)), 'y1': int(h)}
    tf = pf['base_plain']; tb = pb['base_plain']
    actor = {
        'menuBase': 'menu',
        # ガルドの重ね方：重鎧は主人公と同じ名前の部品（GLOBAL）。軽装はシャツの色だけ変える。斧は柄の上に拳を描き直す
        'materials': {'armor_light': {'z': 10, 'layers': [{'part': 'armor_light_t', 'tint': 'main'}]},
                      # v9.8.1 剣は拳の下に柄を通す（主人公の剣と違い、拳を後に描く）。盾は面を品の色（灰色の品は鉄の色）
                      'weapon_sword': {'z': 40, 'hand': True, 'layers': [{'part': 'weapon_sword'}]},
                      'shield': {'z': 30, 'layers': [{'part': 'shield_t', 'tint': 'main', 'grayRef': 'iron'}, {'part': 'shield_f'}]}},
        'views': {
            'menu': {'src': FRONT_SRC, 'w': FW, 'h': FH, 'dir': 'front', 'pivot': [128, 274], 'body': box(tf), 'frame': frame(recF, FW, FH),
                     'grip': {'x': 37, 'y': 137, 'order': '斧・剣：柄の上に拳を描き直す'}, 'offhand': {'x': 186, 'y': 190, 'order': '盾：左の拳と前腕の上（体・鎧の後に描く）'}, 'parts': recF},
            'front': {'src': FRONT_BATTLE_SRC, 'w': 320, 'h': 320, 'dir': 'front', 'pivot': [160, 304], 'body': shiftbox(box(tf), FDX, FDY),
                      'grip': {'x': 37 + FDX, 'y': 137 + FDY, 'order': '斧・剣：柄の上に拳を描き直す'}, 'offhand': {'x': 186 + FDX, 'y': 190 + FDY, 'order': '盾：左の拳と前腕の上（体・鎧の後に描く）'}, 'from': 'menu', 'parts': shiftparts(recF, FDX, FDY)},
            'back': {'src': BACK_SRC, 'w': BW, 'h': BH, 'dir': 'back', 'pivot': [160, 304], 'body': box(tb), 'frame': frame(recB, BW, BH),
                     'grip': {'x': 246, 'y': 156, 'order': '斧・剣：柄の上に拳を描き直す'}, 'offhand': {'x': 72, 'y': 212, 'order': '盾：左腕の外側（体・鎧の後に描く）'}, 'parts': recB},
        }}
    json.dump(actor, open(os.path.join(OUT, 'actor.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    import manifest
    manifest.write()
    print('gald menu', len(recF), 'back', len(recB))
