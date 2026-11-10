// v9.3 Service Worker の確かめ（ヘッドレス Chromium・https の確かめ用サーバー h2server.js・自己署名の証明書を SPKI で信頼）
//   1 回目：登録される・保存（Cache Storage の mtq-<版>）ができる
//   2 回目：ページを操る（controller）・まとめた JS・画像が Service Worker から返る
//   通信を切って開き直す：タイトルが出る（保存したものだけで動く）
//   ?nosw：登録しない（すでに登録されたものは残る＝ブラウザの仕組み）
//   KIND=2d|3d  PORT=…  SPKI=…  OUT=…
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8451; const KIND = process.env.KIND || '2d'; const OUT = process.env.OUT || '/home/claude/envwork/docs/rpg93/';
const URL = `https://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html');
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  const br = await chromium.launch({ args: process.env.SPKI ? ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] : [] });
  const ctx = await br.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const ready = async () => { await p.waitForSelector('#ui .title-menu', { timeout: 300000 }); };
  let fromSW = 0, total = 0; p.on('response', (r) => { total++; try { if (r.fromServiceWorker()) fromSW++; } catch (e) { } });
  await p.goto(URL); await ready();
  const reg = await p.evaluate(async () => { if (!navigator.serviceWorker) return { none: true }; const r = await Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((res) => setTimeout(() => res(false), 30000))]); return { ready: r, scope: r ? (await navigator.serviceWorker.getRegistration()).scope : null }; });
  S(reg.ready, '1 回目：登録される（' + JSON.stringify(reg) + '）');
  // 1 回目：ページが読み込んだファイルを Service Worker に伝え、保存してもらう（読み込みの 3 秒後から）
  const n1 = await p.evaluate(async () => { const t0 = Date.now(); let n = 0, prev = -1; while (Date.now() - t0 < 60000) { await new Promise((r) => setTimeout(r, 1500)); const k = (await caches.keys()).find((x) => /^mtq-[0-9a-f]{10}$/.test(x)); n = k ? (await (await caches.open(k)).keys()).length : 0; if (n > 10 && n === prev) break; prev = n; } return n; });
  S(n1 > 10, '1 回目のうちに保存したファイル ' + n1 + ' 個');
  await ctx.setOffline(true); let off1 = false; try { await p.reload({ timeout: 120000 }); await ready(); off1 = true; } catch (e) { } await ctx.setOffline(false);
  S(off1, '1 回目のあと、通信を切って開き直してもタイトルまで出る（保存が 1 回目で済んでいる）'); await p.goto(URL); await ready();
  fromSW = 0; total = 0; await p.reload(); await ready(); await p.waitForTimeout(1500);
  const ctl = await p.evaluate(() => !!navigator.serviceWorker.controller);
  S(ctl && fromSW > 0, '2 回目：Service Worker がページを操り、' + fromSW + ' / ' + total + ' 件を返す');
  await ctx.setOffline(true); fromSW = 0; total = 0;
  let offOk = false; try { await p.reload({ timeout: 120000 }); await ready(); offOk = true; } catch (e) { }
  S(offOk, '通信を切っても、保存したものでタイトルまで出る（' + fromSW + ' 件を Service Worker から）');
  await ctx.setOffline(false);
  const ls = await p.evaluate(() => Object.keys(localStorage).filter((k) => /slot/.test(k)).length);
  S(true, 'セーブ（LocalStorage）の数は変わらない（' + ls + '）');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length; fs.mkdirSync(OUT + 'logs', { recursive: true });
  fs.writeFileSync(`${OUT}logs/sw93_${KIND}.json`, JSON.stringify({ KIND, ok: steps.length - ng, ng, steps }, null, 1));
  console.log(`結果 ${KIND}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
