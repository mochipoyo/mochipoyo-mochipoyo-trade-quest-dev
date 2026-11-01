// 3D化の集計表（実データから自動で数える）
//   NODE_PATH=<jsdom のある node_modules> node tools/status/inventory.mjs [全マップ組み立てテストの結果.json]
//   → docs/3d/status.json と docs/3d/status.md（表）を書く
// 区分
//   3D完成   … 専用に作り込んだ3D（手作業で調整したモデル・専用に作った場面）
//   仮3D     … 自動生成・共通の型・代用モデル・元の絵からの立体化など。動くが作り込みは未着手（完成扱いにしない）
//   2D代替   … 3D版でも2D版の画面・絵のまま
//   未対応   … 表示できない・組み立てに失敗した
// ※ 判定はコード上の割り当て（manifest.js・coverage.js・BattleActors3D の方式）と、渡されたテスト結果から。見た目の品質の判定ではない
import { createRequire } from 'module'; import { readFileSync, writeFileSync, existsSync } from 'fs'; import { resolve, dirname } from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url)); const ROOT3 = resolve(HERE, '../..'); const GAME = resolve(ROOT3, '..');
const { JSDOM } = require('jsdom');
const { MODELS, characterModelFor, characterStatus } = await import(resolve(ROOT3, 'src/assets/manifest.js'));
const { MAPS_DONE } = await import(resolve(ROOT3, 'src/world/coverage.js'));

// ---- ゲームのデータを読む（2D版のスクリプトをそのまま jsdom で実行）
const html = readFileSync(resolve(GAME, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.invalid/' }); const w = dom.window;
const stub = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
w.HTMLCanvasElement.prototype.getContext = function () { return stub; }; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.URL.createObjectURL = () => 'blob:x'; w.AudioContext = undefined;
for (const f of [...html.matchAll(/src="(js\/[^"]+)"/g)].map((m) => m[1])) w.eval(readFileSync(resolve(GAME, f), 'utf8'));
w.State.newGame('集計', 'warrior');

const row = (name, total, done, prov, d2, none, note) => ({ name, total, done, prov, d2, none, note });
const rows = []; const detail = {};
// ---- マップ
const testFile = process.argv[2]; const test = testFile && existsSync(testFile) ? JSON.parse(readFileSync(testFile, 'utf8')) : null;
const failed = new Set(test ? test.out.filter((x) => !x.ok).map((x) => x.id) : []);
const maps = Object.keys(w.MAP_DEFS); const mk = {}; let mDone = 0, mProv = 0, mFail = 0;
for (const id of maps) { const m = w.World.getMap(id); mk[m.kind] = (mk[m.kind] || 0) + 1; if (failed.has(id)) mFail++; else if (MAPS_DONE.includes(id)) mDone++; else mProv++; }
rows.push(row('マップ', maps.length, mDone, mProv, 0, mFail, `種類：${Object.entries(mk).map(([k, n]) => k + ' ' + n).join('・')}。3D完成＝ポヨ村と屋内6（専用の場面）。仮3D＝WorldBuilder3D がタイルから自動生成${test ? `。全マップ組み立てテスト：${test.sum.ok}/${test.sum.total} 成功` : '（全マップ組み立てテストの結果なし）'}`));
detail.maps = { total: maps.length, byKind: mk, done: MAPS_DONE, failed: [...failed] };
// ---- 主人公・仲間
const COMP = w.COMPANIONS || {}; const party = [{ id: 'hero', sprite: 'hero' }].concat(Object.keys(COMP).map((id) => ({ id, sprite: COMP[id].sprite })));
let pDone = 0, pProv = 0; const pList = [];
for (const c of party) { const model = c.id === 'hero' ? 'hero' : characterModelFor(c.sprite); const st = c.id === 'hero' ? 'done' : (MODELS[c.id] ? (MODELS[c.id].status === 'done' ? 'done' : 'provisional') : 'substitute'); if (st === 'done') pDone++; else pProv++; pList.push(c.id + '→' + model + '（' + (st === 'done' ? '専用' : st === 'provisional' ? '自動生成' : '代用：2D版と同じ ' + c.sprite + ' の見た目') + '）'); }
rows.push(row('主人公・仲間', party.length, pDone, pProv, 0, 0, '主人公の職業別の見た目（20職）は1つのモデルを共用。' + pList.join('、')));
// ---- NPC（話す人。配置の定義の数）
let nTotal = 0; const nBy = { done: 0, provisional: 0, fallback: 0 }; const spriteCount = {};
for (const id of maps) { const m = w.World.getMap(id); for (const n of m.npcs) { nTotal++; spriteCount[n.sprite] = (spriteCount[n.sprite] || 0) + 1; nBy[characterStatus(n.sprite)]++; } }
rows.push(row('NPC', nTotal, nBy.done, nBy.provisional + nBy.fallback, 0, 0, `見た目の種類 ${Object.keys(spriteCount).length}。手作業のモデル ${nBy.done}人／自動生成のモデル ${nBy.provisional}人／別のモデルで代用 ${nBy.fallback}人（村人の男性で代用）`));
detail.npcSprites = Object.fromEntries(Object.entries(spriteCount).map(([s, n]) => [s, { n, status: characterStatus(s), model: characterModelFor(s) }]));
// ---- 敵
const E = w.ENEMIES; const ids = Object.keys(E); const normal = ids.filter((k) => !E[k].boss), boss = ids.filter((k) => E[k].boss);
rows.push(row('通常モンスター', normal.length, 0, normal.length, 0, 0, '戦闘：2D版の絵（新しい画像・従来の絵）をそのまま使い、絵から厚みのある立体（2.5D）を自動で作る（ArtVolume）。元のデザインを保つ方式。専用の3Dモデルはない'));
rows.push(row('ボス', boss.length, 0, boss.length, 0, 0, '戦闘：ボス画像（BossArt）から同じく2.5D。探索中のボスのシンボルも同じ絵から2.5D（作れないときは従来の立て札）'));
// ---- 乗り物
const V = w.VEHICLES || {}; const vids = Object.keys(V);
rows.push(row('乗り物', vids.length + 1, 0, vids.length + 1, 0, 0, `帆船・大型船・飛空艇＝Blender の仮モデル（build_world.py）。アストラ号＝止めてある姿は飛空艇の仮モデルの色違い、空を飛ぶ場面は2D版の画面（${vids.join('・')}・astra）`));
// ---- 重要イベント（マップの出来事のうち、ボス戦・物語の出来事・試練・乗船・潜水）
const evT = {}; let evN = 0; for (const id of maps) { const m = w.World.getMap(id); for (const e of m.events) { if (['boss', 'script', 'trial', 'board', 'dive'].includes(e.type)) { evN++; evT[e.type] = (evT[e.type] || 0) + 1; } } }
rows.push(row('重要イベント', evN, 0, 0, evN, 0, `内訳：${Object.entries(evT).map(([k, n]) => k + ' ' + n).join('・')}。出来事の場所は3Dのマップの上にあるが、会話・演出は2D版の画面（専用の3D演出はない）`));

const out = { generated: new Date().toISOString(), rows, detail };
const dst = resolve(GAME, 'docs/3d'); writeFileSync(resolve(dst, 'status.json'), JSON.stringify(out, null, 1));
const md = ['# 3D化の集計表（tools/status/inventory.mjs が実データから自動生成）', '', '生成日時：' + out.generated, '', '区分：3D完成＝専用に作り込んだ3D／仮3D＝自動生成・共通の型・代用・元の絵からの立体化（完成扱いにしない）／2D代替＝2D版の画面・絵のまま／未対応＝表示できない', '',
  '| 区分 | 総数 | 3D完成 | 仮3D | 2D代替 | 未対応 | 補足 |', '|---|---|---|---|---|---|---|', ...rows.map((r) => `| ${r.name} | ${r.total} | ${r.done} | ${r.prov} | ${r.d2} | ${r.none} | ${r.note} |`)];
writeFileSync(resolve(dst, 'status.md'), md.join('\n') + '\n');
console.log(md.slice(6).join('\n'));
