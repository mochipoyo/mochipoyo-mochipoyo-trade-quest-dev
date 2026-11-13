# v9.8.6 装備の外見（ドット絵の差分）：主人公の職業の服装（狩人・盗賊）と、弓・短剣
#   主人公の顔・髪型・体格（素の絵）はそのまま。職業の違いは「服装の重ね絵（outfit_<職業>）」と武器で出す
#     outfit_hunter  狩人：襟巻き・マントを森の緑、上着をオリーブ色に。正面は胸に矢筒の革ひも、背面は背中に矢筒（矢羽根）
#     outfit_thief   盗賊：襟巻き・マントを濃い藍、上着を墨色に
#   重ね絵は素の絵（base_plain・base_helm・base_hat）のすぐ上に重ねる（鎧・帽子・武器はその上）。戦士は重ね絵なし＝今までどおり
#     weapon_bow     弓：剣と同じ右手の拳に握り。弓の腹は体の外へ、弦は体の側。握りの上に拳を描き直す
#     weapon_dagger  短剣：同じ拳から上へ。拳の上に鍔。握りの上に拳を描き直す
import numpy as np
import pxlib as P
import gear as GR

HUNTER = {'cape': ['#10240f', '#1f4a1c', '#2f6e2a', '#4a9440', '#78bf62'], 'tunic': ['#2c2a16', '#55502a', '#847c42', '#b0a862', '#d8d08c']}
THIEF = {'cape': ['#0e0c1c', '#1c1a36', '#2e2a54', '#474078', '#6a62a0'], 'tunic': ['#131317', '#26262e', '#3c3c48', '#585868', '#7c7c90']}


def _ramp(layer, src, m, ramp):
    L = P.lum(src).astype(float); vals = L[m]
    if not len(vals): return
    lo, hi = np.percentile(vals, 3), np.percentile(vals, 97)
    v = np.clip((L - lo) / max(1.0, hi - lo), 0, 1)
    GR.ramp_put(layer, m, v, ramp)


def outfit(base, cloth_cols, red_from_y, pal, extra=None, face=None):
    """素の絵 base から服装の重ね絵を作る：赤い襟巻き・マント（red_from_y より下の赤）と、布の上着（cloth_cols の色のドット）を職業の色に"""
    Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]; op = P.opaque(base); h, s, v = P.hsv(base)
    red = op & ((h <= 18) | (h >= 340)) & (s > 0.45) & (v > 0.22) & (yy >= red_from_y)
    if face: red &= ~((xx >= face[0]) & (xx <= face[1]) & (yy < face[2]))      # 顔（口・ほお）の赤は服ではない
    cols = np.array([P.hexrgb(c) for c in cloth_cols]); rgb = base[..., :3]
    cloth = op & np.any(np.all(rgb[:, :, None, :] == cols[None, None, :, :], axis=3), axis=2)
    L = P.blank(Hh, Ww)
    _ramp(L, base, red, pal['cape']); _ramp(L, base, cloth, pal['tunic'])
    if extra: extra(L, base, op)
    return L


def strap_front(p0, p1, feathers):
    def f(L, base, op):
        Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
        (x0, y0), (x1, y1) = p0, p1; dx, dy = x1 - x0, y1 - y0; t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / (dx * dx + dy * dy), 0, 1)
        d = np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy)); band = (d <= 2.0) & op
        GR.ramp_put(L, band, np.where(d < 0.9, 0.7, 0.35), GR.LEATHER); L[(d > 2.0) & (d <= 2.9) & op, :3] = (24, 18, 22); L[(d > 2.0) & (d <= 2.9) & op, 3] = 255
        for (fx, fy) in feathers:                       # 肩ごしに見える矢羽根
            m = (np.abs(xx - fx) <= 1.5) & (yy >= fy) & (yy <= fy + 7)
            GR.ramp_put(L, m, np.where(xx < fx, 0.95, 0.6), ['#5a5248', '#8c8478', '#bcb4a6', '#e2dccf', '#fbf8f0']); GR.outline(L, m)
    return f


def quiver_back(top, bottom, w, feathers):
    def f(L, base, op):
        Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
        (x0, y0), (x1, y1) = top, bottom; dx, dy = x1 - x0, y1 - y0; n = np.hypot(dx, dy); ux, uy = dx / n, dy / n
        u = (xx - x0) * ux + (yy - y0) * uy; vv = (xx - x0) * -uy + (yy - y0) * ux
        tube = (u >= 0) & (u <= n) & (np.abs(vv) <= w / 2.0)
        for k, off in enumerate(feathers):              # 矢羽根（筒の口から出る）
            m = (u >= -11) & (u < 0) & (np.abs(vv - off) <= 1.4)
            GR.ramp_put(L, m, np.where(vv < off, 0.95, 0.55), ['#5a5248', '#8c8478', '#bcb4a6', '#e2dccf', '#fbf8f0']); GR.outline(L, m)
        GR.ramp_put(L, tube, np.clip(0.75 - 0.5 * (vv + w / 2.0) / w - 0.15 * (np.floor(u).astype(int) % 9 == 0), 0, 1), GR.LEATHER)
        rim = tube & (u < 3); GR.ramp_put(L, rim, np.full(u.shape, 0.7), GR.BRONZE)
        GR.outline(L, tube)
    return f


def add(pf, pb, cloth_cols):
    FH, FW = pf['base_plain'].shape[:2]; BH, BW = pb['base_plain'].shape[:2]
    pf['outfit_hunter'] = outfit(pf['base_plain'], cloth_cols, 64, HUNTER, strap_front((44, 84), (84, 112), [(90, 60), (95, 63)]), face=(46, 84, 73))
    pb['outfit_hunter'] = outfit(pb['base_plain'], cloth_cols, 170, HUNTER, quiver_back((196, 172), (170, 232), 13, [-3.5, 0, 3.5]))
    pf['outfit_thief'] = outfit(pf['base_plain'], cloth_cols, 64, THIEF, face=(46, 84, 73))
    pb['outfit_thief'] = outfit(pb['base_plain'], cloth_cols, 170, THIEF)
    pf['weapon_bow'] = GR.bow(FH, FW, (22, 117), (-0.158, -0.987), length=104, depth=14, side=-1, limb_w=3.0)
    pb['weapon_bow'] = GR.bow(BH, BW, (205, 213), (0.228, -0.974), length=110, depth=15, side=1, limb_w=3.0)
    pf['weapon_dagger'] = GR.sword(FH, FW, (22, 117), (-0.158, -0.987), blade_len=30, blade_w=7, tip=10, guard_w=15, guard_at=11, pommel_at=-10, pommel_r=3)
    pb['weapon_dagger'] = GR.sword(BH, BW, (205, 213), (0.228, -0.974), blade_len=32, blade_w=7, tip=10, guard_w=15, guard_at=11, pommel_at=-10, pommel_r=3)
