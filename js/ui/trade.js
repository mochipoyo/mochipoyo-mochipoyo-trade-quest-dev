/* =========================================================
   UI / Trade : チャートの試練（学習イベント）
   既存の Chart / Indicators / Scenarios / TradeEval をそのまま使う
   ========================================================= */
(function (root) {
  'use strict';

  var Win = root.Win, State = root.State, Scenarios = root.Scenarios, TradeEval = root.TradeEval, Chart = root.Chart, CONFIG = root.CONFIG, Indicators = root.Indicators, Engine = root.Engine;
  var esc = Win.esc;

  var TradeUI = { state: { tf: '15m', visible: CONFIG.chart.visibleBars } };

  function tfLabel(id) { return CONFIG.timeframes.filter(function (t) { return t.id === id; })[0].label; }
  function describeTF(an, tfId) {
    var lines = ['【' + tfLabel(tfId) + '】'];
    lines.push('波形：' + ({ up: '高値・安値ともに切り上げ（上昇）', down: '高値・安値ともに切り下げ（下降）', range: '切り上げ・切り下げが揃わない（レンジ）', unknown: '確定したスイングが不足' })[an.dow.trend]);
    lines.push('EMA：' + ({ up: 'EMA20＞30＞40（上昇の並び）', down: 'EMA20＜30＜40（下降の並び）', mixed: 'EMAが絡み合っている' })[an.emaOrder] + '、価格はEMAの' + ({ above: '上', below: '下', between: '間' })[an.pricePos] + '、EMA20との乖離' + an.distFromEma20.toFixed(0) + 'pips');
    if (an.rciNow !== null && an.rciNow !== undefined) lines.push('RCI(9)：' + an.rciNow.toFixed(0) + '（' + ({ oversold_reversal: '-70付近から反転中', overbought_reversal: '+70付近から反転中', overbought: '+70以上', oversold: '-70以下', neutral: '中立' })[an.rciState] + '）');
    lines.push('MACD：' + (an.macdState === 'bull' ? 'シグナルの上' : 'シグナルの下') + (an.div.regularBull ? '、通常の強気ダイバージェンス' : '') + (an.div.regularBear ? '、通常の弱気ダイバージェンス' : '') + (an.div.hiddenBull ? '、強気ヒドゥン' : '') + (an.div.hiddenBear ? '、弱気ヒドゥン' : ''));
    lines.push('直近スイング：高値 ' + an.lastHigh.toFixed(3) + '／安値 ' + an.lastLow.toFixed(3) + '、直近5本 ' + (an.surge >= 0 ? '+' : '') + an.surge.toFixed(0) + 'pips');
    return lines;
  }

  // scenarios: 出題候補のID配列。opts: {title, practice, minScore, tutorial, scenarioId}
  // 流れ：①チャートを見て5つの分析（上位足・波形・EMA・RCI・MACD）→ ②買い/売り/見送り → ③理由 → ④注文設定（トレード時）→ ⑤結果（判断過程ごとの採点）
  // 正解は回答前に一切表示しない。ヒントは段階式（考え方 → 場面のヒント → 数値表示）で、使うと記録に残る
  // v7.3 検証済みのシードの数（js/data/scenario-seeds.js。v7.3 で 6 → 10）
  function seedCount(id) { var a = root.SCENARIO_SEEDS && root.SCENARIO_SEEDS[id]; return a && a.length ? a.length : 6; }
  TradeUI.seedCount = seedCount;
  // v7.3 戦闘の「相場の試練」の場面を選ぶ：シナリオ × シード（オフセット）の組み合わせから、最近出た12の場面を避けて選ぶ（セーブの counters.trialRecent）
  TradeUI.pickTrial = function (ids, rnd) {
    rnd = rnd || Math.random; var d = root.State && root.State.data; var c = d ? (d.counters = d.counters || {}) : {}; var recent = Array.isArray(c.trialRecent) ? c.trialRecent : [];
    var all = []; (ids || []).forEach(function (id) { for (var o = 0; o < seedCount(id); o++) all.push({ id: id, offset: o, key: id + ':' + o }); });
    if (!all.length) return null; var cand = all.filter(function (x) { return recent.indexOf(x.key) < 0; }); if (!cand.length) cand = all;
    var pk = cand[Math.floor(rnd() * cand.length)]; recent.push(pk.key); while (recent.length > 12) recent.shift(); c.trialRecent = recent; return pk;
  };
  TradeUI.trial = function (scenarioIds, opts) {
    opts = opts || {};
    var d = State.data;
    // v7.3 opts.vary（クエスト・マップの試練）：場面を選ぶときに、シナリオ × シードから最近出たものを避けて選ぶ（pickTrial）
    var pk0 = (opts.vary && opts.seedOffset === undefined && !opts.scenarioId && !opts.tutorial) ? TradeUI.pickTrial(scenarioIds) : null;
    var id = opts.scenarioId || (pk0 ? pk0.id : scenarioIds[Math.floor(Math.random() * scenarioIds.length)]);
    var seedOffset = pk0 ? pk0.offset : opts.seedOffset !== undefined ? opts.seedOffset : (opts.practice ? Math.floor(Math.random() * seedCount(id)) : 0);   // v5.3: 学習イベント側から別シードを指定できる（v7.3 練習はシードの数（10）から選ぶ）
    var scn = Scenarios.build(id, seedOffset);
    var def = scn.def;
    var cur = { checkedHigherTF: false, hintLevel: 0, analysis: {}, reason: null, swing: { high: null, low: null }, pick: null };
    TradeUI.state.tf = def.focusTF;
    var chartCtl = null;
    TradeUI.current = { scn: scn, id: id, cur: cur, def: def };
    var focusLabel = (CONFIG.timeframes.filter(function (t) { return t.id === def.focusTF; })[0] || {}).label || def.focusTF;
    var Q = TradeEval.ANALYSIS; var tutorial = !!opts.tutorial;
    // v5.8 中断：判断を確定する前なら、いつでもやめて戻れる（採点・記録・報酬なし。結果は null）。戦闘中の試練（noQuit）は中断できない
    var canQuit = !opts.noQuit; var askQuit = null; TradeUI.lastAborted = false;
    // v5.8 試練の画面を開いている間は、戦闘のHP窓・メッセージ・オートボタンを隠す（戦闘中の「相場の試練」で下のボタンが押せなかった）
    var stageEl = document.getElementById('stage'); if (stageEl) stageEl.classList.add('trade-open');

    return new Promise(function (resolve) {
      var tfs = CONFIG.timeframes.map(function (t) { return '<button class="tf" data-tf="' + t.id + '">' + esc(t.label) + '</button>'; }).join('');
      var qhtml = Q.map(function (q, i) { return '<div class="aq" data-q="' + q.key + '"><div class="aq-t"><span class="aq-n">' + (i + 1) + '</span>' + esc(TradeEval.qTitle(q, scn)) + '</div><div class="aq-o">' + q.options.map(function (o) { return '<button class="aopt" data-q="' + q.key + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>'; }).join('');
      var html = '<div class="trade-head"><b>' + esc(opts.title || 'チャートの試練') + '</b><span class="muted small">　学習用の人工チャート（' + esc(CONFIG.market.pairName) + '）。未来の足は判断後に表示されます</span></div>' +
        '<div class="trade-chartwrap"><div class="chart-tools"><div class="tfs">' + tfs + '</div><div class="ctl"><button class="mini" data-zoom="in">＋</button><button class="mini" data-zoom="out">－</button><button class="mini" data-zig="1">ZigZag</button><button class="mini hintbtn" data-cmd="hint">ヒント</button>' + (canQuit ? '<button class="mini quitbtn" data-cmd="quit" title="この試練をやめて戻る（記録されない）">中断</button>' : '') + '</div></div>' +
        '<canvas class="chart" id="trial-chart"></canvas></div>' +   // v8.9 時間足のボタンとチャートをひとまとめに（スマホの縦：問題を見ている間もチャートを上に残す／横：チャートを左・問題を右）
        '<div class="trade-msg" id="trial-msg"></div>' +
        '<div class="analysis" id="trial-analysis"><div class="an-title">① チャートを分析する（時間足ボタンで上位足も確認できる）</div>' + qhtml + '</div>' +
        '<div class="swing-pick" id="trial-swing"><div class="an-title">② ' + esc(focusLabel) + 'の「直近の確定した高値・安値」をチャートでタップして指定</div><div class="sp-row"><button class="pickbtn" data-pick="high">高値を指定</button><button class="pickbtn" data-pick="low">安値を指定</button><span class="small" id="swing-st">未指定</span></div></div>' +
        '<div class="trade-cmds" id="trial-cmds"><button class="tcmd buy" data-cmd="buy">買い</button><button class="tcmd sell" data-cmd="sell">売り</button><button class="tcmd skip" data-cmd="skip">見送り</button></div>';
      Win.panel(html, { cls: 'trade-panel', noClose: true, onCancel: function () { if (askQuit) askQuit(); }, setup: function (node, close) {
        var canvas = node.querySelector('#trial-chart');
        var msgEl = node.querySelector('#trial-msg'); var cmds = node.querySelector('#trial-cmds');
        function msg(t) { msgEl.textContent = t; }
        function render() {
          var tf = CONFIG.timeframes.filter(function (t) { return t.id === TradeUI.state.tf; })[0];
          var base = Indicators.aggregate(scn.base, tf.factor);
          var rev = chartCtl.revealed.length ? Indicators.aggregate(scn.base.concat(chartCtl.revealed), tf.factor).slice(base.length) : [];
          var an = Chart.buildView(base, rev);
          var onFocus = TradeUI.state.tf === def.focusTF;
          var o = { visibleBars: TradeUI.state.visible, showZigzag: d.settings.showZigzag && !cur.pick, tfLabel: tf.label, pickMode: cur.pick, marks: onFocus ? [cur.swing.high && { index: cur.swing.high.index, price: cur.swing.high.price, type: 'high' }, cur.swing.low && { index: cur.swing.low.index, price: cur.swing.low.price, type: 'low' }].filter(Boolean) : [] }; Object.keys(chartCtl.opts).forEach(function (k) { o[k] = chartCtl.opts[k]; });
          Chart.render(canvas, an, o);
          node.querySelectorAll('.tf').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tf') === TradeUI.state.tf); });
          node.querySelector('[data-zig]').classList.toggle('on', d.settings.showZigzag);
          return an;
        }
        chartCtl = { revealed: [], opts: {}, render: render };
        function swingDone() { return !!(cur.swing.high && cur.swing.low); }
        function answered() { return Q.filter(function (q) { return !cur.analysis[q.key]; }).length === 0 && swingDone(); }
        function swingStatus() { var el = node.querySelector('#swing-st'); if (!el) return; el.textContent = (cur.swing.high ? '高値 ' + cur.swing.high.price.toFixed(3) : '高値 未指定') + '　' + (cur.swing.low ? '安値 ' + cur.swing.low.price.toFixed(3) : '安値 未指定'); node.querySelectorAll('.pickbtn').forEach(function (b) { b.classList.toggle('on', cur.pick === b.getAttribute('data-pick')); b.classList.toggle('done', !!cur.swing[b.getAttribute('data-pick')]); }); }
        function refreshState() {
          var left = Q.filter(function (q) { return !cur.analysis[q.key]; });
          cmds.classList.toggle('ready', answered());
          swingStatus();
          if (left.length) msg('まず①の5つの分析を選ぼう（残り ' + left.length + '）。' + (tutorial ? '　' + left[0].hint : ''));
          else if (!swingDone()) msg('②「高値を指定」「安値を指定」を押してから、チャート上の直近の確定した高値・安値をタップしよう。' + (tutorial ? '　最後の未確定の波ではなく、左右に4本以上の足がある山と谷。' : ''));
          else msg('③ 分析を踏まえて、買い・売り・見送りを選ぼう。');
        }
        // v4.3: チャート上の高値・安値の指定（エントリー時間足に固定。指定中はZigZagを隠す）
        function setSwing(type, index) { var tf = CONFIG.timeframes.filter(function (t) { return t.id === def.focusTF; })[0]; var base = Indicators.aggregate(scn.base, tf.factor); index = Math.max(0, Math.min(base.length - 1, index)); var c = base[index]; cur.swing[type] = { index: index, price: type === 'high' ? c.h : c.l }; cur.pick = null; refreshState(); render(); }
        TradeUI.current.setSwing = setSwing;
        canvas.addEventListener('click', function (e) {
          if (!cur.pick || node.classList.contains('locked') || !canvas._map) return; e.stopPropagation();
          var r = canvas.getBoundingClientRect(); var x = e.clientX - r.left, y = e.clientY - r.top; if (!canvas._map.inPrice(y)) { msg('価格チャートの部分（上段）をタップしよう。'); return; }
          setSwing(cur.pick, canvas._map.xToIndex(x));
        });
        node.querySelectorAll('.pickbtn').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); if (node.classList.contains('locked')) return; var t = b.getAttribute('data-pick'); cur.pick = cur.pick === t ? null : t; if (cur.pick) { TradeUI.state.tf = def.focusTF; msg('チャートの価格部分で「直近の確定した' + (t === 'high' ? '高値' : '安値') + '」をタップ（' + focusLabel + '）。ZigZagは一時的に隠します。'); } swingStatus(); render(); }); });
        node.querySelectorAll('.aq-o').forEach(function (row) { row.addEventListener('click', function (e) { var b = e.target.closest('.aopt'); if (!b || node.classList.contains('locked')) return; e.stopPropagation(); var q = b.getAttribute('data-q'); cur.analysis[q] = b.getAttribute('data-v'); row.querySelectorAll('.aopt').forEach(function (x) { x.classList.toggle('on', x === b); }); refreshState(); }); });
        node.addEventListener('click', function (e) {
          var t = e.target.closest('button'); if (!t) return; e.stopPropagation();
          if (t.getAttribute('data-tf')) { TradeUI.state.tf = t.getAttribute('data-tf'); if (['1h', '4h', '1d'].indexOf(TradeUI.state.tf) >= 0) cur.checkedHigherTF = true; if (cur.pick && TradeUI.state.tf !== def.focusTF) { cur.pick = null; swingStatus(); } render(); }
          if (t.getAttribute('data-zoom')) { TradeUI.state.visible = Engine.clamp(TradeUI.state.visible + (t.getAttribute('data-zoom') === 'in' ? -15 : 15), CONFIG.chart.minVisible, CONFIG.chart.maxVisible); render(); }
          if (t.getAttribute('data-zig')) { d.settings.showZigzag = !d.settings.showZigzag; render(); }
          var c = t.getAttribute('data-cmd'); if (!c || node.classList.contains('locked')) return;
          if (c === 'hint') { showHint(); return; }
          if (c === 'quit') { if (askQuit) askQuit(); return; }
          if (!answered()) { msg(swingDone() ? '先に5つの分析を選ぼう。わからないときは「ヒント」。' : '先に②で直近の確定した高値・安値をチャート上で指定しよう。'); return; }
          if (c === 'skip') chooseReason('skip');
          if (c === 'buy' || c === 'sell') chooseReason(c);
        });
        // 段階式ヒント：1) 未回答の設問の考え方 2) 場面のヒント 3) 数値（インジケーター）を表示
        function showHint() {
          cur.hintLevel = Math.min(3, cur.hintLevel + 1);
          var left = Q.filter(function (q) { return !cur.analysis[q.key]; });
          var body;
          if (cur.hintLevel === 1) body = '<p><b>考え方</b></p><p>' + esc((left[0] || Q[0]).hint) + '</p>' + (!swingDone() ? '<p><b>高値・安値の指定</b>：左右に' + CONFIG.zigzag.depth + '本以上の足がある山（高値）と谷（安値）のうち、いちばん右のものを探す。最後の数本でできた山谷はまだ「確定」していないので選ばない。</p>' : '') + '<p class="muted small">もう一度押すと、この場面のヒント → 数値表示の順に進みます（ヒントの使用は記録されます）。</p>';
          else if (cur.hintLevel === 2) body = '<p><b>この場面のヒント</b></p><p>' + esc(def.hint) + '</p>';
          else { var an = render(); body = '<p><b>インジケーターの数値</b>（表示中の時間足・計算結果そのまま）</p><div class="ind-list">' + describeTF(an, TradeUI.state.tf).map(esc).join('<br>') + '</div><p class="muted small">数値を見ても、設問の答えは自分で選ぼう。</p>'; }
          Win.panel('<div class="rw-title">ヒント ' + cur.hintLevel + '/3</div>' + body);
        }
        // 理由の選択（正解＋誤りを混ぜた6択）
        function chooseReason(action) {
          var opts2 = TradeEval.reasonOptions(scn);
          Win.list(opts2.map(function (r) { return { label: r[1] }; }), { title: '「' + ({ buy: '買い', sell: '売り', skip: '見送り' })[action] + '」を選んだ理由は？', cancel: true }).then(function (i) {
            if (i < 0) return; cur.reason = opts2[i][0];
            if (action === 'skip') decide({ action: 'skip' }); else openOrder(action);
          });
        }
        function openOrder(action) {
          var sug = TradeEval.suggestLevels(scn, action);
          var riskOpts = CONFIG.risk.riskOptions.map(function (r) { return '<option value="' + r + '" ' + (r === d.settings.riskPercent ? 'selected' : '') + '>' + r + '%' + (r > CONFIG.risk.maxSafeRiskPercent ? '（過大）' : '') + '</option>'; }).join('');
          var oh = '<div class="rw-title">注文設定（' + (action === 'buy' ? '買い' : '売り') + '）</div><div class="order-grid"><label>エントリー<input type="text" id="o-entry" value="' + sug.entry.toFixed(3) + '" readonly></label><label>損切り<input type="number" step="0.001" id="o-sl" value="' + sug.sl.toFixed(3) + '"></label><label>利確目標<input type="number" step="0.001" id="o-tp" value="' + sug.tp.toFixed(3) + '"></label><label>リスク（資金の%）<select id="o-risk">' + riskOpts + '</select></label></div>' +
            '<canvas class="chart mini-chart" id="o-chart"></canvas><div class="rw-row"><div class="rw-btn" data-opick="sl">チャートで損切りを指定</div><div class="rw-btn" data-opick="tp">チャートで利確を指定</div></div>' +
            '<div class="rw-row"><div class="rw-btn" id="o-swing">直近スイング外側＋RR1:2</div><div class="rw-btn" id="o-nosl">損切りなし（非推奨）</div></div><div id="o-calc" class="calc"></div><div id="o-err" class="calc o-err" role="alert"></div><div class="rw-row"><div class="rw-btn ok" id="o-ok">エントリー確定</div><div class="rw-btn" id="o-cancel">やめる</div></div><p class="muted small">損切りは直近スイングの外側、利確は損切り幅の1.5〜3倍が参考値。数値は自分で変えられる。</p>';
          Win.panel(oh, { noClose: true, setup: function (on, oclose) {
            var opick = null; var oc = on.querySelector('#o-chart');
            function renderMini(sl, tp) { if (!oc) return; var tf = CONFIG.timeframes.filter(function (t) { return t.id === def.focusTF; })[0]; var an = Chart.buildView(Indicators.aggregate(scn.base, tf.factor), []); Chart.render(oc, an, { visibleBars: Math.min(TradeUI.state.visible, 60), showZigzag: d.settings.showZigzag, tfLabel: tf.label, sl: sl, tp: tp, entry: sug.entry, pickMode: opick, marks: [cur.swing.high && { index: cur.swing.high.index, price: cur.swing.high.price, type: 'high' }, cur.swing.low && { index: cur.swing.low.index, price: cur.swing.low.price, type: 'low' }].filter(Boolean) }); on.querySelectorAll('[data-opick]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-opick') === opick); }); }
            on.querySelectorAll('[data-opick]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); var t = b.getAttribute('data-opick'); opick = opick === t ? null : t; recalc(); }); });
            if (oc) oc.addEventListener('click', function (e) { if (!opick || !oc._map) return; e.stopPropagation(); var r = oc.getBoundingClientRect(); var y = e.clientY - r.top; if (!oc._map.inPrice(y)) return; var price = Math.round(oc._map.yToPrice(y) * 1000) / 1000; on.querySelector(opick === 'sl' ? '#o-sl' : '#o-tp').value = price.toFixed(3); opick = null; recalc(); });
            // v9.0 注文の確認：損切り・利確の向き・数値・ロット（最小ロットでも許容損失を超えるときは発注できない）を、確定の前に画面で示す
            function check() { var slv = on.querySelector('#o-sl').value, tpv = on.querySelector('#o-tp').value, rp = parseFloat(on.querySelector('#o-risk').value); var entry = sug.entry;
              var vo = root.TradeCore.validateOrder({ side: action, entry: entry, sl: slv === '' ? null : slv, tp: tpv === '' ? null : tpv, requireSL: false, requireTP: false, basis: '判断した足の終値' });
              var sz = vo.ok && vo.riskPips > 0 ? TradeEval.sizeFor(d.trade.capital, rp, vo.riskPips) : null; var errs = vo.errors.map(function (e) { return e.msg; }); var warns = vo.warnings.map(function (w) { return w.msg; });
              if (sz && !sz.ok) { if (sz.errors.some(function (e) { return e.code === 'capital_zero'; })) warns.push('仮想資金が0円のため、この取引の損益は0円として記録する'); else errs = errs.concat(sz.errors.map(function (e) { return e.msg; })); }
              return { vo: vo, sz: sz, errs: errs, warns: warns, rp: rp }; }
            function showCheck(ck) { var el = on.querySelector('#o-err'); if (!el) return; el.innerHTML = ck.errs.length ? '<b class="bad">発注できない：</b>' + ck.errs.map(esc).join('<br>') : ck.warns.length ? '<span class="muted small">注意：' + ck.warns.map(esc).join('／') + '</span>' : ''; }
            function recalc() { var ck = check(); showCheck(ck); var sl = parseFloat(on.querySelector('#o-sl').value), tp = parseFloat(on.querySelector('#o-tp').value), rp = ck.rp; var entry = sug.entry; renderMini(isNaN(sl) ? null : sl, isNaN(tp) ? null : tp); var rpips = ck.vo.riskPips || 0; var wpips = ck.vo.rewardPips || 0; var lot = ck.sz && ck.sz.ok ? ck.sz.lots : 0; on.querySelector('#o-calc').innerHTML = '損切り幅 <b>' + rpips.toFixed(0) + 'pips</b>　利確幅 <b>' + wpips.toFixed(0) + 'pips</b>　リスクリワード <b>' + (rpips > 0 && wpips > 0 ? '1:' + (wpips / rpips).toFixed(2) : '―') + '</b>' + (d.flags.academy_stats && rpips > 0 && wpips > 0 ? '　損益分岐の勝率 <b>' + (100 / (1 + wpips / rpips)).toFixed(1) + '%</b>' : '') /* v6.1 学院の統計学講義で表示 */ + '　許容損失 <b>' + Math.round(d.trade.capital * rp / 100).toLocaleString() + '円</b>　ロット <b>' + (ck.sz && ck.sz.ok ? lot.toFixed(2) : '―') + '</b><span class="muted small">（スプレッド・スリッページを含めない簡易の計算。架空ペア：1万通貨で1pip＝100円）</span>'; chartCtl.opts = { sl: isNaN(sl) ? null : sl, tp: isNaN(tp) ? null : tp, entry: entry }; render(); }
            on.addEventListener('input', recalc); on.addEventListener('change', recalc);
            on.querySelector('#o-swing').onclick = function () { on.querySelector('#o-sl').value = sug.sl.toFixed(3); on.querySelector('#o-tp').value = sug.tp.toFixed(3); recalc(); };
            on.querySelector('#o-nosl').onclick = function () { on.querySelector('#o-sl').value = ''; recalc(); };
            on.querySelector('#o-cancel').onclick = function () { chartCtl.opts = {}; render(); oclose(-1); };
            on.querySelector('#o-ok').onclick = function () { var ck = check(); showCheck(ck); if (ck.errs.length) { var el = on.querySelector('#o-err'); if (el && el.scrollIntoView) try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { } return; }   // 不正な注文は確定しない（直して入れ直す）
              oclose(1); decide({ action: action, sl: ck.vo.sl, tp: ck.vo.tp, riskPercent: ck.rp }); };
            recalc();
          } });
        }
        var decided = false, quitAsking = false;
        if (canQuit) askQuit = function () {
          if (decided || quitAsking || node.classList.contains('locked')) return; if (Win.layer && Win.layer.lastElementChild && Win.layer.lastElementChild !== node) return;   /* 理由・注文などの窓が上に開いているときは、先にそちらを閉じる */ quitAsking = true;
          Win.confirmQuit('この試練', '採点・記録はされない').then(function (yes) { quitAsking = false; if (!yes || decided) return; decided = true; TradeUI.lastAborted = true; close(null); });
        };
        function decide(decision) {
          if (decided) return; decided = true;   // 二重採点の防止
          node.classList.add('locked');
          decision.analysis = cur.analysis; decision.reason = cur.reason; decision.hintLevel = cur.hintLevel; decision.checkedHigherTF = cur.checkedHigherTF; decision.swing = cur.swing; cur.pick = null;
          if (decision.riskPercent === undefined) decision.riskPercent = d.settings.riskPercent;
          var ev = TradeEval.evaluateFull(scn, decision); ev.scenarioId = id;
          if (ev.invalid) { decided = false; node.classList.remove('locked'); msg('注文の値が正しくないため発注していない：' + ev.invalidOrder.errors.map(function (e) { return e.msg; }).join('／')); return; }   // v9.0 念のため（注文の画面で止めている）
          var sim = ev.trade ? TradeEval.simulate(scn, ev.trade, 96) : null;
          var money = TradeEval.applyResult(d.trade.stats, d.trade, ev, sim);
          TradeEval.recordTopics(d.trade, ev);
          // 学習クエスト用カウンター
          if (ev.actionOk) { State.count('trial_ok:' + id); if (id === 'hidden_bull' || id === 'hidden_bear') State.count('trial_ok:hidden'); }
          if (ev.trade && ev.items.some(function (it) { return it.name === '損切り位置' && it.ok; })) State.count('trial_sl_ok');
          if (ev.score >= 90) State.count('trial_perfect');
          if (root.Growth) root.Growth.afterTrial(ev, opts);   // v4.2: 特別クエスト用カウンター・苦手な判断・復習履歴
          msg(ev.skill.name + '！ ' + (ev.trade ? 'エントリー確定。その後の値動きを進める……' : '見送りを選択。その後の値動きを確認する……'));
          chartCtl.opts = ev.trade ? { sl: ev.trade.sl, tp: ev.trade.tp, entry: ev.trade.entry } : {};
          TradeUI.state.tf = def.focusTF;
          var tf = CONFIG.timeframes.filter(function (t) { return t.id === def.focusTF; })[0];
          var total = sim ? sim.bars : 32, shown = 0;
          var timer = setInterval(function () {
            shown++; chartCtl.revealed = scn.future.slice(0, shown * tf.factor); render();
            if (shown >= total) { clearInterval(timer); setTimeout(function () { showResult(ev, sim, money); }, 350); }
          }, d.settings.textSpeed === 'instant' ? 20 : 70);
        }
        function showResult(ev, sim, money) {
          var items = ev.items.map(function (it) { return '<li class="' + (it.ok ? 'ok' : 'ng') + '"><span class="mark">' + (it.ok ? '✓' : '✗') + '</span><b>' + esc(it.name) + '</b>：' + esc(it.note) + '<span class="pts">' + (it.ok ? it.points : 0) + '/' + it.points + '</span></li>'; }).join('');
          var outcome = '';
          if (ev.trade && sim) {
            var o = ({ tp: '利確に到達', sl: '損切りに到達', time: '時間切れで決済' })[sim.outcome];
            outcome = '<div class="outcome ' + (sim.pips >= 0 ? 'win' : 'lose') + '"><b>その後：' + o + '</b>　' + (sim.pips >= 0 ? '+' : '') + sim.pips.toFixed(0) + 'pips（' + sim.bars + '本後）　仮想損益 ' + (money.pnl >= 0 ? '+' : '') + Math.round(money.pnl).toLocaleString() + '円' + ((sim.ambiguous ? '<br><span class="muted small">※同じ足で利確と損切りの両方に触れた（ローソク足だけでは先後が分からない）。保守的に「損切りが先」と仮定した</span>' : '') + (ev.trade.noStop ? '<br><span class="muted small">※損切りなしの注文：損益は 0.5万通貨として計算（学習用）。保有中の含み損の最大 ' + Math.round(sim.worstPips || 0) + 'pips</span>' : '') + '<br><span class="muted small">MAE（最大逆行）' + Math.round(sim.mae || 0) + 'pips・MFE（最大順行）+' + Math.round(sim.mfe || 0) + 'pips' + (ev.trade.riskPips > 0 && isFinite(sim.riskR) ? '・R ' + (sim.riskR >= 0 ? '+' : '') + sim.riskR.toFixed(2) + 'R（損益÷損切り幅）' : '') + '。スプレッドを含めない簡易の決済</span>') + '<br><span class="muted small">※点数は結果ではなく判断の過程で決まります</span></div>';
          } else outcome = '<div class="outcome"><b>その後の値動き</b>：チャートで確認（' + (ev.actionOk ? '見送りが適切な場面だった' : '根拠が揃った場面だった') + '）</div>';
          var rank = TradeEval.rank(d.trade);
          var rh = '<div class="result-head"><div class="score">' + ev.score + '<span>点</span></div><div><div class="muted small">場面：' + esc(def.title) + (ev.hintLevel ? '　（ヒント' + ev.hintLevel + '段階使用）' : '　（ヒントなし）') + '</div><div>あなたの判断：<b>' + esc(ev.chosenLabel) + '</b>　適切な判断：<b class="gold-text">' + esc(ev.correctLabel) + '</b>　分析 ' + ev.analysisOk + '/' + ev.analysisTotal + '　高値安値 ' + (ev.swingOk ? '○' : '×') + '</div></div></div><ul class="eval-list">' + items + '</ul><div class="explain"><b>解説：</b>' + esc(ev.summary) + '</div>' + outcome + '<div class="muted small">トレーダーランク：' + esc(rank.letter + '　' + rank.title) + '</div>';
          if (root.Audio) root.Audio.sfx(ev.score >= 60 ? 'win' : 'hit');
          Win.panel(rh, { cls: 'result-panel' }).then(function () { close({ score: ev.score, actionOk: ev.actionOk, ev: ev, scenarioId: id }); });
        }
        refreshState();
        if (tutorial) msg('まず時間足ボタンで「4時間足」を見て方向を確かめ、次に15分足に戻って波形・EMA・RCI・MACDを順に選ぼう。');
        requestAnimationFrame(render);
        root.onresize = function () { if (document.getElementById('trial-chart')) render(); };
      } }).then(function (res) { if (stageEl) stageEl.classList.remove('trade-open'); State.autosave(); var p = (root.Learning && res) ? root.Learning.checkUnlocks(true) : null; Promise.resolve(p).then(function () { return (root.Growth && res) ? root.Growth.check(true) : null; }).then(function () { resolve(res || null); }); });
    });
  };

  /* ---------- v8.8 簡易の相場の試練（通常戦闘から。テンポ重視） ----------
     ① 買い・売り・見送り → ② 理由を 1 つ（4 択）→ 判定。詳しい 5 つの分析・高値安値の指定・注文は修行場・学院の詳細モードで
     ・場面と正解は詳細モードと同じ（Scenarios・TradeEval.truth。判断する時点までの足で決まっている。その後の値動きは使わない）
     ・採点は簡易用（行動 70 点＋理由 30 点。答えていない項目を正解にしない）。詳しい成績（d.trade.stats・ランク）には入れず、d.trade.quick に別に記録
     ・損益は採点に使わない（「利益＝正解」と覚えないように）。結果は { quick: true, score, actionOk, reasonOk, action, reason, id } */
  TradeUI.QUICK_ACTION_PTS = 70; TradeUI.QUICK_REASON_PTS = 30;
  TradeUI.quickStats = function (d) { d = d || State.data; if (!d.trade.quick || typeof d.trade.quick !== 'object') d.trade.quick = { plays: 0, actionOk: 0, reasonOk: 0, log: [] }; return d.trade.quick; };
  TradeUI.quick = function (scenarioIds, opts) {
    opts = opts || {}; var d = State.data;
    var id = opts.scenarioId || scenarioIds[Math.floor(Math.random() * scenarioIds.length)];
    var scn = Scenarios.build(id, opts.seedOffset !== undefined ? opts.seedOffset : 0); var def = scn.def; var truth = TradeEval.truth(scn);
    var ro = TradeEval.reasonOptions(scn); var correctR = truth.reason; var others = ro.filter(function (r) { return r[0] !== correctR; }).slice(0, 3); var four = others.concat(ro.filter(function (r) { return r[0] === correctR; }));
    four.sort(function (a, b) { return ((a[0].charCodeAt(0) * 17 + def.seed) % 89) - ((b[0].charCodeAt(0) * 17 + def.seed) % 89); });
    var tfs = CONFIG.timeframes.filter(function (t) { return t.id === def.focusTF || t.id === '4h' || t.id === '1d'; });
    var state = { tf: def.focusTF, action: null, reason: null };
    var stageEl = document.getElementById('stage'); if (stageEl) stageEl.classList.add('trade-open');
    var html = '<div class="trade-head"><b>' + esc(opts.title || '相場の試練') + '</b><span class="muted small">　簡易モード（買い・売り・見送り＋理由を 1 つ）。学習用の人工チャート（' + esc(CONFIG.market.pairName) + '）。未来の足は表示しません</span></div>' +
      '<div class="trade-chartwrap"><div class="qt-tfs">' + tfs.map(function (t) { return '<button type="button" class="tf' + (t.id === def.focusTF ? ' on' : '') + '" data-tf="' + t.id + '">' + esc(t.label) + (t.id === def.focusTF ? '（この足で判断）' : '') + '</button>'; }).join('') + '</div>' +
      '<canvas class="chart qt-chart"></canvas></div>' +   // v8.9 時間足のボタンとチャートをひとまとめに
      '<div class="qt-step qt-act"><div class="qt-q">① どうする？（上位足のボタンで 4 時間足・日足も見られる）</div><div class="trade-cmds"><button type="button" class="tcmd buy" data-act="buy">▲ 買い</button><button type="button" class="tcmd sell" data-act="sell">▼ 売り</button><button type="button" class="tcmd skip" data-act="skip">■ 見送り</button></div></div>' +
      '<div class="qt-step qt-reason hidden"><div class="qt-q">② いちばんの理由は？</div><div class="qt-rs">' + four.map(function (r) { return '<button type="button" class="rw-btn qt-r" data-r="' + esc(r[0]) + '">' + esc(r[1]) + '</button>'; }).join('') + '</div></div>' +
      '<div class="qt-result hidden"></div><div class="qt-next hidden"><div class="rw-btn ok qt-ok" role="button" tabindex="0">次へ（Enter）</div></div>';
    return new Promise(function (resolve) {
      var done = false, out = null;
      Win.panel(html, { cls: 'trade-panel quick-trial', noClose: true, onOk: function () { if (out) fin(); }, setup: function (node, close) {
        var cv = node.querySelector('.qt-chart');
        function render() { var tf = CONFIG.timeframes.filter(function (t) { return t.id === state.tf; })[0]; var an = Chart.buildView(Indicators.aggregate(scn.base, tf.factor), []); try { Chart.render(cv, an, { visibleBars: TradeUI.state.visible, showZigzag: d.settings.showZigzag, tfLabel: tf.label, marks: [] }); } catch (e) { } node.querySelectorAll('.tf').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tf') === state.tf); }); }
        node.querySelectorAll('.tf').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); state.tf = b.getAttribute('data-tf'); render(); }); });
        node.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); if (state.action) return; state.action = b.getAttribute('data-act'); node.querySelectorAll('[data-act]').forEach(function (x) { x.disabled = true; x.classList.toggle('on', x === b); }); node.querySelector('.qt-reason').classList.remove('hidden'); }); });
        node.querySelectorAll('.qt-r').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); if (!state.action || state.reason) return; state.reason = b.getAttribute('data-r'); node.querySelectorAll('.qt-r').forEach(function (x) { x.classList.toggle('on', x === b); x.classList.add('locked'); }); judge(); }); });
        node.querySelector('.qt-ok').addEventListener('click', function (e) { e.stopPropagation(); fin(); });
        node.addEventListener('click', function (e) { e.stopPropagation(); });
        function judge() {
          var aOk = state.action === truth.action, rOk = state.reason === correctR; var score = (aOk ? TradeUI.QUICK_ACTION_PTS : 0) + (rOk ? TradeUI.QUICK_REASON_PTS : 0);
          var AN = { buy: '買い', sell: '売り', skip: '見送り' };
          var expl = ''; try { expl = TradeEval.explainTruth(scn, truth, truth).replace('分析はすべて正確でした。', ''); } catch (e) { expl = ''; }
          node.querySelector('.qt-result').innerHTML = '<div class="qt-res ' + (aOk ? 'ok' : 'ng') + '"><b>' + (aOk ? '○ 場面の読みどおり' : '× 場面の読みと違う') + '</b>　あなた：' + AN[state.action] + '／この場面の基本：' + AN[truth.action] + '</div>' +
            '<div class="small">理由：' + (rOk ? '○ ' : '× ') + esc(TradeEval.reasonLabel(state.reason)) + (rOk ? '' : '（この場面の要点：' + esc(TradeEval.reasonLabel(correctR)) + '）') + '</div>' +
            '<div class="small">簡易スコア <b>' + score + '</b> 点（行動 ' + TradeUI.QUICK_ACTION_PTS + '＋理由 ' + TradeUI.QUICK_REASON_PTS + '）</div>' +
            (expl ? '<div class="small muted">判断する時点で見えていたこと：' + esc(expl) + '</div>' : '') +
            '<div class="small muted">※ 簡易モードは損益で採点しません（勝ち負けではなく、場面の読みを確かめます）。詳しい分析・高値安値・注文の練習は修行場・学院の「詳細モード」で。</div>';
          node.querySelector('.qt-result').classList.remove('hidden'); node.querySelector('.qt-next').classList.remove('hidden'); node.querySelector('.qt-act').classList.add('done');
          var q = TradeUI.quickStats(d); q.plays++; if (aOk) q.actionOk++; if (rOk) q.reasonOk++; q.log.push({ t: Date.now(), id: id, a: state.action, r: state.reason, ok: aOk, rok: rOk }); if (q.log.length > 20) q.log = q.log.slice(-20);
          out = { quick: true, score: score, actionOk: aOk, reasonOk: rOk, action: state.action, reason: state.reason, id: id };
        }
        function fin() { if (done || !out) return; done = true; if (stageEl) stageEl.classList.remove('trade-open'); close(0); resolve(out); }
        render();
        TradeUI.quickCtl = { act: function (a) { var b = node.querySelector('[data-act="' + a + '"]'); if (b) b.click(); }, reason: function (k) { var b = node.querySelector('.qt-r[data-r="' + k + '"]'); if (b) b.click(); }, reasons: function () { return four.map(function (r) { return r[0]; }); }, truth: truth, next: fin };
      } });
    });
  };

  TradeUI.showRecord = function () {
    var st = State.data.trade.stats; var sm = TradeEval.summarizeStats(st);
    var rows = [['判断回数', st.scoreCount], ['トレード回数', sm.trades], ['勝率', sm.winRate.toFixed(0) + '%'], ['平均リスクリワード', sm.avgRR ? '1:' + sm.avgRR.toFixed(2) : '―'], ['最大ドローダウン', sm.maxDrawdown.toFixed(1) + '%'], ['見送り判断', sm.skips + '（正しい見送り ' + sm.correctSkips + '）'], ['ルール違反', sm.violations], ['学習スコア（平均点）', sm.learningScore.toFixed(1)], ['仮想証拠金', Math.round(State.data.trade.capital).toLocaleString() + '円'], ['トレーダーランク', (function () { var r = TradeEval.rank(State.data.trade); return r.letter + '　' + r.title; })()]];
    if (State.data.flags.academy_stats && sm.avgRR) rows.splice(4, 0, ['損益分岐の勝率（平均RRから・学院の講義）', (100 / (1 + sm.avgRR)).toFixed(1) + '%（実際の勝率 ' + sm.winRate.toFixed(0) + '%）']);   // v6.1
    var bySc = Object.keys(st.byScenario).map(function (id) { var dd = Scenarios.get(id); var r = st.byScenario[id]; return '<tr><td>' + esc(dd ? dd.title : id) + '</td><td>' + r.correct + '/' + r.plays + '</td></tr>'; }).join('');
    var topics = TradeEval.topicSummary(State.data.trade); var rank = TradeEval.rank(State.data.trade);
    var TP = State.data.trade.topics || {}; var dateS = function (ms) { var dt = new Date(ms); return (dt.getMonth() + 1) + '/' + dt.getDate(); };
    var tt = '<h3>分野別の記録</h3><table class="tbl topic-tbl"><tr><th>分野</th><th>挑戦</th><th>正解率</th><th>ヒント利用</th><th>習熟度</th><th>前回</th><th>復習</th></tr>' + topics.map(function (t) { var rv = TP[t.key] && TP[t.key].reviews || 0; return '<tr><td>' + esc(t.label) + '</td><td>' + t.plays + '</td><td>' + (t.acc === null ? '―' : Math.round(t.acc * 100) + '%') + '</td><td>' + (t.plays ? Math.round(t.hintRate * 100) + '%' : '―') + '</td><td class="lv-' + t.level + '">' + t.level + '</td><td>' + (t.plays ? (t.lastOk ? '○' : '×') + (t.last ? ' ' + dateS(t.last) : '') : '―') + '</td><td>' + (rv ? rv + '回' : '―') + '</td></tr>'; }).join('') + '</table><div class="small">トレーダーランク：<b class="gold-text">' + esc(rank.letter + ' ' + rank.title) + '</b>　ヒントなし正解 ' + (st.noHintPlays ? Math.round((st.noHintCorrect || 0) / st.noHintPlays * 100) + '%' : '―') + '　異なる場面の正解 ' + Object.keys(st.uniqueCorrect || {}).length + '</div>';
    var G = root.Growth; var mist = G ? G.topMistakes(3) : []; var rlog = (State.data.trade.reviewLog || []).slice(-5).reverse();
    var extra = tt + '<div class="rec-cols"><div><h3>苦手な判断</h3>' + (mist.length ? '<ul class="plain">' + mist.map(function (m) { return '<li>' + esc(m[0]) + '　<b>' + m[1] + '回</b></li>'; }).join('') + '</ul>' : '<div class="muted small">まだ記録なし</div>') + '</div><div><h3>復習履歴</h3>' + (rlog.length ? '<ul class="plain">' + rlog.map(function (r) { return '<li>' + dateS(r.at) + '　' + esc(TradeEval.topicLabel(r.topic)) + '　' + r.score + '点' + (r.ok ? ' ○' : ' ×') + '</li>'; }).join('') + '</ul>' : '<div class="muted small">「苦手分野の復習」から出題すると記録されます</div>') + '</div></div>';
    return Win.panel('<div class="rw-title">トレード学習記録</div><table class="tbl">' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>'; }).join('') + '</table><p class="muted small">仮想証拠金は学習用で、冒険のゴールド（G）とは別管理。ランクは判断の質で決まる。</p>' + extra + (bySc ? '<h3>場面別の正答</h3><table class="tbl">' + bySc + '</table>' : ''));
  };

  root.TradeUI = TradeUI;
})(typeof window !== 'undefined' ? window : globalThis);
