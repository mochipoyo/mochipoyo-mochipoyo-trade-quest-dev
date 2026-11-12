// v9.7 装備の外見（ドット絵の差分）：jsdom の確かめ（2D／3D と同じ読み込み）。合成の絵そのものはブラウザの確かめ（browser/appear_pixel.js）で見る
//   node docs/tools/appear/appear_pixel_test.js [2d]
//   あわせて、人物ID・向き・装備ID と部品の対応表を書き出す（docs/appear/pixel/mapping.json・MAPPING.md）。ほかのキャラへ広げるときの台帳
const path = require('path'); const fs = require('fs'); const crypto = require('crypto'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const ROOT = path.resolve(__dirname, '../../..') + '/'; const two = process.argv.includes('2d');
const A = load(two ? { earth: false, join: false } : {}); const w = A.w; let okN = 0; const ng = [];
const T = (c, m) => { if (c) { okN++; console.log('  OK  ' + m); } else { ng.push(m); console.log('  NG  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  try { w.Engine.Input.init(); } catch (e) { } w.MochiQuest.boot(); await sleep(300);
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  T(A.errors.length === 0, '読み込みのエラーなし');
  const EA = w.EquipmentAppearance, I = w.ITEMS, PXM = w.EQUIP_PIXELS;
  T(EA && PXM && EA.mode() === 'pixel', '外見はドット絵の差分（mode ' + (EA && EA.mode()) + '）。対応表 EQUIP_PIXELS ' + (PXM && PXM.version));
  console.log('-- 部品（主人公：メニューの戦士の立ち絵 job:warrior・戦闘の背面 back）');
  const views = PXM.actors.hero.views; const VK = ['job:warrior', 'back', 'front'];
  T(Object.keys(PXM.actors).join() === 'hero' && Object.keys(views).sort().join() === 'back,front,job:warrior', '部品があるのは主人公の 3 つの向き（メニューの立ち絵・戦闘の背面・勝利の正面）だけ。ほかの人物・向きは本人の従来の絵');
  const fv = views.front, mv = views['job:warrior'];
  T(fv.from === 'job:warrior' && Object.keys(mv.parts).every((k) => fv.parts[k] && fv.parts[k].url === mv.parts[k].url && fv.parts[k].x === mv.parts[k].x + 95 && fv.parts[k].y === mv.parts[k].y + 104) && fv.body.y1 === 302 && fv.body.y0 === 106 && fv.pivot.join() === '160,304', '勝利の正面：メニュー正面と同じ部品を (95, 104) ずらして使う。戦闘の正面の絵（hero/front.png）と同じ足もと 302 行目・同じ縮尺（人物の高さ 196）');
  const need = ['base_plain', 'base_helm', 'base_hat', 'hand'].concat(...Object.values(PXM.materials).map((m) => m.layers.filter((l) => !l.optional).map((l) => l.part)));
  T(VK.every((vk) => need.every((k) => views[vk].parts[k])), '両方の向きに、素の絵 3 つ（素＝布の旅装・兜用・帽子用）・握る手・すべての種類の部品がある（' + need.length + '）');
  T(!!views.back.parts.armor_robe_x && !views['job:warrior'].parts.armor_robe_x && PXM.materials.armor_robe.layers[0].erase, 'ローブの背面だけ、赤いマントの裾を短くする消しの層（armor_robe_x）がある');
  const fr = views['job:warrior'].frame; const inF = Object.values(views['job:warrior'].parts).every((r) => r.x >= fr.x0 && r.y >= fr.y0 && r.x + r.w <= fr.x1 && r.y + r.h <= fr.y1);
  T(fr && inF && fr.y1 === 200 && fr.x0 + fr.x1 === 130, 'メニューの枠：全部の部品（帽子・槍・杖の先）を収める（' + JSON.stringify(fr) + '）。下辺＝元の絵の下辺（足もと）、左右は元の絵の中心でそろえる');
  T(PXM.materials.armor_heavy.layers[0].part === 'armor_shape_f' && PXM.materials.armor_light.layers[0].part === 'armor_shape_f', '重鎧・軽装は、素の絵（布の旅装）の上に鎧の形（元の絵の板金）を重ねる');
  const files = []; VK.forEach((vk) => Object.values(views[vk].parts).forEach((r) => files.push(r.url)));
  T(files.every((u) => { const f = ROOT + u.split('?')[0]; return fs.existsSync(f) && crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 8) === u.split('?v=')[1]; }), '部品の画像がすべてあり、URL の ?v= は中身のハッシュ（' + files.length + ' ファイル）');
  T(VK.every((vk) => fs.existsSync(ROOT + views[vk].src)), '元の絵（' + VK.map((vk) => views[vk].src).join('・') + '）は読むだけ（部品は別のフォルダ assets/characters/equip-pixels/）');
  const man = JSON.parse(fs.readFileSync(ROOT + 'assets/characters/party-directions-v3/manifest.json', 'utf8'));
  const h256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(ROOT + f)).digest('hex');
  T(h256('assets/characters/party-directions-v3/' + man.actors.hero.directions.back.path) === man.actors.hero.directions.back.sha256, '元の背面の絵は書き換えていない（PartyDirections の manifest の sha256 と同じ）');
  console.log('-- 装備 → 部品の種類（resolve の形をそのまま使う）');
  const eq = Object.keys(I).filter((id) => I[id].cat === 'weapon' || I[id].cat === 'armor');
  const slotOf = (it) => it.cat === 'weapon' ? 'weapon' : ({ heavy: 'armor', light: 'armor', robe: 'armor', shield: 'shield', helm: 'head', hat: 'head', acc: 'acc' })[it.type];
  const rows = eq.map((id) => { const sl = slotOf(I[id]); const L = EA.resolve({ id: 'hero', equip: { [sl]: id } })[0]; const cls = L ? EA.pixelClass(L) : null; return { id, name: I[id].name, slot: sl, shape: L && L.shape, sub: L && L.sub, cls }; });
  const by = {}; rows.forEach((r) => { const k = r.cls || ('なし:' + r.slot + '/' + r.shape); by[k] = (by[k] || 0) + 1; });
  T(rows.filter((r) => r.slot === 'armor').every((r) => /^armor_(light|heavy|robe)$/.test(r.cls)), '鎧・服はすべて 3 種類のどれか（軽装 ' + by.armor_light + '・重鎧 ' + by.armor_heavy + '・ローブ ' + by.armor_robe + '）');
  T(rows.filter((r) => r.slot === 'shield').every((r) => r.cls === 'shield') && rows.filter((r) => r.slot === 'head' && r.shape === 'helm').every((r) => r.cls === 'head_helm'), '盾 ' + by.shield + ' 品・兜 ' + by.head_helm + ' 品はすべて部品あり');
  T(rows.filter((r) => r.slot === 'head' && r.shape === 'hat').every((r) => (r.sub === 'witch') === (r.cls === 'head_hat')), 'とんがり帽子（witch）' + (by.head_hat || 0) + ' 品は部品あり。ほかの帽子（' + [...new Set(rows.filter((r) => r.shape === 'hat' && r.sub !== 'witch').map((r) => r.sub))].join(',') + '）は部品なし＝従来の絵');
  T(rows.filter((r) => r.slot === 'weapon').every((r) => (['sword', 'staff', 'spear'].indexOf(r.shape) >= 0) === !!r.cls), '武器：剣 ' + by.weapon_sword + '・杖 ' + by.weapon_staff + '・槍 ' + by.weapon_spear + ' 品は部品あり。斧・弓・短剣・こん棒・爪は部品なし＝従来の絵');
  console.log('-- 組み合わせ（重ね方）');
  const plan = (eq0, vk) => EA.pixelPlan({ id: 'hero', job: 'warrior', equip: eq0 }, vk || 'job:warrior');
  const p0 = plan({}), pm = EA.pixelPlan({ id: 'hero', job: 'mage', equip: { armor: 'robe', head: 'wizard_hat', weapon: 'oak_staff' } }, EA.menuView({ id: 'hero', job: 'mage' })), p1 = plan({ armor: 'leather_armor', weapon: 'steel_sword' }), p2 = plan({ armor: 'iron_armor', head: 'iron_helm', weapon: 'steel_sword', shield: 'iron_shield' }), p3 = plan({ armor: 'robe', head: 'wizard_hat', weapon: 'oak_staff' });
  T(p0.ok && p0.base === 'base_plain' && p0.mats.length === 0, '装備なし：素の絵だけ（剣・盾を外し、胸当てなどの鎧を布の旅装にした絵）');
  T(pm.ok && pm.mats.join() === 'armor_robe,head_hat,weapon_staff', '魔法使い（ローブ・帽子・杖を装備できる職業）でも同じ部品で着替える');
  T(p1.ok && p1.base === 'base_plain' && p1.mats.join() === 'armor_light,weapon_sword', '軽装＋剣：' + p1.base + ' → ' + p1.mats.join(' → '));
  T(p2.ok && p2.base === 'base_helm' && p2.mats.join() === 'armor_heavy,head_helm,shield,weapon_sword', '重鎧＋兜＋剣と盾：' + p2.base + '（兜からはみ出す髪を消した素の絵）→ ' + p2.mats.join(' → '));
  T(p3.ok && p3.base === 'base_hat' && p3.mats.join() === 'armor_robe,head_hat,weapon_staff', 'ローブ＋帽子＋杖：' + p3.base + '（帽子の上へ突き抜ける髪を消した素の絵）→ ' + p3.mats.join(' → '));
  T(VK.every((vk) => plan({ armor: 'robe', head: 'wizard_hat', weapon: 'oak_staff' }, vk).ok && plan({ weapon: 'iron_spear' }, vk).ok), 'メニューの正面・戦闘の背面とも同じ組み合わせが作れる（槍も）');
  const pu = plan({ weapon: 'hand_axe', armor: 'iron_armor' }); const pc = plan({ head: 'leather_cap', armor: 'iron_armor' }); const pa = plan({ acc: 'ring_power', weapon: 'steel_sword' });
  T(pu.ok && pu.mats.join() === 'armor_heavy' && /hand_axe/.test(pu.skipped.join()) && pc.ok && pc.mats.join() === 'armor_heavy' && pc.base === 'base_plain' && /leather_cap/.test(pc.skipped.join()), '部品のない品は部位ごと：手斧は描かない（手は空・元の剣は戻らない）、重鎧はそのまま／革の帽子は描かない（素の頭）（' + pu.skipped.join() + '／' + pc.skipped.join() + '）');
  T(pa.ok && pa.skipped.join() === 'acc:ring_power' && pa.mats.join() === 'weapon_sword', '装飾品は描かない（試作の対象外。記録だけ）');
  const pn = plan({ weapon: '__nope', armor: 'robe' }); T(pn.ok && pn.mats.join() === 'armor_robe' && /__nope/.test(pn.skipped.join()), '表にない装備IDは、その部位を描かない（ほかは着替える）');
  console.log('-- 人物・向き・メニュー');
  const S = w.State; S.newGame('てすと', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; S.joinCompanion('gald');
  T(EA.menuView(d.hero) === 'job:warrior' && EA.supports(d.hero, 'job:warrior') && EA.supports(d.hero, 'back') && EA.supports(d.hero, 'front') && !EA.supports(d.hero, 'left') && !EA.supports(d.hero, 'right'), '主人公：メニューの立ち絵・戦闘の背面・勝利の正面で着替える（戦闘の横向きは従来の絵）');
  const j0 = d.hero.job; d.hero.job = 'mage'; const vm = EA.menuView(d.hero); const sm = EA.supports(d.hero, vm); d.hero.job = j0;
  T(vm === 'job:warrior' && sm && PXM.actors.hero.menuBase === 'job:warrior', '魔法使いに転職しても、メニューの立ち絵は本人の素体（menuBase ' + vm + '）で着替える（戦闘の絵が職業で変わらないのと合わせる）');
  T(['gald', 'lina'].every((id) => !EA.supports(S.actor(id) || { id }, 'front') && !EA.supports(S.actor(id) || { id }, 'back')), '仲間（ガルド・リナ）：従来の絵');
  const M = w.Menu; ['iron_armor', 'iron_helm'].forEach((id) => S.addItem(id, 1)); w.Services.equipItem(d.hero, 'iron_armor');
  const snap = JSON.stringify(d); const itemsSnap = JSON.stringify(I);
  const art = M.partyHtml.art(d.hero); const artG = M.partyHtml.art(S.actor('gald'));
  T(/class="ea-host[^"]*ea-frame" style="--ea-f:0\.\d+" data-ea-actor="hero"/.test(art) && !/ea-host/.test(artG), 'なかまの画面：主人公だけ合成の置き場所（決まった枠 ea-frame・--ea-f）。ガルドは今までの立ち絵のまま');
  T(JSON.stringify(d) === snap && JSON.stringify(I) === itemsSnap && !/equip-pixels|ea-|data:image/.test(JSON.stringify(d)), '画面を作っても、セーブ（State.data）と ITEMS は 1 文字も変わらない（外見はセーブに書かない）');
  const keys = []; for (let i = 0; i < w.localStorage.length; i++) keys.push(w.localStorage.key(i)); T(!keys.some((k) => /appear|equip|pixel/i.test(k)), 'LocalStorage に外見のためのキーを足していない');
  const r1 = EA.rampFor({ main: '#77513b', trim: '#3c281c', acc: '#3c281c', light: '#b7825b', dark: '#3c281c' });
  T(r1.join() === '#271a12,#3c281c,#77513b,#9a6c4d,#b7825b', '品の色の 5 段（革の鎧）：' + r1.join(' ') + '（tools/appear/pixel/preview.py と同じ作り方）');
  T(EA.setMode('vector') === 'vector' && EA.supports(S.actor('gald'), 'front') && EA.setMode('pixel') === 'pixel' && !EA.supports(S.actor('gald'), 'front'), 'v9.6 の描き足し（vector）は開発の見比べ用に残す（setMode）。ふだんは pixel');
  // ---- 対応表（台帳）の書き出し ----
  const out = { note: 'v9.7 装備の外見（ドット絵の差分）の対応表。appear_pixel_test.js が js/data/equip-pixels.js とゲームの装備から作る。ほかのキャラへ広げるときは、人物ID・向きごとに parts をそろえる',
    actors: {}, items: {} };
  Object.entries(PXM.actors).forEach(([aid, a]) => { out.actors[aid] = {}; Object.entries(a.views).forEach(([vk, v]) => { out.actors[aid][vk] = { src: v.src, size: [v.w, v.h], dir: v.dir, pivot: v.pivot, grip: v.grip, offhand: v.offhand, parts: Object.fromEntries(Object.entries(v.parts).map(([k, r]) => [k, { file: r.url.split('?')[0], x: r.x, y: r.y, w: r.w, h: r.h }])) }; }); });
  out.materials = PXM.materials; out.classes = PXM.classes;
  rows.forEach((r) => { out.items[r.id] = { name: r.name, slot: r.slot, shape: r.shape, sub: r.sub, material: r.slot === 'acc' ? '（描かない：装飾品）' : (r.cls || null), views: r.slot === 'acc' ? {} : Object.fromEntries(Object.entries(PXM.actors).flatMap(([aid, a]) => Object.keys(a.views).map((vk) => [aid + '/' + vk, !!(r.cls && plan({ [r.slot]: r.id }, vk).ok)]))) }; });
  fs.mkdirSync(ROOT + 'docs/appear/pixel', { recursive: true });
  fs.writeFileSync(ROOT + 'docs/appear/pixel/mapping.json', JSON.stringify(out, null, 1));
  const md = ['# 装備の外見（ドット絵の差分）の対応表（v9.7・自動生成）', '', 'appear_pixel_test.js が js/data/equip-pixels.js とゲームの装備（ITEMS）から作る。手で書き換えない。', '',
    '## 人物ID・向き → 部品', '', '| 人物ID | 向き | 元の絵 | 足もとの基準点 | 握る位置（武器） | 盾の位置 |', '|---|---|---|---|---|---|',
    ...Object.entries(out.actors).flatMap(([aid, vs]) => Object.entries(vs).map(([vk, v]) => `| ${aid} | ${vk} | ${v.src} | ${v.pivot.join(', ')} | ${v.grip.x}, ${v.grip.y}（${v.grip.order}） | ${v.offhand.x}, ${v.offhand.y}（${v.offhand.order}） |`)),
    '', 'ほかの人物・向き：部品なし（本人の従来の絵）。', '',
    '## 部品の種類 → 重ね方', '', '| 種類 | 重ね順（z） | 素の絵（頭にかぶるときに替える） | 部品（tint＝品の色で塗る灰色の層） | 長柄（手を上に描き直す） |', '|---|---|---|---|---|',
    ...Object.entries(PXM.materials).map(([k, m]) => `| ${k} | ${m.z} | ${m.base || '—（変えない）'} | ${m.layers.map((l) => l.part + (l.tint ? '（tint:' + l.tint + (l.grayKeep ? '・灰色の品は元の板金のまま' : '') + (l.grayRef ? '・灰色の品は元の鎧の色' : '') + '）' : '')).join('、')} | ${m.hand ? 'はい' : ''} |`),
    '', '## 装備ID → 部品の種類', '', '| 枠 | 形（type/sub） | 部品の種類 | 品の数 | 装備ID |', '|---|---|---|---|---|'];
  const grp = {}; rows.forEach((r) => { const k = r.slot + '|' + r.shape + '/' + r.sub + '|' + (r.slot === 'acc' ? '（描かない）' : (r.cls || '（なし→従来の絵）')); (grp[k] = grp[k] || []).push(r.id); });
  Object.keys(grp).sort().forEach((k) => { const [sl, sh, c] = k.split('|'); md.push(`| ${sl} | ${sh} | ${c} | ${grp[k].length} | ${grp[k].join(', ')} |`); });
  fs.writeFileSync(ROOT + 'docs/appear/pixel/MAPPING.md', md.join('\n') + '\n');
  T(Object.keys(out.items).length === eq.length, '対応表を書き出した（docs/appear/pixel/mapping.json・MAPPING.md：装備 ' + eq.length + ' 品）');
  console.log('\n結果：OK ' + okN + ' / NG ' + ng.length); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
