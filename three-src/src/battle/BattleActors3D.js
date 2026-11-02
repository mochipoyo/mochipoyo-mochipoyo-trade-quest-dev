/* =========================================================
   BattleActors3D（Phase 2）：3D版の戦闘。左に敵、右に主人公たち（横から少し斜めに見る構図）
   ・敵：2D版の敵の絵（BattleUI.enemyVisual：新しい画像・ボス画像・従来の絵）をそのまま使い、絵から厚みのある立体を作る（ArtVolume）
         → 元のデザインのまま3Dの舞台に立つ。光・影・揺れ・被弾・撃破の演出だけを3Dで付ける
   ・味方：3Dモデル（主人公・リナは手作業で調整したモデル、ほかは2D版の配色から自動生成または代用）。敵の方（左）を向く
   ・戦闘の計算・順番・時刻表は2D版のまま（js/rpg/combat.js・js/ui/battle.js は計算を変えない）。動きは2D版の出来事から写す
       行動の演出の開始（FX65 'play'）→ 行動する人の動き（命中の時刻に合わせる）
       命中（hitflash・ダメージの数字）→ 当たった人ののけぞり／倒れる（die・HP 0）→ 撃破の演出／勝利 → 勝利のポーズ
   ・敵の HP バー・名前・数字・2D の演出は2D版が描く。位置は3Dの敵を画面に写した矩形（rect）を battle.js に渡して合わせる
   ・まだ用意できていない敵は2D版の絵のまま表示する（drawn() が false）
   ========================================================= */
import * as THREE from 'three';
import { Character3D } from '../entities/Character3D.js';
import { MODELS, characterModelFor } from '../assets/manifest.js';
import { buildArtVolume } from './ArtVolume.js';
import { readable, isClean } from './readable.js';

const G = typeof window !== 'undefined' ? window : globalThis;
const ATTACK_HIT = 0.43;   // Attack の命中の瞬間（秒。Blender のフレーム 13/30）
const CAST_HIT = 0.55;
const ENEMY_STRIKE = 0.22;   // 敵（絵）の踏み込みの命中の瞬間
const PHYS = { strike: 1 };
const PHYS_FX = { arrow: 1, throw: 1, coins: 1, gear_shot: 1 };
const PX2W = 6.2 / 416;    // 2D版の戦闘画面（高さ 416px）の大きさ → ワールド単位
const PARTY_FACE = -Math.PI / 2 + 0.42;   // 左（敵）を向き、少しカメラの方へ

// 立ち位置（添付の構図：敵は左の手前と奥、味方は右に2列）
const ENEMY_SLOTS = [[-2.2, 2.2], [-3.9, 0.6], [-0.9, 0.3], [-4.0, 3.0], [-2.6, -0.9], [-5.0, -0.5], [-1.2, 3.3], [-5.4, 1.6]];
const ENEMY_LAYOUT = { 2: [[-1.1, 2.2], [-4.1, 0.0]], 3: [[-0.7, 2.4], [-3.2, -0.6], [-4.0, 2.5]], 4: [[-0.8, 2.5], [-2.8, -0.8], [-3.4, 2.6], [-5.6, -0.6]] };   // 遠近で手前と奥が画面上で同じ位置に重ならないよう、画面の横位置が手前・奥で交互になる値
const PARTY_SLOTS = [[1.7, 3.1], [2.7, 2.1], [3.3, 3.2], [4.2, 2.2], [4.7, 3.3], [5.2, 2.3]];
const PARTY_SCALE = 1.0;
const SPRITE_H = 1.42;   // 味方のドット絵の高さ（ワールド単位）
// ドット絵の味方：前後2列で互い違い（参考画像の並び）。人数ごとに、隣と重なりにくい間隔（約1.1）で右に並べる
const SPRITE_LAYOUT = { 1: [[2.0, 3.0]], 2: [[1.5, 3.2], [2.9, 2.5]], 3: [[1.2, 3.3], [2.45, 2.55], [3.65, 3.3]], 4: [[0.95, 3.4], [2.1, 2.6], [3.2, 3.4], [4.3, 2.6]] };
const SPRITE_SLOTS = SPRITE_LAYOUT[4];
// 戦闘の並び：'front'＝前後（味方が手前に後ろ姿で並び、奥に敵。ご要望で試作）／'side'＝左右（左に敵・右に味方）。3D設定・localStorage 'mtq3d-battle-layout'
export function battleLayout() { try { const q = /[?&]layout=(front|side)(&|$)/.exec(location.search); if (q) return q[1]; return localStorage.getItem('mtq3d-battle-layout') === 'side' ? 'side' : 'front'; } catch (e) { return 'front'; } }
// 前後の並び：敵は奥（z が小さい）に横一列（端ほど少し奥）、味方は手前（z≈4.6）に横一列
const FRONT_ENEMY = { 1: [[0, -0.6]], 2: [[-1.5, -0.7], [1.5, -0.7]], 3: [[-2.7, -0.9], [0, -0.4], [2.7, -0.9]], 4: [[-3.5, -1.2], [-1.2, -0.5], [1.2, -0.5], [3.5, -1.2]] };
const FRONT_ENEMY_SLOTS = [[-3.5, -1.2], [-1.2, -0.5], [1.2, -0.5], [3.5, -1.2], [-2.4, -2.6], [2.4, -2.6], [0, -2.9], [-4.6, -2.4]];
const FRONT_PARTY = { 1: [[0, 4.6]], 2: [[-0.5, 4.6], [0.5, 4.6]], 3: [[-0.95, 4.6], [0, 4.7], [0.95, 4.6]], 4: [[-1.42, 4.6], [-0.47, 4.7], [0.47, 4.7], [1.42, 4.6]] };
const FRONT_SPRITE_H = 0.95;   // 手前の味方（後ろ姿のドット絵。元の絵は 16×24 ドット）の高さ
// 味方の見た目：'sprite'＝2D版のドット絵のまま並べる（ご指示の構図）／'model'＝3Dモデル（開発の確認用。URL に ?party=model）
// 立ち位置の横の広がり（スマホの縦画面でカメラを寄せるため。BattleStage3D.fitCamera）。enemyHome / partyHome と同じ表から
export function layoutSpan(nEnemies, nParty, bossFirst) {
  const ex = []; for (let i = 0; i < nEnemies; i++) { if (nEnemies === 1 || (bossFirst && nEnemies <= 2 && i === 0)) ex.push(-2.6); else { const set = ENEMY_LAYOUT[nEnemies]; ex.push((set ? set[i] : ENEMY_SLOTS[i % ENEMY_SLOTS.length])[0]); } }
  const L = partyStyle() === 'sprite' ? (SPRITE_LAYOUT[nParty] || SPRITE_SLOTS) : PARTY_SLOTS; const px = []; for (let j = 0; j < nParty; j++) px.push(L[j % L.length][0]);
  if (!ex.length || !px.length) return null;
  return { L: Math.min(...ex) - (bossFirst ? 2.2 : 1.7), R: Math.max(...px) + 0.8 };   // 敵・味方の絵の半分の幅ほどの余白
}
export function partyStyle() { try { return /[?&]party=model(&|$)/.test(location.search) ? 'model' : 'sprite'; } catch (e) { return 'sprite'; } }   // ご指示によりドット絵に固定。3Dモデルは開発の確認用（URL に ?party=model）。以前の3D設定の値（'mtq3d-battle-party'）は使わない
// ドット絵の不透明な部分だけを切り出す（拡大はしない。ドットを保つ）
function cropPixels(img, sx, sy, sw, sh) {
  const w = sw || img.naturalWidth || img.width, h = sh || img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; g.drawImage(img, sx || 0, sy || 0, w, h, 0, 0, w, h);
  let d; try { d = g.getImageData(0, 0, w, h).data; } catch (e) { return null; }   // 読めない画像（別のサイト扱い）は使わない
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (x1 < 0) return null; const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; const og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o;
}
// 味方のドット絵：2D版の戦闘のパーティ欄と同じ立ち絵（主人公＝職業、仲間＝本人、ほか＝見た目のID）→ なければ歩行のドット絵（左向き）→ なければ2D版の簡易ドット
function partyPixelArt(a) {
  const A = G.Assets; let img = null, kind = 'portrait', wait = false;
  try { img = A && A.portrait ? A.portrait(a) : null; if (!img && A && A.portraitBySprite) img = A.portraitBySprite(a.sprite); } catch (e) { img = null; }   // パーティ欄と同じ順（本人 → 見た目のIDの立ち絵）
  if (img) { const r = readable(img); if (r.state === 'ok') { const c = cropPixels(r.img); if (c) return { canvas: c, kind }; } else if (r.state === 'loading') wait = true; }
  try { const f = A && A.walkFrame ? A.walkFrame(a.sprite, 'left', 1) : null; if (f) { const r = readable(f.img); if (r.state === 'ok') { const c = cropPixels(r.img, f.sx, f.sy, f.w, f.h); if (c) return { canvas: c, kind: 'walk', wait }; } else if (r.state === 'loading') wait = true; } } catch (e) { /* なし */ }
  try { if (G.Chars && G.Chars.frame) { const fr = G.Chars.frame(a.sprite, 'left', 0); if (fr && isClean(fr)) { const c = cropPixels(fr); if (c) return { canvas: c, kind: 'chars', wait }; } } } catch (e) { /* なし */ }
  return wait ? { wait: true } : null;
}

// 前後の並びの味方：歩行のドット絵の後ろ姿（上向き）→ なければ2D版の簡易ドットの後ろ姿 → なければ立ち絵（正面）
function partyPixelBack(a) {
  const A = G.Assets; let wait = false;
  try { const f = A && A.walkFrame ? A.walkFrame(a.sprite, 'up', 1) : null; if (f) { const r = readable(f.img); if (r.state === 'ok') { const c = cropPixels(r.img, f.sx, f.sy, f.w, f.h); if (c) return { canvas: c, kind: 'back' }; } else if (r.state === 'loading') wait = true; } } catch (e) { /* なし */ }
  try { if (G.Chars && G.Chars.frame) { const fr = G.Chars.frame(a.sprite, 'up', 0); if (fr && isClean(fr)) { const c = cropPixels(fr); if (c) return { canvas: c, kind: 'back', wait }; } } } catch (e) { /* なし */ }
  if (wait) return { wait: true };
  return partyPixelArt(a);
}

export class BattleActors3D {
  constructor(stage, models) { this.stage = stage; this.models = models; this.party = new Map(); this.enemies = []; this.seenPops = new WeakSet(); this.seenAnims = new WeakSet(); this.log = []; this.sync = []; }

  setup(scene, S) {
    this.dispose(); this.scene = scene; this.S = S; const b = scene.b; this.ready = 0; this.want = 0; this.failedArt = 0;
    b.enemies.forEach((e, i) => this.addEnemy(e, i));
    this.style = partyStyle(); this.layout = this.stage && this.stage.layout === 'side' ? 'side' : 'front';
    b.party.forEach((a, j) => {
      const model = a.id === 'hero' ? 'hero' : characterModelFor(a.sprite); const ent = { id: a.id, j, a, model, ch: null, ready: false, dead: false, victory: false, tries: 0 }; this.party.set(a.id, ent); this.want++;
      if (this.style === 'sprite') { this.buildSprite(ent); return; }
      Character3D.create(this.models, model, { scale: PARTY_SCALE }).then((ch) => { if (!ch || this.scene !== scene) return; ent.ch = ch; S.add(ch.root); ent.ready = true; this.ready++; }).catch((err) => { console.warn('battle party', model, err); ent.failed = true; });
    });
  }
  // 敵：2D版と同じ絵（BattleUI.enemyVisual）から立体を作る
  addEnemy(e, i) {
    const ent = { i, e, art: null, ready: false, deadT: -1, vis: false }; this.enemies[i] = ent; this.want++;
    this.buildArt(ent); return ent;
  }
  buildArt(ent) {
    const BU = G.BattleUI; let v = null; try { v = BU && BU.enemyVisual ? BU.enemyVisual(ent.e) : null; } catch (err) { v = null; }
    if (!v || !v.img) { ent.failed = true; return; }
    const img = v.img; const ok = img instanceof HTMLCanvasElement || (img.complete && (img.naturalWidth || 0) > 0);
    if (!ok) { ent.waitImg = img; return; }   // 読み込み中：次のフレームでもう一度
    const rd = readable(img); ent.waitClean = rd.state === 'loading';   // 別のサイト扱いの画像は CORS で読み直す（読み直し中は次のフレームでもう一度）
    if (rd.state === 'loading') return;
    if (rd.state !== 'ok') { ent.failed = true; ent.visImg = img; this.failedArt++; this.why = this.why || '敵の絵を読めない（別のサイト扱いの画像）'; return; }   // この敵は2D版の絵のまま（battle.js が描く）
    const old = ent.art, oldGroup = ent.group;
    try {
      const boss = !!ent.e.boss; const crowd = this.scene && this.scene.b.enemies.length >= 4 ? 0.82 : 1;
      const hgt = Math.max(0.9, Math.min(boss ? 6.2 : 3.8, v.h * PX2W * (boss ? 1.25 : 1.0) * crowd));
      ent.art = buildArtVolume(rd.img, { height: hgt, aspect: v.w / Math.max(1, v.h), smooth: v.smooth !== false, depth: 0.15 });
      ent.lift = (v.lift || 0) * PX2W; ent.visImg = img; ent.source = v.source || null; ent.waitImg = null;
      const g = new THREE.Group(); g.name = 'enemy_' + ent.i; g.add(ent.art.mesh); ent.group = g; ent.art.mesh.position.y = ent.lift;
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02;
      shadow.scale.set(ent.art.size.w * 0.42, ent.art.size.w * 0.16 + 0.15, 1); g.add(shadow); ent.shadow = shadow;
      ent.uniforms = ent.art.uniforms; ent.uniforms.uTime.value = Math.random() * 10;
      if (old) { if (oldGroup && oldGroup.parent) oldGroup.parent.remove(oldGroup); old.dispose(); }
      this.S.add(g);
      if (!ent.ready) { ent.ready = true; this.ready++; }
    } catch (err) { console.warn('battle art volume', err); ent.failed = true; this.failedArt++; }
  }

  // 味方：ドット絵を、ごく薄い板（光と影がつく）にして立てる。ドットはぼかさない
  buildSprite(ent) {
    const front = this.layout === 'front'; let art = null; try { art = front ? partyPixelBack(ent.a) : partyPixelArt(ent.a); } catch (err) { console.warn('battle party sprite', err); art = null; }
    const now = performance.now(); if (!ent.t0) ent.t0 = now; const waited = now - ent.t0;
    if (!art || (art.wait && !art.canvas)) { ent.tries++; if (!art && waited > 6000) { ent.failed = true; this.why = this.why || '味方のドット絵を読めない'; } return false; }   // 画像がまだ読めていない：次のフレームでもう一度
    if (art.kind !== 'portrait' && art.kind !== 'back' && waited < 4000) { ent.tries++; return false; }   // 立ち絵を少し待ってから（最大4秒）、歩行のドット絵で代用
    try {
      const c = art.canvas; const h = front ? FRONT_SPRITE_H : art.kind === 'portrait' ? SPRITE_H : SPRITE_H * 0.85;
      ent.art = buildArtVolume(c, { height: h, aspect: c.width / c.height, smooth: false, depth: 0.05, grid: Math.min(64, Math.max(24, c.width)) });
      ent.art.uniforms.uSway.value = 0.0; ent.art.uniforms.uSelf.value = 0.6; ent.art.mat.color.setScalar(0.62); ent.uniforms = ent.art.uniforms; ent.kind = art.kind;
      const g = new THREE.Group(); g.name = 'party_' + ent.id; g.add(ent.art.mesh); ent.group = g;
      const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(ent.art.size.w * 0.42, 0.22, 1); g.add(sh); ent.shadow = sh;
      this.S.add(g); ent.ready = true; this.ready++; return true;
    } catch (err) { console.warn('battle party sprite', err); ent.failed = true; return false; }
  }
  enemyHome(i) {
    const n = this.enemies.length; const ent = this.enemies[i];
    if (this.layout === 'front') {   // 前後の並び：奥に横一列（ボス1体は中央の少し奥）
      if (n === 1 || (ent && ent.e.boss && n <= 2 && i === 0)) return new THREE.Vector3(n === 2 && i === 0 ? -1.0 : 0, 0, ent && ent.e.boss ? -1.4 : -0.6);
      const fs = FRONT_ENEMY[n]; const f = fs ? fs[i] : FRONT_ENEMY_SLOTS[i % FRONT_ENEMY_SLOTS.length]; return new THREE.Vector3(f[0], 0, f[1]);
    }
    if (n === 1 || (ent && ent.e.boss && n <= 2 && i === 0)) return new THREE.Vector3(-2.6, 0, 1.2);
    const set = ENEMY_LAYOUT[n]; const s = set ? set[i] : ENEMY_SLOTS[i % ENEMY_SLOTS.length];   // 数ごとの並び（名前・HPバーが重なりにくいよう、手前と奥で左右をずらす）
    return new THREE.Vector3(s[0], 0, s[1]);
  }
  partyHome(j) { const n = this.scene && this.scene.b ? this.scene.b.party.length : 4; const L = this.layout === 'front' ? (FRONT_PARTY[n] || FRONT_PARTY[4]) : this.style === 'sprite' ? (SPRITE_LAYOUT[n] || SPRITE_SLOTS) : PARTY_SLOTS; const s = L[j % L.length]; return new THREE.Vector3(s[0], 0, s[1]); }

  /* ---------- 2D版の演出の開始（FX65 'play'）：行動する人の動きを、命中の時刻に合わせて始める ---------- */
  onFx(d, familyOf) {
    const def = d.def || {}, tl = d.tl || {}; const fam = familyOf(def.fx);
    const phys = PHYS[fam] || PHYS_FX[def.fx]; const hitAt = (tl.impacts && tl.impacts.length ? tl.impacts[0] : tl.hitAt || 300) / 1000;
    const isEnemy = /^e:/.test(d.from || '');
    const anim = phys ? 'Attack' : 'Cast'; const lead = isEnemy ? (phys ? ENEMY_STRIKE : 0.3) : (phys ? ATTACK_HIT : CAST_HIT);
    const delay = Math.max(0, hitAt - lead); const ts = hitAt < lead ? lead / Math.max(0.12, hitAt) : 1;   // 命中までが短い行動は、動きを速めて命中の瞬間を合わせる
    const actor = this.actorOf(d.from); if (!actor) return;
    const target = (d.to || [])[0]; const tp = target ? this.worldOf(target) : null;
    const now = performance.now() / 1000;
    actor.plan = { anim, at: now + delay, target: tp, targets: (d.to || []).slice(), phys, ts, lead, key: d.from, end: now + delay + (phys ? 0.9 : 1.2) / ts, self: (d.to || []).indexOf(d.from) >= 0 };
    this.log.push({ who: d.from, anim, hitAtMs: Math.round(hitAt * 1000), ts: +ts.toFixed(2) }); if (this.log.length > 200) this.log.shift();
  }
  // 同期の記録：2D版の命中（hitflash・ダメージの数字）の瞬間に、攻撃した人の動きが「命中の瞬間」から何ミリ秒ずれているか
  syncCheck(targetKey, now) {
    const all = [...this.enemies.filter(Boolean), ...this.party.values()];
    for (const a of all) { const p = a.plan; if (!p || !p.started || !p.targets || p.targets.indexOf(targetKey) < 0 || p.checked) continue; p.checked = true;
      const err = Math.round(((now - p.startedAt) * (p.ts || 1) - (p.lead || ATTACK_HIT)) * 1000 / (p.ts || 1)); this.sync.push({ who: p.key, target: targetKey, anim: p.anim, errMs: err }); if (this.sync.length > 200) this.sync.shift(); }
  }
  actorOf(key) { if (!key) return null; const m = /^e:(\d+)$/.exec(key); if (m) return this.enemies[+m[1]] || null; return this.party.get(key.replace(/^p:/, '')) || null; }
  worldOf(key) { const a = this.actorOf(key); if (!a) return null; if (a.group) return a.group.position.clone(); if (a.ch) return a.ch.root.position.clone(); return a.i !== undefined ? this.enemyHome(a.i) : this.partyHome(a.j); }

  /* ---------- 毎フレーム ---------- */
  update(dt, t, scene) {
    if (scene !== this.scene) return; const b = scene.b; const view = scene.view || {}; const now = performance.now() / 1000;
    for (let i = this.enemies.length; i < b.enemies.length; i++) this.addEnemy(b.enemies[i], i);   // 呼ばれて増えた敵
    // 命中・倒れる・現れる（2D版の anims を一度ずつ見る）
    for (const a of scene.anims) {
      if (this.seenAnims.has(a)) continue; this.seenAnims.add(a);
      const ent = a.idx !== undefined ? this.enemies[a.idx] : null;
      if (a.type === 'hitflash' && ent) { ent.hitT = now; this.syncCheck('e:' + a.idx, now); }
      else if (a.type === 'die' && ent) { ent.deadT = now; ent.fled = !!ent.e.fled; ent.deadDur = ent.e.boss ? 1.4 : 0.55; }
      else if (a.type === 'appear' && ent) ent.appearT = now;
      else if (a.type === 'lunge' && ent && !(ent.plan && now - ent.plan.at < 1.2)) ent.plan = { anim: 'Attack', at: now, phys: true, target: this.partyHome(0), end: now + 0.9, lead: ENEMY_STRIKE, key: 'e:' + a.idx, ts: 1 };
      else if (a.type === 'phase' && ent) ent.phaseT = now;
    }
    // 味方が当たった（数字が出た）
    for (const p of scene.pops) { if (this.seenPops.has(p)) continue; this.seenPops.add(p); if (p.side === 'party' && p.idx >= 0 && b.party[p.idx] && !/^\+/.test(p.text)) { const ent = this.party.get(b.party[p.idx].id); if (ent && ent.ch && !ent.dead) ent.ch.play('Hit', 0.05); if (ent && ent.art && !ent.dead) ent.hitT = now; this.syncCheck('p:' + b.party[p.idx].id, now); } }
    const ent0 = scene.entrance; const entP = ent0 ? Math.min(1, ent0.t / ent0.dur) : 1;
    // ---- 敵（絵の立体）
    this.enemies.forEach((en, i) => {
      if (!en) return;
      if (en.waitImg) { if (en.waitImg.complete && en.waitImg.naturalWidth > 0) this.buildArt(en); else return; }
      if (en.waitClean && !en.art) this.buildArt(en);   // CORS で読み直し中
      // 2D版が新しい画像へ切り替えたら作り直す（EnemyArt の遅い読み込み）
      try { const v = G.BattleUI.enemyVisual(en.e); if (v && v.img && en.visImg && v.img !== en.visImg) this.buildArt(en); } catch (err) { /* なし */ }
      if (!en.art) return; const U = en.uniforms; const g = en.group; const home = this.enemyHome(i); const ve = view.e && view.e[i];
      let x = home.x, y = 0, z = home.z, vis = !!ve && (!scene.gone[i] || en.deadT >= 0), sx = 1, sy = 1;
      U.uTime.value += dt;
      // 呼吸（2D版の bob・breathe と同じくらい）と、浮く敵の上下
      const br = Math.sin(t * 1.65 + i) * 0.015; sy *= 1 + br; sx *= 1 - br * 0.5; const bob = en.lift > 0 ? Math.sin(t * 2 + i) * 0.08 : 0;
      // 行動：踏み込み（右＝味方の方へ）／呪文の光
      if (en.plan && now >= en.plan.at) {
        const p = en.plan; if (!p.started) { p.started = true; p.startedAt = now; }
        const k = (now - p.startedAt) * (p.ts || 1);
        if (p.phys) { const f = k < ENEMY_STRIKE ? k / ENEMY_STRIKE : Math.max(0, 1 - (k - ENEMY_STRIKE) / 0.35);
          if (this.layout === 'front') { const tz = p.target ? p.target.z - 1.8 : home.z + 2; z += (tz - home.z) * 0.4 * f; x += ((p.target ? p.target.x : home.x) - home.x) * 0.2 * f; sx *= 1 + 0.06 * f; sy *= 1 + 0.04 * f; }   // 前後：手前（味方の方）へ踏み込む
          else { const tx = p.target ? p.target.x - 1.4 : home.x + 2; x += (tx - home.x) * 0.45 * f; z += ((p.target ? p.target.z : home.z) - home.z) * 0.3 * f; sx *= 1 + 0.06 * f; } }
        else { const f = Math.max(0, Math.sin(Math.min(1, k / 0.6) * Math.PI)); U.uGlow.value.setRGB(0.35 * f, 0.25 * f, 0.6 * f); sy *= 1 + 0.04 * f; }
        if (now > p.end) { en.plan = null; U.uGlow.value.setRGB(0, 0, 0); }
      }
      // 被弾：白く光って後ろ（左）へ
      if (en.hitT) { const k = (now - en.hitT) / 0.32; if (k >= 1) { en.hitT = 0; U.uFlash.value = 0; } else { U.uFlash.value = 0.85 * (1 - k); if (this.layout === 'front') z -= Math.sin(k * Math.PI) * 0.4; else x -= Math.sin(k * Math.PI) * 0.35; } }   // 前後：奥へ
      // 形態変化（phase）：赤く脈打つ
      if (en.phaseT) { const k = (now - en.phaseT) / 0.7; if (k >= 1) { en.phaseT = 0; U.uGlow.value.setRGB(0, 0, 0); } else U.uGlow.value.setRGB(0.7 * (1 - k), 0.08, 0.08); }
      // 倒れる：溶けるように消える／逃げる：左へ去る
      if (en.deadT >= 0) { const k = (now - en.deadT) / en.deadDur; if (en.fled) { if (this.layout === 'front') z -= k * 9; else x -= k * 7; } else U.uDissolve.value = Math.min(1.05, k * 1.1); if (k > 1.05) vis = false; }
      // 呼ばれて現れる：逆に溶け出てくる
      if (en.appearT) { const k = (now - en.appearT) / 0.5; if (k >= 1) { en.appearT = 0; U.uDissolve.value = 0; } else U.uDissolve.value = 1 - k; }
      if (ent0) y -= (1 - (1 - Math.pow(1 - entP, 3))) * (en.art.size.h + 0.5);   // ボスの登場：地面からせり上がる
      g.position.set(x, y, z); g.rotation.y = this.layout === 'front' ? 0 : 0.28; en.art.mesh.position.y = en.lift + bob; en.art.mesh.scale.set(sx, sy, 1);   // 前後：正面（カメラ）を向く
      if (en.shadow) en.shadow.material.opacity = 0.32 * (1 - Math.min(1, U.uDissolve.value));
      g.visible = vis; en.vis = vis;
    });
    // ---- 味方（ドット絵）
    if (this.style === 'sprite') { this.updateSprites(dt, t, scene, view, now); return; }
    // ---- 味方（3Dモデル）
    for (const ent of this.party.values()) {
      const ch = ent.ch; if (!ch) continue; const pv = view.p ? view.p.find((x) => x.id === ent.id) : null; const home = this.partyHome(ent.j);
      const dead = !!(pv && (pv.dead || pv.hp <= 0));
      if (dead && !ent.dead) { ent.dead = true; ent.plan = null; ch.play('Defeat', 0.12); }
      if (!dead && ent.dead) { ent.dead = false; ch.play('Idle', 0.3); }
      let x = home.x, z = home.z; let yaw = PARTY_FACE;
      if (ent.plan && !dead) {
        const p = ent.plan;
        if (now >= p.at && !p.started) { p.started = true; p.startedAt = now; ch.play(p.anim, 0.08, { timeScale: p.ts }); }
        if (p.phys && p.target && !p.self) {   // 打撃：相手の手前まで踏み込み、戻る
          const sp = p.startedAt || now; const lead = p.lead / (p.ts || 1);
          const k = Math.max(0, Math.min(1, (now - (p.at - 0.25)) / 0.3)), back = Math.max(0, Math.min(1, (now - (sp + lead + 0.2)) / 0.35)); const f = k * (1 - back);
          const tx = p.target.x + 1.7, tz = p.target.z + 0.3; x += (tx - home.x) * f; z += (tz - home.z) * f; yaw = PARTY_FACE + (Math.atan2(tx - home.x, tz - home.z) - PARTY_FACE) * f * 0.6;
        }
        if (now > p.end) ent.plan = null;
      }
      if (scene.victory >= 0 && !dead && !ent.victory) { ent.victory = true; ch.play('Victory', 0.2); }
      const defending = b.party.find((a) => a.id === ent.id && a.defending);
      if (!ent.plan && !dead && !ch.onceName && !ent.victory) ch.play(defending && ch.has('Defend') ? 'Defend' : 'Idle', 0.25);
      ch.root.position.set(x, 0, z); ch.faceTo(yaw); ch.update(dt);
    }
  }

  // 味方のドット絵の動き（2D の戦闘と同じく、絵は変えずに位置・傾き・光で表す）
  updateSprites(dt, t, scene, view, now) {
    const b = scene.b; const cam = this.stage.camera.position;
    for (const ent of this.party.values()) {
      if (!ent.art) { if (!ent.failed) this.buildSprite(ent); if (!ent.art) continue; }
      const U = ent.uniforms; const g = ent.group; const m = ent.art.mesh; U.uTime.value += dt;
      const pv = view.p ? view.p.find((x) => x.id === ent.id) : null; const home = this.partyHome(ent.j);
      const dead = !!(pv && (pv.dead || pv.hp <= 0));
      if (dead && !ent.dead) { ent.dead = true; ent.plan = null; ent.deadT = now; }
      if (!dead && ent.dead) { ent.dead = false; ent.reviveT = now; }
      const front = this.layout === 'front'; let x = home.x, y = 0, z = home.z, rz = 0, rx = 0, sx = 1, sy = 1 + Math.sin(t * 1.8 + ent.j) * 0.012;
      if (ent.plan && !dead) {
        const p = ent.plan; if (now >= p.at && !p.started) { p.started = true; p.startedAt = now; }
        const lead = p.lead / (p.ts || 1);
        if (p.phys && p.target && !p.self) {   // 打撃：相手の手前まで跳んで、斬って、戻る
          const k = Math.max(0, Math.min(1, (now - (p.at - 0.25)) / 0.3)), back = Math.max(0, Math.min(1, (now - ((p.startedAt || now) + lead + 0.2)) / 0.35)); const f = k * (1 - back);
          if (front) { x += (p.target.x - home.x) * 0.85 * f; z += (p.target.z + 1.5 - home.z) * f; } else { x += (p.target.x + 1.7 - home.x) * f; z += (p.target.z + 0.3 - home.z) * f; }   // 前後：敵の手前まで（奥へ）跳ぶ
          y += Math.sin(f * Math.PI) * 0.25;
          const sw = p.started ? Math.max(0, 1 - Math.abs((now - p.startedAt) - lead) / 0.18) : 0; if (front) rx = -(0.08 * f + 0.3 * sw); else rz = 0.08 * f + 0.22 * sw;   // 命中の瞬間に前へ傾く
        } else if (p.started) {   // 呪文・道具：光って少し伸びる
          const f = Math.max(0, Math.sin(Math.min(1, (now - p.startedAt) / 0.7) * Math.PI)); U.uGlow.value.setRGB(0.25 * f, 0.35 * f, 0.6 * f); sy *= 1 + 0.05 * f;
        }
        if (now > p.end) { ent.plan = null; U.uGlow.value.setRGB(0, 0, 0); }
      }
      if (ent.hitT) { const k = (now - ent.hitT) / 0.32; if (k >= 1) { ent.hitT = 0; U.uFlash.value = 0; } else { U.uFlash.value = 0.8 * (1 - k); if (front) { z += Math.sin(k * Math.PI) * 0.3; rx += 0.12 * Math.sin(k * Math.PI); } else { x += Math.sin(k * Math.PI) * 0.3; rz -= 0.1 * Math.sin(k * Math.PI); } } }
      if (ent.dead) { const k = Math.min(1, (now - ent.deadT) / 0.4); rz = -1.35 * k; y = 0.05; ent.art.mat.color.setScalar(0.62 - 0.3 * k); }
      else if (ent.reviveT) { const k = Math.min(1, (now - ent.reviveT) / 0.4); ent.art.mat.color.setScalar(0.32 + 0.3 * k); if (k >= 1) ent.reviveT = 0; }
      if (scene.victory >= 0 && !ent.dead) { if (!ent.victory) { ent.victory = true; ent.vicT = now; } const k = now - ent.vicT; if (k < 1.6) y += Math.abs(Math.sin(k * 7)) * 0.3 * (1 - k / 1.6); }
      const defending = b.party.find((a) => a.id === ent.id && a.defending); if (defending && !ent.plan && !ent.dead) sy *= 0.96;
      g.position.set(x, y, z); g.rotation.y = Math.atan2(cam.x - x, cam.z - z); m.rotation.z = rz; m.rotation.x = rx; m.scale.set(sx, sy, 1);
    }
  }
  /* ---------- battle.js から：敵を画面へ写した矩形（HP バー・名前・数字・2D の演出の位置） ---------- */
  rect(i, W, H, camera) {
    const en = this.enemies[i]; if (!en || !en.art || !en.ready) return null;
    const p = en.group.position; const s = en.art.size; const half = s.w * 0.5; const y0 = Math.max(0, p.y) + (en.lift || 0);
    const pts = [new THREE.Vector3(p.x - half, y0, p.z), new THREE.Vector3(p.x + half, y0, p.z), new THREE.Vector3(p.x - half, y0 + s.h, p.z), new THREE.Vector3(p.x + half, y0 + s.h, p.z)];
    const sp = pts.map((v) => v.project(camera)); const xs = sp.map((v) => (v.x * 0.5 + 0.5) * W), ys = sp.map((v) => (-v.y * 0.5 + 0.5) * H);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), yy0 = Math.min(...ys), yy1 = Math.max(...ys); const n = Math.max(1, this.enemies.length);
    return { x: Math.round(x0), y: Math.round(yy0), w: Math.max(24, Math.round(x1 - x0)), h: Math.max(24, Math.round(yy1 - yy0)), size: Math.max(24, Math.round(x1 - x0)), slot: W / (n + 1), smooth: true, lift: 0, from3d: true };
  }
  // 味方の胸の位置（2D の演出・数字の位置）
  partyPos(id, W, H, camera) { const ent = this.party.get(id); if (!ent || !(ent.ch || ent.group)) return null; const v = (ent.group ? ent.group.position : ent.ch.root.position).clone(); v.y += ent.art ? ent.art.size.h * 0.6 : 1.05; v.project(camera); return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H }; }
  // 立ち位置（動いていないとき）での、味方の頭の高さと、敵・味方の足もとの一番下（画面の y。applyBand 用）
  homeBox(W, H, camera) {
    const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return (-v.y * 0.5 + 0.5) * H; };
    let partyTop = Infinity, bottom = -Infinity, n = 0;
    for (const ent of this.party.values()) { if (!ent.art) continue; const h = this.partyHome(ent.j); partyTop = Math.min(partyTop, proj(h.x, ent.art.size.h, h.z)); bottom = Math.max(bottom, proj(h.x, 0, h.z)); n++; }
    let enemyTop = Infinity; for (const en of this.enemies) { if (!en || !en.art) continue; const h = this.enemyHome(en.i); bottom = Math.max(bottom, proj(h.x, 0, h.z)); enemyTop = Math.min(enemyTop, proj(h.x, en.art.size.h + (en.lift || 0), h.z)); }
    return n ? { partyTop, enemyTop, bottom, front: this.layout === 'front' } : null;
  }
  // 立ち位置での、敵・味方全体の画面の範囲（applyFit 用）：敵の名前（頭の上）から、足もとの HP バー・味方の足もとまで
  contentBox(W, H, camera) {
    const P = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };
    let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity, n = 0; const add = (x, y) => { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); };
    for (const ent of this.party.values()) { if (!ent.art) continue; const h = this.partyHome(ent.j), w = ent.art.size.w / 2; const a = P(h.x - w, ent.art.size.h, h.z), c = P(h.x + w, 0, h.z); add(a[0], a[1]); add(c[0], c[1]); n++; }
    for (const en of this.enemies) { if (!en || !en.art) continue; const h = this.enemyHome(en.i), w = en.art.size.w / 2, lift = en.lift || 0; const a = P(h.x - w, en.art.size.h + lift, h.z), c = P(h.x + w, 0, h.z); add(a[0], a[1] - H * 0.06); add(c[0], c[1] + H * 0.03); n++; }   // 名前・HPバーのぶん
    return n ? { l, r, t, b } : null;
  }
  // 味方のドット絵を画面に写した矩形（スマホの画面部品との重なりの確認用。3Dモデルの方式では null）
  partyRect(id, W, H, camera) {
    const ent = this.party.get(id); if (!ent || !ent.group || !ent.art) return null;
    const p = ent.group.position; const s = ent.art.size; const half = s.w * 0.5;
    const pts = [new THREE.Vector3(p.x - half, p.y, p.z), new THREE.Vector3(p.x + half, p.y, p.z), new THREE.Vector3(p.x - half, p.y + s.h, p.z), new THREE.Vector3(p.x + half, p.y + s.h, p.z)].map((v) => v.project(camera));
    const xs = pts.map((v) => (v.x * 0.5 + 0.5) * W), ys = pts.map((v) => (-v.y * 0.5 + 0.5) * H);
    return { x: Math.round(Math.min(...xs)), y: Math.round(Math.min(...ys)), w: Math.round(Math.max(...xs) - Math.min(...xs)), h: Math.round(Math.max(...ys) - Math.min(...ys)) };
  }
  drawn(i) { const en = this.enemies[i]; return !!(en && en.ready && en.art); }
  allReady() { let f = 0; for (const e of this.party.values()) if (e.failed && !e.ready) f++; for (const e of this.enemies) if (e && e.failed && !e.ready) f++; return this.want > 0 && this.ready + f >= this.want; }   // 読めずに2Dのままの敵・味方も「準備できた」に数える
  info() {
    return { want: this.want, ready: this.ready, failedArt: this.failedArt,
      enemies: this.enemies.filter(Boolean).map((e) => ({ i: e.i, id: e.e.defId, source: e.source, ready: e.ready, vis: !!e.vis, size: e.art ? { w: +e.art.size.w.toFixed(2), h: +e.art.size.h.toFixed(2) } : null, tris: e.art ? e.art.stats.tris : 0, plan: e.plan ? e.plan.anim : null, dissolve: e.uniforms ? +e.uniforms.uDissolve.value.toFixed(2) : 0 })),
      style: this.style, party: [...this.party.values()].map((p) => ({ id: p.id, model: this.style === 'sprite' ? 'pixel:' + (p.kind || 'pending') : p.model, ready: p.ready, anim: p.ch ? p.ch.currentName : (p.plan ? p.plan.anim : p.dead ? 'Defeat' : 'Idle'), dead: p.dead, status: this.style === 'sprite' ? '2D' : (MODELS[p.model] ? MODELS[p.model].status : 'fallback') })),
      log: this.log.slice(-20), sync: this.sync.slice(-40) };
  }
  dispose() {
    for (const en of this.enemies) if (en && en.art) { if (en.group && en.group.parent) en.group.parent.remove(en.group); en.art.dispose(); }
    for (const p of this.party.values()) { if (p.ch) { p.ch.mixer.stopAllAction(); if (p.ch.root.parent) p.ch.root.parent.remove(p.ch.root); } if (p.art) { if (p.group && p.group.parent) p.group.parent.remove(p.group); p.art.dispose(); } }
    this.enemies = []; this.party = new Map(); this.scene = null;
  }
}
