// v9.7 装備の外見（ドット絵の差分）：ふつうの遊び方の手順で確かめる（ヘッドレス Chromium。実機ではない。GPU なし）
//   1 フィールドでメニュー（Esc）→［そうび］→ 主人公 → 枠 → 品／はずす（画面をクリックして選ぶ。装備の処理は今までのまま）
//   2 メニュー →［パーティ］→［なかま］で立ち絵（メニュー正面）を写す → メニューを閉じる
//   3 そのまま World.startBattle（ふつうの戦闘の入り口）で戦闘 → 主人公の背面を写す → 勝つ → 勝利の振り向き（正面）を写す → フィールドへ
//   4 戦闘のあと、もう一度［なかま］で立ち絵を写し、戦闘の前と同じ装備・同じ部品か確かめる
//   ローブ・帽子・杖は戦士には装備できないので、転職（Services.jobChange の画面）で魔法使いにしてから装備し、槍の前に戦士へ戻す
//   組み合わせ：装備なし／軽装＋剣／重鎧＋兜＋剣と盾／重鎧＋手斧（部品のない武器）／ローブ＋帽子＋杖／槍装備／（最後に）全部はずす
//   キャンセル：重鎧＋手斧のあと、［そうび］→ 武器 → 品の一覧で Esc（キャンセル）→ 装備も絵も変わらないこと
//   VIEW=pc（1280×720）｜phone（スマホ縦：iPhone 13 相当 390×664）  PORT=…  OUT=…
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const URL0 = `http://localhost:${PORT}/3d/index.html?nosw`;
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const STATES = [
  { key: 'plain', name: '装備なし', job: 'warrior', eq: { weapon: null, armor: null, shield: null, head: null } },
  { key: 'light', name: '軽装＋剣', job: 'warrior', eq: { armor: 'leather_armor', weapon: 'steel_sword' } },
  { key: 'heavy', name: '重鎧＋兜＋剣と盾', job: 'warrior', eq: { armor: 'iron_armor', head: 'iron_helm', shield: 'iron_shield', weapon: 'steel_sword' } },
  { key: 'heavyaxe', name: '重鎧＋手斧（部品のない武器）', job: 'warrior', eq: { weapon: 'hand_axe' }, cancel: true },
  { key: 'robe', name: 'ローブ＋帽子＋杖', job: 'mage', eq: { armor: 'robe', head: 'wizard_hat', weapon: 'oak_staff' } },
  { key: 'spear', name: '槍装備', job: 'warrior', eq: { weapon: 'iron_spear', armor: null, head: null, shield: null } },
  { key: 'off', name: '全部はずす（解除）', job: 'warrior', eq: { weapon: null, armor: null, shield: null, head: null } },
];
const SLOT_LABEL = { weapon: '武器', armor: '鎧', shield: '盾', head: '頭' };
let PG = null;   // 失敗したときに画面を残すため
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext(VIEW === 'phone' ? Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 2 }) : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); PG = p; const errs = []; const bad = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('response', (r) => { const u = r.url(); if (u.indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + u.replace(/^.*localhost:\d+/, '')); });
  await p.goto(URL0); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  await p.evaluate(() => {
    const T = Win.toast; Win.toast = function (m) { (window.__toasts = window.__toasts || []).push(String(m)); return T.apply(this, arguments); };
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true; d.gold = 20000;
    ['lina', 'gald'].forEach((id) => State.joinCompanion(id));
    ['leather_armor', 'iron_armor', 'robe', 'iron_helm', 'wizard_hat', 'steel_sword', 'iron_shield', 'oak_staff', 'iron_spear', 'hand_axe'].forEach((id) => State.addItem(id, 1));
    World.start();
  });
  await p.waitForTimeout(1500);
  // GPU のないヘッドレスでは、フィールドの 3D の描画が重く、画面写真・クリックが待たされる → メニューの操作中はフィールドの描画だけ止める（戦闘では動かす）
  const pause3d = (on) => p.evaluate((v) => { if (window.MTQ3D) MTQ3D.paused = v; }, on);
  await pause3d(true);
  const isPhone = await p.evaluate(() => document.body.classList.contains('mobile'));
  // ---- 画面の操作（いちばん上の一覧・選択肢をクリック） ----
  const top = async () => { const h = await p.evaluateHandle(() => { const l = [...document.querySelectorAll('#ui .rw-list, #ui .rw-choice')]; return l[l.length - 1] || null; }); return h.asElement(); };
  const waitTop = async (re, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const t = await top(); if (t) { const tx = await t.evaluate((n) => (n.querySelector('.rw-title, .rw-prompt') || n).textContent); if (!re || re.test(tx)) return t; } await p.waitForTimeout(100); } throw new Error('一覧が出ない ' + re); };
  const pick = async (listRe, rowRe) => {
    const t = await waitTop(listRe);
    const row = await t.evaluateHandle((n, src) => { const re = new RegExp(src); return [...n.querySelectorAll('.rw-item, .rw-opt')].find((r) => !r.classList.contains('disabled') && re.test(r.textContent.trim())) || null; }, rowRe.source);
    const el = row.asElement(); if (!el) throw new Error('行がない ' + rowRe + ' in ' + listRe);
    await el.scrollIntoViewIfNeeded(); await el.click(); await p.waitForTimeout(150);
    if (await t.evaluate((n) => n.isConnected)) { const ok = await t.$('.rw-ok'); if (ok) await ok.click(); else await el.click(); }
    await p.waitForTimeout(250);
  };
  const pressUntil = async (fn, key = 'Escape', n = 8) => { for (let i = 0; i < n; i++) { if (await p.evaluate(fn)) return true; await p.keyboard.press(key); await p.waitForTimeout(250); } return p.evaluate(fn); };
  const closeAll = () => pressUntil(() => !document.querySelector('#ui .rw-list, #ui .rw-choice, #ui .rw-msg') && !World.busy);
  const openMenu = async () => { await closeAll(); await p.keyboard.press('Escape'); await waitTop(/メニュー/); };
  const tab = async (label) => { const t = await waitTop(/メニュー/); const tb = await t.evaluateHandle((n, lb) => [...n.querySelectorAll('.rw-tab')].find((x) => x.textContent.indexOf(lb) === 0) || null, label); if (tb.asElement()) await tb.asElement().click(); await p.waitForTimeout(250); };
  const jobChange = async (job) => {
    const cur = await p.evaluate(() => State.data.hero.job); if (cur === job) return false;
    await closeAll(); const jn = await p.evaluate((j) => JOBS[j].name, job);
    p.evaluate(() => { World.busy = true; Services.jobChange().then(() => { World.busy = false; }); });
    await pick(/誰が転職する/, /^もち/); await pick(/転職先/, new RegExp('^' + jn)); await pick(/に転職する/, /^転職する/);
    await pressUntil(() => !World.busy, 'Enter', 12); return true;
  };
  const equipVia = async (eq) => {
    await openMenu(); const t = await top(); const eqb = await t.$('.rw-tool[data-tool="equip"]'); await eqb.scrollIntoViewIfNeeded(); await eqb.click({ timeout: 8000 }); await p.waitForTimeout(250);
    await pick(/装備を変える/, /^もち/);
    const done = [];
    for (const slot of ['weapon', 'armor', 'shield', 'head']) {
      if (!(slot in eq)) continue; const want = eq[slot]; const cur = await p.evaluate((s) => State.data.hero.equip[s], slot);
      if (cur === want) continue;
      await pick(/もちの装備/, new RegExp('^' + SLOT_LABEL[slot]));
      const name = want ? await p.evaluate((id) => ITEMS[id].name, want) : 'はずす';
      await pick(/もちの.+を選ぶ/, new RegExp('^(◎ )?' + name.replace(/[()（）]/g, '.')));
      done.push(slot + ':' + (want || 'はずす'));
    }
    const lines = await p.evaluate(() => { const n = document.querySelector('#ui .equip-menu .eq-body-head canvas'); return n ? n.getAttribute('data-ea-parts') : null; });
    await closeAll(); return { done, eqHead: lines };
  };
  // キャンセル：［そうび］→ 武器 → 品の一覧で Esc → 装備も、そうびの画面の絵も変わらない
  const cancelVia = async () => {
    const before = await p.evaluate(() => JSON.stringify(State.data.hero.equip));
    await openMenu(); const t = await top(); const eqb = await t.$('.rw-tool[data-tool="equip"]'); await eqb.click({ timeout: 8000 }); await p.waitForTimeout(250);
    await pick(/装備を変える/, /^もち/);
    await waitTop(/もちの装備/); await p.waitForTimeout(300);
    const head0 = await p.evaluate(() => { const n = document.querySelector('#ui .equip-menu .eq-body-head canvas'); return n ? n.getAttribute('data-ea-parts') : null; });
    await pick(/もちの装備/, /^武器/); await waitTop(/もちの.+を選ぶ/);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    const back = await waitTop(/もちの装備/).then(() => true).catch(() => false); await p.waitForTimeout(300);
    const head1 = await p.evaluate(() => { const n = document.querySelector('#ui .equip-menu .eq-body-head canvas'); return n ? n.getAttribute('data-ea-parts') : null; });
    const after = await p.evaluate(() => JSON.stringify(State.data.hero.equip));
    await closeAll(); return { same: before === after, back, head0, head1, before };
  };
  const shotParty = async (key, tag) => {
    await openMenu(); await tab('パーティ'); await pick(/メニュー/, /^なかま/);
    await p.waitForSelector('#ui .party-screen .pt-art', { timeout: 30000 });
    await p.waitForFunction(() => { const h = document.querySelector('#ui .pt-art .ea-host'); return h && /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, null, { timeout: 30000 }).catch(() => null);
    await p.waitForTimeout(300);
    const m = await p.evaluate(() => {
      const h = document.querySelector('#ui .pt-art .ea-host'); const cv = h && h.querySelector('canvas.ea-canvas'); const box = document.querySelector('#ui .party-screen .pt-artbox') || document.querySelector('#ui .pt-art');
      const r = cv ? cv.getBoundingClientRect() : null; const b = box.getBoundingClientRect(); const view = EquipmentAppearance.pixelView('hero', EquipmentAppearance.menuView(State.data.hero)); const f = view && view.frame;
      // 見切れ：絵の矩形が、絵の枠（.pt-artbox）と画面の中に入っているか。枠の外へはみ出す部分は、枠より上に何も描かれない（帽子・槍の先は枠の中）
      let clip = null; if (r) { clip = { top: r.top < b.top - 0.5, bottom: r.bottom > b.bottom + 0.5, left: r.left < b.left - 0.5, right: r.right > b.right + 0.5, screen: r.top < 0 || r.left < 0 || r.right > innerWidth || r.bottom > innerHeight }; }
      let ov = null; for (let n = cv && cv.parentElement; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (/(hidden|clip|auto|scroll)/.test(cs.overflowY + cs.overflowX)) { const q = n.getBoundingClientRect(); if (r && (r.top < q.top - 0.5 || r.bottom > q.bottom + 0.5 || r.left < q.left - 0.5 || r.right > q.right + 0.5)) { ov = (n.className || n.tagName) + ''; break; } } }
      return { st: h && h.getAttribute('data-ea-state'), parts: cv && cv.getAttribute('data-ea-parts'), view: EquipmentAppearance.menuView(State.data.hero), job: State.data.hero.job, sprite: State.data.hero.sprite,
        rect: r && { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), h: +r.height.toFixed(1), cx: +((r.left + r.right) / 2).toFixed(1) }, px: r && f ? +(r.height / (f.y1 - f.y0)).toFixed(4) : null, clip, ov, box: { top: b.top, bottom: b.bottom, h: b.height }, equip: Object.assign({}, State.data.hero.equip), stats: Actors.stats(State.data.hero) };
    });
    const el = await p.$('#ui .party-screen .pt-artbox') || await p.$('#ui .party-screen .pt-art'); if (el) await el.screenshot({ path: `${OUT}shots/ui_${VIEW}_menu${tag || ''}_${key}.png` });
    if (!tag && (key === 'robe' || key === 'heavyaxe')) await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_menu_full_${key}.jpg`, type: 'jpeg', quality: 80 });
    m.skipped = await p.evaluate(() => { const cv = document.querySelector('#ui .pt-art .ea-host canvas.ea-canvas'); return cv ? cv.getAttribute('data-ea-skipped') : null; });
    await closeAll(); return m;
  };
  const battle = async (key) => {
    await closeAll(); await pause3d(false);
    await p.evaluate(() => { window.__btRes = null; const en = Object.keys(ENEMIES).filter((k) => ENEMIES[k].hp < 40 && !ENEMIES[k].boss && !ENEMIES[k].flee)[0]; State.data.settings.autoBattle = false; World.startBattle([en], {}).then((r) => { window.__btRes = r || 'end'; }); });
    await p.waitForSelector('#ui .cmd-list', { timeout: 120000 });
    await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); const h = i && i.party && i.party.find((x) => x.id === 'hero'); return h && /dir:/.test(h.model || '') && !h.eaWait; }, null, { timeout: 60000 }).catch(() => null);
    await p.waitForTimeout(1500);
    const b = await p.evaluate(() => { const i = BattleStage3D.actorsInfo(); const h = i.party.find((x) => x.id === 'hero'); return { hero: h, others: i.party.filter((x) => x.id !== 'hero').map((x) => ({ id: x.id, ea: !!x.ea })), equip: Object.assign({}, State.data.hero.equip), fell: (window.__toasts || []).filter((t) => /3Dの戦闘を表示できない/.test(t)) }; });
    await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_battle_${key}.jpg`, type: 'jpeg', quality: 72 });
    // 勝つ → 勝利の振り向き（正面）を写す → 勝利・経験値・戦利品の画面を Enter で進めて、フィールドへ戻る
    await p.evaluate(() => { const bt = BattleUI.battle; bt.enemies.forEach((e) => { e.hp = 1; }); State.data.settings.autoBattle = true; });
    await p.keyboard.press('Enter');
    b.victory = null;
    for (let i = 0; i < 200; i++) {
      await p.waitForTimeout(250);
      if (!b.victory) { const v = await p.evaluate(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); const h = i && i.party && i.party.find((x) => x.id === 'hero'); return h && /dir:front/.test(h.model || '') ? h : null; });
        if (v) { await p.waitForTimeout(500); b.victory = await p.evaluate(() => BattleStage3D.actorsInfo().party.find((x) => x.id === 'hero'));
          await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_victory_ui_${key}.jpg`, type: 'jpeg', quality: 72 });   // そのままの画面（勝利の結果の窓が人物に重なる）
          await p.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; }); await p.waitForTimeout(120);   // 人物を見るため、結果の窓だけ一瞬隠して撮る（ゲームの動きは変えない）
          await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_victory_${key}.jpg`, type: 'jpeg', quality: 72 });
          await p.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = ''; }); } }
      const fin = await p.evaluate(() => !!window.__btRes && !World.busy); if (fin) break;
      if (b.victory || i % 2) await p.keyboard.press('Enter');
    }
    await p.evaluate(() => { State.data.settings.autoBattle = false; });
    b.ended = await p.evaluate(() => !!window.__btRes && !World.busy);
    await pause3d(true);
    return b;
  };
  // ---------------- 組み合わせごとに ----------------
  const rec = {};
  for (const st of STATES) {
    const j = await jobChange(st.job);
    const e = await equipVia(st.eq);
    const m = await shotParty(st.key);
    const cx = st.cancel ? await cancelVia() : null;
    const bt = await battle(st.key);
    const m2 = await shotParty(st.key, '_after');
    rec[st.key] = { name: st.name, jobChanged: j, ui: e, menu: m, cancel: cx, battle: bt, after: m2 };
    const want = Object.keys(st.eq).every((s) => (m.equip[s] || null) === st.eq[s]);
    S(want && m.st === 'ok' && m.view === 'job:warrior', `［${st.name}］装備メニューで ${e.done.join('・') || '変更なし'}${j ? '（先に転職：' + st.job + '）' : ''} → 立ち絵 ${m.parts}`);
    S(bt.hero && /dir:back/.test(bt.hero.model || '') && !!bt.hero.ea && !bt.fell.length && bt.ended, `［${st.name}］そのまま戦闘：主人公の背面に合成（${bt.hero && bt.hero.model}）。仲間（${bt.others.map((o) => o.id + ':' + (o.ea ? '合成' : '従来')).join(' ')}）。戦闘のあとフィールドへ戻った：${bt.ended}`);
    S(bt.victory && /dir:front/.test(bt.victory.model || '') && !!bt.victory.ea && /"front"/.test(bt.victory.ea || ''), `［${st.name}］勝利の振り向き：正面の絵にも同じ装備を合成（${bt.victory && bt.victory.model}・範囲 ${bt.victory && JSON.stringify(bt.victory.size)}・合成の印 ${bt.victory && String(bt.victory.ea).slice(0, 90)}）`);
    S(m2.st === 'ok' && m2.parts === m.parts && JSON.stringify(m2.equip) === JSON.stringify(m.equip) && m2.rect && m.rect && Math.abs(m2.rect.bottom - m.rect.bottom) < 1, `［${st.name}］戦闘のあとのメニュー：戦闘の前と同じ装備・同じ部品（${m2.parts}）`);
    if (cx) S(cx.same && cx.back && cx.head0 === cx.head1, `［${st.name}］キャンセル：［そうび］→ 武器 → 品の一覧で Esc → 装備も絵も変わらない（${cx.before}・そうびの画面の絵 ${cx.head1}）`);
    if (st.key === 'heavyaxe') S(/armor_shape_f/.test(m.parts) && !/weapon_/.test(m.parts) && /hand_axe/.test(m.skipped || ''), `［${st.name}］重鎧は表示を続け、部品のない手斧は描かない（部品 ${m.parts}／描かない ${m.skipped}）`);
  }
  const ms = STATES.map((s) => rec[s.key].menu);
  const near = (a, b, t) => Math.abs(a - b) <= t;
  S(ms.every((m) => m.rect && near(m.rect.bottom, ms[0].rect.bottom, 1) && near(m.rect.cx, ms[0].rect.cx, 1) && near(m.px, ms[0].px, 0.005)), `メニュー：足もと（枠の下辺）・左右の中心・1 ドットの大きさが ${ms.length} つとも同じ（下辺 ${ms[0].rect.bottom}・中心 ${ms[0].rect.cx}・1 ドット ${ms[0].px}px）`);
  S(ms.every((m) => m.clip && !m.clip.top && !m.clip.bottom && !m.clip.left && !m.clip.right && !m.clip.screen && !m.ov), 'メニュー：帽子・槍・杖の先まで、絵の枠と画面の中に収まる（見切れなし）' + ms.filter((m) => !m.clip || m.ov || Object.values(m.clip).some(Boolean)).map((m) => JSON.stringify(m.clip) + m.ov).join(' '));
  S(rec.plain.menu.parts === 'base_plain' && rec.off.menu.parts === 'base_plain', '装備をはずすと素の絵（布の旅装）に戻る（はじめ・最後とも base_plain）');
  S(rec.robe.menu.job === 'mage' && rec.robe.menu.view === 'job:warrior', 'ローブの組み合わせ（魔法使い）でも、立ち絵は本人の素体で着替える（menuBase）');
  const bs = STATES.map((s) => rec[s.key].battle.hero && rec[s.key].battle.hero.size);
  S(bs.every((z) => z && z.w === bs[0].w && z.h === bs[0].h), '戦闘：主人公の範囲（カメラ合わせ・影・HP の位置）が ' + bs.length + ' つとも同じ（' + bs.map((z) => z && z.w + '×' + z.h).join(' ') + '）');
  const vs = STATES.map((s) => rec[s.key].battle.victory && rec[s.key].battle.victory.size);
  S(vs.every((z) => z && z.w === vs[0].w && z.h === vs[0].h), '勝利の正面：主人公の範囲（元の戦闘の正面の絵と同じ）が ' + vs.length + ' つとも同じ（' + vs.map((z) => z && z.w + '×' + z.h).join(' ') + '）');
  const stv = STATES.map((s) => rec[s.key].menu.stats);
  S(stv.every((x) => x && typeof x.def === 'number'), '能力値は今までの計算（防御：' + STATES.map((s, i) => s.key + ' ' + stv[i].def).join('・') + '）');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  S(bad.length === 0, '読み込みの失敗なし' + (bad.length ? '：' + bad.slice(0, 4).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/ui_${VIEW}.json`, JSON.stringify({ VIEW, isPhone, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 pixel ui ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch(async (e) => {
  console.error('FAIL', e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e);
  try { await PG.screenshot({ path: `${OUT}shots/ui_${VIEW}_error.jpg`, type: 'jpeg', quality: 70 }); console.error('UI', await PG.evaluate(() => [...document.querySelectorAll('#ui > *')].map((n) => n.className + ':' + (n.textContent || '').slice(0, 120)).join(' | '))); } catch (e2) { }
  process.exit(2);
});
