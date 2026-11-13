# v9.8.9 装備の外見：主人公と仲間の職業の服・装備の比較画像（報告用）
#   python3 docs/tools/appear/pixel_sheets_party.py
#   1 lineup_party_<pc|phone>_css.png：ゲームの戦闘の画面写真から、人物を「画面に出る大きさ（CSS の画素）」で切り出して並べる
#       主人公（browser/appear_pixel_mage_ui.js の記録：戦士・狩人・盗賊・魔法使い）とカイル（browser/appear_pixel_party_ui.js：騎士・魔法使い＋ローブ＋杖・杖をはずす）
#   2 jobs_scaled_<pc|phone>.png：ゲームと同じ重ね方の合成（compose.py）で、6 人 × 21 職業の戦闘の背面と勝利の正面を、
#       記録した戦闘の表示の大きさ（主人公の背面の人物の矩形の高さ ÷ 元の絵の人物の高さ）に縮めたもの（画面写真ではない。並べて見比べる見本）
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
D = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'shots') + '/'; L = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'logs') + '/'
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
ft = lambda n: ImageFont.truetype(FONT, n) if os.path.exists(FONT) else ImageFont.load_default()
sys.path.insert(0, os.path.join(ROOT, 'tools', 'appear', 'pixel'))
import manifest as MF, preview as PV, compose as CP, pxlib as P


def crop(path, r, m=8, k=2):
    im = Image.open(path).convert('RGB'); x0, y0 = int((r['x'] - m) * k), int((r['y'] - m * 2.2) * k); x1, y1 = int((r['x'] + r['w'] + m) * k), int((r['y'] + r['h'] + m) * k)
    im = im.crop((max(0, x0), max(0, y0), min(im.width, x1), min(im.height, y1))); return im.resize((max(1, round(im.width / k)), max(1, round(im.height / k))), Image.LANCZOS)


def lineup(v):
    cells = []
    mg = L + 'ui_mage_%s.json' % v; pt = L + 'ui_party_%s.json' % v
    if os.path.exists(mg):
        rec = json.load(open(mg, encoding='utf8'))['rec']
        for key, t in (('w0', '主人公 戦士'), ('h1', '主人公 狩人'), ('t1', '主人公 盗賊'), ('m1', '主人公 魔法使い 杖'), ('m2', '主人公 魔法使い 装備なし')):
            b = rec.get(key, {}).get('battle') or {}; r = (b.get('rects') or {}).get('hero'); vr = (b.get('vrects') or {}).get('hero')
            if r and vr: cells.append((t, crop(D + 'ui_%s_mg_battle_%s.jpg' % (v, key), r), crop(D + 'ui_%s_mg_victory_%s.jpg' % (v, key), vr), r))
    if os.path.exists(pt):
        rec = json.load(open(pt, encoding='utf8'))['rec']
        for key, t in (('k0', 'カイル 騎士 剣と盾'), ('k2', 'カイル 魔法使い ローブ＋杖'), ('k3', 'カイル 魔法使い 杖なし')):
            b = rec.get(key, {}).get('battle') or {}; r = (b.get('rects') or {}).get('kyle'); vr = (b.get('vrects') or {}).get('kyle')
            if r and vr: cells.append((t, crop(D + 'ui_%s_pt_battle_%s.jpg' % (v, key), r), crop(D + 'ui_%s_pt_victory_%s.jpg' % (v, key), vr), r))
    if not cells: return None
    f = ft(13); cw = max(max(a.width, b.width, int(f.getlength(t))) for t, a, b, _ in cells) + 14; h1 = max(a.height for _, a, _, _ in cells); h2 = max(b.height for _, _, b, _ in cells)
    S = Image.new('RGB', (60 + cw * len(cells), 30 + h1 + h2 + 70), (20, 24, 40)); d = ImageDraw.Draw(S)
    for i, (t, a, b, r) in enumerate(cells):
        x = 60 + i * cw; d.text((x + 2, 6), t, fill=(255, 230, 150), font=f); S.paste(a, (x + (cw - a.width) // 2, 28 + h1 - a.height)); S.paste(b, (x + (cw - b.width) // 2, 36 + h1 + h2 - b.height))
        d.text((x + 2, 40 + h1 + h2), '%d×%d' % (round(r['w']), round(r['h'])), fill=(190, 200, 220), font=f)
    d.text((4, 28 + h1 // 2), '背面', fill=(255, 255, 255), font=f); d.text((4, 36 + h1 + h2 // 2), '勝利正面', fill=(255, 255, 255), font=f)
    d.text((4, S.height - 22), ('PC 1280×720' if v == 'pc' else 'スマホ縦 390×664') + '：ゲームの戦闘の画面写真を、画面に出る大きさ（CSS の画素）で切り出した。数字＝背面の人物の矩形（CSS px）', fill=(200, 210, 230), font=f)
    out = D + 'lineup_party_%s_css.png' % v; S.save(out); print(os.path.basename(out), S.size); return S


def scaled(v):
    mg = L + 'ui_mage_%s.json' % v
    if not os.path.exists(mg): return
    rec = json.load(open(mg, encoding='utf8'))['rec']; r = rec['m2']['battle']['rects']['hero']
    M = MF.manifest(); data = PV.appearance_data(); hb = M['actors']['hero']['views']['back']['body']; k = r['h'] / (hb['y1'] - hb['y0'])   # 画面の 1 ドットの大きさ（CSS px）
    S = json.load(open(os.path.join(ROOT, 'docs', 'appear', 'pixel', 'survey_all.json'), encoding='utf8')); jobs = list(S['jobs'])
    f = ft(11); rows = []
    for a in ('hero', 'lina', 'gald', 'kyle', 'kazuto', 'mina'):
        for vk in ('back', 'front'):
            ims = []
            for j in jobs:
                c, _ = CP.compose(M, a, vk, {'_job': j}, data); im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA'); im = im.crop(im.getbbox())
                ims.append(im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS))
            rows.append((a, vk, ims))
    cw = max(max(i.width for i in ims) for _, _, ims in rows) + 6; cw = max(cw, 52); rh = [max(i.height for i in ims) + 4 for _, _, ims in rows]
    W = 70 + cw * len(jobs); H = 20 + sum(rh) + 30
    Img = Image.new('RGB', (W, H), (96, 104, 92)); d = ImageDraw.Draw(Img)
    for n, j in enumerate(jobs): d.text((70 + n * cw + 2, 4), S['jobs'][j]['name'][:5], fill=(255, 240, 180), font=f)
    y = 20
    for (a, vk, ims), h in zip(rows, rh):
        d.text((4, y + h // 2 - 6), S['chars'][a]['name'][:4] + ('・背面' if vk == 'back' else '・正面'), fill=(255, 255, 255), font=f)
        for n, im in enumerate(ims): Img.paste(im, (70 + n * cw + (cw - im.width) // 2, y + h - im.height), im)
        y += h
    d.text((4, H - 24), ('PC' if v == 'pc' else 'スマホ縦') + '：合成の見本（ゲームと同じ重ね方）を、戦闘の表示の大きさ（主人公の背面 %.0f px の高さ。1 ドット＝%.2f CSS px）に縮めた。画面写真ではない。装備なし' % (r['h'], k), fill=(230, 235, 240), font=f)
    out = D + 'jobs_scaled_%s.png' % v; Img.save(out); print(os.path.basename(out), Img.size)


for v in ('pc', 'phone'):
    lineup(v); scaled(v)
