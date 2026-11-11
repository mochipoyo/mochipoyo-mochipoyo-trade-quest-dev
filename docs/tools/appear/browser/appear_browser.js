// v9.6 装備でキャラの外見が変わる：ブラウザの確かめ（ヘッドレス Chromium。実機ではない。GPU なしのソフトウェア描画）
//   KIND=2d|3d  VIEW=pc|m360|land  PORT=…  OUT=…（記録 logs/appear_<KIND>_<VIEW>.json・画面写真 shots/appear_*.jpg）
//   1 なかまの画面：主人公（職業の立ち絵）と体格の違う仲間（ガルド）の全身が、いまの装備で合成される。外すと素の見た目
//   2 そうび：枠の一覧の全身。候補の試着（剣→槍、重鎧→ローブ、盾あり→なし、兜→帽子、装飾品）。Esc では本人の装備も外見も変わらない。決めると変わる
//   3 転職：主人公の見た目の絵が職業の素体に変わる。ロード：保存した装備ID から同じ外見（外見そのものはセーブに書かない）
//   4 戦闘（3D：4方向の絵に合成・勝利の正面・戦闘不能／2D：味方の欄の小さな立ち絵）
//   5 エラー・404・能力値と所持数は外見と関係なく今までどおり
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8874; const KIND = process.env.KIND || '2d'; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/';
const URL0 = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const TO = KIND === '3d' ? 120000 : 30000;
const VP = { pc: { viewport: { width: 1280, height: 720 } }, m360: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, land: { viewport: { width: 740, height: 360 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }[VIEW];
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch(); const ctx = await br.newContext(VP); const p = await ctx.newPage();
  const errs = [], cons = [], bad = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 200)); });
  p.on('response', (r) => { const u = r.url(); if (u.indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + u.replace(/^.*localhost:\d+/, '')); });
  const shot = (n) => p.screenshot({ path: `${OUT}shots/appear_${KIND}_${VIEW}_${n}.jpg`, type: 'jpeg', quality: 76, timeout: TO });
  const clean = () => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
  const pause3d = (on) => KIND === '3d' ? p.evaluate((v) => { MTQ3D.paused = v; }, on) : Promise.resolve();
  const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(300); };
  const waitEA = (sel) => p.waitForFunction((s) => { const h = [...document.querySelectorAll(s)]; return h.length && h.every((x) => /ok|none|error/.test(x.getAttribute('data-ea-state') || '')); }, sel, { timeout: TO }).catch(() => null);
  await p.goto(URL0);
  if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  const before = await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true; d.gold = 300;
    ['gald', 'lina'].forEach((id) => State.joinCompanion(id));
    ['steel_sword', 'iron_spear', 'iron_armor', 'robe', 'iron_shield', 'iron_helm', 'wizard_hat', 'ring_power', 'amulet_life', 'leather_cap', 'b19_unsmiling_aegis'].forEach((id) => State.addItem(id, 2));
    const h = d.hero; Services.equipItem(h, 'steel_sword'); Services.equipItem(h, 'iron_armor'); Services.equipItem(h, 'iron_shield'); Services.equipItem(h, 'iron_helm'); Services.equipItem(h, 'ring_power');
    const g = State.actor('gald'); Services.equipItem(g, 'iron_spear'); Services.equipItem(g, 'robe'); if (Actors.canEquip(g, 'wizard_hat')) Services.equipItem(g, 'wizard_hat');
    World.start();
    return { eqH: JSON.stringify(h.equip), eqG: JSON.stringify(g.equip), statsH: JSON.stringify(Actors.stats(h)), inv: JSON.stringify(d.inventory), keys: Object.keys(localStorage).length };
  });
  await pause3d(true);
  // 1 なかまの画面
  p.evaluate(() => { Menu.party(); }); await p.waitForSelector('#ui .party-screen .pt-art', { timeout: TO }); await waitEA('#ui .pt-art .ea-host'); await p.waitForTimeout(300);
  const s1 = await p.evaluate(() => { const h = document.querySelector('#ui .pt-art .ea-host'); const c = h && h.querySelector('canvas.ea-canvas'); const r = c ? c.getBoundingClientRect() : null; return { st: h && h.getAttribute('data-ea-state'), canvas: !!c, sig: c && c.getAttribute('data-ea-sig'), h: r ? Math.round(r.height) : 0, view: EquipmentAppearance.menuView(State.data.hero) }; });
  S(s1.st === 'ok' && s1.canvas && /steel_sword/.test(s1.sig) && /iron_helm/.test(s1.sig) && s1.view === 'job:warrior', '1 なかまの画面：主人公（' + s1.view + '）の全身にいまの装備（剣・鉄の鎧・鉄の盾・鉄の兜・指輪）を合成（高さ ' + s1.h + 'px）');
  await shot('1_party_hero');
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(300); await waitEA('#ui .pt-art .ea-host'); await p.waitForTimeout(300);
  const s1b = await p.evaluate(() => { const h = document.querySelector('#ui .pt-art .ea-host'); const c = h && h.querySelector('canvas.ea-canvas'); return { id: h && h.getAttribute('data-ea-actor'), st: h && h.getAttribute('data-ea-state'), sig: c && c.getAttribute('data-ea-sig') }; });
  S(s1b.id === 'gald' && s1b.st === 'ok' && /iron_spear/.test(s1b.sig) && /robe/.test(s1b.sig), '1 体格の違う仲間（ガルド）：槍とローブを合成（' + (s1b.sig || '').slice(0, 90) + '）');
  await shot('2_party_gald');
  await esc(); await clean();
  // 2 そうび：枠の一覧の全身 → 武器の候補で試着（剣→槍）→ Esc → 変わらない
  p.evaluate(() => { Menu.equip(State.data.hero); }); await p.waitForSelector('#ui .equip-menu', { timeout: TO }); await waitEA('#ui .equip-menu .ea-host'); await p.waitForTimeout(300);
  const s2 = await p.evaluate(() => { const h = document.querySelector('#ui .equip-menu .eq-body-head .ea-host'); const c = h && h.querySelector('canvas'); return { st: h && h.getAttribute('data-ea-state'), sig: c && c.getAttribute('data-ea-sig') }; });
  S(s2.st === 'ok' && /steel_sword/.test(s2.sig || ''), '2 そうび（枠の一覧）：同じ人物の全身（いまの装備）');
  await shot('3_equip_slots');
  await p.keyboard.press('Enter'); await p.waitForSelector('#ui .eq-list', { timeout: TO });
  const pickRow = async (id) => { const n = await p.evaluate((x) => { const L = [...document.querySelectorAll('#ui .eq-list')].pop(); const rows = [...L.querySelectorAll('.rw-item')]; const cur = rows.findIndex((r) => r.classList.contains('cur')); const want = rows.findIndex((r) => r.querySelector('[data-item-icon="' + x + '"]') || (x === '' && /はずす/.test(r.textContent))); return { cur, want }; }, id); const k = n.want - n.cur; for (let i = 0; i < Math.abs(k); i++) { await p.keyboard.press(k > 0 ? 'ArrowDown' : 'ArrowUp'); await p.waitForTimeout(120); } await waitEA('#ui .eq-list .eq-try .ea-host'); await p.waitForTimeout(250); return n.want; };
  const tryInfo = () => p.evaluate(() => { const L = [...document.querySelectorAll('#ui .eq-list')].pop(); const h = L.querySelector('.eq-try .ea-host'); const c = h && h.querySelector('canvas'); return { st: h && h.getAttribute('data-ea-state'), sig: c && c.getAttribute('data-ea-sig'), eq: JSON.stringify(State.data.hero.equip) }; });
  await pickRow('iron_spear'); const t1 = await tryInfo();
  S(t1.st === 'ok' && /iron_spear/.test(t1.sig || '') && !/steel_sword/.test(t1.sig || '') && t1.eq === before.eqH, '2 試着（剣→槍）：候補の全身は槍。本人の装備は変わらない');
  await shot('4_tryon_spear');
  await pickRow(''); const t2 = await tryInfo();
  S(t2.st === 'ok' && !/iron_spear|steel_sword/.test(t2.sig || '') && t2.eq === before.eqH, '2 試着（はずす）：武器のない全身。本人の装備は変わらない');
  await esc(); await p.waitForTimeout(200); await esc(); await clean();
  const afterEsc = await p.evaluate(() => JSON.stringify(State.data.hero.equip));
  S(afterEsc === before.eqH, '2 Esc（キャンセル）：装備は変わらない（外見も確定しない）');
  // 鎧→ローブ、盾→なし、兜→帽子、装飾品の付け外しを決める（今までの処理：Services.equipItem・はずす）→ なかまの画面の外見が変わる
  const changed = await p.evaluate(() => { const h = State.data.hero; const s0 = Actors.stats(h); const inv0 = JSON.stringify(State.data.inventory);
    Services.equipItem(h, 'robe'); State.addItem(h.equip.shield, 1); h.equip.shield = null; if (Actors.canEquip(h, 'leather_cap')) Services.equipItem(h, 'leather_cap'); else { State.addItem(h.equip.head, 1); h.equip.head = null; } State.addItem(h.equip.acc, 1); h.equip.acc = null; Services.equipItem(h, 'iron_spear');
    return { eq: JSON.stringify(h.equip), def: Actors.stats(h).def, def0: s0.def, inv0, inv: JSON.stringify(State.data.inventory) }; });
  // 兜→帽子：兜と帽子の両方を装備できる人で（装備の処理は今までどおり。見た目の合成だけを比べる）
  const hh = await p.evaluate(async () => { const EA = EquipmentAppearance; const hats = Object.keys(ITEMS).filter((id) => ITEMS[id].type === 'hat'), helms = Object.keys(ITEMS).filter((id) => ITEMS[id].type === 'helm');
    for (const a of State.partyActors()) { const he = helms.find((id) => Actors.canEquip(a, id)), ha = hats.find((id) => Actors.canEquip(a, id)); if (!he || !ha) continue;
      const v = EA.menuView(a); const r1 = await EA.composeFor(a, v, { equip: Object.assign({}, a.equip, { head: he }) }); const r2 = await EA.composeFor(a, v, { equip: Object.assign({}, a.equip, { head: ha }) });
      const l1 = (r1.layers || []).find((l) => l.slot === 'head'), l2 = (r2.layers || []).find((l) => l.slot === 'head');
      return { who: a.id, he, ha, ok: r1.state === 'ok' && r2.state === 'ok' && r1.sig !== r2.sig, s1: l1 && l1.shape + '/' + l1.sub, s2: l2 && l2.shape + '/' + l2.sub, eq: JSON.stringify(a.equip) }; }
    // 兜と帽子の両方を装備できる職業はない（戦士・騎士などは兜だけ、魔法使い・僧侶などは帽子だけ）→ ゲームの中では転職のときに兜→帽子になる。主人公で「戦士で鉄の兜」→「魔法使いで魔法使いの帽子」の見た目を比べる（本人のデータは変えない。写しで合成する）
    const h = State.data.hero; const a1 = { id: 'hero', job: 'warrior', equip: Object.assign({}, h.equip, { head: 'iron_helm' }) }, a2 = { id: 'hero', job: 'mage', equip: Object.assign({}, h.equip, { head: 'wizard_hat' }) };
    const r1 = await EA.composeFor(a1, EA.menuView(a1)), r2 = await EA.composeFor(a2, EA.menuView(a2)); const l1 = (r1.layers || []).find((l) => l.slot === 'head'), l2 = (r2.layers || []).find((l) => l.slot === 'head');
    return { who: 'hero（転職：戦士→魔法使い）', he: 'iron_helm', ha: 'wizard_hat', ok: r1.state === 'ok' && r2.state === 'ok' && r1.sig !== r2.sig, s1: l1 && l1.shape + '/' + l1.sub, s2: l2 && l2.shape + '/' + l2.sub, eq: JSON.stringify(h.equip) }; });
  S(hh && hh.ok && /^helm/.test(hh.s1) && /^hat/.test(hh.s2), '2 兜→帽子（' + (hh ? hh.who + '：' + hh.he + ' ' + hh.s1 + ' → ' + hh.ha + ' ' + hh.s2 : '-') + '）。見るだけで本人の装備は変わらない');
  p.evaluate(() => { Menu.party(); }); await p.waitForSelector('#ui .party-screen .pt-art', { timeout: TO }); await waitEA('#ui .pt-art .ea-host'); await p.waitForTimeout(300);
  const s3 = await p.evaluate(() => { const c = document.querySelector('#ui .pt-art .ea-host canvas'); return c && c.getAttribute('data-ea-sig'); });
  S(/iron_spear/.test(s3 || '') && /robe/.test(s3 || '') && !/iron_shield|iron_helm|ring_power/.test(s3 || ''), '2 決めたあと：槍・ローブ・盾なし・' + (/leather_cap/.test(s3 || '') ? '革の帽子' : '頭なし') + '・装飾品なしの外見（' + (s3 || '').slice(0, 100) + '）');
  await shot('5_party_changed');
  await esc(); await clean();
  // 3 転職・ロード
  const s4 = await p.evaluate(() => { const h = State.data.hero; const j0 = h.job; h.job = 'mage'; const v = EquipmentAppearance.menuView(h); h.job = j0; return v; });
  S(s4 === 'job:mage', '3 転職（魔法使い）：見た目の素体も職業の立ち絵に変わる（' + s4 + '）');
  const s5 = await p.evaluate(() => { const d = State.data; const snap = JSON.stringify(d); const has = /ea-|equip-bases|data:image|canvas/.test(snap); const pre = (window.MTQ_SAVE_PREFIX && /^mtq-3d-/.test(window.MTQ_SAVE_PREFIX)) ? window.MTQ_SAVE_PREFIX : 'mtq-rpg-v2-slot-'; localStorage.setItem(pre + '3', JSON.stringify(d)); const d2 = State.load(3); /* 3D 版は 3D の保存先（2D 版のキーは書き換えない） */ return { has, same: JSON.stringify(d2.hero.equip) === JSON.stringify(d.hero.equip), sig: EquipmentAppearance.signature(d2.hero, EquipmentAppearance.resolve(d2.hero), 'x', 'front') === EquipmentAppearance.signature(d.hero, EquipmentAppearance.resolve(d.hero), 'x', 'front') }; });
  S(!s5.has && s5.same && s5.sig, '3 セーブには外見を書かない。ロードした装備ID から同じ外見（signature が同じ）');
  // 4 戦闘
  const en = await p.evaluate(() => Object.keys(ENEMIES).filter((k) => { const e = ENEMIES[k]; return e.hp < 40 && !e.boss && !e.flee; })[0]);
  await pause3d(false);
  await p.evaluate((id) => { const d = State.data; d.settings.autoBattle = false; d.settings.battleSpeed = 'veryfast'; window.__btRes = null; window.__bt = BattleUI.start([id], {}).then((r) => { window.__btRes = r; }); }, en);
  await p.waitForSelector('#ui .cmd-list', { timeout: 90000 }); await p.waitForTimeout(KIND === '3d' ? 2500 : 600);
  if (KIND === '3d') {
    await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return i && i.party && i.party.length && i.party.every((x) => x.ea || !x.eaWait); }, null, { timeout: 60000 }).catch(() => { });
    const b3 = await p.evaluate(() => { const i = BattleStage3D.actorsInfo(); return { dir: i.partyDir, party: i.party.map((x) => ({ id: x.id, model: x.model, ea: x.ea, size: x.size })) }; });
    const hero = b3.party.find((x) => x.id === 'hero');
    S(hero && hero.ea && /iron_spear/.test(hero.ea) && /^pixel:dir:/.test(hero.model), '4 3D の戦闘（' + b3.dir + '）：主人公の 4 方向の絵に装備を合成（' + (hero ? hero.model : '-') + '）');
    S(b3.party.filter((x) => x.ea).length === b3.party.length, '4 3D の戦闘：戦闘メンバー全員が合成した絵（' + b3.party.map((x) => x.id + ':' + (x.ea ? 'ok' : '元の絵')).join(' ') + '）');
    await p.waitForTimeout(800); await shot('6_battle');
  } else {
    await waitEA('#battle-party .ea-host');
    const b2 = await p.evaluate(() => [...document.querySelectorAll('#battle-party .bp')].map((c) => { const h = c.querySelector('.ea-host'); const cv = h && h.querySelector('canvas'); return c.getAttribute('data-id') + ':' + (h ? h.getAttribute('data-ea-state') : 'none') + (cv ? '' : '(img)'); }));
    S(b2.every((x) => /:ok$|:none/.test(x)), '4 2D の戦闘：味方の欄の小さな立ち絵に合成（' + b2.join(' ') + '。スマホでは欄の立ち絵は今までどおり出さない）');
    await shot('6_battle');
  }
  // 勝利まで（勝利の正面・戦闘不能は 3D の板の差し替えで確かめる）
  await p.evaluate(() => { const b = BattleUI.battle; b.enemies.forEach((e) => { e.hp = 1; }); const g = b.party.find((a) => a.id === 'gald'); if (g) { g.hp = 0; g.dead = true; } State.data.settings.autoBattle = true; });
  await p.keyboard.press('Enter');
  let fin = false; let vic = null; for (let i = 0; i < 120 && !fin; i++) { await p.waitForTimeout(400); if (KIND === '3d' && !vic) vic = await p.evaluate(() => { const i = BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); if (!i) return null; const h = i.party.find((x) => x.id === 'hero'); return h && /dir:front/.test(h.model) && (h.ea || !h.eaWait) ? { model: h.model, ea: h.ea, dead: (i.party.find((x) => x.id === 'gald') || {}).dead } : null; });
    if (vic && !vic.shot) { vic.shot = true; await shot('7_victory'); }
    fin = await p.evaluate(() => !!window.__btRes); if (fin) break; const st = await p.evaluate(() => ({ sel: !!document.querySelector('#ui .rw-list .rw-item.cur'), msg: !!document.querySelector('#ui .rw-msg') })); if (st.sel || st.msg) await p.keyboard.press('Enter'); }
  if (KIND === '3d') S(vic && vic.ea && /iron_spear/.test(vic.ea), '4 3D の勝利：正面に振り向いた絵も同じ装備（' + (vic ? vic.model : '振り向きを見られなかった') + '）');
  for (let i = 0; i < 20; i++) { const done = await p.evaluate(() => !!window.__btRes); if (done) break; await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
  await clean(); await pause3d(false);
  // 5 能力値・所持数（外見とは関係なく、今までの処理どおり）・エラー
  S(changed.def !== changed.def0 && changed.inv !== changed.inv0, '5 装備を変えると能力値・所持数は今までの処理どおり変わる（防御 ' + changed.def0 + '→' + changed.def + '）');
  const st = await p.evaluate(() => ({ un: EquipmentAppearance.unsupported(), stats: EquipmentAppearance.stats() }));
  S(Object.keys(st.un).length === 0, '5 未対応の人物・向きはない（' + JSON.stringify(st.un).slice(0, 120) + '）。合成 ' + st.stats.composed + ' 回・使い回し ' + st.stats.cacheHit + ' 回');
  S(errs.length === 0, '5 ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  S(cons.length === 0, '5 コンソールのエラーなし' + (cons.length ? '：' + cons.slice(0, 3).join(' / ') : ''));
  S(bad.length === 0, '5 思いがけない 404 などはない' + (bad.length ? '：' + bad.slice(0, 5).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/appear_${KIND}_${VIEW}.json`, JSON.stringify({ KIND, VIEW, ok: steps.length - ng, ng, steps }, null, 1));
  console.log(`結果 ${KIND} ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
