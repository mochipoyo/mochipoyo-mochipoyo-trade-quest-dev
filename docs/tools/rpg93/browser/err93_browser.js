// v9.3 修正（Windows の Chrome・3D 版で BGM が鳴らない）の確かめ：曲のファイルが読めないとき（ヘッドレス Chromium。実機ではない。耳では聞いていない）
//   曲（assets/music/）への通信をわざと 404 にする → PC の「読み込んでから鳴らす」が失敗する
//   1 無音のままにせず、レトロ風の音に切り替わる（WebAudio の中で音が出ている）
//   2 「BGM の状態を見る」に「読めなかった：通信 404」と出る
//   3 通信を戻して［もう一度鳴らす］（実際のクリック）→ 曲を読み直して鳴る
//   KIND=2d|3d  PORT=…  OUT=…
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8840; const KIND = process.env.KIND || '2d'; const OUT = process.env.OUT || '/home/claude/envwork/docs/rpg93/';
const URL = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  const br = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  let blocked = 0; const block = (r) => { blocked++; r.fulfill({ status: 404, body: 'not found' }); };
  await p.route('**/assets/music/**', block);
  await p.goto(URL); if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  const click = async (h) => { const b = await h.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(300); };
  const look = () => p.evaluate(async () => { if (Audio.ctx) { Audio.bgmLevel(); await new Promise((r) => setTimeout(r, 400)); } const st = Audio.ctx ? Audio.bgmState() : {}; return { ctx: Audio.ctx ? Audio.ctx.state : 'none', engine: st.engine, cur: st.cur || null, state: st.state, err: st.err, playing: !!st.playing, t: st.t || 0, retro: Audio.current && !/^file:/.test(Audio.current) ? Audio.current : null, level: Audio.ctx ? +Audio.bgmLevel().toFixed(4) : 0 }; });
  await click(await p.$('#ui .title-menu .rw-title'));
  await p.waitForFunction(() => { const st = Audio.ctx && Audio.bgmState(); return st && st.state === 'error'; }, null, { timeout: 60000, polling: 300 }).catch(() => { });
  const a1 = await look();
  S(a1.engine === 'buffer', 'PC の鳴らし方は「読み込んでから鳴らす」（' + a1.engine + '）');
  S(blocked > 0 && a1.state === 'error' && /404/.test(a1.err || ''), '曲が読めない（通信 404・' + blocked + ' 回）と、状態が「読めなかった」になる（' + JSON.stringify(a1) + '）');
  S(a1.retro === 'title' && a1.level > 0.0005, '無音のままにせず、レトロ風の音に切り替わる（音の大きさ ' + a1.level + '）');
  // 「BGM の状態を見る」を開く（タイトルの上で直接開く）
  await p.evaluate(() => { Menu.bgmDiag(); }); await p.waitForSelector('#ui .bgm-diag .bgmdiag-body', { timeout: 10000 }); await p.waitForTimeout(700);
  const txt = await p.evaluate(() => document.querySelector('#ui .bgm-diag .bgmdiag-body').textContent);
  S(/読めなかった：通信 404/.test(txt) && /レトロ（title）/.test(txt), '「BGM の状態を見る」に「読めなかった：通信 404」「レトロ（title）」と出る');
  await p.screenshot({ path: `${OUT}shots/err93_${KIND}_diag_error.jpg`, type: 'jpeg', quality: 70 });
  // 通信を戻して［もう一度鳴らす］
  await p.unroute('**/assets/music/**', block);
  await click(await p.$('#ui .bgm-diag .bgmdiag-retry'));
  await p.waitForFunction(() => { const st = Audio.bgmState(); return st.playing && st.t > 2; }, null, { timeout: +(process.env.WAIT || 90000), polling: 500 }).catch(() => { });
  const a2 = await look();
  S(a2.cur === 'calm_before_the_storm' && a2.playing && a2.t > 0.5 && a2.level > 0.0005 && !a2.retro, '通信を戻して［もう一度鳴らす］を押すと、曲を読み直して鳴る（' + JSON.stringify(a2) + '）');
  await p.waitForTimeout(700); const txt2 = await p.evaluate(() => document.querySelector('#ui .bgm-diag .bgmdiag-body').textContent);
  S(/鳴らしている/.test(txt2) && !/読めなかった/.test(txt2), '「BGM の状態を見る」が「鳴らしている」に変わる');
  await p.screenshot({ path: `${OUT}shots/err93_${KIND}_diag_retry.jpg`, type: 'jpeg', quality: 70 });
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length; fs.mkdirSync(OUT + 'logs', { recursive: true });
  fs.writeFileSync(`${OUT}logs/err93_${KIND}.json`, JSON.stringify({ KIND, ok: steps.length - ng, ng, steps }, null, 1));
  console.log(`結果 ${KIND}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
