/* =========================================================
   ShopTier76（v7.6）：武器・防具屋の品ぞろえを「その地域の強い装備」にそろえる
   ・前の地域の店で買えた装備（同じ品）と、前の地域で買えた同じ種類の装備より弱い装備は並べない
     （特殊効果つき・トレード装備は、前の地域で売っていなければ弱くても残す）
   ・残りの装備が少ない（MIN 未満）店は、外した中から強い順に MIN まで戻す（店が空にならない）
   ・道具（消費アイテム）・大事なものは変えない。データ（ITEMS・店の品の一覧）は消さない。並べるときにだけ選ぶ
   ・地域の順番：物語の章の順（同じ章の地域は同じ順番。寄り道の都市トレディアは鐘都テンプスと同じ）
   ・確認：docs/tools/v76/shoptier_check.js
   ========================================================= */
(function (root) {
  'use strict';
  var ORDER = { arcadia: 1, grania: 2, kalion: 3, islands: 4, desert: 4, tempus: 5, machine: 6, magicka: 7, snow: 7, dragon: 7, sky: 8, dark: 9 };
  var SHOP_ORDER = { tradia_weapon: 5, tradia_armor: 5 };   // 寄り道の都市（BattleBG では魔導王国の扱いだが、品は第5〜10章）
  // 会話から開く店（マップの定義に品の一覧がない）：前の地域の品として数える
  var NPC_SHOPS = [
    { map: 'aruna_village', order: 4, items: ['knight_sword', 'halberd', 'long_bow', 'assassin_dagger', 'tide_dagger', 'survey_bow', 'holy_mace', 'sage_staff'] },
    { map: 'node_market', order: 6, items: ['gear_bow', 'chrono_staff', 'knight_sword', 'halberd', 'long_bow', 'assassin_dagger', 'survey_bow'] }
  ];
  var MIN = 4;
  var table = null;
  function isGear(it) { return !!it && (it.cat === 'weapon' || it.cat === 'armor'); }
  function power(it) { return it.cat === 'weapon' ? (it.atk || 0) + (it.mag || 0) * 0.6 : (it.def || 0) + (it.mdef || 0) * 0.5; }
  function special(it) { return !!(it.fx || it.trade || it.rare); }
  function townOf(mapId) { var d = root.MAP_DEFS && root.MAP_DEFS[mapId]; if (d && d.kind === 'interior' && d.warps && d.warps[0]) return d.warps[0].to; return mapId; }
  function orderOf(mapId) {
    if (SHOP_ORDER[mapId]) return SHOP_ORDER[mapId];
    var reg = null; try { reg = root.BattleBG65 && root.BattleBG65.regionOf ? root.BattleBG65.regionOf(townOf(mapId)) : null; } catch (e) { reg = null; }
    return ORDER[reg] || 0;
  }
  // 全部の店の品（地域の順番つき）
  function build() {
    var I = root.ITEMS || {}, D = root.MAP_DEFS || {}, SA = root.SHOP_ADD || {}; var list = [];
    Object.keys(D).forEach(function (id) { var d = D[id]; if (!d || !d.shop || (d.shop.kind !== 'weapon' && d.shop.kind !== 'armor')) return; var items = (d.shop.stock || []).slice(); (SA[id] || []).forEach(function (e) { if (items.indexOf(e.id) < 0) items.push(e.id); }); list.push({ map: id, order: orderOf(id), items: items }); });
    NPC_SHOPS.forEach(function (s) { list.push(s); });
    list.forEach(function (s) { s.items = s.items.filter(function (x) { return isGear(I[x]); }); });
    table = list; return list;
  }
  // order より前の地域：売っていた品・種類ごとの一番強い値
  function earlier(order) {
    var I = root.ITEMS || {}; var ids = {}, max = {};
    (table || build()).forEach(function (s) { if (!s.order || s.order >= order) return; s.items.forEach(function (x) { var it = I[x]; ids[x] = 1; var k = it.cat + ':' + it.type; max[k] = Math.max(max[k] || 0, power(it)); }); });
    return { ids: ids, max: max };
  }
  // 店の品ぞろえを選ぶ（mapId：店のマップ。返り値：新しい配列。info に外した品）
  function filter(stock, mapId, info) {
    var I = root.ITEMS || {}; var o = orderOf(mapId); if (!o || o <= 1) return stock.slice();
    var E = earlier(o); var keep = [], drop = [];
    stock.forEach(function (x) { var it = I[x]; if (!isGear(it)) { keep.push(x); return; }
      var k = it.cat + ':' + it.type; var old = !!E.ids[x] || (power(it) < (E.max[k] || 0) && !special(it));
      (old ? drop : keep).push(x); });
    var gearN = keep.filter(function (x) { return isGear(I[x]); }).length;
    if (gearN < MIN && drop.length) { drop.sort(function (a, b) { return power(I[b]) - power(I[a]); }); while (gearN < MIN && drop.length) { var x = drop.shift(); keep.splice(stock.indexOf(x) <= keep.length ? stock.indexOf(x) : keep.length, 0, x); gearN++; } keep.sort(function (a, b) { return stock.indexOf(a) - stock.indexOf(b); }); }
    if (info) { info.order = o; info.dropped = drop.slice(); }
    return keep;
  }
  root.ShopTier76 = { filter: filter, orderOf: orderOf, power: power, build: build, ORDER: ORDER, MIN: MIN };
})(typeof window !== 'undefined' ? window : globalThis);
