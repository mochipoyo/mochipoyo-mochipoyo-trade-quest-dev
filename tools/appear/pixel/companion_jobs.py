# v9.8.9 装備の外見（ドット絵の差分）：仲間（リーナ・ガルド・カイル・カズト・ミナ）の職業の服
#   python3 tools/appear/pixel/companion_jobs.py   （build_<人物>.py のあとに動かす。部品を足し、<人物>/actor.json の jobs と parts を書き足して manifest を書く）
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


CFG = {'kyle': cfg_kyle, 'kazuto': cfg_kazuto, 'gald': cfg_gald, 'lina': cfg_lina, 'mina': cfg_mina}
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


def run(ids=None):
    import manifest
    for aid in (ids or list(CFG)):
        ap = os.path.join(EP, aid, 'actor.json'); A = json.load(open(ap, encoding='utf8')); cf = CFG[aid]()
        for vk in ('menu', 'back'):
            rec = save(aid, vk, build_view(aid, A, vk, cf[vk]))
            for k in list(A['views'][vk]['parts']):
                if k.startswith('jf_'): del A['views'][vk]['parts'][k]
            A['views'][vk]['parts'].update(rec)
            if vk == 'menu':   # 勝利の正面（メニュー正面の部品を座標だけずらして使う）
                fv = A['views']['front']; r0 = A['views']['menu']['parts']['base_plain']; r1 = fv['parts']['base_plain']; dx, dy = r1['x'] - r0['x'], r1['y'] - r0['y']
                for k in list(fv['parts']):
                    if k.startswith('jf_'): del fv['parts'][k]
                fv['parts'].update({k: dict(v, x=v['x'] + dx, y=v['y'] + dy) for k, v in rec.items()})
        # v9.8.9 足りない武器（その人の部品がない種類）を描き足す。重ね方は人ごと（柄の上に手を描き直す）
        mats = A.setdefault('materials', {}); have = set(A['views']['menu']['parts'])
        miss = [c for c in WEAPON_CLS if not ((c in have) or (c + '_t' in have)) or (mats.get(c, {}).get('generated'))]
        for vk in ('menu', 'back'):
            gp = gear_view(aid, A, vk, miss) if miss else {}
            rec = save(aid, vk, gp); A['views'][vk]['parts'].update(rec)
            if vk == 'menu':
                fv = A['views']['front']; r0 = A['views']['menu']['parts']['base_plain']; r1 = fv['parts']['base_plain']; dx, dy = r1['x'] - r0['x'], r1['y'] - r0['y']
                fv['parts'].update({k: dict(v, x=v['x'] + dx, y=v['y'] + dy) for k, v in rec.items()})
        for c in miss:
            mats[c] = ({'z': 40, 'hand': True, 'generated': True, 'layers': [{'part': 'weapon_staff_t', 'tint': 'orb'}, {'part': 'weapon_staff_f'}]} if c == 'weapon_staff'
                       else {'z': 40, 'hand': True, 'generated': True, 'layers': [{'part': c}]})
        # v9.8.9 ローブの品（その人のローブの部品がない人）：職業の服の裾・袖と同じ形を品の色で。背面のマントは腰で短くし、元のマントの色の裾
        if 'armor_robe_t' not in have and cf['menu'] is not None:
            mats['armor_robe'] = {'z': 10, 'covers': ['body', 'sleeve'], 'generated': True,
                                  'layers': [{'part': 'jf_x', 'erase': True, 'optional': True}, {'part': 'jf_capehem_f', 'optional': True}, {'part': 'jf_cloth_t', 'tint': 'main'},
                                             {'part': 'jf_skirt_t', 'tint': 'main', 'optional': True}, {'part': 'jf_skirt_f', 'optional': True}],
                                  'over': {'z': 45, 'layers': [{'part': 'jf_sleeve_t', 'tint': 'main', 'optional': True}, {'part': 'jf_sleeve_f', 'optional': True}]}}
        # 軽装の部品がない人（ミナ）：服を品の色で塗る（形は元の服のまま）
        if 'armor_light_t' not in have and 'armor_light' not in mats:
            mats['armor_light'] = {'z': 10, 'covers': ['body'], 'generated': True, 'layers': [{'part': 'jf_cloth_t', 'tint': 'main'}]}
        J = dict(FAM)
        for j, (fam, p1, p2) in list(HM.JOB_LOOKS.items()) + list(HJ.items()):
            if j != cf['base']: J[j] = {'like': fam, 'pal': p1, 'pal2': p2}
        A['jobs'] = J
        # ローブの品は胴・袖を覆う（職業の服の胴・袖は描かない）。重鎧・軽装は胴を覆う（人ごとの重ね方にも同じ覆う部位）
        COV = {'armor_robe': ['body', 'sleeve'], 'armor_light': ['body'], 'armor_heavy': ['body']}
        for k, m in (A.get('materials') or {}).items():
            if k in COV: m['covers'] = COV[k]
        json.dump(A, open(ap, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print(aid, 'jobs', len([k for k in J if not k.startswith('_')]))
    manifest.write()


if __name__ == '__main__':
    run(sys.argv[1:] or None)
