# v9.8 装備の外見（ドット絵の差分）：仲間（リーナ・ガルド）の確かめの画面写真を並べた 1 枚を作る（報告用）
#   python3 docs/tools/appear/pixel_sheets_comp.py
#   先に browser/appear_pixel_comp_ui.js（VIEW=pc・phone）を動かしておく（記録 logs/ui_comp_<pc|phone>.json の人物の矩形で切り出す）
#   ・compare_comp_<pc|phone>.jpg：行＝リーナ 装備なし／リーナ 法衣＋杖／ガルド 装備なし／ガルド 重鎧＋斧
#                                  列＝メニュー正面／戦闘背面／勝利正面（結果の窓を隠して）／勝利正面（結果の窓あり）／戦闘のあとのメニュー
#     メニュー＝なかまの画面の立ち絵の枠（同じ倍率）。戦闘・勝利＝同じカメラ・同じ倍率（画面写真の 2 倍の画素のまま切り出す）
#   ・pixel_comp_sets_<lina|gald>.jpg：ゲームと同じ重ね方で作った合成の絵（menu・front・back × 組み合わせ。2 倍）
import os, sys, json
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
D = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'shots') + '/'; L = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'logs') + '/'
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
f = ImageFont.truetype(FONT, 24) if os.path.exists(FONT) else ImageFont.load_default()
fs = ImageFont.truetype(FONT, 18) if os.path.exists(FONT) else ImageFont.load_default()
ROWS = [('lina', 'plain', 'リーナ\n装備なし\n（旅装・手ぶら）'), ('lina', 'equip', 'リーナ\n見送りの法衣\n＋樫の杖'), ('gald', 'plain', 'ガルド\n装備なし\n（旅装・手ぶら）'), ('gald', 'equip', 'ガルド\n鉄の鎧＋戦斧')]


def crop_rect(path, r, k=2, m=14):
    im = Image.open(path).convert('RGB'); x0, y0 = int((r['x'] - m) * k), int((r['y'] - m * 2.2) * k); x1, y1 = int((r['x'] + r['w'] + m) * k), int((r['y'] + r['h'] + m) * k)
    return im.crop((max(0, x0), max(0, y0), min(im.width, x1), min(im.height, y1)))


def missing(w=200, h=200, t='画面なし（確かめられず）'):
    im = Image.new('RGB', (w, h), (60, 20, 20)); ImageDraw.Draw(im).text((8, h // 2 - 10), t, fill=(255, 200, 200), font=fs); return im


for v in ('pc', 'phone'):
    lp = L + 'ui_comp_%s.json' % v
    if not os.path.exists(lp): continue
    rec = json.load(open(lp, encoding='utf8'))['rec']
    rows = []
    for aid, st, title in ROWS:
        b = rec[st]['battle'] or {}; cells = []
        def menu(tag):
            p = D + 'ui_%s_c_menu%s_%s_%s.png' % (v, tag, aid, st); return Image.open(p).convert('RGB') if os.path.exists(p) else missing()
        cells.append(('メニュー正面', menu('')))
        r = (b.get('rects') or {}).get(aid); p = D + 'ui_%s_c_battle_%s.jpg' % (v, st)
        cells.append(('戦闘背面', crop_rect(p, r) if r and os.path.exists(p) else missing()))
        r = (b.get('vrects') or {}).get(aid); p = D + 'ui_%s_c_victory_%s.jpg' % (v, st); p2 = D + 'ui_%s_c_victory_ui_%s.jpg' % (v, st)
        cells.append(('勝利正面', crop_rect(p, r) if r and os.path.exists(p) else missing()))
        cv = (b.get('cover') or {}).get(aid)
        cells.append(('勝利正面（窓あり）' + ('\n窓に隠れる %d%%' % round(cv['covered'] * 100) if cv else ''), crop_rect(p2, r) if r and os.path.exists(p2) else missing()))
        cells.append(('戦闘のあとのメニュー', menu('_after')))
        rows.append((title, cells))
    ncol = len(rows[0][1]); ww = [max(c[j][1].width for _, c in rows) for j in range(ncol)]; hh = [max(i.height for _, i in c) for _, c in rows]
    LW = 200; HD = 70; W = LW + sum(ww) + 12 * (ncol + 1); H = HD + sum(h + 16 for h in hh) + 44
    S = Image.new('RGB', (W, H), (20, 24, 40)); d = ImageDraw.Draw(S); x = LW
    for j in range(ncol): d.multiline_text((x + 6, 8), rows[0][1][j][0].split('\n')[0], fill=(255, 230, 150), font=f, spacing=4); x += ww[j] + 12
    y = HD
    for (title, cells), h in zip(rows, hh):
        d.multiline_text((10, y + h // 2 - 40), title, fill=(255, 255, 255), font=fs, spacing=6); x = LW
        for j, (lab, im) in enumerate(cells):
            S.paste(im, (x + (ww[j] - im.width) // 2, y + h - im.height))
            if '\n' in lab: d.text((x + 6, y + 2), lab.split('\n')[1], fill=(255, 200, 160), font=fs)
            x += ww[j] + 12
        y += h + 16
    d.text((10, H - 34), ('PC 1280×720' if v == 'pc' else 'スマホ縦 390×664') + '。ふつうの装備メニューで変更 → そのまま戦闘 → 勝利 → メニュー。戦闘・勝利は同じカメラ・同じ倍率（結果の窓ありの列は、窓が人物に重なった画面そのまま）', fill=(200, 210, 230), font=fs)
    S.save(D + 'compare_comp_%s.jpg' % v, quality=88); print('compare_comp_%s.jpg' % v, S.size)
# 合成の絵（開発用の重ね方の見本）
sys.path.insert(0, os.path.join(ROOT, 'tools', 'appear', 'pixel'))
import manifest as MF, preview as PV, compose as CP
M = MF.manifest(); data = PV.appearance_data()
for a in ('lina', 'gald'):
    if a in M['actors']: CP.sheet(M, a, D, data, each=False, name='pixel_comp_sets_%s.jpg' % a)
