// スマホの3Dの戦闘：画面部品（メッセージ・コマンド欄・パーティ欄・オート・操作パネル）が、3Dの味方・敵をどれだけ隠すかを測る
//   TAG=名前 node p2_mobile2.js [端末名 ...]   （Playwright の devices の名前。DSF=1 で軽く撮る）
const { chromium, devices } = require('playwright'); const fs = require('fs');
const SHOT = '/home/claude/work/p3d/shots/'; const TAG = process.env.TAG || 'm2';
const DEVS = process.argv.slice(2).length ? process.argv.slice(2) : ['iPhone 13 landscape', 'iPhone 13', 'iPhone SE (3rd gen)', 'iPhone SE (3rd gen) landscape', 'Pixel 7 landscape', 'Galaxy S24', 'iPhone SE landscape'];
const SETS = (process.env.SETS || 'poyo_village:wolf,harpy,rabbit,slime|rivel_castle:boss_valen').split('|');
(async () => {
  const br = await chromium.launch(); const errs = []; const out = [];
  for (const name of DEVS) {
    const dev = Object.assign({}, devices[name], { deviceScaleFactor: +(process.env.DSF || 1) });
    const ctx = await br.newContext(dev); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 240000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.timeOfDay = 0.42; ['lina', 'kyle', 'gald'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('poyo_village', 24, 30, 'down'); });
    for (const set of SETS) {
      const [mapId, ids] = set.split(':');
      await p.evaluate((m) => { if (World.map !== m) { const defs = window.MAP_DEFS; let e = null; for (const k in defs) (defs[k].warps || []).forEach((w) => { if (!e && w.to === m && k !== m) e = { x: w.tx, y: w.ty }; }); World.enterMap(m, e ? e.x : 2, e ? e.y : 2, 'down'); } }, mapId); await p.waitForTimeout(1200);
      await p.evaluate((ids) => { BattleUI.start(ids.split(',')); }, ids);
      await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want && document.querySelector('.rw-list.cmd-list'), null, { timeout: 240000 }).catch(() => {});
      await p.waitForTimeout(1500);
      const m = await p.evaluate(() => {
        const sc = BattleUI.scene; const g = document.getElementById('game'); const gr = g.getBoundingClientRect(); const W = g.width, H = g.height; const kx = gr.width / W, ky = gr.height / H;
        const toPage = (r) => r && { x: gr.left + r.x * kx, y: gr.top + r.y * ky, w: r.w * kx, h: r.h * ky };
        const vis = (el) => { if (!el) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const ui = []; const add = (sel, name) => document.querySelectorAll(sel).forEach((el) => { if (vis(el)) { const r = el.getBoundingClientRect(); ui.push({ name, x: r.left, y: r.top, w: r.width, h: r.height, op: +getComputedStyle(el).opacity }); } });
        add('#battle-msg', 'msg'); add('#battle-party', 'party'); add('.rw-list.cmd-list', 'cmd'); add('#auto-battle', 'auto'); add('#pad .mp-stick', 'stick'); add('#pad .dpad', 'dpad'); add('#pad .mp-b', 'btn'); add('#pad .mp-t', 'tool'); add('#g3-tools button', 'g3tool');
        const cover = (r, part) => { if (!r) return null; let n = 0, c = 0; const y0 = r.y, y1 = r.y + r.h * (part || 1); const by = {}; for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const x = r.x + (i + 0.5) / 16 * r.w, y = y0 + (j + 0.5) / 16 * (y1 - y0); n++; const off = x < gr.left || x > gr.right || y < gr.top || y > gr.bottom; const hit = off ? { name: 'offscreen' } : ui.find((u) => x >= u.x && x <= u.x + u.w && y >= u.y && y <= u.y + u.h); if (hit) { c++; by[hit.name] = (by[hit.name] || 0) + 1; } } return { pct: Math.round(100 * c / n), by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round(100 * v / n)])) }; };
        const party = sc.b.party.map((a) => { const r = toPage(BattleStage3D.partyRect(sc, a.id, W, H)); return { id: a.id, rect: r && [r.x, r.y, r.w, r.h].map(Math.round), all: cover(r), top: cover(r, 0.5) }; });
        const enemies = sc.b.enemies.map((e, i) => { const r = toPage(BattleStage3D.rect(sc, i, W, H)); return { id: e.defId, rect: r && [r.x, r.y, r.w, r.h].map(Math.round), all: cover(r) }; });
        const cmd = document.querySelector('.rw-list.cmd-list'); const items = cmd ? [...cmd.querySelectorAll('.rw-item')].map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }) : [];
        return { view: innerWidth + 'x' + innerHeight, game: [gr.left, gr.top, gr.width, gr.height].map(Math.round), canvas: W + 'x' + H, cls: document.body.className, ui: ui.map((u) => u.name + ':' + [u.x, u.y, u.w, u.h].map(Math.round).join(',')), items, party, enemies };
      });
      const safe = name.replace(/[^A-Za-z0-9]+/g, '_');
      await p.screenshot({ path: SHOT + TAG + '_' + safe + '_' + mapId + '.png', timeout: 180000 });
      out.push({ dev: name, set, m });
      const pw = m.party.map((q) => q.id + ' ' + (q.all ? q.all.pct + '%/' + q.top.pct + '%' + JSON.stringify(q.all.by) : '-')).join(' | '); const ew = m.enemies.map((q) => q.id + ' ' + (q.all ? q.all.pct + '%' + JSON.stringify(q.all.by) : '-')).join(' | ');
      console.log(`[${name}] ${mapId} game ${m.game.join(',')} canvas ${m.canvas}\n  party: ${pw}\n  enemy: ${ew}\n  cmd items: ${m.items.join(' ')}`);
      await p.evaluate(() => { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg').forEach((n) => n.remove()); ['battle-party', 'battle-msg'].forEach((id) => { const el = document.getElementById(id); if (el) el.classList.remove('on'); }); if (BattleUI.autoButton) BattleUI.autoButton(false); });
      await p.waitForTimeout(300);
    }
    await ctx.close();
  }
  fs.writeFileSync('/home/claude/work/p3d/' + TAG + '_mobile2.json', JSON.stringify({ out, errors: errs }, null, 1)); console.log('errors', errs.length, errs.slice(0, 5)); await br.close();
})();
