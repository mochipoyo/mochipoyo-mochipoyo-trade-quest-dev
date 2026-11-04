/* =========================================================
   レシピの一覧（マップID → レシピ）。ここにあるマップだけ、環境リデザインの作り直しを使う
   ・状態（design_only / integrated / visual_checked / gameplay_checked / verified）は docs/environment/STATUS.md に記録する
   ========================================================= */
import { recipe as rivelCastle } from './rivel_castle.js';
import { recipe as ironMine1 } from './iron_mine_1.js';
import { recipe as poyoVillage } from './poyo_village.js';

export const RECIPES = {
  rivel_castle: rivelCastle,
  iron_mine_1: ironMine1,
  poyo_village: poyoVillage
};
