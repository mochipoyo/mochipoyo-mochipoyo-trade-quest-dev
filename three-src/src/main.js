/* =========================================================
   3D版の入口：2D版のスクリプト（../js/*.js）を読み込んだあとに実行される
   1) 2D側へフックを入れる → 2) 2D版を起動（タイトル）→ 3) 3D素材を裏で読み込む
   ========================================================= */
import { App3D, notice2D } from './bridge/GameBridge.js';
import { Env } from './environment/Env.js';
window.MTQ3D_ENV = Env;   // v7.6 環境リデザインの状態（Env.info()：切り替え・レシピ・組み立て・未登録のマップ・失敗）
window.MTQ3D_BUILD = typeof __MTQ3D_BUILD__ !== 'undefined' ? __MTQ3D_BUILD__ : '-';   // ビルドの日時（vite.config.js）

// 安全装置：js/rpg/state.js が3D版に対応していない（古い）と、3D版が2D版のセーブ枠へ書き込んでしまうため起動しない
const safe = !!(window.State && /^mtq-3d-/.test(window.State.keyPrefix || ''));
if (!safe) {
  window.MTQ3D_BLOCKED = true;
  if (window.__mtq3dUnsafe) window.__mtq3dUnsafe();
} else {
  const app = new App3D({ base: './' });
  window.MTQ3D = app;
  try { app.install(); } catch (e) { console.error('3D hook install failed', e); }
  if (window.__mtqBoot2D) window.__mtqBoot2D();
  app.init().catch((e) => { console.error('3D init failed → 2D表示で続行', e); app.disabled = true; app.why = '3Dの準備に失敗（' + String((e && e.message) || e).slice(0, 80) + '）'; notice2D('3D表示を準備できなかったため、2Dで表示しています（' + app.why + '）'); });
}
