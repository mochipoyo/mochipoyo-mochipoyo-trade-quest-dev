/* =========================================================
   RPG / Saves（v6.5）：セーブの共通形式・一覧の情報・プレイ時間・端末内のバックアップ
   ・端末に保存する形は従来どおり（State.data をそのまま JSON。キーも従来どおり。2D版と3D版は別のキー）
   ・共通形式（クラウド・書き出し用）：{ format:'mtq-save', v:1, origin:'2d'|'3d', savedAt, meta, core }
       core＝ゲームの進行（物語・仲間・持ち物・クエスト・位置など）。端末ごとの表示・操作の設定（settings）は入れない
       3D版のカメラの角度・画質は、もともと State.data に入っていない（localStorage の mtq3d-*）ので共有されない
   ・バックアップ：この端末の中に最大5回分（スロット0〜3の中身の写し）。消す前・置き換える前に自動で作る
   ========================================================= */
(function (root) {
  'use strict';
  var State = root.State;
  var Saves = {};
  var PREFIX = State.keyPrefix;                                   // 'mtq-rpg-v2-slot-'（2D）／'mtq-3d-slot-'（3D）／確認用は debug
  var NS = PREFIX.replace(/slot-$/, '');                          // 'mtq-rpg-v2-'／'mtq-3d-'
  var ORIGIN = /^mtq-3d-/.test(PREFIX) ? '3d' : '2d';
  var OTHER = { '2d': 'mtq-rpg-v2-slot-', '3d': 'mtq-3d-slot-' };  // 書き出しのときだけ両方を読む（書き込みは自分の側だけ）
  var LOCAL_ONLY = ['settings'];
  var MAX_BACKUPS = 5;
  Saves.NS = NS; Saves.ORIGIN = ORIGIN; Saves.LOCAL_ONLY = LOCAL_ONLY;

  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  function rawSlot(slot, prefix) { var s = ls(); if (!s) return null; try { return s.getItem((prefix || PREFIX) + slot); } catch (e) { return null; } }
  Saves.rawSlot = rawSlot;
  Saves.writeRaw = function (slot, text) { var s = ls(); if (!s) return false; try { s.setItem(PREFIX + slot, text); return true; } catch (e) { return false; } };

  /* ---------- 一覧に出す情報 ---------- */
  Saves.placeName = function (mapId) { var M = root.MAP_DEFS || {}; return (M[mapId] && M[mapId].name) || (root.WORLD_DEF && root.WORLD_DEF.id === mapId ? root.WORLD_DEF.name : '') || mapId || '—'; };
  Saves.chapter = function (d) { var C = root.STORY_CHAPTERS || []; var cur = null; C.forEach(function (c) { if (!c.flag || (d.flags && d.flags[c.flag])) cur = c; }); return cur ? cur.title : ''; };
  Saves.meta = function (d) {
    if (!d || !d.hero) return null; var J = root.JOBS || {};
    return { name: d.hero.name, level: d.hero.level, job: d.hero.job, jobName: J[d.hero.job] ? J[d.hero.job].name : d.hero.job, map: d.pos && d.pos.map, place: Saves.placeName(d.pos && d.pos.map),
      savedAt: d.savedAt || 0, playTime: d.playTime || 0, chapter: Saves.chapter(d), party: (d.party || []).length, gold: d.gold || 0 };
  };
  Saves.fmtTime = function (ms) { var m = Math.floor((ms || 0) / 60000); var h = Math.floor(m / 60); return h ? h + '時間' + (m % 60) + '分' : (m % 60) + '分'; };
  Saves.fmtDate = function (t) { if (!t) return '—'; var d = new Date(t); function p(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  Saves.line = function (m) { if (!m) return '（空き）'; return m.name + '　Lv' + m.level + '　' + m.place + '　' + Saves.fmtDate(m.savedAt) + '　プレイ ' + Saves.fmtTime(m.playTime); };
  Saves.slotMeta = function (slot, prefix) { var raw = rawSlot(slot, prefix); if (!raw) return null; try { return Saves.meta(JSON.parse(raw)); } catch (e) { return null; } };

  /* ---------- 共通形式 ---------- */
  Saves.split = function (d) { var core = {}; Object.keys(d).forEach(function (k) { if (LOCAL_ONLY.indexOf(k) < 0) core[k] = d[k]; }); var view = {}; LOCAL_ONLY.forEach(function (k) { if (d[k] !== undefined) view[k] = d[k]; }); return { core: core, view: view }; };
  Saves.pack = function (d) { var sp = Saves.split(d); return { format: 'mtq-save', v: 1, origin: ORIGIN, savedAt: d.savedAt || Date.now(), meta: Saves.meta(d), core: JSON.parse(JSON.stringify(sp.core)) }; };
  // 共通形式 → この端末のセーブ。端末の設定（settings）は、この端末のものを使う（なければ新しいゲームの初期値）
  Saves.unpack = function (pkg, keepView) {
    if (!pkg || pkg.format !== 'mtq-save' || !pkg.core || !pkg.core.hero || !pkg.core.pos) throw new Error('セーブデータの形式が正しくありません');
    var d = JSON.parse(JSON.stringify(pkg.core));
    LOCAL_ONLY.forEach(function (k) { if (keepView && keepView[k] !== undefined) d[k] = JSON.parse(JSON.stringify(keepView[k])); });
    d.savedAt = pkg.savedAt || d.savedAt; return State.migrate(d);
  };
  Saves.viewOf = function (slot) { var raw = rawSlot(slot); if (raw) { try { return Saves.split(JSON.parse(raw)).view; } catch (e) { /* 壊れていれば使わない */ } } if (State.data) return Saves.split(State.data).view; return null; };

  /* ---------- 端末内のバックアップ ---------- */
  function index() { var s = ls(); if (!s) return []; try { return JSON.parse(s.getItem(NS + 'backups') || '[]'); } catch (e) { return []; } }
  function saveIndex(list) { var s = ls(); if (!s) return false; try { s.setItem(NS + 'backups', JSON.stringify(list)); return true; } catch (e) { return false; } }
  Saves.backups = function () { return index().slice().sort(function (a, b) { return b.at - a.at; }); };
  Saves.backup = function (reason, slots) {
    var s = ls(); if (!s) return null;
    slots = slots || [0, 1, 2, 3]; var data = {}, metas = []; slots.forEach(function (n) { var raw = rawSlot(n); if (raw) { data[n] = raw; var m = null; try { m = Saves.meta(JSON.parse(raw)); } catch (e) { /* 読めないものも写しは残す */ } metas.push({ slot: n, meta: m, size: raw.length }); } });
    if (!metas.length) return null;
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); var entry = { id: id, at: Date.now(), reason: reason || '手動', origin: ORIGIN, slots: metas };
    var list = index(); var text = JSON.stringify(data);
    for (var tries = 0; tries < MAX_BACKUPS + 1; tries++) {
      while (list.length >= MAX_BACKUPS) { var old = list.sort(function (a, b) { return a.at - b.at; }).shift(); try { s.removeItem(NS + 'backup-' + old.id); } catch (e) { /* なし */ } }
      try { s.setItem(NS + 'backup-' + id, text); list.push(entry); saveIndex(list); return entry; }
      catch (e) { if (!list.length) return null; var o = list.sort(function (a, b) { return a.at - b.at; }).shift(); try { s.removeItem(NS + 'backup-' + o.id); } catch (e2) { /* なし */ } saveIndex(list); }   // 容量が足りなければ古いバックアップから消す（セーブ本体は消さない）
    }
    return null;
  };
  Saves.backupData = function (id) { var s = ls(); if (!s) return null; try { return JSON.parse(s.getItem(NS + 'backup-' + id) || 'null'); } catch (e) { return null; } };
  // バックアップの slot 番のデータを、この端末のスロット to へ戻す（戻す前に今の中身をバックアップ）
  Saves.restore = function (id, slot, to) {
    var bd = Saves.backupData(id); if (!bd || !bd[slot]) return false;
    var d; try { d = JSON.parse(bd[slot]); } catch (e) { return false; } if (!d || !d.hero || !d.pos) return false;
    if (rawSlot(to)) Saves.backup('バックアップから戻す前（スロット' + to + '）', [to]);
    return Saves.writeRaw(to, bd[slot]);
  };
  // 初めてこの版を開いたとき：既存のセーブを一度だけバックアップ（クラウドセーブを使う前の安全のため）
  Saves.initialBackup = function () { var s = ls(); if (!s || State.debug) return null; try { if (s.getItem(NS + 'backup-initial')) return null; } catch (e) { return null; } var b = Saves.backup('v6.5 クラウドセーブ導入前の自動バックアップ'); try { s.setItem(NS + 'backup-initial', String(Date.now())); } catch (e) { /* なし */ } return b; };

  /* ---------- ファイルへの書き出し・読み込み（2D版と3D版の両方のスロットを1つのファイルに） ---------- */
  Saves.exportAll = function () {
    var out = { format: 'mtq-backup', v: 1, at: Date.now(), from: ORIGIN, slots: {} };
    Object.keys(OTHER).forEach(function (o) { out.slots[o] = {}; [0, 1, 2, 3].forEach(function (n) { var raw = rawSlot(n, OTHER[o]); if (!raw) return; try { var d = JSON.parse(raw); var sp = Saves.split(d); out.slots[o][n] = { meta: Saves.meta(d), data: d, view: sp.view }; } catch (e) { /* 壊れたスロットは書き出さない */ } }); });
    return JSON.stringify(out);
  };
  // 読み込み：候補の一覧を返す（どれをどのスロットへ戻すかは画面で選ぶ）。従来の1件だけの書き出し（State.exportJSON）も読める
  Saves.parseFile = function (text) {
    var j = JSON.parse(text); var list = [];
    if (j && j.format === 'mtq-backup' && j.slots) Object.keys(j.slots).forEach(function (o) { Object.keys(j.slots[o]).forEach(function (n) { var e = j.slots[o][n]; if (e && e.data && e.data.hero && e.data.pos) list.push({ origin: o, slot: +n, meta: Saves.meta(e.data), data: e.data }); }); });
    else if (j && j.format === 'mtq-save') list.push({ origin: j.origin, slot: null, meta: j.meta, data: Saves.unpack(j, Saves.split(State.data || State.newGameTemplate()).view) });
    else if (j && j.hero && j.pos) list.push({ origin: '?', slot: null, meta: Saves.meta(j), data: j });
    if (!list.length) throw new Error('セーブデータが見つかりません');
    return list;
  };
  // 候補を、この端末のスロット to へ書く（書く前に今の中身をバックアップ。端末の設定はこの端末のものを残す）
  Saves.importTo = function (entry, to) {
    var view = Saves.viewOf(to); var d = JSON.parse(JSON.stringify(entry.data)); LOCAL_ONLY.forEach(function (k) { if (view && view[k] !== undefined) d[k] = view[k]; });
    d = State.migrate(d); if (rawSlot(to)) Saves.backup('ファイルから読み込む前（スロット' + to + '）', [to]);
    return Saves.writeRaw(to, JSON.stringify(d));
  };

  /* ---------- プレイ時間 ---------- */
  // 画面が見えていて、冒険中（タイトル画面ではない）のときだけ数える。1回に数えるのは最大5秒（スリープ明けなどで一気に増えないように）
  var last = 0, timer = null;
  Saves.tick = function (now) {
    now = now || Date.now(); var d = State.data; var vis = !root.document || root.document.visibilityState !== 'hidden';
    if (d && last && vis && root.World && root.World.map) d.playTime = (d.playTime || 0) + Math.max(0, Math.min(5000, now - last));
    last = now;
  };
  Saves.startClock = function () { if (timer || typeof root.setInterval !== 'function') return; last = Date.now(); timer = root.setInterval(function () { Saves.tick(); }, 1000); };

  root.Saves = Saves;
})(typeof window !== 'undefined' ? window : globalThis);
