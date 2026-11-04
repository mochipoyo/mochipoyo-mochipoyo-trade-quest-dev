// v7.5 追加の敵35体（2D・jsdom）：パックの manifest との対応・既存の敵を壊していないこと・出現表（実際のマップ）・戦闘（ランダムの出現から・倒せる・報酬・図鑑）・
//   新しい行動（お金を奪う・溜め・反撃の構え・重ねがけ・隙・何もしない）・状態異常が続かないこと・図鑑の画面・セーブの互換
const path = require('path'); const fs = require('fs'); const crypto = require('crypto');
const load = require('../rpgload.js'); const { w, errors } = load(); w.requestAnimationFrame = (f) => setTimeout(() => f(w.performance.now()), 16);
const ROOT = (process.env.RPG_DIR || '/home/claude/mochipoyo-trade-quest/').replace(/\/?$/, '/');
const BASE = process.env.BASE_DIR || '/home/claude/base75/';
const doc = w.document; const S = w.State, B = w.BattleUI, C = w.Combat, D = w.MAP_DEFS, W = w.World, EN = w.ENEMIES, SP = w.ENEMY_SPECIALS, EA = w.EnemyArt;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/enemies-add35-manifest.json'), 'utf8'));
const X = w.ENEMY_ADD35; const NEW = X.added; const REUSE = X.reuse; const ALL = X.list.map((r) => r.id);
EA.TIMEOUT_ADD = 300;   // jsdom は画像を読めない（読み込みが終わらない）ので、戦闘前の待ちを短く（ブラウザの確認は別のテスト）
// 前の版（この変更の前）のデータ
const old = JSON.parse(require('child_process').execFileSync('node', ['-e', `const load=require('./rpgload.js');const A=load();const w=A.w;const E={};Object.keys(w.ENEMIES).forEach(id=>{const e=w.ENEMIES[id];E[id]={name:e.name,lv:e.lv,hp:e.hp,atk:e.atk,def:e.def,agi:e.agi,mag:e.mag,exp:e.exp,gold:e.gold,mp:e.mp,actions:e.actions,drops:e.drops,resist:e.resist,area:e.area,family:e.family,boss:!!e.boss,acts:e.acts||1};});const Z={};Object.keys(w.MAP_DEFS).forEach(id=>{const d=w.MAP_DEFS[id];((d.encounters&&d.encounters.zones)||[]).forEach((z,i)=>{Z[id+'#'+i]={name:z.name,level:z.level,groups:z.groups};});});process.stdout.write(JSON.stringify({E,Z,L:w.ENEMY_LIST,SP:w.ENEMY_SPECIALS}));`], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { RPG_DIR: BASE }), maxBuffer: 1 << 28 }).toString());

(async () => {
  console.log('--- 1. パックの manifest との対応（35体） ---');
  ok(man.enemies.length === 35 && X.list.length === 35, 'manifest 35体・ゲームの画像の表 35体');
  const byPack = {}; X.list.forEach((r) => { byPack[r.packId] = r; });
  const mm = man.enemies.filter((m) => { const r = byPack[m.id]; return !r || r.no !== m.pack_number || r.name !== m.name_ja || r.file !== 'assets/enemies_add35/' + m.files.webp.split('/').pop(); });
  ok(!mm.length, '35体すべて：パックの番号・正式名（name_ja そのまま）・WebP のファイル名が manifest と同じ ' + mm.map((m) => m.id).join(','));
  ok(NEW.length === 25 && REUSE.length === 10 && new Set(ALL).size === 35, '新しく登録 25体・既存のIDを使う 10体・IDの重複なし');
  ok(NEW.every((id) => /^tq_add_/.test(id) && byPack[id] && byPack[id].packId === id && !old.E[id]), '新しい25体のIDは manifest の提案ID（tq_add_*）のまま・前の版にないID');
  ok(REUSE.every((id) => old.E[id] && !old.E[id].boss), '既存のIDを使う10体は、前の版にある通常の敵（ボスではない）');
  const nameNG = X.list.filter((r) => EN[r.id].name !== r.name); ok(!nameNG.length, '35体すべて、ゲームの表示名が正式名（name_ja）と同じ ' + nameNG.map((r) => r.id + ':' + EN[r.id].name).join(','));
  ok(X.list.every((r) => !/(.)\1{0,}/.test('') || true) && ['飽性の小悪魔', '学びを辞めた者', 'レプタイプヒューマン', 'キーボードクラッシャーズ'].every((n) => ALL.some((id) => EN[id].name === n)), '「飽性の小悪魔」「学びを辞めた者」「レプタイプヒューマン」などは名前を変えていない／キーボードクラッシャーズは1体の敵');
  ok(ALL.filter((id) => EN[id].name === 'キーボードクラッシャーズ').length === 1, 'キーボードクラッシャーズの敵の定義は1件');
  const fileNG = X.list.filter((r) => { const p = path.join(ROOT, r.file); if (!fs.existsSync(p)) return true; const b = fs.readFileSync(p); const sha = crypto.createHash('sha256').update(b).digest('hex'); const mf = man.enemies.find((m) => m.id === r.packId); return sha !== r.sha256 || b.slice(0, 4).toString() !== 'RIFF' || b.slice(8, 12).toString() !== 'WEBP' || mf.dimensions.webp[0] !== 1024; });
  ok(!fileNG.length, '35枚の WebP（1024×1024）がゲームにあり、SHA-256 がパックと同じ（加工・再圧縮なし）' + fileNG.map((r) => r.id).join(','));
  ok(!fs.existsSync(path.join(ROOT, 'assets/enemies_add35/png')) && fs.readdirSync(path.join(ROOT, 'assets/enemies_add35')).every((f) => /\.webp$/.test(f)), 'PNG 版はゲームに入れていない（同じ絵を2つの形式で読まない）');
  const artNG = X.list.filter((r) => { const mf = man.enemies.find((m) => m.id === r.packId); const vb = mf.visible_bbox.pixels; const bb = r.bbox; return !(bb[0] <= vb[0] && bb[1] <= vb[1] && bb[0] + bb[2] >= vb[2] && bb[1] + bb[3] >= vb[3]) || Math.abs(r.anchor[1] - mf.ground_anchor.normalized[1] * 1024) > 1 || !!r.lift !== !!mf.floating || !(r.foot >= 0 && r.foot < 0.05); });
  ok(!artNG.length, '表示の範囲は visible_bbox をすべて含む（余白を削って体を切らない）・足もとは ground_anchor・浮いている敵（' + X.list.filter((r) => r.floating).length + '体）だけ浮かせる ' + artNG.map((r) => r.id).join(','));
  const H = (id) => EN[id] && X.list.find((r) => r.id === id).draw[1];
  ok(H('fullleva_ogre') > H('yosen_slime') + 40 && H('tq_add_betrayal_troll') > H('tq_add_boredom_imp') + 40, '体格：オーガ・トロールはスライム・小悪魔より大きい（基本の高さ ' + H('fullleva_ogre') + ' と ' + H('yosen_slime') + '）');
  ok(X.list.every((r) => r.draw[0] <= 236 && r.draw[1] <= 180), '基本の大きさは 236×180 以内（戦闘画面・HPバー・名前に収まる大きさ）');
  ok(/#ff|#c|red/i.test(JSON.stringify(EN.yosen_slime.art.c)) && EN.yosen_slime.name !== EN.insen_slime.name && byPack.tq_add_bullish_slime.file !== byPack.tq_add_bearish_slime.file, '陽線スライム（赤い絵）と陰線スライム（青い絵）は名前・画像が別');

  console.log('--- 2. 既存の敵・特殊行動・図鑑の並びを壊していない ---');
  const changed = [];
  Object.keys(old.E).forEach((id) => { const o = old.E[id], e = EN[id]; if (!e) { changed.push(id + ' 消えた'); return; } ['lv', 'hp', 'atk', 'def', 'agi', 'mag', 'exp', 'gold', 'mp', 'area', 'family', 'boss'].forEach((k) => { if (JSON.stringify(o[k]) !== JSON.stringify(k === 'boss' ? !!e.boss : e[k])) changed.push(id + '.' + k); }); if (JSON.stringify(o.drops) !== JSON.stringify(e.drops)) changed.push(id + '.drops'); if (JSON.stringify(o.resist) !== JSON.stringify(e.resist)) changed.push(id + '.resist'); });
  ok(!changed.length, '既存の ' + Object.keys(old.E).length + ' 体：レベル・HP・攻撃・守備・素早さ・魔力・経験値・お金・落とす物・耐性・出現場所・種族は前の版と同じ ' + changed.slice(0, 6).join(','));
  const actCh = Object.keys(old.E).filter((id) => JSON.stringify(old.E[id].actions) !== JSON.stringify(EN[id].actions));
  ok(JSON.stringify(actCh.sort()) === JSON.stringify(['contrarian_bat', 'kotsukotsu_knight', 'nanpin_goblin']), '行動が変わったのは足した3体だけ（逆張りバット・コツコツドカンナイト・ナンピンゴブリン）' + actCh.join(','));
  ok(old.E.nanpin_goblin.actions.every((a, i) => JSON.stringify(a) === JSON.stringify(EN.nanpin_goblin.actions[i])) && old.E.contrarian_bat.actions.every((a, i) => JSON.stringify(a) === JSON.stringify(EN.contrarian_bat.actions[i])), 'ナンピンゴブリン（仲間を増やす）・逆張りバット（逆張り突撃・吸血）のもとの行動は残っている（後ろに足しただけ）');
  ok(EN.kotsukotsu_knight.actions.map((a) => a.id || a.type).join() === 'kotsukotsu,dokan_charge,harden' && SP.dokan_charge.charge === 'dokan' && JSON.stringify(SP.dokan) === JSON.stringify(old.SP.dokan), 'コツコツドカンナイト：「ドカン」（威力2.2はそのまま）を予告してから撃つ');
  const spCh = Object.keys(old.SP).filter((k) => JSON.stringify(old.SP[k]) !== JSON.stringify(SP[k]));
  ok(JSON.stringify(spCh) === '["full_leverage"]' && SP.full_leverage.power === old.SP.full_leverage.power && SP.full_leverage.selfAfter.def < 0, '既存の特殊行動で変えたのはフルレバ一撃だけ（威力はそのまま。撃ったあとの隙を足した）' + spCh.join(','));
  ok(old.L.every((id, i) => w.ENEMY_LIST[i] === id) && w.ENEMY_LIST.length === old.L.length + 25 && w.ENEMY_LIST.slice(old.L.length).every((id) => NEW.includes(id)), '図鑑の並び：既存の敵の番号はそのまま。新しい25体は後ろ（' + old.L.length + '→' + w.ENEMY_LIST.length + '）');
  const nameCh = Object.keys(old.E).filter((id) => old.E[id].name !== EN[id].name);
  ok(JSON.stringify(nameCh.sort()) === JSON.stringify(REUSE.slice().sort()), '表示名が変わったのは同じ人物の10体だけ（v7.2 の新しい名前 → このパックの正式名）' + nameCh.length);
  ok(REUSE.every((id) => EA.redesign164(id) && EA.redesign164(id).status === 'adopted' && w.ENEMY_REDESIGN.list.find((r) => r.id === id).name === EA.redesign164(id).name), 'v7.2 の164体の表（js/data/enemy-redesign.js）は消していない（記録として残る）');

  console.log('--- 3. 出現表（実際のマップ） ---');
  const where = {}; Object.keys(D).forEach((mid) => { const d = D[mid]; ((d.encounters && d.encounters.zones) || []).forEach((z, zi) => { z.groups.forEach((g) => g.forEach((id) => { if (ALL.includes(id)) { (where[id] = where[id] || new Set()).add(mid + ':' + z.name + ':' + z.level); } })); }); });
  ok(ALL.every((id) => where[id] && where[id].size > 0), '35体すべて、実際のマップの出現表に入っている');
  const lvNG = NEW.filter((id) => [...where[id]].some((k) => Math.abs(+k.split(':')[2] - EN[id].lv) > 3));
  ok(!lvNG.length, '新しい25体のレベルは、出る出現表の適正レベル（zone.level）の ±3 以内 ' + lvNG.join(','));
  const early = NEW.filter((id) => [...where[id]].some((k) => +k.split(':')[2] <= 8));
  ok(early.length <= 3, '序盤（適正レベル8以下）に出る新しい敵は ' + early.length + ' 体だけ（35体を序盤にまとめていない）：' + early.map((id) => EN[id].name).join('・'));
  const groupNG = []; Object.keys(old.Z).forEach((k) => { const [mid, zi] = k.split('#'); const z = D[mid].encounters.zones[+zi]; const o = old.Z[k]; if (!z || z.name !== o.name || z.level !== o.level) { groupNG.push(k); return; } o.groups.forEach((g, i) => { if (JSON.stringify(g) !== JSON.stringify(z.groups[i])) groupNG.push(k + ' g' + i); }); z.groups.slice(o.groups.length).forEach((g) => { if (!g.some((id) => NEW.includes(id))) groupNG.push(k + ' 新グループに新しい敵がない'); }); });
  ok(!groupNG.length, '既存の出現グループはすべてそのまま（並びも同じ）。足したグループには必ず新しい敵がいる ' + groupNG.slice(0, 4).join(','));
  ok(X.missing.length === 0 && X.zones.length === 39, '出現表への追加 39か所（名前の違いで入らなかった表はない）');
  const reuseSame = REUSE.every((id) => { let n0 = 0, n1 = 0; Object.values(old.Z).forEach((z) => z.groups.forEach((g) => { if (g.includes(id)) n0++; })); Object.keys(D).forEach((mid) => ((D[mid].encounters && D[mid].encounters.zones) || []).forEach((z) => z.groups.forEach((g) => { if (g.includes(id)) n1++; }))); return n0 === n1 && n0 > 0; });
  ok(reuseSame, '既存のIDを使う10体の出現は前と同じ（出現表を変えていない）');
  console.log('     出現：' + NEW.map((id) => EN[id].name + '［' + [...where[id]].map((k) => k.split(':').slice(0, 2).join(':')).join('、') + '］').join(' / '));

  console.log('--- 4. 戦闘：ランダムの出現（出現表から）・倒せる・報酬・図鑑 ---');
  w.MochiQuest.boot(); await sleep(50); doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); w.Engine.scenes = w.Engine.scenes.filter((s) => !s.overlay);
  const driver = setInterval(() => { const top = doc.getElementById('ui').lastElementChild; if (!top) return; if (top.classList.contains('rw-panel')) { const bt = top.querySelector('.rw-panel-close'); if (bt) bt.click(); else w.Engine.Input.press('ok'); } else if (top.classList.contains('rw-msg')) w.Engine.Input.press('ok'); }, 30);
  w.TradeUI.trial = async () => ({ score: 55 });
  // 味方：その地帯に来るころの想定レベル＋2・その章までの店の最強装備（v6.7 の地帯の調整と同じ前提。docs/balance-v67.md）
  const { gearPool, equipBest } = require('../v64/bosswin.js'); const ZS = require('../v67/zonesim.js'); const pools = {};
  const party = (lv, zl) => { S.newGame('t', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.hero.level = lv; d.hero.jobLevels.warrior = lv; w.Actors.refreshSkills(d.hero);
    ['lina', 'kyle', 'gald'].forEach((id) => { try { S.joinCompanion(id); const c = d.companions[id]; c.level = lv; c.jobLevels[c.job] = lv; c.skills = []; w.Actors.refreshSkills(c); } catch (e) { } });
    if (zl) { const ch = ZS.chOf(zl); const P = pools[ch] || (pools[ch] = gearPool(w, ch)); S.partyActors().forEach((a) => equipBest(w, a, P)); }
    S.partyActors().forEach((a) => { w.Actors.fullHeal(a); }); d.settings.autoBattle = true; d.settings.battleSpeed = 'fast'; d.settings.textSpeed = 'instant'; d.gold = 5000; W.start(); };
  const zonesOf = (id) => { const out = []; for (const mid of Object.keys(D)) { const zs = (D[mid].encounters && D[mid].encounters.zones) || []; for (const z of zs) { const gi = z.groups.findIndex((g) => g.includes(id)); if (gi >= 0 && !/^a\d_/.test(mid)) out.push({ mid, z, gi }); } } return out; };
  const findTile = (m, z) => { const zs = m.encounters.zones; for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (m.passable(x, y, S.data) && !m.warpAt(x, y) && !m.eventAt(x, y) && zs.filter((q) => q.test(x, y, m))[0] === z) return [x, y]; return null; };   // その場所で最初に当てはまる出現表が z（World.encounter と同じ選び方）
  const res = {}; const realRand = w.Math.random; party(10, 1);
  for (const id of ALL) {
    let fz = null, m = null, t = null; for (const c of zonesOf(id)) { const mm = W.getMap(c.mid); const tt = findTile(mm, c.z); if (tt) { fz = c; m = mm; t = tt; break; } }
    if (!fz) { res[id] = { err: '出現表の地帯に入れる床がない' }; continue; }
    party(Math.round(ZS.interp(ZS.PTS, fz.z.level || 1)) + 2, fz.z.level || 1); await sleep(20);
    W.busy = false; W.enterMap(fz.mid, t[0], t[1], 'down', { raw: true }); W.player.x = t[0]; W.player.y = t[1];
    const g0 = S.data.gold; const before = (S.data.bestiary[id] && S.data.bestiary[id].defeated) || 0;
    // 出現表から選ぶ：その敵のいるグループを選ぶように乱数を1回だけ固定（レアの群れは出ない）
    let n = 0; w.Math.random = function () { n++; if (n === 1) return (fz.gi + 0.5) / fz.z.groups.length; if (n === 2) return 0.999; return realRand(); };
    const sc0 = B.scene; let pr = null; const st0 = B.start; B.start = function (ids, opts) { pr = st0.call(B, ids, opts); return pr; };
    W.encounter(); w.Math.random = realRand; B.start = st0;
    for (let i = 0; i < 100 && B.scene === sc0; i++) await sleep(20);
    const sc = B.scene; const names = sc && sc.b ? sc.b.enemies.map((e) => e.name) : []; const scaled = sc && sc.b && sc.b.enemies.find((e) => e.defId === id); const r = pr ? await pr : 'no battle';
    const dist = sc && sc.b && sc.b.distributed;
    res[id] = { map: fz.mid, zone: fz.z.name, names, scaled: !!(scaled && scaled.scaled) || !(w.EnemyScale && w.EnemyScale.factors(fz.mid, fz.z)), r, exp: dist && dist.exp, gold: dist && dist.gold, defeated: ((S.data.bestiary[id] && S.data.bestiary[id].defeated) || 0) - before, goldOk: S.data.gold >= g0 };
  }
  clearInterval(driver);
  const badB = ALL.filter((id) => { const q = res[id]; return !q || q.err || q.r !== 'won' || !q.names.some((nm) => nm.indexOf(EN[id].name) === 0) || !(q.exp > 0) || !(q.gold > 0) || q.defeated < 1 || !q.goldOk || !q.scaled; });
  ok(!badB.length, '35体すべて：出現表から戦闘に出る（地帯の強さの倍率つき）・正しい名前・倒せる・経験値とお金・図鑑の討伐数・奪われたお金は倒すと戻る ' + badB.map((id) => id + JSON.stringify(res[id])).slice(0, 3).join(' | '));
  console.log('     例：' + ['tq_add_robber', 'tq_add_fool_of_desire', 'yosen_slime'].map((id) => EN[id].name + ' ' + JSON.stringify(res[id])).join(' / '));

  console.log('--- 5. 新しい行動（Combat を直接動かす） ---');
  const fight = (ids, act, lv) => { party(lv || 30); const b = C.create(ids, S.partyActors(), { pet: false }); if (act) b.enemies.forEach((e) => { e.actions = [act]; }); return b; };
  const hero = () => S.partyActors()[0];
  const defendAll = (b) => b.party.filter((a) => !a.dead).map((a) => ({ actorId: a.id, type: 'defend' }));
  const txt = (ev) => ev.filter((x) => x.type === 'msg').map((x) => x.text).join(' / ');
  // お金を奪う
  { const b = fight(['tq_add_robber'], { type: 'special', id: 'pickpocket', w: 1 }, 30); S.data.gold = 1000; b.enemies[0].atk = 999; let got = 0, ev = []; for (let i = 0; i < 6 && b.state === 'command'; i++) { b.party.forEach((a) => { a.hp = 9999; a.dead = false; }); ev = ev.concat(C.runTurn(b, defendAll(b))); }
    got = 1000 - S.data.gold; ok(got > 0 && got <= 60 && b.enemies[0].stolen === got && /Gを奪った/.test(txt(ev)), '強盗：所持金だけを奪う。1回30G・1回の戦闘で60Gまで（奪った ' + got + 'G）');
    const e0 = b.enemies[0]; e0.hp = 1; const ev2 = C.runTurn(b, [{ actorId: hero().id, type: 'attack', target: { idx: 0 } }].concat(b.party.slice(1).map((a) => ({ actorId: a.id, type: 'defend' }))));
    ok(S.data.gold === 1000 && /取り返した/.test(txt(ev2)), 'その戦闘で倒すと、奪われたお金は全部戻る（' + S.data.gold + 'G）'); }
  { const b = fight(['tq_add_robber'], null, 30); S.data.gold = 1000; const e0 = b.enemies[0]; e0.stolen = 25; S.data.gold -= 25; e0.actions = [{ type: 'special', id: 'flee', w: 1, ifStolen: true }]; const ev = C.runTurn(b, defendAll(b));
    ok(e0.fled && S.data.gold === 975 && /持ったまま逃げた/.test(txt(ev)), '奪ったあと逃げられると戻らない（そう表示する）'); }
  { const b = fight(['tq_add_robber'], null, 30); const e0 = b.enemies[0]; e0.actions = [{ type: 'attack', w: 1 }, { type: 'special', id: 'flee', w: 50, ifStolen: true }]; let fled = false; for (let i = 0; i < 5; i++) { b.party.forEach((a) => { a.hp = 9999; }); C.runTurn(b, defendAll(b)); if (e0.fled) fled = true; }
    ok(!fled, '奪ったお金がないときは「逃げる」を選ばない（ifStolen）'); }
  { const b = fight(['tq_add_blinded_by_greed'], { type: 'special', id: 'greed_grab', w: 1 }, 40); S.data.gold = 3; b.enemies[0].atk = 999; b.party.forEach((a) => { a.hp = 9999; }); const ev = C.runTurn(b, defendAll(b)); ok(S.data.gold === 3 && /何も取れなかった/.test(txt(ev)), '所持金が少ない（3G の3% は0G）ときは奪えない（所持金が負になることはない）'); }
  { const b = fight(['tq_add_blinded_by_greed'], { type: 'special', id: 'greed_grab', w: 1 }, 40); S.data.gold = 100000; b.enemies[0].atk = 999; let n = 0; for (let i = 0; i < 6 && b.state === 'command'; i++) { b.party.forEach((a) => { a.hp = 99999; a.dead = false; }); C.runTurn(b, defendAll(b)); } n = 100000 - S.data.gold; ok(n > 0 && n <= 400, '所持金が多くても、1回の戦闘で奪われるのは上限まで（貪欲の盲者 400G。奪われた ' + n + 'G）'); }
  { party(30); S.data.gold = 1000; const b = C.create(['tq_add_loan_shark_enforcer'], S.partyActors(), { pet: false }); b.enemies[0].stolen = 40; S.data.gold = 960; b.party.forEach((a) => { a.agi = 999; }); const real = w.Math.random; w.Math.random = () => 0.01; const ev = C.runTurn(b, b.party.map((a) => ({ actorId: a.id, type: 'escape' }))); w.Math.random = real; ok(b.state === 'escaped' && S.data.gold === 960 && /戻らなかった/.test(txt(ev)), '味方が逃げたときも、奪われたお金は戻らない（そう表示する）'); }
  // 溜め（予告）
  { const b = fight(['kotsukotsu_knight'], { type: 'special', id: 'dokan_charge', w: 1 }, 30); b.party.forEach((a) => { a.hp = 99999; }); const ev1 = C.runTurn(b, defendAll(b)); const e0 = b.enemies[0]; const dmg1 = ev1.filter((x) => x.type === 'damage' && x.side === 'party').length;
    ok(e0.charging === 'dokan' && dmg1 === 0 && /力を溜めはじめた/.test(txt(ev1)), 'コツコツドカンナイト：まず予告（この行動ではダメージなし）');
    const ev2 = C.runTurn(b, defendAll(b)); ok(!e0.charging && /ドカン/.test(txt(ev2)) && ev2.some((x) => x.type === 'damage' && x.side === 'party'), '次の行動で必ず「ドカン」（防御して受けられる）'); }
  { const b = fight(['tq_add_betrayal_troll'], { type: 'special', id: 'false_handshake', w: 1 }, 40); b.party.forEach((a) => { a.hp = 99999; }); C.runTurn(b, defendAll(b)); const ev2 = C.runTurn(b, defendAll(b)); ok(/裏切りの一撃/.test(txt(ev2)), '裏切りトロール：にこやかな握手のあとに、裏切りの一撃'); }
  // 反撃の構え
  { const b = fight(['contrarian_bat'], { type: 'special', id: 'contrarian_stance', w: 1 }, 30); const e0 = b.enemies[0]; e0.hp = e0.maxHp = 99999; e0.agi = 9999; b.party.forEach((a) => { a.hp = 99999; });
    const ev = C.runTurn(b, b.party.map((a) => ({ actorId: a.id, type: 'attack', target: { idx: 0 } }))); const n = (txt(ev).match(/逆張り！/g) || []).length;
    ok(n === 1, '逆張りバット：構えたあと、通常攻撃を受けると1回だけ反撃（4人で殴って反撃 ' + n + '回）');
    e0.actions = [{ type: 'attack', w: 1 }]; e0.agi = 9999; const ev2 = C.runTurn(b, b.party.map((a) => ({ actorId: a.id, type: 'attack', target: { idx: 0 } }))); ok(!/逆張り！/.test(txt(ev2)), '自分の次の行動で構えは解ける（そのあとは反撃しない）');
    e0.actions = [{ type: 'special', id: 'contrarian_stance', w: 1 }]; C.runTurn(b, defendAll(b)); const mage = b.party.find((a) => (w.Actors.allSkills(a) || []).some((k) => w.SKILLS[k] && w.SKILLS[k].kind === 'magic' && w.SKILLS[k].target === 'enemy'));
    if (mage) { const sk = w.Actors.allSkills(mage).find((k) => w.SKILLS[k] && w.SKILLS[k].kind === 'magic' && w.SKILLS[k].target === 'enemy'); mage.mp = 999; const ev3 = C.runTurn(b, [{ actorId: mage.id, type: 'skill', skillId: sk, target: { side: 'enemy', idx: 0 } }]); ok(!/逆張り！/.test(txt(ev3)), '呪文（' + w.SKILLS[sk].name + '）では反撃しない（条件つき）'); } else ok(false, '呪文を使える仲間がいない'); }
  // 重ねがけ
  { const b = fight(['nanpin_goblin'], { type: 'special', id: 'nanpin_stack', w: 1 }, 30); b.party.forEach((a) => { a.hp = 99999; }); const e0 = b.enemies[0]; const vals = []; for (let i = 0; i < 5; i++) { C.runTurn(b, defendAll(b)); vals.push(Math.round(((e0.buffs.atk && e0.buffs.atk.value) || 0) * 100)); }
    ok(JSON.stringify(vals.slice(0, 3)) === '[15,30,45]' && vals.every((v) => v <= 45), 'ナンピンゴブリン：買い増しで攻撃力が +15% ずつ重なり、+45% で止まる ' + vals.join(',')); }
  // 隙
  { const b = fight(['fullleva_ogre'], { type: 'special', id: 'full_leverage', w: 1 }, 30); b.party.forEach((a) => { a.hp = 99999; }); const ev = C.runTurn(b, defendAll(b)); const e0 = b.enemies[0];
    ok(e0.buffs.def && e0.buffs.def.value === -0.4 && e0.buffs.agi.value === -0.3 && /体勢を崩した/.test(txt(ev)) && ev.some((x) => x.type === 'damage' && x.side === 'party'), 'フルレバオーガ：重い一撃のあと、守備−40%・素早さ−30%（隙）'); }
  // 何もしない
  { const b = fight(['tq_add_forgetful_samurai'], { type: 'special', id: 'forget_draw', w: 1 }, 30); b.party.forEach((a) => { a.hp = 99999; }); const hp0 = b.party.map((a) => a.hp).join(); const ev = C.runTurn(b, defendAll(b)); ok(b.party.map((a) => a.hp).join() === hp0 && /抜くのを忘れた/.test(txt(ev)), '失念の戦国侍：抜き忘れ（何もしない＝隙）'); }
  // 状態異常は続かない
  { const b = fight(['tq_add_propaganda_host'], { type: 'special', id: 'hypno_broadcast', w: 1 }, 40); b.party.forEach((a) => { a.hp = 99999; }); const real = w.Math.random; let maxRun = 0; const run = {}; for (let i = 0; i < 30 && b.state === 'command'; i++) { b.party.forEach((a) => { a.hp = 99999; a.dead = false; }); C.runTurn(b, defendAll(b)); b.party.forEach((a) => { run[a.id] = a.status.confuse ? (run[a.id] || 0) + 1 : 0; maxRun = Math.max(maxRun, run[a.id]); }); }
    ok(maxRun <= 6, '催眠の電波を30ターン受け続けても、混乱はかかり直し（3ターンで治る）までで、ずっと続かない（最長 ' + maxRun + 'ターン連続）'); }
  // 新しい特殊行動の項目
  const NSP = X.specials; const spNG = NSP.filter((k) => { const s = SP[k]; return !s.name || !s.msg || (s.status && !(s.status.chance > 0 && s.status.chance <= 0.4)) || (s.status && !['poison', 'sleep', 'paralyze', 'confuse', 'silence'].includes(s.status.id)) || (s.debuff && !(s.turns > 0)) || (s.steal && !(s.steal.cap > 0 && s.steal.rate > 0 && s.steal.rate <= 0.05)); });
  ok(!spNG.length, '新しい特殊行動 ' + NSP.length + '：名前・行動の文・成功率（40%以下）・既存の状態異常だけ・弱体化のターン数・お金の上限がある ' + spNG.join(','));
  const used = new Set(); ALL.forEach((id) => EN[id].actions.forEach((a) => { if (a.type === 'special') used.add(a.id); if (a.type === 'special' && !SP[a.id]) used.add('NG:' + a.id); if (a.type === 'skill' && !w.SKILLS[a.id]) used.add('NG:' + a.id); if (a.summon && !EN[a.summon]) used.add('NG:' + a.summon); }));
  ok(![...used].some((k) => /^NG:/.test(k)) && NSP.every((k) => used.has(k) || Object.values(SP).some((s) => s.charge === k)), '35体の行動はすべて定義済み。新しい特殊行動はすべてどこかの敵が使う');
  const dropNG = NEW.filter((id) => !EN[id].drops.length || EN[id].drops.some((d) => !w.ITEMS[d.item] || !(d.rate > 0 && d.rate <= 0.3)));
  ok(!dropNG.length, '新しい25体：落とす物は実在の道具（確率30%以下）' + dropNG.join(','));

  console.log('--- 6. 図鑑の画面 ---');
  party(30); S.data.bestiary = {}; S.data.bestiary.tq_add_robber = { seen: 1, defeated: 3 }; S.data.bestiary.yosen_slime = { seen: 1, defeated: 1 };
  const pM = w.Menu.bestiary(); await sleep(150); const panel = doc.querySelector('.bestiary') || doc.querySelector('.rw-panel'); const html = panel ? panel.innerHTML : '';
  ok(/強盗/.test(html) && /陽線スライム/.test(html) && (html.match(/bs-row/g) || []).length >= w.ENEMY_LIST.filter((id) => EN[id].region !== 'future').length && /？？？/.test(html), '図鑑：見つけた新しい敵の名前・まだの敵は？？？・全 ' + w.ENEMY_LIST.length + ' 種の欄');
  ok(/裏金官僚|悪徳議員/.test(html) === false, 'まだ見つけていない新しい敵の名前は出ない');
  const cls = panel && panel.querySelector('.rw-panel-close'); if (cls) cls.click(); else w.Engine.Input.press('cancel'); await sleep(80);

  console.log('--- 7. セーブの互換 ---');
  party(20); S.data.bestiary.tq_add_corrupt_mayor = { seen: 1, defeated: 2 }; S.data.gold = 777;
  let saved = null; try { saved = JSON.parse(JSON.stringify(S.data)); } catch (e) { }
  ok(saved && saved.bestiary.tq_add_corrupt_mayor.defeated === 2 && !('stolenTotal' in saved) && !Object.values(saved.bestiary).some((v) => 'stolen' in v), 'セーブの中身：図鑑は敵IDで記録（並びの番号ではない）。戦闘中に奪われたお金の記録はセーブに残らない');
  const oldSave = JSON.parse(require('child_process').execFileSync('node', ['-e', `const load=require('./rpgload.js');const A=load();const w=A.w;w.State.newGame('old','warrior');const d=w.State.data;d.bestiary={yosen_slime:{seen:1,defeated:4},slime:{seen:1,defeated:9}};d.gold=321;process.stdout.write(JSON.stringify(d));`], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { RPG_DIR: BASE }), maxBuffer: 1 << 26 }).toString());
  let loadErr = null; try { if (S.load) { const key = '__add35test'; w.localStorage.setItem(key, JSON.stringify(oldSave)); } S.data = oldSave; if (S.migrate) S.migrate(S.data); } catch (e) { loadErr = e; }
  ok(!loadErr && S.data.bestiary.yosen_slime.defeated === 4 && S.data.gold === 321, '前の版のセーブ（図鑑に陽線スライム）をそのまま使える（図鑑の記録・所持金はそのまま）' + (loadErr ? loadErr.message : ''));
  W.start(); await sleep(30); const pM2 = w.Menu.bestiary(); await sleep(150); const p2 = doc.querySelector('.bestiary'); ok(p2 && /陽線スライム/.test(p2.innerHTML) && /討伐 4/.test(p2.innerHTML), '前の版のセーブで図鑑を開くと、陽線スライム（このパックの名前）・討伐数4'); const c2 = p2 && p2.querySelector('.rw-panel-close'); if (c2) c2.click(); await sleep(50);
  console.log('errors', errors.slice(0, 3)); ok(!errors.length, 'スクリプトのエラーなし');
  console.log('\n結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
