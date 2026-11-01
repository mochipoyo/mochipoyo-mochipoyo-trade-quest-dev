/* =========================================================
   3D化の状態（マップ単位）。旧 MAPS_3D（ポヨ村と屋内6か所だけを3Dにする一覧）の置き換え
   ・'done'    … 専用に作り込んだ3D（ポヨ村と屋内6か所。TerrainBuilder3D・InteriorBuilder3D）
   ・'generic' … 汎用3Dワールド（WorldBuilder3D）で自動生成した3D。地形・壁・小物はタイルから作るので「仮3D」
   ・'2d'      … 2D版の表示のまま（3D表示の範囲を「ポヨ村だけ」にしたとき、または作れなかったとき）
   表示の範囲は 3D設定（localStorage 'mtq3d-scope'：'all'＝全マップ（既定）／'poyo'＝ポヨ村だけ＝以前と同じ）
   ========================================================= */
import { MAPS_3D } from '../assets/manifest.js';

export const MAPS_DONE = MAPS_3D.slice();
const GENERIC_KINDS = { field: 1, town: 1, dungeon: 1, interior: 1 };

export function scope3D() { try { return localStorage.getItem('mtq3d-scope') === 'poyo' ? 'poyo' : 'all'; } catch (e) { return 'all'; } }
export function setScope3D(v) { try { localStorage.setItem('mtq3d-scope', v === 'poyo' ? 'poyo' : 'all'); } catch (e) { /* なし */ } }

export function mapCoverage(map) {
  if (!map) return '2d';
  if (MAPS_DONE.indexOf(map.id) >= 0) return 'done';
  if (scope3D() === 'poyo') return '2d';
  return GENERIC_KINDS[map.kind] ? 'generic' : '2d';
}
