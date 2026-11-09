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
import { TickerRing } from '../world/Ticker82.js';
import { buildCastle82 } from '../world/Castle82.js';
// v8.2 浮天城アエリア：アエリアの地域の上の空に、浮く白い城の大きな輪郭（地球全体の座標で 1 つ。海の上から見える）
export const AERIA82 = { lon: -152, lat: 21, y: 9, w: 20, d: 10, far: 110 };
// v8.2 アズール大洋の中央の巨大な円形ティックテープ：地球全体の座標で 1 つだけ（地図の区画には入れない＝区画の境で消えない・増えない・飛ばない）。東西の一周はいまの地図から近い側
export const OCEAN82 = { lon: -145, lat: 5, radius: 8.5, band: 2.2, y: 6, repeat: 3, speed: 0.015, far: 150 };   // 半径：提案の 20〜28 では、船のいつものカメラ（見える範囲は横 約 36・縦 約 24 マス）にリング全体が入らないため 8.5（docs/arch82/REPORT82.md）

const NEAR = 48, DROP = 72, MAXSHOWN = 8, WALL = 44;   // WALL：霧・嵐の壁を出す距離
let mistTex = null, stormTex = null;
function gradTex(c0, c1) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(' + c0 + ',0.0)'); gr.addColorStop(0.08, 'rgba(' + c0 + ',0.85)'); gr.addColorStop(0.55, 'rgba(' + c1 + ',0.55)'); gr.addColorStop(1, 'rgba(' + c1 + ',0)');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mistTexture() { return mistTex || (mistTex = gradTex('70,74,96', '90,92,118')); }
function stormTexture() { return stormTex || (stormTex = gradTex('40,44,60', '70,74,92')); }
// v8.3 浮天城アエリアの影と雲：海面に落ちる大きな影（ふつうの船のカメラで見える）と、城の下にかかる雲（城は雲の上＝物語のとおり）
function softTex(rgba, size) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gr.addColorStop(0, rgba); gr.addColorStop(0.55, rgba.replace(/[\d.]+\)$/, '0.6)')); gr.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function aeriaFx83() {
  const group = new THREE.Group(); group.name = 'aeria83_fx'; const owned = [];
  const shTex = softTex('rgba(0,0,0,1)', 128); owned.push(shTex);
  const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }); owned.push(shMat);
  const shGeo = new THREE.PlaneGeometry(AERIA82.w * 1.5, AERIA82.d * 2.2); shGeo.rotateX(-Math.PI / 2); owned.push(shGeo);
  const shadow = new THREE.Mesh(shGeo, shMat); shadow.position.y = 0.12; shadow.renderOrder = 1; group.add(shadow);
  const clTex = softTex('rgba(255,255,255,0.95)', 128); owned.push(clTex); const clouds = [];
  for (let i = 0; i < 9; i++) { const m = new THREE.SpriteMaterial({ map: clTex, transparent: true, opacity: 0.8, depthWrite: false }); owned.push(m); const sp = new THREE.Sprite(m); const ang = i / 9 * Math.PI * 2; const r = AERIA82.w * (0.42 + (i % 3) * 0.12); sp.userData = { ang, r, h: AERIA82.y - 1.2 + (i % 2) * 0.9, s: 7 + (i % 3) * 2.5 }; sp.scale.set(sp.userData.s, sp.userData.s * 0.42, 1); group.add(sp); clouds.push(sp); }
  return { group, info: () => ({ clouds: clouds.length }),
    update(cx, cz, t) { shadow.position.x = cx; shadow.position.z = cz + 1.5; clouds.forEach((c) => { const u = c.userData; const a = u.ang + t * 0.02; c.position.set(cx + Math.cos(a) * u.r, u.h + Math.sin(t * 0.5 + u.ang) * 0.25, cz + Math.sin(a) * u.r * 0.55); }); },
    dispose() { if (group.parent) group.parent.remove(group); owned.forEach((o) => { try { o.dispose(); } catch (e) { /* なし */ } }); } };
}
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
      for (const id of W76.mapsIn(g.x - DROP, g.y - DROP, g.x + DROP, g.y + DROP)) { if (id === cur) continue; const ms = a.cache.get(id); if (!ms || !ms.map || ms.map !== window.World.maps[id]) continue; const o = W76.origin(id, cur); list.push({ id, ms, nb: { id, dx: o.x - o0.x, dy: o.y - o0.y }, d: W76.distTo(id, g.x, g.y) }); }   // v7.8 東西の一周：いまの地図から見て近い側
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
      const cur0 = a.current.map.id; for (const id of W76.mapsIn(g.x - WALL, g.y - WALL, g.x + WALL, g.y + WALL)) { if ((!W76.earth && !W76.isRegion(id)) || W76.unlocked(id)) continue; const r0 = W76.rect(id); const r = { x: W76.origin(id, cur0).x, y: r0.y, w: r0.w, h: r0.h };   // v7.8 地球：外の地図も（近い地域の条件）
        want.set('L:' + id + ':n', { x0: r.x, z0: r.y, x1: r.x + r.w, z1: r.y, kind: 'mist' }); want.set('L:' + id + ':s', { x0: r.x, z0: r.y + r.h, x1: r.x + r.w, z1: r.y + r.h, kind: 'mist' });
        want.set('L:' + id + ':w', { x0: r.x, z0: r.y, x1: r.x, z1: r.y + r.h, kind: 'mist' }); want.set('L:' + id + ':e', { x0: r.x + r.w, z0: r.y, x1: r.x + r.w, z1: r.y + r.h, kind: 'mist' }); }
      if (g.y < WALL) want.set('E:n', { x0: 0, z0: 0, x1: S.w, z1: 0, kind: 'storm' }); if (S.h - g.y < WALL) want.set('E:s', { x0: 0, z0: S.h, x1: S.w, z1: S.h, kind: 'storm' });
      if (!(W76.wrap && W76.wrap()) && g.x < WALL) want.set('E:w', { x0: 0, z0: 0, x1: 0, z1: S.h, kind: 'storm' }); if (!(W76.wrap && W76.wrap()) && S.w - g.x < WALL) want.set('E:e', { x0: S.w, z0: 0, x1: S.w, z1: S.h, kind: 'storm' });
    }
    for (const [k, mesh] of this.walls) if (!want.has(k)) { a.scene.remove(mesh); mesh.geometry.dispose(); this.walls.delete(k); }
    if (!want.size) return; const o0 = W76.origin(a.current.map.id);
    const mistMat = this._wallMat || (this._wallMat = new THREE.MeshBasicMaterial({ map: mistTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, color: 0xffffff }));
    const stormMat = this._stormMat || (this._stormMat = new THREE.MeshBasicMaterial({ map: stormTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, color: 0xffffff }));
    for (const [k, w] of want) { let mesh = this.walls.get(k);
      if (!mesh) { const len = Math.max(Math.abs(w.x1 - w.x0), Math.abs(w.z1 - w.z0)); const hh = w.kind === 'storm' ? 14 : 9; mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, hh, 1, 1), w.kind === 'storm' ? stormMat : mistMat); mesh.renderOrder = 5; mesh.name = 'join76_' + k; mesh.userData.h = hh; if (w.x0 === w.x1) mesh.rotation.y = Math.PI / 2; a.scene.add(mesh); this.walls.set(k, mesh); }
      mesh.position.set((w.x0 + w.x1) / 2 - o0.x, mesh.userData.h * 0.38, (w.z0 + w.z1) / 2 - o0.y); }
  }
  // 世界の座標（マス）→ いまの地図の座標。東西の一周は近い側
  ocean82() {
    const a = this.app; const W76 = this.W76(); const L = window.EARTH78_LAYOUT; if (!W76 || !L || !W76.earth || !this.active()) { this.oceanOff(); return; }
    const o0 = W76.origin(a.current.map.id); const gx = L.xOf(OCEAN82.lon), gz = L.yOf(OCEAN82.lat); const dx = W76.dxWrap ? W76.dxWrap(gx - o0.x - a.pos.x) : gx - o0.x - a.pos.x; const rx = a.pos.x + dx, rz = gz - o0.y;
    const dist = Math.hypot(dx, rz - a.pos.z); if (dist > OCEAN82.far + (this.ocean ? 20 : 0)) { this.oceanOff(); return; }   // 出し入れの境に少し幅（行ったり来たりで作り直さない）
    if (!this.ocean) { this.ocean = new TickerRing({ radius: OCEAN82.radius, band: OCEAN82.band, y: OCEAN82.y, repeat: OCEAN82.repeat, speed: OCEAN82.speed, seg: 128, big: true, cutout: false }); this.ocean.group.name = 'ticker82_ocean'; this.oceanBuilt = (this.oceanBuilt || 0) + 1; }
    if (!this.ocean.group.parent) a.scene.add(this.ocean.group);
    this.ocean.group.position.set(rx, 0, rz); this.ocean.group.children.forEach((c) => { if (c.name === 'ticker82_inner' || c.geometry === this.ocean.tg) c.visible = dist < 90; });   // 遠い：外の帯だけ（遠方の簡略）
    this.oceanDist = dist;
  }
  oceanOff() { if (this.ocean) { this.ocean.dispose(); this.ocean = null; } }
  aeria82() {
    const a = this.app; const W76 = this.W76(); const L = window.EARTH78_LAYOUT; if (!W76 || !L || !W76.earth || !this.active()) { this.aeriaOff(); return; }
    const o0 = W76.origin(a.current.map.id); const gx = L.xOf(AERIA82.lon), gz = L.yOf(AERIA82.lat); const dx = W76.dxWrap ? W76.dxWrap(gx - o0.x - a.pos.x) : gx - o0.x - a.pos.x; const rz = gz - o0.y; const dist = Math.hypot(dx, rz - a.pos.z);
    if (dist > AERIA82.far + (this.aeria ? 20 : 0)) { this.aeriaOff(); return; }
    if (!this.aeria) { const c = buildCastle82('aeria', { w: AERIA82.w, d: AERIA82.d, seed: 512 }); this.aeria = c.group; this.aeria.name = 'aeria82_sky'; this.aeriaFx = aeriaFx83(); }
    if (!this.aeria.parent) a.scene.add(this.aeria); if (this.aeriaFx && !this.aeriaFx.group.parent) a.scene.add(this.aeriaFx.group);
    const cx = a.pos.x + dx, cz = rz; const tt = performance.now() / 1000;
    this.aeria.position.set(cx - AERIA82.w / 2, AERIA82.y + Math.sin(tt / 2.4) * 0.3, cz - AERIA82.d / 2); this.aeriaDist = dist;
    if (this.aeriaFx) this.aeriaFx.update(cx, cz, tt);   // v8.3 海に落ちる城の影・城の下の雲
    // v8.3 船でアエリアの影の海に入ったとき（js/rpg/astra78.js の「空が、急に暗くなった…」と同じ所）：5 秒だけ、空の城を見上げるカメラ。1 分に 1 回まで
    const S = window.State && State.data; const nowMs = performance.now();
    if (S && S.aboard && S.aboard !== 'airship' && dist < 12 && a.camera && a.camera.setCine && !a.camera.cine && (!this._aeriaCine || nowMs - this._aeriaCine > 60000)) {
      this._aeriaCine = nowMs; this.aeriaCineN = (this.aeriaCineN || 0) + 1; const cam = a.camera;
      try { cam.setCine({ x: cx, y: AERIA82.y + 5, z: cz, dist: 66, pitch: 5 }); } catch (e) { /* なし */ }
      setTimeout(() => { try { if (cam.cine && cam.cine.y === AERIA82.y + 5) cam.setCine(null); } catch (e) { /* なし */ } }, 5200);
    }
  }
  // v8.3 アエリアの見え方：船・飛空艇でアエリアに近づく（55 マス以内）と、カメラの角度を寝かせて遠くの空を見せる（いつものカメラは真上寄りで、空の城が画面の外だった）
  aeriaZone82(pos) {
    const d = this.aeria && this.aeria.parent ? this.aeriaDist : null; if (d === null || d === undefined || d > 55) return null;
    const S = window.State && State.data; if (!S || !S.aboard) return null;   // 歩いているときは変えない（船着き場の上など）
    const k = Math.max(0, Math.min(1, (55 - d) / 30)); return { pitch: 40 - 14 * k, dist: 24 + 8 * k };
  }
  aeriaOff() { if (this.aeria) { if (this.aeria.parent) this.aeria.parent.remove(this.aeria); this.aeria.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.aeria = null; } if (this.aeriaFx) { this.aeriaFx.dispose(); this.aeriaFx = null; } }
  oceanInfo() { const o = this.ocean; return o ? Object.assign({ x: +o.group.position.x.toFixed(2), z: +o.group.position.z.toFixed(2), dist: +(this.oceanDist || 0).toFixed(1), built: this.oceanBuilt, inScene: !!o.group.parent }, o.info()) : { none: true, built: this.oceanBuilt || 0 }; }
  clear() { const a = this.app; this.oceanOff(); this.aeriaOff(); for (const [, e] of this.shown) if (e.ms !== a.current) a.scene.remove(e.ms.root); this.shown.clear(); for (const [, mesh] of this.walls) { a.scene.remove(mesh); mesh.geometry.dispose(); } this.walls.clear(); }
  keeps(id) { return this.shown.has(id) || this.building === id; }
  // 毎フレーム：並べた地図の水面の動き・遠近の切り替え。ときどき：近い地図を組み立てる・遠いものを外す
  update(dt, t, now) {
    const a = this.app; if (!this.active()) { if (this.shown.size || this.walls.size || this.ocean || this.aeria) this.clear(); return; }
    try { this.ocean82(); if (this.ocean) this.ocean.update(t); this.aeria82(); } catch (e) { if (!this.oceanErr) { this.oceanErr = String(e && e.message || e); console.warn('ocean82', e); } }
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
    // v8.9 長かった区切り（50ms 以上）の場所も残す（確かめ用：sliceStats.long。どこで画面へ返したか＝区切りの終わりの呼び出し元）
    let from89 = 'start'; const site89 = () => { try { const L = String(new Error().stack || '').split('\n').map((x) => x.trim()).filter((x) => /^at /.test(x)); const q = L.find((x, i) => i >= 2 && !/slice|mark|Promise/.test(x)) || L[2] || ''; return q.replace(/^at /, '').replace(/\(?(https?:\/\/[^)]*\/)?/, '').replace(/\)$/, '').slice(0, 90); } catch (e) { return '?'; } };
    const mark = () => { const d = performance.now() - last; st.n++; st.sum += d; if (d > st.max) st.max = d; const to = site89(); if (d > 50) (st.long = st.long || []).push({ ms: Math.round(d), from: from89, to }); from89 = to; };
    const slice = () => { if (performance.now() - last < 24) return Promise.resolve(); mark(); return new Promise((r) => requestAnimationFrame(() => setTimeout(() => { last = performance.now(); r(); }, 0))); };   // 24ms 以上続けて動いたときだけ画面へ返す
    ms.build(m, { slice }).then(async () => {
      await slice();
      try { if (m.kind === 'field' && window.World && window.World.landmarkFoot) { window.World.landmarkFoot(m); await slice(); } } catch (e) { /* 入口のまわりの計算は、最初の 1 歩でもできる */ }   // v8.9 フィールドの入口のまわり（最初の 1 歩で計算していたもの）も先に
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
