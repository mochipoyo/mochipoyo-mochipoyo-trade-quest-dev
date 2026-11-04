// v7.5 追加の敵35体：セーブの互換（ブラウザ・2D版と3D版）
//   ① 前の版（base75 ＝ この変更の前）で作ったセーブ（図鑑に陽線スライムなど・エマール山道にいる）を読み込み、新しい敵（強盗）と戦って勝ち、セーブして読み直す
//   ② 新しく始めたゲームでも同じ（始まりの草原で陽線スライム＝このパックの絵、エマール山脈で強盗）
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v75/save/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const oldSave = require('child_process').execFileSync('node', ['-e', `const load=require('./rpgload.js');const A=load();const w=A.w;const S=w.State;S.newGame('ふるい','warrior');const d=S.data;d.flags.s3121_new_prologue=true;d.flags.s3121_prologue_phase='done';d.hero.level=22;d.hero.jobLevels.warrior=22;w.Actors.refreshSkills(d.hero);['lina','kyle'].forEach(id=>S.joinCompanion(id));d.bestiary={yosen_slime:{seen:1,defeated:4},insen_slime:{seen:1,defeated:2},nanpin_goblin:{seen:1,defeated:1}};d.gold=4321;d.pos={map:'emal_pass',x:0,y:0,dir:'down'};process.stdout.write(S.exportJSON());`], { cwd: '/home/claude/work', env: Object.assign({}, process.env, { RPG_DIR: '/home/claude/base75/' }), maxBuffer: 1 << 26 }).toString();
(async () => {
  const br = await chromium.launch();
  for (const pg of ['2d', '3d']) {
    const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`http://localhost:${PORT}/${pg === '3d' ? '3d/' : ''}index.html`);
    if (pg === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.State && window.World && window.BattleUI && window.EnemyArt, null, { timeout: 60000 });
    const fight = async (mapId, zoneName, enemyId) => {
      await p.evaluate(([mapId, zoneName, enemyId]) => {
        document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
        const d = State.data; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast'; d.settings.autoBattle = true; State.partyActors().forEach((a) => { a.hp = 9999; });
        const m = World.getMap(mapId); const zs = m.encounters.zones; const z = zs.find((q) => q.name === zoneName); let sx = -1, sy = -1;
        for (let y = 1; y < m.h - 1 && sx < 0; y++) for (let x = 1; x < m.w - 1; x++) if (m.passable(x, y, d) && !m.warpAt(x, y) && !m.eventAt(x, y) && zs.filter((q) => q.test(x, y, m))[0] === z) { sx = x; sy = y; break; }
        World.busy = false; World.enterMap(mapId, sx, sy, 'down', { raw: true }); World.player.x = sx; World.player.y = sy;
        const gi = z.groups.findIndex((g) => g.length === 1 && g[0] === enemyId) >= 0 ? z.groups.findIndex((g) => g.length === 1 && g[0] === enemyId) : z.groups.findIndex((g) => g.includes(enemyId));
        const R = Math.random; let n = 0; Math.random = function () { n++; return n === 1 ? (gi + 0.5) / z.groups.length : n === 2 ? 0.999 : R(); };
        const st = BattleUI.start; window.__pr = null; BattleUI.start = function (ids, o) { window.__ids = ids; window.__pr = st.call(BattleUI, ids, o); return window.__pr; };
        try { World.encounter(); } finally { Math.random = R; BattleUI.start = st; }
      }, [mapId, zoneName, enemyId]);
      const t0 = Date.now(); let res = null;
      while (Date.now() - t0 < 90000) { res = await p.evaluate(async () => { const top = document.getElementById('ui').lastElementChild; if (top) { if (top.classList.contains('rw-panel')) { const bt = top.querySelector('.rw-panel-close'); if (bt) bt.click(); else Engine.Input.press('ok'); } else if (top.classList.contains('rw-msg')) Engine.Input.press('ok'); } return window.__pr ? await Promise.race([window.__pr, new Promise((r) => setTimeout(() => r(null), 200))]) : 'nobattle'; }); if (res) break; }
      return { res, ids: await p.evaluate(() => window.__ids) };
    };
    // ① 前の版のセーブ
    const r1 = await p.evaluate((txt) => { try { const d = State.importJSON(txt); State.data = d; World.start(); return { ok: true, map: World.map && World.map.id, gold: d.gold, best: d.bestiary }; } catch (e) { return { ok: false, err: String(e.message) }; } }, oldSave);
    await p.waitForTimeout(1500);
    ok(r1.ok && r1.gold === 4321 && r1.best.yosen_slime.defeated === 4, pg + '版：前の版のセーブを読み込めた（所持金・図鑑の記録はそのまま）' + JSON.stringify(r1).slice(0, 160));
    const f1 = await fight('emal_pass', 'エマール山道', 'tq_add_robber'); await p.screenshot({ path: SHOT + pg + '_oldsave_after.jpg', type: 'jpeg', quality: 70 });
    const s1 = await p.evaluate(() => { const ok1 = State.save(3); const d2 = State.load(3); return { saved: ok1, robber: d2 && d2.bestiary.tq_add_robber, yosen: d2 && d2.bestiary.yosen_slime, map: d2 && d2.pos.map }; });
    ok(f1.res === 'won' && f1.ids.includes('tq_add_robber') && s1.saved && s1.robber && s1.robber.defeated >= 1 && s1.yosen.defeated === 4, pg + '版：前の版のセーブで、エマール山道の出現表から強盗が出て、倒せた。セーブして読み直せる（図鑑に強盗・陽線スライムの記録もそのまま）' + JSON.stringify({ f1, s1 }).slice(0, 220));
    // ② 新しいゲーム
    await p.evaluate(() => { State.newGame('あたらしい', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.hero.level = 25; d.hero.jobLevels.warrior = 25; Actors.refreshSkills(d.hero); ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); World.start(); });
    await p.waitForTimeout(1200);
    const f2 = await fight('world', '始まりの草原', 'yosen_slime'); const v2 = await p.evaluate(() => { const e = { defId: 'yosen_slime' }; const v = BattleUI.enemyVisual(e); return { src: v.source, pack: v.pack, name: ENEMIES.yosen_slime.name }; });
    const f3 = await fight('world', 'エマール山脈', 'tq_add_robber');
    const s3 = await p.evaluate(() => { const ok1 = State.save(3); const d2 = State.load(3); return { saved: ok1, robber: d2 && d2.bestiary.tq_add_robber, yosen: d2 && d2.bestiary.yosen_slime }; });
    await p.screenshot({ path: SHOT + pg + '_newgame_after.jpg', type: 'jpeg', quality: 70 });
    ok(f2.res === 'won' && v2.src === 'enemyart' && v2.pack === 'add35' && v2.name === '陽線スライム' && f3.res === 'won' && s3.saved && s3.robber && s3.yosen, pg + '版：新しいゲームで、始まりの草原の陽線スライム（このパックの絵）・エマール山脈の強盗に勝ち、セーブして読み直せる' + JSON.stringify({ f2, v2, f3, s3 }).slice(0, 260));
    await p.evaluate(() => { try { localStorage.removeItem(Object.keys(localStorage).find((k) => /3$/.test(k) && /mtq|mochi|save/i.test(k)) || '__none'); } catch (e) { } });
    ok(errs.length === 0, pg + '版：ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
    await p.close();
  }
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
