/* =========================================================
   ArtVolume（Phase 2）：2D版の敵の絵（そのままの画像）から、厚みのある立体（2.5D）を作る
   ・絵の不透明な部分（輪郭）から「内側ほど厚い」ふくらみを計算し、表（絵）と裏（絵の裏返し）の面で閉じた形にする
     → 正面から見たデザインは元の絵と同じ。斜めから見ると厚みがあり、光と影（地面に落ちる影）がつく
   ・輪郭は画像の透明度で切る（alphaTest）。形は自動生成なので、真横から見ると「厚みのある板」に見える（仮3D）
   ・動き（シェーダー）：揺れ（上ほど大きく）・被弾の白い光・呪文の光・撃破／登場の溶けるような消え方
   ========================================================= */
import * as THREE from 'three';

const NOISE = (() => {   // 消え方のための小さなノイズ（64×64）
  const N = 64, d = new Uint8Array(N * N * 4); let s = 1234567;
  for (let i = 0; i < N * N; i++) { s = (s * 1103515245 + 12345) >>> 0; const v = (s >>> 16) & 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
})();

function imageSize(img) { return { w: img.naturalWidth || img.videoWidth || img.width || 1, h: img.naturalHeight || img.videoHeight || img.height || 1 }; }

// img：HTMLImageElement か canvas。opts：{ height（ワールド単位の高さ）, aspect（幅/高さ。省略時は画像の比）, smooth（なめらかに拡大）, depth（厚みの割合） }
export function buildArtVolume(img, opts) {
  opts = opts || {}; const sz = imageSize(img); const aspect = opts.aspect || sz.w / sz.h;
  const H = opts.height || 2, W = H * aspect; const DEPTH = W * (opts.depth || 0.16);
  // ---- 輪郭の格子（横 GW マス）
  const GW = Math.max(16, Math.min(72, opts.grid || 60)), GH = Math.max(16, Math.min(96, Math.round(GW / aspect)));
  const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH; const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.clearRect(0, 0, GW, GH); cx.drawImage(img, 0, 0, GW, GH); const px = cx.getImageData(0, 0, GW, GH).data;
  const inside = new Uint8Array(GW * GH); for (let i = 0; i < GW * GH; i++) inside[i] = px[i * 4 + 3] > 40 ? 1 : 0;
  // ---- 外までの距離（2回の走査の近似）→ ふくらみ
  const INF = 1e9, dist = new Float32Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) dist[i] = inside[i] ? INF : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH) ? 0 : dist[y * GW + x];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = y * GW + x; if (!inside[i]) continue; dist[i] = Math.min(dist[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414); }
  for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) { const i = y * GW + x; if (!inside[i]) continue; dist[i] = Math.min(dist[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414); }
  let maxD = 1; for (let i = 0; i < GW * GH; i++) if (dist[i] > maxD) maxD = dist[i];
  const cap = Math.max(3, maxD * 0.6);   // 太い部分は平らに（全体が丸くなりすぎない）
  const cell = new Float32Array(GW * GH); for (let i = 0; i < GW * GH; i++) { const t = Math.min(1, dist[i] / cap); cell[i] = inside[i] ? Math.sqrt(t * (2 - t)) : 0; }
  // ---- 頂点の厚み（周りのマスの平均）と、使うマス（輪郭のまわりも少し含める）
  const VW = GW + 1, VH = GH + 1; const vz = new Float32Array(VW * VH);
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) { let s = 0, n = 0; for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) { n++; continue; } s += cell[yy * GW + xx]; n++; } vz[y * VW + x] = s / n; }
  const use = new Uint8Array(GW * GH); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let any = 0; for (let dy = -1; dy <= 1 && !any; dy++) for (let dx = -1; dx <= 1 && !any; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < GW && yy < GH && inside[yy * GW + xx]) any = 1; } use[y * GW + x] = any; }
  // ---- 表と裏の面
  const pos = [], uv = [], idx = []; const vid = new Int32Array(VW * VH * 2).fill(-1);
  const vert = (x, y, back) => { const k = (y * VW + x) * 2 + (back ? 1 : 0); if (vid[k] >= 0) return vid[k]; const u = x / GW, v = y / GH; const z = vz[y * VW + x] * DEPTH * (back ? -0.55 : 1);
    vid[k] = pos.length / 3; pos.push((u - 0.5) * W, (1 - v) * H, z); uv.push(back ? u : u, 1 - v); return vid[k]; };
  let cells = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (!use[y * GW + x]) continue; cells++;
    const a = vert(x, y, false), b = vert(x + 1, y, false), c = vert(x, y + 1, false), d = vert(x + 1, y + 1, false);
    idx.push(a, c, b, b, c, d);
    const a2 = vert(x, y, true), b2 = vert(x + 1, y, true), c2 = vert(x, y + 1, true), d2 = vert(x + 1, y + 1, true);
    idx.push(a2, b2, c2, b2, d2, c2);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere(); geo.userData.own = true;
  // ---- 絵のテクスチャとマテリアル
  const tex = img instanceof HTMLCanvasElement ? new THREE.CanvasTexture(img) : new THREE.Texture(img); tex.needsUpdate = true; tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.smooth === false) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; } else tex.anisotropy = 4;
  const U = { uFlash: { value: 0 }, uGlow: { value: new THREE.Color(0, 0, 0) }, uDissolve: { value: 0 }, uEdge: { value: new THREE.Color(1.0, 0.75, 0.35) }, uTime: { value: 0 }, uSway: { value: 0.025 }, uH: { value: H }, uSelf: { value: 0.42 }, uNoise: { value: NOISE } };
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, roughness: 0.82, metalness: 0, color: new THREE.Color(0.78, 0.78, 0.78) });
  mat.toneMapped = false;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uSway, uH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat hk = clamp(position.y / uH, 0.0, 1.0); transformed.x += sin(uTime * 1.7 + position.y * 1.3) * uSway * uH * hk * hk; transformed.z += cos(uTime * 1.3 + position.y) * uSway * 0.5 * uH * hk * hk;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFlash, uDissolve, uSelf; uniform vec3 uGlow, uEdge; uniform sampler2D uNoise;')
      .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nfloat nz = texture2D(uNoise, vMapUv * 3.0).r * 0.7 + texture2D(uNoise, vMapUv * 9.0).r * 0.3; if (uDissolve > 0.0 && nz < uDissolve) discard; float edge = uDissolve > 0.0 ? smoothstep(uDissolve + 0.08, uDissolve, nz) : 0.0;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uSelf + uGlow + vec3(uFlash) + uEdge * edge * 2.0;');
  };
  mat.customProgramCacheKey = () => 'art-volume-v1';
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.45 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = false; mesh.customDepthMaterial = depthMat;
  return { mesh, mat, uniforms: U, tex, size: { w: W, h: H, depth: DEPTH }, stats: { grid: GW + 'x' + GH, cells, tris: idx.length / 3 },
    dispose() { geo.dispose(); mat.dispose(); depthMat.dispose(); tex.dispose(); } };
}
