/* =========================================================
   Data / Kalion (v5.1 第6〜7章) : カリオン徴収連邦——徴収都市カリオン・財務局・地下記録庫・秘密研究所・王都セントラ・王宮・地図から消えた村
   第6章 main_6「黒い帳簿」：
     1. 灰の峠からカリオン平野へ → 徴収都市（兵の監視、財産没収、配給制）
     2. 貧困地区の路地で追われる元財務官エルナを救う（連邦兵と戦闘）→ エルナ加入（監査官）
     3. 帳簿の照合3か所：財務局の机（エルナ同行）、商業区の商人（裏帳簿）、地下記録庫の守護者（boss_ledger_guardian）
     4. 財務局でハルド局長と対峙 → 警備隊長と戦闘 → ハルドは王都へ逃亡
     5. 証拠の扱いを選ぶ（公開／監察官リーヴ／被害者）→ main_6 達成（古代の監査帳簿）。王都への道が開く
   第7章 main_7「奪われた財産」：
     1. 王都セントラ：監察官リーヴ → 被害者の証言3つ（城壁の外の老人・没収された商人・元兵士）
     2. 騎士団詰所でヴァレン団長と一騎打ち（カイル同行なら特別な会話）→ 王宮の通行証
     3. 王宮：親衛隊長ドレク → 帳簿中枢の守護機構（boss）→ 中枢停止
     4. 大宰相セヴランとの対峙（戦闘なし。選択：裁判／追放／改革に協力させる）→ 秘密研究が島のAIへつながることを明かす
     5. 財務局で財産返還令を執行 → 町の変化（兵の撤退、自治組織、商業再開、反発する住民）。オルド加入。main_7 達成（リスク分散の盾）
   ・サブ：地図から消えた村（erased_village）、王都の復興（sentra_rebuild）、カイルの誓い（kyle_oath）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function gameOverIfLost(c, r) { if (r === 'lost') return root.World.gameOver(); return null; }

  /* ---------- 徴収都市カリオン ---------- */
  add({ id: 'kalion_city', name: '徴収都市カリオン', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'x=====================rrrr=====================x',
    'x=====BBBBBBBBBBBB====rrrr=====================x',
    'x=====BBBBBBBBBBBB====rrrr====BBBBBBBBBB=======x',
    'x=====BBBBBBBBBBBB====rrrr====BBBBBBBBBB=======x',
    'x=====BBBByBBBBBBB====rrrr====yBBBBBBBBB=======x',
    'x=====BBBBBBBBBBBB====rrrr====BBBBBBBBBB=======x',
    'x=====BBBBBBBBBBBB====rrrr====BBBBBBBBBB=======x',
    'x=====================rrrr=====================x',
    'x=====================rrrr=====================x',
    'x=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=x',
    'x=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=x',
    'x=============rr======rrrr======rr=============x',
    'x=============rr======rrrr======rr=============x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x=============rr======rrrr======rr=============x',
    'x=============rr======rrrr======rr=============x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x===BBBBBBBB==rr====BBBBBBBB====rr==BBBBBBBB===x',
    'x=============rr======rrrr======rr=============x',
    'x=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=x',
    'x=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=x',
    'x888888888888888888888rrrr888888888888888888888x',
    'x888888888qz8888888888rrrr888888888888888888888x',
    'x88888z888888888888888rrrr88888888888888y888888x',
    'x88888888888888888y888rrrr88y888888888888888888x',
    'x888888888888888888888rrrr888888888888888888888x',
    'x888888888888888888888rrrr888888888888888888888x',
    'xxxxxxxxxxxxxxxxxxxxxxrrrrxxxxxxxxxxxxxxxxxxxxxx'
  ],
  buildings: [
    { id: 'finance', type: 'bank', name: '財務局', x: 6, y: 2, w: 12, h: 6, doorX: 6, interior: 'kalion_finance', entry: { x: 5, y: 10 } },
    { id: 'tax', type: 'guild', name: '税務庁舎', x: 30, y: 3, w: 10, h: 5, doorX: 4, interior: 'kalion_tax', entry: { x: 5, y: 7 } },
    { id: 'weapon', type: 'weapon', name: 'カリオン武器店', x: 36, y: 14, w: 8, h: 5, doorX: 3, interior: 'kalion_weapon', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: 'カリオン防具店', x: 36, y: 21, w: 8, h: 5, doorX: 3, interior: 'kalion_armor', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '配給商店', x: 4, y: 14, w: 8, h: 5, doorX: 3, interior: 'kalion_item', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '徴収都市の宿', x: 4, y: 21, w: 8, h: 5, doorX: 3, interior: 'kalion_inn', entry: { x: 5, y: 7 } },
    { id: 'tavern', type: 'tavern', name: '裏通りの酒場', x: 20, y: 14, w: 8, h: 5, doorX: 3, interior: 'kalion_tavern', entry: { x: 5, y: 7 } },
    { id: 'church', type: 'church', name: 'カリオン教会', x: 20, y: 21, w: 8, h: 5, doorX: 3, interior: 'kalion_church', entry: { x: 5, y: 7 } }
  ],
  warps: [{ x: 22, y: 35, to: 'world_kalion', tx: 60, ty: 78, name: '町の外へ' }, { x: 23, y: 35, to: 'world_kalion', tx: 60, ty: 78, name: '町の外へ' }, { x: 24, y: 35, to: 'world_kalion', tx: 60, ty: 78, name: '町の外へ' }, { x: 25, y: 35, to: 'world_kalion', tx: 60, ty: 78, name: '町の外へ' }],
  chests: [{ id: 'kc1', x: 44, y: 32, item: 'ether', qty: 2 }],
  events: [{ x: 28, y: 9, type: 'inspect', solid: false, text: ['告示板：「魔災復興税 特別徴収のお知らせ」', '「納付なき者の財産は、魔法帳簿により国庫に記録・移転される。異議申立は反逆行為とみなす。——大宰相セヴラン」', 'その横に貼り紙。「復興事業の場所を知っている者はいないか」'] }],
  npcs: [
    // ---- 政府改革前 ----
    { id: 'kc_gate_soldier', x: 24, y: 32, sprite: 'federal_soldier', dir: 'down', wander: 0, hideIf: 'kalion_reformed', talk: async function (c) { if (!c.flag('kalion_arrived')) c.setFlag('kalion_arrived', true); await c.say('連邦兵', ['徴収都市カリオンだ。旅人も「魔災復興税」の対象になる。宿と店は北の区画。南の区画には近づくな、反逆者の巣だ。', '……最近、財務局から逃げた女がいる。見かけたら通報しろ。']); } },
    { id: 'kc_plaza_soldier', x: 18, y: 12, sprite: 'federal_soldier', dir: 'down', wander: 1, hideIf: 'kalion_reformed', talk: async function (c) { await c.say('連邦兵', ['俺たちだって好きで没収してるわけじゃない。命令だ。', '……家族にも税がかかる。払えなきゃ、俺が俺の家を没収しに行く番だ。']); } },
    { id: 'kc_rich', x: 20, y: 6, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('kalion_reformed')) await c.say('富裕層の女', ['税が下がる？ 冗談じゃない。私たちは正しく払ってきたのよ。……返還令で、私の資産も調べられるの？', '……まあ、調べられて困ることは、ないけれど。']); else await c.say('富裕層の女', ['北の区画は静かでいいわ。南はうるさくて……あの人たち、税も払えないくせに文句ばかり。', '復興事業？ ええ、どこかで立派にやっているんでしょう。塔も毎年高くなるし。']); } },
    { id: 'kc_poor1', x: 8, y: 31, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('kalion_reformed')) await c.say('南区の男', ['返還令で、没収された店の権利書が戻ってきた。全部じゃない。でも帳簿に名前が戻った。', '自治組織の会合は毎晩だ。来るか？ 文句を言う場所ができたのは、悪くない。']); else if (c.flag('elna_rescued')) await c.say('南区の男', ['あの女を助けたのか。……気をつけろ、兵は南区を虱潰しに探してる。', '財務局の帳簿？ 商業区の大商人クラウスが、裏帳簿を持ってるって噂だ。税を「調整」してもらってるらしい。']); else await c.say('南区の男', ['帳簿に「反逆」と書かれたら終わりだ。家も、店も、国庫のものになる。', '……路地の奥で、兵が女を追い回してる。財務局の人間らしい。関わるな。']); } },
    { id: 'kc_poor2', x: 36, y: 32, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('kalion_reformed')) await c.say('南区の女', ['食料の配給は続いてる。でも今度は「誰が決めたか」が帳簿に書いてある。', '監督は私たちの役目。……面倒だけど、面倒なのがいいのよ。']); else await c.say('南区の女', ['子どもが熱を出しても、薬は配給の順番待ち。順番は税の納付額で決まる。', '西の森の奥に、記録から消された村があるって。そこなら薬を……いえ、何でもない。']); } },
    // ---- エルナ救出（路地） ----
    { id: 'kc_chaser', x: 9, y: 33, sprite: 'federal_soldier', dir: 'left', wander: 0, hideIf: 'elna_rescued', talk: async function (c) {
      await c.say('連邦兵', ['そこの女！ 財務局の帳簿を持ち出した罪で拘束する！', '……お前は何だ。関係ない者は下がれ！']);
      await c.say('エルナ', ['……助けて。私は財務局の元財務官エルナ。この帳簿には、存在しない復興事業への支出が記録されている。', '彼らはそれを消すつもり。お願い、ここで渡すわけにはいかない。']);
      var a = await c.choice('どうする？', ['エルナを守って戦う', '関わらない']);
      if (a !== 0) { await c.say('連邦兵', ['賢明だ。下がっていろ。']); return; }
      var r = await c.battle(['federal_soldier', 'federal_soldier', 'tax_hound'], {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
      c.setFlag('elna_rescued', true);
      await c.say('エルナ', ['……ありがとう。私はエルナ。財務局で帳簿を監査していた。', '魔災復興税で集めた財産の大半が、どこにもない「復興事業」へ流れている。行き先は鉱山の魔物と、どこかの研究施設。', 'これだけでは足りない。財務局の私の机、商業区の大商人クラウスの裏帳簿、そして地下記録庫。三つを照合すれば、誰も言い逃れできない記録になる。']);
      await c.say('エルナ', ['一緒に行かせて。監査官として、私はこの帳簿の最後の行を自分で書きたい。']);
      c.join('elna'); c.setFlag('elna_joined', true); await c.msg(['エルナが仲間になった！（監査官）', '転職の条件：エルナ加入後、Lv10以上で「監査官」に転職できる']);
      if (!c.questActive('main_6') && !c.questDone('main_6')) c.questStart('main_6');
      await c.remark('kyle', ['……兵の顔を見たか。命令だと言っていた。', '俺もあの顔をしていた。命令を疑わない顔だ。'], 'kyle_remark_kalion');
    } },
    { id: 'kc_elna_npc', x: 7, y: 33, sprite: 'scholar', dir: 'right', wander: 0, hideIf: 'elna_rescued', talk: async function (c) { await c.say('追われる女', ['来ないで……いえ、お願い、助けて。']); } },
    // ---- 商業区の大商人（裏帳簿） ----
    { id: 'kc_klaus', x: 40, y: 12, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) {
      if (c.flag('ledger_2')) { await c.say('大商人クラウス', [c.flag('kalion_reformed') ? '返還令のおかげで、私の「調整」も帳簿に載った。……罰金だ。まあ、安いものだ。' : 'あの裏帳簿が表に出たら、私も終わりだ。……頼む、うまくやってくれ。']); return; }
      if (!c.flag('elna_rescued')) { await c.say('大商人クラウス', ['商業区へようこそ。税のことなら財務局へ。私は商人、政治には関わらない。']); return; }
      await c.say('大商人クラウス', ['エルナ……財務局の監査官か。私の「裏帳簿」が欲しいんだろう。', '私は税を「調整」してもらっていた。復興事業の名目で払った賄賂の記録だ。これを渡せば、私も罪に問われる。']);
      var a = await c.choice('クラウスは迷っている。', ['証拠は誰も裁くためじゃない、奪われた人に返すためだと説得する', '500Gで買い取る', 'エルナに任せる']);
      if (a === 1) { if (c.gold < 500) { await c.msg(['お金が足りない。']); return; } c.addGold(-500); await c.say('大商人クラウス', ['……金か。わかりやすくていい。持っていけ。']); }
      else if (a === 2) { await c.say('エルナ', ['クラウス。あなたの帳簿には、賄賂の額だけでなく「払わされた理由」も書いてある。あなたも被害者よ。', '私が監査官として保証する。記録を正しく読めば、あなたは加害者ではなく証人になる。']); await c.say('大商人クラウス', ['……監査官殿がそう言うなら。持っていけ。']); }
      else { await c.say('大商人クラウス', ['奪われた人に返す、か。……私の店も、半分は「没収」されかけた。', 'わかった。だが頼む、私の名前は最後に出してくれ。']); c.setFlag('klaus_trust', true); }
      c.give('ledger_record', 1); c.setFlag('ledger_2', true); await c.msg(['黒い帳簿の記録（裏帳簿）を手に入れた！（' + (root.State.data.inventory.ledger_record || 0) + '/3）']);
    } },
    // ---- 政府改革後 ----
    { id: 'kc_council', x: 24, y: 30, sprite: 'villager_m', dir: 'down', wander: 0, showIf: 'kalion_reformed', talk: async function (c) { if (!c.flag('kalion_rebuild_done')) { await c.say('自治組織の世話役', ['自治組織の会合所はここだ。返還は少しずつ進んでいる。', '……ただ、返還で一番困っているのは、実は役所だ。帳簿を書き換える人手が足りない。手伝ってくれるなら、帳簿の照合を3件頼みたい。']); if (!c.questActive('sentra_rebuild') && !c.questDone('sentra_rebuild')) { c.questStart('sentra_rebuild'); await c.msg(['復興クエスト「帳簿の書き換え」を受けた。南区の男・南区の女・大商人クラウスの3人に話を聞こう。']); } else if (c.questActive('sentra_rebuild')) { var n = ['kc_poor1', 'kc_poor2', 'kc_klaus'].filter(function (k) { return c.flag('rebuild_' + k); }).length; if (n >= 3) { c.setFlag('kalion_rebuild_done', true); await c.questComplete('sentra_rebuild'); } else await c.msg(['照合は ' + n + '/3。']); } return; } await c.say('自治組織の世話役', ['帳簿の照合、助かった。……これからは自分たちで書く。遅くても、自分たちで。']); } },
    { id: 'kc_angry', x: 30, y: 12, sprite: 'villager_m', dir: 'down', wander: 1, showIf: 'kalion_reformed', talk: async function (c) { await c.say('怒る男', ['大宰相がいなくなって、治安はどうなる？ 魔物が来たら誰が守る？', '自由はいい。だが俺は、守ってくれる誰かが欲しかっただけだ。……それも、支配なのか？']); } },
    { id: 'kc_newmerchant', x: 34, y: 30, sprite: 'merchant', dir: 'down', wander: 0, showIf: 'kalion_reformed', talk: async function (c) { await c.say('新しい商人', ['南区に店を開いた。許可は自治組織から。税は……帳簿に書いてある使い道に、納得してから払う。']); await c.shop('item', ['herb', 'potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'tent', 'escape_wing']); } }
  ] });
  // 復興クエストの照合（既存NPCの会話に追加：フラグで判定）
  ['kc_poor1', 'kc_poor2', 'kc_klaus'].forEach(function (id) { var def = root.MAP_DEFS.kalion_city; var n = def.npcs.filter(function (x) { return x.id === id; })[0]; var orig = n.talk; n.talk = async function (c) { await orig(c); if (c.questActive('sentra_rebuild') && !c.flag('rebuild_' + id)) { c.setFlag('rebuild_' + id, true); await c.msg(['帳簿の照合を一件済ませた。']); } }; });

  /* ---------- 財務局 ---------- */
  add({ id: 'kalion_finance', name: '財務局', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKK_>__KKK#', '#__________#', '#_TTTT_tt__#', '#__________#', '#_t_____t__#', '#__________#', '#KK______KK#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 10, to: 'kalion_city', tx: 12, ty: 8 }, { x: 5, y: 1, to: 'kalion_archive_1', tx: 1, ty: 1, needFlag: 'elna_rescued' }],
    chests: [{ id: 'kf1', x: 9, y: 8, gold: 400 }],
    events: [
      { x: 2, y: 5, type: 'inspect', solid: false, text: ['帳簿係の机。「魔災復興税 納付台帳」。名前の横に、没収した家や店が記されている。'] },
      { x: 8, y: 5, type: 'learn', solid: false, learnId: 'learn_record' }
    ],
    npcs: [
      { id: 'kf_clerk', x: 3, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) {
        if (c.flag('ledger_1')) { await c.say('財務局の書記', [c.flag('kalion_reformed') ? '返還令の執行で手が足りない。……でも、初めて「返す」仕事をしている。' : '監査官殿の机の記録……持って行ったのか。局長に知られたら、私も終わりだ。']); return; }
        if (!c.flag('elna_rescued')) { await c.say('財務局の書記', ['財務局だ。納税の相談は窓口へ。……エルナ？ 知らない。そんな名前の職員はいない。', '（書記は帳簿で顔を隠した）']); return; }
        await c.say('財務局の書記', ['エ、エルナ……！ ここに来てはいけない。局長が……', '……あなたの机は、そのままにしてある。誰も触っていない。急いで。']);
        await c.say('エルナ', ['私の机の引き出し。二重底に、照合用の記録を隠しておいた。']);
        c.give('ledger_record', 1); c.setFlag('ledger_1', true); await c.msg(['黒い帳簿の記録（財務局の照合記録）を手に入れた！（' + (root.State.data.inventory.ledger_record || 0) + '/3）', '地下記録庫への階段（奥）が使えるようになった。']);
      } },
      { id: 'kf_hald', x: 8, y: 2, sprite: 'king', dir: 'down', wander: 0, hideIf: 'hald_confronted', talk: async function (c) {
        if ((root.State.data.inventory.ledger_record || 0) < 3) { await c.say('財務局長ハルド', ['私はハルド、財務局長だ。納税は義務であり、復興は希望だ。……用がないなら帰りたまえ。', (c.flag('elna_rescued') ? 'エルナ……君が逃げた帳簿は、どうせ誰にも読めん。' : '')].filter(Boolean)); return; }
        await c.say('財務局長ハルド', ['……三つの記録を揃えたか。存在しない復興事業、鉱山の魔物への送金、研究施設への支出。', '認めよう。だがそれは大宰相の命令だ。私はただ、国を守るための帳簿を書いた。', '衛兵！ この者たちを拘束しろ！']);
        var r = await c.battle(['federal_captain', 'federal_soldier', 'federal_soldier'], { boss: true }); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
        await c.msg(['ハルドは混乱に乗じて窓から逃げた。「王都へ……大宰相殿に……」']);
        c.setFlag('hald_confronted', true); c.setFlag('lab_known', true);
        await c.say('エルナ', ['逃げたわね。王都セントラ、大宰相セヴランのもとへ。', '記録は揃った。……問題は、これをどう使うか。一度に公開すれば、南区は暴動になる。監察官リーヴに託せば時間がかかる。被害者に直接返せば、政府は記録ごと消しに来る。']);
        var a = await c.choice('証拠をどう扱う？', ['公開する（広場に貼り出す）', '監察官リーヴに託す', '被害者に直接渡す']);
        root.State.data.flags.kalion_choice = a < 0 ? 1 : a; c.setFlag('kalion_choice_done', true);
        if (a === 0) { await c.msg(['夜のうちに、広場の告示板に記録の写しが貼り出された。', '翌朝、南区は騒然となった。兵と住民が睨み合い、一部で小競り合いが起きた。……だが、もう誰も「復興事業」を信じていない。']); c.setFlag('kalion_unrest', true); }
        else if (a === 1) { await c.msg(['記録は監察官リーヴのもとへ運ばれた。リーヴは王都で正式な監査を開くと約束した。', '時間はかかる。だが、記録は制度の中で生き続ける。']); }
        else { await c.msg(['記録の写しが、没収された人々の手に渡った。', '人々は自分の名前と、奪われた額を初めて知った。兵が写しを回収に来たが、もう遅かった——写しは何十枚にも増えていた。']); }
        await c.say('エルナ', ['どの道も正解じゃない。でも、記録は残った。', '次は王都。大宰相セヴランに、この帳簿を読ませる。']);
        c.give('audit_ledger', 1); await c.questComplete('main_6'); c.setFlag('kalion_capital_open', true); if (!c.questActive('main_7') && !c.questDone('main_7')) c.questStart('main_7');
      } },
      { id: 'kf_riev', x: 8, y: 8, sprite: 'guard', dir: 'down', wander: 0, showIf: 'sevran_fallen', hideIf: 'kalion_reformed', talk: async function (c) {
        if (!c.has('restitution_order')) { await c.say('監察官リーヴ', ['財産返還令はまだ王都にある。王宮で受け取ってきてくれ。']); return; }
        await c.say('監察官リーヴ', ['財産返還令……大宰相の失脚は本当だったか。', 'これより返還を執行する。帳簿の名前の持ち主に、記録された財産を返す。全部は戻らない。使われた分は、もうない。', 'だが、記録がある限り、返す順番は決められる。']);
        await c.msg(['財務局の前に人々が集まった。名前が読み上げられ、権利書と金貨が返されていく。', '泣く者、怒る者、黙って受け取る者。……兵士たちは武器を置き、列の整理を始めた。']);
        c.take('restitution_order', 1); c.setFlag('kalion_reformed', true);
        await c.remark('elna', ['……帳簿の最後の行を、自分で書けた。', 'これからの帳簿は、名前から書く。額はその後。'], 'elna_remark_reform');
        await c.questComplete('main_7');
        await c.msg(['徴収都市カリオンの政府が改革された。兵の監視が消え、自治組織と新しい商人が現れ、一部の住民は不安を口にしている……']);
      } }
    ] });

  /* ---------- 税務庁舎 ---------- */
  add({ id: 'kalion_tax', name: '税務庁舎', kind: 'interior', bgm: 'town', rows: [
    '############', '#TTTTTTTTTT#', '#__________#', '#__________#', '#_t_t_t_t__#', '#__________#', '#KK______KK#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'kalion_city', tx: 34, ty: 8 }],
    npcs: [
      { id: 'kt_clerk', x: 3, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { if (c.flag('kalion_reformed')) await c.say('税務の窓口', ['税率は自治組織と連邦の協議で決まるようになった。……協議は毎回もめる。', 'でも「何に使うか」が先に決まって、額はその後。順番が逆になった。']); else await c.say('税務の窓口', ['魔災復興税の納付ですね。所得の三割、または相当する財産を。', '使い道？ 復興事業です。詳細は……財務局に。']); } },
      { id: 'kt_waiting', x: 8, y: 5, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('順番待ちの男', ['三時間待って、「書類が足りない」と言われた。', '足りない書類を取りに行く間に、家が没収されてた。笑えるだろ。']); } }
    ] });

  /* ---------- 地下記録庫 1階・2階 ---------- */
  add({ id: 'kalion_archive_1', name: '地下記録庫 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '############################',
    '#<___K____#_______K__K____#',
    '#____K____#_______K__K____#',
    '#_KK_____##__#######______#',
    '#________#___#_____#______#',
    '#__#######___#_KK__#_###__#',
    '#__#_________#_____#_#____#',
    '#__#_KKK_____#__K__#_#_KK_#',
    '#__#_________#_____#_#____#',
    '#__######____###_###_#____#',
    '#________________________>#',
    '############################'
  ],
  warps: [{ x: 1, y: 1, to: 'kalion_finance', tx: 5, ty: 2 }, { x: 25, y: 10, to: 'kalion_archive_2', tx: 1, ty: 1 }],
  chests: [{ id: 'ka1', x: 6, y: 7, item: 'hi_ether', qty: 1 }, { id: 'ka2', x: 16, y: 4, gold: 700 }, { id: 'ka3', x: 24, y: 7, item: 'silk_robe', qty: 1 }],
  events: [{ x: 16, y: 7, type: 'inspect', solid: false, text: ['棚の記録：「復興事業 第4期 支出 12,400」。宛先は空欄。', '別の棚：「鉱山地帯 鉱石輸送契約 ——鉄冠将軍府」。政府が魔物と契約している……'] }],
  encounters: { rate: 0.04, zones: [{ name: '地下記録庫', test: function () { return true; }, groups: [['paper_wraith', 'paper_wraith'], ['ledger_mimic'], ['archive_golem'], ['paper_wraith', 'ledger_mimic'], ['bat', 'bat', 'paper_wraith']], level: 14 }] } });
  add({ id: 'kalion_archive_2', name: '地下記録庫 2階（黒い帳簿）', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    '####################',
    '#<_____#___________#',
    '#_KK___#__KKKKKK___#',
    '#______#___________#',
    '#__##__####__#######',
    '#__#_______________#',
    '#__#__KK_____KK____#',
    '#__#_______________#',
    '#__#______i_i______#',
    '#__#_______________#',
    '####################'
  ],
  warps: [{ x: 1, y: 1, to: 'kalion_archive_1', tx: 24, ty: 10 }],
  chests: [{ id: 'kb1', x: 17, y: 2, item: 'phoenix_feather', qty: 1 }],
  events: [
    { x: 11, y: 7, type: 'boss', solid: false, doneFlag: 'ledger_3', enemy: 'boss_ledger_guardian', intro: ['黒い帳簿の台座の前に、文字の刻まれた巨人が立ち上がった。', '帳簿の守護者「記録ハ変エラレヌ。読ム者ハ、記録ニ記サレル」'], after: ['巨人は崩れ、台座の黒い帳簿が開いた。', '「復興事業」の正体：鉱山の魔物への送金、研究施設「ゼロメア計画」への支出、そして大宰相の私邸の改築費。', '黒い帳簿の記録を手に入れた！'], reward: { item: 'ledger_record', qty: 1 } },
    { x: 5, y: 8, type: 'learn', solid: false, learnId: 'practice_archive' }
  ],
  encounters: { rate: 0.035, zones: [{ name: '地下記録庫', test: function () { return true; }, groups: [['archive_golem', 'paper_wraith'], ['ledger_mimic', 'ledger_mimic'], ['archive_golem']], level: 15 }] } });

  /* ---------- 秘密研究所（ハルドとの対峙後に場所が判明。任意） ---------- */
  add({ id: 'kalion_lab', name: '秘密研究所', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '############', '#KK__XX__KK#', '#__________#', '#_T______T_#', '#__________#', '#__i____i__#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 9, to: 'world_kalion', tx: 92, ty: 54 }],
    chests: [{ id: 'kl1', x: 2, y: 7, item: 'elixir', qty: 1 }, { id: 'kl2', x: 9, y: 7, item: 'sage_staff', qty: 1 }],
    events: [{ x: 5, y: 2, type: 'inspect', solid: false, text: ['研究記録：「均衡のクリスタルの欠片は、人の恐怖と欲望に反応して魔物を生む。鉱石を流し込めば、反応を制御できる」', '「制御の演算は、島の演算機構〈オラクル〉に委託する。大宰相殿の承認済み」', '……政府の秘密研究は、海の向こうの島の「AI」につながっている。'], onceFlag: 'lab_seen' }],
    npcs: [{ id: 'kl_researcher', x: 8, y: 3, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('残された研究員', ['みんな王都へ逃げた。私は……記録を消す勇気も、残す勇気もなかった。', '欠片を研究したのは、魔物を減らすためだった。本当だ。でも結果は、魔物を「管理」する政府を作っただけだった。']); await c.remark('seris', ['師の名前が……。この演算の理論、私の師テオドルのものだ。', '島の〈オラクル〉。……行かなければ。いつか必ず。'], 'seris_remark_lab'); } }] });

  K.shopInterior('kalion_weapon', 'カリオン武器店', 'kalion_city', 39, 19, 'merchant', 'weapon', ['iron_sword', 'steel_sword', 'knight_sword', 'iron_spear', 'halberd', 'battle_axe', 'long_bow', 'sage_staff', 'holy_mace', 'iron_claw', 'assassin_dagger'], ['連邦の武器商だ。税込みの値段だよ。']);
  K.shopInterior('kalion_armor', 'カリオン防具店', 'kalion_city', 39, 26, 'merchant', 'armor', ['chain_mail', 'iron_armor', 'knight_armor', 'scale_armor', 'ninja_garb', 'silk_robe', 'sage_robe', 'iron_shield', 'knight_shield', 'iron_helm', 'knight_helm', 'wizard_hat'], ['防具は命を守る。税は……守ってくれないがな。']);
  K.shopInterior('kalion_item', '配給商店', 'kalion_city', 7, 19, 'merchant', 'item', ['herb', 'potion', 'hi_potion', 'ether', 'antidote', 'calm_water', 'wake_bell', 'escape_wing', 'tent'], ['配給証がなくても、旅人には売っていい決まりだ。']);
  K.innInterior('kalion_inn', '徴収都市の宿', 'kalion_city', 7, 26, 40);
  K.churchInterior('kalion_church', 'カリオン教会', 'kalion_city', 23, 26);
  add({ id: 'kalion_tavern', name: '裏通りの酒場', kind: 'interior', bgm: 'tavern', rows: [
    '############', '#TTTTT_____#', '#__________#', '#_t__t__t__#', '#__________#', '#_t__t__t__#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'kalion_city', tx: 23, ty: 19 }],
    npcs: [
      { id: 'kv_bartender', x: 2, y: 2, sprite: 'bartender', dir: 'down', wander: 0, talk: async function (c) { await c.tavern(); } },
      { id: 'kv_drunk', x: 8, y: 4, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { await c.say('酔った男', ['復興事業ってのはな、どこにもねえんだよ。俺は運送屋だ。鉱石を「砦」へ運んだ。帰りは空だ。', '王都の塔？ ありゃ大宰相の私邸だ。……おっと、聞かなかったことにしてくれ。']); } }
    ] });

  /* ---------- 地図から消えた村（サブ） ---------- */
  add({ id: 'erased_village', name: '地図から消えた村', kind: 'town', bgm: 'town', fallback: 'grass', style: 'wood', rows: [
    'fffffffffffrrfffffffffff',
    'f..........rr..........f',
    'f..........rr..........f',
    'f..BBBBBBBBrr.BBBBBBBB.f',
    'f..BBBBBBBBrr.BBBBBBBB.f',
    'f..BBBBBBBBrr.BBBBBBBB.f',
    'f..BBBBBBBBrr.BBBBBBBB.f',
    'f..BBBBBBBBrr.BBBBBBBB.f',
    'f..........rr..........f',
    'f.rrrrrrrrrrrrrrrrrrrr.f',
    'f.rrrrrrrrrrrrrrrrrrrr.f',
    'f..BBBBBB..rr..BBBBBB..f',
    'f..BBBBBB..rr..BBBBBB..f',
    'f..BBBBBB..rr..BBBBBB..f',
    'f..BBBBBB..rr..BBBBBB..f',
    'f.........jrr..........f',
    'f.....6....rr...Z.6....f',
    'f..........rr..........f',
    'f..........rr..........f',
    'fffffffffffrrfffffffffff'
  ],
  buildings: [
    { id: 'ev_elder', type: 'elder', name: '村長の家', x: 3, y: 3, w: 8, h: 5, doorX: 3, interior: 'erased_elder', entry: { x: 5, y: 7 } },
    { id: 'ev_house', type: 'house', name: '病人の家', x: 14, y: 3, w: 8, h: 5, doorX: 3, interior: 'erased_house', entry: { x: 5, y: 7 } }
  ],
  warps: [{ x: 11, y: 19, to: 'world_kalion', tx: 42, ty: 46, name: '森へ' }, { x: 12, y: 19, to: 'world_kalion', tx: 42, ty: 46, name: '森へ' }],
  chests: [{ id: 'ev1', x: 20, y: 14, item: 'amulet_life', qty: 1 }],
  npcs: [
    { id: 'ev_child', x: 10, y: 9, sprite: 'child', dir: 'down', wander: 2, talk: async function (c) { await c.say('子ども', ['ここ、地図にないんだよ。だから先生も来ない。お医者さんも来ない。', 'でも、兵隊さんも来ない！']); } },
    { id: 'ev_woman', x: 12, y: 13, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('erased_choice_done')) await c.say('村の女', [root.State.data.flags.erased_choice === 0 ? '記録に戻ったら、薬が届くようになった。……兵も来たけど、今は見回りだけ。' : root.State.data.flags.erased_choice === 1 ? '私たちはこのまま。薬は森の薬草で何とかする。自由と引き換えにね。' : '監察官の保護下、か。帳簿には載ったけど、税は免除。……うまくいくかしら。']); else await c.say('村の女', ['記録から消されたのは十年前。「反逆者の村」と書かれて、ある日地図から消えた。', '物流も医療もない。でも徴収もない。……どっちがいいのか、私にはわからない。']); } }
  ] });
  add({ id: 'erased_elder', name: '村長の家', kind: 'interior', bgm: 'town', rows: [
    '############', '#KK__E___qq#', '#__________#', '#_t________#', '#__________#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'erased_village', tx: 6, ty: 8 }],
    npcs: [{ id: 'ev_elder_npc', x: 5, y: 3, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
      var d = root.State.data;
      if (c.flag('erased_choice_done')) { await c.say('村長', ['……ありがとう。わしらは「いない」ことになっていた。', 'いるかいないかを決めるのが帳簿なら、帳簿を書く手を、わしらも持ちたいものだ。']); return; }
      await c.say('村長', ['よく来なすった。ここは記録から消された村。税を拒んだ罪で、政府の帳簿から村ごと抹消された。', '支援は来ない。医療も物流も。だが監視もない。……病人がいる。薬が要る。', 'あんたは外の人間だ。わしらをどうすべきだと思う？']);
      var opts = ['記録に戻す（支援を受けられるが監視も戻る）', '消えたままにする（自由だが支援はない）'];
      if (c.flag('sevran_fallen')) opts.push('監察官リーヴの保護下で記録に戻す（税免除の特例）');
      var a = await c.choice('村の扱いを決める', opts); if (a < 0) return;
      d.flags.erased_choice = a; c.setFlag('erased_choice_done', true);
      if (a === 0) await c.msg(['村は帳簿に戻された。数日後、薬と教師が来た。そして、兵の見回りも。']);
      else if (a === 1) await c.msg(['村は地図にないままだ。あなたは手持ちの薬を病人に置いていった。']);
      else await c.msg(['監察官リーヴが村を「保護地区」として記録した。税は免除、支援は届く。……前例のない措置だ。うまくいくかは、誰にもわからない。']);
      await c.questComplete('erased_village');
    } }] });
  add({ id: 'erased_house', name: '病人の家', kind: 'interior', bgm: 'town', rows: [
    '############', '#E_____E___#', '#__________#', '#_t________#', '#__________#', '#__________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'erased_village', tx: 17, ty: 8 }],
    npcs: [{ id: 'ev_sick', x: 2, y: 2, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { if (!c.questActive('erased_village') && !c.questDone('erased_village')) { c.questStart('erased_village'); } await c.say('病人', ['ゴホッ……薬は、ない。記録にない村に、薬は来ない。', '……村長に、相談してくれ。わしは、どちらでもいい。']); await c.remark('lina', ['熱が高い……薬草があれば。', '記録にないから薬が来ない。記録にあれば没収される。……どちらも、命を守っていない。'], 'lina_remark_erased'); } }] });

  /* ---------- 王都セントラ ---------- */
  add({ id: 'sentra_capital', name: '王都セントラ', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'C=================BBBBBBBBBBBB=================C',
    'C=================BBBBBBBBBBBB=================C',
    'C=================BBBBBBBBBBBB=================C',
    'C=======y=========BBBBBBBBBBBB==========y======C',
    'C=================BBBBBBBBBBBB=================C',
    'C=================BBBBBBBBBBBB=================C',
    'C=====================rrrr=====================C',
    'C=====================rrrr=====================C',
    'C=====================rrrr=====================C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C==BBBBBBBB=rr========rrrr========rrBBBBBBBB===C',
    'C==BBBBBBBB=rr========rrrr========rrBBBBBBBB===C',
    'C==BBBBBBBB=rr========rrrr========rrBBBBBBBB===C',
    'C==BBBBBBBB=rr========rrrr========rrBBBBBBBB===C',
    'C==BBBBBBBB=rr========rrrr========rrBBBBBBBB===C',
    'C===========rr========rrrr========rr===========C',
    'C===========rr========rrrr========rr===========C',
    'C==BBBBBBBB=rrBBBBBBBBrrrrBBBBBBBBrrBBBBBBBB===C',
    'C==BBBBBBBB=rrBBBBBBBBrrrrBBBBBBBBrrBBBBBBBB===C',
    'C==BBBBBBBB=rrBBBBBBBBrrrrBBBBBBBBrrBBBBBBBB===C',
    'C==BBBBBBBB=rrBBBBBBBBrrrrBBBBBBBBrrBBBBBBBB===C',
    'C==BBBBBBBB=rrBBBBBBBBrrrrBBBBBBBBrrBBBBBBBB===C',
    'C===========rr========rrrr========rr===========C',
    'C===========rr========rrrr========rr===========C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr=C',
    'C=====================rrrr=====================C',
    'C.....................rrrr.....................C',
    'C.......q.......y.....rrrr....y.......q........C',
    'C.........z...........rrrr..............z......C',
    'C.....q...............rrrr................z....C',
    'C...........z.........rrrr..........q..........C',
    'C.....................rrrr.....................C',
    'CCCCCCCCCCCCCCCCCCCCCCrrrrCCCCCCCCCCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'palace', type: 'castle', name: '王宮', x: 18, y: 1, w: 12, h: 6, doorX: 5, interior: 'sentra_palace_1', entry: { x: 11, y: 12 } },
    { id: 'knights', type: 'guild', name: '騎士団詰所', x: 3, y: 12, w: 8, h: 5, doorX: 3, interior: 'sentra_knights', entry: { x: 5, y: 7 } },
    { id: 'office', type: 'elder', name: '監察官の事務所', x: 36, y: 12, w: 8, h: 5, doorX: 3, interior: 'sentra_office', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '王都の宿', x: 3, y: 19, w: 8, h: 5, doorX: 3, interior: 'sentra_inn', entry: { x: 5, y: 7 } },
    { id: 'tavern', type: 'tavern', name: '王都の酒場', x: 36, y: 19, w: 8, h: 5, doorX: 3, interior: 'sentra_tavern', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '王都の道具店', x: 14, y: 19, w: 8, h: 5, doorX: 3, interior: 'sentra_item', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: '王都の防具店', x: 26, y: 19, w: 8, h: 5, doorX: 3, interior: 'sentra_armor', entry: { x: 5, y: 7 } }
  ],
  warps: [{ x: 22, y: 35, to: 'world_kalion', tx: 64, ty: 28, name: '王都の外へ' }, { x: 23, y: 35, to: 'world_kalion', tx: 64, ty: 28, name: '王都の外へ' }, { x: 24, y: 35, to: 'world_kalion', tx: 64, ty: 28, name: '王都の外へ' }, { x: 25, y: 35, to: 'world_kalion', tx: 64, ty: 28, name: '王都の外へ' }],
  chests: [{ id: 'sc1', x: 44, y: 32, item: 'hi_potion', qty: 2 }],
  events: [{ x: 23, y: 7, type: 'locked', solid: true, doneFlag: 'palace_open', key: 'palace_pass', text: ['王宮の門。親衛隊が固めている。「通行証なき者、立ち入りを禁ず」'] },
    { x: 18, y: 32, type: 'inspect', solid: false, text: ['城壁の外のテント村。没収された家の代わりに、布と木箱で作った家が並ぶ。', '子どもが地面に、自分の家の絵を描いている。'] }],
  npcs: [
    { id: 'sc_guard', x: 24, y: 9, sprite: 'royal_guard', dir: 'down', wander: 0, hideIf: 'sevran_fallen', talk: async function (c) { if (!c.flag('sentra_arrived')) c.setFlag('sentra_arrived', true); await c.say('親衛隊', ['王宮は大宰相セヴラン閣下の執務の場だ。通行証なき者は入れぬ。', '通行証は騎士団長ヴァレン殿が発行する。……発行されたことは、ここ数年ない。']); } },
    { id: 'sc_noble', x: 10, y: 6, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('sevran_fallen')) await c.say('貴族の女', ['セヴラン閣下が……。私たちの屋敷も調べられるのね。', '正直に言うと、ほっとしているの。あの帳簿は、私たちも縛っていたから。']); else await c.say('貴族の女', ['塔が今年も高くなったわ。大宰相閣下の威光ね。', '城壁の外？ 見ないようにしているの。見ると、眠れなくなるから。']); } },
    { id: 'sc_camp_old', x: 8, y: 31, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
      if (c.flag('testimony_1')) { await c.say('テント村の老人', [c.flag('kalion_reformed') ? '返還令で、家の権利書が戻った。家そのものは……もうない。だが名前は戻った。' : '証言はした。あとは、あんたたちが帳簿を読ませてくれ。']); return; }
      if (!c.flag('riev_met')) { await c.say('テント村の老人', ['三十年住んだ家を、帳簿の一行で失った。「納付遅延」の一行でな。', '……監察官？ ああ、リーヴか。あの人は信じていい。事務所は東だ。']); return; }
      await c.say('テント村の老人', ['証言か。……いいだろう。', '没収の日、兵は帳簿を見せなかった。「記録がそうなっている」とだけ。わしは字が読めん。だから、何が書いてあるか確かめることもできなかった。', '読めないことが、罪だったのかな。']);
      c.setFlag('testimony_1', true); await c.msg(['老人の証言を記録した。（証言 ' + ['testimony_1', 'testimony_2', 'testimony_3'].filter(function (f) { return root.State.data.flags[f]; }).length + '/3）']);
      await c.remark('lucia', ['字が読めないことが罪……。師匠は「チャートが読めない者をカモにする者」を一番嫌っていた。', '読める者の責任、か。'], 'lucia_remark_sentra');
    } },
    { id: 'sc_camp_merchant', x: 38, y: 31, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) {
      if (c.flag('testimony_2')) { await c.say('没収された商人', [c.flag('kalion_reformed') ? '店が戻った。在庫は……ない。でも看板は戻った。また始める。' : '証言はした。……店が戻るなら、何でも言うさ。']); return; }
      if (!c.flag('riev_met')) { await c.say('没収された商人', ['店を取られた。「復興税の滞納」だと。滞納なんかしていない。納付書は……兵が持っていった。']); return; }
      await c.say('没収された商人', ['証言？ ああ、する。納付書の控えはここにある。帳簿と照らせば、わしが払っていたことはすぐわかる。', '……払っていたのに、取られた。帳簿が「取れ」と言ったから。']);
      c.setFlag('testimony_2', true); await c.msg(['商人の証言と納付書の控えを記録した。（証言 ' + ['testimony_1', 'testimony_2', 'testimony_3'].filter(function (f) { return root.State.data.flags[f]; }).length + '/3）']);
    } },
    { id: 'sc_ord', x: 13, y: 16, sprite: 'guard', dir: 'down', wander: 0, showIf: 'sevran_fallen', hideIf: 'ord_joined', talk: async function (c) {
      await c.say('騎士オルド', ['……俺はオルド。親衛隊にいた。命令で、城壁の外の家を没収した。', 'ヴァレン団長は言った。「誓いは王にではなく、民に立てるものだ」と。', '俺の誓いを、お前たちに預けたい。償いになるかはわからない。だが剣は、守るために使いたい。']);
      var a = await c.choice('オルドを仲間にしますか？', ['はい', 'いいえ']);
      if (a === 0) { c.join('ord'); c.setFlag('ord_joined', true); await c.msg(['オルドが仲間になった！（誓約騎士）', '転職の条件：オルド加入後、Lv10以上で「誓約騎士」に転職できる']); }
    } },
    { id: 'sc_after1', x: 29, y: 29, sprite: 'villager_m', dir: 'down', wander: 1, showIf: 'kalion_reformed', talk: async function (c) { await c.say('テント村の男', ['返還令が出た。城壁の外のおれたちにも順番が回ってくる。', '……順番を待つ間に、冬が来る。制度ってのは遅い。遅いが、来ないよりはいい。']); } }
  ] });
  // 王宮の門：建物のドアの前に鍵イベントがあるため、ドアのワープはそのまま（通行証で門が開く）
  add({ id: 'sentra_knights', name: '騎士団詰所', kind: 'interior', bgm: 'town', rows: [
    '############', '#II______II#', '#__________#', '#_TTTT_____#', '#__________#', '#_t______t_#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'sentra_capital', tx: 6, ty: 17 }],
    npcs: [
      { id: 'sk_valen', x: 5, y: 2, sprite: 'royal_guard', dir: 'down', wander: 0, talk: async function (c) {
        var d = root.State.data;
        if (c.flag('kyle_oath_done')) { await c.say('騎士団長ヴァレン', [c.flag('sevran_fallen') ? '大宰相は退いた。騎士団は王ではなく民に誓いを立て直す。……カイル、戻ってこいとは言わん。お前の道を行け。' : '通行証は渡した。王宮の奥に、帳簿の中枢がある。親衛隊長ドレクが守っている。']); return; }
        var n = ['testimony_1', 'testimony_2', 'testimony_3'].filter(function (f) { return d.flags[f]; }).length;
        if (n < 3) { await c.say('騎士団長ヴァレン', ['私はヴァレン。騎士団長だ。……王宮の通行証が欲しいのなら、理由を示せ。', '大宰相の帳簿を疑うなら、被害者の証言を三つ持ってこい。騎士の剣は、証拠のないところには抜かん。']); return; }
        await c.say('騎士団長ヴァレン', ['……三つの証言。老人、商人、そして元兵士。', (c.hasCompanion('kyle') && d.party.indexOf('kyle') >= 0) ? 'カイル。お前が来るとはな。迷いの森で部下を失い、騎士団を去った男が。' : '騎士団は大宰相の命令で動いてきた。それを疑えというのか。', '剣で示せ。私を倒せたら、通行証を渡す。倒せぬなら、お前たちの正義もその程度だ。']);
        if (c.hasCompanion('kyle') && d.party.indexOf('kyle') >= 0) await c.say('カイル', ['団長。俺はあの森で学びました。命令に従うことと、正しいことは違う。', '騎士の誓いは王にではなく、民に立てるものだ——それを教えたのは、あなたです。']);
        var r = await c.battle(['boss_valen'], { boss: true }); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
        await c.say('騎士団長ヴァレン', ['……見事だ。', (c.hasCompanion('kyle') && d.party.indexOf('kyle') >= 0) ? 'カイル。民に誓え、と教えたのは私だ。そして私は、王にしか誓えなかった。……行け。お前が正しい。' : '騎士団は大宰相の剣だった。今日から、民の盾になる。', '王宮の通行証だ。帳簿の中枢を止めろ。セヴラン閣下は……お前たちと話すだろう。あの人は、話を聞く人だ。聞いた上で、間違える人だが。']);
        c.give('palace_pass', 1); c.setFlag('kyle_oath_done', true); await c.msg(['王宮の通行証を手に入れた！']);
        if (c.hasCompanion('kyle')) { c.setFlag('kyle_oath_event', true); await c.questComplete('kyle_oath'); }
      } },
      { id: 'sk_knight', x: 8, y: 6, sprite: 'guard', dir: 'down', wander: 1, talk: async function (c) { await c.say('若い騎士', ['団長は毎晩、城壁の外を見に行く。見るだけで、何もしない。……いや、できない。', '騎士団の剣は王のもの。そう教えられた。']); } }
    ] });
  add({ id: 'sentra_office', name: '監察官の事務所', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKK____KKK#', '#__________#', '#_TTT______#', '#__________#', '#_t________#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'sentra_capital', tx: 39, ty: 17 }],
    npcs: [{ id: 'so_riev', x: 3, y: 2, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) {
      var d = root.State.data;
      if (c.flag('kalion_reformed')) { await c.say('監察官リーヴ', ['返還は続いている。終わるには何年もかかる。', '次は制度だ。誰も独り占めできない帳簿の書き方を、自治組織と作る。']); return; }
      if (c.flag('sevran_fallen')) { await c.say('監察官リーヴ', ['財産返還令……。徴収都市の財務局へ運んでくれ。私も向かう。']); return; }
      if (!c.flag('riev_met')) { c.setFlag('riev_met', true); await c.say('監察官リーヴ', ['監察官リーヴだ。' + (d.flags.kalion_choice === 1 ? 'エルナの記録は受け取った。正式な監査を開く準備をしている。' : 'カリオンの件は聞いている。'), '大宰相を正式に問うには、帳簿だけでなく被害者の証言が要る。城壁の外の老人、没収された商人、そして酒場にいる元兵士。三人の証言を集めてくれ。', '証言が揃えば、騎士団長ヴァレンも動く。あの人は証拠のないところでは剣を抜かない男だ。']); if (!c.questActive('main_7') && !c.questDone('main_7')) c.questStart('main_7'); return; }
      var n = ['testimony_1', 'testimony_2', 'testimony_3'].filter(function (f) { return d.flags[f]; }).length;
      await c.say('監察官リーヴ', [n >= 3 ? '証言が三つ揃った。騎士団詰所のヴァレンへ。通行証を出させろ。' : '証言は ' + n + '/3。城壁の外の老人、没収された商人、酒場の元兵士だ。']);
    } }] });
  add({ id: 'sentra_tavern', name: '王都の酒場', kind: 'interior', bgm: 'tavern', rows: [
    '############', '#TTTTT_____#', '#__________#', '#_t__t__t__#', '#__________#', '#_t__t__t__#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'sentra_capital', tx: 39, ty: 24 }],
    npcs: [
      { id: 'st_bartender', x: 2, y: 2, sprite: 'bartender', dir: 'down', wander: 0, talk: async function (c) { await c.tavern(); } },
      { id: 'st_exsoldier', x: 8, y: 4, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) {
        if (c.flag('testimony_3')) { await c.say('元兵士', ['証言はした。……これで少しは、眠れるかもしれん。']); return; }
        if (!c.flag('riev_met')) { await c.say('元兵士', ['俺は親衛隊だった。没収の現場に何度も立った。……飲まなきゃやってられん。']); return; }
        await c.say('元兵士', ['証言……。ああ、する。俺が没収した家は三十二軒。全部覚えてる。', '帳簿には「納付遅延」とあった。だが現場で納付書を見せられたことが何度もある。俺は「記録が優先だ」と言った。……言わされたんじゃない。俺が言ったんだ。']);
        c.setFlag('testimony_3', true); await c.msg(['元兵士の証言を記録した。（証言 ' + ['testimony_1', 'testimony_2', 'testimony_3'].filter(function (f) { return root.State.data.flags[f]; }).length + '/3）']);
        await c.remark('kyle', ['「言わされたんじゃない、俺が言った」……。', 'それを言えるようになるまで、俺は何年かかった。'], 'kyle_remark_tavern');
      } }
    ] });
  K.innInterior('sentra_inn', '王都の宿', 'sentra_capital', 6, 24, 60);
  K.shopInterior('sentra_item', '王都の道具店', 'sentra_capital', 17, 24, 'merchant', 'item', ['herb', 'potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'calm_water', 'phoenix_feather', 'tent', 'escape_wing'], ['王都の品はひと味違うよ。値段もね。']);
  K.shopInterior('sentra_armor', '王都の防具店', 'sentra_capital', 29, 24, 'merchant', 'armor', ['iron_armor', 'knight_armor', 'ninja_garb', 'sage_robe', 'knight_shield', 'knight_helm', 'wizard_hat', 'ring_guard', 'ring_speed', 'amulet_mind'], ['親衛隊御用達だ。……元、だがね。']);

  /* ---------- 王宮 1階 ---------- */
  add({ id: 'sentra_palace_1', name: '王宮', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCC',
    'C::I::::::::::::::::I::C',
    'C::::::::::::::::::::::C',
    'C::I:::CCCCCCCC::::::I:C',
    'C::::::C::::::C::::::::C',
    'C::I:::C::pp::C::::::I:C',
    'C::::::C::pp::C::::::::C',
    'C::I:::C::pp::C::::::I:C',
    'C::::::CCC::CCC::::::::C',
    'C:::::::::pp:::::::::::C',
    'C::I::::::pp:::::::::I:C',
    'C::::::::::::::::::::::C',
    'C::I::::::pp:::::::::I:C',
    'CCCCCCCCCCCDDCCCCCCCCCCC'
  ],
  warps: [{ x: 11, y: 13, to: 'sentra_capital', tx: 23, ty: 8 }, { x: 12, y: 13, to: 'sentra_capital', tx: 23, ty: 8 }, { x: 11, y: 5, to: 'sentra_palace_2', tx: 7, ty: 10 }],
  chests: [{ id: 'sp1', x: 2, y: 2, item: 'knight_armor', qty: 1 }, { id: 'sp2', x: 21, y: 11, gold: 1200 }],
  events: [{ x: 11, y: 9, type: 'boss', solid: false, doneFlag: 'royal_captain_defeated', enemies: ['boss_royal_captain', 'royal_guard'], intro: ['玉座の間の前。鎧の男が立ちはだかる。', '親衛隊長ドレク「ここから先は、大宰相閣下の帳簿の間。生きて帰った者はいない」'], after: ['ドレクは膝をついた。「……閣下に、伝えろ。帳簿は、もう守れぬと」', '奥の扉が開いている。'] }],
  encounters: { rate: 0.035, zones: [{ name: '王宮', test: function () { return true; }, groups: [['royal_guard'], ['royal_guard', 'royal_guard'], ['royal_guard', 'federal_soldier'], ['coin_golem', 'royal_guard']], level: 16 }] } });
  /* ---------- 王宮 帳簿中枢・玉座の間 ---------- */
  add({ id: 'sentra_palace_2', name: '帳簿中枢・玉座の間', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    'CCCCCCCCCCCCCCC',
    'C:::::XXX:::::C',
    'C::I::XXX::I::C',
    'C:::::::::::::C',
    'C:::::ppp:::::C',
    'C::I::ppp::I::C',
    'C:::::ppp:::::C',
    'C:::::ppp:::::C',
    'C::I::ppp::I::C',
    'C:::::ppp:::::C',
    'CCCCCCCpCCCCCCC'
  ],
  warps: [{ x: 7, y: 10, to: 'sentra_palace_1', tx: 11, ty: 6 }],
  chests: [{ id: 'sp3', x: 12, y: 1, item: 'elixir', qty: 1 }],
  events: [
    { x: 7, y: 5, type: 'boss', solid: false, doneFlag: 'ledger_core_stopped', enemy: 'boss_ledger_core', intro: ['部屋の中央に、脈打つ結晶の機構。住民の財産を記録する魔法帳簿の中枢だ。', '機構の表面に、何千という「額」が流れている。名前は、ひとつもない。'], after: ['機構は光を失い、流れていた数字が止まった。', '帳簿中枢は停止した。……玉座の奥から、拍手が聞こえる。'] }
  ],
  npcs: [{ id: 'sp_sevran', x: 7, y: 3, sprite: 'king', dir: 'down', wander: 0, showIf: 'ledger_core_stopped', hideIf: 'sevran_fallen', talk: async function (c) {
    var d = root.State.data;
    await c.say('大宰相セヴラン', ['よく来た。帳簿を止めたな。……明日から、この国の徴収は止まる。魔物への送金も、研究所への支出も。', '私は大飢饉で家族を失った。自由を与えれば人は欲望に走り、また飢饉が起こる。だから私は、すべてを帳簿で管理した。少数の犠牲で、多数の秩序を買った。', 'それが間違いだと言うのか？ お前たちは、帳簿のない世界で、誰が飢えるかを決められるのか？']);
    var a = await c.choice('セヴランに答える', ['「誰も決めなくていい。決めるのは、本人だ」', '「あなたの帳簿には、名前がなかった」', '「あなたも、誰かに使われている」']);
    if (a === 0) await c.say('大宰相セヴラン', ['……本人が決める、か。本人が間違えたら？', '（長い沈黙）……間違える権利、か。私は、それを奪ったのだな。']);
    else if (a === 1) await c.say('大宰相セヴラン', ['名前……。ああ、そうだ。額だけを見ていた。名前を見れば、手が止まるからだ。', '止まるべきだったのだな。最初の一人で。']);
    else await c.say('大宰相セヴラン', ['……気づいていたか。研究所の演算は、海の向こうの島に委託していた。〈オラクル〉という演算機構だ。', '私が帳簿で管理した「すべて」は、あの機構の計算の一部だった。私もまた、誰かの帳簿の一行だったわけだ。']);
    await c.say('大宰相セヴラン', ['秘密研究のことを話そう。クリスタルの欠片の研究、鉱山の魔物との契約、そして——島のAI〈オラクル〉。すべてはつながっている。', '私を裁け。追放でも、牢でもいい。だが帳簿を壊すだけでは、次の私が現れる。制度を作れ。誰も独り占めできない制度を。']);
    var b = await c.choice('セヴランの処遇', ['正式な裁判にかける（監察官リーヴに引き渡す）', '追放する', '改革の実務に協力させる（監視付き）']);
    d.flags.sevran_choice = b < 0 ? 0 : b; c.setFlag('sevran_fallen', true); c.setFlag('zeromea_hint', true);
    await c.msg([b === 1 ? 'セヴランは王都を追われた。彼は最後に、城壁の外のテント村を長く見つめていた。' : b === 2 ? 'セヴランは監視付きで返還の実務に加わった。帳簿を一番よく知る男が、帳簿を返す側に立った。' : 'セヴランは監察官リーヴに引き渡された。裁判は公開で行われることになった。', '大宰相が発した最後の文書——「財産返還令」を受け取った。徴収都市の財務局で執行できる。']);
    c.give('restitution_order', 1);
    await c.remark('elna', ['帳簿を壊すだけでは次の私が現れる……。その通りよ。', '私たちが作るのは、制度。誰も独り占めできない帳簿。'], 'elna_remark_sevran');
    await c.remark('seris', ['〈オラクル〉……。師の理論が、海の向こうで「すべて」を計算している。', '行かなければならない。いつか、必ず。'], 'seris_remark_sevran');
  } }],
  encounters: null });
})(typeof window !== 'undefined' ? window : globalThis);
