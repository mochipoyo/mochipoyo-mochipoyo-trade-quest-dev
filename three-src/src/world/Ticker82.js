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

// 帯の文字の並び：「学習用相場」の札 ＋ 銘柄 K 個（page で何番目からか）。値と増減は等幅の数字（値が変わっても文字の幅が急に変わらない）
function stripParts(snap, K, page) {
  const parts = [{ t: '◆ ' + snap.label + (snap.demo ? '' : page % 2 ? '（実際の相場ではありません）' : '（ゲーム内の人工データ）') + ' ◆   ', col: snap.demo ? '#ff8a3a' : '#ffd84a' }];   /* 札の注記は組ごとに交互（帯が短くても字をつぶさない） */
  const items = snap.items || []; const n = items.length; const k = Math.min(K, n);
  for (let j = 0; j < k; j++) { const it = items[(page * k + j) % n]; const f = window.Quote82 && window.Quote82.fmt ? window.Quote82.fmt(it) : { name: it.name, price: String(it.price), chg: '', up: true };
    parts.push({ t: f.name + ' ', col: '#e8eef4' }); parts.push({ t: f.price + ' ', col: '#ffffff', mono: true }); parts.push({ t: f.chg + '    ', col: f.up ? '#4aff8a' : '#ff5a5a', mono: true }); }
  return parts;
}
function fonts(H) { const fs = Math.round(H * 0.5); return { FONT: 'bold ' + fs + 'px "Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif', MONO: 'bold ' + fs + 'px "DejaVu Sans Mono","Menlo","Consolas","Noto Sans Mono",monospace' }; }
function measure(g, parts, F) { return parts.map((p) => { g.font = p.mono ? F.MONO : F.FONT; return g.measureText(p.t).width; }); }
// 帯の画像の幅と、1 周に入れる銘柄の数を決める（はじめに 1 回）。
// 字の縦横の比を保つ 1 周の長さ（画素）＝ 2πr ÷ 帯の高さ × 画像の高さ。文字列がそれより長いと、帯の上で字がつぶれる → 銘柄の数を減らし、残りは次の値の更新で順に出す（page）
function planStrip(c, snap, O) {
  const g = c.getContext('2d'); const H = c.height; const F = fonts(H); const pxRev = 2 * Math.PI * O.radius / O.band * H; const MAXW = O.big ? 6144 : 4096;   /* 画像の幅の上限（スマホの GPU でも読める大きさ）。高さを抑えて、字の比を保つ 1 周がこの幅に入るようにした */
  const n = (snap.items || []).length || 1; let K = n; let W = 0;
  for (; K >= 1; K--) { W = 0; for (let pg = 0; pg < Math.ceil(n / K); pg++) { const w = measure(g, stripParts(snap, K, pg), F).reduce((a, b) => a + b, 0); W = Math.max(W, w); } if ((W <= pxRev * 1.3 && W <= MAXW) || K === 1) break; }
  W = Math.min(MAXW, Math.ceil(W * 1.08 / 64) * 64);   // 値が変わって少し長くなっても入る余白
  const repeat = Math.max(1, Math.round(pxRev / W));
  return { K, W, repeat, pxRev: Math.round(pxRev), squash: +((W * repeat) / pxRev).toFixed(2) };
}
// 帯を描く（画像の幅は planStrip で決めたまま。左右の端で途切れないように、余った幅は字の間に配る）
function drawStrip(c, snap, plan, page) {
  const g = c.getContext('2d'); const W = c.width, H = c.height; const F = fonts(H);
  g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#10161c'; g.fillRect(0, Math.round(H * 0.08), W, Math.round(H * 0.84)); g.textBaseline = 'middle';
  let K = plan.K, parts, widths, total;
  for (; K >= 1; K--) { parts = stripParts(snap, K, page); widths = measure(g, parts, F); total = widths.reduce((a, b) => a + b, 0); if (total <= W || K === 1) break; }
  const gap = Math.max(0, (W - total) / parts.length);
  let x = gap / 2; parts.forEach((p, i) => { g.font = p.mono ? F.MONO : F.FONT; g.fillStyle = p.col; g.fillText(p.t, x, H / 2 + 2); x += widths[i] + gap; });
  g.fillStyle = '#c8a050'; g.fillRect(0, 0, W, Math.round(H * 0.06)); g.fillRect(0, H - Math.round(H * 0.06), W, Math.round(H * 0.06));
  return { K, total: Math.round(total), fits: total <= W };
}

export class TickerRing {
  // radius：半径（マス）・band：帯の高さ・y：帯の真ん中の高さ・repeat：円周に何回くり返すか・speed：1 秒に画像の何回分流れるか・seg：円周の分け方
  constructor(o) {
    this.o = Object.assign({ radius: 6, band: 1, y: 5, repeat: 3, speed: 0.025, seg: 96, big: false, frame: '#c8a050', cutout: true }, o || {});
    const O = this.o; const g = new THREE.Group(); g.name = 'ticker82'; this.group = g;
    const c = document.createElement('canvas'); c.width = 64; c.height = O.big ? 160 : 88; this.canvas = c;
    this.snap = quoteSnapshot(); this.plan = planStrip(c, this.snap, O); c.width = this.plan.W; this.page = 0; this.last = drawStrip(c, this.snap, this.plan, this.page);   /* 画像の幅は 1 回だけ決める（あとで変えると GPU の画像の大きさと合わなくなる） */
    const rep = this.plan.repeat; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 4; tex.repeat.set(rep, 1);
    const texIn = tex.clone(); texIn.repeat.set(-rep, 1); texIn.needsUpdate = true; this.tex = tex; this.texIn = texIn;
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
    const O = this.o;
    /* 外も内も、文字は同じ向き（右から左）へ流れる。位置はページの共通の時計から（地図を作り直しても先頭へ戻らない・チャンクを越えても速さが同じ） */
    this.offset = ((performance.now() / 1000) * O.speed) % 1; this.tex.offset.x = this.offset; this.texIn.offset.x = -this.offset;
    /* 値の確かめは 1.5 秒ごと。画面が隠れているときはしない。値が変わったときだけ描き直す（銘柄が多いときは次の組へ） */
    if (t - this.lastCheck <= 1.5 || (typeof document !== 'undefined' && document.hidden)) return;
    this.lastCheck = t; const s = quoteSnapshot(); if (s.version === this.snap.version) return;
    this.snap = s; this.page++; this.last = drawStrip(this.canvas, s, this.plan, this.page); this.tex.needsUpdate = true; this.texIn.needsUpdate = true; this.redraws++;
  }
  info() { return { version: this.snap.version, speed: this.o.speed, plan: this.plan, page: this.page, shown: this.last, demo: !!this.snap.demo, label: this.snap.label, redraws: this.redraws, offset: +this.offset.toFixed(4), first: (this.snap.items || [])[0] }; }
  dispose() { this.geo.dispose(); this.tg.dispose(); this.mats.forEach((m) => m.dispose()); this.tex.dispose(); this.texIn.dispose(); if (this.group.parent) this.group.parent.remove(this.group); this.disposed = true; }
}

// 地図ごとの置き場所（地図の座標。y は地面からの高さ）
export const TICKER82_PLACES = {
  tradia: { x: 35.5, z: 13, y: 5.4, radius: 4.6, band: 1.0, repeat: 4, speed: 0.02 },   /* 広場の舗装の円の上。証券市場（z<8）・相場研究所（x≥40, z≥15）にかからない半径。ふつうのカメラで画面に入る高さ（前は高さ 8.2・半径 6.5 で、ふつうのカメラでは画面の上の外だった） */   // 証券市場前の広場の上（扉 35,7 の正面の広場）
  tradia_exchange: { x: 13, z: 6.2, y: 3.0, radius: 4.5, band: 0.8, repeat: 3, speed: 0.025 }   // 中央の取引の床の上
};
export function buildTicker82(ms) {
  const map = ms.map; const P = map && TICKER82_PLACES[map.id]; if (!P) return null;
  const ring = new TickerRing(P); ring.group.position.set(P.x, 0, P.z); ms.root.add(ring.group);
  ms.animated.push({ kind: 'fn', fn: (t) => ring.update(t) }); (ms.disposers || (ms.disposers = [])).push(() => ring.dispose()); ms.ticker82 = ring;
  ms.lampSpots.push({ pos: new THREE.Vector3(P.x, P.y - 0.6, P.z), color: 0xffe0a0, power: 0.6, dist: P.radius + 3 });
  return ring;
}
