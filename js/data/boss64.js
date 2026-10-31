/* =========================================================
   Data / v6.4 ボスの強化：本編の章ボスと、サブ地域（砂漠・竜炎・雪原）の本筋のボスの HP・攻撃力・魔力
   ・各行は [変更前, 変更後]。敵データ（enemies.js）の値が「変更前」と同じときだけ変更後に置き換える（元の値が別の版で変わっていたら触らない）
   ・数値は作業用の戦闘シミュレーション（work/v64/bosstune.js）で決めた推定：章ごとの想定レベル（docs/balance-v64.md の 3.）で、
     オート戦闘・アイテムなし・その章までの店の最強装備のとき、F=1（ほぼ一直線に進む）で6割前後、F=2（ふつう）で9割前後勝てる強さ。序盤（第2〜4章）はやさしめ
   ・任意の隠しボス（凍結の時計守・旧都市の演算核・原初の炎竜・灰の王・幽霊船長・海賊カモメの頭・学院地下の3体・森の狼王・クリスタルゴーレム）は変えない
   ・防御・素早さ・行動・経験値・ゴールド・落とす物は変えない
   ========================================================= */
(function (root) {
  'use strict';
  var E = root.ENEMIES; if (!E) return;
  var T = {
    boss_lost_trend: { ch: 2, hp: [480, 480], atk: [19, 54], mag: [8, 23] },   // トレンド迷子
    boss_greed_golem: { ch: 3, hp: [880, 1360], atk: [29, 74], mag: [6, 15] },   // 欲望のゴーレム
    boss_bandit_chief: { ch: 3, hp: [640, 1280], atk: [26, 90] },   // 山賊の頭目ガロン
    boss_tide_serpent: { ch: 4, hp: [760, 1750], atk: [27, 65], mag: [8, 19] },   // 潮の大蛇ウルガ
    boss_overseer: { ch: 5, hp: [1300, 4030], atk: [34, 87], mag: [10, 26] },   // 監督官ザルグ
    boss_ledger_guardian: { ch: 6, hp: [1500, 4130], atk: [38, 118], mag: [12, 37] },   // 帳簿の守護者
    boss_valen: { ch: 7, hp: [1400, 4270], atk: [42, 155], mag: [14, 52] },   // 騎士団長ヴァレン
    boss_royal_captain: { ch: 7, hp: [1200, 3780], atk: [42, 179], mag: [14, 60] },   // 親衛隊長ドレク
    boss_ledger_core: { ch: 7, hp: [1900, 4560], atk: [45, 128], mag: [14, 40] },   // 帳簿中枢の守護機構
    boss_ruin_memory: { ch: 8, hp: [2600, 5980], atk: [49, 164], mag: [48, 161] },   // 廃墟の記憶
    boss_library_guardian: { ch: 9, hp: [2800, 5740], atk: [51, 171], mag: [50, 168] },   // 図書館の守護機構
    boss_storm_chief: { ch: 9, hp: [3300, 5450], atk: [88, 176], mag: [19, 38] },   // 砂嵐の頭目ザイード
    boss_mirage_lord: { ch: 9, hp: [3000, 5700], atk: [60, 111], mag: [59, 109] },   // 蜃気楼の主
    boss_time_guardian: { ch: 10, hp: [2900, 5080], atk: [58, 212], mag: [57, 208] },   // 時の守護者
    boss_frost_spirit: { ch: 10, hp: [3300, 5120], atk: [64, 86], mag: [63, 85] },   // 凍てついた大精霊
    boss_memory_keeper: { ch: 10, hp: [4600, 5520], atk: [100, 235], mag: [108, 254] },   // 記憶庫の番人
    boss_drone_swarm: { ch: 11, hp: [2800, 7700], atk: [54, 257], mag: [20, 95] },   // 監視ドローン群
    boss_core_defense: { ch: 12, hp: [3400, 8840], atk: [64, 131], mag: [63, 129] },   // 中枢防衛機構
    boss_minister: { ch: 13, hp: [3200, 7200], atk: [71, 167], mag: [70, 165] },   // 裏切りの大臣ヴォルク
    boss_magma_wyrm: { ch: 13, hp: [4600, 10810], atk: [115, 167], mag: [26, 38] },   // 溶岩の番竜
    boss_sky_guardian: { ch: 14, hp: [3800, 8360], atk: [78, 140], mag: [77, 139] },   // 天空の守護者
    boss_zarg_remnant: { ch: 15, hp: [3400, 10540], atk: [80, 204], mag: [27, 69] },   // ザルグの残滓
    boss_sevran_shadow: { ch: 15, hp: [3600, 8820], atk: [82, 185], mag: [81, 182] },   // セヴランの影
    boss_grote_2: { ch: 15, hp: [4600, 11040], atk: [84, 176], mag: [29, 61] },   // 鉄冠将軍グロート
    boss_demon_fear: { ch: 16, hp: [4000, 10600], atk: [86, 198], mag: [85, 195] },   // 相場魔王〈恐怖〉
    boss_demon_greed: { ch: 16, hp: [4400, 10340], atk: [89, 325], mag: [30, 110] },   // 相場魔王〈欲望〉
    boss_demon_fixed: { ch: 16, hp: [5600, 9520], atk: [93, 144], mag: [92, 143] },   // 相場魔王〈固定〉
  };
  var applied = [], skipped = [];
  Object.keys(T).forEach(function (id) {
    var e = E[id], t = T[id]; if (!e) { skipped.push(id); return; }
    var same = ['hp', 'atk', 'mag'].every(function (k) { return !t[k] || (e[k] || 0) === t[k][0]; });
    if (!same) { skipped.push(id); return; }
    e.base64 = { hp: e.hp, atk: e.atk, mag: e.mag || 0 };
    ['hp', 'atk', 'mag'].forEach(function (k) { if (t[k]) e[k] = t[k][1]; });
    applied.push(id);
  });
  root.BOSS64 = { table: T, applied: applied, skipped: skipped };
})(typeof window !== 'undefined' ? window : globalThis);
