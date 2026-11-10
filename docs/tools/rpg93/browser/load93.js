// v9.3 読み込みの速さを測る（ヘッドレス Chromium。HTTP/2＋gzip の計測用サーバー docs/tools/rpg93/h2server.js に向ける）
//   KIND=2d|3d  NET=fast|4g|slow  PORT=8443  OUT=保存先.json  [SAVE=セーブのJSONのファイル：あれば「つづきから」まで測る]
//   測るもの：①初めての訪問（キャッシュなし）でタイトル画面が出るまで ②つづきから → 歩ける状態まで ③2回目の訪問（キャッシュあり）でタイトルまで
//   通信の条件（Chromium の Network.emulateNetworkConditions）：fast＝制限なし（遅延 5ms）、4g＝下り 9Mbps・上り 1.5Mbps・往復 60ms、slow＝下り 1.6Mbps・上り 0.75Mbps・往復 150ms
const { chromium } = require('playwright'); const fs = require('fs');
const KIND = process.env.KIND || '2d', NET = process.env.NET || '4g', PORT = process.env.PORT || 8443;
const NETS = { fast: { latency: 5, downloadThroughput: -1, uploadThroughput: -1 }, '4g': { latency: 60, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 }, slow: { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 } };
const URL = `https://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html'); const PREFIX = KIND === '3d' ? 'mtq-3d-slot-' : 'mtq-rpg-v2-slot-';
(async () => {
  const br = await chromium.launch({ args: process.env.SPKI ? ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] : ['--ignore-certificate-errors'] }); /* SPKI：計測用の自己署名の証明書を正しいものとして扱う（証明書エラーのままだとキャッシュが効かず、2回目の訪問を正しく測れない） */ const ctx = await br.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const SAVE = process.env.SAVE ? fs.readFileSync(process.env.SAVE, 'utf8') : null;
  if (SAVE) await ctx.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch (e) { } }, [PREFIX + '1', SAVE]);
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', Object.assign({ offline: false }, NETS[NET]));
  let reqs = {}; const errs = [];
  cdp.on('Network.requestWillBeSent', (e) => { reqs[e.requestId] = { url: e.request.url, type: e.type, t0: e.timestamp }; });
  cdp.on('Network.responseReceived', (e) => { const r = reqs[e.requestId]; if (r) { r.fromCache = e.response.fromDiskCache || e.response.fromServiceWorker || e.response.fromPrefetchCache; r.sw = !!e.response.fromServiceWorker; r.status = e.response.status; } });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs[e.requestId]; if (r) { r.bytes = e.encodedDataLength; r.t1 = e.timestamp; } });
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const sum = (since) => { const L = Object.values(reqs).filter((r) => r.t1 && (!since || r.t0 >= since)); const by = {}; L.forEach((r) => { const k = /\.js(\?|$)/.test(r.url) ? 'js' : /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(r.url) ? 'image' : /\.(ogg|mp3|m4a|opus)(\?|$)/.test(r.url) ? 'audio' : /\.css(\?|$)/.test(r.url) ? 'css' : 'other'; by[k] = by[k] || { n: 0, kb: 0, cached: 0 }; by[k].n++; by[k].kb += (r.bytes || 0) / 1024; if (r.fromCache) by[k].cached++; }); Object.values(by).forEach((v) => { v.kb = Math.round(v.kb); }); return { n: L.length, kb: Math.round(L.reduce((t, r) => t + (r.bytes || 0), 0) / 1024), by }; };
  const ready = async () => { if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 600000 }); };
  // ① 初めての訪問
  const t0 = Date.now(); await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 600000 }); const tDom = Date.now() - t0;
  await p.waitForSelector('#ui .title-menu', { timeout: 600000 }); const tTitle = Date.now() - t0; await ready(); const tReady = Date.now() - t0;
  await p.waitForTimeout(1500); const first = sum(); const firstList = Object.values(reqs);
  let cont = null;
  if (SAVE) {
    const before = Object.keys(reqs).length; const c0 = Date.now();
    const item = async (label) => { const h = await p.waitForFunction((l) => [...document.querySelectorAll('#ui .rw-item')].reverse().find((x) => x.textContent.indexOf(l) >= 0) || null, label, { timeout: 120000 }); await h.asElement().click(); };
    await item('つづきから'); await item('スロット1');
    await p.waitForFunction(() => [...document.querySelectorAll('#ui .rw-choice div, #ui .rw-item')].find((x) => /音なしのまま/.test(x.textContent)), null, { timeout: 4000 }).then((h) => h.asElement().click()).catch(() => { });   // v9.3 音を消しているセーブで 1 回だけ聞かれる（測るときは今の設定のまま）
    if (KIND === '3d') await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 600000 }); else await p.waitForFunction(() => window.World && World.map && !document.querySelector('#ui .title-menu'), null, { timeout: 120000 });
    const tCont = Date.now() - c0; await p.waitForTimeout(1500);
    const L = Object.values(reqs).slice(before); cont = { ms: tCont, n: L.length, kb: Math.round(L.reduce((t, r) => t + (r.bytes || 0), 0) / 1024) };
  }
  // ③ 2回目の訪問（同じブラウザ・キャッシュあり）
  reqs = {}; const r0 = Date.now(); await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 600000 }); await p.waitForSelector('#ui .title-menu', { timeout: 600000 }); const tTitle2 = Date.now() - r0; await ready(); const tReady2 = Date.now() - r0; await p.waitForTimeout(1500); const second = sum();
  const top = (L) => L.filter((r) => r.t1).sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).slice(0, 25).map((r) => ({ u: r.url.replace(/^https:\/\/localhost:\d+\//, '').slice(0, 90), kb: Math.round((r.bytes || 0) / 1024), c: !!r.fromCache, sw: !!r.sw, st: r.status }));
  const urls = firstList.filter((r) => r.t1).map((r) => [r.url.replace(/^https:\/\/localhost:\d+\//, '').replace(/\?.*$/, ''), Math.round((r.bytes || 0) / 1024)]);
  const out = { KIND, NET, net: NETS[NET], first: { domMs: tDom, titleMs: tTitle, readyMs: tReady, req: first, top: top(firstList), urls: process.env.URLS ? urls : undefined }, cont, second: { titleMs: tTitle2, readyMs: tReady2, req: second, top: top(Object.values(reqs)) }, errs };
  console.log(JSON.stringify(out));
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await br.close();
})().catch((e) => { console.error('CRASH', e && e.stack || e); process.exit(2); });
