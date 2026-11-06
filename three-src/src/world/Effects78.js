/* =========================================================
   v7.8 地球の世界の 3D の仕上げ（表示だけ。当たり判定・ゲームの進行は変えない）
   ・雨：マップの定義 def.rain78 が true の屋外（錆雨市ネオン・ドックのフィールドと町）。主人公のまわりに細い雨の線
   ・浮天城アエリアの影：太平洋の上空の城（js/rpg/earth78.js の aeriaAt）の真下の海に、大きな影（地球の世界の外の地図・地域）
   ・展望室の地球：環星ステーション・オルビスの展望室（def.earthWindow78）の窓の前に、地球の地形の絵を貼った球（ゆっくり回る。上から見るカメラでも見える位置）
   ・重さ：雨は線 700 本（低画質は 350 本）。影は円 1 枚。地球は球 1 つ（展望室だけ）
   ========================================================= */
import * as THREE from 'three';

function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
}

export class Effects78 {
  constructor(scene, quality) {
    this.scene = scene; this.low = quality === 'low'; this.mapId = null;
    this.rain = null; this.shadow = null; this.globe = null; this.globeHalo = null;
  }
  // 雨の線（世界の座標で持つ。主人公のまわりの箱の中で落ちる）
  makeRain() {
    const N = this.low ? 350 : 700; const pos = new Float32Array(N * 6); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial({ color: 0xa8c8ff, transparent: true, opacity: 0.42, depthWrite: false });
    const L = new THREE.LineSegments(g, m); L.name = 'fx78_rain'; L.frustumCulled = false; L.renderOrder = 5; L.userData = { N, seeded: false, R: 18, H: 14 };
    this.scene.add(L); this.rain = L; return L;
  }
  seedDrop(p, i, f, R, H, yTop) { const x = f.x + (Math.random() * 2 - 1) * R, z = f.z + (Math.random() * 2 - 1) * R, y = yTop ? H : Math.random() * H; p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z; p[i * 6 + 3] = x - 0.08; p[i * 6 + 4] = y - 0.7; p[i * 6 + 5] = z + 0.05; }
  updateRain(dt, focus, on) {
    if (!on) { if (this.rain) this.rain.visible = false; return; }
    const L = this.rain || this.makeRain(); L.visible = true; const u = L.userData; const p = L.geometry.attributes.position.array; const R = u.R, H = u.H;
    if (!u.seeded) { for (let i = 0; i < u.N; i++) this.seedDrop(p, i, focus, R, H, false); u.seeded = true; }
    const dy = 24 * Math.min(dt, 0.1), dx = -2.4 * Math.min(dt, 0.1);
    for (let i = 0; i < u.N; i++) { const b = i * 6; p[b + 1] -= dy; p[b + 4] -= dy; p[b] += dx; p[b + 3] += dx;
      if (p[b + 4] < 0 || Math.abs(p[b] - focus.x) > R + 2 || Math.abs(p[b + 2] - focus.z) > R + 2) this.seedDrop(p, i, focus, R, H, true); }
    L.geometry.attributes.position.needsUpdate = true;
  }
  updateShadow(t, current) {
    const G = window, W76 = G.World76, E = G.Earth78; let show = false;
    if (current && current.map && W76 && W76.earth && E && E.aeriaAt && W76.inGrid && W76.inGrid(current.map.id)) {
      const a = E.aeriaAt(); const r = W76.rect(current.map.id);
      if (a && r) { const lx = W76.dxWrap(a.x - r.x) + 0.5, lz = a.y - r.y + 0.5; const o = current.root.position;
        if (Math.abs(lx - (r.w / 2)) < r.w / 2 + 70 && Math.abs(lz - (r.h / 2)) < r.h / 2 + 70) {
          if (!this.shadow) { const m = new THREE.MeshBasicMaterial({ map: radialTex(), color: 0x000814, transparent: true, opacity: 0.62, depthWrite: false }); const s = new THREE.Mesh(new THREE.CircleGeometry(1, 48), m); s.rotation.x = -Math.PI / 2; s.name = 'fx78_aeria_shadow'; s.renderOrder = 4; this.scene.add(s); this.shadow = s; }
          const rr = (a.r || 7) * 1.4; this.shadow.scale.set(rr * 1.35, rr, 1); this.shadow.position.set(o.x + lx + Math.sin(t * 0.05) * 1.2, 0.06, o.z + lz + Math.cos(t * 0.04) * 0.8); show = true; } }
    }
    if (this.shadow) this.shadow.visible = show;
  }
  updateGlobe(dt, current) {
    const on = !!(current && current.map && current.map.def && current.map.def.earthWindow78 && !current.interior);
    if (!on) { if (this.globe) this.globe.visible = this.globeHalo.visible = false; return; }
    if (!this.globe) {
      const cv = window.Minimap && window.Minimap.earthCanvas ? window.Minimap.earthCanvas() : null;
      const mat = cv ? new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }) : new THREE.MeshBasicMaterial({ color: 0x2a5aa8 });
      if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
      this.globe = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 32), mat); this.globe.name = 'fx78_globe';
      this.globeHalo = new THREE.Mesh(new THREE.SphereGeometry(1.42, 32, 24), new THREE.MeshBasicMaterial({ color: 0x6ab8ff, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false })); this.globeHalo.name = 'fx78_globe_halo';
      this.scene.add(this.globe); this.scene.add(this.globeHalo);
    }
    const m = current.map, o = current.root.position; const x = o.x + m.w / 2, z = o.z + 3.5, y = 1.55 + Math.sin(performance.now() / 900) * 0.06;   // 窓の前（北の壁の手前）に浮かぶ地球（窓の外の景色を、部屋の中から見上げる大きさに）
    this.globe.position.set(x, y, z); this.globeHalo.position.copy(this.globe.position); this.globe.rotation.y += dt * 0.06; this.globe.rotation.x = 0.35;
    this.globe.visible = this.globeHalo.visible = true;
  }
  update(dt, t, focus, current) {
    const def = current && current.map && current.map.def; const outdoor = current && !current.interior;
    this.updateRain(dt, focus, !!(def && def.rain78 && outdoor));
    this.updateShadow(t, current);
    this.updateGlobe(dt, current);
  }
}
