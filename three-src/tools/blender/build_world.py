# -*- coding: utf-8 -*-
"""
もちぽよFXクエスト 3D：汎用3Dワールド用の追加アセット（Blender / bpy）
  python3 tools/blender/build_world.py            # すべて
  python3 tools/blender/build_world.py trees props landmarks vehicles
既存の build_assets.py の部品（形状・マテリアル・書き出し）をそのまま使う。既存のGLBは作り直さない。
出力：three-src/public/models/*.glb、ソース：three-src/blender/*.blend、登録：three-src/assets/registry.json
状態はすべて provisional（仮3D）：形の基本だけを作った段階。完成扱いにしない
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_assets as BA
from build_assets import (reset, mat, vmat, new_obj, set_mat, smooth, bevel, transform, bm_sphere, bm_ico, bm_box, bm_cyl,
                          bm_loft, bm_cone, noise_displace, vcolor, srgb_to_lin, merge_bms, subsurf, apply_all)
from mathutils import Vector, noise
import pipeline

pipeline.install(BA, 'build_world.py')
EXPORT = lambda name, objs, **meta: (pipeline.set_meta(**meta), BA.export_simple(name, objs))

def L(c): return srgb_to_lin(c)

# ------------------------------------------------------------------ 樹木（地域テーマ用）
def trees():
    # ---- ヤシ（島・砂漠）
    for lod in (0, 1):
        reset(); rng = random.Random(11); objs = []
        seg = 7 if lod == 0 else 4
        pts = []; x = 0.0
        for i in range(8):
            z = i * 0.42; x = 0.06 * (i ** 1.35) * 0.35; pts.append(((x, 0, z), 0.13 - i * 0.008, 0.13 - i * 0.008))
        o = new_obj('trunk', bm_loft(pts, seg)); set_mat(o, BA.wood_mat('palm_bark', '#8a6a44')); smooth(o)
        vcolor(o, lambda co, n: (L(0.36 + 0.12 * (math.sin(co.z * 22) > 0.4)), L(0.27 + 0.08 * (math.sin(co.z * 22) > 0.4)), L(0.17)))
        set_mat(o, vmat('palm_bark_v', 0.9)); objs.append(o)
        top = Vector(pts[-1][0]) + Vector((0, 0, 0.05))
        n_fr = 8 if lod == 0 else 5
        for k in range(n_fr):
            a = k / n_fr * 2 * math.pi + rng.uniform(-0.15, 0.15)
            d = Vector((math.cos(a), math.sin(a), 0))
            ring = []
            for j in range(6 if lod == 0 else 3):
                t = j / (5 if lod == 0 else 2)
                c = top + d * (t * 1.25) + Vector((0, 0, 0.25 * math.sin(t * math.pi * 0.9) - t * t * 0.55))
                w = 0.26 * math.sin(math.pi * min(0.95, t * 0.9 + 0.08))
                ring.append((c, max(0.01, w), 0.02))
            fr = new_obj('frond', bm_loft(ring, 4 if lod == 0 else 3)); set_mat(fr, mat('palm_leaf', '#4a8a3a', 0.8)); objs.append(fr)
        if lod == 0:
            for k in range(3):
                a = k * 2.1; c = top + Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, -0.12))
                cn = new_obj('coco', bm_sphere(c, (0.07, 0.07, 0.08), 8, 6)); set_mat(cn, mat('coconut', '#5a3a1a', 0.7)); objs.append(cn)
        EXPORT('tree_palm' + ('_lod1' if lod else ''), objs, kind='tree', status='provisional', note='ヤシ（島・砂漠の地域テーマ）')
    # ---- 枯れ木（暗黒大陸・火山）
    for lod in (0, 1):
        reset(); rng = random.Random(23); objs = []
        seg = 7 if lod == 0 else 4
        def branch(p0, d, length, r, depth):
            pts = []; p = Vector(p0); dd = Vector(d).normalized()
            for i in range(4):
                pts.append((p.copy(), r * (1 - i * 0.2), r * (1 - i * 0.2)))
                dd = (dd + Vector((rng.uniform(-0.35, 0.35), rng.uniform(-0.35, 0.35), rng.uniform(-0.1, 0.25)))).normalized()
                p = p + dd * (length / 3)
            pts.append((p.copy(), r * 0.15, r * 0.15))
            o = new_obj('br', bm_loft(pts, seg)); set_mat(o, mat('deadwood', '#3a2e28', 0.95)); smooth(o); objs.append(o)
            if depth > 0:
                for k in range(2 if lod == 0 else 1):
                    nd = (dd + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0.4))).normalized()
                    mid = Vector(pts[2][0])
                    branch(mid, nd, length * 0.6, r * 0.55, depth - 1)
        branch((0, 0, 0), (0, 0, 1), 2.2, 0.16, 2 if lod == 0 else 1)
        EXPORT('tree_dead' + ('_lod1' if lod else ''), objs, kind='tree', status='provisional', note='枯れ木（暗黒大陸・竜炎火山）')
    # ---- 雪をかぶった針葉樹（忘却の雪原）
    for lod in (0, 1):
        reset(); objs = []; seg = 10 if lod == 0 else 6
        o = new_obj('trunk', bm_cyl((0, 0, 0), (0, 0, 0.7), 0.1, 0.07, 8)); set_mat(o, BA.wood_mat('bark', '#4a3424')); objs.append(o)
        tiers = [(0.45, 0.95, 1.35), (1.05, 0.75, 1.15), (1.6, 0.52, 0.95), (2.1, 0.3, 0.75)]
        for i, (z, r, h) in enumerate(tiers):
            c = new_obj('tier', bm_cone((0, 0, z), (0, 0, z + h), r, seg)); noise_displace(c, 2.5, 0.05, i)
            vcolor(c, lambda co, n: (L(0.92), L(0.95), L(0.98)) if n.z > 0.45 else (L(0.13), L(0.27), L(0.2)))
            set_mat(c, vmat('snowpine_v', 0.85)); smooth(c, False); objs.append(c)
        EXPORT('tree_snowpine' + ('_lod1' if lod else ''), objs, kind='tree', status='provisional', note='雪の針葉樹（忘却の雪原）')
    # ---- サボテン
    reset(); objs = []
    green = mat('cactus', '#4a8a4a', 0.7)
    o = new_obj('body', bm_loft([((0, 0, 0), 0.16, 0.16), ((0, 0, 0.9), 0.17, 0.17), ((0, 0, 1.25), 0.12, 0.12)], 10)); set_mat(o, green); smooth(o); objs.append(o)
    for sx, z0 in ((1, 0.45), (-1, 0.65)):
        a = new_obj('arm', bm_loft([((0, 0, z0), 0.09, 0.09), ((0.28 * sx, 0, z0 + 0.04), 0.09, 0.09), ((0.3 * sx, 0, z0 + 0.38), 0.08, 0.08)], 8)); set_mat(a, green); smooth(a); objs.append(a)
    EXPORT('prop_cactus', objs, kind='tree', status='provisional', note='サボテン（砂漠）')

# ------------------------------------------------------------------ 小物
def props():
    stone = mat('stone', '#8a8478', 0.95); iron = mat('iron', '#3a3a42', 0.55, 0.7)
    flame = mat('flame', '#ffb04a', 0.4, 0.0, '#ff8a2a', 8.0)
    # ---- たいまつ（地面に立てる）
    reset(); objs = []
    o = new_obj('post', bm_cyl((0, 0, 0), (0, 0, 1.25), 0.05, 0.04, 8)); set_mat(o, BA.wood_mat('post', '#5a3a22')); objs.append(o)
    o = new_obj('cup', bm_cyl((0, 0, 1.2), (0, 0, 1.36), 0.06, 0.1, 8)); set_mat(o, iron); objs.append(o)
    o = new_obj('flame', bm_cone((0, 0, 1.3), (0, 0, 1.62), 0.085, 8)); set_mat(o, flame); objs.append(o)
    EXPORT('prop_torch', objs, kind='prop', status='provisional', note='たいまつ（torch タイル・ダンジョンの明かり）')
    # ---- 噴水
    reset(); objs = []
    o = new_obj('basin', bm_loft([((0, 0, 0), 0.92, 0.92), ((0, 0, 0.32), 0.95, 0.95), ((0, 0, 0.36), 0.82, 0.82), ((0, 0, 0.12), 0.8, 0.8)], 24)); set_mat(o, mat('fstone', '#c8c0b0', 0.85)); smooth(o); objs.append(o)
    o = new_obj('water', bm_cyl((0, 0, 0.2), (0, 0, 0.26), 0.8, 0.8, 24)); set_mat(o, mat('fwater', '#4a9ad8', 0.08, 0.0, '#1a4a7a', 0.6)); objs.append(o)
    o = new_obj('pillar', bm_loft([((0, 0, 0.2), 0.14, 0.14), ((0, 0, 0.9), 0.1, 0.1), ((0, 0, 1.0), 0.28, 0.28), ((0, 0, 1.06), 0.3, 0.3), ((0, 0, 1.4), 0.07, 0.07)], 14)); set_mat(o, mat('fstone', '#c8c0b0', 0.85)); smooth(o); objs.append(o)
    EXPORT('prop_fountain', objs, kind='prop', status='provisional', note='噴水（fountain タイル）')
    # ---- 露店
    reset(); objs = []; wood = BA.wood_mat('stallwood', '#8a5a32')
    o = new_obj('counter', bm_box((0, 0, 0.42), (0.96, 0.62, 0.84))); set_mat(o, wood); bevel(o, 0.02, 2); objs.append(o)
    for sx in (-0.45, 0.45):
        for sy in (-0.28, 0.28):
            p = new_obj('pole', bm_cyl((sx, sy, 0), (sx, sy, 1.75), 0.03, 0.03, 6)); set_mat(p, wood); objs.append(p)
    aw = new_obj('awning', bm_box((0, 0, 1.78), (1.08, 0.78, 0.05))); transform(aw, rot=(0.22, 0, 0))
    vcolor(aw, lambda co, n: (L(0.85), L(0.2), L(0.2)) if math.sin(co.x * 18) > 0 else (L(0.95), L(0.92), L(0.85)))
    set_mat(aw, vmat('awning_v', 0.9)); objs.append(aw)
    for k in range(5):
        f = new_obj('fruit', bm_sphere((-0.35 + k * 0.17, -0.12, 0.9), (0.07, 0.07, 0.07), 8, 6)); set_mat(f, mat('fruit' + str(k % 3), ['#e8483a', '#f0b030', '#7ab83a'][k % 3], 0.6)); objs.append(f)
    EXPORT('prop_stall', objs, kind='prop', status='provisional', note='露店（stall タイル）')
    # ---- 石筍（stalactite タイル：床から立つ岩）
    reset(); o = new_obj('spike', bm_cone((0, 0, 0), (0, 0, 1.4), 0.32, 9)); noise_displace(o, 3.0, 0.05, 5)
    vcolor(o, lambda co, n: (L(0.42 + co.z * 0.12),) * 3); set_mat(o, vmat('stal_v', 0.9)); smooth(o, False)
    o2 = new_obj('spike2', bm_cone((0.22, 0.1, 0), (0.24, 0.12, 0.7), 0.17, 7)); vcolor(o2, lambda co, n: (L(0.44),) * 3); set_mat(o2, vmat('stal_v', 0.9))
    EXPORT('prop_stalagmite', [o, o2], kind='prop', status='provisional', note='石筍（stalactite タイル）')
    # ---- 鉱石
    reset(); objs = []
    o = new_obj('rock', bm_ico((0, 0, 0.25), 0.42, 2)); noise_displace(o, 2.0, 0.1, 9)
    for v in o.data.vertices: v.co.z = max(0.0, v.co.z)
    vcolor(o, lambda co, n: (L(0.36),) * 3); set_mat(o, vmat('rock_v', 0.95)); smooth(o, False); objs.append(o)
    cry = mat('ore_crystal', '#7ad0ff', 0.2, 0.1, '#3aa0ff', 2.5)
    for k in range(4):
        a = k * 1.7; c = Vector((math.cos(a) * 0.2, math.sin(a) * 0.2, 0.3)); tip = c + Vector((math.cos(a) * 0.15, math.sin(a) * 0.15, 0.35))
        q = new_obj('cry', bm_cone(c, tip, 0.07, 5)); set_mat(q, cry); objs.append(q)
    EXPORT('prop_ore', objs, kind='prop', status='provisional', note='鉱石（ore タイル）')
    # ---- 倒木
    reset(); o = new_obj('log', bm_cyl((-0.45, 0, 0.2), (0.45, 0, 0.22), 0.2, 0.18, 12)); set_mat(o, BA.wood_mat('logbark', '#5a4028')); smooth(o)
    e1 = new_obj('ring', bm_cyl((0.45, 0, 0.22), (0.46, 0, 0.22), 0.17, 0.17, 12)); set_mat(e1, mat('logend', '#c8a070', 0.85))
    EXPORT('prop_log', [o, e1], kind='prop', status='provisional', note='倒木（log タイル）')
    # ---- 木の根
    reset(); objs = []; rng = random.Random(4)
    for k in range(5):
        a = k / 5 * 2 * math.pi + rng.uniform(-0.3, 0.3); d = Vector((math.cos(a), math.sin(a), 0))
        pts = [(d * 0.05 + Vector((0, 0, 0.5)), 0.1, 0.1), (d * 0.25 + Vector((0, 0, 0.25)), 0.08, 0.08), (d * 0.48 + Vector((0, 0, 0.05)), 0.05, 0.05), (d * 0.6, 0.02, 0.02)]
        r = new_obj('root', bm_loft(pts, 6)); set_mat(r, BA.wood_mat('root', '#4a3424')); smooth(r); objs.append(r)
    EXPORT('prop_root', objs, kind='prop', status='provisional', note='木の根（root タイル）')
    # ---- レバー
    reset(); objs = []
    o = new_obj('base', bm_box((0, 0, 0.12), (0.4, 0.3, 0.24))); set_mat(o, stone); bevel(o, 0.02, 2); objs.append(o)
    o = new_obj('stick', bm_cyl((0, 0, 0.2), (0.15, 0, 0.62), 0.025, 0.025, 6)); set_mat(o, iron); objs.append(o)
    o = new_obj('knob', bm_sphere((0.16, 0, 0.64), (0.05, 0.05, 0.05), 8, 6)); set_mat(o, mat('knob', '#c83a2a', 0.5)); objs.append(o)
    EXPORT('prop_lever', objs, kind='prop', status='provisional', note='レバー（lever タイル）')
    # ---- 鉄格子の門（gate タイル）
    reset(); objs = []
    for k in range(6):
        x = -0.42 + k * 0.168
        b = new_obj('bar', bm_cyl((x, 0, 0), (x, 0, 2.1), 0.025, 0.025, 6)); set_mat(b, iron); objs.append(b)
        t = new_obj('tip', bm_cone((x, 0, 2.1), (x, 0, 2.25), 0.045, 4)); set_mat(t, iron); objs.append(t)
    for z in (0.3, 1.2, 2.0):
        h = new_obj('rail', bm_box((0, 0, z), (0.96, 0.05, 0.06))); set_mat(h, iron); objs.append(h)
    for sx in (-0.52, 0.52):
        p = new_obj('post', bm_box((sx, 0, 1.2), (0.16, 0.3, 2.4))); set_mat(p, stone); bevel(p, 0.02, 2); objs.append(p)
    EXPORT('prop_gate', objs, kind='prop', status='provisional', note='鉄格子の門（gate タイル）')
    # ---- 階段（下り・上り）
    for kind in ('down', 'up'):
        reset(); objs = []
        fr = new_obj('frame', bm_box((0, 0, 0.06), (1.0, 1.0, 0.12))); set_mat(fr, stone); objs.append(fr)
        for k in range(4):
            if kind == 'down':
                s = new_obj('step', bm_box((0, -0.3 + k * 0.2, -0.05 - k * 0.14), (0.8, 0.22, 0.12))); set_mat(s, mat('stepdark', '#3a3430', 0.95))
            else:
                s = new_obj('step', bm_box((0, 0.3 - k * 0.2, 0.08 + k * 0.14), (0.8, 0.22, 0.14))); set_mat(s, stone)
            objs.append(s)
        if kind == 'down':
            h = new_obj('hole', bm_box((0, 0.2, -0.3), (0.82, 0.5, 0.05))); set_mat(h, mat('void', '#0a0806', 1.0)); objs.append(h)
        EXPORT('prop_stairs_' + kind, objs, kind='prop', status='provisional', note='階段（stairs_' + kind + ' タイル）')
    # ---- 学びのルーン（learn_rune タイル）
    reset(); objs = []
    o = new_obj('stone', bm_box((0, 0, 0.55), (0.5, 0.22, 1.1))); set_mat(o, stone); bevel(o, 0.06, 3); noise_displace(o, 3, 0.02, 2); objs.append(o)
    o = new_obj('rune', bm_box((0, -0.115, 0.7), (0.26, 0.01, 0.36))); set_mat(o, mat('rune', '#8ae0ff', 0.3, 0.0, '#4ac8ff', 4.0)); objs.append(o)
    EXPORT('prop_learn_rune', objs, kind='prop', status='provisional', note='学びのルーン（learn_rune タイル）')
    # ---- ボスの印（boss_mark タイル）
    reset(); objs = []
    o = new_obj('disc', bm_cyl((0, 0, 0), (0, 0, 0.06), 0.48, 0.48, 20)); set_mat(o, mat('bossdisc', '#2a1a1e', 0.9)); objs.append(o)
    o = new_obj('glyph', bm_cyl((0, 0, 0.06), (0, 0, 0.075), 0.36, 0.36, 6)); set_mat(o, mat('bossglyph', '#ff3a4a', 0.4, 0.0, '#ff2030', 3.0)); objs.append(o)
    EXPORT('prop_boss_mark', objs, kind='prop', status='provisional', note='ボスの印（boss_mark タイル）')
    # ---- 鍵のかかった扉（door_locked タイル）
    reset(); objs = []
    o = new_obj('door', bm_box((0, 0, 1.0), (0.86, 0.14, 2.0))); set_mat(o, mat('ldoor', '#6a4428', 0.8)); bevel(o, 0.02, 2); objs.append(o)
    for z in (0.4, 1.6):
        b = new_obj('band', bm_box((0, -0.075, z), (0.9, 0.02, 0.08))); set_mat(b, iron); objs.append(b)
    o = new_obj('lock', bm_box((0.25, -0.09, 1.0), (0.12, 0.04, 0.16))); set_mat(o, mat('gold', '#d8b04a', 0.35, 0.85)); objs.append(o)
    EXPORT('prop_door_locked', objs, kind='prop', status='provisional', note='鍵のかかった扉（door_locked タイル）')
    # ---- 魔法陣（warp タイル）
    reset(); o = new_obj('ring', bm_cyl((0, 0, 0), (0, 0, 0.03), 0.48, 0.48, 24)); set_mat(o, mat('warp', '#a080ff', 0.3, 0.0, '#8a5aff', 3.5))
    EXPORT('prop_warp', [o], kind='prop', status='provisional', note='ワープの魔法陣（warp タイル）')
    # ---- 茸（森・洞窟の飾り）
    reset(); objs = []
    for k, (x, y, s) in enumerate(((0, 0, 1.0), (0.18, 0.1, 0.7), (-0.15, 0.12, 0.55))):
        st = new_obj('stem', bm_cyl((x, y, 0), (x, y, 0.22 * s), 0.035 * s, 0.03 * s, 6)); set_mat(st, mat('mstem', '#efe6d0', 0.8)); objs.append(st)
        cp = new_obj('cap', bm_sphere((x, y, 0.22 * s), (0.11 * s, 0.11 * s, 0.07 * s), 10, 6)); set_mat(cp, mat('mcap', '#c83a3a', 0.6)); objs.append(cp)
    EXPORT('prop_mushroom', objs, kind='prop', status='provisional', note='茸（森・洞窟の飾り）')

# ------------------------------------------------------------------ ワールドマップの目印（村・城・洞窟・塔）
def landmarks():
    stone = mat('lstone', '#b8b0a4', 0.9); roof = mat('lroof', '#a8483a', 0.8); wall = mat('lwall', '#f0e6d4', 0.9); wood = BA.wood_mat('lwood', '#6a4a2a')
    # ---- 村（小さな家3軒）
    reset(); objs = []
    for k, (x, y, s, rc) in enumerate(((-0.35, -0.2, 1.0, '#a8483a'), (0.4, -0.1, 0.85, '#3f6a9a'), (0.0, 0.42, 0.75, '#7a5a32'))):
        h = new_obj('house', bm_box((x, y, 0.28 * s), (0.5 * s, 0.42 * s, 0.56 * s))); set_mat(h, wall); objs.append(h)
        r = new_obj('roof', bm_cone((x, y, 0.56 * s), (x, y, 0.95 * s), 0.42 * s, 4)); transform(r, rot=(0, 0, math.pi / 4)); set_mat(r, mat('lroof' + str(k), rc, 0.8)); objs.append(r)
    for k in range(10):
        a = k / 10 * 2 * math.pi; f = new_obj('fence', bm_box((math.cos(a) * 0.85, math.sin(a) * 0.85, 0.08), (0.04, 0.04, 0.16))); set_mat(f, wood); objs.append(f)
    EXPORT('lm_village', objs, kind='landmark', status='provisional', note='ワールドマップの村・町の目印（village タイル）')
    # ---- 城
    reset(); objs = []
    k = new_obj('keep', bm_box((0, 0, 0.55), (0.9, 0.7, 1.1))); set_mat(k, stone); objs.append(k)
    for sx in (-0.55, 0.55):
        for sy in (-0.42, 0.42):
            t = new_obj('tower', bm_cyl((sx, sy, 0), (sx, sy, 1.35), 0.2, 0.18, 12)); set_mat(t, stone); objs.append(t)
            c = new_obj('cone', bm_cone((sx, sy, 1.35), (sx, sy, 1.85), 0.24, 12)); set_mat(c, mat('lroofb', '#3f4f8a', 0.8)); objs.append(c)
    g = new_obj('gate', bm_box((0, -0.36, 0.25), (0.28, 0.04, 0.5))); set_mat(g, wood); objs.append(g)
    fl = new_obj('flag', bm_box((0, 0, 1.55), (0.02, 0.02, 0.9))); set_mat(fl, wood); objs.append(fl)
    fb = new_obj('banner', bm_box((0.12, 0, 1.9), (0.24, 0.01, 0.15))); set_mat(fb, mat('lflag', '#d83a3a', 0.8)); objs.append(fb)
    EXPORT('lm_castle', objs, kind='landmark', status='provisional', note='ワールドマップの城の目印（castle_icon タイル）')
    # ---- 洞窟
    reset(); objs = []
    m = new_obj('mound', bm_ico((0, 0, 0.0), 0.75, 2)); noise_displace(m, 1.6, 0.12, 3)
    for v in m.data.vertices: v.co.z = max(0.0, v.co.z * 0.8)
    vcolor(m, lambda co, n: (L(0.42 + 0.1 * max(0, n.z)),) * 3); set_mat(m, vmat('rock_v', 0.95)); smooth(m, False); objs.append(m)
    h = new_obj('mouth', bm_sphere((0, -0.58, 0.18), (0.26, 0.12, 0.24), 12, 8)); set_mat(h, mat('void', '#0a0806', 1.0)); objs.append(h)
    EXPORT('lm_cave', objs, kind='landmark', status='provisional', note='ワールドマップの洞窟の目印（cave_icon タイル）')
    # ---- 塔
    reset(); objs = []
    t = new_obj('tower', bm_loft([((0, 0, 0), 0.34, 0.34), ((0, 0, 1.9), 0.26, 0.26)], 14)); set_mat(t, stone); objs.append(t)
    r = new_obj('ring', bm_cyl((0, 0, 1.9), (0, 0, 2.02), 0.34, 0.34, 14)); set_mat(r, stone); objs.append(r)
    c = new_obj('cone', bm_cone((0, 0, 2.02), (0, 0, 2.6), 0.32, 14)); set_mat(c, mat('lroofp', '#6a3a8a', 0.8)); objs.append(c)
    for z in (0.7, 1.3):
        w = new_obj('win', bm_box((0, -0.29, z), (0.08, 0.02, 0.16))); set_mat(w, mat('lglow', '#ffd28a', 0.3, 0.0, '#ffb04a', 3.0)); objs.append(w)
    EXPORT('lm_tower', objs, kind='landmark', status='provisional', note='ワールドマップの塔の目印（tower_icon タイル）')

# ------------------------------------------------------------------ 乗り物（帆船・大型船・飛空艇）
def vehicles():
    def hull(objs, L0, W0, H0, col, deck):
        rings = []
        for i in range(9):
            t = i / 8; y = (t - 0.5) * L0
            w = W0 * (math.sin(math.pi * min(1, t * 1.05 + 0.02)) ** 0.6) * (0.55 if t < 0.12 else 1)
            rings.append(((0, y, H0 * 0.5 - (0.15 if t < 0.15 else 0) * H0), max(0.02, w * 0.5), H0 * 0.5))
        o = new_obj('hull', bm_loft(rings, 12)); set_mat(o, mat('hull', col, 0.8)); smooth(o)
        for v in o.data.vertices: v.co.z = max(v.co.z, 0.0) if v.co.z > H0 * 0.5 else v.co.z
        objs.append(o)
        d = new_obj('deck', bm_box((0, 0, H0 * 0.98), (W0 * 0.8, L0 * 0.8, 0.04))); set_mat(d, mat('deck', deck, 0.85)); objs.append(d)
    def mast(objs, y, h, sail_w, sail_h, col):
        m = new_obj('mast', bm_cyl((0, y, 0.3), (0, y, 0.3 + h), 0.04, 0.03, 8)); set_mat(m, BA.wood_mat('mast', '#6a4a2a')); objs.append(m)
        s = new_obj('sail', bm_box((0, y + 0.02, 0.3 + h * 0.55), (sail_w, 0.03, sail_h))); set_mat(s, mat('sail', col, 0.95))
        for v in s.data.vertices: v.co.y -= 0.12 * (1 - (2 * v.co.x / sail_w) ** 2)
        objs.append(s)
    reset(); objs = []; hull(objs, 1.7, 0.7, 0.32, '#8a5a32', '#c8a070'); mast(objs, 0.0, 1.5, 0.9, 0.95, '#f4efe2')
    EXPORT('veh_sailboat', objs, kind='vehicle', status='provisional', note='帆船（sailboat）')
    reset(); objs = []; hull(objs, 2.6, 1.0, 0.45, '#5a3a22', '#b8905a'); mast(objs, -0.5, 1.9, 1.2, 1.05, '#f4efe2'); mast(objs, 0.55, 1.6, 1.0, 0.85, '#f4efe2')
    for sx in (-0.42, 0.42):
        for k in range(3):
            c = new_obj('cannon', bm_cyl((sx, -0.5 + k * 0.5, 0.36), (sx * 1.2, -0.5 + k * 0.5, 0.36), 0.04, 0.035, 8)); set_mat(c, mat('iron', '#3a3a42', 0.55, 0.7)); objs.append(c)
    EXPORT('veh_galleon', objs, kind='vehicle', status='provisional', note='大型船（galleon）')
    reset(); objs = []
    env = new_obj('envelope', bm_sphere((0, 0, 1.25), (0.55, 1.35, 0.5), 20, 12)); set_mat(env, mat('envelope', '#d8c8a0', 0.85)); objs.append(env)
    for k in range(4):
        r = new_obj('rib', bm_cyl((-0.56, -0.9 + k * 0.6, 1.25), (0.56, -0.9 + k * 0.6, 1.25), 0.012, 0.012, 6)); set_mat(r, mat('rib', '#8a5a32', 0.8)); objs.append(r)
    hull(objs, 1.3, 0.55, 0.28, '#7a4a2a', '#c8a070')
    for sx in (-0.2, 0.2):
        for sy in (-0.4, 0.4):
            rp = new_obj('rope', bm_cyl((sx, sy, 0.3), (sx * 1.8, sy * 1.4, 0.82), 0.008, 0.008, 4)); set_mat(rp, mat('rope', '#4a3a2a', 0.9)); objs.append(rp)
    for sx in (-1, 1):
        p = new_obj('prop', bm_box((sx * 0.6, 0.6, 0.35), (0.04, 0.04, 0.42))); set_mat(p, mat('iron', '#3a3a42', 0.55, 0.7)); objs.append(p)
    fin = new_obj('fin', bm_box((0, 1.25, 1.35), (0.03, 0.4, 0.45))); set_mat(fin, mat('fin', '#a83a2a', 0.8)); objs.append(fin)
    EXPORT('veh_airship', objs, kind='vehicle', status='provisional', note='飛空艇（airship）')

if __name__ == '__main__':
    want = set(sys.argv[1:]) or {'trees', 'props', 'landmarks', 'vehicles'}
    if 'trees' in want: trees()
    if 'props' in want: props()
    if 'landmarks' in want: landmarks()
    if 'vehicles' in want: vehicles()
    print('done')
