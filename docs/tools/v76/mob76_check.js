// v7.6 新しい形の敵7体（enemyart76）と町の人の装い（mob76）の確認（jsdom。node docs/tools/v76/mob76_check.js）
process.env.RPG_DIR = process.env.RPG_DIR || require('path').resolve(__dirname, '../../..') + '/';
const load = require(process.env.RPG_LOADER || '/home/claude/work/rpgload.js'); const { w, errors } = load();
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); };
ok(errors.length === 0, '読み込みエラー ' + errors.slice(0, 3).join(' / '));
const EA = w.EnemyArt76; ok(EA && EA.used.length === 7, '新しい形の敵が7体でない ' + (EA && EA.used.join(',')));
const fams = ['skelknight76', 'chameleon76', 'mole76', 'boulder76', 'impish76', 'beetle76', 'dread76'];
ok(fams.every((f) => w.MonsterArt.families.indexOf(f) >= 0), '種族が登録されていない');
(EA ? EA.used : []).forEach((id) => { const a = EA.artOf(id); ok(a && fams.indexOf(a.family) >= 0, '読み替えなし ' + id); ok(w.ENEMIES[id].art.family !== a.family, 'データの art を書き換えている ' + id); try { w.MonsterArt.image(w.ENEMIES[id].art, 2, 0); } catch (e) { ng.push('描けない ' + id + ' ' + e.message); } });
// 町の人の装い
w.State.newGame('t', 'warrior'); const cnt = {}; let dressed = 0, generic = 0, other = 0;
Object.keys(w.MAP_DEFS).forEach((id) => { const d = w.MAP_DEFS[id]; if (!d || (d.kind !== 'town' && d.kind !== 'castle' && d.kind !== 'interior')) return; let m = null; try { m = w.World.getMap(id); } catch (e) { return; } if (!m) return;
  m.npcs.forEach((n) => { const k = w.Mob76.kindFor(m, n); if (w.Mob76.GENERIC[n.sprite]) { generic++; if (k) { dressed++; cnt[k.kind] = (cnt[k.kind] || 0) + 1; ok(JSON.stringify(k) === JSON.stringify(w.Mob76.kindFor(m, n)), '毎回同じでない ' + n.id); } } else { other++; ok(!k, '対象外の人に装い ' + id + ' ' + n.id + ' ' + n.sprite); } }); });
ok(dressed > 50 && Object.keys(cnt).length >= 12, '装いが少ない ' + dressed + ' ' + JSON.stringify(cnt));
console.log('新しい形の敵', EA ? EA.used.join(',') : '-', '／町の人（同じ絵）', generic, '人のうち装い', dressed, '人', JSON.stringify(cnt), '／対象外', other, '人');
console.log(ng.length ? 'NG ' + ng.length + '\n' + ng.slice(0, 20).join('\n') : 'すべて OK'); process.exit(ng.length ? 1 : 0);
