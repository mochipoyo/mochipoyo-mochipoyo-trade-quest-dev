// v7.8 新しい5地域：物語を最初から最後まで（会話は自動で進め、ボス戦は勝ったことにする）・往復・浮天城とオルビスが開く時機（jsdom・地球の世界）
const load = require('./load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(); const w = A.w; const W = w.World, S = w.State; S.newGame('t', 'warrior'); W.start(); const d = S.data;
ok(A.errors.length === 0, '読み込みエラーなし ' + A.errors.slice(0, 2).join(' / '));
const log = []; w.Win.message = async (l) => { log.push([].concat(l || []).join('／')); }; w.Win.choice = async () => 0; w.Win.list = async () => 0; w.Win.toast = () => {}; w.BattleUI.start = async (ids) => { log.push('戦闘:' + ids.join(',')); return 'won'; };
if (w.BossSymbol) { w.BossSymbol.introIfShown = async () => {}; w.BossSymbol.intro = async () => {}; }
const ctx = () => w.Events.ctx(null);
const npc = async (map, id) => { const def = w.MAP_DEFS[map]; const n = (def.npcs || []).find((q) => q.id === id); if (!n) throw new Error('人がいない ' + map + ':' + id); W.enterMap(map, n.x, n.y + 1, 'up', { raw: true }); W.busy = false; await n.talk(ctx()); W.busy = false; };
const ev = async (map, x, y) => { const def = w.MAP_DEFS[map]; const e = (def.events || []).find((q) => q.x === x && q.y === y); if (!e) throw new Error('出来事がない ' + map + ' ' + x + ',' + y); W.enterMap(map, x, Math.min(y + 1, W.getMap(map).h - 1), 'up', { raw: true }); W.busy = false; if (e.run) await e.run(ctx(), e); else await w.Events.trigger ? w.Events.trigger(e) : null; W.busy = false; };
const qdone = (q) => !!(d.quests[q] && d.quests[q].state === 'done');
const has = (it) => (d.inventory[it] || 0) > 0;
(async () => {
  // ---------- ネオン
  await npc('neon_town', 'nt_shizuku'); ok(d.quests.neon78_water && d.flags.neon_heard && has('neon_petition'), 'ネオン：シズクから依頼（住民の署名）');
  await npc('neon_office', 'no_terminal'); ok(d.flags.neon_terminal, 'ネオン：配給端末で配給表を見た');
  await ev('neon_works_core', 9, 3); ok(!d.flags.neon_ai_fixed, 'ネオン：証拠なしでは AI は直せない');
  await ev('neon_works_1', 26, 2); await ev('neon_works_2', 15, 9); ok(d.flags.neon_has_record && d.flags.neon_meter && has('neon_record'), 'ネオン：閉鎖の記録・流量計の値');
  await ev('neon_works_core', 9, 3); ok(d.flags.neon_ai_fixed && log.some((l) => /boss_archive_warden/.test(l)), 'ネオン：監督機を倒し、配給を直した');
  await npc('neon_town', 'nt_shizuku'); ok(qdone('neon78_water') && has('neon_umbrella') && has('clean_filter'), 'ネオン：クエスト完了・報酬（錆雨の傘槍・浄水のフィルター）');
  // ---------- メリディアン
  await npc('meridian_shelter', 'ms_grey'); ok(d.flags.mer_heard, 'メリディアン：駅長代理から依頼');
  const hw = w.MAP_DEFS.meridian_highway.events.find((e) => e.x === 18); W.enterMap('meridian_highway', 18, 5, 'down', { raw: true }); await hw.run(ctx(), hw); ok(d.flags.mer_highway, 'メリディアン：高架道路を越えた');
  await ev('meridian_station', 8, 3); ok(!d.flags.mer_why, 'メリディアン：列車を見る前は信号機と戦わない');
  const sw = w.MAP_DEFS.meridian_subway_2.events.find((e) => e.x === 24); W.enterMap('meridian_subway_2', 24, 6, 'right', { raw: true }); await sw.run(ctx(), sw); ok(d.flags.mer_found, 'メリディアン：止まった列車を見つけた');
  await ev('meridian_station', 8, 3); ok(d.flags.mer_why, 'メリディアン：信号機を止め、止まった理由を知った');
  await npc('meridian_station', 'mst_conductor'); ok(has('mer_passenger_list') && has('mer_letters'), 'メリディアン：乗客名簿と伝言');
  for (const id of ['ms_mother', 'ms_oldman', 'ms_girl']) await npc('meridian_shelter', id);
  ok(d.flags.mer_delivered && !has('mer_letters'), 'メリディアン：3人に伝言を届けた');
  await npc('meridian_shelter', 'ms_grey'); ok(qdone('meridian78_train') && has('guide_flag_spear') && has('conductor_watch'), 'メリディアン：クエスト完了・報酬');
  // ---------- ネレイア
  await npc('nereia_city', 'nc_mira'); ok(d.flags.ner_heard, 'ネレイア：潮守ミラから依頼');
  await ev('nereia_old_hi', 3, 8); ok(W.map.id === 'nereia_old_lo' && d.flags.ner_bell, 'ネレイア：潮見の鐘で満潮 → 干潮（地図が変わる）');
  ok(W.getMap('nereia_old_lo').warpAt(13, 13) && !W.getMap('nereia_old_hi').warpAt(13, 13), 'ネレイア：干潮のときだけ神殿の階段がある');
  const fl = w.MAP_DEFS.nereia_old_lo.npcs.find((n) => n.id === 'no_ferry'); W.enterMap('nereia_old_lo', 8, 8, 'up', { raw: true }); await fl.talk(ctx()); ok(W.map.id === 'nereia_old_lo' && W.player.y === 8, 'ネレイア：干潮では渡し舟が出ない');
  await ev('nereia_old_lo', 3, 8); ok(W.map.id === 'nereia_old_hi', 'ネレイア：鐘で干潮 → 満潮');
  const fh = w.MAP_DEFS.nereia_old_hi.npcs.find((n) => n.id === 'no_ferry'); W.enterMap('nereia_old_hi', 8, 8, 'up', { raw: true }); await fh.talk(ctx()); ok(W.map.id === 'nereia_old_hi' && W.player.x === 13 && W.player.y === 5, 'ネレイア：満潮の渡し舟で中島の桟橋へ');
  W.enterMap('nereia_temple_1', 9, 5, 'up', { raw: true }); W.busy = false; await w.Events.run(W.getMap('nereia_temple_1').eventAt(9, 4)); W.busy = false; ok(!d.flags.ner_seal_open, 'ネレイア：潮読みの貝がないと封印の扉は開かない');
  await ev('nereia_archive', 5, 3); ok(has('ner_shell'), 'ネレイア：潮読みの貝');
  const lk = w.MAP_DEFS.nereia_temple_1.events.find((e) => e.type === 'locked'); W.enterMap('nereia_temple_1', 9, 5, 'up', { raw: true }); W.busy = false; await w.Events.run(W.getMap('nereia_temple_1').eventAt(9, 4)); W.busy = false; ok(d.flags[lk.doneFlag], 'ネレイア：潮読みの貝で神殿の封印の扉が開いた'); const st = w.MAP_DEFS.nereia_temple_1.events.find((e) => e.y === 11); await st.run(ctx(), st); ok(d.flags.ner_stairs, 'ネレイア：海底神殿に入った（封印は潮読みの貝で開く扉）');
  await ev('nereia_temple_2', 9, 2); ok(d.flags.ner_gate, 'ネレイア：潮門の番人を倒し、潮門を開いた');
  await npc('nereia_city', 'nc_mira'); ok(qdone('nereia78_tide') && has('tidegate_staff') && has('surf_earring'), 'ネレイア：クエスト完了・報酬');
  // ---------- オルビス：開く時機（第15章「暗黒大陸」の完了）
  const gate = w.MAP_DEFS.dark_camp.events.find((e) => e.orbisGate);
  d.quests.main_15 = { state: 'active' }; W.enterMap('dark_camp', 5, 18, 'up', { raw: true }); await gate.run(ctx(), gate); ok(W.map.id === 'dark_camp', 'オルビス：第15章の途中は、転送門は眠っている');
  delete d.flags.astra_owned; d.quests.main_15 = { state: 'done' }; W.enterMap('dark_camp', 5, 18, 'up', { raw: true }); await gate.run(ctx(), gate); ok(W.map.id === 'dark_camp', 'オルビス：v7.9 第15章の完了だけでは、まだ眠っている（本編クリアのあと）');
  d.flags.game_cleared = true; W.enterMap('dark_camp', 5, 18, 'up', { raw: true }); await gate.run(ctx(), gate); ok(W.map.id === 'orbis_ring', 'オルビス：本編クリアのあと、宇宙船なしで転送門からオルビスへ');
  const back = W.map.warps.find((x) => x.to === 'dark_camp'); ok(!!back, 'オルビス：居住環から前線基地へ戻る転送門がある');
  await npc('orbis_ring', 'or_noah'); ok(d.flags.orb_arrived, 'オルビス：管理AIノアから依頼');
  await ev('orbis_obs_1', 2, 9); await ev('orbis_obs_2', 13, 2); W.enterMap('orbis_obs_2', 12, 9, 'right', { raw: true }); w.MAP_ENTER_HOOKS.forEach((f) => f(W.map)); ok(d.flags.orb_code_a && d.flags.orb_code_b && d.flags.orb_codes, 'オルビス：鍵コードの前半・後半');
  await ev('orbis_sat', 8, 2); ok(d.flags.orb_sat && d.flags.orb_restored, 'オルビス：守衛AIを止め、地上との通信を復旧');
  ok(!d.flags.orb_lounge_open, 'オルビス：報告の前は展望室は閉じている');
  await npc('orbis_ring', 'or_noah'); ok(qdone('orbis78_signal') && has('orbit_bow') && has('star_ring'), 'オルビス：クエスト完了・報酬');
  // 無重力：明るい床で流される
  W.enterMap('orbis_obs_1', 1, 4, 'right', { raw: true }); W.player.dir = 'right'; W.player.x = 2; W.player.y = 4; W.busy = false; W.onStep(); ok(W.player.x > 2, '無重力の区画：明るい床に乗ると、止まれる所まで流される（x ' + W.player.x + '）');
  // ---------- 浮天城アエリア：開く時機（アストラ号）
  const AS = w.Astra; ok(!Object.keys(w.MAP_DEFS).some((id) => (w.MAP_DEFS[id].warps || []).some((x) => x.to === 'aeria_dock') && !/^aeria_/.test(id)), 'アエリア：地上・海から船着き場への入口はない（アストラ号だけ）');
  ok(!AS.owned(), 'アエリア：アストラ号を手に入れる前（クリア前）');
  d.flags.game_cleared = true; AS.grant(); d.flags.astra_owned = true; Object.keys(w.World76.REGIONS).forEach(() => {}); w.World76.REGIONS.forEach((id) => d.visited[id] = true); d.visited.world_sky = true; d.visited.world_machine = true;
  const s = AS.state(); s.flying = true; const ap = AS.aeriaPoint(); s.wx = ap.wx; s.wy = ap.wy; const lp = AS.nearestLanding(s.wx, s.wy, 14);
  ok(lp && lp.special === 'aeria', 'アエリア：アストラ号で太平洋の上空へ飛ぶと、上空の船着き場に降りられる（' + (lp && lp.name) + '）');
  AS.land(lp); ok(W.map.id === 'aeria_dock' && d.flags.aer_docked, 'アエリア：接舷した');
  await npc('aeria_dock', 'ad_keeper'); ok(d.flags.aer_heard && has('aer_gate_key'), 'アエリア：城守の人形から依頼・水門の鍵');
  ok(W.getMap('aeria_dock').warps[0].to === 'aeria_garden_hi', 'アエリア：水門の前は満水の庭園へ');
  await ev('aeria_garden_hi', 2, 9); ok(d.flags.aer_gate && W.map.id === 'aeria_garden_lo' && W.getMap('aeria_dock').warps[0].to === 'aeria_garden_lo', 'アエリア：水門を開け、水が引いた（船着き場の門も水の引いた庭園へ）');
  ok(W.getMap('aeria_garden_lo').warpAt(16, 8) && !W.getMap('aeria_garden_hi').warpAt(16, 8), 'アエリア：水が引いたあとだけ回廊への階段');
  await ev('aeria_reactor', 8, 2); ok(d.flags.aer_reactor, 'アエリア：浮力炉を修復');
  await npc('aeria_dock', 'ad_keeper'); ok(qdone('aeria78_float') && has('azure_sword') && has('aeria_robe') && has('reactor_shard'), 'アエリア：クエスト完了・報酬');
  AS.takeOffAeria(); ok(s.flying && Math.abs(s.wx - ap.wx) < 2, 'アエリア：船着き場から飛び立つ');
  const poyo = AS.allLandingPoints().find((p) => p.id === 'poyo_village'); AS.land(poyo); ok(W.map.id === 'world' && !s.flying, 'アエリア → ポヨ村の近くに着陸（往復）');
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
