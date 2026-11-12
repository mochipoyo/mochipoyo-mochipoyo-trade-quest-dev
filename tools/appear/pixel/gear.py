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
