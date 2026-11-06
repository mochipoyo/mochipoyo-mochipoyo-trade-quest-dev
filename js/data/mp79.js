/* =========================================================
   Data / MP79（v7.9）：全員の最大MPの底上げ（職業の MP の基本値と、1 レベルあたりの伸び）
   ・前の値では、戦士の Lv45 で最大MP 39 など、レベルに対して低すぎた（特技 2〜4 回で尽きる）
   ・新しい値：基本値＝前の値×1.4＋4、伸び＝前の伸び×1.45＋0.35
     例）戦士 Lv30 27→54・Lv50 43→84 ／ 魔法使い Lv30 109→171・Lv50 173→271 ／ 時渡りのトレーダー Lv50 228→351
   ・最大MPは、職業とレベルから毎回計算する（js/rpg/actors.js の Actors.stats）ので、セーブはそのまま使える
     （今の MP は前の値のまま。宿や回復で新しい最大まで回復する）
   ・前の値は JOBS[職業]._mp79 に残す（確かめるとき用）
   ========================================================= */
(function (root) {
  'use strict';
  var J = root.JOBS; if (!J) return;
  var MP79 = root.MP79 = {
    base: function (b) { return Math.round(b * 1.4 + 4); },
    growth: function (g) { return Math.round((g * 1.45 + 0.35) * 100) / 100; }
  };
  Object.keys(J).forEach(function (k) {
    var j = J[k]; if (!j || !j.stats || !j.growth || j._mp79 || typeof j.stats.mp !== 'number') return;
    j._mp79 = { mp: j.stats.mp, growth: j.growth.mp };
    j.stats.mp = MP79.base(j.stats.mp); j.growth.mp = MP79.growth(j.growth.mp);
  });
})(typeof window !== 'undefined' ? window : globalThis);
