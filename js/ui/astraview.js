/* =========================================================
   UI / AstraView（v6.5 Phase E）：星界航行船アストラ号で飛ぶ画面（2D。3D版のページもこの画面で飛ぶ）
   ・12の地域を1枚の世界（js/rpg/astra.js の世界座標）として、上から見下ろして連続して飛ぶ。地域の境目で暗転しない
   ・地形の絵は地域ごとに、近づいたときに1つずつ作る（段階的な読み込み）。できるまでは地域の色で仮に描く（止まらない）
   ・低空（地形がよく見える）／高空（広く見渡せる・速い）／世界地図（全体と着陸地点。選ぶと自動で飛んで行く）
   ・着陸：決定キー＝近くの着陸地点へ降りる（町・村・城・ダンジョンの入口の近くの安全なマス）。メニュー＝着陸地点を選ぶ・高度・観測記録・セーブ
   ・3D版の本格的な飛行（3Dの地形の上を飛ぶ）は未実装（3D化しているのはポヨ村だけのため）
   ========================================================= */
(function (root) {
  'use strict';
  var AV = { scene: null, S0: 4 };
  function A() { return root.Astra; }
  function h1(x) { var n = Math.sin(x * 12.9898) * 43758.5453; return n - Math.floor(n); }
  var TC = {   // 地形の色（上から見た色）
    water: '#2f6fb8', shallow: '#4f9ad8', deep: '#1f4f8f', grass: '#5fae4f', grass2: '#4f9a3f', forest: '#2f7a3a', tree: '#2a6a32', mountain: '#7a7468', hill: '#8aa060', sand: '#e0c890',
    snow: '#eef4ff', ash: '#6a6460', cloud: '#f4f8ff', darkland: '#3a2a3a', slag: '#4a3a34', cliff: '#9a7a5a', road: '#c8b088', path: '#c8b088', path_stone: '#b0a898', stone: '#a0a0a8',
    lava: '#ff6a2a', ice: '#bfe4ff', swamp: '#4a5a3a', bridge: '#9a7a4a', farm: '#9ab04a', ruins: '#8a8478', flower: '#7ac06a', bush: '#3f8a3f', rock: '#7a7470'
  };
  function tcol(t) { if (TC[t]) return TC[t]; if (/water|sea/.test(t)) return TC.water; if (/grass/.test(t)) return TC.grass; if (/sand|dune/.test(t)) return TC.sand; if (/snow|ice/.test(t)) return TC.snow; if (/road|path/.test(t)) return TC.road; if (/tree|forest/.test(t)) return TC.forest; if (/mount|rock|cliff/.test(t)) return TC.mountain; return root.Tiles && root.Tiles.isSolid(t) ? '#6a6460' : '#8a9a6a'; }
  function shade(hex, k) { var c = hex.replace('#', ''); var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16); return 'rgb(' + Math.min(255, Math.round(r * k)) + ',' + Math.min(255, Math.round(g * k)) + ',' + Math.min(255, Math.round(b * k)) + ')'; }

  /* ---------- 地域の地形の絵（1マス 4px） ---------- */
  AV.chunks = {}; AV.built = [];
  AV.buildChunk = function (id) {
    if (AV.chunks[id]) return AV.chunks[id];
    var m = root.World.getMap(id); var S = AV.S0; var c = document.createElement('canvas'); c.width = m.w * S; c.height = m.h * S; var g = c.getContext('2d');
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
      var t = m.tiles[y][x]; var n = h1(x * 7.3 + y * 3.1 + id.length); var base = tcol(t);
      var k = 0.92 + n * 0.14; if (t === 'mountain' || t === 'cliff') k *= (y % 2 ? 0.9 : 1.08);
      g.fillStyle = shade(base.charAt(0) === '#' ? base : '#8a9a6a', k); g.fillRect(x * S, y * S, S, S);
      if ((t === 'forest' || t === 'tree') && n > 0.5) { g.fillStyle = 'rgba(0,40,10,0.45)'; g.fillRect(x * S + 1, y * S + 1, 2, 2); }
      if (t === 'mountain' && n > 0.6) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x * S + 1, y * S, 2, 1); }
      // 海岸の白い縁
      if (root.Tiles && !root.Tiles.isWater(t)) { [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) { var nx = x + d[0], ny = y + d[1]; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) return; if (root.Tiles.isWater(m.tiles[ny][nx])) { g.fillStyle = 'rgba(240,250,255,0.55)'; if (d[1]) g.fillRect(x * S, y * S + (d[1] > 0 ? S - 1 : 0), S, 1); else g.fillRect(x * S + (d[0] > 0 ? S - 1 : 0), y * S, 1, S); } }); }
    }
    // 町・城・ダンジョンの印（地域の地図の場所）
    ((root.MAP_DEFS[id] || {}).locations || []).forEach(function (L) { var col = L.icon === 'castle_icon' ? '#ffd24a' : L.icon === 'cave_icon' ? '#c0c0d0' : L.icon === 'tower_icon' ? '#ffe08a' : '#ffb04a'; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(L.x * S - 3, L.y * S - 3, S + 6, S + 6); g.fillStyle = col; g.fillRect(L.x * S - 2, L.y * S - 2, S + 4, S + 4); });
    AV.chunks[id] = c; AV.built.push(id); return c;
  };

  /* ---------- 飛ぶ場面 ---------- */
  function Scene(opts) {
    this.t = 0; this.vx = 0; this.vy = 0; this.mode = 'fly'; this.banner = null; this.queue = []; this.auto = null; this.region = undefined; this.saveT = 0; this.blockT = 0; this.sel = 0; this.busy = false;
    this.anim = opts.takeoff ? { type: 'up', t: 0, dur: 900 } : (opts.resume ? { type: 'resume', t: 0, dur: 500 } : null);
    var s = A().state(); this.alt = s.alt === 'high' ? 'high' : 'low'; this.zoom = this.zoomFor(this.alt) * (opts.takeoff ? 2.4 : 1);
  }
  Scene.prototype.zoomFor = function (alt) { return alt === 'high' ? 2.6 : 7; };
  Scene.prototype.enter = function () { document.body.classList.add('astra-flying'); };
  Scene.prototype.exit = function () { document.body.classList.remove('astra-flying'); };
  Scene.prototype.handleInput = function () {
    var I = root.Engine.Input; if (this.busy || this.anim && this.anim.type === 'down') return;
    if (this.mode === 'map') { this.mapInput(I); return; }
    if (I.consume('cancel')) { this.menu(); return; }
    if (I.consume('map') || I.consume('minimap')) { this.setAlt(this.alt === 'low' ? 'high' : 'low'); return; }
    if (I.consume('ok')) { this.tryLand(); return; }
  };
  Scene.prototype.setAlt = function (a) { this.alt = a; A().state().alt = a; this.flash(a === 'high' ? '高空：広く見渡せる・速い' : '低空：地形がよく見える'); };
  Scene.prototype.flash = function (text, sub, ms) { this.banner = { text: text, sub: sub || '', t: 0, dur: ms || 2200 }; };
  Scene.prototype.update = function (dt) {
    var s = A().state(); if (!s || !s.flying) return; var sec = dt / 1000; this.t += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    var want = this.zoomFor(this.alt); if (this.anim) { this.anim.t += dt; var k = Math.min(1, this.anim.t / this.anim.dur); if (this.anim.type === 'up') this.zoom = want * (1 + 1.4 * (1 - k * k)); if (this.anim.type === 'down') this.zoom = this.anim.z0 * (1 + 2.2 * k * k); if (k >= 1) { var a = this.anim; this.anim = null; if (a.type === 'down') { this.finishLand(a.p); return; } } }
    else this.zoom += (want - this.zoom) * Math.min(1, sec * 4);
    // 段階的な読み込み：近い地域から、1フレームに1つまで
    this.loadNear(s.wx, s.wy);
    if (this.mode === 'map' || this.busy) return;
    // 操作（自動航行中は着陸地点へ向かう）
    var I = root.Engine.Input; var ix = (I.keys.right ? 1 : 0) - (I.keys.left ? 1 : 0), iy = (I.keys.down ? 1 : 0) - (I.keys.up ? 1 : 0);
    var sp = A().SPEED[this.alt] || 26; var tvx = 0, tvy = 0;
    if (ix || iy) { this.auto = null; var l = Math.hypot(ix, iy); tvx = ix / l * sp; tvy = iy / l * sp; }
    else if (this.auto) { var dx = this.auto.wx - s.wx, dy = this.auto.wy - s.wy, dd = Math.hypot(dx, dy); if (dd < 0.6) { var p = this.auto; this.auto = null; this.vx = this.vy = 0; s.wx = p.wx; s.wy = p.wy; this.startLand(p); return; } var v = Math.min(sp * 1.15, dd * 3 + 4); tvx = dx / dd * v; tvy = dy / dd * v; }
    var acc = Math.min(1, sec * (this.auto ? 6 : 3.5)); this.vx += (tvx - this.vx) * acc; this.vy += (tvy - this.vy) * acc;
    if (Math.abs(this.vx) < 0.01 && Math.abs(this.vy) < 0.01) { this.vx = this.vy = 0; }
    var nx = s.wx + this.vx * sec, ny = s.wy + this.vy * sec;
    var bl = A().blockAt(nx, ny);
    if (bl) { this.vx = this.vy = 0; this.auto = null; if (this.t - this.blockT > 2500) { this.blockT = this.t; this.flash(bl.region ? '未踏の空域' : '星の海の果て', bl.reason, 3200); } }
    else { s.wx = nx; s.wy = ny; }
    if (this.vx || this.vy) s.hd = Math.atan2(this.vy, this.vx);
    // 地域の境目：名前を出す（暗転しない）・観測記録
    var rg = A().regionAt(s.wx, s.wy);
    if (rg !== this.region) {
      var first = this.region === undefined; this.region = rg;
      var nm = rg ? ((root.MAP_DEFS[rg] || {}).name || rg) : '外洋'; if (!first || this.anim) this.flash(nm, rg ? '' : '地域と地域のあいだの海');
      var rec = rg ? A().record(rg) : null;
      if (rec) { this.flash(nm, '観測記録 ' + rec.n + '/' + A().ids().length + '：' + rec.text, 5200); if (root.Audio) root.Audio.sfx('magic'); if (rec.all) this.logComplete(); }
    }
    // 位置の保存（オートセーブ。飛んでいる途中で閉じても、その場所から再開できる）
    this.saveT += dt; if (this.saveT > 8000) { this.saveT = 0; root.State.autosave(); }
  };
  Scene.prototype.loadNear = function (wx, wy) {
    var self = this; var R = this.alt === 'high' ? 260 : 180; var need = A().ids().filter(function (id) { if (AV.chunks[id]) return false; var r = A().rect(id); var dx = Math.max(r.x0 - wx, 0, wx - r.x1), dy = Math.max(r.y0 - wy, 0, wy - r.y1); return Math.hypot(dx, dy) < R; });
    if (this.mode === 'map' && !need.length) need = A().ids().filter(function (id) { return !AV.chunks[id]; });
    if (!need.length) return; need.sort(function (a, b) { var ra = A().rect(a), rb = A().rect(b); return Math.hypot((ra.x0 + ra.x1) / 2 - wx, (ra.y0 + ra.y1) / 2 - wy) - Math.hypot((rb.x0 + rb.x1) / 2 - wx, (rb.y0 + rb.y1) / 2 - wy); });
    try { AV.buildChunk(need[0]); } catch (e) { AV.chunks[need[0]] = 'fail'; if (root.console) console.warn('astra chunk', need[0], e); }
  };
  Scene.prototype.tryLand = function () {
    var s = A().state(); var p = A().nearestLanding(s.wx, s.wy, this.alt === 'high' ? 22 : 14);
    if (!p) { this.flash('ここには降りられない', '町・村・城・ダンジョンの入口の近くまで飛ぼう（メニュー「着陸地点を選ぶ」でも行ける）', 3000); return; }
    this.auto = p; this.flash(p.name + 'の近くへ降りる', '');
  };
  Scene.prototype.startLand = function (p) { this.anim = { type: 'down', t: 0, dur: 800, z0: this.zoom, p: p }; if (root.Audio) root.Audio.sfx('step'); };
  Scene.prototype.finishLand = function (p) {
    var r = A().land(p); var E = root.Engine;
    if (!r) { this.flash('着陸できなかった', '別の場所を選ぼう'); var s = A().state(); s.flying = true; return; }
    if (E.scenes.indexOf(this) >= 0) { var i = E.scenes.indexOf(this); E.scenes.splice(i, 1); this.exit(); }
    AV.scene = null; root.World.busy = false; root.Win.toast('着陸した：' + p.name + 'の近く'); root.State.autosave();
  };
  Scene.prototype.logComplete = async function () {
    var d = root.State.data; if (d.flags.astra_log_done) return; this.busy = true; this.vx = this.vy = 0;
    try { if (root.AstraEvents && root.AstraEvents.logComplete) await root.AstraEvents.logComplete(); else d.flags.astra_log_done = true; } catch (e) { if (root.console) console.error(e); }
    this.busy = false; root.State.autosave();
  };
  Scene.prototype.menu = async function () {
    if (this.busy) return; this.busy = true; this.vx = this.vy = 0; var Win = root.Win;
    try {
      var i = await Win.list([{ label: '着陸地点を選ぶ（世界地図）' }, { label: '高度', right: this.alt === 'high' ? '高空' : '低空' }, { label: '観測記録', right: A().logCount() + '/' + A().ids().length }, { label: 'セーブ' }, { label: '操作', sub: '方向キー：飛ぶ／決定：近くに降りる／N・M：高度／X：このメニュー' }], { title: '星界航行船アストラ号' });
      if (i === 0) { this.openMap(); }
      if (i === 1) this.setAlt(this.alt === 'low' ? 'high' : 'low');
      if (i === 2) await A().showLog();
      if (i === 3 && root.Menu && root.Menu.save) await root.Menu.save();
    } catch (e) { if (root.Engine) root.Engine.onError(e); }
    this.busy = false;
  };
  Scene.prototype.openMap = function () { this.mode = 'map'; this.points = A().allLandingPoints(); var s = A().state(); var best = 0, bd = 1e9; this.points.forEach(function (p, i) { var d = Math.hypot(p.wx - s.wx, p.wy - s.wy); if (d < bd) { bd = d; best = i; } }); this.sel = best; };
  Scene.prototype.mapInput = function (I) {
    var pts = this.points || []; if (I.consume('cancel')) { this.mode = 'fly'; return; }
    if (I.consume('ok')) { var p = pts[this.sel]; this.mode = 'fly'; if (p) { this.auto = p; this.flash(p.name + 'へ自動で飛ぶ', '方向キーを押すと手動にもどる'); } return; }
    var dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (var k in dirs) if (I.consume(k)) { var cur = pts[this.sel]; if (!cur) return; var best = -1, bs = 1e9; var dv = dirs[k]; pts.forEach(function (p, i) { if (i === this.sel) return; var dx = p.wx - cur.wx, dy = p.wy - cur.wy; var along = dx * dv[0] + dy * dv[1]; if (along <= 0.5) return; var side = Math.abs(dx * dv[1] - dy * dv[0]); var sc = along + side * 2.2; if (sc < bs) { bs = sc; best = i; } }, this); if (best >= 0) this.sel = best; }
  };
  /* ---------- 描く ---------- */
  Scene.prototype.draw = function (ctx) {
    var W = ctx.canvas.width, H = ctx.canvas.height; var s = A().state(); if (!s) return; var t = this.t / 1000;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (this.mode === 'map') { this.drawMap(ctx, W, H, t); ctx.restore(); return; }
    var z = this.zoom; var cx = s.wx - W / 2 / z, cy = s.wy - H / 2 / z;
    // 海（外洋）：ゆっくり動く波
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16407a'); g.addColorStop(1, '#0e2c5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var Q = (root.BattleBG65 && root.BattleBG65.quality) ? root.BattleBG65.quality() : 'high';   // 設定「戦闘背景の品質」に合わせて軽くする（軽量：波の線なし・雲を減らす）
    ctx.fillStyle = 'rgba(160,210,255,0.13)'; var step = Q === 'low' ? 1e9 : 26; for (var yy = -((cy * z) % step) - step; yy < H + step; yy += step) for (var xx = -((cx * z) % step) - step; xx < W + step; xx += step) { var o = Math.sin(t * 1.2 + (xx + cx * z) * 0.05 + (yy + cy * z) * 0.07) * 4; ctx.fillRect(xx + o, yy, 9, 1); }
    // 地域
    var self = this;
    A().ids().forEach(function (id) {
      var r = A().rect(id); var sx = (r.x0 - cx) * z, sy = (r.y0 - cy) * z, sw = (r.x1 - r.x0) * z, sh = (r.y1 - r.y0) * z;
      if (sx > W || sy > H || sx + sw < 0 || sy + sh < 0) return;
      var ch = AV.chunks[id]; var L = root.WorldMap && root.WorldMap.LAYOUT && root.WorldMap.LAYOUT[id];
      if (ch && ch !== 'fail') { ctx.imageSmoothingEnabled = z < AV.S0; ctx.drawImage(ch, sx, sy, sw, sh); ctx.imageSmoothingEnabled = false; }
      else { ctx.fillStyle = (L && L.color) || '#4a7a4a'; ctx.globalAlpha = 0.85; ctx.fillRect(sx + sw * 0.08, sy + sh * 0.1, sw * 0.84, sh * 0.8); ctx.globalAlpha = 1; }
      if (id === 'world_sky') {   // 雲海の縁：ふちに沿って雲のかたまりを置いて、四角い境目をぼかす
        ctx.fillStyle = 'rgba(244,248,255,0.55)'; var per = 2 * (r.x1 - r.x0 + r.y1 - r.y0); for (var cb = 0; cb < per; cb += 7) { var ex, ey; var q = cb; if (q < r.x1 - r.x0) { ex = r.x0 + q; ey = r.y0; } else if ((q -= r.x1 - r.x0) < r.y1 - r.y0) { ex = r.x1; ey = r.y0 + q; } else if ((q -= r.y1 - r.y0) < r.x1 - r.x0) { ex = r.x1 - q; ey = r.y1; } else { q -= r.x1 - r.x0; ex = r.x0; ey = r.y1 - q; }
          var rr = (5 + h1(cb * 1.3) * 6) * z; var px0 = (ex - cx) * z, py0 = (ey - cy) * z; if (px0 < -rr || py0 < -rr || px0 > W + rr || py0 > H + rr) continue; ctx.beginPath(); ctx.arc(px0 + (h1(cb) - 0.5) * 4 * z, py0 + (h1(cb * 2) - 0.5) * 4 * z, rr, 0, Math.PI * 2); ctx.fill(); }
      }
      if (!A().unlocked(id)) {   // 未踏の空域：厚い雲
        ctx.fillStyle = 'rgba(30,36,56,0.82)'; ctx.fillRect(sx - A().LOCK_MARGIN * z, sy - A().LOCK_MARGIN * z, sw + 2 * A().LOCK_MARGIN * z, sh + 2 * A().LOCK_MARGIN * z);
        ctx.fillStyle = 'rgba(200,210,230,0.18)'; for (var i = 0; i < 18; i++) { var px = sx + h1(i * 3 + id.length) * sw, py = sy + h1(i * 7 + id.length) * sh; ctx.beginPath(); ctx.arc(px + Math.sin(t * 0.4 + i) * 10, py, (14 + h1(i) * 26) * z / 4, 0, Math.PI * 2); ctx.fill(); }
        self.label(ctx, '未踏の空域', sx + sw / 2, sy + sh / 2, '#c8d0e8');
      } else if (z <= 3.2) self.label(ctx, (root.MAP_DEFS[id] || {}).name || id, sx + sw / 2, sy + 14, '#fff4c8');
    });
    // 着陸地点（低空：名前つき）
    var near = A().nearestLanding(s.wx, s.wy, this.alt === 'high' ? 22 : 14);
    A().allLandingPoints().forEach(function (p) { var px = (p.wx - cx) * z, py = (p.wy - cy) * z; if (px < -20 || py < -20 || px > W + 20 || py > H + 20) return; var on = near && near.id === p.id && near.region === p.region; var pr = on ? 6 + Math.sin(t * 5) * 1.5 : 4;
      ctx.strokeStyle = on ? '#ffe08a' : 'rgba(255,240,200,0.7)'; ctx.lineWidth = on ? 2 : 1; ctx.beginPath(); ctx.moveTo(px, py - pr); ctx.lineTo(px + pr, py); ctx.lineTo(px, py + pr); ctx.lineTo(px - pr, py); ctx.closePath(); ctx.stroke();
      if (z >= 5 || on) self.label(ctx, p.name, px, py - 10, on ? '#ffe08a' : '#ffffff', 11); });
    if (this.auto) { var ax = (this.auto.wx - cx) * z, ay = (this.auto.wy - cy) * z; ctx.strokeStyle = 'rgba(255,224,138,0.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]); }
    // 雲（高空ほど多く、速く流れる）
    var cn = (this.alt === 'high' ? 16 : 7) * (Q === 'low' ? 0.4 : Q === 'normal' ? 0.7 : 1) | 0; for (var c = 0; c < cn; c++) { var wx = (h1(c * 5.1) * A().WORLD.w + t * (6 + c % 4)) % A().WORLD.w, wy = h1(c * 9.7) * A().WORLD.h; var px2 = (wx - cx) * z * 1.15 - W * 0.075, py2 = (wy - cy) * z * 1.15 - H * 0.075; if (px2 < -200 || py2 < -120 || px2 > W + 200 || py2 > H + 120) continue; ctx.fillStyle = 'rgba(255,255,255,0.22)'; for (var k2 = 0; k2 < 4; k2++) { ctx.beginPath(); ctx.arc(px2 + k2 * 22 * z / 4, py2 + (k2 % 2) * 8, (18 + k2 * 4) * Math.max(0.6, z / 5), 0, Math.PI * 2); ctx.fill(); } }
    // 船（影は高度ぶんずらす）
    var alt = this.alt === 'high' ? 26 : 12; var sc = this.anim && this.anim.type === 'down' ? 1 - Math.min(1, this.anim.t / this.anim.dur) * 0.5 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(W / 2 + alt * 0.6 * sc, H / 2 + alt * sc, 15 * sc, 6 * sc, s.hd || 0, 0, Math.PI * 2); ctx.fill();
    AV.drawShip(ctx, W / 2, H / 2, s.hd || 0, sc * 1.2, t, Math.hypot(this.vx, this.vy) > 1);
    // 表示（地域・座標・高度・案内）
    var rg = A().regionAt(s.wx, s.wy); var loc = A().toLocal(s.wx, s.wy); var nr = rg ? null : A().nearestRegion(s.wx, s.wy);
    var top = rg ? ((root.MAP_DEFS[rg] || {}).name || rg) + (loc ? '（' + loc.x + ', ' + loc.y + '）' : '') : '外洋' + (nr ? '（' + ((root.MAP_DEFS[nr.id] || {}).name || nr.id) + 'まで約' + Math.round(nr.d) + 'マス）' : '');
    this.panel(ctx, 8, 8, top, '世界 ' + Math.round(s.wx) + ', ' + Math.round(s.wy) + '　' + (this.alt === 'high' ? '高空' : '低空') + '　観測 ' + A().logCount() + '/' + A().ids().length);
    var hint = near ? '決定：' + near.name + 'の近くに降りる' : (this.auto ? this.auto.name + 'へ自動で飛んでいる' : '方向キー：飛ぶ　決定：近くに降りる');
    this.panel(ctx, 8, H - 34, hint + '　X：メニュー　N：高度', null);
    if (this.banner) { var b = this.banner; var a = Math.min(1, b.t / 250, (b.dur - b.t) / 400); ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = 'rgba(8,14,32,0.82)'; var bw = Math.min(W - 40, 560); ctx.fillRect(W / 2 - bw / 2, 52, bw, b.sub ? 64 : 34); ctx.strokeStyle = '#e8c15a'; ctx.strokeRect(W / 2 - bw / 2 + 0.5, 52.5, bw - 1, (b.sub ? 64 : 34) - 1); ctx.fillStyle = '#ffe08a'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.text, W / 2, 75); if (b.sub) { ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; this.wrap(ctx, b.sub, W / 2, 94, bw - 20, 13); } ctx.globalAlpha = 1; }
    if (this.anim && this.anim.type !== 'resume') { var k3 = Math.min(1, this.anim.t / this.anim.dur); ctx.fillStyle = 'rgba(255,255,255,' + (this.anim.type === 'down' ? k3 * 0.5 : (1 - k3) * 0.5) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  };
  Scene.prototype.drawMap = function (ctx, W, H, t) {
    var s = A().state(); var WW = A().WORLD; var z = Math.min(W / WW.w, H / WW.h) * 0.94; var ox = (W - WW.w * z) / 2, oy = (H - WW.h * z) / 2;
    ctx.fillStyle = '#0b1a36'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#16407a'; ctx.fillRect(ox, oy, WW.w * z, WW.h * z);
    var self = this;
    A().ids().forEach(function (id) { var r = A().rect(id); var ch = AV.chunks[id]; var sx = ox + r.x0 * z, sy = oy + r.y0 * z, sw = (r.x1 - r.x0) * z, sh = (r.y1 - r.y0) * z;
      if (ch && ch !== 'fail') { ctx.imageSmoothingEnabled = true; ctx.drawImage(ch, sx, sy, sw, sh); ctx.imageSmoothingEnabled = false; } else { var L = root.WorldMap && root.WorldMap.LAYOUT && root.WorldMap.LAYOUT[id]; ctx.fillStyle = (L && L.color) || '#4a7a4a'; ctx.fillRect(sx + sw * 0.1, sy + sh * 0.1, sw * 0.8, sh * 0.8); }
      if (!A().unlocked(id)) { ctx.fillStyle = 'rgba(30,36,56,0.85)'; ctx.fillRect(sx, sy, sw, sh); self.label(ctx, '未踏', sx + sw / 2, sy + sh / 2, '#c8d0e8', 10); }
      else self.label(ctx, (root.MAP_DEFS[id] || {}).name || id, sx + sw / 2, sy + 8, '#fff4c8', 9); });
    (this.points || []).forEach(function (p, i) { var px = ox + p.wx * z, py = oy + p.wy * z; var on = i === self.sel; ctx.fillStyle = on ? '#ffe08a' : 'rgba(255,240,200,0.85)'; ctx.fillRect(px - (on ? 3 : 1.5), py - (on ? 3 : 1.5), on ? 6 : 3, on ? 6 : 3); if (on) { ctx.strokeStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(px, py, 7 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2); ctx.stroke(); } });
    var sx2 = ox + s.wx * z, sy2 = oy + s.wy * z; AV.drawShip(ctx, sx2, sy2, s.hd || 0, 0.45, t, false);
    var p = (this.points || [])[this.sel]; this.panel(ctx, 8, 8, '着陸地点を選ぶ' + (p ? '：' + p.name + '（' + ((root.MAP_DEFS[p.region] || {}).name || p.region) + '）' : '（まだない）'), '方向キー：選ぶ　決定：自動で飛んで行く　X：もどる');
  };
  Scene.prototype.label = function (ctx, text, x, y, col, size) { ctx.font = 'bold ' + (size || 12) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(text, x, y); ctx.fillStyle = col || '#fff'; ctx.fillText(text, x, y); };
  Scene.prototype.panel = function (ctx, x, y, a, b) { ctx.font = 'bold 12px sans-serif'; var w = Math.max(ctx.measureText(a).width, b ? ctx.measureText(b).width : 0) + 16; ctx.fillStyle = 'rgba(8,14,32,0.78)'; ctx.fillRect(x, y, w, b ? 38 : 24); ctx.fillStyle = '#ffe08a'; ctx.textAlign = 'left'; ctx.fillText(a, x + 8, y + 16); if (b) { ctx.fillStyle = '#e8eefc'; ctx.font = '11px sans-serif'; ctx.fillText(b, x + 8, y + 31); } };
  Scene.prototype.wrap = function (ctx, text, x, y, w, lh) { var line = '', yy = y; for (var i = 0; i < text.length; i++) { var test = line + text[i]; if (ctx.measureText(test).width > w && line) { ctx.fillText(line, x, yy); line = text[i]; yy += lh; if (yy > y + lh * 1.5) { ctx.fillText(line + '…', x, yy); return; } } else line = test; } ctx.fillText(line, x, yy); };

  /* ---------- 船の絵（上から見た形。銀の船体・金の縁・青いクリスタルの核・推進の光） ---------- */
  AV.drawShip = function (ctx, x, y, hd, sc, t, moving) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(hd || 0); ctx.scale(sc, sc);
    if (moving) { for (var i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(140,210,255,' + (0.4 - i * 0.06) + ')'; ctx.beginPath(); ctx.arc(-18 - i * 6, Math.sin(t * 20 + i) * 1.5, 4 - i * 0.5, 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(4, -7); ctx.lineTo(-10, -16); ctx.lineTo(-16, -15); ctx.lineTo(-12, -5); ctx.lineTo(-16, 0); ctx.lineTo(-12, 5); ctx.lineTo(-16, 15); ctx.lineTo(-10, 16); ctx.lineTo(4, 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8c15a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#8a90a8'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    var gl = 0.6 + 0.4 * Math.sin(t * 4); ctx.fillStyle = 'rgba(120,200,255,' + gl + ')'; ctx.beginPath(); ctx.arc(-2, 0, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -1, 2, 2);
    ctx.restore();
  };
  // 地上に止めてあるとき（VehicleArt から）：横向きの小さな船＋ゆっくり光る核
  AV.drawParked = function (ctx, dir, px, py) {
    var t = Date.now() / 1000; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    var gl = ctx.createRadialGradient(px + 16, py + 14, 2, px + 16, py + 14, 26); gl.addColorStop(0, 'rgba(140,210,255,0.35)'); gl.addColorStop(1, 'rgba(140,210,255,0)'); ctx.fillStyle = gl; ctx.fillRect(px - 10, py - 12, 52, 52);
    AV.drawShip(ctx, px + 16, py + 14 + Math.sin(t * 2) * 1.5, -Math.PI / 2, 1.15, t, false);   // 機首を上（北）に向けて止まっている
  };
  AV.open = function (opts) {
    var E = root.Engine; if (AV.scene && E.scenes.indexOf(AV.scene) >= 0) return AV.scene;
    var s = A() && A().state(); if (!s || !s.flying) return null;
    AV.scene = new Scene(opts || {}); E.push(AV.scene); return AV.scene;
  };
  AV.isOpen = function () { return !!(AV.scene && root.Engine.scenes.indexOf(AV.scene) >= 0); };
  root.AstraView = AV;
})(typeof window !== 'undefined' ? window : globalThis);
