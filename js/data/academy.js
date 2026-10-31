/* =========================================================
   Data / Academy (v6.1) : ボラティリティア学院（時の神殿領の南東）——魔法・宇宙・量子・哲学・意識・古代文明の学術機関
   ・施設：学院正門／講義室／大図書館／天文観測室／量子物理研究室／意識研究所／古代文明研究室／地下実験施設／学院長室／研究者の居住区
   ・会話では次の3つをはっきり分けて表示する
       【確認されている事実】現実の科学で確かめられていること
       【研究・議論中の仮説】現実で研究・議論されているが、確かめられていないこと
       【この世界の設定】このゲームだけのファンタジー
   ・研究クエスト6つ：意識の正体を探る／量子もつれの謎を解く／古代文明の失われた記録／宇宙の起源を巡る議論／魂の存在に関する研究／ゼロポイント領域の異常現象
     （調査・探索・パズル・戦闘・アイテム収集を組み合わせる。報酬にオーパーツ）
   ・オーパーツを持ち込むと古代文明研究室の研究が進む（js/rpg/ooparts.js と連動）
   ・講義「統計学」を受けると、チャートの試練の注文画面に「損益分岐の勝率」が出る（js/ui/trade.js）
   ・ワールドの入口：world_tempus (100,88)。鐘都テンプスからの道（js/data/world-tempus.js）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add; var Q = root.QUESTS; var ITEMS = root.ITEMS;
  function D() { return root.State.data; }
  function Grid(W, H, ch) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push(ch); } return {
    set: function (x, y, c) { if (g[y] && g[y][x] !== undefined) g[y][x] = c; return this; },
    rect: function (x, y, w, h, c) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) this.set(xx, yy, c); return this; },
    border: function (c) { for (var x = 0; x < W; x++) { g[0][x] = c; g[H - 1][x] = c; } for (var y = 0; y < H; y++) { g[y][0] = c; g[y][W - 1] = c; } return this; },
    rows: function () { return g.map(function (r) { return r.join(''); }); } }; }
  var TAG = { fact: '【確認されている事実】', hyp: '【研究・議論中の仮説】', lore: '【この世界の設定】' };
  function tri(c, name, parts) { return c.say(name, parts.map(function (p) { return typeof p === 'string' ? p : TAG[p[0]] + p[1]; })); }
  function startOnce(c, id) { if (!c.questActive(id) && !c.questDone(id)) c.questStart(id); }
  function acadDone() { return ['academy_consciousness', 'academy_entangle', 'academy_ancient', 'academy_cosmos', 'academy_soul'].filter(function (id) { var q = D().quests[id]; return q && q.state === 'done'; }).length; }
  async function oopart(id) { if (root.Ooparts) await root.Ooparts.collect(id, []); }
  function gameOver() { return root.World.gameOver(); }

  /* ---------- 学院の装備（クエスト報酬） ---------- */
  ITEMS.academy_crest = { id: 'academy_crest', name: '学院の徽章', cat: 'armor', type: 'acc', def: 3, mag: 6, mdef: 6, immune: ['silence'], price: 0, desc: '魔力+6・魔法防御+6。沈黙しない。ボラティリティア学院が「問い続ける者」に贈る徽章' };
  if (root.ITEM_LIST && root.ITEM_LIST.indexOf('academy_crest') < 0) root.ITEM_LIST.push('academy_crest');

  /* ---------- 研究クエスト ---------- */
  Q.academy_consciousness = { title: '意識の正体を探る', desc: '意識研究所のミレイユの依頼。講義で「事実・仮説・この世界の設定」の見分け方を学び、研究所の観測装置3台から記録を集め、地下実験施設1階の「観測者の残響」を鎮める。', reward: { exp: 1800, gold: 1500 },
    steps: [['acad_c_lecture', '講義室で「事実・仮説・設定の見分け方」の講義を受ける'], ['acad_c_records', '意識研究所の観測装置3台から記録を集める'], ['acad_c_echo', '地下実験施設1階の「観測者の残響」を鎮める'], ['acad_c_report', '意識研究所のミレイユに報告する']] };
  Q.academy_entangle = { title: '量子もつれの謎を解く', desc: '量子物理研究室のハイゼの依頼。量子もつれの話を聞き、もつれ測定装置の記録の空欄を埋め、装置から漏れ出た影を鎮める。', reward: { exp: 1800, gold: 1500 },
    steps: [['acad_e_lecture', '量子物理研究室のハイゼから話を聞く'], ['acad_e_puzzle', 'もつれ測定装置（研究室の奥）の記録の空欄を埋める'], ['acad_e_shade', '装置から漏れ出た「量子の影」を鎮める'], ['acad_e_report', 'ハイゼに報告する']] };
  Q.academy_ancient = { title: '古代文明の失われた記録', desc: '古代文明研究室のオルテガの依頼。集めたオーパーツを見せ、大図書館に散らばった記録の断片3つを探し、正しい順に並べる。', reward: { exp: 2000, gold: 1800 },
    steps: [['acad_a_show', 'オーパーツを5個以上集めてオルテガに見せる'], ['acad_a_frag', '大図書館の本棚から記録の断片を3つ見つける'], ['acad_a_order', 'オルテガのもとで断片を正しい順に並べる'], ['acad_a_report', 'オルテガに報告する']] };
  Q.academy_cosmos = { title: '宇宙の起源を巡る議論', desc: '天文観測室のリゲルの依頼。3つの観測記録を調べ、宇宙の出来事を古い順に並べ、講義室の討論会で根拠のある主張を選ぶ。', reward: { exp: 1800, gold: 1500 },
    steps: [['acad_o_obs', '天文観測室の3つの観測記録を調べる（望遠鏡・宇宙背景放射の図・銀河の記録）'], ['acad_o_order', 'リゲルのもとで宇宙の出来事を古い順に並べる'], ['acad_o_debate', '講義室の討論会で、根拠のある主張を選ぶ'], ['acad_o_report', '天文観測室のリゲルに報告する']] };
  Q.academy_soul = { title: '魂の存在に関する研究', desc: '哲学者ソフィアの依頼。「魂」をめぐる主張の根拠を見極め、研究者の居住区で3人の意見を聞き、地下実験施設2階の「魂の番人」を鎮める。', reward: { exp: 2200, gold: 2000 },
    steps: [['acad_s_talk', '研究者の居住区の哲学者ソフィアと対話する'], ['acad_s_views', '居住区の研究者3人の意見を聞く'], ['acad_s_warden', '地下実験施設2階の「魂の番人」を鎮める'], ['acad_s_report', 'ソフィアに報告する']] };
  Q.academy_zero = { title: 'ゼロポイント領域の異常現象', desc: '学院長の依頼（学院の研究クエストを3つ達成すると受けられる）。地下実験施設2階の共鳴装置3台を止め、最深部の異常の正体を確かめる。', reward: { exp: 3500, gold: 4000, item: 'academy_crest' },
    steps: [['acad_z_start', '学院長から調査を任される'], ['acad_z_devices', '地下実験施設2階の共鳴装置3台を止める'], ['acad_z_boss', '最深部の「ゼロポイントの残響」を鎮める'], ['acad_z_report', '学院長室に報告する']] };

  /* ---------- 見分けの講義（事実・仮説・設定） ---------- */
  var KINDS = ['確認されている事実', '研究・議論中の仮説', 'この世界の設定'];
  var CLASSIFY = [
    { s: '量子もつれは実験で確かめられている。2022年のノーベル物理学賞は、もつれた光子を使った「ベルの不等式の破れ」の実験などに贈られた。', a: 0, ex: '実験で何度も確かめられている（アスペ、クラウザー、ツァイリンガーが受賞）。' },
    { s: '人間の意識は、脳の神経細胞の中の「微小管」で起きる量子的な過程から生まれる（ペンローズとハメロフの説）。', a: 1, ex: '実在の研究者が提案した仮説だが、確かめられてはいない。脳は温かく湿っているため量子状態がすぐ壊れる、という批判もある。' },
    { s: '人々の意識は、ゼロポイント領域を通じて量子もつれでつながっている。', a: 1, ex: 'こう主張する人は現実にもいるが、実験で確かめられておらず、主流の科学では支持されていない「未確認の説」。事実として扱ってはいけない。' },
    { s: '学院の地下では、ゼロポイント領域が大陸のクリスタルと共鳴している。', a: 2, ex: 'これはこのゲームの世界の設定。現実の話ではない。' },
    { s: '何もない真空にも量子的なゆらぎ（ゼロ点エネルギー）があるとされ、関係が深い現象として「カシミール効果」が測定されている。', a: 0, ex: 'ゼロ点エネルギーは量子力学の基本的な結果で、カシミール効果は1990年代以降の実験で精密に測られた。ただし、真空から自由にエネルギーを取り出せる、という話は確かめられていない。' },
    { s: 'オーパーツには古代文明の記憶が宿り、触れると声が聞こえることがある。', a: 2, ex: 'このゲームの世界の設定。' }
  ];
  async function classifyLecture(c) {
    await c.say('アルマ講師', ['今日の講義は「見分ける力」。学院では、話の前に必ず三つのどれかを言うのが決まりだ。', '【確認されている事実】【研究・議論中の仮説】【この世界の設定】——6つの文を、どれか答えてごらん。']);
    var ok = 0;
    for (var i = 0; i < CLASSIFY.length; i++) { var q = CLASSIFY[i]; var a = await c.choice('（' + (i + 1) + '/6）' + q.s, KINDS); if (a === q.a) { ok++; await c.msg(['正解：' + KINDS[q.a] + '。' + q.ex]); } else await c.msg(['答えは「' + KINDS[q.a] + '」。' + q.ex]); }
    if (ok >= 5) { c.setFlag('acad_lecture_kinds', true); if (c.questActive('academy_consciousness')) c.setFlag('acad_c_lecture', true); await c.say('アルマ講師', [ok + '/6。合格だ。面白い話ほど、まずどれに当たるかを確かめること。']); return true; }
    await c.say('アルマ講師', [ok + '/6。5問以上で合格だ。もう一度挑戦してごらん。']); return false;
  }
  async function statsLecture(c) {
    await c.say('アルマ講師', ['統計学の講義だ。トレードの損益を決めるのは勝率だけではない。', '期待値＝勝率×平均利益 − 負け率×平均損失。勝率が高くても、損失が大きければマイナスになる。', '利益が損失の何倍か（リスクリワード比）が分かれば、損がとんとんになる勝率が計算できる。', '損益分岐の勝率＝1÷（1＋リスクリワード比）。1:2なら約33.3%、1:1なら50%だ。']);
    var a = await c.choice('問：リスクリワード1:3の手法。損益分岐の勝率は？', ['25%', '33.3%', '50%', '75%']);
    if (a === 0) { await c.msg(['正解。1÷（1＋3）＝25%。']); } else await c.msg(['答えは25%。1÷（1＋3）＝0.25。']);
    var b = await c.choice('問：勝率は大事ではない、という意味？', ['勝率もリスクリワードも、両方を合わせて見る', '勝率だけ見ればよい', 'リスクリワードだけ見ればよい']);
    await c.msg([b === 0 ? '正解。どちらか一方だけでは期待値は決まらない。' : '答えは「両方を合わせて見る」。']);
    if (!c.flag('academy_stats')) { c.setFlag('academy_stats', true); await c.msg(['講義「統計学」を修めた！', 'これからはチャートの試練の注文画面と記録に「損益分岐の勝率」が表示される。']); }
  }

  /* ---------- 学院（キャンパス）40×32 ---------- */
  var g = Grid(40, 32, '.').border('x');
  g.rect(19, 31, 2, 1, 'P');                         // 正門の出口
  g.rect(19, 9, 2, 22, 'P'); g.rect(2, 9, 36, 1, 'P'); g.rect(2, 19, 36, 1, 'P'); g.rect(2, 28, 36, 1, 'P');
  g.set(18, 30, 'I').set(21, 30, 'I');               // 学院正門の柱
  g.rect(15, 2, 10, 7, 'B'); g.rect(3, 3, 9, 5, 'B'); g.rect(28, 2, 9, 6, 'B');
  g.rect(3, 12, 10, 6, 'B'); g.rect(28, 12, 9, 5, 'B'); g.rect(15, 13, 10, 5, 'B');
  g.rect(3, 22, 9, 5, 'B'); g.rect(28, 22, 9, 5, 'B'); g.rect(22, 23, 5, 4, 'B');
  g.set(26, 11, 'Q'); [[24, 11], [28, 11]].forEach(function (p) { g.set(p[0], p[1], 'a'); });
  [[13, 10], [26, 10], [13, 18], [26, 18], [13, 29], [26, 29], [17, 24]].forEach(function (p) { g.set(p[0], p[1], 'y'); });
  [[2, 2], [13, 2], [26, 3], [37, 9], [2, 11], [37, 18], [14, 22], [37, 21], [2, 30], [37, 30], [9, 30], [30, 30]].forEach(function (p) { g.set(p[0], p[1], '6'); });
  [[16, 21], [17, 21]].forEach(function (p) { g.set(p[0], p[1], 'e'); });
  add({ id: 'volatilia', name: 'ボラティリティア学院', kind: 'town', bgm: 'town', fallback: 'grass', style: 'stone', rows: g.rows(),
    buildings: [
      { id: 'va_main', type: 'academy', name: '学院本館（学院長室）', x: 15, y: 2, w: 10, h: 7, doorX: 5, interior: 'vol_dean', entry: { x: 6, y: 7 } },
      { id: 'va_lecture', type: 'academy', name: '講義室', x: 3, y: 3, w: 9, h: 5, doorX: 4, interior: 'vol_lecture', entry: { x: 6, y: 7 } },
      { id: 'va_obs', type: 'academy', name: '天文観測室', x: 28, y: 2, w: 9, h: 6, doorX: 4, interior: 'vol_observatory', entry: { x: 5, y: 7 } },
      { id: 'va_library', type: 'academy', name: '大図書館', x: 3, y: 12, w: 10, h: 6, doorX: 5, interior: 'vol_library', entry: { x: 7, y: 8 } },
      { id: 'va_quantum', type: 'guild', name: '量子物理研究室', x: 28, y: 12, w: 9, h: 5, doorX: 4, interior: 'vol_quantum', entry: { x: 5, y: 7 } },
      { id: 'va_mind', type: 'guild', name: '意識研究所', x: 15, y: 13, w: 10, h: 5, doorX: 5, interior: 'vol_mind', entry: { x: 6, y: 7 } },
      { id: 'va_ancient', type: 'elder', name: '古代文明研究室', x: 3, y: 22, w: 9, h: 5, doorX: 4, interior: 'vol_ancient', entry: { x: 5, y: 7 } },
      { id: 'va_dorm', type: 'house', name: '研究者の居住区', x: 28, y: 22, w: 9, h: 5, doorX: 4, interior: 'vol_dorm', entry: { x: 7, y: 7 } },
      { id: 'va_under', type: 'warehouse', name: '地下実験施設の入口', x: 22, y: 23, w: 5, h: 4, doorX: 2, interior: 'vol_under_gate', entry: { x: 4, y: 5 } }
    ],
    warps: [19, 20].map(function (x) { return { x: x, y: 31, to: 'world_tempus', tx: 100, ty: 89, name: '学院の外へ' }; }),
    chests: [{ id: 'va1', x: 36, y: 1, item: 'mana_soda', qty: 1 }],
    events: [{ x: 22, y: 30, type: 'inspect', solid: false, text: ['学院正門の銘板：「ボラティリティア学院——問い続ける者のために」', '「学院の決まり：話の前に、それが『事実』か『仮説』か『この世界の言い伝え』かを言うこと」'] }],
    npcs: [
      { id: 'va_gatekeeper', x: 22, y: 29, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) {
        if (!c.flag('academy_visited')) c.setFlag('academy_visited', true);
        await c.say('学院正門の守衛', ['ボラティリティア学院へようこそ。魔法、宇宙、量子、哲学、意識、古代文明——なんでも研究している学院だ。', '研究者たちの話は面白いが、ここの決まりを覚えておくといい。話の前に「事実」「仮説」「この世界の言い伝え」のどれかを必ず言う。', '本館の学院長室、講義室、大図書館は誰でも入れる。地下実験施設は、研究者の依頼を受けた者だけだ。']); } },
      { id: 'va_student1', x: 10, y: 10, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('学院の学生', ['講義室のアルマ先生の「見分ける講義」、厳しいけど役に立つよ。', '面白い話を聞くと、つい信じたくなるでしょ？ 先生は「まず、どれに当たるか確かめて」っていつも言うの。']); } },
      { id: 'va_student2', x: 30, y: 20, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('学院の学生', ['テンプスの時の神殿と、ここの天文観測室は昔から交流があるらしい。', '【この世界の設定】学院が建つ前、この丘には「星を読む塔」があったという言い伝えがある。']); } }
    ] });

  /* ---------- 学院長室 ---------- */
  var dn = Grid(14, 9, '_').border('#'); dn.rect(1, 1, 5, 1, 'K').rect(8, 1, 5, 1, 'K'); dn.rect(5, 3, 4, 1, 'T'); dn.set(1, 5, 'K').set(12, 5, 'K'); dn.set(1, 7, 'I').set(12, 7, 'I'); dn.set(6, 8, 'D');
  add({ id: 'vol_dean', name: '学院長室', kind: 'interior', bgm: 'castle', rows: dn.rows(), warps: [{ x: 6, y: 8, to: 'volatilia', tx: 20, ty: 9 }],
    npcs: [
      { id: 'va_dean', x: 6, y: 2, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
        if (!c.flag('acad_dean_met')) {
          c.setFlag('acad_dean_met', true);
          await c.say('学院長エウクレイア', ['よく来た、旅の方。私はこの学院の長、エウクレイア。', '学院は「分からないこと」を研究する場所だ。だからこそ、分かっていることと、分かっていないことを混ぜてはならない。']);
          await tri(c, '学院長エウクレイア', [['fact', '宇宙は観測によっておよそ138億年前に始まったと推定され、量子もつれは実験で確かめられている。'], ['hyp', '意識が脳の働きだけで説明できるのか、量子的な過程が関わるのかは、現実でも議論が続いている。'], ['lore', 'この学院の地下には「ゼロポイント領域」と呼ぶ異常な空間があり、大陸のクリスタルが脈打つと、それも脈打つ。'], '研究者たちの依頼を受けてくれると助かる。三つ以上の研究が進んだら、地下の異常について話そう。']);
          return;
        }
        if (c.questDone('academy_zero')) { await tri(c, '学院長エウクレイア', [['lore', 'ゼロポイント領域の脈は静まった。だが、クリスタルが目覚めるたびに、また脈打つだろう。'], '答えを持ち帰れなかった問いこそ、学院の宝だ。いつでも戻ってきなさい。']); return; }
        if (c.questActive('academy_zero')) {
          if (c.flag('acad_z_boss') && !c.flag('acad_z_report')) {
            c.setFlag('acad_z_report', true);
            await tri(c, '学院長エウクレイア', ['……そうか。残響は「止まること」を恐れていたのか。',
              ['lore', '古い記録によれば、ゼロポイント領域は、未来を計算しようとした古代の者たちが残した「計算の余白」。クリスタルが未来の波形を測るたびに、その余白が揺れる。'],
              ['lore', '暗黒大陸の玉座に座る〈固定〉の魔王——変化を止めようとする意志——と、この余白の揺れは、同じ周期で脈打っている。'],
              ['hyp', '現実の宇宙でも「真空のエネルギー」が観測と理論で大きく食い違う問題（宇宙定数問題）が知られているが、答えはまだ出ていない。'],
              'あなたが持ち帰った記録は、学院の誰にも書けなかった最後の頁だ。']);
            await oopart('op_052'); await c.questComplete('academy_zero'); return;
          }
          await c.say('学院長エウクレイア', ['地下実験施設2階の共鳴装置を3台止め、その奥の異常を確かめてほしい。', root.Events.questObjective('academy_zero')]); return;
        }
        if (acadDone() >= 3) {
          await tri(c, '学院長エウクレイア', ['三つの研究を進めてくれたね。では、地下の話をしよう。', ['lore', '地下実験施設の2階では、共鳴装置が勝手に動き出し、何もない空間から青白い炎が湧いている。'], 'その奥に、何かがいる。調べてきてほしい。']);
          c.questStart('academy_zero'); c.setFlag('acad_z_start', true); c.setFlag('vol_under_open', true); return;
        }
        await c.say('学院長エウクレイア', ['研究者たちの依頼はもう聞いたかね。講義室、意識研究所、量子物理研究室、天文観測室、古代文明研究室、そして居住区の哲学者——誰もが助けを求めている。', '研究が三つ進んだら、もう一度ここへ。（現在 ' + acadDone() + '/3）']);
      } },
      { id: 'va_secretary', x: 11, y: 6, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { await c.say('学院長の秘書', ['学院長は毎晩、天文観測室の記録とテンプスの鐘の記録を照らし合わせています。', '「鐘が鳴るときと、地下が脈打つときが近づいている」と……。']); } }
    ] });

  /* ---------- 講義室 ---------- */
  var lc = Grid(14, 9, '_').border('#'); lc.rect(1, 1, 2, 1, 'K').rect(11, 1, 2, 1, 'K').rect(4, 1, 6, 1, 'K'); [3, 5].forEach(function (y) { [2, 3, 5, 6, 8, 9, 11].forEach(function (x) { lc.set(x, y, 't'); }); }); lc.set(6, 8, 'D');
  add({ id: 'vol_lecture', name: '講義室', kind: 'interior', bgm: 'town', rows: lc.rows(), warps: [{ x: 6, y: 8, to: 'volatilia', tx: 7, ty: 8 }],
    events: [{ x: 5, y: 1, type: 'inspect', solid: true, text: ['黒板：「事実（確かめられた）／仮説（研究・議論中）／設定（この世界の言い伝え）」', '「期待値＝勝率×平均利益 − 負け率×平均損失」「損益分岐の勝率＝1÷（1＋リスクリワード比）」'] }],
    npcs: [
      { id: 'va_lecturer', x: 6, y: 2, sprite: 'npc_scholar', dir: 'down', wander: 0, talk: async function (c) {
        while (true) {
          var opts = ['講義「事実・仮説・設定の見分け方」' + (c.flag('acad_lecture_kinds') ? '（修了）' : ''), '講義「統計学：期待値と損益分岐の勝率」' + (c.flag('academy_stats') ? '（修了）' : ''), '討論会「宇宙の始まり」' + (c.flag('acad_o_debate') ? '（済）' : ''), 'やめる'];
          var i = await c.choice('アルマ講師「どの講義を受ける？」', opts);
          if (i === 0) await classifyLecture(c);
          else if (i === 1) await statsLecture(c);
          else if (i === 2) await debate(c);
          else return;
        }
      } },
      { id: 'va_listener', x: 4, y: 6, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('聴講生', ['僕はトレーダー見習いなんだ。統計学の講義で、勝率60%でも負ける手法があるって知って驚いたよ。']); } }
    ] });
  async function debate(c) {
    if (c.flag('acad_o_debate')) { await c.say('アルマ講師', ['討論会の記録は天文観測室のリゲルに渡してある。']); return; }
    if (!c.flag('acad_o_order')) { await c.say('アルマ講師', ['討論会「宇宙の始まり」は、天文観測室のリゲルの研究がまとまってから開く予定だ。']); return; }
    await tri(c, '懐疑派科学者カーター', ['では始めよう。私は、観測で確かめられたことしか「事実」と呼ばない。', ['fact', '1965年に見つかった宇宙マイクロ波背景放射は、宇宙がかつて熱く密度の高い状態だったことを示す強い証拠だ。']]);
    await tri(c, '哲学者ソフィア', ['でも、「始まりの前」には何があったの？ 時間そのものが始まったのなら、「前」という言葉は意味を持つのかしら。', ['hyp', '始まりの直後に宇宙が急激に膨張した、というインフレーション理論は有力だけれど、決定的な証拠はまだない。']]);
    var a = await c.choice('アルマ講師「では聴衆の君。いちばん根拠がしっかりしている主張はどれだ？」', ['宇宙背景放射の観測は、昔の宇宙が熱く密度が高かったことを示している', 'ビッグバンの「前」に何があったかは、観測で確かめられている', '宇宙の年齢は、誰にも推定できない']);
    if (a === 0) { c.setFlag('acad_o_debate', true); await c.say('アルマ講師', ['その通り。観測にもとづく推定と、まだ分からない問いを分けて話せた。討論会の記録をリゲルに届けておこう。']); }
    else await c.say('懐疑派科学者カーター', ['それには観測の根拠がない。もう一度考えてみてくれ。']);
  }

  /* ---------- 天文観測室 ---------- */
  var ob = Grid(12, 9, '_').border('#'); ob.rect(1, 1, 2, 1, 'K').rect(9, 1, 2, 1, 'K'); ob.set(5, 3, 'X'); ob.set(1, 5, 't').set(10, 5, 't'); ob.set(5, 8, 'D');
  function obsEvent(n, lines) { return async function (c) {
    if (!c.questActive('academy_cosmos') || c.flag('acad_o_obs')) { await c.msg(lines.slice(0, 1)); return; }
    await tri(c, '観測記録', lines); c.setFlag('acad_obs_' + n, true);
    if (c.flag('acad_obs_1') && c.flag('acad_obs_2') && c.flag('acad_obs_3')) { c.setFlag('acad_o_obs', true); await c.msg(['3つの観測記録を調べ終えた。天文学者リゲルに話そう。']); }
    else await c.msg(['観測記録を調べた。（' + [1, 2, 3].filter(function (k) { return c.flag('acad_obs_' + k); }).length + '/3）']);
  }; }
  add({ id: 'vol_observatory', name: '天文観測室', kind: 'interior', bgm: 'town', rows: ob.rows(), warps: [{ x: 5, y: 8, to: 'volatilia', tx: 32, ty: 8 }],
    events: [
      { x: 5, y: 3, type: 'script', solid: true, run: obsEvent(1, ['大きな望遠鏡だ。遠い銀河の光が写し取られている。', ['fact', '遠い銀河ほど光が赤い方へずれ（赤方偏移）、速く遠ざかって見える。宇宙が膨張している証拠とされる。'], ['lore', '学院の望遠鏡は、ときどき「何もない暗い空」に光を写す。']]) },
      { x: 1, y: 1, type: 'script', solid: true, run: obsEvent(2, ['壁に、まだらな楕円の図が貼られている。「宇宙背景放射の地図」とある。', ['fact', '宇宙マイクロ波背景放射は1965年に見つかった。宇宙が生まれて約38万年後、光がまっすぐ進めるようになった頃の光の名残とされる。'], ['fact', '観測にもとづく宇宙の年齢の推定は、およそ138億年。']]) },
      { x: 10, y: 1, type: 'script', solid: true, run: obsEvent(3, ['棚に観測の記録帳が並んでいる。「宇宙の成分」とある。', ['fact', '観測から、宇宙のエネルギーのうち、ふつうの物質はおよそ5%で、残りは正体の分からない暗黒物質（約27%）と暗黒エネルギー（約68%）と推定されている。'], ['hyp', '暗黒物質や暗黒エネルギーの正体については、多くの説が研究されているが、まだ確かめられていない。']]) }
    ],
    npcs: [
      { id: 'va_astronomer', x: 8, y: 6, sprite: 'npc_wizard', dir: 'down', wander: 0, talk: async function (c) {
        if (c.questDone('academy_cosmos')) { await c.say('天文学者リゲル', ['討論会の記録、よかったよ。「分からない」と言える議論は、強い。']); return; }
        if (!c.questActive('academy_cosmos')) {
          await tri(c, '天文学者リゲル', ['天文学者のリゲルだ。宇宙の起源を研究している。', ['fact', '宇宙が昔は熱く小さかった——ビッグバンの考えは、多くの観測と合っている。'], ['hyp', 'でも、始まりの直後に何が起きたか、始まりの「前」に何かあったのかは、まだ分からない。'], '学院の討論会の準備を手伝ってくれないか。ここの3つの観測記録を調べてほしい。']);
          c.questStart('academy_cosmos'); return;
        }
        if (!c.flag('acad_o_obs')) { await c.say('天文学者リゲル', ['望遠鏡、背景放射の図、記録帳。3つを調べてきてくれ。（' + [1, 2, 3].filter(function (k) { return c.flag('acad_obs_' + k); }).length + '/3）']); return; }
        if (!c.flag('acad_o_order')) {
          await c.say('天文学者リゲル', ['では、宇宙の出来事を古い順に並べてみよう。']);
          var EV = ['宇宙の始まり（約138億年前）', '光がまっすぐ進めるようになる（宇宙背景放射が出る。始まりから約38万年後）', '最初の星々が輝き始める（始まりから1億〜数億年後と考えられている）', '太陽と地球が生まれる（約46億年前）'];
          var order = [3, 0, 2, 1]; var left = order.slice(); var ok = true;
          for (var step = 0; step < 4; step++) { var opts = left.map(function (k) { return EV[k]; }); var a = await c.choice((step + 1) + '番目に古い出来事は？', opts); if (a < 0) { ok = false; break; } var pick = left[a]; if (pick !== step) { ok = false; break; } left.splice(a, 1); }
          if (!ok) { await c.say('天文学者リゲル', ['惜しい。背景放射の図と記録帳をもう一度見て、考え直してごらん。']); return; }
          c.setFlag('acad_o_order', true); await c.say('天文学者リゲル', ['正解！ 時間の目盛りが、ずいぶん違うだろう？ 38万年と数億年と138億年。', '討論会の準備ができた。講義室のアルマ講師のところへ行ってくれ。']); return;
        }
        if (!c.flag('acad_o_debate')) { await c.say('天文学者リゲル', ['講義室の討論会に出てくれ。アルマ講師が待っている。']); return; }
        c.setFlag('acad_o_report', true);
        await tri(c, '天文学者リゲル', ['討論会の記録を読んだ。いい選択だった。', ['lore', 'これは礼だ。古い祭具で、宇宙の始まりを「卵」として描いた神話のものだ。現実の科学とは関係ないが、問いの形は同じだろう？']]);
        await oopart('op_054'); await c.questComplete('academy_cosmos');
      } }
    ] });

  /* ---------- 大図書館 ---------- */
  var lb = Grid(16, 10, '_').border('#'); lb.rect(1, 1, 6, 1, 'K').rect(9, 1, 6, 1, 'K'); lb.rect(2, 3, 4, 1, 'K').rect(10, 3, 4, 1, 'K'); lb.rect(2, 5, 4, 1, 'K').rect(10, 5, 4, 1, 'K'); [2, 5, 10, 13].forEach(function (x) { lb.set(x, 7, 't'); }); lb.set(7, 9, 'D');
  var FRAG = { 1: '「……星を読む者たちは、波のかたちで、明日を測った……」', 2: '「……測りすぎた者たちは、やがて自分が測られることを恐れた……」', 3: '「……彼らは天秤を地に残し、空へ去った。測れぬものを、測らぬために……」' };
  function fragEvent(n) { return async function (c, ev) {
    if (c.questActive('academy_ancient') && c.flag('acad_a_show') && !c.flag('acad_a_frag') && !c.flag('acad_frag_' + n)) {
      c.setFlag('acad_frag_' + n, true); await c.msg(['古い本の間に、薄い石の板が挟まっていた。', '記録の断片：' + FRAG[n]]);
      var got = [1, 2, 3].filter(function (k) { return c.flag('acad_frag_' + k); }).length; if (got >= 3) { c.setFlag('acad_a_frag', true); await c.msg(['記録の断片を3つ集めた。古代文明研究室のオルテガに見せよう。']); } else await c.msg(['（記録の断片 ' + got + '/3）']);
      return;
    }
    if (root.Services && root.Services.bookshelf) await root.Services.bookshelf('vol_library', ev.x, ev.y); else await c.msg(['古い本が並んでいる。']);
  }; }
  add({ id: 'vol_library', name: '大図書館', kind: 'interior', bgm: 'town', rows: lb.rows(), warps: [{ x: 7, y: 9, to: 'volatilia', tx: 8, ty: 18 }],
    events: [{ x: 3, y: 3, type: 'script', solid: true, run: fragEvent(1) }, { x: 12, y: 5, type: 'script', solid: true, run: fragEvent(2) }, { x: 14, y: 1, type: 'script', solid: true, run: fragEvent(3) }],
    npcs: [
      { id: 'va_librarian', x: 8, y: 2, sprite: 'npc_elder', dir: 'down', wander: 0, talk: async function (c) {
        await tri(c, '司書', ['大図書館へようこそ。どの本も自由に読んでいい。', ['fact', '現実の世界でも、古代ギリシャの「アンティキティラ島の機械」のように、作られた時代のわりに精巧な道具が見つかって研究されている。'], ['lore', 'この世界の「オーパーツ」は、そうした話とは別の、古代文明の遺物だ。']]);
        if (c.questActive('academy_ancient') && c.flag('acad_a_show') && !c.flag('acad_a_frag')) await c.say('司書', ['記録の断片？ 古い本の間に、石の板が挟まっていることがある。棚を一つずつ調べてごらん。左の低い棚、右の奥の棚、それに一番奥の棚の右端あたりが怪しい。']);
      } },
      { id: 'va_reader', x: 4, y: 8, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('読書中の研究者', ['昔の人が「本当だ」と思っていたことの多くが、後の観測で書き換えられたのよ。', 'だから学院では、今の「事実」も、新しい証拠で変わりうる、と教えるの。']); } }
    ] });

  /* ---------- 量子物理研究室 ---------- */
  var qp = Grid(12, 9, '_').border('#'); qp.rect(1, 1, 2, 1, 'K').rect(9, 1, 2, 1, 'K'); qp.set(5, 1, 'X').set(6, 1, 'X'); qp.set(2, 3, 't').set(9, 3, 't'); qp.set(1, 5, 'v').set(10, 5, 'v'); qp.set(5, 8, 'D');
  async function entanglePuzzle(c) {
    await tri(c, 'もつれ測定装置', ['左右の測定器に、同じ瞬間に生まれた粒子が一つずつ届く。どちらも「同じ向き」で測ると、結果はいつも逆になる——と装置の説明にある。',
      ['fact', '現実でも、ある種のもつれた粒子の組を同じ向きで測ると、結果は完全に逆（または完全に同じ）になる。ただし、片方だけ見ると結果はでたらめに見える。']]);
    var REC = [['↑', '↓'], ['↓', '↑'], ['↓', null], ['↑', '↓'], [null, '↑'], ['↑', null]];
    await c.msg(['記録：' + REC.map(function (r, i) { return (i + 1) + '.左' + (r[0] || '？') + '右' + (r[1] || '？'); }).join('　')]);
    var blanks = [[2, 1, '↑'], [4, 0, '↓'], [5, 1, '↓']];
    for (var i = 0; i < blanks.length; i++) { var b = blanks[i]; var a = await c.choice('記録' + (b[0] + 1) + 'の' + (b[1] === 0 ? '左' : '右') + 'は？', ['↑', '↓']); if (['↑', '↓'][a] !== b[2]) { await c.msg(['装置のランプが赤く光った。（同じ向きで測ると、左右はいつも逆）']); return false; } }
    var q = await c.choice('最後の問い：左の結果を見てから右の測り方を決めれば、遠くへ一瞬で「文字」を送れるだろうか？', ['送れる', '送れない']);
    if (q !== 1) { await c.msg(['装置のランプが赤く光った。', '【確認されている事実】もつれを使っても、光より速く情報を送ることはできない（片方の結果だけでは、でたらめにしか見えないため）。']); return false; }
    await c.msg(['ランプがすべて青く光った！', '【確認されている事実】もつれの相関は本物だが、それだけでは光より速く情報を送れない。']);
    return true;
  }
  add({ id: 'vol_quantum', name: '量子物理研究室', kind: 'interior', bgm: 'town', rows: qp.rows(), warps: [{ x: 5, y: 8, to: 'volatilia', tx: 32, ty: 17 }],
    events: [5, 6].map(function (x) { return { x: x, y: 1, type: 'script', solid: true, run: async function (c) {
      if (!c.questActive('academy_entangle') || !c.flag('acad_e_lecture')) { await c.msg(['「もつれ測定装置」と書かれた機械。今は静かだ。']); return; }
      if (c.flag('acad_e_shade')) { await c.msg(['装置は静かに動いている。']); return; }
      if (!c.flag('acad_e_puzzle')) { var ok = await entanglePuzzle(c); if (!ok) return; c.setFlag('acad_e_puzzle', true); }
      await tri(c, 'もつれ測定装置', ['……装置の奥から、黒い影がにじみ出してきた！', ['lore', '学院の装置は、ときどき「観測の余り」を影として吐き出す。']]);
      var r = await c.battle(['quantum_shade', 'quantum_shade'], { boss: true }); if (r === 'lost') { await gameOver(); return; } if (r !== 'won') return;
      c.setFlag('acad_e_shade', true); await c.msg(['影は消えた。ハイゼに報告しよう。']);
    } }; }),
    npcs: [
      { id: 'va_physicist', x: 3, y: 4, sprite: 'npc_scholar', dir: 'down', wander: 0, talk: async function (c) {
        if (c.questDone('academy_entangle')) { await c.say('量子物理学者ハイゼ', ['もつれは不思議だが、魔法ではない。だからこそ面白いんだ。']); return; }
        if (c.flag('acad_e_shade')) { c.setFlag('acad_e_report', true); await tri(c, '量子物理学者ハイゼ', ['影を鎮めてくれたか！ 記録の空欄も完璧だ。', ['lore', 'これを持っていってくれ。二つで一組の結晶で、片方を光にかざすともう片方も色を変える——この世界の鉱物だ。現実の量子もつれとは別物だが、学院では「もつれ石」と呼んでいる。']]); await oopart('op_050'); await c.questComplete('academy_entangle'); return; }
        await tri(c, '量子物理学者ハイゼ', ['量子物理研究室のハイゼだ。量子もつれ、量子真空、ゼロポイントエネルギーを研究している。',
          ['fact', '量子もつれは実験で確かめられている。2022年のノーベル物理学賞は、その実験に贈られた。'],
          ['fact', '量子力学では、真空にもゆらぎがあり、エネルギーが完全に0にはならない（ゼロ点エネルギー）。'],
          ['hyp', 'だが「ゼロポイントエネルギーを取り出して無限に使える」「意識がもつれでつながっている」といった話は、確かめられていない。'],
          '研究室の奥の「もつれ測定装置」の記録が欠けてしまった。空欄を埋めてくれないか。']);
        startOnce(c, 'academy_entangle'); c.setFlag('acad_e_lecture', true);
      } },
      { id: 'va_qstudent', x: 8, y: 6, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('研究生', ['もつれた粒子の片方を測ると、もう片方の結果が分かる。でも、どっちが出るかは測るまで分からないんだ。', '「分かること」と「伝えられること」は違う、って先生は言ってた。']); } }
    ] });

  /* ---------- 意識研究所（観測装置は「調べる」共通システムの机：js/rpg/search.js） ---------- */
  var md = Grid(14, 9, '_').border('#'); md.rect(1, 1, 3, 1, 'K').rect(10, 1, 3, 1, 'K'); md.set(6, 1, 'X'); md.set(4, 5, 't').set(9, 5, 't'); md.set(6, 8, 'D');
  add({ id: 'vol_mind', name: '意識研究所', kind: 'interior', bgm: 'town', rows: md.rows(), warps: [{ x: 6, y: 8, to: 'volatilia', tx: 20, ty: 18 }],
    events: [{ x: 6, y: 1, type: 'inspect', solid: true, text: ['水晶の台座に、研究の要約が刻まれている。', '【確認されている事実】脳の活動と意識の内容には深い関係があり、その対応（意識の神経相関）が研究されている。', '【研究・議論中の仮説】「なぜ主観的な体験があるのか（意識のハードプロブレム）」には、まだ答えがない。'] }],
    npcs: [
      { id: 'va_mind', x: 6, y: 3, sprite: 'npc_priestess', dir: 'down', wander: 0, talk: async function (c) {
        if (c.questDone('academy_consciousness')) { await c.say('意識研究者ミレイユ', ['意識の正体は、まだ分からない。でも「分からない」の形は、少しはっきりしたわ。']); return; }
        if (c.flag('acad_c_echo')) { c.setFlag('acad_c_report', true); await tri(c, '意識研究者ミレイユ', ['残響を鎮めてくれたのね。……ありがとう。', ['lore', 'これは、近くの人の気持ちで色が変わるという水晶。この世界の言い伝えでは、意識の共鳴を映すそうよ。科学的に確かめたわけではないけれど、研究の記念に。']]); await oopart('op_051'); await c.questComplete('academy_consciousness'); return; }
        if (c.questActive('academy_consciousness')) { await c.say('意識研究者ミレイユ', [root.Events.questObjective('academy_consciousness')]); return; }
        await tri(c, '意識研究者ミレイユ', ['意識研究所のミレイユよ。意識が脳の働きだけで説明できるのか、それとも未知の何かが関わるのかを研究しているの。',
          ['fact', '麻酔や睡眠で意識が変わることや、脳の傷で体験が変わることから、脳と意識が深く関係していることは確かめられている。'],
          ['hyp', '意識を説明する理論はいくつもある（情報の統合で説明する説、脳全体への情報の放送で説明する説、量子的な過程が関わるという説など）。どれもまだ決着していない。'],
          ['lore', 'この研究所の観測装置には、最近、誰もいないのに「見られている」記録が残るの。地下実験施設から何かが漏れているのかもしれない。'],
          'まず講義室でアルマ講師の「見分ける講義」を受けて。それから、ここの観測装置3台の記録を集めてほしいの。']);
        c.questStart('academy_consciousness'); if (c.flag('acad_lecture_kinds')) c.setFlag('acad_c_lecture', true); c.setFlag('vol_under_open', true);
      } }
    ] });
  // 観測装置（机）3台：Search.event で「記録を集める」処理をつなぐ
  root.SEARCH_POINTS = (root.SEARCH_POINTS || []).concat([
    { id: 'va_mind_dev1', map: 'vol_mind', x: 2, y: 3, kind: 'desk', event: 'acad_mind_record', msg: ['観測装置を調べた。'] },
    { id: 'va_mind_dev2', map: 'vol_mind', x: 11, y: 3, kind: 'desk', event: 'acad_mind_record', msg: ['観測装置を調べた。'] },
    { id: 'va_mind_dev3', map: 'vol_mind', x: 3, y: 6, kind: 'desk', event: 'acad_mind_record', msg: ['観測装置を調べた。'] }
  ]);
  root.SEARCH_EVENTS = root.SEARCH_EVENTS || {};
  root.SEARCH_EVENTS.acad_mind_record = async function () {
    var c = root.Events.ctx(null);
    if (!c.questActive('academy_consciousness') || !c.flag('acad_c_lecture')) { await c.msg(['装置の画面に、波のような線が流れている。……今は何のことか分からない。']); return false; }
    var n = (D().counters.acad_records || 0) + 1; D().counters.acad_records = n;
    await c.msg(['記録を写し取った。「観測者：不明」「時刻：鐘の鳴る直前」……（' + Math.min(3, n) + '/3）']);
    if (n >= 3) { c.setFlag('acad_c_records', true); await c.msg(['3台の記録がそろった。どれも地下実験施設の方角を指している。']); }
    return true;
  };

  /* ---------- 古代文明研究室（オーパーツの研究が進む） ---------- */
  var an = Grid(12, 9, '_').border('#'); an.rect(1, 1, 4, 1, 'K').rect(7, 1, 4, 1, 'K'); an.rect(3, 3, 6, 1, 'T'); an.set(1, 6, 'z').set(10, 6, 'q'); an.set(5, 8, 'D');
  var RESEARCH = [
    { n: 10, flag: 'acad_r10', lines: [['lore', '10個のオーパーツを並べると、刻まれた文字の一部が同じ「波の記号」だと分かった。古代の者たちは、波で数を書いていたらしい。']] },
    { n: 25, flag: 'acad_r25', lines: [['lore', '25個。歯車と石板の目盛りが一致した。古代文明は、星と潮と「人の欲」を同じ周期で測ろうとしていた。']] },
    { n: 50, flag: 'acad_r50', lines: [['lore', '50個。年代の古い遺物ほど、天秤の意匠が多い。最初にあったのは「計算」ではなく「釣り合い」だったのだ。']] },
    { n: 75, flag: 'acad_r75', lines: [['lore', '75個。天空群島の創始者たちと、遺物を作った者たちは、同じ文字を使っていた可能性が高い。'], ['fact', '（現実の考古学でも、文字や意匠の共通点から文化のつながりを推定するが、決め手には複数の証拠が要る。）']] },
    { n: 100, flag: 'acad_r100', lines: [['lore', '100個すべてがそろった。古代文明は未来を測りすぎて、自分たちの選択まで「固定」してしまった——遺物は、それを後の者へ伝える警告だったのかもしれない。']] }
  ];
  add({ id: 'vol_ancient', name: '古代文明研究室', kind: 'interior', bgm: 'town', rows: an.rows(), warps: [{ x: 5, y: 8, to: 'volatilia', tx: 7, ty: 27 }],
    npcs: [
      { id: 'va_ancient', x: 5, y: 2, sprite: 'npc_ranger', dir: 'down', wander: 0, talk: async function (c) {
        var n = root.Ooparts ? root.Ooparts.count() : 0;
        // 集めたオーパーツの数に応じて研究が進む（1回ずつ）
        for (var i = 0; i < RESEARCH.length; i++) { var R = RESEARCH[i]; if (n >= R.n && !c.flag(R.flag)) { c.setFlag(R.flag, true); await tri(c, '古代文明研究者オルテガ', ['研究報告（オーパーツ ' + R.n + '個）'].concat(R.lines)); } }
        if (c.questDone('academy_ancient')) { await c.say('古代文明研究者オルテガ', ['オーパーツは今 ' + n + '個。集まるほど、研究が進む。新しい遺物を見つけたら、いつでも見せてくれ。', '収集の報酬なら、リヴェル城下町の古代遺物収集家ドルフが出しているそうだ。']); return; }
        if (!c.questActive('academy_ancient')) {
          await tri(c, '古代文明研究者オルテガ', ['古代文明研究室のオルテガだ。世界に残されたオーパーツ——時代に合わない遺物——から、古代の知識を探っている。',
            ['fact', '現実の世界でも「時代に合わない」と言われた遺物の多くは、調べると当時の技術で説明できた。精巧なアンティキティラ島の機械も、古代ギリシャの職人の技術と考えられている。'],
            ['lore', 'だがこの世界のオーパーツは違う。どの国の記録にもない文字と、未来を測る仕組みが刻まれている。'],
            'オーパーツを5個以上見つけたら、見せてくれないか。']);
          c.questStart('academy_ancient');
        }
        if (!c.flag('acad_a_show')) { if (n >= 5) { c.setFlag('acad_a_show', true); await c.say('古代文明研究者オルテガ', [n + '個も！ ……この文字、大図書館の古い本に挟まっていた石板と同じだ。', '大図書館に、記録の断片が3つ散らばっているはずだ。探してきてくれ。']); } else await c.say('古代文明研究者オルテガ', ['今 ' + n + '個。5個以上集まったら見せてくれ。地面の光、壺、井戸の中、建物の裏……遺物はいろいろな所にある。']); return; }
        if (!c.flag('acad_a_frag')) { await c.say('古代文明研究者オルテガ', ['大図書館の断片はまだそろわないか。司書に聞いてみるといい。']); return; }
        if (!c.flag('acad_a_order')) {
          await c.say('古代文明研究者オルテガ', ['3つの断片を、話の順に並べてくれ。']);
          var opts = ['A「星を読む…明日を測った」→B「測りすぎた…恐れた」→C「天秤を残し、空へ去った」', 'C「天秤を残し、空へ去った」→A「星を読む…」→B「測りすぎた…」', 'B「測りすぎた…」→C「空へ去った」→A「星を読む…」'];
          var a = await c.choice('正しい順番は？', opts);
          if (a !== 0) { await c.say('古代文明研究者オルテガ', ['うーん、話がつながらないな。「測った」→「恐れた」→「去った」……考えてみてくれ。']); return; }
          c.setFlag('acad_a_order', true);
        }
        c.setFlag('acad_a_report', true);
        await tri(c, '古代文明研究者オルテガ', ['そうか……「測れぬものを、測らぬために」去った、か。', ['lore', '断片を組み合わせると、一枚の記録盤になった。古代の者たちが残した「観測の記録」だ。持っていってくれ。収集の記録にも加えておく。']]);
        await oopart('op_053'); await c.questComplete('academy_ancient');
      } },
      { id: 'va_astudent', x: 9, y: 5, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('研究生ティモ', ['遺物を見つけたら、ここで研究が進むの。', '「オーパーツ」って言葉は、現実の世界でも「その時代にあるはずのない物」という意味で使われるのよ。たいていは誤解や作り話だったけど。']); } }
    ] });

  /* ---------- 研究者の居住区（哲学者・懐疑派科学者ほか） ---------- */
  var dm = Grid(16, 9, '_').border('#'); [1, 4, 11, 14].forEach(function (x) { dm.set(x, 1, 'E'); }); dm.set(2, 1, 'K').set(13, 1, 'K'); dm.set(7, 2, 't').set(8, 2, 't'); dm.set(1, 6, 'q').set(14, 6, 'z'); dm.set(7, 8, 'D');
  function view(n, name, lines) { return async function (c) {
    await tri(c, name, lines);
    if (c.questActive('academy_soul') && c.flag('acad_s_talk') && !c.flag('acad_sv_' + n)) {
      c.setFlag('acad_sv_' + n, true); var got = [1, 2, 3].filter(function (k) { return c.flag('acad_sv_' + k); }).length;
      await c.msg(['意見を聞いた。（' + got + '/3）']);
      if (got >= 3) { c.setFlag('acad_s_views', true); c.setFlag('vol_under_open', true); await c.msg(['3人の意見を聞いた。地下実験施設2階の「魂の秤」の部屋に、番人がいるという。']); }
    }
  }; }
  async function soulDialogue(c) {
    await tri(c, '哲学者ソフィア', ['哲学者のソフィアよ。自由意志、魂、死後の意識、主観的な体験——答えのない問いを考えるのが仕事。', '答えがないからこそ、どの主張にどれだけ根拠があるかを見極めたいの。三つ聞かせて。']);
    var QS = [
      { q: '「人が亡くなる瞬間に体重が21グラム減った。それが魂の重さだ」という話は？', o: ['確かめられた事実', '少人数の測定で方法に問題があり、再現もされていない', '学院の地下で確かめられた'], a: 1, ex: '1907年の医師の測定にもとづく話だが、人数が少なく方法にも問題があり、科学的には支持されていない。' },
      { q: '「脳の準備の信号が、本人が決めたと感じるより先に出た。だから自由意志はない」という主張は？', o: ['証明された', '実験は実在するが、その解釈には今も議論がある', 'まったく根拠のない作り話'], a: 1, ex: 'リベットの実験（1980年代）などが知られるが、その信号が「決定」なのかどうか、別の説明もあり、議論が続いている。' },
      { q: '「臨死体験の報告が多いから、意識は脳がなくても続く」という主張は？', o: ['報告は研究されているが、脳から独立した意識の証拠として確立してはいない', '確かめられた事実', '報告そのものが存在しない'], a: 0, ex: '臨死体験の報告は多く、研究もされているが、原因については脳の働きによる説明を含めて議論がある。' }
    ];
    var ok = 0; for (var i = 0; i < QS.length; i++) { var a = await c.choice(QS[i].q, QS[i].o); if (a === QS[i].a) { ok++; await c.msg(['ソフィア「そうね。」' + QS[i].ex]); } else await c.msg(['ソフィア「わたしはこう考えるわ。」' + QS[i].ex]); }
    if (ok < 2) { await c.say('哲学者ソフィア', ['分からないことを「分からない」と言うのも、立派な答えよ。もう一度考えてから話しましょう。']); return false; }
    await tri(c, '哲学者ソフィア', ['ありがとう。根拠の強さで話せる人は少ないの。', ['lore', 'この学院の地下には、魂を量ろうとした古い秤があるの。番人がそれを守っていて、近づく者を拒む。'], 'その前に、ここに住む3人の研究者の意見も聞いてみて。同じ問いでも、答えはみんな違うから。']);
    return true;
  }
  add({ id: 'vol_dorm', name: '研究者の居住区', kind: 'interior', bgm: 'inn', rows: dm.rows(), warps: [{ x: 7, y: 8, to: 'volatilia', tx: 32, ty: 27 }],
    npcs: [
      { id: 'va_sophia', x: 10, y: 4, sprite: 'npc_wizard', dir: 'down', wander: 0, talk: async function (c) {
        if (c.questDone('academy_soul')) { await c.say('哲学者ソフィア', ['魂があるかどうかは、まだ分からない。でも「量れないもの」を大切にする理由は、見つかった気がするわ。']); return; }
        if (c.flag('acad_s_warden')) { c.setFlag('acad_s_report', true); await tri(c, '哲学者ソフィア', ['番人を鎮めたのね。', ['lore', 'これは秤の分銅。どの秤に載せても重さが定まらない——この世界の不思議な遺物よ。持っていって。']]); await oopart('op_055'); await c.questComplete('academy_soul'); return; }
        if (!c.questActive('academy_soul')) { c.questStart('academy_soul'); }
        if (!c.flag('acad_s_talk')) { var ok = await soulDialogue(c); if (ok) c.setFlag('acad_s_talk', true); return; }
        await c.say('哲学者ソフィア', [root.Events.questObjective('academy_soul')]);
      } },
      { id: 'va_carter', x: 4, y: 4, sprite: 'npc_monk', dir: 'down', wander: 0, talk: view(1, '懐疑派科学者カーター', ['懐疑派のカーターだ。私は「すごい話」ほど、すごい証拠を求める。', ['fact', '再現できない実験、比べる対象のない観察、都合のいい例だけを集めた話は、どれも証拠としては弱い。'], '魂？ 今のところ、脳の働きと切り離して確かめる方法を私は知らない。だが、確かめる方法を探すのは賛成だ。']) },
      { id: 'va_yuri', x: 13, y: 4, sprite: 'villager_m', dir: 'down', wander: 1, talk: view(2, '量子物理の研究生ユウリ', ['僕は、意識と量子をすぐ結びつける話には慎重なんだ。', ['hyp', '量子的な過程が意識に関わるという説はあるけど、脳の中で量子状態が保たれる時間は短すぎる、という計算もある。'], 'でも、だからこそ測ってみたいんだよね。']) },
      { id: 'va_nadia', x: 7, y: 6, sprite: 'villager_f', dir: 'down', wander: 1, talk: view(3, '古代文明の研究生ナディア', ['古代の人たちは、魂をどう考えていたと思う？', ['fact', '多くの文化が死後の世界や魂についての考えを残している。それは人々が何を大切にしたかを知る手がかりになる。'], ['lore', 'この世界の古代文明は、魂を「量れないものの代表」として、わざと量らなかった——という説もあるわ。']]) }
    ] });

  /* ---------- 地下実験施設の入口 ---------- */
  var ug = Grid(10, 7, ':').border('#'); ug.set(4, 1, '>'); ug.set(1, 1, 'K').set(8, 1, 'K'); ug.set(1, 4, 'z').set(8, 4, 'q'); ug.set(4, 6, 'D');
  add({ id: 'vol_under_gate', name: '地下実験施設の入口', kind: 'interior', bgm: 'dungeon', rows: ug.rows(), warps: [{ x: 4, y: 6, to: 'volatilia', tx: 24, ty: 27 }, { x: 4, y: 1, to: 'vol_under_1', tx: 3, ty: 2 }],
    npcs: [
      { id: 'va_underguard', x: 4, y: 2, sprite: 'guard', dir: 'down', wander: 0, hideIf: 'vol_under_open', talk: async function (c) {
        var any = ['academy_consciousness', 'academy_entangle', 'academy_ancient', 'academy_cosmos', 'academy_soul', 'academy_zero'].some(function (id) { return c.questActive(id) || c.questDone(id); });
        if (any) { c.setFlag('vol_under_open', true); await c.say('地下実験施設の守衛', ['研究者の依頼を受けているのか。では通っていい。', '地下には実験の名残の魔物が出る。気をつけてくれ。']); root.World.applyState(root.World.map); return; }
        await c.say('地下実験施設の守衛', ['ここから先は地下実験施設だ。研究者の依頼を受けた者しか通せない。']); } }
    ] });

  /* ---------- 地下実験施設 1階・2階（ダンジョン） ---------- */
  var u1 = Grid(24, 16, ':').border('#');
  u1.rect(8, 1, 1, 10, '#').set(8, 5, ':'); u1.rect(16, 5, 1, 10, '#').set(16, 9, ':'); u1.rect(1, 11, 7, 1, '#').set(4, 11, ':'); u1.rect(9, 7, 7, 1, '#').set(12, 7, ':');
  u1.set(2, 1, '<'); u1.set(21, 14, '>'); u1.set(12, 2, 'X'); [[10, 10], [14, 12], [20, 3]].forEach(function (p) { u1.set(p[0], p[1], 'I'); });
  var ENC = { rate: 0.05, zones: [{ name: '地下実験施設', test: function () { return true; }, groups: [['lab_drone'], ['lab_drone', 'lab_drone'], ['superposition_cat'], ['quantum_shade'], ['superposition_cat', 'lab_drone'], ['quantum_shade', 'lab_drone']], level: 24 }] };
  add({ id: 'vol_under_1', name: '地下実験施設 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: u1.rows(), warps: [{ x: 2, y: 1, to: 'vol_under_gate', tx: 4, ty: 3 }, { x: 21, y: 14, to: 'vol_under_2', tx: 3, ty: 2 }],
    chests: [{ id: 'vu1', x: 22, y: 1, item: 'hi_ether', qty: 1 }, { id: 'vu2', x: 1, y: 9, item: 'mana_soda', qty: 2 }],
    events: [
      { x: 12, y: 3, type: 'boss', optional: true, enemies: ['observer_echo'], requireFlag: 'acad_c_records', doneFlag: 'acad_c_echo', lockedText: ['誰かに見られている気がする……が、姿はない。（意識研究所の記録を集めると、正体が見えるかもしれない）'],
        intro: ['水晶の前の空間がゆがみ、無数の目のような光が浮かんだ。', '【この世界の設定】意識の実験で残された「見られている感覚」が、形になったものだ。'], after: ['光の目が一つずつ閉じていった。……観測者の残響は静まった。', '意識研究所のミレイユに報告しよう。'] },
      { x: 12, y: 2, type: 'inspect', solid: true, text: ['実験用の水晶。表面に「観測するまで、結果は決まらない（とこの世界では言われる）」と書かれている。'] }
    ],
    encounters: ENC });
  var u2 = Grid(24, 16, ':').border('#');
  u2.rect(1, 5, 22, 1, '#').set(6, 5, ':').set(17, 5, ':'); u2.rect(1, 10, 22, 1, '#').set(3, 10, ':').set(12, 10, ':').set(20, 10, ':');
  u2.set(2, 1, '<'); u2.set(20, 2, 'X'); [[5, 8], [12, 13], [19, 8]].forEach(function (p) { u2.set(p[0], p[1], 'v'); });
  function device(n) { return async function (c) {
    if (c.flag('acad_zd_' + n)) { await c.msg(['共鳴装置は止まっている。']); return; }
    if (!c.flag('acad_z_start')) { await c.msg(['共鳴装置が低い音で唸っている。（学院長の調査を受けると止められる）']); return; }
    await tri(c, '共鳴装置', ['装置のまわりに、青白い炎が集まってきた！', ['lore', '装置が大陸のクリスタルの脈に合わせて動き、何もない空間から炎を呼んでいる。']]);
    var r = await c.battle(['zero_wisp', 'zero_wisp'], {}); if (r === 'lost') { await gameOver(); return; } if (r !== 'won') return;
    c.setFlag('acad_zd_' + n, true); var got = [1, 2, 3].filter(function (k) { return c.flag('acad_zd_' + k); }).length; await c.msg(['共鳴装置を止めた。（' + got + '/3）']);
    if (got >= 3) { c.setFlag('acad_z_devices', true); await c.msg(['3台の装置が止まった。……中央の水晶の奥で、何かが目を開けた。']); }
  }; }
  add({ id: 'vol_under_2', name: '地下実験施設 2階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: u2.rows(), warps: [{ x: 2, y: 1, to: 'vol_under_1', tx: 20, ty: 14 }],
    chests: [{ id: 'vu3', x: 22, y: 14, item: 'elixir', qty: 1 }, { id: 'vu4', x: 1, y: 14, item: 'deluxe_steak', qty: 2 }],
    events: [
      { x: 20, y: 3, type: 'boss', optional: true, enemies: ['soul_warden'], requireFlag: 'acad_s_views', doneFlag: 'acad_s_warden', lockedText: ['古い秤の前に、鎧の番人が立っている。……まだ動かない。（哲学者ソフィアの研究を手伝うと、近づけるかもしれない）'],
        intro: ['古い秤の前で、鎧の番人が目を覚ました。', '「量ルナ。量レヌモノヲ、量ルナ。」'], after: ['番人は秤の前にひざまずき、動かなくなった。', '哲学者ソフィアに報告しよう。'] },
      { x: 12, y: 7, type: 'boss', optional: true, enemies: ['zero_echo'], requireFlag: 'acad_z_devices', doneFlag: 'acad_z_boss', lockedText: ['中央の水晶が、ゆっくり脈打っている。（共鳴装置3台を止めると、何かが起きそうだ）'],
        intro: ['水晶の中の「何もない空間」が裂け、青白い光の巨人が現れた。', '【この世界の設定】ゼロポイント領域の異常から生まれた残響。クリスタルと同じ周期で脈打っている。', '「止マレ……スベテ、止マレ……変ワルナ……」'], after: ['巨人は光の粒になって水晶へ戻っていった。脈が、静かになった。', '学院長室へ報告しよう。'] }
    ].concat([[5, 8], [12, 13], [19, 8]].map(function (p, i) { return { x: p[0], y: p[1], type: 'script', solid: true, run: device(i + 1) }; })),
    encounters: { rate: 0.05, zones: [{ name: '地下実験施設 2階', test: function () { return true; }, groups: [['quantum_shade', 'lab_drone'], ['superposition_cat', 'superposition_cat'], ['zero_wisp', 'lab_drone'], ['quantum_shade', 'quantum_shade'], ['zero_wisp', 'superposition_cat']], level: 26 }] } });
})(typeof window !== 'undefined' ? window : globalThis);
