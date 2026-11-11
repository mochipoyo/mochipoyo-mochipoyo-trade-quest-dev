# 装備で外見が変わるための「素体」を作る（元の絵は変えない。写しから、持っている武器・盾（と、頭の装備をかぶるときだけ帽子）を外し、後ろを補う）
#   python3 tools/appear/prep_bases.py [人物ID …]（指定がなければ tools/appear/specs/*.json をすべて）
# 出力：
#   assets/characters/equip-bases/<人物>/<向き>.png        素体（武器・盾を外したもの）
#   assets/characters/equip-bases/<人物>/<向き>_nohat.png  頭の装備をかぶるときの素体（帽子・頭巾なども外したもの。指定があるときだけ）
#   assets/characters/equip-bases/<人物>/<向き>_mask.png   R＝顔と手（服・兜をかけない）／G＝髪（服をかけない）／B＝握っている手（武器の上に描き直す）
#   js/data/equip-anchors.js                                 向きごとの位置の表（握り・盾・頭・胴・装飾品の場所）
# 仕様（specs/<人物>.json）：座標は元の画像（切り出す前）のドット
#   views.<向き>.remove：外すもの [{"tag":"weapon|shield","poly":[[x,y],…]} | {"line":[[x1,y1],[x2,y2]],"w":太さ}]。"fill":"mirror","axis":x で反対側の写しで補う
#   views.<向き>.hat：頭の装備をかぶるときだけ外すもの（同じ形式）
#   views.<向き>.keep：消さない所（握っている手など）。hand：武器の上に描き直す手。face：顔。hairZone：髪の色を探す範囲。hairAt：髪の色を取る点
#   views.<向き>.a：位置の表（engine の compose がそのまま使う）
import json, sys, os, glob
import numpy as np
import cv2
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = os.path.join(ROOT, 'tools', 'appear', 'specs')
OUT = os.path.join(ROOT, 'assets', 'characters', 'equip-bases')
SPEC_HAIR = {}   # 人物ごとの髪の色（specs の hairColors）

def shape_mask(shapes, W, H):
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)
    for s in shapes or []:
        if 'poly' in s: d.polygon([tuple(p) for p in s['poly']], fill=255)
        elif 'line' in s: d.line([tuple(p) for p in s['line']], fill=255, width=int(s.get('w', 6)))
        elif 'rect' in s: d.rectangle(s['rect'], fill=255)
    return np.asarray(im) > 0

def polys_mask(polys, W, H): return shape_mask([{'poly': p} for p in (polys or [])], W, H)

def palette_of(rgba, k=48):
    px = rgba[rgba[:, :, 3] > 200][:, :3].reshape(-1, 3).astype(np.float32)
    if len(px) > 20000: px = px[np.random.default_rng(0).choice(len(px), 20000, replace=False)]
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1.0)
    _, lab, cent = cv2.kmeans(px, min(k, len(px)), None, crit, 3, cv2.KMEANS_PP_CENTERS)
    return cent

def inpaint_into(out, region):
    """region の中を inpaint：透明度も inpaint し（体の外は透明・体の中は色）、色は近くの不透明な色から"""
    if not region.any(): return out
    m8 = region.astype(np.uint8) * 255
    a = cv2.inpaint(out[:, :, 3], m8, 4, cv2.INPAINT_TELEA)
    rgb = out[:, :, :3].copy(); op = out[:, :, 3] > 128
    bg = (~op | region).astype(np.uint8) * 255
    rgb2 = cv2.inpaint(rgb, bg, 5, cv2.INPAINT_TELEA)
    out[region, :3] = rgb2[region]; out[region, 3] = np.where(a[region] >= 128, 255, 0)
    return out

def fill(img, rem, spec_shapes, px, keep):
    """img：RGBA。rem：外す所。1) 外す所を全部 inpaint（写しの元にするため）→ 2) 反対側の写し（mirror）・ずらした写し（copy）で補う → 3) 写し以外の所を、写したあとの絵からもう一度 inpaint"""
    H, W = rem.shape; out = img.copy(); out[rem, 3] = 0
    special = np.zeros_like(rem); clear = np.zeros_like(rem)
    for s in spec_shapes:
        if s.get('fill') in ('mirror', 'copy', 'other'): special |= grown(shape_mask([s], W, H), s.get('pad', 2)) & rem
        if s.get('clear'): clear |= grown(shape_mask([s], W, H), s.get('pad', 3)) & rem
    special &= ~clear
    src = inpaint_into(out.copy(), rem & ~clear); src[clear, 3] = 0
    done = np.zeros_like(rem)
    for s in spec_shapes:
        f = s.get('fill')
        if f not in ('mirror', 'copy', 'other'): continue
        reg = grown(shape_mask([s], W, H), s.get('pad', 2)) & special & ~done; ys, xs = np.nonzero(reg)
        S = src
        if f == 'other':   # 別の向きの絵（左右を反転した反対の向きなど）から写す。その絵の写しにも外す所があれば、先に同じように補ったもの（otherBase）を使う
            oi = np.array(Image.open(os.path.join(ROOT, s.get('otherBase') or s['src'])).convert('RGBA'))
            S = oi[:, ::-1] if s.get('flip') else oi
        for y, x in zip(ys, xs):
            if f == 'mirror': sx, sy = int(round(2 * float(s['axis']) - x)), y
            else: sx, sy = x + int(s.get('dx', 0)), y + int(s.get('dy', 0))
            if 0 <= sx < W and 0 <= sy < H: out[y, x] = S[sy, sx]; done[y, x] = True
    out[clear, 3] = 0   # 体の外（刃の先・弓など）：透明にするだけ（inpaint で色がにじまないように）
    out = inpaint_into(out, rem & ~done & ~clear)
    return out, rem

def grown(m, pad):
    if pad <= 0: return m
    return cv2.dilate(m.astype(np.uint8), np.ones((2 * pad + 1, 2 * pad + 1), np.uint8)).astype(bool)

def drop_crumbs(out, rem, min_area=320):
    """外した所の近くに残った、本体とつながらない小さな不透明のかけら（刃のふち・道具の先など）を消す（いちばん大きいまとまりは残す）"""
    op = (out[:, :, 3] > 0).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(op, 8)
    if n <= 2: return out
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); near = grown(rem, 12)
    for k in range(1, n):
        if k != big and st[k, cv2.CC_STAT_AREA] < min_area and near[lab == k].any(): out[lab == k, 3] = 0
    return out

def stylize(orig, out, changed, px):
    """補った所を、元の絵の色（48 色）とドットの大きさにそろえ、新しくできた体のふちに輪郭を足す"""
    H, W = changed.shape; pal = palette_of(orig)
    if px > 1:   # ドットの大きさにそろえる（補った所だけ、px×px の平均）
        small = cv2.resize(out, (W // px, H // px), interpolation=cv2.INTER_AREA); big = cv2.resize(small, (W // px * px, H // px * px), interpolation=cv2.INTER_NEAREST)
        sub = changed[:big.shape[0], :big.shape[1]]; o2 = out[:big.shape[0], :big.shape[1]]; o2[sub] = big[sub]
        out[changed, 3] = np.where(out[changed, 3] >= 128, 255, 0)
    ys, xs = np.nonzero(changed & (out[:, :, 3] > 0))
    if len(ys):
        c = out[ys, xs, :3].astype(np.float32); d = ((c[:, None, :] - pal[None]) ** 2).sum(2); out[ys, xs, :3] = pal[d.argmin(1)].astype(np.uint8)
    dark = pal[np.argmin(pal @ np.array([0.299, 0.587, 0.114]))].astype(np.uint8)
    op = out[:, :, 3] > 0; tr = ~op
    edge = np.zeros_like(op); edge[1:, :] |= tr[:-1, :]; edge[:-1, :] |= tr[1:, :]; edge[:, 1:] |= tr[:, :-1]; edge[:, :-1] |= tr[:, 1:]
    ring = changed & op & edge
    if px > 1: ring = cv2.dilate(ring.astype(np.uint8), np.ones((px, px), np.uint8)).astype(bool) & changed & op
    out[ring, :3] = dark
    return out

def lab(rgb):
    x = (np.asarray(rgb, np.float32).reshape(-1, 1, 3) / 255.0).astype(np.float32)
    return cv2.cvtColor(x, cv2.COLOR_RGB2Lab).reshape(-1, 3)

def hair_mask_by_colors(img, zone, colors, de):
    """髪の色（だいたいの色をいくつか）から：範囲の中の色を 14 にまとめ、指定の色に近い（Lab の距離 de 以内）まとまりを髪とする"""
    H, W = img.shape[:2]; sel = zone & (img[:, :, 3] > 100); px = img[sel][:, :3].astype(np.float32)
    if len(px) < 30: return np.zeros((H, W), bool)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1.0); k = min(14, len(px))
    _, labl, cent = cv2.kmeans(px, k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    want = lab([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in colors]); cl = lab(cent)
    ok = np.array([min(np.linalg.norm(cl[i] - w) for w in want) < de for i in range(k)])
    m = np.zeros((H, W), bool); m[sel] = ok[labl.ravel()]
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool) & zone
    return m

def hair_mask(img, zone, pts, tol):
    H, W = img.shape[:2]
    if not pts: return np.zeros((H, W), bool)
    cols = []
    for x, y in pts:
        win = img[max(0, y - 2):y + 3, max(0, x - 2):x + 3]; win = win[win[:, :, 3] > 200][:, :3]
        if len(win): cols.extend(list(win.astype(np.float32)))
    cols = np.array(cols); rgb = img[:, :, :3].astype(np.float32)
    best = np.full((H, W), 1e9, np.float32)
    for c in cols: best = np.minimum(best, ((rgb - c) ** 2).sum(2))
    m = (best < tol * tol) & (img[:, :, 3] > 100) & zone
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool) & zone
    return m

def do_view(aid, vk, v, px):
    src = os.path.join(ROOT, v['src']); orig = np.array(Image.open(src).convert('RGBA')); H, W = orig.shape[:2]
    keep = polys_mask(v.get('keep'), W, H) | polys_mask(v.get('hand'), W, H)
    rem = np.zeros((H, W), bool)
    for sh in v.get('remove') or []: rem |= grown(shape_mask([sh], W, H), sh.get('pad', 3 if sh.get('clear') else 2))
    rem &= ~keep
    out, _ = fill(orig, rem, v.get('remove') or [], px, keep); out = drop_crumbs(stylize(orig, out, rem, px), rem)
    od = os.path.join(OUT, aid); os.makedirs(od, exist_ok=True)
    name = vk.replace(':', '_')
    Image.fromarray(out).save(os.path.join(od, name + '.png'), optimize=True)
    res = {'base': 'assets/characters/equip-bases/%s/%s.png' % (aid, name), 'w': W, 'h': H}
    if v.get('hat'):
        rem2 = rem.copy()
        for sh in v['hat']: rem2 |= grown(shape_mask([sh], W, H), sh.get('pad', 1)) & ~keep
        o2, _ = fill(orig, rem2, (v.get('remove') or []) + v['hat'], px, keep); o2 = drop_crumbs(stylize(orig, o2, rem2, px), rem2)
        Image.fromarray(o2).save(os.path.join(od, name + '_nohat.png'), optimize=True); res['nohat'] = 'assets/characters/equip-bases/%s/%s_nohat.png' % (aid, name)
    face = polys_mask(v.get('face'), W, H) | polys_mask(v.get('hand'), W, H) | polys_mask(v.get('skin'), W, H)
    zone = polys_mask(v.get('hairZone'), W, H) if v.get('hairZone') else np.ones((H, W), bool)
    hc = SPEC_HAIR.get('colors')
    hm = hair_mask_by_colors(out, zone, hc, v.get('hairDE', SPEC_HAIR.get('de', 26))) if hc else hair_mask(out, zone, v.get('hairAt'), v.get('hairTol', 34))
    hair = (hm | polys_mask(v.get('hairExtra'), W, H)) & ~polys_mask(v.get('hairExclude'), W, H)   # 顔の枠の中の前髪も髪（兜は前髪の上にかぶる。服は髪にも顔にもかけない）
    hand = polys_mask(v.get('hand'), W, H) & (out[:, :, 3] > 0)
    mask = np.zeros((H, W, 3), np.uint8); mask[face, 0] = 255; mask[hair, 1] = 255; mask[hand, 2] = 255
    Image.fromarray(mask).save(os.path.join(od, name + '_mask.png'), optimize=True); res['mask'] = 'assets/characters/equip-bases/%s/%s_mask.png' % (aid, name)
    res['dir'] = v.get('dir', vk if vk in ('front', 'back', 'left', 'right') else 'front'); res['a'] = v['a']; res['src'] = v['src']
    # v9.6.1 画像の URL に中身のハッシュの先頭（?v=）を付ける（作り直したとき、古い画像がキャッシュから出ないように。PartyDirections と同じ）
    import hashlib
    for k in ('base', 'mask', 'nohat'):
        if k in res: res[k] = res[k] + '?v=' + hashlib.sha256(open(os.path.join(ROOT, res[k]), 'rb').read()).hexdigest()[:10]
    return res

def main():
    want = set(sys.argv[1:]); table_path = os.path.join(ROOT, 'js', 'data', 'equip-anchors.js'); table = {'actors': {}}
    if os.path.exists(table_path):   # ほかの人物の結果は残す（指定した人物だけ作り直す）
        s = open(table_path, encoding='utf8').read(); i = s.find('= {'); j = s.rfind('};')
        if i > 0 and j > i: table = json.loads(s[i + 2:j + 1])
    for p in sorted(glob.glob(os.path.join(SPEC, '*.json'))):
        sp = json.load(open(p, encoding='utf8')); aid = sp['id']
        if want and aid not in want: continue
        px = sp.get('px', 2); rec = {'px': px, 'views': {}}
        SPEC_HAIR.clear(); SPEC_HAIR.update({'colors': sp.get('hairColors'), 'de': sp.get('hairDE', 26)})
        for vk, v in sp['views'].items():
            if v.get('skip'): continue
            vpx = v.get('px', px)
            if v.get('hairColors'): SPEC_HAIR.update({'colors': v['hairColors'], 'de': v.get('hairDE', 26)})
            else: SPEC_HAIR.update({'colors': sp.get('hairColors'), 'de': sp.get('hairDE', 26)})
            r = do_view(aid, vk, v, vpx)
            if vpx != px: r['a'] = dict(r['a'], px=vpx)
            rec['views'][vk] = r; print(aid, vk, 'ok')
        table['actors'][aid] = rec
    table['version'] = 1
    js = ('/* 装備の外見：人物ごと・向きごとの素体と位置の表（tools/appear/prep_bases.py が tools/appear/specs/*.json から作る。手で書き換えない）\n'
          '   views の向き：front・back・left・right（戦闘の 4 方向の絵。メニューの全身は front）、job:<職業>（主人公のメニューの職業別の立ち絵）\n'
          '   a：grip（握り）・off（盾。hand＝二刀の左手）・head（頭）・torso（胴）・acc（装飾品の場所）。座標は元の画像のドット */\n'
          '(function (root) { root.EQUIP_ANCHORS = ' + json.dumps(table, ensure_ascii=False, separators=(',', ':')) + '; })(typeof window !== \'undefined\' ? window : globalThis);\n')
    open(table_path, 'w', encoding='utf8').write(js); print('anchors', len(table['actors']))

if __name__ == '__main__': main()
