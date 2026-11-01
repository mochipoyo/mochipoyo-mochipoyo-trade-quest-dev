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
const PARTY_SLOTS = [[1.7, 3.1], [2.7, 2.1], [3.3, 3.2], [4.2, 2.2], [4.7, 3.3], [5.2, 2.3]];
const PARTY_SCALE = 1.0;

export class BattleActors3D {
  constructor(stage, models) { this.stage = stage; this.models = models; this.party = new Map(); this.enemies = []; this.seenPops = new WeakSet(); this.seenAnims = new WeakSet(); this.log = []; this.sync = []; }

  setup(scene, S) {
    this.dispose(); this.scene = scene; this.S = S; const b = scene.b; this.ready = 0; this.want = 0; this.failedArt = 0;
    b.enemies.forEach((e, i) => this.addEnemy(e, i));
    b.party.forEach((a, j) => {
      const model = a.id === 'hero' ? 'hero' : characterModelFor(a.sprite); const ent = { id: a.id, j, model, ch: null, ready: false, dead: false, victory: false }; this.party.set(a.id, ent); this.want++;
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
    const old = ent.art, oldGroup = ent.group;
    try {
      const boss = !!ent.e.boss; const crowd = this.scene && this.scene.b.enemies.length >= 4 ? 0.82 : 1;
      const hgt = Math.max(0.9, Math.min(boss ? 6.2 : 3.8, v.h * PX2W * (boss ? 1.25 : 1.0) * crowd));
      ent.art = buildArtVolume(img, { height: hgt, aspect: v.w / Math.max(1, v.h), smooth: v.smooth !== false, depth: 0.15 });
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

  enemyHome(i) {
    const s = ENEMY_SLOTS[i % ENEMY_SLOTS.length]; const n = this.enemies.length; const ent = this.enemies[i];
    if (n === 1 || (ent && ent.e.boss && n <= 2 && i === 0)) return new THREE.Vector3(-2.6, 0, 1.2);
    return new THREE.Vector3(s[0], 0, s[1]);
  }
  partyHome(j) { const s = PARTY_SLOTS[j % PARTY_SLOTS.length]; return new THREE.Vector3(s[0], 0, s[1]); }

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
    for (const p of scene.pops) { if (this.seenPops.has(p)) continue; this.seenPops.add(p); if (p.side === 'party' && p.idx >= 0 && b.party[p.idx] && !/^\+/.test(p.text)) { const ent = this.party.get(b.party[p.idx].id); if (ent && ent.ch && !ent.dead) ent.ch.play('Hit', 0.05); this.syncCheck('p:' + b.party[p.idx].id, now); } }
    const ent0 = scene.entrance; const entP = ent0 ? Math.min(1, ent0.t / ent0.dur) : 1;
    // ---- 敵（絵の立体）
    this.enemies.forEach((en, i) => {
      if (!en) return;
      if (en.waitImg) { if (en.waitImg.complete && en.waitImg.naturalWidth > 0) this.buildArt(en); else return; }
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
        if (p.phys) { const f = k < ENEMY_STRIKE ? k / ENEMY_STRIKE : Math.max(0, 1 - (k - ENEMY_STRIKE) / 0.35); const tx = p.target ? p.target.x - 1.4 : home.x + 2; x += (tx - home.x) * 0.45 * f; z += ((p.target ? p.target.z : home.z) - home.z) * 0.3 * f; sx *= 1 + 0.06 * f; }
        else { const f = Math.max(0, Math.sin(Math.min(1, k / 0.6) * Math.PI)); U.uGlow.value.setRGB(0.35 * f, 0.25 * f, 0.6 * f); sy *= 1 + 0.04 * f; }
        if (now > p.end) { en.plan = null; U.uGlow.value.setRGB(0, 0, 0); }
      }
      // 被弾：白く光って後ろ（左）へ
      if (en.hitT) { const k = (now - en.hitT) / 0.32; if (k >= 1) { en.hitT = 0; U.uFlash.value = 0; } else { U.uFlash.value = 0.85 * (1 - k); x -= Math.sin(k * Math.PI) * 0.35; } }
      // 形態変化（phase）：赤く脈打つ
      if (en.phaseT) { const k = (now - en.phaseT) / 0.7; if (k >= 1) { en.phaseT = 0; U.uGlow.value.setRGB(0, 0, 0); } else U.uGlow.value.setRGB(0.7 * (1 - k), 0.08, 0.08); }
      // 倒れる：溶けるように消える／逃げる：左へ去る
      if (en.deadT >= 0) { const k = (now - en.deadT) / en.deadDur; if (en.fled) { x -= k * 7; } else U.uDissolve.value = Math.min(1.05, k * 1.1); if (k > 1.05) vis = false; }
      // 呼ばれて現れる：逆に溶け出てくる
      if (en.appearT) { const k = (now - en.appearT) / 0.5; if (k >= 1) { en.appearT = 0; U.uDissolve.value = 0; } else U.uDissolve.value = 1 - k; }
      if (ent0) y -= (1 - (1 - Math.pow(1 - entP, 3))) * (en.art.size.h + 0.5);   // ボスの登場：地面からせり上がる
      g.position.set(x, y, z); g.rotation.y = 0.28; en.art.mesh.position.y = en.lift + bob; en.art.mesh.scale.set(sx, sy, 1);
      if (en.shadow) en.shadow.material.opacity = 0.32 * (1 - Math.min(1, U.uDissolve.value));
      g.visible = vis; en.vis = vis;
    });
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
  partyPos(id, W, H, camera) { const ent = this.party.get(id); if (!ent || !ent.ch) return null; const v = ent.ch.root.position.clone(); v.y += 1.05; v.project(camera); return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H }; }
  drawn(i) { const en = this.enemies[i]; return !!(en && en.ready && en.art); }
  allReady() { return this.want > 0 && this.ready >= this.want; }
  info() {
    return { want: this.want, ready: this.ready, failedArt: this.failedArt,
      enemies: this.enemies.filter(Boolean).map((e) => ({ i: e.i, id: e.e.defId, source: e.source, ready: e.ready, vis: !!e.vis, size: e.art ? { w: +e.art.size.w.toFixed(2), h: +e.art.size.h.toFixed(2) } : null, tris: e.art ? e.art.stats.tris : 0, plan: e.plan ? e.plan.anim : null, dissolve: e.uniforms ? +e.uniforms.uDissolve.value.toFixed(2) : 0 })),
      party: [...this.party.values()].map((p) => ({ id: p.id, model: p.model, ready: p.ready, anim: p.ch ? p.ch.currentName : null, dead: p.dead, status: MODELS[p.model] ? MODELS[p.model].status : 'fallback' })),
      log: this.log.slice(-20), sync: this.sync.slice(-40) };
  }
  dispose() {
    for (const en of this.enemies) if (en && en.art) { if (en.group && en.group.parent) en.group.parent.remove(en.group); en.art.dispose(); }
    for (const p of this.party.values()) if (p.ch) { p.ch.mixer.stopAllAction(); if (p.ch.root.parent) p.ch.root.parent.remove(p.ch.root); }
    this.enemies = []; this.party = new Map(); this.scene = null;
  }
}
