// v8.0 新しいボス 19 体・異界の門・ボスの間（jsdom）
// ・データ：ID の重複なし・表示名はパックの display_name のまま・画像のファイルと sha256・特殊行動と呪文がある・報酬の装備と道具
// ・強さ：いまのデータが boss19_verify.json（勝率を測ったときの数値）と同じ・これまでの章のボスより HP が多い
// ・門：19 か所すべて外の地図に置けた・門の前（出る所）は歩ける陸で、外の地図の広い陸とつながっている
// ・門を調べる → 入る → ボスの間（推奨レベルの表示）→ 奥のボスまで歩ける → 戦う（戦闘は勝ったことにする）→ 報酬 → 魔法陣で門の前へ
// ・脱出の羽：ボスの間から門の前へ。19 体すべてに勝つと「十九の契約印」（1 回だけ）
// ・セーブ：ボスの間でセーブ → 読む（3D の地球）／前の版（v7.9.3）のセーブを読む／2D 版で読む（ボスの間がない → 外へ）
// 使い方：node boss19_test.js   （OLD793＝v7.9.3 のスナップショット。既定 /home/claude/envsnap_t94/。なければその項目は飛ばす）
const load = require('../v78/load78.js'); const fs = require('fs'); const crypto = require('crypto'); const path = require('path');
const ROOT = path.resolve(__dirname, '../../..') + '/';
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function setup(opts) {
  const A = load(opts); const w = A.w; const W = w.World, S = w.State; const log = []; const ch = [];
  w.Win.message = async (l) => { log.push([].concat(l || []).join('／')); }; w.Win.toast = (t) => log.push('toast:' + t);
  w.Win.choice = async (p, o) => { log.push('choice:' + p + '[' + o.join('|') + ']'); return ch.length ? ch.shift() : 0; };
  if (w.BossSymbol) w.BossSymbol.intro = async () => { };
  S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; W.start();
  return { A, w, W, S, d, log, ch };
}
function flood(m, d, sx, sy, pass) { const seen = new Set([sx + ',' + sy]); const q = [[sx, sy]]; for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; for (const [dx, dy] of V4) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || X < 0 || Y < 0 || X >= m.w || Y >= m.h || !pass(X, Y)) continue; seen.add(k); q.push([X, Y]); } } return seen; }

(async () => {
  const E0 = setup({}); const { A, w, W, d, log } = E0; const BB = w.BOSS19, LA = w.EARTH78_LAIRS, E = w.ENEMIES, IT = w.ITEMS;
  ok(!A.errors.length, '読み込みのエラーなし ' + A.errors.slice(0, 2).join(' / '));
  /* ---------- データ ---------- */
  const man = JSON.parse(fs.readFileSync(__dirname + '/boss19_manifest.json', 'utf8')).bosses;
  ok(BB && BB.list.length === 19 && BB.bosses.length === 19 && LA.length === 19 && man.length === 19, 'ボス 19 体・画像 19・門 19（パックの bosses.json も 19）');
  const ids = BB.bosses.map((b) => b.id); ok(new Set(ids).size === 19 && ids.every((id) => /^tq_boss_/.test(id)), 'ボスの ID は重複なし・tq_boss_ で始まる');
  const nameNg = man.filter((m) => !E[m.asset_id] || E[m.asset_id].name !== m.display_name).map((m) => m.asset_id + ':' + (E[m.asset_id] || {}).name);
  ok(!nameNg.length, '19 体とも、敵の名前はパックの display_name のまま ' + nameNg.join(' '));
  const before = fs.readFileSync(ROOT + 'js/data/enemies.js', 'utf8') + fs.readFileSync(ROOT + 'js/data/enemies-add35.js', 'utf8') + fs.readFileSync(ROOT + 'js/data/boss-redesign.js', 'utf8');
  ok(ids.every((id) => before.indexOf("'" + id + "'") < 0 && before.indexOf(id + ':') < 0), 'これまでの敵のデータに同じ ID はない');
  const artNg = man.filter((m) => { const a = BB.list.find((q) => q.id === m.asset_id); if (!a) return true; const f = ROOT + a.file; if (!fs.existsSync(f)) return true; const h = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); return h !== m.webp_sha256 || a.sha256 !== h; }).map((m) => m.asset_id);
  ok(!artNg.length, '画像 19 枚：assets/bosses_19/ にあり、sha256 がパックと同じ（webp 1024）' + artNg.join(' '));
  const EA = w.EnemyArt; ok(EA && ids.every((id) => EA.adopted && EA.adopted(id)), '戦闘の画像（EnemyArt）に 19 体とも登録');
  const SP = w.ENEMY_SPECIALS || {}; const SK = w.SKILLS || {};
  const actNg = []; BB.bosses.forEach((b) => (E[b.id].actions || []).forEach((a) => { if (a.type === 'special' && !SP[a.id]) actNg.push(b.key + ':' + a.id); if (a.type === 'skill' && !SK[a.id]) actNg.push(b.key + ':' + a.id); }));
  ok(!actNg.length, 'ボスの行動の特殊行動・呪文はすべてある ' + actNg.join(' '));
  const rw = Object.keys(BB.reward).map((k) => BB.reward[k]).concat([BB.allReward]); const rwNg = rw.filter((id) => !IT[id]);
  ok(rw.length === 20 && !rwNg.length && new Set(rw).size === 20, '報酬：19 体それぞれの装備・道具＋全部倒した記念「' + (IT[BB.allReward] || {}).name + '」がある ' + rwNg.join(' '));
  const growNg = BB.bosses.filter((b) => !IT[b.grow]).map((b) => b.key); ok(!growNg.length, '能力の最大値を上げる道具（2 つずつ）もある ' + growNg.join(' '));
  /* ---------- 強さ ---------- */
  const V = JSON.parse(fs.readFileSync(__dirname + '/boss19_verify.json', 'utf8'));
  const vNg = BB.bosses.filter((b) => { const v = V[b.key]; const e = E[b.id]; return !v || v.HP !== e.hp || v.ATK !== e.atk || v.MAG !== e.mag; }).map((b) => b.key + ' ' + E[b.id].hp + '/' + (V[b.key] || {}).HP);
  ok(!vNg.length, 'いまの HP・攻撃・魔力は、勝率を測ったとき（boss19_verify.json）と同じ ' + vNg.join(' '));
  const fNg = BB.bosses.filter((b) => { const v = V[b.key]; return !(v && v.f2.win >= 0.3 && v.f2.win <= 0.7 && v.f3.win >= 0.7); }).map((b) => b.key);
  ok(!fNg.length, '測った勝率：推奨レベルの下の数で 30〜70%・6 レベル上で 70% 以上（通常のボスは同じ条件で 87% 以上：boss19_compare.json）' + fNg.join(' '));
  const C = JSON.parse(fs.readFileSync(__dirname + '/boss19_compare.json', 'utf8')); const cMin = Math.min(...Object.keys(C).map((k) => C[k].f2.win));
  ok(cMin >= 0.85 && BB.bosses.every((b) => V[b.key].f2.win < cMin - 0.15), 'これまでの章のボス（同じ条件の F2 で勝率 ' + Math.round(cMin * 100) + '% 以上）より、新しいボスは勝ちにくい');
  /* ---------- 門 ---------- */
  const pass = (m) => (X, Y) => m.passable(X, Y, d) && !w.Tiles.isWater(m.tiles[Y][X]);
  for (const L of LA) {
    const m = W.getMap(L.map); const ev = m.events.find((e) => e.lair19 === L.key);
    const placed = ev && L.x === ev.x && L.y === ev.y && L.ox === ev.x && L.oy === ev.y + 1;
    const out = placed && m.passable(L.ox, L.oy, d) && !w.Tiles.isWater(m.tiles[L.oy][L.ox]) && !m.warpAt(L.ox, L.oy);
    const area = out ? flood(m, d, L.ox, L.oy, pass(m)).size : 0; let land = 0; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (pass(m)(x, y)) land++;
    const ld = w.MAP_DEFS[L.id]; const rc = L.rec();
    ok(placed && out && area >= Math.min(200, land * 0.3) && ld && ld.recLevel && ld.recLevel[0] === rc[0],
      '門「' + L.name + '」（' + E[L.boss].name + '）：' + m.name + '（' + L.map + '）の ' + L.x + ',' + L.y + '・前の陸は外の陸 ' + area + '/' + land + ' マスとつながる・推奨Lv ' + rc.join('〜'));
  }
  /* ---------- 門 → ボスの間 → ボス → 外 ---------- */
  const L = LA.find((q) => q.key === 'nanpin'); const b = BB.bosses.find((q) => q.key === 'nanpin');
  W.enterMap(L.map, L.ox, L.oy, 'up', { raw: true }); const m = W.map; const gev = m.eventAt(L.x, L.y);
  ok(gev && gev.lair19 === 'nanpin' && gev.solid, '門の前で上を向くと、門（調べられる・通れない）');
  log.length = 0; E0.ch.push(0); await w.Events.run(gev);
  ok(log.some((t) => /異界の門/.test(t) && /推奨レベル Lv \d+〜\d+/.test(t) && t.indexOf(E[b.id].name) >= 0) && W.map.id === L.id && W.player.x === 10 && W.player.y === 13, '門を調べる → ボスの名前と推奨レベル → 「入る」でボスの間（' + W.map.name + '）' + JSON.stringify(log.slice(0, 1)));
  const de = d.dungeonEntry; ok(de && de.map === L.map && de.x === L.ox && de.y === L.oy, '入った所（門の前）を記録 ' + JSON.stringify(de));
  const r = w.RecLevel.at(W.map); ok(r && r.fixed && r.lo === L.rec()[0] && r.hi === L.rec()[1], 'ボスの間の推奨レベル ' + w.RecLevel.text(r));
  const lm = W.map; const bev = lm.events.find((e) => e.type === 'boss'); const pv = flood(lm, d, 10, 13, (X, Y) => lm.passable(X, Y, d));
  ok(bev && bev.enemies[0] === b.id && pv.has(bev.x + ',' + (bev.y + 1)), '入口から奥のボス（' + bev.x + ',' + bev.y + '）の前まで歩ける');
  const chk = w.DungeonExit.check(lm); ok(chk.ok && chk.dest.map === L.map && chk.dest.x === L.ox && chk.dest.y === L.oy, '脱出の羽・帰還の術：行き先は門の前 ' + (chk.dest ? chk.dest.label : chk.reason));
  // 戦わない
  E0.ch.push(1); await w.Events.run(bev); ok(!d.flags[L.flag], '「戦いますか？」で「やめておく」→ 戦わない');
  // 勝つ
  let started = null; w.BattleUI.start = async (ids2, o) => { started = { ids2, o }; return 'won'; };
  const inv0 = (id) => d.inventory[id] || 0; const g0 = d.gold, eq = BB.reward.nanpin, gr0 = inv0(b.grow);
  log.length = 0; E0.ch.push(0); await w.Events.run(bev);
  ok(started && started.ids2[0] === b.id && started.o.boss, 'ボス戦（' + E[b.id].name + '・ボスの扱い）');
  ok(d.flags[L.flag] && w.State.hasItem(eq) && d.gold === g0 + b.lv * 150 && log.some((t) => t.indexOf(IT[eq].name) >= 0 && /1\/19/.test(t)), '勝つと「' + IT[eq].name + '」・' + IT[b.grow].name + '×2・' + b.lv * 150 + 'G（異界の門のボス 1/19）');
  ok(inv0(b.grow) === gr0 + 2 && inv0(eq) === 1, '能力の最大値を上げる道具は 2 つ・装備は 1 つ（持ち物の数 ' + gr0 + ' → ' + inv0(b.grow) + '）');
  log.length = 0; await w.Events.run(bev); ok(log.some((t) => /気配はもうない/.test(t)), '倒したあとに調べると「気配はもうない」');
  // 魔法陣で外へ
  const xev = lm.eventAt(10, 14); E0.ch.push(0); await w.Events.run(xev);
  ok(W.map.id === L.map && W.player.x === L.ox && W.player.y === L.oy, '入口の魔法陣で、門の前（' + L.ox + ',' + L.oy + '）へ戻る');
  log.length = 0; E0.ch.push(1); await w.Events.run(gev); ok(log.some((t) => /もうない/.test(t)), '倒したボスの門は「気配はもうない」（入ることはできる）');
  const mm = w.Minimap && w.Minimap.lairs19 ? w.Minimap.lairs19() : []; const me = mm.find((q) => q.L.key === 'nanpin');
  ok(me && me.done && me.s.x === L.x, '地図（地域の地図・小さな地図）に異界の門の印（倒した印つき）');
  // 19 体すべて
  w.BattleUI.start = async () => 'won'; let allN = 0;
  for (const L2 of LA) { if (d.flags[L2.flag]) continue; W.enterMap(L2.id, 10, 13, 'up', { raw: true }); const e2 = W.map.events.find((e) => e.type === 'boss'); log.length = 0; E0.ch.push(0); await w.Events.run(e2); if (log.some((t) => /十九の契約印|すべてに勝った/.test(t))) allN++; }
  ok(d.flags.b19_all && w.State.hasItem(BB.allReward) && allN === 1 && BB.bosses.every((q) => w.State.hasItem(BB.reward[q.key])), '19 体すべてに勝つと「' + IT[BB.allReward].name + '」（1 回だけ）・19 の装備・道具もそろう');
  /* ---------- セーブ ---------- */
  const L3 = LA.find((q) => q.key === 'mochiko'); W.enterMap(L3.id, 10, 13, 'up', { raw: true }); d.pos = { map: L3.id, x: 10, y: 13, dir: 'up' }; const txt = JSON.stringify(d);
  const S2 = setup({}); S2.w.State.data = JSON.parse(txt); S2.W.start(); const u = S2.w.State.data;
  ok(S2.W.map.id === L3.id && u.flags.b19_all && S2.w.State.hasItem(BB.allReward), 'ボスの間でセーブ → 読むと、ボスの間から続き（倒した記録・報酬もそのまま）');
  const ck2 = S2.w.DungeonExit.check(S2.W.map); const L3b = S2.w.EARTH78_LAIRS.find((q) => q.key === 'mochiko');
  ok(ck2.ok && ck2.dest.map === L3.map && ck2.dest.x === L3b.ox && L3b.ox === L3.ox, '読んだあと（外の地図をまだ作っていない）でも、脱出の行き先は門の前 ' + JSON.stringify([ck2.dest && ck2.dest.x, ck2.dest && ck2.dest.y]));
  // 2D 版で読む
  const B2 = setup({ join: false, earth: false }); const w2 = B2.w;
  ok(!w2.MAP_DEFS[L3.id] && !w2.ENEMIES[b.id] && !(w2.EARTH78_LAIRS || []).some((q) => w2.MAP_DEFS[q.map]), '2D 版：ボスの間・ボスの敵・門はない（外の地図がない）');
  w2.State.data = JSON.parse(txt); let err2 = null; try { B2.W.start(); } catch (e) { err2 = e.message; }
  const u2 = w2.State.data; ok(!err2 && B2.W.map && w2.MAP_DEFS[B2.W.map.id] && B2.W.map.passable(u2.pos.x, u2.pos.y, u2), '2D 版でボスの間のセーブを読む → エラーなし・行ける地図へ（' + (B2.W.map && B2.W.map.id) + ' ' + u2.pos.x + ',' + u2.pos.y + '）' + (err2 || ''));
  ok(u2.flags.b19_all && w2.State.hasItem(BB.allReward), '2D 版でも、倒した記録と報酬の道具は消さない');
  // 前の版（v7.9.3）のセーブ：門の置かれる所に立っていた
  const OLD = process.env.OLD793 || '/home/claude/envsnap_t94/';
  if (fs.existsSync(OLD + 'index.html') && !fs.existsSync(OLD + 'js/data/bosses19.js')) {
    const O = setup({ dir: OLD }); const g = O.w.State.data; const Lm = LA.find((q) => q.key === 'mesaki'); O.W.enterMap(Lm.map, Lm.x, Lm.y, 'down', { raw: true }); g.pos = { map: Lm.map, x: O.W.player.x, y: O.W.player.y, dir: 'down' }; const t0 = JSON.stringify(g);
    const N2 = setup({}); N2.w.State.data = JSON.parse(t0); let e3 = null; try { N2.W.start(); } catch (e) { e3 = e.message; } const u3 = N2.w.State.data; const p = N2.W.player; const m3 = N2.W.map;
    const canMove = V4.some(([dx, dy]) => m3.passable(p.x + dx, p.y + dy, u3) && !m3.eventAt(p.x + dx, p.y + dy));
    ok(!e3 && m3.id === Lm.map && canMove, '前の版（v7.9.3）のセーブ：門ができる所（' + Lm.map + ' ' + g.pos.x + ',' + g.pos.y + '）に立っていた → エラーなし・その場から歩ける（' + p.x + ',' + p.y + '）' + (e3 || ''));
    ok(!Object.keys(u3.flags).some((k) => /^b19_/.test(k)), '前の版のセーブ：新しいボスはまだ倒していない扱い');
  } else console.log('（v7.9.3 のスナップショットがないので、前の版のセーブの項目は飛ばした）');
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
