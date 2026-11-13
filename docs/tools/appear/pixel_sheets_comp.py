# v9.8 装備の外見（ドット絵の差分）：仲間（リーナ・ガルド）の確かめの画面写真を並べた 1 枚を作る（報告用）
#   python3 docs/tools/appear/pixel_sheets_comp.py
#   先に browser/appear_pixel_comp_ui.js（VIEW=pc・phone）を動かしておく（記録 logs/ui_comp_<pc|phone>.json の人物の矩形で切り出す）
#   ・compare_comp_<pc|phone>.jpg：行＝リーナ 装備なし／法衣＋杖／＋革の帽子／杖をはずす、ガルド 装備なし／重鎧＋斧／剣＋盾／剣をはずす（v9.8.1）
#                                  列＝メニュー正面／戦闘背面／勝利正面（結果の窓を隠して）／勝利正面（結果の窓あり）／戦闘のあとのメニュー
#     メニュー＝なかまの画面の立ち絵の枠（同じ倍率）。戦闘・勝利＝同じカメラ・同じ倍率（画面写真の 2 倍の画素のまま切り出す）
#   ・pixel_comp_sets_<hero|lina|gald>.jpg：ゲームと同じ重ね方で作った合成の絵（メニュー・勝利の正面・背面 × 組み合わせ。2 倍）
#   v9.8.2 python3 docs/tools/appear/pixel_sheets_comp.py knight：カイル・カズト（browser/appear_pixel_knight_ui.js の記録 logs/ui_knight_<pc|phone>.json）
#     → compare_knight_<pc|phone>.jpg（行＝カイル・カズト × 装備なし／重鎧＋剣と盾／持ち替え／武器なし）・pixel_comp_sets_<kyle|kazuto>.jpg
import os, sys, json
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
D = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'shots') + '/'; L = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'logs') + '/'
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
f = ImageFont.truetype(FONT, 24) if os.path.exists(FONT) else ImageFont.load_default()
fs = ImageFont.truetype(FONT, 18) if os.path.exists(FONT) else ImageFont.load_default()
ROWS = [('lina', 'plain', 'リーナ\n装備なし\n（旅装・手ぶら）'), ('lina', 'equip', 'リーナ\n見送りの法衣\n＋樫の杖'), ('lina', 'swap', 'リーナ\n法衣＋杖\n＋革の帽子'), ('lina', 'unarm', 'リーナ\n法衣＋帽子\n（杖をはずす）'),
        ('gald', 'plain', 'ガルド\n装備なし\n（旅装・手ぶら）'), ('gald', 'equip', 'ガルド\n鉄の鎧＋戦斧'), ('gald', 'swap', 'ガルド\n鉄の鎧＋鋼の剣\n＋鉄の盾'), ('gald', 'unarm', 'ガルド\n鉄の鎧＋盾\n（剣をはずす）')]
KNIGHT = len(sys.argv) > 1 and sys.argv[1] == 'knight'
if KNIGHT:
    ROWS = [('kyle', 'plain', 'カイル\n装備なし\n（鎧下・手ぶら）'), ('kyle', 'equip', 'カイル\n鉄の鎧＋鋼の剣\n＋鉄の盾'), ('kyle', 'swap', 'カイル\n剣→鉄の槍\n（鎧・盾はそのまま）'), ('kyle', 'unarm', 'カイル\n鉄の鎧＋盾\n（槍をはずす）'),
            ('kazuto', 'plain', 'カズト\n装備なし\n（鎧下・手ぶら）'), ('kazuto', 'equip', 'カズト\n鉄の鎧＋鋼の剣\n＋鉄の盾'), ('kazuto', 'swap', 'カズト\n剣と盾→戦斧\n（鎧はそのまま）'), ('kazuto', 'unarm', 'カズト\n鉄の鎧\n（斧をはずす）')]
MINA = len(sys.argv) > 1 and sys.argv[1] == 'mina'   # v9.8.4 ミナ（弓・短剣）：logs/ui_mina_<pc|phone>.json → compare_mina_<pc|phone>.jpg・pixel_comp_sets_mina.jpg
if MINA:
    ROWS = [('mina', 'plain', 'ミナ\n装備なし\n（手ぶら）'), ('mina', 'sword', 'ミナ\n銅の剣\n（片手剣）'), ('mina', 'equip', 'ミナ\n短弓に持ち替え'), ('mina', 'swap', 'ミナ\n短剣に持ち替え'), ('mina', 'unarm', 'ミナ\n武器をはずす')]
HJ = len(sys.argv) > 1 and sys.argv[1] == 'herojob'   # v9.8.6 主人公の転職（狩人・盗賊）：logs/ui_herojob_<pc|phone>.json → compare_herojob_<pc|phone>.jpg
if HJ:
    ROWS = [('hero', 'w0', '主人公\n戦士\n鉄の鎧＋鋼の剣'), ('hero', 'h0', '主人公\n狩人に転職\n（剣・鎧が外れる）'), ('hero', 'h1', '主人公\n狩人\n短弓'), ('hero', 'h2', '主人公\n狩人\n短弓をはずす'),
            ('hero', 't1', '主人公\n盗賊に転職\n短剣'), ('hero', 't2', '主人公\n盗賊\n「つづきから」で復帰'), ('hero', 'w1', '主人公\n戦士に転職\n（短剣が外れる）')]
LOGN, SHN, OUTN = ('herojob', 'j', 'herojob') if HJ else ('mina', 'm', 'mina') if MINA else ('knight', 'k', 'knight') if KNIGHT else ('comp', 'c', 'comp')


def crop_rect(path, r, k=2, m=14):
    im = Image.open(path).convert('RGB'); x0, y0 = int((r['x'] - m) * k), int((r['y'] - m * 2.2) * k); x1, y1 = int((r['x'] + r['w'] + m) * k), int((r['y'] + r['h'] + m) * k)
    return im.crop((max(0, x0), max(0, y0), min(im.width, x1), min(im.height, y1)))


def missing(w=200, h=200, t='画面なし（確かめられず）'):
    im = Image.new('RGB', (w, h), (60, 20, 20)); ImageDraw.Draw(im).text((8, h // 2 - 10), t, fill=(255, 200, 200), font=fs); return im


for v in ('pc', 'phone'):
    lp = L + 'ui_%s_%s.json' % (LOGN, v)
    if not os.path.exists(lp): continue
    rec = json.load(open(lp, encoding='utf8'))['rec']
    rows = []
    for aid, st, title in ROWS:
        b = rec[st]['battle'] or {}; cells = []
        def menu(tag):
            p = D + 'ui_%s_%s_menu%s_%s_%s.png' % (v, SHN, tag, aid, st); return Image.open(p).convert('RGB') if os.path.exists(p) else missing()
        cells.append(('メニュー正面', menu('')))
        r = (b.get('rects') or {}).get(aid); p = D + 'ui_%s_%s_battle_%s.jpg' % (v, SHN, st)
        cells.append(('戦闘背面', crop_rect(p, r) if r and os.path.exists(p) else missing()))
        r = (b.get('vrects') or {}).get(aid); p = D + 'ui_%s_%s_victory_%s.jpg' % (v, SHN, st); p2 = D + 'ui_%s_%s_victory_ui_%s.jpg' % (v, SHN, st)
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
    S.save(D + 'compare_%s_%s.jpg' % (OUTN, v), quality=88); print('compare_%s_%s.jpg' % (OUTN, v), S.size)
# 合成の絵（開発用の重ね方の見本）
sys.path.insert(0, os.path.join(ROOT, 'tools', 'appear', 'pixel'))
import manifest as MF, preview as PV, compose as CP
M = MF.manifest(); data = PV.appearance_data()
for a in (() if HJ else ('mina',) if MINA else ('kyle', 'kazuto') if KNIGHT else ('hero', 'lina', 'gald')):
    if a in M['actors']: CP.sheet(M, a, D, data, each=False, name='pixel_comp_sets_%s.jpg' % a)
