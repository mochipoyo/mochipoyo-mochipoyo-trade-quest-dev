// v7.9.3 推奨レベルの表示・馬車と船の出会いの率（jsdom）
// 使い方：node reclevel793_test.js（2D 版の配置と、3D 版の地球の世界の両方）
const load = require('../v78/load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
function setup(opts) {
  const A = load(opts); const w = A.w; const W = w.World, S = w.State; const toasts = [];
  w.Win.message = async () => { }; w.Win.toast = (t) => toasts.push(t);
  S.newGame('t', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; W.start();
  return { A, w, W, S, d, toasts };
}
const hudRec = (w) => { const e = w.document.querySelector('#hud .hud-rec'); return e ? e.textContent : null; };
const banner = (w) => { const e = w.document.getElementById('rec-banner'); return e ? e.textContent : null; };
function near(w, m, d, x, y) { for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < m.w && Y < m.h && m.passable(X, Y, d) && !m.warpAt(X, Y) && !w.Tiles.isWater(m.tiles[Y][X])) return [X, Y]; } return null; }

function common(label, ctx) {
  const { A, w, W, d } = ctx; const R = w.RecLevel;
  ok(!A.errors.length && !!R, label + '：読み込みのエラーなし ' + A.errors.slice(0, 2).join(' / '));
  // 表（docs/balance-v67.md の 1.）
  const t = [[1, [2, 2]], [5, [6, 7]], [10, [10, 12]], [13, [18, 22]], [22, [33, 40]], [37, [53, 65]]];
  ok(t.every(([lv, r]) => JSON.stringify(R.range(lv)) === JSON.stringify(r)), label + '：地帯の level → 推奨レベル（表の値どおり）' + t.map(([lv]) => lv + '→' + R.range(lv).join('〜')).join(' '));
  ok(R.range(43)[0] > 53 && R.range(43)[1] > 65 && R.range(9)[0] >= 9 && R.range(9)[1] <= 12, label + '：表のあいだ・表より上もなめらか ' + JSON.stringify({ 9: R.range(9), 43: R.range(43) }));
  // フィールド（始まりの地図）
  const m = W.getMap('world'); const poyo = m.def.locations.find((l) => l.id === 'poyo_village'); const p = near(w, m, d, poyo.x, poyo.y + 1);
  W.enterMap('world', p[0], p[1], 'down', { raw: true }); const r1 = R.at();
  ok(r1 && r1.lo >= 1 && r1.hi <= 6 && /^推奨Lv /.test(hudRec(w) || ''), label + '：ポヨ村の前のフィールド → 地名のとなりに「' + hudRec(w) + '」（' + (r1 && r1.zone) + '・level ' + (r1 && r1.level) + '）');
  ok(/推奨レベル/.test(banner(w) || '') && /アルカディア/.test(banner(w) || ''), label + '：フィールドに入ると画面の上に表示「' + banner(w) + '」');
  // 町に入ると出さない → 出るとまた出す
  W.enterMap('poyo_village', 5, 5, 'down', { raw: true }); ok(hudRec(w) === null && R.at() === null, label + '：町の中では出さない');
  const before = R.last && R.last.at; R.last = null; W.enterMap('world', p[0], p[1], 'down', { raw: true }); ok(R.last && /推奨レベル/.test(R.last.text), label + '：町から出ると、また表示する');
  // 同じ場所で歩いても出し直さない
  R.last = null; W.updateHud(); ok(R.last === null, label + '：同じ地帯で歩いているあいだは出し直さない');
  // ダンジョン
  W.enterMap('oblivion_cave_1', 3, 3, 'down', { raw: true }); const r3 = R.at(); ok(r3 && r3.level === 5 && JSON.stringify([r3.lo, r3.hi]) === '[6,7]' && /忘却の洞窟/.test(R.last && R.last.text), label + '：忘却の洞窟（地帯 level 5）→ 推奨 Lv 6〜7 ' + (R.last && R.last.text));
  // 色（パーティーの平均レベルと比べる）
  const hero = d.hero || w.State.partyActors()[0]; const lv0 = hero.level; hero.level = 1; ok(R.grade({ lo: 6, hi: 7 }) === 'hard', label + '：平均 Lv が下の数より低い → きびしめ（赤）'); hero.level = 30; ok(R.grade({ lo: 6, hi: 7 }) === 'easy', label + '：上の数より 5 以上高い → 楽（灰色）'); hero.level = lv0;
  // 出会いの率
  ok(w.Carriage.ENC === 0.35, label + '：馬車の出会いの率 ×0.35（前 ×0.8）');
  ok(w.VEHICLES.sailboat.encounters.rate === 0.012 && w.VEHICLES.galleon.encounters.rate === 0.012, label + '：船の出会いの率 1 歩 0.012（前 0.03）');
  d.flags.ship_ready = true; w.Vehicle.unlockIfReady(); d.aboard = 'sailboat'; const e1 = w.Vehicle.encounters(); ok(Math.abs(e1.rate - 0.012) < 1e-9, label + '：船に乗っているときの率 ' + e1.rate);
  const rs = R.at(W.getMap('world'), d.vehicles.sailboat.x, d.vehicles.sailboat.y); ok(rs && rs.kind === 'sea' && rs.level === 9, label + '：船の上は船の出現表の地帯（' + (rs && rs.zone) + '・level ' + (rs && rs.level) + ' → ' + (rs && rs.lo + '〜' + rs.hi) + '）');
  d.aboard = null;
}
(async () => {
  console.log('--- 2D 版'); const c2 = setup({ join: false, earth: false }); common('2D 版', c2);
  // フィールドの中で地帯が変わると出す（始まりの草原 → 別の地帯）
  { const { w, W, d } = c2; const R = w.RecLevel; const m = W.getMap('world'); let found = null;
    for (let y = 0; y < m.h && !found; y++) for (let x = 0; x < m.w - 1 && !found; x++) { if (!m.passable(x, y, d) || !m.passable(x + 1, y, d) || m.warpAt(x, y) || m.warpAt(x + 1, y)) continue; const a = R.zoneAt(m, x, y), b = R.zoneAt(m, x + 1, y); if (a && b && a.name !== b.name && R.zoneLevel(a) !== R.zoneLevel(b)) found = [x, y, a.name, b.name]; }
    if (found) { W.enterMap('world', found[0], found[1], 'right', { raw: true }); R.last = null; W.player.x = found[0] + 1; W.updateHud(); ok(R.last && R.last.text.indexOf(found[3]) >= 0, '2D 版：フィールドの中で地帯が変わると出す（' + found[2] + ' → ' + found[3] + '：' + (R.last && R.last.text) + '）'); }
    else ok(false, '2D 版：地帯の境目が見つからない'); }
  console.log('--- 3D 版の地球の世界'); const c3 = setup({}); common('地球の世界', c3);
  { const { w, W, d } = c3; const R = w.RecLevel;
    // 地域を移ると出す（グラニア・リシア砂漠・新しい地域）
    for (const [rid, loc, lo, hi] of [['world_grania', 'verum_town', 9, 18], ['world_desert', 'sahar_city', 30, 46], ['world_meridian', null, 35, 55]]) {
      const m = W.getMap(rid); const L = loc ? m.def.locations.find((l) => l.id === loc) : m.def.locations[0]; const p = near(w, m, d, L.x, L.y); R.last = null; W.enterMap(rid, p[0], p[1], 'down', { raw: true }); const r = R.at();
      ok(r && r.lo >= lo && r.hi <= hi && R.last && R.last.text.indexOf(m.name) >= 0, '地球の世界：' + m.name + 'に入ると「' + (R.last && R.last.text) + '」'); }
    // 外の地図（自動で作る地図）
    const outer = Object.keys(w.MAP_DEFS).find((id) => /^w78_/.test(id) && w.MAP_DEFS[id].kind === 'field'); if (outer) { const m = W.getMap(outer); let p = null; for (let y = 2; y < m.h - 2 && !p; y += 3) for (let x = 2; x < m.w - 2 && !p; x += 3) if (m.passable(x, y, d) && !w.Tiles.isWater(m.tiles[y][x]) && R.zoneAt(m, x, y)) p = [x, y];
      if (p) { R.last = null; W.enterMap(outer, p[0], p[1], 'down', { raw: true }); ok(R.last && /推奨レベル/.test(R.last.text), '地球の世界：外の地図（' + m.name + '）でも出す「' + (R.last && R.last.text) + '」'); } else ok(true, '（外の地図に陸がない：飛ばした）'); }
  }
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
