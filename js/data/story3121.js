/* =========================================================
   Data / Story 3121（v6.9）: 西暦3121年の地球——新しいプロローグ「炎に消えた故郷」
   ・世界設定の正本は docs/earth3121-lore.md（均衡暦0年＝西暦3024年。西暦 = 3024 + 均衡暦。物語の現在は西暦3121年＝均衡暦97年）
   ・新しく始めたゲームだけ、アサナ村（平和）→ 徴税官 → 夜の襲撃 → 両親との別れ → ポヨ村への漂着 から始まる
       Title.newGame → Story3121.beginNewGame()（State.newGame は変えない：テスト・旧セーブの初期値はポヨ村のまま）
   ・アサナ村の4つの状態は別のマップにする（2D・3Dとも、状態ごとに地形・炎・煙・人が変わる）
       asana_village（平和）／asana_raid（襲撃）／asana_ruins（廃墟：第6章の記録で場所が分かる）／asana_rebuilt（復興：エンディングのあと）
   ・ポヨ村の村長の100G・薬草・職業の武器、met_elder、main_1、リーナの加入は、これまでの会話のまま一度だけ（js/data/towns.js）
   ・旧セーブ：プロローグを強制しない。ポヨ村の村長の家のベッドから「回想」（文章）で読める。母の帳簿・お守りもそこで受け取れる
   ・フラグは s3121_ で始まる名前だけ（docs/story-3121-implementation-status.md に一覧）。報酬・重要アイテムは一度だけ
   ・主人公の名前・性別・一人称は決めない（台詞に「僕・私・俺」を使わない）
   ========================================================= */
(function (root) {
  'use strict';
  var MD = root.MAP_DEFS; var add = root.TownKit.add; var ITEMS = root.ITEMS; var QUESTS = root.QUESTS;
  function D() { return root.State && root.State.data; }
  function F() { return D().flags; }
  function W() { return root.World; }
  function Win() { return root.Win; }
  function hero() { return D().hero.name; }
  var S = root.Story3121 = root.Story3121 || {};
  S.timeScale = 1;   // 演出の待ち時間の倍率（自動テストでは小さくする）
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms * S.timeScale); }); }

  /* ---------- 年表（docs/earth3121-lore.md と同じ。ゲーム内の記録帳・図鑑の表示に使う） ---------- */
  S.EPOCH = 3024;   // 均衡暦0年＝西暦3024年
  S.toAD = function (be) { return S.EPOCH + be; };
  S.TIMELINE = [
    [2052, null, '旧地球文明の複合崩壊（AIをめぐる対立・戦争・地磁気と環境の異常・通信と社会基盤の混乱が連鎖した、と記録の断片にある）'],
    [2121, null, '「波形トレーダーズビルド」のもちぽよと門下生が、トレード財団と波形教の源流となる学びの場を開いた——とされる（伝承。真偽・人物の同一性は不明）'],
    [2604, -420, '均衡のクリスタルの原型「天秤の核」完成'],
    [2724, -300, '五種族会議・均衡の約定'],
    [2844, -180, '結晶が徴税と未来予測に転用される'],
    [2964, -60, '予測戦争'],
    [3012, -12, '天秤の鏡の完成'],
    [3024, 0, '第二の大災害（エルミナの半分が沈む。魔導士アルヴァの願い）——2052年の崩壊とは別の出来事'],
    [3032, 8, 'オラクルの開発が始まる（2052年のAIと同一とは記録にない）'],
    [3059, 35, 'カリオン徴収連邦の成立'],
    [3084, 60, '鉄冠魔王軍がグラニアへ'],
    [3095, 71, '大飢饉'],
    [3112, 88, 'セヴランが大宰相に'],
    [3121, 97, 'アサナ村の襲撃。物語の現在']
  ];

  /* ---------- 小さな道具 ---------- */
  S.phase = function () { var d = D(); return (d && d.flags && d.flags.s3121_prologue_phase) || null; };
  S.setPhase = function (p) { F().s3121_prologue_phase = p; };
  S.inPrologue = function () { var p = S.phase(); return !!p && p !== 'done' && p !== 'poyo_day'; };
  S.newPrologue = function () { var d = D(); return !!(d && d.flags && d.flags.s3121_new_prologue); };
  function ctx() { return root.Events.ctx(null); }
  function npcOf(id) { var m = W().map; if (!m) return null; for (var i = 0; i < m.npcs.length; i++) if (m.npcs[i].id === id) return m.npcs[i]; return null; }
  function refresh() { var w = W(); if (w && w.map) w.applyState(w.map); }
  function setTime(t) { D().timeOfDay = t; }
  // 暗転（2D・3D 共通）：会話の窓（#ui）より下に敷く黒い幕。会話の文字は幕の上に出る
  function veilEl() {
    if (typeof document === 'undefined') return null;
    var v = document.getElementById('s3121-veil');
    if (!v) { v = document.createElement('div'); v.id = 's3121-veil'; v.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;background:#000;opacity:0;pointer-events:none;transition:opacity .6s'; var st = document.getElementById('stage'), ui = document.getElementById('ui'); if (st && ui && ui.parentNode === st) st.insertBefore(v, ui); else if (st) st.appendChild(v); }
    return v;
  }
  S.veil = function (on, color, ms) { var v = veilEl(); ms = ms === undefined ? 600 : ms; if (!v) return Promise.resolve(); v.style.background = color || '#000'; v.style.transitionDuration = (ms / 1000) + 's'; v.style.opacity = on ? String(typeof on === 'number' ? on : 1) : '0'; return sleep(ms); };
  S.flash = async function (color) { await S.veil(0.85, color || '#fff', 120); await S.veil(0, color || '#fff', 380); };
  // 3D のイベント用カメラ（GameBridge.cine）。2D 版・3D の準備ができていないときは何もしない
  S.cine = function (o) { var a = root.MTQ3D; try { if (a && a.cine) a.cine(o || null); } catch (e) { /* 演出だけなので失敗しても続ける */ } };
  S.emote = function (name) { var a = root.MTQ3D; try { if (a && a.emote && a.hero) a.emote(name); } catch (e) { /* なし */ } };
  // NPC を1マスずつ歩かせる（2D の描画と 3D の位置は同じ n.x / n.nx / n.prog を読む）
  function stepNpc(n, nx, ny, ms) {
    return new Promise(function (res) {
      var TS = (root.Engine && root.Engine.TS) || 32; var t0 = Date.now(); ms = Math.max(1, ms * S.timeScale);
      n.dir = nx > n.x ? 'right' : nx < n.x ? 'left' : ny > n.y ? 'down' : 'up'; n.moving = true; n.nx = nx; n.ny = ny; n.prog = 0;
      (function tick() {
        var k = Math.min(1, (Date.now() - t0) / ms); n.prog = k; n.ox_px = (nx - n.x) * TS * k; n.oy_px = (ny - n.y) * TS * k; n.frame = Math.floor(k * 4) % 2; n.phase = Math.floor(k * 4) % 4;
        if (k >= 1) { n.x = nx; n.y = ny; n.ox = nx; n.oy = ny; n.moving = false; n.ox_px = 0; n.oy_px = 0; n.frame = 0; n.phase = 0; res(); } else setTimeout(tick, 30);
      })();
    });
  }
  S.walk = async function (id, path, ms) { var n = npcOf(id); if (!n) return; n.hidden = false; for (var i = 0; i < path.length; i++) await stepNpc(n, path[i][0], path[i][1], ms || 260); };
  S.show = function (id, on, x, y, dir) { var n = npcOf(id); if (!n) return; n.hidden = !on; if (x !== undefined) { n.x = n.ox = x; n.y = n.oy = y; n.moving = false; } if (dir) n.dir = dir; };
  function faceHero(dir) { var p = W().player; if (p && dir) p.dir = dir; }
  function place(map, x, y, dir) { W().enterMap(map, x, y, dir || 'down'); }
  // 同じマップの中で主人公を立たせ直す（3D 版は 2D の位置の変化を見て合わせる）
  function movePlayer(x, y, dir) { var p = W().player; if (!p) return; p.x = x; p.y = y; p.px = x * 32; p.py = y * 32; p.moving = false; if (dir) p.dir = dir; W().syncPos(); if (root.Follow && root.Follow.reset) { try { root.Follow.reset(W().map, x + 0.5, y + 0.5, p.dir); } catch (e) { /* 隊列の並べ直しだけ */ } } }
  // マップの歩数処理に、範囲に入ったら一度だけ動くきっかけを足す（m.def.onStep。true を返すとエンカウントなどを止める）
  function onStepTriggers(mapId, list) {
    var def = MD[mapId]; if (!def) return; var prev = def.onStep;
    def.onStep = function (m, p, warping) {
      if (!warping && !W().busy) for (var i = 0; i < list.length; i++) { var t = list[i]; if (t.when() && p.x >= t.x0 && p.x <= t.x1 && p.y >= t.y0 && p.y <= t.y1) { runScene(t.run); return true; } }
      return prev ? prev(m, p, warping) : false;
    };
  }
  // 会話の場面を「イベント」として実行する（World.busy・オートセーブは Events.run と同じ扱い）
  function runScene(fn) { return root.Events.run({ type: 'script', run: function (c) { return fn(c); } }); }
  S.runScene = runScene;

  /* ---------- 重要アイテム（売れない・使うと読める。js/ui/menu.js が it.read を呼ぶ） ---------- */
  function K(id, name, desc, read) { if (ITEMS[id]) return; ITEMS[id] = { id: id, name: name, cat: 'key', price: 0, desc: desc, read: read }; }
  function giveOnce(id) { if (!root.State.hasItem(id)) { root.State.addItem(id, 1); return true; } return false; }
  S.giveFamilyItems = function () { var a = giveOnce('s3121_ledger'), b = giveOnce('s3121_amulet'); F().s3121_ledger_owned = true; return a || b; };
  K('s3121_ledger', '母の帳簿', '母ミオがアサナ村の収穫と税を書きとめていた帳簿。どうぐから読み返せる（思い出の回想もここから）', function () { return S.readLedger(); });
  K('s3121_amulet', '家族のお守り', '母から託された、小さなお守り。「ずっと昔から家族が大切にしてきたもの」。どうぐから見られる', function () { return S.readAmulet(); });
  K('s3121_letter', '母の手紙', '母の帳簿の最後のページに挟まれていた手紙。何度でも読み返せる', function () { return S.readLetter(); });
  K('s3121_chronicle', '千年の記録帳', '旅で見つけた古い記録の写し（2052年の断片・千年前の伝承・第二の大災害）。どうぐから読める', function () { return S.readChronicle(); });

  S.LETTER = ['いつかこの手紙を読むあなたへ。', 'この世界には、理不尽なことがたくさんあります。努力しても報われないこともあるし、大切なものを失う日もあるでしょう。', 'それでも、人を憎むことだけに人生を使わないでほしい。', 'あなたには、たくさん笑って、たくさんの人に出会って、幸せになってほしい。', 'もし、あなたがお金持ちになったら、そのお金で誰かを助けてあげてね。', 'それから、たまには自分のためにも使うのよ。', 'あなたが幸せに生きてくれることが、お母さんの一番の願いです。'];
  S.readLetter = async function () { await Win().message(['（母の手紙を開いた）'].concat(S.LETTER).concat(['——ミオ']), { name: '母の手紙' }); };
  S.letterOpenable = function () { var f = F(); return !!(f.kalion_reformed || f.sevran_fallen); };
  S.readLedger = async function () {
    var f = F(); var M = Win();
    var opts = ['帳簿を読む', '思い出す（回想）']; if (root.State.hasItem('s3121_letter')) opts.push('母の手紙を読む'); opts.push('閉じる');
    var a = await M.choice('母の帳簿', opts);
    if (opts[a] === '帳簿を読む') {
      await M.message(['均衡暦97年　春。麦の収穫、例年の一割増し。', '魔災復興税（第七区）——収穫の四割。借入の利息——二割。', '……支出先「第三復興事業」。所在地の欄は空白。十年分、同じ行が続いている。', '母の字は、最後まで几帳面だった。']);
      if (!root.State.hasItem('s3121_letter')) {
        if (!S.letterOpenable()) await M.message(['最後のページは、二枚が糊で固く貼り合わさっている。', '無理にはがすと破れてしまいそうだ。……帳簿に詳しい人なら、きれいにはがせるかもしれない。']);
        else { await M.message(['最後のページは、二枚が貼り合わさっている。', '王都で見た監査の手つきを思い出し、湿らせた布で、ゆっくりはがした。']); await S.obtainLetter(ctx(), false); }
      }
    } else if (opts[a] === '思い出す（回想）') await S.recall(ctx());
    else if (opts[a] === '母の手紙を読む') await S.readLetter();
  };
  S.readAmulet = async function () {
    var f = F(); var L = ['小さな布袋に、すり減った金属の板が縫い込まれている。', '板には、波の形の紋が刻まれている。'];
    if (f.forest_boss) L.push('……迷いの森の祠で見た「波形の剣」の紋章と、同じ形に見える。');
    if (f.s3121_old_earth_map) L.push('裏側に、見たことのない文字の列。天空の記録碑の古い文字に似ている。意味は、まだ分からない。');
    L.push('「これは、ずっと昔から家族が大切にしてきたもの。あなたなら、きっと意味が分かる日が来る」——母の声が、耳に残っている。');
    await Win().message(L);
  };
  S.obtainLetter = async function (c, withRiev) {
    var f = F(); if (f.s3121_mio_letter && root.State.hasItem('s3121_letter')) return false;
    if (!root.State.hasItem('s3121_ledger')) return false;
    await c.msg(['貼り合わさっていた紙のあいだから、折りたたまれた便箋が出てきた。', '税の記録ではない。……母の字で、宛名が書いてある。']);
    await root.Win.message(S.LETTER, { name: '母の手紙' });
    giveOnce('s3121_letter'); f.s3121_mio_letter = true;
    await c.msg(['母の手紙を手に入れた。（重要アイテム。どうぐから何度でも読み返せる）']);
    await c.say(hero(), ['……母さん。']);
    await c.msg(['復讐のために数えてきたものとは、別の理由で、涙が止まらなかった。']);
    await c.remark('elna', ['……正確な帳簿ね。一行も、ごまかしがない。', 'あなたのお母さんは、数字の向こうに、ちゃんと人を見ていた。'], 's3121_elna_letter');
    await c.remark('lina', ['……「人を憎むことだけに人生を使わないで」。', '答え、少し見つかった？ 急がなくていいよ。'], 's3121_lina_letter');
    root.State.autosave(); return true;
  };

  /* ---------- 回想（再閲覧）：旧セーブでも新しい物語の始まりを読める ---------- */
  S.SCENES = [
    { id: 'peace', title: '最後の平穏', need: null, lines: ['——アサナ村。カリオン徴収連邦の西のはずれ、森に囲まれた小さな農村。', '母ミオは帳簿をつけ、少ない稼ぎで村の暮らしを支えていた。「お金はね、たくさん持っていることが偉いんじゃないの。大切なのは、そのお金で誰の笑顔を守れるかなんだよ」', '父ラウルは村の自警団。ひびの入った木剣を直しながら言った。「強さというのは、誰かを傷つけるためのものじゃない。守るためのものだ」', '夕暮れの祭り。裕福ではない。それでも笑い声があり、暖かい食事があり、家族がいた。'] },
    { id: 'tax', title: '徴税官', need: null, lines: ['翌朝、政府の徴税官が兵士を連れて来た。「魔災復興税を引き上げる。納められなければ、土地と財産を没収する」', '母は村の帳簿を差し出した。十年分の税の一部が、どこにもない「第三復興事業」へ支出されていた。', '帳簿をのぞきこんだ徴税官は、顔色を変えた。……その夜、兵士たちは村から姿を消した。'] },
    { id: 'raid', title: '炎の夜', need: null, lines: ['森の向こうから、魔物の群れが押し寄せた。家々に火が放たれた。', '父は剣を手に、逃げ遅れた子どもたちの前に立った。「逃げろ！ お前には、まだ未来がある！」', '母は帳簿とお守りを手渡した。「これは、ずっと昔から家族が大切にしてきたもの。あなたなら、きっと意味が分かる日が来る」「お願い。生きて」', '振り返ると、燃え上がる村の中に、両親の姿が見えた。'] },
    { id: 'poyo', title: 'ポヨ村の夜', need: null, lines: ['幾日かの逃避行の末、たどり着いたのはポヨ村だった。', '眠れない夜、村はずれで、ひとりの老人——師匠ハケイが言った。「相場も人生も同じじゃ。負けないことより、負けたあとにどうするかが大切なんじゃよ」', '教会の僧侶リーナは問いかけた。「じゃあ、復讐が終わったら、どうするの？」'] },
    { id: 'letter', title: '母の手紙', need: 's3121_mio_letter', lines: null },
    { id: 'vision', title: '選ばれなかった未来', need: 's3121_vision_seen', lines: ['時の神殿の結晶に、襲われなかったアサナ村が映っていた。父も母も、笑っていた。', '「それは、あり得たかもしれない未来。でも、あなたが今ここまで歩いてきた道も、確かに存在する未来なの」'] },
    { id: 'camp', title: '天空の焚き火', need: 's3121_camp_letter', lines: ['雲海の上の野営地で、仲間たちと火を囲んだ。', 'ハケイの手紙。「どれほど強くなっても、誰かに助けを求めてよいのじゃよ」'] },
    { id: 'home', title: 'ただいま', need: 's3121_epilogue_done', lines: ['アサナ村の跡地には、小さな草花が芽を出していた。', '両親の墓の前で——「でもね……それより大切なものを、いっぱい見つけたんだ」', 'ポヨ村の村長は、いつもの場所で待っていた。「おかえり」'] }
  ];
  S.recall = async function (c) {
    var f = F(); var list = S.SCENES.filter(function (s) { return !s.need || f[s.need]; });
    var a = await root.Win.choice('どの記憶を思い出す？', list.map(function (s) { return s.title; }).concat(['やめる']));
    if (a < 0 || a >= list.length) return;
    var sc = list[a]; if (sc.id === 'letter') { await S.readLetter(); return; }
    await root.Win.message(['——回想：' + sc.title + '——'].concat(sc.lines));
  };
  // ポヨ村の村長の家のベッド：旧セーブの「任意の回想」と、新しいセーブの読み返し
  S.bedEvent = async function (c) {
    var f = F();
    if (S.inPrologue()) { await c.msg(['運び込まれたベッドだ。']); return; }
    await c.msg(['村長の家のベッド。三日のあいだ、ここで眠っていたという。']);
    var opts = f.s3121_recalled || f.s3121_new_prologue ? ['思い出す（回想）', 'やめる'] : ['ここへ来る前のことを、思い出してみる', 'やめる'];
    var a = await c.choice('', opts); if (a !== 0) return;
    if (!f.s3121_new_prologue && !f.s3121_recalled) {
      await c.msg(['目を閉じると、焦げたにおいがよみがえった。', '……失くしていた記憶が、少しずつ戻ってくる。']);
      for (var i = 0; i < 4; i++) await root.Win.message(['——回想：' + S.SCENES[i].title + '——'].concat(S.SCENES[i].lines));
      f.s3121_recalled = true;
      if (S.giveFamilyItems()) await c.msg(['……荷物の底に、見覚えのある帳簿と、小さなお守りが入っていた。', '母の帳簿と家族のお守りを手に入れた。（重要アイテム。どうぐから読める）']);
      if (S.letterOpenable() && !f.s3121_mio_letter) await c.msg(['（帳簿の最後のページは、どうぐから開ける）']);
      root.State.autosave(); return;
    }
    await S.recall(c);
  };

  /* =========================================================
     アサナ村のマップ（28×22）。平和・襲撃・廃墟・復興で同じ間取り
     ========================================================= */
  var AW = 28, AH = 22;
  function canvas(ch) { var g = []; for (var y = 0; y < AH; y++) { var r = []; for (var x = 0; x < AW; x++) r.push(ch); g.push(r); } return g; }
  function put(g, x, y, ch) { if (g[y] && x >= 0 && x < AW) g[y][x] = ch; }
  function box(g, x, y, w, h, ch) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) put(g, xx, yy, ch); }
  function asRows(g) { return g.map(function (r) { return r.join(''); }); }
  function asanaBase(state) {
    var g = canvas('.');
    box(g, 0, 0, AW, 1, 'f'); box(g, 0, AH - 1, AW, 1, 'f'); box(g, 0, 0, 1, AH, 'f'); box(g, AW - 1, 0, 1, AH, 'f');
    box(g, 1, 1, 26, 1, 'f'); put(g, 12, 1, '.'); put(g, 15, 1, '.');
    // 北の畑と柵
    box(g, 2, 2, 8, 3, state === 'raid' ? '8' : state === 'ruins' ? ',' : 'H'); box(g, 2, 5, 8, 1, 'x'); put(g, 6, 5, '.');
    // 道：南北の大通り（x=13,14）・東西の通り（y=11,12）・村長の家へ（y=6, x=21）・家から通りへ（x=6）
    box(g, 13, 6, 2, 15, 'r'); box(g, 3, 11, 22, 2, 'r'); box(g, 13, 6, 9, 1, 'r'); put(g, 21, 5, 'r'); put(g, 6, 10, 'r');
    // 南の門（平和・廃墟・復興は柵の門。襲撃の夜は開いている）
    put(g, 13, AH - 1, 'x'); put(g, 14, AH - 1, 'x');   // 外周は柵（脱出の場面は門の手前 y=20 で始まる）
    // 広場（東）と灯り
    box(g, 17, 14, 8, 5, '.'); [[17, 14], [24, 14], [17, 18], [24, 18]].forEach(function (p) { put(g, p[0], p[1], state === 'raid' ? 'i' : (state === 'ruins' ? '.' : 'y')); });
    if (state !== 'ruins') { put(g, 19, 14, 'e'); put(g, 22, 14, 'e'); }
    put(g, 23, 16, state === 'ruins' ? '9' : 'N');   // 稽古用の丸太（廃墟では焼けた残骸）
    // 井戸・市場・南の畑・立て札・木
    put(g, 10, 8, 'j');
    if (state === 'raid') { put(g, 17, 8, '9'); put(g, 18, 8, '9'); put(g, 19, 8, '9'); } else if (state === 'ruins') { put(g, 17, 8, 'z'); put(g, 19, 8, 'q'); } else { put(g, 17, 8, 'A'); put(g, 18, 8, 'A'); put(g, 19, 8, 'A'); put(g, 16, 8, 'q'); put(g, 20, 8, 'z'); }
    box(g, 16, 19, 9, 1, state === 'raid' ? '8' : state === 'ruins' ? ',' : 'H');
    put(g, 11, 19, 'S');
    [[2, 18], [8, 19], [25, 9], [25, 5], [11, 4], [2, 9], [25, 12]].forEach(function (p) { put(g, p[0], p[1], '6'); });
    put(g, 9, 9, 'a');
    // 建物の足もと（建物の定義があるマップでは bld_block に置き換わる。廃墟は焼け跡）
    var HOUSES = [[3, 7, 6, 3], [18, 2, 6, 3], [3, 14, 5, 3], [9, 14, 3, 2]];
    HOUSES.forEach(function (h) { box(g, h[0], h[1], h[2], h[3], state === 'ruins' ? '8' : 'B'); });
    if (state === 'raid') { [[2, 10], [9, 10], [2, 6], [17, 5], [24, 4], [8, 16], [12, 15], [16, 10]].forEach(function (p) { put(g, p[0], p[1], '8'); }); }
    if (state === 'ruins') {
      [[4, 8], [7, 7], [19, 3], [22, 2], [4, 15], [10, 14]].forEach(function (p) { put(g, p[0], p[1], '9'); });   // 焼けた残骸（通れない）
      [[5, 9], [21, 4], [6, 16]].forEach(function (p) { put(g, p[0], p[1], 'N'); });   // 倒れた梁
      put(g, 20, 16, 'I');   // 両親の墓（村の生き残りが積んだ石）
      [[19, 17], [21, 17], [18, 15], [7, 10], [16, 13]].forEach(function (p) { put(g, p[0], p[1], 'a'); });   // 焼け跡の間に咲く草花
    }
    if (state === 'rebuilt') { put(g, 20, 16, 'I'); [[19, 17], [21, 17]].forEach(function (p) { put(g, p[0], p[1], 'a'); }); }
    return asRows(g);
  }
  var BLD = {
    home: function (o) { return Object.assign({ id: 'as_home', type: 'house', name: '主人公の家', x: 3, y: 7, w: 6, h: 3, doorX: 3 }, o || {}); },
    chief: function (o) { return Object.assign({ id: 'as_chief', type: 'elder', name: 'アサナ村の村長の家', x: 18, y: 2, w: 6, h: 3, doorX: 3 }, o || {}); },
    neighbor: function (o) { return Object.assign({ id: 'as_neighbor', type: 'house', name: '隣のおばあさんの家', x: 3, y: 14, w: 5, h: 3, doorX: 2 }, o || {}); },
    store: function (o) { return Object.assign({ id: 'as_store', type: 'house', name: '村の共同の倉', x: 9, y: 14, w: 3, h: 2, doorX: 1 }, o || {}); }
  };
  function P(id, x, y, sprite, name, talk, o) { return Object.assign({ id: id, x: x, y: y, sprite: sprite, dir: 'down', wander: 0, noChatter: true, s3121: true, talk: talk, name3121: name }, o || {}); }
  function ph() { return S.phase(); }
  function inPh() { var a = arguments; return function () { var p = ph(); for (var i = 0; i < a.length; i++) if (a[i] === p) return true; return false; }; }

  /* ---------- 平和なアサナ村 ---------- */
  add({ id: 'asana_village', s3121: true, name: 'アサナ村', kind: 'town', bgm: 'town', fallback: 'grass', style: 'wood', rows: asanaBase('peace'),
    scriptEntry: [6, 10, '新規ゲームのプロローグ（家の中から出る）'],
    buildings: [BLD.home({ interior: 'asana_home', entry: { x: 5, y: 7 } }), BLD.chief(), BLD.neighbor(), BLD.store()],
    warps: [],
    npcs: [
      P('as_merchant', 18, 9, 'merchant', '市場のおじさん', async function (c) { await S.market(c); }, { dir: 'down' }),
      P('as_raul', 22, 16, 'guard', 'ラウル', async function (c) { await S.raulTalk(c); }, { dir: 'left', showWhen: inPh('morning', 'lesson', 'tax', 'after_tax') }),
      P('as_mio_out', 19, 13, 'villager_f', 'ミオ', async function (c) { await S.mioOut(c); }, { dir: 'down', showWhen: function () { return false; } }),   // 祭り・徴税の場面で台本が出し入れする
      P('as_child', 11, 9, 'child', '村の子ども', async function (c) { await S.villager(c, 'child'); }, { wander: 1 }),
      P('as_child2', 9, 10, 'child', '村の子ども', async function (c) { await S.villager(c, 'child2'); }, { dir: 'right' }),
      P('as_farmer', 6, 6, 'villager_m', '畑の人', async function (c) { await S.villager(c, 'farmer'); }, { wander: 1 }),
      P('as_oldman', 16, 7, 'elder', '物知りのおじいさん', async function (c) { await S.villager(c, 'oldman'); }, { dir: 'down' }),
      P('as_peddler', 21, 9, 'villager_m', '旅の行商人', async function (c) { await S.villager(c, 'peddler'); }, { dir: 'left', showWhen: inPh('morning', 'lesson', 'festival') }),
      P('as_pilgrim', 15, 16, 'priest', '波形教の巡礼者', async function (c) { await S.villager(c, 'pilgrim'); }, { dir: 'right', showWhen: inPh('lesson', 'festival', 'night1') }),
      P('as_granny', 6, 17, 'villager_f', '隣のおばあさん', async function (c) { await S.villager(c, 'granny'); }, { dir: 'down' }),
      P('as_chief', 20, 15, 'elder', 'アサナ村の村長', async function (c) { await S.chiefTalk(c); }, { dir: 'down', showWhen: inPh('festival', 'night1', 'tax', 'after_tax') }),
      P('as_musician', 22, 17, 'villager_m', '笛吹き', async function (c) { await S.villager(c, 'musician'); }, { dir: 'left', showWhen: inPh('festival', 'night1') }),
      P('as_collector', 20, 13, 'scholar', '徴税官', async function (c) { await S.collectorTalk(c); }, { dir: 'down', showWhen: inPh('tax') }),
      P('as_soldier1', 19, 12, 'guard', '連邦兵', async function (c) { await c.say('連邦兵', ['下がれ。徴税官殿の邪魔をするな。']); }, { dir: 'down', showWhen: inPh('tax') }),
      P('as_soldier2', 21, 12, 'guard', '連邦兵', async function (c) { await c.say('連邦兵', ['……命令だ。悪く思うな。']); }, { dir: 'down', showWhen: inPh('tax') })
    ],
    events: [
      { x: 10, y: 8, type: 'script', solid: true, run: async function (c) { await c.msg(['村の井戸。滑車は、錆びない銀色の金属の輪でできている。', '「旧時代」の遺物だと、おじいさんは言っていた。千年もつ鉄なんて、今は誰も作れないのだそうだ。']); } },
      { x: 11, y: 19, type: 'script', solid: true, run: async function (c) { await c.msg(['【立て札】アサナ村', '北：畑　東：市場・広場・村長の家　西：住まい', '（このプロローグを飛ばしたいときは、ここで選べる）']); await S.offerSkip(c); } },
      { x: 4, y: 3, type: 'script', solid: false, run: async function (c) { await c.msg(['畑のかかしは、古い機械の腕でできている。', '指の関節が、風が吹くたびにかたかた鳴る。'] .concat(ph() === 'after_tax' ? ['……森の入口に、見慣れない黒い金属の杭が刺さっている。兵士が帰り際に埋めていったものだ。', '杭の上で、小さな赤い光が点滅している。'] : [])); } }
    ],
    chests: [] });

  /* ---------- 家の中 ---------- */
  add({ id: 'asana_home', s3121: true, name: 'アサナ村・家', kind: 'interior', bgm: 'town', rows: [
    '############',
    '#E__K__q__E#',
    '#__________#',
    '#__t__t____#',
    '#__________#',
    '#_______zz_#',
    '#__________#',
    '#__________#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'asana_village', tx: 6, ty: 10 }],
    npcs: [P('as_mio', 4, 4, 'villager_f', 'ミオ', async function (c) { await S.mioHome(c); }, { dir: 'down', showWhen: inPh('morning', 'lesson', 'night1', 'after_tax') })],
    events: [
      { x: 1, y: 1, type: 'script', solid: true, run: async function (c) { await S.bed(c); } },
      { x: 6, y: 3, type: 'script', solid: true, run: async function (c) { await c.msg(['母の帳簿が置いてある。几帳面な字で、村の収穫と税の記録が並んでいる。'].concat(F().s3121_ledger_seen ? ['「お金はね、たくさん持っていることが偉いんじゃないの」——母の口ぐせだ。'] : [])); } },
      { x: 3, y: 3, type: 'script', solid: true, run: async function (c) { await c.msg(['食卓のまな板は、つるつるした透明な板。昔の「画面」とかいう道具の破片らしい。', '割れにくくて、包丁の刃も傷まない。母のお気に入りだ。']); } },
      { x: 4, y: 1, type: 'script', solid: true, run: async function (c) { await c.msg(['家の本棚。父の古い剣術書と、母の計算の本。', 'トレード財団の巡回文庫から借りた『はじめての相場盤』もある。「勝つより先に、負けを小さく」と書いてある。']); await S.offerSkip(c); } }
    ] });

  /* ---------- 襲撃の夜 ---------- */
  var FIRE = [[6, 8, 1.4, 2.3], [4, 7, 1, 2.0], [21, 3, 1.4, 2.3], [19, 2, 1, 2.0], [5, 15, 1.2, 2.0], [10, 14, 1, 1.6], [18, 8, 0.9, 0.7], [4, 3, 0.8, 0.2], [8, 3, 0.8, 0.2], [20, 19, 0.7, 0.2], [2, 10, 0.6, 0.1], [16, 10, 0.6, 0.1]];   // [x, y, 大きさ, 高さ]：家の炎は屋根の上
  add({ id: 'asana_raid', s3121: true, name: 'アサナ村（襲撃の夜）', kind: 'town', bgm: 'boss_area', fallback: 'grass', style: 'wood', rows: asanaBase('raid'),
    scriptEntry: [6, 10, '新規ゲームのプロローグ（夜の襲撃）'],
    tint: 'rgba(120,30,10,0.32)',   // 2D版：炎に照らされた夜（js/rpg/world.js の World.tint）
    mood3d: { sun: 0xff6a30, si: 0.5, hemi: 0x8a4a5a, hi: 0.42, fog: 0x3a1610, top: 0x12060c, hor: 0x9a3010, win: 2.8, exp: 1.02, fogD: 0.022 },   // 3D版：赤い夜空と煙の霧（engine/LightingManager.js の setMood）
    fx3d: FIRE.map(function (f) { return { kind: 'fire', x: f[0], y: f[1], s: f[2], h: f[3] }; }).concat([[6, 8], [21, 3], [5, 15], [10, 14], [18, 8], [13, 4]].map(function (p) { return { kind: 'smoke', x: p[0], y: p[1] }; })),
    buildings: [BLD.home({ name: '燃える家' }), BLD.chief({ name: '燃える村長の家' }), BLD.neighbor({ name: '燃える家' }), BLD.store({ name: '燃える倉' })],
    warps: [],
    npcs: [
      P('ar_raul', 21, 16, 'guard', 'ラウル', async function (c) { await S.raidFather(c); }, { dir: 'right', showWhen: inPh('raid', 'escape') }),
      P('ar_mio', 19, 17, 'villager_f', 'ミオ', async function (c) { await c.say('ミオ', ['南へ！ 早く！']); }, { dir: 'left', hidden: true, showWhen: function () { return false; } }),
      P('ar_beast', 22, 16, 'shadow', '黒い影の魔物', async function (c) { await c.msg(['巨大な黒い影が、父の前に立ちはだかっている。']); }, { dir: 'left', creature3d: { model: 'mon_demon', color: '#2a1a2e', accent: '#ff5a2a', scale: 1.6 } }),
      P('ar_shadow1', 13, 6, 'shadow', '黒い影の魔物', async function (c) { await S.shadowTalk(c); }, { creature3d: { model: 'mon_beast', color: '#241a26', accent: '#ff6a2a', scale: 1.1 } }),
      P('ar_shadow2', 14, 6, 'shadow', '黒い影の魔物', async function (c) { await S.shadowTalk(c); }, { creature3d: { model: 'mon_beast', color: '#2a1a22', accent: '#ff6a2a', scale: 1.0 } }),
      P('ar_shadow3', 3, 12, 'shadow', '黒い影の魔物', async function (c) { await S.shadowTalk(c); }, { dir: 'right', creature3d: { model: 'mon_beast', color: '#261a2a', accent: '#ff6a2a', scale: 1.0 } }),
      P('ar_child', 18, 16, 'child', '逃げ遅れた子ども', async function (c) { await c.say('子ども', ['こわいよ……！']); }, { dir: 'right', showWhen: inPh('raid') }),
      P('ar_villager1', 10, 12, 'villager_m', '村の人', async function (c) { await c.say('村の人', ['南だ！ 南の避難路へ逃げろ！', 'ラウルが広場で魔物を食い止めてる……！']); }, { wander: 1 }),
      P('ar_villager2', 15, 18, 'villager_f', '村の人', async function (c) { await c.say('村の人', ['火が、火が……！ 子どもたちを南へ！']); }, { wander: 1 }),
      P('ar_granny', 8, 17, 'villager_f', '隣のおばあさん', async function (c) { await c.say('隣のおばあさん', ['あたしは大丈夫。ミオちゃんが肩を貸してくれた。', 'あんたはお父さんのところへ……いや、逃げるんだよ！']); }, { dir: 'right' })
    ],
    events: [
      { x: 11, y: 19, type: 'script', solid: true, run: async function (c) { await c.msg(['焦げた立て札。「アサナ村」の文字が、炎に照らされている。']); await S.offerSkip(c); } },
      { x: 13, y: 20, type: 'script', solid: false, run: async function (c) { await S.escapeGate(c); } },
      { x: 14, y: 20, type: 'script', solid: false, run: async function (c) { await S.escapeGate(c); } }
    ],
    chests: [] });

  /* ---------- 廃墟（第6章の記録で場所が分かる）と復興（エンディングのあと） ---------- */
  function ruinsDef(rebuilt) {
    var id = rebuilt ? 'asana_rebuilt' : 'asana_ruins';
    var def = { id: id, s3121: true, name: rebuilt ? 'アサナ村（復興）' : 'アサナ村跡', kind: 'town', bgm: rebuilt ? 'town' : 'church', fallback: 'grass', style: 'wood', rows: asanaBase(rebuilt ? 'rebuilt' : 'ruins'),
      warps: [13, 14].map(function (x) { return { x: x, y: AH - 2, to: 'world_kalion', tx: 24, ty: 67, name: '村の外へ' }; }),
      buildings: rebuilt ? [BLD.home({ name: '建て直した家' }), BLD.chief({ name: '新しい集会所' }), BLD.neighbor({ name: '建て直した家' }), BLD.store({ name: '共同の倉' })] : [],
      npcs: [], events: [], chests: [] };
    if (rebuilt) def.scriptEntry = [13, 19, 'アサナ村跡の入口（エンディングのあとは復興した村へ読み替える：Story3121.redirect）'];
    def.events.push({ x: 20, y: 16, type: 'script', solid: true, run: async function (c) { await S.grave(c); } });
    if (!rebuilt) {
      def.events.push({ x: 5, y: 10, type: 'script', solid: false, run: async function (c) { await c.msg(['家のあった場所。焼けた柱が、地面から突き出している。', '台所のあたりに、割れずに残った透明な板が落ちていた。母のまな板だ。']); } });
      def.events.push({ x: 10, y: 8, type: 'script', solid: true, run: async function (c) { await c.msg(['井戸だけが、あの日のまま残っている。銀色の滑車が、風で小さく回った。']); } });
      def.npcs.push(P('ar_survivor', 15, 15, 'villager_f', '戻ってきた村の人', async function (c) { await S.ruinsSurvivor(c); }, { dir: 'left', showWhen: function () { return !!F().s3121_survivor_met; } }));
    } else {
      def.npcs.push(P('ab_child', 16, 13, 'child', '村の子ども', async function (c) { await c.say('村の子ども', ['ねえ！ 今日はみんなでご飯を食べようよ！']); }, { wander: 1 }));
      def.npcs.push(P('ab_survivor', 15, 15, 'villager_f', '村の人', async function (c) { await c.say('村の人', ['家は小さくなったけど、帳簿は前より大きくなったよ。', '税も、寄付も、全部ここに書いて、広場に貼り出すの。ミオさんのやり方でね。']); }, { dir: 'down' }));
      def.npcs.push(P('ab_builder', 7, 11, 'villager_m', '大工', async function (c) { await c.say('大工', ['トレード財団の復興基金と、村のみんなの積み立て。半分ずつで建てた。', '使い道は、村の会議で決めた。……もめたけどな。']); }, { wander: 1 }));
      def.npcs.push(P('ab_granny', 6, 17, 'villager_f', '隣のおばあさん', async function (c) { await c.say('隣のおばあさん', ['生きててくれたんだねえ……。', 'ミオちゃんとラウルさんの墓には、毎朝、花を替えてるよ。']); }, { dir: 'down' }));
    }
    return add(def);
  }
  ruinsDef(false); ruinsDef(true);
  // 復興のあとは、アサナ村跡への出入口を復興した村へ読み替える（js/rpg/world.js の World.doWarp が root.redirectWarp を呼ぶ）
  var prevRedirect = root.redirectWarp;
  root.redirectWarp = function (w, m, d) {
    var r = typeof prevRedirect === 'function' ? prevRedirect(w, m, d) : null; var ww = r || w;
    if (ww && ww.to === 'asana_ruins' && d && d.flags && d.flags.s3121_asana_rebuilt) return Object.assign({}, ww, { to: 'asana_rebuilt' });
    return r;
  };

  /* =========================================================
     プロローグの台本
     ========================================================= */
  QUESTS.s3121_prologue = { title: '炎に消えた故郷', side: true, desc: 'アサナ村の最後の二日間と、ポヨ村への漂着（新しいプロローグ）。', reward: {}, story3121: true,
    steps: [['s3121_bought', '母ミオに頼まれて、東の市場で食べ物を買う'], ['s3121_ledger_seen', '家に戻って、母ミオに買ってきた物を渡す'], ['s3121_lesson_done', '東の広場で、父ラウルの木剣の稽古を受ける'],
      ['s3121_festival_done', '夕暮れの広場の祭りで、村長と話す'], ['s3121_slept1', '家に帰って眠る'], ['s3121_tax_done', '翌朝。広場に徴税官が来ている'], ['s3121_slept2', '家に帰って休む'],
      ['s3121_raid_father', '燃える村の広場へ。父ラウルのもとへ急ぐ'], ['s3121_escaped', '南の避難路から村の外へ逃げる'], ['s3121_woke', '（ポヨ村）村長の家で目を覚ます'], ['s3121_hakei_night', '眠れない夜。村の西のはずれ（柵のそば）へ']] };

  // タイトルの「はじめから」：State.newGame のあとに呼ぶ。戻り値 null＝従来どおりポヨ村から（呼び出し側が従来の序章の文章を出す）
  S.beginNewGame = async function () {
    var M = root.Win;
    var a = await M.choice('物語の始め方を選んでください', ['アサナ村から始める（新しいプロローグ。2日間の村の暮らしと、炎の夜）', 'ポヨ村から始める（プロローグを飛ばす。あらすじは後で読める）']);
    var d = D(); d.flags.s3121_new_prologue = true;
    if (a !== 0) {
      d.flags.s3121_prologue_skipped = true; S.setPhase('done'); S.giveFamilyItems();
      await M.message(['——あらすじ：炎に消えた故郷——'].concat(S.SCENES[0].lines, S.SCENES[1].lines, S.SCENES[2].lines, ['（母の帳簿と家族のお守りは「どうぐ」の重要アイテムにある。ポヨ村の村長の家のベッドから、いつでも回想を読み返せる）']));
      return null;
    }
    // 西暦2052年の記録の断片（意味はまだ説明しない）→ 失われた天秤（従来の序章）→ 西暦3121年のアサナ村
    await M.message(['——記録断片——', '「……管制網、応答なし。北の観測所、磁場の値が振り切れています」', '「停戦の交渉は」「回線が……防衛AIどうしが、互いを敵と判断して——」', '（ひどい雑音）', '「……記録を残せ。誰かが、読めるように」', '——日付：2052年。この記録の意味を知る者は、もういない。']);
    await M.message(['——プロローグ：失われた天秤——', '数百年前、世界を豊かにするため、魔導士たちは「均衡のクリスタル」を完成させた。人々の約束と資源の分配を記録し、争いを減らすための結晶だった。', 'だが大災害が起こり、世界の一部は海に沈み、多くの記録が失われた。災害の最後に、一人の魔導士が結晶へ願いを封じ込めた。', '「もう二度と、誰にも大切なものを失わせないでほしい」', 'その願いが、やがて世界を変える。']);
    await M.message(['——西暦3121年。人々の暦では、均衡暦97年。', '畑を耕し、剣を打ち、掘り出した古い機械を直して使う村や王国。崩れなかった古い施設で、機械と共に暮らし続ける人々。空の裂け目の向こうから流れ着いた者たち。', '相場の波を読むことが、遊びであり、学びであり、生きる知恵でもある時代。', '——アサナ村。カリオン徴収連邦の西のはずれ、森に囲まれた小さな農村。']);
    d.pos = { map: 'asana_home', x: 2, y: 2, dir: 'down' }; d.visited = {}; d.timeOfDay = 0.3;
    S.setPhase('morning'); root.Events.questStart('s3121_prologue'); d.navTrack = 's3121_prologue';
    return { after: S.opening };
  };
  S.opening = async function () {
    var w = W(); w.busy = true;
    try {
      await sleep(400);
      await root.Win.message(['……窓から、朝の光が差しこんでいる。'], {});
      await ctx().say('ミオ', ['おはよう、' + hero() + '。よく眠れた？', '市場でパンと豆を買ってきてくれる？ はい、お金。……ちょっと足りないかもしれないけど。']);
      await ctx().msg(['母から銅貨を何枚か受け取った。（話の中だけのお金。所持金は変わらない）', '（市場は家を出て東。目的地は画面の案内と、メニューの「クエスト」で確かめられる）']);
    } catch (e) { root.Engine.onError(e); }
    w.busy = false; root.State.autosave();
  };
  S.offerSkip = async function (c) {
    if (!S.inPrologue() || S.phase() === 'poyo_wake' || S.phase() === 'poyo_night') return;
    var a = await c.choice('プロローグの残りを、あらすじで読んで飛ばしますか？（ポヨ村から始まる。村長の報酬・リーナの加入はこれまでどおり）', ['続きを遊ぶ', 'あらすじにして飛ばす']);
    if (a === 1) await S.skipToPoyo(c);
  };
  S.skipToPoyo = async function (c) {
    var f = F(); var p = S.phase(); var L = ['——あらすじ——'];
    if (['morning', 'lesson', 'festival', 'night1'].indexOf(p) >= 0) L = L.concat(S.SCENES[0].lines);
    if (['morning', 'lesson', 'festival', 'night1', 'tax'].indexOf(p) >= 0) L = L.concat(S.SCENES[1].lines);
    L = L.concat(S.SCENES[2].lines, ['……幾日かの逃避行の末、力尽きて倒れた。目を覚ますと、そこはポヨ村だった。']);
    await c.msg(L);
    ['s3121_bought', 's3121_ledger_seen', 's3121_lesson_done', 's3121_festival_done', 's3121_slept1', 's3121_tax_done', 's3121_slept2', 's3121_raid_father', 's3121_escaped', 's3121_woke', 's3121_hakei_night'].forEach(function (k) { f[k] = true; });
    f.s3121_prologue_skipped = true; S.giveFamilyItems();
    await finishPrologueQuest();
    S.setPhase('poyo_day'); setTime(0.3); S.cine(null); await S.veil(0, '#000', 10);
    place('poyo_elder_house', 6, 2, 'down');
    await c.msg(['（ポヨ村の村長の家。村長に話しかけよう）']);
  };
  async function finishPrologueQuest() {
    var d = D(); if (d.navTrack === 's3121_prologue') { if (root.Nav && root.Nav.track) root.Nav.track(null); else d.navTrack = null; }
    if (d.quests.s3121_prologue && d.quests.s3121_prologue.state !== 'done') { d.quests.s3121_prologue = { state: 'done', at: Date.now() }; root.Win.toast('プロローグ「炎に消えた故郷」　おわり'); }
  }

  /* ---------- 第1幕：最後の平穏 ---------- */
  S.market = async function (c) {
    var f = F(); var p = ph();
    if (p === 'morning' && !f.s3121_bought) {
      await c.say('市場のおじさん', ['いらっしゃい。……パンと豆かい？ ごめんよ、また値上がりしたんだ。', '麦はたくさん採れたのに、粉にする前に税で持っていかれる。店に並ぶ分が少ないから、値が上がる。']);
      var a = await c.choice('銅貨は少ない。何を買う？', ['パンを買う', '豆を買う', 'パンと豆を少しずつ']);
      await c.msg([['パンを一つ買えた。豆までは手が届かなかった。', '豆をひとすくい買えた。パンは、また今度。', 'パンを半分と、豆をひとつまみだけ。おじさんが、そっと一つおまけしてくれた。'][a] || 'パンを一つ買えた。']);
      await c.say('市場のおじさん', ['お母さんによろしくな。ミオさんの帳簿がなきゃ、この村はとっくに干上がってる。']);
      f.s3121_bought = true; return;
    }
    if (p === 'festival' || p === 'night1') { await c.say('市場のおじさん', ['今夜は店じまい！ 祭りの日くらい、値札のことは忘れようや。']); return; }
    if (p === 'tax' || p === 'after_tax') { await c.say('市場のおじさん', ['税が上がったら、もう店を開けていられない。', '……ミオさん、大丈夫かね。あの役人の顔、見たかい。']); return; }
    await c.say('市場のおじさん', ['気をつけて帰りな。']);
  };
  S.mioHome = async function (c) {
    var f = F(); var p = ph();
    if (p === 'morning' && !f.s3121_bought) { await c.say('ミオ', ['市場は家を出て東よ。気をつけてね。']); return; }
    if (p === 'morning' && f.s3121_bought && !f.s3121_ledger_seen) {
      await c.say('ミオ', ['おかえり。ありがとう。……やっぱり、これだけしか買えなかったのね。']);
      await c.say(hero(), ['どうしてこんなに高いの？']);
      await c.msg(['母は小さな帳簿を開いた。几帳面な字で、村の収穫と税の記録がびっしり並んでいる。']);
      await c.say('ミオ', ['作物はたくさん採れたのに、税金と借金で全部持っていかれてしまったの。だから村にお金が残らないのよ。']);
      await c.say('ミオ', ['お金はね、たくさん持っていることが偉いんじゃないの。', '大切なのは、そのお金で誰の笑顔を守れるかなんだよ。']);
      await c.say('ミオ', ['さ、お父さんが広場で待ってるわ。木剣の稽古の約束、してたでしょう？']);
      f.s3121_ledger_seen = true; S.setPhase('lesson'); return;
    }
    if (p === 'lesson') { await c.say('ミオ', ['お父さんは東の広場よ。今夜はお祭りだから、早めに帰ってらっしゃい。']); return; }
    if (p === 'night1') { await c.say('ミオ', ['楽しかったね。……さ、もう寝なさい。明日も早いわよ。']); return; }
    if (p === 'after_tax') { await c.say('ミオ', ['大丈夫。間違ったことを、間違っていると言っただけよ。', '明日、王都の監察へ手紙を出すわ。……今日はもう休みなさい。']); return; }
    await c.say('ミオ', ['なあに？']);
  };
  S.raulTalk = async function (c) {
    var f = F(); var p = ph();
    if (p === 'morning') { await c.say('ラウル', ['おう、お使いか。母さんを待たせるなよ。', '帰ったら、稽古だ。']); return; }
    if (p === 'lesson' && !f.s3121_lesson_done) { await S.lesson(c); return; }
    if (p === 'tax' || p === 'after_tax') { await c.say('ラウル', ['……ミオは正しいことをした。', 'だが、相手は役人だ。今夜は戸締まりをしっかりしておけ。']); return; }
    await c.say('ラウル', ['どうした。']);
  };
  S.lesson = async function (c) {
    var f = F();
    await c.msg(['父は、ひびの入った木剣に細い紐を巻いて直していた。']);
    await c.say('ラウル', ['来たか。……強くなりたいか？']);
    await c.choice('', ['うなずく', '……わからない']);
    await c.msg(['父は少し笑った。']);
    await c.say('ラウル', ['じゃあ最初に覚えておけ。', '強さというのは、誰かを傷つけるためのものじゃない。守るためのものだ。']);
    var good = 0;
    await c.say('ラウル', ['構えてみろ。……よし。まず、俺に打ち込んでこい！']);
    var r1 = await c.choice('どう打ち込む？', ['正面から思いきり', '父の構えをよく見てから', '横へ回り込む']);
    await c.say('ラウル', [['勢いはいい。だが、それじゃ読まれる。', 'いい目だ。相手を見てから動く。それが一番だ。', '回り込むのは悪くない。足もとに気をつけろ。'][r1]]); if (r1 === 1) good++;
    await c.say('ラウル', ['今度は俺が打つ。……お前の後ろに、守りたい人がいると思え。']);
    var r2 = await c.choice('父の木剣が来る！', ['よける', '受け止める', '打ち返す']);
    await c.say('ラウル', [['よけたら、後ろの人に当たるぞ。', 'そうだ。守るときは、一歩も引かずに受ける。', '打ち返すのは、相手の剣を止めてからだ。'][r2]]); if (r2 === 1) good++;
    await c.say('ラウル', ['最後だ。どうしても勝てない相手だと分かったら？']);
    var r3 = await c.choice('', ['それでも戦う', 'みんなを連れて逃げる', '助けを呼ぶ']);
    if (r3 === 0) await c.say('ラウル', ['……その気持ちは、嫌いじゃない。', 'だが覚えておけ。逃げるのも、助けを呼ぶのも、守るための強さだ。']);
    else { good++; await c.say('ラウル', ['そうだ。逃げるのも、助けを呼ぶのも、守るための強さだ。', '負けないことより、生きて次につなぐことの方が、ずっと大事なときがある。']); }
    await c.msg(['（稽古の手ごたえ：' + good + '/3）']);
    await c.say(hero(), ['いつか強くなって、この村を豊かにする。']);
    await c.say('ラウル', ['ああ。期待してる。……さ、日が暮れる。今夜は祭りだぞ。']);
    f.s3121_lesson_done = true; S.setPhase('festival'); setTime(0.73); refresh();
    await c.msg(['——夕暮れ。広場に灯りがともり、笛の音が聞こえてくる。']);
  };
  S.chiefTalk = async function (c) {
    var f = F(); var p = ph();
    if (p === 'festival' && !f.s3121_festival_done) {
      S.cine({ x: 20, y: 15, dist: 12, pitch: 52 });
      await c.say('アサナ村の村長', ['おお、来たか。みんな、今年もよく働いた！', '税は重い。だが今夜だけは笑おう。笑う分の税までは、取られやせん。']);
      await c.msg(['広場に笑い声が広がった。子どもたちが走りまわり、鍋から湯気が立つ。']);
      S.show('as_mio_out', true, 19, 15, 'right');
      await c.say('ミオ', ['ほら、' + hero() + '。熱いから気をつけて。']);
      await c.say('ラウル', ['今日の稽古の話をしたら、村長が笑ってた。「ラウルの若いころより筋がいい」とさ。']);
      await c.msg(['決して裕福ではない。', 'それでも笑い声があり、暖かい食事があり、家族がいる。', '……それで、十分に幸せだった。']);
      S.cine(null); f.s3121_festival_done = true; S.setPhase('night1'); refresh();
      await c.msg(['（夜も更けた。家に帰って眠ろう）']); return;
    }
    if (p === 'night1') { await c.say('アサナ村の村長', ['いい祭りじゃった。……さあ、帰って寝なさい。']); return; }
    if (p === 'tax') { await S.taxScene(c); return; }
    if (p === 'after_tax') { await c.say('アサナ村の村長', ['ミオの帳簿……あれは、この村の十年そのものじゃ。', '王都の監察が動いてくれればよいが……。']); return; }
  };
  S.mioOut = async function (c) {
    var p = ph();
    if (p === 'festival') { await c.say('ミオ', ['村長さんにご挨拶してきなさい。']); return; }
    if (p === 'tax') { await S.taxScene(c); return; }
    await c.say('ミオ', ['先に帰っていて。村長さんと、手紙の文面を相談してから戻るわ。']);
  };
  S.VILLAGER = {
    child: { morning: ['見て見て！ 木の実の相場ごっこ。', '勝ち負けじゃなくて、「なんでその手にしたか」を言えた方が勝ちなんだよ。'], festival: ['お祭りの日は、相場盤の大会があるんだ！ 賭けるのは木の実だけ。本物のお金はだめって、お母さんが。'], tax: ['あの人たち、だれ？ こわい顔してる……。'] },
    child2: { morning: ['トレード財団の巡回の先生が、年に一回来るの。', '「勝つより先に、負けを小さく」って、何回も言ってた。'], festival: ['今日は見送りが三回できた！ 先生にほめられるやつ！'] },
    farmer: { morning: ['今年の麦は豊作だ。……豊作なのに、冬を越せるか心配するなんて、おかしな話だよな。'], festival: ['今夜くらいは畑のことを忘れるさ。'], tax: ['これ以上取られたら……。'] },
    oldman: { morning: ['この村の井戸の滑車、あれは「旧時代」の金属じゃ。錆びずに千年もつ鉄なんぞ、今は誰も作れん。', 'わしのじいさんのじいさんの、そのまたじいさんの頃から、掘り出しては使っておる。'], festival: ['祭りの灯りの笠も、旧時代の透明な板じゃよ。割れんし、光をよく通す。'], tax: ['あの役人の目……嫌な予感がする。'] },
    peddler: { morning: ['相場都市トレディアの闘技場の大会、見たことあるかい？', '勝った負けたより、損切りの速さで観客がわくんだ。妙な時代だろ？'], festival: ['祭りはいいね。どこの町も、祭りの夜だけは値札を裏返す。'] },
    pilgrim: { lesson: ['波形教の巡礼の者です。今夜の祭りで、祝詞を唱えさせてもらいます。', '「波は支配するものではなく、観察し、選び、受け入れるもの」——私たちの教えです。'], festival: ['見送る勇気。損失を認める強さ。……祝詞は、それだけです。短いでしょう？', 'トレード財団とは、元は同じ学びの場から分かれたと伝わります。今は別々の道を歩いていますが。'] },
    granny: { morning: ['ミオちゃんにはいつも助けてもらってるよ。帳簿のつけ方を、村の娘たちに教えてくれてね。'], festival: ['祭りの夜は足が痛いけど、行かなきゃ損だよ。'], tax: ['……昔も、こういう役人が来たことがある。その村は、もう地図にないって聞いたよ。'] },
    musician: { festival: ['この笛は、旧時代の細い管でできてる。何千年も前の音がするって、じいさんは言ってた。……まあ、誰も確かめようがないけどね。'] }
  };
  S.villager = async function (c, who) {
    var p = ph(); var T = S.VILLAGER[who] || {}; var key = { night1: 'festival', after_tax: 'tax', lesson: 'morning' }[p] || p;
    var lines = T[p] || T[key] || T.morning || T.festival || ['……。'];
    var npcName = { child: '村の子ども', child2: '村の子ども', farmer: '畑の人', oldman: '物知りのおじいさん', peddler: '旅の行商人', pilgrim: '波形教の巡礼者', granny: '隣のおばあさん', musician: '笛吹き' }[who];
    await c.say(npcName, lines);
  };
  S.bed = async function (c) {
    var f = F(); var p = ph();
    if (p === 'night1') {
      await c.msg(['……今日は、いい一日だった。', '目を閉じると、まだ笛の音が聞こえる気がした。']);
      await S.veil(1, '#000', 700); f.s3121_slept1 = true; setTime(0.3); S.setPhase('tax'); refresh(); await sleep(300); await S.veil(0, '#000', 700);
      await c.msg(['——翌朝。', '外が騒がしい。……馬のいななきと、鎧の音。']);
      await c.say('ミオ', ['兵隊さん……？ ' + hero() + '、広場の様子を見てきてくれる？ 私もすぐ行くわ。']);
      return;
    }
    if (p === 'after_tax') {
      await c.msg(['……眠れない。窓の外の森が、いつもより暗く見える。']);
      await S.veil(1, '#000', 900);
      await c.msg(['その夜、政府の兵士たちは村から姿を消した。', 'そして、森の向こうから、不気味な音が響き始める——']);
      f.s3121_slept2 = true; S.setPhase('raid'); setTime(0.02); S.cine(null);
      place('asana_raid', 6, 10, 'down');
      await sleep(600); await S.veil(0, '#000', 500);
      await S.flash('#ffb070');
      await c.msg(['轟音で飛び起きた。窓の外が赤い。', '外へ飛び出すと——村が、燃えていた。']);
      S.cine({ x: 13, y: 9, dist: 26, pitch: 50 }); await sleep(900); S.cine(null);
      await c.say('村の人', ['魔物だ！ 森から魔物が！', 'ラウルが広場で食い止めてる！ 南だ、南の避難路へ逃げろ！']);
      await c.msg(['（広場の父のもとへ急ごう。黒い影の魔物には近づけない）']);
      return;
    }
    await c.msg(['ベッドだ。まだ眠る時間じゃない。']);
  };

  /* ---------- 第2幕：徴税官 ---------- */
  S.collectorTalk = async function (c) { await S.taxScene(c); };
  S.taxScene = async function (c) {
    var f = F(); if (f.s3121_tax_done) return;
    f.s3121_tax_done = true;   // 先に立てる（途中でページを閉じても、もう一度最初から見られるよう最後に戻すのではなく、二度目は短い会話にしない＝見直しは回想で）
    S.cine({ x: 20, y: 13, dist: 15, pitch: 40 });
    await c.msg(['村の広場に、政府の徴税官が兵士を連れて立っていた。村人たちが不安そうに集まっている。']);
    await c.say('徴税官', ['魔災復興税を引き上げる。', '納められなければ、土地と財産を没収する。']);
    await c.say('アサナ村の村長', ['これ以上奪われたら、冬を越せる者がいなくなります！']);
    await c.say('徴税官', ['国家を守るための負担だ。拒否は許されない。']);
    S.show('as_mio_out', true, 18, 16, 'up'); await S.walk('as_mio_out', [[18, 15], [18, 14]], 300);
    await c.msg(['母ミオが、人垣の前に出た。手には、あの帳簿がある。']);
    await c.say('ミオ', ['待ってください。この村がこれまでに納めた税の記録です。', '十年分。その一部が「第三復興事業」に支出されたことになっています。', 'でも、そんな事業はどこにもありません。この近くで橋が架けられたことも、堤防が直されたことも、一度もない。']);
    S.cine({ x: 20, y: 13, dist: 10, pitch: 46 });
    await c.msg(['徴税官は帳簿をのぞきこんだ瞬間、顔色を変えた。']);
    await c.say('徴税官', ['……その帳簿を、どこで。', '…………今日のところは引き上げる。上に報告する。']);
    await c.say('ミオ', ['報告してください。私も、王都の監察に訴えます。']);
    S.cine(null);
    await c.msg(['兵士たちは足早に村を出ていった。', '……出ていく前に、兵士の一人が森の入口で何かを地面に埋めるのが見えた。']);
    S.show('as_collector', false); S.show('as_soldier1', false); S.show('as_soldier2', false);
    await c.say('ラウル', ['ミオ、大丈夫か。']);
    await c.say('ミオ', ['ええ。……間違ったことを、間違っていると言っただけよ。', '村長さんと、王都への手紙の文面を相談してくるわ。先に帰っていて。']);
    await S.walk('as_mio_out', [[18, 13], [17, 13], [17, 12], [16, 12]], 280); S.show('as_mio_out', false);
    S.setPhase('after_tax'); refresh();
    await c.msg(['（家に帰って休もう。北の畑のかかしのあたりに、兵士が何かを埋めていった）']);
  };

  /* ---------- 第3幕：炎の夜 ---------- */
  S.shadowTalk = async function (c) { await c.msg(['黒い影の魔物が、低く唸っている。……近づけない。', '（広場の父のもとへ。大通りを南へ回り込もう）']); };
  S.raidFather = async function (c) {
    var f = F(); if (f.s3121_raid_father) { await c.say('ラウル', ['行け！ 振り返るな！']); return; }
    f.s3121_raid_father = true;
    S.cine({ x: 21, y: 15, dist: 12, pitch: 55 });
    await c.msg(['広場で、父ラウルが剣を振るっていた。背後には、逃げ遅れた子ども。']);
    await c.say('ラウル', ['来るな！']);
    await c.msg(['駆け寄ろうとした瞬間——巨大な影の腕が振り下ろされた。']);
    S.emote('Hit'); await S.flash('#ff6a3a');
    await c.msg(['地面ごと体をはね飛ばされ、息ができない。']);
    await c.say('ラウル', ['逃げろ！ お前には、まだ未来がある！']);
    await c.say(hero(), ['嫌だ！ 一緒に戦う！']);
    S.show('ar_mio', true, 18, 18, 'up'); var pp = W().player; await S.walk('ar_mio', [[18, 17]].concat(pp ? [] : []), 260);
    await c.msg(['そのとき、母ミオが駆け寄り、強く抱きしめた。']);
    S.cine({ x: pp ? pp.x : 19, y: pp ? pp.y : 17, dist: 9, pitch: 52 });
    await c.say('ミオ', [hero() + '……これを。']);
    await c.msg(['母は、一冊の古びた帳簿と、小さなお守りを手渡した。']);
    await c.say('ミオ', ['これは、ずっと昔から家族が大切にしてきたもの。', 'あなたなら、きっと意味が分かる日が来る。']);
    S.giveFamilyItems();
    await c.msg(['母の帳簿と家族のお守りを受け取った。（重要アイテム。どうぐから読み返せる）']);
    await c.say('ミオ', ['避難路は南。子どもたちと一緒に行って。', 'お願い。生きて。']);
    S.show('ar_child', false);
    await S.walk('ar_mio', [[19, 17], [20, 17]], 240);
    await c.msg(['母は、父のいる炎の方へ走っていった。']);
    S.cine(null); S.setPhase('escape'); refresh();
    await c.msg(['（南の門から、村の外へ逃げよう）']);
  };
  S.escapeGate = async function (c) {
    var f = F(); var p = ph();
    if (p === 'raid' && !f.s3121_raid_father) { await c.msg(['広場の方から、父の叫び声が聞こえる。', '……行かなきゃ。（先に広場の父のもとへ）']); return; }
    if ((p !== 'escape' && p !== 'raid') || f.s3121_escaped) return;
    f.s3121_escaped = true; S.giveFamilyItems();
    S.cine({ x: 16, y: 11, dist: 22, pitch: 46 });
    await c.msg(['南の避難路の入口で、振り返った。', '燃え上がる村の中で、両親の姿が見えた。', '父は剣を構え、母はその隣に立っていた。']);
    await S.flash('#ffffff'); await S.flash('#ffb060');
    await c.msg(['——ひときわ大きな爆発とともに、故郷は炎と煙に包まれていく。']);
    await S.veil(1, '#000', 1200); S.cine(null);
    if (root.Audio && root.Audio.stopBgm) root.Audio.stopBgm();
    await c.msg(['…………', '風の音だけが、聞こえていた。']);
    await c.msg(['幾日かの逃避行の末——', '森を抜け、川を下り、どこをどう歩いたのか、ほとんど覚えていない。', 'やがて、力尽きた。']);
    S.setPhase('poyo_wake'); setTime(0.45);
    place('poyo_elder_house', 6, 2, 'down');
    await sleep(500); await S.veil(0, '#000', 1200);
    await S.pwake(c);
  };

  /* ---------- 第4幕：ポヨ村 ---------- */
  S.pwake = async function (c) {
    var f = F(); if (f.s3121_woke) return;
    await c.say('村長モチゾウ', ['目が覚めたか。よかった……もう駄目かと思ったぞ。']);
    await c.say(hero(), ['……ここは？ 村は……アサナ村は……！']);
    await c.say('村長モチゾウ', ['アサナ村……？ すまんが、聞いたことのない名じゃ。', 'お前さんは三日前、村はずれの川べりで倒れておった。……何があったのか、今はまだ分からん。', 'だが、ここでは安心して休むといい。']);
    await c.msg(['両親が、もう帰ってこないかもしれない。', '——その考えが、初めて胸の底に落ちてきた。']);
    f.s3121_woke = true; S.setPhase('poyo_night');
    await S.veil(1, '#000', 900);
    await c.msg(['その夜。眠れずに、そっと村長の家を抜け出した。']);
    setTime(0.02); place('poyo_village', 9, 21, 'left'); refresh();
    await sleep(400); await S.veil(0, '#000', 900);
    await c.msg(['（村の西のはずれ、柵のそばへ歩いてみよう）']);
  };
  S.hakeiNight = async function (c) {
    var f = F(); if (f.s3121_hakei_night || ph() !== 'poyo_night') return;
    f.s3121_hakei_night = true;
    S.show('poyo_hakei_night', true, 4, 21, 'right'); refresh(); faceHero('left');
    S.cine({ x: 5, y: 21, dist: 11, pitch: 48 });
    await c.msg(['柵のそばで、ひとり膝を抱えていた。涙が止まらない。', '……足音がして、一人の老人が現れた。']);
    await c.say('老人', ['お前さん、何をそんなに悲しんでおる？']);
    await c.say(hero(), ['全部奪われた……家も、家族も、お金も……。', '何も残っていない。']);
    await c.say('老人', ['何も残っていない、か。', '……それは違う。お前さんはまだ生きておる。', '生きている限り、何度でも立ち上がれる。', '相場も人生も同じじゃ。負けないことより、負けたあとにどうするかが大切なんじゃよ。']);
    await c.say(hero(), ['……強くなりたい。', '故郷を滅ぼしたやつらを、倒したい。']);
    await c.say('老人', ['ならば教えてやろう。剣の振り方だけではない。', '世の中の流れを読み、限られたものを守り、未来へ進むための知恵をな。']);
    await c.say('師匠ハケイ', ['わしはハケイ。村の東の修行場で、波の読み方を教えておる。', '……今夜はもう眠りなさい。明日、村長がお前さんに話があるそうじゃ。']);
    S.cine(null);
    await finishPrologueQuest();
    S.setPhase('poyo_day');
    await S.veil(1, '#000', 900);
    S.show('poyo_hakei_night', false); setTime(0.3);
    place('poyo_elder_house', 6, 2, 'down'); refresh();
    await sleep(300); await S.veil(0, '#000', 900);
    await c.msg(['——翌朝。', '（村長に話しかけよう）']);
  };
  // ポヨ村の門：ハケイの見送り（新しいプロローグのセーブで、村長の話を聞いたあと最初に門へ向かったとき）
  S.hakeiFarewell = async function (c) {
    var f = F(); if (f.s3121_hakei_farewell) return; f.s3121_hakei_farewell = true;
    var pp = W().player; var hx = Math.max(19, Math.min(24, (pp ? pp.x : 21) - 1));
    S.show('poyo_hakei_gate', true, (pp && hx === pp.x) ? hx - 1 : hx, 35, 'down');
    await c.say('師匠ハケイ', ['行くのか。']);
    await c.say('師匠ハケイ', ['忘れるな。未来は誰にも分からん。', 'だからこそ、自分で考えて選ぶんじゃ。']);
    await c.msg(['静かに頷いた。', 'そして、遥か遠くに続く街道へ、最初の一歩を踏み出す。']);
    await c.msg(['——第一章　目覚めた旅人——', '失われた故郷を胸に、運命の旅が始まる。']);
    S.show('poyo_hakei_gate', false); S.setPhase('done');
  };
  // ポヨ村の村長の最初の言葉（新しいプロローグで目を覚ましたあとのセーブだけ。100G などの処理は towns.js のまま）
  S.elderIntroFirstLine = function () { var f = F(); if (!f || !f.s3121_new_prologue) return null; return 'おお……顔色が戻ったな。昨夜は眠れたか。'; };
  // リーナ：加入の前の問いかけ（新しいプロローグのセーブで一度だけ）
  S.linaQuestion = async function (c) {
    var f = F(); if (!f.s3121_new_prologue || f.s3121_lina_question) return;
    f.s3121_lina_question = true;
    await c.msg(['リーナは、まだ乾ききらない傷に薬を塗ってくれた。故郷の話を、黙って聞いてくれた。']);
    await c.say(hero(), ['……復讐する。', 'そのためなら、どれだけ強くなっても、いくらお金を稼いでも足りない。']);
    await c.say('リーナ', ['じゃあ、復讐が終わったら、どうするの？']);
    await c.msg(['……答えられなかった。']);
    await c.say('リーナ', ['だったら、私も一緒に行く。', 'あなたが何のために戦うのか、見つけるまで。']);
  };

  /* ---------- ポヨ村への追加（夜のハケイ・門の見送り・ベッドの回想） ---------- */
  (function () {
    var pv = MD.poyo_village; if (!pv) return; pv.npcs = pv.npcs || [];
    pv.npcs.push({ id: 'poyo_hakei_night', x: 4, y: 21, sprite: 'master', dir: 'right', wander: 0, noChatter: true, s3121: true, showWhen: function () { return S.phase() === 'poyo_night' && !!F().s3121_hakei_night; }, talk: async function (c) { await S.hakeiNight(c); } });
    pv.npcs.push({ id: 'poyo_hakei_gate', x: 20, y: 35, sprite: 'master', dir: 'down', wander: 0, noChatter: true, s3121: true, showWhen: function () { return false; }, talk: async function (c) { await c.say('師匠ハケイ', ['行ってきなさい。']); } });
    onStepTriggers('poyo_village', [
      { x0: 2, x1: 7, y0: 21, y1: 23, when: function () { return S.phase() === 'poyo_night' && !F().s3121_hakei_night; }, run: S.hakeiNight },
      { x0: 18, x1: 25, y0: 34, y1: 37, when: function () { var f = F(); return !!(f.s3121_new_prologue && f.met_elder && !f.s3121_hakei_farewell && S.phase() === 'poyo_day'); }, run: S.hakeiFarewell }
    ]);
    pv.events = pv.events || []; pv.events.push({ x: 3, y: 21, type: 'script', solid: false, s3121: true, run: async function (c) { if (S.phase() === 'poyo_night') await S.hakeiNight(c); else await c.msg(['村の西のはずれ。柵の向こうに、夜の草原が広がっている。']); } });
    var eh = MD.poyo_elder_house; if (eh) { eh.events = eh.events || []; eh.events.push({ x: 6, y: 1, type: 'script', solid: true, s3121: true, run: async function (c) { await S.bedEvent(c); } }); }
  })();
  // 夜のポヨ村で村長の家などに入った場合も、物語が止まらないようにする（村長の家に戻ると、柵のそばへ行くよう促す）
  onStepTriggers('asana_village', [
    { x0: 3, x1: 24, y0: 11, y1: 18, when: function () { return S.phase() === 'tax' && !F().s3121_tax_done; }, run: function (c) { return S.taxScene(c); } }
  ]);
  onStepTriggers('asana_raid', [
    { x0: 16, x1: 25, y0: 13, y1: 19, when: function () { return S.phase() === 'raid' && !F().s3121_raid_father; }, run: function (c) { return S.raidFather(c); } },
    { x0: 11, x1: 16, y0: 19, y1: 20, when: function () { var f = F(); return (S.phase() === 'escape' || (S.phase() === 'raid' && f.s3121_raid_father)) && !f.s3121_escaped; }, run: function (c) { return S.escapeGate(c); } }
  ]);

  /* ---------- 途中で閉じたときの続き（マップに入るとき・読み込んだときに確かめる） ---------- */
  //  ・ポヨ村の村長の家で目を覚ます場面の前に閉じた → 村長の家に入ると場面から始まる
  //  ・夜のポヨ村なのに村長の家にいる → 夜の村へ
  //  ・徴税官の場面・父の場面は途中で保存されない（マップを移らないため）。閉じたら場面の前からやり直しになる
  S.resume = function (m) {
    var d = D(); if (!d || !d.flags || !m) return; var p = S.phase(); if (!p) return;
    if (p === 'poyo_wake' && m.id === 'poyo_elder_house' && !d.flags.s3121_woke) defer(S.pwake);
    else if (p === 'poyo_night' && m.id === 'poyo_elder_house' && !d.flags.s3121_hakei_night) defer(async function (c) { await c.msg(['……眠れない。そっと村長の家を抜け出した。']); setTime(0.02); place('poyo_village', 9, 21, 'left'); refresh(); await c.msg(['（村の西のはずれ、柵のそばへ歩いてみよう）']); });
  };
  function defer(fn) { var tries = 0; (function go() { var w = W(); if (w && w.busy) { if (++tries < 200) setTimeout(go, 50); return; } runScene(fn); })(); }
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) { setTimeout(function () { try { S.resume(m); } catch (e) { /* 続きの確認だけ */ } }, 0); });

  /* ---------- 墓と、廃墟の村人 ---------- */
  S.grave = async function (c) {
    var f = F();
    if (f.s3121_epilogue_done) { await c.msg(['父ラウルと母ミオの墓。新しい花が供えてある。', '墓の前には、旅の剣と、母の帳簿の形を刻んだ小さな石板が置かれている。']); await S.offerHomecomingReplay(c); return; }
    await c.msg(['積み上げられた石。村の生き残りが作った墓だという。', '石の一つに、二つの名前が刻まれている。——ラウル。ミオ。']);
    if (f.game_cleared) { await S.lateHomecoming(c); return; }   // クリア済みのセーブ（エンディングのあとで場所が分かった旧セーブなど）：帰郷の場面を見られる（報酬なし）
    if (!f.s3121_grave_visited) { f.s3121_grave_visited = true; await c.say(hero(), ['……父さん、母さん。', 'まだ、何も終わっていない。……また来る。']); }
  };
  // クリア済みのセーブで、あとから帰郷の場面を見る（クリアの記録・報酬・クエストは変えない）
  S.lateHomecoming = async function (c) {
    var a = await c.choice('旅の終わりを、両親に報告する？（帰郷の場面）', ['報告する', 'やめる']); if (a !== 0) return;
    await S.homecoming(c, F().ending || 'A');
    place('poyo_elder_house', 5, 5, 'up'); await S.veil(0, '#000', 600);
    await c.say('村長モチゾウ', ['……おお、帰ったか。アサナ村へ行っておったのか。', 'よく頑張ったな。', '……おかえり。']);
    await c.say(hero(), ['ただいま。']);
  };
  S.ruinsSurvivor = async function (c) {
    await c.say('戻ってきた村の人', ['……あんた、ラウルさんとミオさんの……！ 生きてたんだね。', 'あの夜、ミオさんは最後まで、村の子どもたちを南の避難路へ逃がしてた。うちの娘も、ミオさんに手を引かれて助かったんだ。', 'お墓は、あたしたちで作った。……これくらいしか、できなくてね。']);
  };

  /* ---------- 第16章：相場魔王の誘惑（Finale.throne の〈固定〉戦の直前に一度だけ） ---------- */
  S.temptation = async function (c) {
    var f = F(); if (f.s3121_temptation) return; f.s3121_temptation = true;
    var name = hero();
    S.cine({ x: 8, y: 3, dist: 10, pitch: 30 });
    await S.veil(0.42, '#ffe8c0', 700);
    await c.msg(['相場魔王〈固定〉の光が、玉座の間を満たした。', '……気がつくと、アサナ村の広場に立っていた。']);
    await c.msg(['焼けていない家々。豊作の麦。祭りの灯り。', '父が木剣を直している。母が帳簿を閉じて、こちらに手を振る。']);
    await c.say('ミオ', ['おかえり、' + name + '。ご飯できてるわよ。']);
    await c.say('相場魔王〈固定〉', ['お前は家族を失った。故郷も失った。二度とそんな悲しみを味わいたくないだろう？', '私に世界を委ねろ。未来をすべて固定すれば、誰も失敗せず、誰も失わずに済む。', 'この村は、二度と焼かれない。……その代わり、この先のすべての明日を、私が決める。']);
    // 選択肢は出さない（既存の玉座の場面の選択は「クリスタルをどうする？」の一つだけのまま）。切望してから拒む
    await c.msg(['手を伸ばした。母の手は、温かかった。', '……けれど、その温かさは、少しも揺れなかった。笑い声は、同じ高さで繰り返された。', '旅の途中で出会った人たちの顔が、浮かんでは消えた。誰の明日も、この光の中では動かない。']);
    await c.say(name, ['もう一度、家族に会いたい。', 'あの日に戻れるなら、何だってしたい。', 'でも……誰かの未来を奪ってまで、自分の願いを叶えたくない。']);
    await c.say(name, ['失敗するかもしれない未来を選ぶ。', 'その代わり、何度だって立ち上がる。そして、大切な人たちを守り続ける！']);
    if (root.State.hasItem('s3121_letter')) await c.msg(['ポケットの中で、母の手紙が音を立てた。「人を憎むことだけに人生を使わないでほしい」']);
    await c.say('相場魔王〈固定〉', ['……失うことが、怖くないのか。']);
    await c.say(name, ['怖いよ。', 'だから、ひとりじゃなくて、みんなで選ぶんだ。']);
    await c.msg(['光の村が、静かにほどけていった。', '——2052年に一つの文明が終わり、3024年に結晶が未来を固定しようとして海が都を呑んだ。そして3121年、同じ願いがまた形になった。', '「もう失いたくない」。それは悪意ではなく、恐怖だった。']);
    await S.veil(0, '#ffe8c0', 700); S.cine(null);
  };
  (function () {
    var Fi = root.Finale; if (!Fi || !Fi.throne) return; var orig = Fi.throne;
    Fi.throne = async function (c) {
      var c2 = Object.create(c); c2.battle = async function (ids, opts) { if (ids && ids[0] === 'boss_demon_fixed') await S.temptation(c); return c.battle(ids, opts); };
      return orig.call(Fi, c2);
    };
  })();

  /* ---------- エンディング：アサナ村の帰郷（finale.js の Finale.epilogue から呼ぶ。A・B どちらでも） ---------- */
  S.homecoming = async function (c, ending) {
    var f = F(); var name = hero();
    await c.msg(['——そして、旅の終わりに。']);
    f.s3121_asana_rebuilt = true; f.s3121_asana_located = true;
    if (W().maps) delete W().maps.asana_rebuilt;
    await S.veil(1, '#000', 700);
    place('asana_rebuilt', 13, 19, 'up'); setTime(0.3); refresh();
    await sleep(300); await S.veil(0, '#000', 900);
    await c.msg(['かつて故郷だったアサナ村の跡地へ向かった。', '焼け落ちた家々の間には、小さな草花が芽を出していた。', '生き残った村人たちが家を建て直し、子どもたちが遊んでいる。']);
    if (ending === 'B') await c.msg(['広場の掲示板には、村の帳簿の写しが貼り出されている。七つの鍵の監査の印が、隅に押してあった。']);
    else await c.msg(['広場の掲示板には、村の帳簿の写しが貼り出されている。誰でも読めるように、大きな字で。']);
    movePlayer(20, 17, 'up'); S.cine({ x: 20, y: 16, dist: 10, pitch: 58 });
    await c.msg(['両親の墓の前に座り、冒険で手に入れた剣と、母の帳簿の写しを、そっと置いた。', '（帳簿とお守りは、どうぐに残っている。墓の前にあるのは、村の石工が刻んだ形見の石板だ）']);
    await c.say(name, ['父さん、母さん。', '強くなったよ。', 'お金も、たくさん稼げるようになった。', 'でもね……それより大切なものを、いっぱい見つけたんだ。']);
    var party = D().party.filter(function (id) { return id !== 'hero' && D().companions[id]; });
    await c.msg(['振り返ると、共に戦ってきた仲間たちが待っていた。' + (party.length ? '' : '……そして、旅で出会ったたくさんの人たちの顔が、浮かんだ。')]);
    await c.say('村の子ども', ['ねえ！ 今日はみんなでご飯を食べようよ！']);
    await c.say(name, ['うん。行こう。']);
    S.cine(null);
    f.s3121_epilogue_done = true;
    await S.veil(1, '#000', 900);
    await sleep(200);
  };
  S.offerHomecomingReplay = async function (c) {
    var a = await c.choice('', ['墓の前で、旅を振り返る（帰郷の場面をもう一度）', 'やめる']); if (a !== 0) return;
    await root.Win.message(['——回想：ただいま——'].concat(S.SCENES[7].lines));
  };
  // 復興した村に着いたときに幕を戻す（エンディング中は finale.js がポヨ村へ移す）
  S.afterHomecoming = async function () { await S.veil(0, '#000', 600); };
  /* ---------- プロローグの目的地の案内（js/rpg/nav.js。プロローグのあいだは d.navTrack で優先） ---------- */
  (function () { var O = root.OBJECTIVES; if (!O) return; function E(q, done, t, h) { O.push({ q: q, done: done, t: t, h: h, side: true }); }   // side：サブの案内（クエスト画面で「案内する」・プロローグ中は d.navTrack）
  E('s3121_prologue', 's3121_bought', 'npc:asana_village:as_merchant', ['アサナ村。', '村の東の市場。', '家を出て東の市場で、パンと豆を買おう。']);
  E('s3121_prologue', 's3121_ledger_seen', 'npc:asana_home:as_mio', ['アサナ村。', '家（村の西）の母ミオ。', '家に戻って、母ミオに話しかけよう。']);
  E('s3121_prologue', 's3121_lesson_done', 'npc:asana_village:as_raul', ['アサナ村。', '東の広場の父ラウル。', '東の広場の稽古場で、父ラウルに話しかけよう。']);
  E('s3121_prologue', 's3121_festival_done', 'npc:asana_village:as_chief', ['アサナ村。', '広場の村長。', '夕暮れの広場で、村長に話しかけよう。']);
  E('s3121_prologue', 's3121_slept1', 'ev:asana_home:1,1', ['アサナ村。', '家のベッド。', '家に帰って、左奥のベッドで眠ろう。']);
  E('s3121_prologue', 's3121_tax_done', 'npc:asana_village:as_collector', ['アサナ村。', '広場の徴税官。', '家を出て、東の広場へ。']);
  E('s3121_prologue', 's3121_slept2', 'ev:asana_home:1,1', ['アサナ村。', '家のベッド。', '家に帰って休もう。']);
  E('s3121_prologue', 's3121_raid_father', 'npc:asana_raid:ar_raul', ['燃えるアサナ村。', '東の広場の父ラウル。', '大通りを通って、東の広場の父のもとへ。']);
  E('s3121_prologue', 's3121_escaped', 'ev:asana_raid:13,20', ['燃えるアサナ村。', '南の門（避難路）。', '大通りを南へ。村の南の門から外へ。']);
  E('s3121_prologue', 's3121_woke', 'npc:poyo_elder_house:elder_mochizo', ['ポヨ村。', '村長の家。', '村長の話を聞こう。']);
  E('s3121_prologue', 's3121_hakei_night', 'ev:poyo_village:3,21', ['ポヨ村。', '村の西のはずれ。', '村の西のはずれ、柵のそばへ。']);
  })();
})(typeof window !== 'undefined' ? window : globalThis);
