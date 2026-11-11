// v9.5 指示書の見本の品：絵（webp128・webp256・png256）がブラウザで開けるか、ゲームの名前と絵が合っているかを目で見るための一覧表
//   画像を止めない（icons_browser.js は WebP→PNG の確かめのため potion・porkbits_don を止めているので、ここで別に確かめる）
//   KIND=2d|3d  PORT=…  OUT=…（記録 logs/icons_samples_<KIND>.json・画面写真 shots/icons_samples_<KIND>.jpg）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8872; const KIND = process.env.KIND || '2d'; const OUT = process.env.OUT || '/home/claude/envwork/docs/icons/';
const URL0 = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
// 指示書の見本：木の剣・鋼の剣・損切りの盾・笑わぬ大盾・ポーション・勇者のバゲット・ポークビッツ丼・森の鍵・op_001、強化した武器・頭・装飾品・飲み物・クイズの報酬
const IDS = ['wooden_sword', 'steel_sword', 'stoploss_shield', 'b19_unsmiling_aegis', 'potion', 'bread_baguette', 'porkbits_don', 'forest_key', 'op_001', 'dow_greatsword_2', 'leather_cap', 'ring_power', 'coffee', 'fruit_juice', 'qm_trophy_001', 'explorer_ring'];
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1180, height: 760 } });
  const errs = [], bad = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('response', (r) => { if (r.url().indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace(/^.*localhost:\d+/, '')); });
  await p.goto(URL0); await p.waitForFunction(() => window.ItemIcons && window.ITEMS, null, { timeout: 300000 });
  const res = await p.evaluate(async (ids) => {
    const load = (u) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im.naturalWidth + 'x' + im.naturalHeight); im.onerror = () => ok('NG'); im.src = u; });
    const out = [];
    for (const id of ids) {
      const it = ITEMS[id] || (window.OOPARTS || []).filter((o) => o.id === id)[0] || null; const e = ItemIcons.get(id);
      out.push({ id, game: it ? it.name : null, art: e ? e.name : null, w128: e ? await load(ItemIcons.url(id, 48)) : '-', w256: e ? await load(ItemIcons.url(id, 160)) : '-', png: e ? await load(ItemIcons.url(id, 48, true)) : '-', url: ItemIcons.url(id, 48) });
    }
    // 目で見る一覧表（ゲームの名前の下に、一覧の大きさ 48px と詳細の大きさ 160px）
    document.querySelectorAll('#ui > *').forEach((n) => n.remove());
    const box = document.createElement('div'); box.id = 'icons-sheet';
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d1424;color:#eee;font:13px system-ui,sans-serif;display:grid;grid-template-columns:repeat(8,1fr);gap:8px;padding:10px;overflow:auto';
    box.innerHTML = ids.map((id) => { const it = ITEMS[id] || (window.OOPARTS || []).filter((o) => o.id === id)[0]; return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center"><b>' + (it ? it.name : id) + '</b><span style="color:#9ab;font-size:11px">' + id + '</span>' + ItemIcons.html(id, { size: 48 }) + ItemIcons.html(id, { size: 120, detail: true }) + '</div>'; }).join('');
    document.body.appendChild(box);
    return out;
  }, IDS);
  await p.waitForFunction(() => [...document.querySelectorAll('#icons-sheet img.tqi-img')].every((im) => im.complete), null, { timeout: 60000 }).catch(() => { });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}shots/icons_samples_${KIND}.jpg`, type: 'jpeg', quality: 80 });
  res.forEach((r) => {
    if (r.id === 'explorer_ring') S(r.game && !r.art && r.w128 === '-', '絵のない ID（' + r.id + '「' + r.game + '」）は対応表になく、ほかの絵を使わない（「？」の枠）');
    else S(r.game && r.game === r.art && r.w128 === '128x128' && r.w256 === '256x256' && r.png === '256x256', r.id + '「' + r.game + '」：webp128 ' + r.w128 + '・webp256 ' + r.w256 + '・png256 ' + r.png + '（' + r.url.replace(/^https?:\/\/[^/]+/, '') + '）');
  });
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.join(' | ') : ''));
  S(bad.length === 0, '思いがけない 404 などはない' + (bad.length ? '：' + bad.join(' | ') : ''));
  const ng = steps.filter((x) => !x.ok).length; console.log('結果 samples ' + KIND + '：OK ' + (steps.length - ng) + ' / NG ' + ng);
  fs.writeFileSync(`${OUT}logs/icons_samples_${KIND}.json`, JSON.stringify({ KIND, ok: steps.length - ng, ng, rows: res, steps }, null, 1));
  await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
