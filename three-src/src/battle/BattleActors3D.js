/* =========================================================
   BattleActors3D（Phase 2）：3D版の戦闘。左に敵、右に主人公たち（横から少し斜めに見る構図）
   ・敵：2D版の敵の絵（BattleUI.enemyVisual：新しい画像・ボス画像・従来の絵）をそのまま使い、絵から厚みのある立体を作る（ArtVolume）
         → 元のデザインのまま3Dの舞台に立つ。光・影・揺れ・被弾・撃破の演出だけを3Dで付ける
   ・味方：3Dモデル（主人公・リナは手作業で調整したモデル、ほかは2D版の配色から自動生成または代用）。敵の方（左）を向く
   ・v6.8 味方（ドット絵の方式・ふだんの表示）：人物ID ごとの4方向の絵（PartyDirections・assets/characters/party-directions-v3/）。
     前後の並び＝back、左右の並び＝敵のいる側（left／right）、勝利＝front。転職・旧セーブの sprite に関係なく本人の絵。読めないときは以前の絵で表示し、読めたら差し替える
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
import * as PD from './PartyDirections.js';

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
// v6.6 「前後」の並びの背景：'photo'＝戦闘背景の画像を画面いっぱいに（2D版と同じ絵。3Dの地面・景色は隠す）／'3d'＝以前の3Dの景色。3D設定・localStorage 'mtq3d-battle-bg'・URL ?bg=photo|3d
// v6.6 敵の簡易の絵（コードで描く絵。画像ファイルを使わないので、3Dで必ず読める）。新しい画像を3Dで使えないときの代わり
// v6.7 未使用：絵を3Dで使えないときの簡易の絵（旧デザインに見えるため、使うのをやめた。buildArt を参照）
function altVisual(e) {
  try {
    if (e && e.art && G.MonsterArt && G.MonsterArt.image) { const c = G.MonsterArt.image(e.art, 3, 0); if (c && c.width && isClean(c)) return { img: c, w: c.width, h: c.height, smooth: false }; }
    if (e && e.sprite && G.Sprites && G.Sprites.draw) { const c = document.createElement('canvas'); G.Sprites.draw(c, e.sprite, e.boss ? 9 : 6, false); if (c.width && isClean(c)) return { img: c, w: c.width, h: c.height, smooth: false }; }
  } catch (err) { /* なし */ }
  return null;
}
export function battleBgPref() { try { const q = /[?&]bg=(photo|3d)(&|$)/.exec(location.search); if (q) return q[1]; return localStorage.getItem('mtq3d-battle-bg') === '3d' ? '3d' : 'photo'; } catch (e) { return 'photo'; } }
export function battleLayout() { try { const q = /[?&]layout=(front|side)(&|$)/.exec(location.search); if (q) return q[1]; return localStorage.getItem('mtq3d-battle-layout') === 'side' ? 'side' : 'front'; } catch (e) { return 'front'; } }
// 前後の並び：敵は奥（z が小さい）に横一列（端ほど少し奥）、味方は手前（z≈4.6）に横一列
const FRONT_ENEMY = { 1: [[0, -0.6]], 2: [[-1.5, -0.7], [1.5, -0.7]], 3: [[-2.7, -0.9], [0, -0.4], [2.7, -0.9]], 4: [[-3.5, -1.2], [-1.2, -0.5], [1.2, -0.5], [3.5, -1.2]] };
const FRONT_ENEMY_SLOTS = [[-3.5, -1.2], [-1.2, -0.5], [1.2, -0.5], [3.5, -1.2], [-2.4, -2.6], [2.4, -2.6], [0, -2.9], [-4.6, -2.4]];
const FRONT_PARTY = { 1: [[0, 4.6]], 2: [[-0.5, 4.6], [0.5, 4.6]], 3: [[-0.95, 4.6], [0, 4.7], [0.95, 4.6]], 4: [[-1.42, 4.6], [-0.47, 4.7], [0.47, 4.7], [1.42, 4.6]] };
const FRONT_NEAR_DZ = 2.2, FRONT_NEAR_DZ_MANY = 0.6, FRONT_NEAR_SX = 0.66;   // v6.8 スマホ縦画面の前後の並び：敵を手前へ出す量（1・2体／5体以上）と、5体以上の横の間隔（ご要望：モンスターが奥へ行きすぎ）
const FRONT_ENEMY_PORT = { 3: [[-1.9, -1.2], [0, 0.6], [1.9, -1.2]], 4: [[-2.25, -1.6], [-0.78, 0.5], [0.78, 0.5], [2.25, -1.6]] };   // v6.8 スマホ縦画面（左にコマンド欄）の3・4体の立ち位置
const FRONT_SPRITE_H = 0.95;   // 手前の味方（後ろ姿のドット絵。元の絵は 16×24 ドット）の高さ
// v6.8 味方の4方向の絵（PartyDirections）：人物の基準の高さ（ワールド単位。その人物の4方向でいちばん高い絵＝武器・杖を含む高さ × 体格の比）
//   左右の並びは以前の立ち絵と同じ 1.42（既存の正面の絵がある7人は、以前と同じ大きさになる）。前後の並びは画面の手前なので少し小さく
const DIR_H_SIDE = SPRITE_H;
const DIR_H_FRONT = 1.2;
const DIR_WAIT = 2500;   // 新しい絵の読み込みを待つ最長（ミリ秒）。過ぎたら以前の絵で始め、読めたら差し替える
// v6.8 神聖犬ポン太（4人とは別枠）の立ち位置：前後の並び＝味方の列の右・少し手前／左右の並び＝先頭の味方の前（敵の側）・カメラ寄り
const PET_FRONT_DX = 0.95, PET_FRONT_Z = 5.0, PET_SIDE_DX = -0.85, PET_SIDE_Z = 0.6;   // 左右の並び：先頭の味方の手前（敵の側・カメラ寄り）
// 開発の確認用：URL の ?partydir=front|back|left|right で、味方の向きを固定する（勝利の振り向きもしない）
export function devPartyDir() { try { const q = /[?&]partydir=(front|back|left|right)(&|$)/.exec(location.search); return q ? q[1] : null; } catch (e) { return null; } }
// 味方の見た目：'sprite'＝2D版のドット絵のまま並べる（ご指示の構図）／'model'＝3Dモデル（開発の確認用。URL に ?party=model）
// 立ち位置の横の広がり（スマホの縦画面でカメラを寄せるため。BattleStage3D.fitCamera）。enemyHome / partyHome と同じ表から
export function layoutSpan(nEnemies, nParty, bossFirst, hasPet) {
  const ex = []; for (let i = 0; i < nEnemies; i++) { if (nEnemies === 1 || (bossFirst && nEnemies <= 2 && i === 0)) ex.push(-2.6); else { const set = ENEMY_LAYOUT[nEnemies]; ex.push((set ? set[i] : ENEMY_SLOTS[i % ENEMY_SLOTS.length])[0]); } }
  const L = partyStyle() === 'sprite' ? (SPRITE_LAYOUT[nParty] || SPRITE_SLOTS) : PARTY_SLOTS; const px = []; for (let j = 0; j < nParty; j++) px.push(L[j % L.length][0]);
  if (hasPet && px.length) px.push(px[0] + PET_SIDE_DX);   // v6.8 神聖犬ポン太（先頭の味方の前）
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
    // v6.8 味方の向き：前後の並び＝背中（back）。左右の並び＝敵のいる側を向く（敵が左なら left、右なら right）。正面（front）は勝利のときだけ
    this.partyDir = devPartyDir() || this.sideDir(b);
    if (this.style === 'sprite') b.party.forEach((a) => { PD.retryFailed(a, [this.partyDir, 'front'], 1500); PD.load(a, this.partyDir); PD.load(a, 'front'); });   // 先読み（地図にいるあいだに読み込み済みならすぐ使える）
    // v6.8 神聖犬ポン太：味方の板と同じしくみで、味方の右に立てる（id は 'ponta'。j = -1 で立ち位置は petHome）
    if (b.pet && this.style === 'sprite') { const pa = { id: b.pet.id, sprite: b.pet.id, job: null, pet: true }; PD.retryFailed(pa, [this.partyDir, 'front'], 1500); PD.load(pa, this.partyDir); PD.load(pa, 'front'); const ent = { id: b.pet.id, j: -1, a: pa, pet: true, model: null, ch: null, ready: false, dead: false, victory: false, tries: 0 }; this.party.set(b.pet.id, ent); this.want++; this.buildSprite(ent); }
    b.party.forEach((a, j) => {
      const model = a.id === 'hero' ? 'hero' : characterModelFor(a.sprite); const ent = { id: a.id, j, a, model, ch: null, ready: false, dead: false, victory: false, tries: 0 }; this.party.set(a.id, ent); this.want++;
      if (this.style === 'sprite') { this.buildSprite(ent); return; }
      Character3D.create(this.models, model, { scale: PARTY_SCALE }).then((ch) => { if (!ch || this.scene !== scene) return; ent.ch = ch; S.add(ch.root); ent.ready = true; this.ready++; }).catch((err) => { console.warn('battle party', model, err); ent.failed = true; });
    });
  }
  // v6.8 左右の並びで味方が向く側（敵の平均の横位置が味方より左なら left）。前後の並びは back
  sideDir(b) {
    if (this.layout === 'front') return 'back';
    const n = this.enemies.length, m = b.party.length; if (!n || !m) return 'left';
    let ex = 0, px = 0; for (let i = 0; i < n; i++) ex += this.enemyHome(i).x; for (let j = 0; j < m; j++) px += this.partyHome(j).x;
    return ex / n <= px / m ? 'left' : 'right';
  }
  // 敵：2D版と同じ絵（BattleUI.enemyVisual）から立体を作る
  addEnemy(e, i) {
    const ent = { i, e, art: null, ready: false, deadT: -1, vis: false }; this.enemies[i] = ent; this.want++;
    this.buildArt(ent); return ent;
  }
  // v6.6 前後の並び：3Dの敵がまだ（絵の読み込み中など）のとき、2D版が代わりに描く位置。3Dの立ち位置（奥）に写す（以前は2D版の位置＝画面の中ほどで、味方の手前に重なった）
  estRect(i, W, H, camera) {
    const en = this.enemies[i]; let v = null; try { v = G.BattleUI && G.BattleUI.enemyVisual ? G.BattleUI.enemyVisual(en.e) : null; } catch (err) { v = null; } if (!v) return null;
    const boss = !!en.e.boss; const crowd = this.scene && this.scene.b.enemies.length >= 4 ? 0.82 : 1;
    const hgt = Math.max(0.9, Math.min(boss ? 6.2 : 3.8, v.h * PX2W * (boss ? 1.25 : 1.0) * crowd)); const wid = hgt * v.w / Math.max(1, v.h);
    const p = this.enemyHome(i); const half = wid / 2;
    const pts = [new THREE.Vector3(p.x - half, 0, p.z), new THREE.Vector3(p.x + half, 0, p.z), new THREE.Vector3(p.x - half, hgt, p.z), new THREE.Vector3(p.x + half, hgt, p.z)];
    const sp = pts.map((q) => q.project(camera)); const xs = sp.map((q) => (q.x * 0.5 + 0.5) * W), ys = sp.map((q) => (-q.y * 0.5 + 0.5) * H);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); const n = Math.max(1, this.enemies.length);
    return { x: Math.round(x0), y: Math.round(y0), w: Math.max(24, Math.round(x1 - x0)), h: Math.max(24, Math.round(y1 - y0)), size: Math.max(24, Math.round(x1 - x0)), slot: W / (n + 1), smooth: v.smooth !== false, lift: 0, from3d: true, est: true };
  }
  buildArt(ent) {
    const BU = G.BattleUI; let v = null; try { v = BU && BU.enemyVisual ? BU.enemyVisual(ent.e) : null; } catch (err) { v = null; }
    if (!v || !v.img) { ent.failed = true; return; }
    const img = v.img; const ok = img instanceof HTMLCanvasElement || (img.complete && (img.naturalWidth || 0) > 0);
    if (!ok) { ent.waitImg = img; return; }   // 読み込み中：次のフレームでもう一度
    // v6.7 2D版の絵が新しい絵に切り替わったのに、3Dでまだ使えない（読み直し中・使えない）ときは、前の絵の立体を消す（2D版が新しい絵を3Dの立ち位置に描く）。
    //   以前は前の絵（ボスの新しい画像が間に合わなかったときの以前のデザイン）の立体が残り続けることがあった
    const stale = !!(ent.art && ent.visImg && ent.visImg !== img); const drop = () => { if (stale) this.dropArt(ent); };
    const rd = readable(img); ent.waitClean = rd.state === 'loading';   // 別のサイト扱いの画像は CORS で読み直す（読み直し中は次のフレームでもう一度）
    // v6.7 読み直し中は、2D版が新しい絵を3Dの立ち位置（estRect）に描く。時間がかかっても、以前の簡易の絵（旧デザイン）には切り替えない
    if (rd.state === 'loading') { if (!ent.cleanT) ent.cleanT = performance.now(); drop(); return; }
    let src = rd.img, av = v;
    // v6.6/v6.7 新しい絵（EnemyArt・BossArt のキャンバス）が3Dで使えない → 同じ絵を CORS つきで読み直す（読み直し中は 2D 版が3Dの立ち位置に描く）
    if (stale) { ent.cleanTried = false; ent.cleanJob = null; ent.cleanVis = null; ent.cleanT = 0; ent.failed = false; }
    const cleaner = v.source === 'enemyart' && G.EnemyArt && G.EnemyArt.cleanVisual ? G.EnemyArt : v.source === 'bossart' && G.BossArt && G.BossArt.cleanVisual ? G.BossArt : null;
    if (rd.state !== 'ok' && img instanceof HTMLCanvasElement && cleaner && !ent.cleanTried) {
      if (!ent.cleanJob) { ent.cleanJob = cleaner.cleanVisual(ent.e.defId).then((cv) => { ent.cleanVis = cv && cv.img && isClean(cv.img) ? cv : null; ent.cleanTried = true; }, () => { ent.cleanTried = true; }); }
      if (!ent.cleanT) ent.cleanT = performance.now(); ent.waitClean = true; drop(); return;
    }
    if (rd.state !== 'ok' && ent.cleanVis) { src = ent.cleanVis.img; av = ent.cleanVis; ent.cors = true; }
    else if (rd.state !== 'ok') {
      // v6.7 絵を3Dで使えない（読み直しも失敗）→ 3Dの立体は作らず、2D版が同じ新しい絵を3Dの立ち位置（estRect）に描く。
      //   v6.6 では、ここで「その敵の簡易の絵（コードで描く絵）」に替えていたため、ボスなどが以前のデザインに戻って見えた（v6.7 でやめた）
      drop(); ent.failed = true; ent.visImg = img; ent.waitClean = false; this.failedArt++; this.why = this.why || '敵の絵を3Dで読めない → 2Dの絵を3Dの立ち位置に表示'; return;
    }
    const old = ent.art, oldGroup = ent.group;
    try {
      const boss = !!ent.e.boss; const crowd = this.scene && this.scene.b.enemies.length >= 4 ? 0.82 : 1;
      const hgt = Math.max(0.9, Math.min(boss ? 6.2 : 3.8, v.h * PX2W * (boss ? 1.25 : 1.0) * crowd));
      ent.art = buildArtVolume(src, { height: hgt, aspect: av.w / Math.max(1, av.h), smooth: av.smooth !== false, depth: 0.15 });
      ent.lift = (v.lift || 0) * PX2W - (v.foot || 0) * hgt; ent.visImg = img; ent.source = v.source || null; ent.waitImg = null;   // v7.5 foot：絵の下端から足もとまで（足もとを地面に合わせる。浮かない敵は 0 以下）
      const g = new THREE.Group(); g.name = 'enemy_' + ent.i; g.add(ent.art.mesh); ent.group = g; ent.art.mesh.position.y = ent.lift;
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02;
      shadow.scale.set(ent.art.size.w * 0.42, ent.art.size.w * 0.16 + 0.15, 1); g.add(shadow); ent.shadow = shadow;
      ent.uniforms = ent.art.uniforms; ent.uniforms.uTime.value = Math.random() * 10;
      if (old) { if (oldGroup && oldGroup.parent) oldGroup.parent.remove(oldGroup); old.dispose(); }
      this.S.add(g);
      if (!ent.ready) { ent.ready = true; this.ready++; }
    } catch (err) { console.warn('battle art volume', err); ent.failed = true; this.failedArt++; }
  }

  // v6.7 敵の立体を消す（2D版がその敵を3Dの立ち位置に描くようになる）
  dropArt(ent) { try { if (ent.group && ent.group.parent) ent.group.parent.remove(ent.group); if (ent.art) ent.art.dispose(); } catch (err) { /* なし */ } ent.art = null; ent.group = null; ent.shadow = null; ent.uniforms = null; }
  // 味方：ドット絵を、ごく薄い板（光と影がつく）にして立てる。ドットはぼかさない
  //   v6.8 まず人物ID（ent.a.id）の4方向の絵（PartyDirections）。読み込み中は最長 DIR_WAIT 待つ。パックにない人物・読めない・遅いときは、
  //   以前の絵（同じ本人の立ち絵・歩行のドット絵。別の仲間の絵にはならない）で始め、あとで新しい絵が読めたら差し替える（updateSprites）
  buildSprite(ent) {
    const now = performance.now(); if (!ent.t0) ent.t0 = now; const waited = now - ent.t0;
    const got = PD.get(ent.a, this.partyDir); ent.pd = got.state; ent.pdUrl = got.info ? got.info.url : null;
    if (got.state === 'ok' && !ent.pdBad) return this.useDirArt(ent, got, this.partyDir);   // 板を作れなかった（pdBad）ときは以前の絵のまま（毎フレーム作り直さない）
    if (got.state === 'loading' && waited < DIR_WAIT && !ent.pdBad) { ent.tries++; return false; }   // 新しい絵の読み込み中：次のフレームでもう一度（以前の絵の4秒待ちとは別）
    if (got.state !== 'none' && !ent.pdNote) { ent.pdNote = true; console.warn('[味方の4方向の絵] まだ使えない → 以前の絵で表示し、読めたら差し替える：' + ent.id + ' / ' + this.partyDir + ' / ' + (got.state === 'error' ? '読み込みの失敗 ' + (got.err || '') : '読み込み中（' + Math.round(waited) + 'ms）') + ' / ' + ent.pdUrl); }
    const front = this.layout === 'front'; let art = null; try { art = front ? partyPixelBack(ent.a) : partyPixelArt(ent.a); } catch (err) { console.warn('battle party sprite', err); art = null; }
    if (!art || (art.wait && !art.canvas)) { ent.tries++; if (!art && waited > 6000) { ent.failed = true; this.why = this.why || '味方のドット絵を読めない'; } return false; }   // 画像がまだ読めていない：次のフレームでもう一度
    if (art.kind !== 'portrait' && art.kind !== 'back' && waited < 4000) { ent.tries++; return false; }   // 立ち絵を少し待ってから（最大4秒）、歩行のドット絵で代用
    try {
      const c = art.canvas; const h = front ? FRONT_SPRITE_H : art.kind === 'portrait' ? SPRITE_H : SPRITE_H * 0.85;
      const vol = buildArtVolume(c, { height: h, aspect: c.width / c.height, smooth: false, depth: 0.05, grid: Math.min(64, Math.max(24, c.width)) });
      this.attachArt(ent, vol, art.kind); return true;
    } catch (err) { console.warn('battle party sprite', err); ent.failed = true; return false; }
  }
  // v6.8 4方向の絵から板を作る。1ドットの大きさは、その人物の4方向で同じ（基準の高さ × 体格の比 ÷ いちばん高い絵の高さ）。足もとの基準点（pivot）を立ち位置に合わせる
  makeDirVol(got) {
    const info = got.info, art = got.art, c = art.canvas; const H = this.layout === 'front' ? DIR_H_FRONT : DIR_H_SIDE;
    const s = H * (info.ratio || 1) / Math.max(1, info.refH);
    const vol = buildArtVolume(c, { height: c.height * s, aspect: c.width / c.height, smooth: false, depth: 0.05, grid: 64 });
    vol.mesh.position.set(art.offX * s, art.offY * s, 0);   // 切り出した絵の下辺の中央 → 基準点から見た位置
    vol.box = { dx: art.offX * s, w: (art.x1 - art.x0) * s, h: (info.pivot[1] - art.y0) * s };   // 立ち位置から見た、見える部分（足もと〜頭・武器の先）
    vol.dir = info.dir; vol.url = info.url; vol.px = s; return vol;
  }
  useDirArt(ent, got, dir) {
    try { const vol = this.makeDirVol(got); this.attachArt(ent, vol, 'dir:' + dir); ent.url = got.info.url; ent.failed = false; return true; }
    catch (err) { console.warn('battle party direction art', ent.id, dir, err); ent.pdBad = true; return false; }
  }
  // 板を立てる（はじめて）／差し替える（以前の絵 → 新しい絵、勝利の振り向き）。グループと影はそのまま
  attachArt(ent, vol, kind) {
    vol.uniforms.uSway.value = 0.0; vol.uniforms.uSelf.value = 0.6; vol.mat.color.setScalar(ent.art ? ent.art.mat.color.r : 0.62);
    if (!vol.box) vol.box = { dx: 0, w: vol.size.w, h: vol.size.h };
    const old = ent.art;
    if (!ent.group) {
      const g = new THREE.Group(); g.name = 'party_' + ent.id; ent.group = g;
      const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh); ent.shadow = sh;
      this.S.add(g);
    }
    if (old) { ent.group.remove(old.mesh); old.dispose(); }
    ent.group.add(vol.mesh); ent.art = vol; ent.uniforms = vol.uniforms; ent.kind = kind;
    if (!/^dir:front$/.test(kind) || !ent.layoutBox) ent.layoutBox = vol.box;   // 画面の範囲の計算（カメラ合わせ）は戦闘中の向きの絵で（勝利の振り向きで動かない）
    ent.shadow.scale.set(Math.min(vol.box.w, vol.box.h * 0.6) * 0.42, 0.22, 1); ent.shadow.position.x = 0;
    if (!ent.ready) { ent.ready = true; this.ready++; }
  }
  enemyHome(i) {
    const n = this.enemies.length; const ent = this.enemies[i];
    if (this.layout === 'front') {   // 前後の並び：奥に横一列（ボス1体は中央の少し奥）
      const dz = this.stage && this.stage.nearFront ? (n <= 2 ? FRONT_NEAR_DZ : FRONT_NEAR_DZ_MANY) : 0;   // v6.8 スマホ縦画面：敵を手前（味方の側）へ。3体以上は横に広がるので控えめに
      if (n === 1 || (ent && ent.e.boss && n <= 2 && i === 0)) return new THREE.Vector3(n === 2 && i === 0 ? -1.0 : 0, 0, (ent && ent.e.boss ? -1.4 : -0.6) + dz);
      if (dz && FRONT_ENEMY_PORT[n]) { const q = FRONT_ENEMY_PORT[n][i]; return new THREE.Vector3(q[0], 0, q[1]); }   // v6.8 スマホ縦画面の3・4体：横をつめ、手前と奥を交互に（名前・HPバーが重ならないように）
      const fs = FRONT_ENEMY[n]; const f = fs ? fs[i] : FRONT_ENEMY_SLOTS[i % FRONT_ENEMY_SLOTS.length]; const sx = dz ? FRONT_NEAR_SX : 1; return new THREE.Vector3(f[0] * sx, 0, f[1] + dz);   // v6.8 スマホ縦画面の5体以上：横の間隔をつめる（左のコマンド欄の右に収める）
    }
    if (n === 1 || (ent && ent.e.boss && n <= 2 && i === 0)) return new THREE.Vector3(-2.6, 0, 1.2);
    const set = ENEMY_LAYOUT[n]; const s = set ? set[i] : ENEMY_SLOTS[i % ENEMY_SLOTS.length];   // 数ごとの並び（名前・HPバーが重なりにくいよう、手前と奥で左右をずらす）
    return new THREE.Vector3(s[0], 0, s[1]);
  }
  petHome() { const n = this.scene && this.scene.b ? this.scene.b.party.length : 4; if (this.layout === 'front') { const last = this.partyHome(Math.max(0, n - 1)); return new THREE.Vector3(last.x + PET_FRONT_DX, 0, PET_FRONT_Z); } const first = this.partyHome(0); let zmax = first.z; for (let j = 1; j < n; j++) zmax = Math.max(zmax, this.partyHome(j).z); return new THREE.Vector3(first.x + PET_SIDE_DX, 0, zmax + PET_SIDE_Z); }
  petDrawn() { for (const e of this.party.values()) if (e.pet) return !!(e.art && e.ready); return false; }
  partyHome(j) { if (j < 0) return this.petHome(); const n = this.scene && this.scene.b ? this.scene.b.party.length : 4; const L = this.layout === 'front' ? (FRONT_PARTY[n] || FRONT_PARTY[4]) : this.style === 'sprite' ? (SPRITE_LAYOUT[n] || SPRITE_SLOTS) : PARTY_SLOTS; const s = L[j % L.length]; const dx = this.layout === 'front' && this.stage ? this.stage.partyDx || 0 : 0; return new THREE.Vector3(s[0] + dx, 0, s[1]); }   // v6.8 partyDx：スマホ縦画面で、味方の列だけを左のコマンド欄の右へずらす

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
  actorOf(key) { if (!key) return null; const m = /^e:(\d+)$/.exec(key); if (m) return this.enemies[+m[1]] || null; return this.party.get(key.replace(/^(p|pet):/, '')) || null; }
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
      if (!ent.art) { if (!ent.failed || (ent.pdUrl && !ent.pdBad && PD.get(ent.a, this.partyDir).state === 'ok')) this.buildSprite(ent); if (!ent.art) continue; }
      // v6.8 以前の絵で始めた人：新しい4方向の絵が読めたら差し替える（読み込みが遅かった・一度失敗した）
      if (!/^dir:/.test(ent.kind || '') && !ent.pdBad && ent.pd !== 'none' && !ent.dead) { const got = PD.get(ent.a, this.partyDir); ent.pd = got.state; if (got.state === 'ok') this.useDirArt(ent, got, this.partyDir); }
      // v6.8 勝利：正面（front）の絵に振り向く（読み込み済みのときだけ。開発の向きの固定 ?partydir= のときはしない）
      if (scene.victory >= 0 && !ent.dead && !ent.vicTurn && /^dir:/.test(ent.kind || '') && !devPartyDir()) { const gf = PD.get(ent.a, 'front'); if (gf.state === 'ok') { ent.vicTurn = true; this.useDirArt(ent, gf, 'front'); } else if (gf.state !== 'loading') ent.vicTurn = true; }
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
    const en = this.enemies[i]; if (!en) return null;
    if (!en.art || !en.ready) return this.layout === 'front' ? this.estRect(i, W, H, camera) : null;
    const p = en.group.position; const s = en.art.size; const half = s.w * 0.5; const y0 = Math.max(0, p.y) + (en.lift || 0);
    const pts = [new THREE.Vector3(p.x - half, y0, p.z), new THREE.Vector3(p.x + half, y0, p.z), new THREE.Vector3(p.x - half, y0 + s.h, p.z), new THREE.Vector3(p.x + half, y0 + s.h, p.z)];
    const sp = pts.map((v) => v.project(camera)); const xs = sp.map((v) => (v.x * 0.5 + 0.5) * W), ys = sp.map((v) => (-v.y * 0.5 + 0.5) * H);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), yy0 = Math.min(...ys), yy1 = Math.max(...ys); const n = Math.max(1, this.enemies.length);
    return { x: Math.round(x0), y: Math.round(yy0), w: Math.max(24, Math.round(x1 - x0)), h: Math.max(24, Math.round(yy1 - yy0)), size: Math.max(24, Math.round(x1 - x0)), slot: W / (n + 1), smooth: true, lift: 0, from3d: true };
  }
  // 味方の胸の位置（2D の演出・数字の位置）
  partyPos(id, W, H, camera) { const ent = this.party.get(id); if (!ent || !(ent.ch || ent.group)) return null; const v = (ent.group ? ent.group.position : ent.ch.root.position).clone(); const bx = ent.art ? (ent.layoutBox || ent.art.box || { dx: 0, h: ent.art.size.h }) : null; if (bx) { v.x += bx.dx || 0; v.y += bx.h * 0.6; } else v.y += 1.05; v.project(camera); return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H }; }
  // v6.8 味方の板の、立ち位置から見た範囲（{ dx：中心の横のずれ, w, h }）。4方向の絵は見える部分、以前の絵は板の大きさ
  pbox(ent) { return ent.layoutBox || (ent.art && ent.art.box) || { dx: 0, w: ent.art.size.w, h: ent.art.size.h }; }
  // 立ち位置（動いていないとき）での、味方の頭の高さと、敵・味方の足もとの一番下（画面の y。applyBand 用）
  homeBox(W, H, camera) {
    const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return (-v.y * 0.5 + 0.5) * H; };
    let partyTop = Infinity, bottom = -Infinity, n = 0;
    for (const ent of this.party.values()) { if (!ent.art) continue; const h = this.partyHome(ent.j); partyTop = Math.min(partyTop, proj(h.x, this.pbox(ent).h, h.z)); bottom = Math.max(bottom, proj(h.x, 0, h.z)); n++; }
    let enemyTop = Infinity; for (const en of this.enemies) { if (!en || !en.art) continue; const h = this.enemyHome(en.i); bottom = Math.max(bottom, proj(h.x, 0, h.z)); enemyTop = Math.min(enemyTop, proj(h.x, en.art.size.h + (en.lift || 0), h.z)); }
    return n ? { partyTop, enemyTop, bottom, front: this.layout === 'front' } : null;
  }
  // 立ち位置での、敵・味方全体の画面の範囲（applyFit 用）：敵の名前（頭の上）から、足もとの HP バー・味方の足もとまで
  contentBox(W, H, camera) {
    const P = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };
    let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity, n = 0; const add = (x, y) => { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); };
    const pb = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity }, eb = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity }; let np = 0, ne = 0;   // v6.8 味方・敵それぞれの範囲も（スマホ縦画面の applyFit）
    const addTo = (q, x, y) => { q.l = Math.min(q.l, x); q.r = Math.max(q.r, x); q.t = Math.min(q.t, y); q.b = Math.max(q.b, y); };
    for (const ent of this.party.values()) { if (!ent.art) continue; const h = this.partyHome(ent.j), bx = this.pbox(ent), w = bx.w / 2, cx = h.x + (bx.dx || 0); const a = P(cx - w, bx.h, h.z), c = P(cx + w, 0, h.z); add(a[0], a[1]); add(c[0], c[1]); addTo(pb, a[0], a[1]); addTo(pb, c[0], c[1]); n++; np++; }
    for (const en of this.enemies) { if (!en || !en.art) continue; const h = this.enemyHome(en.i), w = en.art.size.w / 2, lift = en.lift || 0; const a = P(h.x - w, en.art.size.h + lift, h.z), c = P(h.x + w, 0, h.z); add(a[0], a[1] - H * 0.06); add(c[0], c[1] + H * 0.03); addTo(eb, a[0], a[1] - H * 0.06); addTo(eb, c[0], c[1] + H * 0.03); n++; ne++; }   // 名前・HPバーのぶん
    if (n) { const z = this.partyHome(0).z; const u0 = P(0, 0, z), u1 = P(1, 0, z); this._split = { party: np ? pb : null, enemy: ne ? eb : null, pxu: u1[0] - u0[0] }; } else this._split = null;   // 名前・HPバーのぶん
    return n ? { l, r, t, b } : null;
  }
  // 味方のドット絵を画面に写した矩形（スマホの画面部品との重なりの確認用。3Dモデルの方式では null）
  partyRect(id, W, H, camera) {
    const ent = this.party.get(id); if (!ent || !ent.group || !ent.art) return null;
    const p = ent.group.position; const bx = ent.art.box || { dx: 0, w: ent.art.size.w, h: ent.art.size.h }; const half = bx.w * 0.5, cx = p.x + (bx.dx || 0);   // v6.8 いま見えている絵の範囲
    const pts = [new THREE.Vector3(cx - half, p.y, p.z), new THREE.Vector3(cx + half, p.y, p.z), new THREE.Vector3(cx - half, p.y + bx.h, p.z), new THREE.Vector3(cx + half, p.y + bx.h, p.z)].map((v) => v.project(camera));
    const xs = pts.map((v) => (v.x * 0.5 + 0.5) * W), ys = pts.map((v) => (-v.y * 0.5 + 0.5) * H);
    return { x: Math.round(Math.min(...xs)), y: Math.round(Math.min(...ys)), w: Math.round(Math.max(...xs) - Math.min(...xs)), h: Math.round(Math.max(...ys) - Math.min(...ys)) };
  }
  drawn(i) { const en = this.enemies[i]; return !!(en && en.ready && en.art); }
  allReady() { let f = 0; for (const e of this.party.values()) if (e.failed && !e.ready) f++; for (const e of this.enemies) if (e && !e.ready && (e.failed || (e.waitClean && e.cleanT && performance.now() - e.cleanT > 4000))) f++; return this.want > 0 && this.ready + f >= this.want; }   // 読めずに2Dのままの敵・味方も「準備できた」に数える
  info() {
    return { want: this.want, ready: this.ready, failedArt: this.failedArt, altArt: this.altArt || 0, cors: this.enemies.filter((e) => e && e.cors).length, waiting: this.enemies.filter((e) => e && e.waitClean && !e.art).length,
      enemies: this.enemies.filter(Boolean).map((e) => ({ i: e.i, id: e.e.defId, source: e.source, ready: e.ready, vis: !!e.vis, size: e.art ? { w: +e.art.size.w.toFixed(2), h: +e.art.size.h.toFixed(2) } : null, tris: e.art ? e.art.stats.tris : 0, plan: e.plan ? e.plan.anim : null, dissolve: e.uniforms ? +e.uniforms.uDissolve.value.toFixed(2) : 0 })),
      style: this.style, partyDir: this.partyDir, party: [...this.party.values()].map((p) => ({ id: p.id, model: this.style === 'sprite' ? 'pixel:' + (p.kind || 'pending') : p.model, ready: p.ready, anim: p.ch ? p.ch.currentName : (p.plan ? p.plan.anim : p.dead ? 'Defeat' : 'Idle'), dead: p.dead, status: this.style === 'sprite' ? '2D' : (MODELS[p.model] ? MODELS[p.model].status : 'fallback'),
        job: p.a.job, sprite: p.a.sprite, url: p.art && p.art.url ? p.art.url : null, pd: p.pd || null, vis: p.group ? !!p.group.visible : false, size: p.art ? { w: +((p.art.box || p.art.size).w).toFixed(2), h: +((p.art.box || p.art.size).h).toFixed(2) } : null })), dirs: PD.stats(),
      log: this.log.slice(-20), sync: this.sync.slice(-40) };
  }
  dispose() {
    for (const en of this.enemies) if (en && en.art) { if (en.group && en.group.parent) en.group.parent.remove(en.group); en.art.dispose(); }
    for (const p of this.party.values()) { if (p.ch) { p.ch.mixer.stopAllAction(); if (p.ch.root.parent) p.ch.root.parent.remove(p.ch.root); } if (p.art) { if (p.group && p.group.parent) p.group.parent.remove(p.group); p.art.dispose(); } }
    this.enemies = []; this.party = new Map(); this.scene = null;
  }
}
