// 通れないタイルの上にあるワープ（歩いて入れない出入口）を全マップで探す
const load = require('../rpgload.js'); const { w } = load(); const State = w.State;
State.newGame('t', 'warrior'); const d = State.data;
const out = [];
for (const [id, def] of Object.entries(w.MAP_DEFS)) {
  let m; try { m = new w.GameMap(def); } catch (e) { continue; }
  for (const wp of m.warps) {
    if (wp.x < 0 || wp.y < 0 || wp.x >= m.w || wp.y >= m.h) continue;
    const t = m.tiles[wp.y][wp.x]; if (!w.Tiles.isSolid(t)) continue;
    // 隣に通れるマスがあるか
    const nb = [[0,1],[1,0],[-1,0],[0,-1]].filter(([dx,dy]) => { const x = wp.x+dx, y = wp.y+dy; return x>=0&&y>=0&&x<m.w&&y<m.h&&!w.Tiles.isSolid(m.tiles[y][x]); }).length;
    out.push(id + ' (' + wp.x + ',' + wp.y + ') tile=' + t + ' → ' + wp.to + ' 隣の通れるマス=' + nb + (def.s3121 ? ' [s3121]' : ''));
  }
}
console.log(out.join('\n')); console.log('件数', out.length);
