// v8.3 トレードマスターの確かめ（3D 版・ヘッドレス Chromium）：見た目の画像 → 話しかける（キー入力）→ 1本勝負（チャートでロング）→ 結果・賞金
// MAP=rivel_town（既定）・SIDE=long|short|skip・VP・Q
const { chromium } = require('playwright'); const fs = require('fs'); const PORT = process.env.PORT || 8791; const MAP = process.env.MAP || 'rivel_town'; const SIDE = process.env.SIDE || 'long';
const OUT = process.env.OUT || '/home/claude/work/p3d/shots/v83/tm/'; fs.mkdirSync(OUT, { recursive: true }); const VP = (process.env.VP || '1280x720').split('x').map(Number); const TAG = process.env.TAG || MAP;
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: VP[0], height: VP[1] } });
  await ctx.addInitScript((q) => { try { localStorage.setItem('mtq3d-quality', q); } catch (e) { } }, process.env.Q || 'high');
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; d.settings.ultTime = 16; d.gold = 100; World.start(); World.encounter = () => { }; });
  // トレードマスターのとなり（南）に立つ
  const at = await p.evaluate((id) => { World.busy = false; const m = World.getMap(id); const n = m.npcs.find((q) => q.tradeMaster83); if (!n) return null; return { id: n.id, x: n.x, y: n.y, name: n.name, info: n.tradeMaster83 }; }, MAP);
  if (!at) { console.log('トレードマスターがいない', MAP); await br.close(); process.exit(1); }
  await p.evaluate(([id, x, y]) => { World.busy = false; World.enterMap(id, x, y + 1, 'up', { raw: true }); }, [MAP, at.x, at.y]);
  await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, MAP, { timeout: 180000 }); await p.waitForTimeout(1500);
  const look = await p.evaluate(() => ({ tm3d: MTQ3D.current.tradeMasters83 || 0 }));
  await p.screenshot({ path: OUT + TAG + '_look.jpg', type: 'jpeg', quality: 80, timeout: 240000 });
  // 話しかける：決定キー → 初めての挨拶（決定キーで送る）→ 選択（1本勝負）
  const gold0 = await p.evaluate(() => State.data.gold);
  await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  let opened = false; const steps = [];
  for (let i = 0; i < 20 && !opened; i++) { opened = await p.evaluate(() => !!(window.ChartBattleUI && ChartBattleUI.isOpen)); if (opened) break; const txt = await p.evaluate(() => { const l = document.querySelector('#win-layer, .win-layer') || document.body; return (l.innerText || '').slice(-80).replace(/\s+/g, ' '); }); steps.push(txt.slice(-50)); if (i === 4) await p.screenshot({ path: OUT + TAG + '_talk.jpg', type: 'jpeg', quality: 80, timeout: 240000 }); await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
  if (!opened) { console.log('チャートが開かない', JSON.stringify(steps.slice(-6)), errs); await p.screenshot({ path: OUT + TAG + '_stuck.jpg', type: 'jpeg', quality: 80, timeout: 240000 }); await br.close(); process.exit(1); }
  // 相手が先に決めるのを待ってから（最大 7 秒）、プレイヤーが決める
  // ページの中で：相手が決めたらすぐ（または残り 1.5 秒で）プレイヤーが決める（画像を撮る時間で時間切れにならないように）
  const dec = await p.evaluate(async (side) => { const t0 = performance.now(); for (let i = 0; i < 400; i++) { const r = ChartBattleUI.ctl.rival(); const sim = ChartBattleUI.ctl.sim; if ((r && r.done) || sim.timeLeft(performance.now()) < 1500) break; await new Promise((q) => setTimeout(q, 50)); }
    const ok = ChartBattleUI.ctl.decide(side); const r = ChartBattleUI.ctl.rival(); return { ok, ms: Math.round(performance.now() - t0), decideMs: ChartBattleUI.ctl.sim.decideMs, rival: r ? { done: r.done, side: r.side, pos: r.pos } : null }; }, SIDE);
  const rv0 = dec.rival; console.log('DECIDE', JSON.stringify(dec));
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + TAG + '_rival.jpg', type: 'jpeg', quality: 80, timeout: 240000 });
  await p.waitForFunction(() => ChartBattleUI.ctl.state().result, null, { timeout: 60000 }); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + TAG + '_result.jpg', type: 'jpeg', quality: 80, timeout: 240000 });
  const res = await p.evaluate(() => { const o = ChartBattleUI.last || null; return null; });
  await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  const last = await p.evaluate(() => { const o = ChartBattleUI.last; return o ? { side: o.side, me: o.result && { outcome: o.result.outcome, pips: o.result.pips }, op: o.rival && { side: o.rival.side, outcome: o.rival.result.outcome, pips: o.rival.result.pips } } : null; });
  // 結果の言葉（決定キーで送る）→「もう一勝負？」→ やめる（↓ → 決定）
  for (let i = 0; i < 8; i++) { const ch = await p.evaluate(() => /もう一勝負/.test(document.body.innerText || '')); if (ch) break; await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
  await p.screenshot({ path: OUT + TAG + '_after.jpg', type: 'jpeg', quality: 80, timeout: 240000 });
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(500); for (let i = 0; i < 3; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
  const after = await p.evaluate(() => ({ gold: State.data.gold, tm83: State.data.tm83 && { wins: State.data.tm83.wins, losses: State.data.tm83.losses, draws: State.data.tm83.draws, paid: State.data.tm83.paid, gold: State.data.tm83.gold }, busy: World.busy, open: ChartBattleUI.isOpen }));
  const prize = await p.evaluate((t) => TradeMaster83.prize(t, 1), at.info.tier);
  console.log('LAST', JSON.stringify(last), JSON.stringify(rv0)); const j = last && last.me && last.op ? (function () { const a = last.me.outcome === 'skip' ? 0 : last.me.pips, b = last.op.outcome === 'skip' ? 0 : last.op.pips; return a - b >= 0.1 ? 1 : b - a >= 0.1 ? -1 : 0; })() : null;
  const goldOk = j === 1 ? after.gold === gold0 + prize : after.gold === gold0;
  const out = { map: MAP, master: at, look, rival: rv0, last, judge: j, gold0, after, prize, goldOk, errs };
  fs.writeFileSync(OUT + TAG + '_result.json', JSON.stringify(out, null, 1));
  console.log('RESULT', MAP, 'tm3d', look.tm3d, 'rival', JSON.stringify(rv0), 'me', JSON.stringify(last && last.me), 'op', JSON.stringify(last && last.op), 'judge', j, 'gold', gold0, '->', after.gold, 'prize', prize, goldOk ? 'OK' : 'NG', 'stats', JSON.stringify(after.tm83), 'pageerrors', errs.length);
  await br.close();
})().catch((e) => { console.log(e.stack); process.exit(1); });
