/* =========================================================
   Env：環境リデザイン（TradeQuest_Environment_Overhaul_v1）の入口
   ・切り替え：localStorage 'mtq3d-env'＝'v1'（新しい環境・既定）／'off'（従来の表示）。URL の ?env=off|v1 でも同じ（URL が優先・保存はしない）
   ・素材：3d/environment-v1/（three-src/public/environment-v1/ がビルドで写される）。EnvironmentCatalog（アプリに1つ）が GLB・画像・プロファイルを読む
   ・プロファイル：マップIDで引く（data/profiles.json。いまのゲームの全マップ）。未登録のIDは汎用に黙って落とさず、警告を出して記録する（Env.missing）
   ・レシピ：マップごとの作り直し（recipes/）。レシピのあるマップだけ、builder にレシピを渡す。失敗したら従来の表示で続ける（Env.errors に記録）
   ========================================================= */
import * as THREE from 'three';
import { EnvironmentCatalog } from './EnvironmentCatalog.js';
import { addCutout } from '../engine/Cutout.js';
import { RECIPES, genericRecipe } from './recipes/index.js';

const LS_KEY = 'mtq3d-env';
let catalog = null, catalogJob = null;

export const Env = {
  missing: {}, errors: {}, built: {}, loadError: null,
  mode() {
    try { const q = /[?&]env=(v1|off)\b/.exec(location.search || ''); if (q) return q[1]; } catch (e) { /* なし */ }
    try { const v = localStorage.getItem(LS_KEY); if (v === 'off' || v === 'v1') return v; } catch (e) { /* なし */ }
    return 'v1';
  },
  enabled() { return Env.mode() === 'v1'; },
  setMode(m) { try { if (m === 'off' || m === 'v1') localStorage.setItem(LS_KEY, m); else localStorage.removeItem(LS_KEY); } catch (e) { /* なし */ } },
  // アプリに1つのカタログ（GLB・材質は全マップで共有。マップごとには捨てない）
  catalog(renderer) {
    if (catalogJob) return catalogJob;
    const base = new URL('./environment-v1/', document.baseURI).href;
    catalog = new EnvironmentCatalog(base, { renderer: renderer || null, decorateMaterial: addCutout });
    catalogJob = catalog.init().then(() => catalog, (e) => { Env.loadError = String(e && e.message || e); console.warn('[環境] 素材の一覧を読めない：' + Env.loadError + '（' + base + '）'); catalogJob = null; throw e; });
    return catalogJob;
  },
  async profile(mapId, renderer) {
    let c = null; try { c = await Env.catalog(renderer); } catch (e) { return null; }
    const p = c.profiles && c.profiles[mapId];
    if (!p && !Env.missing[mapId]) { Env.missing[mapId] = true; console.warn('[環境] プロファイルが未登録のマップ：' + mapId + '（docs/tools/env/build_profiles.js で作り直す）'); }
    return p || null;
  },
  recipeFor(map) { if (!map || !Env.enabled() || Env.errors[map.id]) return null; return RECIPES[map.id] || genericRecipe(map) || null; },   // 専用レシピ→種類ごとの作り方（全体展開）。失敗したマップは、その回はレシピなし
  recipeIds() { return Object.keys(RECIPES); },
  // 確認用：歩けるマスの「体の高さ」（0.15〜1.8）に形があるマスを調べる（下向きの光線。床・水・草・人・宝箱・煙は除く）。テスト（p76_walk.js）が env=off と v1 で比べる
  probeWalk(ms) {
    const map = ms && ms.map; if (!map) return null; ms.root.updateMatrixWorld(true);
    const skip = /^(ground_|water|grass_|flowers|lavasea|cloudsea|motes|smoke|npc|hero|chest|follow)/i; const targets = [];
    const walk = (o, bad) => { bad = bad || skip.test(o.name || '') || o.isSprite || o.isPoints || (o.userData && (o.userData.npc || o.userData.chest)); if (!bad && (o.isMesh || o.isInstancedMesh) && o.visible !== false) targets.push(o); for (const c of o.children) walk(c, bad); };
    walk(ms.root, false);
    const rc = new THREE.Raycaster(); rc.far = 1.65; const down = new THREE.Vector3(0, -1, 0); const out = [];
    for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) {
      const t = map.tile(x, z); if (window.Tiles.isSolid(t) || t === 'bld_door' || t === 'door') continue; const ev = map.eventAt && map.eventAt(x, z); if (ev && ev.solid) continue;   // 扉のマスは建物の中へ入る所（建物の形と重なってよい）
      for (const [dx, dz] of [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) {
        const y0 = (ms.heightAt ? ms.heightAt(x + dx, z + dz) : 0) + 1.8; rc.set(new THREE.Vector3(x + dx, y0, z + dz), down);
        const h = rc.intersectObjects(targets, false)[0]; if (h && h.point.y > y0 - 1.65) { let o = h.object, nm = o.name; while (o.parent && !/^(env_|building|buildings|map3d_|kit_)/.test(nm || '')) { o = o.parent; nm = o.name; } out.push({ x, z, y: +h.point.y.toFixed(2), obj: (h.object.name || '?') + ' @ ' + (nm || '?'), env: /^(env_|kit_|building_env_)/.test(nm || '') || nm === 'buildings' }); break; }
      }
    }
    return out;
  },
  info() { return { mode: Env.mode(), recipes: Object.keys(RECIPES), built: Object.assign({}, Env.built), errors: Object.assign({}, Env.errors), missing: Object.keys(Env.missing), loadError: Env.loadError }; }
};
