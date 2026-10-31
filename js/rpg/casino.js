/* =========================================================
   RPG / Casino (v6.1) : カジノのゲームロジック（画面とは分離。3D 化しても同じ関数を使う）
   ・カジノコインは通常のゴールドとは別の残高（State.data.casino.coins）。ゴールド → コインの交換だけ（コイン → ゴールドはなし）
   ・現実のお金・暗号資産・外部決済・換金は一切ない
   ・乱数は Math.random（テストでは Casino.rng を差し替え）。勝率を隠れて操作する仕組みはない
   ・各ゲームの確率・配当・期待値（還元率）は下の定義から計算し、画面にもそのまま表示する
   ========================================================= */
(function (root) {
  'use strict';
  var Casino = { rng: function () { return Math.random(); }, COIN_PRICE: 10 };
  function D() { return root.State.data; }
  function C() { var d = D(); if (!d.casino) d.casino = { coins: 0, history: { slot: [], roulette: [], card: [] }, stats: {}, lab: {} }; var c = d.casino; c.history = c.history || { slot: [], roulette: [], card: [] }; c.stats = c.stats || {}; c.lab = c.lab || {}; ['slot', 'roulette', 'card'].forEach(function (k) { c.history[k] = c.history[k] || []; }); return c; }
  Casino.state = C;
  Casino.coins = function () { return C().coins || 0; };
  function addCoins(n) { var c = C(); c.coins = Math.max(0, (c.coins || 0) + n); return c.coins; }
  Casino.addCoins = addCoins;
  function stat(game, bet, payout) { var s = C().stats; var g = s[game] = s[game] || { plays: 0, bet: 0, paid: 0 }; g.plays++; g.bet += bet; g.paid += payout; }
  function pushHist(game, v, max) { var h = C().history[game]; h.unshift(v); if (h.length > (max || 20)) h.length = max || 20; }
  function rint(n) { return Math.floor(Casino.rng() * n); }

  /* ---------- 両替（ゴールド → コイン） ---------- */
  Casino.buyCoins = function (n) {
    var d = D(); var cost = n * Casino.COIN_PRICE; if (n <= 0 || d.gold < cost) return { ok: false, reason: 'ゴールドが足りない' };
    d.gold -= cost; addCoins(n); return { ok: true, cost: cost, coins: Casino.coins() };
  };

  /* ---------- スロット：3リール（各20コマ）・中央の1ライン ---------- */
  // リールのコマ数（3本とも同じ）。合計20
  var REEL = { seven: 1, bar: 2, bell: 3, slime: 4, cherry: 3, blank: 7 };
  var SYM_NAME = { seven: '７', bar: 'BAR', bell: 'ベル', slime: 'スライム', cherry: 'チェリー', blank: '（空白）' };
  var STRIP = []; Object.keys(REEL).forEach(function (k) { for (var i = 0; i < REEL[k]; i++) STRIP.push(k); });
  // 並びをばらす（固定の並び。抽選は「どのコマで止まるか」を20通りから等確率で選ぶ）
  STRIP = ['blank', 'cherry', 'slime', 'blank', 'bell', 'slime', 'blank', 'bar', 'cherry', 'slime', 'blank', 'seven', 'blank', 'bell', 'slime', 'cherry', 'blank', 'bar', 'bell', 'blank'];
  // 配当（賭け枚数に対する倍率。払い戻しの合計）
  var PAY = [
    { key: '777', label: '７ ７ ７', mult: 500, test: function (r) { return r[0] === 'seven' && r[1] === 'seven' && r[2] === 'seven'; } },
    { key: 'bar3', label: 'BAR BAR BAR', mult: 100, test: function (r) { return r[0] === 'bar' && r[1] === 'bar' && r[2] === 'bar'; } },
    { key: 'bell3', label: 'ベル×3', mult: 50, test: function (r) { return r[0] === 'bell' && r[1] === 'bell' && r[2] === 'bell'; } },
    { key: 'cherry3', label: 'チェリー×3', mult: 40, test: function (r) { return r[0] === 'cherry' && r[1] === 'cherry' && r[2] === 'cherry'; } },
    { key: 'slime3', label: 'スライム×3', mult: 25, test: function (r) { return r[0] === 'slime' && r[1] === 'slime' && r[2] === 'slime'; } },
    { key: 'cherry2', label: 'チェリー×2（左から）', mult: 8, test: function (r) { return r[0] === 'cherry' && r[1] === 'cherry' && r[2] !== 'cherry'; } },
    { key: 'cherry1', label: 'チェリー（左のみ）', mult: 1, test: function (r) { return r[0] === 'cherry' && r[1] !== 'cherry'; } }
  ];
  Casino.SLOT = { REEL: REEL, STRIP: STRIP, PAY: PAY, NAME: SYM_NAME, BETS: [1, 5, 10, 50] };
  // 各役の確率（理論値）と還元率：リールは独立で、各コマ 1/20
  Casino.slotTable = function () {
    var N = STRIP.length; var p = {}; Object.keys(REEL).forEach(function (k) { p[k] = REEL[k] / N; });
    var rows = PAY.map(function (row) {
      var prob = 0; Object.keys(REEL).forEach(function (a) { Object.keys(REEL).forEach(function (b) { Object.keys(REEL).forEach(function (c) { if (row.test([a, b, c])) prob += p[a] * p[b] * p[c]; }); }); });
      return { key: row.key, label: row.label, mult: row.mult, prob: prob, contrib: prob * row.mult };
    });
    var rtp = rows.reduce(function (s, r) { return s + r.contrib; }, 0);
    return { rows: rows, rtp: rtp, ev: rtp - 1, hit: rows.reduce(function (s, r) { return s + r.prob; }, 0) };
  };
  Casino.slotSpin = function (bet) {
    if (Casino.SLOT.BETS.indexOf(bet) < 0) return { ok: false, reason: '賭け枚数が正しくない' };
    if (Casino.coins() < bet) return { ok: false, reason: 'コインが足りない' };
    addCoins(-bet); var stops = [rint(STRIP.length), rint(STRIP.length), rint(STRIP.length)]; var reels = stops.map(function (i) { return STRIP[i]; });
    var win = null; for (var i = 0; i < PAY.length; i++) if (PAY[i].test(reels)) { win = PAY[i]; break; }
    var payout = win ? bet * win.mult : 0; if (payout) addCoins(payout);
    stat('slot', bet, payout); pushHist('slot', { reels: reels, bet: bet, payout: payout, win: win ? win.label : null }, 15);
    return { ok: true, stops: stops, reels: reels, win: win ? { key: win.key, label: win.label, mult: win.mult } : null, payout: payout, coins: Casino.coins() };
  };

  /* ---------- ルーレット：ヨーロピアン（0〜36 の37区画） ---------- */
  var RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  Casino.colorOf = function (n) { return n === 0 ? 'green' : RED.indexOf(n) >= 0 ? 'red' : 'black'; };
  // 賭け方：covers（当たりになる数字）と払い戻し倍率（賭け金込み）
  Casino.rouletteBet = function (type, num) {
    var all = []; for (var i = 0; i <= 36; i++) all.push(i);
    var defs = {
      number: { label: '数字 ' + num, covers: [num], mult: 36 }, red: { label: '赤', covers: RED.slice(), mult: 2 }, black: { label: '黒', covers: all.filter(function (n) { return n && RED.indexOf(n) < 0; }), mult: 2 },
      odd: { label: '奇数', covers: all.filter(function (n) { return n && n % 2 === 1; }), mult: 2 }, even: { label: '偶数', covers: all.filter(function (n) { return n && n % 2 === 0; }), mult: 2 },
      low: { label: '1〜18', covers: all.filter(function (n) { return n >= 1 && n <= 18; }), mult: 2 }, high: { label: '19〜36', covers: all.filter(function (n) { return n >= 19; }), mult: 2 },
      d1: { label: '1〜12', covers: all.filter(function (n) { return n >= 1 && n <= 12; }), mult: 3 }, d2: { label: '13〜24', covers: all.filter(function (n) { return n >= 13 && n <= 24; }), mult: 3 }, d3: { label: '25〜36', covers: all.filter(function (n) { return n >= 25; }), mult: 3 }
    };
    var b = defs[type]; if (!b || (type === 'number' && !(num >= 0 && num <= 36))) return null;
    b.type = type; b.num = num; b.prob = b.covers.length / 37; b.ev = b.prob * b.mult - 1; return b;
  };
  Casino.ROULETTE_BETS = [1, 5, 10, 50, 100];
  Casino.rouletteSpin = function (type, num, bet) {
    var b = Casino.rouletteBet(type, num); if (!b) return { ok: false, reason: '賭け方が正しくない' };
    if (Casino.ROULETTE_BETS.indexOf(bet) < 0) return { ok: false, reason: '賭け額が正しくない' };
    if (Casino.coins() < bet) return { ok: false, reason: 'コインが足りない' };
    addCoins(-bet); var n = rint(37); var hit = b.covers.indexOf(n) >= 0; var payout = hit ? bet * b.mult : 0; if (payout) addCoins(payout);
    stat('roulette', bet, payout); pushHist('roulette', { n: n, color: Casino.colorOf(n), bet: bet, label: b.label, payout: payout }, 30);
    return { ok: true, n: n, color: Casino.colorOf(n), hit: hit, payout: payout, bet: b, coins: Casino.coins() };
  };

  /* ---------- ハイ＆ロー：52枚のトランプ。表の1枚より次が「上」か「下」か（同じ数字は負け） ---------- */
  // 払い戻し倍率は当たる確率から決める：倍率＝0.95÷確率（小数第1位で切り捨て）。だから期待値はいつも約−5%以下
  // 賭け額は10枚単位：賭け額×倍率（0.1刻み）がいつも整数になり、表示した倍率どおりに払い戻せる（端数の切り捨てで期待値が変わらない）
  Casino.HOUSE = 0.95; Casino.CARD_BETS = [10, 50, 100, 500];
  var SUITS = ['♠', '♥', '♦', '♣']; var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  Casino.cardLabel = function (c) { return SUITS[c.s] + RANKS[c.r - 1]; };
  Casino.cardOdds = function (rank) {   // 表の札を除いた51枚から
    var higher = (13 - rank) * 4, lower = (rank - 1) * 4, same = 3; var n = 51;
    function m(p) { return p > 0 ? Math.floor(Casino.HOUSE / p * 10) / 10 : 0; }
    var ph = higher / n, pl = lower / n;
    return { high: { prob: ph, mult: m(ph), ev: ph * m(ph) - 1, count: higher }, low: { prob: pl, mult: m(pl), ev: pl * m(pl) - 1, count: lower }, same: same / n, n: n };
  };
  Casino.cardDeal = function () { var c = C(); var deck = []; for (var s = 0; s < 4; s++) for (var r = 1; r <= 13; r++) deck.push({ s: s, r: r }); var i = rint(deck.length); var first = deck.splice(i, 1)[0]; c.cardRound = { first: first, deck: deck }; return { first: first, odds: Casino.cardOdds(first.r) }; };
  Casino.cardGuess = function (dir, bet) {
    var c = C(); var rd = c.cardRound; if (!rd) return { ok: false, reason: '先に札を配る' };
    if (Casino.CARD_BETS.indexOf(bet) < 0) return { ok: false, reason: '賭け額が正しくない' };
    var odds = Casino.cardOdds(rd.first.r)[dir]; if (!odds || odds.mult <= 0) return { ok: false, reason: 'その予想は当たる札がない' };
    if (Casino.coins() < bet) return { ok: false, reason: 'コインが足りない' };
    addCoins(-bet); var next = rd.deck[rint(rd.deck.length)];
    var hit = dir === 'high' ? next.r > rd.first.r : next.r < rd.first.r; var payout = hit ? Math.round(bet * odds.mult) : 0; if (payout) addCoins(payout);   // 10枚単位なので bet×倍率 は整数（Math.round は浮動小数の誤差を丸めるだけ）
    stat('card', bet, payout); pushHist('card', { first: Casino.cardLabel(rd.first), next: Casino.cardLabel(next), dir: dir, bet: bet, payout: payout }, 20); c.cardRound = null;
    return { ok: true, first: rd.first, next: next, hit: hit, payout: payout, mult: odds.mult, prob: odds.prob, coins: Casino.coins() };
  };

  /* ---------- 景品交換 ---------- */
  Casino.exchange = function (prize) {
    if (!prize || !root.ITEMS[prize.item]) return { ok: false, reason: '景品がない' };
    if (Casino.coins() < prize.cost) return { ok: false, reason: 'コインが足りない' };
    addCoins(-prize.cost); root.State.addItem(prize.item, 1); C().prizes = (C().prizes || 0) + 1; return { ok: true, coins: Casino.coins() };
  };
  Casino.stats = function () { return C().stats; };
  root.Casino = Casino;
})(typeof window !== 'undefined' ? window : globalThis);
