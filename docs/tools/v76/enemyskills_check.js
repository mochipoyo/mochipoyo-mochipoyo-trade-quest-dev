// v7.6 敵の固有技・全体攻撃の技（skills76 / enemyskills76）の確認（jsdom。node docs/tools/v76/enemyskills_check.js）
// ・全部の敵に固有技（e76）があるか／ボスは手書きの2つがあるか／技の名前が重複しないか／演出（FX65）があるか
// ・全部の敵と戦闘を数ターン回して、例外が出ないか（敵の技を必ず1回は使わせる）
// ・職業・キャラの技：21職業×10・17人×10、ID・名前の重複なし、旧セーブ（技が少ない）に足されるか
process.env.RPG_DIR = process.env.RPG_DIR || require('path').resolve(__dirname, '../../..') + '/';
const load = require(process.env.RPG_LOADER || '/home/claude/work/rpgload.js'); const { w, errors } = load();
const E = w.ENEMIES, S = w.SKILLS, ES = w.EnemySkills76; let ng = [];
const ok = (c, m) => { if (!c) ng.push(m); };
ok(errors.length === 0, '読み込みエラー ' + errors.slice(0, 3).join(' / '));
ok(!!ES, 'EnemySkills76 がない');
const names = {}; Object.keys(S).forEach(k => { const n = S[k].name; if (names[n] && (S[k].e76 || S[k].v76)) ng.push('名前の重複 ' + n + ' ' + k + ' ' + names[n]); names[n] = names[n] || k; });
let bossN = 0, normN = 0;
Object.keys(E).forEach(id => { const e = E[id]; const own = (e.actions || []).filter(a => a.type === 'skill' && S[a.id] && S[a.id].e76 && !S[a.id].base);
  ok(own.length >= 1, '固有技なし ' + id);
  if (e.boss && ES.BOSS[id]) { bossN++; ok(own.length === 2 && own.some(a => a.hpBelow === 0.5), 'ボスの固有技が2つでない ' + id); } else normN++;
  (e.actions || []).forEach(a => { if (a.type === 'skill') { ok(!!S[a.id], '技がない ' + id + ' ' + a.id); ok(!!w.FX65.DEFS[a.id], '演出がない ' + a.id); if (S[a.id] && S[a.id].e76) ok(S[a.id].mp === 0 || S[a.id].base, 'MP が 0 でない ' + a.id); } });
});
const bosses = Object.keys(E).filter(k => E[k].boss).length;
ok(bossN === bosses, 'ボスの手書き ' + bossN + '/' + bosses);
// 戦闘
w.State.newGame('確認', 'warrior'); const d = w.State.data; d.hero.level = 40; w.Actors.refreshSkills(d.hero); w.Actors.fullHeal(d.hero);
let used = 0, battles = 0;
Object.keys(E).forEach(id => {
  try {
    const party = [d.hero]; w.Actors.fullHeal(d.hero);
    const b = w.Combat.create([id], party, { boss: !!E[id].boss });
    b.enemies.forEach(en => { en.hp = en.maxHp = 999999; en.actions = (en.actions || E[en.defId].actions).map(a => Object.assign({}, a, { hpBelow: undefined })); });
    for (let t = 0; t < 6; t++) { d.hero.hp = 99999; d.hero.dead = false; const ev = w.Combat.runTurn(b, [{ actorId: 'hero', type: 'defend' }]) || [];
      (Array.isArray(ev) ? ev : (b.log || [])).forEach(x => { if (x && x.type === 'act' && x.side === 'enemy' && x.skillId && S[x.skillId] && S[x.skillId].e76) used++; }); }
    battles++;
  } catch (er) { ng.push('戦闘で例外 ' + id + ' ' + (er && er.stack || er).toString().split('\n').slice(0, 2).join(' ')); }
});
// 職業・キャラの技
const v76 = Object.keys(S).filter(k => S[k].v76); const jobN = Object.keys(w.JOB_SKILLS76).length;
ok(Object.keys(w.JOBS).every(j => (w.JOB_SKILLS76[j] || []).length === 10) && Object.keys(w.JOBS).every(j => !w.JOBS[j].skills.some(s => /^j76_/.test(s.id))), '職業の技が10でない（または既存の一覧に入っている）');
ok(Object.keys(w.CHAR_SKILLS76).every(c => w.CHAR_SKILLS76[c].length === 10), 'キャラの技が10でない');
ok(v76.every(k => S[k].target === 'enemies'), '全体攻撃でない技がある');
ok(v76.every(k => !!w.FX65.DEFS[k]), '職業・キャラの技に演出がない');
// 旧セーブ：技が少ない状態から State.migrate で足されるか
const old = JSON.parse(JSON.stringify(d)); old.hero.skills = old.hero.skills.filter(k => !S[k] || !S[k].v76); const before = old.hero.skills.length;
w.Skills76.sync(old); const added = old.hero.skills.length - before;
ok(added > 0, '旧セーブに技が足されない');
console.log('敵', Object.keys(E).length, '（ボス', bosses, '・手書き', bossN, '）作った技', ES.made.length, '置きかえ', ES.clones.length, '戦闘', battles, '固有技を使った回数', used);
console.log('職業の技', jobN, '職業 × 10・キャラの技', Object.keys(w.CHAR_SKILLS76).length, '人 × 10・合計', v76.length, '・旧セーブ（Lv40 戦士）に足した技', added);
console.log(ng.length ? 'NG ' + ng.length + '\n' + ng.slice(0, 30).join('\n') : 'すべて OK');
process.exit(ng.length ? 1 : 0);
