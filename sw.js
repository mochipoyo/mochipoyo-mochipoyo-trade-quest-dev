/* =========================================================
   v9.3 読み込みを速くする（2回目から）：Service Worker（2D 版 index.html・3D 版 3d/index.html が登録する。https のときだけ）
   ・このサイトのファイルを端末に保存して、次から速く開く。保存は版（VERSION）ごと。版が変わると古い保存は消す
   ・ページ（.html）・version.json：まず通信して最新を使う。通信できないときは保存したもの
   ・版の印（?v=）つきのファイル・3d/assets（名前にハッシュつき）：保存したものを使う（中身が変わると URL が変わるので古くならない）
   ・そのほか（画像・3D のモデル・テクスチャ）：保存したものをすぐ使い、裏で新しいものを取りに行く
   ・曲（assets/music/ の MP3）・範囲指定（Range）の読み込みは、ここでは扱わない（ブラウザの通常のキャッシュ）
   ・止めたいとき：URL に ?nosw を付けて開く（登録しない）。セーブ（localStorage）には触らない
   ========================================================= */
const VERSION = '3c2811ed7c';   // tools/stamp-version.js が書き換える（手で書き換えない）
const CACHE = 'mtq-' + VERSION;
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => { const ks = await caches.keys(); await Promise.all(ks.filter((k) => k.indexOf('mtq-') === 0 && k !== CACHE).map((k) => caches.delete(k))); await self.clients.claim(); })());
});
async function put(req, res) { if (res && res.ok && res.type === 'basic' && res.status === 200) { try { const c = await caches.open(CACHE); await c.put(req, res); } catch (e) { } } }
async function networkFirst(req) {
  try { const res = await fetch(req); put(req, res.clone()); return res; }
  catch (e) { const hit = await caches.match(req, { ignoreSearch: false }); if (hit) return hit; throw e; }
}
async function cacheFirst(req) {
  const hit = await caches.match(req); if (hit) return hit;
  const res = await fetch(req); put(req, res.clone()); return res;
}
async function staleWhileRevalidate(req, ev) {
  const hit = await caches.match(req);
  const net = fetch(req).then((res) => { put(req, res.clone()); return res; }).catch(() => null);
  if (hit) { if (ev) ev.waitUntil(net); return hit; }
  const res = await net; if (res) return res; return fetch(req);
}
// 初めて開いたとき（ページから知らせが来る）：そのとき読み込んだファイルを保存する（曲・範囲の外・ほかのサイトは保存しない）
self.addEventListener('message', (e) => {
  const d = e.data; if (!d || d.type !== 'warm' || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const scope = new URL(self.registration.scope); const c = await caches.open(CACHE);
    for (const raw of d.urls.slice(0, 3000)) {
      try { const u = new URL(raw); if (u.origin !== scope.origin || u.pathname.indexOf(scope.pathname) !== 0 || /\/assets\/music\//.test(u.pathname) || /\.(mp3|ogg|m4a)$/.test(u.pathname)) continue;
        const req = new Request(u.href); if (await c.match(req)) continue; const res = await fetch(req); await put(req, res); } catch (err) { }
    }
  })());
});
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== self.location.origin) return;
  if (r.headers.has('range')) return;
  const scope = new URL(self.registration.scope).pathname; if (u.pathname.indexOf(scope) !== 0) return;
  const p = u.pathname;
  if (/\/assets\/music\//.test(p) || /\.(mp3|ogg|m4a)$/.test(p)) return;
  if (r.mode === 'navigate' || /\.html?$/.test(p) || /\/$/.test(p) || /version\.json$/.test(p)) { e.respondWith(networkFirst(r)); return; }
  if (u.searchParams.has('v') || /\/3d\/assets\//.test(p)) { e.respondWith(cacheFirst(r)); return; }
  e.respondWith(staleWhileRevalidate(r, e));
});
