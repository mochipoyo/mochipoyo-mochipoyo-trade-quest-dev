// v9.4 仲間の絆：データ（js/data/bonds94*.js）から、設計書の一覧の部分を作る（手で書き写さないので、コードと食い違わない）
//   node docs/tools/rpg94/make_doc.js > docs/companion-bonds-tables.md
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '../../..') + '/';
const sb = { window: {} }; sb.window.window = sb.window; vm.createContext(sb);
['bonds94.js', 'bonds94-ep-a.js', 'bonds94-ep-b.js', 'bonds94-ep-c.js', 'bonds94-pairs.js'].forEach((f) => vm.runInContext(fs.readFileSync(ROOT + 'js/data/' + f, 'utf8'), sb));
const B = sb.window.BONDS94;
const NAMES = { lina: 'リーナ', kyle: 'カイル', mina: 'ミナ', seris: 'セリス', gald: 'ガルド', lucia: 'ルシア', elna: 'エルナ', ganes: 'ガネス', nagi: 'ナギ', iris: 'イーリス', sophia: 'ソフィア', io: 'イオ', aster: 'アステル', ord: 'オルド', kazuto: 'カズト', mochipoyo: '謎のタイムトラベラーM', ponta: '神聖犬ポン太', hero: '主人公' };
const MAIN = { 4: '第4章（海を渡る準備）', 6: '第6章（黒い帳簿）', 7: '第7章（奪われた財産）', 8: '第8章（灰灯島の灯火）', 9: '第9章（海底の記憶）', 10: '第10章（選ばれなかった未来）', 11: '第11章（理想の島）', 12: '第12章（オラクルの真実）', 13: '第13章（魔導王国の秘密）', 14: '第14章（天空への航路）', 15: '第15章（暗黒大陸）' };
function cond(c) {
  if (!c) return '加入していれば';
  const out = [];
  if (c.q) out.push('クエスト ' + c.q.map((x) => '`' + x + '`').join('・') + ' 達成');
  if (c.main) out.push((MAIN[c.main] || '第' + c.main + '章') + ' 達成');
  if (c.flag) out.push('フラグ ' + c.flag.map((x) => '`' + x + '`').join('・'));
  if (c.noflag) out.push('フラグ ' + c.noflag.map((x) => '`' + x + '`').join('・') + ' なし');
  if (c.any) out.push('（' + c.any.map(cond).join('／または ') + '）');
  return out.join('・');
}
function walk(steps, f) { (steps || []).forEach((s) => { f(s); if (s[0] === 'if') { walk(s[2], f); walk(s[3], f); } if (s[0] === 'c') (s[2] || []).forEach((o) => { f(['opt', o]); walk(o.then, f); }); }); }
function info(sc) { const mem = new Set(), keep = new Set(); let later = false, lines = 0, choices = 0; walk(sc.steps, (s) => { if (s[0] === 'opt') { if (s[1].mem) Object.keys(s[1].mem).forEach((k) => mem.add(k)); if (s[1].keep) keep.add(s[1].keep); if (s[1].later) later = true; } if (s[0] === 'keep') keep.add(s[1]); if (s[0] === 'c') choices++; if (['n', 's', 'a', 'h'].includes(s[0])) lines += [].concat(s[0] === 's' || s[0] === 'a' ? s[2] : s[1]).length; }); return { mem: [...mem], keep: [...keep].map((k) => (B.KEEP[k] ? B.KEEP[k].name : k)), later, lines, choices }; }
let md = '# 仲間の絆：個人の話・関係の話・人物の記録の一覧（自動生成）\n\n';
md += '`node docs/tools/rpg94/make_doc.js` で `js/data/bonds94*.js` から作った一覧です（手で書き写していません）。設計の考え方は `docs/companion-bonds.md`。\n\n';
md += '## 1. 個人の話（18対象 × 3話）\n\n| ID | 人 | 題 | 解放の条件（前の話を見ていることに加えて） | 場所 | 選択の記憶（キー） | 記念品 | 文の数 / 選ぶ場面 |\n|---|---|---|---|---|---|---|---|\n';
Object.keys(NAMES).forEach((id) => [1, 2, 3].forEach((n) => { const e = B.EP[id + '_' + n]; if (!e) return; const i = info(e); md += `| \`${e.id}\` | ${NAMES[id]} | 第${n}話「${e.title}」 | ${cond(e.cond)}${i.later ? '（「今日はやめておく」で先送りできる）' : ''} | ${e.place ? e.place.label : 'どこでも（話せる場所）'} | ${i.mem.map((x) => '`' + x + '`').join(' ') || '—'} | ${i.keep.join('・') || '—'} | ${i.lines} / ${i.choices} |\n`; }));
md += '\n## 2. 関係の話（21組）\n\n| ID | 二人 | 題 | 条件（二人とも加入に加えて） | 見たあとの関係（手帳） |\n|---|---|---|---|---|\n';
Object.values(B.PAIRS).forEach((p) => { md += `| \`${p.id}\` | ${NAMES[p.a]} × ${NAMES[p.b]} | 「${p.title}」 | ${p.cond ? cond(p.cond) : '—'} | ${p.rel} |\n`; });
md += '\n## 3. 人物の記録（仲間の思い出）・絆の呼び名\n\n| 人 | 加入した場所 | 好きなもの | 絆の呼び名（0→1→2→3） | 3話を見たときのエンディングの一文 |\n|---|---|---|---|---|\n';
Object.keys(NAMES).forEach((id) => { const p = B.PROFILE[id]; if (!p) return; md += `| ${NAMES[id]} | ${p.joinPlace} | ${p.likes} | ${p.stages.join(' → ')} | ${p.epilogue} |\n`; });
md += '\n## 4. 日常会話の数\n\n| 人 | いつもの話 | 食べ物・趣味 | 地域（地域の数） | 最近の戦い | ほかの仲間 | 関係の話のあと | クリア後 |\n|---|---|---|---|---|---|---|---|\n';
Object.keys(B.CHAT).forEach((id) => { const c = B.CHAT[id]; const o = Object.values(c.others || {}).reduce((n, l) => n + l.length, 0); const pa = Object.values(c.pairAfter || {}).reduce((n, l) => n + l.length, 0); md += `| ${NAMES[id]} | ${c.daily.length} | ${c.food.length} | ${Object.values(c.region).reduce((n, l) => n + l.length, 0)}（${Object.keys(c.region).length - 1}） | ${c.battle.length} | ${o} | ${pa} | ${c.post.length} |\n`; });
md += '\n## 5. 記念品（持ち物ではない。思い出手帳の記録だけ）\n\n| ID | 名前 | 説明（{m:…} は選択の記憶） |\n|---|---|---|\n';
Object.keys(B.KEEP).forEach((k) => { md += `| \`${k}\` | ${B.KEEP[k].name} | ${B.KEEP[k].desc} |\n`; });
process.stdout.write(md);
