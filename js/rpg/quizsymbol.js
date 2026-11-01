/* =========================================================
   RPG / QuizSymbol：トレードクイズモンスター5体を、マップの上に固有のシンボルとして出す（2D 描画。3D版でも、5体のいるマップは2Dで表示される）
   ・置く場所は js/data/quiz-monsters.js の map・x・y（既存のマップ。NPC・宝箱・出入口・イベント・ボスと重ならないことをテストで確認）
   ・通常のランダムエンカウントには入れない（ENEMIES に登録しない。シンボルに触れる・話しかけるときだけ始まる）
   ・見えるとき：まだ倒していない、かつ「不正解で逃げた直後」ではない（逃げたら、そのマップに入り直すまで姿を消す。入り直すと同じ場所に戻る）
   ・倒したら二度と現れない（セーブの d.quizMon の討伐の記録で決める）
   ・始め方：はじめての相手は、ぶつかる（触れる）か話しかけると始まる。
     一度挑んだ相手（不正解で逃げた・挑まずに離れた・問題の途中で離れた）は、ぶつかっただけでは始まらない（連続の接触で誤って始まらないように）。
     話しかける（決定ボタン）と「再挑戦しますか？」と確かめてから始まる
   ・当たり判定：シンボルのマスは通れない（ただし、ふさぐと周りのマスどうしが行き来できなくなる場合はふさがず、踏む＝触れるにする）。乗り物に乗っている間はふさがない
   ========================================================= */
(function (root) {
  'use strict';
  var QS = { away: {}, declined: {}, near: {}, cache: {}, t0: Date.now() };
  function D() { return root.State && root.State.data; }
  function MONS() { return root.QUIZ_MONSTERS || []; }
  function rec(mid) { var d = D(); return d && root.Quiz ? root.Quiz.rec(d, mid) : null; }

  QS.list = function (m) {
    if (!m || !root.Quiz) return []; var out = [];
    MONS().forEach(function (q) { if (q.map !== m.id || QS.away[q.id]) return; var r = rec(q.id); if (!r || r.defeated) return; out.push({ x: q.x, y: q.y, mon: q }); });
    return out;
  };
  QS.at = function (m, x, y) { var L = QS.list(m); for (var i = 0; i < L.length; i++) if (L[i].x === x && L[i].y === y) return L[i]; return null; };
  QS.tried = function (mid) { var r = rec(mid); var d = D(); return !!(r && (r.attempts > 0 || QS.declined[mid] || (d && d.quizMon && d.quizMon.pending && d.quizMon.pending[mid]))); };

  // ふさいでよいか：ふさいだとき、周りの通れるマスどうしが（ほかの道で）行き来できるか
  function walk(m, x, y) { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false; var t = m.tiles[y][x]; if (root.Tiles && root.Tiles.isSolid(t)) return false; var ev = m.eventAt ? m.eventAt(x, y) : null; if (ev && ev.solid) return false; return true; }
  QS.canBlock = function (m, s) {
    var key = m.id + '@' + s.x + ',' + s.y; if (QS.cache[key] !== undefined) return QS.cache[key];
    var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (v) { return [s.x + v[0], s.y + v[1]]; }).filter(function (p) { return walk(m, p[0], p[1]); });
    var res = true;
    if (nb.length > 1) {
      var seen = {}; seen[s.x + ',' + s.y] = 1; var q = [nb[0]]; seen[nb[0][0] + ',' + nb[0][1]] = 1; var need = {}; nb.slice(1).forEach(function (p) { need[p[0] + ',' + p[1]] = 1; }); var left = nb.length - 1; var steps = 0;
      while (q.length && left > 0 && steps < 40000) { var c = q.shift(); steps++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { var nx = c[0] + v[0], ny = c[1] + v[1], k = nx + ',' + ny; if (seen[k] || !walk(m, nx, ny)) return; seen[k] = 1; if (need[k]) { left--; delete need[k]; } q.push([nx, ny]); }); }
      res = left === 0;
    }
    QS.cache[key] = res; return res;
  };
  QS.blocks = function (m, x, y) { var d = D(); if (d && d.aboard) return false; var s = QS.at(m, x, y); return !!(s && QS.canBlock(m, s)); };

  // ---------- 始める ----------
  QS.start = async function (s, how) {
    var W = root.World, Win = root.Win; if (!W || W.busy || !root.QuizBattleUI) return false;
    var mid = s.mon.id; var m = s.mon; var d = D();
    W.busy = true;
    try {
      if (how === 'talk' && QS.tried(mid)) {
        var stake = root.Quiz.stealAmount(d.gold, m.steal);
        var a = await Win.choice(m.name + 'がいる。再挑戦しますか？（間違えると所持金の' + Math.round(m.steal.rate * 100) + '%・上限' + m.steal.cap + 'G。いまなら ' + stake + 'G）', ['挑む', 'やめておく'], { initial: 1 });
        if (a !== 0) return true;
      }
      if (root.BossSymbol && root.BossSymbol.intro) await root.BossSymbol.intro(null);
      if (root.Audio) root.Audio.playBgm('battle');
      var r = await root.QuizBattleUI.open(mid, { retry: QS.tried(mid) });
      if (r && r.left) QS.declined[mid] = true;
      if (r && r.result && !r.result.ok) QS.away[mid] = true;   // 逃げた：このマップに入り直すまで姿を消す
      if (r && r.result && r.result.ok && root.Ultimates) {   // レベルが上がって覚えた必殺技（主人公だけ）
        var nu = root.Ultimates.sync(d); if (nu.length) await Win.message(nu.map(function (id) { var x = root.Ultimates.get(id); return '必殺技「' + (x ? x.name : id) + '」を覚えた！（戦闘の「必殺技」から使える）'; }), { name: '必殺技' });
      }
    } catch (e) { if (root.Engine && root.Engine.onError) root.Engine.onError(e); }
    finally {
      if (root.Audio && W.map) root.Audio.playBgm(W.map.def.bgm || (W.map.kind === 'field' ? 'field' : 'town'));
      W.busy = false; W._talkEnd = Date.now(); if (W.updateHud) W.updateHud(); if (root.State) root.State.autosave();
    }
    return true;
  };
  // ぶつかった（ふさいでいるシンボルへ進もうとした）。はじめての相手なら始まる。一度挑んだ相手は話しかけるように知らせる
  QS.bump = function (m, x, y, dir) {
    var W = root.World; if (!W || W.busy) return false; var d = D(); if (d && d.aboard) return false; var s = QS.at(m, x, y); if (!s) return false;
    var k = m.id + '@' + x + ',' + y, t = Date.now(); if (QS._bump && QS._bump.k === k && t - QS._bump.at < 1200) return true; QS._bump = { k: k, at: t };
    if (W.player) W.player.dir = dir;
    if (W._talkEnd && t - W._talkEnd < 600) return true;   // 閉じた直後の押しっぱなしでは始めない
    if (!QS.tried(s.mon.id)) { QS.start(s, 'bump'); return true; }
    if (root.Win && root.Win.toast) root.Win.toast(s.mon.short + 'がこちらをにらんでいる……（話しかけると再挑戦）', 1800);
    return true;
  };
  // 話しかけた（決定ボタン）
  QS.interact = function (m, x, y) { var d = D(); if (d && d.aboard) return false; var s = QS.at(m, x, y); if (!s) return false; QS.start(s, 'talk'); return true; };
  // ふさいでいないシンボルのマスを踏んだ
  QS.stepOn = function (m, p) {
    var s = QS.at(m, p.x, p.y); if (!s || QS.canBlock(m, s)) return false; var d = D(); if (d && d.aboard) return false;
    if (!QS.tried(s.mon.id)) { QS.start(s, 'bump'); return true; }
    if (root.Win && root.Win.toast) root.Win.toast(s.mon.short + 'がこちらをにらんでいる……（話しかけると再挑戦）', 1800); return false;
  };
  // 近づいたとき（1マップ1回）
  QS.onStep = function (m, p) {
    if (!m || !p) return; QS.list(m).forEach(function (s) { var k = m.id + '@' + s.mon.id; if (QS.near[k]) return; if (Math.abs(p.x - s.x) + Math.abs(p.y - s.y) <= 4) { QS.near[k] = 1; var r0 = rec(s.mon.id); if (r0) r0.seen = true; if (root.Audio) root.Audio.sfx('magic'); if (root.Win && root.Win.toast) root.Win.toast('不思議な気配がする……（' + s.mon.name + '）'); } });
  };
  QS.onEnterMap = function (m) {
    MONS().forEach(function (q) { if (q.map === m.id) { delete QS.away[q.id]; delete QS.declined[q.id]; delete QS.near[m.id + '@' + q.id]; } });
  };
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) { QS.onEnterMap(m); });

  // ---------- 見た目 ----------
  QS.drawList = function (m, cam, x0, y0, x1, y1, TS) {
    var L = QS.list(m); if (!L.length || !root.QuizMonArt) return [];
    var t = (Date.now() - QS.t0) / 1000; var p = root.World && root.World.player;
    return L.filter(function (s) { return s.x >= x0 - 2 && s.x <= x1 + 2 && s.y >= y0 - 2 && s.y <= y1 + 3; }).map(function (s) {
      return { y: s.y * TS + 0.6, draw: function (ctx) {
        var cx = s.x * TS - cam.x + TS / 2, by = s.y * TS - cam.y + TS - 3; var col = s.mon.aura; var ph = Math.sin(t * 2.2 + s.x), ph2 = Math.sin(t * 3.1 + s.y);
        ctx.save();
        var rr = TS * 0.9 * (1 + ph * 0.06);
        if (ctx.createRadialGradient) { var gr = ctx.createRadialGradient(cx, by, 1, cx, by, rr); gr.addColorStop(0, 'rgba(' + col + ',0.55)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = gr; } else ctx.fillStyle = 'rgba(' + col + ',0.3)';
        ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(cx, by, rr, rr * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        // 立ちのぼる「？」
        ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        for (var i = 0; i < 3; i++) { var k = (t * 0.45 + i / 3) % 1; ctx.fillStyle = 'rgba(' + col + ',' + (0.85 * (1 - k)).toFixed(2) + ')'; ctx.fillText('？', cx + Math.sin(i * 2.3 + t) * TS * 0.55, by - k * TS * 1.8); }
        var img = root.QuizMonArt.image(s.mon.id, 1, Math.floor(t * 2.5) % 4);
        if (img) {
          var H = TS * 1.7 * (1 + ph2 * 0.02), Wd = TS * 1.7; var bob = Math.round(ph * 1.5);
          ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(cx, by, Wd * 0.3, Wd * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
          ctx.imageSmoothingEnabled = false; ctx.drawImage(img, Math.round(cx - Wd / 2), Math.round(by - H + bob + TS * 0.06), Math.round(Wd), Math.round(H));
        }
        // 近くにいるときは頭の上に「？」の吹き出し
        if (p && Math.abs(p.x - s.x) + Math.abs(p.y - s.y) <= 3) {
          var my = by - TS * 1.95 + Math.round(ph * 2); ctx.fillStyle = 'rgba(8,12,30,0.85)'; ctx.strokeStyle = 'rgb(' + col + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - 9, my - 10, 18, 18, 4); else ctx.rect(cx - 9, my - 10, 18, 18); ctx.fill(); ctx.stroke();
          ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = 'rgb(' + col + ')'; ctx.textBaseline = 'middle'; ctx.fillText('？', cx, my);
        }
        ctx.restore();
      } };
    });
  };
  (root.MAP_DRAW_LAYERS = root.MAP_DRAW_LAYERS || []).push(function (m, cam, x0, y0, x1, y1, TS) { return QS.drawList(m, cam, x0, y0, x1, y1, TS); });
  root.QuizSymbol = QS;
})(typeof window !== 'undefined' ? window : globalThis);
