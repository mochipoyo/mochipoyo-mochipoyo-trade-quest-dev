// 3Dアセットの自動検証（Blender → GLB → Three.js の登録まで）
//   node tools/validate_assets.mjs            … 検証して tools/asset_report.md / asset_report.json を書く。登録表（assets/registry.json）に実際の三角形数を記録
//   node tools/validate_assets.mjs --strict   … 問題があれば終了コード 1
// 確認すること
//   ・GLB の形式（glTF 2.0 / JSON・BIN チャンク）と、バッファの長さ
//   ・キャラクター・モンスター：スキン（骨）があり、必要なアニメーション（manifest の animationNames）がそろっている
//   ・モンスターの型：色を差し替えるマテリアル tint_body がある
//   ・三角形数が種類ごとの目安以内（スマホでも動かすための予算）
//   ・manifest.js の全モデルの GLB があり、GLB は manifest・登録表・.blend（ソース）に載っている
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { MODELS } = await import(resolve(ROOT, 'src/assets/manifest.js'));
const REG = resolve(ROOT, 'assets/registry.json');
const reg = existsSync(REG) ? JSON.parse(readFileSync(REG, 'utf8')) : { version: 1, assets: {} };
const BUDGET = { character: 20000, creature: 14000, prop: 6000, furniture: 6000, icon: 3000, tree: 4000, tree_lod: 1500, landmark: 6000, vehicle: 10000 };

function readGlb(path) {
  const b = readFileSync(path); if (b.readUInt32LE(0) !== 0x46546c67) throw new Error('GLB の印（glTF）がない');
  const ver = b.readUInt32LE(4); if (ver !== 2) throw new Error('glTF のバージョンが 2 ではない: ' + ver);
  const len = b.readUInt32LE(8); if (len !== b.length) throw new Error('長さが合わない ' + len + ' / ' + b.length);
  let off = 12, json = null, bin = null;
  while (off < b.length) { const cl = b.readUInt32LE(off), ct = b.readUInt32LE(off + 4); const data = b.subarray(off + 8, off + 8 + cl); if (ct === 0x4e4f534a) json = JSON.parse(data.toString('utf8')); else if (ct === 0x004e4942) bin = data; off += 8 + cl; }
  if (!json) throw new Error('JSON チャンクがない');
  return { json, bin, bytes: b.length };
}
function stats(g) {
  const J = g.json; let tris = 0;
  for (const m of J.meshes || []) for (const p of m.primitives) { const mode = p.mode === undefined ? 4 : p.mode; if (mode !== 4) continue; const acc = p.indices !== undefined ? J.accessors[p.indices] : J.accessors[p.attributes.POSITION]; tris += Math.floor(acc.count / 3); }
  const bufLen = (J.buffers || []).reduce((s, x) => s + x.byteLength, 0);
  return { tris, meshes: (J.meshes || []).length, materials: (J.materials || []).map((m) => m.name), anims: (J.animations || []).map((a) => a.name), skins: (J.skins || []).length, joints: J.skins && J.skins[0] ? J.skins[0].joints.length : 0, bufLen, binLen: g.bin ? g.bin.length : 0 };
}

const out = []; const problems = []; const warnings = [];
const pub = resolve(ROOT, 'public/models'); const glbs = readdirSync(pub).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4));
const byFile = {}; for (const id of Object.keys(MODELS)) { const f = MODELS[id].modelPath.replace(/^models\//, '').replace(/\.glb$/, ''); byFile[f] = id; }
for (const id of Object.keys(MODELS)) {
  const def = MODELS[id]; const file = def.modelPath.replace(/^models\//, '').replace(/\.glb$/, ''); const path = resolve(pub, file + '.glb');
  const row = { id, file, kind: def.kind, status: def.status, lazy: !!def.lazy, ok: true, notes: [] };
  const bad = (msg) => { row.ok = false; row.notes.push(msg); problems.push(id + ': ' + msg); };
  if (!existsSync(path)) { bad('GLB がない ' + def.modelPath); out.push(row); continue; }
  let g; try { g = readGlb(path); } catch (e) { bad('GLB を読めない: ' + e.message); out.push(row); continue; }
  const s = stats(g); Object.assign(row, { tris: s.tris, bytes: g.bytes, anims: s.anims, skins: s.skins, joints: s.joints, materials: s.materials.length });
  if (s.binLen < s.bufLen) bad('BIN チャンクが短い');
  if (def.kind === 'character' || def.kind === 'creature') {
    if (!s.skins) bad('スキン（骨）がない');
    const miss = (def.animationNames || []).filter((a) => !s.anims.includes(a)); if (miss.length) bad('アニメーションが足りない: ' + miss.join(','));
  }
  if (def.kind === 'creature' && !s.materials.includes('tint_body')) bad('色を差し替えるマテリアル tint_body がない');
  const budgetKey = /_lod1$/.test(file) ? 'tree_lod' : (file.startsWith('tree_') || file === 'bush_a' || file.startsWith('rock_') || file === 'prop_cactus') ? 'tree' : file.startsWith('icon_') ? 'icon' : file.startsWith('furn_') ? 'furniture' : def.kind;
  const lim = BUDGET[budgetKey] || 8000; row.budget = lim; if (s.tris > lim) { row.notes.push('注意：三角形数が目安を超える ' + s.tris + ' > ' + lim); warnings.push(id + ': 三角形数 ' + s.tris + ' > ' + lim); }
  const r = reg.assets[file];
  if (!r) row.notes.push('登録表にない');
  else { r.tris = s.tris; r.validated = new Date().toISOString().slice(0, 10); if (!r.blend || !existsSync(resolve(ROOT, r.blend))) row.notes.push('.blend（ソース）がない'); row.regStatus = r.status; }
  if (r && r.status && def.status && (r.status === 'done') !== (def.status === 'done')) row.notes.push('状態が manifest と登録表で違う（manifest ' + def.status + ' / 登録表 ' + r.status + '）');
  out.push(row);
}
const orphan = glbs.filter((f) => !byFile[f]); orphan.forEach((f) => problems.push(f + ': manifest に載っていない GLB'));
writeFileSync(REG, JSON.stringify(Object.assign(reg, { assets: Object.fromEntries(Object.entries(reg.assets).sort()) }), null, 1));
const sum = { models: out.length, ok: out.filter((r) => r.ok).length, done: out.filter((r) => r.status === 'done').length, provisional: out.filter((r) => r.status === 'provisional').length, orphanGlb: orphan, problems, warnings };
writeFileSync(resolve(ROOT, 'tools/asset_report.json'), JSON.stringify({ date: new Date().toISOString(), summary: sum, rows: out }, null, 1));
const md = ['# 3Dアセット検証レポート（tools/validate_assets.mjs が自動生成）', '', '生成日時：' + new Date().toISOString(), '',
  `- モデル ${sum.models}件（検証OK ${sum.ok}・NG ${sum.models - sum.ok}）／ 状態：done（作り込み済み）${sum.done}・provisional（仮3D）${sum.provisional}`,
  `- manifest に載っていない GLB：${orphan.length ? orphan.join(', ') : 'なし'}`, `- 注意（目安超え）：${warnings.length ? warnings.join('／') : 'なし'}`, '', '| id | 種類 | 状態 | 三角形 | 目安 | 骨 | アニメ | 読込 | 結果 | 補足 |', '|---|---|---|---|---|---|---|---|---|---|',
  ...out.map((r) => `| ${r.id} | ${r.kind} | ${r.status} | ${r.tris ?? '-'} | ${r.budget ?? '-'} | ${r.joints || '-'} | ${(r.anims || []).length} | ${r.lazy ? '必要時' : '起動時'} | ${r.ok ? 'OK' : 'NG'} | ${r.notes.join('／')} |`)];
writeFileSync(resolve(ROOT, 'tools/asset_report.md'), md.join('\n') + '\n');
console.log(JSON.stringify(sum, null, 1));
if (process.argv.includes('--strict') && (problems.length)) process.exit(1);
