/* =========================================================
   Animal3D（v7.3）：町や城の動物（犬・猫・にわとり・牛・羊・豚・馬・らくだ）を立体で作る
   ・GLB は使わず、箱・球・円柱などの形を組み合わせる（板の絵や Sprite ではない＝どの向きから見ても立体）
   ・Character3D と同じ使い方：root（足元が原点・+Z が正面）・npc・yaw / wantYaw・faceTo・play('Walk'|'Idle')・setSpeed・update(dt)・mixer.stopAllAction・addXray
   ・動き：歩くと足を前後に振り、体が少し上下する。止まっているときはしっぽを振る・首を動かす（にわとりは地面をつつく）
   ・色は 2D の絵（js/core/animals73.js の COLORS）と同じ表を使う
   ========================================================= */
import * as THREE from 'three';
import { softTexture } from '../engine/Materials.js';

let blobTex = null;
const geo = {};
const G = (k, f) => geo[k] || (geo[k] = f());
const mats = {};
function mat(color) { const k = String(color); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.92, metalness: 0 })); }
function bx(w, h, d, color, x, y, z, parent, name) {
  const m = new THREE.Mesh(G('b1', () => new THREE.BoxGeometry(1, 1, 1)), mat(color)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; m.name = name || 'part'; parent.add(m); return m;
}
function ball(r, color, x, y, z, parent, sx, sy, sz) {
  const m = new THREE.Mesh(G('s1', () => new THREE.SphereGeometry(1, 12, 9)), mat(color)); m.scale.set(r * (sx || 1), r * (sy || 1), r * (sz || 1)); m.position.set(x, y, z); m.castShadow = true; m.name = 'part'; parent.add(m); return m;
}
function cone(r, h, color, x, y, z, parent, rx) {
  const m = new THREE.Mesh(G('c1', () => new THREE.ConeGeometry(1, 1, 6)), mat(color)); m.scale.set(r, h, r); m.position.set(x, y, z); if (rx) m.rotation.x = rx; m.castShadow = true; m.name = 'part'; parent.add(m); return m;
}

// 色の表（2D と同じ。window.AnimalArt があればそちらを使う）
const FALLBACK = {
  dog: { B: '#a0683a', L: '#ecd0a8', D: '#5a3a1e', N: '#1b1b1b' }, cat: { B: '#e8963a', L: '#fbe2bc', D: '#b0601e', N: '#e87a8a', E: '#3a8a3a' },
  chicken: { B: '#f4f0e6', L: '#ffffff', D: '#c8c0b0', R: '#e03a2a', Y: '#f0b830' }, cow: { B: '#f4f0e8', L: '#f0b8bc', D: '#2a2626', N: '#d88890' },
  sheep: { B: '#f0ece0', L: '#ffffff', D: '#d4ccb8', F: '#2e2a26' }, pig: { B: '#f0a8b0', L: '#f8c8cc', D: '#c87080', N: '#a85060' },
  horse: { B: '#8a5430', L: '#c89870', D: '#3a2414', N: '#2a1a10' }, camel: { B: '#d8b070', L: '#ecd0a0', D: '#a07840', N: '#6a4a28' }
};
export function parseAnimal(sprite) {
  const AA = typeof window !== 'undefined' && window.AnimalArt; if (AA) return AA.parse(sprite);
  const m = /^animal_([a-z]+)/.exec(sprite || ''); return m && FALLBACK[m[1]] ? { kind: m[1], key: m[1], pal: FALLBACK[m[1]] } : null;
}
export function isAnimalSprite(sprite) { return !!parseAnimal(sprite); }

// 形の寸法（1マス＝1。人の背の高さはおよそ 1.7）
const SPEC = {
  dog: { legH: 0.26, legW: 0.08, body: [0.26, 0.24, 0.52], head: [0.24, 0.24, 0.24], headY: 0.12, headZ: 0.05, legX: 0.08, legZ: 0.18, tail: 'up', ears: 'flop', snout: [0.12, 0.1, 0.12] },
  cat: { legH: 0.16, legW: 0.06, body: [0.2, 0.18, 0.4], head: [0.2, 0.18, 0.18], headY: 0.1, headZ: 0.02, legX: 0.06, legZ: 0.14, tail: 'cat', ears: 'point', snout: null },
  chicken: { legH: 0.14, legW: 0.03, body: [0.24, 0.24, 0.3], head: [0.12, 0.14, 0.12], headY: 0.18, headZ: -0.02, legX: 0.05, legZ: 0, legs: 2, tail: 'feather', ears: 'comb', snout: null },
  cow: { legH: 0.5, legW: 0.12, body: [0.5, 0.5, 1.1], head: [0.32, 0.32, 0.36], headY: 0.12, headZ: 0.08, legX: 0.16, legZ: 0.38, tail: 'rope', ears: 'horn', snout: [0.26, 0.16, 0.1] },
  sheep: { legH: 0.3, legW: 0.08, body: [0.46, 0.4, 0.66], head: [0.2, 0.22, 0.24], headY: 0.08, headZ: 0.02, legX: 0.12, legZ: 0.22, tail: 'stub', ears: 'side', snout: null, wool: true },
  pig: { legH: 0.18, legW: 0.09, body: [0.42, 0.36, 0.72], head: [0.3, 0.28, 0.24], headY: 0.02, headZ: -0.02, legX: 0.12, legZ: 0.24, tail: 'curl', ears: 'pig', snout: [0.16, 0.12, 0.06] },
  horse: { legH: 0.78, legW: 0.1, body: [0.42, 0.46, 1.1], head: [0.22, 0.26, 0.46], headY: 0.62, headZ: 0.18, legX: 0.13, legZ: 0.38, tail: 'long', ears: 'small', neck: true, snout: null, mane: true },
  camel: { legH: 0.86, legW: 0.1, body: [0.44, 0.42, 1.0], head: [0.2, 0.2, 0.4], headY: 0.62, headZ: 0.3, legX: 0.13, legZ: 0.34, tail: 'rope', ears: 'small', neck: true, snout: null, hump: true }
};

export class Animal3D {
  static create(sprite, opts) { const p = parseAnimal(sprite); if (!p) return null; return new Animal3D(p, opts || {}); }
  constructor(p, opts) {
    this.kind = p.kind; this.def = { modelId: 'animal_' + p.key, kind: 'animal' }; this.isAnimal = true;
    const S = SPEC[p.kind], C = p.pal; this.spec = S;
    this.root = new THREE.Group(); this.root.name = 'animal_' + p.key;
    this.model = new THREE.Group(); this.model.name = 'animal_model'; this.root.add(this.model);
    const sc = opts.scale || 1; this.model.scale.setScalar(sc);
    const bodyG = new THREE.Group(); bodyG.name = 'animal_body'; this.model.add(bodyG); this.bodyG = bodyG;
    const [bw, bh, bl] = S.body; const by = S.legH + bh / 2; const isBird = p.kind === 'chicken';
    // 体
    if (isBird) { ball(1, C.B, 0, by, 0, bodyG, bw / 2, bh / 2, bl / 2); ball(1, C.D, bw / 2 - 0.01, by, -0.01, bodyG, 0.03, bh * 0.32, bl * 0.34); ball(1, C.D, -bw / 2 + 0.01, by, -0.01, bodyG, 0.03, bh * 0.32, bl * 0.34); }
    else if (S.wool) { bx(bw * 0.92, bh * 0.92, bl * 0.92, C.B, 0, by, 0, bodyG, 'body'); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ball(bh * 0.28, i % 2 ? C.B : C.L, Math.cos(a) * bw * 0.38, by + bh * 0.3 + (i % 3) * 0.02, (i / 9 - 0.5) * bl * 0.8, bodyG); } }
    else { bx(bw, bh, bl, C.B, 0, by, 0, bodyG, 'body'); bx(bw * 0.86, bh * 0.2, bl * 0.8, C.L, 0, by - bh * 0.42, 0, bodyG); }
    if (p.kind === 'cow') { bx(bw * 1.02, bh * 0.4, bl * 0.24, C.D, 0, by + 0.06, -0.12, bodyG); bx(bw * 1.02, bh * 0.3, bl * 0.16, C.D, 0, by - 0.02, 0.3, bodyG); bx(0.14, 0.08, 0.16, C.L, 0, S.legH - 0.02, -0.18, bodyG); }
    if (p.kind === 'cat') { for (let i = 0; i < 3; i++) bx(bw * 1.02, bh * 0.5, 0.03, C.D, 0, by + bh * 0.2, -0.1 + i * 0.1, bodyG); }
    if (S.hump) { ball(1, C.B, 0, by + bh / 2, -0.05, bodyG, bw * 0.42, 0.22, bl * 0.24); }
    // 首と頭
    const headG = new THREE.Group(); headG.name = 'animal_head'; bodyG.add(headG); this.headG = headG;
    const [hw, hh, hl] = S.head; const hz = bl / 2 + hl / 2 - 0.02 + S.headZ; const hy = by + S.headY;
    headG.position.set(0, hy, hz * 0.6); const hzz = hz * 0.4;
    if (S.neck) { const nk = bx(bw * 0.5, S.headY + 0.2, 0.22, C.B, 0, -S.headY / 2 + 0.02, -hzz * 0.6, headG); nk.rotation.x = 0.45; if (S.mane) { const mn = bx(0.06, S.headY + 0.22, 0.16, C.D, 0, -S.headY / 2 + 0.1, -hzz * 0.6 - 0.1, headG); mn.rotation.x = 0.45; } }
    if (isBird) ball(1, C.B, 0, 0, hzz, headG, hw / 2, hh / 2, hl / 2); else bx(hw, hh, hl, C.B, 0, 0, hzz, headG, 'head');
    if (S.snout) { bx(S.snout[0], S.snout[1], S.snout[2], C.L || C.B, 0, -hh * 0.2, hzz + hl / 2 + S.snout[2] / 2 - 0.01, headG); bx(S.snout[0] * 0.5, S.snout[1] * 0.4, 0.02, C.N || '#1b1b1b', 0, -hh * 0.12, hzz + hl / 2 + S.snout[2], headG); }
    if (p.kind === 'horse' || p.kind === 'camel') bx(hw * 0.9, hh * 0.5, 0.12, C.L, 0, -hh * 0.18, hzz + hl / 2, headG);
    const eyeC = C.E || '#141420'; const ez = hzz + hl / 2 + 0.002;
    if (p.kind === 'horse' || p.kind === 'camel') { bx(0.03, 0.04, 0.05, eyeC, hw / 2 + 0.005, hh * 0.15, hzz + hl * 0.1, headG); bx(0.03, 0.04, 0.05, eyeC, -hw / 2 - 0.005, hh * 0.15, hzz + hl * 0.1, headG); }
    else { const es = Math.max(0.025, hw * 0.12); bx(es, es, 0.02, eyeC, hw * 0.24, hh * 0.12, ez, headG); bx(es, es, 0.02, eyeC, -hw * 0.24, hh * 0.12, ez, headG); }
    switch (S.ears) {
      case 'flop': [-1, 1].forEach((s) => { const e = bx(0.06, 0.14, 0.08, C.D, s * (hw / 2 + 0.02), hh * 0.12, hzz - 0.02, headG); e.rotation.z = s * 0.25; }); break;
      case 'point': [-1, 1].forEach((s) => cone(0.05, 0.1, C.B, s * hw * 0.3, hh / 2 + 0.04, hzz - 0.01, headG)); break;
      case 'comb': bx(0.03, 0.06, 0.08, C.R, 0, hh / 2 + 0.02, hzz, headG); bx(0.03, 0.05, 0.03, C.R, 0, -hh * 0.4, hzz + hl * 0.4, headG); cone(0.025, 0.06, C.Y, 0, 0, hzz + hl / 2 + 0.02, headG, Math.PI / 2); break;
      case 'horn': [-1, 1].forEach((s) => { const h = cone(0.035, 0.14, '#ece4c8', s * hw * 0.45, hh / 2 + 0.05, hzz - 0.05, headG); h.rotation.z = -s * 0.6; bx(0.1, 0.05, 0.06, C.D, s * (hw / 2 + 0.04), hh * 0.2, hzz - 0.08, headG); }); break;
      case 'side': [-1, 1].forEach((s) => bx(0.1, 0.04, 0.06, S.wool ? C.F || C.D : C.D, s * (hw / 2 + 0.04), hh * 0.15, hzz - 0.04, headG)); break;
      case 'pig': [-1, 1].forEach((s) => { const e = bx(0.08, 0.08, 0.03, C.D, s * hw * 0.32, hh / 2 + 0.02, hzz - 0.02, headG); e.rotation.x = 0.5; }); break;
      case 'small': [-1, 1].forEach((s) => cone(0.03, 0.08, C.D, s * hw * 0.3, hh / 2 + 0.03, hzz - hl * 0.3, headG)); break;
    }
    if (S.wool) { headG.children.forEach((m) => { if (m.name === 'head') m.material = mat(C.F || C.D); }); ball(hh * 0.4, C.B, 0, hh * 0.45, hzz - 0.04, headG); }
    // しっぽ
    const tailG = new THREE.Group(); tailG.name = 'animal_tail'; tailG.position.set(0, by + bh * 0.25, -bl / 2); bodyG.add(tailG); this.tailG = tailG;
    switch (S.tail) {
      case 'up': { const t = bx(0.06, 0.06, 0.2, C.B, 0, 0.06, -0.08, tailG); t.rotation.x = -0.8; break; }
      case 'cat': { const t = bx(0.05, 0.05, 0.3, C.B, 0, 0.12, -0.08, tailG); t.rotation.x = -1.1; bx(0.055, 0.055, 0.06, C.D, 0, 0.26, -0.13, tailG); break; }
      case 'feather': { for (let i = 0; i < 3; i++) { const t = bx(0.04, 0.16, 0.1, i === 1 ? C.D : C.B, (i - 1) * 0.04, 0.06, -0.02, tailG); t.rotation.x = -0.5 - i * 0.1; } break; }
      case 'rope': { const t = bx(0.04, 0.04, 0.42, C.B, 0, -0.18, -0.04, tailG); t.rotation.x = 1.3; bx(0.07, 0.1, 0.07, C.D, 0, -0.38, -0.08, tailG); break; }
      case 'stub': ball(0.07, C.B, 0, 0, -0.02, tailG); break;
      case 'curl': { const t = new THREE.Mesh(G('tor', () => new THREE.TorusGeometry(0.05, 0.015, 6, 12)), mat(C.D)); t.position.set(0, 0.02, -0.04); t.rotation.y = Math.PI / 2; t.castShadow = true; tailG.add(t); break; }
      case 'long': { const t = bx(0.08, 0.08, 0.6, C.D, 0, -0.22, -0.08, tailG); t.rotation.x = 1.15; break; }
    }
    // 足（付け根を軸にして振る）
    this.legs = [];
    const nLeg = S.legs || 4; const legC = isBird ? C.Y : (p.kind === 'sheep' ? C.F : C.B);
    for (let i = 0; i < nLeg; i++) {
      const lg = new THREE.Group(); lg.name = 'animal_leg';
      const sx = (i % 2 ? 1 : -1) * S.legX; const sz = nLeg === 2 ? 0 : (i < 2 ? S.legZ : -S.legZ);
      lg.position.set(sx, S.legH, sz); this.model.add(lg);
      bx(S.legW, S.legH, S.legW, legC, 0, -S.legH / 2, 0, lg);
      if (!isBird) bx(S.legW * 1.1, Math.min(0.06, S.legH * 0.18), S.legW * 1.15, p.kind === 'cat' || p.kind === 'dog' ? (C.L || C.D) : C.D, 0, -S.legH + 0.03, 0.005, lg);
      else bx(0.08, 0.015, 0.1, C.Y, 0, -S.legH + 0.008, 0.02, lg);
      this.legs.push({ g: lg, ph: nLeg === 2 ? i * Math.PI : ([0, Math.PI, Math.PI, 0][i]) });
    }
    // 足元の影
    if (!blobTex) blobTex = softTexture('rgba(0,0,0,0.55)', 64);
    const r = Math.max(0.36, Math.max(bw, bl) * 0.75);
    const blob = new THREE.Mesh(G('pl', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    blob.scale.set(r * 1.4 * sc, r * 1.4 * sc, 1); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.025; blob.renderOrder = 1; this.root.add(blob); this.blob = blob;
    this.yaw = 0; this.wantYaw = 0; this.walking = false; this.speedK = 1; this.t = Math.random() * 10; this.phase = 0; this.currentName = 'Idle';
    this.actions = {}; this.mixer = { stopAllAction() {}, update() {} };
    this.height = (S.legH + bh + (S.neck ? S.headY + hh : hh * 0.5)) * sc;
  }
  addXray() {}
  has(name) { return name === 'Idle' || name === 'Walk' || name === 'Run'; }
  play(name) { this.walking = name === 'Walk' || name === 'Run'; this.currentName = this.has(name) ? name : 'Idle'; }
  setSpeed(k) { this.speedK = k || 1; }
  faceTo(yaw) { this.wantYaw = yaw; }
  update(dt) {
    let d = this.wantYaw - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * 8); this.root.rotation.y = this.yaw;
    this.t += dt; const S = this.spec;
    const step = (this.kind === 'chicken' ? 14 : this.kind === 'horse' || this.kind === 'camel' || this.kind === 'cow' ? 6 : 10) * this.speedK;
    if (this.walking) this.phase += dt * step;
    const amp = this.walking ? (this.kind === 'chicken' ? 0.7 : 0.55) : 0;
    for (const l of this.legs) { const want = Math.sin(this.phase + l.ph) * amp; l.g.rotation.x += (want - l.g.rotation.x) * Math.min(1, dt * 14); }
    this.bodyG.position.y = this.walking ? Math.abs(Math.sin(this.phase)) * S.legH * 0.06 : 0;
    // しっぽ・首
    const wag = this.kind === 'dog' ? (this.walking ? 0.5 : 0.7) * Math.sin(this.t * 12) : this.kind === 'cat' ? 0.35 * Math.sin(this.t * 1.6) : 0.2 * Math.sin(this.t * 3);
    this.tailG.rotation.y = wag;
    if (this.kind === 'chicken' && !this.walking) { const k = Math.max(0, Math.sin(this.t * 1.7) - 0.6) * 2.4; this.headG.rotation.x = k * 0.9; }
    else { this.headG.rotation.x = Math.sin(this.t * 0.9) * 0.05; this.headG.rotation.y = Math.sin(this.t * 0.37) * 0.15; }
  }
}
