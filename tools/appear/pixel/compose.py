# v9.8 装備の外見（ドット絵の差分）：対応表（manifest.py）と部品から、ゲームと同じ手順で重ねる（開発の確かめ用・どの人物でも）
#   python3 tools/appear/pixel/compose.py <出力フォルダ> [人物ID ...]
#   重ね方は js/rpg/equipment-appearance.js の pixelPlan・pixelRequest と同じ（人ごとの重ね方 → 全員の重ね方、部品のない品はその部位だけ描かない）
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pxlib as P
import manifest as MF
import preview as PV

ROOT = MF.ROOT
SLOTS = ['armor', 'head', 'shield', 'weapon', 'acc']


def pixel_class(M, slot, rec):
    c = M['classes'].get(slot)
    if not c or not rec: return None
    if slot == 'head' and rec['shape'] == 'hat': return c.get('hat:' + rec.get('sub', ''))
    return c.get(rec['shape'])


def material(M, actor, view, cls):
    if not cls: return None
    m = (M['actors'][actor].get('materials') or {}).get(cls) or M['materials'].get(cls)
    if not m: return None
    parts = view['parts']
    ok = all(L.get('optional') or L['part'] in parts for L in m['layers']) and (not m.get('base') or m['base'] in parts) and (not m.get('hand') or 'hand' in parts)
    return m if ok else None


def plan(M, actor, vk, equip, data):
    view = M['actors'][actor]['views'][vk]; mats = []; skipped = []; base = 'base_plain'
    for slot in SLOTS:
        iid = equip.get(slot)
        if not iid: continue
        if slot == 'acc': skipped.append('acc:' + iid); continue
        rec = data.get(iid); cls = pixel_class(M, slot, rec); m = material(M, actor, view, cls)
        if not m: skipped.append(slot + ':' + iid); continue
        if m.get('base'): base = m['base']
        mats.append((m, PV.pal_of(rec)))
    mats.sort(key=lambda t: t[0].get('z', 0))
    return view, base, mats, skipped


_cache = {}


def layer(url):
    p = os.path.join(ROOT, url.split('?')[0])
    if p not in _cache: _cache[p] = P.load(p)
    return _cache[p]


def compose(M, actor, vk, equip, data):
    view, base, mats, skipped = plan(M, actor, vk, equip, data); pad = M['pad']; parts = view['parts']
    c = P.blank(view['h'] + 2 * pad, view['w'] + 2 * pad)
    def put(k, arr, erase=False):
        r = parts[k]; h, w = arr.shape[:2]; X, Y = r['x'] + pad, r['y'] + pad
        sub = c[Y:Y + h, X:X + w]
        if erase: sub[arr[..., 3] > 0] = 0
        else: c[Y:Y + h, X:X + w] = P.over(sub, arr)
    put(base, layer(parts[base]['url']))
    for m, pal in mats:
        for L in m['layers']:
            k = L['part']
            if k not in parts: continue
            arr = layer(parts[k]['url'])
            if L.get('erase'): put(k, arr, True); continue
            if L.get('onlyColor') and PV.grayish(pal['main']): continue
            if not L.get('tint'): put(k, arr); continue
            if L['tint'] == 'orb': ramp = PV.orb_ramp(pal)
            elif PV.grayish(pal['main']):
                if L.get('grayKeep'): continue
                ramp = M['ref'][L['grayRef']] if L.get('grayRef') else PV.ramp_for(pal)
            else: ramp = PV.ramp_for(pal)
            put(k, P.ramp_paint(arr, ramp))
        if m.get('hand'): put('hand', layer(parts['hand']['url']))
    return c, skipped


SETS = {
    'lina': [('装備なし', {}), ('法衣＋杖', {'armor': 'robe_skip', 'weapon': 'oak_staff'}), ('潮騒の法衣', {'armor': 't68_islands_robe'}), ('革の鎧', {'armor': 'leather_armor'}),
             ('杖だけ', {'weapon': 'mage_staff'}), ('棍棒＋帽子（部品なし）', {'weapon': 'club', 'head': 'leather_cap'})],
    'gald': [('装備なし', {}), ('重鎧＋斧', {'armor': 'iron_armor', 'weapon': 'battle_axe'}), ('騎士の鎧', {'armor': 'knight_armor'}), ('革の鎧', {'armor': 'leather_armor'}),
             ('斧だけ', {'weapon': 'hand_axe'}), ('剣＋兜（部品なし）', {'weapon': 'steel_sword', 'head': 'iron_helm'})],
}


def sheet(M, actor, out, data, k=2, each=True, name=None):
    f = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 18)
    rows = []
    for vk in M['actors'][actor]['views']:
        ims = []
        for label, eq in SETS[actor]:
            c, sk = compose(M, actor, vk, eq, data)
            v = M['actors'][actor]['views'][vk]; pad = M['pad']
            if vk in ('back', 'front'):
                bb = v['body']; c = c[pad + bb['y0'] - 70:pad + v['h'], pad + bb['x0'] - 50:pad + bb['x1'] + 50]
            im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA'); ims.append((label, im.resize((im.width * k, im.height * k), Image.NEAREST)))
            if each: P.save(c, os.path.join(out, '%s_%s_%d.png' % (actor, vk, len(ims))))
        rows.append((vk, ims))
    W = max(sum(i.width + 8 for _, i in ims) for _, ims in rows) + 8; Ht = sum(max(i.height for _, i in ims) + 30 for _, ims in rows)
    S = Image.new('RGB', (W, Ht), (108, 116, 130)); d = ImageDraw.Draw(S); y = 0
    for vk, ims in rows:
        x = 8; hh = max(i.height for _, i in ims)
        for label, im in ims:
            d.text((x, y + 4), vk + '：' + label, fill=(255, 240, 180), font=f); S.paste(im, (x, y + 28 + hh - im.height), im); x += im.width + 8
        y += hh + 30
    S.save(os.path.join(out, name or 'sets_%s.jpg' % actor), quality=90); print(name or actor, S.size)


if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); M = MF.manifest(); data = PV.appearance_data()
    for a in (sys.argv[2:] or [x for x in SETS if x in M['actors']]): sheet(M, a, out, data)
