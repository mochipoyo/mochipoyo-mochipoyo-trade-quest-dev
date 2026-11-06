/* =========================================================
   Data / Carriage79（v7.9）：リヴェル城の厩舎番（馬車をゆずってくれる人）
   ・場所：リヴェル城の入口のそば（旧座標 11,11。部屋を広げたとき（js/rpg/interior76.js）は、ほかの人と同じく新しい座標へ）
   ・王に一度会ったあと（king_quest1）に話すと、馬車がもらえる（お金はいらない）。仕組みは js/rpg/carriage79.js
   ========================================================= */
(function (root) {
  'use strict';
  var def = root.MAP_DEFS && root.MAP_DEFS.rivel_castle; if (!def || !def.npcs) return;
  if (def.npcs.some(function (n) { return n.id === 'castle_stable79'; })) return;
  def.npcs.push({ id: 'castle_stable79', x: 11, y: 11, sprite: 'villager_m', dir: 'left', wander: 0, talk: async function (c) {
    var C = root.Carriage; var d = root.State.data;
    if (!c.flag('king_quest1')) { await c.say('厩舎番', ['ここは城の厩舎の番所だ。', '旅の人に馬車をゆずるかどうかは、王がお決めになる。まずは奥の玉座の間で、王に会ってくれ。']); return; }
    if (!C || !C.owned()) {
      await c.say('厩舎番', ['王から聞いているよ。「波を読む者」に、城の馬車を一台って。', '幌つきの丈夫な馬車だ。仲間は中で休める。', '野原や街道なら、歩くよりずっと速い。車輪の音で、魔物も少し寄ってこなくなる。']);
      if (C) C.give(); else { d.carriage = d.carriage || {}; d.carriage.owned = true; }
      await c.msg(['馬車を手に入れた！', '（フィールドで C キー：乗る・降りる。スマホは操作パネルの「馬車」、メニューの「馬車に乗る」からも）', '（町・ダンジョン・建物の中では、馬車を外に待たせて歩く）']);
      if (root.Audio && root.Audio.sfx) { try { root.Audio.sfx('chest'); } catch (e) { /* 音がなくても続ける */ } }
      return;
    }
    await c.say('厩舎番', ['馬車の調子はどうだい？', '町やダンジョンの前では、馬車を外に待たせて歩いていくんだ。外に出たら、また乗っていけるよ。', '船に乗るときも、馬車は船に積んでいく。向こうの大陸でも使えるさ。']);
  } });
})(typeof window !== 'undefined' ? window : globalThis);
