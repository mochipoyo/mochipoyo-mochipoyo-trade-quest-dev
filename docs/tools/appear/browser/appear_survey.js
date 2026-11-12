// v9.8.1 装備の外見：主人公・リーナ・ガルドの初期装備と、装備できる品のうち「外見を描かない品」を、ゲームのデータから数える（ヘッドレス Chromium）
//   PORT=…  OUT=…（docs/appear/pixel/survey.json・SURVEY.md）
//   ・装備できるか：Actors.canEquip（職業の武器・防具の種類）。主人公は戦士・リーナは僧侶・ガルドは戦士（加入したときの職業）
//   ・描くか：EquipmentAppearance.pixelPlan（その人の部品がある種類か）。装飾品は数えない（描かない決まり）
//   ・店：js/data/*.js の shopInterior(…, [品]) と c.shop(…, [品]) の品の一覧（町の ID。会話の店はファイル名:行）
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const PORT = process.env.PORT || 8894; const ROOT = path.resolve(__dirname, '../../../..') + '/'; const OUT = process.env.OUT || ROOT + 'docs/appear/pixel/';
const shops = [];
for (const f of fs.readdirSync(ROOT + 'js/data').filter((x) => x.endsWith('.js')).sort()) {
  const t = fs.readFileSync(ROOT + 'js/data/' + f, 'utf8');
  for (const m of t.matchAll(/shopInterior\(\s*'(\w+)'\s*,\s*'([^']*)'\s*,\s*'(\w+)'\s*,[^\[]*?'(weapon|armor|item|magic|tool|acc)'\s*,\s*\[([^\]]*)\]/g)) shops.push({ town: m[3], kind: m[4], items: [...m[5].matchAll(/'(\w+)'/g)].map((x) => x[1]) });
  for (const m of t.matchAll(/shop\(\s*'(\w+)'\s*,\s*\[([^\]]*)\]/g)) shops.push({ town: f + ':' + (t.slice(0, m.index).split('\n').length), kind: m[1], items: [...m[2].matchAll(/'(\w+)'/g)].map((x) => x[1]) });
}
(async () => {
  const br = await chromium.launch(); const p = await br.newPage();
  await p.goto(`http://localhost:${PORT}/index.html?nosw`); await p.waitForFunction(() => window.ITEMS && window.EquipmentAppearance && window.Actors && window.STARTER_WEAPON, null, { timeout: 120000 });
  const r = await p.evaluate((shops) => {
    const EA = EquipmentAppearance; const where = {}; shops.forEach((s) => s.items.forEach((id) => { (where[id] = where[id] || []).indexOf(s.town) < 0 && where[id].push(s.town); }));
    const actors = { hero: { id: 'hero', job: 'warrior' }, lina: { id: 'lina', job: 'priest' }, gald: { id: 'gald', job: 'warrior' } };
    const out = { starter: { hero: STARTER_WEAPON.warrior }, jobs: {}, actors: {} };
    for (const [aid, a] of Object.entries(actors)) {
      const j = JOBS[a.job]; out.jobs[aid] = { job: a.job, name: j.name, weapons: j.weapons, armors: j.armors };
      const rows = {};
      for (const [id, it] of Object.entries(ITEMS)) {
        if (it.cat !== 'weapon' && it.cat !== 'armor') continue; if (!Actors.canEquip({ job: a.job, equip: {} }, id)) continue;
        const slot = Actors.slotOf(id); if (slot === 'acc') continue;
        const L = EA.resolve({ id: aid, equip: { [slot]: id } })[0]; const cls = L ? EA.pixelClass(L) : null;
        const plan = EA.pixelPlan({ id: aid, job: a.job, equip: { [slot]: id } }, EA.menuView({ id: aid, job: a.job }));
        const drawn = !!(plan.ok && plan.mats.length);
        const key = slot + ':' + (L ? L.shape + (L.shape === 'hat' ? '/' + L.sub : '') : '?');
        const r0 = rows[key] = rows[key] || { slot, shape: key, cls, drawn: 0, not: 0, items: [], shop: [] };
        if (drawn) r0.drawn++; else r0.not++;
        r0.items.push(id); if (where[id]) r0.shop.push({ id, name: it.name, price: it.price || null, towns: where[id] });
      }
      out.actors[aid] = Object.values(rows);
    }
    return out;
  }, shops);
  await br.close();
  fs.writeFileSync(OUT + 'survey.json', JSON.stringify(r, null, 1));
  const NAME = { hero: '主人公（戦士）', lina: 'リーナ（僧侶）', gald: 'ガルド（戦士）' };
  const md = ['# 装備の外見：3 人の装備できる品と、描く／描かない品（自動生成）', '', '`docs/tools/appear/browser/appear_survey.js` がゲームのデータから作る。手で書き換えない。装飾品は数えない（外見を描かない決まり）。', '',
    '## 初期装備', '', '- 主人公：作ったときは何も装備していない。最初に村長と話すと、職業の初めの武器（戦士は ' + r.starter.hero + '）をもらって、その場で装備する（js/data/towns.js）',
    '- リーナ・ガルド：加入したとき（State.joinCompanion → Actors.create）は何も装備していない', '',
    '## 職業で装備できる種類', '', '| 人物 | 職業 | 武器 | 防具 |', '|---|---|---|---|', ...Object.entries(r.jobs).map(([k, j]) => `| ${NAME[k]} | ${j.name} | ${j.weapons.join('・')} | ${j.armors.join('・')} |`), '',
    '## 種類ごとの品の数（描く／描かない）', '', '| 人物 | 枠：形 | 部品の種類 | 描く | 描かない | 店で買える品（町） |', '|---|---|---|---|---|---|'];
  for (const [aid, rows] of Object.entries(r.actors)) rows.sort((a, b) => b.not - a.not || a.shape.localeCompare(b.shape)).forEach((x) => md.push(`| ${NAME[aid]} | ${x.shape} | ${x.cls || '（なし）'} | ${x.drawn} | ${x.not} | ${x.shop.map((s) => s.name + (s.price ? '（' + s.price + 'G）' : '') + '：' + s.towns.join('/')).join('、') || '—'} |`));
  fs.writeFileSync(OUT + 'SURVEY.md', md.join('\n') + '\n');
  const tot = (aid) => r.actors[aid].reduce((s, x) => [s[0] + x.drawn, s[1] + x.not], [0, 0]);
  console.log('結果 survey：' + Object.keys(r.actors).map((a) => a + ' 描く ' + tot(a)[0] + ' / 描かない ' + tot(a)[1]).join('　'));
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
