// もちぽよ実践トレード道場のブラウザでの確かめ（ヘッドレス Chromium・ソフトウェア描画。実機ではない）
//   KIND=2d|3d  VIEW=p390|land|pc  PORT=…  OUT=docs/trading-learning/
//   流れ：メニュー →（問題を固定）A 環境認識 → B 仮説 → C 足送り → D 条件確認 → E 不正な注文 → 正しい注文 → F 保有 → G 振り返り
//   見る所：チャートの高さ・画面の中に見えるか・ボタンが押せるか（上に重なっていないか）・横のはみ出し・ページのエラー・セーブのキー
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = process.env.OUT || '/home/claude/envwork/docs/trading-learning/'; const VIEW = process.env.VIEW || 'p390'; const KIND = process.env.KIND || '3d';
const VP = { pc: { viewport: { width: 1280, height: 720 } }, p390: { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, land: { viewport: { width: 844, height: 340 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }[VIEW];
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(VP); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  await p.goto(`http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html'));
  if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); else await p.waitForFunction(() => window.State && window.World && window.PracticeUI, null, { timeout: 120000 });
  await p.evaluate(() => { localStorage.setItem('mtq-rpg-v2-slot-2', JSON.stringify({ marker: 'keep-2d' })); });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
  if (KIND === '3d') { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.evaluate(() => { MTQ3D.paused = true; }); }
  await p.waitForTimeout(800);
  const shot = async (name) => { await p.screenshot({ path: `${OUT}shots/${KIND}_${VIEW}_${name}.png` }); };
  // 入口：メニューの「トレード」
  const hasEntry = await p.evaluate(() => Menu.entries().trade.some((x) => x.label === 'もちぽよ実践トレード道場')); S(hasEntry, 'メニュー「トレード」に入口');
  // 問題を固定して開く
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); const sd = PRACTICE_SEEDS.learn.similar[1]; window.__pd = null; PracticeUI.play({ level: 6, lvDef: PracticeUI.LEVELS[5], pick: { seed: sd, cat: 'similar', set: 'learn' } }).then((r) => { window.__pd = r; }); });
  await p.waitForSelector('#ui .practice-panel #pd-chart'); await p.waitForTimeout(400);
  // 押せるかを見るとき（scroll:true）は、ふつうに指でスクロールしたのと同じく、その要素を画面の中へ入れてから中心に何があるかを見る
  const geo = async (sel, scroll) => p.evaluate(([s, sc]) => { const el = document.querySelector(s); if (!el) return null; if (sc && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, cx)), Math.min(innerHeight - 1, Math.max(0, cy)));
    return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width), inView: r.top >= -1 && r.bottom <= innerHeight + 1, tappable: !!hit && (hit === el || el.contains(hit)), vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth }; }, [sel, !!scroll]);
  const tap = async (sel) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(80); await el.click(); await p.waitForTimeout(120); };
  let g = await geo('#pd-chart'); S(g && g.h >= (VIEW === 'land' ? 150 : 200) && g.inView, 'チャート：高さ ' + (g && g.h) + 'px・画面の中（' + VIEW + '）'); await shot('A_analysis');
  S(g && g.sw <= g.vw + 1, '横のはみ出しなし（幅 ' + (g && g.sw) + ' ≤ ' + (g && g.vw) + '）');
  await tap('.practice-panel .tf[data-tf="1d"]'); await tap('.practice-panel .tf[data-tf="4h"]');
  const ans = await p.evaluate(() => { const sn = PracticeEngine.snap(PracticeUI.current.play); return { d1: sn.htf['1d'].insufficient ? 'unknown' : sn.htf['1d'].dir, h4: sn.htf['4h'].insufficient ? 'unknown' : sn.htf['4h'].dir }; });
  await tap(`.practice-panel .aopt[data-q="1d"][data-v="${ans.d1}"]`); await tap(`.practice-panel .aopt[data-q="4h"][data-v="${ans.h4}"]`); await tap('.practice-panel .aopt[data-bias="buy"]');
  await tap('.practice-panel [data-cmd="hyp"]'); S(await p.evaluate(() => /条件待ち/.test(document.querySelector('#pd-phase').textContent)), 'A・B を答えて仮説を登録 → ［条件待ち］');
  await tap('.practice-panel [data-cmd="step"]'); await tap('.practice-panel [data-cmd="step"]');
  g = await geo('#pd-chart'); const gs = await geo('.practice-panel [data-cmd="step"]', true); S(g && (g.inView || VIEW === 'pc') && gs && gs.tappable, '足送りのボタンを押している間もチャートが見える（チャート ' + (g && g.t) + '〜' + (g && g.b) + 'px）・ボタンが押せる'); await shot('C_waiting');
  await tap('.practice-panel [data-cmd="check"]'); await tap('.practice-panel [data-cmd="hint"]'); await shot('D_check');
  const gl = await geo('.practice-panel [data-cmd="long"]', true); S(gl && gl.tappable, 'D：ロングのボタンが押せる'); await tap('.practice-panel [data-cmd="long"]');
  const e0 = await p.evaluate(() => PracticeEngine.snap(PracticeUI.current.play).entry.close);
  await p.fill('#pd-sl', (e0 + 0.2).toFixed(3)); await p.fill('#pd-tp', (e0 + 0.6).toFixed(3)); await p.waitForTimeout(150);
  const err = await p.evaluate(() => document.querySelector('#pd-err').textContent); S(/発注できない/.test(err) && /下に置く/.test(err), 'E：損切りが逆側 → どこが不正かを表示（' + err.slice(0, 40) + '…）'); await shot('E_invalid');
  await tap('.practice-panel [data-cmd="order"]'); S(await p.evaluate(() => !PracticeUI.current.play.entry), '不正な注文は発注しない');
  await tap('.practice-panel [data-cmd="slhelp"]'); await tap('.practice-panel [data-cmd="tphelp"]'); await shot('E_order');
  await tap('.practice-panel [data-cmd="order"]'); S(await p.evaluate(() => PracticeUI.current.play.phase === 'holding'), '正しい注文 → ［保有中］'); await shot('F_holding');
  await tap('.practice-panel [data-cmd="hplay"]'); await p.waitForSelector('#ui .pd-review', { timeout: 60000 }); await p.waitForTimeout(300);
  const rv = await geo('#pd-rv-chart'); S(rv && rv.h >= 140, '振り返り：その後の値動きのチャート（高さ ' + (rv && rv.h) + 'px）'); await shot('G_review');
  const rvt = await p.evaluate(() => document.querySelector('#ui .pd-review').textContent); S(/判断の過程/.test(rvt) && /結果（判断の点とは別）/.test(rvt) && /学ぶこと/.test(rvt), '振り返り：判断の過程・結果（別の欄）・学ぶこと');
  await tap('#ui .pd-review [data-cmd="end"]'); await p.waitForFunction(() => window.__pd, null, { timeout: 20000 });
  const rec = await p.evaluate(() => ({ kind: __pd.record.kind, riskR: __pd.record.riskR, n: State.data.practice.history.length })); S(rec.kind === 'trade' && rec.n === 1, '記録：取引 1（R ' + rec.riskR + '）・「終える」が押せた');
  // 成績の画面
  await p.evaluate(() => { PracticeUI.stats(); }); await p.waitForSelector('#ui .pd-stats-panel'); await p.waitForTimeout(200); await shot('stats');
  const gst = await geo('#ui .pd-stats-panel'); S(gst && gst.sw <= gst.vw + 1, '成績の画面：横のはみ出しなし');
  await p.evaluate(() => { const c = document.querySelector('#ui .pd-stats-panel .rw-panel-close'); if (c) c.click(); });
  // セーブのキー
  const keys = await p.evaluate(() => { State.save(1); return { prefix: State.keyPrefix, keys: Object.keys(localStorage).filter((k) => /slot-1$/.test(k)), keep: localStorage.getItem('mtq-rpg-v2-slot-2') }; });
  S(keys.prefix === (KIND === '3d' ? 'mtq-3d-slot-' : 'mtq-rpg-v2-slot-') && keys.keys.length === 1 && keys.keys[0] === keys.prefix + '1' && keys.keep === JSON.stringify({ marker: 'keep-2d' }), 'セーブのキー：' + keys.keys.join(',') + '（' + (KIND === '3d' ? '3D の枠。2D のセーブは変わらない' : '2D の枠') + '）');
  S(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  await br.close(); fs.writeFileSync(`${OUT}logs/tl_browser_${KIND}_${VIEW}.json`, JSON.stringify({ steps, errs }, null, 1));
  console.log('結果: ' + steps.filter((x) => x.ok).length + ' OK / ' + steps.filter((x) => !x.ok).length + ' NG');
})().catch((e) => { console.error('FAIL', e); fs.writeFileSync(`${OUT}logs/tl_browser_${KIND}_${VIEW}.json`, JSON.stringify({ steps, fail: String(e && e.message) }, null, 1)); process.exit(1); });
