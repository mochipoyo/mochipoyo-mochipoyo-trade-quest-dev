/* =========================================================
   Data / Food (v6.1) : 飲食物の売り場（データだけ。ゲームの処理は Services.shop／Services.foodStand）
   ・既存の道具屋の品ぞろえの「後ろ」に飲食物を足す（店の画面・既存の並びは変えない）
   ・酒場のマスターでは、仲間の編成の前に「食事・飲み物」を注文できる
   ・キーはお店（建物の中）のマップID。3D 化してもマップIDで同じ店に結びつく
   ========================================================= */
(function (root) {
  'use strict';
  var EARLY = ['onigiri', 'yakitori', 'green_tea'];
  var MID = ['onigiri', 'yakitori', 'ramen', 'curry_rice', 'green_tea', 'coffee'];
  var LATE = ['ramen', 'curry_rice', 'deluxe_steak', 'coffee', 'fruit_juice', 'mana_soda'];
  root.SHOP_EXTRAS = {
    poyo_item_shop: EARLY, rivel_item_shop: EARLY.concat(['ramen', 'coffee']), harbor_item_shop: MID,
    kalion_item: MID, sentra_item: MID, aruna_item: MID.concat(['fruit_juice']), tempus_item: LATE,
    sahar_item: LATE.concat(['fruit_juice']), ignas_item: LATE, magicka_item: LATE.concat(['mana_soda']), ciel_item: LATE, frost_item: LATE
  };
  // 酒場・食堂のメニュー（マップID → 品書き）
  var TAVERN = ['onigiri', 'yakitori', 'ramen', 'curry_rice', 'green_tea', 'coffee', 'fruit_juice'];
  root.FOOD_STANDS = {
    rivel_tavern: TAVERN, harbor_tavern: TAVERN, kalion_tavern: TAVERN.concat(['deluxe_steak']), sentra_tavern: TAVERN.concat(['deluxe_steak']), magicka_tavern: TAVERN.concat(['deluxe_steak', 'mana_soda'])
  };
})(typeof window !== 'undefined' ? window : globalThis);
