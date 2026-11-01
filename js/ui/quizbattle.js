/* =========================================================
   UI / QuizBattleUI：トレードクイズモンスターとの特殊戦闘（通常の戦闘画面 BattleUI は使わない。HTML と Canvas を画面の上に重ねる。2D 版・3D 版で共通）
   ・流れ：接触 → 専用の画面 → 自己紹介 → 「我が問いに答えてみよ！」 → 間違えたときの損失（割合・上限・いまの所持金での額）を表示
           → 「挑む」で問題と4択（チャートの問題はデータから描く。画像ファイルは使わない） → 選んで「この答えで確定」 → 判定 → 解説
           → 正解：光が走って爆発・消滅（撃破）、経験値・ゴールド・初回の称号と記念アイテム／不正解：ゴールドを奪われ、モンスターは逃げる → フィールドへ
   ・時間制限なし。誤タップで決まらないよう「選ぶ」と「確定」を分ける。確定は1回だけ（ボタンをすぐ無効にし、Quiz.settle も同じ確定の番号を2回受け付けない）
   ・確定した瞬間に結果をセーブへ書いて保存する（演出の途中で閉じても再読み込みしても、ゴールドと報酬はずれない）
   ・問題を出した時点で「出している途中の問題」を保存する（いったん離れても、再読み込みしても、次は同じ問題）
   ・操作：PC＝ボタン・キーボード（1〜4／↑↓＝選ぶ、Enter＝確定・次へ、Esc＝問題を出す前なら離れる）／スマホ＝大きなボタン（確定ボタンは画面の下に固定）
   ・演出の強さ：設定「必殺技の演出」（控えめ）と OS の「視差効果を減らす」で控えめにする
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win;
  var QB = { isOpen: false, last: null };
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); }
  function fmtG(n) { n = Math.max(0, Math.floor(n || 0)); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'G'; }
  function pct(r) { return Math.round(r * 1000) / 10 + '%'; }
  function calm() {
    var st = (root.State && root.State.data && root.State.data.settings) || {};
    var rm = false; try { rm = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
    return st.ultFx === 'calm' || rm;
  }
  function stars(n) { var s = ''; for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return s; }
  function masterOf(school) { var MS = root.TRADER_MASTERS || {}; var k = Object.keys(MS).filter(function (id) { return MS[id].school === school; })[0]; return k ? MS[k] : null; }
  QB.fmtG = fmtG;

  /* ---------- チャート（固定のデータから描く） ---------- */
  var C = { bg: '#0b1226', grid: 'rgba(255,255,255,0.07)', text: '#c9d2e8', up: '#4cc38a', down: '#e5484d', hi: '#ffd24a', lo: '#7fd4ff', macd: '#5ab0ff', line: '#c9a0ff' };
  function fmt2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function fmtV(v) { return Math.abs(v) < 5 ? (Math.round(v * 100) / 100).toFixed(2).replace('-', '−') : String(Math.round(v * 100) / 100).replace('-', '−'); }
  function scaleY(lo, hi, top, h) { var pad = (hi - lo) * 0.1 || 0.05; lo -= pad; hi += pad; var f = function (v) { return top + (hi - v) / (hi - lo) * h; }; f.lo = lo; f.hi = hi; return f; }
  // 目盛り：きりのよい値（0.05・0.1・0.2 など）
  function ticks(lo, hi) { var r = hi - lo; var st = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50]; var s0 = st[st.length - 1]; for (var i = 0; i < st.length; i++) if (r / st[i] <= 5) { s0 = st[i]; break; } var out = []; for (var v = Math.ceil(lo / s0 - 1e-9) * s0; v <= hi + 1e-9; v += s0) out.push(Math.round(v * 1000) / 1000); return out; }
  QB.ticks = ticks;
  function label(ctx, text, x, y, col, align, bg) {
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    if (bg !== false) { var w = ctx.measureText(text).width + 6; var lx = align === 'left' ? x - 1 : align === 'right' ? x - w + 1 : x - w / 2; ctx.fillStyle = 'rgba(8,12,30,0.82)'; ctx.fillRect(lx, y - 8, w, 16); }
    ctx.fillStyle = col; ctx.fillText(text, align === 'left' ? x + 2 : align === 'right' ? x - 2 : x, y);
  }
  function drawCandles(ctx, W, H, c) {
    var bars = c.bars, n = bars.length, padR = 52, padB = 16, top = 8; var lo = Infinity, hi = -Infinity;
    bars.forEach(function (b) { lo = Math.min(lo, b[2]); hi = Math.max(hi, b[1]); }); (c.hlines || []).forEach(function (h) { lo = Math.min(lo, h.v); hi = Math.max(hi, h.v); });
    var y = scaleY(lo, hi, top, H - top - padB); var bw = (W - padR - 8) / n;
    ctx.font = '10px sans-serif'; ctx.textBaseline = 'middle'; ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ticks(y.lo, y.hi).forEach(function (p) { var gy = Math.round(y(p)) + 0.5; ctx.beginPath(); ctx.moveTo(4, gy); ctx.lineTo(W - padR, gy); ctx.stroke(); ctx.fillStyle = C.text; ctx.textAlign = 'left'; ctx.fillText(fmt2(p), W - padR + 4, gy); });
    (c.hlines || []).forEach(function (h) { var hy = Math.round(y(h.v)) + 0.5; ctx.save(); if (ctx.setLineDash) ctx.setLineDash([5, 4]); ctx.strokeStyle = '#ffb04a'; ctx.beginPath(); ctx.moveTo(4, hy); ctx.lineTo(W - padR, hy); ctx.stroke(); ctx.restore(); label(ctx, h.label || fmt2(h.v), W - padR - 2, hy - 9, '#ffb04a', 'right'); });
    bars.forEach(function (b, i) {
      var x = 6 + (i + 0.5) * bw, o = b[0], h = b[1], l = b[2], cl = b[3]; var col = cl > o ? C.up : cl < o ? C.down : '#c9d2e8';
      if (c.highlight === i) { ctx.fillStyle = 'rgba(255,210,74,0.14)'; ctx.fillRect(x - bw / 2 + 1, top, bw - 2, H - top - padB); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1; ctx.strokeRect(x - bw / 2 + 1.5, top + 0.5, bw - 3, H - top - padB - 1); }
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, Math.round(bw * 0.08)); ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, y(h)); ctx.lineTo(Math.round(x) + 0.5, y(l)); ctx.stroke();
      var bt = y(Math.max(o, cl)), bb = y(Math.min(o, cl)); var w = Math.max(3, bw * 0.56); ctx.fillStyle = col; ctx.fillRect(Math.round(x - w / 2), Math.round(bt), Math.round(w), Math.max(1, Math.round(bb - bt)));
      ctx.fillStyle = C.text; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x, H - 7);
    });
  }
  function drawLines(ctx, W, H, c) {
    var padR = 52, padB = 16, top = 8; var sub = c.sub; var subH = sub ? Math.round(H * 0.32) : 0; var mainH = H - padB - top - subH - (sub ? 6 : 0);
    var lo = Infinity, hi = -Infinity; c.series.forEach(function (s) { s.v.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); }); });
    var y = scaleY(lo, hi, top, mainH); var n = c.labels.length; var dx = (W - padR - 16) / Math.max(1, n - 1); function x(i) { return 10 + i * dx; }
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.font = '10px sans-serif'; ctx.textBaseline = 'middle';
    ticks(y.lo, y.hi).forEach(function (p) { var gy = Math.round(y(p)) + 0.5; ctx.beginPath(); ctx.moveTo(4, gy); ctx.lineTo(W - padR, gy); ctx.stroke(); ctx.fillStyle = C.text; ctx.textAlign = 'left'; ctx.fillText(fmt2(p), W - padR + 4, gy); });
    c.series.forEach(function (s, si) { ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); s.v.forEach(function (v, i) { if (i) ctx.lineTo(x(i), y(v)); else ctx.moveTo(x(i), y(v)); }); ctx.stroke(); s.v.forEach(function (v, i) { ctx.fillStyle = s.color; ctx.fillRect(x(i) - 2, y(v) - 2, 4, 4); }); label(ctx, s.name, 8 + si * 58, top + 8, s.color, 'left'); });
    if (sub) {
      var st = top + mainH + 6; var ys = function (v) { return st + (sub.max - v) / (sub.max - sub.min) * subH; };
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(4, st, W - padR - 4, subH);
      (sub.lines || []).forEach(function (lv) { var ly = Math.round(ys(lv)) + 0.5; ctx.save(); if (ctx.setLineDash) ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(4, ly); ctx.lineTo(W - padR, ly); ctx.stroke(); ctx.restore(); ctx.fillStyle = C.text; ctx.textAlign = 'left'; ctx.fillText(String(lv).replace('-', '−'), W - padR + 4, ly); });
      ctx.strokeStyle = sub.color; ctx.lineWidth = 2; ctx.beginPath(); sub.v.forEach(function (v, i) { if (i) ctx.lineTo(x(i), ys(v)); else ctx.moveTo(x(i), ys(v)); }); ctx.stroke();
      sub.v.forEach(function (v, i) { ctx.fillStyle = sub.color; ctx.fillRect(x(i) - 2, ys(v) - 2, 4, 4); });
      var L = sub.v.length; var ly = function (v) { var yy = ys(v) + (v < 0 ? -11 : 11); return Math.max(st + 8, Math.min(st + subH - 8, yy)); };
      label(ctx, String(sub.v[L - 2]).replace('-', '−'), x(L - 2), ly(sub.v[L - 2]), sub.color); label(ctx, String(sub.v[L - 1]).replace('-', '−'), Math.min(W - padR - 14, x(L - 1)), ly(sub.v[L - 1]), sub.color);
      label(ctx, sub.name, 8, st + 9, sub.color, 'left');
    }
    ctx.fillStyle = C.text; ctx.textAlign = 'center'; c.labels.forEach(function (lb, i) { ctx.fillText(lb, x(i), H - 7); });
  }
  // 高値・安値の並び：切り下がっている高値から始まるときは高値から、それ以外は安値から交互に結ぶ
  QB.zigzagPoints = function (c) {
    var h = c.highs, l = c.lows, pts = []; var fromHigh = h[h.length - 1] < h[0];
    for (var i = 0; i < Math.max(h.length, l.length); i++) { if (fromHigh) { if (i < h.length) pts.push({ v: h[i], hi: true, n: i + 1 }); if (i < l.length) pts.push({ v: l[i], hi: false, n: i + 1 }); } else { if (i < l.length) pts.push({ v: l[i], hi: false, n: i + 1 }); if (i < h.length) pts.push({ v: h[i], hi: true, n: i + 1 }); } }
    return pts;
  };
  function drawZigzag(ctx, W, H, c) {
    var pts = QB.zigzagPoints(c); var lo = Infinity, hi = -Infinity; pts.forEach(function (p) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); });
    var y = scaleY(lo, hi, 22, H - 44); var dx = (W - 40) / Math.max(1, pts.length - 1); function x(i) { return 20 + i * dx; }
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; for (var k = 0; k <= 3; k++) { var gy = Math.round(22 + (H - 44) * k / 3) + 0.5; ctx.beginPath(); ctx.moveTo(4, gy); ctx.lineTo(W - 4, gy); ctx.stroke(); }
    ctx.strokeStyle = C.line; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(x(i), y(p.v)); else ctx.moveTo(x(i), y(p.v)); }); ctx.stroke();
    // 高値どうし・安値どうしを点線で
    [true, false].forEach(function (isH) { var q = []; pts.forEach(function (p, i) { if (p.hi === isH) q.push([x(i), y(p.v)]); }); ctx.save(); if (ctx.setLineDash) ctx.setLineDash([4, 4]); ctx.strokeStyle = isH ? 'rgba(255,210,74,0.6)' : 'rgba(127,212,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); q.forEach(function (a, i) { if (i) ctx.lineTo(a[0], a[1]); else ctx.moveTo(a[0], a[1]); }); ctx.stroke(); ctx.restore(); });
    pts.forEach(function (p, i) { var px = x(i), py = y(p.v); ctx.fillStyle = p.hi ? C.hi : C.lo; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); label(ctx, (p.hi ? '高値' : '安値') + p.n + ' ' + fmt2(p.v), Math.min(W - 44, Math.max(44, px)), py + (p.hi ? -13 : 13), p.hi ? C.hi : C.lo); });
  }
  // ダイバージェンス：価格（上）と MACD（下）。2つの山（谷）を同じ位置に描き、値を書く。間の形は説明用の曲線（データは2点の値だけ）
  function drawDivergence(ctx, W, H, c) {
    var peaks = c.kind === 'peaks'; var topH = Math.round(H * 0.5) - 10, botT = topH + 18, botH = H - botT - 8; var xs = [W * 0.3, W * 0.72];
    function curve(vals, base, amp, yf) { ctx.beginPath(); var N = 60; for (var i = 0; i <= N; i++) { var t = i / N; var px = 10 + t * (W - 20); var v = base; xs.forEach(function (cx, k) { var d = (px - cx) / (W * 0.1); v += (vals[k] - base) * Math.exp(-d * d); }); if (i) ctx.lineTo(px, yf(v)); else ctx.moveTo(px, yf(v)); } ctx.stroke(); }
    function panel(vals, top, h, name, col, fmt) {
      var lo = Math.min(vals[0], vals[1]), hi = Math.max(vals[0], vals[1]); var span = (hi - lo) || Math.abs(hi) * 0.1 || 0.1; var base = peaks ? lo - span * 1.6 : hi + span * 1.6;
      var mn = Math.min(lo, base), mx = Math.max(hi, base); var yf = peaks ? scaleY(mn, mx, top + 22, h - 28) : scaleY(mn, mx, top + 6, h - 28);
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(4, top, W - 8, h); ctx.strokeStyle = col; ctx.lineWidth = 2.2; curve(vals, base, 1, yf);
      ctx.save(); if (ctx.setLineDash) ctx.setLineDash([5, 4]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xs[0], yf(vals[0])); ctx.lineTo(xs[1], yf(vals[1])); ctx.stroke(); ctx.restore();
      xs.forEach(function (cx, k) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, yf(vals[k]), 4, 0, Math.PI * 2); ctx.fill(); label(ctx, (peaks ? '山' : '谷') + (k + 1) + '：' + fmt(vals[k]), Math.min(W - 50, Math.max(50, cx)), yf(vals[k]) + (peaks ? -13 : 13), '#fff'); });
      label(ctx, name, 8, top + 9, col, 'left');
    }
    panel(c.price, 2, topH, '価格', C.line, function (v) { return fmt2(v) + '円'; });
    panel(c.macd, botT, botH, 'MACD', C.macd, fmtV);
  }
  QB.drawChart = function (canvas, chart) {
    if (!canvas || !chart) return false; var ctx = null; try { ctx = canvas.getContext('2d'); } catch (e) { } if (!ctx) return false;
    var r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 320, height: 180 }; var dpr = Math.min(2, root.devicePixelRatio || 1);
    var W = Math.max(200, Math.round(r.width || 320)), H = Math.max(120, Math.round(r.height || 180)); canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    try { if (chart.type === 'candles') drawCandles(ctx, W, H, chart); else if (chart.type === 'lines') drawLines(ctx, W, H, chart); else if (chart.type === 'zigzag') drawZigzag(ctx, W, H, chart); else if (chart.type === 'divergence') drawDivergence(ctx, W, H, chart); else return false; }
    catch (e) { if (root.console) console.warn('QuizChart', e); return false; }
    return true;
  };
  // 同じデータを文字で（チャートが描けないときも、問題に答えられるように）
  QB.chartText = function (c) {
    if (!c) return '';
    if (c.type === 'candles') return '<table class="qb-tbl"><tr><th>足</th><th>始値</th><th>高値</th><th>安値</th><th>終値</th></tr>' + c.bars.map(function (b, i) { return '<tr' + (c.highlight === i ? ' class="hl"' : '') + '><td>' + (i + 1) + (c.highlight === i ? '（右端）' : '') + '</td><td>' + fmt2(b[0]) + '</td><td>' + fmt2(b[1]) + '</td><td>' + fmt2(b[2]) + '</td><td>' + fmt2(b[3]) + '</td></tr>'; }).join('') + '</table>' + (c.hlines ? '<div>' + c.hlines.map(function (h) { return '水平線：' + esc(h.label || fmt2(h.v)); }).join('／') + '</div>' : '');
    if (c.type === 'lines') return c.series.map(function (s) { return esc(s.name) + '：' + s.v.map(fmt2).join(' → '); }).join('<br>') + (c.sub ? '<br>' + esc(c.sub.name) + '：' + c.sub.v.map(function (v) { return String(v).replace('-', '−'); }).join(' → ') : '');
    if (c.type === 'zigzag') return '高値：' + c.highs.map(fmt2).join(' → ') + '<br>安値：' + c.lows.map(fmt2).join(' → ');
    if (c.type === 'divergence') return '価格の' + (c.kind === 'peaks' ? '山' : '谷') + '：' + c.price.map(fmt2).join('円 → ') + '円<br>MACD の' + (c.kind === 'peaks' ? '山' : '谷') + '：' + c.macd.map(fmtV).join(' → ');
    return '';
  };

  /* ---------- 画面 ---------- */
  // mid：モンスターの ID。opts.retry：不正解のあとの再挑戦。返り値：{ left:true }（挑まずに離れた）／{ result }（確定した）／{ error }
  QB.open = function (mid, opts) {
    opts = opts || {};
    var Quiz = root.Quiz, State = root.State; var m = Quiz && Quiz.monster(mid); var d = State && State.data;
    if (!m || !d || !Win) return Promise.resolve({ error: 'bad' });
    var rec = Quiz.rec(d, mid); if (rec.defeated) return Promise.resolve({ error: 'defeated' }); rec.seen = true;
    var S = { calm: calm() };
    return new Promise(function (resolve) {
      var node, closeFn, stage = 'intro', pend = null, qq = null, order = [], sel = -1, removed = -1, answered = false, result = null, goldBefore = 0, closed = false;
      var cv, cx2, raf = 0, anim = { kind: 'idle', t0: now() }, parts = [], coins = [], ro = null;
      var hadPending = !!(d.quizMon && d.quizMon.pending && d.quizMon.pending[mid]);
      var lines = hadPending ? [m.short + '「さっきの問いの答えは出たか？　同じ問いだ。逃げずに答えてもらうぞ。」'] : rec.attempts > 0 ? [m.short + '「また来たのか。懲りないやつだ……いいだろう、もう一度だけ相手をしてやる！」'] : m.intro.slice();
      var stakeNow = Quiz.stealAmount(d.gold, m.steal);
      var head = '<div class="qb-wrap" data-mon="' + esc(m.id) + '">' +
        '<div class="qb-head"><div class="qb-name"><b>' + esc(m.name) + '</b><span class="qb-stars" title="難易度">' + stars(m.stars) + '</span></div><div class="qb-genre">' + esc(m.genre) + '</div></div>' +
        '<div class="qb-scene"><canvas class="qb-mon" aria-label="' + esc(m.name) + '"></canvas><div class="qb-say"></div><div class="qb-banner"></div><div class="qb-flash"></div></div>' +
        '<div class="qb-body">' +
          '<div class="qb-intro"><div class="qb-stake"><b>間違えた場合</b>：所持金の <em>' + pct(m.steal.rate) + '</em>（上限 <em>' + fmtG(m.steal.cap) + '</em>）を奪われる。' +
            '<div class="qb-stake-now">いまの所持金 ' + fmtG(d.gold) + ' → 間違えると <em>' + fmtG(stakeNow) + '</em> を奪われる</div>' +
            '<div class="qb-stake-note">HP・MP・仲間の状態は変わらない。ゲームオーバーにはならない。時間制限なし。正解すれば一撃で倒せる（報酬：経験値 ' + m.exp + '・' + fmtG(m.gold) + (rec.firstReward ? '' : '・初回は称号と記念アイテム') + '）</div></div></div>' +
          '<div class="qb-quiz hidden"><div class="qb-q"></div><div class="qb-chartbox hidden"><canvas class="qb-chart"></canvas></div><div class="qb-choices" role="radiogroup"></div><div class="qb-help"></div><details class="qb-data hidden"><summary>チャートのデータを数値で見る</summary><div class="qb-data-in"></div></details></div>' +
          '<div class="qb-judge hidden"></div>' +
          '<div class="qb-out hidden"></div>' +
        '</div>' +
        '<div class="qb-foot"></div></div>';

      function $(s) { return node.querySelector(s); }
      function say(text, cls) { var el = $('.qb-say'); el.className = 'qb-say ' + (cls || ''); el.innerHTML = text; if (!S.calm) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
      function banner(text, cls) { var el = $('.qb-banner'); el.className = 'qb-banner ' + (cls || '') + (S.calm ? ' calm' : ''); el.textContent = text; void el.offsetWidth; el.classList.add('on'); }
      function flash(cls) { if (S.calm) return; var f = $('.qb-flash'); f.className = 'qb-flash ' + cls; void f.offsetWidth; f.classList.add('on'); }
      function foot(btns) { var f = $('.qb-foot'); f.innerHTML = btns.map(function (b) { return '<button type="button" class="qb-btn ' + (b.cls || '') + '" data-k="' + b.k + '"' + (b.disabled ? ' disabled' : '') + '>' + b.label + '</button>'; }).join(''); f.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); act(b.getAttribute('data-k')); }); }); }
      function setStage(s) { stage = s; node.className = node.className.replace(/\bst-\w+/g, '').trim() + ' st-' + s; ['intro', 'quiz', 'judge', 'out'].forEach(function (k) { var el = $('.qb-' + k); if (el) el.classList.toggle('hidden', !(k === s || (k === 'quiz' && s === 'judge'))); }); fit(); var b = $('.qb-body'); if (b) b.scrollTop = 0; }

      /* --- 1. 自己紹介 --- */
      function intro() {
        setStage('intro'); var i = 0;
        function next() { if (closed || stage !== 'intro') return; if (i < lines.length) { say(esc(lines[i])); i++; QB._introTimer = setTimeout(next, S.calm ? 900 : 1500); } else say('<b>' + esc(m.challenge) + '</b>', 'big'); }
        next();
        foot([{ k: 'start', label: hadPending ? '問いに答える' : '挑む（問題を見る）', cls: 'primary' }, { k: 'leave', label: '今は挑まない', cls: 'sub' }]);
        if (root.Audio) { root.Audio.sfx('magic'); }
      }
      /* --- 2. 問題 --- */
      function quiz() {
        clearTimeout(QB._introTimer);
        pend = Quiz.begin(d, mid); if (!pend) { finish({ error: 'defeated' }); return; }
        qq = Quiz.question(pend.qid); State.autosave();   // 出した問題を保存（再読み込みしても同じ問題）
        order = Quiz.shuffle(qq, Quiz.rng(pend.seed)); sel = -1;
        say('<b>' + esc(m.challenge.split('！')[0] + '！') + '</b>', 'small');
        $('.qb-q').innerHTML = '<span class="qb-qid">' + esc(qq.id) + '｜' + esc(((root.QUIZ_CATS || {})[qq.cat] || {}).name || '') + '</span>' + esc(qq.q);
        var cb = $('.qb-chartbox'), dt = $('.qb-data');
        if (qq.chart) { cb.classList.remove('hidden'); dt.classList.remove('hidden'); $('.qb-data-in').innerHTML = QB.chartText(qq.chart); cb.classList.toggle('tall', qq.chart.type === 'lines' || qq.chart.type === 'divergence'); }
        else { cb.classList.add('hidden'); dt.classList.add('hidden'); }
        var help = Quiz.help(d, qq); var sch = help.school; var ms = masterOf(help.cat.school);
        var hh = '';
        if (help.hint) hh += '<div class="qb-hint"><b>師匠の教え</b>' + (ms ? '（' + esc(ms.name) + '）' : '') + '：' + esc(help.hint) + '</div>';
        else if (sch) hh += '<div class="qb-hint locked">この分野は <b>' + esc(sch.name) + '</b>' + (ms ? '（師匠：' + esc(ms.name) + '）' : '') + '。修行すると「師匠の教え」を思い出せる（答えるのに修行は必要ない）</div>';
        if (help.remove) hh += '<button type="button" class="qb-remove">誤りの選択肢を1つ消す（上級試験の合格者）</button>';
        $('.qb-help').innerHTML = hh;
        var rb = $('.qb-remove'); if (rb) rb.addEventListener('click', function (e) { e.stopPropagation(); removeOne(); });
        var long = qq.choices.some(function (t) { return t.length > 16; }), short = qq.choices.every(function (t) { return t.length <= 10; });
        var box = $('.qb-choices'); box.classList.toggle('one-col', long); box.classList.toggle('short', short);
        box.innerHTML = order.map(function (o, i) { return '<button type="button" class="qb-ch" role="radio" aria-checked="false" data-i="' + i + '"><span class="qb-key">' + 'ABCD'.charAt(i) + '</span><span class="qb-tx">' + esc(o.text) + '</span></button>'; }).join('');
        box.querySelectorAll('.qb-ch').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); choose(+b.getAttribute('data-i')); }); });
        setStage('quiz');
        foot([{ k: 'confirm', label: '答えを選んでください', cls: 'primary confirm', disabled: true }, { k: 'later', label: 'いったん離れる', cls: 'sub small' }]);
        if (qq.chart) { var ok = QB.drawChart($('.qb-chart'), qq.chart); if (!ok) { cb.classList.add('hidden'); dt.open = true; } }
      }
      function removeOne() {
        if (answered || removed >= 0 || !qq) return; var k = Quiz.removable(qq); removed = k;
        var idx = order.findIndex(function (o) { return o.orig === k; }); var b = node.querySelector('.qb-ch[data-i="' + idx + '"]'); if (b) { b.classList.add('removed'); b.disabled = true; }
        if (sel === idx) { sel = -1; renderSel(); }
        var rb = $('.qb-remove'); if (rb) { rb.disabled = true; rb.textContent = '誤りの選択肢を1つ消した'; }
      }
      function choose(i) {
        if (answered || stage !== 'quiz' || i < 0 || i >= order.length) return; if (order[i].orig === removed) return;
        sel = i; renderSel(); if (root.Audio) root.Audio.sfx('select');
      }
      function renderSel() {
        node.querySelectorAll('.qb-ch').forEach(function (b, i) { b.classList.toggle('cur', i === sel); b.setAttribute('aria-checked', i === sel ? 'true' : 'false'); });
        var c = node.querySelector('.qb-btn.confirm'); if (c) { c.disabled = sel < 0; c.innerHTML = sel < 0 ? '答えを選んでください' : 'この答えで確定（' + 'ABCD'.charAt(sel) + '）'; }
        var cur = node.querySelector('.qb-ch.cur'); if (cur && cur.scrollIntoView) try { cur.scrollIntoView({ block: 'nearest' }); } catch (e) { }
      }
      /* --- 3. 確定（1回だけ） → 判定・解説 --- */
      function confirmAnswer() {
        if (answered || stage !== 'quiz' || sel < 0 || !pend) return; answered = true;
        node.querySelectorAll('.qb-ch, .qb-remove, .qb-btn').forEach(function (b) { b.disabled = true; });   // 回答後は再操作できない
        goldBefore = d.gold;
        var Actors = root.Actors;
        result = Quiz.settle(d, { token: pend.token, mid: mid, qid: qq.id, orig: order[sel].orig, party: State.partyActors ? State.partyActors() : [], gainExp: Actors ? function (a, n) { return Actors.gainExp(a, n); } : null });
        if (result.error) { finish({ error: result.error }); return; }
        State.autosave();   // ゴールド・報酬・記録をまとめて保存（演出の前）
        if (root.PlayLog) root.PlayLog.add('quiz', { mid: mid, qid: qq.id, cat: qq.cat, ok: !!result.ok, stolen: result.stolen || 0, goldBefore: goldBefore, hint: !!Quiz.help(d, qq).hint, removed: removed >= 0, attempt: Quiz.rec(d, mid).attempts });   // プレイ記録
        if (root.World && root.World.updateHud) try { root.World.updateHud(); } catch (e) { }
        QB.last = result;
        var right = order.findIndex(function (o) { return o.orig === qq.answer; });
        node.querySelectorAll('.qb-ch').forEach(function (b, i) { b.classList.toggle('right', i === right); b.classList.toggle('wrong', i === sel && !result.ok); });
        if (result.ok) { banner('正解！', 'ok'); flash('ok'); anim = { kind: 'hit', t0: now() }; if (root.Audio) root.Audio.sfx('crit'); say(esc(m.short) + '「な、なにっ……!?」', 'small'); }
        else { banner('不正解……', 'ng'); flash('ng'); anim = { kind: 'smirk', t0: now() }; if (root.Audio) root.Audio.sfx('hurt'); say(esc(m.short) + '「ククク……かかったな！」', 'small'); }
        var j = $('.qb-judge');
        j.innerHTML = '<div class="qb-verdict ' + (result.ok ? 'ok' : 'ng') + '">' + (result.ok ? '正解！' : '不正解') + '</div>' +
          '<div class="qb-ans">正解：<b>' + 'ABCD'.charAt(right) + '. ' + esc(qq.choices[qq.answer]) + '</b>' + (result.ok ? '' : '<br>あなたの答え：' + 'ABCD'.charAt(sel) + '. ' + esc(order[sel].text)) + '</div>' +
          '<div class="qb-exp"><b>解説</b>　' + esc(qq.exp) + '</div>' +
          (qq.cat === 'uncertainty' || qq.cat === 'ev' || /とは限らない|保証/.test(qq.exp) ? '' : '<div class="qb-note">※ ルール・定義・計算の問題です。実際の相場の値動きは確率的で、条件を満たしても結果は保証されません。</div>');
        setStage('judge');
        var bd = $('.qb-body'); try { var ch = $('.qb-choices'); bd.scrollTop = Math.max(0, ch.getBoundingClientRect().top - bd.getBoundingClientRect().top + bd.scrollTop - 4); } catch (e) { }   // 選択肢（正解の色）と判定・解説が見える位置へ
        foot([{ k: 'next', label: result.ok ? 'とどめを刺す！' : '次へ', cls: 'primary' }]);
      }
      /* --- 4. 撃破／ゴールド強奪 --- */
      function outcome() {
        setStage('out'); var o = $('.qb-out'); var r = result; var L = [];
        if (r.ok) {
          anim = { kind: 'explode', t0: now() }; makeParticles(); flash('big'); if (root.Audio) { root.Audio.sfx('win'); setTimeout(function () { if (root.Audio) root.Audio.playJingle('victory'); }, 500); }
          setTimeout(function () { if (!closed) banner(m.short + 'を倒した！', 'ok'); }, S.calm ? 200 : 1100);
          say(esc(m.win[0]), 'small');
          L.push('<div class="qb-res ok"><b>' + esc(m.name) + 'を倒した！</b></div>');
          L.push('<div>経験値 <b>' + r.exp + '</b> を得た（戦える仲間それぞれ）</div>');
          L.push('<div><b>' + fmtG(r.gold) + '</b> を手に入れた（所持金 ' + fmtG(goldBefore) + ' → ' + fmtG(d.gold) + '）</div>');
          (r.ups || []).forEach(function (u) { var a = State.actor ? State.actor(u.id) : null; L.push('<div class="qb-up">' + esc(u.name) + 'はレベル' + (a ? a.level : '') + 'になった！</div>'); });
          if (r.first) { L.push('<div class="qb-first">初回の討伐：称号「<b>' + esc(r.title) + '</b>」を得た！</div>'); L.push('<div class="qb-first">大事なもの「<b>' + esc(m.item.name) + '</b>」を手に入れた！</div>'); }
          L.push('<div class="qb-small">' + esc(m.short) + 'は光の中に消えた。もう二度と現れない。</div>');
          if ((r.ups || []).length && root.Audio) setTimeout(function () { if (root.Audio) root.Audio.playJingle('levelup'); }, 1800);
        } else {
          anim = { kind: 'steal', t0: now() }; makeCoins(r.stolen); if (root.Audio) { root.Audio.sfx('coin'); setTimeout(function () { if (root.Audio) root.Audio.sfx('coin'); }, 260); }
          say('<b>' + esc(m.lose[0]) + '</b>', 'big');
          setTimeout(function () { if (!closed) banner(r.stolen > 0 ? '−' + fmtG(r.stolen) : '0G', 'ng'); }, S.calm ? 100 : 700);
          setTimeout(function () { if (!closed) say(esc(m.lose[1] || '') + '<br><small>' + esc(m.short) + 'は逃げていった……</small>', 'small'); }, S.calm ? 600 : 2200);
          L.push('<div class="qb-res ng"><b>' + (r.stolen > 0 ? 'ゴールドを ' + fmtG(r.stolen) + ' 奪われた！' : '所持金が 0G だったので、何も奪われなかった。') + '</b></div>');
          L.push('<div>所持金 ' + fmtG(goldBefore) + ' → <b>' + fmtG(d.gold) + '</b>（所持金の' + pct(m.steal.rate) + '・上限' + fmtG(m.steal.cap) + '）</div>');
          L.push('<div class="qb-small">HP・MP・仲間の状態は変わっていない。経験値・報酬はなし。</div>');
          L.push('<div class="qb-small">' + esc(m.short) + 'は逃げた。このマップに入り直すと、同じ場所にまた現れる（話しかけると再挑戦できる）。</div>');
          L.push('<div class="qb-gaan">ガーン……</div>');
        }
        o.innerHTML = L.join('');
        foot([{ k: 'close', label: 'フィールドに戻る', cls: 'primary' }]);
      }

      /* --- モンスターの描画・演出（Canvas） --- */
      function fit() {
        if (!cv) return; var r = cv.getBoundingClientRect(); var dpr = Math.min(2, root.devicePixelRatio || 1);
        var w = Math.max(60, Math.round(r.width)), h = Math.max(40, Math.round(r.height)); if (cv._w === w && cv._h === h) return; cv._w = w; cv._h = h; cv.width = w * dpr; cv.height = h * dpr; if (cx2) cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (node && stage !== 'quiz' && stage !== 'judge') node.classList.toggle('wide', w > h * 3.2);   // 横長（スマホの横向き）：吹き出しを右に、モンスターを左に
      }
      function artBox() {
        var w = cv._w || 200, h = cv._h || 120;
        if (stage === 'quiz' || stage === 'judge') { var s0 = Math.max(30, Math.min(h - 4, 72)); return { s: s0, x: 4, y: h - s0 - 2 }; }   // 問題の間は左に小さく
        if (node && node.classList.contains('wide')) { var sw = Math.max(40, Math.min(h - 6, w * 0.36)); return { s: sw, x: w * 0.2 - sw / 2, y: h - sw - 2 }; }
        var say = node && node.querySelector('.qb-say'); var top = say && say.offsetHeight ? say.offsetTop + say.offsetHeight + 2 : 4;   // 吹き出しの下に収める
        var s = Math.max(40, Math.min(h - top - 2, w * 0.62, 260)); return { s: s, x: w / 2 - s / 2, y: h - s - 2 };
      }
      function makeParticles() {
        parts = []; var art = root.QuizMonArt ? root.QuizMonArt.image(mid, 2, 0) : null; if (!art || !root.document) return; var b = artBox();
        try {
          var t = root.document.createElement('canvas'); var n = 48; t.width = n; t.height = n; var tc = t.getContext('2d'); tc.drawImage(art, 0, 0, n, n); var px = tc.getImageData(0, 0, n, n).data;
          var cxm = b.x + b.s / 2, cym = b.y + b.s / 2; var step = S.calm ? 3 : 2;
          for (var yy = 0; yy < n; yy += step) for (var xx = 0; xx < n; xx += step) { var k = (yy * n + xx) * 4; if (px[k + 3] < 80) continue; var x = b.x + (xx + 0.5) * b.s / n, y = b.y + (yy + 0.5) * b.s / n; var ang = Math.atan2(y - cym, x - cxm), sp = 40 + Math.random() * 160; parts.push({ x: x, y: y, vx: Math.cos(ang) * sp + (Math.random() - 0.5) * 40, vy: Math.sin(ang) * sp - 60 - Math.random() * 60, c: 'rgb(' + px[k] + ',' + px[k + 1] + ',' + px[k + 2] + ')', s: b.s / n * step }); }
        } catch (e) { parts = []; }
      }
      function makeCoins(n) { coins = []; var k = Math.min(12, Math.max(n > 0 ? 3 : 0, Math.round(Math.log(1 + n) * 2))); for (var i = 0; i < k; i++) coins.push({ d: i * 0.07, sx: (Math.random() - 0.5) * 120 }); }
      function draw() {
        if (closed) return; raf = (root.requestAnimationFrame || function (f) { return setTimeout(f, 33); })(draw);
        if (!cx2) return; var w = cv._w || 200, h = cv._h || 120; var t = (now() - anim.t0) / 1000; var T = now() / 1000;
        cx2.clearRect(0, 0, w, h);
        var art = root.QuizMonArt ? root.QuizMonArt.image(mid, 2, Math.floor(T * 2.5) % 4) : null; var b = artBox(); var mx = b.x + b.s / 2;
        // 足元のオーラ・立ちのぼる「？」
        if (anim.kind !== 'explode' || t < 0.4) {
          cx2.save(); var g = cx2.createRadialGradient ? cx2.createRadialGradient(mx, h - 6, 2, mx, h - 6, b.s * 0.6) : null; if (g) { g.addColorStop(0, 'rgba(' + m.aura + ',0.45)'); g.addColorStop(1, 'rgba(' + m.aura + ',0)'); cx2.fillStyle = g; } else cx2.fillStyle = 'rgba(' + m.aura + ',0.25)';
          cx2.beginPath(); if (cx2.ellipse) cx2.ellipse(mx, h - 6, b.s * 0.6, b.s * 0.16, 0, 0, Math.PI * 2); cx2.fill(); cx2.restore();
          if (!S.calm && stage !== 'out') { cx2.font = 'bold ' + Math.max(10, Math.round(b.s * 0.1)) + 'px sans-serif'; cx2.textAlign = 'center'; for (var i = 0; i < 4; i++) { var k = (T * 0.35 + i / 4) % 1; cx2.fillStyle = 'rgba(' + m.aura + ',' + (0.8 * (1 - k)).toFixed(2) + ')'; cx2.fillText('？', b.x + b.s * (0.15 + 0.7 * ((i * 0.37) % 1)), b.y + b.s * (0.9 - k * 0.8)); } }
        }
        if (!art) return;
        var ox = 0, oy = Math.round(Math.sin(T * 2.4) * (S.calm ? 0 : 2)), sc = 1, alpha = 1, white = 0;
        if (anim.kind === 'idle' && stage === 'intro' && t < 0.5 && !S.calm) { sc = 0.6 + 0.4 * Math.min(1, t / 0.5); alpha = Math.min(1, t / 0.4); }
        if (anim.kind === 'hit') { ox = S.calm ? 0 : Math.round(Math.sin(t * 60) * 4 * Math.max(0, 1 - t / 0.5)); white = Math.max(0, 0.8 - t * 1.6); }
        if (anim.kind === 'smirk') { oy -= S.calm ? 0 : Math.round(Math.abs(Math.sin(t * 9)) * 6 * Math.max(0, 1 - t / 1.2)); }
        if (anim.kind === 'explode') {
          if (t < 0.45) { white = Math.min(1, t / 0.3); ox = S.calm ? 0 : Math.round(Math.sin(t * 70) * 3); sc = 1 + t * 0.15; }
          else { alpha = 0; }
          // 光の筋（回転する光線）
          if (!S.calm && t < 1.4) { cx2.save(); cx2.translate(mx, b.y + b.s / 2); cx2.rotate(t * 1.6); var A = Math.max(0, Math.min(1, t < 0.45 ? t / 0.45 : 1 - (t - 0.45) / 0.95)); for (var r2 = 0; r2 < 12; r2++) { cx2.rotate(Math.PI / 6); cx2.fillStyle = 'rgba(255,250,220,' + (0.35 * A).toFixed(2) + ')'; cx2.beginPath(); cx2.moveTo(0, 0); cx2.lineTo(w, -10); cx2.lineTo(w, 10); cx2.closePath(); cx2.fill(); } cx2.restore(); }
          if (t >= 0.45) { var dt = Math.min(2.2, t - 0.45); parts.forEach(function (p) { var a = Math.max(0, 1 - dt / 1.6); if (a <= 0) return; cx2.globalAlpha = a; cx2.fillStyle = p.c; cx2.fillRect(p.x + p.vx * dt, p.y + p.vy * dt + 140 * dt * dt, p.s, p.s); }); cx2.globalAlpha = 1;
            if (t < 0.9 && !S.calm) { var rr = (t - 0.45) * b.s * 2.4; cx2.strokeStyle = 'rgba(255,240,180,' + (1 - (t - 0.45) / 0.45).toFixed(2) + ')'; cx2.lineWidth = 6; cx2.beginPath(); cx2.arc(mx, b.y + b.s / 2, rr, 0, Math.PI * 2); cx2.stroke(); } }
        }
        if (anim.kind === 'steal') {
          if (t > 1.6) { var ft = t - 1.6; ox = Math.round(ft * ft * w * 1.4); alpha = Math.max(0, 1 - ft / 0.9); if (!S.calm) { for (var sm = 0; sm < 5; sm++) { var sa = Math.max(0, 0.5 - ft * 0.4); cx2.fillStyle = 'rgba(220,220,230,' + sa.toFixed(2) + ')'; cx2.beginPath(); cx2.arc(mx + ox - b.s * 0.3 - sm * 14, h - 14 - (sm % 2) * 8, 8 + ft * 14, 0, Math.PI * 2); cx2.fill(); } } }
          else oy -= S.calm ? 0 : Math.round(Math.abs(Math.sin(t * 10)) * 5);
          // 金貨が主人公の側（下）からモンスターへ
          coins.forEach(function (c) { var ct = t - c.d; if (ct < 0 || ct > 0.9) return; var k = ct / 0.9; var x = mx + c.sx * (1 - k), y = h + 10 - (h + 10 - (b.y + b.s * 0.55)) * k - Math.sin(k * Math.PI) * 30; cx2.fillStyle = '#ffd24a'; cx2.beginPath(); cx2.arc(x, y, 5, 0, Math.PI * 2); cx2.fill(); cx2.fillStyle = '#b8862a'; cx2.fillRect(x - 1, y - 3, 2, 6); });
        }
        if (alpha <= 0) return;
        var S2 = b.s * sc; var dx = Math.round(mx - S2 / 2 + ox), dy = Math.round(b.y + b.s - S2 + oy);
        cx2.save(); cx2.globalAlpha = alpha; cx2.imageSmoothingEnabled = false; cx2.drawImage(art, dx, dy, Math.round(S2), Math.round(S2)); cx2.restore();
        if (white > 0) { var tmp = QB._tmp || (QB._tmp = root.document.createElement('canvas')); tmp.width = art.width; tmp.height = art.height; var tc = tmp.getContext('2d'); tc.clearRect(0, 0, tmp.width, tmp.height); tc.drawImage(art, 0, 0); tc.globalCompositeOperation = 'source-atop'; tc.fillStyle = '#ffffff'; tc.fillRect(0, 0, tmp.width, tmp.height); tc.globalCompositeOperation = 'source-over'; cx2.save(); cx2.globalAlpha = Math.min(1, white) * alpha; cx2.imageSmoothingEnabled = false; cx2.drawImage(tmp, dx, dy, Math.round(S2), Math.round(S2)); cx2.restore(); }
      }

      /* --- 操作 --- */
      function act(k) {
        if (closed) return;
        if (k === 'start' && stage === 'intro') quiz();
        else if (k === 'leave' && stage === 'intro') finish({ left: true });
        else if (k === 'later' && stage === 'quiz' && !answered) leaveLater();
        else if (k === 'confirm') confirmAnswer();
        else if (k === 'next' && stage === 'judge') outcome();
        else if (k === 'close' && stage === 'out') finish({ result: result });
      }
      async function leaveLater() {
        var yes = await Win.choice('いったん離れますか？（ゴールドは奪われません。次に挑むときは同じ問題です）', ['離れる', '問題に戻る'], { initial: 1 }); if (yes === 0 && !answered) finish({ left: true, pending: true });
      }
      function onKeyDoc(e) {
        if (closed) return; var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT')) return;
        if (Win.layer && Win.layer.lastElementChild !== node) return;
        var k = e.key; var used = true;
        if (/^[1-4]$/.test(k) && stage === 'quiz') choose(+k - 1);
        else if (/^[a-dA-D]$/.test(k) && stage === 'quiz') choose('abcd'.indexOf(k.toLowerCase()));
        else used = false;
        if (used) { e.preventDefault(); e.stopPropagation(); }
      }
      function onOk() {
        if (stage === 'intro') act('start');
        else if (stage === 'quiz') { if (sel >= 0) confirmAnswer(); else { sel = order.findIndex(function (o) { return o.orig !== removed; }); renderSel(); } }
        else if (stage === 'judge') act('next');
        else if (stage === 'out') act('close');
      }
      function onCancel() { if (stage === 'intro') act('leave'); else if (stage === 'quiz' && !answered) leaveLater(); else if (stage === 'out') act('close'); }
      function onArrow(k) {
        if (stage !== 'quiz' || answered) { var b = $('.qb-body'); if (b && (k === 'up' || k === 'down')) b.scrollTop += k === 'down' ? 60 : -60; return; }
        var n = order.length; if (!n) return; var i = sel < 0 ? (k === 'up' || k === 'left' ? n : -1) : sel; var step = (k === 'up' || k === 'left') ? -1 : 1;
        for (var c = 0; c < n; c++) { i = (i + step + n) % n; if (order[i].orig !== removed) break; } choose(i);
      }
      function finish(r) {
        if (closed) return; closed = true; QB.isOpen = false; clearTimeout(QB._introTimer);
        if (raf) { if (root.cancelAnimationFrame) root.cancelAnimationFrame(raf); clearTimeout(raf); }
        document.removeEventListener('keydown', onKeyDoc, true); root.removeEventListener('resize', fit); if (ro) { try { ro.disconnect(); } catch (e) { } }
        var st = document.getElementById('stage'); if (st) st.classList.remove('ult-open', 'quiz-open');
        if (closeFn) closeFn(r); resolve(r);
      }
      var st0 = document.getElementById('stage'); if (st0) st0.classList.add('quiz-open');
      QB.isOpen = true;
      Win.panel(head, { cls: 'quiz-battle st-intro' + (S.calm ? ' calm' : '') + ' qm-' + m.no, noClose: true, onOk: onOk, onCancel: onCancel, onKey: onArrow,
        setup: function (n, close) {
          node = n; closeFn = close; cv = n.querySelector('.qb-mon'); try { cx2 = cv.getContext('2d'); } catch (e) { cx2 = null; }
          n.addEventListener('click', function (e) { e.stopPropagation(); });
          document.addEventListener('keydown', onKeyDoc, true); root.addEventListener('resize', fit);
          if (root.ResizeObserver) { try { ro = new root.ResizeObserver(function () { if (!closed) { fit(); if (qq && qq.chart && stage !== 'intro') QB.drawChart(n.querySelector('.qb-chart'), qq.chart); } }); ro.observe(n.querySelector('.qb-scene')); ro.observe(n.querySelector('.qb-chartbox')); } catch (e) { ro = null; } }
          fit(); intro(); draw();
        } });
      // テスト・自動操作用（画面のボタンと同じ処理）
      QB.ctl = { act: act, choose: choose, confirm: confirmAnswer, remove: removeOne, ok: onOk, cancel: onCancel,
        state: function () { return { stage: stage, qid: qq && qq.id, sel: sel, answered: answered, order: order.map(function (o) { return o.orig; }), removed: removed, result: result, token: pend && pend.token }; },
        correctIndex: function () { return order.findIndex(function (o) { return qq && o.orig === qq.answer; }); } };
    });
  };

  /* ---------- クイズモンスター図鑑（討伐・挑戦の記録・称号・分野ごとの正答率） ---------- */
  QB.artURL = function (mid) { try { var c = root.QuizMonArt && root.QuizMonArt.image(mid, 2, 0); return c && c.toDataURL ? c.toDataURL() : (c && c.src) || ''; } catch (e) { return ''; } };
  QB.bestiary = async function () {
    var Quiz = root.Quiz, d = root.State.data; if (!Quiz) return; var q = Quiz.ensure(d); var L = root.QUIZ_MONSTERS || [];
    while (true) {
      var items = L.map(function (m) { var r = q.mon[m.id]; var known = r.seen || r.attempts > 0 || r.defeated; return { label: (known ? m.name : '？？？') + '　' + stars(m.stars), right: r.defeated ? '討伐済み' : r.attempts ? '挑戦中' : known ? '発見' : '未発見', sub: m.genre + (known ? '｜' + m.place : '') }; });
      items.push({ label: '分野ごとの正答率・称号', right: '' });
      var i = await Win.list(items, { title: 'クイズモンスター図鑑（討伐 ' + L.filter(function (m) { return q.mon[m.id].defeated; }).length + '/' + L.length + '）' });
      if (i < 0) return;
      if (i === L.length) { await QB.masteryPanel(); continue; }
      var m = L[i], r = q.mon[m.id]; var known = r.seen || r.attempts > 0 || r.defeated;
      var img = known ? QB.artURL(m.id) : '';
      var html = '<div class="rw-title">' + (known ? esc(m.name) : '？？？') + '　<span class="qb-stars">' + stars(m.stars) + '</span></div><div class="qbz">' +
        (img ? '<img class="qbz-img" src="' + img + '" alt="">' : '<div class="qbz-img qbz-unk">？</div>') + '<div class="qbz-tx">' +
        '<div>分野：' + esc(m.genre) + '</div>' + (known ? '<div>出現：' + esc(m.place) + '</div>' : '<div class="muted small">まだ出会っていない。</div>') +
        '<div>状態：' + (r.defeated ? '<b class="gold-text">討伐済み</b>' : r.attempts ? '挑戦中（同じ場所に現れる）' : '未挑戦') + '</div>' +
        '<div>挑戦 ' + r.attempts + '回／正解 ' + r.correct + '／不正解 ' + r.wrong + '／奪われたゴールド 累計 ' + fmtG(r.stolen) + '</div>' +
        '<div class="muted small">間違えたとき：所持金の' + pct(m.steal.rate) + '（上限' + fmtG(m.steal.cap) + '）</div>' +
        (r.firstReward ? '<div>称号「' + esc(m.title) + '」／記念：' + esc(m.item.name) + '</div>' : '') + '</div></div>';
      await Win.panel(html, { cls: 'qbz-panel' });
    }
  };
  QB.masteryPanel = function () {
    var Quiz = root.Quiz, d = root.State.data; var q = Quiz.ensure(d); var ms = Quiz.mastery(d); var keys = Object.keys(ms);
    var rows = keys.length ? keys.map(function (k) { var o = ms[k]; var r = o.n ? Math.round(o.ok / o.n * 100) : 0; return '<tr><td>' + esc(o.name) + '</td><td>' + o.ok + '/' + o.n + '</td><td>' + r + '%</td></tr>'; }).join('') : '<tr><td colspan="3" class="muted">まだ記録がない</td></tr>';
    var html = '<div class="rw-title">トレード知識の記録（クイズモンスター）</div><div>称号：' + (q.titles.length ? q.titles.map(function (t) { return '「' + esc(t) + '」'; }).join(' ') : '<span class="muted">なし</span>') + '</div>' +
      '<table class="qb-tbl qbz-tbl"><tr><th>分野</th><th>正解/回答</th><th>正答率</th></tr>' + rows + '</table><div class="muted small">答えた問題の分野ごとの集計（同じ問題に何度答えても数える）。</div>';
    return Win.panel(html);
  };

  root.QuizBattleUI = QB;
})(typeof window !== 'undefined' ? window : globalThis);
