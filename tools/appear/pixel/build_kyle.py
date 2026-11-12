# v9.8.2 装備の外見（ドット絵の差分）：カイルの「メニュー正面（companions/kyle.png 218×265）」「戦闘の背面（party-directions-v3 の kyle/back.png）」
#   戦闘の正面（勝利の振り向き）は kyle/front.png が kyle.png と同じ絵を (51, 39) に置いたもの（透明でない所の色・透明度は差 0。
#   透明な所の見えない色だけが違う）なので、メニュー正面の部品を座標だけずらして使う
#   元の絵は読むだけ。部品は assets/characters/equip-pixels/kyle/<向き>/、カイルの対応表は kyle/actor.json に書き、manifest.py でまとめる
#   python3 tools/appear/pixel/build_kyle.py [確かめの絵の出力フォルダ]
#
#   部品（どれも元の絵と同じ座標。作り方は knight.py）
#     base_plain      素の絵：剣・盾を外して後ろを補い（盾の後ろの左腕は右腕を鏡に写す）、板金を「生成りの鎧下」、籠手を革の手袋、脛当てを革の靴にしたもの
#                     青いマント・襟巻き・前垂れ・髪はそのまま
#     armor_shape_f   重鎧：元の板金・金の縁取り（灰色の品はこの色のまま）／armor_heavy_t：色のある品の灰色の層
#     armor_light_t   軽装：同じ形で、明るさをしぼって品の色
#     weapon_sword    剣：元の絵から切り離した剣（どの剣も同じ形）
#     weapon_spear    槍：gear.spear で描いた槍（右の拳で立てて持つ）
#     shield_f/t/e    盾：元の盾（灰色の品はこのまま）・面（色のある品は品の色）・縁と紋章
#     hand            武器を握る右の拳（槍の柄の上に描き直す）
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
OUT = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels', 'kyle')
CHECK = sys.argv[1] if len(sys.argv) > 1 else None
FRONT_SRC = 'assets/characters/companions/kyle.png'
FRONT_BATTLE_SRC = 'assets/characters/party-directions-v3/sprites/kyle/front.png'
BACK_SRC = 'assets/characters/party-directions-v3/sprites/kyle/back.png'
FDX, FDY = 51, 39
CLOTH = H.TRAVEL     # 鎧下（生成りの綿入れ）：主人公の旅装と同じ生成りの麻の色


def hsv(a):
    return P.hsv(a)


def blue(a):
    h, s, v = hsv(a); return P.opaque(a) & (h >= 195) & (h <= 250) & (s > 0.35)


def hair(a, y_max):
    h, s, v = hsv(a); Hh, Ww = a.shape[:2]; yy = np.mgrid[0:Hh, 0:Ww][0]
    return P.opaque(a) & (h >= 25) & (h <= 62) & (s > 0.4) & (v > 0.5) & (yy < y_max)


def masks_front(o):
    S = o.shape; op = P.opaque(o); gold = H.is_gold(o)
    shield = K.poly(S, [(134, 122), (146, 115), (170, 108), (196, 100), (205, 104), (206, 150), (201, 178), (191, 200), (181, 217), (171, 217), (160, 201), (148, 179), (140, 156), (135, 136)]) & op
    shield = K.with_outline(o, shield, 2)
    blade = K.band(S, BLADE_F[0], BLADE_F[1], 9.6, taper=0.8)
    guard = K.box(S, 26, 152, 64, 195) & gold
    pommel = K.box(S, 8, 140, 23, 164) & op
    fist = K.poly(S, [(19, 151), (30, 146), (46, 149), (52, 156), (50, 168), (42, 174), (28, 173), (20, 166)]) & op & ~guard
    sword = K.with_outline(o, (blade | guard | pommel) & op & ~fist, 2) & ~fist
    return {'shield': shield, 'sword': sword, 'fist': fist}


def masks_back(o):
    S = o.shape; op = P.opaque(o); gold = H.is_gold(o); h, s, v = hsv(o)
    silver = (s < 0.22) & (v > 0.45)
    cape = blue(o) & (v > 0.38)
    shield = K.poly(S, [(42, 146), (56, 141), (80, 146), (86, 152), (84, 190), (80, 218), (70, 242), (58, 249), (46, 242), (42, 205)]) & op & ~silver & ~cape
    shield = K.with_outline(o, shield, 1) & ~silver & ~cape
    blade = K.band(S, BLADE_B[0], BLADE_B[1], 9.5, taper=0.75)
    guard = K.box(S, 212, 204, 249, 227) & gold
    pommel = K.box(S, 236, 181, 253, 199) & (gold | (P.lum(o) < 90)) & op
    fist = K.poly(S, [(217, 194), (231, 190), (244, 195), (247, 208), (238, 215), (222, 213)]) & op & ~gold
    sword = K.with_outline(o, (blade | guard | pommel) & op & ~fist, 2) & ~fist
    return {'shield': shield, 'sword': sword, 'fist': fist}


CX_F, CX_B = 101, 160
BLADE_F = ((46.3, 173.6), (136.5, 240.2))
BLADE_B = ((235.8, 213.4), (289.0, 283.6))   # 背面の刃（柄の側 → 刃先）   # 刃の中心の線（柄の側 → 刃先）。刃の幅は輪郭込みで約 19 ドット


def build_front(o):
    S = o.shape; Hh, Ww = S[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]
    M = masks_front(o)
    # 1) 剣を消す：刃は帯の縁で折り返し、鍔の所（拳の下）はまわりの色から補う  2) 盾を消す：盾の後ろの左腕は、剣を消した右腕を鏡に写す
    guard_box = K.box(S, 24, 148, 66, 197)
    w1, _, _ = K.remove(o, M['sword'], close_k=8, keep=K.box(S, 26, 160, 66, 198), reflect=[(K.band(S, BLADE_F[0], BLADE_F[1], 11.5) & ~guard_box, BLADE_F[0], BLADE_F[1], 10.6)])
    wl, filled, target = K.remove(w1, M['shield'], mirror=[(M['shield'] & (yy < 230), CX_F)], close_k=8)
    lfist = np.zeros((Hh, Ww), bool); ys, xs = np.where(M['fist'])
    for y, x in zip(ys, xs):
        sx = int(round(2 * CX_F - x))
        if 0 <= sx < Ww: lfist[y, sx] = True
    lfist &= P.opaque(wl)
    belt = K.box(S, 84, 142, 142, 160) & P.opaque(wl) & ~blue(wl)
    head = K.poly(S, [(40, 0), (170, 0), (170, 70), (150, 84), (128, 90), (100, 93), (74, 90), (55, 84), (40, 74)])
    cfg = {'body_y': 84, 'keep': (hair(o, 100) & head) | blue(wl), 'belt': belt, 'legs_y': 222, 'glove': (M['fist'] | lfist | belt) & P.opaque(wl),
           'hand': M['fist'], 'shield': M['shield'], 'shield_face': blue(o), 'sword': M['sword']}
    pr, zone, plate = K.parts(o, wl, cfg, CLOTH)
    pr.update(K.helm_parts(pr['base_plain'], 101, 12, 57, 36, head=[(40, 0), (165, 0), (165, 78), (140, 92), (62, 92), (40, 78)],
                           face=[(76, 57), (126, 57), (128, 76), (118, 92), (84, 92), (74, 76)], cheek=(65, 77, 125, 137, 84)))
    pr['weapon_spear'] = GR.spear(Hh, Ww, (35, 160), (-0.06, -0.998), top=152, bottom=100, head=34, half=6.5, shaft_w=2.4)
    return pr, wl, M, zone


def build_back(o):
    S = o.shape; Hh, Ww = S[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]
    M = masks_back(o)
    rm = M['shield'] | M['sword']
    wl, filled, target = K.remove(o, rm, close_k=6, reflect=[(K.band(S, BLADE_B[0], BLADE_B[1], 11), BLADE_B[0], BLADE_B[1], 10.4)])
    lfist = K.box(S, 84, 198, 106, 220) & P.opaque(wl) & (hsv(wl)[1] < 0.25)
    head = K.poly(S, [(100, 20), (230, 20), (230, 100), (200, 116), (120, 116), (100, 100)])
    cfg = {'body_y': 116, 'keep': (hair(o, 120) & head) | blue(wl), 'belt': np.zeros(S[:2], bool), 'legs_y': 262, 'glove': (M['fist'] | lfist) & P.opaque(wl),
           'hand': M['fist'], 'shield': M['shield'], 'shield_face': (P.lum(o) < 95) & ~H.is_gold(o), 'sword': M['sword']}
    pr, zone, plate = K.parts(o, wl, cfg, CLOTH)
    pr.update(K.helm_parts(pr['base_plain'], 160, 54, 104, 40, head=[(100, 25), (222, 25), (222, 112), (196, 122), (124, 122), (100, 112)], flare=15))
    pr['weapon_spear'] = GR.spear(Hh, Ww, (232, 203), (0.06, -0.998), top=152, bottom=96, head=34, half=6.5, shaft_w=2.4)
    return pr, wl, M, zone


def overlay(o, ms):
    v = o.copy(); dim = ~np.any(np.stack(list(ms.values())), 0)
    v[dim] = (v[dim] * [0.4, 0.4, 0.4, 1]).astype(np.int32)
    cols = {'shield': (255, 60, 60), 'sword': (60, 255, 60), 'fist': (60, 160, 255)}
    for k, m in ms.items(): v[m, :3] = cols.get(k, (255, 255, 0)); v[m, 3] = 255
    return v


def compose(pr, keys):
    a = pr['base_plain'].copy()
    for k in keys: a = P.over(a, pr[k])
    return a


if __name__ == '__main__':
    fo = P.load(os.path.join(ROOT, FRONT_SRC)); bo = P.load(os.path.join(ROOT, BACK_SRC))
    H.set_texture(fo, (90, 110, 130, 140))   # 胸当ての板金のムラ
    pf, fw, mf, zf = build_front(fo); pb, bw, mb, zb = build_back(bo)
    if CHECK:
        os.makedirs(CHECK, exist_ok=True)
        rows = []
        for nm, o, pr, wl, M in (('front', fo, pf, fw, mf), ('back', bo, pb, bw, mb)):
            rows.append([('orig', o), ('mask', overlay(o, M)), ('removed', wl), ('plain', pr['base_plain']),
                         ('heavy+sword+shield', compose(pr, ['armor_shape_f', 'shield_f', 'weapon_sword'])),
                         ('light+spear', compose(pr, ['armor_shape_f', 'weapon_spear', 'hand']))])
        K.check_sheet(os.path.join(CHECK, 'kyle_check.png'), rows, 2)
        print('check', CHECK)
    actor, recF, recB = K.export('kyle', OUT, (FRONT_SRC, FRONT_BATTLE_SRC, BACK_SRC), (FDX, FDY), pf, pb, {
        'menu': {'grip': (35, 160), 'offhand': (170, 160), 'pivot': [109, 263]}, 'back': {'grip': (232, 203), 'offhand': (64, 195)},
        'order': {'grip': '剣：拳の下に鍔（剣を後に描く）／槍：柄の上に拳を描き直す', 'offhand': '盾：左の拳と前腕の上（体・鎧の後に描く）', 'grip_back': '剣：拳の下に鍔／槍：柄の上に拳を描き直す', 'offhand_back': '盾：左腕の外側（腕の後ろ）'}})
    import manifest
    manifest.write()
    print('kyle menu', len(recF), 'back', len(recB))
