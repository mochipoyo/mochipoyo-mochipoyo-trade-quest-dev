// v9.7 装備の外見（ドット絵の差分）：ブラウザの確かめ（ヘッドレス Chromium。実機ではない。GPU なしのソフトウェア描画）
//   主人公の 3 つの組み合わせ（軽装＋剣／重鎧＋兜＋剣と盾／ローブ＋帽子＋杖）と、素（装備なし）・槍・部品のない品（斧・小さな帽子）を、
//   1 メニュー（なかまの画面の立ち絵＝戦士の立ち絵）と 2 戦闘（3D：背面の 4 方向の絵）で表示して、画面写真と数値を残す
//   確かめること：元の剣・盾が残らない／兜から髪が出ない／胴の差分が体の外へ出ない（肩当てが浮かない）／足もとの基準点・人物の大きさ・立ち位置が組み合わせで変わらない
//                 部品のない品・向き・人物は本人の従来の絵／能力値・所持数・セーブの形は今までどおり／ページのエラーなし
//   KIND=3d|2d  PORT=…  OUT=…（記録 logs/pixel_<KIND>.json・画面写真 shots/pixel_*.png）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const KIND = process.env.KIND || '3d'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const URL0 = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const SETS = [
  { key: 'plain', name: '素（装備なし）', eq: {} },
  { key: 'light', name: '軽装＋剣', eq: { armor: 'leather_armor', weapon: 'steel_sword' } },
  { key: 'heavy', name: '重鎧＋兜＋剣と盾', eq: { armor: 'iron_armor', head: 'iron_helm', weapon: 'steel_sword', shield: 'iron_shield' } },
  { key: 'robe', name: 'ローブ＋帽子＋杖', eq: { armor: 'robe', head: 'wizard_hat', weapon: 'oak_staff' } },
  { key: 'spear', name: '重鎧＋槍（長さの確かめ）', eq: { armor: 'iron_armor', weapon: 'iron_spear' } },
  { key: 'heavyaxe', name: '重鎧＋手斧（部品のない武器）', eq: { armor: 'iron_armor', weapon: 'hand_axe' } },
];
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  const errs = [], bad = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('response', (r) => { const u = r.url(); if (u.indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + u.replace(/^.*localhost:\d+/, '')); });
  await p.goto(URL0);
  if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  const before = await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    ['gald', 'lina'].forEach((id) => State.joinCompanion(id));
    ['leather_armor', 'iron_armor', 'robe', 'iron_helm', 'wizard_hat', 'steel_sword', 'iron_shield', 'oak_staff', 'iron_spear', 'leather_cap', 'ring_power'].forEach((id) => State.addItem(id, 1));
    const ax = Object.keys(ITEMS).filter((k) => ITEMS[k].cat === 'weapon' && ITEMS[k].type === 'axe' && Actors.canEquip(d.hero, k))[0] || null; if (ax) State.addItem(ax, 1); window.__axe = ax;
    const T = Win.toast; Win.toast = function (m) { (window.__toasts = window.__toasts || []).push(String(m)); return T.apply(this, arguments); };
    World.start();
    return { mode: EquipmentAppearance.mode(), axe: ax };
  });
  S(before.mode === 'pixel', '外見の作り方：ドット絵の差分（mode ' + before.mode + '）');
  const unequipAll = () => p.evaluate(() => { const h = State.data.hero; ['weapon', 'armor', 'shield', 'head', 'acc'].forEach((s) => { if (h.equip[s]) Services.unequipItem ? Services.unequipItem(h, s) : (State.addItem(h.equip[s], 1), h.equip[s] = null); }); return JSON.stringify(h.equip); });
  const equipSet = (eq) => p.evaluate((eq) => { const h = State.data.hero; const r = {}; Object.keys(eq).forEach((s) => { r[s] = Services.equipItem(h, eq[s]); }); return { equip: Object.assign({}, h.equip), res: r, stats: Actors.stats(h) }; }, eq);
  const clean = () => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
  const hasUnequip = await p.evaluate(() => typeof Services.unequipItem === 'function');
  console.log('Services.unequipItem:', hasUnequip);
  const rec = { menu: {}, battle: {}, geo: {} };
  // ---------------- 1 メニュー（なかまの画面） ----------------
  for (const st of SETS) {
    await clean(); await unequipAll(); const e = await equipSet(st.eq);
    const want = Object.keys(st.eq).every((s) => e.equip[s] === st.eq[s]);
    await p.evaluate(() => { if (window.MTQ3D) MTQ3D.paused = true; Menu.party(); });
    await p.waitForSelector('#ui .party-screen .pt-art', { timeout: 60000 });
    await p.waitForFunction(() => { const h = document.querySelector('#ui .pt-art .ea-host'); return h && /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, null, { timeout: 30000 }).catch(() => null);
    await p.waitForTimeout(250);
    const m = await p.evaluate(() => {
      const h = document.querySelector('#ui .pt-art .ea-host'); const cv = h && h.querySelector('canvas.ea-canvas'); const r = cv ? cv.getBoundingClientRect() : null;
      const view = EquipmentAppearance.pixelView('hero', 'job:warrior'); const f = view.frame; const k = (f.y1 - f.y0) / view.h;
      // 決まった枠（帽子・槍・杖の先まで）：下辺＝足もと・左右の中心・1 ドットの大きさ
      const px = r ? r.height / (f.y1 - f.y0) : null;
      return { st: h && h.getAttribute('data-ea-state'), parts: cv && cv.getAttribute('data-ea-parts'), mode: cv && cv.getAttribute('data-ea-mode'), k, px, bottom: r && r.bottom, cx: r && (r.left + r.width / 2), w: r && r.width, h: r && r.height, cw: cv && cv.width, ch: cv && cv.height };
    });
    rec.menu[st.key] = Object.assign({ equip: e.equip, stats: e.stats }, m);
    S(want && m.st === 'ok' && m.mode === 'pixel', 'メニュー［' + st.name + '］装備 ' + JSON.stringify(e.equip) + ' → 部品：' + m.parts);
    const box = await p.$('#ui .party-screen .pt-artbox') || await p.$('#ui .party-screen .pt-art');
    if (box) await box.screenshot({ path: `${OUT}shots/pixel_menu_${KIND}_${st.key}.png` });
    if (st.key === 'robe') await p.screenshot({ path: `${OUT}shots/pixel_menu_full_robe_${KIND}.jpg`, type: 'jpeg', quality: 85 });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  }
  const ms = SETS.map((s) => rec.menu[s.key]);
  const near = (a, b, t) => Math.abs(a - b) <= t;
  S(ms.every((m) => near(m.bottom, ms[0].bottom, 1) && near(m.cx, ms[0].cx, 1) && near(m.px, ms[0].px, 0.01)), 'メニュー：足もと（元の絵の下辺）・左右の中心・1 ドットの大きさが、5 つの組み合わせで同じ（' + ms.map((m) => [m.bottom.toFixed(1), m.cx.toFixed(1), m.px.toFixed(3)].join('/')).join('　') + '）');
  S(ms.every((m) => near(m.h, 300, 1) || near(m.h, 190, 1)), 'メニュー：決まった枠（帽子・槍・杖の先まで）を絵の枠の高さに収める（枠 ' + ms[0].h + 'px・1 ドット ' + ms[0].px.toFixed(3) + 'px＝元の絵の ' + (ms[0].px * 200).toFixed(0) + 'px 分）');
  // ---------------- 合成の絵の数値（同じ関数をページで使う） ----------------
  const geo = await p.evaluate(async (SETS) => {
    const EA = EquipmentAppearance; const out = {};
    const load = (u) => new Promise((ok) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = (Assets.base || '') + u; });
    const data = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height);
    const layerData = async (view, k, W, H, pad) => { const r = view.parts[k]; const im = await load(r.url); const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(im, pad + r.x, pad + r.y); return data(c); };
    for (const vk of ['job:warrior', 'back', 'front']) {
      const view = EA.pixelView('hero', vk); const pad = 48; const W = view.w + 2 * pad, H = view.h + 2 * pad;
      const orig = await load(view.src); const oc = document.createElement('canvas'); oc.width = W; oc.height = H; oc.getContext('2d').drawImage(orig, pad, pad); const od = data(oc);
      const hel = await layerData(view, 'head_helm_t', W, H, pad), helf = await layerData(view, 'head_helm_f', W, H, pad);
      const plain = await layerData(view, 'base_plain', W, H, pad), lt = await layerData(view, 'armor_light_t', W, H, pad), ht = await layerData(view, 'armor_heavy_t', W, H, pad);
      const sw = await layerData(view, 'weapon_sword', W, H, pad), sh = await layerData(view, 'shield', W, H, pad), shp = await layerData(view, 'armor_shape_f', W, H, pad);
      const res = {};
      for (const st of SETS) {
        const actor = { id: 'hero', job: 'warrior', equip: st.eq };
        let r = EA.request(actor, vk); if (r.state === 'loading') { await r.promise; r = EA.request(actor, vk); }
        const d = data(r.canvas); const A = (D, x, y) => D.data[(y * W + x) * 4 + 3];
        // 足もと：体の範囲（素の絵）の列で、いちばん下の不透明な行
        let feet = -1; for (let y = H - 1; y >= 0 && feet < 0; y--) for (let x = pad + view.body.x0; x < pad + view.body.x1; x++) if (A(d, x, y) > 16) { feet = y; break; }
        // 元の剣・盾のドットが残っていないか（剣・盾を持たない組み合わせ）：元の剣・盾の部品の場所に、その色のままのドットが何個あるか
        let swLeft = 0, shLeft = 0;
        for (let i = 0; i < W * H; i++) {
          const eq3 = (D) => D.data[i * 4 + 3] > 16 && d.data[i * 4 + 3] > 16 && Math.abs(D.data[i * 4] - d.data[i * 4]) < 3 && Math.abs(D.data[i * 4 + 1] - d.data[i * 4 + 1]) < 3 && Math.abs(D.data[i * 4 + 2] - d.data[i * 4 + 2]) < 3;
          const armored = /armor|mail|plate/.test(st.eq.armor || '');   // 鎧の形を重ねる組み合わせ
          const same = (D) => eq3(D) && !eq3(plain) && !(armored && eq3(shp));   // 元の剣・盾の色のドットで、素の絵・鎧の形の部品では説明できないもの（体の上に重なった所も数える）
          if (!st.eq.weapon || st.eq.weapon !== 'steel_sword') { if (same(sw)) swLeft++; }
          if (!st.eq.shield) { if (same(sh)) shLeft++; }
        }
        // 兜から髪が出ていないか：兜の組み合わせで、額の帯より上の行・兜の外にある赤い髪のドット
        let hairOut = 0;
        if (st.eq.head === 'iron_helm') {
          const brow = vk === 'back' ? pad + 160 : vk === 'front' ? pad + 150 : pad + 46;
          for (let y = 0; y < brow; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d.data[i + 3] < 16) continue; if (hel.data[i + 3] > 16 || helf.data[i + 3] > 16) continue;
            const R = d.data[i], G = d.data[i + 1], B = d.data[i + 2]; if (R > 120 && R > G * 1.6 && R > B * 1.6) hairOut++; }
        }
        res[st.key] = { state: r.state, w: r.canvas.width, h: r.canvas.height, feet, swLeft, shLeft, hairOut, parts: r.parts };
      }
      // 胴の差分（軽装・重鎧）は素の絵の体の中だけ（体の外へ出ない＝肩当てが浮かない）
      const body = (i) => od.data[i * 4 + 3] >= 16 || plain.data[i * 4 + 3] >= 16;   // 体＝元の絵 ＋ 盾の後ろを補った腕（素の絵）
      let outL = 0, outH = 0; for (let i = 0; i < W * H; i++) { if (lt.data[i * 4 + 3] > 16 && !body(i)) outL++; if (ht.data[i * 4 + 3] > 16 && !body(i)) outH++; }   // 体の外へ出ない
      // 元の絵の足もと
      let ofeet = -1; for (let y = H - 1; y >= 0 && ofeet < 0; y--) for (let x = 0; x < W; x++) if (od.data[(y * W + x) * 4 + 3] > 16) { ofeet = y; break; }
      out[vk] = { res, outL, outH, ofeet, W, H };
    }
    return out;
  }, SETS);
  rec.geo = geo;
  for (const vk of ['job:warrior', 'back', 'front']) {
    const g = geo[vk]; const rs = SETS.map((s) => g.res[s.key]);
    S(rs.every((r) => r.state === 'ok' && r.w === g.W && r.h === g.H), vk + '：' + SETS.length + ' つの組み合わせとも、合成の絵の大きさは同じ（' + g.W + '×' + g.H + '＝元の絵＋まわり 48）');
    S(rs.every((r) => r.feet === g.ofeet), vk + '：足もとの行が元の絵と同じ（' + g.ofeet + '）：' + SETS.map((s) => s.key + ' ' + g.res[s.key].feet).join('・') + '（槍・杖を持っても変わらない）');
    S(rs.every((r) => r.swLeft === 0 && r.shLeft === 0), vk + '：剣・盾を持たない組み合わせに、元の剣・盾のドットが残っていない（' + SETS.map((s) => s.key + ' 剣' + g.res[s.key].swLeft + '/盾' + g.res[s.key].shLeft).join('・') + '）');
    S(g.res.heavy.hairOut === 0, vk + '：兜の上・外に髪のドットがない（' + g.res.heavy.hairOut + '）');
    S(g.outL === 0 && g.outH === 0, vk + '：胴の差分（軽装・重鎧）は体の外へ出ない＝肩当ては元の肩の上のまま（外へ出たドット ' + g.outL + '・' + g.outH + '）');
  }
  // ---------------- 部品のない品・人物 ----------------
  await clean(); await unequipAll();
  const un = await p.evaluate(() => {
    const EA = EquipmentAppearance; const h = State.data.hero;
    const a1 = window.__axe ? EA.pixelPlan({ id: 'hero', job: 'warrior', equip: { weapon: window.__axe } }, 'job:warrior') : null;
    const a2 = EA.pixelPlan({ id: 'hero', job: 'warrior', equip: { head: 'leather_cap' } }, 'job:warrior');
    const a3 = EA.pixelPlan({ id: 'hero', job: 'warrior', equip: { acc: 'ring_power', weapon: 'steel_sword' } }, 'job:warrior');
    return { axe: a1, cap: a2, ring: a3, gald: EA.supports(State.actor('gald'), 'front'), galdBack: EA.supports(State.actor('gald'), 'back'), heroLeft: EA.supports(h, 'left'), heroFront: EA.supports(h, 'front'), heroMage: EA.supports({ id: 'hero', job: 'mage' }, 'job:mage') };
  });
  S(un.axe && un.axe.ok && un.axe.mats.length === 0 && /部品がない/.test(un.axe.skipped.join()) && un.cap.ok && un.cap.base === 'base_plain' && /leather_cap/.test(un.cap.skipped.join()), '部品のない品は、その部位だけ描かない（斧：' + (un.axe ? un.axe.skipped.join() : '装備できる斧なし') + '／革の帽子：' + un.cap.skipped.join() + '）');
  S(un.ring.ok && un.ring.skipped.length === 1, '装飾品は描かない（試作の対象外。記録：' + un.ring.skipped.join(',') + '）。ほかの装備は着替える');
  S(un.gald && un.galdBack && !un.heroLeft && !un.heroMage && un.heroFront, '部品のない向き（主人公の戦闘の横向き・魔法使いの立ち絵の向き）は本人の従来の絵。主人公の勝利の正面は着替える。v9.8 からガルドの正面・背面も着替える（確かめは appear_pixel_comp.js）');
  // 斧を持ったときのメニュー：従来の立ち絵のまま
  if (before.axe) {
    await equipSet({ weapon: before.axe }); await p.evaluate(() => { Menu.party(); }); await p.waitForSelector('#ui .party-screen .pt-art', { timeout: 60000 });
    await p.waitForFunction(() => { const h = document.querySelector('#ui .pt-art .ea-host'); return h && /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, null, { timeout: 30000 }).catch(() => null);
    const ax = await p.evaluate(() => { const h = document.querySelector('#ui .pt-art .ea-host'); const cv = h && h.querySelector('canvas.ea-canvas'); return { st: h && h.getAttribute('data-ea-state'), parts: cv && cv.getAttribute('data-ea-parts'), skipped: cv && cv.getAttribute('data-ea-skipped') }; });
    S(ax.st === 'ok' && !/weapon_/.test(ax.parts || '') && /hand_axe|axe/.test(ax.skipped || ''), 'メニュー［斧だけ］：武器は描かない（手は空・元の剣は戻らない）。部品：' + ax.parts + '／描かない：' + ax.skipped);
    const box = await p.$('#ui .party-screen .pt-artbox') || await p.$('#ui .party-screen .pt-art'); if (box) await box.screenshot({ path: `${OUT}shots/pixel_menu_${KIND}_axe.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  }
  // ---------------- 2 戦闘（3D：背面）：組み合わせごとに新しいページで始める（前の戦闘の終わり方に左右されないように） ----------------
  if (KIND === '3d') {
    for (const st of SETS) {
      const t0 = Date.now(); const q = await ctx.newPage(); q.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
      await q.goto(URL0); await q.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await q.waitForSelector('#ui .title-menu', { timeout: 300000 });
      await q.evaluate((eq) => {
        const T = Win.toast; Win.toast = function (m) { (window.__toasts = window.__toasts || []).push(String(m)); return T.apply(this, arguments); };
        document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
        State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true; d.settings.autoBattle = false;
        ['gald', 'lina'].forEach((id) => State.joinCompanion(id));
        const h = d.hero; ['weapon', 'armor', 'shield', 'head', 'acc'].forEach((s) => { if (h.equip[s]) { State.addItem(h.equip[s], 1); h.equip[s] = null; } });
        Object.keys(eq).forEach((s) => { State.addItem(eq[s], 1); Services.equipItem(h, eq[s]); });
        World.start(); const en = Object.keys(ENEMIES).filter((k) => ENEMIES[k].hp < 40 && !ENEMIES[k].boss && !ENEMIES[k].flee)[0]; BattleUI.start([en], {});
      }, st.eq);
      await q.waitForSelector('#ui .cmd-list', { timeout: 120000 });
      await q.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); const h = i && i.party && i.party.find((x) => x.id === 'hero'); return h && /dir:/.test(h.model || '') && !h.eaWait; }, null, { timeout: 60000 }).catch(() => null);
      await q.waitForTimeout(1200);
      const b = await q.evaluate(() => { const i = BattleStage3D.actorsInfo(); const h = i.party.find((x) => x.id === 'hero'); return { hero: h, equip: Object.assign({}, State.data.hero.equip), others: i.party.filter((x) => x.id !== 'hero').map((x) => ({ id: x.id, ea: x.ea, model: x.model })), toasts: (window.__toasts || []).filter((t) => /3D/.test(t)) }; });
      b.ms = Date.now() - t0; rec.battle[st.key] = b;
      S(b.hero && /dir:back/.test(b.hero.model || '') && (st.key === 'plain' || !!b.hero.ea) && !b.toasts.length, '戦闘［' + st.name + '］主人公の背面の絵に合成（' + (b.hero && b.hero.model) + '・装備 ' + Object.values(b.equip).filter(Boolean).join(',') + '）。仲間は従来の絵（' + b.others.map((o) => o.id + ':' + (o.ea ? '合成' : '従来')).join(' ') + '）');
      await q.screenshot({ path: `${OUT}shots/pixel_battle_${st.key}.jpg`, type: 'jpeg', quality: 72 });
      await q.close();
    }
    const bs = SETS.map((s) => rec.battle[s.key] && rec.battle[s.key].hero && rec.battle[s.key].hero.size);
    S(bs.every((z) => z && z.w === bs[0].w && z.h === bs[0].h), '戦闘：主人公の大きさ（カメラ合わせ・影・HP の位置に使う範囲）が組み合わせで同じ（' + bs.map((z) => z && z.w + '×' + z.h).join('　') + '）');
  }
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  S(bad.length === 0, '読み込みの失敗（404 など）なし' + (bad.length ? '：' + bad.slice(0, 5).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/pixel_${KIND}.json`, JSON.stringify({ KIND, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 pixel ${KIND}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
