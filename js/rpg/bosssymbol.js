/* =========================================================
   RPG / BossSymbol（v6.5 Phase B）：ボスをマップの上に「シンボル」として表示する（2D 描画。3D版の2Dマップでも同じ）
   ・対象：type:'boss' のイベント（ボスの部屋）と、下の REGISTRY（会話や台本で戦うボスのうち、姿を見せてよいもの）
   ・見えるとき：まだ倒していない（doneFlag が立っていない）かつ、出現の条件（requireFlag など）を満たしている
     → 未開放のボス・隠しボスは、今までの発見の条件を満たすまで出さない。倒したら消える（物語どおり）
   ・突然あらわれるボス（港の潮の大蛇など）は、今までの演出を優先してシンボルを出さない（REGISTRY に入れない）
   ・見た目：戦闘と同じ画像（ボス画像パック → 素材の画像 → MonsterArt → 人の姿）を、通常の敵より大きく描く
     呼吸するような待機の動き・足元のオーラ・立ちのぼる粒。近づくと低い効果音と「強い気配」の表示（地図に入るごとに1回）
   ・当たり判定：シンボルのマスは通れない（ぶつかる＝調べる＝戦いの始まり。今までと同じイベントが動く）
     ただし、そのマスをふさぐと行けなくなる場所が出るマップでは、ふさがずに「踏む＝調べる」にする（テストで全マップを確認）
   ・戦いの前の導入：画面が一瞬赤く光って揺れ、うなり声の効果音（そのあと今までのボス戦の演出）
   ========================================================= */
(function (root) {
  'use strict';
  var BossSymbol = { cache: {}, near: {}, t0: Date.now() };
  function D() { return root.State && root.State.data; }
  function flags() { var d = D(); return (d && d.flags) || {}; }
  function EN() { return root.ENEMIES || {}; }

  // 会話や台本で戦うボスのうち、姿を見せてよいもの（map・目印・敵・見える条件）
  //   npc: その NPC のまわりにオーラ（NPC 自身がボスの姿）／at: そのマスにシンボル
  BossSymbol.REGISTRY = [
    // 騎士団長ヴァレン：三つの証言をそろえたあと、詰所で戦う（通行証を得るまで）
    { map: 'sentra_knights', npc: 'sk_valen', enemy: 'boss_valen', show: function (f) { return f.testimony_1 && f.testimony_2 && f.testimony_3 && !f.kyle_oath_done; } },
    // 相場魔王：玉座の間の「玉座の上の黒い影」（3連戦が終わるまで）
    { map: 'demon_castle_5', at: { x: 8, y: 3 }, enemy: 'boss_demon_fear', show: function (f) { return !f.game_cleared; }, script: true }
  ];

  // そのマップのシンボルの一覧 [{ x, y, enemy, ev?, npc?, reg? }]
  BossSymbol.list = function (m) {
    if (!m) return []; var f = flags(), out = [];
    (m.events || []).forEach(function (ev) {
      if (ev.type !== 'boss' || ev.noSymbol) return;
      if (ev.doneFlag && f[ev.doneFlag]) return;
      if (ev.requireFlag && !f[ev.requireFlag]) return;
      var en = (ev.enemies && ev.enemies[0]) || ev.enemy; if (!en || !EN()[en]) return;
      out.push({ x: ev.x, y: ev.y, enemy: en, ev: ev, kind: 'event' });
    });
    BossSymbol.REGISTRY.forEach(function (r) {
      if (r.map !== m.id || !r.show(f)) return;
      if (r.npc) { var n = (m.npcs || []).filter(function (o) { return o.id === r.npc && !o.hidden; })[0]; if (n) out.push({ x: n.x, y: n.y, enemy: r.enemy, npc: n, reg: r, kind: 'npc' }); return; }
      var ev2 = m.eventAt(r.at.x, r.at.y); out.push({ x: r.at.x, y: r.at.y, enemy: r.enemy, ev: ev2, reg: r, kind: 'script' });
    });
    return out;
  };
  // ぶつかった（ふさいでいるシンボルへ進もうとした）とき：今までと同じイベントを動かす。押し続けても1.5秒に1回まで
  BossSymbol.bump = function (m, x, y, dir) {
    var W = root.World; if (!W || W.busy) return false; var s = BossSymbol.at(m, x, y); if (!s || !BossSymbol.canBlock(m, s)) return false;
    var k = m.id + '@' + x + ',' + y, now = Date.now(); if (BossSymbol._bump && BossSymbol._bump.k === k && now - BossSymbol._bump.at < 1500) return true;
    BossSymbol._bump = { k: k, at: now }; if (W.player) W.player.dir = dir;
    if (s.ev && root.Events) { root.Events.run(s.ev); return true; } return false;
  };
  // ふさいでいないシンボルのマスを踏んだとき：踏む＝調べる
  BossSymbol.stepOn = function (m, p) {
    var s = BossSymbol.at(m, p.x, p.y); if (!s || !s.ev || BossSymbol.canBlock(m, s) || !root.Events) return false;
    root.Events.run(s.ev); return true;
  };
  BossSymbol.at = function (m, x, y) { var L = BossSymbol.list(m); for (var i = 0; i < L.length; i++) if (L[i].kind !== 'npc' && L[i].x === x && L[i].y === y) return L[i]; return null; };

  // ふさいでよいか（ふさいでも、ほかに行けなくなる場所がない）。マップごとに1回だけ調べて覚える
  function reachable(m, block) {
    var d = D(); var seen = {}, q = []; var starts = (m.warps || []).map(function (w) { return [w.x, w.y]; });
    starts.forEach(function (s) { var k = s[0] + ',' + s[1]; if (!seen[k]) { seen[k] = 1; q.push(s); } });
    while (q.length) { var c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { var nx = c[0] + v[0], ny = c[1] + v[1], k = nx + ',' + ny; if (seen[k]) return; if (block && block[k]) return; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) return; var t = m.tiles[ny][nx]; if (root.Tiles.isSolid(t)) return; var ev = m.eventAt(nx, ny); if (ev && ev.solid && !(ev.doneFlag && d && d.flags[ev.doneFlag]) && ev.type !== 'boss') return; seen[k] = 1; q.push([nx, ny]); }); }
    return seen;
  }
  BossSymbol.canBlock = function (m, s) {
    var key = m.id + '@' + s.x + ',' + s.y; if (BossSymbol.cache[key] !== undefined) return BossSymbol.cache[key];
    var ev = s.ev; var res;
    if (s.kind === 'npc') res = false;   // NPC は今までどおり（NPC 自身が通れない）
    else if (ev && ev.solid) res = true;   // もとからふさがっている
    else if (ev && ev.symbolBlock !== undefined) res = !!ev.symbolBlock;
    else { var a = reachable(m, null), blk = {}; blk[s.x + ',' + s.y] = 1; var b = reachable(m, blk); var lost = Object.keys(a).filter(function (k) { return k !== s.x + ',' + s.y && !b[k]; }); res = lost.length === 0; }
    BossSymbol.cache[key] = res; return res;
  };
  // GameMap.passable から：そのマスにふさいでよいシンボルがあれば通れない
  BossSymbol.blocks = function (m, x, y) { var s = BossSymbol.at(m, x, y); return !!(s && BossSymbol.canBlock(m, s)); };

  // ---------- 見た目 ----------
  function visualOf(id) {
    var e = EN()[id]; if (!e) return null;
    if (root.BattleUI && root.BattleUI.enemyVisual) { try { return root.BattleUI.enemyVisual({ defId: id, art: e.art, sprite: e.sprite, boss: true }); } catch (er) { } }
    if (e.art && root.MonsterArt) { var c = root.MonsterArt.image(e.art, 2, 0); return { img: c, w: c.width, h: c.height, smooth: false }; }
    return null;
  }
  BossSymbol.visual = function (id) { var k = 'v:' + id; var v = BossSymbol.cache[k]; if (v && v.img && (v.source !== 'monsterart' || !root.BossArt || !root.BossArt.get(id))) return v; v = visualOf(id); if (v) BossSymbol.cache[k] = v; return v; };
  var AURA = { fire: '255,120,60', ice: '140,210,255', thunder: '255,230,90', wind: '150,255,190', light: '255,245,200', dark: '170,90,255' };
  function auraColor(id) {
    var e = EN()[id] || {}; var r = e.resist || {}; var best = null, bv = 1;
    Object.keys(r).forEach(function (k) { if (r[k] < bv && AURA[k]) { bv = r[k]; best = k; } });   // いちばん強い（効きにくい）属性の色
    return best ? AURA[best] : '255,70,90';
  }
  BossSymbol.auraColor = auraColor;   // v6.5 Phase D 3D版のシンボル（three-src の MapScene3D）でも同じ色を使う

  // 描画用：[{ y, draw(ctx) }]（GameMap.draw の y 順の並びに入れる）
  BossSymbol.drawList = function (m, cam, x0, y0, x1, y1, TS) {
    var L = BossSymbol.list(m); if (!L.length) return [];
    var t = (Date.now() - BossSymbol.t0) / 1000; var p = root.World && root.World.player;
    return L.filter(function (s) { return s.x >= x0 - 2 && s.x <= x1 + 2 && s.y >= y0 - 2 && s.y <= y1 + 3; }).map(function (s) {
      return { y: s.y * TS + (s.kind === 'npc' ? -0.5 : 0.6), draw: function (ctx) {   // NPC のオーラは NPC の下に
        var cx = s.x * TS - cam.x + TS / 2, by = s.y * TS - cam.y + TS - 3; var col = auraColor(s.enemy);
        var ph = Math.sin(t * 2.2 + s.x), ph2 = Math.sin(t * 3.1 + s.y);
        // 足元のオーラ（脈打つ）
        ctx.save();
        var rr = TS * (s.kind === 'npc' ? 0.7 : 0.95) * (1 + ph * 0.06);
        if (ctx.createRadialGradient) { var gr = ctx.createRadialGradient(cx, by, 1, cx, by, rr); gr.addColorStop(0, 'rgba(' + col + ',0.55)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = gr; }
        else ctx.fillStyle = 'rgba(' + col + ',0.3)';
        ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(cx, by, rr, rr * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        // 立ちのぼる粒
        for (var i = 0; i < 6; i++) { var k = (t * 0.6 + i / 6) % 1; var px = cx + Math.sin(i * 2.1 + t) * TS * 0.5; var py = by - k * TS * 1.9; ctx.fillStyle = 'rgba(' + col + ',' + (0.75 * (1 - k)).toFixed(2) + ')'; ctx.fillRect(Math.round(px), Math.round(py), 2, 2); }
        if (s.kind !== 'npc') {
          var v = BossSymbol.visual(s.enemy);
          if (v && v.img) {
            var H = TS * 1.85, W = Math.min(TS * 2.6, H * v.w / Math.max(1, v.h)); if (W === TS * 2.6) H = W * v.h / Math.max(1, v.w);
            var breathe = 1 + ph2 * 0.025, bob = Math.round(ph * 1.5);
            ctx.imageSmoothingEnabled = !!v.smooth;
            ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(cx, by, W * 0.32, W * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            ctx.drawImage(v.img, Math.round(cx - W / 2), Math.round(by - H * breathe + bob), Math.round(W), Math.round(H * breathe));
            ctx.imageSmoothingEnabled = false;
          }
        }
        // 近くにいるときは頭の上に「！」
        if (p && Math.abs(p.x - s.x) + Math.abs(p.y - s.y) <= 3) { var my = by - TS * (s.kind === 'npc' ? 1.5 : 2.2) + Math.round(ph * 2); ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = 'rgb(' + col + ')'; ctx.strokeText('！', cx, my); ctx.fillText('！', cx, my); }
        ctx.restore();
      } };
    });
  };

  // ---------- 近づいたとき（1マップ1回） ----------
  BossSymbol.onStep = function (m, p) {
    if (!m || !p) return; var L = BossSymbol.list(m); if (!L.length) return;
    for (var i = 0; i < L.length; i++) { var s = L[i]; var k = m.id + '@' + s.x + ',' + s.y; if (BossSymbol.near[k]) continue;
      if (Math.abs(p.x - s.x) + Math.abs(p.y - s.y) <= 4) { BossSymbol.near[k] = 1; if (root.Audio) root.Audio.sfx('bossnear'); if (root.Win && root.Win.toast) root.Win.toast('強い気配がする……（' + (EN()[s.enemy] || {}).name + '）'); } }
  };
  BossSymbol.onEnterMap = function (m) { var keep = {}; Object.keys(BossSymbol.near).forEach(function (k) { if (k.indexOf(m.id + '@') !== 0) keep[k] = 1; }); BossSymbol.near = keep; };   // 入り直したら、もう一度知らせる
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) { BossSymbol.onEnterMap(m); });

  // ---------- 戦いの前の導入（赤い光・揺れ・うなり声）。0.6秒ほど。描画できなくても進む ----------
  BossSymbol.intro = function (ev) {
    return new Promise(function (resolve) {
      try {
        if (root.Audio) root.Audio.sfx('bossroar');
        var doc = root.document; var cv = doc && doc.getElementById('game');
        var fl = doc && doc.createElement('div');
        if (fl) { fl.className = 'boss-intro-flash'; (doc.getElementById('app') || doc.body).appendChild(fl); }
        if (cv && cv.classList) cv.classList.add('boss-shake');
        setTimeout(function () { if (fl && fl.parentNode) fl.parentNode.removeChild(fl); if (cv && cv.classList) cv.classList.remove('boss-shake'); resolve(); }, 620);
      } catch (e) { resolve(); }
    });
  };

  // 会話・台本のボス戦（c.battle）の前：そのボスのシンボルが見えていれば導入の演出（突然あらわれるボスには出さない）
  BossSymbol.introIfShown = function (enemyIds) {
    var m = root.World && root.World.map; if (!m) return Promise.resolve();
    var L = BossSymbol.list(m); var hit = L.some(function (s) { return (enemyIds || []).indexOf(s.enemy) >= 0 && s.kind !== 'event'; });
    return hit ? BossSymbol.intro(null) : Promise.resolve();
  };
  root.BossSymbol = BossSymbol;
})(typeof window !== 'undefined' ? window : globalThis);
