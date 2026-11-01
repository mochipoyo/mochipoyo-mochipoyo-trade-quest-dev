/* =========================================================
   Core / EnemyArt：既存の通常敵164体の新しい表示名・戦闘画像（データは js/data/enemy-redesign.js）
   ・敵ID・能力・出現・報酬・行動・属性は変えない。変えるのは ENEMIES[id].name（表示名）と、戦闘・図鑑で使う画像だけ
     もとの表示名は ENEMIES[id].legacyName に残す（記録・図鑑の「以前の名前」用。条件判定には使っていない）
   ・検品で保留にした敵（status: held）は、旧名・旧画像のまま（名前と画像を一組で変えない）
   ・画像は 512px の透過PNG（assets/enemies_redesign/）。起動時には読まない：
       マップに入ったとき、そのマップの出現表の敵だけ先に読む／戦闘の直前に、その戦闘の敵（と呼ぶ仲間）を読む（最大 TIMEOUT ms 待つ）
     間に合わない・読めないときは、その間は従来の絵で表示し、読めたら切り替える（戦闘は止めない）
   ・表示：不透明部分の外接矩形（データの bbox）で切り抜き、縦横比を保って基本サイズ（draw）にする。飛ぶ敵は lift だけ浮かせる
     高画質のために表示サイズの2倍までの解像度で1回だけ縮小して持つ（毎フレームの縮小を軽く）。持つのは最大 MAX 体ぶん（古いものから捨てる）
   ・切替：URL に ?enemyart=old（新しい名前・画像を使わない）／?enemyart=new。localStorage 'mtq-enemyart' でも同じ。セーブには保存しない
   ========================================================= */
(function (root) {
  'use strict';
  var EA = { ready: {}, failed: {}, pending: {}, order: [], MAX: 48, TIMEOUT: 1500, LS_KEY: 'mtq-enemyart', stats: { loads: 0, fails: 0 } };
  var BY = {};
  ((root.ENEMY_REDESIGN && root.ENEMY_REDESIGN.list) || []).forEach(function (r) { BY[r.id] = r; });
  function base() { return (root.Assets && root.Assets.base) || ''; }

  EA.mode = function () {
    try { var q = /[?&]enemyart=(new|old|auto)\b/.exec(root.location ? root.location.search : ''); if (q) return q[1]; } catch (e) { }
    try { var v = root.localStorage && root.localStorage.getItem(EA.LS_KEY); if (v === 'new' || v === 'old') return v; } catch (e) { }
    return 'auto';
  };
  EA.entry = function (id) { return BY[id] || null; };
  EA.ids = function () { return Object.keys(BY); };
  // 新しい名前・画像を使う敵か（保留の敵・切替で old のときは使わない）
  EA.adopted = function (id) { var r = BY[id]; return !!(r && r.status === 'adopted' && r.file && EA.mode() !== 'old'); };
  EA.url = function (id) { var r = BY[id]; return EA.adopted(id) ? base() + r.file : null; };

  /* ---------- 表示名（読み込み時に1回。内部IDはそのまま） ---------- */
  EA.applyNames = function () {
    var E = root.ENEMIES; if (!E) return 0; var n = 0;
    Object.keys(BY).forEach(function (id) {
      var e = E[id]; if (!e) return;
      if (e.legacyName === undefined) e.legacyName = e.name;   // もとの表示名
      e.name = EA.adopted(id) ? BY[id].name : e.legacyName;
      if (EA.adopted(id)) n++;
    });
    return n;
  };

  /* ---------- 読み込み・加工 ---------- */
  function touch(id) { var i = EA.order.indexOf(id); if (i >= 0) EA.order.splice(i, 1); EA.order.push(id); }
  function evict() {
    var keep = {}; try { var b = root.BattleUI && root.BattleUI.battle; if (b && b.enemies) b.enemies.forEach(function (e) { keep[e.defId] = 1; }); } catch (e) { }
    while (EA.order.length > EA.MAX) { var k = -1; for (var i = 0; i < EA.order.length; i++) if (!keep[EA.order[i]]) { k = i; break; } if (k < 0) break; var id = EA.order.splice(k, 1)[0]; delete EA.ready[id]; }
  }
  function processImg(img, r) {
    var bb = r.bbox, pad = 2; var W = img.naturalWidth, H = img.naturalHeight; var k = W / 512;   // 512px 版の bbox を、実際の画像の大きさに合わせる
    var sx = Math.max(0, Math.floor((bb[0] - pad) * k)), sy = Math.max(0, Math.floor((bb[1] - pad) * k));
    var sw = Math.min(W, Math.ceil((bb[0] + bb[2] + pad) * k)) - sx, sh = Math.min(H, Math.ceil((bb[1] + bb[3] + pad) * k)) - sy;
    var tw = Math.min(sw, r.draw[0] * 2), th = Math.round(sh * tw / sw);
    var doc = root.document; var c = doc.createElement('canvas'); c.width = sw; c.height = sh; var x = c.getContext('2d'); x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    // 段階的に半分ずつ縮める（一度に大きく縮めると、細い線がつぶれる）
    while (c.width / 2 >= tw) { var h2 = doc.createElement('canvas'); h2.width = Math.round(c.width / 2); h2.height = Math.round(c.height / 2); var x2 = h2.getContext('2d'); x2.imageSmoothingEnabled = true; x2.imageSmoothingQuality = 'high'; x2.drawImage(c, 0, 0, h2.width, h2.height); c = h2; }
    if (c.width !== tw) { var o = doc.createElement('canvas'); o.width = tw; o.height = th; var xo = o.getContext('2d'); xo.imageSmoothingEnabled = true; xo.imageSmoothingQuality = 'high'; xo.drawImage(c, 0, 0, tw, th); c = o; }
    return { img: c, w: r.draw[0], h: r.draw[1], lift: r.lift || 0, smooth: true, source: 'enemyart', crop: [sx, sy, sw, sh] };
  }
  EA.load = function (id) {
    if (!EA.adopted(id)) return Promise.resolve(null);
    if (EA.ready[id]) { touch(id); return Promise.resolve(EA.ready[id]); }
    if (EA.failed[id]) return Promise.resolve(null);
    if (EA.pending[id]) return EA.pending[id];
    if (typeof root.Image === 'undefined' || !root.document) return Promise.resolve(null);
    var r = BY[id];
    var p = new Promise(function (resolve) {
      var img = new root.Image(); var t0 = Date.now();
      img.onload = function () {
        delete EA.pending[id];
        try { if (!(img.naturalWidth > 0)) throw new Error('broken'); var v = processImg(img, r); v.loadMs = Date.now() - t0; EA.ready[id] = v; EA.stats.loads++; touch(id); evict(); resolve(v); }
        catch (err) { EA.failed[id] = 'process:' + (err && err.message); EA.stats.fails++; resolve(null); }
      };
      img.onerror = function () { delete EA.pending[id]; EA.failed[id] = 'load_error'; EA.stats.fails++; resolve(null); };
      img.src = base() + r.file;
    });
    EA.pending[id] = p; return p;
  };
  EA.visual = function (id) { if (!EA.adopted(id)) return null; var v = EA.ready[id]; if (v) touch(id); return v || null; };
  EA.isLoading = function (id) { return !!EA.pending[id]; };
  // その敵が呼ぶ仲間（特殊行動の summon）も一緒に
  function withSummons(ids) { var out = {}; (ids || []).forEach(function (id) { out[id] = 1; var d = root.ENEMIES && root.ENEMIES[id]; ((d && d.actions) || []).forEach(function (a) { if (a && a.summon) out[a.summon] = 1; }); }); return Object.keys(out); }
  // 戦闘の直前：この戦闘の敵の画像を読む（最大 TIMEOUT ms。読むものがなければ待たない）
  EA.prepare = function (enemyIds) {
    var jobs = withSummons(enemyIds).filter(function (id) { return EA.adopted(id) && !EA.ready[id] && !EA.failed[id]; }).map(EA.load);
    if (!jobs.length) return null;
    return Promise.race([Promise.all(jobs), new Promise(function (r) { setTimeout(r, EA.TIMEOUT); })]);
  };
  // マップに入ったとき：そのマップの出現表の敵を先に読む（待たない。最大12体）
  EA.prefetchMap = function (map) {
    try {
      if (!map || EA.mode() === 'old' || typeof root.Image === 'undefined') return; var enc = map.encounters; var ids = {};
      ((enc && enc.zones) || []).forEach(function (z) { (z.groups || []).concat(z.rare || []).forEach(function (g) { (g || []).forEach(function (id) { ids[id] = 1; }); }); });
      withSummons(Object.keys(ids)).filter(EA.adopted).slice(0, 12).forEach(function (id) { EA.load(id); });
    } catch (e) { }
  };
  EA.setMode = function (m) { try { if (m === 'new' || m === 'old') root.localStorage.setItem(EA.LS_KEY, m); else root.localStorage.removeItem(EA.LS_KEY); } catch (e) { } };

  EA.applyNames();
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (map) { EA.prefetchMap(map); });
  root.EnemyArt = EA;
})(typeof window !== 'undefined' ? window : globalThis);
