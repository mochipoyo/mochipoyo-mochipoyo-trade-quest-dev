/* =========================================================
   UI / Battle : 戦闘シーン（描画・コマンド入力・演出）
   ロジックは rpg/combat.js。ここはイベントの再生とUI。
   ========================================================= */
(function (root) {
  'use strict';

  var Engine = root.Engine, Win = root.Win, State = root.State, Combat = root.Combat, SKILLS = root.SKILLS, ITEMS = root.ITEMS, Actors = root.Actors, Sprites = root.Sprites, JOBS = root.JOBS, ENEMIES = root.ENEMIES;
  var esc = Win.esc;
  var U = root.Ultimates || null;   // 必殺技（js/rpg/ultimates.js。なければ必殺技のコマンドを出さない）

  var BattleUI = { battle: null, scene: null };

  /* =============== 戦闘背景（場所ごとにレイヤー描画・開始時に1回キャッシュ） =============== */
  var BattleBG = {};
  function themeFor(kind, zone, mapId) {
    zone = zone || ''; mapId = mapId || '';
    if (/祠|shrine|treasure/.test(mapId)) return 'shrine';
    if (/竜|火山|火口|dragon|crater|ignas/.test(zone + mapId)) return 'volcano';   // v5.5 竜炎火山群島
    if (/砂漠|砂嵐|desert|sandstorm/.test(zone + mapId)) return 'wasteland';       // v5.5 リシア砂漠
    if (/pirate_nest|ash_cape/.test(mapId)) return 'grassland';                    // v5.6 海の小島
    if (/洞窟|cave/.test(zone + mapId)) return 'cave';
    if (/山|emal|pass|bandit/.test(zone + mapId)) return 'mountain';
    if (/荒野/.test(zone)) return 'wasteland';
    if (/森|forest/.test(zone + mapId)) return 'forest';
    if (kind === 'town') return 'town';
    if (kind === 'interior') return 'interior';
    if (kind === 'dungeon') return 'cave';
    return 'grassland';
  }
  function hrange(x) { var n = Math.sin(x * 12.9898) * 43758.5453; return n - Math.floor(n); }
  function vgrad(ctx, W, H, stops) { var g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function hills(ctx, W, y0, amp, col, seed, step) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, y0 + 200); for (var x = 0; x <= W; x += step || 24) { var h = hrange(seed + Math.floor(x / (step || 24))) * amp; ctx.lineTo(x, y0 - h); } ctx.lineTo(W, y0 + 200); ctx.closePath(); ctx.fill(); }
  function peaks(ctx, W, y0, amp, col, seed, n, snow) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, y0 + 300); var pw = W / n; for (var i = 0; i <= n; i++) { var px = i * pw + (hrange(seed + i) - 0.5) * pw * 0.6; var py = y0 - amp * (0.5 + hrange(seed * 3 + i) * 0.5); ctx.lineTo(px, py); if (i < n) ctx.lineTo(px + pw * 0.5, y0 - amp * 0.2 * hrange(seed + i * 7)); } ctx.lineTo(W, y0 + 300); ctx.closePath(); ctx.fill(); if (snow) { ctx.fillStyle = snow; for (var j = 0; j <= n; j++) { var sx = j * pw + (hrange(seed + j) - 0.5) * pw * 0.6; var sy = y0 - amp * (0.5 + hrange(seed * 3 + j) * 0.5); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 14, sy + 22); ctx.lineTo(sx - 4, sy + 18); ctx.lineTo(sx + 5, sy + 26); ctx.lineTo(sx + 15, sy + 20); ctx.closePath(); ctx.fill(); } } }
  function trees(ctx, W, y0, col, seed, n, h) { ctx.fillStyle = col; for (var i = 0; i < n; i++) { var x = (i + 0.5) * W / n + (hrange(seed + i) - 0.5) * 30; var th = h * (0.7 + hrange(seed * 2 + i) * 0.6); ctx.beginPath(); ctx.moveTo(x, y0 - th); ctx.lineTo(x - th * 0.35, y0 - th * 0.45); ctx.lineTo(x - th * 0.18, y0 - th * 0.45); ctx.lineTo(x - th * 0.5, y0); ctx.lineTo(x + th * 0.5, y0); ctx.lineTo(x + th * 0.18, y0 - th * 0.45); ctx.lineTo(x + th * 0.35, y0 - th * 0.45); ctx.closePath(); ctx.fill(); ctx.fillRect(x - 3, y0 - 4, 6, 14); } }
  function ground(ctx, W, H, y0, top, bottom, detail, seed) { var g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0); if (detail) { ctx.fillStyle = detail; for (var i = 0; i < 90; i++) { var x = hrange(seed + i) * W, y = y0 + hrange(seed * 5 + i) * (H - y0); ctx.fillRect(Math.round(x), Math.round(y), 2 + Math.round(hrange(i * 3) * 4), 2); } } }
  function stalactites(ctx, W, col, seed, n, len) { ctx.fillStyle = col; for (var i = 0; i < n; i++) { var x = (i + 0.5) * W / n + (hrange(seed + i) - 0.5) * 20; var l = len * (0.5 + hrange(seed * 2 + i)); var w = 8 + hrange(i) * 14; ctx.beginPath(); ctx.moveTo(x - w, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x, l); ctx.closePath(); ctx.fill(); } }
  function crystals(ctx, W, H, col, glow, seed, n) { for (var i = 0; i < n; i++) { var x = hrange(seed + i) * W, y = H * 0.4 + hrange(seed * 3 + i) * H * 0.3; var h = 18 + hrange(i * 5) * 30; ctx.fillStyle = glow; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(x, y - h / 2, h, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + 7, y - h * 0.6); ctx.lineTo(x + 5, y); ctx.lineTo(x - 5, y); ctx.lineTo(x - 7, y - h * 0.6); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 2, y - h * 0.8, 2, h * 0.5); } }
  BattleBG.render = function (theme, W, H, timeOfDay) {
    var c = document.createElement('canvas'); c.width = W; c.height = H; var ctx = c.getContext('2d');
    var night = timeOfDay !== undefined && (timeOfDay < 0.2 || timeOfDay > 0.8);
    var horizon = H * 0.6;
    if (theme === 'grassland') {
      vgrad(ctx, W, H, night ? [[0, '#101a3a'], [1, '#2a3a6a']] : [[0, '#3f8ad8'], [0.6, '#9fd4ff'], [1, '#d8f0ff']]);
      if (!night) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (var i = 0; i < 5; i++) { var cx = hrange(i + 1) * W, cy = 30 + hrange(i * 7) * 90; for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(cx + k * 18 - 27, cy + (k % 2) * 6, 16 + (k % 3) * 4, 0, Math.PI * 2); ctx.fill(); } } }
      else { ctx.fillStyle = '#fff'; for (var st = 0; st < 40; st++) ctx.fillRect(hrange(st * 3) * W, hrange(st * 5) * horizon * 0.8, 2, 2); ctx.fillStyle = '#f0f0d0'; ctx.beginPath(); ctx.arc(W * 0.8, 70, 26, 0, Math.PI * 2); ctx.fill(); }
      hills(ctx, W, horizon - 20, 70, night ? '#1a2a3a' : '#5a9ad0', 3, 32);
      hills(ctx, W, horizon, 40, night ? '#1f3a24' : '#3f8a3f', 7, 20);
      ground(ctx, W, H, horizon, night ? '#1f4a24' : '#4fa848', night ? '#163a1a' : '#2f7a2f', night ? '#2a5a2a' : '#6fc860', 11);
      trees(ctx, W, horizon + 6, night ? '#163a1a' : '#2f6a2f', 5, 3, 46);
    } else if (theme === 'forest') {
      vgrad(ctx, W, H, [[0, '#0f2a18'], [0.5, '#1f4a28'], [1, '#2a5a30']]);
      ctx.fillStyle = 'rgba(200,255,180,0.08)'; for (var r = 0; r < 6; r++) { ctx.beginPath(); ctx.moveTo(W * 0.3 + r * 40, 0); ctx.lineTo(W * 0.3 + r * 40 + 60, 0); ctx.lineTo(W * 0.1 + r * 40 + 60, horizon); ctx.lineTo(W * 0.1 + r * 40, horizon); ctx.closePath(); ctx.fill(); }
      trees(ctx, W, horizon - 10, '#143a1c', 2, 9, 160);
      trees(ctx, W, horizon + 4, '#1c4a24', 5, 7, 120);
      ground(ctx, W, H, horizon, '#2f6a30', '#1f4a22', '#4a8a40', 13);
      ctx.fillStyle = '#5a3a1a'; for (var rt = 0; rt < 4; rt++) ctx.fillRect(hrange(rt + 20) * W, horizon + 20 + hrange(rt + 30) * 80, 40 + hrange(rt) * 30, 5);
      ctx.fillStyle = '#c94a4a'; for (var m = 0; m < 6; m++) { var mx = hrange(m + 40) * W, my = horizon + 10 + hrange(m + 50) * 100; ctx.beginPath(); ctx.arc(mx, my, 4, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e8d9b8'; ctx.fillRect(mx - 1, my, 2, 4); ctx.fillStyle = '#c94a4a'; }
    } else if (theme === 'wasteland') {
      vgrad(ctx, W, H, [[0, '#c9602a'], [0.5, '#e8a050'], [1, '#f0d090']]);
      ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(W * 0.2, 80, 30, 0, Math.PI * 2); ctx.fill();
      peaks(ctx, W, horizon - 10, 90, '#9a5a3a', 5, 6);
      ctx.fillStyle = '#8a4a2a'; for (var ms = 0; ms < 3; ms++) { var mx2 = hrange(ms + 3) * W; ctx.fillRect(mx2, horizon - 60 - hrange(ms) * 20, 50 + hrange(ms * 2) * 40, 70); ctx.fillStyle = '#a05a30'; ctx.fillRect(mx2, horizon - 60 - hrange(ms) * 20, 50 + hrange(ms * 2) * 40, 6); ctx.fillStyle = '#8a4a2a'; }
      ground(ctx, W, H, horizon, '#c9a060', '#9a7040', '#e0c080', 17);
      ctx.fillStyle = '#6a4a2a'; for (var rk = 0; rk < 8; rk++) { var rx = hrange(rk + 60) * W, ry = horizon + 10 + hrange(rk + 70) * 100; ctx.beginPath(); ctx.ellipse(rx, ry, 8 + hrange(rk) * 10, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      for (var cc = 0; cc < 3; cc++) { var cx2 = 60 + hrange(cc + 80) * (W - 120), cy2 = horizon - 4, chh = 30 + hrange(cc + 85) * 16; ctx.fillStyle = '#2f7a50'; ctx.fillRect(cx2 - 6, cy2 - chh, 12, chh); ctx.beginPath(); ctx.arc(cx2, cy2 - chh, 6, Math.PI, 0); ctx.fill(); ctx.fillRect(cx2 - 16, cy2 - chh * 0.6, 6, chh * 0.4); ctx.fillRect(cx2 - 16, cy2 - chh * 0.6, 12, 5); ctx.fillRect(cx2 + 10, cy2 - chh * 0.75, 6, chh * 0.45); ctx.fillRect(cx2 + 4, cy2 - chh * 0.75 + chh * 0.45 - 5, 12, 5); ctx.fillStyle = '#4fb070'; ctx.fillRect(cx2 - 4, cy2 - chh, 2, chh); ctx.fillStyle = '#ff8ab0'; ctx.fillRect(cx2 - 2, cy2 - chh - 6, 4, 3); }
    } else if (theme === 'volcano') {   // v5.5 竜炎火山群島：赤い空・黒い火山・溶岩の筋
      vgrad(ctx, W, H, [[0, '#2a0a0a'], [0.55, '#7a2a14'], [1, '#c9602a']]);
      ctx.fillStyle = 'rgba(255,110,40,0.22)'; ctx.fillRect(0, horizon - 70, W, 70);
      peaks(ctx, W, horizon - 10, 130, '#2a2226', 21, 4);
      ctx.fillStyle = 'rgba(80,80,90,0.35)'; for (var sm = 0; sm < 5; sm++) { var smx = hrange(sm + 41) * W, smy = 40 + hrange(sm + 51) * 80; ctx.beginPath(); ctx.ellipse(smx, smy, 60 + hrange(sm) * 50, 16, 0, 0, Math.PI * 2); ctx.fill(); }   // 噴煙
      peaks(ctx, W, horizon, 60, '#3e3438', 33, 7);
      ground(ctx, W, H, horizon, '#5a5050', '#2e2828', '#7a6a66', 29);
      ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 3; for (var lr = 0; lr < 3; lr++) { var lry = horizon + 30 + lr * 45; ctx.beginPath(); ctx.moveTo(0, lry); for (var lx2 = 0; lx2 <= W; lx2 += 40) ctx.lineTo(lx2, lry + Math.sin(lx2 * 0.02 + lr) * 8); ctx.stroke(); }
    } else if (theme === 'mountain') {
      vgrad(ctx, W, H, [[0, '#2f6ab0'], [0.5, '#7fb0e0'], [1, '#c0d8f0']]);
      peaks(ctx, W, horizon - 30, 170, '#6a7a9a', 11, 5, '#e8f0ff');
      peaks(ctx, W, horizon, 110, '#5a6a7a', 17, 7, '#d0d8e8');
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (var cl = 0; cl < 3; cl++) { ctx.beginPath(); ctx.ellipse(hrange(cl + 9) * W, horizon - 90 + cl * 10, 70, 10, 0, 0, Math.PI * 2); ctx.fill(); }
      ground(ctx, W, H, horizon, '#7a8a7a', '#4a5a4a', '#9aa89a', 19);
      ctx.fillStyle = '#5a6a5a'; for (var bk = 0; bk < 10; bk++) { var bx = hrange(bk + 90) * W, by = horizon + 5 + hrange(bk + 95) * 110; ctx.beginPath(); ctx.moveTo(bx - 14, by + 8); ctx.lineTo(bx - 4, by - 10); ctx.lineTo(bx + 8, by - 6); ctx.lineTo(bx + 14, by + 8); ctx.closePath(); ctx.fill(); }
    } else if (theme === 'cave') {
      vgrad(ctx, W, H, [[0, '#0e0e18'], [0.5, '#22222e'], [1, '#2e2e3c']]);
      stalactites(ctx, W, '#15151f', 3, 9, 80);
      stalactites(ctx, W, '#1e1e2a', 8, 6, 50);
      ctx.fillStyle = '#1a1a26'; ctx.beginPath(); ctx.moveTo(0, horizon + 20); ctx.lineTo(0, horizon - 100); ctx.lineTo(60, horizon - 60); ctx.lineTo(110, horizon - 110); ctx.lineTo(160, horizon - 40); ctx.lineTo(220, horizon + 20); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, horizon + 20); ctx.lineTo(W, horizon - 120); ctx.lineTo(W - 70, horizon - 70); ctx.lineTo(W - 130, horizon - 100); ctx.lineTo(W - 190, horizon - 30); ctx.lineTo(W - 240, horizon + 20); ctx.closePath(); ctx.fill();
      crystals(ctx, W, H, '#5ab0ff', '#2a6aff', 5, 5);
      ground(ctx, W, H, horizon, '#3a3a48', '#24242e', '#4a4a5a', 23);
      ctx.fillStyle = '#2a4a6a'; ctx.beginPath(); ctx.ellipse(W * 0.3, horizon + 70, 60, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3f6a9a'; ctx.beginPath(); ctx.ellipse(W * 0.3, horizon + 70, 48, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a2a'; ctx.fillRect(40, horizon - 50, 4, 24); ctx.fillRect(W - 44, horizon - 50, 4, 24); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(42, horizon - 54, 5, 0, Math.PI * 2); ctx.arc(W - 42, horizon - 54, 5, 0, Math.PI * 2); ctx.fill();
    } else if (theme === 'shrine') {
      vgrad(ctx, W, H, [[0, '#1a0f2e'], [0.6, '#3a2060'], [1, '#4a2a70']]);
      ctx.fillStyle = '#5a3a80'; for (var pl = 0; pl < 6; pl++) { var px2 = 40 + pl * (W - 80) / 5; ctx.fillRect(px2 - 10, horizon - 150, 20, 160); ctx.fillStyle = '#7a5aa0'; ctx.fillRect(px2 - 14, horizon - 156, 28, 8); ctx.fillStyle = '#5a3a80'; }
      crystals(ctx, W, H, '#c0a0ff', '#8a5ad0', 9, 7);
      ground(ctx, W, H, horizon, '#4a3a6a', '#2a1a4a', '#6a5a8a', 29);
      ctx.strokeStyle = 'rgba(200,160,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, horizon + 60, 110, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, horizon + 60, 80, 0, Math.PI * 2); ctx.stroke();
    } else if (theme === 'town') {
      vgrad(ctx, W, H, [[0, '#3f8ad8'], [1, '#c0e0ff']]);
      ctx.fillStyle = '#8a6a4a'; for (var hs = 0; hs < 4; hs++) { var hx = 30 + hs * 150; ctx.fillRect(hx, horizon - 70, 100, 76); ctx.fillStyle = '#b8403f'; ctx.beginPath(); ctx.moveTo(hx - 10, horizon - 70); ctx.lineTo(hx + 50, horizon - 110); ctx.lineTo(hx + 110, horizon - 70); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#8fd0ff'; ctx.fillRect(hx + 15, horizon - 50, 18, 18); ctx.fillRect(hx + 65, horizon - 50, 18, 18); ctx.fillStyle = '#8a6a4a'; }
      ground(ctx, W, H, horizon, '#b0a090', '#8a7a6a', '#c8b8a8', 31);
    } else {
      vgrad(ctx, W, H, [[0, '#2a2030'], [1, '#4a3a30']]);
      ctx.fillStyle = '#5a4a3a'; for (var wb = 0; wb < Math.ceil(W / 40); wb++) ctx.fillRect(wb * 40, 0, 2, horizon);
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(80, 60, 6, 0, Math.PI * 2); ctx.arc(W - 80, 60, 6, 0, Math.PI * 2); ctx.fill();
      ground(ctx, W, H, horizon, '#8a6a4a', '#5a3a2a', '#a07a5a', 37);
    }
    // 足元の影（敵の立ち位置を落ち着かせる）
    var g2 = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 40); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.18)'); ctx.fillStyle = g2; ctx.fillRect(0, horizon - 10, W, 50);
    return c;
  };

  /* =============== 戦闘シーン =============== */
  function BattleScene(b, kind, opts) {
    this.b = b; this.kind = kind; this.pops = []; this.shake = {}; this.flash = 0; this.anims = []; this.t = 0; this.screenShake = 0; this.victory = -1; this.particles = [];
    // v6.5 表示は「いま再生しているイベントの時点」の状態（Combat.snapshot）。gone＝消える演出を再生した敵、bar＝HPバーの表示中の値
    this.view = Combat.snapshot(b); this.gone = {}; this.bar = {}; this.acting = null;
    this.theme = themeFor(kind, opts.zone, root.World.map ? root.World.map.id : '');
    // v6.5 Phase D 戦闘背景（14の場所×地域の色・時間帯・天気・ボス）。作れなければ従来の背景
    this.bg65 = null; try { if (root.BattleBG65) this.bg65 = root.BattleBG65.infoFor(b, { zone: opts.zone, boss: !!b.boss }); } catch (e) { this.bg65 = null; }
    this.bg = null; this.entrance = b.boss ? { t: 0, dur: 1400 } : null;
    // v6.3 特殊戦闘のカットイン（マップと敵の組み合わせが一致し、画像が読み込めたときだけ）。終わったら消える
    this.cutin = null;
    var BA = root.BossArt;
    if (BA && b.boss) {
      var encId = BA.matchEncounter(b.enemies.map(function (e) { return e.defId; }), opts, root.World.map ? root.World.map.id : null);
      var encV = encId ? BA.getEncounter(encId) : null;
      if (encV) { this.cutin = { id: encId, v: encV, name: (BA.encounter(encId) || {}).name || '', t: 0, dur: 1900 }; this.hadCutin = encId; if (this.entrance) this.entrance.delay = 1200; }
    }
  }
  BattleScene.prototype.update = function (dt) {
    this.t += dt; var self = this;
    this.pops = this.pops.filter(function (p) { p.t += dt; return p.t < 900; });
    (this.view.e || []).forEach(function (ve, i) { var cur = self.bar[i]; if (cur === undefined) { self.bar[i] = ve.hp; return; } var step = Math.max(1, ve.maxHp * dt / 260); self.bar[i] = cur > ve.hp ? Math.max(ve.hp, cur - step) : Math.min(ve.hp, cur + step); });   // v6.5 命中の瞬間から減り始める
    this.anims = this.anims.filter(function (a) { a.t += dt; return a.t < a.dur; });
    if (this.flash > 0) this.flash -= dt;
    if (this.screenShake > 0) this.screenShake -= dt;
    if (this.cutin) { this.cutin.t += dt; if (this.cutin.t >= this.cutin.dur) this.cutin = null; }
    // v6.3 ボス画像が開始に間に合わず従来の絵で始めたとき：登場演出（暗転からせり上がる）の間に読み込めたら新画像に切り替える。演出が終わったあとは切り替えない
    if (this.entrance && root.BossArt) { var BA = root.BossArt; this.b.enemies.forEach(function (e) { if (e._vis && e._vis.source !== 'bossart' && BA.wants(e.defId) && BA.get(e.defId)) { delete e._vis; delete e._sil; } }); }
    if (this.entrance) { if (this.entrance.delay > 0) this.entrance.delay -= dt; else { this.entrance.t += dt; if (this.entrance.t >= this.entrance.dur) this.entrance = null; } }
    if (this.victory >= 0) { this.victory += dt; if (Math.random() < 0.5) this.particles.push({ x: Math.random() * 640, y: -10, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 80, c: ['#ffd24a', '#ff8ab0', '#7fe3a5', '#9fd4ff', '#fff'][Math.floor(Math.random() * 5)], t: 0 }); }
    this.particles = this.particles.filter(function (p) { p.t += dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; return p.t < 4000; });
  };
  // 戦闘画面の上に重なる表示の位置（キャンバスの座標）：メッセージ欄・パーティのHP（#hud とその中身）・オートボタン。画面の向き・大きさが変わるので 0.5秒ごとに測り直す
  //   ・表示されていないもの・画面の下半分にあるものは数えない。ページの要素を測れない環境（jsdom など）では空（縮めない）
  BattleScene.prototype.overlays = function (W, H) {
    var now = Date.now(); var o = this._ov; if (o && now - o.t < 500 && o.W === W && o.H === H) return o.list;
    var list = [];
    try {
      var c = document.getElementById('game'); var cr = c && c.getBoundingClientRect();
      if (cr && cr.width > 0 && cr.height > 0) {
        var kx = W / cr.width, ky = H / cr.height; var els = [];
        ['battle-msg', 'auto-battle'].forEach(function (id) { var el = document.getElementById(id); if (el) els.push(el); });
        var hud = document.getElementById('hud'); if (hud) { els.push(hud); Array.prototype.forEach.call(hud.querySelectorAll('*'), function (el) { els.push(el); }); }
        els.forEach(function (el) {
          var q = el.getBoundingClientRect(); if (!(q.width > 0 && q.height > 0)) return;
          var st = root.getComputedStyle ? root.getComputedStyle(el) : null; if (st && (st.visibility === 'hidden' || st.display === 'none' || +st.opacity === 0)) return;
          var top = (q.top - cr.top) * ky, bot = (q.bottom - cr.top) * ky; if (bot <= 0 || top >= H * 0.5) return;
          list.push({ x0: (q.left - cr.left) * kx, x1: (q.right - cr.left) * kx, bottom: bot });
        });
      }
    } catch (err) { list = []; }
    this._ov = { t: now, W: W, H: H, list: list }; return list;
  };
  // 敵の表示矩形：新画像（assets/）はマニフェストの倍率、従来描画は従来サイズ。足元中央を基準に配置し、混雑時は縮小して重ならないようにする
  BattleScene.prototype.enemyRect = function (i, W, H) {
    var b = this.b; var n = Math.max(1, (this.view && this.view.e.length) || b.enemies.length); var slot = W / (n + 1); var e = b.enemies[i];
    var v = enemyVisual(e); var w = v.w, h = v.h;
    var maxW = slot * 0.96, maxH = H * 0.5;
    var f = Math.min(1, maxW / w, maxH / h);
    // 敵の名前（絵の上 約22px）が、戦闘画面の上に重なる表示（メッセージ欄・パーティのHP・オートボタン）に隠れないように、必要なときだけ縮める（足元の位置はそのまま）
    var cx = slot * (i + 1), top = 0, lift0 = v.lift || 0;
    this.overlays(W, H).forEach(function (o) { if (o.x1 > cx - slot / 2 && o.x0 < cx + slot / 2) top = Math.max(top, o.bottom); });
    if (top > 0) { var avail = H * 0.56 - top - 22; if (avail > 40) f = Math.min(f, avail / (h + lift0)); }
    w = Math.round(w * f); h = Math.round(h * f);
    var lift = Math.round(lift0 * f);   // 飛ぶ敵（新しい画像のデータの lift）
    return { x: slot * (i + 1) - w / 2, y: H * 0.56 - h - lift, w: w, h: h, size: w, slot: slot, smooth: v.smooth || f !== 1, lift: lift };
  };
  // v6.5 Phase C 演出の位置：'e:番号'＝敵の絵の中心、'p:id'＝味方（画面下・欄の上）
  BattleScene.prototype.posOf = function (k, W, H) {
    var b = this.b; if (!k) return null; var m = /^e:(\d+)$/.exec(k);
    if (m) { var i = +m[1]; if (!b.enemies[i] || !this.view.e[i]) return null; var r = this.enemyRect(i, W, H); return { x: r.x + r.w / 2, y: r.y + r.h * 0.55 }; }
    var pid = k.replace(/^p:/, ''); var pi = b.party.map(function (p) { return p.id; }).indexOf(pid); if (pi < 0) return null; return { x: (W / (b.party.length + 1)) * (pi + 1), y: H * 0.7 };   // 味方の欄（画面の下）に隠れない高さ
  };
  BattleScene.prototype.draw = function (ctx) {
    // 必殺技のチャートが戦闘画面を覆っている間は、下の戦闘画面（3D 版の舞台も）を1秒に1回だけ描く（チャートの動きを軽くする）
    var CBU = root.ChartBattleUI; if (CBU && CBU.isOpen) { var tn = Date.now(); if (this._cbDrawn && tn - this._cbDrawn < 1000) return; this._cbDrawn = tn; } else this._cbDrawn = 0;
    var W = ctx.canvas.width, H = ctx.canvas.height; var b = this.b; var self = this;
    if (!this.bg && this.bg65) { try { this.bg = root.BattleBG65.render(this.bg65, W, H); } catch (e) { this.bg = null; this.bg65 = null; } if (!this.bg) this.bg65 = null; }
    if (!this.bg) this.bg = BattleBG.render(this.theme, W, H, root.State.data ? root.State.data.timeOfDay : undefined);
    ctx.save();
    if (this.screenShake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 10), Math.round((Math.random() - 0.5) * 6));
    // v6.5 Phase D 3D版：3Dの戦闘の舞台（BattleStage3D。3D版のページだけにある）が描けたら、それを背景にする。描けなければ2Dの背景
    var stage = null; if (this.bg65 && root.BattleStage3D && !this.no3d) { try { stage = root.BattleStage3D.frame(this, W, H); } catch (e) { stage = null; this.no3d = true; if (root.console) console.warn('3D battle stage', e); } }
    if (stage) ctx.drawImage(stage, 0, 0, W, H); else ctx.drawImage(this.bg, 0, 0);
    if (this.bg65 && !stage) { try { root.BattleBG65.drawAmbient(ctx, this, W, H); } catch (e) { this.bg65 = null; } }   // v6.5 動く粒・天気・ボスの光（品質「軽量」では描かない）
    // ボス登場：暗転からせり上がる
    var ent = this.entrance; var entP = ent ? Math.min(1, ent.t / ent.dur) : 1;
    if (ent) { ctx.fillStyle = 'rgba(0,0,0,' + (0.7 * (1 - entP)) + ')'; ctx.fillRect(0, 0, W, H); }
    // 敵
    b.enemies.forEach(function (e, i) {
      var dying = self.anims.filter(function (a) { return a.type === 'die' && a.idx === i; })[0];
      var ve = self.view.e[i]; if (!ve) return;   // v6.5 まだ現れていない（呼ばれる前の）敵
      if (self.gone[i] && !dying) return;          // 消える演出を再生し終えた敵だけ消す（計算上倒れていても、演出の前は表示を続ける）
      var r = self.enemyRect(i, W, H); var x = r.x, y = r.y, size = r.w, hh = r.h;
      var sh = self.shake[i]; if (sh && sh > 0) { x += Math.sin(sh / 20) * 6; self.shake[i] = sh - 16; }
      var lunge = self.anims.filter(function (a) { return a.type === 'lunge' && a.idx === i; })[0];
      if (lunge) { var lp = lunge.t / lunge.dur; y += Math.sin(lp * Math.PI) * 34; }
      var appear = self.anims.filter(function (a) { return a.type === 'appear' && a.idx === i; })[0];
      var bob = Math.sin(self.t / 500 + i) * 2; var breathe = 1 + Math.sin(self.t / 600 + i) * 0.015;
      if (ent) { var ease = 1 - Math.pow(1 - entP, 3); y += (1 - ease) * 120; breathe = 1 + (1 - ease) * 0.6; }
      var img = enemyImage(e);
      ctx.save();
      var alpha = 1;
      if (dying) { var dp = dying.t / dying.dur; alpha = 1 - dp; if (e.fled) { x += dp * 80; } else { y += dp * 20; } }
      if (appear) alpha *= appear.t / appear.dur;
      if (ve.st.indexOf('sleep') >= 0) alpha *= 0.75;
      if (ent) alpha *= Math.min(1, entP * 2);
      ctx.globalAlpha = alpha;
      var cx = x + size / 2, cy = y + hh + bob;
      ctx.translate(cx, cy); ctx.scale(breathe, dying && !e.fled ? Math.max(0.05, 1 - dying.t / dying.dur) * breathe : breathe); ctx.translate(-cx, -cy);
      // 影
      var lf = r.lift || 0; ctx.fillStyle = lf ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, y + hh + 2 + lf, size * (lf ? 0.28 : 0.38), lf ? 4 : 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.imageSmoothingEnabled = !!r.smooth; if (r.smooth) ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, Math.round(x), Math.round(y + bob), size, hh);
      var hf = self.anims.filter(function (a) { return a.type === 'hitflash' && a.idx === i; })[0];
      if (hf) { ctx.globalAlpha = alpha * (1 - hf.t / hf.dur) * 0.9; ctx.drawImage(enemySilhouette(e), Math.round(x), Math.round(y + bob), size, hh); }
      ctx.imageSmoothingEnabled = false;
      ctx.restore();
      if (dying) return;
      // HPバー・名前
      var bv = self.bar[i] !== undefined ? self.bar[i] : ve.hp; var ratio = Math.max(0, Math.min(1, bv / ve.maxHp));
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y + hh + 6, size, 6); ctx.fillStyle = ve.hp / ve.maxHp > 0.3 ? '#4cc38a' : '#e5484d'; ctx.fillRect(x, y + hh + 6, size * ratio, 6);
      var st = ve.st.map(function (k) { return Combat.STATUS_NAME[k]; }).join('');
      ctx.fillStyle = '#fff'; ctx.font = (e.boss ? 'bold 13px' : '12px') + ' sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      var label = e.name + (ve.ex ? '（弱点露出）' : '') + (st ? '［' + st + '］' : ''); ctx.strokeText(label, x + size / 2, y - 6); ctx.fillText(label, x + size / 2, y - 6);
      self.anims.filter(function (a) { return a.side === 'enemy' && a.idx === i && a.type === 'fx'; }).forEach(function (a) { drawFx(ctx, a, x + size / 2, y + hh / 2); });
      var ph = self.anims.filter(function (a) { return a.type === 'phase' && a.idx === i; })[0];
      if (ph) { var pp = ph.t / ph.dur; ctx.strokeStyle = 'rgba(255,80,80,' + (1 - pp) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + size / 2, y + hh / 2, Math.max(size, hh) * 0.5 + pp * 60, 0, Math.PI * 2); ctx.stroke(); }
    });
    // v6.3 特殊戦闘のカットイン
    if (this.cutin) drawCutin(ctx, this.cutin, W, H);
    // ボス登場バナー（カットインのある戦闘ではカットインの見出しが代わり）
    if (ent && entP > 0.3 && !this.hadCutin) { var bp = Math.min(1, (entP - 0.3) / 0.3); ctx.save(); ctx.globalAlpha = bp * (entP > 0.85 ? (1 - entP) / 0.15 : 1); ctx.fillStyle = 'rgba(120,0,20,0.75)'; ctx.fillRect(0, H * 0.42, W, 44); ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('— ' + (b.enemies[0] ? b.enemies[0].name : 'BOSS') + ' —', W / 2, H * 0.42 + 31); ctx.restore(); }
    // 味方側のエフェクト（画面下部）
    this.anims.filter(function (a) { return a.side === 'party' && a.type === 'fx'; }).forEach(function (a) { var i = Math.max(0, b.party.map(function (p) { return p.id; }).indexOf(a.id)); drawFx(ctx, a, (W / (b.party.length + 1)) * (i + 1), H * 0.8); });
    if (root.FX2D) root.FX2D.draw(ctx, this);   // v6.5 Phase C 呪文・特技の演出（失敗しても戦闘は進む）
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, this.flash / 200) + ')'; ctx.fillRect(0, 0, W, H); }
    // 勝利演出
    if (this.victory >= 0) { var vp = Math.min(1, this.victory / 600); ctx.save(); ctx.globalAlpha = 0.5 * vp; ctx.fillStyle = '#ffd24a'; for (var ray = 0; ray < 12; ray++) { var ang = ray * Math.PI / 6 + this.t / 3000; ctx.beginPath(); ctx.moveTo(W / 2, H * 0.3); ctx.lineTo(W / 2 + Math.cos(ang) * 900, H * 0.3 + Math.sin(ang) * 900); ctx.lineTo(W / 2 + Math.cos(ang + 0.08) * 900, H * 0.3 + Math.sin(ang + 0.08) * 900); ctx.closePath(); ctx.fill(); } ctx.restore(); this.particles.forEach(function (p) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 6); }); }
    // ダメージ数値
    this.pops.forEach(function (p) { var i = p.idx; var ne = Math.max(1, self.view.e.length); var x = p.side === 'enemy' ? self.enemyRect(Math.min(i, ne - 1), W, H).x + self.enemyRect(Math.min(i, ne - 1), W, H).size / 2 : (W / (b.party.length + 1)) * (i + 1); var y = p.side === 'enemy' ? H * 0.3 : H * 0.75; y -= p.t / 12; ctx.font = 'bold ' + (p.crit ? 26 : 20) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(p.text, x, y); ctx.fillStyle = p.color; ctx.fillText(p.text, x, y); });
    ctx.restore();
  };
  var imgCache = {};
  function drawCutin(ctx, ci, W, H) {
    var p = ci.t / ci.dur; var a = p < 0.13 ? p / 0.13 : p > 0.79 ? (1 - p) / 0.21 : 1; a = Math.max(0, Math.min(1, a));
    var ease = 1 - Math.pow(1 - Math.min(1, p / 0.3), 3);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
    // 素材は一覧画像からの拡大なので、元の 0.62 倍までにとどめる（大きくするとぼやける）
    var v = ci.v; var f = Math.min(W * 0.94 / v.img.width, (H * 0.62) / v.img.height, 0.62) * (1.05 - 0.05 * ease);
    var dw = Math.round(v.img.width * f), dh = Math.round(v.img.height * f);
    var bh = Math.round(v.img.height * Math.min(W * 0.94 / v.img.width, (H * 0.62) / v.img.height, 0.62)) + 16, by = Math.round(H * 0.42 - bh / 2);
    var g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, 'rgba(90,10,30,0.0)'); g.addColorStop(0.5, 'rgba(90,10,30,0.6)'); g.addColorStop(1, 'rgba(90,10,30,0.0)'); ctx.fillStyle = g; ctx.fillRect(0, by, W, bh);
    ctx.fillStyle = 'rgba(255,210,74,0.8)'; ctx.fillRect(0, by + bh, W, 2);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(v.img, Math.round((W - dw) / 2 + (1 - ease) * 40), Math.round(by + bh - dh - 2), dw, dh);
    ctx.imageSmoothingEnabled = false;
    ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#ffd24a';
    var label = '— ' + ci.name + ' —'; ctx.strokeText(label, W / 2, by + bh + 32); ctx.fillText(label, W / 2, by + bh + 32);
    ctx.restore();
  }
  // 描画優先順位：1) assets/ の新画像（マニフェストで use=true かつ読み込み済み） 2) MonsterArt（art） 3) 従来の Sprites
  function enemyVisual(e) {
    if (e._vis) return e._vis;
    // v6.3 ボス画像パック（core/bossart.js）：採用した新画像 → 読めないときは元の画像（prev）→ 以下の従来の順
    var BA = root.BossArt;
    if (BA && BA.isBossId(e.defId)) {
      var bv = BA.wants(e.defId) ? BA.visual(e.defId) : null; if (bv) { e._vis = bv; return bv; }
      var pv = BA.prevImage(e.defId); if (pv) { e._vis = pv; return pv; }
    }
    var EA = root.EnemyArt; var waitNew = false;
    if (EA && EA.adopted(e.defId)) { var nv = EA.visual(e.defId); if (nv) { if (e._visTmp) delete e._sil; e._vis = nv; delete e._visTmp; return nv; } waitNew = !EA.failed[e.defId]; if (waitNew && e._visTmp) return e._visTmp; }   // 既存の通常敵164体の新しい画像（js/core/enemyart.js）
    var old = oldVisual(e); if (waitNew) { e._visTmp = old; delete e._vis; if (EA && !EA.isLoading(e.defId)) EA.load(e.defId); } return old;
  }
  function oldVisual(e) {
    if (e._vis) return e._vis;
    var A = root.Assets; var img = A ? A.image('monsters', e.defId) : null;
    if (img) { var ent = A.entry('monsters', e.defId); var sc = (ent && ent.scale) || 1; e._vis = { img: img, w: Math.round(img.naturalWidth * sc), h: Math.round(img.naturalHeight * sc), smooth: sc !== 1, source: 'assets' }; return e._vis; }
    var c;
    if (e.art && root.MonsterArt) { c = root.MonsterArt.image(e.art, 3, 0); e._vis = { img: c, w: c.width, h: c.height, smooth: false, source: 'monsterart' }; return e._vis; }
    var scale = e.boss ? 9 : 6; var k = e.sprite + ':' + scale; if (!imgCache[k]) { c = document.createElement('canvas'); Sprites.draw(c, e.sprite, scale, false); imgCache[k] = c; }
    e._vis = { img: imgCache[k], w: imgCache[k].width, h: imgCache[k].height, smooth: false, source: 'sprites' }; return e._vis;
  }
  function enemyImage(e) { return enemyVisual(e).img; }
  BattleUI.enemyVisual = enemyVisual;   // v6.5 ボスのシンボル（js/rpg/bosssymbol.js）も同じ画像を使う
  function enemySilhouette(e) {
    if (e._sil) return e._sil; var v = enemyVisual(e);
    var c = document.createElement('canvas'); c.width = v.w; c.height = v.h; var x = c.getContext('2d'); x.imageSmoothingEnabled = !!v.smooth; x.drawImage(v.img, 0, 0, v.w, v.h); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); e._sil = c; return c;
  }
  BattleUI.enemyVisual = enemyVisual;
  function drawFx(ctx, a, cx, cy) {
    var p = a.t / a.dur; ctx.save(); ctx.globalAlpha = 1 - p;
    var kind = a.anim;
    if (kind === 'slash') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 40 + p * 20, cy - 40); ctx.lineTo(cx + 40 - p * 20, cy + 40); ctx.stroke(); ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(cx + 30, cy - 30); ctx.lineTo(cx - 30, cy + 30); ctx.stroke(); }
    else if (kind === 'hit') { ctx.fillStyle = '#fff'; for (var i = 0; i < 6; i++) { var ang = i * Math.PI / 3; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * p * 40, cy + Math.sin(ang) * p * 40, 5, 0, Math.PI * 2); ctx.fill(); } }
    else if (kind === 'fire') { ctx.fillStyle = '#ff6a2a'; for (var j = 0; j < 8; j++) { ctx.beginPath(); ctx.arc(cx + Math.sin(j * 1.3 + p * 6) * 25, cy - p * 60 + Math.cos(j) * 20, 10 - p * 8, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, cy - p * 30, 14 - p * 10, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'ice') { ctx.strokeStyle = '#9fe0ff'; ctx.lineWidth = 3; for (var k2 = 0; k2 < 6; k2++) { var a2 = k2 * Math.PI / 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a2) * 40 * p, cy + Math.sin(a2) * 40 * p); ctx.stroke(); } }
    else if (kind === 'thunder') { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + 10, cy - 120); ctx.lineTo(cx - 10, cy - 40); ctx.lineTo(cx + 10, cy - 30); ctx.lineTo(cx - 5, cy + 20); ctx.stroke(); }
    else if (kind === 'wind') { ctx.strokeStyle = '#9fe0a8'; ctx.lineWidth = 3; for (var w = 0; w < 3; w++) { ctx.beginPath(); ctx.arc(cx, cy, 20 + w * 15 + p * 30, p * 6 + w, p * 6 + w + 2); ctx.stroke(); } }
    else if (kind === 'light') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (var l = 0; l < 8; l++) { var al = l * Math.PI / 4 + p; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(al) * 60 * p, cy + Math.sin(al) * 60 * p); ctx.stroke(); } }
    else if (kind === 'dark') { ctx.fillStyle = '#5a1a8a'; ctx.beginPath(); ctx.arc(cx, cy, 10 + p * 40, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'heal') { ctx.fillStyle = '#7fe3a5'; for (var h = 0; h < 6; h++) { ctx.beginPath(); ctx.arc(cx + Math.cos(h) * 25, cy - p * 50 + Math.sin(h * 2) * 10, 4, 0, Math.PI * 2); ctx.fill(); } }
    else if (kind === 'buff') { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 20 + p * 30, 0, Math.PI * 2); ctx.stroke(); }
    else if (kind === 'arrow') { ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 60 + p * 60, cy + 60 - p * 60); ctx.lineTo(cx - 40 + p * 60, cy + 40 - p * 60); ctx.stroke(); }
    else if (kind === 'poison') { ctx.fillStyle = '#8a5ad0'; ctx.beginPath(); ctx.arc(cx, cy - p * 30, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  /* ---------- 開始 ---------- */
  BattleUI.start = async function (enemyIds, opts) {
    opts = opts || {};
    if (root.BossArt) { try { var artWait = root.BossArt.prepare(enemyIds, opts); if (artWait) await artWait; } catch (err) { console.warn('BossArt', err); } }   // v6.3 間に合わなければ従来の画像で始める
    if (root.EnemyArt) { try { var eaWait = root.EnemyArt.prepare(enemyIds); if (eaWait) await eaWait; } catch (err) { console.warn('EnemyArt', err); } }   // 通常敵164体の新しい画像（間に合わなければ従来の絵で始め、読めたら切り替える）
    var d = State.data; var party = State.partyActors();
    var b = Combat.create(enemyIds, party, opts);
    if (opts.exposeFirst) b.enemies.forEach(function (e) { e.exposed = opts.exposeFirst; });
    var mapKind = root.World.map ? root.World.map.kind : 'field';
    var scene = new BattleScene(b, mapKind, opts); BattleUI.battle = b; BattleUI.scene = scene;
    Engine.push(scene);
    if (root.Audio) root.Audio.playBgm(opts.boss ? 'boss' : 'battle');
    var pw = document.getElementById('battle-party'); pw.classList.add('on');
    var mw = document.getElementById('battle-msg'); mw.classList.add('on'); mw.textContent = '';
    BattleUI.autoButton(true);   // v5.7 オート戦闘ボタン
    renderParty(b);
    b.enemies.forEach(function (e) { d.bestiary[e.defId] = Object.assign(d.bestiary[e.defId] || {}, { seen: true }); });
    var names = b.enemies.map(function (e) { return e.name; });
    if (opts.boss) { scene.screenShake = 600; if (root.Audio) root.Audio.sfx('crit'); await Win.sleep(1300 + (scene.cutin ? 600 : 0)); }   // v6.3 特殊戦闘のカットインがあるときだけ 0.6 秒長く
    await bmsg(uniq(names).join('、') + 'が現れた！', 700);
    var result = null;
    while (b.state === 'command') {
      var cmds = await collectCommands(b);
      if (cmds === null) continue;
      var ev = Combat.runTurn(b, cmds);
      await playEvents(b, ev, scene);
      renderParty(b);
    }
    result = b.state;
    if (result === 'won') {
      if (root.Audio) root.Audio.playJingle('victory');
      scene.victory = 0;
      await bmsg('戦いに勝利した！', 700);
      var res = Combat.distribute(b);   // 報酬の確定は1回だけ（再表示しても二重加算しない）
      renderParty(b);
      if (res.members.some(function (m) { return m.levelUp; }) && root.Audio) root.Audio.playJingle('levelup');
      await showResultPanel(res);
    } else if (result === 'lost') { await bmsg('全滅してしまった……', 900); }
    else if (result === 'escaped') { await Win.sleep(300); }
    else if (result === 'fled') { await bmsg('魔物は逃げてしまった……', 700); }
    b.party.forEach(Actors.clearBattleState);
    pw.classList.remove('on'); mw.classList.remove('on'); BattleUI.autoButton(false);
    Engine.pop();
    if (root.Audio) root.Audio.playBgm(root.World.map ? (root.World.map.def.bgm || 'field') : 'field');
    State.autosave();
    return result;
  };
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }).map(function (x) { return x.replace(/[A-H]$/, ''); }).filter(function (x, i, arr) { return arr.indexOf(x) === i; }); }


  /* ---------- リザルト画面 ---------- */
  function showResultPanel(res) {
    var killed = Object.keys(res.killed).map(function (n) { return esc(n) + ' × ' + res.killed[n]; }).join('、');
    var goldLine = res.merchantBonus ? res.gold + ' G <span class="muted small">（' + res.goldBase + ' G ＋ 商人ボーナス ' + res.merchantBonus + ' G）</span>' : res.gold + ' G';
    var members = res.members.map(function (m, i) {
      var a = m.actor; var bPct = Math.min(100, Math.round(m.before.exp / Actors.expForLevel(m.before.level) * 100)); var aPct = Math.min(100, Math.round(m.after.exp / Actors.expForLevel(m.after.level) * 100));
      var stat = '';
      if (m.levelUp) { var bs = m.before.stats, as = m.after.stats; var d = [['HP', as.maxHp - bs.maxHp], ['MP', as.maxMp - bs.maxMp], ['攻', as.atk - bs.atk], ['防', as.def - bs.def], ['速', as.agi - bs.agi], ['魔', as.mag - bs.mag]].filter(function (x) { return x[1] > 0; }).map(function (x) { return x[0] + '+' + x[1]; }).join('　'); stat = '<div class="rs-stat">' + stat + esc(d) + '</div>'; }
      var skills = m.newSkills.length ? '<div class="rs-skill">✦ ' + m.newSkills.map(function (k) { return esc(SKILLS[k].name); }).join('・') + ' を覚えた！</div>' : '';
      if (m.newUlts && m.newUlts.length && U) skills += '<div class="rs-skill rs-ult">✦ 必殺技「' + m.newUlts.map(function (k) { return esc(U.get(k).name); }).join('」「') + '」を覚えた！（戦闘の「必殺技」から）</div>';
      return '<div class="rs-member ' + (m.levelUp ? 'up' : '') + (m.dead ? ' dead' : '') + '" data-i="' + i + '">' +
        '<div class="rs-head"><span class="rs-name">' + esc(a.name) + '</span><span class="rs-lv">Lv.' + m.before.level + (m.levelUp ? ' → <b>Lv.' + m.after.level + '</b>' : '') + '</span>' + (m.levelUp ? '<span class="rs-levelup">LEVEL UP!</span>' : '') + '</div>' +
        '<div class="rs-exp">' + (m.dead ? '戦闘不能（経験値なし）' : '+' + m.gained + ' EXP') + '<span class="muted small">　次のレベルまで ' + m.toNext + ' EXP</span></div>' +
        '<div class="rs-bar"><span style="width:' + bPct + '%" data-before="' + bPct + '" data-after="' + aPct + '" data-up="' + (m.levelUp ? 1 : 0) + '"></span></div>' + stat + skills + '</div>';
    }).join('');
    var drops = Object.keys(res.drops); var dropHtml = drops.length ? drops.map(function (id) { return '<div class="rs-item">' + esc(ITEMS[id] ? ITEMS[id].name : id) + ' × ' + res.drops[id] + '</div>'; }).join('') : '<div class="muted">なし</div>';
    var html = '<div class="rs-title">VICTORY！</div><div class="rs-killed">' + killed + ' を倒した！</div>' +
      '<div class="rs-rewards"><div>獲得経験値 <b>' + res.exp + ' EXP</b></div><div>獲得ゴールド <b>' + goldLine + '</b></div></div>' +
      '<h3>仲間の成長</h3><div class="rs-members">' + members + '</div><h3>入手アイテム</h3><div class="rs-items">' + dropHtml + '</div>';
    return Win.panel(html, { cls: 'result-victory', closeLabel: '次へ', setup: function (node) {
      // 経験値バーの演出（計算はしない。確定済みの値へ動かすだけ）
      var bars = node.querySelectorAll('.rs-bar span');
      setTimeout(function () { bars.forEach(function (bar) { var up = bar.getAttribute('data-up') === '1'; var after = bar.getAttribute('data-after'); if (up) { bar.style.width = '100%'; setTimeout(function () { bar.classList.add('reset'); bar.style.width = '0%'; setTimeout(function () { bar.classList.remove('reset'); bar.style.width = after + '%'; }, 60); }, 650); } else bar.style.width = after + '%'; }); }, 120);
    } });
  }

  // v6.5 味方の欄：view（いま再生しているイベントの時点の状態）があればそれで表示。欄は作り直さずに中身だけ更新する（揺れ・行動中の印が消えないように）
  function renderParty(b, view) {
    var pw = document.getElementById('battle-party'); if (!pw) return;
    if (!view && BattleUI.scene && BattleUI.scene.b === b) view = BattleUI.scene.view;
    var pv = {}; if (view) view.p.forEach(function (x) { pv[x.id] = x; });
    var cards = pw.querySelectorAll('.bp');
    var same = cards.length === b.party.length && b.party.every(function (a, i) { return cards[i].getAttribute('data-id') === a.id; });
    if (!same) {
      pw.innerHTML = b.party.map(function (a) { var pu = root.Assets ? root.Assets.portraitUrlFor(a) : null; return '<div class="bp" data-id="' + a.id + '">' + (pu ? '<img class="bp-portrait" src="' + pu + '" alt="" draggable="false">' : '') + '<div class="bp-body"><div class="bp-name"></div><div class="bp-hp"></div><div class="bar hp"><span></span></div><div class="bp-mp"></div></div></div>'; }).join('');
      cards = pw.querySelectorAll('.bp');
    }
    b.party.forEach(function (a, i) {
      var v = pv[a.id] || { hp: a.hp, mp: a.mp, dead: !!a.dead, st: Object.keys(a.status || {}), def: !!a.defending }; var s = Actors.stats(a); var el = cards[i];
      el.classList.toggle('dead', !!v.dead); el.classList.toggle('low', !v.dead && v.hp < s.maxHp * 0.3);
      var st = v.st.map(function (k) { return Combat.STATUS_NAME[k]; }).join('');
      el.querySelector('.bp-name').innerHTML = esc(a.name) + (st ? '<span class="st">' + esc(st) + '</span>' : '') + (v.def ? '<span class="st">防</span>' : '');
      el.querySelector('.bp-hp').innerHTML = 'HP <b>' + v.hp + '</b>/' + s.maxHp;
      el.querySelector('.bar.hp span').style.width = Math.max(0, Math.min(100, v.hp / s.maxHp * 100)) + '%';
      el.querySelector('.bp-mp').textContent = 'MP ' + v.mp + '/' + s.maxMp;
    });
  }
  function actingCard(id) { document.querySelectorAll('#battle-party .bp').forEach(function (el) { el.classList.toggle('acting', !!id && el.getAttribute('data-id') === id); }); }
  function bmsg(text, ms) { var mw = document.getElementById('battle-msg'); mw.textContent = text; var speed = State.data.settings.battleSpeed; return Win.sleep(speed === 'fast' ? Math.round((ms || 500) * 0.45) : (ms || 500)); }

  /* ---------- v5.7 オート戦闘 ----------
     ・画面右上の「オート」ボタン、またはコマンドの「オート戦闘」で開始。もう一度押すか X / Esc で解除
     ・オンにすると次の戦闘でも続く（設定 settings.autoBattle に保存）
     ・相場の試練（チャートの問題）はオートでも自分で答える */
  BattleUI.isAuto = function () { return !!(State.data && State.data.settings && State.data.settings.autoBattle); };
  BattleUI.setAuto = function (on) {
    if (!State.data) return; State.data.settings.autoBattle = !!on; BattleUI.autoButton(true);
    if (on) { var top = Engine.top(); if (top && top.overlay && BattleUI.battle && BattleUI.battle.state === 'command') Engine.Input.press('cancel'); }   // 開いている行動メニューを閉じて自動に
    if (Win.toast) Win.toast(on ? 'オート戦闘：オン' : 'オート戦闘：オフ（次のターンから手動）');
  };
  BattleUI.autoButton = function (show) {
    var el = document.getElementById('auto-battle');
    if (!el) { el = document.createElement('button'); el.id = 'auto-battle'; el.type = 'button'; var st = document.getElementById('stage'); if (!st) return; st.appendChild(el); el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); BattleUI.setAuto(!BattleUI.isAuto()); }); }
    el.classList.toggle('on', show); el.classList.toggle('active', BattleUI.isAuto());
    el.innerHTML = '<b>オート</b>' + (BattleUI.isAuto() ? 'ON' : 'OFF');
    var g = document.getElementById('game'), mw = document.getElementById('battle-msg'); if (g && show) { var top = g.offsetTop + g.clientTop + 8; if (mw && mw.offsetHeight) top = Math.max(top, mw.offsetTop + mw.offsetHeight + 6); el.style.top = top + 'px'; el.style.left = (g.offsetLeft + g.clientLeft + g.clientWidth - el.offsetWidth - 10) + 'px'; }   // 上のメッセージ欄の下・右端
  };
  // 戦闘の演出中に X / Esc を押すとオートを解除
  BattleScene.prototype.handleInput = function () { if (BattleUI.isAuto() && Engine.Input.consume('cancel')) BattleUI.setAuto(false); };

  /* ---------- コマンド入力 ---------- */
  async function collectCommands(b) {
    var cmds = []; var alive = b.party.filter(function (a) { return !a.dead; });
    for (var i = 0; i < alive.length; i++) {
      var a = alive[i];
      if (a.status.sleep || (a.status.paralyze && Math.random() < 0.3)) { cmds.push({ actorId: a.id, type: 'defend' }); continue; }
      highlight(a.id);
      var c = BattleUI.isAuto() ? 'auto' : await commandFor(b, a);
      if (c === 'back' && BattleUI.isAuto()) c = 'auto';   // 入力中にオートへ切り替えた
      if (c === 'auto') { if (!BattleUI.isAuto()) BattleUI.setAuto(true); await Win.sleep(State.data.settings.battleSpeed === 'fast' ? 60 : 140); cmds.push(Combat.autoCommand(b, a)); continue; }
      if (c === 'back') {
        // 必殺技のチャートで決めた行動は取り消せない（同じターンにチャートを引き直せないように）。その人より前には戻らない
        var prev = cmds[cmds.length - 1]; if (prev && prev.type === 'ultimate') { if (Win.toast) Win.toast('必殺技の判断は取り消せない'); i -= 1; continue; }
        if (i > 0) { i -= 2; cmds.pop(); continue; } else { i = -1; cmds = []; continue; }
      }
      cmds.push(c);
    }
    highlight(null);
    return cmds;
  }
  function highlight(id) { document.querySelectorAll('#battle-party .bp').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-id') === id); }); }

  async function commandFor(b, a) {
    while (true) {
      if (BattleUI.isAuto()) return 'auto';
      var skills = Actors.allSkills(a).filter(function (s) { return SKILLS[s]; });
      var opts = [{ label: 'たたかう' }, { label: 'じゅもん・とくぎ', disabled: !skills.length }, { label: 'どうぐ' }, { label: 'ぼうぎょ' }, { label: 'にげる', disabled: !b.canEscape }, { label: 'オート戦闘', right: '自動' }];
      // 必殺技（主人公だけ）：「じゅもん・とくぎ」の次に出す。番号で振り分けている既存の項目は、選んだ番号を元の番号に戻してから処理する
      var ultN = (U && U.isHero(a)) ? U.count(State.data) : -1;
      if (ultN >= 0) opts.splice(2, 0, { label: '必殺技', right: ultN ? 'チャート' : '', disabled: !ultN, sub: ultN ? null : 'レベル2で最初の必殺技を覚える', cls: 'ult-cmd' });
      var sel = await Win.list(opts, { title: a.name + 'の行動', cancel: true, cls: 'cmd-list' });
      if (BattleUI.isAuto()) return 'auto';
      if (ultN >= 0 && sel === 2) { var uc = await ultCommand(b, a); if (uc) return uc; continue; }
      if (ultN >= 0 && sel > 2) sel -= 1;
      if (sel === 5) return 'auto';
      if (sel < 0) return 'back';
      if (sel === 0) { var t = await pickEnemy(b); if (t < 0) continue; return { actorId: a.id, type: 'attack', target: { side: 'enemy', idx: t } }; }
      if (sel === 1) {
        var items = skills.map(function (s) { var sk = SKILLS[s]; var cost = a.job === 'sage' ? Math.ceil(sk.mp * 0.8) : sk.mp; return { label: sk.name, right: 'MP' + cost + (sk.gold ? '/' + sk.gold + 'G' : ''), sub: sk.field ? '戦闘中は使えない（フィールドのメニューで唱える）' : sk.desc, disabled: a.mp < cost || !!sk.field }; });   // v6.5 帰還の術など、フィールド専用の呪文は選べない
        var si = await Win.list(items, { title: 'じゅもん・とくぎ' }); if (si < 0) continue;
        var sk = SKILLS[skills[si]]; var target = null;
        if (sk.target === 'enemy') { var te = await pickEnemy(b); if (te < 0) continue; target = { side: 'enemy', idx: te }; }
        else if (sk.target === 'ally') { var ta = await pickAlly(b, false); if (!ta) continue; target = { side: 'party', id: ta }; }
        else if (sk.target === 'dead_ally') { var td = await pickAlly(b, true); if (!td) continue; target = { side: 'party', id: td }; }
        return { actorId: a.id, type: 'skill', skillId: sk.id, target: target };
      }
      if (sel === 2) {
        var inv = State.data.inventory; var ids = Object.keys(inv).filter(function (id) { return ITEMS[id] && ITEMS[id].cat === 'consumable' && !ITEMS[id].fieldOnly; });
        if (!ids.length) { await Win.message(['使える道具がない。']); continue; }
        var ii = await Win.list(ids.map(function (id) { return { label: ITEMS[id].name, right: '×' + inv[id], sub: ITEMS[id].desc }; }), { title: 'どうぐ' }); if (ii < 0) continue;
        var it = ITEMS[ids[ii]]; var tg = null;
        if (!it.effect.damage && !it.effect.escape) { var tid = await pickAlly(b, !!it.effect.revive); if (!tid) continue; tg = { side: 'party', id: tid }; }   // v6.4 撤退の煙玉は対象なし
        return { actorId: a.id, type: 'item', itemId: it.id, target: tg };
      }
      if (sel === 3) return { actorId: a.id, type: 'defend' };
      if (sel === 4) return { actorId: a.id, type: 'escape' };
    }
  }
  /* ---------- 必殺技（js/rpg/ultimates.js・js/ui/chartbattle.js） ----------
     技を選ぶ → 対象を選ぶ（敵全体の技は選ばない）→ 初めて使う技は説明 → チャートを開いて判断・決済 → 結果をコマンドに入れて返す
     ・チャートを開いたら取り消せない（見送り＝防御になる）。MP は実行のとき（Combat.runTurn）に1回だけ使う。待ち時間（クールダウン）はここで決まる
     ・オート戦闘では使わない（判断はプレイヤー自身がする） */
  async function ultCommand(b, a) {
    var d = State.data; U.sync(d);
    while (true) {
      var ids = U.learnedList(d); if (!ids.length) return null;
      var items = ids.map(function (id) { var x = U.get(id); var ok = U.usable(b, a, id); var sch = U.school(x.school); return { label: x.name, right: 'MP' + x.mp + (ok.cd ? '／あと' + ok.cd + 'T' : '／待' + x.cd + 'T'), sub: (sch ? sch.name + '｜' : '') + x.desc + (ok.ok ? '' : '（' + ok.why + '）'), disabled: !ok.ok, cls: (d.ultimate.notice.indexOf(id) >= 0 ? 'ult-new' : '') }; });
      var si = await Win.list(items, { title: '必殺技（チャートで判断する）', cls: 'ult-list', info: function (i) { var x = U.get(ids[i]); if (!x) return ''; return '<div class="ult-info"><b>' + esc(x.name) + '</b>　判断の難しさ ' + '★★★★★'.slice(0, x.difficulty) + '<br>学習テーマ：' + esc(x.theme) + '<br>表示：' + x.ind.map(function (k) { return esc((root.ChartBattleUI && root.ChartBattleUI.IND_NAME[k]) || k); }).join('・') + '　時間足：' + esc(root.ChartBattleUI ? root.ChartBattleUI.tfName(x.tf) : x.tf + '分') + '<br>利益：通常攻撃の' + x.profit[0] + '〜' + x.profit[1] + '倍　損失：' + x.loss[0] + '〜' + x.loss[1] + '倍　ほぼ同値：' + x.flat + '倍　見送り：防御</div>'; } });
      if (si < 0) return null;
      var def = U.get(ids[si]); var chk = U.usable(b, a, def.id); if (!chk.ok) { await Win.message([chk.why]); continue; }
      var target = null;
      if (!def.fx.aoe) { var te = await pickEnemy(b); if (te < 0) continue; target = { side: 'enemy', idx: te }; }
      if (U.markSeen(d, def.id)) await Win.message(['必殺技「' + def.name + '」', def.intro, 'チャートが動き出したら、ロング（買い）・ショート（売り）・見送りのどれかを選ぶ。' + Math.round(root.ChartBattleUI.settings().decideMs / 1000) + '秒たつと見送りになる。', '※ 架空のシミュレーション相場。利益が出れば大ダメージ、損失なら小ダメージ、見送りは防御になる。'], { name: '必殺技の説明' });
      U.clearNotice(d, def.id);
      var scn = U.scenarioForUlt(d, def); var sch2 = U.school(def.school);
      var res = await root.ChartBattleUI.open({ mode: 'battle', ult: def, title: def.name, sub: (sch2 ? sch2.name : '') + '｜' + def.theme, ind: def.ind, tf: def.tf, scenario: scn, color: def.color,
        preview: function (out) { var rv = U.resolve(def, out); if (rv.kind === 'skip') return '<div class="cb-pre">→ 戦闘では「見送り＝防御」' + (rv.appropriateSkip ? '（見送りが適切：MPが一部戻る）' : '') + '</div>'; return '<div class="cb-pre">→ 威力 <b>×' + rv.mult.toFixed(2) + '</b>' + (rv.bonuses.length ? '（基本 ×' + rv.base.toFixed(2) + '・追加：' + rv.bonuses.map(function (q) { return esc(q.label) + ' ×' + q.mult; }).join('、') + '）' : '') + (rv.extra ? '・追撃' + rv.extra.hits + '回' : '') + '</div>'; } });
      if (!res || res.quit) return null;   // 戦闘のチャートは中断できない（念のため）
      U.lock(b, def.id);
      U.recordTrade(d, { mode: 'battle', ultId: def.id, school: def.school, scenarioId: res.scenarioId, cat: res.cat, seed: res.seed, side: res.side, auto: res.auto, result: res.result });
      var trade = { side: res.side, auto: res.auto, result: res.result, assessment: res.assessment, scenarioId: res.scenarioId, seed: res.seed };
      return { actorId: a.id, type: 'ultimate', ultId: def.id, target: target, trade: trade, locked: true };
    }
  }
  BattleUI.ultCommand = ultCommand;
  async function pickEnemy(b) {
    var alive = b.enemies.filter(function (e) { return !e.dead; });
    if (alive.length === 1) return alive[0].idx;
    var i = await Win.list(alive.map(function (e) { return { label: e.name, right: 'HP ' + e.hp + '/' + e.maxHp }; }), { title: '対象' });
    return i < 0 ? -1 : alive[i].idx;
  }
  async function pickAlly(b, dead) {
    var list = b.party.filter(function (a) { return dead ? a.dead : !a.dead; });
    if (!list.length) { await Win.message([dead ? '倒れている仲間はいない。' : '対象がいない。']); return null; }
    var i = await Win.list(list.map(function (a) { var s = Actors.stats(a); return { label: a.name, right: 'HP ' + a.hp + '/' + s.maxHp }; }), { title: '対象' });
    return i < 0 ? null : list[i].id;
  }

  /* ---------- イベント再生（v6.5：命中・数字・HPバー・消滅を同じ瞬間に） ----------
     Combat.runTurn は結果を先に計算し、イベントごとにその時点の状態（snap）を添える。ここでは
     1) act（行動の始まり）で行動する人の動き → 2) damage で命中の演出・ダメージの数字・HPバーの減少を同時に（全体攻撃は同じ g をまとめて同時に）
     → 3) HP0 なら enemy_dead／actor_dead で倒れる演出を最後まで再生 → 4) 次の行動、の順に進める。表示する値は snap だけを使い、計算し直さない */
  function setView(scene, e, b) { if (e && e.snap) { scene.view = e.snap; renderParty(b, scene.view); } }
  function showHit(scene, b, e, shakeIds) {
    if (e.type === 'damage' && e.side === 'enemy') {
      scene.shake[e.idx] = 240; if (!scene.fxOn) scene.anims.push({ type: 'fx', side: 'enemy', idx: e.idx, anim: e.anim || 'hit', t: 0, dur: 420 }); if (e.value > 0) scene.anims.push({ type: 'hitflash', idx: e.idx, t: 0, dur: 160 });
      scene.pops.push({ side: 'enemy', idx: e.idx, text: e.value === 0 ? 'MISS' : String(e.value), color: e.crit ? '#ffd24a' : e.weak ? '#ff8a3a' : '#fff', crit: e.crit, t: 0 });
      if (root.Audio) root.Audio.sfx(e.crit ? 'crit' : 'hit');
    } else if (e.type === 'damage') {
      var idx = b.party.map(function (p) { return p.id; }).indexOf(e.id); scene.pops.push({ side: 'party', idx: idx, text: String(e.value), color: '#ffb0b0', t: 0 }); scene.flash = 120;
      if (!scene.fxOn) scene.anims.push({ type: 'fx', side: 'party', id: e.id, anim: e.anim || 'hit', t: 0, dur: 400 }); if (root.Audio) root.Audio.sfx('hurt'); shakeIds.push(e.id);
    } else if (e.type === 'heal' && e.side === 'enemy') {
      scene.pops.push({ side: 'enemy', idx: e.idx, text: '+' + e.value, color: '#7fe3a5', t: 0 }); if (!scene.fxOn) scene.anims.push({ type: 'fx', side: 'enemy', idx: e.idx, anim: 'heal', t: 0, dur: 500 }); if (root.Audio) root.Audio.sfx('heal');
    } else if (e.type === 'heal') {
      var hi = b.party.map(function (p) { return p.id; }).indexOf(e.id); scene.pops.push({ side: 'party', idx: hi, text: '+' + e.value, color: '#7fe3a5', t: 0 }); if (!scene.fxOn) scene.anims.push({ type: 'fx', side: 'party', id: e.id, anim: 'heal', t: 0, dur: 500 }); if (root.Audio) root.Audio.sfx('heal');
    }
  }
  // v6.5 Phase C：行動ごとの演出を始める。演出のデータ（js/data/fx65.js）と時刻表で、2D の描画（js/ui/fx2d.js）と 3D の描画（Phase D）が同じ時刻に合わせる
  function itemFx(id) { var it = root.ITEMS && root.ITEMS[id]; var ef = (it && it.effect) || {}; return ef.damage ? { fx: 'explosion', motion: 'throw', color: '#ff8a2a', color2: '#ffd24a', area: 'all' } : ef.revive ? { fx: 'revive_pillar', motion: 'throw', color: '#fff6c8', color2: '#ffd24a', area: 'single' } : (ef.hp || ef.mp || ef.all) ? { fx: 'heal_glow', motion: 'throw', color: '#7fe3a5', color2: '#ffe9a0', area: 'single' } : ef.cure ? { fx: 'purify', motion: 'throw', color: '#c8f4ff', color2: '#ffffff', area: 'single' } : { fx: 'aura', motion: 'throw', color: '#ffd24a', color2: '#ffffff', area: 'single' }; }
  function startFx(b, ev, i, e, scene, fast) {
    var F = root.FX65; if (!F) return null;
    try {
      var def = null, from = null;
      if (e.side === 'party') { var a = b.party.filter(function (p) { return p.id === e.id; })[0]; from = 'p:' + e.id;
        if ((e.kind === 'skill' || e.kind === 'ultimate') && e.skillId) def = F.DEFS[e.skillId]; else if (e.kind === 'attack') def = F.attack(a); else if (e.kind === 'item' && e.itemId) def = itemFx(e.itemId); }
      else { def = F.enemy(b.enemies[e.idx], { skillId: e.skillId, special: e.special }); from = 'e:' + e.idx; }
      if (!def) return null;
      var tg = [], firstKey = null, hits = 0;
      for (var j = i + 1; j < ev.length && ev[j].type !== 'act'; j++) { var x = ev[j]; var key = null;
        if (x.type === 'damage' || x.type === 'heal') key = x.side === 'enemy' ? 'e:' + x.idx : 'p:' + x.id; else if (x.type === 'revive' && x.id) key = 'p:' + x.id; else if (x.type === 'anim' && x.side !== 'enemy' && x.id && x.anim !== 'lunge') key = 'p:' + x.id;
        if (!key) continue; if (!firstKey) firstKey = key; if (key === firstKey && x.type === 'damage') hits++; if (tg.indexOf(key) < 0) tg.push(key); }
      if (!tg.length) tg = [from];
      var tl = F.timeline(def, { fast: fast, hits: Math.max(1, hits || def.hits || 1) });
      if (root.FX2D) root.FX2D.start(scene, def, tl, from, tg);
      F.emit('play', { def: def, tl: tl, from: from, to: tg, side: e.side });
      return { tl: tl, start: Date.now(), k: 0, def: def };
    } catch (err) { if (root.console) console.warn('FX', err); return null; }
  }
  function hitAhead(ev, i) { for (var j = i + 1; j < ev.length && ev[j].type !== 'act'; j++) if (ev[j].type === 'damage' || ev[j].type === 'heal') return true; return false; }
  async function waitUntil(ms) { var dt = ms - Date.now(); if (dt > 0) await Win.sleep(dt); }
  async function playEvents(b, ev, scene) {
    var fast = State.data.settings.battleSpeed === 'fast'; var played = {}; var fxs = null;
    if (BattleUI.timeline) BattleUI.timeline.length = 0;
    for (var i = 0; i < ev.length; i++) {
      if (played[i]) continue;
      var e = ev[i]; if (BattleUI.timeline) BattleUI.timeline.push({ type: e.type, i: i, t: Date.now() });
      if (e.type === 'act') {   // 行動の始まり：味方は欄が少し前へ出る、敵は次の攻撃の踏み込み（lunge）で動く
        if (fxs) { await waitUntil(fxs.start + fxs.tl.total); fxs = null; scene.fxOn = false; }   // v6.5 前の行動の演出が終わってから
        setView(scene, e, b);
        if (e.side === 'party') actingCard(e.id); else actingCard(null);
        if (e.side === 'party' && e.kind === 'ultimate' && root.ChartBattleUI && U) { try { await root.ChartBattleUI.cutin(U.get(e.ultId), e.ultOutcome); } catch (err) { /* 演出だけ */ } }   // 必殺技の名前の帯
        fxs = startFx(b, ev, i, e, scene, fast); scene.fxOn = !!fxs;
        if (fxs) { if (BattleUI.timeline) BattleUI.timeline.push({ type: 'fx', fx: fxs.def.fx, hitAt: fxs.tl.hitAt, impacts: fxs.tl.impacts.slice(), total: fxs.tl.total, t: fxs.start, to: (scene.fx65 && scene.fx65.length ? scene.fx65[scene.fx65.length - 1].to.length : 0) }); await waitUntil(fxs.start + fxs.tl.windup); }   // 構え（使う人の動き）
        else if (e.side === 'party') await Win.sleep(fast ? 70 : 150);
        continue;
      }
      var preHit = fxs && fxs.k === 0 && hitAhead(ev, i);   // v6.5 この行動の命中（数字・HP）がまだ後にある：演出の時刻表で待つので、ここでは待たない
      if (e.type === 'msg') { setView(scene, e, b); if (preHit) { var mw0 = document.getElementById('battle-msg'); if (mw0) mw0.textContent = e.text; } else await bmsg(e.text, 420); }
      else if (e.type === 'damage' || e.type === 'heal') {
        var group = [e];
        if (e.g) for (var j = i + 1; j < ev.length && ev[j].type !== 'act'; j++) if (!played[j] && ev[j].g === e.g && (ev[j].type === 'damage' || ev[j].type === 'heal')) { group.push(ev[j]); played[j] = true; }
        if (fxs) { await waitUntil(fxs.start + fxs.tl.impacts[Math.min(fxs.k, fxs.tl.impacts.length - 1)]); fxs.k++; }   // v6.5 演出の命中の瞬間まで待つ（多段は1回ずつ）
        var shakeIds = [];
        group.forEach(function (g) { showHit(scene, b, g, shakeIds); });   // 命中の演出・数字を同時に出し、
        setView(scene, group[group.length - 1], b);                        // 同じ瞬間に HP（数字とバー）を当たった後の値へ
        shakeIds.forEach(function (id) { var el = document.querySelector('#battle-party .bp[data-id="' + id + '"]'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } });
        if (BattleUI.timeline) BattleUI.timeline.push({ type: 'hit', n: group.length, t: Date.now() });
        await Win.sleep(fxs ? (fast ? 40 : 90) : (fast ? 130 : 280));   // v6.5 演出があるときの余韻は、演出の終わり（次の行動の前）で待つ
      }
      else if (e.type === 'anim' && e.side === 'enemy' && e.anim === 'lunge') { setView(scene, e, b); scene.anims.push({ type: 'lunge', idx: e.idx, t: 0, dur: 260 }); if (!preHit) await Win.sleep(fast ? 80 : 140); }
      else if (e.type === 'summon') { setView(scene, e, b); var se = b.enemies[e.idx]; if (se) State.data.bestiary[se.defId] = Object.assign(State.data.bestiary[se.defId] || {}, { seen: true }); scene.anims.push({ type: 'appear', idx: e.idx, t: 0, dur: 500 }); if (root.Audio) root.Audio.sfx('magic'); await Win.sleep(fast ? 200 : 500); }
      else if (e.type === 'phase') { setView(scene, e, b); scene.anims.push({ type: 'phase', idx: e.idx, t: 0, dur: 700 }); scene.screenShake = 350; if (root.Audio) root.Audio.sfx('crit'); await Win.sleep(fast ? 250 : 600); }
      else if (e.type === 'anim') { setView(scene, e, b); if (!scene.fxOn) { if (e.side === 'enemy') scene.anims.push({ type: 'fx', side: 'enemy', idx: e.idx, anim: e.anim, t: 0, dur: 450 }); else if (e.target === 'self' || e.target === 'ally' || e.target === 'allies' || e.target === 'dead_ally') scene.anims.push({ type: 'fx', side: 'party', id: e.id, anim: e.anim, t: 0, dur: 450 }); } if (root.Audio) root.Audio.sfx('magic'); if (!preHit) await Win.sleep(fast ? 100 : 220); }
      else if (e.type === 'enemy_dead' || e.type === 'flee') {   // 倒れる演出を最後まで再生してから次へ
        setView(scene, e, b); scene.gone[e.idx] = true;
        var isBoss = b.enemies[e.idx] && b.enemies[e.idx].boss; var dur = e.type === 'flee' ? 400 : isBoss ? 1400 : 550; scene.anims.push({ type: 'die', idx: e.idx, t: 0, dur: fast ? Math.round(dur * 0.5) : dur });
        if (isBoss) { scene.screenShake = 900; scene.flash = 300; } if (root.Audio) root.Audio.sfx('die'); await Win.sleep(fast ? Math.round(dur * 0.5) : dur);
      }
      else if (e.type === 'actor_dead') { setView(scene, e, b); await Win.sleep(fast ? 150 : 300); }
      else if (e.type === 'revive') { setView(scene, e, b); scene.anims.push({ type: 'fx', side: 'party', id: e.id, anim: 'light', t: 0, dur: 500 }); if (root.Audio) root.Audio.sfx('heal'); await Win.sleep(fast ? 150 : 320); }
      else if (e.type === 'trial') {
        setView(scene, e, b);
        var enemy = b.enemies[e.idx];
        await bmsg(enemy.name + 'の相場の試練！ チャートを読み、正しい行動を選べ！', 700);
        var scs = enemy.trialScenarios || ['clear_up', 'clear_down', 'range', 'up_pullback', 'down_rally'];
        var res = await root.TradeUI.trial(scs, { title: enemy.name + 'の相場の試練', noQuit: true });   // v5.8 戦闘中の試練は中断できない
        var ev2 = Combat.applyTrialResult(b, e.idx, res ? res.score : 0);
        await playEvents(b, ev2, scene);
      }
      else if (e.type === 'end') { setView(scene, e, b); await Win.sleep(200); }
      else setView(scene, e, b);
    }
    if (fxs) { await waitUntil(fxs.start + fxs.tl.total); scene.fxOn = false; }   // v6.5 最後の演出が終わるまで
    actingCard(null);
    scene.view = Combat.snapshot(b); renderParty(b, scene.view);   // 再生し終えたら計算上の最終状態と一致させる
  }
  BattleUI.playEvents = playEvents;

  root.BattleUI = BattleUI;
})(typeof window !== 'undefined' ? window : globalThis);
