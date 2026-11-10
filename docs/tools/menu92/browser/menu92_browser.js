// v9.2 メニューの使い勝手：ブラウザでの確かめ（ヘッドレス Chromium・ソフトウェア描画。自動の操作で、実機ではない）
//   KIND=2d|3d  VIEW=pc1920|pc1280|m360|m390|land  PORT=…  OUT=docs/menu92/  [BEFORE=1：変更前の版を測るだけ（窓の大きさ）]
//   1 どうぐ：持ち物の数・分類を変えても窓の大きさが同じ・詳細の欄の高さ・画面の中に収まる・操作パネルに重ならない
//   2 そうび：仲間の帯（タップ／キー）・同じ枠のまま切り替え・候補の窓の大きさが仲間で変わらない
//   3 ステータス：帯で切り替え → ［そうびを変える］→ 戻る　4 じゅもん・とくぎ：帯で切り替え　5 なかま：［そうびを変える］
//   ※ キーは 1 回ずつ間をあけて押す（1 コマ＝約 16ms の間に同じキーを 2 回押すと 1 回に数える。これは前からのゲームの入力の作り）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8795; const OUT = process.env.OUT || '/home/claude/envwork/docs/menu92/'; const VIEW = process.env.VIEW || 'm390'; const KIND = process.env.KIND || '2d'; const BEFORE = !!process.env.BEFORE;
const VPS = { pc1920: { viewport: { width: 1920, height: 1080 } }, pc1280: { viewport: { width: 1280, height: 720 } }, m360: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, m390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, land: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const VP = VPS[VIEW]; const touch = !!VP.hasTouch; const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const MIN_INFO = { pc1920: 200, pc1280: 120, m390: 150, m360: 140, land: 90 };
fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
const URL = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html'); const PREFIX = KIND === '3d' ? 'mtq-3d-slot-' : 'mtq-rpg-v2-slot-';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(VP); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
  const shot = async (name) => { await p.screenshot({ path: `${OUT}shots/${BEFORE ? 'before_' : ''}${KIND}_${VIEW}_${name}.jpg`, type: 'jpeg', quality: 72 }); };
  const ready = async () => { if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); else await p.waitForFunction(() => window.State && window.World && window.Menu, null, { timeout: 120000 }); };
  const tapEl = async (h) => { await h.scrollIntoViewIfNeeded().catch(() => { }); if (touch) await h.tap(); else await h.click(); await p.waitForTimeout(160); };
  const tap = async (sel) => { const h = await p.waitForSelector(sel, { timeout: 30000 }); await tapEl(h); };
  const item = async (label) => { const h = await p.waitForFunction((l) => [...document.querySelectorAll('#ui .rw-list:last-child .rw-item, #ui .rw-item')].reverse().find((x) => x.textContent.indexOf(l) >= 0) || null, label, { timeout: 30000 }); await tapEl(h.asElement()); };
  const chip = async (i) => { const h = await p.waitForSelector(`#ui > :last-child .rw-mem[data-m="${i}"]`, { timeout: 30000 }); await tapEl(h); };
  const reset = async () => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; if (window.MobileUI && MobileUI.syncTall) MobileUI.syncTall(); });
  // 一番上の窓の大きさ（窓・一覧・詳細）と、画面・操作パネルとの関係
  const geo = async () => p.evaluate(() => { const L = document.querySelector('#ui').lastElementChild; if (!L) return null; const g = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) }; };
    const pad = document.getElementById('pad'); let padTop = null; if (pad && document.body.classList.contains('mobile') && document.body.classList.contains('m-port')) { const rs = [...pad.querySelectorAll('*')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0); if (rs.length) padTop = Math.round(Math.min(...rs.map((r) => r.top))); }
    return { cls: L.className, win: g(L), items: g(L.querySelector('.rw-items')), info: g(L.querySelector('.rw-info')), vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, padTop, tall: document.body.classList.contains('m-tallui') }; });
  const inView = (G) => G && G.win.t >= -1 && G.win.b <= G.vh + 1 && G.win.l >= -1 && G.win.r <= G.vw + 1 && G.sw <= G.vw + 1;

  await p.goto(URL); await ready();
  await p.evaluate((pre) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id)); State.save(1); localStorage.removeItem(pre + '0'); }, PREFIX);
  await p.reload(); await ready();
  await p.waitForSelector('#ui .title-menu', { timeout: 120000 }); await item('つづきから'); await item('スロット1');
  if (KIND === '3d') { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.evaluate(() => { MTQ3D.paused = true; }); }
  await p.waitForTimeout(600); await reset();
  const party = await p.evaluate(() => State.partyActors().map((a) => a.name)); S(party.length === 4, 'つづきから：仲間 4 人（' + party.join('・') + '）');

  // ---- 1 どうぐ ----
  const sets = { one: ['herb'], many: ['herb', 'magic_water', 'antidote', 'escape_wing', 'escape_feather', 'iron_sword', 'leather_armor', 'tent', 'elixir', 'high_herb', 'echo_herb', 'holy_water', 'club', 'oak_staff'] };
  const G = {};
  for (const [k, ids] of Object.entries(sets)) {
    await reset(); await p.evaluate((ids) => { const d = State.data; d.inventory = {}; ids.forEach((id) => { if (ITEMS[id]) State.addItem(id, 2); }); window.__m = Menu.items(); }, ids);
    await p.waitForSelector('#ui .items-menu'); await p.waitForTimeout(250); G[k] = await geo(); await shot('items_' + k);
  }
  // 中身の多い装備の詳細（比較）を選ぶ・空の分類に切り替える
  await tap('#ui .items-menu .rw-tab[data-tab="0"]').catch(() => { }); await p.waitForTimeout(200);
  await item('鉄の剣'); await p.waitForTimeout(250); G.weapon = await geo(); await shot('items_weapon');
  const empty = await p.evaluate(() => { const t = [...document.querySelectorAll('#ui .items-menu .rw-tab')].find((x) => x.classList.contains('empty')); return t ? t.getAttribute('data-tab') : null; });
  if (empty !== null) { await tap(`#ui .items-menu .rw-tab[data-tab="${empty}"]`); await p.waitForTimeout(250); G.empty = await geo(); }
  const hs = Object.entries(G).filter(([, g]) => g && g.win).map(([k, g]) => k + ' ' + g.win.h);
  console.log('    どうぐの窓：' + JSON.stringify(Object.fromEntries(Object.entries(G).map(([k, g]) => [k, g && { win: g.win && g.win.h, items: g.items && g.items.h, info: g.info && g.info.h, w: g.win && g.win.w }]))));
  const sameH = Object.values(G).every((g) => g && Math.abs(g.win.h - G.one.win.h) <= 1);
  if (BEFORE) { fs.writeFileSync(`${OUT}logs/before_${KIND}_${VIEW}.json`, JSON.stringify({ G, errs }, null, 1)); S(true, '変更前の版を測った（' + hs.join('・') + '）'); await br.close(); return; }
  S(sameH, 'どうぐ：持ち物 1 個・14 個・装備を選ぶ・空の分類で窓の高さが同じ（' + hs.join('・') + '）');
  S(Object.values(G).every((g) => g.info && g.info.h >= MIN_INFO[VIEW]), 'どうぐ：詳細の欄の高さ ' + Object.values(G).map((g) => g.info && g.info.h).join('・') + 'px（目安 ' + MIN_INFO[VIEW] + 'px 以上）');
  S(Object.values(G).every((g) => Math.abs(g.info.h - G.one.info.h) <= 1), 'どうぐ：詳細の欄の高さも一定');
  S(Object.values(G).every(inView), 'どうぐ：窓は画面の中・横のはみ出しなし');
  if (G.one.padTop !== null) S(Object.values(G).every((g) => g.win.b <= g.padTop + 1) && G.one.tall, 'どうぐ（縦画面）：窓は操作パネルの上まで広がり、パネルには重ならない（窓の下 ' + G.one.win.b + ' ≤ パネルの上 ' + G.one.padTop + '）');
  if (VIEW === 'land') S(G.one.info.l > G.one.items.l + 50 && Math.abs(G.one.info.t - G.one.items.t) <= 2, '横画面：一覧（左）と詳細（右）を横に並べる');
  const weaponInfo = await p.evaluate(() => { const i = document.querySelector('#ui .items-menu .rw-info'); return i ? { sh: i.scrollHeight, ch: i.clientHeight, txt: i.textContent.slice(0, 40) } : null; });
  await reset();

  // ---- 2 そうび ----
  await p.evaluate(() => { ['iron_sword', 'club', 'leather_armor'].forEach((id) => State.addItem(id, 2)); window.__eq = Menu.equip(); }); await p.waitForSelector('#ui .rw-list .rw-item');
  await item(party[0]); await p.waitForSelector('#ui .equip-menu .rw-members');
  const mg = await p.evaluate(() => { const L = document.querySelector('#ui .equip-menu'); const els = [...L.querySelectorAll('.rw-mem.cur, .rw-mem-nav')]; const r = els.map((e) => e.getBoundingClientRect()); const ch = L.querySelector('.rw-mem-chips');
    return { minH: Math.round(Math.min(...[...L.querySelectorAll('.rw-mem, .rw-mem-nav')].map((e) => e.getBoundingClientRect().height))), inView: r.every((x) => x.right <= innerWidth + 1 && x.left >= -1), fitAll: ch.scrollWidth <= ch.clientWidth + 1, chipsW: ch.clientWidth, chipsSW: ch.scrollWidth }; });
  S(mg.minH >= (touch ? 40 : 24) && mg.inView, 'そうび：仲間の帯の名前・◀▶ の高さ ' + mg.minH + 'px（' + (touch ? 'タッチ 40px 以上' : 'マウス') + '）・今の仲間と ◀▶ が画面の中' + (mg.fitAll ? '・4 人が 1 行に入る' : '・4 人は入りきらず横へスクロール（' + mg.chipsSW + ' > ' + mg.chipsW + 'px）'));
  await shot('equip_slots');
  const title = async () => p.evaluate(() => document.querySelector('#ui').lastElementChild.querySelector('.rw-title').textContent);
  const curRow = async () => p.evaluate(() => { const c = document.querySelector('#ui').lastElementChild.querySelector('.rw-item.cur'); return c ? c.textContent : ''; });
  if (!touch) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(120); await p.keyboard.press('e'); await p.waitForTimeout(250); const t1 = await title(), r1 = await curRow(); S(new RegExp(party[1]).test(t1) && /^鎧/.test(r1), 'キーボード：↓ で鎧 → E で ' + party[1] + '（枠は鎧のまま）' + (new RegExp(party[1]).test(t1) ? '' : '［' + t1 + '／' + r1 + '］')); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250); S(new RegExp(party[2]).test(await title()), '→ で ' + party[2]); await p.keyboard.press('q'); await p.waitForTimeout(120); await p.keyboard.press('q'); await p.waitForTimeout(250); S(new RegExp(party[0]).test(await title()), 'Q Q で ' + party[0]); }
  else { await chip(1); S(new RegExp(party[1]).test(await title()), 'タップ：帯の ' + party[1] + ' で切り替え'); await tap('#ui .equip-menu .rw-mem-nav[data-mnav="1"]'); S(new RegExp(party[2]).test(await title()), '▶ で ' + party[2]); await chip(0); S(new RegExp(party[0]).test(await title()), '帯の ' + party[0] + ' で戻る'); }
  await item('武器'); await p.waitForSelector('#ui .eq-list'); const EQ = {}; EQ[0] = await geo(); await shot('equip_weapon');
  for (const i of [1, 2, 3]) { await chip(i); await p.waitForSelector('#ui .eq-list'); EQ[i] = await geo(); }
  const eqTitles = await title();
  S(Object.values(EQ).every((g) => g && g.cls.indexOf('eq-list') >= 0 && Math.abs(g.win.h - EQ[0].win.h) <= 1), 'そうびの候補：仲間を切り替えても窓の高さが同じ（' + Object.values(EQ).map((g) => g.win.h).join('・') + 'px）・同じ枠（' + eqTitles + '）');
  S(Object.values(EQ).every(inView), 'そうびの候補：画面の中');
  await chip(0); await item('鉄の剣'); await tap('#ui .eq-list .rw-ok'); await p.waitForTimeout(300);
  S(await p.evaluate(() => State.data.hero.equip.weapon === 'iron_sword' && !!document.querySelector('#ui .equip-menu')), '鉄の剣を選んで［装備する］→ 枠の一覧へ戻る');
  if (touch) await tap('#ui .equip-menu .rw-close'); else await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  S(await p.evaluate(() => !document.querySelector('#ui .equip-menu')), 'そうびを閉じる');

  // ---- 3 ステータス ----
  await reset(); await p.evaluate(() => { window.__st = Menu.status(); }); await p.waitForSelector('#ui .rw-list .rw-item'); await item(party[0]);
  await p.waitForSelector('#ui .status-panel'); const stName = async () => p.evaluate(() => (document.querySelector('#ui .status-panel .st-body .rw-title') || {}).textContent || '');
  if (!touch) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200); S(new RegExp(party[1]).test(await stName()), 'ステータス：→ で ' + party[1]); await p.keyboard.press('e'); await p.waitForTimeout(200); S(new RegExp(party[2]).test(await stName()), 'E で ' + party[2]); }
  else { await chip(1); S(new RegExp(party[1]).test(await stName()), 'ステータス：帯の ' + party[1]); await chip(2); S(new RegExp(party[2]).test(await stName()), '帯の ' + party[2]); }
  const SG = await geo(); S(inView(SG), 'ステータス：画面の中'); await shot('status');
  if (SG.padTop !== null) S(SG.tall && SG.win.b <= SG.padTop + 1, 'ステータス（縦画面）：窓は操作パネルの上まで広がり、重ならない（' + SG.win.b + ' ≤ ' + SG.padTop + '）');
  const stScroll = await p.evaluate(() => { const n = document.querySelector('#ui .status-panel'); return { sh: n.scrollHeight, ch: n.clientHeight }; });
  await tap('#ui .status-panel [data-go="equip"]'); await p.waitForSelector('#ui .equip-menu'); S(new RegExp(party[2]).test(await title()), '［そうびを変える］→ ' + party[2] + 'のそうび（選び直さない）');
  if (touch) await tap('#ui .equip-menu .rw-close'); else await p.keyboard.press('Escape'); await p.waitForSelector('#ui .status-panel'); S(new RegExp(party[2]).test(await stName()), '閉じるとステータス（' + party[2] + '）へ戻る');
  await tap('#ui .status-panel [data-go="skills"]'); await p.waitForSelector('#ui .skills-menu'); const SK = await geo(); await shot('skills');
  await chip(3); await p.waitForTimeout(200); const SK2 = await geo(); S(new RegExp(party[3]).test(await title()) && Math.abs(SK.win.h - SK2.win.h) <= 1, 'じゅもん・とくぎ：帯で ' + party[3] + '・窓の高さは同じ（' + SK.win.h + '・' + SK2.win.h + 'px）');
  S(inView(SK) && inView(SK2), 'じゅもん・とくぎ：画面の中');
  if (touch) await tap('#ui .skills-menu .rw-close'); else await p.keyboard.press('Escape'); await p.waitForSelector('#ui .status-panel');
  await tap('#ui .status-panel .rw-panel-close'); await p.waitForTimeout(300); S(await p.evaluate(() => !document.querySelector('#ui .status-panel')), 'ステータスを閉じる');

  // ---- 5 なかま ----
  await reset(); await p.evaluate(() => { window.__pt = Menu.party(); }); await p.waitForSelector('#ui .party-screen .pt-go'); await p.waitForTimeout(200);
  const PG = await geo(); await shot('party'); S(inView(PG), 'なかま：画面の中'); if (PG.padTop !== null) S(PG.tall && PG.win.b <= PG.padTop + 1, 'なかま（縦画面）：窓は操作パネルの上まで広がり、重ならない（' + PG.win.b + ' ≤ ' + PG.padTop + '）');
  await tap('#ui .party-screen .pt-go'); await p.waitForSelector('#ui .equip-menu'); S(new RegExp(party[0]).test(await title()), 'なかま：［そうびを変える］→ そうび');
  await chip(1); if (touch) await tap('#ui .equip-menu .rw-close'); else await p.keyboard.press('Escape'); await p.waitForSelector('#ui .party-screen');
  S(await p.evaluate(() => document.querySelector('#ui .party-screen .pt-row.cur').getAttribute('data-id') === 'lina'), '閉じると、なかまの画面（切り替えた仲間を選んだまま）');
  await tap('#ui .party-screen .pt-close'); await p.waitForTimeout(300);
  await reset();
  S(await p.evaluate(() => !document.body.classList.contains('m-tallui')), '窓を閉じると、縦画面の高さの広げ（m-tallui）も戻る');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const res = { KIND, VIEW, steps, items: G, weaponInfo, equip: EQ, skills: [SK, SK2], status: SG, stScroll, chips: mg, errs };
  fs.writeFileSync(`${OUT}logs/menu92_${KIND}_${VIEW}.json`, JSON.stringify(res, null, 1));
  console.log('結果：' + steps.filter((x) => x.ok).length + ' OK / ' + steps.filter((x) => !x.ok).length + ' NG');
  await br.close(); process.exit(steps.some((x) => !x.ok) ? 1 : 0);
})().catch((e) => { console.error('CRASH', e && e.stack || e); process.exit(2); });
