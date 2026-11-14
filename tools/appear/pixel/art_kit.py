# v9.10 準備：装備・衣装の絵を用意してもらうための型紙（下絵）を書き出す
#   python3 tools/appear/pixel/art_kit.py → docs/appear/pixel/art_kit/<人物ID>/<front|back>_base.png（等倍・透明）と <front|back>_guide.png（4 倍・目印つき）
#   base ：持ち物を外した素体（ゲームの中と同じ 320×320 の枠。足もとの基準点は 160, 304）
#   guide：握る位置（赤）・盾の位置（青）・体の矩形（黄）・足もとの基準点（白）を重ねたもの。絵に含めない（見るだけ）
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import pxlib as P
EP = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels'); OUT = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'art_kit')


def full(actor, vk):
    A = json.load(open(os.path.join(EP, actor, 'actor.json'), encoding='utf8')); v = A['views'][vk]; c = np.zeros((v['h'], v['w'], 4), np.uint8)
    for name in ('base_plain', 'hand'):
        r = v['parts'].get(name) if isinstance(v['parts'], dict) else None
        if not r: continue
        im = P.load(os.path.join(ROOT, r['url'].split('?')[0])).astype(np.uint8); h = min(r['h'], v['h'] - r['y']); w = min(r['w'], v['w'] - r['x'])
        sub = c[r['y']:r['y'] + h, r['x']:r['x'] + w]; m = im[:h, :w, 3] > 0; sub[m] = im[:h, :w][m]
    return c, v


def main():
    n = 0
    for actor in sorted(os.listdir(EP)):
        if not os.path.exists(os.path.join(EP, actor, 'actor.json')): continue
        os.makedirs(os.path.join(OUT, actor), exist_ok=True)
        for vk in ('front', 'back'):
            c, v = full(actor, vk)
            if not c[..., 3].any(): c = P.load(os.path.join(ROOT, v['src'])).astype(np.uint8)   # 素体の部品がない人（元の絵のまま）
            Image.fromarray(c, 'RGBA').save(os.path.join(OUT, actor, vk + '_base.png'))
            k = 4; g = Image.new('RGBA', (v['w'] * k, v['h'] * k), (118, 124, 132, 255)); g.alpha_composite(Image.fromarray(c, 'RGBA').resize((v['w'] * k, v['h'] * k), Image.NEAREST)); d = ImageDraw.Draw(g)
            b = v.get('body'); 
            if b: d.rectangle([b['x0'] * k, b['y0'] * k, b['x1'] * k, b['y1'] * k], outline=(255, 230, 0, 255), width=2)
            for key, col in (('grip', (255, 40, 40, 255)), ('offhand', (60, 140, 255, 255))):
                p = v.get(key)
                if p: d.ellipse([p['x'] * k - 10, p['y'] * k - 10, p['x'] * k + 10, p['y'] * k + 10], outline=col, width=4); d.text((p['x'] * k + 14, p['y'] * k - 8), '%s %d,%d' % (key, p['x'], p['y']), fill=col)
            pv = v.get('pivot', [160, 304]); d.line([pv[0] * k - 40, pv[1] * k, pv[0] * k + 40, pv[1] * k], fill=(255, 255, 255, 255), width=3); d.text((pv[0] * k + 44, pv[1] * k - 8), 'pivot %d,%d' % tuple(pv), fill=(255, 255, 255, 255))
            g.convert('RGB').save(os.path.join(OUT, actor, vk + '_guide.png')); n += 1
    print('art_kit', n, 'views')


if __name__ == '__main__': main()
