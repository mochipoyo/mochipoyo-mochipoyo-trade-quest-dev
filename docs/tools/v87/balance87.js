// v8.7 ボス固有装備：釣り合いの確かめ（jsdom・オート戦闘のシミュレーション。実際の人の操作ではない）
//  1) 基礎値：各固有装備の基礎値の点数を、その時期（そのボスを倒すころ）に店で買える同じ枠の最強装備と比べる（比 = 固有 ÷ 店の最強）
//  2) 戦闘：代表のボスで「固有装備なし（店の最強装備だけ）」と「それまでに手に入る固有装備あり」を比べる
//     勝率・平均ターン・敵の直接攻撃 1 回で受けた最大ダメージ・勝ったときの MP の残り（割合）
//  条件（docs/tools/v67/bosstune67.js と同じ考え方）：主人公（戦士）＋リーナ・カイル・セリス、全員同じレベル、アイテムなし、オート戦闘
//    レベル：章のボスは v6.7 の表の想定レベル（中）、異界の門は地図の推奨レベルの上の数、ほかは近くの出現地帯の推奨レベルの上の数（推定）
//    店の装備：下の gearPool（町のまわりの推奨レベル・v6.4 の入手先表）。推定を含む
//  使い方：node balance87.js [回数=60]
const load = require('../v78/load78.js'); const fs = require('fs'); const path = require('path');
const N = +(process.argv[2] || 60);
const { w } = load({}); const { State: S, Actors: A, Combat: C, ITEMS, ENEMIES, MAP_DEFS: M, BossGear: UG, RecLevel: R } = w; const G = w.BOSS_UNIQUE_GEAR;
const MAPCH = JSON.parse(fs.readFileSync(path.join(__dirname, 'mapch64.json'), 'utf8')).MAPCH;
const LV = { 2: [5.1, 6.4, 7.4], 3: [8.1, 10.1, 11.5], 4: [9.1, 10.8, 12.1], 5: [18.7, 23.4, 26.7], 6: [21.8, 26.2, 29.5], 7: [23.8, 28.1, 31.5], 8: [29.9, 36.0, 40.6], 9: [32.5, 39.4, 44.6], 10: [35.8, 43.7, 49.6], 11: [40.0, 49.1, 55.9], 12: [41.4, 50.5, 57.4], 13: [46.1, 56.7, 64.7], 14: [48.4, 59.6, 67.9], 15: [50.9, 62.7, 71.5], 16: [53.6, 65.4, 74.2] };
const CH = { boss_lost_trend: 2, boss_greed_golem: 3, boss_bandit_chief: 3, boss_tide_serpent: 4, boss_overseer: 5, boss_ledger_guardian: 6, boss_valen: 7, boss_royal_captain: 7, boss_ledger_core: 7, boss_ruin_memory: 8, boss_library_guardian: 9, boss_storm_chief: 9, boss_mirage_lord: 9, boss_time_guardian: 10, boss_frost_spirit: 10, boss_memory_keeper: 10, boss_drone_swarm: 11, boss_core_defense: 12, boss_minister: 13, boss_magma_wyrm: 13, boss_sky_guardian: 14, boss_zarg_remnant: 15, boss_sevran_shadow: 15, boss_grote_2: 15, boss_demon_fear: 16, boss_demon_greed: 16, boss_demon_fixed: 16 };
// 行ごとの想定レベル
function zoneHi(mapId) {
  const seen = new Set([mapId]); let q = [mapId];
  for (let hop = 0; hop < 4 && q.length; hop++) {
    let best = 0; q.forEach((id) => { const m = M[id]; const zs = m && m.encounters && m.encounters.zones; if (zs) zs.forEach((z) => { best = Math.max(best, R.zoneLevel(z)); }); });
    if (best) return R.range(best)[1];
    const nq = []; q.forEach((id) => (((M[id] || {}).warps) || []).forEach((wp) => { if (wp && wp.to && !seen.has(wp.to) && wp.to !== 'world') { seen.add(wp.to); nq.push(wp.to); } })); q = nq;
  }
  return null;
}
function rowLevel(r) {
  const k = r.enemyIds[0]; if (CH[k]) return { lv: LV[CH[k]][1], how: '章' + CH[k] + 'の想定' };
  const m = M[r.sourceMapIds[0]]; if (m && m.recLevel) return { lv: m.recLevel[1], how: '地図の推奨の上' };
  const z = zoneHi(r.sourceMapIds[0]); if (z) return { lv: z, how: '近くの出現地帯（推定）' };
  return { lv: null, how: '不明' };
}
const ROWS = UG.activeRows(); ROWS.forEach((r) => { Object.assign(r, { _lv: rowLevel(r) }); });
function chOf(lv) { let c = 2; Object.keys(LV).forEach((k) => { if (LV[k][1] <= lv + 0.01) c = Math.max(c, +k); }); return c; }
// 店の装備：その町のまわりのフィールドの推奨レベルの下の数（RecLevel）が、ボスの想定レベル以下の店（武器・防具屋の実際の並び＝ShopTier76.filter、追加の品ぞろえ SHOP_ADD も入れる）
//   ＋ v6.4 の装備の入手先表（GEAR64_SOURCES）のうち、その章までの店（mapch64.json）。地図に町が見つからない店は入れない（控えめ）
S.newGame('t', 'warrior');
const FIELDS = Object.keys(M).filter((id) => M[id].kind === 'field');
function townLevel(town) {
  for (const wid of FIELDS) { const wp = (M[wid].warps || []).find((q) => q.to === town); if (!wp) continue; const m = w.World.getMap(wid);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, -3]]) { const r = R.at(m, wp.x + dx, wp.y + dy); if (r) return r.lo; } }
  return null;
}
const SHOPS = Object.keys(M).filter((id) => M[id].shop && M[id].warps && M[id].warps[0]).map((id) => { const town = M[id].warps[0].to; let st = (M[id].shop.stock || []).map((x) => typeof x === 'string' ? x : x.id); ((w.SHOP_ADD || {})[id] || []).forEach((e) => { if (st.indexOf(e.id) < 0) st.push(e.id); }); if (w.ShopTier76 && w.ShopTier76.filter) st = w.ShopTier76.filter(st, id, {}); return { id, town, lv: townLevel(town), stock: st }; });
const POOLS = {};
function gearPool(lv) {
  const key = Math.round(lv); if (POOLS[key]) return POOLS[key]; const pool = new Set();
  SHOPS.forEach((s) => { if (s.lv !== null && s.lv <= lv + 0.01) s.stock.forEach((id) => pool.add(id)); });
  const ch = chOf(lv); const SRC = w.GEAR64_SOURCES || {}; Object.keys(SRC).forEach((id) => { const s = SRC[id]; if (s.ch <= ch && (s.shop || []).some((x) => { const sm = M[x[0]]; const town = sm && sm.warps && sm.warps[0] && sm.warps[0].to; return town && MAPCH[town] && MAPCH[town] <= ch; })) pool.add(id); });
  return (POOLS[key] = [...pool].filter((id) => ITEMS[id] && (ITEMS[id].cat === 'weapon' || ITEMS[id].cat === 'armor') && !UG.locked(id)));
}
const CASTER = { priest: 1, mage: 1, sage: 1, spirit_warden: 1, chronomancer: 1 };
function score(job, it) { const c = CASTER[job]; return (it.atk || 0) * (c ? 0.3 : 1) + (it.mag || 0) * (c ? 1 : 0.2) + (it.def || 0) * 0.8 + (it.mdef || 0) * 0.4 + (it.hp || 0) * 0.15 + (it.agi || 0) * 0.3 + (it.mp || 0) * (c ? 0.1 : 0); }
function canJob(job, id) { const it = ITEMS[id]; const J = w.JOBS[job]; return it.cat === 'weapon' ? J.weapons.indexOf(it.type) >= 0 : J.armors.indexOf(it.type) >= 0; }
// 装備：店の最強。ug（使える固有装備）があれば、固有装備は点数を 1.15 倍に見て選ぶ（固有効果を少し重く見る遊び方のまね）。同じ固有装備は 1 人だけ
function equipParty(party, pool, ug) {
  const used = new Set(); const out = {};
  party.forEach((a) => { ['weapon', 'armor', 'shield', 'head', 'acc'].forEach((sl) => {
    let best = null, bs = -1; const cand = pool.concat(ug || []);
    cand.forEach((id) => { if (A.slotOf(id) !== sl || !A.canEquip(a, id) || used.has(id)) return; const s = score(a.job, ITEMS[id]) * (ITEMS[id].bossExclusive ? 1.15 : 1); if (s > bs) { bs = s; best = id; } });
    a.equip[sl] = best || null; if (best && ITEMS[best].bossExclusive) { used.add(best); (out[a.name] = out[a.name] || []).push(ITEMS[best].name); }
  }); });
  return out;
}
// 敵の直接攻撃 1 回あたりの被ダメージの最大（BossGear.takeDirect の戻り値＝固有装備の軽減のあと）
let MAXHIT = 0; const td = UG.takeDirect; UG.takeDirect = function () { const v = td.apply(this, arguments); if (v > MAXHIT) MAXHIT = v; return v; };
function lvRound(x) { const f = Math.floor(x); return Math.random() < x - f ? f + 1 : f; }
function fight(ids, lv, ch, ug, expose, key) {
  S.newGame('t', 'warrior'); const d = S.data; const h = d.hero; const L = lvRound(lv); h.level = L; h.jobLevels.warrior = L; A.refreshSkills(h);
  ['lina', 'kyle', 'seris'].forEach((id) => { S.joinCompanion(id); const c = d.companions[id]; c.level = L; c.jobLevels[c.job] = L; c.skills = []; A.refreshSkills(c); });
  const party = S.partyActors(); const who = equipParty(party, gearPool(lv), ug); party.forEach((a) => A.fullHeal(a));
  const b = C.create(ids, party, { boss: true, bossRewardKey: key }); if (expose) b.enemies.forEach((e) => { e.exposed = expose; });
  MAXHIT = 0; let t = 0; while (b.state === 'command' && t < 80) { C.runTurn(b, party.filter((a) => !a.dead).map((a) => C.autoCommand(b, a))); t++; }
  const mp = party.reduce((s, a) => s + (A.stats(a).maxMp ? a.mp / A.stats(a).maxMp : 1), 0) / party.length;
  return { won: b.state === 'won', t, maxHit: MAXHIT, mp, who };
}
function rate(row, ug) {
  const lv = row._lv.lv; const ch = chOf(lv); const ex = /demon_/.test(row.key) ? 1 : 0; let won = 0, tt = 0, mh = 0, mp = 0, nw = 0, who = null;
  for (let i = 0; i < N; i++) { const r = fight(row.enemyIds, lv, ch, ug, ex, row.key); if (r.won) { won++; mp += r.mp; nw++; } tt += r.t; mh = Math.max(mh, r.maxHit); who = r.who; }
  return { win: +(won / N).toFixed(2), turns: +(tt / N).toFixed(1), maxHit: mh, mpLeft: nw ? +(mp / nw).toFixed(2) : null, who };
}
// ---------- 1) 基礎値の比較 ----------
const PJOBS = ['warrior', 'priest', 'knight', 'mage'];
const base = ROWS.map((r) => {
  const it = ITEMS[r.itemId]; const lv = r._lv.lv || 70; const ch = chOf(lv); const pool = gearPool(lv); const sl = A.slotOf(r.itemId);
  let jobs = PJOBS.filter((j) => canJob(j, r.itemId)); if (!jobs.length) jobs = Object.keys(w.JOBS).filter((j) => canJob(j, r.itemId)).slice(0, 1);
  let best = null; jobs.forEach((j) => { const mine = score(j, it); let shop = 0, sid = null; pool.forEach((id) => { if (A.slotOf(id) === sl && canJob(j, id)) { const s = score(j, ITEMS[id]); if (s > shop) { shop = s; sid = id; } } }); const ratio = shop ? mine / shop : null; if (!best || (ratio || 0) > (best.ratio || 0)) best = { job: j, mine: +mine.toFixed(1), shop: +shop.toFixed(1), shopItem: sid ? ITEMS[sid].name : '（なし）', ratio: ratio ? +ratio.toFixed(2) : null }; });
  return { no: r.no, key: r.key, item: it.name, status: r.status, lv, how: r._lv.how, ch, slot: sl, best };
});
// ---------- 2) 戦闘 ----------
const REP = ['boss_lost_trend', 'boss_greed_golem', 'wolf_king', 'boss_ash_lord', 'zero_echo', 'boss_grote_2', 'boss_demon_fear', 'boss_demon_greed', 'boss_demon_fixed', 'tq_boss_apostle_of_anxiety', 'tq_boss_deluxe_mochiko', 'tq_boss_dark_matter_lifeform_x', 'tq_boss_gravitational_balance', 'boss_anchor_core'];
const battles = [];
REP.forEach((k) => {
  const row = ROWS.find((r) => r.key === k); if (!row || !row._lv.lv) { battles.push({ key: k, skip: '想定レベル不明' }); return; }
  const ug = ROWS.filter((r) => r !== row && r._lv.lv && r._lv.lv < row._lv.lv).map((r) => r.itemId);
  const t0 = Date.now(); const none = rate(row, null); const withUG = rate(row, ug);
  const o = { key: k, name: ENEMIES[k].name, lv: row._lv.lv, how: row._lv.how, gearCh: chOf(row._lv.lv), ugAvailable: ug.length, none: Object.assign({}, none, { who: undefined }), withUG, sec: Math.round((Date.now() - t0) / 1000) };
  battles.push(o); console.log(JSON.stringify(o));
});
const out = { N, base, battles };
fs.writeFileSync(path.join(__dirname, '../../arch87/logs/balance87.json'), JSON.stringify(out, null, 1));
console.log('基礎値の比 > 1.15：' + JSON.stringify(base.filter((x) => x.best && x.best.ratio > 1.15).map((x) => [x.no, x.item, x.best.ratio, x.best.shopItem, 'Lv' + x.lv])));
console.log('完了');
