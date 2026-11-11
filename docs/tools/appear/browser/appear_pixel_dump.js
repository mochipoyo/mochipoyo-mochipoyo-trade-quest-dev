// v9.7 装備の外見（ドット絵の差分）：ゲームの中で作った合成の絵（EquipmentAppearance.request の canvas）をそのまま PNG に書き出す（拡大して見比べる用）
//   PORT=…  OUT=…（shots/pixel_canvas_<向き>_<組み合わせ>.png と、並べた pixel_canvas_sheet.png）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const SETS = [['plain', {}], ['light', { armor: 'leather_armor', weapon: 'steel_sword' }], ['heavy', { armor: 'iron_armor', head: 'iron_helm', weapon: 'steel_sword', shield: 'iron_shield' }], ['robe', { armor: 'robe', head: 'wizard_hat', weapon: 'oak_staff' }], ['spear', { armor: 'iron_armor', weapon: 'iron_spear' }]];
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true });
  const br = await chromium.launch(); const p = await br.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html?nosw`); await p.waitForFunction(() => window.EquipmentAppearance && window.EQUIP_PIXELS, null, { timeout: 120000 });
  const out = await p.evaluate(async (SETS) => {
    const EA = EquipmentAppearance; const r = {};
    for (const vk of ['job:warrior', 'back']) for (const [k, eq] of SETS) {
      const a = { id: 'hero', job: 'warrior', equip: eq }; let q = EA.request(a, vk); if (q.state === 'loading') { await q.promise; q = EA.request(a, vk); }
      r[vk.replace(':', '_') + '_' + k] = q.state === 'ok' ? q.canvas.toDataURL('image/png') : null;
    }
    return r;
  }, SETS);
  for (const [k, u] of Object.entries(out)) if (u) fs.writeFileSync(`${OUT}shots/pixel_canvas_${k}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log('書き出し', Object.keys(out).length, 'エラー', errs.length); await br.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
