/* =========================================================
   roomdeco76（v7.6）：屋内を「部屋らしく」する飾り（room_kit.js から呼ぶ）
   ・暖炉：家・宿・酒場（しっくいの部屋）と城の広間。奥の壁の1マスを炉の口にして、石の枠・炉棚・炉床・薪と火（揺れる）・灯り
     前のマスが通れて、人・出入口・宝箱・出来事・背の高い家具・店の飾りがない所だけ。両どなりも奥の壁であること
   ・木組み：しっくいの部屋の奥の壁に、3マスごとの柱・壁の上の太い梁（桁）・梁の端（天井の梁が壁から出ている形）と腕木
   ・窓と光の帯：外に面した奥の壁に窓（昼は明るい空・夜は暗い）と、窓から床へ差す光の帯・床の光（昼だけ。影は落とさない）
   ・しっくいの壁：むら・うすい汚れの模様（以前は一色）
   ・当たり判定・タイル・人・出来事は変えない。歩けるマスへは 0.1 まで（炉棚は 1.5 の高さで 0.22）・体の高さ（1.85）より上は 0.6 まで
   ========================================================= */
import * as THREE from 'three';
import { plain } from '../EnvKit3D.js';
import { canvasTex, texMat, wbox } from './geo.js';

const FIRE_USE = { house: 1, inn: 1, tavern: 1 };

// しっくい：むら・うすい汚れ（明るさだけの模様。色は hex を掛ける）
export function plasterMat76(hex) {
  const t = canvasTex('plaster76', 256, 256, (g, W, H) => {
    g.fillStyle = 'rgb(246,244,240)'; g.fillRect(0, 0, W, H); let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 420; i++) { const x = r() * W, y = r() * H, rr = 4 + r() * 22, a = 0.025 + r() * 0.05; const gr = g.createRadialGradient(x, y, 0, x, y, rr); const d = r() < 0.5; gr.addColorStop(0, d ? 'rgba(120,100,80,' + a + ')' : 'rgba(255,255,255,' + a * 1.6 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; for (const ox of [0, -W, W]) for (const oy of [0, -H, H]) g.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2); }
    for (let i = 0; i < 6; i++) { const x = r() * W, w = 6 + r() * 14; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(110,90,70,0)'); gr.addColorStop(0.7, 'rgba(110,90,70,0.05)'); gr.addColorStop(1, 'rgba(110,90,70,0)'); g.fillStyle = gr; g.fillRect(x, 0, w, H); }   // 縦のうすい筋
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(90,80,70,' + (0.05 + r() * 0.06) + ')'; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }   // 小さな傷
  });
  return texMat('plaster76_' + hex, t, { color: new THREE.Color(hex), roughness: 0.92 });
}

// 光の帯・床の光（上が明るく下へ消える）
let shaftM = null, patchM = null;
function shaftMat() {
  if (shaftM) return shaftM;
  const t = canvasTex('shaft76', 64, 128, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); const sx = g.createLinearGradient(0, 0, W, 0); sx.addColorStop(0, 'rgba(0,0,0,1)'); sx.addColorStop(0.18, 'rgba(0,0,0,0)'); sx.addColorStop(0.82, 'rgba(0,0,0,0)'); sx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = sx; g.fillRect(0, 0, W, H); });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  shaftM = new THREE.MeshBasicMaterial({ map: t, color: 0xfff0d0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  shaftM.userData.dayGlow = 0.22; shaftM.userData.noShadow = true; shaftM.userData.noReceive = true; shaftM.visible = false; return shaftM;
}
function patchMat() {
  if (patchM) return patchM;
  const t = canvasTex('patch76', 64, 64, (g, W, H) => { const gr = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  patchM = new THREE.MeshBasicMaterial({ map: t, color: 0xffe8c0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  patchM.userData.dayGlow = 0.28; patchM.userData.noShadow = true; patchM.userData.noReceive = true; patchM.visible = false; return patchM;
}
function glassMat() { const m = plain('#cfe4f8', { emissive: '#d8ecff', ei: 0.9, keepGlow: true, std: { roughness: 0.2 } }); m.userData.dayEmissive = 0.9; m.userData.dayGlow = 1; return m; }

// 部屋の計画：暖炉の位置・窓・柱
export function planRoom76(o) {
  const { map, S, room, T, walkish, WALLS, TALL, dress } = o; const W = map.w, H = map.h; const U = S.archetype || 'house';
  const solid = (x, z) => !!(window.Tiles && window.Tiles.isSolid(T(x, z)));
  const key = (x, z) => x + ',' + z;
  const occ = new Set(); (map.npcs || []).forEach((n) => { occ.add(key(n.x, n.y)); if (n.ox !== undefined) occ.add(key(n.ox, n.oy)); }); (map.warps || []).forEach((w) => occ.add(key(w.x, w.y))); (map.chests || []).forEach((c) => occ.add(key(c.x, c.y))); (map.events || []).forEach((e) => { if (typeof e.x === 'number') occ.add(key(e.x, e.y)); });
  const WALLITEM = { wallShelf: 1, herbs: 1 };   // 壁に掛ける飾り（暖炉・窓の所では外す）
  const dressAt = new Set(); if (dress && dress.items) dress.items.forEach((it) => { if (it.what === 'rug' || it.what === 'lantern' || WALLITEM[it.what]) return; dressAt.add(key(it.x, it.z)); });
  const dropWallItems = (x0, x1, z) => { if (!dress || !dress.items) return; dress.items = dress.items.filter((it) => !(WALLITEM[it.what] && it.z === z && it.x >= x0 && it.x <= x1)); };
  const back = (x, z) => !!WALLS[T(x, z)] && walkish(x, z + 1) && x > 0 && x < W - 1;
  const outer = (x, z) => !walkish(x, z - 1);   // 外に面した壁（上が部屋でない）
  const res = { fire: null, windows: new Set(), side: new Map(), posts: new Set(), reserved: new Set(), stats: { fire: 0, windows: 0, side: 0, posts: 0 } };
  const fireOK = (S.fam === 'plaster' && FIRE_USE[U]) || room === 'hall';
  if (fireOK) {
    let best = null; const why = res.stats.why = { back: 0, occ: 0, dress: 0, tall: 0, solid: 0 };
    for (let z = 0; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
      if (!back(x, z) || !back(x - 1, z) || !back(x + 1, z)) { if (back(x, z)) why.back++; continue; }
      let ok = true; for (let dx = -1; dx <= 1; dx++) { const fx = x + dx, fz = z + 1; if (occ.has(key(fx, fz))) { ok = false; why.occ++; } else if (TALL[T(fx, fz)]) { ok = false; why.tall++; } else if (!dx && dressAt.has(key(fx, fz))) { ok = false; why.dress++; } }
      if (ok && solid(x, z + 1)) { ok = false; why.solid++; }   // 炉の口の前は通れる床
      if (!ok) continue;
      const sc = z * 100 + Math.abs(x - W * 0.3); if (!best || sc < best.sc) best = { x, z, sc };
    }
    if (best) { res.fire = { x: best.x, z: best.z, stone: S.fam === 'ashlar' ? S.stone[0] : '#b9ae9c' }; for (let dx = -1; dx <= 1; dx++) res.reserved.add(key(best.x + dx, best.z)); res.stats.fire = 1; dropWallItems(best.x - 1, best.x + 1, best.z + 1); }
  }
  const winOK = S.fam === 'plaster' || (S.fam === 'ashlar' && !room && !/church|archive|time|observatory|tower/.test(U));
  for (let z = 0; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (!back(x, z)) continue; const k = key(x, z);
    if (winOK && x % 6 === 4 && outer(x, z) && !res.reserved.has(k) && !TALL[T(x, z + 1)] && !dressAt.has(key(x, z + 1))) { res.windows.add(k); res.reserved.add(k); res.stats.windows++; dropWallItems(x, x, z + 1); continue; }
    if (S.fam === 'plaster' && x % 3 === 2 && back(x - 1, z) && !(res.fire && res.fire.z === z && x >= res.fire.x - 1 && x <= res.fire.x + 2)) { res.posts.add(k); res.stats.posts++; }
  }
  // 横の壁（外に面した西・東の壁）の窓：4マスごと。前（部屋の側）のマスに背の高い家具・店の飾りがない所
  if (winOK) for (let z = 2; z < H - 3; z++) for (const x of [0, W - 1]) {
    const dx = x === 0 ? 1 : -1; if (!WALLS[T(x, z)] || !walkish(x + dx, z) || walkish(x - dx, z) || z % 4 !== 2) continue;
    if (TALL[T(x + dx, z)] || dressAt.has(key(x + dx, z))) continue; res.side.set(key(x, z), dx); res.stats.side++;
  }
  return res;
}

// 横の壁の窓（dx：部屋の向き。+1＝西の壁、-1＝東の壁）
export function sideWindow76(R, x, z, dx, fx, o) {
  if (R.side.get(x + ',' + z) !== dx) return; const { add, addNo, trim } = o; const cz = z + 0.5; const y = 1.5, w = 0.74, hh = 0.86;
  add(glassMat(), wbox(0.02, hh - 0.06, w - 0.06, fx + dx * 0.012, y, cz));
  for (const [ww, h2, dz2, dy] of [[w + 0.06, 0.08, 0, hh / 2], [w + 0.06, 0.08, 0, -hh / 2], [0.08, hh, -w / 2, 0], [0.08, hh, w / 2, 0], [0.05, hh, 0, 0], [w, 0.05, 0, 0.08]]) add(trim, wbox(0.06, h2, ww, fx + dx * 0.03, y + dy, cz + dz2));
  add(trim, wbox(0.1, 0.06, w + 0.2, fx + dx * 0.05, y - hh / 2 - 0.06, cz));
  const top = y + hh / 2 - 0.05, bot = 0.03, d = 1.6; const sh = new THREE.BufferGeometry();
  sh.setAttribute('position', new THREE.Float32BufferAttribute([fx + dx * 0.03, top, cz - w / 2, fx + dx * 0.03, top, cz + w / 2, fx + dx * d, bot, cz + w / 2 + 0.15, fx + dx * d, bot, cz - w / 2 - 0.15], 3));
  sh.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); sh.setIndex([0, 2, 1, 0, 3, 2]); sh.computeVertexNormals(); addNo(shaftMat(), sh);
  const pt = new THREE.PlaneGeometry(1.0, 1.1); pt.rotateX(-Math.PI / 2); pt.translate(fx + dx * (d - 0.15), 0.035, cz); addNo(patchMat(), pt);
}

// 奥の壁のマスごと：柱・梁の端・窓と光の帯
export function wallExtras76(R, x, z, cx, fz, h, o) {
  const k = x + ',' + z; const { add, addNo, trim } = o;
  if (R.posts.has(k)) {
    add(trim, wbox(0.2, h - 0.95, 0.07, x, 0.95 + (h - 0.95) / 2, fz + 0.035));   // 柱（腰板の上から梁まで）
    add(trim, wbox(0.2, 0.2, 0.55, x, h - 0.1, fz + 0.275));   // 天井の梁の端
    const br = new THREE.BoxGeometry(0.1, 0.42, 0.08); br.rotateX(-0.72); br.translate(x, h - 0.36, fz + 0.15); add(trim, br);   // 腕木（下端 1.9 ほど）
  }
  if (R.windows.has(k)) {
    const y = 1.5, w = 0.74, hh = 0.86;
    add(glassMat(), wbox(w - 0.06, hh - 0.06, 0.02, cx, y, fz + 0.012));
    for (const [ww, h2, dx, dy] of [[w + 0.06, 0.08, 0, hh / 2], [w + 0.06, 0.08, 0, -hh / 2], [0.08, hh, -w / 2, 0], [0.08, hh, w / 2, 0], [0.05, hh, 0, 0], [w, 0.05, 0, 0.08]]) add(trim, wbox(ww, h2, 0.06, cx + dx, y + dy, fz + 0.03));
    add(trim, wbox(w + 0.2, 0.06, 0.1, cx, y - hh / 2 - 0.06, fz + 0.05));   // 窓台
    // 光の帯（窓から床へ）・床の光
    const top = y + hh / 2 - 0.05, bot = 0.03, d = 1.7; const sh = new THREE.BufferGeometry();
    sh.setAttribute('position', new THREE.Float32BufferAttribute([cx - w / 2, top, fz + 0.03, cx + w / 2, top, fz + 0.03, cx + w / 2 + 0.15, bot, fz + d, cx - w / 2 - 0.15, bot, fz + d], 3));
    sh.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); sh.setIndex([0, 2, 1, 0, 3, 2]); sh.computeVertexNormals(); addNo(shaftMat(), sh);
    const pt = new THREE.PlaneGeometry(1.1, 1.0); pt.rotateX(-Math.PI / 2); pt.translate(cx, 0.035, fz + d - 0.15); addNo(patchMat(), pt);
  }
}

// 暖炉（奥の壁の1マス：x,z。炉の口は南の面）
export function buildFireplace76(f, o) {
  const { add, g, scene, body, trim, h } = o; const x = f.x, z = f.z; const cx = x + 0.5, fz = z + 1;
  const stone = plain(f.stone, { std: { roughness: 0.92 } }), stoneD = plain('#6e665c', { std: { roughness: 0.95 } }), brick = plain('#5a3226', { std: { roughness: 0.95 } }), soot = plain('#1a1512', { std: { roughness: 1 } });
  const wood = plain('#6a4a30', { std: { roughness: 0.85 } }), iron = plain('#2e3034', { std: { roughness: 0.5, metalness: 0.5 } }), ember = plain('#ff6a20', { emissive: '#ff4a10', ei: 1.6, keepGlow: true });
  // 壁（炉の口のまわり）
  add(body, wbox(1, h, 0.5, cx, h / 2, z + 0.25)); add(body, wbox(1, h - 0.95, 0.5, cx, 0.95 + (h - 0.95) / 2, z + 0.75));
  for (const sx of [-1, 1]) add(body, wbox(0.05, 0.95, 0.5, cx + sx * 0.475, 0.475, z + 0.75));
  // 炉の中（煉瓦・すす）
  add(brick, wbox(0.9, 0.95, 0.04, cx, 0.475, z + 0.52)); for (const sx of [-1, 1]) add(brick, wbox(0.04, 0.95, 0.48, cx + sx * 0.43, 0.475, z + 0.75));
  add(soot, wbox(0.9, 0.04, 0.5, cx, 0.93, z + 0.75)); add(stoneD, wbox(0.9, 0.04, 0.5, cx, 0.02, z + 0.75));
  // 石の枠・炉棚・胸（煙突の張り出し）・炉床
  for (const sx of [-1, 1]) add(stone, wbox(0.35, 1.45, 0.08, cx + sx * 0.625, 0.725, fz + 0.04));
  add(stone, wbox(0.9, 0.5, 0.08, cx, 1.2, fz + 0.04)); add(stoneD, wbox(0.2, 0.22, 0.09, cx, 1.06, fz + 0.045));   // かなめ石
  add(wood, wbox(1.8, 0.08, 0.22, cx, 1.5, fz + 0.11)); for (const sx of [-1, 1]) add(wood, wbox(0.1, 0.18, 0.14, cx + sx * 0.75, 1.38, fz + 0.07));
  add(stone, wbox(1.36, h - 1.54, 0.06, cx, 1.54 + (h - 1.54) / 2, fz + 0.03));
  add(stoneD, wbox(1.5, 0.04, 0.42, cx, 0.02, fz + 0.21));
  // 薪・おき火
  for (const [dz, rz] of [[0.72, 0.1], [0.8, -0.12]]) { const lg = new THREE.CylinderGeometry(0.06, 0.06, 0.62, 7); lg.rotateZ(Math.PI / 2 + rz); lg.translate(cx, 0.1, z + dz); add(wood, lg); }
  add(ember, wbox(0.5, 0.03, 0.22, cx, 0.05, z + 0.76));
  // 炎（揺れる。MapScene3D の 'flame'）
  const fm = plain('#ffb050', { emissive: '#ff7a1a', ei: 2.4, keepGlow: true }), fm2 = plain('#ffe08a', { emissive: '#ffd060', ei: 2.0, keepGlow: true });
  for (const [px, pz, rr, hh, m] of [[-0.12, 0.74, 0.11, 0.42, fm], [0.12, 0.78, 0.1, 0.36, fm], [0.0, 0.72, 0.08, 0.5, fm2]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 7), m); c.position.set(cx + px, 0.12 + hh / 2, z + pz); c.castShadow = false; g.add(c); scene.animated.push({ kind: 'flame', obj: c }); }
  scene.lampSpots.push({ pos: new THREE.Vector3(cx, 0.6, fz + 0.5), color: 0xff8a3a, power: 1.6, dist: 6 });
  // 炉棚の上：燭台・皿・花瓶・絵
  const gold = plain('#c9a24a', { std: { roughness: 0.35, metalness: 0.6 } }), wax = plain('#f4ead8', { std: { roughness: 0.6 } }), flame = plain('#ffd080', { emissive: '#ffb040', ei: 2, keepGlow: true });
  for (const sx of [-0.65, 0.65]) { add(gold, new THREE.CylinderGeometry(0.05, 0.07, 0.05, 8).translate(cx + sx, 1.565, fz + 0.12)); add(wax, new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6).translate(cx + sx, 1.67, fz + 0.12)); add(flame, new THREE.ConeGeometry(0.02, 0.06, 5).translate(cx + sx, 1.78, fz + 0.12)); }
  add(plain('#e8e4dc', { std: { roughness: 0.4 } }), new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14).rotateX(Math.PI / 2 - 0.25).translate(cx - 0.25, 1.66, fz + 0.06));
  add(plain('#3e6a9a', { std: { roughness: 0.3 } }), new THREE.CylinderGeometry(0.05, 0.07, 0.18, 10).translate(cx + 0.28, 1.63, fz + 0.12)); add(plain('#e8506a', { std: { roughness: 0.8 } }), new THREE.IcosahedronGeometry(0.06, 0).translate(cx + 0.28, 1.76, fz + 0.12));
  add(trim, wbox(0.78, 0.56, 0.05, cx, 2.0, fz + 0.085)); add(plain('#8aa4c8', { std: { roughness: 0.9 } }), wbox(0.66, 0.44, 0.03, cx, 2.0, fz + 0.11));
  // 火かき棒（枠の横）
  add(iron, wbox(0.03, 0.78, 0.03, cx + 0.88, 0.4, fz + 0.05)); add(iron, wbox(0.12, 0.03, 0.03, cx + 0.88, 0.8, fz + 0.05));
}
