/* =========================================================
   EnvKit3D：レシピ（マップごとの作り直し）で使う共通の道具
   ・kit(ctx, id, list)：パックの部品（GLB。EnvironmentCatalog が読む）を、同じ部品ごとに InstancedMesh でまとめて置く
       list の要素：{ x, y, z, ry, s }（s は数か [sx, sy, sz]）。形状・材質はカタログが共有する（マップごとに捨てない）
   ・mat(ctx, name, {repeat, color, bright, emissive, roughness, metalness})：パックの材質（画像つき。読めなければ色だけの材質）。どれも Cutout（主人公の手前を抜く）つき。bright：色に掛ける倍率（暗い画像を明るい面に）
   ・geo 系：その場で作る形（この形はマップごとに捨てる＝userData.own）
   ========================================================= */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCutout } from '../engine/Cutout.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export function mat4(x, y, z, ry, s, rx, rz) { const sc = Array.isArray(s) ? s : [s || 1, s || 1, s || 1]; _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(sc[0], sc[1], sc[2])); }

// パックの部品を並べる（部品の中の各メッシュを InstancedMesh に）
export async function kit(ctx, id, list, opts) {
  opts = opts || {}; const g = new THREE.Group(); g.name = 'kit_' + id; if (!list.length) return g;
  const proto = await ctx.catalog.model(id); proto.updateMatrixWorld(true);
  const meshes = []; proto.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const src of meshes) {
    const im = new THREE.InstancedMesh(src.geometry, src.material, list.length); im.name = id + ':' + (src.material.name || 'm');
    list.forEach((p, i) => { const M = mat4(p.x, p.y || 0, p.z, p.ry || 0, p.s, p.rx, p.rz); im.setMatrixAt(i, M.multiply(src.matrixWorld)); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = opts.shadow !== false; im.receiveShadow = true; im.userData.envShared = true;
    g.add(im);
  }
  ctx.stats.kit[id] = (ctx.stats.kit[id] || 0) + list.length;
  return g;
}

// パックの材質（画像つき）。repeat：1枚の画像を何マスで1回にするか
const matCache = new Map();
export async function mat(ctx, name, o) {
  o = o || {}; const key = name + '|' + (o.color || '') + '|' + (o.repeat || '') + '|' + (o.emissive || '') + '|' + (o.bright || '') + '|' + (o.vertexColors ? 'vc' : '');
  if (matCache.has(key)) return matCache.get(key);
  let base = null; try { base = await ctx.catalog.material(name); } catch (e) { base = null; ctx.stats.matErrors.push(name + '：' + (e && e.message)); }
  const m = base ? base.clone() : new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.9 });
  if (base && base.map && o.repeat) { m.map = base.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(1 / o.repeat, 1 / o.repeat); m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; }
  if (o.color) m.color = new THREE.Color(o.color);
  if (o.bright) m.color.multiplyScalar(o.bright);
  if (o.vertexColors) m.vertexColors = true;   // 形の頂点色で明るさを変える（床の擦り減りなど）   // 暗い画像を明るい色の面に使う（色の値は1を超えてよい）
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity || 0.6; }
  if (o.roughness !== undefined) m.roughness = o.roughness; if (o.metalness !== undefined) m.metalness = o.metalness;
  m.name = 'env_' + key; addCutout(m); m.userData.envShared = true; matCache.set(key, m); return m;
}
// 色だけの材質（画像なし。マップをまたいで使い回す）
const plainCache = new Map();
export function plain(color, o) {
  o = o || {}; const key = color + '|' + JSON.stringify(o); if (plainCache.has(key)) return plainCache.get(key);
  const m = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.85, metalness: 0 }, o.std || {}));
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei || 0.8; }
  if (o.transparent) { m.transparent = true; m.opacity = o.opacity || 0.5; m.depthWrite = false; }
  if (o.window) m.userData.window = true; if (o.keepGlow) m.userData.keepGlow = true;
  if (!o.noCutout) addCutout(m); m.name = 'envplain_' + key; m.userData.envShared = true; plainCache.set(key, m); return m;
}

// 形を材質ごとに集めて結合（マップごとの形。破棄はマップの dispose）
export class Merge {
  constructor() { this.lists = new Map(); }
  add(material, geometry, matrix) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(); if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.lists.has(material)) this.lists.set(material, []); this.lists.get(material).push(g); return this;
  }
  build(group, opts) {
    opts = opts || {};
    for (const [m, list] of this.lists) {
      const withColor = list.some((g) => g.attributes.color);
      list.forEach((g) => { if (withColor && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); if (!withColor && g.attributes.color) g.deleteAttribute('color'); });
      const merged = mergeGeometries(list, false); if (!merged) continue; merged.computeBoundingSphere(); merged.userData.own = true;
      const mesh = new THREE.Mesh(merged, m); mesh.castShadow = opts.shadow !== false; mesh.receiveShadow = true; if (opts.name) mesh.name = opts.name; group.add(mesh);
    }
    this.lists.clear(); return group;
  }
}
// 世界座標に合わせた UV（画像を引き伸ばさない）。s マスで画像1回
export function worldUV(g, s) {
  s = s || 3; const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv; if (!u || !n) return g;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay > ax && ay > az) u.setXY(i, p.getX(i) / s, p.getZ(i) / s); else if (ax > az) u.setXY(i, p.getZ(i) / s, p.getY(i) / s); else u.setXY(i, p.getX(i) / s, p.getY(i) / s); }
  u.needsUpdate = true; return g;
}
export function boxG(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
// 乱数（マップごとに同じ結果）
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }
// 色を頂点色で少し揺らす（同じ色の面が続かないように）
export function tintVerts(g, base, jitter, r) {
  const c = new THREE.Color(base); const p = g.attributes.position; const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = 1 + (r() - 0.5) * jitter; col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export function ctxStats() { return { kit: {}, matErrors: [], meshes: 0 }; }
