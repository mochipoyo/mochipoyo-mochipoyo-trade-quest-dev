/* =========================================================
   RPG / Cloud（v6.5）：クラウドセーブ（Supabase）。ライブラリは使わず fetch だけ
   ・設定：js/cloud-config.js の MTQ_CLOUD = { url, publishableKey }。空ならクラウドは「未設定」で、ゲームは今までどおり端末だけで遊べる
   ・ログイン：メールのログインリンク（届いたメールのリンクを押す）。リンクが別のブラウザで開いてしまうときのために、メールの6桁のコードの入力にも対応
   ・ログインの情報（トークン）は localStorage の 'mtq-cloud-session'（2D版・3D版で共通）。秘密鍵は持たない
   ・保存：サーバーの関数 mtq_put_save にスロット番号・この端末が知っているクラウドのリビジョン・共通形式のデータを送る。
     リビジョンが合わなければ保存されず「競合」になる（別の端末が先に更新した）。端末の時計は判定に使わない
   ・つながらないとき：端末のセーブはそのまま。「未送信」として覚えておき、オンラインに戻ったら送り直す。端末のデータは消さない
   ・同期の状態はスロットごと（この端末・この版＝2D/3D ごと）に localStorage の '<NS>cloud' に記録：
       { slots: { n: { linked, rev, sentAt, pending, conflict: { rev, meta, device, updated } } } }
       linked … このスロットをクラウドの同じ番号のスロットと同期する（最初にアップロードかダウンロードをしたときにオン）
   ========================================================= */
(function (root) {
  'use strict';
  var State = root.State, Saves = root.Saves;
  var Cloud = { status: 'unconfigured', user: null, lastError: '', online: true };
  var SESSION_KEY = 'mtq-cloud-session';
  var NS = Saves.NS; var SYNC_KEY = NS + 'cloud';
  var listeners = [];

  function cfg() { var c = root.MTQ_CLOUD || {}; return { url: String(c.url || '').replace(/\/+$/, ''), key: String(c.publishableKey || c.anonKey || '') }; }   // 公開用のキー（publishable キー。旧来の anon キーも可）
  Cloud.configured = function () { var c = cfg(); return !!(c.url && c.key && /^https?:\/\//.test(c.url)); };
  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  function getJSON(k, def) { var s = ls(); if (!s) return def; try { var v = s.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function setJSON(k, v) { var s = ls(); if (!s) return; try { if (v === null) s.removeItem(k); else s.setItem(k, JSON.stringify(v)); } catch (e) { /* 容量不足など：同期の記録が残らないだけ */ } }
  function emit() { listeners.forEach(function (f) { try { f(Cloud); } catch (e) { /* 表示の失敗は無視 */ } }); }
  Cloud.onChange = function (f) { listeners.push(f); };
  function toast(t) { if (root.Win && root.Win.toast) root.Win.toast(t); }

  /* ---------- 端末の名前（一覧の表示用） ---------- */
  Cloud.device = function () {
    var ua = (root.navigator && root.navigator.userAgent) || ''; var kind = /iPad|Tablet/i.test(ua) ? 'タブレット' : /iPhone|Android.+Mobile|Mobile/i.test(ua) ? 'スマホ' : 'PC';
    return kind + '・' + (Saves.ORIGIN === '3d' ? '3D版' : '2D版');
  };

  /* ---------- セッション ---------- */
  function session() { return getJSON(SESSION_KEY, null); }
  function setSession(s) { setJSON(SESSION_KEY, s); Cloud.user = s && s.user ? s.user : null; Cloud.status = !Cloud.configured() ? 'unconfigured' : s ? 'signedin' : 'signedout'; emit(); }
  function fromAuthResponse(j) {   // GoTrue の応答 → 保存する形
    var exp = j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000;
    return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: exp, user: j.user ? { id: j.user.id, email: j.user.email } : null };
  }

  /* ---------- 通信 ---------- */
  async function request(method, path, body, opts) {
    opts = opts || {}; var c = cfg(); var headers = { apikey: c.key, 'Content-Type': 'application/json' };
    if (opts.auth !== false) { var s = await validSession(); if (!s) throw Object.assign(new Error('ログインしていません'), { kind: 'auth' }); headers.Authorization = 'Bearer ' + s.access_token; }
    if (opts.prefer) headers.Prefer = opts.prefer;
    var res;
    try { res = await root.fetch(c.url + path, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch (e) { Cloud.online = false; throw Object.assign(new Error('通信できませんでした（オフラインかもしれません）'), { kind: 'network' }); }
    Cloud.online = true;
    var text = await res.text(); var j = null; try { j = text ? JSON.parse(text) : null; } catch (e) { j = null; }
    if (res.status === 401 && opts.auth !== false && !opts.retried) { var r = await refresh(true); if (r) return request(method, path, body, Object.assign({}, opts, { retried: true })); }
    if (!res.ok) { var msg = (j && (j.msg || j.message || j.error_description || j.error)) || ('エラー ' + res.status); throw Object.assign(new Error(msg), { kind: res.status === 401 || res.status === 403 ? 'auth' : 'server', status: res.status }); }
    return j;
  }
  Cloud._request = request;
  async function refresh(force) {
    var s = session(); if (!s || !s.refresh_token) return null;
    if (!force && s.expires_at - Date.now() > 60000) return s;
    try { var j = await request('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token }, { auth: false }); var ns = fromAuthResponse(j); if (!ns.user) ns.user = s.user; setSession(ns); return ns; }
    catch (e) { if (e.kind === 'network') return s; setSession(null); Cloud.lastError = 'ログインの有効期限が切れました。もう一度ログインしてください'; toast(Cloud.lastError); return null; }   // つながらないときはログインを消さない
  }
  async function validSession() { var s = session(); if (!s) return null; if (s.expires_at - Date.now() < 60000) return refresh(false); return s; }

  /* ---------- ログイン ---------- */
  Cloud.redirectUrl = function () { var l = root.location; return l ? l.origin + l.pathname : ''; };
  Cloud.sendLink = async function (email) {
    email = String(email || '').trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('メールアドレスの形が正しくありません');
    await request('POST', '/auth/v1/otp?redirect_to=' + encodeURIComponent(Cloud.redirectUrl()), { email: email, create_user: true }, { auth: false });
    var s = ls(); if (s) try { s.setItem('mtq-cloud-email', email); } catch (e) { /* なし */ }
    return true;
  };
  Cloud.verifyCode = async function (email, code) {
    var j = await request('POST', '/auth/v1/verify', { type: 'email', email: String(email).trim(), token: String(code).trim() }, { auth: false });
    if (!j || !j.access_token) throw new Error('コードを確かめられませんでした');
    setSession(fromAuthResponse(j)); afterSignIn(); return true;
  };
  // メールのリンクから戻ってきたとき：URL の # にトークン（またはエラー）がある。読み取ったら URL から消す
  Cloud.consumeRedirect = function () {
    var l = root.location; if (!l || !l.hash || l.hash.length < 2) return null;
    var p = {}; l.hash.slice(1).split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) p[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
    if (!p.access_token && !p.error && !p.error_code) return null;
    try { root.history.replaceState(null, '', l.pathname + l.search); } catch (e) { /* なし */ }
    if (p.error || p.error_code) { Cloud.lastError = 'ログインできませんでした：' + (p.error_description || p.error_code || p.error); return { error: Cloud.lastError }; }
    var s = { access_token: p.access_token, refresh_token: p.refresh_token, expires_at: p.expires_at ? +p.expires_at * 1000 : Date.now() + (+p.expires_in || 3600) * 1000, user: null };
    setSession(s); return { ok: true };
  };
  async function loadUser() { try { var u = await request('GET', '/auth/v1/user'); var s = session(); if (s && u) { s.user = { id: u.id, email: u.email }; setSession(s); } } catch (e) { /* あとで再試行 */ } }
  function afterSignIn() { loadUser().then(function () { Cloud.flush(); }); }
  Cloud.signOut = async function () { try { await request('POST', '/auth/v1/logout', {}); } catch (e) { /* つながらなくても端末のログインは消す */ } setSession(null); };

  /* ---------- 同期の記録 ---------- */
  Cloud.sync = function () { var s = getJSON(SYNC_KEY, null) || { slots: {} }; if (!s.slots) s.slots = {}; return s; };
  function slotState(n) { var s = Cloud.sync(); return s.slots[n] || { linked: false, rev: 0 }; }
  Cloud.slotState = slotState;
  function setSlotState(n, patch) { var s = Cloud.sync(); s.slots[n] = Object.assign({ linked: false, rev: 0 }, s.slots[n] || {}, patch); setJSON(SYNC_KEY, s); emit(); return s.slots[n]; }
  Cloud.setLinked = function (n, on) { return setSlotState(n, { linked: !!on }); };

  /* ---------- クラウドの読み書き ---------- */
  Cloud.list = async function () { var rows = await request('GET', '/rest/v1/mtq_saves?select=slot,revision,meta,device,updated_at&order=slot.asc'); return rows || []; };
  Cloud.get = async function (n) { var rows = await request('GET', '/rest/v1/mtq_saves?select=slot,revision,data,meta,device,updated_at&slot=eq.' + (+n)); return rows && rows[0] || null; };
  Cloud.history = async function (n) { return (await request('GET', '/rest/v1/mtq_save_history?select=id,slot,revision,meta,device,saved_at,archived_at&slot=eq.' + (+n) + '&order=archived_at.desc')) || []; };
  Cloud.historyData = async function (id) { var rows = await request('GET', '/rest/v1/mtq_save_history?select=id,slot,revision,data,meta,saved_at&id=eq.' + (+id)); return rows && rows[0] || null; };
  // 端末のスロット n をクラウドのスロット n へ。base はこの端末が知っているクラウドのリビジョン（force のときはクラウドの今のリビジョン）
  Cloud.upload = async function (n, base) {
    var raw = Saves.rawSlot(n); if (!raw) throw new Error('この端末のスロットが空です');
    var d = JSON.parse(raw); var pkg = Saves.pack(d); var st = slotState(n);
    var rows = await request('POST', '/rest/v1/rpc/mtq_put_save', { p_slot: +n, p_base_revision: base === undefined ? (st.rev || 0) : base, p_data: pkg, p_meta: pkg.meta, p_device: Cloud.device() });
    var r = rows && rows[0]; if (!r) throw new Error('保存の結果が返ってきませんでした');
    if (r.ok) { setSlotState(n, { linked: true, rev: +r.rev, sentAt: d.savedAt || 0, pending: false, conflict: null, syncedAt: Date.now() }); return { ok: true, rev: +r.rev }; }
    setSlotState(n, { pending: false, conflict: { rev: +r.rev, meta: r.server_meta, device: r.server_device, updated: r.server_updated } });
    return { ok: false, conflict: true, rev: +r.rev, meta: r.server_meta, device: r.server_device, updated: r.server_updated };
  };
  // クラウドのスロット n を端末のスロット n へ（書く前に端末の中身をバックアップ。端末の設定はこの端末のものを残す）
  Cloud.download = async function (n, row) {
    row = row || await Cloud.get(n); if (!row) throw new Error('クラウドのスロットが空です');
    var d = Saves.unpack(row.data, Saves.viewOf(n));
    if (Saves.rawSlot(n)) Saves.backup('クラウドから読み込む前（スロット' + n + '）', [n]);
    if (!Saves.writeRaw(n, JSON.stringify(d))) throw new Error('この端末に保存できませんでした（保存領域がいっぱいかもしれません）');
    setSlotState(n, { linked: true, rev: +row.revision, sentAt: d.savedAt || 0, pending: false, conflict: null, syncedAt: Date.now() });
    return d;
  };
  // 端末とクラウドの状態（一覧の表示・競合の判定）
  Cloud.compare = function (n, row) {
    var st = slotState(n); var raw = Saves.rawSlot(n); var local = null; try { local = raw ? JSON.parse(raw) : null; } catch (e) { local = null; }
    var lm = local ? Saves.meta(local) : null; var changed = !!(local && (local.savedAt || 0) !== (st.sentAt || 0));
    var cloudRev = row ? +row.revision : 0; var cloudNewer = !!(row && cloudRev > (st.rev || 0));
    var kind = !row && !local ? 'empty' : !row ? 'local-only' : !local ? 'cloud-only' : cloudNewer && changed ? 'conflict' : cloudNewer ? 'cloud-newer' : changed ? 'local-newer' : 'same';
    return { kind: kind, local: lm, cloud: row ? row.meta : null, cloudRev: cloudRev, cloudDevice: row ? row.device : '', cloudUpdated: row ? row.updated_at : null, st: st };
  };

  /* ---------- 自動の同期（端末に保存したあと） ---------- */
  var timers = {}, flushing = false;
  // State.save から呼ばれる（成功したあと）。つながっていて、そのスロットの同期がオンなら少し待ってから送る
  Cloud.afterLocalSave = function (n) {
    if (!Cloud.configured() || !session()) return; var st = slotState(n); if (!st.linked) return;
    setSlotState(n, { pending: true });
    clearTimeout(timers[n]); timers[n] = setTimeout(function () { Cloud.pushSlot(n); }, n === 0 ? 2500 : 300);
  };
  Cloud.pushSlot = async function (n) {
    var st = slotState(n); if (!st.linked || !st.pending || st.conflict) return null;
    try { var r = await Cloud.upload(n); if (!r.ok) { toast('クラウドのスロット' + (n === 0 ? '（オート）' : n) + 'に、別の端末の新しいデータがあります。「クラウドセーブ」で選んでください'); } return r; }
    catch (e) { Cloud.lastError = e.message; if (!Cloud._warned) { Cloud._warned = true; toast('クラウドに送れませんでした（端末には保存済み。オンラインに戻ったら送ります）'); } setSlotState(n, { pending: true }); return { ok: false, error: e.message }; }
  };
  // 未送信をまとめて送る（オンラインに戻ったとき・ログインしたとき・定期的に）
  Cloud.flush = async function () {
    if (flushing || !Cloud.configured() || !session()) return; flushing = true;
    try { var s = Cloud.sync(); for (var k in s.slots) if (s.slots[k].linked && s.slots[k].pending && !s.slots[k].conflict) { var r = await Cloud.pushSlot(+k); if (r && r.error) break; } Cloud._warned = false; }
    finally { flushing = false; }
  };
  Cloud.pendingCount = function () { var s = Cloud.sync(); return Object.keys(s.slots).filter(function (k) { return s.slots[k].linked && s.slots[k].pending; }).length; };
  Cloud.conflictSlots = function () { var s = Cloud.sync(); return Object.keys(s.slots).filter(function (k) { return s.slots[k].conflict; }).map(Number); };

  Cloud.init = function () {
    Cloud.status = !Cloud.configured() ? 'unconfigured' : session() ? 'signedin' : 'signedout';
    if (!Cloud.configured()) return;
    var r = Cloud.consumeRedirect(); if (r && r.ok) { afterSignIn(); toast('クラウドセーブにログインしました'); } else if (r && r.error) toast(r.error);
    var s = session(); Cloud.user = s && s.user;
    if (s && !s.user) loadUser();
    if (root.addEventListener) root.addEventListener('online', function () { Cloud.online = true; Cloud.flush(); });
    if (typeof root.setInterval === 'function') root.setInterval(function () { if (Cloud.pendingCount()) Cloud.flush(); }, 60000);
    if (s) setTimeout(function () { Cloud.flush(); }, 1500);
  };

  root.Cloud = Cloud;
})(typeof window !== 'undefined' ? window : globalThis);
