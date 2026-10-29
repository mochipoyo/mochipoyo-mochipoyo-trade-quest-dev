/* 歩行スプライト生成ツール（16×24 ドット / 4方向 × 3フレーム）
   立ち絵の髪型・髪色・服装・装備を手で定義し、コードで描く。ブラウザで実行して PNG を書き出す。
   方向の行順: down, left, right, up / フレーム: 0=待機, 1=左足前, 2=右足前 */
(function (root) {
  var W = 16, H = 24;
  var SKIN = '#f0c8a0', SKIN_D = '#c8906a', EYE = '#1b1b2a';
  // id: { hair:{style,color}, head:{type,color,color2}, body:{type,color,color2,color3}, legs:{color}, item:{type,color,color2}, skin, eye, beard, cape }
  var DEFS = {
    hero_warrior: { hair: { style: 'spiky', color: '#e04a3a' }, body: { type: 'armor', color: '#c0c4d4', color2: '#e8c15a', color3: '#c0303a' }, legs: { color: '#3a3a4a' }, cape: '#c0303a', item: { type: 'sword', color: '#d8d8e8' }, shield: '#5a7ad0' },
    hero_mage: { hair: { style: 'long', color: '#e06a5a' }, head: { type: 'hat', color: '#c0303a', color2: '#e8c15a' }, body: { type: 'robe', color: '#b8303a', color2: '#e8c15a' }, legs: { color: '#5a2a2a' }, item: { type: 'staff', color: '#8a5a2a', color2: '#ff6a2a' } },
    hero_priest: { hair: { style: 'long', color: '#f0d08a' }, head: { type: 'veil', color: '#f4f4ff', color2: '#e8c15a' }, body: { type: 'robe', color: '#f4f4ff', color2: '#e8c15a' }, legs: { color: '#e0e0f0' }, item: { type: 'staff', color: '#e8c15a', color2: '#5ab0ff' } },
    hero_monk: { hair: { style: 'spiky', color: '#6a4a2a' }, body: { type: 'gi', color: '#c94a3a', color2: '#f0f0f0', color3: '#e03a3a' }, legs: { color: '#2a2a3a' }, item: { type: 'fist' } },
    hero_thief: { hair: { style: 'short', color: '#2a2a3a' }, head: { type: 'hood', color: '#5a3a8a', color2: '#3a2a5a' }, body: { type: 'tunic', color: '#2a2a3a', color2: '#e8c15a' }, legs: { color: '#1a1a2a' }, item: { type: 'dagger', color: '#d8d8e8' } },
    hero_merchant: { hair: { style: 'short', color: '#f0d08a' }, head: { type: 'cap', color: '#4a8a3a', color2: '#2a5a2a' }, body: { type: 'tunic', color: '#5a8a3a', color2: '#8a5a2a' }, legs: { color: '#4a3a2a' }, item: { type: 'bag', color: '#8a5a2a', color2: '#5a3a1a' } },
    hero_hunter: { hair: { style: 'short', color: '#f0d08a' }, head: { type: 'hood', color: '#3a7a3a', color2: '#2a5a2a' }, body: { type: 'tunic', color: '#4a8a3a', color2: '#8a5a2a' }, legs: { color: '#4a3a2a' }, item: { type: 'bow', color: '#8a5a2a' } },
    hero_knight: { hair: { style: 'spiky', color: '#2f6fd0' }, body: { type: 'armor', color: '#c0c4d4', color2: '#3f6fd0', color3: '#3f6fd0' }, legs: { color: '#5a5a6a' }, item: { type: 'sword', color: '#d8d8e8' }, shield: '#3f6fd0' },
    hero_sage: { hair: { style: 'long', color: '#c8c0e0' }, body: { type: 'robe', color: '#5a3a8a', color2: '#e8c15a' }, legs: { color: '#2a1a3a' }, item: { type: 'sword', color: '#d8d8e8' } },
    hero_magicknight: { hair: { style: 'spiky', color: '#2a2a4a' }, body: { type: 'armor', color: '#3a3a4a', color2: '#e8c15a', color3: '#c0303a' }, legs: { color: '#2a2a3a' }, cape: '#c0303a', item: { type: 'staff', color: '#8a5a2a', color2: '#a05ad0' } },
    hero_waveblade: { hair: { style: 'spiky', color: '#f0f0f8' }, body: { type: 'armor', color: '#1f3a66', color2: '#5ab0ff', color3: '#1a2a4a' }, legs: { color: '#1a1a2a' }, item: { type: 'sword', color: '#7fd0ff', glow: true } },
    hero_master: { hair: { style: 'short', color: '#4a9a5a' }, head: { type: 'cap', color: '#2a4a3a', color2: '#1a2a2a' }, body: { type: 'robe', color: '#f0e8d0', color2: '#e8c15a' }, legs: { color: '#5a4a3a' }, item: { type: 'staff', color: '#8a5a2a', color2: '#ff9a2a' }, glasses: true },
    lina: { hair: { style: 'long', color: '#ff9ac0' }, head: { type: 'veil', color: '#f4f4ff', color2: '#e04a5a' }, body: { type: 'robe', color: '#f4f4ff', color2: '#e04a5a' }, legs: { color: '#e0e0f0' }, item: { type: 'staff', color: '#e8c15a', color2: '#ff4a4a' } },
    kyle: { hair: { style: 'spiky', color: '#f0d05a' }, body: { type: 'armor', color: '#c0c4d4', color2: '#e8c15a', color3: '#3f6fd0' }, legs: { color: '#5a5a6a' }, cape: '#3f6fd0', item: { type: 'sword', color: '#d8d8e8' }, shield: '#3f6fd0' },
    mina: { hair: { style: 'ponytail', color: '#2a2a3a' }, body: { type: 'tunic', color: '#2a2a3a', color2: '#8a3ad0' }, legs: { color: '#1a1a2a' }, scarf: '#8a3ad0', item: { type: 'dagger', color: '#d8d8e8' } },
    seris: { hair: { style: 'long', color: '#9fd0ff' }, head: { type: 'hat', color: '#2a3a8a', color2: '#e8c15a' }, body: { type: 'robe', color: '#2a3a8a', color2: '#e8c15a' }, legs: { color: '#1a1a4a' }, item: { type: 'staff', color: '#e8c15a', color2: '#5ab0ff' } },
    gald: { hair: { style: 'spiky', color: '#e04a3a' }, beard: '#c03a2a', body: { type: 'fur', color: '#8a5a3a', color2: '#d8c0a0', color3: '#c0303a' }, legs: { color: '#4a3a2a' }, item: { type: 'axe', color: '#8a5a2a', color2: '#c0c4d4' } },
    lucia: { hair: { style: 'long', color: '#1f2a66' }, head: { type: 'hood', color: '#2f4fb0', color2: '#1f2a66' }, body: { type: 'robe', color: '#2f4fb0', color2: '#f4f4ff' }, legs: { color: '#1a1a4a' }, item: { type: 'staff', color: '#8a5a2a', color2: '#5ab0ff', glow: true } },
    elder: { hair: { style: 'short', color: '#e8e8e8' }, beard: '#e8e8e8', body: { type: 'robe', color: '#3a7a4a', color2: '#e8c15a' }, legs: { color: '#2a5a3a' }, item: { type: 'staff', color: '#8a5a2a', color2: '#8a5a2a' } },
    king: { hair: { style: 'short', color: '#e8e8e8' }, beard: '#e8e8e8', head: { type: 'crown', color: '#e8c15a', color2: '#e04a3a' }, body: { type: 'robe', color: '#c0303a', color2: '#e8c15a' }, legs: { color: '#8a1a2a' }, cape: '#c0303a', item: { type: 'none' } },
    guard: { hair: { style: 'short', color: '#4a3a2a' }, head: { type: 'helmet', color: '#c0c4d4', color2: '#3f6fd0' }, body: { type: 'armor', color: '#c0c4d4', color2: '#3f6fd0', color3: '#3f6fd0' }, legs: { color: '#5a5a6a' }, item: { type: 'spear', color: '#8a5a2a', color2: '#d8d8e8' }, shield: '#3f6fd0' },
    merchant: { hair: { style: 'short', color: '#f0d08a' }, head: { type: 'cap', color: '#4a8a3a', color2: '#2a5a2a' }, body: { type: 'tunic', color: '#8a6a3a', color2: '#5a3a1a' }, legs: { color: '#4a3a2a' }, item: { type: 'bag', color: '#8a5a2a', color2: '#5a3a1a' } },
    innkeeper: { hair: { style: 'bun', color: '#6a4a2a' }, head: { type: 'headband', color: '#f4f4ff' }, body: { type: 'dress', color: '#8a3a2a', color2: '#f4f4ff' }, legs: { color: '#5a2a1a' }, item: { type: 'mug', color: '#8a5a2a', color2: '#f0e0a0' } },
    priest: { hair: { style: 'short', color: '#f0d08a' }, head: { type: 'veil', color: '#f4f4ff', color2: '#3f6fd0' }, body: { type: 'robe', color: '#f4f4ff', color2: '#3f6fd0' }, legs: { color: '#e0e0f0' }, item: { type: 'staff', color: '#e8c15a', color2: '#e8c15a' } },
    bartender: { hair: { style: 'short', color: '#6a4a2a' }, beard: '#5a3a1a', body: { type: 'dress', color: '#8a5a3a', color2: '#f4f4ff' }, legs: { color: '#3a2a1a' }, item: { type: 'mug', color: '#8a5a2a', color2: '#f0e0a0' } },
    villager_m: { hair: { style: 'short', color: '#6a4a2a' }, body: { type: 'tunic', color: '#4a7a3a', color2: '#f4f4ff' }, legs: { color: '#4a3a2a' }, item: { type: 'none' } },
    villager_f: { hair: { style: 'long', color: '#6a4a2a' }, head: { type: 'headband', color: '#f4f4ff' }, body: { type: 'dress', color: '#c0303a', color2: '#f4f4ff' }, legs: { color: '#8a1a2a' }, item: { type: 'basket', color: '#c9a06a', color2: '#e04a3a' } },
    child: { hair: { style: 'short', color: '#6a4a2a' }, body: { type: 'tunic', color: '#f4f4ff', color2: '#3f6fd0' }, legs: { color: '#3f6fd0' }, item: { type: 'none' }, small: true },
    master: { hair: { style: 'spiky', color: '#e8e8f0' }, body: { type: 'fur', color: '#2f4fb0', color2: '#d8c0a0', color3: '#1f3a66' }, legs: { color: '#1a1a2a' }, cape: '#2f4fb0', item: { type: 'none' } },
    sailor: { hair: { style: 'short', color: '#f0d08a' }, head: { type: 'bandana', color: '#2f4fb0' }, body: { type: 'stripes', color: '#f4f4ff', color2: '#2f4fb0' }, legs: { color: '#2f4fb0' }, item: { type: 'none' } },
    scholar: { hair: { style: 'short', color: '#5a3a8a' }, body: { type: 'robe', color: '#2a2d4a', color2: '#8fb8ff' }, legs: { color: '#1a1a2a' }, item: { type: 'book', color: '#8fb8ff', color2: '#f4f4ff' }, glasses: true },
    // 人間系の敵（戦闘用：正面フレームを拡大して使う）
    bandit: { hair: { style: 'short', color: '#2a1a0a' }, head: { type: 'bandana', color: '#8a1a1a' }, body: { type: 'tunic', color: '#5a3a1a', color2: '#8a1a1a' }, legs: { color: '#2a2a2a' }, item: { type: 'dagger', color: '#9a9aaa' }, scar: true },
    bandit_archer: { hair: { style: 'short', color: '#4a2a0a' }, head: { type: 'bandana', color: '#3a5a2a' }, body: { type: 'tunic', color: '#6a4a1a', color2: '#3a5a2a' }, legs: { color: '#2a2a2a' }, item: { type: 'bow', color: '#c9a06a' }, scar: true },
    pirate: { hair: { style: 'short', color: '#2a1a0a' }, head: { type: 'bandana', color: '#c94a4a' }, body: { type: 'stripes', color: '#f4f4ff', color2: '#2a2a4a' }, legs: { color: '#1a1a2a' }, item: { type: 'sword', color: '#9a9aaa' }, eyepatch: true },
    dark_mage: { hair: { style: 'long', color: '#1a0a2a' }, head: { type: 'hood', color: '#2a0a3a', color2: '#1a0a2a' }, body: { type: 'robe', color: '#2a0a3a', color2: '#8a5ad0' }, legs: { color: '#1a0a2a' }, item: { type: 'staff', color: '#5a2a8a', color2: '#ff3a6a', glow: true }, eye: '#ff3a6a' },
    boss_bandit_chief: { hair: { style: 'spiky', color: '#2a1a0a' }, beard: '#2a1a0a', head: { type: 'bandana', color: '#8a1a1a' }, body: { type: 'fur', color: '#5a3a1a', color2: '#8a7a6a', color3: '#8a1a1a' }, legs: { color: '#2a2a2a' }, item: { type: 'axe', color: '#5a3a1a', color2: '#c0c4d4' }, scar: true, big: true },
    shadow: { hair: { style: 'wisp', color: '#2a2a3a' }, body: { type: 'robe', color: '#1a1a2a', color2: '#3a2a4a' }, legs: { color: '#1a1a2a' }, item: { type: 'none' }, skin: '#2a2a3a', eye: '#ff6a3a', ghost: true }
  };

  function shade(hex, f) { var n = parseInt(hex.slice(1), 16); var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f))); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }

  // ---- 1フレーム描画（16×24, 1px=1ドット） ----
  function frame(id, dir, fr) {
    var d = DEFS[id]; var c = document.createElement('canvas'); c.width = W; c.height = H; var ctx = c.getContext('2d');
    var flip = dir === 'left'; var side = dir === 'left' || dir === 'right'; var back = dir === 'up';
    function px(x, y, col) { if (col) { ctx.fillStyle = col; ctx.fillRect(flip ? W - 1 - x : x, y, 1, 1); } }
    function rect(x, y, w, h, col) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) px(xx, yy, col); }
    var skin = d.skin || SKIN, skinD = d.skin ? shade(d.skin, 0.7) : SKIN_D, eye = d.eye || EYE;
    var bob = fr === 0 ? 0 : 1;             // 歩行中は体が1px上下
    var small = d.small ? 1 : 0;             // 子ども：少し低い
    var top = 2 + bob + small * 2;           // 頭の上端
    var hairC = d.hair.color, hairD = shade(hairC, 0.7);
    var bodyC = d.body.color, bodyD = shade(bodyC, 0.7), body2 = d.body.color2 || bodyC, body3 = d.body.color3 || body2;
    var legC = d.legs.color, legD = shade(legC, 0.7);
    var long = d.body.type === 'robe' || d.body.type === 'dress';
    // ---- 脚（足元 y=23 固定） ----
    var legY = 18 + small; var legH = 24 - legY;
    if (!long) {
      if (side) { // 横：前後に足を出す
        var lf = fr === 1 ? -1 : fr === 2 ? 1 : 0;
        rect(6 + lf, legY, 2, legH, legC); rect(8 - lf, legY, 2, legH, legD); px(6 + lf, 23, '#2a1a0a'); px(7 + lf, 23, '#2a1a0a'); px(8 - lf, 23, '#2a1a0a'); px(9 - lf, 23, '#2a1a0a');
      } else {
        var up1 = fr === 1 ? 1 : 0, up2 = fr === 2 ? 1 : 0;
        rect(5, legY, 3, legH - up1, legC); rect(8, legY, 3, legH - up2, legD); rect(5, 23 - up1, 3, 1, '#2a1a0a'); rect(8, 23 - up2, 3, 1, '#2a1a0a');
      }
    } else { // ローブ：裾が揺れる
      var sw = fr === 1 ? -1 : fr === 2 ? 1 : 0;
      rect(4, legY, 8, legH - 1, bodyD); rect(4 + (sw > 0 ? 1 : 0), legY + 2, 8, 3, bodyC); rect(5 + sw, 23, 2, 1, '#2a1a0a'); rect(9 + sw, 23, 2, 1, '#2a1a0a'); if (!back) rect(7, legY, 2, legH - 1, body2);
    }
    // ---- マント（背面で見える） ----
    if (d.cape && (back || side)) { rect(back ? 4 : (flip ? 3 : 9), 12 + bob + small, back ? 8 : 4, 9, d.cape); rect(back ? 4 : (flip ? 3 : 9), 12 + bob + small, back ? 8 : 4, 1, shade(d.cape, 1.2)); }
    // ---- 胴体 ----
    var by = 12 + bob + small, bh = 6;
    var t = d.body.type;
    if (t === 'armor') { rect(4, by, 8, bh, bodyC); rect(3, by, 2, 2, body2); rect(11, by, 2, 2, body2); rect(7, by + 1, 2, 3, body3); rect(4, by + bh - 1, 8, 1, bodyD); }
    else if (t === 'fur') { rect(3, by, 10, 2, body2); rect(4, by + 2, 8, bh - 2, bodyC); rect(7, by + 2, 2, 3, body3); }
    else if (t === 'gi') { rect(4, by, 8, bh, bodyC); if (!back) { px(6, by, body2); px(9, by, body2); px(7, by + 1, body2); px(8, by + 1, body2); } rect(4, by + bh - 1, 8, 1, body3); }
    else if (t === 'stripes') { rect(4, by, 8, bh, bodyC); for (var sy = by + 1; sy < by + bh; sy += 2) rect(4, sy, 8, 1, body2); }
    else if (t === 'dress') { rect(4, by, 8, bh, bodyC); if (!back) rect(6, by + 2, 4, bh - 2, body2); rect(5, by, 6, 1, body2); }
    else if (t === 'tunic') { rect(4, by, 8, bh, bodyC); rect(4, by, 8, 1, body2); if (!back) rect(7, by + 1, 2, bh - 1, bodyD); }
    else { rect(4, by, 8, bh, bodyC); if (!back) rect(7, by, 2, bh, body2); rect(4, by + bh - 1, 8, 1, bodyD); }   // robe
    if (d.scarf && !back) rect(5, by, 6, 2, d.scarf);
    // 腕（横向きは手前の腕が振れる）
    var armSw = fr === 1 ? 1 : fr === 2 ? -1 : 0;
    if (side) { rect(7 + armSw, by + 1, 2, 4, t === 'armor' ? body2 : bodyC); px(7 + armSw, by + 5, skin); px(8 + armSw, by + 5, skin); }
    else { rect(3, by + 1 + (fr === 1 ? 1 : 0), 1, 4, t === 'armor' ? body2 : bodyD); rect(12, by + 1 + (fr === 2 ? 1 : 0), 1, 4, t === 'armor' ? body2 : bodyD); px(3, by + 5 + (fr === 1 ? 1 : 0), skin); px(12, by + 5 + (fr === 2 ? 1 : 0), skin); }
    // ---- 頭 ----
    var hy = top + 1;   // 顔の上端
    if (side) { rect(5, hy, 7, 8, skin); rect(5, hy + 7, 7, 1, skinD); } else { rect(4, hy, 8, 8, skin); rect(4, hy + 7, 8, 1, skinD); }
    // 髪
    var hs = d.hair.style;
    if (hs === 'wisp') { rect(4, top, 8, 4, hairC); px(3, top + 2, hairC); px(12, top + 3, hairC); }
    else {
      if (side) { rect(4, top, 8, 3, hairC); rect(4, top + 3, 2, 3, hairC); px(11, top + 3, hairC); if (flip) { } }
      else { rect(4, top, 8, 3, hairC); px(3, top + 2, hairC); px(12, top + 2, hairC); px(3, top + 3, hairC); px(12, top + 3, hairC); }
      if (hs === 'spiky') { px(4, top - 1, hairC); px(7, top - 1, hairC); px(10, top - 1, hairC); px(6, top - 2, hairC); px(9, top - 2, hairC); }
      if (hs === 'long') { rect(3, top + 3, 2, 7, hairC); rect(11, top + 3, 2, 7, hairC); if (back) rect(4, top + 3, 8, 7, hairC); if (side) rect(flip ? 11 : 3, top + 3, 2, 7, hairC); }
      if (hs === 'ponytail') { if (!side) rect(back ? 7 : 11, top + 2, 2, 8, hairC); else rect(3, top + 2, 2, 8, hairC); }
      if (hs === 'bun') { rect(6, top - 1, 4, 2, hairC); }
      if (back) rect(4, top + 3, 8, 5, hairC);
      rect(4, top, 8, 1, shade(hairC, 1.25));
    }
    // 顔
    if (!back) {
      var ey = hy + 4;
      if (side) { px(flip ? 6 : 9, ey, eye); px(flip ? 7 : 10, ey, eye); px(flip ? 6 : 9, ey - 1, '#fff'); if (d.glasses) { rect(flip ? 5 : 8, ey - 1, 3, 1, '#3a3a4a'); } }
      else { px(6, ey, eye); px(9, ey, eye); px(6, ey - 1, '#fff'); px(9, ey - 1, '#fff'); px(6, ey + 1, eye); px(9, ey + 1, eye); if (d.glasses) { rect(5, ey - 1, 3, 1, '#3a3a4a'); rect(8, ey - 1, 3, 1, '#3a3a4a'); px(7, ey, '#3a3a4a'); px(8, ey, '#3a3a4a'); } px(5, ey + 2, '#f0a0a0'); px(10, ey + 2, '#f0a0a0'); }
      if (d.ghost) { px(6, ey, eye); px(9, ey, eye); px(6, ey + 1, eye); px(9, ey + 1, eye); }
      if (d.scar && !side) { px(9, ey + 1, '#c04a4a'); px(10, ey + 2, '#c04a4a'); }
      if (d.eyepatch && !side) { rect(8, ey - 1, 3, 3, '#1a1a1a'); rect(4, ey - 2, 8, 1, '#1a1a1a'); }
      if (d.beard) { if (side) { rect(flip ? 5 : 8, hy + 6, 4, 3, d.beard); } else { rect(4, hy + 6, 8, 3, d.beard); rect(5, hy + 9, 6, 1, d.beard); px(7, hy + 6, skin); px(8, hy + 6, skin); } }
    } else if (d.beard) { px(4, hy + 6, d.beard); px(11, hy + 6, d.beard); }
    // かぶりもの
    var hd = d.head;
    if (hd) {
      var hc = hd.color, hc2 = hd.color2 || shade(hc, 0.7);
      if (hd.type === 'hat') { rect(2, top + 1, 12, 1, hc2); rect(3, top, 10, 1, hc); rect(5, top - 1, 6, 1, hc); rect(6, top - 2, 4, 1, hc); rect(7, top - 3, 3, 1, hc); px(9, top - 4, hc); px(10, top - 5, hc); rect(4, top + 2, 8, 1, hc2); rect(5, top + 1, 6, 1, hc2 === hc ? hc : hd.color2); }
      else if (hd.type === 'hood') { rect(3, top - 1, 10, 2, hc); rect(3, top + 1, 2, 7, hc); rect(11, top + 1, 2, 7, hc); rect(4, top, 8, 2, hc); if (back) rect(4, top + 2, 8, 6, hc); if (side) rect(flip ? 10 : 4, top + 2, 2, 6, hc); rect(3, top + 8, 10, 1, hc2); if (!back && hd.type === 'hood' && d.hair.style === 'short' && !side) rect(5, hy + 2, 6, 1, shade(skin, 0.75)); }
      else if (hd.type === 'veil') { rect(3, top - 1, 10, 2, hc); rect(3, top + 1, 2, 9, hc); rect(11, top + 1, 2, 9, hc); if (back) rect(4, top + 1, 8, 9, hc); if (side) rect(flip ? 10 : 4, top + 1, 2, 9, hc); rect(3, top - 1, 10, 1, hc2); }
      else if (hd.type === 'helmet') { rect(3, top - 1, 10, 4, hc); rect(4, top - 2, 8, 1, hc); rect(3, top + 3, 10, 1, hc2); if (!back) rect(4, top + 2, 8, 1, shade(hc, 0.6)); px(7, top - 3, hc2); px(8, top - 3, hc2); }
      else if (hd.type === 'crown') { rect(4, top - 1, 8, 2, hc); px(4, top - 2, hc); px(7, top - 3, hc); px(8, top - 3, hc); px(11, top - 2, hc); px(7, top - 1, hc2); px(8, top - 1, hc2); }
      else if (hd.type === 'cap') { rect(3, top - 1, 10, 3, hc); rect(3, top + 2, 10, 1, hc2); if (!back) rect(3, top + 2, 11, 1, hc2); }
      else if (hd.type === 'bandana') { rect(3, top - 1, 10, 3, hc); rect(3, top + 2, 10, 1, shade(hc, 0.7)); if (!side && !back) px(12, top + 3, hc); if (back) { px(7, top + 3, hc); px(8, top + 4, hc); } }
      else if (hd.type === 'headband') { rect(4, top + 1, 8, 1, hc); }
    }
    // ---- 持ち物 ----
    var it = d.item || { type: 'none' }; var ic = it.color, ic2 = it.color2 || ic;
    var hx = side ? (flip ? 5 : 10) : 12;   // 手の位置（右手）
    if (it.type === 'staff') { var sx = side ? (flip ? 3 : 12) : 13; rect(sx, by - 6, 1, 15, ic); rect(sx - 1, by - 8, 3, 2, ic2); px(sx, by - 9, ic2); if (it.glow) { px(sx - 1, by - 9, shade(ic2, 1.3)); px(sx + 1, by - 9, shade(ic2, 1.3)); } }
    else if (it.type === 'sword') { var sx2 = side ? (flip ? 2 : 13) : 13; rect(sx2, by - 4, 1, 9, ic); px(sx2, by - 5, '#f4f4ff'); rect(sx2 - 1, by + 5, 3, 1, '#e8c15a'); px(sx2, by + 6, '#5a3a1a'); if (it.glow) { px(sx2 - 1, by - 2, '#bfe8ff'); px(sx2 + 1, by, '#bfe8ff'); } }
    else if (it.type === 'dagger') { var sx3 = side ? (flip ? 2 : 13) : 13; rect(sx3, by + 1, 1, 5, ic); px(sx3, by + 6, '#5a3a1a'); }
    else if (it.type === 'spear') { var sx4 = side ? (flip ? 3 : 12) : 13; rect(sx4, by - 9, 1, 18, ic); rect(sx4, by - 11, 1, 2, ic2); px(sx4, by - 12, ic2); }
    else if (it.type === 'axe') { var sx5 = side ? (flip ? 3 : 12) : 13; rect(sx5, by - 5, 1, 12, ic); rect(sx5 - 1, by - 7, 3, 3, ic2); if (!side) rect(sx5 + 1, by - 6, 1, 2, ic2); }
    else if (it.type === 'bow') { if (back || side) { var bx = back ? 3 : (flip ? 12 : 3); for (var i = 0; i < 9; i++) px(bx + (i < 4 ? i / 2 | 0 : (8 - i) / 2 | 0), by - 3 + i, ic); } else { rect(13, by - 2, 1, 9, ic); } }
    else if (it.type === 'book') { if (!back) rect(side ? (flip ? 3 : 11) : 11, by + 2, 3, 3, ic); if (!back) rect(side ? (flip ? 4 : 12) : 12, by + 2, 1, 3, ic2); }
    else if (it.type === 'mug') { if (!back) { rect(side ? hx - 1 : 12, by + 2, 2, 3, ic); px(side ? hx - 1 : 12, by + 1, ic2); px(side ? hx : 13, by + 1, ic2); } }
    else if (it.type === 'basket') { if (!back) { rect(side ? hx - 1 : 11, by + 3, 3, 3, ic); px(side ? hx : 12, by + 2, ic2); } }
    else if (it.type === 'bag') { if (back) rect(5, by, 6, 6, ic); else if (side) rect(flip ? 11 : 3, by, 2, 6, ic); }
    // 盾（左手）：正面と横で見える
    if (d.shield && !back) { var shx = side ? (flip ? 11 : 2) : 1; rect(shx, by + 1, 3, 4, d.shield); rect(shx + 1, by + 2, 1, 2, '#e8c15a'); }
    // 影の人型：全体を暗く＋ゆらぎ
    if (d.ghost) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(20,10,40,0.35)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; if (!back) { px(6, hy + 4, eye); px(9, hy + 4, eye); } }
    // 1px の暗い縁取り（フィールドで背景に溶けないように）
    var img = ctx.getImageData(0, 0, W, H); var a = img.data; var out = ctx.createImageData(W, H); var o = out.data;
    for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) { var i = (yy * W + xx) * 4; if (a[i + 3]) { o[i] = a[i]; o[i + 1] = a[i + 1]; o[i + 2] = a[i + 2]; o[i + 3] = a[i + 3]; continue; }
      var near = false; for (var ddy = -1; ddy <= 1 && !near; ddy++) for (var ddx = -1; ddx <= 1; ddx++) { if (!ddx && !ddy) continue; var nx = xx + ddx, ny = yy + ddy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (a[(ny * W + nx) * 4 + 3] > 0 && (ddx === 0 || ddy === 0)) { near = true; break; } }
      if (near) { o[i] = 20; o[i + 1] = 18; o[i + 2] = 34; o[i + 3] = 200; } }
    ctx.putImageData(out, 0, 0);
    return c;
  }

  // ---- シート（3列 × 4行: down, left, right, up） ----
  var DIRS = ['down', 'left', 'right', 'up'];
  function sheet(id, scale) {
    scale = scale || 1; var c = document.createElement('canvas'); c.width = W * 3 * scale; c.height = H * 4 * scale; var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    DIRS.forEach(function (dir, r) { for (var f = 0; f < 3; f++) { ctx.drawImage(frame(id, dir, f), f * W * scale, r * H * scale, W * scale, H * scale); } });
    return c;
  }
  root.Walker = { DEFS: DEFS, frame: frame, sheet: sheet, DIRS: DIRS, W: W, H: H };
})(typeof window !== 'undefined' ? window : globalThis);
