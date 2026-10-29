/* =========================================================
   UI / Minimap : 右上ミニマップ ＋ 拡大マップ（エリア／世界地図）
   ・既存の GameMap（tiles / buildings / warps / chests / events）と WORLD_LOCATIONS をそのまま使う（手作業の地図は持たない）
   ・地形は簡略化した専用描画（1タイル=cell px）をマップごとにキャッシュ。プレイヤー移動では再生成しない
   ・ダンジョンは Fog of War（歩いた周辺だけ明らかになる）。探索状況は State.data.mapDiscovery にビット列で保存
   ・拡大マップ：クリック／タップ／Mキーで開閉、ズーム（ホイール・ピンチ・ボタン）、ドラッグ移動、現在地へ、エリア⇔世界地図、階層切替、施設アイコン
   ========================================================= */
(function (root) {
  'use strict';
  var Minimap = { open: false, mode: 'area', zoom: 1, pan: { x: 0, y: 0 }, cache: {}, bigCache: {}, _dirty: {}, _rev: 0, _tip: null, _floor: null };
  var Tiles = root.Tiles;

  /* ---------- 地形の色分け（タイル名 → 色・記号） ---------- */
  var C = {
    grass: '#4f9a3f', grass2: '#4f9a3f', crops: '#8aa84a', flowerbed: '#6fb04a', bush: '#2f7a30', tree_small: '#2f7a30', tree: '#1f5a2a', forest: '#1a4a22',
    hill: '#7a8a4a', mountain: '#8a7a6a', cliff: '#6a5a4a', sand: '#d8c070', snow: '#e8f0ff', lava: '#d8401a', water: '#1f4f9a', shallow: '#4f8fe0', bridge: '#8a5a30', dock: '#8a5a30',
    road: '#b08a5a', path_stone: '#b8a890', stone: '#9a9aa8', floor_wood: '#b8a080', floor_stone: '#a8a8b8', carpet: '#a04a4a',
    wall: '#3a3a4a', wall_wood: '#4a3a2a', castle_wall: '#4a4a5a', roof_red: '#8a6a4a', roof_blue: '#8a6a4a', roof_green: '#8a6a4a', bld_block: '#8a6a4a', bld_door: '#e8c15a', door: '#e8c15a', door_locked: '#c94a4a', gate: '#c9a24a',
    window: '#6a6a7a', counter: '#6a6a7a', table: '#6a6a7a', bed: '#6a6a7a', bookshelf: '#6a6a7a', pillar: '#6a6a7a', fountain: '#4f8fe0', torch: '#8a8a98', crystal: '#9fd0ff', sign: '#6a6a7a', barrel: '#6a6a7a', crate: '#6a6a7a', bench: '#6a6a7a', stall: '#c96b2a', lamp: '#6a6a7a', well: '#6a6a7a', fence: '#7a6a5a', lever: '#6a6a7a',
    cave_floor: '#8a8a98', moss: '#7a8a7a', puddle: '#5a7a9a', cave_wall: '#2e2e3a', stalactite: '#2e2e3a', ore: '#3a3a4a', root: '#3a3a30', log: '#4a3a2a',
    stairs_down: '#9fe0ff', stairs_up: '#9fe0ff', warp: '#9fe0ff', hole: '#101018', chest: '#ffd24a', chest_open: '#8a7a4a', boss_mark: '#c94a6a',
    village: '#ffb04a', castle_icon: '#ffd24a', cave_icon: '#c0c0d0', tower_icon: '#ffd24a', ship: '#8a5a30'
  };
  function colorOf(name) { if (C[name]) return C[name]; return Tiles.isSolid(name) ? '#3a3a4a' : '#9a9aa8'; }
  var SYMBOL = { stairs_down: 'stairs', stairs_up: 'stairs', warp: 'warp', chest: 'chest', chest_open: 'chest_open', door_locked: 'lock', gate: 'gate', hole: 'hole', village: 'town', castle_icon: 'castle', cave_icon: 'cave', tower_icon: 'castle', ship: 'ship', boss_mark: 'boss' };

  /* ---------- 探索状況（ビット列） ---------- */
  function disc() { var d = root.State.data; if (!d.mapDiscovery) d.mapDiscovery = {}; return d.mapDiscovery; }
  function hasFog(map) { return map.kind === 'dungeon'; }
  function isDiscovered(map, x, y) { if (!hasFog(map)) return true; var D = disc()[map.id]; if (!D || !D[y]) return false; return ((D[y][(x / 30) | 0] || 0) & (1 << (x % 30))) !== 0; }
  function discover(map, x, y) { var D = disc(); if (!D[map.id]) D[map.id] = []; var row = D[map.id][y] || (D[map.id][y] = []); var i = (x / 30) | 0; row[i] = (row[i] || 0) | (1 << (x % 30)); }
  // プレイヤー周辺を明らかにする：通行可能タイルを半径Rまで幅優先でたどり、その隣接する壁も見える扱い（壁越しの部屋は見えない）
  Minimap.reveal = function (map, px, py, R) {
    if (!hasFog(map)) return; R = R || 3;
    var seen = {}; var q = [[px, py, 0]]; seen[px + ',' + py] = true; var changed = false;
    function mark(x, y) { if (x < 0 || y < 0 || x >= map.w || y >= map.h) return; if (!isDiscovered(map, x, y)) { discover(map, x, y); changed = true; } }
    while (q.length) {
      var c = q.shift(); var x = c[0], y = c[1], d = c[2]; mark(x, y);
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue; mark(nx, ny); /* 隣接（壁含む）は見える */
        var k = nx + ',' + ny; if (seen[k] || d + 1 > R) continue; var t = map.tiles[ny][nx]; if (Tiles.isSolid(t) && t !== 'chest' && t !== 'chest_open') continue; seen[k] = true; q.push([nx, ny, d + 1]); }
    }
    if (changed) Minimap.markDirty(map.id);
  };

  /* ---------- 地形キャッシュ ---------- */
  function isRegion(map) { return !!(map && map.def && map.def.region); }
  function regionLocations() { var out = []; Object.keys(root.MAP_DEFS || {}).forEach(function (k) { var d = root.MAP_DEFS[k]; if (d.region && d.locations) d.locations.forEach(function (L) { out.push(Object.assign({ region: k }, L)); }); }); if (!out.length && root.WORLD_LOCATIONS) out = root.WORLD_LOCATIONS.map(function (L) { return Object.assign({ region: 'world' }, L); }); return out; }
  Minimap.isRegion = isRegion; Minimap.regionLocations = regionLocations;
  function cellFor(map, big) { if (big) return isRegion(map) ? 4 : 10; if (isRegion(map)) return 2; return Math.max(3, Math.min(8, Math.floor(150 / Math.max(map.w, map.h * 1.25)))); }
  function renderTerrain(map, cell) {
    var c = document.createElement('canvas'); c.width = map.w * cell; c.height = map.h * cell; var ctx = c.getContext('2d');
    for (var y = 0; y < map.h; y++) for (var x = 0; x < map.w; x++) {
      var t = map.tiles[y][x]; ctx.fillStyle = colorOf(t); ctx.fillRect(x * cell, y * cell, cell, cell);
      if (cell >= 4 && (t === 'tree' || t === 'forest')) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2); }
      if (cell >= 4 && t === 'mountain') { ctx.fillStyle = '#a89a8a'; ctx.beginPath(); ctx.moveTo(x * cell, y * cell + cell); ctx.lineTo(x * cell + cell / 2, y * cell + 1); ctx.lineTo(x * cell + cell, y * cell + cell); ctx.fill(); }
      if (cell >= 4 && (t === 'water' || t === 'shallow') && ((x + y) % 3 === 0)) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x * cell, y * cell + (cell >> 1), cell >> 1, 1); }
    }
    // 建物の輪郭（町）
    map.buildings.forEach(function (b) { ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(b.x * cell + 0.5, b.y * cell + 0.5, b.w * cell - 1, b.h * cell - 1); });
    // 記号（階段・出入口・宝箱・扉・落とし穴・ボスの印・ワールドのアイコン）。霧は後から上に重ねるので未探索分は見えない
    var r = Math.max(2, cell * 0.45);
    for (var sy = 0; sy < map.h; sy++) for (var sx = 0; sx < map.w; sx++) { var sym = SYMBOL[map.tiles[sy][sx]]; if (sym) drawSymbol(ctx, sym, sx * cell + cell / 2, sy * cell + cell / 2, r); }
    if (!isRegion(map)) map.warps.forEach(function (w) { var tn = map.tiles[w.y] && map.tiles[w.y][w.x]; if (SYMBOL[tn] || tn === 'bld_door') return; drawSymbol(ctx, 'warp', w.x * cell + cell / 2, w.y * cell + cell / 2, r); });
    return c;
  }
  function getTerrain(map, big) {
    var store = big ? Minimap.bigCache : Minimap.cache; var e = store[map.id]; var cell = cellFor(map, big);
    if (!e || e.rev !== (Minimap._dirty[map.id] || 0)) { e = { canvas: renderTerrain(map, cell), cell: cell, rev: Minimap._dirty[map.id] || 0 }; store[map.id] = e; }
    return e;
  }
  Minimap.markDirty = function (mapId) { Minimap._dirty[mapId] = (Minimap._dirty[mapId] || 0) + 1; };

  /* ---------- 記号・アイコン ---------- */
  function drawSymbol(ctx, kind, cx, cy, r) {
    ctx.save(); ctx.lineWidth = Math.max(1, r / 4);
    if (kind === 'stairs') { ctx.fillStyle = '#9fe0ff'; for (var i = 0; i < 3; i++) ctx.fillRect(cx - r + i * (r * 2 / 3), cy + r - (i + 1) * (r * 2 / 3), r * 2 / 3, (i + 1) * (r * 2 / 3)); }
    else if (kind === 'warp') { ctx.strokeStyle = '#9fe0ff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#9fe0ff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'chest') { ctx.fillStyle = '#ffd24a'; ctx.fillRect(cx - r * 0.8, cy - r * 0.5, r * 1.6, r * 1.1); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(cx - r * 0.8, cy - r * 0.1, r * 1.6, r * 0.2); }
    else if (kind === 'chest_open') { ctx.fillStyle = '#8a7a4a'; ctx.fillRect(cx - r * 0.8, cy - r * 0.3, r * 1.6, r * 0.9); ctx.strokeStyle = '#5a4a2a'; ctx.strokeRect(cx - r * 0.8, cy - r * 0.3, r * 1.6, r * 0.9); }
    else if (kind === 'lock') { ctx.fillStyle = '#c94a4a'; ctx.fillRect(cx - r * 0.6, cy - r * 0.2, r * 1.2, r); ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, cy - r * 0.3, r * 0.45, Math.PI, 0); ctx.stroke(); }
    else if (kind === 'gate') { ctx.strokeStyle = '#ffd24a'; ctx.strokeRect(cx - r * 0.7, cy - r * 0.8, r * 1.4, r * 1.6); ctx.fillStyle = '#ffd24a'; ctx.fillRect(cx - r * 0.2, cy - r * 0.2, r * 0.4, r * 0.4); }
    else if (kind === 'hole') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.9, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'boss') { ctx.strokeStyle = '#ff6a8a'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#ff6a8a'; ctx.font = 'bold ' + Math.round(r * 1.4) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', cx, cy + 0.5); }
    else if (kind === 'town') { ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy + r); ctx.lineTo(cx - r * 0.7, cy + r); ctx.lineTo(cx - r * 0.7, cy); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.fill(); }
    else if (kind === 'castle') { ctx.fillStyle = '#ffd24a'; ctx.fillRect(cx - r, cy - r * 0.4, r * 2, r * 1.4); for (var k = -1; k <= 1; k++) ctx.fillRect(cx + k * r * 0.7 - r * 0.2, cy - r, r * 0.4, r * 0.7); }
    else if (kind === 'cave') { ctx.fillStyle = '#c0c0d0'; ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#101018'; ctx.beginPath(); ctx.arc(cx, cy + r * 0.4, r * 0.5, Math.PI, 0); ctx.fill(); }
    else if (kind === 'ship') { ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + r * 0.6, cy + r * 0.7); ctx.lineTo(cx - r * 0.6, cy + r * 0.7); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f0f0f8'; ctx.fillRect(cx - r * 0.1, cy - r, r * 0.9, r * 0.9); }
    ctx.restore();
  }
  // 施設アイコン（建物タイプごと・統一デザインの丸バッジ）
  var ICON_COLOR = { weapon: '#e5484d', armor: '#4f8fe0', item: '#4cc38a', inn: '#c97bd6', church: '#f0f0f8', tavern: '#e8a050', bank: '#ffd24a', guild: '#c9a06a', dojo: '#5ab0ff', house: '#b8a890', elder: '#c9a24a', warehouse: '#9a8a6a', castle: '#ffd24a', ship: '#8fc8ff' };
  function drawIcon(ctx, type, cx, cy, r) {
    ctx.save(); ctx.fillStyle = 'rgba(11,18,38,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ICON_COLOR[type] || '#ddd'; ctx.lineWidth = Math.max(1, r / 6); ctx.stroke();
    var c = ICON_COLOR[type] || '#ddd'; ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = Math.max(1.2, r / 4); ctx.lineCap = 'round'; var s = r * 0.55;
    if (type === 'weapon') { ctx.beginPath(); ctx.moveTo(cx - s, cy + s); ctx.lineTo(cx + s, cy - s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy + s * 0.2); ctx.lineTo(cx - s * 0.8, cy + s * 0.8); ctx.lineWidth *= 1.6; ctx.stroke(); }
    else if (type === 'armor') { ctx.beginPath(); ctx.moveTo(cx - s, cy - s * 0.8); ctx.lineTo(cx + s, cy - s * 0.8); ctx.lineTo(cx + s, cy + s * 0.2); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy + s * 0.2); ctx.closePath(); ctx.fill(); }
    else if (type === 'item') { ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy - s); ctx.lineTo(cx + s * 0.35, cy - s); ctx.lineTo(cx + s * 0.35, cy - s * 0.3); ctx.lineTo(cx + s, cy + s); ctx.lineTo(cx - s, cy + s); ctx.lineTo(cx - s * 0.35, cy - s * 0.3); ctx.closePath(); ctx.fill(); }
    else if (type === 'inn') { ctx.fillRect(cx - s, cy - s * 0.1, s * 2, s * 0.9); ctx.beginPath(); ctx.arc(cx - s * 0.5, cy - s * 0.4, s * 0.4, 0, Math.PI * 2); ctx.fill(); }
    else if (type === 'church') { ctx.lineWidth *= 1.3; ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s); ctx.moveTo(cx - s * 0.7, cy - s * 0.3); ctx.lineTo(cx + s * 0.7, cy - s * 0.3); ctx.stroke(); }
    else if (type === 'tavern') { ctx.fillRect(cx - s * 0.8, cy - s * 0.7, s * 1.3, s * 1.6); ctx.beginPath(); ctx.arc(cx + s * 0.6, cy, s * 0.4, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
    else if (type === 'bank') { ctx.beginPath(); ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(11,18,38,0.9)'; ctx.font = 'bold ' + Math.round(s * 1.4) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('G', cx, cy + 0.5); }
    else if (type === 'guild') { ctx.fillRect(cx - s * 0.7, cy - s, s * 1.4, s * 2); ctx.fillStyle = 'rgba(11,18,38,0.9)'; for (var i = 0; i < 3; i++) ctx.fillRect(cx - s * 0.45, cy - s * 0.6 + i * s * 0.55, s * 0.9, s * 0.18); }
    else if (type === 'dojo') { ctx.lineWidth = Math.max(1, r / 6); ctx.beginPath(); ctx.moveTo(cx - s, cy + s * 0.6); ctx.lineTo(cx - s * 0.3, cy - s * 0.2); ctx.lineTo(cx + s * 0.2, cy + s * 0.3); ctx.lineTo(cx + s, cy - s); ctx.stroke(); }
    else if (type === 'house' || type === 'elder') { ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx + s * 0.7, cy); ctx.lineTo(cx + s * 0.7, cy + s); ctx.lineTo(cx - s * 0.7, cy + s); ctx.lineTo(cx - s * 0.7, cy); ctx.lineTo(cx - s, cy); ctx.closePath(); ctx.fill(); }
    else if (type === 'warehouse') { ctx.fillRect(cx - s, cy - s * 0.6, s * 2, s * 1.6); ctx.fillStyle = 'rgba(11,18,38,0.9)'; ctx.fillRect(cx - s * 0.3, cy, s * 0.6, s); }
    else if (type === 'castle') { ctx.fillRect(cx - s, cy - s * 0.3, s * 2, s * 1.3); for (var k = -1; k <= 1; k++) ctx.fillRect(cx + k * s * 0.7 - s * 0.2, cy - s, s * 0.4, s * 0.8); }
    else if (type === 'ship') { ctx.beginPath(); ctx.moveTo(cx - s, cy + s * 0.2); ctx.lineTo(cx + s, cy + s * 0.2); ctx.lineTo(cx + s * 0.6, cy + s); ctx.lineTo(cx - s * 0.6, cy + s); ctx.closePath(); ctx.fill(); ctx.fillRect(cx - s * 0.1, cy - s, s * 0.8, s * 1.1); }
    else { ctx.beginPath(); ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawArrow(ctx, cx, cy, dir, r, color) {
    var ang = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[dir] || 0;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.shadowColor = color; ctx.shadowBlur = r * 1.5;
    ctx.fillStyle = color; ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = Math.max(1, r / 5);
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.7); ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r * 0.7, r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* ---------- 共通：マップ1枚を「地形＋霧＋記号」で描く（ctx は既に scale 済み、1タイル = cell px） ---------- */
  function drawMapLayer(ctx, map, cell, big, opts) {
    opts = opts || {}; var d = root.State.data;
    var t = getTerrain(map, big); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(t.canvas, 0, 0, t.canvas.width, t.canvas.height, 0, 0, map.w * cell, map.h * cell);
    // 霧（ダンジョン）
    if (hasFog(map)) { ctx.fillStyle = opts.fogColor || 'rgba(6,8,18,0.97)'; for (var fy = 0; fy < map.h; fy++) for (var fx = 0; fx < map.w; fx++) if (!isDiscovered(map, fx, fy)) ctx.fillRect(fx * cell, fy * cell, cell, cell); }
    // NPC（町のみ・小さな点）
    if (map.kind === 'town' || map.kind === 'interior') map.npcs.forEach(function (n) { if (n.hidden) return; ctx.fillStyle = '#f0e0c0'; ctx.beginPath(); ctx.arc(n.x * cell + cell / 2, n.y * cell + cell / 2, Math.max(1, cell * 0.25), 0, Math.PI * 2); ctx.fill(); });
  }

  /* ---------- 右上ミニマップ ---------- */
  Minimap.init = function () {
    var layer = document.getElementById('minimap-layer'); if (!layer) return;
    layer.innerHTML = '<div class="mm-box" id="mm-box" title="クリックで拡大（M）"><div class="mm-title" id="mm-title"></div><canvas id="mm-canvas"></canvas><div class="mm-compass">N</div></div>' +
      '<div class="bigmap" id="bigmap"><div class="bm-head"><div class="bm-title" id="bm-title"></div><div class="bm-tabs"><button data-mode="area" class="on">現在のエリア</button><button data-mode="world">世界地図</button></div><button class="bm-close" id="bm-close">✕ 閉じる</button></div>' +
      '<div class="bm-body"><canvas id="bm-canvas"></canvas><div class="bm-floors" id="bm-floors"></div><div class="bm-tip" id="bm-tip"></div><div class="bm-ctl"><button data-act="in">＋</button><button data-act="out">－</button><button data-act="home">◎ 現在地</button></div></div>' +
      '<div class="bm-legend" id="bm-legend"></div></div>';
    Minimap.layer = layer; Minimap.box = document.getElementById('mm-box'); Minimap.canvas = document.getElementById('mm-canvas'); Minimap.titleEl = document.getElementById('mm-title');
    Minimap.big = document.getElementById('bigmap'); Minimap.bigCanvas = document.getElementById('bm-canvas');
    Minimap.box.addEventListener('click', function (e) { e.stopPropagation(); Minimap.toggle(); });
    document.getElementById('bm-close').addEventListener('click', function () { Minimap.close(); });
    Minimap.big.querySelectorAll('.bm-tabs button').forEach(function (b) { b.addEventListener('click', function () { Minimap.setMode(b.getAttribute('data-mode')); }); });
    Minimap.big.querySelectorAll('.bm-ctl button').forEach(function (b) { b.addEventListener('click', function () { var a = b.getAttribute('data-act'); if (a === 'in') Minimap.zoomBy(1.25); else if (a === 'out') Minimap.zoomBy(0.8); else Minimap.home(); }); });
    bindPointer(Minimap.bigCanvas);
    Minimap.resize();
    root.addEventListener('resize', Minimap.resize);
    // 探索シーン以外（戦闘・タイトル・リザルト等）では frame() が呼ばれないので、表示状態だけ定期的に同期する
    setInterval(function () { try { var show = Minimap.shouldShow(); if (!show) { Minimap.box.classList.remove('on'); if (Minimap.open && root.Engine.top() !== root.World.scene) Minimap.close(); } } catch (e) { } }, 120);
  };
  Minimap.resize = function () {
    if (!Minimap.canvas) return;
    var st = root.State.data && root.State.data.settings; var mobile = root.innerWidth <= 720; var big = st && st.minimapSize === 'large';
    var w = mobile ? 104 : 160, h = mobile ? 78 : 120; if (big) { w = Math.round(w * 1.3); h = Math.round(h * 1.3); }
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    Minimap.canvas.width = w * dpr; Minimap.canvas.height = h * dpr; Minimap.canvas.style.width = w + 'px'; Minimap.canvas.style.height = h + 'px'; Minimap.mmW = w; Minimap.mmH = h; Minimap.dpr = dpr;
    if (Minimap.open) Minimap.layoutBig();
  };
  // 表示してよい状態か（探索シーンが最前面・モーダルなし・設定ON）
  Minimap.shouldShow = function () {
    var W = root.World, E = root.Engine; var d = root.State.data; if (!d || !W || !W.map || !W.scene) return false;
    if (d.settings.minimap === 'off') return false;
    if (E.top() !== W.scene) return false;
    if (W.busy || Minimap.open) return false;
    var ui = document.getElementById('ui'); if (ui && ui.children.length) return false;
    return true;
  };
  // 毎フレーム（ExploreScene.update から）
  Minimap.frame = function () {
    if (!Minimap.box) return;
    try { Minimap._frame(); } catch (e) { if (!Minimap._err) { Minimap._err = true; if (root.console) console.error('minimap', e); } Minimap.box.classList.remove('on'); }   // 地図の不具合でゲーム本体を止めない
  };
  Minimap._frame = function () {
    var W = root.World, Input = root.Engine.Input;
    // Mキー：拡大マップの開閉（探索中のみ）
    if (Minimap.open) { if (Input.consume('map') || Input.consume('cancel')) Minimap.close(); Input.consume('ok'); }
    else if (Input.consume('map') && !W.busy && root.Engine.top() === W.scene && !(document.getElementById('ui').children.length)) Minimap.openBig();
    var show = Minimap.shouldShow();
    Minimap.box.classList.toggle('on', show);
    if (show) Minimap.drawMini();
    if (Minimap.open) Minimap.drawBig();
  };
  Minimap.drawMini = function () {
    var W = root.World, m = W.map, p = W.player; var ctx = Minimap.canvas.getContext('2d'); var dpr = Minimap.dpr, w = Minimap.mmW, h = Minimap.mmH;
    Minimap.titleEl.textContent = m.name;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    var t = getTerrain(m, false); var cell = t.cell; var TS = root.Engine.TS;
    // プレイヤー（補間座標）を中心に。端では補正
    var pxT = p.px / TS + 0.5, pyT = p.py / TS + 0.5;
    var mw = m.w * cell, mh = m.h * cell;
    var ox = pxT * cell - w / 2, oy = pyT * cell - h / 2;
    if (mw <= w) ox = (mw - w) / 2; else ox = Math.max(0, Math.min(mw - w, ox));
    if (mh <= h) oy = (mh - h) / 2; else oy = Math.max(0, Math.min(mh - h, oy));
    ctx.save(); ctx.translate(-ox, -oy);
    drawMapLayer(ctx, m, cell, false);
    // 建物の施設アイコン（町）
    m.buildings.forEach(function (b) { drawIcon(ctx, b.type, b.doorAbs.x * cell + cell / 2, (b.y + b.h / 2) * cell, Math.max(3, cell * 0.9)); });
    // プレイヤー
    drawArrow(ctx, pxT * cell, pyT * cell, p.dir, Math.max(4, cell * 1.1), '#ffd24a');
    ctx.restore();
    // 内側の縁（ビネット）
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  };

  /* ---------- 探索イベント ---------- */
  Minimap.onEnterMap = function (map, p) { Minimap.reveal(map, p.x, p.y, 3); Minimap._floor = null; };
  Minimap.onStep = function (map, p) { Minimap.reveal(map, p.x, p.y, 3); };

  /* ---------- ワールド上の位置解決（町の内部座標とワールド座標を混同しない） ---------- */
  Minimap.worldPosOf = function (mapId, depth) {
    depth = depth || 0; if (mapId === 'world' || (root.MAP_DEFS[mapId] && root.MAP_DEFS[mapId].region)) return null; if (depth > 8) return null;
    var L = regionLocations().filter(function (l) { return l.to === mapId; })[0]; if (L) return { x: L.x, y: L.y, loc: L, region: L.region };
    // このマップへ入るワープを持つ親マップをたどる
    var defs = root.MAP_DEFS; var ids = Object.keys(defs);
    for (var i = 0; i < ids.length; i++) { var pid = ids[i]; if (pid === mapId) continue; var pm = root.World.maps[pid] || null; var warps = pm ? pm.warps : (defs[pid].warps || []).concat((defs[pid].buildings || []).map(function (b) { return { to: b.interior }; })); if (warps.some(function (w) { return w.to === mapId; })) { var r = Minimap.worldPosOf(pid, depth + 1); if (r) return r; } }
    return null;
  };
  // ダンジョンの階層グループ（ワープでつながるダンジョンマップ）
  Minimap.floorsOf = function (mapId) {
    var defs = root.MAP_DEFS; var seen = {}; var q = [mapId]; var out = [];
    while (q.length) { var id = q.shift(); if (seen[id] || !defs[id] || defs[id].kind !== 'dungeon') continue; seen[id] = true; out.push(id); (defs[id].warps || []).forEach(function (w) { if (defs[w.to] && defs[w.to].kind === 'dungeon') q.push(w.to); }); Object.keys(defs).forEach(function (o) { if (defs[o].kind === 'dungeon' && (defs[o].warps || []).some(function (w) { return w.to === id; })) q.push(o); }); }
    return out.sort();
  };

  /* ---------- 拡大マップ ---------- */
  Minimap.toggle = function () { if (Minimap.open) Minimap.close(); else Minimap.openBig(); };
  Minimap.openBig = function () {
    var W = root.World; if (!W.map || Minimap.open) return;
    Minimap.open = true; W.busy = true; root.Engine.Input.clear();
    Minimap.big.classList.add('on'); Minimap.mode = 'area'; Minimap._floor = W.map.id; Minimap.clearTip();
    Minimap.big.querySelectorAll('.bm-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === 'area'); });
    Minimap.layoutBig(); Minimap.home();
  };
  Minimap.close = function () { if (!Minimap.open) return; Minimap.open = false; Minimap.big.classList.remove('on'); root.World.busy = false; root.Engine.Input.clear(); };
  Minimap.clearTip = function () { Minimap._tip = null; var tip = document.getElementById('bm-tip'); if (tip) tip.classList.remove('on'); };
  Minimap.setMode = function (mode) { Minimap.mode = mode; Minimap.clearTip(); Minimap.big.querySelectorAll('.bm-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === mode); }); Minimap.home(); };
  Minimap.layoutBig = function () {
    var body = Minimap.big.querySelector('.bm-body'); var rect = body.getBoundingClientRect(); var dpr = Math.min(2, root.devicePixelRatio || 1);
    Minimap.bigCanvas.width = Math.max(1, Math.round(rect.width * dpr)); Minimap.bigCanvas.height = Math.max(1, Math.round(rect.height * dpr)); Minimap.bigCanvas.style.width = rect.width + 'px'; Minimap.bigCanvas.style.height = rect.height + 'px'; Minimap.bigW = rect.width; Minimap.bigH = rect.height; Minimap.bigDpr = dpr;
  };
  // 世界地図モード：今いる地域（町・ダンジョンの中なら、それが属する地域）
  Minimap.currentRegionId = function () { var W = root.World; if (isRegion(W.map)) return W.map.id; var wp = Minimap.worldPosOf(W.map.id); return wp && wp.region ? wp.region : 'world'; };
  function currentBigMap() { if (Minimap.mode === 'world') return root.World.getMap(Minimap.currentRegionId()); var id = Minimap._floor || root.World.map.id; var m = root.World.maps[id] || root.World.getMap(id); if (m !== root.World.map) root.World.applyState(m); return m; }
  Minimap.home = function () {
    var m = currentBigMap(); var t = getTerrain(m, true); var cell = t.cell; var W = root.World;
    var fit = Math.min(Minimap.bigW / (m.w * cell), Minimap.bigH / (m.h * cell));
    Minimap.zoom = Minimap.mode === 'world' ? Math.max(fit, 0.9) : Math.max(fit, Math.min(1.2, fit * 1.0));
    if (Minimap.mode === 'world') Minimap.zoom = fit; // 世界地図は全体表示から
    var focus = Minimap.focusTile(m);
    Minimap.pan = { x: Minimap.bigW / 2 - (focus.x + 0.5) * cell * Minimap.zoom, y: Minimap.bigH / 2 - (focus.y + 0.5) * cell * Minimap.zoom };
    Minimap.clampPan(m, cell);
  };
  // 注目タイル：エリアなら自分の位置（他の階層ならその階の入口）、世界地図なら現在地域
  Minimap.focusTile = function (m) {
    var W = root.World;
    if (Minimap.mode === 'world') { if (isRegion(W.map)) return { x: W.player.x, y: W.player.y }; var wp = Minimap.worldPosOf(W.map.id); return wp ? { x: wp.x, y: wp.y } : { x: m.w / 2, y: m.h / 2 }; }
    if (m === W.map) return { x: W.player.x, y: W.player.y };
    var w0 = m.warps[0]; return w0 ? { x: w0.x, y: w0.y } : { x: m.w / 2, y: m.h / 2 };
  };
  Minimap.clampPan = function (m, cell) {
    var z = Minimap.zoom; var mw = m.w * cell * z, mh = m.h * cell * z; var W = Minimap.bigW, H = Minimap.bigH;
    if (mw <= W) Minimap.pan.x = (W - mw) / 2; else Minimap.pan.x = Math.min(0, Math.max(W - mw, Minimap.pan.x));
    if (mh <= H) Minimap.pan.y = (H - mh) / 2; else Minimap.pan.y = Math.min(0, Math.max(H - mh, Minimap.pan.y));
  };
  Minimap.zoomBy = function (f, cx, cy) {
    var m = currentBigMap(); var cell = getTerrain(m, true).cell; var z0 = Minimap.zoom; var z1 = Math.max(0.3, Math.min(6, z0 * f)); if (cx === undefined) { cx = Minimap.bigW / 2; cy = Minimap.bigH / 2; }
    Minimap.pan.x = cx - (cx - Minimap.pan.x) * (z1 / z0); Minimap.pan.y = cy - (cy - Minimap.pan.y) * (z1 / z0); Minimap.zoom = z1; Minimap.clampPan(m, cell);
  };
  function bindPointer(cv) {
    var drag = null, pinch = null;
    cv.addEventListener('mousedown', function (e) { drag = { x: e.clientX, y: e.clientY, px: Minimap.pan.x, py: Minimap.pan.y, moved: false }; e.preventDefault(); });
    root.addEventListener('mousemove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; Minimap.pan.x = drag.px + dx; Minimap.pan.y = drag.py + dy; Minimap.clampPan(currentBigMap(), getTerrain(currentBigMap(), true).cell); });
    root.addEventListener('mouseup', function (e) { if (!drag) return; if (!drag.moved) Minimap.clickAt(e.clientX, e.clientY); drag = null; });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var r = cv.getBoundingClientRect(); Minimap.zoomBy(e.deltaY < 0 ? 1.15 : 0.87, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    cv.addEventListener('touchstart', function (e) { e.preventDefault(); if (e.touches.length === 1) { var t = e.touches[0]; drag = { x: t.clientX, y: t.clientY, px: Minimap.pan.x, py: Minimap.pan.y, moved: false }; pinch = null; } else if (e.touches.length === 2) { drag = null; pinch = { d: dist(e.touches), z: Minimap.zoom, cx: (e.touches[0].clientX + e.touches[1].clientX) / 2, cy: (e.touches[0].clientY + e.touches[1].clientY) / 2 }; } }, { passive: false });
    cv.addEventListener('touchmove', function (e) { e.preventDefault(); var m = currentBigMap(); var cell = getTerrain(m, true).cell; if (pinch && e.touches.length === 2) { var r = cv.getBoundingClientRect(); var f = dist(e.touches) / pinch.d; var z1 = Math.max(0.3, Math.min(6, pinch.z * f)); var cx = pinch.cx - r.left, cy = pinch.cy - r.top; Minimap.pan.x = cx - (cx - Minimap.pan.x) * (z1 / Minimap.zoom); Minimap.pan.y = cy - (cy - Minimap.pan.y) * (z1 / Minimap.zoom); Minimap.zoom = z1; Minimap.clampPan(m, cell); } else if (drag && e.touches.length === 1) { var t = e.touches[0]; var dx = t.clientX - drag.x, dy = t.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true; Minimap.pan.x = drag.px + dx; Minimap.pan.y = drag.py + dy; Minimap.clampPan(m, cell); } }, { passive: false });
    cv.addEventListener('touchend', function (e) { if (drag && !drag.moved && e.changedTouches.length) Minimap.clickAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY); if (e.touches.length === 0) { drag = null; pinch = null; } });
    function dist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
  }
  // 施設アイコン・地名のクリック → 名前表示
  Minimap.clickAt = function (clientX, clientY) {
    var r = Minimap.bigCanvas.getBoundingClientRect(); var sx = clientX - r.left, sy = clientY - r.top; var best = null, bd = 18;
    (Minimap._hot || []).forEach(function (h) { var d = Math.hypot(h.x - sx, h.y - sy); if (d < bd) { bd = d; best = h; } });
    Minimap._tip = best ? { text: best.text, x: best.x, y: best.y } : null;
    var tip = document.getElementById('bm-tip'); if (best) { tip.textContent = best.text; tip.style.left = Math.round(best.x) + 'px'; tip.style.top = Math.round(best.y) + 'px'; tip.classList.add('on'); } else tip.classList.remove('on');
  };
  Minimap.drawBig = function () {
    var W = root.World, d = root.State.data; var m = currentBigMap(); var t = getTerrain(m, true); var cell = t.cell; var z = Minimap.zoom;
    var cv = Minimap.bigCanvas; var ctx = cv.getContext('2d'); var dpr = Minimap.bigDpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b1226'; ctx.fillRect(0, 0, Minimap.bigW, Minimap.bigH);
    var title = document.getElementById('bm-title');
    ctx.save(); ctx.translate(Minimap.pan.x, Minimap.pan.y); ctx.scale(z, z);
    drawMapLayer(ctx, m, cell, true);
    ctx.restore();
    var hot = [];
    function toScreen(tx, ty) { return { x: Minimap.pan.x + (tx + 0.5) * cell * z, y: Minimap.pan.y + (ty + 0.5) * cell * z }; }
    if (Minimap.mode === 'world') {
      title.textContent = m.name;
      regionLocations().filter(function (L) { return L.region === m.id; }).forEach(function (L) {
        var visited = !!d.visited[L.to]; var s = toScreen(L.x, L.y);
        if (!visited) return;
        drawSymbol(ctx, L.icon === 'village' ? 'town' : L.icon === 'castle_icon' ? 'castle' : 'cave', s.x, s.y, 7);
        ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = '#fff'; ctx.strokeText(L.name, s.x, s.y + 20); ctx.fillText(L.name, s.x, s.y + 20);
        hot.push({ x: s.x, y: s.y, text: L.name + (L.icon === 'cave_icon' ? '（ダンジョン）' : '（町）') });
      });
      // 現在地（ワールド上にいる／町やダンジョンの中にいる）
      // 乗り物（この地域にある船など）
      if (root.Vehicle) root.Vehicle.onMap(m.id).forEach(function (v) { if (v.aboard) return; var sv = toScreen(v.x, v.y); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(sv.x - 7, sv.y + 2); ctx.lineTo(sv.x + 7, sv.y + 2); ctx.lineTo(sv.x + 4, sv.y + 6); ctx.lineTo(sv.x - 4, sv.y + 6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(sv.x - 1, sv.y - 8, 2, 10); ctx.beginPath(); ctx.moveTo(sv.x + 1, sv.y - 8); ctx.lineTo(sv.x + 7, sv.y - 3); ctx.lineTo(sv.x + 1, sv.y - 1); ctx.closePath(); ctx.fill(); hot.push({ x: sv.x, y: sv.y, text: root.VEHICLES[v.id].name + '（停泊中）' }); });
      var cur = isRegion(W.map) ? { x: W.player.x, y: W.player.y, dir: W.player.dir } : (function () { var wp = Minimap.worldPosOf(W.map.id); return wp ? { x: wp.x, y: wp.y, dir: 'down', inside: wp.loc ? wp.loc.name : W.map.name } : null; })();
      if (cur) { var cs = toScreen(cur.x, cur.y); if (cur.inside) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cs.x, cs.y, 13 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2); ctx.stroke(); } drawArrow(ctx, cs.x, cs.y, cur.dir, 8, '#ffd24a'); title.textContent = m.name + '　—　現在地：' + (cur.inside || ('フィールド（' + cur.x + ', ' + cur.y + '）')); }
      else title.textContent = m.name + '　—　現在地：不明';
      Minimap.renderLegend([['town', '町（訪問済み）'], ['cave', 'ダンジョン（発見済み）'], ['arrow', '現在地'], ['mtn', '山脈'], ['forest', '森'], ['sand', '砂漠'], ['snow', '雪原'], ['water', '海']]);
      document.getElementById('bm-floors').innerHTML = '';
    } else {
      title.textContent = m.name;
      // 施設アイコン（建物の実際の位置・入口）
      m.buildings.forEach(function (b) { var s = toScreen(b.doorAbs.x, b.y + b.h / 2 - 0.5); drawIcon(ctx, b.type, s.x, s.y, 11); hot.push({ x: s.x, y: s.y, text: b.name || b.type }); });
      // 出入口の名前（建物ドア以外）
      m.warps.forEach(function (w) { if (hasFog(m) && !isDiscovered(m, w.x, w.y)) return; var tn = m.tiles[w.y][w.x]; if (tn === 'bld_door') return; var s = toScreen(w.x, w.y); var to = root.MAP_DEFS[w.to] || (w.to === 'world' ? root.WORLD_DEF : null); hot.push({ x: s.x, y: s.y, text: (tn === 'stairs_down' || tn === 'stairs_up' ? '階段：' : '出入口：') + (to ? to.name : w.to) }); });
      // 宝箱（発見済み）
      m.chests.forEach(function (c) { if (hasFog(m) && !isDiscovered(m, c.x, c.y)) return; var s = toScreen(c.x, c.y); hot.push({ x: s.x, y: s.y, text: d.chests[m.id + ':' + c.id] ? '宝箱（開封済み）' : '宝箱' }); });
      // 自分
      if (m === W.map) { var ps = toScreen(W.player.px / root.Engine.TS, W.player.py / root.Engine.TS); drawArrow(ctx, ps.x, ps.y, W.player.dir, 9, '#ffd24a'); }
      // 階層タブ（ダンジョン）
      var floors = m.kind === 'dungeon' ? Minimap.floorsOf(W.map.kind === 'dungeon' ? W.map.id : m.id) : [];
      var fl = document.getElementById('bm-floors');
      var html = floors.length > 1 ? floors.map(function (id) { var vis = !!d.visited[id]; var nm = root.MAP_DEFS[id].name; return '<button data-floor="' + id + '" class="' + (id === m.id ? 'on' : '') + '" ' + (vis ? '' : 'disabled') + '>' + root.Win.esc(vis ? nm : '？？？') + '</button>'; }).join('') : '';
      if (fl.getAttribute('data-html') !== html) { fl.innerHTML = html; fl.setAttribute('data-html', html); fl.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { Minimap._floor = b.getAttribute('data-floor'); Minimap.clearTip(); Minimap.home(); }); }); }
      Minimap.renderLegend(m.kind === 'dungeon' ? [['arrow', '現在地'], ['floor', '通路（探索済み）'], ['wall', '壁'], ['fog', '未探索'], ['stairs', '階段・出入口'], ['chest', '宝箱'], ['lock', '鍵の扉'], ['gate', '試練の扉'], ['boss', '強敵の気配']] :
        m.kind === 'field' ? [['arrow', '現在地'], ['grass', '草原'], ['forest', '森'], ['mtn', '山'], ['road', '道'], ['water', '海・川'], ['town', '町・ダンジョン']] :
        [['arrow', '現在地'], ['weapon', '武器屋'], ['armor', '防具屋'], ['item', '道具屋'], ['inn', '宿屋'], ['church', '教会'], ['tavern', '酒場'], ['bank', '銀行'], ['guild', 'ギルド'], ['dojo', '修行場'], ['house', '民家'], ['warp', '出入口']]);
    }
    Minimap._hot = hot;
    if (Minimap._tip) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Minimap._tip.x, Minimap._tip.y, 14, 0, Math.PI * 2); ctx.stroke(); }
  };
  Minimap.renderLegend = function (items) {
    var el = document.getElementById('bm-legend'); var key = items.map(function (i) { return i[0]; }).join(',');
    if (el.getAttribute('data-key') === key) return; el.setAttribute('data-key', key);
    el.innerHTML = items.map(function (it) { return '<span class="lg"><canvas width="18" height="18" data-k="' + it[0] + '"></canvas>' + root.Win.esc(it[1]) + '</span>'; }).join('');
    el.querySelectorAll('canvas').forEach(function (cv) { var k = cv.getAttribute('data-k'); var ctx = cv.getContext('2d');
      var colors = { mtn: '#8a7a6a', forest: '#1f5a2a', sand: '#d8c070', snow: '#e8f0ff', water: '#1f4f9a', grass: '#4f9a3f', road: '#b08a5a', floor: '#8a8a98', wall: '#2e2e3a', fog: '#0a0c18' };
      if (k === 'arrow') drawArrow(ctx, 9, 9, 'up', 6, '#ffd24a'); else if (colors[k]) { ctx.fillStyle = colors[k]; ctx.fillRect(2, 2, 14, 14); } else if (['stairs', 'chest', 'lock', 'gate', 'boss', 'town', 'cave', 'warp'].indexOf(k) >= 0) drawSymbol(ctx, k, 9, 9, 6); else drawIcon(ctx, k, 9, 9, 8); });
  };

  root.Minimap = Minimap;
})(typeof window !== 'undefined' ? window : globalThis);
