/* =========================================================
   UI / Tradia（v6.4 Phase D）：相場都市トレディアの画面
   ・トレーダーとの会話 → トレードバトル（既存の「チャートの試練」TradeUI.trial を使い、終わったら NPC と比べる）
   ・トレーダーの記録（闘技場の掲示板・投資家ギルド）
   ・証券市場の大きな板（学習用の値動きを見るだけ）
   ・レバレッジ取引ゲーム（js/rpg/leverage.js）：相場の種類とシード → 注文（売買・レバレッジ・想定元本・指値・損切り・利確）→ 1本ずつ進める
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win, State = root.State, Engine = root.Engine;
  var esc = Win.esc;
  var TradiaUI = {};
  function D() { var d = State.data; d.tradia = d.tradia || {}; ['wins', 'losses', 'draws', 'best'].forEach(function (k) { d.tradia[k] = d.tradia[k] || {}; }); d.tradia.titles = d.tradia.titles || []; return d.tradia; }
  function T(id) { return root.TRADERS[id]; }
  function stars(n) { return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  var PLACE = { tradia_arena: 'トレード闘技場', tradia_exchange: '証券市場', tradia_lab: '相場研究所', tradia_tavern: '酒場「損切り亭」', tradia_alley: '裏通り', tradia_guild: '投資家ギルド', tradia_mansion: '富豪の屋敷' };

  /* ---------- 勝った人数・挑戦の条件・称号 ---------- */
  TradiaUI.beaten = function () { var w = D().wins; return root.TRADER_IDS.filter(function (id) { return (w[id] || 0) > 0; }); };
  TradiaUI.unlocked = function (id) { var t = T(id); var n = TradiaUI.beaten().length; if (t.need && n < t.need) return false; if (t.needWin && !(D().wins[t.needWin] > 0)) return false; return true; };
  TradiaUI.lockText = function (id) { var t = T(id); var n = TradiaUI.beaten().length; var parts = []; if (t.need && n < t.need) parts.push('トレーダーに' + t.need + '人勝つ（いま' + n + '人）'); if (t.needWin && !(D().wins[t.needWin] > 0)) parts.push(T(t.needWin).name + 'に勝つ'); return parts.join('・'); };
  TradiaUI.rank = function () { var n = TradiaUI.beaten().length; return n >= 12 ? 'S' : n >= 9 ? 'A' : n >= 6 ? 'B' : n >= 3 ? 'C' : n >= 1 ? 'D' : 'E'; };

  /* ---------- トレーダーと話す ---------- */
  TradiaUI.talkTrader = async function (id, c) {
    var t = T(id); var R = D(); var beaten = (R.wins[id] || 0) > 0;
    if (!TradiaUI.unlocked(id)) { await c.say(t.name, t.lines.slice(0, 1).concat(['……今はまだ、あなたと勝負するときではない。', '（挑戦の条件：' + TradiaUI.lockText(id) + '）'])); return; }
    var seenKey = 'tradia_met_' + id; if (!c.flag(seenKey)) { c.setFlag(seenKey, true); await c.say(t.name, t.lines); }
    while (true) {
      var k = await c.choice(t.name + '（' + stars(t.tier) + '）' + (beaten ? '　勝ち ' + R.wins[id] + '回' : ''), [beaten ? 'もう一度勝負する（練習）' : 'トレードバトルを申し込む', '戦略と経歴を聞く', 'やめる']);
      if (k === 1) { await c.say(t.name, [t.bio, t.past, '戦略：' + t.strategy + '。', '勝負に使う場面：' + t.pool.map(function (sid) { var df = root.Scenarios.get(sid); return df ? df.title : sid; }).join('・')]); continue; }
      if (k !== 0) return;
      await TradiaUI.battle(id); return;
    }
  };

  /* ---------- トレードバトル ---------- */
  // 場面（シナリオ）とシードを決め、NPC の判断を「先に」作ってからプレイヤーの試練を開く（NPC は判断の時点までの足しか見ない）
  TradiaUI.prepare = function (id, rnd) {
    rnd = rnd || Math.random; var t = T(id); var sid = t.pool[Math.floor(rnd() * t.pool.length)]; var seedOffset = Math.floor(rnd() * 6);
    var scn = root.Scenarios.build(sid, seedOffset); var npc = root.TradeBattle.decide(id, scn);
    return { trader: id, scenarioId: sid, seedOffset: seedOffset, scn: scn, npcDecision: npc };
  };
  TradiaUI.battle = async function (id, prepared) {
    var t = T(id); var P = prepared || TradiaUI.prepare(id);
    await Win.message([t.name + '「同じ場面を見て勝負だ。わたしはもう判断を決めた。中身は勝負のあとで見せよう」', '（判断の質・結果・規律の合計で比べます。資金の2%を超えるリスクや損切りなしは、40点までになります）'], { name: t.name });
    var res = await root.TradeUI.trial([P.scenarioId], { scenarioId: P.scenarioId, seedOffset: P.seedOffset, title: t.name + 'とのトレードバトル' });
    if (!res || !res.ev) { await Win.message(['勝負を取りやめた。（記録には残らない）']); return null; }
    var TB = root.TradeBattle; var scn = P.scn;
    var pj = { ev: res.ev, sim: res.ev.trade ? root.TradeEval.simulate(scn, res.ev.trade, 96) : null }; pj.sc = TB.score(pj.ev, pj.sim);
    var nj = TB.judge(scn, P.npcDecision);
    var verdict = TB.verdict(pj, nj); var out = TradiaUI.record(id, verdict, pj, nj, P);
    await TradiaUI.showResult(id, pj, nj, verdict, out, P);
    if (out.rewardLines.length) await Win.message(out.rewardLines);
    if (root.Events && root.Events.checkCounterQuests) await root.Events.checkCounterQuests();
    if (root.World && root.World.updateHud) root.World.updateHud(); State.autosave();
    return { verdict: verdict, player: pj, npc: nj, first: out.first };
  };
  // 勝敗の記録と報酬（初めて勝ったときだけ、経験値・ゴールド・限定装備・称号。2回目以降は経験値とゴールドを1割）
  TradiaUI.record = function (id, verdict, pj, nj, P) {
    var R = D(); var t = T(id); var d = State.data; var lines = []; var first = false;
    R.best[id] = Math.max(R.best[id] || 0, pj.sc.total);
    if (verdict === 'win') {
      first = !(R.wins[id] > 0); R.wins[id] = (R.wins[id] || 0) + 1;
      var rw = t.reward; var k = first ? 1 : 0.1; var exp = Math.round(rw.exp * k), gold = Math.round(rw.gold * k);
      var ups = []; State.partyActors().forEach(function (a) { if (a.dead) return; var u = root.Actors.gainExp(a, exp); if (u.length) ups.push(a.name + 'はレベル' + a.level + 'になった！'); });
      d.gold += gold; lines.push('経験値 ' + exp + '（戦闘に出ている全員）と ' + gold + 'G を手に入れた。'); lines = lines.concat(ups);
      if (first) { State.addItem(rw.item, 1); lines.push(root.ITEMS[rw.item].name + 'を手に入れた！（限定装備）'); if (R.titles.indexOf(rw.title) < 0) R.titles.push(rw.title); lines.push('称号「' + rw.title + '」を得た。'); d.counters.tradia_wins = TradiaUI.beaten().length; lines.push('トレディアの闘技場ランク：' + TradiaUI.rank() + '（勝った相手 ' + TradiaUI.beaten().length + '/12人）'); }
    } else if (verdict === 'lose') R.losses[id] = (R.losses[id] || 0) + 1; else R.draws[id] = (R.draws[id] || 0) + 1;
    R.log = (R.log || []).concat([{ trader: id, scenario: P.scenarioId, seedOffset: P.seedOffset, verdict: verdict, p: pj.sc.total, n: nj.sc.total, at: Date.now() }]).slice(-50);
    return { first: first, rewardLines: lines };
  };
  TradiaUI.showResult = function (id, pj, nj, verdict, out, P) {
    var t = T(id); var TB = root.TradeBattle; var pr = TB.rows(pj), nr = TB.rows(nj);
    var act = function (j) { var a = j.ev.trade ? j.ev.trade.action : 'skip'; return ({ buy: '買い', sell: '売り', skip: '見送り' })[a]; };
    var rows = TB.ITEMS.map(function (name, i) { return '<tr><td>' + esc(name) + '</td><td>' + esc(pr[i]) + '</td><td>' + esc(nr[i]) + '</td></tr>'; }).join('');
    var sum = function (j) { return '判断 ' + j.sc.judgment + '／60・結果 ' + j.sc.outcome + '／25・規律 ' + j.sc.discipline + '／15' + (j.sc.capped ? '<br><b class="bad">過剰なリスク：40点まで</b>' : ''); };
    var head = verdict === 'win' ? '勝ち！' : verdict === 'lose' ? '負け……' : '引き分け';
    var npcWhy = (nj.ev.violations.length ? '違反：' + nj.ev.violations.join('・') + '。' : '') + 'NPC の判断：' + act(nj) + '（理由：' + root.TradeEval.reasonLabel(P.npcDecision.reason) + '）。' + (P.npcDecision.note || '');
    var html = '<div class="rw-title">' + esc(t.name) + 'とのトレードバトル：' + head + '</div>' +
      '<div class="muted small">場面：' + esc(P.scn.def.title) + '（シナリオ ' + esc(P.scenarioId) + '・データ ' + P.seedOffset + '）。NPC はこの場面の判断の時点までの足だけを見て決めています。</div>' +
      '<table class="tbl tb-table"><tr><th>評価項目</th><th>あなた（' + act(pj) + '）</th><th>' + esc(t.name) + '（' + act(nj) + '）</th></tr>' + rows +
      '<tr class="tb-sum"><td>合計</td><td><b>' + pj.sc.total + '点</b><div class="muted small">' + sum(pj) + '</div></td><td><b>' + nj.sc.total + '点</b><div class="muted small">' + sum(nj) + '</div></td></tr></table>' +
      '<div class="small">' + esc(npcWhy) + '</div>' +
      '<div class="small tb-voice">' + esc(t.name) + '「' + esc((verdict === 'win' ? t.win : t.lose).join('')) + '」</div>' +
      '<div class="muted small">損益は「リスク何回分か（R）」で比べます。正解の方向でも、資金の2%を超えるリスクや損切りなしの取引は高く評価しません。</div>';
    return Win.panel(html, { cls: 'tb-result' });
  };

  /* ---------- トレーダーの記録 ---------- */
  TradiaUI.roster = function () {
    var R = D(); var rows = root.TRADER_IDS.map(function (id) { var t = T(id); var w = R.wins[id] || 0, l = R.losses[id] || 0, dr = R.draws[id] || 0; var st = w ? '勝ち' + w + (l ? '・負け' + l : '') : (l || dr) ? '負け' + l + (dr ? '・引分' + dr : '') : '未対戦';
      return '<tr><td>' + esc(t.name) + '</td><td>' + stars(t.tier) + '</td><td>' + esc(PLACE[t.where] || '') + '</td><td>' + (TradiaUI.unlocked(id) ? esc(st) + (R.best[id] ? '（最高' + R.best[id] + '点）' : '') : '<span class="muted">条件：' + esc(TradiaUI.lockText(id)) + '</span>') + '</td></tr>'; }).join('');
    return Win.panel('<div class="rw-title">トレディアのトレーダー（闘技場ランク ' + TradiaUI.rank() + '・勝った相手 ' + TradiaUI.beaten().length + '/12人）</div><table class="tbl"><tr><th>トレーダー</th><th>強さ</th><th>いる場所</th><th>記録</th></tr>' + rows + '</table>' +
      '<div class="small">称号：' + (R.titles.length ? R.titles.map(esc).join('・') : '<span class="muted">まだない</span>') + '</div><div class="muted small">初めて勝つと、経験値・ゴールド・限定装備・称号。2回目からは練習（経験値とゴールドが1割）。</div>', { cls: 'tb-roster' });
  };

  /* ---------- 証券市場の板（学習用の値動きを見るだけ） ---------- */
  TradiaUI.boardMarket = function () { var d = State.data; var day = Math.floor((d.steps || 0) / 400); var types = root.Leverage.TYPES.map(function (x) { return x.id; }).filter(function (x) { return x !== 'gap'; }); var type = types[day % types.length]; return root.Leverage.market(type, 20260000 + day); };
  TradiaUI.board = function () {
    var mk = TradiaUI.boardMarket(); var bars = mk.bars.slice(0, mk.start + 1);
    var html = '<div class="rw-title">証券市場の大きな板（学習用の値動き・15分足）</div><canvas class="chart lev-chart" id="tb-board"></canvas><div class="muted small">研究所が作った学習用の人工データです（' + esc(root.Leverage.typeName(mk.type)) + 'の型・シード ' + mk.seed + '）。実在の相場ではありません。売り買いは東のレバレッジ取引所で。</div>';
    return Win.panel(html, { cls: 'lev-board', setup: function (node) { var cv = node.querySelector('#tb-board'); var draw = function () { root.Chart.render(cv, root.Chart.buildView(bars, null), { visibleBars: 90, tfLabel: '15分足', showZigzag: true }); }; requestAnimationFrame(draw); } });
  };

  /* ---------- レバレッジ取引ゲーム ---------- */
  var LV = function () { return root.Leverage; };
  function tg(v) { return (v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString() + 'TG'; }
  function sg(v) { return (v >= 0 ? '+' : '−') + Math.abs(Math.round(v)).toLocaleString() + 'TG'; }
  TradiaUI.leverageRules = function () {
    var R = LV().RULES;
    return Win.panel('<div class="rw-title">レバレッジ取引所の決まり（このゲームの架空のルール）</div><ul class="plain small">' +
      ['資金はゲーム専用の仮想資金「トレディアG（TG）」。最初に ' + R.start.toLocaleString() + 'TG。ゴールド・現実のお金・暗号資産・ポイントとは交換できない',
        '値動きは研究所の学習用データ（実在の相場ではない）。相場の種類とシードが同じなら、何度でも同じ値動き。記録にはシナリオID（LV-種類-シード）を残す',
        'レバレッジは1〜' + R.maxLeverage + '倍（1・5・10・25・50・100・200・400・500・888倍、または自由入力）',
        '必要証拠金＝建玉の想定元本÷レバレッジ。買いの損益＝想定元本×（決済価格−約定価格）÷約定価格、売りは逆',
        'スプレッド ' + R.spreadPips + 'pips（買いは高く、売りは安く約定）・手数料 想定元本の' + (R.commissionRate * 100).toFixed(3) + '%（新規と決済のそれぞれ）・すべり 成行と損切り・ロスカットで0〜' + R.slippageMaxPips + 'pips・保有コスト 15分足1本ごとに想定元本の' + (R.financingRate * 100).toFixed(4) + '%',
        '有効証拠金＝残高＋含み損益−コスト。使用証拠金＝必要証拠金。余剰証拠金＝有効証拠金−使用証拠金。証拠金維持率＝有効証拠金÷使用証拠金',
        '証拠金維持率が ' + R.losscutLevel + '% 以下になると強制ロスカット（この取引所だけの決まり。実在の証券会社の共通ルールではない）',
        '重要イベントなどで価格が飛ぶと、損切りやロスカットの価格ではなく、飛んだ先の価格で決済される（想定より損が大きくなる）',
        '残高はマイナスにならない（負債は作らない）。残高が0になったら破産：取引を終える。破産するか残高が最初の10%未満になったら、学習用の資金を受け取り直せる（回数は記録に残る）',
        '高いレバレッジに得点・ボーナス・報酬はない。見るのは損切りと、1回の損失の大きさ'].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', { cls: 'lev-rules' });
  };
  TradiaUI.statsHtml = function (list, title) {
    var L = LV(); var s = L.stats(list); var F = L.fmtStat;
    var rows = [['取引の回数', s.trades + '回（勝ち' + s.wins + '・負け' + s.losses + '）'], ['損益', F(s.pnl, 'tg')], ['損益率（最初の資金に対して）', F(s.pnlPct, 'pct')], ['最大含み損', s.maxAdverse === null ? '算出不可' : tg(s.maxAdverse)], ['最大ドローダウン', F(s.maxDD, 'dd')],
      ['勝率', F(s.winRate, 'pct')], ['平均利益', s.avgWin === null ? '算出不可' : sg(s.avgWin)], ['平均損失', s.avgLoss === null ? '算出不可' : '−' + Math.round(s.avgLoss).toLocaleString() + 'TG'], ['リスクリワード（平均利益÷平均損失）', F(s.rr, 'ratio')], ['期待値（1回あたり）', F(s.expectancy, 'tg')], ['プロフィットファクター', F(s.pf, 'ratio')],
      ['強制ロスカット', s.losscuts + '回'], ['価格が飛んだ決済', s.gaps + '回'], ['破産', s.bankrupt + '回']];
    return '<h3>' + esc(title) + '</h3><table class="tbl lev-stats">' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>'; }).join('') + '</table><div class="muted small">勝率・リスクリワード・期待値・プロフィットファクターは、取引が' + L.MIN_TRADES + '回未満のうちは「算出不可」（少ない回数の数字は大きくぶれるため）。</div>';
  };
  TradiaUI.leverageRecord = function () {
    var a = LV().account(); var cur = a.history.filter(function (t) { return t.epoch === a.epoch; });
    var last = a.history.slice(-10).reverse().map(function (t) { return '<tr><td>' + t.n + '</td><td>' + esc(t.scenarioId) + '</td><td>' + (t.side === 'buy' ? '買い' : '売り') + ' ' + t.leverage + '倍</td><td>' + esc(({ tp: '利確', sl: '損切り', sl_gap: '損切り（飛び）', losscut: 'ロスカット', losscut_gap: 'ロスカット（飛び）', manual: '手動', time: '時間切れ' })[t.reason] || t.reason) + '</td><td>' + sg(t.pnl) + '</td><td>' + tg(t.balanceAfter) + '</td></tr>'; }).join('');
    return Win.panel('<div class="rw-title">レバレッジ取引の記録（口座 ' + a.epoch + '：残高 ' + tg(a.balance) + '）</div>' + TradiaUI.statsHtml(cur, 'いまの口座') + TradiaUI.statsHtml(a.history, '通算（保存している最近の' + a.history.length + '回）') +
      '<h3>最近の取引</h3><table class="tbl small"><tr><th>#</th><th>シナリオID</th><th>売買</th><th>決済</th><th>損益</th><th>残高</th></tr>' + (last || '<tr><td colspan="6" class="muted">まだない</td></tr>') + '</table>', { cls: 'lev-record' });
  };

  // 取引の画面。戻り値：セッション（テスト用）
  TradiaUI.leverage = async function (opts) {
    opts = opts || {}; var L = LV(); var a = L.account();
    if (L.canRegrant() || a.balance <= 0) {
      var g = await Win.choice('残高が ' + tg(a.balance) + '。学習用の資金 ' + L.RULES.start.toLocaleString() + 'TG を受け取り直す？（受け取った回数と破産の回数は記録に残る）', ['受け取る', 'やめる']);
      if (g !== 0) return null; L.regrant();
    }
    var types = L.TYPES; var ti = await Win.list(types.map(function (x) { return { label: x.name, sub: x.desc }; }).concat([{ label: 'ランダム（種類も伏せる）', sub: '相場の種類は取引のあとで表示' }]), { title: '相場を選ぶ（残高 ' + tg(a.balance) + '）' });
    if (ti < 0) return null;
    var hidden = ti === types.length; var type = hidden ? types[Math.floor(Math.random() * types.length)].id : types[ti].id;
    var seed = opts.seed || (1 + Math.floor(Math.random() * 999999));
    if (!opts.seed) { var sc = await Win.choice('シード（同じ番号なら同じ値動き）：' + seed, ['このシードで始める', '番号を入力する', 'やめる']); if (sc === 2 || sc < 0) return null; if (sc === 1) { var inp = await Win.prompt('シード（1〜999999）', String(seed), 6); var v = parseInt(inp, 10); if (v >= 1 && v <= 999999) seed = v; } }
    var s = L.newSession(type, seed); s.hiddenType = hidden;
    await TradiaUI.levScreen(s);
    return s;
  };
  TradiaUI.levScreen = function (s) {
    var L = LV(), R = L.RULES; var autoT = null; var node = null, done = null, side = 'buy', endedShown = false;
    var lv0 = R.leverages.map(function (v) { return '<option value="' + v + '"' + (v === 10 ? ' selected' : '') + '>' + v + '倍</option>'; }).join('');
    var html = '<div class="lev-head"><b>レバレッジ取引</b> <span class="muted small" id="lv-sid"></span></div>' +
      '<div class="lev-acct" id="lv-acct"></div><canvas class="chart lev-chart" id="lv-chart"></canvas>' +
      '<div class="lev-cols"><div class="lev-order" id="lv-order">' +
        '<div class="lev-row"><label>売買</label><span class="lev-side"><button data-side="buy" class="on">買い</button><button data-side="sell">売り</button></span></div>' +
        '<div class="lev-row"><label>レバレッジ</label><select id="lv-levsel">' + lv0 + '<option value="free">自由入力</option></select><input id="lv-lev" type="number" min="1" max="888" step="1" value="10" class="lev-num"><span class="muted small">倍（1〜888）</span></div>' +
        '<div class="lev-row"><label>想定元本</label><input id="lv-not" type="number" min="1000" step="1000" value="100000" class="lev-num wide"><span class="muted small">TG</span></div>' +
        '<div class="lev-row"><label>約定価格</label><input id="lv-entry" type="number" step="0.001" placeholder="空欄＝成行" class="lev-num wide"></div>' +
        '<div class="lev-row"><label>損切り</label><input id="lv-sl" type="number" step="0.001" class="lev-num wide"><button data-fill="sl">直近の安値／高値の外</button></div>' +
        '<div class="lev-row"><label>利確</label><input id="lv-tp" type="number" step="0.001" class="lev-num wide"><button data-fill="tp">損切り幅の2倍</button></div>' +
        '<div class="lev-preview" id="lv-pv"></div><div class="lev-btns"><button data-cmd="order" class="pri">注文する</button><button data-cmd="cancel">待機中の注文を取り消す</button></div>' +
      '</div><div class="lev-side-col"><div class="lev-btns"><button data-cmd="step">1本進める</button><button data-cmd="step5">5本進める</button><button data-cmd="auto">自動で進める</button><button data-cmd="close">いま決済する</button><button data-cmd="end">取引を終える</button></div><div class="lev-log" id="lv-log"></div></div></div>';
    return Win.panel(html, { cls: 'lev-panel', noClose: true, onCancel: function () { if (node) finish(); }, setup: function (n, fin) { node = n; done = fin; init(); } });
    function q(sel) { return node.querySelector(sel); }
    function order() { var lev = parseFloat(q('#lv-lev').value); return { side: side, leverage: lev, notional: parseFloat(q('#lv-not').value), entry: q('#lv-entry').value === '' ? null : parseFloat(q('#lv-entry').value), sl: q('#lv-sl').value === '' ? null : parseFloat(q('#lv-sl').value), tp: q('#lv-tp').value === '' ? null : parseFloat(q('#lv-tp').value) }; }
    function renderChart() {
      var cv = q('#lv-chart'); var bars = L.visibleBars(s); var an = root.Chart.buildView(bars, null); var p = s.pos || s.pending; var a = L.account();
      var o = { visibleBars: 80, tfLabel: '15分足', showZigzag: true, lines: [] };
      if (p) { o.entry = p.entry; o.sl = p.sl; o.tp = p.tp; }
      if (s.pos) o.lines.push({ v: L.losscutPrice(s.pos, a.balance), color: '#ff8a3a', label: 'ロスカット' });
      root.Chart.render(cv, an, o);
    }
    function renderAcct() {
      var st = L.status(s); var a = L.account(); var lvl = st.level === null ? '―' : Math.round(st.level) + '%';
      q('#lv-sid').textContent = 'シナリオID ' + s.scenarioId.replace(s.type, s.hiddenType && !s.ended ? '???' : s.type) + '　' + (s.hiddenType && !s.ended ? '相場の種類：伏せている' : L.typeName(s.type)) + '　残り ' + L.remaining(s) + '本';
      q('#lv-acct').innerHTML = '<span>残高 <b>' + tg(a.balance) + '</b></span><span>有効証拠金 <b>' + tg(st.equity) + '</b></span><span>使用証拠金 <b>' + tg(st.used) + '</b></span><span>余剰証拠金 <b>' + tg(st.free) + '</b></span><span>含み損益 <b class="' + (st.unrealized < 0 ? 'bad' : 'good') + '">' + sg(st.unrealized) + '</b></span><span>証拠金維持率 <b class="' + (st.level !== null && st.level <= R.warnLevel ? 'bad' : '') + '">' + lvl + '</b></span>' +
        (s.pos ? '<span class="lev-pos">' + (s.pos.side === 'buy' ? '買い' : '売り') + ' ' + s.pos.notional.toLocaleString() + 'TG・' + s.pos.leverage + '倍・約定 ' + s.pos.entry.toFixed(3) + '・ロスカット ' + L.losscutPrice(s.pos, a.balance).toFixed(3) + '</span>' : s.pending ? '<span class="lev-pos">待機中の注文：' + (s.pending.side === 'buy' ? '買い' : '売り') + ' ' + s.pending.entry.toFixed(3) + '</span>' : '<span class="muted">ポジションなし・現在値 ' + L.price(s).toFixed(3) + '</span>');
    }
    function renderPreview() {
      var pv = L.preview(s, order()); var el = q('#lv-pv'); if (s.pos || s.pending || s.ended) { el.innerHTML = '<span class="muted small">' + (s.ended ? '取引は終わった。' : 'ポジション（または待機中の注文）があるあいだは、新しい注文を出せない。') + '</span>'; return; }
      el.innerHTML = '<div>約定の見込み <b>' + pv.entry.toFixed(3) + '</b>（' + (pv.market ? '成行' : '指値・逆指値') + '）　必要証拠金 <b>' + tg(pv.margin) + '</b>　取引直後の維持率 <b>' + (pv.levelAtEntry === null ? '―' : Math.round(pv.levelAtEntry) + '%') + '</b></div>' +
        '<div>ロスカットの価格 <b>' + (pv.losscut === null ? '―' : pv.losscut.toFixed(3)) + '</b>（あと <b class="' + (pv.losscutPips !== null && pv.losscutPips < 30 ? 'bad' : '') + '">' + (pv.losscutPips === null ? '―' : pv.losscutPips.toFixed(1) + 'pips・' + pv.losscutPct.toFixed(3) + '%') + '</b> の逆行で強制決済）</div>' +
        '<div>損切りに当たったときの損失 <b>' + (pv.slLoss === null ? '損切りなし' : tg(pv.slLoss) + '（残高の' + pv.slPct.toFixed(2) + '%）') + '</b>　リスクリワード <b>' + (pv.rr === null ? '―' : '1:' + pv.rr.toFixed(2)) + '</b></div>' +
        (pv.errs.length ? '<div class="bad small">' + pv.errs.map(esc).join('／') + '</div>' : '') + (pv.warns.length ? '<ul class="lev-warn small">' + pv.warns.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '');
    }
    function renderLog() { q('#lv-log').innerHTML = s.log.slice(-8).reverse().map(function (l) { return '<div>' + esc(l.msg) + '</div>'; }).join('') || '<div class="muted small">「注文する」で取引を始め、「1本進める」で15分足を1本ずつ見る。将来の足は、進めるまで見えない。</div>'; }
    function renderAll() { renderAcct(); renderPreview(); renderLog(); renderChart(); node.querySelectorAll('[data-cmd="step"],[data-cmd="step5"],[data-cmd="auto"]').forEach(function (b) { b.disabled = s.ended; }); }
    async function afterTrade(ev) {
      if (!ev || !ev.trade) return; var t = ev.trade; stopAuto();
      if (t.sl !== null && t.riskPct !== null && t.riskPct <= 2) State.count('lev_disciplined');
      await Win.panel('<div class="rw-title">取引の振り返り：' + sg(t.pnl) + '</div><div class="small">' + esc(t.side === 'buy' ? '買い' : '売り') + ' ' + t.notional.toLocaleString() + 'TG・' + t.leverage + '倍・約定 ' + t.entry.toFixed(3) + ' → 決済 ' + t.exit.toFixed(3) + '（' + t.bars + '本）・最大含み損 ' + tg(t.mae) + '</div><ul class="small">' + L.reflect(t).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', { cls: 'lev-reflect' });
      if (root.Events && root.Events.checkCounterQuests) await root.Events.checkCounterQuests();
    }
    async function doStep(n) { for (var i = 0; i < n && !s.ended; i++) { var ev = L.step(s); renderAll(); if (ev.trade) { await afterTrade(ev); break; } if (ev.events.indexOf('gap') >= 0) s.log.push({ idx: s.idx, msg: '重要イベント：価格が大きく飛んだ！' }); } renderAll(); if (s.ended) await ended(); }
    function stopAuto() { if (autoT) { clearInterval(autoT); autoT = null; var b = q('[data-cmd="auto"]'); if (b) b.textContent = '自動で進める'; } }
    async function ended() {
      if (endedShown) return; endedShown = true; stopAuto(); var a = L.account(); var list = a.history.filter(function (t) { return t.scenarioId === s.scenarioId && t.epoch === a.epoch && t.n > (s.firstSeq || 0); });
      var why = s.endReason === 'bankrupt' ? '<b class="bad">破産：残高が0になった。</b>負債は作らない（このゲームの決まり）。取引所の係員に話しかけると、学習用の資金を受け取り直せる。' : s.endReason === 'nofunds' ? '残高が足りなくなった。' : '取引を終えた。';
      await Win.panel('<div class="rw-title">取引の結果（' + esc(L.typeName(s.type)) + '・シナリオID ' + esc(s.scenarioId) + '）</div><div class="small">' + why + '</div>' + TradiaUI.statsHtml(list, 'この相場での取引') + '<div class="muted small">記録はレバレッジ取引所の右の掲示板で見られる。</div>', { cls: 'lev-end' });
    }
    function finish() { if (s.pending) L.cancelPending(s); var wasPos = !!s.pos; L.endSession(s); stopAuto(); var p = wasPos && s.lastTrade ? afterTrade({ trade: s.lastTrade }) : Promise.resolve(); p.then(function () { return ended(); }).then(function () { State.autosave(); done(0); }); }
    function init() {
      s.firstSeq = L.account().seq;
      node.querySelectorAll('[data-side]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); side = b.getAttribute('data-side'); node.querySelectorAll('[data-side]').forEach(function (x) { x.classList.toggle('on', x === b); }); renderPreview(); }); });
      q('#lv-levsel').addEventListener('change', function () { var v = q('#lv-levsel').value; if (v !== 'free') q('#lv-lev').value = v; q('#lv-lev').focus && v === 'free' && q('#lv-lev').focus(); renderPreview(); });
      ['#lv-lev', '#lv-not', '#lv-entry', '#lv-sl', '#lv-tp'].forEach(function (id) { q(id).addEventListener('input', function () { if (id === '#lv-lev') { var v = parseFloat(q('#lv-lev').value); if (v > R.maxLeverage) q('#lv-lev').value = R.maxLeverage; q('#lv-levsel').value = R.leverages.indexOf(Math.round(v)) >= 0 ? String(Math.round(v)) : 'free'; } renderPreview(); }); });
      node.querySelectorAll('[data-fill]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); var an = root.Indicators.analyze(L.visibleBars(s), root.CONFIG); var ref = order().entry || L.price(s);
        var sl = side === 'buy' ? Math.min(an.lastLow, an.recentLow) - 0.03 : Math.max(an.lastHigh, an.recentHigh) + 0.03;
        if (b.getAttribute('data-fill') === 'sl') q('#lv-sl').value = sl.toFixed(3); else { var cur = q('#lv-sl').value === '' ? sl : parseFloat(q('#lv-sl').value); q('#lv-tp').value = (side === 'buy' ? ref + 2 * (ref - cur) : ref - 2 * (cur - ref)).toFixed(3); } renderPreview(); }); });
      node.addEventListener('click', async function (e) { var b = e.target.closest('button[data-cmd]'); if (!b) return; e.stopPropagation(); var c = b.getAttribute('data-cmd');
        if (c === 'order') { var r = L.place(s, order()); if (!r.ok) { Win.toast((r.errs || ['注文できない'])[0]); } else if (r.warns && r.warns.length) Win.toast('注意：' + r.warns[0]); renderAll(); }
        if (c === 'cancel') { L.cancelPending(s); renderAll(); }
        if (c === 'step') await doStep(1);
        if (c === 'step5') await doStep(5);
        if (c === 'auto') { if (autoT) stopAuto(); else { b.textContent = '止める'; autoT = setInterval(function () { if (s.ended) { stopAuto(); return; } doStep(1); }, State.data.settings.textSpeed === 'instant' ? 60 : 350); } }
        if (c === 'close') { var t = L.closeNow(s); renderAll(); if (t) await afterTrade({ trade: t }); if (s.ended) await ended(); }
        if (c === 'end') finish(); });
      renderAll(); root.onresize = function () { if (document.getElementById('lv-chart')) renderChart(); };
      TradiaUI._screen = { s: s, node: node, order: order, renderAll: renderAll, doStep: doStep, finish: finish };   // 自動テスト用
    }
  };

  root.TradiaUI = TradiaUI;
})(typeof window !== 'undefined' ? window : globalThis);
