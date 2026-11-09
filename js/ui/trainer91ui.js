/* =========================================================
   UI / Trainer91UI（v9.1）：実践トレード道場に足す演習の画面（計算は js/trainer91.js）
   ・同じ相場・3判断比較（A）・思い込みを見抜く（B）・資金管理・連敗耐性試験（C）・初見チャートの認定試験 v2（D：Lv8 を置き換え）
   ・どれも任意の学習。ストーリーの進行には要らない。ゲームのお金・アイテム・経験値は使わず、出さない（記録だけ。セーブの practice の中）
   ・どの画面にも「架空の相場」「仮設定」「判断の過程の点と結果（R）は別」「損切りを越える損失がありうる」を短く出す
   ========================================================= */
(function (root) {
  'use strict';
  var PUI = root.PracticeUI; if (!PUI) return;
  var Win = root.Win, State = root.State, CONFIG = root.CONFIG, Chart = root.Chart; var esc = Win.esc;
  function T() { return root.Trainer91; } function PE() { return root.PracticeEngine; } function SPF() { return root.StrategyProfiles; } function TC() { return root.TradeCore; } function SE() { return root.SignalEngine; }
  function fmt(v, d) { return isFinite(v) ? Number(v).toFixed(d === undefined ? 3 : d) : '―'; }
  function sgn(v, d) { return isFinite(v) ? (v > 0 ? '+' : '') + Number(v).toFixed(d === undefined ? 1 : d) : '―'; }
  function yen(v) { return isFinite(v) ? Math.round(v).toLocaleString() + '円' : '―'; }
  var NOTE = '<div class="muted small">架空の相場・仮想の資金。条件の細かな値は推奨仮設定（もちぽよ公式の売買ルールではない）。判断の過程の点と結果（R）は別のもの。損切りは「その価格で必ず止まる」約束ではない。</div>';
  // 演習の記録（セーブの practice の中。旧セーブにはないので作る）
  PUI.ensure91 = function (p) {
    p = p || PUI.ensure(); if (!p) return null;
    if (!p.cmp3 || typeof p.cmp3 !== 'object') p.cmp3 = { n: 0, reviews: 0, log: [] }; if (!Array.isArray(p.cmp3.log)) p.cmp3.log = [];
    if (!p.spot || typeof p.spot !== 'object') p.spot = { n: 0, falseN: 0, hit: 0, trueN: 0, falseAlarm: 0, score: 0, max: 0, log: [] }; if (!Array.isArray(p.spot.log)) p.spot.log = [];
    if (!p.survival || typeof p.survival !== 'object') p.survival = { runs: 0, last: null };
    if (!p.examSeen || typeof p.examSeen !== 'object' || Array.isArray(p.examSeen)) p.examSeen = {}; if (!Array.isArray(p.examRuns)) p.examRuns = [];
    if (p.series && !p.series.v) { p.seriesLegacy = p.series; p.series = null; }   // v9.0 の連続演習（途中）は版が違うので、新しい試験とは別に残す（消さない）
    return p;
  };
  var ensure0 = PUI.ensure; PUI.ensure = function (d) { var p = ensure0(d); if (p) PUI.ensure91(p); return p; };
  PUI.LEVELS[7] = { lv: 8, name: 'Lv8 初見チャートの認定試験（30問・v2）', cats: null, set: 'exam', series: 30, exam: true };
  // メニューに足す項目（js/ui/practiceui.js の PUI.menu が呼ぶ）
  PUI.extraModes = function (p) {
    PUI.ensure91(p);
    return [
      { label: '同じ相場・3判断比較', right: p.cmp3.n ? p.cmp3.n + '回' : '', sub: '同じチャートで「いま入る」「条件がそろってから入る」「見送る」を同時に登録して、結果を並べる（どれが良いかは、この先の相場しだい）', run: function () { return PUI.compare3(); } },
      { label: '思い込みを見抜く', right: p.spot.n ? '検出率 ' + (p.spot.falseN ? Math.round(p.spot.hit / p.spot.falseN * 100) : 0) + '%' : '', sub: 'トレーダーの解説のうち、チャートの事実と合わない主張を選ぶ（正しい主張もまじる。根拠のない指摘は減点）', run: function () { return PUI.spot(); } },
      { label: '資金管理・連敗耐性試験', right: p.survival.runs ? p.survival.runs + '回' : '', sub: '1回のリスク % と連敗：30連敗で 1% なら約 74% 残る・5% なら約 21%。固定額・マーチンゲールとも比べる（仮想口座）', run: function () { return PUI.survival(); } }
    ];
  };
  // チャートを 1 枚描いて操作を付ける（A・B の画面で使う）。返り値：{ render, detach, view }
  function chartBox(node, sel, g, getAsOf, extra) {
    var canvas = node.querySelector(sel); var view = { tf: g.entryTF, visible: 72, zig: true, end: null, cross: null, count: 0 }; var info = node.querySelector(sel + '-x');
    var vc = { key: null };   // 同じ時間足・同じ時刻なら計算し直さない（ドラッグ・ピンチの間は描くだけ）
    function render() { var key = view.tf + '|' + getAsOf(); if (vc.key !== key) { var v0 = PE().view(g, view.tf, getAsOf()); var pv0 = v0.an ? SE().pivots(v0.candles, CONFIG.zigzag.depth, v0.candles.length - 1) : null; vc = { key: key, v: v0, L: pv0 ? pv0.confirmed.map(function (x) { return { index: x.index, price: x.price, type: x.type, confirmed: true }; }) : [] }; }
      var v = vc.v; if (!v.an) return; view.count = v.candles.length; if (extra && extra.reveal) v.an.revealedCount = extra.reveal(view.tf, v); var L = vc.L;
      var o = { visibleBars: view.visible, showZigzag: view.zig, zigLegend: true, pivots: L, endIndex: view.end === null ? undefined : view.end, crosshair: view.cross, tfLabel: PE().tfLabel(view.tf) }; if (extra && extra.opts) Object.assign(o, extra.opts(view.tf, v));
      Chart.render(canvas, v.an, o); node.querySelectorAll(sel + '-tfs .tf').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tf') === view.tf); }); }
    var ctl = root.ChartCtl ? root.ChartCtl.attach(canvas, { st: view, defVisible: 72, count: function () { return view.count || 1; }, render: render, onCross: function (x) { if (!info) return; info.textContent = x ? (x.fromEnd ? x.fromEnd + '本前' : '最新') + (isFinite(x.t) && root.ChartCtl ? '（' + root.ChartCtl.clock(x.t) + '・架空）' : '') + '：始 ' + fmt(x.o) + ' 高 ' + fmt(x.h) + ' 安 ' + fmt(x.l) + ' 終 ' + fmt(x.c) + '・RCI ' + (isFinite(x.rci) ? x.rci.toFixed(0) : '―') + '・MACD ' + (isFinite(x.macd) ? x.macd.toFixed(4) : '―') : ''; } }) : null;
    node.querySelectorAll(sel + '-tfs .tf').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); view.tf = b.getAttribute('data-tf'); view.end = null; view.cross = null; render(); }); });
    setTimeout(render, 20); return { render: render, view: view, detach: function () { if (ctl) ctl.detach(); } };
  }
  function tfButtons(id) { return '<div class="tfs" id="' + id + '">' + PE().TFS.map(function (t) { return '<button class="tf" data-tf="' + t.id + '">' + esc(t.label) + '</button>'; }).join('') + '</div>'; }
  function stopKeys(node) { node.querySelectorAll('input,select').forEach(function (el) { el.addEventListener('keydown', function (e) { e.stopPropagation(); }); el.addEventListener('click', function (e) { e.stopPropagation(); }); }); }
  function bodyOpen(on) { if (document.body) document.body.classList.toggle('pd-chart-open', !!on); }

  /* ================= A 同じ相場・3判断比較 ================= */
  PUI.compare3 = async function (opts) {
    opts = opts || {}; var p = PUI.ensure(); PUI.ensure91(p);
    var pick = opts.pick || PUI.pick(p, { lv: 5, cats: T().CMP3_CATS, set: 'learn' }); if (!pick) { await Win.message(['問題のデータが読み込めていない。']); return null; }
    var g = PE().generate(pick.seed); var S0 = g.S; bodyOpen(true);
    var html = '<div class="rw-title">同じ相場・3判断比較</div><div class="small">同じチャート・同じこの先の値動き・同じコストで、3 つの計画を<b>同時に登録</b>してから、結果を一度に出す（公平な比較）。3 つの分岐は、ポジション・資金・記録を共有しない。どれが良いかは、この先の相場しだい。</div>' +
      '<div class="trade-chartwrap"><div class="chart-tools">' + tfButtons('c3-chart-tfs') + '</div><canvas class="chart" id="c3-chart"></canvas><div class="pd-cross small" id="c3-chart-x"></div></div>' +
      '<div class="order-grid"><label>目線（A・B 共通）<select id="c3-side"><option value="buy">買い（ロング）</option><option value="sell">売り（ショート）</option></select></label><label>エントリー足<select id="c3-tf"><option value="15m">15分足</option><option value="5m">5分足</option></select></label>' +
      '<label>A：いま入る・RR<select id="c3-rra"><option>1.5</option><option selected>2</option><option>3</option></select></label><label>B：条件がそろってから入る・RR<select id="c3-rrb"><option>1.5</option><option selected>2</option><option>3</option></select></label>' +
      '<label>C：見送る理由<select id="c3-why"><option value="no_signal">条件（RCI の反転など）がそろっていない</option><option value="htf">上位足と逆・食い違い</option><option value="range">レンジの中ほど</option><option value="stop">損切りが遠い</option><option value="other">その他</option></select></label><label>許容損失（仮想資金 100万円の%）<select id="c3-risk"><option value="0.5">0.5%</option><option value="1" selected>1%</option><option value="2">2%</option></select></label></div>' +
      '<div class="muted small">損切り：確定した山谷の外側（＋余裕）。山谷が近すぎる・ないときは ATR×1.5。利確：選んだ RR。B は、待てる ' + PE().WAIT_MIN + '分のあいだで推奨仮設定の条件がそろった最初の確定足で入る（そろわなければ入らない）。</div>' + NOTE +
      '<div class="trade-cmds ready"><button class="tcmd buy" data-cmd="go">3 つの計画を登録して結果を見る</button><button class="tcmd" data-cmd="quit">やめる</button></div>';
    var plans = await Win.panel(html, { cls: 'trade-panel practice-panel c3-panel', noClose: true, onCancel: function () { }, setup: function (node, close) {
      var box = chartBox(node, '#c3-chart', g, function () { return S0; }); stopKeys(node);
      node.addEventListener('click', function (e) { var b = e.target.closest('[data-cmd]'); if (!b) return; e.stopPropagation(); box.detach();
        if (b.getAttribute('data-cmd') === 'quit') { close(null); return; }
        close({ side: node.querySelector('#c3-side').value, entryTF: node.querySelector('#c3-tf').value, rrA: +node.querySelector('#c3-rra').value, rrB: +node.querySelector('#c3-rrb').value, whyC: node.querySelector('#c3-why').value, riskPercent: +node.querySelector('#c3-risk').value, at: Date.now() }); });
    } });
    if (!plans) { bodyOpen(false); return null; }
    var res = T().cmp3Run(pick.seed, plans, { profile: p.profile, overrides: p.overrides });
    p.cmp3.n++; p.cmp3.log.push({ t: Date.now(), seed: pick.seed, cat: pick.cat, side: res.side, tf: res.entryTF, R: res.branches.map(function (b) { return b.kind === 'trade' ? b.R : 0; }), met: [res.branches[0].met, res.branches[1].met], lucky: res.branches.some(function (b) { return b.lucky; }), firstSeen: true, checksum: res.checksum, engineVersion: res.engineVersion });
    while (p.cmp3.log.length > 30) p.cmp3.log.shift(); State.autosave();
    var r = await PUI.compare3Result(res, g, plans); bodyOpen(false); return res;
  };
  var WHY_C = { no_signal: '条件（RCI の反転など）がそろっていない', htf: '上位足と逆・食い違い', range: 'レンジの中ほど', stop: '損切りが遠い', other: 'その他' };
  PUI.compare3Result = async function (res, g, plans) {
    var B = res.branches; var cell = function (b, f) { return b.kind === 'trade' ? f(b) : '―'; };
    var rows = [['決めた時刻', function (b) { return b.kind === 'trade' ? '開始から ' + b.atMin + '分' : b.kind === 'skip' ? '開始の時点' : '（入らず）'; }], ['方向', function (b) { return cell(b, function (x) { return x.side === 'buy' ? 'ロング' : 'ショート'; }); }], ['エントリー（約定）', function (b) { return cell(b, function (x) { return fmt(x.entry); }); }],
      ['損切りの距離', function (b) { return cell(b, function (x) { return fmt(x.slPips, 1) + 'pips'; }); }], ['利確の距離', function (b) { return cell(b, function (x) { return fmt(x.tpPips, 1) + 'pips'; }); }], ['想定 RR', function (b) { return cell(b, function (x) { return '1:' + fmt(x.rr, 2); }); }], ['ロット', function (b) { return cell(b, function (x) { return x.lots.toFixed(2); }); }],
      ['net pips', function (b) { return b.kind === 'trade' ? sgn(b.netPips) : '0'; }], ['実現 R', function (b) { return b.kind === 'trade' ? sgn(b.R, 2) + 'R' : '0R'; }], ['MFE／MAE', function (b) { return cell(b, function (x) { return sgn(x.mfePips) + '／' + sgn(x.maePips) + 'pips'; }); }], ['最大の含み損（見積もり）', function (b) { return cell(b, function (x) { return yen(x.worstOpenYen); }); }],
      ['決済', function (b) { return cell(b, function (x) { return ({ tp: '利確', sl: '損切り', time: '時間切れ', end: '足の終わり' })[x.reason] + '（' + x.exitMin + '分）' + (x.ambiguous ? '・先後不明' : ''); }); }],
      ['根拠（条件の成否）', function (b) { return b.kind === 'trade' ? (b.met ? '条件はそろっていた' : '条件はそろっていない') + '：' + b.evidence.filter(function (e) { return e.ok; }).map(function (e) { return e.label; }).join('・') : b.kind === 'none' ? esc(b.why || '') : '―'; }], ['見送りの理由', function (b) { return b.kind === 'skip' ? (WHY_C[b.why] || '―') + '（その後 ' + b.afterMin + '分で ' + sgn(b.afterPips) + 'pips' + '）' : '―'; }]];
    var flags = B.filter(function (b) { return b.lucky || b.unlucky; }).map(function (b) { return b.lucky ? b.key + '：条件がそろわないまま入って、<b>たまたま勝った</b>（同じやり方を続けると、結果はばらつく）' : b.key + '：条件はそろっていたが負けた（ルールどおりの判断でも、1回の結果は運に左右される）'; });
    var same = B[0].kind === 'trade' && B[1].kind === 'trade' && B[0].atMin === B[1].atMin;
    var SH = { A: 'A いま入る', B: 'B 条件が<br>そろってから', C: 'C 見送る' };
    var html = '<div class="rw-title">3判断比較の結果（初見で 3 つを同時に登録）</div><div class="small">' + B.map(function (b) { return esc(b.label); }).join('<br>') + '</div><div class="c3-wrap"><table class="tbl small c3-tbl"><tr><th></th>' + B.map(function (b) { return '<th>' + SH[b.key] + '</th>'; }).join('') + '</tr>' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td>' + B.map(function (b) { return '<td>' + r[1](b) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>' +
      (same ? '<div class="small">開始の時点で条件がそろっていたので、A と B は同じ時刻に入った。</div>' : '') + (flags.length ? '<div class="small">' + flags.join('<br>') + '</div>' : '') +
      '<canvas class="chart rv-chart" id="c3-rv"></canvas><div class="muted small">色の付いた部分は、計画を登録したときには見えていなかった値動き。▲▼：A・B の入った足。仮想資金 ' + yen(res.capital) + '・許容損失 ' + res.riskPercent + '%（3 つとも同じ条件。道場の仮想資金・成績には入れない）。</div>' + NOTE +
      '<div class="trade-cmds ready"><button class="tcmd" data-cmd="replay">分岐ごとに再生（反実仮想の復習・成績に入れない）</button><button class="tcmd" data-cmd="end">終える</button></div>';
    var p = PUI.ensure();
    while (true) {
      var c = await Win.panel(html, { cls: 'result-panel rw-panel rv-panel pd-review', noClose: true, onCancel: function () { }, setup: function (node, close) {
        var cv = node.querySelector('#c3-rv'); var tf = res.entryTF; var tfm = PE().tfMin(tf) / 5; var endAs = Math.min(g.base.length - 1, g.S + PE().WAIT_MIN / 5 + 36 * tfm); var v = PE().view(g, tf, endAs);
        if (v.an) { var shown = Math.round((endAs - g.S) / tfm); v.an.revealedCount = Math.max(0, Math.min(v.candles.length - 1, shown)); var off = v.candles.length - 1 - shown; var marks = [];
          B.forEach(function (b) { if (b.kind !== 'trade') return; var idx = off + Math.round(b.atMin / 5 / tfm); marks.push({ index: idx, price: b.entry, type: b.side === 'buy' ? 'low' : 'high' }); });
          setTimeout(function () { Chart.render(cv, v.an, { visibleBars: Math.min(140, shown + 50), showZigzag: true, tfLabel: PE().tfLabel(tf) + '（3判断の振り返り）', marks: marks }); }, 20); }
        var done = false; node.addEventListener('click', function (e) { var b = e.target.closest('[data-cmd]'); if (!b || done) return; e.stopPropagation(); done = true; close(b.getAttribute('data-cmd')); }); } });
      if (c !== 'replay') return;
      p.cmp3.reviews = (p.cmp3.reviews || 0) + 1; State.autosave(); await PUI.compare3Replay(res, g);
    }
  };
  // 反実仮想の復習：結果を知った後に、分岐の 1 つを足 1 本ずつ見直す（初見の成績には入れない）
  PUI.compare3Replay = function (res, g) {
    var tf = res.entryTF; var tfm = PE().tfMin(tf) / 5; var cur = { k: 0, asOf: g.S };
    var html = '<div class="rw-title">反実仮想の復習（結果を知った後の再生）</div><div class="small bad">この再生は、この先の値動きを知った後の見直し。初見の判断の成績には入れない。</div><div class="aq-o" id="c3r-br">' + res.branches.map(function (b, i) { return '<button class="aopt" data-br="' + i + '">' + esc(b.label) + '</button>'; }).join('') + '</div>' +
      '<div class="trade-chartwrap"><div class="chart-tools">' + tfButtons('c3r-chart-tfs') + '</div><canvas class="chart" id="c3r-chart"></canvas><div class="pd-cross small" id="c3r-chart-x"></div></div><div class="small" id="c3r-st"></div>' +
      '<div class="trade-cmds ready"><button class="tcmd" data-cmd="s1">1本進める</button><button class="tcmd" data-cmd="s10">10本進める</button><button class="tcmd" data-cmd="back">戻る</button></div>';
    return Win.panel(html, { cls: 'trade-panel practice-panel', noClose: true, onCancel: function () { }, setup: function (node, close) {
      var b0 = function () { return res.branches[cur.k]; };
      var box = chartBox(node, '#c3r-chart', g, function () { return cur.asOf; }, { opts: function (tfx) { var b = b0(); if (b.kind !== 'trade' || tfx !== tf || cur.asOf < b.asOf) return {}; return { entry: b.entry, sl: b.sl, tp: b.tp }; } });
      function st() { var b = b0(); node.querySelectorAll('[data-br]').forEach(function (x) { x.classList.toggle('on', +x.getAttribute('data-br') === cur.k); }); node.querySelector('#c3r-st').textContent = '開始から ' + (cur.asOf - g.S) * 5 + '分' + (b.kind === 'trade' ? (cur.asOf >= b.asOf ? '・保有中（' + (b.side === 'buy' ? 'ロング' : 'ショート') + '）' : '・まだ入っていない') + (cur.asOf - g.S >= b.exitMin / 5 ? '・決済済み（' + sgn(b.R, 2) + 'R）' : '') : ''); box.render(); }
      node.addEventListener('click', function (e) { var t = e.target.closest('button'); if (!t) return; e.stopPropagation();
        if (t.hasAttribute('data-br')) { cur.k = +t.getAttribute('data-br'); cur.asOf = g.S; st(); return; }
        var c = t.getAttribute('data-cmd'); if (c === 'back') { box.detach(); close(0); return; } var n = c === 's10' ? 10 : 1; cur.asOf = Math.min(g.base.length - 1, cur.asOf + n * tfm); st(); });
      st(); } });
  };

  /* ================= B 思い込みを見抜く ================= */
  PUI.SPOT_NPC = [{ name: '解説者カブリ', line: '今日のチャートをバッチリ解説しよう！' }, { name: '早口のミナト', line: '見ればすぐ分かるさ。' }, { name: '老練のゴードン', line: 'わしの経験から言えば…' }];
  PUI.spot = async function (opts) {
    opts = opts || {}; var p = PUI.ensure(); PUI.ensure91(p); var set = null, pick = null;
    for (var k = 0; k < 20 && !set; k++) { pick = opts.pick || PUI.pick(p, { lv: 3, cats: null, set: 'learn' }); if (!pick) break; set = T().spotClaims(pick.seed, { entryTF: opts.entryTF }); if (opts.pick) break; }
    if (!set) { await Win.message(['出題できる問題が見つからなかった。']); return null; }
    var g = PE().generate(pick.seed); var npc = PUI.SPOT_NPC[(pick.seed >>> 0) % PUI.SPOT_NPC.length]; bodyOpen(true);
    var html = '<div class="rw-title">思い込みを見抜く</div><div class="small"><b>' + esc(npc.name) + '</b>「' + esc(npc.line) + '」　—— 下の主張のうち、<b>いまのチャートの事実・数値と合わない（誤りの）もの</b>をすべて選ぼう。正しい主張もまじっている。根拠のない指摘は減点。</div>' +
      '<div class="trade-chartwrap"><div class="chart-tools">' + tfButtons('sp-chart-tfs') + '</div><canvas class="chart" id="sp-chart"></canvas><div class="pd-cross small" id="sp-chart-x"></div></div>' +
      '<div class="pd-ev sp-claims">' + set.claims.map(function (c) { return '<label class="pd-chk sp-c"><input type="checkbox" data-c="' + c.id + '"> ' + esc(c.text) + '</label>'; }).join('') + '</div>' + NOTE +
      '<div class="trade-cmds ready"><button class="tcmd buy" data-cmd="go">誤りだと指摘する</button><button class="tcmd" data-cmd="quit">やめる</button></div>';
    var picked = await Win.panel(html, { cls: 'trade-panel practice-panel sp-panel', noClose: true, onCancel: function () { }, setup: function (node, close) {
      var box = chartBox(node, '#sp-chart', g, function () { return set.asOf; }); box.view.tf = set.entryTF; stopKeys(node);
      node.addEventListener('click', function (e) { var b = e.target.closest('[data-cmd]'); if (!b) return; e.stopPropagation(); box.detach(); if (b.getAttribute('data-cmd') === 'quit') { close(null); return; }
        var L = []; node.querySelectorAll('[data-c]').forEach(function (x) { if (x.checked) L.push(x.getAttribute('data-c')); }); close(L); }); } });
    bodyOpen(false); if (!picked) return null;
    var gr = T().spotGrade(set, picked); var S2 = p.spot; S2.n++; S2.falseN += gr.falseN; S2.hit += gr.hit; S2.trueN += gr.trueN; S2.falseAlarm += gr.falseAlarm; S2.score += gr.score; S2.max += gr.max;
    S2.log.push({ t: Date.now(), seed: pick.seed, hit: gr.hit, falseN: gr.falseN, fa: gr.falseAlarm, trueN: gr.trueN, types: set.claims.map(function (c) { return c.type + (c.truth ? 't' : 'f'); }) }); while (S2.log.length > 50) S2.log.shift(); State.autosave();
    var TY = T().SPOT_TYPES;
    var rv = '<div class="rw-title">思い込みを見抜く：結果 ' + gr.score + '／' + gr.max + '点</div><div class="small">誤り ' + gr.falseN + ' 件のうち見つけた ' + gr.hit + ' 件（検出率 ' + (gr.detectRate === null ? '―' : gr.detectRate + '%') + '）・正しい主張を誤りと言った ' + gr.falseAlarm + ' 件（誤認率 ' + (gr.falseAlarmRate === null ? '―' : gr.falseAlarmRate + '%') + '）</div>' +
      '<ul class="score-items">' + gr.rows.map(function (r) { return '<li class="' + (r.ok ? 'ok' : 'ng') + '"><span class="mark">' + (r.ok ? '✓' : '✗') + '</span><b>' + (r.truth ? '正しい主張' : '誤りの主張') + '</b>（' + esc(TY[r.type] || '') + '）' + (r.said ? '・あなた：誤りと指摘' : '') + '<br>「' + esc(r.text) + '」<br><span class="small">証拠：' + esc(r.evidence.tf === '-' ? '' : PE().tfLabel(r.evidence.tf) + '・判断の時点の最新の確定足まで・') + esc(r.evidence.what) + '＝' + esc(r.evidence.value) + '<br>正しい解釈：' + esc(r.explain) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="small">これまで：検出率 ' + (S2.falseN ? Math.round(S2.hit / S2.falseN * 100) : 0) + '%（' + S2.hit + '/' + S2.falseN + '）・誤認率 ' + (S2.trueN ? Math.round(S2.falseAlarm / S2.trueN * 100) : 0) + '%（' + S2.falseAlarm + '/' + S2.trueN + '）・' + S2.n + '問</div>' + NOTE;
    await Win.panel(rv, { cls: 'result-panel rw-panel pd-review' });
    return gr;
  };

  /* ================= C 資金管理・連敗耐性試験 ================= */
  PUI.survival = async function () {
    var p = PUI.ensure(); PUI.ensure91(p);
    var html = '<div class="rw-title">資金管理・連敗耐性試験（仮想口座）</div><div class="small">1回の損失が残高の r% なら、n 回続けて負けたあとの資金は <b>最初の資金 ×（1 − r）^n</b>。30連敗で 1% なら約 73.97%、5% なら約 21.46% が残る（複利の仮定）。固定の円の額でリスクをとるときとは別の計算。</div>' +
      '<div class="order-grid"><label>最初の資金（円）<input type="number" id="sv-cap" value="1000000" min="1" step="1" inputmode="numeric"></label><label>1回のリスク（%）<input type="number" id="sv-r" value="1" min="0.01" max="99.99" step="0.01" inputmode="decimal"></label><label>連敗の数<input type="number" id="sv-n" value="30" min="1" max="200" step="1" inputmode="numeric"></label>' +
      '<label>リスクの決め方<select id="sv-mode"><option value="pct">残高の %（複利）</option><option value="yen">最初の資金の %（固定の円の額）</option></select></label><label>ストレス（窓・滑り）<select id="sv-st"><option value="0">なし（理論式）</option><option value="5">5 回に 1 回、予定の 2 倍の損失</option><option value="10">10 回に 1 回、予定の 2 倍の損失</option></select></label><label>退場の目安（資金の %）<input type="number" id="sv-exit" value="50" min="0" max="99" step="1" inputmode="numeric"></label></div>' +
      '<div class="trade-cmds ready"><button class="tcmd" data-cmd="calc">計算する</button><button class="tcmd" data-cmd="cmp15">1% と 5% の 30連敗を比べる</button></div><div class="calc o-err" id="sv-err" role="alert"></div><div class="calc" id="sv-out"></div><canvas class="chart pd-curve" id="sv-cv"></canvas><div class="muted small" id="sv-leg"></div>' +
      '<div class="an-title">勝ち負けの並びで、資金の決め方を比べる</div><div class="order-grid"><label>勝ちの RR<select id="sv-rr"><option>1</option><option selected>1.5</option><option>2</option><option>3</option></select></label><label>並び（W＝勝ち・L＝負け）<input type="text" id="sv-seq" value="' + T().SEQ_SAMPLE + '" maxlength="200"></label></div>' +
      '<div class="trade-cmds ready"><button class="tcmd" data-cmd="sizing">比べる</button></div><div class="calc" id="sv-cmp"></div><canvas class="chart pd-curve" id="sv-cv2"></canvas>' +
      '<div class="muted small">理論式とこの計算は、損失がちょうど予定どおりという理想的な仮定（ストレスの例を除く）。実際の相場の予測ではない。マーチンゲール（負けたら増やす）は、連敗で資金を失いやすいのですすめない。ゲームのお金は使わない（仮想口座）。</div>' +
      '<div class="trade-cmds ready"><button class="tcmd" data-cmd="end">終える</button></div>';
    var COL = ['#5ab0ff', '#ff8a3a', '#4cc38a', '#e5484d'];
    function draw(cv, series, leg) { if (!cv) return; var dpr = root.devicePixelRatio || 1; var w = cv.clientWidth || 600, h = cv.clientHeight || 120; cv.width = w * dpr; cv.height = h * dpr; var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#0b1226'; x.fillRect(0, 0, w, h);
      var all = []; series.forEach(function (s) { all = all.concat(s.v); }); var hi = Math.max.apply(null, all), lo = Math.min(0, Math.min.apply(null, all)); if (hi === lo) hi = lo + 1; var n = Math.max.apply(null, series.map(function (s) { return s.v.length; }));
      series.forEach(function (s, k) { x.strokeStyle = COL[k % COL.length]; x.lineWidth = 2; x.beginPath(); s.v.forEach(function (v, i) { var px = 6 + (w - 12) * i / Math.max(1, n - 1), py = 6 + (h - 12) * (1 - (v - lo) / (hi - lo)); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); });
      if (leg) leg.innerHTML = series.map(function (s, k) { return '<span style="color:' + COL[k % COL.length] + '">━ ' + esc(s.name) + '</span>'; }).join('　'); }
    function outOne(r) { return '<b>' + esc(r.mode === 'pct' ? '残高の ' + r.riskPercent + '%' : '最初の資金の ' + r.riskPercent + '%（固定額）') + '・' + r.n + '連敗' + (r.stressEvery ? '・ストレスあり' : '') + '</b>：残る資金 <b>' + yen(r.final) + '（' + r.finalPct.toFixed(2) + '%）</b>・損失 ' + yen(r.totalLoss) + '・最大DD ' + r.maxDDPct.toFixed(2) + '%・元に戻すのに必要な上昇 ' + (r.recoverPct === null ? '（資金がない）' : r.recoverPct.toFixed(1) + '%') +
      (r.formula !== null ? '・式 ' + yen(r.formula) : '') + '・退場の目安（' + r.exitPct + '%）' + (r.exitAt ? 'に ' + r.exitAt + '連敗目で届く' : 'には届かない') + (r.ruinAt ? '・<span class="bad">' + r.ruinAt + '連敗目で資金がなくなる</span>' : '') + '<br><span class="muted small">' + esc(r.note) + '</span>'; }
    await Win.panel(html, { cls: 'trade-panel practice-panel sv-panel', noClose: true, onCancel: function () { }, setup: function (node, close) {
      var $ = function (s) { return node.querySelector(s); }; stopKeys(node);
      function read() { return { capital: +$('#sv-cap').value, riskPercent: +$('#sv-r').value, n: +$('#sv-n').value, mode: $('#sv-mode').value, stressEvery: +$('#sv-st').value, exitPct: +$('#sv-exit').value }; }
      function save(last) { p.survival.runs++; p.survival.last = last; State.autosave(); }
      node.addEventListener('click', function (e) { var b = e.target.closest('[data-cmd]'); if (!b) return; e.stopPropagation(); var c = b.getAttribute('data-cmd');
        if (c === 'end') { close(0); return; }
        if (c === 'calc') { var r = T().survival(read()); if (!r.ok) { $('#sv-err').innerHTML = '<b class="bad">計算できない：</b>' + r.errors.map(esc).join('<br>'); $('#sv-out').innerHTML = ''; return; } $('#sv-err').innerHTML = ''; $('#sv-out').innerHTML = outOne(r); draw($('#sv-cv'), [{ name: r.riskPercent + '%', v: r.curve }], $('#sv-leg')); save({ riskPercent: r.riskPercent, n: r.n, finalPct: r.finalPct }); return; }
        if (c === 'cmp15') { var cap = +$('#sv-cap').value; var a = T().survival({ capital: cap, riskPercent: 1, n: 30 }), z = T().survival({ capital: cap, riskPercent: 5, n: 30 }); if (!a.ok || !z.ok) { $('#sv-err').innerHTML = '<b class="bad">計算できない：</b>' + (a.errors || z.errors).map(esc).join('<br>'); return; }
          $('#sv-err').innerHTML = ''; $('#sv-out').innerHTML = outOne(a) + '<br>' + outOne(z); draw($('#sv-cv'), [{ name: '1%', v: a.curve }, { name: '5%', v: z.curve }], $('#sv-leg')); save({ cmp: true, a: a.finalPct, b: z.finalPct }); return; }
        if (c === 'sizing') { var s = T().compareSizing({ capital: +$('#sv-cap').value, riskPercent: +$('#sv-r').value, rr: +$('#sv-rr').value, seq: ($('#sv-seq').value || '').toUpperCase().replace(/\s/g, '') }); if (!s.ok) { $('#sv-cmp').innerHTML = '<b class="bad">比べられない：</b>' + s.errors.map(esc).join('<br>'); return; }
          var NM = { const: 'ルールどおり一定（残高の %）', yen: '固定の円の額', martingale: '負けたら 2 倍（マーチンゲール）', upAfterWin: '勝ったときだけ 1.5 倍' };
          $('#sv-cmp').innerHTML = '勝ち ' + s.wins + '・負け ' + s.losses + '・RR 1:' + s.rr + '<table class="tbl small"><tr><th>決め方</th><th>最後の資金</th><th>最大DD</th><th>資金がなくなった</th></tr>' + Object.keys(NM).map(function (k) { var x = s.s[k]; return '<tr><td>' + esc(NM[k]) + '</td><td>' + yen(x.final) + '（' + x.finalPct.toFixed(1) + '%）</td><td>' + x.maxDDPct.toFixed(1) + '%</td><td>' + (x.ruinAt ? x.ruinAt + '回目' : '―') + '</td></tr>'; }).join('') + '</table>';
          draw($('#sv-cv2'), Object.keys(NM).map(function (k) { return { name: NM[k], v: s.s[k].curve }; }), null); save({ sizing: true }); return; } });
    } });
  };

  /* ================= D 初見チャートの認定試験 v2 ================= */
  PUI.series = async function () {
    var p = PUI.ensure(); PUI.ensure91(p); var L = PUI.LEVELS[7]; var Tr = T();
    var intro = ['初見チャートの認定試験（v' + Tr.EXAM_VERSION + '・30問）', '学習用とは別の生成系列（パターン群）の問題。1回の試験で同じ問題・同じ形の群を出しすぎない。試験の間は 型の名前・結果・模範解答・ヒントを出さない（試験の終わりにまとめて振り返る）。'];
    var ch = ['新しいセットで受ける（初見）']; if (p.series && p.series.done < p.series.n) ch.unshift('続きから（' + p.series.done + '/' + p.series.n + '問）'); if (p.examRuns.length) ch.push('前のセットで復習（認定には使わない）'); ch.push('やめる');
    var c = await Win.choice(intro.join(' '), ch); if (c < 0 || ch[c] === 'やめる') return;
    if (/^前のセットで復習/.test(ch[c])) return PUI.examReview();
    if (/^新しいセット/.test(ch[c])) p.series = Tr.examNew(Object.keys(p.examSeen).length);
    var S = p.series; State.autosave();
    while (S.done < S.n) {
      var it = Tr.examNext(S, p.examSeen); if (!it) { S.n = S.done; await Win.message(['出せる初見の問題が足りないため、' + S.done + '問で終える（同じ問題を重ねて出さない）。']); break; }
      Tr.examMark(S, it); p.examSeen[it.fp] = 1; State.autosave();
      var r = await PUI.play({ level: 8, lvDef: L, seriesNo: S.done + 1, seriesN: S.n, pick: { seed: it.seed, gen: 'B', set: 'exam', cat: it.cat }, exam: true, hints: false, seriesId: S.startedAt });
      if (!r) { S.items.pop(); S.usedSeeds.pop(); S.usedFps.pop(); S.usedFamilies.pop(); State.autosave(); return; }   // 中断：その問題は記録されていないので、使った印も戻す（見た印 examSeen は残す＝同じ問題を初見として出さない）
      S.done++; State.autosave(); if (r.next === 'quit') return;
    }
    await PUI.examFinish(S); p.series = null; State.autosave();
  };
  PUI.examFinish = async function (S) {
    var p = PUI.ensure(); var Tr = T(); var recs = p.history.filter(function (x) { return x.set === 'exam' && x.seriesId === S.startedAt; });
    var ev = Tr.examEvaluate(recs, p.examRuns.slice(-3).map(function (x) { return x.metrics; })); p.examRuns.push({ t: Date.now(), v: ev.version, n: recs.length, level: ev.level, hold: ev.hold, metrics: { processByFamily: ev.metrics.processByFamily, process: ev.metrics.process, compliance: ev.metrics.compliance, expectancyR: ev.metrics.expectancyR } }); while (p.examRuns.length > 10) p.examRuns.shift();
    var M = ev.metrics; var f = function (v, u) { return v === null || v === undefined || !isFinite(v) ? '―' : (u === 'R' ? sgn(v, 2) + 'R' : Math.round(v) + (u || '')); };
    var html = '<div class="rw-title">初見チャートの認定試験（v' + ev.version + '）の結果</div>' +
      (ev.level ? '<div class="outcome win"><b>判断の過程の目安：' + ev.level + '</b>（A：過程 80 点以上・規律 80% 以上・過大リスク 10% 以下／B：過程 65 点以上・規律 60% 以上／C：それ以外）</div>' : '<div class="outcome"><b>判定保留</b>：' + ev.hold.map(esc).join('／') + '</div>') +
      '<table class="tbl small"><tr><td>判断の過程の点（平均・群ごとの平均）</td><td>' + f(M.process, '点') + '・' + f(M.processByFamily, '点') + '</td></tr><tr><td>規律（ルール遵守率）</td><td>' + f(M.compliance, '%') + '</td></tr><tr><td>上位足の正答率</td><td>' + f(M.htfAcc, '%') + '（' + M.htfN + '）</td></tr><tr><td>ダイバージェンスの理解</td><td>' + f(M.divAcc, '%') + '（' + M.divN + '問）</td></tr>' +
      '<tr><td>見送り率・妥当な見送り</td><td>' + f(M.skipRate, '%') + '・' + f(M.goodSkipRate, '%') + '</td></tr><tr><td>過大リスクの率</td><td>' + f(M.overRiskRate, '%') + '</td></tr><tr><td>コスト込みの期待値R</td><td>' + f(M.expectancyR, 'R') + '（取引 ' + M.trades + '回' + (M.trades < 30 ? '・回数が少なく不安定' : '') + '）</td></tr>' +
      '<tr><td>型の群</td><td>' + Object.keys(M.families).length + '種類（1群 ' + Tr.EXAM_FAMILY_MAX + '問まで）</td></tr>' + (ev.reproducibility ? '<tr><td>前の試験との差（再現性）</td><td>' + ev.reproducibility.runs + '回で ' + Math.round(ev.reproducibility.min) + '〜' + Math.round(ev.reproducibility.max) + '点（幅 ' + Math.round(ev.reproducibility.spread) + '）</td></tr>' : '') + '</table>' +
      '<div class="small">' + esc(ev.note) + '</div><div class="an-title">問題ごとの振り返り（試験の間は出さなかったもの）</div><table class="tbl small"><tr><th>#</th><th>型</th><th>判断</th><th>結果</th><th>過程</th></tr>' + recs.map(function (x, i) { var cat = PE().cat(x.cat); return '<tr><td>' + (i + 1) + '</td><td>' + esc(cat ? cat.title : '（型なし）') + '</td><td>' + ({ trade: x.side === 'buy' ? 'ロング' : 'ショート', skip: '見送り', timeout: '時間切れ' })[x.kind] + '</td><td>' + (x.kind === 'trade' ? sgn(x.riskR, 2) + 'R' : '―') + '</td><td>' + x.process + '</td></tr>'; }).join('') + '</table>' + NOTE;
    await Win.panel(html, { cls: 'result-panel rw-panel pd-review pd-stats-panel' }); return ev;
  };
  // 前のセットで復習：認定には使わない（記録は set:'exam_review' で別に数える）
  PUI.examReview = async function () {
    var p = PUI.ensure(); var last = null; for (var i = p.history.length - 1; i >= 0; i--) if (p.history[i].set === 'exam' && p.history[i].seriesId) { last = p.history[i].seriesId; break; }
    var seeds = p.history.filter(function (x) { return x.set === 'exam' && x.seriesId === last; }).map(function (x) { return { seed: x.seed, gen: x.gen, cat: x.cat }; }); if (!seeds.length) { await Win.message(['復習できる前のセットがない。']); return; }
    for (var k = 0; k < seeds.length; k++) { var r = await PUI.play({ level: 8, lvDef: { lv: 8, name: '前のセットの復習（認定には使わない）', set: 'exam_review' }, pick: { seed: seeds[k].seed, gen: seeds[k].gen, set: 'exam_review', cat: seeds[k].cat }, hints: false }); if (!r || r.next !== 'again') return; }
  };
  // 試験の 1 問のあと：結果・型・模範解答は出さずに、次へ進むか中断するかだけ
  PUI.examAfter = function (rec) {
    return Win.panel('<div class="rw-title">解答を記録した</div><div class="small">試験の間は、結果・問題の型・模範解答を出さない（試験の終わりにまとめて振り返る）。</div><div class="trade-cmds ready"><button class="tcmd buy" data-cmd="again">次の問題</button><button class="tcmd" data-cmd="quit">中断する（続きから再開できる）</button></div>',
      { cls: 'result-panel rw-panel pd-review pd-exam-after', noClose: true, onCancel: function () { }, setup: function (node, close) { var d = false; node.addEventListener('click', function (e) { var b = e.target.closest('[data-cmd]'); if (!b || d) return; e.stopPropagation(); d = true; close(b.getAttribute('data-cmd')); }); } });
  };
})(typeof window !== 'undefined' ? window : globalThis);
