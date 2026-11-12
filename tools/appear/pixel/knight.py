# v9.8.2 装備の外見（ドット絵の差分）：カイル・カズト（板金の鎧・剣・盾の騎士の絵）に共通の作り方
#   元の絵は読むだけ。剣・盾を外して後ろを補った絵（素の絵のもと）を作り、主人公と同じ手順（build_hero.armor_zone・travelize）で
#   「装備なし＝布の鎧下と革の手袋・靴」「重鎧＝元の板金」「軽装＝同じ形で品の色」に分ける
#   盾は元の絵から切り離し、面だけ品の色にする層（灰色の品は元の盾のまま）。剣は元の絵から切り離す（どの剣も同じ形・同じ色）
#   槍・斧は gear.py で握りの位置と柄の向きから描く
import numpy as np
import cv2

import pxlib as P
import build_hero as H

OUTLINE = (24, 18, 22)


def poly(shape, pts):
    return P.poly_mask(shape[0], shape[1], pts)


def band(shape, p0, p1, hw, taper=None, tip_w=1.5):
    """2 点を結ぶ太さ 2×hw の帯（斜めの刃）。taper＝(0〜1)：その割合より先は刃先へ細くなる（p1 が刃先）"""
    Hh, Ww = shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    (x0, y0), (x1, y1) = p0, p1; dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy
    t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / L2, 0, 1)
    w = hw if taper is None else np.where(t < taper, hw, hw + (tip_w - hw) * (t - taper) / max(1e-6, 1 - taper))
    return np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy)) <= w


def box(shape, x0, y0, x1, y1):
    m = np.zeros(shape[:2], bool); m[max(0, y0):y1, max(0, x0):x1] = True; return m


def dil(m, k=1):
    d = m.copy()
    for _ in range(k): d = d | P.neighbors4(d)
    return d


def close(m, k):
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, ker).astype(bool) | m


def with_outline(o, m, k=2, lum=70):
    """切り離す範囲 m に、そのまわり k ドットの暗い輪郭のドットを足す（刃・盾の縁の黒い線も一緒に外す）"""
    ring = dil(m, k) & ~m & P.opaque(o) & (P.lum(o) < lum)
    return m | ring


def reflect_fill(a, m, src, p0, p1, hw):
    """斜めの刃の帯 m を、帯の外側すぐの絵を帯の縁で折り返して埋める（刃の下の脚・マントの模様が続いて見える）
       hw＝帯の半分の幅（輪郭込み）。近い側の縁で折り返し、使えなければ反対側の縁で折り返す"""
    Hh, Ww = a.shape[:2]; (x0, y0), (x1, y1) = p0, p1
    d = np.array([x1 - x0, y1 - y0], float); d /= np.linalg.norm(d); n = np.array([-d[1], d[0]])
    filled = np.zeros((Hh, Ww), bool); ys, xs = np.where(m)
    def ok(sx, sy):
        return 0 <= sx < Ww and 0 <= sy < Hh and src[sy, sx, 3] > 40 and not m[sy, sx]
    for y, x in zip(ys, xs):
        off = (x - x0) * n[0] + (y - y0) * n[1]
        s0 = 1 if off >= 0 else -1
        cand = []
        for sgn in (s0, -s0):
            disp = 2 * (sgn * (hw + 0.5) - off)
            cand.append((int(round(x + n[0] * disp)), int(round(y + n[1] * disp))))
        # 帯の両側とも体（不透明）の所だけ埋める。片側が体の外（刃が体からはみ出した所）は透明のまま
        if all(ok(*c) for c in cand):
            sx, sy = cand[0]; a[y, x] = src[sy, sx]; filled[y, x] = True
    return filled


def vfill_up(a, m, src, reach=40):
    """m の各ドットを、すぐ下に続く絵（剣の下のマントの裾など）を境い目で上へ折り返して埋める"""
    Hh, Ww = a.shape[:2]; filled = np.zeros((Hh, Ww), bool)
    for x in range(Ww):
        ys = np.where(m[:, x])[0]
        if not len(ys): continue
        for run in np.split(ys, np.where(np.diff(ys) > 1)[0] + 1):
            yb = run[-1] + 1
            while yb < Hh and yb <= run[-1] + 3 and src[yb, x, 3] <= 40: yb += 1
            if yb >= Hh or src[yb, x, 3] <= 40: continue
            for y in run:
                sy = min(Hh - 1, 2 * yb - y - 1)
                while sy > yb and src[sy, x, 3] <= 40: sy -= 1
                if src[sy, x, 3] > 40 and not m[sy, x]: a[y, x] = src[sy, x]; filled[y, x] = True
    return filled


def remove(o, m, mirror=None, keep=None, drop=None, close_k=8, radius=3, reflect=None, up=None):
    """m（剣・盾）を消して後ろを補う
       mirror＝[(範囲の多角形の mask, 中心の x)]：その範囲は、反対側の体（剣・盾を消したあと）を鏡に写して描く
       残った所：まわりの絵がつながる所（シルエットを close_k で閉じた内側）と keep だけ、まわりの色から補う（cv2.inpaint）。drop は必ず透明"""
    a = o.copy(); Hh, Ww = a.shape[:2]
    a[m] = 0
    filled = np.zeros((Hh, Ww), bool)
    src = a.copy()
    for lim, cx in (mirror or []):
        ys, xs = np.where(m & lim & ~filled)
        for y, x in zip(ys, xs):
            sx = int(round(2 * cx - x))
            if 0 <= sx < Ww and src[y, sx, 3] > 40 and not m[y, sx]:
                a[y, x] = src[y, sx]; filled[y, x] = True
    for lim, p0, p1, hw in (reflect or []):
        rm_ = m & lim & ~filled
        f2 = reflect_fill(a, rm_, src, p0, p1, hw)
        if f2.any():                                  # 折り返しの継ぎ目（帯の真ん中の線）をならす
            med = cv2.medianBlur(np.ascontiguousarray(a[..., :3].astype(np.uint8)), 3); a[f2, :3] = med[f2]
        # 帯の外が透明（体の外）の所は透明のまま。両側とも体の所だけ折り返す
        filled |= f2
    if up is not None:
        filled |= vfill_up(a, m & up & ~filled, src)
    rem = m & ~filled
    sil = P.opaque(a)
    target = rem & close(sil, close_k)
    if keep is not None: target |= rem & keep
    if drop is not None: target &= ~drop
    if target.any():
        img = np.ascontiguousarray(a[..., :3].astype(np.uint8))
        unknown = ((target | ~sil) * 255).astype(np.uint8)
        inp = cv2.inpaint(img, unknown, radius, cv2.INPAINT_TELEA)
        a[target, :3] = inp[target]; a[target, 3] = 255
    P.outline_edges(a, P.opaque(o), OUTLINE)
    ring = P.opaque(a) & P.neighbors4(~P.opaque(a)) & (filled | target)   # 補った所の外の縁にも輪郭
    a[ring, 0], a[ring, 1], a[ring, 2] = OUTLINE; a[ring, 3] = 255
    P.drop_specks(a, 30); P.fill_holes(a, 30)
    # 体から離れて残った切れ端（盾の外に見えていたマントの端・刃先の欠片）は消す：いちばん大きな塊の 15% より小さい塊
    lab, nlab = P.components(P.opaque(a))
    if nlab > 1:
        cnt = np.bincount(lab.ravel(), minlength=nlab + 1); cnt[0] = 0
        near = np.unique(lab[dil(m, 3) & (lab > 0)])                      # 消した所に接していた塊だけ
        bad = [k for k in near if cnt[k] < 0.15 * cnt.max()]
        if bad: a[np.isin(lab, bad)] = 0
    return a, filled, target


def clothify(a, zone, legs_y, glove, cloth, boots, sigma=3.0):
    """装備なし：板金 → 布（綿入れの鎧下）、籠手 → 革の手袋、脛当て → 革の靴
       板金の強い光（つや）は布にないので、明るさを範囲の中でぼかして（sigma）、5 段の色に。継ぎ目の暗い線は縫い目として残す"""
    t = a.copy(); Hh, Ww = a.shape[:2]; yy = np.mgrid[0:Hh, 0:Ww][0]
    z = zone & P.opaque(a)
    L = P.lum(a).astype(np.float32)
    num = cv2.GaussianBlur(np.where(z & (L > 52), L, 0).astype(np.float32), (0, 0), sigma); den = cv2.GaussianBlur((z & (L > 52)).astype(np.float32), (0, 0), sigma)
    Ls = np.where(den > 1e-3, num / np.maximum(den, 1e-3), L)
    vals = Ls[z]
    lo, hi = (np.percentile(vals, 4), np.percentile(vals, 96)) if len(vals) else (0, 255)
    v = 0.4 + 0.48 * np.clip((Ls - lo) / max(1.0, hi - lo), 0, 1)
    gold = H.is_gold(a) & z
    v = np.where(gold, v - 0.14, v)                         # 金の縁取り → 布の縫い目（1 段暗く）
    v = np.where(L <= 52, 0.28, v)                           # 継ぎ目 → しわ（輪郭ほど濃くしない）
    v = H.texturize(v, 0.12, 2, 3)
    cl = z & (yy < legs_y) & ~glove; bt = z & ((yy >= legs_y) | glove)
    H.ramp_fill(t, cl, np.clip(v, 0, 1), cloth); H.ramp_fill(t, bt, np.clip(v * 0.92, 0, 1), boots)
    edge = z & P.opaque(t) & P.neighbors4(~P.opaque(t))
    t[edge, 0], t[edge, 1], t[edge, 2] = OUTLINE
    return t


def to_gray(a, m, lo=0.0, hi=1.0, gamma=1.0):
    g, _ = P.to_gray(a, m, out_lo=lo, out_hi=hi, gamma=gamma)
    return g


def parts(o, wl, cfg, cloth=None, boots=None):
    """剣・盾を外した絵 wl から部品をそろえる（座標は元の絵と同じ）
       cfg：body_y（これより下が鎧）・keep（鎧に数えない：髪・顔・前垂れ）・belt・legs_y（これより下は靴）・glove（革の手袋にする拳）・hand（武器を握る拳）
            shield（盾の範囲）・shield_face（盾の面：品の色にする所）・sword（剣の範囲）"""
    Hh, Ww = o.shape[:2]; yy, xx = np.mgrid[0:Hh, 0:Ww]
    region = (yy >= cfg['body_y']) & ~cfg['keep']
    zone, plate, trim = H.armor_zone(wl, region, cfg['belt'])
    zone |= H.is_gold(wl) & region & P.opaque(wl) & ~cfg['belt'] & dil(zone, 3)     # 板金の金の縁取りは全部（太い縁も）
    old = (H.TRAVEL, H.BOOTS)
    if cloth: H.TRAVEL = cloth
    if boots: H.BOOTS = boots
    try:
        plain = clothify(wl, zone, cfg['legs_y'], cfg['glove'], H.TRAVEL, H.BOOTS, cfg.get('sigma', 3.0))
    finally:
        H.TRAVEL, H.BOOTS = old
    out = {'base_plain': plain, 'armor_shape_f': H.take(wl, zone)}
    out['armor_heavy_t'] = to_gray(wl, plate)
    out['armor_light_t'] = to_gray(wl, plate, 0.16, 0.8, 1.1)
    sm = cfg['shield'] & P.opaque(o)
    face = sm & cfg['shield_face']
    out['shield_f'] = H.take(o, sm)                     # 元の盾（灰色の品はこのまま）
    out['shield_t'] = to_gray(o, face, 0.08, 0.95)      # 面（色のある品は品の色）
    out['shield_e'] = H.take(o, sm & ~face)             # 縁・紋章・鋲（面を塗ったあとに重ねる）
    if cfg.get('sword') is not None: out['weapon_sword'] = H.take(o, cfg['sword'] & P.opaque(o))
    out['hand'] = H.take(plain, cfg['hand'] & P.opaque(plain))
    return out, zone, plate


SHIELD_MAT = {'z': 30, 'layers': [{'part': 'shield_f'}, {'part': 'shield_t', 'tint': 'main', 'onlyColor': True}, {'part': 'shield_e'}]}


def check_sheet(path, rows, k=2, bg=(70, 80, 100)):
    """確かめの並べ絵（行＝[(見出し, 絵)]）"""
    from PIL import Image, ImageDraw
    ims = [[(t, a) for t, a in r] for r in rows]
    cw = max(a.shape[1] for r in ims for _, a in r) * k + 8; ch = max(a.shape[0] for r in ims for _, a in r) * k + 22
    cols = max(len(r) for r in ims)
    sheet = Image.new('RGB', (cw * cols, ch * len(ims)), bg); d = ImageDraw.Draw(sheet)
    for j, r in enumerate(ims):
        for i, (t, a) in enumerate(r):
            im = Image.fromarray(a.astype(np.uint8), 'RGBA').resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST)
            sheet.paste(im, (i * cw + 4, j * ch + 18), im); d.text((i * cw + 4, j * ch + 2), t, fill=(255, 255, 255))
    sheet.save(path)


def export(actor_id, out_dir, srcs, front_off, pf, pb, meta):
    """部品を書き出し、<人物ID>/actor.json を書く（メニュー正面 menu・勝利の正面 front＝menu をずらしたもの・戦闘の背面 back）
       srcs＝(メニューの絵, 戦闘の正面の絵, 戦闘の背面の絵)、front_off＝戦闘の正面の絵の中のメニューの絵の位置
       meta＝{'menu': {'grip': (x, y), 'offhand': (x, y), 'pivot': [x, y]}, 'back': {...}, 'order': {...}}"""
    import os
    import json
    FDX, FDY = front_off
    recF = H.save_parts(os.path.join(out_dir, 'menu'), pf, {})
    recB = H.save_parts(os.path.join(out_dir, 'back'), pb, {})
    FH, FW = pf['base_plain'].shape[:2]; BH, BW = pb['base_plain'].shape[:2]

    def bx(arr):
        bb = P.bbox(P.opaque(arr)); return {'x0': bb[0], 'y0': bb[1], 'x1': bb[2], 'y1': bb[3]}

    def shiftbox(b, dx, dy): return {'x0': b['x0'] + dx, 'y0': b['y0'] + dy, 'x1': b['x1'] + dx, 'y1': b['y1'] + dy}

    def shiftparts(rec, dx, dy): return {k: dict(v, x=v['x'] + dx, y=v['y'] + dy) for k, v in rec.items()}

    def frame(rec, w, h, m=2):
        x0 = min([0] + [r['x'] for r in rec.values()]) - m; x1 = max([w] + [r['x'] + r['w'] for r in rec.values()]) + m
        y0 = min([0] + [r['y'] for r in rec.values()]) - m; half = max(w / 2 - x0, x1 - w / 2)
        return {'x0': int(np.floor(w / 2 - half)), 'y0': int(y0), 'x1': int(np.ceil(w / 2 + half)), 'y1': int(h)}

    o = meta['order']; mg, mo = meta['menu']['grip'], meta['menu']['offhand']; bg, bo = meta['back']['grip'], meta['back']['offhand']
    actor = {
        'menuBase': 'menu',
        # 盾：元の盾（灰色の品はこのまま）→ 面を品の色（色のある品だけ）→ 縁・紋章。鎧・剣・槍・斧は全員の重ね方（主人公と同じ部品の名前）
        'materials': {'shield': SHIELD_MAT},
        'views': {
            'menu': {'src': srcs[0], 'w': FW, 'h': FH, 'dir': 'front', 'pivot': meta['menu']['pivot'], 'body': bx(pf['base_plain']), 'frame': frame(recF, FW, FH),
                     'grip': {'x': mg[0], 'y': mg[1], 'order': o['grip']}, 'offhand': {'x': mo[0], 'y': mo[1], 'order': o['offhand']}, 'parts': recF},
            'front': {'src': srcs[1], 'w': 320, 'h': 320, 'dir': 'front', 'pivot': [160, 304], 'body': shiftbox(bx(pf['base_plain']), FDX, FDY),
                      'grip': {'x': mg[0] + FDX, 'y': mg[1] + FDY, 'order': o['grip']}, 'offhand': {'x': mo[0] + FDX, 'y': mo[1] + FDY, 'order': o['offhand']},
                      'from': 'menu', 'parts': shiftparts(recF, FDX, FDY)},
            'back': {'src': srcs[2], 'w': BW, 'h': BH, 'dir': 'back', 'pivot': [160, 304], 'body': bx(pb['base_plain']), 'frame': frame(recB, BW, BH),
                     'grip': {'x': bg[0], 'y': bg[1], 'order': o['grip_back']}, 'offhand': {'x': bo[0], 'y': bo[1], 'order': o['offhand_back']}, 'parts': recB},
        }}
    json.dump(actor, open(os.path.join(out_dir, 'actor.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    return actor, recF, recB
