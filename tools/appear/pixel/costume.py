# v9.10 衣装セット（見た目だけ。装備の性能・所持数・職業は変えない）
#   python3 tools/appear/pixel/costume.py   作る順：build_* → companion_jobs.py → costume.py → art_import.py（何度動かしても同じ結果）
#   用意してもらった全身の絵（tools/appear/pixel/art_src/costume_<人物ID>_<衣装>_<front|back>.png）を、その人の枠（320×320。足もとを素体に合わせる）に置き、
#   衣装ごとの向き（views['cos:<衣装>:front'／'cos:<衣装>:back']）として持つ。衣装の向きには、専用の握り（grip）・盾の位置（offhand）・握る手（hand）があり、
#   武器・盾の部品は、その握り・盾の位置で作り直す（今の種類の部品＝companion_jobs.gear_view・gear_kit.shield。用意された絵の品は、このあと art_import.py が同じ決まりで置く）
#   衣装のときは、鎧・頭・職業の服は描かない（衣装の絵に含まれる）。武器・盾だけを重ねる。メニューの立ち絵は衣装の正面
import os, sys, json
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pxlib as P
import manifest as MF
import companion_jobs as CJ
import build_party as BPY
import art_import as AI
import gear_kit as GK
ROOT = MF.ROOT; EP = MF.PARTS
R = lambda x0, y0, x1, y1: [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
WEAPONS = ['weapon_sword', 'weapon_dagger', 'weapon_axe', 'weapon_spear', 'weapon_bow', 'weapon_staff']
# 握り・盾の位置・握る手の範囲は、枠に置いた絵（docs/appear/pixel/shots/costume_*_guide.png）を目で読んだ値
COSTUMES = {
    'seris': {'festival': {'name': '祭りの晴れ着',
                           'front': {'grip': (100, 170), 'offhand': (238, 178), 'fist': R(91, 155, 110, 184)},
                           'back': {'grip': (255, 160), 'offhand': (86, 186), 'fist': R(246, 148, 264, 170)}}},
}


def run():
    for aid, cs in COSTUMES.items():
        ap = os.path.join(EP, aid, 'actor.json'); A = json.load(open(ap, encoding='utf8'))
        for vk in [k for k in A['views'] if k.startswith('cos:')]: del A['views'][vk]
        A['costumes'] = {}
        for name, C in cs.items():
            keys = {}
            for d in ('front', 'back'):
                arr, shift = AI.costume(aid, name, d); c = C[d]; vk = 'cos:%s:%s' % (name, d); sub = 'cos_%s_%s' % (name, d); Hh, Ww = arr.shape[:2]
                hand = np.zeros_like(arr); fm = P.poly_mask(Hh, Ww, c['fist']) & P.opaque(arr); hand[fm] = arr[fm]
                bb = P.bbox(P.opaque(arr)); ref = A['views'][d]
                v = {'src': 'tools/appear/pixel/art_src/costume_%s_%s_%s.png' % (aid, name, d), 'w': Ww, 'h': Hh, 'dir': d, 'pivot': ref.get('pivot', [160, 304]), 'costume': name,
                     'body': {'x0': int(bb[0]), 'y0': int(bb[1]), 'x1': int(bb[2]), 'y1': int(bb[3])},
                     'grip': {'x': c['grip'][0], 'y': c['grip'][1], 'order': '武器：柄の上に手を描き直す（衣装の握り）'}, 'offhand': {'x': c['offhand'][0], 'y': c['offhand'][1], 'order': '盾：前腕の上（衣装の盾の位置）'},
                     'parts': CJ.save(aid, sub, {'base_plain': arr, 'hand': hand})}
                A['views'][vk] = v
                v['parts'].update(CJ.save(aid, sub, CJ.gear_view(aid, A, vk, WEAPONS)))                      # 今の種類の武器を、衣装の握りで
                if 'shield_gt' in ref['parts']:                                                              # 盾：ふだんの盾と同じ大きさで、衣装の盾の位置へ
                    s = ref['parts']['shield_gt']['h'] / 60.0; gt, gf = GK.shield(arr, c['offhand'], s, d == 'back'); v['parts'].update(CJ.save(aid, sub, {'shield_gt': gt, 'shield_gf': gf}))
                if d == 'front': v['frame'] = BPY.frame_of(v)                                                 # メニューの立ち絵の枠
                keys[d] = vk
            A['costumes'][name] = {'name': C['name'], 'views': keys}
        json.dump(A, open(ap, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print('costume', aid, list(A['costumes']))
    MF.write()


if __name__ == '__main__':
    run()
