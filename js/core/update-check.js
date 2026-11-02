/* =========================================================
   Core / UpdateCheck（v6.6）：新しい版が公開されたら知らせる
   ・読み込んだ版（js/core/version.js の MTQ_VERSION）と、公開中の版（version.json。キャッシュを使わずに取る）を比べる
   ・違えば画面の上に「新しい版があります」。［更新する］で、戦闘・会話中でなければ自動セーブしてから読み込み直す
   ・確かめる時：開いて 15 秒後・10 分ごと・画面に戻ったとき（1 分に1回まで）。通信できなければ何もしない
   ・js/ のファイルは index.html で「?v=中身のハッシュ」つきで読む（tools/stamp-version.js）。古いファイルが使われ続けないように
   ========================================================= */
(function (root) {
  'use strict';
  var U = { current: root.MTQ_VERSION || null, latest: null, shown: false, lastCheck: 0 };
  function base() { return (root.Assets && root.Assets.base) || ''; }
  U.check = function (force) {
    if (!U.current || typeof root.fetch !== 'function') return;
    var now = Date.now(); if (!force && now - U.lastCheck < 60000) return; U.lastCheck = now;
    root.fetch(base() + 'version.json?t=' + now, { cache: 'no-store' }).then(function (r) { return r && r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.version) return; U.latest = j.version;
      if (j.version !== U.current) U.show();
    }).catch(function () { });
  };
  U.show = function () {
    if (U.shown || !root.document || !document.body) return; U.shown = true;
    var el = document.createElement('div'); el.id = 'mtq-update';
    el.innerHTML = '<span>新しい版があります</span><button type="button" data-u="go">更新する</button><button type="button" data-u="x" aria-label="閉じる">×</button>';
    el.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('button') : null; if (!b) return; e.stopPropagation(); if (b.dataset.u === 'x') { el.remove(); U.shown = false; U.lastCheck = Date.now() + 20 * 60000; } else U.reload(); });
    document.body.appendChild(el);
  };
  U.reload = function () {
    var E = root.Engine, B = root.BattleUI; var inBattle = !!(B && B.scene && E && E.scenes && E.scenes.indexOf(B.scene) >= 0);
    if (inBattle || (root.World && root.World.busy)) { if (root.Win && root.Win.toast) root.Win.toast('戦闘・会話が終わってから「更新する」を押してください'); return; }
    try { if (root.State && root.State.data && root.State.autosave) root.State.autosave(); } catch (e) { }
    var u = location.href.replace(/#.*$/, '').replace(/([?&])_v=[^&]*&?/, '$1').replace(/[?&]$/, '');
    location.replace(u + (u.indexOf('?') >= 0 ? '&' : '?') + '_v=' + encodeURIComponent(U.latest || Date.now()));
  };
  if (root.setTimeout && root.document) {
    root.setTimeout(function () { U.check(true); }, 15000);
    root.setInterval(function () { U.check(); }, 10 * 60000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') U.check(); });
  }
  root.UpdateCheck = U;
})(typeof window !== 'undefined' ? window : globalThis);
