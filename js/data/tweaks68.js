/* =========================================================
   Data / v6.8 の調整（2026-11-03 のご要望）
   ・酒場の「安いワイン」：序盤の酒場（リヴェル・マリナ）から、すべての酒場で買える。戦闘中に飲むと、2ターンのあいだ攻撃力+8%・守備力-5%
   ・相場都市トレディアをマクディア地方へ移した（入口は js/data/world-magicka.js、町の出口は js/data/tradia.js）
       古いセーブ：マクディア地方にまだ着いていない（world_magicka を訪れていない）のにトレディアにいるときは、町の外へ出ると
       カリオン徴収連邦の以前の入口の前 (36,89) に出る（その章では海を越えられないため。進行が止まらないように）
   ・各地の装備の強さを地域の順に段階づける（下の EQUIP_TIER。js/data/items.js などの元の値は変えず、ここで上書きする）
   ========================================================= */
(function (root) {
  'use strict';
  var ITEMS = root.ITEMS;

  /* ---------- 安いワイン ---------- */
  if (!ITEMS.cheap_wine) {
    ITEMS.cheap_wine = { id: 'cheap_wine', name: '安いワイン', cat: 'consumable', price: 24, effect: { buff: { atk: 0.08, def: -0.05 }, turns: 2 }, battleOnly: true, food: 'drink',
      desc: '戦闘中に飲む。2ターンのあいだ攻撃力+8%・守備力-5%（酔って気が大きくなる）' };
    if (root.ITEM_LIST && root.ITEM_LIST.indexOf('cheap_wine') < 0) root.ITEM_LIST.push('cheap_wine');
  }
  var FS = root.FOOD_STANDS = root.FOOD_STANDS || {};
  Object.keys(FS).forEach(function (k) { if (/_tavern$/.test(k) && FS[k].indexOf('cheap_wine') < 0) FS[k] = FS[k].concat(['cheap_wine']); });   // すべての酒場の品書き（序盤のリヴェル・マリナを含む）。酒場でない食堂（ラックスベル食堂など）には足さない

  /* ---------- トレディアの出口（古いセーブ） ---------- */
  root.redirectWarp = function (w, m, d) {
    if (!w || !m || m.id !== 'tradia' || w.to !== 'world_magicka' || !d) return null;
    if (d.visited && d.visited.world_magicka) return null;   // マクディア地方に着いたことがある：ふつうに出る
    return Object.assign({}, w, { to: 'world_kalion', tx: 36, ty: 89 });
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ---------- 装備の段階づけ（v6.8） ----------
   これまで：カリオン（第6〜7章）から、灰灯島・鐘都テンプス・機械の地方・雪原（第8〜12章ごろ）まで、店の装備の強さがほとんど変わらず、
             最後の地方（暗黒大陸）の店もマクディアと同じだった
   ・地域ごとに「その地域でいちばん強い剣の攻撃力」「いちばん強い鎧の守備力」の目安を決め、店が売っている種類で目安に届かないものだけ、
     その地域の新しい装備を足す（既存の装備の値・店の品ぞろえ・入手先は変えない。消さない）
   ・種類ごとの比（剣を1としたとき）：槍0.97・斧1.04・弓0.97・短剣0.84・杖0.74・槌0.94・爪0.90／鎧を1としたとき：軽鎧0.86・法衣0.82・盾0.75・兜0.42・帽子0.30
   ・値段：武器は 3×攻撃力²、防具は 5×（鎧に換算した守備力）²×比 を目安（既存の装備の値段とだいたい同じ線）
   ・灰灯島には防具の店がないので、交易商人に防具もひとそろい並べる
   ・一覧：docs/equipment-v68.md */
(function (root) {
  'use strict';
  var ITEMS = root.ITEMS; var SA = root.SHOP_ADD = root.SHOP_ADD || {};
  var WF = { sword: [1, '剣'], spear: [0.97, '槍'], axe: [1.04, '戦斧'], bow: [0.97, '弓'], dagger: [0.84, '短剣'], staff: [0.74, '杖'], club: [0.94, '槌'], claw: [0.9, '爪'] };
  var AF = { heavy: [1, '鎧'], light: [0.86, '軽鎧'], robe: [0.82, '法衣'], shield: [0.75, '盾'], helm: [0.42, '兜'], hat: [0.3, '帽子'] };
  // [地域, 名前の頭, 剣の目安, 鎧の目安, 武器を足す店, 防具を足す店, 足す種類（店が売っている種類）, 地域の説明]
  var TIERS = [
    ['islands', '潮騒の', 34, 30, 'aruna_village', 'aruna_village', 'sword spear bow dagger staff club heavy light robe shield helm hat', '断裂群島の職人'],
    ['tempus', '刻針の', 38, 32, 'tempus_weapon', 'tempus_armor', 'sword spear bow dagger staff claw heavy light shield hat', '鐘都テンプスの職人'],
    ['desert', '熱砂の', 38, 32, 'sahar_weapon', 'sahar_armor', 'sword spear bow staff club heavy light robe shield helm hat', '砂漠の鍛冶'],
    ['machine', '機鋼の', 42, 34, 'node_market', 'node_armor', 'sword spear bow dagger staff heavy light robe shield helm hat', '機械の都の工房'],
    ['snow', '凍星の', 42, 34, 'frost_weapon', 'frost_armor', 'spear bow staff claw heavy light robe shield helm', '雪原の職人'],
    ['dragon', '竜牙の', 50, 40, 'ignas_forge', 'ignas_armor', 'sword staff club claw heavy robe shield helm hat', '竜の鍛冶場'],
    ['dark', '暁光の', 56, 44, 'dark_armory', 'dark_armory', 'sword spear axe bow dagger staff club claw heavy light robe shield helm hat', '最後の地の鍛冶']
  ];
  var made = [];
  function r100(v) { return Math.max(100, Math.round(v / 100) * 100); }
  TIERS.forEach(function (T) {
    var region = T[0], pre = T[1], S = T[2], H = T[3], types = T[6].split(' ');
    types.forEach(function (ty) {
      var id = 't68_' + region + '_' + ty; if (ITEMS[id]) return; var it;
      if (WF[ty]) {
        var atk = Math.round(S * WF[ty][0]); it = { id: id, name: pre + WF[ty][1], cat: 'weapon', type: ty, atk: atk, price: r100(3 * atk * atk) };
        if (ty === 'dagger') it.agi = 5; if (ty === 'claw') it.agi = 4; if (ty === 'bow') it.agi = 2; if (ty === 'staff') it.mag = Math.round(S * 0.2); if (ty === 'club') it.mag = Math.round(S * 0.1);
      } else {
        var df = Math.max(1, Math.round(H * AF[ty][0])); it = { id: id, name: pre + AF[ty][1], cat: 'armor', type: ty, def: df, price: r100(5 * H * H * AF[ty][0]) };
        if (ty === 'heavy') it.agi = -2; if (ty === 'light') it.agi = 3; if (ty === 'robe' || ty === 'hat') it.mag = Math.round(H * 0.17);
      }
      var st = ['atk', 'def', 'mag', 'agi'].filter(function (k) { return it[k]; }).map(function (k) { return { atk: '攻撃力', def: '守備力', mag: '魔力', agi: '素早さ' }[k] + (it[k] > 0 ? '+' : '') + it[k]; }).join('・');
      it.desc = T[7] + 'が作った' + (WF[ty] ? WF[ty][1] : AF[ty][1]) + '。' + st; it.v68tier = region;
      ITEMS[id] = it; if (root.ITEM_LIST && root.ITEM_LIST.indexOf(id) < 0) root.ITEM_LIST.push(id);
      var shop = WF[ty] ? T[4] : T[5]; (SA[shop] = SA[shop] || []).push({ id: id }); made.push(id);
    });
  });
  root.EQUIP_TIER68 = { tiers: TIERS, items: made, weaponFactor: WF, armorFactor: AF };
})(typeof window !== 'undefined' ? window : globalThis);

/* ---------- 3D版：仲間になる前の仲間の NPC も、仲間の4方向の絵で表示する（v6.8） ----------
   ・NPC の ID が仲間の ID と同じ（lina・kyle・mina など）か、会話で c.join('ID') を呼び、最初にその仲間の名前で話す NPC（sc_ord → ord など）に actorArt を付ける
   ・3D版の町の表示（three-src/src/world/MapScene3D.js）が actorArt を見て、3Dモデルの代わりに絵の板で立てる。2D版は変えない */
(function (root) {
  'use strict';
  var MD = root.MAP_DEFS || {}, CP = root.COMPANIONS || {}; var n = 0;
  Object.keys(MD).forEach(function (mid) {
    (MD[mid].npcs || []).forEach(function (npc) {
      if (npc.actorArt) return; var id = CP[npc.id] ? npc.id : null;
      if (!id && typeof npc.talk === 'function') { var src = String(npc.talk); var m = /\.join\('([a-z_]+)'\)/.exec(src); var sp = /c\.say\('([^']+)'/.exec(src); if (m && CP[m[1]] && sp && sp[1] === CP[m[1]].name) id = m[1]; }   // 最初に話す名前がその仲間のときだけ（追っ手の兵士など、加入の場面のほかの人は除く）
      if (id) { npc.actorArt = id; n++; }
    });
  });
  root.ACTOR_ART_NPCS68 = n;
})(typeof window !== 'undefined' ? window : globalThis);
