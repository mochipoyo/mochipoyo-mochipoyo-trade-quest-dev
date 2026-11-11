# v9.7 装備の外見（ドット絵の差分）：確かめの画面写真を並べた 1 枚を作る（報告用）
#   python3 docs/tools/appear/pixel_sheets.py   → docs/appear/pixel/shots/pixel_menu_sets.png・pixel_battle_sets.jpg・pixel_canvas_sheet.png
#   先に browser/appear_pixel.js（KIND=3d）と browser/appear_pixel_dump.js を動かしておく
import os
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'appear', 'pixel', 'shots') + '/'
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
f = ImageFont.truetype(FONT, 26) if os.path.exists(FONT) else ImageFont.load_default()
SETS = [('plain', '素（装備なし）'), ('light', '軽装＋剣'), ('heavy', '重鎧＋兜＋剣と盾'), ('robe', 'ローブ＋帽子＋杖'), ('spear', '重鎧＋槍（長さの確かめ）')]


def row(ims, out, bg=(20, 24, 40), jpg=False):
    W = sum(i.width for t, i in ims) + 12 * (len(ims) + 1); H = max(i.height for t, i in ims) + 50
    S = Image.new('RGB', (W, H), bg); d = ImageDraw.Draw(S); x = 12
    for t, im in ims:
        S.paste(im, (x, 46), im if im.mode == 'RGBA' else None); d.text((x + 6, 8), t, fill=(255, 230, 150), font=f); x += im.width + 12
    S.save(D + out, quality=88) if jpg else S.save(D + out); print(out, S.size)


# メニュー（なかまの画面の立ち絵の枠）
row([(t, Image.open(D + 'pixel_menu_3d_%s.png' % k).convert('RGB')) for k, t in SETS], 'pixel_menu_sets.png')
# 戦闘（3D の背面。主人公のまわりを切り出して 1.5 倍）
bat = []
for k, t in SETS:
    im = Image.open(D + 'pixel_battle_%s.jpg' % k).convert('RGB').crop((610, 500, 900, 960)); bat.append((t, im.resize((im.width * 3 // 2, im.height * 3 // 2), Image.LANCZOS)))
row(bat, 'pixel_battle_sets.jpg', jpg=True)
# ゲームの中で作った合成の絵（拡大：メニュー正面 3 倍・戦闘背面 2 倍）
rows = []
for vk, k, crop in (('job_warrior', 3, (8, 0, 218, 250)), ('back', 2, (100, 40, 320, 360))):
    rows.append([(t, Image.open(D + 'pixel_canvas_%s_%s.png' % (vk, n)).crop(crop).resize(((crop[2] - crop[0]) * k, (crop[3] - crop[1]) * k), Image.NEAREST)) for n, t in SETS])
W = max(sum(i.width for t, i in r) + 12 * (len(r) + 1) for r in rows); H = sum(max(i.height for t, i in r) + 44 for r in rows) + 10
S = Image.new('RGB', (W, H), (98, 106, 122)); d = ImageDraw.Draw(S); y = 6
for r in rows:
    x = 12
    for t, im in r:
        d.text((x + 4, y), t, fill=(255, 236, 170), font=f); S.paste(im, (x, y + 38), im); x += im.width + 12
    y += max(i.height for t, i in r) + 44
S.save(D + 'pixel_canvas_sheet.png'); print('pixel_canvas_sheet.png', S.size)
