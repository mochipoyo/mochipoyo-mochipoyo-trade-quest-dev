// v9.6.1 装備の外見：素体の画像が「別のサイト扱い」になるとき（githack・CDN の転送など）の確かめ
//   v9.7：ふだんはドット絵の差分（主人公の部品 assets/characters/equip-pixels/）。MODE=vector で v9.6 の描き足し（equip-bases/）を確かめる
//   ページは PORT から開き、assets/characters/equip-bases/・equip-pixels/ の画像だけを別のポート（XPORT）へ転送する（302）
//   XMODE=cors：転送先が Access-Control-Allow-Origin を返す → 合成できる（CORS で読む）
//   XMODE=nocors：返さない → 合成できない。そのときも 3D の戦闘は 3D のまま、本人の元の絵で表示（2D に落ちない）
//   KIND=3d|2d  OUT=…（記録 logs/appear_xorigin_<KIND>_<XMODE>.json・画面写真 shots/appear_xorigin_*.jpg）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const XPORT = process.env.XPORT || 8895; const XMODE = process.env.XMODE || 'cors'; const KIND = process.env.KIND || '3d'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/'; const MODE = process.env.MODE || 'pixel'; const TAG = MODE === 'pixel' ? 'pixel_' : '';
const URL0 = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [], toasts = [], moved = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.route(/\/assets\/characters\/equip-(bases|pixels)\//, (r) => { const u = new URL(r.request().url()); moved.push(u.pathname); r.fulfill({ status: 302, headers: { Location: `http://127.0.0.1:${XPORT}${u.pathname}${u.search}` } }); });
  await p.goto(URL0);
  if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  await p.evaluate((M) => { EquipmentAppearance.setMode(M); const T = Win.toast; Win.toast = function (m) { (window.__toasts = window.__toasts || []).push(String(m)); return T.apply(this, arguments); };
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    ['gald', 'lina'].forEach((id) => State.joinCompanion(id)); ['iron_spear', 'robe', 'iron_helm'].forEach((id) => State.addItem(id, 2)); const h = d.hero; ['iron_spear', 'robe', 'iron_helm'].forEach((id) => Services.equipItem(h, id));
    World.start(); }, MODE);
  // メニュー
  p.evaluate(() => { Menu.party(); }); await p.waitForSelector('#ui .party-screen .pt-art', { timeout: 60000 });
  await p.waitForFunction(() => { const h = document.querySelector('#ui .pt-art .ea-host'); return h && /ok|error|none/.test(h.getAttribute('data-ea-state') || ''); }, null, { timeout: 30000 }).catch(() => null);
  const m = await p.evaluate(() => { const h = document.querySelector('#ui .pt-art .ea-host'); return { st: h && h.getAttribute('data-ea-state'), img: !!(h && h.querySelector('img')), cv: !!(h && h.querySelector('canvas')) }; });
  if (XMODE === 'cors') S(m.st === 'ok' && m.cv, 'メニュー：別のサイトの素体でも合成できる（CORS で読む）');
  else S(m.st === 'error' && m.img, 'メニュー：素体を読めないときは、今までの本人の立ち絵のまま（' + m.st + '）');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
  // 戦闘
  const en = await p.evaluate(() => Object.keys(ENEMIES).filter((k) => ENEMIES[k].hp < 40 && !ENEMIES[k].boss && !ENEMIES[k].flee)[0]);
  await p.evaluate((id) => { State.data.settings.autoBattle = false; window.__btRes = null; BattleUI.start([id], {}).then((r) => { window.__btRes = r; }); }, en);
  await p.waitForSelector('#ui .cmd-list', { timeout: 120000 }); await p.waitForTimeout(3000);
  if (KIND === '3d') {
    await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return i && i.party && i.party.length && i.party.every((x) => x.ready && !x.eaWait); }, null, { timeout: 60000 }).catch(() => null);
    const b = await p.evaluate(() => ({ on: !!(window.BattleStage3D && BattleStage3D.actorsOn && BattleUI.scene && BattleStage3D.actorsOn(BattleUI.scene)), info: BattleStage3D.actorsInfo ? BattleStage3D.actorsInfo() : null, toasts: window.__toasts || [], un: EquipmentAppearance.unsupported() }));
    const fellBack = b.toasts.some((t) => /3Dの戦闘を表示できない/.test(t));
    S(!fellBack && b.on, '3D の戦闘が 3D のまま表示される（2D に落ちない）' + (fellBack ? '：' + b.toasts.filter((t) => /3D/.test(t)).join(' / ').slice(0, 160) : ''));
    const party = b.info ? b.info.party : [];
    if (XMODE === 'cors' && MODE === 'pixel') S(party.length && party.every((x) => (['hero', 'lina', 'gald'].indexOf(x.id) >= 0) === !!x.ea && /^pixel:dir:/.test(x.model)), '3D の戦闘：部品のある人物（主人公・v9.8 のリーナ・ガルド）の背面の絵に装備を合成。部品のない仲間は従来の絵（' + party.map((x) => x.id + ':' + (x.ea ? '合成' : '元の絵')).join(' ') + '）');
    else if (XMODE === 'cors') S(party.length && party.every((x) => x.ea && /^pixel:dir:/.test(x.model)), '3D の戦闘：全員の 4 方向の絵に装備を合成（' + party.map((x) => x.id + ':' + (x.ea ? '合成' : '元の絵')).join(' ') + '）');
    else S(party.length && party.every((x) => !x.ea && /^pixel:dir:/.test(x.model)), '3D の戦闘：素体を読めないので、全員が本人の元の 4 方向の絵（' + party.map((x) => x.id + ':' + x.model).join(' ') + '）。読めなかったことを記録：' + Object.keys(b.un).length + ' 件');
  } else {
    const c = await p.evaluate(() => [...document.querySelectorAll('#battle-party .ea-host')].map((h) => h.getAttribute('data-ea-state')));
    S(c.length && c.every((x) => x === (XMODE === 'cors' ? 'ok' : 'error')), '2D の戦闘の欄：' + c.join(',') + (MODE === 'pixel' ? '（部品があるのは主人公・リーナ・ガルド）' : ''));
  }
  await p.screenshot({ path: `${OUT}shots/appear_xorigin_${TAG}${KIND}_${XMODE}.jpg`, type: 'jpeg', quality: 76 });
  S(moved.length > 0, '素体の画像は別のサイト（ポート ' + XPORT + '）から読んだ（' + moved.length + ' 件）');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/appear_xorigin_${TAG}${KIND}_${XMODE}.json`, JSON.stringify({ KIND, XMODE, MODE, ok: steps.length - ng, ng, steps }, null, 1));
  console.log(`結果 xorigin ${MODE} ${KIND} ${XMODE}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
