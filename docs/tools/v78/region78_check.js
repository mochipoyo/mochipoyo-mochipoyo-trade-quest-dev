// v7.8 新しい5地域の地図の確認（jsdom・地球の世界）：node docs/tools/v78/region78_check.js
// ・行の長さがそろう・ワープの行き先の地図があり、着く所が地図の中で歩ける・地図の中の入口から、出口・人・宝箱・出来事のとなりまで歩いて行ける
const load = require('./load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(); const w = A.w, T = w.Tiles; w.State.newGame('t', 'warrior'); w.World.start();
ok(A.errors.length === 0, '読み込みエラーなし ' + A.errors.slice(0, 2).join(' / '));
const ids = (w.R78 && w.R78.maps || []).filter((v, i, a) => a.indexOf(v) === i);
ok(ids.length > 0, '新しい地域の地図 ' + ids.length + ' 枚');
for (const id of ids) { const def = w.MAP_DEFS[id]; if (!def) { ok(false, id + '：定義がない'); continue; }
  const rows = typeof def.rows === 'function' ? def.rows() : def.rows; const W0 = rows[0].length; ok(rows.every((r) => r.length === W0), id + '：行の長さ ' + W0 + '×' + rows.length);
  const m = w.World.getMap(id); const d = w.State.data;
  const evSolid = {}; (m.events || []).forEach((e) => { if (e.solid) evSolid[e.x + ',' + e.y] = 1; }); (m.npcs || []).forEach((n) => { evSolid[n.x + ',' + n.y] = 1; });
  const pass = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !evSolid[x + ',' + y];
  // 入口：ほかの地図からここへのワープの着く所（tx, ty）
  const starts = []; Object.keys(w.MAP_DEFS).forEach((mid) => { const dd = w.MAP_DEFS[mid]; (dd.warps || []).forEach((wp) => { if (wp.to === id) { const p = w.MapRemake ? w.MapRemake.pos(id, wp.tx, wp.ty) : { x: wp.tx, y: wp.ty }; starts.push([p.x, p.y, mid]); } }); (dd.buildings || []).forEach((b) => { if (b.interior === id && b.entry) starts.push([b.entry.x, b.entry.y, mid + '(建物)']); }); });
  (def.entries || []).forEach((e) => starts.push([e.x, e.y, (e.from || '') + '(台本)']));   // v8.0 ワープでなく台本で入る地図（異界のボスの間）の着く所
  const bad = starts.filter((s) => !(s[0] >= 0 && s[1] >= 0 && s[0] < m.w && s[1] < m.h && (pass(s[0], s[1]) || m.warpAt(s[0], s[1]))));
  ok(def.kind === 'field' || (starts.length > 0 && !bad.length), id + '：入って来る所 ' + starts.length + ' か所が歩けるマス ' + bad.map((b) => b.join(',')).join(' '));
  const onSolid = (m.npcs || []).filter((n) => { const t = m.tiles[n.y] && m.tiles[n.y][n.x]; return !t || w.Tiles.isSolid(t) || w.Tiles.isWater(t) || !!m.warpAt(n.x, n.y) || (m.chests || []).some((c) => c.x === n.x && c.y === n.y); });
  ok(!onSolid.length, id + '：人 ' + (m.npcs || []).length + ' 人が歩けるマスの上（出入口・宝箱の上ではない） ' + onSolid.map((n) => n.id + '@' + n.x + ',' + n.y).join(' '));
  if (def.kind === 'field') continue;
  const seen = new Uint8Array(m.w * m.h); const q = []; starts.forEach((s) => { if (s[0] >= 0 && s[1] >= 0 && s[0] < m.w && s[1] < m.h) { seen[s[1] * m.w + s[0]] = 1; q.push(s[0], s[1]); } });
  for (let h = 0; h < q.length; h += 2) { const x = q[h], y = q[h + 1]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen[ny * m.w + nx]) continue; if (!pass(nx, ny) && !m.warpAt(nx, ny)) continue; seen[ny * m.w + nx] = 1; if (!m.warpAt(nx, ny)) q.push(nx, ny); } }
  const reach = (x, y) => { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && seen[ny * m.w + nx]) return true; } return false; };
  const miss = []; (m.warps || []).forEach((wp) => { if (!reach(wp.x, wp.y)) miss.push('出口' + wp.x + ',' + wp.y); if (!w.MAP_DEFS[wp.to]) miss.push('行き先なし ' + wp.to); });
  (m.npcs || []).forEach((n) => { if (!reach(n.x, n.y)) miss.push('人 ' + n.id); }); (m.chests || []).forEach((c) => { if (!reach(c.x, c.y)) miss.push('宝箱 ' + c.id); }); (m.events || []).forEach((e) => { if (!reach(e.x, e.y)) miss.push('出来事 ' + e.x + ',' + e.y); });
  (def.buildings || []).forEach((b) => { const dx = b.x + b.doorX, dy = b.y + b.h - 1; if (!reach(dx, dy) && !reach(dx, dy + 1)) miss.push('建物 ' + b.id); if (!w.MAP_DEFS[b.interior]) miss.push('中の地図なし ' + b.interior); });
  ok(!miss.length, id + '：入口から出口・人・宝箱・出来事・建物まで歩いて行ける ' + miss.join(' '));
}
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
