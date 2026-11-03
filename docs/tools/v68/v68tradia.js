// v6.8（2026-11-03）相場都市トレディアの移動（カリオン徴収連邦 → マクディア地方）で変わった所だけを除いて、以前の版と比べるための道具
// ・ワープ：world_kalion・world_magicka のトレディアへのワープ（入口）は比べない（新しい入口は tradiatest.js・tweak68test.js で確かめる）
// ・地形（world_kalion・world_magicka だけ）：違ってよいのは
//     草・道の入れ替わり（道を足した・入口をなくしたことで、道の曲げ方（第5段階の道の丸め・ずらし）が少し変わる。どちらも歩ける）
//     入口のマス（トレディアの城の記号）と、新しい入口 (60,80) のまわり2マスの木・森が草になった所
module.exports = {
  stripWarps(id, warps) { return (warps || []).filter((x) => !(x.to === 'tradia' && (id === 'world_kalion' || id === 'world_magicka'))); },
  allowedCell(id, x, y, a, b) {
    if (id !== 'world_kalion' && id !== 'world_magicka') return false;
    const G = { grass: 1, grass2: 1, road: 1 };
    if (G[a] && G[b]) return true;
    const L = id === 'world_magicka' ? [60, 80] : [36, 88]; const near = Math.abs(x - L[0]) <= 2 && Math.abs(y - L[1]) <= 2;
    if ((a === 'castle_icon' || b === 'castle_icon') && x === L[0] && y === L[1]) return true;
    return id === 'world_magicka' && near && (a === 'forest' || a === 'tree') && G[b];
  },
  tilesOk(id, a, b) { if (a.length !== b.length) return false; for (let y = 0; y < a.length; y++) { if (a[y].length !== b[y].length) return false; for (let x = 0; x < a[y].length; x++) if (a[y][x] !== b[y][x] && !module.exports.allowedCell(id, x, y, a[y][x], b[y][x])) return false; } return true; }
};
