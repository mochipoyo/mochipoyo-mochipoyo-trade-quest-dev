/* =========================================================
   3D アセットの管理表（modelId → パス・拡大率・向き・足元・アニメーション・代替）
   ・キャラクターの modelId は既存のスプライトID（js/data の npc.sprite）に合わせる
   ・未制作のモデルは fallback に指定したモデルで表示し、status: 'fallback' と明示する
   ========================================================= */
export const ANIMS = ['Idle', 'Walk', 'Run', 'Attack', 'Cast', 'Hit', 'Defend', 'Victory', 'Defeat'];

const C = (id, extra) => Object.assign({ modelId: id, modelPath: 'models/char_' + id + '.glb', kind: 'character', scale: 1.0, rotationOffset: 0, footAnchor: 0, animationNames: ANIMS, lod: null, fallback: 'villager_m', status: 'done' }, extra || {});
const P = (id, file, extra) => Object.assign({ modelId: id, modelPath: 'models/' + file + '.glb', kind: 'prop', scale: 1.0, rotationOffset: 0, footAnchor: 0, animationNames: [], lod: null, fallback: null, status: 'done' }, extra || {});

export const MODELS = {
  // キャラクター（Blender で生成：アーマチュア17ボーン＋スキニング＋アニメーション9種）
  hero: C('hero', { fallback: null }),
  villager_m: C('villager_m', { fallback: null }),
  villager_f: C('villager_f'),
  child: C('child'),
  elder: C('elder'),
  priest: C('priest'),
  merchant: C('merchant'),
  master: C('master'),
  innkeeper: C('innkeeper'),
  lina: C('lina'),
  // 小物
  lamppost: P('lamppost', 'prop_lamppost'),
  wall_lantern: P('wall_lantern', 'prop_wall_lantern'),
  barrel: P('barrel', 'prop_barrel'),
  crate: P('crate', 'prop_crate'),
  bench: P('bench', 'prop_bench'),
  well: P('well', 'prop_well'),
  flowerbed: P('flowerbed', 'prop_flowerbed'),
  fence: P('fence', 'prop_fence'),
  sign: P('sign', 'prop_sign'),
  crops: P('crops', 'prop_crops'),
  icon_potion: P('icon_potion', 'icon_potion'), icon_bed: P('icon_bed', 'icon_bed'), icon_sword: P('icon_sword', 'icon_sword'),
  icon_bell: P('icon_bell', 'icon_bell'), icon_chart: P('icon_chart', 'icon_chart'), icon_scroll: P('icon_scroll', 'icon_scroll'),
  furn_bed: P('furn_bed', 'furn_bed'), furn_table: P('furn_table', 'furn_table'), furn_counter: P('furn_counter', 'furn_counter'),
  furn_bookshelf: P('furn_bookshelf', 'furn_bookshelf'), furn_pillar: P('furn_pillar', 'furn_pillar'), furn_crystal: P('furn_crystal', 'furn_crystal'),
  // 樹木・岩
  tree_pine_a: P('tree_pine_a', 'tree_pine_a', { lod: 'tree_pine_a_lod1' }), tree_pine_b: P('tree_pine_b', 'tree_pine_b', { lod: 'tree_pine_b_lod1' }), tree_pine_c: P('tree_pine_c', 'tree_pine_c', { lod: 'tree_pine_c_lod1' }),
  tree_oak_a: P('tree_oak_a', 'tree_oak_a', { lod: 'tree_oak_a_lod1' }), tree_oak_b: P('tree_oak_b', 'tree_oak_b', { lod: 'tree_oak_b_lod1' }), tree_oak_c: P('tree_oak_c', 'tree_oak_c', { lod: 'tree_oak_c_lod1' }),
  tree_pine_a_lod1: P('tree_pine_a_lod1', 'tree_pine_a_lod1'), tree_pine_b_lod1: P('tree_pine_b_lod1', 'tree_pine_b_lod1'), tree_pine_c_lod1: P('tree_pine_c_lod1', 'tree_pine_c_lod1'),
  tree_oak_a_lod1: P('tree_oak_a_lod1', 'tree_oak_a_lod1'), tree_oak_b_lod1: P('tree_oak_b_lod1', 'tree_oak_b_lod1'), tree_oak_c_lod1: P('tree_oak_c_lod1', 'tree_oak_c_lod1'),
  bush_a: P('bush_a', 'bush_a'), rock_a: P('rock_a', 'rock_a'), rock_b: P('rock_b', 'rock_b')
};

// 2D版のスプライトID → 3Dモデル（未制作は近いモデルで代用）
export function characterModelFor(sprite) {
  if (MODELS[sprite] && MODELS[sprite].kind === 'character') return sprite;
  const map = { bartender: 'innkeeper', guard: 'villager_m', king: 'elder', sailor: 'villager_m', scholar: 'elder', shadow: 'priest' };
  return map[sprite] || 'villager_m';
}

// 3D化したマップ（Phase 1：ポヨ村と屋内6か所）。それ以外は既存の2D表示
export const MAPS_3D = ['poyo_village', 'poyo_elder_house', 'poyo_item_shop', 'poyo_inn', 'poyo_church', 'poyo_dojo', 'poyo_house'];

export const TEXTURES = ['grass', 'dirt', 'cobble', 'plaster', 'timber', 'planks', 'shingles', 'stonewall', 'carpet'];
