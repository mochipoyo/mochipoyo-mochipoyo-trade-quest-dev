# v9.7 装備の外見（ドット絵の差分）：作った部品を、ゲームと同じ手順で重ねて確かめる（開発用）
#   python3 tools/appear/pixel/preview.py <出力フォルダ>
#   重ね方・色の段の作り方は js/rpg/equipment-appearance.js の pixelCompose / rampFor と同じ
import os, sys, json, re, colorsys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pxlib as P

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
PAD = 48


def appearance_data():
    t = open(os.path.join(ROOT, 'js', 'data', 'equip-appearance-data.js'), encoding='utf8').read()
    m = re.search(r'EQUIP_APPEARANCE_DATA = (\{.*?\});', t, re.S)
    return json.loads(m.group(1))


def pal_of(rec):
    p = rec.get('pal') or ['#8a8a8a', '#5a5a5a', '#c0a060', '#d0d0d0', '#303030']
    return {'main': p[0], 'trim': p[1], 'acc': p[2], 'light': p[3], 'dark': p[4]}


def hsl(c):
    r, g, b = [v / 255 for v in P.hexrgb(c)]; h, l, s = colorsys.rgb_to_hls(r, g, b); return h * 360, s, l


def lumc(c):
    r, g, b = P.hexrgb(c); return r * 0.299 + g * 0.587 + b * 0.114


def mix(a, b, t):
    A, B = P.hexrgb(a), P.hexrgb(b); return P.rgbhex([A[i] + (B[i] - A[i]) * t for i in range(3)])


def huedist(a, b):
    d = abs(hsl(a)[0] - hsl(b)[0]) % 360; return min(d, 360 - d)


def grayish(c):
    r, g, b = P.hexrgb(c); mx, mn = max(r, g, b), min(r, g, b); return (mx - mn) / (mx + 1) < 0.22


def ramp_for(pal, key='main'):
    """品の色 → 5 段の色（暗い→明るい）"""
    main = pal[key]
    cands = [pal['light'], pal['trim'], pal['acc']]
    light = None
    for c in cands:
        if lumc(c) > lumc(main) + 25 and (huedist(c, main) < 40 or grayish(main) and grayish(c)): light = c; break
    if not light: light = mix(main, '#ffffff', 0.45)
    dark = pal['dark'] if lumc(pal['dark']) < lumc(main) - 18 else mix(main, '#000000', 0.5)
    return [mix(dark, '#000000', 0.35), dark, main, mix(main, light, 0.55), light]


def orb_ramp(pal):
    a = pal['acc']
    if grayish(a): a = pal['main']
    return [mix(a, '#000000', 0.6), mix(a, '#000000', 0.25), a, mix(a, '#ffffff', 0.45), '#ffffff']


def load_layer(rec):
    return P.load(os.path.join(ROOT, rec['url'].split('?')[0]))


def place(canvas, arr, x, y):
    h, w = arr.shape[:2]; X, Y = x + PAD, y + PAD
    sub = canvas[Y:Y + h, X:X + w]
    canvas[Y:Y + h, X:X + w] = P.over(sub, arr)


def classes(items, data):
    """装備 → 部品の種類（js の pixelClass と同じ）"""
    out = {}
    for slot, iid in items.items():
        if not iid: continue
        r = data.get(iid)
        if not r: out[slot] = None; continue
        sh = r['shape']
        if slot == 'armor': out[slot] = 'armor_' + sh
        elif slot == 'head': out[slot] = 'head_helm' if sh == 'helm' else ('head_hat' if r.get('sub') == 'witch' else None)
        elif slot == 'weapon': out[slot] = 'weapon_' + sh
        elif slot == 'shield': out[slot] = 'shield'
        out[slot + '_pal'] = pal_of(r)
    return out


def compose(view, W, H, items, data):
    recs = json.load(open(os.path.join(ROOT, 'assets', 'characters', 'equip-pixels', 'hero', 'parts.json')))[view]
    C = classes(items, data)
    has = lambda k: k in recs
    canvas = P.blank(H + 2 * PAD, W + 2 * PAD)
    head = C.get('head')
    base = 'base_helm' if head == 'head_helm' else ('base_hat' if head == 'head_hat' else 'base_plain')
    def tint(k, ramp):
        g = load_layer(recs[k]); place(canvas, P.ramp_paint(g, ramp), recs[k]['x'], recs[k]['y'])
    def fixed(k):
        if has(k): place(canvas, load_layer(recs[k]), recs[k]['x'], recs[k]['y'])
    place(canvas, load_layer(recs[base]), recs[base]['x'], recs[base]['y'])
    arm = C.get('armor')
    if arm:
        pal = C['armor_pal']
        for L in MATS[arm]:
            k = L['part']
            if k not in recs: continue
            if L.get('erase'):
                e = load_layer(recs[k]); h, w = e.shape[:2]; X, Y = recs[k]['x'] + PAD, recs[k]['y'] + PAD
                sub = canvas[Y:Y + h, X:X + w]; sub[e[..., 3] > 0] = 0; continue
            if L.get('onlyColor') and grayish(pal['main']): continue
            if L.get('tint'): tint(k, ramp_for(pal))
            else: fixed(k)
    if head:
        pal = C['head_pal']; r = ramp_for(pal)
        if head == 'head_helm' and grayish(pal['main']): r = REF
        tint(head + '_t', r); fixed(head + '_f')
    if C.get('shield'): fixed('shield')
    w = C.get('weapon')
    if w:
        if has(w + '_t'): tint(w + '_t', orb_ramp(C['weapon_pal']))
        fixed(w + '_f'); fixed(w)
        if w in ('weapon_staff', 'weapon_spear'): fixed('hand')
    return canvas


REF = ['#3c3133', '#5e5054', '#837476', '#a89a98', '#e2d8cc']
MATS = {'armor_light': [{'part': 'armor_shape_f'}, {'part': 'armor_light_t', 'tint': 'main'}],
        'armor_heavy': [{'part': 'armor_shape_f'}, {'part': 'armor_heavy_t', 'tint': 'main', 'onlyColor': True}],
        'armor_robe': [{'part': 'armor_robe_x', 'erase': True}, {'part': 'armor_robe_t', 'tint': 'main'}, {'part': 'armor_robe_f'}]}

SETS = [
    ('素', {}),
    ('軽装＋剣', {'armor': 'leather_armor', 'weapon': 'steel_sword'}),
    ('重鎧＋兜＋剣と盾', {'armor': 'iron_armor', 'head': 'iron_helm', 'weapon': 'steel_sword', 'shield': 'iron_shield'}),
    ('ローブ＋帽子＋杖', {'armor': 'robe', 'head': 'wizard_hat', 'weapon': 'oak_staff'}),
    ('槍', {'armor': 'iron_armor', 'weapon': 'iron_spear'}),
    ('ローブだけ', {'armor': 'robe'}),
    ('重鎧だけ', {'armor': 'iron_armor'}),
]

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); data = appearance_data()
    for view, W, H, k, crop in (('front', 130, 200, 3, None), ('back', 320, 320, 2, (60, 30, 260, 320))):
        ims = []
        for name, items in SETS:
            c = compose(view, W, H, items, data)
            if crop: x0, y0, x1, y1 = crop; c = c[y0 + PAD - 40:y1 + PAD, x0 + PAD - 20:x1 + PAD + 20]
            im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA'); ims.append(im.resize((im.width * k, im.height * k), Image.NEAREST))
            P.save(c, os.path.join(out, '%s_%d.png' % (view, len(ims))))
        Wt = sum(i.width for i in ims) + 10 * len(ims); Ht = max(i.height for i in ims)
        S = Image.new('RGB', (Wt, Ht), (108, 116, 130)); x = 0
        for im in ims: S.paste(im, (x, 0), im); x += im.width + 10
        S.save(os.path.join(out, 'sets_%s.jpg' % view), quality=88); print(view, S.size)
