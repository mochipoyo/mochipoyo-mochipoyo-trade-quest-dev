# v9.9.1 装備の外見の仕上げ：修正前後の比べ（メニュー正面・戦闘背面・勝利正面を、画面に出る大きさで）
#   python3 docs/tools/appear/pixel_sheets_fix.py <before|after> [人物ID,...]
#   → docs/appear/pixel/shots/fix_<before|after>_<pc|phone>.png
#   大きさ（CSS の画素。記録から）：
#     メニュー正面＝なかま画面の立ち絵の枠（PC 高さ 300px・スマホ縦 190px）に、その人の枠（frame）を収めた大きさ
#     戦闘背面・勝利正面＝戦闘の 1 ドット（PC 0.60・スマホ縦 0.45 CSS px。主人公の背面の人物の矩形の高さ ÷ 元の絵の人物の高さ）
#   ゲームと同じ重ね方の合成（compose.py）を縮めたもの。画面写真そのものではない（画面写真は browser/appear_pixel_party_ui.js の shots/ui_*_pt_*）
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
D = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'shots') + '/'; L = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'logs') + '/'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'appear', 'pixel'))
import manifest as MF, preview as PV, compose as CP
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
ft = lambda n: ImageFont.truetype(FONT, n) if os.path.exists(FONT) else ImageFont.load_default()
SETS = [('装備なし', {}), ('杖', {'weapon': 'oak_staff'}), ('剣＋盾', {'weapon': 'steel_sword', 'shield': 'iron_shield'}), ('鉄の兜', {'head': 'iron_helm'}),
        ('革の帽子', {'head': 'leather_cap'}), ('とんがり帽子', {'head': 'wizard_hat'}), ('額環', {'head': 'bu_control_seal_circlet'})]
MENU_H = {'pc': 300, 'phone': 190}
NAME = {'seris': 'セリス', 'ganes': 'ガネス', 'ord': 'オルド', 'lina': 'リーナ', 'hero': '主人公', 'kyle': 'カイル'}


def battle_k(v):
    rec = json.load(open(L + 'ui_mage_%s.json' % v, encoding='utf8'))['rec']; r = rec['m2']['battle']['rects']['hero']
    hb = MF.manifest()['actors']['hero']['views']['back']['body']; return r['h'] / (hb['y1'] - hb['y0'])


def cell(M, data, a, vk, eq, k, frame=None):
    c, sk = CP.compose(M, a, vk, eq, data); pad = M['pad']
    if frame:   # メニュー：枠で切り出して、枠の高さを画面の立ち絵の高さに
        x0, y0, x1, y1 = frame['x0'] + pad, frame['y0'] + pad, frame['x1'] + pad, frame['y1'] + pad
        c = c[max(0, y0):y1, max(0, x0):x1]
    im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA')
    if not frame: im = im.crop(im.getbbox())
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS), sk


def sheet(tag, v, actors):
    M = MF.manifest(); data = PV.appearance_data(); kb = battle_k(v); f = ft(12)
    rows = []
    for a in actors:
        A = M['actors'][a]; mv = A.get('menuBase') or 'menu'; fr = A['views'][mv].get('frame') or {'x0': 0, 'y0': 0, 'x1': A['views'][mv]['w'], 'y1': A['views'][mv]['h']}
        km = MENU_H[v] / (fr['y1'] - fr['y0'])
        for vk, lab in ((mv, 'メニュー正面'), ('back', '戦闘背面'), ('front', '勝利正面')):
            rows.append((a, lab, [cell(M, data, a, vk, eq, km if vk == mv else kb, fr if vk == mv else None) for _, eq in SETS]))
    cw = max(max(i.width for i, _ in r) for _, _, r in rows) + 10; cw = max(cw, max(int(f.getlength(l)) + 8 for l, _ in SETS))
    rh = [max(i.height for i, _ in r) + 6 for _, _, r in rows]
    W = 110 + cw * len(SETS); H = 24 + sum(rh) + 40
    S = Image.new('RGB', (W, H), (96, 104, 92)); d = ImageDraw.Draw(S)
    for n, (lab, _) in enumerate(SETS): d.text((110 + n * cw + 4, 4), lab, fill=(255, 240, 180), font=f)
    y = 24
    for (a, lab, cells), h in zip(rows, rh):
        d.text((4, y + h // 2 - 8), NAME.get(a, a) + '\n' + lab, fill=(255, 255, 255), font=f)
        for n, (im, sk) in enumerate(cells):
            S.paste(im, (110 + n * cw + (cw - im.width) // 2, y + h - im.height), im)
            if sk: d.text((110 + n * cw + 2, y), '描かない:' + ','.join(x.split(':')[0] for x in sk), fill=(255, 170, 170), font=ft(10))
        d.line([(0, y + h - 1), (W, y + h - 1)], fill=(80, 88, 78)); y += h
    d.text((4, H - 34), ('修正前' if tag == 'before' else '修正後') + '・' + ('PC 1280×720' if v == 'pc' else 'スマホ縦 390×664') +
           '：画面に出る大きさ（CSS の画素）。メニュー正面＝立ち絵の枠の高さ %dpx、戦闘背面・勝利正面＝1 ドット %.2f CSS px。ゲームと同じ重ね方の合成を縮めたもの（画面写真ではない）' % (MENU_H[v], kb), fill=(230, 235, 240), font=ft(11))
    out = D + 'fix_%s_%s.png' % (tag, v); S.save(out); print(os.path.basename(out), S.size)


if __name__ == '__main__':
    tag = sys.argv[1]; actors = sys.argv[2].split(',') if len(sys.argv) > 2 else ['seris', 'ganes', 'ord', 'lina']
    for v in ('pc', 'phone'): sheet(tag, v, actors)
