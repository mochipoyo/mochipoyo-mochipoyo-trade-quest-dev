/* =========================================================
   レシピの共通の形の道具（世界座標で作る）・キャンバスの画像・材質
   ・wbox/rbox/cyl：箱・回した箱・円柱（その場所に置いた形）。wbox は世界座標の UV（画像を引き伸ばさない）
   ・chamferPrism：角を切った角柱／hexPrism：六角柱（平らな面が南北）
   ・canvasTex/texMat：キャンバスで描いた画像と、その材質（アプリに1つ。マップごとには捨てない）
   ・frameOf：建物の足元（2D版の建物のマス）から、壁の外形・扉の位置
   ・floorQuads：1マス1枚の床（[x, z, y] の一覧。su・sv：UV の倍率。col があれば頂点色）
   ========================================================= */
import * as THREE from 'three';
import { worldUV } from '../EnvKit3D.js';
import { addCutout } from '../../engine/Cutout.js';
import { textTexture } from '../../engine/Materials.js';
import { rng } from '../EnvKit3D.js';

const TX = {};
export function canvasTex(key, w, h, draw) {
  if (TX[key]) return TX[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; TX[key] = t; return t;
}
export function shade(hex, k) { const c = new THREE.Color(hex).multiplyScalar(k); return '#' + c.getHexString(); }
const MAT = {};
export function texMat(key, tex, o) { if (MAT[key]) return MAT[key]; const m = new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: 0.6, metalness: 0 }, o || {})); addCutout(m); m.userData.envShared = true; m.name = 'env_tex_' + key; MAT[key] = m; return m; }
export function wbox(w, h, d, x, y, z, s) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return worldUV(g, s || 2); }
export function rbox(w, h, d, x, y, z, ry, rx) { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
export function cyl(r0, r1, h, seg, x, y, z) { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y, z); return g; }
// 面取りした角柱（足元の四角 x0..x1・z0..z1、角を c 切る）
export function chamferPrism(x0, x1, z0, z1, c, y0, h) {
  const P = [[x0 + c, z0], [x1 - c, z0], [x1, z0 + c], [x1, z1 - c], [x1 - c, z1], [x0 + c, z1], [x0, z1 - c], [x0, z0 + c]];
  const s = new THREE.Shape(); s.moveTo(P[0][0], -P[0][1]); for (let i = 1; i < P.length; i++) s.lineTo(P[i][0], -P[i][1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return worldUV(g, 2);
}
// 六角柱（平らな面が南北。points は東西）
export function hexPrism(r, h, x, y, z, sz) { const g = new THREE.CylinderGeometry(r, r, h, 6); g.rotateY(Math.PI / 6); if (sz) g.scale(1, 1, sz); g.translate(x, y, z); return worldUV(g, 2); }
export function frameOf(b) { const xl = b.x + 0.18, xr = b.x + b.w - 0.18, zb = b.y + 0.2, zf = b.y + b.h - 0.62; return { xl, xr, zb, zf, W: xr - xl, D: zf - zb, cx: (xl + xr) / 2, cz: (zb + zf) / 2, doorX: b.doorAbs.x + 0.5 }; }
export function floorQuads(list, su, sv, colFn) {
  const pos = [], uv = [], nrm = [], col = [], idx = []; let v = 0;
  for (const [x, z, y] of list) {
    pos.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1); uv.push(x * su, z * sv, (x + 1) * su, z * sv, (x + 1) * su, (z + 1) * sv, x * su, (z + 1) * sv); nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    if (colFn) for (const [px, pz] of [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]]) { const c = colFn(px, pz); col.push(c, c, c); }
    idx.push(v, v + 3, v + 2, v, v + 2, v + 1); v += 4;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); if (colFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
}
export function namePlate(group, text, x, y, z, ry, style, w) {
  w = w || 1.9; const tex = textTexture(text || '', style); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.2526), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); m.geometry.userData.own = true;
  m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = false; group.add(m); return m;
}

// 石の舗装の画像（段ごとにずらす）。base：石の色・mortar：目地・cw/ch：石の幅と高さ（画素）・vari：明るさのばらつき
export function drawSetts(base, mortar, cw, ch, vari) {     return (g, w, h) => {
    const r = rng(base.length * 17 + cw); g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    for (let y = 0, row = 0; y < h; y += ch, row++) for (let x = -((row % 2) * cw) / 2; x < w; x += cw) { g.fillStyle = shade(base, 1 - vari / 2 + r() * vari); g.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3); }
  };
}
// 1マス1枚の床（四隅の高さを地面に合わせる）。list：[x, z]、hAt：地面の高さ、lift：地面からの高さ
export function floorQuadsH(list, su, sv, hAt, lift, colFn) {
  const pos = [], uv = [], nrm = [], col = [], idx = []; let v = 0; lift = lift || 0.014;
  for (const [x, z] of list) {
    for (const [px, pz] of [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]]) { pos.push(px, hAt(px, pz) + lift, pz); uv.push(px * su, pz * sv); nrm.push(0, 1, 0); if (colFn) { const c = colFn(px, pz); col.push(c, c, c); } }
    idx.push(v, v + 3, v + 2, v, v + 2, v + 1); v += 4;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); if (colFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
