/* =========================================================
   レシピ：ポヨ村の屋内（InteriorBuilder3D の作り込んだ屋内 18部屋）に、用途ごとの奥の壁の飾りと光を足す
   ・始まりの農村（arcadia）の色：生成りのしっくい・オークの木・暖かい光
   ・用途：家＝額の絵と皿の棚／村長の家＝地図と巻物の棚／道具屋＝薬瓶の棚と看板／宿屋＝額と壁のランプ／教会＝縦長の色ガラスと光／
     修行場＝チャートの掛け軸／水車小屋・納屋＝道具掛け（鎌・縄）／見張り台＝細い窓／集会所＝村の旗
   ・奥の壁（北・z=1）の面に、頭より高い所（1.6〜2.8）だけに置く。前のマスに背の高い家具（棚・食器棚・かまど・ベッド）があるときは置かない
   ・論理（タイル）は変えない。InteriorBuilder3D の壁・家具・光はそのまま
   ========================================================= */
import * as THREE from 'three';
import { plain } from '../EnvKit3D.js';
import { Batch } from '../../engine/Materials.js';
import { wbox, cyl } from './geo.js';

const KIND = { poyo_church: 'church', poyo_dojo: 'dojo', poyo_item_shop: 'shop', poyo_inn: 'inn', poyo_elder_house: 'elder', poyo_house: 'house', poyo_mill: 'mill', poyo_watch: 'watch', poyo_watch_2f: 'watch', poyo_watch_3f: 'watch',
  poyo_barn: 'barn', poyo_barn_2f: 'barn', poyo_hall: 'hall', poyo_hall_2f: 'hall', poyo_elder_house_2f: 'elder', poyo_inn_2f: 'inn', poyo_church_2f: 'church', poyo_church_3f: 'watch' };
const TALL = { bookshelf: 1, cupboard: 1, stove: 1, counter: 1, bed: 1, sink: 1 };

export const recipe = {
  id: 'poyo_interior.v1',
  async prepare(ctx) { const kind = KIND[ctx.map.id] || 'house'; ctx.stats.use = kind; return { build: (b) => build(ctx, kind, b) }; }
};

async function build(ctx, kind, b) {
  const map = ctx.map, W = map.w; const g = new THREE.Group(); g.name = 'env_poyo_interior'; b.root.add(g); const bt = new Batch(); const add = (m, gg) => bt.add(m, gg);
  const M = {
    frame: plain('#6a4a30', { std: { roughness: 0.8 } }), oak: plain('#8a6446', { std: { roughness: 0.85 } }), canvas: [plain('#8aa4c8', { std: { roughness: 0.9 } }), plain('#d8b070', { std: { roughness: 0.9 } }), plain('#7aa86a', { std: { roughness: 0.9 } })],
    plate: plain('#f4f0e6', { std: { roughness: 0.4 } }), bottle: [plain('#d0505a', { std: { roughness: 0.25 } }), plain('#4a8ad8', { std: { roughness: 0.25 } }), plain('#5ac06a', { std: { roughness: 0.25 } })],
    glass: [plain('#e05a5a', { emissive: '#e05a5a', ei: 0.6, window: true }), plain('#5a8ae0', { emissive: '#5a8ae0', ei: 0.6, window: true }), plain('#e8c84a', { emissive: '#e8c84a', ei: 0.6, window: true })],
    iron: plain('#3a3e44', { std: { roughness: 0.5 } }), glow: plain('#ffe0a8', { emissive: '#ffc070', ei: 1.4, keepGlow: true }), cloth: plain('#3a6a3a', { std: { roughness: 0.95, side: THREE.DoubleSide } }),
    chart: plain('#1f3f6a', { std: { roughness: 0.9, side: THREE.DoubleSide } }), rope: plain('#c0a070', { std: { roughness: 1 } }), sky: plain('#cfe6ff', { emissive: '#a8d0ff', ei: 0.5, window: true })
  };
  const zf = 1.02; let n = 0;
  for (let x = 2; x < W - 2; x++) {
    if (x % 3 !== 1) continue; if (TALL[map.tile(x, 1)]) continue; const cx = x + 0.5, k = x % 3 + (x >> 2) % 3;
    switch (kind) {
      case 'house': add(M.frame, wbox(0.62, 0.48, 0.05, cx, 2.1, zf)); add(M.canvas[k % 3], wbox(0.52, 0.38, 0.03, cx, 2.1, zf + 0.03)); add(M.oak, wbox(0.9, 0.05, 0.22, cx + 0.9, 1.75, zf + 0.1)); for (let i = 0; i < 3; i++) add(M.plate, new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12).rotateX(Math.PI / 2).translate(cx + 0.62 + i * 0.28, 1.88, zf + 0.06)); break;
      case 'elder': add(M.frame, wbox(1.0, 0.7, 0.04, cx, 2.15, zf)); add(M.canvas[1], wbox(0.92, 0.62, 0.03, cx, 2.15, zf + 0.025)); add(M.oak, wbox(0.8, 0.05, 0.22, cx + 1.0, 1.8, zf + 0.1)); for (let i = 0; i < 3; i++) add(M.canvas[(i + 1) % 3], cyl(0.05, 0.05, 0.3, 8, cx + 0.8 + i * 0.16, 1.9, zf + 0.1)); break;
      case 'shop': add(M.oak, wbox(1.0, 0.05, 0.24, cx, 1.75, zf + 0.12)); add(M.oak, wbox(1.0, 0.05, 0.24, cx, 2.25, zf + 0.12)); for (let i = 0; i < 5; i++) { add(M.bottle[(i + k) % 3], cyl(0.05, 0.05, 0.2, 8, cx - 0.4 + i * 0.2, 1.88, zf + 0.12)); add(M.bottle[(i + k + 1) % 3], cyl(0.045, 0.045, 0.17, 8, cx - 0.4 + i * 0.2, 2.36, zf + 0.12)); } break;
      case 'inn': add(M.frame, wbox(0.62, 0.48, 0.05, cx, 2.1, zf)); add(M.canvas[(k + 2) % 3], wbox(0.52, 0.38, 0.03, cx, 2.1, zf + 0.03)); add(M.iron, wbox(0.08, 0.24, 0.1, cx + 0.75, 1.8, zf + 0.05)); add(M.glow, wbox(0.1, 0.14, 0.1, cx + 0.75, 1.98, zf + 0.12)); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx + 0.75, 2.0, 1.6), color: 0xffc070, power: 0.6, dist: 5 }); break;
      case 'church': add(M.glass[k % 3], wbox(0.42, 1.2, 0.03, cx, 2.15, zf)); add(M.frame, wbox(0.5, 0.06, 0.05, cx, 2.78, zf + 0.01)); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, 2.1, 1.8), color: 0xd8c8ff, power: 0.45, dist: 5 }); break;
      case 'dojo': { const cl = new THREE.PlaneGeometry(0.55, 1.3); cl.translate(cx, 2.05, zf + 0.01); add(M.chart, cl); add(M.oak, wbox(0.7, 0.05, 0.05, cx, 2.72, zf + 0.03)); add(M.glow, wbox(0.36, 0.03, 0.02, cx, 1.9 + (k % 3) * 0.12, zf + 0.02)); break; }
      case 'mill': case 'barn': add(M.oak, wbox(1.1, 0.08, 0.08, cx, 2.2, zf + 0.04)); add(M.iron, wbox(0.05, 0.6, 0.04, cx - 0.3, 1.9, zf + 0.06)); add(M.rope, new THREE.TorusGeometry(0.16, 0.04, 6, 12).translate(cx + 0.25, 1.95, zf + 0.06)); break;
      case 'watch': add(M.sky, wbox(0.16, 0.8, 0.03, cx, 2.1, zf)); break;
      case 'hall': { const cl = new THREE.PlaneGeometry(0.62, 1.3); cl.translate(cx, 2.1, zf + 0.01); add(M.cloth, cl); add(M.frame, wbox(0.72, 0.05, 0.05, cx, 2.78, zf + 0.03)); break; }
      default: break;
    }
    n++;
  }
  bt.build(g); ctx.stats.decor = n; return g;
}
