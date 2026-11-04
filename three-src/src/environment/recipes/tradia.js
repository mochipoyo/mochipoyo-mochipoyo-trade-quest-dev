/* =========================================================
   レシピ：相場都市トレディア（tradia）— FLAGSHIP_SCENES 5
   目標：経済活動の中心が空間から伝わること。深緑の銅屋根と象牙色の石、真鍮は少し。発光を主材にしない（形で見分ける）
   ・証券市場（td_exchange）：取引所の固有の正面＝石段・10本の列柱（パックの column_classic）・破風（銅の縁）・高い窓。屋根の中央に価格の鐘の塔
     （パックの clock_monument を台に、上に鐘の枠と真鍮の鐘）
   ・証券市場の前：放射状の広場（同心円と放射の石・真鍮の筋・中心にパックの floor_medallion）。左右の「大きな板」（イベントのマス 19,8 と 29,8）に
     板表示の3Dの枠（深緑の板・金の数字。頭より高い所）
   ・銀行＝重い石（段ごとに出入りする石積み）・狭い窓（鉄格子）・青銅の両開きの扉／闘技場＝楕円の観客席の輪（上から砂の床と段が見える）と大きなアーチ（パックの arch_round）／
     研究所＝銅の観測ドーム・望遠鏡・渾天儀（パックの magic_ring）／酒場＝小さなアーチの入口・暖色の窓・吊り看板・樽
     ほかの店・家＝象牙色の石の壁と銅の屋根（BuildingBuilder3D の style）
   ・床：大通り＝大きな象牙色の板石（中央が擦り減って少し暗い）／裏の飲食路＝暖色の小さな石／住宅路＝小さな淡い石／広場・歩道＝象牙色の石／運河ぞい＝板石
   ・柵（外周・東の地区との境）＝象牙色の石の手すり（欄干）。南の門＝石のアーチ（パックの arch_round）。運河の縁に石の笠木
   ・街灯＝深緑の鉄の柱と真鍮の灯（暖かい白）。低彩度の紫の旗を取引所の列柱に
   ・論理（歩ける所・入口・ワープ・NPC・イベント・宝箱）は変えない。歩けるマスの上に柱を立てない（板表示・旗は頭より高い所）
   ========================================================= */
import * as THREE from 'three';
import { kit, mat, plain, worldUV, rng } from '../EnvKit3D.js';
import { Batch } from '../../engine/Materials.js';
import { canvasTex, shade, texMat, wbox, rbox, cyl, frameOf, floorQuads, namePlate, drawSetts, settsHeight } from './geo.js';

const IVORY = '#f2e9d8', COPPER = '#4f7d6a', COPPER_D = '#3d6656', BRASS = '#c9a24a', IRON = '#2f4a40', PLUM = '#7a6a8e';
const PLATE = { bg: '#2f4a40', panel: '#f4ecdc', fg: '#2f3a34' };

// ---------------- 画像（キャンバス）
function drawRadial(g, w, h) {   // 放射状の広場（同心円の石・放射の目地）
  const cx = w / 2, cy = h / 2, r = rng(55); g.fillStyle = '#b8ab94'; g.fillRect(0, 0, w, h);
  const rings = 9; for (let k = rings; k >= 1; k--) {
    const R0 = (k - 1) / rings * (w / 2), R1 = k / rings * (w / 2); const n = 8 + k * 6;
    for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2 + 0.004, a1 = (i + 1) / n * Math.PI * 2 - 0.004; g.beginPath(); g.arc(cx, cy, R1 - 1.5, a0, a1); g.arc(cx, cy, R0 + 1.5, a1, a0, true); g.closePath(); g.fillStyle = shade(k % 3 === 0 ? '#e2d6bf' : '#efe6d4', 0.94 + r() * 0.1); g.fill(); }
  }
}
function drawBoard(g, w, h) {   // 板表示：深緑の板に金の数字（光らせない）
  g.fillStyle = '#20382f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#e8d49a'; g.font = 'bold 26px serif'; g.fillText('相 場', 18, 40); g.font = '20px monospace';
  const rows = [['ポヨ麦', '1,284', '▲'], ['鉄鉱石', '  962', '▼'], ['塩', '  311', '▲'], ['絹', '2,075', '▲'], ['銀', '4,410', '▼']];
  rows.forEach(([n, p, d], i) => { const y = 74 + i * 30; g.fillStyle = '#e8d49a'; g.fillText(n, 18, y); g.fillText(p, 150, y); g.fillStyle = d === '▲' ? '#9cc98a' : '#d9907a'; g.fillText(d, 230, y); g.fillStyle = 'rgba(232,212,154,0.25)'; g.fillRect(18, y + 8, w - 36, 1); });
}

export const recipe = {
  id: 'tradia.v1',
  async prepare(ctx) {
    const map = ctx.map;
    const need = ['td_exchange', 'td_bank', 'td_arena', 'td_lab', 'td_tavern'];
    const ids = (map.buildings || []).map((b) => b.id); const miss = need.filter((id) => !ids.includes(id)); if (miss.length) throw new Error('建物がない：' + miss.join(','));
    const ex = map.buildings.find((b) => b.id === 'td_exchange'); if (ex.w !== 20 || ex.h !== 6 || map.w !== 72 || map.h !== 40) throw new Error('証券市場・地図の大きさが想定と違う');
    const boards = (map.def && map.def.events || []).filter((e) => e.type === 'script' && e.solid && e.y === ex.y + ex.h);   // 証券市場の前の「大きな板」（左右）
    if (boards.length !== 2) throw new Error('証券市場の前の板（イベント）が2つでない：' + boards.length);
    const K = {
      ivory: texMat('tr_ashlar', canvasTex('tr_ashlar', 256, 256, drawSetts('#f3ebdb', '#c9bca4', 128, 64, 0.07)), { roughness: 0.8 }, { height: settsHeight(128, 64, 11), depth: 3 }),
      ivoryD: texMat('tr_ashlarD', canvasTex('tr_ashlarD', 256, 256, drawSetts('#e2d5bc', '#b4a68c', 128, 64, 0.08)), { roughness: 0.85 }, { height: settsHeight(128, 64, 12), depth: 3 }),
      slab: await mat(ctx, 'stone_courtyard', { repeat: 3, color: '#fff4e2', bright: 1.28, roughness: 0.85 }),
      setts: texMat('tr_setts', canvasTex('tr_setts', 256, 256, drawSetts('#eee4d0', '#a99c86', 64, 32, 0.08)), { roughness: 0.85 }, { height: settsHeight(64, 32, 13), depth: 3 }),
      settsS: texMat('tr_settsS', canvasTex('tr_settsS', 256, 256, drawSetts('#e9e1d2', '#a8a090', 32, 32, 0.1)), { roughness: 0.85 }, { height: settsHeight(32, 32, 14), depth: 3 }),
      cobW: texMat('tr_cobW', canvasTex('tr_cobW', 256, 256, drawSetts('#c9a888', '#7e6a58', 32, 32, 0.18)), { roughness: 0.9 }, { height: settsHeight(32, 32, 15), depth: 4 }),
      radial: texMat('tr_radial', canvasTex('tr_radial', 1024, 1024, drawRadial), { roughness: 0.75 }),
      board: texMat('tr_board', canvasTex('tr_board', 256, 230, drawBoard), { roughness: 0.7 }),
      copper: plain(COPPER, { std: { roughness: 0.6 } }), copperD: plain(COPPER_D, { std: { roughness: 0.65 } }),
      brass: plain(BRASS, { std: { roughness: 0.35, metalness: 0.6 } }), iron: plain(IRON, { std: { roughness: 0.6 } }),
      plaster: plain(IVORY, { std: { roughness: 0.85 } }), dark: plain('#2a2420', { std: { roughness: 0.9 } }),
      glass: plain('#2c3036', { std: { roughness: 0.15 }, window: true, emissive: '#ffd9a0', ei: 0.22 }),
      warmWin: plain('#ffcf8a', { emissive: '#ffb860', ei: 1.1, window: true }),
      bronze: plain('#6e5232', { std: { roughness: 0.45, metalness: 0.5 } }),
      sand: plain('#d9c49a', { std: { roughness: 1 } }), wood: plain('#7a5236', { std: { roughness: 0.85 } }),
      plum: plain(PLUM, { std: { roughness: 0.9, side: THREE.DoubleSide } }), red: plain('#a8543a', { std: { roughness: 0.8 } }),
      bulb: plain('#fff0d0', { emissive: '#ffd9a0', ei: 1.6, keepGlow: true })
    };
    K.slabW = texMat('tr_slabs', canvasTex('tr_slabs', 512, 512, drawSetts('#efe7d6', '#b3a68e', 256, 128, 0.07)), { roughness: 0.8, vertexColors: true }, { height: settsHeight(256, 128, 16), depth: 3, aoRadius: 4 });
    const gateX = (() => { for (let x = 1; x < map.w - 1; x++) if (map.tile(x, map.h - 1) === 'road') return x + 2; return map.w / 2; })();
    const hooks = { skipProp: (t) => t === 'fence' || t === 'lamp', skipOutTree: (x, z) => z >= map.h - 1 && Math.abs(x - gateX) < 12 };   // 南の門の前（カメラの側）には町の外の木を置かない
    const building = async (b, o) => {
      const f = BUILD[b.id] || BUILD_TYPE[b.type]; if (f) { const out = { group: new THREE.Group(), lights: [], smokes: [], props: [] }; out.group.name = 'building_env_' + b.id; await f(ctx, K, b, o.batch, out); return out; }
      const st = STYLE[b.type]; if (!st) return null; return o.bb.build(b, o.rnd, { batch: o.batch, design: o.design, theme: o.theme, style: st });
    };
    return { hooks, building, decorKey: 'royal', build: (bb) => build(ctx, K, bb, { ex, boards }) };   // 飾りのテーマ：光る機械の箱（tech）ではなく、鉢植え・壺・ベンチ（royal）
  }
};

// ふつうの店・家：象牙色の石の壁と銅の屋根（BuildingBuilder3D の style）
const STYLE = {
  house: { roof: 'gable', plaster: '#efe6d4', frame: false, roofColor: COPPER },
  weapon: { roof: 'gable', plaster: '#f1e8d6', frame: false, roofColor: COPPER_D, porch: 3.2, chimney: false },
  armor: { roof: 'gable', plaster: '#ece2cc', frame: false, roofColor: COPPER, porch: 3.2, chimney: false },
  item: { roof: 'gableZ', plaster: '#f3ebdb', frame: false, roofColor: COPPER, porch: 3.0 },
  inn: { roof: 'hip', two: true, plaster: '#f4ecdc', frame: false, roofColor: COPPER, porch: 4.0 },
  guild: { roof: 'hip', pitch: 0.45, plaster: '#efe4cf', frame: false, roofColor: COPPER_D, h1: 3.4, chimney: false },
  levex: { roof: 'flat', two: true, plaster: '#e8dcc6', frame: false, h1: 2.8, chimney: false },
  mansion: { roof: 'hip', two: true, pitch: 0.55, plaster: '#f6eedf', frame: false, roofColor: COPPER },
  academy: { roof: 'flat', plaster: '#efe6d4', frame: false, h1: 2.4, chimney: false }
};
const BUILD = { td_exchange: exchange, td_bank: bank, td_arena: arena, td_lab: lab, td_tavern: tavern };
const BUILD_TYPE = { bank };

function steps(add, K, x, zf, w) { for (let i = 0; i < 3; i++) add(K.ivoryD, wbox(w - i * 0.2, 0.12, 0.6 - i * 0.18, x, 0.06 + i * 0.12, zf + 0.3 - i * 0.09)); }
// 証券市場：石段・列柱・破風・高い窓・銅の屋根・価格の鐘の塔
async function exchange(ctx, K, b, batch, out) {
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const cx = f.doorX, zf = f.zf;
  const hallZ1 = zf - 1.75, H = 5.0;   // 本体の前の壁（列柱の奥）
  // 基壇と石段（足元の前の列の中）
  add(K.ivoryD, wbox(f.W, 0.36, zf + 0.25 - f.zb, f.cx, 0.18, (f.zb + zf + 0.25) / 2));
  for (let i = 0; i < 3; i++) add(K.ivory, wbox(f.W - 0.6 + i * 0.3, 0.12, 0.3, f.cx, 0.06 + i * 0.12 - 0.0, zf + 0.42 - i * 0.12));
  // 本体（高い壁・付け柱・高い窓）
  add(K.ivory, wbox(f.W - 0.3, H, hallZ1 - f.zb, f.cx, 0.36 + H / 2, (f.zb + hallZ1) / 2));
  for (let x = f.xl + 1.0; x < f.xr - 0.5; x += 2.0) { if (Math.abs(x - cx) < 1.2) continue; add(K.dark, wbox(0.86, 2.7, 0.06, x, 2.05, hallZ1 + 0.02)); add(K.glass, wbox(0.74, 2.55, 0.06, x, 2.05, hallZ1 + 0.04)); const arch = new THREE.CircleGeometry(0.43, 16, 0, Math.PI); arch.translate(x, 3.4, hallZ1 + 0.035); add(K.dark, arch); add(K.ivoryD, wbox(1.0, 0.12, 0.2, x, 0.66, hallZ1 + 0.1)); }
  add(K.bronze, wbox(1.6, 2.9, 0.08, cx, 1.81, hallZ1 + 0.02)); add(K.brass, wbox(0.06, 2.7, 0.1, cx, 1.81, hallZ1 + 0.05)); const da = new THREE.CircleGeometry(0.8, 18, 0, Math.PI); da.translate(cx, 3.26, hallZ1 + 0.03); add(K.bronze, da);
  // 列柱（パックの column_classic）：入口の前を空けて左右対称に10本
  const colZ = zf - 0.55, colH = 4.25; const offs = [1.5, 3.5, 5.5, 7.5, 9.25]; const cols = [];
  for (const o of offs) for (const s of [-1, 1]) { const x = cx + s * o; if (x < f.xl + 0.35 || x > f.xr - 0.35) continue; cols.push({ x, y: 0.36, z: colZ, s: [0.6, colH / 2.72, 0.6] }); }
  out.group.add(await kit(ctx, 'column_classic', cols));
  // 梁（エンタブラチュア）・破風・銅の縁
  const eY = 0.36 + colH; const eD = zf + 0.15 - hallZ1, eZ = (zf + 0.15 + hallZ1) / 2; add(K.ivory, wbox(f.W - 0.1, 0.55, eD, f.cx, eY + 0.27, eZ)); add(K.ivoryD, wbox(f.W + 0.05, 0.14, eD + 0.15, f.cx, eY + 0.6, eZ));
  const pw = 11.5, ph = 1.7; const tri = new THREE.Shape(); tri.moveTo(-pw / 2, 0); tri.lineTo(pw / 2, 0); tri.lineTo(0, ph); tri.closePath();
  const tg = new THREE.ExtrudeGeometry(tri, { depth: 1.3, bevelEnabled: false }); tg.translate(cx, eY + 0.67, zf - 1.3); worldUV(tg, 2); add(K.ivory, tg);
  for (const s of [-1, 1]) { const len = Math.hypot(pw / 2, ph) + 0.3; add(K.copper, rbox(len, 0.16, 1.55, cx + s * pw / 4, eY + 0.67 + ph / 2 + 0.08, zf - 0.62, 0, 0).applyMatrix4(new THREE.Matrix4().makeTranslation(-(cx + s * pw / 4), -(eY + 0.67 + ph / 2 + 0.08), -(zf - 0.62))).applyMatrix4(new THREE.Matrix4().makeRotationZ(s * -Math.atan2(ph, pw / 2))).applyMatrix4(new THREE.Matrix4().makeTranslation(cx + s * pw / 4, eY + 0.67 + ph / 2 + 0.08, zf - 0.62))); }
  // 破風の中の真鍮の紋（硬貨）
  const coin = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24); coin.rotateX(Math.PI / 2); coin.translate(cx, eY + 1.25, zf + 0.02); add(K.brass, coin);
  // 銅の屋根（低い寄棟）
  const rL = f.W + 0.2, rD = hallZ1 - f.zb + 0.4, rH = 1.5, y0 = 0.36 + H, rz0 = f.zb - 0.2, rz1 = hallZ1 + 0.2, ridge = rL - rD;
  const P = [f.cx - rL / 2, y0, rz1, f.cx + rL / 2, y0, rz1, f.cx + ridge / 2, y0 + rH, (rz0 + rz1) / 2, f.cx - ridge / 2, y0 + rH, (rz0 + rz1) / 2, f.cx + rL / 2, y0, rz0, f.cx - rL / 2, y0, rz0];
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); hg.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 3, 4, 3, 2, 1, 4, 2, 5, 0, 3]); hg.computeVertexNormals(); hg.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2)); add(K.copper, hg.toNonIndexed());
  add(K.ivoryD, wbox(rL, 0.22, rD, f.cx, y0 - 0.02, (rz0 + rz1) / 2));
  // 列柱の間の低彩度の紫の旗（頭より高い所）
  for (const o of [2.5, 6.5]) for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(0.75, 1.7); g.translate(cx + s * o, eY - 1.0, colZ + 0.05); add(K.plum, g); add(K.brass, wbox(0.9, 0.05, 0.05, cx + s * o, eY - 0.13, colZ + 0.05)); }
  // 価格の鐘の塔：屋根の中央に、パックの clock_monument（台と時計）＋鐘の枠＋真鍮の鐘
  const tx = cx, tz = (rz0 + rz1) / 2 + 0.3, ty = y0 + 1.7;
  add(K.ivoryD, wbox(1.9, 1.7, 1.7, tx, y0 + 0.85, tz)); add(K.ivory, wbox(2.05, 0.14, 1.85, tx, ty, tz));
  out.group.add(await kit(ctx, 'clock_monument', [{ x: tx, y: ty + 0.07, z: tz, s: 0.95 }]));
  const by = ty + 0.07 + 3.67 * 0.95;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(K.ivory, wbox(0.16, 1.3, 0.16, tx + sx * 0.6, by + 0.65, tz + sz * 0.5));
  add(K.copper, new THREE.ConeGeometry(0.95, 0.9, 4).rotateY(Math.PI / 4).translate(tx, by + 1.75, tz)); add(K.brass, cyl(0.03, 0.03, 0.5, 6, tx, by + 2.4, tz));
  const bell = new THREE.LatheGeometry([[0.0, 0.62], [0.12, 0.6], [0.2, 0.5], [0.24, 0.25], [0.34, 0.05], [0.38, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 18); bell.translate(tx, by + 0.42, tz); add(K.brass, bell);
  namePlate(out.group, b.name || '証券市場', cx, eY + 0.27, zf + 0.17, 0, PLATE, 2.6);
  out.lights.push({ pos: new THREE.Vector3(cx, 3.2, zf + 0.8), color: 0xffe2b0, power: 1.1, dist: 9 }, { pos: new THREE.Vector3(tx, by + 0.6, tz + 1.0), color: 0xffd9a0, power: 0.6, dist: 6 });
}
// 銀行：重い石（段ごとに出入りする石積み）・狭い窓（鉄格子）・青銅の両開きの扉
async function bank(ctx, K, b, batch, out) {
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const H = 3.8;
  add(K.ivoryD, wbox(f.W + 0.2, 0.45, f.D + 0.2, f.cx, 0.225, f.cz));
  for (let y = 0.45, i = 0; y < H - 0.3; y += 0.42, i++) { const e = i % 2 ? 0.05 : 0; add(i % 2 ? K.ivory : K.ivoryD, wbox(f.W + e * 2, 0.4, f.D + e * 2, f.cx, y + 0.2, f.cz)); }
  add(K.ivory, wbox(f.W + 0.36, 0.3, f.D + 0.36, f.cx, H + 0.05, f.cz)); add(K.ivoryD, wbox(f.W - 0.2, 0.55, f.D - 0.2, f.cx, H + 0.47, f.cz));
  add(K.copper, wbox(f.W - 0.6, 0.12, f.D - 0.6, f.cx, H + 0.8, f.cz));
  for (let x = f.xl + 0.75; x < f.xr - 0.4; x += 1.1) { if (Math.abs(x - f.doorX) < 1.25) continue; add(K.dark, wbox(0.34, 1.35, 0.08, x, 2.0, f.zf + 0.02)); add(K.glass, wbox(0.26, 1.25, 0.06, x, 2.0, f.zf + 0.05)); for (const dx of [-0.07, 0.07]) add(K.iron, wbox(0.03, 1.3, 0.03, x + dx, 2.0, f.zf + 0.09)); add(K.ivory, wbox(0.6, 0.12, 0.2, x, 2.75, f.zf + 0.08)); }
  // 扉：石の枠（要石）・青銅の両開き・鋲
  const dx = f.doorX; add(K.ivory, wbox(1.9, 3.0, 0.3, dx, 1.95, f.zf + 0.1)); add(K.dark, wbox(1.4, 2.45, 0.1, dx, 1.67, f.zf + 0.22)); add(K.ivoryD, wbox(0.36, 0.45, 0.34, dx, 3.15, f.zf + 0.13));
  for (const s of [-1, 1]) { add(K.bronze, wbox(0.62, 2.3, 0.08, dx + s * 0.33, 1.6, f.zf + 0.28)); for (let y = 0.8; y < 2.6; y += 0.42) for (const ox of [0.14, 0.42]) add(K.brass, new THREE.SphereGeometry(0.03, 6, 4).translate(dx + s * ox, y, f.zf + 0.33)); }
  steps(add, K, dx, f.zf + 0.1, 2.2);
  namePlate(out.group, b.name || '銀行', dx, H - 0.25, f.zf + 0.27, 0, PLATE, 1.7);
  out.lights.push({ pos: new THREE.Vector3(dx, 2.6, f.zf + 0.9), color: 0xffe2b0, power: 0.9, dist: 7 });
}
// 闘技場：楕円の輪（観客席）・中の砂の床と段（上から見える）・大きなアーチの入口・旗
async function arena(ctx, K, b, batch, out) {
  const add = (m, g) => batch.add(m, g); const f = frameOf(b);
  const capsule = (x0, x1, z0, z1) => { const r = (z1 - z0) / 2, s = new THREE.Path(); s.moveTo(x0 + r, -z0); s.lineTo(x1 - r, -z0); s.absarc(x1 - r, -(z0 + r), r, Math.PI / 2, -Math.PI / 2, true); s.lineTo(x0 + r, -z1); s.absarc(x0 + r, -(z0 + r), r, -Math.PI / 2, -Math.PI * 1.5, true); return s; };
  const ring = (o, i, y0, h, m) => { const sh = new THREE.Shape(capsule(...o).getPoints(40)); sh.holes.push(new THREE.Path(capsule(...i).getPoints(40))); const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 12 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); worldUV(g, 2); add(m, g); };
  const o0 = [f.xl, f.xr, f.zb, f.zf]; const ins = (d) => [f.xl + d, f.xr - d, f.zb + d, f.zf - d];
  ring(o0, ins(0.7), 0, 3.6, K.ivory);   // 外の壁
  ring(ins(0.7), ins(1.2), 0, 2.6, K.ivoryD); ring(ins(1.2), ins(1.65), 0, 1.9, K.ivory); ring(ins(1.65), ins(2.05), 0, 1.25, K.ivoryD);   // 観客席の段
  const fl = new THREE.Shape(capsule(...ins(2.05)).getPoints(40)); const fg = new THREE.ShapeGeometry(fl); fg.rotateX(-Math.PI / 2); fg.translate(0, 0.5, 0); add(K.sand, fg);
  // 外の壁のアーチの並び（2段・暗い開口）
  for (let x = f.xl + 2.6; x < f.xr - 2.4; x += 1.15) for (const y of [0.9, 2.45]) { if (y < 2 && Math.abs(x - f.doorX) < 1.6) continue; add(K.dark, wbox(0.6, 0.85, 0.06, x, y, f.zf + 0.005)); const a = new THREE.CircleGeometry(0.3, 12, 0, Math.PI); a.translate(x, y + 0.42, f.zf + 0.006); add(K.dark, a); }
  add(K.copper, wbox(f.W - 4.6, 0.12, 0.12, f.cx, 3.62, f.zf - 0.05));
  // 入口の大きなアーチ（パックの arch_round）
  out.group.add(await kit(ctx, 'arch_round', [{ x: f.doorX, y: 0, z: f.zf + 0.05, s: [0.95, 1.0, 0.9] }]));
  // 旗（輪の上）
  for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6; const x = f.xl + 1.2 + t * (f.W - 2.4), z = k % 2 ? f.zb + 0.35 : f.zf - 0.35; add(K.iron, cyl(0.03, 0.03, 1.6, 6, x, 4.4, z)); const g = new THREE.PlaneGeometry(0.7, 0.42); g.translate(x + 0.36, 4.95, z); add(k % 2 ? K.red : K.plum, g); }
  namePlate(out.group, b.name || '闘技場', f.doorX + (f.doorX + 2.6 < f.xr - 2 ? 2.5 : -2.5), 2.2, f.zf + 0.04, 0, PLATE, 1.7);
  out.lights.push({ pos: new THREE.Vector3(f.doorX, 2.4, f.zf + 0.9), color: 0xffd9a0, power: 1.0, dist: 8 });
}
// 研究所：象牙色の石・銅の観測ドーム（細い開口と望遠鏡）・渾天儀（パックの magic_ring）
async function lab(ctx, K, b, batch, out) {
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const H = 3.2;
  add(K.ivoryD, wbox(f.W + 0.12, 0.35, f.D + 0.12, f.cx, 0.175, f.cz)); add(K.ivory, wbox(f.W, H - 0.35, f.D, f.cx, 0.35 + (H - 0.35) / 2, f.cz)); add(K.ivoryD, wbox(f.W + 0.24, 0.2, f.D + 0.24, f.cx, H + 0.1, f.cz));
  for (let x = f.xl + 0.7; x < f.xr - 0.4; x += 1.05) { if (Math.abs(x - f.doorX) < 1.1) continue; add(K.dark, wbox(0.62, 1.2, 0.06, x, 1.75, f.zf + 0.02)); add(K.glass, wbox(0.52, 1.1, 0.06, x, 1.75, f.zf + 0.04)); }
  const dX = f.cx + 0.6, dZ = f.cz - 0.2, R = 1.55; add(K.ivoryD, cyl(R + 0.1, R + 0.1, 0.5, 24, dX, H + 0.45, dZ));
  const dome = new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(dX, H + 0.7, dZ); add(K.copper, dome);
  add(K.dark, rbox(0.42, 0.06, R + 0.1, dX, H + 0.7 + R * 0.72, dZ + 0.55, 0, -0.85));
  const tube = new THREE.CylinderGeometry(0.11, 0.15, 1.5, 12); tube.rotateX(-0.75); tube.translate(dX, H + 0.7 + R * 0.95, dZ + 0.75); add(K.brass, tube);
  out.group.add(await kit(ctx, 'magic_ring', [{ x: f.xl + 1.0, y: H + 0.2, z: f.zb + 0.9, s: 0.55 }]));
  add(K.dark, wbox(1.2, 2.2, 0.08, f.doorX, 1.1 + 0.35, f.zf + 0.02)); add(K.bronze, wbox(1.0, 2.05, 0.06, f.doorX, 1.37, f.zf + 0.06)); steps(add, K, f.doorX, f.zf, 1.8);
  namePlate(out.group, b.name || '研究所', f.doorX, 2.85, f.zf + 0.06, 0, PLATE, 1.7);
  out.lights.push({ pos: new THREE.Vector3(f.doorX, 2.4, f.zf + 0.8), color: 0xffe2b0, power: 0.9, dist: 7 });
}
// 酒場：小さなアーチの入口・暖色の窓・吊り看板・樽・瓦の屋根
async function tavern(ctx, K, b, batch, out) {
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const H = 2.9;
  add(K.ivoryD, wbox(f.W + 0.1, 0.3, f.D + 0.1, f.cx, 0.15, f.cz)); add(K.plaster, wbox(f.W, H - 0.3, f.D, f.cx, 0.3 + (H - 0.3) / 2, f.cz));
  for (let x = f.xl + 0.25; x < f.xr; x += 1.2) add(K.wood, wbox(0.14, H - 0.3, 0.06, x, 0.3 + (H - 0.3) / 2, f.zf + 0.02));
  add(K.wood, wbox(f.W + 0.06, 0.16, 0.08, f.cx, H - 0.08, f.zf + 0.03));
  for (let x = f.xl + 0.85; x < f.xr - 0.5; x += 1.2) { if (Math.abs(x - f.doorX) < 0.9) continue; add(K.wood, wbox(0.78, 0.7, 0.06, x, 1.45, f.zf + 0.03)); add(K.warmWin, wbox(0.66, 0.58, 0.05, x, 1.45, f.zf + 0.05)); add(K.wood, wbox(0.05, 0.58, 0.07, x, 1.45, f.zf + 0.07)); }
  // 小さな入口（低い・アーチ）
  add(K.wood, wbox(0.95, 1.55, 0.1, f.doorX, 0.3 + 0.78, f.zf + 0.04)); const a = new THREE.CircleGeometry(0.47, 14, 0, Math.PI); a.translate(f.doorX, 1.85, f.zf + 0.045); add(K.wood, a);
  add(K.warmWin, wbox(0.75, 1.35, 0.04, f.doorX, 0.3 + 0.7, f.zf + 0.1));
  // 瓦の屋根（暖色）
  const ex = f.W + 0.5, ez = f.D + 0.6, rise = 1.25; for (const s of [1, -1]) { const len = Math.hypot(ez / 2, rise); add(K.red, rbox(ex, 0.12, len, f.cx, H + rise / 2, f.cz + s * ez / 4, 0, s * Math.atan2(rise, ez / 2))); }
  for (const s of [-1, 1]) { const tri = new THREE.Shape(); tri.moveTo(-f.D / 2, 0); tri.lineTo(f.D / 2, 0); tri.lineTo(0, rise - 0.05); tri.closePath(); const g = new THREE.ShapeGeometry(tri); g.rotateY(s * Math.PI / 2); g.translate(f.cx + s * f.W / 2, H, f.cz); add(K.plaster, g); }
  add(K.ivoryD, wbox(0.55, 1.2, 0.55, f.xl + 1.2, H + 0.9, f.cz - 0.4)); ctx.scene.addSmoke(new THREE.Vector3(f.xl + 1.2, H + 1.6, f.cz - 0.4));
  // 吊り看板・ランタン・樽（足元の前の列の中）
  const sx = f.doorX + 1.0; add(K.iron, wbox(0.05, 0.05, 0.75, sx, 2.45, f.zf + 0.38)); add(K.wood, wbox(0.6, 0.45, 0.05, sx, 2.1, f.zf + 0.68)); add(K.brass, wbox(0.3, 0.2, 0.06, sx, 2.1, f.zf + 0.68));
  for (const s of [-1, 1]) add(K.bulb, new THREE.SphereGeometry(0.08, 8, 6).translate(f.doorX + s * 0.7, 2.1, f.zf + 0.12));
  for (const [x, y] of [[f.xl + 0.4, 0.25], [f.xr - 0.4, 0.25], [f.xr - 0.4, 0.68]]) add(K.wood, cyl(0.2, 0.2, 0.42, 10, x, y, f.zf + 0.2));
  namePlate(out.group, b.name || '酒場', f.doorX, H + 0.15, f.zf + 0.15, 0, PLATE, 1.7);
  out.lights.push({ pos: new THREE.Vector3(f.doorX, 2.1, f.zf + 0.8), color: 0xffa860, power: 1.2, dist: 7 });
}

// ---------------- 町全体：床・欄干・門・運河の縁・板表示・街灯
async function build(ctx, K, b, o) {
  const map = ctx.map, W = map.w, H = map.h; const hi = ctx.quality !== 'low'; const hAt = b.heightAt || (() => 0);
  const g = new THREE.Group(); g.name = 'env_tradia'; b.root.add(g);
  const batch = new Batch(); const add = (m, gg) => batch.add(m, gg);
  const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z));
  const covered = new Set(); for (const bd of map.buildings) for (let y = bd.y; y < bd.y + bd.h; y++) for (let x = bd.x; x < bd.x + bd.w; x++) covered.add(x + ',' + y);
  const ex = o.ex, pc = { x: ex.doorAbs.x + 0.5, z: ex.y + ex.h + 3.6 }, PR = 3.35;   // 放射状の広場の中心と半径
  const tavern = map.buildings.find((q) => q.id === 'td_tavern'), bankB = map.buildings.find((q) => q.id === 'td_bank');
  // ---- 床の区分：大通り（道）／裏の飲食路（酒場・銀行のまわり）／住宅路（北西・南西）／運河ぞい（板石の道）／ほか（歩道・広場）
  const L = { road: [], dine: [], home: [], prom: [], walk: [] };
  const near = (q, x, z, d) => q && x >= q.x - d && x < q.x + q.w + d && z >= q.y - d && z < q.y + q.h + d;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = T(x, z); if (t === 'fence' || t === 'water' || t === 'bridge' || t === 'grass2' || covered.has(x + ',' + z)) continue; const y = hAt(x + 0.5, z + 0.5) + 0.014;
    if (t === 'road') L.road.push([x, z, y]); else if (t === 'path_stone') L.prom.push([x, z, y]);
    else if (x < 47 && (near(tavern, x, z, 2) || near(bankB, x, z, 2)) && z >= 19) L.dine.push([x, z, y]);
    else if (x < 14 && (z <= 8 || z >= 28)) L.home.push([x, z, y]); else L.walk.push([x, z, y]);
  }
  // 大通りの擦り減り：道の中ほど（同じ道が両側に続く所）ほど少し暗い
  const roadSet = new Set(L.road.map(([x, z]) => x + ',' + z)); const isR = (x, z) => roadSet.has(x + ',' + z);
  const wear = (px, pz) => { let n = 0; for (const [dx, dz] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) if (isR(Math.floor(px) + dx, Math.floor(pz) + dz)) n++; const deep = (isR(Math.floor(px) - 2, Math.floor(pz)) && isR(Math.floor(px) + 1, Math.floor(pz))) || (isR(Math.floor(px), Math.floor(pz) - 2) && isR(Math.floor(px), Math.floor(pz) + 1)); return n === 4 && deep ? 0.86 : n === 4 ? 0.93 : 1.0; };
  add(K.slabW, floorQuads(L.road, 1 / 4, 1 / 4, wear)); add(K.cobW, floorQuads(L.dine, 1 / 2, 1 / 2)); add(K.settsS, floorQuads(L.home, 1 / 2, 1 / 2)); add(K.slab, floorQuads(L.prom, 1, 1)); add(K.setts, floorQuads(L.walk, 1 / 2, 1 / 2));
  // ---- 放射状の広場（証券市場の前）：同心円の石の円盤・真鍮の筋・中心のメダリオン
  const disc = new THREE.CircleGeometry(PR, 64); disc.rotateX(-Math.PI / 2); disc.translate(pc.x, 0.026, pc.z); const duv = disc.attributes.uv, dp = disc.attributes.position; for (let i = 0; i < duv.count; i++) duv.setXY(i, (dp.getX(i) - pc.x) / (2 * PR) + 0.5, (dp.getZ(i) - pc.z) / (2 * PR) + 0.5); add(K.radial, disc);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r0 = 1.85, r1 = PR - 0.05, len = r1 - r0, rm = (r0 + r1) / 2; add(K.brass, rbox(len, 0.012, 0.045, pc.x + Math.cos(a) * rm, 0.036, pc.z + Math.sin(a) * rm, -a)); }
  const rim = new THREE.RingGeometry(PR - 0.06, PR + 0.06, 64); rim.rotateX(-Math.PI / 2); rim.translate(pc.x, 0.034, pc.z); add(K.brass, rim);
  g.add(await kit(ctx, 'floor_medallion', [{ x: pc.x, y: 0.02, z: pc.z, s: [0.95, 0.22, 0.95] }], { shadow: false }));
  // ---- 板表示（証券市場の前の左右の「大きな板」のマス）：深緑の板・金の数字・真鍮の縁・銅の小屋根（頭より高い所）
  for (const e of o.boards) {
    const x = e.x + 0.5, z = e.y + 0.5;
    for (const s of [-1, 1]) add(K.iron, wbox(0.12, 3.5, 0.12, x + s * 0.4, 1.75, z));
    add(K.iron, wbox(1.9, 1.5, 0.1, x, 2.6, z)); const bp = new THREE.PlaneGeometry(1.76, 1.36); bp.translate(x, 2.6, z + 0.056); add(K.board, bp);
    add(K.brass, wbox(1.96, 0.06, 0.14, x, 3.38, z)); add(K.brass, wbox(1.96, 0.06, 0.14, x, 1.82, z)); add(K.copper, rbox(2.1, 0.08, 0.6, x, 3.62, z + 0.05, 0, 0.35));
    add(K.ivoryD, wbox(0.9, 0.3, 0.6, x, 0.15, z));
  }
  // ---- 欄干（外周・東の地区との境の柵）：象牙色の台・手すり・小さな柱（PC）
  let rails = 0; const bal = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (T(x, z) !== 'fence') continue; const hx = T(x - 1, z) === 'fence' || T(x + 1, z) === 'fence', hz = T(x, z - 1) === 'fence' || T(x, z + 1) === 'fence'; const y0 = hAt(x + 0.5, z + 0.5);
    add(K.ivoryD, wbox(hx ? 1.0 : 0.5, 0.28, hz ? 1.0 : 0.5, x + 0.5, y0 + 0.14, z + 0.5)); add(K.ivory, wbox(hx ? 1.02 : 0.44, 0.12, hz ? 1.02 : 0.44, x + 0.5, y0 + 0.98, z + 0.5));
    if (hx && hz || (x + z) % 4 === 0) add(K.ivory, wbox(0.34, 1.12, 0.34, x + 0.5, y0 + 0.56, z + 0.5));
    else if (hi) for (const t of [0.25, 0.55, 0.85]) bal.push(hx ? [x + t - 0.075, z + 0.5, y0] : [x + 0.5, z + t - 0.075, y0]);
    else add(K.ivory, wbox(hx ? 1.0 : 0.16, 0.64, hz ? 1.0 : 0.16, x + 0.5, y0 + 0.6, z + 0.5));
    rails++;
  }
  if (bal.length) { const proto = new THREE.LatheGeometry([[0.0, 0.0], [0.07, 0.0], [0.07, 0.06], [0.04, 0.14], [0.06, 0.34], [0.035, 0.56], [0.06, 0.62], [0.0, 0.64]].map(([r, y]) => new THREE.Vector2(r, y)), 8); for (const [x, z, y0] of bal) add(K.ivory, proto.clone().translate(x, y0 + 0.28, z)); }
  // ---- 南の門：石のアーチ（パックの arch_round）。柵の切れ目の両側の柵のマスに足
  let gate = null; for (let x = 1; x < W - 1 && !gate; x++) if (T(x, H - 1) === 'road' && T(x - 1, H - 1) === 'fence') { let x1 = x; while (T(x1, H - 1) === 'road') x1++; gate = [x - 1, x1]; }
  if (gate) {   // 柱は両側の柵のマスの中。アーチの内側は道の端でも高さ2.6以上
    const gx = (gate[0] + gate[1] + 1) / 2, half = (gate[1] - gate[0] - 1) / 2, gz = H - 0.5;
    for (const s of [-1, 1]) { const px = gx + s * (half + 0.5); add(K.ivoryD, wbox(0.9, 0.35, 0.9, px, 0.175, gz)); add(K.ivory, wbox(0.78, 3.0, 0.78, px, 1.85, gz)); add(K.ivoryD, wbox(0.92, 0.2, 0.92, px, 3.4, gz)); }
    const arc = new THREE.TorusGeometry(half + 0.25, 0.27, 8, 28, Math.PI); arc.scale(1, 0.55, 1); arc.translate(gx, 2.75, gz); add(K.ivory, arc);
    add(K.ivory, wbox(2 * half + 1.8, 0.75, 0.8, gx, 4.15, gz)); add(K.copper, wbox(2 * half + 2.0, 0.14, 0.95, gx, 4.58, gz)); add(K.brass, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20).rotateX(Math.PI / 2).translate(gx, 3.55, gz + 0.3));
    namePlate(g, map.name || '相場都市トレディア', gx, 4.15, gz + 0.41, 0, PLATE, 2.6);
  }
  // ---- 運河の縁：象牙色の笠木（水のマスの、陸に面した辺）
  let coping = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'water') continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = T(x + dx, z + dz); if (n === 'water' || n === 'bridge' || n === '_out' || n === 'fence') continue; const ex2 = x + 0.5 + dx * 0.5, ez2 = z + 0.5 + dz * 0.5; add(K.ivory, dx ? wbox(0.22, 0.14, 1.0, ex2 - dx * 0.06, 0.05, ez2) : wbox(1.0, 0.14, 0.22, ex2, 0.05, ez2 - dz * 0.06)); add(K.ivoryD, dx ? wbox(0.06, 0.32, 1.0, ex2 - dx * 0.03, -0.17, ez2) : wbox(1.0, 0.32, 0.06, ex2, -0.17, ez2 - dz * 0.03)); coping++; } }
  // ---- 街灯：深緑の鉄の柱・真鍮の灯（暖かい白）
  let lamps = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'lamp') continue; const cx = x + 0.5, cz = z + 0.5, y = hAt(cx, cz); add(K.iron, cyl(0.16, 0.2, 0.3, 8, cx, y + 0.15, cz)); add(K.iron, cyl(0.05, 0.07, 2.4, 8, cx, y + 1.45, cz)); add(K.brass, cyl(0.17, 0.11, 0.08, 8, cx, y + 2.68, cz)); add(K.bulb, new THREE.SphereGeometry(0.13, 10, 8).translate(cx, y + 2.85, cz)); add(K.copper, new THREE.ConeGeometry(0.22, 0.24, 8).translate(cx, y + 3.08, cz)); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, 2.7, cz), color: 0xffe2b0, power: 0.9, dist: 9 }); lamps++; }
  batch.build(g);
  Object.assign(ctx.stats, { lamps, rails, balusters: bal.length, coping, floor: { road: L.road.length, dine: L.dine.length, home: L.home.length, prom: L.prom.length, walk: L.walk.length }, boards: o.boards.length });
  return g;
}
