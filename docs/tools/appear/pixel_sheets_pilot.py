# v9.10 用意してもらった絵の試し：ゲームと同じ重ね方の合成で、絵の品（騎士の剣・賢者の杖・戦斧・騎士の盾・騎士の兜）と、今までの形（鋼の剣・鉄の盾・鉄の兜）を並べる
#   python3 docs/tools/appear/pixel_sheets_pilot.py → docs/appear/pixel/shots/pilot_v910_items.png（等倍）・pilot_v910_scaled_<pc|phone>.png（戦闘の大きさ）・pilot_v910_costume.png
#   画面写真ではない（合成）。衣装はゲームに組み込んでいない（絵を素体の位置に合わせて置き、武器を握りの位置に重ねただけ。手は描き直していない）
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')); sys.path.insert(0, os.path.join(ROOT, 'tools', 'appear', 'pixel'))
import manifest as MF, preview as PV, compose as CP, art_import as AI, pxlib as P
D = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'shots') + '/'; FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
ft = lambda n: ImageFont.truetype(FONT, n) if os.path.exists(FONT) else ImageFont.load_default()
SETS = [('絵：騎士の剣＋騎士の盾＋騎士の兜', {'weapon': 'knight_sword', 'shield': 'knight_shield', 'head': 'knight_helm'}), ('絵：賢者の杖', {'weapon': 'sage_staff'}), ('絵：戦斧＋騎士の兜', {'weapon': 'battle_axe', 'head': 'knight_helm'}),
        ('今までの形：鋼の剣＋鉄の盾＋鉄の兜', {'weapon': 'steel_sword', 'shield': 'iron_shield', 'head': 'iron_helm'})]
ACTORS = ['hero', 'kyle', 'kazuto', 'gald', 'mina', 'lina', 'seris', 'ganes', 'ord', 'lucia', 'elna', 'nagi', 'iris', 'sophia', 'io', 'aster', 'mochipoyo']


def img(c, k):
    im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA'); bb = im.getbbox(); im = im.crop(bb) if bb else im
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST if k >= 1 else Image.LANCZOS)


def sheet(out, k, note):
    M = MF.manifest(); data = PV.appearance_data(); rows = []
    for a in ACTORS:
        r = []
        for vk in ('front', 'back'):
            for _, eq in SETS: r.append(img(CP.compose(M, a, vk, eq, data)[0], k))
        rows.append((a, r))
    cw = max(i.width for _, r in rows for i in r) + 6; rh = [max(i.height for i in r) + 4 for _, r in rows]; f = ft(11)
    S = Image.new('RGB', (cw * 8, sum(rh) + 44), (96, 104, 92)); d = ImageDraw.Draw(S)
    for n in range(8): d.text((n * cw + 2, 2), ('正面 ' if n < 4 else '背面 ') + SETS[n % 4][0][:14], fill=(255, 240, 180), font=ft(9 if cw < 150 else 11))
    y = 20
    for (a, r), h in zip(rows, rh):
        for n, i in enumerate(r): S.paste(i, (n * cw + (cw - i.width) // 2, y + h - i.height), i)
        d.text((2, y), a, fill=(255, 255, 0), font=f); y += h
    d.text((4, y + 4), note, fill=(230, 235, 240), font=f); S.save(D + out); print(out, S.size)


def costume():
    M = MF.manifest(); A = M['actors']['seris']; cells = []
    for vk in ('front', 'back'):
        base = P.load(os.path.join(ROOT, 'docs', 'appear', 'pixel', 'art_kit', 'seris', vk + '_base.png')); cos, sh = AI.costume('seris', 'festival', vk)
        cells.append(('今の素体 ' + vk, base)); cells.append(('衣装 ' + vk + '（ずらし %d,%d）' % sh, cos))
        for part, lab in (('art_sword_knight', '＋騎士の剣'), ('art_staff_sage', '＋賢者の杖')):
            c = cos.copy(); r = A['views'][vk]['parts'][part]; w = P.load(os.path.join(ROOT, r['url'].split('?')[0])); m = w[..., 3] > 0
            sub = c[r['y']:r['y'] + r['h'], r['x']:r['x'] + r['w']]; sub[m[:sub.shape[0], :sub.shape[1]]] = w[:sub.shape[0], :sub.shape[1]][m[:sub.shape[0], :sub.shape[1]]]; cells.append(('衣装 ' + vk + lab, c))
    k = 2; W = 320 * k; S = Image.new('RGB', (W * 4, (W + 20) * 2 + 24), (96, 104, 92)); d = ImageDraw.Draw(S)
    for n, (lab, c) in enumerate(cells):
        im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA').resize((W, W), Image.NEAREST); x, y = (n % 4) * W, (n // 4) * (W + 20); S.paste(im, (x, y + 20), im); d.text((x + 4, y + 2), lab, fill=(255, 240, 180), font=ft(13))
    d.text((4, S.height - 20), 'セリスの晴れ着（2 倍）。絵を素体の足もとに合わせて置き、武器を握りの位置に重ねただけ。手の描き直し・ゲームへの組み込みはまだ（合成。画面写真ではない）', fill=(230, 235, 240), font=ft(12)); S.save(D + 'pilot_v910_costume.png'); print('pilot_v910_costume.png', S.size)


if __name__ == '__main__':
    sheet('pilot_v910_items.png', 1.0, '等倍（元の絵の 1 ドット＝1 画素）。ゲームと同じ重ね方の合成（画面写真ではない）')
    sheet('pilot_v910_scaled_pc.png', 0.60, '戦闘の表示の大きさ（PC：1 ドット 0.60 CSS px）。合成（画面写真ではない）')
    sheet('pilot_v910_scaled_phone.png', 0.45, '戦闘の表示の大きさ（スマホ縦：1 ドット 0.45 CSS px）。合成（画面写真ではない）')
    costume()
