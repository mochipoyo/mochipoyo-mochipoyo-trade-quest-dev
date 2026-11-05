/* =========================================================
   Renderer3D：WebGL2 レンダラー・後処理（ブルーム）・画質設定・画面サイズ追従
   画質：high（PC：影2048・ブルーム・草多め）／low（スマホ：影1024・ブルームなし・解像度控えめ）
   v7.6 高画質だけ：画面の仕上げ（Finish76.js：ジオラマ風のぼかし・色の調子・周辺減光）を OutputPass のあとに
   ========================================================= */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Finish76 } from './Finish76.js';

export function detectQuality() {
  try { const saved = localStorage.getItem('mtq3d-quality'); if (saved === 'high' || saved === 'low') return saved; } catch (e) { /* 使えないときは自動 */ }
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  return (coarse || Math.min(screen.width, screen.height) < 700) ? 'low' : 'high';
}

export class Renderer3D {
  constructor(canvas, quality) {
    this.canvas = canvas; this.quality = quality || detectQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === 'high', powerPreference: 'high-performance', alpha: false });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; r.info.autoReset = false;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 1.75 : 1.25);
    r.setPixelRatio(this.pixelRatio);
    this.composer = null; this.bloom = null; this.finish = null; this.size = { w: 640, h: 416 };
  }
  setScene(scene, camera) {
    this.scene = scene; this.camera = camera;
    if (this.quality === 'high') {
      const rt = new THREE.WebGLRenderTarget(this.size.w, this.size.h, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.addPass(new RenderPass(scene, camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(this.size.w, this.size.h), 0.55, 0.6, 0.86);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      try { this.finish = new Finish76(); this.composer.addPass(this.finish.pass); this.finish.setSize(this.size.w, this.size.h, this.pixelRatio); } catch (e) { this.finish = null; console.warn('[画面の仕上げ] 使えない', e); }
      this.composer.setPixelRatio(this.pixelRatio); this.composer.setSize(this.size.w, this.size.h);
    } else { this.composer = null; this.finish = null; }
  }
  resize(w, h) {
    w = Math.max(64, Math.round(w)); h = Math.max(64, Math.round(h));
    if (w === this.size.w && h === this.size.h) return;
    this.size = { w, h }; this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
    if (this.finish) this.finish.setSize(w, h, this.pixelRatio);
    if (this.camera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  }
  render() { if (!this.scene) return; this.renderer.info.reset(); if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); }
  setBloom(strength) { if (this.bloom) this.bloom.strength = strength; }
  setFinish(o) { if (this.finish) this.finish.update(o); }
  setFinishEnabled(on) { if (this.finish) this.finish.setEnabled(on); }
}
