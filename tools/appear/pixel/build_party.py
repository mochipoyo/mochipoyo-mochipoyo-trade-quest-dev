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
              # v9.9.1 杖：先の飾り・玉・柄・石突きまで（柄の後ろの袖・ローブの裾は周りの色で補う）。本：持つ手ごと消し、体の左側を写して補う
              'menu': {'remove': [[(5, 12), (44, 12), (44, 36), (56, 40), (56, 92), (48, 104), (46, 112), (30, 112), (5, 95)], R(34, 104, 48, 138),
                                  [(38, 164), (55, 164), (65, 246), (73, 248), (73, 276), (53, 276), (53, 254), (39, 206)],
                                  [(134, 122), (204, 122), (206, 196), (150, 198), (134, 176)]],
                       'keep': [R(22, 139, 52, 166)],
                       'protect': [([(56, 150), (70, 150), (70, 214), (56, 214)], 'gold')],
                       'hfill': [[(36, 164), (57, 164), (60, 214), (36, 214)], ([(36, 214), (60, 214), (62, 226), (36, 226)], 'both')],
                       'flat': [([(36, 226), (62, 226), (66, 240), (66, 254), (40, 254)], (27, 26, 78))], 'drop': [R(28, 98, 47, 139), R(48, 255, 76, 280)],
                       'post_mirror': [([(134, 118), (212, 118), (212, 224), (134, 224)], 117)],
                       'fist': [(22, 139), (50, 139), (52, 166), (24, 168)], 'grip': (36, 150), 'offhand': (196, 160)},
              # 背面：杖は手より上（玉・飾り・柄）と、手の下の柄・地面の石突き。髪は消さない。本：髪より左だけ（本の後ろは体の外なので透明）
              'back': {'remove': [[(222, 36), (278, 36), (278, 124), (256, 130), (252, 165), (232, 165), (232, 130), (222, 120)], R(228, 190, 242, 199)],
                       'drop': [[(50, 148), (95, 148), (95, 170), (84, 173), (81, 199), (64, 201), (50, 176)], R(204, 276, 230, 306)],
                       'protect': [([(50, 140), (100, 140), (100, 202), (50, 202)], 'blue')],
                       'keep': [R(226, 164, 254, 192)], 'fist': R(226, 164, 254, 192), 'grip': (240, 176), 'offhand': (76, 196)}},
    'ganes': {'menu_src': PD + 'ganes/front.png', 'front_src': PD + 'ganes/front.png', 'back_src': PD + 'ganes/back.png', 'off': (0, 0),
              # v9.9.1 槌：頭の角まで（手の範囲を手だけに狭めた）。やっとこ：手のすぐ下の柄まで
              'menu': {'remove': [[(24, 204), (58, 204), (58, 224), (80, 224), (82, 264), (24, 264)], [(236, 208), (256, 206), (282, 240), (282, 272), (240, 272), (236, 230)]],
                       'keep': [[(58, 178), (100, 178), (100, 224), (64, 224), (64, 206), (58, 204)], R(212, 178, 250, 212)],
                       'remove_color': [R(56, 180, 100, 226)], 'fill': [R(56, 180, 100, 206)], 'drop': [[(56, 208), (78, 206), (80, 228), (56, 228)]],
                       'fist': R(56, 178, 100, 224), 'grip': (74, 200), 'offhand': (236, 200)},
              'back': {'remove': [[(56, 206), (100, 206), (100, 264), (56, 264)], [(250, 186), (296, 186), (296, 252), (250, 252)]],
                       'keep': [[(62, 176), (100, 176), (100, 212), (92, 222), (76, 222), (68, 212)], [(226, 174), (256, 174), (256, 198), (263, 200), (263, 215), (226, 215)]],
                       'fist': [(226, 174), (256, 174), (256, 198), (263, 200), (263, 215), (226, 215)], 'grip': (246, 196), 'offhand': (84, 196)}},
    'ord': {'menu_src': PD + 'ord/front.png', 'front_src': PD + 'ord/front.png', 'back_src': PD + 'ord/back.png', 'off': (0, 0),
            # v9.9.1 盾：縁まで消し、盾の外に見えていたマントの端も、体の反対側（左のマント）を写して描き直す。剣：鍔まで消し、剣の後ろのマント（赤い布）は残す
            'menu': {'remove': [[(184, 86), (252, 94), (256, 304), (196, 310), (184, 250)], R(240, 186, 286, 304),
                                [(20, 182), (84, 182), (84, 306), (58, 306), (44, 214), (20, 200)]],
                     'keep': [R(44, 158, 72, 187)], 'protect': [R(18, 196, 90, 306)], 'mirror': [([(168, 86), (288, 86), (288, 310), (168, 310)], 145)],
                     'fist': R(44, 158, 72, 188), 'grip': (58, 178), 'offhand': (210, 190)},
            # 背面：盾（縁と裏の板）を消し、盾に重なっていたマントは残す（盾のあった所は透明。マントの左の縁が体の輪郭になる）。剣：柄頭・鍔・刃
            'back': {'remove': [[(56, 96), (102, 96), (104, 300), (56, 300)], R(250, 150, 266, 176), [(222, 196), (276, 196), (276, 212), (258, 212), (252, 304), (222, 304)]],
                     'keep': [R(222, 174, 250, 197)], 'protect': [[(56, 96), (102, 96), (104, 272), (56, 272)]], 'drop': [[(50, 96), (102, 96), (104, 300), (50, 300)]],
                     'fist': R(222, 172, 252, 198), 'grip': (238, 186), 'offhand': (86, 200)}},
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
        if c.get('remove_color'):   # v9.9.1 手（keep）に重なった柄（木の色）だけを色で外す
            h0, s0, v0 = P.hsv(o); wood = (h0 >= 12) & (h0 <= 32) & (s0 > 0.6) & (v0 > 0.25); rc = np.zeros(S[:2], bool)
            for pts in c['remove_color']: rc |= K.poly(S, pts) & wood & op
            rm |= rc
        drop = None
        if c.get('drop'):      # v9.9.1 必ず透明にする所（体の外に出ていた持ち物の跡）
            drop = np.zeros(S[:2], bool)
            for pts in c['drop']: drop |= K.poly(S, pts)
            rm |= drop & op
        if c.get('protect'):   # v9.9.1 持ち物の後ろに見えていたマント（赤い布）・服の金の縁取りは残す：範囲の中のその色の画素は消さない
            h, sv, vv = P.hsv(o)
            col = {'red': ((h <= 22) | (h >= 340)) & (sv > 0.35) & (vv > 0.16), 'gold': (h >= 26) & (h <= 50) & (sv > 0.45) & (vv > 0.55),
                   'blue': (h >= 185) & (h <= 235) & (sv > 0.3) & (vv > 0.45)}
            for pr in c['protect']:
                pts, cn = (pr if isinstance(pr, tuple) else (pr, 'red')); rm &= ~(K.poly(S, pts) & col[cn])
        hfill = np.zeros(S[:2], bool); hboth = np.zeros(S[:2], bool)
        for hf in c.get('hfill', []):
            pts, mode = (hf if isinstance(hf, tuple) else (hf, 'left')); hfill |= K.poly(S, pts)
            if mode == 'both': hboth |= K.poly(S, pts)
        hfill &= rm
        flat = []              # 柄の後ろが無地の布：その色で塗る（横に繰り返すと縞になる所）
        for pts, col in c.get('flat', []):
            hh, ss, vv2 = P.hsv(o); fm = K.poly(S, pts) & (rm | ((hh >= 26) & (hh <= 50) & (ss > 0.45) & (vv2 > 0.5)))   # 布の上に残った金の粒も塗る
            flat.append((fm, col)); hfill &= ~fm
        fill = None
        if c.get('fill'):      # v9.9.1 必ず周りの色で補う所（体の内側の、閉じきれない跡）
            fill = np.zeros(S[:2], bool)
            for pts in c['fill']: fill |= K.poly(S, pts)
        mirror = [(K.poly(S, pts), cx) for pts, cx in c.get('mirror', [])]
        wl, filled, target = K.remove(o, rm, mirror=mirror or None, close_k=c.get('close_k', 8), keep=fill, drop=drop)
        if hfill.any():        # v9.9.1 細い柄の後ろ：左どなりの絵を柄の幅だけ左右に折り返して描く（ぼかさない）
            src = o.copy(); ok = (src[..., 3] > 40) & ~rm      # 元の絵の、消していない画素（消した所の縁に付いた輪郭は使わない）
            for y in np.unique(np.where(hfill)[0]):
                xs = np.where(hfill[y])[0]; runs = np.split(xs, np.where(np.diff(xs) > 1)[0] + 1)
                for r in runs:
                    x0, x1 = r[0], r[-1]; n = m = 0
                    while n < 8 and x0 - 1 - n >= 0 and ok[y, x0 - 1 - n]: n += 1
                    while m < 8 and x1 + 1 + m < S[1] and ok[y, x1 + 1 + m]: m += 1
                    half = len(r) // 2 if (hboth[y, x0] and m) else len(r)
                    for k, x in enumerate(r):
                        if k < half:   # 左の n 画素を折り返しながら繰り返す
                            if n == 0: wl[y, x] = 0; continue
                            q = k % (2 * n); wl[y, x] = src[y, x0 - 1 - (q if q < n else 2 * n - 1 - q)]
                        else:          # 右半分は右の m 画素から
                            kk = x1 - x; q = kk % (2 * m); wl[y, x] = src[y, x1 + 1 + (q if q < m else 2 * m - 1 - q)]
            nb = K.dil(hfill, 2) & ~hfill & ~rm & ok; wl[nb] = o[nb]   # 縁に付けた輪郭を元に戻す
        for fm, col in flat:
            wl[fm, 0], wl[fm, 1], wl[fm, 2] = col; wl[fm, 3] = 255
        for pts, cx in c.get('post_mirror', []):   # v9.9.1 消したあとの体の反対側を、範囲ごと左右に写す（持ち物と一緒に腕を描き直す）
            src = wl.copy(); ys, xs = np.where(K.poly(S, pts)); sx = np.round(2 * cx - xs).astype(int); ok = (sx >= 0) & (sx < S[1])
            wl[ys[ok], xs[ok]] = src[ys[ok], sx[ok]]
        if drop is not None:   # 透明にした所に面した新しい縁にも輪郭
            ring = P.opaque(wl) & P.neighbors4(~P.opaque(wl)) & K.dil(drop, 1)
            wl[ring, 0], wl[ring, 1], wl[ring, 2] = K.OUTLINE; wl[ring, 3] = 255
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
