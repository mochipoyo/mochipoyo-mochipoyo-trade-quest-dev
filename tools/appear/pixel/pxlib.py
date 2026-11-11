# v9.7 装備の外見（ドット絵の差分）を作るための小さな道具。build_hero.py から使う
#   画像は numpy の配列（高さ × 幅 × RGBA、0〜255 の整数）で扱う。元の絵は読むだけで、書き換えない
import json
import colorsys
import numpy as np
from PIL import Image, ImageDraw


def load(path):
    return np.array(Image.open(path).convert('RGBA')).astype(np.int32)


def save(arr, path):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA').save(path, optimize=True)


def blank(h, w):
    return np.zeros((h, w, 4), np.int32)


def poly_mask(h, w, pts):
    """多角形の内側（True）"""
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in pts], fill=255, outline=255)
    return np.array(m) > 0


def ellipse_mask(h, w, box):
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).ellipse(box, fill=255, outline=255)
    return np.array(m) > 0


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def hsv(a):
    """配列（…×4）→ 色相（0〜360）・彩度（0〜1）・明るさ（0〜1）"""
    r, g, b = a[..., 0] / 255.0, a[..., 1] / 255.0, a[..., 2] / 255.0
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rr = nz & (mx == r); gg = nz & (mx == g) & ~rr; bb = nz & ~rr & ~gg
    h[rr] = ((g[rr] - b[rr]) / d[rr]) % 6
    h[gg] = (b[gg] - r[gg]) / d[gg] + 2
    h[bb] = (r[bb] - g[bb]) / d[bb] + 4
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h * 60.0, s, mx


def opaque(a, t=40):
    return a[..., 3] > t


def bbox(m):
    ys, xs = np.where(m)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def neighbors4(m):
    """上下左右のどれかが True"""
    n = np.zeros_like(m)
    n[1:, :] |= m[:-1, :]; n[:-1, :] |= m[1:, :]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
    return n


def outline_edges(a, was, out_col=(26, 14, 14), dark_lum=70):
    """消した部分（was＝消す前は不透明だった所）と接する、残った明るい縁を輪郭の色にする（切り口に線を引く）"""
    op = opaque(a)
    cleared = was & ~op
    edge = op & neighbors4(cleared)
    L = lum(a)
    fix = edge & (L > dark_lum)
    a[fix, 0], a[fix, 1], a[fix, 2] = out_col
    a[fix, 3] = 255
    return int(fix.sum())


def outline_silhouette(layer, out_col=(26, 14, 14)):
    """層の外側 1 ドットに輪郭を足す（層だけで描いた形の縁取り）"""
    op = opaque(layer)
    ring = neighbors4(op) & ~op
    layer[ring, 0], layer[ring, 1], layer[ring, 2] = out_col
    layer[ring, 3] = 255
    return layer


def shift(a, dx, dy, h=None, w=None):
    """配列を (dx, dy) ずらして、h × w の配列に置く"""
    h = h or a.shape[0]; w = w or a.shape[1]
    o = blank(h, w)
    sh, sw = a.shape[:2]
    x0, y0 = max(0, dx), max(0, dy); x1, y1 = min(w, dx + sw), min(h, dy + sh)
    if x1 > x0 and y1 > y0:
        o[y0:y1, x0:x1] = a[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
    return o


def over(dst, src):
    """src を dst の上に重ねる（ドット絵なので半透明はほぼない：アルファで混ぜる）"""
    sa = src[..., 3:4] / 255.0
    da = dst[..., 3:4] / 255.0
    oa = sa + da * (1 - sa)
    rgb = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    out = np.concatenate([rgb, oa * 255], axis=-1)
    return np.round(out).astype(np.int32)


def to_gray(a, mask, lo=None, hi=None, out_lo=0.0, out_hi=1.0, gamma=1.0):
    """色づけ用の灰色の層：明るさを 0〜255 に並べ直す（品ごとの色の段階に置き換えるため）"""
    L = lum(a)
    vals = L[mask]
    if lo is None: lo = float(np.percentile(vals, 3)) if len(vals) else 0
    if hi is None: hi = float(np.percentile(vals, 97)) if len(vals) else 255
    v = np.clip((L - lo) / max(1.0, hi - lo), 0, 1) ** gamma
    v = out_lo + (out_hi - out_lo) * v
    g = blank(*a.shape[:2])
    g[mask, 0] = g[mask, 1] = g[mask, 2] = np.round(v[mask] * 255).astype(np.int32)
    g[mask, 3] = a[mask, 3]
    return g, (lo, hi)


def ramp_paint(gray, ramp):
    """灰色の層 → 色の段階（暗い→明るい、5 色）で塗る（確かめの絵用。実際のゲームでは js が同じことをする）"""
    cols = np.array([hexrgb(c) for c in ramp], np.float64)
    v = gray[..., 0] / 255.0 * (len(cols) - 1)
    i = np.clip(np.floor(v).astype(int), 0, len(cols) - 2); t = (v - i)[..., None]
    rgb = cols[i] * (1 - t) + cols[i + 1] * t
    o = gray.copy(); o[..., :3] = np.round(rgb).astype(np.int32)
    return o


def hexrgb(c):
    c = c.lstrip('#'); return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))


def rgbhex(t):
    return '#%02x%02x%02x' % tuple(int(max(0, min(255, round(v)))) for v in t)


def crop_layer(arr):
    """不透明な部分だけを切り出す → (切り出した配列, x, y)。空なら None"""
    bb = bbox(arr[..., 3] > 0)
    if not bb: return None, 0, 0
    x0, y0, x1, y1 = bb
    return arr[y0:y1, x0:x1].copy(), x0, y0


def ascii_patch(a, x0, y0, rows, pal):
    """文字の地図で 1 ドットずつ描く：' ' は何もしない、'.' は透明にする、それ以外は pal の色"""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            y, x = y0 + j, x0 + i
            if ch == ' ' or y < 0 or x < 0 or y >= a.shape[0] or x >= a.shape[1]:
                continue
            if ch == '.':
                a[y, x] = 0
            else:
                r, g, b = hexrgb(pal[ch]); a[y, x] = (r, g, b, 255)
    return a


def sample_ramp(a, mask, n=5):
    """マスクの中の色を明るさの順に並べて、n 段の色（暗い→明るい）を取り出す"""
    px = a[mask][:, :3].astype(float)
    if len(px) == 0: return ['#808080'] * n
    L = px @ np.array([0.299, 0.587, 0.114])
    order = np.argsort(L); px = px[order]
    out = []
    for k in range(n):
        lo = int(len(px) * (0.04 + 0.92 * k / n)); hi = max(lo + 1, int(len(px) * (0.04 + 0.92 * (k + 1) / n)))
        out.append(rgbhex(np.median(px[lo:hi], axis=0)))
    return out


def components(m):
    """True の連結成分（上下左右）→ ラベルの配列と個数"""
    from collections import deque
    H, W = m.shape; lab = np.zeros((H, W), np.int32); n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1; q = deque([(y, x)]); lab[y, x] = n
                while q:
                    cy, cx = q.popleft()
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
    return lab, n


def drop_specks(a, min_px=8):
    """小さな離れ島（消し残りのドット）を消す"""
    lab, n = components(P_opaque(a))
    cnt = np.bincount(lab.ravel(), minlength=n + 1)
    small = (lab > 0) & (cnt[lab] < min_px)
    a[small] = 0
    return int(small.sum())


def fill_holes(a, max_px=40):
    """絵の中に閉じこめられた小さな透明の穴を、まわりの色で埋める"""
    lab, n = components(~P_opaque(a))
    H, W = lab.shape
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    cnt = np.bincount(lab.ravel(), minlength=n + 1)
    filled = 0
    for k in range(1, n + 1):
        if k in border or cnt[k] > max_px: continue
        ys, xs = np.where(lab == k)
        for _ in range(4):
            for y, x in zip(ys, xs):
                if a[y, x, 3] > 40: continue
                nb = [a[yy, xx] for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)) if 0 <= yy < H and 0 <= xx < W and a[yy, xx, 3] > 40]
                if nb: a[y, x] = np.round(np.mean(nb, axis=0)).astype(np.int32); a[y, x, 3] = 255; filled += 1
    return filled


def P_opaque(a, t=40):
    return a[..., 3] > t


def round_top(a, x0, x1, y, out_col=(30, 16, 16)):
    """拳などの上の角を丸める：左右の角の 3 ドットを消し、1 つ内側に輪郭を引く"""
    for (x, yy) in ((x0, y), (x0 + 1, y), (x0, y + 1), (x1, y), (x1 - 1, y), (x1, y + 1)):
        a[yy, x] = 0
    for (x, yy) in ((x0 + 2, y), (x0 + 1, y + 1), (x0, y + 2), (x1 - 2, y), (x1 - 1, y + 1), (x1, y + 2)):
        if a[yy, x, 3] > 40 and lum(a[yy, x][None, :])[0] > 60: a[yy, x, :3] = out_col
    return a
