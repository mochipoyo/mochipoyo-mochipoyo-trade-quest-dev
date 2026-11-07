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
import { townKit, REGION_STYLE } from './town_kit.js';
import { roomKit, ROOM_STYLE } from './room_kit.js';
import { recipe as poyoInterior } from './poyo_interior.js';
import { fieldKit } from './field_kit.js';
import { outdoorKit } from './outdoor_kit.js';
import { recipe as shipDeck, cabinRecipe as shipCabin } from './ship_deck.js';
import { mapCoverage } from '../../world/coverage.js';
import { interior82 } from './interior82.js';
import * as THREE from 'three';
import { buildCastle82 } from '../../world/Castle82.js';
import { Theme82 } from '../theme82.js';
import { themeFor } from '../../world/themes.js';

// v8.2 リヴェル城 1 階：前の間取り（30×28・設定「元の間取り」）だけ専用の作り方。作り直した間取りでは城の作り方（interior82）
const rivelCastle82 = { id: 'rivel_castle.v1|i82', async prepare(ctx) { const m = ctx.map; if (m.w === 30 && m.h === 28) return rivelCastle.prepare(ctx); const g = genericRecipe(m); if (!g) throw new Error('城の作り方がない'); ctx.stats.via = g.id; return g.prepare(ctx); } };
export const RECIPES = {
  rivel_castle: rivelCastle82,
  iron_mine_1: ironMine1,
  poyo_village: poyoVillage,
  node_city: nodeCity,
  tradia: tradia,
  scheduled_district: scheduledRecipe,   // 演算都市ノードの作り方を使う（旗艦の5地点ではない）
  harbor_ship_deck: shipDeck,   // v7.6 港町マリナの修理中の船・甲板（js/data/ship76.js）
  harbor_ship_cabin: shipCabin   // 同・船室
};

// 近未来・機械・娯楽の町（ガラスと金属の汎用の建物）は町の作り方を当てない
const MODERN = { tech: 1, machine: 1, casino: 1 };
const generic = {};
// v8.2 城郭区画（js/data/castle82.js）：町の作り方（地域）に、大きな城（Castle82）を足す
function castleDistrict(map) {
  const C = map.def.castle82; const tk = townKit(map.id, { style: C.region });
  return { id: 'castle82:' + C.style, async prepare(ctx) { const r = await tk.prepare(ctx); const base = r.building; ctx.stats.castle82 = C.style;
    r.building = async (b, o) => { if (b.castle82) { const c = buildCastle82(b.castle82, { w: b.w, d: b.h, doorX: b.doorX, seed: b.w * 7 }); c.group.position.set(b.x, 0, b.y); ctx.stats.castleW = b.w;
      return { group: c.group, lights: c.lights.map((l) => ({ pos: new THREE.Vector3(b.x + l.x, l.y, b.y + l.z), color: l.color, power: 1.1, dist: 11 })), smokes: [], props: [] }; } return base ? base(b, o) : null; };
    return r; } };
}
export function genericRecipe(map) {
  if (!map) return null;
  if (map.def && map.def.castle82 && map.kind === 'town') return generic['c82:' + map.id] || (generic['c82:' + map.id] = castleDistrict(map));
  const PD = window.PLACE_DECOR; const key = PD && PD.forMap ? PD.forMap(map.id) : null;
  if (mapCoverage(map) === 'done' && map.kind === 'interior') return poyoInterior;   // ポヨ村の作り込んだ屋内：用途ごとの奥の壁の飾り
  if (mapCoverage(map) !== 'generic') return null;
  // v8.2 町に属する建物の中：町の作り方（theme82.js）と部屋の用途（js/rpg/layout82.js）。城の部屋は城の作り方（別）
  const L82 = window.Layout82 && window.Layout82.info && !window.Layout82.off ? window.Layout82.info(map.id) : null;   // 設定「元の間取り」（Layout82.off）では前の作り方
  const castle82 = L82 && /^castle/.test(L82.role || '') && /_approach$/.test(L82.town || '');   // v8.2 城郭区画に属する城の部屋：城ごとの作り方（theme82.js の城）
  if (L82 && ((map.kind === 'interior' && (!/^castle/.test(L82.role || '') || castle82)) || (map.kind === 'dungeon' && (L82.role === 'clock' || castle82)))) {   // 廃墟の街の時計塔（種類はダンジョン）も町の作り方
    const prof82 = (window.MTQ3D_ENV && window.MTQ3D_ENV.profileSync && window.MTQ3D_ENV.profileSync(map.id)) || null; const th82 = Theme82.resolve(map, prof82);
    if (th82) return generic['i82:' + map.id] || (generic['i82:' + map.id] = interior82(th82));
  }
  const st78 = map.def && map.def.region78 && map.def.theme3d && REGION_STYLE[map.def.theme3d.region] ? map.def.theme3d.region : null;   // v7.8 地球の世界の新しい地域の町（地域の作り方を直接指定）
  if (map.kind === 'town' && st78) return generic['town:' + map.id] || (generic['town:' + map.id] = townKit(map.id, { style: st78 }));
  if (map.kind === 'town' && !MODERN[key]) return generic['town:' + map.id] || (generic['town:' + map.id] = townKit(map.id));
  if (map.kind === 'town' && (key === 'casino' || key === 'tech')) return generic['town:' + map.id] || (generic['town:' + map.id] = townKit(map.id, { style: key === 'casino' ? 'casino' : 'skyterrace' }));   // 近未来・娯楽の町（建物はそのまま）
  if (map.kind === 'field' && map.def && map.def.sea76) return null;   // v7.6 つないだ世界の共通の海：レシピなし（海と岩礁だけ）
  if (map.kind === 'field') return generic['field:' + map.id] || (generic['field:' + map.id] = fieldKit(map.id));
  if (map.kind === 'dungeon' || map.kind === 'interior') {
    const th = themeFor(map); const P = th.placeDef || {};
    if ((P.outdoor || P.wall === 'trees') && !(map.kind === 'interior' && P.wall !== 'trees' && th.place !== 'sky')) { const k = P.wall === 'trees' || th.place === 'forest' ? 'forest' : th.place === 'sky' ? 'sky' : 'pass'; return generic['out:' + map.id] || (generic['out:' + map.id] = outdoorKit(k)); }   // 屋外のダンジョン（森・空・草地の屋外）。屋内なのに草地の扱いのもの（島の店・灯台）は下の屋内へ   // 屋外のダンジョン（森・空）
    const prof = (window.MTQ3D_ENV && window.MTQ3D_ENV.profileSync && window.MTQ3D_ENV.profileSync(map.id)) || null;
    const r78 = map.def && map.def.region78;   // v7.8 地球の世界の新しい地域：プロファイルがないので、マップの room78（ROOM_STYLE の名前）か場所の材質から
    let st = prof ? ROOM_STYLE[prof.archetype] : r78 ? (ROOM_STYLE[map.def.room78] || undefined) : null;
    if (st === null) return null;
    if (!st) st = P.wall === 'rock' ? ROOM_STYLE.cave : P.wall === 'metal' ? ROOM_STYLE.lab : P.wall === 'wood' ? ROOM_STYLE.ship : map.kind === 'interior' ? ROOM_STYLE.house : ROOM_STYLE.castle;
    if (st.fam === 'rock' && P.wall !== 'rock' && map.kind === 'interior') st = ROOM_STYLE.house;   // 屋内で岩の種類なのに岩の壁でない所は、しっくい
    const k = 'room:' + map.id; return generic[k] || (generic[k] = roomKit(Object.assign({ archetype: prof && prof.archetype }, st)));
  }
  return null;
}
export function genericKind(map) { const r = genericRecipe(map); return r ? r.id : null; }
