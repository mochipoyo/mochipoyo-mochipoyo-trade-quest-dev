/* =========================================================
   CameraController3D：斜め上から見下ろすカメラ。プレイヤーを滑らかに追従・ズーム（ホイール／ピンチ／ボタン）
   向き（方位）は北が画面の上で固定：2D版・ミニマップと上下左右が一致する
   ========================================================= */
import * as THREE from 'three';

export const CAMERA_PRESETS = { low: { pitch: 38 }, mid: { pitch: 48 }, high: { pitch: 56 } };

export class CameraController3D {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(34, aspect || 1.5, 0.3, 900);
    this.target = new THREE.Vector3(); this.pos = new THREE.Vector3();
    this.pitch = THREE.MathUtils.degToRad(48); this.dist = 20; this.minDist = 9; this.maxDist = 36; this.wantDist = 20;
    this.yaw = 0; this.bounds = null; this.first = true;
  }
  setPitch(deg) { this.pitch = THREE.MathUtils.degToRad(deg); }
  setInterior(on) {
    if (on && !this.isInterior) { this.outDist = this.wantDist; this.wantDist = 15; }
    else if (!on && this.isInterior) { this.wantDist = this.outDist || 20; }
    this.isInterior = on; this.minDist = on ? 9 : 10; this.maxDist = on ? 20 : 36;
    this.wantDist = Math.min(this.maxDist, Math.max(this.minDist, this.wantDist)); if (on) this.setPitch(55); this.first = true;
  }
  zoom(f) { this.wantDist = THREE.MathUtils.clamp(this.wantDist * f, this.minDist, this.maxDist); }
  // v6.9 イベント用のカメラ：{ x, y, z, dist, pitch } の場所へゆっくり寄る（null で解除。ふだんの追従へゆっくり戻る）。北が上の向きは変えない
  setCine(c) { this.cine = c || null; }
  follow(p, dt, snap) {
    if (this.debug) { this.camera.position.set(this.debug.pos[0], this.debug.pos[1], this.debug.pos[2]); this.camera.lookAt(this.debug.target[0], this.debug.target[1], this.debug.target[2]); return; }
    const c = this.cine; const jump = snap || this.first;
    const k = jump ? 1 : 1 - Math.pow(c || this._cineBack ? 0.08 : 0.0015, dt);
    const want = this._want89 || (this._want89 = new THREE.Vector3()); this.target.lerp(c ? want.set(c.x, (c.y || 0) + 0.8, c.z) : want.set(p.x, p.y + 0.8, p.z), k);   // v8.9 毎コマ新しい点を作らない（スマホでのこまかな止まり＝ごみ集めを減らす）
    const z = !c && this.zone && !this.isInterior ? this.zone : null;   // v8.2 場所ごとの見え方（城郭区画）：ふだんの追従のまま、角度と距離だけゆっくり変える
    const wantD = c && c.dist ? c.dist : z ? Math.max(this.wantDist, z.dist) : this.wantDist; const wantP = c && c.pitch ? THREE.MathUtils.degToRad(c.pitch) : z ? THREE.MathUtils.degToRad(z.pitch) : this.pitch;
    if (this.pitchNow === undefined || jump) this.pitchNow = wantP; else this.pitchNow += (wantP - this.pitchNow) * (1 - Math.pow(0.05, dt));
    this._cineBack = !c && !z && Math.abs(this.pitchNow - this.pitch) > 0.01;
    this.dist += (wantD - this.dist) * (jump ? 1 : 1 - Math.pow(c ? 0.05 : z ? 0.15 : 0.002, dt));
    const off = (this._off89 || (this._off89 = new THREE.Vector3())).set(0, Math.sin(this.pitchNow) * this.dist, Math.cos(this.pitchNow) * this.dist);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target); this.first = false;
  }
}
