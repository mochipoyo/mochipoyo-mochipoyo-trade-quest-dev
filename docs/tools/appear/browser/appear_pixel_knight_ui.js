// v9.8.2 装備の外見（ドット絵の差分）：仲間（カイル・カズト）を、ふつうの遊び方の手順で確かめる（ヘッドレス Chromium。実機ではない。GPU なし）
//   appear_pixel_comp_ui.js（リーナ・ガルド）と同じ手順：
//   1 フィールドでメニュー（Esc）→［そうび］→ カイル／カズト → 枠 → 品／はずす（画面をクリックして選ぶ。装備の処理は今までのまま）
//   2 メニュー →［パーティ］→［なかま］→ カイル・カズトの行を選んで立ち絵（メニュー正面）を写す
//   3 そのまま World.startBattle → 背面を写す → 勝つ → 勝利の振り向き（正面）を、結果の窓を出したまま・窓を隠して写す → フィールドへ
//   4 戦闘のあと、もう一度［なかま］で立ち絵を写し、戦闘の前と同じ装備・同じ部品か確かめる
//   組み合わせ：はじめ（装備なし：仲間は加入したとき何も装備していない）→ 重鎧＋剣と盾（元の絵の装い）→ 持ち替え（カイル 剣→槍／カズト 剣と盾→戦斧）→ 武器をはずす → 全部はずす
//   キャンセル：［そうび］→ 枠 → 品の一覧で Esc → 装備も、そうびの画面の絵も変わらない（2 人とも）
//   VIEW=pc（1280×720）｜phone（スマホ縦：iPhone 13 相当 390×664）  PORT=…  OUT=…
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const URL0 = `http://localhost:${PORT}/3d/index.html?nosw`;
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const WHO = { kyle: 'カイル', kazuto: 'カズト' }; const IDS = Object.keys(WHO);
const STATES = [
  { key: 'plain', name: '装備なし（加入したまま）', eq: null, battle: true },
  { key: 'equip', name: '2 人とも：重鎧＋剣と盾（元の絵の装い）', eq: { kyle: { armor: 'iron_armor', weapon: 'steel_sword', shield: 'iron_shield' }, kazuto: { armor: 'iron_armor', weapon: 'steel_sword', shield: 'iron_shield' } }, cancel: { kyle: '武器', kazuto: '武器' }, battle: true },
  { key: 'swap', name: 'カイル：剣→槍／カズト：剣と盾→戦斧', eq: { kyle: { weapon: 'iron_spear' }, kazuto: { weapon: 'battle_axe', shield: null } }, cancel: { kyle: '盾', kazuto: '鎧' }, battle: true },
  { key: 'unarm', name: '武器をはずす（2 人とも）', eq: { kyle: { weapon: null }, kazuto: { weapon: null } }, battle: true },
  { key: 'helm', name: '2 人とも：鉄の兜をかぶる（＋剣・盾）', eq: { kyle: { head: 'iron_helm', weapon: 'steel_sword' }, kazuto: { head: 'iron_helm', weapon: 'steel_sword', shield: 'iron_shield' } }, cancel: { kyle: '頭', kazuto: '頭' }, battle: true },
  { key: 'off', name: '全部はずす（解除）', eq: { kyle: { weapon: null, armor: null, shield: null, head: null }, kazuto: { weapon: null, armor: null, shield: null, head: null } }, battle: false },
];
// 組み合わせごとの、なかまの画面の立ち絵の部品（重ねる順）
const PARTS = {
  plain: { kyle: 'base_plain', kazuto: 'base_plain' },
  equip: { kyle: 'base_plain armor_shape_f shield_f shield_e weapon_sword', kazuto: 'base_plain armor_shape_f shield_f shield_e weapon_sword' },
  swap: { kyle: 'base_plain armor_shape_f shield_f shield_e weapon_spear hand', kazuto: 'base_plain armor_shape_f weapon_axe hand' },
  unarm: { kyle: 'base_plain armor_shape_f shield_f shield_e', kazuto: 'base_plain armor_shape_f' },
  helm: { kyle: 'base_helm armor_shape_f head_helm_t head_helm_f shield_f shield_e weapon_sword', kazuto: 'base_helm armor_shape_f head_helm_t head_helm_f shield_f shield_e weapon_sword' },
  off: { kyle: 'base_plain', kazuto: 'base_plain' },
};
const SLOT_LABEL = { weapon: '武器', armor: '鎧', shield: '盾', head: '頭' };
let PG = null;
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext(VIEW === 'phone' ? Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 2 }) : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); PG = p; const errs = []; const bad = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('response', (r) => { const u = r.url(); if (u.indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + u.replace(/^.*localhost:\d+/, '')); });
  await p.goto(URL0); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  const setup = await p.evaluate(() => {
    const T = Win.toast; Win.toast = function (m) { (window.__toasts = window.__toasts || []).push(String(m)); return T.apply(this, arguments); };
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true; d.gold = 20000;
    ['kyle', 'kazuto'].forEach((id) => State.joinCompanion(id));
    [['iron_armor', 2], ['steel_sword', 2], ['iron_shield', 2], ['iron_spear', 1], ['battle_axe', 1], ['iron_helm', 2]].forEach(([id, n]) => State.addItem(id, n));
    World.start();
    const K = State.actor('kyle'), Z = State.actor('kazuto');
    return { party: d.party.slice(), kyle: Object.assign({}, K.equip), kazuto: Object.assign({}, Z.equip), jobs: { kyle: K.job, kazuto: Z.job }, lv: { kyle: K.level, kazuto: Z.level },
      can: { k_sword: Actors.canEquip(K, 'steel_sword'), k_spear: Actors.canEquip(K, 'iron_spear'), k_shield: Actors.canEquip(K, 'iron_shield'), k_armor: Actors.canEquip(K, 'iron_armor'), z_sword: Actors.canEquip(Z, 'steel_sword'), z_axe: Actors.canEquip(Z, 'battle_axe'), z_shield: Actors.canEquip(Z, 'iron_shield'), z_armor: Actors.canEquip(Z, 'iron_armor') } };
  });
  S(setup.party.join() === 'hero,kyle,kazuto' && Object.values(setup.can).every(Boolean) && !Object.values(setup.kyle).some(Boolean) && !Object.values(setup.kazuto).some(Boolean), '準備：主人公・カイル（' + setup.jobs.kyle + ' Lv' + setup.lv.kyle + '）・カズト（' + setup.jobs.kazuto + ' Lv' + setup.lv.kazuto + '）。仲間は加入したとき何も装備していない。比べる品はゲームのデータで装備できる（' + JSON.stringify(setup.can) + '）');
  await p.waitForTimeout(1500);
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
  const headParts = () => p.evaluate(() => { const n = document.querySelector('#ui .equip-menu .eq-body-head canvas'); return n ? n.getAttribute('data-ea-parts') : null; });
  const openEquip = async (id) => {
    await openMenu(); const t = await top(); const eqb = await t.$('.rw-tool[data-tool="equip"]'); await eqb.scrollIntoViewIfNeeded(); await eqb.click({ timeout: 8000 }); await p.waitForTimeout(250);
    await pick(/装備を変える/, new RegExp('^' + WHO[id]));
    await waitTop(new RegExp(WHO[id] + 'の装備')); await p.waitForTimeout(400);
  };
  const equipVia = async (id, eq) => {
    await openEquip(id); const done = [];
    for (const slot of ['weapon', 'armor', 'shield', 'head']) {
      if (!(slot in eq)) continue; const want = eq[slot]; const cur = await p.evaluate((a) => State.actor(a[0]).equip[a[1]], [id, slot]);
      if ((cur || null) === want) continue;
      await pick(new RegExp(WHO[id] + 'の装備'), new RegExp('^' + SLOT_LABEL[slot]));
      const name = want ? await p.evaluate((x) => ITEMS[x].name, want) : 'はずす';
      await pick(new RegExp(WHO[id] + 'の.+を選ぶ'), new RegExp('^(◎ )?' + name.replace(/[()（）]/g, '.')));
      done.push(slot + ':' + (want || 'はずす'));
    }
    await p.waitForTimeout(400); const head = await headParts();
    await closeAll(); return { done, head };
  };
  const cancelVia = async (id, slotLabel) => {
    const before = await p.evaluate((a) => JSON.stringify(State.actor(a).equip), id);
    await openEquip(id); const head0 = await headParts();
    await pick(new RegExp(WHO[id] + 'の装備'), new RegExp('^' + (slotLabel || '武器'))); await waitTop(new RegExp(WHO[id] + 'の.+を選ぶ'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    const back = await waitTop(new RegExp(WHO[id] + 'の装備')).then(() => true).catch(() => false); await p.waitForTimeout(400);
    const head1 = await headParts(); const after = await p.evaluate((a) => JSON.stringify(State.actor(a).equip), id);
    await closeAll(); return { same: before === after, back, head0, head1, before };
  };
  const shotParty = async (key, tag) => {
    await openMenu(); await tab('パーティ'); await pick(/メニュー/, /^なかま/);
    await p.waitForSelector('#ui .party-screen .pt-art', { timeout: 30000 });
    const out = {};
    for (const id of IDS) {
      const row = await p.$(`#ui .party-screen .pt-row[data-id="${id}"]`); await row.click(); await p.waitForTimeout(200);
      await p.waitForFunction((a) => { const h = document.querySelector('#ui .pt-art .ea-host'); return h && h.getAttribute('data-ea-actor') === a && /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, id, { timeout: 30000 }).catch(() => null);
      await p.waitForTimeout(300);
      const m = await p.evaluate((a) => {
        const h = document.querySelector('#ui .pt-art .ea-host'); const cv = h && h.querySelector('canvas.ea-canvas'); const box = document.querySelector('#ui .party-screen .pt-artbox') || document.querySelector('#ui .pt-art');
        const r = cv ? cv.getBoundingClientRect() : null; const b = box.getBoundingClientRect(); const A = State.actor(a); const vk = EquipmentAppearance.menuView(A); const view = EquipmentAppearance.pixelView(a, vk); const f = view && view.frame;
        let clip = null; if (r) { clip = { top: r.top < b.top - 0.5, bottom: r.bottom > b.bottom + 0.5, left: r.left < b.left - 0.5, right: r.right > b.right + 0.5, screen: r.top < 0 || r.left < 0 || r.right > innerWidth || r.bottom > innerHeight }; }
        let ov = null; for (let n = cv && cv.parentElement; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (/(hidden|clip|auto|scroll)/.test(cs.overflowY + cs.overflowX)) { const q = n.getBoundingClientRect(); if (r && (r.top < q.top - 0.5 || r.bottom > q.bottom + 0.5 || r.left < q.left - 0.5 || r.right > q.right + 0.5)) { ov = (n.className || n.tagName) + ''; break; } } }
        return { actor: h && h.getAttribute('data-ea-actor'), st: h && h.getAttribute('data-ea-state'), parts: cv && cv.getAttribute('data-ea-parts'), skipped: cv && cv.getAttribute('data-ea-skipped'), view: vk, job: A.job,
          rect: r && { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), cx: +((r.left + r.right) / 2).toFixed(1) }, px: r && f ? +(r.height / (f.y1 - f.y0)).toFixed(4) : null, pxw: r && f ? +(r.width / (f.x1 - f.x0)).toFixed(4) : null, clip, ov,
          equip: Object.assign({}, A.equip), stats: Actors.stats(A) };
      }, id);
      const el = await p.$('#ui .party-screen .pt-artbox') || await p.$('#ui .party-screen .pt-art'); if (el) await el.screenshot({ path: `${OUT}shots/ui_${VIEW}_k_menu${tag || ''}_${id}_${key}.png` });
      if (!tag && key === 'equip') await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_k_menu_full_${id}_${key}.jpg`, type: 'jpeg', quality: 80 });
      out[id] = m;
    }
    await closeAll(); return out;
  };
  // 戦闘の画面の中の人物の矩形（CSS の画素）。3D の舞台の partyRect（キャンバスの画素）を、画面の位置に直す
  const rects = () => p.evaluate(() => {
    const sc = Engine.scenes.find((s) => s._stage3d); const cv = document.getElementById('game') || document.querySelector('canvas'); if (!sc || !cv || !BattleStage3D.partyRect) return null;
    const b = cv.getBoundingClientRect(); const kx = b.width / cv.width, ky = b.height / cv.height; const out = {};
    ['hero', 'kyle', 'kazuto'].forEach((id) => { const r = BattleStage3D.partyRect(sc, id, cv.width, cv.height); if (r) out[id] = { x: +(b.left + r.x * kx).toFixed(1), y: +(b.top + r.y * ky).toFixed(1), w: +(r.w * kx).toFixed(1), h: +(r.h * ky).toFixed(1) }; });
    return out;
  });
  // 勝利の結果の窓（#ui の中の見えている窓）が、人物の矩形のどれだけを覆うか
  const coverage = () => p.evaluate(() => {
    const sc = Engine.scenes.find((s) => s._stage3d); const cv = document.getElementById('game') || document.querySelector('canvas'); if (!sc || !cv) return null;
    const b = cv.getBoundingClientRect(); const kx = b.width / cv.width, ky = b.height / cv.height;
    const wins = [...document.querySelectorAll('#ui .rw-msg, #ui .rw-list, #ui .rw-choice, #ui .battle-result, #ui .br-win, #ui .rw-win, #ui [class*="result"], #ui [class*="victory"]')].filter((n) => { const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return r.width > 20 && r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }).map((n) => ({ cls: (n.className + '').slice(0, 40), r: n.getBoundingClientRect() }));
    const out = { wins: wins.map((w) => ({ cls: w.cls, x: Math.round(w.r.left), y: Math.round(w.r.top), w: Math.round(w.r.width), h: Math.round(w.r.height) })) };
    ['hero', 'kyle', 'kazuto'].forEach((id) => {
      const r = BattleStage3D.partyRect(sc, id, cv.width, cv.height); if (!r) return; const R = { l: b.left + r.x * kx, t: b.top + r.y * ky, r: b.left + (r.x + r.w) * kx, b: b.top + (r.y + r.h) * ky };
      // 覆われた面積：人物の矩形を 2px の格子で調べる（窓の重なりを二重に数えない）
      let n = 0, c = 0; for (let y = R.t; y < R.b; y += 2) for (let x = R.l; x < R.r; x += 2) { n++; if (wins.some((w) => x >= w.r.left && x <= w.r.right && y >= w.r.top && y <= w.r.bottom)) c++; }
      // 頭（上 30%）が見えているか
      let nh = 0, ch = 0; for (let y = R.t; y < R.t + (R.b - R.t) * 0.3; y += 2) for (let x = R.l; x < R.r; x += 2) { nh++; if (wins.some((w) => x >= w.r.left && x <= w.r.right && y >= w.r.top && y <= w.r.bottom)) ch++; }
      // v9.8.3 装備（武器・帽子の先）までふくむ範囲でも測る
      const rf = BattleStage3D.partyRect(sc, id, cv.width, cv.height, true) || r; const F = { l: b.left + rf.x * kx, t: b.top + rf.y * ky, r: b.left + (rf.x + rf.w) * kx, b: b.top + (rf.y + rf.h) * ky };
      let nf = 0, cf = 0; for (let y = F.t; y < F.b; y += 2) for (let x = F.l; x < F.r; x += 2) { nf++; if (wins.some((w) => x >= w.r.left && x <= w.r.right && y >= w.r.top && y <= w.r.bottom)) cf++; }
      out[id] = { covered: n ? +(c / n).toFixed(3) : null, headCovered: nh ? +(ch / nh).toFixed(3) : null, fullCovered: nf ? +(cf / nf).toFixed(3) : null, fullTop: Math.round(F.t), rect: { x: Math.round(R.l), y: Math.round(R.t), w: Math.round(R.r - R.l), h: Math.round(R.b - R.t) } };
    });
    return out;
  });
  const battle = async (key, levelup) => {
    await closeAll(); await pause3d(false);
    // 経験値の準備（確かめの都合）：ふつうは 3 人の経験値を 0 にして、レベルアップしない＝簡単な結果の窓で比べる。levelup のときは主人公をレベルアップの直前にして、詳しい結果の窓を出す
    await p.evaluate((lv) => { const d = State.data; [d.hero].concat(['kyle', 'kazuto'].map((x) => State.actor(x))).forEach((a) => { a.exp = 0; }); if (lv) d.hero.exp = Actors.expForLevel(d.hero.level) - 1; }, !!levelup);
    await p.evaluate(() => { window.__btRes = null; const en = Object.keys(ENEMIES).filter((k) => ENEMIES[k].hp < 40 && !ENEMIES[k].boss && !ENEMIES[k].flee)[0]; State.data.settings.autoBattle = false; World.startBattle([en], {}).then((r) => { window.__btRes = r || 'end'; }); });
    await p.waitForSelector('#ui .cmd-list', { timeout: 120000 });
    await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return i && i.party && ['kyle', 'kazuto'].every((id) => { const x = i.party.find((q) => q.id === id); return x && /dir:/.test(x.model || '') && !x.eaWait; }); }, null, { timeout: 60000 }).catch(() => null);
    await p.waitForTimeout(1500);
    const info = () => p.evaluate(() => { const i = BattleStage3D.actorsInfo(); const f = (id) => i.party.find((x) => x.id === id); return { kyle: f('kyle'), kazuto: f('kazuto'), hero: f('hero') }; });
    const b = await info(); b.equip = await p.evaluate(() => ({ kyle: Object.assign({}, State.actor('kyle').equip), kazuto: Object.assign({}, State.actor('kazuto').equip) }));
    b.fell = await p.evaluate(() => (window.__toasts || []).filter((t) => /3Dの戦闘を表示できない/.test(t)));
    b.rects = await rects();
    await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_k_battle_${key}.jpg`, type: 'jpeg', quality: 72 });
    await p.evaluate(() => { const bt = BattleUI.battle; bt.enemies.forEach((e) => { e.hp = 1; }); State.data.settings.autoBattle = true; });
    await p.keyboard.press('Enter');
    b.victory = null;
    for (let i = 0; i < 220; i++) {
      await p.waitForTimeout(250);
      if (!b.victory) {
        const v = await p.evaluate(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return !!(i && i.party && ['kyle', 'kazuto'].every((id) => { const x = i.party.find((q) => q.id === id); return x && /dir:front/.test(x.model || '') && !x.eaWait; })); });
        if (v) {
          await p.waitForTimeout(600); b.victory = await info(); b.vrects = await rects();
          b.cover = await coverage();   // 結果の窓を出したまま：人物がどこまで見えるか
          b.panel = await p.evaluate(() => { const n = document.querySelector('#ui .rw-panel.result-victory'); if (!n) return null; const r = n.getBoundingClientRect(); const sc = n.querySelector('.rs-scroll'); const cl = n.querySelector('.rw-panel-close'); const cr = cl && cl.getBoundingClientRect(); const before = sc ? sc.scrollTop : 0; if (sc) sc.scrollTop = 99999; const moved = sc ? sc.scrollTop : 0; if (sc) sc.scrollTop = before; return { cls: n.className, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), scroll: sc ? { h: sc.clientHeight, all: sc.scrollHeight, can: moved > 0 || sc.scrollHeight <= sc.clientHeight + 2 } : null, close: cr ? { top: Math.round(cr.top), bottom: Math.round(cr.bottom), in: cr.bottom <= r.bottom + 1 && cr.bottom <= innerHeight && cr.height > 10 } : null, more: /rs-more/.test(n.className) }; });
          await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_k_victory_ui_${key}.jpg`, type: 'jpeg', quality: 72 });
          await p.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; }); await p.waitForTimeout(120);
          await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_k_victory_${key}.jpg`, type: 'jpeg', quality: 72 });
          await p.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = ''; });
          await p.waitForTimeout(1200); b.vrects2 = await rects();   // 勝利のカメラが止まってから、もう一度（足もとの比べに使う）
        }
      }
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
    const ui = {};
    if (st.eq) for (const id of IDS) ui[id] = await equipVia(id, st.eq[id]);
    const m = await shotParty(st.key);
    const cx = {}; if (st.cancel) for (const id of IDS) cx[id] = await cancelVia(id, st.cancel[id]);
    const bt = st.battle ? await battle(st.key) : null;
    const m2 = st.battle ? await shotParty(st.key, '_after') : null;
    rec[st.key] = { name: st.name, ui, menu: m, cancel: cx, battle: bt, after: m2 };
    for (const id of IDS) {
      const mm = m[id]; const want = st.eq ? Object.keys(st.eq[id]).every((s) => (mm.equip[s] || null) === st.eq[id][s]) : !Object.values(mm.equip).some(Boolean);
      const wantParts = PARTS[st.key][id];
      S(want && mm.st === 'ok' && mm.actor === id && mm.view === 'menu' && mm.parts === wantParts, `［${st.name}］${WHO[id]}：${st.eq ? '装備メニューで ' + (ui[id].done.join('・') || '変更なし') : '加入したまま'} → なかまの画面の立ち絵 ${mm.parts}（そうびの画面の絵 ${ui[id] ? ui[id].head : '—'}）`);
      if (st.cancel) S(cx[id].same && cx[id].back && cx[id].head0 === cx[id].head1, `［${st.name}］${WHO[id]}：キャンセル（［そうび］→ ${st.cancel[id]} → 品の一覧で Esc）→ 装備も絵も変わらない（${cx[id].before}・そうびの画面の絵 ${cx[id].head1}）`);
      if (bt) {
        const x = bt[id], v = bt.victory && bt.victory[id];
        S(x && /dir:back/.test(x.model || '') && !!x.ea && !bt.fell.length, `［${st.name}］${WHO[id]}：そのまま戦闘 → 背面に合成（${x && x.model}・装備 ${JSON.stringify(bt.equip[id])}）`);
        S(v && /dir:front/.test(v.model || '') && /"front"/.test(v.ea || ''), `［${st.name}］${WHO[id]}：勝利の振り向き → 正面にも同じ装備を合成（${v && v.model}・範囲 ${v && JSON.stringify(v.size)}）`);
        const a2 = m2[id]; S(a2.st === 'ok' && a2.parts === mm.parts && JSON.stringify(a2.equip) === JSON.stringify(mm.equip) && a2.rect && mm.rect && Math.abs(a2.rect.bottom - mm.rect.bottom) < 1, `［${st.name}］${WHO[id]}：戦闘のあとのメニュー：戦闘の前と同じ装備・同じ部品（${a2.parts}）`);
        const cv = bt.cover && bt.cover[id]; S(!!cv && bt.panel && / rs-top/.test(bt.panel.cls) && cv.headCovered === 0 && cv.covered <= 0.03 && cv.fullCovered <= 0.03, `［${st.name}］${WHO[id]}：勝利の結果の窓を出したまま → 窓は画面の上（${bt.panel && bt.panel.cls}・${bt.panel && bt.panel.top}〜${bt.panel && bt.panel.bottom}px）。人物の矩形の ${cv ? Math.round(cv.covered * 100) : '?'}% が窓に重なる（頭の上 30% は ${cv ? Math.round(cv.headCovered * 100) : '?'}%・装備の先まで ${cv ? Math.round(cv.fullCovered * 100) : '?'}%）`);
      }
      if (bt) S(bt.ended, `［${st.name}］戦闘のあとフィールドへ戻った`);
    }
  }
  for (const id of IDS) {
    const ms = STATES.map((s) => rec[s.key].menu[id]); const near = (a, b, t) => Math.abs(a - b) <= t;
    S(ms.every((m) => m.rect && near(m.rect.bottom, ms[0].rect.bottom, 1) && near(m.rect.cx, ms[0].rect.cx, 1) && near(m.px, ms[0].px, 0.005)), `${WHO[id]}：メニューの足もと（枠の下辺）・左右の中心・1 ドットの大きさが ${ms.length} つとも同じ（下辺 ${ms[0].rect.bottom}・中心 ${ms[0].rect.cx}・1 ドット ${ms[0].px}px）`);
    S(ms.every((m) => m.clip && !Object.values(m.clip).some(Boolean) && !m.ov), `${WHO[id]}：剣・槍・斧・盾の先まで、絵の枠と画面の中に収まる（見切れなし）` + ms.filter((m) => !m.clip || m.ov || Object.values(m.clip).some(Boolean)).map((m) => JSON.stringify(m.clip) + m.ov).join(' '));
    const bs = STATES.filter((s) => s.battle).map((s) => rec[s.key].battle[id] && rec[s.key].battle[id].size); const vs = STATES.filter((s) => s.battle).map((s) => rec[s.key].battle.victory && rec[s.key].battle.victory[id] && rec[s.key].battle.victory[id].size);
    S(bs.every((z) => z && z.w === bs[0].w && z.h === bs[0].h) && vs.every((z) => z && z.w === vs[0].w && z.h === vs[0].h), `${WHO[id]}：戦闘の背面・勝利の正面の範囲（カメラ合わせ・影・HP の位置）が組み合わせで同じ（背面 ${bs.map((z) => z && z.w + '×' + z.h).join(' ')}／正面 ${vs.map((z) => z && z.w + '×' + z.h).join(' ')}）`);
    // 勝利のカメラは動くので、同じ瞬間の主人公（どちらの組み合わせも装備なし）との比で比べる：足もとの差・高さの比
    const sr = STATES.filter((s) => s.battle).map((s) => { const v = rec[s.key].battle.vrects2 || rec[s.key].battle.vrects; const r = v && v[id], h = v && v.hero; return r && h ? { dy: +((r.y + r.h) - (h.y + h.h)).toFixed(1), kh: +(r.h / h.h).toFixed(3) } : null; });
    S(sr.every((r) => r && Math.abs(r.dy - sr[0].dy) <= 1.5 && Math.abs(r.kh - sr[0].kh) <= 0.015), `${WHO[id]}：勝利の正面の画面の足もと・高さが組み合わせで同じ（同じ瞬間の主人公との差・比：${sr.map((r) => r && 'Δ足もと ' + r.dy + 'px・高さ比 ' + r.kh).join('／')}）`);
  }
  const sig = (x) => String((x && x.ea) || ''); const has = (x, ids) => ids.every((k) => sig(x).indexOf('"' + k + '"') >= 0);
  const hK = rec.helm, hb = hK.battle;
  S(IDS.every((id) => hK.menu[id].equip.head === 'iron_helm' && /^base_helm /.test(hK.menu[id].parts) && has(hb[id], ['iron_helm']) && has(hb.victory && hb.victory[id], ['iron_helm'])), '鉄の兜：2 人とも、なかまの画面は兜用の素の絵（はみ出す髪を消した絵）＋兜。戦闘の背面・勝利の正面の合成の印にも 鉄の兜');
  S(rec.off.menu.kyle.parts === 'base_plain' && rec.off.menu.kazuto.parts === 'base_plain', '全部はずすと素の絵（鎧下・手ぶら）に戻る（2 人とも base_plain）');
  const kS = rec.swap.menu.kyle, zS = rec.swap.menu.kazuto, bS = rec.swap.battle, kU = rec.unarm.menu.kyle, zU = rec.unarm.menu.kazuto;
  S(kS.equip.armor === 'iron_armor' && kS.equip.shield === 'iron_shield' && /armor_shape_f shield_f shield_e weapon_spear hand$/.test(kS.parts) && !/weapon_sword/.test(kS.parts) && has(bS.kyle, ['iron_armor', 'iron_spear', 'iron_shield']) && has(bS.victory && bS.victory.kyle, ['iron_armor', 'iron_spear', 'iron_shield']), 'カイル：剣から槍に持ち替えても、重鎧・盾は表示を続ける（なかまの画面 ' + kS.parts + '／戦闘の背面・勝利の正面の合成の印に 鉄の鎧・鉄の槍・鉄の盾）');
  S(zS.equip.armor === 'iron_armor' && !zS.equip.shield && /armor_shape_f weapon_axe hand$/.test(zS.parts) && !/shield_/.test(zS.parts) && has(bS.kazuto, ['iron_armor', 'battle_axe']) && has(bS.victory && bS.victory.kazuto, ['iron_armor', 'battle_axe']), 'カズト：剣と盾から戦斧に持ち替えても、重鎧は表示を続ける（盾ははずした。なかまの画面 ' + zS.parts + '／戦闘・勝利の合成の印に 鉄の鎧・戦斧）');
  S(!kU.equip.weapon && kU.parts === 'base_plain armor_shape_f shield_f shield_e' && !zU.equip.weapon && zU.parts === 'base_plain armor_shape_f', 'カイル・カズト：武器をはずすと手ぶら（拳だけ。鎧・盾はそのまま）：' + kU.parts + '／' + zU.parts);
  // 詳しい結果の窓（レベルアップ）：記録のみ（窓の高さが人物まで届くか）
  // レベルアップの勝利は、装備を着けた姿で（ふつうの装備メニューから着け直す）：結果の窓を出したまま、顔と武器が見えるか
  const LVEQ = { kyle: { armor: 'iron_armor', head: 'iron_helm', weapon: 'iron_spear', shield: 'iron_shield' }, kazuto: { armor: 'iron_armor', head: 'iron_helm', weapon: 'battle_axe' } }; for (const id of Object.keys(LVEQ)) await equipVia(id, LVEQ[id]);
  const lv = await battle('levelup', true);
  const lvc = lv.cover || {}; rec.levelup = { battle: lv };
  const lvIds = ['hero', 'kyle', 'kazuto']; const lvOk = lvIds.every((id) => lvc[id] && lvc[id].headCovered === 0 && lvc[id].covered <= 0.03 && lvc[id].fullCovered <= 0.03);
  S(!!(lv.panel && /rs-detail/.test(lv.panel.cls)) && lvOk, `レベルアップの勝利：詳しい結果の窓（${lv.panel && lv.panel.cls}・${lv.panel && lv.panel.top}〜${lv.panel && lv.panel.bottom}px）を出したまま、人物に重ならない（人物の矩形／装備の先までの矩形に重なる割合：${lvIds.map((id) => id + ' ' + (lvc[id] ? Math.round(lvc[id].covered * 100) + '%／' + Math.round(lvc[id].fullCovered * 100) + '%' : '?')).join('・')}。装備の先のいちばん上 ${Math.min(...lvIds.map((id) => lvc[id] ? lvc[id].fullTop : 9999))}px）`);
  S(!!(lv.panel && lv.panel.close && lv.panel.close.in && lv.panel.scroll && lv.panel.scroll.can), `レベルアップの勝利：「次へ」は窓の中に見え、詳細はスクロールできる（詳細の欄 ${lv.panel && lv.panel.scroll && lv.panel.scroll.h}px／中身 ${lv.panel && lv.panel.scroll && lv.panel.scroll.all}px・つづきの印 ${lv.panel && lv.panel.more}）`);
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  S(bad.length === 0, '読み込みの失敗なし' + (bad.length ? '：' + bad.slice(0, 4).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/ui_knight_${VIEW}.json`, JSON.stringify({ VIEW, isPhone, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 pixel ui knight ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch(async (e) => {
  console.error('FAIL', e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e);
  try { await PG.screenshot({ path: `${OUT}shots/ui_${VIEW}_k_error.jpg`, type: 'jpeg', quality: 70 }); console.error('UI', await PG.evaluate(() => [...document.querySelectorAll('#ui > *')].map((n) => n.className + ':' + (n.textContent || '').slice(0, 120)).join(' | '))); } catch (e2) { }
  process.exit(2);
});
