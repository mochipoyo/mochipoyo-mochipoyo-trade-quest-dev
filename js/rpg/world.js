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
      if ((e.type === 'trial' || e.type === 'locked' || e.type === 'rank_door' || e.type === 'gate') && e.doneFlag && d.flags[e.doneFlag]) m.setTile(e.x, e.y, e.type === 'gate' ? (m.def.fallback === 'grass' ? 'grass' : 'floor_stone') : (m.kind === 'dungeon' && m.tile(e.x, e.y) === 'gate' ? 'warp' : 'door'));
      else if (e.type === 'trial') m.setTile(e.x, e.y, 'gate');
      else if (e.type === 'locked' || e.type === 'rank_door') m.setTile(e.x, e.y, 'door_locked');
      else if (e.type === 'gate') m.setTile(e.x, e.y, 'fence');
      if (e.type === 'hole') m.setTile(e.x, e.y, 'hole');
      if (e.type === 'learn') m.setTile(e.x, e.y, 'learn_rune');
      if (e.type === 'pickup') m.setTile(e.x, e.y, d.flags[e.doneFlag] ? 'chest_open' : 'chest');   // v5.2
      if (e.type === 'boss' && e.optional) m.setTile(e.x, e.y, (e.doneFlag && d.flags[e.doneFlag]) ? (m.def.fallback === 'cave_floor' ? 'cave_floor' : 'floor_stone') : 'boss_mark');
    });
    m.npcs.forEach(function (n) { if (n.showIf) n.hidden = !d.flags[n.showIf]; if (n.hideIf && d.flags[n.hideIf]) n.hidden = true; if (root.COMPANIONS && root.COMPANIONS[n.id] && d.companions[n.id]) n.hidden = true; });
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

  World.enterMap = function (id, x, y, dir) {
    World.map = World.getMap(id);
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
    if (Input.consume('ok')) { World.interact(); return; }
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
      var dirs = ['up', 'down', 'left', 'right']; var dir = dirs[Math.floor(Math.random() * 4)]; var dd = delta(dir);
      var nx = n.x + dd[0], ny = n.y + dd[1];
      n.dir = dir;
      if (Math.abs(nx - n.ox) > n.wander || Math.abs(ny - n.oy) > n.wander) return;
      if (!m.passable(nx, ny, State.data) || (nx === p.x && ny === p.y) || (nx === p.tx && ny === p.ty && p.moving)) return;
      if (m.warpAt(nx, ny) || m.eventAt(nx, ny)) return;
      n.moving = true; n.nx = nx; n.ny = ny; n.prog = 0;
    });
  };
  ExploreScene.prototype.draw = function (ctx) {
    var m = World.map, p = World.player;
    var cam = World.camera();
    p.vehicle = State.data.aboard || null;
    var extras = root.Vehicle ? root.Vehicle.onMap(m.id).filter(function (v) { return !v.aboard; }).map(function (v) { return { x: v.x, y: v.y, vehicle: v.id }; }) : [];
    m.draw(ctx, cam, p, World.tint(), extras);
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
    var vr = root.Vehicle ? root.Vehicle.resolveMove(m, nx, ny) : null;   // v5.0: 乗船・航行・下船
    if (vr) { if (!vr.ok) { var why = root.Vehicle.blockReason(m, nx, ny); if (why && !p._blockToastAt || (why && Date.now() - p._blockToastAt > 1500)) { p._blockToastAt = Date.now(); Win.toast(why); } return false; } p.vehicleAction = vr; }
    else if (!m.passable(nx, ny, State.data)) return false;
    p.moving = true; p.tx = nx; p.ty = ny; p.progress = 0;
    return true;
  };

  // 1歩進んだとき：ワープ・落とし穴・エンカウント・時間経過
  World.onStep = function () {
    var p = World.player, m = World.map, d = State.data;
    d.steps++; World.syncPos();
    if (root.Vehicle) {   // v5.0: 乗り物
      var va = p.vehicleAction; p.vehicleAction = null;
      if (va && va.board) { root.Vehicle.board(va.board, m, p.x, p.y); Win.toast(root.VEHICLES[va.board].name + 'に乗った'); if (root.Audio) root.Audio.sfx('step'); }
      else if (va && va.disembark) { root.Vehicle.disembark(); Win.toast('上陸した'); }
      if (d.aboard) {
        root.Vehicle.syncToPlayer(m, p.x, p.y);
        var route = root.Vehicle.routeAt(m, p.x, p.y);
        if (route) { var arr = root.Vehicle.arrival(route, p.x, p.y); if (arr) { World.busy = true; Win.message([route.name + '。' + (root.MAP_DEFS[arr.map] || {}).name + 'の海域に入った。']).then(function () { World.busy = false; World.doWarp({ to: arr.map, tx: arr.x, ty: arr.y }); }); return; } }
        if (root.Vehicle.flies()) { World.updatePlaceLabel(); if (root.Minimap) root.Minimap.onStep(m, p); return; }   // v5.4: 飛行中は町・洞窟・イベント・エンカウントなし
        var drift = root.Vehicle.drift(m, p.x, p.y);   // v5.2: 外海の海流・嵐
        if (drift) { p.x = drift.x; p.y = drift.y; p.px = p.x * 32; p.py = p.y * 32; root.Vehicle.syncToPlayer(m, p.x, p.y); Win.toast(drift.text); if (!d.flags.drift_seen) { d.flags.drift_seen = true; World.busy = true; Win.message(['外海の海流に船が流された。', '外海では海流に流されることがある。嵐に遭うと大きく流される。航海士がいれば海流を読んで避けやすい。']).then(function () { World.busy = false; }); return; } }
      }
      World.updatePlaceLabel();
    }
    if (root.Minimap) root.Minimap.onStep(m, p);
    if (m.kind === 'field') d.timeOfDay = (d.timeOfDay + 0.0025) % 1;
    var w = m.warpAt(p.x, p.y);
    if (w && (!w.needFlag || d.flags[w.needFlag])) { World.doWarp(w); return; }
    var ev = m.eventAt(p.x, p.y);
    if (ev && ev.type === 'hole') { World.busy = true; Win.message(ev.text).then(function () { World.busy = false; World.enterMap(ev.to, ev.tx, ev.ty, 'down'); }); return; }
    // 毒の歩行ダメージ
    State.partyActors().forEach(function (a) { if (!a.dead && a.status.poison && d.steps % 4 === 0) { a.hp = Math.max(1, a.hp - 1); } });
    World.updatePlaceLabel();
    var encDef = (d.aboard && root.Vehicle) ? root.Vehicle.encounters() : m.encounters;
    if (encDef && !World.busy) {
      // 戦闘直後はしばらく出ない（猶予8歩）→ その後は歩くほど確率が上がる（基礎×0.5 → 25歩で基礎×1.5）
      d.stepsSinceBattle = (d.stepsSinceBattle || 0) + 1;
      var since = d.stepsSinceBattle;
      if (since > 8) {
        var rate = encDef.rate * Math.min(1.5, 0.5 + (since - 8) / 25); if (d.flags.repel) rate *= 0.3;
        if (Math.random() < rate) World.encounter(encDef);
      }
    }
    World.updateHud();
  };
  World.doWarp = function (w) {
    World.busy = true;
    var fade = document.getElementById('fade'); if (fade) fade.classList.add('on');
    setTimeout(function () {
      var dir = World.player.dir;
      World.enterMap(w.to, w.tx, w.ty, (root.MAP_DEFS[w.to] && root.MAP_DEFS[w.to].region) ? (State.data.aboard ? dir : 'down') : dir);
      setTimeout(function () { if (fade) fade.classList.remove('on'); World.busy = false; if (root.Audio) root.Audio.sfx('step'); }, 150);
    }, 180);
  };

  World.encounter = function (encDef) {
    var m = World.map, p = World.player; var enc = encDef || m.encounters; if (!enc) return;
    var zone = enc.zones.filter(function (z) { return z.test(p.x, p.y, m); })[0]; if (!zone) return;
    var group = zone.groups[Math.floor(Math.random() * zone.groups.length)];
    if (zone.rare && Math.random() < (zone.rareRate || 0.02)) group = zone.rare[Math.floor(Math.random() * zone.rare.length)];
    World.startBattle(group, { zone: zone.name });
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
    return Win.message(['全滅してしまった……', '所持金の半分を失い、最後に泊まった宿で目を覚ました。']).then(function () {
      var d = State.data; d.gold = Math.floor(d.gold / 2);
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
    var npc = m.npcAt(fx, fy);
    // カウンター越しに店主と話せる
    if (!npc && m.tile(fx, fy) === 'counter') npc = m.npcAt(fx + d[0], fy + d[1]);
    if (npc && npc.talk) { World.talk(npc); return; }
    var chest = m.chestAt(fx, fy);
    if (chest) { World.openChest(chest); return; }
    var ev = m.eventAt(fx, fy) || m.eventAt(p.x, p.y);
    if (ev && ev.type !== 'hole') { root.Events.run(ev); return; }
    var tile = m.tile(fx, fy);
    if (tile === 'bld_block') { var bld = m.buildingAt(fx, fy); if (bld) { World.busy = true; Win.message([bld.name + '。入口は' + (bld.doorAbs.x < p.x ? '左' : bld.doorAbs.x > p.x ? '右' : 'この下') + 'のドアだ。']).then(function () { World.busy = false; }); return; } }
    if (tile === 'sign') { Win.message(['何か書いてある……が、かすれて読めない。']); return; }
    if (tile === 'bookshelf') { World.busy = true; Win.message(['『相場の波を読む者へ』——高値と安値を見よ。上位足を見よ。損切りを置け。']).then(function () { World.busy = false; }); return; }
    if (tile === 'crystal') { World.busy = true; Win.message(['均衡のクリスタルの台座だ。淡く光っている。']).then(function () { World.busy = false; }); return; }
  };
  World.talk = function (npc) {
    World.busy = true;
    var p = World.player; npc.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.dir]; npc.moving = false; npc.ox_px = 0; npc.oy_px = 0;
    Promise.resolve(npc.talk(root.Events.ctx(npc))).catch(function (e) { Engine.onError(e); }).then(function () { World.busy = false; World.applyState(World.map); if (root.Vehicle) root.Vehicle.unlockIfReady(); World.updateHud(); State.autosave(); });
  };
  World.openChest = function (chest) {
    var m = World.map, d = State.data; var key = m.id + ':' + chest.id;
    if (d.chests[key]) { World.busy = true; Win.message(['宝箱は空っぽだ。']).then(function () { World.busy = false; }); return; }
    World.busy = true;
    d.chests[key] = true; m.setTile(chest.x, chest.y, 'chest_open');
    if (root.Audio) root.Audio.sfx('chest');
    var lines = [];
    if (chest.gold) { d.gold += chest.gold; lines.push(chest.gold + 'Gを手に入れた！'); }
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

  World.start = function () {
    var d = State.data;
    World.maps = {};
    World.makePlayer();
    World.scene = new ExploreScene();
    Engine.replace(World.scene);
    World.enterMap(d.pos.map, d.pos.x, d.pos.y, d.pos.dir);
  };

  root.World = World;
})(typeof window !== 'undefined' ? window : globalThis);
