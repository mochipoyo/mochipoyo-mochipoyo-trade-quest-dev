/* =========================================================
   v7.6 町の作り直し：建物の形の作り分け（js/data/towns76.js の shape76・doorSide）
   ・'round'：丸い家（円筒の壁。地域が砂漠ならドーム、ほかは円錐の屋根）
   ・'octa'：八角の家（角を落とした壁・八角の屋根）。入口は角（doorX が端なら斜めの面に扉）
   ・'tent'：テント（隊商の天幕。縞の布。間口が広ければ棟のある天幕）
   ・'stall'：露店（柱・縞の日よけ・カウンターと品物。店主は奥のマス）。type で品物を変える（bakery：パン／weapon：剣と盾／armor：鎧と兜）
   ・doorSide 'left'／'right'：横を正面にして組み立て、90度回して置く（足元・扉のマスは js/core/map.js と同じ）
   ・足元のタイル・扉の位置・当たり判定は変えない（形だけ）。歩けるマスへ体の高さ（1.8）より下で出る形は作らない
   ========================================================= */
import * as THREE from 'three';
import { box, M4, textTexture } from '../../engine/Materials.js';
import { canvasTex, texMat } from './geo.js';
import { plain } from '../EnvKit3D.js';

const TYPE_COL = { bakery: ['#d8862e', '#f6ead2'], weapon: ['#a8302a', '#f2e8d8'], armor: ['#2e5a9a', '#f0ece2'], item: ['#3a8a5a', '#f2ecd8'], tavern: ['#7a4a2a', '#efe0c4'], guild: ['#7a2e6a', '#f2e4c8'], house: ['#b0603a', '#f4e8d0'], inn: ['#a8483a', '#f6ead2'] };
const stripeMat = (a, b, n) => texMat('v76_stripe_' + a + b + n, canvasTex('v76_stripe_' + a + b + n, 256, 64, (g, W, H) => { const s = W / n; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * s, 0, s + 1, H); } g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, H - 6, W, 6); }), { roughness: 0.95, side: THREE.DoubleSide });

// 名札（扉の上の板）
function plate(out, name, x, y, z, ry) { if (!name) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.43), new THREE.MeshStandardMaterial({ map: textTexture(name), roughness: 0.8 })); m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = false; out.group.add(m); }
// 扉（正面 +z 向き。ry で回す）：扉の板・枠・取っ手・灯り・石段
function doorAt(add, M, out, x, z, base, ry, o) {
  o = o || {}; const R = M4(x, 0, z, ry || 0); const at = (gx, gy, gz) => R.clone().multiply(M4(gx, gy, gz));
  add(M.get('door'), box(0.95, 1.9, 0.08, 1.2), at(0, base + 0.95, 0));
  for (const sx of [-1, 1]) add(M.get('timber'), box(0.14, 2.05, 0.16, 1), at(sx * 0.55, base + 1.02, 0.04));
  if (o.arch) { const a = new THREE.TorusGeometry(0.55, 0.08, 6, 12, Math.PI); a.translate(0, base + 2.0, 0.06); add(M.get('timber'), a, R); } else add(M.get('timber'), box(1.3, 0.16, 0.18, 1), at(0, base + 2.05, 0.05));
  add(M.get('gold'), new THREE.SphereGeometry(0.045, 8, 6), at(0.3, base + 0.98, 0.07));
  add(M.get('stonewall'), box(1.4, 0.14, 0.4, 1), at(0, 0.07, 0.42));
  const lp = new THREE.Vector3(0, base + 1.9, 0.45).applyMatrix4(R); out.lights.push({ pos: lp, color: 0xffb05a, power: 0.9 });
  out.props.push({ id: 'wall_lantern', m: at(0.8, base + 1.95, 0.02).multiply(M4(0, 0, 0, Math.PI)) });
}
// 窓（壁の面に。ry で向き）
function windowAt(add, M, x, y, z, ry, w, h) { const R = M4(x, y, z, ry || 0); add(M.get('timber'), box(w + 0.14, h + 0.14, 0.08, 1), R); add(M.get('glass'), box(w, h, 0.06, 1), R.clone().multiply(M4(0, 0, 0.02))); add(M.get('timber'), box(0.05, h, 0.09, 1), R.clone().multiply(M4(0, 0, 0.03))); }

// 八角形の頂点（角を c だけ落とした長方形）。順番は時計回り（上から見て）
function octPts(xl, xr, zb, zf, c) { return [[xl + c, zb], [xr - c, zb], [xr, zb + c], [xr, zf - c], [xr - c, zf], [xl + c, zf], [xl, zf - c], [xl, zb + c]]; }
function prism(pts, y0, h) { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1]))); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g; }
// 多角形の屋根（軒から頂点へ）。pts：軒の点。apex：[x, y, z]
function pyramid(pts, y, apex) {
  const pos = [], uv = []; const n = pts.length;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; pos.push(a[0], y, a[1], apex[0], apex[1], apex[2], b[0], y, b[1]); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); uv.push(0, 0, L / 2, 1.6, L, 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
const grow = (pts, cx, cz, d) => pts.map((p) => { const dx = p[0] - cx, dz = p[1] - cz; const L = Math.hypot(dx, dz) || 1; return [p[0] + dx / L * d, p[1] + dz / L * d]; });

/* ---------- 形ごと（扉は正面 +z。b は回したあとの仮の建物） ---------- */
function roundHouse(b, ctx) {
  const { add, M, out, R, st, desert } = ctx; const xl = b.x + 0.25, xr = b.x + b.w - 0.25, zb = b.y + 0.25, zf = b.y + b.h - 0.55;
  const cx = (xl + xr) / 2, cz = (zb + zf) / 2, rx = (xr - xl) / 2, rz = (zf - zb) / 2; const base = 0.3, h1 = desert ? 2.5 : 2.7, top = base + h1;
  const wall = st.wallMat || M.tinted('plaster', st.plaster), stone = M.get('stonewall'), timber = M.get('timber');   // v8.3 町の外壁の画像（town_kit の brick82・wall82）があればそれ
  const cylS = (r0, r1, h, y, seg) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg || 28, 1); g.scale(rx, 1, rz); g.translate(cx, y, cz); return g; };
  add(stone, cylS(1.04, 1.06, base, base / 2), null);
  add(wall, cylS(1, 1, h1, base + h1 / 2), null);
  if (!desert) { add(timber, cylS(1.02, 1.02, 0.14, base + 0.08), null); add(timber, cylS(1.02, 1.02, 0.16, top - 0.08), null); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; add(timber, box(0.14, h1, 0.14, 1), M4(cx + Math.cos(a) * rx * 1.01, base + h1 / 2, cz + Math.sin(a) * rz * 1.01)); } }
  if (desert) {   // ドーム（しっくい）と頂の飾り
    const d = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(rx * 1.02, Math.min(rx, rz) * 0.95, rz * 1.02); d.translate(cx, top, cz); add(M.tinted('plaster', st.dome || '#f4e6c8'), d, null);
    add(M.tinted('plaster', '#c9a24a'), new THREE.SphereGeometry(0.16, 10, 8).translate(cx, top + Math.min(rx, rz) * 0.95 + 0.12, cz), null);
    add(M.tinted('plaster', st.trim || '#c87a3a'), cylS(1.03, 1.03, 0.12, top - 0.04), null);
  } else {   // 円錐の屋根（板瓦）と軒
    const rh = 1.0 + Math.min(rx, rz) * 0.55; const rc = st.roofColor || '#8e5a3a'; const roof = new THREE.ConeGeometry(1.0, 1, 28, 6, true); roof.scale(rx + 0.55, rh, rz + 0.55); roof.translate(cx, top + rh / 2, cz); add(plain(rc, { std: { roughness: 0.82, side: THREE.DoubleSide } }), roof, null);
    for (let k = 1; k <= 4; k++) { const t = k / 5; const ring = new THREE.TorusGeometry(1, 0.035, 4, 28); ring.rotateX(Math.PI / 2); ring.scale((rx + 0.55) * (1 - t) + 0.02, 1, (rz + 0.55) * (1 - t) + 0.02); ring.translate(cx, top + rh * t, cz); add(plain('#' + new THREE.Color(rc).multiplyScalar(0.72).getHexString(), { std: { roughness: 0.9 } }), ring, null); }   // 瓦の段
    add(timber, new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6).translate(cx, top + 1.0 + Math.min(rx, rz) * 0.55 + 0.25, cz), null);
  }
  // 扉（正面の円の上）
  const dx = b.doorAbs.x + 0.5; const u = Math.max(-0.95, Math.min(0.95, (dx - cx) / rx)); const dz = cz + rz * Math.sqrt(1 - u * u) + 0.02; const ang = Math.atan2(u * rz / rx, Math.sqrt(1 - u * u)) * 0.6;
  doorAt(add, M, out, dx, dz, base, ang, { arch: true });
  plate(out, b.name, dx, base + 2.45, dz + 0.1, ang);
  // 丸い窓（横と後ろ）
  for (const a of [0.35, 0.65, 0.9, 1.1, 1.4, 1.6].map((t) => t * Math.PI)) { const wx = cx + Math.cos(a) * rx * 1.005, wz = cz - Math.sin(a) * rz * 1.005; if (wz > cz + rz * 0.6) continue; const g = new THREE.CircleGeometry(0.26, 14); g.rotateY(Math.PI / 2 + a); g.translate(wx, base + 1.55, wz); add(M.get('glass'), g, null); }
  if (b.type === 'bakery' || /パン/.test(b.name || '')) { const chx = cx - rx * 0.4, chz = cz - rz * 0.3; add(stone, box(0.6, 2.4, 0.6, 1.2), M4(chx, top + 0.6, chz)); out.smokes.push(new THREE.Vector3(chx, top + 2.0, chz)); }
  if (b.type === 'weapon' || b.type === 'armor') { const chx = cx + rx * 0.35, chz = cz - rz * 0.35; add(stone, box(0.7, 3.0, 0.7, 1.2), M4(chx, top + 0.5, chz)); add(M.get('iron'), box(0.8, 0.12, 0.8, 1), M4(chx, top + 2.05, chz)); out.smokes.push(new THREE.Vector3(chx, top + 2.2, chz)); }
  return out;
}

// v8.1 学院の観測塔（shape76 'observatory81'。js/data/remake81-academy.js）：石の円い塔・見晴らしの回廊・青銅のドーム（観測の細い開口と望遠鏡の先）・尖頭アーチの窓
function observatory81(b, ctx) {
  const { add, M, out } = ctx; const xl = b.x + 0.2, xr = b.x + b.w - 0.2, zb = b.y + 0.2, zf = b.y + b.h - 0.55;
  const cx = (xl + xr) / 2, cz = (zb + zf) / 2, r = Math.min(xr - xl, zf - zb) / 2; const base = 0.4, h1 = 4.2, top = base + h1;
  const stone = M.tinted('stonewall', '#cfc6b4'), dark = M.tinted('stonewall', '#9a907e'), timber = M.get('timber');
  const bronze = plain('#5e8a6e', { std: { roughness: 0.45, metalness: 0.7 } }), bronzeD = plain('#3e5a48', { std: { roughness: 0.5, metalness: 0.6 } }), slit = plain('#14161c', { std: { roughness: 1 } });
  const glow = plain('#ffd89a', { emissive: '#ffc070', ei: 1.1, window: true });
  const cyl = (r0, r1, h, y, seg) => new THREE.CylinderGeometry(r0, r1, h, seg || 32, 1).translate(cx, y, cz);
  add(dark, cyl(r * 1.06, r * 1.1, base, base / 2), null);
  add(stone, cyl(r, r, h1, base + h1 / 2), null);
  for (const yy of [base + 1.5, base + 3.0]) add(dark, cyl(r * 1.03, r * 1.03, 0.16, yy), null);   // 帯石
  // 見晴らしの回廊（張り出した床と手すり）
  add(dark, cyl(r * 1.22, r * 1.12, 0.22, top - 0.1), null);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; add(timber, box(0.07, 0.6, 0.07, 1), M4(cx + Math.cos(a) * r * 1.18, top + 0.3, cz + Math.sin(a) * r * 1.18)); }
  const rail = new THREE.TorusGeometry(r * 1.18, 0.04, 4, 40); rail.rotateX(Math.PI / 2); rail.translate(cx, top + 0.62, cz); add(timber, rail, null);
  // ドーム（青銅）と開口・望遠鏡の先
  const dr = r * 0.98; const dome = new THREE.SphereGeometry(dr, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(cx, top + 0.05, cz); add(bronze, dome, null);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const mx = new THREE.Matrix4().makeTranslation(cx, top + 0.05, cz).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)); add(bronzeD, new THREE.TorusGeometry(dr * 1.005, 0.035, 4, 24, Math.PI / 2), mx); }
  add(slit, box(0.5, dr * 0.95, 0.12, 1), M4(cx, top + 0.05 + dr * 0.5, cz + dr * 0.82, 0, -0.62));   // 南へ開いた観測の細い口
  const tube = new THREE.CylinderGeometry(0.12, 0.17, 1.5, 12); tube.rotateX(Math.PI / 2 - 0.62); tube.translate(cx, top + dr * 0.75, cz + dr * 0.72); add(M.get('iron'), tube, null);
  add(bronzeD, new THREE.SphereGeometry(0.14, 10, 8).translate(cx, top + 0.05 + dr + 0.08, cz), null);
  // 尖頭アーチの窓（灯りがともる）
  for (const a of [0.2, 0.5, 0.8, 1.2, 1.5, 1.8].map((t) => t * Math.PI)) { for (const yy of [base + 2.2, base + 3.6]) { const wx = cx + Math.cos(a) * r * 1.01, wz = cz + Math.sin(a) * r * 1.01; if (wz > cz + r * 0.7 && Math.abs(wx - (b.doorAbs.x + 0.5)) < 0.8) continue; const ry = Math.atan2(Math.cos(a), Math.sin(a)); add(glow, box(0.3, 0.7, 0.04, 1), M4(wx, yy, wz, ry)); add(dark, box(0.12, 0.12, 0.08, 1), M4(wx, yy + 0.42, wz, ry, 0, Math.PI / 4)); } }
  const dx = b.doorAbs.x + 0.5; const dz = cz + Math.sqrt(Math.max(0, r * r - (dx - cx) * (dx - cx))) + 0.02;
  doorAt(add, M, out, dx, dz, base, 0, { arch: true });
  plate(out, b.name, dx, base + 2.55, dz + 0.1, 0);
  out.lights.push({ pos: new THREE.Vector3(cx, top + 1.0, cz + r), color: 0xffd08a, power: 0.9, dist: 9 });
  return out;
}

function octaHouse(b, ctx) {
  const { add, M, out, st, desert } = ctx; const xl = b.x + 0.2, xr = b.x + b.w - 0.2, zb = b.y + 0.2, zf = b.y + b.h - 0.55;
  const cx = (xl + xr) / 2, cz = (zb + zf) / 2; const c = Math.min(xr - xl, zf - zb) * 0.3; const base = 0.32, h1 = 3.0, top = base + h1;
  const P = octPts(xl, xr, zb, zf, c); const stone = M.get('stonewall'), timber = M.get('timber'), wall = st.wallMat || M.tinted('plaster', st.plaster);
  add(stone, prism(octPts(xl - 0.08, xr + 0.08, zb - 0.08, zf + 0.08, c), 0, base), null);
  add(wall, prism(P, base, h1), null);
  if (!desert) { P.forEach((p) => add(timber, box(0.18, h1, 0.18, 1), M4(p[0], base + h1 / 2, p[1]))); add(timber, prism(octPts(xl - 0.04, xr + 0.04, zb - 0.04, zf + 0.04, c), top - 0.16, 0.16), null); }
  if (desert) {   // 平屋根と胸壁
    add(M.tinted('plaster', '#e8d4ae'), prism(octPts(xl - 0.06, xr + 0.06, zb - 0.06, zf + 0.06, c), top, 0.16), null);
    for (let i = 0; i < P.length; i++) { const a = P[i], q = P[(i + 1) % P.length]; const L = Math.hypot(q[0] - a[0], q[1] - a[1]); const n = Math.max(1, Math.round(L / 0.8)); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; add(M.tinted('plaster', st.plaster), box(0.36, 0.4, 0.36, 1), M4(a[0] + (q[0] - a[0]) * t, top + 0.36, a[1] + (q[1] - a[1]) * t)); } }
  } else {
    const eave = grow(P, cx, cz, 0.45); const rise = Math.min(xr - xl, zf - zb) * 0.55 + 0.6;
    add(M.roof(st.roofColor || '#7a4a32'), pyramid(eave, top - 0.05, [cx, top + rise, cz]), null);
    add(M.get('gold'), new THREE.ConeGeometry(0.12, 0.6, 8).translate(cx, top + rise + 0.25, cz), null);
  }
  // 扉：端の扉は角の斜めの面へ（右下・左下）。それ以外は正面
  const dX = b.doorAbs.x - b.x; const diag = dX >= b.w - 1 ? 1 : dX <= 0 ? -1 : 0;
  let dx, dz, ry;
  if (diag) { const a = diag > 0 ? P[3] : P[6], q = diag > 0 ? P[4] : P[5]; dx = (a[0] + q[0]) / 2 + diag * 0.02; dz = (a[1] + q[1]) / 2 + 0.02; ry = diag * Math.PI / 4; }
  else { dx = b.doorAbs.x + 0.5; dz = zf + 0.02; ry = 0; }
  doorAt(add, M, out, dx, dz, base, ry, { arch: true });
  plate(out, b.name, dx + Math.sin(ry) * 0.08, base + 2.5, dz + Math.cos(ry) * 0.08, ry);
  // 窓（扉のない面）
  for (let i = 0; i < P.length; i++) { const a = P[i], q = P[(i + 1) % P.length]; const mx = (a[0] + q[0]) / 2, mz = (a[1] + q[1]) / 2; if (Math.hypot(mx - dx, mz - dz) < 0.8) continue; const ang = Math.atan2(q[1] - a[1], q[0] - a[0]); const nry = Math.PI - ang; const nx = Math.sin(nry), nz = Math.cos(nry); if (mz > cz + 0.2 && Math.abs(mx - dx) < 1.2) continue; windowAt(add, M, mx + nx * 0.04, base + 1.6, mz + nz * 0.04, nry, 0.5, 0.65); }
  return out;
}

function tent(b, ctx) {
  const { add, M, out, st } = ctx; const xl = b.x + 0.2, xr = b.x + b.w - 0.2, zb = b.y + 0.2, zf = b.y + b.h - 0.5;
  const cx = (xl + xr) / 2, cz = (zb + zf) / 2, rx = (xr - xl) / 2, rz = (zf - zb) / 2; const col = TYPE_COL[b.type] || ['#b0503a', '#f2e6cc'];
  const cloth = stripeMat(col[0], col[1], 12), wallC = M.tinted('plaster', col[1]), pole = M.get('timber');
  const wide = rx > rz * 1.35; const wallH = 1.5;
  if (!wide) {   // 丸い天幕：低い円い壁＋円錐の布
    const w = new THREE.CylinderGeometry(1, 1, wallH, 24, 1, true); w.scale(rx, 1, rz); w.translate(cx, wallH / 2, cz); add(wallC, w, null);
    const h = 1.9 + Math.min(rx, rz) * 0.5; const cone = new THREE.ConeGeometry(1, h, 24, 1, true); cone.scale(rx + 0.35, 1, rz + 0.35); cone.translate(cx, wallH + h / 2 - 0.05, cz); add(cloth, cone, null);
    add(pole, new THREE.CylinderGeometry(0.06, 0.07, wallH + h + 0.6, 6).translate(cx, (wallH + h + 0.6) / 2, cz), null);
    // 縁の房（縞の布の縁の垂れ）
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const g = new THREE.ConeGeometry(0.08, 0.22, 4); g.rotateX(Math.PI); g.translate(cx + Math.cos(a) * (rx + 0.33), wallH - 0.12, cz + Math.sin(a) * (rz + 0.33)); add(M.tinted('plaster', col[0]), g, null); }
    flag(add, M, cx, wallH + h + 0.55, cz, col[0]);
  } else {   // 棟のある天幕：2本の柱と三角の布
    const h = 2.1 + rz * 0.35; const s = new THREE.Shape(); s.moveTo(-rz - 0.35, 0); s.lineTo(0, h); s.lineTo(rz + 0.35, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: (rx + 0.3) * 2, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(cx - rx - 0.3, wallH - 0.05, cz);
    { const P = g.attributes.position, U = g.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, (P.getX(i) - (cx - rx - 0.3)) / 4.8, (P.getY(i) - wallH) / h); U.needsUpdate = true; }   // v7.6 縞を棟から軒へ（以前は棟と平行の横縞で、屋根の建物に見えた）
    add(cloth, g, null);
    const wb = new THREE.BoxGeometry(rx * 2, wallH, rz * 2); wb.translate(cx, wallH / 2, cz); add(wallC, wb, null);
    for (const sx of [-1, 1]) add(pole, new THREE.CylinderGeometry(0.06, 0.07, wallH + h + 0.5, 6).translate(cx + sx * (rx - 0.2), (wallH + h + 0.5) / 2, cz), null);
    add(pole, box(rx * 2 + 0.4, 0.08, 0.08, 1), M4(cx, wallH + h - 0.03, cz));
    flag(add, M, cx + rx - 0.2, wallH + h + 0.45, cz, col[0]);
  }
  // 入口：開いた垂れ幕（奥は暗い）
  const dx = b.doorAbs.x + 0.5; const ez = wide ? cz + rz + 0.01 : cz + rz * Math.sqrt(Math.max(0, 1 - Math.pow((dx - cx) / rx, 2))) + 0.01;
  add(plain('#2a1e16'), box(0.95, 1.85, 0.04, 1), M4(dx, 0.93, ez));
  for (const sx of [-1, 1]) { const f = new THREE.BufferGeometry(); f.setAttribute('position', new THREE.Float32BufferAttribute([dx + sx * 0.48, 1.95, ez + 0.03, dx + sx * 0.48, 0.0, ez + 0.03, dx + sx * 0.85, 0.0, ez + 0.05], 3)); f.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0], 2)); f.computeVertexNormals(); add(cloth, f, null); }
  add(pole, box(1.2, 0.08, 0.08, 1), M4(dx, 1.98, ez + 0.03));
  out.lights.push({ pos: new THREE.Vector3(dx, 1.7, ez + 0.4), color: 0xffb05a, power: 0.8 });
  out.props.push({ id: 'wall_lantern', m: M4(dx + 0.75, 1.8, ez + 0.02, Math.PI) });
  plate(out, b.name, dx, 2.25, ez + 0.06, 0);
  return out;
}
function flag(add, M, x, y, z, c) { add(M.get('timber'), new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5).translate(x, y + 0.3, z), null); const f = new THREE.PlaneGeometry(0.6, 0.32); f.translate(x + 0.31, y + 0.55, z); add(plain(c, { std: { roughness: 0.95, side: THREE.DoubleSide } }), f, null); }

function stall(b, ctx) {
  const { add, M, out } = ctx; const x0 = b.x + 0.08, x1 = b.x + b.w - 0.08, zb = b.y + 0.1, zf = b.y + b.h - 0.08; const cx = (x0 + x1) / 2; const col = TYPE_COL[b.type] || TYPE_COL.item;
  const timber = M.get('timber'), planks = M.get('planks'); const cloth = stripeMat(col[0], col[1], Math.max(6, b.w * 3));
  // 柱と梁・日よけ：日よけは奥の段からカウンターの途中まで（手前へ出さない＝上から見下ろすカメラで店主が隠れない。カメラの角度 56 度まで）
  const hb = 3.0, hf = 2.72, zF = b.y + b.h - 0.65; for (const [px, pz, h] of [[x0 + 0.06, zb + 0.06, hb], [x1 - 0.06, zb + 0.06, hb], [x0 + 0.06, zF, hf], [x1 - 0.06, zF, hf]]) add(timber, box(0.12, h, 0.12, 1), M4(px, h / 2, pz));
  add(timber, box(x1 - x0, 0.1, 0.1, 1), M4(cx, hb - 0.05, zb + 0.06)); add(timber, box(x1 - x0, 0.1, 0.1, 1), M4(cx, hf - 0.05, zF));
  const run = zF - zb, drop = hb - hf; const L = Math.hypot(run, drop); const aw = new THREE.PlaneGeometry(x1 - x0 + 0.3, L + 0.1, 1, 1); aw.rotateX(-Math.PI / 2 + Math.atan2(drop, run)); aw.translate(cx, (hb + hf) / 2 + 0.06, (zb + zF) / 2); add(cloth, aw, null);
  for (let i = 0; i < Math.round((x1 - x0) * 3); i++) { const g = new THREE.ConeGeometry(0.07, 0.2, 4); g.rotateX(Math.PI); g.translate(x0 + (i + 0.5) / 3, hf - 0.06, zF + 0.04); add(M.tinted('plaster', col[0]), g, null); }
  // 奥の板壁（店主の後ろ・低め）
  add(planks, box(x1 - x0, 1.3, 0.08, 1), M4(cx, 0.65, zb + 0.05));
  // カウンター（手前の段）
  const cz = b.y + b.h - 0.5; add(planks, box(x1 - x0 - 0.06, 0.92, 0.72, 1.2), M4(cx, 0.46, cz)); add(M.tinted('planks', '#b88a5a'), box(x1 - x0 + 0.04, 0.06, 0.82, 1), M4(cx, 0.95, cz));
  add(plain(col[0], { std: { roughness: 0.95 } }), box(x1 - x0 - 0.02, 0.38, 0.03, 1), M4(cx, 0.7, cz + 0.37));
  goods(b, ctx, x0, x1, zb, cz);
  plate(out, b.name, cx, hf + 0.3, zF + 0.1, 0);
  out.lights.push({ pos: new THREE.Vector3(cx, 2.2, cz), color: 0xffc070, power: 0.7 });
  return out;
}
// 露店の品物（カウンターの上・奥の棚。店主のマスの上は空ける）
function goods(b, ctx, x0, x1, zb, cz) {
  const { add, M, out } = ctx; const top = 0.98; const n = Math.max(2, Math.round((x1 - x0) / 0.5));
  const bread = M.tinted('plaster', '#c98a42'), crust = M.tinted('plaster', '#a8642a'), basket = M.tinted('planks', '#a87a46'), iron = M.get('iron'), steel = plain('#c8ccd2', { std: { roughness: 0.3, metalness: 0.7 } }), leather = M.tinted('plaster', '#7a4a2a');
  const kx = b.keeper76 ? b.x + b.keeper76.x + 0.5 : -99;
  if (b.type === 'bakery') {
    for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * (x1 - x0) / n; add(basket, new THREE.CylinderGeometry(0.2, 0.16, 0.12, 10).translate(x, top + 0.06, cz), null);
      for (let k = 0; k < 3; k++) { const g = new THREE.SphereGeometry(0.09 + (k % 2) * 0.02, 10, 8); g.scale(i % 2 ? 1.0 : 1.6, 0.7, 1.0); g.translate(x + (k - 1) * 0.1, top + 0.17, cz + ((k % 2) - 0.5) * 0.08); add(k % 2 ? crust : bread, g, null); } }
    for (const sx of [x0 + 0.35, x1 - 0.35]) { if (Math.abs(sx - kx) < 0.6) continue; for (let k = 0; k < 4; k++) { const g = new THREE.CapsuleGeometry(0.05, 0.5, 3, 6); g.rotateZ(0.25); g.translate(sx + (k - 1.5) * 0.08, 1.0, zb + 0.22); add(bread, g, null); } add(basket, box(0.5, 0.5, 0.36, 1), M4(sx, 0.25, zb + 0.24)); }
  } else if (b.type === 'weapon') {
    for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * (x1 - x0) / n; const R = M4(x, top + 0.03, cz, 0.3 + i * 0.4); add(steel, box(0.06, 0.02, 0.62, 1), R); add(iron, box(0.24, 0.04, 0.05, 1), R.clone().multiply(M4(0, 0.01, 0.3))); add(leather, box(0.05, 0.05, 0.18, 1), R.clone().multiply(M4(0, 0.01, 0.42))); }
    for (const sx of [x0 + 0.3, x1 - 0.3]) { if (Math.abs(sx - kx) < 0.6) continue; add(M.get('timber'), box(0.6, 0.08, 0.2, 1), M4(sx, 0.4, zb + 0.22)); for (let k = 0; k < 4; k++) { add(steel, box(0.05, 1.0, 0.02, 1), M4(sx - 0.22 + k * 0.15, 0.95, zb + 0.22)); add(iron, box(0.16, 0.04, 0.04, 1), M4(sx - 0.22 + k * 0.15, 1.42, zb + 0.22)); } }
    shieldOn(add, M, x0 + 0.06, 1.85, zb + 0.06, col2(b), 0); shieldOn(add, M, x1 - 0.06, 1.85, zb + 0.06, '#c9a24a', 0);
  } else if (b.type === 'armor') {
    for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * (x1 - x0) / n; const h = new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6); h.translate(x, top + 0.02, cz); add(i % 2 ? steel : M.tinted('plaster', '#c9a24a'), h, null); }
    for (const sx of [x0 + 0.35, x1 - 0.35]) { if (Math.abs(sx - kx) < 0.6) continue; armorStand(add, M, sx, zb + 0.3, steel, iron); }
    shieldOn(add, M, x0 + 0.06, 1.9, zb + 0.06, '#2e5a9a', 0); shieldOn(add, M, x1 - 0.06, 1.9, zb + 0.06, '#a8302a', 0);
  }
  out.props.push({ id: 'crate', m: M4(x1 - 0.3, 0, zb + 0.3, 0.2, 0, 0, 0.7) });
}
const col2 = (b) => (TYPE_COL[b.type] || TYPE_COL.item)[0];
// 盾（丸い盾＋縁＋中央の鋲）。x,y,z は壁の面
export function shieldOn(add, M, x, y, z, color, ry) { const R = M4(x, y, z, ry || 0); const g = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 16); g.rotateX(Math.PI / 2); add(M.tinted('plaster', color), g, R.clone().multiply(M4(0, 0, 0.05))); const r = new THREE.TorusGeometry(0.26, 0.03, 5, 16); add(M.get('iron'), r, R.clone().multiply(M4(0, 0, 0.08))); add(M.get('gold'), new THREE.SphereGeometry(0.06, 8, 6), R.clone().multiply(M4(0, 0, 0.09))); }
// 鎧の飾り台（木の台・胴・肩・兜）
export function armorStand(add, M, x, z, steel, iron) { const tm = M.get('timber'); add(tm, box(0.4, 0.08, 0.4, 1), M4(x, 0.04, z)); add(tm, box(0.06, 1.0, 0.06, 1), M4(x, 0.55, z)); const t = new THREE.CylinderGeometry(0.2, 0.16, 0.55, 10); t.scale(1, 1, 0.7); t.translate(x, 1.25, z); add(steel, t, null); for (const sx of [-1, 1]) add(steel, new THREE.SphereGeometry(0.1, 8, 6).translate(x + sx * 0.22, 1.47, z), null); add(steel, new THREE.SphereGeometry(0.13, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65).translate(x, 1.7, z), null); add(iron, box(0.3, 0.05, 0.22, 1), M4(x, 1.02, z)); }

/* ---------- 入口 ---------- */
// b：建物（GameMap の建物）、o：{ bb, rnd, batch, design, theme }、R：町の地域の作り方（town_kit の REGION_STYLE）、st：townStyle（壁・屋根の色）
export function buildVariant76(b, o, R, st, region) {
  const M = o.bb.mats; const batch = o.batch;
  const side = b.doorSide === 'left' || b.doorSide === 'right';
  // 横の入口：横を正面にした仮の建物を作り、回して置く
  let bv = b, Rm = null;
  if (side) {
    const cx = b.x + b.w / 2, cz = b.y + b.h / 2; const right = b.doorSide === 'right'; const dY = (b.doorY !== undefined ? b.doorY : b.h - 1);
    const vx = cx - b.h / 2, vy = cz - b.w / 2; const doorX = right ? b.h - 1 - dY : dY;
    bv = Object.assign({}, b, { x: vx, y: vy, w: b.h, h: b.w, doorX, doorSide: undefined }); bv.doorAbs = { x: vx + doorX, y: vy + b.w - 1 };
    Rm = new THREE.Matrix4().makeTranslation(cx, 0, cz).multiply(new THREE.Matrix4().makeRotationY(right ? Math.PI / 2 : -Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(-cx, 0, -cz));
  }
  const out = { group: new THREE.Group(), lights: [], smokes: [], props: [] }; out.group.name = 'building76_' + (b.id || b.name);
  const add = Rm ? (m, g, mx) => batch.add(m, g, mx ? Rm.clone().multiply(mx) : Rm) : (m, g, mx) => batch.add(m, g, mx || undefined);
  const ctx = { add, M, out, R, st: st || {}, desert: region === 'desert' };
  const shape = b.shape76;
  if (shape === 'round') roundHouse(bv, ctx); else if (shape === 'observatory81') observatory81(bv, ctx); else if (shape === 'octa') octaHouse(bv, ctx); else if (shape === 'tent') tent(bv, ctx); else if (shape === 'stall') stall(bv, ctx);
  else if (side || (o.sample76 && SHOPFRONT[b.type])) { return o.bb.build(bv, o.rnd, { batch: { add, build: () => { } }, design: o.design, theme: o.theme, style: st }).then((r) => { if (o.sample76) shopFront(bv, Object.assign({}, ctx, { out: r })); return finish(r, Rm); }); }
  else return null;
  if (o.sample76 && shape !== 'stall') shopFront(bv, ctx);
  return Promise.resolve(finish(out, Rm));
}
// 店先の小物（見本の町の武器屋・防具屋・酒場）：建物の足元の手前の帯（通れないマスの中）に置く。体の高さより上に出る形はない
const SHOPFRONT = { weapon: 1, armor: 1, tavern: 1 };
function shopFront(b, ctx) {
  if (!SHOPFRONT[b.type]) return; const { add, M } = ctx; const z = b.y + b.h - 0.33; const dx = b.doorAbs.x + 0.5; const xl = b.x + 0.6, xr = b.x + b.w - 0.6;
  const spots = [dx + 1.75, dx - 1.75, dx + 2.6, dx - 2.6].filter((x) => x > xl && x < xr);
  const steel = plain('#c8ccd2', { std: { roughness: 0.3, metalness: 0.7 } }), iron = M.get('iron'), wood = M.get('timber');
  if (b.type === 'weapon') {
    if (spots[0] !== undefined) { const x = spots[0]; add(wood, new THREE.CylinderGeometry(0.22, 0.25, 0.42, 10).translate(x, 0.21, z), null); add(iron, box(0.24, 0.18, 0.18, 1), M4(x, 0.51, z)); add(iron, box(0.52, 0.13, 0.2, 1), M4(x, 0.66, z)); const h = new THREE.ConeGeometry(0.07, 0.26, 8); h.rotateZ(Math.PI / 2); h.translate(x + 0.38, 0.68, z); add(iron, h, null); }
    if (spots[1] !== undefined) { const x = spots[1]; add(wood, new THREE.CylinderGeometry(0.26, 0.26, 0.62, 12).translate(x, 0.31, z), null); for (let k = 0; k < 4; k++) { const R = M4(x + (k - 1.5) * 0.09, 0.85, z + (k % 2) * 0.06 - 0.03, 0, 0, (k - 1.5) * 0.12); add(steel, box(0.05, 0.7, 0.02, 1), R); add(iron, box(0.18, 0.04, 0.04, 1), R.clone().multiply(M4(0, 0.36, 0))); } }
    for (const x of spots.slice(2)) shieldOn(add, M, x, 1.55, b.y + b.h - 0.6, '#a8302a', 0);
  } else if (b.type === 'armor') {
    if (spots[0] !== undefined) armorStand(add, M, spots[0], z, steel, iron);
    if (spots[1] !== undefined) armorStand(add, M, spots[1], z, steel, iron);
    for (const x of spots.slice(2)) shieldOn(add, M, x, 1.55, b.y + b.h - 0.6, '#2e5a9a', 0);
  } else if (b.type === 'tavern') {
    for (const x of spots.slice(0, 2)) { const g = new THREE.CylinderGeometry(0.26, 0.26, 0.56, 12); g.rotateZ(Math.PI / 2); g.translate(x, 0.3, z); add(M.tinted('planks', '#8a5a34'), g, null); for (const sx of [-0.2, 0.2]) { const t = new THREE.TorusGeometry(0.265, 0.018, 4, 12); t.rotateY(Math.PI / 2); t.translate(x + sx, 0.3, z); add(iron, t, null); } add(wood, box(0.6, 0.12, 0.3, 1), M4(x, 0.05, z)); }
  }
}
function finish(out, Rm) {
  if (!Rm) return out;
  out.group.applyMatrix4(Rm); out.lights.forEach((l) => { if (l.pos) l.pos.applyMatrix4(Rm); }); out.smokes.forEach((s) => { if (s && s.applyMatrix4) s.applyMatrix4(Rm); }); out.props.forEach((p) => { p.m = Rm.clone().multiply(p.m); });
  return out;
}
