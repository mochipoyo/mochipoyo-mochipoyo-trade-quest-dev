/* =========================================================
   Ticker82（v8.2）：円形ティックテープ（円筒の帯に、学習用相場の値が途切れずに流れる）
   ・依頼（2026-11-07 14:39）：トレディアの証券市場前広場の上・証券市場の中央の取引の床の上・アズール大洋の中央の上。
     「円筒帯、連続スクロール、継ぎ目なし、裏側鏡文字なし」「geometry/材質保持、文字描き直しは値更新時、スクロールは UV、退出時 dispose・イベント解除」
   ・帯：ふたのない円筒（外側の面と内側の面を別の物にする）。外側は画像をそのまま、内側は横に裏返した画像（内から見ても文字が鏡にならない）
   ・画像：キャンバスに「学習用相場」と銘柄・値・前との差を並べる。画像の左右の端がそろうように描く（円周に整数回くり返す → 継ぎ目なし）
   ・動き：画像の位置（offset）だけを毎フレーム動かす（形・材質・画像は作り直さない）。値が変わった（Quote82.snapshot().version）ときだけ文字を描き直す
   ・柱を立てない（浮いた帯と、上下の細い輪）。歩けるマス・人・出入口をふさがない（当たり判定もない）
   ・dispose()：形・材質・画像を捨てる（地図を出るとき。MapScene3D.disposers・Join76）
   ========================================================= */
import * as THREE from 'three';
import { addCutout } from '../engine/Cutout.js';

const FALLBACK = () => ({ version: 'demo', demo: true, label: 'DEMO（学習用データなし）', note: '', items: [{ name: 'USD/JPY', price: 150, chg: 0, dec: 3 }] });
export function quoteSnapshot() { const Q = window.Quote82; try { return Q && Q.snapshot ? Q.snapshot() : FALLBACK(); } catch (e) { return FALLBACK(); } }

function drawStrip(c, snap, big) {
  const g = c.getContext('2d'); const W = c.width, H = c.height;
  g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#10161c'; g.fillRect(0, Math.round(H * 0.08), W, Math.round(H * 0.84));
  const fs = Math.round(H * 0.5); g.font = 'bold ' + fs + 'px "Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif'; g.textBaseline = 'middle';
  const parts = []; parts.push({ t: '◆ ' + snap.label + (snap.demo ? '' : ' ・' + (snap.note || '')) + ' ◆', col: snap.demo ? '#ff8a3a' : '#ffd84a' });
  (snap.items || []).forEach((it) => { const f = window.Quote82 && window.Quote82.fmt ? window.Quote82.fmt(it) : { name: it.name, price: String(it.price), chg: '', up: true }; parts.push({ t: f.name + ' ', col: '#e8eef4' }); parts.push({ t: f.price + ' ', col: '#ffffff' }); parts.push({ t: f.chg + '   ', col: f.up ? '#4aff8a' : '#ff5a5a' }); });
  // 文字の幅に合わせて間をそろえる（左右の端で途切れない）
  const widths = parts.map((p) => g.measureText(p.t).width); const total = widths.reduce((a, b) => a + b, 0); const gap = Math.max(0, (W - total) / parts.length);
  let x = gap / 2; parts.forEach((p, i) => { g.fillStyle = p.col; g.fillText(p.t, x, H / 2 + 2); x += widths[i] + gap; });
  g.fillStyle = '#c8a050'; g.fillRect(0, 0, W, Math.round(H * 0.06)); g.fillRect(0, H - Math.round(H * 0.06), W, Math.round(H * 0.06));
  return total > W;   // 入り切らない（くり返しの数を減らす）
}

export class TickerRing {
  // radius：半径（マス）・band：帯の高さ・y：帯の真ん中の高さ・repeat：円周に何回くり返すか・speed：1 秒に画像の何回分流れるか・seg：円周の分け方
  constructor(o) {
    this.o = Object.assign({ radius: 6, band: 1, y: 5, repeat: 3, speed: 0.025, seg: 96, big: false, frame: '#c8a050', cutout: true }, o || {});
    const O = this.o; const g = new THREE.Group(); g.name = 'ticker82'; this.group = g;
    const c = document.createElement('canvas'); c.width = O.big ? 4096 : 2048; c.height = O.big ? 192 : 128; this.canvas = c;
    this.snap = quoteSnapshot(); drawStrip(c, this.snap, O.big);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 4; tex.repeat.set(O.repeat, 1);
    const texIn = tex.clone(); texIn.repeat.set(-O.repeat, 1); texIn.needsUpdate = true; this.tex = tex; this.texIn = texIn;
    const geo = new THREE.CylinderGeometry(O.radius, O.radius, O.band, O.seg, 1, true); geo.userData.own = true; this.geo = geo;
    const mk = (tx, side) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 1.0, roughness: 1, metalness: 0, side, toneMapped: false, fog: O.fog !== false });   // 光る帯（MeshStandard：主人公の手前を抜く Cutout が使える）
    const mo = mk(tex, THREE.FrontSide), mi = mk(texIn, THREE.BackSide);
    if (O.cutout) { addCutout(mo); addCutout(mi); }
    this.mats = [mo, mi];
    const outer = new THREE.Mesh(geo, mo), inner = new THREE.Mesh(geo, mi); outer.name = 'ticker82_outer'; inner.name = 'ticker82_inner'; [outer, inner].forEach((m) => { m.castShadow = false; m.receiveShadow = false; m.position.y = O.y; g.add(m); });
    // 上下の細い輪（真鍮）と、帯の裏の薄い光
    const fm = new THREE.MeshStandardMaterial({ color: new THREE.Color(O.frame), roughness: 0.3, metalness: 0.8 }); if (O.cutout) addCutout(fm); this.mats.push(fm);
    const tg = new THREE.TorusGeometry(O.radius, Math.max(0.035, O.band * 0.06), 6, O.seg); tg.rotateX(Math.PI / 2); tg.userData.own = true; this.tg = tg;
    for (const s of [-1, 1]) { const t = new THREE.Mesh(tg, fm); t.position.y = O.y + s * O.band / 2; t.castShadow = false; g.add(t); }
    this.t0 = 0; this.lastCheck = 0; this.redraws = 1; this.offset = 0;
  }
  update(t) {
    const O = this.o; if (!this.t0) this.t0 = t; const dt = Math.min(0.1, Math.max(0, t - (this._t || t))); this._t = t;
    this.offset = (this.offset + dt * O.speed) % 1; this.tex.offset.x = this.offset; this.texIn.offset.x = -this.offset;   // 外も内も、文字は同じ向き（右から左）へ流れる
    if (t - this.lastCheck > 1.5) { this.lastCheck = t; const s = quoteSnapshot(); if (s.version !== this.snap.version) { this.snap = s; drawStrip(this.canvas, s, O.big); this.tex.needsUpdate = true; this.texIn.needsUpdate = true; this.redraws++; } }
  }
  info() { return { version: this.snap.version, demo: !!this.snap.demo, label: this.snap.label, redraws: this.redraws, offset: +this.offset.toFixed(4), first: (this.snap.items || [])[0] }; }
  dispose() { this.geo.dispose(); this.tg.dispose(); this.mats.forEach((m) => m.dispose()); this.tex.dispose(); this.texIn.dispose(); if (this.group.parent) this.group.parent.remove(this.group); this.disposed = true; }
}

// 地図ごとの置き場所（地図の座標。y は地面からの高さ）
export const TICKER82_PLACES = {
  tradia: { x: 36, z: 10.5, y: 8.2, radius: 6.5, band: 1.2, repeat: 4, speed: 0.02 },   // 証券市場前の広場の上（扉 35,7 の正面の広場）
  tradia_exchange: { x: 13, z: 6.2, y: 3.0, radius: 4.5, band: 0.8, repeat: 3, speed: 0.025 }   // 中央の取引の床の上
};
export function buildTicker82(ms) {
  const map = ms.map; const P = map && TICKER82_PLACES[map.id]; if (!P) return null;
  const ring = new TickerRing(P); ring.group.position.set(P.x, 0, P.z); ms.root.add(ring.group);
  ms.animated.push({ kind: 'fn', fn: (t) => ring.update(t) }); (ms.disposers || (ms.disposers = [])).push(() => ring.dispose()); ms.ticker82 = ring;
  ms.lampSpots.push({ pos: new THREE.Vector3(P.x, P.y - 0.6, P.z), color: 0xffe0a0, power: 0.6, dist: P.radius + 3 });
  return ring;
}
