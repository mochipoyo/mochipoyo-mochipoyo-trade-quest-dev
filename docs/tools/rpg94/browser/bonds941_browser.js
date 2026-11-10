// v9.4.1 仲間の絆：正しい指示書の 14 章（UI・UX）と 11A の回収の確かめ（ヘッドレス Chromium。実機ではない。GPU なしのソフトウェア描画）
//   一覧が加入した順 → ミナの「父の記録を、ミナと読む」（取り残しの回収）→ リーナ第1話：キャンセル＝先送り／先送りのない問いはキャンセルで閉じない
//   → 話の間は歩けない（キー入力で位置が変わらない）・終わると歩ける・3D のカメラが戻る → 連続タップで二つ目が始まらない
//   → スマホで一番長い選択肢が画面からはみ出さない（折り返す）→（PC）宿のあとはトーストだけ
//   → 保存して読み込み直すと進み具合が戻る → 話の途中でページを読み込み直すと、途中の選択は残らず、同じ話を最初から見られる
//   KIND=2d|3d  VIEW=pc|m390|land  PORT=…  OUT=…
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8860; const KIND = process.env.KIND || '2d'; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/rpg94/';
const URL = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const TO = KIND === '3d' ? 120000 : 30000;
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const VP = { pc: { viewport: { width: 1280, height: 720 } }, m390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, land: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }[VIEW];
const MOBILE3D = KIND === '3d' && VIEW !== 'pc';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(VP); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const shot = (n) => p.screenshot({ path: `${OUT}shots/bonds941_${KIND}_${VIEW}_${n}.jpg`, type: 'jpeg', quality: 72, timeout: TO });
  const tapEl = async (h) => { try { await h.evaluate((el) => el.scrollIntoView({ block: 'nearest' })); await p.waitForTimeout(250); } catch (e) { } const b = await h.boundingBox(); if (!b) return false; if (VIEW === 'pc') await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); else await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(200); return true; };
  const find = (sel, text) => p.waitForFunction(([s, t]) => [...document.querySelectorAll(s)].reverse().find((x) => x.offsetParent && (!t || x.textContent.indexOf(t) >= 0)) || null, [sel, text], { timeout: TO, polling: 250 }).then((h) => h.asElement());
  const item = async (text) => { const h = await find('#ui .rw-item, #ui .rw-opt', text); await tapEl(h); if (await p.evaluate((t) => { const o = [...document.querySelectorAll('#ui .rw-item.cur')].reverse()[0]; return !!(o && o.offsetParent && o.textContent.indexOf(t) >= 0 && o.closest('.rw-preview')); }, text)) await tapEl(h); };
  const clean = () => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
  // 話を最後まで進める（選択肢は pick(文の配列) が返す番号。null なら最初の「やめておく」でないもの）
  async function playOut(doneFn, pick, onMsg) {
    let n = 0; while (n++ < 260) {
      const st = await p.evaluate((f) => ({ done: eval(f), playing: Bonds.playing, choice: [...document.querySelectorAll('#ui .rw-choice .rw-opt')].map((o) => o.textContent), msg: !!document.querySelector('#ui .rw-msg') }), doneFn);
      if (st.done && !st.playing) return true;
      if (st.choice.length) { let i = pick ? pick(st.choice) : st.choice.findIndex((t) => !/やめておく|そっとしておく/.test(t)); if (i < 0) i = 0; const opts = await p.$$('#ui .rw-choice .rw-opt'); await tapEl(opts[i]); continue; }
      if (st.msg) { if (onMsg) await onMsg(n); await tapEl(await p.$('#ui .rw-msg')); continue; }
      await p.waitForTimeout(200);
    }
    return false;
  }
  async function boot() {
    if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
    await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  }
  async function toMap() {
    if (KIND === '3d') await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 });
    await p.waitForFunction(() => window.World && World.map, null, { timeout: 120000 }); await p.waitForTimeout(800); await clean();
  }
  await p.goto(URL); await boot();
  await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    ['lina', 'kyle', 'mina', 'gald', 'seris'].forEach((id) => State.joinCompanion(id)); d.party = ['lina', 'kyle', 'gald']; d.flags.ponta_joined = true;
    d.flags.mina_father_record = true; d.flags.memory_choice = 1; d.quests.main_9 = { state: 'done', at: 1 };   // ミナがいないときに父の記録を読んだ状態
    World.start();
  });
  await toMap();
  await p.evaluate(() => { window.__cine = []; if (window.MTQ3D && MTQ3D.cine) { const c0 = MTQ3D.cine.bind(MTQ3D); MTQ3D.cine = (o) => { __cine.push(o ? 1 : 0); return c0(o); }; }
    window.__plays = []; const p0 = Bonds.play; Bonds.play = async function (sc, o) { const r = await p0.call(Bonds, sc, o); __plays.push({ id: sc.id, busy: !!r.busy, done: !!r.done, later: !!r.later }); return r; }; });
  // 1) 一覧は加入した順
  if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = true; });
  p.evaluate(() => { Menu._tab = 1; Menu.open(); }); await item('仲間と話す'); await p.waitForFunction(() => !!document.querySelector('#ui .bond-list'), null, { timeout: TO, polling: 250 });
  const rows = await p.evaluate(() => [...document.querySelectorAll('#ui .bond-list .rw-item')].map((x) => x.textContent));
  S(/リーナ/.test(rows[0]) && /カイル/.test(rows[1]) && /ミナ/.test(rows[2]) && /ガルド/.test(rows[3]) && /セリス/.test(rows[4]) && /ポン太/.test(rows[5]), '「仲間と話す」は加入した順（リーナ・カイル・ミナ・ガルド・セリス・ポン太）：' + rows.slice(0, 6).map((r) => (r.match(/リーナ|カイル|ミナ|ガルド|セリス|ポン太/) || ['?'])[0]).join(' '));
  S(/★/.test(rows[2]), '取り残し（ミナの父）があるミナに小さな印（★）');
  await shot('1_list');
  // 2) 取り残しの回収：控えのミナと、父の記録を読む
  await item('ミナ'); await item('父の記録を、ミナと読む'); if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = false; });
  const ok2 = await playOut('!!(State.data.quests.mina_father && State.data.quests.mina_father.state === "done")');
  const r2 = await p.evaluate(() => ({ q: State.data.quests.mina_father && State.data.quests.mina_father.state, ring: State.data.inventory.ring_speed || 0, pending: Bonds.rescuePending('mina_father') }));
  S(ok2 && r2.q === 'done' && r2.ring === 1 && !r2.pending, '控えのミナと「父の記録」を読む → 「ミナの父」を達成（素早さの指輪 1 つ）');
  await p.waitForFunction(() => !World.busy, null, { timeout: 30000 }).catch(() => { }); await clean();
  // 3) リーナ第1話：先送りの問いでキャンセル → 先送り
  const talkTo = async (who, what) => { if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = true; }); p.evaluate(() => { Menu._tab = 1; Menu.open(); }); await item('仲間と話す'); await item(who); await item(what); if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = false; }); };
  await talkTo('リーナ', '新しい話');
  let n = 0; while (n++ < 60) { const st = await p.evaluate(() => ({ c: [...document.querySelectorAll('#ui .rw-choice .rw-opt')].map((o) => o.textContent), m: !!document.querySelector('#ui .rw-msg') })); if (st.c.some((t) => /やめておく/.test(t))) break; if (st.m) await tapEl(await p.$('#ui .rw-msg')); else await p.waitForTimeout(200); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  n = 0; while (n++ < 40) { const st = await p.evaluate(() => ({ playing: Bonds.playing, m: !!document.querySelector('#ui .rw-msg') })); if (!st.playing) break; if (st.m) await tapEl(await p.$('#ui .rw-msg')); else await p.waitForTimeout(200); }   // 先送りの返事（「また今度」）を読んで閉じる
  const r3 = await p.evaluate(() => ({ later: State.data.bonds.later.lina_1, seen: !!State.data.bonds.seen.lina_1, ready: Bonds.epState(BONDS94.EP.lina_1) }));
  S(r3.later === 1 && !r3.seen && r3.ready === 'ready', '「今日はやめておく」がある問いでキャンセル：先送りになり、あとでまた見られる');
  await p.waitForFunction(() => !World.busy, null, { timeout: 30000 }).catch(() => { }); await clean();
  // 4) もう一度：先送りのない問いではキャンセルで閉じない／話の間はキーで歩けない
  const where = () => JSON.stringify([State.data.pos.x, State.data.pos.y].concat(World.player ? [Math.round(World.player.x * 10), Math.round(World.player.y * 10)] : []));
  const pos0 = await p.evaluate(where);
  await talkTo('リーナ', '新しい話');
  let cancelOk = null, moved = null; n = 0;
  while (n++ < 260) {
    const st = await p.evaluate(() => ({ c: [...document.querySelectorAll('#ui .rw-choice .rw-opt')].map((o) => o.textContent), m: !!document.querySelector('#ui .rw-msg'), done: !!State.data.bonds.seen.lina_1, playing: Bonds.playing }));
    if (st.done && !st.playing) break;
    if (st.c.length) {
      if (cancelOk === null && !st.c.some((t) => /やめておく/.test(t))) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); cancelOk = await p.evaluate((k) => document.querySelectorAll('#ui .rw-choice .rw-opt').length === k && Bonds.playing, st.c.length); }
      const opts = await p.$$('#ui .rw-choice .rw-opt'); let i = st.c.findIndex((t) => /リーナの分/.test(t)); if (i < 0) i = st.c.findIndex((t) => !/やめておく/.test(t)); await tapEl(opts[Math.max(0, i)]); continue;
    }
    if (st.m) { if (moved === null && n > 4) { await p.keyboard.down('ArrowRight'); await p.waitForTimeout(700); await p.keyboard.up('ArrowRight'); moved = await p.evaluate(([f, p0]) => eval('(' + f + ')')() !== p0 || !World.busy, [where.toString(), pos0]); if (n > 6 && moved === false) await shot('2_scene'); } await tapEl(await p.$('#ui .rw-msg')); continue; }
    await p.waitForTimeout(200);
  }
  S(cancelOk === true, '先送りのない問いでキャンセルしても、選択肢は閉じない（話は続く）');
  S(moved === false, '話の間は、矢印キーを押しても主人公は動かない（会話中にマップ移動が割り込まない）');
  await p.waitForFunction(() => !World.busy && !Bonds.playing, null, { timeout: 30000 }).catch(() => { });
  await p.waitForTimeout(600);
  const after = await p.evaluate(() => ({ busy: World.busy, ui: document.querySelectorAll('#ui > *').length, cine: window.__cine.slice(-1)[0], seen: !!State.data.bonds.seen.lina_1 }));
  if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = false; });
  const pos1 = await p.evaluate(where);
  let pos2 = pos1; for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp']) { await p.keyboard.down(key); await p.waitForTimeout(900); await p.keyboard.up(key); await p.waitForTimeout(500); pos2 = await p.evaluate(where); if (pos2 !== pos1) break; }
  S(after.seen && !after.busy && pos2 !== pos1, '話が終わると、入力が戻り歩ける（' + pos1 + '→' + pos2 + '）' + (KIND === '3d' ? '・3D のカメラは戻る（最後の呼び出し：' + (after.cine === 0 ? '戻す' : after.cine) + '）' : ''));
  if (KIND === '3d') S(after.cine === 0, '3D：会話のあと、イベント用カメラは元に戻っている');
  // 5) 連続タップ：「新しい話」をすばやく2回
  await clean(); const plays0 = await p.evaluate(() => __plays.length);
  if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = true; });
  p.evaluate(() => { Menu._tab = 1; Menu.open(); }); await item('仲間と話す'); await item('ガルド');
  const h = await find('#ui .rw-opt', '新しい話'); const bb = await h.boundingBox();
  for (let k = 0; k < 3; k++) { if (VIEW === 'pc') await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); else await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(40); }
  if (MOBILE3D) await p.evaluate(() => { MTQ3D.paused = false; });
  await playOut('!!State.data.bonds.seen.gald_1');
  await p.waitForFunction(() => !World.busy && !Bonds.playing, null, { timeout: 30000 }).catch(() => { });
  const pl = await p.evaluate((k) => __plays.slice(k), plays0);
  S(pl.filter((x) => !x.busy).length === 1 && pl[0].id === 'gald_1', '「新しい話」をすばやく3回押しても、話は1つだけ（' + JSON.stringify(pl) + '）');
  await clean();
  // 6) 一番長い選択肢（スマホ）
  const longest = await p.evaluate(() => { let best = ''; const scan = (st) => (st || []).forEach((s) => { if (s[0] === 'c') s[2].forEach((o) => { const t = Bonds.fmt(o.t); if (t.length > best.length) best = t; scan(o.then); }); if (s[0] === 'if') { scan(s[2]); scan(s[3]); } }); Object.values(BONDS94.EP).concat(Object.values(BONDS94.PAIRS)).forEach((sc) => scan(sc.steps)); return best; });
  const chP = p.evaluate((t) => Win.choice('いちばん長い選択肢の確かめ', [t, '短い']), longest); await p.waitForTimeout(500);
  const fit = await p.evaluate(() => { const c = document.querySelector('#ui .rw-choice'); const r = c.getBoundingClientRect(); const o = [...c.querySelectorAll('.rw-opt')]; return { left: r.left, right: r.right, w: innerWidth, h: o[0].getBoundingClientRect().height, h2: o[1].getBoundingClientRect().height, over: o.some((x) => x.scrollWidth > x.clientWidth + 1), page: document.documentElement.scrollWidth <= innerWidth + 1 }; });
  S(fit.left >= -1 && fit.right <= fit.w + 1 && !fit.over && fit.page, '一番長い選択肢（' + longest.length + '字）が画面の中に収まる（横にはみ出さない・はみ出す行がない）' + (fit.h > fit.h2 * 1.5 ? '。折り返して表示（高さ ' + Math.round(fit.h) + 'px）' : ''));
  await shot('3_longchoice'); await p.keyboard.press('Enter'); await chP.catch(() => { }); await clean();
  // 7) 宿のあと（PC）：トーストだけ
  if (VIEW === 'pc') {
    await p.evaluate(() => { State.data.gold = 9999; const t = document.getElementById('toast'); if (t) { t.classList.remove('show'); t.textContent = ''; } });   // 前の知らせを消してから
    let innDone = false; const innP = p.evaluate(() => Services.inn(10)).then(() => { innDone = true; }, () => { innDone = true; }); await item('泊まる');
    n = 0; let asked = false, toast = ''; while (n++ < 80 && !innDone) { const st = await p.evaluate(() => ({ choice: document.querySelector('#ui .rw-choice') ? document.querySelector('#ui .rw-choice').textContent : '', msg: !!document.querySelector('#ui .rw-msg'), t: (document.querySelector('#toast.show') || {}).textContent || '' })); if (/話したそう|尻尾|聞きたそう/.test(st.t)) toast = st.t; if (/話したそう|尻尾/.test(st.choice)) asked = true; if (st.msg) { await tapEl(await p.$('#ui .rw-msg')); continue; } await p.waitForTimeout(250); }
    await innP; if (!toast) toast = await p.evaluate(() => (document.querySelector('#toast.show') || {}).textContent || '');
    S(!asked && /話したそう|尻尾|聞きたそう/.test(toast), '宿のあとは小さなトーストだけ（選択の窓は出ない）：「' + toast + '」');
    await clean();
  }
  // 8) 保存 → 読み込み直し → 進み具合が戻る
  const saved = await p.evaluate(() => { State.save(1); return { seen: Object.keys(State.data.bonds.seen).sort(), mem: State.data.bonds.mem, q: State.data.quests.mina_father.state }; });
  await p.reload(); await boot();
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.data = State.load(1); World.start(); });
  await toMap();
  const loaded = await p.evaluate(() => ({ seen: Object.keys(State.data.bonds.seen).sort(), mem: State.data.bonds.mem, q: State.data.quests.mina_father.state, st: Bonds.epState(BONDS94.EP.lina_2) }));
  S(JSON.stringify(loaded.seen) === JSON.stringify(saved.seen) && JSON.stringify(loaded.mem) === JSON.stringify(saved.mem) && loaded.q === 'done', '保存して読み込み直すと、見た話・選んだこと・回収した「ミナの父」が戻る（' + loaded.seen.join(' ') + '）');
  // 9) 話の途中でページを読み込み直す → 途中の選択は残らない
  await p.evaluate(() => { window.__plays = []; });
  await talkTo('カイル', '新しい話');
  n = 0; let picked = false; while (n++ < 80 && !picked) { const st = await p.evaluate(() => ({ c: document.querySelectorAll('#ui .rw-choice .rw-opt').length, m: !!document.querySelector('#ui .rw-msg') })); if (st.c) { const opts = await p.$$('#ui .rw-choice .rw-opt'); await tapEl(opts[0]); picked = true; break; } if (st.m) await tapEl(await p.$('#ui .rw-msg')); else await p.waitForTimeout(200); }
  await p.waitForTimeout(400);
  const mid = await p.evaluate(() => ({ playing: Bonds.playing, mem: JSON.stringify(State.data.bonds.mem) }));
  await p.reload(); await boot();
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.data = State.load(0) || State.load(1); World.start(); });
  await toMap();
  const re = await p.evaluate(() => ({ seen: !!State.data.bonds.seen.kyle_1, st: Bonds.epState(BONDS94.EP.kyle_1), memKeys: Object.keys(State.data.bonds.mem).filter((k) => /^kyle_/.test(k)) }));
  S(picked && mid.playing && !re.seen && re.st === 'ready' && re.memKeys.length === 0, '話の途中（選択のあと）でページを読み込み直しても、途中の選択は残らず、カイル第1話を最初から見られる');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length; fs.mkdirSync(OUT + 'logs', { recursive: true });
  fs.writeFileSync(`${OUT}logs/bonds941_${KIND}_${VIEW}.json`, JSON.stringify({ KIND, VIEW, ok: steps.length - ng, ng, steps }, null, 1));
  console.log(`結果 ${KIND} ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
