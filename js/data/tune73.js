/* =========================================================
   Data / v7.3 ボスの供・呼ぶ敵の強さの調整（js/rpg/combat.js の Combat.minionScale）
   ・minionK：ボスに合わせて上げる量の割合（1＝そのまま、0＝上げない）。何度も仲間を呼ぶボスは控えめにする
   ========================================================= */
(function (root) {
  'use strict';
  var E = root.ENEMIES; if (!E) return;
  var K = { boss_drone_swarm: 0.35, boss_zarg_remnant: 0.6 };   // 何度も呼ぶ・強い供がつくボス（上げすぎると、決めたレベルでほとんど勝てなくなる。boss64test の範囲で決めた）
  Object.keys(K).forEach(function (id) { if (E[id]) E[id].minionK = K[id]; });
})(typeof window !== 'undefined' ? window : globalThis);
