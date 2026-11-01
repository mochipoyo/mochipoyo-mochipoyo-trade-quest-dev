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
  FX2D.start = function (scene, def, tl, from, to) { if (!scene) return null; scene.fx65 = scene.fx65 || []; var inst = { def: def, tl: tl, t0: scene.t, from: from, to: to && to.length ? to : [from] }; scene.fx65.push(inst); return inst; };
  function pos(scene, k, W, H) { if (k && typeof k === 'object') return k; if (scene.posOf) { var p = scene.posOf(k, W, H); if (p) return p; } return { x: W / 2, y: H * 0.4 }; }
  FX2D.draw = function (ctx, scene) {
    if (!scene || !scene.fx65 || !scene.fx65.length) return;
    scene.fx65 = scene.fx65.filter(function (inst) {
      var t = scene.t - inst.t0; if (t > inst.tl.total + 60) return false;
      ctx.save();
      try { var W = ctx.canvas.width, H = ctx.canvas.height; drawOne(ctx, { def: inst.def, tl: inst.tl, from: pos(scene, inst.from, W, H), to: inst.to.map(function (k) { return pos(scene, k, W, H); }) }, t, W, H); } catch (e) { FX2D.errors++; ctx.restore(); return false; }
      ctx.restore(); return true;
    });
  };

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
  root.FX2D = FX2D;
})(typeof window !== 'undefined' ? window : globalThis);
