/* =========================================================
   もちぽよFXクエスト - セーブ処理（LocalStorage）
   オートセーブ / 初期化 / JSONエクスポート・インポート
   ========================================================= */
(function (root) {
  'use strict';

  var CONFIG = root.CONFIG;
  var Battle = root.Battle;
  var KEY = 'mochipoyo-trade-quest-save-v1';

  var Save = {};

  Save.defaultState = function () {
    return {
      version: CONFIG.version,
      createdAt: Date.now(),
      player: { charId: null, name: '', level: 1, exp: 0, hp: CONFIG.battle.playerBaseHp, mp: CONFIG.battle.playerBaseMp,
        analysis: 1, judgment: 1, patience: 1, money: 1 },
      capital: CONFIG.risk.capital,
      progress: { chapter: 1, unlockedChapters: [1], clearedChapters: [], chapterSteps: {}, battlesWon: 0, bestScore: 0, dungeonBest: 0, ending: false, quests: {} },
      inventory: { potion: 1, ether: 1 },
      equipment: { weapon: null, head: null, shield: null, accessory: null },
      achievements: [],
      stats: Battle.emptyStats(),
      settings: { sound: false, riskPercent: CONFIG.risk.defaultRiskPercent, textSpeed: 'normal', showZigzag: true }
    };
  };

  Save.load = function () {
    try {
      var raw = root.localStorage ? root.localStorage.getItem(KEY) : null;
      if (!raw) return null;
      var data = JSON.parse(raw);
      return Save.migrate(data);
    } catch (e) { return null; }
  };

  // 不足しているキーを補う（将来のバージョンアップ対応）
  Save.migrate = function (data) {
    var def = Save.defaultState();
    function merge(d, s) {
      for (var k in d) {
        if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
        if (s[k] === undefined) s[k] = d[k];
        else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && s[k] && typeof s[k] === 'object') merge(d[k], s[k]);
      }
      return s;
    }
    return merge(def, data || {});
  };

  Save.save = function (state) {
    try {
      if (!root.localStorage) return false;
      state.savedAt = Date.now();
      root.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) { return false; }
  };

  Save.reset = function () {
    try { if (root.localStorage) root.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  };

  Save.exportJSON = function (state) { return JSON.stringify(state, null, 2); };

  Save.importJSON = function (text) {
    var data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.player || !data.progress) throw new Error('セーブデータの形式が正しくありません');
    return Save.migrate(data);
  };

  Save.KEY = KEY;
  root.Save = Save;
})(typeof window !== 'undefined' ? window : globalThis);
