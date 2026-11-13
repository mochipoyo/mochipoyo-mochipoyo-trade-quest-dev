# v9.8.8 装備の外見（ドット絵の差分）：主人公の魔法使いの服装 → v9.8.9 主人公の職業の服を「系統（形）× 職業の配色」にした
#   主人公の顔・髪型・体格・赤い襟巻き（主人公の目印）はそのまま。職業は服の輪郭（形）で分け、同じ系統の職業は形を共有して配色だけ変える
#   部品（どれも灰色の層＝職業の配色で塗る。jf_* は「職業の服」の部品）
#     jf_cape_t     マント（正面の脇・背面の全体）。2 つめの色（pal2）で塗る
#     jf_capeup_t   腰で短くしたマント（背面。ローブ・長衣のとき。正面は jf_cape_t と同じ）
#     jf_capehem_t  短くしたマントの新しい裾（背面）。手前の層に入れる（ローブの品の裾の赤を上から塗る）
#     jf_cloth_t    生成りの旅装（上着）。1 つめの色（pal）で塗る
#     jf_sleeve_t / jf_sleeve_f  釣り鐘形の広い袖（灰色の層／金の縁取り・裏地・輪郭）。手前の層（z 45＝武器・握りの拳より手前）
#                   袖口が拳の上側（手首）にかぶさり、杖の柄は袖口の中を通る。ローブの品（armor_robe）の袖にも同じ部品を使う（品の色で塗る）
#   ローブの胴・裾は、ローブの品の部品（armor_robe_x / _t / _f）をそのまま使う（職業の服のときは職業の配色で塗る）
#   系統：_robe（くるぶしまでのローブ＋広い袖）・_coat（くるぶしまでの長衣。袖は広げない）・_cape（今までの長いマントのまま、配色だけ）
import numpy as np
import pxlib as P
import gear as GR

TRAVEL_REF = ['#3b3026', '#7d6a52', '#b8a582', '#ddd0b0', '#f3ecd6']    # 生成りの旅装（build_hero.TRAVEL と同じ）
LINING = (44, 20, 54)                                                 # 袖の内側（袖口の奥の影）
OUT_CLOTH = (30, 16, 18)
GOLD = ['#5c3810', '#9a6420', '#d49a36', '#f2cc6a', '#fff2bc']


def gray_of(src, m, lo_q=3, hi_q=97, out_lo=0.12, out_hi=0.92):
    """元の絵の明るさ → 灰色の層（5 段にそろえる）"""
    g = P.blank(*src.shape[:2]); L = P.lum(src).astype(float); vals = L[m]
    if not len(vals): return g
    lo, hi = np.percentile(vals, lo_q), np.percentile(vals, hi_q)
    v = out_lo + (out_hi - out_lo) * np.clip((L - lo) / max(1.0, hi - lo), 0, 1)
    q = np.round(np.round(v * 4) / 4 * 255).astype(np.int32)
    g[m, 0] = g[m, 1] = g[m, 2] = q[m]; g[m, 3] = 255
    return g


def _line_dist(xx, yy, a, b):
    (x0, y0), (x1, y1) = a, b; dx, dy = x1 - x0, y1 - y0; n = np.hypot(dx, dy)
    return ((xx - x0) * dy - (yy - y0) * dx) / n          # 線からの符号つきの距離


def sleeves(Hh, Ww, polys, opening, light, avoid):
    """袖：polys（腕ごとの多角形）、opening（腕ごとの袖口の線 (外の点, 内の点)）、light（腕ごとの明るさ）、avoid＝袖を描かない所（襟巻き・マント）
       → (灰色の層, そのままの層)。縦のしわ・左が明るい。袖口に金の縁取りと、その内側に暗い裏地。外側に輪郭"""
    yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    g = P.blank(Hh, Ww); f = P.blank(Hh, Ww); allm = np.zeros((Hh, Ww), bool)
    for pts, (a, b), lv in zip(polys, opening, light):
        m = P.poly_mask(Hh, Ww, pts) & ~avoid
        d = _line_dist(xx, yy, a, b); d = d if np.mean(d[m]) > 0 else -d     # 袖口の線から、袖の中（上）へ向かって正
        x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
        t = (yy - y0) / max(1, y1 - y0); u = (xx - x0) / max(1, x1 - x0)
        v = lv - 0.22 * u + 0.1 * t + 0.09 * np.sin(xx / 2.3 + yy / 7.0)   # 左が明るい・しわ
        v = np.where(np.abs(np.sin(xx / 3.1 - yy / 9.0)) < 0.18, v - 0.16, v)
        q = np.round(np.round(np.clip(v, 0.05, 0.95) * 4) / 4 * 255).astype(np.int32)
        trim = m & (d < 2.2); lin = m & (d >= 2.2) & (d < 3.4) & (u > 0.25) & (u < 0.85); cloth = m & ~trim & ~lin
        g[cloth, 0] = g[cloth, 1] = g[cloth, 2] = q[cloth]; g[cloth, 3] = 255
        GR.ramp_put(f, trim, np.clip(0.75 - 0.4 * u, 0, 1), GOLD)
        f[lin] = (*LINING, 255)
        allm |= m
    ring = P.neighbors4(allm) & ~allm & ~avoid
    f[ring] = (*OUT_CLOTH, 255)
    return g, f


def red_mask(a, y_from=0, face=None):
    Hh, Ww = a.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]; h, s, v = P.hsv(a)
    m = P.opaque(a) & ((h <= 18) | (h >= 340)) & (s > 0.45) & (v > 0.15) & (yy >= y_from)
    if face: m &= ~((xx >= face[0]) & (xx <= face[1]) & (yy < face[2]))
    return m


def cloth_mask(a, cols):
    c = np.array([P.hexrgb(x) for x in cols]); rgb = a[..., :3]
    return P.opaque(a) & np.any(np.all(rgb[:, :, None, :] == c[None, None, :, :], axis=3), axis=2)


def add(pf, pb, ctx):
    """ctx：robe_b＝(消す, 灰, そのまま)（背面のローブの品の部品）、cape_b（背面のマント）、TRAVEL、FA・BA"""
    FH, FW = pf['base_plain'].shape[:2]; BH, BW = pb['base_plain'].shape[:2]
    FA, BA = ctx['FA'], ctx['BA']
    fy, fx = np.mgrid[0:FH, 0:FW]; by, bx = np.mgrid[0:BH, 0:BW]
    # ---- 正面 ----
    bf = pf['base_plain']
    cape_f = red_mask(bf, 100, face=(46, 84, 73))                               # 襟巻き（y 100 より上の赤）は赤のまま
    pf['jf_cape_t'] = gray_of(bf, cape_f); pf['jf_capeup_t'] = pf['jf_cape_t']
    pf['jf_cloth_t'] = gray_of(bf, cloth_mask(bf, ctx['TRAVEL']), out_lo=0.3, out_hi=0.95)
    scarf = red_mask(bf) & (fy < 100); scarf = scarf | P.neighbors4(scarf)
    # 左の腕（画面の左）：肩から手首へ広がり、袖口は拳の上側（手首）に斜めにかぶさる。右の腕は体の中心で左右に写す
    LP = [(43, 77), (33, 76), (28, 86), (21, 97), (12, 106), (22, 110), (34, 113), (40, 110), (44, 100)]
    LO = ((12, 106), (34, 113))
    mir = lambda pts: [(2 * FA - x, y) for x, y in pts]
    pf['jf_sleeve_t'], pf['jf_sleeve_f'] = sleeves(FH, FW, [LP, mir(LP)], [LO, tuple(mir(list(LO)))], [0.78, 0.6], scarf)
    # ---- 背面 ----
    bb = pb['base_plain']; ex, g, fixed_b = ctx['robe_b']
    cape_b = ctx['cape_b'] & P.opaque(bb)
    pb['jf_cape_t'] = gray_of(bb, cape_b)
    cut = ex[..., 3] > 0
    pb['jf_capeup_t'] = gray_of(bb, cape_b & ~cut)
    hem = red_mask(fixed_b) & (by > 240)                                        # ローブの品が描き直す、短くしたマントの波打つ裾（赤）
    pb['jf_capehem_t'] = gray_of(fixed_b, hem, out_lo=0.05, out_hi=0.7)
    pb['jf_cloth_t'] = gray_of(bb, cloth_mask(bb, ctx['TRAVEL']), out_lo=0.3, out_hi=0.95)
    RP = [(183, 180), (197, 182), (202, 191), (209, 197), (217, 201), (203, 210), (191, 216), (184, 212), (181, 197)]
    RO = ((217, 201), (191, 216))
    mirb = lambda pts: [(int(round(2 * BA - x)), y) for x, y in pts]
    pb['jf_sleeve_t'], pb['jf_sleeve_f'] = sleeves(BH, BW, [RP, mirb(RP)], [RO, tuple(mirb(list(RO)))], [0.62, 0.7], cape_b & (by <= 244))


# ---- 対応表：系統（形）と、職業の配色 ----
def pal(main, dark, light, acc=None):
    return {'main': main, 'dark': dark, 'light': light, 'trim': light, 'acc': acc or light}


ROBE_L = [{'part': 'armor_robe_x', 'erase': True, 'optional': True}, {'part': 'jf_capeup_t', 'tint': 'pal2', 'region': 'cape'}, {'part': 'jf_cloth_t', 'tint': 'main', 'region': 'body'},
          {'part': 'armor_robe_t', 'tint': 'main', 'region': 'body'}, {'part': 'armor_robe_f', 'region': 'body'}]
FAMILIES = {
    # ローブ：くるぶしまでの裾＋広い袖（袖は武器・拳より手前の層）。短くしたマントの裾も手前の層（ローブの品の赤い裾を上から塗る）
    '_robe': {'z': 5, 'layers': ROBE_L, 'over': {'z': 45, 'layers': [{'part': 'jf_sleeve_t', 'tint': 'main', 'region': 'sleeve'}, {'part': 'jf_sleeve_f', 'region': 'sleeve'},
                                                                      {'part': 'jf_capehem_t', 'tint': 'pal2', 'optional': True, 'region': 'cape'}]}},
    # 長衣：くるぶしまでの裾（袖は広げない）
    '_coat': {'z': 5, 'layers': ROBE_L, 'over': {'z': 45, 'layers': [{'part': 'jf_capehem_t', 'tint': 'pal2', 'optional': True, 'region': 'cape'}]}},
    # マント：今までの長いマントと旅装の形のまま、配色だけ
    '_cape': {'z': 5, 'layers': [{'part': 'jf_cape_t', 'tint': 'pal2', 'region': 'cape'}, {'part': 'jf_cloth_t', 'tint': 'main', 'region': 'body'}]},
}
JOB_LOOKS = {
    # ローブの系統
    'mage': ('_robe', pal('#4f2a78', '#2a1545', '#a283cf'), pal('#5c3468', '#28122e', '#7e5290')),
    'priest': ('_robe', pal('#e6e0cc', '#9a927c', '#fffbea'), pal('#34509a', '#18244a', '#6a8ad0')),
    'sage': ('_robe', pal('#2f6e4a', '#16382a', '#76b48a'), pal('#b88a2a', '#5a3c10', '#ecc66a')),
    'chronomancer': ('_robe', pal('#cbb68a', '#7a6440', '#f2e6c2'), pal('#5a3a6e', '#2a1838', '#9472aa')),
    'spirit_warden': ('_robe', pal('#5f7d34', '#2e3e16', '#a4c070'), pal('#7a5a32', '#3a2814', '#b48c5a')),
    'master': ('_robe', pal('#24345a', '#10182e', '#5a72a8'), pal('#b8902a', '#5a420e', '#ead07a')),
    # 長衣の系統
    'merchant': ('_coat', pal('#8a5a2a', '#44280e', '#c8965a'), pal('#2f6a5a', '#143028', '#64a090')),
    'auditor': ('_coat', pal('#34343e', '#16161c', '#70707e'), pal('#7a1f2a', '#3a0c12', '#b04a56')),
    'artisan': ('_coat', pal('#6a4a2a', '#30200e', '#a47c52'), pal('#4a4a50', '#222226', '#86868e')),
    'mechanist': ('_coat', pal('#2f6474', '#122e36', '#6aa4b4'), pal('#b88a3a', '#5a3e12', '#e8c070')),
    'loop_trader': ('_coat', pal('#1f5a3a', '#0c2a1a', '#5a9a72'), pal('#c8a050', '#6a4a18', '#f2d488')),
    # マントの系統（今までの形。配色で分ける）
    'knight': ('_cape', pal('#b8bcc8', '#5a5e6a', '#eef0f6'), pal('#2a4a9a', '#121e48', '#6a8ad8')),
    'oath_knight': ('_cape', pal('#8a8070', '#3e382e', '#c8bea8'), pal('#3a2a5a', '#1a1230', '#6e5a96')),
    'magicknight': ('_cape', pal('#3a3a6a', '#1a1a34', '#7a7ab0'), pal('#6a2a8a', '#300e40', '#a466c4')),
    'waveblade': ('_cape', pal('#2a6a8a', '#103244', '#6aaccc'), pal('#1f8a96', '#0a3c42', '#5ac4cc')),
    'monk': ('_cape', pal('#c87a2a', '#6a3a0e', '#f0b46a'), pal('#8a3a1a', '#401608', '#c46a42')),
    'navigator': ('_cape', pal('#2a3a6a', '#121a34', '#6a7ab0'), pal('#d8d2bc', '#7a7462', '#fffbec')),
    'surveyor': ('_cape', pal('#8a6a3a', '#42301a', '#c4a46e'), pal('#4a6a3a', '#20301a', '#84a46e')),
}


def jobs_table(existing):
    """actor.json の jobs：系統（_robe・_coat・_cape）と、職業ごとの { like, pal, pal2 }。狩人・盗賊（v9.8.6 の手描きの服）はそのまま"""
    J = dict(existing); J.update(FAMILIES)
    for j, (fam, p1, p2) in JOB_LOOKS.items(): J[j] = {'like': fam, 'pal': p1, 'pal2': p2}
    return J


# ローブの品（主人公）：胴・裾・袖口を一着に。袖は職業の服と同じ形の部品を品の色で塗り、職業の服の胴・袖は描かない（covers）
ROBE_ITEM = {'z': 10, 'covers': ['body', 'sleeve'],
             'layers': [{'part': 'armor_robe_x', 'erase': True, 'optional': True}, {'part': 'armor_robe_t', 'tint': 'main'}, {'part': 'armor_robe_f'}],
             'over': {'z': 45, 'layers': [{'part': 'jf_sleeve_t', 'tint': 'main'}, {'part': 'jf_sleeve_f'}]}}
