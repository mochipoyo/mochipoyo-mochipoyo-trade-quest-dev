# 10人のトレーダー師匠の立ち絵（仮の画像）を作る：108×212 の透過 PNG（既存の NPC の立ち絵とほぼ同じ大きさ・足元中央基準）
# 6倍の大きさで図形を描いてから縮小する（輪郭がなめらかになる）。色・髪型・服・持ち物は js/data/ultimates.js の look と人物像に合わせる
# 使い方: python3 gen_master_portraits.py <出力ディレクトリ>
import sys, math, os
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
W, H, S = 108, 212, 6
OL = (26, 20, 38, 255)   # 輪郭
OW = 2.2                  # 輪郭の太さ（最終の px）

def hexc(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
def shade(c, f):
    return tuple(max(0, min(255, int(round(v * f)))) for v in c[:3]) + (c[3],)

class P:
    def __init__(s):
        s.im = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); s.d = ImageDraw.Draw(s.im); s.base = None
    # 半透明の色は別の層に描いて重ねる（PIL の draw は下の色と混ぜないため、そのまま描くと穴があく）
    def begin_soft(s):
        s.base = s.im; s.im = Image.new('RGBA', s.base.size, (0, 0, 0, 0)); s.d = ImageDraw.Draw(s.im)
    def end_soft(s):
        s.base.alpha_composite(s.im); s.im = s.base; s.base = None; s.d = ImageDraw.Draw(s.im)
    def sc(s, pts): return [(x * S, y * S) for x, y in pts]
    def ell(s, cx, cy, rx, ry, col, ol=True):
        box = [(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S]
        if ol: s.d.ellipse([box[0] - OW * S / 2, box[1] - OW * S / 2, box[2] + OW * S / 2, box[3] + OW * S / 2], fill=OL)
        s.d.ellipse(box, fill=col)
    def poly(s, pts, col, ol=True):
        if ol: s.d.line(s.sc(pts + [pts[0]]), fill=OL, width=int(OW * S), joint='curve')
        s.d.polygon(s.sc(pts), fill=col)
        if ol:
            for x, y in pts: r = OW * S / 2; s.d.ellipse([x * S - r, y * S - r, x * S + r, y * S + r], fill=OL)
            s.d.polygon(s.sc(pts), fill=col)
    def rect(s, x, y, w, h, col, ol=True): s.poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], col, ol)
    def line(s, pts, col, w): s.d.line(s.sc(pts), fill=col, width=int(w * S), joint='curve')
    def dot(s, x, y, r, col): s.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=col)
    def done(s, path):
        im = s.im.resize((W, H), Image.LANCZOS); im.save(path)

SKIN_D = 0.82
def figure(p, L):
    skin = hexc(L['skin']); hair = hexc(L['H']); body = hexc(L['B']); acc = hexc(L['A']); leg = hexc(L['L']); shoe = hexc(L.get('T', '#2a1a0a'))
    cx = 50; hy = 50; hr = 23   # 持ち物が右手側にあるので、体は少し左に寄せる
    style = L['style']; outfit = L['outfit']
    # --- 後ろの物（背中の盾・後ろ髪・フード・マント） ---
    if L.get('cape'): p.poly([(30, 84), (78, 84), (86, 192), (22, 192)], hexc(L['cape']))
    if L.get('backshield'): p.poly([(62, 92), (94, 92), (94, 132), (78, 150), (62, 132)], hexc(L['backshield'])); p.poly([(70, 100), (86, 100), (86, 128), (78, 138), (70, 128)], acc)
    if 'long' in style: p.poly([(cx - 28, hy - 6), (cx + 28, hy - 6), (cx + 30, hy + 64), (cx - 30, hy + 64)], shade(hair, 0.85))
    if 'hood' in style: p.ell(cx, hy + 2, 31, 33, body)
    if 'twin' in style:
        p.ell(cx - 30, hy + 30, 9, 28, hair); p.ell(cx + 30, hy + 30, 9, 28, hair)
    if 'braid' in style:
        for k in range(5): p.ell(cx + 22 + (k % 2), hy + 22 + k * 11, 6, 7, hair)
    # --- 脚・足 ---
    if outfit in ('robe', 'dress', 'longcoat'):
        hem = 196
        p.poly([(cx - 24, 120), (cx + 24, 120), (cx + 30, hem), (cx - 30, hem)], body if outfit != 'longcoat' else hexc(L['coat']))
        if outfit == 'robe': p.poly([(cx - 5, 122), (cx + 5, 122), (cx + 6, hem - 1), (cx - 6, hem - 1)], acc, ol=False)
        if outfit == 'dress': p.poly([(cx - 30, hem - 8), (cx + 30, hem - 8), (cx + 30, hem), (cx - 30, hem)], acc)
        if outfit == 'longcoat': p.rect(cx - 12, 150, 9, 44, leg); p.rect(cx + 3, 150, 9, 44, leg)
        p.ell(cx - 11, 200, 9, 5, shoe); p.ell(cx + 11, 200, 9, 5, shoe)
    else:
        p.rect(cx - 15, 142, 13, 50, leg); p.rect(cx + 2, 142, 13, 50, leg)
        if outfit == 'armor': p.rect(cx - 16, 160, 15, 12, hexc(L['plate'])); p.rect(cx + 1, 160, 15, 12, hexc(L['plate']))
        p.ell(cx - 9, 197, 10, 6, shoe); p.ell(cx + 9, 197, 10, 6, shoe)
    # --- 胴・腕 ---
    if outfit == 'fur':
        p.poly([(cx - 24, 84), (cx + 24, 84), (cx + 22, 146), (cx - 22, 146)], body)
        p.ell(cx - 26, 104, 7, 18, skin); p.ell(cx + 26, 104, 7, 18, skin)   # 腕まくり
        p.poly([(cx - 26, 82), (cx + 26, 82), (cx + 18, 98), (cx - 18, 98)], hexc(L['fur']))
        p.rect(cx - 22, 134, 44, 7, shoe); p.rect(cx - 4, 133, 8, 9, acc)
    elif outfit == 'armor':
        p.poly([(cx - 24, 84), (cx + 24, 84), (cx + 22, 146), (cx - 22, 146)], body)
        p.ell(cx - 26, 90, 11, 9, hexc(L['plate'])); p.ell(cx + 26, 90, 11, 9, hexc(L['plate']))
        p.poly([(cx - 14, 96), (cx + 14, 96), (cx + 10, 130), (cx - 10, 130)], hexc(L['plate']))
        p.poly([(cx - 4, 100), (cx + 4, 100), (cx + 3, 124), (cx - 3, 124)], acc, ol=False)
        p.ell(cx - 28, 114, 6, 16, body); p.ell(cx + 28, 114, 6, 16, body)
    elif outfit == 'longcoat':
        p.poly([(cx - 24, 84), (cx + 24, 84), (cx + 24, 150), (cx - 24, 150)], hexc(L['coat']))
        p.poly([(cx - 10, 84), (cx + 10, 84), (cx + 7, 130), (cx - 7, 130)], body)
        p.ell(cx - 28, 112, 7, 20, hexc(L['coat'])); p.ell(cx + 28, 112, 7, 20, hexc(L['coat']))
        p.rect(cx - 10, 116, 20, 4, acc, ol=False)
    else:
        top = body
        p.poly([(cx - 24, 84), (cx + 24, 84), (cx + 24, 128), (cx - 24, 128)], top)
        if outfit in ('robe',): p.poly([(cx - 5, 84), (cx + 5, 84), (cx + 5, 128), (cx - 5, 128)], acc, ol=False)
        if outfit == 'tunic': p.rect(cx - 24, 126, 48, 18, top); p.rect(cx - 24, 124, 48, 6, hexc(L.get('belt', '#3a2a1a'))); p.rect(cx - 4, 123, 8, 8, acc)
        if outfit == 'dress': p.poly([(cx - 24, 84), (cx + 24, 84), (cx + 14, 96), (cx - 14, 96)], acc)
        sleeve = shade(top, 0.9)
        p.ell(cx - 28, 110, 7, 20, sleeve); p.ell(cx + 28, 110, 7, 20, sleeve)
    # 手
    lh = L.get('lhand', (cx - 29, 132)); rh = L.get('rhand', (cx + 29, 132))
    p.ell(lh[0], lh[1], 5.5, 5.5, skin); p.ell(rh[0], rh[1], 5.5, 5.5, skin)
    if L.get('scarf'): p.poly([(cx - 20, 80), (cx + 20, 80), (cx + 18, 90), (cx - 18, 90)], acc); p.poly([(cx + 8, 86), (cx + 18, 86), (cx + 20, 116), (cx + 10, 116)], acc)
    # --- 首・頭 ---
    p.rect(cx - 6, hy + 18, 12, 14, shade(skin, SKIN_D))
    p.ell(cx, hy, hr, hr + 1, skin)
    # 髪（前）
    if 'hood' not in style:
        p.poly([(cx - hr - 1, hy + 2), (cx - hr + 2, hy - 14), (cx - 10, hy - hr - 2), (cx + 10, hy - hr - 2), (cx + hr - 2, hy - 14), (cx + hr + 1, hy + 2), (cx + 14, hy - 8), (cx + 4, hy - 4), (cx - 6, hy - 9), (cx - 16, hy - 4)], hair)
        if 'spiky' in style:
            for k in range(6):
                x0 = cx - 24 + k * 9; p.poly([(x0, hy - 14), (x0 + 5 + (k % 2) * 2, hy - 38 + (k % 2) * 6), (x0 + 10, hy - 14)], hair)
        if 'bun' in style: p.ell(cx, hy - hr - 6, 10, 9, hair)
        if 'long' in style or 'twin' in style: p.rect(cx - hr - 2, hy - 4, 7, 26, hair); p.rect(cx + hr - 5, hy - 4, 7, 26, hair)
    else:
        p.poly([(cx - hr - 4, hy + 6), (cx - hr, hy - 18), (cx, hy - hr - 8), (cx + hr, hy - 18), (cx + hr + 4, hy + 6), (cx + 14, hy - 10), (cx - 14, hy - 10)], body)
        p.line([(cx - 16, hy - 9), (cx + 16, hy - 9)], acc, 2)
        p.rect(cx - 10, hy - 12, 20, 4, hexc(L['H']), ol=False)
    # 顔
    ey = hy + 4
    if L.get('eyes') == 'calm':
        p.line([(cx - 13, ey), (cx - 6, ey + 1.5)], OL, 2); p.line([(cx + 6, ey + 1.5), (cx + 13, ey)], OL, 2)
    else:
        ec = hexc(L.get('eye', '#2a2a40'))
        for sx in (-9.5, 9.5):
            p.ell(cx + sx, ey, 3.6, 4.6, ec, ol=False); p.dot(cx + sx - 1.2, ey - 1.8, 1.3, (255, 255, 255, 255))
        brow = shade(hair, 0.7); p.line([(cx - 14, ey - 8), (cx - 6, ey - 9)], brow, 1.6); p.line([(cx + 6, ey - 9), (cx + 14, ey - 8)], brow, 1.6)
    p.begin_soft(); p.dot(cx - 15, ey + 7, 3, (240, 150, 150, 110)); p.dot(cx + 15, ey + 7, 3, (240, 150, 150, 110)); p.end_soft()
    if L.get('beard'):
        bc = hexc(L['beard']); p.poly([(cx - 17, hy + 8), (cx + 17, hy + 8), (cx + 13, hy + 30), (cx, hy + 40 if L.get('longbeard') else hy + 32), (cx - 13, hy + 30)], bc)
        p.line([(cx - 8, hy + 10), (cx - 1, hy + 12), (cx + 1, hy + 12), (cx + 8, hy + 10)], shade(bc, 0.75), 2)
    else:
        p.line([(cx - 4, hy + 14), (cx, hy + 15.5), (cx + 4, hy + 14)], (150, 70, 60, 255), 1.6)
    if L.get('glasses'):
        p.begin_soft()
        for sx in (-9.5, 9.5): p.d.ellipse([(cx + sx - 6) * S, (ey - 5.5) * S, (cx + sx + 6) * S, (ey + 5.5) * S], fill=(200, 235, 255, 60), outline=OL, width=int(1.4 * S))
        p.end_soft()
        p.line([(cx - 3.5, ey - 1), (cx + 3.5, ey - 1)], OL, 1.3)
    if L.get('goggles'):
        p.rect(cx - hr, hy - 15, hr * 2, 5, hexc('#3a2a1a')); p.ell(cx - 9, hy - 13, 7, 6, hexc('#3a2a1a')); p.ell(cx + 9, hy - 13, 7, 6, hexc('#3a2a1a')); p.ell(cx - 9, hy - 13, 4.5, 4, hexc('#9fe0ff'), ol=False); p.ell(cx + 9, hy - 13, 4.5, 4, hexc('#9fe0ff'), ol=False)
    if L.get('circlet'): p.line([(cx - 18, hy - 12), (cx, hy - 16), (cx + 18, hy - 12)], acc, 2.4); p.dot(cx, hy - 16, 2.6, hexc('#5ab0ff'))
    # --- 持ち物 ---
    it = L.get('item'); x, y = rh
    if it == 'staff':
        p.line([(x + 2, y - 70), (x + 2, y + 62)], OL, 5); p.line([(x + 2, y - 70), (x + 2, y + 62)], hexc('#8a5a2a'), 3)
        top = L.get('stafftop', 'leaf')
        if top == 'leaf': p.ell(x + 2, y - 74, 6, 9, hexc('#6ac46a')); p.line([(x + 2, y - 82), (x + 2, y - 68)], hexc('#2a6a2a'), 1)
        elif top == 'star':
            pts = [(x + 2 + math.cos(-math.pi / 2 + k * math.pi / 5) * (10 if k % 2 == 0 else 4.5), y - 76 + math.sin(-math.pi / 2 + k * math.pi / 5) * (10 if k % 2 == 0 else 4.5)) for k in range(10)]; p.poly(pts, acc)
        elif top == 'bolt': p.poly([(x + 5, y - 92), (x - 5, y - 74), (x + 2, y - 74), (x - 3, y - 60), (x + 10, y - 80), (x + 3, y - 80)], acc)
    elif it == 'pickaxe':   # 肩にかついだつるはし（右手。頭が画面の外に出ないよう内側へ）
        p.line([(x + 2, y + 10), (x - 6, y - 64)], OL, 5); p.line([(x + 2, y + 10), (x - 6, y - 64)], hexc('#8a5a2a'), 3)
        p.poly([(x - 30, y - 58), (x - 6, y - 70), (x + 16, y - 60), (x - 6, y - 64)], hexc('#b8bcc8'))
    elif it == 'scales':
        p.line([(x, y - 2), (x, y - 34)], acc, 2.4); p.line([(x - 14, y - 30), (x + 14, y - 30)], acc, 2.4)
        p.line([(x - 14, y - 30), (x - 14, y - 20)], acc, 1); p.line([(x + 14, y - 30), (x + 14, y - 20)], acc, 1)
        p.ell(x - 14, y - 19, 7, 3, acc); p.ell(x + 14, y - 19, 7, 3, acc); p.dot(x, y - 36, 2.6, hexc('#fff6c8'))
    elif it == 'papers':
        p.poly([(x - 6, y - 22), (x + 16, y - 26), (x + 20, y + 4), (x - 2, y + 8)], hexc('#f4f4ff'))
        for k in range(4): p.line([(x - 1 + k * 0.3, y - 16 + k * 6), (x + 14 + k * 0.3, y - 19 + k * 6)], hexc('#ff7fd0') if k == 1 else hexc('#7a8aa8'), 1)
    elif it == 'hourglass':
        hx, hyy = x + 4, y - 26
        p.rect(hx - 10, hyy - 18, 20, 3, acc); p.rect(hx - 10, hyy + 15, 20, 3, acc)
        p.begin_soft(); p.poly([(hx - 8, hyy - 15), (hx + 8, hyy - 15), (hx + 1.5, hyy), (hx + 8, hyy + 15), (hx - 8, hyy + 15), (hx - 1.5, hyy)], (210, 235, 255, 200)); p.end_soft()
        p.poly([(hx - 5, hyy + 14), (hx + 5, hyy + 14), (hx, hyy + 7)], hexc('#ffd24a'), ol=False); p.poly([(hx - 5, hyy - 12), (hx + 5, hyy - 12), (hx, hyy - 4)], hexc('#ffd24a'), ol=False)
    elif it == 'book':
        p.poly([(x - 16, y - 12), (x, y - 8), (x + 16, y - 12), (x + 16, y + 8), (x, y + 12), (x - 16, y + 8)], hexc('#f4f0e0'))
        p.line([(x, y - 8), (x, y + 12)], OL, 1)
        p.line([(x - 13, y), (x - 10, y - 4), (x - 7, y + 2), (x - 4, y - 3)], acc, 1.4); p.line([(x + 3, y - 2), (x + 6, y + 3), (x + 9, y - 3), (x + 12, y + 1)], acc, 1.4)
    elif it == 'net':
        p.begin_soft(); p.poly([(x - 10, y - 4), (x + 14, y - 10), (x + 18, y + 26), (x - 6, y + 30)], (200, 220, 230, 90)); p.end_soft()
        for k in range(5): p.line([(x - 10 + k * 6, y - 4 - k * 1.5), (x - 6 + k * 6, y + 30 - k * 1.2)], hexc('#d8e8f0'), 0.8); p.line([(x - 10 + k, y - 4 + k * 7), (x + 14 + k, y - 10 + k * 7)], hexc('#d8e8f0'), 0.8)
        p.poly([(x + 6, y + 16), (x + 18, y + 12), (x + 22, y + 18), (x + 10, y + 22)], hexc('#ffb0a0'))   # 貝
    elif it == 'shield':
        pass

M = {
  'galen': dict(H='#d8d8d0', B='#3a7a4a', A='#ffd24a', L='#2a4a3a', T='#4a2e1a', skin='#e8b890', style=['long'], outfit='robe', beard='#e8e8e0', scarf=True, eyes='calm', item='staff', stafftop='leaf'),
  'seiran': dict(H='#2a3a6a', B='#2a6a8a', A='#9fe0ff', L='#1a2a4a', T='#3a2a1a', skin='#f0c8a0', style=['bun'], outfit='tunic', belt='#1a3a5a', item='net'),
  'bard': dict(H='#6a3a1a', B='#7a4a2a', A='#ffb04a', L='#3a2a1a', T='#2a1a0a', skin='#c89070', style=['short'], outfit='fur', fur='#d8c0a0', beard='#5a2a0a', item='pickaxe'),
  'mirea': dict(H='#c9a0ff', B='#5a3a8a', A='#fff6c8', L='#3a2a5a', T='#2a1a3a', skin='#f3d0b0', style=['long'], outfit='dress', item='scales', circlet=True, eye='#5a3a8a'),
  'lione': dict(H='#ff7fd0', B='#4a2a5a', A='#ff7fd0', L='#2a1a3a', T='#1a1a2a', skin='#f6d6c0', style=['twin'], outfit='longcoat', coat='#eef0f8', goggles=True, item='papers', eye='#7a2a6a'),
  'chrono': dict(H='#e8e8f0', B='#1a2a5a', A='#5ab0ff', L='#0a1a3a', T='#1a1a2a', skin='#e0c8b0', style=['hood'], outfit='robe', item='hourglass', eye='#5ab0ff', cape='#14204a'),
  'volte': dict(H='#ffe24a', B='#3a3a1a', A='#ffe24a', L='#1a1a1a', T='#2a2a1a', skin='#e8c0a0', style=['spiky'], outfit='tunic', belt='#1a1a1a', item='staff', stafftop='bolt', eye='#c08a00'),
  'raizen': dict(H='#3a4a5a', B='#4a6a8a', A='#7fd0ff', L='#2a3a4a', T='#1a2a3a', skin='#d8b090', style=['short'], outfit='armor', plate='#9aa8bc', backshield='#4a6a8a', cape='#2a4a6a', item=None),
  'arzen': dict(H='#2a5a2a', B='#3a5a2a', A='#b8f07f', L='#1a3a1a', T='#1a2a1a', skin='#e0c0a0', style=['braid'], outfit='robe', item='book', glasses=True),
  'ordis': dict(H='#fff6c8', B='#e8e0c0', A='#ffd24a', L='#a89060', T='#4a3a1a', skin='#e8d0b8', style=['long'], outfit='robe', beard='#fffbe8', longbeard=True, eyes='calm', item='staff', stafftop='star', cape='#8a7a50'),
}
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for mid, L in M.items():
        p = P(); figure(p, L); p.done(os.path.join(OUT, 'tm_' + mid + '.png'))
    print('ok', len(M))
