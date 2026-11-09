/* =========================================================
   Materials：テクスチャの読み込みと共通マテリアル、形状の補助（ワールド単位のUV・材質ごとの結合）
   ========================================================= */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TEXTURES } from '../assets/manifest.js';
import { addCutout } from './Cutout.js';

export class Materials {
  constructor(base, renderer) {
    this.base = base || './'; this.tex = {}; this.cache = {}; this.loader = new THREE.TextureLoader();
    this.maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  }
  async preload() {
    const jobs = [];
    for (const n of TEXTURES) {
      for (const kind of ['albedo', 'normal']) {
        jobs.push(this.loader.loadAsync(this.base + 'textures/' + n + '_' + kind + '.jpg').then((t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, this.maxAniso);
          t.colorSpace = kind === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          this.tex[n + '_' + kind] = t;
        }).catch(() => { /* なくても動く（単色） */ }));
      }
    }
    await Promise.all(jobs);
  }
  // 名前つきの共通マテリアル
  get(name) {
    if (this.cache[name]) return this.cache[name];
    const T = (n) => this.tex[n + '_albedo'] || null, N = (n) => this.tex[n + '_normal'] || null;
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
    let m;
    switch (name) {
      case 'plaster': m = std({ map: T('plaster'), normalMap: N('plaster'), normalScale: new THREE.Vector2(0.6, 0.6), color: 0xfff6e6, roughness: 0.95 }); break;
      case 'timber': m = std({ map: T('timber'), normalMap: N('timber'), color: 0xd8c8b8, roughness: 0.85 }); break;
      case 'planks': m = std({ map: T('planks'), normalMap: N('planks'), roughness: 0.8 }); break;
      case 'door': m = std({ map: T('planks'), normalMap: N('planks'), color: 0xb08868, roughness: 0.75 }); break;
      case 'shingles': m = std({ map: T('shingles'), normalMap: N('shingles'), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.85 }); break;
      case 'stonewall': m = std({ map: T('stonewall'), normalMap: N('stonewall'), roughness: 0.95 }); break;
      case 'cobble': m = std({ map: T('cobble'), normalMap: N('cobble'), roughness: 0.9 }); break;
      case 'carpet': m = std({ map: T('carpet'), normalMap: N('carpet'), roughness: 1.0 }); break;
      case 'iron': m = std({ color: 0x3a3a42, roughness: 0.5, metalness: 0.75 }); break;
      case 'gold': m = std({ color: 0xd8b04a, roughness: 0.35, metalness: 0.85 }); break;
      case 'glass': m = std({ color: 0x40382a, emissive: 0xffb04a, emissiveIntensity: 0.25, roughness: 0.2 }); m.userData.window = true; break;
      case 'glassCold': m = std({ color: 0x8fb8d8, emissive: 0x1a2a3a, emissiveIntensity: 0.2, roughness: 0.15, metalness: 0.2 }); break;
      case 'soil': m = std({ color: 0x4a3222 }); break;
      case 'ridge': m = std({ color: 0x5a3a2a, roughness: 0.8 }); break;
      case 'shutterRed': m = std({ map: T('planks'), color: 0xa84a3a }); break;
      case 'shutterGreen': m = std({ map: T('planks'), color: 0x4a7a4a }); break;
      case 'shutterBlue': m = std({ map: T('planks'), color: 0x4a6a9a }); break;
      case 'cloth': m = std({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 }); break;
      default: m = std({ color: 0xff00ff });
    }
    m.name = name; addCutout(m); this.cache[name] = m; return m;
  }
  // 屋根の色ごとのマテリアル
  roof(hex) { const k = 'roof_' + hex; if (!this.cache[k]) { const m = this.get('shingles').clone(); m.color = new THREE.Color(hex); m.name = k; m.userData = {}; addCutout(m); this.cache[k] = m; } return this.cache[k]; }
  tinted(base, hex) { const k = base + '_' + hex; if (!this.cache[k]) { const m = this.get(base).clone(); m.color = new THREE.Color(hex); m.name = k; m.userData = Object.assign({}, m.userData, { cutout: false }); addCutout(m); this.cache[k] = m; } return this.cache[k]; }
}

/* ---------- 形状の補助 ---------- */
// 箱：UV をワールド単位（uvScale 単位で1回くり返す）に
export function box(w, h, d, uvScale) {
  const g = new THREE.BoxGeometry(w, h, d);
  const s = uvScale || 1; const uv = g.attributes.uv; const n = g.attributes.normal; const p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const x = p.getX(i) + w / 2, y = p.getY(i) + h / 2, z = p.getZ(i) + d / 2;
    if (nx > 0.5) uv.setXY(i, z / s, y / s); else if (ny > 0.5) uv.setXY(i, x / s, z / s); else uv.setXY(i, x / s, y / s);
  }
  return g;
}
// v7.6 角の丸い箱（人形・ジオラマ風のやわらかい角）。UV は box と同じくワールド単位（面の向きで投影）
export function rbox(w, h, d, uvScale, r) {
  const rr = Math.min(r || 0.1, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001); if (rr <= 0.005) return box(w, h, d, uvScale);
  const g = new RoundedBoxGeometry(w, h, d, 2, rr);
  const s = uvScale || 1; const uv = g.attributes.uv; const n = g.attributes.normal; const p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const x = p.getX(i) + w / 2, y = p.getY(i) + h / 2, z = p.getZ(i) + d / 2;
    if (nx >= ny && nx >= nz) uv.setXY(i, z / s, y / s); else if (ny >= nz) uv.setXY(i, x / s, z / s); else uv.setXY(i, x / s, y / s);
  }
  return g;
}
// 材質ごとに形状を集めて、最後に1メッシュへ結合（描画回数を減らす）
function copyAttrs89(src) {
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv', 'color']) { const a = src.attributes[k]; if (a) g.setAttribute(k, a.clone()); }
  return g;
}
export class Batch {
  constructor() { this.lists = new Map(); }
  add(material, geometry, matrix) {
    // v8.9 索引のない形は、使う属性（位置・法線・UV・色）だけを写す。以前の geometry.clone() は、多面体（PolyhedronGeometry）などで
    //   写すたびに同じ種類の既定の形をもう 1 つ作ってから中身を上書きしていて、飾りの多い地図の組み立てが長く止まる原因の 1 つだった（できる形は同じ）
    //   使い回しの形（userData.shared89：DecorBuilder3D の geo89）は、索引をほどいた形も 1 回だけ作って使い回す
    let g;
    if (!geometry.index) g = copyAttrs89(geometry);
    else if (geometry.userData && geometry.userData.shared89) g = copyAttrs89(geometry.userData.ni89 || (geometry.userData.ni89 = geometry.toNonIndexed()));
    else g = geometry.toNonIndexed();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.lists.has(material)) this.lists.set(material, []);
    this.lists.get(material).push(g);
  }
  build(group, opts) {
    opts = opts || {};
    for (const [mat, list] of this.lists) {
      const withColor = list.some((g) => g.attributes.color);
      if (withColor) list.forEach((g) => { if (!g.attributes.color) { const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); } });
      else list.forEach((g) => { if (g.attributes.color) g.deleteAttribute('color'); });
      const merged = mergeGeometries(list, false); if (!merged) continue;
      merged.computeBoundingSphere(); merged.userData.own = true;
      const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = opts.castShadow !== false && !(mat.userData && mat.userData.noShadow); mesh.receiveShadow = !(mat.userData && mat.userData.noReceive);   // v7.6 noShadow：影を落とさない（地面の汚れ・光のにじみ）／noReceive：影を受けない（光のにじみ）
      group.add(mesh);
    }
    this.lists.clear();
  }
}
export const M4 = (x, y, z, ry, rx, rz, sx, sy, sz) => {
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ'));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz)); return m;
};
// 文字の看板（施設名）
export function textTexture(text, opts) {
  opts = opts || {};
  const c = document.createElement('canvas'); const W = opts.w || 512, H = opts.h || 128; c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = opts.bg || '#3a2210'; g.fillRect(0, 0, W, H);
  g.fillStyle = opts.panel || '#f0e2c0'; g.fillRect(10, 10, W - 20, H - 20);
  g.strokeStyle = '#8a5a30'; g.lineWidth = 4; g.strokeRect(16, 16, W - 32, H - 32);
  g.fillStyle = opts.fg || '#2a1a0a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = Math.floor(H * 0.48); g.font = 'bold ' + size + 'px "Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif';
  while (g.measureText(text).width > W - 50 && size > 10) { size -= 2; g.font = 'bold ' + size + 'px "Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif'; }
  g.fillText(text, W / 2, H / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// やわらかい丸（煙・光のにじみ・雲）
export function softTexture(color, size) {
  const c = document.createElement('canvas'); c.width = c.height = size || 64; const g = c.getContext('2d');
  const r = c.width / 2; const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, color || 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
