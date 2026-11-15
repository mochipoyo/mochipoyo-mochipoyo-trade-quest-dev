# v9.10 衣装の比べ（ゲームの画面写真から。メニュー正面・戦闘背面・勝利正面を、画面に出る大きさ＝CSS の画素で）
#   python3 docs/tools/appear/pixel_sheets_cos_ui.py [pc|phone] → docs/appear/pixel/shots/cos_ui_<pc|phone>.png
#   もとは browser/appear_pixel_party_ui.js（FLOW=cos PT=seris）の画面写真と記録。ヘッドレス Chromium（実機ではない）
import os, sys, json
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')); O = os.path.join(ROOT, 'docs', 'appear', 'pixel') + '/'
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'; ft = lambda n: ImageFont.truetype(FONT, n) if os.path.exists(FONT) else ImageFont.load_default()
ROWS = [('c0', '通常の外見：賢者の杖＋旅人のローブ＋魔法使いの帽子（魔法使い）'), ('c1', '祭りの晴れ着：賢者の杖（装備は上と同じ）'),
        ('c2', '祭りの晴れ着：鋼の剣＋鉄の盾（戦士。鉄の鎧・鉄の兜も装備中）'), ('c3', '祭りの晴れ着：騎士の剣＋騎士の盾（戦士）'), ('c4', '通常の外見に戻す：騎士の剣＋騎士の盾＋鉄の鎧＋鉄の兜（戦士）')]


def main(view):
    rec = json.load(open(O + 'logs/ui_party_cos_seris_%s.json' % view, encoding='utf8'))['rec']; dpr = 2; rows = []
    for key, lab in ROWS:
        r = rec.get(key)
        if not r: continue
        cells = []; m = Image.open(O + 'shots/ui_%s_pt_cos_seris_menu_seris_%s.png' % (view, key)).convert('RGB'); cells.append(m.resize((m.width // dpr, m.height // dpr), Image.LANCZOS))
        for shot, rk in (('battle', 'rects'), ('victory', 'vrects')):
            R = r['battle'][rk]['seris']; im = Image.open(O + 'shots/ui_%s_pt_cos_seris_%s_%s.jpg' % (view, shot, key)).convert('RGB')
            box = (R['x'] - R['w'] * 0.45, R['y'] - R['h'] * 0.45, R['x'] + R['w'] * 1.45, R['y'] + R['h'] + 6); c = im.crop(tuple(int(round(v * dpr)) for v in box)); cells.append(c.resize((c.width // dpr, c.height // dpr), Image.LANCZOS))
        rows.append((lab, cells, r['menu']['seris']['parts'], r['battle']['px']['parts']))
    cw = [max(c[i].width for _, c, _, _ in rows) + 12 for i in range(3)]; rh = [max(x.height for x in c) + 44 for _, c, _, _ in rows]
    S = Image.new('RGB', (sum(cw) + 16, sum(rh) + 60), (40, 44, 48)); d = ImageDraw.Draw(S); x = 8
    for i, t in enumerate(('メニュー正面（なかま画面）', '戦闘背面', '勝利正面')): d.text((x, 6), t, fill=(255, 240, 180), font=ft(13)); x += cw[i]
    y = 30
    for (lab, cells, mp, bp), h in zip(rows, rh):
        d.text((8, y), lab, fill=(255, 255, 255), font=ft(12)); d.text((8, y + 17), '部品：メニュー ' + mp + '／背面 ' + bp, fill=(170, 200, 230), font=ft(9)); x = 8
        for i, c in enumerate(cells): S.paste(c, (x, y + 34)); x += cw[i]
        d.line([(0, y + h - 1), (S.width, y + h - 1)], fill=(90, 96, 100)); y += h
    d.text((8, S.height - 22), ('PC 1280×720' if view == 'pc' else 'スマホ縦 390×664') + '：セリスの衣装の比べ。ゲームの画面写真（ヘッドレス Chromium・deviceScaleFactor 2）を CSS の画素の大きさで切り出したもの。実機の画面ではない', fill=(230, 235, 240), font=ft(11))
    S.save(O + 'shots/cos_ui_%s.png' % view); print('cos_ui_%s.png' % view, S.size)


if __name__ == '__main__': main(sys.argv[1] if len(sys.argv) > 1 else 'pc')
