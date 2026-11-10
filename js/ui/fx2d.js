/* =========================================================
   UI / FX2D（v6.5 Phase C）：戦闘の演出を 2D の canvas に描く
   ・js/data/fx65.js の演出データ（fx の種類・色・全体か単体か）と時刻表（windup・hitAt・impacts・total）どおりに描く
     → 命中の瞬間（impacts の時刻）に衝撃が描かれ、同じ瞬間に battle.js がダメージの数字と HP の変化を出す
   ・使う人の位置（味方は画面下、敵は敵の絵の中心）から、対象の位置（敵の絵・味方の欄の上）へ
   ・描画で失敗しても、その演出を捨てるだけ（戦闘は止まらない）。3D 版も今は同じ 2D の戦闘画面（3D の演出は Phase D）
   ========================================================= */
(function (root) {
  'use strict';
  var FX2D = { errors: 0 };
  var TAU = Math.PI * 2;
  function rgba(hex, a) { var c = String(hex || '#ffffff').replace('#', ''); if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join(''); var n = parseInt(c, 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }
  function ease(p) { return p < 0 ? 0 : p > 1 ? 1 : 1 - Math.pow(1 - p, 3); }
  function rnd(i, k) { var x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }   // 毎フレーム同じ並びになる乱数
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, TAU); if (fill) ctx.fill(); else ctx.stroke(); }
  function burst(ctx, x, y, p, col, n, R) { ctx.fillStyle = rgba(col, 1 - p); for (var i = 0; i < n; i++) { var a = i / n * TAU + rnd(i, 1); var r = R * ease(p) * (0.6 + rnd(i, 2) * 0.6); circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 3.5 * (1 - p) + 1, true); } }
  function ring(ctx, x, y, p, col, R, w) { ctx.strokeStyle = rgba(col, 1 - p); ctx.lineWidth = (w || 3) * (1 - p) + 1; circle(ctx, x, y, 6 + R * ease(p)); }
  function line(ctx, x1, y1, x2, y2, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  // 演出を始める（battle.js から）。inst = { def, tl, t0, from, to:[{x,y}], fast }
  // from / to は位置 {x,y} か、位置を引く鍵（'e:2'＝2番目の敵、'p:hero'＝味方）。鍵は描くたびに scene.posOf で今の位置に直す（敵が消えても落ちない）
  FX2D.start = function (scene, def, tl, from, to) { if (!scene) return null; scene.fx65 = scene.fx65 || []; var inst = { def: def, tl: tl, t0: scene.t, from: from, to: to && to.length ? to : [from], fired: {} }; scene.fx65.push(inst); return inst; };
  function pos(scene, k, W, H) { if (k && typeof k === 'object') return k; if (scene.posOf) { var p = scene.posOf(k, W, H); if (p) return p; } return { x: W / 2, y: H * 0.4 }; }
  function foot(scene, k, W, H, p) { if (k && typeof k === 'string' && scene.footOf) { var q = scene.footOf(k, W, H); if (q) return q; } return { x: p.x, y: p.y + 30 }; }
  FX2D.draw = function (ctx, scene) {
    if (!scene) return;
    var W = ctx.canvas.width, H = ctx.canvas.height;
    if (scene.fx65 && scene.fx65.length) scene.fx65 = scene.fx65.filter(function (inst) {
      var t = scene.t - inst.t0; var tail = Rich.tail(inst.tl); if (t > inst.tl.total + Math.max(60, tail)) return false;
      ctx.save();
      try {
        var o = { def: inst.def, tl: inst.tl, fromKey: inst.from, from: pos(scene, inst.from, W, H), to: inst.to.map(function (k) { return pos(scene, k, W, H); }), toKeys: inst.to, fired: inst.fired || (inst.fired = {}) };
        o.toFoot = inst.to.map(function (k, i) { return foot(scene, k, W, H, o.to[i]); });   // v9.3 対象の足もと（地面の衝撃波・上る光の輪）
        if (t <= inst.tl.total + 60) drawOne(ctx, o, t, W, H);   // 今までの線の演出（形）
        ctx.restore(); ctx.save();
        o.foot = foot(scene, inst.from, W, H, o.from); Rich.draw(ctx, o, t, W, H, scene);   // v9.3 光・粒・魔法陣・衝撃（上に重ねる）
      } catch (e) { FX2D.errors++; ctx.restore(); return false; }
      ctx.restore(); return true;
    });
    if (scene.fxHits && scene.fxHits.length) scene.fxHits = scene.fxHits.filter(function (h) {
      var t = scene.t - h.t0; if (t > 420) return false; ctx.save();
      try { Rich.hit(ctx, h, t, pos(scene, h.key, W, H), W, H); } catch (e) { FX2D.errors++; ctx.restore(); return false; }
      ctx.restore(); return true;
    });
  };
  // v9.3 会心・弱点の命中（battle.js の showHit から）：その瞬間に、対象の位置で光の線・輪を出す
  FX2D.hit = function (scene, key, o) { if (!scene || !key) return; scene.fxHits = scene.fxHits || []; scene.fxHits.push({ key: key, crit: !!(o && o.crit), weak: !!(o && o.weak), big: !!(o && o.big), party: /^p:/.test(key), t0: scene.t }); if (o && o.crit && Rich.level() === 'rich') scene.screenShake = Math.max(scene.screenShake || 0, 220); };

  function drawOne(ctx, inst, t, W, H) {
    var d = inst.def, tl = inst.tl, k = d.fx, c1 = d.color || '#ffffff', c2 = d.color2 || '#ffd24a';
    var hit = tl.hitAt, pre = Math.min(1, t / Math.max(1, hit)), post = t < hit ? -1 : (t - hit) / Math.max(1, tl.total - hit);
    var f = inst.from, tg = inst.to;
    // 構え：使う人の足元が光る（全部の演出で共通）
    if (t < hit) { ctx.globalAlpha = 0.6 * (1 - pre * 0.5); ring(ctx, f.x, f.y, pre, c1, 26, 2); ctx.globalAlpha = 1; }
    var each = function (fn) { for (var i = 0; i < tg.length; i++) fn(tg[i], i); };
    // 各命中の衝撃（多段は impacts ごと）
    var impact = function (fn, R) { tl.impacts.forEach(function (it, j) { var q = (t - it) / Math.max(1, (tl.total - it)); if (q >= 0 && q <= 1) each(function (p, i) { fn(p, q, j, i); }); }); };
    switch (k) {
      case 'slash': case 'slash_multi': case 'spin':
        impact(function (p, q, j) { var s = (j % 2 ? -1 : 1); ctx.strokeStyle = rgba(c1, 1 - q); ctx.lineWidth = 6 * (1 - q) + 1; ctx.beginPath(); ctx.arc(p.x - s * 10, p.y + 10, 46, -Math.PI * 0.85 + s * 0.2, -Math.PI * 0.85 + s * 0.2 + Math.PI * 0.7 * ease(q * 2)); ctx.stroke(); ctx.strokeStyle = rgba(c2, (1 - q) * 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x - s * 10, p.y + 10, 40, -Math.PI * 0.8, -Math.PI * 0.8 + Math.PI * 0.6 * ease(q * 2)); ctx.stroke(); burst(ctx, p.x, p.y, q, c2, 6, 30); if (d.overlay) overlay(ctx, d.overlay, p, q); });
        if (k === 'spin' && t < hit) { ctx.strokeStyle = rgba(c1, 0.6); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2, H * 0.4, W * 0.42, Math.PI, Math.PI + Math.PI * pre); ctx.stroke(); }
        break;
      case 'pierce':
        impact(function (p, q) { var L = 70 * ease(q * 2); line(ctx, p.x - 60 + L * 0.2, p.y + 30, p.x + L * 0.6, p.y - 20, rgba(c1, 1 - q), 4); ring(ctx, p.x, p.y, q, c2, 34, 3); ring(ctx, p.x, p.y, Math.min(1, q * 1.4), c1, 20, 2); }); break;
      case 'heavy': case 'shield_hit': case 'resistance_break':
        if (t < hit) each(function (p) { ctx.fillStyle = rgba(c1, 0.25 + 0.4 * pre); circle(ctx, p.x, p.y - 70 + 60 * ease(pre), 8 + 4 * pre, true); });
        impact(function (p, q) { ring(ctx, p.x, p.y + 20, q, c1, 60, 5); ring(ctx, p.x, p.y + 20, Math.min(1, q * 1.5), c2, 36, 3); for (var i = 0; i < 7; i++) { var a = -Math.PI * (0.15 + 0.7 * rnd(i, 3)); ctx.fillStyle = rgba('#c9b08a', 1 - q); ctx.fillRect(p.x + Math.cos(a) * 40 * q, p.y + 20 + Math.sin(a) * 50 * q + 60 * q * q, 4, 4); }
          if (k === 'resistance_break') { ctx.strokeStyle = rgba(c1, 1 - q); ctx.lineWidth = 3; ctx.setLineDash && ctx.setLineDash([8, 6]); line(ctx, p.x - 70, p.y - 10, p.x - 10 - 20 * q, p.y - 10 + 20 * q, rgba(c1, 1 - q), 3); line(ctx, p.x + 10 + 20 * q, p.y - 10 - 18 * q, p.x + 70, p.y - 10, rgba(c1, 1 - q), 3); ctx.setLineDash && ctx.setLineDash([]); } }); break;
      case 'fist': case 'claws':
        impact(function (p, q, j) { var ox = ((j * 37) % 40) - 20, oy = ((j * 23) % 30) - 15; if (k === 'claws') { for (var s = -1; s <= 1; s++) line(ctx, p.x + ox - 20 + s * 8, p.y + oy - 22, p.x + ox + 14 + s * 8, p.y + oy + 22 * ease(q * 3), rgba(c1, 1 - q), 3); } else { ctx.fillStyle = rgba(c2, 1 - q); circle(ctx, p.x + ox, p.y + oy, 14 * ease(q * 3) + 2, true); } burst(ctx, p.x + ox, p.y + oy, q, c1, 5, 22); }); break;
      case 'arrow': case 'gear_shot': case 'throw': case 'coins': case 'fireball': case 'dark_orb': case 'icicle': case 'fire_lance': case 'wind_blade':
        if (t < hit) each(function (p, i) { var q = ease(Math.max(0, (t - tl.windup * 0.5) / Math.max(1, hit - tl.windup * 0.5))); var x = f.x + (p.x - f.x) * q, y = f.y + (p.y - f.y) * q - Math.sin(q * Math.PI) * (k === 'arrow' || k === 'coins' ? 40 : 10); projectile(ctx, k, x, y, Math.atan2(p.y - f.y, p.x - f.x), c1, c2, t); if (d.band) { ctx.fillStyle = rgba(c1, 0.15); ctx.fillRect(p.x - 50, p.y - 30, 100, 60); } });
        impact(function (p, q) { if (k === 'coins') { for (var i = 0; i < 6; i++) { ctx.fillStyle = rgba('#ffd24a', 1 - q); circle(ctx, p.x + Math.cos(i) * 30 * q, p.y - 30 * q + 60 * q * q * rnd(i, 4), 4, true); } } else burst(ctx, p.x, p.y, q, k === 'fireball' || k === 'fire_lance' ? '#ff8a2a' : k === 'dark_orb' ? '#8a4ad0' : k === 'icicle' ? '#c8f0ff' : c1, 10, 44); ring(ctx, p.x, p.y, q, c2, 40, 3); }); break;
      case 'arrow_rain': case 'stardust': case 'meteor': case 'icicle_rain':
        each(function (p, i) { var n = k === 'meteor' ? 1 : 6; for (var m = 0; m < n; m++) { var t0 = (m / n) * hit * 0.6; var q = (t - t0) / Math.max(1, hit - t0); if (q < 0 || q > 1) continue; var x = p.x + (rnd(m, i) - 0.5) * 80 + (1 - q) * (k === 'meteor' ? 140 : 30), y = p.y - 220 * (1 - ease(q)); if (k === 'meteor') { ctx.fillStyle = rgba(c1, 0.9); circle(ctx, x, y, 16, true); line(ctx, x, y, x + 60, y - 60, rgba(c2, 0.6), 8); } else if (k === 'arrow_rain') line(ctx, x, y - 16, x - 4, y, rgba(c1, 0.95), 2); else if (k === 'icicle_rain') { ctx.fillStyle = rgba('#c8f0ff', 0.95); ctx.beginPath(); ctx.moveTo(x - 4, y - 18); ctx.lineTo(x + 4, y - 18); ctx.lineTo(x, y); ctx.fill(); } else { ctx.fillStyle = rgba(c1, 0.95); star(ctx, x, y, 5); } } });
        impact(function (p, q) { if (k === 'meteor') { ring(ctx, p.x, p.y + 10, q, c1, 90, 8); burst(ctx, p.x, p.y, q, c2, 16, 80); ctx.fillStyle = rgba('#ffffff', 0.5 * (1 - q)); ctx.fillRect(0, 0, W, H); } else burst(ctx, p.x, p.y, q, c1, 8, 34); }); break;
      case 'explosion': case 'pale_flame':
        impact(function (p, q) { var g = ctx.createRadialGradient ? ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 70) : null; if (g) { g.addColorStop(0, rgba(c2, 1 - q)); g.addColorStop(0.5, rgba(c1, 0.8 * (1 - q))); g.addColorStop(1, rgba(c1, 0)); ctx.fillStyle = g; } else ctx.fillStyle = rgba(c1, 1 - q); circle(ctx, p.x, p.y, 20 + 60 * ease(q), true); for (var i = 0; i < 8; i++) { ctx.fillStyle = rgba(c2, 1 - q); circle(ctx, p.x + Math.sin(i * 1.7) * 40 * q, p.y - 70 * q * rnd(i, 5), 5 * (1 - q) + 1, true); } }); break;
      case 'blizzard': case 'tornado': case 'whirlpool': case 'discharge': case 'dark_mist': case 'sleep_mist': case 'poison_mist':
        each(function (p, i) { var q = Math.min(1, t / Math.max(1, tl.total)); var a0 = t / 120; for (var m = 0; m < 14; m++) { var a = a0 + m / 14 * TAU; var r = 14 + (m % 5) * 9 + (k === 'tornado' ? 10 * Math.sin(t / 90 + m) : 0); var x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * (k === 'whirlpool' ? 0.35 : 0.7) - (k === 'tornado' ? (m % 7) * 8 : 0); ctx.fillStyle = rgba(k === 'blizzard' ? '#e0f4ff' : k === 'discharge' ? '#ffe24a' : k === 'poison_mist' ? '#8a5ad0' : k === 'sleep_mist' ? '#c8b8ff' : c1, (1 - q) * 0.9); circle(ctx, x, y, k === 'dark_mist' || k === 'poison_mist' ? 7 : 3, true); }
          if (k === 'discharge' && t >= hit) { var q2 = (t - hit) / Math.max(1, tl.total - hit); for (var z = 0; z < 3; z++) zig(ctx, p.x + (z - 1) * 18, p.y - 60, p.x + (z - 1) * 10, p.y + 20, rgba('#ffffff', 1 - q2), 2, z); }
          if (k === 'sleep_mist' && t >= hit) { ctx.fillStyle = rgba('#ffffff', 1 - post); ctx.font = 'bold 16px sans-serif'; ctx.fillText('Z', p.x + 20, p.y - 30 - 20 * post); ctx.fillText('z', p.x + 32, p.y - 46 - 20 * post); } });
        impact(function (p, q) { ring(ctx, p.x, p.y, q, c1, 46, 3); }); break;
      case 'bolt': case 'void_bolt': case 'holy_beam':
        if (t < hit) each(function (p) { ctx.fillStyle = rgba(c1, 0.2 * pre); ctx.fillRect(p.x - 6, 0, 12, p.y); });
        impact(function (p, q) { if (k === 'holy_beam') { ctx.fillStyle = rgba(c1, 0.85 * (1 - q)); ctx.fillRect(p.x - 14 * (1 - q) - 2, 0, 28 * (1 - q) + 4, p.y + 30); burst(ctx, p.x, p.y, q, c2, 10, 40); } else { zig(ctx, p.x + 6, 0, p.x, p.y + 10, rgba(k === 'void_bolt' ? '#c8a0ff' : '#ffe24a', 1 - q), 5, 1); zig(ctx, p.x - 4, 0, p.x, p.y + 10, rgba('#ffffff', 1 - q), 2, 2); ring(ctx, p.x, p.y + 10, q, c1, 40, 4); } }); break;
      case 'holy_burst': case 'aurora':
        each(function (p, i) { var q = Math.min(1, t / Math.max(1, tl.total)); if (k === 'aurora') { for (var b = 0; b < 4; b++) { ctx.fillStyle = rgba(b % 2 ? c1 : c2, 0.25 * (1 - q)); ctx.beginPath(); ctx.moveTo(p.x - 60, 20 + b * 12); for (var x = -60; x <= 60; x += 10) ctx.lineTo(p.x + x, 20 + b * 12 + Math.sin(x / 20 + t / 200 + b) * 12); ctx.lineTo(p.x + 60, p.y); ctx.lineTo(p.x - 60, p.y); ctx.fill(); } } });
        impact(function (p, q) { ring(ctx, p.x, p.y, q, c1, 70, 6); burst(ctx, p.x, p.y, q, c2, 12, 60); for (var r = 0; r < 8; r++) { var a = r / 8 * TAU + q; line(ctx, p.x, p.y, p.x + Math.cos(a) * 70 * q, p.y + Math.sin(a) * 70 * q, rgba(c1, 1 - q), 2); } }); break;
      case 'clock': case 'time_stop': case 'rewind':
        each(function (p, i) { var q = Math.min(1, t / Math.max(1, tl.total)); var R = 34; ctx.strokeStyle = rgba(c1, 0.9 * (1 - q * 0.6)); ctx.lineWidth = 3; circle(ctx, p.x, p.y, R); for (var h = 0; h < 12; h++) { var a = h / 12 * TAU; line(ctx, p.x + Math.cos(a) * (R - 4), p.y + Math.sin(a) * (R - 4), p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, rgba(c1, 0.9), 2); }
          var sp = k === 'time_stop' ? (t < hit ? t / 60 : hit / 60) : k === 'rewind' ? -t / 50 : t / 70; line(ctx, p.x, p.y, p.x + Math.cos(sp) * R * 0.8, p.y + Math.sin(sp) * R * 0.8, rgba(c2, 1), 3); line(ctx, p.x, p.y, p.x + Math.cos(sp / 12) * R * 0.5, p.y + Math.sin(sp / 12) * R * 0.5, rgba(c2, 1), 4);
          if (k === 'time_stop' && t >= hit) { ctx.fillStyle = rgba('#9fb0c8', 0.35 * (1 - post)); ctx.fillRect(0, 0, W, H); } });
        impact(function (p, q) { ring(ctx, p.x, p.y, q, c2, 50, 4); }); break;
      case 'heal_glow': case 'heal_rain': case 'mana': case 'regen': case 'purify': case 'revive_pillar':
        each(function (p, i) { var q = Math.min(1, t / Math.max(1, tl.total)); if (k === 'revive_pillar') { ctx.fillStyle = rgba(c1, 0.55 * Math.sin(q * Math.PI)); ctx.fillRect(p.x - 18, 0, 36, p.y + 30); ctx.fillStyle = rgba('#ffffff', 0.6 * Math.sin(q * Math.PI)); ctx.fillRect(p.x - 6, 0, 12, p.y + 30); }
          if (k === 'heal_rain') { for (var m = 0; m < 10; m++) { var y = ((t / 3 + m * 37) % 160) - 40; ctx.fillStyle = rgba(c1, 0.8 * (1 - q)); circle(ctx, p.x + (rnd(m, i) - 0.5) * 70, p.y - 80 + y, 3, true); } }
          for (var m2 = 0; m2 < 10; m2++) { var y2 = p.y + 20 - ((t / 6 + m2 * 19) % 90); ctx.fillStyle = rgba(m2 % 2 ? c1 : c2, 0.85 * (1 - q)); circle(ctx, p.x + Math.sin(m2 * 2.1 + t / 200) * 28, y2, k === 'purify' ? 2 : 3, true); }
          if (k === 'purify') { ctx.strokeStyle = rgba(c1, 0.8 * (1 - q)); ctx.lineWidth = 2; circle(ctx, p.x, p.y + 18, 30 + 8 * Math.sin(t / 120)); } });
        impact(function (p, q) { ring(ctx, p.x, p.y, q, c2, 36, 3); }); break;
      case 'barrier': case 'risk_shield': case 'cover': case 'counter_stance':
        each(function (p, i) { var q = Math.min(1, t / Math.max(1, tl.total)); var R = 38 * ease(Math.min(1, t / Math.max(1, hit))); ctx.strokeStyle = rgba(c1, 0.9 * (1 - q * 0.7)); ctx.lineWidth = 3; ctx.beginPath(); for (var h = 0; h <= 6; h++) { var a = h / 6 * TAU + Math.PI / 6; var x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R; if (h) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.fillStyle = rgba(c1, 0.15 * (1 - q)); ctx.fill();
          if (k === 'risk_shield') { ctx.fillStyle = rgba(c2, 0.9 * (1 - q)); ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('−1%', p.x, p.y + 5); } });
        impact(function (p, q) { ring(ctx, p.x, p.y, q, c2, 30, 2); }); break;
      case 'weapon_glow': case 'haste': case 'aura': case 'steal': case 'smoke':
        each(function (p, i) { var q = Math.min(1, t / Math.max(1, tl.total)); if (k === 'haste') { for (var m = 0; m < 6; m++) line(ctx, p.x - 40 + m * 4, p.y - 20 + m * 8, p.x - 10 + m * 4 + 30 * Math.sin(q * Math.PI), p.y - 20 + m * 8, rgba(c1, 0.8 * (1 - q)), 2); }
          else if (k === 'smoke') { for (var m3 = 0; m3 < 8; m3++) { ctx.fillStyle = rgba('#c8c8c8', 0.7 * (1 - q)); circle(ctx, p.x + Math.cos(m3) * 30 * q, p.y + Math.sin(m3) * 20 * q, 14 * q + 6, true); } }
          else if (k === 'weapon_glow') { ctx.strokeStyle = rgba(c1, 0.9 * Math.sin(q * Math.PI)); ctx.lineWidth = 5; line(ctx, p.x - 14, p.y + 22, p.x + 18, p.y - 26, rgba(c1, 0.9 * Math.sin(q * Math.PI)), 5); burst(ctx, p.x + 18, p.y - 26, q, c2, 6, 18); }
          else { for (var r = 0; r < 3; r++) ring(ctx, p.x, p.y, Math.min(1, (q + r * 0.2) % 1), c1, 40, 2); } });
        impact(function (p, q) { if (k === 'steal') { ctx.fillStyle = rgba('#ffd24a', 1 - q); circle(ctx, p.x + 30 * q, p.y - 30 * q, 5, true); } }); break;
      case 'debuff_aura': case 'confuse_stars': case 'seal': case 'scan': case 'chart_eye': case 'ledger':
        each(function (p, i) { var q = Math.min(1, t / Math.max(1, tl.total));
          if (k === 'debuff_aura') { for (var m = 0; m < 8; m++) { ctx.fillStyle = rgba(c1, 0.6 * (1 - q)); circle(ctx, p.x + Math.cos(m + t / 300) * 30, p.y + 20 - ((t / 8 + m * 13) % 60), 5, true); } line(ctx, p.x, p.y - 34, p.x, p.y - 14, rgba(c2 === '#2a0a3a' ? '#ff6a8a' : c2, 1 - q), 3); }
          else if (k === 'confuse_stars') { for (var s = 0; s < 4; s++) { var a = t / 200 + s / 4 * TAU; ctx.fillStyle = rgba('#ffe24a', 1 - q); star(ctx, p.x + Math.cos(a) * 26, p.y - 34 + Math.sin(a) * 8, 4); } }
          else if (k === 'seal') { ctx.strokeStyle = rgba(c1, 0.9 * (1 - q)); ctx.lineWidth = 2; circle(ctx, p.x, p.y, 30); line(ctx, p.x - 21, p.y - 21, p.x + 21, p.y + 21, rgba(c1, 0.9 * (1 - q)), 3); }
          else if (k === 'scan' || k === 'chart_eye') { var sy = p.y - 40 + ((t / 4) % 80); line(ctx, p.x - 50, sy, p.x + 50, sy, rgba(c1, 0.8 * (1 - q)), 2); ctx.strokeStyle = rgba(c1, 0.7 * (1 - q)); ctx.lineWidth = 1; ctx.strokeRect(p.x - 50, p.y - 40, 100, 80); if (k === 'chart_eye') { ctx.strokeStyle = rgba(c2, 0.9 * (1 - q)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse ? ctx.ellipse(p.x, p.y - 56, 16, 8, 0, 0, TAU) : 0; ctx.stroke(); circle(ctx, p.x, p.y - 56, 4); } }
          else { ctx.fillStyle = rgba('#f2ead8', 0.9 * (1 - q)); ctx.fillRect(p.x - 26, p.y - 46, 52, 34); ctx.fillStyle = rgba('#5a4a2a', 0.9 * (1 - q)); for (var l = 0; l < 4; l++) ctx.fillRect(p.x - 20, p.y - 40 + l * 7, 30 + (l % 2) * 8, 2); } });
        impact(function (p, q) { ring(ctx, p.x, p.y, q, c1, 34, 2); }); break;
      case 'candles': case 'ema_line': case 'wave': case 'rci': case 'macd': case 'trend_break': case 'shadow_dash':
        each(function (p, i) { var q = Math.min(1, t / Math.max(1, tl.total)); var a = 0.9 * (1 - Math.max(0, q - 0.6) / 0.4); chart(ctx, k, p, t, hit, c1, c2, a, d); });
        if (k === 'shadow_dash' && t < hit) each(function (p) { var q = ease(pre); for (var g = 0; g < 4; g++) { ctx.fillStyle = rgba(c1, 0.25 + g * 0.15); circle(ctx, f.x + (p.x - f.x) * (q - g * 0.08), f.y + (p.y - f.y) * (q - g * 0.08), 10, true); } });
        impact(function (p, q, j) { line(ctx, p.x - 40, p.y + 30, p.x + 40 * ease(q * 2), p.y - 30 * ease(q * 2), rgba(c1, 1 - q), 5); burst(ctx, p.x, p.y, q, c2, 8, 36); }); break;
      default:
        impact(function (p, q) { burst(ctx, p.x, p.y, q, c1, 8, 34); });
    }
  }
  // 属性のついた斬撃の上乗せ
  function overlay(ctx, el, p, q) {
    if (el === 'fire') { for (var i = 0; i < 6; i++) { ctx.fillStyle = rgba(i % 2 ? '#ff6a2a' : '#ffd24a', 1 - q); circle(ctx, p.x + Math.sin(i * 1.3) * 20, p.y - 40 * q - i * 4, 6 * (1 - q) + 1, true); } }
    else if (el === 'ice') { for (var j = 0; j < 6; j++) { var a = j / 6 * TAU; line(ctx, p.x, p.y, p.x + Math.cos(a) * 34 * ease(q * 2), p.y + Math.sin(a) * 34 * ease(q * 2), rgba('#c8f0ff', 1 - q), 2); } }
    else if (el === 'thunder') zig(ctx, p.x + 8, p.y - 70, p.x, p.y + 10, rgba('#ffe24a', 1 - q), 3, 3);
    else if (el === 'light') ring(ctx, p.x, p.y, q, '#fff6c8', 50, 4);
    else if (el === 'wind') { ctx.strokeStyle = rgba('#7fe3a5', 1 - q); ctx.lineWidth = 2; circle(ctx, p.x, p.y, 20 + 30 * q); }
  }
  function projectile(ctx, k, x, y, ang, c1, c2, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (k === 'arrow') { line(ctx, -18, 0, 8, 0, '#c9a06a', 2); ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(16, 0); ctx.lineTo(8, 4); ctx.fill(); line(ctx, -18, -3, -12, 0, c1, 2); }
    else if (k === 'gear_shot') { ctx.rotate(t / 60); ctx.strokeStyle = '#c0c8d8'; ctx.lineWidth = 3; circle(ctx, 0, 0, 7); for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; line(ctx, Math.cos(a) * 7, Math.sin(a) * 7, Math.cos(a) * 11, Math.sin(a) * 11, '#c0c8d8', 3); } }
    else if (k === 'coins' || k === 'throw') { ctx.fillStyle = '#ffd24a'; circle(ctx, 0, 0, 6, true); ctx.fillStyle = '#c9a24a'; circle(ctx, 0, 0, 3, true); }
    else if (k === 'icicle') { ctx.fillStyle = '#c8f0ff'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -5); ctx.lineTo(-10, 5); ctx.fill(); }
    else if (k === 'wind_blade') { ctx.strokeStyle = rgba(c1, 0.95); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 14, -1.2, 1.2); ctx.stroke(); }
    else if (k === 'fire_lance') { ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, -5); ctx.lineTo(-14, 5); ctx.fill(); ctx.fillStyle = rgba(c2, 0.8); circle(ctx, -14, 0, 6, true); }
    else { ctx.fillStyle = rgba(c1, 0.95); circle(ctx, 0, 0, 10, true); ctx.fillStyle = rgba(c2, 0.9); circle(ctx, -2, -2, 5, true); for (var tr = 1; tr < 5; tr++) { ctx.fillStyle = rgba(c1, 0.5 - tr * 0.1); circle(ctx, -tr * 8, 0, 8 - tr, true); } }
    ctx.restore();
  }
  function zig(ctx, x1, y1, x2, y2, col, w, seed) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); for (var i = 1; i <= 6; i++) { var q = i / 6; ctx.lineTo(x1 + (x2 - x1) * q + (i < 6 ? (rnd(i, seed) - 0.5) * 22 : 0), y1 + (y2 - y1) * q); } ctx.stroke(); }
  function star(ctx, x, y, r) { ctx.beginPath(); for (var i = 0; i < 10; i++) { var a = i / 10 * TAU - Math.PI / 2; var rr = i % 2 ? r * 0.45 : r; if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  // チャートの演出：ローソク足・EMA・波形・RCI・MACD・トレンドの突破
  function chart(ctx, k, p, t, hit, c1, c2, a, d) {
    var w = 120, h = 70, x0 = p.x - w / 2, y0 = p.y - h / 2 - 10; var q = Math.min(1, t / Math.max(1, hit));
    ctx.fillStyle = 'rgba(10,16,30,' + (0.45 * a).toFixed(3) + ')'; ctx.fillRect(x0 - 6, y0 - 6, w + 12, h + 12);
    if (k === 'candles' || k === 'trend_break' || k === 'shadow_dash') {
      var n = Math.max(2, Math.round(8 * q)); for (var i = 0; i < n; i++) { var up = k === 'trend_break' ? true : (i % 3 !== 2); var cx = x0 + 8 + i * 14, base = y0 + h - 10 - i * (k === 'trend_break' ? 6 : 3); var bh = 10 + (i % 3) * 4; ctx.fillStyle = rgba(up ? '#4ad08a' : '#e05a5a', a); ctx.fillRect(cx - 4, base - bh, 8, bh); line(ctx, cx, base - bh - 4, cx, base + 3, rgba(up ? '#4ad08a' : '#e05a5a', a), 1); }
      if (k === 'trend_break') { line(ctx, x0, y0 + 24, x0 + w, y0 + 24, rgba(c2, a), 2); if (t >= hit) { ctx.fillStyle = rgba('#ffffff', a); ctx.font = 'bold 12px sans-serif'; ctx.fillText('BREAK', x0 + w - 44, y0 + 18); } }
    } else if (k === 'ema_line') {
      ctx.strokeStyle = rgba(c1, a); ctx.lineWidth = 3; ctx.beginPath(); for (var x = 0; x <= w * q; x += 4) { var y = y0 + h * 0.7 - (x / w) * h * 0.4 - Math.sin(x / 14) * 4; if (x) ctx.lineTo(x0 + x, y); else ctx.moveTo(x0 + x, y); } ctx.stroke();
      ctx.strokeStyle = rgba(c2, a); ctx.lineWidth = 2; ctx.beginPath(); for (var x2 = 0; x2 <= w * q; x2 += 4) { var y2 = y0 + h * 0.6 - (x2 / w) * h * 0.25; if (x2) ctx.lineTo(x0 + x2, y2); else ctx.moveTo(x0 + x2, y2); } ctx.stroke();
    } else if (k === 'wave') {
      ctx.strokeStyle = rgba(c1, a); ctx.lineWidth = d.big ? 4 : 3; ctx.beginPath(); for (var x3 = 0; x3 <= w * q; x3 += 3) { var y3 = y0 + h / 2 - Math.sin(x3 / 12 + t / 160) * h * 0.35 * (0.5 + x3 / w); if (x3) ctx.lineTo(x0 + x3, y3); else ctx.moveTo(x0 + x3, y3); } ctx.stroke();
    } else if (k === 'rci') {
      line(ctx, x0, y0 + 10, x0 + w, y0 + 10, rgba('#e05a5a', a * 0.6), 1); line(ctx, x0, y0 + h - 10, x0 + w, y0 + h - 10, rgba('#4ad08a', a * 0.6), 1);
      ctx.strokeStyle = rgba(c1, a); ctx.lineWidth = 3; ctx.beginPath(); for (var x4 = 0; x4 <= w * q; x4 += 4) { var y4 = y0 + h - 10 - (h - 20) * (0.5 + 0.5 * Math.sin(x4 / 18 - 1.6)); if (x4) ctx.lineTo(x0 + x4, y4); else ctx.moveTo(x0 + x4, y4); } ctx.stroke();
    } else if (k === 'macd') {
      for (var i5 = 0; i5 < 10 * q; i5++) { var hv = Math.sin(i5 / 3 - 1) * 14; ctx.fillStyle = rgba(hv > 0 ? '#4ad08a' : '#e05a5a', a * 0.7); ctx.fillRect(x0 + 6 + i5 * 11, y0 + h / 2 - Math.max(0, hv), 7, Math.abs(hv)); }
      ctx.strokeStyle = rgba(c1, a); ctx.lineWidth = 2; ctx.beginPath(); for (var x6 = 0; x6 <= w * q; x6 += 4) { var y6 = y0 + h / 2 - Math.sin(x6 / 20 - 1) * 20; if (x6) ctx.lineTo(x0 + x6, y6); else ctx.moveTo(x0 + x6, y6); } ctx.stroke();
      ctx.strokeStyle = rgba(c2, a); ctx.beginPath(); for (var x7 = 0; x7 <= w * q; x7 += 4) { var y7 = y0 + h / 2 - Math.sin(x7 / 20 - 1.6) * 18; if (x7) ctx.lineTo(x0 + x7, y7); else ctx.moveTo(x0 + x7, y7); } ctx.stroke();
    }
  }
  /* =========================================================
     v9.3 演出の上乗せ（Rich）：光（加算の合成）・粒・魔法陣・衝撃波・画面の揺れと光
     ・上の drawOne（線の形）はそのまま、上に重ねる。時刻表（命中の瞬間）は変えない＝ダメージの数字・HP の変化と同じ瞬間
     ・構え：呪文・祈り＝使う人の足もとに回る魔法陣と光の柱、まわりから光の粒が集まる／雄たけび＝広がる輪／武器の技＝刃のきらめき
       大きな攻撃呪文（全体・大技）は、構えの間まわりを少し暗くする
     ・飛ぶもの（火の玉・矢・氷・闇の玉など）：光る玉と尾
     ・命中：白い芯と色の光・地面の衝撃波・属性ごとの粒（火の粉と煙／氷のかけら・霜の六角／枝分かれする稲妻と火花／風の渦と葉／
       光の線ときらめき／闇の吸い込みと紫の煙／回復の光と＋／守りのきらめき／強化の↑・弱体の↓／時の輪／物理の火花・刃の月形）
       重い一撃・大技・雷は画面が揺れ、大技の最初の命中で画面が一瞬その色に光る
     ・粒の動きは時刻から計算する（毎フレームの状態を持たない）。命中のあと少し（tail）だけ残して消える
     ・設定「戦闘の演出」＝控えめ（OS の「視差効果を減らす／動きを減らす」のときの自動も）：画面の揺れ・画面全体の光・暗くするのをやめ、粒を減らす
     ・粒の数は「戦闘背景の品質」にも合わせる（軽量は少なく）
     ========================================================= */
  var Rich = FX2D.Rich = {};
  Rich.level = function () {
    var d = root.State && root.State.data; var s = d && d.settings && d.settings.battleFx; if (s === 'calm' || s === 'rich') return s;
    try { if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'calm'; } catch (e) { }
    return 'rich';
  };
  function mulOf() { var q = 'normal'; try { if (root.BattleBG65 && root.BattleBG65.quality) q = root.BattleBG65.quality(); } catch (e) { } var m = q === 'high' ? 1 : q === 'low' ? 0.45 : 0.75; return Rich.level() === 'calm' ? m * 0.6 : m; }
  function lsOf(tl) { return Math.max(0.35, Math.min(1.25, ((tl && tl.total) || 700) / 720)); }   // 速さ（戦闘速度「とてもはやい」は短く）
  Rich.tail = function (tl) { return Math.round(380 * lsOf(tl)); };
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function add(ctx) { ctx.globalCompositeOperation = 'lighter'; }
  function norm(ctx) { ctx.globalCompositeOperation = 'source-over'; }

  // 演出の種類 → 属性（粒の出し方）。属性つきの斬撃（overlay）はその属性
  var FX_EL = {
    fireball: 'fire', fire_lance: 'fire', explosion: 'fire', pale_flame: 'fire', meteor: 'fire',
    icicle: 'ice', blizzard: 'ice', icicle_rain: 'ice', whirlpool: 'water', bolt: 'thunder', discharge: 'thunder', void_bolt: 'dark',
    wind_blade: 'wind', tornado: 'wind', holy_beam: 'light', holy_burst: 'light', aurora: 'light', stardust: 'light', arcane: 'arcane', purify: 'light',
    dark_orb: 'dark', dark_mist: 'dark', heal_glow: 'heal', heal_rain: 'heal', regen: 'heal', revive_pillar: 'revive', mana: 'mana',
    clock: 'time', time_stop: 'time', rewind: 'time', barrier: 'guard', risk_shield: 'guard', cover: 'guard', counter_stance: 'guard',
    weapon_glow: 'buff', haste: 'buff', aura: 'buff', debuff_aura: 'curse', seal: 'curse', confuse_stars: 'curse', sleep_mist: 'curse', poison_mist: 'curse',
    scan: 'chart', chart_eye: 'chart', ledger: 'chart', candles: 'chart', ema_line: 'chart', wave: 'chart', rci: 'chart', macd: 'chart', trend_break: 'chart',
    smoke: 'smoke', coins: 'gold'
  };
  var PAL = {
    fire: ['#fff3c0', '#ffb040', '#ff4a10'], ice: ['#ffffff', '#bff0ff', '#5ab8ff'], water: ['#ffffff', '#9fd8ff', '#2a7ad0'], thunder: ['#ffffff', '#fff27a', '#ffc21a'],
    wind: ['#ffffff', '#c8ffe4', '#4ad08a'], light: ['#ffffff', '#fff6c8', '#ffd24a'], dark: ['#f0d8ff', '#a070e0', '#5a2a9a'], arcane: ['#ffffff', '#d8c8ff', '#8a6aff'],
    heal: ['#ffffff', '#c8ffd8', '#4ad08a'], revive: ['#ffffff', '#fff6c8', '#ffd24a'], mana: ['#ffffff', '#c8e4ff', '#4a8aff'], time: ['#ffffff', '#d8eaff', '#9fb0ff'],
    guard: ['#ffffff', '#d8ecff', '#7fb8ff'], buff: ['#ffffff', '#ffe0b0', '#ff9a4a'], curse: ['#f0d8ff', '#c08aff', '#6a2aa0'], chart: ['#ffffff', '#c8f0ff', '#4ad0ff'],
    gold: ['#ffffff', '#ffe08a', '#ffb02a'], smoke: ['#ffffff', '#e0e0e0', '#9a9a9a'], phys: ['#ffffff', '#fff2c0', '#ffc24a']
  };
  var SUPPORT = { heal: 1, revive: 1, mana: 1, guard: 1, buff: 1 };
  var TRAVEL = { arrow: 1, gear_shot: 1, throw: 1, coins: 1, fireball: 1, dark_orb: 1, icicle: 1, fire_lance: 1, wind_blade: 1 };
  var HEAVY = { heavy: 1, shield_hit: 1, resistance_break: 1, explosion: 1, meteor: 1, pale_flame: 1, trend_break: 1 };
  var SLASH = { slash: 1, slash_multi: 1, spin: 1 };
  function elOf(d) { if (d.overlay) return d.overlay; return FX_EL[d.fx] || 'phys'; }
  Rich.elementOf = elOf;

  // 光の玉（白い芯 → 色 → 透明）。色ごとに 1 回だけ作って使い回す。作れない環境では小さな丸
  var SPR = {};
  function sprite(col) {
    if (SPR[col] !== undefined) return SPR[col]; var c = null;
    try { if (root.document && root.document.createElement) { c = root.document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext && c.getContext('2d'); if (!x || !x.createRadialGradient) c = null; else { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, rgba(col, 0.95)); g.addColorStop(0.55, rgba(col, 0.32)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, 64, 64); } } } catch (e) { c = null; }
    SPR[col] = c; return c;
  }
  function glow(ctx, col, x, y, r, a) { if (!(a > 0.01) || !(r > 0.5)) return; var s = sprite(col); var ga = ctx.globalAlpha; ctx.globalAlpha = Math.min(1, a); if (s) ctx.drawImage(s, x - r, y - r, r * 2, r * 2); else { ctx.fillStyle = rgba(col, 1); circle(ctx, x, y, r * 0.35, true); } ctx.globalAlpha = ga; }
  function streak(ctx, x, y, vx, vy, len, col, w, a) { if (!(a > 0.01)) return; var m = Math.sqrt(vx * vx + vy * vy) || 1; ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx / m * len, y - vy / m * len); ctx.stroke(); }
  function shard(ctx, x, y, s, ang, col, a) { if (!(a > 0.01)) return; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.lineTo(s * 0.6, 0); ctx.lineTo(0, s * 1.6); ctx.lineTo(-s * 0.6, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
  function sparkle(ctx, x, y, r, col, a) { if (!(a > 0.01) || !(r > 0.3)) return; ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); }
  function chevron(ctx, x, y, s, up, col, a, w) { if (!(a > 0.01)) return; var d = up ? 1 : -1; ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w || 3; ctx.beginPath(); ctx.moveTo(x - s, y + d * s * 0.5); ctx.lineTo(x, y - d * s * 0.5); ctx.lineTo(x + s, y + d * s * 0.5); ctx.stroke(); }
  function plus(ctx, x, y, s, col, a) { if (!(a > 0.01)) return; ctx.fillStyle = rgba(col, a); ctx.fillRect(x - s, y - s * 0.3, s * 2, s * 0.6); ctx.fillRect(x - s * 0.3, y - s, s * 0.6, s * 2); }
  function ellipse(ctx, x, y, rx, ry, a0, a1) { ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, a0 || 0, a1 === undefined ? TAU : a1); else ctx.arc(x, y, Math.max(0.5, rx), a0 || 0, a1 === undefined ? TAU : a1); }
  // 月形の刃の跡：a0 → a1 の弧。真ん中が太く、両端が細い
  function crescent(ctx, cx, cy, R, a0, a1, wMax, col, a) {
    if (!(a > 0.01)) return; var n = 18, i, q, an; ctx.fillStyle = rgba(col, a); ctx.beginPath();
    for (i = 0; i <= n; i++) { q = i / n; an = a0 + (a1 - a0) * q; var r = R + Math.sin(q * Math.PI) * wMax; if (i) ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); else ctx.moveTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); }
    for (i = n; i >= 0; i--) { q = i / n; an = a0 + (a1 - a0) * q; ctx.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); }
    ctx.closePath(); ctx.fill();
  }
  // 枝分かれする稲妻（太い光＋白い芯＋細い枝）。seed が同じ間は同じ形（45ms ごとに変えて、ちらつかせる）
  function lightning(ctx, x1, y1, x2, y2, seed, col, w, a) {
    if (!(a > 0.01)) return; var pts = [[x1, y1]], n = 9, i;
    for (i = 1; i < n; i++) { var q = i / n; pts.push([x1 + (x2 - x1) * q + (rnd(i, seed) - 0.5) * 34, y1 + (y2 - y1) * q + (rnd(i, seed + 3) - 0.5) * 10]); } pts.push([x2, y2]);
    add(ctx);
    [[w * 3.4, 0.28, col], [w, 1, '#ffffff']].forEach(function (L) { ctx.strokeStyle = rgba(L[2], a * L[1]); ctx.lineWidth = L[0]; ctx.beginPath(); pts.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); });
    ctx.strokeStyle = rgba(col, a * 0.8); ctx.lineWidth = Math.max(1, w * 0.5);
    for (var b = 2; b < n - 1; b += 3) { var p0 = pts[b], bx = p0[0], by = p0[1], dir = rnd(b, seed + 9) > 0.5 ? 1 : -1; ctx.beginPath(); ctx.moveTo(bx, by); for (var k = 1; k <= 3; k++) { bx += dir * (6 + rnd(b * 7 + k, seed) * 14); by += 10 + rnd(k, seed + b) * 6; ctx.lineTo(bx, by); } ctx.stroke(); }
    glow(ctx, col, x2, y2, 30, a * 0.8);
  }
  // 魔法陣（足もとに平たく）：外の輪・内の輪・回る印・星（呪文）か花（祈り）
  function magicCircle(ctx, x, y, R, rot, col, col2, a, kind) {
    if (!(a > 0.01)) return; var i;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.42); add(ctx); ctx.globalAlpha = Math.min(1, a);
    ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = 2.4; circle(ctx, 0, 0, R);
    ctx.strokeStyle = rgba(col2, 0.8); ctx.lineWidth = 1.2; circle(ctx, 0, 0, R * 0.82); circle(ctx, 0, 0, R * 0.4);
    ctx.save(); ctx.rotate(rot); ctx.fillStyle = rgba(col2, 0.95);
    for (i = 0; i < 16; i++) { var an = i / 16 * TAU; ctx.save(); ctx.translate(Math.cos(an) * R * 0.91, Math.sin(an) * R * 0.91); ctx.rotate(an + Math.PI / 2); var s = i % 4 === 0 ? 3.2 : 2; ctx.fillRect(-s / 2, -s, s, s * 2); if (i % 2) ctx.fillRect(-s, -0.5, s * 2, 1); ctx.restore(); }
    ctx.restore();
    ctx.save(); ctx.rotate(-rot * 1.4); ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 1.6; ctx.beginPath();
    if (kind === 'pray') { for (i = 0; i < 8; i++) { var a0 = i / 8 * TAU; ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a0 + 0.35) * R * 0.62, Math.sin(a0 + 0.35) * R * 0.62, Math.cos(a0) * R * 0.8, Math.sin(a0) * R * 0.8); } }
    else { for (i = 0; i <= 5; i++) { var a1 = (i * 2) / 5 * TAU - Math.PI / 2, px = Math.cos(a1) * R * 0.8, py = Math.sin(a1) * R * 0.8; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } }
    ctx.stroke(); ctx.restore(); ctx.restore();
    add(ctx); glow(ctx, col, x, y, R * 0.9, a * 0.5); norm(ctx);
  }
  function column(ctx, x, y, w, h, col, a) { if (!(a > 0.01) || !(h > 1) || !ctx.createLinearGradient) return; var g = ctx.createLinearGradient(0, y - h, 0, y); if (!g || !g.addColorStop) return; g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, a)); add(ctx); ctx.fillStyle = g; ctx.fillRect(x - w / 2, y - h, w, h); norm(ctx); }

  Rich.draw = function (ctx, o, t, W, H, scene) {
    var d = o.def, tl = o.tl, hit = tl.hitAt, ls = lsOf(tl), lvl = Rich.level(), mul = mulOf();
    var el = elOf(d), P = PAL[el] || PAL.phys, c1 = P[1], c2 = d.color && d.color !== '#ffffff' ? d.color : P[2];
    var f = o.from, ft = o.foot || { x: f.x, y: f.y + 30 }, tg = o.to; var enemyCaster = /^e:/.test(o.fromKey || '');
    var support = !!SUPPORT[el], spell = d.motion === 'cast' || d.motion === 'pray', big = !!d.big || d.area === 'all';
    // 1) 構え（命中まで。命中のあと少しで消える）
    var cEnd = hit + 160 * ls;
    if (t < cEnd) {
      var pre = clamp01(t / Math.max(1, hit)), fade = t < hit ? 1 : 1 - (t - hit) / (160 * ls);
      if (lvl === 'rich' && spell && big && !support) { ctx.fillStyle = 'rgba(0,0,12,' + (0.24 * Math.min(1, pre * 2) * fade).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      if (spell) {
        var R = (enemyCaster ? 48 : 36) * (d.big ? 1.25 : 1) * (0.6 + 0.4 * ease(pre * 1.6));
        column(ctx, ft.x, ft.y, R * 1.3, 120 * pre, c2, 0.24 * fade);
        magicCircle(ctx, ft.x, ft.y, R, t / 520, c2, c1, Math.min(1, pre * 3) * fade * 0.9, d.motion);
        add(ctx); var nm = Math.round(12 * mul);
        for (var i = 0; i < nm; i++) { var dl = rnd(i, 11) * 0.45, q = clamp01((pre - dl) / (1 - dl)); if (q <= 0 || q >= 1) continue; var an = rnd(i, 12) * TAU + q * 1.5, rr = (60 + rnd(i, 13) * 50) * (1 - ease(q)); glow(ctx, i % 3 ? c2 : c1, ft.x + Math.cos(an) * rr, ft.y - 18 + Math.sin(an) * rr * 0.55 - 20 * q, 7 * (1 - q * 0.4), 0.9 * Math.sin(q * Math.PI) * fade); }
        norm(ctx);
      } else if (d.motion === 'shout') {
        add(ctx); for (var s = 0; s < 3; s++) { var qs = clamp01(pre * 1.4 - s * 0.25); if (qs <= 0 || qs >= 1) continue; ctx.strokeStyle = rgba(c2, (1 - qs) * 0.8 * fade); ctx.lineWidth = 4 * (1 - qs) + 1; ellipse(ctx, f.x, f.y, 20 + 90 * qs, (20 + 90 * qs) * 0.6); ctx.stroke(); } norm(ctx);
      } else if (pre > 0.3 && t < hit) {
        var gq = clamp01((pre - 0.3) / 0.7), gs = Math.sin(gq * Math.PI); add(ctx); glow(ctx, c1, f.x + 10, f.y - 18, 16 * gs + 2, 0.85 * gs); sparkle(ctx, f.x + 10, f.y - 18, 14 * gs, '#ffffff', 0.9 * gs); norm(ctx);   // 刃のきらめき
      }
    }
    // 2) 飛ぶもの：光る玉と尾
    if (TRAVEL[d.fx] && t < hit) {
      var st0 = tl.windup * 0.5, q0 = ease(clamp01((t - st0) / Math.max(1, hit - st0))), arc = d.fx === 'arrow' || d.fx === 'coins' ? 40 : 10;
      if (t >= st0) tg.forEach(function (p, ti) {
        add(ctx);
        for (var k = 7; k >= 0; k--) { var qk = Math.max(0, q0 - k * 0.035); glow(ctx, k ? c2 : c1, f.x + (p.x - f.x) * qk, f.y + (p.y - f.y) * qk - Math.sin(qk * Math.PI) * arc, (k ? 12 - k : 18) * (el === 'phys' || el === 'gold' ? 0.55 : 1), k ? 0.5 - k * 0.06 : 0.95); }
        if (el === 'fire' || el === 'ice' || el === 'dark' || el === 'wind') for (var m = 0; m < 5; m++) { var qm = Math.max(0, q0 - 0.06 - m * 0.05); glow(ctx, c2, f.x + (p.x - f.x) * qm + (rnd(m, ti + 21) - 0.5) * 14, f.y + (p.y - f.y) * qm - Math.sin(qm * Math.PI) * arc + (el === 'fire' ? -m * 3 : m * 2), 4, 0.6 - m * 0.1); }
        norm(ctx);
      });
    }
    // 3) 命中（多段は 1 回ずつ）
    var tail = Rich.tail(tl);
    tl.impacts.forEach(function (it, j) {
      var dt = t - it; if (dt < 0) return;
      if (!o.fired[j]) { o.fired[j] = true; onImpact(scene, d, el, lvl, big, support, spell); }
      var life = Math.max(120, (tl.total - it) + tail); if (dt > life) return;
      tg.forEach(function (p, i) { impactAt(ctx, d, el, p, (o.toFoot && o.toFoot[i]) || { x: p.x, y: p.y + 30 }, dt, life, j, i, c1, c2, ls, mul, support); });
      if (j === 0 && lvl === 'rich' && (HEAVY[d.fx] || (big && spell)) && d.fx !== 'meteor' && !support && dt < 200 * ls) { add(ctx); ctx.fillStyle = rgba(c2, 0.16 * (1 - dt / (200 * ls))); ctx.fillRect(0, 0, W, H); norm(ctx); }   // 大技：画面が一瞬その色に
    });
  };
  // 命中の瞬間に 1 回：画面の揺れ（重い一撃・大きな呪文・雷だけ。控えめでは揺らさない）
  function onImpact(scene, d, el, lvl, big, support, spell) {
    if (!scene || lvl !== 'rich' || support) return;
    var s = d.fx === 'meteor' ? 320 : HEAVY[d.fx] ? 240 : (big && spell) ? 190 : el === 'thunder' ? 150 : 0; if (!s) return;
    if (d.enemy) s = Math.round(s * 0.8); scene.screenShake = Math.max(scene.screenShake || 0, s);
  }
  function impactAt(ctx, d, el, p, pf, dt, life, j, i, c1, c2, ls, mul, support) {
    var q = dt / life, seed = j * 17 + i * 5 + 1, fl = 150 * ls, n = Math.round((d.big ? 22 : 14) * mul), k, x, y, tt = dt / 1000;
    add(ctx);
    if (!support && dt < fl) { var fq = dt / fl; glow(ctx, c2, p.x, p.y, (46 + (d.big ? 30 : 0)) * (0.7 + 0.6 * fq), 0.9 * (1 - fq)); glow(ctx, '#ffffff', p.x, p.y, 22 * (1 - fq * 0.5), 1 - fq); }   // 白い芯と色の光
    if (!support && q < 0.8) { var wq = q / 0.8, wr = (12 + 70 * ease(wq)) * (d.big ? 1.3 : 1); ctx.strokeStyle = rgba(c1, (1 - wq) * 0.9); ctx.lineWidth = 5 * (1 - wq) + 0.5; ellipse(ctx, pf.x, pf.y, wr, wr * 0.32); ctx.stroke(); }   // 地面の衝撃波（足もと）
    if (SLASH[d.fx] && dt < life * 0.7) {   // 刃の跡（月形。多段は向きを交互に）
      var sq = dt / (life * 0.7), sd = j % 2 ? -1 : 1, a0 = -Math.PI * 0.85, sw = Math.PI * 0.8 * ease(Math.min(1, sq * 2.2)), R0 = 44 * (d.big ? 1.2 : 1);
      ctx.save(); if (sd < 0) { ctx.translate(p.x * 2, 0); ctx.scale(-1, 1); }
      crescent(ctx, p.x - 10, p.y + 10, R0, a0, a0 + sw, 12, c2, 0.75 * (1 - sq)); crescent(ctx, p.x - 10, p.y + 10, R0 + 2, a0 + sw * 0.15, a0 + sw, 5, '#ffffff', 0.9 * (1 - sq));
      ctx.restore();
    }
    switch (el) {
      case 'fire':
        norm(ctx); for (k = 0; k < Math.round(5 * mul) + 1; k++) { ctx.fillStyle = 'rgba(60,40,40,' + (0.26 * (1 - q) * Math.min(1, dt / 80)).toFixed(3) + ')'; circle(ctx, p.x + (rnd(k, seed + 5) - 0.5) * 50 * q + (k - 2) * 8, p.y - 10 - 50 * q * (0.5 + rnd(k, seed + 6)), 10 + 22 * q, true); } add(ctx);   // 煙
        for (k = 0; k < n; k++) { var lf = life * (0.5 + 0.5 * rnd(k, seed + 2)); if (dt > lf) continue; var kq = dt / lf, an = rnd(k, seed) * TAU, sp = 60 + rnd(k, seed + 1) * 160; glow(ctx, k % 3 ? '#ff8a2a' : '#ffd24a', p.x + Math.cos(an) * sp * tt * (1 - 0.4 * kq) + Math.sin(dt / 90 + k) * 4, p.y + Math.sin(an) * sp * 0.6 * tt - 280 * tt * tt, 6 * (1 - kq) + 1.5, 1 - kq); }   // 火の粉（上へ）
        break;
      case 'ice': case 'water':
        for (k = 0; k < n; k++) { var lf2 = life * (0.55 + 0.45 * rnd(k, seed + 2)); if (dt > lf2) continue; var kq2 = dt / lf2, an2 = -Math.PI * rnd(k, seed), sp2 = 120 + rnd(k, seed + 1) * 220; x = p.x + Math.cos(an2) * sp2 * tt; y = p.y + Math.sin(an2) * sp2 * tt + 520 * tt * tt;
          if (el === 'ice') { norm(ctx); shard(ctx, x, y, 3 + rnd(k, seed + 3) * 3, dt / 80 + k, k % 2 ? '#ffffff' : '#bff0ff', 1 - kq2); add(ctx); glow(ctx, '#9fe0ff', x, y, 7, 0.5 * (1 - kq2)); } else glow(ctx, k % 2 ? '#ffffff' : '#7fc8ff', x, y, 4 + 2 * (1 - kq2), 1 - kq2); }
        if (el === 'ice' && q < 0.7) { var hq = q / 0.7, rh = 14 + 46 * ease(hq); ctx.strokeStyle = rgba('#e8fbff', (1 - hq) * 0.9); ctx.lineWidth = 2; ctx.beginPath(); for (var h6 = 0; h6 <= 6; h6++) { var ah = h6 / 6 * TAU + Math.PI / 6; if (h6) ctx.lineTo(p.x + Math.cos(ah) * rh, p.y + Math.sin(ah) * rh); else ctx.moveTo(p.x + Math.cos(ah) * rh, p.y + Math.sin(ah) * rh); } ctx.stroke(); }   // 霜の六角
        break;
      case 'thunder':
        if (dt < 220 * ls) { var fk = Math.floor(dt / 45), la = 1 - dt / (220 * ls); lightning(ctx, p.x + (rnd(fk, seed) - 0.5) * 30, 0, p.x, p.y + 10, seed * 13 + fk, c2, 2.5, la); if (d.big || d.area === 'all') lightning(ctx, p.x + 40, 0, p.x + 6, p.y, seed * 29 + fk, c2, 1.6, la * 0.8); add(ctx); }
        for (k = 0; k < n; k++) { var lf3 = life * (0.3 + 0.4 * rnd(k, seed + 2)); if (dt > lf3) continue; var an3 = rnd(k, seed) * TAU, sp3 = 180 + rnd(k, seed + 1) * 260; streak(ctx, p.x + Math.cos(an3) * sp3 * tt, p.y + Math.sin(an3) * sp3 * tt + 300 * tt * tt, Math.cos(an3) * sp3, Math.sin(an3) * sp3 + 600 * tt, 8, k % 2 ? '#ffffff' : '#fff27a', 1.6, 1 - dt / lf3); }   // 火花
        break;
      case 'wind':
        for (k = 0; k < Math.round(7 * mul) + 2; k++) { var rw = 18 + k * 7 + 40 * q, a0w = rnd(k, seed) * TAU + dt / 120 * (k % 2 ? 1 : -1); ctx.strokeStyle = rgba(k % 2 ? '#ffffff' : c2, (1 - q) * 0.85); ctx.lineWidth = 2.2 * (1 - q) + 0.6; ellipse(ctx, p.x, p.y, rw, rw * 0.55, a0w, a0w + 1.6); ctx.stroke(); }   // 渦
        norm(ctx); for (k = 0; k < Math.round(6 * mul); k++) { var lan = rnd(k, seed + 4) * TAU + dt / 200; ctx.save(); ctx.translate(p.x + Math.cos(lan) * (20 + 60 * q), p.y + Math.sin(lan) * (14 + 30 * q) - 30 * q); ctx.rotate(dt / 60 + k); ctx.fillStyle = rgba(k % 2 ? '#7fe3a5' : '#c8ffe4', 1 - q); ellipse(ctx, 0, 0, 5, 2.2); ctx.fill(); ctx.restore(); } add(ctx);   // 葉
        break;
      case 'light': case 'revive': case 'arcane':
        if (!support || el === 'revive') { var rq = clamp01(dt / (life * 0.6)); if (rq < 1) for (k = 0; k < 10; k++) { var ra = k / 10 * TAU + seed, r1 = 10 + 30 * ease(rq), r2 = r1 + 30 + 40 * (1 - rq) * rnd(k, seed); ctx.strokeStyle = rgba(c1, (1 - rq) * 0.85); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ra) * r1, p.y + Math.sin(ra) * r1); ctx.lineTo(p.x + Math.cos(ra) * r2, p.y + Math.sin(ra) * r2); ctx.stroke(); } }   // 光の線
        for (k = 0; k < n; k++) { var dl3 = rnd(k, seed + 7) * 0.3, sq3 = clamp01((q - dl3) / (1 - dl3)); if (sq3 <= 0 || sq3 >= 1) continue; sparkle(ctx, p.x + (rnd(k, seed) - 0.5) * 90, p.y + 20 - (rnd(k, seed + 1) * 40 + 60 * sq3), 7 * Math.sin(sq3 * Math.PI) + 1, k % 2 ? '#ffffff' : c1, Math.sin(sq3 * Math.PI)); }   // きらめき
        break;
      case 'dark':
        var iq = clamp01(dt / (180 * ls)); if (iq < 1) { ctx.strokeStyle = rgba(c1, 0.9 * (1 - iq * 0.5)); ctx.lineWidth = 3; circle(ctx, p.x, p.y, 60 * (1 - ease(iq)) + 4); }   // 吸い込む輪
        norm(ctx); ctx.fillStyle = rgba('#1a0a2a', 0.45 * (1 - q)); circle(ctx, p.x, p.y, 16 + 24 * q, true); add(ctx);
        for (k = 0; k < n; k++) { var lf4 = life * (0.6 + 0.4 * rnd(k, seed + 2)); if (dt > lf4) continue; var kq4 = dt / lf4, an4 = rnd(k, seed) * TAU + kq4 * 1.2, sp4 = 40 + rnd(k, seed + 1) * 90; glow(ctx, k % 2 ? '#c08aff' : '#7a3ac0', p.x + Math.cos(an4) * sp4 * tt * 2, p.y + Math.sin(an4) * sp4 * tt - 40 * tt, 9 * (1 - kq4 * 0.5), 0.8 * (1 - kq4)); }   // 紫の煙
        break;
      case 'heal': case 'mana':
        column(ctx, pf.x, pf.y, 60, 130, c2, 0.3 * Math.sin(q * Math.PI)); add(ctx);   // 包む光の柱
        for (k = 0; k < 2; k++) { var uq = clamp01(q * 1.3 - k * 0.25); if (uq <= 0 || uq >= 1) continue; var ur = 36 - 10 * uq; ctx.strokeStyle = rgba(k ? '#ffffff' : c1, 0.9 * Math.sin(uq * Math.PI)); ctx.lineWidth = 3; ellipse(ctx, pf.x, pf.y - 80 * ease(uq), ur, ur * 0.35); ctx.stroke(); }   // 足もとから上る光の輪
        for (k = 0; k < n; k++) { var dl5 = rnd(k, seed + 7) * 0.4, hq5 = clamp01((q - dl5) / (1 - dl5)); if (hq5 <= 0 || hq5 >= 1) continue; x = p.x + (rnd(k, seed) - 0.5) * 70 + Math.sin(hq5 * 6 + k) * 6; y = pf.y - 100 * hq5; var al = Math.sin(hq5 * Math.PI);
          if (k % 3 === 0) { glow(ctx, c1, x, y, 11, al * 0.7); norm(ctx); plus(ctx, x, y, 5, '#ffffff', al); add(ctx); } else glow(ctx, k % 2 ? c1 : '#ffe9a0', x, y, 7, al); }   // 上る光と＋
        glow(ctx, c2, p.x, p.y, 64, 0.5 * Math.sin(q * Math.PI));
        break;
      case 'guard':
        column(ctx, pf.x, pf.y, 70, 110, c2, 0.22 * Math.sin(q * Math.PI)); add(ctx);
        var ga = q * TAU * 1.5; glow(ctx, c1, p.x + Math.cos(ga) * 38, p.y + Math.sin(ga) * 38, 12, 0.9 * (1 - q)); sparkle(ctx, p.x + Math.cos(ga) * 38, p.y + Math.sin(ga) * 38, 9, '#ffffff', 1 - q); glow(ctx, c2, p.x, p.y, 58, 0.35 * (1 - q));   // 守りのきらめき
        break;
      case 'buff': case 'curse':
        var up = el === 'buff', bc = up ? c2 : '#b07aff';
        if (up) { column(ctx, pf.x, pf.y, 64, 140, bc, 0.34 * Math.sin(q * Math.PI)); add(ctx); }   // 立ち上る力
        else { norm(ctx); ctx.fillStyle = rgba('#2a0a3a', 0.35 * Math.sin(q * Math.PI)); ellipse(ctx, p.x, p.y - 10, 46, 30); ctx.fill(); add(ctx); }   // 重くのしかかる影
        for (k = 0; k < 3; k++) { var cq = clamp01(q * 1.2 - k * 0.15); if (cq <= 0 || cq >= 1) continue; var chx = p.x + (k - 1) * 22, chy = up ? pf.y - 20 - 70 * cq : p.y - 50 + 60 * cq, ca = Math.sin(cq * Math.PI); glow(ctx, bc, chx, chy, 18, ca * 0.7); chevron(ctx, chx, chy, 11, up, k === 1 ? '#ffffff' : bc, ca, 4); }   // ↑（強化）・↓（弱体）
        if (up) for (k = 0; k < Math.round(8 * mul); k++) { var bq = clamp01(q - rnd(k, seed + 3) * 0.3); if (bq <= 0 || bq >= 1) continue; sparkle(ctx, p.x + (rnd(k, seed) - 0.5) * 70, pf.y - 110 * bq, 5, '#ffffff', Math.sin(bq * Math.PI)); }
        glow(ctx, up ? c2 : '#8a4ad0', p.x, p.y, 56, 0.4 * Math.sin(q * Math.PI));
        break;
      case 'time':
        for (k = 0; k < 12; k++) { var ta = k / 12 * TAU + dt / 400; sparkle(ctx, p.x + Math.cos(ta) * (40 + 10 * q), p.y + Math.sin(ta) * (40 + 10 * q) * 0.8, 4, k % 3 ? c1 : '#ffffff', 1 - q); }   // 時の輪
        break;
      case 'gold':
        for (k = 0; k < n; k++) { var lf6 = life * (0.5 + 0.5 * rnd(k, seed + 2)); if (dt > lf6) continue; var an6 = -Math.PI * rnd(k, seed), sp6 = 100 + rnd(k, seed + 1) * 160; sparkle(ctx, p.x + Math.cos(an6) * sp6 * tt, p.y + Math.sin(an6) * sp6 * tt + 400 * tt * tt, 5, k % 2 ? '#ffffff' : '#ffe08a', 1 - dt / lf6); }
        break;
      case 'smoke': break;
      default:   // 物理・チャート：火花（重い一撃は土ぼこりも）
        if (HEAVY[d.fx]) { norm(ctx); for (k = 0; k < Math.round(6 * mul) + 1; k++) { ctx.fillStyle = 'rgba(150,120,90,' + (0.3 * (1 - q)).toFixed(3) + ')'; circle(ctx, p.x + (k - 3) * 14 * (0.5 + q), p.y + 24 - 16 * q * rnd(k, seed), 8 + 18 * q, true); } add(ctx); }
        for (k = 0; k < n; k++) { var lf5 = life * (0.3 + 0.35 * rnd(k, seed + 2)); if (dt > lf5) continue; var kq5 = dt / lf5, an5 = rnd(k, seed) * TAU, sp5 = 160 + rnd(k, seed + 1) * 280; streak(ctx, p.x + Math.cos(an5) * sp5 * tt, p.y + Math.sin(an5) * sp5 * tt + 420 * tt * tt, Math.cos(an5) * sp5, Math.sin(an5) * sp5 + 840 * tt, 9 * (1 - kq5) + 2, k % 3 ? c1 : '#ffffff', 1.8, 1 - kq5); }
    }
    norm(ctx);
  }
  // 会心の一撃・弱点：集中線ときらめき（会心）、橙の輪（弱点）
  Rich.hit = function (ctx, h, t, p, W, H) {
    add(ctx);
    if (h.crit) { var cq = clamp01(t / 260); if (cq < 1) { for (var k = 0; k < 16; k++) { var a = k / 16 * TAU + rnd(k, 3) * 0.2, r1 = 30 + 60 * ease(cq), r2 = r1 + 40 + 40 * rnd(k, 4); ctx.strokeStyle = rgba(k % 2 ? '#ffffff' : '#ffd24a', 1 - cq); ctx.lineWidth = 3 * (1 - cq) + 1; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1); ctx.lineTo(p.x + Math.cos(a) * r2, p.y + Math.sin(a) * r2); ctx.stroke(); } glow(ctx, '#ffd24a', p.x, p.y, 80, 0.8 * (1 - cq)); sparkle(ctx, p.x, p.y, 40 * (1 - cq) + 6, '#ffffff', 1 - cq); } }
    else if (h.weak) { var wq = clamp01(t / 320); if (wq < 1) { ctx.strokeStyle = rgba('#ff9a3a', 1 - wq); ctx.lineWidth = 4 * (1 - wq) + 1; circle(ctx, p.x, p.y, 16 + 50 * ease(wq)); glow(ctx, '#ff8a2a', p.x, p.y, 56, 0.7 * (1 - wq)); } }
    norm(ctx);
  };

  root.FX2D = FX2D;
})(typeof window !== 'undefined' ? window : globalThis);
