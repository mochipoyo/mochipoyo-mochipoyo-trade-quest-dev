/* =========================================================
   MapScene3D：1枚の GameMap（2D版のマップオブジェクト）を3Dの場面にする
   ・屋外：地形＋建物＋門＋小物＋宝箱＋煙＋NPC
   ・屋内：部屋＋家具＋NPC
   ・当たり判定は 2D 版のタイル（Tiles.isSolid・固定イベント）をそのまま使い、移動だけを自由にする
   ・NPC の位置・向き・表示／非表示は毎フレーム 2D 側のデータ（n.x, n.nx, n.prog, n.hidden, n.dir）から写す
   ========================================================= */
import * as THREE from 'three';
import { TerrainBuilder3D, rngFrom } from './TerrainBuilder3D.js';
import { BuildingBuilder3D } from './BuildingBuilder3D.js';
import { InteriorBuilder3D } from './InteriorBuilder3D.js';
import { Character3D, DIR_YAW } from '../entities/Character3D.js';
import { characterModelFor } from '../assets/manifest.js';
import { Batch, box, M4, softTexture } from '../engine/Materials.js';

export class MapScene3D {
  constructor(app) { this.app = app; this.root = new THREE.Group(); this.npcs = []; this.chests = []; this.smokes = []; this.sway = []; this.animated = []; this.lampSpots = []; }

  async build(map) {
    const app = this.app; this.map = map; this.interior = map.kind === 'interior';
    this.root.name = 'map3d_' + map.id;
    const t0 = performance.now();
    if (this.interior) {
      const ib = new InteriorBuilder3D(app.mats, app.models);
      const r = await ib.build(map);
      this.root.add(r.group); this.lampSpots = r.lights; this.animated = r.animated; this.bounds = r.bounds;
      this.heightAt = () => 0;
    } else {
      const tb = new TerrainBuilder3D(app.mats, app.models, app.quality); this.terrain = tb;
      const r = await tb.build(map);
      this.root.add(r.group); this.heightAt = r.heightAt; this.lampSpots = r.lampSpots.slice();
      // 門（出口の道の上）
      const gl = tb.gate(r.group, map.name); if (gl) this.lampSpots.push(...gl);
      // 建物
      const bb = new BuildingBuilder3D(app.mats, app.models); const rnd = rngFrom(5150);
      const shared = new Batch(); const bgroup = new THREE.Group(); bgroup.name = 'buildings'; this.root.add(bgroup);
      for (const b of map.buildings) {
        const o = await bb.build(b, rnd, { batch: shared }); bgroup.add(o.group);
        o.lights.forEach((l) => this.lampSpots.push(l));
        o.smokes.forEach((s) => this.addSmoke(s));
        o.props.forEach((p) => { const v = new THREE.Vector3().setFromMatrixPosition(p.m); tb.put(p.id, p.m, v.x, v.z); });
        o.group.traverse((x) => { if (x.userData && x.userData.sway) this.sway.push({ obj: x, base: x.rotation.clone(), ph: Math.random() * 6 }); });
      }
      shared.build(bgroup);
      await r.finalize();
      r.group.traverse((o) => { if (o.name && (o.name.startsWith('grass_') || o.name === 'flowers')) o.renderOrder = 3; });
      // 宝箱
      for (const c of map.chests) this.addChest(c);
      this.addMotes(map);
    }
    // v6.1 調べる共通システムの探索ポイント（光る場所・壺・机など）。データは2D版と同じ Search
    this.addSearchPoints(map);
    // NPC
    for (const n of map.npcs) {
      const ch = await Character3D.create(app.models, characterModelFor(n.sprite), { scale: n.sprite === 'child' ? 1.0 : 1.0 });
      if (!ch) continue; ch.npc = n; this.root.add(ch.root); this.npcs.push(ch);
      ch.yaw = ch.wantYaw = DIR_YAW[n.dir] || 0;
      this.placeNpc(ch, 0, true);
    }
    app.lighting.registerScene(this.root);
    this.buildMs = Math.round(performance.now() - t0);
    return this;
  }

  addSmoke(pos) {
    if (!this._smokeTex) this._smokeTex = softTexture('rgba(220,220,225,0.9)', 64);
    const list = [];
    for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._smokeTex, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 4; this.root.add(s); list.push({ s, life: i / 7 }); }
    this.smokes.push({ pos: pos.clone(), list });
  }
  // 空気中の粒：昼は舞う花粉・綿毛、夜は蛍（草地の上）
  addMotes(map) {
    const N = this.app.quality === 'high' ? 260 : 110; const pos = new Float32Array(N * 3); const seed = new Float32Array(N); const rnd = rngFrom(31);
    let n = 0; for (let tries = 0; n < N && tries < N * 30; tries++) { const x = 2 + rnd() * (map.w - 4), z = 2 + rnd() * (map.h - 4); const t = map.tile(Math.floor(x), Math.floor(z)); if (t !== 'grass' && t !== 'grass2' && t !== 'tree' && t !== 'bush') continue; pos[n * 3] = x; pos[n * 3 + 1] = 0.3 + rnd() * 1.6; pos[n * 3 + 2] = z; seed[n] = rnd() * 100; n++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1)); g.setDrawRange(0, n);
    const tex = softTexture('rgba(255,255,255,1)', 32);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uMap: { value: tex }, uScale: { value: 1 } },
      vertexShader: 'attribute float seed; uniform float uTime; uniform float uNight; uniform float uScale; varying float vA; varying float vN; void main(){ vec3 p = position; float t = uTime * 0.35 + seed; p.x += sin(t * 1.3) * 0.6 + sin(t * 0.37) * 1.2; p.z += cos(t * 1.1) * 0.6; p.y += sin(t * 2.1) * 0.25 + uNight * 0.2; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float blink = 0.5 + 0.5 * sin(uTime * 2.7 + seed * 7.0); vA = mix(0.35, blink, uNight); vN = uNight; gl_PointSize = mix(3.0, 7.0, uNight) * uScale * (12.0 / -mv.z); }',
      fragmentShader: 'uniform sampler2D uMap; varying float vA; varying float vN; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); vec3 col = mix(vec3(1.0, 0.97, 0.85), vec3(0.75, 1.0, 0.45), vN); gl_FragColor = vec4(col * c.a * vA * mix(0.45, 1.6, vN), c.a * vA); }' });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 5; pts.name = 'motes'; this.root.add(pts); this.motes = mat;
  }
  addChest(c) {
    const M = this.app.mats; const g = new THREE.Group(); const b = new Batch(); const wood = M.tinted('planks', '#9a5a2a'), iron = M.get('iron'), gold = M.get('gold');
    b.add(wood, box(0.7, 0.36, 0.48, 0.6), M4(0, 0.18, 0)); b.add(iron, box(0.72, 0.05, 0.5, 1), M4(0, 0.33, 0));
    for (const sx of [-0.25, 0.25]) b.add(iron, box(0.05, 0.37, 0.5, 1), M4(sx, 0.185, 0));
    b.build(g);
    const lid = new THREE.Group(); lid.position.set(0, 0.36, -0.24); g.add(lid);
    const lb = new Batch(); lb.add(wood, new THREE.CylinderGeometry(0.24, 0.24, 0.7, 12, 1, false, 0, Math.PI), M4(0, 0, 0.24, 0, 0, Math.PI / 2));
    for (const sx of [-0.25, 0.25]) lb.add(iron, new THREE.CylinderGeometry(0.25, 0.25, 0.05, 12, 1, false, 0, Math.PI), M4(sx, 0, 0.24, 0, 0, Math.PI / 2));
    lb.add(gold, box(0.12, 0.14, 0.04, 1), M4(0, -0.02, 0.5)); lb.build(lid);
    const glow = new THREE.PointLight(0xffd070, 0, 2.5, 2); glow.position.set(0, 0.6, 0); g.add(glow);
    g.position.set(c.x + 0.5, this.heightAt(c.x + 0.5, c.y + 0.5), c.y + 0.5);
    // 道側を向ける
    const m = this.map; const dirs = [[0, 1], [1, 0], [-1, 0], [0, -1]]; let yaw = 0; for (const [dx, dz] of dirs) { if (m.passable(c.x + dx, c.y + dz, null)) { yaw = Math.atan2(dx, dz); break; } }
    g.rotation.y = yaw; this.root.add(g); this.chests.push({ c, g, lid, glow, open: 0 });
  }

  // v6.1 探索ポイント：光る場所（黄・オーパーツは紫）は光の玉、壺は素焼きの壺、机などは箱。取得済みの光は消える
  addSearchPoints(map) {
    const S = window.Search; this.searchObjs = []; if (!S) return;
    const M = this.app.mats; const clay = M.tinted('planks', '#b8683a');
    for (const p of S.forMap(map.id)) {
      if (p.kind === 'well') continue;   // 井戸は地形の井戸のまま
      const g = new THREE.Group(); g.position.set(p.x + 0.5, this.heightAt(p.x + 0.5, p.y + 0.5), p.y + 0.5); g.name = 'search_' + p.id;
      let glow = null, core = null;
      if (p.kind === 'sparkle' || p.kind === 'relic') {
        const relic = p.kind === 'relic'; const col = relic ? 'rgba(200,150,255,1)' : 'rgba(255,240,170,1)';
        glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(col, 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(0.9, 0.9, 0.9); glow.position.y = 0.35; g.add(glow);
        core = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: relic ? 0xe6d0ff : 0xfff6c8 })); core.position.y = 0.35; g.add(core);
      } else if (p.kind === 'pot') {
        const pts = [[0, 0], [0.16, 0.02], [0.24, 0.14], [0.25, 0.3], [0.18, 0.44], [0.12, 0.5], [0.14, 0.56], [0, 0.56]].map(([x, y]) => new THREE.Vector2(x, y));
        const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), clay); pot.castShadow = true; g.add(pot);
      } else {
        const bx = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.55), M.tinted('planks', '#8a6a4a')); bx.position.y = 0.375; bx.castShadow = true; g.add(bx);
      }
      this.root.add(g); this.searchObjs.push({ p, g, glow, core, ph: (p.x * 97 + p.y * 31) % 7 });
    }
  }
  npcPos(n) { const k = n.moving ? n.prog : 0; return { x: n.x + 0.5 + (n.moving ? (n.nx - n.x) * k : 0), z: n.y + 0.5 + (n.moving ? (n.ny - n.y) * k : 0) }; }
  placeNpc(ch, dt, snap) {
    const n = ch.npc; const p = this.npcPos(n);
    ch.root.position.set(p.x, this.heightAt(p.x, p.z), p.z); ch.root.visible = !n.hidden;
  }

  update(dt, t, player) {
    const W = window.World; const busy = W && W.busy;
    for (const ch of this.npcs) {
      const n = ch.npc; this.placeNpc(ch, dt);
      if (!ch.root.visible) continue;
      let yaw = DIR_YAW[n.dir] || 0;
      if (player) {
        const dx = player.x - ch.root.position.x, dz = player.z - ch.root.position.z; const d = Math.hypot(dx, dz);
        if ((this.app.talkNpc === n && busy) || (!n.moving && d < 2.2)) yaw = Math.atan2(dx, dz);   // 話している相手・近くに来た主人公の方を向く
      }
      ch.faceTo(yaw); ch.play(n.moving ? 'Walk' : 'Idle', 0.2); if (n.moving) ch.setSpeed(0.9);
      ch.update(dt);
    }
    // v6.1 探索ポイント：条件（ボス撃破後など）を満たすまで隠し、取得済みの光は消す
    if (this.searchObjs && window.Search) { const S = window.Search; for (const o of this.searchObjs) { const stand = o.glow; o.g.visible = S.shown(o.p) && !(stand && S.taken(o.p)); if (stand && o.g.visible) { const k = 0.75 + 0.25 * Math.sin(t * 3 + o.ph); o.glow.material.opacity = k; o.glow.scale.setScalar(0.7 + 0.25 * k); o.core.rotation.y = t * 1.5; o.core.position.y = 0.32 + Math.sin(t * 2 + o.ph) * 0.05; } } }
    // 宝箱のふた
    for (const c of this.chests) {
      const opened = this.map.tile(c.c.x, c.c.y) === 'chest_open'; c.open += ((opened ? 1 : 0) - c.open) * Math.min(1, dt * 5);
      c.lid.rotation.x = -c.open * 1.9; c.glow.intensity = opened ? Math.max(0, 1 - c.open) * 2.5 : 0;
    }
    // 煙
    for (const s of this.smokes) for (const p of s.list) {
      p.life += dt * 0.16; if (p.life > 1) p.life -= 1; const l = p.life;
      p.s.position.set(s.pos.x + Math.sin(l * 3 + t * 0.3) * 0.2 + l * 0.9, s.pos.y + l * 2.4, s.pos.z - l * 0.3);
      const sc = 0.35 + l * 1.3; p.s.scale.set(sc, sc, sc); p.s.material.opacity = Math.sin(l * Math.PI) * 0.32;
    }
    for (const w of this.sway) { w.obj.rotation.z = w.base.z + Math.sin(t * 1.4 + w.ph) * 0.06; w.obj.rotation.x = w.base.x + Math.sin(t * 1.1 + w.ph) * 0.04; }
    for (const a of this.animated) if (a.kind === 'flame') { const k = 0.85 + Math.sin(t * 13 + a.obj.id) * 0.08 + Math.sin(t * 23.7) * 0.06; a.obj.scale.set(1 * k, (a.obj.geometry.type === 'ConeGeometry' ? 1 : 1.8) * (2 - k), 1 * k); }
    if (this.motes) { this.motes.uniforms.uTime.value = t; this.motes.uniforms.uNight.value = this.app.lighting.night; this.motes.uniforms.uScale.value = this.app.renderer.pixelRatio * (this.app.renderer.size.h / 600); }
    if (this.terrain) { this.terrain.update(t, this.app.lighting.night < 0.5 ? 1 : 0); this.terrain.updateLod(player); }
  }

  // 使わなくなった場面の解放（共有のモデル形状・マテリアルは残す）
  dispose() {
    this.root.traverse((o) => {
      if (o.isInstancedMesh || o.isBatchedMesh) { try { o.dispose(); } catch (e) { /* なし */ } }
      if (o.geometry && o.geometry.userData && o.geometry.userData.own) o.geometry.dispose();
      if (o.isSprite && o.material) o.material.dispose();
    });
    if (this.root.parent) this.root.parent.remove(this.root);
    this.npcs.forEach((ch) => ch.mixer.stopAllAction());
  }

  // ---- 当たり判定
  tileBlocked(x, y) {
    const m = this.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
    const t = m.tiles[y][x]; if (window.Tiles.isSolid(t)) return true;
    const ev = m.eventAt(x, y); const d = window.State.data; if (ev && ev.solid && !(d && ev.doneFlag && d.flags[ev.doneFlag])) return true;
    if (window.Search && window.Search.solidAt(m, x, y)) return true;   // v6.1 壺など（2D版の passable と同じ）
    return false;
  }
  // 円（中心 x,z 半径 r）をタイル・NPC から押し出す
  resolve(x, z, r) {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
      for (let ty = z0; ty <= z1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (!this.tileBlocked(tx, ty)) continue;
        const cx = Math.max(tx, Math.min(x, tx + 1)), cz = Math.max(ty, Math.min(z, ty + 1));
        let dx = x - cx, dz = z - cz; const d = Math.hypot(dx, dz);
        if (d < r) { if (d < 1e-5) { dx = x - (tx + 0.5); dz = z - (ty + 0.5); const L = Math.hypot(dx, dz) || 1; x += dx / L * r; z += dz / L * r; } else { x += dx / d * (r - d); z += dz / d * (r - d); } moved = true; }
      }
      for (const ch of this.npcs) {
        if (!ch.root.visible) continue; const p = ch.root.position; const rr = r + 0.36; const dx = x - p.x, dz = z - p.z; const d = Math.hypot(dx, dz);
        if (d < rr && d > 1e-5) { x += dx / d * (rr - d); z += dz / d * (rr - d); moved = true; }
      }
      if (!moved) break;
    }
    return { x, z };
  }
}
