# v9.8 装備の外見（ドット絵の差分）の対応表 js/data/equip-pixels.js を書く
#   人ごとの作り方（build_hero.py・build_lina.py・build_gald.py）が assets/characters/equip-pixels/<人物ID>/actor.json を書き、
#   ここで全員分をまとめる（人ごとの作り方は、ほかの人の部品・対応表を書き換えない）
#   python3 tools/appear/pixel/manifest.py（まとめ直すだけ）
import os
import json

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
PARTS = os.path.join(ROOT, 'assets', 'characters', 'equip-pixels')
ORDER = ['hero', 'lina', 'gald', 'kyle', 'kazuto']   # 書き出す順（表の中の順。ほかの人物は名前の順で後ろ）

PLATE_REF = ['#3c3133', '#5e5054', '#837476', '#a89a98', '#e2d8cc']   # 主人公の鎧の板金の色（元の絵から）
IRON_REF = ['#262022', '#40373a', '#615657', '#8b7f7d', '#cbbfb3']    # v9.8 ガルドの重鎧・盾の鉄の色（灰色の品はこの色）

GLOBAL = {
    'version': 'v9.8.2', 'pad': 48,
    'note': '装備の外見（ドット絵の差分）。tools/appear/pixel/build_<人物ID>.py が部品を作り、manifest.py がまとめる。部品の座標は元の絵と同じ（x, y＝左上）',
    'ref': {'plate': PLATE_REF, 'iron': IRON_REF},
    # 部品の種類：装備の枠と形（ITEMS の type。帽子は形の細かい違い sub も）→ 種類。表にない形・その人に部品がない種類は「その部位だけ描かない」
    'classes': {'armor': {'light': 'armor_light', 'heavy': 'armor_heavy', 'robe': 'armor_robe'},
                'head': {'helm': 'head_helm', 'hat:witch': 'head_hat', 'hat:cap': 'head_cap'},
                'weapon': {'sword': 'weapon_sword', 'staff': 'weapon_staff', 'spear': 'weapon_spear', 'axe': 'weapon_axe'},
                'shield': {'shield': 'shield'}},
    # 種類ごとの重ね方（主人公の部品の名前）。人ごとに違う重ね方は actors.<人物ID>.materials に書く（こちらより先に使う）
    #   base＝使う素の絵（頭にかぶるとき髪を切った絵）、layers＝重ねる部品（tint＝品の色の段で塗る灰色の層）、hand＝長柄：武器の上に手を描き直す
    'materials': {
        'armor_light': {'z': 10, 'layers': [{'part': 'armor_shape_f'}, {'part': 'armor_light_t', 'tint': 'main'}]},
        'armor_heavy': {'z': 10, 'layers': [{'part': 'armor_shape_f'}, {'part': 'armor_heavy_t', 'tint': 'main', 'onlyColor': True}]},
        'armor_robe': {'z': 10, 'layers': [{'part': 'armor_robe_x', 'erase': True, 'optional': True}, {'part': 'armor_robe_t', 'tint': 'main'}, {'part': 'armor_robe_f'}]},
        'head_helm': {'z': 20, 'base': 'base_helm', 'layers': [{'part': 'head_helm_t', 'tint': 'main', 'grayRef': 'plate'}, {'part': 'head_helm_f'}]},
        'head_hat': {'z': 20, 'base': 'base_hat', 'layers': [{'part': 'head_hat_t', 'tint': 'main'}, {'part': 'head_hat_f'}]},
        'shield': {'z': 30, 'layers': [{'part': 'shield'}]},
        'weapon_sword': {'z': 40, 'layers': [{'part': 'weapon_sword'}]},
        'weapon_staff': {'z': 40, 'hand': True, 'layers': [{'part': 'weapon_staff_t', 'tint': 'orb'}, {'part': 'weapon_staff_f'}]},
        'weapon_spear': {'z': 40, 'hand': True, 'layers': [{'part': 'weapon_spear'}]},
        # v9.8.1 斧（主人公・ガルド）：柄の上に拳を描き直す／つば付きの帽子（cap 型。リーナは頭巾の形のまま品の色の頭巾）
        'weapon_axe': {'z': 40, 'hand': True, 'layers': [{'part': 'weapon_axe'}]},
        'head_cap': {'z': 20, 'layers': [{'part': 'head_cap_t', 'tint': 'main'}]},
    },
}


def actors():
    found = sorted(d for d in os.listdir(PARTS) if os.path.exists(os.path.join(PARTS, d, 'actor.json')))
    ids = [i for i in ORDER if i in found] + [i for i in found if i not in ORDER]
    return {i: json.load(open(os.path.join(PARTS, i, 'actor.json'), encoding='utf8')) for i in ids}


def manifest():
    m = dict(GLOBAL); m['actors'] = actors(); return m


def write():
    man = manifest()
    js = ('/* v9.8 装備の外見（ドット絵の差分）の対応表。tools/appear/pixel/manifest.py が作る（手で書き換えない）\n'
          '   人物ID → 向き（メニューの立ち絵 menuBase・戦闘の front/back）→ 部品（assets/characters/equip-pixels/<人物ID>/）\n'
          '   ここにない人物・向きは本人の従来の絵で表示する。部品のない装備は、その部位だけ描かない */\n'
          '(function (root) { root.EQUIP_PIXELS = ' + json.dumps(man, ensure_ascii=False, separators=(',', ':')) + '; })(typeof window === \'undefined\' ? globalThis : window);\n')
    open(os.path.join(ROOT, 'js', 'data', 'equip-pixels.js'), 'w', encoding='utf8').write(js)
    print('manifest', ', '.join('%s(%s)' % (k, ','.join(v['views'].keys())) for k, v in man['actors'].items()), len(js))
    return man


if __name__ == '__main__':
    write()
