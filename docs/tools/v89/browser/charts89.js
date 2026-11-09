// v8.9 チャートの高さの確かめ（ヘッドレス Chromium。実機ではない）：チャートが出る画面を、スマホの縦・横・PC で開いて、チャートの大きさを測って写す
//   VER=2d|3d  CASES=i14,se,p390,land,pc  TAG=before|after  OUT=...
//   i14：iPhone の Safari（アドレスバーとツールバーで見える高さ 664）・se：小さい iPhone の Safari（375×553）・p390：390×844・land：横向き 844×340・pc：1280×720
//   測るもの：チャートの canvas の大きさ（CSS の px）と、価格の段（ローソク足の部分）の高さの目安・パネルの中で縦にはみ出していないか
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = process.env.OUT || '/home/claude/envwork/docs/chart89/'; const VER = process.env.VER || '2d'; const TAG = process.env.TAG || 'after';
fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
const VIEW = { i14: { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, se: { viewport: { width: 375, height: 553 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, p390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, land: { viewport: { width: 844, height: 340 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, pc: { viewport: { width: 1280, height: 720 } } };
const CASES = (process.env.CASES || 'i14,se,p390,land,pc').split(',');
const SCENES = (process.env.SCENES || 'trial,trialscroll,order,quick,cbattle,cbres,exam,duel,review,quiz,lev').split(',');
const clean = (p) => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; const st = document.getElementById('stage'); if (st) st.classList.remove('trade-open', 'result-open'); });
// 測る：canvas の大きさ・価格の段の目安（Chart.render は (高さ-18)×0.58。チャートバトルは独自の割り付け）・パネルの大きさとスクロール
const measure = (p, sel, kind) => p.evaluate(({ sel, kind }) => {
  const c = document.querySelector(sel); if (!c) return { missing: sel }; const r = c.getBoundingClientRect(); const pan = c.closest('.rw-panel') || document.querySelector('#ui').lastElementChild; const pr = pan ? pan.getBoundingClientRect() : null;
  const vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
  return { w: Math.round(r.width), h: Math.round(r.height), price: kind === 'chart' ? Math.round((r.height - 18) * 0.58) : null, top: Math.round(r.top), visible: Math.round(vis), vh: innerHeight, panelH: pr ? Math.round(pr.height) : null, panelScroll: pan ? pan.scrollHeight > pan.clientHeight + 2 : null, docScroll: document.documentElement.scrollWidth > innerWidth + 2 };
}, { sel, kind });
const SETUP = {
  trial: async (p) => { await p.evaluate(() => { window.__tr = TradeUI.trial(Scenarios.defs.map((s) => s.id).slice(0, 4), { title: '修行場の試練（上級）', practice: true }); }); await p.waitForSelector('#trial-chart'); await p.waitForTimeout(500); return ['#trial-chart', 'chart']; },
  trialscroll: async (p) => { await SETUP.trial(p); await p.evaluate(() => { const pan = document.querySelector('.rw-panel.trade-panel'); pan.scrollTop = 520; }); await p.waitForTimeout(300); return ['#trial-chart', 'chart']; },
  order: async (p) => {
    await p.evaluate(() => { window.__tr = TradeUI.trial(Scenarios.defs.map((s) => s.id).slice(0, 4), { title: '修行場の試練', practice: true }); }); await p.waitForSelector('#trial-chart'); await p.waitForTimeout(300);
    await p.evaluate(() => { document.querySelectorAll('#trial-analysis .aq').forEach((q) => { const b = q.querySelector('.aopt'); if (b) b.click(); }); });
    for (const k of ['high', 'low']) { await p.evaluate((k) => { const b = document.querySelector('[data-pick="' + k + '"]'); if (b) b.click(); }, k); const c = await p.$('#trial-chart'); const bb = await c.boundingBox(); await p.mouse.click(bb.x + bb.width * (k === 'high' ? 0.6 : 0.4), bb.y + Math.min(40, bb.height * 0.2)); await p.waitForTimeout(150); }
    await p.evaluate(() => { const b = document.querySelector('#trial-cmds [data-cmd="buy"]'); if (b) b.click(); }); await p.waitForTimeout(300);
    await p.evaluate(() => { const it = document.querySelector('#ui .rw-list:last-child .rw-item'); if (it) it.click(); }); await p.waitForTimeout(200);
    if (!(await p.$('#o-chart'))) await p.evaluate(() => { const it = document.querySelector('#ui .rw-list:last-child .rw-ok, #ui .rw-list:last-child .rw-item.cur'); if (it) it.click(); });
    await p.waitForSelector('#o-chart', { timeout: 5000 }).catch(() => { }); await p.waitForTimeout(300); return ['#o-chart', 'chart'];
  },
  quick: async (p) => { await p.evaluate(() => { TradeUI.quick(['up_pullback'], { title: 'スライムの相場の試練', scenarioId: 'up_pullback' }); }); await p.waitForSelector('.quick-trial'); await p.waitForTimeout(400); return ['.qt-chart', 'chart']; },
  cbattle: async (p) => { await p.evaluate(() => { const s = Ultimates.newScenario({ diff: [1, 2], avoid: [] }); ChartBattleUI.open({ mode: 'practice', timeMode: 'unlimited', title: '修行', sub: '難易度：やさしい', prompt: '観点：上位足の向き', ind: ['ema', 'rci', 'macd', 'mtf'], tf: 15, scenario: s, quitable: true }); }); await p.waitForSelector('.chart-battle'); await p.waitForTimeout(600); return ['.chart-battle .cb-canvas', 'cb']; },
  cbres: async (p) => { await p.evaluate(() => { const s = Ultimates.newScenario({ diff: [1, 2], avoid: [] }); ChartBattleUI.open({ mode: 'practice', timeMode: 'normal', title: '修行', ind: ['ema', 'rci', 'macd'], tf: 15, scenario: s }); }); await p.waitForSelector('.chart-battle'); await p.evaluate(() => ChartBattleUI.ctl.decide('long')); await p.waitForSelector('.chart-battle.result', { timeout: 60000 }); await p.waitForTimeout(400); return ['.chart-battle .cb-canvas', 'cb']; },
  // 試験（判断のあとに理由を選ぶ）：理由の一覧が出た状態。最後の理由のボタンまでスクロールで届くか
  exam: async (p) => { await p.evaluate(() => { const s = Ultimates.newScenario({ diff: [1, 2], avoid: [] }); ChartBattleUI.open({ mode: 'exam', title: '試験　第1問／5', sub: '道場｜「技」', prompt: '観点：上位足の向き', ind: ['ema', 'rci', 'macd'], tf: 15, scenario: s, askReason: true }); }); await p.waitForSelector('.chart-battle'); await p.waitForTimeout(300); await p.evaluate(() => ChartBattleUI.ctl.decide('long')); await p.waitForSelector('.cb-reasons:not(.hidden)', { timeout: 8000 }).catch(() => { }); await p.waitForTimeout(300);
    await p.evaluate(() => { const L = [...document.querySelectorAll('.cb-rs')]; const last = L[L.length - 1]; if (last) last.scrollIntoView({ block: 'nearest' }); const r = last ? last.getBoundingClientRect() : null; window.__exLast = r ? { bottom: Math.round(r.bottom), inView: r.bottom <= innerHeight + 1 && r.height > 20 } : null; }); return ['.chart-battle .cb-canvas', 'cb']; },
  // トレードバトル（相手あり・スコアの札）
  duel: async (p) => { await p.evaluate(() => { const s = Ultimates.newScenario({ diff: [1, 2], avoid: [] }); ChartBattleUI.open({ mode: 'battle', title: 'トレードバトル', sub: '3本勝負', badge: '<b>1本目</b>　あなた 0 − 0 相手', prompt: '相手より多く pips を取れば勝ち（見送りは 0pips）', rival: { name: 'トレーダー', short: 'ト', skill: 0.5, atFrac: 0.5, seed: 7 }, ind: ['ema', 'rci', 'macd'], tf: 15, scenario: s }); }); await p.waitForSelector('.chart-battle'); await p.waitForTimeout(500); return ['.chart-battle .cb-canvas', 'cb']; },
  review: async (p) => { await SETUP.cbres(p); await p.evaluate(() => { const b = document.querySelector('.chart-battle .cb-review'); if (b) b.click(); }); await p.waitForSelector('.rv-panel', { timeout: 8000 }).catch(() => { }); await p.waitForTimeout(500); return ['.rv-panel .rv-c0', 'rv']; },
  // クイズモンスターのチャートの枠・トレーディアのレバレッジのチャート：画面を開く手順が長いので、同じ組み立て（クラス）の部品を置いて、CSS の高さを測る
  // クイズモンスター：チャートのある問題を出す（Quiz.begin の問題だけ差し替え。測るだけ）。tall＝線のチャート（背の高い枠）
  quiz: async (p) => { await p.evaluate(() => { const Q = window.QUIZ_Q || {}; const qid = Object.keys(Q).find((k) => Q[k].chart && Q[k].chart.type === (window.__qbTall ? 'lines' : 'candles')); const mon = (window.QUIZ_MONSTERS || [])[0];
      const ob = Quiz.begin; Quiz.begin = function (d, mid) { const pd = ob.apply(this, arguments); if (pd) pd.qid = qid; return pd; }; window.__qbRestore = () => { Quiz.begin = ob; };
      QuizBattleUI.open(mon.id); }); await p.waitForSelector('.quiz-battle'); await p.waitForTimeout(300);
    await p.evaluate(() => { const b = [...document.querySelectorAll('.quiz-battle .qb-foot button, .quiz-battle .qb-foot [data-k]')].find((x) => /挑む|問いに答える/.test(x.textContent)); if (b) b.click(); });
    await p.waitForSelector('.qb-chartbox:not(.hidden)', { timeout: 8000 }).catch(() => { }); await p.waitForTimeout(500);
    await p.evaluate(() => { const ch = [...document.querySelectorAll('.quiz-battle .qb-ch')]; const last = ch[ch.length - 1]; const r = last ? last.getBoundingClientRect() : null; const pan = document.querySelector('.rw-panel.quiz-battle'); const pr = pan.getBoundingClientRect(); window.__qbLast = r ? { bottom: Math.round(r.bottom), panelBottom: Math.round(pr.bottom), inView: r.bottom <= Math.min(innerHeight, pr.bottom) + 1, scroll: pan.scrollHeight > pan.clientHeight + 2 } : null; if (window.__qbRestore) window.__qbRestore(); });
    return ['.qb-chartbox:not(.hidden) .qb-chart', 'box']; },
  lev: async (p) => { await p.evaluate(() => { const d = document.createElement('div'); d.className = 'rw-panel lev-panel'; d.innerHTML = '<canvas class="chart lev-chart"></canvas>'; document.getElementById('ui').appendChild(d); }); return ['.lev-chart', 'chart'] ; }
};
(async () => {
  const br = await chromium.launch(); const all = {};
  for (const c of CASES) {
    const ctx = await br.newContext(Object.assign({}, VIEW[c])); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}/${VER === '3d' ? '3d/' : ''}index.html`);
    if (VER === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); else await p.waitForFunction(() => window.World && window.State && window.Engine && Engine.scenes.length, null, { timeout: 120000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
    if (VER === '3d') { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.waitForTimeout(1500); await p.evaluate(() => { MTQ3D.paused = true; }); }
    const res = {};
    for (const sc of SCENES) {
      try { await clean(p); const [sel, kind] = await SETUP[sc](p); const m = await measure(p, sel, kind); if (sc === 'quiz') m.choices = await p.evaluate(() => window.__qbLast); if (sc === 'exam') m.choices = await p.evaluate(() => window.__exLast);
        if (['cbattle', 'exam', 'duel'].indexOf(sc) >= 0) m.cmds = await p.evaluate(() => { const b = [...document.querySelectorAll('.chart-battle .cb-btn')]; return b.length ? b.every((x) => { const r = x.getBoundingClientRect(); return r.height >= 40 && r.bottom <= innerHeight + 1 && r.top >= 0; }) : null; }); res[sc] = m;
        if (sc !== 'lev') await p.screenshot({ path: `${OUT}shots/${TAG}_${VER}_${c}_${sc}.jpg`, type: 'jpeg', quality: 60 }); }
      catch (e) { res[sc] = { error: String(e.message || e).slice(0, 160) }; }
    }
    res.errors = errs; all[c] = res; console.log(TAG, VER, c, JSON.stringify(res));
    await ctx.close();
  }
  await br.close(); fs.writeFileSync(`${OUT}logs/charts89_${TAG}_${VER}.json`, JSON.stringify(all, null, 1));
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
