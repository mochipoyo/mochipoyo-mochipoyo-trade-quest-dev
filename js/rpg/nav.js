/* =========================================================
   RPG / Nav (v6.2) : 「次の目的地」ナビ（2D/3D 共通。描画は含まない）
   ・OBJECTIVES（js/data/objectives.js）と QUESTS・State.data.flags/quests から「いまの目的」を決める
   ・目的地の座標は MAP_DEFS（NPC・イベント・宝箱・場所）から引く。NPC が歩いていれば今いる位置
   ・いまの地図での「次に向かう場所（hop）」を、地図どうしのつながり（出入口・建物の扉・潜航装置・海路）から求める
     → 町の中の人なら町の入口、別の地域なら海路の端や船、ダンジョンなら階段。扉や試練でふさがれていれば、その扉
   ・まだ通れない出入口（needFlag）・隠された場所・持っていない乗り物の海路は通らない（未開放の場所へ誤って案内しない）
   ・会話やイベントの最中は計算し直さない（マーカーが不用意に動かない）
   ・描画（ミニマップ・拡大マップ・世界地図・フィールド・3D）は Nav.markers() / Nav.lane() / Nav.region() を読むだけ
   ========================================================= */
(function (root) {
  'use strict';
  var Nav = { _cache: null, _at: 0, _key: '' };
  function D() { return root.State && root.State.data; }
  function DEFS() { return root.MAP_DEFS || {}; }
  function QS() { return root.QUESTS || {}; }
  function OBJ() { return root.OBJECTIVES || []; }

  /* ---------- 設定 ---------- */
  Nav.enabled = function () { var d = D(); return !!(d && d.settings && d.settings.nav !== 'off'); };
  Nav.detail = function () { var d = D(); return !!(d && d.settings && d.settings.navHint === 'detail'); };

  /* ---------- 条件 ---------- */
  // 'flag:x' / 'item:id' / 'item:id>=3' / 'chest:map:id' / 'quest:id'（達成） … '|' で「どれか」
  function met(need) {
    if (!need) return true; var d = D();
    return need.split('|').some(function (tok) {
      var p = tok.split(':'); var k = p[0];
      if (k === 'flag') return !!d.flags[p[1]];
      if (k === 'item') { var m = /^([a-z0-9_]+)(>=(\d+))?$/.exec(p[1]); if (!m) return false; return (d.inventory[m[1]] || 0) >= (m[3] ? +m[3] : 1); }
      if (k === 'chest') return !!d.chests[p[1] + ':' + p[2]];
      if (k === 'quest') return !!(d.quests[p[1]] && d.quests[p[1]].state === 'done');
      return false;
    });
  }
  Nav.met = met;
  function questState(id) { var s = D().quests[id]; return s ? s.state : null; }
  function entryDone(e) { if (e.done === '_start') return !!questState(e.q); return !!D().flags[e.done] || questState(e.q) === 'done'; }
  Nav.entryDone = entryDone;

  /* ---------- 参照 → 座標 ---------- */
  Nav.resolve = function (ref) {
    if (!ref) return null; var p = ref.split(':'); var kind = p[0], defs = DEFS();
    if (kind === 'loc') { var rd = defs[p[1]]; var L = rd && (rd.locations || []).filter(function (l) { return l.id === p[2]; })[0]; return L ? { ref: ref, kind: 'loc', map: p[1], x: L.x, y: L.y, label: L.name, loc: L } : null; }
    if (kind === 'map') { return defs[p[1]] ? { ref: ref, kind: 'map', map: p[1], x: null, y: null, label: defs[p[1]].name } : null; }
    var def = defs[p[1]]; if (!def) return null;
    if (kind === 'npc') {
      var n = (def.npcs || []).filter(function (o) { return o.id === p[2]; })[0]; if (!n) return null;
      var live = root.World && root.World.maps && root.World.maps[p[1]]; var ln = live ? live.npcs.filter(function (o) { return o.id === p[2]; })[0] : null;
      var d = D(); var hidden = (n.showIf && !d.flags[n.showIf]) || (n.hideIf && d.flags[n.hideIf]);
      return { ref: ref, kind: 'npc', map: p[1], x: ln ? ln.x : n.x, y: ln ? ln.y : n.y, id: n.id, hidden: !!hidden, npc: ln || n };
    }
    if (kind === 'ev') { var xy = p[2].split(','); var ex = +xy[0], ey = +xy[1]; var e = (def.events || []).filter(function (o) { return o.x === ex && o.y === ey; })[0]; return e ? { ref: ref, kind: 'ev', map: p[1], x: ex, y: ey, ev: e } : null; }
    if (kind === 'chest') { var c = (def.chests || []).filter(function (o) { return o.id === p[2]; })[0]; return c ? { ref: ref, kind: 'chest', map: p[1], x: c.x, y: c.y, id: c.id } : null; }
    return null;
  };

  /* ---------- 地図どうしのつながり ---------- */
  var GRAPH = null;
  function graph() {
    if (GRAPH) return GRAPH; GRAPH = {}; var defs = DEFS();
    function add(from, e) { e.from = from; (GRAPH[from] = GRAPH[from] || []).push(e); }
    Object.keys(defs).forEach(function (id) {
      var def = defs[id];
      (def.warps || []).forEach(function (w) { if (w.to && defs[w.to]) add(id, { kind: 'warp', x: w.x, y: w.y, to: w.to, tx: w.tx, ty: w.ty, need: w.needFlag, hidden: w.hidden, name: w.name }); });
      (def.buildings || []).forEach(function (b) { if (!b.interior || !defs[b.interior]) return; var dx = b.doorX === undefined ? 2 : b.doorX, h = b.h || 3; add(id, { kind: 'door', x: b.x + dx, y: b.y + h - 1, to: b.interior, show: b.showIf, name: b.name }); });
      (def.events || []).forEach(function (e) { if ((e.type === 'dive' || e.type === 'hole') && e.to && defs[e.to]) add(id, { kind: e.type, x: e.x, y: e.y, to: e.to, tx: e.tx, ty: e.ty, need: e.needFlag }); });
    });
    (root.SEA_ROUTES || []).forEach(function (r) { if (defs[r.from.map] && defs[r.to.map]) add(r.from.map, { kind: 'sea', route: r, to: r.to.map, edge: r.from.edge, need: r.needFlag }); });
    return GRAPH;
  }
  Nav.graph = graph;
  Nav.resetGraph = function () { GRAPH = null; };
  function usableVehicles(r) { var V = root.Vehicle; return r.vehicle.filter(function (v) { return V && V.owned(v); }); }
  // 同じ地図の扉・試練・関所を開けると通れるようになる出入口（鍵を持っている／試練は挑める／関所の条件を満たしている）
  function openableBy(mapId, flag) {
    var def = DEFS()[mapId]; var d = D(); if (!def) return false;
    return (def.events || []).some(function (ev) {
      if (ev.doneFlag !== flag || !BLOCK[ev.type]) return false;
      if (ev.type === 'locked') return !!(ev.key && root.State.hasItem && root.State.hasItem(ev.key));
      if (ev.type === 'gate') return !ev.needFlag || !!d.flags[ev.needFlag];
      if (ev.type === 'rank_door') return !!(root.Growth && root.Growth.rankReached && root.Growth.rankReached(ev.rank));
      return ev.type === 'trial';
    });
  }
  function edgeOpen(e) {
    var d = D(); if (e.need && !d.flags[e.need] && !(e.kind === 'warp' && openableBy(e.from, e.need))) return false; if (e.show && !d.flags[e.show]) return false;
    if (e.kind === 'sea') return usableVehicles(e.route).length > 0;
    return true;
  }
  // 地図 from → to の移動計画。状態＝（地図, 乗っている乗り物）。乗り物は「その地図に停めてある」ときだけ乗れる
  // 戻り値：[{ type: 'edge', e, v } | { type: 'board', v, map } | { type: 'land', map }]。virtual=true なら、持っている乗り物はどこでも乗れるものとして探す（「乗り物がない」の判定用）
  Nav.plan = function (from, to, virtual) {
    var G = graph(); var d = D(); var V = root.Vehicle; var owned = Object.keys(root.VEHICLES || {}).filter(function (v) { return V && V.owned(v); });
    function parkedAt(v, mapId) { if (virtual) return true; var s = V.state(v); return !!(s && s.map === mapId && d.aboard !== v); }
    var dist = {}, prev = {}, done = {}, open = [];
    function push(k, c, pv) { if (dist[k] === undefined || c < dist[k]) { dist[k] = c; prev[k] = pv; open.push(k); } }
    var cur = from + '|' + (d.aboard || ''); push(cur, 0, null); if (d.aboard) push(from + '|', 0.2, { from: cur, mv: { type: 'land', map: from } });
    var goal = null;
    while (open.length) {
      var bi = 0; for (var i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i; var k = open.splice(bi, 1)[0]; if (done[k]) continue; done[k] = 1;
      var sp = k.split('|'); var mapId = sp[0], v = sp[1] || null; if (mapId === to) { goal = k; break; }
      var c0 = dist[k];
      if (!v) {
        (G[mapId] || []).forEach(function (e) { if (e.kind === 'sea' || !edgeOpen(e)) return; push(e.to + '|', c0 + 1, { from: k, mv: { type: 'edge', e: e, v: null } }); });
        if (DEFS()[mapId] && DEFS()[mapId].region) owned.forEach(function (ov) { if (parkedAt(ov, mapId)) push(mapId + '|' + ov, c0 + 0.5, { from: k, mv: { type: 'board', v: ov, map: mapId } }); });
      } else {
        (G[mapId] || []).forEach(function (e) { if (e.kind !== 'sea' || e.route.vehicle.indexOf(v) < 0 || (e.need && !d.flags[e.need])) return; push(e.to + '|' + v, c0 + 4, { from: k, mv: { type: 'edge', e: e, v: v } }); });
        push(mapId + '|', c0 + 0.2, { from: k, mv: { type: 'land', map: mapId } });
      }
    }
    if (!goal) return null; var out = []; for (var kk = goal; prev[kk]; kk = prev[kk].from) out.unshift(prev[kk].mv); return out;
  };
  // 互換：エッジだけの列
  Nav.path = function (from, to) { var pl = Nav.plan(from, to); return pl ? pl.filter(function (m) { return m.type === 'edge'; }).map(function (m) { return m.e; }) : null; };

  /* ---------- いまの目的 ---------- */
  function chapterOf(q) { var Q = QS()[q]; if (Q && Q.chapter) return Q.chapter; var m = /^main_(\d+)$/.exec(q); return m ? +m[1] : 0; }
  function stepText(e) {
    var Q = QS()[e.q]; if (e.text) return e.text;
    if (Q && Q.steps) for (var i = 0; i < Q.steps.length; i++) if (Q.steps[i][0] === e.done) return Q.steps[i][1];
    if (e.done === '_start') return '「' + (Q ? Q.title : e.q) + '」の舞台へ向かう';
    return Q ? Q.desc : '';
  }
  var START_TEXT = { main_1: '村長の家で、村長の話を聞く', main_6: '灰の峠を越えて、北へ向かう', main_8: '港町マリナへ戻る', main_10: '断裂群島の東の遠洋航路の先へ向かう', main_13: '時の神殿領の東の遠洋航路の先へ向かう' };
  var NOSTEP_TEXT = { king_quest1: 'リヴェル城で、リヴェル王に会う', forest_boss: '迷いの森の奥の祠で「トレンド迷子」を倒し、祠を調べる', king_quest2: 'リヴェル王に報告する', cave_boss: '忘却の洞窟の最深部で、クリスタルの欠片を取り戻す', shard_returned: 'リヴェル王に欠片を届ける' };
  function textOf(e) { if (e.done === '_start' && START_TEXT[e.q]) return START_TEXT[e.q]; if (NOSTEP_TEXT[e.done]) return NOSTEP_TEXT[e.done]; return stepText(e); }
  // メインクエストの並び（QUESTS の main を章の順に）
  function mains() { var Q = QS(); return Object.keys(Q).filter(function (k) { return Q[k].main; }).sort(function (a, b) { return chapterOf(a) - chapterOf(b); }); }
  // 主目標になるクエスト：進行中のメイン（章の若い順）。なければ、まだ始まっていない最初のメイン（'_start' があるもの）
  function questOrder() {
    var ms = mains(); var act = ms.filter(function (q) { return questState(q) === 'active'; });
    if (act.length) return act;
    for (var i = 0; i < ms.length; i++) { if (questState(ms[i]) === 'done') continue; var hasStart = OBJ().some(function (e) { return e.q === ms[i] && e.done === '_start'; }); return hasStart ? [ms[i]] : []; }
    return [];
  }
  function currentEntry(q) { var list = OBJ().filter(function (e) { return e.q === q; }); for (var i = 0; i < list.length; i++) if (!entryDone(list[i])) return list[i]; return null; }
  // 1つの目的の、実際に向かう先（先にすること pre・どれからでもよい any を考える）
  function targetsOf(e) {
    var out = { primary: null, others: [], pre: null };
    var pre = (e.pre || []).filter(function (p) { return !met(p.need); })[0];
    if (pre) {
      out.pre = pre;
      var list = pre.any ? pre.any.filter(function (r) { var c = r.split(':'); return !(c[0] === 'chest' && D().chests[c[1] + ':' + c[2]]); }) : [pre.t];
      var rs = list.map(Nav.resolve).filter(Boolean); out.primary = pickNear(rs); out.others = rs.filter(function (r) { return r !== out.primary; });
      return out;
    }
    if (e.any) { var rs2 = e.any.filter(function (a) { return !D().flags[a.done]; }).map(function (a) { return Nav.resolve(a.t); }).filter(Boolean); if (rs2.length) { out.primary = pickNear(rs2); out.others = rs2.filter(function (r) { return r !== out.primary; }); return out; } }
    out.primary = Nav.resolve(e.t);
    return out;
  }
  // 候補のうち、いまの地図（なければ同じ地域）にあるものを先に
  function pickNear(rs) {
    var W = root.World; var cur = W && W.map ? W.map.id : null; if (!rs.length) return null;
    var same = rs.filter(function (r) { return r.map === cur; }); if (same.length) { var p = W.player; same.sort(function (a, b) { return (Math.abs(a.x - p.x) + Math.abs(a.y - p.y)) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)); }); return same[0]; }
    var reg = Nav.regionOf(cur); var sr = rs.filter(function (r) { return Nav.regionOf(r.map) === reg; }); return sr[0] || rs[0];
  }
  // 地図が属する地域（地域マップそのものならその id）
  Nav.regionOf = function (mapId) {
    if (!mapId) return null; var def = DEFS()[mapId]; if (def && def.region) return mapId;
    if (Nav._regionCache && Nav._regionCache[mapId] !== undefined) return Nav._regionCache[mapId];
    Nav._regionCache = Nav._regionCache || {};
    var r = null; var wp = root.Minimap && root.Minimap.worldPosOf ? root.Minimap.worldPosOf(mapId) : null; if (wp && wp.region) r = wp.region;
    if (!r) { // 潜航装置などでしか行けない地図：入口を持つ地図の地域
      var G = graph(); Object.keys(G).some(function (from) { return G[from].some(function (e) { if (e.to === mapId && e.kind !== 'sea' && from !== mapId) { var rr = DEFS()[from] && DEFS()[from].region ? from : (Nav._regionCache[from] !== undefined ? Nav._regionCache[from] : null); if (rr) { r = rr; return true; } } return false; }); });
    }
    Nav._regionCache[mapId] = r; return r;
  };
  // その地図の、地域マップ上の入口（場所のアイコン）
  Nav.entranceOf = function (mapId) { var wp = root.Minimap && root.Minimap.worldPosOf ? root.Minimap.worldPosOf(mapId) : null; return wp && wp.loc ? wp.loc : null; };

  /* ---------- いまの地図で次に向かう場所 ---------- */
  var BLOCK = { locked: '鍵のかかった扉', trial: '試練の扉', gate: '関所', rank_door: '紋章の扉' };
  function hopFor(t) {
    var W = root.World; if (!t || !W || !W.map) return null; var m = W.map, p = W.player;
    if (t.map === m.id) { if (t.x === null) return { x: p.x, y: p.y, kind: 'here', label: '到着' }; return refine(m, { x: t.x, y: t.y, kind: 'target', label: labelOf(t) }); }
    var plan = Nav.plan(m.id, t.map);
    if (!plan) {
      var vp = Nav.plan(m.id, t.map, true); var need = vp && vp.filter(function (mv) { return mv.type === 'board'; })[0];
      if (need) { var vn = root.VEHICLES[need.v].name; return { none: true, needVehicle: need.v, reason: vn + 'が近くにない。' + (need.v === 'airship' ? 'メニュー →「ファストトラベル」→「乗り物を母港へ戻す」で母港に戻せる。' : '港町マリナの船乗りに頼むか、メニュー →「ファストトラベル」→「乗り物を母港へ戻す」で呼び戻せる。') }; }
      return { none: true, reason: 'まだ行き方がない（物語を進めると道が開ける）' };
    }
    var mv0 = plan[0]; if (mv0.type === 'land') plan = plan.slice(1), mv0 = plan[0];
    if (!mv0) return { x: p.x, y: p.y, kind: 'here', label: '到着' };
    if (mv0.type === 'board') { var vs0 = root.Vehicle.state(mv0.v); return { x: vs0.x, y: vs0.y, kind: 'vehicle', label: root.VEHICLES[mv0.v].name + (D().aboard ? 'に乗り換える' : 'に乗る'), vehicle: mv0.v }; }
    var e0 = mv0.e; var path = plan.filter(function (mv) { return mv.type === 'edge'; }).map(function (mv) { return mv.e; });
    if (e0.kind === 'sea') return seaHop(m, e0, path, t);
    // 同じ行き先の出入口のうち、いちばん近いもの
    var cands = (graph()[m.id] || []).filter(function (e) { return e.to === e0.to && e.kind === e0.kind && edgeOpen(e); });
    cands.sort(function (a, b) { return (Math.abs(a.x - p.x) + Math.abs(a.y - p.y)) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)); });
    var e = cands[0] || e0; var toDef = DEFS()[e.to] || {};
    var lbl = e.kind === 'door' ? (e.name || toDef.name) + 'の入口' : e.kind === 'dive' ? '潜航装置（' + toDef.name + 'へ）' : (m.def && m.def.region ? (e.name || toDef.name) : (toDef.region ? '出口' : (toDef.name || '') + 'へ'));
    return refine(m, { x: e.x, y: e.y, kind: 'exit', label: lbl, to: e.to });
  }
  function labelOf(t) { if (t.kind === 'npc') { return '話す相手'; } if (t.kind === 'chest') return '宝箱'; if (t.kind === 'loc') return t.label; if (t.kind === 'ev') return BLOCK[t.ev.type] || (t.ev.type === 'boss' ? '強敵の気配' : t.ev.type === 'learn' ? '石碑（試練）' : '調べる場所'); return ''; }
  // 海路：乗っていれば海路の端、船がこの地域にあれば船、なければ「乗り物がない」
  function seaHop(m, e0, path, t) {
    var d = D(); var V = root.Vehicle; var H = root.Harbors; var r = e0.route; var aboard = d.aboard;
    var destHarbor = H ? H.list(r.to.map)[0] : null;
    var along = destHarbor ? ((e0.edge === 'east' || e0.edge === 'west') ? destHarbor.moor.y : destHarbor.moor.x) : null;
    if (along === null && path.length === 1 && t.x !== null) along = (e0.edge === 'east' || e0.edge === 'west') ? t.y : t.x;
    if (aboard && r.vehicle.indexOf(aboard) >= 0) {
      var ep = H ? H.edgePoint(m, e0.edge, along, aboard, W().player.x, W().player.y) : null;
      return ep ? { x: ep.x, y: ep.y, kind: 'edge', label: r.name, sea: true } : { none: true, reason: r.name + 'の出口が見つからない' };
    }
    var parked = usableVehicles(r).map(function (v) { var s = V.state(v); return s && s.map === m.id ? { id: v, x: s.x, y: s.y } : null; }).filter(Boolean)[0];
    if (parked) return { x: parked.x, y: parked.y, kind: 'vehicle', label: root.VEHICLES[parked.id].name + 'に乗る', vehicle: parked.id };
    var names = r.vehicle.map(function (v) { return root.VEHICLES[v] ? root.VEHICLES[v].name : v; }).join('・');
    return { none: true, needVehicle: true, reason: names + 'がこの地域にない。港町マリナの船乗り、またはメニュー →「ファストトラベル」→「乗り物を母港へ戻す」で呼び戻せる' };
  }
  function W() { return root.World; }
  // 同じ地図の中で、目的地までの道が扉・試練・関所でふさがれていないか。ふさがれていれば、その扉を先に案内する
  function refine(m, hop) {
    var p = W().player; if (!p) return hop;
    if (m.def && m.def.region) {   // 地域マップ：陸がつながっていなければ船
      var H = root.Harbors; if (!H) return hop; var d = D();
      if (d.aboard) return hop;
      var a = H.landmass(m, p.x, p.y), b = H.landmass(m, hop.x, hop.y);
      if (a && b && a.id !== b.id) { var vs = root.Vehicle.onMap(m.id).filter(function (v) { return !v.aboard; }); if (vs.length) { vs.sort(function (u, v) { return (Math.abs(u.x - p.x) + Math.abs(u.y - p.y)) - (Math.abs(v.x - p.x) + Math.abs(v.y - p.y)); }); return { x: vs[0].x, y: vs[0].y, kind: 'vehicle', label: root.VEHICLES[vs[0].id].name + 'で渡る', vehicle: vs[0].id, after: hop }; } }
      return hop;
    }
    var key = m.id + ':' + p.x + ',' + p.y + '>' + hop.x + ',' + hop.y + ':' + flagCount();
    if (Nav._refKey === key) return Nav._refVal || hop;
    var res = hop; var r1 = reach(m, p.x, p.y, hop.x, hop.y, false);
    if (!r1) { var r2 = reach(m, p.x, p.y, hop.x, hop.y, true); if (r2 && r2.blocker) { var be = r2.blocker; res = { x: be.x, y: be.y, kind: 'blocker', label: BLOCK[be.type] || '扉', ev: be, after: hop }; } }
    Nav._refKey = key; Nav._refVal = res; return res;
  }
  function flagCount() { var d = D(); var n = 0; for (var k in d.flags) if (d.flags[k]) n++; return n + ':' + Object.keys(d.chests).length; }
  function blockerAt(m, x, y) { var e = m.eventAt(x, y); if (!e || !e.solid || !BLOCK[e.type]) return null; if (e.doneFlag && D().flags[e.doneFlag]) return null; return e; }
  function reach(m, sx, sy, tx, ty, through) {
    var Wd = m.w, Hh = m.h; var prev = new Int32Array(Wd * Hh).fill(-2); var q = [sy * Wd + sx]; prev[sy * Wd + sx] = -1; var head = 0; var T = root.Tiles; var d = D();
    function goal(x, y) { var dd = Math.abs(x - tx) + Math.abs(y - ty); if (dd <= 1) return true; if (dd === 2 && (x === tx || y === ty)) { var mx = (x + tx) >> 1, my = (y + ty) >> 1; return m.tiles[my][mx] === 'counter'; } return false; }
    while (head < q.length) {
      var c = q[head++]; var cx = c % Wd, cy = (c / Wd) | 0;
      if (goal(cx, cy)) { if (!through) return { ok: true }; var bl = null; for (var k = c; k >= 0; k = prev[k]) { var kx = k % Wd, ky = (k / Wd) | 0; var b = blockerAt(m, kx, ky); if (b) bl = b; } return { ok: true, blocker: bl }; }
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var nx = cx + nb[i][0], ny = cy + nb[i][1]; if (nx < 0 || ny < 0 || nx >= Wd || ny >= Hh) continue; var kk = ny * Wd + nx; if (prev[kk] !== -2) continue;
        var t = m.tiles[ny][nx]; var be = blockerAt(m, nx, ny);
        if (be) { if (!through) continue; }
        else { if (T.isSolid(t) && !(through && (t === 'door_locked' || t === 'gate' || t === 'fence'))) continue; var ev = m.eventAt(nx, ny); if (ev && ev.solid && !(ev.doneFlag && d.flags[ev.doneFlag]) && !(nx === tx && ny === ty)) continue; if (root.Search && root.Search.solidAt(m, nx, ny)) continue; }
        prev[kk] = c; q.push(kk);
      }
    }
    return null;
  }

  /* ---------- まとめ：いまの案内 ---------- */
  Nav.compute = function (force) {
    var Wd = W(); var d = D(); if (!d || !Wd || !Wd.map || !Wd.player) return null;
    var busy = Wd.busy || (root.Engine && root.Engine.top && Wd.scene && root.Engine.top() !== Wd.scene);
    var key = Wd.map.id + '|' + Wd.player.x + ',' + Wd.player.y + '|' + (d.aboard || '') + '|' + flagCount() + '|' + Object.keys(d.quests).length + '|' + Object.keys(d.quests).filter(function (k) { return d.quests[k].state === 'done'; }).length;
    var now = Date.now();
    if (!force && Nav._cache && (busy || (key === Nav._key && now - Nav._at < 1500))) return Nav._cache;   // 会話・イベントの最中は動かさない
    Nav._key = key; Nav._at = now; Nav._cache = Nav.build(); return Nav._cache;
  };
  Nav.build = function () {
    var qs = questOrder(); if (!qs.length) { var all = mains().every(function (q) { return questState(q) === 'done'; }); return { none: true, cleared: all, text: all ? 'メインストーリーはすべて達成した。' : '' }; }
    var q = qs[0]; var e = currentEntry(q); if (!e) return { none: true, text: '' };
    var tg = targetsOf(e); var t = tg.primary;
    var res = { q: q, chapter: chapterOf(q), title: (QS()[q] || {}).title || '', entry: e, text: tg.pre ? tg.pre.text : textOf(e), stepText: textOf(e), target: t, others: tg.others.slice(), pre: tg.pre };
    // 順番自由の目的（group）：ほかの未達成も候補に
    if (!tg.pre && e.group) OBJ().filter(function (o) { return o.q === q && o.group === e.group && o !== e && !entryDone(o); }).forEach(function (o) { var r = Nav.resolve(o.t); if (r) res.others.push(r); });
    // ほかに進行中のメイン（章が先のもの）
    res.side = qs.slice(1).map(function (q2) { var e2 = currentEntry(q2); if (!e2) return null; var t2 = targetsOf(e2).primary; return t2 ? { q: q2, chapter: chapterOf(q2), title: (QS()[q2] || {}).title, text: textOf(e2), target: t2 } : null; }).filter(Boolean);
    res.hop = t ? hopFor(t) : null;
    res.region = t ? Nav.regionOf(t.map) : null;
    res.othersHop = res.others.map(function (o) { return o.map === (W().map && W().map.id) ? { x: o.x, y: o.y, kind: 'target', label: labelOf(o) } : null; }).filter(Boolean);
    return res;
  };
  Nav.current = function () { return Nav.enabled() ? Nav.compute() : null; };

  /* ---------- 描画用：地図ごとのマーカー ---------- */
  // 戻り値 [{ x, y, primary, label }]。mapId がいまの地図なら hop、ほかの地図なら目的地（またはその地図にある入口）
  Nav.markers = function (mapId) {
    var c = Nav.current(); if (!c || c.none || !c.target) return []; var Wd = W(); var out = [];
    var cur = Wd.map && Wd.map.id;
    if (mapId === cur) {
      if (c.hop && !c.hop.none && c.hop.kind !== 'here') out.push({ x: c.hop.x, y: c.hop.y, primary: true, label: c.hop.label, kind: c.hop.kind });
      if (c.hop && c.hop.after && c.hop.after.x !== undefined) out.push({ x: c.hop.after.x, y: c.hop.after.y, primary: false, label: c.hop.after.label });
      c.othersHop.forEach(function (o) { if (!out.some(function (m) { return m.x === o.x && m.y === o.y; })) out.push({ x: o.x, y: o.y, primary: false, label: o.label }); });
      return out;
    }
    var all = [{ t: c.target, primary: true }].concat(c.others.map(function (o) { return { t: o, primary: false }; }));
    all.forEach(function (a) {
      var t = a.t; if (t.map === mapId && t.x !== null) { out.push({ x: t.x, y: t.y, primary: a.primary, label: labelOf(t) }); return; }
      var def = DEFS()[mapId]; if (!def || !def.region) return;
      // 地域マップ：目的地がこの地域の町やダンジョンの中なら、その入口
      var L = t.kind === 'loc' && t.map === mapId ? t.loc : Nav.entranceOf(t.map); if (L && L.region === mapId && !(L.hidden && !D().flags[L.needFlag])) out.push({ x: L.x, y: L.y, primary: a.primary, label: L.name });
    });
    return out;
  };
  // 世界地図で強調する地域
  Nav.region = function () { var c = Nav.current(); return c && !c.none ? c.region : null; };

  /* ---------- 航路（乗船中のミニマップの点線） ---------- */
  Nav.lane = function () {
    var c = Nav.current(); var d = D(); var Wd = W(); var H = root.Harbors; if (!c || c.none || !d.aboard || !H || !Wd.map.def.region) return null;
    var m = Wd.map, p = Wd.player, vid = d.aboard, hop = c.hop; if (!hop || hop.none) return null;
    if (hop.kind === 'edge') { var path = H.lane(m, p.x, p.y, hop.x, hop.y, vid, false); return path ? { path: path, end: { x: hop.x, y: hop.y }, label: hop.label } : null; }
    // 陸の目的地：近くの桟橋、なければ目的地にいちばん近い岸
    var land = Nav.landingNear(m, hop.x, hop.y, vid); if (!land) return null;
    var path2 = H.lane(m, p.x, p.y, land.water.x, land.water.y, vid, false);
    return path2 ? { path: path2, end: land.land, landing: land, label: land.name || '上陸地点' } : null;
  };
  var landCache = {};
  Nav.landingNear = function (m, x, y, vid) {
    var k = m.id + ':' + x + ',' + y + ':' + vid; if (landCache[k] !== undefined) return landCache[k];
    var H = root.Harbors; var V = root.Vehicle; var res = null;
    var mass = H.landmass(m, x, y);
    H.list(m.id).forEach(function (h) { if (res) return; var hl = h.land || h.moor; var hm = H.landmass(m, hl.x, hl.y) || H.landmass(m, h.moor.x + 1, h.moor.y); if (mass && hm && hm.id === mass.id && Math.abs(hl.x - x) + Math.abs(hl.y - y) <= 40) res = { land: { x: hl.x, y: hl.y }, water: { x: h.moor.x, y: h.moor.y }, name: h.name, harbor: h.id }; });
    if (!res && V.flies && V.flies(vid)) res = { land: { x: x, y: y }, water: { x: x, y: y }, name: '着陸地点' };
    if (!res) {   // 目的地から陸を歩いて、乗り物の進める海に面した最初のマス
      var Wd = m.w, Hh = m.h; var seen = new Uint8Array(Wd * Hh); var q = [[x, y]]; seen[y * Wd + x] = 1; var head = 0;
      while (head < q.length && !res) { var cc = q[head++]; var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var i = 0; i < 4 && !res; i++) { var nx = cc[0] + nb[i][0], ny = cc[1] + nb[i][1]; if (nx < 0 || ny < 0 || nx >= Wd || ny >= Hh) continue; if (V.terrainOk(vid, m, nx, ny) && V.openWater(m, nx, ny, vid, 60)) { res = { land: { x: cc[0], y: cc[1] }, water: { x: nx, y: ny }, name: '上陸地点' }; break; } var kk = ny * Wd + nx; if (seen[kk]) continue; var t = m.tiles[ny][nx]; if (root.Tiles.isWater(t) || (root.Tiles.isSolid(t) && !{ village: 1, castle_icon: 1, cave_icon: 1, tower_icon: 1 }[t])) continue; seen[kk] = 1; q.push([nx, ny]); }
        if (q.length > 6000) break; }
    }
    landCache[k] = res; return res;
  };

  /* ---------- ヒント画面のための文 ---------- */
  Nav.placeText = function (t, detail) {
    if (!t) return '不明'; var d = D(); var reg = Nav.regionOf(t.map); var regName = reg && DEFS()[reg] ? DEFS()[reg].name : '';
    var L = t.kind === 'loc' ? t.loc : Nav.entranceOf(t.map); var visited = L ? !!d.visited[L.to] : !!d.visited[t.map];
    var place = regName; if (L && (visited || detail)) place += (place ? '・' : '') + L.name;
    var inner = DEFS()[t.map]; if (inner && !inner.region && (visited || detail) && (!L || inner.name !== L.name)) place += '（' + inner.name + '）';
    return place || (inner ? inner.name : '不明');
  };
  Nav.panel = function () {
    var c = Nav.compute(true); if (!c) return null; if (c.none) return { none: true, text: c.text || '今は、メインストーリーの目的地はない。' };
    var e = c.entry; var hs = (e.h || []).slice(0, 3);
    return {
      header: '【第' + c.chapter + '章：' + c.title + '】', objective: c.text, step: c.stepText, place: e.area && !c.pre ? e.area : Nav.placeText(c.target, false), placeDetail: Nav.placeText(c.target, true),
      hints: hs, note: c.hop && c.hop.none ? c.hop.reason : (c.hop && c.hop.kind === 'blocker' ? 'この先へ進むには「' + c.hop.label + '」を開ける必要がある。' : (c.hop && c.hop.kind === 'vehicle' ? c.hop.label + '（ミニマップの赤丸）' : '')),
      others: c.others.length, side: c.side.map(function (s) { return '第' + s.chapter + '章「' + s.title + '」：' + s.text; })
    };
  };
  // 閉ざされた場所の案内（ヒント設定が「詳細」のときは、開く条件になっているステップを示す）
  Nav.unlockHint = function (flag) {
    if (!flag) return null; var Q = QS(); var hit = null;
    Object.keys(Q).some(function (k) { var st = Q[k].steps || []; for (var i = 0; i < st.length; i++) if (st[i][0] === flag) { hit = { q: k, text: st[i][1] }; return true; } return false; });
    if (!hit) return '（物語を進めると、入れるようになるかもしれない）';
    return Nav.detail() ? '（ヒント：' + hit.text + '）' : '（物語を進めると入れるようになる）';
  };

  /* ---------- 到着フラグ（v6.2 修正：ステップのフラグがどこでも立たず、クエストの「目的」が先へ進まなかった） ---------- */
  // zeromea_arrived（第11章）・sky_arrived（第14章）：その地域に入ったときに立てる
  var ARRIVE = { world_machine: ['main_11', 'zeromea_arrived'], world_sky: ['main_14', 'sky_arrived'] };
  Nav.onEnter = function (map) { var d = D(); if (!d || !map) return; var a = ARRIVE[map.id]; if (a && questState(a[0]) && !d.flags[a[1]]) d.flags[a[1]] = true; };
  // 古いセーブ：すでに先のステップへ進んでいる・達成済みなら、到着フラグも立てる（ほかの判定には使われていないフラグ）
  Nav.repairFlags = function (d) {
    if (!d || !d.flags) return; var Q = QS();
    Object.keys(ARRIVE).forEach(function (mid) { var a = ARRIVE[mid]; var q = Q[a[0]]; if (!q || !q.steps || d.flags[a[1]]) return; var done = d.quests && d.quests[a[0]] && d.quests[a[0]].state === 'done'; var later = q.steps.some(function (s) { return s[0] !== a[1] && d.flags[s[0]]; }); var here = d.pos && d.pos.map === mid; if (done || later || (here && d.quests && d.quests[a[0]])) d.flags[a[1]] = true; });
  };
  if (root.MAP_ENTER_HOOKS) root.MAP_ENTER_HOOKS.push(function (map) { Nav.onEnter(map); });
  else root.MAP_ENTER_HOOKS = [function (map) { Nav.onEnter(map); }];
  root.Nav = Nav;
})(typeof window !== 'undefined' ? window : globalThis);
