/* =========================================================
   Cutout：主人公の手前（カメラ側）にある建物・木・小物を、主人公のまわりだけ網目状に抜いて見通しを確保する
   ・建物の裏や木の陰に入っても、主人公と足元が見える（影はそのまま残る）
   ・画面上の円（中心＝主人公、半径はズームに合わせる）の中で、主人公より手前にある面だけを抜く
   ========================================================= */
export const CUT = {
  uCutCenter: { value: [0, 0] },   // 画面上の主人公の位置（描画バッファのピクセル）
  uCutRadius: { value: 0 },        // 半径（ピクセル）。0 で無効
  uCutDepth: { value: 0 }          // この距離より手前（カメラに近い）面だけ抜く
};

export function addCutout(mat) {
  if (!mat || mat.userData.cutout) return mat;
  mat.userData.cutout = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    sh.uniforms.uCutCenter = CUT.uCutCenter; sh.uniforms.uCutRadius = CUT.uCutRadius; sh.uniforms.uCutDepth = CUT.uCutDepth;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uCutCenter; uniform float uCutRadius; uniform float uCutDepth;\nfloat cutBayer(vec2 p){ vec2 q = mod(floor(p), 4.0); int i = int(q.x) + int(q.y) * 4; float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (m[i] + 0.5) / 16.0; }')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (uCutRadius > 0.0 && vViewPosition.z < uCutDepth) { float cd = length(gl_FragCoord.xy - uCutCenter) / uCutRadius; if (cd < 1.0) { float keep = smoothstep(0.55, 1.0, cd); if (cutBayer(gl_FragCoord.xy) > keep) discard; } }');
  };
  const prevKey = prev ? prev.toString() : '';
  mat.customProgramCacheKey = function () { return 'cut|' + prevKey; };
  mat.needsUpdate = true;
  return mat;
}
