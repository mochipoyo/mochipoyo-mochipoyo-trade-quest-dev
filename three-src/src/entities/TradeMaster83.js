// v8.3 トレードマスター（js/rpg/trademaster83.js）の 3D の見た目：ほかの人と見分けがつくように
// ・頭：黒いシルクハットに金の帯（頭の骨に付ける＝MobDress76 と同じ測り方）
// ・足元：ゆっくり明滅する金の輪（地面の少し上。影を落とさない）
// ・頭の上：ローソク足の札（いつもカメラを向く板。上下にゆっくり揺れる）。遠くからでも分かる
// ・形と色だけ（当たり判定・会話・位置は 2D 版の NPC のまま）。実機の GPU では未確認（作業環境のヘッドレス Chromium の画像でだけ確認）
import * as THREE from 'three';
import { plain } from '../environment/EnvKit3D.js';

const M = (c, o) => plain(c, Object.assign({ std: { roughness: 0.6 }, noCutout: true }, o || {}));
let BADGE = null, RING = null;
function badgeTexture() {
  if (BADGE) return BADGE; const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,14,32,0.92)'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill(); g.lineWidth = 7; g.strokeStyle = '#e8c15a'; g.stroke();
  const candle = (x, y, h, up) => { g.fillStyle = up ? '#4cc38a' : '#e5484d'; g.fillRect(x, y, 16, h); g.fillRect(x + 6.5, y - 12, 3, h + 24); };
  candle(30, 50, 34, true); candle(56, 38, 26, false); candle(82, 30, 40, true);
  g.strokeStyle = '#ffd24a'; g.lineWidth = 4; g.beginPath(); g.moveTo(26, 96); g.lineTo(52, 80); g.lineTo(70, 88); g.lineTo(102, 60); g.stroke();
  BADGE = new THREE.CanvasTexture(c); BADGE.colorSpace = THREE.SRGBColorSpace; return BADGE;
}
function ringTexture() {
  if (RING) return RING; const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 30, 64, 64, 62); gr.addColorStop(0, 'rgba(255,210,74,0)'); gr.addColorStop(0.72, 'rgba(255,210,74,0.85)'); gr.addColorStop(0.86, 'rgba(255,236,160,1)'); gr.addColorStop(1, 'rgba(255,210,74,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); RING = new THREE.CanvasTexture(c); RING.colorSpace = THREE.SRGBColorSpace; return RING;
}
// ch：Character3D。info：npc.tradeMaster83。animated：MapScene3D.animated（{ kind: 'fn', fn(t) }）。戻り値：付けたか
export function dressTradeMaster83(ch, info, animated) {
  if (!ch || !ch.root) return false; const col = new THREE.Color((info && info.color) || '#e8c15a');
  ch.root.updateMatrixWorld(true);
  const box = new THREE.Box3(); (ch.model || ch.root).traverse((o) => { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  const top = isFinite(box.max.y) ? box.max.y - ch.root.position.y : 1.6;
  // 頭：シルクハット（頭の骨があれば骨に付ける）
  let head = null; if (ch.model) ch.model.traverse((o) => { if (!head && o.isBone && o.name === 'head') head = o; });
  const hat = new THREE.Group(); hat.name = 'tm83_hat'; const r = 0.15;
  const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; hat.add(m); return m; };
  add(new THREE.CylinderGeometry(r * 1.9, r * 1.9, 0.03, 20), M('#16161e', { std: { roughness: 0.5 } }), 0);
  add(new THREE.CylinderGeometry(r * 1.05, r * 1.12, r * 1.9, 18), M('#16161e', { std: { roughness: 0.45 } }), r * 0.95);
  add(new THREE.CylinderGeometry(r * 1.14, r * 1.14, r * 0.36, 18), M('#' + col.getHexString(), { std: { roughness: 0.35, metalness: 0.6 } }), r * 0.3);
  if (head) { const hp = head.getWorldPosition(new THREE.Vector3()); const wp = new THREE.Vector3(hp.x, ch.root.position.y + top - 0.06, hp.z); ch.root.add(hat); hat.position.copy(ch.root.worldToLocal(wp.clone())); head.attach(hat); }
  else { hat.position.y = top - 0.06; ch.root.add(hat); }
  // 足元の金の輪
  const ringMat = new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, depthWrite: false, toneMapped: false, color: col });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.renderOrder = 2; ring.name = 'tm83_ring'; ch.root.add(ring);
  // 頭の上の札
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(), transparent: true, depthWrite: false, toneMapped: false })); badge.scale.set(0.5, 0.5, 1); const by = top + 0.62; badge.position.y = by; badge.name = 'tm83_badge'; badge.renderOrder = 6; ch.root.add(badge);
  const ph = ((info && info.seed) || 0) % 628 / 100;
  if (animated) animated.push({ kind: 'fn', fn: (t) => { badge.position.y = by + Math.sin(t * 2.2 + ph) * 0.06; ringMat.opacity = 0.65 + Math.sin(t * 3 + ph) * 0.25; } });
  ch.tm83 = true; return true;
}
