# v9.8.9 装備の外見（ドット絵の差分）：仲間（リーナ・ガルド・カイル・カズト・ミナ）の職業の服
#   python3 tools/appear/pixel/companion_jobs.py   （build_hero.py・build_<人物>.py・build_party.py のあとに動かす。部品を足し、<人物>/actor.json の jobs と parts を書き足して manifest を書く）
#   v9.9：主人公と仲間 16 人。足りない武器・頭（兜・とんがり帽子・つば付きの帽子・額の輪）・盾・重鎧（肩当て）を gear_kit.py で描き足す（generated に記録し、動かし直すと作り直す）
#   主人公と同じ「系統（形）× 職業の配色」（hero_mage.py の JOB_LOOKS）。人ごとの顔・髪型・体格・目印（下の keep）は塗らない
#     _robe  くるぶしまでの裾（jf_skirt）＋広い袖（jf_sleeve。手前の層。腕の形が素直な人だけ）。背面はマントを腰で短くする（jf_x）
#     _coat  くるぶしまでの裾（袖は広げない）
#     _cape  形は元の絵のまま、服（jf_cloth）・マント（jf_cape）の配色だけ
#   加入したときの職業（元の絵の姿）は重ね絵なし。狩人・盗賊は _cape の配色（主人公の手描きの服は主人公だけ）
#   人ごとの決まり（体型）：リーナは元から長い法衣なので裾・袖を足さない（配色だけ）。ガルド・ミナは腕の形（振り上げた拳・跳ぶ姿）に袖が合わないので袖なし
import os
import sys
import json
import hashlib
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pxlib as P
import gear as GR
import hero_mage as HM

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
EP = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels')
OUTL = (30, 16, 18)
GOLD = HM.GOLD


def load_view(aid, A, vk):
    v = A['views'][vk]; c = P.blank(v['h'], v['w'])
    r = v['parts']['base_plain']; a = P.load(os.path.join(ROOT, r['url'].split('?')[0])); c[r['y']:r['y'] + a.shape[0], r['x']:r['x'] + a.shape[1]] = a
    hand = np.zeros(c.shape[:2], bool)
    if 'hand' in v['parts']:
        r = v['parts']['hand']; a = P.load(os.path.join(ROOT, r['url'].split('?')[0])); hand[r['y']:r['y'] + a.shape[0], r['x']:r['x'] + a.shape[1]] = a[..., 3] > 0
    return c, hand


def hsv_mask(a, hue=None, s=(0, 1.01), v=(0, 1.01), y=(0, 9999), x=(0, 9999)):
    Hh, Ww = a.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]; h, ss, vv = P.hsv(a)
    m = P.opaque(a) & (ss >= s[0]) & (ss < s[1]) & (vv >= v[0]) & (vv < v[1]) & (yy >= y[0]) & (yy < y[1]) & (xx >= x[0]) & (xx < x[1])
    if hue: m &= ((h >= hue[0]) & (h <= hue[1])) if hue[0] <= hue[1] else ((h >= hue[0]) | (h <= hue[1]))
    return m


def skirt(base, keep, cx, top, hem, half_top, half_hem):
    """くるぶしまでの裾（灰色の層・そのままの層）：下へ広がる。縦のしわ・左が明るい・裾に金の縁取り・外側に輪郭。keep（拳など）には描かない"""
    Hh, Ww = base.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    t = np.clip((yy - top) / max(1, hem - top), 0, 1); half = half_top + (half_hem - half_top) * t ** 1.1
    wave = 1.5 * np.sin((xx - cx) / 5.0)
    m = (yy >= top) & (yy <= hem + wave) & (np.abs(xx - cx) <= half) & ~keep
    v = 0.55 - 0.22 * (xx - cx) / max(1.0, half_hem) + 0.12 * np.sin((xx - cx) / 5.6 + 0.8 * t) - 0.08 * t
    v = np.where(np.abs(xx - cx) < 1.0, 0.18, v)                                # 前の合わせ目（背面は縫い目）
    trim = m & (yy > hem - 3 + wave)
    g = P.blank(Hh, Ww); q = np.round(np.round(np.clip(v, 0.05, 0.95) * 4) / 4 * 255).astype(np.int32); cl = m & ~trim
    g[cl, 0] = g[cl, 1] = g[cl, 2] = q[cl]; g[cl, 3] = 255
    f = P.blank(Hh, Ww); GR.ramp_put(f, trim, np.clip(0.65 - 0.4 * (xx - cx) / max(1.0, half_hem), 0, 1), GOLD)
    ring = P.neighbors4(m) & ~m & ~keep & ((yy >= top + 2) | ~P.opaque(base))
    f[ring] = (*OUTL, 255)
    return g, f, m


def cape_cut(base, cape, cut, pal_src):
    """背面：マントを cut の行で短くする（消しの層）＋ 波打つ新しい裾（灰色の層。マントの色で塗る）"""
    Hh, Ww = base.shape[:2]; yy = np.mgrid[0:Hh, 0:Ww][0]
    low = cape & (yy > cut); halo = low.copy()
    for _ in range(3): halo |= P.neighbors4(halo)
    h, sv, vv = P.hsv(base)
    low |= halo & (base[..., 3] > 0) & ((base[..., 3] < 250) | (vv < 0.3)) & (yy > cut)   # マントの縁のにじみ・輪郭（暗い線）も消す
    for _ in range(2):   # 消したところに囲まれて残った小さな点も消す
        nb = sum(np.roll(np.roll(low, dy, 0), dx, 1).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        low |= (nb >= 3) & (base[..., 3] > 0) & (yy > cut)
    x = P.blank(Hh, Ww); x[low] = (255, 255, 255, 255)
    hem = np.zeros((Hh, Ww), bool); ring = np.zeros((Hh, Ww), bool)
    for c in np.where(cape[cut])[0]:
        d = int(round(5 + 2.2 * np.sin(c / 6.5) + 1.2 * np.sin(c / 2.7)))
        hem[cut + 1:cut + 1 + d, c] = True; ring[cut + 1 + d, c] = True
    up = cape & (yy <= cut)
    g = HM.gray_of(base, up)
    hg = P.blank(Hh, Ww); hg[hem, 0] = hg[hem, 1] = hg[hem, 2] = 96; hg[hem, 3] = 255; hg[ring] = (20, 20, 20, 255)
    hf = P.blank(Hh, Ww)   # 品（ローブ）を着るとき：元のマントの色の裾（切り口の少し上の色を、裾へ向けて暗く）
    for c in np.where(hem.any(0))[0]:
        src = base[cut - 2, c] if base[cut - 2, c, 3] > 0 else base[cut, c]
        for y in np.where(hem[:, c])[0]: q = src.copy(); q[:3] = np.round(src[:3] * (1 - 0.04 * (y - cut))); q[3] = 255; hf[y, c] = q
    hf[ring] = (20, 20, 20, 255)
    return x, g, hg, hf


# ---- 人ごとの決まり（向き：menu＝メニュー正面（勝利の正面は座標をずらして同じ部品）・back＝戦闘の背面）----
#   cloth＝服（1 つめの色）・cape＝マントなど（2 つめの色）・keep＝目印（塗らない）・skirt＝(中心, 上, 裾, 上の半幅, 裾の半幅)・cut＝背面でマントを短くする行
#   arms＝広い袖：(多角形, 袖口の線, 明るさ)。正面は体の中心で左右に写す
def cfg_kyle():
    TR = HM.cloth_mask
    def menu(b):
        return {'cloth': TR(b, HM.TRAVEL_REF), 'cape': hsv_mask(b, (195, 250), s=(0.35, 1.1), y=(140, 999)), 'skirt': (101, 152, 250, 30, 62), 'cut': None,
                'arms': ([(70, 95), (45, 92), (36, 110), (29, 128), (16, 147), (30, 152), (52, 156), (62, 140), (70, 118)], ((16, 147), (52, 156)), 0.75), 'cx': 101}
    def back(b):
        return {'cloth': TR(b, HM.TRAVEL_REF), 'cape': hsv_mask(b, (195, 250), s=(0.35, 1.1), y=(150, 999)), 'skirt': (160, 205, 292, 42, 72), 'cut': 222,
                'arms': ([(232, 140), (210, 128), (205, 150), (210, 175), (222, 196), (238, 202), (244, 186), (240, 160)], ((222, 196), (244, 186)), 0.65), 'cx': 160}
    return {'base': 'knight', 'menu': menu, 'back': back}


def cfg_kazuto():
    CL = ['#1f1714', '#3e2e26', '#64503f', '#8c7459', '#b39a7a']   # build_kazuto.CLOTH（鎧下）
    def menu(b):
        return {'cloth': HM.cloth_mask(b, CL), 'cape': hsv_mask(b, (340, 18), s=(0.35, 1.1), y=(90, 999)) & ~hsv_mask(b, x=(95, 155), y=(130, 230)), 'skirt': (124, 152, 242, 40, 70), 'cut': None,
                'arms': ([(85, 70), (62, 74), (52, 95), (46, 120), (38, 140), (52, 146), (74, 146), (82, 125), (88, 100)], ((38, 140), (74, 146)), 0.72), 'cx': 124}
    def back(b):
        return {'cloth': HM.cloth_mask(b, CL), 'cape': hsv_mask(b, (340, 18), s=(0.3, 1.1), y=(100, 999)), 'skirt': (172, 205, 290, 48, 78), 'cut': 215, 'arms': None, 'cx': 172}
    return {'base': 'warrior', 'menu': menu, 'back': back}


def cfg_gald():
    def menu(b):
        return {'cloth': hsv_mask(b, (15, 45), s=(0.3, 1.1), v=(0.12, 0.5), y=(150, 999)), 'cape': hsv_mask(b, (340, 18), s=(0.45, 1.1), v=(0.3, 1.1), y=(150, 999)), 'skirt': (128, 182, 256, 48, 84), 'cut': None, 'arms': None, 'cx': 128}
    def back(b):
        return {'cloth': hsv_mask(b, (15, 45), s=(0.3, 1.1), v=(0.12, 0.5), y=(200, 999)), 'cape': hsv_mask(b, (340, 18), s=(0.45, 1.1), v=(0.3, 1.1), y=(200, 999)), 'skirt': (157, 232, 292, 58, 86), 'cut': None, 'arms': None, 'cx': 157}
    return {'base': 'warrior', 'menu': menu, 'back': back}


def cfg_lina():
    def menu(b):
        return {'cloth': hsv_mask(b, (25, 70), s=(0.0, 0.45), v=(0.45, 1.1), y=(125, 999)), 'cape': None, 'skirt': None, 'cut': None, 'arms': None, 'cx': 97}
    def back(b):
        return {'cloth': hsv_mask(b, (25, 70), s=(0.0, 0.45), v=(0.45, 1.1), y=(170, 999)), 'cape': None, 'skirt': None, 'cut': None, 'arms': None, 'cx': 160}
    return {'base': 'priest', 'menu': menu, 'back': back}


def cfg_mina():
    def menu(b):
        return {'cloth': hsv_mask(b, s=(0, 0.35), v=(0.08, 0.42), y=(125, 999)), 'cape': None, 'skirt': (92, 172, 238, 26, 52), 'cut': None, 'arms': None, 'cx': 92}
    def back(b):
        return {'cloth': hsv_mask(b, s=(0, 0.35), v=(0.08, 0.42), y=(170, 999)), 'cape': None, 'skirt': (166, 222, 292, 30, 56), 'cut': None, 'arms': None, 'cx': 166}
    return {'base': 'thief', 'menu': menu, 'back': back}


def R(x0, y0, x1, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


# v9.9 頭（兜・帽子をかぶる位置）・肩（重鎧の肩当て）・盾を持つ前腕。cx・top（頭の上）・brow（額）・rx（頭の半幅）・neck（あご）・face（残す顔）・hair（隠れてよい髪）・own（元の帽子・頭巾）
EXTRA = {
    'hero': {'menu': {'head': {'cx': 66, 'top': 9, 'brow': 47, 'rx': 36, 'neck': 74, 'face': R(46, 46, 88, 80), 'hair': R(20, 0, 112, 52)}, 'shoulders': 'auto'},
             'back': {'head': {'cx': 157, 'top': 111, 'brow': 161, 'rx': 38, 'neck': 172, 'face': None, 'hair': R(110, 100, 205, 166)}, 'shoulders': 'auto'}},
    'kyle': {'menu': {'head': {'cx': 101, 'top': 12, 'brow': 57, 'rx': 36, 'neck': 92, 'face': [(76, 57), (126, 57), (128, 76), (118, 92), (84, 92), (74, 76)], 'hair': R(40, 0, 165, 62)}, 'shoulders': 'auto'},
             'back': {'head': {'cx': 160, 'top': 54, 'brow': 104, 'rx': 40, 'neck': 118, 'face': None, 'hair': R(100, 25, 222, 108)}, 'shoulders': 'auto'}},
    'kazuto': {'menu': {'head': {'cx': 127, 'top': 3, 'brow': 35, 'rx': 33, 'neck': 62, 'face': R(100, 30, 155, 64), 'hair': R(85, 0, 170, 40)}, 'shoulders': 'auto'},
               'back': {'head': {'cx': 166, 'top': 44, 'brow': 82, 'rx': 31, 'neck': 96, 'face': None, 'hair': R(128, 40, 204, 86)}, 'shoulders': 'auto'}},
    'gald': {'menu': {'head': {'cx': 128, 'top': 22, 'brow': 90, 'rx': 48, 'neck': 130, 'face': R(95, 85, 160, 135), 'hair': R(60, 10, 200, 95)}, 'shoulders': 'auto'},
             'back': {'head': {'cx': 152, 'top': 42, 'brow': 112, 'rx': 48, 'neck': 140, 'face': None, 'hair': R(90, 30, 215, 118)}, 'shoulders': 'auto'}},
    'lina': {'menu': {'head': {'cx': 103, 'top': 30, 'brow': 92, 'rx': 42, 'neck': 138, 'face': R(75, 88, 132, 140), 'hair': R(50, 20, 165, 96),
                               'own': [(55, 25), (160, 25), (165, 95), (130, 100), (103, 92), (75, 100), (50, 95)], 'hair_hsv': ((320, 360), (0.25, 1.1), (0.5, 1.1))},
                      'shoulders': [(72, 128, -1), (134, 128, 1)], 'offhand': (142, 192)},
             'back': {'head': {'cx': 148, 'top': 66, 'brow': 118, 'rx': 48, 'neck': 135, 'face': None, 'hair': R(95, 60, 200, 122), 'own': R(95, 60, 200, 122), 'hair_hsv': ((320, 360), (0.25, 1.1), (0.5, 1.1))},
                      'shoulders': [(115, 170, -1), (190, 170, 1)], 'offhand': (100, 196)}},
    'mina': {'menu': {'head': {'cx': 85, 'top': 25, 'brow': 75, 'rx': 38, 'neck': 115, 'face': R(55, 62, 105, 112), 'hair': R(40, 10, 135, 78)}, 'shoulders': [(68, 128, -1), (118, 124, 1)]},
             'back': {'head': {'cx': 150, 'top': 52, 'brow': 118, 'rx': 42, 'neck': 150, 'face': None, 'hair': R(95, 35, 205, 122)}, 'shoulders': [(125, 170, -1), (185, 170, 1)]}},
}


def cfg_hero():
    return {'base': 'warrior', 'menu': lambda b: {}, 'back': lambda b: {}}


def cfg_generic(base_job, menu, back):
    """v9.9 部品のなかった仲間：服・マントは色の決まり（hsv）、裾は (中心, 上, 裾, 上の半幅, 裾の半幅)"""
    def mk(c):
        def f(b):
            d = {'cloth': hsv_mask(b, *c['cloth']), 'cape': hsv_mask(b, *c['cape']) if c.get('cape') else None, 'skirt': c.get('skirt'), 'cut': c.get('cut'), 'arms': c.get('arms'), 'cx': c['cx']}
            if c.get('not'):
                for pts in c['not']: d['cloth'] &= ~P.poly_mask(b.shape[0], b.shape[1], pts)
            return d
        return f
    return {'base': base_job, 'menu': mk(menu), 'back': mk(back)}


GEN = {
    'seris': ('mage', {'cloth': ((215, 262), (0.3, 1.1), (0.08, 0.75), (128, 999)), 'cx': 112},
                      {'cloth': ((215, 262), (0.3, 1.1), (0.08, 0.75), (150, 999)), 'cx': 150}),
    'ganes': ('artisan', {'cloth': ((12, 42), (0.35, 1.1), (0.12, 0.55), (110, 999)), 'skirt': (156, 182, 286, 52, 86), 'cx': 156},
                         {'cloth': ((12, 42), (0.35, 1.1), (0.12, 0.55), (110, 999)), 'skirt': (176, 182, 286, 54, 86), 'cx': 176}),
    'ord': ('oath_knight', {'cloth': ((0, 360), (0, 0.22), (0.18, 0.72), (100, 999)), 'cape': ((340, 18), (0.35, 1.1), (0.12, 1.1), (100, 999)), 'skirt': (146, 186, 292, 44, 76), 'cx': 146},
                           {'cloth': ((0, 360), (0, 0.22), (0.18, 0.72), (100, 999)), 'cape': ((340, 18), (0.35, 1.1), (0.12, 1.1), (100, 999)), 'skirt': (166, 186, 292, 46, 78), 'cut': 205, 'cx': 166}),
}
EXTRA.update({
    'seris': {'menu': {'head': {'cx': 117, 'top': 48, 'brow': 92, 'rx': 42, 'neck': 130, 'face': R(80, 84, 155, 136), 'hair': R(10, 0, 210, 96),
                                'own': [(8, 0), (212, 0), (212, 104), (160, 110), (117, 90), (80, 100), (8, 118)], 'own_is_hat': True, 'hair_hsv': ((185, 215), (0.3, 1.1), (0.55, 1.1))},
                       'shoulders': [(84, 142, -1), (152, 142, 1)]},
              'back': {'head': {'cx': 150, 'top': 70, 'brow': 140, 'rx': 50, 'neck': 185, 'face': None, 'hair': R(60, 20, 245, 146),
                                'own': [(36, 10), (262, 10), (262, 150), (200, 165), (150, 152), (100, 162), (36, 152)], 'own_is_hat': True, 'hair_hsv': ((185, 215), (0.3, 1.1), (0.55, 1.1))},
                       'shoulders': [(118, 196, -1), (186, 196, 1)]}},
    'ganes': {'menu': {'head': {'cx': 167, 'top': 28, 'brow': 72, 'rx': 37, 'neck': 112, 'face': R(134, 62, 198, 116), 'hair': R(104, 14, 216, 78)}, 'shoulders': [(102, 132, -1), (226, 132, 1)]},
              'back': {'head': {'cx': 162, 'top': 30, 'brow': 84, 'rx': 36, 'neck': 112, 'face': None, 'hair': R(115, 22, 210, 92)}, 'shoulders': [(104, 134, -1), (222, 134, 1)]}},
    # v9.9.1 オルドの正面の頭の位置を読み直した（以前は 30 ドットほど右にずれていて、兜・帽子・額の輪が頭の右に寄っていた）
    'ord': {'menu': {'head': {'cx': 137, 'top': 26, 'brow': 62, 'rx': 32, 'neck': 98, 'face': R(112, 56, 166, 102), 'hair': R(100, 18, 176, 66)}, 'shoulders': [(98, 118, -1), (194, 118, 1)]},
            'back': {'head': {'cx': 168, 'top': 30, 'brow': 72, 'rx': 33, 'neck': 96, 'face': None, 'hair': R(128, 22, 208, 80)}, 'shoulders': [(112, 122, -1), (224, 122, 1)]}},
})
HS = lambda lo: ((25, 65), (0, 0.3), (0.62, 1.1), (lo, 999))
GEN.update({
    # v9.10 服の色の範囲から髪（暗い紺）を外した：明るさ 0.36 以上だけ。背面は髪の下に見える裾（y 215 から）だけ（以前は鎧・服の色で髪まで塗られていた）
    'lucia': ('waveblade', {'cloth': ((205, 240), (0.35, 1.1), (0.36, 0.8), (112, 999)), 'cx': 125}, {'cloth': ((205, 240), (0.35, 1.1), (0.36, 0.8), (215, 999)), 'cx': 165}),
    'elna': ('auditor', {'cloth': ((210, 260), (0.15, 1.1), (0.08, 0.5), (122, 999)), 'cx': 150}, {'cloth': ((210, 260), (0.15, 1.1), (0.08, 0.5), (112, 999)), 'cx': 170}),
    'nagi': ('navigator', {'cloth': ((210, 240), (0.3, 1.1), (0.15, 0.65), (128, 999)), 'cape': ((8, 30), (0.6, 1.1), (0.5, 1.1), (170, 999)), 'skirt': (152, 194, 286, 40, 74), 'cx': 152},
                          {'cloth': ((210, 240), (0.3, 1.1), (0.15, 0.65), (128, 999)), 'cape': ((8, 30), (0.6, 1.1), (0.5, 1.1), (170, 999)), 'skirt': (160, 194, 286, 42, 76), 'cx': 160}),
    'iris': ('surveyor', {'cloth': ((28, 50), (0.45, 1.1), (0.35, 0.9), (140, 999)), 'skirt': (156, 206, 292, 42, 74), 'cx': 156},
                         {'cloth': ((28, 50), (0.45, 1.1), (0.35, 0.9), (140, 999)), 'skirt': (162, 206, 292, 44, 76), 'cx': 162}),
    'sophia': ('chronomancer', {'cloth': HS(128), 'cx': 152}, {'cloth': HS(150), 'cx': 165}),
    'io': ('mechanist', {'cloth': HS(158), 'skirt': (152, 222, 292, 34, 60), 'cx': 152}, {'cloth': HS(160), 'skirt': (156, 228, 292, 36, 62), 'cx': 156}),
    'aster': ('spirit_warden', {'cloth': ((60, 110), (0.3, 1.1), (0.25, 0.85), (140, 999)), 'cx': 160}, {'cloth': ((60, 110), (0.3, 1.1), (0.25, 0.85), (145, 999)), 'cx': 165}),
    'mochipoyo': ('loop_trader', {'cloth': ((0, 360), (0, 0.35), (0.06, 0.38), (70, 999)), 'cx': 120}, {'cloth': ((0, 360), (0, 0.35), (0.06, 0.38), (95, 999)), 'cx': 175}),
})
for _k, (_nm, _nb) in {'lucia': (112, 160), 'elna': (122, 112), 'nagi': (128, 128), 'iris': (140, 140), 'sophia': (128, 150), 'io': (158, 160), 'aster': (140, 145), 'mochipoyo': (70, 95)}.items():
    EXTRA[_k] = {'menu': {'head': {'auto': _nm, 'span': 60}, 'shoulders': 'auto'}, 'back': {'head': {'auto': _nb, 'span': 60}, 'shoulders': 'auto'}}
CFG = {'kyle': cfg_kyle, 'kazuto': cfg_kazuto, 'gald': cfg_gald, 'lina': cfg_lina, 'mina': cfg_mina, 'hero': cfg_hero}
for _k, (_b, _m, _bk) in GEN.items(): CFG[_k] = (lambda b0=_b, m0=_m, k0=_bk: cfg_generic(b0, m0, k0))


def with_extra(aid, cf):
    """人ごとの決まりに、頭・肩・盾の決まり（EXTRA）を足す"""
    ex = EXTRA.get(aid, {})
    def wrap(f, e):
        return lambda b: dict(f(b), **e)
    return dict(cf, menu=wrap(cf['menu'], ex.get('menu', {})), back=wrap(cf['back'], ex.get('back', {})))
HJ = {'warrior': ('_cape', HM.pal('#b8a582', '#5a4a36', '#f3ecd6'), HM.pal('#b02424', '#4a0c0c', '#e86a5a')),
      'hunter': ('_cape', HM.pal('#55502a', '#2c2a16', '#b0a862'), HM.pal('#2f6e2a', '#10240f', '#78bf62')),
      'thief': ('_cape', HM.pal('#3c3c48', '#131317', '#7c7c90'), HM.pal('#2e2a54', '#0e0c1c', '#6a62a0'))}


def build_view(aid, A, vk, f):
    b, hand = load_view(aid, A, vk); c = f(b); parts = {}
    parts['jf_cloth_t'] = HM.gray_of(b, c['cloth'], out_lo=0.25, out_hi=0.95)
    if c.get('cape') is not None and c['cape'].any():
        parts['jf_cape_t'] = HM.gray_of(b, c['cape'])
        if c.get('cut'):
            parts['jf_x'], parts['jf_capeup_t'], parts['jf_capehem_t'], parts['jf_capehem_f'] = cape_cut(b, c['cape'], c['cut'], b)
        else:
            parts['jf_capeup_t'] = parts['jf_cape_t']
    if c.get('skirt'):
        cx, top, hem, ht, hh = c['skirt']; keep = hand.copy()
        parts['jf_skirt_t'], parts['jf_skirt_f'], _ = skirt(b, keep, cx, top, hem, ht, hh)
    if c.get('arms'):
        poly, op, lv = c['arms']; cx = c['cx']
        mir = lambda pts: [(int(round(2 * cx - x)), y) for x, y in pts]
        avoid = c['cape'] if (c.get('cape') is not None and vk == 'back') else np.zeros(b.shape[:2], bool)
        parts['jf_sleeve_t'], parts['jf_sleeve_f'] = HM.sleeves(b.shape[0], b.shape[1], [poly, mir(poly)], [op, tuple(mir(list(op)))], [lv, lv - 0.12], avoid)
    return parts


WEAPON_CLS = ['weapon_sword', 'weapon_dagger', 'weapon_axe', 'weapon_spear', 'weapon_bow', 'weapon_staff']


def gear_view(aid, A, vk, missing):
    """v9.8.9 足りない武器を、その人・その向きの握り（actor.json の grip）に合わせて描く（gear.py。大きさは体の高さに比例。主人公の比で）
       向き：握りが体の中心より左なら少し左へ、右なら右へ傾けて立てる。手（hand）は武器の上に描き直す（重ね方の hand）"""
    import build_hero as BH
    b, hand = load_view(aid, A, vk); Hh, Ww = b.shape[:2]; v = A['views'][vk]; gx, gy = v['grip']['x'], v['grip']['y']
    bb = P.bbox(P.opaque(b)); s = (bb[3] - bb[1]) / 196.0; cx = (bb[0] + bb[2]) / 2.0; left = gx < cx
    up = (-0.08, -0.997) if left else (0.08, -0.997); out = {}
    if 'weapon_sword' in missing: out['weapon_sword'] = GR.sword(Hh, Ww, (gx, gy), up, blade_len=92 * s, blade_w=max(7, 10 * s), tip=16 * s, guard_w=26 * s, guard_at=12 * s, pommel_at=-14 * s, pommel_r=max(3, 4 * s))
    if 'weapon_dagger' in missing: out['weapon_dagger'] = GR.sword(Hh, Ww, (gx, gy), up, blade_len=30 * s, blade_w=7, tip=10 * s, guard_w=15 * s, guard_at=11 * s, pommel_at=-10 * s, pommel_r=3)
    if 'weapon_axe' in missing: out['weapon_axe'] = GR.axe(Hh, Ww, (gx, gy), up, top=min(70 * s, gy - 4), bottom=22 * s, head=38 * s, reach=18 * s, side=1 if left else -1)
    if 'weapon_spear' in missing: out['weapon_spear'] = GR.spear(Hh, Ww, (gx, gy), up, top=min(150 * s, gy - 2), bottom=min(100 * s, Hh - gy - 2), head=34 * s, half=6.5 * s)
    if 'weapon_bow' in missing: out['weapon_bow'] = GR.bow(Hh, Ww, (gx, gy), up, length=104 * s, depth=14 * s, side=-1 if left else 1, limb_w=3.0)
    if 'weapon_staff' in missing:   # 杖：まっすぐ立てた柄と、頭の玉（玉は品の色で塗る灰色の層）
        top = int(max(12, gy - 0.62 * (bb[3] - bb[1]))); ground = int(min(Hh - 2, bb[3] - 2)); r = max(6, int(round(9 * s)))
        f = BH.pole(Hh, Ww, int(gx), top + r, ground, BH.WOOD); g, hf = BH.staff_head(Hh, Ww, int(gx), top, r)
        f = P.over(f, hf); f[g[..., 3] > 0] = 0; out['weapon_staff_t'], out['weapon_staff_f'] = g, f
    return out


def save(aid, sub, parts):
    d = os.path.join(EP, aid, sub); os.makedirs(d, exist_ok=True); rec = {}
    for k, arr in parts.items():
        cimg, x, y = P.crop_layer(arr)
        if cimg is None: continue
        p = os.path.join(d, k + '.png'); P.save(cimg, p); h = hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]
        rec[k] = {'url': os.path.relpath(p, ROOT).replace(os.sep, '/') + '?v=' + h, 'x': int(x), 'y': int(y), 'w': int(cimg.shape[1]), 'h': int(cimg.shape[0])}
    return rec


L_ROBE = [{'part': 'jf_x', 'erase': True, 'optional': True}, {'part': 'jf_capeup_t', 'tint': 'pal2', 'optional': True, 'region': 'cape'}, {'part': 'jf_cloth_t', 'tint': 'main', 'region': 'body'},
          {'part': 'jf_skirt_t', 'tint': 'main', 'optional': True, 'region': 'body'}, {'part': 'jf_skirt_f', 'optional': True, 'region': 'body'}]
FAM = {'_robe': {'z': 5, 'layers': L_ROBE, 'over': {'z': 45, 'layers': [{'part': 'jf_sleeve_t', 'tint': 'main', 'optional': True, 'region': 'sleeve'}, {'part': 'jf_sleeve_f', 'optional': True, 'region': 'sleeve'},
                                                                          {'part': 'jf_capehem_t', 'tint': 'pal2', 'optional': True, 'region': 'cape'}]}},
       '_coat': {'z': 5, 'layers': L_ROBE, 'over': {'z': 45, 'layers': [{'part': 'jf_capehem_t', 'tint': 'pal2', 'optional': True, 'region': 'cape'}]}},
       '_cape': {'z': 5, 'layers': [{'part': 'jf_cape_t', 'tint': 'pal2', 'optional': True, 'region': 'cape'}, {'part': 'jf_cloth_t', 'tint': 'main', 'region': 'body'}]}}
# v9.9 似た職業を戦闘の大きさで輪郭から見分ける：騎士の系統は肩当て（肩が角張って広い）、軽装の系統は肩の短いマント（肩が丸く、胸まで色の面）
CAPE_L = FAM['_cape']['layers']
FAM['_knight'] = {'z': 5, 'layers': CAPE_L + [{'part': 'jf_pl_t', 'tint': 'pal2', 'optional': True, 'region': 'shoulder'}, {'part': 'jf_pl_f', 'optional': True, 'region': 'shoulder'}]}
FAM['_mantle'] = {'z': 5, 'layers': CAPE_L + [{'part': 'jf_mt_t', 'tint': 'pal2', 'optional': True, 'region': 'shoulder'}, {'part': 'jf_mt_f', 'optional': True, 'region': 'shoulder'}]}
FAM_OF = {'knight': '_knight', 'oath_knight': '_knight', 'magicknight': '_knight', 'waveblade': '_mantle', 'monk': '_mantle', 'navigator': '_mantle', 'surveyor': '_mantle', 'hunter': '_mantle'}


HEAD_MATS = {'head_helm': {'z': 20, 'base': 'base_helm', 'layers': [{'part': 'head_helm_t', 'tint': 'main', 'grayRef': 'plate'}, {'part': 'head_helm_f'}]},
             'head_hat': {'z': 20, 'base': 'base_hat', 'layers': [{'part': 'head_hat_t', 'tint': 'main'}, {'part': 'head_hat_f'}]},
             'head_cap': {'z': 20, 'base': 'base_cap', 'layers': [{'part': 'head_cap_t', 'tint': 'main'}, {'part': 'head_cap_f', 'optional': True}]},
             'head_circlet': {'z': 21, 'layers': [{'part': 'head_circlet_t', 'tint': 'main'}, {'part': 'head_circlet_f'}]}}


def kit_view(aid, A, vk, c, need):
    """v9.9 足りない頭・盾・重鎧を、その人・その向きに合わせて描く（gear_kit.py）。頭は、かぶると隠れる髪だけを消した素の絵と組"""
    import gear_kit as GK
    b, hand = load_view(aid, A, vk); v = A['views'][vk]; out = {}; back = v.get('dir') == 'back'; hd = c.get('head')
    if hd and 'auto' in hd:   # 頭の位置を絵から決める：あごの行（neck）より上の、体の中心のまわりの不透明な所
        neck = hd['auto']; Hh, Ww = b.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]; cx0 = c.get('cx', Ww // 2)
        hm = P.opaque(b) & (yy < neck) & (np.abs(xx - cx0) < hd.get('span', 70)); x0, y0, x1, y1 = P.bbox(hm)
        cxh = (x0 + x1) / 2.0; rx = max(22, 0.40 * (x1 - x0)); top = y0 + 2; brow = int(top + 0.58 * (neck - top))
        hd = {'cx': int(cxh), 'top': int(top), 'brow': brow, 'rx': int(rx), 'neck': neck, 'face': None if back else R(int(cxh - rx * 0.62), brow - 8, int(cxh + rx * 0.62), neck + 3),
              'hair': R(int(x0) - 2, int(top) - 6, int(x1) + 2, brow + 4)}
        c = dict(c, head=hd)
    if c.get('shoulders') == 'auto' and hd:
        feet = P.bbox(P.opaque(b))[3]; L = feet - hd['neck']; cx0 = c.get('cx', b.shape[1] // 2)
        # v9.10 肩の位置は頭の幅から（体の長さから決めると、裾の長い人で肩当てが肘の外に浮いた）
        hx = hd['cx']; c = dict(c, shoulders=[(int(hx - 1.05 * hd['rx']), int(hd['neck'] + 0.30 * hd['rx']), -1), (int(hx + 1.05 * hd['rx']), int(hd['neck'] + 0.30 * hd['rx']), 1)])
    bb = P.bbox(P.opaque(b)); s = max(0.6, (bb[3] - hd['neck']) / 123.0) if hd else (bb[3] - bb[1]) / 196.0
    if hd: s = min(s, hd['rx'] / 34.0)   # v9.10 盾・肩当ての大きさは頭の幅を上限に（裾の長い人で盾が体を覆った）
    base_h = GK.hair_fill(b, hd, hsv_mask(b, *hd['hair_hsv'])) if hd and hd.get('own') else b   # 元の帽子・頭巾を消して髪を補った絵（兜・帽子をかぶるとき）
    if hd:
        hd = dict(hd); hd.setdefault('hat_by', hd['brow'] - 4); hd.setdefault('hat_rx', int(hd['rx'] * 1.38))
        if 'head_helm' in need: out['base_helm'], out['head_helm_t'], out['head_helm_f'] = GK.helm(base_h, hd, back)
        if 'head_cap' in need: out['base_cap'], out['head_cap_t'], out['head_cap_f'] = GK.cap(base_h, hd, back)
        if 'head_circlet' in need:
            out['head_circlet_t'], out['head_circlet_f'] = GK.circlet(base_h, hd, back)
            if hd.get('own'): out['base_nohat'] = base_h   # 元の帽子・頭巾の人：額の輪は帽子を外して髪を補った絵の上に
        if 'head_hat' in need:
            if hd.get('own') and hd.get('own_is_hat'):   # 元の絵がとんがり帽子の人（セリス）：その帽子を品の色で塗る
                # v9.9.1 前髪を塗らない：髪の色の幅を広げ（暗い髪の影も）、髪の中の細い線・影も髪として閉じる
                import knight as KN
                hair = hsv_mask(b, *hd['hair_hsv']) | hsv_mask(b, (180, 222), (0.25, 1.1), (0.38, 1.1)); hair = KN.close(hair, 3)
                out['own_hat_t'] = HM.gray_of(b, P.poly_mask(b.shape[0], b.shape[1], hd['own']) & P.opaque(b) & ~hair)
            else:
                bh, g, f = GK.witch(base_h, hd, back); out['base_hat'] = bh; out['head_hat_t'] = g; out['head_hat_f'] = f   # g・f は上へ TOP だけ大きい
    # v9.9 職業の輪郭：騎士の系統の肩当て（jf_pl）・軽装の系統の肩の短いマント（jf_mt）。全員に作る
    if hd and c.get('shoulders'):
        out['jf_pl_t'], out['jf_pl_f'] = GK.pauldrons(b, c['shoulders'], s)
        feet = P.bbox(P.opaque(b))[3]; out['jf_mt_t'], out['jf_mt_f'] = GK.mantle(b, hd, feet - hd['neck'], c.get('cx') or hd['cx'], back)
    oh = c.get('offhand') or (v.get('offhand') and (v['offhand']['x'], v['offhand']['y']))
    if 'shield' in need and oh:
        out['shield_gt'], out['shield_gf'] = GK.shield(b, oh, s, back)
    if 'armor_heavy' in need and c.get('shoulders') and not back:   # v9.10 背面は肩当てを足さない（髪の上に灰色の塊として浮いて見えた。背面の重鎧は服の塗り分けだけ）
        out['hv_pl_t'], out['hv_pl_f'] = GK.pauldrons(b, c['shoulders'], s)
    return out


def save_ext(aid, sub, parts, top):
    rec = save(aid, sub, {k: v for k, v in parts.items() if v.shape[0] == top + 0 or True})
    return rec


def run(ids=None):
    import manifest, gear_kit as GK, build_party as BPY
    for aid in (ids or [k for k in CFG if os.path.exists(os.path.join(EP, k, 'actor.json'))]):
        ap = os.path.join(EP, aid, 'actor.json'); A = json.load(open(ap, encoding='utf8')); cf = with_extra(aid, CFG[aid]())
        MV = A.get('menuBase') or 'menu'; views = (MV, 'back'); hero = aid == 'hero'
        # 前に描き足した部品・重ね方を外してから、元からある部品で「足りない種類」を決める
        for vk in list(A['views']):
            for k in list(A['views'][vk]['parts']):
                if k in A.get('generated', []) or (k.startswith('jf_') and not hero): del A['views'][vk]['parts'][k]
        mats = A.setdefault('materials', {})
        for k in [k for k, m in mats.items() if m.get('generated')]: del mats[k]
        gen = []
        def put(vk, rec):
            A['views'][vk]['parts'].update(rec); gen.extend(k for k in rec if k not in gen)
            if vk == MV:   # 勝利の正面（メニュー正面の部品を座標だけずらして使う）
                fv = A['views']['front']; r0 = A['views'][MV]['parts']['base_plain']; r1 = fv['parts']['base_plain']; dx, dy = r1['x'] - r0['x'], r1['y'] - r0['y']
                fv['parts'].update({k: dict(v, x=v['x'] + dx, y=v['y'] + dy) for k, v in rec.items()})
        have = set(A['views'][MV]['parts'])
        if not hero:
            for vk in views: put(vk, save(aid, vk, build_view(aid, A, vk, cf['menu' if vk == MV else 'back'])))
            miss = [c for c in WEAPON_CLS if not ((c in have) or (c + '_t' in have))]
            for vk in views: put(vk, save(aid, vk, gear_view(aid, A, vk, miss) if miss else {}))
            for c in miss:
                mats[c] = ({'z': 40, 'hand': True, 'generated': True, 'layers': [{'part': 'weapon_staff_t', 'tint': 'orb'}, {'part': 'weapon_staff_f'}]} if c == 'weapon_staff'
                           else {'z': 40, 'hand': True, 'generated': True, 'layers': [{'part': c}]})
        # 頭・盾・重鎧（v9.9）
        need = [c for c, part in (('head_helm', 'head_helm_t'), ('head_hat', 'head_hat_t'), ('head_cap', 'head_cap_t'), ('head_circlet', 'head_circlet_t'), ('shield', None), ('armor_heavy', None)) if (part and part not in have) or
                (c == 'shield' and not ({'shield', 'shield_t', 'shield_f'} & have)) or (c == 'armor_heavy' and not ({'armor_heavy_t', 'armor_shape_f'} & have))]
        if aid == 'lina': need = [c for c in need if c != 'head_cap']   # リーナの頭巾（head_cap）は元からある
        for vk in views:
            kp = kit_view(aid, A, vk, cf['menu' if vk == MV else 'back'](load_view(aid, A, vk)[0]), need)
            tall = {k: v for k, v in kp.items() if v.shape[0] != A['views'][vk]['h']}; flat = {k: v for k, v in kp.items() if k not in tall}
            rec = save(aid, vk, flat); rec2 = save(aid, vk, tall)
            for k in rec2: rec2[k]['y'] -= GK.TOP
            rec.update(rec2); put(vk, rec)
        own_hat = any('own_hat_t' in A['views'][vk]['parts'] for vk in views)
        for c in need:
            if c == 'head_hat' and own_hat: mats[c] = {'z': 20, 'generated': True, 'layers': [{'part': 'own_hat_t', 'tint': 'main'}]}
            elif c == 'head_circlet' and any('base_nohat' in A['views'][vk]['parts'] for vk in views): mats[c] = dict(HEAD_MATS[c], base='base_nohat', generated=True)
            elif c in HEAD_MATS: mats[c] = dict(HEAD_MATS[c], generated=True)
            elif c == 'shield': mats[c] = {'z': 30, 'generated': True, 'layers': [{'part': 'shield_gt', 'tint': 'main', 'grayRef': 'iron'}, {'part': 'shield_gf'}]}
            elif c == 'armor_heavy': mats[c] = {'z': 10, 'covers': ['body'], 'generated': True, 'layers': [{'part': 'jf_cloth_t', 'tint': 'main', 'grayRef': 'plate'}, {'part': 'hv_pl_t', 'tint': 'main', 'grayRef': 'plate', 'optional': True}, {'part': 'hv_pl_f', 'optional': True}]}
        if not hero:
            # ローブの品（その人のローブの部品がない人）：職業の服の裾・袖と同じ形を品の色で。背面のマントは腰で短くし、元のマントの色の裾
            if 'armor_robe_t' not in have:
                mats['armor_robe'] = {'z': 10, 'covers': ['body', 'sleeve'], 'generated': True,
                                      'layers': [{'part': 'jf_x', 'erase': True, 'optional': True}, {'part': 'jf_capehem_f', 'optional': True}, {'part': 'jf_cloth_t', 'tint': 'main'},
                                                 {'part': 'jf_skirt_t', 'tint': 'main', 'optional': True}, {'part': 'jf_skirt_f', 'optional': True}],
                                      'over': {'z': 45, 'layers': [{'part': 'jf_sleeve_t', 'tint': 'main', 'optional': True}, {'part': 'jf_sleeve_f', 'optional': True}]}}
            # 軽装の部品がない人：服を品の色で塗る（形は元の服のまま）
            if 'armor_light_t' not in have and 'armor_light' not in mats:
                mats['armor_light'] = {'z': 10, 'covers': ['body'], 'generated': True, 'layers': [{'part': 'jf_cloth_t', 'tint': 'main'}]}
            J = dict(FAM)
            for j, (fam, p1, p2) in list(HM.JOB_LOOKS.items()) + list(HJ.items()):
                if j != cf['base']: J[j] = {'like': FAM_OF.get(j, fam), 'pal': p1, 'pal2': p2}
            A['jobs'] = J
        # ローブの品は胴・袖を覆う（職業の服の胴・袖は描かない）。重鎧・軽装は胴を覆う（人ごとの重ね方にも同じ覆う部位）
        COV = {'armor_robe': ['body', 'sleeve'], 'armor_light': ['body'], 'armor_heavy': ['body', 'shoulder']}
        for k, m in mats.items():
            if k in COV: m['covers'] = COV[k]
        A['generated'] = gen
        for vk in views:
            if A['views'][vk].get('frame') is not None or not hero: A['views'][vk]['frame'] = BPY.frame_of(A['views'][vk])
        json.dump(A, open(ap, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print(aid, 'need', need, 'jobs', len([k for k in A.get('jobs', {}) if not k.startswith('_')]))
    manifest.write()


if __name__ == '__main__':
    run(sys.argv[1:] or None)
