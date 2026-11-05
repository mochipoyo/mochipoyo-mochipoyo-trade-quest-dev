/* =========================================================
   Finish76：v7.6 画面の仕上げ（高画質だけ。探索の画面だけ。戦闘は別の描画なので変わらない）
   ・ジオラマ風のぼかし：画面の上（奥）と下（手前）を少しぼかす（ティルトシフト）。主人公のいる真ん中の帯はくっきり
   ・色の調子：地域（themes.js の region）と時間帯（夜・夕方）・屋内で、彩度・コントラスト・暗い所と明るい所の色味を少し変える
   ・周辺減光：画面の隅を少し暗く
   ・トーンマップ（OutputPass）のあとの画面の色（sRGB）にかける。光のにじみ（ブルーム）は Renderer3D の UnrealBloomPass のまま
   ・切り替え：localStorage 'mtq3d-finish'＝'off'（使わない＝以前の表示）／それ以外（使う・既定）。URL の ?finish=on|off が優先（保存しない）
   ・数値は見た目で決めた仮の値（実機・GPU では未確認）
   ========================================================= */
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const LS_KEY = 'mtq3d-finish';
export function finishSetting() {
  try { const q = /[?&]finish=(on|off)\b/.exec(location.search || ''); if (q) return q[1]; } catch (e) { /* なし */ }
  try { return localStorage.getItem(LS_KEY) === 'off' ? 'off' : 'on'; } catch (e) { return 'on'; }
}
export function setFinishSetting(v) { try { if (v === 'off') localStorage.setItem(LS_KEY, 'off'); else localStorage.removeItem(LS_KEY); } catch (e) { /* なし */ } }

// 地域ごとの色の調子（sat＝彩度・con＝コントラスト・sh＝暗い所の色・hi＝明るい所の色。sh/hi は足す量）
const REGION_GRADE = {
  arcadia: { sat: 1.08, con: 1.04, sh: [0.00, 0.01, 0.03], hi: [0.03, 0.02, 0.00] },
  grania: { sat: 1.04, con: 1.05, sh: [0.01, 0.00, 0.02], hi: [0.04, 0.02, -0.01] },
  kalion: { sat: 1.08, con: 1.04, sh: [0.00, 0.01, 0.03], hi: [0.03, 0.02, 0.00] },
  islands: { sat: 1.12, con: 1.03, sh: [-0.01, 0.02, 0.04], hi: [0.03, 0.02, 0.00] },
  tempus: { sat: 1.02, con: 1.04, sh: [0.01, 0.01, 0.04], hi: [0.02, 0.02, 0.01] },
  machine: { sat: 0.94, con: 1.06, sh: [0.00, 0.01, 0.04], hi: [0.01, 0.01, 0.00] },
  magicka: { sat: 1.04, con: 1.04, sh: [0.03, 0.00, 0.05], hi: [0.02, 0.01, 0.02] },
  sky: { sat: 1.04, con: 1.00, sh: [0.01, 0.02, 0.05], hi: [0.02, 0.02, 0.02] },
  dark: { sat: 0.86, con: 1.06, sh: [0.03, 0.00, 0.05], hi: [0.00, -0.01, 0.02] },
  desert: { sat: 1.06, con: 1.07, sh: [0.02, 0.00, 0.01], hi: [0.05, 0.03, -0.01] },
  dragon: { sat: 1.02, con: 1.07, sh: [0.03, 0.00, 0.00], hi: [0.05, 0.01, -0.02] },
  snow: { sat: 0.96, con: 1.02, sh: [0.00, 0.02, 0.05], hi: [0.01, 0.02, 0.03] }
};
const BASE = REGION_GRADE.arcadia;

const Shader = {
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(640, 416) },
    uFocus: { value: 0.5 }, uBand: { value: 0.15 }, uBlur: { value: 3 }, uTopK: { value: 1.0 }, uBotK: { value: 0.55 }, uTilt: { value: 1 },
    uSat: { value: 1.06 }, uCon: { value: 1.04 }, uSh: { value: new THREE.Vector3() }, uHi: { value: new THREE.Vector3() }, uVig: { value: 0.22 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFocus, uBand, uBlur, uTopK, uBotK, uTilt, uSat, uCon, uVig; uniform vec3 uSh, uHi; varying vec2 vUv;',
    'const float GA = 2.39996323;',
    'vec3 blurAt(vec2 uv, float r){ vec3 acc = texture2D(tDiffuse, uv).rgb; for (int i = 1; i < 18; i++){ float fi = float(i); float rr = sqrt(fi / 17.0) * r; float a = fi * GA; acc += texture2D(tDiffuse, uv + vec2(cos(a), sin(a)) * rr / uRes).rgb; } return acc / 18.0; }',
    'void main(){',
    '  vec2 uv = vUv; float d = uv.y - uFocus; float k = d > 0.0 ? uTopK : uBotK;',
    '  float r = smoothstep(uBand, uBand + 0.33, abs(d)) * k * uTilt * uBlur;',
    '  vec3 c = r > 0.35 ? blurAt(uv, r) : texture2D(tDiffuse, uv).rgb;',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  c = mix(vec3(l), c, uSat);',
    '  c = (c - 0.5) * uCon + 0.5;',
    '  float s = 1.0 - smoothstep(0.05, 0.55, l); float h = smoothstep(0.45, 0.95, l);',
    '  c += uSh * s + uHi * h;',
    '  vec2 q = uv - 0.5; q.x *= uRes.x / max(1.0, uRes.y) * 0.8; float v = smoothstep(0.30, 0.85, length(q));',
    '  c *= 1.0 - uVig * v;',
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n')
};

export class Finish76 {
  constructor() { this.pass = new ShaderPass(Shader); this.pass.enabled = finishSetting() !== 'off'; this.u = this.pass.uniforms; this.state = {}; }
  setEnabled(on) { this.pass.enabled = !!on; }
  enabled() { return this.pass.enabled; }
  setSize(w, h, pr) { const W = w * (pr || 1), H = h * (pr || 1); this.u.uRes.value.set(W, H); this.u.uBlur.value = Math.max(1.5, H * 0.0042); }
  // LightingManager.update から毎フレーム：theme（地域）・night 0..1・dusk 0..1（夕方・朝焼け）・interior・kind（field/town/dungeon/interior）
  update(o) {
    const u = this.u; const g = REGION_GRADE[(o.theme && o.theme.region) || 'arcadia'] || BASE;
    const night = o.night || 0, dusk = o.dusk || 0, inside = !!o.interior;
    let sat = g.sat * (1 - night * 0.14), con = g.con;
    const sh = [g.sh[0], g.sh[1], g.sh[2]], hi = [g.hi[0], g.hi[1], g.hi[2]];
    sh[0] -= night * 0.01; sh[2] += night * 0.035;                               // 夜：暗い所を青く
    hi[0] += dusk * 0.04; hi[1] += dusk * 0.01; hi[2] -= dusk * 0.02;            // 夕方：明るい所を橙に
    if (inside) { sat *= 1.02; hi[0] += 0.03; hi[1] += 0.015; sh[0] += 0.01; }   // 屋内：灯りの暖かさ
    u.uSat.value = sat; u.uCon.value = con; u.uSh.value.set(sh[0], sh[1], sh[2]); u.uHi.value.set(hi[0], hi[1], hi[2]);
    u.uVig.value = inside ? 0.30 : 0.20 + night * 0.08;
    // ぼかしの強さ：フィールド＝強め（ジオラマ）・町＝ふつう・ダンジョン＝弱め・屋内＝ごく弱く（部屋の奥の壁が見えるように）
    const kind = o.kind || 'town';
    u.uTilt.value = inside ? 0.35 : kind === 'field' ? 1.0 : kind === 'dungeon' ? 0.6 : 0.85;
    u.uBand.value = inside ? 0.22 : kind === 'field' ? 0.13 : 0.16;
  }
}
