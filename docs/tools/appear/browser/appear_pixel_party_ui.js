// v9.8.9 装備の外見：仲間の職業の服・装備を、ふつうの遊び方の手順で確かめる（ヘッドレス Chromium。実機ではない。GPU なし）
//   代表：カイル（騎士。鉄の鎧＋鋼の剣＋鉄の盾）。主人公と 2 人の編成
//   1 そうび画面で試着（品の一覧で選んだだけの枠の絵）→ 確定 → なかま → 戦闘（背面）→ 勝利（正面）
//   2 ギルドの職業の一覧（カイルの転職先）：戦士（剣・鎧・盾を持ち越す。魔法戦士は条件未達）／魔法使い（全部外れる）のプレビュー、切り替え・Esc・「やめる」で何も変わらない
//   3 魔法使いに確定 → なかま＝直前のプレビュー → 樫の杖・旅人のローブを試着 → 確定（ローブは胴・裾・袖を一着に）→ 戦闘 → 勝利 → 杖をはずす → キャンセル
//   4 以前の版（v9.8.3・v9.7.2）で作ったセーブを読み、装備ID・所持数・外見と、職業の服（加入時の職業は元の絵）を確かめる
//   VIEW=pc（1280×720）｜phone（スマホ縦：iPhone 13 相当 390×664）  PORT=…  OUT=…
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const URL0 = `http://localhost:${PORT}/3d/index.html?nosw`;
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
// v9.9 代表の仲間（PT=kyle｜seris）。v9.9.1 素体を直したオルド・ガネス（PT=ord｜ganes：加入時の職業のまま、装備できる品で試着・確定・頭の付け替え・はずす・キャンセル）
const PT = process.env.PT || 'kyle'; const PTN = { kyle: 'カイル', seris: 'セリス', ord: 'オルド', ganes: 'ガネス' }; const WHO = { hero: 'もち', [PT]: PTN[PT] }; const JOBN = { warrior: '戦士', hunter: '狩人', thief: '盗賊', mage: '魔法使い' }; const IDS = Object.keys(WHO);
const SLOT_LABEL = { weapon: '武器', armor: '鎧', shield: '盾', head: '頭' };
let PG = null;
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext(VIEW === 'phone' ? Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 2 }) : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); PG = p; const errs = []; const bad = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('response', (r) => { const u = r.url(); if (u.indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + u.replace(/^.*localhost:\d+/, '')); });
  await p.addInitScript((pt) => { window.__PT = pt; }, PT);
  await p.goto(URL0); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  const setup = await p.evaluate(() => {
    const T = Win.toast; Win.toast = function (m) { (window.__toasts = window.__toasts || []).push(String(m)); return T.apply(this, arguments); };
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true; d.gold = 20000;
    [['iron_armor', 1], ['steel_sword', 1], ['iron_shield', 1], ['iron_helm', 1], ['oak_staff', 1], ['robe', 1], ['wizard_hat', 1], ['dagger', 1], ['leather_cap', 1], ['iron_axe', 1], ['short_bow', 1], ['iron_spear', 1]].filter((x) => ITEMS[x[0]]).forEach((x) => State.addItem(x[0], x[1])); State.joinCompanion(window.__PT);
    World.start(); const H = d.hero;
    return { party: d.party.slice(), job: H.job, equip: Object.assign({}, H.equip), can: { hunter: Actors.jobUnlocked(H, 'hunter', d.flags), thief: Actors.jobUnlocked(H, 'thief', d.flags), mage: Actors.jobUnlocked(H, 'mage', d.flags) },
      w: { hunter: JOBS.hunter.weapons, thief: JOBS.thief.weapons, warrior: JOBS.warrior.weapons, mage: JOBS.mage.weapons }, a: { mage: JOBS.mage.armors, thief: JOBS.thief.armors, hunter: JOBS.hunter.armors }, starter: STARTER_WEAPON.mage };
  });
  S(setup.party.join() === 'hero,' + PT && setup.job === 'warrior' && setup.can.hunter && setup.can.thief && setup.can.mage && setup.w.mage.join() === 'staff,dagger' && setup.a.mage.join() === 'robe,hat,acc', '準備：主人公（戦士）＋' + WHO[PT] + '。職業のデータ：魔法使い 武器 ' + setup.w.mage.join('・') + '・防具 ' + setup.a.mage.join('・') + '（はじめの武器 ' + setup.starter + '）／戦士 ' + setup.w.warrior.join('・') + '／狩人 ' + setup.w.hunter.join('・') + '／盗賊 ' + setup.w.thief.join('・') + '。狩人・盗賊・魔法使いへ転職できる');
  await p.evaluate((ids) => { window.IDS = ids; }, IDS);   // 戦闘の確かめ（ページの中の関数）で使う人物の一覧
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
  const openMenu = async () => { for (let i = 0; i < 3; i++) { await closeAll(); await p.keyboard.press('Escape'); try { await waitTop(/メニュー/, i < 2 ? 6000 : 20000); return; } catch (e) { if (i === 2) throw e; } } };   // v9.8.9 読み込みの直後は Esc が届かないことがあるので押し直す
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
      const el = await p.$('#ui .party-screen .pt-artbox') || await p.$('#ui .party-screen .pt-art'); if (el) await el.screenshot({ path: `${OUT}shots/ui_${VIEW}_pt_menu${tag || ''}_${id}_${key}.png` });
      if (!tag && key === 'equip') await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_pt_menu_full_${id}_${key}.jpg`, type: 'jpeg', quality: 80 });
      out[id] = m;
    }
    await closeAll(); return out;
  };
  // 戦闘の画面の中の人物の矩形（CSS の画素）。3D の舞台の partyRect（キャンバスの画素）を、画面の位置に直す
  const rects = () => p.evaluate(() => {
    const sc = Engine.scenes.find((s) => s._stage3d); const cv = document.getElementById('game') || document.querySelector('canvas'); if (!sc || !cv || !BattleStage3D.partyRect) return null;
    const b = cv.getBoundingClientRect(); const kx = b.width / cv.width, ky = b.height / cv.height; const out = {};
    IDS.forEach((id) => { const r = BattleStage3D.partyRect(sc, id, cv.width, cv.height); if (r) out[id] = { x: +(b.left + r.x * kx).toFixed(1), y: +(b.top + r.y * ky).toFixed(1), w: +(r.w * kx).toFixed(1), h: +(r.h * ky).toFixed(1) }; });
    return out;
  });
  // 勝利の結果の窓（#ui の中の見えている窓）が、人物の矩形のどれだけを覆うか
  const coverage = () => p.evaluate(() => {
    const sc = Engine.scenes.find((s) => s._stage3d); const cv = document.getElementById('game') || document.querySelector('canvas'); if (!sc || !cv) return null;
    const b = cv.getBoundingClientRect(); const kx = b.width / cv.width, ky = b.height / cv.height;
    const wins = [...document.querySelectorAll('#ui .rw-msg, #ui .rw-list, #ui .rw-choice, #ui .battle-result, #ui .br-win, #ui .rw-win, #ui [class*="result"], #ui [class*="victory"]')].filter((n) => { const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return r.width > 20 && r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }).map((n) => ({ cls: (n.className + '').slice(0, 40), r: n.getBoundingClientRect() }));
    const out = { wins: wins.map((w) => ({ cls: w.cls, x: Math.round(w.r.left), y: Math.round(w.r.top), w: Math.round(w.r.width), h: Math.round(w.r.height) })) };
    IDS.forEach((id) => {
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
  // v9.8.8 戦闘の絵と同じ合成の印（signature）の部品：そのときの装備で合成し直し（キャッシュ）、印が戦闘の絵と同じことを確かめる
  const pxOf = (vk, id) => p.evaluate(async (a) => { const r = await EquipmentAppearance.composeFor(State.actor(a[1]), a[0]); return { sig: r.sig, parts: (r.parts || []).join(' '), st: r.state }; }, [vk, id || 'hero']);
  const battle = async (key, levelup) => {
    await closeAll(); await pause3d(false);
    // 経験値の準備（確かめの都合）：ふつうは 3 人の経験値を 0 にして、レベルアップしない＝簡単な結果の窓で比べる。levelup のときは主人公をレベルアップの直前にして、詳しい結果の窓を出す
    await p.evaluate((lv) => { const d = State.data; [d.hero].concat(IDS.map((x) => State.actor(x))).forEach((a) => { a.exp = 0; }); if (lv) d.hero.exp = Actors.expForLevel(d.hero.level) - 1; }, !!levelup);
    await p.evaluate(() => { window.__btRes = null; const en = Object.keys(ENEMIES).filter((k) => ENEMIES[k].hp < 40 && !ENEMIES[k].boss && !ENEMIES[k].flee)[0]; State.data.settings.autoBattle = false; World.startBattle([en], {}).then((r) => { window.__btRes = r || 'end'; }); });
    await p.waitForSelector('#ui .cmd-list', { timeout: 120000 });
    await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return i && i.party && IDS.every((id) => { const x = i.party.find((q) => q.id === id); return x && /dir:/.test(x.model || '') && !x.eaWait; }); }, null, { timeout: 60000 }).catch(() => null);
    await p.waitForTimeout(1500);
    const info = () => p.evaluate(() => { const i = BattleStage3D.actorsInfo(); const f = (id) => i.party.find((x) => x.id === id); return Object.fromEntries(IDS.map((id) => [id, f(id)])); });
    const b = await info(); b.equip = await p.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, Object.assign({}, State.actor(id).equip)])), IDS); b.px = await pxOf('back', PT);
    b.fell = await p.evaluate(() => (window.__toasts || []).filter((t) => /3Dの戦闘を表示できない/.test(t)));
    b.rects = await rects();
    await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_pt_battle_${key}.jpg`, type: 'jpeg', quality: 72 });
    await p.evaluate(() => { const bt = BattleUI.battle; bt.enemies.forEach((e) => { e.hp = 1; }); State.data.settings.autoBattle = true; });
    await p.keyboard.press('Enter');
    b.victory = null;
    for (let i = 0; i < 220; i++) {
      await p.waitForTimeout(250);
      if (!b.victory) {
        const v = await p.evaluate(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return !!(i && i.party && IDS.every((id) => { const x = i.party.find((q) => q.id === id); return x && /dir:front/.test(x.model || '') && !x.eaWait; })); });
        if (v) {
          await p.waitForTimeout(600); b.victory = await info(); b.vrects = await rects(); b.vpx = await pxOf('front', PT);
          b.cover = await coverage();   // 結果の窓を出したまま：人物がどこまで見えるか
          b.panel = await p.evaluate(() => { const n = document.querySelector('#ui .rw-panel.result-victory'); if (!n) return null; const r = n.getBoundingClientRect(); const sc = n.querySelector('.rs-scroll'); const cl = n.querySelector('.rw-panel-close'); const cr = cl && cl.getBoundingClientRect(); const before = sc ? sc.scrollTop : 0; if (sc) sc.scrollTop = 99999; const moved = sc ? sc.scrollTop : 0; if (sc) sc.scrollTop = before; return { cls: n.className, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), scroll: sc ? { h: sc.clientHeight, all: sc.scrollHeight, can: moved > 0 || sc.scrollHeight <= sc.clientHeight + 2 } : null, close: cr ? { top: Math.round(cr.top), bottom: Math.round(cr.bottom), in: cr.bottom <= r.bottom + 1 && cr.bottom <= innerHeight && cr.height > 10 } : null, more: /rs-more/.test(n.className) }; });
          await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_pt_victory_ui_${key}.jpg`, type: 'jpeg', quality: 72 });
          await p.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; }); await p.waitForTimeout(120);
          await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_pt_victory_${key}.jpg`, type: 'jpeg', quality: 72 });
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
  // ---- 転職：冒険者ギルドの受付の画面を開いて、選択肢をクリック ----
  const guildChange = async (job) => {
    await closeAll(); const before = await p.evaluate(() => ({ job: State.data.hero.job, equip: Object.assign({}, State.data.hero.equip), inv: JSON.parse(JSON.stringify(State.data.inventory)), gold: State.data.gold }));
    await p.evaluate(() => { window.__guild = false; Services.guild().then(() => { window.__guild = true; }); });
    await pick(/冒険者ギルド/, /^転職する/); await pick(/誰が転職/, /^もち/); await pick(/の転職先/, new RegExp('^' + JOBN[job])); await pick(/に転職する？/, /^転職する/);
    await p.waitForTimeout(600); const msg = await p.evaluate(() => { const m = document.querySelector('#ui .rw-msg'); return m ? m.textContent.trim().slice(0, 120) : ''; });
    for (let i = 0; i < 20 && !(await p.evaluate(() => window.__guild)); i++) { const t = await top(); const tx = t ? await t.evaluate((n) => (n.querySelector('.rw-title, .rw-prompt') || n).textContent) : ''; if (/冒険者ギルド/.test(tx)) await pick(/冒険者ギルド/, /^やめる/); else await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
    await closeAll();
    const after = await p.evaluate(() => ({ job: State.data.hero.job, sprite: State.data.hero.sprite, level: State.data.hero.level, equip: Object.assign({}, State.data.hero.equip), inv: JSON.parse(JSON.stringify(State.data.inventory)), gold: State.data.gold }));
    const off = Object.keys(before.equip).filter((s) => before.equip[s] && !after.equip[s]).map((s) => before.equip[s]);
    S(after.job === job && off.every((id) => (after.inv[id] || 0) === (before.inv[id] || 0) + 1), `ギルドで${JOBN[before.job]} → ${JOBN[job]}に転職（費用 ${before.gold - after.gold}G・Lv${after.level}）。装備できない品は外れて持ち物に戻る：${off.join('・') || 'なし'}（のこりの装備 ${JSON.stringify(after.equip)}）${msg ? '「' + msg + '」' : ''}`);
    return { before, after, off, msg };
  };
  // ---- セーブ：メニューの［セーブ］→ スロット 1。そのあとページを読み込み直し、タイトルの「つづきから」→ スロット 1 ----
  const saveAndContinue = async () => {
    await openMenu(); const t = await waitTop(/メニュー/);
    const bt = await t.evaluateHandle((n) => [...n.querySelectorAll('*')].find((x) => x.textContent.trim() === 'セーブ' && ![...x.children].some((c) => c.textContent.trim() === 'セーブ')) || null);
    if (!bt.asElement()) throw new Error('メニューにセーブがない'); await bt.asElement().click(); await p.waitForTimeout(300);
    const sl = await waitTop(/セーブ（/); const row = (await sl.$$('.rw-item'))[0]; await row.click(); await p.waitForTimeout(200); if (await sl.evaluate((n) => n.isConnected)) { const ok = await sl.$('.rw-ok'); if (ok) await ok.click(); else await row.click(); }
    await p.waitForTimeout(500); const msg = await p.evaluate(() => { const m = document.querySelector('#ui .rw-msg'); return m ? m.textContent.trim().slice(0, 60) : ''; });
    await closeAll();
    const before = await p.evaluate(() => { const H = State.data.hero; const raw = localStorage.getItem('mtq-3d-slot-1') || ''; return { job: H.job, equip: Object.assign({}, H.equip), inv: JSON.parse(JSON.stringify(State.data.inventory)), saved: !!raw, bad: /equip-pixels|outfit_|weapon_bow|base_plain|data:image/.test(raw) }; });
    await p.reload(); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
    const cont = await p.evaluateHandle(() => [...document.querySelectorAll('#ui .title-menu *')].find((x) => !x.children.length && x.textContent.trim() === 'つづきから') || null);
    if (!cont.asElement()) throw new Error('タイトルに「つづきから」がない'); await cont.asElement().click(); await p.waitForTimeout(400);
    let tl = await top(); if (!tl || !/つづきから/.test(await tl.evaluate((n) => (n.querySelector('.rw-title, .rw-prompt') || n).textContent))) { await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
    tl = await waitTop(/つづきから/); const r1 = (await tl.$$('.rw-item'))[1]; await r1.click(); await p.waitForTimeout(200); if (await tl.evaluate((n) => n.isConnected)) { const ok = await tl.$('.rw-ok'); if (ok) await ok.click(); else await r1.click(); }
    await p.waitForFunction(() => !document.querySelector('#ui .title-menu') && window.World && State.data && State.data.hero, null, { timeout: 60000 }); await p.waitForTimeout(1500);
    await p.evaluate(() => { const st = State.data.settings; st.textSpeed = 'instant'; }); await pause3d(true); await closeAll();
    const after = await p.evaluate(() => { const H = State.data.hero; return { job: H.job, equip: Object.assign({}, H.equip), inv: JSON.parse(JSON.stringify(State.data.inventory)) }; });
    S(before.saved && !before.bad && /セーブした/.test(msg) && after.job === before.job && JSON.stringify(after.equip) === JSON.stringify(before.equip) && JSON.stringify(after.inv) === JSON.stringify(before.inv), `メニューの［セーブ］→ スロット 1（「${msg}」。外見の情報は書かない）→ ページを読み込み直し、タイトルの「つづきから」→ スロット 1：職業（${JOBN[after.job]}）・装備（${JSON.stringify(after.equip)}）・持ち物が同じ`);
    return { before, after, msg };
  };
  const snap = () => p.evaluate(() => { const d = State.data, H = d.hero; return JSON.stringify({ job: H.job, sprite: H.sprite, level: H.level, equip: H.equip, inv: d.inventory, gold: d.gold, save: localStorage.getItem('mtq-3d-slot-1') }); });
  const openJobList = async () => { await closeAll(); await p.evaluate(() => { window.__guild = false; Services.guild().then(() => { window.__guild = true; }); }); await pick(/冒険者ギルド/, /^転職する/); await pick(/誰が転職/, /^もち/); return waitTop(/の転職先/); };
  const leaveGuild = async () => { for (let i = 0; i < 20 && !(await p.evaluate(() => window.__guild)); i++) { const t = await top(); const tx = t ? await t.evaluate((n) => (n.querySelector('.rw-title, .rw-prompt') || n).textContent) : ''; if (/冒険者ギルド/.test(tx)) await pick(/冒険者ギルド/, /^やめる/); else await p.keyboard.press('Escape'); await p.waitForTimeout(300); } await closeAll(); };
  // 一覧の行を 1 回だけクリック（選ぶだけ。確定しない）→ 下の詳細にプレビューが出るまで待って読む
  const look = async (job) => {
    const t = await waitTop(/の転職先/); const row = await t.evaluateHandle((n, nm) => [...n.querySelectorAll('.rw-item')].find((r) => r.textContent.trim().indexOf(nm) === 0) || null, JOBN[job] || job);
    await row.asElement().scrollIntoViewIfNeeded(); await row.asElement().click(); await p.waitForTimeout(250);
    await p.waitForFunction(() => { const h = document.querySelector('#ui .rw-list .job-prev .ea-host'); return !h || /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, null, { timeout: 30000 }).catch(() => null); await p.waitForTimeout(250);
    return p.evaluate(() => { const l = [...document.querySelectorAll('#ui .rw-list')].pop(); const pv = l.querySelector('.job-prev'); const h = pv && pv.querySelector('.ea-host'); const cv = h && h.querySelector('canvas.ea-canvas'); const r = cv && cv.getBoundingClientRect(); const lr = l.getBoundingClientRect();
      const off = l.querySelector('.job-off'), keep = l.querySelector('.job-keep'); const cur = l.querySelector('.rw-item.cur');
      return { cur: cur && cur.textContent.trim().slice(0, 8), has: !!pv, job: pv && pv.getAttribute('data-job'), st: h && h.getAttribute('data-ea-state'), parts: cv && cv.getAttribute('data-ea-parts'), sig: cv && cv.getAttribute('data-ea-sig'), offIds: pv ? pv.getAttribute('data-off') : null, keepIds: pv ? pv.getAttribute('data-keep') : null,
        offText: off ? off.textContent.trim() : '', keepText: keep ? keep.textContent.trim() : '', oldPortrait: !!l.querySelector('.info-portrait'), inView: !!r && r.top >= lr.top - 1 && r.bottom <= Math.min(lr.bottom, innerHeight) + 1 && r.left >= 0 && r.right <= innerWidth && r.height > 40, h: r && Math.round(r.height) }; });
  };
  const partyParts = async () => { const m = await shotParty('prev'); return m.hero; };
  // ---------------- v9.8.9 仲間（カイル）----------------
  JOBN.magicknight = '魔法戦士'; JOBN.knight = '騎士';
  const K = PT;
  const ksnap = () => p.evaluate((id) => { const d = State.data, A = State.actor(id); return JSON.stringify({ job: A.job, level: A.level, equip: A.equip, inv: d.inventory, gold: d.gold, hero: d.hero.equip, save: localStorage.getItem('mtq-3d-slot-1') }); }, PT);
  const kinv = () => p.evaluate(() => JSON.parse(JSON.stringify(State.data.inventory)));
  const N = (o, k) => (o && o[k]) || 0;
  const kOpenJobs = async () => { await closeAll(); await p.evaluate(() => { window.__guild = false; Services.guild().then(() => { window.__guild = true; }); }); await pick(/冒険者ギルド/, /^転職する/); await pick(/誰が転職/, new RegExp('^' + WHO[PT])); return waitTop(new RegExp(WHO[PT] + 'の転職先')); };
  const kLook = async (job) => {
    const t = await waitTop(/の転職先/); const row = await t.evaluateHandle((n, nm) => [...n.querySelectorAll('.rw-item')].find((r) => r.textContent.trim().indexOf(nm) === 0) || null, JOBN[job]);
    await row.asElement().scrollIntoViewIfNeeded(); await row.asElement().click(); await p.waitForTimeout(250);
    await p.waitForFunction(() => { const h = document.querySelector('#ui .rw-list .job-prev .ea-host'); return !h || /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, null, { timeout: 30000 }).catch(() => null); await p.waitForTimeout(250);
    return p.evaluate(() => { const l = [...document.querySelectorAll('#ui .rw-list')].pop(); const pv = l.querySelector('.job-prev'); const h = pv && pv.querySelector('.ea-host'); const cv = h && h.querySelector('canvas.ea-canvas');
      const off = l.querySelector('.job-off'), keep = l.querySelector('.job-keep'); return { has: !!pv, actor: h && h.getAttribute('data-ea-actor'), job: pv && pv.getAttribute('data-job'), st: h && h.getAttribute('data-ea-state'), parts: cv && cv.getAttribute('data-ea-parts'), sig: cv && cv.getAttribute('data-ea-sig'), offIds: pv ? pv.getAttribute('data-off') : null, keepIds: pv ? pv.getAttribute('data-keep') : null, offText: off ? off.textContent.trim() : '', keepText: keep ? keep.textContent.trim() : '' }; });
  };
  // 試着：品の一覧で行を 1 回だけ選ぶ → 試着の枠の絵の部品を読む → 決める
  const tryOn = async (id, slot, item) => {
    await openEquip(id); await pick(new RegExp(WHO[id] + 'の装備'), new RegExp('^' + SLOT_LABEL[slot]));
    const t = await waitTop(new RegExp(WHO[id] + 'の.+を選ぶ')); const name = await p.evaluate((x) => ITEMS[x].name, item);
    const row = await t.evaluateHandle((n, nm) => [...n.querySelectorAll('.rw-item')].find((r) => r.textContent.trim().replace(/^◎ /, '').indexOf(nm) === 0) || null, name);
    await row.asElement().scrollIntoViewIfNeeded(); await row.asElement().click(); await p.waitForTimeout(300);
    await p.waitForFunction(() => { const h = document.querySelector('#ui .eq-try .ea-host'); return h && /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, null, { timeout: 20000 }).catch(() => null); await p.waitForTimeout(200);
    const tp = await p.evaluate(() => { const h = document.querySelector('#ui .eq-try .ea-host'); const n = h && h.querySelector('canvas'); return n ? n.getAttribute('data-ea-parts') : null; });
    await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_pt_try_${item}.jpg`, type: 'jpeg', quality: 75 });
    const ok = await t.$('.rw-ok'); if (ok) await ok.click(); else await row.asElement().click(); await p.waitForTimeout(400);
    const head = await headParts(); await closeAll(); return { tp, head };
  };
  const kScene = async (key, name, opt) => {
    const m = await shotParty(key); const bt = opt.battle ? await battle(key) : null; const m2 = bt ? await shotParty(key, '_after') : null;
    rec[key] = { name, menu: m, battle: bt, after: m2 }; const mm = m[PT];
    S(mm.st === 'ok' && (!opt.parts || mm.parts === opt.parts) && (!opt.has || opt.has.every((k) => (' ' + mm.parts + ' ').indexOf(' ' + k + ' ') >= 0)) && (!opt.not || opt.not.every((k) => (' ' + mm.parts + ' ').indexOf(' ' + k + ' ') < 0)), `［${name}］${WHO[PT]}：なかまの画面 ${mm.parts}（職業 ${mm.job}・装備 ${JSON.stringify(mm.equip)}）`);
    if (bt) {
      const x = bt[PT], v = bt.victory && bt.victory[PT];
      S(x && /dir:back/.test(x.model || '') && bt.px && bt.px.sig === x.ea && !bt.fell.length && (!opt.has || opt.has.every((k) => (' ' + bt.px.parts + ' ').indexOf(' ' + k + ' ') >= 0)) && (!opt.not || opt.not.every((k) => (' ' + bt.px.parts + ' ').indexOf(' ' + k + ' ') < 0)), `［${name}］${WHO[PT]}：戦闘の背面（${x && x.model}・部品 ${bt.px && bt.px.parts}）`);
      S(v && /dir:front/.test(v.model || '') && bt.vpx && bt.vpx.sig === v.ea && (!opt.has || opt.has.every((k) => (' ' + bt.vpx.parts + ' ').indexOf(' ' + k + ' ') >= 0)), `［${name}］${WHO[PT]}：勝利の正面（${v && v.model}・部品 ${bt.vpx && bt.vpx.parts}）`);
      S(m2[PT].parts === mm.parts && bt.ended, `［${name}］戦闘のあとのなかまの画面も同じ（${m2[PT].parts}）。戦闘の大きさ：背面 ${bt.rects && bt.rects[PT] ? bt.rects[PT].w + '×' + bt.rects[PT].h : '?'}（CSS の画素）`);
    }
    return rec[key];
  };
  if (PT === 'kyle') {
  // 1 騎士：試着 → 確定（鉄の鎧＋鋼の剣＋鉄の盾）
  const t1 = await tryOn(K, 'armor', 'iron_armor'), t2 = await tryOn(K, 'weapon', 'steel_sword'), t3 = await tryOn(K, 'shield', 'iron_shield');
  S([t1, t2, t3].every((t) => t.tp && t.tp === t.head) && /armor_shape_f/.test(t3.head) && /shield/.test(t3.head) && /weapon_sword/.test(t3.head), `騎士：そうび画面で試着（選んだだけの枠の絵）＝ 確定のあとの絵（鎧 ${t1.tp}／剣 ${t2.tp}／盾 ${t3.tp}）`);
  await kScene('k0', '騎士：鉄の鎧＋鋼の剣＋鉄の盾', { battle: true, has: ['armor_shape_f', 'weapon_sword'] });
  // 2 ギルドの一覧：魔法戦士（持ち越し）・魔法使い（全部外れる）
  await p.evaluate(() => State.save(1)); const s0 = await ksnap();
  await kOpenJobs(); const pMK = await kLook('warrior'); await p.screenshot({ path: `${OUT}shots/jobprev_pt_${VIEW}_warrior.jpg`, type: 'jpeg', quality: 80 });
  const pMG = await kLook('mage'); await p.screenshot({ path: `${OUT}shots/jobprev_pt_${VIEW}_mage.jpg`, type: 'jpeg', quality: 80 }); const pMK2 = await kLook('warrior'); const s1 = await ksnap();
  S(pMK.has && pMK.actor === 'kyle' && pMK.st === 'ok' && pMK.offIds === '' && pMK.keepIds.split(',').sort().join() === 'iron_armor,iron_shield,steel_sword' && /jf_cape_t/.test(pMK.parts) && !/jf_cloth_t/.test(pMK.parts) && /weapon_sword/.test(pMK.parts) && /shield/.test(pMK.parts), `カイル：騎士 → 戦士のプレビュー：剣・鎧・盾を持ち越し（魔法戦士は条件未達で選べない）。マントは戦士の配色、服は鎧が覆うので描かない（${pMK.parts}・「${pMK.keepText}」）`);
  S(pMG.has && pMG.offIds.split(',').sort().join() === 'iron_armor,iron_shield,steel_sword' && /jf_skirt_t/.test(pMG.parts) && /jf_sleeve_t/.test(pMG.parts) && !/weapon_sword|shield|armor_shape_f/.test(pMG.parts), `カイル：騎士 → 魔法使いのプレビュー：剣・鎧・盾が外れ（「${pMG.offText}」）、ローブの裾・広い袖の姿（${pMG.parts}）`);
  S(pMK2.sig === pMK.sig && s1 === s0, 'カイル：候補を切り替えても同じ候補は同じプレビュー。職業・装備・所持数・所持金・セーブの中身は変わらない');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await leaveGuild(); const s2 = await ksnap();
  await kOpenJobs(); await kLook('mage'); await pick(/の転職先/, /^魔法使い/); await pick(/に転職する？/, /^やめる/); await leaveGuild(); const s3 = await ksnap();
  S(s2 === s0 && s3 === s0, 'カイル：一覧を Esc／魔法使いを選んで「やめる」→ 何も変わらない');
  // 3 魔法使いに確定
  const i0 = await kinv(); await kOpenJobs(); const pv = await kLook('mage'); await pick(/の転職先/, /^魔法使い/); await pick(/に転職する？/, /^転職する/); await p.waitForTimeout(500); await leaveGuild();
  const i1 = await kinv(); const ka = await p.evaluate(() => ({ job: State.actor('kyle').job, equip: Object.assign({}, State.actor('kyle').equip) }));
  const m1 = await shotParty('k1');
  S(ka.job === 'mage' && !ka.equip.weapon && !ka.equip.armor && !ka.equip.shield && ['iron_armor', 'steel_sword', 'iron_shield'].every((x) => N(i1, x) === N(i0, x) + 1) && m1.kyle.parts === pv.parts, `カイル：魔法使いに確定：剣・鎧・盾は持ち物に戻り（所持数 +1）、なかまの画面（${m1.kyle.parts}）＝直前のプレビュー`);
  const t4 = await tryOn(K, 'weapon', 'oak_staff'), t5 = await tryOn(K, 'armor', 'robe');
  S(t4.tp === t4.head && t5.tp === t5.head && /weapon_staff_t/.test(t5.head) && /jf_sleeve_t/.test(t5.head), `カイル（魔法使い）：樫の杖・旅人のローブを試着 → 確定（${t5.head}）`);
  await kScene('k2', 'カイル 魔法使い：樫の杖＋旅人のローブ', { battle: true, has: ['jf_skirt_t', 'jf_sleeve_t', 'weapon_staff_t', 'weapon_staff_f', 'hand'] });
  // ローブは胴・裾・袖を一着に：職業の服の袖（紫）は描かず、ローブの袖（品の色）。重ね方で確かめる
  const ro = await p.evaluate(() => { const A = State.actor('kyle'); const q = EquipmentAppearance.pixelPlan(A, 'menu'); return q.mats.join(); });
  S(/^outfit:mage,armor_robe,weapon_staff,armor_robe:over/.test(ro), `ローブの品を着ると、袖・胴はローブの品（armor_robe・armor_robe:over）で描き、職業の服の袖は描かない（重ね方 ${ro}）`);
  const i2 = await kinv(); const ui1 = await equipVia(K, { weapon: null }); const i3 = await kinv();
  await kScene('k3', 'カイル 魔法使い：杖をはずす', { battle: true, has: ['jf_skirt_t', 'jf_sleeve_t'], not: ['weapon_staff_t', 'weapon_staff_f'] });
  S(N(i3, 'oak_staff') === N(i2, 'oak_staff') + 1 && !/weapon_staff/.test(ui1.head), `杖をはずす：絵（なかま・そうび画面・戦闘・勝利）から杖が消え、持ち物に戻る（所持数 ${N(i2, 'oak_staff')} → ${N(i3, 'oak_staff')}）`);
  const i4 = await kinv(); const cx = await cancelVia(K, '鎧'); const i5 = await kinv();
  S(cx.same && cx.back && cx.head0 === cx.head1 && JSON.stringify(i4) === JSON.stringify(i5), `キャンセル（そうび → 鎧 → 品の一覧で Esc）：装備・所持数・絵が変わらない（${cx.head1}）`);
  } else if (PT === 'ord' || PT === 'ganes') {
  // ---- v9.9.1 オルド・ガネス（元の絵の盾・剣／槌・やっとこを切り離した素体。加入時の職業のまま）----
  const can = await p.evaluate((id) => { const A = State.actor(id); const c = (l) => l.filter((x) => ITEMS[x] && Actors.canEquip(A, x));
    return { job: A.job, equip: Object.assign({}, A.equip), weapon: c(['steel_sword', 'iron_axe', 'iron_spear', 'dagger', 'oak_staff', 'short_bow']), shield: c(['iron_shield']), head: c(['iron_helm', 'leather_cap', 'wizard_hat']), armor: c(['iron_armor', 'robe']) }; }, PT);
  const WP = { steel_sword: 'weapon_sword', iron_axe: 'weapon_axe', iron_spear: 'weapon_spear', dagger: 'weapon_dagger', oak_staff: 'weapon_staff_t', short_bow: 'weapon_bow' };
  const HP = { iron_helm: 'head_helm_t', leather_cap: 'head_cap_t', wizard_hat: 'head_hat_t' };
  // 頭の付け替え（兜 → 帽子など）は、この職業で装備できる頭が 2 種類以上あるときだけ（騎士・職人は兜だけ。頭の付け替えはセリスの手順で確かめる）
  S(can.weapon.length && can.head.length, `${WHO[PT]}（${can.job}）：装備できる品（武器 ${can.weapon.join('・')}／盾 ${can.shield.join('・') || 'なし'}／頭 ${can.head.join('・')}／鎧 ${can.armor.join('・') || 'なし'}）。加入時の装備 ${JSON.stringify(can.equip)}`);
  const w0 = can.weapon[0], h0 = can.head[0], h1 = can.head[1];
  const tr = [await tryOn(K, 'weapon', w0)]; if (can.shield.length) tr.push(await tryOn(K, 'shield', can.shield[0])); tr.push(await tryOn(K, 'head', h0));
  const need = [WP[w0], HP[h0]].concat(can.shield.length ? ['shield_gt'] : []); const last = tr[tr.length - 1].head;
  S(tr.every((t) => t.tp && t.tp === t.head) && need.every((k) => last.indexOf(k) >= 0) && /hand/.test(last), `${WHO[PT]}：そうび画面で試着（選んだだけの枠の絵）＝ 確定のあとの絵（${tr.map((t) => t.tp).join('／')}）`);
  await kScene(PT[0] + '0', `${WHO[PT]}：${w0}＋${can.shield[0] || '盾なし'}＋${h0}`, { battle: true, has: need.concat(['hand']) });
  if (h1) {
    const t2 = await tryOn(K, 'head', h1);
    S(t2.tp === t2.head && t2.head.indexOf(HP[h1]) >= 0 && t2.head.indexOf(HP[h0]) < 0, `${WHO[PT]}：頭を ${h0} → ${h1} に付け替え（${t2.head}）`);
    await kScene(PT[0] + '1', `${WHO[PT]}：頭を ${h1} に`, { battle: true, has: [HP[h1]], not: [HP[h0]] });
  }
  const i2 = await kinv(); const ui1 = await equipVia(K, { weapon: null }); const i3 = await kinv();
  await kScene(PT[0] + '2', `${WHO[PT]}：武器をはずす`, { battle: true, not: [WP[w0]] });
  S(N(i3, w0) === N(i2, w0) + 1 && ui1.head.indexOf(WP[w0]) < 0, `武器をはずす：絵（なかま・そうび画面・戦闘・勝利）から武器が消え、持ち物に戻る（所持数 ${N(i2, w0)} → ${N(i3, w0)}）`);
  const i4 = await kinv(); const cx = await cancelVia(K, '頭'); const i5 = await kinv();
  S(cx.same && cx.back && cx.head0 === cx.head1 && JSON.stringify(i4) === JSON.stringify(i5), `キャンセル（そうび → 頭 → 品の一覧で Esc）：装備・所持数・絵が変わらない（${cx.head1}）`);
  } else {
  // ---- v9.9 セリス（魔法使い。元の絵の杖・本を切り離した素体。帽子は元の絵のとんがり帽子）----
  const t1 = await tryOn(K, 'weapon', 'oak_staff'), t2 = await tryOn(K, 'armor', 'robe'), t3 = await tryOn(K, 'head', 'wizard_hat');
  S([t1, t2, t3].every((t) => t.tp && t.tp === t.head) && /weapon_staff_t/.test(t3.head) && /own_hat_t/.test(t3.head) && /hand/.test(t3.head), `魔法使い：そうび画面で試着（選んだだけの枠の絵）＝ 確定のあとの絵（杖 ${t1.tp}／ローブ ${t2.tp}／帽子 ${t3.tp}。帽子は元の帽子を品の色で塗る）`);
  await kScene('s0', 'セリス 魔法使い：樫の杖＋旅人のローブ＋魔法使いの帽子', { battle: true, has: ['weapon_staff_t', 'weapon_staff_f', 'hand', 'own_hat_t'] });
  await p.evaluate(() => State.save(1)); const s0 = await ksnap();
  JOBN.priest = '僧侶';
  await kOpenJobs(); const pPR = await kLook('priest'); await p.screenshot({ path: `${OUT}shots/jobprev_pt_seris_${VIEW}_priest.jpg`, type: 'jpeg', quality: 80 });
  const pWR = await kLook('warrior'); await p.screenshot({ path: `${OUT}shots/jobprev_pt_seris_${VIEW}_warrior.jpg`, type: 'jpeg', quality: 80 }); const pPR2 = await kLook('priest'); const s1 = await ksnap();
  S(pPR.has && pPR.actor === PT && pPR.offIds === '' && pPR.keepIds.split(',').sort().join() === 'oak_staff,robe,wizard_hat' && /weapon_staff_t/.test(pPR.parts) && /own_hat_t/.test(pPR.parts), `セリス：魔法使い → 僧侶のプレビュー：杖・ローブ・帽子を持ち越し（${pPR.parts}・「${pPR.keepText}」）`);
  S(pWR.has && pWR.offIds.split(',').sort().join() === 'oak_staff,robe,wizard_hat' && /jf_cape_t|jf_cloth_t/.test(pWR.parts) && !/weapon_|own_hat_t/.test(pWR.parts), `セリス：魔法使い → 戦士のプレビュー：杖・ローブ・帽子が外れ（「${pWR.offText}」）、戦士の配色の服（${pWR.parts}）`);
  S(pPR2.sig === pPR.sig && s1 === s0, 'セリス：候補を切り替えても同じ候補は同じプレビュー。職業・装備・所持数・所持金・セーブの中身は変わらない');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await leaveGuild(); const s2 = await ksnap();
  await kOpenJobs(); await kLook('warrior'); await pick(/の転職先/, /^戦士/); await pick(/に転職する？/, /^やめる/); await leaveGuild(); const s3 = await ksnap();
  S(s2 === s0 && s3 === s0, 'セリス：一覧を Esc／戦士を選んで「やめる」→ 何も変わらない');
  const i0 = await kinv(); await kOpenJobs(); const pv = await kLook('warrior'); await pick(/の転職先/, /^戦士/); await pick(/に転職する？/, /^転職する/); await p.waitForTimeout(500); await leaveGuild();
  const i1 = await kinv(); const ka = await p.evaluate((id) => ({ job: State.actor(id).job, equip: Object.assign({}, State.actor(id).equip) }), PT);
  const m1 = await shotParty('s1');
  S(ka.job === 'warrior' && !ka.equip.weapon && !ka.equip.armor && !ka.equip.head && ['oak_staff', 'robe', 'wizard_hat'].every((x) => N(i1, x) === N(i0, x) + 1) && m1[PT].parts === pv.parts, `セリス：戦士に確定：杖・ローブ・帽子は持ち物に戻り（所持数 +1）、なかまの画面（${m1[PT].parts}）＝直前のプレビュー`);
  const t4 = await tryOn(K, 'armor', 'iron_armor'), t5 = await tryOn(K, 'weapon', 'steel_sword'), t6 = await tryOn(K, 'shield', 'iron_shield'), t7 = await tryOn(K, 'head', 'iron_helm');
  S([t4, t5, t6, t7].every((t) => t.tp === t.head) && ['hv_pl_t', 'weapon_sword', 'shield_gt', 'head_helm_t'].every((k) => t7.head.indexOf(k) >= 0) && /^base_helm/.test(t7.head), `セリス（戦士）：鉄の鎧・鋼の剣・鉄の盾・鉄の兜を試着 → 確定（${t7.head}。兜のときは帽子を外して髪を補った素の絵）`);
  // v9.10 仕様の変更：背面は重鎧の肩当て（hv_pl_t）を足さない（髪の上に浮いて見えたため）。以前の期待は 3 つの向きとも hv_pl_t あり。正面の肩当ては上の行（そうび画面）で確かめている
  await kScene('s2', 'セリス 戦士：鉄の鎧＋鋼の剣＋鉄の盾＋鉄の兜（v9.10 から背面は肩当てなし。以前の期待：hv_pl_t も）', { battle: true, has: ['base_helm', 'head_helm_t', 'weapon_sword', 'shield_gt'] });
  const i2 = await kinv(); const ui1 = await equipVia(K, { weapon: null }); const i3 = await kinv();
  await kScene('s3', 'セリス 戦士：剣をはずす', { battle: true, has: ['head_helm_t', 'shield_gt'], not: ['weapon_sword'] });
  S(N(i3, 'steel_sword') === N(i2, 'steel_sword') + 1 && !/weapon_sword/.test(ui1.head), `剣をはずす：絵（なかま・そうび画面・戦闘・勝利）から剣が消え、持ち物に戻る（所持数 ${N(i2, 'steel_sword')} → ${N(i3, 'steel_sword')}）`);
  const i4 = await kinv(); const cx = await cancelVia(K, '盾'); const i5 = await kinv();
  S(cx.same && cx.back && cx.head0 === cx.head1 && JSON.stringify(i4) === JSON.stringify(i5), `キャンセル（そうび → 盾 → 品の一覧で Esc）：装備・所持数・絵が変わらない（${cx.head1}）`);
  }
  // 4 以前の版で作ったセーブ（読むだけ。書き換えない）
  const crypto = require('crypto'); rec.old = {};
  for (const fxName of ['v983', 'v972']) {
    const fp = `${OUT}fixtures/save_${fxName}.json`; const raw = fs.readFileSync(fp, 'utf8'); const sha0 = crypto.createHash('sha256').update(raw).digest('hex'); const fx = JSON.parse(raw);
    await p.evaluate((ks) => { localStorage.clear(); Object.keys(ks).forEach((k) => localStorage.setItem(k, ks[k])); }, fx.localStorage);
    await p.reload(); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
    const o = await p.evaluate(() => {
      const d = State.load(1); if (!d) return null; document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
      State.data = d; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true; World.start();
      const EA = EquipmentAppearance; const res = {};
      d.party.forEach((id) => { const A = State.actor(id); res[id] = { job: A.job, equip: Object.assign({}, A.equip), plans: ['menu', 'back', 'front'].map((dir) => { const q = EA.pixelPlan(A, dir === 'menu' ? EA.menuView(A) : dir); return q.ok ? q.mats.join(' ') + (q.skipped.length ? ' !' + q.skipped.join(',') : '') : 'x'; }) }; });
      const keys = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); keys[k] = localStorage.getItem(k); }
      return { party: d.party.slice(), res, inventory: JSON.parse(JSON.stringify(d.inventory)), gold: d.gold, keys };
    });
    const ex = fx.expect; const tag = `以前の版のセーブ ${fxName}（${fx.madeWith.commit}）`;
    S(o && JSON.stringify(o.party) === JSON.stringify(ex.party) && o.party.every((id) => JSON.stringify(o.res[id].equip) === JSON.stringify(ex.equip[id])) && JSON.stringify(o.inventory) === JSON.stringify(ex.inventory) && o.gold === ex.gold, `${tag}：パーティ・全員の装備ID・所持数・所持金が作ったときと同じ`);
    S(o && o.party.every((id) => o.res[id].plans.every((x) => x !== 'x' && x.indexOf('outfit:') < 0)), `${tag}：加入時の職業のままの仲間は職業の服の重ね絵なし（元の絵の姿）で、装備は 3 つの向きとも外見に解決（` + (o ? o.party.map((id) => id + '＝' + o.res[id].plans[0]).join('／') : '') + '）');
    S(o && Object.keys(fx.localStorage).every((k) => o.keys[k] === fx.localStorage[k]) && crypto.createHash('sha256').update(fs.readFileSync(fp, 'utf8')).digest('hex') === sha0, `${tag}：読んだだけではセーブを書き換えない`);
    rec.old[fxName] = o && { party: o.party, res: o.res };
  }
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  S(bad.length === 0, '読み込みの失敗なし' + (bad.length ? '：' + bad.slice(0, 4).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/ui_party${PT === 'kyle' ? '' : '_' + PT}_${VIEW}.json`, JSON.stringify({ VIEW, isPhone, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 pixel ui party ${PT} ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch(async (e) => {
  console.error('FAIL', e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e);
  try { await PG.screenshot({ path: `${OUT}shots/ui_${VIEW}_pt_error.jpg`, type: 'jpeg', quality: 70 }); console.error('UI', await PG.evaluate(() => [...document.querySelectorAll('#ui > *')].map((n) => n.className + ':' + (n.textContent || '').slice(0, 120)).join(' | '))); } catch (e2) { }
  process.exit(2);
});
