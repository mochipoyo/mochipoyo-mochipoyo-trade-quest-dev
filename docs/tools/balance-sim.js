// 自動プレイでのバランス確認（ゲームを jsdom で読み込み、画面は使わない）
//  A. 必殺技50種類：3種類の自動プレイヤー（でたらめ・根拠に従う・必ず見送り）で各技を300回ずつ使い、威力の倍率の期待値を出す（通常攻撃＝1.0）
//  B. 師匠の試験：初級5問・上級10問を、自動プレイヤーごとに各流派200回ずつ受けて合格率を出す
//  C. クイズモンスター：その地域の敵の経験値・ゴールドと比べた報酬の大きさ、正答率ごとの「倒すまでに奪われるゴールド」の期待値
// 使い方: RPG_DIR=... node balance_sim.js [ultN] [examN]
const load = require(process.env.RPG_LOADER || '../rpgload.js'); const { w } = load();   // ゲームを jsdom で読み込む補助（作業環境のもの。リポジトリには含めていない）
const U = w.Ultimates, M = w.Market, CB = w.ChartBattleUI, Q = w.Quiz;
const ULT_N = +(process.argv[2] || 300), EXAM_N = +(process.argv[3] || 200);
const rng = M.rng ? M.rng(20261101) : Math.random;
const r2 = x => Math.round(x * 100) / 100;

// 判断の瞬間（判断の時間12秒・足の間隔＝12000/16=750→850ms で、およそ 0〜14本目のどこか）
function decisionPoint() { return { bar: M.LIVE0 + Math.floor(rng() * 14), tick: Math.floor(rng() * 8) }; }
function bots(as) {
  const bias = as.bias === 'long' ? 'long' : as.bias === 'short' ? 'short' : null; const clear = !!bias && as.clarity >= 0.25;
  return {
    random: rng() < 0.5 ? 'long' : 'short',
    rules: clear && !as.chase && as.volRatio < 2.2 ? bias : 'skip',
    lean: bias || 'skip',   // 見立ての向きがあれば（はっきりしなくても）その向き
    skip: 'skip'
  };
}
function trade(s, side, p) { if (side === 'skip') return { outcome: 'skip' }; return M.settle(s, { bar: p.bar, tick: p.tick, side }); }
// 技の威力の倍率（連撃・追撃・全体攻撃の分も「単体への通常攻撃の何回分か」に直す。全体攻撃は敵2体として数える）
function power(def, res) { if (res.kind === 'skip') return 0; let m = res.mult; if (res.kind === 'profit') { if (res.aoe) m = m * res.aoe * 2; if (res.extra) m += res.extra.hits * res.extra.mult; } return m; }

// ---------- A. 必殺技 ----------
const ult = [];
U.list().forEach(id => {
  const def = U.get(id); const acc = { random: [], rules: [], lean: [], theme: [], skip: [] }; const prof = { random: 0, rules: 0, lean: 0, theme: 0 }; const n = { random: 0, rules: 0, lean: 0, theme: 0 }; const skips = { rules: 0 }; const ent = { random: [], rules: [], lean: [], theme: [] };
  for (let k = 0; k < ULT_N; k++) {
    const s = U.newScenario({ cats: def.cats, diff: U.diffFor(def), rnd: rng, seed: Math.floor(rng() * 1e9) }); const p = decisionPoint();
    const bars = CB.barsAt(s, p.bar, p.tick); const as = M.assess(bars); const b = bots(as);
    { const th = (U.THEME[def.school] || []); const cl = U.conditions(as, 'long'), cs = U.conditions(as, 'short'); const bl = (def.bonus || []).some(x => cl[x.when]) || th.some(k => cl[k]), bs = (def.bonus || []).some(x => cs[x.when]) || th.some(k => cs[k]); b.theme = bl && !bs ? 'long' : bs && !bl ? 'short' : b.rules; }
    Object.keys(b).forEach(kind => { const R = trade(s, b[kind], p); const res = U.resolve(def, { result: R, assessment: as }); const pw = power(def, res); acc[kind].push(pw); if (kind !== 'skip') { if (R.outcome === 'skip') skips[kind] = (skips[kind] || 0) + 1; else { n[kind]++; ent[kind].push(pw); if (R.outcome === 'profit') prof[kind]++; } } });
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const me = a => a.length ? mean(a) : 0;
  ult.push({ id, name: def.name, school: def.school, order: def.order, mp: def.mp, cd: def.cd, random: r2(mean(acc.random)), rules: r2(mean(acc.rules)), lean: r2(mean(acc.lean)), rulesTraded: r2(n.rules / ULT_N), leanTraded: r2(n.lean / ULT_N),
    entRandom: r2(me(ent.random)), entRules: r2(me(ent.rules)), entLean: r2(me(ent.lean)), entTheme: r2(me(ent.theme)), themeTraded: r2(n.theme / ULT_N), winTheme: r2(prof.theme / Math.max(1, n.theme)), winRand: r2(prof.random / Math.max(1, n.random)), winRules: r2(prof.rules / Math.max(1, n.rules)), winLean: r2(prof.lean / Math.max(1, n.lean)) });
});
console.log('=== A. 必殺技（威力の倍率の期待値。通常攻撃1回＝1.0。見送りは0として平均） ===');
const bySchool = {}; ult.forEach(u => { (bySchool[u.school] = bySchool[u.school] || []).push(u); });
Object.keys(bySchool).forEach(sc => { console.log(sc); bySchool[sc].forEach(u => console.log(`  ${u.order}. ${u.name.padEnd(14, '　')} MP${String(u.mp).padStart(3)} CD${u.cd}  入ったときの倍率：でたらめ ${u.entRandom.toFixed(2)}（勝率${Math.round(u.winRand * 100)}%）  見立ての向き ${u.entLean.toFixed(2)}（勝率${Math.round(u.winLean * 100)}%・入った率${Math.round(u.leanTraded * 100)}%）  根拠がそろう時だけ ${u.entRules.toFixed(2)}（勝率${Math.round(u.winRules * 100)}%・入った率${Math.round(u.rulesTraded * 100)}%）  技の条件・流派の根拠 ${u.entTheme.toFixed(2)}（勝率${Math.round(u.winTheme * 100)}%・入った率${Math.round(u.themeTraded * 100)}%）`)); });
const avg = k => r2(ult.reduce((s, u) => s + u[k], 0) / ult.length);
console.log('全体の平均（入ったとき）：でたらめ', avg('entRandom'), '／見立ての向き', avg('entLean'), '／根拠がそろう時だけ', avg('entRules'), '｜勝率：', avg('winRand'), avg('winLean'), avg('winRules'), '｜入った率：見立て', avg('leanTraded'), '根拠', avg('rulesTraded'));
console.log('技の条件・流派の根拠に従う（入ったとき）：', avg('entTheme'), '勝率', avg('winTheme'), '入った率', avg('themeTraded'));
const themeWorse = ult.filter(u => Math.max(u.entRules, u.entTheme) <= u.entRandom); console.log('どの根拠に従っても でたらめ以下の技：', themeWorse.map(u => u.name + '(' + Math.max(u.entRules, u.entTheme) + '≦' + u.entRandom + ')').join('、') || 'なし');
const ruleWorse = ult.filter(u => u.entRules < u.entRandom); console.log('入ったときの倍率が でたらめ以下になる技（根拠がそろう時だけ）：', ruleWorse.map(u => u.name + '(' + u.entRules + '≦' + u.entRandom + ')').join('、') || 'なし');

// ---------- B. 試験 ----------
console.log('\n=== B. 師匠の試験の合格率（自動プレイ） ===');
const exam = [];
U.schools().forEach(sch => {
  ['beginner', 'advanced'].forEach(kind => {
    const nq = kind === 'advanced' ? 10 : 5; const adv = kind === 'advanced'; const pass = { random: 0, rules: 0, theme: 0, lean: 0, skip: 0 }; const avgS = { random: 0, rules: 0, theme: 0, lean: 0, skip: 0 };
    for (let t = 0; t < EXAM_N; t++) {
      const sc = { random: [], rules: [], theme: [], lean: [], skip: [] };
      for (let q = 0; q < nq; q++) {
        const s = U.newScenario({ cats: sch.cats, diff: U.examDiff(sch, kind), rnd: rng, seed: Math.floor(rng() * 1e9) }); const p = decisionPoint();
        const as = M.assess(CB.barsAt(s, p.bar, p.tick)); const b = bots(as);
        // 流派のテーマに沿う：テーマの根拠がある向き。なければ根拠に従う
        const th = (U.THEME[sch.id] || []); const cl = U.conditions(as, 'long'), cs = U.conditions(as, 'short'); const tl = th.some(k => cl[k]), ts = th.some(k => cs[k]);
        b.theme = tl && !ts ? 'long' : ts && !tl ? 'short' : b.rules;
        Object.keys(sc).forEach(kind2 => {
          const side = b[kind2]; const R = trade(s, side, p);
          let reason = null; if (adv) { const keys = ['trend', 'pullback', 'breakout', 'range', 'divergence', 'mtf', 'unclear']; if (kind2 === 'random') reason = keys[Math.floor(rng() * keys.length)]; else reason = keys.find(k => U.reasonMatch(k, as, side)) || 'trend'; }
          sc[kind2].push(U.score({ side, auto: false, result: R, assessment: as, reason }, { advanced: adv, school: sch.id }));
        });
      }
      Object.keys(sc).forEach(k => { const er = U.examResult(kind, sc[k]); if (er.pass) pass[k]++; avgS[k] += er.avg; });
    }
    const row = { school: sch.id, name: sch.name, kind }; Object.keys(pass).forEach(k => { row[k] = r2(pass[k] / EXAM_N); row[k + 'Avg'] = Math.round(avgS[k] / EXAM_N); }); exam.push(row);
    console.log(`  ${sch.name.padEnd(12, '　')} ${kind === 'advanced' ? '上級' : '初級'}  でたらめ ${Math.round(row.random * 100)}%（平均${row.randomAvg}点）  見立ての向き ${Math.round(row.lean * 100)}%（${row.leanAvg}点）  根拠がそろう時だけ ${Math.round(row.rules * 100)}%（${row.rulesAvg}点）  流派の根拠 ${Math.round(row.theme * 100)}%（${row.themeAvg}点）  全部見送り ${Math.round(row.skip * 100)}%（${row.skipAvg}点）`);
  });
});

// ---------- C. クイズモンスター ----------
console.log('\n=== C. クイズモンスター ===');
const MD = w.MAP_DEFS, EN = w.ENEMIES;
function areaGroups(mapId, x, y) {
  const def = MD[mapId] || {}; const enc = def.encounters; if (!enc || !enc.zones) return [];
  const z = enc.zones.find(z => { try { return z.test(x, y); } catch (e) { return false; } }) || enc.zones[0]; return (z.groups || []).map(g => g.filter(id => EN[id]));
}
function areaEnemies(mapId) {
  const def = MD[mapId] || {}; let ids = [];
  const enc = def.encounters || def.encounter || def.enemies; if (Array.isArray(enc)) enc.forEach(e => { if (typeof e === 'string') ids.push(e); else if (e && e.enemies) ids = ids.concat(e.enemies); else if (e && e.id) ids.push(e.id); });
  if (!ids.length && def.region && Array.isArray(def.region.encounters)) ids = def.region.encounters;
  return ids.filter(id => EN[id]);
}
const quiz = [];
(w.QUIZ_MONSTERS || []).forEach(m => {
  const groups = areaGroups(m.map, m.x, m.y).filter(g => g.length); const ids = [].concat(...groups);
  // 1回の戦闘あたり（グループの敵の合計）の平均
  const ex = groups.length ? groups.reduce((s, g) => s + g.reduce((t, id) => t + (EN[id].exp || 0), 0), 0) / groups.length : null; const gd = groups.length ? groups.reduce((s, g) => s + g.reduce((t, id) => t + (EN[id].gold || 0), 0), 0) / groups.length : null;
  const lv = ids.length ? ids.reduce((s, id) => s + (EN[id].lv || 0), 0) / ids.length : null;
  // 正答率ごとの「倒すまでに奪われるゴールドの期待値」（所持金は G0。モンテカルロ 20000回）
  const sim = (pAcc, g0) => { let lost = 0, tries = 0; const N = 20000; for (let k = 0; k < N; k++) { let g = g0; let t = 0; while (true) { t++; if (rng() < pAcc) break; const st = Q.stealAmount(g, m.steal); g -= st; lost += st; if (t > 200) break; } tries += t; } return { lost: Math.round(lost / N), tries: r2(tries / N) }; };
  const G0 = m.steal.cap / m.steal.rate;   // 上限に届く所持金
  const row = { id: m.id, name: m.name, map: m.map, enemies: ids.length, enemyExp: ex && Math.round(ex), enemyGold: gd && Math.round(gd), enemyLv: lv && r2(lv), exp: m.exp, gold: m.gold, cap: m.steal.cap,
    expBattles: ex ? r2(m.exp / ex) : null, goldBattles: gd ? r2(m.gold / gd) : null, capBattles: gd ? r2(m.steal.cap / gd) : null,
    p25: sim(0.25, G0), p50: sim(0.5, G0), p80: sim(0.8, G0) };
  quiz.push(row);
  console.log(`  ${m.name}（${m.map}）  地域の戦闘 ${groups.length}通り（敵の平均Lv${row.enemyLv}）：1戦あたり 経験値${row.enemyExp}・${row.enemyGold}G  →  報酬 経験値${m.exp}（${row.expBattles}戦分）・${m.gold}G（${row.goldBattles}戦分）  奪われる上限${m.steal.cap}G（${row.capBattles}戦分）`);
  console.log(`      所持金${Math.round(G0)}G から：正答率25%（でたらめ）なら平均${row.p25.tries}回で倒し、奪われる計${row.p25.lost}G／50%：${row.p50.tries}回・${row.p50.lost}G／80%：${row.p80.tries}回・${row.p80.lost}G`);
});
require('fs').writeFileSync(process.env.OUT || 'balance_result.json', JSON.stringify({ ult, exam, quiz, ULT_N, EXAM_N }, null, 1));
console.log('\n保存: ' + (process.env.OUT || 'balance_result.json'));
