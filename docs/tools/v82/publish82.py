# v8.2 撮影した画像を、報告用の小さい画像にする：python3 docs/tools/v82/publish82.py <撮影のディレクトリ> <出力 docs/arch82/shots>
# ・PC（1920×1080）：ゲームの画面の枠（254,8)-(1406,756) を切り出し、幅 384 に縮める
# ・スマホ（390×844）：上のゲームの画面（0,0)-(390,508) を切り出し、幅 234 に縮める
# ・名前：<出力>/<元のディレクトリ>/<地図 ID>.jpg（PC と スマホは別のディレクトリ。after_view は撮り方の名前を残す）
import sys, os, re
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
JOBS = [('before_int', 'before_pc_', 'before_int'), ('before', 'before_pc_', 'before'), ('before', 'before_sp_', 'before_sp'), ('after_int', 'after_pc_', 'after_int'), ('after_sp', 'after_sp_', 'after_sp'), ('after_view', None, 'after_view')]
n = 0
for d, pre, odn in JOBS:
    sd = os.path.join(src, d)
    if not os.path.isdir(sd): continue
    for f in sorted(os.listdir(sd)):
        if not f.endswith('.jpg'): continue
        if pre and not f.startswith(pre): continue
        name = f[len(pre):] if pre else f
        im = Image.open(os.path.join(sd, f)).convert('RGB'); w, h = im.size
        if w == 1920 and h == 1080: im = im.crop((254, 8, 1406, 756)); im = im.resize((384, round(384 * im.size[1] / im.size[0])), Image.LANCZOS)
        elif w == 390: im = im.crop((0, 0, 390, 508)); im = im.resize((234, round(234 * 508 / 390)), Image.LANCZOS)
        else: im.thumbnail((384, 384), Image.LANCZOS)
        od = os.path.join(out, odn); os.makedirs(od, exist_ok=True)
        im.save(os.path.join(od, name), quality=62, optimize=True); n += 1
print('画像', n)
