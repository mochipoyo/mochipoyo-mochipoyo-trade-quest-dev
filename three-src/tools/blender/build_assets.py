# -*- coding: utf-8 -*-
"""
もちぽよFXクエスト 3D：Blender（bpy）でGLBアセットを生成する
  python3 tools/blender/build_assets.py            # すべて
  python3 tools/blender/build_assets.py hero lamp  # 指定だけ
出力：three-src/public/models/*.glb
・キャラクター：アーマチュア（17ボーン）＋スキニング（頂点ウェイトはボーン区間までの距離で自動計算）
  アニメーション9種（Idle / Walk / Run / Attack / Cast / Hit / Defend / Victory / Defeat）
・小物・樹木：静的メッシュ（ベベル・ノイズ変形・頂点カラー）
座標：Blender は Z 上・キャラクターは -Y 向き → glTF（Y 上・+Z 向き）に変換される。1 Blender 単位 = 1 タイル
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix, Quaternion, noise

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'models'))
os.makedirs(OUT, exist_ok=True)
FPS = 30
_MATS = {}

# ------------------------------------------------------------------ 共通
def reset():
    _MATS.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hexcol(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return (srgb_to_lin(r), srgb_to_lin(g), srgb_to_lin(b), 1.0)

def mat(name, color, rough=0.75, metal=0.0, emit=None, emit_strength=0.0):
    key = (name, color, rough, metal, emit, emit_strength)
    if key in _MATS: return _MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = hexcol(color)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = hexcol(emit)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    _MATS[key] = m
    _RECREATE[id(m)] = lambda: mat(name, color, rough, metal, emit, emit_strength)
    return m

def link(obj):
    bpy.context.scene.collection.objects.link(obj); return obj

def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))

_RECREATE = {}
def set_mat(obj, m):
    obj.data.materials.clear()
    try: obj.data.materials.append(m)
    except ReferenceError:   # reset() で消えたマテリアル：同じ設定で作り直す
        obj.data.materials.append(_RECREATE[id(m)]())

def smooth(obj, on=True):
    for p in obj.data.polygons: p.use_smooth = on

def modifier(obj, kind, **kw):
    md = obj.modifiers.new(kind.lower(), kind)
    for k, v in kw.items(): setattr(md, k, v)
    return md

def apply_all(obj):
    bpy.context.view_layer.objects.active = obj
    for md in list(obj.modifiers):
        if md.type == 'ARMATURE': continue
        try: bpy.ops.object.modifier_apply(modifier=md.name)
        except Exception as e: print('apply fail', obj.name, md.name, e)

def bevel(obj, w=0.01, seg=2):
    modifier(obj, 'BEVEL', width=w, segments=seg, limit_method='ANGLE')

def subsurf(obj, lv=1):
    modifier(obj, 'SUBSURF', levels=lv, render_levels=lv)

def transform(obj, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    obj.location = loc; obj.rotation_euler = rot; obj.scale = scale
    bpy.context.view_layer.update()
    obj.data.transform(obj.matrix_world); obj.matrix_world = Matrix.Identity(4)

# ---- 形状（bmesh）
def bm_sphere(center, radii, seg=20, rings=12):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * radii[0], v.co.y * radii[1], v.co.z * radii[2])) + Vector(center)
    return bm

def bm_ico(center, radius, sub=2):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=radius)
    for v in bm.verts: v.co += Vector(center)
    return bm

def bm_box(center, size):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(center)
    return bm

def bm_cyl(p0, p1, r0, r1, seg=12, cap=True):
    """p0→p1 の円錐台"""
    p0, p1 = Vector(p0), Vector(p1)
    return bm_loft([(p0, r0, r0), (p1, r1, r1)], seg, cap)

def frame_for(d):
    d = d.normalized(); ref = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 1, 0))
    u = (ref - d * ref.dot(d)).normalized(); v = d.cross(u).normalized()
    return u, v

def bm_loft(rings, seg=14, cap=True, twist=0.0):
    """rings: [(center, rx, ry)] を順に結ぶ管。各リングの向きは前後の中心から決める"""
    bm = bmesh.new(); loops = []
    n = len(rings)
    for i, (c, rx, ry) in enumerate(rings):
        c = Vector(c)
        if i == 0: d = Vector(rings[1][0]) - c
        elif i == n - 1: d = c - Vector(rings[i - 1][0])
        else: d = Vector(rings[i + 1][0]) - Vector(rings[i - 1][0])
        u, v = frame_for(d)
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg + twist
            ring.append(bm.verts.new(c + u * math.cos(a) * rx + v * math.sin(a) * ry))
        loops.append(ring)
    for i in range(n - 1):
        a, b = loops[i], loops[i + 1]
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    if cap:
        for ring, rev in ((loops[0], True), (loops[-1], False)):
            c = sum((v.co for v in ring), Vector()) / len(ring)
            cv = bm.verts.new(c)
            for k in range(seg):
                f = (ring[k], ring[(k + 1) % seg], cv)
                bm.faces.new(tuple(reversed(f)) if rev else f)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_cone(base, tip, r, seg=10):
    return bm_loft([(Vector(base), r, r), (Vector(tip), 0.0005, 0.0005)], seg, True)

def merge_bms(objs, name):
    """オブジェクトを結合（マテリアルとウェイトを保持）"""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); objs[0].name = name
    return objs[0]

def noise_displace(obj, scale=1.6, amp=0.03, seed=0):
    off = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
    for v in obj.data.vertices:
        n = noise.noise(v.co * scale + off)
        v.co += v.normal * n * amp

def vcolor(obj, fn, name='Col'):
    """頂点カラー（面コーナー）。fn(co, normal) → (r,g,b) 線形"""
    me = obj.data
    if name not in me.color_attributes: me.color_attributes.new(name=name, type='BYTE_COLOR', domain='CORNER')
    attr = me.color_attributes[name]
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; v = me.vertices[vi]
            c = fn(v.co, v.normal)
            attr.data[li].color = (c[0], c[1], c[2], 1.0)

def vmat(name, rough=0.85, metal=0.0, emit=None, emit_strength=0.0):
    """頂点カラーを使うマテリアル（glTF では COLOR_0 × baseColor）"""
    ck = ('v', name, rough, metal, emit, emit_strength)
    if ck in _MATS: return _MATS[ck]
    m = bpy.data.materials.new(name); m.use_nodes = True; _MATS[ck] = m
    nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'Col'
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = hexcol(emit); bsdf.inputs['Emission Strength'].default_value = emit_strength
    _RECREATE[id(m)] = lambda: vmat(name, rough, metal, emit, emit_strength)
    return m

def export_simple(name, objs=None, anim=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (objs or list(bpy.context.scene.objects)): o.select_set(True)
    path = os.path.join(OUT, name + '.glb')
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_animations=anim, export_skins=anim, export_yup=True)
    try: bpy.ops.export_scene.gltf(**kw, export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    print('wrote', name, os.path.getsize(path))

# ================================================================== キャラクター
# ボーン（Blender 座標、-Y 向き）。名前は glTF でもそのまま
BONES = {
    'hips':       ((0, 0, 0.36), (0, 0, 0.46), None),
    'spine':      ((0, 0, 0.46), (0, 0, 0.56), 'hips'),
    'chest':      ((0, 0, 0.56), (0, 0, 0.64), 'spine'),
    'neck':       ((0, 0, 0.64), (0, 0, 0.69), 'chest'),
    'head':       ((0, 0, 0.69), (0, 0, 1.02), 'neck'),
    'upper_arm.L': ((0.125, 0, 0.615), (0.155, 0.0, 0.475), 'chest'),
    'forearm.L':  ((0.155, 0.0, 0.475), (0.165, -0.01, 0.36), 'upper_arm.L'),
    'hand.L':     ((0.165, -0.01, 0.36), (0.168, -0.015, 0.30), 'forearm.L'),
    'upper_arm.R': ((-0.125, 0, 0.615), (-0.155, 0.0, 0.475), 'chest'),
    'forearm.R':  ((-0.155, 0.0, 0.475), (-0.165, -0.01, 0.36), 'upper_arm.R'),
    'hand.R':     ((-0.165, -0.01, 0.36), (-0.168, -0.015, 0.30), 'forearm.R'),
    'thigh.L':    ((0.068, 0, 0.36), (0.07, 0.0, 0.20), 'hips'),
    'shin.L':     ((0.07, 0.0, 0.20), (0.07, 0.005, 0.06), 'thigh.L'),
    'foot.L':     ((0.07, 0.005, 0.06), (0.07, -0.08, 0.015), 'shin.L'),
    'thigh.R':    ((-0.068, 0, 0.36), (-0.07, 0.0, 0.20), 'hips'),
    'shin.R':     ((-0.07, 0.0, 0.20), (-0.07, 0.005, 0.06), 'thigh.R'),
    'foot.R':     ((-0.07, 0.005, 0.06), (-0.07, -0.08, 0.015), 'shin.R'),
}

def make_armature(scale=1.0):
    ad = bpy.data.armatures.new('Rig'); arm = link(bpy.data.objects.new('Rig', ad))
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for name, (h, t, p) in BONES.items():
        b = ad.edit_bones.new(name); b.head = Vector(h) * scale; b.tail = Vector(t) * scale; b.roll = 0.0
        eb[name] = b
    for name, (h, t, p) in BONES.items():
        if p: eb[name].parent = eb[p]; eb[name].use_connect = (Vector(BONES[p][1]) - Vector(h)).length < 1e-4
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm

def seg_dist(p, a, b):
    ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / max(1e-9, ab.dot(ab))))
    return (p - (a + ab * t)).length

def weight_part(obj, bones, scale=1.0, power=4.0, blend=2):
    """bones: ボーン名のリスト。頂点ごとに、各ボーン区間までの距離の逆数^power で重み（上位 blend 本）"""
    segs = [(n, Vector(BONES[n][0]) * scale, Vector(BONES[n][1]) * scale) for n in bones]
    groups = {n: (obj.vertex_groups.get(n) or obj.vertex_groups.new(name=n)) for n in bones}
    for v in obj.data.vertices:
        ds = sorted(((seg_dist(v.co, a, b), n) for n, a, b in segs))[:blend]
        ws = [(1.0 / (d + 0.004) ** power, n) for d, n in ds]; s = sum(w for w, _ in ws)
        for w, n in ws: groups[n].add([v.index], w / s, 'REPLACE')

def part(bm, name, material, bones, scale=1.0, smooth_on=True, sub=0, blend=2):
    o = new_obj(name, bm); set_mat(o, material); smooth(o, smooth_on)
    if sub: subsurf(o, sub); apply_all(o)
    weight_part(o, bones, scale, blend=blend)
    return o

# ---- キャラクター定義（2D版の立ち絵を参考にした配色）
CHARS = {
    'hero': dict(skin='#f2c9a8', hair='#e0482a', hair2='#ff7a3a', hairStyle='spiky', eyes='#8a2a1a',
                 shirt='#5a6070', pants='#6a4a32', boots='#5a3a22', belt='#3a2a1a', scarf='#c8322a', cape='#b0282a',
                 armor='#c8ccd6', armorTrim='#d8a83a', weapon='sword', shield=True, tunic=False),
    'villager_m': dict(skin='#f0c8a4', hair='#7a4a26', hairStyle='short', eyes='#3a6aa8', shirt='#f0e8d8', vest='#3a5a3a',
                       pants='#4a5a7a', boots='#6a4428', belt='#5a3a1a'),
    'villager_f': dict(skin='#f4cfae', hair='#7a4426', hairStyle='long', eyes='#3a6a3a', dress='#a83a3a', shirt='#f4ecdc',
                       apron='#f6f0e2', boots='#6a4428', headband='#f6f0e2', basket=True),
    'child': dict(skin='#f4cfae', hair='#8a5a2a', hairStyle='short', eyes='#3a6aa8', shirt='#f0e8d8', vest='#3a5a8a',
                  pants='#3a5a9a', boots='#6a4428', belt='#5a3a1a', scale=0.82, shorts=True),
    'elder': dict(skin='#eec4a0', hair='#e8e4dc', hairStyle='bald', beard='#ece8e0', eyes='#4a4a4a', robe='#3a6a3a', robe2='#2a4a2a',
                  boots='#5a3a22', belt='#c8a24a', staff='wood', hunch=True),
    'priest': dict(skin='#f4cfae', hair='#e8d29a', hairStyle='short', hood='#f4f2ee', eyes='#3a5a9a', robe='#f4f2ee', robe2='#3a5aa8',
                   boots='#6a4428', belt='#d8b04a', staff='gold'),
    'merchant': dict(skin='#f0c8a4', hair='#a8743a', hairStyle='short', cap='#4a7a3a', eyes='#3a6a3a', shirt='#e8dcc4', vest='#6a8a3a',
                     pants='#5a4a32', boots='#6a4428', belt='#5a3a1a', backpack=True),
    'master': dict(skin='#eec4a0', hair='#d8dce4', hairStyle='wild', eyes='#3a4a6a', robe='#2f4f9a', robe2='#e8e0d0', fur='#e8e2d6',
                   boots='#4a3a2a', belt='#8a6a3a', hunch=False, crossArms=False),
    'innkeeper': dict(skin='#f4cfae', hair='#6a3a1a', hairStyle='bun', eyes='#5a3a2a', dress='#6a3a2a', shirt='#f4ecdc',
                      apron='#f6f0e2', boots='#5a3a22', headband='#c84a3a'),
    'lina': dict(skin='#f8d6bc', hair='#f08ab0', hair2='#ffb0cc', hairStyle='longpink', eyes='#c8323a', robe='#f8f4ee', robe2='#c8323a',
                 boots='#8a2a2a', belt='#d8a83a', staff='gold_red', hood=None, hat='#f8f4ee'),
}

def build_character(cid):
    reset(); P = CHARS[cid]; S = P.get('scale', 1.0)
    arm = make_armature(S)
    parts = []
    M = lambda key, rough=0.8, metal=0.0: mat(cid + '_' + key, P[key], rough, metal)
    skin = mat(cid + '_skin', P['skin'], 0.6)
    V = lambda x, y, z: Vector((x * S, y * S, z * S))
    long_robe = 'robe' in P or 'dress' in P

    # --- 頭・顔
    head = bm_sphere(V(0, 0, 0.865), (0.215 * S, 0.2 * S, 0.205 * S), 28, 18)
    parts.append(part(head, 'head', skin, ['head'], S))
    # 耳
    for sx in (1, -1):
        parts.append(part(bm_sphere(V(0.205 * sx, 0.01, 0.85), (0.03 * S, 0.02 * S, 0.042 * S), 10, 8), 'ear', skin, ['head'], S))
    # 目（白目・瞳・ハイライト）・眉・口・頬
    eye_dark = mat(cid + '_eye', P['eyes'], 0.3); white = mat('eye_white', '#ffffff', 0.4); black = mat('eye_black', '#1a1418', 0.3)
    for sx in (1, -1):
        parts.append(part(bm_sphere(V(0.072 * sx, -0.178, 0.845), (0.04 * S, 0.02 * S, 0.052 * S), 14, 10), 'eyew', white, ['head'], S))
        parts.append(part(bm_sphere(V(0.072 * sx, -0.193, 0.84), (0.028 * S, 0.012 * S, 0.042 * S), 12, 10), 'iris', eye_dark, ['head'], S))
        parts.append(part(bm_sphere(V(0.072 * sx, -0.2, 0.838), (0.014 * S, 0.008 * S, 0.022 * S), 10, 8), 'pupil', black, ['head'], S))
        parts.append(part(bm_sphere(V(0.062 * sx, -0.205, 0.858), (0.009 * S, 0.005 * S, 0.009 * S), 8, 6), 'hl', white, ['head'], S))
        brow = bm_box(V(0.074 * sx, -0.193, 0.9), (0.05 * S, 0.012 * S, 0.011 * S))
        bo = part(brow, 'brow', mat(cid + '_brow', P.get('beard', P['hair']) if P['hairStyle'] == 'bald' else P['hair'], 0.8), ['head'], S, False)
        if cid == 'hero': bo.rotation_euler = (0, 0.25 * sx, 0); transform(bo, rot=(0, -0.25 * sx, 0))
        parts.append(bo)
        parts.append(part(bm_sphere(V(0.12 * sx, -0.165, 0.79), (0.032 * S, 0.01 * S, 0.016 * S), 10, 6), 'cheek', mat('cheek', '#f29a8a', 0.7), ['head'], S))
    parts.append(part(bm_sphere(V(0, -0.199, 0.765), (0.026 * S, 0.01 * S, 0.008 * S), 10, 6), 'mouth', mat('mouth', '#8a3a32', 0.6), ['head'], S))
    parts.append(part(bm_sphere(V(0, -0.205, 0.805), (0.012 * S, 0.012 * S, 0.012 * S), 8, 6), 'nose', skin, ['head'], S))

    # --- 髪
    hairM = M('hair', 0.65); style = P['hairStyle']
    def hair_cap(r=0.228, front_cut=-0.06, low=0.74):
        bm = bm_sphere(V(0, 0.012, 0.88), (r * S, (r - 0.004) * S, (r - 0.01) * S), 28, 18)
        kill = [v for v in bm.verts if (v.co.z < low * S) or (v.co.y < -0.08 * S and v.co.z < 0.935 * S and abs(v.co.x) < 0.17 * S)]
        bmesh.ops.delete(bm, geom=kill, context='VERTS'); return bm
    if style in ('spiky', 'short', 'wild', 'long', 'bun', 'longpink'):
        parts.append(part(hair_cap(0.232 if style == 'spiky' else 0.226, low=0.76 if style != 'long' and style != 'longpink' else 0.72), 'haircap', hairM, ['head'], S, True))
    rnd = random.Random(hash(cid) & 0xffff)
    if style == 'spiky' or style == 'wild':
        n = 22 if style == 'spiky' else 18
        for i in range(n):
            th = rnd.uniform(-math.pi, math.pi); ph = rnd.uniform(0.15, 1.25)
            if style == 'spiky' and -0.9 < th < -0.1 and ph > 0.8: continue   # 顔の前は空ける（右前はバングで）
            d = Vector((math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)))
            if d.y < -0.55 and d.z < 0.55: continue
            base = V(0, 0.01, 0.88) + d * 0.18 * S
            tip = base + (d + Vector((0, 0.25, 0.25))).normalized() * rnd.uniform(0.13, 0.2) * S
            parts.append(part(bm_cone(base, tip, rnd.uniform(0.055, 0.075) * S, 8), 'spike', hairM, ['head'], S))
        for i in range(5):   # 前髪
            x = (-0.13 + i * 0.065)
            base = V(x, -0.15, 1.0); tip = V(x * 1.25 + rnd.uniform(-0.02, 0.02), -0.214, 0.915 - abs(x) * 0.25)
            parts.append(part(bm_cone(base, tip, 0.05 * S, 8), 'bang', hairM, ['head'], S))
    if style == 'short':
        for i in range(6):
            x = (-0.13 + i * 0.052)
            parts.append(part(bm_cone(V(x, -0.14, 1.0), V(x * 1.15, -0.205, 0.92 - abs(x) * 0.2), 0.048 * S, 8), 'bang', hairM, ['head'], S))
    if style in ('long', 'longpink', 'bun'):
        for i in range(7):
            x = (-0.15 + i * 0.05)
            parts.append(part(bm_cone(V(x, -0.14, 1.0), V(x * 1.2, -0.207, 0.915 - abs(x) * 0.2), 0.05 * S, 8), 'bang', hairM, ['head'], S))
    if style in ('long', 'longpink'):
        back = bm_loft([(V(0, 0.08, 0.92), 0.2 * S, 0.12 * S), (V(0, 0.12, 0.72), 0.2 * S, 0.1 * S), (V(0, 0.13, 0.5 if style == 'longpink' else 0.6), 0.17 * S, 0.07 * S), (V(0, 0.12, 0.42 if style == 'longpink' else 0.54), 0.12 * S, 0.04 * S)], 16)
        parts.append(part(back, 'hairback', hairM, ['head', 'neck', 'chest'], S))
        for sx in (1, -1):
            side = bm_loft([(V(0.17 * sx, -0.06, 0.86), 0.05 * S, 0.04 * S), (V(0.18 * sx, -0.07, 0.7), 0.05 * S, 0.035 * S), (V(0.16 * sx, -0.06, 0.6), 0.03 * S, 0.02 * S)], 10)
            parts.append(part(side, 'hairside', hairM, ['head', 'neck'], S))
    if style == 'bun':
        parts.append(part(bm_sphere(V(0, 0.14, 0.99), (0.09 * S, 0.085 * S, 0.085 * S), 16, 12), 'bun', hairM, ['head'], S))
    if style == 'bald':
        ring = bm_loft([(V(0, 0.02, 0.83), 0.215 * S, 0.21 * S), (V(0, 0.03, 0.9), 0.205 * S, 0.2 * S)], 24, False)
        kill = [v for v in ring.verts if v.co.y < -0.06 * S]; bmesh.ops.delete(ring, geom=kill, context='VERTS')
        parts.append(part(ring, 'hairring', hairM, ['head'], S))
    if 'beard' in P:
        bd = bm_loft([(V(0, -0.15, 0.80), 0.15 * S, 0.06 * S), (V(0, -0.17, 0.7), 0.14 * S, 0.07 * S), (V(0, -0.15, 0.58), 0.1 * S, 0.06 * S), (V(0, -0.13, 0.5), 0.02 * S, 0.02 * S)], 14)
        parts.append(part(bd, 'beard', mat(cid + '_beard', P['beard'], 0.9), ['head', 'neck', 'chest'], S))
        parts.append(part(bm_sphere(V(0, -0.2, 0.79), (0.07 * S, 0.03 * S, 0.025 * S), 12, 8), 'mustache', mat(cid + '_beard', P['beard'], 0.9), ['head'], S))
    if 'hood' in P and P['hood']:
        hd = bm_sphere(V(0, 0.02, 0.89), (0.25 * S, 0.245 * S, 0.24 * S), 24, 16)
        kill = [v for v in hd.verts if v.co.y < -0.06 * S and v.co.z < 1.02 * S]; bmesh.ops.delete(hd, geom=kill, context='VERTS')
        parts.append(part(hd, 'hood', M('hood', 0.85), ['head'], S))
    if 'cap' in P:
        parts.append(part(bm_sphere(V(0, 0.01, 0.96), (0.235 * S, 0.235 * S, 0.12 * S), 20, 12), 'cap', M('cap', 0.85), ['head'], S))
        parts.append(part(bm_box(V(0, -0.2, 0.93), (0.22 * S, 0.12 * S, 0.02 * S)), 'capbrim', M('cap', 0.85), ['head'], S, False))
    if 'hat' in P:
        hb = bm_loft([(V(0, 0.01, 0.95), 0.25 * S, 0.25 * S), (V(0, 0.01, 1.06), 0.22 * S, 0.22 * S), (V(0, 0.02, 1.1), 0.16 * S, 0.16 * S)], 20)
        parts.append(part(hb, 'hat', M('hat', 0.85), ['head'], S))
        parts.append(part(bm_box(V(0, -0.21, 1.02), (0.06 * S, 0.02 * S, 0.06 * S)), 'hatgem', mat('gem_red', '#d8323a', 0.3), ['head'], S))
    if 'headband' in P:
        hbn = bm_loft([(V(0, 0.0, 0.95), 0.235 * S, 0.225 * S), (V(0, 0.0, 0.985), 0.23 * S, 0.22 * S)], 24, False)
        parts.append(part(hbn, 'headband', M('headband', 0.8), ['head'], S))

    # --- 首・胴
    parts.append(part(bm_cyl(V(0, 0, 0.6), V(0, 0, 0.71), 0.045 * S, 0.045 * S, 12), 'neck', skin, ['neck', 'chest'], S))
    top = P.get('shirt', P.get('robe', '#888888'))
    shirtM = mat(cid + '_shirt', top, 0.85)
    torso = bm_loft([(V(0, 0.005, 0.40), 0.115 * S, 0.085 * S), (V(0, 0.0, 0.46), 0.11 * S, 0.08 * S), (V(0, 0.0, 0.53), 0.12 * S, 0.088 * S), (V(0, 0.0, 0.6), 0.135 * S, 0.095 * S), (V(0, 0.005, 0.645), 0.1 * S, 0.075 * S)], 18)
    parts.append(part(torso, 'torso', shirtM, ['hips', 'spine', 'chest'], S, sub=1))
    if 'vest' in P:
        vest = bm_loft([(V(0, 0.0, 0.43), 0.125 * S, 0.095 * S), (V(0, 0.0, 0.53), 0.128 * S, 0.096 * S), (V(0, 0.0, 0.6), 0.14 * S, 0.1 * S), (V(0, 0.005, 0.635), 0.11 * S, 0.08 * S)], 18, False)
        kill = [v for v in vest.verts if v.co.y < -0.06 * S and abs(v.co.x) < 0.045 * S]; bmesh.ops.delete(vest, geom=kill, context='VERTS')
        parts.append(part(vest, 'vest', M('vest', 0.9), ['hips', 'spine', 'chest'], S))
    # 下半身（ローブ・ドレスは長い裾。ほかはズボン）
    if long_robe:
        robeM = mat(cid + '_robe', P.get('robe', P.get('dress')), 0.9)
        skirt = bm_loft([(V(0, 0.0, 0.47), 0.118 * S, 0.088 * S), (V(0, 0.0, 0.38), 0.14 * S, 0.11 * S), (V(0, 0.005, 0.22), 0.175 * S, 0.14 * S), (V(0, 0.01, 0.05), 0.2 * S, 0.165 * S)], 22, False)
        parts.append(part(skirt, 'skirt', robeM, ['hips', 'thigh.L', 'thigh.R', 'spine'], S, blend=3))
        if 'robe2' in P:   # 縁取り
            hem = bm_loft([(V(0, 0.01, 0.075), 0.198 * S, 0.163 * S), (V(0, 0.01, 0.04), 0.206 * S, 0.17 * S)], 22, False)
            parts.append(part(hem, 'hem', M('robe2', 0.8), ['thigh.L', 'thigh.R', 'hips'], S, blend=3))
            stripe = bm_box(V(0, -0.115, 0.3), (0.05 * S, 0.06 * S, 0.5 * S))
            if cid in ('priest', 'lina', 'master'): parts.append(part(stripe, 'stripe', M('robe2', 0.8), ['hips', 'thigh.L', 'thigh.R'], S, False, blend=3))
        if 'robe' in P:   # 上着もローブ色
            jacket = bm_loft([(V(0, 0.0, 0.43), 0.122 * S, 0.092 * S), (V(0, 0.0, 0.53), 0.127 * S, 0.094 * S), (V(0, 0.0, 0.6), 0.14 * S, 0.1 * S), (V(0, 0.005, 0.64), 0.105 * S, 0.078 * S)], 18)
            parts.append(part(jacket, 'jacket', robeM, ['hips', 'spine', 'chest'], S, sub=1))
        if 'apron' in P:
            ap = bm_box(V(0, -0.135, 0.3), (0.2 * S, 0.012 * S, 0.3 * S))
            parts.append(part(ap, 'apron', M('apron', 0.9), ['hips', 'thigh.L', 'thigh.R'], S, False, blend=3))
            parts.append(part(bm_box(V(0, -0.105, 0.55), (0.15 * S, 0.012 * S, 0.12 * S)), 'apron_top', M('apron', 0.9), ['spine', 'chest'], S, False))
    pantsM = mat(cid + '_pants', P.get('pants', P.get('robe', P.get('dress', '#555555'))), 0.9)
    bootM = mat(cid + '_boots', P['boots'], 0.7)
    for sx, side in ((1, 'L'), (-1, 'R')):
        if not long_robe:
            leg = bm_loft([(V(0.07 * sx, 0, 0.41), 0.062 * S, 0.06 * S), (V(0.07 * sx, 0, 0.3), 0.056 * S, 0.055 * S), (V(0.07 * sx, 0.0, 0.2), 0.048 * S, 0.048 * S),
                           (V(0.07 * sx, 0.003, 0.14 if P.get('shorts') else 0.12), 0.044 * S, 0.044 * S)], 12)
            parts.append(part(leg, 'leg', pantsM, ['hips', 'thigh.' + side, 'shin.' + side], S))
            if P.get('shorts'):
                parts.append(part(bm_cyl(V(0.07 * sx, 0.003, 0.15), V(0.07 * sx, 0.004, 0.11), 0.034 * S, 0.033 * S, 10), 'knee', skin, ['shin.' + side], S))
        boot = bm_loft([(V(0.07 * sx, 0.004, 0.13), 0.047 * S, 0.047 * S), (V(0.07 * sx, 0.004, 0.07), 0.046 * S, 0.048 * S), (V(0.07 * sx, -0.01, 0.035), 0.05 * S, 0.06 * S),
                        (V(0.07 * sx, -0.06, 0.025), 0.045 * S, 0.03 * S), (V(0.07 * sx, -0.095, 0.022), 0.025 * S, 0.02 * S)], 12)
        parts.append(part(boot, 'boot', bootM, ['shin.' + side, 'foot.' + side], S))
        parts.append(part(bm_box(V(0.07 * sx, -0.03, 0.006), (0.1 * S, 0.17 * S, 0.012 * S)), 'sole', mat('sole', '#2a1e16', 0.9), ['foot.' + side, 'shin.' + side], S, False))
    # ベルト
    if 'belt' in P:
        belt = bm_loft([(V(0, 0.0, 0.445), 0.121 * S, 0.091 * S), (V(0, 0.0, 0.475), 0.119 * S, 0.089 * S)], 20, False)
        parts.append(part(belt, 'belt', M('belt', 0.6), ['hips', 'spine'], S))
        parts.append(part(bm_box(V(0, -0.095, 0.46), (0.045 * S, 0.012 * S, 0.035 * S)), 'buckle', mat('gold', '#d8b04a', 0.35, 0.8), ['hips', 'spine'], S, False))
    # 腕
    sleeveM = mat(cid + '_sleeve', P.get('robe', P.get('shirt', top)) if 'robe' in P else P.get('shirt', top), 0.85)
    for sx, side in ((1, 'L'), (-1, 'R')):
        ua0 = V(*BONES['upper_arm.' + side][0]); el = V(*BONES['forearm.' + side][0]); wr = V(*BONES['hand.' + side][0])
        wide = 1.5 if 'robe' in P else 1.0
        arm_bm = bm_loft([(ua0 + V(0, 0, 0.01), 0.048 * S, 0.048 * S), (ua0.lerp(el, 0.5), 0.042 * S, 0.042 * S), (el, 0.04 * S, 0.04 * S), (el.lerp(wr, 0.6), 0.038 * S * wide, 0.038 * S * wide), (wr + V(0, 0, 0.012), 0.04 * S * wide, 0.04 * S * wide)], 12)
        parts.append(part(arm_bm, 'arm', sleeveM, ['chest', 'upper_arm.' + side, 'forearm.' + side], S))
        parts.append(part(bm_sphere(V(*BONES['hand.' + side][0]) + V(0, -0.005, -0.035), (0.038 * S, 0.034 * S, 0.042 * S), 12, 10), 'hand', skin, ['hand.' + side], S))
        parts.append(part(bm_sphere(V(*BONES['hand.' + side][0]) + V(-0.022 * sx, -0.025, -0.022), (0.014 * S, 0.014 * S, 0.02 * S), 8, 6), 'thumb', skin, ['hand.' + side], S))
    # 襟の毛皮（師匠）
    if 'fur' in P:
        fur = bm_loft([(V(0, 0.01, 0.6), 0.15 * S, 0.12 * S), (V(0, 0.01, 0.66), 0.13 * S, 0.11 * S), (V(0, 0.01, 0.7), 0.08 * S, 0.07 * S)], 18)
        o = part(fur, 'fur', M('fur', 0.95), ['chest', 'neck'], S); noise_displace(o, 40, 0.01, 3); parts.append(o)
    # 主人公：鎧・マフラー・マント
    if cid == 'hero':
        armM = mat('hero_armor', P['armor'], 0.3, 0.85); trimM = mat('hero_trim', P['armorTrim'], 0.35, 0.9)
        plate = bm_sphere(V(0, -0.02, 0.555), (0.135 * S, 0.105 * S, 0.105 * S), 20, 12)
        kill = [v for v in plate.verts if v.co.y > 0.03 * S or v.co.z < 0.47 * S]; bmesh.ops.delete(plate, geom=kill, context='VERTS')
        parts.append(part(plate, 'chestplate', armM, ['spine', 'chest'], S))
        parts.append(part(bm_box(V(0, -0.115, 0.56), (0.03 * S, 0.01 * S, 0.06 * S)), 'emblem', trimM, ['chest'], S, False))
        for sx, side in ((1, 'L'), (-1, 'R')):
            pad = bm_sphere(V(0.15 * sx, 0, 0.62), (0.075 * S, 0.075 * S, 0.055 * S), 16, 10)
            kill = [v for v in pad.verts if v.co.z < 0.59 * S]; bmesh.ops.delete(pad, geom=kill, context='VERTS')
            parts.append(part(pad, 'pauldron', armM, ['upper_arm.' + side, 'chest'], S))
            parts.append(part(bm_cyl(V(0.162 * sx, -0.005, 0.44), V(0.166 * sx, -0.012, 0.37), 0.046 * S, 0.044 * S, 12), 'bracer', armM, ['forearm.' + side], S))
            parts.append(part(bm_cyl(V(0.07 * sx, -0.002, 0.135), V(0.07 * sx, -0.003, 0.1), 0.05 * S, 0.05 * S, 12), 'greave_top', trimM, ['shin.' + side], S))
            kn = bm_sphere(V(0.07 * sx, -0.045, 0.2), (0.04 * S, 0.025 * S, 0.04 * S), 10, 8)
            parts.append(part(kn, 'kneepad', armM, ['thigh.' + side, 'shin.' + side], S))
        scarf = bm_loft([(V(0, 0.005, 0.64), 0.115 * S, 0.095 * S), (V(0, 0.005, 0.69), 0.1 * S, 0.085 * S), (V(0, 0.005, 0.72), 0.075 * S, 0.068 * S)], 18)
        o = part(scarf, 'scarf', M('scarf', 0.9), ['chest', 'neck'], S); parts.append(o)
        tail = bm_loft([(V(0.05, 0.07, 0.66), 0.035 * S, 0.012 * S), (V(0.08, 0.13, 0.6), 0.04 * S, 0.012 * S), (V(0.1, 0.17, 0.5), 0.035 * S, 0.01 * S)], 8)
        parts.append(part(tail, 'scarftail', M('scarf', 0.9), ['chest', 'spine'], S))
        cape = bm_loft([(V(0, 0.07, 0.635), 0.13 * S, 0.02 * S), (V(0, 0.115, 0.5), 0.16 * S, 0.02 * S), (V(0, 0.15, 0.32), 0.19 * S, 0.02 * S), (V(0, 0.17, 0.2), 0.2 * S, 0.018 * S)], 18)
        kill = [v for v in cape.verts if v.co.y < 0.06 * S]   # 背中側の半分だけ
        parts.append(part(cape, 'cape', M('cape', 0.9), ['chest', 'spine', 'hips'], S, blend=2))

    # --- 結合・スキニング
    body = merge_bms(parts, 'Body')
    bpy.context.view_layer.objects.active = body
    body.parent = arm
    modifier(body, 'ARMATURE', object=arm)

    # --- 持ち物（ボーンの子）
    props = []
    def bone_child(obj, bone):
        obj.parent = arm; obj.parent_type = 'BONE'; obj.parent_bone = bone
        bpy.context.view_layer.update()
        b = arm.data.bones[bone]
        # ボーン末端基準の行列から、ワールド位置を保つ
        mw = arm.matrix_world @ Matrix.Translation(b.tail_local) @ b.matrix_local.to_3x3().to_4x4()
        obj.matrix_parent_inverse = mw.inverted()
        props.append(obj)
    if P.get('weapon') == 'sword':
        steel = mat('steel', '#dfe6ee', 0.22, 1.0); gold = mat('gold', '#d8b04a', 0.35, 0.8); grip = mat('grip', '#5a3220', 0.8)
        hx, hy, hz = BONES['hand.R'][0]; c = V(hx, hy - 0.01, hz - 0.035)
        sw = []
        o = new_obj('blade', bm_box((0, 0, 0.2 * S), (0.014 * S, 0.04 * S, 0.34 * S))); set_mat(o, steel); sw.append(o)
        o = new_obj('tip', bm_cone((0, 0, 0.37 * S), (0, 0, 0.42 * S), 0.022 * S, 4)); set_mat(o, steel); transform(o, rot=(0, 0, math.pi / 4), scale=(0.45, 1, 1)); sw.append(o)
        o = new_obj('guard', bm_box((0, 0, 0.025 * S), (0.03 * S, 0.14 * S, 0.022 * S))); set_mat(o, gold); sw.append(o)
        o = new_obj('grip', bm_cyl((0, 0, -0.07 * S), (0, 0, 0.015 * S), 0.016 * S, 0.016 * S, 8)); set_mat(o, grip); sw.append(o)
        o = new_obj('pommel', bm_sphere((0, 0, -0.08 * S), (0.022 * S, 0.022 * S, 0.022 * S), 10, 8)); set_mat(o, gold); sw.append(o)
        sword = merge_bms(sw, 'Sword'); smooth(sword, False)
        transform(sword, rot=(math.radians(70), 0, 0)); transform(sword, loc=c)   # 刃は前（-Y）やや上へ
        bone_child(sword, 'hand.R')
    if P.get('shield'):
        wood = mat('shield_face', '#c8ccd6', 0.35, 0.8); rim = mat('gold', '#d8b04a', 0.35, 0.8); em = mat('shield_em', '#d8a83a', 0.4, 0.8)
        bm = bm_cyl((0, 0.0, 0), (0, -0.03 * S, 0), 0.13 * S, 0.12 * S, 24); o = new_obj('shield', bm); set_mat(o, wood)
        bm2 = bm_loft([(Vector((0, -0.015 * S, 0)), 0.138 * S, 0.138 * S), (Vector((0, -0.04 * S, 0)), 0.132 * S, 0.132 * S)], 24, False); o2 = new_obj('rim', bm2); set_mat(o2, rim)
        o3 = new_obj('cross1', bm_box((0, -0.035 * S, 0), (0.025 * S, 0.012 * S, 0.17 * S))); set_mat(o3, em)
        o4 = new_obj('cross2', bm_box((0, -0.035 * S, 0.02 * S), (0.13 * S, 0.012 * S, 0.025 * S))); set_mat(o4, em)
        shield = merge_bms([o, o2, o3, o4], 'Shield'); smooth(shield, True)
        hx, hy, hz = BONES['forearm.L'][0]
        transform(shield, rot=(0, 0, math.radians(75))); transform(shield, loc=V(hx + 0.05, hy - 0.04, hz - 0.06))
        bone_child(shield, 'forearm.L')
    if P.get('staff'):
        kind = P['staff']
        shaft = mat('staff_wood', '#6a4428', 0.8) if kind == 'wood' else mat('staff_gold', '#d8b04a', 0.35, 0.85)
        parts_s = [new_obj('shaft', bm_cyl((0, 0, -0.36 * S), (0, 0, 0.5 * S), 0.014 * S, 0.012 * S, 8))]
        set_mat(parts_s[0], shaft)
        if kind == 'wood':
            o = new_obj('knob', bm_sphere((0, 0, 0.52 * S), (0.035 * S, 0.035 * S, 0.04 * S), 10, 8)); set_mat(o, mat('staff_wood', '#6a4428', 0.8)); parts_s.append(o)
        else:
            gem = mat('gem_red' if kind == 'gold_red' else 'gem_blue', '#e0323a' if kind == 'gold_red' else '#4a8ae0', 0.2, 0.0, '#e0323a' if kind == 'gold_red' else '#4a8ae0', 1.5)
            ring = bm_loft([(Vector((0, 0, 0.62 * S)), 0.07 * S, 0.07 * S), (Vector((0, 0, 0.63 * S)), 0.07 * S, 0.07 * S)], 16, False)
            o = new_obj('ring', ring); set_mat(o, shaft); transform(o, rot=(math.pi / 2, 0, 0)); o.location = (0, 0, 0)
            for v in o.data.vertices: v.co.z += 0.0
            o2 = new_obj('gem', bm_sphere((0, 0, 0.56 * S), (0.035 * S, 0.035 * S, 0.035 * S), 12, 8)); set_mat(o2, gem)
            o3 = new_obj('crown', bm_cone((0, 0, 0.5 * S), (0, 0, 0.6 * S), 0.04 * S, 6)); set_mat(o3, shaft)
            parts_s += [o2, o3]
            bpy.data.objects.remove(o)
        staff = merge_bms(parts_s, 'Staff'); smooth(staff, True)
        hx, hy, hz = BONES['hand.R'][0]
        transform(staff, loc=V(hx, hy - 0.02, hz - 0.03))
        bone_child(staff, 'hand.R')
    if P.get('basket'):
        bmb = bm_loft([(Vector((0, 0, -0.06 * S)), 0.07 * S, 0.05 * S), (Vector((0, 0, 0.02 * S)), 0.1 * S, 0.07 * S)], 14)
        o = new_obj('basket', bmb); set_mat(o, mat('basket', '#b88a4a', 0.9))
        fr = [o]
        for i, col in enumerate(['#d8402a', '#4aa83a', '#e8b02a', '#d8402a']):
            f = new_obj('fruit', bm_sphere((0.04 * S * math.cos(i * 1.6), 0.03 * S * math.sin(i * 1.6), 0.03 * S), (0.03 * S, 0.03 * S, 0.03 * S), 10, 8)); set_mat(f, mat('fruit' + str(i), col, 0.5)); fr.append(f)
        basket = merge_bms(fr, 'Basket'); smooth(basket, True)
        hx, hy, hz = BONES['hand.L'][0]
        transform(basket, loc=V(hx + 0.03, hy - 0.06, hz - 0.08))
        bone_child(basket, 'hand.L')
    if P.get('backpack'):
        o = new_obj('pack', bm_box((0, 0.13 * S, 0.53 * S), (0.2 * S, 0.12 * S, 0.24 * S))); set_mat(o, mat('pack', '#8a6a3a', 0.85)); bevel(o, 0.02 * S, 3)
        o2 = new_obj('roll', bm_cyl((-0.11 * S, 0.13 * S, 0.68 * S), (0.11 * S, 0.13 * S, 0.68 * S), 0.04 * S, 0.04 * S, 12)); set_mat(o2, mat('roll', '#4a6a3a', 0.9))
        pack = merge_bms([o, o2], 'Backpack'); smooth(pack, True)
        bone_child(pack, 'chest')

    # --- アニメーション
    make_actions(arm, S, P)
    export_simple('char_' + cid, [arm, body] + props, anim=True)

# ------------------------------------------------------------------ アニメーション
def world_rot(arm, bone, axis, ang):
    """アーマチュア空間の軸 axis まわりに ang ラジアン回すボーン局所の四元数"""
    rest = arm.data.bones[bone].matrix_local.to_quaternion()
    la = rest.inverted() @ Vector(axis)
    return Quaternion(la.normalized(), ang)

def make_actions(arm, S, P):
    arm.animation_data_create()
    X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
    bones = [b.name for b in arm.pose.bones]
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    hunch = P.get('hunch')

    def act(name, frames, keyfn, loop=True):
        a = bpy.data.actions.new(name); arm.animation_data.action = a
        for f in frames:
            pose = keyfn(f)   # {bone: [(axis, deg)], '_hips': (dx,dy,dz)}
            for b in bones:
                q = Quaternion()
                for axis, deg in pose.get(b, []): q = q @ world_rot(arm, b, axis, math.radians(deg))
                if hunch and b == 'spine': q = q @ world_rot(arm, b, X, math.radians(-10))
                if hunch and b == 'neck': q = q @ world_rot(arm, b, X, math.radians(10))
                pb = arm.pose.bones[b]; pb.rotation_quaternion = q; pb.keyframe_insert('rotation_quaternion', frame=f)
            off = pose.get('_hips', (0, 0, 0))
            hb = arm.pose.bones['hips']; rest = arm.data.bones['hips'].matrix_local.to_quaternion()
            hb.location = rest.inverted() @ Vector((off[0] * S, off[1] * S, off[2] * S)); hb.keyframe_insert('location', frame=f)
        a.use_fake_user = True
        tr = arm.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, frames[0], a)
        arm.animation_data.action = None
        return a

    FWD = -1   # X 軸まわりの負の回転で脚・腕が前（-Y）へ
    def arms_down(p, l=8, r=8):
        p.setdefault('upper_arm.L', []).append((Y, -l)); p.setdefault('upper_arm.R', []).append((Y, r))
        return p

    # Idle：呼吸と揺れ（2秒ループ）
    def idle(f):
        t = (f - 1) / 60 * 2 * math.pi; s = math.sin(t)
        p = {'spine': [(X, 1.5 * s)], 'chest': [(X, 1.0 * s)], 'head': [(X, -1.5 * s), (Z, 2 * math.sin(t * 0.5))],
             'upper_arm.L': [(X, 3 * s)], 'upper_arm.R': [(X, -3 * s)], 'forearm.L': [(X, FWD * 8)], 'forearm.R': [(X, FWD * 8)], '_hips': (0, 0, 0.004 * s)}
        return arms_down(p)
    act('Idle', list(range(1, 62, 6)), idle)

    # Walk：24フレーム
    def walk(f):
        t = (f - 1) / 24 * 2 * math.pi; s, c = math.sin(t), math.cos(t)
        p = {'thigh.L': [(X, FWD * 28 * s)], 'thigh.R': [(X, -FWD * 28 * s)],
             'shin.L': [(X, -FWD * max(0, -c) * 32 - FWD * 0)], 'shin.R': [(X, -FWD * max(0, c) * 32)],
             'foot.L': [(X, FWD * 10 * s)], 'foot.R': [(X, -FWD * 10 * s)],
             'upper_arm.L': [(X, -FWD * 24 * s)], 'upper_arm.R': [(X, FWD * 24 * s)],
             'forearm.L': [(X, FWD * (14 + 10 * max(0, -s)))], 'forearm.R': [(X, FWD * (14 + 10 * max(0, s)))],
             'spine': [(Z, 5 * s), (X, FWD * 3)], 'chest': [(Z, -4 * s)], 'head': [(Z, -2 * s)],
             '_hips': (0, 0, 0.018 * abs(c) - 0.008)}
        return arms_down(p)
    act('Walk', list(range(1, 26, 3)), walk)

    # Run：16フレーム
    def run(f):
        t = (f - 1) / 16 * 2 * math.pi; s, c = math.sin(t), math.cos(t)
        p = {'thigh.L': [(X, FWD * 46 * s)], 'thigh.R': [(X, -FWD * 46 * s)],
             'shin.L': [(X, -FWD * (20 + max(0, -c) * 70))], 'shin.R': [(X, -FWD * (20 + max(0, c) * 70))],
             'foot.L': [(X, FWD * 14 * s)], 'foot.R': [(X, -FWD * 14 * s)],
             'upper_arm.L': [(X, -FWD * 42 * s)], 'upper_arm.R': [(X, FWD * 42 * s)],
             'forearm.L': [(X, FWD * 75)], 'forearm.R': [(X, FWD * 75)],
             'spine': [(X, FWD * 12), (Z, 7 * s)], 'chest': [(Z, -6 * s)], 'head': [(X, -FWD * 6)],
             '_hips': (0, 0, 0.035 * abs(c) - 0.02)}
        return arms_down(p, 10, 10)
    act('Run', list(range(1, 18, 2)), run)

    # Attack：振りかぶって振り下ろす（30フレーム）
    def attack(f):
        k = {1: 0.0, 8: 1.0, 13: 2.0, 18: 2.2, 30: 3.0}[f]
        def lerp(a, b, t): return a + (b - a) * t
        if k <= 1: t = k; ua, fa, sp, tw = lerp(0, -150, t), lerp(15, 40, t), lerp(0, 8, t), lerp(0, 25, t)
        elif k <= 2: t = k - 1; ua, fa, sp, tw = lerp(-150, 30, t), lerp(40, 10, t), lerp(8, -14, t), lerp(25, -30, t)
        elif k <= 2.2: ua, fa, sp, tw = 30, 10, -14, -30
        else: t = k - 2.2; ua, fa, sp, tw = lerp(30, 0, t / 0.8), lerp(10, 15, t / 0.8), lerp(-14, 0, t / 0.8), lerp(-30, 0, t / 0.8)
        lunge = {1: 0, 8: -0.01, 13: 0.04, 18: 0.04, 30: 0}[f]
        p = {'upper_arm.R': [(X, -ua)], 'forearm.R': [(X, FWD * fa)],
             'spine': [(X, -FWD * sp * -1), (Z, tw)], 'chest': [(Z, tw * 0.5)],
             'upper_arm.L': [(X, FWD * 25 * (k > 0.5 and k < 2.6))], 'forearm.L': [(X, FWD * 50)],
             'thigh.L': [(X, FWD * 22 * min(1, k))], 'shin.L': [(X, -FWD * 18 * min(1, k))], 'thigh.R': [(X, -FWD * 14 * min(1, k))],
             '_hips': (0, -lunge, -0.02 * min(1, k))}
        return arms_down(p)
    act('Attack', [1, 8, 13, 18, 30], attack, loop=False)

    # Cast：両手を前へ掲げる（36フレーム）
    def cast(f):
        k = {1: 0, 10: 1, 26: 1, 36: 0}[f]; pulse = {1: 0, 10: 0, 18: 1, 26: 0, 36: 0}.get(f, 0)
        p = {'upper_arm.L': [(X, FWD * 75 * k), (Y, -15 * k)], 'upper_arm.R': [(X, FWD * 75 * k), (Y, 15 * k)],
             'forearm.L': [(X, FWD * 25 * k)], 'forearm.R': [(X, FWD * 25 * k)],
             'spine': [(X, -FWD * 6 * k)], 'head': [(X, -FWD * 8 * k)], '_hips': (0, 0, 0.01 * k)}
        return arms_down(p, 8 * (1 - k), 8 * (1 - k))
    act('Cast', [1, 10, 26, 36], cast, loop=False)

    # Hit：のけぞる（18フレーム）
    def hit(f):
        k = {1: 0, 4: 1, 10: 0.6, 18: 0}[f]
        p = {'spine': [(X, -FWD * 16 * k)], 'chest': [(X, -FWD * 8 * k)], 'head': [(X, -FWD * 14 * k), (Z, 8 * k)],
             'upper_arm.L': [(Y, -40 * k), (X, FWD * 20 * k)], 'upper_arm.R': [(Y, 40 * k), (X, FWD * 20 * k)],
             'forearm.L': [(X, FWD * 30 * k)], 'forearm.R': [(X, FWD * 30 * k)], '_hips': (0, 0.05 * k, -0.01 * k)}
        return arms_down(p)
    act('Hit', [1, 4, 10, 18], hit, loop=False)

    # Defend：身構える（ループ。20フレーム）
    def defend(f):
        s = math.sin((f - 1) / 20 * 2 * math.pi)
        p = {'thigh.L': [(X, FWD * 26), (Y, -6)], 'thigh.R': [(X, FWD * 6), (Y, 10)], 'shin.L': [(X, -FWD * 34)], 'shin.R': [(X, -FWD * 24)],
             'spine': [(X, FWD * 10)], 'upper_arm.L': [(X, FWD * 70), (Y, -20)], 'forearm.L': [(X, FWD * 60)],
             'upper_arm.R': [(X, FWD * 20)], 'forearm.R': [(X, FWD * 40)], 'head': [(X, -FWD * 6)], '_hips': (0, 0.0, -0.045 + 0.004 * s)}
        return arms_down(p)
    act('Defend', [1, 6, 11, 16, 21], defend)

    # Victory：跳んで剣を掲げる（40フレーム、最後は保持）
    def victory(f):
        jump = {1: 0, 8: -0.03, 14: 0.13, 20: 0.0, 24: -0.02, 40: 0}[f]; k = {1: 0, 8: 0.3, 14: 1, 20: 1, 24: 1, 40: 1}[f]
        p = {'upper_arm.R': [(X, FWD * 170 * k)], 'forearm.R': [(X, FWD * 10 * k)], 'upper_arm.L': [(Y, -30 * k), (X, FWD * 10 * k)], 'forearm.L': [(X, FWD * 90 * k)],
             'thigh.L': [(X, FWD * 20 * (1 if f in (8, 24) else 0))], 'thigh.R': [(X, FWD * 20 * (1 if f in (8, 24) else 0))],
             'shin.L': [(X, -FWD * 35 * (1 if f in (8, 24) else 0))], 'shin.R': [(X, -FWD * 35 * (1 if f in (8, 24) else 0))],
             'head': [(X, -FWD * 10 * k)], 'spine': [(X, -FWD * 5 * k)], '_hips': (0, 0, jump)}
        return arms_down(p)
    act('Victory', [1, 8, 14, 20, 24, 40], victory, loop=False)

    # Defeat：ひざをついて崩れる（40フレーム、最後は保持）
    def defeat(f):
        k = {1: 0, 12: 0.6, 24: 1, 40: 1}[f]
        p = {'thigh.L': [(X, FWD * 85 * k)], 'thigh.R': [(X, FWD * 70 * k)], 'shin.L': [(X, -FWD * 120 * k)], 'shin.R': [(X, -FWD * 110 * k)],
             'foot.L': [(X, FWD * 30 * k)], 'foot.R': [(X, FWD * 30 * k)],
             'spine': [(X, FWD * 30 * k)], 'chest': [(X, FWD * 12 * k)], 'head': [(X, FWD * 22 * k)],
             'upper_arm.L': [(X, FWD * 15 * k), (Y, 10)], 'upper_arm.R': [(X, FWD * 15 * k), (Y, -10)], 'forearm.L': [(X, FWD * 20 * k)], 'forearm.R': [(X, FWD * 20 * k)],
             '_hips': (0, 0.02 * k, -0.19 * k)}
        return arms_down(p)
    act('Defeat', [1, 12, 24, 40], defeat, loop=False)

# ================================================================== 小物・樹木
def wood_mat(name='wood', col='#8a5a32', rough=0.85): return mat(name, col, rough)

def build_props():
    """小物をそれぞれGLBに（実行時に InstancedMesh や複製で配置）"""
    rng = random.Random(7)
    # ---- 街灯（木の柱＋鉄の腕＋ランタン）
    reset()
    iron = mat('iron', '#3a3a42', 0.55, 0.7); wood = wood_mat('post', '#5a3a22')
    glass = mat('lantern_glow', '#ffd28a', 0.3, 0.0, '#ffb54a', 6.0)
    objs = []
    o = new_obj('post', bm_cyl((0, 0, 0), (0, 0, 2.2), 0.07, 0.055, 10)); set_mat(o, wood); objs.append(o)
    o = new_obj('base', bm_box((0, 0, 0.12), (0.24, 0.24, 0.24))); set_mat(o, mat('stone', '#8a8478', 0.95)); bevel(o, 0.03, 2); objs.append(o)
    o = new_obj('arm', bm_box((0.22, 0, 2.12), (0.46, 0.04, 0.04))); set_mat(o, iron); objs.append(o)
    o = new_obj('brace', bm_cyl((0.02, 0, 1.85), (0.3, 0, 2.1), 0.015, 0.015, 6)); set_mat(o, iron); objs.append(o)
    o = new_obj('chain', bm_cyl((0.42, 0, 2.1), (0.42, 0, 1.98), 0.01, 0.01, 6)); set_mat(o, iron); objs.append(o)
    o = new_obj('cap', bm_cone((0.42, 0, 1.96), (0.42, 0, 2.06), 0.11, 4)); set_mat(o, iron); transform(o, rot=(0, 0, 0)); objs.append(o)
    o = new_obj('glass', bm_box((0.42, 0, 1.84), (0.13, 0.13, 0.2))); set_mat(o, glass); objs.append(o)
    o = new_obj('frame', bm_box((0.42, 0, 1.73), (0.16, 0.16, 0.03))); set_mat(o, iron); objs.append(o)
    export_simple('prop_lamppost', objs)

    # ---- 壁掛けランタン
    reset()
    objs = []
    o = new_obj('bracket', bm_box((0, 0.12, 0.05), (0.03, 0.24, 0.03))); set_mat(o, iron); objs.append(o)
    o = new_obj('cap', bm_cone((0, 0.2, -0.02), (0, 0.2, 0.06), 0.08, 4)); set_mat(o, iron); objs.append(o)
    o = new_obj('glass', bm_box((0, 0.2, -0.12), (0.1, 0.1, 0.16))); set_mat(o, glass); objs.append(o)
    o = new_obj('frame', bm_box((0, 0.2, -0.21), (0.12, 0.12, 0.025))); set_mat(o, iron); objs.append(o)
    export_simple('prop_wall_lantern', objs)

    # ---- 樽
    reset()
    bm = bm_loft([((0, 0, 0), 0.24, 0.24), ((0, 0, 0.18), 0.29, 0.29), ((0, 0, 0.36), 0.3, 0.3), ((0, 0, 0.54), 0.29, 0.29), ((0, 0, 0.72), 0.24, 0.24)], 18)
    o = new_obj('barrel', bm); set_mat(o, wood_mat('barrel', '#9a6a3a')); smooth(o)
    def stave_col(co, n):
        a = math.atan2(co.y, co.x); stripe = (math.sin(a * 9) > 0.92); base = 0.55 + 0.1 * math.sin(a * 9 + 1.3)
        c = (0.42 * base, 0.24 * base, 0.11 * base)
        return (0.06, 0.06, 0.07) if abs(co.z - 0.14) < 0.03 or abs(co.z - 0.58) < 0.03 else c
    vcolor(o, stave_col); set_mat(o, vmat('barrel_v', 0.8))
    top = new_obj('lid', bm_cyl((0, 0, 0.7), (0, 0, 0.72), 0.235, 0.235, 18)); set_mat(top, wood_mat('lid', '#7a5230'))
    export_simple('prop_barrel', [o, top])

    # ---- 木箱
    reset()
    objs = []
    o = new_obj('crate', bm_box((0, 0, 0.27), (0.54, 0.54, 0.54))); set_mat(o, wood_mat('crate', '#b07a42')); bevel(o, 0.015, 1); objs.append(o)
    plank = wood_mat('plank', '#7a5228')
    for z in (0.05, 0.49):
        for (sx, sy) in ((0.56, 0.06), (0.06, 0.56)):
            o = new_obj('edge', bm_box((0, 0, z), (sx, sy, 0.06))); set_mat(o, plank); objs.append(o)
    for sxy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        o = new_obj('post', bm_box((0.25 * sxy[0], 0.25 * sxy[1], 0.27), (0.06, 0.06, 0.54))); set_mat(o, plank); objs.append(o)
    o = new_obj('diag', bm_box((0, -0.275, 0.27), (0.05, 0.02, 0.7))); set_mat(o, plank); transform(o, rot=(0, math.radians(45), 0)); objs.append(o)
    export_simple('prop_crate', objs)

    # ---- ベンチ
    reset()
    objs = []
    for x in (-0.55, 0.55):
        o = new_obj('leg', bm_box((x, 0, 0.2), (0.08, 0.36, 0.4))); set_mat(o, wood_mat('benchleg', '#5a3a22')); objs.append(o)
    for i, y in enumerate((-0.11, 0.0, 0.11)):
        o = new_obj('seat', bm_box((0, y, 0.42), (1.3, 0.1, 0.05))); set_mat(o, wood_mat('benchseat', '#a8743e')); bevel(o, 0.01, 1); objs.append(o)
    for z in (0.62, 0.76):
        o = new_obj('back', bm_box((0, 0.17, z), (1.3, 0.04, 0.09))); set_mat(o, wood_mat('benchseat', '#a8743e')); bevel(o, 0.01, 1); objs.append(o)
    for x in (-0.55, 0.55):
        o = new_obj('bpost', bm_box((x, 0.17, 0.55), (0.06, 0.05, 0.4))); set_mat(o, wood_mat('benchleg', '#5a3a22')); objs.append(o)
    export_simple('prop_bench', objs)

    # ---- 井戸（石組み＋屋根＋つるべ）
    reset()
    objs = []
    stone = vmat('well_stone_v', 0.95)
    for row in range(4):
        n = 14
        for k in range(n):
            a0 = 2 * math.pi * (k + (row % 2) * 0.5) / n
            c = Vector((math.cos(a0) * 0.62, math.sin(a0) * 0.62, 0.11 + row * 0.2))
            o = new_obj('stone', bm_box((0, 0, 0), (0.27, 0.2, 0.18))); transform(o, loc=c, rot=(0, 0, a0 + math.pi / 2), scale=(1 + rng.uniform(-0.1, 0.1), 1, 1))
            bevel(o, 0.03, 2); apply_all(o); noise_displace(o, 6, 0.012, rng.random() * 9)
            g = rng.uniform(0.42, 0.6); vcolor(o, lambda co, n, g=g: (srgb_to_lin(g * 0.95), srgb_to_lin(g * 0.92), srgb_to_lin(g * 0.86))); set_mat(o, stone); objs.append(o)
    o = new_obj('water', bm_cyl((0, 0, 0.45), (0, 0, 0.47), 0.5, 0.5, 20)); set_mat(o, mat('well_water', '#1a3a4a', 0.05)); objs.append(o)
    for x in (-0.66, 0.66):
        o = new_obj('wpost', bm_box((x, 0, 1.15), (0.1, 0.1, 1.5))); set_mat(o, wood_mat('wellwood', '#6a4428')); objs.append(o)
    o = new_obj('axle', bm_cyl((-0.66, 0, 1.55), (0.66, 0, 1.55), 0.045, 0.045, 10)); set_mat(o, wood_mat('wellwood', '#6a4428')); objs.append(o)
    roof_m = mat('well_roof', '#8a3a2a', 0.8)
    for s in (1, -1):
        o = new_obj('roof', bm_box((0, 0.36 * s, 2.02), (1.7, 0.9, 0.06))); transform(o, rot=(math.radians(-32 * s), 0, 0)); o.location = (0, 0, 0)
        for v in o.data.vertices: v.co += Vector((0, 0, 0))
        set_mat(o, roof_m); objs.append(o)
    o = new_obj('ridge', bm_cyl((-0.86, 0, 2.27), (0.86, 0, 2.27), 0.05, 0.05, 8)); set_mat(o, wood_mat('wellwood', '#6a4428')); objs.append(o)
    o = new_obj('rope', bm_cyl((0.0, 0, 1.55), (0.0, 0, 1.05), 0.01, 0.01, 6)); set_mat(o, mat('rope', '#c8a878', 0.95)); objs.append(o)
    o = new_obj('bucket', bm_loft([((0, 0, 0.9), 0.1, 0.1), ((0, 0, 1.06), 0.12, 0.12)], 12)); set_mat(o, wood_mat('bucket', '#8a5a32')); objs.append(o)
    export_simple('prop_well', objs)

    # ---- 花壇（木枠＋土＋花）
    reset()
    objs = []
    o = new_obj('box', bm_box((0, 0, 0.15), (0.9, 0.9, 0.3))); set_mat(o, wood_mat('planter', '#7a5230')); bevel(o, 0.02, 1); objs.append(o)
    o = new_obj('soil', bm_box((0, 0, 0.29), (0.8, 0.8, 0.04))); set_mat(o, mat('soil', '#4a3222', 0.95)); objs.append(o)
    leafm = mat('leaf', '#3f8a3a', 0.8)
    cols = ['#e8506a', '#f0d040', '#f4f4f8', '#a060d8', '#ff8a40']
    for i in range(14):
        x, y = rng.uniform(-0.32, 0.32), rng.uniform(-0.32, 0.32)
        o = new_obj('stem', bm_cyl((x, y, 0.3), (x, y, 0.45), 0.012, 0.01, 5)); set_mat(o, leafm); objs.append(o)
        o = new_obj('flower', bm_ico((x, y, 0.47), rng.uniform(0.045, 0.065), 1)); set_mat(o, mat('petal' + str(i % 5), cols[i % 5], 0.6)); objs.append(o)
        o = new_obj('lf', bm_sphere((x + 0.03, y, 0.36), (0.05, 0.025, 0.012), 6, 4)); set_mat(o, leafm); objs.append(o)
    export_simple('prop_flowerbed', objs)

    # ---- 柵（1タイル分：柱1本＋横木2本。実行時に向きを合わせる）
    reset()
    objs = []
    fw = wood_mat('fence', '#8a6038')
    o = new_obj('post', bm_box((-0.5, 0, 0.42), (0.1, 0.1, 0.84))); set_mat(o, fw); bevel(o, 0.015, 1); objs.append(o)
    o = new_obj('postcap', bm_cone((-0.5, 0, 0.84), (-0.5, 0, 0.92), 0.075, 4)); set_mat(o, fw); objs.append(o)
    for z in (0.32, 0.64):
        o = new_obj('rail', bm_box((0, 0, z), (1.02, 0.06, 0.09))); set_mat(o, fw); bevel(o, 0.01, 1); objs.append(o)
    export_simple('prop_fence', objs)

    # ---- 立て札
    reset()
    objs = []
    o = new_obj('post', bm_box((0, 0, 0.6), (0.1, 0.1, 1.2))); set_mat(o, wood_mat('signpost', '#5a3a22')); objs.append(o)
    o = new_obj('board', bm_box((0, -0.06, 1.05), (0.9, 0.06, 0.48))); set_mat(o, wood_mat('signboard', '#b8844a')); bevel(o, 0.02, 2); objs.append(o)
    o = new_obj('roofb', bm_box((0, -0.04, 1.35), (1.0, 0.16, 0.05))); set_mat(o, wood_mat('signpost', '#5a3a22')); objs.append(o)
    for z in (0.95, 1.05, 1.15):
        o = new_obj('line', bm_box((0, -0.095, z), (0.6, 0.01, 0.025))); set_mat(o, mat('ink', '#3a2614', 0.9)); objs.append(o)
    export_simple('prop_sign', objs)

    # ---- 畑（キャベツの列）
    reset()
    objs = []
    o = new_obj('ridge', bm_box((0, 0, 0.06), (0.96, 0.7, 0.12))); set_mat(o, mat('farm_soil', '#5a3c26', 0.98)); bevel(o, 0.05, 2); objs.append(o)
    for i in range(3):
        for j in range(2):
            x, y = -0.3 + i * 0.3, -0.15 + j * 0.3
            o = new_obj('cab', bm_ico((x, y, 0.2), 0.11, 2)); apply_all(o); noise_displace(o, 12, 0.025, i * 3 + j)
            set_mat(o, mat('cabbage', '#6aa83a', 0.7)); smooth(o); objs.append(o)
    export_simple('prop_crops', objs)

    # ---- 看板のアイコン（店の吊り看板の上に載せる）
    def icon(name, build):
        reset(); objs = build(); export_simple('icon_' + name, objs)
    def potion():
        b = new_obj('bottle', bm_loft([((0, 0, 0), 0.12, 0.12), ((0, 0, 0.14), 0.15, 0.15), ((0, 0, 0.26), 0.1, 0.1), ((0, 0, 0.32), 0.045, 0.045), ((0, 0, 0.4), 0.045, 0.045)], 16))
        set_mat(b, mat('potion_glass', '#5ad0a0', 0.15, 0.0, '#3ab080', 0.6)); smooth(b)
        c = new_obj('cork', bm_cyl((0, 0, 0.38), (0, 0, 0.45), 0.05, 0.05, 10)); set_mat(c, wood_mat('cork', '#a8743a'))
        return [b, c]
    def bed():
        f = new_obj('frame', bm_box((0, 0, 0.08), (0.42, 0.24, 0.1))); set_mat(f, wood_mat('bedf', '#7a4e26'))
        m_ = new_obj('mat', bm_box((0, 0, 0.16), (0.4, 0.22, 0.06))); set_mat(m_, mat('bedred', '#c84040', 0.8))
        p = new_obj('pillow', bm_box((-0.13, 0, 0.21), (0.12, 0.18, 0.05))); set_mat(p, mat('pillow', '#f4f4f0', 0.8))
        hb = new_obj('head', bm_box((-0.21, 0, 0.18), (0.03, 0.24, 0.22))); set_mat(hb, wood_mat('bedf', '#7a4e26'))
        return [f, m_, p, hb]
    def sword():
        b = new_obj('blade', bm_box((0, 0, 0.22), (0.03, 0.006, 0.36))); set_mat(b, mat('steel', '#dfe6ee', 0.22, 1.0))
        g = new_obj('guard', bm_box((0, 0, 0.03), (0.14, 0.02, 0.025))); set_mat(g, mat('gold', '#d8b04a', 0.35, 0.8))
        h = new_obj('grip', bm_cyl((0, 0, -0.07), (0, 0, 0.02), 0.015, 0.015, 8)); set_mat(h, mat('grip', '#5a3220', 0.8))
        return [b, g, h]
    def bell():
        b = new_obj('bell', bm_loft([((0, 0, 0), 0.14, 0.14), ((0, 0, 0.06), 0.12, 0.12), ((0, 0, 0.18), 0.08, 0.08), ((0, 0, 0.24), 0.03, 0.03)], 18)); set_mat(b, mat('gold', '#d8b04a', 0.3, 0.9)); smooth(b)
        return [b]
    def chart():
        bd = new_obj('board', bm_box((0, 0, 0.2), (0.4, 0.03, 0.32))); set_mat(bd, mat('chartbg', '#0b1226', 0.6))
        objs = [bd]
        hs = [0.08, 0.12, 0.07, 0.16, 0.2]; ys = [0.1, 0.14, 0.12, 0.17, 0.2]
        for i, (h, y) in enumerate(zip(hs, ys)):
            c = new_obj('candle', bm_box((-0.14 + i * 0.07, -0.02, y + h / 2), (0.035, 0.01, h)))
            set_mat(c, mat('up' if i % 2 == 0 else 'dn', '#4cc38a' if i % 2 == 0 else '#e5484d', 0.5, 0.0, '#4cc38a' if i % 2 == 0 else '#e5484d', 0.8)); objs.append(c)
        return objs
    def scroll():
        p = new_obj('paper', bm_box((0, 0, 0.18), (0.26, 0.02, 0.3))); set_mat(p, mat('paper', '#f0e6c8', 0.9))
        r1 = new_obj('roll1', bm_cyl((-0.15, 0, 0.34), (0.15, 0, 0.34), 0.025, 0.025, 10)); set_mat(r1, wood_mat('rollw', '#8a5a2a'))
        r2 = new_obj('roll2', bm_cyl((-0.15, 0, 0.02), (0.15, 0, 0.02), 0.025, 0.025, 10)); set_mat(r2, wood_mat('rollw', '#8a5a2a'))
        return [p, r1, r2]
    for n, f in (('potion', potion), ('bed', bed), ('sword', sword), ('bell', bell), ('chart', chart), ('scroll', scroll)): icon(n, f)

    # ---- 屋内：ベッド・テーブル（椅子つき）・カウンター・本棚・柱・クリスタル
    reset()
    objs = []
    bw = wood_mat('bedwood', '#7a4e26')
    o = new_obj('frame', bm_box((0, 0, 0.18), (0.9, 1.8, 0.24))); set_mat(o, bw); bevel(o, 0.02, 1); objs.append(o)
    o = new_obj('mattress', bm_box((0, 0.05, 0.36), (0.84, 1.66, 0.14))); set_mat(o, mat('sheet', '#f2efe6', 0.9)); bevel(o, 0.05, 3); objs.append(o)
    o = new_obj('blanket', bm_box((0, 0.28, 0.43), (0.88, 1.15, 0.06))); set_mat(o, mat('blanket', '#c84a3a', 0.9)); bevel(o, 0.03, 2); objs.append(o)
    o = new_obj('pillow', bm_box((0, -0.62, 0.46), (0.6, 0.3, 0.12))); set_mat(o, mat('pillow', '#f8f6f0', 0.9)); bevel(o, 0.05, 3); objs.append(o)
    o = new_obj('headboard', bm_box((0, -0.88, 0.5), (0.92, 0.07, 0.75))); set_mat(o, bw); bevel(o, 0.02, 2); objs.append(o)
    export_simple('furn_bed', objs)

    reset()
    objs = []
    tw = wood_mat('tablewood', '#9a6a3a')
    o = new_obj('top', bm_box((0, 0, 0.72), (0.9, 0.9, 0.07))); set_mat(o, tw); bevel(o, 0.015, 1); objs.append(o)
    for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        o = new_obj('leg', bm_box((0.36 * sx, 0.36 * sy, 0.35), (0.07, 0.07, 0.7))); set_mat(o, wood_mat('tableleg', '#6a4428')); objs.append(o)
    o = new_obj('mug', bm_cyl((0.15, 0.1, 0.76), (0.15, 0.1, 0.86), 0.04, 0.04, 10)); set_mat(o, mat('mug', '#c8a06a', 0.6)); objs.append(o)
    o = new_obj('plate', bm_cyl((-0.15, -0.1, 0.76), (-0.15, -0.1, 0.77), 0.11, 0.11, 16)); set_mat(o, mat('plate', '#f0f0f0', 0.4)); objs.append(o)
    o = new_obj('bread', bm_sphere((-0.15, -0.1, 0.8), (0.07, 0.05, 0.035), 10, 6)); set_mat(o, mat('bread', '#c8883a', 0.8)); objs.append(o)
    for sx in (1, -1):   # 椅子
        o = new_obj('seat', bm_box((0.62 * sx, 0, 0.45), (0.38, 0.38, 0.05))); set_mat(o, tw); objs.append(o)
        o = new_obj('back', bm_box((0.8 * sx, 0, 0.75), (0.04, 0.38, 0.55))); set_mat(o, tw); objs.append(o)
        for dy in (0.15, -0.15):
            for dx in (0.15, -0.15):
                o = new_obj('cleg', bm_box((0.62 * sx + dx, dy, 0.22), (0.04, 0.04, 0.44))); set_mat(o, wood_mat('tableleg', '#6a4428')); objs.append(o)
    export_simple('furn_table', objs)

    reset()
    objs = []
    o = new_obj('body', bm_box((0, 0, 0.5), (1.0, 0.7, 1.0))); set_mat(o, wood_mat('counter', '#8a5a32')); bevel(o, 0.02, 1); objs.append(o)
    o = new_obj('top', bm_box((0, 0, 1.03), (1.04, 0.78, 0.07))); set_mat(o, wood_mat('countertop', '#b07a42')); bevel(o, 0.015, 1); objs.append(o)
    for x in (-0.3, 0.3):
        o = new_obj('panel', bm_box((x, -0.36, 0.5), (0.36, 0.02, 0.7))); set_mat(o, wood_mat('counterp', '#6a4428')); objs.append(o)
    export_simple('furn_counter', objs)

    reset()
    objs = []
    o = new_obj('case', bm_box((0, 0, 1.1), (0.96, 0.45, 2.2))); set_mat(o, wood_mat('shelf', '#6a4428')); bevel(o, 0.02, 1); objs.append(o)
    bookcols = ['#8a2a2a', '#2a4a8a', '#3a6a2a', '#8a6a2a', '#5a2a6a', '#2a6a6a']
    for shelf in range(4):
        z = 0.2 + shelf * 0.5
        o = new_obj('board', bm_box((0, -0.04, z - 0.03), (0.88, 0.4, 0.04))); set_mat(o, wood_mat('shelfb', '#8a5a32')); objs.append(o)
        x = -0.4
        while x < 0.38:
            w = rng.uniform(0.04, 0.08); h = rng.uniform(0.28, 0.4)
            o = new_obj('book', bm_box((x + w / 2, -0.06, z + h / 2), (w, 0.3, h))); set_mat(o, mat('book' + str(rng.randrange(6)), bookcols[rng.randrange(6)], 0.8)); objs.append(o)
            x += w + 0.008
    export_simple('furn_bookshelf', objs)

    reset()
    objs = []
    o = new_obj('shaft', bm_cyl((0, 0, 0.1), (0, 0, 2.6), 0.2, 0.18, 16)); set_mat(o, mat('pillar', '#d8d2c4', 0.8)); smooth(o); objs.append(o)
    o = new_obj('base', bm_box((0, 0, 0.1), (0.55, 0.55, 0.2))); set_mat(o, mat('pillar', '#d8d2c4', 0.8)); bevel(o, 0.03, 2); objs.append(o)
    o = new_obj('capital', bm_box((0, 0, 2.66), (0.52, 0.52, 0.16))); set_mat(o, mat('pillar', '#d8d2c4', 0.8)); bevel(o, 0.03, 2); objs.append(o)
    export_simple('furn_pillar', objs)

    reset()
    objs = []
    o = new_obj('ped', bm_cyl((0, 0, 0), (0, 0, 0.5), 0.3, 0.24, 8)); set_mat(o, mat('ped', '#8a8a9a', 0.7)); objs.append(o)
    cr = bm_loft([((0, 0, 0.5), 0.02, 0.02), ((0, 0, 0.75), 0.16, 0.16), ((0, 0, 1.25), 0.001, 0.001)], 6)
    o = new_obj('crystal', cr); set_mat(o, mat('crystal_glow', '#7ac8ff', 0.1, 0.0, '#5ab0ff', 3.0)); objs.append(o)
    export_simple('furn_crystal', objs)

def build_trees():
    rng = random.Random(42)
    bark = vmat('bark_v', 0.95); leafv = vmat('leaf_v', 0.85)
    def bark_col(co, n):
        k = 0.8 + 0.2 * noise.noise(co * 9)
        return (srgb_to_lin(0.36 * k), srgb_to_lin(0.24 * k), srgb_to_lin(0.15 * k))
    # ---- 針葉樹（段々の円錐。縁をぎざぎざに）。lod=1 は遠景用（面を約1/3に）
    for lod in (0, 1):
      rng = random.Random(42)
      for vi in range(3):
        reset(); objs = []
        H = 3.6 + vi * 0.6
        t = new_obj('trunk', bm_cyl((0, 0, 0), (0, 0, H * 0.45), 0.16, 0.1, 10 if lod == 0 else 5)); vcolor(t, bark_col); set_mat(t, bark); objs.append(t)
        layers = 5 if lod == 0 else 4
        for i in range(layers):
            z0 = H * (0.22 + i * (0.15 if lod == 0 else 0.19)); r = (1.15 - i * (0.18 if lod == 0 else 0.22)) * (0.95 + vi * 0.05); h = H * (0.3 if lod == 0 else 0.34)
            seg = 14 if lod == 0 else 8
            bm = bmesh.new(); ring = []
            for k in range(seg):
                a = 2 * math.pi * k / seg; rr = r * (1.0 if k % 2 == 0 else 0.78) * rng.uniform(0.9, 1.08)
                zz = z0 - (0.12 if k % 2 == 0 else 0.0) * r
                ring.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, zz)))
            inner = []
            if lod == 0:
                for k in range(seg):
                    a = 2 * math.pi * (k + 0.5) / seg
                    inner.append(bm.verts.new((math.cos(a) * r * 0.5, math.sin(a) * r * 0.5, z0 + h * 0.45)))
            tip = bm.verts.new((rng.uniform(-0.04, 0.04), rng.uniform(-0.04, 0.04), z0 + h))
            for k in range(seg):
                if lod == 0:
                    bm.faces.new((ring[k], ring[(k + 1) % seg], inner[k]))
                    bm.faces.new((inner[k], ring[(k + 1) % seg], inner[(k + 1) % seg]))
                    bm.faces.new((inner[k], inner[(k + 1) % seg], tip))
                else:
                    bm.faces.new((ring[k], ring[(k + 1) % seg], tip))
            c = bm.verts.new((0, 0, z0 + 0.05));
            for k in range(seg): bm.faces.new((ring[(k + 1) % seg], ring[k], c))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            o = new_obj('layer', bm); noise_displace(o, 2.2, 0.08, vi * 10 + i)
            def lc(co, n, z0=z0, h=h):
                tz = max(0.0, min(1.0, (co.z - z0) / h)); edge = max(0.0, min(1.0, (co.xy.length) / 1.2))
                g = 0.55 + 0.35 * tz + 0.15 * edge + 0.08 * noise.noise(co * 3)
                return (srgb_to_lin(0.12 * g), srgb_to_lin(0.36 * g), srgb_to_lin(0.2 * g))
            vcolor(o, lc); set_mat(o, leafv); smooth(o, False); objs.append(o)
        export_simple('tree_pine_' + 'abc'[vi] + ('' if lod == 0 else '_lod1'), objs)
    # ---- 広葉樹（幹と枝＋ノイズで凹凸をつけた葉の塊）。lod=1 は遠景用
    for lod in (0, 1):
      rng = random.Random(4242)
      for vi in range(3):
        reset(); objs = []
        H = 2.6 + vi * 0.5
        t = new_obj('trunk', bm_loft([((0, 0, 0), 0.24, 0.24), ((0.02, 0, 0.3), 0.17, 0.17), ((0.05, 0.02, H * 0.55), 0.12, 0.12), ((0.02, 0.04, H * 0.75), 0.08, 0.08)], 12 if lod == 0 else 6))
        vcolor(t, bark_col); set_mat(t, bark); smooth(t); objs.append(t)
        for b in range(3):
            a = b * 2.1 + vi
            br = new_obj('branch', bm_cyl((0.03, 0.02, H * 0.5), (math.cos(a) * 0.7, math.sin(a) * 0.7, H * 0.78), 0.07, 0.035, 8 if lod == 0 else 4)); vcolor(br, bark_col); set_mat(br, bark); objs.append(br)
        blobs = [((0, 0, H * 0.92), 1.05)] + [((math.cos(b * 2.1 + vi) * 0.75, math.sin(b * 2.1 + vi) * 0.75, H * 0.8 + rng.uniform(-0.1, 0.15)), rng.uniform(0.65, 0.85)) for b in range(3)] + \
                [((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), H * 1.12), 0.7), ((rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5), H * 0.7), 0.55)]
        for k, (c, r) in enumerate(blobs):
            o = new_obj('leaves', bm_ico(c, r, 3 if lod == 0 else 1)); noise_displace(o, 2.6, 0.18 * r, vi * 20 + k)
            if lod == 0: noise_displace(o, 9, 0.05 * r, vi * 30 + k)
            for v in o.data.vertices: v.co.z = c[2] + (v.co.z - c[2]) * 0.82
            def lc2(co, n, c=c, r=r):
                up = max(0.0, n.z); g = 0.5 + 0.35 * up + 0.15 * noise.noise(co * 2.5) + 0.12 * ((co.z - c[2]) / r)
                return (srgb_to_lin(0.2 * g), srgb_to_lin(0.42 * g), srgb_to_lin(0.16 * g))
            vcolor(o, lc2); set_mat(o, leafv); smooth(o, True); objs.append(o)
        export_simple('tree_oak_' + 'abc'[vi] + ('' if lod == 0 else '_lod1'), objs)
    # ---- 茂み・小木
    reset(); objs = []
    for k in range(4):
        c = (rng.uniform(-0.25, 0.25), rng.uniform(-0.25, 0.25), 0.28 + rng.uniform(0, 0.1))
        o = new_obj('bush', bm_ico(c, rng.uniform(0.3, 0.42), 2)); noise_displace(o, 4, 0.08, k)
        for v in o.data.vertices: v.co.z = max(0.0, v.co.z)
        vcolor(o, lambda co, n: (srgb_to_lin(0.18 * (0.6 + 0.4 * max(0, n.z))), srgb_to_lin(0.45 * (0.6 + 0.4 * max(0, n.z))), srgb_to_lin(0.18 * (0.6 + 0.4 * max(0, n.z)))))
        set_mat(o, leafv); smooth(o); objs.append(o)
    export_simple('bush_a', objs)
    # ---- 岩
    for vi in range(2):
        reset()
        o = new_obj('rock', bm_ico((0, 0, 0.2), 0.5, 2)); noise_displace(o, 1.8, 0.16, vi + 3); noise_displace(o, 6, 0.04, vi + 7)
        for v in o.data.vertices: v.co.z = max(-0.05, v.co.z * 0.6)
        vcolor(o, lambda co, n: (srgb_to_lin(0.46 + 0.1 * max(0, n.z) + 0.05 * noise.noise(co * 4)),) * 3)
        set_mat(o, vmat('rock_v', 0.95)); smooth(o, False)
        export_simple('rock_' + 'ab'[vi], [o])

if __name__ == '__main__':
    want = set(sys.argv[1:])
    if not want or 'chars' in want or any(w in CHARS for w in want):
        for cid in CHARS:
            if want and 'chars' not in want and cid not in want: continue
            build_character(cid)
    if not want or 'props' in want: build_props()
    if not want or 'trees' in want: build_trees()
    print('done')
