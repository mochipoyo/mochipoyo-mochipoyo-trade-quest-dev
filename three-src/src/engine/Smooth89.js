/* =========================================================
   Smooth89（v8.9）：軽量（スマホ）の「なめらかさ優先」— 重いときだけ、3D の画面の解像度（pixelRatio）を少しずつ下げる
   ・コマの間隔（requestAnimationFrame の間隔）を 90 コマずつ見て、真ん中の値（中央値）が 21ms より長い（＝1 秒に 48 コマより少ない）ときに 0.15 下げる
   ・下げたあと次の 90 コマで 1 割以上速くならなければ（GPU 以外が重い・端末の省電力で 30 コマに固定されている など）、元へ戻し、
     その地図では下げない（解像度が上下に揺れ続けないように）
   ・十分に速い（中央値 17.6ms 未満）が 3 回続いたら 0.15 ずつ戻す。ただし、その地図で下げて効いたときは、その地図にいる間は戻さない（上下に揺れないように）
   ・地図が変わったら（reset）、もう一度確かめ直す（下げた値はそのまま。速ければ戻る）
   ・組み立て中・画面が隠れていた・長い止まり（250ms 超）のコマは数えない
   ・ここは計算だけ（画面には触らない）。GameBridge が戻り値の pixelRatio を Renderer3D に渡す
   ========================================================= */
export const SMOOTH89 = { N: 90, SLOW: 21, FAST: 17.6, STEP: 0.15, GAIN: 0.9, UPS: 3, SETTLE: 20 };

export class Smooth89 {
  constructor(base, floor) {
    this.base = base; this.floor = Math.min(base, floor); this.pr = base; this.iv = []; this.trial = null; this.cool = 0; this.fastN = 0;
    this.cap = base; this.noLower = false; this.log = [];
  }
  note(t) { this.log.push(t); if (this.log.length > 20) this.log.shift(); }
  // 地図が変わったとき：もう一度確かめ直す
  reset() { this.iv.length = 0; this.trial = null; this.cool = SMOOTH89.SETTLE; this.fastN = 0; this.cap = this.base; this.noLower = false; }
  // 1 コマごとに呼ぶ。ms：前のコマからの時間。戻り値：新しい pixelRatio（変えないときは null）
  feed(ms) {
    const C = SMOOTH89;
    if (!(ms > 0) || ms > 250) { this.iv.length = 0; return null; }
    if (this.cool > 0) { this.cool--; return null; }
    this.iv.push(ms); if (this.iv.length < C.N) return null;
    const s = this.iv.slice().sort((a, b) => a - b); const med = s[s.length >> 1]; this.iv.length = 0;
    if (this.trial) {   // 下げたあと：効いたか
      const t = this.trial; this.trial = null;
      if (med < t.before * C.GAIN) { this.cap = Math.min(this.cap, this.pr); this.note('keep ' + this.pr + '（' + t.before.toFixed(1) + '→' + med.toFixed(1) + 'ms）'); return null; }
      this.pr = t.from; this.noLower = true; this.cool = C.SETTLE; this.note('back ' + this.pr + '（効かない ' + t.before.toFixed(1) + '→' + med.toFixed(1) + 'ms）'); return this.pr;
    }
    if (med > C.SLOW && !this.noLower && this.pr > this.floor + 1e-3) {
      const from = this.pr; this.pr = Math.max(this.floor, Math.round((this.pr - C.STEP) * 100) / 100); this.trial = { from, before: med }; this.cool = C.SETTLE; this.fastN = 0;
      this.note('down ' + from + '→' + this.pr + '（' + med.toFixed(1) + 'ms）'); return this.pr;
    }
    if (med < C.FAST && this.pr < Math.min(this.base, this.cap) - 1e-3) {
      if (++this.fastN >= C.UPS) { this.fastN = 0; const from = this.pr; this.pr = Math.min(this.base, this.cap, Math.round((this.pr + C.STEP) * 100) / 100); this.cool = C.SETTLE; this.note('up ' + from + '→' + this.pr + '（' + med.toFixed(1) + 'ms）'); return this.pr; }
    } else this.fastN = 0;
    return null;
  }
}
export function smoothSetting() { try { return localStorage.getItem('mtq3d-smooth') === 'off' ? 'off' : 'auto'; } catch (e) { return 'auto'; } }
export function setSmoothSetting(v) { try { localStorage.setItem('mtq3d-smooth', v === 'off' ? 'off' : 'auto'); } catch (e) { /* 保存できなくても、このページの間は切り替わる */ } }
