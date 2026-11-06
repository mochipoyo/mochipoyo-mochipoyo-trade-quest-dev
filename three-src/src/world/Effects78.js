/* =========================================================
   v7.8 地球の世界の 3D の仕上げ（表示だけ。当たり判定・ゲームの進行は変えない）
   ・雨：マップの定義 def.rain78 が true の屋外（錆雨市ネオン・ドックのフィールドと町）。主人公のまわりに細い雨の線
   ・浮天城アエリアの影：太平洋の上空の城（js/rpg/earth78.js の aeriaAt）の真下の海に、大きな影（地球の世界の外の地図・地域）
   ・展望室の地球：環星ステーション・オルビスの展望室（def.earthWindow78）の窓の前に、地球の地形の絵を貼った球（ゆっくり回る。上から見るカメラでも見える位置）
   ・重さ：雨は線 700 本（低画質は 350 本）。影は円 1 枚。地球は球 1 つ（展望室だけ）
   ・v7.9 雨の地面に水たまりの波紋（輪 36 個・低画質 18 個）と雨音（ゲームの効果音の音量・消音に従う。雨のある屋外だけ）
   ・v7.9 アエリアの影：陸の上にも落とす（影の下の地面のいちばん高い所の少し上に置く。海だけのときは海面）
   ========================================================= */
import * as THREE from 'three';

function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
}

export class Effects78 {
  constructor(scene, quality) {
    this.scene = scene; this.low = quality === 'low'; this.mapId = null;
    this.rain = null; this.shadow = null; this.globe = null; this.globeHalo = null;
    this.ripples = null; this.rainAudio = null;
  }
  // v7.9 水たまりの波紋：輪が広がって消える（主人公のまわり）
  makeRipples() {
    const N = this.low ? 18 : 36; const geo = new THREE.RingGeometry(0.8, 1.0, 20); geo.rotateX(-Math.PI / 2); const list = [];
    const grp = new THREE.Group(); grp.name = 'fx78_ripples';
    for (let i = 0; i < N; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0, depthWrite: false })); m.renderOrder = 4; m.visible = false; grp.add(m); list.push({ m, life: Math.random() * 0.8, dur: 0.7 }); }
    this.scene.add(grp); this.ripples = { grp, list }; return this.ripples;
  }
  updateRipples(dt, focus, on, current) {
    if (!on) { if (this.ripples) this.ripples.grp.visible = false; return; }
    const R = this.ripples || this.makeRipples(); R.grp.visible = true;
    for (const r of R.list) {
      r.life += dt; if (r.life >= r.dur) { r.life = 0; r.dur = 0.5 + Math.random() * 0.4; const x = focus.x + (Math.random() * 2 - 1) * 9, z = focus.z + (Math.random() * 2 - 1) * 7; let y = 0; try { y = current && current.heightAt ? current.heightAt(x, z) : 0; } catch (e) { y = 0; } r.m.position.set(x, (y || 0) + 0.03, z); r.m.visible = true; }
      const k = r.life / r.dur; r.m.scale.setScalar(0.06 + k * 0.32); r.m.material.opacity = 0.5 * (1 - k);
    }
  }
  // v7.9 雨音：白い雑音を高い音だけ通して、ゲームの効果音の音量（Audio.seGain）へ。音が使えるようになってから（最初のキー操作のあと）
  rainSound(on) {
    const A = window.Audio; if (!A || !A.ctx || !A.seGain || typeof A.ctx.createBufferSource !== 'function') return;
    const c = A.ctx; const now = c.currentTime;
    if (on && !this.rainAudio) {
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
      const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.32, now + 1.2); src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(A.seGain); src.start(); this.rainAudio = { src, g };
    } else if (!on && this.rainAudio) {
      const ra = this.rainAudio; this.rainAudio = null; try { ra.g.gain.cancelScheduledValues(now); ra.g.gain.setValueAtTime(ra.g.gain.value, now); ra.g.gain.linearRampToValueAtTime(0, now + 0.8); ra.src.stop(now + 0.9); } catch (e) { /* 止められなくても進める */ }
    }
  }
  // 雨の線（世界の座標で持つ。主人公のまわりの箱の中で落ちる）
  makeRain() {
    const N = this.low ? 350 : 700; const pos = new Float32Array(N * 6); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial({ color: 0xa8c8ff, transparent: true, opacity: 0.42, depthWrite: false });
    const L = new THREE.LineSegments(g, m); L.name = 'fx78_rain'; L.frustumCulled = false; L.renderOrder = 5; L.userData = { N, seeded: false, R: 18, H: 14 };
    this.scene.add(L); this.rain = L; return L;
  }
  seedDrop(p, i, f, R, H, yTop) { const x = f.x + (Math.random() * 2 - 1) * R, z = f.z + (Math.random() * 2 - 1) * R, y = yTop ? H : Math.random() * H; p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z; p[i * 6 + 3] = x - 0.08; p[i * 6 + 4] = y - 0.7; p[i * 6 + 5] = z + 0.05; }
  updateRain(dt, focus, on) {
    if (!on) { if (this.rain) this.rain.visible = false; return; }
    const L = this.rain || this.makeRain(); L.visible = true; const u = L.userData; const p = L.geometry.attributes.position.array; const R = u.R, H = u.H;
    if (!u.seeded) { for (let i = 0; i < u.N; i++) this.seedDrop(p, i, focus, R, H, false); u.seeded = true; }
    const dy = 24 * Math.min(dt, 0.1), dx = -2.4 * Math.min(dt, 0.1);
    for (let i = 0; i < u.N; i++) { const b = i * 6; p[b + 1] -= dy; p[b + 4] -= dy; p[b] += dx; p[b + 3] += dx;
      if (p[b + 4] < 0 || Math.abs(p[b] - focus.x) > R + 2 || Math.abs(p[b + 2] - focus.z) > R + 2) this.seedDrop(p, i, focus, R, H, true); }
    L.geometry.attributes.position.needsUpdate = true;
  }
  updateShadow(t, current) {
    const G = window, W76 = G.World76, E = G.Earth78; let show = false;
    if (current && current.map && W76 && W76.earth && E && E.aeriaAt && W76.inGrid && W76.inGrid(current.map.id)) {
      const a = E.aeriaAt(); const r = W76.rect(current.map.id);
      if (a && r) { const lx = W76.dxWrap(a.x - r.x) + 0.5, lz = a.y - r.y + 0.5; const o = current.root.position;
        if (Math.abs(lx - (r.w / 2)) < r.w / 2 + 70 && Math.abs(lz - (r.h / 2)) < r.h / 2 + 70) {
          if (!this.shadow) { const m = new THREE.MeshBasicMaterial({ map: radialTex(), color: 0x000814, transparent: true, opacity: 0.62, depthWrite: false }); const s = new THREE.Mesh(new THREE.CircleGeometry(1, 48), m); s.rotation.x = -Math.PI / 2; s.name = 'fx78_aeria_shadow'; s.renderOrder = 4; this.scene.add(s); this.shadow = s; }
          const rr = (a.r || 7) * 1.4; this.shadow.scale.set(rr * 1.35, rr, 1);
          // v7.9 陸の上にも：影の下の地面のいちばん高い所の少し上に置く（1 秒ごとに測る。海だけなら海面の高さ）
          if (!this._shY || t - this._shT > 1) { let hy = 0.06; try { for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const sx = lx + i * rr * 0.4, sz = lz + j * rr * 0.3; if (sx < 0 || sz < 0 || sx >= r.w || sz >= r.h) continue; const hh = current.heightAt ? current.heightAt(sx, sz) : 0; if (hh > hy - 0.06) hy = Math.max(hy, hh + 0.08); } } catch (e) { hy = 0.06; } this._shY = Math.min(hy, 3.5); this._shT = t; }
          this.shadow.position.set(o.x + lx + Math.sin(t * 0.05) * 1.2, this._shY, o.z + lz + Math.cos(t * 0.04) * 0.8); show = true; } }
    }
    if (this.shadow) this.shadow.visible = show;
  }
  updateGlobe(dt, current) {
    const on = !!(current && current.map && current.map.def && current.map.def.earthWindow78 && !current.interior);
    if (!on) { if (this.globe) this.globe.visible = this.globeHalo.visible = false; return; }
    if (!this.globe) {
      const cv = window.Minimap && window.Minimap.earthCanvas ? window.Minimap.earthCanvas() : null;
      const mat = cv ? new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }) : new THREE.MeshBasicMaterial({ color: 0x2a5aa8 });
      if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
      this.globe = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 32), mat); this.globe.name = 'fx78_globe';
      this.globeHalo = new THREE.Mesh(new THREE.SphereGeometry(1.42, 32, 24), new THREE.MeshBasicMaterial({ color: 0x6ab8ff, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false })); this.globeHalo.name = 'fx78_globe_halo';
      this.scene.add(this.globe); this.scene.add(this.globeHalo);
    }
    const m = current.map, o = current.root.position; const x = o.x + m.w / 2, z = o.z + 3.5, y = 1.55 + Math.sin(performance.now() / 900) * 0.06;   // 窓の前（北の壁の手前）に浮かぶ地球（窓の外の景色を、部屋の中から見上げる大きさに）
    this.globe.position.set(x, y, z); this.globeHalo.position.copy(this.globe.position); this.globe.rotation.y += dt * 0.06; this.globe.rotation.x = 0.35;
    this.globe.visible = this.globeHalo.visible = true;
  }
  update(dt, t, focus, current) {
    const def = current && current.map && current.map.def; const outdoor = current && !current.interior;
    const rain = !!(def && def.rain78 && outdoor);
    this.updateRain(dt, focus, rain);
    this.updateRipples(dt, focus, rain, current);
    try { this.rainSound(rain && !document.hidden); } catch (e) { /* 音は飾り */ }
    this.updateShadow(t, current);
    this.updateGlobe(dt, current);
  }
}
