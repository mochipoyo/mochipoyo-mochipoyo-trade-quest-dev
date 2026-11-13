# v9.8.8 装備の外見（ドット絵の差分）：主人公の魔法使いの服装
#   主人公の顔・髪型・体格（素の絵）はそのまま。魔法使いらしさは「長い裾のローブ」と「広い袖」の輪郭で出す
#     outfit_mage    服装の重ね絵（素の絵のすぐ上。z 5）
#                    正面：くるぶしまで広がるローブ（ローブの品と同じ形＝robe_front）を紫に。マントは濃い紫、襟巻きは赤のまま（主人公の目印）
#                    背面：赤いマントを腰で短くし（erase の層 outfit_mage_x）、くるぶしまでの長い裾（robe_back と同じ形）
#     outfit_mage_o  袖（重ね絵の手前の層。z 45＝武器（z 40）と握りの拳の上）
#                    肩から手首へ釣り鐘形に広がる袖。袖口が拳の上側（手首）にかぶさり、杖の柄は袖口の中を通る
#                    → 正面・背面とも「袖 → 拳 → 柄」の順に手前から見え、柄は袖口の上と拳の下で見える
#   杖（代表：樫の杖 oak_staff）は今までの部品 weapon_staff_t / weapon_staff_f をそのまま使う（握りも今までと同じ）
import numpy as np
import pxlib as P
import gear as GR

ROBE = ['#1c0f2c', '#34194f', '#4f2a78', '#7550a6', '#a283cf']      # ローブ（深い紫）
CAPE = ['#140a18', '#28122e', '#40204a', '#5c3468', '#7e5290']      # マント（ローブより暗い赤紫）
LINING = (44, 20, 54)                                                 # 袖の内側（袖口の奥の影）
OUT_CLOTH = (30, 16, 18)
GOLD = ['#5c3810', '#9a6420', '#d49a36', '#f2cc6a', '#fff2bc']


def _ramp_from(layer, src, m, ramp, lo_hi=None):
    L = P.lum(src).astype(float); vals = L[m]
    if not len(vals): return
    lo, hi = lo_hi or (np.percentile(vals, 3), np.percentile(vals, 97))
    GR.ramp_put(layer, m, np.clip((L - lo) / max(1.0, hi - lo), 0, 1), ramp)


def recolor(base, cloth_cols, cape_from_y, scarf_to_y, face=None):
    """マント（赤い布のうち scarf_to_y より下）→ 濃い紫。生成りの旅装 → ローブの紫（裾の外に見える所）。襟巻き（それより上の赤）は赤のまま"""
    Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]; op = P.opaque(base); h, s, v = P.hsv(base)
    red = op & ((h <= 18) | (h >= 340)) & (s > 0.45) & (v > 0.22) & (yy >= cape_from_y) & (yy >= scarf_to_y)
    if face: red &= ~((xx >= face[0]) & (xx <= face[1]) & (yy < face[2]))
    cols = np.array([P.hexrgb(c) for c in cloth_cols]); rgb = base[..., :3]
    cloth = op & np.any(np.all(rgb[:, :, None, :] == cols[None, None, :, :], axis=3), axis=2)
    L = P.blank(Hh, Ww)
    _ramp_from(L, base, red, CAPE); _ramp_from(L, base, cloth, ROBE[:4])
    return L, red


def robe_layer(gray, fixed):
    """ローブの品の部品（灰色の層＋そのままの層）を、魔法使いの紫で塗った 1 枚に"""
    return P.over(P.ramp_paint(gray, ROBE), fixed)


def _line_dist(xx, yy, a, b):
    (x0, y0), (x1, y1) = a, b; dx, dy = x1 - x0, y1 - y0; n = np.hypot(dx, dy)
    return ((xx - x0) * dy - (yy - y0) * dx) / n          # 線からの符号つきの距離


def sleeves(Hh, Ww, polys, opening, light, avoid):
    """袖：polys（腕ごとの多角形）、opening（腕ごとの袖口の線 (外の点, 内の点)）、light（腕ごとの明るさ）、avoid＝袖を描かない所（襟巻き・マント）
       縦のしわ・左が明るい。袖口に金の縁取りと、その内側に暗い裏地。外側に輪郭"""
    yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    L = P.blank(Hh, Ww); allm = np.zeros((Hh, Ww), bool)
    for pts, (a, b), lv in zip(polys, opening, light):
        m = P.poly_mask(Hh, Ww, pts) & ~avoid
        d = _line_dist(xx, yy, a, b)                         # 袖口の線から、袖の中（上）へ向かって正
        d = d if np.mean(d[m]) > 0 else -d
        x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
        t = (yy - y0) / max(1, y1 - y0); u = (xx - x0) / max(1, x1 - x0)
        v = lv - 0.22 * u + 0.1 * t + 0.09 * np.sin(xx / 2.3 + yy / 7.0)   # 左が明るい・しわ
        v = np.where(np.abs(np.sin(xx / 3.1 - yy / 9.0)) < 0.18, v - 0.16, v)
        GR.ramp_put(L, m, np.clip(v, 0.05, 0.95), ROBE)
        trim = m & (d < 2.2)
        GR.ramp_put(L, trim, np.clip(0.75 - 0.4 * u, 0, 1), GOLD)
        lin = m & (d >= 2.2) & (d < 3.4) & (u > 0.25) & (u < 0.85)
        L[lin] = (*LINING, 255)
        allm |= m
    ring = P.neighbors4(allm) & ~allm & ~avoid
    L[ring] = (*OUT_CLOTH, 255)
    return L


def add(pf, pb, ctx):
    """ctx：fp・bp（剣・盾を外した元の絵）、robe_f＝(灰, そのまま)、robe_b＝(消す, 灰, そのまま)、cape_b（背面のマント）、TRAVEL、FA・BA"""
    FH, FW = pf['base_plain'].shape[:2]; BH, BW = pb['base_plain'].shape[:2]
    FA, BA = ctx['FA'], ctx['BA']
    # ---- 正面 ----
    rc, red_f = recolor(pf['base_plain'], ctx['TRAVEL'], 64, 100, face=(46, 84, 73))
    pf['outfit_mage'] = P.over(rc, robe_layer(*ctx['robe_f']))
    fy, fx = np.mgrid[0:FH, 0:FW]
    h, s, v = P.hsv(pf['base_plain'])
    scarf = P.opaque(pf['base_plain']) & ((h <= 18) | (h >= 340)) & (s > 0.45) & (fy < 100)
    for _ in range(1): scarf = scarf | P.neighbors4(scarf)
    # 左の腕（画面の左）：肩から手首へ広がり、袖口は拳の上側（手首）に斜めにかぶさる。右の腕は体の中心で左右に写す
    LP = [(43, 77), (33, 76), (28, 86), (21, 97), (12, 106), (22, 110), (34, 113), (40, 110), (44, 100)]
    LO = ((12, 106), (34, 113))
    mir = lambda pts: [(2 * FA - x, y) for x, y in pts]
    pf['outfit_mage_o'] = sleeves(FH, FW, [LP, mir(LP)], [LO, tuple(mir(list(LO)))], [0.78, 0.6], scarf)
    # ---- 背面 ----
    ex, g, fx_b = ctx['robe_b']
    bb = pb['base_plain'].copy(); bb[ex[..., 3] > 0] = 0                      # マントを短くした素の絵で色を変える
    rcb, _ = recolor(bb, ctx['TRAVEL'], 170, 0)
    pb['outfit_mage_x'] = ex
    pb['outfit_mage'] = P.over(rcb, robe_layer(g, fx_b))
    # マントの新しい裾（robe_back は元のマントの赤を写している）→ 紫へ
    fixed_red = (pb['outfit_mage'][..., 3] > 0)
    hb, sb, vb = P.hsv(pb['outfit_mage']); redb = fixed_red & ((hb <= 18) | (hb >= 340)) & (sb > 0.45) & (vb > 0.15)
    tmp = P.blank(BH, BW); _ramp_from(tmp, pb['outfit_mage'], redb, CAPE); pb['outfit_mage'][redb] = tmp[redb]
    # 袖（右の腕＝画面の右。杖を持つ手）
    RP = [(183, 180), (197, 182), (202, 191), (209, 197), (217, 201), (203, 210), (191, 216), (184, 212), (181, 197)]
    RO = ((217, 201), (191, 216))
    mirb = lambda pts: [(int(round(2 * BA - x)), y) for x, y in pts]
    cape = ctx['cape_b'] & (np.mgrid[0:BH, 0:BW][0] <= 244)
    o = sleeves(BH, BW, [RP, mirb(RP)], [RO, tuple(mirb(list(RO)))], [0.62, 0.7], cape)
    # マントの新しい裾（紫）も手前の層に入れる：ローブの品（z 10）を着ても、裾が元の赤で描き直されないように
    hem = redb & (np.mgrid[0:BH, 0:BW][0] > 244); o[hem] = pb['outfit_mage'][hem]
    pb['outfit_mage_o'] = o
