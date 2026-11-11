# v9.7 装備の外見（ドット絵の差分）：確かめの画面写真を並べた 1 枚を作る（報告用）
#   python3 docs/tools/appear/pixel_sheets.py
#   先に browser/appear_pixel_ui.js（VIEW=pc・phone）と browser/appear_pixel_dump.js を動かしておく
#   ・ui_<pc|phone>_menu_sheet.png：装備メニューで変えたあとの、なかまの画面の立ち絵（枠の画面写真。6 つとも同じ大きさの枠＝同じ倍率）
#   ・ui_<pc|phone>_battle_sheet.jpg：そのまま入った戦闘の、主人公のまわり（同じカメラ・同じ切り出し＝同じ倍率）
#   ・pixel_front_back_sheet.png：ゲームの中で作った合成の絵。正面（メニュー）と背面（戦闘）を同じ 3 倍で、足もとの線をそろえて並べる
import os
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'appear', 'pixel', 'shots') + '/'
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
f = ImageFont.truetype(FONT, 26) if os.path.exists(FONT) else ImageFont.load_default()
fs = ImageFont.truetype(FONT, 20) if os.path.exists(FONT) else ImageFont.load_default()
UI = [('plain', '装備なし'), ('light', '軽装＋剣'), ('heavy', '重鎧＋兜＋剣と盾'), ('robe', 'ローブ＋帽子＋杖'), ('spear', '槍装備'), ('off', '全部はずす（解除）')]
# 戦闘の画面写真から主人公のまわりを切り出す範囲（画面の倍率 2 の画素。カメラは毎回同じ）
BATTLE_CROP = {'pc': (600, 560, 900, 960), 'phone': (236, 500, 446, 850)}


def row(ims, out, bg=(20, 24, 40), jpg=False, note=None):
    if not ims: return
    W = sum(i.width for t, i in ims) + 12 * (len(ims) + 1); H = max(i.height for t, i in ims) + 50 + (34 if note else 0)
    S = Image.new('RGB', (W, H), bg); d = ImageDraw.Draw(S); x = 12
    for t, im in ims:
        S.paste(im, (x, 46), im if im.mode == 'RGBA' else None); d.text((x + 6, 8), t, fill=(255, 230, 150), font=f); x += im.width + 12
    if note: d.text((12, H - 30), note, fill=(200, 210, 230), font=fs)
    S.save(D + out, quality=88) if jpg else S.save(D + out); print(out, S.size)


for v in ('pc', 'phone'):
    if not os.path.exists(D + 'ui_%s_menu_plain.png' % v): continue
    row([(t, Image.open(D + 'ui_%s_menu_%s.png' % (v, k)).convert('RGB')) for k, t in UI if os.path.exists(D + 'ui_%s_menu_%s.png' % (v, k))], 'ui_%s_menu_sheet.png' % v,
        note='装備メニュー（そうび）で変更・解除したあとの、なかまの画面の立ち絵の枠（%s）。6 つとも同じ大きさの枠・同じ倍率' % ('PC 1280×720' if v == 'pc' else 'スマホ縦 390×664'))
    cr = BATTLE_CROP.get(v)
    if cr:
        bat = []
        for k, t in UI:
            p = D + 'ui_%s_battle_%s.jpg' % (v, k)
            if os.path.exists(p): bat.append((t, Image.open(p).convert('RGB').crop(cr)))
        row(bat, 'ui_%s_battle_sheet.jpg' % v, jpg=True, note='そのまま入った戦闘（3D・背面）。同じカメラ・同じ切り出し＝同じ倍率')
# 正面と背面を同じ 3 倍で（ゲームの中で作った合成の絵）
SETS = [('plain', '装備なし'), ('light', '軽装＋剣'), ('heavy', '重鎧＋兜＋剣と盾'), ('robe', 'ローブ＋帽子＋杖'), ('spear', '槍装備'), ('robeonly', 'ローブだけ'), ('heavyonly', '重鎧だけ')]
PAD, K = 48, 3
CROP = {'job_warrior': (PAD - 2, PAD - 26, PAD + 132, PAD + 200), 'back': (PAD + 52, PAD + 70, PAD + 262, PAD + 306)}
rows = []
for vk, title in (('job_warrior', '正面（メニュー）'), ('back', '背面（戦闘）')):
    r = []
    for n, t in SETS:
        p = D + 'pixel_canvas_%s_%s.png' % (vk, n)
        if not os.path.exists(p): continue
        c = CROP[vk]; im = Image.open(p).crop(c); r.append((t, im.resize((im.width * K, im.height * K), Image.NEAREST)))
    rows.append((title, r))
W = max(sum(i.width for t, i in r) + 12 * (len(r) + 1) for _, r in rows) + 150; H = sum(max(i.height for t, i in r) + 44 for _, r in rows) + 60
S = Image.new('RGB', (W, H), (98, 106, 122)); d = ImageDraw.Draw(S); y = 6
for title, r in rows:
    hh = max(i.height for t, i in r); x = 150; d.text((8, y + 38 + hh // 2), title, fill=(255, 255, 255), font=f)
    for t, im in r:
        d.text((x + 4, y), t, fill=(255, 236, 170), font=fs); S.paste(im, (x, y + 38 + hh - im.height), im); x += im.width + 12
    d.line([(150, y + 38 + hh - 1), (W - 8, y + 38 + hh - 1)], fill=(255, 80, 80), width=1)   # 足もとの線
    y += hh + 44
d.text((8, H - 34), '同じ 3 倍（1 ドット＝3 画素）。赤い線＝足もと（基準点の行）。帽子・槍・杖の先も枠の中', fill=(235, 240, 250), font=fs)
S.save(D + 'pixel_front_back_sheet.png'); print('pixel_front_back_sheet.png', S.size)
