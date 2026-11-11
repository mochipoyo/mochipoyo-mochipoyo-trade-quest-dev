/* =========================================================
   PartyDirections（v6.8）：主人公と仲間14人の、戦闘用の4方向の絵（assets/characters/party-directions-v3/）
   ・人物ID（actor.id）で選ぶ。職業（actor.job）や見た目のID（actor.sprite）からは選ばない
     → 転職しても別人の絵にならない。旧セーブで sprite が変わっていても、本人の絵に戻る
   ・選ぶ順：同じ人物IDの職業別の絵（manifest の actors[id].jobOutfits[job]。今のパックにはない）→ 同じ人物IDの基本の絵
   ・向き：front＝顔が手前／back＝背中が手前／left＝画面の左を向く／right＝画面の右を向く（画像の上の向き。ワールドの方角ではない）
       up＝back、down＝front は別名
   ・画像：320×320 の透過PNG。足もとの基準点は pivot=[160,304]。不透明な部分（透明度 >16。manifest の opaqueBounds と同じ）だけを
     切り出し（まわりに透明を 2 ドット足す）、切り出したぶん基準点の位置を補正して返す（ArtVolume の板の位置合わせ用）
   ・大きさ：人物ごとの referencePixelHeight（4方向でいちばん高い絵の高さ）と worldHeightRatio（体格）を返す。
     使う側は「1ドット＝ 基準の高さ × worldHeightRatio ÷ referencePixelHeight」で全方向を同じ縮尺にする（主人公の元の絵が小さくても小さくならない）
   ・読み込み：画像の URL ごとに、Promise・画像・切り出したキャンバスを1回だけ作って使い回す。読み込み中（loading）と失敗（error）を分ける。
     失敗は時間をおいて読み直す（永久に失敗扱いにしない）。retry(url) で今すぐ読み直す。失敗した人物ID・URL はログと stats() に残す
   ・URL：パックの場所は「2D版の assets.js の場所（Assets.base）＋ assets/characters/party-directions-v3/」。
     3d/index.html からでも同じ（Assets.base はリポジトリの一番上）。画像の URL には ?v=（画像のハッシュの先頭）を付ける（古い画像のキャッシュ対策）
   ・セーブ・転職の処理・2D版は変えない（読むだけ）
   ========================================================= */
import { canvas as PACK_CANVAS, pivot as PACK_PIVOT, packVersion, actors as V3_ACTORS } from '../../../assets/characters/party-directions-v3/manifest.json';
import { actors as ADD68_ACTORS } from '../../../assets/characters/party-directions-add68/manifest.json';
// v6.8 追加の仲間（カズト・もちぽよ・神聖犬ポン太）のパック。パックの場所が違うので、人物ごとに dir（パックのフォルダ）を持たせる
const PACKS = [['assets/characters/party-directions-v3/', V3_ACTORS], ['assets/characters/party-directions-add68/', ADD68_ACTORS]];
const PACK_ACTORS = {}; const PACK_OF = {};
for (const [dir, list] of PACKS) for (const id of Object.keys(list)) if (!PACK_ACTORS[id]) { PACK_ACTORS[id] = list[id]; PACK_OF[id] = dir; }

const G = typeof window !== 'undefined' ? window : globalThis;
export const PACK_DIR = 'assets/characters/party-directions-v3/';
export const DIRS = Object.freeze({ front: 'front', back: 'back', left: 'left', right: 'right', down: 'front', up: 'back' });
const ALPHA_MIN = 16;   // これより薄い（透明度 16 以下）は「ないもの」とする（manifest の opaqueBounds と同じ基準）
const PAD = 2;   // 切り出した絵のまわりに足す透明（ドット）
const RETRY_MS = [2000, 4000, 8000, 15000, 30000];   // 失敗したあと、自動で読み直すまでの間隔（回数ごと）

const cache = new Map();   // url → { url, id, dir, state: 'loading'|'ok'|'error', promise, img, art, err, tries, failedAt }
const failLog = [];   // 読めなかった記録（人物ID・向き・URL・理由・時刻）

function packRoot() {
  let base = (G.Assets && G.Assets.base) || '';
  if (!base) { try { base = new URL(/\/3d\/[^/]*$/.test(location.pathname) ? '../' : './', document.baseURI).href; } catch (e) { base = ''; } }
  if (base && !/\/$/.test(base)) base += '/';
  return base + PACK_DIR;
}
function actorRoot(id) { const r = packRoot(); return PACK_OF[id] && PACK_OF[id] !== PACK_DIR ? r.slice(0, r.length - PACK_DIR.length) + PACK_OF[id] : r; }
export function hasActor(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(PACK_ACTORS, id); }
export function actorIds() { return Object.keys(PACK_ACTORS); }

// 人物と向きから、使う絵の情報を決める（読み込みはしない）。パックにない人物なら null
export function resolve(actor, direction) {
  if (!actor || !hasActor(actor.id)) return null;
  const dir = DIRS[direction]; if (!dir) throw new Error('PartyDirections: 向きの指定が正しくない ' + direction);
  const ent = PACK_ACTORS[actor.id];
  const jobs = ent.jobOutfits || null; const outfit = jobs && actor.job && Object.prototype.hasOwnProperty.call(jobs, actor.job) ? jobs[actor.job] : null;   // 同じ人物の職業別の絵（今はない）
  const rec = (outfit && outfit.directions && outfit.directions[dir]) || ent.directions[dir]; if (!rec || !rec.path) return null;
  const v = rec.sha256 ? '?v=' + String(rec.sha256).slice(0, 10) : '?v=' + packVersion;
  return { actorId: actor.id, dir, url: actorRoot(actor.id) + rec.path + v, path: rec.path, canvas: PACK_CANVAS, pivot: (outfit && outfit.pivot) || ent.pivot || PACK_PIVOT,
    refH: (outfit && outfit.referencePixelHeight) || ent.referencePixelHeight || 278, ratio: ent.worldHeightRatio || 1, source: rec.source, appearance: outfit ? 'same_actor_job_outfit' : 'same_actor_base' };
}

// 不透明な部分を切り出す。{ canvas, x0, y0, x1, y1（切り出した範囲。元の画像の座標）, offX, offY（基準点から見た、切り出した絵の下辺の中央。ドット。右・上が正） }
function cropArt(img, pivot) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;   // 読めない画像（別のサイト扱い）はここで例外 → 呼び出し側で失敗にする
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > ALPHA_MIN) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error('透明な画像');
  x1++; y1++;   // 終わりは含まない（manifest の opaqueBounds と同じ形）
  const cx0 = x0 - PAD, cy0 = y0 - PAD, cx1 = x1 + PAD, cy1 = y1 + PAD;
  const o = document.createElement('canvas'); o.width = cx1 - cx0; o.height = cy1 - cy0; const og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(img, -cx0, -cy0);
  const px = pivot ? pivot[0] : 160, py = pivot ? pivot[1] : 304;
  return { canvas: o, x0, y0, x1, y1, offX: (cx0 + cx1) / 2 - px, offY: py - cy1, w, h };
}

function startLoad(e, info) {
  e.state = 'loading'; e.tries = (e.tries || 0) + 1; e.err = null;
  e.promise = new Promise((ok) => {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async';
    img.onload = () => {
      try { e.art = cropArt(img, info.pivot); e.img = img; e.state = 'ok'; }
      catch (err) { fail(e, '画像を読み取れない（' + String((err && err.message) || err).slice(0, 60) + '）'); }
      ok(e);
    };
    img.onerror = () => { fail(e, '読み込みの失敗（404・通信・CORS など）'); ok(e); };
    img.src = e.url;
  });
  return e.promise;
}
function fail(e, why) {
  e.state = 'error'; e.err = why; e.failedAt = performance.now(); e.img = null; e.art = null;
  failLog.push({ id: e.id, dir: e.dir, url: e.url, why, tries: e.tries, at: Math.round(e.failedAt) }); if (failLog.length > 60) failLog.shift();
  try { console.warn('[味方の4方向の絵] 読めない：' + e.id + ' / ' + e.dir + ' / ' + e.url + ' / ' + why + '（' + e.tries + '回目。時間をおいて読み直す）'); } catch (err) { /* なし */ }
}

// 読み込む（すでに読み込み中・読み込み済みなら同じ Promise）。失敗していたら、間隔が過ぎていれば読み直す
export function load(actor, direction) {
  const info = resolve(actor, direction); if (!info) return Promise.resolve(null);
  let e = cache.get(info.url);
  if (!e) { e = { url: info.url, id: info.actorId, dir: info.dir, tries: 0, info }; cache.set(info.url, e); startLoad(e, info); }
  else if (e.state === 'error') { const wait = RETRY_MS[Math.min(RETRY_MS.length - 1, Math.max(0, e.tries - 1))]; if (performance.now() - e.failedAt >= wait) startLoad(e, info); }
  return e.promise;
}
// いますぐ読み直す（失敗の記録を消す）
export function retry(url) { const e = cache.get(url); if (!e) return null; if (e.state !== 'error') return e.promise; e.tries = 0; return startLoad(e, e.info); }
// 失敗していた絵を、間隔を待たずに読み直す（戦闘の始まりなど。最後の失敗から minMs 以上たっているもの）
export function retryFailed(actor, dirs, minMs) { for (const d of dirs) { const info = resolve(actor, d); if (!info) continue; const e = cache.get(info.url); if (e && e.state === 'error' && performance.now() - e.failedAt >= (minMs || 0)) retry(info.url); } }

// 同期で調べる：{ state: 'none'（パックにない人物）|'loading'|'ok'|'error', info, art（ok のとき） }。まだなら読み込みを始める
export function get(actor, direction) {
  const info = resolve(actor, direction); if (!info) return { state: 'none', info: null, art: null };
  load(actor, direction); const e = cache.get(info.url);
  return { state: e ? e.state : 'loading', info, art: e && e.state === 'ok' ? e.art : null, err: e ? e.err : null, tries: e ? e.tries : 0 };
}

// 先読み：人物ID（または actor）の一覧と向きの一覧
export function preload(actors, dirs) {
  const S = G.State; const list = [];
  for (const x of actors || []) { const a = typeof x === 'string' ? (S && S.actor ? S.actor(x) : null) || { id: x } : x; if (a && hasActor(a.id)) for (const d of dirs) list.push(load(a, d)); }
  return Promise.all(list);
}

export function stats() {
  const s = { pack: packVersion, root: packRoot(), ok: 0, loading: 0, error: 0, urls: [], failures: failLog.slice(-20) };
  for (const e of cache.values()) { s[e.state]++; s.urls.push({ id: e.id, dir: e.dir, state: e.state, url: e.url, tries: e.tries }); }
  return s;
}
// テスト用：キャッシュを空にする（読み込みの失敗と復帰の確認）
export function clearCache() { cache.clear(); }

// v9.6 装備の外見：合成した絵（元の画像の大きさ＋まわりの余白）を、同じ方法で切り出す（BattleActors3D が pivot を余白の分ずらして呼ぶ）
export { cropArt };
export const PartyDirections = { DIRS, PACK_DIR, hasActor, actorIds, resolve, load, get, preload, retry, retryFailed, stats, clearCache, cropArt, root: packRoot };
if (typeof window !== 'undefined') window.MTQ3D_PartyDirections = PartyDirections;   // 確認・テスト用
