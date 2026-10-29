/* =========================================================
   もちぽよFXクエスト - 設定ファイル
   トレードに関する設定値はすべてここから変更できます。
   ========================================================= */
(function (root) {
  'use strict';

  var CONFIG = {
    // インジケーター設定
    ema: { periods: [20, 30, 40] },
    rci: { period: 9, hot: 70 },            // ±70 を注目水準とする
    macd: { fast: 6, slow: 13, signal: 4 },
    zigzag: { depth: 4 },                   // ピボット確定に必要な左右の本数（確定にdepth本の未来が必要）

    // 資金管理
    risk: {
      capital: 1000000,                      // 初期仮想資金（円）
      defaultRiskPercent: 1,                 // 1トレードの初期リスク（資金の%）
      riskOptions: [0.5, 1, 2, 5],           // 選択可能なリスク%（2%超はロット過大として扱う）
      maxSafeRiskPercent: 2,
      rrMin: 1.5,                            // 教材上の参考リスクリワード下限
      rrGood: 2,
      rrIdeal: 3
    },

    // 市場データ（学習用の人工データ）
    market: {
      pip: 0.01,
      basePrice: 150.0,
      pairName: '学習用仮想ペア POYO/MOCHI',
      days: 60,                              // 日足として表示する日数
      futureBars5m: 576                      // 判断後に進めるための5分足本数（=2日分）
    },

    // 時間足と5分足からの集約倍率
    timeframes: [
      { id: '5m', label: '5分足', factor: 1 },
      { id: '15m', label: '15分足', factor: 3 },
      { id: '1h', label: '1時間足', factor: 12 },
      { id: '4h', label: '4時間足', factor: 48 },
      { id: '1d', label: '日足', factor: 288 }
    ],

    chart: { visibleBars: 70, minVisible: 30, maxVisible: 160 },

    // 戦闘・成長バランス
    battle: {
      playerBaseHp: 100,
      playerBaseMp: 20,
      hintMpCost: 5,
      enemyAttackBase: 12,
      expPerScore: 1.2,                      // スコア1点あたりの経験値
      expLevelBase: 100                      // レベルアップ必要経験値の基準
    },

    version: '1.0.0'
  };

  root.CONFIG = CONFIG;
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
