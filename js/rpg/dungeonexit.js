/* =========================================================
   RPG / DungeonExit（v6.5）：ダンジョンの中から入口の外へ戻る（脱出の羽・帰還の術。2D・3D 共通）
   ・「ダンジョン」＝マップの種類が dungeon のもの。ワープ（階段・通路・穴）でつながったダンジョンのマップを1つのまとまりとして扱う
     （隠し区画・別の階もまとめて同じダンジョン）
   ・行き先＝そのまとまりから「ダンジョンでない場所（フィールド・町など）」へ出るワープの着地点
     ＝ふつうに歩いて出口から出たときと同じ場所。入口が複数あるダンジョン（別の地域へ抜ける峠・洞窟など）では、
       入ってきた入口へ戻る（入ったときの場所を State.data.dungeonEntry に記録）。記録がない古いセーブでは、今いる階からいちばん近い出口
     特別な行き先は DEFS に登録（今はなし。テスト dungeonexittest.js で全ダンジョンの行き先を確認している）
   ・使えないとき（理由を表示して、道具・MPは減らさない）
     ダンジョンの外／船の上／マップの定義の noEscape（脱出禁止のイベント中。関数なら理由の文を返す）／出口がすべて物語の条件で閉じている
     戦闘中はそもそも使えない（道具はフィールドのメニュー専用、呪文は戦闘の一覧で選べない）
   ========================================================= */
(function (root) {
  'use strict';
  var DungeonExit = { DEFS: {} };
  function defs() { return root.MAP_DEFS || {}; }
  function D() { return root.State && root.State.data; }
  function isDungeonId(id) { var d = defs()[id]; return !!(d && d.kind === 'dungeon'); }
  function links(def) {   // そのマップから出ていく先（ワープ・穴）
    var out = [];
    (def.warps || []).forEach(function (w) { if (w && w.to) out.push({ to: w.to, x: w.x, y: w.y, tx: w.tx, ty: w.ty, needFlag: w.needFlag, hidden: w.hidden, lockedText: w.lockedText, name: w.name }); });
    (def.events || []).forEach(function (e) { if (e && e.type === 'hole' && e.to) out.push({ to: e.to, x: e.x, y: e.y, tx: e.tx, ty: e.ty, hole: true }); });
    return out;
  }
  var cache = null;
  function build() {
    if (cache) return cache;
    var M = defs(), adj = {};
    Object.keys(M).forEach(function (id) { if (!isDungeonId(id)) return; adj[id] = adj[id] || {}; links(M[id]).forEach(function (l) { if (!isDungeonId(l.to)) return; adj[id][l.to] = 1; adj[l.to] = adj[l.to] || {}; adj[l.to][id] = 1; }); });
    var groupOf = {};
    Object.keys(adj).sort().forEach(function (id) {
      if (groupOf[id]) return; var key = id, q = [id], seen = {}; seen[id] = 1; var members = [];
      while (q.length) { var c = q.shift(); members.push(c); Object.keys(adj[c] || {}).forEach(function (n) { if (!seen[n]) { seen[n] = 1; q.push(n); } }); }
      members.sort(); key = members[0]; members.forEach(function (mm) { groupOf[mm] = { key: key, members: members }; });
    });
    cache = { groupOf: groupOf };
    return cache;
  }
  DungeonExit.reset = function () { cache = null; };
  DungeonExit.group = function (id) { return build().groupOf[id] || null; };
  // まとまりから外へ出るワープ（from：ダンジョンのどの階から）
  DungeonExit.exits = function (id) {
    var g = DungeonExit.group(id); if (!g) return []; var M = defs(), out = [];
    g.members.forEach(function (mid) { links(M[mid]).forEach(function (l) { if (isDungeonId(l.to) || !M[l.to]) return; out.push(Object.assign({ from: mid }, l)); }); });
    return out;
  };
  // 今いる階から、何回ワープすればその出口の階か（まとまりの中の幅優先）
  function floorDist(from) {
    var M = defs(), dist = {}, q = [from]; dist[from] = 0;
    while (q.length) { var c = q.shift(); links(M[c]).forEach(function (l) { if (!isDungeonId(l.to) || dist[l.to] !== undefined) return; dist[l.to] = dist[c] + 1; q.push(l.to); }); }
    return dist;
  }
  function open(l) { var d = D(); return !l.needFlag || !!(d && d.flags && d.flags[l.needFlag]); }
  function labelFor(l, gkey) {
    var M = defs(), to = M[l.to]; if (!to) return l.to; var g = DungeonExit.group(gkey);
    var locs = (to.locations || []).filter(function (L) { return g && g.members.indexOf(L.to) >= 0; });
    var best = null, bd = 1e9; locs.forEach(function (L) { var dd = Math.abs(L.x - l.tx) + Math.abs(L.y - l.ty); if (dd < bd) { bd = dd; best = L; } });
    if (best && bd <= 6) return best.name + 'の入口（' + to.name + '）';
    var first = M[l.from]; var dn = (first && first.name ? String(first.name).replace(/\s*(\d+階|地下\d+階|B\d+F?|第.+の回廊)$/, '') : 'ダンジョン');
    return to.kind === 'field' || to.region ? dn + 'の入口（' + to.name + '）' : dn + 'の外（' + to.name + '）';
  }
  // 行き先を選ぶ
  DungeonExit.destination = function (mapId) {
    var g = DungeonExit.group(mapId); if (!g) return null;
    var reg = DungeonExit.DEFS[mapId] || DungeonExit.DEFS[g.key];
    if (reg) return { map: reg.map, x: reg.x, y: reg.y, label: reg.label || (defs()[reg.map] || {}).name || reg.map, registered: true };
    var all = DungeonExit.exits(mapId); var ex = all.filter(open);
    if (!ex.length) return all.length ? { locked: true, exit: all[0] } : null;
    var d = D(), en = d && d.dungeonEntry, pick = null;
    if (en && en.group === g.key) {   // 入ってきた入口へ
      var bd = 1e9; ex.forEach(function (l) { if (l.to !== en.map) return; var dd = Math.abs(l.tx - en.x) + Math.abs(l.ty - en.y); if (dd < bd) { bd = dd; pick = l; } });
      if (pick && bd > 8) pick = null;
    }
    if (!pick) {   // いちばん近い出口（同じならフィールドへの出口を先に）
      var dist = floorDist(mapId), bs = 1e9;
      ex.forEach(function (l) { var fd = dist[l.from] === undefined ? 99 : dist[l.from]; var td = defs()[l.to]; var sc = fd * 10 + ((td.kind === 'field' || td.region) ? 0 : td.kind === 'town' ? 2 : 5); if (sc < bs) { bs = sc; pick = l; } });
    }
    return { map: pick.to, x: pick.tx, y: pick.ty, label: labelFor(pick, g.key), exit: pick, byEntry: !!(en && en.group === g.key && en.map === pick.to) };
  };
  // 使えるか（使えないときは reason）
  DungeonExit.check = function (m) {
    var d = D();
    if (!m || m.kind !== 'dungeon') return { ok: false, reason: 'ダンジョンの中でしか使えない。（町・城・フィールドでは使えない）' };
    if (d && d.aboard) return { ok: false, reason: '船の上では使えない。' };
    var ne = m.def && m.def.noEscape; if (typeof ne === 'function') ne = ne(d, m);
    if (ne) return { ok: false, reason: typeof ne === 'string' ? ne : '今は不思議な力にはばまれて、外へ出られない。' };
    var dest = DungeonExit.destination(m.id);
    if (!dest) return { ok: false, reason: 'このダンジョンには、外へ出られる出口がない。' };
    if (dest.locked) return { ok: false, reason: (dest.exit.lockedText && dest.exit.lockedText[0]) || '出口が閉ざされていて、外へ出られない。' };
    return { ok: true, dest: dest };
  };
  // 実際に移動する（メニューの中から呼ぶ。暗転 → 入口の外へ）
  DungeonExit.go = function (dest) {
    var W = root.World; var fade = root.document && root.document.getElementById('fade');
    if (fade) fade.classList.add('on');
    W.enterMap(dest.map, dest.x, dest.y, 'down');
    setTimeout(function () { if (fade) fade.classList.remove('on'); if (root.Audio) root.Audio.sfx('step'); }, 220);
    if (root.Win && root.Win.toast) root.Win.toast(dest.label + 'へ戻った');
  };
  // 入ったときの場所を記録（フィールド・町からダンジョンへ入ったとき）
  var last = null;
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) {
    var d = D(), p = root.World && root.World.player;
    if (d && m && m.kind === 'dungeon' && last && !isDungeonId(last) && defs()[last]) {
      var lk = defs()[last].kind; var g = DungeonExit.group(m.id);
      if (g && (lk === 'field' || lk === 'town' || defs()[last].region) && p) d.dungeonEntry = { group: g.key, map: last, x: p.x, y: p.y };
    }
    last = m ? m.id : null;
  });
  // 脱出禁止のイベント：隊商の護衛中の砂嵐の回廊（隊商を置いて戻れない）
  ['sandstorm_corridor_1', 'sandstorm_corridor_2'].forEach(function (id) {
    var def = defs()[id]; if (!def || def.noEscape) return;
    def.noEscape = function (d) { return d && d.flags && d.flags.caravan_escort && !d.flags.caravan_done ? '隊商を砂嵐の中に置いては戻れない。（隊商の護衛中は使えない）' : false; };
  });

  root.DungeonExit = DungeonExit;
})(typeof window !== 'undefined' ? window : globalThis);
