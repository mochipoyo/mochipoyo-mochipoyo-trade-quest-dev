// v9.8 装備の外見（ドット絵の差分）：仲間（リーナ・ガルド）の開発用の切り替えでの確かめ（ヘッドレス Chromium。実機ではない。GPU なし）
//   装備を Services.equipItem で直接切り替え、ゲームの中の合成（EquipmentAppearance.request）と、なかまの画面の立ち絵を調べる
//   確かめること：
//     ・合成の絵の大きさ・足もとの行が、元の絵と同じ（組み合わせで変わらない）／勝利の正面＝メニュー正面と同じ部品を戦闘の正面の位置へ
//     ・武器を外した組み合わせに、元の武器（杖・斧）のドットが残らない（手は空）
//     ・部品のない品は部位ごと（ガルドの槍・兜、リーナのこん棒・羽根帽子・盾）：描かない。ほかの部位（鎧）は着替える
//     ・v9.8.1 ガルドの剣・盾、リーナの帽子（cap 型）。斧から剣と盾に替えても重鎧はそのまま、武器をはずすと手ぶら
//     ・なかまの画面：決まった枠（足もと・左右の中心・1 ドットの大きさが組み合わせで同じ）
//     ・能力値・所持数・セーブの形は今までどおり／ページのエラーなし
//   KIND=3d|2d  PORT=…  OUT=…（記録 logs/pixel_comp_<KIND>.json・画面写真 shots/pixel_comp_*.png）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const KIND = process.env.KIND || '3d'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const URL0 = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const SETS = {
  lina: [{ key: 'plain', name: '装備なし', eq: {} }, { key: 'robe', name: '法衣＋杖', eq: { armor: 'robe_skip', weapon: 'oak_staff' } }, { key: 'cap', name: '法衣＋杖＋革の帽子', eq: { armor: 'robe_skip', weapon: 'oak_staff', head: 'leather_cap' } },
    { key: 'light', name: '革の鎧（軽装）＋高値安値の帽子', eq: { armor: 'leather_armor', head: 'hilo_hat' } }, { key: 'staff', name: '魔道士の杖だけ', eq: { weapon: 'mage_staff' } },
    { key: 'nopart', name: '法衣＋こん棒＋羽根帽子＋盾（部品のない品）', eq: { armor: 'robe_skip', weapon: 'club', head: 'feather_hat', shield: 'wooden_shield' } }],
  gald: [{ key: 'plain', name: '装備なし', eq: {} }, { key: 'heavy', name: '重鎧＋斧', eq: { armor: 'iron_armor', weapon: 'battle_axe' } }, { key: 'sword', name: '重鎧＋剣と盾', eq: { armor: 'iron_armor', weapon: 'steel_sword', shield: 'iron_shield' } },
    { key: 'unarmed', name: '重鎧＋盾（武器をはずす）', eq: { armor: 'iron_armor', shield: 'iron_shield' } }, { key: 'knight', name: '騎士の鎧・剣・盾（色のある品）', eq: { armor: 'knight_armor', weapon: 'knight_sword', shield: 'knight_shield' } },
    { key: 'light', name: '革の鎧（軽装）＋手斧', eq: { armor: 'leather_armor', weapon: 'hand_axe' } }, { key: 'nopart', name: '重鎧＋槍＋兜（部品のない品）', eq: { armor: 'iron_armor', weapon: 'iron_spear', head: 'iron_helm' } }],
};
const WEAPON = { lina: ['weapon_staff_f', 'weapon_staff_t'], gald: ['weapon_axe', 'weapon_sword'] };   // 元の武器（杖・斧）と、v9.8.1 の剣
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  const errs = [], bad = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('response', (r) => { const u = r.url(); if (u.indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + u.replace(/^.*localhost:\d+/, '')); });
  await p.goto(URL0);
  if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  await p.evaluate((SETS) => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    ['lina', 'gald'].forEach((id) => State.joinCompanion(id));
    Object.values(SETS).forEach((l) => l.forEach((s) => Object.values(s.eq).forEach((id) => State.addItem(id, 1))));
    World.start(); if (window.MTQ3D) MTQ3D.paused = true;
  }, SETS);
  const rec = {};
  for (const id of ['lina', 'gald']) {
    rec[id] = { menu: {}, geo: null };
    // ---- 1 なかまの画面（装備を直接切り替え → 立ち絵）----
    for (const st of SETS[id]) {
      const e = await p.evaluate((a) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false;
        const A = State.actor(a.id); ['weapon', 'armor', 'shield', 'head', 'acc'].forEach((s) => { if (A.equip[s]) { State.addItem(A.equip[s], 1); A.equip[s] = null; } });
        const r = {}; Object.keys(a.eq).forEach((s) => { r[s] = Actors.canEquip(A, a.eq[s]) ? Services.equipItem(A, a.eq[s]) : '装備できない'; });
        return { equip: Object.assign({}, A.equip), res: r, stats: Actors.stats(A) }; }, { id, eq: st.eq });
      await p.evaluate(() => { Menu.party(); });
      await p.waitForSelector('#ui .party-screen .pt-art', { timeout: 60000 });
      await (await p.$(`#ui .party-screen .pt-row[data-id="${id}"]`)).click();
      await p.waitForFunction((a) => { const h = document.querySelector('#ui .pt-art .ea-host'); return h && h.getAttribute('data-ea-actor') === a && /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, id, { timeout: 30000 }).catch(() => null);
      await p.waitForTimeout(250);
      const m = await p.evaluate((a) => { const h = document.querySelector('#ui .pt-art .ea-host'); const cv = h && h.querySelector('canvas.ea-canvas'); const r = cv ? cv.getBoundingClientRect() : null; const v = EquipmentAppearance.pixelView(a, 'menu'); const f = v.frame;
        return { st: h && h.getAttribute('data-ea-state'), parts: cv && cv.getAttribute('data-ea-parts'), skipped: cv && cv.getAttribute('data-ea-skipped'), bottom: r && +r.bottom.toFixed(1), cx: r && +((r.left + r.right) / 2).toFixed(1), px: r ? +(r.height / (f.y1 - f.y0)).toFixed(4) : null, h: r && +r.height.toFixed(1) }; }, id);
      rec[id].menu[st.key] = Object.assign({ equip: e.equip, res: e.res, stats: e.stats }, m);
      const box = await p.$('#ui .party-screen .pt-artbox') || await p.$('#ui .party-screen .pt-art'); if (box) await box.screenshot({ path: `${OUT}shots/pixel_comp_menu_${KIND}_${id}_${st.key}.png` });
      const want = Object.keys(st.eq).every((s) => e.equip[s] === st.eq[s]);
      S(want && m.st === 'ok', `${id}［${st.name}］装備 ${JSON.stringify(Object.fromEntries(Object.entries(e.equip).filter(([, v]) => v)))} → 部品：${m.parts}${m.skipped ? '／描かない：' + m.skipped : ''}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    }
    const ms = SETS[id].map((s) => rec[id].menu[s.key]); const near = (a, b, t) => Math.abs(a - b) <= t;
    S(ms.every((m) => near(m.bottom, ms[0].bottom, 1) && near(m.cx, ms[0].cx, 1) && near(m.px, ms[0].px, 0.005)), `${id}：なかまの画面の足もと・左右の中心・1 ドットの大きさが ${ms.length} つとも同じ（${ms[0].bottom}/${ms[0].cx}/${ms[0].px}）`);
    const np = rec[id].menu.nopart; const nps = id === 'lina' ? ['club', 'feather_hat', 'wooden_shield'] : ['iron_spear', 'iron_helm'];
    S(np.st === 'ok' && nps.every((x) => (np.skipped || '').indexOf(x) >= 0) && /armor_/.test(np.parts) && !/weapon_/.test(np.parts), `${id}：部品のない品は部位ごと（${nps.join('・')} は描かない。鎧は着替える：${np.parts}）`);
    if (id === 'gald') { const m1 = rec[id].menu.heavy, m2 = rec[id].menu.sword, m3 = rec[id].menu.unarmed;
      S(/armor_shape_f/.test(m1.parts) && /weapon_axe/.test(m1.parts) && /armor_shape_f/.test(m2.parts) && /shield_t shield_f weapon_sword hand$/.test(m2.parts) && /armor_shape_f shield_t shield_f$/.test(m3.parts), `ガルド：斧から剣と盾に替えても重鎧はそのまま（${m2.parts}）。武器をはずすと手ぶら（${m3.parts}）`); }
    if (id === 'lina') { const c1 = rec[id].menu.cap, c2 = rec[id].menu.light;
      S(/head_cap_t/.test(c1.parts) && /head_cap_t/.test(c2.parts) && !c1.skipped && !c2.skipped, `リーナ：帽子（cap 型：革の帽子・高値安値の帽子）は頭巾を品の色に（${c1.parts}）`); }
    // ---- 2 合成の絵の数値（同じ関数をページで使う）----
    rec[id].geo = await p.evaluate(async (a) => {
      const EA = EquipmentAppearance; const out = {}; const sets = a.sets; const W0 = a.weapon;
      const load = (u) => new Promise((ok) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = (Assets.base || '') + u; });
      const data = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height);
      for (const vk of ['menu', 'back', 'front']) {
        const view = EA.pixelView(a.id, vk); const pad = 48; const W = view.w + 2 * pad, H = view.h + 2 * pad;
        const can = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
        const orig = await load(view.src); const oc = can(); oc.getContext('2d').drawImage(orig, pad, pad); const od = data(oc);
        const lay = async (k) => { const r = view.parts[k]; const im = await load(r.url); const c = can(); c.getContext('2d').drawImage(im, pad + r.x, pad + r.y); return data(c); };
        const wps = []; for (const k of W0) wps.push(await lay(k)); const plain = await lay('base_plain'); const hand = await lay('hand');
        const fixedArmor = []; for (const k of ['armor_robe_f', 'armor_shape_f', 'shield_f']) if (view.parts[k]) fixedArmor.push(await lay(k));   // 鎧・法衣の「そのまま」の部品（輪郭の色が、元の武器の輪郭と同じことがある）
        let ofeet = -1; for (let y = H - 1; y >= 0 && ofeet < 0; y--) for (let x = 0; x < W; x++) if (od.data[(y * W + x) * 4 + 3] > 16) { ofeet = y; break; }
        const res = {};
        for (const st of sets) {
          const actor = { id: a.id, job: a.id === 'lina' ? 'priest' : 'warrior', equip: st.eq };
          let r = EA.request(actor, vk); if (r.state === 'loading') { await r.promise; r = EA.request(actor, vk); }
          const d = data(r.canvas); const A = (D, i) => D.data[i * 4 + 3];
          let feet = -1; for (let y = H - 1; y >= 0 && feet < 0; y--) for (let x = pad + view.body.x0; x < pad + view.body.x1; x++) if (A(d, y * W + x) > 16) { feet = y; break; }
          // 元の武器のドットが残っていないか（武器を持たない組み合わせ）：元の武器の部品の場所に、その色のままのドットで、素の絵・手では説明できないもの
          let left = 0, ex = null; const holds = !!st.eq.weapon && /staff|axe|sword/.test(st.eq.weapon);
          if (!holds) for (let i = 0; i < W * H; i++) {
            if (A(d, i) <= 16) continue;
            const eq3 = (D) => D.data[i * 4 + 3] > 16 && Math.abs(D.data[i * 4] - d.data[i * 4]) < 3 && Math.abs(D.data[i * 4 + 1] - d.data[i * 4 + 1]) < 3 && Math.abs(D.data[i * 4 + 2] - d.data[i * 4 + 2]) < 3;
            if (wps.some((D) => D.data[i * 4 + 3] > 16 && eq3(D)) && !eq3(plain) && !eq3(hand) && !(st.eq.armor && fixedArmor.some((D) => eq3(D)))) { left++; if (!ex) ex = { x: i % W - pad, y: Math.floor(i / W) - pad, rgb: [d.data[i * 4], d.data[i * 4 + 1], d.data[i * 4 + 2]] }; }
          }
          // 武器の部品の範囲（元の武器があった所）に、何かが描かれているか：武器なしなら 0 に近い（手・体の後ろを埋めた所を除く）
          res[st.key] = { state: r.state, w: r.canvas.width, h: r.canvas.height, feet, left, ex, parts: r.parts, skipped: r.skipped };
        }
        out[vk] = { res, ofeet, W, H };
      }
      return out;
    }, { id, sets: SETS[id], weapon: WEAPON[id] });
    for (const vk of ['menu', 'back', 'front']) {
      const g = rec[id].geo[vk]; const rs = SETS[id].map((s) => g.res[s.key]);
      S(rs.every((r) => r.state === 'ok' && r.w === g.W && r.h === g.H), `${id} ${vk}：${rs.length} つの組み合わせとも、合成の絵の大きさは同じ（${g.W}×${g.H}＝元の絵＋まわり 48）`);
      S(rs.every((r) => r.feet === g.ofeet), `${id} ${vk}：足もとの行が元の絵と同じ（${g.ofeet}）：${SETS[id].map((s) => s.key + ' ' + g.res[s.key].feet).join('・')}`);
      S(rs.every((r) => r.left === 0), `${id} ${vk}：武器を持たない組み合わせに、元の武器のドットが残っていない（${SETS[id].map((s) => s.key + ' ' + g.res[s.key].left + (g.res[s.key].ex ? JSON.stringify(g.res[s.key].ex) : '')).join('・')}。鎧・法衣の部品の輪郭と同じ色のドットは鎧のもの）`);
    }
    // 勝利の正面＝メニュー正面と同じ部品（座標だけずらす）：合成の絵を比べる（メニューの絵を (dx, dy) ずらすと戦闘の正面の絵になる）
    const same = await p.evaluate(async (a) => {
      const EA = EquipmentAppearance; const mv = EA.pixelView(a.id, 'menu'), fv = EA.pixelView(a.id, 'front'); const k0 = Object.keys(mv.parts)[0]; const dx = fv.parts[k0].x - mv.parts[k0].x, dy = fv.parts[k0].y - mv.parts[k0].y;
      const actor = { id: a.id, job: a.id === 'lina' ? 'priest' : 'warrior', equip: a.eq };
      const get = async (vk) => { let r = EA.request(actor, vk); if (r.state === 'loading') { await r.promise; r = EA.request(actor, vk); } return r.canvas; };
      const m = await get('menu'), f = await get('front'); const pad = 48;
      const md = m.getContext('2d').getImageData(0, 0, m.width, m.height).data, fd = f.getContext('2d').getImageData(0, 0, f.width, f.height).data; let diff = 0, n = 0;
      for (let y = 0; y < mv.h; y++) for (let x = 0; x < mv.w; x++) { const i = ((y + pad) * m.width + x + pad) * 4, j = ((y + dy + pad) * f.width + x + dx + pad) * 4; n++; if (Math.abs(md[i + 3] - fd[j + 3]) > 8 || (md[i + 3] > 16 && (Math.abs(md[i] - fd[j]) > 2 || Math.abs(md[i + 1] - fd[j + 1]) > 2 || Math.abs(md[i + 2] - fd[j + 2]) > 2))) diff++; }
      return { dx, dy, diff, n };
    }, { id, eq: SETS[id][1].eq });
    S(same.diff === 0, `${id}：勝利の正面の合成＝メニュー正面の合成を (${same.dx}, ${same.dy}) ずらしたもの（${SETS[id][1].name}：違うドット ${same.diff} / ${same.n}）`);
  }
  // ---- 3 部品のない向き・データ ----
  const un = await p.evaluate(() => { const EA = EquipmentAppearance; const L = State.actor('lina'), G = State.actor('gald'); return { lLeft: EA.supports(L, 'left'), gRight: EA.supports(G, 'right'), lMenu: EA.menuView(L), gMenu: EA.menuView(G), save: !/equip-pixels|ea-|data:image/.test(JSON.stringify(State.data)) }; });
  S(!un.lLeft && !un.gRight && un.lMenu === 'menu' && un.gMenu === 'menu' && un.save, '横向き（左右）は従来の絵。メニューは本人の立ち絵（menu）。セーブに外見を書かない');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  S(bad.length === 0, '読み込みの失敗（404 など）なし' + (bad.length ? '：' + bad.slice(0, 5).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/pixel_comp_${KIND}.json`, JSON.stringify({ KIND, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 pixel comp ${KIND}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
