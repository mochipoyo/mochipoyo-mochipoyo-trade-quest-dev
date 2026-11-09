// v8.9 ビルドした 3D 版（3d/）での確かめ（ヘッドレス Chromium・ソフトウェア描画。実機ではない）
//   VIEW=p390（スマホ：軽量）| pc（高画質）
//   ・軽量：なめらかさ優先が入っている・3D設定に「なめらかさ」・切ると元の解像度・保存は mtq3d-smooth だけ（セーブのキーは増えない）
//   ・軽量：影の範囲が画面に合わせて 44 マスより狭い／動物は形の影なし（足元の丸い影はある）
//   ・高画質：影の範囲は 44 マスのまま・動物の影も今までどおり・なめらかさ優先は動かない
//   ・ポヨ村の屋内の先読み：フィールドでは作らない／ポヨ村で立ち止まっていると作る（軽量）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = process.env.OUT || '/home/claude/envwork/docs/perf89/'; const VIEW = process.env.VIEW || 'p390';
const VP = { pc: { viewport: { width: 1280, height: 720 } }, p390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } }[VIEW];
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(VP);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  const keys0 = await p.evaluate(() => Object.keys(localStorage).sort());
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  const low = VIEW !== 'pc';
  const st = await p.evaluate(() => ({ q: MTQ3D.quality, pr: MTQ3D.renderer.pixelRatio, sm: !!MTQ3D.smooth89, on: MTQ3D.smoothOn89, half: MTQ3D.lighting.shadowHalf89, right: MTQ3D.lighting.sun.shadow.camera.right, map: World.map.id,
    animals: (() => { let parts = 0, cast = 0, blobs = 0; MTQ3D.current.npcs.forEach((ch) => { if (!ch.legs) return; ch.root.traverse((o) => { if (o.isMesh) { parts++; if (o.castShadow) cast++; } }); if (ch.blob) blobs++; }); return { parts, cast, blobs }; })() }));
  S(st.q === (low ? 'low' : 'high'), '画質：' + st.q + '（' + VIEW + '）・解像度 ' + st.pr);
  if (low) {
    S(st.sm && st.on, 'なめらかさ優先：入っている（既定は自動）');
    S(st.right < 22 && st.half === st.right, '影の範囲：画面に合わせて半径 ' + st.right + ' マス（以前は 22）');
    S(st.animals.parts > 0 && st.animals.cast === 0 && st.animals.blobs > 0, '動物：形の影なし・足元の丸い影あり（部品 ' + st.animals.parts + '・影を落とす部品 ' + st.animals.cast + '・丸い影 ' + st.animals.blobs + '）');
  } else {
    S(!st.sm, 'なめらかさ優先：高画質では動かない');
    S(st.right === 22, '影の範囲：高画質は今までどおり半径 22 マス');
    S(st.animals.parts === 0 || st.animals.cast > 0, '動物：高画質は形の影あり（部品 ' + st.animals.parts + '・影を落とす部品 ' + st.animals.cast + '）');
  }
  // 3D設定の「なめらかさ」
  await p.evaluate(() => { MTQ3D.paused = true; });
  await p.evaluate(() => { document.querySelector('#g3-tools [data-a="panel"]').click(); });
  await p.waitForTimeout(300);
  const row = await p.evaluate(() => { const b = [...document.querySelectorAll('#g3-panel [data-sm]')]; return b.map((x) => ({ v: x.dataset.sm, on: x.classList.contains('on'), dis: x.disabled, t: x.textContent })); });
  S(row.length === 2 && row.find((x) => x.v === 'auto').on && row.every((x) => x.dis === !low), '3D設定に「なめらかさ」：' + row.map((x) => x.t + (x.on ? '［選択中］' : '') + (x.dis ? '（使えない）' : '')).join('／'));
  if (low) {
    await p.evaluate(() => { MTQ3D.smooth89.pr = 0.9; MTQ3D.renderer.setPixelRatio89(0.9); });
    await p.evaluate(() => { document.querySelector('#g3-panel [data-sm="off"]').click(); });
    const off = await p.evaluate(() => ({ ls: localStorage.getItem('mtq3d-smooth'), pr: MTQ3D.renderer.pixelRatio, on: MTQ3D.smoothOn89, cls: document.querySelector('#g3-panel [data-sm="off"]').classList.contains('on') }));
    S(off.ls === 'off' && !off.on && Math.abs(off.pr - st.pr) < 1e-6 && off.cls, '「使わない」を押す：元の解像度（' + off.pr + '）へ戻り、保存は mtq3d-smooth=off');
    await p.evaluate(() => { document.querySelector('#g3-panel [data-sm="auto"]').click(); });
    S(await p.evaluate(() => localStorage.getItem('mtq3d-smooth') === 'auto' && MTQ3D.smoothOn89), '「自動」に戻す');
    const diag = await p.evaluate(() => MTQ3D.diagText()); S(/解像度 1\.25（なめらかさ：自動/.test(diag) && /影の範囲 \d+マス/.test(diag), '3D設定の「状態」に解像度・なめらかさ・影の範囲：' + (diag.match(/画質 [^／]*/) || [''])[0]);
  }
  await p.evaluate(() => { document.querySelector('#g3-tools [data-a="panel"]').click(); MTQ3D.paused = false; });
  // ポヨ村の屋内の先読み
  const pre0 = await p.evaluate(() => Object.keys(MTQ3D.stats).filter((k) => /^build_poyo_(?!village)/.test(k)).length);
  await p.evaluate(() => { const D = window.MAP_DEFS; let at = null; for (const w of (D.poyo_village.warps || [])) if (w.to === 'world') { at = w; break; } World.enterMap('world', at.tx, at.ty, 'down'); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && !MTQ3D.building, null, { timeout: 300000 });
  await p.evaluate(() => { MTQ3D.paused = true; }); await p.waitForTimeout(6000);
  const pre1 = await p.evaluate(() => ({ n: Object.keys(MTQ3D.stats).filter((k) => /^build_poyo_(?!village)/.test(k)).length, pre: !!MTQ3D._pre }));
  S(pre1.n - pre0 <= 1 && !pre1.pre, 'フィールドにいる間：ポヨ村の屋内を作らない（村で作った部屋 ' + pre0 + ' → フィールドで 6 秒後 ' + pre1.n + '・作り中 ' + pre1.pre + '）');
  await p.evaluate(() => { World.enterMap('poyo_village', 24, 30, 'down'); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && !MTQ3D.building, null, { timeout: 300000 });
  await p.waitForFunction((n) => Object.keys(MTQ3D.stats).filter((k) => /^build_poyo_(?!village)/.test(k)).length > n, pre1.n, { timeout: 240000 }).catch(() => { });
  const pre2 = await p.evaluate(() => Object.keys(MTQ3D.stats).filter((k) => /^build_poyo_(?!village)/.test(k)).length);
  S(pre2 > pre1.n, 'ポヨ村へ戻って立ち止まると、屋内の先読みを続ける（' + pre1.n + ' → ' + pre2 + ' 部屋）');
  const keys1 = await p.evaluate(() => Object.keys(localStorage).sort());
  const added = keys1.filter((k) => keys0.indexOf(k) < 0);
  S(!keys1.some((k) => /^mtq-rpg-v2-slot/.test(k)) && added.filter((k) => /^mtq3d-/.test(k)).every((k) => k === 'mtq3d-smooth'), '保存のキー：2D のセーブ（mtq-rpg-v2-slot-*）には書かない。v8.9 で増える 3D設定のキーは mtq3d-smooth だけ（増えたキー ' + JSON.stringify(added) + '。ほかは以前からのオートセーブ・記録）');
  S(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  await br.close(); fs.writeFileSync(`${OUT}logs/check89_${VIEW}.json`, JSON.stringify({ steps, errs }, null, 1));
  console.log('結果: ' + steps.filter((x) => x.ok).length + ' OK / ' + steps.filter((x) => !x.ok).length + ' NG');
})().catch((e) => { console.error('FAIL', e); fs.writeFileSync(`${OUT}logs/check89_${VIEW}.json`, JSON.stringify({ steps, fail: String(e && e.message) }, null, 1)); process.exit(1); });
