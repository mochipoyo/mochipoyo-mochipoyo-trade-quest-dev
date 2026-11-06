/* =========================================================
   v7.9 馬車の 3D の模型（js/rpg/carriage79.js の Carriage.riding() のときだけ出す）
   ・幌馬車（荷台・布の幌・車輪 4 つ）と、前を引く馬 1 頭。主人公は御者台に座る（主人公のモデルを座らせる位置は GameBridge が使う）
   ・動き：進む速さに合わせて車輪が回り、馬の脚が前後に動く。向きは主人公の向きへなめらかに回す
   ・重さ：箱・円柱・球だけ（三角形 約 1,500）。影を落とす
   ========================================================= */
import * as THREE from 'three';

function mat(color, rough = 0.85) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 }); }

export class Carriage3D {
  constructor(scene) { this.scene = scene; this.g = null; this.yaw = 0; this.spin = 0; this.gait = 0; }
  build() {
    const g = new THREE.Group(); g.name = 'carriage79';
    const wood = mat(0x8a5a2e), wood2 = mat(0x5e3a1c), cloth = mat(0xf2ead6, 0.95), metal = mat(0xc9a24a, 0.5), horse = mat(0x8a5428, 0.8), dark = mat(0x2e1c10, 0.9);
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    // 荷台（ローカル：+z が前）
    add(new THREE.BoxGeometry(0.9, 0.22, 1.3), wood, 0, 0.5, -0.25);
    add(new THREE.BoxGeometry(0.96, 0.08, 1.36), wood2, 0, 0.38, -0.25);
    // 幌（半円の筒）
    const hood = new THREE.CylinderGeometry(0.5, 0.5, 1.25, 16, 1, true, 0, Math.PI); hood.rotateX(Math.PI / 2); hood.rotateZ(Math.PI / 2);   // 軸を前後（z）に、半分の筒を上（+y）へ＝荷台にかぶさるアーチ
    const h = add(hood, cloth, 0, 0.62, -0.28); h.material.side = THREE.DoubleSide;
    for (const z of [-0.85, -0.28, 0.3]) add(new THREE.TorusGeometry(0.5, 0.025, 6, 16, Math.PI), wood2, 0, 0.62, z);
    // 御者台
    add(new THREE.BoxGeometry(0.8, 0.08, 0.32), wood, 0, 0.72, 0.52); add(new THREE.BoxGeometry(0.8, 0.3, 0.06), wood2, 0, 0.6, 0.66);
    // 車輪
    this.wheels = [];
    for (const [x, z, r] of [[-0.5, -0.65, 0.3], [0.5, -0.65, 0.3], [-0.5, 0.25, 0.26], [0.5, 0.25, 0.26]]) {
      const wg = new THREE.Group(); wg.position.set(x, r, z); g.add(wg);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 18), dark); rim.rotation.y = Math.PI / 2; rim.castShadow = true; wg.add(rim);
      for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, r * 1.9, 0.03), wood2); sp.rotation.x = k * Math.PI / 4; wg.add(sp); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), metal); hub.rotation.z = Math.PI / 2; wg.add(hub);
      this.wheels.push(wg);
    }
    // 長柄
    for (const x of [-0.24, 0.24]) add(new THREE.BoxGeometry(0.04, 0.04, 0.9), wood2, x, 0.6, 0.95, -0.12);
    // 馬
    const hg = new THREE.Group(); hg.position.set(0, 0, 1.45); g.add(hg); this.horse = hg;
    const ha = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; hg.add(o); return o; };
    ha(new THREE.BoxGeometry(0.36, 0.38, 0.9), horse, 0, 0.78, 0);
    ha(new THREE.BoxGeometry(0.2, 0.42, 0.24), horse, 0, 1.06, 0.48, -0.55);
    ha(new THREE.BoxGeometry(0.18, 0.18, 0.38), horse, 0, 1.24, 0.66, 0.35);
    ha(new THREE.BoxGeometry(0.06, 0.34, 0.3), dark, 0, 1.14, 0.38, -0.55);   // たてがみ
    ha(new THREE.BoxGeometry(0.08, 0.36, 0.08), dark, 0, 0.74, -0.5, 0.5);    // 尾
    this.legs = [];
    for (const [x, z] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.32], [0.12, -0.32]]) { const lg = new THREE.Group(); lg.position.set(x, 0.6, z); hg.add(lg); const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), horse); leg.position.y = -0.3; leg.castShadow = true; lg.add(leg); const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.1), dark); hoof.position.y = -0.6; lg.add(hoof); this.legs.push(lg); }
    g.visible = false; this.scene.add(g); this.g = g; return g;
  }
  // 主人公を座らせる位置（世界の座標）
  seat(out) { if (!this.g) return null; out.set(0, 0.78, 0.5).applyMatrix4(this.g.matrixWorld); return out; }
  update(dt, on, pos, yaw, speed) {
    if (!on) { if (this.g) this.g.visible = false; return; }
    if (!this.g) this.build();
    let dd = yaw - this.yaw; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; this.yaw += dd * Math.min(1, dt * 6);
    // 馬が主人公の位置の少し前に来るように、模型の中心を後ろへずらす
    const back = 0.35; this.g.position.set(pos.x - Math.sin(this.yaw) * back, pos.y, pos.z - Math.cos(this.yaw) * back); this.g.rotation.y = this.yaw; this.g.scale.setScalar(1.25); this.g.visible = true;   /* 上から見ても馬車とわかる大きさに */
    const v = Math.max(0, speed || 0); this.spin += v * dt / 0.28; this.wheels.forEach((w) => { w.rotation.x = this.spin; });
    this.gait += v * dt * 2.4; const sw = v > 0.1 ? Math.sin(this.gait) * 0.5 : 0; this.legs.forEach((l, i) => { l.rotation.x = (i % 3 === 0 ? sw : -sw); });
    this.horse.position.y = v > 0.1 ? Math.abs(Math.sin(this.gait)) * 0.04 : 0;
    this.g.updateMatrixWorld(true);
  }
}
