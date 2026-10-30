/* =========================================================
   RPG / State : ゲーム全体の状態・セーブ（3スロット＋オートセーブ）・旧データ移行
   ========================================================= */
(function (root) {
  'use strict';

  var Actors = root.Actors, ITEMS = root.ITEMS, COMPANIONS = root.COMPANIONS, TradeEval = root.TradeEval, CONFIG = root.CONFIG;
  var NORMAL_PREFIX = 'mtq-rpg-v2-slot-';   // 新セーブキー（旧 'mochipoyo-trade-quest-save-v1' は破壊しない）
  // v5.6 確認用（URL に ?debug=1）：セーブは通常のデータとは別の場所に保存し、通常のセーブを書き換えない
  var DEBUG = !!(root.location && /[?&]debug=1(?:&|$)/.test(root.location.search || ''));
  var KEY_PREFIX = DEBUG ? 'mtq-rpg-v2-debug-slot-' : NORMAL_PREFIX;
  // 3D版（/3d/）：別の保存先を使う（例 'mtq-3d-slot-'）。2D版の通常のセーブは読むだけ（State.loadNormal）で書き換えない
  var ALT = root.MTQ_SAVE_PREFIX; if (typeof ALT === 'string' && /^mtq-3d-[a-z0-9-]*slot-$/.test(ALT) && ALT !== NORMAL_PREFIX) KEY_PREFIX = DEBUG ? ALT.replace(/slot-$/, 'debug-slot-') : ALT;
  var LEGACY_KEY = 'mochipoyo-trade-quest-save-v1';
  var SAVE_VERSION = 3;   // 3: 町・城の2倍拡大（座標を補正）

  var State = { data: null, debug: DEBUG, keyPrefix: KEY_PREFIX };

  State.newGame = function (name, job) {
    var hero = Actors.create('hero', name, job, 1);
    var d = {
      version: SAVE_VERSION, createdAt: Date.now(), playTime: 0,
      hero: hero, companions: {}, party: ['hero'],      // party: 戦闘メンバー（最大4）
      gold: 0, bank: 0, inventory: {}, flags: {}, counters: {}, quests: {}, chests: {},
      pos: { map: 'poyo_village', x: 24, y: 32, dir: 'up' }, lastInn: { map: 'poyo_village', x: 24, y: 32 }, visited: { poyo_village: true },
      steps: 0, timeOfDay: 0.3, bestiary: {}, trade: { stats: TradeEval.emptyStats(), capital: CONFIG.risk.capital, lectures: {}, topics: {}, tutorialDone: false, abilities: {}, learnFails: {}, learnSeen: {}, rankBest: 0, achievements: {}, mistakes: {}, reviewLog: [], wasWeak: {} },
      settings: { bgm: 0.5, se: 0.5, mute: true, textSpeed: 'normal', battleSpeed: 'normal', walkSpeed: 'fast', riskPercent: CONFIG.risk.defaultRiskPercent, showZigzag: true, minimap: 'on', minimapSize: 'normal' },
      mapDiscovery: {},   // ミニマップの探索状況（マップID → 行ごとのビット列）。visited とは別
      vehicles: {}, aboard: null,   // v5.0: 乗り物（js/rpg/vehicle.js）
      legacyImported: null
    };
    State.data = d;
    return d;
  };

  /* ---------- 便利関数 ---------- */
  State.actor = function (id) { var d = State.data; if (id === 'hero') return d.hero; return d.companions[id] || null; };
  State.partyActors = function () { return State.data.party.map(State.actor).filter(Boolean); };
  State.aliveParty = function () { return State.partyActors().filter(function (a) { return !a.dead; }); };
  State.addItem = function (id, qty) { var inv = State.data.inventory; inv[id] = (inv[id] || 0) + (qty || 1); if (inv[id] <= 0) delete inv[id]; };
  State.hasItem = function (id) { return (State.data.inventory[id] || 0) > 0; };
  State.flag = function (k) { return !!State.data.flags[k]; };
  State.setFlag = function (k, v) { State.data.flags[k] = v === undefined ? true : v; };
  State.count = function (k, n) { var c = State.data.counters; c[k] = (c[k] || 0) + (n || 1); return c[k]; };
  State.joinCompanion = function (id) {
    var d = State.data; if (d.companions[id]) return d.companions[id];
    var c = COMPANIONS[id]; var a = Actors.create(id, c.name, c.job, Math.max(c.joinLevel, d.hero.level - 1), c.sprite);
    d.companions[id] = a;
    if (d.party.length < 4) d.party.push(id);
    return a;
  };

  /* ---------- セーブ ---------- */
  function key(slot) { return KEY_PREFIX + slot; } // slot: 1..3, 0=auto
  State.save = function (slot) {
    try { if (!root.localStorage) return false; State.data.savedAt = Date.now(); root.localStorage.setItem(key(slot), JSON.stringify(State.data)); return true; } catch (e) { return false; }
  };
  State.autosave = function () { return State.save(0); };
  State.load = function (slot) {
    try { var raw = root.localStorage ? root.localStorage.getItem(key(slot)) : null; if (!raw) return null; var d = JSON.parse(raw); return State.migrate(d); } catch (e) { return null; }
  };
  State.slotInfo = function (slot) {
    try { var raw = root.localStorage ? root.localStorage.getItem(key(slot)) : null; if (!raw) return null; var d = JSON.parse(raw);
      return { name: d.hero.name, level: d.hero.level, job: d.hero.job, map: d.pos.map, gold: d.gold, savedAt: d.savedAt, playTime: d.playTime || 0, party: d.party.length }; } catch (e) { return null; }
  };
  // 確認用：通常のセーブを読むだけ（書き込みはしない）
  State.loadNormal = function (slot) {
    try { var raw = root.localStorage ? root.localStorage.getItem(NORMAL_PREFIX + slot) : null; if (!raw) return null; return State.migrate(JSON.parse(raw)); } catch (e) { return null; }
  };
  State.normalSlotInfo = function (slot) {
    try { var raw = root.localStorage ? root.localStorage.getItem(NORMAL_PREFIX + slot) : null; if (!raw) return null; var d = JSON.parse(raw); return { name: d.hero.name, level: d.hero.level, map: d.pos.map }; } catch (e) { return null; }
  };
  State.deleteSlot = function (slot) { try { root.localStorage.removeItem(key(slot)); } catch (e) { /* ignore */ } };
  State.exportJSON = function () { return JSON.stringify(State.data, null, 2); };
  State.importJSON = function (text) { var d = JSON.parse(text); if (!d || !d.hero || !d.pos) throw new Error('セーブデータの形式が正しくありません'); return State.migrate(d); };

  // 欠けているキーを補完（将来のバージョンアップ対応）
  State.migrate = function (d) {
    var def = State.newGameTemplate();
    function merge(t, s) { for (var k in t) { if (!Object.prototype.hasOwnProperty.call(t, k)) continue; if (s[k] === undefined) s[k] = t[k]; else if (t[k] && typeof t[k] === 'object' && !Array.isArray(t[k]) && s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) merge(t[k], s[k]); } return s; }
    merge(def, d);
    [d.hero].concat(Object.keys(d.companions).map(function (k) { return d.companions[k]; })).forEach(function (a) { if (!a.jobLevels) a.jobLevels = {}; if (!a.jobLevels[a.job]) a.jobLevels[a.job] = a.level; if (!a.buffs) a.buffs = {}; if (!a.status) a.status = {}; });
    // v3.4: 町・城が2倍になったので、旧データの位置を補正（壁の中なら町の入口へ）
    if ((d.version || 2) < 3 && root.MAP_ENLARGE) {
      ['pos', 'lastInn'].forEach(function (key) { var pz = d[key]; if (!pz) return; var k = root.MAP_ENLARGE[pz.map]; if (k) { pz.x *= k; pz.y *= k; } });
      d.stepsSinceBattle = 0;
    }
    d.version = SAVE_VERSION;
    return d;
  };
  State.newGameTemplate = function () { var keep = State.data; var t = State.newGame('template', 'warrior'); State.data = keep; return t; };

  /* ---------- 旧バージョン（第1作）のセーブデータ移行 ---------- */
  // 移行できるもの：トレード学習の成績・設定の一部。移行できないもの：旧レベル・旧アイテム・章進行（新ゲームと構造が異なるため）
  State.legacyInfo = function () {
    try { var raw = root.localStorage ? root.localStorage.getItem(LEGACY_KEY) : null; if (!raw) return null; var d = JSON.parse(raw);
      return { name: d.player && d.player.name, level: d.player && d.player.level, stats: d.stats, settings: d.settings, cleared: d.progress && d.progress.clearedChapters }; } catch (e) { return null; }
  };
  State.importLegacy = function () {
    var info = State.legacyInfo(); if (!info || !State.data) return null;
    var migrated = [], skipped = [];
    if (info.stats) { State.data.trade.stats = Object.assign(TradeEval.emptyStats(), info.stats); migrated.push('トレード学習の成績（判断回数・見送り・ルール違反など）'); }
    if (info.settings) { if (info.settings.riskPercent) State.data.settings.riskPercent = info.settings.riskPercent; if (info.settings.showZigzag !== undefined) State.data.settings.showZigzag = info.settings.showZigzag; migrated.push('リスク%・ZigZag表示の設定'); }
    if (info.cleared && info.cleared.length) { info.cleared.forEach(function (ch) { var map = { 2: 'learned_dow', 3: 'learned_ema', 4: 'learned_mtf', 5: 'learned_rci', 6: 'learned_macd', 7: 'learned_risk', 1: 'learned_basic' }; if (map[ch]) { State.data.flags[map[ch]] = true; State.data.trade.lectures[map[ch]] = true; } }); migrated.push('修了済みの講義（旧章のクリア状況）'); }
    skipped.push('旧レベル・経験値・装備・章の進行度（新しいRPGと構造が違うため）');
    State.data.legacyImported = { at: Date.now(), migrated: migrated, skipped: skipped };
    return State.data.legacyImported;
  };

  root.State = State;
})(typeof window !== 'undefined' ? window : globalThis);
