# v9.7 装備の外見（ドット絵の差分）：主人公の「メニュー正面（戦士の立ち絵 jobs/warrior.png）」と「戦闘の背面（party-directions-v3 の hero/back.png）」
#   元の絵は読むだけ。作った部品は assets/characters/equip-pixels/hero/<向き>/ に、主人公の対応表は hero/actor.json に書く
#   python3 tools/appear/pixel/build_hero.py [確かめの絵の出力フォルダ]（部品と actor.json を書き、manifest.py で js/data/equip-pixels.js をまとめ直す）
#
#   部品（どれも元の絵と同じ座標。切り出して x, y を記録）
#     base_plain  素の絵：剣と盾を外し、手と体を描き直したもの（装備がないとき・頭に何もかぶらないとき）
#     base_helm   兜用の素の絵：兜からはみ出る髪を消したもの
#     base_hat    帽子用の素の絵：帽子の上へ突き抜ける髪を消したもの
#     armor_*     胴の差分（軽装＝革・重鎧＝元の板金・ローブ）。色を変える部分は灰色（_t）で、変えない部分（縁・金具・肌）はそのまま（_f）
#     head_*      兜・帽子
#     weapon_*    武器（剣は元の絵から切り離したもの。杖は同じ画風の魔法使いの絵から。v9.8.1 斧は gear.py で描いたもの）
#     shield      盾（元の絵から切り離したもの）
#     hand        武器を握る手（長柄を持つとき、柄の上に描き直す）の範囲
import os
import sys
import json
import hashlib
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import pxlib as P

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels', 'hero')
CHECK = sys.argv[1] if len(sys.argv) > 1 else None
OUTLINE = (30, 16, 16)


def src(rel):
    return P.load(os.path.join(ROOT, rel))


# ============================================================
# メニュー正面：jobs/warrior.png（130 × 200）
# ============================================================
FRONT_SRC = 'assets/characters/jobs/warrior.png'
FA = 63          # 体の左右の中心（足・肩当て・スカーフから）
SHIELD_F = [(82, 92), (88, 86), (113, 85), (122, 94), (128, 107), (128, 136), (121, 150), (111, 164), (100, 161), (90, 151), (84, 141), (81, 121), (81, 97)]


def blade_cut_front(y):
    """剣の刃の右の輪郭（この x より左は刃）"""
    return 30.5 if y >= 80 else 17.5 + (y - 30) * 0.25


def front_plain(o):
    a = o.copy(); H, W = a.shape[:2]; was = P.opaque(a)
    # 1) 刃（y 14〜92）：刃の右の輪郭より左を消す（髪・肩当てとは離れている）
    for y in range(12, 93):
        xc = int(np.floor(blade_cut_front(y)))
        a[y, :xc + 1] = 0
    # 2) 鍔（つば）：拳の上の金色の横木。拳の上の線（y 107）より上、x 0〜30 を消す。右の端（x 30〜37）は奥の腕（暗い色）で埋める
    a[88:107, 0:31] = 0
    a[100:112, 0:13] = 0
    for y in range(90, 101):
        for x in range(30, 38):
            a[y, x] = o[y, x + 8]
    # 3) 柄頭（つかがしら：拳の下の金色）：左の赤いマントで埋める
    for y in range(128, 139):
        for x in range(21, 33):
            h, s, v = P.hsv(o[y:y + 1, x:x + 1])
            if (25 <= h[0, 0] <= 65 and s[0, 0] > 0.45 and v[0, 0] > 0.45) or (x in range(22, 32) and y in range(129, 138)):
                a[y, x] = o[y, x - 9]
    P.outline_edges(a, was, OUTLINE)
    # 4) 盾：体の左右の中心で、左半分（剣を外したあと）を写して埋める。写した側は影になるので少し暗く
    m = P.poly_mask(H, W, SHIELD_F)
    base = a.copy()
    for y in range(H):
        for x in range(W):
            if not m[y, x]: continue
            sx = 2 * FA - x
            if sx < 0 or sx >= W or base[y, sx, 3] < 40:
                a[y, x] = 0; continue
            p = base[y, sx].copy()
            if P.lum(p[None, :])[0] > 45: p[:3] = np.round(p[:3] * 0.86)
            a[y, x] = p
    P.outline_edges(a, was, OUTLINE)
    # 5) 仕上げ：消し残りのドット・閉じこめられた穴・拳の上の角（四角く見えないように丸める）
    P.drop_specks(a, 8); P.fill_holes(a, 60)
    P.round_top(a, 13, 30, 107, OUTLINE); P.round_top(a, 2 * FA - 30, 2 * FA - 13, 107, OUTLINE)
    # 上腕の外側の縁が縦一直線の箱に見えないよう、肩当ての下から少しすぼめる
    for y in range(88, 102):
        k = 2 if y < 97 else 1
        for i in range(k):
            a[y, 29 + i] = 0; a[y, 2 * FA - 29 - i] = 0
    P.outline_edges(a, was, OUTLINE)
    return a


# ============================================================
# 戦闘の背面：party-directions-v3/sprites/hero/back.png（320 × 320、足もとの基準点 [160, 304]）
# ============================================================
BACK_SRC = 'assets/characters/party-directions-v3/sprites/hero/back.png'
FRONT_BATTLE_SRC = 'assets/characters/party-directions-v3/sprites/hero/front.png'   # 戦闘の正面（勝利の振り向き）。戦士の立ち絵と同じ絵を (95, 104) に置いたもの
BA = 156.5       # 体の左右の中心（足から）
SHIELD_B = [(118, 180), (106, 183), (97, 193), (90, 207), (88, 225), (89, 242), (95, 255), (105, 263), (116, 266), (123, 260), (125, 246), (125, 230), (127, 205), (125, 190)]
BLADE_B = [(203, 108), (246, 108), (246, 215), (229, 215), (216, 208), (211, 203), (203, 201)]


def back_plain(o):
    a = o.copy(); H, W = a.shape[:2]; was = P.opaque(a)
    # 1) 刃と、拳より右に出た鍔：消す
    a[P.poly_mask(H, W, BLADE_B)] = 0
    # 2) 拳の上にかかる鍔（金色）：拳の手袋の色（少し下の行）で埋める
    for y in range(193, 210):
        for x in range(193, 217):
            if a[y, x, 3] < 40: continue
            h, s, v = P.hsv(o[y:y + 1, x:x + 1])
            if 20 <= h[0, 0] <= 60 and s[0, 0] > 0.4 and v[0, 0] > 0.35:
                yy = y + 5
                while yy < 226 and P.hsv(o[yy:yy + 1, x:x + 1])[1][0, 0] > 0.4 and 20 <= P.hsv(o[yy:yy + 1, x:x + 1])[0][0, 0] <= 60: yy += 1
                a[y, x] = o[yy, x] if o[yy, x, 3] > 40 else 0
    # 3) 柄頭（拳の下の金色）：左の赤いマントで埋める
    for y in range(222, 235):
        for x in range(202, 216):
            if a[y, x, 3] < 40: continue
            h, s, v = P.hsv(o[y:y + 1, x:x + 1])
            if (20 <= h[0, 0] <= 60 and s[0, 0] > 0.35) or (204 <= x <= 213 and 224 <= y <= 232):
                a[y, x] = o[y, x - 13]
    a[205:216, 215:232] = 0                  # 拳の右に残る鍔の端
    for y in range(196, 203):                # 拳の上に残る柄（白い筋）→ 影の色
        for x in range(197, 202):
            if a[y, x, 3] > 40 and P.lum(a[y, x][None, :])[0] > 70: a[y, x, :3] = OUTLINE
    P.outline_edges(a, was, OUTLINE)
    # 4) 盾：右半分（剣を外したあと）を写して埋める。写した側は少し暗く
    m = P.poly_mask(H, W, SHIELD_B)
    base = a.copy()
    for y in range(H):
        for x in range(W):
            if not m[y, x]: continue
            sx = int(round(2 * BA - x))
            if sx < 0 or sx >= W or base[y, sx, 3] < 40:
                a[y, x] = 0; continue
            p = base[y, sx].copy()
            hh, ss, vv = P.hsv(p[None, None, :])
            if x < 125 - (y - 222) * 9 / 42 and (hh[0, 0] < 18 or hh[0, 0] > 340) and ss[0, 0] > 0.5 and y > 222:   # 右へなびくマントの端は、左には写さない（盾の奥にマントはない）
                a[y, x] = 0; continue
            if P.lum(p[None, :])[0] > 45: p[:3] = np.round(p[:3] * 0.88)
            a[y, x] = p
    P.outline_edges(a, was, (70, 12, 14), dark_lum=40)
    P.drop_specks(a, 8); P.fill_holes(a, 60)
    return a


# ============================================================
# 色の見分け
# ============================================================
def is_gold(a):
    h, s, v = P.hsv(a); return (h >= 26) & (h <= 64) & (s > 0.38) & (v > 0.42)


def is_red(a):
    h, s, v = P.hsv(a); return ((h < 18) | (h > 335)) & (s > 0.45) & (v > 0.22)


def plate_mask(a, region):
    """板金（銀色）のドット：彩度が低く、輪郭ほど暗くない"""
    h, s, v = P.hsv(a); L = P.lum(a)
    return region & P.opaque(a) & (s < 0.26) & (L > 52)


def rect(H, W, x0, y0, x1, y1):
    m = np.zeros((H, W), bool); m[max(0, y0):y1, max(0, x0):x1] = True; return m


def take(o, m):
    """o の m の部分だけの層"""
    L = P.blank(*o.shape[:2]); L[m] = o[m]; return L


def split_tint(a, tint_m, fixed_m, **gray):
    """色を変える部分（灰色の層）と、変えない部分（そのままの層）に分ける"""
    g, rng = P.to_gray(a, tint_m, **gray)
    return g, take(a, fixed_m & ~tint_m)


# ============================================================
# 描いて作る部品（兜・とんがり帽子・杖・槍）：光は左上から。明るさは段（5〜6 段）にそろえてドット絵らしく
# ============================================================
LIGHT = np.array([-0.55, -0.68, 0.48]); LIGHT = LIGHT / np.linalg.norm(LIGHT)
STEPS = np.array([0.06, 0.24, 0.42, 0.6, 0.78, 0.95])


def quant(v):
    v = np.clip(v, 0, 1); i = np.abs(v[..., None] - STEPS).argmin(-1); return STEPS[i]


TEX = None   # 元の絵の板金の細かなムラ（明るさの高い周波数の成分）。描いた部品にのせて、元の絵と同じ「描き込み」の手ざわりにする


def set_texture(a, box):
    global TEX
    x0, y0, x1, y1 = box; L = P.lum(a[y0:y1, x0:x1]).astype(float)
    k = np.ones((3, 3)) / 9.0; pad = np.pad(L, 1, mode='edge')
    blur = sum(pad[i:i + L.shape[0], j:j + L.shape[1]] * k[i, j] for i in range(3) for j in range(3))
    TEX = np.clip((L - blur) / 255.0, -0.18, 0.18)


def texturize(v, amount=0.9, ox=0, oy=0):
    if TEX is None: return v
    H, W = v.shape; th, tw = TEX.shape
    yy, xx = np.mgrid[0:H, 0:W]
    return v + amount * TEX[(yy + oy) % th, (xx + ox) % tw]


def gray_layer(mask, v):
    g = P.blank(*mask.shape); q = np.round(quant(v) * 255).astype(np.int32)
    g[mask, 0] = g[mask, 1] = g[mask, 2] = q[mask]; g[mask, 3] = 255; return g


def ring_outline(mask):
    return P.neighbors4(mask) & ~mask


def paint_fixed(layer, mask, col):
    r, g, b = col if isinstance(col, tuple) else P.hexrgb(col)
    layer[mask] = (r, g, b, 255)


def gold_paint(layer, mask, v, ramp):
    cols = np.array([P.hexrgb(c) for c in ramp]); i = np.clip(np.round(v * (len(cols) - 1)).astype(int), 0, len(cols) - 1)
    for k in range(len(cols)):
        m = mask & (i == k); layer[m] = (*cols[k], 255)


def helm(H, W, cx, top, brow, rx, cheek, back=False, flare=0):
    """丸い兜。front：額の帯の下に顔の開き・頬当て。back：後ろから（首の後ろの垂れ）"""
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    ry = brow - top
    nx = (xx - cx) / rx; ny = (yy - brow) / ry
    band_bot = brow + 3.0 * np.clip(nx, -1, 1) ** 2
    dome = (nx ** 2 + ny ** 2 <= 1.0) & (yy <= band_bot)
    band = dome & (yy > band_bot - 6)
    m = dome.copy()
    if not back:
        # 頬当て：額の帯から下へ、顔の横（髪の横）を覆う
        lx0, lx1, rx0, rx1, yb = cheek
        L = P.poly_mask(H, W, [(lx0, brow - 2), (lx1, brow - 2), (lx1, brow + 10), (lx1 - 2, yb - 4), (lx1 - 6, yb), (lx0 + 2, yb - 1), (lx0, yb - 10)])
        R = P.poly_mask(H, W, [(rx1, brow - 2), (rx0, brow - 2), (rx0, brow + 10), (rx0 + 2, yb - 4), (rx0 + 6, yb), (rx1 - 2, yb - 1), (rx1, yb - 10)])
        cheeks = L | R
    else:
        # 後ろの首を守る垂れ：帯の下に、少し広がって
        cheeks = np.zeros((H, W), bool)
        for y in range(int(brow - 2), int(brow + flare)):
            t = (y - brow + 2) / max(1, flare); half = rx * (0.96 + 0.08 * t)
            cheeks[y, int(cx - half):int(cx + half) + 1] = True
        cheeks &= ~dome
    m |= cheeks
    nz = np.sqrt(np.clip(1 - nx ** 2 - np.clip(ny, -1, 0) ** 2, 0.03, 1))
    d = nx * LIGHT[0] + np.clip(ny, -1, 0) * LIGHT[1] + nz * LIGHT[2]
    # 段で塗る（なめらかな丸ではなく、ドット絵の金属らしく：小さな光・明るい面・中間・影・縁の暗さ）
    v = np.select([d > 0.93, d > 0.62, d > 0.3, d > 0.0], [0.97, 0.7, 0.5, 0.32], 0.18)
    # 頬当て・垂れ：上が明るく、外側と下が暗い。右（光の反対）は 1 段暗い
    vc = np.where(xx < cx, 0.5, 0.32) - np.where(yy > brow + 14, 0.14, 0.0)
    v = np.where(cheeks & ~dome, vc, v)
    # 頭頂から額への筋（中央の稜線）
    ridge = dome & ~band & (np.abs(xx - cx) < 1.01) & (yy > top + 2)
    shade = dome & ~band & (xx > cx + 0.5) & (xx < cx + 1.6) & (yy > top + 2)
    v = np.where(ridge, np.clip(v + 0.2, 0, 1), v); v = np.where(shade, np.clip(v - 0.22, 0, 1), v)
    # 縁の内側は 1 段暗く（丸みが出る）
    edge_in = m & P.neighbors4(~m)
    v = np.where(edge_in, np.clip(v - 0.18, 0, 1), v)
    v = np.where(edge_in, v, texturize(v, 1.0, 3, 5))
    g = gray_layer(m & ~band, v)
    f = P.blank(H, W)
    # 額の帯（金具）：金色。鋲を並べる
    vb = np.clip(0.5 - 0.45 * nx + 0.25 * ((yy - (band_bot - 6)) < 2), 0, 1)
    gold_paint(f, band, vb, GOLD)
    rivet = band & (np.abs(((xx - cx) % 8) - 4) < 0.6) & (np.abs(yy - (band_bot - 3)) < 0.6)
    paint_fixed(f, rivet, GOLD[0])
    ring = ring_outline(m)
    paint_fixed(f, ring, OUT_METAL)
    paint_fixed(f, (edge_in & band), GOLD[0])
    # 帯の下の縁と、顔の開きの縁
    under = band & ~np.roll(band, -1, axis=0)
    paint_fixed(f, under, GOLD[0])
    return g, f, m | ring


def witch_hat(H, W, cx, by, rx, ry, d, buckle):
    """とんがり帽子：つば（楕円）＋ 先が横に折れた円錐。d＝先の向き（+1 右・-1 左）"""
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    brim = ((xx - cx) / rx) ** 2 + ((yy - by) / ry) ** 2 <= 1.0
    # 円錐：3 次の曲線に沿って、太さが細くなる円を並べる
    P0 = np.array([cx, by - 2.0]); P1 = np.array([cx + 1.0 * d, by - 34.0]); P2 = np.array([cx + 5.0 * d, by - 56.0]); P3 = np.array([cx + 24.0 * d, by - 52.0])
    crown = np.zeros((H, W), bool); lat = np.full((H, W), 9.0); along = np.zeros((H, W))
    for t in np.linspace(0, 1, 220):
        c = (1 - t) ** 3 * P0 + 3 * (1 - t) ** 2 * t * P1 + 3 * (1 - t) * t ** 2 * P2 + t ** 3 * P3
        dc = 3 * (1 - t) ** 2 * (P1 - P0) + 6 * (1 - t) * t * (P2 - P1) + 3 * t ** 2 * (P3 - P2); dc = dc / (np.linalg.norm(dc) + 1e-9)
        nrm = np.array([-dc[1], dc[0]])
        r = 25.0 * (1 - t) ** 1.05 + 1.2
        x0, x1 = int(c[0] - r - 1), int(c[0] + r + 2); y0, y1 = int(c[1] - r - 1), int(c[1] + r + 2)
        for y in range(max(0, y0), min(H, y1)):
            for x in range(max(0, x0), min(W, x1)):
                dx, dy = x - c[0], y - c[1]
                if dx * dx + dy * dy <= r * r:
                    u = (dx * nrm[0] + dy * nrm[1]) / r
                    if not crown[y, x] or abs(u) < abs(lat[y, x]): lat[y, x] = u; along[y, x] = t
                    crown[y, x] = True
    crown &= yy <= by + 1
    # 明るさ：左が明るい（横方向の位置で決める。曲がった先でも左上が明るい）。先へ行くほど少し暗い
    vcrown = np.clip(0.66 - 0.5 * np.clip((xx - (cx + 18 * d * along ** 2)) / 25.0, -1, 1) - 0.12 * along, 0.06, 0.95)
    fold = crown & (np.abs(along - 0.62) < 0.012)
    vcrown = np.where(fold, vcrown - 0.25, vcrown)
    nb = (xx - cx) / rx; vb = np.clip(0.55 - 0.3 * nb - 0.35 * np.clip((yy - by) / ry, 0, 1) ** 2, 0.06, 0.95)
    front = brim & (yy >= by)
    lip = brim & ~np.roll(brim, -1, axis=0) | (brim & ~np.roll(brim, -2, axis=0) & (yy >= by))
    vb = np.where(lip, vb - 0.28, vb)
    # 重ね順：つばの奥 → 円錐 → つばの手前
    m = brim | crown
    v = np.where(brim & ~front, vb, 0.0); v = np.where(crown, vcrown, v); v = np.where(front, vb, v)
    edge_in = m & P.neighbors4(~m); v = np.where(edge_in, v - 0.15, v)
    v = np.where(edge_in, v, texturize(v, 0.8, 7, 2))
    # 帯（つばのすぐ上の円錐）
    band = crown & ~front & (yy > by - 9) & (yy <= by - 2) & (((xx - cx) / (rx * 0.6)) ** 2 + ((yy - (by - 5)) / ry) ** 2 <= 2.2)
    g = gray_layer(m & ~band, v)
    f = P.blank(H, W)
    vband = np.clip(0.6 - 0.5 * (xx - cx) / 25.0, 0, 1)
    gold_paint(f, band, vband, GOLD)
    if buckle:
        bk = (np.abs(xx - cx) <= 3) & (yy >= by - 9) & (yy <= by - 2) & band
        bki = (np.abs(xx - cx) <= 1) & (yy >= by - 7) & (yy <= by - 4)
        paint_fixed(f, bk, GOLD[3]); paint_fixed(f, bk & ~P.neighbors4(~bk) & ~bki, GOLD[2]); paint_fixed(f, bki & band, GOLD[0])
    paint_fixed(f, ring_outline(m), OUT_CLOTH)
    # 円錐とつばの境目に線
    seam = crown & ~front & P.neighbors4(front)
    paint_fixed(f, seam, OUT_CLOTH)
    return g, f, m | ring_outline(m), brim, crown


def pole(H, W, cx, y0, y1, wood):
    """杖・槍の柄：幅 4、左が明るい木"""
    f = P.blank(H, W)
    for y in range(max(0, y0), min(H, y1)):
        cols = [wood[3], wood[2], wood[1], wood[0]]
        for i, c in enumerate(cols):
            f[y, cx - 2 + i] = (*P.hexrgb(c), 255)
        if (y - y0) % 23 == 11: f[y, cx - 1] = (*P.hexrgb(wood[1]), 255)   # 木目
    m = f[..., 3] > 0; paint_fixed(f, ring_outline(m), OUT_WOOD)
    return f


def staff_head(H, W, cx, cy, r):
    """杖の頭：金の輪に支えられた玉（玉は色を変える＝灰色の層）"""
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    d = np.hypot(xx - cx, yy - cy)
    orb = d <= r - 2.2
    ringm = (d <= r + 0.5) & ~orb
    # 下の 2 本の爪（輪を柄につなぐ）
    claws = (((np.abs(xx - (cx - 3)) < 1.1) | (np.abs(xx - (cx + 2)) < 1.1)) & (yy > cy + r - 1) & (yy < cy + r + 6)) | ((np.abs(xx - cx) < 3.1) & (yy >= cy + r + 4) & (yy <= cy + r + 7))
    top = (np.abs(xx - cx) < 1.1) & (yy < cy - r + 1) & (yy > cy - r - 4)
    gold_m = ringm | claws | top
    f = P.blank(H, W)
    vg = np.clip(0.6 - 0.45 * (xx - cx) / r - 0.3 * (yy - cy) / r, 0, 1)
    gold_paint(f, gold_m, vg, GOLD)
    # 玉：左上に光、中心が明るい（灰色の層）
    v = np.clip(0.9 - 0.75 * np.hypot(xx - (cx - r * 0.3), yy - (cy - r * 0.3)) / (r * 1.25), 0.05, 1)
    v = np.where(np.hypot(xx - (cx - r * 0.35), yy - (cy - r * 0.38)) < 1.6, 1.0, v)
    g = gray_layer(orb, v)
    m = gold_m | orb; paint_fixed(f, ring_outline(m), OUT_METAL)
    return g, f


def spear_head(H, W, cx, ytip, length, half):
    """槍の穂先：木の葉形の刃（真ん中に稜線）＋ 金の口金"""
    f = P.blank(H, W)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    t = (yy - ytip) / length
    w = half * np.where(t < 0.62, np.sqrt(np.clip(t / 0.62, 0, 1)), np.clip((1 - t) / 0.38, 0, 1) ** 0.8)
    blade = (t >= 0) & (t <= 1) & (np.abs(xx - cx + 0.5) <= w)
    v = np.where(xx < cx, 0.85 - 0.25 * t, 0.42 - 0.12 * t)
    v = np.where(np.abs(xx - cx + 0.5) < 0.6, 0.98, v)
    cols = np.array([P.hexrgb(c) for c in PLATE_REF]); i = np.clip(np.round(quant(v) * 4).astype(int), 0, 4)
    for k in range(5):
        mk = blade & (i == k); f[mk] = (*cols[k], 255)
    collar = (np.abs(xx - cx + 0.5) <= 3) & (yy >= ytip + length) & (yy < ytip + length + 4)
    gold_paint(f, collar, np.clip(0.7 - 0.4 * (xx - cx) / 3, 0, 1), GOLD)
    m = blade | collar; paint_fixed(f, ring_outline(m), OUT_METAL)
    return f


# ============================================================
# ローブ
# ============================================================
MAGE_SRC = 'assets/characters/jobs/mage.png'   # 同じ画風の魔法使いの立ち絵（布のしわ・金の縁取り・裾の模様を借りる）


def mage_cloth_split(px):
    """魔法使いの絵のドット → 'tint'（赤い布＝品の色に変える）・'fixed'（金の縁・暗い内側・輪郭）・None（使わない：肌・髪）"""
    h, s, v = P.hsv(px[None, None, :]); h, s, v = h[0, 0], s[0, 0], v[0, 0]
    if px[3] < 40: return None
    if (h < 22 or h > 330) and s > 0.38 and v > 0.2: return 'tint'
    if 26 <= h <= 64 and s > 0.38 and v > 0.42: return 'fixed'
    if v < 0.3: return 'fixed'
    if 200 <= h <= 330: return 'fixed'
    if 15 <= h <= 40 and s < 0.55 and v > 0.6: return None   # 肌
    return 'fixed'


def robe_front(fp, mage, gold_m, plate_m):
    H, W = fp.shape[:2]
    tint = P.blank(H, W); fixed = P.blank(H, W)
    C = 61   # ローブの中心（帯の金具とスカーフの間）
    # (a) 胴：魔法使いの襟〜帯（y 104〜131）を 2 ドット左・11 ドット上へ
    for y in range(104, 132):
        for x in range(30, 96):
            k = mage_cloth_split(mage[y, x])
            if not k: continue
            ty, tx = y - 11, x - 2
            if 0 <= ty < H and 0 <= tx < W: (tint if k == 'tint' else fixed)[ty, tx] = mage[y, x]
    # (b) 裾：魔法使いの裾の左半分（x 28〜62、y 131〜194。杖は含まない）を、下へ行くほど横に広げ、左右に写す（前の合わせ目が中央）
    for ty in range(120, 186):
        sy = ty + 11
        if sy > 194: break
        f = 1.0 + 0.42 * ((ty - 120) / 65.0) ** 1.2
        for u in range(0, 48):
            sxl = int(round(62 - u / f))
            if sxl < 28: continue
            px = mage[sy, sxl]; k = mage_cloth_split(px)
            if not k: continue
            for tx, dark in ((C - u, 1.0), (C + u + 1, 0.86)):
                if 0 <= tx < W:
                    q = px.copy(); q[:3] = np.round(q[:3] * dark) if k == 'tint' else q[:3]
                    (tint if k == 'tint' else fixed)[ty, tx] = q
    # (c) 袖・肩：主人公の腕と肩当ての板金（帯より上・体の外側）を布にする
    sleeves = plate_m & (np.mgrid[0:H, 0:W][0] < 122) & ((np.mgrid[0:H, 0:W][1] < 44) | (np.mgrid[0:H, 0:W][1] > 80))
    tint[sleeves] = fp[sleeves]
    # (d) 足：裾の下に見える板金の脛当て・靴 → 茶色の革の靴（色は変えない）
    yy = np.mgrid[0:H, 0:W][0]
    boots = plate_m & (yy >= 176)
    L = P.lum(fp); cols = np.array([P.hexrgb(c) for c in ['#1c120c', '#3a2416', '#5a3a22', '#7a5232', '#9a6c44']])
    bi = np.clip(((L - 60) / 170 * 4).round().astype(int), 0, 4)
    for k in range(5):
        mk = boots & (bi == k); fixed[mk] = (*cols[k], 255)
    # スカーフ（首の赤い布）と拳は、ローブより手前：その場所にはローブを描かない
    keep = (is_red(fp) & (yy < 100)) | rect(H, W, 12, 104, 32, 129) | rect(H, W, 2 * FA - 32, 104, 2 * FA - 12, 129)
    tint[keep] = 0; fixed[keep] = 0
    fixed[tint[..., 3] > 0] = 0
    gray, _ = P.to_gray(tint, tint[..., 3] > 0, out_lo=0.1, out_hi=0.92)
    # 外側の輪郭
    m = (gray[..., 3] > 0) | (fixed[..., 3] > 0)
    ring = ring_outline(m) & ~P.opaque(fp)
    paint_fixed(fixed, ring, OUT_CLOTH)
    return gray, fixed


CAPE_CUT = 244   # ローブのとき、背中の赤いマントをここで短くする（裾を上げて、ローブの長い裾と袖を見せる）


def robe_back(bp, plate_m, cape_m, keep_m):   # plate_m＝鎧の範囲（板金・縁取り・継ぎ目）
    """背面のローブ：
       1 赤いマントを短くする（腰の下 CAPE_CUT で切り、波打つ裾を描き直す）＝ erase の層で元のマントの下を消す
       2 くるぶしまでの長い裾（品の色。縦のしわ・金の縁取り）
       3 釣り鐘形の広い袖（肩から手首へ広がる。拳は袖の外）
       → 帽子・杖がなくても、袖と裾で重鎧（板金の腕・脛当て・長いマント）と見分けられる"""
    H, W = bp.shape[:2]; yy, xx = np.mgrid[0:H, 0:W].astype(float)
    erase = P.blank(H, W); g = P.blank(H, W); fixed = P.blank(H, W)
    # 1) マントの下を消す
    low = cape_m & (yy > CAPE_CUT)
    halo = low.copy()
    for _ in range(2): halo = halo | P.neighbors4(halo)
    low = low | (halo & (bp[..., 3] > 0) & (bp[..., 3] < 250) & (yy > CAPE_CUT))   # マントの縁のにじみ（半透明）も消す
    erase[low] = (255, 255, 255, 255)
    # 新しい裾：切り口の下に、列ごとに 3〜7 ドットの波。色は元のマントの裾の近く（暗い赤）を写す
    cols = np.where(cape_m[CAPE_CUT])[0]
    for x in cols:
        ys = np.where(cape_m[:, x])[0]; yb = ys.max()
        d = int(round(5 + 2.2 * np.sin(x / 6.5) + 1.2 * np.sin(x / 2.7)))
        for k in range(1, d + 1):   # 切り口の少し上のマントの赤を、裾へ向けて少しずつ暗く
            sy = CAPE_CUT - 1 - (k % 3)
            c = bp[sy, x] if cape_m[sy, x] else bp[CAPE_CUT, x]
            q = c.copy(); q[:3] = np.round(c[:3] * (1 - 0.05 * k)); q[3] = 255; fixed[CAPE_CUT + k, x] = q
        fixed[CAPE_CUT + d + 1, x] = (70, 12, 14, 255)
    hem_cape = fixed[..., 3] > 0
    # 2) 長い裾：腰（マントの下）から、くるぶし（hem）まで。下へ広がる。縦のしわ、左が明るい
    top, hem = 232, 296
    t = np.clip((yy - top) / (hem - top), 0, 1)
    half = 33 + 17 * t ** 1.1
    wave = 1.5 * np.sin((xx - BA) / 5.0)
    skirt = (yy >= top) & (yy <= hem + wave) & (np.abs(xx - BA) <= half)
    v = 0.46 - 0.22 * (xx - BA) / 50.0 + 0.13 * np.sin((xx - BA) / 5.6 + 0.8 * t) - 0.06 * t
    v = texturize(v, 0.4, 1, 9)
    trim = skirt & (yy > hem - 3 + wave)
    # 3) 袖：腕の形（肩・上腕・前腕の板金）をそのまま布にし、前腕の下へ釣り鐘形に垂らす（外側ほど長い）。拳は袖の外
    arms = plate_m & (yy >= 178) & (yy < 232) & ((xx < BA - 18) | (xx > BA + 18)) & ~keep_m   # 手（手袋）は袖に入れない
    sleeve = arms.copy(); drape = np.zeros((H, W), bool); cuff = np.zeros((H, W), bool)
    for x in range(W):
        ys = np.where(arms[:, x] & (yy[:, x] >= 200))[0]
        if not len(ys): continue
        out = abs(x - BA) - 18                       # 体から離れるほど（外側ほど）長く垂れる
        d = int(np.clip(5 + out * 0.3, 5, 12)); y0 = ys.max()
        drape[y0 + 1:y0 + 1 + d, x] = True; cuff[y0 + d, x] = True
    sleeve |= drape
    wide = P.neighbors4(sleeve) & ~cape_m & ((xx < BA - 22) | (xx > BA + 22)) & (yy > 186)   # 袖は腕より 1 ドット太い（布のふくらみ）
    sleeve |= wide; cuff = (cuff | (P.neighbors4(cuff) & wide & (yy >= 214))) & ~np.roll(sleeve, -1, axis=0)
    sleeve &= ~keep_m
    vs = texturize(np.where(xx < BA, 0.58, 0.4) - 0.16 * np.clip((yy - 184) / 50.0, 0, 1) - np.where(drape, 0.08, 0.0), 0.6, 5, 2)
    sg, _ = P.to_gray(bp, arms, out_lo=0.22, out_hi=0.82)
    vs = np.where(arms, sg[..., 0] / 255.0 * 0.6 + vs * 0.4, vs)
    cuff &= sleeve
    # 重ね：裾（マントの上の部分には描かない＝マントが手前）→ 袖
    body = (skirt & ~(cape_m & (yy <= CAPE_CUT)) & ~hem_cape) | sleeve
    vv = np.where(sleeve, vs, v)
    g = gray_layer(body & ~trim & ~cuff, vv)
    gold_paint(fixed, (trim & ~hem_cape) | cuff, np.clip(0.6 - 0.4 * (xx - BA) / 50.0, 0, 1), GOLD)
    m = body | hem_cape
    paint_fixed(fixed, ring_outline(m) & ~P.opaque(bp) & (yy > 180), OUT_CLOTH)
    # 袖と体の境い目・袖の口に線
    paint_fixed(fixed, sleeve & P.neighbors4(~sleeve & ~P.opaque(bp)), OUT_CLOTH)
    return erase, g, fixed


# ============================================================
# 組み立て
# ============================================================
GOLD = ['#5c3810', '#9a6420', '#d49a36', '#f2cc6a', '#fff2bc']
PLATE_REF = ['#3c3133', '#5e5054', '#837476', '#a89a98', '#e2d8cc']   # 主人公の鎧の板金の色（元の絵から）
OUT_METAL = (24, 20, 30); OUT_CLOTH = (30, 16, 18); OUT_WOOD = (34, 18, 10)
WOOD = ['#3b2414', '#5e3a1e', '#8a5a2e', '#b78048']


def ext(H, W, top, bottom=0):
    """上（下）にはみ出す部品を描くための大きめの台：(高さ, 幅, ずらす量)"""
    return H + top + bottom, W, top


TRAVEL = ['#3b3026', '#7d6a52', '#b8a582', '#ddd0b0', '#f3ecd6']    # 布の旅装（生成りの麻）
BOOTS = ['#1c120c', '#3a2416', '#5a3a22', '#7a5232', '#9a6c44']     # 革の靴


def armor_zone(a, region, belt):
    """鎧の範囲：板金のドット ＋ そのすぐ横の金の縁取り ＋ 中に閉じこめられた暗い線（帯は含めない）"""
    plate = plate_mask(a, region)
    near = plate.copy()
    for _ in range(2): near = near | P.neighbors4(near)
    trim = is_gold(a) & near & region & ~belt
    z = plate | trim
    dark = P.opaque(a) & (P.lum(a) <= 52) & region & ~belt
    for _ in range(2):
        cnt = sum(np.roll(np.roll(z, dy, 0), dx, 1).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        z = z | (dark & (cnt >= 3))
    return z, plate, trim


def ramp_fill(dst, mask, v, ramp):
    cols = np.array([P.hexrgb(c) for c in ramp]); i = np.clip(np.round(v * (len(cols) - 1)).astype(int), 0, len(cols) - 1)
    for k in range(len(cols)):
        m = mask & (i == k); dst[m, 0], dst[m, 1], dst[m, 2] = cols[k]; dst[m, 3] = 255


def travelize(a, zone, legs_y, trim_cols, hands=None):
    """装備なし：鎧（胸当て・肩当て・腰の板・脛当て）→ 布の旅装（生成りの上着・袖）と革の靴。肩当ての外へ張り出した所は削る"""
    t = a.copy(); H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
    was = P.opaque(t)
    for (x0, x1, y0, y1) in trim_cols: t[(xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1) & zone] = 0   # 肩当ての張り出し
    z = zone & P.opaque(t)
    L = P.lum(a).astype(float); Lz = np.where(z, L, np.nan)
    pad = np.pad(Lz, 1, mode='edge'); acc = np.zeros_like(L); n = np.zeros_like(L)
    for dy in range(3):
        for dx in range(3):
            v = pad[dy:dy + H, dx:dx + W]; ok = ~np.isnan(v); acc[ok] += v[ok]; n[ok] += 1
    Ls = np.where(n > 0, acc / np.maximum(n, 1), L)          # 板金の細かな光をならす（布はぎらぎら光らない）
    lo, hi = np.nanpercentile(Lz, 4), np.nanpercentile(Lz, 96)
    v = np.clip((Ls - lo) / max(1.0, hi - lo), 0, 1)
    v = 0.36 + 0.5 * v
    v = np.where(L <= 52, 0.24, v)                           # 板の継ぎ目の暗い線 → 布のしわ・縫い目（輪郭ほど濃くしない）
    v = texturize(v, 0.35, 2, 3)
    hm = hands if hands is not None else np.zeros((H, W), bool)
    cloth = z & (yy < legs_y) & ~hm; boot = z & ((yy >= legs_y) | hm)   # 籠手（こて）→ 革の手袋、脛当て → 革の靴
    ramp_fill(t, cloth, v, TRAVEL); ramp_fill(t, boot, np.clip(v * 0.9, 0, 1), BOOTS)
    P.outline_edges(t, was, OUTLINE)
    edge = z & P.opaque(t) & P.neighbors4(~P.opaque(t))
    t[edge, 0], t[edge, 1], t[edge, 2] = OUTLINE
    return t


def build_view(name, o, wl, cfg):
    """1 つの向きの部品をそろえる。wl＝剣・盾を外した絵（鎧はそのまま）"""
    H, W = o.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
    parts = {}
    region = (yy >= cfg['body_y'])
    zone, plate_m, trim_m = armor_zone(wl, region, cfg['belt_m'])
    plain = travelize(wl, zone, cfg['legs_y'], cfg['trim_cols'], cfg['keep_m'])
    parts['base_plain'] = plain
    # 鎧の形（元の絵の板金・縁取り・継ぎ目）。重鎧はこのまま。色のある品は板金だけ品の色（灰色の層）
    parts['armor_shape_f'] = take(wl, zone)
    hg, _ = P.to_gray(wl, plate_m, out_lo=0.0, out_hi=1.0); parts['armor_heavy_t'] = hg
    # 軽装（革）：同じ形で、板金を明るさをしぼって品の色へ
    lg, _ = P.to_gray(wl, plate_m, out_lo=0.16, out_hi=0.8, gamma=1.1); parts['armor_light_t'] = lg
    parts['shield'] = take(o, cfg['shield_m'])
    parts['weapon_sword'] = take(o, cfg['sword_m'])
    parts['hand'] = take(plain, cfg['hand_m'] & P.opaque(plain) & ~is_red(plain))
    return parts, plate_m, zone, plain


def save_parts(view_dir, parts, offsets):
    os.makedirs(view_dir, exist_ok=True)
    rec = {}
    for k, arr in parts.items():
        c, x, y = P.crop_layer(arr)
        if c is None: continue
        ox, oy = offsets.get(k, (0, 0))
        path = os.path.join(view_dir, k + '.png'); P.save(c, path)
        hsh = hashlib.sha1(open(path, 'rb').read()).hexdigest()[:8]
        rec[k] = {'url': os.path.relpath(path, ROOT).replace(os.sep, '/') + '?v=' + hsh, 'x': int(x + ox), 'y': int(y + oy), 'w': int(c.shape[1]), 'h': int(c.shape[0])}
    return rec


if __name__ == '__main__':
    fo = src(FRONT_SRC); bo = src(BACK_SRC); mage = src(MAGE_SRC)
    fp = front_plain(fo); bp = back_plain(bo)
    set_texture(fo, (44, 96, 84, 146))   # 胸当て・腰の板金
    FH, FW = fo.shape[:2]; BH, BW = bo.shape[:2]
    fyy, fxx = np.mgrid[0:FH, 0:FW]; byy, bxx = np.mgrid[0:BH, 0:BW]
    # ---- 正面の剣・盾・手 ----
    changed = np.any(fo != fp, axis=-1)
    blade = np.zeros((FH, FW), bool)
    for y in range(12, 93): blade[y, :int(np.floor(blade_cut_front(y))) + 1] = True
    sword_m_f = (blade | rect(FH, FW, 0, 88, 31, 107) | rect(FH, FW, 0, 100, 13, 112) | (rect(FH, FW, 30, 90, 38, 101) & is_gold(fo)) | (rect(FH, FW, 21, 128, 33, 139) & is_gold(fo))) & P.opaque(fo)
    SHIELD_F_TIGHT = [(84, 90), (88, 86), (113, 86), (119, 91), (125, 101), (127, 112), (127, 128), (124, 140), (119, 150), (112, 159), (106, 164), (100, 161), (93, 153), (88, 144), (85, 132), (84, 118), (83, 104), (83, 95)]
    cfg_f = {'body_y': 74, 'shield_m': P.poly_mask(FH, FW, SHIELD_F_TIGHT) & P.opaque(fo), 'sword_m': sword_m_f, 'hand_m': rect(FH, FW, 11, 104, 33, 129),
             'keep_m': rect(FH, FW, 11, 104, 33, 129) | rect(FH, FW, 2 * FA - 33, 104, 2 * FA - 11, 129), 'belt_m': rect(FH, FW, 38, 111, 92, 128), 'legs_y': 152,
             'trim_cols': [(0, 33, 74, 97), (2 * FA - 32, 140, 74, 97)]}
    pf, plate_f, zone_f, tp = build_view('front', fo, fp, cfg_f)
    # ---- 背面の剣・盾・手 ----
    changed_b = np.any(bo != bp, axis=-1)
    outl_b = np.all(bp[..., :3] == np.array(OUTLINE), axis=-1)
    sword_m_b = changed_b & rect(BH, BW, 193, 100, 250, 240) & P.opaque(bo) & ~outl_b
    SHIELD_B_TIGHT = [(117, 183), (106, 185), (98, 194), (92, 207), (90, 225), (91, 241), (96, 253), (105, 261), (115, 264), (121, 259), (123, 246), (124, 230), (126, 206), (124, 191)]
    cfg_b = {'body_y': 172, 'shield_m': P.poly_mask(BH, BW, SHIELD_B_TIGHT) & P.opaque(bo), 'sword_m': sword_m_b, 'hand_m': rect(BH, BW, 192, 199, 218, 227),
             'keep_m': rect(BH, BW, 195, 203, 218, 227) | rect(BH, BW, int(2 * BA) - 218, 203, int(2 * BA) - 195, 227), 'belt_m': np.zeros((BH, BW), bool), 'legs_y': 250,
             'trim_cols': [(0, 117, 176, 202), (int(2 * BA) - 116, 400, 176, 202)]}
    pb, plate_b, zone_b, tb = build_view('back', bo, bp, cfg_b)

    # ---- 兜 ----
    g, f, hm = helm(FH, FW, cx=66, top=9, brow=47, rx=36, cheek=(30, 46, 87, 102, 73))
    pf['head_helm_t'], pf['head_helm_f'] = g, f
    face = rect(FH, FW, 46, 46, 88, 80)
    bh = tp.copy(); clr = (fyy < 72) & ~hm & ~face; bh[clr] = 0; P.drop_specks(bh, 6)
    pf['base_helm'] = bh
    g, f, hmb = helm(BH, BW, cx=157, top=111, brow=161, rx=38, cheek=None, back=True, flare=9)
    pb['head_helm_t'], pb['head_helm_f'] = g, f
    bhb = tb.copy(); clr = (byy < 171) & ~hmb & ~((byy >= 166) & (bxx > 120) & (bxx < 195)); bhb[clr] = 0; P.drop_specks(bhb, 6)
    pb['base_helm'] = bhb
    # ---- とんがり帽子（上へはみ出すので、大きめの台に描いて y をずらす）----
    TOP = 60
    g, f, hatm, brim, crown = witch_hat(FH + TOP, FW, cx=66, by=43 + TOP, rx=50, ry=9, d=1, buckle=True)
    pf['head_hat_t'], pf['head_hat_f'] = g, f
    hm2 = hatm[TOP:]; crown2 = crown[TOP:]
    brim_top = 43 - 9 * np.sqrt(np.clip(1 - ((fxx - 66) / 50.0) ** 2, 0, 1))
    bt = tp.copy(); clr = (fyy < brim_top) & ~crown2 & (fyy < 60); bt[clr] = 0; P.drop_specks(bt, 6)
    pf['base_hat'] = bt
    g, f, hatmb, brimb, crownb = witch_hat(BH + TOP, BW, cx=157, by=149 + TOP, rx=54, ry=9, d=-1, buckle=False)
    pb['head_hat_t'], pb['head_hat_f'] = g, f
    crownb2 = crownb[TOP:]
    brim_top_b = 149 - 9 * np.sqrt(np.clip(1 - ((bxx - 157) / 54.0) ** 2, 0, 1))
    btb = tb.copy(); clr = (byy < brim_top_b) & ~crownb2 & (byy < 165); btb[clr] = 0; P.drop_specks(btb, 6)
    pb['base_hat'] = btb
    # ---- 杖・槍 ----
    def staff(H, W, cx, cy, ground, top_ext):
        f = pole(H + top_ext, W, cx, cy + 9 + top_ext, ground + top_ext, WOOD)
        g, hf = staff_head(H + top_ext, W, cx, cy + top_ext, 9)
        cap = rect(H + top_ext, W, cx - 2, ground + top_ext - 3, cx + 2, ground + top_ext)
        gold_paint(f, cap, np.full((H + top_ext, W), 0.55), GOLD)
        f = P.over(f, hf); f[g[..., 3] > 0] = 0
        return g, f
    def spear(H, W, cx, tip, ground, top_ext):
        f = pole(H + top_ext, W, cx, tip + 34 + top_ext, ground + top_ext, WOOD)
        hd = spear_head(H + top_ext, W, cx, tip + top_ext, 31, 5)
        return P.over(f, hd)
    pf['weapon_staff_t'], pf['weapon_staff_f'] = staff(FH, FW, 22, 52, 197, TOP)
    pf['weapon_spear'] = spear(FH, FW, 22, -24, 197, TOP)
    pb['weapon_staff_t'], pb['weapon_staff_f'] = staff(BH, BW, 205, 148, 303, TOP)
    pb['weapon_spear'] = spear(BH, BW, 205, 70, 303, TOP)
    # ---- v9.8.1 斧（描いて作る。剣と同じ握り・同じ向き。刃は頭の側＝メニューの枠の中に収まる向き。どの斧も同じ形）----
    import gear as GR
    #   正面は刃が頭の側に来るので、斧頭を肩の高さに下げて顔にかからないようにする（柄は剣より短い）
    pf['weapon_axe'] = GR.axe(FH, FW, (22, 117), (-0.158, -0.987), top=62, bottom=22, head=40, reach=20, side=1, spike_len=6)
    pb['weapon_axe'] = GR.axe(BH, BW, (205, 213), (0.228, -0.974), top=72, bottom=22, head=42, reach=21, side=1, spike_len=7)
    # ---- v9.8.6 職業の服装（狩人・盗賊）と、弓・短剣 ----
    import hero_jobs
    hero_jobs.add(pf, pb, TRAVEL)
    # ---- ローブ ----
    pf['armor_robe_t'], pf['armor_robe_f'] = robe_front(fp, mage, None, plate_f)   # fp＝剣・盾を外した元の絵（スカーフ・腕の形を見る）
    hb_, sb_, vb_ = P.hsv(bp); cape_b = ((hb_ < 20) | (hb_ > 330)) & (sb_ > 0.3) & P.opaque(bp) & (byy > 165)
    cape_b = cape_b | (P.neighbors4(cape_b) & P.opaque(bp) & (P.lum(bp) < 60))   # マントの縁の暗い線もマントのうち
    pb['armor_robe_x'], pb['armor_robe_t'], pb['armor_robe_f'] = robe_back(bp, zone_b, cape_b, cfg_b['keep_m'])
    # ---- v9.8.8 魔法使いの服装（ローブの裾・広い袖）。ローブの品と同じ形を紫で塗り、袖は武器の手前の層 ----
    import hero_mage
    hero_mage.add(pf, pb, {'robe_b': (pb['armor_robe_x'], pb['armor_robe_t'], pb['armor_robe_f']), 'cape_b': cape_b, 'TRAVEL': TRAVEL, 'FA': FA, 'BA': BA})   # v9.8.9 職業の服の系統（ローブ・長衣・マント）
    # ---- 書き出し ----
    off = {k: (0, -TOP) for k in ('head_hat_t', 'head_hat_f', 'weapon_staff_t', 'weapon_staff_f', 'weapon_spear')}
    recF = save_parts(os.path.join(OUT, 'job_warrior'), pf, off)
    recB = save_parts(os.path.join(OUT, 'back'), pb, off)
    json.dump({'front': recF, 'back': recB}, open(os.path.join(OUT, 'parts.json'), 'w'), indent=1)
    # ---- 対応表（js/data/equip-pixels.js）：人物ID・向き → 部品。部品の種類 → 装備の形 ----
    def box(arr):
        bb = P.bbox(P.opaque(arr)); return {'x0': bb[0], 'y0': bb[1], 'x1': bb[2], 'y1': bb[3]}
    FDX, FDY = 95, 104
    def shiftbox(b, dx, dy): return {'x0': b['x0'] + dx, 'y0': b['y0'] + dy, 'x1': b['x1'] + dx, 'y1': b['y1'] + dy}
    def shiftparts(rec, dx, dy): return {k: dict(v, x=v['x'] + dx, y=v['y'] + dy) for k, v in rec.items()}
    def frame(rec, w, h, m=2):
        # メニューに置く枠：どの組み合わせでも同じ。全部の部品（帽子・槍・杖の先）を収め、左右は元の絵の中心でそろえ、下は元の絵の下辺（足もと）
        x0 = min([0] + [r['x'] for r in rec.values()]) - m; x1 = max([w] + [r['x'] + r['w'] for r in rec.values()]) + m
        y0 = min([0] + [r['y'] for r in rec.values()]) - m
        half = max(w / 2 - x0, x1 - w / 2)
        return {'x0': int(np.floor(w / 2 - half)), 'y0': int(y0), 'x1': int(np.ceil(w / 2 + half)), 'y1': int(h)}
    # ---- 主人公の対応表（assets/characters/equip-pixels/hero/actor.json）。全員分は manifest.py が js/data/equip-pixels.js にまとめる ----
    #   部品の種類・重ね方（classes・materials）は manifest.py の GLOBAL（主人公の部品の名前）
    actor = {
        # menuBase：メニューの立ち絵の素体。主人公はどの職業でも、本人の絵（戦士の立ち絵）を素体にして装備で着替える（戦闘の絵も職業で変わらないのと合わせる）
        'menuBase': 'job:warrior',
        # v9.8.6 職業の服装：素の絵のすぐ上に重ねる（戦士は重ね絵なし）。短剣は拳を柄の上に描き直す（人ごとの重ね方）
        #   v9.8.8 魔法使い：ローブ（背面はマントを短くする erase の層つき）。over＝袖の層（武器・握りの拳より手前。袖口が手首にかぶさり、杖の柄は袖口の中を通る）
        #   v9.8.9 全職業：系統（_robe・_coat・_cape）の形を共有し、職業ごとの配色（pal・pal2）で塗る（hero_mage.py の JOB_LOOKS）。戦士は重ね絵なし
        'jobs': hero_mage.jobs_table({'hunter': {'z': 5, 'layers': [{'part': 'outfit_hunter'}]}, 'thief': {'z': 5, 'layers': [{'part': 'outfit_thief'}]}}),
        #   v9.8.9 ローブの品：胴・裾・袖口を一着に（職業の服の胴・袖は描かず、品の色の袖を手前の層に）
        'materials': {'weapon_dagger': {'z': 40, 'hand': True, 'layers': [{'part': 'weapon_dagger'}]}, 'armor_robe': hero_mage.ROBE_ITEM},
        'views': {
            'job:warrior': {'src': FRONT_SRC, 'w': FW, 'h': FH, 'dir': 'front', 'pivot': [64, 197], 'body': box(tp), 'frame': frame(recF, FW, FH),
                            'grip': {'x': 22, 'y': 117, 'order': '剣：拳の上に鍔（剣を後に描く）／杖・槍・斧：柄の上に拳を描き直す'},
                            'offhand': {'x': 105, 'y': 125, 'order': '盾：腕の上（体の後に描く）'}, 'parts': recF},
            # 戦闘の正面（勝利のときの振り向き）：party-directions の hero/front.png は、戦士の立ち絵と同じ絵・同じ大きさ（人物の高さ 196）を (95, 104) に置いたもの
            #   → メニュー正面の部品をそのまま使い、座標だけ (95, 104) ずらす（新しい画像は作らない。足もと 302 行目・縮尺 1:1 が戦闘と同じ）
            'front': {'src': FRONT_BATTLE_SRC, 'w': 320, 'h': 320, 'dir': 'front', 'pivot': [160, 304], 'body': shiftbox(box(tp), FDX, FDY),
                      'grip': {'x': 22 + FDX, 'y': 117 + FDY, 'order': '剣：拳の上に鍔（剣を後に描く）／杖・槍・斧：柄の上に拳を描き直す'},
                      'offhand': {'x': 105 + FDX, 'y': 125 + FDY, 'order': '盾：腕の上（体の後に描く）'}, 'from': 'job:warrior', 'parts': shiftparts(recF, FDX, FDY)},
            'back': {'src': BACK_SRC, 'w': BW, 'h': BH, 'dir': 'back', 'pivot': [160, 304], 'body': box(tb), 'frame': frame(recB, BW, BH),
                     'grip': {'x': 205, 'y': 213, 'order': '剣：拳の上に鍔／杖・槍・斧：柄の上に拳を描き直す'},
                     'offhand': {'x': 108, 'y': 222, 'order': '盾：左腕の外側（体の後に描く）'}, 'parts': recB},
        }}
    json.dump(actor, open(os.path.join(OUT, 'actor.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    import manifest
    man = manifest.write()
    print('front', len(recF), 'back', len(recB))
