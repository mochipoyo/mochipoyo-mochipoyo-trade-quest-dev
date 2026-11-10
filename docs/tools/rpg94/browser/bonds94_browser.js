// v9.4 仲間の絆の確かめ（ヘッドレス Chromium。実機ではない。GPU なしのソフトウェア描画）
//   実際のクリック／タップで：メニュー → パーティ →「仲間と話す」→ 一覧（絆・思い出・新しい話・最後に選んだこと）→ リーナ →「新しい話」
//   → メニューが閉じて話が再生される（立ち絵・気持ちの動き・選択肢）→ 記録される → 3D はイベント用カメラ（MTQ3D.cine）が寄って、終わると戻る
//   →「仲間の思い出」→ リーナ → 思い出の再生（セーブの中身が変わらない）→ 話す（日常会話）→（PC だけ）宿に泊まったあとの知らせ（v9.4.1 トーストだけ）
//   KIND=2d|3d  VIEW=pc|m390|land  PORT=…  OUT=…
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8860; const KIND = process.env.KIND || '2d'; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/rpg94/';
const URL = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const TO = KIND === '3d' ? 120000 : 30000;   // 3D はソフトウェア描画で遅いので待ち時間を長く
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const VP = { pc: { viewport: { width: 1280, height: 720 } }, m390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, land: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }[VIEW];
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(VP); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const shot = (n) => p.screenshot({ path: `${OUT}shots/bonds94_${KIND}_${VIEW}_${n}.jpg`, type: 'jpeg', quality: 72, timeout: TO });
  // 画面の外・スクロールする枠の外（枠に隠れている）の行は、まず見える所へ（scrollIntoView。行の位置が窓の中でも、枠の外なら隠れているため毎回する）
  const tapEl = async (h) => { try { await h.evaluate((el) => el.scrollIntoView({ block: 'nearest' })); await p.waitForTimeout(300); } catch (e) { } const b = await h.boundingBox(); if (!b) return false; if (VIEW === 'pc') await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); else await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(220); return true; };
  const find = (sel, text) => p.waitForFunction(([s, t]) => [...document.querySelectorAll(s)].reverse().find((x) => x.offsetParent && (!t || x.textContent.indexOf(t) >= 0)) || null, [sel, text], { timeout: TO, polling: 250 }).then((h) => h.asElement());
  const item = async (text) => { const h = await find('#ui .rw-item, #ui .rw-opt', text); await tapEl(h); if (await p.evaluate((t) => { const o = [...document.querySelectorAll('#ui .rw-item.cur')].reverse()[0]; return !!(o && o.offsetParent && o.textContent.indexOf(t) >= 0 && o.closest('.rw-preview')); }, text)) await tapEl(h); };
  await p.goto(URL); if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    ['lina', 'kyle', 'mina', 'gald', 'seris'].forEach((id) => State.joinCompanion(id)); d.flags.ponta_joined = true;
    World.start();
  });
  if (KIND === '3d') await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 });
  await p.waitForFunction(() => window.World && World.map, null, { timeout: 120000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false;
    window.__cine = []; if (window.MTQ3D && MTQ3D.cine) { const c0 = MTQ3D.cine.bind(MTQ3D); MTQ3D.cine = (o) => { __cine.push(o ? { d: o.dist, p: o.pitch } : null); return c0(o); }; }
    window.__emo = new Set(); new MutationObserver(() => { document.querySelectorAll('#ui .rw-msg').forEach((m) => m.classList.forEach((c) => { if (/^emo-/.test(c)) __emo.add(c); })); }).observe(document.getElementById('ui'), { childList: true, subtree: true }); });
  const info = await p.evaluate(() => ({ map: World.map.id, kind: World.map.def.kind, safe: Bonds.safeHere(), ready: Bonds.readyEpisodes('lina').map((e) => e.id) }));
  S(info.safe && info.ready[0] === 'lina_1', '町（' + info.map + '）では話せる・リーナの新しい話は第1話（' + JSON.stringify(info) + '）');
  // メニュー → パーティ → 仲間と話す
  const MOBILE3D = KIND === '3d' && VIEW !== 'pc';   // スマホの 3D：この作業環境のソフトウェア描画ではタップが間に合わないため、メニューの操作の間だけ描画を止める（話の再生中は動かす）
  if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = true; });
  p.evaluate(() => { Menu._tab = 1; Menu.open(); });
  await item('仲間と話す');
  try { await p.waitForFunction(() => !!document.querySelector('#ui .bond-list'), null, { timeout: TO, polling: 250 }); }
  catch (e) { await shot('0_fail'); console.log('    #ui：' + await p.evaluate(() => [...document.querySelectorAll('#ui > *')].map((n) => n.className + '［' + n.textContent.slice(0, 80) + '］').join(' / '))); throw e; }
  const lst = await p.evaluate(() => { const n = document.querySelector('#ui .bond-list'); return { rows: [...n.querySelectorAll('.rw-item')].map((x) => x.textContent), info: (n.querySelector('.rw-info') || {}).textContent || '', img: !!n.querySelector('.rw-info img'), fit: (() => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; })() }; });
  S(lst.rows.length >= 5 && /リーナ/.test(lst.rows[0]) && /新しい話/.test(lst.rows[0]) && /ポン太/.test(lst.rows.join('')), '一覧に加入済みの仲間とポン太（' + lst.rows.length + '行）。新しい話のある人に印');
  S(/絆/.test(lst.info) && /思い出0／3話/.test(lst.info.replace(/\s/g, '')) && /新しい話あり/.test(lst.info.replace(/\s/g, '')) && /最後に選んだこと/.test(lst.info) && lst.img, '右の欄：立ち絵・絆・思い出 0／3話・新しい話：あり・最後に選んだこと');
  S(lst.fit, '一覧が画面からはみ出さない（横スクロールなし）');
  await shot('1_talklist');
  await item('リーナ'); await item('新しい話'); if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = false; });
  // 話の再生：メッセージをクリックで進め、選択肢は最初のものを選ぶ（「今日はやめておく」は選ばない）
  let n = 0, sawPortrait = false, midShot = false;
  while (n++ < 240) {
    const st = await p.evaluate(() => ({ done: !!(State.data.bonds.seen.lina_1), playing: Bonds.playing, choice: !!document.querySelector('#ui .rw-choice'), msg: !!document.querySelector('#ui .rw-msg'), portrait: !!document.querySelector('#ui .rw-msg .rw-portrait'), menu: !!document.querySelector('#ui .main-menu') }));
    if (st.portrait) sawPortrait = true;
    if (st.done && !st.playing) break;
    if (st.choice) { const opts = await p.$$('#ui .rw-choice .rw-opt'); let pick = opts[0]; for (const o of opts) { const t = await o.textContent(); if (!/やめておく/.test(t)) { pick = o; break; } } await tapEl(pick); continue; }
    if (st.msg) { if (st.portrait && !midShot && n > 6) { await shot('2_scene'); midShot = true; } const m = await p.$('#ui .rw-msg'); await tapEl(m); continue; }
    await p.waitForTimeout(200);
  }
  const res = await p.evaluate(() => ({ seen: !!State.data.bonds.seen.lina_1, mem: State.data.bonds.mem.lina_sweet, last: State.data.bonds.last.lina, emo: [...__emo], cine: __cine, menuOpen: !!document.querySelector('#ui .main-menu'), busy: World.busy }));
  S(res.seen && res.mem && res.last, '話を最後まで見ると記録される（選んだ焼き菓子：' + res.mem + '・最後に選んだこと：' + res.last + '）');
  S(sawPortrait && res.emo.length >= 3, '台詞に立ち絵と気持ちの動き（' + res.emo.join(' ') + '）');
  S(!res.menuOpen, '話はメニューを閉じてから再生された');
  if (KIND === '3d') S(res.cine.some((c) => c && c.d === 8) && res.cine[res.cine.length - 1] === null, '3D：イベント用カメラが寄り（距離 8）、終わると元に戻る（呼び出し ' + res.cine.length + ' 回）');
  else S(res.cine.length === 0, '2D：3D のカメラは呼ばない');
  await p.waitForFunction(() => !World.busy, null, { timeout: 20000 }).catch(() => { });
  if (KIND === '3d') await p.evaluate(() => { MTQ3D.paused = true; });   // ここから先（手帳・再生・日常会話・宿）は 2D と同じ画面の処理。この作業環境のソフトウェア描画は遅いので 3D の描画を止めて進める
  // 仲間の思い出（手帳）→ 再生
  const snap = await p.evaluate(() => JSON.stringify(State.data));
  p.evaluate(() => { Menu._tab = 1; Menu.open(); });
  await item('仲間の思い出'); await p.waitForFunction(() => !!document.querySelector('#ui .bond-notebook'), null, { timeout: TO, polling: 250 });
  const book = await p.evaluate(() => { const n = document.querySelector('#ui .bond-notebook'); return { rows: [...n.querySelectorAll('.rw-item')].map((x) => x.textContent), info: (n.querySelector('.rw-info') || {}).textContent || '' }; });
  S(book.rows.length === 18 && book.rows.filter((r) => /？？？/.test(r)).length === 11 && /あなたの分のお茶/.test(book.info) && /加入した場所/.test(book.info) && /好きなもの/.test(book.info) && /記念品/.test(book.info), '仲間の思い出：18人（未加入の11人は「？？？」）・リーナの欄に思い出・加入した場所・好きなもの・記念品');
  await shot('3_notebook');
  await item('リーナ'); await item('あなたの分のお茶');
  n = 0; while (n++ < 240) {
    const st = await p.evaluate(() => ({ list: !!document.querySelector('#ui .rw-list .rw-title') && /思い出（再生）/.test(document.querySelector('#ui .rw-list:last-of-type .rw-title') ? document.querySelector('#ui .rw-list:last-of-type .rw-title').textContent : ''), choice: !!document.querySelector('#ui .rw-choice'), msg: !!document.querySelector('#ui .rw-msg'), playing: Bonds.playing }));
    if (!st.playing && !st.msg && !st.choice && n > 3) break;
    if (st.choice) { const opts = await p.$$('#ui .rw-choice .rw-opt'); await tapEl(opts[opts.length - 1]); continue; }
    if (st.msg) { await tapEl(await p.$('#ui .rw-msg')); continue; }
    await p.waitForTimeout(200);
  }
  const diff = await p.evaluate((s0) => { const a = JSON.parse(s0), b = State.data; const keys = new Set(Object.keys(a).concat(Object.keys(b))); return [...keys].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])); }, snap);
  const TIME = ['playTime', 'timeOfDay', 'savedAt'];   // 時間とともに進む値（再生とは関係なく、ゲームの時計で変わる）
  S(diff.every((k) => TIME.indexOf(k) >= 0), '思い出の再生（別の選択肢で）のあと、セーブの中身は変わらない（時間とともに進む値を除く。変わった項目：' + (diff.join(' ') || 'なし') + '）');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
  // 日常会話（話す）
  const c0 = await p.evaluate(() => State.data.bonds.chat.kyle || 0);
  const talkP = p.evaluate(() => BondsUI.talk({}));
  await item('カイル'); await item('話す（');
  n = 0; while (n++ < 30) { const st = await p.evaluate(() => ({ msg: !!document.querySelector('#ui .rw-msg'), name: (document.querySelector('#ui .rw-msg .rw-name') || {}).textContent })); if (!st.msg) break; if (n === 1) S(st.name === 'カイル', '話す：カイルの日常会話（名前・立ち絵つき）'); await tapEl(await p.$('#ui .rw-msg')); }
  await talkP.catch(() => { });
  S(await p.evaluate((c) => (State.data.bonds.chat.kyle || 0) === c + 1, c0), '日常会話は1回に1つだけ（順番の記録が1つ進む）');
  // 宿に泊まったあとの一言（PC だけ）
  if (VIEW === 'pc') {
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); World.busy = false; State.data.gold = 9999; });
    await p.evaluate(() => { const t = document.getElementById('toast'); if (t) { t.classList.remove('show'); t.textContent = ''; } });
    let innDone = false; const innP = p.evaluate(() => Services.inn(10)).then(() => { innDone = true; }, () => { innDone = true; });
    await item('泊まる'); n = 0; let asked = false, toast = '';   // v9.4.1 選択の窓ではなく、小さなトーストだけ（強制的なポップアップをしない）
    while (n++ < 80 && !innDone) { const st = await p.evaluate(() => ({ choice: document.querySelector('#ui .rw-choice') ? document.querySelector('#ui .rw-choice').textContent : '', msg: !!document.querySelector('#ui .rw-msg'), t: (document.querySelector('#toast.show') || {}).textContent || '' })); if (/話したそう|尻尾|聞きたそう/.test(st.t)) toast = st.t; if (/話したそう|尻尾/.test(st.choice)) asked = true; if (st.msg) { await tapEl(await p.$('#ui .rw-msg')); continue; } await p.waitForTimeout(250); }
    await innP; if (!toast) toast = await p.evaluate(() => (document.querySelector('#toast.show') || {}).textContent || '');
    S(!asked && /話したそう|尻尾|聞きたそう/.test(toast), '宿に泊まったあと、新しい話がある仲間がいれば小さなトーストで知らせる（選択の窓は出さない）：「' + toast + '」');
  }
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length; fs.mkdirSync(OUT + 'logs', { recursive: true });
  fs.writeFileSync(`${OUT}logs/bonds94_${KIND}_${VIEW}.json`, JSON.stringify({ KIND, VIEW, ok: steps.length - ng, ng, steps }, null, 1));
  console.log(`結果 ${KIND} ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
