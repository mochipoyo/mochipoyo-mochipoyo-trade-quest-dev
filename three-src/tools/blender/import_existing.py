# -*- coding: utf-8 -*-
"""
既存のGLB（build_assets.py で以前に作ったもの）を Blender に読み込み、そのまま .blend として保存して登録表に載せる
  python3 tools/blender/import_existing.py
・既存のGLBは書き換えない（読み込むだけ）。build_assets.py を実行し直すと乱数（髪の房など）が変わるため、
  いま使っているGLBと同じ形の .blend を「手直し用のソース」として残す
・登録表（assets/registry.json）に、まだ載っていないGLBだけを status 'done'（手作業で調整した既存モデル）として追加する
"""
import bpy, os, sys, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pipeline

MODELS = os.path.join(pipeline.ROOT, 'public', 'models')

def kind_of(name):
    if name.startswith('char_'): return 'character'
    if name.startswith('tree_') or name.startswith('bush_') or name.startswith('rock_'): return 'tree'
    if name.startswith('icon_'): return 'icon'
    if name.startswith('furn_'): return 'furniture'
    return 'prop'

if __name__ == '__main__':
    reg = pipeline.load_registry(); added = []
    for fn in sorted(os.listdir(MODELS)):
        if not fn.endswith('.glb'): continue
        name = fn[:-4]
        if name in reg['assets']: continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, fn))
        objs = list(bpy.context.scene.objects); tris, mats, anims = pipeline.scene_stats(objs)
        if not anims:
            anims = sorted(a.name for a in bpy.data.actions)
        blend = os.path.join(pipeline.BLEND_DIR, name + '.blend')
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True, copy=True)
        reg = pipeline.load_registry()
        reg['assets'][name] = {
            'id': name, 'kind': kind_of(name), 'status': 'done', 'script': 'tools/blender/build_assets.py',
            'params': None, 'blend': 'blender/' + name + '.blend', 'glb': 'public/models/' + fn, 'glbBytes': os.path.getsize(os.path.join(MODELS, fn)),
            'trisSource': tris, 'materials': mats, 'anims': anims,
            'note': '以前の版で作成・手作業で調整した既存モデル。.blend は既存GLBを読み込んで保存したもの（GLBは書き換えていない）',
            'built': None, 'imported': time.strftime('%Y-%m-%d')
        }
        pipeline.save_registry(reg); added.append(name)
    print('imported', len(added), added)
