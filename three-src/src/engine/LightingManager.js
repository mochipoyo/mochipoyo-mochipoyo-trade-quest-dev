/* =========================================================
   LightingManager：太陽・空・霧・昼夜・窓明かり・ランタンの点光源（近い順に数を限って使い回す）
   時間帯は既存の State.data.timeOfDay（0=深夜 0.25=朝 0.5=昼 0.75=夕）。表示だけを切り替える「プレビュー」も可
   ========================================================= */
import * as THREE from 'three';

const KEYS = [   // t, 太陽の色・強さ, 空（上・地平）, 霧, 半球光, 窓, 露出
  { t: 0.0, sun: 0x6a7aa8, si: 0.35, top: 0x0a1028, hor: 0x1a2440, fog: 0x141a30, hemi: 0x5a6a9a, hi: 0.35, win: 2.6, exp: 1.05 },
  { t: 0.22, sun: 0xff9a5a, si: 1.0, top: 0x3a5a9a, hor: 0xf0a070, fog: 0xc8a088, hemi: 0xa8b0d0, hi: 0.6, win: 1.2, exp: 1.0 },
  { t: 0.32, sun: 0xfff0d8, si: 2.6, top: 0x5a96d8, hor: 0xcfe2f0, fog: 0xb8cce0, hemi: 0xcfe0ff, hi: 1.0, win: 0.15, exp: 1.0 },
  { t: 0.5, sun: 0xfff6e8, si: 2.9, top: 0x4a8ad8, hor: 0xd4e6f4, fog: 0xc0d4e8, hemi: 0xd8e6ff, hi: 1.05, win: 0.1, exp: 1.0 },
  { t: 0.68, sun: 0xffd8a8, si: 2.2, top: 0x5a86c8, hor: 0xf0d0a8, fog: 0xd8c0a0, hemi: 0xe0d0c0, hi: 0.9, win: 0.4, exp: 1.0 },
  { t: 0.78, sun: 0xff7a3a, si: 1.1, top: 0x2a3a78, hor: 0xe8784a, fog: 0x8a5a58, hemi: 0x9a8aa8, hi: 0.55, win: 1.8, exp: 1.05 },
  { t: 0.86, sun: 0x7a8ac8, si: 0.4, top: 0x0c1430, hor: 0x2a2a50, fog: 0x1a1e38, hemi: 0x5a6a9a, hi: 0.38, win: 2.6, exp: 1.05 },
  { t: 1.0, sun: 0x6a7aa8, si: 0.35, top: 0x0a1028, hor: 0x1a2440, fog: 0x141a30, hemi: 0x5a6a9a, hi: 0.35, win: 2.6, exp: 1.05 }
];
const cA = new THREE.Color(), cB = new THREE.Color();
function lerpKey(t) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1].t < t) i++;
  const a = KEYS[i], b = KEYS[i + 1]; const k = Math.max(0, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t)));
  const col = (x, y) => cA.setHex(x).lerp(cB.setHex(y), k).getHex();
  const num = (x, y) => x + (y - x) * k;
  return { sun: col(a.sun, b.sun), si: num(a.si, b.si), top: col(a.top, b.top), hor: col(a.hor, b.hor), fog: col(a.fog, b.fog), hemi: col(a.hemi, b.hemi), hi: num(a.hi, b.hi), win: num(a.win, b.win), exp: num(a.exp, b.exp) };
}

export class LightingManager {
  constructor(scene, renderer, quality) {
    this.scene = scene; this.renderer = renderer; this.quality = quality;
    this.hemi = new THREE.HemisphereLight(0xd8e6ff, 0x4a5a3a, 1.0); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff6e8, 2.8);
    this.sun.castShadow = true; const sm = quality === 'high' ? 2048 : 1024; this.sun.shadow.mapSize.set(sm, sm);
    const sc = this.sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 120;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 3;
    scene.add(this.sun); scene.add(this.sun.target);
    this.fog = new THREE.FogExp2(0xc0d4e8, 0.012); scene.fog = this.fog;
    this.sky = this.makeSky(); scene.add(this.sky);
    this.lampLights = [];
    const n = quality === 'high' ? 8 : 4;
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffb05a, 0, 9, 1.6); l.castShadow = false; scene.add(l); this.lampLights.push(l); }
    this.lampSpots = []; this.windowMats = new Set(); this.glowMats = new Set(); this.night = 0; this.preview = null; this.interior = false;
  }
  makeSky() {
    const g = new THREE.SphereGeometry(400, 32, 16);
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x4a8ad8) }, hor: { value: new THREE.Color(0xd4e6f4) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xffffff) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP;\nvoid main(){ float h = clamp(vP.y*1.6+0.08,0.0,1.0); vec3 c = mix(hor, top, pow(h,0.7)); float s = max(dot(normalize(vP), normalize(sunDir)),0.0); c += sunCol*pow(s,64.0)*0.8 + sunCol*pow(s,6.0)*0.12; gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}'
    });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = -10; mesh.frustumCulled = false; return mesh;
  }
  // 建物の窓・ランタンなど「光る」マテリアルを登録（夜に強くする）
  registerScene(root) {
    root.traverse((o) => {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.userData && m.userData.window) this.windowMats.add(m);
        else if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05 && m.emissiveIntensity > 0) { if (m.userData.baseEmissive === undefined) m.userData.baseEmissive = m.emissiveIntensity; this.glowMats.add(m); }
      });
    });
  }
  setLampSpots(spots) { this.lampSpots = spots; }
  // 地域テーマ（themes.js）：霧・地平の色を地域の色へ寄せ、暗い地域は日差しを弱める
  setTheme(theme) { this.theme = theme || null; this._fogC = theme && theme.fog ? new THREE.Color(theme.fog) : null; }
  setInterior(on, ambient) { this.interior = on; this.ambient = ambient || null; }
  update(t, focus) {
    const tt = this.preview !== null ? this.preview : (t === undefined ? 0.35 : t);
    const k = lerpKey(((tt % 1) + 1) % 1);
    this.night = Math.max(0, Math.min(1, (k.win - 0.3) / 2.2));
    // 太陽の向き：朝は東、夕は西、夜は月（青白い弱い光）
    const ang = (tt - 0.25) * Math.PI * 2; const el = Math.max(0.35, Math.sin((tt - 0.25) * Math.PI * 2 + Math.PI / 2) * 0.9 + 0.2);
    const dir = new THREE.Vector3(Math.cos(ang) * 0.8 + 0.25, Math.max(0.45, el), 0.55).normalize();
    const f = focus || new THREE.Vector3();
    this.sun.position.copy(f).addScaledVector(dir, 50); this.sun.target.position.copy(f);
    this.sun.color.setHex(k.sun); this.sun.intensity = this.interior ? k.si * 0.25 : k.si;
    this.hemi.color.setHex(k.hemi); this.hemi.groundColor.setHex(0x4a4a3a); this.hemi.intensity = this.interior ? Math.max(0.55, k.hi * 0.8) * (this.ambient ? 0.7 + this.ambient * 0.8 : 1) : k.hi;
    this.fog.color.setHex(this.interior ? 0x1a140e : k.fog); this.fog.density = this.interior ? 0.0 : (0.010 + this.night * 0.01);
    const th = this.theme; let skyHor = null;
    if (th && !this.interior) {
      if (this._fogC) { this.fog.color.lerp(this._fogC, 0.55 * (1 - this.night * 0.6)); skyHor = this._fogC; }
      if (th.dim) { this.sun.intensity *= th.dim; this.hemi.intensity *= 0.6 + th.dim * 0.4; }
    }
    this.sky.visible = !this.interior;
    this.sky.material.uniforms.top.value.setHex(k.top); this.sky.material.uniforms.hor.value.setHex(k.hor);
    if (skyHor) { this.sky.material.uniforms.hor.value.lerp(skyHor, 0.5); if (th.dim) this.sky.material.uniforms.top.value.lerp(skyHor, 0.35).multiplyScalar(0.6 + th.dim * 0.4); } this.sky.material.uniforms.sunDir.value.copy(dir); this.sky.material.uniforms.sunCol.value.setHex(k.sun);
    this.sky.position.copy(f);
    this.scene.background = null;
    this.renderer.renderer.toneMappingExposure = k.exp;
    for (const m of this.windowMats) m.emissiveIntensity = this.interior ? 0.6 : k.win;
    for (const m of this.glowMats) m.emissiveIntensity = (m.userData.baseEmissive || 1) * (this.interior ? 0.6 : 0.25 + this.night * 0.9);
    this.renderer.setBloom(0.25 + this.night * 0.6);
    // 近いランタンだけ点光源で照らす（夜・屋内）
    const lampOn = this.interior ? 1 : this.night;
    const spots = this.lampSpots.slice().sort((a, b) => a.pos.distanceToSquared(f) - b.pos.distanceToSquared(f));
    this.lampLights.forEach((l, i) => {
      const s = spots[i];
      if (!s || lampOn < 0.05) { l.intensity = 0; return; }
      l.position.copy(s.pos); l.color.setHex(s.color || 0xffb05a); l.intensity = (s.power || 1) * (this.interior ? 6 : 10) * lampOn; l.distance = s.dist || 9;
    });
  }
}
