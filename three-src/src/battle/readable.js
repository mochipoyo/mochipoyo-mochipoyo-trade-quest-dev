/* =========================================================
   readable：2D版の画像を3D（WebGL）で使えるか確かめ、使えないときは読み直す
   ・iPhone の Safari（テストプレイの githack）で、2D版の画像から絵を読み取ると「The operation is insecure.」になった
     （画像が別のサイト扱いになり、キャンバスが「汚れる」と、ピクセルの読み取りも WebGL のテクスチャも禁止される）
   ・そのときは同じ URL を CORS（crossOrigin = 'anonymous'）で読み直す。読めるようになるまでは null（呼び出し側が次のフレームでもう一度）
   ・2D版の画像そのもの（Assets・EnemyArt・BossArt）は変えない
   ========================================================= */
const cache = new Map();
// 汚れていない（ピクセルを読める）か：1×1 に描いて読んでみる
export function isClean(src) {
  try { const c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d'); g.drawImage(src, 0, 0, 1, 1); g.getImageData(0, 0, 1, 1); return true; } catch (e) { return false; }
}
// { img, state }：state は 'ok'（img が使える）／'loading'（CORS で読み直し中）／'tainted'（読めない）／'error'（読み込み失敗）
export function readable(src) {
  if (!src) return { img: null, state: 'error' };
  if (isClean(src)) return { img: src, state: 'ok' };
  const url = (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) ? (src.currentSrc || src.src) : null;
  if (!url) return { img: null, state: 'tainted' };   // キャンバス（2D版が描いたもの）が汚れているときは直せない
  let e = cache.get(url);
  if (!e) {
    const im = new Image(); im.crossOrigin = 'anonymous'; e = { im, state: 'loading' }; cache.set(url, e);
    im.onload = () => { e.state = isClean(im) ? 'ok' : 'tainted'; }; im.onerror = () => { e.state = 'error'; };
    im.src = url;
  }
  return e.state === 'ok' ? { img: e.im, state: 'ok' } : { img: null, state: e.state };
}
export function readableStats() { const s = { ok: 0, loading: 0, tainted: 0, error: 0 }; for (const e of cache.values()) s[e.state]++; return s; }
