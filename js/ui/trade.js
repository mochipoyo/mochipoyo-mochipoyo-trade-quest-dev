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

  // scenarios: 出題候補のID配列。opts: {title, practice, minScore}
  TradeUI.trial = function (scenarioIds, opts) {
    opts = opts || {};
    var d = State.data;
    var id = scenarioIds[Math.floor(Math.random() * scenarioIds.length)];
    var seedOffset = opts.practice ? Math.floor(Math.random() * 6) : 0;
    var scn = Scenarios.build(id, seedOffset);
    var def = scn.def;
    var cur = { checkedHigherTF: false, checkedIndicators: false, usedHint: false };
    TradeUI.state.tf = def.focusTF;
    var chartCtl = null;
    TradeUI.current = { scn: scn, id: id };

    return new Promise(function (resolve) {
      var tfs = CONFIG.timeframes.map(function (t) { return '<button class="tf" data-tf="' + t.id + '">' + esc(t.label) + '</button>'; }).join('');
      var html = '<div class="trade-head"><b>' + esc(opts.title || 'チャートの試練') + '</b><span class="muted small">　この場面でどう行動する？（学習用人工データ・' + esc(CONFIG.market.pairName) + '）</span></div>' +
        '<div class="chart-tools"><div class="tfs">' + tfs + '</div><div class="ctl"><button class="mini" data-zoom="in">＋</button><button class="mini" data-zoom="out">－</button><button class="mini" data-zig="1">ZigZag</button></div></div>' +
        '<canvas class="chart" id="trial-chart"></canvas>' +
        '<div class="trade-cmds"><button class="tcmd buy" data-cmd="buy">買い</button><button class="tcmd sell" data-cmd="sell">売り</button><button class="tcmd skip" data-cmd="skip">見送り</button><button class="tcmd" data-cmd="higher">上位足を確認</button><button class="tcmd" data-cmd="ind">インジケーター確認</button><button class="tcmd" data-cmd="hint">ヒント</button></div>' +
        '<div class="trade-msg" id="trial-msg">まず上位足（日足・4時間足）を確認してから判断しよう。</div>';
      Win.panel(html, { cls: 'trade-panel', noClose: true, setup: function (node, close) {
        var canvas = node.querySelector('#trial-chart');
        function render() {
          var tf = CONFIG.timeframes.filter(function (t) { return t.id === TradeUI.state.tf; })[0];
          var base = Indicators.aggregate(scn.base, tf.factor);
          var rev = chartCtl.revealed.length ? Indicators.aggregate(scn.base.concat(chartCtl.revealed), tf.factor).slice(base.length) : [];
          var an = Chart.buildView(base, rev);
          var o = { visibleBars: TradeUI.state.visible, showZigzag: d.settings.showZigzag, tfLabel: tf.label }; Object.keys(chartCtl.opts).forEach(function (k) { o[k] = chartCtl.opts[k]; });
          Chart.render(canvas, an, o);
          node.querySelectorAll('.tf').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tf') === TradeUI.state.tf); });
          node.querySelector('[data-zig]').classList.toggle('on', d.settings.showZigzag);
          return an;
        }
        chartCtl = { revealed: [], opts: {}, render: render };
        var msgEl = node.querySelector('#trial-msg');
        function msg(t) { msgEl.textContent = t; }
        node.addEventListener('click', function (e) {
          var t = e.target; e.stopPropagation();
          if (t.getAttribute('data-tf')) { TradeUI.state.tf = t.getAttribute('data-tf'); if (['1h', '4h', '1d'].indexOf(TradeUI.state.tf) >= 0 && !cur.checkedHigherTF) { cur.checkedHigherTF = true; msg('上位足を確認した。' + describeTF(scn.states[TradeUI.state.tf], TradeUI.state.tf).slice(1, 3).join(' ')); } render(); }
          if (t.getAttribute('data-zoom')) { TradeUI.state.visible = Engine.clamp(TradeUI.state.visible + (t.getAttribute('data-zoom') === 'in' ? -15 : 15), CONFIG.chart.minVisible, CONFIG.chart.maxVisible); render(); }
          if (t.getAttribute('data-zig')) { d.settings.showZigzag = !d.settings.showZigzag; render(); }
          var c = t.getAttribute('data-cmd'); if (!c || node.classList.contains('locked')) return;
          if (c === 'higher') { cur.checkedHigherTF = true; TradeUI.state.tf = '4h'; render(); var st = scn.states; msg('上位足を確認した。' + describeTF(st['1d'], '1d').slice(1, 2).join('') + ' ／ ' + describeTF(st['4h'], '4h').slice(1, 3).join(' ')); }
          if (c === 'ind') { cur.checkedIndicators = true; var an = render(); Win.panel('<div class="rw-title">インジケーター確認</div><div class="ind-list">' + describeTF(an, TradeUI.state.tf).map(esc).join('<br>') + '</div><p class="muted small">※表示チャートと同じ計算結果。未確定のピボットは含まない。</p>'); }
          if (c === 'hint') { cur.usedHint = true; Win.panel('<div class="rw-title">ヒント</div><p>' + esc(def.hint) + '</p>'); }
          if (c === 'skip') decide({ action: 'skip' });
          if (c === 'buy' || c === 'sell') openOrder(c);
        });
        function openOrder(action) {
          var sug = TradeEval.suggestLevels(scn, action);
          var riskOpts = CONFIG.risk.riskOptions.map(function (r) { return '<option value="' + r + '" ' + (r === d.settings.riskPercent ? 'selected' : '') + '>' + r + '%' + (r > CONFIG.risk.maxSafeRiskPercent ? '（過大）' : '') + '</option>'; }).join('');
          var oh = '<div class="rw-title">注文設定（' + (action === 'buy' ? '買い' : '売り') + '）</div><div class="order-grid"><label>エントリー<input type="text" id="o-entry" value="' + sug.entry.toFixed(3) + '" readonly></label><label>損切り<input type="number" step="0.001" id="o-sl" value="' + sug.sl.toFixed(3) + '"></label><label>利確<input type="number" step="0.001" id="o-tp" value="' + sug.tp.toFixed(3) + '"></label><label>リスク<select id="o-risk">' + riskOpts + '</select></label></div>' +
            '<div class="rw-row"><div class="rw-btn" id="o-swing">直近スイング外側＋RR1:2</div><div class="rw-btn" id="o-nosl">損切りなし（非推奨）</div></div><div id="o-calc" class="calc"></div><div class="rw-row"><div class="rw-btn ok" id="o-ok">エントリー確定</div><div class="rw-btn" id="o-cancel">キャンセル</div></div>';
          Win.panel(oh, { noClose: true, setup: function (on, oclose) {
            function recalc() { var sl = parseFloat(on.querySelector('#o-sl').value), tp = parseFloat(on.querySelector('#o-tp').value), rp = parseFloat(on.querySelector('#o-risk').value); var entry = sug.entry; var rpips = isNaN(sl) ? 0 : (action === 'buy' ? entry - sl : sl - entry) / CONFIG.market.pip; var wpips = isNaN(tp) ? 0 : (action === 'buy' ? tp - entry : entry - tp) / CONFIG.market.pip; var rr = rpips > 0 ? wpips / rpips : 0; on.querySelector('#o-calc').innerHTML = '損切り幅 <b>' + (rpips > 0 ? rpips.toFixed(0) : '―') + 'pips</b>／利確幅 <b>' + (wpips > 0 ? wpips.toFixed(0) : '―') + 'pips</b>／RR <b>' + (rr > 0 ? '1:' + rr.toFixed(2) : '―') + '</b>／ロット ' + (rpips > 0 ? TradeEval.lotFor(d.trade.capital, rp, rpips) + '万通貨' : '―') + '（許容損失 ' + Math.round(d.trade.capital * rp / 100).toLocaleString() + '円）'; chartCtl.opts = { sl: isNaN(sl) ? null : sl, tp: isNaN(tp) ? null : tp, entry: entry }; render(); }
            on.addEventListener('input', recalc); on.addEventListener('change', recalc);
            on.querySelector('#o-swing').onclick = function () { on.querySelector('#o-sl').value = sug.sl.toFixed(3); on.querySelector('#o-tp').value = sug.tp.toFixed(3); recalc(); };
            on.querySelector('#o-nosl').onclick = function () { on.querySelector('#o-sl').value = ''; recalc(); };
            on.querySelector('#o-cancel').onclick = function () { chartCtl.opts = {}; render(); oclose(-1); };
            on.querySelector('#o-ok').onclick = function () { var sl = parseFloat(on.querySelector('#o-sl').value), tp = parseFloat(on.querySelector('#o-tp').value), rp = parseFloat(on.querySelector('#o-risk').value); oclose(1); decide({ action: action, sl: isNaN(sl) ? null : sl, tp: isNaN(tp) ? null : tp, riskPercent: rp }); };
            recalc();
          } });
        }
        function decide(decision) {
          node.classList.add('locked');
          decision.checkedHigherTF = cur.checkedHigherTF; decision.checkedIndicators = cur.checkedIndicators; decision.usedHint = cur.usedHint;
          if (decision.riskPercent === undefined) decision.riskPercent = d.settings.riskPercent;
          var ev = TradeEval.evaluate(scn, decision); ev.scenarioId = id;
          var sim = ev.trade ? TradeEval.simulate(scn, ev.trade, 96) : null;
          var money = TradeEval.applyResult(d.trade.stats, d.trade, ev, sim);
          // 学習クエスト用カウンター
          if (ev.actionOk) { State.count('trial_ok:' + id); if (id === 'hidden_bull' || id === 'hidden_bear') State.count('trial_ok:hidden'); }
          if (ev.trade && ev.items.some(function (it) { return it.name === '損切り位置' && it.ok; })) State.count('trial_sl_ok');
          if (ev.score >= 90) State.count('trial_perfect');
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
          var items = ev.items.map(function (it) { return '<li class="' + (it.ok ? 'ok' : 'ng') + '"><span class="mark">' + (it.ok ? '✓' : '✗') + '</span><b>' + esc(it.name) + '</b>：' + esc(it.note) + '</li>'; }).join('');
          var outcome = '';
          if (ev.trade && sim) {
            var o = ({ tp: '利確に到達', sl: '損切りに到達', time: '時間切れで決済' })[sim.outcome];
            outcome = '<div class="outcome ' + (sim.pips >= 0 ? 'win' : 'lose') + '"><b>その後：' + o + '</b>　' + (sim.pips >= 0 ? '+' : '') + sim.pips.toFixed(0) + 'pips（' + sim.bars + '本後）　仮想損益 ' + (money.pnl >= 0 ? '+' : '') + Math.round(money.pnl).toLocaleString() + '円' + (sim.ambiguous ? '<br><span class="warn">※同じ足で利確と損切りの両方に到達したため、保守的に損切り扱い</span>' : '') + (sim.worstPips !== undefined ? '<br><span class="warn">※損切りなしのため最大含み損 ' + sim.worstPips.toFixed(0) + 'pips</span>' : '') + '<br><span class="muted small">' + (ev.actionOk && sim.pips < 0 ? '正しい判断でも損切りになることはある。評価されるのは判断の過程。' : (!ev.actionOk && sim.pips >= 0 ? '結果は利益でも判断の過程に問題がある。繰り返すと資金を失う。' : '過程と結果が一致した。この判断を繰り返そう。')) + '</span></div>';
          } else outcome = '<div class="outcome"><b>その後の値動き</b>：チャートで確認（' + (ev.actionOk ? '見送りが適切な場面だった' : '根拠が揃った場面だった') + '）</div>';
          var rh = '<div class="result-head"><div class="score">' + ev.score + '<span>点</span></div><div><div class="muted small">場面：' + esc(def.title) + '</div><div>あなたの判断：<b>' + esc(ev.chosenLabel) + '</b>　適切な判断：<b class="gold-text">' + esc(ev.correctLabel) + '</b></div></div></div><ul class="eval">' + items + '</ul>' + (ev.violations.length ? '<div class="violations">ルール違反：' + ev.violations.map(esc).join('、') + '</div>' : '') + outcome;
          if (root.Audio) root.Audio.sfx(ev.score >= 60 ? 'win' : 'hit');
          Win.panel(rh, { cls: 'result-panel' }).then(function () { close({ score: ev.score, actionOk: ev.actionOk, ev: ev, scenarioId: id }); });
        }
        requestAnimationFrame(render);
        root.onresize = function () { if (document.getElementById('trial-chart')) render(); };
      } }).then(function (res) { State.autosave(); resolve(res || null); });
    });
  };

  TradeUI.showRecord = function () {
    var st = State.data.trade.stats; var sm = TradeEval.summarizeStats(st);
    var rows = [['判断回数', st.scoreCount], ['トレード回数', sm.trades], ['勝率', sm.winRate.toFixed(0) + '%'], ['平均リスクリワード', sm.avgRR ? '1:' + sm.avgRR.toFixed(2) : '―'], ['最大ドローダウン', sm.maxDrawdown.toFixed(1) + '%'], ['見送り判断', sm.skips + '（正しい見送り ' + sm.correctSkips + '）'], ['ルール違反', sm.violations], ['学習スコア（平均点）', sm.learningScore.toFixed(1)], ['仮想証拠金', Math.round(State.data.trade.capital).toLocaleString() + '円'], ['トレーダーランク', TradeEval.rank(st)]];
    var bySc = Object.keys(st.byScenario).map(function (id) { var dd = Scenarios.get(id); var r = st.byScenario[id]; return '<tr><td>' + esc(dd ? dd.title : id) + '</td><td>' + r.correct + '/' + r.plays + '</td></tr>'; }).join('');
    return Win.panel('<div class="rw-title">トレード学習記録</div><table class="tbl">' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>'; }).join('') + '</table><p class="muted small">仮想証拠金は学習用で、冒険のゴールド（G）とは別管理。ランクは判断の質で決まる。</p>' + (bySc ? '<h3>場面別の正答</h3><table class="tbl">' + bySc + '</table>' : ''));
  };

  root.TradeUI = TradeUI;
})(typeof window !== 'undefined' ? window : globalThis);
