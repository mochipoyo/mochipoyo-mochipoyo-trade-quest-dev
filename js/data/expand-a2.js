/* =========================================================
   Data / Phase A 第2段階（v6.4）：城の階層（魔導王宮・セントラ王宮）
   ・リヴェル城（第1段階、js/data/expand-a.js）と同じ「会議室・書庫・私室・地下」を使い回さず、城の用途に合わせた部屋にする
     - 魔導王宮（魔導都マクディア）：研究の国の王宮 → 2階＝魔導評議の円卓・王立魔導書庫・宮廷魔導師の研究室・大臣ヴォルクの執務室（ヴォルクの裏切りを暴いた後）
                                        地下＝魔力炉の間・封印庫（王が研究の扱いを決めた後。中身は選んだ答えで変わる）
     - 王宮（王都セントラ）：徴収と帳簿の中枢 → 西棟＝没収記録の書庫・大宰相の私室・旧親衛隊の詰所／地下＝没収品の保管庫・飢饉の記録碑
                                        （どちらも大宰相セヴランとの決着の後に開く。それまでは理由と条件を表示）
   セーブの互換：既存のマップIDと座標は変えない。既存の地図は床のマスを階段にしただけ（魔導王宮2マス・王宮2マス）
   ========================================================= */
(function (root) {
  'use strict';
  var M = root.MAP_DEFS; var add = root.TownKit.add;
  function D() { return root.State.data; }
  function W() { return root.World; }
  function flag(k) { return !!(D() && D().flags[k]); }
  function Grid(Wd, H, ch) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < Wd; x++) g[y].push(ch); } return {
    set: function (x, y, c) { if (g[y] && g[y][x] !== undefined) g[y][x] = c; return this; },
    rect: function (x, y, w, h, c) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) this.set(xx, yy, c); return this; },
    border: function (c) { for (var x = 0; x < Wd; x++) { g[0][x] = c; g[H - 1][x] = c; } for (var y = 0; y < H; y++) { g[y][0] = c; g[y][Wd - 1] = c; } return this; },
    rows: function () { return g.map(function (r) { return r.join(''); }); } }; }
  function setRow(def, x, y, ch) { var r = def.rows[y]; def.rows[y] = r.slice(0, x) + ch + r.slice(x + 1); }
  var EX = root.EXPAND_A = root.EXPAND_A || { maps: [], patched: [] }; EX.stage2 = { maps: [], patched: [] };
  function reg(def) { add(def); EX.maps.push(def.id); EX.stage2.maps.push(def.id); return def; }
  function patched(id) { EX.patched.push(id); EX.stage2.patched.push(id); }

  /* =========================================================
     魔導王宮（16×14）：左下（1,12）＝2階へ、右下（14,12）＝地下へ
     ========================================================= */
  var MP = M.magicka_palace;
  if (MP && MP.rows[12][1] === ':' && MP.rows[12][14] === ':') {
    setRow(MP, 1, 12, '<'); setRow(MP, 14, 12, '>');
    MP.warps.push({ x: 1, y: 12, to: 'magicka_palace_2f', tx: 2, ty: 7, name: '2階へ' }, { x: 14, y: 12, to: 'magicka_palace_b1', tx: 17, ty: 2, name: '地下へ' });
    patched('magicka_palace');
  }
  // 2階（24×16）：上の段＝円卓の間（西）・王立魔導書庫（東）、下の段＝宮廷魔導師の研究室（西）・大臣の執務室（東）
  var m2 = Grid(24, 16, ':').border('C');
  m2.rect(1, 6, 22, 1, 'C').rect(1, 9, 22, 1, 'C'); m2.set(6, 6, ':').set(17, 6, ':').set(6, 9, ':').set(17, 9, 'U');
  m2.rect(11, 1, 2, 5, 'C').rect(11, 10, 2, 5, 'C');
  [[4, 2], [8, 2], [3, 3], [9, 3], [4, 4], [8, 4]].forEach(function (p) { m2.set(p[0], p[1], 't'); }); m2.set(6, 3, 'X'); m2.set(1, 1, 'I').set(10, 1, 'I');   // 円卓（7つの席と中央の映像水晶）
  m2.rect(13, 1, 10, 1, 'K'); m2.rect(14, 3, 3, 1, 'K').rect(19, 3, 3, 1, 'K'); m2.set(15, 5, 't'); m2.set(22, 5, 'K');   // 書庫
  m2.rect(2, 11, 3, 1, 'T'); m2.set(8, 11, 'X').set(9, 11, 'q').set(1, 14, 'K').set(2, 14, 'K').set(9, 14, 'z').set(5, 13, 't');   // 研究室
  m2.rect(15, 11, 5, 1, 'T'); m2.set(21, 10, 'K').set(22, 10, 'K').set(13, 14, 'I').set(22, 14, 'q');   // 執務室
  m2.set(1, 7, '>'); m2.rect(3, 7, 18, 1, 'p');
  reg({ id: 'magicka_palace_2f', name: '魔導王宮 2階', kind: 'interior', bgm: 'castle', rows: m2.rows(),
    warps: [{ x: 1, y: 7, to: 'magicka_palace', tx: 2, ty: 12, name: '玉座の間へ' }],
    chests: [{ id: 'mp2_1', x: 22, y: 13, item: 'hi_ether', qty: 2 }, { id: 'mp2_2', x: 1, y: 13, item: 'ether', qty: 3 }],
    events: [
      { x: 6, y: 3, type: 'inspect', solid: true, text: ['円卓の中央の映像水晶。評議のとき、各地の魔導師の顔がここに映る。', '今は、空っぽの席が七つ映っているだけだ。'] },
      { x: 17, y: 9, type: 'gate', solid: true, needFlag: 'minister_defeated', doneFlag: 'mp_volk_office_open', tile: 'door_locked', doneTile: 'door', tileFlag: 'mp_volk_office_open', text: ['大臣ヴォルクの執務室。魔導の封印がかかっている。', '（解放条件：禁書庫で大臣ヴォルクの裏切りを暴く）'], openText: ['近衛騎士が封印を解いた。「調べてくれ。この部屋の記録は、もう隠すべきものではない」'] },
      { x: 17, y: 11, type: 'script', solid: true, run: async function () { await root.ExpandA2.volkLedger(); } },
      { x: 8, y: 11, type: 'inspect', solid: true, text: ['研究用の小さな水晶。触れると、ほんのり温かい。', '机の帳面：「欠片の共鳴は、持ち主の迷いが大きいほど強くなる。……迷いを、力に変える仕組みか？」'] }
    ],
    npcs: [
      { id: 'mp2_councilor', x: 6, y: 4, sprite: 'scholar', dir: 'up', wander: 0, talk: async function (c) {
        if (flag('magicka_choice_done')) await c.say('評議員', [D().flags.magicka_choice === 2 ? '研究の封印に、評議会は賛成と反対が半々でした。……結論より、議論が記録に残ったことが大事だと私は思います。' : '研究を公開する決まりは、評議会でも何度も読み上げました。「読む者の責任」の一文に、皆が長く黙りました。']);
        else await c.say('評議員', ['ここは魔導評議の円卓。王の前に、まず七人の評議員が話し合います。', '……最近は大臣ヴォルクがひとりで決めてしまうので、席は空いてばかりですが。']); } },
      { id: 'mp2_librarian', x: 17, y: 2, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('王立魔導書庫の司書', ['ここは王立の書庫。禁書庫ほど古くはないけれど、学院より新しい研究がある。', '本棚の本は、どれでも読んでいいわ。持ち出しは禁止よ。']); } },
      { id: 'mp2_magus', x: 4, y: 12, sprite: 'priest', dir: 'up', wander: 1, talk: async function (c) { await c.say('宮廷魔導師', ['欠片は、触れた人の迷いに反応して光るの。迷いが大きいほど、強く。', '……だから魔物は、人の欲と恐れが大きい所に集まるのかもしれない。']); } },
      { id: 'mp2_knight', x: 18, y: 8, sprite: 'rune_knight', dir: 'left', wander: 0, talk: async function (c) { await c.say('近衛騎士', flag('minister_defeated') ? ['大臣の執務室は、封印を解いて調査中だ。記録は好きに読んでくれ。'] : ['その扉は大臣ヴォルクの執務室だ。大臣の許しなく入ることはできん。']); } }
    ] });
  // 地下（20×12）：西＝魔力炉の間、東＝封印庫（王が研究の扱いを決めた後）
  var mb = Grid(20, 12, '#').border('#');
  mb.rect(1, 1, 18, 2, ':'); mb.set(18, 2, '<');
  mb.rect(1, 4, 9, 7, ':'); mb.set(5, 3, ':'); mb.rect(4, 6, 3, 3, 'X'); mb.set(5, 7, 'X'); [[2, 5], [8, 5], [2, 9], [8, 9]].forEach(function (p) { mb.set(p[0], p[1], 'I'); });   // 魔力炉（水晶の塊）
  mb.rect(12, 5, 7, 6, ':'); mb.set(15, 4, 'L'); mb.set(15, 3, ':'); [[12, 6], [13, 6], [17, 6], [18, 6], [12, 10], [18, 10]].forEach(function (p) { mb.set(p[0], p[1], 'K'); });   // 封印庫
  reg({ id: 'magicka_palace_b1', name: '魔導王宮 地下', kind: 'interior', bgm: 'dungeon', rows: mb.rows(),
    warps: [{ x: 18, y: 2, to: 'magicka_palace', tx: 13, ty: 12, name: '玉座の間へ' }],
    chests: [{ id: 'mpb_1', x: 13, y: 9, item: 'elixir', qty: 1 }],
    events: [
      { x: 5, y: 6, type: 'script', solid: true, run: async function () { await root.ExpandA2.reactor(); } },
      { x: 15, y: 4, type: 'script', solid: true, doneFlag: 'mp_vault_open', tile: 'door_locked', doneTile: 'door', tileFlag: 'mp_vault_open', run: async function () { await root.ExpandA2.vaultDoor(); } },
      { x: 15, y: 8, type: 'script', solid: true, tile: 'crystal', run: async function () { await root.ExpandA2.vaultRecord(); } }
    ],
    npcs: [
      { id: 'mpb_keeper', x: 10, y: 2, sprite: 'rune_knight', dir: 'down', wander: 0, talk: async function (c) { await c.say('炉の番人', ['この下に眠るのは、王国が最初に作った魔力炉だ。今は止めてある。', '奥の封印庫には、クリスタルの研究の原本がある。王のお決めになったとおりに扱われる。']); } }
    ] });

  /* =========================================================
     王宮（王都セントラ、24×14）：左下（1,12）＝西棟（2階）へ、右下（22,12）＝地下へ。どちらも大宰相との決着（sevran_fallen）の後
     ========================================================= */
  var SP = M.sentra_palace_1;
  if (SP && SP.rows[12][1] === ':' && SP.rows[12][22] === ':') {
    setRow(SP, 1, 12, '<'); setRow(SP, 22, 12, '>');
    var lockS = ['階段の前に親衛隊の柵が立てられている。「大宰相閣下の許しなく、通すことはできん」', '（解放条件：帳簿中枢を止め、大宰相セヴランとの話に決着をつける）'];
    SP.warps.push({ x: 1, y: 12, to: 'sentra_palace_west', tx: 2, ty: 11, name: '西棟（2階）へ', needFlag: 'sevran_fallen', lockedText: lockS }, { x: 22, y: 12, to: 'sentra_palace_vault', tx: 17, ty: 1, name: '地下の保管庫へ', needFlag: 'sevran_fallen', lockedText: lockS });
    patched('sentra_palace_1');
  }
  // 西棟（2階、26×14）：没収記録の書庫（西）・大宰相の私室（中央）・旧親衛隊の詰所（東）
  var sw = Grid(26, 14, ':').border('C');
  sw.rect(1, 9, 24, 1, 'C'); sw.set(5, 9, ':').set(13, 9, ':').set(21, 9, ':'); sw.rect(9, 1, 1, 8, 'C').rect(17, 1, 1, 8, 'C');
  [2, 4, 6].forEach(function (y) { sw.rect(1, y, 7, 1, 'K'); }); sw.set(1, 2, ':');   // 書庫：本棚の列（西の端は通路）
  sw.set(11, 2, 'E').set(15, 2, 'K').set(14, 4, 't').set(11, 6, 'a').set(15, 7, 'q');   // 私室
  [[19, 2], [21, 2], [23, 2]].forEach(function (p) { sw.set(p[0], p[1], 'E'); }); sw.set(19, 6, 'z').set(20, 6, 'z').set(23, 6, 'q');   // 詰所
  sw.set(1, 11, '>'); sw.rect(3, 11, 21, 1, 'p');
  reg({ id: 'sentra_palace_west', name: '王宮 西棟（2階）', kind: 'interior', bgm: 'castle', rows: sw.rows(),
    warps: [{ x: 1, y: 11, to: 'sentra_palace_1', tx: 2, ty: 12, name: '王宮1階へ' }],
    chests: [{ id: 'spw_1', x: 24, y: 7, item: 'hi_potion', qty: 3 }],
    events: [
      { x: 14, y: 4, type: 'script', solid: true, run: async function () { await root.ExpandA2.sevranDiary(); } },
      { x: 1, y: 1, type: 'inspect', solid: false, text: ['書庫の入口の札：「没収記録 第一〜第三百二十棚」', '棚の背表紙には、名前ではなく番号だけが並んでいる。'] }
    ],
    npcs: [
      { id: 'spw_clerk', x: 4, y: 7, sprite: 'scholar', dir: 'up', wander: 1, talk: async function (c) {
        if (flag('kalion_reformed')) await c.say('返還係', ['返還令が出てから、毎日ここで記録を読み直しています。番号を、名前に戻す仕事です。', '……三百二十棚。終わるのは何年先でしょうね。でも、一棚ずつなら、今日も進みます。']);
        else await c.say('返還係', ['ここには、連邦が没収した財産の記録があります。誰から、何を、いくら。', '監察官リーヴ様の返還令が出れば、これを持ち主に返す仕事が始まります。']); } },
      { id: 'spw_guard', x: 21, y: 4, sprite: 'royal_guard', dir: 'down', wander: 1, talk: async function (c) { await c.say('元親衛隊員', ['俺たちは大宰相閣下の命令で、王都の門を守っていた。……誰から何を守っていたのか、今になって考えている。', '鎧は脱いだ。今は返還の荷物を運んでいる。こっちのほうが、肩は重いが、眠れる。']); } }
    ] });
  // 地下の保管庫（20×12）：没収品の倉庫（東）・飢饉の記録碑（西）
  var sv = Grid(20, 12, '#').border('#');
  sv.rect(1, 1, 18, 2, ':'); sv.set(18, 1, '<');
  sv.rect(10, 4, 9, 7, ':'); sv.set(14, 3, ':'); [[11, 5], [12, 5], [16, 5], [17, 5], [11, 8], [16, 8], [17, 8]].forEach(function (p) { sv.set(p[0], p[1], 'z'); }); [[13, 9], [18, 7]].forEach(function (p) { sv.set(p[0], p[1], 'q'); });
  sv.rect(1, 4, 7, 7, ':'); sv.set(4, 3, ':'); sv.set(4, 6, 'X'); sv.set(2, 9, 'I').set(6, 9, 'I');
  reg({ id: 'sentra_palace_vault', name: '王宮 地下の保管庫', kind: 'interior', bgm: 'dungeon', rows: sv.rows(),
    warps: [{ x: 18, y: 1, to: 'sentra_palace_1', tx: 22, ty: 11, name: '王宮1階へ' }],
    events: [
      { x: 4, y: 6, type: 'inspect', solid: true, text: ['古い記録碑。「大飢饉の年。王都の倉は満ちていたが、配る記録がなかった。倉は開かれず、南区で多くが死んだ」', '「記録なき分配は、分配ではない」……碑の下に、誰かが小さく書き足している。「記録だけの分配も、分配ではない」'] },
      { x: 11, y: 5, type: 'script', solid: true, run: async function () { await root.ExpandA2.ownerTag(1); } },
      { x: 17, y: 5, type: 'script', solid: true, run: async function () { await root.ExpandA2.ownerTag(2); } },
      { x: 16, y: 8, type: 'script', solid: true, run: async function () { await root.ExpandA2.ownerTag(3); } }
    ],
    npcs: [
      { id: 'spv_steward', x: 14, y: 7, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await root.ExpandA2.steward(c); } }
    ] });

  /* ---------- 出来事 ---------- */
  var A2 = root.ExpandA2 = {};
  A2.volkLedger = async function () {
    var d = D(); var l = ['大臣ヴォルクの机。引き出しに、薄い帳簿が一冊。'];
    l.push('「欠片の研究写し 一式 → 北の砦へ。対価：研究費の三年分」「研究所の警備の配置図 → 同上」');
    l.push('……相手の名前の欄は、どれも「北の砦」とだけ書かれている。魔王軍との取引の記録だ。');
    if (!d.flags.mp_volk_ledger) { d.flags.mp_volk_ledger = true; d.gold += 500; l.push('机の下に、取引の前金の残りがあった。近衛騎士の許しを得て、調査の礼として500Gを受け取った。'); }
    await root.Win.message(l);
  };
  A2.reactor = async function () {
    await root.Win.message(['止められた魔力炉。水晶の塊が、かすかに脈打っている。', '台座の銘板：「王国暦元年。欠片の共鳴を灯りと熱に。民の夜を明るく」', '……最初は、灯りのための研究だったのだ。']);
  };
  A2.vaultDoor = async function () {
    var d = D();
    if (d.flags.mp_vault_open) return;
    if (!d.flags.magicka_choice_done) { await root.Win.message(['封印庫の扉。王家の封印がかかっている。', '（解放条件：魔導王に、クリスタルの研究の扱いについて答える）']); return; }
    d.flags.mp_vault_open = true; W().applyState(W().map);
    await root.Win.message(['炉の番人が封印を解いた。「王のお決めになったとおり、封印庫を開けよとのことだ」', '封印庫の扉が開いた。']);
  };
  A2.vaultRecord = async function () {
    var c = D().flags.magicka_choice;
    var l = c === 0 ? ['研究の原本の棚は、空になっている。札には「写しは学院の前の閲覧所へ。原本は王家が保管」。', '公開された研究を読むために、学院の前には今日も列ができているという。']
      : c === 2 ? ['原本の棚は、鎖と封印で閉ざされている。札には「永久封印。開封には評議会全員の署名を要す」。', '……封印の上に、うっすらと埃。誰かが最近、指でなぞった跡がある。']
        : ['原本の棚の横に、分厚い閲覧記録。「読んだ者の名・日付・目的」が、一行ずつ書かれている。', '最初の行は、学院長ミレイユ。目的の欄には「誰が読んだかを、読む者自身が知るために」。'];
    await root.Win.message(['研究の原本の棚。'].concat(l));
  };
  A2.sevranDiary = async function () {
    var d = D(); var ch = d.flags.sevran_choice;
    var l = ['大宰相セヴランの日記。最後の数ページだけが新しい。', '「あの年、私は倉の鍵を持っていた。配る記録がなかったから、開けなかった。……記録さえあれば、と思った」'];
    l.push(ch === 1 ? '最後のページ：「明日、王都を出る。城壁の外のテントを、一度ちゃんと見ておこう」' : ch === 2 ? '最後のページ：「返還の記録を書く。自分の字で、名前を書く。最初の一人の名前を書くのに、一刻かかった」' : '最後のページ：「裁かれるのは当然だ。記録には、私の名前も書かれるべきだ」');
    await root.Win.message(l);
  };
  A2.ownerTag = async function (n) {
    var d = D(); var key = 'spv_tag' + n;
    var names = ['南区 粉屋のマルタ「石臼一式」', '南区 靴職人ベロン「工具箱と革」', '西区 教師エノ「本　四十二冊」'];
    if (!d.flags[key]) { d.flags[key] = true; }
    await root.Win.message(['木箱の札：' + names[n - 1], '番号の札の上に、新しい名前の札が結んである。']);
  };
  A2.steward = async function (c) {
    var d = D(); var cnt = [1, 2, 3].filter(function (n) { return d.flags['spv_tag' + n]; }).length;
    if (d.flags.spv_reward) { await c.say('保管庫の係', ['名前の札、助かったよ。今日は石臼が粉屋に帰った。']); return; }
    if (cnt < 3) { await c.say('保管庫の係', ['ここは没収品の保管庫。返還令の荷物を、持ち主に返す準備をしている。', '箱に名前の札をつけ直しているんだが……手が足りなくてね。まだ札を確かめていない箱がある（' + cnt + '/3）。見てきてくれるかい？']); return; }
    d.flags.spv_reward = true; c.give('hi_potion', 3);
    await c.say('保管庫の係', ['三つとも確かめてくれたのか。ありがとう。番号じゃなく名前で、荷物を送り出せる。', '礼にもならないが、配給の残りのハイポーションだ。持っていってくれ。']);
    await c.msg(['ハイポーション×3を手に入れた！']);
  };
})(typeof window !== 'undefined' ? window : globalThis);
