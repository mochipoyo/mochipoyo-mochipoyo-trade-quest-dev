// v9.8 装備の外見（ドット絵の差分）：仲間（リーナ・ガルド）の開発用の切り替えでの確かめ（ヘッドレス Chromium。実機ではない。GPU なし）
//   装備を Services.equipItem で直接切り替え、ゲームの中の合成（EquipmentAppearance.request）と、なかまの画面の立ち絵を調べる
//   確かめること：
//     ・合成の絵の大きさ・足もとの行が、元の絵と同じ（組み合わせで変わらない）／勝利の正面＝メニュー正面と同じ部品を戦闘の正面の位置へ
//     ・武器を外した組み合わせに、元の武器（杖・斧）のドットが残らない（手は空）
//     ・部品のない品は部位ごと（ガルドの槍・兜、リーナのこん棒・羽根帽子・盾）：描かない。ほかの部位（鎧）は着替える
//     ・v9.8.1 ガルドの剣・盾、リーナの帽子（cap 型）。斧から剣と盾に替えても重鎧はそのまま、武器をはずすと手ぶら
//     ・なかまの画面：決まった枠（足もと・左右の中心・1 ドットの大きさが組み合わせで同じ）
//     ・能力値・所持数・セーブの形は今までどおり／ページのエラーなし
//     ・v9.8.2 WHO=kyle,kazuto：カイル・カズト（剣・盾を持った騎士の絵）。剣→槍・斧に替えても重鎧・盾はそのまま、武器をはずすと手ぶら、兜は部品なし
//   KIND=3d|2d  WHO=lina,gald（既定）|kyle,kazuto  PORT=…  OUT=…（記録 logs/pixel_comp_<KIND>.json／カイル・カズトは logs/pixel_knight_<KIND>.json・画面写真 shots/pixel_comp_*.png）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const KIND = process.env.KIND || '3d'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const URL0 = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const WHO = (process.env.WHO || 'lina,gald').split(','); const TAG = WHO.join() === 'lina,gald' ? 'comp' : WHO[0] === 'mina' ? 'mina' : 'knight';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const SETS = {
  lina: [{ key: 'plain', name: '装備なし', eq: {} }, { key: 'robe', name: '法衣＋杖', eq: { armor: 'robe_skip', weapon: 'oak_staff' } }, { key: 'cap', name: '法衣＋杖＋革の帽子', eq: { armor: 'robe_skip', weapon: 'oak_staff', head: 'leather_cap' } },
    { key: 'light', name: '革の鎧（軽装）＋高値安値の帽子', eq: { armor: 'leather_armor', head: 'hilo_hat' } }, { key: 'staff', name: '魔道士の杖だけ', eq: { weapon: 'mage_staff' } },
    { key: 'nopart', name: '法衣＋こん棒＋羽根帽子＋盾（部品のない品）', eq: { armor: 'robe_skip', weapon: 'club', head: 'feather_hat', shield: 'wooden_shield' } }],
  gald: [{ key: 'plain', name: '装備なし', eq: {} }, { key: 'heavy', name: '重鎧＋斧', eq: { armor: 'iron_armor', weapon: 'battle_axe' } }, { key: 'sword', name: '重鎧＋剣と盾', eq: { armor: 'iron_armor', weapon: 'steel_sword', shield: 'iron_shield' } },
    { key: 'unarmed', name: '重鎧＋盾（武器をはずす）', eq: { armor: 'iron_armor', shield: 'iron_shield' } }, { key: 'knight', name: '騎士の鎧・剣・盾（色のある品）', eq: { armor: 'knight_armor', weapon: 'knight_sword', shield: 'knight_shield' } },
    { key: 'light', name: '革の鎧（軽装）＋手斧', eq: { armor: 'leather_armor', weapon: 'hand_axe' } }, { key: 'nopart', name: '重鎧＋槍＋兜（部品のない品）', eq: { armor: 'iron_armor', weapon: 'iron_spear', head: 'iron_helm' } }],
  // v9.8.2 カイル（騎士：剣・槍）・カズト（戦士：剣・斧・槍）。2 番目（sword）が元の絵の装い
  kyle: [{ key: 'plain', name: '装備なし', eq: {} }, { key: 'sword', name: '重鎧＋剣と盾', eq: { armor: 'iron_armor', weapon: 'steel_sword', shield: 'iron_shield' } }, { key: 'spear', name: '重鎧＋槍と盾（剣から持ち替え）', eq: { armor: 'iron_armor', weapon: 'iron_spear', shield: 'iron_shield' } },
    { key: 'unarmed', name: '重鎧＋盾（武器をはずす）', eq: { armor: 'iron_armor', shield: 'iron_shield' } }, { key: 'knight', name: '騎士の鎧・剣・盾（色のある品）', eq: { armor: 'knight_armor', weapon: 'knight_sword', shield: 'knight_shield' } },
    { key: 'light', name: '革の鎧（軽装）＋木の剣＋木の盾', eq: { armor: 'leather_armor', weapon: 'wooden_sword', shield: 'wooden_shield' } }, { key: 'nopart', name: '重鎧＋鉄の兜（v9.8.3 から描く）', eq: { armor: 'iron_armor', head: 'iron_helm' } }],
  kazuto: [{ key: 'plain', name: '装備なし', eq: {} }, { key: 'sword', name: '重鎧＋剣と盾', eq: { armor: 'iron_armor', weapon: 'steel_sword', shield: 'iron_shield' } }, { key: 'axe', name: '重鎧＋戦斧（剣と盾から持ち替え）', eq: { armor: 'iron_armor', weapon: 'battle_axe' } },
    { key: 'spear', name: '重鎧＋槍と盾', eq: { armor: 'iron_armor', weapon: 'iron_spear', shield: 'iron_shield' } }, { key: 'unarmed', name: '重鎧＋盾（武器をはずす）', eq: { armor: 'iron_armor', shield: 'iron_shield' } },
    { key: 'knight', name: '騎士の鎧・剣・盾（色のある品）', eq: { armor: 'knight_armor', weapon: 'knight_sword', shield: 'knight_shield' } }, { key: 'light', name: '革の鎧（軽装）＋手斧', eq: { armor: 'leather_armor', weapon: 'hand_axe' } },
    { key: 'nopart', name: '重鎧＋鉄の兜（v9.8.3 から描く）', eq: { armor: 'iron_armor', head: 'iron_helm' } }],
  // v9.8.4 ミナ（盗賊：短剣・剣・弓）
  mina: [{ key: 'plain', name: '装備なし', eq: {} }, { key: 'bow', name: '短弓', eq: { weapon: 'short_bow' } }, { key: 'dagger', name: '短剣（元の絵の 2 本）', eq: { weapon: 'dagger' } },
    { key: 'longbow', name: '長弓（色のある品も同じ形）', eq: { weapon: 'long_bow' } }, { key: 'nopart', name: '銅の剣＋革の鎧＋革の帽子（部品のない品）', eq: { weapon: 'copper_sword', armor: 'leather_armor', head: 'leather_cap' } }],
};
const WEAPON = { lina: ['weapon_staff_f', 'weapon_staff_t'], gald: ['weapon_axe', 'weapon_sword'], kyle: ['weapon_sword'], kazuto: ['weapon_sword'], mina: ['weapon_dagger'] };   // 元の武器（杖・斧・剣）と、v9.8.1 の剣
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  const errs = [], bad = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('response', (r) => { const u = r.url(); if (u.indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + u.replace(/^.*localhost:\d+/, '')); });
  await p.goto(URL0);
  if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  await p.evaluate(([SETS, WHO]) => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    WHO.forEach((id) => State.joinCompanion(id));
    WHO.forEach((w) => SETS[w].forEach((s) => Object.values(s.eq).forEach((id) => State.addItem(id, 1))));
    World.start(); if (window.MTQ3D) MTQ3D.paused = true;
  }, [SETS, WHO]);
  const rec = {};
  for (const id of WHO) {
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
    const np = rec[id].menu.nopart; const nps = id === 'lina' ? ['club', 'feather_hat', 'wooden_shield'] : id === 'gald' ? ['iron_spear', 'iron_helm'] : id === 'mina' ? ['copper_sword', 'leather_armor', 'leather_cap'] : [];
    S(np.st === 'ok' && nps.every((x) => (np.skipped || '').indexOf(x) >= 0) && (id === 'mina' ? np.parts === 'base_plain' : /armor_/.test(np.parts)) && !/weapon_/.test(np.parts), `${id}：部品のない品は部位ごと（${nps.join('・')} は描かない。鎧は着替える：${np.parts}）`);
    if (id === 'gald') { const m1 = rec[id].menu.heavy, m2 = rec[id].menu.sword, m3 = rec[id].menu.unarmed;
      S(/armor_shape_f/.test(m1.parts) && /weapon_axe/.test(m1.parts) && /armor_shape_f/.test(m2.parts) && /shield_t shield_f weapon_sword hand$/.test(m2.parts) && /armor_shape_f shield_t shield_f$/.test(m3.parts), `ガルド：斧から剣と盾に替えても重鎧はそのまま（${m2.parts}）。武器をはずすと手ぶら（${m3.parts}）`); }
    if (id === 'kyle' || id === 'kazuto') { const M0 = rec[id].menu; const sh = 'shield_f shield_e';
      S(M0.nopart.parts === 'base_helm armor_shape_f head_helm_t head_helm_f' && !M0.nopart.skipped, `${id}：v9.8.3 鉄の兜を描く（兜用の素の絵＋兜：${M0.nopart.parts}）`);
      S(M0.plain.parts === 'base_plain' && M0.sword.parts === 'base_plain armor_shape_f ' + sh + ' weapon_sword', `${id}：装備なし＝素の絵（鎧下・手ぶら）。重鎧＋剣と盾＝元の絵の装い（${M0.sword.parts}）`);
      const alt = id === 'kyle' ? M0.spear : M0.axe; const altW = id === 'kyle' ? 'weapon_spear' : 'weapon_axe'; const altSh = id === 'kyle' ? ' ' + sh : '';
      S(alt.parts === 'base_plain armor_shape_f' + altSh + ' ' + altW + ' hand' && M0.unarmed.parts === 'base_plain armor_shape_f ' + sh, `${id}：剣から${id === 'kyle' ? '槍' : '斧'}に持ち替えても重鎧${id === 'kyle' ? '・盾' : ''}はそのまま（${alt.parts}）。武器をはずすと手ぶら（${M0.unarmed.parts}）`);
      S(/armor_heavy_t/.test(M0.knight.parts) && /shield_t/.test(M0.knight.parts) && /armor_light_t/.test(M0.light.parts) && (id === 'kazuto' || /shield_t/.test(M0.light.parts)), `${id}：色のある品は品の色（騎士の鎧・盾 ${M0.knight.parts}／${id === 'kazuto' ? '革の鎧' : '革の鎧・木の盾'} ${M0.light.parts}）`); }
    if (id === 'mina') { const M0 = rec[id].menu; S(M0.plain.parts === 'base_plain' && M0.bow.parts === 'base_plain weapon_bow hand' && M0.longbow.parts === M0.bow.parts && M0.dagger.parts === 'base_plain weapon_dagger', `ミナ：装備なし＝手ぶら／弓＝${M0.bow.parts}／短剣＝${M0.dagger.parts}`); }
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
        const bowL = view.parts.weapon_bow ? await lay('weapon_bow') : null;   // v9.8.4 弓を持つ組み合わせ：弓の部品のドット（輪郭の色が、元の短剣の輪郭と同じことがある）は弓のもの
        let ofeet = -1; for (let y = H - 1; y >= 0 && ofeet < 0; y--) for (let x = 0; x < W; x++) if (od.data[(y * W + x) * 4 + 3] > 16) { ofeet = y; break; }
        const res = {};
        for (const st of sets) {
          const actor = { id: a.id, job: COMPANIONS[a.id].job, equip: st.eq };
          let r = EA.request(actor, vk); if (r.state === 'loading') { await r.promise; r = EA.request(actor, vk); }
          const d = data(r.canvas); const A = (D, i) => D.data[i * 4 + 3];
          let feet = -1; for (let y = H - 1; y >= 0 && feet < 0; y--) for (let x = pad + view.body.x0; x < pad + view.body.x1; x++) if (A(d, y * W + x) > 16) { feet = y; break; }
          // 元の武器のドットが残っていないか（武器を持たない組み合わせ）：元の武器の部品の場所に、その色のままのドットで、素の絵・手では説明できないもの
          let left = 0, ex = null; const holds = !!st.eq.weapon && /staff|axe|sword|dagger/.test(st.eq.weapon);
          if (!holds) for (let i = 0; i < W * H; i++) {
            if (A(d, i) <= 16) continue;
            const eq3 = (D) => D.data[i * 4 + 3] > 16 && Math.abs(D.data[i * 4] - d.data[i * 4]) < 3 && Math.abs(D.data[i * 4 + 1] - d.data[i * 4 + 1]) < 3 && Math.abs(D.data[i * 4 + 2] - d.data[i * 4 + 2]) < 3;
            if (wps.some((D) => D.data[i * 4 + 3] > 16 && eq3(D)) && !eq3(plain) && !eq3(hand) && !(st.eq.armor && fixedArmor.some((D) => eq3(D))) && !(bowL && /bow/.test(st.eq.weapon || '') && eq3(bowL))) { left++; if (!ex) ex = { x: i % W - pad, y: Math.floor(i / W) - pad, rgb: [d.data[i * 4], d.data[i * 4 + 1], d.data[i * 4 + 2]] }; }
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
      const actor = { id: a.id, job: COMPANIONS[a.id].job, equip: a.eq };
      const get = async (vk) => { let r = EA.request(actor, vk); if (r.state === 'loading') { await r.promise; r = EA.request(actor, vk); } return r.canvas; };
      const m = await get('menu'), f = await get('front'); const pad = 48;
      const md = m.getContext('2d').getImageData(0, 0, m.width, m.height).data, fd = f.getContext('2d').getImageData(0, 0, f.width, f.height).data; let diff = 0, n = 0;
      for (let y = 0; y < mv.h; y++) for (let x = 0; x < mv.w; x++) { const i = ((y + pad) * m.width + x + pad) * 4, j = ((y + dy + pad) * f.width + x + dx + pad) * 4; n++; if (Math.abs(md[i + 3] - fd[j + 3]) > 8 || (md[i + 3] > 16 && (Math.abs(md[i] - fd[j]) > 2 || Math.abs(md[i + 1] - fd[j + 1]) > 2 || Math.abs(md[i + 2] - fd[j + 2]) > 2))) diff++; }
      return { dx, dy, diff, n };
    }, { id, eq: SETS[id][1].eq });
    S(same.diff === 0, `${id}：勝利の正面の合成＝メニュー正面の合成を (${same.dx}, ${same.dy}) ずらしたもの（${SETS[id][1].name}：違うドット ${same.diff} / ${same.n}）`);
  }
  // ---- 3 部品のない向き・データ ----
  const un = await p.evaluate((W) => { const EA = EquipmentAppearance; const L = State.actor(W[0]), G = State.actor(W[W.length - 1]); return { lLeft: EA.supports(L, 'left'), gRight: EA.supports(G, 'right'), lMenu: EA.menuView(L), gMenu: EA.menuView(G), save: !/equip-pixels|ea-|data:image/.test(JSON.stringify(State.data)) }; }, WHO);
  S(!un.lLeft && !un.gRight && un.lMenu === 'menu' && un.gMenu === 'menu' && un.save, '横向き（左右）は従来の絵。メニューは本人の立ち絵（menu）。セーブに外見を書かない');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  S(bad.length === 0, '読み込みの失敗（404 など）なし' + (bad.length ? '：' + bad.slice(0, 5).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/pixel_${TAG}_${KIND}.json`, JSON.stringify({ KIND, WHO, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 pixel ${TAG} ${KIND}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
