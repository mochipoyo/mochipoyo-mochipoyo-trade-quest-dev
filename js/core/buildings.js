/* =========================================================
   Core / Buildings : 複数タイルで構成する立体的な建物（オリジナル・Canvas生成）
   建物は data（towns.js）の buildings 配列で定義し、GameMap が
   ・足元のタイルを通行不可にする（ドアだけ通行可）
   ・ドアに内部マップへのワープを作る
   ・描画はここでキャッシュした1枚絵を使う
   type: weapon armor item inn church tavern bank guild dojo house elder castle warehouse
   style: wood(木造) stone(石造) harbor(白壁)
   ========================================================= */
(function (root) {
  'use strict';

  var Buildings = { cache: {} };

  var TYPES = {
    weapon: { label: '武器屋', roof: '#8a3a3a', roofL: '#b85050', roofD: '#5a2424', icon: 'sword', banner: '#c94a4a' },
    armor: { label: '防具屋', roof: '#3f5f9f', roofL: '#5f80c8', roofD: '#2a3f6a', icon: 'shield', banner: '#3f6fc9' },
    item: { label: '道具屋', roof: '#3f8a5a', roofL: '#5fb07a', roofD: '#245a38', icon: 'potion', banner: '#3f9a6a' },
    inn: { label: '宿屋', roof: '#b8603a', roofL: '#d88a5a', roofD: '#7a3a1a', icon: 'bed', banner: '#c9a24a', chimney: true, lit: true },
    church: { label: '教会', roof: '#6a6a8a', roofL: '#9a9ab8', roofD: '#3a3a52', icon: 'bell', banner: '#e8c15a', tower: true },
    tavern: { label: '酒場', roof: '#7a5a2a', roofL: '#a88040', roofD: '#4a3414', icon: 'mug', banner: '#c9a24a', lit: true },
    bank: { label: '銀行', roof: '#5a5a6a', roofL: '#8a8a9a', roofD: '#3a3a44', icon: 'coin', banner: '#e8c15a', stoneFront: true },
    guild: { label: 'ギルド', roof: '#7a3a6a', roofL: '#a85a98', roofD: '#4a1f40', icon: 'flag', banner: '#8a3a7a', flags: true },
    dojo: { label: '修行場', roof: '#2f5f8a', roofL: '#4f88c0', roofD: '#1a3a5a', icon: 'chart', banner: '#5ab0ff' },
    house: { label: '民家', roof: '#b8403f', roofL: '#d86a60', roofD: '#7a2a2a', icon: null },
    elder: { label: '村長の家', roof: '#8a6a2a', roofL: '#b89a4a', roofD: '#5a4414', icon: 'scroll' },
    warehouse: { label: '倉庫', roof: '#5a6a7a', roofL: '#7a8a9a', roofD: '#3a4450', icon: 'crate', stoneFront: true },
    castle: { label: '城', roof: '#4a4a6a', roofL: '#7a7a9a', roofD: '#2a2a44', icon: 'crown' },
    ship: { label: '船', roof: '#7a4e26', roofL: '#c9a06a', roofD: '#5a3a1a', icon: null }
  };
  Buildings.TYPES = TYPES;

  var STYLES = {
    wood: { wall: '#c8a878', wallD: '#a88858', wallL: '#e0c498', beam: '#5a3a1a', trim: '#7a4e26' },
    stone: { wall: '#b4b4c2', wallD: '#8e8e9c', wallL: '#d0d0dc', beam: '#5a5a6a', trim: '#6e6e80' },
    harbor: { wall: '#f0ece0', wallD: '#c8c2b0', wallL: '#ffffff', beam: '#2a4a7a', trim: '#3f6fc9' }
  };

  /* ---------- アイコン（16×16 論理ピクセル） ---------- */
  function drawIcon(g, icon, x, y) {
    var W = '#ffffff', K = '#1a1a2a';
    if (icon === 'sword') { for (var i = 0; i < 7; i++) g.px(x + 3 + i, y + 10 - i, '#dce6f0'); g.px(x + 9, y + 3, W); g.rect(x + 3, y + 9, 4, 1, '#8a5a30'); g.px(x + 2, y + 11, '#8a5a30'); g.rect(x + 5, y + 8, 1, 3, '#c9a24a'); for (var j = 0; j < 7; j++) g.px(x + 9 - j, y + 10 - j + 1, j < 3 ? '#8a8a9a' : null); }
    else if (icon === 'shield') { g.rect(x + 4, y + 2, 8, 6, '#3f6fc9'); g.rect(x + 5, y + 8, 6, 2, '#3f6fc9'); g.rect(x + 6, y + 10, 4, 2, '#3f6fc9'); g.rect(x + 7, y + 12, 2, 1, '#3f6fc9'); g.rect(x + 4, y + 2, 8, 1, '#8fb8ff'); g.vline(x + 8, y + 3, 9, '#e8c15a'); g.hline(x + 5, y + 5, 7, '#e8c15a'); }
    else if (icon === 'potion') { g.rect(x + 6, y + 1, 4, 2, '#8a5a30'); g.rect(x + 7, y + 3, 2, 2, '#d8f0ff'); g.disc(x + 8, y + 9, 4, '#4fc0a0'); g.disc(x + 8, y + 9, 3, '#3fa080'); g.rect(x + 6, y + 6, 4, 2, '#d8f0ff'); g.px(x + 6, y + 8, '#9fe0d0'); }
    else if (icon === 'bed') { g.rect(x + 2, y + 6, 12, 5, '#c94a4a'); g.rect(x + 2, y + 5, 12, 1, '#f0f0f8'); g.rect(x + 3, y + 3, 4, 2, '#f0f0f8'); g.rect(x + 2, y + 11, 2, 3, '#5a3a1a'); g.rect(x + 12, y + 11, 2, 3, '#5a3a1a'); g.hline(x + 3, y + 9, 10, '#a83a3a'); }
    else if (icon === 'bell') { g.disc(x + 8, y + 7, 4, '#e8c15a'); g.rect(x + 4, y + 8, 8, 3, '#e8c15a'); g.rect(x + 4, y + 11, 8, 1, '#c9a24a'); g.px(x + 8, y + 12, '#8a6a2a'); g.px(x + 8, y + 2, '#c9a24a'); g.px(x + 6, y + 5, '#ffe08a'); }
    else if (icon === 'mug') { g.rect(x + 4, y + 4, 7, 8, '#c9a06a'); g.rect(x + 4, y + 3, 7, 2, '#ffffff'); g.rect(x + 5, y + 2, 2, 1, '#ffffff'); g.rect(x + 11, y + 5, 2, 5, '#c9a06a'); g.px(x + 12, y + 6, '#8a5a30'); g.vline(x + 5, y + 5, 6, '#e0c080'); g.rect(x + 4, y + 12, 7, 1, '#8a5a30'); }
    else if (icon === 'coin') { g.disc(x + 8, y + 8, 5, '#e8c15a'); g.disc(x + 8, y + 8, 4, '#f0d070'); g.rect(x + 7, y + 5, 2, 6, '#c9a24a'); g.hline(x + 6, y + 6, 4, '#c9a24a'); g.hline(x + 6, y + 9, 4, '#c9a24a'); g.px(x + 5, y + 5, '#fff0b0'); }
    else if (icon === 'flag') { g.rect(x + 4, y + 2, 1, 12, '#5a3a1a'); g.rect(x + 5, y + 2, 8, 6, '#8a3a7a'); g.rect(x + 5, y + 2, 8, 1, '#b85aa8'); g.rect(x + 7, y + 4, 3, 2, '#e8c15a'); g.px(x + 13, y + 5, '#8a3a7a'); }
    else if (icon === 'chart') { g.rect(x + 2, y + 2, 12, 11, '#0b1226'); g.rect(x + 4, y + 7, 2, 4, '#4cc38a'); g.px(x + 4, y + 6, '#4cc38a'); g.rect(x + 7, y + 5, 2, 4, '#e5484d'); g.px(x + 7, y + 9, '#e5484d'); g.rect(x + 10, y + 3, 2, 5, '#4cc38a'); g.px(x + 10, y + 8, '#4cc38a'); g.hline(x + 3, y + 10, 10, '#ffd24a'); g.px(x + 3, y + 9, '#ffd24a'); }
    else if (icon === 'scroll') { g.rect(x + 3, y + 3, 10, 10, '#f0e8d0'); g.rect(x + 3, y + 3, 10, 1, '#c9b890'); g.rect(x + 3, y + 12, 10, 1, '#c9b890'); g.hline(x + 5, y + 6, 6, '#5a3a1a'); g.hline(x + 5, y + 8, 6, '#5a3a1a'); g.hline(x + 5, y + 10, 4, '#5a3a1a'); }
    else if (icon === 'crate') { g.rect(x + 3, y + 4, 10, 9, '#a07040'); g.rect(x + 3, y + 4, 10, 1, '#c9a06a'); g.hline(x + 4, y + 8, 8, '#5a3a1a'); g.vline(x + 8, y + 5, 7, '#5a3a1a'); }
    else if (icon === 'crown') { g.rect(x + 3, y + 7, 10, 5, '#e8c15a'); g.px(x + 3, y + 5, '#e8c15a'); g.px(x + 8, y + 3, '#e8c15a'); g.px(x + 12, y + 5, '#e8c15a'); g.px(x + 5, y + 9, '#c94a4a'); g.px(x + 10, y + 9, '#3f6fc9'); }
  }


  /* ---------- 船 ---------- */
  function paintShip(g, W, H) {
    g.fill('rgba(0,0,0,0)');
    g.rect(2, H - 7, W - 4, 6, '#7a4e26'); g.rect(2, H - 7, W - 4, 1, '#c9a06a'); g.rect(1, H - 3, W - 2, 2, '#5a3a1a'); g.rect(0, H - 2, W, 1, 'rgba(0,0,0,0.3)');
    for (var x = 4; x < W - 4; x += 6) g.px(x, H - 5, '#3a2210');
    g.rect(Math.round(W / 2), 1, 2, H - 8, '#5a3a1a');
    g.rect(Math.round(W / 2) + 2, 2, Math.round(W / 3), H - 12, '#f0f0f8'); g.rect(Math.round(W / 2) + 2, 2, Math.round(W / 3), 1, '#d0d0d8'); g.rect(Math.round(W / 2) + 2, 5, Math.round(W / 3), 1, '#d8d8e0');
    g.rect(Math.round(W / 2) - 4, 1, 4, 2, '#c94a4a');
    g.rect(2, H - 9, 6, 3, '#5a3a1a'); g.rect(3, H - 8, 4, 1, '#c9a06a');
  }
  /* ---------- 城（城壁・塔・城門・旗） ---------- */
  function paintCastle(g, ctx, W, H, b, S) {
    var wall = '#b4b4c2', wallD = '#8e8e9c', wallL = '#d8d8e4', mortar = '#a0a0b0';
    g.fill(wall);
    for (var y = 0; y < H; y += 6) { g.hline(0, y, W, mortar); for (var x = ((y / 6) % 2) * 6; x < W; x += 12) { g.vline(x, y, 6, mortar); g.rect(x + 1, y + 1, 10, 1, '#c4c4d2'); } }
    g.rect(0, H - 6, W, 6, '#9a9aaa'); for (var sx = 20; sx < W - 20; sx += 14) { g.rect(sx, 6, 1, 5, '#2a2a3a'); }
    // 胸壁（上端）
    g.rect(0, 0, W, 3, wallL); for (var cx = 0; cx < W; cx += 4) g.rect(cx, 0, 2, 3, wall);
    // 両端の塔
    [[0, 12], [W - 12, 12]].forEach(function (t) { var tx = t[0], tw = t[1]; g.rect(tx, 0, tw, H, '#a0a0b0'); for (var ty = 0; ty < H; ty += 4) { g.hline(tx, ty, tw, mortar); } g.rect(tx, 0, 1, H, wallL); g.rect(tx + tw - 1, 0, 1, H, wallD); for (var cy = -1; cy < 2; cy++) for (var cx2 = tx; cx2 < tx + tw; cx2 += 4) g.rect(cx2, 0, 2, 3, wallL); g.rect(tx + 4, 8, 4, 6, '#2a2a3a'); g.rect(tx + 5, 9, 2, 4, '#ffd97a'); g.rect(tx + 5, H - 14, 1, 8, '#5a3a1a'); g.rect(tx + 6, H - 14, 5, 4, '#c94a4a'); g.px(tx + 7, H - 13, '#e8c15a'); });
    // 城門（アーチ）
    var dx = b.doorX * 16 + 2; var dw = 12; var dy = H - 16;
    g.rect(dx - 2, dy - 2, dw + 4, 18, wallD); g.rect(dx, dy, dw, 16, '#2a2a3a');
    for (var ay = 0; ay < 4; ay++) g.hline(dx + ay, dy - 4 + ay, dw - ay * 2, wallD);
    g.rect(dx + 1, dy + 1, dw - 2, 15, '#5a3a1a'); for (var gy = dy + 2; gy < H; gy += 3) g.hline(dx + 1, gy, dw - 2, '#3a2210'); for (var gx = dx + 3; gx < dx + dw - 1; gx += 3) g.vline(gx, dy + 1, 15, '#3a2210');
    g.rect(dx + 1, dy + 1, dw - 2, 1, '#8a8a9a');
    // 中央の旗と紋章
    g.rect(Math.round(W / 2) - 1, 3, 2, 10, '#5a3a1a'); g.rect(Math.round(W / 2) + 1, 3, 8, 5, '#3f6fc9'); g.rect(Math.round(W / 2) + 3, 4, 3, 3, '#e8c15a');
    g.rect(Math.round(W / 2) - 6, dy - 12, 12, 7, '#3f6fc9'); g.rect(Math.round(W / 2) - 5, dy - 11, 10, 5, '#e8c15a'); g.rect(Math.round(W / 2) - 2, dy - 10, 4, 3, '#3f6fc9');
    // 窓
    for (var wx = 16; wx < W - 16; wx += 10) { if (Math.abs(wx + 2 - (dx + 6)) < 12) continue; g.rect(wx, 10, 4, 6, '#2a2a3a'); g.rect(wx + 1, 11, 2, 4, '#8fd0ff'); }
    g.rect(0, H - 1, W, 1, 'rgba(0,0,0,0.35)');
    ctx.font = 'bold ' + Math.round(7 * S) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var lw = ctx.measureText(b.name).width + 8 * S; ctx.fillStyle = '#3a2210'; ctx.fillRect((W / 2) * S - lw / 2, (H - 24) * S, lw, 9 * S); ctx.fillStyle = '#f0e8d0'; ctx.fillRect((W / 2) * S - lw / 2 + S, (H - 23) * S, lw - 2 * S, 7 * S); ctx.fillStyle = '#2a1a0a'; ctx.fillText(b.name, (W / 2) * S, (H - 20.5) * S);
  }

  /* ---------- 建物1枚絵の生成 ---------- */
  // b: { type, style, w, h, door(dx), name }
  Buildings.image = function (b) {
    var key = [b.type, b.style, b.w, b.h, b.doorX, b.name || '', b.variant || 0].join('#');
    if (Buildings.cache[key]) return Buildings.cache[key];
    var TS = root.Engine.TS, S = root.Engine.SCALE;
    var W = b.w * 16, H = b.h * 16;
    var c = document.createElement('canvas'); c.width = W * S; c.height = H * S; var ctx = c.getContext('2d');
    var g = root.Tiles.painter(ctx, (b.w * 131 + b.h * 17 + (b.variant || 0)) >>> 0);
    var T = TYPES[b.type] || TYPES.house, ST = STYLES[b.style] || STYLES.wood;
    if (b.type === 'ship') { paintShip(g, W, H); Buildings.cache[key] = c; return c; }
    if (b.type === 'castle') { paintCastle(g, ctx, W, H, b, S); Buildings.cache[key] = c; return c; }
    var roofH = Math.max(5, Math.round(H * (T.tower ? 0.42 : 0.45)));
    var wallY = roofH, wallH = H - roofH;

    // --- 影（右と下） ---
    g.rect(2, H - 1, W - 2, 1, 'rgba(0,0,0,0.3)');
    // --- 壁 ---
    g.rect(0, wallY, W, wallH, ST.wall);
    // 石造りは目地、木造は梁
    if (b.style === 'stone' || T.stoneFront) { for (var y = wallY; y < H; y += 4) { g.hline(0, y, W, ST.wallD); for (var x = ((y - wallY) / 4 % 2) * 4; x < W; x += 8) g.vline(x, y, 4, ST.wallD); } }
    else { g.rect(0, wallY, W, 1, ST.wallL); for (var bx = 2; bx < W; bx += 6) g.vline(bx, wallY, wallH, ST.beam); g.hline(0, wallY + Math.floor(wallH / 2), W, ST.beam); if (b.style === 'harbor') { g.rect(0, wallY, W, wallH, ST.wall); g.hline(0, wallY + Math.floor(wallH / 2), W, ST.beam); } }
    // 側面（右端2px暗く）
    g.rect(W - 2, wallY, 2, wallH, ST.wallD); g.rect(0, wallY, 1, wallH, ST.wallL);
    // 土台
    g.rect(0, H - 2, W, 2, ST.trim);
    // --- ドア ---
    var dx = b.doorX * 16 + 4; var dy = H - 12;
    g.rect(dx - 1, dy - 1, 10, 13, ST.trim);
    g.rect(dx, dy, 8, 12, '#5a3a1a'); g.rect(dx + 1, dy + 1, 6, 10, '#7a4e26'); g.vline(dx + 4, dy + 1, 10, '#5a3a1a'); g.px(dx + 6, dy + 6, '#e8c15a');
    g.rect(dx - 2, H - 1, 12, 1, '#8a8a96'); g.rect(dx - 1, H - 2, 10, 1, '#a8a8b4'); // 入口の段
    // --- 名札（軒下のプレート） ---
    var plateH = T.icon ? 10 : 0;
    // --- 窓 ---
    var winCols = T.lit ? ['#ffd97a', '#ffe9a8'] : ['#8fd0ff', '#d8f0ff'];
    var winY = wallY + plateH + 1;
    for (var wx = 3; wx < W - 8; wx += 12) { if (Math.abs(wx + 3 - (dx + 4)) < 9) continue; if (winY + 7 > dy - 1) break; g.rect(wx, winY, 6, 6, '#3a2a10'); g.rect(wx + 1, winY + 1, 4, 4, winCols[0]); g.rect(wx + 1, winY + 1, 2, 2, winCols[1]); g.vline(wx + 3, winY + 1, 4, '#3a2a10'); g.hline(wx + 1, winY + 3, 4, '#3a2a10'); g.rect(wx, winY + 6, 6, 1, ST.trim); }
    // --- 屋根（勾配＋瓦） ---
    var eave = 1;
    for (var ry = 0; ry < roofH; ry++) {
      var inset = Math.max(0, Math.round((roofH - 1 - ry) * (W / 2) / (roofH * 1.6)));
      var col = ry % 4 === 3 ? T.roofD : T.roof;
      g.rect(inset, ry, W - inset * 2, 1, col);
      if (ry % 4 === 0) for (var tx = inset + ((ry / 4) % 2) * 4; tx < W - inset; tx += 8) g.px(tx, ry, T.roofL);
      g.px(inset, ry, T.roofL); g.px(W - 1 - inset, ry, T.roofD);
    }
    g.rect(0, roofH - 1 - eave, W, 2, T.roofD); g.hline(0, roofH, W, 'rgba(0,0,0,0.35)');
    // 棟
    g.rect(Math.round(W / 2) - 2, 0, 4, 1, T.roofL);
    // --- 教会：塔と鐘、丸窓 ---
    if (T.tower) {
      var tw = 14, tx0 = Math.round(W / 2 - tw / 2);
      g.rect(tx0, 2, tw, roofH + 4, ST.wall); g.rect(tx0, 2, 1, roofH + 4, ST.wallL); g.rect(tx0 + tw - 1, 2, 2, roofH + 4, ST.wallD);
      for (var ty = 0; ty < 7; ty++) g.rect(tx0 - 1 + ty, ty - 4, tw + 2 - ty * 2, 1, ty % 2 ? T.roofD : T.roof);
      g.rect(tx0 + 4, 5, 6, 6, '#2a2a3a'); g.rect(tx0 + 5, 6, 4, 4, '#e8c15a'); g.px(tx0 + 6, 9, '#8a6a2a'); g.px(tx0 + 7, 9, '#8a6a2a'); g.rect(tx0 + 2, 11, 10, 1, ST.trim);
      g.disc(Math.round(W / 2), roofH + 6, 3, '#3a2a10'); g.disc(Math.round(W / 2), roofH + 6, 2, '#ff8ab0'); g.px(Math.round(W / 2), roofH + 6, '#ffd24a');
    }
    // --- 煙突 ---
    if (T.chimney) { g.rect(W - 10, 1, 4, roofH - 2, '#6a6a7a'); g.rect(W - 11, 0, 6, 2, '#8a8a9a'); g.px(W - 8, -1, 'rgba(255,255,255,0.0)'); }
    // --- 旗（ギルド） ---
    if (T.flags) { g.rect(2, 2, 1, roofH, '#5a3a1a'); g.rect(3, 2, 5, 4, T.banner); g.rect(W - 3, 2, 1, roofH, '#5a3a1a'); g.rect(W - 8, 2, 5, 4, T.banner); }
    // --- 看板（アイコン板：ドアの横に吊るす） ---
    if (T.icon) {
      var sx = (dx + 4 < W / 2) ? dx + 12 : dx - 20; if (sx < 1) sx = dx + 12; if (sx + 17 > W) sx = dx - 20;
      var sy = wallY + plateH + 1; if (sy + 17 > H - 1) sy = H - 18;
      g.rect(sx - 1, sy - 1, 18, 18, '#3a2210'); g.rect(sx, sy, 16, 16, '#c9a06a'); g.rect(sx, sy, 16, 1, '#e0c080'); g.rect(sx, sy + 15, 16, 1, '#8a5a30');
      drawIcon(g, T.icon, sx, sy);
      g.rect(sx + 7, sy - 3, 2, 3, '#3a2210');
    }
    // --- 店先の小物 ---
    if (b.type === 'weapon') { g.rect(1, H - 7, 5, 4, '#3a3a44'); g.rect(0, H - 8, 7, 1, '#5a5a6a'); }
    if (b.type === 'armor') { g.rect(W - 8, H - 10, 5, 7, '#8a8a9a'); g.rect(W - 7, H - 12, 3, 2, '#6a6a7a'); }
    if (b.type === 'item') { g.rect(1, H - 6, 5, 4, '#a07040'); g.hline(1, H - 6, 5, '#c9a06a'); }
    if (b.type === 'tavern') { g.rect(1, H - 8, 4, 6, '#8a5a30'); g.hline(1, H - 6, 4, '#3a3a44'); g.rect(W - 6, wallY + 2, 3, 4, '#ffd24a'); g.rect(W - 7, wallY + 1, 5, 1, '#3a3a44'); }
    if (b.type === 'bank') { g.rect(1, wallY + 2, 3, wallH - 4, '#d0d0dc'); g.rect(W - 4, wallY + 2, 3, wallH - 4, '#d0d0dc'); }
    if (b.type === 'dojo') { g.rect(1, wallY + 3, 6, 8, '#f0e8d0'); g.hline(2, wallY + 5, 4, '#5a3a1a'); g.hline(2, wallY + 7, 4, '#5a3a1a'); g.hline(2, wallY + 9, 3, '#5a3a1a'); }
    // --- 施設名の文字（軒下のプレート） ---
    if (T.icon) {
      g.rect(0, wallY, W, plateH, '#3a2210'); g.rect(1, wallY + 1, W - 2, plateH - 2, '#f0e8d0'); g.rect(1, wallY + 1, W - 2, 1, '#ffffff');
      ctx.font = 'bold ' + Math.round(7 * S) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#2a1a0a'; ctx.fillText(b.name || T.label, (W / 2) * S, (wallY + plateH / 2) * S);
    }
    Buildings.cache[key] = c; return c;
  };

  root.Buildings = Buildings;
})(typeof window !== 'undefined' ? window : globalThis);
