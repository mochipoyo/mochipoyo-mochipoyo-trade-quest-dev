# v9.8.1 装備の外見（ドット絵の差分）：描いて作る武器・盾（ガルドの剣と盾、主人公の斧）
#   どれも「握りの位置（grip）」と「柄の上向き（up：単位ベクトル）」で置く。光は左上から。明るさは 5 段の色にそろえて、ドット絵らしく
#   返すのは RGBA の配列（元の絵と同じ大きさ）。色を品の色に変える所は灰色の層（_t）、変えない所はそのままの層（_f）
import numpy as np
import pxlib as P

OUT_METAL = (24, 20, 26)
BLADE = ['#2c2830', '#5b5662', '#8f8b98', '#c6c4ce', '#f2f1f6']     # 刃（明るい鋼）
BRONZE = ['#4a3420', '#6f533a', '#937152', '#c39e79', '#e6c9a0']    # 縁取り（ガルドの重鎧の金具と同じ）
GOLD = ['#5c3810', '#9a6420', '#d49a36', '#f2cc6a', '#fff2bc']
LEATHER = ['#1e130d', '#3a2418', '#5c3a24', '#7d5233', '#9c6c44']
WOOD = ['#2e1b0f', '#4f3019', '#77492a', '#9d6a3e', '#c08d58']


def local(Hh, Ww, grip, up):
    """各ドットの、握りからの柄の向きの距離 u と、右向きの距離 v"""
    yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    ux, uy = up; rx, ry = -uy, ux
    dx, dy = xx - grip[0], yy - grip[1]
    return dx * ux + dy * uy, dx * rx + dy * ry


def ramp_put(layer, mask, v, ramp):
    cols = np.array([P.hexrgb(c) for c in ramp]); i = np.clip(np.round(np.clip(v, 0, 1) * (len(cols) - 1)).astype(int), 0, len(cols) - 1)
    for k in range(len(cols)):
        m = mask & (i == k); layer[m] = (*cols[k], 255)


def outline(layer, mask, col=OUT_METAL):
    ring = P.neighbors4(mask) & ~mask
    layer[ring] = (*col, 255)
    return ring


def sword(Hh, Ww, grip, up, blade_len=100, blade_w=11, tip=18, guard_w=30, guard_at=14, pommel_at=-16, pommel_r=4.5):
    """剣：握り（拳）の上 guard_at に鍔、その上に刃（真ん中に樋・左が明るい）。拳の下 pommel_at に柄頭。握る手は別の層で上に描く"""
    u, v = local(Hh, Ww, grip, up)
    g0 = guard_at
    b0 = g0 + 2.5
    t = u - b0
    half = np.where(t < blade_len - tip, blade_w / 2.0, (blade_w / 2.0) * np.clip((blade_len - t) / tip, 0, 1) ** 0.9)
    blade = (t >= 0) & (t <= blade_len) & (np.abs(v + 0.25) <= half)
    guard = (np.abs(u - g0) <= 2.6) & (np.abs(v) <= guard_w / 2.0 - np.clip(np.abs(u - g0) - 1.0, 0, 9) * 1.5)
    hilt = (u < g0 - 2.0) & (u >= pommel_at + pommel_r - 1) & (np.abs(v) <= 2.6)
    pc = pommel_at
    pommel = (u - pc) ** 2 + v ** 2 <= pommel_r ** 2
    L = P.blank(Hh, Ww)
    # 刃：左（光の側）が明るく、右が暗い。左の縁はいちばん明るい。樋（真ん中の溝）は暗い線
    vb = np.where(v < -0.6, 0.82, np.where(v > 0.6, 0.42, 0.66)) - 0.1 * np.clip(t / blade_len, 0, 1)
    vb = np.where(blade & (v < -half + 1.6), 0.97, vb)
    fuller = blade & (np.abs(v + 0.25) < 0.9) & (t > 3) & (t < blade_len * 0.72)
    vb = np.where(fuller, 0.28, vb)
    ramp_put(L, blade, vb, BLADE)
    ramp_put(L, guard, np.clip(0.7 - 0.25 * (u - g0) / 2.6 - 0.2 * v / (guard_w / 2.0), 0, 1), GOLD)
    ramp_put(L, hilt, np.where(((u * 2).astype(int) % 3) == 0, 0.2, 0.55), LEATHER)
    ramp_put(L, pommel, np.clip(0.75 - 0.3 * (v + (u - pc)) / pommel_r, 0, 1), GOLD)
    m = blade | guard | hilt | pommel
    outline(L, m)
    return L


def axe(Hh, Ww, grip, up, top=96, bottom=26, head=38, reach=17, side=1, shaft_w=2.2, spike_len=9):
    """斧：木の柄（握りの下 bottom・上 top）。上の端に片刃の斧頭（side＝+1 右・-1 左へ刃）、反対側に小さな突起
       斧頭：柄の横の細い首から、外へ扇形に広がる。外の縁（研いだ刃）は明るい帯、面は少し暗い鋼"""
    u, v = local(Hh, Ww, grip, up)
    a = v * side
    shaft = (u >= -bottom) & (u <= top) & (np.abs(v) <= shaft_w)
    hh = head / 2.0; uc = top - hh - 1
    b = (u - uc) / hh
    neck_a = shaft_w + 3.5
    outer = neck_a + reach - 2.5 * b ** 2                                    # 外の縁（少しふくらんだ弧）
    allow = np.where(a <= neck_a, 0.32, np.clip(0.32 + (a - neck_a) / max(1.0, reach * 0.55), 0.32, 1.0))
    blade = (a > shaft_w - 0.1) & (a <= outer) & (np.abs(b) <= allow) & (np.abs(b) <= 1.0)
    spike = (a <= -shaft_w) & (a >= -spike_len) & (np.abs(u - uc) <= (spike_len + a) * 0.45)
    cap = (np.abs(v) <= shaft_w + 0.8) & (u > top - 2.5) & (u <= top + 1)
    L = P.blank(Hh, Ww)
    ramp_put(L, shaft, np.clip(0.55 - 0.35 * v / shaft_w + np.where((np.floor(u).astype(int) % 11) == 0, -0.25, 0), 0, 1), WOOD)
    vb = 0.42 - 0.16 * b                                                     # 面：上が少し明るい（刃の帯より 2 段暗い鋼）
    vb = np.where(a <= neck_a, 0.24, vb)                                      # 首は暗い
    vb = np.where(a >= outer - 2.6, 0.97, vb)                                 # 研いだ刃の帯
    vb = np.where((a >= outer - 3.6) & (a < outer - 2.6), 0.72, vb)
    ramp_put(L, blade, vb, BLADE)
    ramp_put(L, spike, np.clip(0.5 - 0.3 * b, 0, 1), BLADE)
    ramp_put(L, cap, np.full((Hh, Ww), 0.45), BLADE)
    m = shaft | blade | spike | cap
    outline(L, m)
    return L


def heater(Hh, Ww, cx, cy, w, h, squash=1.0, light=-1, rim_ramp=None):
    """盾（ヒーター形）：上は平ら、下へとがる。面＝品の色（灰色の層）、縁・中央の鋲＝鉄（そのまま）
       squash＜1：横に縮めて、斜めから見た形（背面）"""
    yy, xx = np.mgrid[0:Hh, 0:Ww].astype(float)
    hw = w / 2.0 * squash; y0 = cy - h / 2.0; ym = y0 + h * 0.48; yb = cy + h / 2.0
    top = y0 + 2.0 * ((xx - cx) / hw) ** 2
    t = np.clip((yy - ym) / (yb - ym), 0, 1)
    half = np.where(yy < ym, hw, hw * (1 - t ** 1.55))
    m = (yy >= top) & (yy <= yb) & (np.abs(xx - cx) <= half)
    inner = m.copy()
    for _ in range(3): inner = inner & ~P.neighbors4(~inner)          # 縁の内側 3 ドット＝鉄の縁
    rim = m & ~inner
    nx = (xx - cx) / hw; ny = (yy - cy) / (h / 2.0)
    vf = 0.6 + 0.3 * light * nx - 0.16 * ny
    vf = np.where(np.abs(xx - cx) < 0.8, vf + 0.12, vf)              # 縦の稜線（真ん中が少し明るい）
    g = P.blank(Hh, Ww)
    q = np.round(np.clip(vf, 0, 1) * 4) / 4.0
    face = inner.copy()
    boss = (xx - cx) ** 2 / (7.5 * squash) ** 2 + (yy - (cy - h * 0.06)) ** 2 / 7.5 ** 2 <= 1.0
    face &= ~boss
    g[face, 0] = g[face, 1] = g[face, 2] = np.round(q[face] * 255).astype(np.int32); g[face, 3] = 255
    f = P.blank(Hh, Ww)
    vr = np.clip(0.62 + 0.3 * light * nx - 0.25 * ny, 0, 1)
    ramp_put(f, rim, vr, rim_ramp or BLADE)
    bx = (xx - cx) / (7.5 * squash); by = (yy - (cy - h * 0.06)) / 7.5
    vbx = np.clip(0.55 - 0.45 * (bx + by) / 1.4, 0, 1); vbx = np.where(bx ** 2 + by ** 2 < 0.12, 0.98, vbx)
    ramp_put(f, boss, vbx, BLADE)
    # 縁の鋲
    for k in range(-2, 3):
        px = int(round(cx + k * hw * 0.42)); py = int(round(y0 + 3 + 2.0 * ((px - cx) / hw) ** 2))
        if 0 <= py < Hh and 0 <= px < Ww and rim[py, px]: f[py, px] = (*P.hexrgb(BLADE[4]), 255)
    outline(f, m)
    return g, f, m


def spear(Hh, Ww, grip, up, top=150, bottom=100, head=34, half=6.5, shaft_w=2.2):
    """v9.8.2 槍：木の柄（握りの下 bottom・上 top）。上の端に木の葉形の穂先（真ん中に稜線）と金の口金、下の端に青銅の石突き
       カイル・カズトの正面・背面（握りの位置と柄の向きで置く。主人公の槍は build_hero.py の別の描き方のまま）"""
    u, v = local(Hh, Ww, grip, up)
    hb = top - head                                                          # 穂先の付け根
    s = (top - u) / head                                                     # 0＝先・1＝付け根
    w = half * np.where(s < 0.62, np.sqrt(np.clip(s / 0.62, 0, 1)), np.clip((1 - s) / 0.38, 0, 1) ** 0.8)
    blade = (s >= 0) & (s <= 1) & (np.abs(v + 0.25) <= np.maximum(w, 0.6))
    collar = (u >= hb - 5) & (u < hb + 0.5) & (np.abs(v) <= shaft_w + 1.4)
    shaft = (u >= -bottom + 3) & (u < hb - 5) & (np.abs(v) <= shaft_w)
    butt = (u >= -bottom) & (u < -bottom + 3) & (np.abs(v) <= shaft_w + 0.6)
    L = P.blank(Hh, Ww)
    ramp_put(L, shaft, np.clip(0.55 - 0.35 * v / shaft_w + np.where((np.floor(u).astype(int) % 13) == 0, -0.25, 0), 0, 1), WOOD)
    vb = np.where(v < -0.6, 0.84, np.where(v > 0.6, 0.4, 0.66)) - 0.12 * np.clip(1 - s, 0, 1)
    vb = np.where(np.abs(v + 0.25) < 0.6, 0.98, vb)                          # 稜線
    ramp_put(L, blade, vb, BLADE)
    ramp_put(L, collar, np.clip(0.7 - 0.35 * v / (shaft_w + 1.4) - 0.1 * ((u - hb + 5) // 2 % 2), 0, 1), GOLD)
    ramp_put(L, butt, np.clip(0.6 - 0.3 * v / (shaft_w + 0.6), 0, 1), BRONZE)
    m = blade | collar | shaft | butt
    outline(L, m)
    return L


def bow(Hh, Ww, grip, up, length=120, depth=15, side=1, limb_w=2.0):
    """v9.8.4 弓：握り（弓の真ん中）を拳の位置に置く。弓の腹は side の側（+1＝右・-1＝左）へふくらみ、弦は反対側（体の側）にまっすぐ張る
       木の弓・握りは革巻き・両端は金の弭（はず）。弦は 1 ドットの明るい線（輪郭なし）"""
    u, v = local(Hh, Ww, grip, up)
    half = length / 2.0; a = v * side
    t = np.clip(u / half, -1, 1)
    curve = -depth * t ** 2 + 2.5 * np.clip(np.abs(t) - 0.82, 0, 1) / 0.18          # 握りで 0、端へ向かって体の側へ反る。端は少しだけ外へ返す（リカーブ）
    w = limb_w * (1.0 - 0.45 * np.abs(t))                                            # 端へ向かって細く
    limb = (np.abs(u) <= half) & (np.abs(a - curve) <= np.maximum(w, 0.9))
    wrap = limb & (np.abs(u) <= 6)
    tips = limb & (np.abs(u) >= half - 5)
    string = (np.abs(u) <= half - 2) & (np.abs(a - (-depth + 1.5)) <= 0.5) & ~limb
    L = P.blank(Hh, Ww)
    vl = np.clip(0.62 - 0.3 * (a - curve) / max(0.9, limb_w) * side * -1 - 0.12 * np.abs(t), 0, 1)
    ramp_put(L, limb, vl, ['#4a2c14', '#7a4a22', '#a86c34', '#d09850', '#f0c880'])   # 明るい木（小さな戦闘の絵でも、暗い髪・服の前で見える）
    ramp_put(L, wrap, np.where((np.floor(u).astype(int) % 3) == 0, 0.25, 0.6), LEATHER)
    ramp_put(L, tips, np.clip(0.7 - 0.2 * np.sign(u), 0, 1), GOLD)
    outline(L, limb)
    L[string] = (236, 232, 220, 255)
    return L
