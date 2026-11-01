# -*- coding: utf-8 -*-
"""
制作パイプラインの共通部分（Blender 側）
  ・GLB を書き出すたびに、同じ場面を .blend（圧縮）として three-src/blender/ に保存する（あとで Blender で開いて手直しできる）
  ・書き出したアセットを three-src/assets/registry.json に登録する（id・作ったスクリプト・パラメータ・.blend・GLB・アニメ・三角形数・状態）
使い方：各 build_*.py の先頭で
    import pipeline; pipeline.install(build_assets_module, script='build_xxx.py')
を呼ぶと、build_assets.export_simple が「書き出し＋保存＋登録」に置き換わる。
状態（status）：
  done      … 専用に作り込んだモデル（主人公・リナ・村人など既存の手作業調整モデル）
  provisional … 仮3D（形の共通な型から作ったもの・2D版の配色から自動生成したもの）。完成扱いにしない
"""
import bpy, os, json, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
BLEND_DIR = os.path.join(ROOT, 'blender')
REGISTRY = os.path.join(ROOT, 'assets', 'registry.json')
os.makedirs(BLEND_DIR, exist_ok=True); os.makedirs(os.path.dirname(REGISTRY), exist_ok=True)

_ctx = {'script': None, 'meta': {}, 'default': {}}

def load_registry():
    try:
        with open(REGISTRY, 'r', encoding='utf-8') as f: return json.load(f)
    except Exception:
        return {'version': 1, 'assets': {}}

def save_registry(reg):
    reg['assets'] = dict(sorted(reg['assets'].items()))
    with open(REGISTRY, 'w', encoding='utf-8') as f: json.dump(reg, f, ensure_ascii=False, indent=1)

def set_meta(**kw):
    """次に書き出すアセットの補足（kind・status・params・note など）"""
    _ctx['meta'] = kw

def set_default(**kw):
    """set_meta がないときに使う補足"""
    _ctx['default'] = kw

def scene_stats(objs):
    tris = 0; mats = set(); anims = []
    for o in objs:
        if o.type == 'MESH':
            me = o.data
            for p in me.polygons: tris += max(1, len(p.vertices) - 2)
            for m in me.materials:
                if m: mats.add(m.name)
        if o.type == 'ARMATURE' and o.animation_data:
            anims = [t.name for t in o.animation_data.nla_tracks]
    return tris, sorted(mats), anims

def install(BA, script):
    _ctx['script'] = script
    orig = BA.export_simple
    def export_and_register(name, objs=None, anim=False):
        objs_l = list(objs or list(bpy.context.scene.objects))
        tris, mats, anims = scene_stats(objs_l)
        orig(name, objs, anim)
        blend = os.path.join(BLEND_DIR, name + '.blend')
        try:
            bpy.context.preferences.filepaths.save_version = 0   # .blend1 の控えを作らない
            bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True, copy=True)
        except Exception as e:
            print('blend save failed', name, e); blend = None
        glb = os.path.join(ROOT, 'public', 'models', name + '.glb')
        meta = dict(_ctx['default']); meta.update(_ctx['meta']); _ctx['meta'] = {}
        reg = load_registry(); old = reg['assets'].get(name, {})
        entry = {
            'id': name,
            'kind': meta.get('kind', old.get('kind', 'prop')),
            'status': meta.get('status', old.get('status', 'provisional')),
            'script': 'tools/blender/' + script,
            'params': meta.get('params', old.get('params')),
            'blend': ('blender/' + name + '.blend') if blend else None,
            'glb': 'public/models/' + name + '.glb',
            'glbBytes': os.path.getsize(glb) if os.path.exists(glb) else None,
            'trisSource': tris, 'materials': mats, 'anims': anims,
            'note': meta.get('note', old.get('note', '')),
            'built': time.strftime('%Y-%m-%d')
        }
        reg['assets'][name] = entry; save_registry(reg)
    BA.export_simple = export_and_register
    return export_and_register
