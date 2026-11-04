// v7.3 3D 版：家の台所・トイレ・本の並ぶ本棚（Furniture73）、町の動物（Animal3D）と個性的な町の人、IQテストの館、型を変えた新しい地区が組み立つか。SPOTS="map:x:y,..."
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v73/'; fs.mkdirSync(SHOT, { recursive: true });
const SPOTS = (process.env.SPOTS || 'tradia_house:5:7,poyo_house:5:7,harbor_house:5:7,tradia_iq73:5:7,rivel_castle_library:5:5,poyo_village:30:20,dow_village:52:18,tradia:58:20,magicka_city:56:16,sahar_city:52:15,harbor_town:60:21,rivel_castle:14:22').split(',');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = [], warns = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'warning' && /furniture73|animal|Error/i.test(m.text())) warns.push(m.text()); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => {}; });
  const tot = { animals: 0, anim3d: 0, stove: 0, toilet: 0, books: 0, u73: 0 };
  for (const s of SPOTS) {
    const [m, x, y] = s.split(':'); const t0 = Date.now();
    await p.evaluate(([m, x, y]) => { World.busy = false; World.enterMap(m, +x, +y, 'up'); }, [m, x, y]);
    const built = await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, m, { timeout: 180000, polling: 200 }).then(() => true).catch(() => false);
    if (!built) { ok(false, m + '：3D が組み立たない'); continue; }
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const sc = MTQ3D.current; const f = sc.furniture || {}; let an = 0, sprites = 0, meshes = 0, u73 = 0, walking = 0;
      for (const ch of sc.npcs) { if (ch.isAnimal) { an++; ch.root.traverse((o) => { if (o.isSprite) sprites++; if (o.isMesh) meshes++; }); if (ch.walking) walking++; } if (ch.npc && /^u73_/.test(ch.npc.id)) u73++; }
      const want = (World.map.npcs || []).filter((n) => /^animal_/.test(n.sprite)).length;
      return { w: World.map.w, h: World.map.h, f, an, want, sprites, meshes, u73, walking };
    });
    tot.animals += r.want; tot.anim3d += r.an; tot.stove += (r.f.stove || 0); tot.toilet += (r.f.toilet || 0); tot.books += (r.f.bookshelf || 0); tot.u73 += r.u73;
    ok(r.an === r.want && r.sprites === 0, m + '：組み立て ' + (Date.now() - t0) + 'ms・' + r.w + '×' + r.h + '・動物 ' + r.an + '/' + r.want + '（立体の部品 ' + r.meshes + '・Sprite ' + r.sprites + '）・個性的な人 ' + r.u73 + '・家具 ' + JSON.stringify(r.f));
    await p.screenshot({ path: SHOT + m + '_' + x + '_' + y + '.jpg', type: 'jpeg', quality: 72 });
  }
  ok(tot.stove > 0 && tot.toilet > 0 && tot.books > 0, '台所・トイレ・本の並ぶ本棚が 3D で組み立つ ' + JSON.stringify(tot));
  ok(tot.anim3d > 0 && tot.anim3d === tot.animals, '町の動物が 3D で出る（立体・Sprite なし） ' + tot.anim3d);
  ok(errs.length === 0 && warns.length === 0, 'ページのエラー・組み立ての警告なし ' + JSON.stringify(errs.concat(warns).slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
