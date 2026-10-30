/* =========================================================
   3Dモデル・アニメーション確認ページ（viewer.html）
   ?model=hero&anim=Walk  … 指定のモデルと動きで開く
   ?lineup=characters     … キャラクターを横に並べる（見た目の比較用）
   ?lineup=props          … 小物・家具・木を並べる
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ModelManager } from './engine/ModelManager.js';
import { Character3D } from './entities/Character3D.js';
import { MODELS, ANIMS } from './assets/manifest.js';

const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a3550); scene.fog = new THREE.Fog(0x2a3550, 18, 40);
const cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 200); cam.position.set(2.2, 1.7, 3.4);
const ctl = new OrbitControls(cam, renderer.domElement); ctl.target.set(0, 0.7, 0); ctl.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xdde8ff, 0x4a4030, 1.2));
const sun = new THREE.DirectionalLight(0xfff2e0, 2.6); sun.position.set(3, 6, 4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -6; sc.right = sc.top = 6; sun.shadow.bias = -0.0004; scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshStandardMaterial({ color: 0x5d7a3e, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(12, 12, 0x88aa66, 0x6a8a50); grid.position.y = 0.002; grid.material.opacity = 0.35; grid.material.transparent = true; scene.add(grid);

const models = new ModelManager('./');
let active = []; const clock = new THREE.Clock();
const sel = document.getElementById('model'), animsEl = document.getElementById('anims'), info = document.getElementById('info');
Object.keys(MODELS).forEach((id) => { const o = document.createElement('option'); o.value = id; o.textContent = (MODELS[id].kind === 'character' ? '【キャラ】' : '') + id; sel.appendChild(o); });

function clear() { active.forEach((a) => scene.remove(a.root || a)); active = []; animsEl.innerHTML = ''; }
function stats(obj) { let tris = 0, bones = 0, mats = new Set(); obj.traverse((o) => { if (o.isMesh) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); } if (o.isBone) bones++; }); return { tris: Math.round(tris), bones, mats: mats.size }; }

async function show(id, anim) {
  clear(); sel.value = id; const def = MODELS[id];
  if (def.kind === 'character') {
    const c = await Character3D.create(models, id); scene.add(c.root); active.push(c);
    ANIMS.forEach((a) => { const b = document.createElement('button'); b.textContent = a; b.dataset.a = a; b.disabled = !c.has(a); b.onclick = () => { c.play(a, 0.2, { back: 'Idle' }); mark(a); }; animsEl.appendChild(b); });
    const mark = (a) => animsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.a === a));
    const s = stats(c.model); const box = new THREE.Box3().setFromObject(c.model);
    info.textContent = `三角形 ${s.tris} ／ 骨 ${s.bones} ／ マテリアル ${s.mats}\n高さ ${(box.max.y - box.min.y).toFixed(2)}（1タイル＝1.0）\nアニメーション：${Object.keys(c.actions).join(', ')}\n状態：${def.status}${def.fallback ? '（代替：' + def.fallback + '）' : ''}`;
    const a = anim && c.has(anim) ? anim : 'Idle'; c.play(a, 0); mark(a);
    ctl.target.set(0, 0.75, 0); cam.position.set(1.9, 1.5, 3.1);
  } else {
    const o = await models.clone(id); scene.add(o); active.push(o);
    const s = stats(o); const box = new THREE.Box3().setFromObject(o); const size = box.getSize(new THREE.Vector3());
    info.textContent = `三角形 ${s.tris} ／ マテリアル ${s.mats}\n大きさ ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`;
    const r = Math.max(size.x, size.y, size.z); ctl.target.set(0, size.y * 0.45, 0); cam.position.set(r * 1.3 + 0.6, r * 0.9 + 0.4, r * 1.7 + 0.8);
  }
  history.replaceState(null, '', '?model=' + id + (anim ? '&anim=' + anim : ''));
}
async function lineup(kind) {
  clear(); const ids = Object.keys(MODELS).filter((id) => kind === 'characters' ? MODELS[id].kind === 'character' : MODELS[id].kind !== 'character');
  const anim = q.get('anim') || 'Idle';
  let x = 0; const gap = kind === 'characters' ? 0.9 : 1.6;
  for (const id of ids) {
    if (kind === 'characters') { const c = await Character3D.create(models, id); c.root.position.x = x; scene.add(c.root); c.play(c.has(anim) ? anim : 'Idle', 0); active.push(c); }
    else { const o = await models.clone(id); const b = new THREE.Box3().setFromObject(o); const w = b.max.x - b.min.x; x += w / 2; o.position.x = x; scene.add(o); active.push(o); x += w / 2 + 0.3; continue; }
    x += gap;
  }
  const mid = kind === 'characters' ? (ids.length - 1) * gap / 2 : x / 2;
  ctl.target.set(mid, 0.7, 0); cam.position.set(mid, kind === 'characters' ? 1.6 : 4, kind === 'characters' ? 6.5 : 14);
  info.textContent = ids.length + '体を並べて表示（' + anim + '）';
}
sel.onchange = () => show(sel.value);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
renderer.setAnimationLoop(() => { const dt = Math.min(0.05, clock.getDelta()); active.forEach((a) => a.update && a.update(dt)); ctl.update(); renderer.render(scene, cam); });
if (q.get('lineup')) lineup(q.get('lineup')); else show(q.get('model') || 'hero', q.get('anim'));
window.viewerReady = true;
