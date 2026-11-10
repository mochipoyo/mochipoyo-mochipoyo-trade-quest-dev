// v9.3 修正「BGM が流れない」の確かめ：実際のクリック／タップだけで音が出るか（ヘッドレス Chromium。実機ではない。耳では聞いていない）
//   自動再生の許可は付けない（Chrome のふつうの決まり：ページを操作したあとだけ音を出せる）
//   1 タイトル：最初のクリック／タップでタイトルの曲が鳴る（音の設定を何も選んでいない人）
//   2 音を消しているセーブを「つづきから」：聞かれて「音を出す」→ 町の曲が鳴り、時間が進む
//   v9.3 修正（Windows の Chrome・3D 版で BGM が鳴らない）：鳴らし方（PC＝読み込んでから鳴らす）によらず、WebAudio の中で実際に出ている音の大きさ（level）も確かめる
//   3D は MTQ3D.paused で描画を止めない（PAUSE3D=1 のときだけ止める）
//   KIND=2d|3d  VIEW=pc|m390  PORT=…  OUT=…
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8820; const KIND = process.env.KIND || '2d'; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/rpg93/';
const URL = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw'; const PREFIX = KIND === '3d' ? 'mtq-3d-slot-' : 'mtq-rpg-v2-slot-';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  const br = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const ctx = await br.newContext(VIEW === 'pc' ? { viewport: { width: 1280, height: 720 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const ready = async () => { if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 }); };
  // セーブを作る（音を消した設定＝今までの初期値）
  await p.goto(URL); await ready();
  await p.evaluate((pre) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; State.save(1); localStorage.removeItem(pre + '0'); State.data = null; }, PREFIX);
  // 新しいページ（まだ一度も操作していない）
  const q = await ctx.newPage(); await p.close();   // 同じ端末（保存はそのまま）で、まだ操作していない新しいページ
  q.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const readyQ = async () => { if (KIND === '3d') await q.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await q.waitForSelector('#ui .title-menu', { timeout: 300000 }); };
  const tapQ = async (h) => { const b = await h.boundingBox(); if (VIEW === 'pc') await q.mouse.click(b.x + b.width / 2, b.y + b.height / 2); else await q.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await q.waitForTimeout(300); };
  const itemQ = async (label) => { const h = await q.waitForFunction((l) => [...document.querySelectorAll('#ui .rw-item, #ui .rw-choice div, #ui .rw-tool')].reverse().find((x) => x.offsetParent && x.textContent.indexOf(l) >= 0) || null, label, { timeout: 60000 }); await tapQ(h.asElement()); };
  const playingQ = () => q.evaluate(async () => { if (Audio.ctx) { Audio.bgmLevel(); await new Promise((r) => setTimeout(r, 400)); } const st = Audio.ctx ? Audio.bgmState() : {}; return { ctx: Audio.ctx ? Audio.ctx.state : 'none', engine: st.engine, mute: Audio.settings().mute, cur: st.cur || null, playing: !!st.playing, t: st.t || 0, level: Audio.ctx ? +Audio.bgmLevel().toFixed(4) : 0 }; });   // v9.3 修正：鳴らし方によらず・出ている音の大きさも
  await q.goto(URL); await readyQ();
  const a0 = await playingQ(); S(!a0.cur, '操作の前は鳴らない（ブラウザの決まり）（' + JSON.stringify(a0) + '）');
  await tapQ(await q.$('#ui .title-menu .rw-title')); await q.waitForFunction(() => { const st = Audio.ctx && Audio.bgmState(); return st && st.playing && st.t > 2; }, null, { timeout: +(process.env.WAIT || 60000), polling: 500 }).catch(() => { });
  const a1 = await playingQ(); S(a1.ctx === 'running' && a1.cur === 'calm_before_the_storm' && a1.playing && a1.t > 0.5 && a1.level > 0.0005, '最初の' + (VIEW === 'pc' ? 'クリック' : 'タップ') + 'でタイトルの曲が鳴る（' + JSON.stringify(a1) + '）');
  await itemQ('つづきから'); await itemQ('スロット1'); await itemQ('音を出す');
  if (KIND === '3d') { await q.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); if (process.env.PAUSE3D) await q.evaluate(() => { MTQ3D.paused = true; }); }   // この作業環境（ソフトウェア描画）では 3D の描画が CPU を使い切り、曲の読み込みが進まないため止める
  await q.waitForFunction(() => window.World && World.map, null, { timeout: 120000 }); await q.waitForFunction(() => { const st = Audio.bgmState(); return st.playing && st.t > 2; }, null, { timeout: +(process.env.WAIT || 60000), polling: 500 }).catch(() => { });
  const a2 = await playingQ(); S(a2.mute === false && a2.cur && a2.playing && a2.t > 0.5 && a2.level > 0.0005, '音を消していたセーブで「音を出す」→ 町の曲が鳴る（' + JSON.stringify(a2) + '）');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length; fs.mkdirSync(OUT + 'logs', { recursive: true });
  fs.writeFileSync(`${OUT}logs/gesture93_${KIND}_${VIEW}.json`, JSON.stringify({ KIND, VIEW, ok: steps.length - ng, ng, steps }, null, 1));
  console.log(`結果 ${KIND} ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
