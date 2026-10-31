/* =========================================================
   Core / Map : タイルマップ・当たり判定・建物・エンティティ・カメラ・描画
   描画は「地面（バリエーション＋縁取り）→ 建物 → NPC/プレイヤー（y順）→ 夜の色・灯り」
   ========================================================= */
(function (root) {
  'use strict';

  var Engine = root.Engine, Tiles = root.Tiles, Chars = root.Chars;

  function GameMap(def) {
    this.def = def; this.id = def.id; this.name = def.name; this.kind = def.kind || 'town';
    var rows = typeof def.rows === 'function' ? def.rows() : def.rows;
    this.h = rows.length; this.w = rows[0].length;
    this.tiles = new Array(this.h);
    for (var y = 0; y < this.h; y++) {
      this.tiles[y] = new Array(this.w);
      for (var x = 0; x < this.w; x++) { var ch = rows[y][x]; var name = Tiles.byChar[ch]; if (!name) name = def.fallback || 'grass'; this.tiles[y][x] = name; }
    }
    this.npcs = (def.npcs || []).map(function (n) { return Object.assign({ dir: 'down', frame: 0, moveTimer: 0, ox: n.x, oy: n.y, wander: n.wander === undefined ? 1 : n.wander }, n); });
    this.warps = (def.warps || []).slice();
    this.chests = def.chests || [];
    this.events = def.events || [];
    this.encounters = def.encounters || null;
    this.buildings = [];
    // 建物：足元を通行不可にし、ドアにワープを作る
    var self = this;
    var flags = (root.State && root.State.data) ? root.State.data.flags : {};
    this.buildingKey = GameMap.buildingKey(def, flags);
    (def.buildings || []).filter(function (b) { return !b.showIf || flags[b.showIf]; }).forEach(function (b) {   // v5.0: showIf で物語の進行により現れる建物
      var bb = Object.assign({ w: 5, h: 3, doorX: 2, style: def.style || 'wood' }, b);
      bb.doorAbs = { x: bb.x + bb.doorX, y: bb.y + bb.h - 1 };
      for (var yy = bb.y; yy < bb.y + bb.h; yy++) for (var xx = bb.x; xx < bb.x + bb.w; xx++) self.setTile(xx, yy, (xx === bb.doorAbs.x && yy === bb.doorAbs.y) ? 'bld_door' : 'bld_block');
      if (bb.interior) self.warps.push({ x: bb.doorAbs.x, y: bb.doorAbs.y, to: bb.interior, tx: bb.entry ? bb.entry.x : 5, ty: bb.entry ? bb.entry.y : 7, name: bb.name });
      self.buildings.push(bb);
    });
  }
  GameMap.buildingKey = function (def, flags) { return (def.buildings || []).filter(function (b) { return b.showIf; }).map(function (b) { return b.showIf + '=' + (flags[b.showIf] ? 1 : 0); }).join(','); };
  // 建物の足元タイル（描画は建物画像が担当）
  if (!Tiles.defs.bld_block) { Tiles.defs.bld_block = { name: 'bld_block', solid: true, paint: function (g) { g.fill('#5a4a3a'); } }; Tiles.defs.bld_door = { name: 'bld_door', paint: function (g) { g.fill('#8e8e9c'); } }; }

  GameMap.prototype.tile = function (x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 'water'; return this.tiles[y][x]; };
  GameMap.prototype.setTile = function (x, y, name) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.tiles[y][x] = name; };
  GameMap.prototype.chestAt = function (x, y) { for (var i = 0; i < this.chests.length; i++) if (this.chests[i].x === x && this.chests[i].y === y) return this.chests[i]; return null; };
  GameMap.prototype.npcAt = function (x, y) { for (var i = 0; i < this.npcs.length; i++) { var n = this.npcs[i]; if (n.hidden) continue; if (n.x === x && n.y === y) return n; } return null; };
  // v6.2 歩いている途中の NPC も含めて、そのマスにいる（またはそこへ向かっている）NPC。会話の対象・通行判定に使う
  GameMap.prototype.npcOn = function (x, y) { for (var i = 0; i < this.npcs.length; i++) { var n = this.npcs[i]; if (n.hidden) continue; if (n.moving ? ((n.prog >= 0.5 ? n.nx === x && n.ny === y : n.x === x && n.y === y)) : (n.x === x && n.y === y)) return n; } return this.npcAt(x, y); };
  GameMap.prototype.warpAt = function (x, y) { for (var i = 0; i < this.warps.length; i++) if (this.warps[i].x === x && this.warps[i].y === y) return this.warps[i]; return null; };
  GameMap.prototype.eventAt = function (x, y) { for (var i = 0; i < this.events.length; i++) if (this.events[i].x === x && this.events[i].y === y) return this.events[i]; return null; };
  GameMap.prototype.buildingAt = function (x, y) { for (var i = 0; i < this.buildings.length; i++) { var b = this.buildings[i]; if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b; } return null; };
  // ドアの近く（距離1以内）の建物
  GameMap.prototype.buildingNear = function (x, y) { for (var i = 0; i < this.buildings.length; i++) { var b = this.buildings[i]; if (Math.abs(b.doorAbs.x - x) <= 1 && Math.abs(b.doorAbs.y - y) <= 1) return b; } return null; };

  GameMap.prototype.passable = function (x, y, state) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    var t = this.tiles[y][x];
    if (Tiles.isSolid(t)) return false;
    if (this.npcAt(x, y)) return false;
    for (var ni = 0; ni < this.npcs.length; ni++) { var nn = this.npcs[ni]; if (!nn.hidden && nn.moving && nn.nx === x && nn.ny === y) return false; }   // v6.2 歩いて向かっている先のマスもふさがっている
    var ev = this.eventAt(x, y); if (ev && ev.solid && !(state && ev.doneFlag && state.flags[ev.doneFlag])) return false;
    if (root.Search && root.Search.solidAt(this, x, y)) return false;   // v6.1 壺など（光る場所は通れる）
    return true;
  };

  /* ---------- 描画 ---------- */
  GameMap.prototype.draw = function (ctx, cam, player, timeTint, extras) {
    var TS = Engine.TS; var frame = Math.floor(Engine.frame / 28) % 2;
    var x0 = Math.floor(cam.x / TS), y0 = Math.floor(cam.y / TS);
    var x1 = Math.min(this.w - 1, x0 + Engine.VIEW_W + 1), y1 = Math.min(this.h - 1, y0 + Engine.VIEW_H + 1);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    var self = this;
    for (var y = Math.max(0, y0); y <= y1; y++) for (var x = Math.max(0, x0); x <= x1; x++) {
      var name = this.tiles[y][x]; var px = x * TS - cam.x, py = y * TS - cam.y;
      var variant = Math.floor(Tiles.hash(x, y, 3) * 4);
      if (root.Landmarks && this.def.locations && (name === 'village' || name === 'castle_icon' || name === 'cave_icon' || name === 'tower_icon')) { var Lm = this.def.locations.filter(function (L) { return L.x === x && L.y === y; })[0]; if (Lm && Tiles.has(root.Landmarks.groundTile(root.Landmarks.terrainOf(this, Lm)))) name = root.Landmarks.groundTile(root.Landmarks.terrainOf(this, Lm)); }   // v5.7 入口のマスは地面（絵を上に描く）
      ctx.drawImage(Tiles.get(name, frame, variant), px, py);
      // 縁取り（オートタイル）
      if (Tiles.isWater(name)) {
        var m = 0; if (!Tiles.isWater(this.tile(x, y - 1))) m |= 1; if (!Tiles.isWater(this.tile(x + 1, y))) m |= 2; if (!Tiles.isWater(this.tile(x, y + 1))) m |= 4; if (!Tiles.isWater(this.tile(x - 1, y))) m |= 8;
        if (m) ctx.drawImage(Tiles.edge('shore', m), px, py);
      } else if (!Tiles.isTall(name) && name !== 'bld_block') {
        var sm = 0; if (Tiles.isTall(this.tile(x, y - 1))) sm |= 1; if (Tiles.isTall(this.tile(x - 1, y))) sm |= 8;
        if (sm) ctx.drawImage(Tiles.edge('shadow', sm), px, py);
        if (Tiles.isPaved(name)) { var gm = 0; if (Tiles.isGrassy(this.tile(x, y - 1))) gm |= 1; if (Tiles.isGrassy(this.tile(x + 1, y))) gm |= 2; if (Tiles.isGrassy(this.tile(x, y + 1))) gm |= 4; if (Tiles.isGrassy(this.tile(x - 1, y))) gm |= 8; if (gm) ctx.drawImage(Tiles.edge('grassedge', gm), px, py); }
      }
    }
    // 建物
    this.buildings.forEach(function (b) {
      if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) return;
      ctx.drawImage(root.Buildings.image(b), b.x * TS - cam.x, b.y * TS - cam.y);
    });
    // エンティティ（y順）
    var ents = this.npcs.filter(function (n) { return !n.hidden; }).map(function (n) { return { y: n.y * TS + (n.oy_px || 0), draw: function () { drawChar(ctx, n.sprite, n.dir, n.frame, n.x * TS + (n.ox_px || 0) - cam.x, n.y * TS + (n.oy_px || 0) - cam.y, n.phase); } }; });
    // v5.7 ワールドマップの町・城・洞窟・塔を大きな絵で（入口のマスの下端を基準に y 順で描く）
    var lms = (this.def.locations && root.Landmarks) ? this.def.locations.filter(function (L) { var Mg = root.Landmarks.MARGIN; return L.x >= x0 - Mg && L.x <= x1 + Mg && L.y >= y0 - 1 && L.y <= y1 + Mg * 2; }) : [];
    var selfMap = this;
    lms.forEach(function (L) { var fbk = root.Landmarks.terrainOf(selfMap, L); ents.push({ y: L.y * TS + 0.5, draw: function () { root.Landmarks.draw(ctx, L, fbk, cam.x, cam.y); } }); });
    if (root.Search) root.Search.drawList(this, cam, x0, y0, x1, y1, TS).forEach(function (e) { ents.push({ y: e.y, draw: function () { e.draw(ctx); } }); });   // v6.1 光る場所・壺
    (extras || []).forEach(function (e) { ents.push({ y: e.y * TS, draw: function () { if (e.vehicle && root.VehicleArt) root.VehicleArt.draw(ctx, e.vehicle, 'down', e.x * TS - cam.x, e.y * TS - cam.y, false); } }); });
    if (player) ents.push({ y: player.py, draw: function () { if (player.vehicle && root.VehicleArt) root.VehicleArt.draw(ctx, player.vehicle, player.dir, player.px - cam.x, player.py - cam.y, player.moving); else drawChar(ctx, player.sprite, player.dir, player.frame, player.px - cam.x, player.py - cam.y, player.phase); } });
    ents.sort(function (a, b) { return a.y - b.y; });
    ents.forEach(function (e) { e.draw(); });
    // 夜：全体を暗くし、灯り・松明の周りを明るく
    if (timeTint) {
      ctx.fillStyle = timeTint; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var ly = Math.max(0, y0); ly <= y1; ly++) for (var lx = Math.max(0, x0); lx <= x1; lx++) { var tn = this.tiles[ly][lx]; if (tn === 'lamp' || tn === 'torch' || tn === 'bld_door') { var gcx = lx * TS - cam.x + TS / 2, gcy = ly * TS - cam.y + TS / 3; var gr = ctx.createRadialGradient(gcx, gcy, 4, gcx, gcy, TS * 1.6); gr.addColorStop(0, 'rgba(255,200,100,0.35)'); gr.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = gr; ctx.fillRect(gcx - TS * 1.6, gcy - TS * 1.6, TS * 3.2, TS * 3.2); } }
      lms.forEach(function (L) { root.Landmarks.glow(ctx, L, cam.x, cam.y); });
      ctx.restore();
    }
  };
  // 歩行キャラの描画優先順位：1) assets/characters/overworld のシート（4方向×3フレーム） 2) Chars.frame（従来） 3) Sprites（旧）
  // phase: 歩行サイクル 0..3（待機0 → 左足1 → 待機0 → 右足2）。省略時は frame(0/1) から推定
  function drawChar(ctx, sprite, dir, frame, px, py, phase) {
    // 足元の影
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(px + Engine.TS / 2, py + Engine.TS - 2, Engine.TS * 0.3, Engine.TS * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    var wf = root.Assets ? root.Assets.walkFrame(sprite, dir, phase === undefined ? (frame ? 1 : 0) : [0, 1, 0, 2][phase & 3]) : null;
    if (wf) { var S = Engine.SCALE; var dw = wf.w * S, dh = wf.h * S; ctx.imageSmoothingEnabled = false; ctx.drawImage(wf.img, wf.sx, wf.sy, wf.w, wf.h, Math.round(px + (Engine.TS - dw) / 2), Math.round(py + Engine.TS - dh), dw, dh); return; }   // 足元中央＝タイル下端
    var img = Chars.has(sprite) ? Chars.frame(sprite, dir, frame) : (root.Sprites && root.Sprites.has(sprite) ? legacySprite(sprite) : Chars.frame('villager_m', dir, frame));
    ctx.drawImage(img, px, py - 4);
  }
  var legacyCache = {};
  function legacySprite(key) { if (legacyCache[key]) return legacyCache[key]; var c = document.createElement('canvas'); root.Sprites.draw(c, key, Engine.SCALE, false); legacyCache[key] = c; return c; }
  GameMap.drawChar = drawChar;

  root.GameMap = GameMap;
})(typeof window !== 'undefined' ? window : globalThis);
