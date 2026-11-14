# v9.10 用意してもらった絵（tools/appear/pixel/art_src/*.png）を、装備の部品として取り込む
#   python3 tools/appear/pixel/art_import.py            → 17 人 × 各向きの部品（art_<絵の名前>）と、品ごとの重ね方（actors.<人>.materials['item:<装備ID>']）
#   作る順の最後（build_* → companion_jobs.py のあと）。何度動かしても同じ結果（前に入れた art_ の部品・重ね方を外してから入れ直す）
#   置き方：その人・その向きの「今の部品」（種類の重ね方の部品）を物差しにする
#     武器：今の部品の長い軸の向き・長さと、握り（grip）に合わせる（両端がそろう。握る所は今の部品と同じ割合の位置）
#     盾　：今の盾の矩形に合わせる（高さを合わせ、幅は絵の縦横比。背面で今の盾が細いときは横に縮める）
#     頭　：今の兜の矩形の幅と上端に合わせる。背面は背面の絵
#   縮め方：元の絵（1024 ドット級）→ 4 倍の大きさで回転・配置 → 1/4 に平均 → 不透明度 50% で切る → 色を 24 色に → 外側に暗い輪郭 1 ドット
import os, sys, json, math, hashlib
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pxlib as P
import manifest as MF
import compose as CP
ROOT = MF.ROOT; SRC = os.path.join(HERE, 'art_src'); EP = MF.PARTS
OUTLINE = (24, 20, 30)
# 絵 → 使う装備。cls＝物差しにする種類。試しの 5 品（形のまとまりは、絵がそろってから広げる）
DESIGNS = {
    'sword_knight': {'slot': 'weapon', 'cls': 'weapon_sword', 'items': ['knight_sword'], 'src': 'sword_knight.png'},
    'staff_sage': {'slot': 'weapon', 'cls': 'weapon_staff', 'items': ['sage_staff'], 'src': 'staff_sage.png', 'upright': True},
    'axe_battle': {'slot': 'weapon', 'cls': 'weapon_axe', 'items': ['battle_axe'], 'src': 'axe_battle.png'},
    'shield_knight': {'slot': 'shield', 'cls': 'shield', 'items': ['knight_shield'], 'src': 'shield_knight.png'},
    'helm_knight': {'slot': 'head', 'cls': 'head_helm', 'items': ['knight_helm'], 'src': 'helm_knight_front.png', 'src_back': 'helm_knight_back.png'},
}
_src = {}


def src(name):
    if name not in _src:
        im = Image.open(os.path.join(SRC, name)).convert('RGBA'); im = im.crop(im.getbbox()); _src[name] = im
    return _src[name]


def place(im, W, H, M6, colors=24):
    """元の絵 im を、枠 W×H に置く。M6＝枠の座標 → 元の絵の座標のアフィン（a,b,c,d,e,f）。4 倍で置いて平均で縮める"""
    k = 4; a, b, c, d, e, f = M6
    pm = np.asarray(im).astype(np.float32); al = pm[..., 3:4] / 255.0; pm = np.concatenate([pm[..., :3] * al, pm[..., 3:4]], -1)   # 色のにじみを防ぐ（不透明度を掛けてから縮める）
    big = Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8), 'RGBA').transform((W * k, H * k), Image.AFFINE, (a / k, b / k, c, d / k, e / k, f), Image.BICUBIC)
    arr = np.asarray(big).astype(np.float32).reshape(H, k, W, k, 4).mean((1, 3)); A = arr[..., 3]
    out = np.zeros((H, W, 4), np.int32); m = A >= 127.5
    rgb = arr[..., :3] / np.maximum(A[..., None], 1) * 255.0; out[m, :3] = np.clip(rgb[m], 0, 255); out[m, 3] = 255
    if m.any():   # 色数をそろえる
        q = Image.fromarray(out.astype(np.uint8)[..., :3], 'RGB').quantize(colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB'); out[m, :3] = np.asarray(q)[m]
    ring = P.neighbors4(m) & ~m; out[ring, 0], out[ring, 1], out[ring, 2] = OUTLINE; out[ring, 3] = 255
    return out


def ref_mask(M, actor, vk, cls):
    """物差し：その人・その向きの、種類 cls の今の部品の重なり（消す層は除く）と、その重ね方"""
    A = M['actors'][actor]; v = A['views'][vk]; m = (A.get('materials') or {}).get(cls) or M['materials'].get(cls)
    if not m or not all(L.get('optional') or L['part'] in v['parts'] for L in m['layers']): return None, None
    mask = np.zeros((v['h'], v['w']), bool)
    for L in m['layers']:
        if L.get('erase') or L['part'] not in v['parts']: continue
        r = v['parts'][L['part']]; im = P.load(os.path.join(ROOT, r['url'].split('?')[0])); h = min(r['h'], v['h'] - r['y']); w = min(r['w'], v['w'] - r['x'])
        mask[r['y']:r['y'] + h, r['x']:r['x'] + w] |= im[:h, :w, 3] > 40
    return (mask if mask.any() else None), m


def weapon(im, mask, grip, W, H, upright=False):
    ys, xs = np.where(mask); pts = np.stack([xs, ys], 1).astype(float); c = pts.mean(0)
    w_, vec = np.linalg.eigh(np.cov((pts - c).T)); u = vec[:, 1]                      # 長い軸
    g = np.array([grip['x'], grip['y']], float) if grip else c
    g = c + u * np.dot(g - c, u)                                                      # 握りを軸の上へ
    pr = (pts - g) @ u
    if (u[1] > 0) if upright else (abs(pr.min()) > abs(pr.max())): u = -u; pr = -pr   # 先（刃先）は握りから遠い端。杖は頭がいつも上
    top, bot = pr.max(), -pr.min(); L = top + bot + 1; s = im.height / L              # 元の絵 / 枠 の倍率
    tip = g + u * top; n = np.array([-u[1], u[0]])                                    # n：絵の右向き（u＝絵の上向きを 90° 回したもの）
    # 枠の点 p → 元の絵の点：x = (p - tip)·n * s + w/2、y = -(p - tip)·u * s
    a, b = n[0] * s, n[1] * s; cc = im.width / 2.0 - (tip @ n) * s; d, e = -u[0] * s, -u[1] * s; f = (tip @ u) * s
    return place(im, W, H, (a, b, cc, d, e, f))


def boxed(im, x0, y0, x1, y1, W, H):
    """矩形 (x0,y0)-(x1,y1) に絵を引き伸ばして置く"""
    sx = im.width / max(1.0, x1 - x0); sy = im.height / max(1.0, y1 - y0)
    return place(im, W, H, (sx, 0, -x0 * sx, 0, sy, -y0 * sy))


def shield(im, mask, W, H):
    x0, y0, x1, y1 = P.bbox(mask); x1 += 1; y1 += 1; h = y1 - y0; asp = im.width / im.height; w = h * asp
    if (x1 - x0) < w * 0.8: w = max(x1 - x0, w * 0.62)                                # 今の盾が細い（背面で斜めに見える）：横に縮める
    cx = (x0 + x1) / 2.0
    return boxed(im, cx - w / 2, y0, cx + w / 2, y1, W, H)


def head(im, mask, W, H, back=False):
    # 背面の絵は後ろ首まであるので、少し小さく
    x0, y0, x1, y1 = P.bbox(mask); x1 += 1; w = (x1 - x0) * (0.92 if back else 1.06); h = w * im.height / im.width; cx = (x0 + x1) / 2.0
    return boxed(im, cx - w / 2, y0 - 2, cx + w / 2, y0 - 2 + h, W, H)


def run():
    M = MF.manifest(); n = 0
    for actor in M['actors']:
        ap = os.path.join(EP, actor, 'actor.json'); A = json.load(open(ap, encoding='utf8'))
        for v in A['views'].values():                                                 # 前に入れた分を外す
            for k in [k for k in v['parts'] if k.startswith('art_')]: del v['parts'][k]
        mats = A.setdefault('materials', {})
        for k in [k for k in mats if k.startswith('item:') and mats[k].get('art')]: del mats[k]
        for name, D in DESIGNS.items():
            part = 'art_' + name; got = {}; done = {}
            for vk, v in A['views'].items():
                mask, m = ref_mask(M, actor, vk, D['cls'])
                if mask is None: continue
                bu = v['parts']['base_plain']['url']
                if bu in done:   # 勝利の正面＝メニュー正面と同じ部品をずらして使う（同じ絵のファイル）
                    v0 = A['views'][done[bu]]; r0 = v0['parts'][part]; b0, b1 = v0['parts']['base_plain'], v['parts']['base_plain']
                    v['parts'][part] = dict(r0, x=r0['x'] + b1['x'] - b0['x'], y=r0['y'] + b1['y'] - b0['y']); got[vk] = m; continue
                im = src(D.get('src_back') if vk == 'back' and D.get('src_back') else D['src'])
                if D['slot'] == 'weapon': arr = weapon(im, mask, v.get('grip'), v['w'], v['h'], upright=D.get('upright', False))
                elif D['slot'] == 'shield': arr = shield(im, mask, v['w'], v['h'])
                else: arr = head(im, mask, v['w'], v['h'], back=(vk == 'back'))
                cimg, x, y = P.crop_layer(arr)
                if cimg is None: continue
                d = os.path.join(ROOT, os.path.dirname(v['parts']['base_plain']['url'])); fn = '%s__%s.png' % (part, vk.replace(':', '_'))
                p = os.path.join(d, fn); P.save(cimg, p); hsh = hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]
                v['parts'][part] = {'url': os.path.relpath(p, ROOT).replace(os.sep, '/') + '?v=' + hsh, 'x': int(x), 'y': int(y), 'w': int(cimg.shape[1]), 'h': int(cimg.shape[0])}
                got[vk] = m; n += 1; done[bu] = vk
            if not got: continue
            m = list(got.values())[0]
            # 重ね方：種類の重ね方の z・素の絵（base）・覆う部位・消す層はそのまま、描く層だけ絵に替える。武器は柄の上に手を描き直す
            item = {'z': m.get('z', 40), 'art': name, 'layers': [L for L in m['layers'] if L.get('erase')] + [{'part': part}]}
            for k in ('base', 'covers'):
                if m.get(k): item[k] = m[k]
            if D['slot'] == 'weapon' or m.get('hand'): item['hand'] = True
            for iid in D['items']: mats['item:' + iid] = item
        json.dump(A, open(ap, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('art_import', len(DESIGNS), 'designs', n, 'parts')
    MF.write()


def costume(actor, name, vk):
    """衣装の全身絵（1024 → 320 の枠。足もとの下端と左右の中心を、その人の素体に合わせる）。試しの確かめ用（ゲームへの組み込みはまだ）"""
    im = Image.open(os.path.join(SRC, 'costume_%s_%s_%s.png' % (actor, name, vk))).convert('RGBA'); k = im.width / 320.0
    arr = place(im, 320, 320, (k, 0, 0, 0, k, 0), colors=96)
    base = P.load(os.path.join(ROOT, 'docs', 'appear', 'pixel', 'art_kit', actor, vk + '_base.png'))
    def feet(a):
        bb = P.bbox(a[..., 3] > 0); rows = a[bb[3] - 12:bb[3] + 1, :, 3] > 0; xs = np.where(rows.any(0))[0]; return (xs.min() + xs.max()) / 2.0, bb[3]
    (cx0, y0), (cx1, y1) = feet(base), feet(arr); dx, dy = int(round(cx0 - cx1)), int(y0 - y1)
    out = np.zeros_like(arr); H, W = arr.shape[:2]
    ys, xs = np.where(arr[..., 3] > 0); ok = (ys + dy >= 0) & (ys + dy < H) & (xs + dx >= 0) & (xs + dx < W); out[ys[ok] + dy, xs[ok] + dx] = arr[ys[ok], xs[ok]]
    return out, (dx, dy)


if __name__ == '__main__':
    run()
