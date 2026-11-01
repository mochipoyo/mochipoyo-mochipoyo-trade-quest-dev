/* =========================================================
   RPG / Astra（v6.5 Phase E）：星界航行船アストラ号のロジック（描画は js/ui/astraview.js。2D版・3D版 共通）
   ・世界座標：12の地域（フィールドマップ 160×120 マス）を、世界地図（WorldMap.LAYOUT）と同じ並び（3列×5段）で1枚の座標にまとめる
       地域 r のマス (x, y) → 世界 (ox + x + 0.5, oy + y + 0.5)。地域どうしの間は 48 マスの外洋
     → アストラ号はこの座標を連続して飛ぶ（地域の境目で暗転・読み込みの画面を出さない）
   ・解放：本編クリア（game_cleared）のあと、星見塔の最上階の記録者から（js/data/astra65.js）
   ・行ける空域：訪れたことのある地域だけ（State.data.visited）。まだの地域は「未踏の空域」で、近づくと進めない（物語の解放条件を飛び越えない）
   ・着陸：解放済みの地域の、町・村・城・ダンジョンの入口の近くの「安全なマス」だけ
       安全なマス＝歩いて通れる陸（海・壁・出入口・イベント・宝箱・人の上ではない）で、入口まで歩いて行ける。屋内・ダンジョンへは直接降りない
   ・置き場所：着陸した地域のマス（State.data.astra.map/x/y）。メニュー「アストラ号」→「ここへ呼ぶ」で、今いる地域へ呼び寄せられる（置き去りにならない）
   ・セーブ：State.data.astra（owned・map・x・y・flying・wx・wy・hd・alt・log）。飛んでいる途中のセーブ・読み込みも、その位置から飛び続ける
   ・飛行中は敵が出ない（探索の場面とは別の場面で飛ぶ。World.onStep を呼ばない）
   ========================================================= */
(function (root) {
  'use strict';
  var Astra = {};
  function D() { return root.State && root.State.data; }
  // 世界地図（js/ui/worldmap.js の LAYOUT）と同じ並び：列・段
  Astra.GRID = { world_dark: [0, 0], world_sky: [0, 1], world_kalion: [1, 1], world_snow: [2, 1], world: [0, 2], world_grania: [1, 2], world_islands: [0, 3], world_tempus: [1, 3], world_magicka: [2, 3], world_desert: [0, 4], world_machine: [1, 4], world_dragon: [2, 4] };
  Astra.REGION_W = 160; Astra.REGION_H = 120; Astra.GAP = 48; Astra.PAD = 40;
  Astra.CW = Astra.REGION_W + Astra.GAP; Astra.CH = Astra.REGION_H + Astra.GAP;
  Astra.WORLD = { w: Astra.PAD * 2 + 3 * Astra.CW - Astra.GAP, h: Astra.PAD * 2 + 5 * Astra.CH - Astra.GAP };
  Astra.SPEED = { low: 26, high: 44 };   // マス／秒（飛空艇は歩く速さと同じ：設定「はやい」で約10マス／秒）
  Astra.ids = function () { return Object.keys(Astra.GRID).filter(function (id) { return root.MAP_DEFS && root.MAP_DEFS[id]; }); };
  Astra.rect = function (id) { var g = Astra.GRID[id]; if (!g) return null; var x0 = Astra.PAD + g[0] * Astra.CW, y0 = Astra.PAD + g[1] * Astra.CH; return { id: id, x0: x0, y0: y0, x1: x0 + Astra.REGION_W, y1: y0 + Astra.REGION_H }; };
  Astra.toWorld = function (mapId, x, y) { var r = Astra.rect(mapId); return r ? { wx: r.x0 + x + 0.5, wy: r.y0 + y + 0.5 } : null; };
  Astra.regionAt = function (wx, wy) { var ids = Astra.ids(); for (var i = 0; i < ids.length; i++) { var r = Astra.rect(ids[i]); if (wx >= r.x0 && wx < r.x1 && wy >= r.y0 && wy < r.y1) return ids[i]; } return null; };
  Astra.toLocal = function (wx, wy) { var id = Astra.regionAt(wx, wy); if (!id) return null; var r = Astra.rect(id); return { map: id, x: Math.floor(wx - r.x0), y: Math.floor(wy - r.y0) }; };
  // いちばん近い地域（外洋にいるときの表示用）
  Astra.nearestRegion = function (wx, wy) { var best = null; Astra.ids().forEach(function (id) { var r = Astra.rect(id); var dx = Math.max(r.x0 - wx, 0, wx - r.x1), dy = Math.max(r.y0 - wy, 0, wy - r.y1); var d = Math.sqrt(dx * dx + dy * dy); if (!best || d < best.d) best = { id: id, d: d }; }); return best; };
  Astra.unlocked = function (id) { var d = D(); return !!(d && d.visited && d.visited[id]); };
  Astra.LOCK_MARGIN = 10;
  // そこへ進めるか（世界の外・未踏の空域のまわりは進めない）。戻り値：null＝進める／{ region, reason }
  Astra.blockAt = function (wx, wy) {
    if (wx < 4 || wy < 4 || wx > Astra.WORLD.w - 4 || wy > Astra.WORLD.h - 4) return { region: null, reason: 'これより先は星の海。……今はまだ、地上の空を飛ぼう。' };
    var ids = Astra.ids(); for (var i = 0; i < ids.length; i++) { var id = ids[i]; if (Astra.unlocked(id)) continue; var r = Astra.rect(id), m = Astra.LOCK_MARGIN;
      if (wx >= r.x0 - m && wx < r.x1 + m && wy >= r.y0 - m && wy < r.y1 + m) return { region: id, reason: '未踏の空域。厚い雲と乱気流で近づけない。（まだ訪れていない地域。物語を進めて、先に地上から訪れよう）' }; }
    return null;
  };

  /* ---------- 状態・セーブ ---------- */
  Astra.state = function () { var d = D(); return d && d.astra ? d.astra : null; };
  Astra.owned = function () { var s = Astra.state(); return !!(s && s.owned); };
  Astra.flying = function () { var s = Astra.state(); return !!(s && s.owned && s.flying); };
  Astra.parkedOn = function (mapId) { var s = Astra.state(); return s && s.owned && !s.flying && s.map === mapId ? { x: s.x, y: s.y } : null; };
  Astra.park = function (mapId, x, y) { var s = Astra.state(); s.map = mapId; s.x = x; s.y = y; s.flying = false; };
  Astra.grant = function () {   // 解放のイベントから。置き場所＝星見塔の近くの安全なマス
    var d = D(); if (d.astra && d.astra.owned) return d.astra;
    var lp = Astra.landingPoints('world_sky', { all: true }).filter(function (p) { return p.id === 'star_tower'; })[0] || Astra.landingPoints('world_sky', { all: true })[0];
    d.astra = { owned: true, ver: 1, map: 'world_sky', x: lp ? lp.x : 48, y: lp ? lp.y : 78, flying: false, wx: 0, wy: 0, hd: 0, alt: 'low', log: {}, at: Date.now() };
    return d.astra;
  };

  /* ---------- 着陸できる場所 ---------- */
  function landOk(m, x, y) {
    var d = D(); if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1) return false;
    var t = m.tiles[y][x]; if (root.Tiles && (root.Tiles.isWater(t) || root.Tiles.isSolid(t))) return false;
    if (!m.passable(x, y, d)) return false; if (m.warpAt(x, y) || m.eventAt(x, y) || m.npcAt(x, y)) return false;
    if ((m.chests || []).some(function (c) { return c.x === x && c.y === y; })) return false;
    if (root.Vehicle && root.Vehicle.at(m.id, x, y)) return false;
    // 出入口のすぐ隣には置かない（入口をふさがない）
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if ((dx || dy) && m.warpAt(x + dx, y + dy)) return false; }
    return !chokeAt(m, x, y);
  }
  // そこに船を置くと、まわりの通れるマスどうしが（近くで）つながらなくなるか＝細い道をふさぐか
  function chokeAt(m, x, y) {
    var d = D(); var nb = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(function (v) { return [x + v[0], y + v[1]]; }).filter(function (c) { return c[0] >= 0 && c[1] >= 0 && c[0] < m.w && c[1] < m.h && !(root.Tiles && root.Tiles.isWater(m.tiles[c[1]][c[0]])) && m.passable(c[0], c[1], d); });
    if (nb.length <= 1) return nb.length === 0;
    var seen = {}; seen[x + ',' + y] = 1; var q = [[nb[0][0], nb[0][1], 0]]; seen[nb[0][0] + ',' + nb[0][1]] = 1;
    while (q.length) { var c = q.shift(); if (c[2] >= 14) continue; [[0, 1], [1, 0], [-1, 0], [0, -1]].forEach(function (v) { var nx = c[0] + v[0], ny = c[1] + v[1], k = nx + ',' + ny; if (seen[k] || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) return; if (root.Tiles && root.Tiles.isWater(m.tiles[ny][nx])) return; if (!m.passable(nx, ny, d) && !m.warpAt(nx, ny)) return; seen[k] = 1; q.push([nx, ny, c[2] + 1]); }); }
    return nb.some(function (c) { return !seen[c[0] + ',' + c[1]]; });
  }
  Astra.landOk = landOk; Astra.chokeAt = chokeAt;
  // 入口（地域の地図の場所のマス）から歩いてたどれる、いちばん近い安全なマス（入口の上は除く）
  Astra.safeNear = function (m, x0, y0, maxSteps) {
    var d = D(); maxSteps = maxSteps || 14; var seen = {}; var q = [[x0, y0, 0]]; seen[x0 + ',' + y0] = 1;
    while (q.length) {
      var c = q.shift(); var x = c[0], y = c[1], s = c[2];
      if (s > 0 && landOk(m, x, y)) return { x: x, y: y, steps: s };
      if (s >= maxSteps) continue;
      [[0, 1], [1, 0], [-1, 0], [0, -1]].forEach(function (dv) { var nx = x + dv[0], ny = y + dv[1], k = nx + ',' + ny; if (seen[k] || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) return; seen[k] = 1;
        var t = m.tiles[ny][nx]; if (root.Tiles && root.Tiles.isWater(t)) return; if (!m.passable(nx, ny, d)) return; q.push([nx, ny, s + 1]); });
    }
    return null;
  };
  Astra._lpCache = {};
  // その地域の着陸地点 [{ id, name, region, x, y, wx, wy, to, kind }]。all：解放の判定をしない（置き場所を決めるとき用）
  Astra.landingPoints = function (regionId, opts) {
    var d = D(); var all = opts && opts.all; if (!all && !Astra.unlocked(regionId)) return [];
    var T = root.Travel; if (!T || !T.byRegion) return [];
    var key = regionId + '|' + (all ? 'a' : 'u'); var c = Astra._lpCache[key];
    var sig = JSON.stringify(Object.keys(d.flags || {}).length) + ':' + Object.keys(d.visited || {}).length;
    if (c && c.sig === sig) return c.list;
    var m; try { m = root.World.getMap(regionId); } catch (e) { return []; }
    var out = [];
    T.byRegion(regionId).forEach(function (p) {
      if (!all) { if (p.hidden && !d.visited[p.to]) return; if (p.needFlag && !d.flags[p.needFlag]) return; }
      var s = Astra.safeNear(m, p.wx, p.wy, 14); if (!s) return;
      var w = Astra.toWorld(regionId, s.x, s.y); out.push({ id: p.id, name: p.name, region: regionId, x: s.x, y: s.y, wx: w.wx, wy: w.wy, to: p.to, kind: p.kind, steps: s.steps, ex: p.wx, ey: p.wy });
    });
    Astra._lpCache[key] = { sig: sig, list: out }; return out;
  };
  Astra.allLandingPoints = function () { var out = []; Astra.ids().forEach(function (id) { out = out.concat(Astra.landingPoints(id)); }); return out; };
  Astra.nearestLanding = function (wx, wy, maxDist) {
    var best = null; Astra.allLandingPoints().forEach(function (p) { var dd = Math.hypot(p.wx - wx, p.wy - wy); if ((maxDist === undefined || dd <= maxDist) && (!best || dd < best.d)) best = { p: p, d: dd }; });
    return best ? best.p : null;
  };

  /* ---------- 観測記録（宇宙船だけのイベント）：12の地域の上空を飛ぶと、その地域の記録がたまる ---------- */
  Astra.LOG_TEXT = {
    world: 'アルカディア相場大陸：波がいちばん穏やかに見える大陸。始まりの村は、記録では「観測の基準点」と呼ばれていた。',
    world_grania: 'グラニア鉱業地方：鉱山の灯りが夜も消えない。掘り出された鉱石の重さが、大陸の傾きを少しだけ変えている。',
    world_kalion: 'カリオン徴収連邦：道がすべて王都へ集まる形。上から見ると、富が一点に流れこむ渦のようだ。',
    world_islands: '断裂群島：かつては一つの島だった。割れ目に沿って、古い観測塔の跡が並んでいる。',
    world_tempus: '時の神殿領：鐘の音が雲の上まで届く。記録装置の時計が、ここでだけ一瞬ずれた。',
    world_machine: 'ゼロメア：演算都市の光は規則正しい。……規則正しすぎて、上からは鼓動のない心臓に見える。',
    world_magicka: 'マクディア魔導王国：魔力の流れが川のように見える。起源の実験室は、その流れの上流にある。',
    world_sky: '天空群島：雲海に浮かぶ島々。記録者たちが最後に暮らした空。アストラ号の母港。',
    world_dark: '暗黒大陸：魔王城の上の雲は晴れた。それでも、ここだけ光の届き方が違う。',
    world_desert: 'リシア砂漠：蜃気楼が上空からも見える。見えるものと、そこにあるものは違う。',
    world_dragon: '竜炎火山群島：火口の熱で船体が鳴る。竜脈は、大陸の下を通って遠くまでつながっている。',
    world_snow: '忘却の雪原：雪が地形の記憶を消していく。凍結時計塔だけが、上からもはっきり見えた。'
  };
  Astra.logCount = function () { var s = Astra.state(); return s && s.log ? Object.keys(s.log).filter(function (k) { return Astra.GRID[k]; }).length : 0; };
  // 地域の上空に入ったとき（飛行中）。新しく記録したら { id, text, n, all } を返す
  Astra.record = function (id) {
    var s = Astra.state(); if (!s || !s.owned || !id || !Astra.GRID[id] || !Astra.unlocked(id)) return null; s.log = s.log || {};
    if (s.log[id]) return null; s.log[id] = Date.now(); var n = Astra.logCount(); var all = n >= Astra.ids().length;
    return { id: id, text: Astra.LOG_TEXT[id] || '', n: n, all: all };
  };

  /* ---------- 地上：止めてある船・乗る・呼ぶ ---------- */
  // 探索の画面に描くもの（world.js の extras と同じ形）
  Astra.extras = function (mapId) { var p = Astra.parkedOn(mapId); return p ? [{ x: p.x, y: p.y, vehicle: 'astra' }] : []; };
  Astra.isAt = function (mapId, x, y) { var p = Astra.parkedOn(mapId); return !!(p && p.x === x && p.y === y); };
  // 船へ進もうとしたとき（world.js の tryMove）：乗るか聞く。true＝この移動は処理した
  Astra.bump = function (m, nx, ny) {
    if (!Astra.isAt(m.id, nx, ny)) return false; var W = root.World; if (W.busy) return true;
    W.busy = true;
    root.Win.choice('星界航行船アストラ号。飛び立つ？', ['飛び立つ', 'やめる']).then(function (c) { W.busy = false; if (c === 0) Astra.takeOff(m, nx, ny); }).catch(function (e) { W.busy = false; if (root.Engine) root.Engine.onError(e); });
    return true;
  };
  Astra.takeOff = function (m, x, y) {
    var s = Astra.state(); if (!s || !s.owned) return false; if (State().data.aboard) return false;
    var w = Astra.toWorld(m.id, x, y); if (!w) return false;
    s.flying = true; s.wx = w.wx; s.wy = w.wy; s.alt = s.alt || 'low'; s.from = { map: m.id, x: x, y: y };
    root.State.data.flags.astra_first_flight = true;
    if (root.AstraView) root.AstraView.open({ takeoff: true });
    root.State.autosave(); return true;
  };
  function State() { return root.State; }
  // 着陸（飛行中 → 地域のフィールドの安全なマス）。p：着陸地点
  Astra.land = function (p) {
    var s = Astra.state(); if (!s || !s.flying || !p) return false;
    var m; try { m = root.World.getMap(p.region); } catch (e) { return false; }
    if (!landOk(m, p.x, p.y)) { var alt = Astra.safeNear(m, p.ex !== undefined ? p.ex : p.x, p.ey !== undefined ? p.ey : p.y, 14); if (!alt) return false; p = Object.assign({}, p, { x: alt.x, y: alt.y }); }
    // 船は着陸地点に止め、主人公は船の隣（入口の側）に降りる
    var stand = null; [[0, 1], [1, 0], [-1, 0], [0, -1]].some(function (dv) { var nx = p.x + dv[0], ny = p.y + dv[1]; if (landOk(m, nx, ny)) { stand = { x: nx, y: ny }; return true; } return false; });
    if (!stand) { stand = Astra.safeNear(m, p.x, p.y, 6); if (!stand) return false; }
    Astra.park(p.region, p.x, p.y);
    root.World.enterMap(p.region, stand.x, stand.y, 'down');
    return { map: p.region, x: stand.x, y: stand.y, ship: { x: p.x, y: p.y } };
  };
  // 呼び寄せ：今いる地域（フィールド）の、主人公の近くの安全なマスへ
  Astra.recallSpot = function () { var W = root.World, m = W.map, p = W.player; if (!m || m.kind !== 'field' || !Astra.GRID[m.id]) return null; var s = Astra.safeNear(m, p.x, p.y, 6); return s; };
  Astra.recall = function () { var W = root.World; var s = Astra.recallSpot(); if (!s) return false; Astra.park(W.map.id, s.x, s.y); return true; };
  // 読み込んだときの点検：置き場所が今は通れないマスなら、近くの安全なマスへ
  Astra.validate = function () {
    var s = Astra.state(); if (!s || !s.owned) return; if (s.flying) { if (!(s.wx > 0 && s.wy > 0 && s.wx < Astra.WORLD.w && s.wy < Astra.WORLD.h)) { s.flying = false; } return; }
    if (!Astra.GRID[s.map]) { s.map = 'world_sky'; s.x = 48; s.y = 78; }
    var m; try { m = root.World.getMap(s.map); } catch (e) { return; }
    if (!landOk(m, s.x, s.y)) { var n = Astra.safeNear(m, s.x, s.y, 20) || Astra.nearestSafe(m, s.x, s.y, 60); if (n) { s.x = n.x; s.y = n.y; } else { var home = Astra.landingPoints('world_sky', { all: true })[0]; if (home) { s.map = 'world_sky'; s.x = home.x; s.y = home.y; } } }
  };
  // 近くの安全なマス（海の上などから。外側へ1周ずつ探す）
  Astra.nearestSafe = function (m, x0, y0, R) { for (var r = 1; r <= (R || 40); r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var x = x0 + dx, y = y0 + dy; if (landOk(m, x, y)) return { x: x, y: y }; } return null; };
  // メニュー「アストラ号」
  Astra.menu = async function () {
    var W = root.World, Win = root.Win, s = Astra.state(); if (!s || !s.owned) return null;
    var where = s.flying ? '飛行中' : ((root.MAP_DEFS[s.map] || {}).name || s.map) + '（' + s.x + ', ' + s.y + '）';
    var here = Astra.recallSpot(); var canCall = !!here && !(s.map === W.map.id && Math.abs(s.x - W.player.x) + Math.abs(s.y - W.player.y) <= 2);
    var i = await Win.list([{ label: 'ここへ呼ぶ', disabled: !canCall, sub: here ? '今いる地域の、すぐ近くに降りてくる' : '地域のフィールド（町・ダンジョンの外）で呼べる' }, { label: '観測記録', right: Astra.logCount() + '/' + Astra.ids().length }, { label: 'いまの置き場所', right: where }], { title: '星界航行船アストラ号' });
    if (i === 0 && canCall) { Astra.recall(); Win.toast('アストラ号が降りてきた'); if (root.Audio) root.Audio.sfx('magic'); root.State.autosave(); return 'called'; }
    if (i === 1) { await Astra.showLog(); }
    if (i === 2) { await Win.message(['アストラ号は ' + where + ' にある。', 'メニューの「ここへ呼ぶ」で、今いる地域へ呼べる。']); }
    return null;
  };
  Astra.showLog = async function () {
    var s = Astra.state(), Win = root.Win; var lines = Astra.ids().map(function (id) { var n = (root.MAP_DEFS[id] || {}).name || id; return (s.log && s.log[id] ? '★ ' + Astra.LOG_TEXT[id] : '・' + n + '：まだ記録していない（上空を飛ぶと記録される）'); });
    await Win.message(['観測記録 ' + Astra.logCount() + '/' + Astra.ids().length].concat(lines));
  };
  // 読み込んだとき：置き場所の点検と、飛んでいる途中のセーブならその場所から飛び続ける
  if (root.World && root.World.start) { var origStart = root.World.start; root.World.start = function () { var r = origStart.apply(this, arguments); try { Astra.validate(); if (Astra.flying() && root.AstraView) root.AstraView.open({ resume: true }); } catch (e) { if (root.console) console.error('Astra', e); } return r; }; }
  root.Astra = Astra;
})(typeof window !== 'undefined' ? window : globalThis);
