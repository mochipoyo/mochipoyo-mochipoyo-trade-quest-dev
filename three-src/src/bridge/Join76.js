// v7.6 つないだ世界（js/rpg/world76.js）の 3D：まわりの地図（地域・共通の海）を、世界の座標どおりにずらして同じ画面に並べる
// ・いまの地図（current）は原点。主人公の世界の座標から NEAR マス以内に入る地図は先に組み立てて（1 枚ずつ・途中で画面へ返しながら）、ずらして置く
//   DROP マスより遠い地図は画面から外す（キャッシュの整理の対象になる）。並べるのは近い順に MAXSHOWN 枚まで
// ・境目を越えたとき（World76 の知らせ）：主人公・カメラ・仲間の位置を、新しい地図の座標へずらす（画面を切り替えない・置き直さない・カメラは飛ばない）
// ・まだ行けない地域のまわりには霧の壁、世界の果てには嵐の壁（解放されたら消える。見えるのは地形だけ・地名は地図で「？？？」）
// ・組み立ては描画の準備だけ（訪問済み・出来事・宝箱などのゲームの状態は変えない。地図に入ったときに World76.switchTo が扱う）
// ・実機の GPU では未確認（作業環境のヘッドレス Chromium の画像でだけ確認）
import * as THREE from 'three';
import { MapScene3D } from '../world/MapScene3D.js';
import { Env } from '../environment/Env.js';

const NEAR = 48, DROP = 72, MAXSHOWN = 8, WALL = 44;   // WALL：霧・嵐の壁を出す距離
let mistTex = null, stormTex = null;
function gradTex(c0, c1) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(' + c0 + ',0.0)'); gr.addColorStop(0.08, 'rgba(' + c0 + ',0.85)'); gr.addColorStop(0.55, 'rgba(' + c1 + ',0.55)'); gr.addColorStop(1, 'rgba(' + c1 + ',0)');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mistTexture() { return mistTex || (mistTex = gradTex('70,74,96', '90,92,118')); }
function stormTexture() { return stormTex || (stormTex = gradTex('40,44,60', '70,74,92')); }
export class Join76 {
  constructor(app) { this.app = app; this.shown = new Map(); this.building = null; this.buildingMap = null; this.lastCheck = 0; this.walls = new Map(); this.crossings = 0; }
  W76() { const w = window.World76; return w && w.on && w.on() ? w : null; }
  active() { const W76 = this.W76(); const cur = this.app.current; return !!(W76 && cur && cur.map && cur.map.kind === 'field' && !cur.interior && W76.inGrid(cur.map.id)); }
  // 主人公の世界の座標
  pg() { const o = this.W76().origin(this.app.current.map.id); return { x: o.x + this.app.pos.x, y: o.y + this.app.pos.z }; }
  // 端を越えた：いまの位置・カメラを新しい地図の座標へずらす
  shift(ev) {
    const a = this.app; const dx = ev.dx, dz = ev.dy; const p = window.World.player;
    a.pos.x -= dx; a.pos.z -= dz; a.camera.target.x -= dx; a.camera.target.z -= dz;
    if (a._focus) { a._focus.x -= dx; a._focus.z -= dz; }
    if (a.followers) a.followers.forEach((f) => { if (f.ch) { f.ch.root.position.x -= dx; f.ch.root.position.z -= dz; } });
    if (window.Follow && window.Follow.shift) window.Follow.shift(-dx, -dz, window.World.map); else if (window.Follow && window.Follow.reset) window.Follow.reset(window.World.map, a.pos.x, a.pos.z, p.dir);
    a.lastMap = window.World.map; a.lastTile = [p.x, p.y]; this.crossings++;
  }
  // まわりの地図を並べ直す
  layout() {
    const a = this.app; const want = new Map(); const W76 = this.W76();
    if (this.active()) { const cur = a.current.map.id; const o0 = W76.origin(cur); const g = this.pg(); const list = [];
      for (const id of W76.mapsIn(g.x - DROP, g.y - DROP, g.x + DROP, g.y + DROP)) { if (id === cur) continue; const ms = a.cache.get(id); if (!ms || !ms.map || ms.map !== window.World.maps[id]) continue; const o = W76.origin(id); list.push({ id, ms, nb: { id, dx: o.x - o0.x, dy: o.y - o0.y }, d: W76.distTo(id, g.x, g.y) }); }
      list.sort((p, q) => p.d - q.d).slice(0, MAXSHOWN).forEach((e) => want.set(e.id, e)); }
    for (const [id, e] of this.shown) if (!want.has(id) || want.get(id).ms !== e.ms) { if (e.ms !== a.current) a.scene.remove(e.ms.root); this.shown.delete(id); }
    for (const [id, e] of want) { e.ms.root.position.set(e.nb.dx, 0, e.nb.dy); if (!this.shown.has(id)) { a.scene.add(e.ms.root); a.lighting.registerScene(e.ms.root); } this.shown.set(id, e); }
    if (a.current) a.current.root.position.set(0, 0, 0);
    this.updateWalls();
  }
  // 霧の壁（まだ行けない地域のまわり）・嵐の壁（世界の果て）。世界の座標で決めて、いまの地図の原点からずらして置く
  updateWalls() {
    const a = this.app; const W76 = this.W76(); const want = new Map();
    if (this.active()) {
      const g = this.pg(); const S = W76.size();
      for (const id of W76.mapsIn(g.x - WALL, g.y - WALL, g.x + WALL, g.y + WALL)) { if (!W76.isRegion(id) || W76.unlocked(id)) continue; const r = W76.rect(id);
        want.set('L:' + id + ':n', { x0: r.x, z0: r.y, x1: r.x + r.w, z1: r.y, kind: 'mist' }); want.set('L:' + id + ':s', { x0: r.x, z0: r.y + r.h, x1: r.x + r.w, z1: r.y + r.h, kind: 'mist' });
        want.set('L:' + id + ':w', { x0: r.x, z0: r.y, x1: r.x, z1: r.y + r.h, kind: 'mist' }); want.set('L:' + id + ':e', { x0: r.x + r.w, z0: r.y, x1: r.x + r.w, z1: r.y + r.h, kind: 'mist' }); }
      if (g.y < WALL) want.set('E:n', { x0: 0, z0: 0, x1: S.w, z1: 0, kind: 'storm' }); if (S.h - g.y < WALL) want.set('E:s', { x0: 0, z0: S.h, x1: S.w, z1: S.h, kind: 'storm' });
      if (g.x < WALL) want.set('E:w', { x0: 0, z0: 0, x1: 0, z1: S.h, kind: 'storm' }); if (S.w - g.x < WALL) want.set('E:e', { x0: S.w, z0: 0, x1: S.w, z1: S.h, kind: 'storm' });
    }
    for (const [k, mesh] of this.walls) if (!want.has(k)) { a.scene.remove(mesh); mesh.geometry.dispose(); this.walls.delete(k); }
    if (!want.size) return; const o0 = W76.origin(a.current.map.id);
    const mistMat = this._wallMat || (this._wallMat = new THREE.MeshBasicMaterial({ map: mistTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, color: 0xffffff }));
    const stormMat = this._stormMat || (this._stormMat = new THREE.MeshBasicMaterial({ map: stormTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, color: 0xffffff }));
    for (const [k, w] of want) { let mesh = this.walls.get(k);
      if (!mesh) { const len = Math.max(Math.abs(w.x1 - w.x0), Math.abs(w.z1 - w.z0)); const hh = w.kind === 'storm' ? 14 : 9; mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, hh, 1, 1), w.kind === 'storm' ? stormMat : mistMat); mesh.renderOrder = 5; mesh.name = 'join76_' + k; mesh.userData.h = hh; if (w.x0 === w.x1) mesh.rotation.y = Math.PI / 2; a.scene.add(mesh); this.walls.set(k, mesh); }
      mesh.position.set((w.x0 + w.x1) / 2 - o0.x, mesh.userData.h * 0.38, (w.z0 + w.z1) / 2 - o0.y); }
  }
  clear() { const a = this.app; for (const [, e] of this.shown) if (e.ms !== a.current) a.scene.remove(e.ms.root); this.shown.clear(); for (const [, mesh] of this.walls) { a.scene.remove(mesh); mesh.geometry.dispose(); } this.walls.clear(); }
  keeps(id) { return this.shown.has(id) || this.building === id; }
  // 毎フレーム：並べた地図の水面の動き・遠近の切り替え。ときどき：近い地図を組み立てる・遠いものを外す
  update(dt, t, now) {
    const a = this.app; if (!this.active()) { if (this.shown.size || this.walls.size) this.clear(); return; }
    for (const [, e] of this.shown) { const w = e.ms.world; if (w) { w.update(t); if (w.updateLod) w.updateLod({ x: a.pos.x - e.nb.dx, y: a.pos.y, z: a.pos.z - e.nb.dy }); } }
    if (now - this.lastCheck < 700) return; this.lastCheck = now;
    this.layout();
    if (this.building || a.building) return;
    const W76 = this.W76(); const g = this.pg(); const cur = a.current.map.id; let pick = null;
    for (const id of W76.mapsIn(g.x - NEAR, g.y - NEAR, g.x + NEAR, g.y + NEAR)) { if (id === cur || a.failed[id]) continue; const c = a.cache.get(id); if (c && c.map === window.World.maps[id]) continue; const dist = W76.distTo(id, g.x, g.y); if (!pick || dist < pick.dist) pick = { id, dist }; }
    if (pick) this.build(pick.id);
  }
  // 裏で組み立てる：組み立ての途中（地面・水・壁・木・建物などの区切り）で 1 フレーム画面へ返す（ゲームが止まる時間を短くする）。
  //   最後に、映す前にシェーダーを用意する（compileAsync。初めて映るときの引っかかりを減らす。4 秒で打ち切り）
  //   止まった時間（区切りの間の一番長い時間）は stats.slice_<地域> に残す（確認用）
  build(id) {
    const a = this.app; let m; try { m = window.World.getMap(id); } catch (e) { a.failed[id] = true; return; }
    this.building = id; this.buildingMap = m; const ms = new MapScene3D(a); const t0 = performance.now();
    const st = { id, n: 0, max: 0, sum: 0, compileMs: null }; this.sliceStats = st; let last = performance.now();
    const mark = () => { const d = performance.now() - last; st.n++; st.sum += d; if (d > st.max) st.max = d; };
    const slice = () => { if (performance.now() - last < 24) return Promise.resolve(); mark(); return new Promise((r) => requestAnimationFrame(() => setTimeout(() => { last = performance.now(); r(); }, 0))); };   // 24ms 以上続けて動いたときだけ画面へ返す
    ms.build(m, { slice }).then(async () => {
      await slice();
      const R = a.renderer && a.renderer.renderer; const cam = a.camera && a.camera.camera;
      if (R && R.compileAsync && cam) {
        const tc = performance.now(); let pr = null; try { pr = R.compileAsync(ms.root, cam, a.scene); } catch (e) { pr = null; }
        const sync = performance.now() - tc; st.n++; st.sum += sync; if (sync > st.max) st.max = sync; st.compileSync = Math.round(sync);   // 用意の始め（同期の部分）も止まる時間に数える
        if (pr) { try { await Promise.race([pr, new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* 用意できなくても表示はできる */ } }
        st.compileMs = Math.round(performance.now() - tc); last = performance.now();
      }
      // 画像（テクスチャ）も先に GPU へ送る（初めて映るフレームでまとめて送らない）。1 フレームに 25ms まで
      if (R && R.initTexture) {
        const texs = new Set(); ms.root.traverse((o) => { const mm = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; mm.forEach((mt) => { if (!mt) return; for (const k in mt) { const v = mt[k]; if (v && v.isTexture) texs.add(v); } if (mt.uniforms) for (const k in mt.uniforms) { const v = mt.uniforms[k] && mt.uniforms[k].value; if (v && v.isTexture) texs.add(v); } }); });
        let tb = performance.now(); st.textures = texs.size;
        for (const tx of texs) { try { R.initTexture(tx); } catch (e) { /* 送れなくても映すときに送られる */ } if (performance.now() - tb > 25) { await slice(); tb = performance.now(); } }
        mark(); last = performance.now();
      }
      mark();
      const old = a.cache.get(id); if (old && old !== ms && old !== a.current) { try { old.dispose(); } catch (e) { /* なし */ } }
      a.cache.set(id, ms); ms.usedAt = performance.now(); a.stats['build_' + id] = Math.round(performance.now() - t0); a.stats['slice_' + id] = Math.round(st.max); this.building = null; this.buildingMap = null;
      if (window.World.map === m && a.current !== ms) a.activate(ms); else this.layout();
      if (a.trimCache) a.trimCache(id);   // 並べていない古い地図は捨てる（長い航海でメモリが増え続けないように。並べている・組み立て中のものは残す）
    }).catch((e) => {
      this.building = null; this.buildingMap = null; try { ms.dispose(); } catch (e2) { /* なし */ }
      if (e && e.envRecipe && !Env.errors[id]) { Env.errors[id] = String(e.message); console.warn('[環境] レシピを使わずに組み立て直す', id, e.cause || e); this.build(id); return; }   // GameBridge.ensure と同じ（レシピなしでもう一度）
      console.error('join76 build failed', id, e); a.failed[id] = true; });
  }
}
