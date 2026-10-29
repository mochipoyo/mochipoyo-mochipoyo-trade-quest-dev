/* =========================================================
   Data / Learning events : 章ごとの学習イベント（必修・任意）と、学習で解放される特殊能力
   ・必修イベントは各章に1つ。初回は説明つき、復習は短時間で挑戦できる
   ・未解放の地域（時間軸の神殿・MACDの塔・資金管理の城）は mapId:null の将来データとして用意
   ・教育内容は「もちぽよ手法」の範囲に限り、未指定の細部は確定しない
   ========================================================= */
(function (root) {
  'use strict';

  var LEARN_EVENTS = [
    { id: 'learn_basic', chapter: 1, region: '始まりの村', title: 'はじめてのトレード', topic: 'action', required: true, tutorial: true, mapId: 'poyo_village', ability: null, next: 'learn_dow',
      summary: 'ローソク足・買いと売り・損切り・上昇/下降/レンジ' },
    { id: 'learn_dow', chapter: 2, region: 'ダウの森', title: 'ダウの試練', topic: 'dow', required: true, mapId: 'lost_forest', minScore: 60, ability: 'dow_eye', next: 'learn_ema',
      summary: '高値・安値の切り上げ/切り下げ、トレンド継続・転換、押し目・戻り目',
      lesson: ['【ダウ理論】高値と安値が切り上がるかぎり上昇トレンドは続き、切り下がるかぎり下降トレンドは続く。', '直近の「確定した」高値・安値を前のものと比べる。ZigZagの最後の未確定の波は根拠にしない。', '上昇中の一時的な下げが押し目、下降中の一時的な上げが戻り目。押し目・戻り目から上位足の方向へ反発し始めた場面が狙い目。', '高値の切り上げが途切れ、安値を割ったら転換のサイン。切り上げ・切り下げが揃わなければレンジ＝見送り。'],
      scenarios: ['clear_up', 'clear_down', 'up_pullback', 'down_rally', 'range', 'reversal_confirmed_down', 'reversal_confirmed_up', 'range_high'], reward: { exp: 40, gold: 150, item: 'potion' } },
    { id: 'learn_ema', chapter: 3, region: '移動平均の山', title: '移動平均の試練', topic: 'ema', required: true, mapId: 'emal_pass', minScore: 60, ability: 'ema_blessing', next: 'learn_mtf',
      summary: 'EMA20/30/40の並びと傾き、グランビルの法則、押し目・戻り目との整合',
      lesson: ['【EMA20/30/40】上から20＞30＞40の順なら上昇の並び、20＜30＜40なら下降の並び。3本が絡み合っていれば方向感なし。', '並びだけでなく傾きも見る。3本が同じ方向に傾き、間隔が開いていくほどトレンドが強い。', '【グランビルの法則（基本）】上昇の並びの中で価格がEMAまで押して反発する場面は買いの候補。下降の並びで戻って反落する場面は売りの候補。EMAから大きく離れた場面での飛び乗りは避ける。', 'EMAの押し目・戻り目は、ダウ理論の押し目・戻り目と重なっているかを確認する。根拠が重なるほど優位性が高い。'],
      scenarios: ['clear_up', 'clear_down', 'up_pullback', 'down_rally', 'jump_in', 'up_ema_bounce', 'down_ema_reject', 'breakout_retest'], reward: { exp: 70, gold: 250, item: 'hi_potion' } },
    { id: 'learn_mtf', chapter: 4, region: '時間軸の神殿', title: '時間軸の試練', topic: 'mtf', required: true, mapId: null, minScore: 60, ability: 'higher_tf_eye', next: 'learn_rci',
      summary: '日足・4時間足で環境認識、1時間足で確認、15分足・5分足でエントリー判断',
      lesson: ['【マルチタイムフレーム】日足・4時間足で大きな方向（環境）を認識し、1時間足で必要に応じて確認し、15分足・5分足でエントリーの判断をする。', '上位足と下位足の方向が一致した場面だけを狙う。不一致なら見送り。', '下位足だけを見て飛び乗ると、上位足の流れに逆らった「逆張り」になりやすい。'],
      scenarios: ['mtf_conflict', 'mtf_conflict_up', 'clear_up_5m', 'clear_down_5m', 'up_pullback_1h', 'regular_bull', 'regular_bear'], reward: { exp: 120, gold: 400, item: 'ether' } },
    { id: 'learn_rci', chapter: 5, region: 'RCIの洞窟', title: 'RCIの試練', topic: 'rci', required: true, mapId: 'oblivion_cave_3', minScore: 60, ability: 'rci_counter', next: 'learn_macd',
      summary: 'RCI9、±70到達後の反転、トレンド方向との整合、単純な逆張りの危険',
      lesson: ['【RCI(9)】+70以上は買われすぎ圏、−70以下は売られすぎ圏。ただし到達「だけ」では根拠にならない。', '強いトレンドでは+70に張り付いたまま上昇が続く。+70だから売る、という逆張りは危険。', '使い方は「上位足の方向と同じ向きに、±70圏から反転し始めたのを確認する」。上昇トレンドの押し目で−70圏から上向きに反転した場面などが候補。', '反転の確認がない、またはトレンド方向と逆の反転はエントリーしない。'],
      scenarios: ['up_pullback', 'down_rally', 'rci_hot_trend', 'rci_cold_trend', 'up_pullback_5m', 'down_rally_5m', 'regular_bull', 'regular_bear'], reward: { exp: 150, gold: 500, item: 'ether' } },
    { id: 'learn_macd', chapter: 6, region: 'MACDの塔', title: 'MACDの試練', topic: 'macd', required: true, mapId: null, minScore: 60, ability: 'macd_hidden_strike', next: 'learn_risk',
      summary: 'MACD(6,13,4)、通常・ヒドゥンダイバージェンス、波形・上位足との整合',
      lesson: ['【MACD(6,13,4)】通常ダイバージェンス：価格が安値を切り下げているのにMACDが切り上げ（強気）／価格が高値を切り上げているのにMACDが切り下げ（弱気）。勢いの衰えを示す。', '【ヒドゥンダイバージェンス】価格が安値を切り上げているのにMACDが切り下げ（強気）／価格が高値を切り下げているのにMACDが切り上げ（弱気）。トレンド継続を示す。', 'ダイバージェンス単独では使わない。波形（ダウ理論）と上位足の方向に整合して初めて根拠になる。'],
      scenarios: ['hidden_bull', 'hidden_bear', 'regular_bull', 'regular_bear', 'div_against_htf', 'div_bear_against_htf'], reward: { exp: 200, gold: 700, item: 'elixir' } },
    { id: 'learn_risk', chapter: 7, region: '資金管理の城', title: '資金管理の試練', topic: 'risk', required: true, mapId: null, minScore: 60, ability: 'stoploss_shield', next: null,
      summary: '損切り、リスクリワード、ロット管理、連敗時の判断、無理なエントリーの回避',
      lesson: ['【損切り】エントリー前に必ず決める。直近スイングの外側が基本。損切りなしは最も危険。', '【リスクリワード】利確幅は損切り幅の1.5〜3倍を参考に。悪い場面は見送る。', '【ロット管理】1トレードの損失を資金の1〜2%程度に抑える。連敗したら休む、ロットを上げて取り返そうとしない。', '根拠が揃わない場面・飛び乗り・リスクリワードの悪い場面は見送る。見送りも判断。'],
      scenarios: ['bad_rr', 'bad_rr_sell', 'jump_in', 'jump_in_down', 'pullback_tight_sl', 'whipsaw', 'false_breakout'], reward: { exp: 250, gold: 1000, item: 'elixir' } },
    // ---- 任意の練習（石碑）：短時間で挑戦。報酬は小さめ・初回のみ ----
    { id: 'practice_forest', chapter: 2, region: 'ダウの森', title: '波形の石碑', topic: 'dow', required: false, mapId: 'lost_forest', scenarios: ['clear_up', 'clear_down', 'range', 'up_pullback', 'range_high', 'clear_up_5m'], reward: { exp: 15, gold: 40 } },
    { id: 'practice_dow_road', chapter: 2, region: 'ダウの森', title: '旅人の石碑', topic: 'dow', required: false, mapId: 'world', scenarios: ['down_rally', 'false_breakout', 'clear_down', 'false_breakdown', 'clear_down_5m'], reward: { exp: 15, gold: 40 } },
    { id: 'practice_mountain', chapter: 3, region: '移動平均の山', title: 'EMAの石碑', topic: 'ema', required: false, mapId: 'emal_pass', scenarios: ['up_pullback', 'down_rally', 'jump_in', 'range', 'up_ema_bounce', 'down_ema_reject'], reward: { exp: 25, gold: 60 } },
    { id: 'practice_cave', chapter: 5, region: 'RCIの洞窟', title: '反転の石碑', topic: 'rci', required: false, mapId: 'oblivion_cave_1', scenarios: ['rci_hot_trend', 'rci_cold_trend', 'up_pullback', 'up_pullback_5m', 'regular_bull', 'mtf_conflict'], reward: { exp: 30, gold: 80 } },
    { id: 'practice_cave2', chapter: 5, region: 'RCIの洞窟', title: '深部の石碑', topic: 'rci', required: false, mapId: 'oblivion_cave_2', scenarios: ['down_rally', 'down_rally_5m', 'regular_bear', 'hidden_bear', 'bad_rr', 'mtf_conflict_up'], reward: { exp: 35, gold: 90 } }
  ];

  // 学習で解放される特殊能力（主人公の特技として追加）。解放条件＝必修イベント達成＋その分野の理解度
  var ABILITIES = {
    dow_eye: { skill: 'dow_eye', name: 'ダウの眼', topic: 'dow', event: 'learn_dow', desc: '敵の行動傾向と弱点を見抜き、防御を崩す' },
    ema_blessing: { skill: 'ema_blessing', name: 'EMAの加護', topic: 'ema', event: 'learn_ema', desc: '味方全体の防御力を上げる' },
    higher_tf_eye: { skill: 'higher_tf_eye', name: '上位足の眼', topic: 'mtf', event: 'learn_mtf', desc: '敵全体の弱点を見抜き、味方の素早さを上げる' },
    rci_counter: { skill: 'rci_counter', name: 'RCIリバーサル（反転）', topic: 'rci', event: 'learn_rci', desc: '過熱した敵の攻撃力を下げる' },
    macd_hidden_strike: { skill: 'macd_hidden_strike', name: 'MACDヒドゥンストライク', topic: 'macd', event: 'learn_macd', desc: '隠れた継続の力を一点に集める特殊攻撃' },
    stoploss_shield: { skill: 'stoploss_shield', name: '損切りシールド', topic: 'risk', event: 'learn_risk', desc: '味方1人の被ダメージを大きく減らす' },
    patience_stance: { skill: 'patience_stance', name: '忍耐の構え', topic: 'skip', event: 'learn_basic', desc: 'このターン仲間をかばい、反撃する（見送りの規律を理解すると解放）' }
  };

  root.LEARN_EVENTS = LEARN_EVENTS; root.LEARN_ABILITIES = ABILITIES;
  root.learnEvent = function (id) { for (var i = 0; i < LEARN_EVENTS.length; i++) if (LEARN_EVENTS[i].id === id) return LEARN_EVENTS[i]; return null; };
})(typeof window !== 'undefined' ? window : globalThis);
