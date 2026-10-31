/* =========================================================
   UI / Casino (v6.1) : カジノの画面（両替・スロット・ルーレット・ハイ＆ロー・景品交換）
   ・ゲームの結果はすべて js/rpg/casino.js が決める（画面は表示だけ）
   ・どの画面にも「当たる確率・払い戻し・期待値（理論値）」を表示する
   ・キー操作：決定＝回す／配る、メニュー（Esc）＝閉じる。スマホはボタンをタップ
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win, State = root.State; var esc = Win.esc;
  var CasinoUI = {};
  function Cs() { return root.Casino; }
  function pct(p, d) { return (p * 100).toFixed(d === undefined ? 1 : d) + '%'; }
  function sgn(v, d) { return (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(d === undefined ? 1 : d) + '%'; }
  function coinBar() { return '<div class="cs-coins">コイン <b data-coins>' + Cs().coins() + '</b> 枚<span class="muted small">　所持金 ' + State.data.gold + 'G</span></div>'; }
  function refreshCoins(node) { node.querySelectorAll('[data-coins]').forEach(function (e) { e.textContent = Cs().coins(); }); }
  function sfx(k) { if (root.Audio) root.Audio.sfx(k); }

  /* ---------- 両替 ---------- */
  CasinoUI.exchange = async function () {
    var d = State.data; var P = Cs().COIN_PRICE;
    while (true) {
      var opts = [10, 50, 100, 500, 1000].map(function (n) { return { label: n + '枚', right: n * P + 'G', disabled: d.gold < n * P }; });
      var i = await Win.list(opts, { title: 'コインの交換（1枚 ' + P + 'G）　所持金 ' + d.gold + 'G／コイン ' + Cs().coins() + '枚', footer: '<span class="muted small">コインはカジノの中だけで使える専用のコインです。ゴールドに戻すことはできません。</span>' });
      if (i < 0) return;
      var n = [10, 50, 100, 500, 1000][i]; var r = Cs().buyCoins(n);
      if (!r.ok) { await Win.message([r.reason + '。']); continue; }
      sfx('coin'); await Win.message([n + '枚のコインを受け取った。（' + r.cost + 'G）']);
    }
  };

  /* ---------- スロット ---------- */
  var SYM_SVG = {
    seven: '<svg viewBox="0 0 40 40"><text x="20" y="31" text-anchor="middle" font-size="30" font-weight="900" fill="#e8343a" stroke="#fff3c0" stroke-width="1.5">7</text></svg>',
    bar: '<svg viewBox="0 0 40 40"><rect x="3" y="13" width="34" height="14" rx="3" fill="#1a1a24" stroke="#ffd24a" stroke-width="2"/><text x="20" y="24.5" text-anchor="middle" font-size="10" font-weight="900" fill="#ffd24a">BAR</text></svg>',
    bell: '<svg viewBox="0 0 40 40"><path d="M20 6c-7 0-10 6-10 13v6l-4 5h28l-4-5v-6c0-7-3-13-10-13z" fill="#ffc83a" stroke="#a07010" stroke-width="1.5"/><circle cx="20" cy="33" r="3.5" fill="#a07010"/></svg>',
    cherry: '<svg viewBox="0 0 40 40"><path d="M20 6c-2 8-8 12-10 18M20 6c3 7 6 12 8 17" stroke="#2f8a3a" stroke-width="2.5" fill="none"/><circle cx="11" cy="27" r="7" fill="#d8222e"/><circle cx="28" cy="26" r="7" fill="#e8343a"/><circle cx="9" cy="25" r="2" fill="#ff9aa0"/></svg>',
    slime: '<svg viewBox="0 0 40 40"><path d="M20 5c-3 6-14 12-14 21 0 6 6 9 14 9s14-3 14-9c0-9-11-15-14-21z" fill="#4aa8ff" stroke="#1a5aa8" stroke-width="1.5"/><circle cx="15" cy="23" r="2.4" fill="#123"/><circle cx="25" cy="23" r="2.4" fill="#123"/><path d="M15 29q5 4 10 0" stroke="#123" stroke-width="1.6" fill="none"/></svg>',
    blank: '<svg viewBox="0 0 40 40"></svg>'
  };
  CasinoUI.symbol = function (k) { return SYM_SVG[k] || ''; };
  CasinoUI.slot = function () {
    var T = Cs().slotTable(); var S = Cs().SLOT; var bet = S.BETS[0]; var spinning = false;
    var pay = T.rows.map(function (r) { return '<tr><td>' + esc(r.label) + '</td><td>×' + r.mult + '</td><td>' + (r.prob < 0.001 ? (r.prob * 100).toFixed(4) : (r.prob * 100).toFixed(2)) + '%</td><td>' + (r.contrib * 100).toFixed(2) + '%</td></tr>'; }).join('');
    var html = '<div class="rw-title">スロット「ドリームリール」</div>' + coinBar() +
      '<div class="cs-reels"><div class="cs-reel" data-r="0"></div><div class="cs-reel" data-r="1"></div><div class="cs-reel" data-r="2"></div><div class="cs-line"></div></div>' +
      '<div class="cs-msg" data-msg>賭ける枚数を選んで「回す」（決定キーでも回せます）</div>' +
      '<div class="cs-row">' + S.BETS.map(function (b) { return '<button class="cs-btn bet" data-bet="' + b + '">' + b + '枚</button>'; }).join('') + '<button class="cs-btn go" data-spin>回す</button></div>' +
      '<details class="cs-det" open><summary>配当表と確率（理論値）</summary><table class="tbl cs-tbl"><tr><th>役（中央の1ライン）</th><th>払い戻し</th><th>確率</th><th>還元への寄与</th></tr>' + pay + '</table>' +
      '<p class="small">各リールは20コマ（７×1・BAR×2・ベル×3・スライム×4・チェリー×3・空白×7）で、止まる位置は20通りから等確率。3本は独立。<br>払い戻しの期待値（還元率）＝ <b>' + pct(T.rtp, 2) + '</b>。1回あたりの期待値は賭け金の <b>' + sgn(T.ev, 2) + '</b>。何か当たる確率は ' + pct(T.hit) + '。</p></details>' +
      '<div class="cs-hist" data-hist></div>' +
      '<div class="rw-row"><div class="rw-btn" data-close>やめる（Esc）</div></div>';
    return Win.panel(html, { cls: 'casino-panel', noClose: true, onCancel: function () { if (!spinning && CasinoUI._close) CasinoUI._close(); }, onOk: function () { if (CasinoUI._spin) CasinoUI._spin(); }, setup: function (node, close) {
      CasinoUI._close = function () { CasinoUI._close = null; CasinoUI._spin = null; close(0); };
      var reels = node.querySelectorAll('.cs-reel'); var msg = node.querySelector('[data-msg]');
      function show(i, k) { reels[i].innerHTML = SYM_SVG[k]; reels[i].setAttribute('data-sym', k); }
      [0, 1, 2].forEach(function (i) { show(i, S.STRIP[(i * 7) % S.STRIP.length]); });
      function setBet(b) { bet = b; node.querySelectorAll('[data-bet]').forEach(function (e) { e.classList.toggle('on', +e.getAttribute('data-bet') === b); }); }
      function hist() { var h = Cs().state().history.slot.slice(0, 8); var st = Cs().stats().slot; node.querySelector('[data-hist]').innerHTML = (st ? '<div class="small">これまで：' + st.plays + '回・賭けた ' + st.bet + '枚・払い戻し ' + st.paid + '枚（実際の還元 ' + (st.bet ? pct(st.paid / st.bet) : '―') + '）</div>' : '') + (h.length ? '<div class="small muted">最近の結果：' + h.map(function (x) { return x.reels.map(function (k) { return S.NAME[k].replace('（空白）', '－'); }).join('・') + (x.payout ? '→+' + x.payout : ''); }).join('　') + '</div>' : ''); }
      setBet(bet); hist();
      CasinoUI._spin = function () {
        if (spinning) return; var r = Cs().slotSpin(bet); if (!r.ok) { msg.textContent = r.reason + '（両替所でコインを交換できます）'; return; }
        spinning = true; refreshCoins(node); node.querySelector('.cs-coins b').textContent = Cs().coins() + bet - r.payout; msg.textContent = '回転中……'; node.classList.remove('cs-win');
        var t0 = performance.now(); var stopAt = [700, 1050, 1400]; var off = [0, 5, 11];
        (function tick() {
          var t = performance.now() - t0; var done = 0;
          for (var i = 0; i < 3; i++) { if (t < stopAt[i]) show(i, S.STRIP[(Math.floor(t / 60) + off[i]) % S.STRIP.length]); else { show(i, r.reels[i]); done++; } }
          if (done < 3) return requestAnimationFrame(tick);
          spinning = false; refreshCoins(node);
          if (r.payout) { node.classList.add('cs-win'); sfx(r.win.mult >= 25 ? 'win' : 'coin'); msg.innerHTML = '<b>' + esc(r.win.label) + '</b>！ ' + r.payout + '枚の払い戻し（賭け ' + bet + '枚）'; }
          else msg.textContent = 'はずれ（賭け ' + bet + '枚）';
          hist();
        })();
      };
      node.addEventListener('click', function (e) {
        var b = e.target.closest('[data-bet]'); if (b && !spinning) { setBet(+b.getAttribute('data-bet')); return; }
        if (e.target.closest('[data-spin]')) { CasinoUI._spin(); return; }
        if (e.target.closest('[data-close]') && !spinning) CasinoUI._close();
      });
    } });
  };

  /* ---------- ルーレット（ヨーロピアン：0〜36） ---------- */
  var WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  function wheelSvg() {
    var s = '<svg viewBox="-110 -110 220 220" class="cs-wheel-svg"><g class="cs-wheel-rot">'; var n = WHEEL.length; var a = Math.PI * 2 / n;
    WHEEL.forEach(function (num, i) {
      var a0 = i * a - Math.PI / 2 - a / 2, a1 = a0 + a; var r = 100, r2 = 62;
      var p = 'M' + (Math.cos(a0) * r2).toFixed(1) + ' ' + (Math.sin(a0) * r2).toFixed(1) + ' L' + (Math.cos(a0) * r).toFixed(1) + ' ' + (Math.sin(a0) * r).toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + (Math.cos(a1) * r).toFixed(1) + ' ' + (Math.sin(a1) * r).toFixed(1) + ' L' + (Math.cos(a1) * r2).toFixed(1) + ' ' + (Math.sin(a1) * r2).toFixed(1) + ' Z';
      var col = Cs().colorOf(num); s += '<path d="' + p + '" fill="' + (col === 'red' ? '#c8262e' : col === 'green' ? '#1f8a3a' : '#1a1a22') + '" stroke="#d8b860" stroke-width=".6"/>';
      var am = a0 + a / 2; s += '<text x="' + (Math.cos(am) * 86).toFixed(1) + '" y="' + (Math.sin(am) * 86 + 3).toFixed(1) + '" font-size="8" fill="#fff" text-anchor="middle" transform="rotate(' + ((am * 180 / Math.PI) + 90).toFixed(1) + ' ' + (Math.cos(am) * 86).toFixed(1) + ' ' + (Math.sin(am) * 86).toFixed(1) + ')">' + num + '</text>';
    });
    s += '<circle r="60" fill="#5a3a1a" stroke="#d8b860" stroke-width="2"/><circle r="18" fill="#d8b860"/></g><path d="M0 -106 L-6 -118 L6 -118 Z" fill="#fff4c8"/></svg>';
    return s;
  }
  CasinoUI.roulette = function () {
    var type = 'red', num = 17, bet = 1, spinning = false, rot = 0;
    var TYPES = [['red', '赤'], ['black', '黒'], ['odd', '奇数'], ['even', '偶数'], ['low', '1〜18'], ['high', '19〜36'], ['d1', '1〜12'], ['d2', '13〜24'], ['d3', '25〜36'], ['number', '数字1つ']];
    var grid = ''; for (var i = 0; i <= 36; i++) grid += '<button class="cs-num c-' + Cs().colorOf(i) + '" data-num="' + i + '">' + i + '</button>';
    var html = '<div class="rw-title">ルーレット（ヨーロピアン 0〜36）</div>' + coinBar() +
      '<div class="cs-rl"><div class="cs-wheel">' + wheelSvg() + '<div class="cs-ball" data-ball></div></div><div class="cs-rl-side">' +
      '<div class="small gold-text">賭け方</div><div class="cs-row wrap">' + TYPES.map(function (t) { return '<button class="cs-btn t" data-type="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="cs-grid" data-grid>' + grid + '</div>' +
      '<div class="small gold-text">賭け額</div><div class="cs-row">' + Cs().ROULETTE_BETS.map(function (b) { return '<button class="cs-btn bet" data-bet="' + b + '">' + b + '</button>'; }).join('') + '</div>' +
      '<div class="cs-ev" data-ev></div><div class="cs-row"><button class="cs-btn go" data-spin>回す（決定キー）</button></div></div></div>' +
      '<div class="cs-msg" data-msg></div><div class="cs-hist" data-hist></div>' +
      '<p class="small muted">どの賭け方も、当たる確率×払い戻し＝36/37。だから期待値は賭け方によらず −1/37（約 −2.7%）。0 が出ると、赤・黒・奇数・偶数などはすべて負け。</p>' +
      '<div class="rw-row"><div class="rw-btn" data-close>やめる（Esc）</div></div>';
    return Win.panel(html, { cls: 'casino-panel', noClose: true, onCancel: function () { if (!spinning && CasinoUI._close) CasinoUI._close(); }, onOk: function () { if (CasinoUI._spin) CasinoUI._spin(); }, setup: function (node, close) {
      CasinoUI._close = function () { CasinoUI._close = null; CasinoUI._spin = null; close(0); };
      var msg = node.querySelector('[data-msg]'); var rotG = node.querySelector('.cs-wheel-rot');
      function upd() {
        node.querySelectorAll('[data-type]').forEach(function (e) { e.classList.toggle('on', e.getAttribute('data-type') === type); });
        node.querySelectorAll('[data-num]').forEach(function (e) { e.classList.toggle('on', type === 'number' && +e.getAttribute('data-num') === num); });
        node.querySelectorAll('[data-bet]').forEach(function (e) { e.classList.toggle('on', +e.getAttribute('data-bet') === bet); });
        node.querySelector('[data-grid]').classList.toggle('dim', type !== 'number');
        var b = Cs().rouletteBet(type, num); node.querySelector('[data-ev]').innerHTML = '<b>' + esc(b.label) + '</b>：当たる数字 ' + b.covers.length + '/37（' + pct(b.prob) + '）、当たれば賭け金の ' + b.mult + '倍が戻る（もうけ ' + (b.mult - 1) + '倍）<br>期待値：' + pct(b.prob) + ' × ' + b.mult + ' − 1 ＝ <b>' + sgn(b.ev, 2) + '</b>';
      }
      function hist() { var h = Cs().state().history.roulette; var reds = h.filter(function (x) { return x.color === 'red'; }).length, blacks = h.filter(function (x) { return x.color === 'black'; }).length, zeros = h.filter(function (x) { return x.n === 0; }).length;
        node.querySelector('[data-hist]').innerHTML = h.length ? '<div class="small">過去の結果（新しい順）：</div><div class="cs-chips">' + h.slice(0, 30).map(function (x) { return '<span class="cs-chip c-' + x.color + '">' + x.n + '</span>'; }).join('') + '</div><div class="small muted">直近' + h.length + '回：赤 ' + reds + '・黒 ' + blacks + '・0 ' + zeros + '（前の結果は次の結果に影響しない）</div>' : ''; }
      upd(); hist();
      CasinoUI._spin = function () {
        if (spinning) return; var r = Cs().rouletteSpin(type, num, bet); if (!r.ok) { msg.textContent = r.reason + '（両替所でコインを交換できます）'; return; }
        spinning = true; msg.textContent = '回転中……'; node.querySelector('.cs-coins b').textContent = Cs().coins() - r.payout;
        var idx = WHEEL.indexOf(r.n); var target = -(idx * 360 / 37); rot = rot - (rot % 360) - 360 * 5 + target; rotG.style.transition = 'transform 2.2s cubic-bezier(.15,.7,.2,1)'; rotG.style.transform = 'rotate(' + rot + 'deg)';
        setTimeout(function () { spinning = false; refreshCoins(node); var cn = r.color === 'red' ? '赤' : r.color === 'black' ? '黒' : '緑';
          if (r.hit) { sfx(r.bet.mult >= 36 ? 'win' : 'coin'); msg.innerHTML = '<b>' + r.n + '（' + cn + '）</b>！ 当たり：' + r.payout + '枚の払い戻し'; } else msg.innerHTML = '<b>' + r.n + '（' + cn + '）</b>。はずれ（' + esc(r.bet.label) + 'に ' + bet + '枚）';
          hist(); }, 2300);
      };
      node.addEventListener('click', function (e) {
        if (spinning) return; var t = e.target.closest('[data-type]'); if (t) { type = t.getAttribute('data-type'); upd(); return; }
        var n = e.target.closest('[data-num]'); if (n) { num = +n.getAttribute('data-num'); type = 'number'; upd(); return; }
        var b = e.target.closest('[data-bet]'); if (b) { bet = +b.getAttribute('data-bet'); upd(); return; }
        if (e.target.closest('[data-spin]')) { CasinoUI._spin(); return; }
        if (e.target.closest('[data-close]')) CasinoUI._close();
      });
    } });
  };

  /* ---------- ハイ＆ロー ---------- */
  function cardHtml(c, back) { if (back) return '<div class="cs-card back"></div>'; var red = c.s === 1 || c.s === 2; return '<div class="cs-card' + (red ? ' red' : '') + '"><span>' + esc(Cs().cardLabel(c)) + '</span></div>'; }
  CasinoUI.card = function () {
    var bet = Cs().CARD_BETS[0], cur = null, busy = false;
    var html = '<div class="rw-title">ハイ＆ロー</div>' + coinBar() +
      '<p class="small">表の1枚を見て、残りの51枚から引く次の1枚が「上（ハイ）」か「下（ロー）」かを当てる。同じ数字は負け。A が最小、K が最大。<br>払い戻しの倍率＝0.95÷当たる確率（小数第1位で切り捨て）。賭けは10枚単位なので、倍率どおりに払い戻されます。どちらを選んでも期待値はマイナス（約 −5%〜）です。</p>' +
      '<div class="cs-cards"><div data-c1>' + cardHtml(null, true) + '</div><div class="cs-vs">→</div><div data-c2>' + cardHtml(null, true) + '</div></div>' +
      '<div class="cs-odds" data-odds></div>' +
      '<div class="small gold-text">賭け額</div><div class="cs-row">' + Cs().CARD_BETS.map(function (b) { return '<button class="cs-btn bet" data-bet="' + b + '">' + b + '</button>'; }).join('') + '</div>' +
      '<div class="cs-row"><button class="cs-btn go" data-deal>札を配る（決定キー）</button><button class="cs-btn hi" data-dir="high">ハイ</button><button class="cs-btn lo" data-dir="low">ロー</button></div>' +
      '<div class="cs-msg" data-msg></div><div class="cs-hist" data-hist></div><div class="rw-row"><div class="rw-btn" data-close>やめる（Esc）</div></div>';
    return Win.panel(html, { cls: 'casino-panel', noClose: true, onCancel: function () { if (!busy && CasinoUI._close) CasinoUI._close(); }, onOk: function () { if (!cur && CasinoUI._deal) CasinoUI._deal(); }, onKey: function (k) { if (cur && (k === 'up' || k === 'down') && CasinoUI._guess) CasinoUI._guess(k === 'up' ? 'high' : 'low'); }, setup: function (node, close) {
      CasinoUI._close = function () { CasinoUI._close = null; CasinoUI._deal = null; CasinoUI._guess = null; close(0); };
      var msg = node.querySelector('[data-msg]');
      function upd() {
        node.querySelectorAll('[data-bet]').forEach(function (e) { e.classList.toggle('on', +e.getAttribute('data-bet') === bet); });
        node.querySelector('[data-deal]').disabled = !!cur; node.querySelectorAll('[data-dir]').forEach(function (e) { var o = cur && cur.odds[e.getAttribute('data-dir')]; e.disabled = !cur || !o || o.mult <= 0; });
        if (!cur) { node.querySelector('[data-odds]').innerHTML = ''; return; }
        var o = cur.odds; function row(k, lab) { var x = o[k]; return '<tr><td>' + lab + '</td><td>' + x.count + '/51（' + pct(x.prob) + '）</td><td>' + (x.mult > 0 ? '×' + x.mult.toFixed(1) : '―') + '</td><td>' + (x.mult > 0 ? sgn(x.ev) : '―') + '</td></tr>'; }
        node.querySelector('[data-odds]').innerHTML = '<table class="tbl cs-tbl"><tr><th>予想</th><th>当たる確率</th><th>払い戻し</th><th>期待値</th></tr>' + row('high', 'ハイ（↑）') + row('low', 'ロー（↓）') + '</table><div class="small muted">同じ数字（3/51＝' + pct(o.same) + '）はどちらも負け。</div>';
      }
      function hist() { var h = Cs().state().history.card.slice(0, 8); node.querySelector('[data-hist]').innerHTML = h.length ? '<div class="small muted">最近：' + h.map(function (x) { return x.first + '→' + x.next + (x.payout ? '（+' + x.payout + '）' : '（×）'); }).join('　') + '</div>' : ''; }
      CasinoUI._deal = function () { if (cur || busy) return; cur = Cs().cardDeal(); node.querySelector('[data-c1]').innerHTML = cardHtml(cur.first); node.querySelector('[data-c2]').innerHTML = cardHtml(null, true); msg.textContent = 'ハイ（↑）かロー（↓）を選ぶ'; sfx('select'); upd(); };
      CasinoUI._guess = function (dir) {
        if (!cur || busy) return; var r = Cs().cardGuess(dir, bet); if (!r.ok) { msg.textContent = r.reason + '（両替所でコインを交換できます）'; return; }
        busy = true; refreshCoins(node); node.querySelector('[data-c2]').innerHTML = cardHtml(r.next);
        if (r.hit) { sfx('coin'); msg.innerHTML = '当たり！ ' + r.payout + '枚の払い戻し（×' + r.mult.toFixed(1) + '）'; } else msg.textContent = 'はずれ（賭け ' + bet + '枚）';
        cur = null; busy = false; upd(); hist();
      };
      upd(); hist();
      node.addEventListener('click', function (e) {
        var b = e.target.closest('[data-bet]'); if (b) { bet = +b.getAttribute('data-bet'); upd(); return; }
        if (e.target.closest('[data-deal]')) { CasinoUI._deal(); return; }
        var dd = e.target.closest('[data-dir]'); if (dd) { CasinoUI._guess(dd.getAttribute('data-dir')); return; }
        if (e.target.closest('[data-close]') && !busy) CasinoUI._close();
      });
    } });
  };

  /* ---------- 景品交換所 ---------- */
  CasinoUI.prizes = async function (list) {
    while (true) {
      var items = list.map(function (p) { var it = root.ITEMS[p.item]; return { label: it.name, right: p.cost.toLocaleString() + '枚', disabled: Cs().coins() < p.cost, sub: it.desc || '' }; });
      var i = await Win.list(items, { title: '景品交換所（コイン ' + Cs().coins().toLocaleString() + '枚）', info: function (k) { var it = root.ITEMS[list[k].item]; return '<div class="small">' + esc(it.desc || '') + '</div>' + (list[k].lore ? '<div class="small muted">' + esc(list[k].lore) + '</div>' : ''); } });
      if (i < 0) return;
      var p = list[i]; var it = root.ITEMS[p.item];
      var a = await Win.choice(it.name + 'を ' + p.cost.toLocaleString() + '枚のコインと交換しますか？', ['交換する', 'やめる']); if (a !== 0) continue;
      var r = Cs().exchange(p); if (!r.ok) { await Win.message([r.reason + '。']); continue; }
      sfx('chest'); await Win.message([it.name + 'を手に入れた！（残り ' + r.coins.toLocaleString() + '枚）', '装備は「そうび」から。']);
    }
  };
  root.CasinoUI = CasinoUI;
})(typeof window !== 'undefined' ? window : globalThis);
