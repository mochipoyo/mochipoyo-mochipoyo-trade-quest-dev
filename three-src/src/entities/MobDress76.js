// v7.6 町の人の装い（3D）：同じモデルの村人・子ども・老人・商人の頭の骨に、地域ごとのかぶり物を付ける（見た目だけ）
// ・どの人に何を付けるかは 2D と同じ（js/data/mob76.js の Mob76.kindFor）。形は小さな立体の組み合わせ（仮）
// ・頭のてっぺんの高さは、作った直後（待機の動きの前＝基本の姿勢）のモデルの外形から測る。前は +Z（キャラクターの向き）
// ・実機の GPU では未確認（作業環境のヘッドレス Chromium の画像でだけ確認）
import * as THREE from 'three';
import { plain } from '../environment/EnvKit3D.js';

const M = (c, o) => plain(c, Object.assign({ std: { roughness: 0.8 }, noCutout: true }, o || {}));
function add(g, geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; g.add(m); return m; }
const cap = (r, f) => new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI * (f || 0.5));

// r：頭の半径の目安。原点＝頭のてっぺんより少し下（帽子のかぶる高さ）
function build(kind, r, col, seed) {
  const g = new THREE.Group(); g.name = 'mob76_' + kind; const c = new THREE.Color(col || '#c83a3a');
  switch (kind) {
    case 'straw': add(g, new THREE.CylinderGeometry(r * 1.9, r * 1.9, 0.025, 20), M('#e0c070')); add(g, new THREE.CylinderGeometry(r * 0.8, r * 0.92, r * 0.55, 16), M('#d8b060'), 0, r * 0.28, 0); add(g, new THREE.CylinderGeometry(r * 0.93, r * 0.93, r * 0.14, 16), M('#a8483a'), 0, r * 0.08, 0); break;
    case 'kerchief': add(g, cap(r * 1.07), M(col), 0, -r * 0.25, 0); add(g, new THREE.SphereGeometry(r * 0.16, 8, 6), M(col), 0, -r * 0.35, -r * 1.0); break;
    case 'helmet': add(g, cap(r * 1.12), M('#e8c15a', { std: { roughness: 0.5 } }), 0, -r * 0.3, 0); add(g, new THREE.CylinderGeometry(r * 1.28, r * 1.28, 0.03, 18), M('#b8913a'), 0, -r * 0.3, 0); add(g, new THREE.CylinderGeometry(r * 0.17, r * 0.17, r * 0.18, 10).rotateX(Math.PI / 2), M('#fff8c0', { emissive: '#ffe080', ei: 1.4, keepGlow: true }), 0, r * 0.25, r * 1.0); break;
    case 'beret': { const b = add(g, new THREE.SphereGeometry(r * 1.12, 16, 8), M(col)); b.scale.set(1, 0.32, 1); b.position.set(r * 0.1, r * 0.02, 0); b.rotation.z = -0.15; add(g, new THREE.CylinderGeometry(0.015, 0.015, r * 0.2, 6), M(col), r * 0.1, r * 0.4, 0); break; }
    case 'bandana': add(g, cap(r * 1.06), M('#c83a3a'), 0, -r * 0.3, 0); for (const s of [-1, 1]) { const t = add(g, new THREE.BoxGeometry(r * 0.12, r * 0.5, 0.02), M('#a82a2a')); t.position.set(s * r * 0.12, -r * 0.55, -r * 1.02); t.rotation.z = s * 0.3; } for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(g, new THREE.SphereGeometry(r * 0.07, 6, 4), M('#ffffff'), Math.cos(a) * r * 0.7, r * 0.35, Math.sin(a) * r * 0.7); } break;
    case 'turban': for (let i = 0; i < 3; i++) { const t = add(g, new THREE.TorusGeometry(r * (0.92 - i * 0.18), r * 0.2, 8, 18), M(i % 2 ? '#d8c8a8' : '#f0e6d0')); t.rotation.x = Math.PI / 2; t.position.y = -r * 0.1 + i * r * 0.26; } add(g, cap(r * 0.6), M('#f0e6d0'), 0, r * 0.45, 0); add(g, new THREE.OctahedronGeometry(r * 0.13, 0), M('#c83a3a', { std: { roughness: 0.2, metalness: 0.4 } }), 0, r * 0.1, r * 1.02); break;
    case 'veil': add(g, cap(r * 1.12), M('#d8b888'), 0, -r * 0.3, 0); { const d = add(g, new THREE.CylinderGeometry(r * 1.12, r * 1.3, r * 1.6, 16, 1, true, Math.PI * 0.5, Math.PI), M('#c8a878', { std: { roughness: 0.9, side: THREE.DoubleSide } })); d.position.y = -r * 1.1; } break;
    case 'tophat': add(g, new THREE.CylinderGeometry(r * 0.72, r * 0.75, r * 1.5, 16), M('#26262e', { std: { roughness: 0.5 } }), 0, r * 0.75, 0); add(g, new THREE.CylinderGeometry(r * 0.76, r * 0.76, r * 0.2, 16), M('#a8483a'), 0, r * 0.12, 0); add(g, new THREE.CylinderGeometry(r * 1.3, r * 1.3, 0.025, 20), M('#26262e')); break;
    case 'visor': add(g, cap(r * 1.08), M('#6a7078', { std: { roughness: 0.4, metalness: 0.4 } }), 0, -r * 0.3, 0); { const v = add(g, new THREE.TorusGeometry(r * 1.06, r * 0.1, 6, 20, Math.PI * 0.75), M('#5ad8ff', { emissive: '#3ab8ff', ei: 1.4, keepGlow: true })); v.rotation.x = Math.PI / 2; v.rotation.z = Math.PI * 0.125; v.position.y = -r * 0.95; } break;
    case 'wizard': { const cone = new THREE.ConeGeometry(r * 0.95, r * 2.6, 16, 4); const p = cone.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + r * 1.3; const k = Math.max(0, y / (r * 2.6)); p.setZ(i, p.getZ(i) - k * k * r * 0.6); } cone.computeVertexNormals(); add(g, cone, M('#5a3a9a'), 0, r * 1.3, 0); add(g, new THREE.CylinderGeometry(r * 1.8, r * 1.8, 0.025, 22), M('#4a2a8a')); add(g, new THREE.OctahedronGeometry(r * 0.13, 0), M('#ffd24a', { emissive: '#ffb020', ei: 1.2, keepGlow: true }), 0, r * 0.9, r * 0.62); break; }
    case 'furhat': add(g, new THREE.CylinderGeometry(r * 0.95, r * 1.0, r * 0.8, 16), M('#6a4a32'), 0, r * 0.3, 0); { const t = add(g, new THREE.TorusGeometry(r * 1.02, r * 0.18, 8, 20), M('#f0f0ec', { std: { roughness: 1 } })); t.rotation.x = Math.PI / 2; t.position.y = -r * 0.05; } break;
    case 'beanie': add(g, cap(r * 1.07, 0.55), M(col, { std: { roughness: 1 } }), 0, -r * 0.3, 0); { const t = add(g, new THREE.TorusGeometry(r * 1.03, r * 0.12, 6, 20), M(col, { std: { roughness: 1 } })); t.rotation.x = Math.PI / 2; t.position.y = -r * 0.3; } add(g, new THREE.SphereGeometry(r * 0.25, 8, 6), M('#f4f4f4', { std: { roughness: 1 } }), 0, r * 0.82, 0); break;
    case 'goggles': { const t = add(g, new THREE.TorusGeometry(r * 1.04, r * 0.07, 6, 20), M('#5a3a24')); t.rotation.x = Math.PI / 2; t.position.y = -r * 0.42; } for (const s of [-1, 1]) { add(g, new THREE.CylinderGeometry(r * 0.24, r * 0.24, r * 0.16, 12).rotateX(Math.PI / 2), M('#2a2a2a', { std: { roughness: 0.4, metalness: 0.5 } }), s * r * 0.36, -r * 0.3, r * 0.98); add(g, new THREE.CircleGeometry(r * 0.17, 12), M('#ffb84a', { emissive: '#ff9020', ei: 0.6, std: { roughness: 0.1 } }), s * r * 0.36, -r * 0.3, r * 1.07); } break;
    case 'feather': { const t = add(g, new THREE.TorusGeometry(r * 1.03, r * 0.06, 6, 20), M('#c8a050')); t.rotation.x = Math.PI / 2; t.position.y = -r * 0.4; } { const f = add(g, new THREE.SphereGeometry(r * 0.5, 10, 6), M('#f4f8ff', { std: { roughness: 0.9 } })); f.scale.set(0.25, 1.2, 0.08); f.position.set(r * 0.85, r * 0.3, -r * 0.2); f.rotation.z = -0.4; } break;
    case 'hood': add(g, cap(r * 1.22, 0.62), M('#3a3448', { std: { roughness: 0.95, side: THREE.DoubleSide } }), 0, -r * 0.45, -r * 0.08); { const d = add(g, new THREE.CylinderGeometry(r * 1.2, r * 1.45, r * 1.5, 16, 1, true, Math.PI * 0.5, Math.PI), M('#3a3448', { std: { roughness: 0.95, side: THREE.DoubleSide } })); d.position.y = -r * 1.2; } break;
    default: return null;
  }
  return g;
}

export function dressMob(ch, k) {
  if (!ch || !ch.model || !k) return false; let head = null; ch.model.traverse((o) => { if (!head && o.isBone && o.name === 'head') head = o; }); if (!head) return false;
  ch.root.updateMatrixWorld(true);
  const box = new THREE.Box3(); ch.model.traverse((o) => { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  const hp = head.getWorldPosition(new THREE.Vector3()); const hh = box.max.y - hp.y; if (!(hh > 0.1 && hh < 2)) return false;
  const r = hh * 0.52; const g = build(k.kind, r, k.col, k.seed); if (!g) return false;
  const wp = new THREE.Vector3(hp.x, box.max.y - r * 0.32, hp.z);
  ch.root.add(g); g.position.copy(ch.root.worldToLocal(wp.clone())); head.attach(g);
  ch.dress76 = k.kind; return true;
}
