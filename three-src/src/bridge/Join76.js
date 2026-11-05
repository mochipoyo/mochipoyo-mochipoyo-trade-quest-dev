// v7.6 つないだ世界（js/rpg/world76.js）の 3D：となりの地域を、位置をずらして同じ画面に並べる
// ・いまの地域（current）は原点。となりの地域（上下左右）は、端に近づいたら先に組み立てて（1 枚ずつ）、ずらして置く
// ・端を越えたとき（World76 の知らせ）：主人公・カメラの位置を、新しい地域の座標へずらす（画面を切り替えない・位置を置き直さない）
// ・まだ行けない地域との境目には、霧の壁を立てる（解放されたら消える）
// ・遠い（端から DROP マス以上はなれた）となりの地域は画面から外す（メモリ・描画の負担を減らす。キャッシュの整理の対象になる）
// ・実機の GPU では未確認（作業環境のヘッドレス Chromium の画像でだけ確認）
import * as THREE from 'three';
import { MapScene3D } from '../world/MapScene3D.js';

const NEAR = 40, DROP = 70;   // 端から NEAR マス以内で、となりを組み立てる／DROP マス以上はなれたら外す
let mistTex = null;
function mistTexture() {
  if (mistTex) return mistTex; const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(70,74,96,0.0)'); gr.addColorStop(0.08, 'rgba(70,74,96,0.85)'); gr.addColorStop(0.55, 'rgba(90,92,118,0.55)'); gr.addColorStop(1, 'rgba(110,112,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 128); mistTex = new THREE.CanvasTexture(c); mistTex.colorSpace = THREE.SRGBColorSpace; return mistTex;
}
export class Join76 {
  constructor(app) { this.app = app; this.shown = new Map(); this.building = null; this.lastCheck = 0; this.walls = new Map(); this.crossings = 0; }
  W76() { const w = window.World76; return w && w.on && w.on() ? w : null; }
  active() { const W76 = this.W76(); const cur = this.app.current; return !!(W76 && cur && cur.map && cur.map.kind === 'field' && !cur.interior && W76.inGrid(cur.map.id)); }
  // 端からの距離（いまの地域の座標）
  edgeDist(side) { const p = this.app.pos, m = this.app.current.map; return side === 'n' ? p.z : side === 's' ? m.h - p.z : side === 'w' ? p.x : m.w - p.x; }
  // 端を越えた：いまの位置・カメラを新しい地域の座標へずらす
  shift(ev) {
    const a = this.app; const dx = ev.dx, dz = ev.dy; const p = window.World.player;
    a.pos.x -= dx; a.pos.z -= dz; a.camera.target.x -= dx; a.camera.target.z -= dz;
    if (a._focus) { a._focus.x -= dx; a._focus.z -= dz; }
    if (a.followers) a.followers.forEach((f) => { if (f.ch) { f.ch.root.position.x -= dx; f.ch.root.position.z -= dz; } });
    if (window.Follow && window.Follow.shift) window.Follow.shift(-dx, -dz, window.World.map); else if (window.Follow && window.Follow.reset) window.Follow.reset(window.World.map, a.pos.x, a.pos.z, p.dir);
    a.lastMap = window.World.map; a.lastTile = [p.x, p.y]; this.crossings++;
  }
  // となりの地域を並べ直す
  layout() {
    const a = this.app; const want = new Map(); const W76 = this.W76();
    if (this.active()) for (const nb of W76.neighbors(a.current.map.id)) {
      const ms = a.cache.get(nb.id); if (!ms || !ms.map || ms.map !== window.World.maps[nb.id]) continue; if (this.edgeDist(nb.side) > DROP) continue;
      want.set(nb.id, { ms, nb });
    }
    for (const [id, e] of this.shown) if (!want.has(id) || want.get(id).ms !== e.ms) { if (e.ms !== a.current) a.scene.remove(e.ms.root); this.shown.delete(id); }
    for (const [id, e] of want) { e.ms.root.position.set(e.nb.dx, 0, e.nb.dy); if (!this.shown.has(id)) { a.scene.add(e.ms.root); a.lighting.registerScene(e.ms.root); } this.shown.set(id, e); }
    if (a.current) a.current.root.position.set(0, 0, 0);
    this.updateWalls();
  }
  // まだ行けない地域との境目の霧の壁
  updateWalls() {
    const a = this.app; const W76 = this.W76(); const want = new Set();
    if (this.active()) for (const nb of W76.neighbors(a.current.map.id)) if (!W76.unlocked(nb.id) && this.edgeDist(nb.side) < DROP) want.add(nb.side);
    for (const [side, mesh] of this.walls) if (!want.has(side)) { a.scene.remove(mesh); mesh.geometry.dispose(); this.walls.delete(side); }
    if (!want.size) return; const m = a.current.map;
    const mat = this._wallMat || (this._wallMat = new THREE.MeshBasicMaterial({ map: mistTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, color: 0xffffff }));
    for (const side of want) { if (this.walls.has(side)) continue; const along = side === 'n' || side === 's'; const len = along ? m.w : m.h;
      const g = new THREE.PlaneGeometry(len, 9, 1, 1); const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 5; mesh.name = 'join76_mist_' + side;
      if (along) mesh.position.set(m.w / 2, 3.5, side === 'n' ? 0 : m.h); else { mesh.rotation.y = Math.PI / 2; mesh.position.set(side === 'w' ? 0 : m.w, 3.5, m.h / 2); }
      a.scene.add(mesh); this.walls.set(side, mesh); }
  }
  clear() { const a = this.app; for (const [, e] of this.shown) if (e.ms !== a.current) a.scene.remove(e.ms.root); this.shown.clear(); for (const [, mesh] of this.walls) { a.scene.remove(mesh); mesh.geometry.dispose(); } this.walls.clear(); }
  keeps(id) { return this.shown.has(id) || this.building === id; }
  // 毎フレーム：となりの水面の動き・遠近の切り替え。ときどき：近い端のとなりを組み立てる・遠いものを外す
  update(dt, t, now) {
    const a = this.app; if (!this.active()) { if (this.shown.size || this.walls.size) this.clear(); return; }
    for (const [, e] of this.shown) { const w = e.ms.world; if (w) { w.update(t); if (w.updateLod) w.updateLod({ x: a.pos.x - e.nb.dx, y: a.pos.y, z: a.pos.z - e.nb.dy }); } }
    if (now - this.lastCheck < 700) return; this.lastCheck = now;
    this.layout();
    if (this.building || a.building) return;
    const W76 = this.W76(); let pick = null;
    for (const nb of W76.neighbors(a.current.map.id)) { if (a.failed[nb.id]) continue; const c = a.cache.get(nb.id); if (c && c.map === window.World.maps[nb.id]) continue; const dist = this.edgeDist(nb.side); if (dist < NEAR && (!pick || dist < pick.dist)) pick = { id: nb.id, dist }; }
    if (pick) this.build(pick.id);
  }
  build(id) {
    const a = this.app; let m; try { m = window.World.getMap(id); } catch (e) { a.failed[id] = true; return; }
    this.building = id; const ms = new MapScene3D(a); const t0 = performance.now();
    ms.build(m).then(() => {
      const old = a.cache.get(id); if (old && old !== ms && old !== a.current) { try { old.dispose(); } catch (e) { /* なし */ } }
      a.cache.set(id, ms); ms.usedAt = performance.now(); a.stats['build_' + id] = Math.round(performance.now() - t0); this.building = null;
      if (window.World.map === m && a.current !== ms) a.activate(ms); else this.layout();
    }).catch((e) => { console.error('join76 build failed', id, e); a.failed[id] = true; this.building = null; });
  }
}
