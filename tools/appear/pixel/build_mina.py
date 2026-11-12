# v9.8.4 装備の外見（ドット絵の差分）：ミナ（盗賊：短剣・剣・弓）の「メニュー正面（companions/mina.png 196×268）」「戦闘の背面（party-directions-v3 の mina/back.png）」
#   戦闘の正面（勝利の振り向き）は mina/front.png が mina.png と同じ絵を (62, 36) に置いたもの（違うドット 0）なので、メニュー正面の部品を座標だけずらして使う
#   元の絵は読むだけ。部品は assets/characters/equip-pixels/mina/<向き>/、ミナの対応表は mina/actor.json に書き、manifest.py でまとめる
#   python3 tools/appear/pixel/build_mina.py [確かめの絵の出力フォルダ]
#
#   部品（元の絵と同じ座標）
#     base_plain      素の絵：両手の短剣を外したもの（刃・鍔を消し、切り口に輪郭。服・髪・襟巻きはそのまま）。加入したときは何も装備していない＝手ぶら
#     weapon_dagger   短剣：元の絵から切り離した 2 本の短剣（どの短剣も同じ形）
#     weapon_bow      弓：gear.bow で描いた弓。ミナの左手（正面では画面の右・背面では画面の左）の拳の位置に握りを置き、弓の腹を体の外へ、弦を体の側へ
#     hand            弓を握る左の拳（弓の握りの上に描き直す）
#     weapon_sword    v9.8.5 片手剣：gear.sword で描いた剣（どの剣も同じ形）。弓と同じ左手の拳に柄
#   防具（軽装・帽子）の部品はない（その部位だけ描かない）
import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pxlib as P
import build_hero as H
import gear as GR
import knight as K

ROOT = H.ROOT
OUT = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels', 'mina')
CHECK = sys.argv[1] if len(sys.argv) > 1 else None
FRONT_SRC = 'assets/characters/companions/mina.png'
FRONT_BATTLE_SRC = 'assets/characters/party-directions-v3/sprites/mina/front.png'
BACK_SRC = 'assets/characters/party-directions-v3/sprites/mina/back.png'
FDX, FDY = 62, 36

# 向きごと：短剣の範囲（箱）・弓を握る拳（左手）の中心と範囲・弓の向き
FRONT = {'blades': [[(18, 136), (34, 140), (34, 160), (16, 186), (0, 186), (0, 156)], [(140, 178), (158, 172), (172, 184), (188, 254), (168, 254), (150, 198), (138, 188)]],
         'daggers': [(0, 136, 38, 184), (138, 166, 186, 252)], 'grip': (160, 170), 'hand': [(148, 158), (166, 158), (172, 168), (170, 182), (156, 184), (147, 174)],
         'up': (0.12, -0.993), 'side': 1, 'sword_up': (0.316, 0.949)}
BACK = {'blades': [[(98, 217), (124, 215), (122, 232), (108, 262), (98, 288), (86, 288), (90, 250)], [(212, 217), (242, 211), (246, 226), (258, 274), (244, 278), (226, 244), (214, 231)]],
        'daggers': [(84, 208, 126, 290), (208, 208, 256, 276)], 'grip': (112, 209), 'hand': [(102, 198), (120, 198), (124, 210), (120, 220), (106, 220), (100, 210)],
        'up': (-0.1, -0.995), 'side': -1, 'sword_up': (-0.243, 0.970)}


def dagger_mask(o, R):
    S = o.shape; op = P.opaque(o); h, s, v = P.hsv(o)
    metal = op & (((s < 0.3) & (v > 0.5)) | H.is_gold(o))            # 刃（銀）・鍔（金）
    m = np.zeros(S[:2], bool)
    for (x0, y0, x1, y1) in R['daggers']: m |= K.box(S, x0, y0, x1, y1) & metal
    hand = K.poly(S, R['hand']) & op
    for pts in R['blades']: m |= K.poly(S, pts) & op & ~(hand & ~metal)      # 刃・鍔の範囲（体の外）は、暗い刃・輪郭もふくめて全部
    m = K.with_outline(o, K.close(m, 1), 1, 60)
    for (x0, y0, x1, y1) in R['daggers']: pass
    lim = np.zeros(S[:2], bool)
    for (x0, y0, x1, y1) in R['daggers']: lim |= K.box(S, x0 - 2, y0 - 2, x1 + 2, y1 + 2)
    return m & lim, hand


def build(o, R):
    Hh, Ww = o.shape[:2]
    m, hand = dagger_mask(o, R)
    plain, _, _ = K.remove(o, m, close_k=3)
    pr = {'base_plain': plain, 'weapon_dagger': H.take(o, m & P.opaque(o)), 'hand': H.take(plain, hand & P.opaque(plain))}
    # v9.8.5 片手剣：弓と同じ左手の拳に柄を置き、刃を下へ向けて下げて持つ（元の絵の短剣と同じ向き）。拳の下に鍔、拳の上に柄頭。拳は柄の上に描き直す
    pr['weapon_sword'] = GR.sword(Hh, Ww, R['grip'], R['sword_up'], blade_len=62, blade_w=8, tip=14, guard_w=20, guard_at=10, pommel_at=-11, pommel_r=3.2)
    pr['weapon_bow'] = GR.bow(Hh, Ww, R['grip'], R['up'], length=126, depth=16, side=R['side'], limb_w=3.3)
    return pr, m, hand


def overlay(o, m, hand):
    v = o.copy(); dim = ~(m | hand); v[dim] = (v[dim] * [0.4, 0.4, 0.4, 1]).astype(np.int32)
    v[m, :3] = (60, 255, 60); v[hand, :3] = (60, 160, 255); return v


def compose(pr, keys):
    a = pr['base_plain'].copy()
    for k in keys: a = P.over(a, pr[k])
    return a


if __name__ == '__main__':
    fo = P.load(os.path.join(ROOT, FRONT_SRC)); bo = P.load(os.path.join(ROOT, BACK_SRC))
    pf, mf, hf = build(fo, FRONT); pb, mb, hb = build(bo, BACK)
    if CHECK:
        os.makedirs(CHECK, exist_ok=True)
        rows = [[('orig', o), ('mask', overlay(o, m, h)), ('plain', pr['base_plain']), ('dagger', compose(pr, ['weapon_dagger'])), ('bow', compose(pr, ['weapon_bow', 'hand'])), ('sword', compose(pr, ['weapon_sword', 'hand']))]
                for o, pr, m, h in ((fo, pf, mf, hf), (bo, pb, mb, hb))]
        K.check_sheet(os.path.join(CHECK, 'mina_check.png'), rows, 2)
    actor, recF, recB = K.export('mina', OUT, (FRONT_SRC, FRONT_BATTLE_SRC, BACK_SRC), (FDX, FDY), pf, pb, {
        'menu': {'grip': FRONT['grip'], 'offhand': (30, 150), 'pivot': [97, 266]}, 'back': {'grip': BACK['grip'], 'offhand': (228, 208)},
        'order': {'grip': '弓：ミナの左手（画面の右）。握りの上に拳を描き直す／短剣：元の絵の 2 本', 'offhand': '短剣のもう 1 本（右手）。盾の部品なし',
                  'grip_back': '弓：ミナの左手（画面の左）。握りの上に拳を描き直す／短剣：元の絵の 2 本', 'offhand_back': '短剣のもう 1 本（右手）。盾の部品なし'}})
    actor['materials'] = {'weapon_sword': {'z': 40, 'hand': True, 'layers': [{'part': 'weapon_sword'}]}}   # ミナは盾を装備できない（盗賊）。剣だけ人ごとの重ね方（柄の上に拳を描き直す）
    import json
    json.dump(actor, open(os.path.join(OUT, 'actor.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    import manifest
    manifest.write()
    print('mina menu', len(recF), 'back', len(recB))
