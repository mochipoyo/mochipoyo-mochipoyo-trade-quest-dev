// v9.3 戦闘の演出（呪文・特技の光・粒・魔法陣・衝撃・動き）の確かめ（ヘッドレス Chromium。実機・GPU ではない）
//  A) 見本の一覧（2D 版のみ）：代表の技（味方の物理・属性の呪文・回復・補助・弱体・チャートの技・敵の攻撃と呪文）を、
//     時刻表どおりの 4 つの瞬間（命中の直前の構え・命中・命中の後・最後の命中の後）で戦闘画面に描き、画像に並べる
//     → shots/fx93_sheet_*.jpg（目で見る用）。描画の失敗（FX2D.errors）が 0 か
//  B) 本物の戦闘（2D・3D）：仲間 4 人でオート戦闘を数ターン。味方の欄の動き（mo-*）・当たった光（hurt/healed）・敵の動き（emo）・反動（recoil）が
//     起きたか、ページのエラー・描画の失敗が 0 か。途中の画面を shots/fx93_battle_*.jpg に
//  C) 重さ（2D・この作業環境のソフトウェア描画）：戦闘画面 1 枚を描く時間を、演出なし／重い演出（全体の大きな呪文の命中の瞬間）で比べる
// 使い方：PORT=… OUT=… PAGES=2d,3d node fx93_browser.js（サーバーは別に立てる）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8796; const OUT = process.env.OUT || '/home/claude/envwork/docs/rpg93/';
fs.mkdirSync(OUT + 'logs', { recursive: true }); fs.mkdirSync(OUT + 'shots', { recursive: true });
const PAGES = (process.env.PAGES || '2d,3d').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch(); const all = {};
  for (const pg of PAGES) {
    const ctx = await br.newContext({ viewport: { width: 1000, height: 650 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}/${pg === '3d' ? '3d/' : ''}index.html?nosw`);
    if (pg === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.World && window.State && window.BattleUI, null, { timeout: 120000 });
    const res = { page: pg };
    const enemies = await p.evaluate(() => {
      document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
      State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { };
      document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
      ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id));
      const ids = Object.keys(ENEMIES).filter((k) => !ENEMIES[k].boss && ENEMIES[k].hp >= 60 && ENEMIES[k].hp <= 160 && ENEMIES[k].name).slice(0, 3);
      return ids;
    });
    res.enemies = enemies;
    // ---- B) 本物の戦闘（オート）。動き・光の記録
    await p.evaluate((ids) => {
      window.__seen = { mo: {}, flash: {}, emo: 0, recoil: 0, fxStarts: 0, hits: 0 };
      new MutationObserver((ms) => ms.forEach((m) => { const c = m.target.className || ''; String(c).split(/\s+/).forEach((k) => { if (/^mo-/.test(k)) window.__seen.mo[k] = (window.__seen.mo[k] || 0) + 1; if (/^(hurt|hurt-big|healed|revived)$/.test(k)) window.__seen.flash[k] = (window.__seen.flash[k] || 0) + 1; }); }))
        .observe(document.getElementById('battle-party'), { attributes: true, subtree: true, attributeFilter: ['class'] });
      const F = FX2D.start; FX2D.start = function () { window.__seen.fxStarts++; return F.apply(this, arguments); };
      const H = FX2D.hit; FX2D.hit = function () { window.__seen.hits++; return H.apply(this, arguments); };
      State.data.settings.autoBattle = false; State.data.hero.level = 12;
      BattleUI.start(ids, {});
      window.__poll = setInterval(() => { const S = BattleUI.scene; if (!S) return; if (S.emo && Object.keys(S.emo).length) window.__seen.emo++; if (S.anims.some((a) => a.type === 'recoil')) window.__seen.recoil++; }, 30);
    }, enemies);
    await p.waitForFunction(() => BattleUI.scene && Engine.top() && Engine.top() !== BattleUI.scene, null, { timeout: 240000, polling: 200 });   // 最初のコマンドのメニュー
    // ---- A) 見本の一覧（2D 版だけ。最初のコマンドを選ぶ前に、戦闘画面の描画を時刻を決めて呼ぶ）
    if (pg === '2d') {
      const sheets = await p.evaluate(() => {
        const S = BattleUI.scene; if (!S) return { err: 'no scene' };
        const F = FX65, party = S.b.party.map((a) => 'p:' + a.id), es = S.b.enemies.map((e, i) => 'e:' + i).filter((k, i) => S.view.e[i]);
        const hero = S.b.party[0];
        const P = (id, to, label) => ({ label: label || id, def: F.DEFS[id], from: 'p:' + hero.id, to });
        const list = [
          { label: '通常攻撃（剣）', def: F.attack(Object.assign({}, hero, { equip: { weapon: Object.keys(ITEMS).find((k) => ITEMS[k].type === 'sword') } })), from: 'p:' + hero.id, to: [es[0]] },
          P('flame_blade', [es[0]], '炎の剣（flame_blade）'), P('hundred_fists', [es[0]], '百裂拳（hundred_fists）'), P('rush', [es[0]], '突き（rush）'), P('masterwork', [es[0]], '重い一撃（masterwork）'),
          P('fireball', [es[0]]), P('firestorm', es), P('ice', [es[0]]), P('blizzard', es), P('thunder', [es[0]]), P('thunder_array', es), P('wind_blade', es), P('gale_fault', es),
          P('holy_light', [es[0]]), P('aurora', es), P('dark_bolt', [es[0]]), P('imaginary_bolt', [es[0]]), P('meteor', [es[0]]),
          P('heal', [party[1]]), P('heal_all', party), P('revive', [party[2]]), P('iron_wall', party), P('war_cry', [party[0]]), P('haste', [party[0]]),
          P('time_stop', es), P('ema_slash', [es[0]]), P('gold_rush', es), P('trend_breakthrough', [es[0]]),
          { label: '敵の攻撃（踏み込み）', def: F.enemy(S.b.enemies[0], {}), from: es[0], to: [party[0]] },
          { label: '敵の呪文（fireball）', def: Object.assign({}, F.DEFS.fireball, { enemy: true }), from: es[1] || es[0], to: [party[1]] },
          { label: '敵の全体呪文（blizzard）', def: Object.assign({}, F.DEFS.blizzard, { enemy: true }), from: es[0], to: party }
        ].filter((x) => x.def);
        const W = 640, H = 416, sc = 0.75, cols = 4, rowsPer = 6, cw = W * sc, ch = H * sc + 18;
        const out = []; let sheet = null, sctx = null; const c = document.createElement('canvas'); c.width = W; c.height = H; const cx = c.getContext('2d');
        const base0 = { anims: S.anims.slice(), fx65: S.fx65, fxHits: S.fxHits, emo: S.emo, t: S.t, shake: S.screenShake };
        list.forEach((x, r) => {
          if (r % rowsPer === 0) { if (sheet) out.push(sheet.toDataURL('image/jpeg', 0.84)); sheet = document.createElement('canvas'); sheet.width = cw * cols; sheet.height = ch * Math.min(rowsPer, list.length - r); sctx = sheet.getContext('2d'); sctx.fillStyle = '#111'; sctx.fillRect(0, 0, sheet.width, sheet.height); }
          const tl = F.timeline(x.def, { speed: 'normal', hits: x.def.hits || 1 });
          const last = tl.impacts[tl.impacts.length - 1];
          const times = [Math.max(tl.windup, tl.hitAt - 40), tl.hitAt + 30, tl.hitAt + 140, Math.max(tl.hitAt + 220, last + 90)];
          S.fx65 = []; S.fxHits = []; S.anims = []; S.emo = {}; const T0 = 100000; S.t = T0;
          FX2D.start(S, x.def, tl, x.from, x.to);
          const m = /^e:(\d+)$/.exec(x.from); if (m) BattleUI._actorMotion(S, { side: 'enemy', idx: +m[1] }, { def: x.def, tl });
          times.forEach((tt, k) => {
            S.t = T0 + tt; S.screenShake = 0; S.draw(cx);
            sctx.drawImage(c, k * cw, (r % rowsPer) * ch + 18, cw, H * sc);
            sctx.fillStyle = '#ddd'; sctx.font = '12px sans-serif'; sctx.fillText((k === 0 ? x.label + '　' : '') + tt + 'ms', k * cw + 4, (r % rowsPer) * ch + 13);
          });
        });
        if (sheet) out.push(sheet.toDataURL('image/jpeg', 0.84));
        // C) 重さ：演出なし／重い演出（全体の大きな呪文の命中の瞬間）で、1 枚を描く時間
        const timeDraw = (setup) => { const ts = []; for (let i = 0; i < 25; i++) { setup(); const a = performance.now(); S.draw(cx); ts.push(performance.now() - a); } ts.sort((a, b) => a - b); return +ts[Math.floor(ts.length / 2)].toFixed(2); };
        const none = timeDraw(() => { S.fx65 = []; S.fxHits = []; S.emo = {}; S.t = 200000; });
        const heavyDef = F.DEFS.thunder_array || F.DEFS.firestorm; const htl = F.timeline(heavyDef, { speed: 'normal' });
        const heavy = timeDraw(() => { S.fx65 = []; S.fxHits = []; S.t = 300000; FX2D.start(S, heavyDef, htl, 'p:' + hero.id, es); FX2D.start(S, F.DEFS.meteor, F.timeline(F.DEFS.meteor, {}), 'p:' + hero.id, [es[0]]); S.t = 300000 + htl.hitAt + 40; });
        S.anims = base0.anims; S.fx65 = []; S.fxHits = []; S.emo = {}; S.t = base0.t;
        return { sheets: out, n: list.length, labels: list.map((x) => x.label), drawMs: { none, heavy }, errors: FX2D.errors };
      });
      if (sheets.sheets) sheets.sheets.forEach((u, i) => fs.writeFileSync(`${OUT}shots/fx93_sheet_${i + 1}.jpg`, Buffer.from(u.split(',')[1], 'base64')));
      res.sheet = { n: sheets.n, files: sheets.sheets ? sheets.sheets.length : 0, labels: sheets.labels, drawMs: sheets.drawMs, fx2dErrors: sheets.errors, err: sheets.err };
    }
    await p.evaluate(() => { window.__seen = { mo: {}, flash: {}, emo: 0, recoil: 0, fxStarts: 0, hits: 0 }; BattleUI.setAuto(true); });   // ここからオート（見本の一覧の分は数えない）
    const t0 = Date.now(); let shot = 0;
    while (Date.now() - t0 < (pg === '3d' ? 150000 : 60000)) {
      await sleep(pg === '3d' ? 5000 : 2500);
      const st = await p.evaluate(() => ({ state: BattleUI.battle && BattleUI.battle.state, turn: BattleUI.battle && BattleUI.battle.turn, fx: (BattleUI.scene && BattleUI.scene.fx65 || []).length }));
      if (shot < 6 && st.fx) { await p.screenshot({ path: `${OUT}shots/fx93_battle_${pg}_${shot}.jpg`, type: 'jpeg', quality: 78 }); shot++; }
      if (!st.state || st.state === 'end' || st.state === 'won' || st.state === 'lost') break;
      const seen = await p.evaluate(() => window.__seen); if (Object.keys(seen.mo).length >= 3 && seen.emo > 0 && seen.recoil > 0 && (seen.flash.hurt || seen.flash['hurt-big']) && shot >= 4) break;
    }
    res.battle = await p.evaluate(() => Object.assign({}, window.__seen, { fx2dErrors: FX2D.errors, turn: BattleUI.battle && BattleUI.battle.turn, state: BattleUI.battle && BattleUI.battle.state }));
    res.battle.shots = shot;
    await p.evaluate(() => { clearInterval(window.__poll); State.data.settings.autoBattle = false; });
    res.pageErrors = errs;
    const b = res.battle;
    res.checks = {
      noPageErrors: errs.length === 0, noFxErrors: b.fx2dErrors === 0 && (!res.sheet || res.sheet.fx2dErrors === 0),
      fxStarted: b.fxStarts > 0, partyMotion: Object.keys(b.mo).length > 0, enemyMotion: b.emo > 0, recoil: b.recoil > 0, hurtFlash: !!(b.flash.hurt || b.flash['hurt-big'])
    };
    res.ok = Object.values(res.checks).every(Boolean);
    console.log(JSON.stringify(res)); all[pg] = res; await ctx.close();
  }
  fs.writeFileSync(OUT + 'logs/fx93_browser.json', JSON.stringify(all, null, 1)); await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
