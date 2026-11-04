/* =========================================================
   RPG / World : 探索シーン（移動・カメラ・出入り・会話・宝箱・エンカウント・昼夜）
   ========================================================= */
(function (root) {
  'use strict';

  var Engine = root.Engine, Input = Engine.Input, GameMap = root.GameMap, Tiles = root.Tiles, State = root.State, Win = root.Win, ITEMS = root.ITEMS;
  var TS = Engine.TS;

  var World = { maps: {}, map: null, player: null, busy: false, scene: null, hud: null };

  World.getMap = function (id) {
    var def = root.MAP_DEFS[id] || (id === 'world' ? root.WORLD_DEF : null);
    if (World.maps[id]) { if (def && World.maps[id].buildingKey === root.GameMap.buildingKey(def, State.data.flags)) return World.maps[id]; delete World.maps[id]; }   // 建物の表示条件が変わっていたら作り直す
    if (!def) throw new Error('マップが見つかりません: ' + id);
    var m = new GameMap(def);
    World.maps[id] = m;
    World.applyState(m);
    return m;
  };
  // セーブ状態をマップに反映（開けた宝箱・開いた扉・条件つきNPC）
  World.applyState = function (m) {
    var d = State.data;
    if (root.Minimap) root.Minimap.markDirty(m.id);
    m.chests.forEach(function (c) { var opened = d.chests[m.id + ':' + c.id]; m.setTile(c.x, c.y, opened ? 'chest_open' : 'chest'); });
    m.events.forEach(function (e) {
      if ((e.type === 'trial' || e.type === 'locked' || e.type === 'rank_door' || e.type === 'gate') && e.doneFlag && d.flags[e.doneFlag]) m.setTile(e.x, e.y, e.type === 'gate' ? ({ grass: 'grass', sand: 'sand', cave_floor: 'cave_floor', ash: 'ash', snow: 'snow', darkland: 'darkland' }[m.def.fallback] || 'floor_stone') : (m.kind === 'dungeon' && m.tile(e.x, e.y) === 'gate' ? 'warp' : 'door'));
      else if (e.type === 'trial') m.setTile(e.x, e.y, 'gate');
      else if (e.type === 'locked' || e.type === 'rank_door') m.setTile(e.x, e.y, 'door_locked');
      else if (e.type === 'gate') m.setTile(e.x, e.y, 'fence');
      if (e.type === 'hole') m.setTile(e.x, e.y, 'hole');
      if (e.type === 'learn') m.setTile(e.x, e.y, 'learn_rune');
      if (e.type === 'pickup') m.setTile(e.x, e.y, d.flags[e.doneFlag] ? 'chest_open' : 'chest');   // v5.2
      if (e.tile && root.Tiles && root.Tiles.has(e.tile)) m.setTile(e.x, e.y, (e.doneTile && d.flags[e.tileFlag || e.doneFlag]) ? e.doneTile : e.tile);   // v5.6 調べる物の見た目（灯籠・レバー・記憶の核など）
      if (e.type === 'boss' && e.optional) m.setTile(e.x, e.y, (e.doneFlag && d.flags[e.doneFlag]) ? ({ cave_floor: 'cave_floor', ash: 'ash', snow: 'snow', sand: 'sand', grass: 'grass', darkland: 'darkland', floor_wood: 'floor_wood' }[m.def.fallback] || 'floor_stone') : 'boss_mark');
    });
    m.npcs.forEach(function (n) { if (n.showIf) n.hidden = !d.flags[n.showIf]; if (n.hideIf && d.flags[n.hideIf]) n.hidden = true; if (n.showWhen) { try { n.hidden = !n.showWhen(d); } catch (e) { n.hidden = true; } } if (root.COMPANIONS && root.COMPANIONS[n.id] && d.companions[n.id]) n.hidden = true; });   // v6.9 showWhen：物語の段階で出し入れする人（js/data/story3121.js）
  };

  /* ---------- プレイヤー ---------- */
  World.makePlayer = function () {
    var d = State.data; var hero = d.hero;
    World.player = { x: d.pos.x, y: d.pos.y, px: d.pos.x * TS, py: d.pos.y * TS, dir: d.pos.dir || 'down', frame: 0, moving: false, tx: 0, ty: 0, progress: 0, sprite: hero.sprite, speed: World.walkSpeed() };
    return World.player;
  };
  // 歩く速度（設定）：ふつう 1.0 / はやい 1.5 / とてもはやい 2.0
  World.WALK = { normal: 1, fast: 1.5, faster: 2 };
  World.walkSpeed = function () { var st = State.data && State.data.settings; var m = World.WALK[st && st.walkSpeed] || 1; return 0.11 * m; };
  World.applyWalkSpeed = function () { if (World.player) World.player.speed = World.walkSpeed(); };
  World.nearestFree = function (m, x, y) { for (var r = 1; r <= 8; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; if (m.passable(nx, ny, State.data) && !m.warpAt(nx, ny)) return { x: nx, y: ny }; } return null; };
  World.syncPos = function () { var p = World.player; State.data.pos = { map: World.map.id, x: p.x, y: p.y, dir: p.dir }; };

  World.enterHooks = root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || [];   // データ側（snow.js など）が先に読み込まれて登録する
  World.enterMap = function (id, x, y, dir, opt) {
    if (root.MapRemake && !(opt && opt.raw)) { var rp = root.MapRemake.pos(id, x, y, dir); x = rp.x; y = rp.y; }   // v7.1 作り直したダンジョン：旧座標 → 新しい座標（js/rpg/mapremake.js）
    World.map = World.getMap(id); World._lmAt = null; World._lmGrace = 2;   // v6.6 触れたら入る範囲：着いてから2歩は反応しない（入口のマスに乗ったときは従来どおり入る）。出口の先へ歩き続けて、すぐ入り直さないように
    World.enterHooks.forEach(function (fn) { try { fn(World.map); } catch (e) { console.error(e); } });   // v5.6 マップに入るときの処理（凍結時計塔の時限など）
    World.applyState(World.map);
    var p = World.player || World.makePlayer();
    var aboardOk = State.data.aboard && root.Vehicle && root.Vehicle.terrainOk(State.data.aboard, World.map, x, y);
    if (!aboardOk && State.data.aboard && root.Vehicle) { root.Vehicle.disembark(); }   // 乗船中のはずが海上でなければ下船扱い（セーブ破損対策）
    if (!aboardOk && !World.map.passable(x, y, State.data)) { var nf = World.nearestFree(World.map, x, y); if (nf) { x = nf.x; y = nf.y; } }
    if (root.Vehicle) { root.Vehicle.unlockIfReady(); if (State.data.aboard) root.Vehicle.syncToPlayer(World.map, x, y); }   // v4.4: 建物配置の変更などで立ち位置が塞がっていたら近くの通れるマスへ
    p.x = x; p.y = y; p.px = x * TS; p.py = y * TS; p.moving = false; if (dir) p.dir = dir;
    p.sprite = State.data.hero.sprite;
    State.data.visited[id] = true;
    World.syncPos();
    if (root.Minimap) root.Minimap.onEnterMap(World.map, p);
    if (root.Audio) root.Audio.playBgm(World.map.def.bgm || (World.map.kind === 'field' ? 'field' : 'town'));
    World.updateHud(); World.updatePlaceLabel();
    State.autosave();
  };

  /* ---------- シーン ---------- */
  function ExploreScene() { }
  ExploreScene.prototype.enter = function () { World.updateHud(); };
  ExploreScene.prototype.handleInput = function () {
    if (World.busy) return;
    var p = World.player;
    if (Input.consume('cancel')) { root.Menu.open(); return; }
    if (Input.consume('ok')) { if (!World.justTalked()) World.interact(); return; }   // v6.2 会話を閉じた直後の連打で、同じ人との会話がすぐ始まらないように
    if (!p.moving) {
      var dir = Input.direction();
      if (dir) World.tryMove(dir);
    }
  };
  ExploreScene.prototype.update = function (dt) {
    var p = World.player; var m = World.map;
    if (root.Minimap) root.Minimap.frame(dt);
    if (p.moving) {
      p.progress += dt * p.speed / 16;
      if (p.progress >= 1) { p.x = p.tx; p.y = p.ty; p.px = p.x * TS; p.py = p.y * TS; p.moving = false; p.progress = 0; p.frame = 0; p.phase = 0; World.onStep(); }
      else { var dx = (p.tx - p.x) * TS, dy = (p.ty - p.y) * TS; p.px = p.x * TS + dx * p.progress; p.py = p.y * TS + dy * p.progress; p.frame = Math.floor(p.progress * 4) % 2; p.phase = Math.floor(p.progress * 4) % 4; }
    }
    // v6.4 Phase F 仲間の隊列：主人公の足跡を記録（3D表示中は3D側が自由移動の位置で記録する）
    if (root.Follow && !(root.MTQ3D && root.MTQ3D.mode3D && root.MTQ3D.mode3D())) root.Follow.update(m, p.px / TS + 0.5, p.py / TS + 0.5, p.dir);
    // NPCの徘徊
    if (!World.busy) m.npcs.forEach(function (n) {
      if (n.hidden || !n.wander) return;
      if (n.moveT === undefined) n.moveT = Math.random() * 2000;
      if (n.moving) {
        n.prog += dt / 420; if (n.prog >= 1) { n.x = n.nx; n.y = n.ny; n.moving = false; n.ox_px = 0; n.oy_px = 0; n.frame = 0; n.phase = 0; }
        else { n.ox_px = (n.nx - n.x) * TS * n.prog; n.oy_px = (n.ny - n.y) * TS * n.prog; n.frame = Math.floor(n.prog * 4) % 2; n.phase = Math.floor(n.prog * 4) % 4; }
        return;
      }
      n.moveT -= dt; if (n.moveT > 0) return; n.moveT = 1500 + Math.random() * 2500;
      if (World.facingNpc(n) || (n.holdUntil && Date.now() < n.holdUntil)) { n.moveT = 700; return; }   // holdUntil：3D版で「話す」の対象になっている   // v6.2 主人公が隣で向き合っている（話しかけようとしている）あいだは歩き出さない
      var dirs = ['up', 'down', 'left', 'right']; var dir = dirs[Math.floor(Math.random() * 4)]; var dd = delta(dir);
      var nx = n.x + dd[0], ny = n.y + dd[1];
      n.dir = dir;
      if (Math.abs(nx - n.ox) > n.wander || Math.abs(ny - n.oy) > n.wander) return;
      if (!m.passable(nx, ny, State.data) || (nx === p.x && ny === p.y) || (nx === p.tx && ny === p.ty && p.moving)) return;
      if (m.warpAt(nx, ny) || m.eventAt(nx, ny)) return;
      if (root.Follow && root.Follow.occupies(nx, ny)) return;   // v6.4 隊列の仲間が立っているマスへは歩かない
      n.moving = true; n.nx = nx; n.ny = ny; n.prog = 0;
    });
  };
  ExploreScene.prototype.draw = function (ctx) {
    var m = World.map, p = World.player;
    var cam = World.camera();
    p.vehicle = State.data.aboard || null;
    p.followers = (root.Follow && !p.vehicle) ? root.Follow.drawList(TS, p) : null;   // v6.4 Phase F 仲間の隊列
    var extras = root.Vehicle ? root.Vehicle.onMap(m.id).filter(function (v) { return !v.aboard; }).map(function (v) { return { x: v.x, y: v.y, vehicle: v.id }; }) : [];
    if (root.Astra) extras = extras.concat(root.Astra.extras(m.id));   // v6.5 Phase E 止めてあるアストラ号
    m.draw(ctx, cam, p, World.tint(), extras);
    if (root.WarpMark) { try { root.WarpMark.draw2D(ctx, m, cam, p, TS); } catch (e) { /* 目印が描けなくても探索は続ける */ } }   // v7.0 階段（下り・上り）とダンジョンの出入口の目印
    if (root.SeaTreasure) { try { root.SeaTreasure.draw2D(ctx, m, cam, TS); } catch (e) { /* 描けなくても探索は続ける */ } }   // v7.0 海の底の拾い物のきらめき
    // v6.2 次の目的地：画面の中にあれば、控えめな赤い輪（地図の上の文字や人を隠さない細い線）
    if (root.Nav && root.Nav.enabled()) { try { var TSz = Engine.TS; root.Nav.markers(m.id).forEach(function (mk) { var sx = mk.x * TSz - cam.x + TSz / 2, sy = mk.y * TSz - cam.y + TSz / 2; if (sx < -TSz || sy < -TSz || sx > ctx.canvas.width + TSz || sy > ctx.canvas.height + TSz) return; var a = 0.4 + 0.35 * Math.sin(Date.now() / 420); ctx.save(); ctx.lineWidth = mk.primary ? 3 : 2; ctx.strokeStyle = 'rgba(0,0,0,' + (a * 0.5) + ')'; ctx.beginPath(); ctx.arc(sx, sy, TSz * 0.66 + 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,58,58,' + a + ')'; if (!mk.primary && ctx.setLineDash) ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(sx, sy, TSz * 0.66, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }); } catch (e) { if (!World._navErr) { World._navErr = true; console.error('nav', e); } } }
    // v5.5 視界制限（砂嵐の回廊など）：map.def.vision タイル。上位足の眼鏡（sight）で広がる
    var vis = m.def && m.def.vision; if (vis && ctx.createRadialGradient) { var sight = (root.Minimap && root.Minimap.partyFx) ? (root.Minimap.partyFx('sight') || 0) : 0; var R = (vis + sight) * TS; var sx = p.px - cam.x + TS / 2, sy = p.py - cam.y + TS / 2; var grd = ctx.createRadialGradient(sx, sy, R * 0.35, sx, sy, R); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, m.def.visionColor || 'rgba(170,128,70,0.97)'); ctx.fillStyle = grd; ctx.fillRect(-TS, -TS, (Engine.VIEW_W + 2) * TS, (Engine.VIEW_H + 2) * TS); }
  };
  World.camera = function () {
    var p = World.player; var m = World.map; var vw = Engine.VIEW_W * TS, vh = Engine.VIEW_H * TS;
    var cx = p.px + TS / 2 - vw / 2, cy = p.py + TS / 2 - vh / 2;
    var maxX = m.w * TS - vw, maxY = m.h * TS - vh;
    if (maxX < 0) cx = maxX / 2; else cx = Engine.clamp(cx, 0, maxX);
    if (maxY < 0) cy = maxY / 2; else cy = Engine.clamp(cy, 0, maxY);
    return { x: Math.round(cx), y: Math.round(cy) };
  };
  // 昼夜（フィールドのみ）: timeOfDay 0..1
  World.tint = function () {
    if (World.map.def && World.map.def.tint) return World.map.def.tint;   // v6.9 マップ固有の色（襲撃の夜のアサナ村：炎に照らされた赤）
    if (World.map.kind !== 'field' && World.map.kind !== 'town') return null;
    var t = State.data.timeOfDay; // 0=深夜 0.25=朝 0.5=昼 0.75=夕
    var night = Math.max(0, Math.cos(t * Math.PI * 2)); // 0付近で1
    if (night < 0.15) return null;
    return 'rgba(10,15,60,' + (night * 0.5).toFixed(2) + ')';
  };
  function delta(dir) { return { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir]; }
  World.delta = delta;

  World.tryMove = function (dir) {
    var p = World.player, m = World.map; p.dir = dir; var d = delta(dir);
    var nx = p.x + d[0], ny = p.y + d[1];
    p.vehicleAction = null;
    if ((nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) && root.EdgeExit && root.EdgeExit.tryLeave(m, p.x, p.y, dir)) return false;   // v6.5 村・町の開いている外周から外へ（登録した区間だけ）
    if (!State.data.aboard && root.Astra && root.Astra.bump(m, nx, ny)) return false;   // v6.5 Phase E 止めてあるアストラ号へ進む＝飛び立つか聞く
    var vr = root.Vehicle ? root.Vehicle.resolveMove(m, nx, ny) : null;   // v5.0: 乗船・航行・下船
    if (vr) { if (!vr.ok) { var why = root.Vehicle.blockReason(m, nx, ny); if (why && !p._blockToastAt || (why && Date.now() - p._blockToastAt > 1500)) { p._blockToastAt = Date.now(); Win.toast(why); } return false; } p.vehicleAction = vr; }
    else if (!m.passable(nx, ny, State.data)) { if (root.BossSymbol && root.BossSymbol.bump(m, nx, ny, dir)) return false; if (root.QuizSymbol && root.QuizSymbol.bump(m, nx, ny, dir)) return false; var bn = m.npcOn(nx, ny); if (bn) World.pushAgainst(bn); return false; }   // v6.5 ボスのシンボルにぶつかる＝調べる   // v5.7 歩き回る人は道をあける（v6.2：押し続けたときだけ。近づいた・向いただけでは動かない）
    p.moving = true; p.tx = nx; p.ty = ny; p.progress = 0;
    return true;
  };

  // v6.2 主人公が NPC の隣にいて、その NPC の方を向いているか（会話しようとしている）
  World.facingNpc = function (n) {
    var p = World.player; if (!p || !n || n.hidden || p.moving) return false; var d = delta(p.dir); if (!d) return false;
    var fx = p.x + d[0], fy = p.y + d[1]; return (n.x === fx && n.y === fy) || (n.moving && n.nx === fx && n.ny === fy);
  };
  // v6.2 道をあけてもらう判定（2D・3D 共通）。NPC に向かって進もうとし続けたときだけ、横へよけてもらう
  //  ・話せる NPC：1.2秒押し続けたら（近づいて向いただけ・話しかけるために近づいただけでは動かない）
  //  ・話さない NPC：0.35秒
  //  ・立ち止まっている NPC（門番・警備兵など wander 0）は動かさない（従来どおり）
  World.PASS_DELAY = { talk: 1200, other: 350 };
  // v6.2 決定キーの連打：会話を閉じてから 220ms 以内に、同じ人へ話しかけ直そうとしたか（キー入力からの話しかけだけで使う。宝箱・イベント・ほかの人は待たない）
  World.justTalked = function () { var p = World.player, m = World.map; if (!p || !m || !World._talkEndNpc || !World._talkEnd || Date.now() - World._talkEnd >= 220) return false; var d = delta(p.dir); if (!d) return false; var n = m.npcOn(p.x + d[0], p.y + d[1]) || (m.tile(p.x + d[0], p.y + d[1]) === 'counter' ? m.npcOn(p.x + d[0] * 2, p.y + d[1] * 2) : null); return n === World._talkEndNpc; };
  World.pushAgainst = function (n) {
    if (!n || n.hidden || !n.wander || World.busy) { World._push = null; return false; }
    var now = Date.now(); var st = World._push;
    if (!st || st.n !== n || now - st.last > 260) st = World._push = { n: n, since: now, last: now };
    st.last = now;
    if (n.moving || now - st.since < (n.talk ? World.PASS_DELAY.talk : World.PASS_DELAY.other)) return false;
    World._push = null; return World.nudgeNpc(n);
  };
  // v5.7 歩き回る NPC に主人公がぶつかったら、横（なければ奥）へ1歩よけてもらう。立ち止まっている NPC（wander 0）は動かさない
  World.nudgeNpc = function (n) {
    var m = World.map, p = World.player, d = State.data; if (!n || n.hidden || !n.wander || n.moving || World.busy) return false;
    var ax = n.x - p.x, ay = n.y - p.y;   // 主人公 → NPC の向き
    var cand = [[ay, ax], [-ay, -ax], [ax, ay]];   // 横・反対の横・奥
    if (Math.random() < 0.5) cand = [cand[1], cand[0], cand[2]];
    for (var i = 0; i < cand.length; i++) {
      var dx = cand[i][0], dy = cand[i][1]; if (!dx && !dy) continue; var nx = n.x + dx, ny = n.y + dy;
      if ((nx === p.x && ny === p.y) || !m.passable(nx, ny, d) || m.warpAt(nx, ny) || m.eventAt(nx, ny)) continue;
      n.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'; n.moving = true; n.nx = nx; n.ny = ny; n.prog = 0; n.moveT = 2500; return true;
    }
    return false;
  };

  // 1歩進んだとき：ワープ・落とし穴・エンカウント・時間経過
  World.onStep = function () {
    var p = World.player, m = World.map, d = State.data; var landed = false;
    d.steps++; World.syncPos();
    if (root.Vehicle) {   // v5.0: 乗り物
      var va = p.vehicleAction; p.vehicleAction = null; landed = !!(va && va.disembark);
      if (va && va.board) { root.Vehicle.board(va.board, m, p.x, p.y); Win.toast(root.VEHICLES[va.board].name + 'に乗った'); if (root.Audio) root.Audio.sfx('step'); }
      else if (va && va.disembark) { root.Vehicle.disembark(); Win.toast('上陸した：' + (root.Harbors ? root.Harbors.areaName(m, p.x, p.y) : m.name)); }   // v6.2 上陸したときに地名
      if (d.aboard) {
        root.Vehicle.syncToPlayer(m, p.x, p.y);
        var route = root.Vehicle.routeAt(m, p.x, p.y);
        if (route) { var arr = root.Vehicle.arrival(route, p.x, p.y); if (arr) { World.busy = true; var arrLines = [route.name + '。' + (root.MAP_DEFS[arr.map] || {}).name + 'の海域に入った。']; var ah = root.Harbors && root.Harbors.arrivalHint(arr.map, arr.x, arr.y); if (ah) arrLines.push(ah); Win.message(arrLines).then(function () { World.busy = false; World.doWarp({ to: arr.map, tx: arr.x, ty: arr.y }); }); return; } }   // v6.2 着いた海域の桟橋の方角
        if (root.Vehicle.flies()) { World.updatePlaceLabel(); if (root.Minimap) root.Minimap.onStep(m, p); return; }   // v5.4: 飛行中は町・洞窟・イベント・エンカウントなし
        var drift = root.Vehicle.drift(m, p.x, p.y);   // v5.2: 外海の海流・嵐
        if (drift) { p.x = drift.x; p.y = drift.y; p.px = p.x * 32; p.py = p.y * 32; root.Vehicle.syncToPlayer(m, p.x, p.y); Win.toast(drift.text); if (!d.flags.drift_seen) { d.flags.drift_seen = true; World.busy = true; Win.message(['外海の海流に船が流された。', '外海では海流に流されることがある。嵐に遭うと大きく流される。航海士がいれば海流を読んで避けやすい。']).then(function () { World.busy = false; }); return; } }
        if (!World.busy && root.SeaTreasure && root.SeaTreasure.afterStep(m, p)) return;   // v7.0 海の底の拾い物（船で近くを通ったとき）
      }
      World.updatePlaceLabel();
    }
    if (root.Minimap) root.Minimap.onStep(m, p);
    if (root.BossSymbol) { root.BossSymbol.onStep(m, p); if (root.BossSymbol.stepOn(m, p)) return; }   // v6.5 ボスの気配・ふさがないシンボルは踏むと調べる
    if (root.QuizSymbol) { root.QuizSymbol.onStep(m, p); if (root.QuizSymbol.stepOn(m, p)) return; }   // クイズモンスターの気配・ふさがないシンボルは踏むと触れる
    if (m.kind === 'field') d.timeOfDay = (d.timeOfDay + 0.0025) % 1;
    var w = m.warpAt(p.x, p.y);
    // v6.6 フィールドの町・城・洞窟・塔：入口のまわり（絵・3Dモデルが重なるマス）に外から触れたら、入口に乗ったのと同じ扱い
    var lmHere = (!w && !d.aboard && m.kind === 'field') ? World.landmarkTouch(m, p.x, p.y) : null; var lmPrev = World._lmAt;
    World._lmAt = { m: m, x: p.x, y: p.y, w: lmHere };
    var lmGrace = World._lmGrace > 0; if (lmGrace) World._lmGrace--;
    if (lmHere && !landed && !lmGrace) {   // 上陸した1歩・別の地図から着いた直後の2歩では入らない
      var lmWas;
      if (lmPrev && lmPrev.m === m && Math.max(Math.abs(lmPrev.x - p.x), Math.abs(lmPrev.y - p.y)) <= 1) lmWas = lmPrev.w;
      else { var lmd = delta(p.dir) || [0, 0]; lmWas = World.landmarkTouch(m, p.x - lmd[0], p.y - lmd[1]); }   // 出てきた直後など：来た方向の1マス手前で判断
      if (lmWas !== lmHere) w = lmHere;   // 範囲の中を歩いているだけ（出てきた所が範囲の中など）のときは入らない
    }
    if (w && (!w.needFlag || d.flags[w.needFlag])) { if (m.def.onStep) m.def.onStep(m, p, true); World.doWarp(w); return; }
    if (w && w.needFlag && !d.flags[w.needFlag] && !w.hidden) { World.lockedWarp(w); return; }   // v6.2 閉ざされた場所：理由を表示（フラグは変えない）
    if (m.def.onStep && m.def.onStep(m, p)) return;   // v5.6 マップごとの歩数処理（凍結時計塔の時限扉など）。true なら以降の処理をしない
    var ev = m.eventAt(p.x, p.y);
    if (ev && ev.type === 'hole') { World.busy = true; Win.message(ev.text).then(function () { World.busy = false; World.enterMap(ev.to, ev.tx, ev.ty, 'down'); }); return; }
    // 毒の歩行ダメージ
    State.partyActors().forEach(function (a) { if (!a.dead && a.status.poison && d.steps % 4 === 0) { a.hp = Math.max(1, a.hp - 1); } });
    World.updatePlaceLabel();
    // v6.4 危険察知の鐘（陸）・潮風の護符（海）の残り歩数。切れたら知らせる（セーブの counters に入る）
    if (d.counters && !d.aboard && d.counters.repel_steps > 0) { d.counters.repel_steps--; if (d.counters.repel_steps === 0) Win.toast('危険察知の鐘の効果が切れた'); }
    if (d.counters && d.aboard && d.counters.seacharm_steps > 0) { d.counters.seacharm_steps--; if (d.counters.seacharm_steps === 0) Win.toast('潮風の護符の効果が切れた'); }
    var encDef = (d.aboard && root.Vehicle) ? root.Vehicle.encounters() : m.encounters;
    if (encDef && !World.busy) {
      // 戦闘直後はしばらく出ない（猶予8歩）→ その後は歩くほど確率が上がる（基礎×0.5 → 25歩で基礎×1.5）
      d.stepsSinceBattle = (d.stepsSinceBattle || 0) + 1;
      var since = d.stepsSinceBattle;
      if (since > 8) {
        var rate = encDef.rate * Math.min(1.5, 0.5 + (since - 8) / 25); if (d.flags.repel) rate *= 0.3;
        if (!d.aboard && (d.counters.repel_steps || 0) > 0) rate *= 0.35;   // v6.4 危険察知の鐘
        if (Math.random() < rate) World.encounter(encDef);
      }
    }
    World.updateHud();
  };
  // v6.6 町・城・洞窟・塔の「触れたら入る」範囲：入口のまわり（地図の絵・3Dの建物が重なるマス。歩けるマスだけ）。マップごとに一度だけ計算して覚える
  //   ・形：横5×奥行き4（四隅を除く。塔は横3×奥行き4）。出てくる側（＝近づく側）へ1マス、反対側へ2マス
  //   ・ほかの出入口・イベント・宝箱のマスは含めない
  //   ・道をふさぐ場合（範囲を通れないものとすると、まわりの歩けるマス同士がつながらなくなる）は、ふさがないマスだけ（なければ入口だけ＝従来どおり）
  //   ・隠し場所（hidden）で未解放のものは反応しない
  World.LM_TOUCH = { village: 1, castle_icon: 1, cave_icon: 1, tower_icon: 1 };
  // 出てくる側（その場所から出たときに立つマスの向き）＝正面。[dx,dy] の単位ベクトル。わからなければ南
  World.landmarkFace = function (m, w) {
    if (!w) return [0, 1]; if (w._lmFace) return w._lmFace;
    var defs = root.MAP_DEFS || {}; var dst = defs[w.to]; var cnt = {};
    ((dst && dst.warps) || []).forEach(function (b) {
      if (b.to !== m.id || b.tx === undefined) return; var dx = b.tx - w.x, dy = b.ty - w.y; if (Math.abs(dx) + Math.abs(dy) > 4 || (!dx && !dy)) return;
      var k = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N'); cnt[k] = (cnt[k] || 0) + 1;
    });
    var best = 'S', n = 0; ['S', 'N', 'E', 'W'].forEach(function (k) { if ((cnt[k] || 0) > n) { n = cnt[k]; best = k; } });
    w._lmFace = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[best]; return w._lmFace;
  };
  World.landmarkFoot = function (m) {
    if (!m || m.kind !== 'field' || !m.warps || !m.tiles) return null;
    if (m._lmFoot) return m._lmFoot;
    var foot = {}, stats = { full: 0, part: 0, none: 0 }, W = m.w, H = m.h;
    var walk = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !Tiles.isSolid(m.tiles[y][x]); };
    // 窓（入口から半径 R）の中で、block を通らずにつながる成分の番号
    var R = 12;
    var label = function (w, block) {   // lab：マス→成分の番号、info：成分ごとの広さ・窓の端に届くか・中に出入口などがあるか
      var lab = {}, info = {}, id = 0;
      for (var y0 = w.y - R; y0 <= w.y + R; y0++) for (var x0 = w.x - R; x0 <= w.x + R; x0++) {
        var k0 = x0 + ',' + y0; if (lab[k0] !== undefined || !walk(x0, y0) || block[k0]) continue;
        id++; lab[k0] = id; var q = [[x0, y0]]; var inf = info[id] = { n: 0, open: false, thing: false };
        while (q.length) { var c = q.pop(); var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]; inf.n++;
          if (Math.abs(c[0] - w.x) >= R || Math.abs(c[1] - w.y) >= R) inf.open = true;
          if (m.warpAt(c[0], c[1]) || m.eventAt(c[0], c[1]) || (m.chestAt && m.chestAt(c[0], c[1]))) inf.thing = true;
          for (var i = 0; i < 4; i++) { var nx = c[0] + nb[i][0], ny = c[1] + nb[i][1]; if (Math.abs(nx - w.x) > R || Math.abs(ny - w.y) > R) continue; var k = nx + ',' + ny; if (lab[k] !== undefined || !walk(nx, ny) || block[k]) continue; lab[k] = id; q.push([nx, ny]); } }
      }
      return { lab: lab, info: info };
    };
    var cuts = function (w, cand) {   // true＝道をふさぐ（行き止まりの小さなすき間（10マス以下・何もない）が切り離されるだけなら気にしない）
      var b0 = {}; b0[w.x + ',' + w.y] = 1; var b1 = { }; b1[w.x + ',' + w.y] = 1; cand.forEach(function (c) { b1[c[0] + ',' + c[1]] = 1; });
      var L0 = label(w, b0), L1 = label(w, b1), l0 = L0.lab, l1 = L1.lab; var edge = [];
      var minor = function (k) { var f = L1.info[l1[k]]; return f && !f.open && !f.thing && f.n <= 10; };
      for (var y = w.y - 3; y <= w.y + 3; y++) for (var x = w.x - 3; x <= w.x + 3; x++) { var k = x + ',' + y; if (b1[k] || !walk(x, y)) continue; var near = b1[(x + 1) + ',' + y] || b1[(x - 1) + ',' + y] || b1[x + ',' + (y + 1)] || b1[x + ',' + (y - 1)]; if (near && !minor(k)) edge.push(k); }
      for (var i = 0; i < edge.length; i++) for (var j = i + 1; j < edge.length; j++) if (l0[edge[i]] === l0[edge[j]] && l1[edge[i]] !== l1[edge[j]]) return true;
      return false;
    };
    m.warps.forEach(function (w) {
      if (!World.LM_TOUCH[m.tile(w.x, w.y)]) return;
      var cand = []; var f = World.landmarkFace(m, w); var half = m.tile(w.x, w.y) === 'tower_icon' ? 1 : 2;
      for (var v = -2; v <= 1; v++) for (var u = -half; u <= half; u++) {   // u：横、v：正面方向（+1＝出てくる側）
        if (!u && !v) continue; if (half === 2 && Math.abs(u) === 2 && (v === -2 || v === 1)) continue;
        var dx = f[0] * v - f[1] * u, dy = f[1] * v + f[0] * u; var x = w.x + dx, y = w.y + dy;
        if (!walk(x, y) || m.warpAt(x, y) || m.eventAt(x, y) || (m.chestAt && m.chestAt(x, y)) || foot[x + ',' + y]) continue;
        cand.push([x, y]);
      }
      var use = cand, kind = 'full';
      if (cuts(w, use)) {   // 1マスずつ、道をふさがないものだけ足す（入口の正面 → 横 → 奥の順）
        use = []; kind = 'part';
        var rank = function (c) { var vv = (c[0] - w.x) * f[0] + (c[1] - w.y) * f[1], uu = Math.abs((c[0] - w.x) * f[1] - (c[1] - w.y) * f[0]); return vv === 1 && !uu ? 0 : vv === 0 ? uu : vv === 1 ? 2 + uu : 4 + uu - vv; };
        cand.slice().sort(function (a, b) { return rank(a) - rank(b); })
          .forEach(function (c) { if (!cuts(w, use.concat([c]))) use.push(c); });
        if (!use.length) kind = 'none';
      }
      stats[kind]++; w._lmFootKind = kind; use.forEach(function (c) { foot[c[0] + ',' + c[1]] = w; });
    });
    m._lmFoot = foot; m._lmFootStats = stats; return foot;
  };
  World.landmarkTouch = function (m, x, y) {
    var f = World.landmarkFoot(m); var w = f && f[x + ',' + y]; if (!w) return null;
    var d = State.data; if (w.hidden && w.needFlag && !(d && d.flags && d.flags[w.needFlag])) return null;
    return w;
  };
  // v6.2 needFlag で閉ざされた場所に乗ったとき：理由（lockedText）と、ヒント設定が「詳細」なら次にすること
  World.lockedWarp = function (w) {
    var lines = (w.lockedText && w.lockedText.length) ? w.lockedText.slice() : [(w.name || 'この場所') + 'は、今は閉ざされていて入れない。'];
    var hint = root.Nav && root.Nav.unlockHint ? root.Nav.unlockHint(w.needFlag) : null; if (hint) lines.push(hint);
    World.busy = true; Win.message(lines, { name: w.name }).then(function () { World.busy = false; World.updateHud(); });
  };
  World.doWarp = function (w) {
    if (typeof root.redirectWarp === 'function') { try { var w2 = root.redirectWarp(w, World.map, State.data); if (w2) w = w2; } catch (e) { } }   // v6.8 古いセーブのための行き先の読み替え（js/data/tweaks68.js）
    World.busy = true;
    var ride = (w.ride && root.Ride && root.Ride.play) ? root.Ride : null;   // v7.1 エレベーターなどの乗り物（js/data/remake71-tradia.js）：乗る演出 → 移動 → 着く演出
    var go = function () {
      var fade = document.getElementById('fade'); if (fade) fade.classList.add('on');
      setTimeout(function () {
        var dir = World.player.dir;
        World.enterMap(w.to, w.tx, w.ty, w.face || ((root.MAP_DEFS[w.to] && root.MAP_DEFS[w.to].region) ? (State.data.aboard ? dir : 'down') : dir));   // v6.5 face：外周から出たときは出た向きのまま
        if (ride) { if (fade) fade.classList.remove('on'); var fin = function () { World.busy = false; }; ride.arrive(w).then(fin, fin); return; }
        setTimeout(function () { if (fade) fade.classList.remove('on'); World.busy = false; if (root.Audio) root.Audio.sfx('step'); }, 150);
      }, 180);
    };
    if (!ride) { go(); return; }
    var ask = w.ask && Win.choice ? Win.choice(w.ask, ['乗る', 'やめる']) : Promise.resolve(0);
    Promise.resolve(ask).then(function (a) { if (a !== 0) { World.busy = false; return; } ride.play(w).then(go, go); }, function () { World.busy = false; });
  };

  World.encounter = function (encDef) {
    var m = World.map, p = World.player; var enc = encDef || m.encounters; if (!enc) return;
    var zone = enc.zones.filter(function (z) { return z.test(p.x, p.y, m); })[0]; if (!zone) return;
    var group = zone.groups[Math.floor(Math.random() * zone.groups.length)];
    var rare = false; if (zone.rare && Math.random() < (zone.rareRate || 0.02)) { group = zone.rare[Math.floor(Math.random() * zone.rare.length)]; rare = true; }
    var bopts = { zone: zone.name };
    if (!rare && root.EnemyScale) { try { var ks = root.EnemyScale.factors(m.id, zone); if (ks) bopts.scale = ks; } catch (e) { /* 倍率なしで続ける */ } }   // v6.7 地域の強さ（js/data/enemy-scale67.js）
    if (World.isSolo()) { group = World.soloCap(group); bopts.maxEnemies = World.SOLO_MAX; }   // v5.8 仲間がいないときは1〜2体まで
    World.startBattle(group, bopts);
  };
  // v5.8 仲間がいない（戦闘メンバーが主人公1人）ときは、ランダムに出現する敵を1〜2体にする
  // ・3体以上の群れは、並び順を保ったままランダムに2体だけ残す。戦闘中の「仲間を呼ぶ」も2体まで
  // ・ボス戦・イベントの戦闘は対象外（ここはランダムエンカウント専用）
  World.SOLO_MAX = 2;
  World.isSolo = function () { return State.partyActors().length <= 1; };
  World.soloCap = function (group) {
    var g = (group || []).slice(); if (g.length <= World.SOLO_MAX) return g;
    var idx = g.map(function (_, i) { return i; }); var keep = [];
    while (keep.length < World.SOLO_MAX) keep.push(idx.splice(Math.floor(Math.random() * idx.length), 1)[0]);
    keep.sort(function (a, b) { return a - b; });
    return keep.map(function (i) { return g[i]; });
  };
  World.startBattle = function (enemyIds, opts) {
    World.busy = true; opts = opts || {}; State.data.stepsSinceBattle = 0;
    return root.BattleUI.start(enemyIds, opts).then(function (result) {
      World.busy = false;
      if (result === 'lost') return World.gameOver();
      World.updateHud(); State.autosave();
      return result;
    });
  };
  World.gameOver = function () {
    World.busy = true;
    // v6.8 全滅で失うお金：所持金の半分 → 3分の1（ご要望で軽く）
    var d0 = State.data; var lose = Math.floor((d0.gold || 0) / 3);
    return Win.message(['全滅してしまった……', '所持金の3分の1（' + lose + 'G）を失い、最後に泊まった宿で目を覚ました。']).then(function () {
      var d = State.data; d.gold = Math.max(0, d.gold - lose);
      if (root.Vehicle) root.Vehicle.onGameOver();
      State.partyActors().forEach(function (a) { root.Actors.fullHeal(a); });
      World.busy = false;
      World.enterMap(d.lastInn.map, d.lastInn.x, d.lastInn.y, 'down');
      return 'lost';
    });
  };

  // 目の前を調べる
  World.interact = function () {
    var p = World.player, m = World.map; var d = delta(p.dir); var fx = p.x + d[0], fy = p.y + d[1];
    if (State.data.aboard && root.Vehicle && root.Vehicle.flies()) {   // v5.4: 飛空艇は決定キーで着陸
      if (root.Vehicle.land(m, p.x, p.y)) { Win.toast('着陸した'); if (root.Audio) root.Audio.sfx('step'); World.updatePlaceLabel(); State.autosave(); } else Win.toast('ここには着陸できない（草原・砂地・道などの平地のみ）');
      return;
    }
    if (root.QuizSymbol && root.QuizSymbol.interact(m, fx, fy)) return;   // トレードクイズモンスターに話しかける（再挑戦は確認してから）
    var npc = m.npcOn(fx, fy);   // v6.2 歩いている途中の NPC も、見えている位置で話せる
    // カウンター越しに店主と話せる
    if (!npc && m.tile(fx, fy) === 'counter') npc = m.npcOn(fx + d[0], fy + d[1]);
    if (npc && npc.talk) { World.talk(npc); return; }
    var chest = m.chestAt(fx, fy);
    if (chest) { World.openChest(chest); return; }
    var ev = m.eventAt(fx, fy) || m.eventAt(p.x, p.y);
    if (ev && ev.type !== 'hole') { root.Events.run(ev); return; }
    // v6.1 調べる：光る場所（足元・正面）・壺・地形の樽／木箱／井戸（js/rpg/search.js）
    var sp = root.Search && (root.Search.at(m, fx, fy) || (function () { var q = root.Search.at(m, p.x, p.y); return q && q.kind === 'sparkle' ? q : null; })());
    if (sp) { World.searchPoint(sp); return; }
    var tile = m.tile(fx, fy);
    if (tile === 'bld_block') { var bld = m.buildingAt(fx, fy); if (bld) { World.busy = true; Win.message([bld.name + '。入口は' + (bld.doorAbs.x < p.x ? '左' : bld.doorAbs.x > p.x ? '右' : 'この下') + 'のドアだ。']).then(function () { World.busy = false; }); return; } }
    if (tile === 'sign') { Win.message(['何か書いてある……が、かすれて読めない。']); return; }
    if (tile === 'bookshelf') { World.busy = true; Promise.resolve(root.Services && root.Services.bookshelf ? root.Services.bookshelf(m.id, fx, fy) : Win.message(['『相場の波を読む者へ』——高値と安値を見よ。上位足を見よ。損切りを置け。'])).catch(function (e) { Engine.onError(e); }).then(function () { World.busy = false; }); return; }   // v5.9 本棚の本を選んで読める
    if (tile === 'crystal') { World.busy = true; Win.message(['均衡のクリスタルの台座だ。淡く光っている。']).then(function () { World.busy = false; }); return; }
  };
  // v6.1 探索ポイントを調べる（3D 版からも同じ関数を呼ぶ）
  World.searchPoint = function (sp) {
    World.busy = true;
    Promise.resolve(root.Search.inspect(sp)).catch(function (e) { Engine.onError(e); }).then(function () { World.busy = false; World.updateHud(); });
  };
  World.talk = function (npc) {   // v6.7 町の人（モブ）は、いつもの会話のあとに3種類の別の会話をする（js/rpg/chatter.js）
    if (World.busy || !npc) return;   // v6.2 二重起動しない
    World.busy = true; World._push = null;
    // v6.2 歩いている途中なら、近い方のマスで止まる（半分以上進んでいれば行き先のマス）
    if (npc.moving) { if (npc.prog >= 0.5) { npc.x = npc.nx; npc.y = npc.ny; } npc.moving = false; npc.prog = 0; npc.frame = 0; npc.phase = 0; }
    npc.moveT = Math.max(npc.moveT || 0, 1200);
    var p = World.player; npc.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.dir]; npc.moving = false; npc.ox_px = 0; npc.oy_px = 0;
    Promise.resolve((function () { var c = root.Events.ctx(npc); var r = null; try { r = root.Chatter ? root.Chatter.talk(npc, c, World.map) : null; } catch (e) { r = null; } return r || npc.talk(c); })()).catch(function (e) { Engine.onError(e); }).then(function () { World.busy = false; World._talkEnd = Date.now(); World._talkEndNpc = npc; npc.moveT = Math.max(npc.moveT || 0, 900); World.applyState(World.map); if (root.Vehicle) root.Vehicle.unlockIfReady(); World.updateHud(); State.autosave(); });
  };
  World.openChest = function (chest) {
    var m = World.map, d = State.data; var key = m.id + ':' + chest.id;
    if (d.chests[key]) { World.busy = true; Win.message(['宝箱は空っぽだ。']).then(function () { World.busy = false; }); return; }
    World.busy = true;
    d.chests[key] = true; m.setTile(chest.x, chest.y, 'chest_open');
    if (root.Audio) root.Audio.sfx('chest');
    var lines = [];
    if (chest.gold) { d.gold += chest.gold; lines.push(chest.gold + 'Gを手に入れた！'); }
    if (root.Growth73) root.Growth73.bonusDrop(lines, 'chest');   // v7.3 ときどき能力の最大値を上げる道具も
    if (chest.item) { State.addItem(chest.item, chest.qty || 1); lines.push(ITEMS[chest.item].name + (chest.qty > 1 ? '×' + chest.qty : '') + 'を手に入れた！'); }
    // 盗賊がいると追加アイテム
    if (State.partyActors().some(function (a) { return a.job === 'thief' && !a.dead; }) && Math.random() < 0.35) { var extra = ['herb', 'potion', 'antidote', 'ether'][Math.floor(Math.random() * 4)]; State.addItem(extra, 1); lines.push('盗賊の目が宝箱の二重底を見抜いた！ ' + ITEMS[extra].name + 'を見つけた！'); }
    Win.message(lines).then(function () { World.busy = false; World.updateHud(); State.autosave(); });
  };

  // 建物の入口に近づいたら施設名を表示
  World.updatePlaceLabel = function () {
    var el = document.getElementById('place-label'); if (!el || !World.map || !World.player) return;
    var b = World.map.buildingNear(World.player.x, World.player.y);
    var w = !b && World.map.warpAt(World.player.x, World.player.y + (World.player.dir === 'up' ? -1 : 0));
    var text = b ? b.name : (w && w.name ? w.name : '');
    if (!text && State.data && State.data.aboard && root.Vehicle) text = root.Vehicle.label() + (root.Vehicle.flies() ? '　決定キーで着陸（平地のみ）' : '　隣の陸へ進むと上陸');
    else if (!text && root.Vehicle && root.Vehicle.at(World.map.id, World.player.x + World.delta(World.player.dir)[0], World.player.y + World.delta(World.player.dir)[1])) text = (root.Vehicle.at(World.map.id, World.player.x + World.delta(World.player.dir)[0], World.player.y + World.delta(World.player.dir)[1]) === 'airship' ? '飛空艇に乗る' : '船に乗る') + '（そのまま進む）';
    if (el.textContent !== text) el.textContent = text;
    el.classList.toggle('show', !!text);
  };

  /* ---------- HUD ---------- */
  World.updateHud = function () {
    var h = document.getElementById('hud'); if (!h || !State.data) return;
    var d = State.data; var party = State.partyActors();
    h.innerHTML = '<div class="hud-top"><div class="hud-loc">' + Win.esc(World.map ? World.map.name : '') + '</div><div class="hud-gold">' + d.gold + ' G</div></div>' +
      '<div class="hud-party">' + party.map(function (a) { var s = root.Actors.stats(a); var cls = a.dead ? 'dead' : (a.hp < s.maxHp * 0.3 ? 'low' : ''); return '<div class="hud-a ' + cls + '"><span>' + Win.esc(a.name) + '</span> <b>' + a.hp + '</b>/' + s.maxHp + ' <i>' + a.mp + '</i></div>'; }).join('') + '</div>';
  };

  // v7.3 セーブの場所の部屋が無くなっているとき（v7.2 で足した新しい地区の店の一部は、v7.3 で地区の並びを変えて無くなった）：
  //   その町の新しい地区の塔の前へ（町が分からなければ、最後に泊まった宿屋）。元の地図にある場所なら何もしない
  World.fixLostMap = function (d) {
    var pz = d && d.pos; if (!pz || !pz.map || pz.map === 'world' || root.MAP_DEFS[pz.map]) return false;
    var mt = /^(.+?)_x72_/.exec(pz.map); var town = mt && root.MAP_DEFS[mt[1]] ? mt[1] : null;
    var tw = town && (root.MAP_DEFS[town].buildings || []).filter(function (b) { return b.id === 'x72_tower'; })[0];
    if (tw) d.pos = { map: town, x: tw.x + (tw.doorX || 0), y: tw.y + tw.h, dir: 'down' };
    else if (d.lastInn && root.MAP_DEFS[d.lastInn.map]) d.pos = { map: d.lastInn.map, x: d.lastInn.x, y: d.lastInn.y, dir: 'down' };
    else d.pos = { map: 'poyo_village', x: 24, y: 32, dir: 'up' };
    return true;
  };
  World.start = function () {
    var d = State.data;
    World.maps = {};
    World.makePlayer();
    World.scene = new ExploreScene();
    Engine.replace(World.scene);
    World.fixLostMap(d);   // v7.3 無くなった部屋にいるセーブ
    if (root.MapRemake) root.MapRemake.migrate(d);   // v7.1 作り直したダンジョンにいる古いセーブ：いる場所・探索済みを新しい座標へ
    World.enterMap(d.pos.map, d.pos.x, d.pos.y, d.pos.dir, { raw: true });
  };

  root.World = World;
})(typeof window !== 'undefined' ? window : globalThis);
