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
import { MODELS, characterModelFor, fieldModelFor } from '../assets/manifest.js';
import { mapCoverage, MAPS_DONE } from '../world/coverage.js';
import { UIOverlay } from '../ui/UIOverlay.js';
import { CUT } from '../engine/Cutout.js';
import { readableStats } from '../battle/readable.js';
import { BattleStage3D, FAMILY_TABLE } from '../battle/BattleStage3D.js';
import { battleLayout, partyStyle } from '../battle/BattleActors3D.js';
import * as PartyDir from '../battle/PartyDirections.js';
import { Env } from '../environment/Env.js';
import { Join76 } from './Join76.js';
import { cameraZone82 } from '../world/Castle82.js';
import { academyCutaway82 } from '../world/Academy82.js';
import { Effects78 } from '../world/Effects78.js';
import { Carriage3D } from '../world/Carriage3D.js';

const G = window;
const WALK = 2.7, RUN = 5.4, RADIUS = 0.28;
const CACHE_GENERIC = 3;   // 汎用3Dのマップは直近の3枚だけ残す（ポヨ村と屋内は常に残す）

function errText(e, where) { const n = e && e.name && e.name !== 'Error' ? e.name + ': ' : ''; return (n + String((e && (e.message || e)) || '不明')).slice(0, 90) + (where ? '／' + where : ''); }   // 例外の名前と、どの段階か（テストプレイの報告用）
// 2Dの表示に切り替えたことを知らせる（2D版のトースト。起動直後でまだ無いときは少し待つ）
export function notice2D(text) {
  console.warn(text); let n = 0;
  const go = () => { const W = window.Win; if (W && W.toast && document.getElementById('toast')) W.toast(text, 6000); else if (n++ < 40) setTimeout(go, 250); };
  go();
}
export class App3D {
  constructor(opts) {
    opts = opts || {};
    this.base = opts.base || './'; this.quality = detectQuality();
    this.ready = false; this.disabled = false; this.cache = new Map(); this.failed = {}; this.current = null; this.building = null;
    this.pos = new THREE.Vector3(); this.yaw = 0; this.speed = 0; this.lastTile = null; this.lastMap = null; this.talkNpc = null;
    this.shift = false; this.fps = 0; this._fc = 0; this._ft = 0; this.stats = {};
    this.join = new Join76(this); this._cross = null;   // v7.6 つないだ世界（Join76.js・js/rpg/world76.js）
    this.userPitch = (() => { try { const v = +localStorage.getItem('mtq3d-pitch'); return v >= 30 && v <= 60 ? v : 48; } catch (e) { return 48; } })();
  }

  /* ---------- 2D側へのフック（起動前に入れる） ---------- */
  install() {
    const app = this, W = G.World;
    const origStart = W.start;
    if (G.World76 && G.World76.onSwitch) G.World76.onSwitch((ev) => { app._cross = ev; });   // v7.6 となりの地域へ移った（画面を切り替えない）
    W.start = function () { app.join.clear(); app.cache.forEach((ms) => { try { ms.dispose(); } catch (e) { console.warn(e); } }); app.cache.clear(); app.current = null; app.lastMap = null; const r = origStart.apply(this, arguments); app.attach(W.scene); return r; };
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
    // 乗り物に乗っているあいだ（と乗り降りの1歩）は、2D版と同じマス単位の移動（gridMode）。3D側は位置を写して描くだけ
    scene.handleInput = function () { if (app.mode3D()) { if (app.gridMode()) { app.feedStick(); return oH.call(this); } return app.handleInput(); } return oH.call(this); };
    scene.update = function (dt) { if (app.mode3D() && !app.gridMode()) { const p = G.World.player; p.moving = false; } oU.call(this, dt); if (app.mode3D()) app.updateLogic(dt / 1000); };
    scene.draw = function (ctx) { if (app.mode3D() && app.current && app.current.map === G.World.map) return; return oD.call(this, ctx); };
  }
  mode3D() { const W = G.World; return this.ready && !this.disabled && !!W.map && mapCoverage(W.map) !== '2d' && !this.failed[W.map.id]; }
  gridMode() { const d = G.State.data; return !!(d && d.aboard) || !!this.stepping; }
  // 仮想スティック → 2D版の方向キー（gridMode のときだけ）
  feedStick() {
    const st = this.ui.stick, K = G.Engine.Input.keys; const want = { up: false, down: false, left: false, right: false };
    if (st && st.mag > 0.3) { if (Math.abs(st.x) > Math.abs(st.z)) want[st.x > 0 ? 'right' : 'left'] = true; else want[st.z > 0 ? 'down' : 'up'] = true; }
    if (!this._stickKeys) this._stickKeys = {};
    for (const k of Object.keys(want)) { if (want[k]) { K[k] = true; this._stickKeys[k] = true; } else if (this._stickKeys[k]) { K[k] = false; this._stickKeys[k] = false; } }
  }

  /* ---------- 初期化 ---------- */
  async init() {
    this.camera = new CameraController3D(640 / 416); this.camera.setPitch(this.userPitch);
    this.ui = new UIOverlay(this);
    try { this.renderer = new Renderer3D(this.ui.canvas, this.quality); }
    catch (e) { console.warn('WebGL を使えないため2D表示で続けます', e); this.disabled = true; this.why = 'WebGL を作れない（' + errText(e) + '）'; notice2D('この端末では3D表示を使えないため、2Dで表示しています（' + this.why + '）'); return; }
    const gl = this.renderer.renderer.getContext(); this.webgl2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;
    this.scene = new THREE.Scene();
    this.lighting = new LightingManager(this.scene, this.renderer, this.quality);
    this.fx78 = new Effects78(this.scene, this.quality);   // v7.8 雨・浮天城アエリアの影・展望室の地球（world/Effects78.js）
    this.car79 = new Carriage3D(this.scene);   // v7.9 馬車の模型（world/Carriage3D.js）
    this.renderer.setScene(this.scene, this.camera.camera);
    this.mats = new Materials(this.base, this.renderer.renderer); this.models = new ModelManager(this.base);
    // 戦闘の3D（敵＝絵の立体・味方＝ドット絵）は3Dの素材（GLB）を使わないので、素材の読み込みを待たずに使えるようにする
    //   （以前は読み込みが終わるまで戦闘が2Dのままだった。スマホの回線では数十秒かかることがある）
    this.installBattleStage();
    this.ui.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.disabled = true; this.why = 'WebGL の文脈が失われた（端末のメモリ不足など）'; this.ui.show(false); console.warn('WebGL context lost → 2D'); });
    const loop = (now) => { try { this.frame(now); } catch (e) { console.error(e); this.mapFailed((G.World.map || {}).id, e); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    this.ui.progress(0.05, '元気にロード中...');
    await this.mats.preload(); this.ui.progress(0.25);
    const ids = Object.keys(MODELS).filter((id) => !MODELS[id].lazy);   // Phase 1〜2 で足したモデル（lazy）は使うときに読む
    await this.models.preload(ids, (n, all) => this.ui.progress(0.25 + 0.65 * n / all));
    this.hero = await Character3D.create(this.models, 'hero', { xray: true });
    this.scene.add(this.hero.root);
    this.ui.progress(1, '元気にロード中...');   // ご指示により表記を変更（建物に入ったときなど、3Dのマップの組み立て中に出る）
    this.ready = true; this.ui.refresh();
    // 起動中に村へ入っていたら、その場で組み立てる
  }

  /* ---------- v6.5 Phase D 戦闘の3Dの舞台（最初の戦闘で作る。作れないときは2Dの背景のまま） ---------- */
  // マップの3Dに失敗したとき：そのマップは2Dで続ける。理由を1回だけ知らせ、3D設定の「状態」にも出す
  mapFailed(id, e, where) {
    if (!id) return; this.failed[id] = true; this.mapWhy = this.mapWhy || {}; if (this.mapWhy[id]) return;
    this.mapWhy[id] = errText(e, where || '表示'); notice2D('このマップの3D表示に失敗したため、2Dで表示しています（' + this.mapWhy[id] + '）');
  }
  // 3D版で戦闘が2Dの表示になった理由（設定でオフにしたときは 'setting'）
  battleWhyNow() {
    if (this.battleWhy) return this.battleWhy;
    if (this.battle && this.battle.whyOff) return this.battle.whyOff();
    return null;
  }
  // 戦闘が2Dの表示になったことを、理由とともに1回だけ知らせる（設定でオフにしたときは知らせない）
  note2D(scene) {
    if (!scene || scene === this._noted2D) return; this._noted2D = scene;
    const why = this.battleWhyNow(); if (!why || why === 'setting') return;
    this.lastBattleWhy = why; notice2D('3Dの戦闘を表示できないため、2Dで表示しています（' + why + '）');
  }
  // 3D設定の「状態」：テストプレイで不具合を知らせてもらうための情報
  diagText() {
    let gpu = '-', ver = '-';
    try { const gl = this.renderer && this.renderer.renderer.getContext(); if (gl) { ver = this.webgl2 ? 'WebGL2' : 'WebGL1'; const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } } catch (e) { /* なし */ }
    const W0 = G.World; const mid = W0 && W0.map && W0.map.id; const mw = this.mapWhy && mid && this.mapWhy[mid];
    const st3d = (this.disabled ? '停止（' + (this.why || '不明') + '）' : this.ready ? '準備完了' : '読み込み中') + (mw ? '・このマップは2D（' + mw + '）' : (W0 && W0.map && !this.mode3D() && this.ready && !this.disabled ? '・このマップは2D（3Dの範囲の設定など）' : ''));
    const bw = this.battleWhyNow(); const stB = this.battle && !bw && !this.battleFailed ? (this.battle.actorMode ? '3D（' + (this.battle.layout === 'front' ? '前後' : '左右') + (this.battle.photoSrc ? '・背景は画像' : this.battle.photoWhy ? '・' + this.battle.photoWhy : '') + '）' : '3Dの舞台') : bw === 'setting' ? '2D（設定）' : bw ? '2D（' + bw + '）' : this.lastBattleWhy ? '前回は2D（' + this.lastBattleWhy + '）' : 'まだ戦闘なし';
    const miss = this.models && this.models.failed && this.models.failed.length ? '／読めなかったモデル ' + this.models.failed.length : '';
    const ac = this.battle && this.battle.actors; const part = ac && ac.why ? '／一部2D（' + ac.why + '）' : ''; const bk = this.battle && this.battle.backWhy ? '／' + this.battle.backWhy : '';
    const rs = readableStats(); const rd = rs.loading + rs.tainted + rs.error + rs.ok ? '／画像の読み直し ' + rs.ok + '件成功・' + (rs.tainted + rs.error) + '件失敗' : '';
    const vv = G.visualViewport; const scr = '／画面 ' + innerWidth + '×' + innerHeight + (vv ? '（見える ' + Math.round(vv.width) + '×' + Math.round(vv.height) + '・上 ' + Math.round(vv.offsetTop) + '）' : '') + '・スクロール ' + Math.round(scrollY);
    return '3D：' + st3d + '／戦闘：' + stB + part + bk + rd + '／' + ver + '・' + gpu + '・画質 ' + this.quality + (this.renderer && this.renderer.finish ? '・仕上げ ' + (this.renderer.finish.enabled() ? '入' : '切') : '') + miss + scr + '／版 ' + (G.MTQ3D_BUILD || '-');
  }
  installBattleStage() {
    const app = this;
    G.BattleStage3D = {
      frame(scene, W, H) {
        // 失敗したとき：次の戦闘で作り直す（1回の起動で3回まで）。WebGL の文脈が失われたときも同じ
        const broken = app.battleFailed || (app.battle && app.battle.failed);
        if (broken && scene !== app.battleFailScene) {
          if ((app.battleRetries || 0) < 3) { app.battleRetries = (app.battleRetries || 0) + 1; try { if (app.battle) app.battle.destroy(); } catch (e) { /* なし */ } app.battle = null; app.battleFailed = false; app.battleWhy = null; }
          else app.battleFailScene = scene;
        }
        if (app.battleFailed) { app.note2D(scene); return null; }
        if (!app.battle) { try { app.battle = new BattleStage3D(app.quality, { models: app.models }); } catch (e) { console.warn('3D battle stage unavailable → 2D', e); app.battleFailed = true; app.battleFailScene = scene; app.battleWhy = '3Dの戦闘を作れない（' + errText(e) + '）'; app.note2D(scene); return null; } }
        try { const c = app.battle.frame(scene, W, H); if (!c) { if (app.battle.failed) app.battleFailScene = scene; app.note2D(scene); } return c; }   // 文脈が失われた戦闘は2Dのまま、次の戦闘で作り直す
        catch (e) { console.warn('3D battle stage failed → 2D', e); app.battleFailed = true; app.battleFailScene = scene; app.battleWhy = '3Dの戦闘の表示に失敗（' + errText(e, app.battle && app.battle.step) + '）'; app.note2D(scene); return null; }
      },
      why() { return app.battleWhyNow(); },
      families() { return Object.assign({}, FAMILY_TABLE); },
      // Phase 2：3Dのキャラクター同士の戦闘（battle.js が HP バー・名前・数字の位置に使う）
      rect(scene, i, W, H) { return app.battle && !app.battleFailed ? app.battle.rect(scene, i, W, H) : null; },
      drawn(scene, i) { return !!(app.battle && !app.battleFailed && app.battle.drawn(scene, i)); },
      partyPos(scene, id, W, H) { return app.battle && !app.battleFailed ? app.battle.partyPos(scene, id, W, H) : null; },
      petDrawn(scene) { return !!(app.battle && !app.battleFailed && app.battle.petDrawn && app.battle.petDrawn(scene)); },   // v6.8 神聖犬ポン太を3Dで描いているか（2D版は描かない）
      // 敵の名前の文字の倍率：画面（#game）に縮んで表示されたときに、約10px より小さくならないように（PC の画面では 1）
      labelScale(W) { const g = document.getElementById('game'); const css = g ? g.clientWidth : 0; if (!css || !W) return 1; return Math.max(1, Math.min(1.8, 10 / (12 * css / W))); },
      partyRect(scene, id, W, H) { return app.battle && !app.battleFailed ? app.battle.partyRect(scene, id, W, H) : null; },
      actorsOn(scene) { return !!(app.battle && !app.battleFailed && app.battle.actorMode && scene === app.battle.lastScene); },
      actorsInfo() { return app.battle && app.battle.actors ? app.battle.actors.info() : null; },
      setActors(on) { try { localStorage.setItem('mtq3d-battle-actors', on ? 'on' : 'off'); } catch (e) { /* なし */ } },
      log() { return app.battle && app.battle.log ? app.battle.log.slice() : []; },
      info() { const b = app.battle; return b ? Object.assign({ quality: b.quality, failed: b.failed || !!app.battleFailed, enabled: b.enabled(), layout: b.layout, photoOn: !!b.photoSrc, backKind: b.backKind, photoWhy: b.photoWhy || null }, b.stats) : { created: false, failed: !!app.battleFailed }; },
      setEnabled(on) { try { localStorage.setItem('mtq3d-battle', on ? 'on' : 'off'); } catch (e) { /* なし */ } },
      isEnabled() { try { return localStorage.getItem('mtq3d-battle') !== 'off'; } catch (e) { return true; } }
    };
  }

  /* ---------- マップの組み立て（キャッシュ） ---------- */
  ensure(map) {
    const c = this.cache.get(map.id);
    if (c && c.map === map) { this.activate(c); return; }
    if (this.building === map) return;
    if (this.join.building === map.id && this.join.buildingMap === map) return;   // v7.6 つないだ世界：となりの地域として裏で組み立て中（できたら Join76 が切り替える。同じ地域を2つ作らない）
    this.building = map; const t0 = performance.now();
    const ms = new MapScene3D(this);
    ms.build(map).then(() => {
      this.cache.set(map.id, ms); this.stats['build_' + map.id] = Math.round(performance.now() - t0); ms.usedAt = performance.now();
      if (ms.world) this.stats['world_' + map.id] = Object.assign({}, ms.world.stats);
      if (this.building === map) this.building = null;
      this.trimCache(map.id);
      if (G.World.map === map) this.activate(ms);
      this.prebuild();
    }).catch((e) => {
      // v7.6 環境リデザインのレシピで失敗したら、記録してレシピなし（従来の表示）で組み立て直す
      if (e && e.envRecipe && !Env.errors[map.id]) { Env.errors[map.id] = String(e.message) + (e.cause ? '｜' + (e.cause.stack || e.cause.message || e.cause).toString().slice(0, 400) : ''); console.warn('[環境] レシピを使わずに表示します', map.id, e.cause || e); try { ms.dispose(); } catch (e2) { /* なし */ } this.building = null; this.ensure(map); return; }
      console.error('3D build failed', map.id, e); this.mapFailed(map.id, e, '組み立て'); this.building = null;
    });
  }
  // 汎用3Dのマップは直近のものだけ残す（メモリ）
  trimCache(keepId) {
    const gen = [...this.cache.entries()].filter(([id, ms]) => ms.coverage === 'generic' && id !== keepId && ms !== this.current && !this.join.keeps(id)).sort((a, b) => (a[1].usedAt || 0) - (b[1].usedAt || 0));
    while (gen.length > CACHE_GENERIC - 1) { const [id, ms] = gen.shift(); try { ms.dispose(); } catch (e) { console.warn(e); } this.cache.delete(id); }
  }
  // 村の中の屋内は先に作っておく（出入りを待たせない）
  prebuild() {
    if (this._pre || this.building) return; const W = G.World;
    const next = MAPS_DONE.find((id) => { const c = this.cache.get(id); return !this.failed[id] && !(c && W.maps[id] && c.map === W.maps[id]); });
    if (!next) return;
    let m; try { m = W.getMap(next); } catch (e) { this.failed[next] = true; return; }
    this._pre = true; const ms = new MapScene3D(this); const t0 = performance.now();
    ms.build(m).then(() => { this.cache.set(next, ms); this.stats['build_' + next] = Math.round(performance.now() - t0); this._pre = false; setTimeout(() => this.prebuild(), 30); if (W.map === m && this.current !== ms) this.activate(ms); })
      .catch((e) => { console.error('prebuild failed', next, e); this.failed[next] = true; this._pre = false; });
  }
  // v6.8 道・壁・境界線の丸み（Organic.js）の設定を変えたとき：汎用3Dのマップを作り直す（今いるマップも。専用3Dのポヨ村は変わらない）
  rebuildGeneric() {
    const W = G.World; const cur = this.current; this.join.clear();
    for (const [id, ms] of [...this.cache.entries()]) { if (ms.coverage !== 'generic' || ms === cur) continue; try { ms.dispose(); } catch (e) { console.warn(e); } this.cache.delete(id); }
    if (cur && cur.coverage === 'generic' && W.map) { this.cache.delete(cur.map.id); this.building = null; const old = cur; this.ensure(W.map); const t = setInterval(() => { if (this.current !== old) { clearInterval(t); try { old.dispose(); } catch (e) { /* なし */ } } }, 200); setTimeout(() => clearInterval(t), 60000); }
  }
  activate(ms) {
    if (this.current === ms) return;
    const cross = this._cross && ms.map && this._cross.to === ms.map.id && this.current && this.current.map && this.current.map.id === this._cross.from ? this._cross : null; this._cross = null;   // v7.6 つないだ世界：となりの地域へ移った
    if (this.current) this.scene.remove(this.current.root);
    this.scene.add(ms.root); ms.root.position.set(0, 0, 0); this.current = ms; ms.usedAt = performance.now();
    this.ui.setBadge(ms.coverage === 'generic' ? '3D版 開発中：汎用3D（仮3D・自動生成）' : '3D版：専用3D（ポヨ村）');
    this.lighting.setLampSpots(ms.lampSpots); this.lighting.setInterior(ms.interior || !!ms.dark, ms.ambient); this.lighting.church = !!(ms.interior && ms.map && (/church|chapel|temple|cathedral|shrine/.test(ms.map.id) || /教会|聖堂|礼拝|神殿/.test(ms.map.name || '')));   // v8.1 教会の中の光を落とす（LightingManager）
    if (this.lighting.setTheme) this.lighting.setTheme(ms.theme || null);
    // v8.3 低画質の屋内：画面の明るさを測って露出を上げる（暗い壁・床の町の屋内がほぼ黒く見えたため）。一度測った地図は覚えておく
    { const low = this.quality === 'low'; const id = ms.map && ms.map.id; const memo = (this._expoMemo82 = this._expoMemo82 || new Map()); const m0 = low && ms.interior ? memo.get(id) : null;
      this.lighting.expMul82 = m0 || 1; this.expo82 = { id, frames: 0, iter: 0, log: [], done: !(low && ms.interior) || !!m0, mul: m0 || 1 }; }
    if (this.lighting.setMapKind) this.lighting.setMapKind(ms.interior ? 'interior' : (ms.map && ms.map.kind) || null);   // v7.6 画面の仕上げ
    if (this.lighting.setMood) this.lighting.setMood((ms.map && ms.map.def && ms.map.def.mood3d) || null);   // v6.9 マップ固有の空気
    if (this.lighting.setSpace) this.lighting.setSpace(!!(ms.map && ms.map.def && ms.map.def.space76 && !ms.interior));   // v7.6 異空間（ゼロメア）の星空
    if (cross) { this.join.shift(cross); this.join.layout(); return; }   // v7.6 位置・カメラをずらすだけ（置き直さない・カメラは飛ばない）
    const closeCam = ms.interior || (ms.map.kind === 'dungeon');
    this.camera.setInterior(closeCam); if (!closeCam) { this.camera.setPitch(this.userPitch); if (ms.map.kind === 'field') this.camera.wantDist = Math.max(this.camera.wantDist, 24); }
    this.snap(); this.join.layout();
  }
  snap() {
    const p = G.World.player; if (!p || !this.current) return;
    this.pos.set(p.x + 0.5, 0, p.y + 0.5); this.pos.y = this.current.heightAt(this.pos.x, this.pos.z);
    this.yaw = DIR_YAW[p.dir] || 0; this.hero.yaw = this.hero.wantYaw = this.yaw;
    this.lastTile = [p.x, p.y]; this.lastMap = G.World.map; this.camera.first = true; this.speed = 0;
    if (G.Follow) G.Follow.reset(G.World.map, this.pos.x, this.pos.z, p.dir);   // v6.4 Phase F 隊列：ワープ・出入りのあとに並べ直す
  }
  setPitch(deg) { this.userPitch = deg; try { localStorage.setItem('mtq3d-pitch', String(deg)); } catch (e) { /* なし */ } if (!this.current || !this.current.interior) this.camera.setPitch(deg); this.ui.refresh(); }
  async changeQuality(q) {
    try { localStorage.setItem('mtq3d-quality', q); } catch (e) { /* なし */ }
    if (q === this.quality) return; const Win = G.Win;
    if (!Win || !G.World.scene) { location.reload(); return; }
    const c = await Win.choice('画質の変更はページの再読み込みで反映される。今すぐ再読み込みする？（オートセーブから再開できる）', ['再読み込み', 'あとで']);
    if (c === 0) { try { G.State.autosave(); } catch (e) { /* なし */ } location.reload(); }
  }

  // 自動テスト用：マップを1枚、表示せずに組み立てて結果を返す（組み立てた場面はすぐ捨てる）
  async testBuild(id) {
    const W = G.World; let m; try { m = W.getMap(id); } catch (e) { return { id, ok: false, error: 'getMap: ' + (e && e.message) }; }
    const ms = new MapScene3D(this); const t0 = performance.now();
    try {
      await ms.build(m); let tris = 0; ms.root.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.index) tris += o.geometry.index.count / 3 * (o.isInstancedMesh ? o.count : 1); else if (o.isMesh && o.geometry && o.geometry.attributes.position) tris += o.geometry.attributes.position.count / 3 * (o.isInstancedMesh ? o.count : 1); });
      const r = { id, ok: true, kind: m.kind, size: m.w + 'x' + m.h, coverage: ms.coverage, theme: ms.theme ? ms.theme.region + '/' + ms.theme.place : null, ms: Math.round(performance.now() - t0), world: ms.world ? Object.assign({}, ms.world.stats) : null, npcs: ms.npcs.length, chests: ms.chests.length, lamps: ms.lampSpots.length, trisApprox: Math.round(tris) };
      ms.dispose(); return r;
    } catch (e) { try { ms.dispose(); } catch (e2) { /* なし */ } return { id, ok: false, kind: m.kind, error: String((e && e.stack) || e).slice(0, 400) }; }
  }

  /* ---------- 入力・移動（探索シーンの update から呼ばれる） ---------- */
  handleInput() {
    const W = G.World, I = G.Engine.Input;
    if (W.busy || !this.current || this.current.map !== W.map) { I.consume('carriage'); return; }   // v7.9 会話・戦闘中に押した C は捨てる
    if (I.consume('carriage')) { if (G.Carriage) G.Carriage.toggle(); return; }   // v7.9 馬車の乗り降り（C キー）
    if (I.consume('cancel')) { G.Menu.open(); return; }
    if (I.consume('ok')) { this.interact(); return; }
  }
  updateLogic(dt) {
    const W = G.World, E = G.Engine, p = W.player; const ms = this.current;
    if (!ms || ms.map !== W.map || !p) return;
    if (this.gridMode()) {   // 乗り物：2D版がマス単位で動かす。3D はその位置を写す
      const TS = E.TS; this.pos.x = p.px / TS + 0.5; this.pos.z = p.py / TS + 0.5; this.pos.y = ms.heightAt(this.pos.x, this.pos.z);
      this.yaw = DIR_YAW[p.dir] || 0; this.speed = p.moving ? WALK : 0; this.running = false;
      if (G.Follow) G.Follow.update(W.map, this.pos.x, this.pos.z, p.dir);
      this.lastTile = [p.x, p.y]; this.lastMap = W.map;
      if (this.stepping && !p.moving) this.stepping = false;
      return;
    }
    if (this.lastMap !== W.map || !this.lastTile || p.x !== this.lastTile[0] || p.y !== this.lastTile[1]) this.snap();   // 2D 側で位置が変わった（ワープ・全滅・デバッグ移動など）
    if (E.top() !== W.scene || W.busy) { this.speed = 0; return; }
    const keys = E.Input.keys; const st = this.ui.stick;
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), iz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0); let mag = Math.hypot(ix, iz);
    let run = !this.shift;
    if (st.mag > 0.12) { ix = st.x; iz = st.z; mag = Math.hypot(ix, iz); run = st.mag > 0.62; }
    if (mag < 0.01) { this.speed = 0; return; }
    ix /= mag; iz /= mag;
    const settings = G.State.data && G.State.data.settings; const mul = (W.WALK && W.WALK[settings && settings.walkSpeed]) || 1;
    const sp = (run ? RUN : WALK) * (0.75 + 0.25 * mul) * ((G.Carriage && G.Carriage.riding()) ? G.Carriage.SPEED : 1);   // v7.9 馬車は速い
    this.speed = sp; this.running = run; this.yaw = Math.atan2(ix, iz);
    // 移動（大きく動くときは分割）＋押し出し
    let dist = sp * Math.min(dt, 0.05); const steps = Math.ceil(dist / 0.2); const x0 = this.pos.x, z0 = this.pos.z;
    const vb = this.vehicleBlocks(W.map, p);   // v8.2 止めてある乗り物（陸の飛空艇・アストラ号）のマスは通り抜けない → ぶつかって乗る（2D版と同じ）
    for (let i = 0; i < steps; i++) { const d = dist / steps; const r = ms.resolve(this.pos.x + ix * d, this.pos.z + iz * d, RADIUS, vb); this.pos.x = r.x; this.pos.z = r.z; }
    if (Math.hypot(this.pos.x - x0, this.pos.z - z0) < dist * 0.35 && this.bump(ix, iz)) { this.speed = 0; return; }
    // v5.7 歩き回る人にぶつかって進めないときは、2D版と同じく横へよけてもらう
    const now = performance.now();
    // v6.2 押し続けたときだけ道をあけてもらう（2D版と同じ World.pushAgainst。話しかけるために近づいただけでは動かない）
    if (dist > 0.01) {
      for (const ch of ms.npcs) {
        if (!ch.root.visible || !ch.npc.wander) continue; const dx = ch.root.position.x - this.pos.x, dz = ch.root.position.z - this.pos.z; const d = Math.hypot(dx, dz);
        if (d < RADIUS + 0.36 + 0.12 && (dx * ix + dz * iz) / (d || 1) > 0.5) { if (W.pushAgainst) W.pushAgainst(ch.npc); else if (W.nudgeNpc) W.nudgeNpc(ch.npc); break; }
      }
    }
    this.pos.y = ms.heightAt(this.pos.x, this.pos.z);
    p.dir = yawToDir(this.yaw);
    if (G.Follow) G.Follow.update(W.map, this.pos.x, this.pos.z, p.dir);   // v6.4 Phase F 隊列：2D版と同じ足跡の処理（座標の単位も同じ：マスの中心＝x+0.5）
    const tx = Math.floor(this.pos.x), ty = Math.floor(this.pos.z);
    if (tx !== p.x || ty !== p.y) {
      p.x = tx; p.y = ty; p.px = tx * E.TS; p.py = ty * E.TS; this.lastTile = [tx, ty];
      W.onStep();   // 2D版と同じ：出入口・イベント・歩数・エンカウント・ミニマップ
      this.lastTile = [p.x, p.y];
    }
  }

  // v8.2 止めてある乗り物のマス（'x,y' の Set）。乗っていないときだけ。いま立っているマスは除く（飛空艇を着陸させた直後は、そのマスに立っている）
  //  2D版は「乗り物のマスへ進む＝乗る」（World.tryMove → Vehicle.resolveMove・Astra.bump）。3D の自由移動は陸のマスを通り抜けてしまい、
  //  陸に止めた飛空艇・アストラ号に乗れなかった（水の上の船は水のマスでぶつかるので乗れていた）。ふさいで、ぶつかったときに bump → tryMove で乗る
  // v8.3 低画質の屋内の露出：描いた直後の画面（中央の 7 割）の明るさを測り、暗ければ露出を上げる（最大 3 倍・3 回まで）。明るい部屋は変えない
  autoExpo82() {
    const E = this.expo82; const ms = this.current; if (!ms || !ms.map || ms.map.id !== E.id || this.building || this.camera.cine) return;
    E.frames++; if (E.frames < (E.iter ? 4 : 12)) return; E.frames = 0;
    const y = this.renderer.meanLuma82(); if (y === null) { E.done = true; return; } E.log.push(Math.round(y));
    const T = 66; if (y >= T - 4 || E.iter >= 3 || E.mul >= 3) { E.done = true; this._expoMemo82.set(E.id, E.mul); return; }
    E.mul = Math.min(3, E.mul * Math.min(2.2, Math.pow(T / Math.max(4, y), 1.7))); this.lighting.expMul82 = E.mul; E.iter++;
  }
  vehicleBlocks(m, p) {
    const d = G.State.data; if (!m || !p || (d && d.aboard)) return null; let set = null;
    const add = (x, y) => { if (x === p.x && y === p.y) return; (set || (set = new Set())).add(x + ',' + y); };
    try { if (G.Vehicle && G.Vehicle.onMap) G.Vehicle.onMap(m.id).forEach((v) => { if (!v.aboard) add(v.x, v.y); }); } catch (e) { /* なし */ }
    try { const a = G.Astra && G.Astra.parkedOn && G.Astra.parkedOn(m.id); if (a) add(a.x, a.y); } catch (e) { /* なし */ }
    return set;
  }
  // 進めない方向へ押し続けたとき：2D版の World.tryMove に任せる（外周からの退出・乗り物に乗る・アストラ号・ボス／クイズのシンボル・NPC に道をあけてもらう）
  // 戻り値 true＝2D版が1歩の移動を始めた（乗船など）→ その1歩は gridMode で2D版が動かす
  bump(ix, iz) {
    const W = G.World, E = G.Engine, p = W.player, m = W.map; const now = performance.now();
    if (this._bumpAt && now - this._bumpAt < 280) return false;
    const dir = yawToDir(Math.atan2(ix, iz)); const d = W.delta(dir); const nx = p.x + d[0], ny = p.y + d[1];
    const along = (this.pos.x - (p.x + 0.5)) * d[0] + (this.pos.z - (p.y + 0.5)) * d[1]; if (along < 0.1) return false;   // そのマスの端まで来ている
    const oob = nx < 0 || ny < 0 || nx >= m.w || ny >= m.h;
    const veh = !oob && G.Vehicle && G.Vehicle.at && G.Vehicle.at(m.id, nx, ny);
    const astra = !oob && !G.State.data.aboard && G.Astra && G.Astra.isAt && G.Astra.isAt(m.id, nx, ny);   // v8.2 止めてあるアストラ号（2D版の tryMove が「飛び立つ？」を聞く）
    if (!oob && !veh && !astra && m.passable(nx, ny, G.State.data)) return false;
    this._bumpAt = now; p.dir = dir;
    const started = W.tryMove(dir);
    if (started) { this.stepping = true; p.px = p.x * E.TS; p.py = p.y * E.TS; this.bumpLog = (this.bumpLog || 0) + 1; return true; }
    return false;
  }
  // 乗り物（帆船・大型船・飛空艇）とアストラ号の3D表示。乗っている乗り物は主人公の位置に、止めてある乗り物はそのマスに（モデルは仮3D）
  updateVehicles(dt, t) {
    const V = G.Vehicle, A = G.Astra, W = G.World; if (!this.current || !W.map) return;
    const list = []; try { if (V && V.onMap) V.onMap(W.map.id).forEach((v) => list.push({ key: v.id, model: 'veh_' + v.id, x: v.x, y: v.y, aboard: v.aboard, flies: V.flies && V.flies(v.id) })); } catch (e) { /* なし */ }
    try { const ap = A && A.parkedOn && A.parkedOn(W.map.id); if (ap) list.push({ key: 'astra', model: 'veh_airship', x: ap.x, y: ap.y, astra: true }); } catch (e) { /* なし */ }
    if (!this.vehObjs) this.vehObjs = new Map(); const seen = new Set();
    for (const v of list) {
      seen.add(v.key); let o = this.vehObjs.get(v.key);
      if (!o) {
        o = { g: new THREE.Group(), ready: false }; o.g.name = 'vehicle_' + v.key; this.vehObjs.set(v.key, o); this.scene.add(o.g);
        this.models.instanced(v.model, [new THREE.Matrix4()], { colors: v.astra ? [new THREE.Color(1.0, 0.86, 0.5)] : null }).then((g) => { o.g.add(g); o.ready = true; }).catch(() => { o.failed = true; });
      }
      o.g.visible = true; const aboard = v.aboard;
      const x = aboard ? this.pos.x : v.x + 0.5, z = aboard ? this.pos.z : v.y + 0.5; const fly = (aboard && v.flies) ? 2.6 : 0;
      const wy = (v.model === 'veh_airship') ? (this.current.heightAt(x, z) || 0) + fly : -0.22;
      o.g.position.set(x, wy + Math.sin(t * 1.6 + (v.x || 0)) * 0.04, z);
      if (aboard) { let dd = this.yaw - (o.yaw || 0); while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; o.yaw = (o.yaw || 0) + dd * Math.min(1, dt * 6); o.g.rotation.y = o.yaw; }
      o.g.scale.setScalar(v.model === 'veh_galleon' ? 1.1 : 1.0);
    }
    this.vehObjs.forEach((o, k) => { if (!seen.has(k)) o.g.visible = false; });
    this.aboardNow = list.some((v) => v.aboard);
  }
  vehicleInfo() { const out = []; if (this.vehObjs) this.vehObjs.forEach((o, k) => out.push({ key: k, visible: o.g.visible, ready: o.ready, x: +o.g.position.x.toFixed(2), y: +o.g.position.y.toFixed(2), z: +o.g.position.z.toFixed(2) })); return out; }

  // v6.4 Phase F 隊列の仲間（3Dモデル）。位置は js/rpg/follow.js（2D版と共通）が決める。モデルは仲間ごとに1回だけ作る
  // ・専用モデルのない仲間は manifest の characterModelFor（村人などの代用）で表示する
  // ・戦闘不能の仲間は半透明（マテリアルは仲間ごとに複製してから変えるので、村人など他の人には影響しない）
  updateFollowers(dt) {
    const F = G.Follow; const list = (F && this.current) ? F.positions() : [];
    if (!this.followers) this.followers = new Map();
    const seen = new Set();
    for (const f of list) {
      seen.add(f.id);
      const model = fieldModelFor(f.id) || characterModelFor(f.sprite);
      let ent = this.followers.get(f.id);
      if (ent && ent.model !== model) {
        if (ent.ch) {
          this.scene.remove(ent.ch.root);
          ent.ch.mixer.stopAllAction();
          ent.ch.root.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => m.dispose()); });
        }
        this.followers.delete(f.id);
        ent = null;
      }
      if (!ent) {
        ent = { model, ch: null, alpha: 1 };
        this.followers.set(f.id, ent);
        Character3D.create(this.models, model).then((ch) => {
          if (!ch || this.followers.get(f.id) !== ent) return;
          ch.root.traverse((o) => {
            if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone(); o.renderOrder = 3; }   // v6.8 主人公の透けて見えるシルエット（renderOrder 1）より後に描く：後ろから見たとき、仲間の上に主人公の青い影が出ないように
          });
          ch.root.visible = false;
          ent.ch = ch;
          this.scene.add(ch.root);
        }).catch((e) => console.warn('follower model', f.id, e));
        continue;
      }
      const ch = ent.ch; if (!ch) continue;
      ch.root.visible = true; ch.root.position.set(f.x, this.current.heightAt(f.x, f.y), f.y);
      if (f.vx || f.vy) ch.faceTo(Math.atan2(f.vx, f.vy));
      if (this.speed > 0.1) { ch.play(this.running ? 'Run' : 'Walk', 0.15); ch.setSpeed(this.running ? this.speed / RUN : this.speed / WALK); } else ch.play('Idle', 0.25);
      const al = f.dead ? 0.45 : 1; if (al !== ent.alpha) { ent.alpha = al; ch.model.traverse((o) => { if (o.isMesh && o.material) [].concat(o.material).forEach((m) => { m.transparent = al < 1; m.opacity = al; m.needsUpdate = true; }); }); }
      ch.update(dt);
    }
    this.followers.forEach((ent, id) => { if (!seen.has(id) && ent.ch) ent.ch.root.visible = false; });
  }
  // 確認用：いま表示している隊列の仲間（id・使っているモデル・位置）
  followerInfo() { const out = []; if (this.followers) this.followers.forEach((ent, id) => { out.push({ id, model: ent.model, visible: !!(ent.ch && ent.ch.root.visible), x: ent.ch ? +ent.ch.root.position.x.toFixed(2) : null, z: ent.ch ? +ent.ch.root.position.z.toFixed(2) : null }); }); return out; }
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
    { const e = cam.matrixWorld.elements; CUT.uCutYRow.value = [e[1], e[5], e[9], e[13]]; CUT.uCutMinY.value = this.pos.y + 0.3; }   // v7.0 地面・床（足もと＋0.3 より低い面）は抜かない
  }
  // 確認用：主人公にモーションを再生させる（3D設定の「モーション」）
  // v6.9 イベント用のカメラ（js/data/story3121.js の Story3121.cine から呼ぶ）。2D のマス座標 { x, y, dist, pitch }。null で解除
  cine(o) {
    if (!o) { this.camera.setCine(null); return; }
    const x = o.x + 0.5, z = o.y + 0.5; let h = 0; try { h = this.current && this.current.heightAt ? this.current.heightAt(x, z) || 0 : 0; } catch (e) { h = 0; }
    this.camera.setCine({ x, z, y: h, dist: o.dist || 12, pitch: o.pitch || 40 });
  }
  // v7.1 エレベーター（js/data/remake71-tradia.js の Ride）：主人公をガラスのかごごと上（下）へ動かし、カメラもついていく
  //   phase 'go'＝出発（0 → ±14 マス）、'arrive'＝到着（∓8 → 0）。描画が止まっていても時間が来たら終わる
  ride(dir, phase) {
    const up = dir !== 'down', go = phase !== 'arrive';
    const from = go ? 0 : (up ? -8 : 8), to = go ? (up ? 14 : -14) : 0, dur = go ? 2200 : 1300;
    if (!this.rideCab) {
      const g = new THREE.Group(); g.name = 'ride_cab';
      const glass = new THREE.MeshStandardMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
      const frame = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.7, roughness: 0.35 }); const neon = new THREE.MeshStandardMaterial({ color: 0x46e0ff, emissive: 0x46e0ff, emissiveIntensity: 2.2 });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.3, 24, 1, true), glass)); g.children[0].position.y = 1.15;
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 24), frame); floor.position.y = -0.04; g.add(floor);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 24), frame); roof.position.y = 2.32; g.add(roof);
      for (const y of [0.05, 2.25]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.03, 6, 32), neon); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
      g.visible = false; this.scene.add(g); this.rideCab = g;
    }
    return new Promise((resolve) => {
      let done = false; const fin = () => { if (done) return; done = true; this._ride = null; if (!go) { this.rideY = 0; this.rideCab.visible = false; } resolve(); };
      this.rideCab.visible = true; this.rideY = from; this._ride = { from, to, t0: performance.now(), dur, fin };
      setTimeout(fin, dur + 600);
    });
  }
  updateRide() {
    const r = this._ride; if (r) { const k = Math.min(1, (performance.now() - r.t0) / r.dur); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this.rideY = r.from + (r.to - r.from) * e; if (k >= 1) r.fin(); }
    if (this.rideCab && this.rideCab.visible) this.rideCab.position.set(this.pos.x, this.pos.y + (this.rideY || 0), this.pos.z);
  }
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
    // v6.1 調べる共通システム（光る場所・壺・机など）：2D版と同じデータ（Search）を使う
    const S = G.Search;
    if (S) for (const sp of S.forMap(m.id)) {
      if (!S.shown(sp)) continue; const stand = S.KINDS[sp.kind] && S.KINDS[sp.kind].stand; if (stand && S.taken(sp)) continue;
      const cx = sp.x + 0.5, cz = sp.y + 0.5; const dx = cx - px, dz = cz - pz; const d = Math.hypot(dx, dz); const dot = (dx * fx + dz * fz) / (d || 1);
      if ((d < 1.45 && dot > 0.3) || (stand && d < 0.6)) consider({ kind: 'search', sp, score: d - dot * 0.5 + 0.15, x: cx, z: cz, y: stand ? 0.7 : 1.0 });
    }
    if (!best) {   // 正面のタイル（看板・本棚・建物の壁など）は2D版の World.interact に任せる
      const p = W.player; const dd = W.delta(yawToDir(this.yaw)); const fx2 = p.x + dd[0], fy2 = p.y + dd[1]; const t = m.tile(fx2, fy2);
      if (t === 'sign' || t === 'bookshelf' || t === 'crystal') best = { kind: 'tile', score: 9, x: fx2 + 0.5, z: fy2 + 0.5, y: 1.4 };
      else if (S && (t === 'barrel' || t === 'crate' || t === 'well')) { const sp = S.at(m, fx2, fy2); if (sp) best = { kind: 'search', sp, score: 9, x: fx2 + 0.5, z: fy2 + 0.5, y: 1.0 }; }   // v6.1 地形の樽・木箱・井戸
    }
    return best;
  }
  interact() {
    const W = G.World, p = W.player; const t = this.findTarget();
    if (t && t.kind === 'npc' && t.npc === W._talkEndNpc && W._talkEnd && Date.now() - W._talkEnd < 220) return;   // v6.2 会話を閉じた直後の連打で同じ会話をすぐ始めない（2D版と同じ）
    if (t && t.kind === 'npc') { p.dir = yawToDir(Math.atan2(t.x - this.pos.x, t.z - this.pos.z)); this.yaw = Math.atan2(t.x - this.pos.x, t.z - this.pos.z); this.talkNpc = t.npc; W.talk(t.npc); return; }
    if (t && t.kind === 'chest') { W.openChest(t.chest); return; }
    if (t && t.kind === 'event') { G.Events.run(t.ev); return; }
    if (t && t.kind === 'search') { p.dir = yawToDir(Math.atan2(t.x - this.pos.x, t.z - this.pos.z)); W.searchPoint(t.sp); return; }   // v6.1 2D版と同じ World.searchPoint
    p.dir = yawToDir(this.yaw); W.interact();
  }

  /* ---------- v6.2 次の目的地：2D版の Nav.markers() と同じ場所に、足もとの赤い輪（控えめ・ゆっくり点滅） ---------- */
  updateNavRing(t) {
    const N = G.Nav, W = G.World;
    if (!this.navRing) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.56, 40), mat); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 5;
      const g = new THREE.Group(); g.add(ring); g.name = 'nav_ring'; g.visible = false; this.navRing = g; this.navRingMat = mat; this.scene.add(g);
    }
    let mk = null; try { mk = (N && N.enabled()) ? N.markers(W.map.id).filter((m) => m.primary)[0] : null; } catch (e) { mk = null; }
    if (!mk || !this.current) { this.navRing.visible = false; return; }
    const x = mk.x + 0.5, z = mk.y + 0.5; this.navRing.position.set(x, (this.current.heightAt(x, z) || 0) + 0.04, z);
    this.navRingMat.opacity = 0.45 + 0.35 * Math.sin(t * 2.4); this.navRing.visible = true;
  }

  /* ---------- Phase 2（スマホ）：3Dの戦闘の画面部品の位置（styles は UIOverlay） ----------
     ・メッセージ欄・パーティ欄をゲーム画面の幅にそろえる（横画面では左右の余白の操作ボタンと重なりにくい）
     ・オートのボタンをメッセージ欄のすぐ下、コマンド欄をその下へ
     ・3Dの戦闘に、敵・味方を入れる帯（コマンド欄の下〜パーティ欄の上）を伝える（BattleStage3D.applyBand） */
  mobileBattleLayout(on) {
    const mob = on && document.body.classList.contains('mobile'); const ids = ['battle-msg', 'battle-party'];
    if (!mob) {
      if (this._mbl) { this._mbl = false; this._cmdH = 0; this._cmdW = 0; ids.forEach((id) => { const el = document.getElementById(id); if (el) ['left', 'right', 'width', 'top', 'bottom'].forEach((k) => el.style.removeProperty(k)); }); document.documentElement.style.removeProperty('--g3-cmd-top'); document.documentElement.style.removeProperty('--g3-cmd-bottom'); if (this.battle) this.battle.band = null; }
      return;
    }
    this._mbl = true; this._mblN = (this._mblN || 0) + 1; if (this._mblN % 3 !== 1) return;   // 3フレームに1回
    const g = document.getElementById('game'), ui = document.getElementById('ui'); if (!g || !ui) return;
    const gl = g.offsetLeft + g.clientLeft, gt = g.offsetTop + g.clientTop, gw = g.clientWidth, gh = g.clientHeight;
    const msg = document.getElementById('battle-msg'), pan = document.getElementById('battle-party'), auto = document.getElementById('auto-battle');
    const put = (el, k, v) => { if (el && el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v, 'important'); };
    for (const el of [msg, pan]) { put(el, 'left', (gl + 4) + 'px'); put(el, 'right', 'auto'); put(el, 'width', (gw - 8) + 'px'); }
    put(msg, 'top', (gt + 4) + 'px'); put(msg, 'bottom', 'auto');
    if (pan && pan.offsetHeight) { put(pan, 'top', (gt + gh - pan.offsetHeight - 4) + 'px'); put(pan, 'bottom', 'auto'); }
    let below = gt + 4; if (msg && msg.offsetHeight) below = msg.offsetTop + msg.offsetHeight;
    if (auto && auto.classList.contains('on') && auto.offsetWidth) { put(auto, 'top', (below + 3) + 'px'); put(auto, 'left', (gl + gw - auto.offsetWidth - 4) + 'px'); below += 3 + auto.offsetHeight; }
    const gr = g.getBoundingClientRect(), ur = ui.getBoundingClientRect(); const cmdTop = Math.round(below + 4 - gt + (gr.top + g.clientTop - ur.top));
    const v = cmdTop + 'px'; if (document.documentElement.style.getPropertyValue('--g3-cmd-top') !== v) document.documentElement.style.setProperty('--g3-cmd-top', v);
    { const land0 = document.body.classList.contains('m-land'); if (this._mblLand !== land0) { this._mblLand = land0; this._cmdH = 0; this._cmdW = 0; } }   // v6.8 向きが変わったら、コマンド欄の大きさを測り直す（縦と横で形が違う）
    const cmd = document.querySelector('.rw-list.cmd-list'); if (cmd && cmd.offsetHeight) { this._cmdH = Math.max(this._cmdH || 0, cmd.offsetHeight); this._cmdW = Math.max(this._cmdW || 0, cmd.offsetWidth); }
    const front = !!(this.battle && this.battle.layout === 'front'); const land = document.body.classList.contains('m-land');
    if (front && pan && pan.offsetHeight) {   // 前後の並び：コマンド欄は左の列（縦画面＝パーティ欄のすぐ上から上へ・横画面＝メッセージ欄の下からパーティ欄の上まで）。v6.8 縦画面も左へ（以前は下に横並び）
      const v2 = Math.round(ur.bottom - pan.getBoundingClientRect().top + 4) + 'px'; if (document.documentElement.style.getPropertyValue('--g3-cmd-bottom') !== v2) document.documentElement.style.setProperty('--g3-cmd-bottom', v2);
      const v3 = Math.max(80, Math.round(pan.getBoundingClientRect().top - (below + (gr.top + g.clientTop - gt) ) - 10)) + 'px'; if (document.documentElement.style.getPropertyValue('--g3-cmd-maxh') !== v3) document.documentElement.style.setProperty('--g3-cmd-maxh', v3);
    }
    if (this.battle && gh > 0) {
      const panelTop = pan && pan.offsetHeight ? (pan.offsetTop - gt) / gh : 0.88; let nb;
      if (front) {   // 敵・味方を入れる四角（ゲーム画面に対する割合）：上＝メッセージ欄・オートの下、下＝コマンド欄の上（縦）／パーティ欄の上（横）、左＝コマンド欄の右（横）
        const t = (below + 2 - gt) / gh;
        nb = land ? { front: true, l: ((this._cmdW || 124) + 8) / gw, r: 1, t, b: panelTop } : { front: true, l: ((this._cmdW || 112) + 8) / gw, r: 1 - 14 / gw, t, b: panelTop, mt: panelTop - ((this._cmdH || 192) + 8) / gh, align: 'bottom', zoomIn: 0.85 };   // v6.8 縦画面：コマンド欄の右の四角に、下（パーティ欄の上）へそろえて入れる
      } else nb = { cmdBottom: (below + 4 - gt + (this._cmdH || Math.min(120, gh * 0.3))) / gh, panelTop };
      const b = this.battle.band; const same = b && Object.keys(nb).every((k) => typeof nb[k] !== 'number' ? b[k] === nb[k] : Math.abs((b[k] || 0) - nb[k]) < 0.002);
      if (!same) this.battle.band = nb;
    }
  }
  /* ---------- 毎フレーム：表示の切り替えと描画 ---------- */
  // v6.8 いまの編成（人物ID）と戦闘の並びで使う向き（前後＝back・左右＝left）と、勝利の正面（front）の絵を先読みする。変わったときだけ
  preloadPartyDirs() {
    try {
      if (this.disabled || partyStyle() !== 'sprite') return; const d = G.State && G.State.data; if (!d || !Array.isArray(d.party) || !d.party.length) return;
      const dir = battleLayout() === 'side' ? 'left' : 'back'; const sig = d.party.join(',') + '|' + dir + '|' + d.party.map((id) => { const a = G.State.actor(id); return a ? a.job : ''; }).join(',');
      if (sig === this._pdSig) return; this._pdSig = sig;
      PartyDir.preload(d.party, [dir, 'front']);
    } catch (e) { /* 先読みの失敗は戦闘の始まりでもう一度 */ }
  }
  frame(now) {
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000); this._last = now; const t = now / 1000;
    this._fc++; if (now - this._ft > 1000) { this.fps = Math.round(this._fc * 1000 / (now - this._ft)); this._fc = 0; this._ft = now; }
    const W = G.World, E = G.Engine;
    // Phase 2：3Dのキャラクターの戦闘のあいだは、コマンド欄を右上へ（左の敵に重ならないように。styles は UIOverlay）
    const inBattle = !!(G.BattleUI && G.BattleUI.scene && E.scenes.indexOf(G.BattleUI.scene) >= 0);
    const actorsOn = inBattle && !!(this.battle && this.battle.actorMode && !this.battleFailed && !this.battle.failed && this.battle.lastScene === G.BattleUI.scene);
    if (document.body.classList.contains('g3-actors') !== actorsOn) document.body.classList.toggle('g3-actors', actorsOn);
    const frontOn = actorsOn && this.battle.layout === 'front'; if (document.body.classList.contains('g3-front') !== frontOn) document.body.classList.toggle('g3-front', frontOn);   // 前後の並び（画面部品の位置。UIOverlay）
    this.mobileBattleLayout(actorsOn);
    if (now - (this._pdT || 0) > 1000) { this._pdT = now; this.preloadPartyDirs(); }   // v6.8 編成・戦闘の並びが変わったら、味方の4方向の絵を先読み
    if (!this.ready) return;   // 3Dの素材の読み込み中：戦闘の画面部品の切り替えだけ
    const want = this.mode3D();
    if (want && (!this.current || this.current.map !== W.map)) this.ensure(W.map);
    let i = E.scenes.length - 1; while (i > 0 && E.scenes[i].overlay) i--;
    const baseIsWorld = !!W.scene && E.scenes[i] === W.scene;
    const built = want && this.current && this.current.map === W.map;
    const show = want && baseIsWorld;
    const L = this.ui.layout();
    // 3D設定のボタン：探索中で、ほかの画面（全体マップ・メニュー・会話）を開いていないときだけ出す（2Dのマップでも出す。3Dへ戻す・状態を見るため）
    //   全体マップの「＋・－・現在地・全体」と重なって押せなかったため、開いている間は出さない
    const uiOpen = (document.getElementById('ui') || { children: [] }).children.length > 0; const mapOpen = !!(G.Minimap && G.Minimap.open);
    const toolsOn = baseIsWorld && !W.busy && E.top() === W.scene && !uiOpen && !mapOpen;
    this.ui.show(show, !built, toolsOn);
    if (this._fc % 30 === 0) { const pn = document.getElementById('g3-panel'); if (pn && pn.classList.contains('show')) this.ui.setDiag(this.diagText()); }   // 3D設定の「状態」（2Dのマップでも更新）
    if (!show || !built) { this.ui.setPrompt(null); return; }
    if (!W.busy) this.talkNpc = null;
    // 主人公
    this.updateVehicles(dt, t);
    this.updateRide();   // v7.1 エレベーター
    const h = this.hero; h.root.position.copy(this.pos); if (this.rideY) h.root.position.y += this.rideY; h.faceTo(this.yaw); h.root.visible = !this.aboardNow;
    // v7.9 馬車：模型を出して、主人公は御者台に（仲間は馬車の中＝隊列は js/rpg/follow.js が出さない）
    const riding79 = !this.aboardNow && !!(G.Carriage && G.Carriage.riding());
    try { this.car79.update(dt, riding79, this.pos, this.yaw, this.speed); } catch (e) { /* 表示だけ：失敗しても進める */ }
    if (riding79 && this.car79.g) { this._seat79 = this._seat79 || new THREE.Vector3(); this.car79.seat(this._seat79); h.root.position.copy(this._seat79); h.root.position.y -= 0.42; h.faceTo(this.car79.yaw); }
    if (riding79) { this._emote = null; h.play('Idle', 0.25); }
    else if (this.speed > 0.1) { this._emote = null; h.play(this.running ? 'Run' : 'Walk', 0.15); h.setSpeed(this.running ? this.speed / RUN : this.speed / WALK); }
    else if (this._emote && t < this._emote.until) h.play(this._emote.name, 0.2);
    else if (!h.onceName) { this._emote = null; h.play('Idle', 0.25); }
    h.update(dt);
    if (!this.aboardNow) this.updateFollowers(dt); else if (this.followers) this.followers.forEach((ent) => { if (ent.ch) ent.ch.root.visible = false; });
    this.current.update(dt, t, this.pos);
    this.join.update(dt, t, now);   // v7.6 となりの地域（水面の動き・先に組み立てる・遠いものを外す）
    try { this.camera.zone = cameraZone82(this.current, this.pos); } catch (e) { this.camera.zone = null; }
    try { academyCutaway82(this.current, this.pos); } catch (e) { /* 学院の外 */ }   // v8.2 学院：手前の翼棟を低くして主人公と扉を見せる（Academy82.js）   // v8.2 城郭区画・城下町の城門の前：カメラを少し起こして城の輪郭を見せる（Castle82.js）
    if (this.current.interior && this.current.bounds) {   // 屋内：部屋全体が入るよう、部屋の中心寄りに見る
      const b = this.current.bounds; const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2 - 0.4;
      this._focus = this._focus || new THREE.Vector3(); this._focus.set(cx + (this.pos.x - cx) * 0.35, 0, cz + (this.pos.z - cz) * 0.35);
      this.camera.follow(this._focus, dt);
    } else if (this.rideY) { this._rideF = this._rideF || new THREE.Vector3(); this._rideF.copy(this.pos); this._rideF.y += this.rideY; this.camera.follow(this._rideF, dt); }   // v7.1 エレベーター：カメラもついていく
    else this.camera.follow(this.pos, dt);
    this.lighting.update(G.State.data ? G.State.data.timeOfDay : 0.35, this.pos);
    try { this.fx78.update(dt, t, this.pos, this.current); } catch (e) { /* 表示だけの飾り：失敗しても進める */ }
    this.updateCutout();
    if (L) this.renderer.resize(L.w, L.h);
    if (!this.paused) this.renderer.render();   // paused：自動テストで描画だけ止める（ソフトウェア描画の環境用）
    if (!this.paused && this.expo82 && !this.expo82.done) { try { this.autoExpo82(); } catch (e) { this.expo82.done = true; this.expo82.err = String(e && e.message || e); } }   // v8.3 低画質の屋内の露出（描いた直後に測る）
    this.updateNavRing(t);
    // 「話す・調べる」の案内
    const tg = (!W.busy && E.top() === W.scene) ? this.findTarget() : null;
    if (tg && tg.kind === 'npc') tg.npc.holdUntil = Date.now() + 700;   // v6.2 話しかけられる位置にいるあいだは、その NPC は歩き出さない（2D版の徘徊処理が見る）
    if (tg && L) {
      const v = new THREE.Vector3(tg.x, (this.current.heightAt(tg.x, tg.z) || 0) + tg.y, tg.z).project(this.camera.camera);
      const sx = L.l + (v.x * 0.5 + 0.5) * L.w, sy = L.t + (-v.y * 0.5 + 0.5) * L.h;
      const label = tg.kind === 'npc' ? '話す' : tg.kind === 'chest' ? (W.map.tile(tg.chest.x, tg.chest.y) === 'chest_open' ? '空の宝箱' : '開ける') : '調べる';
      this.ui.setPrompt('<b>Z</b> ' + label, sx, sy);
    } else this.ui.setPrompt(null);
    if (this._fc % 20 === 0) { const info = this.renderer.renderer.info.render; this.ui.setFps(this.fps, (info.calls) + ' draw / ' + Math.round(info.triangles / 1000) + 'k tri'); }
  }
}
