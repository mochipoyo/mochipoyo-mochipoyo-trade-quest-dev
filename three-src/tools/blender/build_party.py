# -*- coding: utf-8 -*-
"""
もちぽよFXクエスト 3D：仲間・NPC の3Dモデルを、2D版の歩行キャラの配色（js/core/chars.js の PALS）から自動で作る
  python3 tools/blender/build_party.py            # 下の表のすべて
  python3 tools/blender/build_party.py kyle gald
・体の作りとアニメーション（17ボーン・9種）は主人公と同じ build_assets.build_character を使う
・色は 2D版のパレット（H=髪 B=服 A=差し色 L=脚 T=靴 M=帽子 E=目）から。髪型・武器は下の表で指定
・既存の手作業で調整したモデル（hero・lina・村人など10体）は作り直さない
・状態は provisional（仮3D）：2D版の配色から自動生成した段階。顔・髪型・装備の作り込みは未着手
"""
import os, sys, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_assets as BA
import pipeline

pipeline.install(BA, 'build_party.py')
HERE = os.path.dirname(os.path.abspath(__file__))
CHARS_JS = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'js', 'core', 'chars.js'))

def read_pals():
    src = open(CHARS_JS, encoding='utf-8').read()
    skin = re.search(r"var SKIN = '(#[0-9a-fA-F]{6})'", src).group(1); eye = re.search(r"EYE = '(#[0-9a-fA-F]{6})'", src).group(1)
    pals = {}
    for m in re.finditer(r"^\s*([a-z_]+): \{ (H: [^}]*)\}", src, re.M):
        d = {}
        for k, v in re.findall(r"([A-Z]): ('#[0-9a-fA-F]{6}'|SKIN|EYE)", m.group(2)):
            d[k] = skin if v == 'SKIN' else eye if v == 'EYE' else v.strip("'")
        pals[m.group(1)] = d
    return pals

# 髪型・服の形・持ち物（2D版の役割から）。色はパレットから
SHAPE = {
    # 仲間（2D版で専用の歩行キャラがある5人）
    'kyle': dict(hairStyle='short', outfit='armor', weapon='sword', shield=True, note='カイル（騎士）'),
    'mina': dict(hairStyle='long', outfit='light', scarf=True, note='ミナ（盗賊）'),
    'seris': dict(hairStyle='long', outfit='robe', staff='gold', note='セリス（魔法使い）'),
    'gald': dict(hairStyle='wild', outfit='light', weapon='sword', note='ガルド（戦士）'),
    'lucia': dict(hairStyle='long', outfit='light', weapon='sword', note='ルシア（波刃士）'),
    # NPC（3Dモデルが無く、村人で代用していた見た目）。エルナ・ナギ・イーリス・ソフィア・イオ・ガネス・アステル・オルドの2D版の見た目もこれら
    'guard': dict(hairStyle='short', outfit='armor', weapon='sword', shield=True, cap=True, note='衛兵（guard）。仲間オルドの2D版の見た目'),
    'king': dict(hairStyle='short', outfit='robe', staff='gold', crown=True, note='王（king）'),
    'scholar': dict(hairStyle='short', outfit='robe', note='学者（scholar）。仲間エルナの2D版の見た目'),
    'sailor': dict(hairStyle='short', outfit='light', cap=True, note='船乗り（sailor）。仲間ナギの2D版の見た目'),
    'bartender': dict(hairStyle='short', outfit='light', note='酒場の主人（bartender）'),
    'shadow': dict(hairStyle='bald', outfit='robe', hood=True, note='影（shadow）'),
    'hero_sage': dict(hairStyle='long', outfit='robe', staff='wood', note='賢者の主人公の配色（hero_sage）。仲間アステルの2D版の見た目'),
}

def params_for(cid, pal, shape):
    P = dict(skin=pal.get('F', '#f3c9a0'), hair=pal['H'], hairStyle=shape['hairStyle'], eyes=pal.get('E', '#1b1b2a'), boots=pal.get('T', '#4a2e1a'))
    o = shape['outfit']
    if o == 'robe':
        P.update(robe=pal['B'], robe2=pal['A'], belt=pal['A'])
    elif o == 'armor':
        P.update(shirt=pal['B'], vest=pal['A'], pants=pal['L'], belt='#4a3a2a')
    else:
        P.update(shirt=pal['B'], vest=pal['A'], pants=pal['L'], belt=pal['A'])
    if shape.get('weapon'): P['weapon'] = shape['weapon']
    if shape.get('shield'): P['shield'] = True
    if shape.get('staff'): P['staff'] = shape['staff']
    if pal.get('M') and o == 'robe': P['hat'] = pal['M']
    if shape.get('cap'): P['cap'] = pal['A'] if o != 'armor' else pal['B']
    if shape.get('hood'): P['hood'] = pal['B']
    if shape.get('scarf'): P['headband'] = pal['A']
    if shape.get('crown'): P['headband'] = '#ffd24a'
    return P

if __name__ == '__main__':
    want = set(sys.argv[1:]); pals = read_pals(); built = []
    for cid, shape in SHAPE.items():
        if want and cid not in want: continue
        if cid in ('hero', 'lina', 'villager_m', 'villager_f', 'child', 'elder', 'priest', 'merchant', 'master', 'innkeeper'): continue   # 既存（手作業）
        pal = pals.get(cid)
        if not pal: print('パレットなし', cid); continue
        P = params_for(cid, pal, shape); BA.CHARS[cid] = P
        pipeline.set_default(kind='character', status='provisional', params=P, note=shape['note'] + '。2D版の配色から自動生成')
        BA.build_character(cid); built.append(cid)
    print('built', built)
