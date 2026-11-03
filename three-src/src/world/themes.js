/* =========================================================
   地域テーマ（Phase 1 汎用3Dワールド）
   ・地域（12）は2D版の戦闘背景と同じ BattleBG65.regionOf(mapId)、場所の種類（14）は BattleBG65.placeOf(mapId, kind)
   ・テーマは「色・木の種類・壁の材質・霧と空の色」だけを決める。地形の形はタイル（2D版のマップ）から作る
   ・ここに無い地域・場所は arcadia／grassland の値で表示する（2D版の色に合わせた仮の値。必要に応じて調整）
   ========================================================= */

// 地域ごとの基本色
const REGION = {
  arcadia: { grass: '#d8e8b0', tree: ['pine', 'oak'], water: '#2f6f9f', deep: '#1a3f6a', rock: '#9a948a', snowCap: true, fog: null, plaster: '#fff6e6', roof: null },
  grania: { grass: '#d0d8a0', tree: ['pine', 'oak'], water: '#356a8a', deep: '#1d3d5a', rock: '#8a7a6a', snowCap: false, fog: '#c8bca8', plaster: '#efe2cc', roof: '#7a5a3a' },
  kalion: { grass: '#e0eca8', tree: ['oak', 'pine'], water: '#3a7aa8', deep: '#1f4a78', rock: '#a09a8a', snowCap: true, fog: null, plaster: '#fff2dc', roof: '#8a3a3a' },
  islands: { grass: '#d8f0b0', tree: ['palm', 'oak'], water: '#2a8aa8', deep: '#164a7a', rock: '#a8a090', snowCap: false, fog: '#bcd8e8', plaster: '#fffaf0', roof: '#3a7a9a' },
  tempus: { grass: '#d8e8c0', tree: ['oak', 'pine'], water: '#3a6aa0', deep: '#1c3a6a', rock: '#b0a898', snowCap: true, fog: '#d0d0e0', plaster: '#f4f0e8', roof: '#5a5a8a' },
  machine: { grass: '#c8d0b0', tree: ['pine'], water: '#3a5a6a', deep: '#1a2c3a', rock: '#7a7a80', snowCap: false, fog: '#a8acb0', plaster: '#d8dce0', roof: '#4a5a6a' },
  magicka: { grass: '#d8d8c8', tree: ['oak', 'pine'], water: '#4a4a9a', deep: '#22205a', rock: '#8a80a0', snowCap: false, fog: '#c0b0d8', plaster: '#ece4f4', roof: '#6a3a8a' },
  sky: { grass: '#e0f0c0', tree: ['oak'], water: '#6aa8d8', deep: '#3a78b0', rock: '#c8c8d0', snowCap: false, fog: '#e0ecf8', plaster: '#ffffff', roof: '#4a7ab8', cloud: true },
  dark: { grass: '#8a8098', tree: ['dead'], water: '#2a2a40', deep: '#141424', rock: '#4a4450', snowCap: false, fog: '#3a2a48', plaster: '#8a8090', roof: '#3a2a40', dim: 0.55 },
  desert: { grass: '#d8d0a0', tree: ['palm'], water: '#3a8aa0', deep: '#1a4a6a', rock: '#c09a6a', snowCap: false, fog: '#e8d0a8', plaster: '#f0dcb8', roof: '#b07a4a' },
  dragon: { grass: '#a8a080', tree: ['dead'], water: '#3a4a5a', deep: '#1a2430', rock: '#5a4a44', snowCap: false, fog: '#7a4a3a', plaster: '#c8b8a8', roof: '#6a2a1a', lava: true, dim: 0.8 },
  snow: { grass: '#e8f0f4', tree: ['snowpine'], water: '#4a7aa0', deep: '#24486a', rock: '#a8b0b8', snowCap: true, fog: '#e4ecf4', plaster: '#f8f8fc', roof: '#5a6a8a' }
};

// タイルの地面の色（地形タイル → 色。草は地域の色）
const GROUND = {
  sand: '#e8d4a0', snow: '#f4f8fc', ash: '#7a7470', darkland: '#5a5068', slag: '#3a302c', cave_floor: '#8a7a6a', moss: '#7a9a5a',
  road: '#b89a72', stone: '#c8c0b0', path_stone: '#c0b4a0', floor_stone: '#b8b0a4', floor_wood: '#b08860', carpet: '#a04040',
  dock: '#9a7a52', bridge: '#9a7a52', crops: '#8a6a4a', hill: null, grass: null, grass2: null, forest: null, tree: null
};

// 場所の種類ごとの屋内・ダンジョンの材質
const PLACE = {
  cave: { wall: 'rock', wallTint: '#8a7a6a', floor: '#7a6a5a', light: 0.45, torch: true },
  mine: { wall: 'rock', wallTint: '#7a6a58', floor: '#6a5a4a', light: 0.45, torch: true, beams: true },
  castle: { wall: 'stone', wallTint: '#c8c0b4', floor: '#a8a094', light: 0.7, torch: true },
  forest: { wall: 'trees', wallTint: '#5a7a4a', floor: '#6a7a4a', light: 0.62, torch: false, outdoor: true },
  grassland: { wall: 'rock', wallTint: '#9a948a', floor: '#8a9a6a', light: 0.85, outdoor: true },
  volcano: { wall: 'rock', wallTint: '#5a4038', floor: '#5a3a30', light: 0.55, torch: true, lava: true },
  sea: { wall: 'rock', wallTint: '#4a7a8a', floor: '#5a8a8a', light: 0.5, torch: true, tint: '#7ab8d8' },
  harbor: { wall: 'wood', wallTint: '#9a7a52', floor: '#8a6a4a', light: 0.75, torch: true },
  sky: { wall: 'stone', wallTint: '#e8ecf4', floor: '#d8e0ec', light: 0.95, outdoor: true },
  dark: { wall: 'stone', wallTint: '#4a4058', floor: '#3a3448', light: 0.42, torch: true, tint: '#8a6ab8' },
  machine_city: { wall: 'metal', wallTint: '#8a9098', floor: '#6a7078', light: 0.7, torch: false, glow: '#4ad8ff' },
  magic_city: { wall: 'stone', wallTint: '#b0a0c8', floor: '#8a7aa0', light: 0.7, torch: true, glow: '#c08aff' },
  desert: { wall: 'stone', wallTint: '#d0b088', floor: '#c8a878', light: 0.8, torch: true },
  snow: { wall: 'rock', wallTint: '#c8d4e0', floor: '#d8e4ec', light: 0.8, torch: true }
};

export function themeFor(map) {
  const BG = window.BattleBG65; const id = map.id;
  let region = 'arcadia', place = 'grassland';
  try { if (BG && BG.regionOf) region = BG.regionOf(id) || 'arcadia'; } catch (e) { /* 既定値 */ }
  try { if (BG && BG.placeOf) place = BG.placeOf(id, map.kind) || 'grassland'; } catch (e) { /* 既定値 */ }
  const ov = map.def && map.def.theme3d; if (ov) { if (ov.region) region = ov.region; if (ov.place) place = ov.place; }   // v7.1 マップごとの指定（空の区画＝天空の空・機械の町の材質）
  const r = REGION[region] || REGION.arcadia; const p = PLACE[place] || PLACE.grassland;
  return Object.assign({ region, place, known: !!REGION[region] && !!PLACE[place] }, r, { placeDef: p, ground: GROUND });
}

export const THEME_REGIONS = Object.keys(REGION);
export const THEME_PLACES = Object.keys(PLACE);
