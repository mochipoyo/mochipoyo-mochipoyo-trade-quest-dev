/* =========================================================
   EquipmentAppearance（v9.6 → v9.7）：装備でキャラの外見が変わる
   ・v9.7：ドット絵の差分に切り替え（下の「v9.7 ドット絵の差分」）。部品のある人物・向き（試作は主人公のメニューの戦士の立ち絵と戦闘の背面）だけ着替え、
     ほかは本人の従来の絵。v9.6 の描き足し（以下の説明）は setMode('vector') でだけ使う（開発の見比べ用）（見た目だけ。能力・装備できるか・所持数・ボス装備の効果・セーブは既存の処理のまま）
   ・素材キット（TradeQuest_Equipment_Appearance・参照 8c5bd23）の js/equipment-appearance.js を元にした共通部品。同じ名前の関数（slots・resolve・signature・paint・compose）を残し、足したもの：
       形の細かい違い（剣・大剣・曲刀、槍・斧槍・三叉、重鎧・鎖・鱗、ローブ・羽衣、兜・冠、帽子・魔女帽…）と、向き（正面・背面・左右）ごとの描き分け
       配色は装備の絵（assets/item-icons）の色から（js/data/equip-appearance-data.js。tools/appear/make_appearance_data.py が作る）。表にない品は type の形と ID から決めた色
       本人の素体（武器・盾を外し、後ろを補った写し。assets/characters/equip-bases/。元の絵は変えない）と、位置の表（js/data/equip-anchors.js）
       服・鎧は「体の形 − 顔・手・髪」の中に着せる。兜・帽子は顔にかけない。武器は指の下に通す（握っている手を上に描き直す）
       ドット絵に合わせて、絵の 1 ドットの大きさ（px）で描いてから拡大する
   ・装備の外見はセーブに書かない。毎回 actor.equip（いまの装備ID）と ITEMS から作る。同じ組み合わせ（signature）は作り直さない
   ・画像や位置の表がない人物・向きは、本人の元の絵のまま（unsupported に記録）
   ========================================================= */
(function (root) {
  'use strict';
  var slots = ['weapon', 'armor', 'shield', 'head', 'acc'];
  // 素材キットの 15 の形（見本・表にない品の予備）
  var paths = {
    sword: 'M-6 24H6V9H15V2H5V-29L0-41L-5-29V2H-15V9H-6Z',
    dagger: 'M-5 21H5V8H12V1H6L0-24L-6 1H-12V8H-5Z',
    spear: 'M-3 41H3V-22L10-26L0-48L-10-26L-3-22Z',
    axe: 'M-4 34H4V-16Q16-7 24-12V-37Q12-42 4-32H-4Z',
    bow: 'M-15-36Q27-30 25 0Q27 30-15 36L-10 29Q17 25 17 0Q17-25-10-29ZM-15-36V36H-13V-36Z',
    staff: 'M-3 40H4V-20L13-32L4-45H-5L-13-32L-3-20Z',
    club: 'M-5 34H5L8-10L17-20L13-36H-13L-17-20L-8-10Z',
    claw: 'M-15 12H13L17-20L9-7L8-26L1-8L-3-26L-8-8L-15-20Z',
    heavy: 'M-27-20L-18-26L-9-20H9L18-26L27-20L22-6L16-6L14 18L0 24L-14 18L-16-6H-22Z',
    light: 'M-21-20L-10-23L0-14L10-23L21-20L18-5L13-4L15 20H-15L-13-4L-18-5Z',
    robe: 'M-22-19L-9-24L0-15L9-24L22-19L26 13L15 16L12 8L20 37H-20L-12 8L-15 16L-26 13Z',
    shield: 'M-22-22L0-28L22-22L18 10L0 28L-18 10Z',
    helm: 'M-23 11V-5Q-23-28 0-28Q23-28 23-5V11L12 8L14-4H-14L-12 8Z',
    hat: 'M-30 5L-15 0L-4-31L12-20L16 0L30 5L25 11H-25Z',
    acc: 'M-14-10L0-4L14-10L13-6L4 0L8 7L0 15L-8 7L-4 0L-13-6Z'
  };
  var palettes = [['#9ab6d2', '#435572'], ['#d8ac65', '#815332'], ['#b88ada', '#624481'], ['#87c5b2', '#335e59'], ['#e37d72', '#7d3e52'], ['#dac79c', '#69647e']];
  var anchorNames = { weapon: 'grip', armor: 'torso', shield: 'offhand', head: 'head', acc: 'neck' };
  var TYPE_SLOT = { heavy: 'armor', light: 'armor', robe: 'armor', shield: 'shield', helm: 'head', hat: 'head', acc: 'acc' };
  var DEFAULT_SUB = { sword: 'sword', dagger: 'dagger', spear: 'spear', axe: 'axe', bow: 'bow', staff: 'staff', club: 'club', claw: 'claw', heavy: 'plate', light: 'leather', robe: 'robe', shield: 'heater', helm: 'helm', hat: 'cap', acc: 'amulet' };
  var OUTLINE = '#1d1a28';
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function hashId(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0; return h; }
  function hex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(String(c || '')); if (!m) return [128, 128, 128]; var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb(a) { return '#' + a.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(c, k) { var a = hex(c); return rgb(a.map(function (v) { return k >= 0 ? v + (255 - v) * k : v * (1 + k); })); }
  function lum(c) { var a = hex(c); return a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114; }
  function sat(c) { var a = hex(c); var mx = Math.max.apply(null, a), mn = Math.min.apply(null, a); return (mx - mn) / (mx + 1); }

  /* ---------- 装備ID → 5 枠の描く情報（ゲームの装備は actor.equip と ITEMS のまま。ここは読むだけ） ---------- */
  function palOf(id, rec) {
    if (rec && rec.pal && rec.pal.length >= 3) { var p = rec.pal; return { main: p[0], trim: p[1], acc: p[2], light: p[3] || shade(p[0], 0.35), dark: p[4] || shade(p[0], -0.45) }; }
    var h = hashId(id); var q = palettes[h % palettes.length]; return { main: q[0], trim: q[1], acc: shade(q[0], 0.3), light: shade(q[0], 0.4), dark: q[1] };
  }
  function resolve(actor, items, data) {
    items = items || root.ITEMS || {}; data = data || root.EQUIP_APPEARANCE_DATA || {};
    var eq = (actor && actor.equip) || {}; var out = [];
    slots.forEach(function (slot) {
      var id = eq[slot]; if (!id || !own(items, id)) return;
      var item = items[id]; var actual = item.cat === 'weapon' ? 'weapon' : TYPE_SLOT[item.type]; if (actual !== slot) return;
      var shape = item.type; if (!own(paths, shape)) return;   // 知らない形の品は描かない（本人の絵のまま）
      var rec = own(data, id) ? data[id] : null; var h = hashId(id);
      out.push({ id: id, slot: slot, shape: shape, sub: (rec && rec.sub) || DEFAULT_SUB[shape] || shape, deco: (rec && rec.deco) || [], pal: palOf(id, rec), main: palOf(id, rec).main, trim: palOf(id, rec).trim,
        motif: (h >>> 5) % 4, boss: !!(rec ? rec.boss : item.bossExclusive), known: !!rec, iconPath: root.ITEM_ICON_MANIFEST && root.ITEM_ICON_MANIFEST.entries && own(root.ITEM_ICON_MANIFEST.entries, id) ? root.ITEM_ICON_MANIFEST.entries[id].webp : null });
    });
    return out;
  }
  function signature(actor, layers, baseKey, direction) { return JSON.stringify([actor && actor.id, actor && actor.job, baseKey, direction, (layers || []).map(function (l) { return l.id; })]); }

  /* ---------- 小さな描き道具（元の画像の座標で描く。ctx は 1/px に縮めてあり、線の太さ px＝1 ドット） ---------- */
  function P(ctx, px, pal, dir) { return { g: ctx, px: px, c: pal, dir: dir || 'front' }; }
  function path(pen, pts, close) { var g = pen.g; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) { var p = pts[i]; if (p.length === 4) g.quadraticCurveTo(p[0], p[1], p[2], p[3]); else g.lineTo(p[0], p[1]); } if (close !== false) g.closePath(); }
  function fillOut(pen, fill, line) { var g = pen.g; g.fillStyle = fill; g.fill(); g.lineWidth = pen.px * (line || 1); g.strokeStyle = OUTLINE; g.lineJoin = 'round'; g.stroke(); }
  function poly(pen, pts, fill, line) { path(pen, pts); fillOut(pen, fill, line); }
  function ell(pen, x, y, rx, ry, fill, line, rot) { var g = pen.g; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); fillOut(pen, fill, line); }
  function rect(pen, x, y, w, h, fill, line) { poly(pen, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, line); }
  function stroke(pen, pts, col, w) { var g = pen.g; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) { var p = pts[i]; if (p.length === 4) g.quadraticCurveTo(p[0], p[1], p[2], p[3]); else g.lineTo(p[0], p[1]); } g.lineWidth = (w || 1) * pen.px; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
  function gem(pen, x, y, r, col) { ell(pen, x, y, r, r, col, 1); ell(pen, x - r * 0.3, y - r * 0.35, Math.max(pen.px * 0.5, r * 0.3), Math.max(pen.px * 0.5, r * 0.3), shade(col, 0.6), 0.001); }
  function metal(c) { var L = lum(c.light); return L > 215 ? shade(c.light, -0.24) : L > 115 ? c.light : shade(c.main, 0.4); }
  function goldOr(c) { var t = c.trim; return sat(t) > 0.25 && lum(t) > 90 ? t : (sat(c.acc) > 0.3 ? c.acc : '#d8b04a'); }
  function has(layer, tag) { return layer.deco && layer.deco.indexOf(tag) >= 0; }
  // 意匠の小さな印（盾・鎧の胸・兜の飾り）
  function emblem(pen, layer, x, y, r) {
    var c = pen.c; var col = layer.deco.indexOf('royal') >= 0 ? '#e8c35a' : (sat(c.acc) > 0.25 ? c.acc : goldOr(c));
    var t = layer.deco.filter(function (d) { return ['star', 'clock', 'gear', 'eye', 'anchor', 'face', 'book', 'crack', 'wave', 'holy', 'gauge', 'signal', 'mech', 'ice', 'fang', 'sand', 'dawn', 'dragon', 'candle', 'rune', 'circuit', 'chain'].indexOf(d) >= 0; })[0] || ['cross', 'star', 'diamond', 'wave'][layer.motif % 4];
    var g = pen.g;
    if (t === 'star' || t === 'holy' || t === 'dawn') { var pts = []; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } poly(pen, pts, col); }
    else if (t === 'clock' || t === 'gauge') { ell(pen, x, y, r, r, shade(col, 0.5)); stroke(pen, [[x, y], [x, y - r * 0.7]], OUTLINE, 1); stroke(pen, [[x, y], [x + r * 0.55, y]], OUTLINE, 1); }
    else if (t === 'gear' || t === 'mech') { var gp = []; for (var j = 0; j < 16; j++) { var b = j * Math.PI / 8, q = j % 2 ? r * 0.72 : r; gp.push([x + Math.cos(b) * q, y + Math.sin(b) * q]); } poly(pen, gp, col); ell(pen, x, y, r * 0.3, r * 0.3, shade(col, -0.4)); }
    else if (t === 'eye') { ell(pen, x, y, r, r * 0.55, '#f2eedc'); ell(pen, x, y, r * 0.4, r * 0.4, col); }
    else if (t === 'anchor') { stroke(pen, [[x, y - r], [x, y + r]], col, 2); stroke(pen, [[x - r, y + r * 0.3], [x - r * 0.6, y + r], [x, y + r * 0.9], [x + r * 0.6, y + r], [x + r, y + r * 0.3]], col, 2); ell(pen, x, y - r, r * 0.3, r * 0.3, col); }
    else if (t === 'face') { ell(pen, x, y, r * 0.8, r, shade(c.main, 0.25)); stroke(pen, [[x - r * 0.45, y - r * 0.15], [x - r * 0.15, y - r * 0.15]], OUTLINE, 1); stroke(pen, [[x + r * 0.15, y - r * 0.15], [x + r * 0.45, y - r * 0.15]], OUTLINE, 1); stroke(pen, [[x - r * 0.35, y + r * 0.5], [x + r * 0.35, y + r * 0.5]], OUTLINE, 1); }
    else if (t === 'book') { rect(pen, x - r * 0.8, y - r, r * 1.6, r * 2, shade(col, -0.2)); stroke(pen, [[x, y - r], [x, y + r]], OUTLINE, 1); }
    else if (t === 'crack') { stroke(pen, [[x - r, y - r], [x - r * 0.2, y - r * 0.1], [x - r * 0.5, y + r * 0.3], [x + r * 0.4, y + r]], OUTLINE, 1); }
    else if (t === 'signal') { ell(pen, x, y - r * 0.5, r * 0.45, r * 0.45, '#e5523d'); ell(pen, x, y + r * 0.5, r * 0.45, r * 0.45, '#4fc764'); }
    else if (t === 'wave' || t === 'circuit' || t === 'rune') { stroke(pen, [[x - r, y], [x - r * 0.5, y - r * 0.6, x, y], [x + r * 0.5, y + r * 0.6, x + r, y]], t === 'circuit' ? '#58e0e8' : col, 2); }
    else if (t === 'ice') { poly(pen, [[x, y - r], [x + r * 0.5, y], [x, y + r], [x - r * 0.5, y]], '#bfe8ff'); }
    else if (t === 'fang' || t === 'dragon') { poly(pen, [[x - r, y - r * 0.5], [x - r * 0.4, y + r], [x, y - r * 0.2], [x + r * 0.4, y + r], [x + r, y - r * 0.5]], '#f1ead6'); }
    else if (t === 'diamond') { poly(pen, [[x, y - r], [x + r * 0.7, y], [x, y + r], [x - r * 0.7, y]], col); }
    else if (t === 'chain') { for (var k = -1; k <= 1; k++) ell(pen, x + k * r * 0.7, y, r * 0.4, r * 0.28, '#9aa0aa'); }
    else { rect(pen, x - r * 0.22, y - r, r * 0.44, r * 2, col); rect(pen, x - r * 0.75, y - r * 0.35, r * 1.5, r * 0.44, col); }   // 十字
    void g;
  }

  /* ---------- 武器（握りが原点、刃・先は上（-y）。u＝基準の剣の長さ ÷ 100） ---------- */
  var HOLD = { spear: 'pole', staff: 'pole', bow: 'bow', claw: 'fist' };
  function weaponPainter(pen, layer, u, down) {
    var DN = down != null && down > 0 ? down : 40;   // 長柄（槍・杖・棍）の、握りより下の長さ（u）。手の位置が高い人物は床の近くまで
    var c = pen.c, s = layer.sub, sh = layer.shape; var blade = metal(c), grip = lum(c.dark) < 110 ? c.dark : shade(c.main, -0.5), gold = goldOr(c);
    if (s === 'wood') blade = sat(c.main) > 0.2 ? c.main : '#b97a3c';
    function bladePts(w, L, tip) { return [[-w / 2 * u, -8 * u], [w / 2 * u, -8 * u], [w / 2 * u, -(L - tip) * u], [0, -L * u], [-w / 2 * u, -(L - tip) * u]]; }
    if (sh === 'sword') {
      var L = s === 'greatsword' ? 122 : 100, W = s === 'greatsword' ? 14 : 9;
      rect(pen, -2.6 * u, -6 * u, 5.2 * u, 18 * u, grip); ell(pen, 0, 14 * u, 4 * u, 4 * u, gold);
      if (s === 'saber') { path(pen, [[-4 * u, -8 * u], [4 * u, -8 * u], [10 * u, -60 * u, -2 * u, -100 * u], [-6 * u, -60 * u, -4 * u, -8 * u]]); fillOut(pen, blade); }
      else if (s === 'forked') { poly(pen, [[-5 * u, -8 * u], [5 * u, -8 * u], [5 * u, -82 * u], [9 * u, -100 * u], [2 * u, -86 * u], [-2 * u, -86 * u], [-9 * u, -100 * u], [-5 * u, -82 * u]], blade); }
      else { poly(pen, bladePts(W, L, 12), blade); stroke(pen, [[0, -12 * u], [0, -(L - 16) * u]], shade(blade, -0.25), 1); }
      if (s === 'saber') { path(pen, [[-9 * u, -9 * u], [9 * u, -9 * u], [12 * u, -2 * u, 4 * u, 6 * u], [-9 * u, -3 * u]]); fillOut(pen, gold); }
      else rect(pen, -(W + 8) * u, -10 * u, (W + 8) * 2 * u, 5 * u, gold);
      if (has(layer, 'gem') || has(layer, 'holy') || layer.boss) gem(pen, 0, -7.5 * u, 3 * u, sat(c.acc) > 0.3 ? c.acc : '#6fd0ff');
      if (has(layer, 'wave')) stroke(pen, [[-2 * u, -30 * u], [2 * u, -40 * u], [-2 * u, -50 * u], [2 * u, -60 * u]], c.acc, 1);
      return;
    }
    if (sh === 'dagger') {
      var dl = s === 'knife' ? 44 : 50; rect(pen, -2.2 * u, -4 * u, 4.4 * u, 14 * u, grip);
      if (s === 'knife') poly(pen, [[-3 * u, -6 * u], [4 * u, -6 * u], [4 * u, -(dl - 10) * u], [-3 * u, -dl * u]], blade);
      else poly(pen, [[-3.6 * u, -6 * u], [3.6 * u, -6 * u], [2.6 * u, -(dl - 8) * u], [0, -dl * u], [-2.6 * u, -(dl - 8) * u]], has(layer, 'twotone') ? shade(blade, -0.3) : blade);
      if (has(layer, 'twotone')) poly(pen, [[0, -6 * u], [3.6 * u, -6 * u], [2.6 * u, -(dl - 8) * u], [0, -dl * u]], blade);
      rect(pen, -8 * u, -8 * u, 16 * u, 4 * u, gold); if (has(layer, 'gem') || layer.boss) gem(pen, 0, -6 * u, 2.6 * u, c.acc);
      return;
    }
    if (sh === 'spear') {
      var top = -118; rect(pen, -2.2 * u, top * u, 4.4 * u, (DN - top) * u, grip);
      if (s === 'halberd') { poly(pen, [[2 * u, (top + 4) * u], [18 * u, (top - 2) * u], [20 * u, (top + 18) * u], [2 * u, (top + 22) * u]], blade); poly(pen, [[-2 * u, (top + 8) * u], [-10 * u, (top + 12) * u], [-2 * u, (top + 16) * u]], blade); }
      if (s === 'trident') { poly(pen, [[-11 * u, (top + 2) * u], [11 * u, (top + 2) * u], [11 * u, (top - 16) * u], [8 * u, (top - 6) * u], [3 * u, (top - 6) * u], [3 * u, (top - 26) * u], [0, (top - 32) * u], [-3 * u, (top - 26) * u], [-3 * u, (top - 6) * u], [-8 * u, (top - 6) * u], [-11 * u, (top - 16) * u]], has(layer, 'coral') ? '#e8735f' : blade); }
      else if (s === 'clockhand') { poly(pen, [[0, (top - 30) * u], [9 * u, (top - 4) * u], [0, (top + 6) * u], [-9 * u, (top - 4) * u]], blade); ell(pen, 0, (top + 14) * u, 6 * u, 6 * u, gold); }
      else if (s === 'umbrella') { poly(pen, [[0, (top - 26) * u], [12 * u, (top + 24) * u], [4 * u, (top + 20) * u], [0, (top + 26) * u], [-4 * u, (top + 20) * u], [-12 * u, (top + 24) * u]], c.main); }
      else { poly(pen, [[0, (top - 30) * u], [7 * u, (top - 12) * u], [3 * u, (top + 2) * u], [-3 * u, (top + 2) * u], [-7 * u, (top - 12) * u]], blade); }
      if (s === 'banner') { poly(pen, [[2 * u, (top + 6) * u], [30 * u, (top + 10) * u], [24 * u, (top + 20) * u], [30 * u, (top + 30) * u], [2 * u, (top + 28) * u]], c.main); emblem(pen, layer, 14 * u, (top + 18) * u, 5 * u); }
      rect(pen, -4 * u, (top + 2) * u, 8 * u, 4 * u, gold);
      if (has(layer, 'wing')) { poly(pen, [[-4 * u, (top + 8) * u], [-18 * u, (top - 2) * u], [-12 * u, (top + 12) * u]], '#f4f2ea'); poly(pen, [[4 * u, (top + 8) * u], [18 * u, (top - 2) * u], [12 * u, (top + 12) * u]], '#f4f2ea'); }
      return;
    }
    if (sh === 'axe') {
      var H = s === 'handaxe' ? 58 : 84; rect(pen, -2.4 * u, -(H + 4) * u, 4.8 * u, (H + 14) * u, grip);
      var bw = s === 'handaxe' ? 18 : 24;
      poly(pen, [[2 * u, -(H - 2) * u], [bw * u, -(H + 8) * u], [(bw + 4) * u, -(H - 14) * u], [bw * u, -(H - 30) * u], [2 * u, -(H - 22) * u]], blade);
      if (s === 'battleaxe') poly(pen, [[-2 * u, -(H - 2) * u], [-bw * u, -(H + 8) * u], [-(bw + 4) * u, -(H - 14) * u], [-bw * u, -(H - 30) * u], [-2 * u, -(H - 22) * u]], blade);
      else poly(pen, [[-2 * u, -(H - 6) * u], [-9 * u, -(H - 12) * u], [-2 * u, -(H - 18) * u]], blade);
      if (has(layer, 'chain')) emblem(pen, { deco: ['chain'], motif: 0 }, 0, -(H - 40) * u, 5 * u);
      if (has(layer, 'gem') || layer.boss) gem(pen, 0, -(H - 12) * u, 3 * u, c.acc);
      return;
    }
    if (sh === 'bow') {
      var R = s === 'longbow' ? 88 : s === 'shortbow' ? 54 : 70, bulge = s === 'longbow' ? 18 : 22;
      var wood = sat(c.main) > 0.15 || lum(c.main) < 150 ? c.main : '#8a5a33';
      stroke(pen, [[-2 * u, -R * u], [-2 * u, R * u]], '#e8e2d0', 1);   // 弦
      path(pen, [[-3 * u, -R * u], [bulge * 1.6 * u, -R * 0.35 * u, bulge * u, 0], [bulge * 1.6 * u, R * 0.35 * u, -3 * u, R * u], [0, R * u], [bulge * 1.6 * u - 6 * u, R * 0.35 * u, bulge * u - 5 * u, 0], [bulge * 1.6 * u - 6 * u, -R * 0.35 * u, 0, -R * u]]); fillOut(pen, wood);
      rect(pen, (bulge - 8) * u, -6 * u, 6 * u, 12 * u, c.dark);
      if (s === 'mechbow') { ell(pen, 0, -R * u, 4 * u, 4 * u, gold); ell(pen, 0, R * u, 4 * u, 4 * u, gold); rect(pen, (bulge - 12) * u, -2 * u, 14 * u, 4 * u, metal(c)); }
      if (has(layer, 'eye')) emblem(pen, { deco: ['eye'], motif: 0 }, bulge * u, -22 * u, 4 * u);
      return;
    }
    if (sh === 'staff') {
      var tp = -112; rect(pen, -2.4 * u, tp * u, 4.8 * u, (DN - tp) * u, s === 'wood' ? '#7a4b28' : (lum(c.dark) < 120 ? c.dark : '#6b4a2e'));
      if (s === 'wood') { ell(pen, 0, (tp - 4) * u, 7 * u, 8 * u, '#8f5c32'); poly(pen, [[2 * u, (tp + 10) * u], [10 * u, (tp + 2) * u], [6 * u, (tp + 14) * u]], '#5f9f45'); return; }
      if (s === 'book') { rect(pen, -12 * u, (tp - 22) * u, 24 * u, 22 * u, c.main); rect(pen, -10 * u, (tp - 20) * u, 20 * u, 3 * u, '#efe6cf'); emblem(pen, layer, 0, (tp - 10) * u, 5 * u); return; }
      if (s === 'tablet') { poly(pen, [[-11 * u, (tp - 2) * u], [-9 * u, (tp - 28) * u], [9 * u, (tp - 30) * u], [11 * u, (tp - 2) * u]], '#8b8a86'); stroke(pen, [[-5 * u, (tp - 20) * u], [5 * u, (tp - 22) * u]], has(layer, 'ember') ? '#ff8a3d' : OUTLINE, 1); return; }
      if (s === 'key') { ell(pen, 0, (tp - 10) * u, 9 * u, 9 * u, gold); ell(pen, 0, (tp - 10) * u, 4 * u, 4 * u, '#2a2a3a'); rect(pen, 2 * u, (tp + 8) * u, 9 * u, 4 * u, gold); return; }
      path(pen, [[-9 * u, (tp + 2) * u], [-12 * u, (tp - 14) * u, -4 * u, (tp - 24) * u], [0, (tp - 18) * u], [4 * u, (tp - 24) * u], [12 * u, (tp - 14) * u, 9 * u, (tp + 2) * u], [0, (tp - 6) * u]]); fillOut(pen, gold);
      if (s === 'crystal') poly(pen, [[0, (tp - 34) * u], [7 * u, (tp - 16) * u], [0, (tp - 4) * u], [-7 * u, (tp - 16) * u]], sat(c.acc) > 0.2 ? c.acc : '#9fe3ff');
      else gem(pen, 0, (tp - 14) * u, 7 * u, sat(c.acc) > 0.25 ? c.acc : '#58b7ff');
      if (has(layer, 'ring')) { pen.g.beginPath(); pen.g.ellipse(0, (tp - 14) * u, 13 * u, 5 * u, 0, 0, Math.PI * 2); pen.g.lineWidth = pen.px; pen.g.strokeStyle = gold; pen.g.stroke(); }
      return;
    }
    if (sh === 'club') {
      var ch = s === 'rod' ? 96 : 74; rect(pen, -2.6 * u, -ch * u, 5.2 * u, (ch + (s === 'rod' ? Math.min(DN, 60) : 12)) * u, s === 'rod' ? metal(c) : grip);
      if (s === 'mace') { var mp = []; for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6, r = i % 2 ? 7 : 11; mp.push([Math.cos(a) * r * u, -(ch + 2) * u + Math.sin(a) * r * u]); } poly(pen, mp, blade); }
      else if (s === 'hammer') rect(pen, -14 * u, -(ch + 10) * u, 28 * u, 15 * u, blade);
      else if (s === 'kine') { rect(pen, -17 * u, -(ch + 12) * u, 34 * u, 16 * u, has(layer, 'royal') ? '#e5b43c' : c.main); stroke(pen, [[-17 * u, -(ch + 4) * u], [17 * u, -(ch + 4) * u]], OUTLINE, 1); }
      else if (s === 'club') poly(pen, [[-3 * u, -10 * u], [3 * u, -10 * u], [8 * u, -(ch + 4) * u], [0, -(ch + 10) * u], [-8 * u, -(ch + 4) * u]], sat(c.main) > 0.15 ? c.main : '#8b5a34');
      if (has(layer, 'ember')) ell(pen, 0, -(ch + 2) * u, 4 * u, 3 * u, '#ff8a3d');
      return;
    }
    if (sh === 'claw') {
      if (s === 'gauntlet') { ell(pen, 0, 0, 10 * u, 9 * u, metal(c)); rect(pen, -8 * u, 4 * u, 16 * u, 8 * u, c.main); poly(pen, [[-8 * u, -6 * u], [-4 * u, -12 * u], [0, -7 * u], [4 * u, -12 * u], [8 * u, -6 * u]], metal(c)); return; }
      rect(pen, -9 * u, -4 * u, 18 * u, 8 * u, c.main);
      for (var k = -1; k <= 1; k++) poly(pen, [[(k * 6 - 2) * u, -4 * u], [(k * 6 + 2) * u, -4 * u], [(k * 8 + 1) * u, -34 * u], [(k * 8 - 1) * u, -36 * u]], blade);
      return;
    }
    var g = pen.g; g.save(); g.scale(u * 2, u * 2); var p2 = new Path2D(paths[sh] || paths.sword); g.fillStyle = c.main; g.fill(p2); g.restore();
  }

  /* ---------- 盾（中心が原点。u＝基準の盾の高さ ÷ 100） ---------- */
  function shieldPainter(pen, layer, u, back) {
    var c = pen.c, s = layer.sub, gold = goldOr(c), face = c.main, rim = lum(c.light) > 120 ? c.light : gold;
    if (s === 'barrier') { var hp = []; for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; hp.push([Math.cos(a) * 44 * u, Math.sin(a) * 50 * u]); } pen.g.globalAlpha = 0.62; poly(pen, hp, sat(c.acc) > 0.2 ? c.acc : '#7fd8ff'); pen.g.globalAlpha = 1; return; }
    var outline;
    if (s === 'round' || s === 'buckler') { var r = s === 'buckler' ? 32 : 44; ell(pen, 0, 0, r * u, r * u, back ? shade(face, -0.35) : rim); if (!back) { ell(pen, 0, 0, (r - 6) * u, (r - 6) * u, face); ell(pen, 0, 0, 8 * u, 8 * u, gold); if (s === 'round' && layer.deco.length) emblem(pen, layer, 0, 0, 12 * u); } else { rect(pen, -r * 0.7 * u, -5 * u, r * 1.4 * u, 6 * u, c.dark); } return; }
    if (s === 'tower') outline = [[-36, -56], [0, -62], [36, -56], [34, 54], [0, 62], [-34, 54]];
    else outline = [[-38, -46], [38, -46], [38, -8], [26, 26, 0, 50], [-26, 26, -38, -8]];
    var sc = function (pts, k) { return pts.map(function (p) { return p.map(function (v) { return v * u * k; }); }); };
    poly(pen, sc(outline, 1), back ? shade(face, -0.4) : rim);
    if (back) { rect(pen, -26 * u, -14 * u, 52 * u, 7 * u, c.dark); rect(pen, -26 * u, 10 * u, 52 * u, 7 * u, c.dark); return; }
    path(pen, sc(outline, 0.84)); fillOut(pen, face);
    emblem(pen, layer, 0, s === 'tower' ? -6 * u : -6 * u, (s === 'tower' ? 16 : 14) * u);
  }

  /* ---------- 頭（原点＝頭の中心の眉の高さ。u＝頭の幅 ÷ 100。上が -y） ---------- */
  function headPainter(pen, layer, A) {
    var c = pen.c, s = layer.sub, u = A.w / 100, top = (A.top - A.brow) / u, dir = pen.dir, side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    var metalC = metal(c), gold = goldOr(c), main = c.main;
    function U(pts) { return pts.map(function (p) { return p.map(function (v, i) { return v * u; }); }); }
    if (layer.shape === 'helm') {
      if (s === 'crown' || s === 'circlet') { headBand(pen, layer, A, s === 'crown'); return; }
      var dome = top * 0.9, brim = 4, cheek = (A.chin - A.brow) / u * 0.6;
      var pts = dir === 'back' ? [[-50, cheek * 0.85], [-52, -18], [-46, dome * 0.8, 0, dome], [46, dome * 0.8, 52, -18], [50, cheek * 0.85], [0, cheek * 1.0, -50, cheek * 0.85]]   // 背面：顔の開きのない後ろ姿の兜
        : side === 0 ? [[-50, brim], [-52, -18], [-46, dome * 0.8, 0, dome], [46, dome * 0.8, 52, -18], [50, brim], [50, cheek], [38, cheek], [36, brim + 6], [-36, brim + 6], [-38, cheek], [-50, cheek]]
        : [[-50 * side, cheek + 4], [-52 * side, -18], [-44 * side, dome * 0.82, 6 * side, dome], [48 * side, dome * 0.72, 52 * side, -10], [54 * side, brim + 4], [30 * side, brim + 6], [26 * side, cheek * 0.6], [-20 * side, cheek * 0.9]];
      poly(pen, U(pts), metalC);
      if (dir !== 'back') { stroke(pen, U(side === 0 ? [[-48, -2], [48, -2]] : [[-46 * side, -4], [52 * side, -4]]), gold, 2); stroke(pen, U(side === 0 ? [[0, dome + 4], [0, -6]] : [[10 * side, dome + 4], [16 * side, -6]]), shade(metalC, -0.25), 1); }
      else { stroke(pen, U([[-50, cheek * 0.55], [0, cheek * 0.7, 50, cheek * 0.55]]), gold, 2); stroke(pen, U([[0, dome + 4], [0, cheek * 0.6]]), shade(metalC, -0.25), 1); }
      if (s === 'dragon' || has(layer, 'fang')) { poly(pen, U([[-40, dome * 0.5], [-66, dome * 1.1], [-46, dome * 0.85]]), '#efe7d2'); poly(pen, U([[40, dome * 0.5], [66, dome * 1.1], [46, dome * 0.85]]), '#efe7d2'); }
      else if (layer.motif % 2 === 0 || layer.boss) { poly(pen, U([[-5, dome + 2], [5, dome + 2], [3, dome - 16], [-3, dome - 16]]), sat(c.acc) > 0.25 ? c.acc : '#c8433a'); }
      if (has(layer, 'anchor') || has(layer, 'gauge') || has(layer, 'chain')) emblem(pen, layer, 0, (dome * 0.45) * u, 9 * u);
      return;
    }
    // 帽子
    if (s === 'crown' || s === 'circlet') { headBand(pen, layer, A, s === 'crown'); return; }
    if (s === 'witch') { poly(pen, U([[-72, 2], [-30, -8], [-14, top - 20], [24, top - 46], [16, top - 22], [30, -8], [72, 2], [60, 10], [-60, 10]]), main); stroke(pen, U([[-30, -6], [30, -6]]), gold, 2); return; }
    if (s === 'turban') { ell(pen, 0, (top * 0.45) * u, 56 * u, (-top * 0.62) * u, main); stroke(pen, U([[-50, top * 0.2], [0, top * 0.55], [50, top * 0.1]]), shade(main, -0.3), 1); gem(pen, 0, (top * 0.2) * u, 6 * u, c.acc); return; }
    if (s === 'hood') { poly(pen, U([[-60, 30], [-62, -10], [-50, top * 0.9, 0, top - 4], [50, top * 0.9, 62, -10], [60, 30], [40, 20], [42, -2], [-42, -2], [-40, 20]]), main); return; }
    if (s === 'bicorne') { poly(pen, U([[-80, 0], [-40, top * 0.5], [0, top - 6], [40, top * 0.5], [80, 0], [40, -6], [-40, -6]]), main); stroke(pen, U([[-60, -4], [60, -4]]), gold, 2); poly(pen, U([[10, top * 0.4], [30, top - 22], [22, top * 0.5]]), '#f4f2ea'); return; }
    // 帽子（つば付き）・羽根帽子
    var crownTop = top - 6;
    poly(pen, U([[-46, -2], [-42, crownTop * 0.7], [-30, crownTop, 0, crownTop], [30, crownTop, 42, crownTop * 0.7], [46, -2]]), main);
    poly(pen, U(side === 0 ? [[-74, 2], [-50, -6], [50, -6], [74, 2], [56, 10], [-56, 10]] : [[-60 * side, 0], [-40 * side, -6], [50 * side, -6], [84 * side, 6], [56 * side, 10], [-50 * side, 8]]), shade(main, -0.12));
    stroke(pen, U([[-44, -6], [44, -6]]), c.trim, 2);
    if (s === 'feather' || has(layer, 'feather')) poly(pen, U([[20, crownTop * 0.6], [52, crownTop - 24], [34, crownTop * 0.55]]), sat(c.acc) > 0.2 ? c.acc : '#e9e3d0');
  }
  function headBand(pen, layer, A, crown) {
    var u = A.w / 100, c = pen.c, gold = goldOr(c), y = (A.top - A.brow) * 0.38;
    if (pen.dir === 'back') { stroke(pen, [[-48 * u, y + 2 * u], [48 * u, y + 2 * u]], gold, 3); return; }
    poly(pen, [[-50 * u, y + 4 * u], [50 * u, y + 4 * u], [50 * u, y - 4 * u], [-50 * u, y - 4 * u]], gold);
    if (crown) { for (var i = -2; i <= 2; i++) poly(pen, [[(i * 20 - 7) * u, y - 3 * u], [(i * 20) * u, y - 18 * u], [(i * 20 + 7) * u, y - 3 * u]], gold); }
    gem(pen, (pen.dir === 'left' ? -34 : pen.dir === 'right' ? 34 : 0) * u, y, 5 * u, sat(c.acc) > 0.25 ? c.acc : '#d0424a');
  }

  /* ---------- 胴（体の範囲 T：cx・sy（肩の高さ）・wy（腰）・sw（肩幅）・hw（腰幅）・hem（裾）） ---------- */
  function armorPainter(pen, layer, T, part) {
    var c = pen.c, s = layer.sub, dir = pen.dir, side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, back = dir === 'back';
    var cx = T.cx, sy = T.sy, wy = T.wy, sw = T.sw, hw = T.hw, hem = T.hem, ht = wy - sy;
    var metalC = metal(c), gold = goldOr(c);
    var hs = side === 0 ? sw / 2 : sw / 2 * 0.62, hh = side === 0 ? hw / 2 : hw / 2 * 0.62, ox = side * sw * 0.06;
    if (part === 'behind') {   // 体の後ろに来るもの：マント（正面・横）
      if (s === 'cloak' && !back) { poly(pen, [[cx - hs * 1.05 + ox, sy], [cx + hs * 1.05 + ox, sy], [cx + hs * 1.5 - side * sw * 0.5, hem], [cx - hs * 1.5 - side * sw * 0.5, hem]], c.main); }
      if (s === 'veil') { pen.g.globalAlpha = 0.7; path(pen, [[cx - hs * 1.3, sy + ht * 0.2], [cx, sy - ht * 0.15, cx + hs * 1.3, sy + ht * 0.2], [cx + hs * 1.55, wy + (hem - wy) * 0.3, cx + hs * 1.2, wy + (hem - wy) * 0.55], [cx, wy + (hem - wy) * 0.25, cx - hs * 1.2, wy + (hem - wy) * 0.55], [cx - hs * 1.55, wy + (hem - wy) * 0.3, cx - hs * 1.3, sy + ht * 0.2]]); fillOut(pen, shade(c.light, 0.2)); pen.g.globalAlpha = 1; }   // 肩から背に流れる羽衣
      return;
    }
    if (part === 'pauldron') {
      if (layer.shape !== 'heavy' || s === 'cuirass' || s === 'chain') return;
      var pr = sw * 0.2;
      if (side === 0) { ell(pen, cx - hs * 0.98, sy + pr * 0.45, pr, pr * 0.72, metalC); ell(pen, cx + hs * 0.98, sy + pr * 0.45, pr, pr * 0.72, metalC); stroke(pen, [[cx - hs * 0.98 - pr * 0.8, sy + pr * 0.6], [cx - hs * 0.98 + pr * 0.8, sy + pr * 0.6]], gold, 1); stroke(pen, [[cx + hs * 0.98 - pr * 0.8, sy + pr * 0.6], [cx + hs * 0.98 + pr * 0.8, sy + pr * 0.6]], gold, 1); }
      else ell(pen, cx - side * hs * 0.2, sy + pr * 0.5, pr * 1.05, pr * 0.8, metalC);
      return;
    }
    // 体の前（この層は「体の形 − 顔・手・髪」で切り抜く）
    if (layer.shape === 'robe') {
      var hemW = hw / 2 * (s === 'veil' ? 1.6 : 1.85) * (side === 0 ? 1 : 0.85), hb = (hem - wy) * 0.06;
      path(pen, [[cx - hs * 0.92 + ox, sy - 2], [cx + hs * 0.92 + ox, sy - 2], [cx + hh * 1.0 + ox, wy], [cx + hemW * 0.8 + ox, wy + (hem - wy) * 0.6, cx + hemW + ox, hem], [cx + ox, hem + hb, cx - hemW + ox, hem], [cx - hemW * 0.8 + ox, wy + (hem - wy) * 0.6, cx - hh * 1.0 + ox, wy]]); fillOut(pen, c.main);
      stroke(pen, [[cx - hemW + ox + 2, hem - 3], [cx + hemW + ox - 2, hem - 3]], gold, 2);
      if (!back && side === 0) { stroke(pen, [[cx, sy + 2], [cx, hem - 4]], gold, 2); emblem(pen, layer, cx, sy + ht * 0.45, ht * 0.14); }
      else if (!back) stroke(pen, [[cx + side * hs * 0.6 + ox, sy + 2], [cx + side * hemW * 0.7 + ox, hem - 4]], gold, 2);
      stroke(pen, [[cx - hs * 1.05 + ox, wy], [cx + hs * 1.05 + ox, wy]], c.trim, 2);
      for (var f = -1; f <= 1; f += 2) stroke(pen, [[cx + f * hs * 0.55 + ox, wy + 4], [cx + f * hemW * 0.6 + ox, hem - 6]], shade(c.main, -0.28), 1);   // ひだ
      if (has(layer, 'star')) for (var t = 0; t < 5; t++) ell(pen, cx + ox + (t - 2) * hemW * 0.35, wy + (hem - wy) * (0.3 + 0.12 * (t % 3)), pen.px * 0.7, pen.px * 0.7, '#f5f0c8', 0.001);
      return;
    }
    if (layer.shape === 'light') {
      if (s === 'cloak') {   // 前は留め具と襟だけ。背面はマントが背中を覆う
        if (back) { poly(pen, [[cx - hs * 1.05, sy], [cx + hs * 1.05, sy], [cx + hs * 1.5, hem], [cx - hs * 1.5, hem]], c.main); stroke(pen, [[cx - hs * 1.3, hem - 3], [cx + hs * 1.3, hem - 3]], c.trim, 2); return; }
        poly(pen, [[cx - hs * 0.9 + ox, sy - 3], [cx + hs * 0.9 + ox, sy - 3], [cx + hs * 0.5 + ox, sy + ht * 0.2], [cx - hs * 0.5 + ox, sy + ht * 0.2]], c.main); ell(pen, cx + ox, sy + ht * 0.12, ht * 0.07, ht * 0.07, gold);
        if (has(layer, 'clock')) emblem(pen, layer, cx + ox, sy + ht * 0.12, ht * 0.08);
        return;
      }
      var low = s === 'coat' ? wy + (hem - wy) * 0.6 : s === 'cloth' ? wy + (hem - wy) * 0.15 : wy + 2;
      var col = s === 'ninja' ? shade(c.main, -0.35) : c.main;
      poly(pen, [[cx - hs * 0.98 + ox, sy], [cx + hs * 0.98 + ox, sy], [cx + hh * 1.05 + ox, wy], [cx + hh * (s === 'coat' ? 1.3 : 1.05) + ox, low], [cx - hh * (s === 'coat' ? 1.3 : 1.05) + ox, low], [cx - hh * 1.05 + ox, wy]], col);
      if (!back) { if (s === 'coat') stroke(pen, [[cx + ox, sy + ht * 0.2], [cx + ox, low]], OUTLINE, 1); else if (s === 'leather') { stroke(pen, [[cx - hs * 0.4 + ox, sy + 2], [cx + hh * 0.4 + ox, wy - 2]], c.dark, 2); } }
      stroke(pen, [[cx - hh + ox, wy - 2], [cx + hh + ox, wy - 2]], s === 'ninja' ? '#b03a3a' : c.dark, 3);
      if (!back) ell(pen, cx + ox, wy - 2, ht * 0.06, ht * 0.05, gold);
      return;
    }
    // 重鎧（鉄の板）・鎖・鱗・胸甲
    var body = s === 'chain' ? '#a3a7ae' : metalC;
    path(pen, [[cx - hs * 0.95 + ox, sy], [cx + hs * 0.95 + ox, sy], [cx + hh * 1.08 + ox, wy - ht * 0.12], [cx + ox, wy + ht * 0.08, cx - hh * 1.08 + ox, wy - ht * 0.12]]); fillOut(pen, body);
    var g = pen.g;
    if (s === 'chain' || s === 'scale') { g.save(); path(pen, [[cx - hs * 0.95 + ox, sy], [cx + hs * 0.95 + ox, sy], [cx + hh * 1.08 + ox, wy - ht * 0.12], [cx + ox, wy + ht * 0.08, cx - hh * 1.08 + ox, wy - ht * 0.12]]); g.clip(); var st = Math.max(pen.px * 2, ht * 0.09); for (var y = sy + st; y < wy; y += st) for (var x = cx - hs; x < cx + hs; x += st) { if (s === 'chain') ell(pen, x + ((y / st) % 2) * st / 2, y, st * 0.35, st * 0.3, shade(body, -0.15), 0.6); else { g.beginPath(); g.arc(x + ((Math.round(y / st)) % 2) * st / 2, y, st * 0.55, 0, Math.PI); g.lineWidth = pen.px; g.strokeStyle = shade(c.main, -0.35); g.stroke(); } } g.restore(); }
    if (s !== 'chain') {
      if (!back && side === 0) { stroke(pen, [[cx, sy + 2], [cx, wy - ht * 0.05]], shade(body, -0.25), 1); emblem(pen, layer, cx, sy + ht * 0.42, ht * 0.13); }
      else if (!back) emblem(pen, layer, cx + side * hs * 0.35 + ox, sy + ht * 0.42, ht * 0.11);
      stroke(pen, [[cx - hs * 0.9 + ox, sy + 2], [cx + hs * 0.9 + ox, sy + 2]], gold, 2);
    }
    if (s !== 'cuirass') { for (var k = 0; k < 2; k++) { var yy = wy - ht * 0.05 + k * ht * 0.16; poly(pen, [[cx - hh * 1.0 + ox, yy], [cx + hh * 1.0 + ox, yy], [cx + hh * 0.95 + ox, yy + ht * 0.15], [cx - hh * 0.95 + ox, yy + ht * 0.15]], k ? shade(body, -0.15) : body); } }
    if (has(layer, 'ember') || has(layer, 'circuit') || has(layer, 'crystal')) stroke(pen, [[cx - hs * 0.5 + ox, sy + ht * 0.25], [cx - hs * 0.2 + ox, sy + ht * 0.55], [cx + hs * 0.3 + ox, sy + ht * 0.35]], has(layer, 'ember') ? '#ff7a2e' : has(layer, 'circuit') ? '#58e0e8' : '#b6f0ff', 2);
  }

  /* ---------- 装飾品（名前で決めた形ごとに、着ける場所を変える） ---------- */
  var ACC_PLACE = { ring: 'hand', bracelet: 'wrist', earring: 'ear', glasses: 'eyes', circlet: 'head', anklet: 'foot', chain: 'waist', necklace: 'neck', amulet: 'neck', brooch: 'chest' };
  function accPlace(sub) { return ACC_PLACE[sub] || 'hip'; }
  function accPainter(pen, layer, A, where) {
    var c = pen.c, s = layer.sub, gold = goldOr(c), gemC = sat(c.acc) > 0.25 ? c.acc : '#5fc3ff', u = A.u, x = where[0], y = where[1];
    if (s === 'ring') { ell(pen, x, y, 3.2 * u, 2.2 * u, gold); gem(pen, x, y - 2.2 * u, 1.8 * u, gemC); return; }
    if (s === 'bracelet') { ell(pen, x, y, 6 * u, 3 * u, gold); gem(pen, x, y, 1.6 * u, gemC); return; }
    if (s === 'earring') { stroke(pen, [[x, y], [x, y + 3 * u]], gold, 1); gem(pen, x, y + 5 * u, 2.2 * u, gemC); return; }
    if (s === 'glasses') { var ex = A.eyeGap || 9 * u; if (pen.dir === 'front') { ell(pen, x - ex, y, 4.6 * u, 3.8 * u, 'rgba(190,230,255,0.45)'); ell(pen, x + ex, y, 4.6 * u, 3.8 * u, 'rgba(190,230,255,0.45)'); stroke(pen, [[x - ex + 4.6 * u, y], [x + ex - 4.6 * u, y]], gold, 1); } else { ell(pen, x, y, 4.2 * u, 3.6 * u, 'rgba(190,230,255,0.45)'); } return; }
    if (s === 'anklet') { ell(pen, x, y, 6 * u, 2.4 * u, gold); return; }
    if (s === 'chain') { stroke(pen, [[x - 14 * u, y], [x, y + 6 * u, x + 14 * u, y]], '#b9bec8', 2); return; }
    if (s === 'necklace' || s === 'amulet') {
      if (pen.dir === 'back') { stroke(pen, [[x - 7 * u, y - 2 * u], [x + 7 * u, y - 2 * u]], gold, 1); return; }
      stroke(pen, [[x - 8 * u, y - 5 * u], [x, y + 5 * u, x + 8 * u, y - 5 * u]], gold, 1);
      if (s === 'amulet') { poly(pen, [[x - 3.6 * u, y + 1 * u], [x + 3.6 * u, y + 1 * u], [x + 3.6 * u, y + 9 * u], [x, y + 11 * u], [x - 3.6 * u, y + 9 * u]], c.main); emblem(pen, layer, x, y + 5 * u, 2.2 * u); }
      else gem(pen, x, y + 4 * u, 3 * u, gemC);
      return;
    }
    if (s === 'brooch') { ell(pen, x, y, 4.2 * u, 4.2 * u, gold); emblem(pen, layer, x, y, 3 * u); return; }
    // 腰に下げる小物（羅針盤・懐中時計・天秤・鈴・ランタン・駒・歯車・欠片・誓約書…）
    stroke(pen, [[x, y - 5 * u], [x, y]], '#b9bec8', 1);
    if (s === 'compass' || s === 'watch') { ell(pen, x, y + 5 * u, 5 * u, 5 * u, gold); ell(pen, x, y + 5 * u, 3.4 * u, 3.4 * u, '#f3ecd8', 0.6); stroke(pen, [[x, y + 5 * u], [x + (s === 'watch' ? 2.2 : 0) * u, y + (s === 'watch' ? 5 : 2) * u]], s === 'compass' ? '#d0424a' : OUTLINE, 1); return; }
    if (s === 'bell') { poly(pen, [[x - 4 * u, y + 9 * u], [x - 3 * u, y + 2 * u], [x, y], [x + 3 * u, y + 2 * u], [x + 4 * u, y + 9 * u]], gold); return; }
    if (s === 'lantern') { rect(pen, x - 3.6 * u, y + 1 * u, 7.2 * u, 9 * u, has(layer, 'shadow') ? '#5b4a7a' : '#5a4632'); ell(pen, x, y + 5.5 * u, 2.2 * u, 3 * u, '#ffc85a', 0.5); return; }
    if (s === 'piece') { poly(pen, [[x, y], [x + 4 * u, y + 2 * u], [x + 5 * u, y + 10 * u], [x - 5 * u, y + 10 * u], [x - 4 * u, y + 2 * u]], '#d9b98a'); return; }
    if (s === 'gear') { emblem(pen, { deco: ['gear'], motif: 0 }, x, y + 5 * u, 4.5 * u); return; }
    if (s === 'scale') { stroke(pen, [[x - 5 * u, y + 2 * u], [x + 5 * u, y + 2 * u]], gold, 1); ell(pen, x - 5 * u, y + 6 * u, 2.6 * u, 1.4 * u, gold); ell(pen, x + 5 * u, y + 6 * u, 2.6 * u, 1.4 * u, gold); return; }
    if (s === 'scroll') { rect(pen, x - 4 * u, y + 1 * u, 8 * u, 9 * u, '#efe2c2'); stroke(pen, [[x - 2 * u, y + 4 * u], [x + 2 * u, y + 4 * u]], '#a04a3a', 1); return; }
    if (s === 'filter') { rect(pen, x - 3 * u, y + 1 * u, 6 * u, 9 * u, '#8fb7c9'); return; }
    poly(pen, [[x, y + 1 * u], [x + 4 * u, y + 6 * u], [x, y + 11 * u], [x - 4 * u, y + 6 * u]], gemC);   // 欠片・守り石・そのほか
  }

  /* ---------- 1 つの層を描く（素材キットと同じ呼び方：paint(ctx, layer, anchor, direction)） ---------- */
  // anchor：素材キットの形（x・y・scale・angle・mirror・width・visible）なら、キットの 15 の形で描く（見本用）
  function paint(ctx, layer, anchor, direction) {
    direction = direction || 'front'; if (!anchor || anchor.visible === false) return;
    var x = anchor.x, y = anchor.y, scale = anchor.scale == null ? 1 : anchor.scale, angle = anchor.angle || 0, width = anchor.width == null ? 1 : anchor.width;
    if (![x, y, scale, angle, width].every(Number.isFinite) || scale <= 0 || width <= 0) return;
    var p2 = new Path2D(paths[layer.shape]); ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale * width * (anchor.mirror ? -1 : 1), scale);
    var gr = ctx.createLinearGradient(-20, -22, 21, 28); gr.addColorStop(0, layer.main); gr.addColorStop(1, layer.trim);
    ctx.fillStyle = gr; ctx.strokeStyle = '#222235'; ctx.lineWidth = 2.3; ctx.lineJoin = 'round'; ctx.fill(p2); ctx.stroke(p2); ctx.clip(p2);
    if (direction !== 'back' || layer.slot !== 'acc') { ctx.strokeStyle = layer.main; ctx.lineWidth = 1.4; for (var i = 0; i <= layer.motif; i++) { var yy = i * 5 - 5; ctx.beginPath(); ctx.moveTo(-10, yy); ctx.lineTo(0, yy + 3); ctx.lineTo(10, yy); ctx.stroke(); } }
    ctx.restore();
  }

  /* ---------- 合成 ---------- */
  function mk(w, h) { var c = root.document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  // 層を、絵の 1 ドット（px）の細かさで描く：縮めたキャンバスに描き、半透明のふちをはっきりさせてから、元の大きさに拡大する
  function layerCanvas(W, H, px, draw) {
    var lw = Math.ceil(W / px), lh = Math.ceil(H / px); var c = mk(lw, lh); var g = c.getContext('2d', { willReadFrequently: true }); g.scale(1 / px, 1 / px); g.imageSmoothingEnabled = false;
    draw(g); var d = g.getImageData(0, 0, lw, lh); var a = d.data; for (var i = 3; i < a.length; i += 4) a[i] = a[i] < 96 ? 0 : a[i] > 200 ? 255 : a[i];
    // 陰影：輪郭（暗い線）のすぐ内側で、左上は明るく・右下は暗く。中ほどにも右下へ向けて少し暗く（ドット絵の立体感）
    var src = new Uint8ClampedArray(a); var O = [0x1d, 0x1a, 0x28];
    function edge(x, y) { if (x < 0 || y < 0 || x >= lw || y >= lh) return true; var j = (y * lw + x) * 4; return src[j + 3] === 0 || (Math.abs(src[j] - O[0]) + Math.abs(src[j + 1] - O[1]) + Math.abs(src[j + 2] - O[2]) < 24); }
    for (var y = 0; y < lh; y++) for (var x = 0; x < lw; x++) { var k = (y * lw + x) * 4; if (!src[k + 3] || edge(x, y)) continue; var f = 0;
      if (edge(x - 1, y) || edge(x, y - 1)) f = 0.22; else if (edge(x + 1, y) || edge(x, y + 1)) f = -0.24; else if (edge(x + 2, y) || edge(x, y + 2)) f = -0.1;
      if (f > 0) { a[k] += (255 - a[k]) * f; a[k + 1] += (255 - a[k + 1]) * f; a[k + 2] += (255 - a[k + 2]) * f; } else if (f < 0) { a[k] *= 1 + f; a[k + 1] *= 1 + f; a[k + 2] *= 1 + f; } }
    g.putImageData(d, 0, 0); return c;
  }
  // 低い解像度の層に、切り抜き（allow(x, y)＝描いてよい）をかける
  function clipLayer(c, allow) { var g = c.getContext('2d', { willReadFrequently: true }); var d = g.getImageData(0, 0, c.width, c.height); var a = d.data; for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) { var i = (y * c.width + x) * 4; if (a[i + 3] && !allow(x, y)) a[i + 3] = 0; } g.putImageData(d, 0, 0); return c; }
  // 胴の層に、本人の元の絵の明暗（ひだ・腕の輪郭・陰）をのせる。明るさは、その層の下の元の絵の平均との比（明るい服・暗い服でも同じ強さ）
  function shadeByBase(c, M, amt) {
    var g = c.getContext('2d', { willReadFrequently: true }); var d = g.getImageData(0, 0, c.width, c.height); var a = d.data; var sum = 0, n = 0, x, y, i;
    for (y = 0; y < c.height; y++) for (x = 0; x < c.width; x++) { i = y * M.lw + x; if (a[(y * c.width + x) * 4 + 3] && M.sil[i]) { sum += M.lum[i]; n++; } }
    if (!n) return c; var mean = Math.max(40, sum / n);
    for (y = 0; y < c.height; y++) for (x = 0; x < c.width; x++) { var j = (y * c.width + x) * 4; i = y * M.lw + x; if (!a[j + 3] || !M.sil[i]) continue;
      var k = 1 + (M.lum[i] - mean) / mean * 0.75; k = Math.max(0.38, Math.min(1.3, k)); k = 1 + (k - 1) * amt;
      a[j] = Math.min(255, a[j] * k); a[j + 1] = Math.min(255, a[j + 1] * k); a[j + 2] = Math.min(255, a[j + 2] * k); }
    g.putImageData(d, 0, 0); return c;
  }
  function put(out, c, W, H) { var g = out.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, c.width, c.height, 0, 0, c.width * (W / c.width), c.height * (H / c.height)); }
  // 素体のマスク（低い解像度）：face（顔・素肌）・hair（髪）・hand（握る手）・sil（素体の体の形）
  function maskInfo(view, base, maskImg, px) {
    var W = base.naturalWidth || base.width, H = base.naturalHeight || base.height, lw = Math.ceil(W / px), lh = Math.ceil(H / px);
    function read(img) { var c = mk(lw, lh); var g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, W, H, 0, 0, lw, lh); return g.getImageData(0, 0, lw, lh).data; }
    var b = read(base), m = maskImg ? read(maskImg) : null; var n = lw * lh; var face = new Uint8Array(n), hair = new Uint8Array(n), sil = new Uint8Array(n), hand = new Uint8Array(n);
    var lu = new Float32Array(n);
    for (var i = 0; i < n; i++) { lu[i] = b[i * 4] * 0.299 + b[i * 4 + 1] * 0.587 + b[i * 4 + 2] * 0.114; sil[i] = b[i * 4 + 3] > 40 ? 1 : 0; if (m) { face[i] = m[i * 4] > 127 ? 1 : 0; hair[i] = m[i * 4 + 1] > 127 ? 1 : 0; hand[i] = m[i * 4 + 2] > 127 ? 1 : 0; } }
    var dil = new Uint8Array(n); for (var y = 0; y < lh; y++) for (var x = 0; x < lw; x++) { var on = 0; for (var dy = -1; dy <= 1 && !on; dy++) for (var dx = -1; dx <= 1; dx++) { var X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < lw && Y < lh && sil[Y * lw + X]) { on = 1; break; } } dil[y * lw + x] = on; }
    return { lw: lw, lh: lh, face: face, hair: hair, hand: hand, sil: sil, dil: dil, lum: lu };
  }
  // 握っている手（hand）だけの絵：武器の上に描き直して、指の下を通っているように見せる
  function handCanvas(base, M, px) { var W = base.naturalWidth || base.width, H = base.naturalHeight || base.height; var c = mk(W, H); var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(base, 0, 0); var d = g.getImageData(0, 0, W, H); var a = d.data; for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var li = ((y / px) | 0) * M.lw + ((x / px) | 0); if (!M.hand[li]) a[(y * W + x) * 4 + 3] = 0; } g.putImageData(d, 0, 0); return c; }

  // 素材キットと同じ呼び方：compose(base, layers, anchors, direction)。anchors が位置の表（EQUIP_ANCHORS の 1 向き）なら、本人の体に合わせて描く
  function compose(base, layers, anchors, direction, opts) {
    direction = direction || 'front'; opts = opts || {};
    var W = base.naturalWidth || base.width, H = base.naturalHeight || base.height; var canvas = mk(W, H); var ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    if (!anchors || !anchors.grip && !anchors.torso) {   // 素材キットの形（見本の確認用キャラ）
      var draw0 = function (layer) { paint(ctx, layer, anchors[layer.slot] || anchors[anchorNames[layer.slot]], direction); };
      layers.filter(function (l) { var a = anchors[l.slot] || anchors[anchorNames[l.slot]]; return a && a.behind; }).forEach(draw0);
      ctx.drawImage(base, 0, 0);
      ['armor', 'acc', 'head', 'shield', 'weapon'].forEach(function (slot) { layers.filter(function (l) { var a = anchors[l.slot] || anchors[anchorNames[l.slot]]; return l.slot === slot && !(a && a.behind); }).forEach(draw0); });
      return canvas;
    }
    var A = anchors, px = A.px || 2, M = opts.mask || maskInfo(A, base, opts.maskImg || null, px);
    var by = {}; layers.forEach(function (l) { by[l.slot] = l; });
    var head = by.head, armor = by.armor, shield = by.shield, weapon = by.weapon, acc = by.acc;
    var useBase = head && opts.nohat ? opts.nohat : base;
    function L(layer, fn) { return layerCanvas(W, H, px, function (g) { fn(P(g, px, layer.pal, direction)); }); }
    function glow(c, layer) { if (!layer.boss) return c; var gc = mk(c.width, c.height); var g = gc.getContext('2d'); var col = sat(layer.pal.acc) > 0.25 ? layer.pal.acc : '#ffe38a'; g.globalAlpha = 0.5; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (o) { g.drawImage(c, o[0], o[1]); }); g.globalCompositeOperation = 'source-in'; g.globalAlpha = 1; g.fillStyle = col; g.fillRect(0, 0, gc.width, gc.height); g.globalCompositeOperation = 'source-over'; g.drawImage(c, 0, 0); return gc; }
    // 武器と盾の位置（握り・盾の中心）。向きごとに「体の後ろ」かどうかは位置の表（behind）
    function drawWeapon(layer, at, mirror) {
      var u = at.len / 100, hold = HOLD[layer.shape] || 'blade';
      var ang = hold === 'bow' ? (at.bowA != null ? at.bowA : 0) : hold === 'pole' ? (at.poleA != null ? at.poleA : at.a * 0.4) : hold === 'fist' ? (at.fistA != null ? at.fistA : at.a) : at.a;
      var flip = (mirror ? -1 : 1) * (at.flip ? -1 : 1);
      var c = L(layer, function (pen) { var g = pen.g; g.translate(at.x, at.y); g.rotate(ang); g.scale(flip, 1); weaponPainter(pen, layer, u, at.down ? at.down / u : null); });
      return glow(c, layer);
    }
    function drawShield(layer, at, back) { var u = at.h / 100 * (layer.sub === 'tower' ? 1.08 : layer.sub === 'buckler' ? 0.8 : 1); var c = L(layer, function (pen) { var g = pen.g; g.translate(at.x, at.y); g.rotate(at.a || 0); g.scale(at.sx || 1, 1); shieldPainter(pen, layer, u, back); }); return glow(c, layer); }
    var hc = null; function hands() { if (!hc) hc = handCanvas(useBase, M, px); return hc; }
    var gp = A.grip, of = A.off, twin = weapon && (weapon.sub === 'twin' || weapon.sub === 'twinclaw') && !shield && of && of.hand;
    var behind = function (at) { return at && at.behind; };
    // 1) 体の後ろ：マント・羽衣、背中側の盾・武器
    if (armor && A.torso) { var cb = L(armor, function (pen) { armorPainter(pen, armor, A.torso, 'behind'); }); put(canvas, cb, W, H); }
    if (shield && of && behind(of)) put(canvas, drawShield(shield, of, direction === 'back' ? false : true), W, H);
    if (weapon && gp && behind(gp)) put(canvas, drawWeapon(weapon, gp), W, H);
    if (twin && behind(of.hand)) put(canvas, drawWeapon(weapon, of.hand, true), W, H);
    // 2) 素体
    ctx.drawImage(useBase, 0, 0);
    // 3) 胴：体の形（少し広げる）の中だけ。顔・素肌・髪にはかけない。ローブ・コートの裾は体の外にも出す
    if (armor && A.torso) {
      var ca = L(armor, function (pen) { armorPainter(pen, armor, A.torso, 'front'); }); var hemY = A.torso.wy / px;
      var free = armor.shape === 'robe' || armor.sub === 'coat' || armor.sub === 'cloak';
      clipLayer(ca, function (x, y) { var i = y * M.lw + x; if (M.face[i] || M.hair[i] || M.hand[i]) return false; return M.dil[i] || (free && y > hemY); });   // 腰より上は体の形の中、腰より下（裾）は形のまま
      shadeByBase(ca, M, armor.shape === 'heavy' ? 0.8 : 1); put(canvas, ca, W, H);
      var cp = L(armor, function (pen) { armorPainter(pen, armor, A.torso, 'pauldron'); }); clipLayer(cp, function (x, y) { var i = y * M.lw + x; return !(M.face[i] || M.hair[i]); }); put(canvas, cp, W, H);
    }
    // 4) 装飾品（首・胸・腰・足）。背面で見えないもの（首飾り・ブローチ・眼鏡）は描かない
    function accAt(layer) {
      var pl = accPlace(layer.sub), Z = A.acc || {}; var at = Z[pl] || (pl === 'hand' ? (gp && gp.hand !== false ? [gp.x, gp.y] : null) : pl === 'head' ? (A.head ? [A.head.cx, A.head.brow] : null) : null);
      if (!at || at.visible === false) return null; return at;
    }
    if (acc && ['neck', 'chest', 'hip', 'waist', 'foot'].indexOf(accPlace(acc.sub)) >= 0) { var p0 = accAt(acc); if (p0) { var c0 = L(acc, function (pen) { accPainter(pen, acc, { u: (A.acc && A.acc.u) || 1 }, p0); }); clipLayer(c0, function (x, y) { return !M.hair[y * M.lw + x]; }); put(canvas, c0, W, H); } }
    // 5) 頭：顔にはかけない（髪の上にはかぶる）
    if (head && A.head && A.head.visible !== false) { var ch = L(head, function (pen) { var g = pen.g; g.translate(A.head.cx, A.head.brow); if (A.head.a) g.rotate(A.head.a); headPainter(pen, head, A.head); }); clipLayer(ch, function (x, y) { var i = y * M.lw + x; return !M.face[i] || M.hair[i] || y * px < A.head.brow; }); put(canvas, glow(ch, head), W, H); }   // 顔（眉より下の素肌）にはかけない。前髪・眉より上にはかぶる
    if (acc && accPlace(acc.sub) === 'head' && !head && A.head) { var cc = L(acc, function (pen) { var g = pen.g; g.translate(A.head.cx, A.head.brow); headBand(pen, acc, A.head, false); }); clipLayer(cc, function (x, y) { return !M.face[y * M.lw + x]; }); put(canvas, cc, W, H); }
    if (acc && (accPlace(acc.sub) === 'ear' || accPlace(acc.sub) === 'eyes')) { var p1 = accAt(acc); if (p1) put(canvas, L(acc, function (pen) { accPainter(pen, acc, { u: (A.acc && A.acc.u) || 1, eyeGap: A.acc && A.acc.eyeGap }, p1); }), W, H); }
    // 6) 盾（前）・武器（前）→ 握っている手を上に描き直す
    if (shield && of && !behind(of)) put(canvas, drawShield(shield, of, direction === 'back'), W, H);
    if (twin && !behind(of.hand)) put(canvas, drawWeapon(weapon, of.hand, true), W, H);
    if (weapon && gp && !behind(gp)) { put(canvas, drawWeapon(weapon, gp), W, H); if (HOLD[weapon.shape] !== 'fist') ctx.drawImage(hands(), 0, 0); }
    // 7) 手の装飾品（指輪・腕輪）は手の上
    if (acc && (accPlace(acc.sub) === 'hand' || accPlace(acc.sub) === 'wrist')) { var p2 = accAt(acc); if (p2) put(canvas, L(acc, function (pen) { accPainter(pen, acc, { u: (A.acc && A.acc.u) || 1 }, p2); }), W, H); }
    return canvas;
  }

  /* ---------- 実行時：位置の表・素体の読み込み・合成の使い回し ---------- */
  var VIEWS = {};   // url → { state, img, promise }
  var CACHE = new Map(); var CACHE_MAX = 40;   // signature → { canvas, crop }
  var MASKS = new Map();   // viewKey → maskInfo
  var unsupported = {}; var stats = { composed: 0, cacheHit: 0, failed: 0 };
  function base() { var A = root.Assets; return (A && A.base) || ''; }
  // v9.6.1 素体の画像は CORS（crossOrigin = 'anonymous'）で読む。githack・CDN の転送などで画像が「別のサイト扱い」になると、
  //   CORS なしで読んだ画像を描いたキャンバスは「汚れ」て、ピクセルの読み取り（getImageData）も WebGL のテクスチャも禁止される（3D の戦闘が表示できなくなった）
  //   PartyDirections（3D の 4 方向の絵）・readable.js と同じ読み方。読めても汚れているときは使わない（本人の元の絵のまま）
  function clean(im) { try { var c = mk(1, 1); var g = c.getContext('2d'); g.drawImage(im, 0, 0, 1, 1); g.getImageData(0, 0, 1, 1); return true; } catch (e) { return false; } }
  function loadImg(url) {
    var e = VIEWS[url]; if (e) return e;
    e = VIEWS[url] = { state: 'loading', img: null };
    e.promise = new Promise(function (ok) { var im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
      im.onload = function () { if (clean(im)) { e.state = 'ok'; e.img = im; } else { e.state = 'error'; e.why = '画像が別のサイト扱いで読み取れない'; } ok(e); };
      im.onerror = function () { e.state = 'error'; e.why = '読み込みの失敗（404・通信・CORS）'; ok(e); }; im.src = base() + url; });
    return e;
  }
  function anchorsOf(actorId, viewKey) { var T = root.EQUIP_ANCHORS; var a = T && T.actors && own(T.actors, actorId) ? T.actors[actorId] : null; if (!a) return null; var v = own(a.views, viewKey) ? a.views[viewKey] : null; if (!v) return null; return { actor: a, view: v }; }
  // メニューで使う向き：主人公は職業の立ち絵（その職業の素体があれば）、仲間は正面
  function menuView(actor) {
    if (!actor) return null;
    if (MODE === 'pixel') {   // v9.7 主人公：職業の立ち絵に部品があればそれ。なければ menuBase（本人の戦士の立ち絵）を素体にして着替える
      if (actor.id !== 'hero' || !actor.job) return 'front';
      var M = PX(); var mb = M && M.actors && M.actors.hero && M.actors.hero.menuBase;
      return pixelView('hero', 'job:' + actor.job) ? 'job:' + actor.job : (mb && pixelView('hero', mb) ? mb : 'job:' + actor.job);
    } if (actor.id === 'hero' && actor.job && anchorsOf('hero', 'job:' + actor.job)) return 'job:' + actor.job; return 'front'; }
  function note(actorId, viewKey, why) { var k = actorId + '/' + viewKey; if (!unsupported[k]) { unsupported[k] = why; try { console.info('[装備の外見] 本人の元の絵で表示：' + k + '（' + why + '）'); } catch (e) { } } }
  function supports(actor, viewKey) { if (!actor) return false; return MODE === 'pixel' ? !!pixelView(actor.id, viewKey) : !!anchorsOf(actor.id, viewKey); }
  // 位置の表を p ドットずらす（まわりに余白を足した画像に合わせる）
  var POS = { x: 1, y: 1, cx: 1, top: 1, brow: 1, chin: 1, sy: 1, wy: 1, hem: 1 };
  function shiftAnchors(o, p, inAcc) {
    if (Array.isArray(o)) return o.length === 2 && typeof o[0] === 'number' && inAcc ? [o[0] + p, o[1] + p] : o.map(function (v) { return shiftAnchors(v, p, inAcc); });
    if (!o || typeof o !== 'object') return o; var r = {};
    Object.keys(o).forEach(function (k) { var v = o[k]; r[k] = typeof v === 'number' && POS[k] ? v + p : shiftAnchors(v, p, inAcc || k === 'acc'); });
    return r;
  }
  // 画像のまわりに余白（p）を足したキャンバス（長い武器の先が絵の外に出ても切れないように）
  function padded(e, p) { var k = 'pad' + p; if (e[k]) return e[k]; var im = e.img, W = im.naturalWidth || im.width, H = im.naturalHeight || im.height; var c = mk(W + 2 * p, H + 2 * p); var g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, p, p); e[k] = c; return c; }
  var PAD = 48;   // 元の絵のまわりに足す余白（ドット）。戦闘では基準点（pivot）を同じだけずらす
  // 同期で調べる（戦闘の毎フレームの確認用）：{ state: 'none'|'loading'|'ok'|'error', canvas, sig, pad }。読み込みが要るなら始める。作るのは組み合わせが変わったときだけ
  // 失敗しても投げない（3D の戦闘・メニューを止めない）。読めない・作れないときは state: 'error'（呼び出し側は本人の元の絵）
  function request(actor, viewKey, opts) {
    try { return MODE === 'pixel' ? pixelRequest(actor, viewKey, opts || {}) : request0(actor, viewKey, opts); }
    catch (e) { stats.failed++; if (actor) note(actor.id, viewKey, '合成の失敗：' + String((e && e.message) || e).slice(0, 80)); return { state: 'error' }; }
  }
  function request0(actor, viewKey, opts) {
    opts = opts || {}; var r = anchorsOf(actor && actor.id, viewKey); if (!r) { if (actor) note(actor.id, viewKey, '位置の表・素体がない'); return { state: 'none' }; }
    var eqActor = opts.equip ? { id: actor.id, job: actor.job, equip: opts.equip } : actor;
    var layers = resolve(eqActor); var sig = signature(eqActor, layers, r.view.base, viewKey);
    var hit = CACHE.get(sig); if (hit) { stats.cacheHit++; CACHE.delete(sig); CACHE.set(sig, hit); return { state: 'ok', canvas: hit.canvas, sig: sig, layers: layers, view: r.view, pad: PAD, body: hit.body }; }
    var b = loadImg(r.view.base), m = r.view.mask ? loadImg(r.view.mask) : null, nh = r.view.nohat && layers.some(function (l) { return l.slot === 'head'; }) ? loadImg(r.view.nohat) : null;
    var parts = [b, m, nh].filter(Boolean);
    if (parts.some(function (e) { return e.state === 'error'; })) { stats.failed++; note(actor.id, viewKey, '素体を使えない：' + (parts.filter(function (e) { return e.state === 'error'; })[0].why || '読み込みの失敗')); return { state: 'error', sig: sig }; }
    if (parts.some(function (e) { return e.state !== 'ok'; })) return { state: 'loading', sig: sig, promise: Promise.all(parts.map(function (e) { return e.promise; })) };
    var px = r.view.a.px || r.actor.px || 2;
    var pb = padded(b, PAD), pm = m ? padded(m, PAD) : null, pn = nh ? padded(nh, PAD) : null;
    var mk2 = r.view.base + '|' + (m ? 'm' : ''); var M = MASKS.get(mk2); if (!M) { M = maskInfo(null, pb, pm, px); MASKS.set(mk2, M); }
    var A = shiftAnchors(Object.assign({ px: px }, r.view.a), PAD);
    var canvas; try { canvas = compose(pb, layers, A, r.view.dir || viewKey, { mask: M, nohat: pn }); } catch (e) { stats.failed++; note(actor.id, viewKey, '合成の失敗：' + String(e && e.message || e).slice(0, 60)); return { state: 'error', sig: sig }; }
    var body = opaqueBox(pb);   // 装備のない素体の範囲（メニューで人物の大きさをそろえるため）
    stats.composed++; CACHE.set(sig, { canvas: canvas, body: body }); while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    return { state: 'ok', canvas: canvas, sig: sig, layers: layers, view: r.view, pad: PAD, body: body };
  }

  /* ---------- v9.7 ドット絵の差分（試作は主人公の「メニューの戦士の立ち絵」と「戦闘の背面」）----------
     人物・向きごとに、元の絵から作った部品（js/data/equip-pixels.js・assets/characters/equip-pixels/）を重ねる
       素の絵（剣・盾を外して手と体を描き直したもの。兜・帽子のときは、はみ出す髪を消したもの）→ 胴 → 頭 → 盾 → 武器 →（長柄なら）握る手
       色を変える部分は灰色の層：品の色（装備の絵の色。EQUIP_APPEARANCE_DATA）から作った 5 段の色で塗る。灰色の品（鉄・鋼）は元の鎧の板金の色
     部品のない人物・向き・装備の形（斧・弓・短剣・小さな帽子など）は、本人の従来の絵（武器・盾を持った元の絵）で表示し、理由を unsupported に記録
     装飾品は描かない（試作の対象外。記録だけ）
     画像の大きさ・足もとの基準点は元の絵と同じ。まわりに余白（pad）を足して、長い槍・杖・帽子の先が切れないようにする（人物の大きさ・立ち位置は変えない） */
  var MODE = 'pixel';   // 'pixel'（v9.7）／'vector'（v9.6 の描き足し。開発の見比べ用：setMode('vector')）
  function PX() { return root.EQUIP_PIXELS || null; }
  function pixelView(actorId, viewKey) { var M = PX(); var a = M && M.actors && own(M.actors, actorId) ? M.actors[actorId] : null; return a && a.views && own(a.views, viewKey) ? a.views[viewKey] : null; }
  // 装備（resolve の 1 枠）→ 部品の種類（armor_light・head_helm・weapon_staff…）。表にない形は null
  function pixelClass(layer) {
    var M = PX(); if (!M || !layer) return null; var c = M.classes && M.classes[layer.slot]; if (!c) return null;
    if (layer.slot === 'head' && layer.shape === 'hat') return own(c, 'hat:' + layer.sub) ? c['hat:' + layer.sub] : null;
    return own(c, layer.shape) ? c[layer.shape] : null;
  }
  function materialFor(view, cls) {
    var M = PX(); var m = cls && M.materials && own(M.materials, cls) ? M.materials[cls] : null; if (!m) return null;
    var ok = m.layers.every(function (L) { return L.optional || own(view.parts, L.part); }) && (!m.base || own(view.parts, m.base)) && (!m.hand || own(view.parts, 'hand'));
    return ok ? m : null;
  }
  var PIX_SLOTS = ['armor', 'head', 'shield', 'weapon', 'acc'];
  // 装備 → 重ね方 { ok, base, mats[{cls, m, layer}], skipped[] } ／ { ok: false, why }
  function pixelPlan(actor, viewKey, layers) {
    var view = pixelView(actor && actor.id, viewKey); if (!view) return { ok: false, why: '部品がない人物・向き' };
    layers = layers || resolve(actor); var eq = (actor && actor.equip) || {}; var mats = [], skipped = [], base = 'base_plain';
    for (var i = 0; i < PIX_SLOTS.length; i++) {
      var slot = PIX_SLOTS[i]; var id = eq[slot]; if (!id) continue;
      var L = layers.filter(function (l) { return l.slot === slot; })[0];
      if (slot === 'acc') { skipped.push('acc:' + id); continue; }
      if (!L) return { ok: false, why: slot + '：' + id + '（形が分からない品）' };
      var cls = pixelClass(L); var m = materialFor(view, cls);
      if (!m) return { ok: false, why: slot + '：' + id + '（' + (cls || (L.shape + (L.sub && L.sub !== L.shape ? '/' + L.sub : ''))) + ' の部品がない）' };
      if (m.base) base = m.base;
      mats.push({ cls: cls, m: m, layer: L });
    }
    mats.sort(function (a, b) { return (a.m.z || 0) - (b.m.z || 0); });
    return { ok: true, view: view, base: base, mats: mats, skipped: skipped };
  }
  // 品の色 → 5 段の色（暗い→明るい）。tools/appear/pixel/preview.py の ramp_for と同じ
  function mixc(a, b, t) { var A = hex(a), B = hex(b); return rgb([0, 1, 2].map(function (i) { return A[i] + (B[i] - A[i]) * t; })); }
  function hueOf(c) { var a = hex(c).map(function (v) { return v / 255; }); var mx = Math.max.apply(null, a), mn = Math.min.apply(null, a), d = mx - mn; if (d < 1e-6) return 0; var h = mx === a[0] ? ((a[1] - a[2]) / d) % 6 : mx === a[1] ? (a[2] - a[0]) / d + 2 : (a[0] - a[1]) / d + 4; h *= 60; return h < 0 ? h + 360 : h; }
  function hueDist(a, b) { var d = Math.abs(hueOf(a) - hueOf(b)) % 360; return Math.min(d, 360 - d); }
  function grayish(c) { return sat(c) < 0.22; }
  function rampFor(pal) {
    var main = pal.main; var light = null; var cands = [pal.light, pal.trim, pal.acc];
    for (var i = 0; i < cands.length; i++) { var c = cands[i]; if (c && lum(c) > lum(main) + 25 && (hueDist(c, main) < 40 || (grayish(main) && grayish(c)))) { light = c; break; } }
    if (!light) light = mixc(main, '#ffffff', 0.45);
    var dark = lum(pal.dark) < lum(main) - 18 ? pal.dark : mixc(main, '#000000', 0.5);
    return [mixc(dark, '#000000', 0.35), dark, main, mixc(main, light, 0.55), light];
  }
  function orbRamp(pal) { var a = grayish(pal.acc) ? pal.main : pal.acc; return [mixc(a, '#000000', 0.6), mixc(a, '#000000', 0.25), a, mixc(a, '#ffffff', 0.45), '#ffffff']; }
  function rampLut(ramp) {
    var cs = ramp.map(hex); var n = cs.length; var lut = new Uint8ClampedArray(256 * 3);
    for (var v = 0; v < 256; v++) { var p = v / 255 * (n - 1); var i = Math.min(n - 2, Math.max(0, Math.floor(p))); var t = p - i; for (var k = 0; k < 3; k++) lut[v * 3 + k] = Math.round(cs[i][k] + (cs[i + 1][k] - cs[i][k]) * t); }
    return lut;
  }
  var TINTS = new Map();
  function tinted(e, url, ramp) {
    var key = url + '|' + ramp.join(','); var t = TINTS.get(key); if (t) return t;
    var im = e.img, W = im.naturalWidth || im.width, H = im.naturalHeight || im.height; var c = mk(W, H); var g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0); var d = g.getImageData(0, 0, W, H); var a = d.data; var lut = rampLut(ramp);
    for (var i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; var v = a[i]; a[i] = lut[v * 3]; a[i + 1] = lut[v * 3 + 1]; a[i + 2] = lut[v * 3 + 2]; }
    g.putImageData(d, 0, 0); TINTS.set(key, c); while (TINTS.size > 80) TINTS.delete(TINTS.keys().next().value);
    return c;
  }
  function pixelRequest(actor, viewKey, opts) {
    var eqActor = opts.equip ? { id: actor.id, job: actor.job, equip: opts.equip } : actor;
    var layers = resolve(eqActor); var plan = pixelPlan(eqActor, viewKey, layers);
    if (!plan.ok) { if (actor) note(actor.id, viewKey, plan.why); return { state: 'none', why: plan.why }; }
    var M = PX(); var view = plan.view; var sig = signature(eqActor, layers, 'px:' + M.version, viewKey);
    var hit = CACHE.get(sig); if (hit) { stats.cacheHit++; CACHE.delete(sig); CACHE.set(sig, hit); return { state: 'ok', canvas: hit.canvas, sig: sig, layers: layers, view: view, pad: M.pad, body: hit.body, mode: 'pixel', parts: hit.parts }; }
    var need = [plan.base]; plan.mats.forEach(function (mt) { mt.m.layers.forEach(function (L) { if (own(view.parts, L.part)) need.push(L.part); }); if (mt.m.hand) need.push('hand'); });
    var ents = {}; need.forEach(function (k) { ents[k] = loadImg(view.parts[k].url); });
    var all = Object.keys(ents).map(function (k) { return ents[k]; });
    var bad = Object.keys(ents).filter(function (k) { return ents[k].state === 'error'; });
    if (bad.length) { stats.failed++; note(actor.id, viewKey, '部品を使えない：' + bad[0] + '（' + (ents[bad[0]].why || '読み込みの失敗') + '）'); return { state: 'error', sig: sig }; }
    if (all.some(function (e) { return e.state !== 'ok'; })) return { state: 'loading', sig: sig, promise: Promise.all(all.map(function (e) { return e.promise; })) };
    var P = M.pad; var canvas = mk(view.w + 2 * P, view.h + 2 * P); var g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
    var used = [];
    var put = function (k, img) { var r = view.parts[k]; g.drawImage(img, P + r.x, P + r.y); used.push(k); };
    put(plan.base, ents[plan.base].img);
    plan.mats.forEach(function (mt) {
      mt.m.layers.forEach(function (L) {
        if (!own(view.parts, L.part)) return;   // optional（この向きにない部品）
        var e = ents[L.part]; var url = view.parts[L.part].url; var pal = mt.layer.pal;
        if (L.erase) { g.globalCompositeOperation = 'destination-out'; put(L.part, e.img); g.globalCompositeOperation = 'source-over'; return; }   // 素の絵の一部を消す（ローブの背面：マントの裾を短くする）
        if (L.onlyColor && grayish(pal.main)) return;   // 灰色の品（鉄・鋼）：元の板金の色のまま
        if (!L.tint) { put(L.part, e.img); return; }
        var ramp;
        if (L.tint === 'orb') ramp = orbRamp(pal);
        else if (grayish(pal.main)) { if (L.grayKeep) return; ramp = L.grayRef && M.ref && M.ref[L.grayRef] ? M.ref[L.grayRef] : rampFor(pal); }   // 灰色の品：重鎧は元の板金のまま・兜は元の鎧の色
        else ramp = rampFor(pal);
        put(L.part, tinted(e, url, ramp));
      });
      if (mt.m.hand) put('hand', ents.hand.img);
    });
    var b = view.body; var body = { x0: b.x0 + P, y0: b.y0 + P, x1: b.x1 + P, y1: b.y1 + P };
    stats.composed++; CACHE.set(sig, { canvas: canvas, body: body, parts: used }); while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    return { state: 'ok', canvas: canvas, sig: sig, layers: layers, view: view, pad: P, body: body, mode: 'pixel', parts: used };
  }
  // メニューに置く切り出し：元の絵（w × h）の範囲を必ず含み、左右は元の絵の中心でそろえる。下は元の絵の下辺
  //   → 元の絵と同じ大きさ・同じ位置に人物が立つ（はみ出す槍・杖・帽子の先だけ、まわりへ出る）
  function menuCrop(c, view, pad) {
    var f = view.frame;
    if (f) {   // 決まった枠（どの組み合わせでも同じ）：帽子・槍・杖の先まで収め、足もと（元の絵の下辺）と左右の中心をそろえる
      var o0 = mk(f.x1 - f.x0, f.y1 - f.y0); var g0 = o0.getContext('2d'); g0.imageSmoothingEnabled = false; g0.drawImage(c, -(pad + f.x0), -(pad + f.y0));
      return { canvas: o0, k: (f.y1 - f.y0) / view.h, f: view.h / (f.y1 - f.y0), frame: true };
    }
    var g = c.getContext('2d', { willReadFrequently: true }); var d = g.getImageData(0, 0, c.width, c.height).data; var x0 = c.width, y0 = c.height, x1 = -1;
    for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; }
    var cx = pad + view.w / 2; var half = Math.ceil(Math.max(view.w / 2, x1 < 0 ? 0 : cx - x0 + 1, x1 < 0 ? 0 : x1 + 1 - cx));
    var top = Math.min(pad, y0); var bottom = pad + view.h;
    var L = Math.max(0, Math.floor(cx - half)); var R = Math.min(c.width, Math.ceil(cx + half)); var o = mk(R - L, bottom - top);
    var og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, -L, -top);
    return { canvas: o, k: (bottom - top) / view.h, kw: (R - L) / view.w };
  }
  function opaqueBox(c) { var g = c.getContext('2d', { willReadFrequently: true }); var d = g.getImageData(0, 0, c.width, c.height).data; var x0 = c.width, y0 = c.height, x1 = -1, y1 = -1; for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return x1 < 0 ? null : { x0: x0, y0: y0, x1: x1 + 1, y1: y1 + 1 }; }
  // Promise で受け取る（メニュー用）
  function composeFor(actor, viewKey, opts) {
    var r = request(actor, viewKey, opts); if (r.state !== 'loading') return Promise.resolve(r);
    return r.promise.then(function () { return request(actor, viewKey, opts); }, function () { return { state: 'error' }; });
  }
  // 不透明な部分だけを切り出す（メニューの表示用。拡大はしない）
  function cropOpaque(c, pad) {
    pad = pad == null ? 2 : pad; var g = c.getContext('2d', { willReadFrequently: true }); var d = g.getImageData(0, 0, c.width, c.height).data; var x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    if (x1 < 0) return c; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(c.width - 1, x1 + pad); y1 = Math.min(c.height - 1, y1 + pad);
    var o = mk(x1 - x0 + 1, y1 - y0 + 1); var og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, -x0, -y0); return o;
  }

  /* ---------- 画面の HTML に置いた印（data-ea-actor）に、合成した絵を入れる（メニュー・装備の画面・2D 版の戦闘の欄） ----------
     <span class="ea-host" data-ea-actor="hero" data-ea-view="menu" data-ea-equip='{"weapon":"steel_sword"}'>（中に従来の本人の絵）</span>
     ・合成ができるまでは中の従来の絵のまま。できたら、その印の中の絵（img.ea-img か最初の img）を合成した絵に差し替える
     ・人物・装備が切り替わったあと（印が消えた・印の中身が変わった）に、古い合成を入れない */
  function hydrate(rootEl) {
    var doc = root.document; if (!doc || !root.State || !root.State.actor) return;
    var list = (rootEl || doc).querySelectorAll ? (rootEl || doc).querySelectorAll('[data-ea-actor]') : []; if (rootEl && rootEl.getAttribute && rootEl.getAttribute('data-ea-actor')) list = [rootEl].concat(Array.prototype.slice.call(list));
    Array.prototype.forEach.call(list, function (host) {
      var id = host.getAttribute('data-ea-actor'); var actor = root.State.actor(id); if (!actor) return;
      var eqTxt = host.getAttribute('data-ea-equip'); var eq = null; if (eqTxt) { try { eq = JSON.parse(eqTxt); } catch (e) { eq = null; } }
      var view = host.getAttribute('data-ea-view') || 'menu'; var vk = view === 'menu' ? menuView(actor) : view;
      if (!supports(actor, vk)) { host.setAttribute('data-ea-state', 'none'); return; }
      var opts = eq ? { equip: Object.assign({}, actor.equip || {}, eq) } : {};
      var key = id + '|' + vk + '|' + JSON.stringify((opts.equip || actor.equip) || {}) + '|' + actor.job;
      if (host.getAttribute('data-ea-key') === key) return;
      host.setAttribute('data-ea-key', key); host.setAttribute('data-ea-state', 'loading');
      composeFor(actor, vk, opts).then(function (r) {
        if (!host.isConnected || host.getAttribute('data-ea-key') !== key) return;   // 古い読み込みの結果は入れない
        if (r.state !== 'ok') { host.setAttribute('data-ea-state', r.state); return; }
        var mc = r.mode === 'pixel' && r.view ? menuCrop(r.canvas, r.view, r.pad) : null;   // v9.7 元の絵と同じ範囲・中心で切り出す（人物の大きさ・立ち位置をそろえる）
        var src = mc ? mc.canvas : cropOpaque(r.canvas, 2); var old = host.querySelector('.ea-img') || host.querySelector('img') || host.querySelector('canvas');
        var cv = mk(src.width, src.height); var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0);
        cv.className = ((old && old.className) || '').replace(/\bea-img\b|\bea-canvas\b/g, '').trim() + ' ea-img ea-canvas'; cv.setAttribute('aria-hidden', 'true');
        var hpx = host.getAttribute('data-ea-h'); if (old && old.style && old.style.height) cv.style.height = old.style.height; else if (hpx) cv.style.height = hpx + 'px';
        // data-ea-fit="body"：人物（装備のない素体）の高さを今までの絵と同じにする（長い武器の先は枠の上へはみ出す）
        if (mc && mc.frame) { host.classList.add('ea-frame'); host.style.setProperty('--ea-f', mc.f.toFixed(4)); }
        else if (host.getAttribute('data-ea-fit') === 'body' && (mc || r.body)) { var bh = r.body ? Math.max(1, r.body.y1 - r.body.y0) : 1; cv.style.setProperty('--ea-k', (mc ? mc.k : src.height / bh).toFixed(4)); host.classList.add('ea-fit-body'); }
        cv.setAttribute('data-ea-mode', r.mode || 'vector'); if (r.parts) cv.setAttribute('data-ea-parts', r.parts.join(' '));
        cv.setAttribute('data-ea-sig', r.sig);
        if (old) old.replaceWith(cv); else { host.innerHTML = ''; host.appendChild(cv); }
        host.setAttribute('data-ea-state', 'ok');
      }).catch(function (e) { if (host.getAttribute('data-ea-key') === key) host.setAttribute('data-ea-state', 'error'); try { console.warn('[装備の外見] 表示できない（本人の元の絵のまま）', id, e); } catch (e2) { } });
    });
  }
  var obs = null;
  function watch() {
    var doc = root.document; if (obs || !doc || !root.MutationObserver) return;
    var pending = false; obs = new root.MutationObserver(function () { if (pending) return; pending = true; (root.requestAnimationFrame || setTimeout)(function () { pending = false; hydrate(); }); });
    var start = function () { if (doc.body) obs.observe(doc.body, { childList: true, subtree: true }); };
    if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start);
  }
  // 画面に置く印（HTML の文字列）。inner は従来の本人の絵（合成ができるまで表示する）
  function hostHtml(actorId, inner, o) {
    o = o || {}; var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    // v9.7 枠のある向き（主人公の立ち絵）：合成ができる前の元の絵・部品のない品のときの元の絵も、同じ枠の大きさ・足もとで出す（--ea-f＝元の絵の高さ ÷ 枠の高さ）
    var fr = ''; try { var A = root.State && root.State.actor && root.State.actor(actorId); var vk = A ? ((o.view || 'menu') === 'menu' ? menuView(A) : o.view) : null; var pv = MODE === 'pixel' && A ? pixelView(actorId, vk) : null; if (pv && pv.frame) fr = ' ea-frame" style="--ea-f:' + (pv.h / (pv.frame.y1 - pv.frame.y0)).toFixed(4); } catch (e) { fr = ''; }
    return '<span class="ea-host' + (o.cls ? ' ' + o.cls : '') + fr + '" data-ea-actor="' + esc(actorId) + '" data-ea-view="' + esc(o.view || 'menu') + '"' + (o.equip ? ' data-ea-equip="' + esc(JSON.stringify(o.equip)) + '"' : '') + (o.h ? ' data-ea-h="' + (o.h | 0) + '"' : '') + (o.fit ? ' data-ea-fit="' + esc(o.fit) + '"' : '') + '>' + (inner || '') + '</span>';
  }

  var API = { slots: Object.freeze(slots.slice()), paths: paths, resolve: resolve, signature: signature, paint: paint, compose: compose,
    request: request, composeFor: composeFor, cropOpaque: cropOpaque, menuView: menuView, supports: supports, anchorsOf: anchorsOf, hydrate: hydrate, hostHtml: hostHtml, watch: watch,
    accPlace: accPlace, unsupported: function () { return Object.assign({}, unsupported); }, stats: function () { return Object.assign({ cached: CACHE.size, mode: MODE }, stats); },
    clearCache: function () { CACHE.clear(); MASKS.clear(); TINTS.clear(); },
    // v9.7 ドット絵の差分
    mode: function () { return MODE; }, setMode: function (m) { if (m === 'pixel' || m === 'vector') { MODE = m; CACHE.clear(); Object.keys(unsupported).forEach(function (k) { delete unsupported[k]; }); } return MODE; },
    pixelClass: pixelClass, pixelPlan: function (actor, viewKey) { var p = pixelPlan(actor, viewKey); return p.ok ? { ok: true, base: p.base, mats: p.mats.map(function (m) { return m.cls; }), skipped: p.skipped } : p; },
    pixelView: pixelView, rampFor: rampFor, orbRamp: orbRamp, menuCrop: menuCrop };
  root.EquipmentAppearance = Object.freeze(API);
  watch();
})(typeof window === 'undefined' ? globalThis : window);
