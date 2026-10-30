/* =========================================================
   Data / Islands (v5.2 第8〜9章) : 断裂群島——灰灯島アルナ（生存者の村・灯台・廃墟の街・地下施設）、霧の島、海底都市エルミナ（記憶の図書館）
   第8章 main_8「灰灯島の灯火」：
     1. 港町マリナの船着き場でナギ（父の航路図）に会う → ヴェルムのハルトから鉄の竜骨 → 遠洋航海船を建造（galleon_ready）
     2. 南の遠洋航路（外海：海流・嵐）→ 灰灯島アルナ。ヨルン老人（毎晩ひとりで港に灯りをともす）
     3. 廃墟の街で灯台の部品3つ：郵便局のレンズ／時計塔の歯車（ボス「廃墟の記憶」）／倉庫の油。災害の日の手紙・時計・届かなかった物資
     4. 灯台の最上階で修復 → 灯りが戻る → 船が訪れ商人が戻る。イーリス（測量士）加入、地下施設の場所
     5. 地下施設の最深部「天秤の鏡」：災害の真相（クリスタルの異常）。古代の潜航装置
     6. ヨルンに息子の手紙を届ける → main_8 達成（失われた航海図）
   第9章 main_9「海底の記憶」：
     南岸の台座から潜航 → 海底都市エルミナ → 記憶の図書館 3区画（予測・避難・失敗の記録）→ 司書の残像から鍵 → 封印区画：守護機構 → ミナの父の最後の記録 → 記憶の扱いの選択 → main_9 達成
   ・サブ：漂流者の帰還（castaway）、港の灯り（lantern_night）、ミナの父（mina_father）、霧の島の測量（mist_isle）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function parts(c) { return ['lighthouse_lens', 'lighthouse_gear', 'lighthouse_oil'].filter(function (i) { return c.has(i); }).length; }

  /* ---------- 港町マリナ：ナギ（船着き場）。第7章クリア後に現れる ---------- */
  (function () {
    var def = root.MAP_DEFS.harbor_town; if (!def) return;
    def.npcs.push({ id: 'harbor_nagi', x: 26, y: 27, sprite: 'sailor', dir: 'left', wander: 0, showIf: 'kalion_reformed', hideIf: 'nagi_joined', talk: async function (c) {
      await c.say('ナギ', ['あんたが、グラニアと徴収連邦を変えた人たちか。この港じゃ有名だよ。', '私はナギ。父は外海を渡った船乗りだった。……帰ってこなかったけど、航路図は残った。断裂群島——半分が廃墟になった島への道。', '小型帆船じゃ外海の潮流は越えられない。遠洋航海船が要る。設計はこの航路図にある。足りないのは「鉄の竜骨」——グラニアの鉄で鍛えた背骨だ。']);
      await c.say('ナギ', ['ヴェルムの自治会なら鍛えられる。あんたたちが解放した町だ、頼めば聞いてくれるはず。', '私も行く。航海士として。父の航路図を、私の手で最後まで引きたい。']);
      c.give('sea_chart', 1); c.join('nagi'); c.setFlag('nagi_joined', true); await c.msg(['父の航路図を手に入れた！', 'ナギが仲間になった！（航海士）', '転職の条件：ナギ加入後、Lv10以上で「航海士」に転職できる']);
      if (!c.questActive('main_8') && !c.questDone('main_8')) c.questStart('main_8');
      await c.remark('mina', ['外海の向こう……。父さんも、そっちへ行ったのかな。', 'ナギ、あなたのお父さんの航路図、私にも見せて。'], 'mina_remark_nagi');
    } });
    def.npcs.push({ id: 'harbor_shipwright', x: 21, y: 26, sprite: 'villager_m', dir: 'down', wander: 0, showIf: 'nagi_joined', talk: async function (c) {
      if (c.flag('galleon_ready')) { await c.say('船大工', ['遠洋航海船は港の海に浮かべてある。小型帆船の隣だ。', '外海では海流に流される。嵐に遭ったら、じたばたせず流されるのも手だ。']); return; }
      if (c.has('ship_keel')) { await c.say('船大工', ['鉄の竜骨……！ ヴェルムの鉄か、いい仕事だ。ナギの航路図の設計どおりに組む。三日くれ。']); await c.msg(['……三日が過ぎた。港に、見たこともない大きな船が浮かんでいる。']); await c.say('ナギ', ['遠洋航海船だ。父の航路図の船が、本当に浮かんだ……。', '南の端から外海へ出る。海流に流されても慌てないで。私が読む。']); c.take('ship_keel', 1); c.setFlag('galleon_ready', true); if (root.Vehicle) root.Vehicle.unlockIfReady(); await c.msg(['遠洋航海船が完成した！ 港の海に泊めてある。', 'ワールドマップの南端から「南の遠洋航路」で断裂群島へ渡れる。']); return; }
      await c.say('船大工', ['遠洋航海船を造るなら鉄の竜骨が要る。グラニアの灰鉱町ヴェルムの自治会に頼んでみな。']);
    } });
  })();
  /* ---------- ヴェルム：ハルトが鉄の竜骨をくれる（既存の会話に追加） ---------- */
  (function () {
    var def = root.MAP_DEFS.verum_hideout; if (!def) return; var n = def.npcs.filter(function (x) { return x.id === 'hideout_leader'; })[0]; if (!n) return; var orig = n.talk;
    n.talk = async function (c) {
      if (c.flag('nagi_joined') && !c.flag('keel_given')) {
        await c.say('ハルト', ['遠洋航海船の竜骨？ ……鉱山の鉄は、もう鎖には使わない。船の背骨にするなら本望だ。', '自治会で鍛えた。持っていけ。これは、あんたたちへの礼だ。']);
        c.give('ship_keel', 1); c.setFlag('keel_given', true); await c.msg(['鉄の竜骨を手に入れた！ 港町マリナの船大工に渡そう。']);
        await c.remark('gald', ['鎖を作ってた鉄が、船の背骨になる。……悪くねえ。'], 'gald_remark_keel'); return;
      }
      await orig(c);
    };
  })();

  /* ---------- 灰灯島アルナ・生存者の村 ---------- */
  add({ id: 'aruna_village', name: '灰灯島アルナ・生存者の村', kind: 'town', bgm: 'town', fallback: 'grass', style: 'harbor', rows: [
    'ffffffffffffffffffffffffffffffff',
    'f~~..........rr.............666f',
    'f~~..........rr.............666f',
    'f~~.BBBBBBBB.rr.BBBBBBBB.......f',
    'f~~.BBBBBBBB.rr.BBBBBBBB.......f',
    'f~~.BBBBBBBB.rr.BBBBBBBB.......f',
    'f~~.BBBBBBBB.rr.BBBBBBBB..6....f',
    'f~~.BBBBBBBB.rr.BBBBBBBB.......f',
    'f~~d.........rr................f',
    'f~rrrrrrrrrrrrrrrrrrrrrrrrrrrr.f',
    'f~rrrrrrrrrrrrrrrrrrrrrrrrrrrr.f',
    'f~~dBBBBBBBB.rr................f',
    'f~~.BBBBBBBB.rr...BBBBBBBB.....f',
    'f~~.BBBBBBBB.rr...BBBBBBBB.....f',
    'f~~.BBBBBBBB.rr...BBBBBBBB.....f',
    'f~~.BBBBBBBB.rr...BBBBBBBB.....f',
    'f~~..........rr...BBBBBBBB.....f',
    'f~~.....j....rr............Z...f',
    'f~~..........rr................f',
    'f~rrrrrrrrrrrrrrrrrrrrrrrrrrrr.f',
    'f~rrrrrrrrrrrrrrrrrrrrrrrrrrrr.f',
    'f~~...q...y..rr.....y..........f',
    'f~~..........rr................f',
    'ffffffffffffffffffffffffffffffff'
  ],
  buildings: [
    { id: 'inn', type: 'inn', name: '灯りの宿', x: 4, y: 3, w: 8, h: 5, doorX: 3, interior: 'aruna_inn', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '島の道具店', x: 16, y: 3, w: 8, h: 5, doorX: 3, interior: 'aruna_item', entry: { x: 5, y: 7 } },
    { id: 'yorn', type: 'house', name: 'ヨルンの家', x: 4, y: 11, w: 8, h: 5, doorX: 3, interior: 'aruna_house_yorn', entry: { x: 5, y: 7 } },
    { id: 'iris', type: 'elder', name: '測量士の家', x: 18, y: 12, w: 8, h: 5, doorX: 3, interior: 'aruna_house_iris', entry: { x: 5, y: 7 } }
  ],
  warps: [{ x: 13, y: 23, to: 'world_islands', tx: 46, ty: 64, name: '島へ' }, { x: 14, y: 23, to: 'world_islands', tx: 46, ty: 64, name: '島へ' }],
  chests: [{ id: 'av1', x: 27, y: 21, item: 'hi_potion', qty: 2 }],
  events: [{ x: 3, y: 12, type: 'inspect', solid: false, text: ['古い桟橋。ランタンが一つ、柱に掛かっている。', '油は毎晩足されている。誰も来ない港のために。'] }],
  npcs: [
    { id: 'av_yorn', x: 4, y: 9, sprite: 'elder', dir: 'left', wander: 0, talk: async function (c) {
      var d = root.State.data;
      if (!c.flag('aruna_arrived')) { c.setFlag('aruna_arrived', true); await c.say('ヨルン', ['……船だ。船が来た。十八年ぶりだ。', 'わしはヨルン。この島の……いや、この島の西半分の、生き残りの一人だ。東は行くな。あそこは死んだ。', '灯台は消えたままだ。灯りがないから船は来ない。船が来ないから、誰も帰ってこない。']); await c.say('ヨルン', ['わしは毎晩、この桟橋に灯りをともす。帰ってこないとわかっていても、灯りを消したら、本当に終わってしまう気がするんだ。', '……灯台を直せる者がいるなら、部品は東の廃墟にある。郵便局の予備レンズ、時計塔の歯車、倉庫の油。だが廃墟には「あの日」が残っている。']); if (!c.questActive('lantern_night') && !c.questDone('lantern_night')) c.questStart('lantern_night'); await c.remark('mina', ['帰ってこない人を待つって、こういうことなんだ……。', '私も、父さんの灯りを消してないのかもしれない。'], 'mina_remark_yorn'); return; }
      if (c.flag('undercity_record') && c.has('yorn_letter') && !c.flag('yorn_letter_done')) {
        await c.say('ヨルン', ['……それは。その封筒は……息子の字だ。']);
        await c.msg(['ヨルンは手紙を開いた。', '「父さんへ。灯台の当番は交代してもらった。今夜は東の港で荷を降ろしたら、まっすぐ帰る。母さんの誕生日に間に合うように」', '「——追伸。灯台の灯りを消さないでくれ。帰る目印だから」']);
        await c.say('ヨルン', ['……あの日、息子は東の港にいた。帰る途中で、波が来た。', '十八年。わしは灯りをともし続けた。息子が言ったとおりに。……届いたな。やっと。', '灯台が点いた。船が来た。わしの灯りは、もう桟橋の灯りでなくていい。']);
        c.take('yorn_letter', 1); c.setFlag('yorn_letter_done', true); await c.questComplete('lantern_night'); await c.questComplete('main_8');
        await c.say('ヨルン', ['これを持っていけ。息子が持ち帰るはずだった航海図だ。断裂群島のすべてと、その先の海が描いてある。', 'イーリスを頼む。あの子は、失ったものを数えるために地図を描いてきた。これからは、見つけるために描けるだろう。']);
        await c.remark('iris', ['おじいちゃん……。私、行ってくる。地図の外へ。'], 'iris_remark_yorn'); return;
      }
      if (c.flag('lighthouse_lit')) { await c.say('ヨルン', [c.flag('yorn_letter_done') ? '桟橋の灯りは消した。灯台があるからな。……いや、やはり今夜もともそう。癖だ。' : '灯台が点いたな。……今夜は桟橋の灯りをともさなくていい。いや、ともす。癖だ。', c.flag('undercity_record') ? '地下で何を見た？ ……いい。聞かん。あの日の話は、あんたたちが持っていってくれ。' : '地下施設のことはイーリスが知っている。あの子は地図を描き続けた。わしらが忘れようとしたものを、全部。']); return; }
      await c.say('ヨルン', ['部品は東の廃墟だ。郵便局のレンズ、時計塔の歯車、倉庫の油。（' + parts(c) + '/3）', '時計塔には近づくな、と言いたい。あそこの時計は「あの日」の時刻で止まっている。']);
    } },
    { id: 'av_child', x: 15, y: 15, sprite: 'child', dir: 'down', wander: 2, talk: async function (c) { if (c.flag('lighthouse_lit')) await c.say('島の子ども', ['灯台が光った！ ぼく、初めて見た！', 'おじいちゃんたちが泣いてた。なんで嬉しいのに泣くの？']); else await c.say('島の子ども', ['東には行っちゃだめなんだって。なんでかは教えてくれない。', '大人はみんな「あの日」って言うけど、何の日かは言わないんだ。']); } },
    { id: 'av_woman', x: 22, y: 21, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('lighthouse_lit')) await c.say('村の女', ['灯台が点いてから、夜に海を見られるようになった。', '十八年、見られなかったのよ。真っ暗な海は、あの日の海だから。']); else await c.say('村の女', ['……あの日のこと？ 話さないわ。話したら、思い出すから。', 'イーリスは地図を描いてる。崩れた家の一軒一軒を。あの子は忘れられないの。私たちは忘れたいのに。']); } },
    { id: 'av_castaway', x: 8, y: 21, sprite: 'villager_m', dir: 'down', wander: 0, showIf: 'castaway_saved', talk: async function (c) { if (c.questActive('castaway')) { await c.say('漂流者', ['助かった……！ ここなら交易船が来る……いや、来るようになったんだな。', 'これは礼だ。航海士のコートだ、嵐の中で三週間、私を守ってくれた。']); await c.questComplete('castaway'); return; } await c.say('元漂流者', ['次の船で大陸へ帰る。……いや、この島で商いを始めるのも悪くないな。']); } },
    { id: 'av_merchant', x: 26, y: 9, sprite: 'merchant', dir: 'down', wander: 0, showIf: 'lighthouse_lit', talk: async function (c) { await c.say('交易商人', ['灯台の灯りを見て寄港した。この島は地図から消えていたんだ。', 'いい品が揃ってる。見ていくかい？']); await c.shop('weapon', ['knight_sword', 'halberd', 'long_bow', 'assassin_dagger', 'tide_dagger', 'survey_bow', 'holy_mace', 'sage_staff']); } },
    { id: 'av_sailor', x: 5, y: 20, sprite: 'sailor', dir: 'down', wander: 1, showIf: 'lighthouse_lit', talk: async function (c) { await c.say('交易船の船乗り', ['十八年前、この島の港は外海交易の中継地だった。それが一夜で消えた。', '大陸の学者は「クリスタルの異常」だと言う。何のことかは知らんが。']); } }
  ] });
  K.innInterior('aruna_inn', '灯りの宿', 'aruna_village', 7, 8, 50);
  K.shopInterior('aruna_item', '島の道具店', 'aruna_village', 19, 8, 'merchant', 'item', ['herb', 'potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'phoenix_feather', 'tent', 'escape_wing'], ['品は少ないよ。船が来ないからね。……灯台さえ点けば。']);
  add({ id: 'aruna_house_yorn', name: 'ヨルンの家', kind: 'interior', bgm: 'town', rows: [
    '############', '#E___K_____#', '#__________#', '#_t________#', '#__________#', '#______q___#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'aruna_village', tx: 7, ty: 16 }],
    events: [{ x: 5, y: 1, type: 'inspect', solid: false, text: ['本棚に、息子の写真と、空の封筒が並んでいる。', '封筒の宛名は「父さんへ」。中身はない。'] }],
    npcs: [{ id: 'yh_photo', x: 8, y: 4, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { await c.say('ヨルンの妻', ['あの人は毎晩、桟橋へ行くの。止めないわ。止めたら、あの人まで消えてしまいそうで。', '息子は東の港で働いていた。……手紙を書くと言っていたの。届かなかったけれど。']); } }] });
  add({ id: 'aruna_house_iris', name: '測量士の家', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKK_TTT_KK#', '#__________#', '#_t______t_#', '#__________#', '#__________#', '#____S_____#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'aruna_village', tx: 21, ty: 17 }],
    events: [{ x: 8, y: 5, type: 'learn', solid: false, learnId: 'learn_review' }, { x: 5, y: 6, type: 'inspect', solid: false, text: ['壁一面の地図。東側の街が、一軒ずつ描かれている。', '「3番通り 7号 パン屋 ロゼ一家 4人」「港倉庫 当直2名」……名前がすべて書き込まれている。'] }],
    npcs: [{ id: 'ih_iris', x: 3, y: 2, sprite: 'villager_f', dir: 'down', wander: 0, hideIf: 'iris_joined', talk: async function (c) {
      var d = root.State.data;
      if (!c.flag('lighthouse_lit')) { await c.say('イーリス', ['……測量士のイーリス。東の廃墟の地図を描いている。', '村の人は「忘れたい」と言う。私は忘れられない。どちらも間違っていない。ただ、忘れたい人と、忘れられない人がいる。', '灯台を直すの？ 部品は廃墟にある。地図を見ていけば迷わない。……時計塔には気をつけて。あそこには「あの日」が残っている。', (parts(c) ? '部品は ' + parts(c) + '/3。' : '')].filter(Boolean)); return; }
      await c.say('イーリス', ['灯台が点いた。……おじいちゃんが泣いていた。初めて見た。', '地図を描き続けてわかったことがある。この島の地下に、災害の前からある施設がある。入口は廃墟の北の崩れた祠。', '私も行く。測量士として。この島に何が起きたのか、地図に描けないものを、見に行く。']);
      c.join('iris'); c.setFlag('iris_joined', true); await c.msg(['イーリスが仲間になった！（測量士）', '転職の条件：イーリス加入後、Lv10以上で「測量士」に転職できる', '測量：イーリスがパーティーにいると、ダンジョンの宝箱の位置がミニマップに見える。地図に「霧の島」が現れた。']);
      if (!c.questActive('mist_isle') && !c.questDone('mist_isle')) c.questStart('mist_isle');
      await c.remark('nagi', ['イーリス、あなたの地図と私の航路図、つなげてみない？ 陸と海で、一枚の地図になる。'], 'nagi_remark_iris');
    } }] });

  /* ---------- 灯台 ---------- */
  add({ id: 'aruna_lighthouse', name: '灰灯島の灯台', kind: 'interior', bgm: 'dungeon', rows: [
    '############', '#____>_____#', '#__________#', '#_q________#', '#__________#', '#________q_#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 9, to: 'world_islands', tx: 66, ty: 36 }, { x: 5, y: 1, to: 'aruna_lighthouse_top', tx: 5, ty: 7 }],
    chests: [{ id: 'lh1', x: 9, y: 7, item: 'ether', qty: 2 }],
    npcs: [{ id: 'lh_keeper', x: 8, y: 2, sprite: 'villager_m', dir: 'down', wander: 0, showIf: 'lighthouse_lit', talk: async function (c) { await c.say('新しい灯台守', ['村の若い者で交代して灯台を守ることにした。ヨルンじいさんは「桟橋の灯りで十分だ」と言うが、ここは任せろと言ってある。', 'あんたたちが直した灯りだ。消さない。']); } }] });
  add({ id: 'aruna_lighthouse_top', name: '灯台の最上階', kind: 'interior', bgm: 'dungeon', rows: [
    '############', '#__________#', '#____XX____#', '#____XX____#', '#__________#', '#__________#', '#__________#', '#____<_____#', '############'
  ], warps: [{ x: 5, y: 7, to: 'aruna_lighthouse', tx: 5, ty: 2 }],
    events: [{ x: 5, y: 4, type: 'script', solid: false, run: async function (c) {
      if (c.flag('lighthouse_lit')) { await c.msg(['灯台の灯りが海を照らしている。', '水平線に、船の影が二つ見える。']); return; }
      var n = parts(c);
      if (n < 3) { await c.msg(['灯台の灯室。レンズは割れ、歯車は錆びて止まり、油槽は空だ。', '必要な部品：灯台のレンズ／灯台の歯車／灯台の油（' + n + '/3）']); return; }
      await c.msg(['レンズを据え、歯車を噛ませ、油を注いだ。', '……火を入れる。']);
      c.take('lighthouse_lens', 1); c.take('lighthouse_gear', 1); c.take('lighthouse_oil', 1); c.setFlag('lighthouse_lit', true); root.World.applyState(root.World.map);
      await c.msg(['灯台に光が戻った！', '光は廃墟の街を、港を、そして外海を照らした。', '……桟橋で、小さなランタンがひとつ、揺れている。']);
      await c.remark('nagi', ['灯りが見える海は、怖くない。父もそう言っていた。'], 'nagi_remark_light');
      await c.remark('kyle', ['目印の灯り、か。俺たちの判断にも、消してはいけない灯りがある。……上位足の環境だ。'], 'kyle_remark_light');
    } }] });

  /* ---------- 廃墟の街（東側。拠点扱い：歩き回れる・入れる建物3つ） ---------- */
  add({ id: 'aruna_ruins', name: '廃墟の街', kind: 'town', bgm: 'dungeon', fallback: 'stone', style: 'stone', rows: [
    'cccccccccccccccccccccccccccccccccccccccc',
    'c=z===========8===rrrr=================c',
    'c=================rrrr=================c',
    'c===WWWWWWWWWW====rrrr=====WW=WWWW=W===c',
    'c===Wz__zz___W====rrrr=====________W===c',
    'c====z__zz__zW====rrrr=q==W_______zW===c',
    'c===W__zzz___W====rrrr====Wzz_zz__zW===c',
    'c===WW=WWWW==W====rrrr====W===WWW==W===c',
    'c===q=============rrrr=================c',
    'c=================rrrr============q====c',
    'c=============q===rrrr=================c',
    'c===Z=============rrrr=======q========8c',
    'c=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=c',
    'c=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=c',
    'c===============z=rrrr=============q===c',
    'c===WWWWWWWW======rrrr====8=WW==WWWW===c',
    'c===W______W======rrrr======W__zz__W===c',
    'c====_____zW======rrrr======Wz_____W===c',
    'c===Wzzz_zzW======rrrr======W____z_====c',
    'c===WWW=WWWW======rrrr==========WWWW===c',
    'c=========Z=z=====rrrr=================c',
    'c=================rrrr=================c',
    'c=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=c',
    'c=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=c',
    'c===8=============rrrr============q====c',
    'c=z===WWWW=W======rrrr========W=WW=====c',
    'c======___zW======rrrr========Wz____W==c',
    'c=====WWW==W======rrrr========W==WWW==Zc',
    'c=Z===============rrrr======q==========c',
    'cccccccccccccccccccccccccccccccccccccccc'
  ],
  buildings: [
    { id: 'post', type: 'house', name: '郵便局跡', x: 12, y: 15, w: 8, h: 5, doorX: 3, interior: 'ruins_post', entry: { x: 5, y: 7 } },
    { id: 'store', type: 'house', name: '倉庫跡', x: 26, y: 8, w: 8, h: 5, doorX: 3, interior: 'ruins_store', entry: { x: 5, y: 7 } },
    { id: 'clock', type: 'castle', name: '時計塔', x: 14, y: 2, w: 10, h: 6, doorX: 4, interior: 'aruna_ruins_1', entry: { x: 2, y: 10 } }
  ],
  warps: [{ x: 18, y: 29, to: 'world_islands', tx: 86, ty: 64, name: '島へ' }, { x: 19, y: 29, to: 'world_islands', tx: 86, ty: 64, name: '島へ' }, { x: 20, y: 29, to: 'world_islands', tx: 86, ty: 64, name: '島へ' }, { x: 21, y: 29, to: 'world_islands', tx: 86, ty: 64, name: '島へ' },
    { x: 36, y: 2, to: 'aruna_underground_1', tx: 1, ty: 1, needFlag: 'iris_joined', name: '崩れた祠（地下施設）' }],
  chests: [{ id: 'ar1', x: 4, y: 27, item: 'hi_ether', qty: 2 }, { id: 'ar2', x: 34, y: 27, gold: 900 }],
  events: [
    { x: 8, y: 10, type: 'inspect', solid: false, text: ['壊れた時計が落ちている。針は 7時42分 で止まっている。', '街中の時計が、同じ時刻で止まっている。'] },
    { x: 30, y: 19, type: 'inspect', solid: false, text: ['崩れた家の中に、子どもの靴が片方。', '壁に残る文字：「ロゼ一家 4人 全員」。イーリスの字だ。'] },
    { x: 36, y: 3, type: 'inspect', solid: false, text: ['崩れた祠。奥に、災害よりずっと古い石の階段が続いている。', '祠の石には天秤の紋章——忘却の洞窟の欠片と同じ紋章だ。'] }
  ],
  npcs: [{ id: 'ru_shade', x: 10, y: 24, sprite: 'shadow', dir: 'down', wander: 1, hideIf: 'lighthouse_lit', talk: async function (c) { await c.say('影', ['……帰る……灯りが……見えない……', '（影は街の奥へ消えた）']); } }],
  encounters: { rate: 0.03, zones: [{ name: '廃墟の街', test: function () { return true; }, groups: [['ruin_shade'], ['ruin_shade', 'lantern_wisp'], ['drift_golem'], ['rust_crab', 'ruin_shade']], level: 19 }] } });
  add({ id: 'ruins_post', name: '郵便局跡', kind: 'interior', bgm: 'dungeon', rows: [
    '############', '#KKK_T__KKK#', '#__________#', '#_z____z___#', '#__________#', '#____q_____#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'aruna_ruins', tx: 15, ty: 20 }],
    events: [
      { x: 2, y: 3, type: 'pickup', item: 'lighthouse_lens', doneFlag: 'lighthouse_part_1', text: ['棚の奥に、布に包まれた大きなレンズ。「灯台 予備」の札。'] },
      { x: 8, y: 3, type: 'pickup', item: 'yorn_letter', doneFlag: 'yorn_letter_found', text: ['配達されなかった手紙の山。……一通だけ、宛名が読める。', '「父さんへ」——差出人は、灰灯島東港 荷役係。'] },
      { x: 5, y: 1, type: 'inspect', solid: false, text: ['郵便局のカウンター。消印は「あの日」の朝で止まっている。', '届けられなかった手紙が、十八年分の埃をかぶっている。'] }
    ] });
  add({ id: 'ruins_store', name: '倉庫跡', kind: 'interior', bgm: 'dungeon', rows: [
    '############', '#qqq____zzz#', '#__________#', '#_z____q___#', '#__________#', '#__________#', '#____z_____#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'aruna_ruins', tx: 29, ty: 13 }],
    chests: [{ id: 'rs1', x: 9, y: 6, item: 'tent', qty: 2 }],
    events: [
      { x: 7, y: 3, type: 'pickup', item: 'lighthouse_oil', doneFlag: 'lighthouse_part_3', text: ['樽の列。ほとんどは空だが、一つだけ封がされている。「灯台用 灯油」。'] },
      { x: 2, y: 1, type: 'inspect', solid: false, text: ['届けられなかった物資。薬、毛布、子どもの本。', '送り状：「灰灯島 生存者の村へ」。……村には届かなかった。港が死んだから。'] }
    ] });
  /* 時計塔（ダンジョン2階層。2階に廃墟の記憶） */
  add({ id: 'aruna_ruins_1', name: '時計塔 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '####################',
    '#______#____#______#',
    '#_zz___#_q__#__zz__#',
    '#______#____#______#',
    '#__#####_##_#####__#',
    '#__#_____________#_#',
    '#__#_###_____###_#_#',
    '#__#_#_____z_#_#_#_#',
    '#__#_#__i_i__#_#_#_#',
    '#__#_#_______#_#_#_#',
    '#____#__>____#_____#',
    '#_D________________#',
    '####################'
  ],
  warps: [{ x: 2, y: 11, to: 'aruna_ruins', tx: 18, ty: 9 }, { x: 8, y: 10, to: 'aruna_ruins_2', tx: 2, ty: 9 }],
  chests: [{ id: 'rt1', x: 9, y: 2, gold: 800 }, { id: 'rt2', x: 16, y: 2, item: 'phoenix_feather', qty: 1 }],
  events: [{ x: 10, y: 7, type: 'inspect', solid: false, text: ['時計塔の大時計の裏側。巨大な振り子が、7時42分の位置で止まっている。', '歯車は上の階だ。'] }],
  encounters: { rate: 0.04, zones: [{ name: '時計塔', test: function () { return true; }, groups: [['ruin_shade', 'ruin_shade'], ['lantern_wisp', 'lantern_wisp'], ['drift_golem'], ['ruin_shade', 'drift_golem']], level: 19 }] } });
  add({ id: 'aruna_ruins_2', name: '時計塔 2階（止まった時計）', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    '##############',
    '#_____XX_____#',
    '#____________#',
    '#__i______i__#',
    '#____________#',
    '#____________#',
    '#__i______i__#',
    '#____________#',
    '#____________#',
    '#_<__________#',
    '##############'
  ],
  warps: [{ x: 2, y: 9, to: 'aruna_ruins_1', tx: 8, ty: 10 }],
  chests: [{ id: 'rt3', x: 11, y: 8, item: 'silk_robe', qty: 1 }],
  events: [
    { x: 6, y: 3, type: 'boss', solid: false, doneFlag: 'ruin_memory_defeated', enemy: 'boss_ruin_memory', intro: ['時計の機構の前に、街のすべての影が集まって、ひとつの形になった。', '廃墟の記憶「……忘れるな……忘れるな……7時42分……」'], after: ['影はほどけ、ひとつひとつの人の形に戻ってから、消えた。', '最後の影が、笑ったように見えた。', '時計の機構が、軋んで動き始めた——7時43分。'] },
    { x: 7, y: 3, type: 'pickup', item: 'lighthouse_gear', doneFlag: 'lighthouse_part_2', text: ['止まっていた機構から、大歯車を外した。灯台の歯車と同じ規格だ。'] },
    { x: 10, y: 8, type: 'learn', solid: false, learnId: 'practice_ruins' }
  ],
  encounters: null });
  // 歯車は廃墟の記憶を倒すまで取れない：boss の後にだけ pickup が働くよう、pickup を script で包む
  (function () { var def = root.MAP_DEFS.aruna_ruins_2; var pk = def.events.filter(function (e) { return e.type === 'pickup'; })[0]; pk.type = 'script'; pk.run = async function (c, ev) { var d = root.State.data; if (!d.flags.ruin_memory_defeated) { await c.msg(['機構の前に影が集まっている。歯車に手が届かない。']); return; } if (d.flags[ev.doneFlag]) { await c.msg(['機構に歯車はもうない。']); return; } await c.msg(ev.text); c.give(ev.item, 1); d.flags[ev.doneFlag] = true; await c.msg([root.ITEMS[ev.item].name + 'を手に入れた！']); root.World.applyState(root.World.map); }; })();

  /* ---------- 地下施設（災害の前からある古代の施設） ---------- */
  add({ id: 'aruna_underground_1', name: '地下施設 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '##########################',
    '#_____#________#_________#',
    '#_KK__#__KKK___#__i___i__#',
    '#_____#________#_________#',
    '#__####__#######___###___#',
    '#________#_____#___#_#___#',
    '#__#####_#_XX__#___#_#___#',
    '#__#_____#_____#_###_#___#',
    '#__#_###_###_###_#___#___#',
    '#__#_#_________#_#_#####_#',
    '#____#__i___i__#_________#',
    '#______________>_________#',
    '##########################'
  ],
  warps: [{ x: 1, y: 1, to: 'aruna_ruins', tx: 36, ty: 4 }, { x: 15, y: 11, to: 'aruna_underground_2', tx: 1, ty: 1 }],
  chests: [{ id: 'ug1', x: 11, y: 2, item: 'elixir', qty: 1 }, { id: 'ug2', x: 23, y: 5, gold: 1200 }, { id: 'ug3', x: 12, y: 6, item: 'knight_armor', qty: 1 }],
  events: [{ x: 11, y: 7, type: 'inspect', solid: false, text: ['結晶の柱。忘却の洞窟の欠片と同じ光。', '壁の文字：「観測所 第3。均衡の変動を記録せよ」。災害より何百年も前の施設だ。'] }],
  encounters: { rate: 0.04, zones: [{ name: '地下施設', test: function () { return true; }, groups: [['deep_guard'], ['ruin_shade', 'ruin_shade'], ['drift_golem', 'lantern_wisp'], ['archive_eel']], level: 20 }] } });
  add({ id: 'aruna_underground_2', name: '地下施設 最深部（観測室）', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    '##################',
    '#<______#________#',
    '#__KK___#__XXX___#',
    '#_______#__XXX___#',
    '#__####_#________#',
    '#_______#_i______#',
    '#_i__i__####_#####',
    '#________________#',
    '#__q_________z___#',
    '##################'
  ],
  warps: [{ x: 1, y: 1, to: 'aruna_underground_1', tx: 14, ty: 11 }],
  chests: [{ id: 'ug4', x: 16, y: 8, item: 'hi_ether', qty: 3 }],
  events: [
    { x: 12, y: 4, type: 'script', solid: false, run: async function (c) {
      var d = root.State.data;
      if (d.flags.undercity_record) { await c.msg(['天秤の鏡。記録はもう読んだ。', '「均衡は、決められた未来を拒む」']); return; }
      await c.msg(['結晶の前に、鏡のような装置。触れると、記録が浮かび上がった。', '【天秤の鏡 記録 最終】「均衡のクリスタルの変動、臨界。何者かが「未来の固定」を試みている。観測値が一点に収束——すべての波が止まる」', '「——止まった波は、崩れる。18年前の今日、7時42分。沿岸都市の記録装置がすべて停止。大津波。」', '「災害は天災ではない。相場の波を止めようとした者がいた。未来を一つに決めようとした者が。」']);
      await c.msg(['記録の末尾：「沈んだ都エルミナ・記憶の図書館に、予測した者たちの記録がある。潜航装置はここに残す」']);
      c.give('balance_mirror', 1); d.flags.undercity_record = true; if (!d.flags.submarine_owned) { c.give('submarine', 1); d.flags.submarine_owned = true; await c.msg(['天秤の鏡を手に入れた！', '古代の潜航装置を手に入れた！ 灰灯島の南岸の台座から海底都市へ潜れる。']); }
      if (!c.questActive('main_9') && !c.questDone('main_9')) c.questStart('main_9');
      await c.remark('seris', ['未来の固定……波を止める……。師が研究していたのは、これだ。', '相場の波を止めれば、誰も損をしない——そう言っていた。止まった波は、崩れるのに。'], 'seris_remark_mirror');
      await c.remark('iris', ['天災じゃなかった。……誰かが、止めようとした。', '地図に描く。この記録も。忘れないために。'], 'iris_remark_mirror');
      await c.remark('lucia', ['波を止める……。師匠が言っていた。「波のない相場は、死んだ相場だ」と。'], 'lucia_remark_mirror');
    } }
  ],
  encounters: null });

  /* ---------- 霧の島（サブ：イーリス加入後に現れる） ---------- */
  add({ id: 'mist_isle', name: '霧の島', kind: 'dungeon', bgm: 'dungeon', fallback: 'grass', rows: [
    'mmmmmmmmmmmmmmmm',
    'mmm..........mmm',
    'mm....ff......mm',
    'm......f.......m',
    'm...hh....S....m',
    'm...hh.........m',
    'm.......ff.....m',
    'm..............m',
    'm....f.....f...m',
    'mm............mm',
    'mmm.........mmmm',
    'mmmm..mmmmmmmmmm',
    'mmmmm..mmmmmmmmm',
    'mmmmmmmmmmmmmmmm'
  ],
  warps: [{ x: 5, y: 12, to: 'world_islands', tx: 134, ty: 100 }, { x: 6, y: 12, to: 'world_islands', tx: 134, ty: 100 }],
  chests: [{ id: 'mi1', x: 11, y: 8, item: 'elixir', qty: 1 }, { id: 'mi2', x: 2, y: 8, item: 'ring_speed', qty: 1 }],
  events: [{ x: 10, y: 4, type: 'script', solid: true, run: async function (c) { var d = root.State.data; if (d.flags.mist_surveyed) { await c.msg(['古い測量標。「断裂群島 基準点」']); return; } await c.msg(['霧の中に石の測量標。「断裂群島 基準点 ——ここから全ての距離を測る」', '災害より古い、古代の測量士の印だ。']); d.flags.mist_surveyed = true; await c.remark('iris', ['基準点……。全部の地図は、ここから始まっていたんだ。', '私の地図も、ここにつなぐ。'], 'iris_remark_mist'); if (c.questActive('mist_isle')) await c.questComplete('mist_isle'); } }],
  encounters: { rate: 0.03, zones: [{ name: '霧の島', test: function () { return true; }, groups: [['salt_wolf', 'salt_wolf', 'salt_wolf'], ['drift_golem', 'drift_golem'], ['lantern_wisp', 'ruin_shade']], level: 20 }] } });

  /* ---------- 海底都市エルミナ ---------- */
  add({ id: 'elmina_undersea', name: '海底都市エルミナ', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCCC',
    'C::I::::::D::::::I:::C',
    'C::::::::::::::::::::C',
    'C:CCCC::CCCCCC::CCCC:C',
    'C:C::C::C::::C::C::C:C',
    'C:C::C::C::X:C::C::C:C',
    'C:C::C::C::X:C::C::C:C',
    'C:CC:C::CC::CC::C:CC:C',
    'C::::::::::::::::::::C',
    'C::I::::::::::::::I::C',
    'C::::::::::::::::::::C',
    'C:CC:CC::::::::CC:CC:C',
    'C:C:::C::::::::C:::C:C',
    'C:C:::C::::::::C:::C:C',
    'C:CCCCC::::::::CCCCC:C',
    'C::::::::::::::::::::C',
    'C::I:::::::::::::::I:C',
    'C::::::::::::::::::::C',
    'C:::::::::@::::::::::C',
    'CCCCCCCCCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 10, y: 18, to: 'world_islands', tx: 70, ty: 80, name: '潜航装置で海上へ' }, { x: 10, y: 1, to: 'memory_library', tx: 9, ty: 14, name: '記憶の図書館' }],
  chests: [{ id: 'el1', x: 3, y: 12, item: 'sage_robe', qty: 1 }, { id: 'el2', x: 18, y: 12, gold: 2000 }, { id: 'el3', x: 9, y: 4, item: 'phoenix_feather', qty: 2 }],
  events: [
    { x: 10, y: 17, type: 'script', solid: false, run: async function (c) { var d = root.State.data; if (!d.flags.elmina_arrived) { d.flags.elmina_arrived = true; await c.msg(['潜航装置が海底の広場に着いた。結晶の光に照らされた、沈んだ都エルミナ。', '建物は珊瑚に覆われているが、崩れていない。十八年前、一夜で沈んだ街だ。', '北の大きな建物が「記憶の図書館」。']); await c.remark('mina', ['……父さんは、ここにいたの？', '怖い。記録を読むのが。読んだら、本当に「いない」って決まる気がして。'], 'mina_remark_elmina'); if (d.companions.mina && d.party.indexOf('mina') >= 0 && !c.questActive('mina_father') && !c.questDone('mina_father')) c.questStart('mina_father'); } else await c.msg(['潜航装置の着水点。ここから海上へ戻れる。']); } },
    { x: 4, y: 5, type: 'inspect', solid: false, text: ['沈んだ家の中。食卓に皿が並んだまま。', '壁の時計は 7時42分。'] },
    { x: 17, y: 5, type: 'inspect', solid: false, text: ['沈んだ港湾事務所。日誌の最後の頁：「7:30 観測所より警報。全員を高台へ。記録係は残る——D」'] }
  ],
  encounters: { rate: 0.035, zones: [{ name: '海底都市', test: function () { return true; }, groups: [['deep_guard'], ['coral_wraith', 'coral_wraith'], ['archive_eel', 'archive_eel'], ['deep_guard', 'coral_wraith'], ['archive_eel', 'coral_wraith']], level: 21 }] } });
  /* 記憶の図書館：中央ホール＋3区画＋封印区画 */
  add({ id: 'memory_library', name: '記憶の図書館', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCC',
    'C:KKK:C:::::::C:KKK:C',
    'C:::::C:::L:::C:::::C',
    'C:KKK:C:::::::C:KKK:C',
    'C:::::CCCC:CCCC:::::C',
    'C:::::::::::::::::::C',
    'CCCC:CC:::::::CC:CCCC',
    'C:KKK:C:::::::C:KKK:C',
    'C:::::C:::I:::C:::::C',
    'C:KKK:C:::::::C:KKK:C',
    'C:::::C:::::::C:::::C',
    'CCCC:CC:::::::CC:CCCC',
    'C:::::::::::::::::::C',
    'C:::::::::::::::::::C',
    'C:::::::::D:::::::::C',
    'CCCCCCCCCCCCCCCCCCCCC'
  ],
  warps: [{ x: 10, y: 14, to: 'elmina_undersea', tx: 10, ty: 2 }],
  chests: [{ id: 'ml1', x: 18, y: 10, item: 'elixir', qty: 1 }],
  events: [
    { x: 2, y: 2, type: 'script', solid: false, run: async function (c) { var d = root.State.data; await c.msg(['【第一区画：予測の記録】', '「観測所第3の報告：均衡の変動が臨界に近い。誰かが波を止めようとしている」', '「我々はこれを予測した。しかし街の誰も、波が止まることが災害になるとは信じなかった。上がり続ける、と皆が言った」', '「上がり続ける相場はない。止まった波は崩れる。これは観測であり、予言ではない」']); if (!d.flags.library_1) { d.flags.library_1 = true; await c.msg(['予測の記録を読んだ。（図書館 ' + ['library_1', 'library_2', 'library_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); } } },
    { x: 18, y: 2, type: 'script', solid: false, run: async function (c) { var d = root.State.data; await c.msg(['【第二区画：避難の記録】', '「7:30 警報。高台へ。港の荷役、灯台の当番、記録係に伝達」', '「7:38 記録係D、残留を申告。「記録を守る。これは次の者のためだ」」', '「7:42 ——」']); if (!d.flags.library_2) { d.flags.library_2 = true; await c.msg(['避難の記録を読んだ。（図書館 ' + ['library_1', 'library_2', 'library_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); } await c.remark('mina', ['記録係……D……。', '父さんの名前は、ダリル。……まだ、決まってない。まだ。'], 'mina_remark_lib2'); } },
    { x: 2, y: 8, type: 'script', solid: false, run: async function (c) { var d = root.State.data; await c.msg(['【第三区画：失敗の記録】', '「我々は未来を変えようとした。予測を公表し、街を動かそうとした。失敗した」', '「人は「上がる」と言われれば信じ、「止まる」と言われれば笑う。我々は伝え方を誤った。根拠を示さず、結論だけを叫んだ」', '「次の者へ。結論ではなく、根拠を残せ。記録を残せ。読む者が自分で判断できるように」']); if (!d.flags.library_3) { d.flags.library_3 = true; await c.msg(['失敗の記録を読んだ。（図書館 ' + ['library_1', 'library_2', 'library_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); } await c.remark('elna', ['結論ではなく根拠を残せ……。帳簿と同じね。', '読む者が自分で判断できる記録。それが、私たちの作る制度。'], 'elna_remark_lib3'); } },
    { x: 10, y: 2, type: 'locked', solid: true, doneFlag: 'seal_opened', key: 'seal_key', text: ['封印区画の扉。「記録を持ち出す者を拒む」', '鍵穴がある。'] }
  ],
  npcs: [{ id: 'ml_librarian', x: 10, y: 9, sprite: 'shadow', dir: 'down', wander: 0, talk: async function (c) {
    var d = root.State.data; var n = ['library_1', 'library_2', 'library_3'].filter(function (f) { return d.flags[f]; }).length;
    if (c.flag('seal_opened') || c.has('seal_key')) { await c.say('司書の残像', ['封印区画の奥に、最後の記録係の記録がある。守護機構は「持ち出す者」を拒む。', '……読む者は、拒まない。']); return; }
    if (n < 3) { await c.say('司書の残像', ['……読みに来た者か。持ち出しに来た者か。', '三つの区画を読め。予測、避難、失敗。順番はどれでもいい。読んでから、封印区画の鍵を渡す。（' + n + '/3）']); return; }
    await c.say('司書の残像', ['三つとも読んだな。……我々は予測し、避難させ、失敗した。それでも記録は残った。', '封印区画の鍵だ。奥には最後の記録係——D——の記録がある。守護機構が守っている。「持ち出す者」を拒む機構だ。', (d.companions.mina && d.party.indexOf('mina') >= 0) ? '……その娘。記録係の顔をしている。' : '']);
    c.give('seal_key', 1); await c.msg(['封印区画の鍵を手に入れた！']);
  } }],
  encounters: { rate: 0.03, zones: [{ name: '記憶の図書館', test: function () { return true; }, groups: [['coral_wraith'], ['archive_eel', 'coral_wraith'], ['deep_guard', 'deep_guard']], level: 21 }] } });
  // 封印区画への扉のワープ（扉の奥 (10,1) に立つと移動）
  root.MAP_DEFS.memory_library.warps.push({ x: 10, y: 1, to: 'memory_library_seal', tx: 6, ty: 10, needFlag: 'seal_opened' });
  add({ id: 'memory_library_seal', name: '記憶の図書館・封印区画', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCC',
    'C:::::K:::::C',
    'C::KK:::KK::C',
    'C:::::::::::C',
    'C:::::::::::C',
    'C::I:::::I::C',
    'C:::::::::::C',
    'C:::::::::::C',
    'C:::::::::::C',
    'C:::::::::::C',
    'C:::::::::::C',
    'CCCCCCDCCCCCC'
  ],
  warps: [{ x: 6, y: 11, to: 'memory_library', tx: 10, ty: 3 }],
  events: [
    { x: 6, y: 6, type: 'boss', solid: false, doneFlag: 'library_guardian_defeated', enemy: 'boss_library_guardian', intro: ['部屋の中央で、古代の機構が目を開けた。', '図書館の守護機構「記録ヲ持チ出ス者カ。読ム者カ。——判定不能。排除スル」'], after: ['機構は動きを止めた。目の光が、拒絶から……待機に変わった。', '奥の記録台が、静かに光っている。'] },
    { x: 6, y: 2, type: 'script', solid: false, run: async function (c) {
      var d = root.State.data; var withMina = !!(d.companions.mina && d.party.indexOf('mina') >= 0);
      if (d.flags.mina_father_record) { await c.msg(['記録台。最後の記録係の記録は、' + (d.flags.memory_choice === 0 ? '持ち帰った。' : 'ここに残した。'), '台座に一行：「お前が自分の人生を歩いてくれるなら」']); return; }
      if (!d.flags.library_guardian_defeated) { await c.msg(['守護機構が記録台を守っている。']); return; }
      if (withMina) await c.say('ミナ', ['……読む。私が読む。']);
      await c.msg(['【最後の記録係 D の記録】', '「7:38。警報から八分。港の人間は高台へ送った。灯台の当番にも伝えた。わたしは残る。記録を守るために」', '「記録は、次に波を止めようとする者が現れたとき、止めてはいけない理由になる。だから残す」', '「——娘へ。ミナへ。逃げ遅れたんじゃない。守るために残った。お前には悪いと思っている」', '「大切なものを守れなかった日もあった。でも、お前が自分の人生を歩いてくれるなら、俺の人生も無駄じゃなかったと思える」', '「上がり続ける波はない。止まる波もない。波は、上がって、下がって、また上がる。それだけを、覚えていてくれ。——ダリル」']);
      if (withMina) { await c.say('ミナ', ['……父さん。', '……うん。歩く。自分の人生を。……宝箱、いっぱい開けて。']); }
      var a = await c.choice('記録をどうする？', ['持ち帰る（海底都市の記録として大陸へ）', '図書館に残す（写しだけを持ち帰る）']);
      d.flags.memory_choice = a < 0 ? 1 : a; d.flags.mina_father_record = true;
      await c.msg([a === 0 ? '記録を持ち帰ることにした。守護機構は——もう、止めなかった。' : '記録は図書館に残し、写しを持ち帰った。「読む者が自分で判断できるように」', '災害は天災ではなく、クリスタルの異常——誰かが未来を一つに固定しようとした結果だった。']);
      if (withMina) { await c.questComplete('mina_father'); }
      await c.questComplete('main_9');
      await c.remark('mina', ['……行こう。次は、時の神殿。未来が決まってないって、確かめに。'], 'mina_remark_after');
      await c.remark('seris', ['未来を固定しようとした者……。師テオドルの理論。そして、島の〈オラクル〉。', '全部、つながっている。'], 'seris_remark_record');
    } }
  ],
  encounters: null });
})(typeof window !== 'undefined' ? window : globalThis);
