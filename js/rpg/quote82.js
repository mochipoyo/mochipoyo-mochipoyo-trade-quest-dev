/* =========================================================
   RPG / Quote82（v8.2）：円形ティックテープ（トレディアの広場・証券市場・アズール大洋）が映す「学習用相場」の値
   ・依頼（2026-11-07 14:39）：「既存の学習用マーケットに接続できればその値、町・屋内・海上で一致」「『学習用相場』表示」
     「リアルタイム API・鍵・課金・外部スクレイピング不可、データなしは DEMO モード明示」
   ・値の元：証券市場の大きな板（js/ui/tradia.js の boardMarket）と同じ人工データの作り方（js/rpg/leverage.js の Leverage.market：相場の種類＋シード）。
     銘柄ごとに種類とシードを変え、基準の値に合わせて写す。実在の相場・実際の値動きではない（外の通信は一切しない）
   ・時間：ゲームの歩数（State.data.steps）で決める（400 歩で 1 日・25 歩ごとに値が進む）。同じ時点なら、どこで見ても同じ値（町・屋内・海上で一致）
   ・Leverage が読めないとき：DEMO（決まった形の波。画面に「DEMO」）
   ・2D 版・3D 版で同じ（DOM に依存しない。Node でもテストできる）
   ========================================================= */
(function (root) {
  'use strict';
  var Q = root.Quote82 = { VERSION: 1 };
  Q.SYMS = [
    { id: 'USDJPY', name: 'USD/JPY', base: 150, dec: 3, vol: 1.0 }, { id: 'GBPJPY', name: 'GBP/JPY', base: 190, dec: 3, vol: 1.3 }, { id: 'EURUSD', name: 'EUR/USD', base: 1.08, dec: 5, vol: 0.8 },
    { id: 'XAU', name: '金（XAU）', base: 2350, dec: 1, vol: 1.6 },
    { id: 'TRD', name: 'トレディア財団', base: 1840, dec: 0, vol: 2.2, stock: true }, { id: 'NODE', name: 'ノード演算', base: 7720, dec: 0, vol: 2.6, stock: true },
    { id: 'POYO', name: 'ポヨ村農協', base: 320, dec: 0, vol: 1.8, stock: true }, { id: 'AERIA', name: 'アエリア浮力炉', base: 5110, dec: 0, vol: 3.0, stock: true }
  ];
  Q.LABEL = '学習用相場'; Q.NOTE = 'ゲーム内の人工データ（実際の相場ではありません）'; Q.DEMO_LABEL = 'DEMO（学習用データなし）';
  var mk = {}; var last = null;
  function market(type, seed) { var k = type + ':' + seed; if (!mk[k]) { mk[k] = root.Leverage.market(type, seed); var ks = Object.keys(mk); if (ks.length > 64) delete mk[ks[0]]; } return mk[k]; }
  Q.time = function () { var d = root.State && root.State.data; var steps = (d && d.steps) || 0; return { day: Math.floor(steps / 400), sub: Math.floor((steps % 400) / 25) }; };
  // いまの値（同じ時点なら同じ物を返す。version は値が変わるたびに変わる）
  Q.snapshot = function () {
    var tm = Q.time(); var key = tm.day + ':' + tm.sub; if (last && last.key === key) return last;
    var LV = root.Leverage; var demo = !(LV && LV.market && root.Scenarios && root.Scenarios._internal && root.Indicators);
    var types = demo ? [] : LV.TYPES.map(function (t) { return t.id; }).filter(function (t) { return t !== 'gap'; });
    var items = Q.SYMS.map(function (s, i) {
      var r0, r1;
      if (demo) { var a = (tm.day * 16 + tm.sub) * 0.21 + i * 1.7; r1 = 1 + 0.004 * Math.sin(a) + 0.002 * Math.sin(a * 2.3); r0 = 1 + 0.004 * Math.sin(a - 0.21 * tm.sub) + 0.002 * Math.sin((a - 0.21 * tm.sub) * 2.3); }
      else { var m = market(types[(tm.day + i * 2) % types.length], 20260000 + tm.day * 13 + i * 977); var s0 = m.start; var idx = Math.min(m.bars.length - 1, s0 + tm.sub * 4); r0 = m.bars[s0].c / 150; r1 = m.bars[idx].c / 150; }
      var p0 = s.base * Math.pow(r0, s.vol), p1 = s.base * Math.pow(r1, s.vol); var f = Math.pow(10, s.dec);
      var price = Math.round(p1 * f) / f, chg = Math.round((p1 - p0) * f) / f;
      return { id: s.id, name: s.name, price: price, chg: chg, pct: Math.round((p1 / p0 - 1) * 10000) / 100, dec: s.dec, stock: !!s.stock };
    });
    last = { key: key, version: key + (demo ? ':demo' : ''), day: tm.day, sub: tm.sub, demo: demo, label: demo ? Q.DEMO_LABEL : Q.LABEL, note: Q.NOTE, items: items };
    return last;
  };
  Q.fmt = function (it) { var p = it.price.toFixed(it.dec); var c = (it.chg >= 0 ? '▲+' : '▼−') + Math.abs(it.chg).toFixed(it.dec);   // 色だけでなく矢印と符号でも上げ下げが分かる return { name: it.name, price: p, chg: c, up: it.chg >= 0 }; };
})(typeof window !== 'undefined' ? window : globalThis);
