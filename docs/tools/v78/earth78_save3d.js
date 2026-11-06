// v7.8 地球の世界（3D）：前の版（地球の前＝envsnap_t84）のセーブを 3D 版で読む → 地球の新しい場所（ポヨ村の横・帆船は港町マリナの近くの海）。
//   3D 版の保存先にセーブ → ページを読み直して続きから。2D 版の通常のセーブは変わらない（ヘッドレス・低画質）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const OLD = process.env.OLD || '/home/claude/envsnap_t84/';
const oldSave = require('child_process').execFileSync('node', ['-e', `const load=require('./rpgload.js');const A=load();const w=A.w;const S=w.State;S.newGame('ふるい','warrior');const d=S.data;
d.flags.s3121_new_prologue=true;d.flags.s3121_prologue_phase='done';d.flags.ship_ready=true;d.hero.level=30;d.gold=4321;
const ex=w.MAP_DEFS.poyo_village.warps.find(q=>q.to==='world');d.pos={map:'world',x:ex.tx,y:ex.ty,dir:'down'};d.vehicles.sailboat={owned:true,map:'world',x:19,y:72,port:{map:'world',x:19,y:72}};d.visited.world=true;process.stdout.write(S.exportJSON());`], { cwd: '/home/claude/work', env: Object.assign({}, process.env, { RPG_DIR: OLD }), maxBuffer: 1 << 26 }).toString();
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const errs = []; const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate((txt) => { localStorage.setItem('mtq-rpg-v2-slot-2', txt); }, oldSave);
  const norm0 = await p.evaluate(() => localStorage.getItem('mtq-rpg-v2-slot-2'));
  const clean = () => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
  const waitCur = (id) => p.waitForFunction((id) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === id && World.map.id === id && !MTQ3D.building, id, { timeout: 180000 }).then(() => true).catch(() => false);
  await clean();
  const r1 = await p.evaluate((txt) => { const d = State.importJSON(txt); State.data = d; World.start(); World.encounter = () => { }; const m = World.map; const L = m.def.locations.find((l) => l.id === 'poyo_village'); const sb = d.vehicles.sailboat; const mar = m.def.locations.find((l) => l.id === 'harbor');
    return { earth: World76.earth, map: m.id, x: World.player.x, y: World.player.y, poyo: [L.x, L.y], walk: m.passable(World.player.x, World.player.y, d), sb: [sb.map, sb.x, sb.y], sbWater: Tiles.isWater(World.getMap(sb.map).tiles[sb.y][sb.x]), marina: mar ? [mar.x, mar.y] : null, ver: d.remakeVer && d.remakeVer.world, gold: d.gold }; }, oldSave);
  ok(r1.earth && r1.map === 'world' && Math.abs(r1.x - r1.poyo[0]) + Math.abs(r1.y - r1.poyo[1]) <= 3 && r1.walk && r1.gold === 4321 && r1.ver, '前の版のセーブ → 地球：ポヨ村（新しい場所）のすぐ横の歩けるマス ' + JSON.stringify(r1));
  ok(r1.sbWater && r1.marina && Math.abs(r1.sb[1] - r1.marina[0]) + Math.abs(r1.sb[2] - r1.marina[1]) <= 12, '帆船は港町マリナ（新しい場所）の近くの海 ' + JSON.stringify({ sb: r1.sb, marina: r1.marina }));
  ok(await waitCur('world'), '3D：地球の世界のアルカディアを表示');
  const s1 = await p.evaluate(() => { const saved = State.save(3); const d2 = State.load(3); return { saved, map: d2.pos.map, x: d2.pos.x, y: d2.pos.y, key: State.keyPrefix }; });
  ok(s1.saved && s1.map === 'world' && s1.x === r1.x && s1.y === r1.y && s1.key === 'mtq-3d-slot-', '3D 版の保存先（' + s1.key + '）にセーブして読み直せる ' + JSON.stringify(s1));
  await p.reload(); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); await clean();
  const r2 = await p.evaluate(() => { State.data = State.load(3); World.start(); return { map: World.map.id, x: World.player.x, y: World.player.y }; });
  ok(r2.map === 'world' && r2.x === r1.x && r2.y === r1.y, 'ページを読み直しても、同じ場所から続けられる（二重に変換しない）' + JSON.stringify(r2));
  ok(await waitCur('world'), '3D：読み直したあと表示');
  const norm1 = await p.evaluate(() => localStorage.getItem('mtq-rpg-v2-slot-2'));
  ok(norm0 === norm1, '2D 版の通常のセーブ（mtq-rpg-v2-slot-2）は 3D 版の操作で変わらない');
  await p.screenshot({ path: SHOT + 'save3d_continue.jpg', type: 'jpeg', quality: 72, timeout: 120000 });
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
