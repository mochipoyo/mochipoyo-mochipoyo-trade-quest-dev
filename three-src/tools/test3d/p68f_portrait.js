// v6.8 スマホ縦画面の3Dの戦闘（前後の並び）：コマンド欄を左に、味方と敵を手前（下）に
//   ・コマンド欄が左の列（パーティ欄のすぐ上）にあり、項目が縦に並ぶ
//   ・味方の足もとがパーティ欄のすぐ上、味方・敵がコマンド欄・パーティ欄・メッセージ欄に隠れない
//   ・敵は以前より手前（大きく・下）。横画面と PC の並びは以前と同じ（比べる版：環境変数 OLD_PORT。省略で比べない）
// 作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 PORT・OLD_PORT・SHOTDIR
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770, OLD = process.env.OLD_PORT || null; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v68f/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const CASES = [['iPhone 15 Pro Max', ['slime']], ['iPhone 13', ['slime', 'wolf']], ['iPhone 13', ['wolf', 'harpy', 'rabbit']], ['iPhone 13', ['wolf', 'harpy', 'rabbit', 'slime']], ['iPhone SE (3rd gen)', ['boss_greed_golem']], ['Galaxy S24', ['slime', 'slime', 'slime', 'slime']]];
async function measure(br, port, dev, ens, opt) {
  opt = opt || {}; let o = Object.assign({}, devices[dev] || {}, { deviceScaleFactor: 1 }); if (opt.land) o.viewport = { width: o.viewport.height, height: o.viewport.width }; if (opt.pc) o = { viewport: { width: 1280, height: 720 } };
  const p = await (await br.newContext(o)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:' + port + '/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.hero.level = 12; ['lina', 'kyle', 'gald'].forEach((id) => State.joinCompanion(id)); World.start(); World.busy = false; World.enterMap('world', 28, 62, 'up'); });
  await p.waitForTimeout(2000); await p.evaluate((ens) => { World.busy = false; BattleUI.start(ens, {}); }, ens);
  await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want && document.querySelector('.rw-list.cmd-list'), null, { timeout: 120000 }).catch(() => { });
  await p.waitForTimeout(2500);
  const m = await p.evaluate(() => {
    const sc = BattleUI.scene; const g = document.getElementById('game'); const gr = g.getBoundingClientRect(); const B = MTQ3D.battle; const cv = B.renderer.domElement; const W = cv.width, H = cv.height; const kx = gr.width / W, ky = gr.height / H;
    const pg = (r) => r && { l: gr.left + r.x * kx, t: gr.top + r.y * ky, r: gr.left + (r.x + r.w) * kx, b: gr.top + (r.y + r.h) * ky };
    const R = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
    const items = [...document.querySelectorAll('.rw-list.cmd-list .rw-item')].map((e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top)]; });
    return { vw: innerWidth, vh: innerHeight, game: { l: gr.left, t: gr.top, r: gr.right, b: gr.bottom }, cmd: R('.rw-list.cmd-list'), panel: R('#battle-party'), msg: R('#battle-msg'), items, cls: document.body.className,
      party: sc.b.party.map((a) => pg(BattleStage3D.partyRect(sc, a.id, W, H))), enemies: sc.b.enemies.map((e, i) => { const q = BattleStage3D.rect(sc, i, W, H); return q ? pg({ x: q.x, y: q.y, w: q.w, h: q.h }) : null; }), k: B.viewK || 1 };
  });
  await p.screenshot({ path: SHOT + (opt.tag || 'x') + '.png', timeout: 120000 }); await p.context().close(); m.errs = errs; return m;
}
const inter = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
(async () => {
  const br = await chromium.launch(); const out = [];
  for (const [dev, ens] of CASES) {
    const tag = dev.replace(/[^A-Za-z0-9]+/g, '_') + '_' + ens.length + (ens[0].startsWith('boss') ? 'boss' : '');
    const m = await measure(br, PORT, dev, ens, { tag: 'new_' + tag }); const o = OLD ? await measure(br, OLD, dev, ens, { tag: 'old_' + tag }) : null; out.push({ dev, ens, m, o });
    const nm = dev + '・敵' + ens.length;
    ok(/m-port/.test(m.cls) && /g3-front/.test(m.cls), nm + '：縦画面の前後の並び');
    ok(m.cmd && m.cmd.l < 12 && m.cmd.r < m.vw * 0.45 && Math.abs(m.cmd.b - m.panel.t) < 12 && m.items.length >= 6 && m.items.every((q) => q[0] === m.items[0][0]), nm + '：コマンド欄は左の列（パーティ欄のすぐ上・項目は縦に並ぶ）' + JSON.stringify({ cmd: m.cmd && [m.cmd.l, m.cmd.t, m.cmd.r, m.cmd.b].map(Math.round), n: m.items.length }));
    const pb = Math.max(...m.party.map((q) => q.b)); ok(m.panel.t - pb >= -2 && m.panel.t - pb < 26, nm + '：味方の足もとがパーティ欄のすぐ上（すき間 ' + Math.round(m.panel.t - pb) + 'px）');
    const all = m.party.concat(m.enemies.filter(Boolean)); ok(all.every((q) => !inter(q, m.cmd) && !inter(q, m.panel) && !inter(q, m.msg) && q.l >= m.game.l - 1 && q.r <= m.game.r + 1), nm + '：味方・敵がコマンド欄・パーティ欄・メッセージ欄に隠れず、画面の中');
    if (o) {
      const eh = (x) => Math.max(...x.enemies.filter(Boolean).map((q) => q.b - q.t)), ph = (x) => Math.max(...x.party.map((q) => q.b - q.t)), pbo = Math.max(...o.party.map((q) => q.b));
      ok(pb > pbo + 20, nm + '：味方が以前より下（手前）：' + Math.round(pbo) + ' → ' + Math.round(pb));
      console.log('     大きさ（以前 → 今）：敵の高さ ' + Math.round(eh(o)) + ' → ' + Math.round(eh(m)) + '・味方の高さ ' + Math.round(ph(o)) + ' → ' + Math.round(ph(m)) + '・k ' + o.k.toFixed(2) + ' → ' + m.k.toFixed(2));
      const eb = (x) => Math.max(...x.enemies.filter(Boolean).map((q) => q.b)); ok(eb(m) > eb(o) + 40, nm + '：敵が以前より下（手前）：足もと ' + Math.round(eb(o)) + ' → ' + Math.round(eb(m)));
      if (ens.length <= 2) ok(eh(m) >= eh(o) * 0.97, nm + '：敵が以前より小さくならない');
    }
    ok(m.errs.length === 0, nm + '：ページのエラーなし ' + JSON.stringify(m.errs.slice(0, 2)));
  }
  if (OLD) {   // 横画面・PC は以前と同じ
    for (const [dev, opt] of [['iPhone 13', { land: true }], ['', { pc: true }]]) {
      const tag = opt.pc ? 'pc' : 'land'; const m = await measure(br, PORT, dev, ['slime', 'wolf'], Object.assign({ tag: 'new_' + tag }, opt)), o = await measure(br, OLD, dev, ['slime', 'wolf'], Object.assign({ tag: 'old_' + tag }, opt));
      const A = m.party.concat(m.enemies), Bq = o.party.concat(o.enemies); let dmax = 0; A.forEach((q, i) => { const r = Bq[i]; if (!q || !r) { dmax = 999; return; } ['l', 't', 'r', 'b'].forEach((k) => { dmax = Math.max(dmax, Math.abs(q[k] - r[k])); }); });   // 待機の揺れ（時刻で上下する）のぶん、数px の差は同じとみなす
      const same = dmax <= 4 && JSON.stringify(m.cmd) === JSON.stringify(o.cmd);
      ok(same, (opt.pc ? 'PC' : '横画面') + '：味方・敵・コマンド欄の位置は以前と同じ（いちばん大きい差 ' + Math.round(dmax) + 'px・待機の揺れのぶん）');
    }
  }
  fs.writeFileSync(SHOT + 'result.json', JSON.stringify({ out, fails }, null, 1)); console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})();
