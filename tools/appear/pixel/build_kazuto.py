# v9.8.2 装備の外見（ドット絵の差分）：カズトの「メニュー正面（companions/kazuto.png 249×258）」「戦闘の背面（party-directions-add68 の kazuto/back.png）」
#   戦闘の正面（勝利の振り向き）は kazuto/front.png が kazuto.png と同じ絵を (40, 46) に置いたもの（違うドット 0）なので、メニュー正面の部品を座標だけずらして使う
#   元の絵は読むだけ。部品は assets/characters/equip-pixels/kazuto/<向き>/、カズトの対応表は kazuto/actor.json に書き、manifest.py でまとめる
#   python3 tools/appear/pixel/build_kazuto.py [確かめの絵の出力フォルダ]
#
#   部品（作り方は knight.py。カイルと同じ部品の名前）
#     base_plain      素の絵：剣・盾を外して後ろを補い（盾の後ろの左腕は右腕を鏡に写す）、板金を「鎧下（濃い茶の綿入れ）」、籠手を革の手袋、脛当てを革の靴にしたもの
#                     赤い襟巻き・マント・白い前垂れ・髪はそのまま
#     armor_shape_f / armor_heavy_t / armor_light_t   重鎧（元の板金）・色のある品の灰色の層・軽装
#     weapon_sword    剣：元の絵から切り離した大剣（どの剣も同じ形）。背面は元の絵に剣がない（体の前）ので、正面の剣を左右に返して右手の先に置く
#     weapon_spear・weapon_axe   槍・斧：gear.py で描いたもの（右の拳で持つ）
#     shield_f/t/e    盾：元の盾・面（色のある品は品の色）・縁と十字
#     hand            武器を握る右の拳
import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pxlib as P
import build_hero as H
import gear as GR
import knight as K

ROOT = H.ROOT
OUT = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels', 'kazuto')
CHECK = sys.argv[1] if len(sys.argv) > 1 else None
FRONT_SRC = 'assets/characters/companions/kazuto.png'
FRONT_BATTLE_SRC = 'assets/characters/party-directions-add68/sprites/kazuto/front.png'
BACK_SRC = 'assets/characters/party-directions-add68/sprites/kazuto/back.png'
FDX, FDY = 40, 46
CLOTH = ['#1f1714', '#3e2e26', '#64503f', '#8c7459', '#b39a7a']     # 鎧下（濃い茶の綿入れ）：白い前垂れ・赤いマントと見分けられる色
BOOTS = ['#140d0a', '#2c1c14', '#4a3020', '#6a4630', '#8a6044']

BLADE_F = ((45.1, 177.5), (2.0, 254.2))      # 刃の中心の線（鍔の側 → 刃先）。輪郭込みで幅 約 25 ドット
CX_F, CX_B = 123, 174                         # 体の中心（盾の後ろを、反対側を鏡に写して描く）
GRIP_F = (56, 146)                            # 右の拳の中心（剣・槍・斧の握り）
GRIP_B = (251, 181)                           # 背面：右手はマントの陰（見える籠手の先）


def red(a):
    h, s, v = P.hsv(a); return P.opaque(a) & ((h <= 16) | (h >= 340)) & (s > 0.38)


def masks_front(o):
    S = o.shape; op = P.opaque(o)
    fist = K.poly(S, [(45, 133), (55, 127), (66, 130), (69, 146), (65, 160), (52, 162), (45, 152)]) & op
    blade = K.band(S, BLADE_F[0], BLADE_F[1], 12.6, taper=0.78)
    guard = (K.band(S, (24, 146), (80, 182), 6.5) | K.band(S, (40, 158), (62, 178), 8) | (K.band(S, (28, 147), (52, 158), 7) & ~K.poly(S, [(45, 133), (55, 127), (66, 130), (69, 146), (65, 160), (52, 162), (45, 152)]))) & op   # 鍔（刃に直角の横木）と、拳の下の柄・玉
    sword = K.with_outline(o, (blade | guard) & op & ~fist, 2) & ~fist
    h, s_, v = P.hsv(o)
    sword_part = sword & (blade | ~((s_ < 0.2) & (v > 0.45)))      # 部品にする剣：鍔の範囲の銀色（籠手）は入れない
    shield = K.poly(S, [(156, 92), (164, 82), (196, 74), (226, 66), (233, 70), (239, 80), (240, 150), (238, 200), (231, 226), (221, 240), (213, 240), (196, 226), (176, 192), (163, 145), (158, 112)]) & op
    shield = K.with_outline(o, shield, 2)
    return {'shield': shield, 'sword': sword, 'fist': fist, 'sword_part': sword_part}


def masks_back(o):
    S = o.shape; op = P.opaque(o)
    shield = K.poly(S, [(66, 124), (80, 116), (130, 113), (150, 118), (151, 150), (149, 230), (141, 262), (126, 286), (111, 298), (95, 291), (80, 270), (70, 240), (65, 180)]) & op
    shield = K.with_outline(o, shield, 2)
    fist = K.poly(S, [(236, 154), (246, 152), (252, 160), (252, 178), (244, 182), (236, 172)]) & op
    return {'shield': shield, 'fist': fist}


def mirror_mask(m, cx):
    Hh, Ww = m.shape; out = np.zeros_like(m); ys, xs = np.where(m)
    sx = np.round(2 * cx - xs).astype(int); ok = (sx >= 0) & (sx < Ww); out[ys[ok], sx[ok]] = True
    return out


def flip_place(layer, grip_src, dst_shape, grip_dst):
    """layer を左右に返し、grip_src（元の座標）が grip_dst に来るように dst_shape の層へ置く"""
    Hs, Ws = layer.shape[:2]; f = layer[:, ::-1]
    gx, gy = Ws - 1 - grip_src[0], grip_src[1]
    dx, dy = grip_dst[0] - gx, grip_dst[1] - gy
    out = P.blank(dst_shape[0], dst_shape[1])
    ys, xs = np.where(f[..., 3] > 0); ty, tx = ys + dy, xs + dx
    ok = (ty >= 0) & (ty < dst_shape[0]) & (tx >= 0) & (tx < dst_shape[1])
    out[ty[ok], tx[ok]] = f[ys[ok], xs[ok]]
    return out


def build_front(o):
    S = o.shape; Hh, Ww = S[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]
    M = masks_front(o)
    w1, _, _ = K.remove(o, M['sword'], close_k=8, up=K.poly(S, [(53, 160), (84, 168), (84, 236), (53, 236)]), keep=K.poly(S, [(56, 162), (84, 170), (84, 236), (53, 236), (53, 190)]), drop=K.box(S, 0, 150, 52, 240),
                        reflect=[(K.band(S, BLADE_F[0], BLADE_F[1], 14), BLADE_F[0], BLADE_F[1], 13.4)])
    wl, filled, target = K.remove(w1, M['shield'], mirror=[(M['shield'], CX_F)], close_k=8)
    lfist = mirror_mask(M['fist'], CX_F) & P.opaque(wl)
    head = K.poly(S, [(88, 0), (165, 0), (165, 56), (150, 64), (128, 70), (104, 64), (88, 52)])
    tabard = K.poly(S, [(104, 140), (140, 140), (140, 226), (104, 226)])
    keep = head | tabard | red(wl)
    belt = K.box(S, 92, 116, 152, 142) & P.opaque(wl)
    cfg = {'body_y': 58, 'keep': keep, 'belt': belt, 'legs_y': 220, 'glove': (M['fist'] | lfist) & P.opaque(wl), 'sigma': 3.0,
           'hand': M['fist'], 'shield': M['shield'], 'shield_face': (red(o) | (P.lum(o) < 90)) & ~H.is_gold(o), 'sword': M['sword_part']}
    pr, zone, plate = K.parts(o, wl, cfg, CLOTH, BOOTS)
    pr['weapon_spear'] = GR.spear(Hh, Ww, GRIP_F, (-0.08, -0.997), top=150, bottom=98, head=36, half=7, shaft_w=2.5)
    pr['weapon_axe'] = GR.axe(Hh, Ww, GRIP_F, (-0.12, -0.993), top=72, bottom=26, head=44, reach=22, side=-1, shaft_w=2.6, spike_len=8)
    return pr, wl, M, zone


def build_back(o, front_sword):
    S = o.shape; Hh, Ww = S[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]
    M = masks_back(o)
    wl, filled, target = K.remove(o, M['shield'], mirror=[(M['shield'], CX_B)], close_k=8)
    head = K.poly(S, [(130, 40), (195, 40), (195, 100), (130, 100)])
    keep = head | red(wl)
    cfg = {'body_y': 100, 'keep': keep, 'belt': np.zeros(S[:2], bool), 'legs_y': 262, 'glove': M['fist'] & P.opaque(wl), 'sigma': 3.0,
           'hand': M['fist'], 'shield': M['shield'], 'shield_face': (red(o) | (P.lum(o) < 90)) & ~H.is_gold(o), 'sword': None}
    pr, zone, plate = K.parts(o, wl, cfg, CLOTH, BOOTS)
    pr['weapon_sword'] = flip_place(front_sword, GRIP_F, S[:2], GRIP_B)
    pr['weapon_spear'] = GR.spear(Hh, Ww, GRIP_B, (0.08, -0.997), top=150, bottom=98, head=36, half=7, shaft_w=2.5)
    pr['weapon_axe'] = GR.axe(Hh, Ww, GRIP_B, (0.1, -0.995), top=72, bottom=26, head=44, reach=22, side=1, shaft_w=2.6, spike_len=8)
    return pr, wl, M, zone


def overlay(o, ms):
    v = o.copy(); dim = ~np.any(np.stack(list(ms.values())), 0)
    v[dim] = (v[dim] * [0.4, 0.4, 0.4, 1]).astype(np.int32)
    cols = {'shield': (255, 60, 60), 'sword': (60, 255, 60), 'fist': (60, 160, 255)}
    for k, m in ms.items():
        if k not in cols: continue
        v[m, :3] = cols.get(k, (255, 255, 0)); v[m, 3] = 255
    return v


def compose(pr, keys):
    a = pr['base_plain'].copy()
    for k in keys: a = P.over(a, pr[k])
    return a


if __name__ == '__main__':
    fo = P.load(os.path.join(ROOT, FRONT_SRC)); bo = P.load(os.path.join(ROOT, BACK_SRC))
    H.set_texture(fo, (100, 80, 140, 110))   # 胸当ての板金のムラ
    pf, fw, mf, zf = build_front(fo); pb, bw, mb, zb = build_back(bo, pf['weapon_sword'])
    if CHECK:
        os.makedirs(CHECK, exist_ok=True)
        rows = []
        for nm, o, pr, wl, M in (('front', fo, pf, fw, mf), ('back', bo, pb, bw, mb)):
            rows.append([('orig', o), ('mask', overlay(o, M)), ('removed', wl), ('plain', pr['base_plain']),
                         ('heavy+sword+shield', compose(pr, ['armor_shape_f', 'shield_f', 'weapon_sword'])),
                         ('plain+axe', compose(pr, ['weapon_axe', 'hand'])), ('plain+spear', compose(pr, ['weapon_spear', 'hand']))])
        K.check_sheet(os.path.join(CHECK, 'kazuto_check.png'), rows, 2)
        print('check', CHECK)
    actor, recF, recB = K.export('kazuto', OUT, (FRONT_SRC, FRONT_BATTLE_SRC, BACK_SRC), (FDX, FDY), pf, pb, {
        'menu': {'grip': GRIP_F, 'offhand': (198, 155), 'pivot': [124, 257]}, 'back': {'grip': GRIP_B, 'offhand': (108, 205)},
        'order': {'grip': '剣：拳の下に鍔（剣を後に描く）／槍・斧：柄の上に拳を描き直す', 'offhand': '盾：左の拳と前腕の上（体・鎧の後に描く）', 'grip_back': '剣：正面の剣を左右に返して右手（マントの陰）の先に置く／槍・斧：柄の上に拳を描き直す', 'offhand_back': '盾：左腕の外側（体の後ろの左腕の上）'}})
    import manifest
    manifest.write()
    print('kazuto menu', len(recF), 'back', len(recB))
