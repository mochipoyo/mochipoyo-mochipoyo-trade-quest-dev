// v8.1 の前の版で「古いセーブ」を作る（RPG_DIR に前の版のスナップショット）：node save81_make.js <出力の json>
// ・作り直した拠点ごとに：外から入った所（村・町の入口）／今は新しい建物が建っている所（前の版で歩けたマス）／屋内の階段のそば／条件つきの出来事の途中
const load = require('../v78/load78.js'); const fs = require('fs');
const A = load({ earth: false, join: false }); const w = A.w; const W = w.World, S = w.State;
w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0;
const out = [];
const save = (label, setup) => { S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; W.start(); W.encounter = () => { };
  setup(d); if (W.map && W.player) d.pos = { map: W.map.id, x: W.player.x, y: W.player.y, dir: W.player.dir }; out.push({ label, data: JSON.parse(JSON.stringify(d)) }); };
const field = (id) => { for (const k of Object.keys(w.MAP_DEFS)) { const dd = w.MAP_DEFS[k]; if (!(dd.region || dd.kind === 'field')) continue; const q = (dd.warps || []).find((z) => z.to === id); if (q) return q; } return null; };
const towns = (process.argv[3] || 'dow_village,volatilia,rivel_town,harbor_town,sahar_city,verum_town').split(',');
const NEW = JSON.parse(fs.readFileSync(process.argv[4] || '/home/claude/work/v81/plans/after.json', 'utf8'));
for (const id of towns) {
  const f = field(id); if (f) save(id + '：外から入った所（入口）', () => { W.enterMap(id, f.tx, f.ty, 'up'); });
  // 今は新しい建物が建っている所：前の版で歩けたマスのうち、同じ座標が新しい地図で建物・壁になる所（3 か所）
  const m = W.getMap(id); const nm = NEW[id]; const picks = [];
  if (nm) for (let y = 1; y < m.h - 1 && picks.length < 3; y += 3) for (let x = 1; x < m.w - 1 && picks.length < 3; x += 5) { if (!m.passable(x, y, S.data) || m.npcAt(x, y) || m.warpAt(x, y)) continue; const t = nm.tiles[y] && nm.tiles[y][x]; if (t && /^bld/.test(t)) picks.push([x, y]); }
  picks.forEach((p) => save(id + '：今は建物が建っている所 ' + p.join(','), () => { W.enterMap(id, p[0], p[1], 'down', { raw: true }); }));
}
// 屋内の階段のそば・条件つきの出来事の途中
[['harbor_inn', '宿の 2 階への階段のそば'], ['sahar_inn', '宿の 2 階への階段のそば'], ['verum_inn', '宿の 2 階への階段のそば']].forEach(([id, label]) => { const m = W.getMap(id); const st = m.warps.find((q) => /_2f$/.test(q.to)); save(id + '：' + label, () => { W.enterMap(id, st.x, st.y + 1, 'up', { raw: true }); }); });
save('rivel_castle：地下への階段のそば', () => { const m = W.getMap('rivel_castle'); const st = m.warps.find((q) => q.to === 'rivel_castle_b1'); W.enterMap('rivel_castle', st.x - 1, st.y, 'right', { raw: true }); });
save('vol_under_gate：解放の前（守衛の前）', () => { const m = W.getMap('vol_under_gate'); const g = m.npcs.find((n) => n.id === 'va_underguard'); W.enterMap('vol_under_gate', g.x, g.y + 1, 'up', { raw: true }); });
save('vol_library：断片探しの途中（1 つ目を見つけたあと）', (d) => { d.quests.academy_ancient = { state: 'active' }; d.flags.acad_a_show = true; d.flags.acad_frag_1 = true; W.enterMap('vol_library', 5, 6, 'up', { raw: true }); });
save('verum_town：解放の前（監督官の館の前）', () => { const m = W.getMap('verum_town'); const b = m.buildings.find((q) => q.id === 'overseer'); W.enterMap('verum_town', b.doorFront.x, b.doorFront.y, 'up', { raw: true }); });
fs.writeFileSync(process.argv[2], JSON.stringify(out)); console.log('古いセーブ ' + out.length + ' 件 → ' + process.argv[2]);
