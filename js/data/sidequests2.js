/* =========================================================
   Data / Side quests 2 (v5.6 Phase 7-2) : 既存地域の残りのサブクエストと、仲間の個別クエスト
   グラニア：学校を作ろう／市場の再開／残された者／海賊カモメの巣／灰の岬の宝
   カリオン・王都：スラムの診療所（リーナ）／消えた帳簿／密告者／パン一つの税／最初の監査（エルナ）／反発する者／誓約の償い（オルド）
   相場大陸：故郷の変化（ポヨ村・5段階）／王への報告
   断裂群島・海底：届かなかった手紙／壊れた時計／届けられなかった物資／散逸した記録／完成しない地図（イーリス）／父の航路図（ナギ・沈没船の礁）
   時の神殿領・ゼロメア・暗黒大陸：鐘の音／波を読むとは（ルシア）／初めての職業／イオの最初の命令（イオ）／記憶の墓標
   ・会話の分岐は flags と quests だけを見る（描画APIを使わない）
   ========================================================= */
(function (root) {
  'use strict';
  var M = root.MAP_DEFS;
  function D() { return root.State.data; }
  function inParty(id) { var d = D(); return !!(d.companions[id] && d.party.indexOf(id) >= 0); }
  function jobInParty(job) { return root.State.partyActors().some(function (a) { return a.job === job && !a.dead; }); }
  function qa(c, id) { return c.questActive(id); } function qd(c, id) { return c.questDone(id); }
  function startOnce(c, id) { if (!c.questActive(id) && !c.questDone(id)) c.questStart(id); }
  function wrapNpc(map, id, fn) { var def = M[map]; if (!def) return; var n = (def.npcs || []).filter(function (x) { return x.id === id; })[0]; if (!n) return; var orig = n.talk; n.talk = async function (c) { var done = await fn(c, orig); if (!done && orig) await orig(c); }; }
  function addNpc(map, npc) { if (M[map]) (M[map].npcs = M[map].npcs || []).push(npc); }
  function addEvent(map, ev) { if (M[map]) (M[map].events = M[map].events || []).push(ev); }
  function pickup(map, x, y, flag, item, qty, text) { addEvent(map, { x: x, y: y, type: 'pickup', solid: true, doneFlag: flag, item: item, qty: qty || 1, text: text }); }
  function count(id) { return D().inventory[id] || 0; }

  /* =========================================================
     グラニア
     ========================================================= */
  // 学校を作ろう：教師ミレに「波形の書の写し」（ポヨ村の修行場の師匠ハケイから）
  wrapNpc('verum_school', 'school_teacher', async function (c) { var d = D();
    if (!d.flags.verum_liberated || qd(c, 'verum_school')) return false;
    if (c.has('wave_book_copy')) {
      await c.say('教師ミレ', ['「波形の書」の写し……！ 本物だわ。', '高値と安値、上位足、見送り。……子どもたちに、数字より先に「確かめる」ことを教えられる。']);
      c.take('wave_book_copy', 1); await c.questComplete('verum_school');
      await c.remark('gald', ['鉱山で働いてた子どもたちが、字を習ってる。……悪くない眺めだ。'], 'gald_remark_school'); return true;
    }
    if (!qa(c, 'verum_school')) { await c.say('教師ミレ', ['町が解放されて、学び舎を開けたの。でも、教えるための本がない。', 'ポヨ村の修行場には「波形の書」があるって聞いたわ。写しを一冊、分けてもらえないかしら。']); c.questStart('verum_school'); return true; }
    await c.say('教師ミレ', ['ポヨ村の修行場の師匠に、「波形の書」の写しをお願いしてみて。']); return true; });
  wrapNpc('poyo_dojo', 'master_hakei', async function (c) {
    if (!qa(c, 'verum_school') || c.has('wave_book_copy')) return false;
    await c.say('師匠ハケイ', ['ヴェルムに学び舎ができた？ ……そうか。', '写しを持っていけ。わしの字は汚いが、中身は確かだ。「上位足を見よ。根拠が揃わねば見送れ。損は小さく切れ」——それだけ伝われば十分だ。']);
    c.give('wave_book_copy', 1); await c.msg(['波形の書の写しを受け取った。']); return true; });
  // 市場の再開：道具屋に仕入れ金1000Gを貸す → 第6章達成後に1500Gで返済
  wrapNpc('verum_town', 'vt_merchant', async function (c) { var d = D();
    if (qd(c, 'verum_market')) return false;
    if (qa(c, 'verum_market')) {
      if (d.quests.main_6 && d.quests.main_6.state === 'done') { await c.say('ヴェルムの商人', ['あんたの1000Gで仕入れた品が、全部売れたよ。町に人が戻ってきたんだ。', '約束の返済だ。利子をつけて1500G。……貸してくれて、ありがとう。']); await c.questComplete('verum_market'); return true; }
      await c.say('ヴェルムの商人', ['まだ商売を始めたばかりだ。返すのは、もう少し待ってくれ。（第6章の後に、もう一度）']); return true;
    }
    await c.say('ヴェルムの商人', ['市場を開きたいんだが、仕入れの金がない。1000G、貸してもらえないか。', '必ず返す。……ただ、すぐには無理だ。']);
    var ch = await c.choice('1000Gを貸しますか？', ['貸す', '貸さない']);
    if (ch !== 0) { await c.say('ヴェルムの商人', ['……そうか。無理を言った。']); return true; }
    if (d.gold < 1000) { await c.msg(['所持金が足りない。']); return true; }
    d.gold -= 1000; c.questStart('verum_market'); await c.say('ヴェルムの商人', ['恩に着る。品が売れたら、必ず返しに行く。']); return true; });
  // 残された者：鉱山最深部の崩れた壁（工匠がいれば崩せる）→ 鉱夫2人を救う
  wrapNpc('verum_town', 'vt_old', async function (c) { var d = D();
    if (!d.flags.verum_liberated || qd(c, 'verum_lost_workers')) return false;
    if (d.flags.verum_workers_rescued) { await c.say('坑夫長の老人', ['二人とも帰ってきた……！ 最深部の崩れた壁の奥で、ずっと待ってたのか。', 'ありがとう。名前を呼んで、迎えに行けなかったのが、悔しくてな。']); await c.questComplete('verum_lost_workers'); return true; }
    if (!qa(c, 'verum_lost_workers')) { await c.say('坑夫長の老人', ['解放の日に、二人だけ戻ってこなかった。最深部の、崩れた壁の向こうで声を聞いた者がいる。', '壁は固い。崩すなら、工匠の腕がいる。']); c.questStart('verum_lost_workers'); return true; }
    return false; });
  addEvent('iron_mine_3', { x: 18, y: 4, type: 'script', solid: true, tile: 'ore', run: async function (c) { var d = D();
    if (d.flags.verum_workers_rescued) { await c.msg(['崩した壁の跡。奥の空洞は、もう空っぽだ。']); return; }
    await c.msg(['崩れかけた岩壁。耳を当てると、奥からかすかに石を叩く音がする。']);
    if (!qa(c, 'verum_lost_workers')) return;
    if (!jobInParty('artisan') && !inParty('ganes')) { await c.msg(['固い岩だ。工匠の道具がなければ、崩せそうにない。']); return; }
    await c.msg(['工匠の鉄槌で、岩の継ぎ目を叩いた。……壁が崩れ、空洞が現れた。', '奥で、鉱夫が二人うずくまっている。……と、崩れた岩の中から灰のゴーレムが起き上がった！']);
    var r = await c.battle(['ash_golem', 'ash_golem'], {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
    d.flags.verum_workers_rescued = true; await c.msg(['二人の鉱夫を助け出した。「……名前を、呼ばれた気がしたんだ」', 'ヴェルムの坑夫長に知らせよう。']);
    await c.remark('ganes', ['……弟のときも、こうして誰かが壁を崩してくれたら。', 'いや。今日、二人は帰れる。それでいい。'], 'ganes_remark_workers');
  } });
  // 海賊カモメの巣・灰の岬の宝：灰の浜の番人ロウから（船が使えるようになってから）
  wrapNpc('ash_shore_hut', 'shore_keeper', async function (c) { var d = D();
    if (!d.flags.ship_ready || !d.flags.verum_arrived || c.has('supply_order')) return false;   // 本編の会話（ヴェルムへの案内・注文書）を先に
    if (qa(c, 'grania_lighthouse_rock') && d.flags.cape_box_found) { await c.say('番人ロウ', ['灰の岬の箱を見つけたか。……親父の名前が書いてある。灯台守だった親父の、最後の給金だ。', '使ってくれ。親父も、海で使われるほうが喜ぶ。']); c.take('cape_box', 1); await c.questComplete('grania_lighthouse_rock'); return true; }
    var started = false;
    if (!qa(c, 'grania_sea_pirates') && !qd(c, 'grania_sea_pirates')) { await c.say('番人ロウ', ['船持ちか。頼みがある。南西の海の小島に、海賊カモメの巣がある。', '帆船の積荷を狙う、眼帯のカモメが頭だ。追い払ってくれないか。']); c.questStart('grania_sea_pirates'); d.flags.pirates_quest = true; started = true; }
    if (!qa(c, 'grania_lighthouse_rock') && !qd(c, 'grania_lighthouse_rock')) { await c.say('番人ロウ', ['それと、北東の海の「灰の岬」。昔、灯台があった岩場だ。', '親父が灯台守だった頃の箱が、まだ残っているはずだ。船でしか行けない。']); c.questStart('grania_lighthouse_rock'); started = true; }
    return started; });
  addEvent('pirate_nest', { x: 8, y: 3, type: 'boss', solid: true, optional: true, doneFlag: 'gull_admiral_defeated', requireFlag: 'pirates_quest', lockedText: ['カモメの巣だ。たくさんのカモメが、こちらを睨んでいる。'], enemy: 'boss_gull_admiral', intro: ['巣のてっぺんで、眼帯をした大きなカモメが翼を広げた。', '「クワァ！（積荷を置いていけ！）」'], after: ['海賊カモメの頭は、群れを連れて沖へ飛び去った。', '巣には、船から盗まれた荷が積まれていた。'], questComplete: 'grania_sea_pirates' });
  pickup('ash_cape', 5, 3, 'cape_box_found', 'cape_box', 1, ['岩の割れ目に、潮で錆びた小箱が挟まっていた。蓋に「灯台守ロウ」と刻まれている。']);

  /* =========================================================
     カリオン・王都
     ========================================================= */
  // スラムの診療所（リーナ）
  addNpc('kalion_city', { id: 'kc_doctor', x: 13, y: 30, sprite: 'priest', dir: 'down', wander: 0, talk: async function (c) { var d = D();
    if (qd(c, 'lina_clinic')) { await c.say('スラムの医者', ['薬棚が埋まった。……リーナさんの書いた処方の覚え書き、壁に貼ってあるよ。']); return; }
    if (!inParty('lina')) { await c.say('スラムの医者', ['ここはスラムの診療所。薬は足りない、手も足りない。', '……癒やし手でもいてくれたら、と思うよ。']); return; }
    if (!qa(c, 'lina_clinic')) {
      await c.say('スラムの医者', ['あんた、僧侶か？ 頼む、手を貸してくれ。熱を出した子どもが三人いる。薬草が5つ、毒消しが3つあれば……']);
      await c.say('リーナ', ['……行こう。ヴェルムの配給所で、全員は救えないって思い知った。でも、ここで三人なら。']);
      c.questStart('lina_clinic'); return;
    }
    if (count('herb') < 5 || count('antidote') < 3) { await c.say('スラムの医者', ['薬草が5つ、毒消しが3つ。（今：薬草 ' + count('herb') + '／毒消し ' + count('antidote') + '）', '道具屋で買えるはずだ。']); return; }
    c.take('herb', 5); c.take('antidote', 3);
    await c.say('リーナ', ['熱が下がってきた。……この子、水を飲めるようになった。']);
    if (!d.flags.kalion_reformed) {
      await c.say('徴税兵', ['診療所に薬を持ち込んだな。薬は課税対象だ。没収する！']);
      var r = await c.battle(['federal_soldier', 'federal_soldier'], {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
    }
    await c.say('スラムの医者', ['三人とも、峠を越えた。……ありがとう。', 'あんたの処方、ここに書き残してくれないか。次の子のために。']);
    await c.say('リーナ', ['うん。書く。わたしがいなくても、誰かが同じように救えるように。']);
    await c.questComplete('lina_clinic');
  } });
  // 消えた帳簿：没収された家族の財産記録（財務局）
  wrapNpc('kalion_city', 'kc_poor1', async function (c) { var d = D();   // 話したあと、いつもの会話（自治の再建の聞き取り）へ続ける
    if (qd(c, 'kalion_ledger_lost')) return false;
    if (c.has('family_record')) { await c.say('貧しい男', ['これが……うちの家の記録。畑の広さも、羊の数も、ちゃんと書いてある。', '「没収」の印の横に、「根拠なし」と誰かが書き足してる。……これで、取り戻せる。']); c.take('family_record', 1); await c.questComplete('kalion_ledger_lost'); return false; }
    if (!qa(c, 'kalion_ledger_lost')) { await c.say('貧しい男', ['魔災税が払えなくて、家も畑も取られた。でも、何をいくらで取られたのか、記録がどこにもない。', '財務局の奥に、没収の記録があるはずなんだ。']); c.questStart('kalion_ledger_lost'); return false; }
    return false; });
  pickup('kalion_finance', 9, 5, 'family_record_found', 'family_record', 1, ['棚の奥の箱に、「没収・南区」と書かれた記録の束があった。その中に、男の家族の名前を見つけた。']);
  // 密告者（改革後）
  addNpc('kalion_tavern', { id: 'kv_informant', x: 8, y: 6, sprite: 'villager_m', dir: 'down', wander: 0, showIf: 'kalion_reformed', talk: async function (c) { var d = D();
    if (qd(c, 'kalion_informant')) { await c.say('元密告者', [['……責められて当然だ。わかってる。', '話を聞いてくれたのは、あんたが初めてだ。', '見逃してくれて、助かった。……でも、楽にはならないな。'][d.flags.informant_choice || 0]]); return; }
    c.questStart('kalion_informant');
    await c.say('元密告者', ['俺は隣の家の隠し財産を密告した。報奨金で、家族を食わせた。', '改革のあと、隣の家族は財産を取り戻した。俺の報奨金は……返せと言われた。もう使っちまった。']);
    var ch = await c.choice('どうする？', ['責める', '話を最後まで聞く', '見逃す']); if (ch < 0) ch = 1; d.flags.informant_choice = ch;
    if (ch === 0) await c.say('元密告者', ['……ああ。俺が悪い。言い訳はしない。']);
    else if (ch === 1) await c.say('元密告者', ['密告しなけりゃ、うちが取られてた。そういう仕組みだった。', '……それでも、俺が選んだことだ。少しずつ返す。自治会に相談してみるよ。']);
    else await c.say('元密告者', ['……いいのか？', 'いや、やっぱり自治会に行く。見逃されたまま生きるのは、たぶん、もっと重い。']);
    await c.questComplete('kalion_informant');
    await c.remark('elna', ['仕組みが人を密告者にした。でも、帳簿には名前が残る。', '……だから、名前から書く帳簿が必要なのよ。'], 'elna_remark_informant');
  } });
  // パン一つの税：魔災税の計算ミスを証明する（改革後に自治会へ）
  addNpc('kalion_city', { id: 'kc_baker', x: 29, y: 26, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { var d = D();
    if (qd(c, 'kalion_bread')) { await c.say('パン屋', ['払いすぎた税が戻ってきた。パンの値段を、元に戻せたよ。']); return; }
    if (d.flags.bread_proved) { if (d.flags.kalion_reformed) { await c.say('パン屋', ['自治会に計算を出してくれたの？ ……ありがとう。']); await c.questComplete('kalion_bread'); } else await c.say('パン屋', ['計算は合ってる。でも、今の役所に出しても握りつぶされるだけ。……町が変わるのを待つわ。']); return; }
    startOnce(c, 'kalion_bread');
    await c.say('パン屋', ['パンは1個20G。魔災税は「売値の5%」のはずなのに、1個あたり3G取られてるの。', '役所は「計算は正しい」の一点張り。あなた、計算できる？']);
    var ch = await c.choice('パン1個20Gの5%は？', ['1G', '3G', '5G']);
    if (ch !== 0) { await c.say('パン屋', ['……そう？ もう一度、ゆっくり計算してみて。20Gの5%よ。']); return; }
    d.flags.bread_proved = true;
    await c.say('パン屋', ['1G！ やっぱり、3倍取られてたのね。……1日100個売るから、毎日200G多く払ってた。']);
    if (d.flags.kalion_reformed) { await c.say('パン屋', ['自治会に計算を出すわ。']); await c.questComplete('kalion_bread'); }
    else await c.say('パン屋', ['でも、今の役所に出しても握りつぶされる。町が変わったら、自治会に出すわ。']);
  } });
  // 最初の監査（エルナ）：税務庁舎で、3行の帳簿から合わない1行を見つける
  wrapNpc('kalion_tax', 'kt_clerk', async function (c) { var d = D();
    if (!inParty('elna') || qd(c, 'elna_audit')) return false;
    startOnce(c, 'elna_audit');
    await c.say('エルナ', ['……ここ、わたしが最初に監査をした部署。あのとき、合わない一行を見つけて、報告した。', '握りつぶされた。でも、今ならもう一度。手伝って。']);
    await c.msg(['【南区・徴税台帳（抜粋）】', '1. 粉屋：売上 2000G、税 100G（5%）', '2. 鍛冶屋：売上 3000G、税 150G（5%）', '3. 宿屋：売上 1000G、税 150G（5%）']);
    var ch = await c.choice('合わない一行は？', ['1. 粉屋', '2. 鍛冶屋', '3. 宿屋']);
    if (ch !== 2) { await c.say('エルナ', ['……もう一度、売上に5%をかけてみて。']); return true; }
    await c.say('エルナ', ['そう。宿屋だけ15%取られてる。差額の100Gは、帳簿のどこにも入っていない。', '……十年前のわたしは、ここで止まった。今は、この一行を自治会に出せる。']);
    await c.say('税務庁舎の書記', ['……この台帳、私が書いたものです。上の指示で。', '証言します。もう、黙っているのはやめます。']);
    await c.questComplete('elna_audit'); return true; });
  // 反発する者（改革後の王都）
  addNpc('sentra_capital', { id: 'sc_dissent', x: 20, y: 30, sprite: 'scholar', dir: 'down', wander: 0, showIf: 'kalion_reformed', talk: async function (c) { var d = D();
    if (qd(c, 'sentra_dissent')) { await c.say('元官吏', ['自治会の帳簿は遅い。だが、遅いぶん、間違いを見つけやすい。……認めたくはないがね。']); return; }
    c.questStart('sentra_dissent');
    await c.say('元官吏', ['私は改革に反対だ。自治会は会議ばかりで、何も決まらない。', '以前の徴収は速かった。数字はいつも予定どおりだった。']);
    var ch = await c.choice('何と答える？', ['予定どおりの数字は、誰かが無理をして作っていた', '会議が遅いのは本当。速くする方法を一緒に考えないか', '……あなたの言うことにも一理ある']); if (ch < 0) ch = 1; d.flags.dissent_choice = ch;
    await c.say('元官吏', [['……知っていた。知っていて、見ないふりをしていた。', '一緒に？ ……私は帳簿の早見表を作るのが得意だった。それくらいなら。', '一理、か。……反対する者の話を聞く改革なら、少しは信用できるかもしれん。'][ch]]);
    await c.questComplete('sentra_dissent');
  } });
  // 誓約の償い（オルド）：没収した家の3家族を訪ねる
  function afterFlag(f, fn) { return async function (c) { return D().flags[f] ? fn(c) : false; }; }
  function ordVisit(flag, lines) { return async function (c) { var d = D(); if (!inParty('ord') || !qa(c, 'ord_penance') || d.flags[flag]) return false; await c.say('', lines[0]); await c.say('オルド', lines[1]); d.flags[flag] = true; var n = ['ord_visit_1', 'ord_visit_2', 'ord_visit_3'].filter(function (f) { return d.flags[f]; }).length; await c.msg(['（訪ねた家族 ' + n + '/3）']); if (n >= 3) { await c.say('オルド', ['三十二軒のうちの、三軒だ。全部を回るには、まだ何年もかかる。', '……それでも、名前を聞いた。顔を見た。それを忘れないことから始める。']); await c.questComplete('ord_penance'); } return true; }; }
  addNpc('sentra_capital', { id: 'sc_family', x: 12, y: 30, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { var h = await ordVisit('ord_visit_3', [['……あんた、親衛隊の。うちの家を封印した人だね。', '恨んでないと言えば嘘になる。でも、謝りに来たのは、あんたが初めてだよ。'], ['……すまなかった。命令だった、とは言わない。俺がやった。']])(c); if (!h) await c.say('野営地の女', ['家を取られて、もう二年になる。王都の端の野営地暮らしにも、慣れちまったよ。']); } });
  wrapNpc('sentra_capital', 'sc_camp_old', async function (c) { var d = D();
    if (!d.flags.testimony_1) return false;   // 本編の証言集めが先
    if (inParty('ord') && !qa(c, 'ord_penance') && !qd(c, 'ord_penance') && d.flags.ord_joined) {
      await c.say('オルド', ['……ここは、俺が没収した家の人たちが暮らす野営地だ。', '三十二軒。全員の顔は覚えていない。……覚えていないことが、一番の罪かもしれない。一軒ずつ、訪ねたい。']);
      c.questStart('ord_penance');
    }
    return ordVisit('ord_visit_1', [['……おや。剣を下げた騎士さまかい。', 'わしの家は、孫が生まれた年に封印された。孫はもう、家を覚えておらん。'], ['覚えておきます。あなたの家と、お孫さんの名前を。']])(c); });
  wrapNpc('sentra_capital', 'sc_camp_merchant', afterFlag('testimony_2', ordVisit('ord_visit_2', [['商売道具ごと持っていかれた。……今は、ここで細々と古着を売ってる。', '謝ってもらっても、道具は戻らないがね。'], ['道具の代わりにはならない。だが、王都の自治会に、あなたの店の記録を出しておく。']])));

  /* =========================================================
     相場大陸：故郷の変化（ポヨ村・5段階）／王への報告
     ========================================================= */
  var POYO = [
    ['main_5', ['鉱山の町の噂、ここまで届いたわよ。鎖につながれた人たちを、あなたが解放したって。', 'ポヨ村の子どもたちが、「鎖を切るごっこ」をして遊んでるの。']],
    ['main_8', ['南の海の向こうに、半分が死んだ島があったんですって？', '村長さんが、地図に島の名前を書き足してたわ。']],
    ['main_11', ['機械の町の人たちが、自分で仕事を選べるようになったって、旅の人が言ってた。', 'うちの子も「何になりたいか、自分で決める」って。……ちょっと寂しいけど、うれしいわね。']],
    ['main_14', ['空を飛ぶ船を見たって、畑の人が大騒ぎしてたの。あれ、あなたたち？', '村の空を、ずっと見上げてる子がいるわ。']],
    ['game_cleared', ['おかえりなさい。……本当に、おかえりなさい。', '村のみんなで、あなたの旅の話をまとめてるの。「波形の勇者」って題で。……照れる？']]
  ];
  function poyoStage(d) { var n = 0; POYO.forEach(function (s, i) { var ok = s[0] === 'game_cleared' ? d.flags.game_cleared : (d.quests[s[0]] && d.quests[s[0]].state === 'done'); if (ok) n = i + 1; }); return n; }
  wrapNpc('poyo_village', 'poyo_woman', async function (c) { var d = D();
    var st = poyoStage(d); if (st < 1) return false;
    if (!qa(c, 'poyo_return') && !qd(c, 'poyo_return')) c.questStart('poyo_return');
    var seen = d.flags.poyo_stage_seen || 0;
    if (st <= seen) { await c.say('村の女', POYO[st - 1][1]); return true; }
    await c.say('村の女', POYO[st - 1][1]); d.flags.poyo_stage_seen = st; d.flags['poyo_stage_' + st] = true;
    if (st >= 5) await c.questComplete('poyo_return'); else await c.msg(['（故郷の変化 ' + st + '/5）']);
    return true; });
  wrapNpc('rivel_castle', 'king', async function (c) { var d = D();
    if (!(d.quests.main_5 && d.quests.main_5.state === 'done') || qd(c, 'rivel_king_report')) return false;
    startOnce(c, 'rivel_king_report');
    await c.say('リヴェル王', ['グラニアの鉱山から戻ったか。……報告を聞こう。']);
    await c.msg(['鉄鎖鉱山の監督官ザルグが、ノルマのために作業を止めず、落盤で人が死んだこと。賃金の帳簿が書き換えられていたこと。', 'そして、鉱山の鉄が、リヴェルの城の修繕にも使われていたこと。']);
    var ch = await c.choice('王に何を求める？', ['不正を働いた監督官たちの処罰', 'リヴェル王国も鉄を買った責任を認めること', '鉱山の町の再建への協力']); if (ch < 0) ch = 2; d.flags.king_report_choice = ch;
    await c.say('リヴェル王', [['処罰は必要だ。グラニアの自治会と協力して、記録を集めよう。', '……耳が痛い。安い鉄の値段の裏に何があったのか、問わなかったのは余の怠慢だ。認めよう。', '再建か。城の修繕は後回しにして、その分をヴェルムの学び舎と市場へ回そう。'][ch]]);
    await c.questComplete('rivel_king_report'); return true; });

  /* =========================================================
     断裂群島・海底都市
     ========================================================= */
  // 届かなかった手紙（5通）：廃墟の街で拾い、村の女に託す
  [[5, 6], [34, 22], [24, 22], [4, 21], [36, 12]].forEach(function (p, i) { pickup('aruna_ruins', p[0], p[1], 'aruna_letter_' + (i + 1), 'old_letter', 1, ['崩れた家の郵便受けに、宛先の書かれた手紙が残っていた。']); });
  wrapNpc('aruna_village', 'av_woman', async function (c) { var d = D();
    if (qd(c, 'aruna_letters') || !d.flags.aruna_arrived) return false;
    var n = count('old_letter');
    if (!qa(c, 'aruna_letters')) { await c.say('村の女', ['廃墟の街には、届かなかった手紙がまだ残ってるはず。災害の日の朝に書かれた手紙。', '見つけたら持ってきて。宛先の家族は、この村にまだいるの。5通、郵便局の記録に残ってる。']); c.questStart('aruna_letters'); return true; }
    if (n < 5) { await c.say('村の女', ['手紙は廃墟の街のあちこちに。（' + n + '/5）']); return true; }
    c.take('old_letter', 5); await c.say('村の女', ['5通……全部、宛先の家族に届けるわ。', '「今日の夕飯は魚にしよう」「明日、謝りに行く」……普通の手紙ばかり。普通の朝だったのね。']); await c.questComplete('aruna_letters'); return true; });
  // 壊れた時計：時計塔1階の止まった懐中時計 → 時計職人
  pickup('aruna_ruins_1', 9, 6, 'broken_clock_found', 'broken_clock', 1, ['床に、ガラスの割れた懐中時計が落ちていた。針は止まっている。']);
  addNpc('aruna_village', { id: 'av_clockmaker', x: 25, y: 18, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) {
    if (qd(c, 'aruna_clock')) { await c.say('時計職人', ['あの時計は、今は村の広場で動いてる。止まった時刻の札をつけてね。']); return; }
    if (c.has('broken_clock')) { c.take('broken_clock', 1); await c.say('時計職人', ['……直せる。少し待ってくれ。']); await c.msg(['職人は、小さな歯車を一つずつ並べ直した。']); await c.say('時計職人', ['針が止まっていた時刻は、明け方の4時52分。', '災害が起きたのは「夜明けの市場が開く前」と言われてきた。……この時計で、はっきりした。', '時刻がわかると、不思議と、その日を思い出せる人が増えるんだ。']); await c.questComplete('aruna_clock'); return; }
    startOnce(c, 'aruna_clock'); await c.say('時計職人', ['時計職人だ。災害の日、何時に何が起きたのか、誰も正確に覚えていない。', '廃墟の時計塔に、止まった時計が残っていないか？ 見つけたら持ってきてくれ。']); } });
  // 届けられなかった物資：廃墟の倉庫の物資を、村の3人へ
  pickup('ruins_store', 5, 3, 'old_supplies_found', 'old_supplies', 3, ['倉庫の奥に、封をされたままの物資の箱が三つ。「アルナの村へ」と書かれている。']);
  wrapNpc('aruna_village', 'av_merchant', async function (c) { var d = D();
    if (qd(c, 'aruna_supplies') || !d.flags.aruna_arrived) return false;
    var n = ['supply_child', 'supply_sailor', 'supply_yorn'].filter(function (f) { return d.flags[f]; }).length;
    if (!qa(c, 'aruna_supplies')) { await c.say('島の商人', ['廃墟の倉庫に、災害の日に届くはずだった物資が残ってるらしい。', '今の村の人に配ってくれないか。子ども、船乗り、それにヨルン爺さん。']); c.questStart('aruna_supplies'); return true; }
    if (n >= 3) { await c.say('島の商人', ['全部配ってくれたのか。……災害の日の荷が、やっと届いたんだな。']); await c.questComplete('aruna_supplies'); return true; }
    await c.say('島の商人', ['物資は廃墟の倉庫跡に。子ども、船乗り、ヨルン爺さんに。（' + n + '/3）']); return true; });
  function supplyTo(map, id, flag, lines) { wrapNpc(map, id, async function (c) { var d = D(); if (!qa(c, 'aruna_supplies') || d.flags[flag] || !c.has('old_supplies')) return false; c.take('old_supplies', 1); d.flags[flag] = true; await c.say('', lines); return false; }); }   // 渡したあと、いつもの会話へ（ヨルンの本編の会話を止めない）
  supplyTo('aruna_village', 'av_child', 'supply_child', ['箱の中に、毛布と、絵本が入ってる！ ……絵本の最後のページ、誰かが「つづきはまた明日」って書いてる。']);
  supplyTo('aruna_village', 'av_sailor', 'supply_sailor', ['ロープと帆布か。……十年前の荷でも、ちゃんと使える。いい荷造りだ。']);
  supplyTo('aruna_village', 'av_yorn', 'supply_yorn', ['灯台の油……か。災害の日の朝に、わしが頼んだ油じゃ。', '……十年遅れて、届いたか。']);
  // 散逸した記録（5巻）：記憶の図書館・封印区画・海底都市 → 司書の影
  [['memory_library', 5, 13], ['memory_library', 16, 13], ['memory_library_seal', 2, 9], ['elmina_undersea', 5, 16], ['elmina_undersea', 17, 16]].forEach(function (p, i) { pickup(p[0], p[1], p[2], 'lost_book_' + (i + 1), 'lost_volume', 1, ['崩れた書架の下から、背表紙の欠けた記録の巻が出てきた。']); });
  wrapNpc('memory_library', 'ml_librarian', async function (c) {
    if (qd(c, 'library_lost_books') || !(c.flag('seal_opened') || c.has('seal_key'))) return false;   // 本編（三つの区画→封印区画の鍵）が先
    var n = count('lost_volume');
    if (!qa(c, 'library_lost_books')) { await c.say('司書の影', ['この図書館の記録は、海に沈むとき散らばった。五巻、まだ見つかっていない。', '図書館のどこかと、海底都市の路地に。……見つけたら、ここへ。']); c.questStart('library_lost_books'); return true; }
    if (n < 5) { await c.say('司書の影', ['散らばった記録は、あと ' + (5 - n) + ' 巻。']); return true; }
    c.take('lost_volume', 5); await c.say('司書の影', ['……そろった。島の人々の、毎日の記録だ。値段も、天気も、喧嘩も。', '大きな出来事より、こういう記録のほうが、あとで役に立つ。ありがとう。']); await c.questComplete('library_lost_books'); return true; });
  // 完成しない地図（イーリス）：断裂群島の3つの測量標
  function surveyMark(n, x, y) { return { x: x, y: y, type: 'script', solid: true, tile: 'sign', run: async function (c) { var d = D(); var f = 'iris_mark_' + n;
    if (d.flags[f]) { await c.msg(['イーリスの印をつけた測量標。']); return; }
    await c.msg(['古い測量標が立っている。刻まれた数字は、海に沈む前の島の高さだ。']);
    if (!inParty('iris')) return;
    startOnce(c, 'iris_map');
    d.flags[f] = true; var k = [1, 2, 3].filter(function (i) { return d.flags['iris_mark_' + i]; }).length;
    await c.say('イーリス', [['ここ、地図では陸のはずなのに、海になってる。……書き直す。', '測量標が傾いてる。島が、まだ少しずつ沈んでるのね。', '三つめ。……数字を合わせると、地図の線が、また動く。'][k - 1], '（測量標 ' + k + '/3）']);
    if (k >= 3) { await c.say('イーリス', ['わかった。この地図は、完成しない。島は動き続けるから。', 'でも、だから描き続ける意味がある。……描いた日付を、ちゃんと書いておく。']); await c.questComplete('iris_map'); }
  } }; }
  addEvent('world_islands', surveyMark(1, 94, 50)); addEvent('world_islands', surveyMark(2, 60, 85)); addEvent('world_islands', surveyMark(3, 131, 94));
  // 父の航路図（ナギ）：漁師の話 → 沈没船の礁の船長室（hidden.js）で航海日誌
  wrapNpc('world_islands', 'is_fisher', async function (c) { var d = D();
    if (!inParty('nagi') || qd(c, 'nagi_chart')) return false;
    if (!qa(c, 'nagi_chart')) {
      await c.say('漁師', ['ナギの嬢ちゃんか。……親父さんの船のことだがな。', 'グラニアの南東の海の礁に、古い船が沈んでる。「暁の羅針号」。親父さんが最後に乗った船だって噂がある。']);
      await c.say('ナギ', ['……父さんの船じゃない。父さんは航海士として雇われてた。', '行こう。沈没船の礁へ。船でしか行けない。']);
      c.questStart('nagi_chart'); return true;
    }
    if (d.flags.nagi_log_found) { await c.say('ナギ', ['父さんの日誌、ちゃんと読んだよ。……航路図は、自分で引き直す。']); await c.questComplete('nagi_chart'); return true; }
    return false; });

  /* =========================================================
     時の神殿領・ゼロメア・暗黒大陸
     ========================================================= */
  // 鐘の音：神殿の3つの回廊で鐘楼の歯車を集める
  pickup('temple_of_time_1', 5, 6, 'bell_gear_1', 'bell_gear', 1, ['回廊の柱の陰に、大きな歯車が転がっていた。鐘楼の刻印がある。']);
  pickup('temple_of_time_2', 3, 8, 'bell_gear_2', 'bell_gear', 1, ['行き止まりに、鐘楼の歯車が埋もれていた。']);
  pickup('temple_of_time_3', 3, 10, 'bell_gear_3', 'bell_gear', 1, ['守護者の間の隅に、鐘楼の歯車が置かれていた。誰かが、ここまで運んだのだ。']);
  wrapNpc('tempus_bell', 'tb_keeper', async function (c) {
    if (qd(c, 'tempus_bells')) return false;
    var n = count('bell_gear');
    if (!qa(c, 'tempus_bells')) { await c.say('鐘楼守', ['この鐘は、時間銀行ができた年に止められた。「鐘が鳴ると、人が時間を数えすぎる」と。', '歯車は三つ、時の神殿の回廊に持ち去られた。……鳴らしたいんじゃ。もう一度。']); c.questStart('tempus_bells'); return true; }
    if (n < 3) { await c.say('鐘楼守', ['歯車は時の神殿の三つの回廊に。（' + n + '/3）']); return true; }
    c.take('bell_gear', 3); await c.msg(['歯車をはめると、鐘楼の大鐘が、ゆっくりと揺れ始めた。', '——ゴーン……。鐘都テンプスの空に、十年ぶりの鐘の音が響いた。']);
    await c.say('鐘楼守', ['時間は、数えるためじゃなく、分け合うためにある。……鐘は、それを思い出させるために鳴るんじゃ。']); await c.questComplete('tempus_bells'); return true; });
  // 波を読むとは（ルシア）：鐘都の広場の「波読みの老人」と、ルシアの試練
  addNpc('tempus_city', { id: 'tc_waveold', x: 24, y: 16, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
    if (qd(c, 'lucia_wave')) { await c.say('波読みの老人', ['ルシアは、師匠の言葉を自分の言葉で話せるようになった。……それが、弟子の卒業じゃ。']); return; }
    if (!inParty('lucia')) { await c.say('波読みの老人', ['わしは昔、波を読む剣士の師匠と、同じ道場にいた。', '「波は読むもの、決めるのは自分」……あいつの口癖じゃった。']); return; }
    startOnce(c, 'lucia_wave');
    await c.say('波読みの老人', ['ルシア……あいつの一番弟子か。', '師匠の言葉をなぞるだけなら、誰にでもできる。おぬしの眼で、この波を読んでみい。']);
    await c.say('ルシア', ['……読みます。師匠の言葉じゃなく、わたしの眼で。']);
    var res = await c.trial(['whipsaw', 'div_against_htf', 'mtf_conflict', 'reversal_confirmed_up'], { title: 'ルシアの試練：波を読むとは', minScore: 60 });
    if (!res || res.score < 60) { await c.say('波読みの老人', ['（評価 ' + (res ? res.score : 0) + '点）……焦ったな。もう一度、上位足から読み直してこい。']); return; }
    await c.say('波読みの老人', ['（評価 ' + res.score + '点）……よい。根拠が揃わぬところで、手を出さなかった。']);
    await c.say('ルシア', ['師匠は「波を読め」と言った。でも、読んだあとに「待つ」と決めるのは、わたしだった。', '……やっと、わかった気がする。']);
    await c.questComplete('lucia_wave');
  } });
  // 初めての職業（ゼロメア解放後）：3人の住民の相談にのる
  function jobTalk(flag, name, lines, opts, answers) { return async function (c) { var d = D();
    if (!qa(c, 'zeromea_job_choice') || d.flags[flag]) return false;
    await c.say(name, lines); var ch = await c.choice('何と言う？', opts); if (ch < 0) ch = 0;
    await c.say(name, [answers[ch]]); d.flags[flag] = true;
    var n = ['job_talk_1', 'job_talk_2', 'job_talk_3'].filter(function (f) { return d.flags[f]; }).length; await c.msg(['（相談にのった住民 ' + n + '/3）']);
    if (n >= 3) { await c.msg(['演算都市ノードに、「職業相談所」の看板が立った。看板には「迷ったら、ためしてみる」と書かれている。']); await c.questComplete('zeromea_job_choice'); }
    return true; }; }
  wrapNpc('node_city', 'nc_free1', async function (c) { var d = D();
    if (!d.flags.zeromea_reformed || qd(c, 'zeromea_job_choice')) return false;
    if (!qa(c, 'zeromea_job_choice')) { await c.say('解放された男', ['オラクルが仕事を割り振らなくなった。自分で選べ、と言われても……何を選べばいいのか。', 'この町の人は、みんな同じことで困ってる。相談にのってくれないか。']); c.questStart('zeromea_job_choice'); }
    return jobTalk('job_talk_1', '解放された男', ['僕は二十年、部品を数える仕事をしていた。それしか知らない。'], ['数えるのが得意なら、市場の帳簿をつけてみたら', '一度、まったく違うことをためしてみたら'], ['帳簿……数えるのと、似てるかもしれない。やってみる。', '違うこと……怖いけど、失敗しても記録すればいいんだよね。'])(c); });
  addNpc('node_city', { id: 'nc_job2', x: 30, y: 18, sprite: 'villager_f', dir: 'down', wander: 0, showIf: 'zeromea_reformed', talk: async function (c) { var h = await jobTalk('job_talk_2', '解放された女', ['花を育てたい。でも、花は予定どおりに咲かないでしょう？ それが怖いの。'], ['予定どおりに咲かないから、面白いんじゃないか', '咲いた日を記録していけば、だんだんわかってくる'], ['……そうね。第7居住区の、予定にない花の人に会いに行ってみる。', '記録……。咲かなかった日も、書いておくわ。'])(c); if (!h) await c.say('ノードの女', ['オラクルの割り当てがなくなって、毎朝、自分で今日の予定を決めるの。……疲れるけど、悪くないわ。']); } });
  addNpc('node_city', { id: 'nc_job3', x: 12, y: 24, sprite: 'child', dir: 'down', wander: 1, showIf: 'zeromea_reformed', talk: async function (c) { var h = await jobTalk('job_talk_3', 'ノードの子ども', ['大きくなったら何になるか、決めなきゃいけないの？ 今すぐ？'], ['今すぐじゃなくていい。いろいろ見てから決めればいい', '決めても、あとで変えていい'], ['見てから……じゃあ、明日は鍛冶屋さんを見に行く！', '変えていいの？ ……じゃあ、とりあえず全部やる！'])(c); if (!h) await c.say('ノードの子ども', ['学校で、「わからない」って言ってもいいことになったんだ！']); } });
  // イオの最初の命令（イオ）：自動工場2階の古い端末
  addEvent('auto_factory_2', { x: 5, y: 6, type: 'script', solid: true, tile: 'crystal', run: async function (c) { var d = D();
    if (qd(c, 'io_memory')) { await c.msg(['古い端末。最初の命令の記録が表示されたままになっている。']); return; }
    await c.msg(['埃をかぶった古い端末。製造番号の一覧が表示されている。']);
    if (!inParty('io')) return;
    startOnce(c, 'io_memory');
    await c.say('イオ', ['……この番号、わたし。', '最初の命令の記録がある。読んでもいい？']);
    await c.msg(['【製造番号 IO-0】最初の命令：「周囲を観察し、気づいたことを報告せよ」', '【備考（テオドル）】この個体には、命令の「理由」を問う回路を残しておく。']);
    await c.say('イオ', ['最初の命令は、「見て、気づいたことを言う」だった。', '……今、わたしがしていることと、同じ。命令がなくなっても、これは続けたい。わたしが、そうしたいから。']);
    await c.remark('seris', ['テオドル……師匠は、イオにも「問う」ことを残したのね。'], 'seris_remark_io');
    await c.questComplete('io_memory');
  } });
  // 記憶の墓標（暗黒大陸の前線基地）
  addEvent('dark_camp', { x: 5, y: 16, type: 'script', solid: true, tile: 'sign', run: async function (c) { var d = D();
    if (qd(c, 'dark_memorial')) { await c.msg(['記憶の墓標。旅で失われた人々の名前が刻まれている。']); return; }
    startOnce(c, 'dark_memorial');
    await c.msg(['基地の端の、黒い石の柱。兵士たちが、故郷で失った人の名を刻んでいる。', '……旅の中で出会った、失われた人々の名を刻むことにした。']);
    var names = [];
    if (D().companions.ganes) names.push(['ガネス', '「ティモ」。……弟の名前だ。']);
    if (D().companions.mina) names.push(['ミナ', '父さんの名前。……ここに刻めば、忘れない気がする。']);
    if (D().companions.seris) names.push(['セリス', '「テオドル」。師の名を。正しかったかどうかは、わたしが決めることじゃない。']);
    if (D().companions.ord) names.push(['オルド', '三十二軒の家族の名前を、知っている分だけ。']);
    if (D().companions.nagi) names.push(['ナギ', '「ハヤテ」。……父さん。']);
    for (var i = 0; i < names.length; i++) await c.say(names[i][0], [names[i][1]]);
    if (!names.length) await c.msg(['旅で見送った、名も知らない人々のために、一行だけ刻んだ。']);
    await c.say(D().hero.name, ['……覚えている限り、いなくならない。']);
    await c.questComplete('dark_memorial');
  } });
})(typeof window !== 'undefined' ? window : globalThis);
