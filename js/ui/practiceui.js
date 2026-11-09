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
  PUI.defaults = function () { return { v: 1, capital: (CONFIG && CONFIG.risk && CONFIG.risk.capital) || 1000000, history: [], profile: 'mochipoyo', overrides: {}, hints: true, level: 1, recent: [], series: null, last: null, psych: { answers: {}, log: [] }, seen: false, archive: null, historyWindowStartCapital: null, advanced: false }; };
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
      var st = TC().stats(p.history, { capital: p.historyWindowStartCapital });
      var M = [
        { label: 'コースを選んで練習', right: 'Lv' + p.level, sub: 'Lv1〜Lv7：学習用の問題（いろいろな型。答えの型は振り返りまで出ない）', run: async function () { var lv = await Win.list(PUI.LEVELS.slice(0, 7).map(function (L) { return { label: L.name, right: L.lv === p.level ? '前回' : '' }; }), { title: 'コースを選ぶ', cancel: true }); if (lv < 0) return; p.level = lv + 1; await PUI.loop(PUI.LEVELS[lv]); } },
        { label: '初見チャートの認定試験（Lv8・v2）', right: p.series ? (p.series.done + '/' + p.series.n) : '30問', sub: '学習用とは別の生成系列の問題。試験の間は型・結果・ヒントを出さない。中断しても続きから受けられる', run: function () { return PUI.series(); } },
        { label: '上級ポジション管理の練習', right: p.advanced ? '設定 ON' : '', sub: '保有中に 早めの決済・建値・部分決済・トレーリング。発注の前に決めた計画と比べて採点（結果の良し悪しでは決めない）', run: function () { return PUI.loop(PUI.LEVELS[5], { advanced: true }); } }
      ].concat(PUI.extraModes ? PUI.extraModes(p) : []).concat([
        { label: '成績・分析', right: st.trades + '取引', sub: '勝率・期待値R・PF（円／R）・最大DD（金額／割合）・連敗・見送り率・ルール遵守率・根拠別（定義つき）', run: function () { return PUI.stats(); } },
        { label: 'トレード心理・規律の演習', right: Object.keys(p.psych.answers).length + '/' + ((root.PRACTICE_PSYCH || []).length || 0), sub: '連敗の後・取り返し・ナンピン・損切りの移動・FOMO など（行動の振り返り。医療的な診断ではない）', run: function () { return PUI.psych(); } },
        { label: '設定（戦略プロファイル・ヒント・上級の管理）', right: p.profile === 'mochipoyo' ? 'もちぽよ（仮設定）' : '一般FX学習', sub: (p.hints ? 'ヒントあり（初心者向け）' : 'ヒントなし（経験者向け）') + '｜上級のポジション管理 ' + (p.advanced ? 'ON' : 'OFF') + '｜仮設定の値を変えられる', run: function () { return PUI.settings(); } },
        { label: 'このモードについて', sub: '流れ・採点の考え方・確定している基準と仮設定', run: function () { return PUI.about(); } },
        { label: 'やめる', quit: true }]);
      var i = await Win.list(M, { title: 'もちぽよ実践トレード道場　仮想資金 ' + yen(p.capital), cls: 'main-menu pd-menu' });
      if (i < 0 || M[i].quit) return;
      await M[i].run();
    }
  };
  PUI.loop = async function (L, o) { while (true) { var r = await PUI.play(Object.assign({ level: L.lv, lvDef: L }, o || {})); if (!r || r.next !== 'again') return r; } };
  PUI.series = async function () {
    var p = PUI.ensure(); var L = PUI.LEVELS[7];
    if (p.series && p.series.done < p.series.n) { var c = await Win.choice('連続演習の続き（' + p.series.done + '/' + p.series.n + '問）', ['続きから', '最初から', 'やめる']); if (c < 0 || c === 2) return; if (c === 1) p.series = null; }
    if (!p.series) p.series = { n: L.series, done: 0, startedAt: Date.now() };
    while (p.series && p.series.done < p.series.n) { var r = await PUI.play({ level: 8, lvDef: L, seriesNo: p.series.done + 1 }); if (!r) return; p.series.done++; State.autosave(); if (r.next !== 'again') return; }
    if (p.series && p.series.done >= p.series.n) { var s = TC().stats(p.history.filter(function (x) { return x.set === 'exam' && x.t >= p.series.startedAt; })); p.series = null; await Win.message(['連続演習 30 問を終えた。', '未知の問題の成績：判断の点の平均は「成績・分析」で見られる。取引 ' + s.trades + '回・期待値 ' + (s.expectancyR === null ? '―' : sgn(s.expectancyR, 2) + 'R') + (s.small ? '（取引の数が少ないので、数字は安定しない）' : '')]); }
  };

  /* ---------- 1問 ---------- */
  // opts：{ level, lvDef, seriesNo, pick（テスト用）, advanced（上級のポジション管理） }。返り値：{ record, next:'again'|'quit' } または null（中断）
  PUI.REASONS = [['rci', 'RCI が逆向きに反転した'], ['ema', 'EMA の並びが逆になった'], ['dow', 'ダウ（確定した高値・安値）が逆になった'], ['h4', '4時間足の向きが逆になった'], ['div', '逆向きのダイバージェンスが確定した'], ['time', '予定した時間・区切りになった'], ['emotion', '怖くなった・利益を早く確保したくなった（計画にない）']];
  PUI.PLANS = [['hold', '当初の損切り・利確のまま'], ['be1r', '+1R まで伸びたら損切りを建値へ'], ['partial1r', '+1R で半分を決済'], ['trail', 'トレーリング（足の確定ごとに損切りを追いかける）']];
  PUI.play = function (opts) {
    opts = opts || {}; var d = State.data; var p = PUI.ensure(d); var P = prof(p); var lvDef = opts.lvDef || PUI.LEVELS[(opts.level || 1) - 1];
    var pick = opts.pick || PUI.pick(p, lvDef); if (!pick) { return Win.message(['問題のデータ（js/data/practice-seeds.js）が読み込めていない。']).then(function () { return null; }); }
    var advanced = opts.advanced !== undefined ? !!opts.advanced : !!p.advanced;
    var hintsOn = opts.hints !== undefined ? !!opts.hints : p.hints;   // 初見の認定試験ではヒントを出さない
    var play = PE().start(pick, { profile: p.profile, level: lvDef.lv, hints: hintsOn, advanced: advanced, exam: !!opts.exam }); play.overrides = p.overrides; PE().markStart(play, P);
    var g = PE().game(play); var Q = PE().focusQuestions(lvDef.lv, PE().snap(play)); var doPick = lvDef.lv === 1 || lvDef.lv === 4;
    var view = { tf: play.entryTF, visible: 72, zig: true, end: null, cross: null, pick: null, line: null, snap: null, count: 0 }; var timer = null; var stageEl = document.getElementById('stage'); if (stageEl) stageEl.classList.add('trade-open');
    if (document.body) document.body.classList.add('pd-chart-open');   // スマホ：チャートの操作のあいだ RPG の十字キーを隠す
    PUI.current = { play: play, view: view };
    return new Promise(function (resolve) {
      var tfs = PE().TFS.map(function (t) { return '<button class="tf" data-tf="' + t.id + '">' + esc(t.label) + '</button>'; }).join('');
      var dirOpt = [['up', '上昇'], ['down', '下降'], ['range', 'レンジ・不明瞭'], ['unknown', '判定できない（履歴不足）']];
      var qA = ['1d', '4h'].map(function (t) { return '<div class="aq" data-q="' + t + '"><div class="aq-t"><span class="aq-n">' + (t === '1d' ? '1' : '2') + '</span>' + esc(tfJa(t)) + 'の方向は？（確定した足で判断）</div><div class="aq-o">' + dirOpt.map(function (o) { return '<button class="aopt" data-q="' + t + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>'; }).join('') +
        Q.map(function (q, i) { return '<div class="aq" data-fq="' + q.key + '"><div class="aq-t"><span class="aq-n">' + (i + 3) + '</span>' + esc(q.title) + '</div><div class="aq-o">' + q.options.map(function (o) { return '<button class="aopt" data-fq="' + q.key + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>'; }).join('') +
        (doPick ? '<div class="aq pd-pickq"><div class="aq-t">チャートで、いま表示している足の「直近の確定した高値・安値」を指定（参考の練習。点には入れない）</div><div class="aq-o"><button class="aopt" data-pick="high">高値をタップで指定</button><button class="aopt" data-pick="low">安値をタップで指定</button></div><div class="small" id="pd-pickres"></div></div>' : '');
      var EVK = P.evidence.filter(function (k) { return ['htf', 'ema', 'dow', 'rci', 'div'].indexOf(k) >= 0 || p.profile === 'general'; });
      var html = '<div class="trade-head"><b>もちぽよ実践トレード道場</b>' + (opts.seriesNo ? '　<span class="gold-text">' + (opts.exam ? '初見チャートの認定試験 ' : '未知の問題 ') + opts.seriesNo + '/' + (opts.seriesN || 30) + '</span>' : '　<span class="muted small">' + esc(lvDef.name) + '</span>') + (advanced ? '　<span class="gold-text small">上級のポジション管理 ON</span>' : '') + '　<span class="pd-phase" id="pd-phase"></span>' +
          '<div class="muted small">' + esc(PE().PAIR) + '。表示している足より先は、決済・振り返りまで見せない。採点：' + esc(SPF().PROFILES[p.profile].name) + '</div></div>' +
        '<div class="trade-chartwrap"><div class="chart-tools"><div class="tfs">' + tfs + '</div><div class="ctl"><button class="mini" data-zoom="in" aria-label="拡大">＋</button><button class="mini" data-zoom="out" aria-label="縮小">－</button><button class="mini" data-cmd="vreset">最新へ</button><button class="mini" data-cmd="cross">十字線</button><button class="mini" data-zig="1">ZigZag</button><button class="mini" data-cmd="quit">やめる</button></div></div>' +
          '<div class="pd-phasebar small"><span class="pd-phase" id="pd-phase2"></span> <span class="muted" id="pd-steps2"></span> <label class="pd-stepl">進める時間<select id="pd-stepmin">' + PE().STEP_MINS.map(function (m) { return '<option value="' + m + '"' + (m === play.stepMin ? ' selected' : '') + '>' + m + '分ずつ</option>'; }).join('') + '</select></label></div>' +
          '<canvas class="chart" id="pd-chart"></canvas><div class="pd-cross small" id="pd-cross" aria-live="polite"></div><div class="muted small pd-forming" id="pd-forming"></div>' +
          '<div class="muted small pd-howto">チャート：ドラッグで過去へ・ピンチ／ホイールで拡大縮小・ダブルタップで拡大／元に戻す・長押し（マウスは動かすだけ）で十字線・キーは ← → ＋ − 0 Esc</div></div>' +
        '<div class="trade-msg" id="pd-msg"></div>' +
        '<div class="pd-sec" id="pd-A"><div class="an-title">A 環境認識：日足・4時間足を開いて方向を読む</div>' + qA + '</div>' +
        '<div class="pd-sec" id="pd-B"><div class="an-title">B 仮説：エントリー足・目線・待つ理由を決めて登録する</div>' +
          '<div class="aq-o pd-etf"><span class="small">エントリー足（同じ時刻のまま選べる）：</span><button class="aopt" data-etf="15m">15分足</button><button class="aopt" data-etf="5m">5分足</button></div>' +
          '<div class="aq-o pd-bias"><button class="aopt" data-bias="buy">買い目線</button><button class="aopt" data-bias="sell">売り目線</button><button class="aopt" data-bias="neutral">中立（様子を見る）</button></div>' +
          '<select id="pd-why" class="pd-sel"><option value="">待つ理由・見るもの（選ぶ）</option><option value="rci">RCI の反転を待つ</option><option value="div">ダイバージェンスの確定を待つ</option><option value="pullback">押し目・戻り目を待つ</option><option value="htf">上位足の向きがそろうのを待つ</option><option value="none">根拠がそろわなければ見送る</option></select>' +
          '<button class="tcmd" data-cmd="hyp">仮説を登録して足を進める</button></div>' +
        '<div class="pd-sec hidden" id="pd-C"><div class="an-title">C 足を進める（<span id="pd-steps"></span>）</div><div class="trade-cmds ready pd-cmds"><button class="tcmd" data-cmd="step">進める</button><button class="tcmd" data-cmd="play">再生</button><button class="tcmd" data-cmd="stop">停止</button><button class="tcmd buy" data-cmd="check">エントリーを検討</button><button class="tcmd skip" data-cmd="skip">見送って終える</button></div></div>' +
        '<div class="pd-sec hidden" id="pd-D"><div class="an-title">D 条件の確認：いまの足で「ある」と思う根拠を選ぶ</div><div class="pd-ev">' + EVK.map(function (k) { return '<label class="pd-chk"><input type="checkbox" data-ev="' + k + '"> ' + esc(SPF().evidenceLabel(k)) + '</label>'; }).join('') + '</div>' +
          '<div class="muted small">条件の項目数が多くても、必須の条件・妨げ（上位足と逆・飛び乗り・レンジの中ほど）があれば発注の条件にはならない。' + (hintsOn ? '' : '（ヒントなし）') + '</div>' + (hintsOn ? '<button class="mini" data-cmd="hint">ヒント：いまの足の数値を見る</button><div class="pd-hint small" id="pd-hint"></div>' : '') +
          '<div class="trade-cmds ready"><button class="tcmd skip" data-cmd="wait">待つ（足送りに戻る）</button><button class="tcmd buy" data-cmd="long">ロング</button><button class="tcmd sell" data-cmd="short">ショート</button></div></div>' +
        '<div class="pd-sec hidden" id="pd-E"><div class="an-title">E 注文（<span id="pd-side"></span>）：損切りは必須</div><div class="order-grid"><label>損切り<input type="number" step="0.001" id="pd-sl" inputmode="decimal"></label><label>利確<input type="number" step="0.001" id="pd-tp" inputmode="decimal"></label><label>許容損失（資金の%）<select id="pd-risk">' + [0.5, 1, 2, 5].map(function (r) { return '<option value="' + r + '"' + (r === 1 ? ' selected' : '') + '>' + r + '%' + (r > P.maxRiskPercent ? '（上限超え）' : '') + '</option>'; }).join('') + '</select></label>' +
          (advanced ? '<label>決済管理の計画<select id="pd-plan">' + PUI.PLANS.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join('') + '</select></label>' : '') + '</div>' +
          '<div class="rw-row"><button class="mini" data-cmd="slpick">チャートで損切りを指定</button><button class="mini" data-cmd="tppick">チャートで利確を指定</button>' + (hintsOn ? '<button class="mini" data-cmd="slhelp">損切り：確定した山谷の外側（＋' + P.slBufferPips + 'pips）</button><button class="mini" data-cmd="tphelp">利確：RR 1:2</button>' : '') + '</div><div class="muted small">チャートの損切り・利確の線は、上下にドラッグしても動かせる（入力欄と同じ検証をする）。</div>' +
          '<div class="calc" id="pd-calc"></div><div class="calc o-err" id="pd-err" role="alert"></div><div class="trade-cmds ready"><button class="tcmd buy" data-cmd="order">発注する</button><button class="tcmd" data-cmd="back">戻る</button></div></div>' +
        '<div class="pd-sec hidden" id="pd-F"><div class="an-title">F 保有中' + (advanced ? '：上級のポジション管理（足が確定した後に決める）' : '：当初の損切り・利確は動かさない') + '</div><div class="small" id="pd-pos"></div><div class="trade-cmds ready"><button class="tcmd" data-cmd="hstep">進める</button><button class="tcmd" data-cmd="hplay">' + (advanced ? '再生' : '決済まで進める') + '</button>' + (advanced ? '<button class="tcmd" data-cmd="stop">停止</button>' : '') + '</div>' +
          (advanced ? '<div class="trade-cmds ready pd-adv"><button class="tcmd" data-cmd="m-be">損切りを建値へ</button><button class="tcmd" data-cmd="m-p25">25%決済</button><button class="tcmd" data-cmd="m-p50">50%決済</button><button class="tcmd" data-cmd="m-p75">75%決済</button>' +
            '<select id="pd-trail" class="pd-sel2"><option value="">トレーリング…</option><option value="pips:10">10pips</option><option value="pips:20">20pips</option><option value="atr:1">ATR×1</option><option value="atr:1.5">ATR×1.5</option><option value="atr:2">ATR×2</option></select></div>' +
            '<div class="trade-cmds ready pd-adv"><select id="pd-cwhy" class="pd-sel2"><option value="">早めに決済する理由…</option>' + PUI.REASONS.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join('') + '</select><button class="tcmd sell" data-cmd="m-close">早めに決済</button></div><div class="small" id="pd-mmsg" role="status"></div>' +
            '<div class="muted small">ナンピン（買い増し・売り増し）と、損切りを遠ざける変更はできない。成行の決済は次の足の始値、損切りの変更は次の足から有効。</div>'
          : '<div class="muted small">早めの決済・建値への移動・トレーリング・部分利確は、設定の「上級のポジション管理」を ON にすると使える（基本のルールでは使わない）。</div>') + '</div>';
      Win.panel(html, { cls: 'trade-panel practice-panel', noClose: true, onCancel: function () { quit(); }, setup: function (node, close) {
        var canvas = node.querySelector('#pd-chart'); var msgEl = node.querySelector('#pd-msg'); var side = null; var done = false; var ctl = null; var lastV = null; var lastPiv = null;
        function msg(t) { msgEl.textContent = t; }
        function $(s) { return node.querySelector(s); }
        function show(id, on) { var el = $('#' + id); if (el) el.classList.toggle('hidden', !on); }
        function phase(t) { var el = $('#pd-phase'); if (el) el.textContent = '［' + t + '］'; var el2 = $('#pd-phase2'); if (el2) el2.textContent = '［' + t + '］'; node.setAttribute('data-phase', t); }   // チャートの枠の中にも出す（スマホで下へ読み進めても見える）
        // ZigZag に使う山谷：判断の時点までの確定足で、採点と同じ計算（SignalEngine.pivots）。確定した山谷と、最後の確定より後の未確定の山谷
        function pivList(c) { var pv = SE().pivots(c, CONFIG.zigzag.depth, c.length - 1); var L = pv.confirmed.map(function (x) { return { index: x.index, price: x.price, type: x.type, confirmed: true }; }); var lc = L.length ? L[L.length - 1].index : -1;
          var f = pv.forming.filter(function (x) { return x.index > lc; }); if (f.length) { var fx = f[f.length - 1]; L.push({ index: fx.index, price: fx.price, type: fx.type, confirmed: false }); } return { list: L, raw: pv }; }
        function curLines() { if (play.entry && view.tf === play.entryTF) return { entry: play.entry.entryPrice, sl: play.pos ? play.pos.sl : play.entry.order.sl, tp: play.pos ? play.pos.tp : play.entry.order.tp };
          if (side && view.tf === play.entryTF) { var sl = parseFloat($('#pd-sl').value), tp = parseFloat($('#pd-tp').value); return { sl: isNaN(sl) ? null : sl, tp: isNaN(tp) ? null : tp }; } return {}; }
        function render() {
          var asOf = play.asOf; var v = PE().view(g, view.tf, asOf); if (!v.an) return; lastV = v; view.count = v.candles.length; var pl = pivList(v.candles); lastPiv = pl;
          var o = { visibleBars: view.visible, showZigzag: view.zig, zigLegend: true, pivots: pl.list, endIndex: view.end === null ? undefined : view.end, crosshair: view.cross, activeLine: view.line, snap: view.snap, pickMode: view.pick, tfLabel: tfJa(view.tf) + (view.tf === play.entryTF ? '（エントリー足）' : '') };
          var ln = curLines(); o.entry = ln.entry; o.sl = ln.sl; o.tp = ln.tp;
          Chart.render(canvas, v.an, o);
          var f = v.forming; $('#pd-forming').textContent = f ? '形成中の' + tfJa(view.tf) + '（指標の計算には入れていない）：始値 ' + fmt(f.o) + '・高値 ' + fmt(f.h) + '・安値 ' + fmt(f.l) + '・いま ' + fmt(f.c) : '表示中の' + tfJa(view.tf) + 'はすべて確定足（指標は直近の確定した ' + v.candles.length + ' 本で計算）';
          node.querySelectorAll('.tf').forEach(function (b) { var id = b.getAttribute('data-tf'); b.classList.toggle('on', id === view.tf); b.textContent = tfJa(id) + (id === play.entryTF ? '★' : ''); });
          node.querySelector('[data-zig]').classList.toggle('on', view.zig); var cb = node.querySelector('[data-cmd="cross"]'); if (cb) cb.classList.toggle('on', !!view.cross);
          node.querySelectorAll('[data-etf]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-etf') === play.entryTF); });
          var left = PE().waitLeftMin(play); var se = $('#pd-steps'); if (se) se.textContent = 'エントリー足 ' + tfJa(play.entryTF) + '・開始から ' + (play.asOf - play.S) * 5 + '分・待てるのはあと ' + left + '分（' + Math.ceil(left / play.stepMin) + '回）';
          var se2 = $('#pd-steps2'); if (se2) se2.textContent = play.phase === 'analysis' ? '' : play.entry ? '保有 ' + (play.asOf - play.entry.asOf) * 5 + '分' : '開始から ' + (play.asOf - play.S) * 5 + '分・あと ' + left + '分';
        }
        function crossText(x) { var el = $('#pd-cross'); if (!el) return; if (!x) { el.textContent = ''; return; }
          var e = x.ema.map(function (v) { return v === null ? '―' : fmt(v); }); var pv = x.pivot ? (x.pivot.confirmed ? '確定した' : '未確定の') + (x.pivot.type === 'high' ? '高値' : '安値') : 'なし';
          el.innerHTML = '<b>' + (x.fromEnd ? x.fromEnd + '本前' : '最新') + 'の確定足</b>　始 ' + fmt(x.o) + '・高 ' + fmt(x.h) + '・安 ' + fmt(x.l) + '・終 ' + fmt(x.c) + (x.price !== null ? '　<span class="muted">十字線 ' + fmt(x.price) + '</span>' : '') +
            '<br>EMA20 ' + e[0] + '・30 ' + e[1] + '・40 ' + e[2] + '　RCI ' + (x.rci === null || x.rci === undefined ? '―' : x.rci.toFixed(0)) + '　MACD ' + (x.macd === null || x.macd === undefined ? '―' : x.macd.toFixed(4)) + '／シグナル ' + (x.signal === null || x.signal === undefined ? '―' : x.signal.toFixed(4)) + '　山谷：' + pv; }
        function answeredA() { return !!(play.answers['1d'] && play.answers['4h']) && Q.every(function (q) { return play.focus && play.focus[q.key]; }); }
        function refresh() {
          if (play.phase === 'analysis') { phase(play.hypothesis ? '条件待ち' : '環境認識'); msg(!answeredA() ? 'A：日足・4時間足のボタンでチャートを開き、方向を選ぼう' + (Q.length ? '（読み取りの設問もある）' : '') + '。' : 'B：エントリー足・目線・待つ理由を選んで「仮説を登録」。'); }
          else if (play.phase === 'waiting') { phase('条件待ち'); msg('足を進めて、根拠がそろうのを待とう。そろったと思ったら「エントリーを検討」。'); }
          else if (play.phase === 'holding') phase('保有中');
          render();
        }
        // 分析・仮説
        node.querySelectorAll('.aq-o').forEach(function (row) { row.addEventListener('click', function (e) { var b = e.target.closest('.aopt'); if (!b || done) return; e.stopPropagation();
          if (b.hasAttribute('data-q')) { if (play.hypothesis) return; play.answers[b.getAttribute('data-q')] = b.getAttribute('data-v'); }
          else if (b.hasAttribute('data-fq')) { if (play.hypothesis) return; play.focus = play.focus || {}; play.focus[b.getAttribute('data-fq')] = b.getAttribute('data-v'); }
          else if (b.hasAttribute('data-bias')) { if (play.hypothesis) return; play.bias = b.getAttribute('data-bias'); }
          else if (b.hasAttribute('data-etf')) { if (!PE().setEntryTF(play, b.getAttribute('data-etf'))) { msg('エントリー足は仮説を登録する前だけ変えられる。'); return; } view.tf = play.entryTF; play.viewed[view.tf] = true; view.end = null; view.cross = null; render(); return; }
          else if (b.hasAttribute('data-pick')) { view.pick = b.getAttribute('data-pick'); view.snap = null; render(); msg('チャートの' + (view.pick === 'high' ? '高値' : '安値') + 'の山（谷）の近くをタップ（クリック）しよう。確定した山谷に吸い付く。'); return; }
          row.querySelectorAll('.aopt').forEach(function (x) { x.classList.toggle('on', x === b); }); refresh(); }); });
        function setTf(t) { view.tf = t; play.viewed[t] = true; view.end = null; view.cross = null; crossText(null); render(); }
        function stopPlay() { if (timer) { clearInterval(timer); timer = null; } }
        function step() { if (play.phase !== 'waiting') return false; var okS = PE().advance(play, P); if (!okS) { stopPlay(); if (play.phase === 'timeout') finish(); return false; } view.end = null; if (view.cross) view.cross = null; crossText(null); render(); return true; }
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
        function openOrder(s) { side = s; show('pd-D', false); show('pd-E', true); phase('発注可能候補：注文の確認'); $('#pd-side').textContent = s === 'buy' ? 'ロング（買い）' : 'ショート（売り）'; $('#pd-sl').value = ''; $('#pd-tp').value = ''; view.tf = play.entryTF; recalc(); msg('損切り・利確・許容損失を入れよう（チャートで指定・線のドラッグもできる）。確定の前に検証する。'); }
        function cur() { var o = { side: side, sl: $('#pd-sl').value === '' ? null : $('#pd-sl').value, tp: $('#pd-tp').value === '' ? null : $('#pd-tp').value, riskPercent: parseFloat($('#pd-risk').value) }; var pl = $('#pd-plan'); if (pl) o.plan = pl.value; return o; }
        function recalc() { var pv = PE().preview(play, cur(), p.capital, P); var v = pv.validation;
          $('#pd-calc').innerHTML = '約定の予定 <b>' + fmt(pv.entryPx) + '</b>（' + (side === 'buy' ? '買値' : '売値') + '・スプレッド ' + TC().COSTS.spreadPips + 'pips）　損切り幅 <b>' + (v.riskPips ? v.riskPips.toFixed(1) + 'pips' : '―') + '</b>　利確幅 <b>' + (v.rewardPips ? v.rewardPips.toFixed(1) + 'pips' : '―') + '</b>　RR <b>' + (pv.rr ? '1:' + pv.rr.toFixed(2) : '―') + '</b>　損益分岐の勝率 <b>' + (pv.breakeven ? (pv.breakeven * 100).toFixed(1) + '%' : '―') + '</b>' +
            '<br>許容損失 <b>' + yen(p.capital * cur().riskPercent / 100) + '</b>　ロット <b>' + (pv.sizing && pv.sizing.ok ? pv.sizing.lots.toFixed(2) + '（' + Math.round(pv.sizing.units).toLocaleString() + '通貨）' : '―') + '</b>　通常約定時の推定損失 <b>' + (pv.estLoss !== null ? yen(pv.estLoss) + '（' + pv.estLossPct.toFixed(2) + '%）' : '―') + '</b><span class="muted small">（損切りで終わったとき。入口と損切りの滑り ' + (TC().COSTS.entrySlipPips + TC().COSTS.stopSlipPips) + 'pips 込み。架空の相場の仮定）</span>' +
            (pv.stress && pv.stress.length ? '<br><span class="small bad">損切りは「必ずその価格で止まる」約束ではない。窓（価格が飛ぶ）や急変では推定より大きく損をすることがある。</span><span class="muted small">ストレスの例（仮定。保証・予測ではない）：' + pv.stress.map(function (x) { return '損切りを ATR×' + x.atr + ' 越えて約定 → ' + yen(x.loss) + '（' + x.pct.toFixed(2) + '%）'; }).join('／') + '</span>' : '');
          $('#pd-err').innerHTML = pv.errors.length ? '<b class="bad">発注できない：</b>' + pv.errors.map(esc).join('<br>') : pv.warnings.length ? '<span class="muted small">注意：' + pv.warnings.map(esc).join('／') + '</span>' : '';
          render(); return pv; }
        ['#pd-sl', '#pd-tp', '#pd-risk'].forEach(function (s) { var el = $(s); el.addEventListener('input', recalc); el.addEventListener('change', recalc); });
        // チャートでの指定（高値・安値：確定した山谷に吸い付く。損切り・利確：タップした価格。損切りは近くの確定した山谷があればその外側）
        function nearestPivot(x, y, mp, type) { var best = null, bd = Infinity; var tolX = Math.max(24, mp.slot * 3), tol = 40;
          (lastPiv ? lastPiv.raw.confirmed.map(function (q) { return { index: q.index, price: q.price, type: q.type, confirmed: true }; }).concat(lastPiv.raw.forming.map(function (q) { return { index: q.index, price: q.price, type: q.type, confirmed: false }; })) : []).forEach(function (q) {
            if (type && q.type !== type) return; if (q.index < mp.start || q.index > mp.end) return; var dx = Math.abs(mp.xOf(q.index) - x), dy = Math.abs(mp.yOf(q.price) - y); if (dx > tolX) return; var dd = Math.hypot(dx, dy); if (dd < bd && dd <= tol + tolX / 2) { bd = dd; best = q; } }); return best; }
        function onTap(x, y, mp) {
          if (!view.pick) return; var k = view.pick;
          if (k === 'high' || k === 'low') { var q = nearestPivot(x, y, mp, k); var res = $('#pd-pickres');
            if (!q) { res.textContent = '近くに' + (k === 'high' ? '高値の山' : '安値の谷') + 'がない。山（谷）の先の近くをタップしよう。'; return; }
            if (!q.confirmed) { res.textContent = 'その' + (k === 'high' ? '山' : '谷') + 'はまだ確定していない（右側に ' + CONFIG.zigzag.depth + ' 本の足がそろっていない）。確定したものを選ぼう。'; view.snap = { index: q.index, price: q.price }; render(); return; }
            var lastC = lastPiv.raw.confirmed.filter(function (z) { return z.type === k; }).slice(-1)[0]; var right = !!lastC && lastC.index === q.index;
            play.picks = play.picks || {}; play.picks[k] = { tf: view.tf, index: q.index, price: q.price, ok: right, truth: lastC ? lastC.price : null, asOf: play.asOf };
            res.textContent = (k === 'high' ? '高値' : '安値') + ' ' + fmt(q.price) + '（' + tfJa(view.tf) + '）：' + (right ? '直近の確定した' + (k === 'high' ? '高値' : '安値') + 'で合っている' : 'もっと新しい確定した' + (k === 'high' ? '高値' : '安値') + '（' + fmt(lastC && lastC.price) + '）がある');
            view.pick = null; view.snap = { index: q.index, price: q.price }; render(); return; }
          if (k === 'sl' || k === 'tp') { var price = mp.yToPrice(y); if (k === 'sl') { var q2 = nearestPivot(x, y, mp, side === 'buy' ? 'low' : 'high'); if (q2 && q2.confirmed && Math.abs(mp.yOf(q2.price) - y) <= 24) price = side === 'buy' ? q2.price - P.slBufferPips * play.pip : q2.price + P.slBufferPips * play.pip; }
            $(k === 'sl' ? '#pd-sl' : '#pd-tp').value = fmt(price); view.pick = null; recalc(); msg((k === 'sl' ? '損切り' : '利確') + 'を ' + fmt(price) + ' にした' + (k === 'sl' ? '（近くの確定した山谷があれば、その外側に余裕をとった）' : '') + '。'); }
        }
        // 損切り・利確の線のドラッグ（注文の確認のときだけ。保有中は上級の管理の「損切りの変更」で）
        function lineAt(y, type) { if (!side || play.entry || view.tf !== play.entryTF) return null; var mp = canvas._map; if (!mp) return null; var ln = curLines(); var tol = type === 'mouse' ? 7 : 16; var best = null, bd = Infinity;
          ['sl', 'tp'].forEach(function (k) { if (ln[k] === null || ln[k] === undefined) return; var dd = Math.abs(mp.yOf(ln[k]) - y); if (dd <= tol && dd < bd) { bd = dd; best = k; } }); return best; }
        function onLine(kind, price, ph) { if (!isFinite(price)) return; $(kind === 'sl' ? '#pd-sl' : '#pd-tp').value = fmt(price); view.line = ph === 'end' ? null : kind; recalc(); }
        function holdInfo() { var en = play.entry; var st = play.pos; var price = PE().snap(play).price;
          if (st) { var real = st.fills.reduce(function (a, f) { return a + f.yen; }, 0); var unp = st.lots ? st.sg * ((price - st.sg * TC().COSTS.spreadPips * play.pip / 2) - st.entryFill) / play.pip : 0;
            $('#pd-pos').innerHTML = (en.side === 'buy' ? 'ロング' : 'ショート') + '　約定 ' + fmt(st.entryFill) + '　いまの損切り <b>' + fmt(st.sl) + '</b>（当初 ' + fmt(st.sl0) + '）　利確 ' + fmt(st.tp) + '　残り ' + st.lots.toFixed(2) + '／' + st.lots0.toFixed(2) + 'ロット' + (st.trail ? '　トレーリング ' + (st.trail.dist / play.pip).toFixed(1) + 'pips' : '') + (st.pending.length ? '　<span class="gold-text">次の足で決済の予約あり</span>' : '') +
              '<br>実現 ' + (real >= 0 ? '+' : '') + yen(real) + '　残りの含み損益（いまの決済の価格で）' + sgn(unp) + 'pips　経過 ' + (play.asOf - en.asOf) * 5 + '分　最大順行 ' + sgn(st.mfe / play.pip) + 'pips（' + sgn(st.mfe / play.pip / st.riskPips0, 2) + 'R）'; return; }
          $('#pd-pos').innerHTML = (en.side === 'buy' ? 'ロング' : 'ショート') + '　約定 ' + fmt(play.settle.entryPrice) + '　損切り ' + fmt(en.order.sl) + '　利確 ' + fmt(en.order.tp) + '　' + en.sizing.lots.toFixed(2) + 'ロット　通常約定時の推定損失 ' + yen(en.sizing.actualRisk) + '　経過 ' + (play.asOf - en.asOf) * 5 + '分'; }
        function hstep() { if (play.phase !== 'holding') return; PE().holdStep(play); view.end = null; holdInfo(); render(); if (play.phase === 'closed') { stopPlay(); setTimeout(finish, 250); } }
        function manage(a) { var r = PE().manage(play, a); var m = $('#pd-mmsg'); if (m) m.textContent = r.ok ? '✓ ' + (r.note || '受け付けた') : '✗ ' + r.error; holdInfo(); render(); return r; }
        // 終わり
        function finish() { if (done) return; done = true; stopPlay(); var last = p.last || {}; var gr = PE().grade(play, { prevLoss: !!last.loss, prevRiskPercent: last.riskPercent || 0 }, P); var rec = PE().record(play, gr, p.capital);
          if (opts.seriesId) rec.seriesId = opts.seriesId;
          if (play.picks) rec.picks = { high: play.picks.high ? play.picks.high.ok : null, low: play.picks.low ? play.picks.low.ok : null };
          PUI.pushHistory(p, rec);
          if (rec.kind === 'trade' && isFinite(rec.pnl)) { p.capital = rec.capitalAfter; p.last = { loss: rec.riskR < 0, riskPercent: rec.riskPercent, t: rec.t }; }
          if (root.PlayLog) try { root.PlayLog.add('practice', { kind: rec.kind, process: rec.process, riskR: rec.riskR, level: rec.level, set: rec.set, tf: rec.tf, adv: rec.advanced }); } catch (e) { }
          State.autosave(); close({ play: play, grade: gr, record: rec }); }
        function quit() { if (done) return; Win.confirmQuit('この問題', '採点・記録はされない').then(function (yes) { if (!yes || done) return; done = true; stopPlay(); close(null); }); }
        node.addEventListener('click', function (e) {
          var t = e.target.closest('button'); if (!t || done) return; e.stopPropagation();
          if (t.getAttribute('data-tf')) { setTf(t.getAttribute('data-tf')); return; }
          if (t.getAttribute('data-zoom')) { if (ctl) ctl.zoom(t.getAttribute('data-zoom') === 'in' ? 1 / 1.25 : 1.25); return; }
          if (t.getAttribute('data-zig')) { view.zig = !view.zig; render(); return; }
          var c = t.getAttribute('data-cmd'); if (!c) return;
          if (c === 'quit') return quit();
          if (c === 'vreset') { if (ctl) ctl.reset(); return; }
          if (c === 'cross') { if (view.cross) { view.cross = null; crossText(null); render(); } else { var mp = canvas._map; if (mp && ctl) ctl.setCrossAt(mp.xOf(mp.end), mp.yPrice0 + mp.hPrice / 2); canvas.focus && canvas.focus(); } return; }
          if (c === 'hyp') { if (!answeredA()) { msg('先に A の設問をすべて選ぼう（日足・4時間足のボタンでチャートを確かめられる）。'); return; } if (!play.bias) { msg('目線（買い・売り・中立）を選ぼう。'); return; }
            play.hypothesis = { bias: play.bias, why: $('#pd-why').value || null, asOf: play.asOf, entryTF: play.entryTF, at: Date.now() }; play.events.push({ kind: 'hypothesis', asOf: play.asOf, bias: play.bias, why: play.hypothesis.why, tf: play.entryTF, at: Date.now() });
            play.phase = 'waiting'; view.pick = null; show('pd-A', false); show('pd-B', false); show('pd-C', true); view.tf = play.entryTF; view.end = null; refresh(); return; }
          if (c === 'step') { step(); return; }
          if (c === 'play') { if (timer) return; timer = setInterval(function () { if (!step()) stopPlay(); }, State.data.settings.textSpeed === 'instant' ? 60 : 420); return; }
          if (c === 'stop') { stopPlay(); return; }
          if (c === 'check') { openCheck(); return; }
          if (c === 'skip') { stopPlay(); if (!PE().skip(play, null)) return; finish(); return; }
          if (c === 'hint') { hint(); return; }
          if (c === 'wait') { PE().wait(play); play.claims = claims(); show('pd-D', false); show('pd-C', true); refresh(); return; }
          if (c === 'long' || c === 'short') { play.claims = claims(); openOrder(c === 'long' ? 'buy' : 'sell'); return; }
          if (c === 'back') { side = null; view.pick = null; show('pd-E', false); show('pd-C', true); refresh(); return; }
          if (c === 'slpick' || c === 'tppick') { view.tf = play.entryTF; view.pick = c === 'slpick' ? 'sl' : 'tp'; render(); msg('チャートの価格の欄（いちばん上）をタップして' + (view.pick === 'sl' ? '損切り' : '利確') + 'の価格を指定しよう。'); return; }
          if (c === 'slhelp') { var sn = PE().snap(play); var ref = side === 'buy' ? sn.entry.swing.low : sn.entry.swing.high; if (ref === null) { msg('確定した山谷がまだない。'); return; } $('#pd-sl').value = fmt(side === 'buy' ? ref - P.slBufferPips * play.pip : ref + P.slBufferPips * play.pip); recalc(); return; }
          if (c === 'tphelp') { var pv0 = PE().preview(play, cur(), p.capital, P); if (!pv0.validation.riskPips) { msg('先に損切りを正しく入れよう。'); return; } var r0 = pv0.validation.riskPips * play.pip * 2; $('#pd-tp').value = fmt(side === 'buy' ? pv0.entryPx + r0 : pv0.entryPx - r0); recalc(); return; }
          if (c === 'order') { if (play.entry) return; var pv = recalc(); if (!pv.ok) { msg('発注できない：入力を直そう。'); return; } var en = PE().enter(play, cur(), p.capital, play.claims, P); if (!en.ok) { msg('発注できない：' + en.preview.errors.join('／')); return; }
            t.disabled = true; view.pick = null; view.line = null; show('pd-E', false); show('pd-F', true); holdInfo(); view.tf = play.entryTF; refresh(); msg(advanced ? '発注した。足を進めながら、計画に沿って管理しよう（操作は足が確定した後）。' : '発注した。足を進めて、決済まで見届けよう。'); return; }
          if (c === 'hstep') { hstep(); return; }
          if (c === 'hplay') { if (timer) return; timer = setInterval(function () { if (play.phase !== 'holding') { stopPlay(); return; } hstep(); }, State.data.settings.textSpeed === 'instant' ? 40 : (advanced ? 420 : 160)); return; }
          if (c === 'm-be') { stopPlay(); manage({ type: 'be' }); return; }
          if (c === 'm-p25' || c === 'm-p50' || c === 'm-p75') { stopPlay(); manage({ type: 'partialClose', fraction: +c.slice(3) / 100 }); return; }
          if (c === 'm-close') { stopPlay(); var why = $('#pd-cwhy').value; if (!why) { var mm = $('#pd-mmsg'); if (mm) mm.textContent = '早めに決済する理由を選ぼう（振り返りで、その時点のチャートの事実と比べる）。'; return; } manage({ type: 'fullClose', why: why }); return; }
        });
        var trs = $('#pd-trail'); if (trs) trs.addEventListener('change', function () { if (!trs.value || done) return; stopPlay(); var a = trs.value.split(':'); manage({ type: 'trail', mode: a[0], value: +a[1] }); trs.value = ''; });
        var stm = $('#pd-stepmin'); if (stm) stm.addEventListener('change', function () { if (done) return; if (!PE().setStep(play, +stm.value)) { stm.value = String(play.stepMin); return; } render(); });
        canvas.addEventListener('click', function (e) { e.stopPropagation(); });
        if (root.ChartCtl) ctl = root.ChartCtl.attach(canvas, { st: view, defVisible: 72, min: 20, max: 200, count: function () { return view.count || 1; }, render: render, onCross: crossText, onTap: onTap, pick: function () { return !!view.pick; }, lineAt: lineAt, onLine: onLine });
        PUI.current.ctl = { step: step, finish: finish, openCheck: openCheck, openOrder: openOrder, setTf: setTf, recalc: recalc, hstep: hstep, manage: manage, onTap: onTap, onLine: onLine, chart: ctl, node: node };
        play.viewed[play.entryTF] = true; refresh(); requestAnimationFrame(render);
        // v9.1 画面の大きさが変わったら描き直す（root.onresize を上書きしない。閉じるときに外す）
        var onRz = function () { if (!done && document.getElementById('pd-chart')) render(); }; root.addEventListener('resize', onRz); PUI._cleanup = function () { root.removeEventListener('resize', onRz); stopPlay(); if (ctl) ctl.detach(); }; PUI.listeners = (PUI.listeners || 0) + 1;
      } }).then(function (res) {
        stopPlay(); if (PUI._cleanup) { PUI._cleanup(); PUI._cleanup = null; PUI.listeners = Math.max(0, (PUI.listeners || 1) - 1); } if (stageEl) stageEl.classList.remove('trade-open'); if (document.body) document.body.classList.remove('pd-chart-open');
        if (PUI.current) PUI.current.ctl = null;   // v9.1 閉じた画面（DOM）への参照を残さない（前は最後の画面が PUI.current.ctl.node からたどれて、メモリに残っていた）
        if (!res) { resolve(null); return; }
        (opts.exam && PUI.examAfter ? PUI.examAfter(res.record) : PUI.review(res)).then(function (next) { resolve({ record: res.record, grade: res.grade, next: next }); });
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
    if (r) resHtml = '<div class="outcome ' + (r.riskR >= 0 ? 'win' : 'lose') + '"><b>結果（判断の点とは別）：' + ({ tp: '利確', sl: '損切り', time: '時間切れの決済', end: '足の終わりで決済', early: '早めの決済', partial: '部分決済' })[r.reason] + '</b>　' + sgn(r.netPips) + 'pips（中値の値動き ' + sgn(r.grossPips) + 'pips − スプレッド・滑り ' + fmt(r.costPips, 1) + 'pips）　' + sgn(r.riskR, 2) + 'R　仮想損益 ' + (r.pnl >= 0 ? '+' : '') + yen(r.pnl) + (play.settle && play.settle.commissionYen ? '（手数料 ' + yen(play.settle.commissionYen) + ' 込み）' : '') +
      '<br><span class="small">MAE（最大逆行）' + sgn(r.maePips) + 'pips・MFE（最大順行）' + sgn(r.mfePips) + 'pips・保有 ' + r.bars + '本' + '' + '</span>' + (r.ambiguous ? '<br><span class="muted small">※同じ足で損切りと利確の両方に届いた（ローソク足だけでは先後が分からない）。損切りが先と仮定した（事実として損切りが先だったとは言えない）。もし利確が先なら ' + (play.settle && play.settle.ifTpFirst ? sgn(play.settle.ifTpFirst.riskR, 2) + 'R' : '―') + '</span>' : '') + (play.settle && play.settle.gapSlippagePips ? '<br><span class="small bad">窓で損切りを ' + fmt(play.settle.gapSlippagePips, 1) + 'pips 越えて約定（推定損失より大きい損失）</span>' : '') + '<div class="muted small">' + esc(r.note) + '</div></div>';
    else resHtml = '<div class="outcome"><b>取引なし（' + (gr.kind === 'skip' ? '自分で見送った' : '時間切れ（決めないまま）') + '）</b>　その後の値動きはチャートで確認できる</div>';
    var mets = (play.metAt || []).slice(0, 6).map(function (m) { return m.label; }).join('・');
    var hy = play.hypothesis; var WHY = { rci: 'RCI の反転を待つ', div: 'ダイバージェンスの確定を待つ', pullback: '押し目・戻り目を待つ', htf: '上位足の向きがそろうのを待つ', none: '根拠がそろわなければ見送る' };
    var hyHtml = hy ? '<div class="small">あなたの仮説（開始の時点で登録）：' + ({ buy: '買い目線', sell: '売り目線', neutral: '中立' })[hy.bias] + (hy.why ? '・' + WHY[hy.why] : '') + '　→　' + (gr.kind === 'trade' ? (play.entry.side === 'buy' ? 'ロング' : 'ショート') + '（' + (play.events.filter(function (e) { return e.kind === 'enter'; })[0] ? '開始から ' + play.steps + '本目' : '') + '）' : gr.kind === 'skip' ? '見送り（' + play.steps + '本目）' : '時間切れ') + (play.waits ? '・「待つ」' + play.waits + '回' : '') + '</div>' : '';
    var tfHtml = '<div class="small">エントリー足：' + esc(tfJa(play.entryTF)) + (play.suggestedTF && play.suggestedTF !== play.entryTF ? '（この問題の型は ' + esc(tfJa(play.suggestedTF)) + ' の形で分けている。あなたは ' + esc(tfJa(play.entryTF)) + ' を選んだので、型の説明と見え方が違うことがある）' : '') + '・進める時間 ' + (play.stepMin || PE().tfMin(play.entryTF)) + '分' + (play.tfLog && play.tfLog.length ? '・足の選び直し ' + play.tfLog.length + '回' : '') + '</div>';
    var pk = play.picks ? ['high', 'low'].filter(function (k) { return play.picks[k]; }).map(function (k) { var x = play.picks[k]; return (k === 'high' ? '高値' : '安値') + ' ' + fmt(x.price) + (x.ok ? '（正しい）' : '（直近の確定した' + (k === 'high' ? '高値' : '安値') + 'は ' + fmt(x.truth) + '）'); }).join('・') : '';
    var advHtml = ''; if (play.pos && play.settle && play.settle.advanced) { var S2 = play.settle; var KN = { partialClose: '部分決済', fullClose: '早めの決済', stopFill: '損切り', targetFill: '利確', timeExit: '時間切れの決済' };
      advHtml = '<div class="an-title">上級のポジション管理の記録</div><table class="tbl small"><tr><th>出来事</th><th>経過</th><th>ロット</th><th>約定</th><th>pips</th></tr>' + S2.fills.map(function (f) { return '<tr><td>' + esc(KN[f.kind] || f.kind) + (f.gap ? '（窓）' : '') + (f.ambiguous ? '（先後不明）' : '') + '</td><td>' + (f.index - S2.entryIndex) * 5 + '分</td><td>' + f.lots.toFixed(2) + '</td><td>' + fmt(f.fill) + '</td><td>' + sgn(f.pips) + '</td></tr>'; }).join('') + '</table>' +
        '<div class="small">損切りの変更：' + (S2.events.filter(function (e) { return e.kind === 'modifySL' || (e.kind === 'trail' && e.from !== e.to); }).map(function (e) { return (e.be ? '建値 ' : e.kind === 'trail' ? 'トレーリング ' : '') + fmt(e.from) + '→' + fmt(e.to) + '（' + (e.index - S2.entryIndex) * 5 + '分）'; }).join('・') || 'なし') + '。最大逆行 ' + sgn(S2.maeR, 2) + 'R・最大順行 ' + sgn(S2.mfeR, 2) + 'R・保有中の最悪（実現＋含み損の見積もり）' + yen(S2.worstOpenYen) + '</div>' +
        '<div class="muted small">R は実現した損益の合計 ÷ 当初の口座リスク（部分決済の後も分母は当初のまま）。建値で止まっても、決済の滑りの分だけ損益はゼロにならない。</div>'; }
    var html = '<div class="rw-title">振り返り：判断の過程 ' + gr.process + '点</div>' +
      '<div class="pd-rv"><table class="tbl">' + catRows + '</table><div class="small">' + esc(cat ? '問題の型：' + cat.title : '') + '（' + (play.set === 'exam' ? '未知の問題' : '学習用の問題') + '）<br><b>学ぶこと</b>：' + esc(cat ? cat.lesson : '') + '</div></div>' +
      hyHtml + tfHtml + (pk ? '<div class="small">チャートでの高値・安値の指定（参考・点には入れない）：' + pk + '</div>' : '') + resHtml + advHtml + '<canvas class="chart rv-chart" id="pd-rv-chart"></canvas><div class="muted small">チャート：判断を始めた足から先（色の付いた部分）が、判断のときには見えていなかった値動き。' + (mets ? 'この設定で条件がそろった足：' + esc(mets) : 'この設定で条件がそろった足は、見ていた間にはなかった') + '</div>' +
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
    var SEG = [['すべて', function () { return true; }], ['学習用の問題', function (x) { return x.set !== 'exam' && x.set !== 'exam_review'; }], ['未知の問題（Lv8）', function (x) { return x.set === 'exam'; }], ['試験の復習（認定に使わない）', function (x) { return x.set === 'exam_review'; }], ['上位足を見て判断', function (x) { return x.viewedHtf; }], ['上位足を見ずに判断', function (x) { return !x.viewedHtf; }],
      ['もちぽよ（仮設定）', function (x) { return x.profile === 'mochipoyo'; }], ['一般FX学習', function (x) { return x.profile === 'general'; }], ['上級の管理を使った', function (x) { return !!x.advanced; }], ['v9.1 の決済（5分足）の記録', function (x) { return x.engineVersion >= 3; }], ['前の版の記録（決済の決まりが違う）', function (x) { return !x.engineVersion || x.engineVersion < 3; }]];
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
      var EDIT = [['requireRci', [true, false]], ['requireDiv', [false, true]], ['minEvidence', [2, 3, 1]], ['htfMode', ['all_known', 'h4_priority', 'both_required']], ['htfAgainst', ['block', 'warn']], ['htfConflict', ['block', 'warn']], ['maxRiskPercent', [2, 1, 3]], ['slBufferPips', [3, 5, 2]], ['chaseAtr', [2.2, 2.5, 1.8]]];
      var VL = { block: '入らない', warn: '注意だけ', all_known: '判定できる上位足がすべて同じ向き', h4_priority: '4時間足を優先（判定できなければ日足）', both_required: '日足・4時間足の両方が同じ向き（厳しめ）' };
      var items = [{ label: '戦略プロファイル', right: P.name, sub: P.note }, { label: 'ヒント（根拠の数値を見るボタン・損切りの手伝い）', right: p.hints ? 'あり（初心者）' : 'なし（経験者）' }, { label: '上級のポジション管理', right: p.advanced ? 'ON' : 'OFF（基本のルール）', sub: 'ON：保有中に 早めの決済・建値・部分決済・トレーリングが使える（基本のルールは当初の損切り・利確のまま）' }].concat(EDIT.map(function (e) { var pr = P.params[e[0]]; var cv = vals[e[0]]; return { label: (pr.provisional ? '※ ' : '') + pr.label, right: typeof cv === 'boolean' ? (cv ? 'する' : 'しない') : String(VL[cv] || cv), sub: pr.provisional ? '推奨仮設定（変更可能）' : '共有された基準' }; }))
        .concat([{ label: '仮設定を初期値に戻す' }, { label: '設定の一覧（確定と仮設定）' }]);
      var i = await Win.list(items, { title: '実践トレード道場の設定', cancel: true }); if (i < 0) return;
      if (i === 0) { p.profile = p.profile === 'mochipoyo' ? 'general' : 'mochipoyo'; p.overrides = {}; }
      else if (i === 1) p.hints = !p.hints;
      else if (i === 2) p.advanced = !p.advanced;
      else if (i >= 3 && i < 3 + EDIT.length) { var e = EDIT[i - 3]; var cv = vals[e[0]]; var k = e[1].indexOf(cv); var nv = e[1][(k + 1) % e[1].length]; p.overrides[e[0]] = nv; }
      else if (i === 3 + EDIT.length) p.overrides = {};
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
      'チャート：ドラッグで過去へ・ピンチ／ホイールで拡大縮小・長押し（マウスは動かすだけ）で十字線（その足の OHLC と指標）。損切り・利確の線はドラッグでも動かせる。エントリー足は 5分足・15分足から選べる（同じ時刻のまま）。決済は 5分足で判定する。',
      'v9.1 の演習：上級ポジション管理（建値・部分決済・トレーリング・早めの決済。発注の前の計画と比べて採点）／同じ相場・3判断比較／思い込みを見抜く／資金管理・連敗耐性試験／初見チャートの認定試験（v2）。どれも任意で、ゲームのお金・報酬は使わない。',
      '損切りは「その価格で必ず止まる」約束ではない（窓や急変では、損切りを越えて約定することがある）。',
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
