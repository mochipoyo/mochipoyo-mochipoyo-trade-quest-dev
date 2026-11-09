/* =========================================================
   UI / PracticeUI：もちぽよ実践トレード道場（環境認識 → 仮説 → 足送り（待つ） → 条件確認 → 注文 → 保有（管理） → 振り返り）
   ・計算は js/practice.js（PracticeEngine）・js/strategy.js（StrategyProfiles・ProcessGrade）・js/tradecore.js（TradeCore）
   ・入口：メニュー「トレード」→「もちぽよ実践トレード道場」／師匠の修行場／ボラティリティア学院の講義室
   ・相場は架空（学習用仮想ペア POYO/MOCHI）。表示している足より先は、決済・振り返りまで見せない
   ・問題の型（カテゴリー）・シードは振り返りまで出さない。学習用と未知の問題はシードの範囲が別
   ・セーブ：State.data.practice（なければ作る。旧セーブは State.migrate が初期値で補う）
   ・採点は判断の過程（環境認識・セットアップ・トリガー・執行と資金管理・規律）。結果（pips・R）は別の欄で、1回の結果で正誤を決めない
   ・「実際の売買で勝てる」「利益を保証」などは表示しない。架空の相場であることを画面に出す
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win, State = root.State, CONFIG = root.CONFIG, Chart = root.Chart, Engine = root.Engine; var esc = Win.esc;
  function PE() { return root.PracticeEngine; } function SPF() { return root.StrategyProfiles; } function TC() { return root.TradeCore; } function SE() { return root.SignalEngine; }
  var PUI = { HISTORY_MAX: 300, RECENT_MAX: 24 };
  PUI.LEVELS = [
    { lv: 1, name: 'Lv1 EMA の並びとダウ', cats: ['early', 'similar', 'ema_no_rci'], set: 'learn' },
    { lv: 2, name: 'Lv2 RCI：±70 の到達と実際の反転', cats: ['ema_no_rci', 'rci_touch', 'rci_rereversal'], set: 'learn' },
    { lv: 3, name: 'Lv3 MACD ダイバージェンス 4 種類', cats: ['regdiv_vs_htf', 'hidden_aligned', 'reg_vs_hidden'], set: 'learn' },
    { lv: 4, name: 'Lv4 上位足と下位足・確定足と未確定', cats: ['unconfirmed_pivot', 'stale_div', 'regdiv_vs_htf'], set: 'learn' },
    { lv: 5, name: 'Lv5 根拠がそろうまで待つ', cats: ['early', 'ema_no_rci', 'hidden_aligned'], set: 'learn' },
    { lv: 6, name: 'Lv6 損切り・利確・ロット・R の設計', cats: ['wide_stop', 'similar'], set: 'learn' },
    { lv: 7, name: 'Lv7 ダマシ・急変・結果のばらつき', cats: ['spike', 'similar', 'rci_touch'], set: 'learn' },
    { lv: 8, name: 'Lv8 未知の問題の連続演習（30問）', cats: null, set: 'exam', series: 30 }
  ];
  PUI.defaults = function () { return { v: 1, capital: (CONFIG && CONFIG.risk && CONFIG.risk.capital) || 1000000, history: [], profile: 'mochipoyo', overrides: {}, hints: true, level: 1, recent: [], series: null, last: null, psych: { answers: {}, log: [] }, seen: false, archive: null, historyWindowStartCapital: null }; };
  PUI.ensure = function (d) {
    d = d || (State && State.data); if (!d) return null; var D = PUI.defaults();
    if (!d.practice || typeof d.practice !== 'object' || Array.isArray(d.practice)) d.practice = D; var p = d.practice;
    Object.keys(D).forEach(function (k) { if (p[k] === undefined || p[k] === null && D[k] !== null) p[k] = D[k]; });
    if (!Array.isArray(p.history)) p.history = []; if (!Array.isArray(p.recent)) p.recent = []; if (!(isFinite(p.capital) && p.capital >= 0)) p.capital = D.capital;
    // v9.1 記録の上限（300件）を超えた分のまとめ（archive）と、残っている記録の最初の資金（historyWindowStartCapital）。旧セーブは記録から求める（作り話の成績は足さない）
    if (!p.archive || typeof p.archive !== 'object') { p.archive = TC().archiveAdd(null, []); if (p.history.length >= PUI.HISTORY_MAX) p.archive.unknownBefore = true; }
    if (typeof p.historyWindowStartCapital !== 'number' || !isFinite(p.historyWindowStartCapital)) { var f0 = p.history[0]; p.historyWindowStartCapital = f0 && isFinite(f0.capitalAfter) ? f0.capitalAfter - (f0.kind === 'trade' && isFinite(f0.pnl) ? f0.pnl : 0) : D.capital; }
    if (!p.overrides || typeof p.overrides !== 'object') p.overrides = {}; if (!SPF() || !SPF().PROFILES[p.profile]) p.profile = 'mochipoyo';
    if (!p.psych || typeof p.psych !== 'object') p.psych = { answers: {}, log: [] }; if (!p.psych.answers) p.psych.answers = {}; if (!Array.isArray(p.psych.log)) p.psych.log = [];
    return p;
  };
  function prof(p) { return SPF().values(p.profile, p.overrides); }
  // 記録を足す：上限を超えた古い記録は archive にまとめ、残りの記録の最初の資金を更新する
  PUI.pushHistory = function (p, rec) {
    p.history.push(rec); if (p.history.length <= PUI.HISTORY_MAX) return;
    var cut = p.history.slice(0, p.history.length - PUI.HISTORY_MAX); p.archive = TC().archiveAdd(p.archive, cut); p.history = p.history.slice(-PUI.HISTORY_MAX);
    var last = cut[cut.length - 1]; if (last && isFinite(last.capitalAfter)) p.historyWindowStartCapital = last.capitalAfter;
  };
  function fmt(v, d) { return isFinite(v) ? Number(v).toFixed(d === undefined ? 3 : d) : '―'; }
  function sgn(v, d) { return isFinite(v) ? (v > 0 ? '+' : '') + Number(v).toFixed(d === undefined ? 1 : d) : '―'; }
  function yen(v) { return isFinite(v) ? Math.round(v).toLocaleString() + '円' : '―'; }
  function tfJa(t) { return PE().tfLabel(t); }

  /* ---------- 問題を選ぶ（型・シードは画面に出さない） ---------- */
  PUI.pick = function (p, lvDef, rnd) {
    rnd = rnd || Math.random; var S = root.PRACTICE_SEEDS; if (!S) return null; var set = lvDef.set; var pool = S[set] || {};
    var cats = lvDef.cats || Object.keys(pool); cats = cats.filter(function (c) { return pool[c] && pool[c].length; }); if (!cats.length) return null;
    var cat = cats[Math.floor(rnd() * cats.length)]; var L = pool[cat].filter(function (s) { return p.recent.indexOf(s) < 0; }); if (!L.length) L = pool[cat];
    var seed = L[Math.floor(rnd() * L.length)]; p.recent.push(seed); while (p.recent.length > PUI.RECENT_MAX) p.recent.shift();
    return { seed: seed, cat: cat, set: set };
  };

  /* ---------- メニュー ---------- */
  PUI.menu = async function () {
    var d = State.data; var p = PUI.ensure(d);
    if (!p.seen) { p.seen = true; await PUI.about(); }
    while (true) {
      var pr = SPF().PROFILES[p.profile]; var st = TC().stats(p.history, { capital: PUI.defaults().capital });
      var items = [
        { label: 'コースを選んで練習', right: 'Lv' + p.level, sub: 'Lv1〜Lv7：学習用の問題（いろいろな型。答えの型は振り返りまで出ない）' },
        { label: '未知の問題の連続演習（Lv8）', right: p.series ? (p.series.done + '/' + p.series.n) : '30問', sub: '学習用とは別の問題。途中でやめても、解いた問題の記録は残る' },
        { label: '成績・分析', right: st.trades + '取引', sub: '勝率・期待値R・PF・最大DD・連敗・見送り率・ルール遵守率・根拠別（定義つき）' },
        { label: 'トレード心理・規律の演習', right: Object.keys(p.psych.answers).length + '/' + ((root.PRACTICE_PSYCH || []).length || 0), sub: '連敗の後・取り返し・ナンピン・損切りの移動・FOMO など（行動の振り返り。医療的な診断ではない）' },
        { label: '設定（戦略プロファイル・ヒント）', right: p.profile === 'mochipoyo' ? 'もちぽよ（仮設定）' : '一般FX学習', sub: (p.hints ? 'ヒントあり（初心者向け）' : 'ヒントなし（経験者向け）') + '｜仮設定の値を変えられる' },
        { label: 'このモードについて', sub: '流れ・採点の考え方・確定している基準と仮設定' },
        { label: 'やめる' }
      ];
      var i = await Win.list(items, { title: 'もちぽよ実践トレード道場　仮想資金 ' + yen(p.capital), cls: 'main-menu pd-menu' });
      if (i < 0 || i === 6) return;
      if (i === 0) { var lv = await Win.list(PUI.LEVELS.slice(0, 7).map(function (L) { return { label: L.name, right: L.lv === p.level ? '前回' : '' }; }), { title: 'コースを選ぶ', cancel: true }); if (lv < 0) continue; p.level = lv + 1; await PUI.loop(PUI.LEVELS[lv]); }
      else if (i === 1) await PUI.series();
      else if (i === 2) await PUI.stats();
      else if (i === 3) await PUI.psych();
      else if (i === 4) await PUI.settings();
      else if (i === 5) await PUI.about();
    }
  };
  PUI.loop = async function (L) { while (true) { var r = await PUI.play({ level: L.lv, lvDef: L }); if (!r || r.next !== 'again') return r; } };
  PUI.series = async function () {
    var p = PUI.ensure(); var L = PUI.LEVELS[7];
    if (p.series && p.series.done < p.series.n) { var c = await Win.choice('連続演習の続き（' + p.series.done + '/' + p.series.n + '問）', ['続きから', '最初から', 'やめる']); if (c < 0 || c === 2) return; if (c === 1) p.series = null; }
    if (!p.series) p.series = { n: L.series, done: 0, startedAt: Date.now() };
    while (p.series && p.series.done < p.series.n) { var r = await PUI.play({ level: 8, lvDef: L, seriesNo: p.series.done + 1 }); if (!r) return; p.series.done++; State.autosave(); if (r.next !== 'again') return; }
    if (p.series && p.series.done >= p.series.n) { var s = TC().stats(p.history.filter(function (x) { return x.set === 'exam' && x.t >= p.series.startedAt; })); p.series = null; await Win.message(['連続演習 30 問を終えた。', '未知の問題の成績：判断の点の平均は「成績・分析」で見られる。取引 ' + s.trades + '回・期待値 ' + (s.expectancyR === null ? '―' : sgn(s.expectancyR, 2) + 'R') + (s.small ? '（取引の数が少ないので、数字は安定しない）' : '')]); }
  };

  /* ---------- 1問 ---------- */
  // opts：{ level, lvDef, seriesNo, pick（テスト用） }。返り値：{ record, next:'again'|'quit' } または null（中断）
  PUI.play = function (opts) {
    opts = opts || {}; var d = State.data; var p = PUI.ensure(d); var P = prof(p); var lvDef = opts.lvDef || PUI.LEVELS[(opts.level || 1) - 1];
    var pick = opts.pick || PUI.pick(p, lvDef); if (!pick) { return Win.message(['問題のデータ（js/data/practice-seeds.js）が読み込めていない。']).then(function () { return null; }); }
    var play = PE().start(pick, { profile: p.profile, level: lvDef.lv, hints: p.hints }); play.overrides = p.overrides; PE().markStart(play, P);
    var g = PE().game(play); var Q = PE().focusQuestions(lvDef.lv, PE().snap(play));
    var view = { tf: play.entryTF, visible: 72, zig: true }; var timer = null; var stageEl = document.getElementById('stage'); if (stageEl) stageEl.classList.add('trade-open');
    PUI.current = { play: play, view: view };
    return new Promise(function (resolve) {
      var tfs = PE().TFS.map(function (t) { return '<button class="tf" data-tf="' + t.id + '">' + esc(t.label) + (t.id === play.entryTF ? '★' : '') + '</button>'; }).join('');
      var dirOpt = [['up', '上昇'], ['down', '下降'], ['range', 'レンジ・不明瞭'], ['unknown', '判定できない（履歴不足）']];
      var qA = ['1d', '4h'].map(function (t) { return '<div class="aq" data-q="' + t + '"><div class="aq-t"><span class="aq-n">' + (t === '1d' ? '1' : '2') + '</span>' + esc(tfJa(t)) + 'の方向は？（確定した足で判断）</div><div class="aq-o">' + dirOpt.map(function (o) { return '<button class="aopt" data-q="' + t + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>'; }).join('') +
        Q.map(function (q, i) { return '<div class="aq" data-fq="' + q.key + '"><div class="aq-t"><span class="aq-n">' + (i + 3) + '</span>' + esc(q.title) + '</div><div class="aq-o">' + q.options.map(function (o) { return '<button class="aopt" data-fq="' + q.key + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>'; }).join('');
      var EVK = P.evidence.filter(function (k) { return ['htf', 'ema', 'dow', 'rci', 'div'].indexOf(k) >= 0 || p.profile === 'general'; });
      var html = '<div class="trade-head"><b>もちぽよ実践トレード道場</b>' + (opts.seriesNo ? '　<span class="gold-text">未知の問題 ' + opts.seriesNo + '/30</span>' : '　<span class="muted small">' + esc(lvDef.name) + '</span>') + '　<span class="pd-phase" id="pd-phase"></span>' +
          '<div class="muted small">' + esc(PE().PAIR) + '。表示している足より先は、決済・振り返りまで見せない。採点：' + esc(SPF().PROFILES[p.profile].name) + '</div></div>' +
        '<div class="trade-chartwrap"><div class="chart-tools"><div class="tfs">' + tfs + '</div><div class="ctl"><button class="mini" data-zoom="in">＋</button><button class="mini" data-zoom="out">－</button><button class="mini" data-zig="1">ZigZag</button><button class="mini" data-cmd="quit">やめる</button></div></div>' +
          '<div class="pd-phasebar small"><span class="pd-phase" id="pd-phase2"></span> <span class="muted" id="pd-steps2"></span></div><canvas class="chart" id="pd-chart"></canvas><div class="muted small pd-forming" id="pd-forming"></div></div>' +
        '<div class="trade-msg" id="pd-msg"></div>' +
        '<div class="pd-sec" id="pd-A"><div class="an-title">A 環境認識：日足・4時間足を開いて方向を読む（★はエントリー足）</div>' + qA + '</div>' +
        '<div class="pd-sec" id="pd-B"><div class="an-title">B 仮説：目線と、待つ理由を決めて登録する</div><div class="aq-o pd-bias"><button class="aopt" data-bias="buy">買い目線</button><button class="aopt" data-bias="sell">売り目線</button><button class="aopt" data-bias="neutral">中立（様子を見る）</button></div>' +
          '<select id="pd-why" class="pd-sel"><option value="">待つ理由・見るもの（選ぶ）</option><option value="rci">RCI の反転を待つ</option><option value="div">ダイバージェンスの確定を待つ</option><option value="pullback">押し目・戻り目を待つ</option><option value="htf">上位足の向きがそろうのを待つ</option><option value="none">根拠がそろわなければ見送る</option></select>' +
          '<button class="tcmd" data-cmd="hyp">仮説を登録して足を進める</button></div>' +
        '<div class="pd-sec hidden" id="pd-C"><div class="an-title">C 足を進める（<span id="pd-steps"></span>）</div><div class="trade-cmds ready pd-cmds"><button class="tcmd" data-cmd="step">1本進める</button><button class="tcmd" data-cmd="play">再生</button><button class="tcmd" data-cmd="stop">停止</button><button class="tcmd buy" data-cmd="check">エントリーを検討</button><button class="tcmd skip" data-cmd="skip">見送って終える</button></div></div>' +
        '<div class="pd-sec hidden" id="pd-D"><div class="an-title">D 条件の確認：いまの足で「ある」と思う根拠を選ぶ</div><div class="pd-ev">' + EVK.map(function (k) { return '<label class="pd-chk"><input type="checkbox" data-ev="' + k + '"> ' + esc(SPF().evidenceLabel(k)) + '</label>'; }).join('') + '</div>' +
          '<div class="muted small">根拠の数が多くても、必須の条件・妨げ（上位足と逆・飛び乗り・レンジの中ほど）があれば発注の条件にはならない。' + (p.hints ? '' : '（ヒントなしの設定）') + '</div>' + (p.hints ? '<button class="mini" data-cmd="hint">ヒント：いまの足の数値を見る</button><div class="pd-hint small" id="pd-hint"></div>' : '') +
          '<div class="trade-cmds ready"><button class="tcmd skip" data-cmd="wait">待つ（足送りに戻る）</button><button class="tcmd buy" data-cmd="long">ロング</button><button class="tcmd sell" data-cmd="short">ショート</button></div></div>' +
        '<div class="pd-sec hidden" id="pd-E"><div class="an-title">E 注文（<span id="pd-side"></span>）：損切りは必須</div><div class="order-grid"><label>損切り<input type="number" step="0.001" id="pd-sl"></label><label>利確<input type="number" step="0.001" id="pd-tp"></label><label>許容損失（資金の%）<select id="pd-risk">' + [0.5, 1, 2, 5].map(function (r) { return '<option value="' + r + '"' + (r === 1 ? ' selected' : '') + '>' + r + '%' + (r > P.maxRiskPercent ? '（上限超え）' : '') + '</option>'; }).join('') + '</select></label></div>' +
          (p.hints ? '<div class="rw-row"><button class="mini" data-cmd="slhelp">損切り：確定した山谷の外側（＋' + P.slBufferPips + 'pips）</button><button class="mini" data-cmd="tphelp">利確：RR 1:2</button></div>' : '') +
          '<div class="calc" id="pd-calc"></div><div class="calc o-err" id="pd-err" role="alert"></div><div class="trade-cmds ready"><button class="tcmd buy" data-cmd="order">発注する</button><button class="tcmd" data-cmd="back">戻る</button></div></div>' +
        '<div class="pd-sec hidden" id="pd-F"><div class="an-title">F 保有中：当初の損切り・利確は動かさない</div><div class="small" id="pd-pos"></div><div class="trade-cmds ready"><button class="tcmd" data-cmd="hstep">1本進める</button><button class="tcmd" data-cmd="hplay">決済まで進める</button></div>' +
          '<div class="muted small">早めの決済・建値への移動・トレーリング・部分利確は、上級のルールとして別に扱う（この道場の基本のルールでは使わない）。</div></div>';
      Win.panel(html, { cls: 'trade-panel practice-panel', noClose: true, onCancel: function () { quit(); }, setup: function (node, close) {
        var canvas = node.querySelector('#pd-chart'); var msgEl = node.querySelector('#pd-msg'); var side = null; var done = false;
        function msg(t) { msgEl.textContent = t; }
        function $(s) { return node.querySelector(s); }
        function show(id, on) { var el = $('#' + id); if (el) el.classList.toggle('hidden', !on); }
        function phase(t) { var el = $('#pd-phase'); if (el) el.textContent = '［' + t + '］'; var el2 = $('#pd-phase2'); if (el2) el2.textContent = '［' + t + '］'; node.setAttribute('data-phase', t); }   // チャートの枠の中にも出す（スマホで下へ読み進めても見える）
        function render() {
          var asOf = play.asOf; var v = PE().view(g, view.tf, asOf); if (!v.an) return;
          var o = { visibleBars: view.visible, showZigzag: view.zig, tfLabel: tfJa(view.tf) + (view.tf === play.entryTF ? '（エントリー足）' : '') };
          if (play.entry && (view.tf === play.entryTF)) { o.entry = play.entry.order.entry; o.sl = play.entry.order.sl; o.tp = play.entry.order.tp; }
          else if (side && view.tf === play.entryTF) { var sl = parseFloat($('#pd-sl').value), tp = parseFloat($('#pd-tp').value); o.sl = isNaN(sl) ? null : sl; o.tp = isNaN(tp) ? null : tp; }
          Chart.render(canvas, v.an, o);
          var f = v.forming; $('#pd-forming').textContent = f ? '形成中の' + tfJa(view.tf) + '（指標の計算には入れていない）：始値 ' + fmt(f.o) + '・高値 ' + fmt(f.h) + '・安値 ' + fmt(f.l) + '・いま ' + fmt(f.c) : '表示中の' + tfJa(view.tf) + 'はすべて確定足（指標は直近の確定した ' + v.candles.length + ' 本で計算）';
          node.querySelectorAll('.tf').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tf') === view.tf); });
          node.querySelector('[data-zig]').classList.toggle('on', view.zig);
          var se = $('#pd-steps'); if (se) se.textContent = tfJa(play.entryTF) + '　開始から ' + play.steps + ' 本目・待てるのはあと ' + Math.max(0, play.maxSteps - play.steps) + ' 本';
          var se2 = $('#pd-steps2'); if (se2) se2.textContent = play.phase === 'analysis' ? '' : play.entry ? '保有 ' + (play.holdShown || 0) + '本' : '開始から ' + play.steps + '本・あと ' + Math.max(0, play.maxSteps - play.steps) + '本';
        }
        function answeredA() { return !!(play.answers['1d'] && play.answers['4h']) && Q.every(function (q) { return play.focus && play.focus[q.key]; }); }
        function refresh() {
          if (play.phase === 'analysis') { phase(play.hypothesis ? '条件待ち' : '環境認識'); msg(!answeredA() ? 'A：日足・4時間足のボタンでチャートを開き、方向を選ぼう' + (Q.length ? '（読み取りの設問もある）' : '') + '。' : 'B：目線と待つ理由を選んで「仮説を登録」。'); }
          else if (play.phase === 'waiting') { phase('条件待ち'); msg('足を進めて、根拠がそろうのを待とう。そろったと思ったら「エントリーを検討」。'); }
          else if (play.phase === 'holding') phase('保有中');
          render();
        }
        // 分析・仮説
        node.querySelectorAll('.aq-o').forEach(function (row) { row.addEventListener('click', function (e) { var b = e.target.closest('.aopt'); if (!b || done) return; e.stopPropagation();
          if (b.hasAttribute('data-q')) { if (play.hypothesis) return; play.answers[b.getAttribute('data-q')] = b.getAttribute('data-v'); }
          else if (b.hasAttribute('data-fq')) { if (play.hypothesis) return; play.focus = play.focus || {}; play.focus[b.getAttribute('data-fq')] = b.getAttribute('data-v'); }
          else if (b.hasAttribute('data-bias')) { if (play.hypothesis) return; play.bias = b.getAttribute('data-bias'); }
          row.querySelectorAll('.aopt').forEach(function (x) { x.classList.toggle('on', x === b); }); refresh(); }); });
        function setTf(t) { view.tf = t; play.viewed[t] = true; render(); }
        function stopPlay() { if (timer) { clearInterval(timer); timer = null; } }
        function step() { if (play.phase !== 'waiting') return false; var okS = PE().advance(play, P); if (!okS) { stopPlay(); if (play.phase === 'timeout') finish(); return false; } render(); return true; }
        function openCheck() { stopPlay(); show('pd-C', false); show('pd-D', true); phase('条件の確認'); node.querySelectorAll('[data-ev]').forEach(function (c) { c.checked = false; }); var h = $('#pd-hint'); if (h) h.innerHTML = ''; msg('いまの足で確認できる根拠に印を付け、待つ・ロング・ショートを選ぼう。'); }
        function claims() { var o = {}; node.querySelectorAll('[data-ev]').forEach(function (c) { o[c.getAttribute('data-ev')] = !!c.checked; }); return o; }
        function hint() { play.hintsUsed = (play.hintsUsed || 0) + 1; var sn = PE().snap(play); var e = sn.entry; var lines = [];
          ['1d', '4h'].forEach(function (t) { var h = sn.htf[t]; lines.push(tfJa(t) + '：' + (h.insufficient ? h.msg : h.basis)); });
          lines.push(tfJa(play.entryTF) + '：EMA ' + ({ up: '上昇の並び', down: '下降の並び', mixed: '絡み合い' })[e.emaOrder] + '・波形 ' + SPF().dirJa(e.dow) + '・EMA20 からの距離 ATR の ' + fmt(e.distEmaAtr, 1) + ' 倍');
          lines.push('RCI(9)：' + fmt(e.rci.value, 0) + '（' + (SE().RCI_STATE_LABEL[e.rci.state] || e.rci.state) + (e.rci.reversal ? '・反転の確認から ' + e.rci.reversal.ageBars + '本' : '') + '）');
          var dv = e.divSignals.map(function (s) { return s.label + '（' + ({ confirmed: '期限内', expired: '期限切れ' })[s.status] + '・' + s.evidence + '）'; }).concat(e.divForming.map(function (s) { return s.label + '（形成中：まだ数えない）'; }));
          lines.push('MACD：' + (dv.length ? dv.join('／') : 'ダイバージェンスなし')); lines.push('確定した山谷：高値 ' + fmt(e.swing.high) + '・安値 ' + fmt(e.swing.low));
          $('#pd-hint').innerHTML = lines.map(esc).join('<br>') + '<div class="muted">ヒントは記録に残る（数値を見ても、判断は自分で）</div>'; }
        // 注文
        function openOrder(s) { side = s; show('pd-D', false); show('pd-E', true); phase('発注可能候補：注文の確認'); $('#pd-side').textContent = s === 'buy' ? 'ロング（買い）' : 'ショート（売り）'; $('#pd-sl').value = ''; $('#pd-tp').value = ''; recalc(); msg('損切り・利確・許容損失を入れよう。確定の前に検証する。'); }
        function cur() { return { side: side, sl: $('#pd-sl').value === '' ? null : $('#pd-sl').value, tp: $('#pd-tp').value === '' ? null : $('#pd-tp').value, riskPercent: parseFloat($('#pd-risk').value) }; }
        function recalc() { var pv = PE().preview(play, cur(), p.capital, P); var v = pv.validation;
          $('#pd-calc').innerHTML = '約定の予定 <b>' + fmt(pv.entryPx) + '</b>（' + (side === 'buy' ? '買値' : '売値') + '・スプレッド ' + TC().COSTS.spreadPips + 'pips）　損切り幅 <b>' + (v.riskPips ? v.riskPips.toFixed(1) + 'pips' : '―') + '</b>　利確幅 <b>' + (v.rewardPips ? v.rewardPips.toFixed(1) + 'pips' : '―') + '</b>　RR <b>' + (pv.rr ? '1:' + pv.rr.toFixed(2) : '―') + '</b>　損益分岐の勝率 <b>' + (pv.breakeven ? (pv.breakeven * 100).toFixed(1) + '%' : '―') + '</b>' +
            '<br>許容損失 <b>' + yen(p.capital * cur().riskPercent / 100) + '</b>　ロット <b>' + (pv.sizing && pv.sizing.ok ? pv.sizing.lots.toFixed(2) + '（' + Math.round(pv.sizing.units).toLocaleString() + '通貨）' : '―') + '</b>　通常約定時の推定損失 <b>' + (pv.estLoss !== null ? yen(pv.estLoss) + '（' + pv.estLossPct.toFixed(2) + '%）' : '―') + '</b><span class="muted small">（損切りで終わったとき。入口と損切りの滑り ' + (TC().COSTS.entrySlipPips + TC().COSTS.stopSlipPips) + 'pips 込み。架空の相場の仮定）</span>' +
            (pv.stress && pv.stress.length ? '<br><span class="small bad">損切りは「必ずその価格で止まる」約束ではない。窓（価格が飛ぶ）や急変では推定より大きく損をすることがある。</span><span class="muted small">ストレスの例（仮定。保証・予測ではない）：' + pv.stress.map(function (x) { return '損切りを ATR×' + x.atr + ' 越えて約定 → ' + yen(x.loss) + '（' + x.pct.toFixed(2) + '%）'; }).join('／') + '</span>' : '');
          $('#pd-err').innerHTML = pv.errors.length ? '<b class="bad">発注できない：</b>' + pv.errors.map(esc).join('<br>') : pv.warnings.length ? '<span class="muted small">注意：' + pv.warnings.map(esc).join('／') + '</span>' : '';
          render(); return pv; }
        ['#pd-sl', '#pd-tp', '#pd-risk'].forEach(function (s) { var el = $(s); el.addEventListener('input', recalc); el.addEventListener('change', recalc); });
        function holdInfo() { var en = play.entry; $('#pd-pos').innerHTML = (en.side === 'buy' ? 'ロング' : 'ショート') + '　約定 ' + fmt(play.settle.entryPrice) + '　損切り ' + fmt(en.order.sl) + '　利確 ' + fmt(en.order.tp) + '　' + en.sizing.lots.toFixed(2) + 'ロット　予定の最大損失 ' + yen(en.sizing.actualRisk) + '　経過 ' + play.holdShown + '本'; }
        function hstep() { if (play.phase !== 'holding') return; PE().holdStep(play); holdInfo(); render(); if (play.phase === 'closed') { stopPlay(); setTimeout(finish, 250); } }
        // 終わり
        function finish() { if (done) return; done = true; stopPlay(); var last = p.last || {}; var gr = PE().grade(play, { prevLoss: !!last.loss, prevRiskPercent: last.riskPercent || 0 }, P); var rec = PE().record(play, gr, p.capital);
          PUI.pushHistory(p, rec);
          if (rec.kind === 'trade' && isFinite(rec.pnl)) { p.capital = rec.capitalAfter; p.last = { loss: rec.riskR < 0, riskPercent: rec.riskPercent, t: rec.t }; }
          if (root.PlayLog) try { root.PlayLog.add('practice', { kind: rec.kind, process: rec.process, riskR: rec.riskR, level: rec.level, set: rec.set }); } catch (e) { }
          State.autosave(); close({ play: play, grade: gr, record: rec }); }
        function quit() { if (done) return; Win.confirmQuit('この問題', '採点・記録はされない').then(function (yes) { if (!yes || done) return; done = true; stopPlay(); close(null); }); }
        node.addEventListener('click', function (e) {
          var t = e.target.closest('button'); if (!t || done) return; e.stopPropagation();
          if (t.getAttribute('data-tf')) { setTf(t.getAttribute('data-tf')); return; }
          if (t.getAttribute('data-zoom')) { view.visible = Engine.clamp(view.visible + (t.getAttribute('data-zoom') === 'in' ? -12 : 12), 30, 160); render(); return; }
          if (t.getAttribute('data-zig')) { view.zig = !view.zig; render(); return; }
          var c = t.getAttribute('data-cmd'); if (!c) return;
          if (c === 'quit') return quit();
          if (c === 'hyp') { if (!answeredA()) { msg('先に A の設問をすべて選ぼう（日足・4時間足のボタンでチャートを確かめられる）。'); return; } if (!play.bias) { msg('目線（買い・売り・中立）を選ぼう。'); return; }
            play.hypothesis = { bias: play.bias, why: $('#pd-why').value || null, asOf: play.asOf, at: Date.now() }; play.events.push({ kind: 'hypothesis', asOf: play.asOf, bias: play.bias, why: play.hypothesis.why, at: Date.now() });
            play.phase = 'waiting'; show('pd-A', false); show('pd-B', false); show('pd-C', true); view.tf = play.entryTF; refresh(); return; }
          if (c === 'step') { step(); return; }
          if (c === 'play') { if (timer) return; timer = setInterval(function () { if (!step()) stopPlay(); }, State.data.settings.textSpeed === 'instant' ? 60 : 420); return; }
          if (c === 'stop') { stopPlay(); return; }
          if (c === 'check') { openCheck(); return; }
          if (c === 'skip') { stopPlay(); PE().skip(play, null); finish(); return; }
          if (c === 'hint') { hint(); return; }
          if (c === 'wait') { PE().wait(play); play.claims = claims(); show('pd-D', false); show('pd-C', true); refresh(); return; }
          if (c === 'long' || c === 'short') { play.claims = claims(); openOrder(c === 'long' ? 'buy' : 'sell'); return; }
          if (c === 'back') { side = null; show('pd-E', false); show('pd-C', true); refresh(); return; }
          if (c === 'slhelp') { var sn = PE().snap(play); var ref = side === 'buy' ? sn.entry.swing.low : sn.entry.swing.high; if (ref === null) { msg('確定した山谷がまだない。'); return; } $('#pd-sl').value = fmt(side === 'buy' ? ref - P.slBufferPips * play.pip : ref + P.slBufferPips * play.pip); recalc(); return; }
          if (c === 'tphelp') { var pv0 = PE().preview(play, cur(), p.capital, P); if (!pv0.validation.riskPips) { msg('先に損切りを正しく入れよう。'); return; } var r0 = pv0.validation.riskPips * play.pip * 2; $('#pd-tp').value = fmt(side === 'buy' ? pv0.entryPx + r0 : pv0.entryPx - r0); recalc(); return; }
          if (c === 'order') { if (play.entry) return; var pv = recalc(); if (!pv.ok) { msg('発注できない：入力を直そう。'); return; } var en = PE().enter(play, cur(), p.capital, play.claims, P); if (!en.ok) { msg('発注できない：' + en.preview.errors.join('／')); return; }
            t.disabled = true; show('pd-E', false); show('pd-F', true); holdInfo(); view.tf = play.entryTF; refresh(); msg('発注した。足を進めて、決済まで見届けよう。'); return; }
          if (c === 'hstep') { hstep(); return; }
          if (c === 'hplay') { if (timer) return; timer = setInterval(function () { if (play.phase !== 'holding') { stopPlay(); return; } hstep(); }, State.data.settings.textSpeed === 'instant' ? 40 : 160); return; }
        });
        canvas.addEventListener('click', function (e) { e.stopPropagation(); });
        PUI.current.ctl = { step: step, finish: finish, openCheck: openCheck, openOrder: openOrder, setTf: setTf, recalc: recalc, hstep: hstep, node: node };
        play.viewed[play.entryTF] = true; refresh(); requestAnimationFrame(render);
        // v9.1 画面の大きさが変わったら描き直す（root.onresize を上書きしない。閉じるときに外す）
        var onRz = function () { if (!done && document.getElementById('pd-chart')) render(); }; root.addEventListener('resize', onRz); PUI._cleanup = function () { root.removeEventListener('resize', onRz); stopPlay(); }; PUI.listeners = (PUI.listeners || 0) + 1;
      } }).then(function (res) {
        stopPlay(); if (PUI._cleanup) { PUI._cleanup(); PUI._cleanup = null; PUI.listeners = Math.max(0, (PUI.listeners || 1) - 1); } if (stageEl) stageEl.classList.remove('trade-open');
        if (!res) { resolve(null); return; }
        PUI.review(res).then(function (next) { resolve({ record: res.record, grade: res.grade, next: next }); });
      });
      function stopPlay() { if (timer) { clearInterval(timer); timer = null; } }
    });
  };

  /* ---------- G 振り返り ---------- */
  PUI.review = function (res) {
    var play = res.play, gr = res.grade, rec = res.record; var p = PUI.ensure(); var cat = PE().cat(play.cat); var g = PE().game(play);
    var catRows = SPF().CATS.map(function (c) { var x = gr.cats[c[0]]; return x && x.max ? '<tr><td>' + esc(c[1]) + '</td><td>' + x.got + '／' + x.max + '</td></tr>' : ''; }).join('');
    var items = gr.items.map(function (it) { return '<li class="' + (it.ok ? 'ok' : 'ng') + '"><span class="mark">' + (it.ok ? '✓' : '✗') + '</span><b>' + esc(it.name) + '</b>：' + esc(it.note) + '<span class="pts">' + it.got + '/' + it.max + '</span></li>'; }).join('');
    var r = gr.result; var resHtml;
    if (r) resHtml = '<div class="outcome ' + (r.riskR >= 0 ? 'win' : 'lose') + '"><b>結果（判断の点とは別）：' + ({ tp: '利確', sl: '損切り', time: '時間切れの決済', end: '足の終わりで決済' })[r.reason] + '</b>　' + sgn(r.netPips) + 'pips（中値の値動き ' + sgn(r.grossPips) + 'pips − スプレッド・滑り ' + fmt(r.costPips, 1) + 'pips）　' + sgn(r.riskR, 2) + 'R　仮想損益 ' + (r.pnl >= 0 ? '+' : '') + yen(r.pnl) + (play.settle && play.settle.commissionYen ? '（手数料 ' + yen(play.settle.commissionYen) + ' 込み）' : '') +
      '<br><span class="small">MAE（最大逆行）' + sgn(r.maePips) + 'pips・MFE（最大順行）' + sgn(r.mfePips) + 'pips・保有 ' + r.bars + '本' + '' + '</span>' + (r.ambiguous ? '<br><span class="muted small">※同じ足で損切りと利確の両方に届いた（ローソク足だけでは先後が分からない）。損切りが先と仮定した（事実として損切りが先だったとは言えない）。もし利確が先なら ' + (play.settle && play.settle.ifTpFirst ? sgn(play.settle.ifTpFirst.riskR, 2) + 'R' : '―') + '</span>' : '') + (play.settle && play.settle.gapSlippagePips ? '<br><span class="small bad">窓で損切りを ' + fmt(play.settle.gapSlippagePips, 1) + 'pips 越えて約定（推定損失より大きい損失）</span>' : '') + '<div class="muted small">' + esc(r.note) + '</div></div>';
    else resHtml = '<div class="outcome"><b>取引なし（' + (gr.kind === 'skip' ? '自分で見送った' : '時間切れ（決めないまま）') + '）</b>　その後の値動きはチャートで確認できる</div>';
    var mets = (play.metAt || []).slice(0, 6).map(function (m) { return m.label; }).join('・');
    var hy = play.hypothesis; var WHY = { rci: 'RCI の反転を待つ', div: 'ダイバージェンスの確定を待つ', pullback: '押し目・戻り目を待つ', htf: '上位足の向きがそろうのを待つ', none: '根拠がそろわなければ見送る' };
    var hyHtml = hy ? '<div class="small">あなたの仮説（開始の時点で登録）：' + ({ buy: '買い目線', sell: '売り目線', neutral: '中立' })[hy.bias] + (hy.why ? '・' + WHY[hy.why] : '') + '　→　' + (gr.kind === 'trade' ? (play.entry.side === 'buy' ? 'ロング' : 'ショート') + '（' + (play.events.filter(function (e) { return e.kind === 'enter'; })[0] ? '開始から ' + play.steps + '本目' : '') + '）' : gr.kind === 'skip' ? '見送り（' + play.steps + '本目）' : '時間切れ') + (play.waits ? '・「待つ」' + play.waits + '回' : '') + '</div>' : '';
    var html = '<div class="rw-title">振り返り：判断の過程 ' + gr.process + '点</div>' +
      '<div class="pd-rv"><table class="tbl">' + catRows + '</table><div class="small">' + esc(cat ? '問題の型：' + cat.title : '') + '（' + (play.set === 'exam' ? '未知の問題' : '学習用の問題') + '）<br><b>学ぶこと</b>：' + esc(cat ? cat.lesson : '') + '</div></div>' +
      hyHtml + resHtml + '<canvas class="chart rv-chart" id="pd-rv-chart"></canvas><div class="muted small">チャート：判断を始めた足から先（色の付いた部分）が、判断のときには見えていなかった値動き。' + (mets ? 'この設定で条件がそろった足：' + esc(mets) : 'この設定で条件がそろった足は、見ていた間にはなかった') + '</div>' +
      '<ul class="score-items">' + items + '</ul>' + (gr.violations.length ? '<div class="bad small">規律の違反：' + esc(gr.violations.join('・')) + '</div>' : '') +
      '<div class="muted small">採点の設定：' + esc(SPF().PROFILES[p.profile].name) + '（※は推奨仮設定。メニューの「設定」で変えられる）。架空の相場の練習で、実際の売買の成績を保証するものではない。</div>' +
      '<div class="trade-cmds ready"><button class="tcmd buy" data-cmd="again">次の問題</button><button class="tcmd" data-cmd="end">終える</button></div>';
    return Win.panel(html, { cls: 'result-panel rw-panel rv-panel pd-review', noClose: true, onCancel: function () { }, setup: function (node, close) {
      var c = node.querySelector('#pd-rv-chart'); var endAs = Math.min(g.base.length - 1, Math.max(play.asOf, play.entry ? play.entry.exitAsOf : play.asOf) + PE().tfMin(play.entryTF) / 5 * 12);
      var v = PE().view(g, play.entryTF, endAs); if (v.an) { var shown = Math.round((endAs - play.S) / (PE().tfMin(play.entryTF) / 5)); v.an.revealedCount = Math.max(0, Math.min(v.candles.length - 1, shown)); var o = { visibleBars: Math.min(120, shown + 60), showZigzag: true, tfLabel: tfJa(play.entryTF) + '（振り返り）' }; if (play.entry) { o.entry = play.settle.entryPrice; o.sl = play.entry.order.sl; o.tp = play.entry.order.tp; } setTimeout(function () { Chart.render(c, v.an, o); }, 30); }
      var closed = false; node.addEventListener('click', function (e) { var b = e.target.closest('[data-cmd]'); if (!b || closed) return; e.stopPropagation(); closed = true; close(b.getAttribute('data-cmd') === 'again' ? 'again' : 'quit'); });
    } });
  };

  /* ---------- 成績・分析 ---------- */
  PUI.stats = async function () {
    var p = PUI.ensure(); var H = p.history; var cap0 = p.historyWindowStartCapital; var A = p.archive || {}; var all = TC().stats(H, { capital: cap0 });
    var part = function (f) { return TC().stats(H.filter(f), { capital: cap0 }); };
    var proc = function (L) { var a = L.filter(function (x) { return isFinite(x.process); }); return a.length ? Math.round(a.reduce(function (s, x) { return s + x.process; }, 0) / a.length) + '点（' + a.length + '）' : '―'; };
    var v = function (x, unit, d) { return x === null || x === undefined ? '―' : (unit === 'R' ? sgn(x, d === undefined ? 2 : d) + 'R' : unit === '%' ? x.toFixed(1) + '%' : String(x)); };
    var pf = function (val, inf) { return inf ? '∞（負けなし）' : v(val); };
    var SEG = [['すべて', function () { return true; }], ['学習用の問題', function (x) { return x.set !== 'exam'; }], ['未知の問題（Lv8）', function (x) { return x.set === 'exam'; }], ['上位足を見て判断', function (x) { return x.viewedHtf; }], ['上位足を見ずに判断', function (x) { return !x.viewedHtf; }],
      ['もちぽよ（仮設定）', function (x) { return x.profile === 'mochipoyo'; }], ['一般FX学習', function (x) { return x.profile === 'general'; }], ['上級の管理を使った', function (x) { return !!x.advanced; }]];
    var rows = SEG.map(function (sg) { var L = H.filter(sg[1]); var st = TC().stats(L, { capital: cap0 }); if (!L.length) return ''; return '<tr><td>' + esc(sg[0]) + '</td><td>' + L.length + '</td><td>' + st.trades + (st.small ? '<span class="bad">＊</span>' : '') + '</td><td>' + v(st.winRate, '%') + '</td><td>' + v(st.expectancyR, 'R') + '</td><td>' + pf(st.profitFactorYen, st.pfYenInfinite) + '</td><td>' + pf(st.profitFactorR, st.pfRInfinite) + '</td><td>' + v(st.skipRate, '%') + '</td><td>' + proc(L) + '</td></tr>'; }).join('');
    var html = '<div class="rw-title">実践トレード道場の成績・分析</div>' +
      '<div class="small">記録に残っている直近 ' + H.length + ' 件（最初の資金 ' + yen(cap0) + '）' + (A.count ? '＋上限を超えてまとめた ' + A.count + ' 件（取引 ' + A.trades + '・R の合計 ' + sgn(A.sumR, 2) + 'R・損益 ' + (A.pnlYen >= 0 ? '+' : '') + yen(A.pnlYen) + '）' : '') + (A.unknownBefore ? '。それより前の記録は旧い版で消えていて、ここには含まない' : '') + '</div>' +
      (all.small ? '<div class="bad small">＊ 取引が ' + TC().SMALL_SAMPLE + ' 回未満：勝率・期待値・PF は回数が少ないと大きくぶれる。正答率や勝率だけを「実力が上がった」証明にしない。</div>' : '') +
      '<table class="tbl pd-stats"><tr><th>区分</th><th>問題</th><th>取引</th><th>勝率</th><th>期待値R（コスト込み）</th><th>PF（円）</th><th>PF（R）</th><th>見送り率</th><th>判断の点（数）</th></tr>' + rows + '</table>' +
      '<div class="small">平均利益 ' + v(all.avgWinR, 'R') + '・平均損失 ' + v(all.avgLossR, 'R') + '・期待値R：コスト込み ' + v(all.expectancyR, 'R') + '／コスト抜き ' + v(all.expectancyGrossR, 'R') + '（' + all.grossRn + '件）・1回あたりの損益 ' + (all.avgPnlYen === null ? '―' : yen(all.avgPnlYen)) + '（' + all.yenN + '件。損切りの幅が取引ごとに違うので、R と円は別に見る）' +
        '・平均RR（計画）' + (all.avgPlannedRR === null ? '―' : '1:' + all.avgPlannedRR.toFixed(2)) + '・最大連敗 ' + all.maxLosingStreak + '</div>' +
      '<div class="small">最大DD（確定損益）：金額 ' + yen(all.drawdown.amount) + '（その区間 ' + all.drawdown.amountPct.toFixed(2) + '%）／割合 ' + all.drawdown.pct.toFixed(2) + '%（その区間 ' + yen(all.drawdown.pctAmount) + '）。含み損込み（MAE から見積もり）：' + yen(all.drawdownIntra.amount) + '・' + all.drawdownIntra.pct.toFixed(2) + '%（ティックの順序は分からない目安）</div>' +
      '<div class="small">ルール遵守率 ' + v(all.complianceRate, '%') + '（' + all.rated + '問）・待つ ' + all.waits + '回・時間切れ ' + all.timeouts + '回</div>' +
      '<canvas class="chart pd-curve" id="pd-curve"></canvas><div class="muted small">資金の推移：青＝確定損益（決済ごと）、灰＝含み損込みの見積もり（各取引の MAE）。仮想資金</div>' +
      '<div class="an-title">根拠別の成績（発注したときに「ある」と確認できた条件）</div><table class="tbl"><tr><th>条件</th><th>回数</th><th>勝率</th><th>平均R</th></tr>' + Object.keys(all.byEvidence).map(function (k) { var b = all.byEvidence[k]; return '<tr><td>' + esc(SPF().evidenceLabel(k)) + '</td><td>' + b.n + (b.small ? '（少ない）' : '') + '</td><td>' + b.winRate.toFixed(1) + '%</td><td>' + sgn(b.avgR, 2) + 'R</td></tr>'; }).join('') + '</table>' +
      '<div class="an-title">定義（分母）</div><ul class="small">' + TC().DEFINITIONS.map(function (x) { return '<li><b>' + esc(x[0]) + '</b>：' + esc(x[1]) + '</li>'; }).join('') + '<li><b>学習用／未知の問題</b>：学習用で覚えた形が、初めて見るチャートでも使えるか（汎化）を分けて見る</li></ul>' +
      '<div class="muted small">利益が出ただけでは点は高くならない（判断の点は過程だけで付ける）。架空の相場の記録で、実際の売買の成績を表すものではない。</div>' +
      '<div class="trade-cmds ready"><button class="tcmd" data-cmd="replay">記録から振り返る</button></div>';
    var r = await Win.panel(html, { cls: 'pd-stats-panel', setup: function (node, close) { var c = node.querySelector('#pd-curve'); setTimeout(function () { PUI.drawCurve(c, all.curve, all.curveIntra); }, 20); var b = node.querySelector('[data-cmd="replay"]'); if (b) b.addEventListener('click', function (e) { e.stopPropagation(); close('replay'); }); } });
    if (r === 'replay') await PUI.replayList();
  };
  // 記録から振り返る：seed から相場を作り直し、記録した checksum と同じときだけチャートを出す（違えば「旧形式のため再現できない」）
  PUI.replayList = async function () {
    var p = PUI.ensure(); var L = p.history.slice(-20).reverse(); if (!L.length) { await Win.message(['まだ記録がない。']); return; }
    var i = await Win.list(L.map(function (x) { return { label: new Date(x.t).toLocaleString() + '｜' + ({ trade: '取引', skip: '見送り', timeout: '時間切れ', compare: '3判断比較' })[x.kind], right: x.kind === 'trade' ? sgn(x.riskR, 2) + 'R' : '', sub: '判断の点 ' + x.process + '・' + (x.set === 'exam' ? '未知の問題' : '学習用') }; }), { title: '記録から振り返る（最近20件）', cancel: true });
    if (i < 0) return; var x = L[i]; var chk = PUI.replayable(x);
    if (!chk.ok) { await Win.message(['この記録は再現できない：' + chk.why, '（記録の数字はそのまま残っている）']); return; }
    var g = PE().generate(x.seed, { gen: x.gen }); var tfm = PE().tfMin(x.tf || '15m') / 5; var endAs = Math.min(g.base.length - 1, g.S + (x.steps || 0) * tfm + 12 * tfm + (x.kind === 'trade' ? 96 * tfm : 0)); var v = PE().view(g, x.tf || '15m', endAs);
    await Win.panel('<div class="rw-title">記録の振り返り（' + esc(new Date(x.t).toLocaleString()) + '）</div><canvas class="chart rv-chart" id="pd-rp-chart"></canvas><div class="small">' + (x.kind === 'trade' ? (x.side === 'buy' ? 'ロング' : 'ショート') + '・損切り ' + fmt(x.sl) + '・利確 ' + fmt(x.tp) + '・' + sgn(x.netPips) + 'pips・' + sgn(x.riskR, 2) + 'R' : x.kind === 'skip' ? '見送り' : '時間切れ') + '・判断の点 ' + x.process + '</div><div class="muted small">色の付いた部分は、判断のときに見えていなかった値動き。</div>',
      { cls: 'pd-review', setup: function (node) { var c = node.querySelector('#pd-rp-chart'); if (v.an) { v.an.revealedCount = Math.max(0, Math.min(v.candles.length - 1, Math.round((endAs - g.S) / tfm))); setTimeout(function () { Chart.render(c, v.an, { visibleBars: 110, showZigzag: true, tfLabel: tfJa(x.tf || '15m') + '（記録）', sl: x.sl, tp: x.tp }); }, 20); } } });
  };
  PUI.replayable = function (x) {
    if (!x || !isFinite(x.seed)) return { ok: false, why: 'シードが記録されていない' };
    if (!x.checksum || !x.engineVersion) return { ok: false, why: '旧形式の記録（v9.0 以前）で、相場の作り方の確認ができない' };
    var g = PE().generate(x.seed, { gen: x.gen }); if (PE().checksum(g) !== x.checksum) return { ok: false, why: '相場の作り方が記録の時と違う（版 ' + x.scenarioVersion + '）' };
    return { ok: true };
  };
  PUI.drawCurve = function (c, curve, curve2) {
    if (!c || !c.getContext) return; var w = c.clientWidth || 300, h = c.clientHeight || 120; var dpr = root.devicePixelRatio || 1; c.width = w * dpr; c.height = h * dpr; var x = c.getContext('2d'); if (!x || !x.scale) return; x.scale(dpr, dpr);
    x.fillStyle = '#0b1226'; x.fillRect(0, 0, w, h); if (!curve || curve.length < 2) { x.fillStyle = '#9fb0d0'; x.font = '12px sans-serif'; x.fillText('まだ取引の記録がない', 10, h / 2); return; }
    var lo = Math.min.apply(null, curve.concat(curve2 || [])), hi = Math.max.apply(null, curve.concat(curve2 || [])); if (hi === lo) { hi += 1; lo -= 1; }
    if (curve2 && curve2.length > 1) { x.strokeStyle = 'rgba(200,200,220,0.55)'; x.lineWidth = 1; x.beginPath(); curve2.forEach(function (v, i) { var px = 6 + (w - 12) * i / (curve2.length - 1), py = 6 + (h - 12) * (1 - (v - lo) / (hi - lo)); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); }
    x.strokeStyle = '#5ab0ff'; x.lineWidth = 1.5; x.beginPath(); curve.forEach(function (v, i) { var px = 6 + (w - 12) * i / (curve.length - 1), py = 6 + (h - 12) * (1 - (v - lo) / (hi - lo)); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke();
  };

  /* ---------- 設定 ---------- */
  PUI.settings = async function () {
    var p = PUI.ensure();
    while (true) {
      var P = SPF().PROFILES[p.profile]; var vals = SPF().values(p.profile, p.overrides);
      var EDIT = [['requireRci', [true, false]], ['requireDiv', [false, true]], ['minEvidence', [2, 3, 1]], ['htfAgainst', ['block', 'warn']], ['htfConflict', ['block', 'warn']], ['maxRiskPercent', [2, 1, 3]], ['slBufferPips', [3, 5, 2]], ['chaseAtr', [2.2, 2.5, 1.8]]];
      var items = [{ label: '戦略プロファイル', right: P.name, sub: P.note }, { label: 'ヒント（根拠の数値を見るボタン・損切りの手伝い）', right: p.hints ? 'あり（初心者）' : 'なし（経験者）' }].concat(EDIT.map(function (e) { var pr = P.params[e[0]]; var cv = vals[e[0]]; return { label: (pr.provisional ? '※ ' : '') + pr.label, right: typeof cv === 'boolean' ? (cv ? 'する' : 'しない') : String(cv === 'block' ? '入らない' : cv === 'warn' ? '注意だけ' : cv), sub: pr.provisional ? '推奨仮設定（変更可能）' : '共有された基準' }; }))
        .concat([{ label: '仮設定を初期値に戻す' }, { label: '設定の一覧（確定と仮設定）' }]);
      var i = await Win.list(items, { title: '実践トレード道場の設定', cancel: true }); if (i < 0) return;
      if (i === 0) { p.profile = p.profile === 'mochipoyo' ? 'general' : 'mochipoyo'; p.overrides = {}; }
      else if (i === 1) p.hints = !p.hints;
      else if (i >= 2 && i < 2 + EDIT.length) { var e = EDIT[i - 2]; var cv = vals[e[0]]; var k = e[1].indexOf(cv); var nv = e[1][(k + 1) % e[1].length]; p.overrides[e[0]] = nv; }
      else if (i === 2 + EDIT.length) p.overrides = {};
      else { var ds = SPF().describe(p.profile, p.overrides); await Win.panel('<div class="rw-title">' + esc(P.name) + '</div><div class="small">' + esc(P.note) + '</div><table class="tbl">' + ds.map(function (x) { return '<tr><td>' + (x.provisional ? '※ ' : '') + esc(x.label) + '</td><td>' + esc(x.value) + (x.changed ? '（変更）' : '') + '</td><td>' + (x.provisional ? '推奨仮設定' : '共有された基準') + '</td></tr>'; }).join('') + '</table>' +
        '<div class="small">RCI の反転の判定（教材の仮設定）：' + Object.keys(SE().RCI_RULES).map(function (k) { var r = SE().RCI_RULES[k]; return r.label + ' ' + r.value + (r.provisional ? '（仮）' : ''); }).join('・') + '<br>ダイバージェンス：' + Object.keys(SE().DIV_RULES).map(function (k) { var r = SE().DIV_RULES[k]; return r.label + ' ' + r.value + '（仮）'; }).join('・') + '</div>'); }
    }
  };
  PUI.about = function () {
    return Win.message(['【もちぽよ実践トレード道場】架空の相場（学習用仮想ペア POYO/MOCHI）で、環境認識 → 待つ → 条件の確認 → 注文 → 管理 → 振り返り を練習する。',
      'A 日足・4時間足を開いて方向を読む → B 目線と待つ理由を登録 → C 足を1本ずつ進める（先の足は見えない）→ D 根拠を確かめて「待つ／ロング／ショート」→ E 損切り・利確・許容損失を決めて発注（不正な注文は発注できない）→ F 決済まで見届ける → G 振り返り。',
      '点は「判断の過程」（環境認識・セットアップ・トリガー・執行と資金管理・規律）で付け、結果（pips・R）は別に出す。条件がそろわないときに待つ・見送るのも正しい判断。',
      '確定している基準：上位足 日足・4H／エントリー足 5分・15分／EMA 20・30・40／RCI 9（±70 付近からの反転）／MACD 6・13・4（通常・ヒドゥン）／確定した高値・安値／複数の根拠／損切り必須／RR 1:1.5〜1:3 の目安。',
      '※ 反転の確認の本数・RCI とダイバの両方が必須か・上位足が食い違うとき・損切りの余裕・リスク%の上限などは「推奨仮設定」で、設定で変えられる（もちぽよ公式の機械売買ルールではない）。',
      '架空の相場の練習なので、実際の売買での利益を保証するものではない。'], { name: '実践トレード道場' });
  };

  /* ---------- トレード心理・規律の演習（行動の振り返り。医療的な診断ではない） ---------- */
  PUI.psych = async function () {
    var p = PUI.ensure(); var L = root.PRACTICE_PSYCH || [];
    while (true) {
      var items = L.map(function (q) { var a = p.psych.answers[q.id]; return { label: q.title, right: a === undefined ? '未回答' : a === q.best ? '済み' : '見直し', sub: q.theme }; }).concat([{ label: '行動の傾向を振り返る' }]);
      var i = await Win.list(items, { title: 'トレード心理・規律の演習', cancel: true }); if (i < 0) return;
      if (i === L.length) { var tags = {}; p.psych.log.forEach(function (x) { if (x.tag) tags[x.tag] = (tags[x.tag] || 0) + 1; }); var keys = Object.keys(tags);
        await Win.message(['これは行動の傾向の振り返りで、医療的・心理学的な診断ではない。'].concat(keys.length ? keys.map(function (k) { return (root.PRACTICE_PSYCH_TAGS || {})[k] + '：' + tags[k] + '回選んだ'; }) : ['まだ記録がない。']).concat(['どの選択肢も「ルールに沿って行動できるか」を見るためのもの。利益を約束する答えはない。'])); continue; }
      var q = L[i]; var c = await Win.choice(q.situation, q.options.map(function (o) { return o.text; })); if (c < 0) continue;
      p.psych.answers[q.id] = c; p.psych.log.push({ id: q.id, c: c, tag: q.options[c].tag || null, t: Date.now() }); if (p.psych.log.length > 200) p.psych.log = p.psych.log.slice(-200);
      await Win.message([(c === q.best ? 'ルールに沿った行動：' : '見直したい行動：') + q.options[c].why, 'ルールに沿った行動の例：' + q.options[q.best].text, q.note || '']); State.autosave();
    }
  };

  root.PracticeUI = PUI;
})(typeof window !== 'undefined' ? window : globalThis);
