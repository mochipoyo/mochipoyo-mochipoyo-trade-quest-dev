/* =========================================================
   Data / v6.5 ダンジョンから入口の外へ戻る：道具「脱出の羽」と呪文「帰還の術」
   ・どちらも「ダンジョンの中」でだけ使える（町・城・フィールド・戦闘中は使えない）。行き先はダンジョンの入口の外（js/rpg/dungeonexit.js）
   ・今までの「帰還の翼」（最後に泊まった町へ戻る・150G）はそのまま。名前と働きが違う道具として並べて売る
   ・脱出の羽：150G。今まで帰還の翼を売っていた道具屋（主要な町の道具屋）の品ぞろえに、帰還の翼のすぐ後ろへ加える
   ・帰還の術：MP8。僧侶 Lv14・賢者 Lv15・時詠み師 Lv16・相場の導師 Lv17・精霊守 Lv18 で覚える（賢者は職業の特性で消費MPが8割＝7）
     すでにそのレベルを超えているセーブは、読み込んだときにこの呪文だけを覚える（ほかの技は変えない：State.migrate）
   ========================================================= */
(function (root) {
  'use strict';
  var ITEMS = root.ITEMS, SKILLS = root.SKILLS, JOBS = root.JOBS;
  if (ITEMS.escape_feather) throw new Error('escape65: escape_feather が重複しています');
  ITEMS.escape_feather = { id: 'escape_feather', name: '脱出の羽', cat: 'consumable', price: 150, effect: { dungeonExit: true },
    desc: 'ダンジョンの中で使うと、全員でダンジョンの入口の外へ戻る（町・フィールド・戦闘中は使えない）', fieldOnly: true };
  if (SKILLS.dungeon_return) throw new Error('escape65: dungeon_return が重複しています');
  SKILLS.dungeon_return = { id: 'dungeon_return', name: '帰還の術', kind: 'field', field: 'dungeon_exit', target: 'party', mp: 8,
    desc: 'ダンジョンの中で唱えると、全員でダンジョンの入口の外へ戻る（戦闘中は使えない）', anim: 'light', school: 'magic', v65: true };
  var LEARN = { priest: 14, sage: 15, chronomancer: 16, master: 17, spirit_warden: 18 };
  Object.keys(LEARN).forEach(function (j) { if (!JOBS[j]) throw new Error('escape65: 職業がない ' + j); if (!JOBS[j].skills.some(function (s) { return s.id === 'dungeon_return'; })) JOBS[j].skills.push({ lv: LEARN[j], id: 'dungeon_return' }); });
  root.DUNGEON_RETURN_LEARN = LEARN;
  // 道具屋：帰還の翼を売っているところに、脱出の羽を加える（shop.stock は会話の c.shop と同じ配列）
  var added = [];
  Object.keys(root.MAP_DEFS || {}).forEach(function (id) {
    var def = root.MAP_DEFS[id]; var sh = def && def.shop; if (!sh || sh.kind !== 'item' || !sh.stock) return;
    var i = sh.stock.indexOf('escape_wing'); if (i < 0 || sh.stock.indexOf('escape_feather') >= 0) return;
    sh.stock.splice(i + 1, 0, 'escape_feather'); added.push(id);
  });
  root.ESCAPE_FEATHER_SHOPS = added;
})(typeof window !== 'undefined' ? window : globalThis);
