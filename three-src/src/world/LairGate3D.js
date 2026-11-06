/* =========================================================
   v8.0 異界の門（新しいボス 19 体の「ボスの間」の入口）の 3D の形
   ・外の地図（w78_*）のイベントのうち lair19 のあるもの（js/data/bosslair19.js・js/rpg/earth78.js が置く）の上に建てる
   ・形：八角形の二段の石の台、左右の黒い石の柱（紫に光る刻み・四角すいの頭）、立てた石の輪（光る留め石）、輪の中で回る紫の渦、足もとの光
     門は南（門の前＝出る所の側）を向く。倒したボスの門は、渦が金色で弱く光る
   ・見た目だけ：通れるマス・調べる位置は前と同じ（門のマスは 2D でも通れない）
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4, softTexture } from '../engine/Materials.js';

let SWIRL = null;
function swirlTexture() {   // 渦の模様（白〜透明。色は材質で付ける）
  if (SWIRL) return SWIRL; const S = 128; const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0.12)');
  g.fillStyle = grd; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
  for (let a = 0; a < 5; a++) { g.beginPath(); for (let k = 0; k <= 40; k++) { const r = k / 40 * (S / 2 - 3); const th = a * Math.PI * 2 / 5 + k * 0.16; const x = S / 2 + Math.cos(th) * r, y = S / 2 + Math.sin(th) * r; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  SWIRL = new THREE.CanvasTexture(c); SWIRL.colorSpace = THREE.SRGBColorSpace; return SWIRL;
}
export function buildLairGates(map, ctx) {
  const evs = (map && map.def && map.def.events || []).filter((e) => e && e.lair19); if (!evs.length) return { n: 0 };
  const M = ctx.mats; const b = new Batch(); const lamps = [], animated = []; const H = ctx.heightAt || (() => 0);
  const d = window.State && window.State.data; const lairs = window.EARTH78_LAIRS || [];
  const stone = M.tinted('stonewall', '#5a5468'), lite = M.tinted('stonewall', '#8a8498'), black = M.tinted('stonewall', '#2a2632');
  const rune = new THREE.MeshStandardMaterial({ color: 0xb080ff, emissive: 0x9a60ff, emissiveIntensity: 1.5, roughness: 0.4 }); rune.name = 'lm_glow_lair';
  const runeDone = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xc89a3a, emissiveIntensity: 0.9, roughness: 0.4 }); runeDone.name = 'lm_glow_lair_done';
  const SC = 1.2;   // 全体の大きさ（1 マスより少し大きい）
  for (const ev of evs) {
    const L = lairs.find((q) => q.key === ev.lair19); const done = !!(d && d.flags && L && d.flags[L.flag]); const rm = done ? runeDone : rune;
    const cx = ev.x + 0.5, cz = ev.y + 0.5, y0 = H(cx, cz); const P = (...a) => M4(cx, y0, cz, 0, 0, 0, SC).multiply(M4(...a));   // ローカル：x＝左右・z＝南（門の前）・y＝上（全体を SC 倍）
    // 台（八角形の二段）
    const t1 = new THREE.CylinderGeometry(0.98, 1.04, 0.16, 8); t1.rotateY(Math.PI / 8); b.add(stone, t1, P(0, 0.08, 0));
    const t2 = new THREE.CylinderGeometry(0.8, 0.84, 0.12, 8); t2.rotateY(Math.PI / 8); b.add(lite, t2, P(0, 0.22, 0));
    b.add(lite, box(0.6, 0.08, 0.3, 1), P(0, 0.04, 0.98));   // 前の踏み石
    // 左右の柱
    for (const s of [-1, 1]) {
      const px = s * 0.98; b.add(black, box(0.26, 1.9, 0.26, 2), P(px, 0.16 + 0.95, 0)); b.add(lite, box(0.36, 0.14, 0.36, 1), P(px, 0.16 + 0.07, 0));
      const cap = new THREE.ConeGeometry(0.22, 0.42, 4); cap.rotateY(Math.PI / 4); b.add(black, cap, P(px, 0.16 + 1.9 + 0.21, 0));
      for (const yy of [0.62, 1.02, 1.42]) b.add(rm, box(0.06, 0.22, 0.02, 1), P(px, yy, 0.135));   // 光る刻み（前の面）
      b.add(rm, new THREE.OctahedronGeometry(0.07), P(px, 0.16 + 2.32, 0));   // 柱の上の小さな結晶
    }
    // 立てた石の輪と留め石
    const R = 0.74, cy = 0.28 + R + 0.06; b.add(stone, new THREE.TorusGeometry(R, 0.1, 10, 32), P(0, cy, 0));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.add(i % 2 ? lite : rm, box(0.12, 0.12, 0.26, 1), P(Math.cos(a) * R, cy + Math.sin(a) * R, 0, 0, 0, a)); }
    b.add(lite, box(0.5, 0.18, 0.3, 1), P(0, 0.3, 0));   // 輪の足
    // 渦（回る）・足もとの光
    const vm = new THREE.MeshBasicMaterial({ map: swirlTexture(), color: done ? 0xffd890 : 0xa070ff, transparent: true, opacity: done ? 0.45 : 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const vortex = new THREE.Mesh(new THREE.CircleGeometry((R - 0.06) * SC, 40), vm); vortex.geometry.userData.own = true; vortex.position.set(cx, y0 + cy * SC, cz + 0.01); vortex.name = 'lair_vortex_' + ev.lair19; vortex.renderOrder = 4; ctx.group.add(vortex);
    animated.push({ kind: 'spin', obj: vortex, speed: done ? 0.25 : 0.9 });
    const gm = new THREE.MeshBasicMaterial({ map: softTexture('rgba(255,255,255,1)', 64), color: done ? 0xffd27a : 0x9a60ff, transparent: true, opacity: done ? 0.25 : 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6 * SC, 2.6 * SC), gm); glow.geometry.userData.own = true; glow.rotation.x = -Math.PI / 2; glow.position.set(cx, y0 + 0.3 * SC, cz); glow.renderOrder = 3; ctx.group.add(glow);
    lamps.push({ pos: new THREE.Vector3(cx, y0 + cy * SC, cz + 0.4), color: done ? 0xffc870 : 0xa070ff, power: done ? 0.6 : 1.3, dist: 7 });
  }
  const g = new THREE.Group(); g.name = 'lair_gates'; b.build(g); g.traverse((o) => { if (o.isMesh && /^lm_glow/.test(o.material.name || '')) o.castShadow = false; }); ctx.group.add(g);
  return { n: evs.length, lamps, animated };
}
