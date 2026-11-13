# v9.9 装備の外見（ドット絵の差分）：部品のなかった仲間 11 人の素体（元の武器・盾・持ち物を切り離した絵）と、握る手・握りの位置
#   python3 tools/appear/pixel/build_party.py [人物ID ...] [--check 出力フォルダ]
#   元の絵は読むだけ。部品は assets/characters/equip-pixels/<人物ID>/<向き>/、<人物ID>/actor.json を書く（このあと companion_jobs.py が職業の服・装備を足す）
#   向き：menu＝メニューの立ち絵（companions/<ID>.png がある人はそれ。ない人は戦闘の正面の絵）、front＝勝利の正面（menu を座標だけずらす）、back＝戦闘の背面
#   remove＝切り離す持ち物（多角形）。keep＝手（持ち物の上に重なっていても残す）。mirror＝持ち物の後ろの体を、体の中心で左右に写して補う範囲
#   fist＝武器を握る手（長い柄の上に描き直す部品 hand）。grip＝握りの点。offhand＝盾を持つ前腕の点
import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pxlib as P
import knight as K
import build_hero as H

ROOT = H.ROOT
EP = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels')
PD = 'assets/characters/party-directions-v3/sprites/'
PD68 = 'assets/characters/party-directions-add68/sprites/'

def R(x0, y0, x1, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


# ---- 人ごと・向きごと（座標は元の絵の画素）----
C = {
    'seris': {'menu_src': 'assets/characters/companions/seris.png', 'front_src': PD + 'seris/front.png', 'back_src': PD + 'seris/back.png', 'off': (54, 24),
              'menu': {'remove': [[(10, 36), (62, 36), (62, 92), (50, 100), (47, 262), (25, 262), (25, 100), (10, 90)], [(128, 128), (186, 122), (192, 150), (186, 192), (150, 196), (128, 170)]],
                       'keep': [[(22, 136), (50, 136), (52, 166), (24, 168)], [(150, 168), (182, 168), (182, 196), (150, 196)]],
                       'fist': [(22, 136), (50, 136), (52, 166), (24, 168)], 'grip': (36, 150), 'offhand': (166, 182)},
              'back': {'remove': [[(222, 58), (276, 58), (276, 124), (258, 130), (256, 282), (236, 282), (236, 130), (222, 120)], [(66, 142), (110, 142), (112, 196), (70, 198)]],
                       'keep': [[(230, 178), (260, 178), (260, 206), (230, 206)]], 'fist': [(230, 178), (260, 178), (260, 206), (230, 206)], 'grip': (246, 192), 'offhand': (96, 186)}},
    'ganes': {'menu_src': PD + 'ganes/front.png', 'front_src': PD + 'ganes/front.png', 'back_src': PD + 'ganes/back.png', 'off': (0, 0),
              'menu': {'remove': [[(26, 202), (80, 202), (84, 256), (30, 258)], [(222, 214), (262, 214), (264, 266), (226, 266)]],
                       'keep': [[(44, 188), (80, 188), (82, 222), (46, 222)], [(222, 184), (250, 184), (252, 218), (224, 218)]],
                       'fist': [(44, 188), (80, 188), (82, 222), (46, 222)], 'grip': (62, 206), 'offhand': (236, 200)},
              'back': {'remove': [[(70, 200), (100, 200), (100, 256), (70, 256)], [(250, 196), (296, 196), (296, 248), (250, 248)]],
                       'keep': [[(70, 176), (102, 176), (102, 206), (70, 206)], [(236, 178), (268, 178), (268, 210), (236, 210)]],
                       'fist': [(236, 178), (268, 178), (268, 210), (236, 210)], 'grip': (252, 196), 'offhand': (86, 192)}},
    'ord': {'menu_src': PD + 'ord/front.png', 'front_src': PD + 'ord/front.png', 'back_src': PD + 'ord/back.png', 'off': (0, 0),
            'menu': {'remove': [[(186, 92), (244, 100), (246, 300), (196, 304), (186, 250)], [(36, 182), (78, 182), (80, 304), (60, 304), (44, 220), (36, 200)]],
                     'keep': [[(40, 160), (70, 160), (72, 192), (42, 192)]], 'mirror': [([(170, 92), (250, 92), (250, 304), (170, 304)], 145)],
                     'fist': [(40, 160), (70, 160), (72, 192), (42, 192)], 'grip': (56, 178), 'offhand': (210, 190)},
            'back': {'remove': [[(56, 98), (104, 98), (104, 302), (56, 302)], [(222, 196), (250, 196), (250, 300), (222, 300)]],
                     'keep': [[(222, 160), (256, 160), (256, 196), (222, 196)]], 'mirror': [([(50, 92), (112, 92), (112, 304), (50, 304)], 165)],
                     'fist': [(222, 160), (256, 160), (256, 196), (222, 196)], 'grip': (238, 180), 'offhand': (86, 200)}},
    'lucia': {'menu_src': 'assets/characters/companions/lucia.png', 'front_src': PD + 'lucia/front.png', 'back_src': PD + 'lucia/back.png', 'off': (36, 43),
              'menu': {'remove': [[(180, 30), (234, 30), (234, 88), (210, 96), (176, 250), (156, 250), (194, 94), (180, 86)]], 'keep': [R(174, 120, 206, 156)],
                       'fist': R(174, 120, 206, 156), 'grip': (190, 138), 'offhand': (85, 162)},
              'back': {'remove': [[(60, 60), (142, 60), (142, 135), (120, 146), (102, 298), (80, 298), (96, 140), (60, 132)]], 'keep': [R(106, 136, 144, 168)],
                       'fist': R(106, 136, 144, 168), 'grip': (125, 152), 'offhand': (222, 200)}},
    'elna': {'menu_src': PD + 'elna/front.png', 'front_src': PD + 'elna/front.png', 'back_src': PD + 'elna/back.png', 'off': (0, 0),
             'menu': {'remove': [[(54, 72), (90, 72), (92, 120), (66, 124)], [(156, 106), (222, 106), (222, 156), (186, 158), (156, 148)]], 'keep': [R(82, 122, 108, 152), R(156, 140, 186, 168)],
                      'fist': R(82, 122, 108, 152), 'grip': (95, 138), 'offhand': (170, 154)},
             'back': {'remove': [[(212, 72), (262, 72), (262, 122), (236, 128), (212, 120)], [(92, 112), (142, 112), (142, 158), (92, 158)]], 'keep': [R(210, 122, 238, 154)],
                      'fist': R(210, 122, 238, 154), 'grip': (225, 138), 'offhand': (118, 150)}},
    'nagi': {'menu_src': PD + 'nagi/front.png', 'front_src': PD + 'nagi/front.png', 'back_src': PD + 'nagi/back.png', 'off': (0, 0),
             'menu': {'remove': [[(68, 112), (110, 112), (108, 146), (70, 150)], [(204, 128), (250, 128), (250, 178), (226, 178), (204, 160)]], 'keep': [R(86, 140, 118, 174), R(200, 160, 230, 194)],
                      'fist': R(86, 140, 118, 174), 'grip': (102, 156), 'offhand': (214, 176)},
             'back': {'remove': [[(76, 138), (122, 138), (122, 220), (76, 220)], [(214, 130), (246, 130), (246, 184), (222, 184), (214, 172)]], 'keep': [R(98, 166, 120, 190), R(196, 150, 214, 174)],
                      'fist': R(196, 150, 214, 174), 'grip': (206, 162), 'offhand': (108, 178)}},
    'iris': {'menu_src': PD + 'iris/front.png', 'front_src': PD + 'iris/front.png', 'back_src': PD + 'iris/back.png', 'off': (0, 0),
             'menu': {'remove': [[(38, 118), (92, 118), (92, 170), (60, 172), (38, 190)], [(212, 150), (312, 150), (312, 234), (246, 240), (212, 236)]], 'keep': [R(46, 166, 88, 202), R(214, 198, 246, 236)],
                      'fist': R(46, 166, 88, 202), 'grip': (66, 184), 'offhand': (228, 214)},
             'back': {'remove': [[(52, 138), (104, 138), (104, 192), (52, 192)], [(196, 100), (252, 100), (252, 286), (226, 286), (200, 182)]], 'keep': [R(216, 206, 246, 240)],
                      'fist': R(216, 206, 246, 240), 'grip': (231, 222), 'offhand': (90, 176)}},
    'sophia': {'menu_src': PD + 'sophia/front.png', 'front_src': PD + 'sophia/front.png', 'back_src': PD + 'sophia/back.png', 'off': (0, 0),
               'menu': {'remove': [[(44, 20), (136, 20), (136, 126), (104, 132), (104, 302), (80, 302), (80, 132), (44, 122)]], 'keep': [R(74, 136, 106, 172)],
                        'fist': R(74, 136, 106, 172), 'grip': (90, 154), 'offhand': (178, 164)},
               'back': {'remove': [[(218, 20), (294, 20), (294, 130), (264, 136), (264, 302), (240, 302), (240, 136), (218, 126)]], 'keep': [R(238, 138, 268, 174)],
                        'fist': R(238, 138, 268, 174), 'grip': (253, 158), 'offhand': (100, 190)}},
    'io': {'menu_src': PD + 'io/front.png', 'front_src': PD + 'io/front.png', 'back_src': PD + 'io/back.png', 'off': (0, 0),
           'menu': {'remove': [[(212, 148), (268, 148), (268, 196), (246, 200), (212, 186)]], 'keep': [R(222, 182, 254, 210)],
                    'fist': R(222, 182, 254, 210), 'grip': (238, 196), 'offhand': (88, 215)},
           'back': {'remove': [[(68, 152), (122, 152), (122, 196), (68, 214)]], 'keep': [R(92, 186, 124, 218)],
                    'fist': R(92, 186, 124, 218), 'grip': (106, 202), 'offhand': (270, 238)}},
    'aster': {'menu_src': PD + 'aster/front.png', 'front_src': PD + 'aster/front.png', 'back_src': PD + 'aster/back.png', 'off': (0, 0),
              'menu': {'remove': [[(24, 20), (114, 20), (114, 136), (108, 146), (108, 302), (86, 302), (86, 146), (24, 132)]], 'keep': [R(82, 148, 116, 190)],
                       'fist': R(82, 148, 116, 190), 'grip': (98, 168), 'offhand': (246, 188)},
              'back': {'remove': [[(234, 14), (294, 14), (294, 136), (280, 144), (280, 302), (256, 302), (256, 144), (234, 132)]], 'keep': [R(248, 150, 282, 186)],
                       'fist': R(248, 150, 282, 186), 'grip': (266, 168), 'offhand': (90, 180)}},
    'mochipoyo': {'menu_src': 'assets/characters/companions/mochipoyo.png', 'front_src': PD68 + 'mochipoyo/front.png', 'back_src': PD68 + 'mochipoyo/back.png', 'off': (22, 26),
                  'menu': {'remove': [R(0, 8, 62, 82), [(54, 28), (102, 28), (102, 84), (90, 90), (90, 254), (62, 254), (62, 90), (54, 84)], R(158, 6, 242, 86), [(146, 68), (222, 68), (222, 128), (150, 130)], R(196, 108, 272, 168)],
                           'keep': [R(56, 100, 96, 136), R(138, 96, 166, 128)], 'fist': R(56, 100, 96, 136), 'grip': (75, 118), 'offhand': (152, 112)},
                  'back': {'remove': [R(44, 18, 138, 98), R(230, 12, 312, 118), [(222, 28), (270, 28), (270, 150), (222, 150)], R(54, 94, 144, 154), R(238, 98, 320, 172)],
                           'keep': [R(234, 148, 272, 182), R(122, 132, 152, 162)], 'fist': R(234, 148, 272, 182), 'grip': (252, 165), 'offhand': (138, 150)}},
}


def build(aid, cf, check=None):
    o_m = P.load(os.path.join(ROOT, cf['menu_src'])); o_b = P.load(os.path.join(ROOT, cf['back_src']))
    out = {}
    for vk, o in (('menu', o_m), ('back', o_b)):
        c = cf[vk]; S = o.shape; op = P.opaque(o)
        rm = np.zeros(S[:2], bool)
        for pts in c['remove']: rm |= K.poly(S, pts)
        rm &= op; rm = K.with_outline(o, rm, 2)
        keep = np.zeros(S[:2], bool)
        for pts in c.get('keep', []): keep |= K.poly(S, pts)
        rm &= ~keep
        mirror = [(K.poly(S, pts), cx) for pts, cx in c.get('mirror', [])]
        wl, filled, target = K.remove(o, rm, mirror=mirror or None, close_k=8)
        fist = K.poly(S, c['fist']) & P.opaque(wl)
        if fist.sum() < 40:   # 握る手の範囲に絵がない（座標の読み違い）：近くの肌の色の塊を手とする
            h, sv, vv = P.hsv(o); yy, xx = np.mgrid[0:S[0], 0:S[1]]; gx, gy = c['grip']
            skin = P.opaque(wl) & (h >= 8) & (h <= 40) & (sv > 0.15) & (sv < 0.65) & (vv > 0.55) & (np.abs(xx - gx) < 45) & (np.abs(yy - gy) < 45)
            lab, n = P.components(skin)
            if n:
                cnt = np.bincount(lab.ravel()); cnt[0] = 0; k = int(np.argmax(cnt)); x0, y0, x1, y1 = P.bbox(lab == k)
                fist = K.box(S, x0 - 3, y0 - 3, x1 + 3, y1 + 3) & P.opaque(wl); c = dict(c, grip=(int((x0 + x1) / 2), int((y0 + y1) / 2)))
                cf[vk] = c; print('  ', aid, vk, '手の位置を肌の色から', c['grip'])
        out[vk] = {'base_plain': wl, 'hand': H.take(wl, fist)}
        if check:
            v = o.copy(); v[~rm] = (v[~rm] * [0.45, 0.45, 0.45, 1]).astype(np.int32); v[rm, :3] = (255, 60, 60); v[fist, :3] = (60, 160, 255)
            out[vk]['_chk'] = (o, v, wl)
    return out


def export(aid, cf, parts):
    recF = H.save_parts(os.path.join(EP, aid, 'menu'), {k: v for k, v in parts['menu'].items() if not k.startswith('_')}, {})
    recB = H.save_parts(os.path.join(EP, aid, 'back'), {k: v for k, v in parts['back'].items() if not k.startswith('_')}, {})
    FH, FW = parts['menu']['base_plain'].shape[:2]; BH, BW = parts['back']['base_plain'].shape[:2]; dx, dy = cf['off']
    bx = lambda a: (lambda bb: {'x0': bb[0], 'y0': bb[1], 'x1': bb[2], 'y1': bb[3]})(P.bbox(P.opaque(a)))
    sh = lambda b: {'x0': b['x0'] + dx, 'y0': b['y0'] + dy, 'x1': b['x1'] + dx, 'y1': b['y1'] + dy}
    m, b = cf['menu'], cf['back']
    actor = {'menuBase': 'menu', 'materials': {}, 'views': {
        'menu': {'src': cf['menu_src'], 'w': FW, 'h': FH, 'dir': 'front', 'pivot': [FW // 2, FH - 2], 'body': bx(parts['menu']['base_plain']),
                 'grip': {'x': m['grip'][0], 'y': m['grip'][1], 'order': '武器：柄の上に手を描き直す'}, 'offhand': {'x': m['offhand'][0], 'y': m['offhand'][1], 'order': '盾：前腕の上'}, 'parts': recF},
        'front': {'src': cf['front_src'], 'w': 320, 'h': 320, 'dir': 'front', 'pivot': [160, 304], 'body': sh(bx(parts['menu']['base_plain'])),
                  'grip': {'x': m['grip'][0] + dx, 'y': m['grip'][1] + dy, 'order': '武器：柄の上に手を描き直す'}, 'offhand': {'x': m['offhand'][0] + dx, 'y': m['offhand'][1] + dy, 'order': '盾：前腕の上'},
                  'from': 'menu', 'parts': {k: dict(v, x=v['x'] + dx, y=v['y'] + dy) for k, v in recF.items()}},
        'back': {'src': cf['back_src'], 'w': BW, 'h': BH, 'dir': 'back', 'pivot': [160, 304], 'body': bx(parts['back']['base_plain']),
                 'grip': {'x': b['grip'][0], 'y': b['grip'][1], 'order': '武器：柄の上に手を描き直す'}, 'offhand': {'x': b['offhand'][0], 'y': b['offhand'][1], 'order': '盾：前腕の上'}, 'parts': recB}}}
    os.makedirs(os.path.join(EP, aid), exist_ok=True)
    json.dump(actor, open(os.path.join(EP, aid, 'actor.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)


def frame_of(view):
    """メニューの枠：全部の部品（帽子・槍・杖の先）を収め、左右は元の絵の中心でそろえ、下は元の絵の下辺"""
    rec, w, h = view['parts'], view['w'], view['h']; m = 2
    x0 = min([0] + [r['x'] for r in rec.values()]) - m; x1 = max([w] + [r['x'] + r['w'] for r in rec.values()]) + m
    y0 = min([0] + [r['y'] for r in rec.values()]) - m; half = max(w / 2 - x0, x1 - w / 2)
    return {'x0': int(np.floor(w / 2 - half)), 'y0': int(y0), 'x1': int(np.ceil(w / 2 + half)), 'y1': int(h)}


if __name__ == '__main__':
    args = sys.argv[1:]; chk = None
    if '--check' in args: i = args.index('--check'); chk = args[i + 1]; args = args[:i] + args[i + 2:]
    for aid in (args or list(C)):
        parts = build(aid, C[aid], chk)
        if chk:
            os.makedirs(chk, exist_ok=True); rows = [[('orig', parts[v]['_chk'][0]), ('mask', parts[v]['_chk'][1]), ('plain', parts[v]['_chk'][2])] for v in ('menu', 'back')]
            K.check_sheet(os.path.join(chk, aid + '_check.png'), rows, 1)
        export(aid, C[aid], parts); print(aid, 'ok')
