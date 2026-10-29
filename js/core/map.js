/* =========================================================
   Core / Map : タイルマップ・当たり判定・エンティティ・カメラ・描画
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
      for (var x = 0; x < this.w; x++) {
        var ch = rows[y][x]; var name = Tiles.byChar[ch];
        if (!name) name = def.fallback || 'grass';
        this.tiles[y][x] = name;
      }
    }
    this.npcs = (def.npcs || []).map(function (n) { return Object.assign({ dir: 'down', frame: 0, moveTimer: 0, ox: n.x, oy: n.y, wander: n.wander === undefined ? 1 : n.wander }, n); });
    this.warps = def.warps || [];
    this.chests = def.chests || [];
    this.events = def.events || [];
    this.encounters = def.encounters || null;
    this.openedOverrides = {};
  }

  GameMap.prototype.tile = function (x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 'water'; return this.tiles[y][x]; };
  GameMap.prototype.setTile = function (x, y, name) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.tiles[y][x] = name; };
  GameMap.prototype.chestAt = function (x, y) { for (var i = 0; i < this.chests.length; i++) if (this.chests[i].x === x && this.chests[i].y === y) return this.chests[i]; return null; };
  GameMap.prototype.npcAt = function (x, y) { for (var i = 0; i < this.npcs.length; i++) { var n = this.npcs[i]; if (n.hidden) continue; if (n.x === x && n.y === y) return n; } return null; };
  GameMap.prototype.warpAt = function (x, y) { for (var i = 0; i < this.warps.length; i++) if (this.warps[i].x === x && this.warps[i].y === y) return this.warps[i]; return null; };
  GameMap.prototype.eventAt = function (x, y) { for (var i = 0; i < this.events.length; i++) if (this.events[i].x === x && this.events[i].y === y) return this.events[i]; return null; };

  // 通行可能か（flags はセーブ内の状態：開けた扉など）
  GameMap.prototype.passable = function (x, y, state) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    var t = this.tiles[y][x];
    if (Tiles.isSolid(t)) {
      // 開いた宝箱・解錠済みの扉はタイル差し替え済み
      return false;
    }
    if (this.npcAt(x, y)) return false;
    var ev = this.eventAt(x, y); if (ev && ev.solid && !(state && ev.doneFlag && state.flags[ev.doneFlag])) return false;
    return true;
  };

  /* ---------- 描画 ---------- */
  // cam: {x,y}（ピクセル、左上）
  GameMap.prototype.draw = function (ctx, cam, player, timeTint) {
    var TS = Engine.TS; var frame = Math.floor(Engine.frame / 30) % 2;
    var x0 = Math.floor(cam.x / TS), y0 = Math.floor(cam.y / TS);
    var x1 = Math.min(this.w - 1, x0 + Engine.VIEW_W + 1), y1 = Math.min(this.h - 1, y0 + Engine.VIEW_H + 1);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (var y = Math.max(0, y0); y <= y1; y++) for (var x = Math.max(0, x0); x <= x1; x++) {
      var name = this.tiles[y][x];
      ctx.drawImage(Tiles.get(name, frame), x * TS - cam.x, y * TS - cam.y);
    }
    // エンティティ（NPC・プレイヤー）をy順に描画
    var ents = this.npcs.filter(function (n) { return !n.hidden; }).map(function (n) { return { y: n.y * TS + (n.oy_px || 0), draw: function () { drawChar(ctx, n.sprite, n.dir, n.frame, n.x * TS + (n.ox_px || 0) - cam.x, n.y * TS + (n.oy_px || 0) - cam.y); } }; });
    if (player) ents.push({ y: player.py, draw: function () { drawChar(ctx, player.sprite, player.dir, player.frame, player.px - cam.x, player.py - cam.y); } });
    ents.sort(function (a, b) { return a.y - b.y; });
    ents.forEach(function (e) { e.draw(); });
    if (timeTint) { ctx.fillStyle = timeTint; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
  };
  function drawChar(ctx, sprite, dir, frame, px, py) {
    var img = Chars.has(sprite) ? Chars.frame(sprite, dir, frame) : (root.Sprites && root.Sprites.has(sprite) ? legacySprite(sprite) : Chars.frame('villager_m', dir, frame));
    ctx.drawImage(img, px, py - 4);
  }
  var legacyCache = {};
  function legacySprite(key) { if (legacyCache[key]) return legacyCache[key]; var c = document.createElement('canvas'); root.Sprites.draw(c, key, Engine.SCALE, false); legacyCache[key] = c; return c; }
  GameMap.drawChar = drawChar;

  root.GameMap = GameMap;
})(typeof window !== 'undefined' ? window : globalThis);
