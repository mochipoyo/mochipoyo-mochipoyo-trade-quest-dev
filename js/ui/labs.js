/* =========================================================
   UI / Labs (v6.1) : ラックスベルの「確率研究室」「投資戦略研究室」の画面
   ・計算は js/rpg/labsim.js（LabSim）。ここは表示と、初回の学習報酬（カジノコイン）だけ
   ・どの画面も「確認できる事実（数学）」と「注意（保証しないこと）」を分けて書く
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win, State = root.State; var esc = Win.esc;
  var Labs = {};
  function LS() { return root.LabSim; }
  function lab() { var c = root.Casino.state(); c.lab = c.lab || {}; c.lab.rewards = c.lab.rewards || {}; return c.lab; }
  function pct(v, d) { return (v * 100).toFixed(d === undefined ? 1 : d) + '%'; }
  function num(v, d) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d === undefined ? 2 : d); }
  // 初回だけの学習報酬（カジノコイン）。二重には受け取れない
  Labs.REWARDS = { lln: 200, ev: 300, fallacy: 200, martingale: 100, strategy: 300 };
  Labs.reward = async function (key) {
    var L = lab(); if (L.rewards[key]) return false; L.rewards[key] = true; root.Casino.addCoins(Labs.REWARDS[key]);
    if (root.Audio) root.Audio.sfx('coin'); if (root.World && root.World.autosave) root.World.autosave();
    await Win.message(['研究室から学習の記念として、カジノコイン ' + Labs.REWARDS[key] + '枚を受け取った！（この報酬は1回だけ）']); return true;
  };

  /* ---------- SVG の折れ線グラフ ---------- */
  Labs.chart = function (o) {
    var W = o.w || 520, H = o.h || 200, L = 44, R = 10, T = 10, B = 24; var iw = W - L - R, ih = H - T - B;
    var xr = o.xr, yr = o.yr; var lx = o.xlog;
    function X(v) { return L + (lx ? (Math.log(Math.max(1, v)) / Math.log(xr[1])) : (v - xr[0]) / (xr[1] - xr[0] || 1)) * iw; }
    function Y(v) { return T + (1 - (v - yr[0]) / (yr[1] - yr[0] || 1)) * ih; }
    var s = '<svg class="lab-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet"><rect x="' + L + '" y="' + T + '" width="' + iw + '" height="' + ih + '" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.15)"/>';
    (o.yticks || []).forEach(function (v) { s += '<line x1="' + L + '" x2="' + (L + iw) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="rgba(255,255,255,.08)"/><text x="' + (L - 4) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="#bbb">' + esc(o.yfmt ? o.yfmt(v) : v) + '</text>'; });
    (o.xticks || []).forEach(function (v) { s += '<text x="' + X(v).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#bbb">' + esc(o.xfmt ? o.xfmt(v) : v) + '</text>'; });
    (o.hlines || []).forEach(function (h) { s += '<line x1="' + L + '" x2="' + (L + iw) + '" y1="' + Y(h.y).toFixed(1) + '" y2="' + Y(h.y).toFixed(1) + '" stroke="' + h.color + '" stroke-dasharray="5 4" stroke-width="1.5"/>' + (h.label ? '<text x="' + (L + iw - 4) + '" y="' + (Y(h.y) - 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="' + h.color + '">' + esc(h.label) + '</text>' : ''); });
    (o.series || []).forEach(function (se) { if (!se.pts.length) return; s += '<polyline fill="none" stroke="' + se.color + '" stroke-width="' + (se.width || 1.8) + '"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') + ' stroke-linejoin="round" points="' + se.pts.filter(function (p) { return p[1] !== null && p[1] !== undefined; }).map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>'; });
    (o.markers || []).forEach(function (m) { var x = X(m.x), y = Y(m.y); var c = m.color || '#fff';
      if (m.shape === 'up') s += '<path d="M' + x.toFixed(1) + ' ' + (y - 2).toFixed(1) + ' l-5 9 h10 z" fill="' + c + '"><title>' + esc(m.title || '') + '</title></path>';
      else if (m.shape === 'x') s += '<path d="M' + (x - 5).toFixed(1) + ' ' + (y - 5).toFixed(1) + ' l10 10 M' + (x + 5).toFixed(1) + ' ' + (y - 5).toFixed(1) + ' l-10 10" stroke="' + c + '" stroke-width="2.4"><title>' + esc(m.title || '') + '</title></path>';
      else s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + c + '"><title>' + esc(m.title || '') + '</title></circle>'; });
    if (o.ylabel) s += '<text x="4" y="' + (T + 8) + '" font-size="10" fill="#ddd">' + esc(o.ylabel) + '</text>';
    return s + '</svg>';
  };
  var COLORS = ['#ffd24a', '#6fd0ff', '#ff8a7a', '#8de08d', '#c9a2ff', '#ffb86a'];
  function box(kind, title, body) { return '<div class="lab-box ' + kind + '"><div class="lab-box-t">' + esc(title) + '</div>' + body + '</div>'; }

  /* ---------- 大数の法則 ---------- */
  Labs.lln = function () {
    var ev = 'coin', n = 100, runs = [];
    var EVS = LS().LLN_EVENTS;
    var html = '<div class="rw-title">確率の試練①　大数の法則の実験</div>' +
      '<div class="small gold-text">何を試す？</div><div class="cs-row wrap">' + Object.keys(EVS).map(function (k) { return '<button class="cs-btn" data-ev="' + k + '">' + esc(EVS[k].name) + '</button>'; }).join('') + '</div>' +
      '<div class="small gold-text">何回くり返す？</div><div class="cs-row">' + [100, 1000, 10000].map(function (v) { return '<button class="cs-btn" data-n="' + v + '">' + v.toLocaleString() + '回</button>'; }).join('') + '<button class="cs-btn go" data-run>実験する（決定キー）</button><button class="cs-btn" data-clear>グラフを消す</button></div>' +
      '<div data-chart></div><div data-res class="small"></div>' +
      box('fact', '確認できる事実（数学）', '<p class="small">同じ条件で独立にくり返すと、出た割合（相対頻度）は、回数を増やすほど理論上の確率に近づいていく傾向がある。これを「大数の法則」という。</p>') +
      box('warn', '注意（保証しないこと）', '<p class="small">・「近づく傾向」であって、ぴったり一致するとは限らない。回数が少ないほどぶれが大きい（同じ回数でも試すたびに結果が違う）。<br>・期待値がマイナスのゲームを長く続けるほど、平均はマイナスの理論値に近づいていく。長く遊べば取り返せる、という意味ではない。<br>・大数の法則は、1人のプレイヤーの損益や、次の1回の結果を保証しない。過去の結果が次の結果を変えることもない。<br>・ここの実験はコンピュータの擬似乱数によるもの。</p>') +
      '<div class="rw-row"><div class="rw-btn" data-close>やめる（Esc）</div></div>';
    return Win.panel(html, { cls: 'casino-panel lab-panel', noClose: true, onCancel: function () { if (Labs._close) Labs._close(); }, onOk: function () { if (Labs._run) Labs._run(); }, setup: function (node, close) {
      Labs._close = function () { Labs._close = null; Labs._run = null; close(0); };
      function upd() {
        node.querySelectorAll('[data-ev]').forEach(function (e) { e.classList.toggle('on', e.getAttribute('data-ev') === ev); });
        node.querySelectorAll('[data-n]').forEach(function (e) { e.classList.toggle('on', +e.getAttribute('data-n') === n); });
        var same = runs.filter(function (r) { return r.key === ev; }); var p = same.length ? same[0].p : (EVS[ev].p !== null ? EVS[ev].p : root.Casino.slotTable().rtp);
        var maxN = same.reduce(function (m, r) { return Math.max(m, r.n); }, n); var isSlot = ev === 'slot';
        var lo = isSlot ? 0 : Math.max(0, p - 0.3), hi = isSlot ? 2.5 : Math.min(1, p + 0.3);
        var series = same.map(function (r, i) { return { pts: r.path.map(function (q) { return [q[0], Math.max(lo, Math.min(hi, q[1]))]; }), color: COLORS[i % COLORS.length] }; });
        var ticks = [1, 10, 100, 1000, 10000].filter(function (v) { return v <= maxN; });
        node.querySelector('[data-chart]').innerHTML = Labs.chart({ w: 540, h: 210, xr: [1, maxN], yr: [lo, hi], xlog: true, xticks: ticks, xfmt: function (v) { return v.toLocaleString() + '回'; }, yticks: isSlot ? [0, 0.5, 1, 1.5, 2, 2.5] : [lo, p, hi].map(function (v) { return +v.toFixed(2); }), yfmt: function (v) { return isSlot ? v.toFixed(1) : pct(v, 0); }, hlines: [{ y: p, color: '#fff', label: '理論値 ' + (isSlot ? pct(p) : pct(p)) }], series: series, ylabel: EVS[ev].unit });
        node.querySelector('[data-res]').innerHTML = same.length ? '<table class="tbl cs-tbl"><tr><th>色</th><th>回数</th><th>結果</th><th>理論値</th><th>ずれ</th></tr>' + same.map(function (r, i) { return '<tr><td><span class="lab-dot" style="background:' + COLORS[i % COLORS.length] + '"></span></td><td>' + r.n.toLocaleString() + '</td><td>' + (isSlot ? r.freq.toFixed(3) + '枚（' + pct(r.freq) + '）' : r.sum + '回＝' + pct(r.freq, 2)) + '</td><td>' + pct(r.p, 2) + '</td><td>' + (r.diff >= 0 ? '+' : '−') + Math.abs(r.diff * 100).toFixed(2) + 'ポイント</td></tr>'; }).join('') + '</table>' : '<span class="muted">「実験する」を押すと、結果がグラフになります（横軸は回数の対数目盛り）。</span>';
      }
      Labs._run = function () {
        var r = LS().lln(ev, n); var first = -1, cnt = 0; runs.forEach(function (x, i) { if (x.key === ev) { cnt++; if (first < 0) first = i; } }); if (cnt >= 6) runs.splice(first, 1); runs.push(r);   // 同じ実験は6本まで重ねて表示
        var L = lab(); L.lln = L.lln || {}; L.lln[n] = (L.lln[n] || 0) + 1; upd();
        if (L.lln[100] && L.lln[1000] && L.lln[10000] && !L.rewards.lln) Labs.reward('lln');
      };
      node.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ev]'); if (b) { ev = b.getAttribute('data-ev'); upd(); return; }
        b = e.target.closest('[data-n]'); if (b) { n = +b.getAttribute('data-n'); upd(); return; }
        if (e.target.closest('[data-run]')) { Labs._run(); return; }
        if (e.target.closest('[data-clear]')) { runs = runs.filter(function (x) { return x.key !== ev; }); upd(); return; }
        if (e.target.closest('[data-close]')) Labs._close();
      });
      upd();
    } });
  };

  /* ---------- 期待値の問題 ---------- */
  Labs.EV_QUESTIONS = [
    { q: 'ルーレットで「赤」に10枚賭ける。当たる確率は18/37で、当たれば20枚が戻る（もうけ10枚）。1回あたりの期待値（損益）は？', opts: ['約+0.27枚', '0枚', '約−0.27枚', '−10枚'], a: 2, ex: '期待値＝18/37×20−10＝約9.73−10＝約−0.27枚。賭け金の約−2.7%。' },
    { q: 'サイコロで「1」が出たら賭け金の5倍が戻る（もうけ4倍）。それ以外は没収。賭け金に対する期待値は？', opts: ['+20%', '0%', '約−16.7%', '−50%'], a: 2, ex: '1/6×5−1＝5/6−1＝−1/6＝約−16.7%。' },
    { q: '勝率40%、勝てば+30、負ければ−10になるトレード手法。1回あたりの期待値は？', opts: ['+6', '+2', '−2', '−6'], a: 0, ex: '0.4×30−0.6×10＝12−6＝+6。勝率が50%未満でも、利益が損失より十分大きければ期待値はプラスになりうる。' },
    { q: '勝率60%、平均利益+10、平均損失−20のトレード手法。1回あたりの期待値は？', opts: ['+4', '+2', '0', '−2'], a: 3, ex: '0.6×10−0.4×20＝6−8＝−2。勝率が高くても、損失が大きければ期待値はマイナスになる。' },
    { q: '利益が損失の2倍（リスクリワード1:2）の手法。損益がとんとんになる勝率は？', opts: ['約25%', '約33.3%', '50%', '約66.7%'], a: 1, ex: '損失を1とすると、勝率p×2−(1−p)×1＝0 → p＝1/3＝約33.3%。一般に、損益分岐の勝率＝1÷(1＋リスクリワード比)。' },
    { q: '当たる確率1%、当たれば賭け金の90倍が戻る。賭け金に対する期待値は？', opts: ['+80%', '−1%', '−10%', '−90%'], a: 2, ex: '0.01×90−1＝0.9−1＝−0.1＝−10%。大きな配当でも、確率と合わせて考える。' },
    { q: 'このカジノのスロットの還元率は約94.7%。合計1,000枚賭けたとき、払い戻しの期待値は？', opts: ['約1,000枚', '約947枚', '約500枚', '必ず947枚ちょうど'], a: 1, ex: '1,000×0.947＝約947枚。ただし期待値は平均の話で、実際の結果はもっと上下にぶれる。「必ず」ではない。' },
    { q: '期待値がプラスの手法でも、毎回資金のほとんどを1回の取引に使うと、どうなりやすい？', opts: ['期待値どおりに増える', '連敗で資金が尽き、続けられなくなる危険が高い', '勝率が上がる', '期待値がさらに増える'], a: 1, ex: '期待値がプラスでも、1回の損失が大きすぎると数回の連敗で退場する（破産のリスク）。期待値は「続けられる資金管理」と組み合わせて意味を持つ。' }
  ];
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  Labs.evQuiz = async function () {
    var qs = shuffle(Labs.EV_QUESTIONS.slice()).slice(0, 5); var ok = 0;
    await Win.message(['確率学者「期待値＝（起こる確率×そのときの損益）をすべて足したもの。5問、計算してみよう」']);
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i]; var a = await Win.choice('【' + (i + 1) + '/5】' + q.q, q.opts, { cancel: false });
      if (a === q.a) { ok++; if (root.Audio) root.Audio.sfx('coin'); await Win.message(['正解！', q.ex]); } else await Win.message(['正解は「' + q.opts[q.a] + '」。', q.ex]);
    }
    var L = lab(); L.ev = Math.max(L.ev || 0, ok); await Win.message(['期待値の問題：' + ok + '/5 問正解。']);
    if (ok >= 4) await Labs.reward('ev'); else if (!L.rewards.ev) await Win.message(['4問以上正解すると、研究室から学習の記念が出ます。']);
    return ok;
  };

  /* ---------- ギャンブラーの誤謬 ---------- */
  Labs.FALLACY = [
    { q: 'ルーレットで「赤」が5回続けて出た。次に「赤」が出る確率は？', opts: ['5回続いたので下がる', '18/37（約48.6%）のまま', '取り返すように上がる', '50%ちょうどになる'], a: 1, ex: '1回ごとの結果は独立。前に何が出ても、次の赤の確率は18/37のまま（0があるので50%ではない）。' },
    { q: '公平なコインで「表」が10回続いた。次に「表」が出る確率は？', opts: ['1/2', '1/1024', 'ほぼ0', '9/10'], a: 0, ex: '「10回続く」こと自体は珍しい（1/1024）が、すでに起きた10回は次の1回に影響しない。次の表は1/2。' },
    { q: '「このスロットは300回も大当たりが出ていない。そろそろ出るはずだ」——正しい？', opts: ['正しい。出やすくなっている', '誤り。毎回の確率は変わらない', '正しい。機械が調整する', '誤り。もう二度と出ない'], a: 1, ex: 'このカジノのスロットは毎回独立の抽選。はずれが続いても確率は変わらない（隠れた調整もない）。' },
    { q: 'トレードで5連敗した。次のトレードについて、いちばん適切な考えは？', opts: ['次は勝つ番なので枚数を増やす', '連敗だけで判断せず、手法の期待値と相場環境が変わっていないかを検証する', 'もう二度と勝てない', '負けを取り返すまで続ける'], a: 1, ex: '連敗で「次は勝つ」と考えるのはギャンブラーの誤謬。ただし相場は毎回同じ条件とは限らないので、手法が今の相場に合っているかの検証は必要。枚数を増やして取り返そうとするのは危険。' }
  ];
  Labs.fallacy = async function () {
    var ok = 0;
    for (var i = 0; i < Labs.FALLACY.length; i++) {
      var q = Labs.FALLACY[i]; var a = await Win.choice('【' + (i + 1) + '/' + Labs.FALLACY.length + '】' + q.q, q.opts, { cancel: false });
      if (a === q.a) { ok++; await Win.message(['正解！', q.ex]); } else await Win.message(['正解は「' + q.opts[q.a] + '」。', q.ex]);
    }
    var c = await Win.choice('確率学者「実際にルーレットを10万回まわして、『赤が5回続いた直後』だけを数えてみるかね？」', ['実験する', 'やめる']);
    if (c === 0) { var r = LS().streak(5, 100000); await Win.message(['10万回のうち、赤が5回以上続いた直後は ' + r.cases + '回。', 'そのうち次も赤だったのは ' + r.nextRed + '回＝' + pct(r.freq, 1) + '。いつもの赤の確率 ' + pct(r.p, 1) + ' とほぼ同じ（試すたびに少しずつずれる）。', '連続した後でも、次の確率は変わらない。']); }
    var L = lab(); L.fallacy = Math.max(L.fallacy || 0, ok);
    if (ok >= 3) await Labs.reward('fallacy');
    return ok;
  };

  /* ---------- マーチンゲール法の実験 ---------- */
  Labs.martingale = async function () {
    await Win.message(['確率学者「マーチンゲール法：赤に1枚。負けたら賭けを2倍、勝ったら1枚に戻す。1回勝てばそれまでの負けを取り返して1枚もうかる……という考え方だ」', '「1,000人が、手持ち100枚・目標+20枚・1回の上限100枚で試すとどうなるか、見てみよう」']);
    var r = LS().martingale({ players: 1000, bank: 100, goal: 20, limit: 100 });
    var keys = Object.keys(r.hist); var mx = Math.max.apply(null, keys.map(function (k) { return r.hist[k]; }));
    var html = '<div class="rw-title">マーチンゲール法の実験（1,000人）</div>' +
      '<div class="lab-bars">' + keys.map(function (k) { return '<div class="lab-bar"><span class="l">' + esc(k) + '</span><span class="b"><i style="width:' + (r.hist[k] / mx * 100).toFixed(1) + '%"></i></span><span class="r">' + r.hist[k] + '人</span></div>'; }).join('') + '</div>' +
      '<p class="small">目標を達成した人：' + r.reached + '人。連敗で倍にできなくなった人：' + r.broke + '人（いちばん大きな負け ' + r.worst + '枚）。<br>1人あたりの平均：<b>' + num(r.avg, 1) + '枚</b>。賭けた合計 ' + r.wagered.toLocaleString() + '枚に対して <b>' + pct(r.perBet, 2) + '</b>（理論値 ' + pct(r.theory, 2) + '）。</p>' +
      box('fact', '確認できる事実（数学）', '<p class="small">賭け方を変えても、1回ごとの期待値（赤なら約−2.7%）は変わらない。マーチンゲール法は「小さく勝つ人が多く、まれに大きく負ける人が出る」形に結果を並べ替えるだけで、全体の平均はマイナスのまま。</p>') +
      box('warn', '注意', '<p class="small">連敗は必ずいつか来る（赤が7回続けて出ない確率も約1%ある）。倍々の賭けは資金と上限にすぐ届く。トレードで「負けたらロットを倍にする」のも同じ危険を持つ。結果は乱数で毎回変わる。</p>');
    await Win.panel(html, { cls: 'lab-panel' });
    var L = lab(); L.martingale = (L.martingale || 0) + 1; await Labs.reward('martingale');
  };

  /* ---------- 投資戦略研究室：増し玉の比較 ---------- */
  function strategyChart(r, opts) {
    opts = opts || {}; var px = r.px; var t1 = opts.until !== undefined ? opts.until : px.length - 1;
    var pts = px.slice(0, t1 + 1).map(function (v, i) { return [i, v]; }); var lo = Math.floor(Math.min.apply(null, px) - 1), hi = Math.ceil(Math.max.apply(null, px) + 1);
    if (opts.hide) { lo = 90; hi = 112; }
    var ms = (r.log || []).filter(function (l) { return l.bar <= t1 && (l.type === 'entry' || l.type === 'add' || l.type === 'exit'); }).map(function (l) { return { x: l.bar, y: l.price, shape: l.type === 'exit' ? 'x' : 'up', color: l.type === 'exit' ? '#ff8a7a' : l.type === 'entry' ? '#ffd24a' : '#8de08d', title: l.text }; });
    var stopPts = (r.stops || []).filter(function (s) { return s[0] <= t1; });
    var series = [{ pts: pts, color: '#6fd0ff', width: 2 }]; if (stopPts.length) series.push({ pts: stopPts, color: '#ff8a7a', dash: '4 3', width: 1.4 });
    var hl = [{ y: 100, color: 'rgba(255,255,255,.35)', label: '最初の建値 100' }];
    return Labs.chart({ w: 540, h: 190, xr: [0, 59], yr: [lo, hi], xticks: [0, 10, 20, 30, 40, 50, 59], xfmt: function (v) { return v + '本目'; }, yticks: [lo, Math.round((lo + hi) / 2), hi], series: series, markers: ms, hlines: hl, ylabel: '価格（▲建てた所・✕決済・赤い点線＝損切り）' });
  }
  function eqChart(rs) {
    var all = []; rs.forEach(function (r) { r.eq.forEach(function (p) { all.push(p[1]); }); }); var lo = Math.floor(Math.min.apply(null, all.concat([0])) / 10) * 10 - 5, hi = Math.ceil(Math.max.apply(null, all.concat([0])) / 10) * 10 + 5;
    return Labs.chart({ w: 540, h: 170, xr: [0, 59], yr: [lo, hi], xticks: [0, 20, 40, 59], xfmt: function (v) { return v + '本目'; }, yticks: [lo, 0, hi], series: rs.map(function (r, i) { return { pts: [[0, 0]].concat(r.eq), color: COLORS[i % COLORS.length] }; }), hlines: [{ y: 0, color: 'rgba(255,255,255,.4)' }], ylabel: '含み損益の推移（色は下の表と同じ）' });
  }
  Labs.strategy = function () {
    var scen = 'reversal', sel = 'pyramid'; var SC = LS().SCENARIOS, ST = LS().STRATEGIES; var seen = {};
    var html = '<div class="rw-title">投資戦略研究室　増し玉シミュレーター（仮想トレード）</div>' +
      '<div class="small gold-text">値動きのシナリオ</div><div class="cs-row wrap">' + Object.keys(SC).map(function (k) { return '<button class="cs-btn" data-sc="' + k + '">' + esc(SC[k].name) + '</button>'; }).join('') + '</div>' +
      '<div class="small muted" data-scdesc></div><div data-pchart></div><div data-table></div><div data-echart></div><div class="small" data-sdesc></div>' +
      box('fact', '用語', '<p class="small"><b>ピラミッティング</b>：含み益が出ている方向にだけ、最初より小さい枚数で増し玉する。増し玉のたびに損切りを引き上げ、合計の建玉が増えても「損切りに当たったときの損失」が最初の想定を超えないように管理する。<br><b>ナンピン</b>：含み損の方向（逆行）に買い増して平均建値を下げる。戻れば早く利益になるが、逆行が続くと建玉と損失が同時に膨らむ。<br><b>マーチンゲール法</b>：負けるたびに賭け（ロット）を倍にする。1回の勝ちで取り返す設計だが、連敗すると倍々で建玉が増え、資金の限界で大きな損失が確定しやすい。</p>') +
      box('warn', '注意', '<p class="small">ゲーム内の決まった値動きによる仮想のシミュレーション。どの手法も、相場によって勝つ場面と負ける場面がある（レンジではナンピンが勝つこともある）。過去や仮想の結果は将来の結果を保証しない。損切りの価格で必ず約定するとは限らない（急変時の滑り）点も現実との違い。</p>') +
      '<div class="cs-row"><button class="cs-btn go" data-manual>自分で増し玉してみる</button></div>' +
      '<div class="rw-row"><div class="rw-btn" data-close>やめる（Esc）</div></div>';
    return Win.panel(html, { cls: 'casino-panel lab-panel', noClose: true, onCancel: function () { if (Labs._close) Labs._close(); }, setup: function (node, close) {
      Labs._close = function () { Labs._close = null; close(0); };
      function upd() {
        var rs = LS().compare(scen); seen[scen] = true; var L = lab(); L.strat = L.strat || {}; L.strat[scen] = true;
        node.querySelectorAll('[data-sc]').forEach(function (e) { e.classList.toggle('on', e.getAttribute('data-sc') === scen); });
        node.querySelector('[data-scdesc]').textContent = SC[scen].desc;
        var cur = rs.filter(function (r) { return r.key === sel; })[0];
        node.querySelector('[data-pchart]').innerHTML = '<div class="small gold-text">' + esc(ST[sel].name) + '</div>' + strategyChart(cur);
        node.querySelector('[data-table]').innerHTML = '<table class="tbl cs-tbl lab-st"><tr><th></th><th>手法</th><th>最終損益</th><th>最大の含み損</th><th>最大建玉</th><th>平均建値</th><th>決済</th></tr>' + rs.map(function (r, i) { return '<tr class="' + (r.key === sel ? 'on' : '') + '" data-st="' + r.key + '"><td><span class="lab-dot" style="background:' + COLORS[i % COLORS.length] + '"></span></td><td>' + esc(ST[r.key].short) + '</td><td class="' + (r.final >= 0 ? 'pos' : 'neg') + '">' + num(r.final) + '</td><td>' + num(r.minPnl) + '</td><td>' + r.maxLots + '枚</td><td>' + r.avg.toFixed(2) + '</td><td>' + esc(r.exit.reason) + '（' + r.exit.bar + '本目）</td></tr>'; }).join('') + '</table><div class="small muted">損益＝（決済価格−建値）×枚数の合計。行をタップすると上のグラフが切り替わる。</div>';
        node.querySelector('[data-echart]').innerHTML = eqChart(rs);
        node.querySelector('[data-sdesc]').innerHTML = '<b>' + esc(ST[sel].name) + '</b>：' + esc(ST[sel].desc) + (cur.maxRisk !== null ? '<br>損切りに当たったときの損失（建玉全体）：最大で ' + num(cur.maxRisk) : '<br>損切りを置いていないため、損失の上限は強制決済まで決まらない。');
      }
      node.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sc]'); if (b) { scen = b.getAttribute('data-sc'); upd(); return; }
        b = e.target.closest('[data-st]'); if (b) { sel = b.getAttribute('data-st'); upd(); return; }
        if (e.target.closest('[data-manual]')) { Labs._close(); Labs.manual().then(function () { return Labs.strategy(); }); return; }
        if (e.target.closest('[data-close]')) Labs._close();
      });
      upd();
    } });
  };
  // 自分で増し玉してみる：シナリオは伏せたまま1本ずつ進める
  Labs.manual = function () {
    var keys = Object.keys(LS().SCENARIOS); var scen = keys[Math.floor(Math.random() * keys.length)]; var s = LS().manual(scen);
    var html = '<div class="rw-title">自分で増し玉してみる（シナリオは最後に公開）</div><div data-chart></div><div class="lab-stat" data-stat></div>' +
      '<div class="cs-row wrap"><button class="cs-btn go" data-a="next">次の足へ（決定キー）</button><button class="cs-btn" data-a="add1">増し玉＋1枚</button><button class="cs-btn" data-a="add3">増し玉＋3枚</button><button class="cs-btn" data-a="be">損切りを平均建値へ</button><button class="cs-btn" data-a="trail">損切りを今の価格−2へ</button><button class="cs-btn" data-a="close">全部決済</button></div>' +
      '<div class="small muted">最初は100で3枚、損切り97.50。最大15枚まで。損切りは上げることだけできる（下げられない）。</div><div class="cs-msg" data-msg></div>' +
      '<div class="rw-row"><div class="rw-btn" data-close>やめる（Esc）</div></div>';
    return Win.panel(html, { cls: 'casino-panel lab-panel', noClose: true, onCancel: function () { if (Labs._mclose) Labs._mclose(); }, onOk: function () { if (Labs._mnext) Labs._mnext(); }, setup: function (node, close) {
      Labs._mclose = function () { Labs._mclose = null; Labs._mnext = null; close(0); };
      var stops = [[0, 97.5]];
      function upd() {
        var r = { px: s.px, log: s.log, stops: stops }; node.querySelector('[data-chart]').innerHTML = strategyChart(r, { until: s.t, hide: !s.done });
        var risk = s.risk(); node.querySelector('[data-stat]').innerHTML = '<span>' + s.t + '本目　価格 <b>' + s.px[s.t].toFixed(2) + '</b></span><span>建玉 <b>' + s.lots() + '枚</b>（平均 ' + s.avg().toFixed(2) + '）</span><span>含み損益 <b class="' + (s.open() >= 0 ? 'pos' : 'neg') + '">' + num(s.open()) + '</b></span><span>損切り ' + s.stop.toFixed(2) + '（当たると ' + num(risk) + '）</span>';
        node.querySelectorAll('[data-a]').forEach(function (b) { b.disabled = s.done; });
        if (s.done) {
          var cmp = LS().compare(scen); var msg = node.querySelector('[data-msg]');
          msg.innerHTML = '<b>' + esc(s.result.reason) + '：最終損益 ' + num(s.result.final) + '</b>（最大の含み損 ' + num(s.minPnl) + '）<br>シナリオは「' + esc(LS().SCENARIOS[scen].name) + '」でした。同じ値動きで自動の手法なら：' + cmp.map(function (c) { return esc(LS().STRATEGIES[c.key].short) + ' ' + num(c.final); }).join('／');
          var L = lab(); L.manual = (L.manual || 0) + 1; if (L.strat && L.strat.reversal && !L.rewards.strategy) Labs.reward('strategy');
        }
      }
      Labs._mnext = function () { if (s.done) return; s.next(); stops.push([s.t, s.stop]); upd(); };
      node.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); var msg = node.querySelector('[data-msg]');
        if (b && !s.done) { var a = b.getAttribute('data-a'); msg.textContent = '';
          if (a === 'next') { Labs._mnext(); return; }
          if (a === 'add1' || a === 'add3') { if (!s.add(a === 'add1' ? 1 : 3)) msg.textContent = 'これ以上は増やせない（最大15枚）'; }
          else if (a === 'be') { if (!s.raiseStop(s.avg())) msg.textContent = '損切りは今の損切りより上で、今の価格より下にしか置けない'; }
          else if (a === 'trail') { if (!s.raiseStop(s.px[s.t] - 2)) msg.textContent = '損切りは今の損切りより上で、今の価格より下にしか置けない'; }
          else if (a === 'close') s.close();
          stops[stops.length - 1] = [s.t, s.stop]; upd(); return; }
        if (e.target.closest('[data-close]')) Labs._mclose();
      });
      upd();
    } });
  };

  /* ---------- 研究室の受付メニュー ---------- */
  Labs.probLab = async function () {
    while (true) {
      var L = lab(); function done(k) { return L.rewards[k] ? '（済）' : ''; }
      var i = await Win.choice('確率研究室「どの試練に挑む？」', ['大数の法則の実験' + done('lln'), '期待値の問題（5問）' + done('ev'), 'ギャンブラーの誤謬クイズ' + done('fallacy'), 'マーチンゲール法の実験' + done('martingale'), 'やめる']);
      if (i === 0) await Labs.lln(); else if (i === 1) await Labs.evQuiz(); else if (i === 2) await Labs.fallacy(); else if (i === 3) await Labs.martingale(); else return;
    }
  };
  root.Labs = Labs;
})(typeof window !== 'undefined' ? window : globalThis);
