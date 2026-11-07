// v8.2 対象一覧：実行時の MAP_DEFS から、町・城（王宮・砦）・町から入れる屋内（上階・地下・関連部屋）を列挙する
//   所属：町の buildings[].interior から入り、屋内 → 屋内のワープ（階段・扉）でたどる。フィールド・ほかの町・ダンジョンへ出るワープで止める
//   使い方：node inventory82.js out.json [2d]
const load = require('../v78/load78.js');
const two = process.argv[3] === '2d'; const A = load(two ? { earth: false, join: false } : {}); const w = A.w; w.State.newGame('t', 'warrior'); w.World.start();
const D = w.MAP_DEFS; const ids = Object.keys(D).sort();
const isField = (d) => !!(d && (d.region || d.kind === 'field'));
const kinds = {}; ids.forEach((k) => { const kd = (D[k] && D[k].kind) || '?'; kinds[kd] = (kinds[kd] || 0) + 1; });
const warpsOf = (id) => { try { const m = w.World.getMap(id); return (m.warps || []).map((q) => ({ x: q.x, y: q.y, to: q.to, raw: !!q.raw, need: q.needFlag || null })); } catch (e) { return (D[id].warps || []).map((q) => ({ x: q.x, y: q.y, to: q.to })); } };
const owner = {}; const towns = ids.filter((k) => D[k] && D[k].kind === 'town');
const out = { generated: new Date().toISOString(), mode: two ? '2d' : 'earth', kinds, towns: [], castles: [], interiors: [], conflicts: [], dungeonsFromTowns: [] };
for (const t of towns) {
  const d = D[t]; const seeds = (d.buildings || []).filter((b) => b.interior && D[b.interior]).map((b) => ({ id: b.interior, via: 'building:' + b.id, btype: b.type || null, bname: b.name || null }));
  warpsOf(t).forEach((q) => { const td = D[q.to]; if (!td || isField(td) || td.kind === 'town' || q.to === t) return; if (td.kind === 'interior' || td.kind === 'castle') seeds.push({ id: q.to, via: 'warp' }); else out.dungeonsFromTowns.push({ town: t, to: q.to, kind: td.kind }); });
  const seen = new Map(); const q = seeds.map((s) => Object.assign({ depth: 0 }, s));
  while (q.length) { const s = q.shift(); if (seen.has(s.id)) continue; const sd = D[s.id]; if (!sd) continue; seen.set(s.id, s);
    warpsOf(s.id).forEach((wq) => { const td = D[wq.to]; if (!td || isField(td) || td.kind === 'town' || wq.to === t) return; if (td.kind === 'dungeon') { out.dungeonsFromTowns.push({ town: t, from: s.id, to: wq.to }); return; } if (!seen.has(wq.to)) q.push({ id: wq.to, via: 'from:' + s.id, depth: s.depth + 1 }); });
    (sd.buildings || []).forEach((b) => { if (b.interior && D[b.interior] && !seen.has(b.interior)) q.push({ id: b.interior, via: 'building-in:' + s.id + ':' + b.id, depth: s.depth + 1 }); }); }
  const list = [...seen.values()];
  list.forEach((s) => { if (owner[s.id] && owner[s.id] !== t) out.conflicts.push({ id: s.id, a: owner[s.id], b: t }); else owner[s.id] = t; });
  out.towns.push({ id: t, name: d.name, w: (typeof d.rows === 'function' ? null : d.rows[0].length), h: (typeof d.rows === 'function' ? null : d.rows.length), region: (d.theme3d && d.theme3d.region) || null, remake81: !!d.remake81, buildings: (d.buildings || []).length, interiors: list.length });
  list.forEach((s) => { const sd = D[s.id]; out.interiors.push({ id: s.id, name: sd.name, kind: sd.kind, parentTown: t, via: s.via, depth: s.depth, btype: s.btype || null, w: typeof sd.rows === 'function' ? null : sd.rows[0].length, h: typeof sd.rows === 'function' ? null : sd.rows.length }); });
}
// 城・王宮・砦：名前・建物の種類から候補（時計塔など castle 型の建物は除く）。人が最後に分類する
ids.forEach((k) => { const d = D[k]; if (!d) return; const n = d.name || ''; if (/(城|王宮|宮殿|砦)/.test(n) && !/(城下|城門前|時計塔)/.test(n)) out.castles.push({ id: k, name: n, kind: d.kind, owner: owner[k] || null }); });
require('fs').writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log('maps', ids.length, JSON.stringify(kinds)); console.log('towns', towns.length, 'interiors', out.interiors.length, 'conflicts', out.conflicts.length, 'castles?', out.castles.length);
