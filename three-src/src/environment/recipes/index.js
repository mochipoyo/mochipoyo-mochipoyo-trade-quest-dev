/* =========================================================
   レシピの一覧（マップID → レシピ）。ここにあるマップだけ、環境リデザインの作り直しを使う
   ・専用レシピ（FLAGSHIP_SCENES の5地点）：RECIPES
   ・全体展開（専用レシピのないマップ）：genericRecipe(map) が種類ごとの作り方を返す（町＝town_kit）。当てないマップは null（従来の表示）
   ・状態（design_only / integrated / visual_checked / gameplay_checked / verified）は docs/environment/STATUS.md に記録する
   ========================================================= */
import { recipe as rivelCastle } from './rivel_castle.js';
import { recipe as ironMine1 } from './iron_mine_1.js';
import { recipe as poyoVillage } from './poyo_village.js';
import { recipe as nodeCity, scheduledRecipe } from './node_city.js';
import { recipe as tradia } from './tradia.js';
import { townKit } from './town_kit.js';
import { roomKit, ROOM_STYLE } from './room_kit.js';
import { recipe as poyoInterior } from './poyo_interior.js';
import { fieldKit } from './field_kit.js';
import { outdoorKit } from './outdoor_kit.js';
import { mapCoverage } from '../../world/coverage.js';
import { themeFor } from '../../world/themes.js';

export const RECIPES = {
  rivel_castle: rivelCastle,
  iron_mine_1: ironMine1,
  poyo_village: poyoVillage,
  node_city: nodeCity,
  tradia: tradia,
  scheduled_district: scheduledRecipe   // 演算都市ノードの作り方を使う（旗艦の5地点ではない）
};

// 近未来・機械・娯楽の町（ガラスと金属の汎用の建物）は町の作り方を当てない
const MODERN = { tech: 1, machine: 1, casino: 1 };
const generic = {};
export function genericRecipe(map) {
  if (!map) return null;
  const PD = window.PLACE_DECOR; const key = PD && PD.forMap ? PD.forMap(map.id) : null;
  if (mapCoverage(map) === 'done' && map.kind === 'interior') return poyoInterior;   // ポヨ村の作り込んだ屋内：用途ごとの奥の壁の飾り
  if (mapCoverage(map) !== 'generic') return null;
  if (map.kind === 'town' && !MODERN[key]) return generic['town:' + map.id] || (generic['town:' + map.id] = townKit(map.id));
  if (map.kind === 'town' && (key === 'casino' || key === 'tech')) return generic['town:' + map.id] || (generic['town:' + map.id] = townKit(map.id, { style: key === 'casino' ? 'casino' : 'skyterrace' }));   // 近未来・娯楽の町（建物はそのまま）
  if (map.kind === 'field') return generic['field:' + map.id] || (generic['field:' + map.id] = fieldKit(map.id));
  if (map.kind === 'dungeon' || map.kind === 'interior') {
    const th = themeFor(map); const P = th.placeDef || {};
    if (P.outdoor || P.wall === 'trees') { const k = P.wall === 'trees' || th.place === 'forest' ? 'forest' : th.place === 'sky' ? 'sky' : null; if (!k) return null; return generic['out:' + map.id] || (generic['out:' + map.id] = outdoorKit(k)); }   // 屋外のダンジョン（森・空）
    const prof = (window.MTQ3D_ENV && window.MTQ3D_ENV.profileSync && window.MTQ3D_ENV.profileSync(map.id)) || null;
    let st = prof && ROOM_STYLE[prof.archetype];
    if (st === null) return null;
    if (!st) st = P.wall === 'rock' ? ROOM_STYLE.cave : P.wall === 'metal' ? ROOM_STYLE.lab : P.wall === 'wood' ? ROOM_STYLE.ship : map.kind === 'interior' ? ROOM_STYLE.house : ROOM_STYLE.castle;
    if (st.fam === 'rock' && P.wall !== 'rock' && map.kind === 'interior') st = ROOM_STYLE.house;   // 屋内で岩の種類なのに岩の壁でない所は、しっくい
    const k = 'room:' + map.id; return generic[k] || (generic[k] = roomKit(Object.assign({ archetype: prof && prof.archetype }, st)));
  }
  return null;
}
export function genericKind(map) { const r = genericRecipe(map); return r ? r.id : null; }
