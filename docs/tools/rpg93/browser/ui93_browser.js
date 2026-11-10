// v9.3 RPG の快適さ：ブラウザでの確かめ（ヘッドレス Chromium・ソフトウェア描画。自動の操作で、実機ではない。音は「鳴らした・進んだ」を数えるだけで、耳では聞いていない）
//   KIND=2d|3d  VIEW=pc1280|m390|land  PORT=…  OUT=docs/rpg93/
//   1 タイトル：音の ON/OFF（v9.3 修正で最初は ON：最初のクリック／タップで曲が鳴る。切り替えると端末に覚える）
//     自動再生の許可（--autoplay-policy=no-user-gesture-required）は付けない＝Chrome のふつうの決まり（ページを操作したあとだけ音を出せる）で確かめる
//   1b 音を消しているセーブを読む：1 回だけ「音を出す／音なしのまま」を聞く
//   2 BGM：音を消している間は曲を読み込まない → 音を出すと町の曲（assets/music の MP3）が鳴り、時間が進む → 戦闘の曲へ切り替え（重ねて切り替え）
//   3 戦闘のコマンド：「さくせん」の行（画面の中）→ 仲間の作戦を変える → 戻る
//   4 効き目の表示：呪文の一覧と対象の一覧に「ばつぐん／いまいち／きかない」
//   5 戦闘速度「とてもはやい」：1 ターンの再生の時間が「ふつう」より短い
//   6 会話の履歴：会話の窓の［履歴］→ 履歴の窓（画面の中・✕で閉じる）
//   7 まんたん：メニューから → 呪文と道具 → 結果
//   8 設定：戦闘速度・戦闘の演出・効き目の表示・BGM の種類・クレジット
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8798; const OUT = process.env.OUT || '/home/claude/envwork/docs/rpg93/'; const VIEW = process.env.VIEW || 'pc1280'; const KIND = process.env.KIND || '2d';
const VPS = { pc1280: { viewport: { width: 1280, height: 720 } }, m390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, land: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const VP = VPS[VIEW]; const touch = !!VP.hasTouch; const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
const URL = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw'; const PREFIX = KIND === '3d' ? 'mtq-3d-slot-' : 'mtq-rpg-v2-slot-';
(async () => {
  const br = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] }); const ctx = await br.newContext(VP); const p = await ctx.newPage(); const errs = []; const music = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
  p.on('request', (r) => { if (/assets\/music\//.test(r.url())) music.push({ t: Date.now(), u: r.url().replace(/^.*assets\/music\//, '') }); });
  const shot = async (name) => { await p.screenshot({ path: `${OUT}shots/ui93_${KIND}_${VIEW}_${name}.jpg`, type: 'jpeg', quality: 72 }); };
  const ready = async () => { if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); else await p.waitForFunction(() => window.State && window.World && window.Menu, null, { timeout: 120000 }); };
  const tapEl = async (h) => { await h.scrollIntoViewIfNeeded().catch(() => { }); if (touch) await h.tap(); else await h.click(); await p.waitForTimeout(180); };
  const item = async (label, sel) => { const h = await p.waitForFunction(([l, s]) => [...document.querySelectorAll(s || '#ui .rw-item, #ui .rw-tool, #ui .rw-choice div, #ui button')].reverse().find((x) => x.offsetParent && x.textContent.indexOf(l) >= 0) || null, [label, sel], { timeout: 30000 }); await tapEl(h.asElement()); };
  const reset = async () => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay && s !== BattleUI.scene); World.busy = false; });
  const inView = async (sel) => p.evaluate((s) => { const e = [...document.querySelectorAll(s)].filter((x) => x.offsetParent).pop(); if (!e) return null; const r = e.getBoundingClientRect(); return { ok: r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1, t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), vw: innerWidth, vh: innerHeight }; }, sel);

  // ---- 1 タイトル：音
  await p.goto(URL); await ready();
  await p.waitForSelector('#ui .title-menu', { timeout: 120000 });
  const playingEl = () => p.evaluate(async () => { Audio.bgmLevel(); await new Promise((r) => setTimeout(r, 400)); const st = Audio.bgmState(); return { engine: st.engine, cur: st.cur, playing: st.playing, ctx: Audio.ctx ? Audio.ctx.state : 'none', t: st.t, level: +Audio.bgmLevel().toFixed(4) }; });   // v9.3 修正：鳴らし方（読み込んでから／流しながら）によらず、出ている音の大きさ（level）も見る
  const t1 = await p.evaluate(() => ({ chip: [...document.querySelectorAll('#ui .rw-tool')].map((x) => x.textContent).join('|'), snd: Audio.titleSound(), ls: localStorage.getItem('mtq-title-sound'), cur: Audio.ctx ? Audio.bgmState().cur : null }));
  S(/音：ON/.test(t1.chip) && t1.snd === true && t1.ls === null && !t1.cur, 'タイトル：最初は音 ON（' + t1.chip + '）。操作の前は鳴らさない（ブラウザの決まり）'); await shot('title');
  await tapEl(await p.$('#ui .title-menu .rw-title')); await p.waitForTimeout(2500);
  const t2 = await playingEl(); S(t2.cur === 'calm_before_the_storm' && t2.playing && t2.t > 0.5 && t2.ctx === 'running' && t2.level > 0.0005, '最初のクリック／タップでタイトルの曲が鳴り、時間が進み、音が出ている（' + JSON.stringify(t2) + '）');
  await item('音：ON'); await p.waitForTimeout(600); const t3 = await p.evaluate(() => ({ chip: [...document.querySelectorAll('#ui .rw-tool')].map((x) => x.textContent).join('|'), ls: localStorage.getItem('mtq-title-sound'), cur: Audio.bgmState().cur }));
  S(/音：OFF/.test(t3.chip) && t3.ls === 'off' && !t3.cur, 'タイトル：OFF にすると曲が止まり、端末に覚える（' + t3.ls + '）');
  await item('音：OFF'); await p.waitForTimeout(2500); const t4 = await playingEl();
  S(t4.cur === 'calm_before_the_storm' && t4.t > 0.5, 'タイトル：ON に戻すとまた鳴る（' + t4.t + '秒）');
  await item('音：ON'); await p.waitForTimeout(400);   // このあとの確かめのため OFF に（端末に 'off' を覚える）

  // セーブを作ってつづきから（仲間 4 人・呪文を持つ主人公）
  await p.evaluate((pre) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'mage'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.hero.level = 20; ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id)); State.save(1); localStorage.removeItem(pre + '0'); }, PREFIX);
  await p.reload(); await ready(); await p.waitForSelector('#ui .title-menu', { timeout: 120000 }); await item('つづきから'); await item('スロット1');
  // 1b 音を消しているセーブ：1 回だけ聞く（ここでは「音なしのまま」を選び、このあと 2 で音を出す）
  const ask = await p.waitForFunction(() => [...document.querySelectorAll('#ui .rw-choice, #ui .rw-list')].some((x) => /音なしのまま/.test(x.textContent)), null, { timeout: 60000 }).then(() => true).catch(() => false);
  S(ask, '音を消しているセーブを読むと「音を出す／音なしのまま」を聞く'); if (ask) { await shot('sound_ask'); await item('音なしのまま'); }
  S(await p.evaluate(() => State.data.settings.mute === true && State.data.settings.soundAsk93 === true), '「音なしのまま」：音を消したまま、聞いたことを覚える');
  if (KIND === '3d') { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.evaluate(() => { MTQ3D.paused = true; }); }   // 3D の町の描画を止める（この作業環境はソフトウェア描画で、描画が CPU を使い切ると曲の読み込み・画面の撮影が止まるため。menu92 と同じ）
  await p.waitForTimeout(1500); await reset();

  // ---- 2 BGM
  const m0 = music.length; await p.evaluate(() => { Audio.unlock(); Audio.playBgm('town'); }); await p.waitForTimeout(1500);
  S(music.length === m0 && !(await p.evaluate(() => Audio.bgmState().cur)), '音を消している間は曲を読み込まない（読み込み ' + (music.length - m0) + ' 件）');
  await p.evaluate(() => { State.data.settings.mute = false; State.data.settings.bgm = 0.5; Audio.apply(); }); await p.waitForTimeout(3000);
  const b1 = await p.evaluate(async () => { Audio.bgmLevel(); await new Promise((r) => setTimeout(r, 400)); return Object.assign({ map: World.map && World.map.id, level: +Audio.bgmLevel().toFixed(4) }, Audio.bgmState()); });
  const playing = b1.playing ? b1 : null;
  S(!!b1.cur && b1.playing && b1.t > 0.5 && b1.level > 0.0005, '音を出すと場所の曲が鳴り、時間が進み、音が出ている（' + b1.map + ' → ' + b1.cur + '・' + b1.engine + '・' + b1.t + '秒・大きさ ' + b1.level + '）');
  await p.evaluate(() => Audio.playBgm('battle')); await p.waitForTimeout(2500);
  const b2 = await p.evaluate(async () => { await new Promise((r) => setTimeout(r, 400)); return Object.assign({ level: +Audio.bgmLevel().toFixed(4) }, Audio.bgmState()); });
  S(b2.cur && b2.cur !== b1.cur && b2.playing && b2.t > 0.3 && b2.level > 0.0005, '戦闘の曲へ切り替わる（' + b2.cur + '・' + b2.t + '秒）');
  await p.evaluate(() => Audio.playBgm('town')); await p.waitForTimeout(1800);
  const b3 = await p.evaluate(() => Audio.bgmState());
  S(b3.cur === b1.cur && b3.t > (playing ? playing.t : 0), '戦闘のあとは町の曲の続きから（' + b3.t.toFixed(1) + '秒。流しながら鳴らすときは、サーバーが範囲指定 Range に答えるとき）');
  const dup = await p.evaluate(() => { const before = Audio.BUF.node; Audio.current = null; Audio.playBgm('town'); return new Promise((r) => setTimeout(() => r(Audio.bgmState().engine === 'buffer' ? (Audio.BUF.node === before && !!before ? 1 : 2) : Audio.FILE.els.filter((e) => !e.paused && /0ad-/.test(e.getAttribute('src') || '')).length), 1200)); });
  S(dup === 1, '同じ曲をもう一度鳴らしても、重ねて鳴らさない（' + dup + '）');
  await p.evaluate(() => { State.data.settings.mute = true; Audio.apply(); }); await p.waitForTimeout(500);
  S(!(await p.evaluate(() => Audio.bgmState().cur)), '音を消すと曲が止まる');

  // ---- 3〜5 戦闘
  const en = await p.evaluate(() => {   // 主人公の攻撃呪文の属性に弱い敵（効き目「ばつぐん」が出る相手）
    const els = Actors.allSkills(State.data.hero).map((id) => SKILLS[id]).filter((s) => s && s.kind === 'magic' && (s.target === 'enemy' || s.target === 'enemies') && s.element).map((s) => s.element);
    const k = Object.keys(ENEMIES).find((id) => !ENEMIES[id].boss && ENEMIES[id].hp > 300 && ENEMIES[id].resist && els.some((e) => ENEMIES[id].resist[e] > 1)); return { id: k, els, resist: k && ENEMIES[k].resist }; });
  S(!!en.id, '弱点のある敵（' + en.id + '・主人公の呪文の属性 ' + en.els.join(',') + '）');
  await p.evaluate((id) => { State.data.settings.battleSpeed = 'normal'; State.data.settings.autoBattle = false; State.data.hero.mp = 999; BattleUI.start([id, id], {}); }, en.id);
  await p.waitForFunction(() => document.querySelector('#ui .cmd-list'), null, { timeout: 120000 }); await p.waitForTimeout(300);
  const cmd = await p.evaluate(() => [...document.querySelectorAll('#ui .cmd-list .rw-item')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  const cv = await inView('#ui .cmd-list');
  S(cmd.some((x) => /さくせん/.test(x)) && cv && cv.ok, '戦闘のコマンドに「さくせん」（' + cmd.length + ' 行・画面の中 ' + JSON.stringify(cv) + '）'); await shot('cmd');
  // 見えている行（窓の中に表示されている部分）が味方の欄に隠れないか（窓の下の余白が少し重なるのは前からの配置）
  const ov = await p.evaluate(() => { const L = document.querySelector('#ui .cmd-list').getBoundingClientRect(), H = document.getElementById('battle-party').getBoundingClientRect(); const xo = L.left < H.right && L.right > H.left;
    const its = [...document.querySelectorAll('#ui .cmd-list .rw-item')].map((x) => x.getBoundingClientRect()).filter((r) => r.top < L.bottom - 4 && r.bottom > L.top + 4);
    const hidden = xo ? its.filter((r) => Math.min(r.bottom, L.bottom) > H.top + 2).length : 0; const all = document.querySelectorAll('#ui .cmd-list .rw-item').length;
    return { hiddenRows: hidden, visibleRows: its.length, rows: all, list: [Math.round(L.top), Math.round(L.bottom)], hudTop: Math.round(H.top) }; });
  S(ov.hiddenRows === 0, 'コマンドの行が味方の欄に隠れない（' + JSON.stringify(ov) + (ov.visibleRows < ov.rows ? '。残りの行は窓の中でスクロール' : '') + '）');
  await item('さくせん', '#ui .cmd-list .rw-item'); await p.waitForTimeout(300);
  const tv = await inView('#ui .rw-list'); const tl = await p.evaluate(() => [...document.querySelectorAll('#ui > :last-child .rw-item')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  S(tl.length >= 4 && tv && tv.ok, '作戦の窓：仲間の一覧（' + tl.slice(0, 5).join('／') + '）'); await shot('tactics');
  await item('リーナ'); await p.waitForTimeout(250); await item('回復重視'); await p.waitForTimeout(300);
  const tac = await p.evaluate(() => State.data.companions.lina.tactic); S(tac === 'heal', '仲間ごとに作戦を変えられる（リーナ → 回復重視）');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250); if (await p.evaluate(() => !document.querySelector('#ui .cmd-list'))) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
  S(await p.evaluate(() => !!document.querySelector('#ui .cmd-list')), '作戦の窓を閉じるとコマンドへ戻る');
  // 効き目
  await item('じゅもん', '#ui .cmd-list .rw-item'); await p.waitForTimeout(300);
  const sk = await p.evaluate(() => [...document.querySelectorAll('#ui > :last-child .rw-item')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  const weakRow = sk.find((x) => /ばつぐん/.test(x));
  S(!!weakRow, '呪文の一覧に効き目（' + (weakRow || sk.slice(0, 3).join('／')) + '）'); await shot('skills');
  if (weakRow) { await item(weakRow.split(' ')[0]); await p.waitForTimeout(300); const tg = await p.evaluate(() => [...document.querySelectorAll('#ui > :last-child .rw-item')].map((x) => ({ t: x.textContent.replace(/\s+/g, ' ').trim(), c: x.className })));
    S(tg.some((x) => /ばつぐん/.test(x.t) && /eff-weak/.test(x.c)), '対象の一覧にも「◎ばつぐん」（' + (tg[0] && tg[0].t) + '）'); await shot('target'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // テンポ：ふつう と とてもはやい で、同じ行動（全員ぼうぎょ）の 1 ターンの再生時間を比べる
  const turnMs = async (spd) => p.evaluate(async (s) => { State.data.settings.battleSpeed = s; const b = BattleUI.battle; const cmds = b.party.filter((a) => !a.dead).map((a) => ({ actorId: a.id, type: 'defend' })); const ev = Combat.runTurn(b, cmds); const t0 = performance.now(); await BattleUI.playEvents(b, ev, BattleUI.scene); return Math.round(performance.now() - t0); }, spd);
  const tN = await turnMs('normal'), tV = await turnMs('veryfast'); await p.evaluate(() => { State.data.settings.battleSpeed = 'normal'; });
  S(tV < tN, '戦闘速度「とてもはやい」：1 ターンの再生 ' + tN + 'ms → ' + tV + 'ms（全員ぼうぎょ・敵の行動つき）');
  await p.evaluate(() => { const b = BattleUI.battle; b.enemies.forEach((e) => { e.hp = 0; e.dead = true; }); }); await reset();
  await p.evaluate(() => { if (BattleUI.battle) BattleUI.battle.state = 'won'; document.getElementById('battle-party').classList.remove('on'); document.getElementById('battle-msg').classList.remove('on'); BattleUI.autoButton(false); });

  // ---- 6 会話の履歴
  await reset(); await p.evaluate(() => { Win.message(['旅の人、ようこそ。', 'この町には古い言い伝えがある。'], { name: '村人' }); }); await p.waitForTimeout(300);
  await shot('msg'); const lb = await p.$('#ui .rw-msg .rw-logbtn'); S(!!lb, '会話の窓に［履歴］'); if (lb) await tapEl(lb); await p.waitForTimeout(300);
  const bv = await inView('#ui .backlog-panel'); const bt = await p.evaluate(() => { const n = document.querySelector('#ui .backlog-panel'); return n ? n.textContent.slice(0, 200) : ''; });
  S(bv && bv.ok && /ようこそ/.test(bt), '会話の履歴の窓（画面の中・話した言葉 ' + JSON.stringify(bv) + '）'); await shot('backlog');
  const cx = await p.$('#ui .backlog-panel .rw-close'); if (cx) await tapEl(cx); await p.waitForTimeout(250); S(await p.evaluate(() => !document.querySelector('#ui .backlog-panel')), '✕で閉じる');
  await reset();

  // ---- 7 まんたん
  await p.evaluate(() => { State.partyActors().forEach((a) => { const s = Actors.stats(a); a.hp = Math.max(1, Math.round(s.maxHp * 0.3)); a.mp = s.maxMp; a.dead = false; }); State.addItem('herb', 60); Win.log.length = 0; Menu.fullHeal(); }); await p.waitForTimeout(300);
  await shot('fullheal_ask'); await item('呪文と道具'); await p.waitForTimeout(500);
  for (let i = 0; i < 6 && await p.evaluate(() => !!document.querySelector('#ui .rw-msg')); i++) { if (i === 0) await shot('fullheal_done'); await p.keyboard.press('Enter'); await p.waitForTimeout(250); }
  const fh = await p.evaluate(() => ({ text: Win.log.map((x) => x.text).join('／'), full: State.partyActors().every((a) => a.hp === Actors.stats(a).maxHp) }));
  S(fh.full && /満タン/.test(fh.text), 'まんたん：全員の HP が満タン（' + fh.text.slice(0, 120) + '）');
  await reset();

  // ---- 8 設定
  await p.evaluate(() => { Menu.settings && Menu.settings(); }); await p.waitForTimeout(400);
  const hasTab = await p.evaluate(() => !!document.querySelector('#ui .rw-tab'));
  if (hasTab) { await item('戦闘', '#ui .rw-tab'); await p.waitForTimeout(250); }
  const st = await p.evaluate(() => [...document.querySelectorAll('#ui > :last-child .rw-item')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  S(st.some((x) => /戦闘速度/.test(x)) && st.some((x) => /戦闘の演出/.test(x)) && st.some((x) => /効き目/.test(x)), '設定（戦闘）：戦闘速度・戦闘の演出・効き目の表示（' + st.filter((x) => /戦闘速度|演出|効き目/.test(x)).join('／') + '）'); await shot('settings_battle');
  if (hasTab) { await item('音', '#ui .rw-tab'); await p.waitForTimeout(250); const so = await p.evaluate(() => [...document.querySelectorAll('#ui > :last-child .rw-item')].map((x) => x.textContent.replace(/\s+/g, ' ').trim())); S(so.some((x) => /BGM の種類/.test(x)) && so.some((x) => /BGM の鳴らし方/.test(x)) && so.some((x) => /BGM の状態/.test(x)) && so.some((x) => /クレジット/.test(x)), '設定（音）：BGM の種類・鳴らし方・状態・サウンドテスト・クレジット'); await shot('settings_sound'); }
  await reset(); await p.evaluate(() => { Menu.bgmDiag(); }); await p.waitForTimeout(1200);
  const dtx = await p.evaluate(() => { const n = document.querySelector('#ui .bgm-diag'); return n ? n.textContent : ''; }); S(/BGM の状態/.test(dtx) && /鳴らし方/.test(dtx) && /出ている音の大きさ/.test(dtx), '設定（音）：BGM の状態の画面（音の準備・鳴らし方・曲・状態・大きさ）'); await shot('bgmdiag');
  await reset();

  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/ui93_${KIND}_${VIEW}.json`, JSON.stringify({ kind: KIND, view: VIEW, ok: steps.length - ng, ng, steps, music: music.slice(0, 20), errs }, null, 1));
  console.log(`結果 ${KIND} ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
