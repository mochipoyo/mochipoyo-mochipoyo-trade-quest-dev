/* =========================================================
   UI / WorldMap : 拡大マップの「世界」タブ（v6.0 イラスト型の世界地図）
   ・12地域をそれぞれ独立した絵（assets/worldmap/）として海の上に配置し、地名・現在地・訪問状況・航路は既存データから表示する
   ・航路は Minimap.globeEdges()（SEA_ROUTES と陸路）をそのまま使う。新しい航路・移動手段は作らない
   ・地図は1枚の「舞台」（STAGE 座標）に、背景・航路・地域・地名をまとめて置き、拡大・移動は舞台ごと CSS transform で行う
     → 拡大縮小しても地名や航路の位置がずれない
   ・地域をタップ／決定で選ぶ → 情報（訪問状況・つながる航路）を表示。「地形を見る」で従来の「地域の地図」へ
   ・画像が読み込めなくても、地域の選択・情報表示・地形の表示はそのまま使える（色の島で代わりに表示）
   ・セーブデータ・地域ID・解放条件・移動処理には手を加えない（表示だけ）
   ========================================================= */
(function (root) {
  'use strict';

  /* ---------- 表示用データ（既存の地域ID → 位置・演出） ---------- */
  // 位置は従来の「世界」タブ（Minimap.GLOBE の x・y）と同じ並び（3列×5段）。舞台は 1200×1820（段の間に航路のマークを置く余白）
  var STAGE = { w: 1200, h: 1820 };
  var PIC = { w: 280, h: 191 };   // 地域の絵の表示サイズ（元画像 332×227）
  var LAYOUT = {
    world_dark: { x: 190, y: 185, fx: 'dark', color: '#4a2a6a' },
    world_sky: { x: 195, y: 525, fx: 'sky', color: '#9ac0f0' },
    world_kalion: { x: 600, y: 515, color: '#5a8a4a' },
    world_snow: { x: 1010, y: 505, fx: 'snow', color: '#d8e4f4' },
    world: { x: 190, y: 865, color: '#4f9a3f' },
    world_grania: { x: 600, y: 855, color: '#3f6fa8' },
    world_islands: { x: 195, y: 1215, color: '#2a4a6a' },
    world_tempus: { x: 600, y: 1210, fx: 'time', color: '#c8c0a0' },
    world_magicka: { x: 1010, y: 1195, color: '#3a3a5a' },
    world_desert: { x: 195, y: 1580, color: '#d8b060' },
    world_machine: { x: 600, y: 1585, color: '#5a5a9a' },
    world_dragon: { x: 1005, y: 1570, fx: 'lava', color: '#a83a1a' }
  };
  var VEH = { '徒歩': 'walk', '小型帆船': 'boat', '遠洋航海船': 'ship', '飛空艇': 'air' };
  // 乗り物のマーク（SVG）
  var ICON = {
    walk: '<svg viewBox="0 0 24 24"><ellipse cx="8" cy="15" rx="3" ry="4.5"/><circle cx="6" cy="8.6" r="1.1"/><circle cx="8.3" cy="8" r="1.1"/><circle cx="10.4" cy="8.8" r="1"/><ellipse cx="16" cy="11" rx="3" ry="4.5"/><circle cx="14" cy="4.6" r="1.1"/><circle cx="16.3" cy="4" r="1.1"/><circle cx="18.4" cy="4.8" r="1"/></svg>',
    boat: '<svg viewBox="0 0 24 24"><path d="M12 3v12h-7z"/><path d="M13 6l5 9h-5z"/><path d="M3 17h18l-3 4H6z"/></svg>',
    ship: '<svg viewBox="0 0 24 24"><path d="M7 2v13H3z"/><path d="M12 1v14H8z"/><path d="M17 3v12h-4z"/><path d="M18 6l3 9h-3z"/><path d="M1 16h22l-3.5 5h-15z"/></svg>',
    air: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="8" rx="10" ry="5"/><path d="M8 13h8l-1 3H9z"/><path d="M7 17h10v3H7z"/><circle cx="3" cy="18" r="1.6"/><circle cx="21" cy="18" r="1.6"/></svg>'
  };
  var COMPASS = '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" fill="none" stroke="#e8c15a" stroke-width="2" opacity=".8"/><circle cx="60" cy="60" r="36" fill="none" stroke="#e8c15a" stroke-width="1" opacity=".55"/>' +
    '<path d="M60 4L68 52L60 60L52 52Z" fill="#ffe08a"/><path d="M60 116L52 68L60 60L68 68Z" fill="#b08a3a"/><path d="M4 60L52 52L60 60L52 68Z" fill="#b08a3a"/><path d="M116 60L68 68L60 60L68 52Z" fill="#ffe08a"/>' +
    '<path d="M24 24L56 56L60 60L52 60Z" fill="#c9a24a" opacity=".7"/><path d="M96 96L64 64L60 60L68 60Z" fill="#c9a24a" opacity=".7"/><path d="M96 24L64 56L60 60L60 52Z" fill="#c9a24a" opacity=".7"/><path d="M24 96L56 64L60 60L60 68Z" fill="#c9a24a" opacity=".7"/>' +
    '<text x="60" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="#fff4c8">N</text></svg>';

  var WM = { built: false, z: 0.6, tx: 0, ty: 0, sel: null, key: '', regions: {}, badges: [], minZ: 0.2, maxZ: 1.6 };
  function esc(s) { return root.Win ? root.Win.esc(s) : String(s); }
  function MM() { return root.Minimap; }
  function data() { return root.State && root.State.data; }
  function globeNode(id) { var g = (MM() && MM().GLOBE) || []; for (var i = 0; i < g.length; i++) if (g[i].id === id) return g[i]; return null; }
  function shortName(id) { var n = globeNode(id); return n ? n.name : ((root.MAP_DEFS[id] || {}).name || id); }
  function fullName(id) { return (root.MAP_DEFS[id] || {}).name || shortName(id); }
  function ids() { return Object.keys(LAYOUT).filter(function (id) { return root.MAP_DEFS && root.MAP_DEFS[id]; }); }
  function imgUrl(id) { return root.Assets && root.Assets.url ? root.Assets.url('worldmap', id) : null; }
  WM.LAYOUT = LAYOUT; WM.STAGE = STAGE;

  /* ---------- 航路の形（地域の中心どうしを曲線で結ぶ。マークは地域の絵・地名と重ならない位置へ） ---------- */
  function regionRects() { return ids().map(function (id) { var L = LAYOUT[id]; return { id: id, x0: L.x - PIC.w / 2, x1: L.x + PIC.w / 2, y0: L.y - PIC.h / 2, y1: L.y + PIC.h / 2 + 52 }; }); }
  function hits(rs, x, y, hw, hh) { for (var i = 0; i < rs.length; i++) { var r = rs[i]; if (x + hw > r.x0 && x - hw < r.x1 && y + hh > r.y0 && y - hh < r.y1) return true; } return false; }
  function routeGeom(e, rs, placed) {
    var A = LAYOUT[e.a], B = LAYOUT[e.b]; var dx = B.x - A.x, dy = B.y - A.y; var len = Math.sqrt(dx * dx + dy * dy) || 1; var nx = -dy / len, ny = dx / len;
    var tries = [0.1, -0.1, 0.22, -0.22, 0.34, -0.34, 0];
    for (var i = 0; i < tries.length; i++) {
      var k = tries[i] * len; var cx = (A.x + B.x) / 2 + nx * k, cy = (A.y + B.y) / 2 + ny * k;
      var mx = 0.25 * A.x + 0.5 * cx + 0.25 * B.x, my = 0.25 * A.y + 0.5 * cy + 0.25 * B.y;
      if (!hits(rs, mx, my, 64, 20) && !hits(placed, mx, my, 64, 20)) return { cx: cx, cy: cy, mx: mx, my: my };
      if (i === tries.length - 1) return { cx: cx, cy: cy, mx: mx, my: my };
    }
  }

  /* ---------- 組み立て（初めて「世界」タブを開いたときに1回） ---------- */
  WM.build = function () {
    var body = document.querySelector('#bigmap .bm-body'); if (!body) return false;
    var wm = document.createElement('div'); wm.className = 'wm'; wm.id = 'wm';
    var html = '<div class="wm-stage" id="wm-stage" style="width:' + STAGE.w + 'px;height:' + STAGE.h + 'px">' +
      '<div class="wm-sea"' + (imgUrl('sea') ? ' style="background-image:url(\'' + imgUrl('sea') + '\')"' : '') + '></div>' +
      '<svg class="wm-routes" id="wm-routes" width="' + STAGE.w + '" height="' + STAGE.h + '" viewBox="0 0 ' + STAGE.w + ' ' + STAGE.h + '"></svg>' +
      '<div class="wm-frame"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></div>' +
      '<div class="wm-compass" style="left:1040px;top:36px">' + COMPASS + '</div>';
    ids().forEach(function (id) {
      var L = LAYOUT[id]; var u = imgUrl(id);
      html += '<div class="wm-region' + (L.fx ? ' fx-' + L.fx : '') + '" data-id="' + id + '" role="button" aria-label="' + esc(shortName(id)) + '" style="left:' + (L.x - PIC.w / 2) + 'px;top:' + (L.y - PIC.h / 2) + 'px;width:' + PIC.w + 'px;height:' + PIC.h + 'px;--rc:' + L.color + '">' +
        '<div class="wm-glow"></div><div class="wm-fallback"></div>' +
        (u ? '<img class="wm-pic" alt="" draggable="false" src="' + u + '">' : '') +
        (L.fx === 'sky' ? '<div class="wm-cloud c1"></div><div class="wm-cloud c2"></div>' : '') + (L.fx === 'snow' ? '<div class="wm-snow"></div>' : '') + (L.fx === 'time' ? '<div class="wm-time"></div>' : '') +
        '<div class="wm-ring"></div><div class="wm-here">現在地</div>' +
        '<div class="wm-label"><span class="wm-name">' + esc(shortName(id)) + '<span class="wm-sub"></span></span></div></div>';
    });
    html += '<div class="wm-badges" id="wm-badges"></div></div>';
    wm.innerHTML = html;
    var info = document.createElement('div'); info.className = 'wm-info'; info.id = 'wm-info';
    body.appendChild(wm); body.appendChild(info);
    WM.el = wm; WM.stage = wm.querySelector('#wm-stage'); WM.info = info; WM.svg = wm.querySelector('#wm-routes'); WM.badgeLayer = wm.querySelector('#wm-badges');
    wm.querySelectorAll('.wm-region').forEach(function (r) {
      var id = r.getAttribute('data-id'); WM.regions[id] = r;
      var im = r.querySelector('img'); if (im) { im.addEventListener('error', function () { r.classList.add('noimg'); }); im.addEventListener('load', function () { r.classList.add('loaded'); }); } else r.classList.add('noimg');
    });
    bindPointer(wm);
    info.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return; e.stopPropagation();
      var a = b.getAttribute('data-act');
      if (a === 'terrain') WM.openTerrain(WM.sel); else if (a === 'close') WM.select(null);
    });
    WM.built = true; WM.key = ''; return true;
  };

  /* ---------- 状態（訪問・現在地・航路）を反映：変わったときだけ DOM を更新 ---------- */
  function edges() { return MM() && MM().globeEdges ? MM().globeEdges() : []; }
  function status(id) { var d = data(); var cur = MM().currentRegionId(); var vis = !!(d && d.visited[id]); var reach = !vis && edges().some(function (e) { return e.open && ((e.a === id && d.visited[e.b]) || (e.b === id && d.visited[e.a])); }); return { cur: id === cur, vis: vis, reach: reach }; }
  WM.status = status;
  WM.refresh = function (force) {
    var d = data(); if (!d || !WM.built) return; var E = edges(); var cur = MM().currentRegionId();
    var key = cur + '|' + ids().map(function (id) { return d.visited[id] ? 1 : 0; }).join('') + '|' + E.map(function (e) { return e.open ? 1 : 0; }).join('') + '|' + WM.sel;
    if (!force && key === WM.key) return; WM.key = key;
    ids().forEach(function (id) {
      var r = WM.regions[id]; var s = status(id);
      r.classList.toggle('cur', s.cur); r.classList.toggle('visited', s.vis); r.classList.toggle('unvisited', !s.vis); r.classList.toggle('sel', WM.sel === id);
      var sub = r.querySelector('.wm-sub'); sub.textContent = s.cur || s.vis ? '' : s.reach ? '未踏・行ける' : '未踏'; sub.style.display = sub.textContent ? '' : 'none';
    });
    // 航路（SVG の線）と乗り物のマーク
    var rs = regionRects(); var placed = []; var svg = ''; var bh = '';
    E.forEach(function (e, i) {
      if (!LAYOUT[e.a] || !LAYOUT[e.b]) return;
      var g = routeGeom(e, rs, placed); placed.push({ x0: g.mx - 58, x1: g.mx + 58, y0: g.my - 18, y1: g.my + 18 });
      var A = LAYOUT[e.a], B = LAYOUT[e.b]; var v = VEH[e.label] || 'ship'; var dpath = 'M' + A.x + ' ' + A.y + ' Q' + Math.round(g.cx) + ' ' + Math.round(g.cy) + ' ' + B.x + ' ' + B.y;
      svg += '<path class="rt-halo" d="' + dpath + '"/><path class="rt rt-' + v + (e.open ? ' open' : ' closed') + '" d="' + dpath + '"/>';
      var tip = e.name + '：' + e.label + (e.open ? '' : '（まだ通れない）');
      bh += '<div class="wm-badge rb-' + v + (e.open ? ' open' : ' closed') + '" data-tip="' + esc(tip) + '" data-edge="' + i + '" style="left:' + Math.round(g.mx) + 'px;top:' + Math.round(g.my) + 'px">' + ICON[v] + '<span>' + esc(e.label) + '</span></div>';
    });
    WM.svg.innerHTML = svg; WM.badgeLayer.innerHTML = bh;
    WM.renderInfo();
  };

  /* ---------- 選択と情報 ---------- */
  WM.select = function (id, opts) {
    WM.sel = id && LAYOUT[id] ? id : null; WM.key = ''; WM.refresh(true);
    if (WM.sel && opts && opts.center) WM.centerOn(WM.sel, true);
  };
  WM.renderInfo = function () {
    var info = WM.info; if (!info) return; var id = WM.sel;
    if (!id) { info.classList.remove('on'); info.innerHTML = ''; return; }
    var d = data(); var s = status(id);
    var routes = edges().filter(function (e) { return e.a === id || e.b === id; }).map(function (e) { var o = e.a === id ? e.b : e.a; return '<li class="' + (e.open ? 'ok' : 'ng') + '"><b>' + esc(shortName(o)) + '</b>へ：' + esc(e.label) + '（' + (e.open ? '通れる' : 'まだ通れない') + '）</li>'; }).join('');
    var locs = MM().regionLocations().filter(function (L) { return L.region === id; }); var seen = locs.filter(function (L) { return d.visited[L.to]; }).length;
    info.innerHTML = '<div class="wm-info-head"><b>' + esc(fullName(id)) + '</b><span class="wm-chip ' + (s.cur ? 'cur' : s.vis ? 'vis' : 'new') + '">' + (s.cur ? '現在地' : s.vis ? '訪問済み' : s.reach ? '未踏（行ける）' : '未踏') + '</span><button class="wm-x" data-act="close" aria-label="閉じる">✕</button></div>' +
      '<div class="wm-info-body"><div class="small">訪れた町・ダンジョン：' + seen + '／' + locs.length + '</div>' + (routes ? '<ul class="wm-routes-list">' + routes + '</ul>' : '') + '</div>' +
      '<div class="wm-info-foot"><button class="wm-go" data-act="terrain">地形を見る（地域の地図）</button></div>';
    info.classList.add('on');
  };
  WM.openTerrain = function (id) { if (!id) return; if (MM().setMode) MM().setMode('world', id); };

  /* ---------- 拡大・移動（舞台ごと transform。地名・航路はずれない） ---------- */
  function view() { var r = WM.el.getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top }; }
  function fitZ() { var v = view(); return Math.min(v.w / STAGE.w, v.h / STAGE.h); }
  WM.limits = function () { var f = fitZ(); WM.minZ = Math.max(0.12, f * 0.98); WM.maxZ = Math.max(1.6, f * 2); };
  WM.clamp = function () {
    var v = view(); var sw = STAGE.w * WM.z, sh = STAGE.h * WM.z;
    WM.tx = sw <= v.w ? (v.w - sw) / 2 : Math.min(0, Math.max(v.w - sw, WM.tx));
    WM.ty = sh <= v.h ? (v.h - sh) / 2 : Math.min(0, Math.max(v.h - sh, WM.ty));
  };
  WM.apply = function () {
    if (!WM.stage) return; WM.clamp();
    var ls = Math.max(1, Math.min(1.7, 0.6 / WM.z));   // 縮小しても地名・マークが小さくなりすぎないよう、文字だけ補正
    WM.stage.style.transform = 'translate(' + Math.round(WM.tx) + 'px,' + Math.round(WM.ty) + 'px) scale(' + WM.z.toFixed(4) + ')';
    WM.stage.style.setProperty('--ls', ls.toFixed(3)); WM.stage.style.setProperty('--z', WM.z.toFixed(4));
    if (MM().clearTip) MM().clearTip();
  };
  WM.zoomAt = function (f, sx, sy) {
    var z0 = WM.z, z1 = Math.max(WM.minZ, Math.min(WM.maxZ, z0 * f)); var v = view(); if (sx === undefined) { sx = v.w / 2; sy = v.h / 2; }
    WM.tx = sx - (sx - WM.tx) * (z1 / z0); WM.ty = sy - (sy - WM.ty) * (z1 / z0); WM.z = z1; WM.apply();
  };
  WM.centerOn = function (id, keepZoom) { var L = LAYOUT[id]; if (!L) return; var v = view(); WM.tx = v.w / 2 - L.x * WM.z; WM.ty = v.h / 2 - (L.y + 20) * WM.z; WM.apply(); };
  WM.fit = function () { WM.limits(); WM.z = WM.minZ; WM.apply(); };
  WM.home = function () { WM.limits(); var v = view(); WM.z = Math.max(WM.minZ, Math.min(0.75, Math.min(v.w / 760, v.h / 760))); WM.centerOn(MM().currentRegionId()); };
  WM.relayout = function () { if (!WM.built || !WM.el || WM.el.style.display === 'none') return; WM.limits(); WM.z = Math.max(WM.minZ, Math.min(WM.maxZ, WM.z)); WM.apply(); };

  function bindPointer(el) {
    var pts = {}; var drag = null; var pinch = null;
    function count() { return Object.keys(pts).length; }
    function local(e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.wm-info')) return; el.setPointerCapture && el.setPointerCapture(e.pointerId);
      pts[e.pointerId] = local(e);
      if (count() === 1) drag = { x: pts[e.pointerId].x, y: pts[e.pointerId].y, tx: WM.tx, ty: WM.ty, moved: false, target: e.target };
      else if (count() === 2) { var p = Object.keys(pts).map(function (k) { return pts[k]; }); pinch = { d: dist(p[0], p[1]), z: WM.z, cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2, tx: WM.tx, ty: WM.ty }; if (drag) drag.moved = true; }
      e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return; pts[e.pointerId] = local(e);
      if (pinch && count() >= 2) { var p = Object.keys(pts).map(function (k) { return pts[k]; }); var f = dist(p[0], p[1]) / pinch.d; var z1 = Math.max(WM.minZ, Math.min(WM.maxZ, pinch.z * f)); var cx = (p[0].x + p[1].x) / 2, cy = (p[0].y + p[1].y) / 2; WM.tx = cx - (pinch.cx - pinch.tx) * (z1 / pinch.z); WM.ty = cy - (pinch.cy - pinch.ty) * (z1 / pinch.z); WM.z = z1; WM.apply(); return; }
      if (drag) { var q = pts[e.pointerId]; var dx = q.x - drag.x, dy = q.y - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true; if (drag.moved) { WM.tx = drag.tx + dx; WM.ty = drag.ty + dy; WM.apply(); } }
    });
    function end(e) {
      if (!pts[e.pointerId]) return; delete pts[e.pointerId];
      if (count() < 2) pinch = null;
      if (count() === 0 && drag) { if (!drag.moved) tap(drag.target, e); drag = null; }
    }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', function (e) { delete pts[e.pointerId]; pinch = null; drag = null; });
    el.addEventListener('wheel', function (e) { e.preventDefault(); var p = local(e); WM.zoomAt(e.deltaY < 0 ? 1.15 : 0.87, p.x, p.y); }, { passive: false });
    function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) || 1; }
  }
  function tap(target, e) {
    var badge = target && target.closest ? target.closest('.wm-badge') : null;
    if (badge) { showTip(badge.getAttribute('data-tip'), badge); return; }
    var reg = target && target.closest ? target.closest('.wm-region') : null;
    if (reg) { var id = reg.getAttribute('data-id'); if (WM.sel === id) WM.openTerrain(id); else WM.select(id); return; }   // 選んだ地域をもう一度タップ → 地形
    WM.select(null);
  }
  function showTip(text, el) {
    var tip = document.getElementById('bm-tip'); if (!tip || !text) return; var r = el.getBoundingClientRect(), b = WM.el.getBoundingClientRect();
    tip.textContent = text; tip.style.left = Math.round(r.left - b.left + r.width / 2) + 'px'; tip.style.top = Math.round(r.top - b.top) + 'px'; tip.classList.add('on');
  }

  /* ---------- キー操作（方向キーで地域を移動、決定で情報→地形、メニュー（Esc）で閉じる：閉じるのは minimap.js 側） ---------- */
  WM.input = function (Input) {
    var dirs = ['left', 'right', 'up', 'down']; for (var i = 0; i < dirs.length; i++) if (Input.consume(dirs[i])) { WM.move(dirs[i]); return true; }
    if (Input.consume('ok')) { if (WM.sel) WM.openTerrain(WM.sel); else WM.select(MM().currentRegionId(), { center: true }); return true; }
    return false;
  };
  WM.move = function (dir) {
    var from = WM.sel || MM().currentRegionId(); var A = LAYOUT[from]; if (!A) { WM.select(MM().currentRegionId(), { center: true }); return; }
    var dv = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir]; var best = null, bs = 1e9;
    ids().forEach(function (id) { if (id === from) return; var B = LAYOUT[id]; var dx = B.x - A.x, dy = B.y - A.y; var along = dx * dv[0] + dy * dv[1]; if (along <= 10) return; var across = Math.abs(dx * dv[1] - dy * dv[0]); var sc = along + across * 2.2; if (sc < bs) { bs = sc; best = id; } });
    WM.select(best || from, { center: true });
  };

  /* ---------- minimap.js から呼ばれる ---------- */
  WM.show = function () {
    if (!WM.built && !WM.build()) return false;
    WM.el.style.display = ''; WM.info.style.display = ''; var cv = document.getElementById('bm-canvas'); if (cv) cv.style.visibility = 'hidden';
    WM.key = ''; WM.refresh(true); WM.home(); return true;
  };
  WM.hide = function () { if (!WM.built) return; WM.el.style.display = 'none'; WM.info.style.display = 'none'; WM.info.classList.remove('on'); WM.sel = null; var cv = document.getElementById('bm-canvas'); if (cv) cv.style.visibility = ''; };
  WM.isShown = function () { return !!(WM.built && WM.el.style.display !== 'none'); };
  WM.draw = function (title) {
    if (!WM.isShown()) WM.show();
    WM.refresh(false);
    if (title) title.textContent = (root.innerWidth <= 720 ? '' : '世界　—　') + '現在地：' + shortName(MM().currentRegionId());   // スマホは見出しを短く
    var fl = document.getElementById('bm-floors'); if (fl && fl.getAttribute('data-html') !== '') { fl.innerHTML = ''; fl.setAttribute('data-html', ''); }
  };

  root.WorldMap = WM;
})(typeof window !== 'undefined' ? window : globalThis);
