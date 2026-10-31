/* =========================================================
   GameBridge（App3D）：既存の2Dゲーム（window.World / Engine / State / Win …）に3D表示をつなぐ
   方針
   ・ゲームの中身（物語・会話・クエスト・ステータス・戦闘・アイテム・乗り物・トレード学習・セーブ）は2D版のコードをそのまま使う
   ・3D化したマップ（MAPS_3D）にいる間だけ、探索シーンの「入力・移動・描画」を3D版に差し替える
     （移動は自由移動。タイルをまたいだら 2D 側の World.onStep() を呼ぶので、出入口・イベント・歩数処理は2D版と同じ）
   ・それ以外のマップ、戦闘、タイトルなどは2D版の画面をそのまま表示する（ハイブリッド）
   ・3D の準備が終わる前や WebGL が使えない環境でも、2D版としてそのまま遊べる
   ========================================================= */
import * as THREE from 'three';
import { Renderer3D, detectQuality } from '../engine/Renderer3D.js';
import { LightingManager } from '../engine/LightingManager.js';
import { CameraController3D } from '../engine/CameraController3D.js';
import { ModelManager } from '../engine/ModelManager.js';
import { Materials } from '../engine/Materials.js';
import { MapScene3D } from '../world/MapScene3D.js';
import { Character3D, DIR_YAW, yawToDir } from '../entities/Character3D.js';
import { MAPS_3D, MODELS, characterModelFor } from '../assets/manifest.js';
import { UIOverlay } from '../ui/UIOverlay.js';
import { CUT } from '../engine/Cutout.js';

const G = window;
const WALK = 2.7, RUN = 5.4, RADIUS = 0.28;

export class App3D {
  constructor(opts) {
    opts = opts || {};
    this.base = opts.base || './'; this.quality = detectQuality();
    this.ready = false; this.disabled = false; this.cache = new Map(); this.failed = {}; this.current = null; this.building = null;
    this.pos = new THREE.Vector3(); this.yaw = 0; this.speed = 0; this.lastTile = null; this.lastMap = null; this.talkNpc = null;
    this.shift = false; this.fps = 0; this._fc = 0; this._ft = 0; this.stats = {};
    this.userPitch = (() => { try { const v = +localStorage.getItem('mtq3d-pitch'); return v >= 30 && v <= 60 ? v : 48; } catch (e) { return 48; } })();
  }

  /* ---------- 2D側へのフック（起動前に入れる） ---------- */
  install() {
    const app = this, W = G.World;
    const origStart = W.start;
    W.start = function () { app.cache.forEach((ms) => { try { ms.dispose(); } catch (e) { console.warn(e); } }); app.cache.clear(); app.current = null; app.lastMap = null; const r = origStart.apply(this, arguments); app.attach(W.scene); return r; };
    // タイトル：2D版のセーブを取り込む
    const T = G.Title; const S = G.State, Win = G.Win;
    T.menu = async function () {
      while (true) {
        const hasAny = [0, 1, 2, 3].some((s) => S.slotInfo(s)); const has2D = [0, 1, 2, 3].some((s) => S.normalSlotInfo(s));
        const opts = [{ label: 'はじめから' }, { label: 'つづきから', disabled: !hasAny }, { label: '2D版のセーブを取り込む', disabled: !has2D, sub: has2D ? '2D版のセーブはそのまま残ります（コピーして3D版用に保存）' : '2D版のセーブが見つかりません' }, { label: 'データ管理' }];
        const i = await Win.list(opts, { title: 'タイトル（3D版 Phase 1）', cancel: false, cls: 'title-menu' });
        if (i === 0) { if (await T.newGame()) return; }
        if (i === 1) { if (await T.load()) return; }
        if (i === 2) { if (await app.import2D()) return; }
        if (i === 3) { await T.data(); }
      }
    };
    document.addEventListener('keydown', (e) => { if (e.key === 'Shift') this.shift = true; });
    document.addEventListener('keyup', (e) => { if (e.key === 'Shift') this.shift = false; });
    G.addEventListener('blur', () => { this.shift = false; });
  }
  // 2D版のセーブ（mtq-rpg-v2-slot-*）を読み取り専用で読み、3D版の枠（mtq-3d-slot-*）へコピーする
  async import2D() {
    const S = G.State, Win = G.Win, JOBS = G.JOBS;
    const rows = [0, 1, 2, 3].map((s) => { const info = S.normalSlotInfo(s); return { label: (s === 0 ? '2D版 オートセーブ' : '2D版 スロット' + s), right: info ? info.name + ' Lv' + info.level : '（空き）', disabled: !info, sub: info ? ((G.MAP_DEFS[info.map] || {}).name || 'フィールド') : '' }; });
    const i = await Win.list(rows, { title: '取り込む2D版のセーブ' }); if (i < 0) return false;
    const d = S.loadNormal(i); if (!d) { await Win.message(['読み込めなかった。']); return false; }
    const slots = [1, 2, 3].map((s) => { const info = S.slotInfo(s); return { label: '3D版 スロット' + s, right: info ? '上書き：' + info.name + ' Lv' + info.level : '（空き）' }; });
    const k = await Win.list(slots, { title: '3D版のどの枠に保存する？' }); if (k < 0) return false;
    if (S.slotInfo(k + 1)) { const c = await Win.choice('3D版のスロット' + (k + 1) + 'を上書きする？（2D版のセーブは変わらない）', ['上書きする', 'やめる']); if (c !== 0) return false; }
    S.data = d; S.save(k + 1);
    await Win.message(['2D版のセーブを3D版のスロット' + (k + 1) + 'にコピーした。', '2D版のセーブデータはそのまま残っている。']);
    G.World.start(); return true;
  }
  attach(scene) {
    if (!scene || scene._mtq3d) return; scene._mtq3d = true;
    const app = this, oH = scene.handleInput, oU = scene.update, oD = scene.draw;
    scene.handleInput = function () { if (app.mode3D()) return app.handleInput(); return oH.call(this); };
    scene.update = function (dt) { if (app.mode3D()) { const p = G.World.player; p.moving = false; } oU.call(this, dt); if (app.mode3D()) app.updateLogic(dt / 1000); };
    scene.draw = function (ctx) { if (app.mode3D() && app.current && app.current.map === G.World.map) return; return oD.call(this, ctx); };
  }
  mode3D() { const W = G.World; return this.ready && !this.disabled && W.map && MAPS_3D.indexOf(W.map.id) >= 0 && !this.failed[W.map.id]; }

  /* ---------- 初期化 ---------- */
  async init() {
    this.camera = new CameraController3D(640 / 416); this.camera.setPitch(this.userPitch);
    this.ui = new UIOverlay(this);
    try { this.renderer = new Renderer3D(this.ui.canvas, this.quality); }
    catch (e) { console.warn('WebGL を使えないため2D表示で続けます', e); this.disabled = true; return; }
    const gl = this.renderer.renderer.getContext(); this.webgl2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;
    this.scene = new THREE.Scene();
    this.lighting = new LightingManager(this.scene, this.renderer, this.quality);
    this.renderer.setScene(this.scene, this.camera.camera);
    this.mats = new Materials(this.base, this.renderer.renderer); this.models = new ModelManager(this.base);
    this.ui.progress(0.05, '3Dの素材を読み込んでいます…');
    await this.mats.preload(); this.ui.progress(0.25);
    const ids = Object.keys(MODELS);
    await this.models.preload(ids, (n, all) => this.ui.progress(0.25 + 0.65 * n / all));
    this.hero = await Character3D.create(this.models, 'hero', { xray: true });
    this.scene.add(this.hero.root);
    this.ui.progress(1, '3Dの村を組み立てています…');
    this.ready = true; this.ui.refresh();
    this.ui.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.disabled = true; this.ui.show(false); console.warn('WebGL context lost → 2D'); });
    const loop = (now) => { try { this.frame(now); } catch (e) { console.error(e); this.failed[(G.World.map || {}).id] = true; } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    // 起動中に村へ入っていたら、その場で組み立てる
  }

  /* ---------- マップの組み立て（キャッシュ） ---------- */
  ensure(map) {
    const c = this.cache.get(map.id);
    if (c && c.map === map) { this.activate(c); return; }
    if (this.building === map) return;
    this.building = map; const t0 = performance.now();
    const ms = new MapScene3D(this);
    ms.build(map).then(() => {
      this.cache.set(map.id, ms); this.stats['build_' + map.id] = Math.round(performance.now() - t0);
      if (this.building === map) this.building = null;
      if (G.World.map === map) this.activate(ms);
      this.prebuild();
    }).catch((e) => { console.error('3D build failed', map.id, e); this.failed[map.id] = true; this.building = null; });
  }
  // 村の中の屋内は先に作っておく（出入りを待たせない）
  prebuild() {
    if (this._pre || this.building) return; const W = G.World;
    const next = MAPS_3D.find((id) => { const c = this.cache.get(id); return !this.failed[id] && !(c && W.maps[id] && c.map === W.maps[id]); });
    if (!next) return;
    let m; try { m = W.getMap(next); } catch (e) { this.failed[next] = true; return; }
    this._pre = true; const ms = new MapScene3D(this); const t0 = performance.now();
    ms.build(m).then(() => { this.cache.set(next, ms); this.stats['build_' + next] = Math.round(performance.now() - t0); this._pre = false; setTimeout(() => this.prebuild(), 30); if (W.map === m && this.current !== ms) this.activate(ms); })
      .catch((e) => { console.error('prebuild failed', next, e); this.failed[next] = true; this._pre = false; });
  }
  activate(ms) {
    if (this.current === ms) return;
    if (this.current) this.scene.remove(this.current.root);
    this.scene.add(ms.root); this.current = ms;
    this.lighting.setLampSpots(ms.lampSpots); this.lighting.setInterior(ms.interior);
    this.camera.setInterior(ms.interior); if (!ms.interior) this.camera.setPitch(this.userPitch);
    this.snap();
  }
  snap() {
    const p = G.World.player; if (!p || !this.current) return;
    this.pos.set(p.x + 0.5, 0, p.y + 0.5); this.pos.y = this.current.heightAt(this.pos.x, this.pos.z);
    this.yaw = DIR_YAW[p.dir] || 0; this.hero.yaw = this.hero.wantYaw = this.yaw;
    this.lastTile = [p.x, p.y]; this.lastMap = G.World.map; this.camera.first = true; this.speed = 0;
  }
  setPitch(deg) { this.userPitch = deg; try { localStorage.setItem('mtq3d-pitch', String(deg)); } catch (e) { /* なし */ } if (!this.current || !this.current.interior) this.camera.setPitch(deg); this.ui.refresh(); }
  async changeQuality(q) {
    try { localStorage.setItem('mtq3d-quality', q); } catch (e) { /* なし */ }
    if (q === this.quality) return; const Win = G.Win;
    if (!Win || !G.World.scene) { location.reload(); return; }
    const c = await Win.choice('画質の変更はページの再読み込みで反映される。今すぐ再読み込みする？（オートセーブから再開できる）', ['再読み込み', 'あとで']);
    if (c === 0) { try { G.State.autosave(); } catch (e) { /* なし */ } location.reload(); }
  }

  /* ---------- 入力・移動（探索シーンの update から呼ばれる） ---------- */
  handleInput() {
    const W = G.World, I = G.Engine.Input;
    if (W.busy || !this.current || this.current.map !== W.map) return;
    if (I.consume('cancel')) { G.Menu.open(); return; }
    if (I.consume('ok')) { this.interact(); return; }
  }
  updateLogic(dt) {
    const W = G.World, E = G.Engine, p = W.player; const ms = this.current;
    if (!ms || ms.map !== W.map || !p) return;
    if (this.lastMap !== W.map || !this.lastTile || p.x !== this.lastTile[0] || p.y !== this.lastTile[1]) this.snap();   // 2D 側で位置が変わった（ワープ・全滅・デバッグ移動など）
    if (E.top() !== W.scene || W.busy) { this.speed = 0; return; }
    const keys = E.Input.keys; const st = this.ui.stick;
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), iz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0); let mag = Math.hypot(ix, iz);
    let run = !this.shift;
    if (st.mag > 0.12) { ix = st.x; iz = st.z; mag = Math.hypot(ix, iz); run = st.mag > 0.62; }
    if (mag < 0.01) { this.speed = 0; return; }
    ix /= mag; iz /= mag;
    const settings = G.State.data && G.State.data.settings; const mul = (W.WALK && W.WALK[settings && settings.walkSpeed]) || 1;
    const sp = (run ? RUN : WALK) * (0.75 + 0.25 * mul);
    this.speed = sp; this.running = run; this.yaw = Math.atan2(ix, iz);
    // 移動（大きく動くときは分割）＋押し出し
    let dist = sp * Math.min(dt, 0.05); const steps = Math.ceil(dist / 0.2);
    for (let i = 0; i < steps; i++) { const d = dist / steps; const r = ms.resolve(this.pos.x + ix * d, this.pos.z + iz * d, RADIUS); this.pos.x = r.x; this.pos.z = r.z; }
    // v5.7 歩き回る人にぶつかって進めないときは、2D版と同じく横へよけてもらう
    const now = performance.now();
    if (dist > 0.01 && (!this._nudgeAt || now - this._nudgeAt > 500)) {
      for (const ch of ms.npcs) {
        if (!ch.root.visible || !ch.npc.wander) continue; const dx = ch.root.position.x - this.pos.x, dz = ch.root.position.z - this.pos.z; const d = Math.hypot(dx, dz);
        if (d < RADIUS + 0.36 + 0.12 && (dx * ix + dz * iz) / (d || 1) > 0.5) { this._nudgeAt = now; if (W.nudgeNpc) W.nudgeNpc(ch.npc); break; }
      }
    }
    this.pos.y = ms.heightAt(this.pos.x, this.pos.z);
    p.dir = yawToDir(this.yaw);
    const tx = Math.floor(this.pos.x), ty = Math.floor(this.pos.z);
    if (tx !== p.x || ty !== p.y) {
      p.x = tx; p.y = ty; p.px = tx * E.TS; p.py = ty * E.TS; this.lastTile = [tx, ty];
      W.onStep();   // 2D版と同じ：出入口・イベント・歩数・エンカウント・ミニマップ
      this.lastTile = [p.x, p.y];
    }
  }

  // 主人公の手前を抜く範囲（Cutout）
  updateCutout() {
    const cam = this.camera.camera; cam.updateMatrixWorld();
    if (this.current.interior || this.camera.debug) { CUT.uCutRadius.value = 0; return; }
    const v = this._cv || (this._cv = new THREE.Vector3()); v.set(this.pos.x, this.pos.y + 0.8, this.pos.z);
    const depth = -v.clone().applyMatrix4(cam.matrixWorldInverse).z;
    const size = this.renderer.renderer.getDrawingBufferSize(this._sz || (this._sz = new THREE.Vector2()));
    const a = v.clone().project(cam); const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const b = v.clone().addScaledVector(right, 2.6).project(cam);
    CUT.uCutCenter.value = [(a.x * 0.5 + 0.5) * size.x, (a.y * 0.5 + 0.5) * size.y];
    CUT.uCutRadius.value = Math.abs(b.x - a.x) * 0.5 * size.x; CUT.uCutDepth.value = depth - 0.7;
  }
  // 確認用：主人公にモーションを再生させる（3D設定の「モーション」）
  emote(name) { if (!this.hero || !this.hero.has(name)) return; this._emote = { name, until: performance.now() / 1000 + 2.6 }; this.hero.play(name, 0.15, { back: 'Idle' }); }

  /* ---------- 調べる・話す ---------- */
  findTarget() {
    const W = G.World, m = W.map, ms = this.current; if (!ms) return null;
    const px = this.pos.x, pz = this.pos.z; const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let best = null; const consider = (o) => { if (!best || o.score < best.score) best = o; };
    for (const ch of ms.npcs) {
      const n = ch.npc; if (n.hidden || !n.talk || !ch.root.visible) continue;
      const dx = ch.root.position.x - px, dz = ch.root.position.z - pz; const d = Math.hypot(dx, dz); const dot = d > 0 ? (dx * fx + dz * fz) / d : 1;
      let reach = 1.55;
      // カウンター越し（間にカウンターがある）
      const mx = Math.floor(px + dx / 2), mz = Math.floor(pz + dz / 2); if (m.tile(mx, mz) === 'counter') reach = 2.7;
      if (d < reach && (dot > 0.35 || d < 0.85)) consider({ kind: 'npc', npc: n, ch, score: d - dot * 0.6, x: ch.root.position.x, z: ch.root.position.z, y: 2.0 });
    }
    for (const c of m.chests) { const cx = c.x + 0.5, cz = c.y + 0.5; const dx = cx - px, dz = cz - pz; const d = Math.hypot(dx, dz); const dot = (dx * fx + dz * fz) / (d || 1); if (d < 1.45 && dot > 0.3) consider({ kind: 'chest', chest: c, score: d - dot * 0.5 + 0.1, x: cx, z: cz, y: 0.9 }); }
    for (const e of m.events) { if (e.type === 'hole') continue; const cx = e.x + 0.5, cz = e.y + 0.5; const dx = cx - px, dz = cz - pz; const d = Math.hypot(dx, dz); const dot = (dx * fx + dz * fz) / (d || 1); if ((d < 1.45 && dot > 0.3) || d < 0.5) consider({ kind: 'event', ev: e, score: d - dot * 0.5 + 0.2, x: cx, z: cz, y: 1.3 }); }
    if (!best) {   // 正面のタイル（看板・本棚・建物の壁など）は2D版の World.interact に任せる
      const p = W.player; const dd = W.delta(yawToDir(this.yaw)); const t = m.tile(p.x + dd[0], p.y + dd[1]);
      if (t === 'sign' || t === 'bookshelf' || t === 'crystal') best = { kind: 'tile', score: 9, x: p.x + dd[0] + 0.5, z: p.y + dd[1] + 0.5, y: 1.4 };
    }
    return best;
  }
  interact() {
    const W = G.World, p = W.player; const t = this.findTarget();
    if (t && t.kind === 'npc') { p.dir = yawToDir(Math.atan2(t.x - this.pos.x, t.z - this.pos.z)); this.yaw = Math.atan2(t.x - this.pos.x, t.z - this.pos.z); this.talkNpc = t.npc; W.talk(t.npc); return; }
    if (t && t.kind === 'chest') { W.openChest(t.chest); return; }
    if (t && t.kind === 'event') { G.Events.run(t.ev); return; }
    p.dir = yawToDir(this.yaw); W.interact();
  }

  /* ---------- 毎フレーム：表示の切り替えと描画 ---------- */
  frame(now) {
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000); this._last = now; const t = now / 1000;
    this._fc++; if (now - this._ft > 1000) { this.fps = Math.round(this._fc * 1000 / (now - this._ft)); this._fc = 0; this._ft = now; }
    const W = G.World, E = G.Engine;
    const want = this.mode3D();
    if (want && (!this.current || this.current.map !== W.map)) this.ensure(W.map);
    let i = E.scenes.length - 1; while (i > 0 && E.scenes[i].overlay) i--;
    const baseIsWorld = !!W.scene && E.scenes[i] === W.scene;
    const built = want && this.current && this.current.map === W.map;
    const show = want && baseIsWorld;
    const L = this.ui.layout();
    this.ui.show(show, !built);
    if (!show || !built) { this.ui.setPrompt(null); return; }
    if (!W.busy) this.talkNpc = null;
    // 主人公
    const h = this.hero; h.root.position.copy(this.pos); h.faceTo(this.yaw);
    if (this.speed > 0.1) { this._emote = null; h.play(this.running ? 'Run' : 'Walk', 0.15); h.setSpeed(this.running ? this.speed / RUN : this.speed / WALK); }
    else if (this._emote && t < this._emote.until) h.play(this._emote.name, 0.2);
    else if (!h.onceName) { this._emote = null; h.play('Idle', 0.25); }
    h.update(dt);
    this.current.update(dt, t, this.pos);
    if (this.current.interior && this.current.bounds) {   // 屋内：部屋全体が入るよう、部屋の中心寄りに見る
      const b = this.current.bounds; const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2 - 0.4;
      this._focus = this._focus || new THREE.Vector3(); this._focus.set(cx + (this.pos.x - cx) * 0.35, 0, cz + (this.pos.z - cz) * 0.35);
      this.camera.follow(this._focus, dt);
    } else this.camera.follow(this.pos, dt);
    this.lighting.update(G.State.data ? G.State.data.timeOfDay : 0.35, this.pos);
    this.updateCutout();
    if (L) this.renderer.resize(L.w, L.h);
    if (!this.paused) this.renderer.render();   // paused：自動テストで描画だけ止める（ソフトウェア描画の環境用）
    // 「話す・調べる」の案内
    const tg = (!W.busy && E.top() === W.scene) ? this.findTarget() : null;
    if (tg && L) {
      const v = new THREE.Vector3(tg.x, (this.current.heightAt(tg.x, tg.z) || 0) + tg.y, tg.z).project(this.camera.camera);
      const sx = L.l + (v.x * 0.5 + 0.5) * L.w, sy = L.t + (-v.y * 0.5 + 0.5) * L.h;
      const label = tg.kind === 'npc' ? '話す' : tg.kind === 'chest' ? (W.map.tile(tg.chest.x, tg.chest.y) === 'chest_open' ? '空の宝箱' : '開ける') : '調べる';
      this.ui.setPrompt('<b>Z</b> ' + label, sx, sy);
    } else this.ui.setPrompt(null);
    if (this._fc % 20 === 0) { const info = this.renderer.renderer.info.render; this.ui.setFps(this.fps, (info.calls) + ' draw / ' + Math.round(info.triangles / 1000) + 'k tri'); }
  }
}
