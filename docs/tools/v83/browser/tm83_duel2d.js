// v8.3 トレードマスター（2D 版・ヘッドレス Chromium）：話しかける（キー入力）→ 1本勝負 → 結果
const { chromium } = require('playwright'); const fs = require('fs'); const PORT = process.env.PORT || 8791; const MAP = process.env.MAP || 'rivel_town';
const OUT = '/home/claude/work/p3d/shots/v83/tm/';
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForFunction(() => window.World && window.State && window.Engine && window.TradeMaster83, null, { timeout: 120000 }); await p.waitForTimeout(1200);
  const at = await p.evaluate((id) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; d.settings.ultTime = 16; d.gold = 100; World.start(); World.encounter = () => { };
    const m = World.getMap(id); const n = m.npcs.find((q) => q.tradeMaster83); World.busy = false; World.enterMap(id, n.x, n.y + 1, 'up', { raw: true }); return { x: n.x, y: n.y, name: n.name, tier: n.tradeMaster83.tier }; }, MAP);
  await p.waitForTimeout(1000); const gold0 = await p.evaluate(() => State.data.gold);
  await p.keyboard.press('Enter'); await p.waitForTimeout(500); let opened = false;
  for (let i = 0; i < 20; i++) { opened = await p.evaluate(() => !!ChartBattleUI.isOpen); if (opened) break; if (i === 3) await p.screenshot({ path: OUT + 'tm2d_talk.jpg', type: 'jpeg', quality: 80 }); await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
  if (!opened) { console.log('開かない', errs); await br.close(); process.exit(1); }
  const dec = await p.evaluate(async () => { for (let i = 0; i < 400; i++) { const r = ChartBattleUI.ctl.rival(); if ((r && r.done) || ChartBattleUI.ctl.sim.timeLeft(performance.now()) < 1500) break; await new Promise((q) => setTimeout(q, 50)); } const ok = ChartBattleUI.ctl.decide('long'); return { ok }; });
  await p.waitForFunction(() => ChartBattleUI.ctl.state().result, null, { timeout: 60000 }); await p.waitForTimeout(500); await p.screenshot({ path: OUT + 'tm2d_result.jpg', type: 'jpeg', quality: 80 });
  await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  const last = await p.evaluate(() => { const o = ChartBattleUI.last; return { me: o.result && { outcome: o.result.outcome, pips: o.result.pips }, op: o.rival && { side: o.rival.side, outcome: o.rival.result.outcome, pips: o.rival.result.pips } }; });
  for (let i = 0; i < 8; i++) { if (await p.evaluate(() => /もう一勝負/.test(document.body.innerText || ''))) break; await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(500); for (let i = 0; i < 3; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
  const after = await p.evaluate(() => ({ gold: State.data.gold, tm83: { wins: State.data.tm83.wins, losses: State.data.tm83.losses, draws: State.data.tm83.draws }, open: ChartBattleUI.isOpen, busy: World.busy }));
  const a = last.me.outcome === 'skip' ? 0 : last.me.pips, b = last.op.outcome === 'skip' ? 0 : last.op.pips; const j = a - b >= 0.1 ? 1 : b - a >= 0.1 ? -1 : 0; const prize = await p.evaluate((t) => TradeMaster83.prize(t, 1), at.tier);
  const goldOk = j === 1 ? after.gold === gold0 + prize : after.gold === gold0;
  console.log('RESULT2D', MAP, JSON.stringify(at), 'decide', JSON.stringify(dec), 'me', JSON.stringify(last.me), 'op', JSON.stringify(last.op), 'judge', j, 'gold', gold0, '->', after.gold, goldOk ? 'OK' : 'NG', JSON.stringify(after), 'pageerrors', errs.length);
  fs.writeFileSync(OUT + 'tm2d_result.json', JSON.stringify({ at, dec, last, after, j, goldOk, errs }, null, 1)); await br.close();
})().catch((e) => { console.log(e.stack); process.exit(1); });
