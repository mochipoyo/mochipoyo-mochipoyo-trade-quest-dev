// v6.8 探索用3Dモデル（TradeQuest_Field_Companions_3D）の受け入れ確認
//   ・港町マリナとワールドで、主人公＋カイル・リーナ・ガルドを正面（下へ進む）・横（右へ）・背面（上へ）から、走行・歩行・停止で撮る
//   ・隊列の仲間が field_<人物ID> の立体モデル（SkinnedMesh・人物スプライトなし・Idle/Walk/Run）で、状態に合った動きを再生しているか
//   ・カイルの剣盾・リーナの杖・ガルドの斧：手の骨だけに付いた頂点が、歩いても手との距離を保つ（手に追従する）
//   ・加入前の NPC（カイル・カズト・もちぽよ・ポン太）、16人の編成替え、転職、編成から外した仲間、乗船、戦闘不能の半透明、戦闘から戻ったとき
// 作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 DEV（Playwright の端末名）・LAND・TAG・SHOTDIR・PORT・PART（all／walk／hands／checks）
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v68g/'; fs.mkdirSync(SHOT, { recursive: true });
const TAG = process.env.TAG || (process.env.DEV ? process.env.DEV.replace(/[^A-Za-z0-9]+/g, '_') : 'pc'); const PART = process.env.PART || 'all';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const ALL16 = ['lina', 'kyle', 'gald', 'mina', 'seris', 'lucia', 'elna', 'nagi', 'iris', 'sophia', 'io', 'ganes', 'aster', 'ord', 'kazuto', 'mochipoyo'];
(async () => {
  const br = await chromium.launch(); let o = { viewport: { width: 1280, height: 720 } };
  if (process.env.DEV) { o = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }); if (process.env.LAND) o.viewport = { width: o.viewport.height, height: o.viewport.width }; }
  const p = await (await br.newContext(o)).newPage(); const errs = [], bad = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace(/^.*\/3d\//, '')); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  const out = { tag: TAG, walk: [], checks: {} };
  const shot = (n) => p.screenshot({ path: SHOT + TAG + '_' + n + '.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  const enter = async (map, x, y, dir) => { await p.evaluate(({ map, x, y, dir }) => { World.busy = false; World.enterMap(map, x, y, dir || 'down'); }, { map, x, y, dir }); await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, map, { timeout: 90000 }).catch(() => { }); await p.waitForTimeout(1200); };
  const loaded = () => p.waitForFunction(() => { const f = MTQ3D.followers; const ids = State.data.party.filter((id) => id !== 'hero'); return f && ids.every((id) => f.get(id) && f.get(id).ch); }, null, { timeout: 60000 }).catch(() => { });
  // 隊列の状態：モデル・表示・動き・立体か・スプライトの有無・不透明度
  const fstate = () => p.evaluate(() => { const out = []; (MTQ3D.followers || new Map()).forEach((e, id) => { let skin = false, sprite = false, op = 1; if (e.ch) e.ch.model.traverse((o) => { skin = skin || !!o.isSkinnedMesh; sprite = sprite || !!o.isSprite; if (o.isMesh && o.material) [].concat(o.material).forEach((m) => { op = Math.min(op, m.opacity); }); });
    const clip = e.ch && e.ch.current ? e.ch.current.getClip().name : null; out.push({ id, model: e.model, visible: !!(e.ch && e.ch.root.visible), clip, skin, sprite, op: +op.toFixed(2), anims: e.ch ? ['Idle', 'Walk', 'Run'].filter((k) => e.ch.has(k)) : [], name: e.ch ? e.ch.root.name : null, uuid: e.ch ? e.ch.root.uuid : null }); }); return out; });
  const heroClip = () => p.evaluate(() => { const h = MTQ3D.hero || MTQ3D.player || null; return h && h.current ? h.current.getClip().name : null; });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.hero.level = 20; World.encounter = function () { };   /* このテストのページだけ：歩いているあいだのランダムな戦闘を止める（隊列の確認のじゃまをしない） */ ['kyle', 'lina', 'gald'].forEach((id) => State.joinCompanion(id)); d.party = ['hero', 'kyle', 'lina', 'gald']; World.start(); World.busy = false; });

  if (PART === 'all' || PART === 'walk' || PART === 'hands') {
    if (PART === 'hands') { await enter('world', 28, 64, 'down'); await loaded(); }
    for (const [map, x, y] of (PART === 'hands' ? [] : [['world', 28, 64], ['harbor_town', 20, 6]])) {
      await enter(map, x, y, 'down'); await loaded();
      await p.evaluate(() => { for (let i = 0; i < 4; i++) MTQ3D.camera.zoom(0.82); });   // 近くから撮る（カメラを寄せる）
      for (const [key, view] of [['ArrowDown', 'front'], ['ArrowRight', 'side'], ['ArrowUp', 'back']]) {
        // 走行（そのまま押す）→ 歩行（Shift を押したまま）→ 停止
        await p.keyboard.down(key); await p.waitForTimeout(1300); const fRun = await fstate(); const hRun = await heroClip(); await shot(map + '_' + view + '_run');
        await p.keyboard.down('Shift'); await p.waitForTimeout(1100); const fWalk = await fstate(); const hWalk = await heroClip(); await shot(map + '_' + view + '_walk');
        await p.keyboard.up(key); await p.keyboard.up('Shift'); await p.waitForTimeout(1300); const fIdle = await fstate(); const hIdle = await heroClip(); await shot(map + '_' + view + '_idle');
        const vis = (fs) => fs.filter((q) => q.visible && ['kyle', 'lina', 'gald'].includes(q.id));
        const nm = map + '・' + view;
        ok(vis(fRun).length === 3 && vis(fRun).every((q) => q.model === 'field_' + q.id && q.skin && !q.sprite && q.anims.length === 3), nm + '：カイル・リーナ・ガルドが本人の立体モデル（SkinnedMesh・スプライトなし・Idle/Walk/Run）');
        ok(vis(fRun).every((q) => q.clip === 'Run'), nm + '：走ると仲間も Run（' + vis(fRun).map((q) => q.id + ':' + q.clip).join(' ') + '・主人公 ' + hRun + '）');
        ok(vis(fWalk).every((q) => q.clip === 'Walk'), nm + '：歩くと仲間も Walk（' + vis(fWalk).map((q) => q.id + ':' + q.clip).join(' ') + '・主人公 ' + hWalk + '）');
        ok(vis(fIdle).every((q) => q.clip === 'Idle'), nm + '：止まると仲間も Idle（' + vis(fIdle).map((q) => q.id + ':' + q.clip).join(' ') + '・主人公 ' + hIdle + '）');
        out.walk.push({ map, view, run: fRun, walk: fWalk, idle: fIdle, hero: [hRun, hWalk, hIdle] });
      }
    }
    // 手の骨に付いた頂点（武器・盾・杖）が、手との距離を保つか（歩行の2つの時刻で比べる）
    await p.keyboard.down('ArrowRight'); await p.keyboard.down('Shift'); await p.waitForTimeout(700);
    const r1 = await p.evaluate(() => { const res = {}; MTQ3D.followers.forEach((e, id) => { if (!e.ch) return; let sm = null; e.ch.model.traverse((o) => { if (o.isSkinnedMesh && !sm) sm = o; }); const sk = sm.skeleton; const out = {};
      for (const hand of ['hand.R', 'hand.L']) { const bi = sk.bones.findIndex((b) => b.name === hand || b.name === hand.replace('.', ''));   /* three.js は骨の名前の「.」を取り除く（hand.R → handR） */ if (bi < 0) continue; const si = sm.geometry.attributes.skinIndex, sw = sm.geometry.attributes.skinWeight; const idx = []; for (let i = 0; i < si.count; i++) { for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi && sw.getComponent(i, k) > 0.99) { idx.push(i); break; } }
        const bw = sk.bones[bi].getWorldPosition(sk.bones[bi].position.clone()); const v = sk.bones[bi].position.clone(); out[hand] = { n: idx.length, ds: idx.map((i) => { sm.getVertexPosition(i, v); sm.localToWorld(v); return +v.distanceTo(bw).toFixed(4); }), hp: [bw.x, bw.y, bw.z].map((q) => +q.toFixed(3)) }; }
      res[id] = out; }); return res; });
    await p.waitForTimeout(380);
    const r2 = await p.evaluate(() => { const res = {}; MTQ3D.followers.forEach((e, id) => { if (!e.ch) return; let sm = null; e.ch.model.traverse((o) => { if (o.isSkinnedMesh && !sm) sm = o; }); const sk = sm.skeleton; const out = {};
      for (const hand of ['hand.R', 'hand.L']) { const bi = sk.bones.findIndex((b) => b.name === hand || b.name === hand.replace('.', ''));   /* three.js は骨の名前の「.」を取り除く（hand.R → handR） */ if (bi < 0) continue; const si = sm.geometry.attributes.skinIndex, sw = sm.geometry.attributes.skinWeight; const idx = []; for (let i = 0; i < si.count; i++) { for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi && sw.getComponent(i, k) > 0.99) { idx.push(i); break; } }
        const bw = sk.bones[bi].getWorldPosition(sk.bones[bi].position.clone()); const v = sk.bones[bi].position.clone(); out[hand] = { n: idx.length, ds: idx.map((i) => { sm.getVertexPosition(i, v); sm.localToWorld(v); return +v.distanceTo(bw).toFixed(4); }), hp: [bw.x, bw.y, bw.z].map((q) => +q.toFixed(3)) }; }
      res[id] = out; }); return res; });
    await p.keyboard.up('ArrowRight'); await p.keyboard.up('Shift');
    for (const id of ['kyle', 'lina', 'gald']) {
      const sum = {}; let rigid = true, far = 0, moved = 0;
      for (const hand of ['hand.R', 'hand.L']) { const a = r1[id] && r1[id][hand], b = r2[id] && r2[id][hand]; if (!a || !b) continue; const dmax = a.ds.reduce((m, d, i) => Math.max(m, Math.abs(d - b.ds[i])), 0); const f = a.ds.filter((d) => d > 0.12).length; far += f; moved = Math.max(moved, Math.hypot(a.hp[0] - b.hp[0], a.hp[1] - b.hp[1], a.hp[2] - b.hp[2])); if (dmax > 0.01) rigid = false; sum[hand] = { verts: a.n, farFromWrist: f, maxDist: +Math.max(...a.ds).toFixed(3), distChange: +dmax.toFixed(4) }; }
      out.checks['hand_' + id] = sum;
      ok(far > 20 && rigid && moved > 0.02, id + '：手の骨だけに付いた部品（手首から離れた頂点 ' + far + '個）が、歩いて手が ' + moved.toFixed(2) + ' 動いても手との距離を保つ ' + JSON.stringify(sum));
    }
  }

  if (PART === 'all' || PART === 'checks') {
    // 加入前の NPC（カイル・カズト・もちぽよ・ポン太）
    const npcs = [];
    await p.evaluate(() => { const d = State.data; ['kyle', 'kazuto', 'mochipoyo'].forEach((id) => { delete d.companions[id]; }); d.party = ['hero', 'lina']; d.flags.ponta_joined = false; d.flags.kyle_joined = false; });
    for (const [map, x, y, id] of [['rivel_tavern', 5, 7, 'kyle'], ['magicka_tavern', 8, 7, 'kazuto'], ['tradia_tavern', 10, 8, 'mochipoyo'], ['star_camp', 6, 12, 'ponta']]) {
      await enter(map, x, y, 'up'); await p.waitForTimeout(2300);
      const r = await p.evaluate((id) => { const sc = MTQ3D.current; const ch = (sc.npcs || []).find((c) => c.npc && c.npc.id === id); if (!ch) return null; let skin = false, sprite = false; ch.model.traverse((o) => { skin = skin || !!o.isSkinnedMesh; sprite = sprite || !!o.isSprite; }); return { name: ch.root.name, visible: ch.root.visible, skin, sprite, clip: ch.current ? ch.current.getClip().name : null, anims: ['Idle', 'Walk', 'Run'].filter((k) => ch.has(k)) }; }, id);
      npcs.push({ id, map, r }); await shot('npc_' + id);
      ok(r && r.name === 'char_field_' + id && r.visible && r.skin && !r.sprite && r.anims.length === 3, '加入前の ' + id + '（' + map + '）：移動用GLB ' + JSON.stringify(r));
    }
    const pf = await p.evaluate(() => (MTQ3D.followers ? [...MTQ3D.followers.keys()] : [])); ok(!pf.includes('ponta'), 'ポン太は隊列に入らない（' + pf.join(',') + '）');
    out.checks.npcs = npcs;
    // 16人の編成替え（3人ずつ）・外した仲間が残らない
    await p.evaluate((all) => { all.forEach((id) => { if (!State.data.companions[id]) State.joinCompanion(id); }); }, ALL16);
    await enter('world', 28, 64, 'down');
    const groups = []; for (let i = 0; i < ALL16.length; i += 3) groups.push(ALL16.slice(i, i + 3));
    const seenModel = {};
    for (const g of groups) {
      await p.evaluate((g) => { State.data.party = ['hero'].concat(g); }, g); await loaded();
      await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(900);
      const st = await fstate(); const vis = st.filter((q) => q.visible).map((q) => q.id).sort();
      if (JSON.stringify(vis) !== JSON.stringify(g.slice().sort())) console.log('   診断', JSON.stringify(await p.evaluate(() => ({ party: State.data.party, pos: Follow.positions().map((f) => f.id), en: Follow.enabled && Follow.enabled(), aboard: MTQ3D.aboardNow, busy: World.busy, top: Engine.top() === World.scene, diag: MTQ3D.diagText().slice(0, 200), map: World.map.id, cur: MTQ3D.current && MTQ3D.current.map.id }))));
      g.forEach((id) => { const q = st.find((x) => x.id === id); if (q) seenModel[id] = q; });
      ok(JSON.stringify(vis) === JSON.stringify(g.slice().sort()) && g.every((id) => { const q = st.find((x) => x.id === id); return q && q.model === 'field_' + id && q.skin && !q.sprite && q.anims.length === 3; }), '編成 ' + g.join('・') + '：本人の立体モデルだけが見える（見えている ' + vis.join(',') + '）');
      await shot('roster_' + g.join('_'));
    }
    ok(ALL16.every((id) => seenModel[id] && seenModel[id].model === 'field_' + id), '16人すべてを本人のモデルで確認（' + Object.keys(seenModel).length + '人）');
    // 転職：同じ人物のモデルのまま（作り直さない）
    await p.evaluate(() => { State.data.party = ['hero', 'kyle', 'lina', 'gald']; }); await loaded(); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(800); await p.keyboard.up('ArrowLeft'); await p.waitForTimeout(600);
    const before = await fstate();
    const jobs = await p.evaluate(() => { const r = []; for (const [id, job] of [['kyle', 'mage'], ['lina', 'thief'], ['gald', 'priest']]) { const a = State.data.companions[id]; if (window.JOBS[job]) { Actors.changeJob(a, job); r.push(id + '→' + job + '(' + a.sprite + ')'); } } return r; });
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1600); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(700);
    const after = await fstate();
    const jd = ['kyle', 'lina', 'gald'].map((id) => { const a = before.find((q) => q.id === id), b = after.find((q) => q.id === id); return { id, model: b && b.model, same: !!(a && b && a.uuid === b.uuid), visible: !!(b && b.visible) }; });
    ok(jd.every((q) => q.model === 'field_' + q.id && q.same), '転職（' + jobs.join(' ') + '）のあとも同じ人物のモデル（作り直さない）' + JSON.stringify(jd));
    // 乗船：隊列は消える → 降りると戻る
    await p.evaluate(() => { State.data.aboard = 'sailboat'; }); await p.waitForTimeout(900); const ship = await fstate();
    ok(ship.every((q) => !q.visible), '乗船中は隊列の仲間が見えない（' + ship.filter((q) => q.visible).map((q) => q.id).join(',') + '）');
    await p.evaluate(() => { State.data.aboard = null; }); await p.keyboard.down('ArrowDown'); await p.waitForTimeout(800); await p.keyboard.up('ArrowDown'); await p.waitForTimeout(800); const land = await fstate();
    ok(['kyle', 'lina', 'gald'].every((id) => { const q = land.find((x) => x.id === id); return q && q.visible; }), '船を降りると隊列が戻る');
    // 戦闘不能：半透明 → 復帰で戻る
    await p.evaluate(() => { const a = State.data.companions.kyle; a.hp = 0; a.dead = true; }); await p.waitForTimeout(800); const dead = await fstate(); await shot('dead_kyle');
    await p.evaluate(() => { const a = State.data.companions.kyle; a.dead = false; Actors.fullHeal(a); }); await p.waitForTimeout(800); const alive = await fstate();
    const dk = dead.find((q) => q.id === 'kyle'), ak = alive.find((q) => q.id === 'kyle');
    ok(dk && dk.op <= 0.46 && ak && ak.op === 1, 'カイルが戦闘不能のときは半透明（' + (dk && dk.op) + '）、回復すると元に戻る（' + (ak && ak.op) + '）');
    // 戦闘に入って戻る
    await p.evaluate(() => { World.busy = false; window.__bp = BattleUI.start(['slime'], {}); }); await p.waitForTimeout(3500);
    await p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg, #auto-battle').forEach((n) => n.remove()); World.busy = false; } catch (e) { } });
    await p.keyboard.down('ArrowDown'); await p.waitForTimeout(900); await p.keyboard.up('ArrowDown'); await p.waitForTimeout(900); const back = await fstate();
    ok(['kyle', 'lina', 'gald'].every((id) => { const q = back.find((x) => x.id === id); return q && q.visible && q.model === 'field_' + id && q.skin && !q.sprite; }), '戦闘から戻ると、探索の立体モデルに戻る');
    await shot('after_battle');
    out.checks.roster = seenModel; out.checks.jobs = jobs;
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  ok(bad.length === 0, '読み込みの失敗なし ' + JSON.stringify(bad.slice(0, 5)));
  out.fails = fails; out.errs = errs; out.bad = bad; fs.writeFileSync(SHOT + TAG + '_result.json', JSON.stringify(out, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})();
