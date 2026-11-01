/* =========================================================
   ModelManager：GLB の読み込み・キャッシュ・複製（スキンつきは SkeletonUtils）・インスタンス化
   ・読み込んだモデルは Flatten で「つや消し／金属／発光」の最大3つにまとめてから使う（描画回数の削減）
   ========================================================= */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MODELS } from '../assets/manifest.js';
import { flattenStatic, flattenCharacter } from './Flatten.js';

export class ModelManager {
  constructor(base) {
    this.base = base || './'; this.loader = new GLTFLoader(); this.cache = new Map(); this.parts = new Map(); this.templates = new Map(); this.failed = [];
  }
  async load(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const def = MODELS[id]; if (!def) throw new Error('model not in manifest: ' + id);
    const p = this.loader.loadAsync(this.base + def.modelPath).then((gltf) => {
      gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return gltf;
    }).catch((e) => { console.warn('model load failed', id, e); this.failed.push(id); return null; });
    this.cache.set(id, p); return p;
  }
  async preload(ids, onProgress) { let n = 0; await Promise.all(ids.map((id) => this.load(id).then((r) => { n++; if (onProgress) onProgress(n, ids.length); return r; }))); }
  // スキンつきキャラクターの複製（アニメーションは共有）
  async character(id) {
    const g = await this.load(id); if (!g) return null;
    if (!this.templates.has(id)) this.templates.set(id, flattenCharacter(g.scene));
    const root = SkeletonUtils.clone(this.templates.get(id));
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    return { root, animations: g.animations };
  }
  // モンスターの型（mon_*）：マテリアル tint_body・tint_accent を敵の色に置き換えてから結合する（色ごとに雛形を1つ作って使い回す）
  async creature(id, color, accent) {
    const g = await this.load(id); if (!g) return null;
    const key = id + '|' + (color || '') + '|' + (accent || '');
    if (!this.templates.has(key)) {
      const base = SkeletonUtils.clone(g.scene); const c0 = new THREE.Color(color || '#9a9a9a');
      const c1 = accent ? new THREE.Color(accent) : c0.clone().lerp(new THREE.Color(1, 1, 1), 0.45);
      base.traverse((o) => {
        if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
        const nm = ms.map((m) => { if (/^tint_body/.test(m.name)) { const x = m.clone(); x.color.copy(c0); return x; } if (/^tint_accent/.test(m.name)) { const x = m.clone(); x.color.copy(c1); return x; } return m; });
        o.material = Array.isArray(o.material) ? nm : nm[0];
      });
      this.templates.set(key, flattenCharacter(base));
    }
    const root = SkeletonUtils.clone(this.templates.get(key));
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    return { root, animations: g.animations };
  }
  // 静的モデルの複製（確認用ページなど）
  async clone(id) { const parts = await this.partsOf(id); const g = new THREE.Group(); g.name = id; parts.forEach((p) => { const m = new THREE.Mesh(p.geometry, p.material); m.castShadow = true; m.receiveShadow = true; g.add(m); }); return g; }
  // まとめた部品：[{ geometry, material }]（モデル原点基準）
  async partsOf(id) {
    if (this.parts.has(id)) return this.parts.get(id);
    const g = await this.load(id); if (!g) return [];
    const out = flattenStatic(g.scene);
    this.parts.set(id, out); return out;
  }
  // 同じモデルを多数置く：transforms は THREE.Matrix4 の配列
  async instanced(id, transforms, opts) {
    opts = opts || {};
    const parts = await this.partsOf(id); const group = new THREE.Group(); group.name = 'inst_' + id;
    if (!transforms.length) return group;
    for (const p of parts) {
      const mesh = new THREE.InstancedMesh(p.geometry, p.material, transforms.length);
      transforms.forEach((t, i) => mesh.setMatrixAt(i, t));
      if (opts.colors) { opts.colors.forEach((c, i) => mesh.setColorAt(i, c)); }
      mesh.castShadow = opts.castShadow !== false; mesh.receiveShadow = opts.receiveShadow !== false;
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }
}
