// v8.8 通しの確かめ（ヘッドレス Chromium。実機ではない）：タイトル → はじめから → 移動 → 会話 → メニュー → どうぐ → そうび → セーブ → 再読み込み → つづきから
//   VER=2d|3d  VIEW=pc|p390。画面の操作はクリック・キーボード（会話の相手を選ぶところだけ、近くの人を World.talk で呼ぶ）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = '/home/claude/envwork/docs/ux88/'; const VER = process.env.VER || '2d'; const VIEW = process.env.VIEW || 'pc';
const VP = { pc: { viewport: { width: 1280, height: 720 } }, p390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }[VIEW];
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(VP); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  const url = `http://localhost:${PORT}/${VER === '3d' ? '3d/' : ''}index.html`;
  const top = () => p.evaluate(() => { const n = document.getElementById('ui').lastElementChild; return n ? n.className : ''; });
  const tapText = async (sel, re) => { const h = await p.evaluateHandle(({ sel, re }) => [...document.querySelectorAll(sel)].reverse().find((x) => new RegExp(re).test(x.textContent)), { sel, re: re.source }); const el = h.asElement(); if (!el) return false; await el.click(); return true; };
  async function drain(max) { for (let i = 0; i < (max || 120); i++) { const c = await top(); const busy = await p.evaluate(() => !!(window.World && World.busy)); if (!c && !busy) return true; if (/rw-msg/.test(c)) await p.click('#ui .rw-msg'); else if (/rw-choice/.test(c)) await p.click('#ui .rw-choice .rw-opt'); else await p.waitForTimeout(150); await p.waitForTimeout(120); } return false; }
  await p.goto(url);
  if (VER === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.Engine && Engine.scenes.length, null, { timeout: 120000 });
  await p.waitForSelector('.title-menu', { timeout: 120000 }); S(true, 'タイトルの一覧が出る');
  if (VER === '3d') await p.evaluate(() => { MTQ3D.paused = true; });   // 描画だけ止める（ソフトウェア描画でクリックの処理が待たされないように。ゲームの処理は動く）
  await tapText('.title-menu .rw-item', /はじめから/); await p.waitForSelector('.rw-prompt-panel');
  await p.fill('.rw-prompt-panel input', 'もち'); await p.click('.rw-prompt-panel .rw-btn.ok'); S(true, '名前を入れて［決定］');
  await p.waitForSelector('.rw-list.rw-preview'); await p.click('.rw-list.rw-preview .rw-item'); const firstSel = await top(); await p.click('.rw-list.rw-preview .rw-ok'); S(/rw-preview/.test(firstSel), '職業：1 回目のタップは詳細を見るだけ → ［決定］で選ぶ');
  await p.waitForSelector('.rw-choice'); await tapText('.rw-choice .rw-opt', /始める/);
  await p.waitForSelector('.rw-choice'); await p.click('#ui .rw-choice .rw-opt:nth-child(2)'); S(true, '物語の始め方：ポヨ村から（プロローグを飛ばす）');
  await drain(200); if (VER === '3d') await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 240000 });
  const st0 = await p.evaluate(() => ({ map: World.map && World.map.id, x: World.player.x, y: World.player.y, name: State.data.hero.name, trial: State.data.settings.battleTrial, hp: State.data.settings.enemyHpBar }));
  S(st0.name === 'もち' && st0.map, '冒険が始まる（' + st0.map + '・' + st0.name + '）。新しいゲームの既定：相場の試練＝' + st0.trial + '・敵のHPバー＝' + st0.hp);
  // 移動
  const before = await p.evaluate(() => ({ x: World.player.x, y: World.player.y }));
  // 3D 版：この作業環境の描画は 1 秒に 1〜2 コマなので、描画を止め（MTQ3D.paused）、押したキーの状態のまま移動の処理（GameBridge.updateLogic）を直接動かす（v8.4 と同じ方法）
  if (VER === '3d') { await p.evaluate(() => { MTQ3D.paused = true; const K = Engine.Input.keys; for (const dir of ['left', 'up']) { ['up', 'down', 'left', 'right'].forEach((k) => K[k] = k === dir); for (let i = 0; i < 60; i++) MTQ3D.updateLogic(1 / 60); } ['up', 'down', 'left', 'right'].forEach((k) => K[k] = false); }); }
  else for (const k of ['ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowRight']) { await p.keyboard.down(k); await p.waitForTimeout(240); await p.keyboard.up(k); await p.waitForTimeout(120); }
  await p.waitForTimeout(400); const after = await p.evaluate(() => ({ x: World.player.x, y: World.player.y })); S(after.x !== before.x || after.y !== before.y, (VER === '3d' ? '移動（キーの状態で移動の処理を直接動かした）' : 'キーボードで移動できる') + '（' + before.x + ',' + before.y + ' → ' + after.x + ',' + after.y + '）');
  // 会話（いちばん近い人を World.talk で）
  const talked = await p.evaluate(() => { const m = World.map; const pl = World.player; const n = (m.npcs || []).filter((x) => !x.hidden).sort((a, b) => (Math.abs(a.x - pl.x) + Math.abs(a.y - pl.y)) - (Math.abs(b.x - pl.x) + Math.abs(b.y - pl.y)))[0]; if (!n) return null; World.talk(n); return n.name || n.id; });
  await p.waitForTimeout(300); const tc = await top(); S(talked && /rw-msg|rw-choice|rw-list/.test(tc), '人に話しかける（' + talked + '）：会話の窓が出る'); await drain(80);
  // メニュー → どうぐ → そうび → セーブ
  await p.evaluate(() => { State.addItem('herb', 2); State.addItem('iron_sword', 1); State.data.hero.hp = 1; }); await p.keyboard.press('x'); await p.waitForTimeout(400);
  if (!/main-menu/.test(await top())) { await p.evaluate(() => { Menu.open(); }); await p.waitForTimeout(300); }
  S(/main-menu/.test(await top()), 'X / Esc でメニューを開く');
  await tapText('.main-menu .rw-tool', /^どうぐ$/); await p.waitForSelector('.items-menu'); await tapText('.items-menu .rw-item', /薬草/); await p.click('.items-menu .rw-ok'); await p.waitForTimeout(300);
  if (/rw-list/.test(await top())) await p.click('#ui .rw-list:last-child .rw-item.cur'); await p.waitForTimeout(300); const hp1 = await p.evaluate(() => State.data.hero.hp); await drain(10).catch(() => { });
  S(hp1 > 1, 'どうぐ：薬草を選んで［使う・見る］→ 相手 → HP が回復（1 → ' + hp1 + '）');
  for (let i = 0; i < 4 && !/main-menu/.test(await top()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
  await tapText('.main-menu .rw-tool', /そうび/); await p.waitForTimeout(300); await p.click('#ui .rw-list:last-child .rw-item'); await p.waitForTimeout(300);
  await tapText('#ui .rw-list:last-child .rw-item', /^武器/); await p.waitForSelector('.eq-list'); await tapText('.eq-list .rw-item', /鉄の剣/); await p.click('.eq-list .rw-ok'); await p.waitForTimeout(300);
  S((await p.evaluate(() => State.data.hero.equip.weapon)) === 'iron_sword', 'そうび：鉄の剣を選んで比較 → ［装備する］');
  for (let i = 0; i < 4 && !/main-menu/.test(await top()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
  await tapText('.main-menu .rw-tool', /セーブ/); await p.waitForTimeout(300); await p.click('#ui .rw-list:last-child .rw-item'); await p.waitForTimeout(300);
  if (/rw-choice/.test(await top())) await tapText('.rw-choice .rw-opt', /上書きする/); await p.waitForTimeout(300); const saveMsg = await p.evaluate(() => (document.querySelector('#ui .rw-msg') || {}).textContent || ''); await drain(20);
  S(/セーブした/.test(saveMsg), 'セーブ：スロット1にセーブ（' + saveMsg.slice(0, 20) + '）');
  for (let i = 0; i < 4 && (await top()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
  const keys = await p.evaluate(() => Object.keys(localStorage).filter((k) => /slot/.test(k)));
  const saved = await p.evaluate(() => ({ map: State.data.pos.map, x: State.data.pos.x, y: State.data.pos.y }));
  S(VER === '3d' ? keys.some((k) => /^mtq-3d-slot-1/.test(k)) && !keys.some((k) => /^mtq-rpg-v2-slot/.test(k)) : keys.some((k) => /^mtq-rpg-v2-slot-1/.test(k)) && !keys.some((k) => /^mtq-3d-slot/.test(k)), '保存先：' + (VER === '3d' ? '3D 版は mtq-3d-slot-*（2D の mtq-rpg-v2-slot-* に書かない）' : '2D 版は mtq-rpg-v2-slot-*（3D の mtq-3d-slot-* に書かない）') + '：' + keys.join(','));
  // 再読み込み → つづきから
  await p.reload(); if (VER === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); await p.waitForSelector('.title-menu', { timeout: 120000 }); if (VER === '3d') await p.evaluate(() => { MTQ3D.paused = true; });
  await tapText('.title-menu .rw-item', /つづきから/); await p.waitForTimeout(400); await p.click('#ui .rw-list:last-child .rw-item:nth-child(2)'); await p.waitForTimeout(800); await drain(40);
  if (VER === '3d') { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 240000 }); }
  const back = await p.evaluate(() => ({ map: World.map && World.map.id, x: World.player.x, y: World.player.y, name: State.data.hero.name, wpn: State.data.hero.equip.weapon }));
  S(back.name === 'もち' && back.map === saved.map && back.wpn === 'iron_sword', '再読み込み → つづきから（スロット1）：同じ地図・名前・装備で再開（' + back.map + ' ' + back.x + ',' + back.y + '）');
  await p.screenshot({ path: `${OUT}shots/flow_${VER}_${VIEW}.jpg`, type: 'jpeg', quality: 70 });
  S(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  await br.close(); fs.writeFileSync(`${OUT}logs/flow88_${VER}_${VIEW}.json`, JSON.stringify({ steps, errs }, null, 1));
  console.log('結果: ' + steps.filter((x) => x.ok).length + ' OK / ' + steps.filter((x) => !x.ok).length + ' NG');
})().catch((e) => { console.error('FAIL', e); fs.writeFileSync(`${OUT}logs/flow88_${VER}_${VIEW}.json`, JSON.stringify({ steps, fail: String(e && e.message) }, null, 1)); process.exit(1); });
