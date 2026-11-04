/* =========================================================
   Data / v7.3 能力の最大値を上げる道具（6種）
   ・使うと、選んだ仲間の能力の最大値が 1〜4（ランダム）ずつ上がる。上がった分は Actor.grow に残る（セーブに入る。職業を変えても残る）
   ・手に入れ方：宝箱を開けたとき（10%）・光っている所（探索ポイント）を調べたとき（12%）に、ときどき一緒に見つかる。店では売っていない
   ・戦闘中には使えない（フィールド・町・ダンジョンのメニューの「道具」から使う）
   ========================================================= */
(function (root) {
  'use strict';
  var ITEMS = root.ITEMS; if (!ITEMS) return;
  var G = root.Growth73 = { LIST: [
    ['energy_drink_eternal', '永久エナジードリンク', 'maxHp', '最大HP'],
    ['magic_tequila', '魔力テキーラ', 'maxMp', '最大MP'],
    ['elixir_resolve', '断迷の妙薬', 'atk', '攻撃力'],
    ['elixir_endure', '耐攻の妙薬', 'def', '防御力'],
    ['elixir_decide', '即断即決の妙薬', 'agi', '素早さ'],
    ['elixir_crystal', 'クリスタルの妙薬', 'mag', '魔力']
  ], CHEST_RATE: 0.10, SPARKLE_RATE: 0.12 };
  G.LIST.forEach(function (r) {
    ITEMS[r[0]] = { id: r[0], name: r[1], cat: 'consumable', price: 600, noShop: true, effect: { grow: r[2] }, growItem: true, desc: r[3] + 'の最大値が1〜4上がる（ずっと残る）' };
  });
  G.STAT_NAME = {}; G.LIST.forEach(function (r) { G.STAT_NAME[r[2]] = r[3]; });
  // 使う：1〜4 上げる。戻り値：上がった数
  G.apply = function (actor, stat, rnd) {
    var n = 1 + Math.floor((rnd || Math.random)() * 4); if (n > 4) n = 4;
    actor.grow = actor.grow || {}; actor.grow[stat] = (actor.grow[stat] || 0) + n;
    if (stat === 'maxHp' && !actor.dead) actor.hp += n; if (stat === 'maxMp') actor.mp += n;
    return n;
  };
  // 宝箱・光っている所で、ときどき一緒に見つかる
  G.bonusDrop = function (lines, kind, rnd) {
    var r = rnd || Math.random; var rate = kind === 'chest' ? G.CHEST_RATE : G.SPARKLE_RATE;
    if (r() >= rate) return null;
    var it = G.LIST[Math.floor(r() * G.LIST.length)] || G.LIST[0];
    if (root.State && root.State.addItem) root.State.addItem(it[0], 1);
    if (lines) lines.push('奥にもう一つ……' + it[1] + 'を見つけた！');
    return it[0];
  };
})(typeof window !== 'undefined' ? window : globalThis);
