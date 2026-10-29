/* =========================================================
   もちぽよFXクエスト - 学習シナリオ（固定シードの人工データ）
   ・すべて5分足を元データとして生成し、上位足は集約で作る（MTF整合）
   ・各シナリオは check() で「チャートが想定どおりの状態か」を検証してから採用する
   ・新しいシナリオは SCENARIO_DEFS に追加するだけで戦闘・ダンジョンに登場する
   ========================================================= */
(function (root) {
  'use strict';

  var CONFIG = root.CONFIG || require('./config.js');
  var Indicators = root.Indicators || require('./indicators.js');

  /* ---------- 乱数（固定シード） ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) { // Box-Muller
    var u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------- セグメントからローソク足を生成 ---------- */
  // segment: { bars, drift(pips 合計), wave:{amp(pips), period(bars)}, noise(pips, 省略可) }
  function buildCandles(segments, seed, basePrice, pip) {
    var rnd = mulberry32(seed);
    var candles = [];
    var level = basePrice;
    var prevClose = basePrice;
    var ar = 0; // 自己相関つきノイズ
    var t = 0;
    for (var s = 0; s < segments.length; s++) {
      var seg = segments[s];
      var per = seg.drift * pip / seg.bars;
      var noiseAmp = (seg.noise === undefined ? 2.2 : seg.noise) * pip;
      for (var i = 0; i < seg.bars; i++) {
        var wave = 0;
        if (seg.wave) {
          // 波の差分（前の位置との差）を加える
          var ph0 = (i / seg.wave.period) * Math.PI * 2;
          var ph1 = ((i + 1) / seg.wave.period) * Math.PI * 2;
          wave = seg.wave.amp * pip * (Math.sin(ph1) - Math.sin(ph0));
        }
        level += per + wave;
        ar = ar * 0.6 + gauss(rnd) * noiseAmp;
        var close = level + ar;
        var open = prevClose;
        var hi = Math.max(open, close) + Math.abs(gauss(rnd)) * noiseAmp * 0.8;
        var lo = Math.min(open, close) - Math.abs(gauss(rnd)) * noiseAmp * 0.8;
        candles.push({ o: round(open), h: round(hi), l: round(lo), c: round(close), t: t++ });
        prevClose = close;
      }
    }
    return candles;
  }
  function round(v) { return Math.round(v * 1000) / 1000; }

  /* ---------- セグメント作成ヘルパー（単位：5分足の本数） ---------- */
  var DAY = 288, H4 = 48, H1 = 12, M15 = 3;
  function seg(bars, drift, wave, noise) { return { bars: bars, drift: drift, wave: wave || null, noise: noise }; }
  // 背景トレンド（日足・4時間足で見える大きな流れ）
  function background(totalBars, drift, waveAmp) {
    return seg(totalBars, drift, { amp: waveAmp, period: DAY * 7 });
  }
  function sumBars(segs) { return segs.reduce(function (a, s) { return a + s.bars; }, 0); }

  // 合計本数をTOTALに合わせる（先頭の背景セグメントで調整）
  var TOTAL = CONFIG.market.days * DAY;
  function fit(tail, bgDrift, bgWave) {
    var tailBars = sumBars(tail);
    var bg = background(TOTAL - tailBars, bgDrift, bgWave);
    return [bg].concat(tail);
  }

  /* ---------- シナリオ定義 ---------- */
  // correct: 'buy' | 'sell' | 'skip'
  // focusTF: エントリー判断を行う時間足（判定・将来の値動き再生もこの足で行う）
  var SCENARIO_DEFS = [
    {
      id: 'clear_up', title: '明確な上昇トレンド', chapter: 2, correct: 'buy', focusTF: '15m', seed: 101,
      segments: fit([
        seg(H4 * 6, 240, { amp: 25, period: H1 * 3 }),  // 高値安値を切り上げる上昇
        seg(H1 * 2, -45, null, 1.6),                     // 浅い押し
        seg(M15 * 3, 14, null, 1.6)                       // 押し目からの反発（まだ始まったばかり）
      ], 1400, 150),
      future: [seg(H4 * 2, 90, { amp: 20, period: H1 * 2 }), seg(H4 * 10, 120, { amp: 30, period: H1 * 4 })],
      check: function (st) { return st['4h'].emaOrder === 'up' && st['15m'].dow.trend === 'up' && st['15m'].emaOrder === 'up'; },
      requireHigherTF: true,
      hint: '高値と安値はどちらに向かって切り上がっている？ 直近の浅い押しから反発し始めているかも確認しよう。',
      explain: {
        buy: '上位足（4時間足）も15分足も高値・安値を切り上げる上昇トレンド。EMAも上昇の並びで、浅い押し目から反発し始めた場面なので、順張りの買いが適切です。',
        sell: '高値・安値を切り上げている相場で売るのは、根拠のない逆張りです。上位足の方向に逆らったエントリーは避けましょう。',
        skip: '見送り自体は致命傷ではありませんが、この場面は上位足も下位足も上昇で揃い、押し目からの反発という優位性のある場面でした。何を根拠に見送ったのかを振り返りましょう。'
      }
    },
    {
      id: 'clear_down', title: '明確な下降トレンド', chapter: 2, correct: 'sell', focusTF: '15m', seed: 102,
      segments: fit([
        seg(H4 * 6, -240, { amp: 25, period: H1 * 3 }),
        seg(H1 * 2, 45, null, 1.6),
        seg(M15 * 3, -14, null, 1.6)
      ], -1400, 150),
      future: [seg(H4 * 2, -90, { amp: -20, period: H1 * 2 }), seg(H4 * 10, -120, { amp: -30, period: H1 * 4 })],
      check: function (st) { return st['4h'].emaOrder === 'down' && st['15m'].dow.trend === 'down' && st['15m'].emaOrder === 'down'; },
      requireHigherTF: true,
      hint: '高値も安値も切り下げている。戻りが浅く終わって下げ始めたところに注目。',
      explain: {
        sell: '上位足も15分足も高値・安値を切り下げる下降トレンド。EMAも下降の並びで、戻りから再び下げ始めた場面なので、順張りの売りが適切です。',
        buy: '安値を切り下げている相場での買いは根拠のない逆張りです。下降トレンドでは戻り売りが基本です。',
        skip: '見送りは致命傷ではありませんが、上位足と下位足の方向が揃った戻り売りの場面でした。'
      }
    },
    {
      id: 'up_pullback', title: '上昇トレンド中の押し目', chapter: 3, correct: 'buy', focusTF: '15m', seed: 103,
      segments: fit([
        seg(H4 * 5, 260, { amp: 30, period: H1 * 4 }),
        seg(H1 * 3, -72, null, 1.8),                      // EMA40付近までの押し
        seg(M15 * 3, 15, null, 1.6)                        // 反発（RCIが-70側から戻り始める）
      ], 1500, 140),
      future: [seg(H4 * 3, 130, { amp: 25, period: H1 * 3 }), seg(H4 * 9, 100, { amp: 30, period: H1 * 4 })],
      check: function (st) {
        var f = st['15m'];
        return st['4h'].emaOrder === 'up' && f.rciState === 'oversold_reversal' && f.emaOrder === 'up';
      },
      requireHigherTF: true,
      hint: '上位足は上昇。15分足ではEMA付近まで押して、RCIが-70付近から反転し始めている。',
      explain: {
        buy: '4時間足の上昇トレンドの中で、15分足がEMAの束まで押し目を作り、RCIが-70付近から反転。EMAの並びも上昇のまま。複数の根拠が重なる押し目買いの場面です。',
        sell: '押し目は「安く買うチャンス」であって、売る場面ではありません。上位足の上昇に逆らった売りになります。',
        skip: '優位性の高い押し目買いの場面を見送りました。致命傷ではありませんが、根拠が揃ったときに行動できるようになりましょう。'
      }
    },
    {
      id: 'down_rally', title: '下降トレンド中の戻り', chapter: 3, correct: 'sell', focusTF: '15m', seed: 104,
      segments: fit([
        seg(H4 * 5, -260, { amp: 30, period: H1 * 4 }),
        seg(H1 * 3, 72, null, 1.8),
        seg(M15 * 3, -15, null, 1.6)
      ], -1500, 140),
      future: [seg(H4 * 3, -130, { amp: -25, period: H1 * 3 }), seg(H4 * 9, -100, { amp: -30, period: H1 * 4 })],
      check: function (st) {
        var f = st['15m'];
        return st['4h'].emaOrder === 'down' && f.rciState === 'overbought_reversal' && f.emaOrder === 'down';
      },
      requireHigherTF: true,
      hint: '上位足は下降。15分足はEMAの束まで戻し、RCIが+70付近から反転し始めている。',
      explain: {
        sell: '4時間足の下降トレンドの中で、15分足がEMAまで戻りを作り、RCIが+70付近から反転。EMAの並びも下降のまま。根拠が重なる戻り売りの場面です。',
        buy: '戻りは「高く売るチャンス」であって、買う場面ではありません。上位足の下降に逆らった買いになります。',
        skip: '優位性の高い戻り売りの場面でした。見送りは致命傷ではありませんが、根拠が揃った場面では行動できるようにしましょう。'
      }
    },
    {
      id: 'hidden_bull', title: '上昇トレンド中のヒドゥンダイバージェンス', chapter: 6, correct: 'buy', focusTF: '15m', seed: 105,
      segments: fit([
        seg(H1 * 5, 130, null, 1.8),                       // 推進波1
        seg(M15 * 8, -32, null, 1.5),                      // 速く浅い押し（安値1）
        seg(H1 * 5, 125, null, 1.8),                       // 推進波2
        seg(M15 * 24, -78, null, 1.5),                     // ゆっくり深めの押し（安値2は安値1より高い、MACDはより低い）
        seg(M15 * 4, 16, null, 1.5)
      ], 1500, 140),
      future: [seg(H4 * 3, 140, { amp: 25, period: H1 * 3 }), seg(H4 * 9, 90, { amp: 30, period: H1 * 4 })],
      check: function (st) { var f = st['15m']; return st['4h'].emaOrder === 'up' && f.div.hiddenBull && f.dow.trend === 'up'; },
      requireHigherTF: true,
      hint: '価格の安値は切り上がっているのに、MACDの安値は切り下がっていないか？',
      explain: {
        buy: '上昇トレンドの押し目で、価格は安値を切り上げ、MACDは安値を切り下げる「ヒドゥンダイバージェンス」。トレンド継続の候補として、上位足の方向と整合した買いが適切です（単独で成功を保証するサインではありません）。',
        sell: 'ヒドゥンダイバージェンスはトレンド継続のサインの候補です。これを通常のダイバージェンスと混同して逆張りすると、トレンドに逆らうことになります。',
        skip: 'トレンド方向・押し目・ヒドゥンダイバージェンスと根拠が重なる場面でした。見送りは致命傷ではありませんが、根拠が揃った場面を見極める練習をしましょう。'
      }
    },
    {
      id: 'hidden_bear', title: '下降トレンド中のヒドゥンダイバージェンス', chapter: 6, correct: 'sell', focusTF: '15m', seed: 106,
      segments: fit([
        seg(H1 * 5, -130, null, 1.8),
        seg(M15 * 8, 32, null, 1.5),
        seg(H1 * 5, -125, null, 1.8),
        seg(M15 * 24, 78, null, 1.5),
        seg(M15 * 4, -16, null, 1.5)
      ], -1500, 140),
      future: [seg(H4 * 3, -140, { amp: -25, period: H1 * 3 }), seg(H4 * 9, -90, { amp: -30, period: H1 * 4 })],
      check: function (st) { var f = st['15m']; return st['4h'].emaOrder === 'down' && f.div.hiddenBear && f.dow.trend === 'down'; },
      requireHigherTF: true,
      hint: '価格の高値は切り下がっているのに、MACDの高値は切り上がっていないか？',
      explain: {
        sell: '下降トレンドの戻りで、価格は高値を切り下げ、MACDは高値を切り上げる「ヒドゥンダイバージェンス」。トレンド継続の候補として、上位足と整合した売りが適切です。',
        buy: 'ヒドゥンダイバージェンスは継続サインの候補です。転換サインと混同して買うと、トレンドに逆らうことになります。',
        skip: '根拠が重なる戻り売りの場面でした。見送りは致命傷ではありませんが、根拠の重なりを見極めましょう。'
      }
    },
    {
      id: 'regular_bull', title: '通常の強気ダイバージェンス（上位足上昇の押し目）', chapter: 6, correct: 'buy', focusTF: '15m', seed: 107,
      segments: fit([
        seg(H4 * 4, -150, { amp: 20, period: H1 * 3 }),    // 4時間足の押し目（調整波）
        seg(H1 * 3, -85, null, 1.8),                       // 速い下落（安値1）
        seg(H1 * 2, 40, null, 1.5),
        seg(M15 * 26, -62, null, 1.5),                     // ゆっくり安値更新（安値2は安値1より低い、MACDは高い）
        seg(M15 * 4, 14, null, 1.5)
      ], 2200, 150),
      future: [seg(H4 * 3, 150, { amp: 25, period: H1 * 3 }), seg(H4 * 9, 120, { amp: 30, period: H1 * 4 })],
      check: function (st) { var f = st['15m']; return st['1d'].emaOrder === 'up' && f.div.regularBull && f.dow.ll; },
      requireHigherTF: true,
      hint: '日足は上昇。15分足は安値を切り下げているが、MACDは切り下げていない。',
      explain: {
        buy: '日足が上昇トレンドで、4時間足は押し目を形成中。15分足では価格が安値を切り下げる一方、MACDの安値は切り上がる「通常の強気ダイバージェンス」で下落の勢いが弱まっています。上位足の方向と整合した転換候補なので買いが適切です。',
        sell: '15分足だけ見れば下降ですが、日足は上昇トレンドで、下落の勢いが弱まる強気ダイバージェンスが出ています。上位足に逆らった売りは避けましょう。',
        skip: '上位足の方向と転換サインが整合した場面でした。見送りは致命傷ではありませんが、通常のダイバージェンスが「上位足の押し目で出た」場合は買いの根拠になることを覚えましょう。'
      }
    },
    {
      id: 'regular_bear', title: '通常の弱気ダイバージェンス（上位足下降の戻り）', chapter: 6, correct: 'sell', focusTF: '15m', seed: 108,
      segments: fit([
        seg(H4 * 4, 150, { amp: 20, period: H1 * 3 }),
        seg(H1 * 3, 85, null, 1.8),
        seg(H1 * 2, -40, null, 1.5),
        seg(M15 * 26, 62, null, 1.5),
        seg(M15 * 4, -14, null, 1.5)
      ], -2200, 150),
      future: [seg(H4 * 3, -150, { amp: -25, period: H1 * 3 }), seg(H4 * 9, -120, { amp: -30, period: H1 * 4 })],
      check: function (st) { var f = st['15m']; return st['1d'].emaOrder === 'down' && f.div.regularBear && f.dow.hh; },
      requireHigherTF: true,
      hint: '日足は下降。15分足は高値を切り上げているが、MACDは切り上げていない。',
      explain: {
        sell: '日足が下降トレンドで、4時間足は戻りを形成中。15分足では価格が高値を切り上げる一方、MACDの高値は切り下がる「通常の弱気ダイバージェンス」。上位足と整合した転換候補なので売りが適切です。',
        buy: '15分足だけ見れば上昇ですが、日足は下降トレンドで上昇の勢いが弱まっています。上位足に逆らった買いは避けましょう。',
        skip: '上位足の方向と転換サインが整合した場面でした。致命傷ではありませんが、通常のダイバージェンスが上位足の戻りで出た場合は売りの根拠になります。'
      }
    },
    {
      id: 'range', title: 'レンジ相場', chapter: 2, correct: 'skip', focusTF: '15m', seed: 109,
      segments: fit([
        seg(H4 * 14, 0, { amp: 45, period: H1 * 10 }, 2.0),
        seg(H4 * 6, 0, { amp: 40, period: H1 * 5 }, 2.0)
      ], 0, 90),
      future: [seg(H4 * 6, 0, { amp: 40, period: H1 * 5 }, 2.0), seg(H4 * 6, 0, { amp: 45, period: H1 * 6 }, 2.0)],
      check: function (st) { return st['4h'].emaOrder === 'mixed' && st['15m'].emaOrder !== 'up' || st['4h'].dow.trend === 'range'; },
      requireHigherTF: true,
      hint: '高値も安値も同じ水準で往復している。EMAは絡み合っていないか？',
      explain: {
        skip: '上位足も下位足も高値・安値の切り上げ/切り下げがなく、EMAは絡み合っています。方向感のないレンジでは優位性が低いため、見送りが正解です。「無理にトレードしない」ことも立派な判断です。',
        buy: 'レンジ内での売買は優位性が低く、往復ビンタになりやすい場面です。トレンドが出るまで待ちましょう。',
        sell: 'レンジ内での売買は優位性が低く、損切りを繰り返しやすい場面です。方向感が出るまで待ちましょう。'
      }
    },
    {
      id: 'false_breakout', title: 'ダマシのブレイクアウト', chapter: 4, correct: 'skip', focusTF: '15m', seed: 110,
      segments: fit([
        seg(H4 * 8, 0, { amp: 40, period: H1 * 6 }, 2.0),  // 4時間足下降の途中にできたレンジ
        seg(M15 * 6, 85, null, 2.0)                        // レンジ上限を急騰で突き抜ける（RCI過熱）
      ], -1800, 150),
      future: [seg(H1 * 2, 10, null, 2.0), seg(H4 * 3, -150, { amp: 20, period: H1 * 3 }), seg(H4 * 8, -100, { amp: 30, period: H1 * 4 })],
      check: function (st) { var f = st['15m']; return st['4h'].emaOrder === 'down' && f.rciNow >= CONFIG.rci.hot && f.surge > 40; },
      requireHigherTF: true,
      hint: '急騰して気持ちが高ぶるが、上位足はどちらに向いている？ 飛び乗りは禁物。',
      explain: {
        skip: '15分足はレンジの上限を急騰で抜けましたが、4時間足は下降トレンドで、RCIも+70を超えて過熱しています。上位足に逆らうブレイクへの飛び乗りはダマシになりやすく、見送りが適切です。',
        buy: 'ブレイクアウトへの飛び乗りエントリーです。上位足が下降している中での急騰は戻りになりやすく、損切り位置も遠くなります。',
        sell: '方向は上位足と整合していますが、急騰直後に反射的に売るのは根拠のない逆張りです。戻りが終わる根拠（RCIの反転やEMAへの戻り）を待ちましょう。'
      }
    },
    {
      id: 'mtf_conflict', title: '上位足と下位足の方向不一致', chapter: 4, correct: 'skip', focusTF: '15m', seed: 111,
      segments: fit([
        seg(H4 * 4, 190, { amp: 25, period: H1 * 3 }),     // 4時間足下降の中の戻り（15分足では上昇に見える）
        seg(H1 * 2, -40, null, 1.6),
        seg(M15 * 4, 16, null, 1.6)
      ], -2200, 150),
      future: [seg(H1 * 3, 20, null, 1.8), seg(H4 * 4, -200, { amp: 25, period: H1 * 3 }), seg(H4 * 7, -80, { amp: 30, period: H1 * 4 })],
      check: function (st) { return st['1d'].emaOrder === 'down' && st['4h'].emaOrder === 'down' && st['15m'].emaOrder === 'up' && st['15m'].dow.trend === 'up'; },
      requireHigherTF: true,
      hint: '15分足だけ見れば綺麗な上昇。でも日足と4時間足はどちらを向いている？',
      explain: {
        skip: '15分足は高値安値を切り上げる上昇ですが、日足・4時間足は下降トレンドです。下位足の上昇は上位足の「戻り」である可能性が高く、方向が揃っていない場面は見送りが適切です。',
        buy: '上位足を無視したエントリーです。15分足の上昇は4時間足の戻りに過ぎない可能性が高く、上位足の下落が再開すると巻き込まれます。',
        sell: '上位足の方向とは整合していますが、15分足はまだ上昇中で戻りが終わった根拠がありません。戻りの終わりを示す根拠を待ってからにしましょう。'
      }
    },
    {
      id: 'bad_rr', title: 'リスクリワードが悪く見送るべき場面', chapter: 7, correct: 'skip', focusTF: '15m', seed: 112,
      segments: fit([
        seg(H4 * 6, 0, { amp: 45, period: H1 * 8 }, 2.0),  // 直前の高値が上にある（天井の意識）
        seg(H1 * 4, -120, null, 1.8),
        seg(H1 * 6, 165, null, 1.8)                        // 押し目なしで一直線に上昇、EMA20から大きく乖離
      ], 1600, 150),
      future: [seg(H1 * 3, 25, null, 1.8), seg(H4 * 3, -120, { amp: 20, period: H1 * 3 }), seg(H4 * 8, 60, { amp: 30, period: H1 * 4 })],
      check: function (st) { var f = st['15m']; return st['4h'].emaOrder === 'up' && f.distFromEma20 > 25 && f.rciNow >= CONFIG.rci.hot; },
      requireHigherTF: true,
      hint: '方向は合っている。でも損切り位置（直近安値）はどこ？ 利確の目標まで何pipsある？',
      explain: {
        skip: '上位足は上昇で方向は合っていますが、押し目なしで一直線に上がった直後で、EMA20から大きく乖離しています。直近安値（損切り位置）は遠く、上には直前の高値が迫っており、リスクリワードが悪い場面です。押し目を待つ見送りが適切です。',
        buy: '方向は合っていますが、損切り位置が遠く利確目標が近いため、リスクリワードが悪いトレードです。EMAまで押すのを待てば同じ方向をより良い条件で狙えます。',
        sell: '上昇トレンド中の逆張りです。乖離が大きいからという理由だけで売るのは根拠不足です。'
      }
    },
    {
      id: 'jump_in', title: '急騰直後の飛び乗り誘惑', chapter: 7, correct: 'skip', focusTF: '15m', seed: 113,
      segments: fit([
        seg(H4 * 6, 160, { amp: 30, period: H1 * 4 }),
        seg(H1 * 3, -50, null, 1.6),
        seg(M15 * 5, 95, null, 2.2)                        // わずか5本で急騰
      ], 1400, 150),
      future: [seg(H1 * 4, -70, null, 1.8), seg(H4 * 3, 110, { amp: 20, period: H1 * 3 }), seg(H4 * 8, 90, { amp: 30, period: H1 * 4 })],
      check: function (st) { var f = st['15m']; return st['4h'].emaOrder === 'up' && f.surge > 60 && f.distFromEma20 > 30; },
      requireHigherTF: true,
      hint: 'たった数本で大きく動いた直後。今入ると損切りはどこに置く？',
      explain: {
        skip: '上位足は上昇で方向は合っていますが、わずか数本で急騰した直後です。ここで飛び乗ると損切り位置が遠く、急騰後の押しで振り落とされやすくなります。押し目を待つ見送りが適切です。',
        buy: '飛び乗りエントリーです。方向は合っていても、急騰直後はリスクリワードが悪く、押しで損切りにかかりやすい場面です。',
        sell: '上昇トレンド中の逆張りです。「上がりすぎたから」は根拠になりません。'
      }
    },
    {
      id: 'rci_hot_trend', title: 'RCI+70でも続く強い上昇（逆張り禁止）', chapter: 5, correct: 'skip', focusTF: '15m', seed: 114,
      segments: fit([
        seg(H4 * 6, 180, { amp: 20, period: H1 * 4 }),
        seg(H1 * 5, 110, { amp: 6, period: M15 * 8 }, 1.4)  // 押し目を作らずEMA20に沿って上昇し続ける
      ], 1400, 150),
      future: [seg(H1 * 3, 35, null, 1.6), seg(H1 * 3, -60, null, 1.6), seg(H4 * 9, 120, { amp: 25, period: H1 * 4 })],
      check: function (st) { var f = st['15m']; return st['4h'].emaOrder === 'up' && f.emaOrder === 'up' && f.rciNow >= CONFIG.rci.hot && f.rciState !== 'overbought_reversal'; },
      requireHigherTF: true,
      hint: 'RCIが+70にいるだけで売るのは正しい？ トレンド方向と押し目の有無を確認。',
      explain: {
        skip: 'RCIが+70以上に張り付いていますが、これは強い上昇トレンドの特徴でもあります。RCIの水準だけで逆張りするのは誤りで、押し目もまだできていないため買いの根拠も不足しています。押し目（RCIの反転）を待つ見送りが適切です。',
        buy: '方向は上位足と合っていますが、押し目がなくRCIも過熱したままの場面で、損切り位置が遠くなります。押し目でRCIが-70側から反転するのを待ちましょう。',
        sell: 'RCIが+70に到達しただけで機械的に逆張りするのは、この手法で最も避けるべき行動のひとつです。トレンド方向と他の根拠との組み合わせが必要です。'
      }
    }
  ];

  /* ---------- シナリオ構築（検証つき） ---------- */
  var cache = {};

  function statesFor(base, future, cfg) {
    var st = {};
    cfg.timeframes.forEach(function (tf) {
      var c = Indicators.aggregate(base, tf.factor);
      st[tf.id] = Indicators.analyze(c, cfg);
      st[tf.id].future = Indicators.aggregate(base.concat(future), tf.factor).slice(c.length);
    });
    return st;
  }

  // seedOffset を変えると同じ構造の別データ（エンドレスダンジョン用）。check() を通らない乱数は採用しない。
  function build(id, seedOffset) {
    seedOffset = seedOffset || 0;
    var key = id + ':' + seedOffset;
    if (cache[key]) return cache[key];
    var def = null;
    for (var i = 0; i < SCENARIO_DEFS.length; i++) if (SCENARIO_DEFS[i].id === id) def = SCENARIO_DEFS[i];
    if (!def) throw new Error('unknown scenario ' + id);
    var cfg = CONFIG, pip = cfg.market.pip;
    var result = null;
    var tries = 0, s = def.seed + seedOffset * 7919;
    var fallback = null;
    while (tries < 25) {
      var all = buildCandles(def.segments.concat(def.future), s, cfg.market.basePrice, pip);
      var base = all.slice(0, TOTAL);
      var fut = all.slice(TOTAL);
      var st = statesFor(base, fut, cfg);
      var ok = false;
      try { ok = !!def.check(st); } catch (e) { ok = false; }
      var obj = { def: def, seed: s, states: st, base: base, future: fut, valid: ok };
      if (ok) { result = obj; break; }
      if (!fallback) fallback = obj;
      s += 131; tries++;
    }
    if (!result) {
      // 検証に通らなかった場合は基準シードで再生成（valid:false のまま、UIで注意表示）
      result = fallback;
    }
    cache[key] = result;
    return result;
  }

  var Scenarios = {
    defs: SCENARIO_DEFS,
    build: build,
    byChapter: function (ch) { return SCENARIO_DEFS.filter(function (d) { return d.chapter === ch; }).map(function (d) { return d.id; }); },
    ids: function () { return SCENARIO_DEFS.map(function (d) { return d.id; }); },
    get: function (id) { for (var i = 0; i < SCENARIO_DEFS.length; i++) if (SCENARIO_DEFS[i].id === id) return SCENARIO_DEFS[i]; return null; },
    _internal: { buildCandles: buildCandles, mulberry32: mulberry32 }
  };

  root.Scenarios = Scenarios;
  if (typeof module !== 'undefined' && module.exports) module.exports = Scenarios;
})(typeof window !== 'undefined' ? window : globalThis);
