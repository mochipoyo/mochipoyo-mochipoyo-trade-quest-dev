// v9.6 装備の外見：3D 版の 3Dモデルの表示（開発の確認用 ?party=model）。持ち物の付け替え先の骨・付けた部品・隠した元の持ち物を記録する
//   PORT=…  OUT=…（記録 logs/appear_model3d.json・画面写真 shots/appear_model3d.jpg）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8874; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/';
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto(`http://localhost:${PORT}/3d/index.html?nosw&party=model&layout=side`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    ['lina', 'gald'].forEach((id) => State.joinCompanion(id)); ['iron_spear', 'iron_armor', 'iron_shield', 'iron_helm', 'ring_power', 'robe', 'wizard_hat', 'oak_staff'].forEach((id) => State.addItem(id, 2));
    const h = d.hero; ['iron_spear', 'iron_armor', 'iron_shield', 'iron_helm', 'ring_power'].forEach((id) => Services.equipItem(h, id)); const l = State.actor('lina'); ['robe', 'wizard_hat'].forEach((id) => { if (Actors.canEquip(l, id)) Services.equipItem(l, id); });
    World.start(); const en = Object.keys(ENEMIES).filter((k) => ENEMIES[k].hp < 40 && !ENEMIES[k].boss)[0]; d.settings.autoBattle = false; BattleUI.start([en], {}); });
  await p.waitForSelector('#ui .cmd-list', { timeout: 120000 });
  await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return i && i.want > 0 && i.ready >= i.want; }, null, { timeout: 120000 }).catch(() => { });
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => { const i = BattleStage3D.actorsInfo(); return { style: i.style, party: i.party.map((x) => ({ id: x.id, model: x.model, ready: x.ready, eaModel: x.eaModel })) }; });
  await p.screenshot({ path: OUT + 'shots/appear_model3d.jpg', type: 'jpeg', quality: 78 });
  const ok = info.style === 'model' && info.party.every((x) => x.ready && x.eaModel);
  fs.mkdirSync(OUT + 'logs', { recursive: true }); fs.writeFileSync(OUT + 'logs/appear_model3d.json', JSON.stringify({ ok, info, errs }, null, 1));
  console.log(JSON.stringify(info, null, 1)); console.log('errors', errs.length, errs.slice(0, 3).join(' | ')); console.log('結果 model3d：' + (ok && !errs.length ? 'OK' : 'NG'));
  await br.close(); process.exit(ok && !errs.length ? 0 : 1);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
