/* =========================================================
   RPG / Search (v6.1) : 「調べる」の共通システム（光る場所・壺・樽・木箱・井戸・机・石碑など）
   ・探索ポイントはデータ（SEARCH_POINTS／Search.register）。画像や3Dモデルには依存しない
     各ポイント：{ id, map, x, y, kind, range, loot:{item,qty}|{gold}|null, oopart, enemies, event, requireFlag, respawn, msg }
       kind：sparkle（地面の光る場所・通れる）／pot（壺・通れない）／desk・stone など（通れない）
       range：調べられる距離（1＝となりのマスから。sparkle は上に立っても調べられる）
       respawn：'never'（1回だけ）／'inn'（宿に泊まると中身が戻る）
   ・地形の樽（q）・木箱（z）・井戸（j）は、データがなくても自動で「調べる」対象になる（位置から中身が決まる。1回だけ）
   ・取得済みの記録は State.data.searched（id → 取ったときの宿泊回数）。セーブデータに残り、再出現しない
   ・2D の描画（光・壺）は Search.drawAt、3D は Search.forMap で同じデータを使う
   ========================================================= */
(function (root) {
  'use strict';
  var Search = { points: {}, byMap: {}, events: {} };
  var KINDS = {
    sparkle: { name: '光っている場所', solid: false, stand: true },
    relic: { name: '淡く光る場所', solid: false, stand: true },   // v6.1 オーパーツの気配（紫の光）
    pot: { name: '壺', solid: true },
    desk: { name: '机', solid: true }, stone: { name: '石碑', solid: true }, box: { name: '箱', solid: true }, shelf: { name: '棚', solid: true },
    barrel: { name: '樽', tile: 'barrel', solid: true }, crate: { name: '木箱', tile: 'crate', solid: true }, well: { name: '井戸', tile: 'well', solid: true }
  };
  Search.KINDS = KINDS;
  function D() { return root.State && root.State.data; }
  function searched() { var d = D(); if (!d.searched) d.searched = {}; return d.searched; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- 登録 ---------- */
  Search.register = function (list) {
    (list || []).forEach(function (p) {
      if (!p || !p.id || !p.map) return; p.kind = p.kind || 'sparkle'; p.range = p.range || (KINDS[p.kind] && KINDS[p.kind].stand ? 1 : 1); p.respawn = p.respawn || 'never';
      Search.points[p.id] = p; (Search.byMap[p.map] = Search.byMap[p.map] || {})[p.x + ',' + p.y] = p;
    });
  };
  Search.event = function (id, fn) { Search.events[id] = fn; };
  Search.forMap = function (mapId) { var m = Search.byMap[mapId]; return m ? Object.keys(m).map(function (k) { return m[k]; }) : []; };

  /* ---------- 状態 ---------- */
  Search.shown = function (p) { var d = D(); return !p.requireFlag || !!(d && d.flags[p.requireFlag]); };   // 条件（ボス撃破後など）を満たしているか
  Search.taken = function (p) {
    var s = searched(); if (!(p.id in s)) return false;
    if (p.respawn === 'inn') { var d = D(); return (d.counters.inn_rest || 0) <= s[p.id]; }
    return true;
  };
  Search.available = function (p) { return Search.shown(p) && !Search.taken(p); };
  // マス (x,y) にある探索ポイント（データ → 地形の樽・木箱・井戸の順）
  Search.at = function (map, x, y) {
    if (!map) return null; var m = Search.byMap[map.id]; var p = m && m[x + ',' + y];
    if (p && Search.shown(p)) return p;
    var t = map.tiles && map.tiles[y] && map.tiles[y][x];
    if (t === 'barrel' || t === 'crate' || t === 'well') return Search.tilePoint(map, x, y, t);
    return null;
  };
  // 通れないか（壺など。光る場所は通れる）
  Search.solidAt = function (map, x, y) { var m = Search.byMap[map.id]; var p = m && m[x + ',' + y]; return !!(p && Search.shown(p) && KINDS[p.kind] && KINDS[p.kind].solid); };

  /* ---------- 地形の樽・木箱・井戸（データなし）：位置から中身を決める ---------- */
  var TILE_LOOT = {
    1: { items: ['herb', 'onigiri', 'yakitori', 'green_tea', 'antidote', 'herb'], gold: [5, 25] },
    2: { items: ['potion', 'ramen', 'curry_rice', 'coffee', 'ether', 'onigiri'], gold: [20, 90] },
    3: { items: ['hi_potion', 'deluxe_steak', 'fruit_juice', 'hi_ether', 'curry_rice', 'mana_soda'], gold: [60, 240] }
  };
  function tierOf(mapId) { return root.Books && root.Books.tierOf ? root.Books.tierOf(mapId) : 1; }
  Search.tilePoint = function (map, x, y, t) {
    var id = 't:' + map.id + ':' + x + ',' + y; var h = hash(id); var r = (h % 1000) / 1000; var T = TILE_LOOT[tierOf(map.id)];
    var loot = null; var empty = t === 'well' ? 0.75 : 0.5;
    if (r >= empty) { if (r < empty + (1 - empty) * 0.35) loot = { gold: T.gold[0] + (h >>> 10) % (T.gold[1] - T.gold[0] + 1) }; else loot = { item: T.items[(h >>> 7) % T.items.length], qty: 1 }; }
    return { id: id, map: map.id, x: x, y: y, kind: t, loot: loot, respawn: 'never', auto: true };
  };

  /* ---------- 調べる ---------- */
  function nameOf(p) { return (KINDS[p.kind] || {}).name || '何か'; }
  Search.inspect = async function (p) {
    var Win = root.Win, State = root.State, d = D(); var W = root.World;
    if (!p) return false;
    if (!Search.available(p)) { await Win.message([p.kind === 'sparkle' || p.kind === 'relic' ? 'もう何も光っていない。' : p.kind === 'well' ? '井戸の底をのぞいた。……もう何もない。' : nameOf(p) + 'の中は空っぽだ。']); return true; }
    var opening = p.msg ? p.msg.slice() : [p.kind === 'sparkle' || p.kind === 'relic' ? '地面で何かが光っている……' : p.kind === 'well' ? '井戸の中をのぞきこんだ……' : nameOf(p) + 'を調べた。'];
    // 特別なイベント（Search.event で登録した処理）
    if (p.event && Search.events[p.event]) { await Win.message(opening); var r = await Search.events[p.event](p); if (r !== false) mark(p); return true; }
    // 危険な場所：敵が飛び出す（勝てば中身を手に入れる）
    if (p.enemies && p.enemies.length) {
      await Win.message(opening.concat([nameOf(p) + 'の中から魔物が飛び出してきた！']));
      var res = await root.BattleUI.start(p.enemies, { zone: 'search' });
      if (res === 'lost') { await W.gameOver(); return true; }
      if (res !== 'won') return true;   // 逃げたら中身はそのまま
    }
    mark(p);
    var lines = p.enemies && p.enemies.length ? [] : opening;
    if (p.oopart && root.Ooparts) { var got = await root.Ooparts.collect(p.oopart, lines); if (got) return true; }
    if (p.loot && p.loot.item && root.ITEMS[p.loot.item]) { var q = p.loot.qty || 1; State.addItem(p.loot.item, q); lines.push(root.ITEMS[p.loot.item].name + (q > 1 ? 'を' + q + 'つ' : '') + 'を手に入れた！'); if (root.Audio) root.Audio.sfx('chest'); }
    else if (p.loot && p.loot.gold) { d.gold += p.loot.gold; lines.push(p.loot.gold + 'G を見つけた！'); if (root.Audio) root.Audio.sfx('coin'); }
    else lines.push(p.kind === 'well' ? '冷たい水が見えるだけだ。' : p.kind === 'sparkle' ? '……気のせいだったようだ。' : '何も入っていなかった。');
    State.count('search_found'); if (W && W.updateHud) W.updateHud();
    await Win.message(lines); State.autosave();
    return true;
  };
  function mark(p) { var d = D(); searched()[p.id] = d.counters.inn_rest || 0; if (root.Minimap) root.Minimap.markDirty(p.map); }
  Search.mark = mark;

  /* ---------- 2D の描画（光る場所・壺）。3D は js/../three-src の MapScene3D が同じデータで置く ---------- */
  var potCache = null;
  function potImage(TS) {
    if (potCache && potCache.width === TS) return potCache; var c = document.createElement('canvas'); c.width = TS; c.height = TS; var g = c.getContext('2d'); var s = TS / 32;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(16 * s, 28 * s, 10 * s, 3 * s, 0, 0, Math.PI * 2); g.fill();
    var gr = g.createLinearGradient(6 * s, 0, 26 * s, 0); gr.addColorStop(0, '#7a3e1e'); gr.addColorStop(0.45, '#c46a34'); gr.addColorStop(1, '#6a3216');
    g.fillStyle = gr; g.beginPath(); g.moveTo(11 * s, 9 * s); g.bezierCurveTo(3 * s, 14 * s, 4 * s, 27 * s, 16 * s, 28 * s); g.bezierCurveTo(28 * s, 27 * s, 29 * s, 14 * s, 21 * s, 9 * s); g.closePath(); g.fill();
    g.fillStyle = '#8a4a24'; g.fillRect(10 * s, 6 * s, 12 * s, 4 * s); g.fillStyle = '#3a1a0a'; g.fillRect(11 * s, 6 * s, 10 * s, 1.6 * s);
    g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(8 * s, 17 * s); g.quadraticCurveTo(16 * s, 21 * s, 24 * s, 17 * s); g.stroke();
    potCache = c; return c;
  }
  Search.drawList = function (map, cam, x0, y0, x1, y1, TS) {
    var out = []; var m = Search.byMap[map.id]; if (!m) return out; var t = Date.now();
    Object.keys(m).forEach(function (k) {
      var p = m[k]; if (p.x < x0 - 1 || p.x > x1 + 1 || p.y < y0 - 1 || p.y > y1 + 1 || !Search.shown(p)) return;
      if (p.kind === 'sparkle' || p.kind === 'relic') { if (Search.taken(p)) return; var relic = p.kind === 'relic'; out.push({ y: p.y * TS - 1, draw: function (ctx) { drawSparkle(ctx, p.x * TS - cam.x + TS / 2, p.y * TS - cam.y + TS * 0.62, TS, t + (p.x * 97 + p.y * 31) % 1000, relic); } }); }
      else if (p.kind === 'well') return;   // 井戸は地形の絵のまま
      else if (p.kind === 'pot') out.push({ y: p.y * TS, draw: function (ctx) { ctx.drawImage(potImage(TS), p.x * TS - cam.x, p.y * TS - cam.y); } });
      else out.push({ y: p.y * TS, draw: function (ctx) { ctx.fillStyle = '#8a6a4a'; ctx.fillRect(p.x * TS - cam.x + TS * 0.2, p.y * TS - cam.y + TS * 0.35, TS * 0.6, TS * 0.5); } });
    });
    return out;
  };
  function drawSparkle(ctx, cx, cy, TS, t, relic) {
    var ph = (t % 1400) / 1400; var a = 0.55 + 0.45 * Math.sin(ph * Math.PI * 2); var r = TS * (0.16 + 0.05 * Math.sin(ph * Math.PI * 4));
    ctx.save(); var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, TS * 0.42); g.addColorStop(0, relic ? 'rgba(210,170,255,' + (0.75 * a) + ')' : 'rgba(255,250,200,' + (0.7 * a) + ')'); g.addColorStop(1, relic ? 'rgba(150,90,255,0)' : 'rgba(255,230,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, TS * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = relic ? 'rgba(245,235,255,' + a + ')' : 'rgba(255,255,240,' + a + ')'; ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.8); ctx.lineTo(cx + r * 0.35, cy - r * 0.35); ctx.lineTo(cx + r * 1.8, cy); ctx.lineTo(cx + r * 0.35, cy + r * 0.35); ctx.lineTo(cx, cy + r * 1.8); ctx.lineTo(cx - r * 0.35, cy + r * 0.35); ctx.lineTo(cx - r * 1.8, cy); ctx.lineTo(cx - r * 0.35, cy - r * 0.35); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  root.Search = Search;
  if (root.SEARCH_POINTS) Search.register(root.SEARCH_POINTS);
  if (root.SEARCH_EVENTS) Object.keys(root.SEARCH_EVENTS).forEach(function (k) { Search.event(k, root.SEARCH_EVENTS[k]); });   // データ側で先に登録した特別イベント（学院の観測装置など）
})(typeof window !== 'undefined' ? window : globalThis);
