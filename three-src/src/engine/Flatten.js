/* =========================================================
   Flatten：描画回数を減らすための結合
   ・Blender で作ったモデルは部品ごとに色（マテリアル）が分かれていて、そのままだと部品の数だけ描画が増える
   ・色を頂点カラーへ移し、「つや消し／金属／発光」の3種類だけにまとめる（見た目の色は同じ。部品ごとの粗さの差は平均化）
   ・キャラクターは同じ骨格の SkinnedMesh を1つに結合する（骨・アニメーションはそのまま）
   ========================================================= */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addCutout } from './Cutout.js';

const SHARED = {};
export function sharedMaterial(kind, src) {
  if (kind === 'glow') {
    const k = 'glow_' + src.emissive.getHexString() + '_' + (src.emissiveIntensity || 1).toFixed(2);
    if (!SHARED[k]) { SHARED[k] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0, emissive: src.emissive.clone(), emissiveIntensity: src.emissiveIntensity || 1 }); SHARED[k].name = k; SHARED[k].userData.glow = true; addCutout(SHARED[k]); }
    return SHARED[k];
  }
  if (!SHARED[kind]) { SHARED[kind] = kind === 'metal' ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.75 }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }); SHARED[kind].name = 'flat_' + kind; addCutout(SHARED[kind]); }
  return SHARED[kind];
}
function category(m) {
  if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.02 && m.emissiveIntensity > 0) return 'glow';
  if ((m.metalness || 0) > 0.5) return 'metal';
  return 'matte';
}
// geometry（任意の属性）→ 位置・法線・色(・骨) だけの非インデックス形状。色は material.color × 頂点カラー
function prep(geo, mat, matrix, keepSkin) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (matrix) g.applyMatrix4(matrix);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count; const col = new Float32Array(n * 3); const src = g.attributes.color; const c = mat.color || new THREE.Color(1, 1, 1);
  for (let i = 0; i < n; i++) { let r = c.r, gg = c.g, b = c.b; if (src && mat.vertexColors) { r *= src.getX(i); gg *= src.getY(i); b *= src.getZ(i); } col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b; }
  const keep = keepSkin ? ['position', 'normal', 'skinIndex', 'skinWeight'] : ['position', 'normal'];
  for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (keepSkin && g.attributes.skinIndex && !(g.attributes.skinIndex.array instanceof Uint16Array)) { const a = g.attributes.skinIndex; const u = new Uint16Array(a.count * 4); for (let i = 0; i < a.count; i++) { u[i * 4] = a.getX(i); u[i * 4 + 1] = a.getY(i); u[i * 4 + 2] = a.getZ(i); u[i * 4 + 3] = a.getW(i); } g.setAttribute('skinIndex', new THREE.BufferAttribute(u, 4)); }
  if (keepSkin && g.attributes.skinWeight && !(g.attributes.skinWeight.array instanceof Float32Array)) { const a = g.attributes.skinWeight; const f = new Float32Array(a.count * 4); for (let i = 0; i < a.count; i++) { f[i * 4] = a.getX(i); f[i * 4 + 1] = a.getY(i); f[i * 4 + 2] = a.getZ(i); f[i * 4 + 3] = a.getW(i); } g.setAttribute('skinWeight', new THREE.BufferAttribute(f, 4)); }
  g.morphAttributes = {};
  return g;
}

// 静的モデル → [{ geometry, material }]（行列はモデル原点基準で焼き込み済み）
export function flattenStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(); const m = new THREE.Matrix4();
  const groups = {}; const glowSrc = {};
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    m.multiplyMatrices(inv, o.matrixWorld);
    const mat = mats[0]; const cat = category(mat); const key = cat === 'glow' ? 'glow_' + mat.emissive.getHexString() : cat; (groups[key] = groups[key] || []).push(prep(o.geometry, mat, m)); glowSrc[key] = mat;
  });
  const out = [];
  for (const key of Object.keys(groups)) {
    const geo = mergeGeometries(groups[key], false); if (!geo) continue; geo.computeBoundingSphere(); geo.computeBoundingBox();
    out.push({ geometry: geo, material: sharedMaterial(key.startsWith('glow') ? 'glow' : key, glowSrc[key]), kind: key });
  }
  return out;
}

// キャラクターの雛形（gltf.scene）を結合：同じ骨格の SkinnedMesh → 1つ、骨に付いた小物（剣・盾）→ 親ごとに1つ
export function flattenCharacter(scene) {
  scene.updateMatrixWorld(true);
  const skinned = []; const rigid = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); else if (o.isMesh) rigid.push(o); });
  if (skinned.length) {
    const skeleton = skinned[0].skeleton;
    if (skinned.every((s) => s.skeleton === skeleton)) {
      const cats = {}; const src = {};
      for (const s of skinned) { const mat = Array.isArray(s.material) ? s.material[0] : s.material; const k = category(mat); (cats[k] = cats[k] || []).push(prep(s.geometry, mat, s.bindMatrix, true)); src[k] = mat; }
      const order = Object.keys(cats); const geo = mergeGeometries(order.map((k) => mergeGeometries(cats[k], false)), true);
      if (geo) {
        const mats = order.map((k) => sharedMaterial(k, src[k]));
        const mesh = new THREE.SkinnedMesh(geo, mats.length === 1 ? mats[0] : mats); mesh.name = 'body_merged';
        const parent = skinned[0].parent; parent.add(mesh); mesh.position.set(0, 0, 0); mesh.quaternion.identity(); mesh.scale.set(1, 1, 1);
        mesh.bind(skeleton, new THREE.Matrix4());
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
        skinned.forEach((s) => s.parent && s.parent.remove(s));
      }
    }
  }
  // 骨に付いた小物：親ごとにまとめる
  const byParent = new Map(); rigid.forEach((o) => { if (!byParent.has(o.parent)) byParent.set(o.parent, []); byParent.get(o.parent).push(o); });
  for (const [parent, list] of byParent) {
    if (!parent || list.length < 1) continue;
    const cats = {}; const src = {};
    for (const o of list) { const mat = Array.isArray(o.material) ? o.material[0] : o.material; const k = category(mat); o.updateMatrix(); (cats[k] = cats[k] || []).push(prep(o.geometry, mat, o.matrix)); src[k] = mat; }
    const order = Object.keys(cats); const geo = mergeGeometries(order.map((k) => mergeGeometries(cats[k], false)), true); if (!geo) continue;
    const mats = order.map((k) => sharedMaterial(k, src[k])); const mesh = new THREE.Mesh(geo, mats.length === 1 ? mats[0] : mats); mesh.name = 'rigid_merged'; mesh.castShadow = true;
    list.forEach((o) => parent.remove(o)); parent.add(mesh);
  }
  return scene;
}
