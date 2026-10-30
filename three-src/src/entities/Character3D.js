/* =========================================================
   Character3D：スキンつきキャラクター（GLB）＋アニメーション（Idle/Walk/Run/Attack/Cast/Hit/Defend/Victory/Defeat）
   ・root（足元が原点）→ model（拡大率・向きの補正）
   ・play(name) でクロスフェード。単発の動き（Attack など）は終わると Idle に戻る
   ・足元の丸い影（接地感）と、建物の陰に隠れたときのシルエット表示（主人公のみ）
   ========================================================= */
import * as THREE from 'three';
import { MODELS } from '../assets/manifest.js';
import { softTexture } from '../engine/Materials.js';

const ONCE = { Attack: 1, Cast: 1, Hit: 1, Defend: 0, Victory: 0, Defeat: 1 };
let blobTex = null;

export class Character3D {
  static async create(models, modelId, opts) {
    opts = opts || {};
    const def = MODELS[modelId] || MODELS[MODELS[modelId] ? modelId : 'villager_m'];
    let c = await models.character(def.modelId);
    if (!c && def.fallback) c = await models.character(def.fallback);
    if (!c) return null;
    return new Character3D(c, def, opts);
  }
  constructor(c, def, opts) {
    this.def = def; this.root = new THREE.Group(); this.root.name = 'char_' + def.modelId;
    this.model = c.root; const s = (opts.scale || 1) * (def.scale || 1) * 1.25;
    this.model.scale.setScalar(s); this.model.rotation.y = def.rotationOffset || 0; this.model.position.y = def.footAnchor || 0;
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model); this.actions = {}; this.current = null;
    for (const clip of c.animations) {
      const a = this.mixer.clipAction(clip); this.actions[clip.name] = a;
      if (ONCE[clip.name] === 1) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    }
    this.mixer.addEventListener('finished', (e) => { if (this.onceName && e.action === this.actions[this.onceName]) { const back = this.onceBack || 'Idle'; this.onceName = null; if (this.onceDone) { const f = this.onceDone; this.onceDone = null; f(); } this.play(back, 0.25); } });
    // 足元の影
    if (!blobTex) blobTex = softTexture('rgba(0,0,0,0.55)', 64);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.6 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.025; blob.renderOrder = 1; this.root.add(blob); this.blob = blob;
    this.yaw = 0; this.wantYaw = 0;
    if (opts.xray) this.addXray();
    this.play('Idle', 0);
    // 待機の動きを個体ごとにずらす
    if (this.actions.Idle) this.actions.Idle.time = Math.random() * 2;
  }
  // 建物の後ろに隠れたときだけ見える淡いシルエット（同じ骨格を共有）
  addXray() {
    const mat = new THREE.MeshBasicMaterial({ color: 0x5aa8ff, transparent: false, blending: THREE.AdditiveBlending, depthFunc: THREE.GreaterDepth, depthWrite: false, opacity: 0.55 });
    mat.color.multiplyScalar(0.45);
    const add = [];
    this.model.traverse((o) => {
      if (o.isSkinnedMesh) { const m = new THREE.SkinnedMesh(o.geometry, mat); m.bind(o.skeleton, o.bindMatrix); m.renderOrder = 1; m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; add.push([o, m]); o.renderOrder = 2; }
      else if (o.isMesh) o.renderOrder = 2;
    });
    add.forEach(([o, m]) => { m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale); o.parent.add(m); });
  }
  has(name) { return !!this.actions[name]; }
  play(name, fade, opts) {
    const a = this.actions[name]; if (!a) return;
    if (fade === undefined) fade = 0.2;
    opts = opts || {};
    if (this.current === a && !ONCE[name]) return;
    if (ONCE[name] === 1) { this.onceName = name; this.onceBack = opts.back || 'Idle'; this.onceDone = opts.onDone || null; a.reset(); }
    a.enabled = true; a.setEffectiveTimeScale(opts.timeScale || 1); a.setEffectiveWeight(1);
    if (this.current && this.current !== a) { a.reset(); a.play(); this.current.crossFadeTo(a, fade, false); }
    else a.play();
    this.current = a; this.currentName = name;
  }
  setSpeed(k) { if (this.current) this.current.setEffectiveTimeScale(k); }
  faceTo(yaw) { this.wantYaw = yaw; }
  update(dt) {
    let d = this.wantYaw - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * 12); this.root.rotation.y = this.yaw;
    this.mixer.update(dt);
  }
}

export const DIR_YAW = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
export function yawToDir(yaw) { const x = Math.sin(yaw), z = Math.cos(yaw); return Math.abs(x) > Math.abs(z) ? (x > 0 ? 'right' : 'left') : (z > 0 ? 'down' : 'up'); }
