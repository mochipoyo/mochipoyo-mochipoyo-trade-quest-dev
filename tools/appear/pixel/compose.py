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


def job_outfit(M, actor, job):
    """v9.8.9 ゲームの jobOutfit と同じ：{like: 職業, pal} は同じ形の服を借りて配色だけ変える"""
    J = M['actors'][actor].get('jobs') or {}
    if not job or job not in J: return None
    j = J[job]; n = 0
    while j and j.get('like') in J and n < 4:
        b = J[j['like']]; j = dict(b, **{k: v for k, v in j.items() if k not in ('layers', 'over', 'z', 'like')}); j['like'] = b.get('like'); n += 1
    return j if j and j.get('layers') else None


def plan(M, actor, vk, equip, data):
    view = M['actors'][actor]['views'][vk]; mats = []; skipped = []; base = 'base_plain'
    for slot in SLOTS:
        iid = equip.get(slot)
        if not iid: continue
        if slot == 'acc': skipped.append('acc:' + iid); continue
        rec = data.get(iid); cls = pixel_class(M, slot, rec)
        m = material(M, actor, view, 'item:' + iid) or material(M, actor, view, cls)   # v9.8.9 固有装備の専用差分が先
        if not m: skipped.append(slot + ':' + iid); continue
        if m.get('base'): base = m['base']
        mats.append((m, PV.pal_of(rec)))
        ov = m.get('over')   # v9.8.9 装備の手前の層（ローブの袖口など）
        if ov and all(L.get('optional') or L['part'] in view['parts'] for L in ov['layers']): mats.append((ov, PV.pal_of(rec)))
    # v9.8.6 職業の服装（equip の '_job'。ゲームの pixelPlan と同じ：素の絵のすぐ上に重ねる）
    jo = job_outfit(M, actor, equip.get('_job'))
    covered = set(r for m, _ in mats for r in (m.get('covers') or []))   # v9.8.9 装備が覆う部位の服の層は描かない
    keep = lambda L: not (L.get('region') in covered)
    if jo and all(L.get('optional') or L['part'] in view['parts'] for L in jo['layers']):
        jp = dict(jo['pal'], _job=1, _pal2=jo.get('pal2')) if jo.get('pal') else None   # v9.8.9 職業の配色（灰色の層を職業の色で塗る）
        mats.append((dict(jo, layers=[L for L in jo['layers'] if keep(L)]), jp))
        ov = jo.get('over')   # v9.8.8 職業の服装の手前の層（魔法使いの袖）
        if ov and all(L.get('optional') or L['part'] in view['parts'] for L in ov['layers']):
            ol = [L for L in ov['layers'] if keep(L)]
            if ol: mats.append((dict(ov, layers=ol), jp))
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
            if pal is None: put(k, arr); continue
            if L.get('onlyColor') and PV.grayish(pal['main']): continue
            if not L.get('tint'): put(k, arr); continue
            isjob = '_job' in pal   # v9.8.9 職業の配色（白い服も灰色の品の扱いにしない）
            if L['tint'] == 'orb': ramp = PV.orb_ramp(pal)
            elif L['tint'] == 'pal2' and pal.get('_pal2'): ramp = PV.ramp_for(pal['_pal2'])
            elif not isjob and PV.grayish(pal['main']):
                if L.get('grayKeep'): continue
                ramp = M['ref'][L['grayRef']] if L.get('grayRef') else PV.ramp_for(pal)
            else: ramp = PV.ramp_for(pal)
            put(k, P.ramp_paint(arr, ramp))
        if m.get('hand'): put('hand', layer(parts['hand']['url']))
    return c, skipped


SETS = {
    'hero': [('装備なし', {}), ('重鎧＋手斧', {'armor': 'iron_armor', 'weapon': 'hand_axe'}), ('重鎧＋兜＋戦斧＋盾', {'armor': 'iron_armor', 'head': 'iron_helm', 'weapon': 'battle_axe', 'shield': 'iron_shield'}),
             ('軽装＋竜骨の斧', {'armor': 'leather_armor', 'weapon': 'dragon_axe'}), ('重鎧＋兜＋剣と盾', {'armor': 'iron_armor', 'head': 'iron_helm', 'weapon': 'steel_sword', 'shield': 'iron_shield'}),
             ('狩人：装備なし', {'_job': 'hunter'}), ('狩人：短弓', {'_job': 'hunter', 'weapon': 'short_bow'}), ('狩人：革の鎧＋革の帽子＋長弓', {'_job': 'hunter', 'weapon': 'long_bow', 'armor': 'leather_armor', 'head': 'leather_cap'}), ('狩人：槍', {'_job': 'hunter', 'weapon': 'spear'}),
             ('盗賊：装備なし', {'_job': 'thief'}), ('盗賊：短剣', {'_job': 'thief', 'weapon': 'dagger'}), ('盗賊：鋼の剣＋革の鎧', {'_job': 'thief', 'weapon': 'steel_sword', 'armor': 'leather_armor'}), ('盗賊：短弓', {'_job': 'thief', 'weapon': 'short_bow'}),
             ('魔法使い：装備なし', {'_job': 'mage'}), ('魔法使い：樫の杖', {'_job': 'mage', 'weapon': 'oak_staff'}), ('魔法使い：短剣', {'_job': 'mage', 'weapon': 'dagger'}),
             ('魔法使い：賢者の杖＋旅人のローブ＋魔法使いの帽子', {'_job': 'mage', 'weapon': 'sage_staff', 'armor': 'robe', 'head': 'wizard_hat'})],
    'lina': [('装備なし', {}), ('法衣＋杖', {'armor': 'robe_skip', 'weapon': 'oak_staff'}), ('法衣＋杖＋革の帽子', {'armor': 'robe_skip', 'weapon': 'oak_staff', 'head': 'leather_cap'}),
             ('旅装＋高値安値の帽子', {'head': 'hilo_hat'}), ('潮騒の法衣＋潮騒の帽子', {'armor': 't68_islands_robe', 'head': 't68_islands_hat'}),
             ('こん棒＋盾＋羽根帽子（部品なし）', {'weapon': 'club', 'shield': 'wooden_shield', 'head': 'feather_hat'})],
    'gald': [('装備なし', {}), ('重鎧＋斧', {'armor': 'iron_armor', 'weapon': 'battle_axe'}), ('重鎧＋剣と盾', {'armor': 'iron_armor', 'weapon': 'steel_sword', 'shield': 'iron_shield'}),
             ('重鎧＋盾（武器なし）', {'armor': 'iron_armor', 'shield': 'iron_shield'}), ('騎士の鎧＋騎士の剣＋騎士の盾', {'armor': 'knight_armor', 'weapon': 'knight_sword', 'shield': 'knight_shield'}),
             ('軽装＋木の剣＋木の盾', {'armor': 'leather_armor', 'weapon': 'wooden_sword', 'shield': 'wooden_shield'}), ('槍＋兜（部品なし）', {'weapon': 'iron_spear', 'head': 'iron_helm'})],
    # v9.8.2 カイル（騎士：剣・槍）・カズト（戦士：剣・斧・槍）
    'kyle': [('装備なし', {}), ('重鎧＋剣と盾', {'armor': 'iron_armor', 'weapon': 'steel_sword', 'shield': 'iron_shield'}), ('重鎧＋槍と盾', {'armor': 'iron_armor', 'weapon': 'iron_spear', 'shield': 'iron_shield'}),
             ('重鎧＋盾（武器なし）', {'armor': 'iron_armor', 'shield': 'iron_shield'}), ('軽装＋木の剣＋木の盾', {'armor': 'leather_armor', 'weapon': 'wooden_sword', 'shield': 'wooden_shield'}),
             ('騎士の鎧＋騎士の剣＋騎士の盾', {'armor': 'knight_armor', 'weapon': 'knight_sword', 'shield': 'knight_shield'}), ('重鎧＋鉄の兜＋槍と盾', {'armor': 'iron_armor', 'weapon': 'spear', 'head': 'iron_helm', 'shield': 'iron_shield'}), ('装備なし＋騎士の兜', {'head': 'knight_helm'})],
    # v9.8.4 ミナ（盗賊：短剣・剣・弓）
    'mina': [('装備なし', {}), ('短弓', {'weapon': 'short_bow'}), ('短剣', {'weapon': 'dagger'}), ('長弓', {'weapon': 'long_bow'}), ('銅の剣（片手剣）', {'weapon': 'copper_sword'}), ('鋼の剣＋革の鎧（鎧は部品なし）', {'weapon': 'steel_sword', 'armor': 'leather_armor'})],
    'kazuto': [('装備なし', {}), ('重鎧＋剣と盾', {'armor': 'iron_armor', 'weapon': 'steel_sword', 'shield': 'iron_shield'}), ('重鎧＋戦斧', {'armor': 'iron_armor', 'weapon': 'battle_axe'}),
               ('重鎧＋槍と盾', {'armor': 'iron_armor', 'weapon': 'iron_spear', 'shield': 'iron_shield'}), ('重鎧＋盾（武器なし）', {'armor': 'iron_armor', 'shield': 'iron_shield'}),
               ('軽装＋手斧', {'armor': 'leather_armor', 'weapon': 'hand_axe'}), ('騎士の鎧＋騎士の剣＋騎士の盾', {'armor': 'knight_armor', 'weapon': 'knight_sword', 'shield': 'knight_shield'}),
               ('重鎧＋鉄の兜＋剣と盾', {'armor': 'iron_armor', 'weapon': 'iron_sword', 'head': 'iron_helm', 'shield': 'iron_shield'}), ('装備なし＋騎士の兜', {'head': 'knight_helm'})],
}


def sheet(M, actor, out, data, k=2, each=True, name=None):
    f = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 18)
    rows = []
    for vk in M['actors'][actor]['views']:
        ims = []
        for label, eq in SETS[actor]:
            c, sk = compose(M, actor, vk, eq, data)
            v = M['actors'][actor]['views'][vk]; pad = M['pad']
            if vk in ('back', 'front') or (actor == 'hero' and vk != 'job:warrior'):
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
