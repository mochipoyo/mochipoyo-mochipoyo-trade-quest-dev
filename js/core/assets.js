/* =========================================================
   Core / Assets : 画像アセットの読み込みと参照（マニフェスト駆動）
   ・Assets.image(kind, id) → 読み込み済みで use=true の HTMLImageElement。なければ null（呼び出し側がフォールバック）
   ・Assets.entry(kind, id) → マニフェスト項目
   ・Assets.portrait(actor) / Assets.portraitBySprite(spriteId) → 立ち絵
   ・GitHub Pages の相対パスで読み込む。読み込み失敗時は自動的にフォールバックへ
   ========================================================= */
(function (root) {
  'use strict';
  var Assets = { images: {}, failed: {}, loadedCount: 0, total: 0, _cb: [] };
  var M = root.ASSET_MANIFEST || {};
  var BASE = (function () { // index.html と同じディレクトリを基準にする
    try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/(js\/core\/assets\.js|dist\/[^\/]+\.js)(\?.*)?$/, ''); } catch (e) { }   // v9.3 まとめたファイル（dist/mtq.min.js）から読んだときも同じ基準
    return '';
  })();
  Assets.base = BASE;

  function key(kind, id) { return kind + ':' + id; }
  // v9.3 読み込みを速くする：WebP のある画像（js/data/asset-webp.js。tools/make-webp.py が作る）は WebP を読む。読めなければ元の PNG・JPG に戻す
  var canWebp = (function () { try { if (/jsdom/i.test((root.navigator && root.navigator.userAgent) || '')) return false; var c = document.createElement('canvas'); return !!(c.toDataURL && c.toDataURL('image/webp').indexOf('data:image/webp') === 0); } catch (e) { return false; } })();
  Assets.webp = canWebp;
  function pick(path) { var W = root.ASSET_WEBP; return canWebp && W && W[path] ? path.replace(/\.(png|jpe?g)$/i, '.webp') : path; }
  Assets.pickPath = pick;
  Assets.entry = function (kind, id) { var g = M[kind]; return g ? g[id] || null : null; };
  Assets.url = function (kind, id) { var e = Assets.entry(kind, id); return e && e.path ? BASE + pick(e.path) : null; };
  // <img> の WebP が読めなかったとき、元の画像（PNG・JPG）へ置き換える（ページ全体の画像の読み込みの失敗を見張る）
  var orig = null; function origOf(url) { var W = root.ASSET_WEBP || {}; if (!orig) { orig = {}; Object.keys(W).forEach(function (p) { orig[p.replace(/\.(png|jpe?g)$/i, '.webp')] = p; }); } var u = String(url).replace(/[?#].*$/, ''); if (u.indexOf(BASE) === 0) u = u.slice(BASE.length); return orig[u] ? BASE + orig[u] : null; }
  try { document.addEventListener('error', function (e) { var t = e.target; if (!t || t.tagName !== 'IMG' || (t.dataset && t.dataset.fb) || !/\.webp(\?|#|$)/.test(t.src || '')) return; var o = origOf(t.src); if (!o) return; t.dataset.fb = '1'; t.src = o; }, true); } catch (e) { }
  Assets.fallbackAttr = '';

  Assets.preload = function (done) {
    var list = [];
    Object.keys(M).forEach(function (kind) { if (typeof M[kind] !== 'object' || !M[kind]) return; Object.keys(M[kind]).forEach(function (id) { var e = M[kind][id]; if (e && e.path && e.use !== false && !e.lazy) list.push([kind, id, e.path]); }); });   // v6.0 lazy（世界マップの絵など）は使うときに読み込む
    Assets.total = list.length; var n = 0;
    if (!list.length) { if (done) done(); return; }
    list.forEach(function (it) {
      var img = new Image(); var k = key(it[0], it[1]); var src = pick(it[2]);
      img.onload = function () { Assets.images[k] = img; Assets.loadedCount = ++n; if (n === list.length && done) done(); Assets._cb.forEach(function (f) { f(it[0], it[1]); }); };
      img.onerror = function () { if (src !== it[2]) { src = it[2]; img.src = BASE + src; return; } Assets.failed[k] = true; Assets.loadedCount = ++n; if (n === list.length && done) done(); };   // v9.3 WebP が読めなければ元の画像
      img.src = BASE + src;
    });
  };
  Assets.onLoad = function (f) { Assets._cb.push(f); };
  Assets.image = function (kind, id) { var e = Assets.entry(kind, id); if (!e || e.use === false || !e.path) return null; var img = Assets.images[key(kind, id)]; return img && img.complete && img.naturalWidth > 0 ? img : null; };
  Assets.status = function (kind, id) { var e = Assets.entry(kind, id); if (!e) return 'unknown'; if (e.use === false) return e.status; var k = key(kind, id); if (Assets.failed[k]) return 'load_error'; return Assets.images[k] ? 'loaded' : 'loading'; };

  // 歩行スプライト（シート）：spriteId（hero_warrior / lina / elder ...）と向き・フレームから切り出し位置を返す。なければ null → Chars.frame にフォールバック
  Assets.walkFrame = function (spriteId, dir, frame) {
    var e = Assets.entry('overworld', spriteId); if (!e || e.use === false) return null; var img = Assets.image('overworld', spriteId); if (!img) return null;
    var row = (e.dirOrder || ['down', 'left', 'right', 'up']).indexOf(dir); if (row < 0) row = 0; var col = Math.max(0, Math.min((e.cols || 3) - 1, frame | 0));
    return { img: img, sx: col * e.frameW, sy: row * e.frameH, w: e.frameW, h: e.frameH };
  };
  // 立ち絵：主人公は職業、仲間はID、NPCはスプライトIDで引く
  Assets.portrait = function (actor) {
    if (!actor) return null;
    if (actor.id === 'hero' || /^hero_/.test(actor.sprite || '')) return Assets.image('jobs', actor.job);
    return Assets.image('companions', actor.id) || Assets.portraitBySprite(actor.sprite);
  };
  Assets.portraitBySprite = function (spriteId) {
    if (!spriteId) return null;
    if (/^hero_/.test(spriteId)) return Assets.image('jobs', spriteId.slice(5));
    return Assets.image('companions', spriteId) || Assets.image('npcs', spriteId);
  };
  Assets.portraitUrl = function (spriteId) {
    if (!spriteId) return null;
    if (/^hero_/.test(spriteId)) return Assets.url('jobs', spriteId.slice(5));
    return Assets.url('companions', spriteId) || Assets.url('npcs', spriteId);
  };
  // アクター（主人公/仲間）用：仲間は転職しても本人の立ち絵を保つ
  Assets.portraitUrlFor = function (actor) { if (!actor) return null; if (actor.id && actor.id !== 'hero' && Assets.url('companions', actor.id)) return Assets.url('companions', actor.id); return Assets.portraitUrl(actor.sprite); };
  Assets.portraitTagFor = function (actor, cls, h) { var u = Assets.portraitUrlFor(actor); if (!u) return ''; return '<img class="' + (cls || 'portrait') + '" src="' + u + '" alt="" style="height:' + (h || 96) + 'px" draggable="false"' + Assets.fallbackAttr + '>'; };
  // HTML用：立ち絵の <img> タグ（なければ空文字）
  Assets.portraitTag = function (spriteId, cls, h) {
    var u = Assets.portraitUrl(spriteId); if (!u) return '';
    return '<img class="' + (cls || 'portrait') + '" src="' + u + '" alt="" style="height:' + (h || 96) + 'px" draggable="false"' + Assets.fallbackAttr + '>';
  };
  // 名前から NPC スプライトを推定する（会話ウィンドウ用。確実でないものは null）
  var NAME_TO_SPRITE = [[/村長|長老|老人|老婆|じいさん|仙人/, 'elder'], [/王様|^王$|国王|リヴェル王/, 'king'], [/衛兵|兵士|門番|騎士団/, 'guard'], [/宿屋|女将|おかみ/, 'innkeeper'], [/神父|シスター|司祭|僧侶|教会/, 'priest'], [/酒場|マスター（酒場）|店主（酒場）/, 'bartender'], [/船乗り|船長|水夫|漁師/, 'sailor'], [/子ども|子供|少年|少女|男の子|女の子/, 'child'], [/師匠|ハケイ|ギルド/, 'master'], [/商人|店主|武器屋|防具屋|道具屋|銀行/, 'merchant'], [/研究者|学者/, 'scholar'], [/村の女|女性|奥さん|娘|母/, 'villager_f'], [/村人|旅人|農夫|男|青年|猟師|狩人/, 'villager_m']];
  Assets.guessSprite = function (name) { if (!name) return null; for (var i = 0; i < NAME_TO_SPRITE.length; i++) if (NAME_TO_SPRITE[i][0].test(name)) return NAME_TO_SPRITE[i][1]; return null; };

  root.Assets = Assets;
})(typeof window !== 'undefined' ? window : globalThis);
