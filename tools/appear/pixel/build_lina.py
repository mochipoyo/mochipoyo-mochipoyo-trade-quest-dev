# v9.8 装備の外見（ドット絵の差分）：リーナの「メニュー正面（companions/lina.png 195×274）」「戦闘の背面（party-directions-v3 の lina/back.png）」
#   戦闘の正面（勝利の振り向き）は lina/front.png が lina.png と同じ絵を (63, 30) に置いたものなので、メニュー正面の部品を座標だけずらして使う
#   元の絵は読むだけ。作った部品は assets/characters/equip-pixels/lina/<向き>/、リーナの対応表は lina/actor.json に書き、manifest.py でまとめる
#   python3 tools/appear/pixel/build_lina.py [確かめの絵の出力フォルダ]
#
#   部品（どれも元の絵と同じ座標）
#     base_plain      素の絵：杖を外して後ろを埋め（手は空）、法衣を「巡礼の旅装」（生成りの麻・革の胴着、金の飾りと飾り帯なし）に替えたもの
#     armor_robe_t/f  法衣：元の絵の法衣。白い布＝品の色（灰色の層）、赤・金・輪郭・飾り帯＝そのまま
#     armor_light_t   軽装：旅装の布を品の色にする灰色の層
#     weapon_staff_t/f 杖：元の絵から切り離した杖。玉＝品の色（灰色の層）
#     hand            杖を握る手（柄の上に描き直す）
#   髪・頭巾は元の絵のまま（法衣・旅装より手前の髪は、素の絵の髪がそのまま見える＝部品は髪の所に描かない）
import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pxlib as P
import build_hero as H

ROOT = H.ROOT
OUT = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels', 'lina')
CHECK = sys.argv[1] if len(sys.argv) > 1 else None
OUTLINE = (40, 18, 22)
FRONT_SRC = 'assets/characters/companions/lina.png'
FRONT_BATTLE_SRC = 'assets/characters/party-directions-v3/sprites/lina/front.png'
BACK_SRC = 'assets/characters/party-directions-v3/sprites/lina/back.png'
FDX, FDY = 63, 30     # lina/front.png の中の lina.png の位置（差 0 で一致することを確かめてある）

LEATHER = ['#2a1810', '#4e3020', '#74492c', '#9a6a40', '#c0905c']   # 革の胴着・前掛け（旅装）
LINEN = ['#3a3026', '#6b5b45', '#9a8667', '#c2ae8a', '#ddcfae']     # 生成りの麻（旅装。白い法衣と見分けられるよう、少し濃い）


# ============================================================
# 色の見分け（リーナの絵：桃色の髪・赤い布・白い布・金・肌）
# ============================================================
LINING_F = [(50, 154), (77, 154), (77, 200), (50, 200)]   # 正面：上げた腕の袖の内側（暗い赤の裏地。色が髪の影に近い）


def classes(a, view=None):
    h, s, v = P.hsv(a); L = P.lum(a); op = P.opaque(a)
    hair = op & (h >= 316) & (h < 353) & (s >= 0.17) & (s < 0.82) & (v > 0.3)
    if view == 'front': hair &= ~(P.poly_mask(*a.shape[:2], LINING_F) & (s >= 0.62))
    red = op & ((h >= 353) | (h <= 26)) & (s >= 0.55) & (v > 0.18) & ~hair
    gold = op & (h > 26) & (h <= 64) & (s > 0.38) & (v > 0.42)
    skin = op & (h >= 8) & (h <= 38) & (s > 0.1) & (s < 0.45) & (v > 0.72)
    white = op & (s < 0.24) & (v > 0.5) & ~skin
    dark = op & (L < 52)
    return {'hair': hair, 'red': red, 'gold': gold, 'skin': skin, 'white': white, 'dark': dark}


def band_mask(Hh, Ww, y0, y1, c0, slope, left, right):
    """縦に長い柄：y 行の中心 c0 + (y - y0) * slope から left〜right の幅"""
    m = np.zeros((Hh, Ww), bool)
    for y in range(max(0, y0), min(Hh, y1)):
        c = c0 + (y - y0) * slope
        m[y, max(0, int(np.floor(c - left))):min(Ww, int(np.ceil(c + right)) + 1)] = True
    return m


def reflect_fill(a, removed, outline=OUTLINE, seam=True, max_gap=30, one_side=0):
    """消した所（removed）を、行ごとに左右の残った絵を鏡に写して埋める（左半分は左の絵、右半分は右の絵）
       片側が透明（人物の外）の行：one_side > 0 なら、残った側を one_side ドットまで延ばして輪郭を引く（裾・髪の端を続ける）。0 なら埋めない
       左右で色が大きく違うと、継ぎ目に輪郭の線を引く"""
    Hh, Ww = a.shape[:2]; filled = np.zeros((Hh, Ww), bool)
    for y in range(Hh):
        xs = np.where(removed[y])[0]
        if not len(xs): continue
        runs = np.split(xs, np.where(np.diff(xs) > 1)[0] + 1)
        for r in runs:
            x0, x1 = int(r[0]), int(r[-1])
            if x1 - x0 + 1 > max_gap or x0 - 1 < 0 or x1 + 1 >= Ww: continue
            lo, ro = a[y, x0 - 1, 3] >= 40, a[y, x1 + 1, 3] >= 40
            if lo and ro:
                mid = (x0 + x1) / 2.0
                for x in range(x0, x1 + 1):
                    sx = max(0, x0 - 1 - (x - x0)) if x <= mid else min(Ww - 1, x1 + 1 + (x1 - x))
                    if a[y, sx, 3] < 40: sx = x0 - 1 if x <= mid else x1 + 1
                    a[y, x] = a[y, sx]; filled[y, x] = True
                if seam:
                    lc, rc = a[y, x0 - 1, :3].astype(float), a[y, x1 + 1, :3].astype(float)
                    pk = lambda c: c[0] > c[1] + 40 and c[2] > c[1] + 10   # 桃色（髪）
                    if np.abs(lc - rc).sum() > 120 and pk(lc) != pk(rc):
                        xm = int(round(mid)); a[y, xm, :3] = outline; a[y, xm, 3] = 255
            elif one_side and (lo or ro):
                k = min(one_side, (x1 - x0 + 1) // 2)
                for i in range(k):
                    if ro: x, sx = x1 - i, min(Ww - 1, x1 + 1 + i)
                    else: x, sx = x0 + i, max(0, x0 - 1 - i)
                    if a[y, sx, 3] < 40: break
                    a[y, x] = a[y, sx]; filled[y, x] = True
    return filled


def fill_from(a, removed, side, rows):
    """消した所を、片側（side＝'right'／'left'）の絵だけで埋める（反対側は髪の房など別のものなので混ぜない）"""
    Hh, Ww = a.shape[:2]; filled = np.zeros((Hh, Ww), bool)
    for y in range(max(0, rows[0]), min(Hh, rows[1])):
        xs = np.where(removed[y])[0]
        if not len(xs): continue
        for r in np.split(xs, np.where(np.diff(xs) > 1)[0] + 1):
            x0, x1 = int(r[0]), int(r[-1])
            for i in range(x1 - x0 + 1):
                if side == 'right': x, sx = x1 - i, x1 + 1 + i
                else: x, sx = x0 + i, x0 - 1 - i
                if sx < 0 or sx >= Ww or a[y, sx, 3] < 40: break
                a[y, x] = a[y, sx]; filled[y, x] = True
    return filled


def fix_vertical(a, filled):
    """埋めた所の、縦に 1 ドットだけ飛び出た色をならす（上下が同じ色なら、それに合わせる）"""
    Hh, Ww = a.shape[:2]
    for y in range(1, Hh - 1):
        for x in np.where(filled[y])[0]:
            up, dn = a[y - 1, x], a[y + 1, x]
            if up[3] > 40 and dn[3] > 40 and np.abs(up[:3] - dn[:3]).sum() < 30 and np.abs(a[y, x, :3] - up[:3]).sum() > 90:
                a[y, x] = up


def close(m, k):
    """穴をふさぐ（k 回ふくらませて、k 回しぼる）：髪の明るいつやを髪のうちにする"""
    d = m.copy()
    for _ in range(k): d = d | P.neighbors4(d)
    for _ in range(k): d = d & ~P.neighbors4(~d)
    return d | m


def hair_mass(a, C, k=3):
    """髪の房のかたまり（つやの白っぽいドットも含める）"""
    return close(C['hair'], k) & P.opaque(a)


# ============================================================
# 杖を外す（手は握った形のまま残る＝手ぶら）
# ============================================================
FRONT_HAND = [(36, 108), (58, 108), (59, 120), (58, 133), (37, 133), (36, 120)]
BACK_HAND = [(216, 147), (236, 147), (237, 152), (232, 166), (226, 166), (216, 156)]


def staff_front(o):
    Hh, Ww = o.shape[:2]; C = classes(o); yy, xx = np.mgrid[0:Hh, 0:Ww]
    head = P.poly_mask(Hh, Ww, [(0, 0), (93, 0), (93, 26), (82, 38), (68, 48), (60, 58), (56, 70), (54, 106), (26, 108), (12, 98), (0, 82)])
    head &= ~(hair_mass(o, C) & (yy > 52)) & ~(C['white'] & (xx > 70) & (yy > 26))   # 髪・頭巾は杖ではない
    shaft = band_mask(Hh, Ww, 96, 238, 45.5, 7.0 / 130.0, 5.0, 5.6)
    knob = P.poly_mask(Hh, Ww, [(41, 215), (51, 215), (51, 238), (41, 238)]) & ~C['white']   # 柄の左の小さな飾り
    pommel = P.poly_mask(Hh, Ww, [(47, 236), (61, 236), (64, 242), (64, 250), (63, 262), (58, 271), (51, 271), (45, 262), (45, 246)])
    hand = P.poly_mask(Hh, Ww, FRONT_HAND) & P.opaque(o)
    m = (head | shaft | knob | pommel) & (o[..., 3] > 0) & ~hand
    return m, hand


def staff_back(o):
    Hh, Ww = o.shape[:2]; C = classes(o); yy, xx = np.mgrid[0:Hh, 0:Ww]
    head = P.poly_mask(Hh, Ww, [(186, 28), (274, 28), (274, 128), (236, 128), (232, 143), (220, 143), (214, 128), (186, 112)])
    head &= ~(hair_mass(o, C) & (xx < 214))
    shaft = band_mask(Hh, Ww, 118, 292, 227.0, -8.0 / 170.0, 5.4, 5.6)
    pommel = P.poly_mask(Hh, Ww, [(212, 280), (228, 280), (230, 290), (226, 304), (216, 304), (211, 292)])
    hand = P.poly_mask(Hh, Ww, BACK_HAND) & P.opaque(o)
    m = (head | shaft | pommel) & (o[..., 3] > 0) & ~hand
    return m, hand


def unstaff(o, m, hand, pre=None, side=None):
    """杖を消して後ろを埋める。pre＝先に消しておく所（旅装では外へなびく飾り帯）
       side＝(向き, 行の範囲)：その行は片側の絵だけで埋める（飾り帯を外したあと、左の髪の房と体の間を、体の側の布・髪で埋める）"""
    a = o.copy(); was = P.opaque(a)
    if pre is not None: a[pre] = 0
    a[m] = 0
    filled = np.zeros(a.shape[:2], bool)
    for sd in (side or []):
        if sd[0] == 'both': f2 = reflect_fill(a, m & (np.arange(a.shape[0])[:, None] >= sd[1][0]) & (np.arange(a.shape[0])[:, None] < sd[1][1]), one_side=0)
        else: f2 = fill_from(a, m, sd[0], sd[1])
        filled |= f2; m = m & ~f2
    filled |= reflect_fill(a, m, one_side=5)
    fix_vertical(a, filled)
    P.outline_edges(a, was, OUTLINE)
    P.drop_specks(a, 40); P.fill_holes(a, 30)
    return a


def orb_split(o, m, cx, cy, r):
    """杖 → 玉（品の色に変える＝灰色の層）と、それ以外（そのまま）"""
    Hh, Ww = o.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]
    orb = m & (np.hypot(xx - cx, yy - cy) <= r)
    C = classes(o); orb &= (P.lum(o) > 40)   # 玉の中は全部（つやの金色も）品の色。輪郭の暗い線はそのまま
    g, _ = P.to_gray(o, orb, out_lo=0.05, out_hi=1.0)
    return g, H.take(o, m & ~orb)


# ============================================================
# 法衣の範囲と旅装
# ============================================================
def streamers(o, view):
    """外へなびく赤い飾り帯（法衣のもの。旅装では外す）"""
    Hh, Ww = o.shape[:2]; C = classes(o); yy, xx = np.mgrid[0:Hh, 0:Ww]
    if view == 'front': s = C['red'] & (xx < 54) & (yy > 140) & (yy < 245)
    else:
        s = C['red'] & (P.poly_mask(Hh, Ww, [(50, 250), (72, 234), (98, 226), (124, 224), (124, 236), (104, 244), (90, 252), (76, 264), (60, 276), (50, 268)])
                        | P.poly_mask(Hh, Ww, [(214, 222), (234, 220), (256, 240), (270, 262), (272, 286), (252, 286), (240, 266), (226, 248), (214, 238)]))
    s = close(s, 2) & P.opaque(o) & ~hair_mass(o, C)
    edge = P.neighbors4(s) & (C['dark'] | (o[..., 3] < 200)) & ~hair_mass(o, C)   # 帯の縁の線・にじみ
    return s | edge


SLEEVE_B = [(204, 158), (214, 152), (223, 154), (230, 163), (232, 174), (214, 173), (205, 168)]   # 背面：杖を持つ腕の袖


def robe_zone(a, view, hand):
    """法衣の範囲（髪・肌・頭巾・リボン・靴・手を除く）"""
    Hh, Ww = a.shape[:2]; C = classes(a, view); yy, xx = np.mgrid[0:Hh, 0:Ww]; op = P.opaque(a)
    hm = hair_mass(a, C, 4 if view == 'front' else 7)
    if view == 'back': sl = P.poly_mask(Hh, Ww, SLEEVE_B); hm = (hm & ~sl) | (C['hair'] & sl)   # 袖（白い布）は髪ではない
    if view == 'front':
        body = (yy >= 116) & (yy < 252)
        keep = ((xx >= 132) & (yy < 146))                                              # 頭巾の右のリボン（頭巾のもの）
        boots = P.poly_mask(Hh, Ww, [(76, 247), (140, 247), (140, 274), (76, 274)])
    else:
        body = (yy >= 146) & (yy < 300)
        keep = (C['red'] | C['gold']) & (yy < 182) & (xx > 96) & (xx < 202)          # 頭巾の後ろのリボン
        keep = close(keep, 2) & (yy < 184) & (xx > 94) & (xx < 204)
        boots = P.poly_mask(Hh, Ww, [(112, 281), (190, 281), (190, 310), (112, 310)])
    z = op & body & ~keep & ~boots & ~hm & ~C['skin'] & ~hand
    # 髪の中のつや（白っぽいドット）を法衣と間違えない：体の布（大きなかたまり・裾・袖）につながるものだけ
    lab, n = P.components(z); cnt = np.bincount(lab.ravel(), minlength=n + 1)
    if view == 'back':
        anchor = (yy >= 240) | P.poly_mask(Hh, Ww, SLEEVE_B)
        ok = np.zeros(n + 1, bool); ok[np.unique(lab[z & anchor])] = True; ok[0] = False
    else:
        ok = cnt >= 40; ok[0] = False
    z = ok[lab]
    # 輪郭の暗いドットは、まわりが法衣なら法衣のうち（髪との境い目の線は髪の側に残す）
    dark = C['dark'] & op & body & ~hm & ~keep & ~boots & ~hand
    for _ in range(2):
        cnt = sum(np.roll(np.roll(z, dy, 0), dx, 1).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        z = z | (dark & (cnt >= 2))
    return z, C


def travel(a, z, C):
    """法衣 → 巡礼の旅装：白い布→生成りの麻、赤い布→革の胴着・前掛け、金の飾り→麻の縫い目（外へなびく飾り帯は a から外してある）"""
    t = a.copy(); Hh, Ww = a.shape[:2]; was = P.opaque(t)
    L = P.lum(a).astype(float)
    cloth = z & (C['white'] | (~C['red'] & ~C['gold'] & ~C['dark']))
    red = z & C['red']; gold = z & C['gold']
    def norm(m, lo_p=4, hi_p=96):
        vals = L[m]
        if not len(vals): return np.zeros_like(L)
        lo, hi = np.percentile(vals, lo_p), np.percentile(vals, hi_p)
        return np.clip((L - lo) / max(1.0, hi - lo), 0, 1)
    vc = 0.3 + 0.62 * norm(cloth); vc = H.texturize(vc, 0.3, 4, 1)
    H.ramp_fill(t, cloth, vc, LINEN)
    vr = 0.22 + 0.7 * norm(red); H.ramp_fill(t, red, vr, LEATHER)
    vg = 0.2 + 0.35 * norm(gold); H.ramp_fill(t, gold, vg, LINEN)          # 金の飾り → 麻の縫い目（暗めの麻）
    dk = z & C['dark']; t[dk, 0], t[dk, 1], t[dk, 2] = OUTLINE
    P.outline_edges(t, was, OUTLINE)
    P.drop_specks(t, 10)
    return t


def smooth_gray(g, m, k=1):
    """灰色の層の明るさを、範囲の中だけでならす（白い布の細かなムラが、濃い色に塗ったとき白い点にならないように）"""
    v = g[..., 0].astype(float); Hh, Ww = m.shape
    for _ in range(k):
        acc = np.zeros_like(v); n = np.zeros_like(v); pv = np.pad(v, 1); pm = np.pad(m, 1)
        for dy in range(3):
            for dx in range(3):
                mm = pm[dy:dy + Hh, dx:dx + Ww]; acc += np.where(mm, pv[dy:dy + Hh, dx:dx + Ww], 0); n += mm
        v = np.where(m, acc / np.maximum(n, 1), v)
    o = g.copy(); o[m, 0] = o[m, 1] = o[m, 2] = np.round(v[m]).astype(np.int32); return o


def robe_parts(a, z, C):
    """法衣：白い布は品の色（灰色の層）、それ以外（赤・金・輪郭・飾り帯）はそのまま"""
    cloth = z & (C['white'] | (~C['red'] & ~C['gold'] & ~C['dark'] & ~C['hair']))
    g, _ = P.to_gray(a, cloth, out_lo=0.12, out_hi=1.0, gamma=0.9)
    g = smooth_gray(g, cloth)
    f = H.take(a, z & ~cloth)
    return g, f


def light_part(t, z, C):
    """軽装：旅装の麻の布を品の色に（灰色の層）。革の胴着・縫い目はそのまま（素の絵の旅装が見える）"""
    cloth = z & (C['white'] | (~C['red'] & ~C['gold'] & ~C['dark']))
    g, _ = P.to_gray(t, cloth, out_lo=0.14, out_hi=0.95)
    return smooth_gray(g, cloth)


if __name__ == '__main__':
    fo = P.load(os.path.join(ROOT, FRONT_SRC)); bo = P.load(os.path.join(ROOT, BACK_SRC))
    H.set_texture(fo, (70, 180, 120, 240))   # 法衣の白い布の細かなムラ
    FH, FW = fo.shape[:2]; BH, BW = bo.shape[:2]
    pf, pb = {}, {}
    # ---- 杖（法衣の部品用＝飾り帯を残して埋めた絵 A、旅装用＝飾り帯を先に外して埋めた絵 B）----
    smf, handf = staff_front(fo); smb, handb = staff_back(bo)
    stf, stb = streamers(fo, 'front'), streamers(bo, 'back')
    fpA = unstaff(fo, smf, handf); bpA = unstaff(bo, smb, handb)
    yyF, xxF = np.mgrid[0:FH, 0:FW]
    inner = stf & (xxF >= 28) & (yyF >= 134) & (yyF < 182)            # 髪の房と柄の間に見えていた帯の端：両側（髪の房・袖）から埋める
    fpB = unstaff(fo, (smf & ~stf) | inner, handf, pre=stf & ~inner, side=[('both', (134, 182)), ('right', (134, 242))]); bpB = unstaff(bo, smb & ~stb, handb, pre=stb)
    # 正面：飾り帯を外したあとに残る帯の切れ端（左の髪の房より下・柄より左）を消す
    yy_, xx_ = np.mgrid[0:FH, 0:FW]; Cq = classes(fpB)
    junk = (((xx_ < 42) & (yy_ > 150)) | ((xx_ < 49) & (yy_ >= 182))) & (yy_ < 246) & (fpB[..., 3] > 0) & ~hair_mass(fpB, Cq, 4)
    fpB[junk] = 0
    P.outline_edges(fpB, P.opaque(fo), OUTLINE); P.drop_specks(fpB, 40)
    # 背面：裾の外（左右の飾り帯があった所）に残る切れ端を消す
    yyB, xxB = np.mgrid[0:BH, 0:BW]; Cb_ = classes(bpB)
    junkb = ((((xxB > 237) & (yyB > 222)) | ((xxB < 84) & (yyB > 230))) & (yyB < 300)) & (bpB[..., 3] > 0) & ~hair_mass(bpB, Cb_, 7)
    bpB[junkb] = 0; P.outline_edges(bpB, P.opaque(bo), OUTLINE); P.drop_specks(bpB, 40)
    pf['weapon_staff_t'], pf['weapon_staff_f'] = orb_split(fo, smf & P.opaque(fo), 39.5, 36.5, 15)
    pb['weapon_staff_t'], pb['weapon_staff_f'] = orb_split(bo, smb & P.opaque(bo), 232, 68.5, 13.5)
    # ---- 法衣と旅装 ----
    zfA, CfA = robe_zone(fpA, 'front', handf); zbA, CbA = robe_zone(bpA, 'back', handb)
    zfB, CfB = robe_zone(fpB, 'front', handf); zbB, CbB = robe_zone(bpB, 'back', handb)
    tf = travel(fpB, zfB, CfB); tb = travel(bpB, zbB, CbB)
    pf['base_plain'], pb['base_plain'] = tf, tb
    pf['armor_robe_t'], pf['armor_robe_f'] = robe_parts(fpA, zfA, CfA)
    pb['armor_robe_t'], pb['armor_robe_f'] = robe_parts(bpA, zbA, CbA)
    pf['armor_light_t'] = light_part(tf, zfB, CfB); pb['armor_light_t'] = light_part(tb, zbB, CbB)
    pf['hand'] = H.take(tf, handf & P.opaque(tf)); pb['hand'] = H.take(tb, handb & P.opaque(tb))
    fp, bp, zf, zb = fpA, bpA, zfA, zbA
    if CHECK:
        os.makedirs(CHECK, exist_ok=True)
        for n, arr in (('fp', fp), ('bp', bp), ('tf', tf), ('tb', tb)): P.save(arr, os.path.join(CHECK, 'lina_' + n + '.png'))
        for n, m in (('zf', zf), ('zb', zb), ('smf', smf), ('smb', smb)):
            o = fo if n[-1] == 'f' else bo; v = o.copy(); v[~m] = (v[~m] * [0.35, 0.35, 0.35, 1]).astype(np.int32); v[m & P.opaque(o), 0] = 255; P.save(v, os.path.join(CHECK, 'lina_mask_' + n + '.png'))
    # ---- 書き出し ----
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
    actor = {
        'menuBase': 'menu',
        # リーナの重ね方：法衣・杖は主人公と同じ名前の部品（GLOBAL の重ね方）。軽装は旅装の布の色だけ変える
        'materials': {'armor_light': {'z': 10, 'layers': [{'part': 'armor_light_t', 'tint': 'main'}]}},
        'views': {
            'menu': {'src': FRONT_SRC, 'w': FW, 'h': FH, 'dir': 'front', 'pivot': [97, 271], 'body': box(tf), 'frame': frame(recF, FW, FH),
                     'grip': {'x': 48, 'y': 121, 'order': '杖：柄の上に手を描き直す'}, 'parts': recF},
            'front': {'src': FRONT_BATTLE_SRC, 'w': 320, 'h': 320, 'dir': 'front', 'pivot': [160, 304], 'body': shiftbox(box(tf), FDX, FDY),
                      'grip': {'x': 48 + FDX, 'y': 121 + FDY, 'order': '杖：柄の上に手を描き直す'}, 'from': 'menu', 'parts': shiftparts(recF, FDX, FDY)},
            'back': {'src': BACK_SRC, 'w': BW, 'h': BH, 'dir': 'back', 'pivot': [160, 304], 'body': box(tb), 'frame': frame(recB, BW, BH),
                     'grip': {'x': 225, 'y': 152, 'order': '杖：柄の上に手を描き直す'}, 'parts': recB},
        }}
    json.dump(actor, open(os.path.join(OUT, 'actor.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    import manifest
    manifest.write()
    print('lina menu', len(recF), 'back', len(recB))
