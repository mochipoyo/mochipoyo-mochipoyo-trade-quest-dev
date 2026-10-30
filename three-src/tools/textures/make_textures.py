# -*- coding: utf-8 -*-
"""
3D版のテクスチャを手続き生成（タイル状にくり返せる＝周期的）。外部素材は使わない
  python3 tools/textures/make_textures.py
出力：public/textures/<名前>_albedo.jpg / <名前>_normal.jpg（法線は OpenGL 形式）
"""
import os, numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'textures'))
os.makedirs(OUT, exist_ok=True)
RNG = np.random.default_rng(20261030)

def fbm(n, beta=2.0, seed=None, lo=1.0):
    """周期的なノイズ（FFT でパワースペクトル 1/f^beta）。0..1"""
    rng = np.random.default_rng(seed) if seed is not None else RNG
    w = rng.standard_normal((n, n))
    F = np.fft.fft2(w); fx = np.fft.fftfreq(n)[:, None]; fy = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1
    F = F / (f ** (beta / 2)); F[f < lo / n] = 0
    r = np.real(np.fft.ifft2(F)); r -= r.min(); r /= max(1e-9, r.max())
    return r

def voronoi(n, cells, seed, jitter=0.85, aspect=(1.0, 1.0)):
    """周期的なボロノイ：最近点までの距離 d1、2番目 d2、セルID"""
    rng = np.random.default_rng(seed)
    gx, gy = cells
    pts = []
    for j in range(gy):
        for i in range(gx):
            ox = (i + 0.5 + (rng.random() - 0.5) * jitter + (0.5 if (j % 2 and aspect[0] != 1.0) else 0)) / gx
            oy = (j + 0.5 + (rng.random() - 0.5) * jitter * 0.6) / gy
            pts.append((ox % 1, oy % 1))
    pts = np.array(pts)
    ys, xs = np.mgrid[0:n, 0:n] / n
    d1 = np.full((n, n), 9.0); d2 = np.full((n, n), 9.0); idx = np.zeros((n, n), int)
    for k, (px, py) in enumerate(pts):
        dx = np.abs(xs - px); dx = np.minimum(dx, 1 - dx); dy = np.abs(ys - py); dy = np.minimum(dy, 1 - dy)
        d = np.sqrt((dx * aspect[0]) ** 2 + (dy * aspect[1]) ** 2)
        m = d < d1
        d2 = np.where(m, d1, np.minimum(d2, d)); idx = np.where(m, k, idx); d1 = np.where(m, d, d1)
    return d1, d2, idx

def normal_from_height(h, strength):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    nx, ny, nz = -gx, gy, np.ones_like(h)   # OpenGL（+Y 上）
    l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    return np.stack([(nx / l) * 0.5 + 0.5, (ny / l) * 0.5 + 0.5, (nz / l) * 0.5 + 0.5], -1)

def save(name, albedo, normal=None, size=None, q=90):
    a = Image.fromarray((np.clip(albedo, 0, 1) * 255).astype(np.uint8))
    if size: a = a.resize((size, size), Image.LANCZOS)
    a.save(os.path.join(OUT, name + '_albedo.jpg'), quality=q)
    if normal is not None:
        n = Image.fromarray((np.clip(normal, 0, 1) * 255).astype(np.uint8))
        if size: n = n.resize((size, size), Image.LANCZOS)
        n.save(os.path.join(OUT, name + '_normal.jpg'), quality=q)
    print('wrote', name)

def col(hexs):
    h = hexs.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])

def mix(a, b, t):
    t = t[..., None]; return a * (1 - t) + b * t

N = 512
# ---------------- 草地（地面）
def grass():
    n = 1024
    big = fbm(n, 2.6, 1); mid = fbm(n, 1.8, 2); fine = fbm(n, 0.6, 3)
    base = mix(col('#4f7a2c'), col('#7aa83e'), np.clip(big * 1.3 - 0.15, 0, 1))
    base = mix(base, col('#3e6a26'), np.clip((mid - 0.55) * 3, 0, 1) * 0.6)
    base = mix(base, col('#93b84e'), np.clip((fine - 0.7) * 4, 0, 1) * 0.5)
    dirt = np.clip((fbm(n, 2.2, 4) - 0.72) * 4, 0, 1) * 0.55
    base = mix(base, col('#7a6440'), dirt)
    base *= (0.85 + 0.25 * fine)[..., None]
    h = fine * 0.6 + mid * 0.4
    save('grass', base, normal_from_height(h, 2.0))

# ---------------- 土の道・地面
def dirt():
    big = fbm(N, 2.4, 11); fine = fbm(N, 0.8, 12)
    base = mix(col('#6e5434'), col('#9a7a4e'), big)
    d1, d2, idx = voronoi(N, (22, 22), 13, 1.0)
    peb = np.clip(1 - d1 * 40, 0, 1) * (np.random.default_rng(14).random(idx.max() + 1)[idx] > 0.6)
    base = mix(base, col('#a49884'), peb * 0.8)
    base *= (0.85 + 0.25 * fine)[..., None]
    h = big * 0.3 + fine * 0.3 + peb * 0.6
    save('dirt', base, normal_from_height(h, 3.0))

# ---------------- 石畳（不揃いの丸い石＋目地）
def cobble():
    d1, d2, idx = voronoi(N, (9, 9), 21, 0.9)
    edge = d2 - d1
    stone = np.clip(edge * 22, 0, 1)                 # 目地からの距離
    dome = np.sqrt(np.clip(stone, 0, 1))
    tone = np.random.default_rng(22).random(idx.max() + 1)[idx]
    fine = fbm(N, 0.9, 23)
    c1 = mix(col('#8e8a80'), col('#b8b0a0'), tone)
    c1 = mix(c1, col('#a08a6a'), (np.random.default_rng(24).random(idx.max() + 1)[idx] > 0.75).astype(float) * 0.5)
    c1 *= (0.8 + 0.3 * fine)[..., None]
    mortar = col('#4a4236') * (0.8 + 0.3 * fine)[..., None]
    alb = mix(mortar, c1, np.clip(stone * 3, 0, 1))
    alb *= (0.65 + 0.35 * dome)[..., None]           # 目地の陰
    h = dome * 0.8 + fine * 0.15
    save('cobble', alb, normal_from_height(h, 6.0))
    Image.fromarray((np.clip(h, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, 'cobble_height.jpg'), quality=90)

# ---------------- しっくい壁
def plaster():
    big = fbm(N, 2.6, 31); fine = fbm(N, 0.7, 32); stain = fbm(N, 3.0, 33)
    alb = mix(col('#e4d8c0'), col('#f2ead8'), fine)
    alb = mix(alb, col('#b8a88a'), np.clip((stain - 0.62) * 2.5, 0, 1) * 0.5)
    alb *= (0.9 + 0.12 * big)[..., None]
    h = fine * 0.5 + big * 0.3
    save('plaster', alb, normal_from_height(h, 2.5))

# ---------------- 木材（梁・柱）
def timber():
    ys, xs = np.mgrid[0:N, 0:N] / N
    warp = fbm(N, 2.0, 41) * 0.15
    grain = 0.5 + 0.5 * np.sin((xs * 3 + warp) * 2 * np.pi * 8 + fbm(N, 1.5, 42) * 6)
    fine = fbm(N, 0.5, 43)
    alb = mix(col('#3e2814'), col('#6a4626'), grain * 0.7 + fine * 0.3)
    h = grain * 0.5 + fine * 0.4
    save('timber', alb, normal_from_height(h, 2.0))

# ---------------- 床板（屋内・ポーチ・扉）
def planks():
    ys, xs = np.mgrid[0:N, 0:N] / N
    rows = 6; r = np.floor(ys * rows); off = (r * 0.37) % 1
    u = (xs + off) % 1; seam_y = np.abs((ys * rows) % 1 - 0.5) > 0.47; seam_x = (u * 2 % 1) < 0.012
    tone = np.random.default_rng(52).random(64)[(r * 7 + np.floor(u * 2)).astype(int) % 64]
    grain = 0.5 + 0.5 * np.sin((ys * rows * 6 + fbm(N, 2.0, 51) * 3) * 2 * np.pi)
    fine = fbm(N, 0.6, 53)
    alb = mix(col('#7a5230'), col('#b07a46'), np.clip(tone * 0.7 + grain * 0.2 + fine * 0.2, 0, 1))
    alb = np.where((seam_y | seam_x)[..., None], alb * 0.45, alb)
    h = np.where(seam_y | seam_x, 0.0, 0.6 + grain * 0.2 + fine * 0.2)
    save('planks', alb, normal_from_height(h, 2.5))

# ---------------- 屋根瓦（段ごとにずらした板瓦。色は実行時に乗算）
def shingles():
    ys, xs = np.mgrid[0:N, 0:N] / N
    rows = 8; cols = 8
    r = np.floor(ys * rows); fy = (ys * rows) % 1
    u = (xs * cols + (r % 2) * 0.5) % cols; ci = np.floor(u); fx = u % 1
    rnd = np.random.default_rng(61).random(256)
    tone = rnd[((r * 13 + ci * 7).astype(int)) % 256]
    # 下端が丸い板（上が奥・下が手前）
    roundness = np.sqrt(np.clip(1 - ((fx - 0.5) * 2) ** 2, 0, 1))
    tab = fy < (0.55 + 0.4 * roundness)
    lift = fy * 0.8                                      # 下へ行くほど手前（高い）
    edge = np.minimum(fx, 1 - fx) < 0.04
    fine = fbm(N, 0.7, 62)
    base = 0.62 + 0.32 * tone + 0.12 * fine
    alb = np.stack([base, base * 0.96, base * 0.92], -1)
    alb = np.where((~tab | edge)[..., None], alb * 0.42, alb)
    alb *= (0.7 + 0.35 * fy)[..., None]
    h = np.where(tab & ~edge, lift + fine * 0.1, 0.0)
    save('shingles', alb, normal_from_height(h, 5.0))

# ---------------- 石積み（土台・煙突・井戸）
def stonewall():
    d1, d2, idx = voronoi(N, (6, 10), 71, 0.6, aspect=(1.0, 1.6))
    edge = np.clip((d2 - d1) * 18, 0, 1)
    tone = np.random.default_rng(72).random(idx.max() + 1)[idx]; fine = fbm(N, 0.8, 73)
    alb = mix(col('#7a7468'), col('#a8a090'), tone * 0.8 + fine * 0.2)
    alb = mix(col('#3a342a') * np.ones_like(alb), alb, np.clip(edge * 3, 0, 1))
    h = np.sqrt(edge) * 0.8 + fine * 0.2
    save('stonewall', alb, normal_from_height(h, 5.0))

# ---------------- じゅうたん（屋内）
def carpet():
    ys, xs = np.mgrid[0:N, 0:N] / N
    fine = fbm(N, 0.4, 81)
    border = (np.minimum(np.minimum(xs, 1 - xs), np.minimum(ys, 1 - ys)) < 0.08)
    pattern = (np.sin(xs * 2 * np.pi * 4) * np.sin(ys * 2 * np.pi * 4) > 0.6)
    alb = np.where(border[..., None], col('#d8a83a'), col('#9a2a2a'))
    alb = np.where((pattern & ~border)[..., None], col('#b8443a'), alb)
    alb *= (0.85 + 0.2 * fine)[..., None]
    save('carpet', alb, normal_from_height(fine * 0.5, 1.5))

if __name__ == '__main__':
    for f in (grass, dirt, cobble, plaster, timber, planks, shingles, stonewall, carpet): f()
