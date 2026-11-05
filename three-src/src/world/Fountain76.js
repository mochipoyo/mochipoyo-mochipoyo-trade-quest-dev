/* =========================================================
   Fountain76（v7.6）：噴水の形。つながった噴水のマス（2×2 など）は1つの大きな噴水
   ・外の水盤（石の縁・内側の水面）・台座の柱・上の受け皿・頂の飾りと吹き上がる水・受け皿から落ちる水の幕・水面の波紋としぶき
   ・水の柱と幕は animated（MapScene3D の update で揺らす）。夜は水面がうっすら光る
   ・当たり判定・タイルは変えない（噴水のマスの中だけに作る）
   ========================================================= */
import * as THREE from 'three';

let MATS = null;
// 水の幕の筋（縦の白い筋・途切れ・透け）。繰り返して下へ流す
function streakTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.clearRect(0, 0, 64, 128);
  for (let i = 0; i < 26; i++) { const x = r() * 64, w = 1 + r() * 2.5, y = r() * 128, h = 30 + r() * 90, a = 0.25 + r() * 0.55; const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; for (const dy of [0, -128]) g.fillRect(x, y + dy, w, h); }
  g.fillStyle = 'rgba(220,240,255,0.16)'; g.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 1); return t;
}
function mats() {
  if (MATS) return MATS;
  const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(c), roughness: 0.8, metalness: 0 }, o || {}));
  MATS = {
    stone: std('#d9d3c6', { roughness: 0.75 }), stoneD: std('#a9a296', { roughness: 0.85, side: THREE.DoubleSide }), trim: std('#efe9dc', { roughness: 0.6 }), gold: std('#c9a24a', { roughness: 0.35, metalness: 0.6 }),
    water: std('#3f9ad8', { roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, emissive: new THREE.Color('#0a3a66'), emissiveIntensity: 0.35 }),
    jet: std('#d8f0ff', { roughness: 0.1, transparent: true, opacity: 0.36, emissive: new THREE.Color('#6ab4e8'), emissiveIntensity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
    foam: std('#ffffff', { roughness: 0.3, transparent: true, opacity: 0.7, depthWrite: false }),
    sheet: std('#e6f6ff', { roughness: 0.15, transparent: true, opacity: 1, map: streakTex(), emissive: new THREE.Color('#5aa8e0'), emissiveIntensity: 0.3, depthWrite: false, side: THREE.DoubleSide })   // v7.6 水の幕：縦の筋（下へ流れる）。以前は一様な半透明でガラスの筒に見えた
  };
  Object.values(MATS).forEach((m) => { m.userData.envShared = true; m.userData.keepGlow = true; });
  return MATS;
}

// map：GameMap。T(x, z)：タイル。add(material, geometry)：静かな形（まとめて描く）。group：動く形を入れる。heightAt：地面の高さ。lvY：段の高さ
export function buildFountains(o) {
  const { map, T } = o; const W = map.w, H = map.h; const seen = new Set(); const out = { count: 0, animated: [], lights: [] };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (T(x, z) !== 'fountain' || seen.has(x + ',' + z)) continue;
    // つながった噴水のマス
    const cells = []; const q = [[x, z]]; seen.add(x + ',' + z);
    while (q.length) { const [a, b] = q.pop(); cells.push([a, b]); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = a + dx, nz = b + dz, k = nx + ',' + nz; if (seen.has(k) || T(nx, nz) !== 'fountain') continue; seen.add(k); q.push([nx, nz]); } }
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; cells.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a + 1); z0 = Math.min(z0, b); z1 = Math.max(z1, b + 1); });
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const R = Math.min(x1 - x0, z1 - z0) / 2 - 0.04; const sx = (x1 - x0) / 2 - 0.04, sz = (z1 - z0) / 2 - 0.04;
    const y0 = (o.lvY ? o.lvY(Math.floor(cx), Math.floor(cz)) : 0) + (o.base || 0);
    one(o, out, cx, cz, R, sx / R, sz / R, y0); out.count++;
  }
  return out;
}

function one(o, out, cx, cz, R, kx, kz, y0) {
  const M = mats(); const add = o.add; const big = R > 0.7; const seg = big ? 32 : 20;
  const ring = (r0, r1, h, y, m, s) => { const g = new THREE.CylinderGeometry(r0, r1, h, s || seg, 1, false); g.scale(kx, 1, kz); g.translate(cx, y + h / 2, cz); add(m, g); };
  const disc = (r, y, m) => { const g = new THREE.CircleGeometry(r, seg); g.rotateX(-Math.PI / 2); g.scale(kx, 1, kz); g.translate(cx, y, cz); add(m, g); };
  const rimH = big ? 0.5 : 0.36; const rimW = big ? 0.2 : 0.12;
  // 外の水盤：外の縁（2段の石）・縁の上の笠石・内側の水面
  ring(R, R + 0.04, 0.12, y0, M.stoneD);
  const wall = new THREE.CylinderGeometry(R, R, rimH, seg, 1, true); wall.scale(kx, 1, kz); wall.translate(cx, y0 + rimH / 2, cz); add(M.stone, wall);
  const inner = new THREE.CylinderGeometry(R - rimW, R - rimW, rimH - 0.08, seg, 1, true); inner.scale(-kx, 1, -kz); inner.translate(cx, y0 + (rimH - 0.08) / 2, cz); add(M.stoneD, inner);   // 内側の面（裏返し）
  const cap = new THREE.RingGeometry(R - rimW - 0.02, R + 0.03, seg, 1); cap.rotateX(-Math.PI / 2); cap.scale(kx, 1, kz); cap.translate(cx, y0 + rimH, cz); add(M.trim, cap);
  disc(R - rimW, y0 + 0.06, M.stoneD); disc(R - rimW, y0 + rimH - 0.14, M.water);
  // 台座の柱・受け皿（大きい噴水は2段）・頂の飾り
  const ph = big ? 1.15 : 0.62; const pr = big ? 0.2 : 0.09; const tiers = big ? 2 : 1;
  ring(pr * 1.3, pr * 1.6, 0.18, y0 + rimH - 0.14, M.stone, 12);
  const col = new THREE.CylinderGeometry(pr, pr * 1.15, ph, 12); col.translate(cx, y0 + rimH + ph / 2 - 0.1, cz); add(M.stone, col);
  let yb = y0 + rimH + ph - 0.1; let br = big ? R * 0.55 : R * 0.55; const jets = [];
  for (let i = 0; i < tiers; i++) {
    const bowl = new THREE.CylinderGeometry(br, br * 0.35, br * 0.42, seg, 1, false); bowl.translate(cx, yb + br * 0.21, cz); add(M.stone, bowl);
    const lip = new THREE.TorusGeometry(br, 0.035, 5, seg); lip.rotateX(Math.PI / 2); lip.translate(cx, yb + br * 0.42, cz); add(M.trim, lip);
    disc(br - 0.03, yb + br * 0.4, M.water);
    // 受け皿の縁から落ちる水の幕（下の水面まで）
    const fallTop = yb + br * 0.42, fallBot = i === 0 ? y0 + rimH - 0.12 : yb - 0.55 + 0.1; const fh = fallTop - fallBot;
    const sheet = new THREE.Mesh(new THREE.CylinderGeometry(br + 0.02, br + 0.12, fh, seg, 4, true), M.sheet); sheet.position.set(cx, fallBot + fh / 2, cz); sheet.renderOrder = 2; o.group.add(sheet);
    out.animated.push({ kind: 'fountainSheet', obj: sheet, ph: Math.random() * 6 });
    const foam = new THREE.Mesh(new THREE.RingGeometry(br + 0.04, br + 0.2, seg), M.foam); foam.rotation.x = -Math.PI / 2; foam.position.set(cx, fallBot + 0.012, cz); o.group.add(foam); out.animated.push({ kind: 'fountainFoam', obj: foam, ph: Math.random() * 6 });
    if (i < tiers - 1) { const c2 = new THREE.CylinderGeometry(pr * 0.7, pr * 0.8, 0.55, 10); c2.translate(cx, yb + br * 0.42 + 0.27, cz); add(M.stone, c2); yb += br * 0.42 + 0.55; br *= 0.6; }
    else yb += br * 0.42;
  }
  // 頂：小さな玉と吹き上がる水
  add(M.gold, new THREE.SphereGeometry(big ? 0.1 : 0.06, 10, 8).translate(cx, yb + 0.06, cz));
  const jh = big ? 0.75 : 0.42; const jet = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.09 : 0.05, jh, 8, 1, true), M.jet); jet.rotation.x = Math.PI; jet.position.set(cx, yb + 0.1 + jh / 2, cz); o.group.add(jet); out.animated.push({ kind: 'fountainJet', obj: jet, base: jet.position.y, h: jh, ph: Math.random() * 6 });
  const crown = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.18 : 0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.jet); crown.position.set(cx, yb + 0.1 + jh, cz); crown.rotation.x = Math.PI; o.group.add(crown); out.animated.push({ kind: 'fountainJet', obj: crown, base: crown.position.y, h: 0.1, ph: 0 });
  // 外の水盤の4方の小さな吹き出し（大きい噴水だけ）
  if (big) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const px = cx + Math.cos(a) * (R - rimW) * kx * 0.98, pz = cz + Math.sin(a) * (R - rimW) * kz * 0.98;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 4, 10, Math.PI * 0.8), M.jet); arc.position.set(px - Math.cos(a) * 0.28, y0 + rimH - 0.08, pz - Math.sin(a) * 0.28); arc.rotation.y = -a; o.group.add(arc); out.animated.push({ kind: 'fountainArc', obj: arc, ph: k }); }
  out.lights.push({ pos: new THREE.Vector3(cx, y0 + 0.6, cz), color: 0x9fd4ff, power: big ? 0.7 : 0.4, dist: 5 });
}

// MapScene3D の update から呼ぶ（水の柱・幕・泡・弧を揺らす）
export function animateFountain(a, t) {
  if (a.kind === 'fountainJet') { const k = 1 + Math.sin(t * 9 + a.ph) * 0.06 + Math.sin(t * 15.3 + a.ph) * 0.04; a.obj.scale.set(1 / k, k, 1 / k); a.obj.position.y = a.base + (k - 1) * a.h * 0.5; return true; }
  if (a.kind === 'fountainSheet') { a.obj.scale.set(1 + Math.sin(t * 6 + a.ph) * 0.015, 1, 1 + Math.cos(t * 6 + a.ph) * 0.015); const mp = a.obj.material.map; if (mp) mp.offset.y = (t * 0.9) % 1; return true; }   // 筋を下へ流す
  if (a.kind === 'fountainFoam') { const k = 1 + Math.sin(t * 3 + a.ph) * 0.06; a.obj.scale.set(k, k, 1); a.obj.rotation.z = t * 0.3; return true; }
  if (a.kind === 'fountainArc') { a.obj.scale.setScalar(1 + Math.sin(t * 7 + a.ph) * 0.05); return true; }
  return false;
}
