# 装備の外見の表（js/data/equip-appearance-data.js）を作る
#   python3 tools/appear/make_appearance_data.py <items.json（tools/appear/dump_items.js の出力）>
# ・装備ID ごとに：枠（weapon/armor/shield/head/acc）・形（ゲームの type から）・形の細かい違い（名前の言葉から）・配色（その品の絵 assets/item-icons/png256 の色から）・意匠
# ・名前の言葉で決めるのは「形の細かい違い」と「意匠」だけ。枠と大きな形は ITEMS の cat・type で決める（type が同じなら同じ形の仲間）
# ・ボス固有装備（bossExclusive）と、既存の絵と外形が違う品は、ID ごとに専用の形・意匠を下の OVERRIDE で決める
# ・この表にない ID（あとから足した品）は、実行時に type から形を選び、配色は ID から決める（js/rpg/equipment-appearance.js）
import json, sys, os, re
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ICON = os.path.join(ROOT, 'assets', 'item-icons', 'png256')

SLOT_OF_TYPE = {'heavy': 'armor', 'light': 'armor', 'robe': 'armor', 'shield': 'shield', 'helm': 'head', 'hat': 'head', 'acc': 'acc'}

# 形の細かい違い：type ごとに、名前に含まれる言葉 → sub（上から順に見る。どれにも当たらなければ既定）
SUB_RULES = {
  'sword': [('大剣', 'greatsword'), ('誓約剣', 'greatsword'), ('曲刀', 'saber'), ('サーベル', 'saber'), ('木の剣', 'wood')],
  'dagger': [('双剣', 'twin'), ('ナイフ', 'knife')],
  'spear': [('ハルバード', 'halberd'), ('斧槍', 'halberd'), ('三叉', 'trident'), ('傘槍', 'umbrella'), ('旗槍', 'banner'), ('時計の針', 'clockhand')],
  'axe': [('手斧', 'handaxe'), ('戦斧', 'battleaxe'), ('断鎖斧', 'battleaxe'), ('粉砕斧', 'battleaxe'), ('戦利斧', 'battleaxe')],
  'bow': [('長弓', 'longbow'), ('機巧', 'mechbow'), ('転輪', 'mechbow'), ('機鋼', 'mechbow'), ('追尾', 'mechbow'), ('監視弓', 'mechbow'), ('短弓', 'shortbow')],
  'staff': [('書杖', 'book'), ('石板', 'tablet'), ('鍵杖', 'key'), ('氷晶', 'crystal'), ('結晶', 'crystal'), ('樫', 'wood')],
  'club': [('杵', 'kine'), ('大槌', 'hammer'), ('鉄槌', 'hammer'), ('ハンマー', 'hammer'), ('槌', 'hammer'), ('メイス', 'mace'), ('鉄棍', 'rod'), ('棍棒', 'club'), ('棍', 'rod')],
  'claw': [('手甲', 'gauntlet'), ('双爪', 'twinclaw')],
  'heavy': [('鎖帷子', 'chain'), ('鱗', 'scale'), ('胸甲', 'cuirass')],
  'light': [('マント', 'cloak'), ('外套', 'cloak'), ('合羽', 'cloak'), ('コート', 'coat'), ('布の服', 'cloth'), ('上衣', 'cloth'), ('上着', 'cloth'), ('装束', 'ninja')],
  'robe': [('羽衣', 'veil'), ('ヴェール', 'veil')],
  'shield': [('大盾', 'tower'), ('小盾', 'buckler'), ('鏡盾', 'round'), ('木の盾', 'round'), ('防壁', 'barrier'), ('信号盾', 'round')],
  'helm': [('額環', 'circlet'), ('冠', 'crown'), ('竜', 'dragon')],
  'hat': [('額環', 'circlet'), ('冠', 'crown'), ('魔女帽', 'witch'), ('魔法使いの帽子', 'witch'), ('魔導帽', 'witch'), ('ターバン', 'turban'), ('頭巾', 'hood'), ('提督帽', 'bicorne'), ('羽根帽子', 'feather')],
  # 装飾品は「どこに着けるか」と小さな形（指輪・耳飾り・護符…）を名前で決める（ネックレス一律にしない）
  'acc': [('指輪', 'ring'), ('リング', 'ring'), ('耳飾り', 'earring'), ('腕輪', 'bracelet'), ('眼鏡', 'glasses'), ('レンズ', 'glasses'), ('首飾り', 'necklace'), ('ペンダント', 'necklace'), ('しずく', 'necklace'),
          ('冠', 'circlet'), ('靴飾り', 'anklet'), ('鎖', 'chain'), ('ブローチ', 'brooch'), ('徽章', 'brooch'), ('紋章', 'brooch'), ('天秤章', 'brooch'), ('監査官の印', 'brooch'), ('契約印', 'brooch'),
          ('羅針盤', 'compass'), ('コンパス', 'compass'), ('羅針石', 'compass'), ('懐中時計', 'watch'), ('天秤', 'scale'), ('ベル', 'bell'), ('鈴', 'bell'), ('ランタン', 'lantern'), ('灯', 'lantern'),
          ('駒', 'piece'), ('歯車', 'gear'), ('欠片', 'shard'), ('心核', 'shard'), ('守り石', 'shard'), ('フィルター', 'filter'), ('誓約書', 'scroll'),
          ('護符', 'amulet'), ('お守り', 'amulet'), ('守り札', 'amulet')],
}
DEFAULT_SUB = {'sword': 'sword', 'dagger': 'dagger', 'spear': 'spear', 'axe': 'axe', 'bow': 'bow', 'staff': 'staff', 'club': 'club', 'claw': 'claw',
               'heavy': 'plate', 'light': 'leather', 'robe': 'robe', 'shield': 'heater', 'helm': 'helm', 'hat': 'cap', 'acc': 'amulet'}
# 同じ系統の品に共通の意匠（名前の頭の言葉）。配色は絵から取るので、ここは模様だけ
SERIES = [('潮騒', 'wave'), ('刻針', 'clock'), ('熱砂', 'sand'), ('機鋼', 'mech'), ('凍星', 'ice'), ('竜牙', 'fang'), ('暁光', 'dawn'), ('竜', 'dragon'), ('星', 'star'), ('時', 'clock'),
          ('聖', 'holy'), ('ルーン', 'rune'), ('MACD', 'wave'), ('RCI', 'wave'), ('EMA', 'wave'), ('波形', 'wave'), ('ローソク', 'candle'), ('黄金', 'royal'), ('王', 'royal'), ('影', 'shadow'), ('虚無', 'shadow'), ('炎', 'ember'), ('火', 'ember'), ('氷', 'ice'), ('雷', 'spark')]

# ボス固有装備・既存の絵と外形が違う品：ID ごとの専用の形（sub）と意匠（deco）。glow はボス固有の光（配色は絵から）
OVERRIDE = {
  # 剣
  'ryumyaku_blade': {'sub': 'sword', 'deco': ['dragon', 'vein']}, 'captain_saber': {'sub': 'saber', 'deco': ['royal']},
  'b19_seal_justice_sword': {'sub': 'sword', 'deco': ['circuit']}, 'b19_crossroads_blade': {'sub': 'forked', 'deco': ['shadow']},
  'archeion_blade': {'sub': 'sword', 'deco': ['holy', 'gem']}, 'bu_valen_oathblade': {'sub': 'greatsword', 'deco': ['royal']}, 'bu_open_future_blade': {'sub': 'sword', 'deco': ['holy', 'gem']},
  # 短剣・槍・斧・槌・爪・弓・杖
  'b19_present_jewel_blade': {'sub': 'dagger', 'deco': ['gem']}, 'b19_two_faced_dagger': {'sub': 'dagger', 'deco': ['twotone']},
  'clock_hand_spear': {'sub': 'clockhand'}, 'b19_hold_fast_lance': {'sub': 'spear', 'deco': ['royal', 'banner']}, 'bu_urga_spear': {'sub': 'spear', 'deco': ['fang', 'wave']},
  'bu_sky_guardian_spear': {'sub': 'spear', 'deco': ['holy', 'wing']}, 'bu_tides_coral_trident': {'sub': 'trident', 'deco': ['coral', 'wave']},
  'b19_expected_value_axe': {'sub': 'axe', 'deco': ['gem']}, 'bu_garon_axe': {'sub': 'battleaxe', 'deco': ['fang']}, 'bu_zarg_chainbreaker': {'sub': 'battleaxe', 'deco': ['chain']},
  'ash_hammer': {'sub': 'hammer', 'deco': ['ember']}, 'b19_golden_kine': {'sub': 'kine', 'deco': ['royal']},
  'b19_sober_claw': {'sub': 'claw', 'deco': ['ice']}, 'bu_zarg_remnant_claw': {'sub': 'gauntlet', 'deco': ['chain']}, 'bu_greed_limit_gauntlet': {'sub': 'gauntlet', 'deco': ['royal']}, 'bu_wolf_king_claw': {'sub': 'claw', 'deco': ['fang']},
  'zero_bow': {'sub': 'bow', 'deco': ['circuit']}, 'b19_amber_memory_bow': {'sub': 'longbow', 'deco': ['leaf']}, 'bu_zaid_sand_bow': {'sub': 'bow', 'deco': ['sand']},
  'bu_drone_link_bow': {'sub': 'mechbow', 'deco': ['eye']}, 'bu_orbis_orbit_bow': {'sub': 'mechbow', 'deco': ['ring']},
  'b19_ember_tablet_staff': {'sub': 'tablet', 'deco': ['ember']}, 'starseer_staff': {'sub': 'staff', 'deco': ['star']}, 'bu_library_archive_staff': {'sub': 'book'},
  'bu_volk_forbidden_staff': {'sub': 'book', 'deco': ['shadow', 'chain']}, 'bu_crystal_resonance_staff': {'sub': 'crystal', 'deco': ['ring']}, 'bu_zero_echo_staff': {'sub': 'staff', 'deco': ['ring']},
  # 鎧・衣・兜・帽子・盾
  'b19_bronze_desire_mail': {'sub': 'plate', 'deco': ['royal']}, 'spacetime_armor': {'sub': 'plate', 'deco': ['clock', 'star']}, 'bu_greed_crystal_mail': {'sub': 'plate', 'deco': ['crystal']},
  'bu_core_barrier_mail': {'sub': 'plate', 'deco': ['circuit']}, 'bu_magma_warden_mail': {'sub': 'scale', 'deco': ['ember']}, 'bu_archive_backup_mail': {'sub': 'plate', 'deco': ['circuit']},
  'b19_bare_face_cloak': {'sub': 'cloak', 'deco': ['shadow']}, 'bu_742_memory_cloak': {'sub': 'cloak', 'deco': ['clock']},
  'mirage_veil': {'sub': 'veil', 'deco': ['sand']}, 'b19_dark_matter_veil': {'sub': 'robe', 'deco': ['star', 'shadow']}, 'b19_porcelain_robe': {'sub': 'veil', 'deco': ['crack']},
  'bu_frost_spirit_robe': {'sub': 'robe', 'deco': ['ice']}, 'bu_sevran_blank_robe': {'sub': 'robe', 'deco': ['royal']},
  'b19_rate_gauge_helm': {'sub': 'helm', 'deco': ['gauge']}, 'bu_anchor_gravity_helm': {'sub': 'helm', 'deco': ['anchor']}, 'bu_mine_captain_helm': {'sub': 'helm', 'deco': ['chain']},
  'bu_memory_keeper_helm': {'sub': 'crown', 'deco': ['gem']}, 'bu_gull_admiral_hat': {'sub': 'bicorne', 'deco': ['feather']}, 'bu_control_seal_circlet': {'sub': 'circlet', 'deco': ['gem']},
  'b19_unsmiling_aegis': {'sub': 'tower', 'deco': ['face']}, 'ancient_shield': {'sub': 'round', 'deco': ['gear']}, 'bu_ledger_shield': {'sub': 'heater', 'deco': ['book']},
  'bu_dorek_bastion': {'sub': 'tower', 'deco': ['royal']}, 'bu_fear_break_shield': {'sub': 'tower', 'deco': ['holy']}, 'bu_signal_shield': {'sub': 'round', 'deco': ['signal']},
  # 装飾品（着ける場所と小さな形）
  'iron_crown': {'sub': 'circlet'}, 'b19_silent_bell': {'sub': 'bell'}, 'b19_check_piece': {'sub': 'piece'}, 'b19_balance_star': {'sub': 'brooch', 'deco': ['star']},
  'bu_trend_compass': {'sub': 'compass'}, 'bu_ledger_core_ring': {'sub': 'ring'}, 'bu_time_guardian_watch': {'sub': 'watch'}, 'bu_observer_lens': {'sub': 'glasses'},
  'bu_soul_warden_lamp': {'sub': 'lantern'}, 'bu_hald_audit_badge': {'sub': 'brooch'}, 'bu_entangled_ring': {'sub': 'ring'}, 'bu_desire_seal_bracer': {'sub': 'bracelet'}, 'bu_fear_seal_lantern': {'sub': 'lantern'},
  'explorer_ring': {'sub': 'ring'},
}

def palette(path):
    # その品の絵の色を 6 つにまとめ、役割ごとの色を返す：[主（いちばん多い色）, 縁取り, 差し色（鮮やか）, 明るい色（刃・金属の面）, 暗い色（柄・革）]
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).reshape(-1, 4).astype(float)
    a = a[a[:, 3] > 200][:, :3]
    if len(a) < 50: return None
    W = np.array([0.299, 0.587, 0.114]); lum = a @ W; a = a[(lum > 30) & (lum < 248)]   # 輪郭の黒・強い光は除く
    rng = np.random.default_rng(1); k = 6; cent = a[rng.choice(len(a), k, replace=False)]
    for _ in range(16):
        d = ((a[:, None, :] - cent[None]) ** 2).sum(2); lab = d.argmin(1)
        cent = np.array([a[lab == i].mean(0) if (lab == i).any() else cent[i] for i in range(k)])
    cnt = np.bincount(lab, minlength=k); order = np.argsort(-cnt); C = cent[order]; share = cnt[order] / cnt.sum()
    def sat(c): mx, mn = c.max(), c.min(); return (mx - mn) / (mx + 1)
    L = C @ W; main = C[0]
    trim = next((c for c in C[1:] if abs(c @ W - main @ W) > 34 or np.abs(c - main).sum() > 120), C[1])
    big = [i for i in range(k) if share[i] >= 0.06] or [0]
    light = C[max(big, key=lambda i: L[i])]; dark = C[min(big, key=lambda i: L[i])]
    cand = [i for i in range(k) if share[i] >= 0.025]
    acc = C[max(cand, key=lambda i: sat(C[i]) * 2 + (np.abs(C[i] - main).sum()) / 500)]
    hx = lambda c: '#%02x%02x%02x' % tuple(int(max(0, min(255, round(v)))) for v in c)
    return [hx(main), hx(trim), hx(acc), hx(light), hx(dark)]

def sub_of(it):
    t = it['type'] if it['cat'] != 'weapon' else it['type']
    for word, sub in SUB_RULES.get(t, []):
        if word in it['name']: return sub
    return DEFAULT_SUB.get(t, t)

def deco_of(it):
    d = []
    for word, tag in SERIES:
        if word in it['name'] and tag not in d: d.append(tag)
    return d[:2]

def main():
    items = json.load(open(sys.argv[1], encoding='utf8')); out = {}; miss = []
    for iid, it in sorted(items.items()):
        slot = 'weapon' if it['cat'] == 'weapon' else SLOT_OF_TYPE.get(it['type'])
        if not slot: continue
        shape = it['type']
        rec = {'slot': slot, 'shape': shape, 'sub': sub_of(it), 'deco': deco_of(it)}
        p = os.path.join(ICON, iid + '.png')
        pal = palette(p) if os.path.exists(p) else None
        if pal: rec['pal'] = pal
        else: miss.append(iid)
        if it.get('boss'): rec['boss'] = 1
        ov = OVERRIDE.get(iid)
        if ov: rec.update({k: v for k, v in ov.items()})
        out[iid] = rec
    js = ('/* 装備の外見の表（tools/appear/make_appearance_data.py が作る。手で書き換えない）\n'
          '   装備ID → 枠（slot）・形（shape＝ITEMS の type）・形の細かい違い（sub）・配色（pal：主・縁取り・差し色。その品の絵の色から）・意匠（deco）・ボス固有（boss）\n'
          '   ゲームのデータ（能力・装備できる職業など）は ITEMS のまま。ここは見た目だけ */\n'
          '(function (root) { root.EQUIP_APPEARANCE_DATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '; })(typeof window !== \'undefined\' ? window : globalThis);\n')
    open(os.path.join(ROOT, 'js', 'data', 'equip-appearance-data.js'), 'w', encoding='utf8').write(js)
    from collections import Counter
    print('items', len(out), 'no icon (palette from ID at runtime):', miss)
    print(Counter((r['shape'], r['sub']) for r in out.values()))

if __name__ == '__main__': main()
