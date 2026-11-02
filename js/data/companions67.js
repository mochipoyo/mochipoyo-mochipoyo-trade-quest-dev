/* =========================================================
   Data / v6.7 仲間の加入場所：アルカディアで仲間になるのはカイルまで
   ・ミナ（ダウの村）・セリス（リヴェルの酒場）・ガルド（港町マリナの酒場）・ルシア（ダウの村の修行場）の「仲間にする」NPC を、
     町の配置（飾り・建物の位置。js/data/towns.js と expand-a*.js が NPC の位置を見て決める）がすべて終わったあとで外す。
     元のデータ（towns.js）はそのまま残す（外す前に配置を決めるので、町の見た目・建物・出入口は前の版と同じ）
   ・新しい加入場所：ガルド＝灰の浜の番小屋・セリス＝灰鉱町ヴェルムの鉱石工場（js/data/grania.js）、
     ミナ＝カリオンの裏通りの酒場・ルシア＝王都セントラの酒場（js/data/kalion.js）
   ・すでに仲間にしているセーブはそのまま（仲間の NPC は、仲間にしたあとは出ない）
   ========================================================= */
(function (root) {
  'use strict';
  var MD = root.MAP_DEFS; if (!MD) return;
  var FROM = { dow_village: 'mina', rivel_tavern: 'seris', harbor_tavern: 'gald', dow_dojo: 'lucia' };
  var TO = { mina: 'kalion_tavern', seris: 'verum_factory', gald: 'ash_shore_hut', lucia: 'sentra_tavern' };
  Object.keys(FROM).forEach(function (mapId) { var d = MD[mapId]; if (!d || !d.npcs) return; d.npcs = d.npcs.filter(function (n) { return n.id !== FROM[mapId]; }); });
  root.COMPANION_MOVES67 = { from: FROM, to: TO };
})(typeof window !== 'undefined' ? window : globalThis);
