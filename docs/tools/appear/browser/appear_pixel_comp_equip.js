// v9.8 装備の外見：仲間（リーナ・ガルド）の「そうび」画面（上の立ち絵と、品の一覧の試着の小さな枠）を写す（ヘッドレス Chromium。実機ではない）
//   ふつうの手順：メニュー（Esc）→［そうび］→ リーナ／ガルド → 武器 → 品の一覧（試着の枠に、選んでいる品を持った絵）→ Esc で戻る（装備は変えない）
//   VIEW=pc｜phone  PORT=…  OUT=…（shots/ui_<VIEW>_c_equip_<人物>.jpg・logs/ui_comp_equip_<VIEW>.json）
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const WHO = { lina: ['リーナ', 'oak_staff', 'robe_skip'], gald: ['ガルド', 'battle_axe', 'iron_armor'] };
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext(VIEW === 'phone' ? Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 2 }) : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(`http://localhost:${PORT}/3d/index.html?nosw`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    ['lina', 'gald'].forEach((id) => State.joinCompanion(id)); ['robe_skip', 'oak_staff', 'iron_armor', 'battle_axe'].forEach((id) => State.addItem(id, 1));
    Services.equipItem(State.actor('lina'), 'robe_skip'); Services.equipItem(State.actor('gald'), 'iron_armor');   // 鎧だけ着て、武器は一覧で試着
    World.start(); if (window.MTQ3D) MTQ3D.paused = true;
  });
  await p.waitForTimeout(1200);
  const top = async () => { const h = await p.evaluateHandle(() => { const l = [...document.querySelectorAll('#ui .rw-list, #ui .rw-choice')]; return l[l.length - 1] || null; }); return h.asElement(); };
  const waitTop = async (re, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const t = await top(); if (t) { const tx = await t.evaluate((n) => (n.querySelector('.rw-title, .rw-prompt') || n).textContent); if (!re || re.test(tx)) return t; } await p.waitForTimeout(100); } throw new Error('一覧が出ない ' + re); };
  const pick = async (listRe, rowRe, confirm = true) => {
    const t = await waitTop(listRe); const row = await t.evaluateHandle((n, src) => { const re = new RegExp(src); return [...n.querySelectorAll('.rw-item, .rw-opt')].find((r) => !r.classList.contains('disabled') && re.test(r.textContent.trim())) || null; }, rowRe.source);
    const el = row.asElement(); if (!el) throw new Error('行がない ' + rowRe); await el.scrollIntoViewIfNeeded(); await el.click(); await p.waitForTimeout(200);
    if (confirm && await t.evaluate((n) => n.isConnected)) { const ok = await t.$('.rw-ok'); if (ok) await ok.click(); else await el.click(); } await p.waitForTimeout(300);
  };
  const rec = {};
  for (const id of ['lina', 'gald']) {
    const [name, weapon] = WHO[id];
    await p.keyboard.press('Escape'); await waitTop(/メニュー/);
    const eqb = await (await top()).$('.rw-tool[data-tool="equip"]'); await eqb.click(); await p.waitForTimeout(250);
    await pick(/装備を変える/, new RegExp('^' + name)); await waitTop(new RegExp(name + 'の装備')); await p.waitForTimeout(600);
    const head = await p.evaluate(() => { const n = document.querySelector('#ui .equip-menu .eq-body-head canvas'); const h = n && n.closest('.ea-host'); const r = n && n.getBoundingClientRect(); return { parts: n && n.getAttribute('data-ea-parts'), state: h && h.getAttribute('data-ea-state'), rect: r && { w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }; });
    await pick(new RegExp(name + 'の装備'), /^武器/);
    const wn = await p.evaluate((x) => ITEMS[x].name, weapon);
    await pick(new RegExp(name + 'の.+を選ぶ'), new RegExp('^(◎ )?' + wn), false);   // 選ぶだけ（確定しない）→ 試着の枠
    await p.waitForFunction(() => { const h = document.querySelector('#ui .eq-try .ea-host'); return h && /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, null, { timeout: 20000 }).catch(() => null);
    await p.waitForTimeout(500);
    const tryOn = await p.evaluate(() => { const h = document.querySelector('#ui .eq-try .ea-host'); const n = h && h.querySelector('canvas'); const r = n && n.getBoundingClientRect(); const box = document.querySelector('#ui .eq-try'); const b = box && box.getBoundingClientRect();
      return { state: h && h.getAttribute('data-ea-state'), parts: n && n.getAttribute('data-ea-parts'), rect: r && { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, box: b && { x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }; });
    await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_c_equip_${id}.jpg`, type: 'jpeg', quality: 82 });
    const before = await p.evaluate((a) => JSON.stringify(State.actor(a).equip), id);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); for (let i = 0; i < 4; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
    const after = await p.evaluate((a) => JSON.stringify(State.actor(a).equip), id);
    rec[id] = { head, tryOn, same: before === after };
    S(head.state === 'ok' && /armor_/.test(head.parts || ''), `${name}：そうび画面の上の立ち絵に合成（${head.parts}・${JSON.stringify(head.rect)}）`);
    S(tryOn.state === 'ok' && /weapon_/.test(tryOn.parts || '') && before === after, `${name}：品の一覧で ${wn} を選ぶと、試着の枠に持った絵（${tryOn.parts}・絵 ${JSON.stringify(tryOn.rect)}）。確定しなければ装備は変わらない`);
  }
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/ui_comp_equip_${VIEW}.json`, JSON.stringify({ VIEW, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 pixel ui comp equip ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); process.exit(2); });
