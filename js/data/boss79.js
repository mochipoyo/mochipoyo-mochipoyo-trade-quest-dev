/* =========================================================
   Data / Boss79（v7.9）：任意の隠しボスの HP を、全員の最大MPの底上げ（js/data/mp79.js）に合わせて上げる
   ・本編・サブ地域のボス 27 体は js/data/boss64.js の表、新しい地域のボス 5 体は js/data/region78-*.js の hpMult で、
     MP を上げる前と同じ勝率・ターンになるよう、シミュレーションで決めた（docs/environment/REPORT.md の 18）
   ・任意の隠しボス 11 体は、v6.4 から章の想定レベルを決めていない（シミュレーションの条件がない）ので、
     27 体の HP の倍率の中央値（×1.23）をそのまま掛ける（推定。攻撃力・魔力・行動・経験値などは変えない）
   ・前の値は ENEMIES[id].base79 に残す
   ========================================================= */
(function (root) {
  'use strict';
  var E = root.ENEMIES; if (!E) return;
  var HP = 1.23;
  var IDS = ['boss_clock_warden', 'boss_old_core', 'boss_primal_flame', 'boss_ash_lord', 'boss_ghost_captain', 'boss_gull_admiral', 'observer_echo', 'soul_warden', 'zero_echo', 'wolf_king', 'crystal_golem'];
  var applied = [];
  IDS.forEach(function (id) { var e = E[id]; if (!e || e.base79) return; e.base79 = { hp: e.hp }; e.hp = Math.round(e.hp * HP); applied.push(id); });
  root.BOSS79 = { hpMult: HP, hidden: IDS, applied: applied };
})(typeof window !== 'undefined' ? window : globalThis);
