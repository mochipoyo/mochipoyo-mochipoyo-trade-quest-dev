/* =========================================================
   RPG / LabSim (v6.1) : 確率研究室・投資戦略研究室のシミュレーション（計算だけ。画面は js/ui/labs.js）
   ・大数の法則：コイン投げ／サイコロ／ルーレットの赤／スロットの還元率を N 回くり返して相対頻度を記録
   ・ギャンブラーの誤謬：赤が k 回続いた直後に赤が出た割合を数える
   ・マーチンゲール法：負けたら倍賭けを多数のプレイヤーで試す
   ・増し玉の比較：同じ値動き（シナリオ）に、一括・ピラミッティング・増し玉しすぎ・ナンピン・ナンピン＋マーチンゲールを当てて損益を比べる
   ・すべてゲーム内の仮想のシミュレーション。現実の相場や将来の結果を保証しない
   ========================================================= */
(function (root) {
  'use strict';
  var LabSim = {};
  // 再現できる擬似乱数（mulberry32）
  LabSim.rng = function (seed) { var a = (seed === undefined ? Math.floor(Math.random() * 4294967296) : seed) >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---------- 大数の法則 ---------- */
  var RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  LabSim.LLN_EVENTS = {
    coin: { name: 'コイン投げで「表」', p: 0.5, unit: '表が出た割合', draw: function (r) { return r() < 0.5 ? 1 : 0; } },
    die: { name: 'サイコロで「1」', p: 1 / 6, unit: '1が出た割合', draw: function (r) { return Math.floor(r() * 6) === 0 ? 1 : 0; } },
    red: { name: 'ルーレットで「赤」', p: 18 / 37, unit: '赤が出た割合', draw: function (r) { return RED.indexOf(Math.floor(r() * 37)) >= 0 ? 1 : 0; } },
    slot: { name: 'スロットの払い戻し（1枚賭け）', p: null, unit: '払い戻しの平均（賭け1枚あたり）', draw: function (r) {
      var S = root.Casino.SLOT; var reels = [0, 1, 2].map(function () { return S.STRIP[Math.floor(r() * S.STRIP.length)]; });
      for (var i = 0; i < S.PAY.length; i++) if (S.PAY[i].test(reels)) return S.PAY[i].mult; return 0; } }
  };
  LabSim.lln = function (key, n, rng) {
    var ev = LabSim.LLN_EVENTS[key]; if (!ev) return null; rng = rng || LabSim.rng();
    var p = ev.p !== null ? ev.p : root.Casino.slotTable().rtp;
    var sum = 0, path = []; var step = Math.max(1, Math.floor(n / 200));
    for (var i = 1; i <= n; i++) { sum += ev.draw(rng); if (i % step === 0 || i === n || i <= 20) path.push([i, sum / i]); }
    var freq = sum / n;
    return { key: key, name: ev.name, unit: ev.unit, n: n, sum: sum, freq: freq, p: p, diff: freq - p, path: path };
  };

  /* ---------- ギャンブラーの誤謬：赤が k 回続いた直後 ---------- */
  LabSim.streak = function (k, spins, rng) {
    rng = rng || LabSim.rng(); var run = 0, cases = 0, nextRed = 0;
    for (var i = 0; i < spins; i++) {
      var n = Math.floor(rng() * 37); var red = RED.indexOf(n) >= 0;
      if (run >= k) { cases++; if (red) nextRed++; }
      run = red ? run + 1 : 0;
    }
    return { k: k, spins: spins, cases: cases, nextRed: nextRed, freq: cases ? nextRed / cases : 0, p: 18 / 37 };
  };

  /* ---------- マーチンゲール法（赤に賭け、負けたら倍、勝ったら1枚に戻す） ---------- */
  LabSim.martingale = function (opts, rng) {
    opts = opts || {}; rng = rng || LabSim.rng();
    var players = opts.players || 1000, bank0 = opts.bank || 100, base = opts.base || 1, limit = opts.limit || 100, goal = opts.goal || 20, rounds = opts.rounds || 300;
    var reached = 0, broke = 0, other = 0, totalFinal = 0, wagered = 0, worst = 0, hist = {};
    for (var p = 0; p < players; p++) {
      var bank = bank0, bet = base, r;
      for (r = 0; r < rounds; r++) {
        if (bank - bank0 >= goal) break;
        if (bet > bank || bet > limit) break;   // 倍にできない＝連敗の損失を取り戻せない
        wagered += bet; bank -= bet;
        if (RED.indexOf(Math.floor(rng() * 37)) >= 0) { bank += bet * 2; bet = base; } else bet *= 2;
      }
      var res = bank - bank0; totalFinal += res; if (res < worst) worst = res;
      if (res >= goal) reached++; else if (bet > bank || bet > limit) broke++; else other++;
      var b = res >= goal ? '目標（+' + goal + '枚）達成' : res >= 0 ? '目標未満の勝ち' : res > -50 ? '50枚未満の負け' : '50枚以上の負け'; hist[b] = (hist[b] || 0) + 1;
    }
    return { players: players, bank: bank0, goal: goal, limit: limit, reached: reached, broke: broke, other: other, avg: totalFinal / players, wagered: wagered, perBet: wagered ? totalFinal / wagered : 0, worst: worst, hist: hist, theory: 18 / 37 * 2 - 1 };
  };

  /* ---------- 増し玉の比較（仮想トレード） ---------- */
  // 値動きのシナリオ（再現できるよう、決まった種で作る）。60本の終値
  LabSim.SCENARIOS = {
    trend: { name: '上昇トレンドが続く', desc: '押し目をはさみながら上がり続ける。' },
    reversal: { name: '上昇のあと急反転', desc: '前半は順調に上がるが、後半に一気に下がる。増し玉の危険が出やすい。' },
    range: { name: 'レンジ（行ったり来たり）', desc: '上下をくり返し、方向が出ない。' },
    down: { name: '下落トレンド', desc: '最初から下がり続ける（買いには逆行）。' }
  };
  LabSim.path = function (key) {
    var r = LabSim.rng({ trend: 11, reversal: 23, range: 37, down: 41 }[key] || 7); var out = []; var noise = 0;
    for (var t = 0; t < 60; t++) {
      noise = noise * 0.6 + (r() - 0.5) * 0.9;
      var base;
      if (key === 'trend') base = 100 + t * 0.2 + Math.sin(t / 3.2) * 0.8;
      else if (key === 'reversal') base = t <= 32 ? 100 + t * 0.24 + Math.sin(t / 3) * 0.6 : 107.7 - (t - 32) * 0.5;
      else if (key === 'range') base = 100 + Math.sin(t / 4.2) * 2.8;
      else base = 100 - t * 0.22 + Math.sin(t / 3.5) * 0.7;
      out.push(+(t === 0 ? 100 : base + noise).toFixed(2));
    }
    return out;
  };
  LabSim.STRATEGIES = {
    single: { name: '一括で建てる（比較用）', short: '一括', desc: '最初に3枚買い、損切りは97.5のまま。増し玉はしない。' },
    pyramid: { name: 'ピラミッティング（損切りを引き上げる）', short: 'ピラミッティング', desc: '3枚で建て、含み益が1.5伸びるごとに2枚→1枚と小さく増し玉（最大2回）。増し玉のたびに損切りを平均建値の少し下へ上げ、その後は最高値から2.5下に追従させる。' },
    pyramid_bad: { name: '増し玉しすぎ（損切りを動かさない）', short: '増し玉しすぎ', desc: '含み益が1.5伸びるごとに同じ3枚ずつ増し玉（最大3回＝12枚）。損切りは最初の97.5のまま。' },
    nanpin: { name: 'ナンピン（逆行したら買い増し）', short: 'ナンピン', desc: '3枚で建て、1.5下がるごとに3枚ずつ買い増し（最大4回）。損切りなし。損失が60に達すると強制決済（ロスカット）。' },
    martingale: { name: 'ナンピン＋マーチンゲール（倍々で買い増し）', short: 'マーチンゲール型', desc: '1枚で建て、1.5下がるごとに2・4・8・16枚と倍々で買い増し。損切りなし。損失が60に達すると強制決済。' }
  };
  var LOSSCUT = -60;
  function avgOf(pos) { var l = 0, v = 0; pos.forEach(function (p) { l += p.lots; v += p.lots * p.price; }); return l ? v / l : 0; }
  function lotsOf(pos) { return pos.reduce(function (s, p) { return s + p.lots; }, 0); }
  function pnlAt(pos, price) { return pos.reduce(function (s, p) { return s + p.lots * (price - p.price); }, 0); }
  LabSim.runStrategy = function (key, scen) {
    var px = LabSim.path(scen); var pos = [{ bar: 0, price: px[0], lots: key === 'martingale' ? 1 : 3 }];
    var stop = (key === 'nanpin' || key === 'martingale') ? null : 97.5; var adds = 0; var last = px[0]; var hi = px[0];
    var log = [{ bar: 0, type: 'entry', price: px[0], lots: pos[0].lots, text: '買い ' + pos[0].lots + '枚' }]; var stops = []; var eq = []; var minPnl = 0, maxLots = lotsOf(pos), maxRisk = stop !== null ? pnlAt(pos, stop) : null;
    var exit = null;
    for (var t = 1; t < px.length; t++) {
      var p = px[t];
      // 損切り（決めた価格で約定したとみなす）
      if (stop !== null && p <= stop) { exit = { bar: t, price: stop, reason: '損切り' }; break; }
      var open = pnlAt(pos, p);
      if ((key === 'nanpin' || key === 'martingale') && open <= LOSSCUT) { exit = { bar: t, price: p, reason: '強制決済（ロスカット）' }; break; }
      // 増し玉・買い増し
      if (key === 'pyramid' && adds < 2 && p >= last + 1.5) { var lots = adds === 0 ? 2 : 1; pos.push({ bar: t, price: p, lots: lots }); adds++; last = p; log.push({ bar: t, type: 'add', price: p, lots: lots, text: '増し玉 ' + lots + '枚' }); stop = Math.max(stop, +(avgOf(pos) - 0.5).toFixed(2)); log.push({ bar: t, type: 'stop', price: stop, text: '損切りを ' + stop.toFixed(2) + ' へ' }); }
      else if (key === 'pyramid_bad' && adds < 3 && p >= last + 1.5) { pos.push({ bar: t, price: p, lots: 3 }); adds++; last = p; log.push({ bar: t, type: 'add', price: p, lots: 3, text: '増し玉 3枚' }); }
      else if (key === 'nanpin' && adds < 4 && p <= last - 1.5) { pos.push({ bar: t, price: p, lots: 3 }); adds++; last = p; log.push({ bar: t, type: 'add', price: p, lots: 3, text: '買い増し 3枚' }); }
      else if (key === 'martingale' && adds < 4 && p <= last - 1.5) { var ml = Math.pow(2, adds + 1); pos.push({ bar: t, price: p, lots: ml }); adds++; last = p; log.push({ bar: t, type: 'add', price: p, lots: ml, text: '買い増し ' + ml + '枚' }); }
      if (key === 'pyramid') { hi = Math.max(hi, p); if (adds > 0) { var ts = +(hi - 2.5).toFixed(2); if (ts > stop) stop = ts; } }
      open = pnlAt(pos, p); if (open < minPnl) minPnl = open; maxLots = Math.max(maxLots, lotsOf(pos));
      if (stop !== null) { var rk = pnlAt(pos, stop); maxRisk = maxRisk === null ? rk : Math.min(maxRisk, rk); }
      eq.push([t, open]); stops.push([t, stop]);
    }
    if (!exit) exit = { bar: px.length - 1, price: px[px.length - 1], reason: '期間終了で決済' };
    var final = pnlAt(pos, exit.price); if (final < minPnl) minPnl = final; eq.push([exit.bar, final]);
    log.push({ bar: exit.bar, type: 'exit', price: exit.price, text: exit.reason + '（' + lotsOf(pos) + '枚）' });
    return { key: key, scen: scen, px: px, pos: pos, log: log, eq: eq, stops: stops, exit: exit, final: +final.toFixed(2), minPnl: +minPnl.toFixed(2), maxLots: maxLots, avg: +avgOf(pos).toFixed(2), lots: lotsOf(pos), maxRisk: maxRisk === null ? null : +maxRisk.toFixed(2) };
  };
  LabSim.compare = function (scen) { return Object.keys(LabSim.STRATEGIES).map(function (k) { return LabSim.runStrategy(k, scen); }); };

  /* ---------- 手動の増し玉体験（1本ずつ進める） ---------- */
  LabSim.manual = function (scen) {
    var px = LabSim.path(scen); var s = { scen: scen, px: px, t: 0, pos: [{ bar: 0, price: px[0], lots: 3 }], stop: 97.5, log: [{ bar: 0, type: 'entry', price: px[0], lots: 3, text: '買い 3枚（損切り 97.50）' }], done: false, result: null, minPnl: 0 };
    s.lots = function () { return lotsOf(s.pos); }; s.avg = function () { return avgOf(s.pos); }; s.open = function () { return pnlAt(s.pos, px[s.t]); }; s.risk = function () { return pnlAt(s.pos, s.stop); };
    function finish(price, reason) { var f = pnlAt(s.pos, price); s.done = true; s.result = { price: price, reason: reason, final: +f.toFixed(2), bar: s.t }; s.log.push({ bar: s.t, type: 'exit', price: price, text: reason + '（' + lotsOf(s.pos) + '枚）' }); if (f < s.minPnl) s.minPnl = f; }
    s.next = function () { if (s.done) return; s.t++; var p = px[s.t]; if (p <= s.stop) { s.t = s.t; finish(s.stop, '損切り'); return; } var o = pnlAt(s.pos, p); if (o < s.minPnl) s.minPnl = o; if (s.t >= px.length - 1) finish(p, '期間終了で決済'); };
    s.add = function (lots) { if (s.done || lotsOf(s.pos) + lots > 15) return false; s.pos.push({ bar: s.t, price: px[s.t], lots: lots }); s.log.push({ bar: s.t, type: 'add', price: px[s.t], lots: lots, text: '増し玉 ' + lots + '枚' }); return true; };
    s.raiseStop = function (v) { if (s.done) return false; v = +v.toFixed(2); if (v <= s.stop || v >= px[s.t]) return false; s.stop = v; s.log.push({ bar: s.t, type: 'stop', price: v, text: '損切りを ' + v.toFixed(2) + ' へ' }); return true; };
    s.close = function () { if (!s.done) finish(px[s.t], '自分で決済'); };
    return s;
  };
  root.LabSim = LabSim;
})(typeof window !== 'undefined' ? window : globalThis);
