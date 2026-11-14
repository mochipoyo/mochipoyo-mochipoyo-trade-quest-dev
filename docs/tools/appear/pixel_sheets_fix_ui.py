# v9.9.1 修正前後の比べ（ゲームの画面写真から。メニュー正面・戦闘背面・勝利正面を、画面に出る大きさ＝CSS の画素で切り出す）
#   python3 docs/tools/appear/pixel_sheets_fix_ui.py <修正前の OUT> <修正後の OUT> [pc|phone]
#   OUT は browser/appear_pixel_party_ui.js の OUT（shots/ と logs/ がある所）。修正前は v9.9（aa564b8）を別の作業場所に取り出し、同じ手順のファイルで撮ったもの
#   画面写真は deviceScaleFactor 2（PC）で撮っているので、縦横 1/2 にして CSS の画素の大きさにする
#   → docs/appear/pixel/shots/fix_ui_<pc|phone>.png
import os, sys, json
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
D = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'shots') + '/'
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
ft = lambda n: ImageFont.truetype(FONT, n) if os.path.exists(FONT) else ImageFont.load_default()
ROWS = [('seris', 's0', 'セリス：杖＋ローブ＋とんがり帽子（魔法使い）'), ('seris', 's2', 'セリス：鉄の鎧＋鋼の剣＋鉄の盾＋鉄の兜（戦士）'),
        ('ord', 'o0', 'オルド：鋼の剣＋鉄の盾＋鉄の兜（誓約騎士）'), ('ord', 'o2', 'オルド：剣をはずす（盾＋兜）'),
        ('ganes', 'g0', 'ガネス：鉄の槍＋鉄の盾＋鉄の兜（職人）'), ('ganes', 'g2', 'ガネス：槍をはずす（盾＋兜）')]


def crops(out, view, pt, key, dpr):
    lg = out + 'logs/ui_party_%s_%s.json' % (pt, view)
    if not os.path.exists(lg): return None
    rec = json.load(open(lg, encoding='utf8'))['rec'].get(key)
    if not rec: return None
    res = []
    mp = out + 'shots/ui_%s_pt_menu_%s_%s.png' % (view, pt, key)
    m = Image.open(mp).convert('RGB') if os.path.exists(mp) else None
    res.append(m.resize((round(m.width / dpr), round(m.height / dpr)), Image.LANCZOS) if m else None)
    bt = rec.get('battle') or {}
    for shot, rk in (('battle', 'rects'), ('victory', 'vrects')):
        sp = out + 'shots/ui_%s_pt_%s_%s.jpg' % (view, shot, key); r = (bt.get(rk) or {}).get(pt)
        if not (os.path.exists(sp) and r): res.append(None); continue
        R = r.get('rect', r); top = R['y'] - R['h'] * 0.42; x0 = R['x'] - R['w'] * 0.45; x1 = R['x'] + R['w'] * 1.45; y1 = R['y'] + R['h'] + 6   # 人物の矩形（CSS の画素）。上は杖・帽子の先まで
        im = Image.open(sp).convert('RGB'); c = im.crop(tuple(int(round(v * dpr)) for v in (x0, top, x1, y1)))
        res.append(c.resize((round(c.width / dpr), round(c.height / dpr)), Image.LANCZOS))
    return res


def main(bout, aout, view='pc'):
    dpr = 2; f = ft(13); rows = []
    for pt, key, lab in ROWS:
        b, a = crops(bout, view, pt, key, dpr), crops(aout, view, pt, key, dpr)
        if b or a: rows.append((lab, b or [None] * 3, a or [None] * 3))
    cw = [max([1] + [(r[i] or Image.new('RGB', (1, 1))).width for _, b, a in rows for r in (b, a)]) + 12 for i in range(3)]
    rh = [max([1] + [(x.height if x else 0) for x in b + a]) + 26 for _, b, a in rows]
    W = 8 + 2 * sum(cw); H = 50 + sum(rh) + 30
    S = Image.new('RGB', (W, H), (40, 44, 48)); d = ImageDraw.Draw(S); x = 8
    for i, t in enumerate(('メニュー正面（なかま画面の立ち絵）', '戦闘背面', '勝利正面')):
        d.text((x, 6), t, fill=(255, 240, 180), font=f); d.text((x, 26), '修正前（v9.9）', fill=(255, 170, 170), font=ft(11)); d.text((x + cw[i], 26), '修正後（v9.9.1）', fill=(170, 230, 170), font=ft(11)); x += 2 * cw[i]
    y = 50
    for (lab, b, a), h in zip(rows, rh):
        d.text((8, y + 2), lab, fill=(255, 255, 255), font=ft(12)); x = 8
        for i in range(3):
            for im in (b[i], a[i]):
                if im: S.paste(im, (x, y + 22))
                else: d.text((x, y + 40), '（画面写真なし）', fill=(200, 200, 200), font=ft(11))
                x += cw[i]
        d.line([(0, y + h - 1), (W, y + h - 1)], fill=(90, 96, 100)); y += h
    d.text((8, H - 24), ('PC 1280×720' if view == 'pc' else 'スマホ縦 390×664') + '：ゲームの画面写真（ヘッドレス Chromium・ソフトウェア描画、deviceScaleFactor 2）を CSS の画素の大きさに縮めて切り出したもの。実機の画面ではない', fill=(230, 235, 240), font=ft(11))
    out = D + 'fix_ui_%s.png' % view; S.save(out); print(os.path.basename(out), S.size)


if __name__ == '__main__':
    main(sys.argv[1].rstrip('/') + '/', sys.argv[2].rstrip('/') + '/', sys.argv[3] if len(sys.argv) > 3 else 'pc')
