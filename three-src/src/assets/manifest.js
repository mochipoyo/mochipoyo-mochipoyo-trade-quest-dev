/* =========================================================
   3D アセットの管理表（modelId → パス・拡大率・向き・足元・アニメーション・代替）
   ・キャラクターの modelId は既存のスプライトID（js/data の npc.sprite）に合わせる
   ・未制作のモデルは fallback に指定したモデルで表示し、status: 'fallback' と明示する
   ========================================================= */
export const ANIMS = ['Idle', 'Walk', 'Run', 'Attack', 'Cast', 'Hit', 'Defend', 'Victory', 'Defeat'];

const C = (id, extra) => Object.assign({ modelId: id, modelPath: 'models/char_' + id + '.glb', kind: 'character', scale: 1.0, rotationOffset: 0, footAnchor: 0, animationNames: ANIMS, lod: null, fallback: 'villager_m', status: 'done' }, extra || {});
const P = (id, file, extra) => Object.assign({ modelId: id, modelPath: 'models/' + file + '.glb', kind: 'prop', scale: 1.0, rotationOffset: 0, footAnchor: 0, animationNames: [], lod: null, fallback: null, status: 'done' }, extra || {});
// 汎用3Dワールド（Phase 1〜2）で足したモデル：起動時には読まず、使うときに読む（lazy）。状態は provisional（仮3D）＝完成扱いにしない
export const ANIMS6 = ['Idle', 'Walk', 'Attack', 'Cast', 'Hit', 'Defeat'];
const LP = (id, file, extra) => P(id, file, Object.assign({ lazy: true, status: 'provisional' }, extra || {}));
const LC = (id, extra) => C(id, Object.assign({ lazy: true, status: 'provisional' }, extra || {}));
const MON = (arch, anims) => ({ modelId: 'mon_' + arch, modelPath: 'models/mon_' + arch + '.glb', kind: 'creature', scale: 1.0, rotationOffset: 0, footAnchor: 0, animationNames: anims || ANIMS6, lod: null, fallback: null, status: 'provisional', lazy: true, archetype: arch });

// Exploration-only actors. The field key is stable across job and sprite changes.
const FIELD_SCALES = {
  lina: 1,
  kyle: 1.04,
  mina: 0.97,
  seris: 1,
  gald: 1.08,
  lucia: 1,
  elna: 1,
  nagi: 0.98,
  iris: 0.95,
  sophia: 1,
  io: 0.84,
  ganes: 1.07,
  aster: 1.03,
  ord: 1.08,
  kazuto: 1.04,
  mochipoyo: 1.0,
  ponta: 0.94,
};
export function fieldModelFor(actorId) {
  return actorId && Object.prototype.hasOwnProperty.call(FIELD_SCALES, actorId) ? 'field_' + actorId : null;   // Object.hasOwn は古い iOS Safari（15.3 以前）にないため
}
const fieldModels = Object.fromEntries(Object.entries(FIELD_SCALES).map(([actorId, scale]) => {
  const id = fieldModelFor(actorId);
  return [id, C(id, { modelPath: 'models/' + id + '.glb', scale, lazy: true,
    animationNames: ['Idle', 'Walk', 'Run'], fallback: null })];
}));

export const MODELS = {
  ...fieldModels,
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
  bush_a: P('bush_a', 'bush_a'), rock_a: P('rock_a', 'rock_a'), rock_b: P('rock_b', 'rock_b'),
  // ---- ここから Phase 1〜2 で追加（tools/blender/build_world.py・build_creatures.py・build_party.py。登録表 assets/registry.json）
  // 地域テーマの木
  tree_palm: LP('tree_palm', 'tree_palm', { lod: 'tree_palm_lod1' }), tree_palm_lod1: LP('tree_palm_lod1', 'tree_palm_lod1'),
  tree_dead: LP('tree_dead', 'tree_dead', { lod: 'tree_dead_lod1' }), tree_dead_lod1: LP('tree_dead_lod1', 'tree_dead_lod1'),
  tree_snowpine: LP('tree_snowpine', 'tree_snowpine', { lod: 'tree_snowpine_lod1' }), tree_snowpine_lod1: LP('tree_snowpine_lod1', 'tree_snowpine_lod1'),
  cactus: LP('cactus', 'prop_cactus'),
  // タイルの小物
  torch: LP('torch', 'prop_torch'), fountain: LP('fountain', 'prop_fountain'), stall: LP('stall', 'prop_stall'), stalagmite: LP('stalagmite', 'prop_stalagmite'),
  ore: LP('ore', 'prop_ore'), log: LP('log', 'prop_log'), root: LP('root', 'prop_root'), lever: LP('lever', 'prop_lever'), gate: LP('gate', 'prop_gate'),
  stairs_down: LP('stairs_down', 'prop_stairs_down'), stairs_up: LP('stairs_up', 'prop_stairs_up'), learn_rune: LP('learn_rune', 'prop_learn_rune'),
  boss_mark: LP('boss_mark', 'prop_boss_mark'), door_locked: LP('door_locked', 'prop_door_locked'), warp: LP('warp', 'prop_warp'), mushroom: LP('mushroom', 'prop_mushroom'),
  // ワールドマップの目印
  lm_village: LP('lm_village', 'lm_village', { kind: 'landmark' }), lm_castle: LP('lm_castle', 'lm_castle', { kind: 'landmark' }),
  lm_cave: LP('lm_cave', 'lm_cave', { kind: 'landmark' }), lm_tower: LP('lm_tower', 'lm_tower', { kind: 'landmark' }),
  // 乗り物（2D版 js/data/vehicles.js の id と同じ）
  veh_sailboat: LP('veh_sailboat', 'veh_sailboat', { kind: 'vehicle' }), veh_galleon: LP('veh_galleon', 'veh_galleon', { kind: 'vehicle' }), veh_airship: LP('veh_airship', 'veh_airship', { kind: 'vehicle' }),
  // 仲間・NPC（2D版の配色から自動生成。体の作り・アニメーションは主人公と同じ）
  kyle: LC('kyle'), mina: LC('mina'), seris: LC('seris'), gald: LC('gald'), lucia: LC('lucia'),
  guard: LC('guard'), king: LC('king'), scholar: LC('scholar'), sailor: LC('sailor'), bartender: LC('bartender'), shadow: LC('shadow'), hero_sage: LC('hero_sage'),
  // モンスターの型（14）。色と大きさは敵ごとに変える
  mon_slime: MON('slime'), mon_beast: MON('beast'), mon_reptile: MON('reptile'), mon_bird: MON('bird'), mon_insect: MON('insect'), mon_plant: MON('plant'),
  mon_fish: MON('fish'), mon_spirit: MON('spirit'), mon_knight: MON('knight', ANIMS), mon_undead: MON('undead', ANIMS), mon_demon: MON('demon', ANIMS),
  mon_humanoid: MON('humanoid', ANIMS), mon_golem: MON('golem', ANIMS), mon_machine: MON('machine', ANIMS)
};

// 2D版のスプライトID → 3Dモデル（未制作は近いモデルで代用）
export function characterModelFor(sprite) {
  if (MODELS[sprite] && MODELS[sprite].kind === 'character') return sprite;
  if (/^hero_/.test(sprite || '')) return 'hero';   // 主人公の職業別の配色（2D版）→ 主人公のモデル
  return 'villager_m';
}
// そのスプライトに専用（または自動生成）のモデルがあるか：'done'＝手作業で調整 / 'provisional'＝自動生成・型から / 'fallback'＝別のモデルで代用
export function characterStatus(sprite) {
  const m = MODELS[sprite]; if (m && m.kind === 'character') return m.status === 'done' ? 'done' : 'provisional';
  return 'fallback';
}

/* ---------- モンスター：2D版の敵データ（art.family・art.size・art.c）→ 型・色・大きさ ---------- */
const FAMILY_ARCH = {
  slime: 'slime', jelly: 'slime', beast: 'beast', fox: 'beast', cat: 'beast', ram: 'beast', bird: 'bird', owl: 'bird',
  reptile: 'reptile', salamander: 'reptile', hydra: 'reptile', frog: 'reptile', turtle: 'reptile', insect: 'insect', spider: 'insect', swarm: 'insect',
  plant: 'plant', cactus: 'plant', aquatic: 'fish', shark: 'fish', ray: 'fish', maw: 'fish', spirit: 'spirit', magical: 'spirit', market: 'spirit',
  mirror: 'spirit', tome: 'spirit', bell: 'spirit', golem: 'golem', crystal: 'golem', snowman: 'golem', machine: 'machine', turret: 'machine', cart: 'machine',
  knight: 'knight', undead: 'undead', demon: 'demon'
};
export const CREATURE_FAMILY_ARCH = FAMILY_ARCH;
// 表示名からの推定（推測）：通常敵164体は画像と名前が新しくなった（js/data/enemy-redesign.js）が、art.family は以前の絵のまま。
// 名前に姿を表す字があれば、それを優先する（例：朱陽の伸柱蟲 → 虫）。当てはまらなければ art.family、それもなければ人型
const NAME_ARCH = [
  [/スライム|雫|粘液/, 'slime'], [/騎士|番兵|兵|衛|近衛|槍/, 'knight'], [/鳥|鷲|鷹|梟|烏|鴎|翼獣|羽奏/, 'bird'],
  [/狼|熊|獣|猫|狐|猪|豹|羊|兎|鬣|ウルフ|ベア/, 'beast'], [/蟲|蛾|蜂|蜘蛛|蟻|蝶|甲虫|虫/, 'insect'], [/竜|龍|蛇|蜥|鰐|蛙|亀|ドラゴン|サーペント|ヒドラ/, 'reptile'],
  [/魚|鮫|鯨|貝|蛸|海月|クラゲ|鰭/, 'fish'], [/骨|屍|ゾンビ|スケルトン|リッチ/, 'undead'], [/ゴーレム|岩|石|巨像|雪だるま|結晶/, 'golem'],
  [/機|ドローン|砲|炉|歯車|装甲|ロボ/, 'machine'], [/花|草|樹|茸|蔦|サボテン|苗|葉の/, 'plant'], [/魔王|悪魔|魔人|デーモン|鬼/, 'demon'],
  [/霊|影|幽|残響|幻|ゴースト|精/, 'spirit'], [/賊|盗|徴収|大臣|術師|修験|商人/, 'humanoid']
];
export function creatureFor(def) {
  def = def || {}; const art = def.art || {}; const fam = art.family || null; const name = def.name || '';
  let arch = null, by = 'default';
  for (const [re, a] of NAME_ARCH) if (re.test(name)) { arch = a; by = 'name'; break; }
  if (!arch && fam && FAMILY_ARCH[fam]) { arch = FAMILY_ARCH[fam]; by = 'family'; }
  if (!arch) arch = 'humanoid';   // art の無い敵（盗賊・兵士・海賊など）は人型
  const c = art.c || {}; const base = c.base || c.body || '#9a9a9a';
  const size = def.boss ? 'boss' : (art.size || 'mid');
  const scale = { small: 0.78, mid: 1.0, big: 1.4, boss: 1.85 }[size] || 1.0;
  return { model: 'mon_' + arch, archetype: arch, family: fam, color: base, accent: c.accent || c.belly || null, scale, size, status: 'provisional', by, exactFamily: by !== 'default' };
}

// 3D化したマップ（Phase 1：ポヨ村と屋内6か所）。それ以外は既存の2D表示
export const MAPS_3D = ['poyo_village', 'poyo_elder_house', 'poyo_item_shop', 'poyo_inn', 'poyo_church', 'poyo_dojo', 'poyo_house'];

export const TEXTURES = ['grass', 'dirt', 'cobble', 'plaster', 'timber', 'planks', 'shingles', 'stonewall', 'carpet'];
