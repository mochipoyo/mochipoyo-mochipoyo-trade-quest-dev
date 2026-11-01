/* =========================================================
   UIOverlay：3D版だけの画面部品（既存のメッセージ・メニュー・HUD・ミニマップは2D版のものをそのまま使う）
   ・読み込み表示／「調べる・話す」の案内／3D設定（カメラ角度・ズーム・画質・時間帯の表示確認・FPS）
   ・スマホ：画面の左側をなぞると動けるバーチャルスティック（既存の十字ボタンも使える）、2本指でズーム
   ========================================================= */
import { scope3D, setScope3D } from '../world/coverage.js';
const G3B = () => window.BattleStage3D;
export class UIOverlay {
  constructor(app) {
    this.app = app; this.stick = { x: 0, z: 0, mag: 0, active: false };
    const css = document.createElement('style'); css.textContent = `
      body.g3-actors .rw-list.cmd-list { left: auto !important; right: 12px !important; top: 52px !important; bottom: auto !important; max-height: 46% !important; overflow-y: auto; }
      @media (max-height: 520px) { body.g3-actors .rw-list.cmd-list { max-height: 40% !important; width: 190px !important; } }
      #game3d { position: absolute; display: none; touch-action: none; outline: none; }
      #g3-veil { position: absolute; display: none; background: #05070f; color: #e8c15a; align-items: center; justify-content: center; flex-direction: column; gap: 10px; font-size: 14px; pointer-events: none; }
      #g3-veil .bar { width: 46%; height: 8px; border: 1px solid #e8c15a; border-radius: 4px; overflow: hidden; } #g3-veil .bar i { display: block; height: 100%; width: 0; background: #e8c15a; transition: width .2s; }
      #g3-prompt { position: absolute; display: none; transform: translate(-50%, -100%); background: rgba(11,18,38,.88); color: #fff; border: 2px solid #e8c15a; border-radius: 12px; padding: 2px 10px; font-size: 12px; pointer-events: none; white-space: nowrap; }
      #g3-prompt b { color: #e8c15a; }
      #g3-tools { position: absolute; display: none; flex-direction: column; align-items: flex-end; gap: 4px; pointer-events: none; z-index: 5; }
      #g3-tools > * { pointer-events: auto; }
      #g3-tools button { font: inherit; font-size: 11px; background: rgba(11,18,38,.85); color: #fff; border: 1px solid rgba(232,193,90,.7); border-radius: 4px; padding: 2px 7px; cursor: pointer; }
      #g3-tools button.on { background: #e8c15a; color: #1a1a2a; }
      #g3-panel { display: none; background: rgba(11,18,38,.93); border: 2px solid #e8c15a; border-radius: 6px; padding: 6px 8px; font-size: 11px; color: #fff; min-width: 200px; }
      #g3-panel.show { display: block; } #g3-panel .row { display: flex; align-items: center; gap: 4px; margin: 3px 0; flex-wrap: wrap; } #g3-panel .lab { min-width: 64px; color: #cfe3ff; }
      #g3-badge { position: absolute; display: none; font-size: 10px; color: rgba(255,255,255,.8); background: rgba(0,0,0,.45); padding: 1px 6px; border-radius: 3px; pointer-events: none; }
      @media (max-width: 560px) { #g3-badge { display: none !important; } #g3-tools button { font-size: 10px; padding: 1px 5px; } }
      #g3-stick { position: absolute; width: 110px; height: 110px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); background: rgba(255,255,255,.08); display: none; pointer-events: none; transform: translate(-50%,-50%); }
      #g3-stick i { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: rgba(232,193,90,.7); }
    `; document.head.appendChild(css);
    const stage = document.getElementById('stage'); const game = document.getElementById('game');
    this.canvas = document.createElement('canvas'); this.canvas.id = 'game3d'; this.canvas.tabIndex = -1; game.insertAdjacentElement('afterend', this.canvas);
    const mk = (id, html) => { const d = document.createElement('div'); d.id = id; if (html) d.innerHTML = html; this.canvas.insertAdjacentElement('afterend', d); return d; };
    this.veil = mk('g3-veil', '<div class="txt">3Dのマップを組み立てています…</div><div class="bar"><i></i></div>');
    this.prompt = mk('g3-prompt');
    this.badge = mk('g3-badge', '3D版 Phase 1（技術プロトタイプ）');
    this.tools = document.createElement('div'); this.tools.id = 'g3-tools'; stage.appendChild(this.tools);
    this.tools.innerHTML = '<div><button data-a="zin">＋</button> <button data-a="zout">－</button> <button data-a="panel">3D設定</button></div>' +
      '<div id="g3-panel"><div class="row"><span class="lab">カメラ角度</span><button data-cam="38">38°</button><button data-cam="48">48°</button><button data-cam="56">56°</button></div>' +
      '<div class="row"><span class="lab">画質</span><button data-q="high">高（PC）</button><button data-q="low">軽量（スマホ）</button></div>' +
      '<div class="row"><span class="lab">時間帯の確認</span><button data-t="-1">ゲーム内</button><button data-t="0.3">朝</button><button data-t="0.5">昼</button><button data-t="0.74">夕</button><button data-t="0.95">夜</button></div>' +
      '<div class="row"><span class="lab">モーション</span><button data-m="Attack">攻撃</button><button data-m="Cast">呪文</button><button data-m="Hit">被弾</button><button data-m="Defend">防御</button><button data-m="Victory">勝利</button><button data-m="Defeat">倒れる</button></div>' +
      '<div class="row"><span class="lab">戦闘の3D</span><button data-b="on">3Dの舞台</button><button data-b="off">2Dの背景</button></div>' +
      '<div class="row"><span class="lab">戦闘のキャラ</span><button data-ba="on">3Dのキャラ（仮3D）</button><button data-ba="off">2Dの絵</button></div>' +
      '<div class="row"><span class="lab">3Dの範囲</span><button data-sc="all">全マップ（汎用3D＝仮3D）</button><button data-sc="poyo">ポヨ村だけ（以前と同じ）</button></div>' +
      '<div class="row"><span class="lab">表示</span><span id="g3-fps">-- fps</span></div>' +
      '<div class="row muted small" style="max-width:240px;color:#aab">時間帯の確認は見た目だけで、ゲームの進行（State の時刻）は変えません。画質の変更は再読み込みで反映されます。</div></div>';
    this.stickEl = document.createElement('div'); this.stickEl.id = 'g3-stick'; this.stickEl.innerHTML = '<i></i>'; stage.appendChild(this.stickEl);
    this.tools.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
      if (b.dataset.a === 'zin') app.camera.zoom(0.85); if (b.dataset.a === 'zout') app.camera.zoom(1.18);
      if (b.dataset.a === 'panel') document.getElementById('g3-panel').classList.toggle('show');
      if (b.dataset.cam) { app.setPitch(+b.dataset.cam); }
      if (b.dataset.q) app.changeQuality(b.dataset.q);
      if (b.dataset.t) { const v = +b.dataset.t; app.lighting.preview = v < 0 ? null : v; }
      if (b.dataset.m) app.emote(b.dataset.m);
      if (b.dataset.b && G3B()) G3B().setEnabled(b.dataset.b === 'on');   // v6.5 Phase D
      if (b.dataset.ba && G3B()) G3B().setActors(b.dataset.ba === 'on');   // Phase 2：次の戦闘から
      if (b.dataset.sc) setScope3D(b.dataset.sc);                         // Phase 1：すぐ反映（今いるマップも）
      this.refresh();
    });
    // ホイールでズーム
    this.canvas.addEventListener('wheel', (e) => { e.preventDefault(); app.camera.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
    // タッチ：左側＝スティック、2本指＝ズーム
    let pinch = null; let stickId = null; let origin = null;
    const rectOf = () => this.canvas.getBoundingClientRect();
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) { const [a, b] = e.touches; pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); stickId = null; this.stickEnd(); e.preventDefault(); return; }
      const t = e.changedTouches[0]; const r = rectOf();
      if (stickId === null && t.clientX < r.left + r.width * 0.62) { stickId = t.identifier; origin = { x: t.clientX, y: t.clientY }; this.stick.active = true; this.showStick(t.clientX - r.left + this.canvas.offsetLeft, t.clientY - r.top + this.canvas.offsetTop, 0, 0); }
      e.preventDefault();
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      if (pinch && e.touches.length === 2) { const [a, b] = e.touches; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); app.camera.zoom(pinch / d); pinch = d; e.preventDefault(); return; }
      for (const t of e.changedTouches) if (t.identifier === stickId) {
        let dx = t.clientX - origin.x, dy = t.clientY - origin.y; const L = Math.hypot(dx, dy); const R = 48; if (L > R) { dx = dx / L * R; dy = dy / L * R; }
        this.stick.x = dx / R; this.stick.z = dy / R; this.stick.mag = Math.min(1, L / R);
        const r = rectOf(); this.showStick(origin.x - r.left + this.canvas.offsetLeft, origin.y - r.top + this.canvas.offsetTop, dx, dy);
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) if (t.identifier === stickId) { stickId = null; this.stickEnd(); } if (e.touches.length < 2) pinch = null; };
    this.canvas.addEventListener('touchend', end); this.canvas.addEventListener('touchcancel', end);
    this.refresh();
  }
  showStick(x, y, dx, dy) { const s = this.stickEl; s.style.display = 'block'; s.style.left = x + 'px'; s.style.top = y + 'px'; s.firstChild.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
  stickEnd() { this.stick.x = 0; this.stick.z = 0; this.stick.mag = 0; this.stick.active = false; this.stickEl.style.display = 'none'; }
  refresh() {
    const app = this.app; const deg = Math.round(app.camera.pitch * 180 / Math.PI);
    this.tools.querySelectorAll('[data-cam]').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.cam - deg) < 1));
    this.tools.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('on', b.dataset.q === app.quality));
    const pv = app.lighting ? app.lighting.preview : null;
    this.tools.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', (+b.dataset.t < 0 && pv === null) || +b.dataset.t === pv));
    const bs = G3B(); const on = bs ? bs.isEnabled() : true; this.tools.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', (b.dataset.b === 'on') === on));
    let ba = true; try { ba = localStorage.getItem('mtq3d-battle-actors') !== 'off'; } catch (e) { /* なし */ } this.tools.querySelectorAll('[data-ba]').forEach((b) => b.classList.toggle('on', (b.dataset.ba === 'on') === ba));
    const sc = scope3D(); this.tools.querySelectorAll('[data-sc]').forEach((b) => b.classList.toggle('on', b.dataset.sc === sc));
  }
  // #game（2D）のちょうど内側に重ねる
  layout() {
    const g = document.getElementById('game'); if (!g) return null;
    const w = g.clientWidth, h = g.clientHeight; const l = g.offsetLeft + g.clientLeft, t = g.offsetTop + g.clientTop;
    for (const el of [this.canvas, this.veil]) { el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px'; }
    this.tools.style.left = 'auto'; this.tools.style.right = (g.parentElement.clientWidth - (l + w) + 6) + 'px'; this.tools.style.top = (t + h - 26) + 'px'; this.tools.style.transform = 'translateY(-100%)';
    this.badge.style.left = (l + 6) + 'px'; this.badge.style.top = (t + h - 18) + 'px';
    return { w, h, l, t };
  }
  show(on, loading) {
    const d = on ? 'block' : 'none';
    if (this.canvas.style.display !== d) this.canvas.style.display = d;
    this.tools.style.display = on ? 'flex' : 'none'; this.badge.style.display = on ? 'block' : 'none';
    this.veil.style.display = on && loading ? 'flex' : 'none';
    if (!on) { this.prompt.style.display = 'none'; this.stickEl.style.display = 'none'; }
  }
  setBadge(text) { if (this.badge.textContent !== text) this.badge.textContent = text; }
  progress(k, text) { this.veil.querySelector('i').style.width = Math.round(k * 100) + '%'; if (text) this.veil.querySelector('.txt').textContent = text; }
  setPrompt(text, sx, sy) {
    if (!text) { this.prompt.style.display = 'none'; return; }
    this.prompt.innerHTML = text; this.prompt.style.display = 'block'; this.prompt.style.left = sx + 'px'; this.prompt.style.top = sy + 'px';
  }
  setFps(f, extra) { const el = document.getElementById('g3-fps'); if (el) el.textContent = f + ' fps' + (extra ? '　' + extra : ''); }
}
