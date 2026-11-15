# v9.10 騎士の兜の背面：首当ての長い絵（届いた絵）と、短くした差し替え（helm_knight_back_short.png＝届いた絵の首当ての中ほど 160 ドットを抜いて下の縁を詰めたもの）の比べ
#   python3 docs/tools/appear/pixel_sheets_helm.py → docs/appear/pixel/shots/helm_back_compare.png（2 倍）・helm_back_compare_scaled.png（戦闘の大きさ PC 0.60）
#   体格・髪型の違う 10 人の背面。兜用の素の絵（base_helm）の上に、同じ決まり（今の兜の幅と上端）で置く。各人：届いた絵（幅 0.92）／短い絵（幅 0.92）／短い絵（幅 1.00）／正面（参考）
#   下に、兜の下端の y と、首（襟足）の目安＝今の兜の部品の下端の y を出す
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')); sys.path.insert(0, os.path.join(ROOT, 'tools', 'appear', 'pixel'))
import manifest as MF, art_import as AI, pxlib as P, compose as CP, preview as PV
D = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'shots') + '/'; FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
ft = lambda n: ImageFont.truetype(FONT, n) if os.path.exists(FONT) else ImageFont.load_default()
ACTORS = ['hero', 'gald', 'kazuto', 'mina', 'lina', 'seris', 'elna', 'ord', 'sophia', 'mochipoyo']


def base_of(M, a, vk, part='base_helm'):
    v = M['actors'][a]['views'][vk]; c = np.zeros((v['h'], v['w'], 4), np.int32); r = v['parts'][part]; im = P.load(os.path.join(ROOT, r['url'].split('?')[0])); c[r['y']:r['y'] + im.shape[0], r['x']:r['x'] + im.shape[1]] = im; return c, v


def over(c, a): m = a[..., 3] > 0; o = c.copy(); o[m] = a[m]; return o


def cells(M, a):
    b, v = base_of(M, a, 'back'); mask, _ = AI.ref_mask(M, a, 'back', 'head_helm'); x0, y0, x1, y1 = P.bbox(mask); out = []
    for src, w in (('helm_knight_back.png', 0.92), ('helm_knight_back_short.png', 0.92), ('helm_knight_back_short.png', 1.0)):
        im = AI.src(src); ww = (x1 + 1 - x0) * w; hh = ww * im.height / im.width; cx = (x0 + x1 + 1) / 2.0
        art = AI.boxed(im, cx - ww / 2, y0 - 2, cx + ww / 2, y0 - 2 + hh, v['w'], v['h']); out.append((over(b, art), int(P.bbox(art[..., 3] > 0)[3])))
    data = PV.appearance_data(); f = CP.compose(M, a, 'front', {'head': 'knight_helm'}, data)[0]
    return out, f, y1


def main():
    M = MF.manifest(); rows = [(a,) + cells(M, a) for a in ACTORS]
    for name, k in (('helm_back_compare.png', 2.0), ('helm_back_compare_scaled.png', 0.6)):
        cw = int(190 * k) + 8; ch = int(200 * k) + 30; S = Image.new('RGB', (cw * 4 + 70, ch * len(rows) + 40), (96, 104, 92)); d = ImageDraw.Draw(S); f = ft(11)
        for n, t in enumerate(('届いた絵（幅 0.92）', '短い絵（幅 0.92）', '短い絵（幅 1.00）', '正面（参考）')): d.text((70 + n * cw + 2, 2), t, fill=(255, 240, 180), font=f)
        for i, (a, cs, fr, neck) in enumerate(rows):
            y = 20 + i * ch; d.text((2, y + 4), a, fill=(255, 255, 0), font=f)
            v = M['actors'][a]['views']['back']; mk, _ = AI.ref_mask(M, a, 'back', 'head_helm'); x0, y0, x1, y1 = P.bbox(mk); cx = (x0 + x1) // 2; box = (max(0, cx - 95), max(0, y0 - 30), max(0, cx - 95) + 190, max(0, y0 - 30) + 200)
            for n, (c, bot) in enumerate(cs):
                im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA').crop(box); im = im.resize((int(190 * k), int(200 * k)), Image.NEAREST if k >= 1 else Image.LANCZOS); S.paste(im, (70 + n * cw, y), im)
                d.text((70 + n * cw + 2, y + int(200 * k) + 2), '兜の下端 y%d（今の兜 y%d。差 %+d）' % (bot, neck, bot - neck), fill=(230, 235, 240), font=ft(10))
            pad = M['pad']; fi = Image.fromarray(np.clip(fr, 0, 255).astype(np.uint8), 'RGBA'); fv = M['actors'][a]['views']['front']; fm, _ = AI.ref_mask(M, a, 'front', 'head_helm'); fx0, fy0, fx1, fy1 = P.bbox(fm); fcx = (fx0 + fx1) // 2 + pad
            fb = (max(0, fcx - 95), max(0, fy0 + pad - 30), max(0, fcx - 95) + 190, max(0, fy0 + pad - 30) + 200); fi = fi.crop(fb).resize((int(190 * k), int(200 * k)), Image.NEAREST if k >= 1 else Image.LANCZOS); S.paste(fi, (70 + 3 * cw, y), fi)
        d.text((4, S.height - 18), '騎士の兜の背面の比べ（%s）。合成（画面写真ではない）。短い絵＝届いた絵の首当てを 160 ドット短くした差し替え' % ('2 倍' if k >= 1 else '戦闘の大きさ PC 0.60'), fill=(230, 235, 240), font=f)
        S.save(D + name); print(name, S.size)


if __name__ == '__main__': main()
