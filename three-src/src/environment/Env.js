/* =========================================================
   Env：環境リデザイン（TradeQuest_Environment_Overhaul_v1）の入口
   ・切り替え：localStorage 'mtq3d-env'＝'v1'（新しい環境・既定）／'off'（従来の表示）。URL の ?env=off|v1 でも同じ（URL が優先・保存はしない）
   ・素材：3d/environment-v1/（three-src/public/environment-v1/ がビルドで写される）。EnvironmentCatalog（アプリに1つ）が GLB・画像・プロファイルを読む
   ・プロファイル：マップIDで引く（data/profiles.json。いまのゲームの全マップ）。未登録のIDは汎用に黙って落とさず、警告を出して記録する（Env.missing）
   ・レシピ：マップごとの作り直し（recipes/）。レシピのあるマップだけ、builder にレシピを渡す。失敗したら従来の表示で続ける（Env.errors に記録）
   ========================================================= */
import { EnvironmentCatalog } from './EnvironmentCatalog.js';
import { addCutout } from '../engine/Cutout.js';
import { RECIPES } from './recipes/index.js';

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
  recipeFor(map) { if (!map || !Env.enabled() || Env.errors[map.id]) return null; return RECIPES[map.id] || null; },   // 失敗したマップは、その回はレシピなし
  recipeIds() { return Object.keys(RECIPES); },
  info() { return { mode: Env.mode(), recipes: Object.keys(RECIPES), built: Object.assign({}, Env.built), errors: Object.assign({}, Env.errors), missing: Object.keys(Env.missing), loadError: Env.loadError }; }
};
