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
import { InteriorBuilder3D, INTERIOR_KINDS } from './InteriorBuilder3D.js';
import { WorldBuilder3D } from './WorldBuilder3D.js';
import { DecorBuilder3D, modernStyle, buildModernBuilding, buildVillageDecor, buildElevatorTower, buildTower3D } from './DecorBuilder3D.js';
import { themeFor } from './themes.js';
import { mapCoverage } from './coverage.js';
import { buildArtVolume } from '../battle/ArtVolume.js';
import { readable } from '../battle/readable.js';
import { Character3D, DIR_YAW } from '../entities/Character3D.js';
import { Animal3D, isAnimalSprite } from '../entities/Animal3D.js';
import { buildFurniture73 } from './Furniture73.js';
import { characterModelFor, fieldModelFor } from '../assets/manifest.js';
import { Batch, box, M4, softTexture, textTexture } from '../engine/Materials.js';

export class MapScene3D {
  constructor(app) { this.app = app; this.root = new THREE.Group(); this.npcs = []; this.chests = []; this.smokes = []; this.sway = []; this.animated = []; this.lampSpots = []; }

  async build(map) {
    const app = this.app; this.map = map; this.interior = map.kind === 'interior';
    this.root.name = 'map3d_' + map.id;
    const t0 = performance.now();
    this.coverage = mapCoverage(map);   // 'done'（専用に作り込んだ3D）／'generic'（汎用の3D＝仮3D）
    if (this.coverage === 'generic') {
      // ---- Phase 1 汎用3Dワールド：町・フィールド・ダンジョン・ポヨ村以外の屋内
      const theme = themeFor(map); this.theme = theme;
      theme.modern = modernStyle(window.PLACE_DECOR && window.PLACE_DECOR.forMap ? window.PLACE_DECOR.forMap(map.id) : null);   // v7.0 近未来・機械・娯楽の町（舗装・建物）
      const wb = new WorldBuilder3D(app.mats, app.models, app.quality); this.world = wb;
      const r = await wb.build(map, theme);
      this.root.add(r.group); this.heightAt = r.heightAt; this.lampSpots = r.lampSpots.slice();
      (r.smokes || []).forEach((sm) => this.addSmoke(sm));   // v6.6 目印の煙突・噴気孔
      this.dark = this.interior || (map.kind === 'dungeon' && !(theme.placeDef && theme.placeDef.outdoor)); this.ambient = (theme.placeDef && theme.placeDef.light) || null;
      if (map.buildings.length) {
        const bb = new BuildingBuilder3D(app.mats, app.models); const rnd = rngFrom(5150);
        const shared = new Batch(); const bgroup = new THREE.Group(); bgroup.name = 'buildings'; this.root.add(bgroup);
        const design = (window.LocationDesign && window.LocationDesign.forMap) ? window.LocationDesign.forMap(map.id) : null; this.design = design;
        const modern = modernStyle(window.PLACE_DECOR && window.PLACE_DECOR.forMap ? window.PLACE_DECOR.forMap(map.id) : null);   // v7.0 近未来・機械・娯楽の町は、ガラスと金属の建物
        for (const b of map.buildings) {
          let o = null; if (b.type === 'elevator') { try { o = buildElevatorTower(b, map, textTexture); } catch (e) { o = null; console.warn('elevator', e); } }   // v7.1 空の区画へのエレベーター
          if (!o && b.type === 'watchtower') { try { o = buildTower3D(b); } catch (e) { o = null; console.warn('tower72', e); } }   // v7.2 新しい地区の塔
          if (!o && modern) { try { o = buildModernBuilding(b, modern, textTexture); } catch (e) { o = null; console.warn('modern building', e); } }
          if (!o) o = await bb.build(b, rnd, { batch: shared, design, theme }); bgroup.add(o.group);
          o.lights.forEach((l) => this.lampSpots.push(l)); o.smokes.forEach((s) => this.addSmoke(s));
          o.props.forEach((p) => { const v = new THREE.Vector3().setFromMatrixPosition(p.m); wb.put(p.id, p.m, v.x, v.z); });
          o.group.traverse((x) => { if (x.userData && x.userData.sway) this.sway.push({ obj: x, base: x.rotation.clone(), ph: Math.random() * 6 }); });
        }
        shared.build(bgroup);
      }
      await r.finalize();
      // v7.0 場所ごとの個性の飾り（壁の飾り・町の外の遠景・床の小物。js/data/placedecor70.js のテーマ）。失敗しても地図は表示する
      try { const db = new DecorBuilder3D(); const dr = db.build(map, { T: wb.T, OUT: wb.OUT, heightAt: r.heightAt, group: r.group }); this.decor = { key: dr.key, stats: db.stats }; (dr.smokes || []).forEach((sm) => this.addSmoke(sm)); } catch (e) { this.decor = { key: null, error: String(e && e.message || e) }; console.warn('decor70', e); }
      for (const c of map.chests) this.addChest(c);
      if (map.kind === 'town' || map.kind === 'field') this.addMotes(map);
      this.bounds = (this.interior && map.w <= 16 && map.h <= 14) ? { x0: 1, z0: 1, x1: map.w - 1, z1: map.h - 1 } : null;   // 小さな部屋だけ部屋全体を見る
    } else if (this.interior) {
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
      // v6.2 場所ごとの固有デザイン（2D の地図の建物絵と同じ LOCATION_DESIGNS）：屋根の色・茅葺きなど
      const design = (window.LocationDesign && window.LocationDesign.forMap) ? window.LocationDesign.forMap(map.id) : null; this.design = design;
      for (const b of map.buildings) {
        if (b.type === 'windmill' || b.type === 'watchtower') continue;   // v7.1 風車・見張り台は buildVillageDecor が作る
        const o = await bb.build(b, rnd, { batch: shared, design }); bgroup.add(o.group);
        o.lights.forEach((l) => this.lampSpots.push(l));
        o.smokes.forEach((s) => this.addSmoke(s));
        o.props.forEach((p) => { const v = new THREE.Vector3().setFromMatrixPosition(p.m); tb.put(p.id, p.m, v.x, v.z); });
        o.group.traverse((x) => { if (x.userData && x.userData.sway) this.sway.push({ obj: x, base: x.rotation.clone(), ph: Math.random() * 6 }); });
      }
      shared.build(bgroup);
      // v7.1 村の作り込み（鉢植え・道ばたの花・風車・アヒル・吊り提灯・案山子）。失敗しても村は表示する
      try { const vd = buildVillageDecor(map, { put: (id, m, x, z) => tb.put(id, m, x, z), heightAt: r.heightAt, group: r.group, mats: app.mats }); vd.animated.forEach((a) => this.animated.push(a)); vd.lamps.forEach((l) => this.lampSpots.push(l)); this.decor = { key: 'village', stats: vd.stats }; } catch (e) { this.decor = { key: null, error: String(e && e.message || e) }; console.warn('village decor', e); }
      await r.finalize();
      r.group.traverse((o) => { if (o.name && (o.name.startsWith('grass_') || o.name === 'flowers')) o.renderOrder = 3; });
      // 宝箱
      for (const c of map.chests) this.addChest(c);
      this.addMotes(map);
    }
    // v6.1 調べる共通システムの探索ポイント（光る場所・壺・机など）。データは2D版と同じ Search
    this.addSearchPoints(map);
    // v7.3 本棚（本が並ぶ）・台所・トイレ（形から作る。js/core/tiles.js の stove / sink / cupboard / toilet）
    try { const fg = buildFurniture73(map, this.heightAt); if (fg) { this.root.add(fg); this.furniture = fg.userData.stats; } } catch (e) { console.warn('furniture73', e); }
    // NPC
    for (const n of map.npcs) {
      const model = fieldModelFor(n.actorArt) || fieldModelFor(n.id) || characterModelFor(n.model3d || n.sprite);   // v7.3 model3d：個性的な町の人（2D は専用の色・3D は共通のモデル）
      const cr = n.creature3d;   // v6.9 魔物の姿の NPC（襲撃の夜の黒い影など）：モンスターの型＋色
      if (isAnimalSprite(n.sprite)) {   // v7.3 町の動物（形から作る立体。Animal3D）
        const an = Animal3D.create(n.sprite); if (!an) continue; an.npc = n; this.root.add(an.root); this.npcs.push(an);
        an.yaw = an.wantYaw = DIR_YAW[n.dir] || 0; this.placeNpc(an, 0, true); this.animals = (this.animals || 0) + 1; continue;
      }
      const ch = cr ? (await Character3D.create(app.models, cr.model, { color: cr.color, accent: cr.accent, scale: cr.scale }) || await Character3D.create(app.models, model)) : await Character3D.create(app.models, model);
      if (!ch) continue; ch.npc = n; this.root.add(ch.root); this.npcs.push(ch);
      ch.yaw = ch.wantYaw = DIR_YAW[n.dir] || 0;
      this.placeNpc(ch, 0, true);
    }
    this.addFx(map);   // v6.9 マップの炎・煙（2D のマップ定義 def.fx3d：襲撃の夜のアサナ村）
    app.lighting.registerScene(this.root);
    this.buildMs = Math.round(performance.now() - t0);
    return this;
  }

  // v6.9 炎（揺れる円錐＋光の玉＋橙の点光源）と煙。点光源は重いので大きい炎の上位4つだけ
  addFx(map) {
    const list = (map.def && map.def.fx3d) || []; if (!list.length) return;
    if (!this._fireTex) this._fireTex = softTexture('rgba(255,110,30,1)', 64);
    const fires = list.filter((f) => f.kind === 'fire'); const lit = fires.slice().sort((a, b) => (b.s || 1) - (a.s || 1)).slice(0, 4);
    for (const f of fires) {
      const s = f.s || 1; const x = f.x + 0.5, z = f.y + 0.5; const y = this.heightAt(x, z) || 0;
      const g = new THREE.Group(); g.position.set(x, y + (f.h || 0.9), z); g.name = 'fx_fire';
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 1.3 * s, 10), new THREE.MeshBasicMaterial({ color: 0xe8400c, transparent: true, opacity: 0.82, depthWrite: false, toneMapped: false })); outer.position.y = 0.55 * s; g.add(outer);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.24 * s, 0.9 * s, 8), new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })); inner.position.y = 0.4 * s; g.add(inner);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._fireTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); glow.scale.set(2.2 * s, 2.2 * s, 1); glow.position.y = 0.5 * s; glow.renderOrder = 5; g.add(glow);
      if (lit.indexOf(f) >= 0) { const l = new THREE.PointLight(0xff8a3a, 2.2 * s, 9 * s, 2); l.position.y = 0.8 * s; g.add(l); }
      this.root.add(g); this.animated.push({ kind: 'flame', obj: outer }); this.animated.push({ kind: 'flame', obj: inner });
      this.fxFires = (this.fxFires || 0) + 1;
    }
    for (const f of list.filter((q) => q.kind === 'smoke')) { const x = f.x + 0.5, z = f.y + 0.5; this.addSmoke(new THREE.Vector3(x, (this.heightAt(x, z) || 0) + 1.6, z)); }
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
    for (const a of this.animated) if (a.kind === 'swing') a.obj.rotation.z = Math.sin(t * 1.3) * 0.12;   // v7.1 鐘楼の鐘
    for (const a of this.animated) {   // v7.1 風車の羽根・池のアヒル
      if (a.kind === 'spin') a.obj.rotation.z = -t * (a.speed || 0.6);
      else if (a.kind === 'duck') { const ang = t * 0.25 + a.ph; a.obj.position.x = a.cx + Math.cos(ang) * a.r; a.obj.position.z = a.cz + Math.sin(ang) * a.r; a.obj.position.y = -0.14 + Math.sin(t * 2 + a.ph) * 0.015; a.obj.rotation.y = -ang; }
    }
    for (const a of this.animated) if (a.kind === 'flame') { const k = 0.85 + Math.sin(t * 13 + a.obj.id) * 0.08 + Math.sin(t * 23.7) * 0.06; a.obj.scale.set(1 * k, (a.obj.geometry.type === 'ConeGeometry' ? 1 : 1.8) * (2 - k), 1 * k); }
    if (this.motes) { this.motes.uniforms.uTime.value = t; this.motes.uniforms.uNight.value = this.app.lighting.night; this.motes.uniforms.uScale.value = this.app.renderer.pixelRatio * (this.app.renderer.size.h / 600); }
    if (this.terrain) { this.terrain.update(t, this.app.lighting.night < 0.5 ? 1 : 0); this.terrain.updateLod(player); }
    if (this.world) { this.world.update(t); this.world.updateLod(player); }
    this.updateBossSymbols(t);
    this.updateQuizSymbols(t);
    this.updateWarpMarks(t, player);
    this.updateSeaTreasure(t);
  }
  // v7.0 海の底の拾い物（js/rpg/seatreasure.js）：水の下の光・水面のきらめき・上る泡。拾ったら消える（船で近くを通ると 2D 側が拾う）
  updateSeaTreasure(t) {
    const ST = window.SeaTreasure; if (!ST || !ST.LIST || !this.map || this.map.kind !== 'field') return;
    if (!this.seaObjs) {
      this.seaObjs = [];
      const glowTex = MapScene3D.seaTex || (MapScene3D.seaTex = softTexture('rgba(255,255,255,1)', 64));
      for (const tr of ST.LIST.filter((x) => x.map === this.map.id)) {
        const g = new THREE.Group(); g.name = 'sea_treasure_' + tr.id; g.position.set(tr.x + 0.5, 0, tr.y + 0.5);
        const deep = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x8fe8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
        deep.geometry.userData.own = true; deep.rotation.x = -Math.PI / 2; deep.position.y = -0.3; deep.renderOrder = 3; g.add(deep);
        const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); spark.position.y = -0.05; spark.renderOrder = 7; g.add(spark);
        const bubbles = []; for (let i = 0; i < 4; i++) { const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xd8f8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); b.scale.setScalar(0.12); b.renderOrder = 7; g.add(b); bubbles.push(b); }
        this.root.add(g); this.seaObjs.push({ tr, g, deep, spark, bubbles, ph: (tr.x * 3 + tr.y) % 6 });
      }
    }
    for (const o of this.seaObjs) {
      const show = !ST.taken(o.tr); o.g.visible = show; if (!show) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 2.6 + o.ph); o.deep.material.opacity = 0.45 + 0.35 * k; const sc = 0.35 + 0.45 * k; o.spark.scale.set(sc, sc, 1); o.spark.material.opacity = 0.5 + 0.5 * k;
      o.bubbles.forEach((b, i) => { const q = (t * 0.5 + i / 4 + o.ph * 0.1) % 1; b.position.set(Math.sin(i * 2.1 + t) * 0.25, -0.3 + q * 0.42, Math.cos(i * 1.7 + t) * 0.25); b.material.opacity = 0.8 * Math.sin(q * Math.PI); });
    }
  }
  seaTreasureInfo() { return (this.seaObjs || []).map((o) => ({ id: o.tr.id, visible: o.g.visible, x: o.g.position.x, z: o.g.position.z })); }
  // v7.0 階段（下り・上り）とダンジョンの出入口の目印：2D版と同じ WarpMark.list()（js/rpg/warpmark.js）を写す
  //   色つきの床の光・光の柱（壁より高く、離れていても見える）・上下に動く矢印（下り＝下向き・上り＝上向き）・近くでは文字（壁に隠れない）
  //   閉ざされた出入口は灰色で柱なし。隠し部屋はフラグが立つまで出さない（0.5秒ごとに一覧を作り直し、変わったときだけ作り直す）
  updateWarpMarks(t, player) {
    const WM = window.WarpMark; if (!WM || !WM.list) return;
    if (!this.warpMarks || t - (this._wmAt || 0) > 0.5 || t < (this._wmAt || 0)) {
      this._wmAt = t; let L = []; try { L = WM.list(this.map) || []; } catch (e) { L = []; }
      const key = WM.key(L);
      if (!this.warpMarks || key !== this.warpMarkKey) { this.clearWarpMarks(); this.warpMarkKey = key; this.warpMarks = L.map((o, i) => this.makeWarpMark(o, i)); }
    }
    for (const m of this.warpMarks) {
      const ph = Math.sin(t * 2.4 + m.ph);
      m.arrow.position.y = m.ay + ph * 0.09; m.arrow.rotation.y = t * 1.6;
      m.disc.material.opacity = (m.o.locked ? 0.35 : 0.7) + 0.2 * ph;
      if (m.beam) m.beam.material.opacity = 0.32 + 0.1 * ph;
      if (m.label) { const d = player ? Math.hypot(player.x - m.g.position.x, player.z - m.g.position.z) : 0; const a = Math.max(0, Math.min(1, (10 - d) / 2.5)); m.label.material.opacity = a; m.label.visible = a > 0.01; }
    }
  }
  makeWarpMark(o, i) {
    const tex = MapScene3D.warpTex || (MapScene3D.warpTex = { glow: softTexture('rgba(255,255,255,1)', 64), beam: (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; })() });
    const col = new THREE.Color(o.color); const xs = o.tiles.map((p) => p[0]), zs = o.tiles.map((p) => p[1]);
    const sx = Math.max(...xs) - Math.min(...xs) + 1, sz = Math.max(...zs) - Math.min(...zs) + 1;
    const g = new THREE.Group(); g.name = 'warp_mark_' + o.kind + (o.stairs ? '_stairs' : '');
    const x = o.x + 0.5, z = o.y + 0.5; g.position.set(x, this.heightAt ? (this.heightAt(x, z) || 0) : 0, z);
    const own = (geo) => { geo.userData.own = true; return geo; };
    const disc = new THREE.Mesh(own(new THREE.PlaneGeometry(sx + 0.6, sz + 0.6)), new THREE.MeshBasicMaterial({ map: tex.glow, color: col, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.06; disc.renderOrder = 4; g.add(disc);
    let beam = null; const bh = this.dark ? 3.8 : 3.0;
    if (!o.locked) {
      const r = 0.3 + 0.18 * Math.max(sx, sz);
      beam = new THREE.Mesh(own(new THREE.CylinderGeometry(r * 0.8, r, bh, 24, 1, true)), new THREE.MeshBasicMaterial({ map: tex.beam, color: col, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = bh / 2; beam.renderOrder = 6; g.add(beam);
    }
    const arrow = new THREE.Group(); const cone = new THREE.Mesh(own(new THREE.ConeGeometry(0.22, 0.4, 4)), new THREE.MeshBasicMaterial({ color: col })); const stem = new THREE.Mesh(own(new THREE.BoxGeometry(0.1, 0.26, 0.1)), cone.material);
    if (o.kind === 'up') { cone.position.y = 0.13; stem.position.y = -0.18; } else { cone.rotation.x = Math.PI; cone.position.y = -0.13; stem.position.y = 0.18; }
    arrow.add(cone); arrow.add(stem); const ay = 1.7; arrow.position.y = ay; g.add(arrow);
    // 文字（近くにいるときだけ。壁に隠れない）
    const c = document.createElement('canvas'); const fs = 44; const cx = c.getContext('2d'); let label = null, ltex = null;
    if (cx) {
      cx.font = 'bold ' + fs + 'px sans-serif'; const w = Math.ceil(cx.measureText(o.label).width) + 28; c.width = w; c.height = fs + 22;
      cx.font = 'bold ' + fs + 'px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = 'rgba(8,10,20,0.62)'; const rr = 14; cx.beginPath(); cx.moveTo(rr, 0); cx.arcTo(w, 0, w, c.height, rr); cx.arcTo(w, c.height, 0, c.height, rr); cx.arcTo(0, c.height, 0, 0, rr); cx.arcTo(0, 0, w, 0, rr); cx.closePath(); cx.fill();
      cx.strokeStyle = o.color; cx.lineWidth = 4; cx.stroke();
      cx.lineWidth = 6; cx.strokeStyle = 'rgba(0,0,0,0.85)'; cx.strokeText(o.label, w / 2, c.height / 2 + 2); cx.fillStyle = '#ffffff'; cx.fillText(o.label, w / 2, c.height / 2 + 2);
      ltex = new THREE.CanvasTexture(c); ltex.colorSpace = THREE.SRGBColorSpace;
      label = new THREE.Sprite(new THREE.SpriteMaterial({ map: ltex, transparent: true, depthTest: false, depthWrite: false })); const lh = 0.42; label.scale.set(lh * c.width / c.height, lh, 1); label.position.y = 2.25; label.renderOrder = 30; g.add(label);
    }
    this.root.add(g);
    return { o, g, disc, beam, arrow, label, ltex, ay, ph: (i * 1.7) % 6.2 };
  }
  clearWarpMarks() {
    if (!this.warpMarks) return;
    for (const m of this.warpMarks) {
      m.g.traverse((x) => { if (x.geometry && x.geometry.userData && x.geometry.userData.own) x.geometry.dispose(); if (x.material && x.material.dispose) x.material.dispose(); });
      if (m.ltex) m.ltex.dispose(); if (m.g.parent) m.g.parent.remove(m.g);
    }
    this.warpMarks = null;
  }
  warpMarkInfo() { return (this.warpMarks || []).map((m) => ({ kind: m.o.kind, stairs: m.o.stairs, locked: m.o.locked, label: m.o.label, x: +m.g.position.x.toFixed(2), z: +m.g.position.z.toFixed(2), beam: !!m.beam, labelVisible: !!(m.label && m.label.visible) })); }
  // v6.5 Phase D ボスのシンボル（3D）：2D版と同じ BossSymbol.list() を毎フレーム写す（倒したら消える・条件まで出ない）
  // 姿は2D版と同じボスの絵を立て札（ビルボード）にして、待機の動き（呼吸・上下）・足もとの光の輪・ボスの色の光をつける。専用の3Dモデルはまだない
  updateBossSymbols(t) {
    const BS = window.BossSymbol; if (!BS || !BS.list) return; let L = [];
    try { L = BS.list(this.map) || []; } catch (e) { return; }
    if (!this.bossSyms) this.bossSyms = new Map(); const seen = new Set();
    for (const s of L) {
      if (s.kind === 'npc') continue; const key = s.enemy + '@' + s.x + ',' + s.y; seen.add(key); let o = this.bossSyms.get(key);
      if (!o) {
        const v = BS.visual(s.enemy); if (!v || !v.img) continue;
        const ok = v.img instanceof HTMLCanvasElement || (v.img.complete && v.img.naturalWidth > 0); if (!ok) continue;   // 読み込み中：次のフレームでもう一度
        // 別のサイト扱いの画像（iPhone の Safari のテストプレイで発生）は WebGL に渡すと例外になり、マップ全体が2Dに戻っていた → 読めるように読み直す。読めなければ光の輪だけ
        const rd = readable(v.img); if (rd.state === 'loading') continue; let src = rd.state === 'ok' ? rd.img : null;
        // v6.7 新しいボスの絵（BossArt のキャンバス）が読めないとき：CORS つきで読み直した同じ絵を使う（読み直し中は次のフレームでもう一度。だめなら光の輪だけ）
        if (!src && window.BossArt && window.BossArt.cleanVisual && window.BossArt.isBossId && window.BossArt.isBossId(s.enemy)) {
          const cj = this.bossClean || (this.bossClean = new Map()); let st = cj.get(s.enemy);
          if (!st) { st = { done: false, v: null }; cj.set(s.enemy, st); window.BossArt.cleanVisual(s.enemy).then((cv) => { st.v = cv && cv.img && readable(cv.img).state === 'ok' ? cv : null; st.done = true; }, () => { st.done = true; }); }
          if (!st.done) continue;
          if (st.v) src = st.v.img;
        }
        let sp = null, vol = null; const H = 2.4, Wd = Math.min(3.4, H * v.w / Math.max(1, v.h));
        // Phase 2：戦闘と同じく、ボスの絵から厚みのある立体（2.5D）にする（元のデザインのまま）。作れないときは従来の立て札
        if (src) { try { vol = buildArtVolume(src, { height: Wd * v.h / Math.max(1, v.w), aspect: v.w / Math.max(1, v.h), smooth: v.smooth !== false, depth: 0.14, grid: 44 }); sp = vol.mesh; } catch (e) { vol = null; } }
        if (!sp && src) { const tex = new THREE.CanvasTexture(src); tex.colorSpace = THREE.SRGBColorSpace; if (!v.smooth) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; } sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.05 })); sp.scale.set(Wd, Wd * v.h / Math.max(1, v.w), 1); sp.center.set(0.5, 0); }
        if (!sp) { sp = new THREE.Object3D(); }   // 絵なし（光の輪と光だけ）
        const col = new THREE.Color('rgb(' + ((BS.auraColor && BS.auraColor(s.enemy)) || '255,60,80') + ')');
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
        const light = new THREE.PointLight(col, 2.5, 5, 1.6); light.position.y = 1.2;
        const g = new THREE.Group(); g.name = 'boss_symbol_' + s.enemy; g.add(sp); g.add(ring); g.add(light); this.root.add(g);
        o = { g, sp, vol, ring, light, base: sp.scale.clone(), ph: (s.x * 7 + s.y * 3) % 6, enemy: s.enemy }; this.bossSyms.set(key, o);
      }
      const x = s.x + 0.5, z = s.y + 0.5; o.g.position.set(x, this.heightAt ? (this.heightAt(x, z) || 0) : 0, z); o.g.visible = true;
      const ph = Math.sin(t * 2.2 + o.ph), ph2 = Math.sin(t * 3.1 + o.ph);
      o.sp.scale.set(o.base.x, o.base.y * (1 + ph2 * 0.025), o.base.z); o.sp.position.y = ph * 0.04; if (o.vol) o.vol.uniforms.uTime.value = t;
      o.ring.scale.setScalar(1 + ph * 0.08); o.ring.material.opacity = 0.45 + 0.2 * ph; o.light.intensity = 2 + ph;
    }
    this.bossSyms.forEach((o, k) => { if (!seen.has(k)) o.g.visible = false; });
  }
  // v6.7 トレードクイズモンスターのシンボル（3D）：2D版と同じ QuizSymbol.list() を毎フレーム写す（倒したら消える・逃げたら入り直すまで消える）
  // 姿は2D版と同じドット絵（QuizMonArt。その場で描く絵なので、別のサイト扱いにならない）を立て札にして、待機の動き（4こま）・足もとの光の輪・立ちのぼる「？」をつける
  updateQuizSymbols(t) {
    const QS = window.QuizSymbol, ART = window.QuizMonArt; if (!QS || !QS.list || !ART) return; let L = [];
    try { L = QS.list(this.map) || []; } catch (e) { return; }
    if (!this.quizSyms) this.quizSyms = new Map(); const seen = new Set();
    for (const s of L) {
      const key = s.mon.id + '@' + s.x + ',' + s.y; seen.add(key); let o = this.quizSyms.get(key);
      if (!o) {
        const texs = []; for (let f = 0; f < 4; f++) { const c = ART.image(s.mon.id, 2, f); if (!c) break; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter; texs.push(tx); }
        if (!texs.length) continue;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texs[0], transparent: true, alphaTest: 0.05 })); sp.scale.set(1.9, 1.9, 1); sp.center.set(0.5, 0.06);
        const col = new THREE.Color('rgb(' + (s.mon.aura || '255,255,255') + ')');
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.78, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
        const qc = document.createElement('canvas'); qc.width = 32; qc.height = 32; const qx = qc.getContext('2d'); if (qx) { qx.font = 'bold 26px sans-serif'; qx.textAlign = 'center'; qx.textBaseline = 'middle'; qx.fillStyle = '#ffffff'; qx.fillText('？', 16, 17); }
        const qtex = new THREE.CanvasTexture(qc); const qs = []; for (let i = 0; i < 3; i++) { const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: qtex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); q.scale.set(0.34, 0.34, 1); qs.push(q); }
        const g = new THREE.Group(); g.name = 'quiz_symbol_' + s.mon.id; g.add(sp); g.add(ring); qs.forEach((q) => g.add(q)); this.root.add(g);
        o = { g, sp, ring, qs, texs, qtex, f: -1, ph: (s.x * 5 + s.y * 3) % 7 }; this.quizSyms.set(key, o);
      }
      const x = s.x + 0.5, z = s.y + 0.5; o.g.position.set(x, this.heightAt ? (this.heightAt(x, z) || 0) : 0, z); o.g.visible = true;
      const f = Math.floor(t * 2.5) % o.texs.length; if (f !== o.f) { o.f = f; o.sp.material.map = o.texs[f]; o.sp.material.needsUpdate = true; }
      const ph = Math.sin(t * 2.2 + o.ph); o.sp.position.y = ph * 0.04; o.ring.scale.setScalar(1 + ph * 0.08); o.ring.material.opacity = 0.4 + 0.18 * ph;
      o.qs.forEach((q, i) => { const k = (t * 0.45 + i / 3) % 1; q.position.set(Math.sin(i * 2.3 + t) * 0.5, 0.4 + k * 1.9, 0); q.material.opacity = 0.85 * (1 - k); });
    }
    this.quizSyms.forEach((o, k) => { if (!seen.has(k)) o.g.visible = false; });
  }
  quizSymbolInfo() { const out = []; if (this.quizSyms) this.quizSyms.forEach((o, k) => out.push({ key: k, visible: o.g.visible, x: +o.g.position.x.toFixed(2), z: +o.g.position.z.toFixed(2) })); return out; }
  bossSymbolInfo() { const out = []; if (this.bossSyms) this.bossSyms.forEach((o, k) => out.push({ key: k, visible: o.g.visible, vol: !!o.vol, x: +o.g.position.x.toFixed(2), z: +o.g.position.z.toFixed(2) })); return out; }

  // 使わなくなった場面の解放（共有のモデル形状・マテリアルは残す）
  dispose() {
    this.clearWarpMarks();   // v7.0 出入口の目印（文字の絵・形）
    if (this.quizSyms) this.quizSyms.forEach((o) => { o.texs.forEach((tx) => tx.dispose()); o.qtex.dispose(); o.ring.geometry.dispose(); o.ring.material.dispose(); });
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
    if (window.BossSymbol && window.BossSymbol.blocks && window.BossSymbol.blocks(m, x, y)) return true;   // ボスのシンボル（2D版の passable と同じ）
    if (window.QuizSymbol && window.QuizSymbol.blocks && window.QuizSymbol.blocks(m, x, y)) return true;   // クイズモンスターのシンボル
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
