// v6.8 追加の仲間（カズト・もちぽよ・神聖犬ポン太）の確認：3D版の戦闘（前後・左右）、ポン太の別枠の行動、勝利の振り向き、2D版の戦闘のポン太、3D版の町の絵の NPC
// 作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 DEV（Playwright の端末名）・LAND=1・TAG・SHOTDIR・PORT
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v68b/'; fs.mkdirSync(SHOT, { recursive: true }); const TAG = process.env.TAG || 'pc';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
async function boot(br, page3d) {
  let ctxOpt = { viewport: { width: 1280, height: 720 } };
  if (process.env.DEV) { const d = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }); if (process.env.LAND) d.viewport = { width: d.viewport.height, height: d.viewport.width }; ctxOpt = d; }
  const p = await (await br.newContext(ctxOpt)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/${page3d ? '3d/' : ''}index.html`);
  if (page3d) await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.State && window.World && window.BattleUI, null, { timeout: 60000 });
  await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast'; d.hero.level = 28;
    ['kazuto', 'mochipoyo', 'lina'].forEach((id) => State.joinCompanion(id)); d.flags.kazuto_joined = d.flags.mochipoyo_joined = d.flags.ponta_joined = true;
    World.start(); World.busy = false; World.enterMap('oblivion_cave_3', 5, 5, 'down');
    Combat.PET.rate = 1;   // 表示の確認のため、ポン太が毎ターン行動するようにする（行動の確率 0.4 は jsdom のテスト companion68test で確認）
  });
  await p.waitForTimeout(1500); return { p, errs };
}
const endBattle = (p) => p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg, #auto-battle').forEach((n) => n.remove()); World.busy = false; } catch (e) { } });
(async () => {
  const br = await chromium.launch(); const out = { tag: TAG };
  /* ---------- 3D版の戦闘 ---------- */
  { const { p, errs } = await boot(br, true); out.b3d = [];
    for (const layout of ['front', 'side']) {
      await p.evaluate((layout) => { localStorage.setItem('mtq3d-battle-layout', layout); const d = State.data; d.party = ['hero', 'kazuto', 'mochipoyo', 'lina']; d.settings.autoBattle = true; State.partyActors().forEach((a) => Actors.fullHeal(a)); World.busy = false; window.__bp = BattleUI.start(['mana_golem', 'arcane_eye'], {}); }, layout);
      await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want && BattleStage3D.actorsInfo().want > 0, null, { timeout: 30000 }).catch(() => { });
      await p.waitForTimeout(700); await p.screenshot({ path: SHOT + TAG + '_3d_' + layout + '_start.jpg', type: 'jpeg', quality: 74, timeout: 120000 });
      const i0 = await p.evaluate(() => { const i = BattleStage3D.actorsInfo(); return { dir: i.partyDir, party: i.party.map((x) => ({ id: x.id, model: x.model, url: x.url && x.url.replace(/^.*characters\//, '').replace(/\?.*$/, ''), size: x.size })), pet: !!(BattleUI.scene && BattleUI.scene.b.pet) }; });
      const want = layout === 'front' ? 'back' : 'left';
      const chk = (id, pack) => { const x = i0.party.find((q) => q.id === id); return x && x.model === 'pixel:dir:' + want && x.url === pack + '/sprites/' + id + '/' + want + '.png'; };
      ok(chk('kazuto', 'party-directions-add68') && chk('mochipoyo', 'party-directions-add68') && chk('hero', 'party-directions-v3') && chk('lina', 'party-directions-v3'), '3D ' + layout + '：カズト・もちぽよは追加パックの ' + want + '.png、主人公・リーナは v3 の絵');
      ok(i0.pet && chk('ponta', 'party-directions-add68') && i0.party.length === 5, '3D ' + layout + '：ポン太が別枠で立つ（' + want + '.png・味方の板は4人＋ポン太）');
      // ポン太の行動（3Dの動きの記録に 'pet:ponta'）と勝利
      const t0 = Date.now(); let petAct = null, vic = false;
      while (Date.now() - t0 < 90000) {
        const v = await p.evaluate(() => { const sc = BattleUI.scene; const a = MTQ3D.battle && MTQ3D.battle.actors; const lg = a ? a.log.filter((x) => x.who === 'pet:ponta') : []; return { vic: !!(sc && sc.victory >= 0), gone: !sc, pet: lg.length, last: lg[lg.length - 1] || null }; });
        if (v.pet && !petAct) { petAct = v.last; await p.waitForTimeout(260); await p.screenshot({ path: SHOT + TAG + '_3d_' + layout + '_ponta_act.jpg', type: 'jpeg', quality: 74, timeout: 120000 }); }
        if (v.vic || v.gone) { vic = v.vic; break; } await p.waitForTimeout(120);
      }
      if (vic) { await p.waitForTimeout(250); await p.screenshot({ path: SHOT + TAG + '_3d_' + layout + '_victory.jpg', type: 'jpeg', quality: 74, timeout: 120000 }); }
      const i1 = await p.evaluate(() => BattleStage3D.actorsInfo().party.map((x) => ({ id: x.id, model: x.model, dead: x.dead })));
      ok(!!petAct, '3D ' + layout + '：ポン太が行動し、3Dでも動く（' + JSON.stringify(petAct) + '）');
      ok(vic && i1.filter((x) => !x.dead).every((x) => x.model === 'pixel:dir:front'), '3D ' + layout + '：勝利で全員（ポン太も）正面へ振り向く ' + JSON.stringify(i1.map((x) => x.id + ':' + x.model.replace('pixel:dir:', ''))));
      out.b3d.push({ layout, start: i0, petAct, victory: vic, end: i1 }); await endBattle(p); await p.waitForTimeout(400);
    }
    // 3D版の町：加入前の立体モデル（加入前に戻して表示）
    await p.evaluate(() => { const d = State.data; delete d.companions.kazuto; delete d.companions.mochipoyo; d.party = ['hero', 'lina']; d.flags.ponta_joined = false; });
    out.npc = [];
    for (const [map, x, y, id] of [['magicka_tavern', 8, 7, 'kazuto'], ['tradia_tavern', 10, 8, 'mochipoyo'], ['star_camp', 6, 12, 'ponta']]) {
      await p.evaluate(({ map, x, y }) => { World.busy = false; World.enterMap(map, x, y, 'up'); }, { map, x, y }); await p.waitForTimeout(3500);
      const r = await p.evaluate((id) => { const sc = MTQ3D.current; const list = sc && sc.npcs ? sc.npcs : []; const ch = list.find((c) => c.npc && c.npc.id === id); if (!ch) return null; let skin = false, sprite = false; ch.model.traverse(o => { skin ||= !!o.isSkinnedMesh; sprite ||= !!o.isSprite; }); return { model: ch.root.name, visible: ch.root.visible, skin, sprite }; }, id);
      await p.screenshot({ path: SHOT + TAG + '_map_' + id + '.jpg', type: 'jpeg', quality: 74, timeout: 120000 });
      ok(r && r.model === 'char_field_' + id && r.visible && r.skin && !r.sprite, '3D の町：' + id + ' を移動用GLBで表示（' + map + '・' + JSON.stringify(r) + '）'); out.npc.push({ id, map, r });
    }
    ok(errs.length === 0, '3D版：ページのエラーなし ' + JSON.stringify(errs.slice(0, 4))); out.errs3d = errs; }
  /* ---------- 2D版の戦闘：ポン太を画面の右下に描く ---------- */
  { const { p, errs } = await boot(br, false);
    await p.evaluate(() => { const d = State.data; d.party = ['hero', 'kazuto', 'mochipoyo', 'lina']; d.settings.autoBattle = true; World.busy = false; window.__bp = BattleUI.start(['mana_golem'], {}); });
    await p.waitForTimeout(1200); await p.screenshot({ path: SHOT + TAG + '_2d_start.jpg', type: 'jpeg', quality: 74, timeout: 120000 });
    const r = await p.evaluate(() => { const sc = BattleUI.scene; const W = Engine.canvas.width, H = Engine.canvas.height; const pr = sc.petRect(W, H); const pos = sc.posOf('pet:ponta', W, H); return { pet: !!sc.b.pet, rect: pr && [pr.x, pr.y, pr.w, pr.h], img: !!(pr && pr.img), pos: pos && [Math.round(pos.x), Math.round(pos.y)], portraits: [...document.querySelectorAll('#battle-party .bp img')].map((i) => i.getAttribute('src').replace(/\?.*$/, '')) }; });
    ok(r.pet && r.img && r.rect && r.pos, '2D版：ポン太を画面の右下に描く ' + JSON.stringify(r.rect));
    ok(r.portraits.some((s) => /companions\/kazuto\.png/.test(s)) && r.portraits.some((s) => /companions\/mochipoyo\.png/.test(s)), '2D版：パーティ欄にカズト・もちぽよの立ち絵');
    let acted = false; const t0 = Date.now(); while (Date.now() - t0 < 60000) { const v = await p.evaluate(() => { const sc = BattleUI.scene; return { a: !!(sc && sc.petActT), gone: !sc || sc.victory >= 0 }; }); if (v.a && !acted) { acted = true; await p.waitForTimeout(250); await p.screenshot({ path: SHOT + TAG + '_2d_ponta_act.jpg', type: 'jpeg', quality: 74, timeout: 120000 }); } if (v.gone) break; await p.waitForTimeout(100); }
    ok(acted, '2D版：ポン太が行動する（跳ねる・演出）'); ok(errs.length === 0, '2D版：ページのエラーなし ' + JSON.stringify(errs.slice(0, 4))); out.r2d = r; out.errs2d = errs; await endBattle(p); }
  out.fails = fails; fs.writeFileSync(SHOT + TAG + '_result.json', JSON.stringify(out, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})();
