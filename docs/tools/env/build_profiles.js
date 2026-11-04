// 環境リデザイン A：いまのゲームの全 MAP_DEFS（後段の拡張を読み込んだあと）と、パックの map_profiles（330件・62900a3 時点）を照合し、
//   ・差分（増えたID・消えたID）を docs/environment/ID_DIFF.md に書く
//   ・ゲームが読む軽いプロファイル three-src/public/environment-v1/data/profiles.json を作る（パックの項目のうち描画に使うものだけ）
//     パックにないID（v7.2/v7.3 の拡張で増えた屋内など）は、親のマップ（入口のワープ元）・地域・建物の種類から作る（derived。設計の提案で、未実装）
// 使い方：RPG_DIR=<リポジトリ>/ node build_profiles.js <パックの data フォルダ> <リポジトリ>
const path = require('path'); const fs = require('fs');
const PACK = process.argv[2]; const REPO = (process.argv[3] || process.env.RPG_DIR).replace(/\/?$/, '/');
process.env.RPG_DIR = REPO;
const load = require('/home/claude/work/rpgload.js'); const { w } = load();
const D = w.MAP_DEFS; const BG = w.BattleBG65;
const prof = JSON.parse(fs.readFileSync(path.join(PACK, 'map_profiles.json'), 'utf8'));
const ids = Object.keys(D).sort(); const packIds = Object.keys(prof);
const added = ids.filter((id) => !prof[id]); const removed = packIds.filter((id) => !D[id]);
const kindOf = (id) => D[id].kind || 'town';
// 親：このマップへ入るワープを持つマップ（建物の扉など）。屋内の用途は、親の建物の type から
const parent = {}; const btype = {};
ids.forEach((pid) => { const d = D[pid]; (d.buildings || []).forEach((b) => { if (b.interior && D[b.interior]) { parent[b.interior] = parent[b.interior] || pid; btype[b.interior] = btype[b.interior] || b.type; } });
  (d.warps || []).forEach((q) => { if (q && q.to && D[q.to] && !parent[q.to] && q.to !== pid) parent[q.to] = pid; }); });
const USE = { house: 'house', elder: 'house', inn: 'inn', item: 'shop', weapon: 'shop', armor: 'shop', tavern: 'tavern', church: 'church', guild: 'house', bank: 'house', dojo: 'house', castle: 'castle', watchtower: 'tower', warehouse: 'house', academy: 'archive', lab: 'lab', casino: 'tavern', exchange: 'house', mansion: 'house', arena: 'castle', elevator: 'tower' };
const pick = (p) => p && { region: p.region, archetype: p.archetype, floorMaterial: p.floorMaterial, wallMaterial: p.wallMaterial, baseColor: p.baseColor, accentColor: p.accentColor, lighting: p.lighting, geometry: p.geometry, setDressing: p.setDressing };
const out = {}; const rows = [];
ids.forEach((id) => {
  const d = D[id]; const p = prof[id]; let r;
  if (p) r = { kind: p.kind, region: p.region, archetype: p.archetype, identity: p.identity, landmark: p.landmark, floorMaterial: p.floorMaterial, wallMaterial: p.wallMaterial, baseColor: p.baseColor, accentColor: p.accentColor, geometry: p.geometry, lighting: p.lighting, setDressing: p.setDressing, priority: p.priority, source: 'pack' };
  else {
    // 親をさかのぼってパックにあるプロファイルを探す
    let q = parent[id], hop = 0; while (q && !prof[q] && hop < 6) { q = parent[q]; hop++; }
    const base = pick(q && prof[q]) || {}; const kind = kindOf(id);
    let region = base.region; try { region = region || BG.regionOf(id) || 'arcadia'; } catch (e) { region = region || 'arcadia'; }
    // 屋内の用途：建物の type → 親が屋内なら親と同じ用途（家の2階は家）→ 名前が塔なら塔 → 家
    const parUse = parent[id] && D[parent[id]] && kindOf(parent[id]) === 'interior' ? (prof[parent[id]] ? prof[parent[id]].archetype : (out[parent[id]] && out[parent[id]].archetype)) : null;
    const use = kind === 'interior' ? (USE[btype[id]] || parUse || (/_tower/.test(id) ? 'tower' : 'house')) : base.archetype || 'village';
    r = Object.assign({}, base, { kind, region, archetype: use, identity: (d.name || id) + '（' + (q ? (D[q].name || q) + 'の' : '') + (kind === 'interior' ? '屋内' : kind) + '。v7.2 以降に増えたマップ。親のプロファイルから作った設計の目安）', landmark: null, priority: 3, source: 'derived', parent: q || null });
  }
  r.name = d.name || id; r.size = (() => { try { const m = w.World.getMap ? null : null; return null; } catch (e) { return null; } })();
  delete r.size; out[id] = r; rows.push([id, r.name, r.kind, r.region, r.archetype, r.source]);
});
const outDir = path.join(REPO, 'three-src/public/environment-v1/data'); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'profiles.json'), JSON.stringify({ version: 1, generated: 'docs/tools/env/build_profiles.js', count: ids.length, profiles: out }));
const byKind = (list) => { const c = {}; list.forEach((id) => { const k = D[id] ? kindOf(id) : prof[id].kind; c[k] = (c[k] || 0) + 1; }); return Object.entries(c).map(([k, n]) => k + ' ' + n).join('・'); };
const md = ['# マップIDの差分（パックの330件 ↔ いまのゲーム）', '', '作成：`docs/tools/env/build_profiles.js`（いまのゲームの全 MAP_DEFS を、後段の拡張・追加を読み込んだあとで数えた）。', '',
  '- いまのゲーム：' + ids.length + '件（' + byKind(ids) + '）', '- パック（62900a3 時点）：' + packIds.length + '件', '- 両方にある：' + (ids.length - added.length) + '件',
  '- 増えたID（パックにない）：' + added.length + '件（' + byKind(added) + '）。親のマップ（入口）・地域・建物の種類からプロファイルを作った（source: derived。設計の目安で、未実装）',
  '- 消えたID（パックにあって、いまのゲームにない）：' + removed.length + '件' + (removed.length ? '：' + removed.join('、') : ''), '', '## 増えたID', '', '|mapId|名前|種類|地域|用途の系統|親|', '|---|---|---|---|---|---|'];
added.forEach((id) => { const r = out[id]; md.push('|' + id + '|' + r.name + '|' + r.kind + '|' + r.region + '|' + r.archetype + '|' + (r.parent || '') + '|'); });
fs.writeFileSync(path.join(REPO, 'docs/environment/ID_DIFF.md'), md.join('\n') + '\n');
console.log('maps', ids.length, 'pack', packIds.length, 'added', added.length, byKind(added), 'removed', removed.length, removed.slice(0, 10));
