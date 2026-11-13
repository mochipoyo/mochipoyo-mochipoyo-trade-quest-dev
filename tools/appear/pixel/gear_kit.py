# v9.9 装備の外見（ドット絵の差分）：頭・盾・重鎧を、その人の頭・肩・腕の位置に合わせて描く共通の道具（主人公の兜・帽子と同じ描き方）
#   どれも灰色の層（品の色で塗る）＋ そのままの層（縁取り・輪郭）。頭の部品は、かぶると隠れる髪だけを消した素の絵（base_helm・base_hat・base_cap）と組
#   head＝{'cx', 'top', 'neck', 'rx', 'face'（正面で残す顔の多角形・背面は None）, 'hair'（消してよい髪の範囲の多角形・省略時は頭の外接）, 'own'（元の絵の帽子の範囲：消して髪を補う）}
import numpy as np
import pxlib as P
import gear as GR
import build_hero as BH

OUTL = (30, 16, 18)
TOP = 70   # 帽子の先が絵の上へはみ出すぶん（部品は y をこの分ずらして書き出す）


def ext(a, top=TOP):
    o = P.blank(a.shape[0] + top, a.shape[1]); o[top:] = a; return o


def head_box(base, head):
    Hh, Ww = base.shape[:2]; yy = np.mgrid[0:Hh, 0:Ww][0]
    m = P.opaque(base) & (yy < head['neck'])
    if head.get('xr'): xx = np.mgrid[0:Hh, 0:Ww][1]; m &= (xx >= head['xr'][0]) & (xx <= head['xr'][1])
    bb = P.bbox(m); return bb, m


def hair_fill(base, head, hairm):
    """元の絵の帽子（own）を消し、その下の頭の上を髪で補う（髪の色の段を元の絵の髪から取り、丸い頭の形に塗る）"""
    Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float); b = base.copy()
    own = P.poly_mask(Hh, Ww, head['own']) & P.opaque(base)
    if head.get('face') is not None: own &= ~P.poly_mask(Hh, Ww, head['face'])   # 顔は残す
    b[own] = 0
    cx, rx = head['cx'], head['rx'] * 0.9; cy = head['brow'] + 2; ry = head['brow'] - head['top']
    dome = (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0) & (yy <= cy + 4)
    fill = dome & ~P.opaque(b)
    cols = base[hairm & P.opaque(base)][:, :3]
    if len(cols):
        L = cols.mean(1); qs = np.percentile(L, [10, 35, 60, 85]); ramp = [cols[np.argmin(np.abs(L - q))] for q in qs]
        v = np.clip(0.72 - 0.38 * (xx - cx) / rx - 0.3 * (yy - (cy - ry)) / ry, 0, 0.999)
        v = np.where((np.abs(((xx - cx) % 7) - 3.5) < 0.6) & (yy > cy - ry * 0.6), v - 0.22, v)   # 髪の筋（ゆるい縦の線）
        idx = (v * 4).astype(int)
        for k in range(4): mk = fill & (idx == k); b[mk, :3] = ramp[k]; b[mk, 3] = 255
    ring = P.neighbors4(P.opaque(b)) & ~P.opaque(b) & (dome | P.neighbors4(dome))
    b[ring] = (*OUTL, 255)
    return b


def helm(base, head, back):
    """丸い兜（主人公と同じ描き方）。兜の外へはみ出す髪だけを消す（顔は残す）"""
    Hh, Ww = base.shape[:2]; cx, top, brow, rx, neck = head['cx'], head['top'], head['brow'], head['rx'], head['neck']
    cheek = None if back else (cx - rx * 0.98, cx - rx * 0.62, cx + rx * 0.62, cx + rx * 0.98, int(neck - 2))
    g, f, m = BH.helm(Hh, Ww, cx, top, brow, rx, cheek, back=back, flare=int(rx * 0.25) if back else 0)
    b = base.copy(); hair = P.poly_mask(Hh, Ww, head['hair']) & P.opaque(b)
    cut = hair & ~m
    if head.get('face') is not None: cut &= ~P.poly_mask(Hh, Ww, head['face'])
    b[cut] = 0; edge = P.opaque(b) & P.neighbors4(cut) & ~m; b[edge] = (*OUTL, 255)
    return b, g, f


def witch(base, head, back):
    """とんがり帽子：つばの上へはみ出す髪を消す（つばより下の髪・顔はそのまま）"""
    Hh, Ww = base.shape[:2]; cx, by, rx = head['cx'], head['hat_by'], head['hat_rx']; ry = max(6, int(rx * 0.18))
    s = rx / 50.0
    g, f, hm, brim, crown = BH.witch_hat(Hh + TOP, Ww, cx, by + TOP, rx, ry, -1 if back else 1, not back)
    if abs(s - 1) > 0.12:   # 大きさを頭に合わせる（つばの幅に比例。つばの中心を基準に縮める・広げる）
        import cv2
        M = np.float32([[s, 0, cx * (1 - s)], [0, s, (by + TOP) * (1 - s)]]); Wn, Hn = g.shape[1], g.shape[0]
        sc = lambda a: cv2.warpAffine(np.ascontiguousarray(a.astype(np.uint8)), M, (Wn, Hn), flags=cv2.INTER_NEAREST).astype(np.int32)
        g, f = sc(g), sc(f); crown = sc(crown) > 0
    yy = np.mgrid[0:Hh, 0:Ww][0]
    b = base.copy(); hair = P.poly_mask(Hh, Ww, head['hair']) & P.opaque(b)
    brim_top = by - ry
    cut = hair & (yy < brim_top + 2) & ~crown[TOP:]
    if head.get('face') is not None: cut &= ~P.poly_mask(Hh, Ww, head['face'])
    b[cut] = 0; P.drop_specks(b, 6)
    return b, g, f


def cap(base, head, back):
    """つば付きの帽子（革の帽子など）：頭の上の丸い帽子＋前のつば（正面）。帽子の外へはみ出す髪だけを消す"""
    Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    cx, top, rx = head['cx'], head['top'], head['rx'] * 0.96; brow = top + (head['brow'] - top) * 0.92
    ry = brow - top + 2
    dome = (((xx - cx) / rx) ** 2 + ((yy - brow) / ry) ** 2 <= 1.0) & (yy <= brow + 1)
    band = dome & (yy > brow - 4)
    brim = np.zeros((Hh, Ww), bool)
    if not back: brim = (((xx - cx) / (rx * 1.02)) ** 2 + ((yy - (brow + 1)) / 3.2) ** 2 <= 1.0) & (yy >= brow)
    m = dome | brim
    v = np.clip(0.7 - 0.45 * (xx - cx) / rx - 0.25 * (yy - top) / ry, 0.08, 0.95)
    v = np.where(band, v - 0.22, v); v = np.where(brim, 0.35 - 0.2 * (xx - cx) / rx, v)
    seam = dome & (np.abs(xx - cx) < 0.8) & (yy < brow - 4); v = np.where(seam, v - 0.2, v)
    edge = m & P.neighbors4(~m); v = np.where(edge, v - 0.15, v)
    g = P.blank(Hh, Ww); q = np.round(np.round(np.clip(v, 0.03, 0.97) * 4) / 4 * 255).astype(np.int32); g[m, 0] = g[m, 1] = g[m, 2] = q[m]; g[m, 3] = 255
    f = P.blank(Hh, Ww); ring = P.neighbors4(m) & ~m; f[ring] = (*OUTL, 255)
    b = base.copy(); hair = P.poly_mask(Hh, Ww, head['hair']) & P.opaque(b)
    cut = hair & ~m & (yy < brow)
    if head.get('face') is not None: cut &= ~P.poly_mask(Hh, Ww, head['face'])
    b[cut] = 0; P.drop_specks(b, 6)
    return b, g, f


def shield(base, at, s, back):
    """盾（ヒーター形）：前腕（offhand）に合わせて置く。背面は横に縮めて、斜めから見た形"""
    Hh, Ww = base.shape[:2]; w, h = 46 * s, 58 * s
    g, f, m = GR.heater(Hh, Ww, at[0], at[1], w, h, squash=0.72 if back else 1.0, light=-1)
    return g, f


def pauldrons(base, shoulders, s):
    """重鎧の肩当て（左右）：丸い板金。灰色の層（品の色）＋ 輪郭"""
    Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float); g = P.blank(Hh, Ww); allm = np.zeros((Hh, Ww), bool)
    for (x, y, side) in shoulders:
        rx, ry = 15 * s, 11 * s
        m = (((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2 <= 1.0) & (yy <= y + ry * 0.55)
        v = np.clip(0.72 - 0.45 * (xx - x) / rx - 0.4 * (yy - y) / ry, 0.1, 0.97)
        rim = m & (yy > y + ry * 0.55 - 2.5); v = np.where(rim, v - 0.25, v)
        q = np.round(np.round(v * 4) / 4 * 255).astype(np.int32); g[m, 0] = g[m, 1] = g[m, 2] = q[m]; g[m, 3] = 255; allm |= m
    f = P.blank(Hh, Ww); ring = P.neighbors4(allm) & ~allm; f[ring] = (24, 20, 30, 255)
    return g, f


def circlet(base, head, back, crown=True):
    """冠・額冠：額の高さの金の輪（正面は前に小さな飾りの山）。髪は消さない（輪は髪の上）"""
    Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    cx, rx = head['cx'], head['rx'] * 0.98; by = head['brow'] - 2; ry = max(3.0, rx * 0.16)
    t = (xx - cx) / rx
    ring = (np.abs(t) <= 1.0) & (np.abs(yy - (by + ry * (1 - np.sqrt(np.clip(1 - t ** 2, 0, 1))) * (-1 if back else 1) * 0)) <= 2.2)
    ring &= (np.abs(t) <= 1.0)
    pts = np.zeros((Hh, Ww), bool)
    if crown:
        for k in (-0.6, -0.3, 0.0, 0.3, 0.6):
            px = cx + k * rx; h = 7 if k == 0 else 5
            pts |= (np.abs(xx - px) <= (h - (by - 2 - yy)) * 0.45) & (yy < by - 1) & (yy >= by - 2 - h)
    m = ring | pts
    v = np.clip(0.75 - 0.4 * t - 0.2 * (yy - by) / 3.0, 0.1, 0.97); v = np.where(pts, v + 0.1, v)
    g = P.blank(Hh, Ww); q = np.round(np.round(np.clip(v, 0.05, 0.97) * 4) / 4 * 255).astype(np.int32); g[m, 0] = g[m, 1] = g[m, 2] = q[m]; g[m, 3] = 255
    f = P.blank(Hh, Ww); ringo = P.neighbors4(m) & ~m; f[ringo] = (40, 24, 10, 255)
    if not back:
        gem = (xx - cx) ** 2 + (yy - by) ** 2 <= 4.5; f[gem] = (60, 140, 220, 255)
    return g, f


def mantle(base, head, L, cx, back):
    """v9.9 肩の短いマント（ケープ）：首のまわりから肩の外まで、胸の高さまで。職業の輪郭（肩の丸み）を変える。顔・頭には描かない"""
    Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    top = head['neck'] - 3; hgt = 0.22 * L; w = 0.40 * L
    t = np.clip((yy - top) / hgt, 0, 1)
    half = w * np.sqrt(np.clip(1 - (1 - t) ** 2 * 0.0 - t ** 2.2 * 0.0, 0, 1)) * (0.55 + 0.45 * np.sqrt(t))
    wave = 1.2 * np.sin(xx / 4.0)
    m = (yy >= top) & (yy <= top + hgt + wave) & (np.abs(xx - cx) <= half)
    if head.get('face') is not None: m &= ~P.poly_mask(Hh, Ww, head['face'])
    v = np.clip(0.7 - 0.35 * (xx - cx) / w - 0.25 * t + 0.1 * np.sin((xx - cx) / 3.5), 0.08, 0.95)
    edge = m & (yy > top + hgt - 2 + wave); v = np.where(edge, v - 0.25, v)
    g = P.blank(Hh, Ww); q = np.round(np.round(v * 4) / 4 * 255).astype(np.int32); g[m, 0] = g[m, 1] = g[m, 2] = q[m]; g[m, 3] = 255
    f = P.blank(Hh, Ww); ring = P.neighbors4(m) & ~m & (yy > top + 1); f[ring] = (*OUTL, 255)
    clasp = (not back) and True
    if clasp:
        cm = (xx - cx) ** 2 + (yy - (top + 3)) ** 2 <= 5; f[cm] = (212, 154, 54, 255)
    return g, f
