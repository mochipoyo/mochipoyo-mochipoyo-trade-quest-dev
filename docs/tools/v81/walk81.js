// v8.1 町の歩く確かめの共通部品（docs/tools/v81/town81_test.js などから require）
module.exports = function (w, d) {
  const W = w.World;
  const tick = () => { for (let i = 0; i < 600 && (W.player.moving || W.busy); i++) W.scene.update(50); };
  const flush = async () => { let q = 0; for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 40)); tick(); if (!W.busy && !W.player.moving) { if (++q >= 9) return; } else q = 0; } };
  const step = async (k) => { W.busy = false; const mv = W.tryMove(k); tick(); await flush(); return mv; };
  const D4 = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const passAt = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !m.npcAt(x, y) && !(m.eventAt(x, y) && m.eventAt(x, y).solid);
  function route(m, sx, sy, gx, gy) { const prev = {}; const q = [[sx, sy]]; prev[sx + ',' + sy] = null; while (q.length) { const [x, y] = q.shift(); if (x === gx && y === gy) break; for (const k of Object.keys(D4)) { const nx = x + D4[k][0], ny = y + D4[k][1]; const key = nx + ',' + ny; if (key in prev) continue; if (!(nx === gx && ny === gy) && (!passAt(m, nx, ny) || m.warpAt(nx, ny))) continue; prev[key] = [x, y, k]; q.push([nx, ny]); } } if (!((gx + ',' + gy) in prev)) return null; const dirs = []; let c = gx + ',' + gy; while (prev[c]) { dirs.unshift(prev[c][2]); c = prev[c][0] + ',' + prev[c][1]; } return dirs; }
  async function walkTo(gx, gy) { const id0 = W.map.id; for (let n = 0; n < 200; n++) { if (W.map.id !== id0) return true; if (W.player.x === gx && W.player.y === gy) return false; const r = route(W.map, W.player.x, W.player.y, gx, gy); if (!r) { await flush(); continue; } await step(r[0]); } return false; }
  return { tick, flush, step, D4, passAt, route, walkTo };
};
