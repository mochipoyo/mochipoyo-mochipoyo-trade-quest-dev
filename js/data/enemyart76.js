/* =========================================================
   Data / enemyart76（v7.6）：画像のない敵7体に新しい形（js/core/monsterart76.js）を使う
   ・対象：新しい絵の検品で「保留」にした7体（スケルトン・ダマシトカゲ・反転モグラ・ストーンゴーレム・インプ・ポイズンビートル・恐怖の影）。
     いままでは共通の種族の形（アンデッド・爬虫類・獣・ゴーレム・悪魔・虫・相場の魔物）を色だけ変えて描いていた
   ・ENEMIES[id].art（データ）は変えない。MonsterArt.image に渡された「その敵の art」を、描くときだけ新しい形に読み替える
     （戦闘・図鑑・ボスのシンボル・3D 版の戦闘の絵で同じ。?enemyart=old のときは従来の形）
   ・名前・能力・行動・出現は変えない。コードで描いた仮の絵（画像素材ではない）。素材の仕様は docs/v76/ENEMY_ART76.md
   ========================================================= */
(function (root) {
  'use strict';
  var E = root.ENEMIES, MA = root.MonsterArt; if (!E || !MA || !MA.image) return;
  var NEW = {
    skeleton: { family: 'skelknight76', size: 'big', c: { base: '#e8e4d8', dark: '#9a948a', light: '#ffffff', eye: '#ff3a3a', accent: '#c9a24a' } },
    lizard: { family: 'chameleon76', size: 'big', c: { base: '#6ab04a', dark: '#3a6a2a', light: '#b8e08a', eye: '#1a1a2a', accent: '#e8c15a' } },
    mole: { family: 'mole76', size: 'big', c: { base: '#7a6a5a', dark: '#4a3e34', light: '#a89888', eye: '#1a1a2a', accent: '#5ae0c8' } },
    golem: { family: 'boulder76', size: 'big', c: { base: '#9a948a', dark: '#5e5a54', light: '#c8c2b8', eye: '#7fd0ff', accent: '#5ad8ff' } },
    imp: { family: 'impish76', size: 'big', c: { base: '#c94a4a', dark: '#7a2424', light: '#f08a7a', eye: '#ffd24a', accent: '#f0e0b0' } },
    bug_poison: { family: 'beetle76', size: 'big', c: { base: '#7a4ab8', dark: '#3a1a6a', light: '#b890e8', eye: '#ff4a4a', accent: '#8aff5a' } },
    fear_shadow: { family: 'dread76', size: 'big', c: { base: '#1a1a3a', dark: '#0a0a1a', light: '#3a3a6a', eye: '#8fb8ff', accent: '#8fb8ff' } }
  };
  var BY = {}, used = [];
  Object.keys(NEW).forEach(function (id) {
    var e = E[id]; if (!e || !e.art) return; var k = JSON.stringify(e.art);
    var same = Object.keys(E).filter(function (o) { return o !== id && E[o].art && JSON.stringify(E[o].art) === k; });
    if (same.length) return;   // 同じ art の敵がほかにいるときは読み替えない（その敵の見た目まで変えないため）
    BY[k] = NEW[id]; used.push(id);
  });
  function off() { try { return !!(root.EnemyArt && root.EnemyArt.mode && root.EnemyArt.mode() === 'old'); } catch (e) { return false; } }
  var orig = MA.image;
  MA.image = function (art, scale, phase) { if (art && !off()) { var n = BY[JSON.stringify(art)]; if (n) art = n; } return orig.call(this, art, scale, phase); };
  var origSize = MA.sizeOf; if (origSize) MA.sizeOf = function (art) { if (art && !off()) { var n = BY[JSON.stringify(art)]; if (n) art = n; } return origSize.call(this, art); };
  root.EnemyArt76 = { NEW: NEW, used: used, artOf: function (id) { var e = E[id]; if (!e || !e.art) return null; return BY[JSON.stringify(e.art)] || e.art; } };
})(typeof window !== 'undefined' ? window : globalThis);
