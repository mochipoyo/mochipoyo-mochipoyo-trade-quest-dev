/* =========================================================
   UI / Sidebar (v4.4) : PC版の常設メニュー（画面右）と操作方法（画面下）
   ・幅1100px以上かつマウス操作の環境でだけ表示（スマホ・タブレットは従来どおり仮想パッド）
   ・ボタンは探索中（会話・戦闘・メニュー中でない）にだけ反応する。中身は従来のメニュー機能を呼ぶだけ
   ========================================================= */
(function (root) {
  'use strict';
  var Sidebar = { el: null, timer: null };
  var ITEMS = [
    ['ステータス', function () { return root.Menu.status(); }], ['どうぐ', function () { return root.Menu.items(); }], ['そうび', function () { return root.Menu.equip(); }],
    ['じゅもん・とくぎ', function () { return root.Menu.skills(); }], ['なかま', function () { return root.Menu.party(); }], ['クエスト', function () { return root.Menu.quests(); }],
    ['図鑑', function () { return root.Menu.encyclopedia(); }], ['トレード修行', function () { return root.Menu.training(); }], ['ワールドマップ', 'map'], ['セーブ', function () { return root.Menu.save(); }], ['設定', function () { return root.Menu.settings(); }]
  ];
  function esc(s) { return root.Win ? root.Win.esc(s) : String(s); }
  Sidebar.isPC = function () { return root.innerWidth >= 1100 && root.matchMedia && root.matchMedia('(pointer: fine)').matches; };
  Sidebar.canOpen = function () { var W = root.World, S = root.State; return !!(S.data && W.map && !W.busy && root.Engine.top() === W.scene); };
  Sidebar.run = function (item) {
    if (!Sidebar.canOpen()) { if (root.Win) root.Win.toast('今は開けません（会話・戦闘・画面を閉じてから）'); return; }
    var W = root.World, S = root.State;
    if (item[1] === 'map') { root.Engine.Input.press('map'); return; }
    W.busy = true;
    Promise.resolve().then(function () { return item[1](); }).catch(function (e) { root.Engine.onError(e); }).then(function () { W.busy = false; W.updateHud(); S.autosave(); Sidebar.refresh(); });
  };
  Sidebar.init = function () {
    var side = document.getElementById('side'), guide = document.getElementById('guide'); if (!side) return; Sidebar.el = side;
    side.innerHTML = '<div class="sb-title">メニュー</div><div class="sb-status" id="sb-status"></div><div class="sb-items">' + ITEMS.map(function (it, i) { return '<button class="sb-btn" data-i="' + i + '">' + esc(it[0]) + '</button>'; }).join('') + '</div><div class="sb-note muted small">キーボード：X / Esc でもメニューを開けます</div>';
    side.addEventListener('click', function (e) { var b = e.target.closest('.sb-btn'); if (!b) return; e.stopPropagation(); Sidebar.run(ITEMS[parseInt(b.getAttribute('data-i'), 10)]); });
    if (guide) guide.innerHTML = '<div class="gd-title">操作方法</div><div class="gd-row"><span class="key">↑↓←→</span><span class="key">W A S D</span>移動</div><div class="gd-row"><span class="key">Z</span><span class="key">Enter</span><span class="key">Space</span>決定・話す・調べる・メッセージ送り</div><div class="gd-row"><span class="key">X</span><span class="key">Esc</span>メニュー・戻る</div><div class="gd-row"><span class="key">M</span>ミニマップの表示・非表示　<span class="key">N</span><span class="key">Tab</span>全体マップ（ミニマップのクリックでも開く）</div><div class="gd-row"><span class="key">マウス</span>メニューやチャートの試練はクリックで操作。試練では時間足ボタンで上位足を確認し、チャートをクリックして高値・安値や損切り位置を指定</div><div class="gd-row muted small">歩く速度は「設定」で変えられます。オートセーブは常時動作します</div>';
    Sidebar.refresh(); Sidebar.timer = setInterval(Sidebar.refresh, 600);
  };
  Sidebar.refresh = function () {
    var st = document.getElementById('sb-status'); if (!st) return; var S = root.State, W = root.World; var d = S.data;
    if (!d || !W.map) { st.innerHTML = '<div class="muted small">ゲームを開始すると、ここに状態が表示されます</div>'; Sidebar.el.classList.add('idle'); return; }
    Sidebar.el.classList.remove('idle');
    var party = S.partyActors(); var rank = root.TradeEval ? root.TradeEval.rank(d.trade) : null; var title = root.Growth ? root.Growth.title() : '';
    st.innerHTML = '<div class="sb-loc">' + esc(W.map.name) + '</div><div class="sb-gold">' + d.gold + ' G　<span class="muted small">預金 ' + d.bank + ' G</span></div>' +
      party.map(function (a) { var s = root.Actors.stats(a); var pct = Math.max(0, Math.min(100, Math.round(a.hp / s.maxHp * 100))); return '<div class="sb-a' + (a.dead ? ' dead' : '') + '"><div class="sb-an">' + esc(a.name) + ' <span class="muted small">Lv' + a.level + '</span></div><div class="sb-bar"><i style="width:' + pct + '%"></i></div><div class="sb-hp small">HP ' + a.hp + '/' + s.maxHp + '　MP ' + a.mp + '/' + s.maxMp + '</div></div>'; }).join('') +
      (rank ? '<div class="sb-rank small">トレーダーランク <b>' + esc(rank.letter) + '</b> ' + esc(title) + '</div>' : '') + '<div class="sb-ctl small muted">' + (Sidebar.canOpen() ? '探索中' : '会話・戦闘・画面表示中') + '</div>';
  };
  root.Sidebar = Sidebar;
})(typeof window !== 'undefined' ? window : globalThis);
