/* =========================================================
   UI / ItemIcons（v9.5）：装備・道具・オーパーツの絵（素材：assets/item-icons/。対応表：js/data/item-icon-manifest.js）
   ・素材 ZIP（TradeQuest_Item_Icons、参照 483fd5f）の js/ui/item-icons.js を元に、このゲームに合わせて足したもの
       2D は ./assets/item-icons/、3D（3d/index.html）は ../assets/item-icons/。先頭のスラッシュ・決まったドメインは使わない（サイトのサブディレクトリのまま）
       3D の判定は「ページが 3d/ の直下にあるか」だけ（素材版の /3d(\/|$)/ だと、末尾の / がない URL で 1 つ上を指すため）
       画像の URL に素材の版（artVersion）を付ける（?v=…。絵を差し替えたときに古い絵が残らない。Service Worker は版の印つきとして保存）
       ItemIcons.has(id)・ItemIcons.detailHtml(id)（詳細欄の大きい絵）を足した。選んだ詳細の絵だけ fetchpriority="high"
   ・紐付けはゲームの正確な ID だけ（名前・並び順・装備の種類から推測しない）。対応表にない ID は「？」の枠（文字と操作はそのまま）
   ・一覧は webp128、大きい絵は webp256。開けなければ png256 を一度だけ試し、それも失敗したら「？」。画像の失敗で選択・購入は止めない
   ・全部の絵を最初に読み込まない（表示する行だけ。loading="lazy"）。セーブには何も書かない（絵の URL・読み込みの状態を持たない）
   ・絵は飾り（aria-hidden）。クリック・tabindex を付けない（行全体の操作はそのまま）
   ========================================================= */
(function (root) {
  'use strict';
  var base = null, installed = false;
  function manifest() { return root.ITEM_ICON_MANIFEST || { entries: {} }; }
  function entry(id) { var m = manifest().entries, key = String(id || ''); return Object.prototype.hasOwnProperty.call(m, key) ? m[key] : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function page() { var doc = root.document; return (doc && doc.baseURI) || (root.location && root.location.href) || 'http://localhost/'; }
  function assetBase() {
    if (base) return base;
    var rel = root.MTQ_ITEM_ICON_BASE;
    if (!rel) rel = /\/3d\/[^/]*$/.test(new URL(page()).pathname) ? '../assets/item-icons/' : './assets/item-icons/';
    return new URL(rel, page()).href;
  }
  function variant(size, png) { return png ? 'png256' : Number(size) > 64 ? 'webp256' : 'webp128'; }
  var API = { version: 1 };
  API.configure = function (o) { if (o && o.assetBase) base = new URL(o.assetBase, page()).href; return API; };
  API.get = entry;
  API.has = function (id) { return !!entry(id); };
  API.url = function (id, size, png) {
    var it = entry(id); if (!it) return null;
    var v = manifest().artVersion; var u = new URL(variant(size, png) + '/' + it.id + (png ? '.png' : '.webp'), assetBase());
    if (v) u.searchParams.set('v', String(v));
    return u.href;
  };
  // o.size：表示の大きさ（px）。o.detail：詳細欄の大きい絵（webp256・先に読む）。o.frame === false：枠なし
  API.html = function (id, o) {
    o = o || {}; var it = entry(id), size = Math.max(16, Math.min(512, Number(o.size) || 48));
    var cls = 'tqi' + (o.frame === false ? ' tqi--bare' : '') + (o.detail ? ' tqi--detail' : '') + (it && it.bossExclusive ? ' tqi--unique' : '') + (o.cls ? ' ' + o.cls : '');
    var label = it ? it.name : (o.label || '未登録アイテム');
    var aria = o.decorative === false ? ' role="img" aria-label="' + esc(label) + '"' : ' aria-hidden="true"';
    // 「？」の印は CSS（.tqi-fallback::before）で出す。行の文字（textContent）に「?」を混ぜない
    if (!it) return '<span class="' + cls + ' tqi--missing"' + aria + ' style="--tqi-size:' + size + 'px"><span class="tqi-fallback"></span></span>';
    return '<span class="' + cls + '"' + aria + ' data-item-icon="' + esc(it.id) + '" style="--tqi-size:' + size + 'px"><img class="tqi-img" src="' + esc(API.url(id, size, false)) + '" data-png-fallback="' + esc(API.url(id, size, true)) + '" width="' + size + '" height="' + size + '" alt="" loading="' + (o.detail ? 'eager' : 'lazy') + '"' + (o.detail ? ' fetchpriority="high"' : '') + ' decoding="async"><span class="tqi-fallback" hidden></span></span>';
  };
  // 詳細欄の大きい絵（PC 160px。スマホは styles/item-icons.css で 112px）
  API.detailHtml = function (id, o) { return '<span class="ia-art">' + API.html(id, Object.assign({ size: 160, detail: true }, o || {})) + '</span>'; };
  API.element = function (id, o) { if (!root.document) throw new Error('A document is required'); var box = root.document.createElement('div'); box.innerHTML = API.html(id, o); return box.firstElementChild; };
  API.decorateRows = function (rows, ids) { return rows.map(function (row, i) { var out = Object.assign({}, row); if (ids[i]) out.itemId = ids[i]; return out; }); };
  // WebP が開けない → PNG を一度だけ → それも失敗 →「？」（文字と行の操作はそのまま）
  API.install = function (doc) {
    doc = doc || root.document; if (installed || !doc || !doc.addEventListener) return API; installed = true;
    doc.addEventListener('error', function (e) {
      var img = e.target; if (!img || !img.classList || !img.classList.contains('tqi-img')) return;
      var fallback = img.getAttribute('data-png-fallback');
      if (fallback && !img.hasAttribute('data-png-tried')) { img.setAttribute('data-png-tried', '1'); img.removeAttribute('srcset'); img.src = fallback; return; }
      img.hidden = true; var box = img.parentElement; if (box) { box.classList.add('tqi--missing'); var mark = box.querySelector('.tqi-fallback'); if (mark) mark.hidden = false; }
    }, true);
    return API;
  };
  // 照合：ItemIcons.coverage(window.ITEMS, window.OOPARTS) → { expected, matched, missing:[ID] }
  API.coverage = function (items, ooparts) {
    var want = Object.keys(items || {}).concat((ooparts || []).map(function (o) { return o.id; }));
    var missing = want.filter(function (id) { return !entry(id); });
    return { expected: want.length, matched: want.length - missing.length, missing: missing };
  };
  root.ItemIcons = API; API.install();
})(typeof window !== 'undefined' ? window : globalThis);
