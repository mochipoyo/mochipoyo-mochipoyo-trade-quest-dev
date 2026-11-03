#!/usr/bin/env python3
# 画像を並べた一覧（報告用）。使い方: python3 sheet.py 出力.jpg 列数 幅 画像1:見出し1 画像2:見出し2 ...
#   3D の画面の中だけを切り出す（1280×720 の撮影では、ゲーム画面は x 80〜938, y 8〜566）
import sys
from PIL import Image, ImageDraw, ImageFont
out, cols, W = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = [a.split(':', 1) for a in sys.argv[4:]]
font = None
for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc']:
    try: font = ImageFont.truetype(f, 22); break
    except Exception: pass
if font is None: font = ImageFont.load_default()
tiles = []
for path, cap in items:
    im = Image.open(path).convert('RGB')
    if im.size == (1280, 720): im = im.crop((82, 10, 936, 564))
    h = int(im.size[1] * W / im.size[0]); im = im.resize((W, h))
    t = Image.new('RGB', (W, h + 36), (16, 20, 36)); t.paste(im, (0, 36)); ImageDraw.Draw(t).text((8, 5), cap, fill=(240, 220, 150), font=font); tiles.append(t)
rows = (len(tiles) + cols - 1) // cols; th = max(t.size[1] for t in tiles)
sheet = Image.new('RGB', (cols * W + (cols + 1) * 6, rows * th + (rows + 1) * 6), (8, 10, 20))
for i, t in enumerate(tiles): sheet.paste(t, (6 + (i % cols) * (W + 6), 6 + (i // cols) * (th + 6)))
sheet.save(out, quality=84); print(out, sheet.size)
