/* =========================================================
   UI / BattleBG65（v6.5 Phase D）：戦闘背景の作り直し（2D。3D版のページも戦闘は同じ画面）
   ・戦う場所の種類14：草原・森・洞窟・城の中・鉱山・港・海の上・砂漠・雪原・火山・魔導の都・機械の都・天空・暗黒大陸
     ＋地域ごとの色・地形・天気の違い（同じ草原でもアルカディアと群島とカリオンで違う）
   ・層：空（時間帯・星・太陽／月）→ 遠景（山・街並み・雲海）→ 中景（木・柱・岩・結晶）→ 地面（奥行きの線・模様）→ 手前の飾り → 光と影（光の筋・周辺の暗さ）
   ・動くもの（毎フレーム）：その場所の粒（木の葉・ほたる・火の粉・雪・砂・泡・魔力の粒・データの光・灰）と天気（雨・吹雪・砂嵐）
   ・ボス戦：ボスの得意な属性の色で、背景を暗くして光を脈打たせる（ボス専用の背景）
   ・品質：設定の「戦闘背景」＝高（すべて）／標準（粒を減らす）／軽量（動く粒なし。スマホ向け）
   ・描けない場合は、今までの背景（battle.js の BattleBG）をそのまま使う
   ========================================================= */
(function (root) {
  'use strict';
  var BG = {};
  function h(x) { var n = Math.sin(x * 12.9898) * 43758.5453; return n - Math.floor(n); }
  function grad(ctx, x0, y0, x1, y1, stops) { var g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(A[i] + (B[i] - A[i]) * t); }).join(',') + ')'; }
  function hex(c) { c = String(c); var m = /rgba?\(([^)]+)\)/.exec(c); if (m) return m[1].split(',').slice(0, 3).map(function (v) { return Math.round(+v) || 0; }); c = c.replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.substr(0, 2), 16) || 0, parseInt(c.substr(2, 2), 16) || 0, parseInt(c.substr(4, 2), 16) || 0]; }
  function shade(c, k) { var A = hex(c); return 'rgb(' + A.map(function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); }).join(',') + ')'; }

  /* ---------- 地域と場所 ---------- */
  var REGION_OF_MAP = { world: 'arcadia', world_grania: 'grania', world_kalion: 'kalion', world_islands: 'islands', world_tempus: 'tempus', world_machine: 'machine', world_magicka: 'magicka', world_sky: 'sky', world_dark: 'dark', world_desert: 'desert', world_dragon: 'dragon', world_snow: 'snow' };
  BG.regionOf = function (mapId) {
    if (REGION_OF_MAP[mapId]) return REGION_OF_MAP[mapId];
    var def = root.MAP_DEFS && root.MAP_DEFS[mapId]; if (!def) return 'arcadia';
    // ダンジョン・町は、出口のワープ先の地域（たどれなければ名前から）
    var seen = {}, q = [mapId];
    while (q.length) { var id = q.shift(); if (seen[id]) continue; seen[id] = 1; if (REGION_OF_MAP[id]) return REGION_OF_MAP[id]; var d = root.MAP_DEFS[id]; if (!d) continue; (d.warps || []).forEach(function (w) { if (!seen[w.to]) q.push(w.to); }); if (Object.keys(seen).length > 40) break; }
    return 'arcadia';
  };
  // 場所の種類（14）。マップの名前・出現地帯の名前・地域で決める（建物の中で外の景色を出さない）
  var REGION_PLACE = { machine: 'machine_city', magicka: 'magic_city', sky: 'sky', dark: 'dark', desert: 'desert', dragon: 'volcano', snow: 'snow' };
  BG.placeOf = function (mapId, kind, zone, aboard) {
    var def = (root.MAP_DEFS && root.MAP_DEFS[mapId]) || {}; var r = BG.regionOf(mapId);
    var s = (def.name || '') + ' ' + (zone || '') + ' ' + (mapId || '');
    if (aboard) return 'sea';
    if (kind === 'field') {
      if (REGION_PLACE[r]) return REGION_PLACE[r];
      if (/森林|森/.test(zone || '')) return 'forest';
      if (/荒野/.test(zone || '')) return 'desert';
      return 'grassland';
    }
    if (r === 'dark') return 'dark';                                   // 虚無の荒野・魔王城
    if (/海底|沈没|礁|undersea|reef/.test(s)) return 'sea';
    if (/港|巣|岬|harbor|pirate|cape/.test(s)) return 'harbor';
    if (/鉱山|坑道|廃坑|mine/.test(s)) return 'mine';
    if (/火口|竜脈|溶岩|crater|dragon/.test(s) || r === 'dragon') return 'volcano';
    if (/森/.test(s)) return 'forest';                                 // 迷いの森・精霊の森（色は地域で変わる）
    if (/天空|星見|sky_|star_/.test(s) || r === 'sky') return 'sky';
    if (/王宮|玉座|palace/.test(s)) return 'castle';
    if (/研究所|実験|工場|施設|中枢|旧都市|lab|factory|oracle|old_city/.test(s)) return r === 'magicka' ? 'magic_city' : 'machine_city';
    if (r === 'magicka' || /禁書/.test(s)) return 'magic_city';
    if (r === 'machine') return 'machine_city';
    if (/砂嵐|砂/.test(s) && r === 'desert') return 'desert';
    if (/塔|神殿|王宮|宮|城|砦|回廊|契約室|記録庫|記憶庫|図書館|書庫|書架|館|tower|temple|palace|vault|archive|library|fort/.test(s)) return 'castle';
    if (/山道|峠|山脈|島|pass|isle/.test(s)) return 'grassland';
    if (/洞窟|洞|アジト|集会所|地下|物置|荷置き|cave|hideout/.test(s)) return 'cave';
    if (kind === 'town') return REGION_PLACE[r] || (/港|harbor/.test(s) ? 'harbor' : 'grassland');
    if (kind === 'interior') return 'castle';
    return REGION_PLACE[r] || (kind === 'dungeon' ? 'cave' : 'grassland');
  };
  // 地域ごとの色（同じ種類の場所でも地域で違う）
  var PAL = {
    arcadia: { sky: ['#3f8ad8', '#bfe4ff'], far: '#6a9ad0', mid: '#3f8a3f', ground: ['#5fb050', '#2f7a2f'], accent: '#ffe08a' },
    grania: { sky: ['#6a6a7a', '#c9b8a0'], far: '#5a5a66', mid: '#4a4a52', ground: ['#7a6a5a', '#4a3e34'], accent: '#ff8a3a' },
    kalion: { sky: ['#5a7ab0', '#e0d8c0'], far: '#7a7a9a', mid: '#5a6a4a', ground: ['#9a8a6a', '#6a5a40'], accent: '#ffd24a' },
    islands: { sky: ['#4ab0e0', '#e0fbff'], far: '#5ab0a0', mid: '#3a9a6a', ground: ['#e0d0a0', '#b09a6a'], accent: '#ffffff' },
    tempus: { sky: ['#8a7ab0', '#f0d8c0'], far: '#9a8ab0', mid: '#7a6a8a', ground: ['#b0a080', '#7a6a50'], accent: '#ffd24a' },
    machine: { sky: ['#2a3040', '#5a6a80'], far: '#3a4250', mid: '#4a5260', ground: ['#5a6070', '#2a3040'], accent: '#6fd0ff' },
    magicka: { sky: ['#3a2a6a', '#a08ad8'], far: '#4a3a8a', mid: '#5a4a9a', ground: ['#6a5a9a', '#3a2a5a'], accent: '#c9a2ff' },
    sky: { sky: ['#6ab0ff', '#ffffff'], far: '#e8f4ff', mid: '#c0d8f0', ground: ['#d8e8f8', '#a0b8d0'], accent: '#ffe08a' },
    dark: { sky: ['#0a0a14', '#3a0a1a'], far: '#1a1020', mid: '#2a1424', ground: ['#2a1a20', '#0a0608'], accent: '#ff3a4a' },
    desert: { sky: ['#e0a050', '#ffe8b0'], far: '#d0905a', mid: '#c08a50', ground: ['#e8c890', '#b08a50'], accent: '#ffffff' },
    dragon: { sky: ['#5a1a10', '#e06a2a'], far: '#3a1a14', mid: '#2a1410', ground: ['#3a2a24', '#1a0e0a'], accent: '#ff8a2a' },
    snow: { sky: ['#8ab0d8', '#f0f8ff'], far: '#c0d8f0', mid: '#a0b8d0', ground: ['#f0f6ff', '#c0d0e8'], accent: '#9fd0ff' }
  };
  BG.quality = function () { var d = root.State && root.State.data; var q = d && d.settings && d.settings.battleBg; return q === 'low' || q === 'normal' ? q : (root.matchMedia && root.matchMedia('(max-width: 720px)').matches && q !== 'high' ? 'normal' : 'high'); };

  /* ---------- 静止画（戦闘の始めに1回） ---------- */
  BG.render = function (info, W, H) {
    var c = document.createElement('canvas'); c.width = W; c.height = H; var ctx = c.getContext('2d');
    var place = info.place, P = PAL[info.region] || PAL.arcadia; var night = info.night; var hz = H * 0.58;
    var dark = night ? 0.45 : 1;
    var sky = function (top, bot) { ctx.fillStyle = grad(ctx, 0, 0, 0, hz, [[0, shade(top, dark)], [1, shade(bot, night ? 0.5 : 1)]]); ctx.fillRect(0, 0, W, hz + 2); };
    var stars = function (n) { ctx.fillStyle = '#ffffff'; for (var i = 0; i < n; i++) { ctx.globalAlpha = 0.4 + h(i * 7) * 0.6; ctx.fillRect(h(i * 3) * W, h(i * 5) * hz * 0.8, 1 + (i % 3 === 0), 1 + (i % 3 === 0)); } ctx.globalAlpha = 1; };
    var orb = function (x, y, r, col, glow) { var g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 4); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    var ridge = function (y0, amp, col, seed, step, sharp) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y0); for (var x = 0; x <= W + step; x += step) { var v = h(seed + Math.floor(x / step)); ctx.lineTo(x, y0 - (sharp ? Math.pow(v, 1.6) : v) * amp); } ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); };
    var floor = function (top, bot, lines, texCol) { ctx.fillStyle = grad(ctx, 0, hz, 0, H, [[0, shade(top, dark)], [1, shade(bot, dark)]]); ctx.fillRect(0, hz, W, H - hz); if (lines) { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; for (var i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 18, hz); ctx.lineTo(W / 2 + i * 140, H); ctx.stroke(); } for (var j = 1; j < 7; j++) { var y = hz + (H - hz) * Math.pow(j / 7, 1.8); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } } if (texCol) { ctx.fillStyle = texCol; for (var k = 0; k < 160; k++) { var yy = hz + Math.pow(h(k * 3), 1.5) * (H - hz); var s = 1 + (yy - hz) / (H - hz) * 3; ctx.globalAlpha = 0.35; ctx.fillRect(h(k * 7) * W, yy, s * 2, s); } ctx.globalAlpha = 1; } };
    var shadowBand = function () { ctx.fillStyle = grad(ctx, 0, hz - 6, 0, hz + 50, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.22)']]); ctx.fillRect(0, hz - 6, W, 56); };
    var tree = function (x, y, s, col, tall) { ctx.fillStyle = shade(col, 0.6); ctx.fillRect(x - s * 0.08, y - s * 0.35, s * 0.16, s * 0.4); ctx.fillStyle = col; for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x, y - s * (tall ? 1.3 : 1) + k * s * 0.25); ctx.lineTo(x - s * (0.35 + k * 0.08), y - s * 0.3 + k * 0.02 * s); ctx.lineTo(x + s * (0.35 + k * 0.08), y - s * 0.3 + k * 0.02 * s); ctx.closePath(); ctx.fill(); } };
    var pillar = function (x, y, w, hgt, col) { ctx.fillStyle = shade(col, 0.75); ctx.fillRect(x - w / 2, y - hgt, w, hgt); ctx.fillStyle = shade(col, 1.1); ctx.fillRect(x - w / 2, y - hgt, w * 0.3, hgt); ctx.fillStyle = shade(col, 0.6); ctx.fillRect(x - w / 2 - 4, y - hgt - 8, w + 8, 8); ctx.fillRect(x - w / 2 - 4, y - 6, w + 8, 6); };
    var crystal = function (x, y, s, col) { ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.28, y); ctx.lineTo(x - s * 0.28, y); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * 0.1, y); ctx.lineTo(x - s * 0.28, y); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; };
    var rock = function (x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.6, y - s * 0.7); ctx.lineTo(x + s * 0.2, y - s * 0.9); ctx.lineTo(x + s, y - s * 0.3); ctx.lineTo(x + s * 0.9, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(x - s * 0.6, y - s * 0.7); ctx.lineTo(x + s * 0.2, y - s * 0.9); ctx.lineTo(x, y - s * 0.4); ctx.closePath(); ctx.fill(); };
    var vignette = function (a) { var g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, W * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + a + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
    var rays = function (col, n) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (var i = 0; i < n; i++) { var x = W * (0.15 + h(i * 9) * 0.7); ctx.fillStyle = grad(ctx, x, 0, x + 60, H, [[0, col], [1, 'rgba(0,0,0,0)']]); ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 26, 0); ctx.lineTo(x + 120, H); ctx.lineTo(x + 40, H); ctx.closePath(); ctx.fill(); } ctx.restore(); };
    switch (place) {
      case 'grassland': sky(P.sky[0], P.sky[1]); if (night) { stars(60); orb(W * 0.8, 60, 18, '#f0f0d8', 'rgba(240,240,200,0.35)'); } else orb(W * 0.18, 56, 20, '#fff6d0', 'rgba(255,240,180,0.45)');
        ridge(hz - 40, 90, shade(P.far, dark), 3, 40, true); ridge(hz - 10, 50, shade(mix(P.far, P.mid, 0.5), dark), 9, 26); ridge(hz + 4, 26, shade(P.mid, dark), 17, 18);
        floor(P.ground[0], P.ground[1], false, shade(P.mid, 0.8)); for (var i = 0; i < 5; i++) tree(40 + i * 140 + h(i) * 40, hz + 8, 34 + h(i * 3) * 18, shade(P.mid, dark * 0.8)); break;
      case 'forest': sky(mix(P.sky[0], '#2a5a3a', 0.4), mix(P.sky[1], '#8ac08a', 0.4)); for (var f = 0; f < 14; f++) tree(f * 50 + h(f) * 30, hz + 10, 90 + h(f * 5) * 60, shade(mix(P.mid, '#1a4a2a', 0.5), dark * (0.6 + h(f) * 0.3)), true);
        floor(mix(P.ground[0], '#3a6a2a', 0.5), mix(P.ground[1], '#1a3a1a', 0.5), false, '#2a5a2a'); if (!night) rays('rgba(255,250,200,0.12)', 5); else stars(10); for (var f2 = 0; f2 < 4; f2++) tree(f2 * 210 - 20, H + 20, 160, shade('#1a3a1a', dark), true); break;
      case 'cave': case 'mine': ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#120e14'], [1, '#2a2226']]); ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1a1418'; for (var s = 0; s < 18; s++) { var x = s * 38 + h(s) * 20, l = 20 + h(s * 3) * 70; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(x, l); ctx.closePath(); ctx.fill(); }
        ridge(hz, 60, '#2a2228', 4, 30, true); floor(place === 'mine' ? '#4a3a30' : '#3a3036', '#16101a', true, '#5a4a40');
        for (var t = 0; t < 2; t++) { var tx = t ? W - 70 : 70; ctx.fillStyle = '#6a4a2a'; ctx.fillRect(tx - 3, hz - 70, 6, 40); orb(tx, hz - 76, 6, '#ffd24a', 'rgba(255,160,60,0.45)'); }
        if (place === 'mine') { ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, H - 40); ctx.lineTo(W, H - 60); ctx.moveTo(0, H - 24); ctx.lineTo(W, H - 44); ctx.stroke(); for (var b = 0; b < 3; b++) { ctx.fillStyle = '#5a4030'; ctx.fillRect(110 + b * 210, hz - 120, 12, 120); ctx.fillRect(100 + b * 210, hz - 124, 70, 10); } for (var o = 0; o < 10; o++) crystal(h(o * 4) * W, hz - 10 + h(o) * 30, 10 + h(o * 2) * 10, P.accent); }
        else for (var cr = 0; cr < 6; cr++) crystal(h(cr * 11) * W, hz + h(cr) * 40, 14 + h(cr * 3) * 16, mix('#7fb0ff', P.accent, 0.3)); vignette(0.6); break;
      case 'castle': var wall = mix('#4a4458', P.far, 0.35), wall2 = mix('#6a6478', P.far, 0.35); ctx.fillStyle = grad(ctx, 0, 0, 0, hz, [[0, shade(wall, dark)], [1, shade(wall2, dark)]]); ctx.fillRect(0, 0, W, hz);
        for (var bw = 0; bw < 12; bw++) for (var bh = 0; bh < 8; bh++) { ctx.fillStyle = 'rgba(0,0,0,' + (0.06 + h(bw * 9 + bh) * 0.08) + ')'; ctx.fillRect(bw * 56 + (bh % 2) * 28, bh * 30, 54, 28); }
        for (var pl = 0; pl < 4; pl++) pillar(70 + pl * 167, hz + 4, 34, hz - 30, mix('#8a8498', P.far, 0.3)); for (var bn = 0; bn < 3; bn++) { var bx = 150 + bn * 167; ctx.fillStyle = shade(P.accent === '#ffffff' ? '#a02a3a' : '#8a1a2a', dark); ctx.fillRect(bx, 40, 40, 90); ctx.beginPath(); ctx.moveTo(bx, 130); ctx.lineTo(bx + 20, 116); ctx.lineTo(bx + 40, 130); ctx.fill(); ctx.fillStyle = P.accent; ctx.fillRect(bx + 16, 64, 8, 8); }
        floor(mix('#7a6a5a', P.ground[0], 0.35), mix('#3a3028', P.ground[1], 0.35), true, null); ctx.fillStyle = shade('#8a1a2a', 0.8 * dark); ctx.beginPath(); ctx.moveTo(W / 2 - 50, hz); ctx.lineTo(W / 2 + 50, hz); ctx.lineTo(W / 2 + 180, H); ctx.lineTo(W / 2 - 180, H); ctx.closePath(); ctx.fill(); rays('rgba(255,240,200,0.08)', 3); vignette(0.35); break;
      case 'harbor': case 'sea': sky(P.sky[0], P.sky[1]); if (night) stars(50); else orb(W * 0.75, 70, 18, '#fff6d0', 'rgba(255,240,180,0.4)'); ridge(hz - 20, 40, shade(P.far, dark * 0.9), 6, 50);
        ctx.fillStyle = grad(ctx, 0, hz - 18, 0, H, [[0, shade('#3a8ad0', dark)], [1, shade('#1a4a80', dark)]]); ctx.fillRect(0, hz - 18, W, H - hz + 18); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; for (var wv = 0; wv < 14; wv++) { var wy = hz - 10 + Math.pow(wv / 14, 1.6) * (H - hz); ctx.beginPath(); for (var wx = 0; wx <= W; wx += 12) ctx.lineTo(wx, wy + Math.sin(wx / 30 + wv) * 2); ctx.stroke(); }
        if (place === 'harbor') { ctx.fillStyle = shade('#8a6a4a', dark); ctx.fillRect(0, hz + 30, W * 0.55, 18); for (var pp = 0; pp < 6; pp++) ctx.fillRect(20 + pp * 60, hz + 46, 6, 40); ctx.fillStyle = shade('#6a4a2a', dark); ctx.beginPath(); ctx.moveTo(W - 220, hz + 10); ctx.lineTo(W - 60, hz + 10); ctx.lineTo(W - 90, hz + 34); ctx.lineTo(W - 200, hz + 34); ctx.closePath(); ctx.fill(); ctx.fillRect(W - 142, hz - 80, 4, 90); ctx.fillStyle = '#f0f0e0'; ctx.beginPath(); ctx.moveTo(W - 138, hz - 76); ctx.lineTo(W - 80, hz - 10); ctx.lineTo(W - 138, hz - 10); ctx.closePath(); ctx.fill(); }
        break;
      case 'desert': sky(P.sky[0], P.sky[1]); orb(W * 0.7, 60, 24, '#fff2c0', 'rgba(255,230,160,0.6)'); ridge(hz - 10, 50, shade(P.far, dark), 5, 70); ridge(hz + 10, 30, shade(P.mid, dark), 12, 50);
        floor(P.ground[0], P.ground[1], false, 'rgba(160,110,50,0.8)'); for (var dr = 0; dr < 4; dr++) rock(60 + dr * 170 + h(dr) * 40, hz + 30 + h(dr * 3) * 40, 20 + h(dr) * 16, shade('#8a6a40', dark)); ctx.strokeStyle = 'rgba(160,110,60,0.35)'; for (var dl = 0; dl < 8; dl++) { ctx.beginPath(); ctx.moveTo(0, hz + 20 + dl * 18); ctx.quadraticCurveTo(W / 2, hz + 10 + dl * 18 + 20, W, hz + 20 + dl * 18); ctx.stroke(); } break;
      case 'snow': sky(P.sky[0], P.sky[1]); if (night) { stars(70); ctx.fillStyle = 'rgba(160,255,210,0.18)'; ctx.beginPath(); ctx.moveTo(0, 60); for (var ax = 0; ax <= W; ax += 20) ctx.lineTo(ax, 60 + Math.sin(ax / 60) * 20); ctx.lineTo(W, 120); ctx.lineTo(0, 120); ctx.fill(); }
        ridge(hz - 30, 100, shade('#c0d0e8', dark), 4, 50, true); ridge(hz, 40, shade('#e0ecf8', dark), 9, 30); floor('#f8fbff', '#c8d8f0', false, 'rgba(160,190,230,0.9)'); for (var st2 = 0; st2 < 6; st2++) tree(30 + st2 * 120, hz + 10, 50, shade('#3a5a6a', dark), true); for (var ic = 0; ic < 5; ic++) crystal(h(ic * 13) * W, hz + 50 + h(ic) * 40, 18, 'rgba(180,220,255,0.9)'); break;
      case 'volcano': ctx.fillStyle = grad(ctx, 0, 0, 0, hz, [[0, '#1a0806'], [0.7, '#5a1a0a'], [1, '#c04a1a']]); ctx.fillRect(0, 0, W, hz); ridge(hz - 10, 160, '#1a0e0c', 2, 120, true);
        var vg = ctx.createRadialGradient(W * 0.35, hz - 20, 10, W * 0.35, hz - 20, W * 0.45); vg.addColorStop(0, 'rgba(255,140,50,0.55)'); vg.addColorStop(1, 'rgba(255,80,20,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg; ctx.fillRect(0, 0, W, hz); ctx.restore(); ctx.fillStyle = 'rgba(60,40,40,0.5)'; for (var sm = 0; sm < 5; sm++) { ctx.beginPath(); ctx.arc(W * 0.35 + sm * 18 - 30, hz - 160 - sm * 26, 30 + sm * 8, 0, Math.PI * 2); ctx.fill(); } floor('#3a2a24', '#100806', false, null); for (var lv = 0; lv < 5; lv++) { ctx.strokeStyle = 'rgba(255,120,40,' + (0.6 - lv * 0.08) + ')'; ctx.lineWidth = 3 - lv * 0.4; ctx.beginPath(); ctx.moveTo(h(lv) * W, hz + 10); for (var ly = hz; ly < H; ly += 20) ctx.lineTo(h(lv) * W + Math.sin(ly / 30 + lv) * 30, ly); ctx.stroke(); }
        for (var vr = 0; vr < 5; vr++) rock(30 + vr * 150, hz + 40 + h(vr) * 50, 26, '#2a1a16'); vignette(0.45); break;
      case 'magic_city': sky(P.sky[0], P.sky[1]); stars(night ? 70 : 25); for (var tw = 0; tw < 7; tw++) { var tx2 = 30 + tw * 95, th = 80 + h(tw * 4) * 120; ctx.fillStyle = shade(P.far, dark * 0.8); ctx.fillRect(tx2, hz - th, 46, th); ctx.beginPath(); ctx.moveTo(tx2 - 6, hz - th); ctx.lineTo(tx2 + 23, hz - th - 40); ctx.lineTo(tx2 + 52, hz - th); ctx.fill(); for (var wn = 0; wn < 6; wn++) { ctx.fillStyle = 'rgba(200,170,255,' + (0.4 + h(tw * 7 + wn) * 0.5) + ')'; ctx.fillRect(tx2 + 8 + (wn % 2) * 20, hz - th + 14 + Math.floor(wn / 2) * 26, 8, 12); } }
        floor('#5a4a8a', '#2a1a4a', true, null); ctx.strokeStyle = 'rgba(200,170,255,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(W / 2, hz + 70, 200, 40, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(W / 2, hz + 70, 150, 28, 0, 0, Math.PI * 2); ctx.stroke(); for (var mc = 0; mc < 6; mc++) crystal(h(mc * 3) * W, hz + 30 + h(mc * 7) * 70, 20, 'rgba(201,162,255,0.9)'); break;
      case 'machine_city': ctx.fillStyle = grad(ctx, 0, 0, 0, hz, [[0, '#0e1218'], [1, '#2a3444']]); ctx.fillRect(0, 0, W, hz); for (var bd = 0; bd < 10; bd++) { var bx2 = bd * 66, bh2 = 90 + h(bd * 2) * 140; ctx.fillStyle = '#1a2230'; ctx.fillRect(bx2, hz - bh2, 58, bh2); for (var ln = 0; ln < 8; ln++) { ctx.fillStyle = 'rgba(111,208,255,' + (0.2 + h(bd * 11 + ln) * 0.6) + ')'; ctx.fillRect(bx2 + 6, hz - bh2 + 10 + ln * 14, 46 * h(bd + ln), 3); } }
        floor('#4a5262', '#14181f', true, null); ctx.strokeStyle = 'rgba(111,208,255,0.4)'; ctx.lineWidth = 1; for (var cl = 0; cl < 6; cl++) { ctx.beginPath(); ctx.moveTo(h(cl) * W, hz); ctx.lineTo(h(cl) * W, hz + 40 + cl * 10); ctx.lineTo(h(cl * 3) * W, hz + 40 + cl * 10); ctx.stroke(); } for (var sc = 0; sc < 2; sc++) { var sx = sc ? W - 130 : 40; ctx.fillStyle = '#0a1018'; ctx.fillRect(sx, hz - 60, 90, 54); ctx.fillStyle = 'rgba(111,208,255,0.5)'; ctx.fillRect(sx + 6, hz - 54, 78, 42); } vignette(0.4); break;
      case 'sky': ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, shade('#4a90e8', dark)], [0.55, shade('#d8ecff', night ? 0.5 : 1)], [1, shade('#ffffff', night ? 0.55 : 1)]]); ctx.fillRect(0, 0, W, H); if (night) stars(60); else rays('rgba(255,250,220,0.18)', 4);
        for (var fi = 0; fi < 3; fi++) { var ix = W * (0.12 + fi * 0.36) + h(fi) * 40, iy = hz - 70 - h(fi * 5) * 60, iw = 60 + h(fi * 3) * 50; ctx.fillStyle = shade('#b8a890', dark * (0.7 + fi * 0.1)); ctx.beginPath(); ctx.moveTo(ix - iw / 2, iy); ctx.lineTo(ix + iw / 2, iy); ctx.lineTo(ix + iw * 0.15, iy + iw * 0.5); ctx.lineTo(ix - iw * 0.2, iy + iw * 0.35); ctx.closePath(); ctx.fill(); ctx.fillStyle = shade('#7ab06a', dark); ctx.fillRect(ix - iw / 2, iy - 4, iw, 5); if (fi === 1) pillar(ix, iy - 2, 12, 46, '#e8e0d0'); }
        ctx.fillStyle = grad(ctx, 0, hz, 0, H, [[0, shade('#eaf4ff', night ? 0.55 : 1)], [1, shade('#c8dcf0', night ? 0.5 : 1)]]); ctx.fillRect(0, hz + 14, W, H);
        for (var cl2 = 0; cl2 < 16; cl2++) { var cx2 = h(cl2 * 1.7) * W, cy2 = hz + 6 + Math.pow(h(cl2 * 3.3), 1.4) * (H - hz - 20), cs = 18 + (cy2 - hz) / (H - hz) * 30; ctx.fillStyle = 'rgba(255,255,255,' + (night ? 0.55 : 0.92) + ')'; for (var k2 = 0; k2 < 4; k2++) { ctx.beginPath(); ctx.arc(cx2 + k2 * cs * 0.8, cy2 + (k2 % 2) * cs * 0.25, cs * (0.8 + (k2 % 3) * 0.2), 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = 'rgba(150,180,220,0.18)'; ctx.fillRect(cx2 - cs, cy2 + cs * 0.6, cs * 4, 3); }
        break;
      case 'dark': ctx.fillStyle = grad(ctx, 0, 0, 0, hz, [[0, '#050308'], [1, '#2a0812']]); ctx.fillRect(0, 0, W, hz); orb(W * 0.7, 70, 22, '#c01a2a', 'rgba(200,20,40,0.45)'); ridge(hz - 20, 140, '#0a0608', 6, 60, true); ridge(hz, 60, '#140a0e', 11, 34, true);
        floor('#2a1a20', '#0a0608', false, 'rgba(140,30,50,0.6)'); ctx.fillStyle = grad(ctx, 0, hz - 30, 0, hz + 60, [[0, 'rgba(160,30,60,0)'], [0.5, 'rgba(160,30,60,0.22)'], [1, 'rgba(160,30,60,0)']]); ctx.fillRect(0, hz - 30, W, 90); for (var sp = 0; sp < 7; sp++) { ctx.fillStyle = '#0a0608'; var spx = h(sp * 5) * W; ctx.beginPath(); ctx.moveTo(spx - 10, hz + 40); ctx.lineTo(spx, hz - 40 - h(sp) * 60); ctx.lineTo(spx + 10, hz + 40); ctx.fill(); } vignette(0.6); break;
      default: return null;
    }
    shadowBand();
    if (info.boss) { var col = info.bossColor || '255,60,80'; var g2 = ctx.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.42, W * 0.7); g2.addColorStop(0, 'rgba(' + col + ',0.0)'); g2.addColorStop(1, 'rgba(' + col + ',0.22)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); vignette(0.5); }
    return c;
  };

  /* ---------- 動くもの（毎フレーム。品質が「軽量」のときは描かない） ---------- */
  var PART = { grassland: ['leaf', '#9fe08a'], forest: ['firefly', '#f0ff9a'], cave: ['dust', '#c8b8a8'], mine: ['dust', '#ffb070'], castle: ['dust', '#fff0c8'], harbor: ['spray', '#ffffff'], sea: ['spray', '#ffffff'], desert: ['sand', '#e8c890'], snow: ['snow', '#ffffff'], volcano: ['ember', '#ff8a2a'], magic_city: ['mote', '#c9a2ff'], machine_city: ['data', '#6fd0ff'], sky: ['wisp', '#ffffff'], dark: ['ash', '#ff5a6a'] };
  BG.drawAmbient = function (ctx, scene, W, H) {
    var info = scene.bg65; if (!info) return; var q = BG.quality(); if (q === 'low') return;
    var n = q === 'high' ? 70 : 32; var p = PART[info.place] || PART.grassland; var kind = info.weather || p[0], col = p[1]; var t = (scene.ambT !== undefined ? scene.ambT : (root.performance && root.performance.now ? root.performance.now() : Date.now())) / 1000;   // 命令を選んでいる間（戦闘の時計が止まっている間）も、雪や粒は動き続ける
    ctx.save();
    for (var i = 0; i < n; i++) {
      var sx = h(i * 3.1), sy = h(i * 7.7), sp = 0.3 + h(i * 1.3) * 0.7, x, y, s = 1 + h(i * 2.1) * 2;
      if (kind === 'snow' || kind === 'ash' || kind === 'leaf') { x = (sx * W + Math.sin(t * sp + i) * 20 + t * 10 * (kind === 'leaf' ? 1 : 0.3)) % W; y = (sy * H + t * 40 * sp) % H; }
      else if (kind === 'rain') { x = (sx * W + t * 60) % W; y = (sy * H + t * 520 * sp) % H; ctx.strokeStyle = 'rgba(200,220,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); ctx.stroke(); continue; }
      else if (kind === 'sand') { x = (sx * W + t * 160 * sp) % W; y = H * 0.35 + sy * H * 0.65 + Math.sin(t + i) * 4; }
      else if (kind === 'ember') { x = (sx * W + Math.sin(t * 2 + i) * 8) % W; y = H - ((sy * H + t * 50 * sp) % H); }
      else if (kind === 'data') { x = Math.floor(sx * 30) * (W / 30); y = (sy * H + t * 90 * sp) % H; ctx.fillStyle = 'rgba(111,208,255,' + (0.25 + 0.4 * sp) + ')'; ctx.fillRect(x, y, 2, 8); continue; }
      else if (kind === 'wisp' || kind === 'spray') { x = (sx * W + t * 25 * sp) % W; y = (kind === 'spray' ? H * 0.55 : H * 0.2) + sy * H * 0.4 + Math.sin(t * 2 + i) * 6; }
      else { x = (sx * W + Math.sin(t * sp + i * 2) * 30) % W; y = (sy * H * 0.9 + Math.cos(t * sp + i) * 20); }
      var a = kind === 'firefly' || kind === 'mote' ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3 + i)) : 0.7;
      ctx.fillStyle = col; ctx.globalAlpha = a; if (kind === 'firefly' || kind === 'mote' || kind === 'ember') { ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(x, y, s * (kind === 'leaf' ? 2 : 1), s);
    }
    ctx.globalAlpha = 1;
    if (info.boss) { var pulse = 0.08 + 0.06 * Math.sin(t * 2.4); ctx.fillStyle = 'rgba(' + (info.bossColor || '255,60,80') + ',' + pulse.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  };
  // 戦闘の始めに：場所・地域・時間帯・天気・ボス
  BG.infoFor = function (b, opts) {
    var W0 = root.World, m = W0 && W0.map, d = root.State && root.State.data; var mapId = m ? m.id : ''; var kind = m ? m.kind : 'field';
    var place = BG.placeOf(mapId, kind, opts && opts.zone, d && d.aboard); var region = BG.regionOf(mapId);
    var night = kind === 'field' && d && d.timeOfDay !== undefined && (d.timeOfDay < 0.2 || d.timeOfDay > 0.8);
    var weather = null; var r = h((d && d.steps || 0) * 0.37);
    if (kind === 'field' && place === 'grassland' && region === 'islands' && r < 0.35) weather = 'rain';
    if (place === 'snow' && r < 0.4) weather = 'snow'; if (place === 'desert' && r < 0.4) weather = 'sand';
    var boss = !!(opts && opts.boss); var bossColor = null;
    if (boss && b && b.enemies && b.enemies[0]) {
      var bd = (root.ENEMIES && root.ENEMIES[b.enemies.filter(function (e) { return e.boss; }).concat(b.enemies)[0].defId]) || {}; var res = bd.resist || {};
      var AU = { fire: '255,120,60', ice: '140,210,255', thunder: '255,230,90', wind: '150,255,190', light: '255,245,200', dark: '170,90,255', water: '90,170,255', earth: '200,160,90' }; var best = null, bv = 1;
      Object.keys(res).forEach(function (k) { if (res[k] < bv && AU[k]) { bv = res[k]; best = k; } });
      var acc = bd.art && bd.art.c && bd.art.c.accent; bossColor = best ? AU[best] : (acc && /^#[0-9a-f]{6}$/i.test(acc) ? hex(acc).join(',') : '255,60,80');
    }
    return { place: place, region: region, night: !!night, weather: weather, boss: boss, bossColor: bossColor };
  };
  BG.PAL = PAL;
  BG.PLACES = ['grassland', 'forest', 'cave', 'castle', 'mine', 'harbor', 'sea', 'desert', 'snow', 'volcano', 'magic_city', 'machine_city', 'sky', 'dark'];
  root.BattleBG65 = BG;
})(typeof window !== 'undefined' ? window : globalThis);
