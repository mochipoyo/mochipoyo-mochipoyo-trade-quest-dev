// v9.8.8 装備の外見（ドット絵の差分）：主人公の魔法使い（ローブの裾・広い袖・杖）を、ふつうの遊び方の手順で確かめる（ヘッドレス Chromium。実機ではない。GPU なし）
//   流れ：戦士（鉄の鎧＋鋼の剣）で戦闘 → ギルドの職業の一覧で魔法使いのプレビュー（剣・鎧が外れる）・候補の切り替え・キャンセル・「やめる」
//         → 狩人に転職・短弓で戦闘 → 魔法使いのプレビュー（弓が外れる）→ 盗賊に転職・短剣＋革の鎧で戦闘
//         → 魔法使いのプレビュー（短剣は持ち越す・革の鎧が外れる）→ 一覧から確定 → なかまの画面＝直前のプレビュー
//         → 樫の杖を装備（キャンセルも）→ 戦闘（背面）・勝利（正面）→ 杖をはずす → 戦闘（杖が絵から消える）
//   転職は、冒険者ギルドの受付の画面（Services.guild）を開いて、選択肢をクリックして進める（ギルドまで歩く手順は通していない）
//   VIEW=pc（1280×720）｜phone（スマホ縦：iPhone 13 相当 390×664）  PORT=…  OUT=…
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const URL0 = `http://localhost:${PORT}/3d/index.html?nosw`;
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const WHO = { hero: 'もち' }; const JOBN = { warrior: '戦士', hunter: '狩人', thief: '盗賊', mage: '魔法使い' }; const IDS = Object.keys(WHO);
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
    [['iron_armor', 1], ['steel_sword', 1], ['short_bow', 1], ['dagger', 1], ['oak_staff', 1], ['leather_armor', 1]].forEach((x) => State.addItem(x[0], x[1]));
    World.start(); const H = d.hero;
    return { party: d.party.slice(), job: H.job, equip: Object.assign({}, H.equip), can: { hunter: Actors.jobUnlocked(H, 'hunter', d.flags), thief: Actors.jobUnlocked(H, 'thief', d.flags), mage: Actors.jobUnlocked(H, 'mage', d.flags) },
      w: { hunter: JOBS.hunter.weapons, thief: JOBS.thief.weapons, warrior: JOBS.warrior.weapons, mage: JOBS.mage.weapons }, a: { mage: JOBS.mage.armors, thief: JOBS.thief.armors, hunter: JOBS.hunter.armors }, starter: STARTER_WEAPON.mage };
  });
  S(setup.party.join() === 'hero' && setup.job === 'warrior' && setup.can.hunter && setup.can.thief && setup.can.mage && setup.w.mage.join() === 'staff,dagger' && setup.a.mage.join() === 'robe,hat,acc', '準備：主人公（戦士）。職業のデータ：魔法使い 武器 ' + setup.w.mage.join('・') + '・防具 ' + setup.a.mage.join('・') + '（はじめの武器 ' + setup.starter + '）／戦士 ' + setup.w.warrior.join('・') + '／狩人 ' + setup.w.hunter.join('・') + '／盗賊 ' + setup.w.thief.join('・') + '。狩人・盗賊・魔法使いへ転職できる');
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
      const el = await p.$('#ui .party-screen .pt-artbox') || await p.$('#ui .party-screen .pt-art'); if (el) await el.screenshot({ path: `${OUT}shots/ui_${VIEW}_mg_menu${tag || ''}_${id}_${key}.png` });
      if (!tag && key === 'equip') await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_mg_menu_full_${id}_${key}.jpg`, type: 'jpeg', quality: 80 });
      out[id] = m;
    }
    await closeAll(); return out;
  };
  // 戦闘の画面の中の人物の矩形（CSS の画素）。3D の舞台の partyRect（キャンバスの画素）を、画面の位置に直す
  const rects = () => p.evaluate(() => {
    const sc = Engine.scenes.find((s) => s._stage3d); const cv = document.getElementById('game') || document.querySelector('canvas'); if (!sc || !cv || !BattleStage3D.partyRect) return null;
    const b = cv.getBoundingClientRect(); const kx = b.width / cv.width, ky = b.height / cv.height; const out = {};
    ['hero'].forEach((id) => { const r = BattleStage3D.partyRect(sc, id, cv.width, cv.height); if (r) out[id] = { x: +(b.left + r.x * kx).toFixed(1), y: +(b.top + r.y * ky).toFixed(1), w: +(r.w * kx).toFixed(1), h: +(r.h * ky).toFixed(1) }; });
    return out;
  });
  // 勝利の結果の窓（#ui の中の見えている窓）が、人物の矩形のどれだけを覆うか
  const coverage = () => p.evaluate(() => {
    const sc = Engine.scenes.find((s) => s._stage3d); const cv = document.getElementById('game') || document.querySelector('canvas'); if (!sc || !cv) return null;
    const b = cv.getBoundingClientRect(); const kx = b.width / cv.width, ky = b.height / cv.height;
    const wins = [...document.querySelectorAll('#ui .rw-msg, #ui .rw-list, #ui .rw-choice, #ui .battle-result, #ui .br-win, #ui .rw-win, #ui [class*="result"], #ui [class*="victory"]')].filter((n) => { const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return r.width > 20 && r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }).map((n) => ({ cls: (n.className + '').slice(0, 40), r: n.getBoundingClientRect() }));
    const out = { wins: wins.map((w) => ({ cls: w.cls, x: Math.round(w.r.left), y: Math.round(w.r.top), w: Math.round(w.r.width), h: Math.round(w.r.height) })) };
    ['hero'].forEach((id) => {
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
  const pxOf = (vk) => p.evaluate(async (v) => { const r = await EquipmentAppearance.composeFor(State.actor('hero'), v); return { sig: r.sig, parts: (r.parts || []).join(' '), st: r.state }; }, vk);
  const battle = async (key, levelup) => {
    await closeAll(); await pause3d(false);
    // 経験値の準備（確かめの都合）：ふつうは 3 人の経験値を 0 にして、レベルアップしない＝簡単な結果の窓で比べる。levelup のときは主人公をレベルアップの直前にして、詳しい結果の窓を出す
    await p.evaluate((lv) => { const d = State.data; [d.hero].concat(['hero'].map((x) => State.actor(x))).forEach((a) => { a.exp = 0; }); if (lv) d.hero.exp = Actors.expForLevel(d.hero.level) - 1; }, !!levelup);
    await p.evaluate(() => { window.__btRes = null; const en = Object.keys(ENEMIES).filter((k) => ENEMIES[k].hp < 40 && !ENEMIES[k].boss && !ENEMIES[k].flee)[0]; State.data.settings.autoBattle = false; World.startBattle([en], {}).then((r) => { window.__btRes = r || 'end'; }); });
    await p.waitForSelector('#ui .cmd-list', { timeout: 120000 });
    await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return i && i.party && ['hero'].every((id) => { const x = i.party.find((q) => q.id === id); return x && /dir:/.test(x.model || '') && !x.eaWait; }); }, null, { timeout: 60000 }).catch(() => null);
    await p.waitForTimeout(1500);
    const info = () => p.evaluate(() => { const i = BattleStage3D.actorsInfo(); const f = (id) => i.party.find((x) => x.id === id); return { hero: f('hero') }; });
    const b = await info(); b.equip = await p.evaluate(() => ({ hero: Object.assign({}, State.actor('hero').equip) })); b.px = await pxOf('back');
    b.fell = await p.evaluate(() => (window.__toasts || []).filter((t) => /3Dの戦闘を表示できない/.test(t)));
    b.rects = await rects();
    await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_mg_battle_${key}.jpg`, type: 'jpeg', quality: 72 });
    await p.evaluate(() => { const bt = BattleUI.battle; bt.enemies.forEach((e) => { e.hp = 1; }); State.data.settings.autoBattle = true; });
    await p.keyboard.press('Enter');
    b.victory = null;
    for (let i = 0; i < 220; i++) {
      await p.waitForTimeout(250);
      if (!b.victory) {
        const v = await p.evaluate(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return !!(i && i.party && ['hero'].every((id) => { const x = i.party.find((q) => q.id === id); return x && /dir:front/.test(x.model || '') && !x.eaWait; })); });
        if (v) {
          await p.waitForTimeout(600); b.victory = await info(); b.vrects = await rects(); b.vpx = await pxOf('front');
          b.cover = await coverage();   // 結果の窓を出したまま：人物がどこまで見えるか
          b.panel = await p.evaluate(() => { const n = document.querySelector('#ui .rw-panel.result-victory'); if (!n) return null; const r = n.getBoundingClientRect(); const sc = n.querySelector('.rs-scroll'); const cl = n.querySelector('.rw-panel-close'); const cr = cl && cl.getBoundingClientRect(); const before = sc ? sc.scrollTop : 0; if (sc) sc.scrollTop = 99999; const moved = sc ? sc.scrollTop : 0; if (sc) sc.scrollTop = before; return { cls: n.className, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), scroll: sc ? { h: sc.clientHeight, all: sc.scrollHeight, can: moved > 0 || sc.scrollHeight <= sc.clientHeight + 2 } : null, close: cr ? { top: Math.round(cr.top), bottom: Math.round(cr.bottom), in: cr.bottom <= r.bottom + 1 && cr.bottom <= innerHeight && cr.height > 10 } : null, more: /rs-more/.test(n.className) }; });
          await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_mg_victory_ui_${key}.jpg`, type: 'jpeg', quality: 72 });
          await p.evaluate(() => { const u = document.getElementById('ui'); if (u) u.style.visibility = 'hidden'; }); await p.waitForTimeout(120);
          await p.screenshot({ path: `${OUT}shots/ui_${VIEW}_mg_victory_${key}.jpg`, type: 'jpeg', quality: 72 });
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
  // ---------------- 場面 ----------------
  const inv = () => p.evaluate(() => JSON.parse(JSON.stringify(State.data.inventory)));
  const eqNow = () => p.evaluate(() => Object.assign({}, State.data.hero.equip));
  const N = (o, k) => (o && o[k]) || 0;
  // ふつうの手順の 1 場面：［そうび］で変更 → なかま → （キャンセル）→ 戦闘（背面）→ 勝利（正面）→ 戦闘のあとのなかま
  const scene = async (key, name, eq, opt) => {
    opt = opt || {}; const ui = eq ? await equipVia('hero', eq) : null; const m = await shotParty(key);
    let cx = null; if (opt.cancel) { const i0 = await inv(); cx = await cancelVia('hero', opt.cancel); const i1 = await inv(); cx.invSame = JSON.stringify(i0) === JSON.stringify(i1); }
    const bt = opt.battle ? await battle(key) : null; const m2 = opt.battle ? await shotParty(key, '_after') : null;
    rec[key] = { name, ui, menu: m, cancel: cx, battle: bt, after: m2 }; const mm = m.hero;
    S(mm.st === 'ok' && mm.view === 'job:warrior' && (!opt.parts || mm.parts === opt.parts) && (!opt.has || opt.has.every((k) => (' ' + mm.parts + ' ').indexOf(' ' + k + ' ') >= 0)), `［${name}］${eq ? '［そうび］で ' + (ui.done.join('・') || '変更なし') + ' → ' : ''}なかまの画面の立ち絵 ${mm.parts}（そうびの画面の絵 ${ui ? ui.head : '—'}・装備 ${JSON.stringify(mm.equip)}）`);
    if (cx) S(cx.same && cx.invSame && cx.back && cx.head0 === cx.head1, `［${name}］キャンセル（［そうび］→ ${opt.cancel} → 品の一覧で Esc）→ 装備・所持数・絵が変わらない（${cx.before}・そうびの画面の絵 ${cx.head1}）`);
    if (bt) {
      const x = bt.hero, v = bt.victory && bt.victory.hero;
      S(x && /dir:back/.test(x.model || '') && !!x.ea && !bt.fell.length && bt.px && bt.px.sig === x.ea && (!opt.back || bt.px.parts === opt.back), `［${name}］そのまま戦闘 → 背面に合成（${x && x.model}）。戦闘の絵と同じ合成の印の部品 ${bt.px && bt.px.parts}`);
      S(v && /dir:front/.test(v.model || '') && bt.vpx && bt.vpx.sig === v.ea && (!opt.parts || bt.vpx.parts === opt.parts), `［${name}］勝利の振り向き → 正面にも同じ装備を合成（${v && v.model}・部品 ${bt.vpx && bt.vpx.parts}）`);
      const cv = bt.cover && bt.cover.hero; S(!!cv && bt.panel && / rs-top/.test(bt.panel.cls) && cv.headCovered === 0 && cv.covered <= 0.03 && cv.fullCovered <= 0.03, `［${name}］勝利の結果の窓を出したまま → 人物の矩形の ${cv ? Math.round(cv.covered * 100) : '?'}% が窓に重なる（頭の上 30% は ${cv ? Math.round(cv.headCovered * 100) : '?'}%・杖の先まで ${cv ? Math.round(cv.fullCovered * 100) : '?'}%）`);
      S(m2.hero.st === 'ok' && m2.hero.parts === mm.parts && JSON.stringify(m2.hero.equip) === JSON.stringify(mm.equip) && bt.ended, `［${name}］戦闘のあとフィールドへ戻り、なかまの画面も戦闘の前と同じ（${m2.hero.parts}）。戦闘の大きさ：背面 ${bt.rects && bt.rects.hero ? bt.rects.hero.w + '×' + bt.rects.hero.h : '?'}・勝利の正面 ${bt.vrects && bt.vrects.hero ? bt.vrects.hero.w + '×' + bt.vrects.hero.h : '?'}（CSS の画素）`);
    }
    return rec[key];
  };
  // 一覧から確定：直前のプレビュー → 転職する → なかまの画面
  const confirmFromList = async (job) => {
    const i0 = await inv(), e0 = await eqNow(); await openJobList(); const pv = await look(job);
    await p.screenshot({ path: `${OUT}shots/jobprev_mage_${VIEW}_confirm_${job}.jpg`, type: 'jpeg', quality: 80 });
    await pick(/の転職先/, new RegExp('^' + JOBN[job])); await pick(/に転職する？/, /^転職する/); await p.waitForTimeout(500); await leaveGuild();
    const i1 = await inv(), e1 = await eqNow(), job1 = await p.evaluate(() => State.data.hero.job); const m = await partyParts();
    const off = Object.keys(e0).filter((s) => e0[s] && !e1[s]).map((s) => e0[s]); const keep = Object.keys(e0).filter((s) => e0[s] && e1[s] === e0[s]).map((s) => e0[s]);
    const invOk = off.every((id) => N(i1, id) === N(i0, id) + 1) && keep.every((id) => N(i1, id) === N(i0, id));
    return { pv, m, off, keep, invOk, job: job1, e0, e1 };
  };
  // ---- 1 戦士：鉄の鎧＋鋼の剣 ----
  await scene('w0', '戦士：鉄の鎧＋鋼の剣', { armor: 'iron_armor', weapon: 'steel_sword' }, { battle: true, parts: 'base_plain armor_shape_f weapon_sword' });
  // ---- 2 戦士 → 魔法使いのプレビュー（切り替え・キャンセル・やめる）----
  await p.evaluate(() => State.save(1)); const s0 = await snap();
  await openJobList();
  const pM = await look('mage'); await p.screenshot({ path: `${OUT}shots/jobprev_mage_${VIEW}_warrior.jpg`, type: 'jpeg', quality: 80 });
  const pH = await look('hunter'); const pT = await look('thief'); const pM2 = await look('mage'); const s1 = await snap();
  const PM0 = 'base_plain outfit_mage outfit_mage_o';
  S(pM.has && pM.st === 'ok' && pM.job === 'mage' && pM.parts === PM0 && pM.offIds === 'steel_sword,iron_armor' && /鋼の剣/.test(pM.offText) && /鉄の鎧/.test(pM.offText) && pM.inView, `戦士 → 魔法使いのプレビュー：主人公本人の魔法使いの姿（${pM.parts}）。鉄の鎧・鋼の剣は外れ、名前が出る（「${pM.offText}」）。絵は一覧の中に収まる（高さ ${pM.h}px）`);
  S(pH.parts === 'base_plain outfit_hunter' && pT.parts === 'base_plain outfit_thief weapon_sword' && pM2.sig === pM.sig && pM2.parts === pM.parts && s1 === s0, `候補を切り替えても（魔法使い → 狩人 → 盗賊 → 魔法使い）、同じ候補は同じプレビュー。職業・装備・所持数・所持金・セーブの中身は変わらない`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await leaveGuild(); const s2 = await snap();
  S(s2 === s0, '一覧をキャンセル（Esc）してギルドを出ても、職業・装備・所持数・所持金・セーブの中身は変わらない');
  await openJobList(); await look('mage'); await pick(/の転職先/, /^魔法使い/); await pick(/に転職する？/, /^やめる/); await leaveGuild(); const s3 = await snap();
  S(s3 === s0, '魔法使いを選んで、確かめの選択肢で「やめる」→ 何も変わらない');
  rec.prevWarrior = { pM, pH, pT, pM2 };
  // ---- 3 狩人に転職・短弓 ----
  const jh = await guildChange('hunter');
  await scene('h1', '狩人：短弓', { weapon: 'short_bow' }, { battle: true, parts: 'base_plain outfit_hunter weapon_bow hand' });
  const s4 = await snap(); await openJobList(); const pHM = await look('mage'); await p.screenshot({ path: `${OUT}shots/jobprev_mage_${VIEW}_hunter.jpg`, type: 'jpeg', quality: 80 }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await leaveGuild(); const s5 = await snap();
  S(pHM.parts === PM0 && pHM.offIds === 'short_bow' && /短弓/.test(pHM.offText) && s5 === s4, `狩人（短弓）→ 魔法使いのプレビュー：弓は魔法使いが装備できないので外れる（${pHM.parts}・「${pHM.offText}」）。見ただけでは何も変わらない`);
  // ---- 4 盗賊に転職・短剣＋革の鎧 ----
  const jt = await guildChange('thief');
  await scene('t1', '盗賊：短剣＋革の鎧', { weapon: 'dagger', armor: 'leather_armor' }, { battle: true, has: ['outfit_thief', 'weapon_dagger', 'hand'] });
  // ---- 5 盗賊 → 魔法使い：短剣は持ち越す・革の鎧は外れる。一覧から確定 → なかま＝直前のプレビュー ----
  const PMD = 'base_plain outfit_mage weapon_dagger hand outfit_mage_o';
  const c1 = await confirmFromList('mage');
  S(c1.pv.parts === PMD && c1.pv.offIds === 'leather_armor' && c1.pv.keepIds === 'dagger' && /革の鎧/.test(c1.pv.offText) && /短剣/.test(c1.pv.keepText), `盗賊（短剣＋革の鎧）→ 魔法使いのプレビュー：短剣は持ち越し（${c1.pv.parts}）、革の鎧は外れる（「${c1.pv.offText}」「${c1.pv.keepText}」）`);
  S(c1.job === 'mage' && c1.off.join() === 'leather_armor' && c1.keep.join() === 'dagger' && c1.invOk && c1.m.st === 'ok' && c1.m.parts === c1.pv.parts, `確定：革の鎧だけ外れて持ち物に戻り（所持数 +1）、短剣は装備したまま（所持数そのまま）。「なかま」の画面の外見（${c1.m.parts}）＝直前のプレビュー（${c1.pv.parts}）`);
  rec.confirm = { c1: { pv: c1.pv, m: c1.m.parts, off: c1.off, keep: c1.keep, e0: c1.e0, e1: c1.e1 }, jh: jh.off, jt: jt.off, pHM };
  // ---- 6 魔法使い：樫の杖（キャンセルも）→ 戦闘 → 杖をはずす → 戦闘 ----
  const i6 = await inv();
  const PMS = 'base_plain outfit_mage weapon_staff_t weapon_staff_f hand outfit_mage_o';
  await scene('m1', '魔法使い：樫の杖', { weapon: 'oak_staff' }, { battle: true, cancel: '武器', parts: PMS, back: 'base_plain outfit_mage_x outfit_mage weapon_staff_t weapon_staff_f hand outfit_mage_o' });
  const i7 = await inv(); S(N(i7, 'oak_staff') === N(i6, 'oak_staff') - 1 && N(i7, 'dagger') === N(i6, 'dagger') + 1, `杖に持ち替え：樫の杖の所持数 ${N(i6, 'oak_staff')} → ${N(i7, 'oak_staff')}・短剣 ${N(i6, 'dagger')} → ${N(i7, 'dagger')}（持ち替えた短剣は持ち物に戻る）`);
  await scene('m2', '魔法使い：杖をはずす（装備なし）', { weapon: null }, { battle: true, parts: PM0, back: 'base_plain outfit_mage_x outfit_mage outfit_mage_o' });
  const i8 = await inv(); S(N(i8, 'oak_staff') === N(i7, 'oak_staff') + 1, `杖をはずす：樫の杖は持ち物に戻る（所持数 ${N(i7, 'oak_staff')} → ${N(i8, 'oak_staff')}）`);
  const B = (k) => rec[k].battle; const hasP = (s, k) => (' ' + (s || '') + ' ').indexOf(' ' + k + ' ') >= 0;
  S(['weapon_staff_t', 'weapon_staff_f', 'hand'].every((k) => hasP(B('m1').px.parts, k) && hasP(B('m1').vpx.parts, k) && hasP(rec.m1.menu.hero.parts, k)) && ['weapon_staff_t', 'weapon_staff_f', 'hand'].every((k) => !hasP(B('m2').px.parts, k) && !hasP(B('m2').vpx.parts, k) && !hasP(rec.m2.menu.hero.parts, k) && !hasP(rec.m2.ui.head, k)), '杖は 3 つの向き（メニュー正面・戦闘背面・勝利正面）に出て、はずすと 3 つの向きとそうびの画面の絵から消える（袖・ローブはそのまま）');
  S(['m1', 'm2'].every((k) => B(k).px.parts.split(' ').pop() === 'outfit_mage_o' && B(k).vpx.parts.split(' ').pop() === 'outfit_mage_o'), '重なりの順：袖（outfit_mage_o）は杖・握りの拳より手前に描く（正面・背面とも最後の層）');
  // 戦闘の大きさ・足もとが職業・装備で変わらない
  const ks = ['w0', 'h1', 't1', 'm1', 'm2']; const bs = ks.map((k) => B(k).hero && B(k).hero.size); const vs = ks.map((k) => B(k).victory && B(k).victory.hero && B(k).victory.hero.size);
  S(bs.every((z) => z && z.w === bs[0].w && z.h === bs[0].h) && vs.every((z) => z && z.w === vs[0].w && z.h === vs[0].h), `戦闘の背面・勝利の正面の範囲が職業・装備で同じ（背面 ${bs.map((z) => z && z.w + '×' + z.h).join(' ')}／正面 ${vs.map((z) => z && z.w + '×' + z.h).join(' ')}）`);
  const ms = ks.map((k) => rec[k].menu.hero); const near = (a, b, t) => Math.abs(a - b) <= t;
  S(ms.every((m) => m.rect && near(m.rect.bottom, ms[0].rect.bottom, 1) && near(m.rect.cx, ms[0].rect.cx, 1) && near(m.px, ms[0].px, 0.005)) && ms.every((m) => m.clip && !Object.values(m.clip).some(Boolean) && !m.ov), `メニューの足もと・左右の中心・1 ドットの大きさが職業で同じ（下辺 ${ms[0].rect.bottom}・1 ドット ${ms[0].px}px）。杖の先まで見切れない`);
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  S(bad.length === 0, '読み込みの失敗なし' + (bad.length ? '：' + bad.slice(0, 4).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/ui_mage_${VIEW}.json`, JSON.stringify({ VIEW, isPhone, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 pixel ui mage ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch(async (e) => {
  console.error('FAIL', e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e);
  try { await PG.screenshot({ path: `${OUT}shots/ui_${VIEW}_mg_error.jpg`, type: 'jpeg', quality: 70 }); console.error('UI', await PG.evaluate(() => [...document.querySelectorAll('#ui > *')].map((n) => n.className + ':' + (n.textContent || '').slice(0, 120)).join(' | '))); } catch (e2) { }
  process.exit(2);
});
