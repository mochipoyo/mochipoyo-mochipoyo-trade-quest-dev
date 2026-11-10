#!/usr/bin/env python3
# v9.3 読み込みを速くする：画像の一覧（js/data/asset-manifest.js などの ASSET_MANIFEST）の大きい PNG・JPG に、同じ名前の .webp を作る
#   使い方：python3 tools/make-webp.py <一覧の JSON>   （一覧は docs/tools/rpg93/dump-manifest.js で書き出す）
#   ・元の PNG は消さない（WebP が読めないときは js/core/assets.js が PNG に戻す）
#   ・歩行のドット絵（overworld）は対象外（ぼかしで点がにじむため）。20KB 未満・WebP にしても 20% 以上小さくならないものも対象外
#   ・画質：quality 90・透明の部分は劣化させない（alpha_quality 100）。出力：js/data/asset-webp.js（WebP がある画像の一覧）
import json, os, sys, io
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
items = json.load(open(sys.argv[1], encoding='utf-8'))
done = {}; before = after = 0
for it in items:
    if it['kind'] == 'overworld': continue
    p = it['path']; f = os.path.join(ROOT, p)
    if not os.path.isfile(f) or not p.lower().endswith(('.png', '.jpg', '.jpeg')): continue
    sz = os.path.getsize(f)
    if sz < 20 * 1024: continue
    im = Image.open(f); im.load()
    if im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA' if 'A' in im.mode or 'transparency' in im.info else 'RGB')
    b = io.BytesIO(); im.save(b, 'WEBP', quality=90, method=6, alpha_quality=100); data = b.getvalue()
    if len(data) > sz * 0.8: continue
    out = os.path.splitext(f)[0] + '.webp'
    if not os.path.exists(out) or open(out, 'rb').read() != data: open(out, 'wb').write(data)
    done[p] = 1; before += sz; after += len(data)
js = '/* 自動生成（tools/make-webp.py）。手で書き換えない。WebP のある画像（元の PNG・JPG のパス → 1） */\nwindow.ASSET_WEBP = ' + json.dumps(done, ensure_ascii=False, sort_keys=True) + ';\n'
open(os.path.join(ROOT, 'js/data/asset-webp.js'), 'w', encoding='utf-8').write(js)
print('WebP %d 枚：%d KB → %d KB' % (len(done), before // 1024, after // 1024))
