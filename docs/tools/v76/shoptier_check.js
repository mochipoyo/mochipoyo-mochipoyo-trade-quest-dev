// v7.6 武器・防具屋の品ぞろえ（js/rpg/shoptier76.js）の確認：店ごとに並ぶ品・外した品、決まり（前の地域で売っていた品・前の地域の同じ種類より弱い品を外す／装備は MIN 以上）
// 使い方：cd /home/claude/work && RPG_DIR=<repo>/ node <repo>/docs/tools/v76/shoptier_check.js
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w } = load();
const ST = w.ShopTier76, I = w.ITEMS, D = w.MAP_DEFS, SA = w.SHOP_ADD || {}; const ng = []; let n = 0;
const shops = Object.keys(D).filter((id) => D[id].shop && (D[id].shop.kind === 'weapon' || D[id].shop.kind === 'armor'));
const extra = { aruna_village: ['knight_sword', 'halberd', 'long_bow', 'assassin_dagger', 'tide_dagger', 'survey_bow', 'holy_mace', 'sage_staff'], node_market: ['gear_bow', 'chrono_staff', 'knight_sword', 'halberd', 'long_bow', 'assassin_dagger', 'survey_bow'], ignas_town: ['dragon_axe', 'flame_claw', 'astral_spear', 'star_bow', 'balance_mace', 'arcane_staff'], verum_town: ['stoploss_dagger', 'robe_skip', 'herb', 'potion'] };
const rows = shops.map((id) => { const st = (D[id].shop.stock || []).slice(); (SA[id] || []).forEach((e) => { if (st.indexOf(e.id) < 0) st.push(e.id); }); return [id, st]; }).concat(Object.entries(extra));
rows.sort((a, b) => ST.orderOf(a[0]) - ST.orderOf(b[0]));
for (const [id, st] of rows) { n++; const info = {}; const out = ST.filter(st, id, info); const gear = out.filter((x) => I[x] && (I[x].cat === 'weapon' || I[x].cat === 'armor'));
  if (st.some((x) => !I[x])) ng.push(id + '：知らない品 ' + st.filter((x) => !I[x]).join(','));
  if (gear.length < Math.min(ST.MIN, st.filter((x) => I[x] && (I[x].cat === 'weapon' || I[x].cat === 'armor')).length)) ng.push(id + '：装備が少ない ' + gear.length);
  if (out.some((x) => st.indexOf(x) < 0)) ng.push(id + '：元の一覧にない品を並べた');
  console.log(`${String(ST.orderOf(id)).padStart(2)} ${id.padEnd(18)} 並べる ${gear.length}/${st.filter((x) => I[x] && (I[x].cat === 'weapon' || I[x].cat === 'armor')).length}  外す: ${(info.dropped || []).map((x) => I[x].name).join('・') || '-'}`); }
console.log('結果：' + (ng.length ? ng.length + ' 件 NG\n' + ng.join('\n') : 'すべて OK（' + n + ' 店）'));
process.exit(ng.length ? 1 : 0);
