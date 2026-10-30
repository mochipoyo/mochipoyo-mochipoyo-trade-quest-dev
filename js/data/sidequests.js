/* =========================================================
   Data / Side (v5.5 Phase 7-1) : 既存地域への追加——ガネス加入（工匠）と個別クエスト「弟の名前」、トレード装備の入手場所
   ・ガネス：ヴェルム解放後、鉱石工場に現れる。ガルドを許していない。鉄鎖鉱山2階の作業日誌で、弟ティモの最後の一日を知る（ガルド同行で和解）
   ・赤い鉱石3つ → 工場長が EMA三重槍を打つ（ガネス加入後）
   ・トレード装備：ダウの大剣（鉱山最深部）、RCIの指輪（鉱山2階）、損切りの短剣・見送りの法衣（配給所の市場）、資金管理の鎧・損切りのお守り（ハルト＝自治会の礼）、
     RCI転輪弓（時計塔1階）、忍耐の鎧（地下施設1階）、上位足の眼鏡（イーリスの机）、ヒドゥンの魔杖（オラクル中枢2層）、MACD双剣・MACDの護符（マクディアの店）、
     時間軸の兜・反転の腕輪（時間銀行の地下契約室／鐘都の防具店）、波形の羅針盤（失敗を禁止された学校）、変動相場のマント・リスクリワードの天秤（鏡の市場：desert.js）
   ========================================================= */
(function (root) {
  'use strict';
  var M = root.MAP_DEFS; function D() { return root.State.data; }
  function inParty(id) { var d = D(); return !!(d.companions[id] && d.party.indexOf(id) >= 0); }
  function chest(map, c) { if (M[map]) M[map].chests.push(c); }
  function wrapNpc(map, id, fn) { var def = M[map]; if (!def) return; var n = def.npcs.filter(function (x) { return x.id === id; })[0]; if (!n) return; var orig = n.talk; n.talk = async function (c) { var done = await fn(c, orig); if (!done) await orig(c); }; }

  /* ---------- 鉱山の赤い鉱石（宝箱＋魔物のドロップ） ---------- */
  chest('iron_mine_1', { id: 'im1_ore', x: 21, y: 1, item: 'ore_chunk', qty: 2 });
  chest('iron_mine_2', { id: 'im2_rci', x: 1, y: 6, item: 'ring_rci', qty: 1 });
  chest('iron_mine_3', { id: 'im3_dow', x: 7, y: 10, item: 'dow_greatsword', qty: 1 });
  chest('iron_mine_3', { id: 'im3_ore', x: 12, y: 3, item: 'ore_chunk', qty: 1 });
  ['ore_bat', 'mine_imp', 'iron_beetle', 'drill_golem', 'ash_golem'].forEach(function (id) { var e = root.ENEMIES[id]; if (e && !(e.drops || []).some(function (x) { return x.item === 'ore_chunk'; })) { e.drops = e.drops || []; e.drops.push({ item: 'ore_chunk', rate: 0.2 }); } });

  /* ---------- 鉄鎖鉱山2階：作業日誌（ガネスの依頼を受けてから） ---------- */
  M.iron_mine_2.events.push({ x: 3, y: 6, type: 'script', solid: true, run: async function (c) { var d = D();
    if (!c.questActive('ganes_brother') && !c.questDone('ganes_brother')) { await c.msg(['崩れた坑道の脇に、潰れた木箱。中に紙の束が見える。……今は、何のためのものかわからない。']); return; }
    if (c.has('shift_log') || d.flags.shift_log_read) { await c.msg(['崩れた坑道。作業日誌はもう持っている。']); return; }
    await c.msg(['木箱の中から、作業日誌が出てきた。', '【作業日誌 落盤の日】「第三坑道：崩落の兆候あり。班長ガルド、作業の中止を進言」', '「監督官ザルグ：却下。ノルマ未達。作業を続行せよ」', '「14時12分 崩落。行方不明：ティモ（17歳）」', '「班長ガルド、単身で坑道に入り捜索。発見できず。ガルドに懲罰：鞭の役に配置替え」']);
    c.give('shift_log', 1); d.flags.shift_log_read = true; await c.msg(['作業日誌を手に入れた。ガネスに見せよう。']);
  } });

  /* ---------- 鉱石工場：ガネス ---------- */
  M.verum_factory.npcs.push({ id: 'fc_ganes', x: 8, y: 8, sprite: 'villager_m', dir: 'down', wander: 0, showIf: 'verum_liberated', hideIf: 'ganes_joined', talk: async function (c) {
    var d = D();
    if (!c.questActive('ganes_brother') && !c.questDone('ganes_brother')) {
      await c.say('ガネス', ['……工匠のガネスだ。工場が止まって、やっと自分の道具を作れる。', inParty('gald') ? '——そいつは。ガルドか。……鞭を持っていた男と、同じ空気は吸いたくない。' : 'あんたたち、ガルドの仲間だろう。……あいつのことは、聞きたくない。', '俺の弟ティモは、第三坑道で死んだ。あの日の班長は、ガルドだった。']);
      if (inParty('gald')) await c.say('ガルド', ['……ガネス。俺は——', '（ガルドは言葉を飲み込んだ）']);
      await c.say('ガネス', ['……あの日の作業日誌が、鉱山2階の崩れた坑道に残っているはずだ。工場の連中は誰も取りに行かない。', '持ってきてくれ。弟の最後の一日を、俺は知らない。']);
      c.questStart('ganes_brother'); return;
    }
    if (!c.has('shift_log')) { await c.say('ガネス', ['作業日誌は、鉄鎖鉱山2階の崩れた坑道だ。']); return; }
    await c.say('ガネス', ['……日誌か。読む。']);
    await c.msg(['ガネスは長いあいだ、同じ頁を見ていた。']);
    await c.say('ガネス', ['「班長ガルド、作業の中止を進言」……「単身で坑道に入り捜索」……「懲罰：鞭の役に配置替え」。', '……知らなかった。あいつは止めようとして、止められなくて、それで鞭を持たされたのか。']);
    if (!inParty('gald') && d.companions.gald) { await c.say('ガネス', ['……ガルドを連れてきてくれ。言わなきゃならないことがある。']); return; }
    if (inParty('gald')) {
      await c.say('ガルド', ['……言い訳はしない。止められなかったのは事実だ。ティモを見つけられなかったのも。', '鞭を持ったのも、俺の手だ。']);
      await c.say('ガネス', ['……ああ。あんたの手だ。', 'でも、坑道に一人で入ったのも、あんたの手だった。……それを、十年知らなかった。', '許すとは言わない。まだ言えない。でも、一緒に歩くことはできる。弟の分まで、何か作る。']);
    }
    c.take('shift_log', 1); await c.questComplete('ganes_brother');
    c.join('ganes'); d.flags.ganes_joined = true; await c.msg(['ガネスが仲間になった！（工匠）', '転職の条件：ガネス加入後、Lv10以上で「工匠」に転職できる', '工場長に赤い鉱石を3つ渡すと、ガネスの設計でEMA三重槍を打ってくれる。']);
    if (!c.questActive('ganes_trident') && !c.questDone('ganes_trident')) c.questStart('ganes_trident');
    await c.remark('io', ['工匠……機械の人。あとで、わたしの関節を見てほしい。'], 'io_remark_ganes');
  } });
  wrapNpc('verum_factory', 'fc_foreman', async function (c) { var d = D();
    if (!d.flags.ganes_joined || c.questDone('ganes_trident')) return false;
    var n = d.inventory.ore_chunk || 0;
    if (n < 3) { await c.say('工場長', ['ガネスから設計図を預かった。三本の穂先の槍だ。赤い鉱石が3つ要る。（' + n + '/3）', '鉱石は鉄鎖鉱山の宝箱か、鉱山の魔物が落とす。']); return true; }
    await c.say('工場長', ['赤い鉱石が3つ。……よし、打とう。']); await c.msg(['……工場の炉に、久しぶりに火が入った。']);
    c.take('ore_chunk', 3); await c.say('工場長', ['EMA三重槍だ。20・30・40——三本の穂先が同じ向きを向いているときが、一番強い。', '……ガネスの言葉だ。']);
    await c.questComplete('ganes_trident'); return true; });

  /* ---------- 配給所の市場：損切りの短剣・見送りの法衣 ---------- */
  wrapNpc('verum_ration', 'ration_keeper', async function (c) { if (!c.flag('verum_liberated')) return false;
    await c.say('配給所の女', ['市場に、自治会の帳簿係が作った品が入ったわ。', '「損切りの短剣」と「見送りの法衣」。……守ったあとで強く、見送ったときに回復する。帳簿係いわく、「負けを小さくするのも腕のうち」だって。']);
    await c.shop('weapon', ['stoploss_dagger', 'robe_skip', 'herb', 'potion', 'hi_potion', 'antidote', 'calm_water', 'wake_bell', 'tent', 'escape_wing']); return true; });

  /* ---------- ハルト：自治会の礼（資金管理の鎧・損切りのお守り） ---------- */
  wrapNpc('verum_hideout', 'hideout_leader', async function (c) { var d = D();
    if (!d.flags.verum_liberated || d.flags.risk_gift_given) return false;
    await c.say('ハルト', ['自治会から、あんたたちに礼がある。', '「資金管理の鎧」——どんな大きな一撃も、全部は受けない。それと「損切りのお守り」。倒れそうなときに、一度だけ踏みとどまれる。', '町を回すのも同じだ。一度で全部を賭けない。']);
    c.give('armor_risk', 1); c.give('charm_stoploss', 1); d.flags.risk_gift_given = true; await c.msg(['資金管理の鎧を手に入れた！', '損切りのお守りを手に入れた！']); return false; });   // 続けていつもの会話（鉄の竜骨など）へ

  /* ---------- 第8〜12章のトレード装備 ---------- */
  chest('aruna_ruins_1', { id: 'rt_rci', x: 17, y: 10, item: 'rci_bow', qty: 1 });
  chest('aruna_underground_1', { id: 'ug_pat', x: 20, y: 11, item: 'armor_patience', qty: 1 });
  chest('oracle_core_2', { id: 'or_hidden', x: 3, y: 8, item: 'hidden_staff', qty: 1 });
  chest('time_bank_vault_1', { id: 'tv_helm', x: 20, y: 2, item: 'helm_timeframe', qty: 1 });
  chest('time_bank_vault_2', { id: 'tv_brace', x: 2, y: 7, item: 'bracelet_reverse', qty: 1 });
  M.aruna_house_iris.events.push({ x: 2, y: 5, type: 'script', solid: true, run: async function (c) { var d = D();
    if (!d.flags.iris_joined) { await c.msg(['測量道具の並んだ机。']); return; }
    if (d.flags.glasses_htf_got) { await c.msg(['イーリスの机。測量道具がきれいに片づいている。']); return; }
    await c.msg(['イーリスの机の引き出しに、レンズの厚い眼鏡が入っていた。']); await c.say('イーリス', ['それ、遠くまで見える眼鏡。地図を描くときに使ってた。', '目の前の一歩だけじゃなく、ちょっと先まで見えると、迷わない。……持っていって。']);
    c.give('glasses_htf', 1); d.flags.glasses_htf_got = true; await c.msg(['上位足の眼鏡を手に入れた！']); } });
  M.no_failure_school.events.push({ x: 9, y: 7, type: 'script', solid: true, run: async function (c) { var d = D();
    if (!d.flags.no_failure_done) { await c.msg(['教師の机。答えの配布用紙が束になっている。']); return; }
    if (d.flags.compass_wave_got) { await c.msg(['教師の机。「失敗の記録」と書かれたノートが増えている。']); return; }
    await c.say('教師', ['生徒たちから、あなたに渡してほしいと。', '「波形の羅針盤」。行き止まりも扉も、先に見えるようにする道具。……失敗を記録した生徒が、最初に作った物です。']);
    c.give('compass_wave', 1); d.flags.compass_wave_got = true; await c.msg(['波形の羅針盤を手に入れた！']); } });
})(typeof window !== 'undefined' ? window : globalThis);
