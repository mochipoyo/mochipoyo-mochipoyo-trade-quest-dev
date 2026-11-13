// v9.8.9 装備の外見：主人公と全仲間の「就ける職業」「装備できる品の ID」と、外見の対応（描く／足りない／仕様で描かない）を、ゲームのデータから数える（ヘッドレス Chromium）
//   PORT=…  OUT=…（docs/appear/pixel/survey_all.json・SURVEY_ALL.md）。手で書き換えない
//   ・就ける職業：JOB_LIST（ギルドの転職の一覧と同じ。全員が同じ一覧から選ぶ）。条件（unlock）は Actors.jobUnlocked と同じ決まりを文にして書く
//   ・装備できる品：Actors.canEquip（その職業の武器・防具の種類）。職業ごとに数え、人ごとに ID の和をとる
//   ・外見の対応：EquipmentAppearance.pixelPlan（ゲームと同じ重ね方）で、その人・その職業・その向きに部品が解決されるか
//       描く＝部品に解決 ／ 足りない＝形（種類）はあるが、その人の部品がない ／ 仕様で描かない＝装飾品、形の決まっていない種類（こん棒・爪）
//   ・職業の服：対応表の actors.<人物>.jobs.<職業>（服の重ね絵）、または元の絵がその職業の姿（主人公の戦士・仲間の加入時の職業）
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const PORT = process.env.PORT || 8894; const ROOT = path.resolve(__dirname, '../../../..') + '/'; const OUT = process.env.OUT || ROOT + 'docs/appear/pixel/';
(async () => {
  const br = await chromium.launch(); const p = await br.newPage();
  await p.goto(`http://localhost:${PORT}/index.html?nosw`); await p.waitForFunction(() => window.ITEMS && window.EquipmentAppearance && window.Actors && window.COMPANIONS && window.EQUIP_PIXELS, null, { timeout: 120000 });
  const r = await p.evaluate(() => {
    const EA = EquipmentAppearance; const PX = window.EQUIP_PIXELS; const pet = (window.COMPANIONS68 && COMPANIONS68.pet) || null;
    const chars = [{ id: 'hero', name: '主人公', job: 'warrior', base: 'warrior' }].concat(Object.keys(COMPANIONS).map((id) => ({ id, name: COMPANIONS[id].name, job: COMPANIONS[id].job, base: COMPANIONS[id].job })));
    const unlockText = (j) => { const u = JOBS[j].unlock; if (!u) return 'なし'; if (u.jobsAny) return u.jobsAny.map((x) => JOBS[x].name).join('か') + 'で Lv' + u.level; if (u.flag) return 'フラグ ' + u.flag + '・Lv' + u.level; return 'Lv' + u.level; };
    const items = Object.keys(ITEMS).filter((id) => ITEMS[id].cat === 'weapon' || ITEMS[id].cat === 'armor');
    const out = { pet: pet ? { id: pet, note: '4 人のパーティとは別枠（d.party に入らない）。装備の枠なし' } : null, jobs: {}, chars: {} };
    JOB_LIST.forEach((j) => { out.jobs[j] = { name: JOBS[j].name, weapons: JOBS[j].weapons, armors: JOBS[j].armors, unlock: unlockText(j) }; });
    for (const c of chars) {
      const A = PX.actors[c.id] || null; const views = A ? Object.keys(A.views) : [];
      const rec = { name: c.name, job: c.job, views, hasParts: !!A, jobs: {}, items: {} };
      for (const j of JOB_LIST) {
        const look = A ? (A.jobs && A.jobs[j] ? 'outfit' : (A.menuBase === 'job:' + j || (c.id !== 'hero' && j === c.base) ? 'base' : 'missing')) : 'noparts';
        const ids = items.filter((id) => Actors.canEquip({ job: j, equip: {} }, id));
        rec.jobs[j] = { look, n: ids.length };
        for (const id of ids) {
          if (rec.items[id]) { rec.items[id].jobs.push(j); continue; }
          const slot = Actors.slotOf(id); const L = EA.resolve({ id: c.id, equip: { [slot]: id } })[0]; const cls = L ? EA.pixelClass(L) : null;
          let st;
          if (slot === 'acc') st = 'spec';
          else if (!cls) st = 'spec';
          else if (!A) st = 'missing';
          else {
            const ok = views.every((vk) => { const q = EA.pixelPlan({ id: c.id, job: j, equip: { [slot]: id } }, vk); return q.ok && q.mats.indexOf(cls) >= 0; });
            st = ok ? 'ok' : 'missing';
          }
          rec.items[id] = { slot, shape: L ? L.shape + (L.shape === 'hat' ? '/' + L.sub : '') : '?', cls, st, jobs: [j] };
        }
      }
      out.chars[c.id] = rec;
    }
    return out;
  });
  await br.close();
  fs.writeFileSync(OUT + 'survey_all.json', JSON.stringify(r, null, 1));
  const ST = { ok: '描く', missing: '足りない', spec: '仕様で描かない' }; const LK = { outfit: '服の重ね絵', base: '元の絵', missing: '足りない', noparts: '部品なし' };
  const md = ['# 装備の外見：主人公と全仲間の職業・装備できる品 ID と、外見の対応（自動生成）', '', '`docs/tools/appear/browser/appear_survey_all.js` がゲームのデータから作る。手で書き換えない。', '',
    '- 就ける職業：全員がギルドの同じ一覧（JOB_LIST）から選ぶ。条件は職業ごと（下の表）', '- 装備できる品：Actors.canEquip（職業の武器・防具の種類）。人ごとの ID は、全職業で装備できる品の和', '- 外見：描く＝その人のすべての向きで部品に解決／足りない＝その人の部品がない／仕様で描かない＝装飾品・形の決まっていない種類（こん棒・爪）',
    r.pet ? '- ペット（' + r.pet.id + '）：' + r.pet.note + '。外見の対象外' : '', '', '## 職業', '', '| 職業 | 名前 | 武器 | 防具 | 条件 |', '|---|---|---|---|---|',
    ...Object.entries(r.jobs).map(([k, j]) => `| ${k} | ${j.name} | ${j.weapons.join('・')} | ${j.armors.join('・')} | ${j.unlock} |`), '', '## 人ごとのまとめ', '',
    '| 人物 | 加入の職業 | 部品の向き | 職業の服（服の重ね絵／元の絵／足りない） | 装備の ID（描く／足りない／仕様で描かない／計） |', '|---|---|---|---|---|'];
  for (const [id, c] of Object.entries(r.chars)) {
    const js = Object.values(c.jobs); const cnt = (k) => js.filter((x) => x.look === k).length; const it = Object.values(c.items); const ci = (k) => it.filter((x) => x.st === k).length;
    md.push(`| ${c.name}（${id}） | ${r.jobs[c.job].name} | ${c.views.join('・') || '（なし）'} | ${cnt('outfit')}／${cnt('base')}／${cnt('missing') + cnt('noparts')} | ${ci('ok')}／${ci('missing')}／${ci('spec')}／${it.length} |`);
  }
  md.push('', '## 人ごとの職業の服', '', '| 人物 | ' + Object.keys(r.jobs).map((k) => r.jobs[k].name).join(' | ') + ' |', '|---|' + Object.keys(r.jobs).map(() => '---').join('|') + '|');
  for (const [id, c] of Object.entries(r.chars)) md.push(`| ${c.name} | ` + Object.keys(r.jobs).map((k) => LK[c.jobs[k].look]).join(' | ') + ' |');
  md.push('', '## 人ごと・形ごとの装備の ID', '');
  for (const [id, c] of Object.entries(r.chars)) {
    md.push(`### ${c.name}（${id}）`, '', '| 枠：形 | 部品の種類 | 外見 | 品の数 | 装備の ID |', '|---|---|---|---|---|');
    const g = {}; for (const [iid, x] of Object.entries(c.items)) { const k = x.slot + ':' + x.shape + '|' + x.st; (g[k] = g[k] || { x, ids: [] }).ids.push(iid); }
    Object.entries(g).sort().forEach(([k, v]) => md.push(`| ${v.x.slot}:${v.x.shape} | ${v.x.cls || '（なし）'} | ${ST[v.x.st]} | ${v.ids.length} | ${v.ids.join(' ')} |`));
    md.push('');
  }
  fs.writeFileSync(OUT + 'SURVEY_ALL.md', md.join('\n') + '\n');
  console.log('結果 survey all：' + Object.entries(r.chars).map(([id, c]) => { const it = Object.values(c.items); return id + ' 描く ' + it.filter((x) => x.st === 'ok').length + '/足りない ' + it.filter((x) => x.st === 'missing').length + '/仕様 ' + it.filter((x) => x.st === 'spec').length + '・服 ' + Object.values(c.jobs).filter((x) => x.look === 'outfit' || x.look === 'base').length + '/' + Object.keys(c.jobs).length; }).join('　'));
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
