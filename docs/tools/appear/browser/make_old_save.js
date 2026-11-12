// v9.8.5 以前の版のゲームを実際に動かして、テスト用のセーブを作る（ヘッドレス Chromium）
//   以前の版のコミットを git archive で取り出したフォルダを配信し（URL0）、その版のコードで：はじめから → 仲間が加入 → 品を入手 → 装備（その版の Services.equipItem）→ State.save(1)
//   その版が LocalStorage に書いたものを、そのまま JSON に写す（docs/appear/pixel/fixtures/save_<名前>.json）
//   URL0=http://localhost:8895/3d/index.html  NAME=v983  COMMIT=8861f81  node docs/tools/appear/browser/make_old_save.js
const { chromium } = require('playwright'); const fs = require('fs');
const URL0 = process.env.URL0; const NAME = process.env.NAME; const COMMIT = process.env.COMMIT || ''; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/fixtures/';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto(URL0 + '?nosw'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  const r = await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done';
    ['lina', 'mina', 'kyle'].forEach((id) => State.joinCompanion(id));
    const give = { iron_armor: 2, iron_helm: 1, steel_sword: 1, copper_sword: 2, short_bow: 2, dagger: 1, robe_skip: 1, oak_staff: 1, leather_cap: 1, iron_shield: 1, iron_spear: 1, herb: 5 };
    Object.keys(give).forEach((id) => State.addItem(id, give[id]));
    const eq = { hero: ['iron_armor', 'iron_helm', 'steel_sword'], lina: ['robe_skip', 'oak_staff', 'leather_cap'], mina: ['copper_sword'], kyle: ['iron_armor', 'iron_shield', 'iron_spear'] };
    Object.keys(eq).forEach((id) => eq[id].forEach((it) => Services.equipItem(State.actor(id), it)));
    d.gold = 1234; const ok = State.save(1);
    const keys = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); keys[k] = localStorage.getItem(k); }
    return { ok, keys, version: (window.MTQ_VERSION || (window.MTQ3D && MTQ3D.version) || null), party: d.party.slice(), equip: Object.fromEntries(d.party.map((id) => [id, Object.assign({}, State.actor(id).equip)])), inventory: JSON.parse(JSON.stringify(d.inventory || d.items || null)), gold: d.gold,
      ea: window.EQUIP_PIXELS ? { version: EQUIP_PIXELS.version, actors: Object.keys(EQUIP_PIXELS.actors) } : null };
  });
  await br.close();
  let ver = null; try { ver = JSON.parse(fs.readFileSync(process.env.SRC + '/version.json', 'utf8')); } catch (e) { }
  const fx = { note: '以前の版のゲームを実際に動かして作ったテスト用のセーブ。LocalStorage の中身をそのまま写したもの（手で書き換えない）', madeWith: { commit: COMMIT, name: NAME, versionJson: ver, equipPixels: r.ea, url: URL0.replace(/^https?:\/\/[^/]+/, '') }, expect: { party: r.party, equip: r.equip, inventory: r.inventory, gold: r.gold }, localStorage: r.keys };
  fs.writeFileSync(OUT + 'save_' + NAME + '.json', JSON.stringify(fx, null, 1));
  console.log('結果 make_old_save ' + NAME + '：' + (r.ok ? 'OK' : 'NG') + ' キー ' + Object.keys(r.keys).join(',') + ' 装備 ' + JSON.stringify(r.equip.mina) + ' 外見の版 ' + JSON.stringify(r.ea));
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
