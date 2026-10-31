/* =========================================================
   RPG / Travel (v6.1) : ファストトラベル（一度訪れた町・城・ダンジョンの入口へ移動）
   ・移動地点は地域の地図の場所データ（各地域の LOCATIONS）から作る。地点IDは場所の id（例：rivel_town、oblivion_cave）で固定
     → 3D 化しても、新しい地域を足しても、同じ仕組みで増える（名前の比較はしない）
   ・解放＝その場所（町・ダンジョンの1階）を訪れたことがある（State.data.visited。セーブデータにすでにある記録）
   ・移動先は、その場所の通常の入口（地域の地図から入ったときと同じ座標）。ダンジョンは入口
   ・使えないとき：戦闘・会話・イベント中、乗り物に乗っている、ダンジョンの中にいる
   ・画面（世界地図の地域の情報・メニューの「ファストトラベル」）から呼ぶだけ。移動の処理は World.enterMap（既存）
   ========================================================= */
(function (root) {
  'use strict';
  var Travel = {};
  function D() { return root.State && root.State.data; }
  // 地点の一覧（地域の地図 → その地域の場所）。入口の座標は地域の地図の出入口（拡大補正済み）から取る
  Travel.points = function () {
    var out = []; var defs = root.MAP_DEFS || {};
    Object.keys(defs).forEach(function (rid) {
      var R = defs[rid]; if (!R.region || !R.locations) return;
      R.locations.forEach(function (L) {
        if (!L.to || !defs[L.to] || defs[L.to].region) return;   // 地域どうしをつなぐ門（転移門など）は対象外
        var wp = (R.warps || []).filter(function (w) { return w.x === L.x && w.y === L.y && w.to === L.to; })[0];
        var kind = defs[L.to].kind === 'dungeon' ? 'dungeon' : L.icon === 'castle_icon' ? 'castle' : 'town';
        out.push({ id: L.id, name: L.name, region: rid, to: L.to, tx: wp ? wp.tx : L.tx, ty: wp ? wp.ty : L.ty, icon: L.icon, kind: kind, hidden: !!L.hidden, needFlag: L.needFlag || null, wx: L.x, wy: L.y });
      });
    });
    return out;
  };
  Travel.get = function (id) { var p = Travel.points(); for (var i = 0; i < p.length; i++) if (p[i].id === id) return p[i]; return null; };
  Travel.unlocked = function (p) { var d = D(); return !!(d && p && d.visited[p.to] && (!p.needFlag || d.flags[p.needFlag])); };
  Travel.byRegion = function (rid) { return Travel.points().filter(function (p) { return p.region === rid; }); };
  // 今使えるか（理由つき）
  Travel.canUse = function (fromMap, opts) {
    var d = D(), W = root.World; if (!d || !W || !W.map) return { ok: false, reason: 'ゲームを始めてから使える' };
    if (d.aboard) return { ok: false, reason: '乗り物から降りてから使える' };
    var m = fromMap || W.map; if (m.kind === 'dungeon') return { ok: false, reason: 'ダンジョンの中では使えない（外に出てから）' };
    if (root.Engine && W.scene && root.Engine.top() !== W.scene && !(opts && opts.fromMenu && !(root.BattleUI && root.BattleUI.scene && root.Engine.scenes.indexOf(root.BattleUI.scene) >= 0))) return { ok: false, reason: '戦闘や会話の途中では使えない' };   // メニューから（探索中に開いたメニューの上）は使える
    if (d.flags.no_travel) return { ok: false, reason: '今は移動できない' };
    return { ok: true };
  };
  // 移動（確認つき）。true＝移動した
  Travel.go = async function (id, opts) {
    opts = opts || {}; var W = root.World, Win = root.Win; var p = Travel.get(id); var d = D();
    if (!p || !Travel.unlocked(p)) { if (Win) await Win.message(['まだ訪れていない場所には移動できない。']); return false; }
    var cu = Travel.canUse(null, opts); if (!cu.ok) { if (Win) await Win.message([cu.reason + '。']); return false; }
    if (W.map && W.map.id === p.to) { if (Win) await Win.message(['いまいる場所だ。']); return false; }
    W.busy = true;
    var a = opts.confirm === false ? 0 : await Win.choice(p.name + 'へ移動しますか？' + (p.kind === 'dungeon' ? '（入口へ）' : ''), ['移動する', 'やめる']);
    if (a !== 0) { W.busy = false; return false; }
    var fade = document.getElementById('fade'); if (fade) fade.classList.add('on'); if (root.Audio) root.Audio.sfx('magic');
    await new Promise(function (r) { setTimeout(r, 380); });
    W.enterMap(p.to, p.tx, p.ty, 'down'); d.travel = d.travel || {}; d.travel.last = p.id; d.travel.count = (d.travel.count || 0) + 1;
    setTimeout(function () { if (fade) fade.classList.remove('on'); }, 120);
    W.busy = false; W.updateHud(); if (root.State.autosave) root.State.autosave(); if (Win) Win.toast(p.name + 'へ移動した');
    return true;
  };
  root.Travel = Travel;
})(typeof window !== 'undefined' ? window : globalThis);
