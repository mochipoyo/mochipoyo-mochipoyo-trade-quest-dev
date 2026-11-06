/* =========================================================
   Arcade81（v8.1）：屋根のある渡り廊下・回廊・側廊（定義の arcades81：[{ x, y, w, h, kind }]。js/data/remake81-*.js）
   ・長い辺にそって柱と尖頭のアーチ、上に屋根（歩く高さより上＝2.7）。通れるマス・当たり判定は変えない（見た目だけ）
   ・kind：'arcade'（明るい石の低い渡り廊下）・'cloister'（書庫の回廊。濃い石と木の梁）・'aisle'（研究棟の側廊。天井ぞいに真鍮の配管）
   ・形は 1 つの Batch にまとめる（光は足さない）
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4 } from '../engine/Materials.js';

export function buildArcades81(map, ctx) {
  const L = (map && map.def && map.def.arcades81) || []; if (!L.length) return { n: 0 };
  const M = ctx.mats; const b = new Batch(); const H = ctx.heightAt || (() => 0);
  const light = M.tinted('stonewall', '#d8d0c0'), dark = M.tinted('stonewall', '#9a9284'), timber = M.get('timber'), roofM = M.tinted('stonewall', '#7a7066');
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.35, metalness: 0.8 });
  for (const a of L) {
    const horiz = a.w >= a.h; const len = horiz ? a.w : a.h; const span = horiz ? a.h : a.w;
    const stoneM = a.kind === 'cloister' ? dark : light; const y0 = H(a.x + a.w / 2, a.y + a.h / 2); const roofY = y0 + 2.75;
    // 長い辺の柱とアーチ（両側）
    for (const side of [0, 1]) {
      for (let i = 0; i <= len; i += 2) {
        const u = Math.min(i, len); const px = horiz ? a.x + u : (side ? a.x + a.w : a.x), pz = horiz ? (side ? a.y + a.h : a.y) : a.y + u;
        b.add(stoneM, box(0.24, 2.7, 0.24, 1), M4(px, y0 + 1.35, pz)); b.add(stoneM, box(0.34, 0.16, 0.34, 1), M4(px, y0 + 0.08, pz)); b.add(stoneM, box(0.34, 0.14, 0.34, 1), M4(px, y0 + 2.35, pz));
        if (i + 2 <= len) {   // 柱のあいだの尖頭アーチ（2 本の弧）
          const mx = horiz ? px + 1 : px, mz = horiz ? pz : pz + 1; const ry = horiz ? 0 : Math.PI / 2;
          for (const s of [-1, 1]) { const arc = new THREE.TorusGeometry(1.05, 0.08, 4, 10, Math.PI / 3); const m = M4(mx + (horiz ? s * 0.0 : 0), y0 + 1.55, mz, ry).multiply(new THREE.Matrix4().makeRotationZ(s < 0 ? Math.PI / 6 : Math.PI / 2)); b.add(stoneM, arc, m.multiply(new THREE.Matrix4().makeTranslation(s * 0.0, 0, 0))); }
          b.add(stoneM, box(horiz ? 2 : 0.2, 0.3, horiz ? 0.2 : 2, 1), M4(mx, y0 + 2.6, mz));
        }
      }
    }
    // 屋根（低い勾配）と軒
    const cx = a.x + a.w / 2, cz = a.y + a.h / 2;
    b.add(roofM, box(a.w + 0.5, 0.16, a.h + 0.5, 1), M4(cx, roofY, cz));
    b.add(a.kind === 'cloister' ? timber : roofM, box(horiz ? a.w + 0.6 : 0.3, 0.22, horiz ? 0.3 : a.h + 0.6, 1), M4(cx, roofY + 0.2, cz));
    if (a.kind === 'cloister') for (let i = 0; i <= len; i++) b.add(timber, box(horiz ? 0.12 : span + 0.3, 0.12, horiz ? span + 0.3 : 0.12, 1), M4(horiz ? a.x + i : cx, roofY - 0.12, horiz ? cz : a.y + i));   // 梁
    if (a.kind === 'aisle') for (const off of [-0.3, 0.3]) { const pipe = new THREE.CylinderGeometry(0.06, 0.06, len, 8); if (horiz) pipe.rotateZ(Math.PI / 2); else pipe.rotateX(Math.PI / 2); b.add(brass, pipe, M4(cx + (horiz ? 0 : off * span), roofY - 0.25, cz + (horiz ? off * span : 0))); }
  }
  const g = new THREE.Group(); g.name = 'arcades81'; b.build(g); ctx.group.add(g);
  return { n: L.length };
}
