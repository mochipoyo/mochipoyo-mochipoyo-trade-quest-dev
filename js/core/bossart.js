/* =========================================================
   Core / BossArt（v6.3）：ボス画像パック（全44体 + 特殊戦闘5種）の読み込み・表示調整・フォールバック
   ・画像は assets/bosses_new/<敵ID>.png（512×512 RGBA）と assets/boss_encounters/<ID>.png。ID→パスは1対1
   ・登録先は ASSET_MANIFEST.monsters[id]（採用したもの）と monsters[id].candidate（既存画像を優先したもの）、
     ASSET_MANIFEST.encounters[id]（特殊戦闘のカットイン）。どれも lazy（起動時には読み込まない。戦闘の直前に読む）
   ・表示：不透明部分で切り抜き → 倍率（既定 0.36）→ 最大 fit[幅,高さ] に収める → 戦闘画面の既存の縮小（敵の数・画面幅）。足元中央基準のまま
   ・素材の一覧画像由来の「枠の縦線」「白い背景の残り」は、マニフェストで指定したものだけ表示時に取り除く（元のPNGは変更しない）
   ・読み込み失敗・時間切れ・画像の破損・ピクセルを読めない環境 → 旧画像（prev）→ MonsterArt → Sprites の順にフォールバック。戦闘は止めない
   ・切替：URL に ?bossart=new（新画像を優先）/ ?bossart=old（新画像を使わない）/ ?bossart=auto（既定）。
     localStorage 'mtq-bossart' に 'new' / 'old' を入れても同じ。セーブデータには保存しない
   ========================================================= */
(function (root) {
  'use strict';
  var BossArt = { ready: {}, failed: {}, pending: {}, stats: {}, TIMEOUT: 1200, LS_KEY: 'mtq-bossart' };   // TIMEOUT：戦闘開始前に待つ最大時間（ms）。間に合わなければ従来の絵で始め、登場演出の間に読めたら切り替える
  function M() { return root.ASSET_MANIFEST || {}; }
  function base() { return (root.Assets && root.Assets.base) || ''; }

  /* ---------- 切替フラグ ---------- */
  BossArt.mode = function () {
    try { var q = /[?&]bossart=(new|old|auto)\b/.exec(root.location ? root.location.search : ''); if (q) return q[1]; } catch (e) { }
    try { var v = root.localStorage && root.localStorage.getItem(BossArt.LS_KEY); if (v === 'new' || v === 'old') return v; } catch (e) { }
    return 'auto';
  };
  BossArt.setMode = function (m) { try { if (m === 'new' || m === 'old') root.localStorage.setItem(BossArt.LS_KEY, m); else root.localStorage.removeItem(BossArt.LS_KEY); } catch (e) { } BossArt.clearVis(); };

  /* ---------- どの画像を使うか ---------- */
  // 敵IDごとの「このパックの画像」の項目（採用：monsters[id] / 既存優先：monsters[id].candidate）
  function packEntry(id) {
    var g = M().monsters; var e = g && g[id]; if (!e) return null;
    if (e.pack === 'boss49') return e;
    if (e.candidate && e.candidate.pack === 'boss49') return e.candidate;
    return null;
  }
  BossArt.packEntry = packEntry;
  // 戦闘・図鑑でこのパックの画像を使うか（読み込み前でも判定できる）
  BossArt.wants = function (id) {
    var p = packEntry(id); if (!p || !p.path) return false;
    var mode = BossArt.mode();
    if (mode === 'old') return false;
    if (mode === 'new') return true;
    return p.use !== false && p.status === 'replaced';
  };
  // 新画像を使わない・使えないときの旧画像（monsters[id] が採用済みのとき prev に元の画像の情報を残している）
  BossArt.prevEntry = function (id) {
    var g = M().monsters; var e = g && g[id]; if (!e) return null;
    if (e.pack === 'boss49') return e.prev || null;
    return e;   // 既存画像を優先している項目は、それ自体が旧画像
  };
  BossArt.prevUrl = function (id) { var e = M().monsters && M().monsters[id]; return e && e.pack === 'boss49' && e.prev && e.prev.path ? base() + e.prev.path : null; };
  BossArt.url = function (id) { var p = packEntry(id); return p && p.path ? base() + p.path : null; };
  BossArt.encounter = function (id) { var g = M().encounters; return g && g[id] || null; };

  /* ---------- 読み込み（遅延・時間切れ） ---------- */
  function key(kind, id) { return kind + ':' + id; }
  function load(kind, id, ent) {
    var k = key(kind, id);
    if (BossArt.ready[k]) return Promise.resolve(BossArt.ready[k]);
    if (BossArt.failed[k]) return Promise.resolve(null);
    if (BossArt.pending[k]) return BossArt.pending[k];
    if (!ent || !ent.path || typeof root.Image === 'undefined') { BossArt.failed[k] = 'no_entry'; return Promise.resolve(null); }
    var p = new Promise(function (resolve) {
      var img = new root.Image(); var t0 = Date.now();
      img.onload = function () {
        try {
          if (!(img.naturalWidth > 0 && img.naturalHeight > 0)) throw new Error('broken image');
          var v = process(img, ent, kind === 'enc');
          v.loadMs = Date.now() - t0; BossArt.ready[k] = v; BossArt.stats[k] = v.stat; resolve(v);
        } catch (err) { BossArt.failed[k] = 'process:' + (err && err.message); resolve(null); }
        delete BossArt.pending[k];
      };
      img.onerror = function () { BossArt.failed[k] = 'load_error'; delete BossArt.pending[k]; resolve(null); };
      img.src = base() + ent.path;
    });
    BossArt.pending[k] = p; return p;
  }
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }
  BossArt.load = function (id) { return BossArt.wants(id) ? load('boss', id, packEntry(id)) : Promise.resolve(null); };
  BossArt.loadEncounter = function (id) { var e = BossArt.encounter(id); return e && e.use !== false && BossArt.mode() !== 'old' ? load('enc', id, e) : Promise.resolve(null); };
  BossArt.get = function (id) { return BossArt.wants(id) ? BossArt.ready[key('boss', id)] || null : null; };
  BossArt.getEncounter = function (id) { return BossArt.ready[key('enc', id)] || null; };
  BossArt.isBossId = function (id) { return !!packEntry(id); };

  // 戦闘の直前：この戦闘に出るボスとカットインの画像を読み込む（最大 TIMEOUT ms。間に合わなければ従来の絵で始め、登場演出の間に読めたら battle.js が切り替える）
  BossArt.prepare = function (enemyIds, opts, mapId) {
    var jobs = [];
    (enemyIds || []).forEach(function (id) {
      if (BossArt.wants(id) && !BossArt.ready[key('boss', id)] && !BossArt.failed[key('boss', id)]) jobs.push(BossArt.load(id));
      var pe = M().monsters && M().monsters[id]; if (pe && pe.pack === 'boss49' && pe.prev && !BossArt.ready[key('prev', id)] && !BossArt.failed[key('prev', id)]) jobs.push(loadPrev(id));   // 採用前の画像（フォールバック用）
    });
    var enc = BossArt.matchEncounter(enemyIds, opts, mapId);
    if (enc && !BossArt.ready[key('enc', enc)] && !BossArt.failed[key('enc', enc)]) jobs.push(BossArt.loadEncounter(enc));
    if (!jobs.length) return null;   // 読むものがなければ待たない（通常の戦闘は今までどおり即開始）
    return withTimeout(Promise.all(jobs), BossArt.TIMEOUT);
  };
  // マップに入ったとき：そのマップのボス戦（イベントの enemies）の画像を先に読み込んでおく（待たない）
  //   ・イベントの enemies と、会話・調べるイベントの処理（c.battle([...])）に書かれた敵IDを見る（読むだけ。イベントは変えない）
  BossArt.prefetchMap = function (map) {
    try {
      if (!map || !map.events || typeof root.Image === 'undefined' || BossArt.mode() === 'old') return;
      var flags = root.State && root.State.data ? root.State.data.flags : {};
      var ids = BossArt.ids();
      var want = {};
      map.events.forEach(function (ev) {
        if (!ev || (ev.doneFlag && flags[ev.doneFlag])) return;
        (ev.enemies || []).forEach(function (id) { want[id] = 1; });
        if (typeof ev.run === 'function') { var src = String(ev.run); ids.forEach(function (id) { if (src.indexOf("'" + id + "'") >= 0 || src.indexOf('"' + id + '"') >= 0) want[id] = 1; }); }
      });
      (map.npcs || []).forEach(function (n) { if (n && typeof n.talk === 'function') { var src = String(n.talk); ids.forEach(function (id) { if (src.indexOf("'" + id + "'") >= 0) want[id] = 1; }); } });
      Object.keys(want).forEach(function (id) { if (BossArt.wants(id)) BossArt.load(id); });
      var g = M().encounters || {}; Object.keys(g).forEach(function (id) { if (g[id] && g[id].trigger && g[id].trigger.map === map.id) BossArt.loadEncounter(id); });
    } catch (e) { }
  };
  // このパックに画像がある敵IDの一覧
  BossArt.ids = function () { var g = M().monsters || {}; return Object.keys(g).filter(function (id) { return !!packEntry(id); }); };

  // 特殊戦闘：マップと敵の組み合わせ（順不同）が一致したときだけカットインを出す（戦闘の中身・ターゲットには関わらない）
  BossArt.matchEncounter = function (enemyIds, opts, mapId) {
    var g = M().encounters; if (!g || !enemyIds || !enemyIds.length) return null;
    if (mapId == null) mapId = root.World && root.World.map ? root.World.map.id : null;
    var a = enemyIds.slice().sort().join(',');
    var ids = Object.keys(g);
    for (var i = 0; i < ids.length; i++) {
      var e = g[ids[i]]; if (!e || e.use === false || !e.trigger) continue;
      if (e.trigger.map !== mapId) continue;
      if (e.trigger.enemies.slice().sort().join(',') !== a) continue;
      return ids[i];
    }
    return null;
  };

  /* ---------- 表示用の加工（元のPNGは変えない） ---------- */
  // 素材の一覧画像の枠線（細く縦に長い、離れた不透明部分／画像の左右の端にある縦の帯・板）と、白い背景の残り・切り口の白い線を透明にする
  // opt: { keepX:[x0,x1]（この範囲の外を透明に）, bars:true, white:{edge,flat,keepGlow}, trim:true }
  BossArt.clean = function (d, W, H, opt) {
    opt = opt || {}; var stat = { bars: 0, white: 0, trim: 0, px: 0 };
    var A = function (i) { return d[i * 4 + 3]; };
    var clear = function (i) { if (d[i * 4 + 3]) stat.px++; d[i * 4 + 3] = 0; };
    var gray = function (pix) { var sv = 0, ss = 0; pix.forEach(function (i) { var o = i * 4; var mx = Math.max(d[o], d[o + 1], d[o + 2]), mn = Math.min(d[o], d[o + 1], d[o + 2]); sv += mx; ss += mx - mn; }); return sv / pix.length >= 150 && ss / pix.length < 40; };
    var x, y;
    if (opt.keepX) { for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (x < opt.keepX[0] || x > opt.keepX[1]) clear(y * W + x); }
    if (opt.bars) {
      var lab = label(d, W, H, function (i) { return A(i) > 40; });
      lab.comps.forEach(function (c) {
        var edge = c.x0 + c.w <= 44 || c.x0 >= W - 44;
        var side = c.x0 + c.w <= W * 0.2 || c.x0 >= W * 0.8;
        var bar = (c.w <= 16 && c.h >= 100)                                  // (1) ほかとつながっていない、幅16px以下・高さ100px以上（枠の縦線）
          || (edge && c.w <= 16 && c.h >= 20 && c.h >= c.w * 3 && gray(c.pix)) // (1') 端にある短い縦線のかけら（明るい無彩色のものだけ）
          || (side && c.w <= 40 && c.h >= 200 && c.h >= c.w * 6 && c.pix.length >= c.w * c.h * 0.8);   // (3) 端にある細長い長方形の板（隣のコマとの境目）
        if (bar) { c.pix.forEach(clear); for (var yy = Math.max(0, c.y0 - 2); yy <= Math.min(H - 1, c.y0 + c.h + 1); yy++) for (var xx = Math.max(0, c.x0 - 2); xx <= Math.min(W - 1, c.x0 + c.w + 1); xx++) if (A(yy * W + xx) < 100) d[(yy * W + xx) * 4 + 3] = 0; stat.bars++; }   // 線のまわりの薄いにじみも消す
      });
      // (2) 画像の左右の端（44px以内）にある、幅20px以下の縦の帯：列の半分以上が不透明で、3px外側の列はほぼ透明
      var fr = new Float32Array(W);
      for (x = 0; x < W; x++) { var n = 0; for (y = 0; y < H; y++) if (A(y * W + x) > 40) n++; fr[x] = n / H; }
      x = 0;
      while (x < W) {
        if ((x < 44 || x >= W - 44) && fr[x] >= 0.5) {
          var x0 = x; while (x < W && fr[x] >= 0.5) x++; var x1 = x - 1;
          var L = x0 >= 3 ? fr[x0 - 3] : 0, R = x1 <= W - 4 ? fr[x1 + 3] : 0;
          if (x1 - x0 + 1 <= 20 && L < 0.35 && R < 0.35) { for (var cx = Math.max(0, x0 - 1); cx <= Math.min(W - 1, x1 + 1); cx++) for (y = 0; y < H; y++) clear(y * W + cx); stat.bars++; }
        } else x++;
      }
    }
    var removed = new Uint8Array(W * H), any = false;
    if (opt.white) {
      // 白に近い（明るく色味がない）ひとかたまりのうち、透明部分に接する 60px 以上のもの／面積 150px 以上で真っ白に近いもの
      var isW = function (i) { var o = i * 4; if (d[o + 3] <= 40) return false; var r = d[o], g = d[o + 1], b = d[o + 2]; var mn = Math.min(r, g, b), mx = Math.max(r, g, b); return mn >= 226 && mx - mn <= 26; };
      var wl = label(d, W, H, isW);
      var edgeMin = opt.white.edge === false ? Infinity : (opt.white.edge || 60), flatMin = opt.white.flat === false ? Infinity : (opt.white.flat || 150);
      var inC = new Uint8Array(W * H);
      wl.comps.forEach(function (c) {
        if (c.pix.length < Math.min(edgeMin, flatMin)) return;
        var touch = false, sum = 0, rv = 0, rs = 0, rn = 0; c.pix.forEach(function (i) { inC[i] = 1; });
        for (var k = 0; k < c.pix.length; k++) {
          var i = c.pix[k], o = i * 4; sum += Math.min(d[o], d[o + 1], d[o + 2]); var px = i % W, py = (i - px) / W;
          var nb = [px > 0 ? i - 1 : -1, px < W - 1 ? i + 1 : -1, py > 0 ? i - W : -1, py < H - 1 ? i + W : -1];
          for (var t = 0; t < 4; t++) { var j = nb[t]; if (j < 0 || inC[j]) continue; if (A(j) <= 40) { touch = true; continue; } var oj = j * 4; var mxj = Math.max(d[oj], d[oj + 1], d[oj + 2]), mnj = Math.min(d[oj], d[oj + 1], d[oj + 2]); rv += mxj; rs += mxj - mnj; rn++; }
        }
        c.pix.forEach(function (i) { inC[i] = 0; });
        var mean = sum / c.pix.length; rv = rn ? rv / rn : 0; rs = rn ? rs / rn : 0;
        // まわりが明るく色づいている（光る核・淡い色の衣など、絵の一部）ものは残す
        if (opt.white.keepGlow !== false && rv >= 232 && rs >= 18) return;
        if ((touch && c.pix.length >= edgeMin) || (c.pix.length >= flatMin && mean >= 238)) { c.pix.forEach(function (i) { removed[i] = 1; }); stat.white++; any = true; }
      });
    }
    if (any) {
      // 取り除いた部分のふち（2px）：明るく色味の少ない画素は透明に、やや明るいものは薄く（白いにじみ・輪郭だけ残る線を目立たせない）
      for (var pass = 2; pass <= 3; pass++) {
        for (var i2 = 0; i2 < W * H; i2++) {
          if (removed[i2]) continue; var o2 = i2 * 4; if (d[o2 + 3] <= 40) continue;
          var mn2 = Math.min(d[o2], d[o2 + 1], d[o2 + 2]), mx2 = Math.max(d[o2], d[o2 + 1], d[o2 + 2]); if (mn2 < 150 || mx2 - mn2 > 50) continue;
          var px2 = i2 % W, py2 = (i2 - px2) / W, near = false;
          for (var dy = -1; dy <= 1 && !near; dy++) for (var dx = -1; dx <= 1; dx++) { var qx = px2 + dx, qy = py2 + dy; if (qx >= 0 && qy >= 0 && qx < W && qy < H && removed[qy * W + qx] && removed[qy * W + qx] < pass) { near = true; break; } }
          if (near) { removed[i2] = pass; if (mn2 >= 200) d[o2 + 3] = 0; else d[o2 + 3] = Math.round(d[o2 + 3] * 0.35); }
        }
      }
      for (var i3 = 0; i3 < W * H; i3++) if (removed[i3] === 1) clear(i3);
    }
    if (opt.trim) {
      // 切り口の白い線：外接矩形の端の行・列が、長く（辺の1/4以上）ほぼ明るい無彩色なら透明に（各辺4本まで）
      for (var side2 = 0; side2 < 4; side2++) {
        for (var rep = 0; rep < 4; rep++) {
          var bb = bbox(d, W, H); if (!bb) break;
          var horiz = side2 < 2; var pos = side2 === 0 ? bb.y : side2 === 1 ? bb.y + bb.h - 1 : side2 === 2 ? bb.x : bb.x + bb.w - 1;
          var len = horiz ? bb.w : bb.h, op = 0, light = 0, idx = [];
          for (var k2 = 0; k2 < len; k2++) { var ii = horiz ? pos * W + bb.x + k2 : (bb.y + k2) * W + pos; if (A(ii) <= 40) continue; op++; idx.push(ii); var o3 = ii * 4; var mn3 = Math.min(d[o3], d[o3 + 1], d[o3 + 2]), mx3 = Math.max(d[o3], d[o3 + 1], d[o3 + 2]); if (mn3 > 200 && mx3 - mn3 < 40) light++; }
          if (op >= Math.max(20, len * 0.25) && light >= op * 0.6) { idx.forEach(clear); stat.trim++; } else break;
        }
      }
    }
    return stat;
  };
  // 4近傍の連結成分（条件を満たす画素だけ）
  function label(d, W, H, test) {
    var seen = new Uint8Array(W * H); var comps = []; var q = new Int32Array(W * H);
    for (var s = 0; s < W * H; s++) {
      if (seen[s] || !test(s)) continue;
      var head = 0, tail = 0; q[tail++] = s; seen[s] = 1; var pix = []; var x0 = W, x1 = -1, y0 = H, y1 = -1;
      while (head < tail) {
        var i = q[head++]; pix.push(i); var x = i % W, y = (i - x) / W;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && !seen[i - 1] && test(i - 1)) { seen[i - 1] = 1; q[tail++] = i - 1; }
        if (x < W - 1 && !seen[i + 1] && test(i + 1)) { seen[i + 1] = 1; q[tail++] = i + 1; }
        if (y > 0 && !seen[i - W] && test(i - W)) { seen[i - W] = 1; q[tail++] = i - W; }
        if (y < H - 1 && !seen[i + W] && test(i + W)) { seen[i + W] = 1; q[tail++] = i + W; }
      }
      comps.push({ pix: pix, w: x1 - x0 + 1, h: y1 - y0 + 1, x0: x0, y0: y0 });
    }
    return { comps: comps };
  }
  // 不透明部分の外接矩形（alpha > 40）
  function bbox(d, W, H) {
    var x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function process(img, ent, isEnc) {
    var W = img.naturalWidth, H = img.naturalHeight;
    var c = root.document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d'); x.drawImage(img, 0, 0);
    var stat = { cleaned: false, bars: 0, white: 0, px: 0, w: W, h: H };
    var bb = { x: 0, y: 0, w: W, h: H };
    try {
      var id = x.getImageData(0, 0, W, H); var d = id.data;
      if (ent.clean && (ent.clean.bars || ent.clean.white)) { var s = BossArt.clean(d, W, H, ent.clean); stat.bars = s.bars; stat.white = s.white; stat.px = s.px; stat.cleaned = true; x.putImageData(id, 0, 0); }
      var b2 = bbox(d, W, H); if (!b2) throw new Error('empty image'); bb = b2;
    } catch (err) {
      // file:// などでピクセルを読めないとき：加工せず、マニフェストに記録した外接矩形で切り抜く
      if (err && err.message === 'empty image') throw err;
      stat.tainted = true; if (ent.bbox) bb = { x: ent.bbox[0], y: ent.bbox[1], w: ent.bbox[2], h: ent.bbox[3] };
    }
    var pad = 2; var sx = Math.max(0, bb.x - pad), sy = Math.max(0, bb.y - pad), sw = Math.min(W, bb.x + bb.w + pad) - sx, sh = Math.min(H, bb.y + bb.h + pad) - sy;
    var out = root.document.createElement('canvas'); out.width = sw; out.height = sh; out.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
    var sc = ent.scale || (isEnc ? 1 : 0.36); var fit = ent.fit || (isEnc ? [600, 300] : [250, 180]);
    var w = sw * sc, h = sh * sc; var f = Math.min(1, fit[0] / w, fit[1] / h); w = Math.round(w * f); h = Math.round(h * f);
    stat.crop = [sx, sy, sw, sh]; stat.draw = [w, h];
    return { img: out, w: w, h: h, smooth: true, source: 'bossart', stat: stat };
  }

  /* ---------- 戦闘の敵の見た目 ---------- */
  // battle.js の enemyVisual から呼ぶ：新画像が読み込み済みならそれ、なければ null（呼び出し側が旧画像 → MonsterArt → Sprites）
  BossArt.visual = function (id) { var v = BossArt.get(id); return v ? { img: v.img, w: v.w, h: v.h, smooth: true, source: 'bossart' } : null; };
  // 新画像を使わないとき・使えないときの旧画像（採用したIDの元の assets/monsters 画像）。読み込み済みのときだけ返す
  function loadPrev(id) {
    var e = M().monsters && M().monsters[id]; if (!e || e.pack !== 'boss49' || !e.prev || !e.prev.path || typeof root.Image === 'undefined') return Promise.resolve(null);
    var k = key('prev', id);
    if (BossArt.ready[k]) return Promise.resolve(BossArt.ready[k]); if (BossArt.failed[k]) return Promise.resolve(null); if (BossArt.pending[k]) return BossArt.pending[k];
    var p = new Promise(function (resolve) {
      var img = new root.Image(); var sc = e.prev.scale || 1;
      img.onload = function () { delete BossArt.pending[k]; if (img.naturalWidth > 0) { BossArt.ready[k] = { img: img, w: Math.round(img.naturalWidth * sc), h: Math.round(img.naturalHeight * sc), smooth: sc !== 1, source: 'assets' }; resolve(BossArt.ready[k]); } else { BossArt.failed[k] = 'broken'; resolve(null); } };
      img.onerror = function () { delete BossArt.pending[k]; BossArt.failed[k] = 'load_error'; resolve(null); };
      img.src = base() + e.prev.path;
    });
    BossArt.pending[k] = p; return p;
  }
  BossArt.prevImage = function (id) { var v = BossArt.ready[key('prev', id)]; if (v) return v; loadPrev(id); return null; };
  BossArt.clearVis = function () { try { var b = root.Combat && root.Combat.current; if (b && b.enemies) b.enemies.forEach(function (e) { delete e._vis; }); } catch (e) { } };

  // マップに入ったら先読み（World が MAP_ENTER_HOOKS を呼ぶ）
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (map) { BossArt.prefetchMap(map); });
  root.BossArt = BossArt;
})(typeof window !== 'undefined' ? window : globalThis);
