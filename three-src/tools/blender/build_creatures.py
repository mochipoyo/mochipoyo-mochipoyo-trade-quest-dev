# -*- coding: utf-8 -*-
"""
もちぽよFXクエスト 3D：モンスターの「型」（アーキタイプ）を Blender（bpy）で作る
  python3 tools/blender/build_creatures.py            # すべての型
  python3 tools/blender/build_creatures.py slime beast
・型ごとに1つの GLB（アーマチュア＋スキニング＋アニメーション）：mon_<型>.glb
・アニメーション：Idle / Walk / Attack / Cast / Hit / Defeat（人型の型は主人公と同じ9種）
・色：マテリアル名 tint_body（体の色）・tint_accent（差し色）を、実行時に2D版の敵データ（art.c.base）の色に置き換える
  → 248体の敵を、14の型＋色＋大きさで表示する。1体ずつの専用モデルではないので、状態は provisional（仮3D）
座標：Blender は Z 上・モデルは -Y 向き（glTF では +Z 向き）。1 単位 = 1 タイル。足もと（または浮遊の基準）が原点
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_assets as BA
from build_assets import (reset, mat, vmat, new_obj, set_mat, smooth, bevel, transform, bm_sphere, bm_ico, bm_box, bm_cyl,
                          bm_loft, bm_cone, noise_displace, vcolor, srgb_to_lin, merge_bms, modifier, link, BONES)
import bpy
from mathutils import Vector, Quaternion, Matrix
import pipeline

pipeline.install(BA, 'build_creatures.py')
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
ANIMS6 = ['Idle', 'Walk', 'Attack', 'Cast', 'Hit', 'Defeat']

# ------------------------------------------------------------------ 共通：独自のボーン構成
def make_rig(bones):
    ad = bpy.data.armatures.new('Rig'); arm = link(bpy.data.objects.new('Rig', ad))
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for n, (h, t, p) in bones.items():
        b = ad.edit_bones.new(n); b.head = Vector(h); b.tail = Vector(t); b.roll = 0.0; eb[n] = b
    for n, (h, t, p) in bones.items():
        if p: eb[n].parent = eb[p]; eb[n].use_connect = (Vector(bones[p][1]) - Vector(h)).length < 1e-4
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm

def wpart(bm, name, material, bones, names, smooth_on=True, blend=2, power=4.0):
    o = new_obj(name, bm); set_mat(o, material); smooth(o, smooth_on)
    segs = [(n, Vector(bones[n][0]), Vector(bones[n][1])) for n in names]
    groups = {n: (o.vertex_groups.get(n) or o.vertex_groups.new(name=n)) for n in names}
    for v in o.data.vertices:
        ds = sorted(((BA.seg_dist(v.co, a, b), n) for n, a, b in segs))[:blend]
        ws = [(1.0 / (d + 0.004) ** power, n) for d, n in ds]; s = sum(w for w, _ in ws)
        for w, n in ws: groups[n].add([v.index], w / s, 'REPLACE')
    return o

def acts(arm, spec):
    """spec: [(name, frames, keyfn)]。keyfn(f) → {bone: [(axis, deg)], '_root': (x,y,z), '_scale': (sx,sy,sz)}"""
    arm.animation_data_create(); bones = [b.name for b in arm.pose.bones]; root = arm.data.bones[0].name
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    for name, frames, keyfn in spec:
        a = bpy.data.actions.new(name); arm.animation_data.action = a
        for f in frames:
            pose = keyfn(f)
            for b in bones:
                q = Quaternion()
                for axis, deg in pose.get(b, []): q = q @ BA.world_rot(arm, b, axis, math.radians(deg))
                pb = arm.pose.bones[b]; pb.rotation_quaternion = q; pb.keyframe_insert('rotation_quaternion', frame=f)
            rb = arm.pose.bones[root]; rest = arm.data.bones[root].matrix_local.to_quaternion()
            rb.location = rest.inverted() @ Vector(pose.get('_root', (0, 0, 0))); rb.keyframe_insert('location', frame=f)
            rb.scale = pose.get('_scale', (1, 1, 1)); rb.keyframe_insert('scale', frame=f)
        a.use_fake_user = True
        tr = arm.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, frames[0], a)
        arm.animation_data.action = None

def finish(arm, parts, arch, note, anims=ANIMS6, extra_objs=None):
    body = merge_bms(parts, 'Body')
    bpy.context.view_layer.objects.active = body; body.parent = arm; modifier(body, 'ARMATURE', object=arm)
    pipeline.set_meta(kind='creature', status='provisional', params={'archetype': arch, 'anims': anims}, note=note)
    BA.export_simple('mon_' + arch, [arm, body] + (extra_objs or []), anim=True)

def sin01(f, n): return math.sin((f - 1) / n * 2 * math.pi)

def tint(rough=0.6, metal=0.0): return mat('tint_body', '#ffffff', rough, metal)
def tint2(rough=0.7, metal=0.0): return mat('tint_accent', '#d8d8d8', rough, metal)

def eyes(parts, bones, bone, pts, r=0.045, glow=None):
    white = mat('eye_white', '#ffffff', 0.35); black = mat('eye_black', '#16121a', 0.3)
    for (x, y, z) in pts:
        if glow:
            parts.append(wpart(bm_sphere((x, y, z), (r, r * 0.6, r), 10, 8), 'eye', mat('eye_glow', glow, 0.3, 0.0, glow, 4.0), bones, [bone]))
        else:
            parts.append(wpart(bm_sphere((x, y, z), (r, r * 0.6, r * 1.1), 12, 8), 'eye', white, bones, [bone]))
            parts.append(wpart(bm_sphere((x, y - r * 0.5, z), (r * 0.55, r * 0.3, r * 0.65), 10, 6), 'pupil', black, bones, [bone]))

# ================================================================== スライム
def slime():
    reset()
    B = {'base': ((0, 0, 0), (0, 0, 0.25), None), 'mid': ((0, 0, 0.25), (0, 0, 0.5), 'base'), 'top': ((0, 0, 0.5), (0, 0, 0.78), 'mid')}
    arm = make_rig(B); parts = []
    bm = bm_sphere((0, 0, 0.32), (0.42, 0.4, 0.34), 28, 18)
    for v in bm.verts:
        if v.co.z < 0.03: v.co.z = 0.03 + (v.co.z - 0.03) * 0.1
        if v.co.z > 0.45: v.co.x *= 1 - (v.co.z - 0.45) * 1.2; v.co.y *= 1 - (v.co.z - 0.45) * 1.2   # しずく形
    parts.append(wpart(bm, 'body', tint(0.22), B, ['base', 'mid', 'top'], blend=3))
    parts.append(wpart(bm_cone((0, 0.02, 0.6), (0, 0.06, 0.82), 0.12, 12), 'drip', tint(0.22), B, ['top']))
    eyes(parts, B, 'mid', [(0.14, -0.33, 0.4), (-0.14, -0.33, 0.4)], 0.06)
    parts.append(wpart(bm_sphere((0, -0.37, 0.27), (0.08, 0.03, 0.035), 10, 6), 'mouth', mat('mouth', '#4a1a2a', 0.5), B, ['mid']))
    parts.append(wpart(bm_sphere((-0.16, -0.24, 0.54), (0.06, 0.03, 0.04), 8, 6), 'shine', mat('shine', '#ffffff', 0.1, 0.0, '#ffffff', 0.6), B, ['top']))
    def idle(f): s = sin01(f, 60); return {'mid': [(X, 2 * s)], 'top': [(Y, 4 * s)], '_scale': (1 + 0.04 * s, 1 + 0.04 * s, 1 - 0.05 * s)}
    def walk(f): s = sin01(f, 24); h = abs(s); return {'_root': (0, 0, 0.12 * h), '_scale': (1 - 0.06 * h, 1 - 0.06 * h, 1 + 0.08 * h), 'top': [(X, -6 * s)]}
    def attack(f):
        k = {1: 0, 7: -1, 12: 1, 18: 1, 28: 0}[f]
        return {'_root': (0, -0.45 * max(0, k), 0.15 * max(0, k)), 'mid': [(X, 14 * min(0, k) * -1 - 10 * max(0, k))], 'top': [(X, -18 * max(0, k))],
                '_scale': (1 + 0.1 * max(0, -k), 1 + 0.1 * max(0, -k), 1 - 0.15 * max(0, -k) + 0.1 * max(0, k))}
    def cast(f): k = {1: 0, 10: 1, 20: 1.15, 30: 0}[f]; return {'_scale': (1 + 0.12 * k, 1 + 0.12 * k, 1 + 0.12 * k), 'top': [(Y, 10 * k)]}
    def hit(f): k = {1: 0, 4: 1, 10: 0.5, 18: 0}[f]; return {'_root': (0, 0.12 * k, 0), '_scale': (1 + 0.18 * k, 1 + 0.18 * k, 1 - 0.25 * k), 'mid': [(X, 10 * k)]}
    def defeat(f): k = {1: 0, 10: 0.5, 24: 1, 36: 1}[f]; return {'_scale': (1 + 0.5 * k, 1 + 0.5 * k, max(0.08, 1 - 0.9 * k)), 'top': [(X, 20 * k)]}
    acts(arm, [('Idle', list(range(1, 62, 6)), idle), ('Walk', list(range(1, 26, 3)), walk), ('Attack', [1, 7, 12, 18, 28], attack),
               ('Cast', [1, 10, 20, 30], cast), ('Hit', [1, 4, 10, 18], hit), ('Defeat', [1, 10, 24, 36], defeat)])
    finish(arm, parts, 'slime', 'スライム型（slime・jelly）')

# ================================================================== 四足（獣・爬虫類）
def quadruped(arch, P):
    reset()
    hy = P['height']; L_ = P['length']; lw = P.get('legw', 0.07); sx = P.get('stance', 0.16)
    fy, by_ = -L_ * 0.3, L_ * 0.32
    B = {
        'hips': ((0, by_, hy), (0, 0, hy + 0.04), None),
        'chest': ((0, 0, hy + 0.04), (0, fy, hy + 0.06), 'hips'),
        'neck': ((0, fy, hy + 0.06), (0, fy - 0.12, hy + P.get('neckUp', 0.16)), 'chest'),
        'head': ((0, fy - 0.12, hy + P.get('neckUp', 0.16)), (0, fy - 0.12 - P['head'] * 1.4, hy + P.get('neckUp', 0.16)), 'neck'),
        'tail1': ((0, by_, hy), (0, by_ + P['tail'] * 0.5, hy + P.get('tailUp', 0.08)), 'hips'),
        'tail2': ((0, by_ + P['tail'] * 0.5, hy + P.get('tailUp', 0.08)), (0, by_ + P['tail'], hy + P.get('tailUp', 0.08) * 2), 'tail1'),
    }
    if P.get('tail3'):
        t2 = B['tail2'][1]; B['tail3'] = (t2, (0, t2[1] + P['tail'] * 0.45, t2[2] - 0.04), 'tail2')
    for side, x in (('L', sx), ('R', -sx)):
        for fb, y, par in (('F', fy, 'chest'), ('B', by_ * 0.85, 'hips')):
            B['leg' + fb + 'u.' + side] = ((x, y, hy - 0.02), (x * P.get('splay', 1.0), y, hy * 0.5), par)
            B['leg' + fb + 'l.' + side] = ((x * P.get('splay', 1.0), y, hy * 0.5), (x * P.get('splay', 1.0), y - 0.02, 0.0), 'leg' + fb + 'u.' + side)
    arm = make_rig(B); parts = []
    body = tint(P.get('rough', 0.75)); acc = tint2(0.8); dark = mat('claw', '#2a2220', 0.6)
    tor = bm_loft([((0, by_ + 0.12, hy + 0.02), 0.1 * P['bulk'], 0.1 * P['bulk']), ((0, by_, hy + 0.03), P['girth'] * 0.85, P['girth'] * 0.8),
                   ((0, 0, hy + 0.05), P['girth'], P['girth'] * 0.92), ((0, fy, hy + 0.06), P['girth'] * 1.05, P['girth'] * 0.95),
                   ((0, fy - 0.1, hy + 0.08), P['girth'] * 0.6, P['girth'] * 0.6)], 16)
    parts.append(wpart(tor, 'torso', body, B, ['hips', 'chest', 'neck'], blend=2))
    # おなか（差し色）
    parts.append(wpart(bm_sphere((0, (by_ + fy) / 2, hy - P['girth'] * 0.55), (P['girth'] * 0.65, (by_ - fy) * 0.45, P['girth'] * 0.3), 14, 8), 'belly', acc, B, ['hips', 'chest']))
    hc = Vector((0, fy - 0.12 - P['head'] * 0.7, hy + P.get('neckUp', 0.16) + 0.02)); hr = P['head']
    parts.append(wpart(bm_sphere(hc, (hr * 0.85, hr, hr * 0.8), 18, 12), 'head', body, B, ['head']))
    sn = hc + Vector((0, -hr * 0.95, -hr * 0.18))
    parts.append(wpart(bm_sphere(sn, (hr * 0.5 * P.get('snoutW', 1.0), hr * 0.6 * P.get('snoutL', 1.0), hr * 0.42), 14, 8), 'snout', body, B, ['head']))
    parts.append(wpart(bm_sphere(sn + Vector((0, -hr * 0.55 * P.get('snoutL', 1.0), hr * 0.1)), (hr * 0.16, hr * 0.12, hr * 0.12), 8, 6), 'nose', dark, B, ['head']))
    eyes(parts, B, 'head', [(hr * 0.42, hc.y - hr * 0.72, hc.z + hr * 0.25), (-hr * 0.42, hc.y - hr * 0.72, hc.z + hr * 0.25)], hr * 0.2, P.get('eyeGlow'))
    if P.get('ears'):
        for s in (1, -1): parts.append(wpart(bm_cone(hc + Vector((s * hr * 0.5, 0.02, hr * 0.55)), hc + Vector((s * hr * 0.75, 0.08, hr * 1.35)), hr * 0.28, 6), 'ear', body, B, ['head']))
    if P.get('horns'):
        for s in (1, -1):
            pts = [(hc + Vector((s * hr * 0.45, 0, hr * 0.5)), hr * 0.18, hr * 0.18), (hc + Vector((s * hr * 1.0, hr * 0.3, hr * 0.8)), hr * 0.14, hr * 0.14),
                   (hc + Vector((s * hr * 1.15, hr * 0.1, hr * 0.25)), hr * 0.08, hr * 0.08), (hc + Vector((s * hr * 0.95, -hr * 0.2, hr * 0.05)), 0.01, 0.01)]
            parts.append(wpart(bm_loft(pts, 8), 'horn', mat('horn', '#e8dcc0', 0.6), B, ['head']))
    if P.get('teeth'):
        for k in range(4):
            x = (-0.06 + k * 0.04) * hr / 0.15
            parts.append(wpart(bm_cone(sn + Vector((x, -hr * 0.35, -hr * 0.3)), sn + Vector((x, -hr * 0.35, -hr * 0.55)), hr * 0.05, 4), 'tooth', mat('tooth', '#f4f0e4', 0.5), B, ['head']))
    if P.get('spikes'):
        for k in range(6):
            y = by_ - (by_ - fy) * k / 5
            parts.append(wpart(bm_cone((0, y, hy + P['girth'] * 0.85), (0, y + 0.04, hy + P['girth'] * 0.85 + 0.14), 0.05, 4), 'spike', acc, B, ['hips' if y > 0 else 'chest']))
    # 脚
    for side, x in (('L', sx), ('R', -sx)):
        for fb in ('F', 'B'):
            u, l = B['leg' + fb + 'u.' + side], B['leg' + fb + 'l.' + side]
            parts.append(wpart(bm_loft([(u[0], lw * 1.3, lw * 1.3), (u[1], lw, lw), (l[1], lw * 0.85, lw * 0.85)], 10), 'leg', body, B, ['leg' + fb + 'u.' + side, 'leg' + fb + 'l.' + side], blend=2))
            parts.append(wpart(bm_sphere((l[1][0], l[1][1] - 0.03, 0.035), (lw * 1.2, lw * 1.5, lw * 0.6), 10, 6), 'paw', dark if P.get('darkPaws') else body, B, ['leg' + fb + 'l.' + side]))
    # しっぽ
    tb = [n for n in ('tail1', 'tail2', 'tail3') if n in B]
    tpts = [(B['tail1'][0], P['tailR'], P['tailR'])] + [(B[n][1], P['tailR'] * (0.7 if i == 0 else 0.4 if i == 1 else 0.2), P['tailR'] * (0.7 if i == 0 else 0.4 if i == 1 else 0.2)) for i, n in enumerate(tb)]
    parts.append(wpart(bm_loft(tpts, 10), 'tail', body, B, tb, blend=2))
    if P.get('bushyTail'): parts.append(wpart(bm_sphere(B[tb[-1]][1], (P['tailR'] * 1.6, P['tailR'] * 2.4, P['tailR'] * 1.6), 12, 8), 'tailtip', acc, B, [tb[-1]]))
    legs = lambda a, b: {'legFu.L': [(X, a)], 'legBu.R': [(X, a)], 'legFu.R': [(X, b)], 'legBu.L': [(X, b)]}
    def idle(f):
        s = sin01(f, 60); p = {'chest': [(X, 1.5 * s)], 'neck': [(X, -2 * s)], 'head': [(Z, 5 * math.sin((f - 1) / 60 * math.pi))], 'tail1': [(Z, 14 * s)], 'tail2': [(Z, 10 * s)]}
        return p
    def walk(f):
        s = sin01(f, 24); p = legs(-26 * s, 26 * s)
        for k in ('legFl.L', 'legBl.R'): p[k] = [(X, 20 * max(0, s))]
        for k in ('legFl.R', 'legBl.L'): p[k] = [(X, 20 * max(0, -s))]
        p['tail1'] = [(Z, 10 * s)]; p['_root'] = (0, 0, 0.02 * abs(s)); return p
    def attack(f):
        k = {1: 0, 8: -1, 13: 1, 19: 1, 30: 0}[f]
        p = {'_root': (0, -0.55 * max(0, k) + 0.08 * max(0, -k), 0.12 * max(0, k) - 0.05 * max(0, -k)), 'chest': [(X, 8 * max(0, -k) - 6 * max(0, k))],
             'neck': [(X, -18 * max(0, k))], 'head': [(X, -14 * max(0, k))], 'legFu.L': [(X, -40 * max(0, k))], 'legFu.R': [(X, -40 * max(0, k))],
             'legBu.L': [(X, 25 * max(0, -k))], 'legBu.R': [(X, 25 * max(0, -k))], 'tail1': [(X, 20 * max(0, k))]}
        return p
    def cast(f):
        k = {1: 0, 10: 1, 26: 1, 36: 0}[f]
        return {'hips': [(X, 22 * k)], 'neck': [(X, 30 * k)], 'head': [(X, 20 * k)], 'legFu.L': [(X, -30 * k)], 'legFu.R': [(X, -30 * k)], 'legBu.L': [(X, -22 * k)], 'legBu.R': [(X, -22 * k)], 'tail1': [(X, -15 * k)]}
    def hit(f):
        k = {1: 0, 4: 1, 10: 0.5, 18: 0}[f]
        return {'_root': (0, 0.18 * k, 0), 'chest': [(X, 10 * k)], 'neck': [(X, 18 * k)], 'head': [(Z, 12 * k)]}
    def defeat(f):
        k = {1: 0, 12: 0.6, 24: 1, 40: 1}[f]
        p = {'hips': [(Y, 82 * k)], '_root': (0, 0, -hy * 0.45 * k), 'neck': [(X, -10 * k)], 'head': [(X, -15 * k)]}
        for n in ('legFu.L', 'legFu.R', 'legBu.L', 'legBu.R'): p[n] = [(X, 18 * k)]
        return p
    acts(arm, [('Idle', list(range(1, 62, 6)), idle), ('Walk', list(range(1, 26, 3)), walk), ('Attack', [1, 8, 13, 19, 30], attack),
               ('Cast', [1, 10, 26, 36], cast), ('Hit', [1, 4, 10, 18], hit), ('Defeat', [1, 12, 24, 40], defeat)])
    finish(arm, parts, arch, P['note'])

# ================================================================== 鳥
def bird():
    reset()
    B = {'body': ((0, 0.12, 0.6), (0, -0.14, 0.62), None), 'neck': ((0, -0.14, 0.62), (0, -0.2, 0.76), 'body'), 'head': ((0, -0.2, 0.76), (0, -0.4, 0.79), 'neck'),
         'tail': ((0, 0.12, 0.6), (0, 0.42, 0.56), 'body')}
    for s, n in ((1, 'L'), (-1, 'R')):
        B['wing.' + n] = ((s * 0.12, 0.0, 0.66), (s * 0.48, 0.04, 0.68), 'body'); B['tip.' + n] = ((s * 0.48, 0.04, 0.68), (s * 0.85, 0.12, 0.64), 'wing.' + n)
        B['leg.' + n] = ((s * 0.06, 0.02, 0.5), (s * 0.06, 0.0, 0.28), 'body')
    arm = make_rig(B); parts = []; body = tint(0.8); acc = tint2(0.85); beak = mat('beak', '#e8a83a', 0.5)
    parts.append(wpart(bm_sphere((0, 0, 0.6), (0.18, 0.27, 0.18), 18, 12), 'body', body, B, ['body', 'neck']))
    parts.append(wpart(bm_sphere((0, -0.03, 0.54), (0.14, 0.2, 0.12), 14, 8), 'breast', acc, B, ['body']))
    parts.append(wpart(bm_sphere((0, -0.3, 0.8), (0.12, 0.13, 0.12), 16, 10), 'head', body, B, ['head']))
    parts.append(wpart(bm_cone((0, -0.4, 0.79), (0, -0.55, 0.76), 0.05, 6), 'beak', beak, B, ['head']))
    eyes(parts, B, 'head', [(0.07, -0.38, 0.83), (-0.07, -0.38, 0.83)], 0.03)
    for s, n in ((1, 'L'), (-1, 'R')):
        w = bm_loft([((s * 0.1, -0.02, 0.66), 0.03, 0.14), ((s * 0.48, 0.04, 0.68), 0.025, 0.16), ((s * 0.85, 0.14, 0.64), 0.01, 0.05)], 6)
        parts.append(wpart(w, 'wing', body, B, ['wing.' + n, 'tip.' + n], blend=2))
        parts.append(wpart(bm_cyl((s * 0.06, 0.02, 0.5), (s * 0.06, 0.0, 0.08), 0.018, 0.015, 6), 'leg', beak, B, ['leg.' + n]))
        parts.append(wpart(bm_box((s * 0.06, -0.04, 0.06), (0.06, 0.1, 0.02)), 'foot', beak, B, ['leg.' + n]))
    parts.append(wpart(bm_loft([((0, 0.15, 0.6), 0.06, 0.03), ((0, 0.45, 0.56), 0.16, 0.02)], 6), 'tail', acc, B, ['tail']))
    def flap(s, amp=38): return {'wing.L': [(Y, -amp * s)], 'tip.L': [(Y, -amp * 0.6 * s)], 'wing.R': [(Y, amp * s)], 'tip.R': [(Y, amp * 0.6 * s)]}
    def idle(f): s = sin01(f, 24); p = flap(s); p['_root'] = (0, 0, 0.06 * s + 0.05); p['tail'] = [(X, 5 * s)]; return p
    def walk(f): s = sin01(f, 12); p = flap(s, 48); p['_root'] = (0, 0, 0.05 * s + 0.08); return p
    def attack(f):
        k = {1: 0, 8: -1, 13: 1, 19: 1, 30: 0}[f]; p = flap(0.6 * k)
        p['_root'] = (0, -0.6 * max(0, k), 0.15 * max(0, -k) - 0.15 * max(0, k)); p['body'] = [(X, -25 * max(0, k) + 10 * max(0, -k))]; p['neck'] = [(X, -20 * max(0, k))]; return p
    def cast(f): k = {1: 0, 10: 1, 26: 1, 36: 0}[f]; p = flap(-1.1 * k, 50); p['_root'] = (0, 0, 0.2 * k); p['neck'] = [(X, 18 * k)]; return p
    def hit(f): k = {1: 0, 4: 1, 10: 0.5, 18: 0}[f]; p = flap(0.8 * k); p['_root'] = (0, 0.15 * k, -0.05 * k); p['body'] = [(X, 15 * k)]; return p
    def defeat(f):
        k = {1: 0, 10: 0.5, 24: 1, 40: 1}[f]; p = flap(-0.4 * k); p['_root'] = (0, 0, -0.48 * k); p['body'] = [(Y, 70 * k)]; p['neck'] = [(X, -30 * k)]; return p
    acts(arm, [('Idle', list(range(1, 26, 3)), idle), ('Walk', list(range(1, 14, 2)), walk), ('Attack', [1, 8, 13, 19, 30], attack),
               ('Cast', [1, 10, 26, 36], cast), ('Hit', [1, 4, 10, 18], hit), ('Defeat', [1, 10, 24, 40], defeat)])
    finish(arm, parts, 'bird', '鳥型（bird・owl）。地面から少し浮いて羽ばたく')

# ================================================================== 虫
def insect():
    reset()
    B = {'thorax': ((0, 0.02, 0.38), (0, -0.14, 0.4), None), 'head': ((0, -0.14, 0.4), (0, -0.3, 0.42), 'thorax'), 'abdomen': ((0, 0.02, 0.38), (0, 0.42, 0.46), 'thorax')}
    for s, n in ((1, 'L'), (-1, 'R')):
        for i, y in enumerate((-0.1, 0.0, 0.1)):
            B['leg%d.%s' % (i, n)] = ((s * 0.08, y, 0.34), (s * 0.4, y + (i - 1) * 0.12, 0.0), 'thorax')
        B['wing.' + n] = ((s * 0.05, 0.0, 0.48), (s * 0.42, 0.18, 0.62), 'thorax')
    arm = make_rig(B); parts = []; body = tint(0.4); acc = tint2(0.5); leg = mat('ileg', '#2a2224', 0.5)
    parts.append(wpart(bm_sphere((0, -0.04, 0.4), (0.13, 0.15, 0.12), 14, 10), 'thorax', body, B, ['thorax']))
    ab = bm_sphere((0, 0.26, 0.44), (0.17, 0.26, 0.15), 16, 10)
    parts.append(wpart(ab, 'abdomen', body, B, ['abdomen']))
    for k in range(3): parts.append(wpart(bm_cyl((0, 0.16 + k * 0.1, 0.44), (0, 0.18 + k * 0.1, 0.44), 0.172 - k * 0.025, 0.17 - k * 0.025, 14), 'stripe', acc, B, ['abdomen']))
    parts.append(wpart(bm_sphere((0, -0.24, 0.42), (0.1, 0.1, 0.09), 14, 10), 'head', body, B, ['head']))
    eyes(parts, B, 'head', [(0.07, -0.29, 0.45), (-0.07, -0.29, 0.45)], 0.045, '#ff4a3a')
    for s in (1, -1):
        parts.append(wpart(bm_cone((s * 0.04, -0.3, 0.37), (s * 0.02, -0.4, 0.33), 0.02, 4), 'mandible', leg, B, ['head']))
        parts.append(wpart(bm_cyl((s * 0.03, -0.28, 0.5), (s * 0.12, -0.42, 0.68), 0.008, 0.006, 4), 'antenna', leg, B, ['head']))
    for s, n in ((1, 'L'), (-1, 'R')):
        for i in range(3):
            h, t, _ = B['leg%d.%s' % (i, n)]; mid = (Vector(h) + Vector(t)) / 2 + Vector((0, 0, 0.16))
            parts.append(wpart(bm_loft([(Vector(h), 0.022, 0.022), (mid, 0.018, 0.018), (Vector(t), 0.01, 0.01)], 6), 'leg', leg, B, ['leg%d.%s' % (i, n)]))
        w = bm_loft([((s * 0.05, 0.0, 0.48), 0.005, 0.06), ((s * 0.24, 0.1, 0.56), 0.005, 0.14), ((s * 0.44, 0.2, 0.62), 0.004, 0.05)], 6)
        parts.append(wpart(w, 'wing', mat('iwing', '#d8e8f0', 0.2, 0.0, '#a8c8e0', 0.4), B, ['wing.' + n]))
    def buzz(s, a=25): return {'wing.L': [(Y, -a * s)], 'wing.R': [(Y, a * s)]}
    def idle(f):
        s = sin01(f, 12); p = buzz(s); p['abdomen'] = [(X, 3 * sin01(f, 60))]; p['head'] = [(Z, 4 * sin01(f, 60))]; return p
    def walk(f):
        s = sin01(f, 16); p = buzz(s, 10)
        for n in ('leg0.L', 'leg2.L', 'leg1.R'): p[n] = [(Z, 18 * s)]
        for n in ('leg0.R', 'leg2.R', 'leg1.L'): p[n] = [(Z, -18 * s)]
        return p
    def attack(f):
        k = {1: 0, 8: -1, 13: 1, 19: 1, 30: 0}[f]; p = buzz(k)
        p['_root'] = (0, -0.45 * max(0, k), 0.08 * max(0, k)); p['thorax'] = [(X, 12 * max(0, -k) - 10 * max(0, k))]; p['head'] = [(X, -20 * max(0, k))]; return p
    def cast(f): k = {1: 0, 10: 1, 26: 1, 36: 0}[f]; p = buzz(1.4 * k); p['thorax'] = [(X, 25 * k)]; p['_root'] = (0, 0, 0.1 * k); return p
    def hit(f): k = {1: 0, 4: 1, 10: 0.5, 18: 0}[f]; return {'_root': (0, 0.15 * k, 0), 'thorax': [(X, 12 * k)], 'abdomen': [(X, -10 * k)]}
    def defeat(f):
        k = {1: 0, 10: 0.5, 24: 1, 40: 1}[f]; p = {'thorax': [(Y, 175 * k)], '_root': (0, 0, -0.1 * k)}
        for s in ('L', 'R'):
            for i in range(3): p['leg%d.%s' % (i, s)] = [(Z, (25 if s == 'L' else -25) * k)]
        return p
    acts(arm, [('Idle', list(range(1, 62, 3)), idle), ('Walk', list(range(1, 18, 2)), walk), ('Attack', [1, 8, 13, 19, 30], attack),
               ('Cast', [1, 10, 26, 36], cast), ('Hit', [1, 4, 10, 18], hit), ('Defeat', [1, 10, 24, 40], defeat)])
    finish(arm, parts, 'insect', '虫型（insect・spider・swarm）')

# ================================================================== 植物
def plant():
    reset()
    B = {'root': ((0, 0, 0), (0, 0, 0.3), None), 'stem1': ((0, 0, 0.3), (0, 0, 0.6), 'root'), 'stem2': ((0, 0, 0.6), (0, -0.04, 0.86), 'stem1'),
         'head': ((0, -0.04, 0.86), (0, -0.2, 1.0), 'stem2'), 'leaf.L': ((0.04, 0, 0.26), (0.46, 0, 0.36), 'root'), 'leaf.R': ((-0.04, 0, 0.26), (-0.46, 0, 0.36), 'root')}
    arm = make_rig(B); parts = []; body = tint(0.75); acc = tint2(0.7); soil = mat('soil', '#4a3222', 0.95)
    parts.append(wpart(bm_sphere((0, 0, 0.1), (0.3, 0.3, 0.14), 14, 8), 'bulb', soil, B, ['root']))
    parts.append(wpart(bm_loft([((0, 0, 0.1), 0.09, 0.09), ((0, 0, 0.45), 0.075, 0.075), ((0, -0.02, 0.75), 0.065, 0.065), ((0, -0.05, 0.9), 0.07, 0.07)], 10), 'stem', body, B, ['root', 'stem1', 'stem2'], blend=2))
    hc = Vector((0, -0.12, 0.98))
    parts.append(wpart(bm_sphere(hc, (0.2, 0.18, 0.2), 16, 10), 'head', body, B, ['head']))
    for k in range(7):
        a = k / 7 * 2 * math.pi; d = Vector((math.cos(a), 0, math.sin(a)))
        parts.append(wpart(bm_sphere(hc + Vector((d.x * 0.24, 0.05, d.z * 0.24)), (0.1 + 0.02 * abs(d.x), 0.04, 0.1 + 0.02 * abs(d.z)), 10, 6), 'petal', acc, B, ['head']))
    parts.append(wpart(bm_sphere(hc + Vector((0, -0.16, -0.03)), (0.12, 0.04, 0.07), 12, 6), 'mouth', mat('mouth', '#3a0a14', 0.5), B, ['head']))
    for k in range(5): parts.append(wpart(bm_cone(hc + Vector((-0.08 + k * 0.04, -0.18, 0.03)), hc + Vector((-0.08 + k * 0.04, -0.18, -0.03)), 0.015, 4), 'tooth', mat('tooth', '#f4f0e4', 0.5), B, ['head']))
    eyes(parts, B, 'head', [(0.08, -0.26, 1.06), (-0.08, -0.26, 1.06)], 0.035)
    for s, n in ((1, 'L'), (-1, 'R')):
        parts.append(wpart(bm_loft([((s * 0.04, 0, 0.26), 0.02, 0.02), ((s * 0.25, 0, 0.36), 0.13, 0.015), ((s * 0.48, 0, 0.36), 0.02, 0.01)], 6), 'leaf', body, B, ['leaf.' + n]))
    def idle(f): s = sin01(f, 60); return {'stem1': [(Z, 4 * s), (X, 3 * s)], 'stem2': [(Z, -5 * s)], 'head': [(Y, 6 * s)], 'leaf.L': [(Y, -8 * s)], 'leaf.R': [(Y, 8 * s)]}
    def walk(f): s = sin01(f, 24); return {'root': [(Z, 6 * s)], 'stem1': [(X, -4 * abs(s))], 'leaf.L': [(Y, -15 * s)], 'leaf.R': [(Y, 15 * s)], '_root': (0, 0, 0.03 * abs(s))}
    def attack(f):
        k = {1: 0, 8: -1, 13: 1, 19: 1, 30: 0}[f]
        return {'stem1': [(X, 18 * max(0, -k) - 28 * max(0, k))], 'stem2': [(X, 10 * max(0, -k) - 30 * max(0, k))], 'head': [(X, -20 * max(0, k))], '_root': (0, -0.2 * max(0, k), 0)}
    def cast(f): k = {1: 0, 10: 1, 26: 1, 36: 0}[f]; return {'stem1': [(X, 10 * k)], 'head': [(X, 25 * k)], 'leaf.L': [(Y, 40 * k)], 'leaf.R': [(Y, -40 * k)]}
    def hit(f): k = {1: 0, 4: 1, 10: 0.5, 18: 0}[f]; return {'stem1': [(X, 16 * k)], 'stem2': [(X, 14 * k)], 'head': [(Z, 15 * k)]}
    def defeat(f): k = {1: 0, 12: 0.6, 24: 1, 40: 1}[f]; return {'stem1': [(X, 35 * k)], 'stem2': [(X, 40 * k)], 'head': [(X, 30 * k)], 'leaf.L': [(Y, 30 * k)], 'leaf.R': [(Y, -30 * k)], '_scale': (1, 1, 1 - 0.2 * k)}
    acts(arm, [('Idle', list(range(1, 62, 6)), idle), ('Walk', list(range(1, 26, 3)), walk), ('Attack', [1, 8, 13, 19, 30], attack),
               ('Cast', [1, 10, 26, 36], cast), ('Hit', [1, 4, 10, 18], hit), ('Defeat', [1, 12, 24, 40], defeat)])
    finish(arm, parts, 'plant', '植物型（plant・cactus）')

# ================================================================== 魚
def fish():
    reset()
    B = {'body': ((0, 0.08, 0.62), (0, -0.2, 0.62), None), 'head': ((0, -0.2, 0.62), (0, -0.5, 0.62), 'body'),
         'tail1': ((0, 0.08, 0.62), (0, 0.34, 0.62), 'body'), 'tail2': ((0, 0.34, 0.62), (0, 0.58, 0.62), 'tail1'),
         'fin.L': ((0.12, -0.1, 0.56), (0.34, 0.0, 0.46), 'body'), 'fin.R': ((-0.12, -0.1, 0.56), (-0.34, 0.0, 0.46), 'body')}
    arm = make_rig(B); parts = []; body = tint(0.35); acc = tint2(0.4)
    bd = bm_loft([((0, -0.52, 0.6), 0.03, 0.04), ((0, -0.38, 0.62), 0.13, 0.17), ((0, -0.12, 0.63), 0.17, 0.23), ((0, 0.15, 0.62), 0.12, 0.16), ((0, 0.4, 0.62), 0.05, 0.07)], 14)
    parts.append(wpart(bd, 'body', body, B, ['head', 'body', 'tail1'], blend=2))
    parts.append(wpart(bm_sphere((0, -0.12, 0.53), (0.13, 0.28, 0.1), 14, 8), 'belly', acc, B, ['body', 'head']))
    parts.append(wpart(bm_loft([((0, 0.4, 0.62), 0.02, 0.06), ((0, 0.62, 0.62), 0.02, 0.26)], 6), 'tailfin', body, B, ['tail2']))
    parts.append(wpart(bm_loft([((0, -0.15, 0.84), 0.02, 0.02), ((0, 0.0, 0.98), 0.015, 0.1), ((0, 0.12, 0.84), 0.01, 0.02)], 6), 'dorsal', acc, B, ['body']))
    for s, n in ((1, 'L'), (-1, 'R')):
        parts.append(wpart(bm_loft([((s * 0.12, -0.1, 0.56), 0.015, 0.05), ((s * 0.34, 0.02, 0.46), 0.01, 0.1)], 6), 'fin', acc, B, ['fin.' + n]))
    eyes(parts, B, 'head', [(0.1, -0.38, 0.68), (-0.1, -0.38, 0.68)], 0.04)
    for k in range(5): parts.append(wpart(bm_cone((-0.06 + k * 0.03, -0.5, 0.58), (-0.06 + k * 0.03, -0.5, 0.53), 0.01, 4), 'tooth', mat('tooth', '#f4f0e4', 0.5), B, ['head']))
    def swim(s, a=18): return {'tail1': [(Z, a * s)], 'tail2': [(Z, a * 1.4 * s)], 'head': [(Z, -a * 0.3 * s)], 'fin.L': [(Y, -12 * s)], 'fin.R': [(Y, 12 * s)]}
    def idle(f): s = sin01(f, 30); p = swim(s); p['_root'] = (0, 0, 0.05 * sin01(f, 60)); return p
    def walk(f): s = sin01(f, 14); p = swim(s, 26); p['_root'] = (0, 0, 0.03 * s); return p
    def attack(f): k = {1: 0, 8: -1, 13: 1, 19: 1, 30: 0}[f]; p = swim(0.8 * k, 22); p['_root'] = (0, -0.6 * max(0, k) + 0.1 * max(0, -k), 0); p['head'] = [(X, -12 * max(0, k))]; return p
    def cast(f): k = {1: 0, 10: 1, 26: 1, 36: 0}[f]; p = swim(math.sin(k * 6), 20); p['_root'] = (0, 0, 0.18 * k); p['body'] = [(X, 20 * k)]; return p
    def hit(f): k = {1: 0, 4: 1, 10: 0.5, 18: 0}[f]; p = swim(k, 30); p['_root'] = (0, 0.16 * k, 0); return p
    def defeat(f): k = {1: 0, 10: 0.5, 24: 1, 40: 1}[f]; return {'body': [(Y, 170 * k)], '_root': (0, 0, -0.45 * k), 'tail1': [(Z, 10 * k)]}
    acts(arm, [('Idle', list(range(1, 62, 3)), idle), ('Walk', list(range(1, 16, 2)), walk), ('Attack', [1, 8, 13, 19, 30], attack),
               ('Cast', [1, 10, 26, 36], cast), ('Hit', [1, 4, 10, 18], hit), ('Defeat', [1, 10, 24, 40], defeat)])
    finish(arm, parts, 'fish', '魚型（aquatic・shark・ray・maw）。地面から浮いて泳ぐ')

# ================================================================== 霊
def spirit():
    reset()
    B = {'body': ((0, 0, 0.62), (0, 0, 0.92), None), 'head': ((0, 0, 0.92), (0, 0, 1.18), 'body'), 'tail1': ((0, 0, 0.62), (0, 0.06, 0.36), 'body'),
         'tail2': ((0, 0.06, 0.36), (0, 0.16, 0.12), 'tail1'), 'arm.L': ((0.18, 0, 0.84), (0.42, -0.06, 0.66), 'body'), 'arm.R': ((-0.18, 0, 0.84), (-0.42, -0.06, 0.66), 'body')}
    arm = make_rig(B); parts = []; body = tint(0.5); acc = tint2(0.6)
    cl = bm_loft([((0, 0.16, 0.1), 0.02, 0.02), ((0, 0.06, 0.34), 0.12, 0.11), ((0, 0.0, 0.62), 0.22, 0.2), ((0, 0, 0.88), 0.24, 0.22), ((0, 0, 1.06), 0.2, 0.19), ((0, 0.01, 1.2), 0.08, 0.08), ((0, 0.02, 1.24), 0.01, 0.01)], 16)
    parts.append(wpart(cl, 'cloak', body, B, ['tail2', 'tail1', 'body', 'head'], blend=2))
    parts.append(wpart(bm_sphere((0, -0.12, 1.0), (0.15, 0.1, 0.13), 14, 8), 'face', mat('void', '#120c1a', 0.9), B, ['head']))
    eyes(parts, B, 'head', [(0.06, -0.2, 1.02), (-0.06, -0.2, 1.02)], 0.032, '#ffe86a')
    for s, n in ((1, 'L'), (-1, 'R')):
        parts.append(wpart(bm_loft([((s * 0.16, 0, 0.86), 0.07, 0.07), ((s * 0.3, -0.03, 0.76), 0.06, 0.06), ((s * 0.44, -0.07, 0.64), 0.03, 0.03)], 8), 'arm', body, B, ['arm.' + n]))
    for k in range(3):
        a = k / 3 * 2 * math.pi
        parts.append(wpart(bm_ico((math.cos(a) * 0.36, math.sin(a) * 0.36, 0.5 + k * 0.12), 0.05, 1), 'orb', mat('orb', '#bfe8ff', 0.3, 0.0, '#8ad0ff', 3.0), B, ['body']))
    parts.append(wpart(bm_cyl((0, -0.02, 0.6), (0, -0.02, 0.66), 0.225, 0.225, 16), 'sash', acc, B, ['body']))
    def idle(f): s = sin01(f, 60); return {'_root': (0, 0, 0.06 * s + 0.06), 'tail1': [(Z, 10 * s)], 'tail2': [(Z, 14 * s)], 'arm.L': [(Y, -8 * s)], 'arm.R': [(Y, 8 * s)], 'head': [(Z, 5 * s)]}
    def walk(f): s = sin01(f, 24); return {'_root': (0, 0, 0.04 * s + 0.08), 'body': [(X, -10)], 'tail1': [(X, 18), (Z, 8 * s)], 'tail2': [(X, 16)]}
    def attack(f):
        k = {1: 0, 8: -1, 13: 1, 19: 1, 30: 0}[f]
        return {'_root': (0, -0.55 * max(0, k), 0.06 + 0.1 * max(0, -k)), 'body': [(X, -20 * max(0, k) + 8 * max(0, -k))], 'arm.L': [(X, -50 * max(0, k))], 'arm.R': [(X, -50 * max(0, k))], 'tail1': [(X, 25 * max(0, k))]}
    def cast(f):
        k = {1: 0, 10: 1, 26: 1, 36: 0}[f]
        return {'_root': (0, 0, 0.06 + 0.2 * k), 'arm.L': [(Y, 55 * k)], 'arm.R': [(Y, -55 * k)], 'head': [(X, 15 * k)], '_scale': (1 + 0.08 * k, 1 + 0.08 * k, 1 + 0.08 * k)}
    def hit(f): k = {1: 0, 4: 1, 10: 0.5, 18: 0}[f]; return {'_root': (0, 0.18 * k, 0.06), 'body': [(X, 14 * k)], 'head': [(Z, 12 * k)]}
    def defeat(f): k = {1: 0, 10: 0.5, 24: 1, 40: 1}[f]; return {'_root': (0, 0, 0.06 + 0.4 * k), '_scale': (max(0.05, 1 - 0.95 * k),) * 3, 'body': [(Z, 90 * k)]}
    acts(arm, [('Idle', list(range(1, 62, 6)), idle), ('Walk', list(range(1, 26, 3)), walk), ('Attack', [1, 8, 13, 19, 30], attack),
               ('Cast', [1, 10, 26, 36], cast), ('Hit', [1, 4, 10, 18], hit), ('Defeat', [1, 10, 24, 40], defeat)])
    finish(arm, parts, 'spirit', '霊型（spirit・magical・market・mirror・tome・bell）。浮いて漂う')

# ================================================================== 人型（主人公と同じ17ボーン・9種のアニメーション）
def humanoid(arch, P):
    reset(); S = P.get('scale', 1.0)
    arm = BA.make_armature(S); parts = []
    V = lambda x, y, z: Vector((x * S, y * S, z * S))
    body = tint(P.get('rough', 0.7), P.get('metal', 0.0)); acc = tint2(0.7, P.get('metal2', 0.0))
    skin = mat(arch + '_skin', P.get('skin', '#c8b8a0'), 0.7)
    part = lambda bm, name, m, bones: BA.part(bm, name, m, bones, S)
    bulk = P.get('bulk', 1.0)
    # 頭
    hm = {'helm': body, 'skull': mat('bone', '#e8e2d0', 0.7), 'rock': body, 'box': body, 'hood': acc, 'demon': body}[P['headKind']]
    if P['headKind'] == 'box':
        o = part(bm_box(V(0, 0, 0.86), (0.36 * S, 0.32 * S, 0.3 * S)), 'head', hm, ['head']); bevel(o, 0.02 * S, 2); parts.append(o)
    else:
        parts.append(part(bm_sphere(V(0, 0, 0.865), (0.2 * S * bulk ** 0.3, 0.19 * S, 0.2 * S), 20, 14), 'head', hm, ['head']))
    if P['headKind'] == 'helm':
        parts.append(part(bm_box(V(0, -0.175, 0.85), (0.24 * S, 0.03 * S, 0.05 * S)), 'visor', mat('void', '#120c1a', 0.9), ['head']))
        parts.append(part(bm_loft([(V(0, 0.05, 1.06), 0.02 * S, 0.07 * S), (V(0, 0.2, 1.0), 0.02 * S, 0.06 * S)], 6), 'crest', acc, ['head']))
    if P['headKind'] in ('skull', 'demon', 'rock', 'hood'):
        eyes_glow = P.get('eyeGlow', '#ff3a3a')
        for sx in (1, -1): parts.append(part(bm_sphere(V(0.07 * sx, -0.175, 0.87), (0.032 * S, 0.015 * S, 0.03 * S), 8, 6), 'eye', mat('eye_glow' + eyes_glow, eyes_glow, 0.3, 0.0, eyes_glow, 4.0), ['head']))
    if P['headKind'] == 'box':
        parts.append(part(bm_box(V(0, -0.165, 0.88), (0.26 * S, 0.02 * S, 0.06 * S)), 'visor', mat('visor', '#4ad8ff', 0.3, 0.0, '#4ad8ff', 4.0), ['head']))
        parts.append(part(bm_cyl(V(0.1, 0, 1.0), V(0.12, 0, 1.15), 0.01 * S, 0.01 * S, 4), 'antenna', mat('iron', '#3a3a42', 0.55, 0.7), ['head']))
    if P['headKind'] == 'hood':
        parts.append(part(bm_sphere(V(0, -0.05, 0.85), (0.16 * S, 0.14 * S, 0.15 * S), 14, 10), 'face', skin, ['head']))
        parts.append(part(bm_box(V(0, -0.17, 0.78), (0.24 * S, 0.04 * S, 0.1 * S)), 'mask', body, ['head']))
    if P.get('horns'):
        for sx in (1, -1): parts.append(part(bm_loft([(V(0.12 * sx, 0, 1.0), 0.04 * S, 0.04 * S), (V(0.2 * sx, 0.04, 1.14), 0.025 * S, 0.025 * S), (V(0.22 * sx, 0.1, 1.24), 0.004, 0.004)], 8), 'horn', mat('horn', '#2a1a1a', 0.5), ['head']))
    # 胴体
    if P.get('torsoBox'):
        o = part(bm_box(V(0, 0, 0.52), (0.36 * S * bulk, 0.24 * S * bulk, 0.3 * S)), 'torso', body, ['spine', 'chest', 'hips']); bevel(o, 0.02 * S, 2); parts.append(o)
    else:
        tr = bm_loft([(V(0, 0, 0.36), 0.13 * S * bulk, 0.1 * S * bulk), (V(0, 0, 0.5), 0.15 * S * bulk, 0.11 * S * bulk), (V(0, 0, 0.63), 0.18 * S * bulk, 0.12 * S * bulk), (V(0, 0, 0.68), 0.08 * S, 0.07 * S)], 14)
        parts.append(part(tr, 'torso', body, ['hips', 'spine', 'chest', 'neck']))
    if P.get('ribs'):
        for k in range(4): parts.append(part(bm_box(V(0, -0.1 * bulk, 0.46 + k * 0.045), (0.2 * S, 0.02 * S, 0.015 * S)), 'rib', mat('bone', '#e8e2d0', 0.7), ['spine', 'chest']))
    parts.append(part(bm_box(V(0, 0, 0.38), (0.28 * S * bulk, 0.2 * S * bulk, 0.06 * S)), 'belt', acc, ['hips']))
    # 腕・脚
    limb = P.get('limb', 0.045) * bulk
    for side in ('L', 'R'):
        u, f_, h = BONES['upper_arm.' + side], BONES['forearm.' + side], BONES['hand.' + side]
        parts.append(part(bm_loft([(V(*u[0]), limb * S * 1.1, limb * S * 1.1), (V(*u[1]), limb * S, limb * S), (V(*f_[1]), limb * S * 0.85, limb * S * 0.85)], 10), 'arm', body, ['upper_arm.' + side, 'forearm.' + side]))
        parts.append(part(bm_sphere(V(*h[0]) + V(0, 0, -0.03), (limb * S * 1.25, limb * S * 1.25, limb * S * 1.25), 10, 8), 'hand', skin if P['headKind'] in ('hood',) else body, ['hand.' + side]))
        if P.get('pads'): parts.append(part(bm_sphere(V(*u[0]) + V(0.02 if side == 'L' else -0.02, 0, 0.01), (0.09 * S * bulk, 0.09 * S * bulk, 0.06 * S), 12, 8), 'pad', acc, ['upper_arm.' + side]))
        t, s_, ft = BONES['thigh.' + side], BONES['shin.' + side], BONES['foot.' + side]
        parts.append(part(bm_loft([(V(*t[0]), limb * S * 1.3, limb * S * 1.3), (V(*t[1]), limb * S * 1.1, limb * S * 1.1), (V(*s_[1]), limb * S * 0.95, limb * S * 0.95)], 10), 'leg', acc if P.get('legsAccent') else body, ['thigh.' + side, 'shin.' + side]))
        parts.append(part(bm_box(V(ft[0][0], -0.03, 0.03), (0.09 * S * bulk, 0.16 * S * bulk, 0.06 * S)), 'foot', acc, ['foot.' + side]))
    if P.get('wings'):
        for sx in (1, -1):
            w = bm_loft([(V(0.06 * sx, 0.1, 0.62), 0.02 * S, 0.06 * S), (V(0.35 * sx, 0.22, 0.82), 0.015 * S, 0.16 * S), (V(0.62 * sx, 0.28, 0.7), 0.01 * S, 0.05 * S)], 6)
            parts.append(part(w, 'wing', acc, ['chest']))
    if P.get('tail'):
        parts.append(part(bm_loft([(V(0, 0.1, 0.38), 0.03 * S, 0.03 * S), (V(0, 0.3, 0.25), 0.02 * S, 0.02 * S), (V(0, 0.45, 0.3), 0.012 * S, 0.012 * S)], 8), 'tail', body, ['hips']))
    if P.get('cape'):
        parts.append(part(bm_loft([(V(0, 0.08, 0.64), 0.14 * S, 0.02 * S), (V(0, 0.13, 0.42), 0.18 * S, 0.02 * S), (V(0, 0.16, 0.18), 0.2 * S, 0.018 * S)], 14), 'cape', acc, ['chest', 'spine', 'hips']))
    if P.get('rocks'):
        rng = random.Random(5)
        for k in range(6):
            c = V(rng.uniform(-0.14, 0.14), rng.uniform(-0.1, 0.1), rng.uniform(0.42, 0.66))
            o = part(bm_ico(c, 0.07 * S, 1), 'rock', acc, ['chest' if c.z > 0.55 * S else 'spine']); parts.append(o)
    body_obj = merge_bms(parts, 'Body')
    bpy.context.view_layer.objects.active = body_obj; body_obj.parent = arm; modifier(body_obj, 'ARMATURE', object=arm)
    props = []
    def bone_child(obj, bone):
        obj.parent = arm; obj.parent_type = 'BONE'; obj.parent_bone = bone; bpy.context.view_layer.update()
        b = arm.data.bones[bone]; mw = arm.matrix_world @ Matrix.Translation(b.tail_local) @ b.matrix_local.to_3x3().to_4x4()
        obj.matrix_parent_inverse = mw.inverted(); props.append(obj)
    wpn = P.get('weapon')
    if wpn:
        hx, hy, hz = BONES['hand.R'][0]; c = V(hx, hy - 0.01, hz - 0.035)
        steel = mat('steel_' + wpn, {'sword': '#dfe6ee', 'rusty': '#9a7a5a', 'blade': '#c8ccd0', 'cannon': '#5a6068', 'club': '#6a4a2a'}[wpn], 0.3, 0.9 if wpn != 'club' else 0.0)
        objs = []
        if wpn == 'cannon':
            o = new_obj('cannon', bm_cyl((0, 0, -0.02 * S), (0, 0, 0.26 * S), 0.05 * S, 0.04 * S, 10)); set_mat(o, steel); objs.append(o)
        elif wpn == 'club':
            o = new_obj('club', bm_cyl((0, 0, -0.05 * S), (0, 0, 0.4 * S), 0.03 * S, 0.07 * S, 8)); set_mat(o, steel); objs.append(o)
        else:
            L0 = 0.34 if wpn != 'blade' else 0.28
            o = new_obj('blade', bm_box((0, 0, (0.03 + L0 / 2) * S), (0.014 * S, 0.045 * S, L0 * S))); set_mat(o, steel); objs.append(o)
            if wpn == 'blade':
                for v in o.data.vertices: v.co.y += (v.co.z / S) ** 2 * 0.25 * S
            g = new_obj('guard', bm_box((0, 0, 0.025 * S), (0.03 * S, 0.12 * S, 0.02 * S))); set_mat(g, mat('gold', '#d8b04a', 0.35, 0.8)); objs.append(g)
        w = merge_bms(objs, 'Weapon')
        w.location = c; bpy.context.view_layer.update(); bone_child(w, 'hand.R')
    if P.get('shield'):
        o = new_obj('Shield', bm_cyl((0, 0, 0), (0, -0.03 * S, 0), 0.13 * S, 0.13 * S, 16)); set_mat(o, acc)
        hx, hy, hz = BONES['forearm.L'][1]; o.location = V(hx + 0.03, hy - 0.05, hz + 0.04); bpy.context.view_layer.update(); bone_child(o, 'forearm.L')
    BA.make_actions(arm, S, {'hunch': P.get('hunch', False)})
    pipeline.set_meta(kind='creature', status='provisional', params={'archetype': arch, 'anims': BA.ANIMS if hasattr(BA, 'ANIMS') else None}, note=P['note'])
    BA.export_simple('mon_' + arch, [arm, body_obj] + props, anim=True)

HUMANOIDS = {
    'knight': dict(headKind='helm', metal=0.7, rough=0.35, pads=True, weapon='sword', shield=True, legsAccent=False, note='騎士型（knight）。主人公と同じ17ボーンの人型'),
    'undead': dict(headKind='skull', bulk=0.8, limb=0.03, ribs=True, weapon='rusty', cape=True, hunch=True, eyeGlow='#7affd8', note='不死型（undead）。骨の人型'),
    'demon': dict(headKind='demon', bulk=1.15, horns=True, wings=True, tail=True, eyeGlow='#ffd23a', note='悪魔型（demon）。角・翼・尾つきの人型'),
    'humanoid': dict(headKind='hood', skin='#e8c0a0', weapon='blade', cape=True, legsAccent=True, note='人の敵（盗賊・兵士・海賊など art の無い敵）。フードの人型'),
    'golem': dict(headKind='rock', bulk=1.6, limb=0.06, rough=0.95, rocks=True, scale=1.25, weapon=None, eyeGlow='#ffb03a', note='ゴーレム型（golem・crystal・snowman）。岩の大きな人型'),
    'machine': dict(headKind='box', torsoBox=True, metal=0.75, rough=0.4, metal2=0.6, bulk=1.15, weapon='cannon', pads=True, note='機械型（machine・turret・cart）。箱形の人型'),
}

QUADS = {
    'beast': dict(height=0.46, length=1.05, girth=0.22, bulk=1.0, head=0.17, tail=0.42, tailR=0.05, legw=0.05, ears=True, teeth=True, darkPaws=True, note='獣型（beast・fox・cat・ram）。四足'),
    'reptile': dict(height=0.3, length=1.1, girth=0.2, bulk=1.0, head=0.15, tail=0.7, tailR=0.08, tail3=True, tailUp=0.0, neckUp=0.08, splay=1.5, legw=0.06,
                    spikes=True, teeth=True, snoutL=1.4, snoutW=0.8, rough=0.55, note='爬虫類型（reptile・salamander・hydra・frog・turtle）。低い四足と長い尾'),
}

if __name__ == '__main__':
    want = set(sys.argv[1:])
    allk = ['slime', 'bird', 'insect', 'plant', 'fish', 'spirit'] + list(QUADS) + list(HUMANOIDS)
    for k in allk:
        if want and k not in want: continue
        if k in QUADS: quadruped(k, QUADS[k])
        elif k in HUMANOIDS: humanoid(k, HUMANOIDS[k])
        else: globals()[k]()
    print('done')
