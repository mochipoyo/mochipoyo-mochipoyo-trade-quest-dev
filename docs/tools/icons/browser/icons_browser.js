// v9.5 装備・道具・オーパーツの絵：ブラウザの確かめ（ヘッドレス Chromium。実機ではない。GPU なしのソフトウェア描画）
//   KIND=2d|3d  VIEW=pc|m360|land  PORT=…  OUT=…（記録 logs/icons_<KIND>_<VIEW>.json・画面写真 shots/icons_*.jpg）
//   1 起動時に絵を読まない  2 どうぐ（60 種・長い名前・スクロール・キー・クリック／タップ・詳細の大きい絵・行の位置が跳ねない・遅延読み込み）
//   3 そうび（装備済みの枠・候補・比較・戻る）  4 店（無効の行・詳細の絵）  5 戦闘の「どうぐ」と結果の落とし物  6 オーパーツ・アイテム図鑑（未取得は出さない）
//   7 WebP を 1 枚止める → PNG。WebP と PNG を両方止める →「？」でも文字と操作が残る  8 所持品なし  9 コンソールのエラー・思いがけない 404
//   3D：この作業環境では 3D を描きながらの操作がとても遅いため、メニューの操作の間は 3D の描画を止める（画面の処理は 2D と同じ。地図の上の表示は止めない）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8870; const KIND = process.env.KIND || '2d'; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/icons/';
const URL0 = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const TO = KIND === '3d' ? 120000 : 30000;
const VP = { pc: { viewport: { width: 1280, height: 720 } }, m360: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, land: { viewport: { width: 740, height: 360 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }[VIEW];
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch(); const ctx = await br.newContext(VP); const p = await ctx.newPage();
  const errs = [], cons = [], bad = [], iconReq = []; let phase = 'boot';
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 200)); });
  p.on('response', (r) => { const u = r.url(); if (u.indexOf('localhost:' + PORT) >= 0 && r.status() >= 400) bad.push(r.status() + ' ' + u.replace(/^.*localhost:\d+/, '')); });
  p.on('request', (r) => { const u = r.url(); if (/\/assets\/item-icons\//.test(u)) iconReq.push({ phase, u: u.replace(/^.*\/assets\/item-icons\//, '') }); });
  // 7 の確かめ用：potion の WebP（一覧・詳細）だけ止める。porkbits_don は WebP も PNG も止める
  await ctx.route(/\/assets\/item-icons\/webp(128|256)\/potion\.webp/, (r) => r.abort());
  await ctx.route(/\/assets\/item-icons\/(webp128|webp256|png256)\/porkbits_don\./, (r) => r.abort());
  const shot = (n) => p.screenshot({ path: `${OUT}shots/icons_${KIND}_${VIEW}_${n}.jpg`, type: 'jpeg', quality: 74, timeout: TO });
  const tapEl = async (h) => { try { await h.evaluate((el) => el.scrollIntoView({ block: 'nearest' })); await p.waitForTimeout(150); } catch (e) { } const b = await h.boundingBox(); if (!b) return false; if (VIEW === 'pc') await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); else await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(150); return true; };
  const top = () => p.evaluateHandle(() => [...document.querySelectorAll('#ui .rw-list, #ui .rw-choice, #ui .rw-panel')].pop());
  const clean = () => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
  const pause3d = (on) => KIND === '3d' ? p.evaluate((v) => { MTQ3D.paused = v; }, on) : Promise.resolve();
  const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(250); };
  await p.goto(URL0);
  if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  // 遊べる状態：60 種の持ち物（素材の対応表にある ID から、種類ごとに選ぶ。名前の長いもの・絵のない礼の品も入れる）
  const setup = await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true; d.gold = 300;
    ['lina', 'kyle'].forEach((id) => State.joinCompanion(id));
    const E = ITEM_ICON_MANIFEST.entries; const want = ['wooden_sword', 'steel_sword', 'dow_greatsword_2', 'stoploss_shield', 'leather_cap', 'ring_power', 'b19_unsmiling_aegis', 'potion', 'bread_baguette', 'porkbits_don', 'forest_key', 'qm_trophy_001', 'explorer_ring'];
    const drink = Object.keys(ITEMS).filter((id) => ITEMS[id].cat === 'consumable' && ITEMS[id].effect && ITEMS[id].effect.mp && E[id])[0]; if (drink) want.push(drink);
    const longest = Object.keys(ITEMS).filter((id) => E[id]).sort((a, b) => ITEMS[b].name.length - ITEMS[a].name.length)[0]; want.push(longest);
    const pool = Object.keys(ITEMS).filter((id) => E[id] && want.indexOf(id) < 0 && ITEMS[id].cat !== 'key');
    for (let i = 0; want.length < 60 && i < pool.length; i += 7) want.push(pool[i]);
    want.forEach((id) => { if (ITEMS[id]) State.addItem(id, 2); });
    World.start(); return { n: want.filter((id) => ITEMS[id]).length, drink, longest, longName: ITEMS[longest].name };
  });
  if (KIND === '3d') await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 });
  await p.waitForFunction(() => window.World && World.map, null, { timeout: 120000 }); await p.waitForTimeout(1500); await clean();
  S(iconReq.length === 0 && (await p.evaluate(() => document.querySelectorAll('img.tqi-img').length)) === 0, '1 起動して地図に出るまで、絵の読み込みは 0 件（全部を最初に読まない）');
  // 2 どうぐ
  phase = 'items'; await pause3d(true);
  p.evaluate(() => Menu.items({})); await p.waitForSelector('#ui .items-menu .rw-item.has-icon', { timeout: TO });
  await p.waitForTimeout(600);
  const s2 = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .items-menu')].pop(); const rows = [...L.querySelectorAll('.rw-item')]; const box = L.querySelector('.rw-items');
    return { rows: rows.length, icons: rows.filter((r) => r.classList.contains('has-icon')).length, w: Math.round(rows[0].querySelector('.tqi').getBoundingClientRect().width), over: rows.filter((r) => r.scrollWidth > r.clientWidth + 1).length, page: document.documentElement.scrollWidth <= innerWidth + 1, scrollH: box.scrollHeight, clientH: box.clientHeight, rects: rows.map((r) => Math.round(r.getBoundingClientRect().top) + ':' + Math.round(r.getBoundingClientRect().height)).join(',') }; });
  const loaded1 = iconReq.filter((x) => x.phase === 'items' && /^webp128\//.test(x.u)).length;
  S(s2.rows >= 50 && s2.icons === s2.rows && s2.w >= 44 && s2.w <= 56, '2 どうぐ：' + s2.rows + ' 行すべてに絵（一覧の絵 ' + s2.w + 'px）');
  S(s2.scrollH > s2.clientH * 1.5 && loaded1 < s2.rows, '2 長い一覧はスクロール。開いた時点で読んだ一覧の絵は ' + loaded1 + ' 枚（' + s2.rows + ' 行のうち見える近くだけ＝遅延読み込み）');
  S(s2.over === 0 && s2.page, '2 長い名前（' + setup.longName + '）でも行からはみ出さない・画面が横に広がらない');
  await shot('1_items');
  await p.waitForTimeout(1500);
  const rects2 = await p.evaluate(() => [...[...document.querySelectorAll('#ui .items-menu')].pop().querySelectorAll('.rw-item')].map((r) => Math.round(r.getBoundingClientRect().top) + ':' + Math.round(r.getBoundingClientRect().height)).join(','));
  S(rects2 === s2.rects, '2 絵が読み込まれても、行の位置・高さは変わらない（跳ねない）');
  for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(120); }
  const k2 = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .items-menu')].pop(); const cur = L.querySelector('.rw-item.cur'); const info = L.querySelector('.rw-info'); const big = info && info.querySelector('.ia-art .tqi'); return { i: cur && +cur.getAttribute('data-i'), name: cur && cur.querySelector('.l').textContent, info: info && info.textContent, big: big && Math.round(big.getBoundingClientRect().width), src: big && big.querySelector('img') && big.querySelector('img').getAttribute('src') }; });
  S(k2.i === 6 && k2.info && k2.info.indexOf(k2.name.replace(/^★\s*/, '')) >= 0 && /webp256/.test(k2.src || ''), '2 キーで 6 行下へ：カーソルと詳細が移り、詳細に大きい絵（webp256）');
  S(VIEW === 'pc' ? k2.big >= 144 && k2.big <= 160 : k2.big >= 96 && k2.big <= 120, '2 詳細の絵の大きさ ' + k2.big + 'px（PC 144〜160／スマホ 96〜120）');
  const kb = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .items-menu')].pop(); const c = L.querySelector('.rw-item.cur'); const b = L.querySelector('.rw-items'); const r = c.getBoundingClientRect(), rb = b.getBoundingClientRect(); return r.top >= rb.top - 1 && r.bottom <= rb.bottom + 1; });
  S(kb, '2 キーで動かしたカーソルの行は、一覧の見える範囲にある');
  // クリック／タップ：詳細の一覧は 1 回目で選ぶだけ
  const row9 = await p.evaluateHandle(() => [...document.querySelectorAll('#ui .items-menu')].pop().querySelectorAll('.rw-item')[9]); await tapEl(row9);
  const t2 = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .items-menu')].pop(); return { cur: +L.querySelector('.rw-item.cur').getAttribute('data-i'), open: !!L.parentNode }; });
  S(t2.cur === 9 && t2.open, '2 ' + (VIEW === 'pc' ? 'クリック' : 'タップ') + 'で 10 行目を選ぶ（絵の上でも行全体が反応。1 回目は選ぶだけ）');
  // 7 PNG の代わり・両方失敗
  const fb = await p.evaluate(async () => {
    const L = [...document.querySelectorAll('#ui .items-menu')].pop(); const rows = [...L.querySelectorAll('.rw-item')];
    const ri = (id) => rows.findIndex((r) => r.querySelector('[data-item-icon="' + id + '"]'));
    const a = rows[ri('potion')], b = rows[ri('porkbits_don')]; a.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 1500)); b.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 2000));
    const ia = a.querySelector('img'), ib = b.querySelector('img');
    return { aSrc: ia.currentSrc || ia.src, aW: ia.naturalWidth, aTried: ia.hasAttribute('data-png-tried'), bHidden: ib.hidden, bMissing: b.querySelector('.tqi').classList.contains('tqi--missing'), bQ: !b.querySelector('.tqi-fallback').hidden, bLabel: b.querySelector('.l').textContent, bi: ri('porkbits_don') };
  });
  S(/png256\/potion\.png/.test(fb.aSrc) && fb.aW === 256 && fb.aTried, '7 WebP を止めたポーション：PNG（256px）に切り替わって表示');
  S(fb.bHidden && fb.bMissing && fb.bQ && /ポークビッツ丼/.test(fb.bLabel), '7 WebP も PNG も止めたポークビッツ丼：「？」の枠になり、名前はそのまま');
  const rowB = await p.evaluateHandle((i) => [...document.querySelectorAll('#ui .items-menu')].pop().querySelectorAll('.rw-item')[i], fb.bi); await tapEl(rowB);
  const sb = await p.evaluate((i) => { const L = [...document.querySelectorAll('#ui .items-menu')].pop(); const info = L.querySelector('.rw-info'); return { cur: +L.querySelector('.rw-item.cur').getAttribute('data-i') === i, info: info.textContent.indexOf('ポークビッツ丼') >= 0, q: !!info.querySelector('.tqi--missing') }; }, fb.bi);
  S(sb.cur && sb.info, '7 絵が出なくても、その行を選べて詳細が出る（詳細の大きい絵も「？」' + (sb.q ? '' : 'になる前') + '）');
  await shot('2_fallback');
  // 詳細の大きい絵：読み込んで表示（ボス固有・鍵・クイズ報酬・パン・飲み物）
  const sampleIds = ['b19_unsmiling_aegis', 'forest_key', 'qm_trophy_001', 'bread_baguette', setup.drink, 'dow_greatsword_2', 'leather_cap', 'ring_power', 'stoploss_shield'].filter(Boolean);
  const samp = [];
  for (const id of sampleIds) {
    const i = await p.evaluate((id) => [...[...document.querySelectorAll('#ui .items-menu')].pop().querySelectorAll('.rw-item')].findIndex((r) => r.querySelector('[data-item-icon="' + id + '"]')), id);
    if (i < 0) { samp.push(id + ':行なし'); continue; }
    const h = await p.evaluateHandle((i) => [...document.querySelectorAll('#ui .items-menu')].pop().querySelectorAll('.rw-item')[i], i); await tapEl(h); await p.waitForTimeout(700);
    const r = await p.evaluate((id) => { const info = [...document.querySelectorAll('#ui .items-menu')].pop().querySelector('.rw-info'); const im = info.querySelector('.ia-art [data-item-icon="' + id + '"] img'); return im && im.complete && im.naturalWidth === 256 ? 'ok' : 'ng'; }, id);
    samp.push(id + ':' + r);
  }
  S(samp.every((x) => /:ok$/.test(x)), '2 詳細の大きい絵が読み込まれる：' + samp.join(' '));
  await shot('3_detail_boss');
  await esc(); await p.waitForTimeout(300); const closed = await p.evaluate(() => !document.querySelector('#ui .items-menu')); S(closed, '2 Esc で閉じる（戻る）');
  await clean();
  // 8 所持品なし
  const inv0 = await p.evaluate(() => JSON.stringify(State.data.inventory));
  p.evaluate(() => { window.__keepInv = State.data.inventory; State.data.inventory = {}; Menu.items({}); }); await p.waitForSelector('#ui .items-menu', { timeout: TO });
  const e8 = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .items-menu')].pop(); return { n: L.querySelectorAll('.rw-item').length, icons: L.querySelectorAll('.tqi').length, t: L.querySelector('.rw-item').textContent }; });
  S(e8.n === 1 && e8.icons === 0 && /持ち物はない/.test(e8.t), '8 所持品なし：「持ち物はない」の 1 行（絵なし）');
  await esc(); await clean(); await p.evaluate(() => { State.data.inventory = window.__keepInv; });
  // 3 そうび
  phase = 'equip';
  p.evaluate(() => { const a = State.partyActors()[0]; Services.equipItem(a, 'wooden_sword'); Menu.equip(a); }); await p.waitForSelector('#ui .equip-menu', { timeout: TO });
  const s3 = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .equip-menu')].pop(); const rows = [...L.querySelectorAll('.rw-item')]; return rows.map((r) => r.querySelector('.tqi') ? r.querySelector('.tqi').getAttribute('data-item-icon') : '-').join(','); });
  S(/^wooden_sword,-,-,-,-,-$/.test(s3), '3 そうび：装備している武器の枠だけ絵（' + s3 + '）');
  await p.keyboard.press('Enter'); await p.waitForSelector('#ui .eq-list', { timeout: TO }); await p.waitForTimeout(500);
  for (let i = 0; i < 2; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); }
  await p.waitForTimeout(900);
  const s3b = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .eq-list')].pop(); const rows = [...L.querySelectorAll('.rw-item')]; const info = L.querySelector('.rw-info'); const arts = [...info.querySelectorAll('.eq-arts [data-item-icon]')].map((x) => x.getAttribute('data-item-icon')); const hz = rows.filter((r) => r.querySelector('.l') && r.querySelector('.l').textContent === 'はずす')[0];
    const ib = info.getBoundingClientRect(), chg = info.querySelector('.eq-arts .eq-chg'), cb = chg ? chg.getBoundingClientRect() : null;
    return { rows: rows.length, icons: rows.filter((r) => r.querySelector('.tqi')).length, hz: !!hz && !hz.querySelector('.tqi'), arts, tbl: !!info.querySelector('.eq-tbl'), big: Math.round((info.querySelector('.eq-arts .ia-art .tqi') || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width), chg: chg ? chg.textContent : '', chgSeen: !!cb && cb.top >= ib.top - 1 && cb.bottom <= ib.bottom + 1 && cb.right <= ib.right + 1 }; });
  S(s3b.icons === s3b.rows - 1 && s3b.hz && s3b.arts[0] === 'dow_greatsword_2' && s3b.arts[1] === 'wooden_sword' && s3b.arts.length === 2 && s3b.tbl, '3 候補：武器に絵・「はずす」は絵なし。比較は 変更先の大きい絵（' + s3b.big + 'px）の隣に名前・いまの装備の小さい絵（' + s3b.arts.join('／いま ') + '）・変わる能力。能力の表はそのまま');
  S(s3b.chgSeen && /攻撃 ▲\+/.test(s3b.chg), '3 変わる能力（' + s3b.chg + '）は、開いたままの詳細欄の中に見える（スクロールしなくてよい）');
  await shot('4_equip_compare');
  await esc(); const back3 = await p.evaluate(() => !!document.querySelector('#ui .equip-menu') && !document.querySelector('#ui .eq-list')); S(back3, '3 Esc で枠の一覧に戻る');
  await esc(); await clean();
  // 4 店（お金が足りない行は無効のまま）
  phase = 'shop';
  p.evaluate(() => { State.data.gold = 100; Services.shop('weapon', ['wooden_sword', 'steel_sword', 'copper_sword']); }); await p.waitForSelector('#ui .rw-choice', { timeout: TO }); await p.keyboard.press('Enter');
  await p.waitForSelector('#ui .rw-list.rw-preview .rw-item.has-icon', { timeout: TO }); await p.waitForTimeout(800);
  const s4 = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .rw-list')].pop(); const rows = [...L.querySelectorAll('.rw-item')]; return { icons: rows.filter((r) => r.querySelector('.tqi')).length, dis: rows.filter((r) => r.classList.contains('disabled')).map((r) => r.querySelector('.tqi').getAttribute('data-item-icon')).join(','), price: rows.map((r) => r.querySelector('.r').textContent).join(','), art: !!L.querySelector('.rw-info .ia-art [data-item-icon]') }; });
  S(s4.icons === 3 && /steel_sword/.test(s4.dis) && /G/.test(s4.price) && s4.art, '4 店：3 行に絵・値段（' + s4.price + '）・買えない行は無効のまま（' + s4.dis + '）・詳細に絵');
  await shot('5_shop');
  const gold4 = await p.evaluate(() => State.data.gold); const dis = await p.evaluateHandle(() => [...[...document.querySelectorAll('#ui .rw-list')].pop().querySelectorAll('.rw-item.disabled')][0]); await tapEl(dis); await tapEl(dis);
  const s4b = await p.evaluate(() => ({ gold: State.data.gold, choice: !!document.querySelector('#ui .rw-choice .rw-opt') && [...document.querySelectorAll('#ui .rw-choice')].pop().textContent }));
  S(s4b.gold === gold4 && !/いくつ買う/.test(s4b.choice || ''), '4 無効の行（お金が足りない）を 2 回押しても買えない（今までどおり）');
  await esc(); await p.waitForTimeout(200); await esc(); await p.waitForTimeout(300); await clean();
  // 6 オーパーツ・アイテム図鑑
  phase = 'ooparts';
  await p.evaluate(() => { const O = Ooparts; const all = O.list().filter(O.placed); [0, 1, 2].forEach((i) => { if (O.mark) O.mark(all[i].id); else O.state().found[all[i].id] = 1; }); OopartsUI.list(); });
  await p.waitForSelector('#ui .op-panel', { timeout: TO }); await p.waitForTimeout(800);
  const s6 = await p.evaluate(() => { const P = [...document.querySelectorAll('#ui .op-panel')].pop(); const got = [...P.querySelectorAll('.op-row.got')]; const no = [...P.querySelectorAll('.op-row:not(.got)')]; return { got: got.length, gotIcons: got.filter((r) => r.querySelector('.tqi')).length, noIcons: no.filter((r) => r.querySelector('.tqi')).length, no: no.length, loaded: got.every((r) => { const im = r.querySelector('img'); return im && im.complete && im.naturalWidth > 0; }) }; });
  S(s6.got === 3 && s6.gotIcons === 3 && s6.noIcons === 0 && s6.loaded, '6 オーパーツ：見つけた 3 つだけ絵（読み込み済み）、まだの ' + s6.no + ' 件は絵なし');
  await shot('6_ooparts'); await esc(); await clean();
  p.evaluate(() => { Win.list(ITEM_LIST.slice(0, 40).map((id, i) => i % 3 ? { label: '？？？', disabled: true, sub: '未入手' } : { label: ITEMS[id].name, itemId: id }), { title: 'アイテム図鑑' }); });   // 図鑑と同じ行の作り（知っている行だけ itemId）
  await p.waitForSelector('#ui .rw-list .rw-item', { timeout: TO }); await p.waitForTimeout(500);
  const s6b = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .rw-list')].pop(); const un = [...L.querySelectorAll('.rw-item.disabled')]; return { un: un.length, unIcon: un.filter((r) => r.querySelector('.tqi')).length, pad: Math.round(parseFloat(getComputedStyle(un[0]).paddingLeft)) }; });
  S(s6b.un > 0 && s6b.unIcon === 0, '6 図鑑の「？？？」（未入手）の行には絵を出さない（名前の位置だけそろえる：左の余白 ' + s6b.pad + 'px）');
  await esc(); await clean();
  // 5 戦闘：どうぐ・結果の落とし物
  phase = 'battle';
  const en = await p.evaluate(() => Object.keys(ENEMIES).filter((k) => { const e = ENEMIES[k]; return e.drops && e.drops.length && e.hp < 60 && !e.boss && !e.flee && ITEMS[e.drops[0].id || e.drops[0].item || e.drops[0]]; })[0]);
  // 確かめのためだけに：この敵の落とし物を必ず落とす（戦闘の前に一時的に。終わったら戻す）・勝ったときにレベルが上がる（結果の画面を、落とし物の行がある形にする）
  await p.evaluate((id) => { const d = State.data; window.__dr = ENEMIES[id].drops; ENEMIES[id].drops = ENEMIES[id].drops.map((x) => Object.assign({}, x, { rate: 1 })); [d.hero].concat(Object.values(d.companions || {})).forEach((a) => { if (a && a.level) a.exp = Actors.expForLevel(a.level) - 1; }); d.settings.autoBattle = false; d.settings.battleSpeed = 'veryfast'; window.__bt = BattleUI.start([id], {}).then((r) => { window.__btRes = r; }); }, en);
  await p.waitForSelector('#ui .cmd-list', { timeout: 60000 }); await p.waitForTimeout(400);
  const it = await p.evaluateHandle(() => [...[...document.querySelectorAll('#ui .cmd-list')].pop().querySelectorAll('.rw-item')].filter((r) => /どうぐ/.test(r.textContent))[0]); await tapEl(it);
  await p.waitForFunction(() => [...document.querySelectorAll('#ui .rw-list .rw-title')].some((t) => t.textContent === 'どうぐ'), null, { timeout: TO }); await p.waitForTimeout(600);
  const s5 = await p.evaluate(() => { const L = [...document.querySelectorAll('#ui .rw-list')].pop(); const rows = [...L.querySelectorAll('.rw-item')]; const ids = rows.map((r) => r.querySelector('.tqi') && r.querySelector('.tqi').getAttribute('data-item-icon')); const inv = State.data.inventory; const want = Object.keys(inv).filter((id) => ITEMS[id] && ITEMS[id].cat === 'consumable' && !ITEMS[id].fieldOnly && !ITEMS[id].growItem); return { n: rows.length, ok: ids.every((id) => id && want.indexOf(id) >= 0) && rows.length === want.length }; });
  S(s5.ok, '5 戦闘の「どうぐ」：戦闘で使える道具 ' + s5.n + ' 行だけ・すべてに絵（使えない道具は増えていない）');
  await shot('7_battle_items');
  await esc(); await p.waitForSelector('#ui .cmd-list', { timeout: TO });
  await p.evaluate(() => { BattleUI.battle.enemies.forEach((e) => { e.hp = 1; }); State.data.settings.autoBattle = true; });
  await p.keyboard.press('Enter');   // たたかう（このあとは自動戦闘）
  let fin = false; for (let i = 0; i < 120 && !fin; i++) { await p.waitForTimeout(400); fin = await p.evaluate(() => !!document.querySelector('#ui .rs-items') || !!window.__btRes); if (fin) break; const st = await p.evaluate(() => ({ sel: !!document.querySelector('#ui .rw-list .rw-item.cur'), msg: !!document.querySelector('#ui .rw-msg') })); if (st.sel || st.msg) await p.keyboard.press('Enter'); }
  await p.evaluate((id) => { if (window.__dr) ENEMIES[id].drops = window.__dr; }, en);
  const s5b = await p.evaluate(() => { const R = document.querySelector('#ui .rs-items'); if (!R) return null; return [...R.querySelectorAll('.rs-item')].map((r) => (r.querySelector('.tqi') ? r.querySelector('.tqi').getAttribute('data-item-icon') : '-') + ':' + r.textContent.trim()); });
  S(s5b && s5b.length > 0 && s5b.every((x) => !/^-:/.test(x) || /なし/.test(x)), '5 戦闘の結果：落とした品の行に絵（' + (s5b ? s5b.join(' ') : '結果の画面が出なかった') + '）');
  if (s5b) { await p.evaluate(() => { const r = document.querySelector('#ui .rs-items'); if (r) r.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500); await shot('8_battle_result'); }   // 落とした品の行が写るように
  for (let i = 0; i < 20; i++) { const done = await p.evaluate(() => !!window.__btRes); if (done) break; await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
  await clean(); await pause3d(false);
  // 9 エラー
  const realBad = bad.filter((x) => !/potion|porkbits_don/.test(x));
  S(errs.length === 0, '9 ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const realCons = cons.filter((x) => !/net::ERR_FAILED|Failed to load resource/.test(x));
  S(realCons.length === 0, '9 コンソールのエラーなし（止めた画像の読み込み失敗の 1 行を除く）' + (realCons.length ? '：' + realCons.slice(0, 3).join(' / ') : ''));
  S(realBad.length === 0, '9 思いがけない 404 などはない' + (realBad.length ? '：' + realBad.slice(0, 5).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/icons_${KIND}_${VIEW}.json`, JSON.stringify({ KIND, VIEW, ok: steps.length - ng, ng, steps, iconRequests: iconReq.length, byPhase: iconReq.reduce((a, x) => { a[x.phase] = (a[x.phase] || 0) + 1; return a; }, {}), blocked: cons.length }, null, 1));
  console.log(`結果 ${KIND} ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
