/* =========================================================
   RPG / Market（必殺技のチャート戦闘の基盤）：500の相場シナリオ・リアルタイムのチャート・損益の判定
   ・ここは純粋な計算だけ（DOM に依存しない。Node でもテストできる）。描画は js/ui/chartbattle.js
   ・役割（指示書の名前）：
       MarketScenarioGenerator … Market.CATS / Market.list / Market.build / Market.validate / Market.pick
       ChartSimulationEngine   … Market.Sim（時刻からいま見えている足・ティックを決める。判断は1回だけ）
       TradeSettlementEngine   … Market.settle（利確・損切り・時間切れ・スプレッド・スリッページ）
       （判断時点の相場の見立て） Market.assess（見えている足だけで計算。試験の採点・技の追加効果に使う）
   ・シナリオ：10の相場カテゴリー × 難易度5 × 10の型（バリエーション）＝500。型ごとに「足の流れ（目標の道筋）」が違う
       同じシナリオでも、使うたびにシード（乱数の種）を変えて細かい値動きを変える。同じシナリオ・同じシードなら同じチャート
       作ったチャートはカテゴリーの条件（例：上昇トレンドなら EMA の並び・値幅）で検証し、合わなければ次のシードで作り直す
   ・足の作り方：目標の道筋（区切りの点を直線でつなぐ）に、価格が少しずつ寄っていく動き＋乱数の揺れ（揺れの大きさは群れて変わる）
       1本の足は8つのティックでできる。始値＝前の足の終値、高値・安値＝ティックの最大・最小、終値＝最後のティック（OHLC は必ず整合）
   ・時間の並び（足の番号）：0〜239 は過去（0〜39 は指標の準備期間で表示しない）、240〜299 が最初に見える60本、300 から先が「いま動く足」
       判断中に足が進み、エントリー後もさらに進んで損益が決まる。未来の足は、その時刻になるまで画面に出さない（Market.Sim が管理）
   ・プレイヤーの選択を見て未来を書き換えることはしない（チャートは開く前に最後の足まで作ってある。損益はその足のティックだけで決まる）
   ========================================================= */
(function (root) {
  'use strict';
  var CONFIG = root.CONFIG || (typeof require === 'function' ? require('../config.js') : null);
  var Indicators = root.Indicators || (typeof require === 'function' ? require('../indicators.js') : null);

  var Market = {};
  var TOTAL = 340, WARM = 40, HIST0 = 240, LIVE0 = 300, SUB = 8;
  Market.TOTAL = TOTAL; Market.WARM = WARM; Market.HIST0 = HIST0; Market.LIVE0 = LIVE0; Market.SUB = SUB;
  Market.PIP = (CONFIG && CONFIG.market && CONFIG.market.pip) || 0.01;
  Market.PAIR = '架空ペア POYO/MOCHI（シミュレーション相場）';
  // 取引の条件（指示書の初期仕様）：損切り＝ATR×1.0、利確＝ATR×1.8、最大保有＝エントリー後12本。スプレッド・スリッページは pips
  Market.RULES = { slAtr: 1.0, tpAtr: 1.8, maxBars: 12, spreadPips: 0.6, stopSlipPips: 0.3, entrySlipMaxPips: 0.2, flatAtr: 0.15, atrPeriod: 14, gapAtr: 1.0 };

  /* ---------- 乱数（シード付き） ---------- */
  function mulberry32(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function gauss(r) { var u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function between(r, a, b) { return a + r() * (b - a); }
  function pickOf(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  Market.rng = mulberry32; Market.hash = hashStr;

  /* ---------- カテゴリー（10） ---------- */
  Market.CATS = [
    { id: 'trend_up', name: '強い上昇トレンド' }, { id: 'trend_down', name: '強い下降トレンド' },
    { id: 'pullback_up', name: '上昇トレンド中の押し目' }, { id: 'rally_down', name: '下降トレンド中の戻り' },
    { id: 'range', name: 'レンジ相場' }, { id: 'range_break', name: 'レンジブレイク' }, { id: 'fakeout', name: 'ダマシ・フェイクブレイク' },
    { id: 'divergence', name: 'ダイバージェンス' }, { id: 'volatile', name: '急変動・高ボラティリティ' }, { id: 'complex', name: '複合的な難しい相場' }
  ];
  Market.DIFF_NAME = ['', '初心者', '初級', '中級', '上級', '最上級'];
  // 型（バリエーション）の名前：カテゴリーごとに10の違う市場構造
  Market.STYLES = {
    trend_up: ['階段状の上昇', '加速する上昇', '勢いが落ちつつ続く上昇', '浅い押しのじり高', '深い押しを挟む上昇', '保ち合いからの上昇開始', 'ふるい落としを挟む上昇', '上昇チャネル', '急騰からのじり高', '急落からのV字上昇'],
    trend_down: ['階段状の下落', '加速する下落', '勢いが落ちつつ続く下落', '浅い戻りのじり安', '深い戻りを挟む下落', '保ち合いからの下落開始', '踏み上げを挟む下落', '下降チャネル', '急落からのじり安', '急騰からの逆V字下落'],
    pullback_up: ['38%の浅い押し', '50%の押し', '62%の深い押し', 'EMA20への押し', 'EMA40までの押し', '旗型の押し', '三角保ち合いの押し', '二番底をつける押し', '時間をかけた横ばいの押し', '急な押し（ふるい落とし）'],
    rally_down: ['38%の浅い戻り', '50%の戻り', '62%の深い戻り', 'EMA20への戻り', 'EMA40までの戻り', '旗型の戻り', '三角保ち合いの戻り', '二番天井をつける戻り', '時間をかけた横ばいの戻り', '急な戻り（踏み上げ）'],
    range: ['広いレンジ', '狭いレンジ', '上限付近で判断', '下限付近で判断', '中央付近で判断', 'わずかに右上がりのレンジ', 'わずかに右下がりのレンジ', '値幅が縮むレンジ', '値幅が広がるレンジ', 'ヒゲで上下を試すレンジ'],
    range_break: ['上へのブレイク', '下へのブレイク', '上抜け後の押し目（リターンムーブ）', '下抜け後の戻り（リターンムーブ）', '値幅が縮んだ後の上放れ', '値幅が縮んだ後の下放れ', '一度失敗してからの上抜け', '一度失敗してからの下抜け', 'じわじわ上抜け', 'じわじわ下抜け'],
    fakeout: ['上抜けのダマシから下落', '下抜けのダマシから上昇', '上下両方のダマシ', '高値更新のダマシ（ブルトラップ）', '安値更新のダマシ（ベアトラップ）', '長いヒゲでの踏み上げ', '長いヒゲでの振るい落とし', '戻り目の上抜けダマシ', '押し目の下抜けダマシ', 'ブレイク後すぐに反転'],
    divergence: ['天井の弱気ダイバージェンス', '底の強気ダイバージェンス', '隠れた強気ダイバージェンス（押し目）', '隠れた弱気ダイバージェンス（戻り）', '三段の天井の逆行', '三段の底の逆行', 'RCIが先に崩れる天井', 'RCIが先に戻る底', '逆行しても続く上昇', '逆行しても続く下落'],
    volatile: ['急騰して押し戻される', '急落して戻される', '上下に振り回される', '指標発表のような急騰の継続', '指標発表のような急落の継続', '値幅が広がりながらの上昇', '値幅が広がりながらの下落', '急変動のあとの落ち着き', '連続する大陽線と大陰線', 'ギャップのような飛び'],
    complex: ['上昇→レンジ→下落', '下落→レンジ→上昇', 'ダブルトップ', 'ダブルボトム', '三尊型（ヘッドアンドショルダー）', '逆三尊型', '上昇ウェッジ', '下降ウェッジ', '上位足と下位足が逆向き', '方向の定まらない乱高下']
  };

  // 500 のシナリオ一覧（固定の ID）：mk_<カテゴリー>_d<難易度>_v<型>
  Market.list = function () {
    if (Market._list) return Market._list; var out = [];
    Market.CATS.forEach(function (c) { for (var d = 1; d <= 5; d++) for (var v = 0; v < 10; v++) out.push({ id: 'mk_' + c.id + '_d' + d + '_v' + v, cat: c.id, catName: c.name, diff: d, variant: v, style: Market.STYLES[c.id][v] }); });
    Market._list = out; return out;
  };
  Market.def = function (id) { var m = /^mk_(.+)_d(\d)_v(\d)$/.exec(id || ''); if (!m) return null; var cat = m[1]; if (!Market.STYLES[cat]) return null; var c = Market.CATS.filter(function (x) { return x.id === cat; })[0]; return { id: id, cat: cat, catName: c.name, diff: +m[2], variant: +m[3], style: Market.STYLES[cat][+m[3]] }; };

  /* ---------- 目標の道筋を作る道具 ---------- */
  // 区切りの点 [足の番号, 水準（ATR の倍数）] を順に足していく。legs: [[本数, 変化], ...]
  function Path(start, level) { this.pts = [[start, level]]; this.marks = {}; }
  Path.prototype.mark = function (k) { this.marks[k] = this.bar(); return this; };
  Path.prototype.last = function () { return this.pts[this.pts.length - 1]; };
  Path.prototype.leg = function (bars, delta) { var l = this.last(); this.pts.push([l[0] + Math.max(1, Math.round(bars)), l[1] + delta]); return this; };
  Path.prototype.to = function (bar, level) { var l = this.last(); if (bar <= l[0]) bar = l[0] + 1; this.pts.push([Math.round(bar), level]); return this; };
  Path.prototype.level = function () { return this.last()[1]; };
  Path.prototype.bar = function () { return this.last()[0]; };
  // 上下の往復（レンジ）：lo〜hi の間を period 本ごとに往復して until まで
  Path.prototype.osc = function (until, lo, hi, period, r, jit) {
    // 往復は不規則に：端まで届かずに折り返す（中ほどで止まる）こともあり、周期・届く深さもばらつく
    var up = this.level() < (lo + hi) / 2; var w = hi - lo; jit = Math.max(jit || 0, 0.12);
    while (this.bar() < until - 2) {
      var b = Math.min(until, this.bar() + Math.max(3, Math.round(period * between(r, 0.55, 1.5))));
      var half = r() < 0.22; var depth = half ? between(r, 0.35, 0.6) : 1 - between(r, 0, jit * 1.8);
      var tgt = up ? lo + w * (half ? depth : depth) : hi - w * depth; if (!half) tgt = up ? hi - w * between(r, 0, jit * 1.5) : lo + w * between(r, 0, jit * 1.5);
      this.to(b, tgt); if (r() < 0.3) this.to(this.bar() + Math.max(2, Math.round(period * between(r, 0.2, 0.45))), tgt + (up ? -1 : 1) * w * between(r, 0.05, 0.2));
      up = !up;
    }
    if (this.bar() < until) this.to(until, this.level()); return this;
  };
  // 波打ちながら一方向へ（トレンド）：total の変化を、impulse と pullback（比率 pb）の組で until まで
  Path.prototype.trend = function (until, total, legBars, pb, r, accel) {
    var startLevel = this.level(), startBar = this.bar(); var n = Math.max(1, Math.round((until - startBar) / legBars)); var dir = total >= 0 ? 1 : -1;
    var w = []; var s = 0; for (var i = 0; i < n; i++) { var x = accel ? Math.pow(accel, i) : 1; w.push(x); s += x; }
    var lvl = startLevel; for (var k = 0; k < n; k++) {
      var step = total * w[k] / s; var impBars = (until - startBar) / n * between(r, 0.55, 0.7); var pbk = pb * between(r, 0.7, 1.3);
      var imp = step / (1 - pbk); lvl += imp; this.to(this.bar() + impBars, lvl);
      if (k < n - 1 || r() < 0.5) { lvl -= imp * pbk; this.to(startBar + (until - startBar) * (k + 1) / n, lvl); }
    }
    if (this.bar() < until) this.to(until, startLevel + total * between(r, 0.92, 1.05));
    void dir; return this;
  };
  function stepAt(pts, t) { var v = pts[0][1]; for (var i = 0; i < pts.length; i++) { if (pts[i][0] <= t) v = pts[i][1]; else break; } return v; }   // 揺れの倍率：区切りから次の区切りまで同じ値
  function interp(pts, t) { if (t <= pts[0][0]) return pts[0][1]; for (var i = 1; i < pts.length; i++) { if (t <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; var f = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * f; } } return pts[pts.length - 1][1]; }

  /* ---------- カテゴリーごとの型（目標の道筋・揺れ） ----------
     返り値：{ path, vol:[[足, 倍率]...], jumps:[{bar, size}], note }。r は「シナリオごとに固定」の乱数、q は「シードごと」の乱数（いま動く部分の分かれ道）
     d（難易度1〜5）：大きいほど揺れが大きく、構造がわかりにくく、いま動く部分の行方がはっきりしない */
  function ctx(path, r, from, to, dir, amp) { // 過去の文脈（上位足で見える流れ）
    var seg = Math.round(between(r, 22, 40)); var lvl = path.level();
    while (path.bar() < to - 8) { var nb = Math.min(to, path.bar() + seg * between(r, 0.7, 1.3)); lvl += dir * amp * between(r, 0.3, 1.2) + (r() - 0.5) * amp * 1.4; path.to(nb, lvl); }
    path.to(to, lvl + dir * amp * 0.3); return path;
  }
  function liveCont(path, q, d, dir, strength) { // いま動く部分：方向 dir に strength 程度。難易度が高いほど行方がばらつく
    var sp = strength * between(q, 0.55, 1.35) - (d - 1) * between(q, 0, 0.45); var dip = q() < 0.18 + d * 0.06 ? between(q, 0.6, 1.6) : 0;
    if (dip) path.leg(between(q, 3, 7), -dir * dip);
    path.leg(between(q, 10, 18), dir * Math.max(-1.5, sp * 0.7)); path.leg(between(q, 8, 14), dir * sp * between(q, 0.1, 0.7) - dir * (q() < 0.15 * d ? between(q, 0.5, 1.8) : 0));
    path.to(TOTAL, path.level() + dir * between(q, -0.8, 1.2)); return path;
  }
  var T = {};
  function trendTpl(dir) {
    return function (r, q, d, v) {
      var p = new Path(0, 0); ctx(p, r, 0, 150, dir * (v === 9 ? -1 : 1), 1.0); var vol = [[0, 1]]; var jumps = []; var lvl;
      var tot = dir * between(r, 12, 18) * (v === 2 ? 1.5 : v === 4 ? 1.25 : 1) * (1 - (d - 1) * 0.05); var legB = between(r, 16, 26); var pb = [0.32, 0.25, 0.3, 0.15, 0.45, 0.3, 0.3, 0.4, 0.2, 0.3][v];
      if (v === 5) { lvl = p.level(); p.osc(205, lvl - 1.2, lvl + 1.2, 10, r, 0.2); p.trend(LIVE0, tot * 0.7, legB, pb, r); }
      else if (v === 9) { p.leg(between(r, 25, 40), -dir * between(r, 3, 6)); p.trend(LIVE0, tot * 0.9, legB, pb, r, 1.1); }
      else if (v === 8) { p.trend(220, tot * 0.25, legB, 0.3, r); p.leg(4, dir * between(r, 3, 5)); jumps.push({ bar: 221, size: dir * between(r, 1.5, 2.5) }); vol.push([222, 1.8], [230, 1]); p.trend(LIVE0, tot * 0.4, legB, 0.15, r); }
      else if (v === 6) { p.trend(245, tot * 0.55, legB, pb, r); p.leg(5, -dir * between(r, 2, 3)); vol.push([245, 1.6], [258, 1]); p.trend(LIVE0, tot * 0.65, legB, 0.2, r); }
      else if (v === 7) { var a = p.level(); var n = Math.round((LIVE0 - p.bar()) / 12); for (var i = 0; i < n; i++) { a += tot / n; p.to(p.bar() + 12, a + (i % 2 ? -1 : 1) * between(r, 0.8, 1.4)); } }
      else p.trend(LIVE0 - 6, tot, legB, pb, r, v === 1 ? 1.35 : v === 2 ? 0.85 : null);
      if (p.bar() < LIVE0) p.to(LIVE0, p.level() + dir * between(r, 0.4, 1.1));   // 判断の直前は流れの向きに（トレンドの形を保つ）
      if (v === 4) vol.push([200, 1.2]);
      liveCont(p, q, d, dir, v === 2 ? 1.2 : 2.2);
      return { path: p, vol: vol, jumps: jumps };
    };
  }
  T.trend_up = trendTpl(1); T.trend_down = trendTpl(-1);
  function pullTpl(dir) {
    return function (r, q, d, v) {
      var p = new Path(0, 0); ctx(p, r, 0, 160, dir, 0.9); var vol = [[0, 1]];
      p.trend(215, dir * between(r, 3, 5), 18, 0.3, r); var imp = dir * between(r, 7, 11); p.trend(272, imp, between(r, 14, 20), 0.22, r); p.mark('top');
      var depth = [0.38, 0.5, 0.62, 0.3, 0.55, 0.35, 0.4, 0.5, 0.33, 0.5][v] * Math.abs(imp) * 0.55; var lvl = p.level();
      if (v === 5) { p.leg(10, -dir * depth * 0.6).leg(9, dir * depth * 0.2).leg(9, -dir * depth * 0.6); }
      else if (v === 6) { p.leg(8, -dir * depth).leg(6, dir * depth * 0.6).leg(7, -dir * depth * 0.4).leg(7, dir * depth * 0.25); }
      else if (v === 7) { p.leg(7, -dir * depth).leg(7, dir * depth * 0.5).leg(7, -dir * depth * 0.55).leg(7, dir * depth * 0.1); }
      else if (v === 8) { p.leg(6, -dir * depth * 0.7); p.osc(LIVE0 - 1, lvl - dir * depth * 0.95, lvl - dir * depth * 0.45, 7, r, 0.15); }
      else if (v === 9) { p.leg(4, -dir * depth * 1.2); var vb = p.bar(); vol.push([vb - 4, 1.7], [vb + 3, 1]); p.leg(Math.max(4, LIVE0 - p.bar() - 6), dir * depth * 0.3); }
      else { p.leg(between(r, 12, 18), -dir * depth); p.leg(Math.max(4, LIVE0 - p.bar()), dir * depth * between(r, -0.1, 0.2)); }
      if (p.bar() < LIVE0) p.to(LIVE0, p.level());
      // いま動く部分：再上昇（難易度が高いほど、さらに深く押す・失敗する道も混ざる）
      var fail = q() < 0.08 + d * 0.07; if (fail) { p.leg(between(q, 6, 12), -dir * between(q, 1.2, 2.6)); p.leg(between(q, 8, 14), dir * between(q, -0.5, 1.2)); p.to(TOTAL, p.level()); }
      else liveCont(p, q, d, dir, 2.2);
      return { path: p, vol: vol, jumps: [] };
    };
  }
  T.pullback_up = pullTpl(1); T.rally_down = pullTpl(-1);
  T.range = function (r, q, d, v) {
    var p = new Path(0, 0); var cdir = r() < 0.5 ? 1 : -1; ctx(p, r, 0, 170, cdir, 0.8); var vol = [[0, 1]];
    var w = [5, 2.6, 4, 4, 4, 4, 4, 4.5, 3, 4][v] * between(r, 0.9, 1.15); var mid = p.level(); var lo = mid - w / 2, hi = mid + w / 2; var per = between(r, 8, 14);
    if (v === 5 || v === 6) { var sl = v === 5 ? 1 : -1; var n = Math.round((LIVE0 - p.bar()) / per); var up = true; for (var i = 0; i < n; i++) { var o = sl * w * 0.35 * i / n; p.to(p.bar() + per * between(r, 0.8, 1.2), (up ? hi : lo) + o); up = !up; } }
    else if (v === 7) { var n2 = Math.round((LIVE0 - p.bar()) / per); var up2 = true; for (var j = 0; j < n2; j++) { var s = 1 - 0.6 * j / n2; p.to(p.bar() + per, mid + (up2 ? 1 : -1) * w / 2 * s); up2 = !up2; } }
    else if (v === 8) { var n3 = Math.round((LIVE0 - p.bar()) / per); var up3 = true; for (var k = 0; k < n3; k++) { var s3 = 0.5 + 0.7 * k / n3; p.to(p.bar() + per, mid + (up3 ? 1 : -1) * w / 2 * s3); up3 = !up3; } vol.push([260, 1.3]); }
    else p.osc(LIVE0 - 8, lo, hi, per, r, d >= 4 ? 0.25 : 0.12);
    var endAt = v === 2 ? hi - w * 0.12 : v === 3 ? lo + w * 0.12 : v === 4 ? mid : (r() < 0.5 ? hi - w * 0.2 : lo + w * 0.2); p.to(LIVE0, endAt);
    var jumps = []; if (v === 9) { jumps.push({ bar: 250, size: w * 0.35, wick: true }, { bar: 276, size: -w * 0.35, wick: true }); }
    // いま動く部分：レンジが続く（端から反転しやすいが、難易度が高いほど抜けかける）
    var tgt = endAt > mid ? lo + w * between(q, 0.1, 0.45) : hi - w * between(q, 0.1, 0.45); if (endAt === mid) tgt = q() < 0.5 ? hi - w * 0.15 : lo + w * 0.15;
    if (q() < 0.1 + d * 0.05) p.leg(between(q, 3, 6), (endAt > mid ? 1 : -1) * w * 0.25);
    p.leg(between(q, 8, 14), tgt - p.level()); p.osc(TOTAL, lo + w * 0.1, hi - w * 0.1, per, q, 0.2);
    return { path: p, vol: vol, jumps: jumps, kf: 0.55 };
  };
  T.range_break = function (r, q, d, v) {
    var p = new Path(0, 0); var bdir = v % 2 === 0 ? 1 : -1; ctx(p, r, 0, 170, bdir, 0.8); var vol = [[0, 1]];
    var w = between(r, 3, 4.5); var mid = p.level(); var lo = mid - w / 2, hi = mid + w / 2;
    if (v === 4 || v === 5) { var n = 8; var up = true; for (var i = 0; i < n; i++) { var s = 1 - 0.65 * i / n; p.to(p.bar() + (LIVE0 - 2 - p.bar()) / (n - i), mid + (up ? 1 : -1) * w / 2 * s); up = !up; } vol.push([250, 0.7]); }
    else p.osc(LIVE0 - 4, lo, hi, between(r, 8, 13), r, 0.15);
    p.to(LIVE0, bdir > 0 ? hi - w * 0.2 : lo + w * 0.2);
    var edge = bdir > 0 ? hi : lo; var dl = between(q, 1, 4);
    if (v === 6 || v === 7) { p.leg(3, bdir * w * 0.25).leg(4, -bdir * w * 0.5); }
    var force = (v === 8 || v === 9) ? between(q, 1.6, 2.4) : between(q, 2.6, 4.2); force *= 1 - (d - 1) * 0.07;
    p.leg(dl, edge - p.level() + bdir * 0.2); p.leg(between(q, 3, 6), bdir * force * 0.6);
    if (v === 2 || v === 3) { p.leg(between(q, 4, 6), -bdir * force * 0.45); }
    p.leg(between(q, 6, 12), bdir * force * between(q, 0.4, 0.9)); p.to(TOTAL, p.level() + bdir * between(q, -0.6, 1.0));
    if (v === 4 || v === 5 || d >= 4) vol.push([LIVE0 + 2, 1.5], [LIVE0 + 14, 1.1]);
    return { path: p, vol: vol, jumps: [], edge: { lo: lo, hi: hi, dir: bdir }, kf: 0.6 };
  };
  T.fakeout = function (r, q, d, v) {
    var p = new Path(0, 0); var fdir = [1, -1, 1, 1, -1, 1, -1, 1, -1, r() < 0.5 ? 1 : -1][v]; ctx(p, r, 0, 170, (v === 7 ? -1 : v === 8 ? 1 : fdir), 0.8); var vol = [[0, 1]];
    var w = between(r, 3, 4.5); var mid = p.level(); var lo = mid - w / 2, hi = mid + w / 2;
    if (v === 3) p.trend(LIVE0 - 4, w * 0.8, 14, 0.4, r); else if (v === 4) p.trend(LIVE0 - 4, -w * 0.8, 14, 0.4, r); else p.osc(LIVE0 - 4, lo, hi, between(r, 8, 13), r, 0.15);
    var ext = p.pts.filter(function (pt) { return pt[0] >= 250; }).map(function (pt) { return pt[1]; }); var edge = fdir > 0 ? Math.max(hi, Math.max.apply(null, ext) + 0.2) : Math.min(lo, Math.min.apply(null, ext) - 0.2); p.to(LIVE0, edge - fdir * w * 0.2);
    var jumps = [];
    if (v === 2) { p.leg(between(q, 3, 5), -fdir * (w * 0.6 + 0.5)).leg(4, fdir * (w * 0.5)); }
    p.leg(between(q, 2, 4), edge - p.level() + fdir * between(q, 1.0, 1.6));
    if (v === 5 || v === 6) jumps.push({ bar: Math.round(p.bar()), size: fdir * between(q, 0.8, 1.4), wick: true });
    if (v === 9) p.leg(1, -fdir * 0.4);
    p.leg(between(q, 3, 6), -fdir * between(q, w * 0.7, w * 1.2)); p.leg(between(q, 6, 12), -fdir * between(q, 0.6, 2.2)); p.to(TOTAL, p.level() - fdir * between(q, -0.6, 0.9));
    vol.push([LIVE0 + 1, 1.25 + d * 0.05], [LIVE0 + 16, 1]);
    return { path: p, vol: vol, jumps: jumps, edge: { lo: lo, hi: hi, dir: fdir }, kf: 0.65 };
  };
  T.divergence = function (r, q, d, v) {
    var p = new Path(0, 0); var top = [1, -1, 0, 0, 1, -1, 1, -1, 1, -1][v]; var hidden = v === 2 || v === 3; var tdir = hidden ? (v === 2 ? 1 : -1) : top; var vol = [[0, 1]];
    ctx(p, r, 0, 150, tdir, 1.0);
    if (!hidden) {
      // 勢いのある波で1つ目の山（谷）→ 押し → ゆっくりした波で高値（安値）更新＝勢いが弱い → いま動く部分で反転（v8・v9 は逆行しても続く）
      var a1 = tdir * between(r, 5, 7), a2 = tdir * between(r, 1.2, 2.0), a3 = tdir * between(r, 0.6, 1.0);
      p.trend(222, tdir * between(r, 4, 7), 18, 0.3, r); p.leg(12, a1).mark('p1'); p.leg(12, -a1 * 0.5); p.leg(22, a1 * 0.5 + a2).mark('p2');
      if (v === 4 || v === 5) { p.leg(9, -a2 * 1.1); p.leg(16, a2 * 1.1 + a3).mark('p3'); }
      if (v === 6 || v === 7) vol.push([265, 0.85]);
      p.leg(8, -tdir * between(r, 1.0, 1.6)); p.to(LIVE0, p.level() + tdir * between(r, 0.1, 0.5));
      if (v === 8 || v === 9) liveCont(p, q, d, tdir, 1.4);
      else { p.leg(between(q, 3, 7), tdir * between(q, -0.2, 0.5)); p.leg(between(q, 8, 14), -tdir * between(q, 1.8, 3.5) * (1 - (d - 1) * 0.08)); p.to(TOTAL, p.level() - tdir * between(q, -0.8, 1.2)); }
    } else {
      // 隠れたダイバージェンス：トレンドの押し（戻り）で安値（高値）は切り上がる（切り下がる）が、勢い（MACD）は前の押しより深い
      p.trend(240, tdir * between(r, 8, 11), 18, 0.3, r); p.leg(14, -tdir * between(r, 1.9, 2.1)).mark('p1'); p.leg(12, tdir * between(r, 4.9, 5.1)); p.leg(9, -tdir * between(r, 4.2, 4.4)).mark('p2'); p.to(LIVE0, p.level() + tdir * 0.4);
      liveCont(p, q, d, tdir, 2.0);
    }
    return { path: p, vol: vol, jumps: [], dir: tdir };
  };
  T.volatile = function (r, q, d, v) {
    var p = new Path(0, 0); var vdir = [1, -1, r() < 0.5 ? 1 : -1, 1, -1, 1, -1, r() < 0.5 ? 1 : -1, r() < 0.5 ? 1 : -1, r() < 0.5 ? 1 : -1][v]; ctx(p, r, 0, 200, vdir, 0.9); var vol = [[0, 1]]; var jumps = [];
    if (v === 0 || v === 1) { p.leg(3, vdir * between(r, 4, 6)); jumps.push({ bar: 201, size: vdir * between(r, 1.5, 2.5) }); vol.push([200, 2.8], [215, 1.8]); p.leg(12, -vdir * between(r, 2, 3.5)); p.osc(LIVE0, p.level() - 1.5, p.level() + 1.5, 8, r, 0.2); }
    else if (v === 2) { vol.push([200, 2.7]); p.osc(LIVE0, p.level() - 3, p.level() + 3, 5, r, 0.3); }
    else if (v === 3 || v === 4) { p.osc(270, p.level() - 1, p.level() + 1, 9, r, 0.2); jumps.push({ bar: 282, size: vdir * between(r, 3, 4.5) }); vol.push([282, 2.6], [292, 1.7]); p.to(286, p.level() + vdir * 4).leg(LIVE0 - 286, vdir * 1.2); }
    else if (v === 5 || v === 6) { p.trend(LIVE0, vdir * between(r, 9, 13), 14, 0.45, r); vol.push([200, 1.2], [250, 1.6], [290, 2.1]); }
    else if (v === 7) { p.leg(4, vdir * 5); jumps.push({ bar: 202, size: vdir * between(r, 2, 3) }); vol.push([200, 3], [225, 1.5], [250, 0.8]); p.osc(LIVE0, p.level() - 1.2, p.level() + 1.2, 10, r, 0.1); }
    else if (v === 8) { vol.push([200, 2.6]); for (var i = 0; i < 8; i++) p.leg(between(r, 4, 8), (i % 2 ? -1 : 1) * between(r, 2.5, 4.5) * vdir); p.to(LIVE0, p.level()); }
    else { p.osc(260, p.level() - 1.2, p.level() + 1.2, 10, r, 0.1); jumps.push({ bar: 268, size: vdir * between(r, 2.5, 3.5) }, { bar: 288, size: -vdir * between(r, 1.5, 2.5) }); vol.push([268, 1.8], [295, 1.6]); p.to(LIVE0, p.level() + vdir * 2); }
    // いま動く部分：大きく振れる（方向ははっきりしない。難易度が高いほど激しい）
    vol.push([LIVE0 - 1, 1], [LIVE0, 2 + d * 0.15]); var dd = q() < 0.5 ? 1 : -1; p.leg(between(q, 2, 5), dd * between(q, 1.5, 3.5)); p.leg(between(q, 4, 8), -dd * between(q, 1, 4)); p.leg(between(q, 6, 12), dd * between(q, -2, 3)); p.to(TOTAL, p.level());
    if (q() < 0.3 + d * 0.06) jumps.push({ bar: LIVE0 + Math.round(between(q, 3, 14)), size: (q() < 0.5 ? 1 : -1) * between(q, 1.5, 3) });
    return { path: p, vol: vol, jumps: jumps };
  };
  T.complex = function (r, q, d, v) {
    var p = new Path(0, 0); var vol = [[0, 1]]; var s = r() < 0.5 ? 1 : -1; ctx(p, r, 0, 140, s, 0.9);
    if (v === 0 || v === 1) { var dir = v === 0 ? 1 : -1; p.trend(205, dir * 7, 16, 0.3, r); p.osc(262, p.level() - 1.6, p.level() + 1.6, 9, r, 0.15); p.trend(LIVE0, -dir * 4, 12, 0.35, r); }
    else if (v === 2 || v === 3) { var dd = v === 2 ? 1 : -1; p.trend(220, dd * 7, 16, 0.3, r); var pk = p.level(); p.leg(12, -dd * 3).leg(14, dd * 3.1).leg(12, -dd * 3.2); p.to(LIVE0, pk - dd * 2.2); }
    else if (v === 4 || v === 5) { var hs = v === 4 ? 1 : -1; p.trend(205, hs * 6, 16, 0.3, r); var b0 = p.level(); p.leg(9, -hs * 2.4).leg(10, hs * 3.6).leg(11, -hs * 3.6).leg(9, hs * 2.3).leg(10, -hs * 2.4); p.to(LIVE0, b0 - hs * 2.2); }
    else if (v === 6 || v === 7) { var wd = v === 6 ? 1 : -1; var lv = p.level(); var span = 5; for (var i = 0; i < 7; i++) { lv += wd * 0.9; p.to(p.bar() + 13, lv + (i % 2 ? -1 : 1) * span / 2); span *= 0.78; } p.to(LIVE0, lv); }
    else if (v === 8) { p.trend(250, s * 10, 22, 0.3, r); p.trend(LIVE0, -s * 4.5, 10, 0.35, r); }
    else { vol.push([150, 1.4]); for (var k = 0; k < 10; k++) p.leg(between(r, 8, 18), (r() - 0.5) * 7); p.to(LIVE0, p.level()); }
    // いま動く部分：構造どおりに進むとは限らない
    var ld = q() < 0.5 ? 1 : -1; p.leg(between(q, 4, 9), ld * between(q, 0.5, 2)); p.leg(between(q, 6, 12), (q() < 0.55 ? -ld : ld) * between(q, 1.5, 3.5)); p.to(TOTAL, p.level() + (q() - 0.5) * 3);
    return { path: p, vol: vol, jumps: [] };
  };

  /* ---------- 足を作る ---------- */
  function round3(x) { return Math.round(x * 1000) / 1000; }
  // def: Market.def(id)。seed: 整数。返り値：{ id, def, seed, bars:[{o,h,l,c}], ticks:[[8]], atrUnit, pip, tf }
  Market.generate = function (def, seed) {
    var r = mulberry32(hashStr(def.id)); var q = mulberry32((hashStr(def.id) ^ (seed * 2654435761)) >>> 0); var n = mulberry32((seed * 40503 + 977) >>> 0);
    var tpl = T[def.cat](r, q, def.diff, def.variant);
    var pts = tpl.path.pts.slice(); if (pts[pts.length - 1][0] < TOTAL) pts.push([TOTAL, pts[pts.length - 1][1]]);
    var d = def.diff; var kappa = (0.2 - (d - 1) * 0.025) * (tpl.kf || 1); var sigma = 0.2 * (0.85 + (d - 1) * 0.1);
    var x = pts[0][1]; var g = 1; var lv = []; var jumps = {}; (tpl.jumps || []).forEach(function (j) { jumps[j.bar] = j; });
    for (var b = 0; b < TOTAL; b++) {
      var row = []; var vm = stepAt(tpl.vol.slice().sort(function (x, y) { return x[0] - y[0]; }), b) || 1; var j = jumps[b];
      for (var k = 0; k < SUB; k++) {
        var t = b + (k + 1) / SUB; var tgt = interp(pts, t);
        var sh = gauss(n); g = 0.92 * g + 0.08 * (0.6 + Math.abs(sh) * 0.8); var fat = n() < 0.006 ? gauss(n) * 3 : 0;   // 揺れの群れ（GARCH 風）とまれな大きな揺れ
        x += kappa * (tgt - x) + sigma * vm * g * (sh + fat);
        if (j && k === 2) { x += j.size; if (j.wick) j._back = j.size; }
        if (j && j._back && k === 5) { x -= j._back * 0.8; j._back = 0; }
        row.push(x);
      }
      lv.push(row);
    }
    // ATR を合わせる：見える部分（240〜299）の平均の値幅が 1 になるように全体を伸縮
    var rng0 = 0, cnt = 0; for (var b2 = HIST0; b2 < LIVE0; b2++) { var rr = lv[b2]; var prev = lv[b2 - 1][SUB - 1]; var hi = Math.max.apply(null, rr.concat([prev])), lo = Math.min.apply(null, rr.concat([prev])); rng0 += hi - lo; cnt++; }
    var scale = rng0 > 0 ? cnt / rng0 : 1;
    var unit = (6 + d * 1.5 + (def.cat === 'volatile' ? 2 : 0)) * between(n, 0.85, 1.2);   // 1ATR の pips（難易度・急変動で大きく）
    var pip = Market.PIP; var base = 150 + between(n, -12, 12);
    var ticks = lv.map(function (row) { return row.map(function (v) { return round3(base + (v - pts[0][1]) * scale * unit * pip); }); });
    var bars = []; for (var i = 0; i < TOTAL; i++) { var tk = ticks[i]; var o = i === 0 ? tk[0] : bars[i - 1].c; var h = Math.max(o, Math.max.apply(null, tk)), l = Math.min(o, Math.min.apply(null, tk)); bars.push({ o: o, h: h, l: l, c: tk[SUB - 1] }); }
    var tf = [5, 15, 60][Math.floor(n() * 3)];
    return { id: def.id, def: def, seed: seed, bars: bars, ticks: ticks, atrUnit: unit, pip: pip, tf: tf, meta: { marks: tpl.path.marks, edge: tpl.edge ? { lo: base + (tpl.edge.lo - pts[0][1]) * scale * unit * pip, hi: base + (tpl.edge.hi - pts[0][1]) * scale * unit * pip, dir: tpl.edge.dir } : null, dir: tpl.dir || null } };
  };

  /* ---------- 指標（確定した足だけで計算） ---------- */
  Market.atr = function (bars, period) {
    period = period || Market.RULES.atrPeriod; var out = new Array(bars.length).fill(null); var tr = []; var a = null;
    for (var i = 0; i < bars.length; i++) { var b = bars[i]; var pc = i > 0 ? bars[i - 1].c : b.o; var v = Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc)); tr.push(v);
      if (i === period - 1) { var s = 0; for (var k = 0; k < period; k++) s += tr[k]; a = s / period; out[i] = a; } else if (i >= period) { a = (a * (period - 1) + v) / period; out[i] = a; } }
    return out;
  };
  // 見えている足（最後は形成中でもよい）から指標をまとめて計算
  Market.indicators = function (bars) {
    var closes = bars.map(function (b) { return b.c; }); var P = (CONFIG && CONFIG.ema && CONFIG.ema.periods) || [20, 30, 40];
    var M = (CONFIG && CONFIG.macd) || { fast: 6, slow: 13, signal: 4 }; var R = (CONFIG && CONFIG.rci && CONFIG.rci.period) || 9;
    return { ema: P.map(function (p) { return Indicators.ema(closes, p); }), periods: P, rci: Indicators.rci(closes, R), macd: Indicators.macd(closes, M.fast, M.slow, M.signal), atr: Market.atr(bars) };
  };
  // 上位足：基本の足 factor 本ずつまとめる（形成中の上位足は、見えている足だけで作る）
  Market.aggregate = function (bars, factor, offset) {
    var out = []; offset = offset || 0; for (var i = offset; i < bars.length; i += factor) { var seg = bars.slice(i, Math.min(bars.length, i + factor)); if (!seg.length) break; var h = -Infinity, l = Infinity; seg.forEach(function (b) { if (b.h > h) h = b.h; if (b.l < l) l = b.l; }); out.push({ o: seg[0].o, h: h, l: l, c: seg[seg.length - 1].c, partial: seg.length < factor }); }
    return out;
  };

  /* ---------- 検証（カテゴリーの条件） ---------- */
  function swings(bars, from, to, depth) { var hs = [], ls = []; for (var i = Math.max(from, depth); i <= Math.min(to, bars.length - 1 - depth); i++) { var isH = true, isL = true; for (var k = 1; k <= depth; k++) { if (bars[i - k].h > bars[i].h || bars[i + k].h > bars[i].h) isH = false; if (bars[i - k].l < bars[i].l || bars[i + k].l < bars[i].l) isL = false; } if (isH) hs.push(i); if (isL) ls.push(i); } return { hs: hs, ls: ls }; }
  Market.validate = function (s) {
    var bars = s.bars, cat = s.def.cat, fails = [];
    for (var i = 0; i < bars.length; i++) { var b = bars[i]; if (!(b.h >= Math.max(b.o, b.c) - 1e-9 && b.l <= Math.min(b.o, b.c) + 1e-9 && b.h >= b.l) || !isFinite(b.o + b.h + b.l + b.c) || b.l <= 0) { fails.push('ohlc@' + i); break; } if (i > 0 && Math.abs(b.o - bars[i - 1].c) > 1e-9) { fails.push('open@' + i); break; } }
    var ind = Market.indicators(bars.slice(0, LIVE0)); var A = ind.atr[LIVE0 - 1]; var e20 = ind.ema[0][LIVE0 - 1], e30 = ind.ema[1][LIVE0 - 1], e40 = ind.ema[2][LIVE0 - 1]; var c = bars[LIVE0 - 1].c;
    if (!(A > 0)) fails.push('atr');
    var hiW = function (f, t) { var m = -Infinity; for (var k = f; k <= t; k++) m = Math.max(m, bars[k].h); return m; }, loW = function (f, t) { var m = Infinity; for (var k = f; k <= t; k++) m = Math.min(m, bars[k].l); return m; };
    var closeRange = function (f, t) { var m1 = -Infinity, m2 = Infinity; for (var k = f; k <= t; k++) { m1 = Math.max(m1, bars[k].c); m2 = Math.min(m2, bars[k].c); } return { hi: m1, lo: m2, w: m1 - m2 }; };
    var rangeOk = function () { var cr = closeRange(258, 297); return cr.w <= 7 * A && cr.w >= 1.8 * A && Math.abs(ind.ema[0][297] - ind.ema[2][297]) <= 1.6 * A; };
    if (cat === 'trend_up' || cat === 'trend_down') { var dir = cat === 'trend_up' ? 1 : -1; if (!(dir * (e20 - e30) > 0 && dir * (e30 - e40) > 0)) fails.push('ema_order'); if (!(dir * (c - bars[HIST0].c) > 2.5 * A)) fails.push('net_move'); if (!(dir * (c - e40) > 0)) fails.push('vs_ema40'); }
    else if (cat === 'pullback_up' || cat === 'rally_down') { var d2 = cat === 'pullback_up' ? 1 : -1; var ext = d2 > 0 ? hiW(262, 299) : loW(262, 299); if (!(d2 * (e40 - ind.ema[2][LIVE0 - 61]) > 1.0 * A || d2 * (e30 - e40) > 0)) fails.push('trend_intact'); if (!(d2 * (ext - c) >= 0.9 * A)) fails.push('retrace'); if (!(d2 * (c - e40) > -2.2 * A)) fails.push('not_broken'); if (!(d2 * (ext - bars[200].c) > 3 * A)) fails.push('prior_trend'); }
    else if (cat === 'range') { if (!rangeOk()) fails.push('range'); }
    else if (cat === 'range_break') { if (!rangeOk()) fails.push('range'); var cr = closeRange(258, 297); var bd = s.meta.edge ? s.meta.edge.dir : 1; var ok = false; for (var k = LIVE0; k <= LIVE0 + 16; k++) { if (bd > 0 ? bars[k].c > cr.hi + 0.5 * A : bars[k].c < cr.lo - 0.5 * A) { ok = true; break; } } if (!ok) fails.push('no_break'); var c2 = bars[LIVE0 + 22].c; if (!(bd > 0 ? c2 > cr.hi - 0.3 * A : c2 < cr.lo + 0.3 * A)) fails.push('no_follow'); }
    else if (cat === 'fakeout') { var cr2 = closeRange(258, 297); var fd = s.meta.edge ? s.meta.edge.dir : 1; var poke = -1; for (var k2 = LIVE0; k2 <= LIVE0 + 16; k2++) { if (fd > 0 ? bars[k2].h > cr2.hi + 0.3 * A : bars[k2].l < cr2.lo - 0.3 * A) { poke = k2; break; } } if (poke < 0) fails.push('no_poke'); var back = false; for (var k3 = Math.max(LIVE0, poke); k3 <= LIVE0 + 28; k3++) if (fd > 0 ? bars[k3].c < (cr2.hi + cr2.lo) / 2 : bars[k3].c > (cr2.hi + cr2.lo) / 2) { back = true; break; } if (!back) fails.push('no_return'); }
    else if (cat === 'divergence') {
      var mk = s.meta.marks || {}; var ml = ind.macd.line; var dv = s.def.variant; var hidden = dv === 2 || dv === 3; var tp = [1, -1, 0, 0, 1, -1, 1, -1, 1, -1][dv]; var sgn = hidden ? (dv === 2 ? -1 : 1) : tp;   // 比べるのは山（+1）か谷（-1）か
      var ext = function (m) { var bi = m, best = sgn > 0 ? -Infinity : Infinity; for (var k = Math.max(0, m - 4); k <= Math.min(LIVE0 - 1, m + 4); k++) { var v0 = sgn > 0 ? bars[k].h : bars[k].l; if (sgn > 0 ? v0 > best : v0 < best) { best = v0; bi = k; } } return bi; };
      var momAt = function (bi) { var best = sgn > 0 ? -Infinity : Infinity; for (var k = Math.max(0, bi - 3); k <= Math.min(LIVE0 - 1, bi + 2); k++) { if (ml[k] === null) continue; if (sgn > 0 ? ml[k] > best : ml[k] < best) best = ml[k]; } return best; };
      var last = mk.p3 !== undefined ? 'p3' : 'p2'; var prev = last === 'p3' ? 'p2' : 'p1';
      if (mk[prev] === undefined || mk[last] === undefined) fails.push('marks'); else { var i1 = ext(mk[prev]), i2 = ext(mk[last]);
        if (!hidden) { var priceNew = sgn > 0 ? bars[i2].h > bars[i1].h : bars[i2].l < bars[i1].l; var momWeak = sgn > 0 ? momAt(i2) < momAt(i1) : momAt(i2) > momAt(i1); if (!priceNew) fails.push('no_new_extreme'); if (!momWeak) fails.push('no_div'); }
        else { var struct = sgn < 0 ? bars[i2].l > bars[i1].l : bars[i2].h < bars[i1].h; var deeper = sgn < 0 ? momAt(i2) < momAt(i1) : momAt(i2) > momAt(i1); if (!struct) fails.push('structure'); if (!deeper) fails.push('no_hidden_div'); } } }
    else if (cat === 'volatile') { var rgs = []; for (var k4 = 100; k4 < 190; k4++) rgs.push(bars[k4].h - bars[k4].l); rgs.sort(function (x, y) { return x - y; }); var medR = rgs[Math.floor(rgs.length / 2)]; var mx = 0; for (var k5 = 195; k5 < LIVE0 + 20; k5++) mx = Math.max(mx, bars[k5].h - bars[k5].l); var aAll = Market.atr(bars); var aMed = aAll.slice(100, 190).slice().sort(function (x, y) { return x - y; })[45]; var aMax = 0; for (var k6v = 195; k6v < LIVE0 + 20; k6v++) aMax = Math.max(aMax, aAll[k6v]); if (!(mx >= 2.6 * medR || aMax >= 1.5 * aMed)) fails.push('not_volatile'); }
    else if (cat === 'complex') { var flips = 0, prev = null; for (var k6 = 160; k6 < LIVE0; k6 += 2) { var o = ind.ema[0][k6] > ind.ema[2][k6] ? 1 : -1; if (prev !== null && o !== prev) flips++; prev = o; } var mtf = s.def.variant === 8; var wedge = s.def.variant === 6 || s.def.variant === 7; if (!(flips >= 1 || mtf || wedge)) fails.push('no_regime_change'); }
    // 共通：判断の時点で、値動きがある（動かないチャートにしない）・極端すぎない
    var liveR = 0; for (var k7 = LIVE0; k7 < LIVE0 + 14; k7++) liveR = Math.max(liveR, bars[k7].h - bars[k7].l); if (!(liveR > 0.3 * A && liveR < 12 * A)) fails.push('live_range');
    return { ok: !fails.length, fails: fails, atr: A };
  };

  // シナリオを作る（検証に通るまでシードを進める。最大 tries 回。通らなければ最後のものを ok:false で返す）
  Market.build = function (id, seed, tries) {
    var def = Market.def(id); if (!def) throw new Error('unknown scenario ' + id); tries = tries || 24; var s = null, v = null;
    for (var i = 0; i < tries; i++) { s = Market.generate(def, (seed + i * 7919) >>> 0); v = Market.validate(s); if (v.ok) { s.verified = true; s.tries = i + 1; return s; } }
    var pre = (root.MARKET_SEEDS || {})[id];   // 何度作っても条件に合わないとき：検証済みのシード（js/data/market-seeds.js）
    if (pre && pre.length) { var ps = pre[(seed >>> 0) % pre.length]; var s2 = Market.generate(def, ps); var v2 = Market.validate(s2); if (v2.ok) { s2.verified = true; s2.tries = tries + 1; s2.fallbackSeed = true; return s2; } }
    s.verified = false; s.fails = v.fails; s.tries = tries; return s;
  };

  // シナリオを選ぶ：opts { cats:{カテゴリー:重み}, diff:[最小,最大], avoid:[最近使ったID], rnd }
  //   技のテーマのカテゴリーを出やすくするが、ほかのカテゴリーも必ず混ぜる（テーマが「答え」にならないように）
  Market.pick = function (opts) {
    opts = opts || {}; var rnd = opts.rnd || Math.random; var L = Market.list(); var w = opts.cats || {}; var other = opts.otherWeight === undefined ? 0.45 : opts.otherWeight;
    var dmin = (opts.diff && opts.diff[0]) || 1, dmax = (opts.diff && opts.diff[1]) || 5; var avoid = {}; (opts.avoid || []).forEach(function (x) { avoid[x] = 1; });
    var themed = Object.keys(w).length ? rnd() >= other : false;
    var cands = L.filter(function (s) { return s.diff >= dmin && s.diff <= dmax && !avoid[s.id] && (themed ? w[s.cat] > 0 : true); });
    if (!cands.length) cands = L.filter(function (s) { return s.diff >= dmin && s.diff <= dmax; });
    if (themed) { var tot = 0; cands.forEach(function (s) { tot += w[s.cat]; }); var x = rnd() * tot; for (var i = 0; i < cands.length; i++) { x -= w[cands[i].cat]; if (x <= 0) return cands[i]; } }
    return cands[Math.floor(rnd() * cands.length)];
  };

  /* ---------- 損益の判定（TradeSettlementEngine） ----------
     entry: { bar, tick, side:'long'|'short' }（その足のそのティックで約定。tick は 0〜7）
     判定の順序：エントリーしたティックの「次のティック」から時刻順に1つずつ見る。
       1) 損切り：ロングは売値（bid）が損切り以下、ショートは買値（ask）が損切り以上 → その時点で決済
          ティックの間も価格は連続して動くとみなし、損切り価格からスリッページ（stopSlipPips）分だけ不利に約定。
          ただし1ティックで ATR×gapAtr（1.0）より大きく飛んだ急変（窓・急騰急落）で損切りを飛び越えたときは、そのティックの価格で約定（損切り価格より不利）
       2) 利確：ロングは売値が利確以上、ショートは買値が利確以下 → 利確価格で決済（指値なのでスリッページなし）
       1つのティックの価格は1つなので、同じティックで両方に届くことはない（ティックの道筋があるため）。
       ティックがなく OHLC しかないとき（Market.settleOHLC）は、同じ足で両方に届いたら「損切りが先」とみなす（保守的）
       3) 時間切れ：エントリーした足のあと maxBars 本目の足の終わりで、その時点の価格で決済
     損益（pips）＝ 決済価格 − 約定価格（ショートは逆）。約定はロング＝買値（中値＋スプレッド/2＋入口のスリッページ）、ショート＝売値。決済も売値／買値で計算（スプレッド込みのネット）
     ATR：エントリーした時点で確定している足（エントリーした足の1本前まで）の ATR(14) */
  Market.settle = function (s, entry, rules) {
    rules = Object.assign({}, Market.RULES, rules || {}); var P = s.pip; var half = rules.spreadPips * P / 2; var bars = s.bars, ticks = s.ticks; var side = entry.side; var sg = side === 'long' ? 1 : -1;
    var atr = Market.atr(bars.slice(0, entry.bar))[entry.bar - 1];
    var mid0 = ticks[entry.bar][entry.tick]; var slip = rules.entrySlipMaxPips * P * mulberry32((s.seed * 31 + entry.bar * 8 + entry.tick) >>> 0)();
    var entryPx = mid0 + sg * (half + slip);
    var sl = entryPx - sg * rules.slAtr * atr, tp = entryPx + sg * rules.tpAtr * atr;
    var lastBar = Math.min(bars.length - 1, entry.bar + rules.maxBars);
    var exit = null; var pm = mid0;
    for (var b = entry.bar; b <= lastBar && !exit; b++) {
      for (var k = (b === entry.bar ? entry.tick + 1 : 0); k < SUB; k++) {
        var m = ticks[b][k]; var px = m - sg * half;   // 決済に使う側の価格（ロング＝bid、ショート＝ask）
        var jump = Math.abs(m - pm) > (rules.gapAtr || 1.0) * atr; pm = m;
        if (sg * (px - sl) <= 0) { var gap = jump && sg * (sl - px) > rules.stopSlipPips * P; exit = { bar: b, tick: k, reason: 'sl', price: gap ? px : sl - sg * rules.stopSlipPips * P, gap: gap }; break; }
        if (sg * (px - tp) >= 0) { exit = { bar: b, tick: k, reason: 'tp', price: tp }; break; }
      }
    }
    if (!exit) { var lb = lastBar; exit = { bar: lb, tick: SUB - 1, reason: 'time', price: ticks[lb][SUB - 1] - sg * half }; }
    var pnl = sg * (exit.price - entryPx); var pips = pnl / P; var r = atr > 0 ? pnl / atr : 0;
    var outcome = Math.abs(r) < rules.flatAtr ? 'flat' : r > 0 ? 'profit' : 'loss';
    return { side: side, entry: { bar: entry.bar, tick: entry.tick, price: entryPx, mid: mid0 }, sl: sl, tp: tp, atr: atr, atrPips: atr / P, exit: exit, pnl: pnl, pips: Math.round(pips * 10) / 10, r: Math.round(r * 100) / 100, outcome: outcome, bars: exit.bar - entry.bar, rules: rules };
  };
  // ティックがない（OHLC だけの）ときの判定：同じ足で損切りと利確の両方に届いたら損切り（保守的）。足の中は始値から入ったものとみなす
  Market.settleOHLC = function (bars, entryBar, entryPx, side, atr, rules, pip) {
    rules = Object.assign({}, Market.RULES, rules || {}); pip = pip || Market.PIP; var sg = side === 'long' ? 1 : -1; var half = rules.spreadPips * pip / 2;
    var sl = entryPx - sg * rules.slAtr * atr, tp = entryPx + sg * rules.tpAtr * atr; var last = Math.min(bars.length - 1, entryBar + rules.maxBars);
    for (var b = entryBar + 1; b <= last; b++) { var hiPx = bars[b].h - sg * half, loPx = bars[b].l - sg * half; var hitSl = sg > 0 ? loPx <= sl : hiPx >= sl; var hitTp = sg > 0 ? hiPx >= tp : loPx <= tp;
      if (hitSl) return { reason: 'sl', bar: b, price: sl - sg * rules.stopSlipPips * pip, both: hitTp }; if (hitTp) return { reason: 'tp', bar: b, price: tp }; }
    return { reason: 'time', bar: last, price: bars[last].c - sg * half };
  };

  /* ---------- 判断時点の見立て（見えている足だけ） ----------
     返り値：トレンドの向きと強さ・EMA の並び・価格と EMA の位置・直近の高値安値の更新・RCI・MACD・ダイバージェンス・レンジ・ブレイク・
     ボラティリティ・上位足の向き・追いかけ（飛び乗り）か、と「どちらに有利か（bias）」「はっきりしているか（clarity 0〜1）」と理由の文 */
  Market.assess = function (bars, opts) {
    opts = opts || {}; var n = bars.length; var ind = Market.indicators(bars); var i = n - 1; var c = bars[i].c;
    var A = ind.atr[i] || ind.atr[i - 1] || 0.0001; var e = ind.ema.map(function (x) { return x[i]; });
    var order = e[0] > e[1] && e[1] > e[2] ? 1 : e[0] < e[1] && e[1] < e[2] ? -1 : 0;
    var slope = (e[1] - ind.ema[1][Math.max(0, i - 10)]) / A;   // EMA30 の10本での傾き（ATR 単位）
    var sw = swings(bars, Math.max(0, n - 70), n - 1, 3); var hs = sw.hs.slice(-3), ls = sw.ls.slice(-3);
    var dow = 0; if (hs.length >= 2 && ls.length >= 2) { var hh = bars[hs[hs.length - 1]].h > bars[hs[hs.length - 2]].h, hl = bars[ls[ls.length - 1]].l > bars[ls[ls.length - 2]].l; if (hh && hl) dow = 1; else if (!hh && !hl) dow = -1; }
    var hi40 = -Infinity, lo40 = Infinity; for (var k = Math.max(0, n - 41); k < n - 1; k++) { hi40 = Math.max(hi40, bars[k].h); lo40 = Math.min(lo40, bars[k].l); }
    var hi60 = -Infinity, lo60 = Infinity, cross = 0; for (var k8 = Math.max(1, n - 61); k8 < n - 1; k8++) { hi60 = Math.max(hi60, bars[k8].h); lo60 = Math.min(lo60, bars[k8].l); var e40a = ind.ema[2][k8], e40b = ind.ema[2][k8 - 1]; if (e40a !== null && e40b !== null && (bars[k8].c - e40a) * (bars[k8 - 1].c - e40b) < 0) cross++; }
    var slope40 = (e[2] - ind.ema[2][Math.max(0, i - 30)]) / A;   // EMA40 の30本での傾き（長めの流れ）
    var width = (hi60 - lo60) / A; var inRange = width <= 7.5 && Math.abs(slope40) < 1.2 && cross >= 3;   // 長めに見て：値幅が狭く、EMA40 が平らで、価格が EMA40 を何度もまたぐ
    var pos = (c - lo60) / Math.max(1e-9, hi60 - lo60);
    var brk = c > hi40 + 0.3 * A ? 1 : c < lo40 - 0.3 * A ? -1 : 0;
    var rci = ind.rci[i], rciPrev = ind.rci[Math.max(0, i - 2)]; var rciTurnUp = rci !== null && rciPrev !== null && rciPrev < -70 && rci > rciPrev + 10; var rciTurnDown = rci !== null && rciPrev !== null && rciPrev > 70 && rci < rciPrev - 10;
    var mh = ind.macd.hist[i], ml = ind.macd.line[i], ms = ind.macd.signal[i];
    var div = { bear: false, bull: false };
    if (hs.length >= 2) { var a1 = hs[hs.length - 2], a2 = hs[hs.length - 1]; if (bars[a2].h > bars[a1].h && ind.macd.line[a2] < ind.macd.line[a1]) div.bear = true; }
    if (ls.length >= 2) { var b1 = ls[ls.length - 2], b2 = ls[ls.length - 1]; if (bars[b2].l < bars[b1].l && ind.macd.line[b2] > ind.macd.line[b1]) div.bull = true; }
    var med = ind.atr.slice(Math.max(0, i - 60), i - 10).filter(function (x) { return x; }).sort(function (x, y) { return x - y; }); var medA = med.length ? med[Math.floor(med.length / 2)] : A; var volRatio = A / medA;
    var up = Market.aggregate(bars.slice(Math.max(0, n - 4 * 60)), 4); var ue = Indicators.ema(up.map(function (b) { return b.c; }), 20); var uDir = 0; var ui = up.length - 1; if (ue[ui] !== null && ue[Math.max(0, ui - 3)] !== null) uDir = up[ui].c > ue[ui] && ue[ui] > ue[ui - 3] ? 1 : up[ui].c < ue[ui] && ue[ui] < ue[ui - 3] ? -1 : 0;
    var dist = (c - e[0]) / A; var chase = Math.abs(dist) > 2.2;   // EMA20 から ATR の2.2倍以上離れている＝飛び乗り
    var nearEma = Math.abs(c - e[1]) <= 1.0 * A || (c - e[2]) * order >= 0 && Math.abs(c - e[0]) <= 0.8 * A;
    // 見立て：トレンド・ブレイク・レンジの端・ダイバージェンスの根拠を足し引きして、どちらが有利か
    var sc = 0, reasons = []; var tw = inRange ? 0.3 : 1;   // レンジの中では、短い間の EMA の並びや波の向きは当てにしない
    if (order !== 0) { sc += order * 1.2 * tw; reasons.push((order > 0 ? 'EMA が上昇の並び（20＞30＞40）' : 'EMA が下降の並び（20＜30＜40）') + (inRange ? '（レンジの中の短い動き）' : '')); }
    if (dow !== 0) { sc += dow * 1.0 * tw; reasons.push(dow > 0 ? '高値・安値が切り上がっている' : '高値・安値が切り下がっている'); }
    if (Math.abs(slope) >= 0.35) sc += (slope > 0 ? 1 : -1) * 0.6 * tw;
    if (uDir !== 0) { sc += uDir * 0.8 * tw; reasons.push(uDir > 0 ? '上位足も上向き' : '上位足も下向き'); }
    if (brk !== 0 && volRatio < 2.6) { sc += brk * 0.7; reasons.push(brk > 0 ? '直近の高値を上に抜けた' : '直近の安値を下に抜けた'); }
    if (inRange) { if (pos > 0.8) { sc -= 1.3; reasons.push('レンジの上限付近'); } else if (pos < 0.2) { sc += 1.3; reasons.push('レンジの下限付近'); } else reasons.push('レンジの中央付近（方向感がない）'); }
    if (div.bear) { sc -= 0.8; reasons.push('高値更新に MACD がついてこない（弱気の逆行）'); } if (div.bull) { sc += 0.8; reasons.push('安値更新に MACD がついてこない（強気の逆行）'); }
    if (rciTurnUp) { sc += 0.5; reasons.push('RCI が売られすぎから反転'); } if (rciTurnDown) { sc -= 0.5; reasons.push('RCI が買われすぎから反転'); }
    if (chase) reasons.push('価格が EMA から大きく離れている（飛び乗りになりやすい）');
    if (volRatio >= 2.0) reasons.push('値幅が普段の' + volRatio.toFixed(1) + '倍（急変動中）');
    var bias = sc >= 1.6 ? 'long' : sc <= -1.6 ? 'short' : 'none';
    var clarity = Math.max(0, Math.min(1, Math.abs(sc) / 4 - (volRatio >= 2.2 ? 0.2 : 0) - (chase ? 0.15 : 0)));
    if (bias === 'none') reasons.push('根拠がそろっていない（見送りも有力）');
    return { score: sc, bias: bias, clarity: clarity, order: order, slope: slope, slope40: slope40, crosses: cross, dow: dow, upperDir: uDir, inRange: inRange, rangePos: pos, rangeWidth: width, breakout: brk, rci: rci, rciTurnUp: rciTurnUp, rciTurnDown: rciTurnDown,
      macd: { line: ml, signal: ms, hist: mh }, div: div, volRatio: volRatio, chase: chase, nearEma: nearEma, distEma: dist, atr: A, price: c, reasons: reasons };
  };

  /* ---------- いま動くチャート（ChartSimulationEngine） ----------
     時刻（ミリ秒）からいま見えている足・ティックを決める。描画の速さ（フレームレート）には関係しない。判断は1回だけ受け付ける
     opts: { decideMs（判断時間）, barMs（判断中の1本の時間）, postBarMs（エントリー後の1本の時間）, startBar（最初の形成中の足） } */
  function Sim(s, opts) {
    opts = opts || {}; this.s = s; this.decideMs = opts.decideMs || 12000; this.barMs = opts.barMs || 850; this.postBarMs = opts.postBarMs || 260;
    this.bar0 = opts.startBar || LIVE0; this.t0 = null; this.paused = 0; this.pauseAt = null; this.state = 'idle'; this.pos = { bar: this.bar0, tick: 0 };
    this.decision = null; this.result = null; this.decidedAt = null; this.settledPos = null;
    this.maxDecideBars = Math.floor(this.decideMs / this.barMs) + 1;
  }
  Sim.prototype.start = function (now) { this.t0 = now; this.state = 'deciding'; this.update(now); return this; };
  Sim.prototype.pause = function (now) { if (this.pauseAt === null && this.state !== 'done') this.pauseAt = now; };
  Sim.prototype.resume = function (now) { if (this.pauseAt !== null) { this.paused += now - this.pauseAt; this.pauseAt = null; } };
  Sim.prototype.elapsed = function (now) { var p = this.paused + (this.pauseAt !== null ? now - this.pauseAt : 0); return Math.max(0, now - this.t0 - p); };
  Sim.prototype.timeLeft = function (now) { return this.state === 'deciding' ? Math.max(0, this.decideMs - this.elapsed(now)) : 0; };
  function posAt(bar0, ms, perBar) { var ticks = Math.floor(ms / (perBar / SUB)); return { bar: bar0 + Math.floor(ticks / SUB), tick: ticks % SUB }; }
  Sim.prototype.update = function (now) {
    if (this.state === 'idle' || this.state === 'done') return this.state;
    var el = this.elapsed(now);
    if (this.state === 'deciding') { if (el >= this.decideMs) { this.decide('skip', now, true); return this.state; } this.pos = posAt(this.bar0, el, this.barMs); }
    if (this.state === 'running') {
      var since = el - this.decidedAt; var d0 = this.decision.pos; var abs = d0.bar * SUB + d0.tick + Math.floor(since / (this.postBarMs / SUB));
      var end = this.result.exit.bar * SUB + this.result.exit.tick; if (abs >= end) { abs = end; this.state = 'settled'; this.settledAt = el; }
      this.pos = { bar: Math.floor(abs / SUB), tick: abs % SUB };
    }
    return this.state;
  };
  // 判断（1回だけ）：side 'long'|'short'|'skip'。2回目以降は無視して false
  Sim.prototype.decide = function (side, now, auto) {
    if (this.state !== 'deciding' || this.decision) return false;
    if (now !== undefined) { var el = this.elapsed(now); if (el < this.decideMs) this.pos = posAt(this.bar0, el, this.barMs); }
    this.decision = { side: side, pos: { bar: this.pos.bar, tick: this.pos.tick }, auto: !!auto, ms: now !== undefined ? this.elapsed(now) : 0 };
    this.decidedAt = now !== undefined ? this.elapsed(now) : 0;
    this.assessment = Market.assess(this.visibleBars(true));   // 判断した瞬間に見えていた足だけで見立てを記録（試験の採点・技の追加効果）
    if (side === 'skip') { this.state = 'done'; this.result = { outcome: 'skip', side: 'skip' }; return true; }
    this.result = Market.settle(this.s, { bar: this.pos.bar, tick: this.pos.tick, side: side });
    this.state = 'running'; return true;
  };
  Sim.prototype.finish = function () { if (this.state === 'settled') this.state = 'done'; return this.state; };
  // いま見えている足（最後は形成中：見えているティックまで）。closedOnly で形成中の足を含めない
  Sim.prototype.visibleBars = function (includePartial) {
    var s = this.s; var p = this.pos; var out = s.bars.slice(0, p.bar);
    if (includePartial !== false) { var tk = s.ticks[p.bar].slice(0, p.tick + 1); var o = p.bar > 0 ? s.bars[p.bar - 1].c : tk[0]; out.push({ o: o, h: Math.max(o, Math.max.apply(null, tk)), l: Math.min(o, Math.min.apply(null, tk)), c: tk[tk.length - 1], partial: p.tick < SUB - 1 }); }
    return out;
  };
  Sim.prototype.price = function () { return this.s.ticks[this.pos.bar][this.pos.tick]; };
  Market.Sim = Sim;

  root.Market = Market;
  if (typeof module !== 'undefined' && module.exports) module.exports = Market;
})(typeof window !== 'undefined' ? window : globalThis);
