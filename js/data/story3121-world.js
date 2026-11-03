/* =========================================================
   Data / Story 3121 の世界（v6.9）: トレード財団・波形教・旧地球の記録・各章の新しい出来事・任意クエスト5本
   ・トレード財団と波形教は「別々の現存組織」。約1000年前（西暦2121年ごろ）に「波形トレーダーズビルド」のもちぽよと
     門下生が開いた学びの場から分かれた——と「伝わる」。年・経緯・人物の同一性は確定させない（台詞は「とされる」「記録には」）
   ・仲間のもちぽよ（2035年からの時渡り）と伝承のもちぽよが同じ人かどうかは決めない。本人は「昔、似たようなことを
     教えた気もする。でも、あの時代だったかな」と曖昧に言うだけ
   ・2052年の崩壊（旧地球文明）と、均衡暦0年＝西暦3024年の第二の大災害は別の出来事。旧文明のAIとオラクルも別のもの
   ・置き場所：財団本部＝相場都市トレディア（マクディア地方）の南東の空き地に建物を足す。波形聖堂＝リヴェル城下町の北東。
     財団のカリオン出張所の監査員＝徴収都市カリオン。各章の記録・碑文は既存のマップの空いているマス（work/s3121/freespots.js で確認）
   ・既存の章のフラグ・ボス・加入・報酬は変えない。新しい報酬は一度だけ（フラグで判定）
   ========================================================= */
(function (root) {
  'use strict';
  var MD = root.MAP_DEFS; var add = root.TownKit.add; var ITEMS = root.ITEMS; var QUESTS = root.QUESTS; var S = root.Story3121;
  function D() { return root.State.data; }
  function F() { return D().flags; }
  function hero() { return D().hero.name; }
  function inParty(id) { var d = D(); return !!(d.companions[id] && d.party.indexOf(id) >= 0); }
  function ev(mapId, e) { var m = MD[mapId]; if (!m) return; m.events = m.events || []; if (m.events.some(function (x) { return x.x === e.x && x.y === e.y; })) return; m.events.push(e); }
  function npc(mapId, n) { var m = MD[mapId]; if (!m) return; m.npcs = m.npcs || []; if (m.npcs.some(function (x) { return x.id === n.id; })) return; n.noChatter = true; n.s3121 = true; m.npcs.push(n); }
  function once(flag) { var f = F(); if (f[flag]) return false; f[flag] = true; return true; }
  async function chronicle(c, flag, note) {
    var f = F(); var first = !f[flag]; f[flag] = true;
    if (!root.State.hasItem('s3121_chronicle')) { root.State.addItem('s3121_chronicle', 1); await c.msg(['記録の写しを取った。', '「千年の記録帳」を手に入れた。（重要アイテム。旅で見つけた古い記録が、ここにたまっていく）']); }
    else if (first) await c.msg(['記録の写しを「千年の記録帳」に書き加えた。' + (note ? '（' + note + '）' : '')]);
    checkQuests();
    return first;
  }
  function checkQuests() {
    var f = F(); var d = D();
    var er = QUESTS.s3121_earth_record; if (er && d.quests.s3121_earth_record && d.quests.s3121_earth_record.state === 'active') { /* 完了は記憶の図書館の司書の影で報告（下） */ }
    if (!d.quests.s3121_earth_record && (f.s3121_rec_strata || f.s3121_rec_2052)) root.Events.questStart('s3121_earth_record');
  }

  /* =========================================================
     千年の記録帳（図鑑）：見つけた記録だけが読める
     ========================================================= */
  var REC = [
    ['s3121_frag_1', '創設伝承の断片 その一（リヴェルの波形聖堂）', ['「荒れ野の時代、波形トレーダーズビルドのもちぽよと門下の者たちは、飢えぬための学びの場を開いた」', '「教えは三つ。波を読め。欲に呑まれるな。負けを小さくして、明日へ残れ」', '——写本の余白に、後の時代の筆で「この年代は確かめられない」と書き添えてある。']],
    ['s3121_frag_2', '創設伝承の断片 その二（トレディアの財団文庫）', ['『波形トレーダーズビルド教学録』写本。', '「相場は当てる遊びではない。外れたときに生き残る遊びである」', '「学びの場はやがて二つに分かれた。富を誰のために使うかを問う者たちと、失うことをどう受け入れるかを問う者たち」', '——原本は失われ、これは何度も写されたものだという。']],
    ['s3121_frag_3', '創設伝承の断片 その三（マクディアの禁書庫）', ['年代記の、欠けた頁の前後。', '「……の年、学びの場の師は、ふいに姿を消した。弟子たちは、師が『来たところへ帰った』と書いた」', '「師の好物は、豚の小さな腸詰めをのせた丼であったという」', '——年を記した行だけが、焼け焦げて読めない。']],
    ['s3121_c2_stele', '迷いの森の古い碑文', ['「引くことは、逃げることではない」', '波形の紋の下に、波形教の古い祈りの言葉。苔の下の字は、千年近い風雨に削られている。']],
    ['s3121_c6_erasure', 'カリオン財務局の抹消記録', ['「アサナ村　均衡暦97年　魔物被害により全滅。以後、徴税台帳より抹消」', '同じ年、同じ額の「第三復興事業」支出。財団の復興基金の受領記録とも、数字が合わない。', '抹消された村は、この十年で十一。']],
    ['s3121_rec_strata', '灰灯島の地下の地層', ['観測室の床下の、さらに深い層。均衡暦0年（西暦3024年）の大災害で崩れた石組みの下に、まったく別の時代の錆びた鉄骨とコンクリートの層がある。', '「この街は、もっと古い街の上に建っていた」——観測員の走り書き。']],
    ['s3121_rec_2052', '2052年の最後の記録', ['記憶の図書館の最奥。結晶ではなく、焼き付けられた薄い円盤に残っていた映像と音声。', '「……北の観測所、磁場の値が振り切れています」「衛星網との回線、途絶」「防衛AIどうしが、互いを敵と判断——」', '「記録を残せ。誰かが、読めるように」', '日付は西暦2052年。均衡暦の始まりより、千年近く前。', '——これは、均衡暦0年の大災害の記録ではない。もっと前に、ひとつの文明が終わった日の記録だ。']],
    ['s3121_rec_shelter', '旧都市のシェルターの記録', ['ゼロメアの旧都市の設計者たちは、さらに昔、崩壊を生き延びた地下居住区の末裔だった——と記録にある。', '「我々は機械と共に生き延びた。地上の人々は、剣と畑から、もう一度始めた」']],
    ['s3121_rec_oracle', 'オラクルの起動記録', ['起動：均衡暦8年（西暦3032年）。目的：「もう二度と、大切なものを失いたくない」', '参照した古い演算規格の名前が並ぶ。旧文明の規格だ。', 'だが、オラクル自身の記録に、2052年の戦争の記憶はない。同じものではない。']],
    ['s3121_old_earth_map', '古い地球の地図', ['星見塔の最上階の天球儀に、もうひとつの丸い図が重ねてあった。', '大陸の形が、今とまるで違う。海の位置も、山脈の向きも。', '図の縁に、かすれた文字。「Earth」——天空の記録碑の古い文字と同じ書き方だ。', '今の十二の地域が、昔のどこに当たるのかは、どこにも書かれていない。']],
    ['s3121_wave_canon', '波形教の原典（写し）', ['「波は支配するものではなく、観察し、選び、受け入れるもの」', '「未来は確定しない。ゆえに我らは、見送り、損を小さくし、また立つ」', '「絶対に未来を当てる、と説く者があれば、それは我らの教えではない」']],
    ['s3121_c15_stele', '繰り返しの碑', ['暗黒大陸の前線基地の外れ。誰かが三つの年を刻んでいた。', '「2052　3024　3121」', '「恐れから、すべてを決めようとした年」']]
  ];
  S.readChronicle = async function () {
    var f = F(); var have = REC.filter(function (r) { return f[r[0]]; });
    var opts = have.map(function (r) { return r[1]; }); opts.unshift('年表（分かっていること）'); opts.push('閉じる');
    var a = await root.Win.choice('千年の記録帳（' + have.length + '/' + REC.length + '）', opts);
    if (a === 0) { await root.Win.message(S.timelineLines()); return; }
    if (a > 0 && a <= have.length) await root.Win.message(['——' + have[a - 1][1] + '——'].concat(have[a - 1][2]));
  };
  S.timelineLines = function () {
    var f = F(); var L = ['——年表——（均衡暦0年＝西暦3024年。西暦は旧時代の数え方）'];
    S.TIMELINE.forEach(function (t) {
      if (t[0] === 2052 && !f.s3121_rec_2052) return;
      if (t[0] === 2121 && !(f.s3121_frag_1 || f.s3121_frag_2 || f.s3121_frag_3)) return;
      if (t[0] < 3024 && t[0] > 2121 && !f.s3121_rec_strata) return;
      L.push((t[1] === null ? '' : '均衡暦' + t[1] + '年／') + '西暦' + t[0] + '年：' + t[2]);
    });
    if (L.length === 1) L.push('（まだ何も分かっていない）');
    return L;
  };

  /* =========================================================
     トレード財団 本部（相場都市トレディア）
     ========================================================= */
  K('s3121_canon', '波形教の原典（写し）', '波形聖堂で授かった、波形教の原典の写し。どうぐから読める', function () { return root.Win.message(['——波形教の原典（写し）——'].concat(REC[10][2])); });
  function K(id, name, desc, read) { if (ITEMS[id]) return; ITEMS[id] = { id: id, name: name, cat: 'key', price: 0, desc: desc, read: read }; }
  (function () {
    var t = MD.tradia; if (!t) return; t.buildings = t.buildings || [];
    if (!t.buildings.some(function (b) { return b.interior === 'tradia_foundation'; })) t.buildings.push({ id: 'td_foundation', type: 'academy', name: 'トレード財団 本部', x: 37, y: 36, w: 7, h: 2, doorX: 3, interior: 'tradia_foundation', entry: { x: 7, y: 9 } });
  })();
  add({ id: 'tradia_foundation', name: 'トレード財団 本部', kind: 'interior', bgm: 'town', rows: [
    '################',
    '#KKKK_I__I_KKKK#',
    '#______XX______#',
    '#______________#',
    '#_TTTT____TTTT_#',
    '#______________#',
    '#_t__t____t__t_#',
    '#______________#',
    '#KK__________KK#',
    '#______pp______#',
    '#######DD#######'
  ], warps: [{ x: 7, y: 10, to: 'tradia', tx: 40, ty: 38 }, { x: 8, y: 10, to: 'tradia', tx: 40, ty: 38 }],
    npcs: [
      { id: 'fd_director', x: 7, y: 3, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await foundationDirector(c); } },
      { id: 'fd_trustee', x: 12, y: 3, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await foundationTrustee(c); } },
      { id: 'fd_librarian', x: 3, y: 2, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { await foundationLibrarian(c); } },
      { id: 'fd_engineer', x: 12, y: 7, sprite: 'villager_m', dir: 'left', wander: 1, talk: async function (c) { await c.say('財団の技術者', ['うちの家系は、ゼロメアの旧都市みたいな地下の古い居住区の育ちでね。機械と暮らすのが当たり前だった。', '財団には、そういう人も、剣と畑の村から来た人も、空の裂け目の向こうから来た人もいる。数字の前では、みんな同じさ。']); } },
      { id: 'fd_kid', x: 4, y: 7, sprite: 'child', dir: 'right', wander: 1, talk: async function (c) { await c.say('見学の子ども', ['財団の相場盤大会、今年は「見送り部門」で優勝したんだ！', '一回も無理に入らなかったら、審査員のおじいさんが泣いてた。']); } }
    ],
    events: [
      { x: 7, y: 2, type: 'script', solid: true, run: async function (c) { await foundationExhibit(c); } },
      { x: 8, y: 2, type: 'script', solid: true, run: async function (c) { await foundationExhibit(c); } },
      { x: 1, y: 8, type: 'script', solid: true, run: async function (c) { await foundationLedgers(c); } },
      { x: 14, y: 8, type: 'script', solid: true, run: async function (c) { await c.msg(['掲示板。「災害時の物資調達の入札結果」「復興基金の今月の支出」「相場盤大会・少年の部　申込受付中」', '支出の欄には、受取人の名前と使い道が並んでいる。……一部の行だけ、紙が新しい。']); } }
    ] });
  async function foundationExhibit(c) {
    await c.msg(['【展示】トレード財団の創設伝承', '「約千年前、西暦2121年ごろ。崩壊のあとの荒れ野で、『波形トレーダーズビルド』のもちぽよと門下の者たちが、人々が飢えずに生き延びるための学びの場を開いた——と伝えられる」', '「その学びの場は、のちに二つの流れに分かれた。復興と教育を担うトレード財団と、心の修行を重んじる波形教である」', '展示の札の隅に、小さな字で「年代・人物については諸説あり。史料の一部は失われ、改ざんの疑いもある」。']);
    if (inParty('mochipoyo') && once('s3121_mochipoyo_hint')) {
      await c.say('もちぽよ', ['……ふうん。「波形トレーダーズビルド」かあ。', '昔、似たようなことを教えた気もする。でも、あの時代だったかな。']);
      await c.msg(['もちぽよは展示の絵を少しのあいだ見つめて、それ以上は何も言わなかった。']);
    }
  }
  async function foundationLibrarian(c) {
    var f = F();
    await c.say('財団の司書', ['財団文庫へようこそ。相場の教本から、各地の復興の記録まで。どなたでも読めます。']);
    if (!f.s3121_frag_2) {
      await c.say('財団の司書', ['いちばん古い写本は、これ。『波形トレーダーズビルド教学録』。原本はもうありません。何度も写されて、少しずつ言葉が変わっているはず。']);
      await chronicle(c, 's3121_frag_2', '創設伝承の断片 その二'); fragProgress(c); return;
    }
    if (f.s3121_frag_1 && f.s3121_frag_2 && f.s3121_frag_3 && !f.s3121_archive_open) {
      await c.say('財団の司書', ['三つの断片を……。リヴェルの聖堂の写本、うちの教学録、マクディアの年代記。', 'どれにも、師が「来たところへ帰った」と書いてある。……どこから来た人だったのでしょうね。']);
    }
  }
  function fragProgress(c) { var f = F(); var n = ['s3121_frag_1', 's3121_frag_2', 's3121_frag_3'].filter(function (k) { return f[k]; }).length; if (D().quests.s3121_origin_fragments) root.Win.toast('千年の断片：' + n + '/3'); }
  async function foundationDirector(c) {
    var f = F(); var d = D();
    if (!f.s3121_met_director) {
      f.s3121_met_director = true;
      await c.say('本部長ベルナ', ['トレード財団の本部長、ベルナです。', '財団の仕事は三つ。取引の教育、各地の図書館と学校の支援、それから災害のあとの復興資金を、透明に配ること。', '……「透明に」が、いちばん難しいのだけれど。']);
      if (inParty('elna')) await c.remark('elna', ['監査の人の顔ね。帳簿の話をするときの。'], 's3121_elna_bernna');
    }
    if (!c.questActive('s3121_foundation_audit') && !c.questDone('s3121_foundation_audit')) {
      await c.say('本部長ベルナ', ['旅の方に頼むのは筋違いかもしれません。でも、財団の外の目が欲しいのです。', '十年前からの復興基金の帳簿に、合わない行がある。財団の記録、灰鉱町ヴェルムの受け取りの記録、カリオン財務局の記録——三つを見比べてもらえませんか。']);
      var a = await c.choice('財団の古い帳簿を調べますか？', ['引き受ける', 'あとで']);
      if (a === 0) { c.questStart('s3121_foundation_audit'); await c.msg(['（この部屋の左奥の書棚・灰鉱町ヴェルムの地下の集会所・カリオンの地下記録庫2階）']); }
      return;
    }
    if (c.questActive('s3121_foundation_audit')) {
      var n = ['s3121_audit_1', 's3121_audit_2', 's3121_audit_3'].filter(function (k) { return f[k]; }).length;
      if (n < 3) { await c.say('本部長ベルナ', ['見比べた記録：' + n + '/3。', '財団の書棚（この部屋の左奥）・ヴェルムの地下の集会所・カリオンの地下記録庫2階。']); return; }
      await c.say('本部長ベルナ', ['……三つとも、同じ年に同じ額。「第三復興事業」。', '財団から政府の窓口へ渡ったお金が、実在しない事業の名で消えていた。財団の中にも、それを知っていて黙っていた者がいる。']);
      await c.say('理事ゴルドフ', ['公表すれば、財団への信頼は地に落ちる。寄付も止まる。……復興そのものが止まるのだぞ。']);
      var b = await c.choice('どうするべきだと思う？', ['すべて公表する（混乱しても、記録を正す）', '理事会で処理し、返還を先に進める（静かに直す）', '受け取った村と一緒に決める']);
      f.s3121_audit_choice = b;
      await c.say('本部長ベルナ', [['……そうね。合わない行を隠すのは、合わない行を増やすのと同じ。公表します。', '静かに直す……それも一つの答え。でも、記録だけは残します。いつか誰かが確かめられるように。', '受け取った人たちと決める。……財団は、配る側だけの組織ではいけないのね。'][b]]);
      if ((S.newPrologue() || F().s3121_recalled) && F().s3121_c6_erasure) await c.say(hero(), ['……その「第三復興事業」の欄は、母の帳簿にもあった。', 'アサナ村の十年分。']);
      await c.questComplete('s3121_foundation_audit'); f.s3121_foundation_trust = true; f.s3121_foundation_lore = (f.s3121_foundation_lore || 0) + 1;
      return;
    }
    await c.say('本部長ベルナ', [f.s3121_audit_choice === 0 ? '公表のあと、寄付は一時減ったわ。でも、記録を読みに来る人は増えた。' : f.s3121_audit_choice === 1 ? '返還は順調よ。……記録は、文庫の奥にしまってある。誰でも読めるように。' : '村の代表との会議は長いわ。長いけれど、決めたことは守られている。', 'お金は道具。誰のために、どう使うか。それを確かめ続けるのが、私たちの仕事。']);
  }
  async function foundationTrustee(c) {
    await c.say('理事ゴルドフ', ['財団の金と、財団の予測の技術があれば、世の中はもっと速く良くなる。', '飢饉を予測し、物資を先に動かし、愚かな選択を止める。……統べる力を持つ者が、それを使わないのは怠慢だと思わんかね。']);
    await c.say('理事ゴルドフ', ['……本部長は「選ぶのは人だ」と言う。分かっている。分かっているが、選び間違えた人を、わしは何度も見てきた。']);
    if (F().crystal_choice_done) await c.say('理事ゴルドフ', ['魔王の話は聞いた。「すべての未来を固定する」……か。', '……わしの言っていたことと、どこが違ったのだろうな。考えている。']);
  }
  async function foundationLedgers(c) {
    var f = F();
    await c.msg(['財団の古い帳簿の棚。十年前からの復興基金の支出簿が並んでいる。']);
    if (c.questActive('s3121_foundation_audit') && once('s3121_audit_1')) await c.msg(['均衡暦87年から97年。カリオン連邦の窓口へ、毎年同じ額。名目「第三復興事業」。', '受け取りの署名は、毎年同じ筆跡だ。（記録を見比べた：財団の帳簿）']);
  }

  /* =========================================================
     波形聖堂（リヴェル城下町の北東）
     ========================================================= */
  (function () {
    var t = MD.rivel_town; if (!t) return; t.buildings = t.buildings || [];
    if (!t.buildings.some(function (b) { return b.interior === 'rivel_wave_temple'; })) t.buildings.push({ id: 'rv_wave_temple', type: 'church', name: '波形聖堂', x: 50, y: 4, w: 8, h: 4, doorX: 4, interior: 'rivel_wave_temple', entry: { x: 7, y: 9 } });
  })();
  add({ id: 'rivel_wave_temple', name: '波形聖堂', kind: 'interior', bgm: 'church', rows: [
    '################',
    '#I_____XX_____I#',
    '#______pp______#',
    '#_e_e__pp__e_e_#',
    '#______pp______#',
    '#_e_e__pp__e_e_#',
    '#______pp______#',
    '#I_____pp_____I#',
    '#K_____pp_____K#',
    '#______pp______#',
    '#######DD#######'
  ], warps: [{ x: 7, y: 10, to: 'rivel_town', tx: 54, ty: 8 }, { x: 8, y: 10, to: 'rivel_town', tx: 54, ty: 8 }],
    npcs: [
      { id: 'wt_abbess', x: 8, y: 2, sprite: 'priest', dir: 'down', wander: 0, talk: async function (c) { await waveAbbess(c); } },
      { id: 'wt_radical', x: 12, y: 7, sprite: 'villager_m', dir: 'left', wander: 0, talk: async function (c) { await waveRadical(c); } },
      { id: 'wt_monk', x: 3, y: 7, sprite: 'master', dir: 'right', wander: 0, talk: async function (c) { await c.say('修行者', ['朝の勤めは、相場盤を前に座ること。', '一度も入らずに終わる日もある。それも修行です。「見送る勇気」と、私たちは呼びます。']); } },
      { id: 'wt_choir', x: 10, y: 4, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('聖歌隊の娘', ['♪ 波は来て 波は去る　つかまえず 追いかけず', '……祈りの歌です。最後の節は「負けを認めて、また立つ」。いちばん好きなところ。']); } }
    ],
    events: [
      { x: 7, y: 1, type: 'script', solid: true, run: async function (c) { await waveAltar(c); } },
      { x: 8, y: 1, type: 'script', solid: true, run: async function (c) { await waveAltar(c); } },
      { x: 1, y: 8, type: 'script', solid: true, run: async function (c) { await waveArchive(c); } },
      { x: 14, y: 8, type: 'script', solid: true, run: async function (c) { await c.msg(['寄進の箱と、施しの記録。「冬の炊き出し：ポヨ村・ダウの村・港町マリナ」', '受け取った人の名前は書かれていない。「いただいた方を、数字にしないため」と添え書きがある。']); } }
    ] });
  async function waveAltar(c) {
    await c.msg(['祭壇の波形の紋章。結晶の板に、上下する一本の線が刻まれている。', '「波は支配するものではなく、観察し、選び、受け入れるもの」']);
    if (root.State.hasItem('s3121_amulet') && once('s3121_amulet_altar')) await c.msg(['……胸元のお守りが、かすかに温かくなった気がした。', 'お守りの金属の板と、紋章の線の形が似ている。']);
  }
  async function waveArchive(c) {
    var f = F();
    await c.msg(['聖堂の古い書棚。祈りの言葉の写本と、巡礼の記録。']);
    if (!f.s3121_frag_1) { await c.msg(['いちばん奥に、表紙の焼けた写本がある。']); await chronicle(c, 's3121_frag_1', '創設伝承の断片 その一'); fragProgress(c); }
  }
  async function waveAbbess(c) {
    var f = F();
    if (!f.s3121_met_abbess) {
      f.s3121_met_abbess = true;
      await c.say('聖堂長イサナ', ['ようこそ、波形聖堂へ。私は聖堂長のイサナ。', '波形教は、相場の波も、天気も、人生の浮き沈みも、同じ「波」として見つめます。恐れや欲や執着に振り回されないための、心の修行です。', '私たちの源は、約千年前の学びの場だと伝わります。トレード財団とは、元は同じ根から分かれた——と。', '……伝承です。確かめられたことではありません。']);
    }
    var d = D();
    if (!d.quests.s3121_origin_fragments) {
      await c.say('聖堂長イサナ', ['創設の伝承の写本は、各地に散らばっています。この聖堂の書棚に一つ。トレディアの財団文庫に一つ。マクディアの禁書庫に、欠けた年代記が一つ。', '集めても、真実が分かるとは限りません。でも、照らし合わせることはできる。']);
      c.questStart('s3121_origin_fragments');
    } else if (c.questActive('s3121_origin_fragments')) {
      var n = ['s3121_frag_1', 's3121_frag_2', 's3121_frag_3'].filter(function (k) { return f[k]; }).length;
      if (n >= 3) {
        await c.say('聖堂長イサナ', ['三つとも……。照らし合わせると、同じ人を語っているようで、少しずつ違いますね。', 'どの写本も、師の最後を「来たところへ帰った」とだけ書く。……分からないことは、分からないまま残しておきましょう。', 'それも、私たちの教えです。']);
        await c.questComplete('s3121_origin_fragments'); f.s3121_foundation_lore = (f.s3121_foundation_lore || 0) + 1; f.s3121_wave_order_lore = true;
      } else await c.say('聖堂長イサナ', ['集まった断片：' + n + '/3。急がなくていいのです。']);
    }
    if (!d.quests.s3121_wave_temple) {
      await c.say('聖堂長イサナ', ['よければ、聖堂の試練を。「波を恐れない者」。……勝つ試練ではありません。入らないことを選べるかどうかの試練です。']);
      c.questStart('s3121_wave_temple');
    }
    if (c.questActive('s3121_wave_temple')) {
      var a = await c.choice('聖堂の試練「波を恐れない者」に挑みますか？（学習用のチャート。何度でも挑める）', ['挑む', 'やめる']);
      if (a !== 0) return;
      var e = root.learnEvent && root.learnEvent('practice_mine'); var scn = e ? (typeof e.scenarios === 'function' ? e.scenarios() : e.scenarios) : null;
      var res = scn && root.TradeUI ? await root.TradeUI.trial(scn, { title: '波を恐れない者（見送りの試練）', minScore: 60, practice: true }) : null;
      if (!res) { await c.say('聖堂長イサナ', ['途中で手を止めるのも、見送りの一つ。いつでもどうぞ。']); return; }
      if (res.score < 60) { await c.say('聖堂長イサナ', ['評価 ' + res.score + '点。……根拠が揃わないときは、入らない。それだけを、もう一度。']); return; }
      await c.say('聖堂長イサナ', ['評価 ' + res.score + '点。', '波を当てたからではありません。入らないと決めた場面で、入らなかった。それが、この試練の答えです。']);
      if (!root.State.hasItem('s3121_canon')) root.State.addItem('s3121_canon', 1);
      F().s3121_wave_canon = true; F().s3121_wave_order_lore = true;
      await c.msg(['波形教の原典（写し）を授かった。（重要アイテム。どうぐから読める）']);
      await c.questComplete('s3121_wave_temple');
    }
  }
  async function waveRadical(c) {
    await c.say('若い修行僧', ['……聖堂長は甘いと思いませんか。', '原典には「未来は確定しない」とある。だったら、確定させればいい。誰も負けない世界を作れば、誰も泣かない。', '……そう言ったら、聖堂長に叱られました。「それは私たちの教えではない」と。']);
    if (F().crystal_choice_done) await c.say('若い修行僧', ['魔王の正体を聞きました。……あれは、私が言っていたことそのものでした。', '負けない世界は、誰も選べない世界でした。']);
  }

  /* =========================================================
     各章の新しい出来事（既存のマップに、調べる場所・人を足す）
     ========================================================= */
  // 第1章：ポヨ村の相場盤（娯楽としてのトレード）と、旧時代の壊れた品
  npc('poyo_village', { id: 's3121_poyo_board', x: 17, y: 18, sprite: 'child', dir: 'down', wander: 0, talk: async function (c) { await c.say('相場盤で遊ぶ子ども', ['相場盤ってね、木の実を賭けるの。本物のお金はだめ。', '「なんでそこで買ったの？」って聞かれて、答えられなかったら負け！ 勝ってても負け！']); if (once('s3121_c1_board')) await c.msg(['（この時代、相場は遊びであり、学びでもある）']); } });
  ev('poyo_house', { x: 8, y: 3, type: 'script', solid: false, run: async function (c) { await c.msg(['棚の上に、黒くて薄い板が立てかけてある。表面はつるつるで、ひびが入っている。', '農夫の妻「畑で掘り出したのよ。昔の人は、これに絵を映していたんですって。……今は鍋敷き」']); once('s3121_c1_relic'); } });
  // 第2章：迷いの森の祠の古い碑文（波形教の言葉）
  ev('lost_forest_shrine', { x: 7, y: 9, type: 'script', solid: false, run: async function (c) {
    await c.msg(['祠の床に、苔に埋もれた古い碑文がある。', '「引くことは、逃げることではない」——波の紋と、波形教の古い祈りの言葉。']);
    await chronicle(c, 's3121_c2_stele');
    if (F().forest_boss && root.State.hasItem('s3121_amulet') && once('s3121_c2_crest')) await c.msg(['……祠の奥の紋章を思い出した。勇者レオンの紋章だという、波形の剣の紋。', '母に託されたお守りの金属板の形と、よく似ている。']);
    await c.remark('kyle', ['「引くことは逃げではない」か。……迷いの森で、それを知るのが遅すぎた。', '退くべきときに退けなければ、守れるものまで失う。'], 's3121_kyle_stele');
  } });
  // 第3章：欲望の洞窟の最深部（結晶の台座の刻印。断定しない）
  ev('oblivion_cave_3', { x: 10, y: 11, type: 'script', solid: false, run: async function (c) {
    var f = F(); if (!f.cave_boss) { await c.msg(['足もとに、砕けた台座がある。']); return; }
    await c.msg(['欲望のゴーレムがいた場所。砕けた結晶の台座に、カリオン政府の紋章が刻まれている。', 'その下に、さらに古い、見たことのない文字の列。……結晶とは別の、ずっと古い技術の部品のように見える。']);
    if (f.s3121_new_prologue && f.s3121_tax_done && once('s3121_c3_crest')) await c.say(hero(), ['この紋章……アサナ村に来た徴税官の腕章と、同じだ。', '……あの夜は、偶然じゃなかったのか。']);
    else once('s3121_c3_crest');
  } });
  // 第4章：港町マリナの相場掲示板（物流を支えるトレーダー）
  npc('harbor_town', { id: 's3121_harbor_board', x: 26, y: 18, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) {
    await c.say('港の相場読み', ['港の掲示板には、魚と麦と帆布の相場が毎朝貼り出される。', '船を出すか、今日は見送るか。相場が読めなきゃ、物は運べない。トレーダーってのは、港じゃ運び屋の目なんだ。']);
    if (once('s3121_c4_board')) await c.remark('gald', ['……港の連中は、生きるために相場を読んでる。', 'ヴェルムの鉱夫たちには、その相場すら見せてもらえなかった。'], 's3121_gald_harbor');
  } });
  // 第5章：ヴェルムの地下の集会所（財団の昔の復興支援の記録）と、解放のあとの少女
  ev('verum_hideout', { x: 9, y: 4, type: 'script', solid: false, run: async function (c) {
    await c.msg(['壁に、錆びた銘板がはめこまれている。', '「トレード財団　第三次復興基金　均衡暦12年　灰鉱町の井戸と学び舎の再建に」', '……その学び舎は、鉄冠魔王軍が来たあと、監督官の倉庫にされたという。']);
    if (c.questActive('s3121_foundation_audit') && once('s3121_audit_2')) await c.msg(['集会所の奥の受け取り帳。均衡暦87年から、財団の基金を「受け取った」記録が一行もない。', '（記録を見比べた：ヴェルムの受け取りの記録）']);
    once('s3121_c5_plaque');
  } });
  npc('verum_town', { id: 's3121_verum_girl', x: 24, y: 16, sprite: 'child', dir: 'down', wander: 0, showIf: 'verum_liberated', talk: async function (c) {
    await c.say('少女', ['ありがとう。これでお父さん、明日はお家に帰ってくるんだよね？']);
    if (once('s3121_c5_girl')) {
      if (S.newPrologue()) await c.msg(['……自分の両親は、帰ってこないかもしれない。', 'けれど、自分が戦うことで、誰かの家族は帰ってこられる。', '——初めて、復讐とは違う理由で、剣を握っている気がした。']);
      else await c.msg(['少女の笑顔を見て、戦う理由が一つ増えた気がした。']);
      await c.remark('gald', ['……俺も、帰る場所をなくした口だ。', 'だからこそ、こいつの親父は帰してやりてえ。'], 's3121_gald_girl');
    }
  } });
  // 第6章：カリオンの地下記録庫（アサナ村の抹消記録）と、財団の出張監査員
  ev('kalion_archive_2', { x: 15, y: 8, type: 'script', solid: false, run: async function (c) {
    var f = F();
    await c.msg(['棚の最下段に、「抹消台帳」と書かれた薄い綴りがある。', '「魔物被害により全滅。以後、徴税台帳より抹消」——同じ文句の行が、十一並んでいる。']);
    await c.msg(['……そのうちの一行。', '「アサナ村　均衡暦97年　魔物被害により全滅。以後、徴税台帳より抹消」', '承認印は財務局。同じ年に、同じ額の「第三復興事業」の支出。']);
    if (S.newPrologue() || f.s3121_recalled) await c.say(hero(), ['……アサナ村。', '地図から消されていたのか。だから、ポヨ村の村長も名前を知らなかった。']);
    else await c.msg(['どこかで聞いた名前のような気がした。']);
    var first = !f.s3121_asana_located; f.s3121_asana_located = true;
    if (first) await c.msg(['台帳の余白に、村の場所が書いてある。カリオン平野の西、海に近い森のそば。', '（カリオン徴収連邦の地図に「アサナ村跡」が現れた）']);
    if (c.questActive('s3121_foundation_audit') && once('s3121_audit_3')) await c.msg(['財団の基金の受領欄。名目は「第三復興事業」。受取人の欄には、財務局の印だけ。', '（記録を見比べた：カリオン財務局の記録）']);
    await chronicle(c, 's3121_c6_erasure');
    await c.remark('elna', ['……この台帳、見たことがある。私が隠した証拠の、一つ前の綴り。', '消された村の人たちは、数字ですらなくなっていた。'], 's3121_elna_erasure');
  } });
  npc('kalion_city', { id: 's3121_kc_foundation', x: 27, y: 19, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) {
    await c.say('トレード財団の出張監査員', ['トレード財団のカリオン出張所の者です。……出張所といっても、机が一つだけ。', '財団の復興基金は、政府の窓口を通して配られる決まりでしてね。その窓口の帳簿が、どうにも合わない。']);
    await c.say('トレード財団の出張監査員', ['財団の本部は、相場都市トレディアにあります。いまはマクディア地方の平原に移ったそうですが。', '財団の中にも、政府の中にも、正そうとする人と、黙っている人がいる。……どちらか一方だけが悪い、という話ではないのです。']);
    once('s3121_c6_foundation');
  } });
  // 第7章：監察官リーヴの財産返還のあと、母の帳簿の最後のページ（母の手紙）
  (function () {
    var m = MD.kalion_finance; if (!m || !m.npcs) return; var n = m.npcs.filter(function (x) { return x.id === 'kf_riev'; })[0]; if (!n) return; var orig = n.talk;
    n.talk = async function (c) {
      var before = !!F().kalion_reformed; await orig(c);
      var f = F(); if (before || !f.kalion_reformed || f.s3121_mio_letter) return;
      if (!root.State.hasItem('s3121_ledger')) return;
      await c.say('監察官リーヴ', ['……返還の名簿に、消された村の名前はない。返す相手の記録すら、残っていないのだ。', 'その帳簿は？']);
      await c.msg(['母の帳簿を見せた。']);
      await c.say('監察官リーヴ', ['……正確な帳簿だ。財務局のどの帳簿より。', '最後のページ、二枚が貼り合わさっている。湿らせた布で、ゆっくりはがせば破れない。……やってみるか。']);
      await S.obtainLetter(c, true);
    };
  })();
  // 地図から消えた村：アサナ村の生き残り（第6章の抹消記録を読んだあと）
  npc('erased_village', { id: 's3121_ev_survivor', x: 12, y: 8, sprite: 'villager_f', dir: 'down', wander: 0, showIf: 's3121_asana_located', talk: async function (c) {
    var f = F();
    await c.say('アサナ村から逃げてきた女', ['……その顔。ラウルさんとミオさんの……！ 生きてたんだね。', '地図から消された者どうし、この村にかくまってもらってるのさ。']);
    await c.say('アサナ村から逃げてきた女', ['あの夜、ミオさんは最後まで、村の子どもたちを南の避難路へ逃がしてた。うちの娘も、ミオさんに手を引かれて助かったんだ。', '帳簿を抱えてね。……あの人が守ろうとしたのは、帳簿でもお金でもなかった。そこに書いてある、一人ひとりの暮らしだったんだよ。']);
    if (once('s3121_survivor_met')) await c.msg(['母が守ろうとしたもの。', '——数字の向こうの、一人ひとりの暮らし。']);
    await c.say('アサナ村から逃げてきた女', ['村の跡には、あたしたちで墓を作った。……いつか、帰れたらいいねえ。']);
  } });
  // 第8章：灰灯島の地下施設（3024年の大災害の層の下に、もっと古い文明の層）
  ev('aruna_underground_2', { x: 10, y: 4, type: 'script', solid: false, run: async function (c) {
    await c.msg(['観測室の床の割れ目から、下の層がのぞいている。', '均衡暦0年の大災害で崩れた石組み。そのさらに下に、まったく別の時代の、錆びた鉄骨と灰色の固い石の層。', '観測員の走り書き：「この街は、もっと古い街の上に建っていた。大災害より、ずっと前の街だ」']);
    await chronicle(c, 's3121_rec_strata');
  } });
  // 第8章：ヨルン老人の灯り（生存者の村の桟橋のランタン）
  (function () {
    var m = MD.aruna_village; if (!m || !m.npcs) return; var n = m.npcs.filter(function (x) { return x.id === 'av_yorn'; })[0]; if (!n) return; var orig = n.talk;
    n.talk = async function (c) {
      await orig(c); var f = F();
      if (f.lighthouse_lit && !f.s3121_c8_yorn) { f.s3121_c8_yorn = true; await c.say(root.State.data.hero.name, ['ヨルンさんは、帰ってこない家族のために、毎晩灯りをともしてきた。', '……あの灯りは、帰ってこない人のためだけじゃない。今を生きている人の道しるべにもなるんだ。']); if (S.newPrologue() || f.s3121_recalled) await c.msg(['アサナ村で、帰ってこない両親を待っていた夜を思い出した。']); }
    };
  })();
  // 第9章：記憶の図書館の最奥（2052年の最後の記録）。ミナを支える側へ
  ev('memory_library', { x: 10, y: 7, type: 'script', solid: false, run: async function (c) {
    var f = F(); if (!f.library_1) { await c.msg(['床に、薄い円盤が埋めこまれている。まだ読み方が分からない。（図書館の区画を読んでから）']); return; }
    await c.msg(['床に埋めこまれた、薄い円盤。結晶の記録とは違う、もっと古い記録媒体だ。', '触れると、ひび割れた映像と音声が浮かび上がった。']);
    await c.msg(['「……北の観測所、磁場の値が振り切れています」', '「衛星網との回線、途絶」「停戦の交渉は」「防衛AIどうしが、互いを敵と判断して——」', '「……記録を残せ。誰かが、読めるように」', '——日付：西暦2052年。']);
    await c.msg(['均衡暦0年の大災害ではない。それより千年近くも前。', '……この世界には、もっと前に終わった文明があった。']);
    f.s3121_old_earth_discovered = true; await chronicle(c, 's3121_rec_2052');
    if (f.mina_father_record && inParty('mina') && once('s3121_mina_support')) {
      await c.say(hero(), ['ミナ。……お父さんは、最後まで人を逃がしたんだね。', '一人じゃないよ。ここにいる。']);
      await c.say('ミナ', ['……うん。', 'ありがと。あんたに言われると、なんか、泣いていい気がする。']);
    }
  } });
  // 第10章：時の神殿・第三の回廊のあと「選ばれなかった未来」（両親が生きている村の幻）
  (function () {
    var m = MD.temple_of_time_3; if (!m || !m.events) return; var e = m.events.filter(function (x) { return x.x === 7 && x.y === 10 && x.type === 'script'; })[0]; if (!e) return; var orig = e.run;
    e.run = async function (c, evd) { await orig(c, evd); await S.vision(c); };
  })();
  S.vision = async function (c) {
    var f = F(); if (f.s3121_vision_seen) return; f.s3121_vision_seen = true;
    var known = S.newPrologue() || f.s3121_recalled;
    S.cine({ x: 7, y: 9, dist: 10, pitch: 32 });
    await S.veil(0.45, '#d8e8ff', 600);
    await c.msg(['重なり合った映像の一つが、ふいに大きくなった。']);
    if (known) {
      await c.msg(['……アサナ村。焼けていない家々。豊作の麦。', '広場で、父が木剣を直している。母が帳簿を閉じて、こちらに手を振る。', '襲われなかった世界のアサナ村だ。']);
      await c.say('ミオ', ['おかえり。……遅かったのね。']);
      await c.msg(['手を伸ばした。届きそうだった。']);
    } else await c.msg(['……見知らぬ村。焼けていない家々。笑っている人たち。', 'なぜか、ひどく懐かしい。手を伸ばした。']);
    await c.say(f.sophia_joined ? 'ソフィア' : '白い衣の女性', ['それは、あり得たかもしれない未来。', 'でも、あなたが今ここまで歩いてきた道も、確かに存在する未来なの。']);
    await c.say(hero(), ['……分かってる。', '分かってる、けど。']);
    await c.msg(['涙を拭いて、手を下ろした。映像は、静かに薄れていった。']);
    await c.say(f.sophia_joined ? 'ソフィア' : '白い衣の女性', ['神殿の信者の中には、「確実な未来」を選べると説く人もいる。', '……私は、選べるのは「今」だけだと思う。']);
    await S.veil(0, '#d8e8ff', 600); S.cine(null);
  };
  npc('tempus_city', { id: 's3121_tc_wave', x: 20, y: 13, sprite: 'priest', dir: 'down', wander: 0, talk: async function (c) {
    await c.say('波形教の老司祭', ['鐘都にも、波形教の小さな祠がある。', '千年前の教団の伝承に、こうある。「時を読む者は、時を縛ってはならない」。', '……鐘都の人々は、鐘の音で未来が決まると信じてきた。我らの教えとは、ちょうど逆さまだ。']);
    if (F().time_bank_freed) await c.say('波形教の老司祭', ['時間銀行の契約が書き換わって、皆、明日を持て余している。……それでいい。持て余すくらいが、ちょうどいい。']);
    once('s3121_c10_prophecy');
  } });
  // 第11章：ゼロメアの旧都市（2052年を生き延びた地下居住区の末裔）と、友好的な機械
  ev('old_city_2', { x: 8, y: 8, type: 'script', solid: false, run: async function (c) {
    await c.msg(['記録庫の隅の、古い端末。', '「この都市の設計者は、崩壊を生き延びた地下居住区の末裔である」', '「我々は機械と共に生き延びた。地上の人々は、剣と畑から、もう一度始めた」']);
    await chronicle(c, 's3121_rec_shelter');
  } });
  npc('node_city', { id: 's3121_nc_robot', x: 19, y: 14, sprite: 'child', dir: 'down', wander: 0, talk: async function (c) {
    await c.say('配達ロボット', ['ハイタツ、チュウ。……アナタハ、未登録個体？', 'ワタシハ、オラクルノ命令デハナク、ノードノ人タチト契約シテ働イテイマス。給料ハ、油ト、毎朝ノ「アリガトウ」。']);
    if (F().zeromea_reformed) await c.say('配達ロボット', ['仕事ヲ選ベルヨウニナッテ、ワタシモ、配達ヲ選ビマシタ。']);
    once('s3121_c11_robot');
  } });
  // 第12章：オラクル中枢・記録層（旧文明のAIとオラクルは別のもの）
  ev('oracle_core_2', { x: 8, y: 8, type: 'script', solid: false, run: async function (c) {
    await c.msg(['記録層の柱に、オラクルの起動記録が刻まれている。', '「起動：均衡暦8年。目的：もう二度と、大切なものを失いたくない」', '参照した古い演算規格の名前が並ぶ。旧文明の規格だ。……けれど、オラクル自身の記録に、2052年の戦争の記憶はない。']);
    await chronicle(c, 's3121_rec_oracle');
    if (once('s3121_c12_mirror')) await c.say(hero(), ['「もう二度と、大切なものを失いたくない」……。', '同じだ。故郷を失った日から、ずっと同じことを願っていた。']);
    await c.remark('io', ['……わたしを作った仕組みは、もっと古い誰かの仕組みを借りていた。', 'でも、わたしは、わたし。借りたものと、選んだものは、違う。'], 's3121_io_oracle');
  } });
  // 第13章：マクディアの禁書庫（欠けた年代記＝創設伝承の断片その三）と、王立学院の多元宇宙研究
  ev('forbidden_archive_1', { x: 10, y: 5, type: 'script', solid: false, run: async function (c) {
    var f = F(); if (!f.archive_permit) { await c.msg(['鍵のかかった書見台。入館許可がないと読めない。']); return; }
    await c.msg(['書見台に、古い年代記が開いたままになっている。頁が何枚か、焼け焦げて欠けている。']);
    await chronicle(c, 's3121_frag_3', '創設伝承の断片 その三'); fragProgress(c);
    if (inParty('seris') && once('s3121_seris_archive')) await c.say('セリス', ['魔導技術も、結晶も、旧時代の技術の上に積み上げてきたもの。……師も、その上に立っていた。', '技術に善悪はない。使う者の目的がある。……分かっていても、苦しい。']);
  } });
  npc('magicka_academy', { id: 's3121_ma_worlds', x: 6, y: 5, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await manyWorlds(c); } });
  npc('magicka_city', { id: 's3121_mc_visitor', x: 0, y: 0, sprite: 'shadow', dir: 'down', wander: 0, place: 'auto', talk: async function (c) { await visitorTalk(c, 1); } });
  // 第14章：星見塔の最上階（古い地球の地図）
  ev('star_tower_2', { x: 5, y: 6, type: 'script', solid: false, run: async function (c) {
    await c.msg(['最上階の天球儀に、もうひとつの丸い図が重ねてある。', '大陸の形が、今とまるで違う。図の縁に、かすれた文字。「Earth」。']);
    await chronicle(c, 's3121_old_earth_map');
    if (once('s3121_c14_earth')) await c.say(hero(), ['……ここは、昔の人が「地球」と呼んだ場所なのか。', '今の地図のどこが、昔のどこなのかは、分からないけど。']);
  } });
  npc('star_camp', { id: 's3121_sc_visitor', x: 0, y: 0, sprite: 'shadow', dir: 'down', wander: 0, place: 'auto', talk: async function (c) { await visitorTalk(c, 2); } });
  // 第15章：前線基地の外れ（繰り返しの碑）
  ev('dark_camp', { x: 14, y: 10, type: 'script', solid: false, run: async function (c) {
    await c.msg(['道ばたの黒い石に、誰かが三つの年を刻んでいる。', '「2052　3024　3121」', '「恐れから、すべてを決めようとした年」']);
    await chronicle(c, 's3121_c15_stele');
    await c.remark('kyle', ['恐れから決めた命令は、いつも誰かを置き去りにする。', '……騎士団で、何度も見た。'], 's3121_kyle_stele15');
  } });

  /* ---------- 異なる空の来訪者（多元宇宙から来た生命体） ---------- */
  async function manyWorlds(c) {
    var f = F(); var d = D();
    await c.say('多元宇宙研究者ルド', ['王立学院の多元宇宙研究室へようこそ。研究室といっても、私ひとりですが。', '空の裂け目の向こうから、この地へ来た生命体がいる。旧時代の実験の名残とも、結晶の暴走の副作用とも言われるが……確かなことは分からない。']);
    if (!d.quests.s3121_many_worlds) { await c.say('多元宇宙研究者ルド', ['彼らを一律に「魔物」と呼ぶ人もいる。でも、話の通じる者もいるのです。', '魔導都の路地と、天空群島の野営地で、来訪者を見かけたという話がある。会ってきてくれませんか。']); c.questStart('s3121_many_worlds'); return; }
    if (c.questActive('s3121_many_worlds')) {
      if (!(f.s3121_mw_1 && f.s3121_mw_2)) { await c.say('多元宇宙研究者ルド', ['魔導都の路地と、天空群島の星見塔の野営地。……どちらにも、背の高い影のような人がいるはずです。']); return; }
      await c.say('多元宇宙研究者ルド', ['会えましたか。……どうでした？']);
      var a = await c.choice('来訪者について、どう伝える？', ['話せば分かる。友人になれる者もいる', '分からないことが多い。急いで決めつけない方がいい', '危険もある。それでも、追い出す理由にはならない']);
      await c.say('多元宇宙研究者ルド', [['……私の研究ノートの、いちばん最初の行と同じです。', '分からないことを、分からないと書く。研究の基本ですね。', '危険があるのは、人間も同じですから。'][a]]);
      f.s3121_mw_choice = a; await c.questComplete('s3121_many_worlds');
      return;
    }
    await c.say('多元宇宙研究者ルド', ['裂け目の研究は、少しずつ進んでいます。……少しずつ、でいいのです。']);
  }
  async function visitorTalk(c, k) {
    var f = F();
    if (k === 1) await c.say('裂け目の向こうから来た者', ['……コノ空ハ、青イ。ワタシノ空ハ、ミドリダッタ。', '帰ル道ハ、閉ジタ。ダカラ、ココデ、ヨク眠ル場所ヲ探シテイル。', 'オマエタチノ「相場」トイウ遊ビ、面白イ。波ガ、ワタシノ空ノ音ニ似テイル。']);
    else await c.say('裂け目の向こうから来た者', ['雲ノ上ハ、少シダケ、故郷ニ近イ。', '……人間ノ子ドモガ、ワタシニ星ノ名前ヲ教エテクレタ。カワリニ、ワタシノ星ノ名前ヲ教エタ。トリヒキ、トイウノダロウ？']);
    if (D().quests.s3121_many_worlds) f['s3121_mw_' + k] = true;
  }
  // 自動で置く NPC（place:'auto'）：町の空いているマス（入口から届き、まわりが広い）を一度だけ探して置く
  (function () {
    var AUTO = { magicka_city: [24, 16], star_camp: [13, 6] };
    Object.keys(AUTO).forEach(function (mid) {
      var m = MD[mid]; if (!m || !m.npcs) return; var n = m.npcs.filter(function (x) { return x.place === 'auto'; })[0]; if (!n) return;
      n.x = AUTO[mid][0]; n.y = AUTO[mid][1];
    });
  })();

  /* =========================================================
     任意クエスト（既存の ID と重ならない s3121_ で始まる名前）
     ========================================================= */
  QUESTS.s3121_origin_fragments = { side: true, title: '千年の断片', desc: '約千年前の創設伝承の写本を三つ集める（リヴェルの波形聖堂・トレディアの財団文庫・マクディアの禁書庫）。リヴェルの聖堂長に報告する。', reward: { exp: 600, gold: 1500 },
    steps: [['s3121_frag_1', 'リヴェルの波形聖堂の書棚'], ['s3121_frag_2', 'トレディアのトレード財団本部の司書'], ['s3121_frag_3', 'マクディアの禁書庫1階の書見台（入館許可のあと）'], ['_s3121_report1', 'リヴェルの波形聖堂の聖堂長イサナに報告する']] };
  QUESTS.s3121_foundation_audit = { side: true, title: '財団の古い帳簿', desc: 'トレード財団の復興基金の記録を、財団・灰鉱町ヴェルム・カリオン財務局の三か所で見比べ、本部長ベルナに報告する。', reward: { exp: 800, gold: 2000 },
    steps: [['s3121_audit_1', 'トレディアの財団本部・左奥の書棚'], ['s3121_audit_2', '灰鉱町ヴェルムの地下の集会所の銘板'], ['s3121_audit_3', 'カリオンの地下記録庫2階の抹消台帳'], ['_s3121_report2', 'トレディアの財団本部の本部長ベルナに報告する']] };
  QUESTS.s3121_wave_temple = { side: true, title: '波を恐れない者', desc: 'リヴェルの波形聖堂の試練。学習用のチャートで「入らない」判断ができるか（60点以上）。', reward: { exp: 500, gold: 0 } };
  QUESTS.s3121_earth_record = { side: true, title: '消えた地球の記録', desc: '均衡暦0年（西暦3024年）の大災害より前の、もっと古い文明の記録を集める。灰灯島の地下・記憶の図書館・ゼロメアの旧都市・オラクル中枢。', reward: { exp: 900, gold: 2500 },
    steps: [['s3121_rec_strata', '灰灯島アルナの地下施設・観測室の床の割れ目'], ['s3121_rec_2052', '海底都市エルミナの記憶の図書館の中央の床'], ['s3121_rec_shelter', 'ゼロメアの旧都市・記録庫（深層）の古い端末'], ['s3121_rec_oracle', 'オラクル中枢・第2層の柱の起動記録'], ['_s3121_report3', '記憶の図書館の記録の円盤の前で、記録を照らし合わせる']] };
  QUESTS.s3121_many_worlds = { side: true, title: '異なる空の来訪者', desc: 'マクディアの王立学院の多元宇宙研究者ルドの依頼。魔導都の路地と天空群島の野営地で、空の裂け目の向こうから来た者に会う。', reward: { exp: 700, gold: 1800 },
    steps: [['s3121_mw_1', '魔導都マクディアの路地の来訪者'], ['s3121_mw_2', '天空群島・星見塔の野営地の来訪者'], ['_s3121_report4', '王立学院の多元宇宙研究者ルドに報告する']] };
  // 消えた地球の記録：記憶の図書館の円盤の前で4つの記録がそろったら照らし合わせて達成
  (function () {
    var m = MD.memory_library; if (!m) return; var e = m.events.filter(function (x) { return x.x === 10 && x.y === 7; })[0]; if (!e) return; var orig = e.run;
    e.run = async function (c, evd) {
      await orig(c, evd); var f = F();
      if (c.questActive('s3121_earth_record') && f.s3121_rec_strata && f.s3121_rec_2052 && f.s3121_rec_shelter && f.s3121_rec_oracle) {
        await c.msg(['四つの記録を、円盤の前で並べてみた。', '灰灯島の地層、2052年の最後の記録、地下居住区の末裔、オラクルの起動記録。', '——二つの災いがあった。2052年、ひとつの文明が終わった。3024年、結晶が未来を固定しようとして、海が都を呑んだ。', '同じ災いではない。けれど、どちらも「恐れから、すべてを決めようとした」ところから始まっている。']);
        await c.questComplete('s3121_earth_record');
      }
    };
  })();

  // 会話の下見（js/rpg/chatter.js の「町の人の別の会話」）をしない：この資料の会話は台本の関数を呼び、フラグを立てるため
  ['tradia_foundation', 'rivel_wave_temple'].forEach(function (id) { (MD[id].npcs || []).forEach(function (n) { n.noChatter = true; n.s3121 = true; }); });

  /* ---------- 目的地の案内（js/rpg/nav.js。クエスト画面で「案内する」を選ぶと出る） ---------- */
  var O = root.OBJECTIVES; function E(q, done, t, h) { O.push({ q: q, done: done, t: t, h: h, side: true }); }   // side：サブの案内（クエスト画面で「案内する」・プロローグ中は d.navTrack）
  E('s3121_origin_fragments', 's3121_frag_1', 'ev:rivel_wave_temple:1,8', ['アルカディア相場大陸。', 'リヴェル城下町の波形聖堂。', '聖堂の左奥の書棚を調べよう。']);
  E('s3121_origin_fragments', 's3121_frag_2', 'npc:tradia_foundation:fd_librarian', ['マクディア魔導王国の南西。', '相場都市トレディアのトレード財団本部。', '本部の司書に話しかけよう。']);
  E('s3121_origin_fragments', 's3121_frag_3', 'ev:forbidden_archive_1:10,5', ['マクディア魔導王国。', '禁書庫1階。', '入館許可をもらってから、禁書庫1階の書見台を調べよう。']);
  E('s3121_origin_fragments', '_s3121_report1', 'npc:rivel_wave_temple:wt_abbess', ['アルカディア相場大陸。', 'リヴェル城下町の波形聖堂。', '聖堂長イサナに報告しよう。']);
  E('s3121_foundation_audit', 's3121_audit_1', 'ev:tradia_foundation:1,8', ['相場都市トレディア。', '財団本部の書棚。', '本部の左奥の書棚を調べよう。']);
  E('s3121_foundation_audit', 's3121_audit_2', 'ev:verum_hideout:9,4', ['グラニア鉱業地方。', '灰鉱町ヴェルムの地下の集会所。', '集会所の壁の銘板を調べよう。']);
  E('s3121_foundation_audit', 's3121_audit_3', 'ev:kalion_archive_2:15,8', ['カリオン徴収連邦。', '地下記録庫2階。', '棚の最下段の抹消台帳を調べよう。']);
  E('s3121_foundation_audit', '_s3121_report2', 'npc:tradia_foundation:fd_director', ['相場都市トレディア。', 'トレード財団本部。', '本部長ベルナに報告しよう。']);
  E('s3121_earth_record', 's3121_rec_strata', 'ev:aruna_underground_2:10,4', ['断裂群島。', '灰灯島アルナの地下施設の最深部。', '観測室の床の割れ目を調べよう。']);
  E('s3121_earth_record', 's3121_rec_2052', 'ev:memory_library:10,7', ['海底都市エルミナ。', '記憶の図書館。', '図書館の中央の床の円盤を調べよう。']);
  E('s3121_earth_record', 's3121_rec_shelter', 'ev:old_city_2:8,8', ['ゼロメア。', '廃棄された旧都市の記録庫（深層）。', '記録庫の隅の古い端末を調べよう。']);
  E('s3121_earth_record', 's3121_rec_oracle', 'ev:oracle_core_2:8,8', ['ゼロメア。', 'オラクル中枢・第2層。', '記録層の柱を調べよう。']);
  E('s3121_earth_record', '_s3121_report3', 'ev:memory_library:10,7', ['海底都市エルミナ。', '記憶の図書館。', '円盤の前で、四つの記録を照らし合わせよう。']);
  E('s3121_many_worlds', 's3121_mw_1', 'npc:magicka_city:s3121_mc_visitor', ['マクディア魔導王国。', '魔導都マクディアの路地。', '背の高い影のような来訪者に話しかけよう。']);
  E('s3121_many_worlds', 's3121_mw_2', 'npc:star_camp:s3121_sc_visitor', ['天空群島。', '星見塔の野営地。', '来訪者に話しかけよう。']);
  E('s3121_many_worlds', '_s3121_report4', 'npc:magicka_academy:s3121_ma_worlds', ['マクディア魔導王国。', '王立学院。', '多元宇宙研究者ルドに報告しよう。']);
})(typeof window !== 'undefined' ? window : globalThis);
