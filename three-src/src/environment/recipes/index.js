/* =========================================================
   レシピの一覧（マップID → レシピ）。ここにあるマップだけ、環境リデザインの作り直しを使う
   ・専用レシピ（FLAGSHIP_SCENES の5地点）：RECIPES
   ・全体展開（専用レシピのないマップ）：genericRecipe(map) が種類ごとの作り方を返す（町＝town_kit）。当てないマップは null（従来の表示）
   ・状態（design_only / integrated / visual_checked / gameplay_checked / verified）は docs/environment/STATUS.md に記録する
   ========================================================= */
import { recipe as rivelCastle } from './rivel_castle.js';
import { recipe as ironMine1 } from './iron_mine_1.js';
import { recipe as poyoVillage } from './poyo_village.js';
import { recipe as nodeCity } from './node_city.js';
import { recipe as tradia } from './tradia.js';
import { townKit } from './town_kit.js';

export const RECIPES = {
  rivel_castle: rivelCastle,
  iron_mine_1: ironMine1,
  poyo_village: poyoVillage,
  node_city: nodeCity,
  tradia: tradia
};

// 近未来・機械・娯楽の町（ガラスと金属の汎用の建物）は町の作り方を当てない
const MODERN = { tech: 1, machine: 1, casino: 1 };
const generic = {};
export function genericRecipe(map) {
  if (!map) return null;
  const PD = window.PLACE_DECOR; const key = PD && PD.forMap ? PD.forMap(map.id) : null;
  if (map.kind === 'town' && !MODERN[key]) return generic['town:' + map.id] || (generic['town:' + map.id] = townKit(map.id));
  return null;
}
export function genericKind(map) { const r = genericRecipe(map); return r ? r.id : null; }
