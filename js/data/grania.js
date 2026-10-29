/* =========================================================
   Data / Grania (v5.0 第5章) : 灰鉱町ヴェルム・鉄鎖鉱山・灰の浜の番小屋・鉄冠将軍の砦（封鎖）
   第5章「鉄鎖の町を解放せよ」（main_5）の流れ：
     1. 船でグラニア西岸に上陸 → 灰の浜の番小屋（物流の話）→ 灰鉱町ヴェルム（監督官の支配：配給所は閉鎖、館は門番）
     2. 宿舎で労働者から「地下の抵抗組織」を聞く → 隠し階段 → 抵抗組織のハルト → 鉱山の労働者救出を頼まれる（資金管理の試練もここ）
     3. 鉄鎖鉱山 1階：鎖につながれた労働者3人を看守から救う（verum_rescued 3）→ 2階：看守長から鉱山の鍵 → 3階：監督官ザルグ（ボス）
     4. 監督官を倒す → 鉄冠将軍グロートが姿を見せ去る → 監督官の印章で館・配給所が開く
     5. 復興：帳簿の切れ端×3（証拠）→ 物資の注文書を灰の浜へ → 自治組織の代表を選ぶ → 町の解放（verum_liberated、main_5 達成）
     6. 解放後：市場再開、学校、住民の会話の変化。ガルドの個別イベント（宿舎：告白と再会）
   ・状態による変化は NPC の showIf / hideIf とフラグで表現（描画側に条件分岐を持ち込まない）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;

  /* ---------- 灰の浜の番小屋（上陸地点の目印） ---------- */
  add({ id: 'ash_shore_hut', name: '灰の浜の番小屋', kind: 'interior', bgm: 'town', rows: [
    '############', '#K__E___qq_#', '#__________#', '#_t________#', '#______zz__#', '#__________#', '#_q________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'world_grania', tx: 34, ty: 53 }],
    chests: [{ id: 'ash1', x: 9, y: 6, item: 'antidote', qty: 3 }],
    npcs: [{ id: 'shore_keeper', x: 5, y: 3, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) {
      if (c.has('supply_order')) { await c.say('浜の番人ロウ', ['物資の注文書……マリナの商人の印がある。本当に食料と薬を運べるのか。', '……わかった。次の船便で運ぶ。町の連中に「浜に灯りが戻る」と伝えてくれ。']); c.take('supply_order', 1); c.setFlag('verum_supply_done', true); await c.msg(['物資の注文書を渡した。浜の番人が船便の手配を始めた。']); if (c.questActive('verum_supply')) await c.questComplete('verum_supply'); return; }
      if (c.flag('verum_liberated')) { await c.say('浜の番人ロウ', ['マリナからの船が週に一度来るようになった。灰の浜に、また灯りがともる。']); return; }
      if (c.flag('verum_overseer_defeated')) { await c.say('浜の番人ロウ', ['監督官が倒れたと聞いた。だが町には食い物がない。', '物流を戻すには、商人の注文書が要る。抵抗組織のハルトなら書けるはずだ。']); return; }
      await c.say('浜の番人ロウ', ['ここはグラニア鉱業地方の西岸だ。東の道を行けば灰鉱町ヴェルム。……行くなら覚悟しろ。', '町は魔物の監督官に支配されてる。働いても賃金は「魔災税」で消え、逃げれば鎖の猟犬に追われる。', '昔は船が来て、物が動いてた。今は誰も来ない。物が動かなきゃ、人は生きられねえ。']);
      if (!c.flag('verum_arrived')) { c.setFlag('verum_arrived', true); await c.remark('gald', ['……煙だ。町が煙の下にある。おれが出て行った時と同じだ。', '変わってねえ。いや、もっと悪くなってる。'], 'gald_remark_arrive'); }
    } }] });

  /* ---------- 灰鉱町ヴェルム（48×36） ---------- */
  // 地面：8 灰 / = 石畳 / r 道 / x 柵 / y 街灯 / i 松明 / z 木箱 / q 樽 / H 畑（枯れ） / 6 枯れ木
  add({ id: 'verum_town', name: '灰鉱町ヴェルム', kind: 'town', bgm: 'town', fallback: 'ash', style: 'stone', plaza: null, rows: [
    'xxxxxxxxxxxxxxxxxxxxxxrrrrxxxxxxxxxxxxxxxxxxxxxx',
    'x8888888888888888888888rrrr8888888888888888888888x',
    'x88BBBBBBBBBB88888888888rrrr88888888BBBBBBBBBB888x',
    'x88BBBBBBBBBB8888z888888rrrr88888888BBBBBBBBBB888x',
    'x88BBBBBBBBBB888zz88888rrrr888888888BBBBBBBBBB888x',
    'x88BBBBBBBBBB88888888888rrrr88888888BBBBBBBBBB888x',
    'x88BBBBBBBBBB8888888888rrrr88y888888BBBBBBBBBB888x',
    'x88BBBBBBBBBB88888888888rrrr88888888BBBBBBBBBB888x',
    'x8888888888888888888888rrrr888888888888888888888x',
    'x888rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr8888x',
    'x888r88888888888888888888888888888888888888r8888x',
    'x888r88888888888888888888y8888888888888888r8888x',
    'x888r888BBBBBBBB88888888888888888888888888r8888x',
    'x888r888BBBBBBBB8888888888888888BBBBBBBB88r8888x',
    'x888r888BBBBBBBB88888888888888888BBBBBBBB8r8888x',
    'x888r888BBBBBBBB8888888888888888BBBBBBBB88r8888x',
    'x888r888BBBBBBBB88888888888888888BBBBBBBB8r8888x',
    'x888r888BBBBBBBB8888888888888888BBBBBBBB88r8888x',
    'x888r8888888888888y8888888888888888888888r8888x',
    'x888rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr8888x',
    'x88888888888888888888888rr88888888888888888888888x',
    'x888888888888888888888888rr8888888888888888888888x',
    'x88BBBBBBBB8888888888888rr8888888HHHHHH888888888x',
    'x88BBBBBBBB8888888888888rr8888888HHHHHH888888888x',
    'x88BBBBBBBB8888888888888rr8888888HHHHHH888888888x',
    'x88BBBBBBBB88888888888888rr888888888888888888888x',
    'x88BBBBBBBB8888888888888rr8888BBBBBBBB8888888888x',
    'x88BBBBBBBB8888888888888rr8888BBBBBBBB8888888888x',
    'x8888888888888888888888rr88888BBBBBBBB8888888888x',
    'x8888y8888888888888888888rr888BBBBBBBB8888888888x',
    'x8888888888888888888888rr8888BBBBBBBB88888888888x',
    'x88888888888888888888888rr88888888888888888888888x',
    'x888888888888888888888888rr8888888888888888888888x',
    'x8888888888888888888888rrrr88888888888888888888888x',
    'x8888888888888888888888rrrr88888888888888888888888x',
    'xxxxxxxxxxxxxxxxxxxxxxxrrrrxxxxxxxxxxxxxxxxxxxxxxx'
  ],
  buildings: [
    { id: 'factory', type: 'warehouse', name: '鉱石工場', x: 3, y: 2, w: 10, h: 6, doorX: 5, interior: 'verum_factory', entry: { x: 5, y: 10 } },
    { id: 'overseer', type: 'bank', name: '監督官の館', x: 36, y: 2, w: 10, h: 6, doorX: 4, interior: 'verum_overseer_house', entry: { x: 5, y: 10 } },
    { id: 'dorm', type: 'house', name: '労働者の宿舎', x: 8, y: 12, w: 8, h: 6, doorX: 4, interior: 'verum_dorm', entry: { x: 5, y: 10 } },
    { id: 'ration', type: 'item', name: '配給所', x: 32, y: 13, w: 8, h: 5, doorX: 3, interior: 'verum_ration', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '坑夫の宿', x: 3, y: 22, w: 8, h: 6, doorX: 4, interior: 'verum_inn', entry: { x: 5, y: 7 } },
    { id: 'school', type: 'dojo', name: 'ヴェルムの学び舎', x: 30, y: 26, w: 8, h: 5, doorX: 3, interior: 'verum_school', entry: { x: 5, y: 7 }, showIf: 'verum_liberated' }
  ],
  warps: [{ x: 23, y: 35, to: 'world_grania', tx: 56, ty: 59, name: '町の外へ' }, { x: 24, y: 35, to: 'world_grania', tx: 56, ty: 59, name: '町の外へ' }, { x: 25, y: 35, to: 'world_grania', tx: 56, ty: 59, name: '町の外へ' }, { x: 26, y: 35, to: 'world_grania', tx: 56, ty: 59, name: '町の外へ' },
    { x: 22, y: 0, to: 'world_grania', tx: 56, ty: 57, name: '鉱山への道（北門）' }, { x: 23, y: 0, to: 'world_grania', tx: 56, ty: 57, name: '鉱山への道（北門）' }, { x: 24, y: 0, to: 'world_grania', tx: 56, ty: 57, name: '鉱山への道（北門）' }, { x: 25, y: 0, to: 'world_grania', tx: 56, ty: 57, name: '鉱山への道（北門）' }],
  chests: [{ id: 'vt1', x: 44, y: 30, item: 'hi_potion', qty: 2 }],
  events: [{ x: 20, y: 10, type: 'inspect', solid: false, text: ['掲示板：「魔災復興税のお知らせ」', '「鉱石の納入量が足りぬ者は、借金として記録する。逃亡者は鎖の猟犬が追う。——監督官ザルグ」', 'その下に、誰かが小さく書き足している。「数字じゃない。おれたちは数字じゃない」'] },
    { x: 36, y: 23, type: 'inspect', solid: false, text: ['枯れた畑。灰を被って、何も育たない。', '「昔はここで麦が採れたんだ」と、通りがかった老人がつぶやいた。'] }],
  npcs: [
    // --- 監督官の支配下（解放前） ---
    { id: 'vt_gate_warden', x: 24, y: 2, sprite: 'guard', dir: 'down', wander: 0, hideIf: 'verum_overseer_defeated', talk: async function (c) { await c.say('鎖の看守', ['……よそ者か。この町では、働かぬ者に食料はない。', '鉱山へ行け。鉱石を納めれば配給がある。逃げれば猟犬が追う。']); await c.remark('kyle', ['……命令で人を縛る。俺も騎士団にいた頃、同じことをした。', '「正しい命令」なんてものを、あの時は疑わなかった。'], 'kyle_remark_verum'); var a = await c.choice('看守は鎖を鳴らしている。', ['戦う', '引き下がる']); if (a === 0) { var r = await c.battle(['chain_warden', 'mine_imp'], {}); if (r === 'lost') await root.World.gameOver(); else if (r === 'won') await c.msg(['看守は倒れた。だが町にはまだ監督官がいる。']); } } },
    { id: 'vt_house_guard', x: 40, y: 8, sprite: 'guard', dir: 'down', wander: 0, hideIf: 'verum_overseer_defeated', talk: async function (c) { await c.say('館の門番', ['監督官の館だ。労働者は入れん。……お前も、見た目は労働者だな。']); } },
    { id: 'vt_worker1', x: 14, y: 20, sprite: 'villager_m', dir: 'down', wander: 1, hideIf: 'verum_liberated', talk: async function (c) {
      if (c.flag('verum_overseer_defeated')) { await c.say('労働者ダン', ['監督官が……倒れた？ 本当か。', 'だが食い物がない。帳簿も館の中だ。……何から手を付けりゃいいんだ。']); return; }
      await c.say('労働者ダン', ['十二時間掘って、賃金は「魔災税」で消える。足りない分は借金になる。', '借金がある限り、町を出られない。……おれの子は、生まれてから一度も腹いっぱい食ったことがない。']); } },
    { id: 'vt_worker2', x: 30, y: 20, sprite: 'villager_f', dir: 'down', wander: 1, hideIf: 'verum_liberated', talk: async function (c) {
      if (!c.flag('hideout_known')) { await c.say('労働者の妻ミラ', ['……あなた、監督官の手先じゃないわね。目が違う。', '宿舎の奥、一番奥の寝台の下。……夜に、人が集まってる。ハルトという人を訪ねて。']); c.setFlag('hideout_known', true); await c.msg(['宿舎の隠し階段のことを聞いた。']); return; }
      await c.say('労働者の妻ミラ', ['ハルトに会った？ 気をつけて。看守は耳がいい。']); } },
    { id: 'vt_old', x: 36, y: 25, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
      if (c.flag('verum_liberated')) await c.say('老人', ['畑に水を引き直す。灰を取り除くのに何年かかるかわからんが、わしが生きてるうちに麦を見たい。']);
      else await c.say('老人', ['昔は船が来た。麦も、魚も、本も。', '魔物が来てから、鉱石だけが出ていく。入ってくるものは何もない。']); } },
    { id: 'vt_child', x: 19, y: 23, sprite: 'child', dir: 'down', wander: 2, talk: async function (c) {
      if (c.flag('verum_liberated')) await c.say('子ども', ['学び舎ができたんだ！ 字を覚えたら、おとうさんの帳簿をいっしょに読むんだ。']);
      else await c.say('子ども', ['おとうさんは鉱山から帰ってこない。看守が「数字が足りない」って。', '数字ってなに？ おとうさんは数字じゃないよ。']); } },
    // --- 解放後 ---
    { id: 'vt_merchant', x: 22, y: 22, sprite: 'merchant', dir: 'down', wander: 0, showIf: 'verum_liberated', talk: async function (c) { await c.say('マリナの商人', ['船便で来た。食料と薬、それに種もある。', '最初の市だ。値は安くしておく。この町が立ち直れば、おれの商売も立つからな。']); await c.shop('item', ['herb', 'potion', 'hi_potion', 'ether', 'antidote', 'calm_water', 'tent', 'escape_wing']); } },
    { id: 'vt_worker1b', x: 14, y: 20, sprite: 'villager_m', dir: 'down', wander: 1, showIf: 'verum_liberated', talk: async function (c) { await c.say('ダン', ['帳簿のおかげで、奪われた賃金の額がわかった。全部は戻らない。だが「記録がある」だけで、人は前を向ける。', '子どもに腹いっぱい食わせた。……泣いちまったよ。']); } },
    { id: 'vt_worker2b', x: 30, y: 20, sprite: 'villager_f', dir: 'down', wander: 1, showIf: 'verum_liberated', talk: async function (c) { await c.say('ミラ', ['自治会ができた。意見が合わなくて、毎晩言い合いよ。', 'でもね、言い合えるってことが、もう前とは違うの。']); } },
    { id: 'vt_dissent', x: 40, y: 20, sprite: 'villager_m', dir: 'down', wander: 1, showIf: 'verum_liberated', talk: async function (c) { await c.say('不満げな男', ['監督官がいた頃は、少なくとも配給はあった。自由はいいが、明日の飯は誰が保証する？', '……わかってる。それでも、おれは自分で決めたい。決めたいんだが、怖いんだ。']); } }
  ] });

  /* ---------- 宿舎（隠し階段 → 地下の抵抗組織） ---------- */
  add({ id: 'verum_dorm', name: '労働者の宿舎', kind: 'interior', bgm: 'town', rows: [
    '############', '#E_E_E_E_E_#', '#__________#', '#__________#', '#E_E_E_E_E_#', '#__________#', '#q________>#', '#__________#', '#_t______t_#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 10, to: 'verum_town', tx: 12, ty: 19 }, { x: 10, y: 6, to: 'verum_hideout', tx: 2, ty: 1, needFlag: 'hideout_known' }],
    events: [{ x: 10, y: 6, type: 'inspect', solid: false, text: ['一番奥の寝台。……床板が少しずれている。', '（宿舎の人に話を聞けば、何かわかるかもしれない）'] }],
    npcs: [
      { id: 'dorm_sick', x: 2, y: 2, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { if (c.flag('verum_liberated')) await c.say('休んでいる男', ['熱が下がった。マリナの薬が効いた。……久しぶりに、朝が来るのが怖くない。']); else await c.say('休んでいる男', ['ゴホッ……働けない者に配給はない。薬もない。', '……おれの借金は、死んだら帳消しになるのかな。']); } },
      { id: 'dorm_gald_event', x: 7, y: 7, sprite: 'villager_m', dir: 'down', wander: 0, showIf: 'verum_liberated', talk: async function (c) {
        if (!c.hasCompanion('gald')) { await c.say('ベルク', ['昔、ここの監督をしてた男がいた。鞭は持ってたが、一度も振らなかった。……今どこにいるんだろうな。']); return; }
        if (c.flag('gald_confession')) { await c.say('ベルク', ['ガルド。……また来いよ。今度は鞭じゃなく、鍬を持って。']); return; }
        await c.say('ベルク', ['……ガルド？ ガルドじゃないか。お前、監督官の下で働いてた——']);
        await c.say('ガルド', ['ああ。おれは監督だった。鞭を持って、お前たちの前に立ってた。', '守るために従ったつもりだった。おれが監督なら、少なくとも殴る奴はいないと。……でも、おれはお前たちを助けられなかった。']);
        var a = await c.choice('ベルクは黙っている。あなたは——', ['ガルドの言葉を待つ', 'ベルクに、ガルドが戦った理由を伝える']);
        if (a === 1) await c.msg(['あなたはベルクに、ガルドが監督官に挑み、労働者を救うために戦ったことを伝えた。']);
        await c.say('ベルク', ['……知ってるよ。お前が鞭を振らなかったことも、夜に配給をこっそり分けてたことも。', '許すとか許さないとか、そういう話じゃない。おれたちはこれから、自分で決める。お前も、自分で決めろ。']);
        await c.say('ガルド', ['……ああ。決めた。おれはこいつらと世界を回る。そして帰ってくる。今度は、助ける側として。']);
        c.setFlag('gald_confession', true); await c.questComplete('gald_reunion');
      } }
    ] });

  /* ---------- 地下の抵抗組織 ---------- */
  add({ id: 'verum_hideout', name: '地下の集会所', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGG',
    'G<ggggggggggggiG',
    'GggggggttggggggG',
    'GgggKKggggggKKgG',
    'GggggggggggggggG',
    'GgzzgggggggggqgG',
    'GggggggggggggggG',
    'GiggggggggggggiG',
    'GGGGGGGGGGGGGGGG'
  ], warps: [{ x: 1, y: 1, to: 'verum_dorm', tx: 9, ty: 6 }],
    chests: [{ id: 'hd1', x: 13, y: 6, item: 'ether', qty: 2 }],
    events: [{ x: 7, y: 6, type: 'learn', solid: false, learnId: 'learn_risk' }],
    npcs: [
      { id: 'hideout_leader', x: 7, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) {
        var d = root.State.data;
        if (c.flag('verum_liberated')) { await c.say('ハルト', ['自治会は毎晩もめている。だが、もめられるのは生きている証拠だ。', '帳簿は写しを作って、全員が読めるようにした。二度と「数字」に支配されないために。']); return; }
        if (c.flag('verum_council')) { await c.say('ハルト', ['物資と、証拠と、自治会。……揃ったな。', 'これでヴェルムは、監督官なしで回り始める。完全じゃない。それでも、自分たちで決める町だ。']); c.setFlag('verum_liberated', true); await c.msg(['灰鉱町ヴェルムが解放された！ 町の様子が変わっていく……']); await c.questComplete('main_5'); return; }
        if (c.flag('verum_supply_done') && c.flag('verum_evidence')) {
          await c.say('ハルト', ['物資の船便も決まった。証拠も揃った。最後は「誰がこの町を動かすか」だ。', '監督官の代わりに誰か一人を立てるなら、それはまた同じことの繰り返しになる。……あんたはどう思う？']);
          var a = await c.choice('自治組織の形を決める', ['労働者の代表会（合議）', 'ハルトを代表に立てる', '商人と労働者の共同評議会']);
          var names = ['労働者の代表会', 'ハルト代表制', '共同評議会']; d.flags.verum_council_choice = a < 0 ? 0 : a;
          await c.say('ハルト', [a === 1 ? '……おれが代表、か。引き受ける。ただし任期は一年、帳簿は全員に公開する。それが条件だ。' : a === 2 ? '商人も入れるのか。物流を握る者を外に置かない、という考えだな。いい。もめるだろうが。' : '合議か。遅いし、もめる。だが誰も独り占めできない。……それでいこう。']);
          c.setFlag('verum_council', true); await c.msg(['自治組織「' + names[d.flags.verum_council_choice] + '」が発足した。もう一度ハルトに話しかけよう。']); return;
        }
        if (c.flag('verum_overseer_defeated')) {
          await c.remark('gald', ['ハルト……おれはガルドだ。昔、監督をしてた。', '頭を下げてすむ話じゃねえ。だが、この町を回すのに手が要るなら、おれの手を使ってくれ。'], 'gald_remark_hideout');
          if (c.flag('verum_supply_done') && c.questActive('verum_supply')) await c.questComplete('verum_supply');
          if (!c.flag('verum_evidence') && root.State.data.inventory.ledger_page >= 3) { c.setFlag('verum_evidence', true); await c.say('ハルト', ['帳簿の切れ端が三枚……。「魔災税」の名で奪われた額、監督官の懐に入った額、砦へ送られた鉱石の量。全部ここにある。', 'これが証拠だ。奪われた賃金は、この記録を元に少しずつ返していく。']); await c.questComplete('verum_ledger'); }
          else if (!c.flag('verum_evidence')) { await c.say('ハルト', ['監督官を倒したか！ ……だが町はまだ回らない。やることが三つある。', '一つ、奪われた賃金の証拠。監督官の館・工場の事務室・鉱山2階に、帳簿の切れ端が隠されている。三枚集めてくれ。', '二つ、物流。マリナの商人への注文書を書く。灰の浜の番人ロウに渡してくれ。', '三つ、自治。誰がこの町を動かすか、それはあんたと決めたい。']); if (!c.questActive('verum_ledger') && !c.questDone('verum_ledger')) c.questStart('verum_ledger'); if (!c.has('supply_order') && !c.flag('verum_supply_done')) { c.give('supply_order', 1); c.questStart('verum_supply'); await c.msg(['物資の注文書を受け取った。灰の浜の番人ロウに渡そう。']); } }
          else if (!c.flag('verum_supply_done')) { await c.say('ハルト', ['証拠は揃った。あとは物流だ。注文書を灰の浜のロウに。']); if (!c.has('supply_order')) c.give('supply_order', 1); }
          if (c.flag('verum_supply_done') && c.questActive('verum_supply')) await c.questComplete('verum_supply');
          return;
        }
        if (!c.flag('hideout_met')) { c.setFlag('hideout_met', true); await c.say('ハルト', ['……ミラの紹介か。おれはハルト。元は鉱山の測量をしていた。', 'この町は監督官ザルグに支配されている。賃金を「魔災税」で奪い、借金で縛る。逃げた者は猟犬に追われる。', 'だが奴は鉱山の最深部から出てこない。倒すには、まず1階で鎖につながれた仲間を解き、2階の看守長から鍵を奪う必要がある。', '頼む。仲間を救ってくれ。そして……奴を倒したあとのことも、一緒に考えてほしい。倒すだけじゃ、この町は回らない。']); await c.msg(['鉄鎖鉱山の労働者救出を頼まれた。町の北門から鉱山へ向かおう。']); return; }
        var n = d.counters.verum_rescued || 0;
        await c.say('ハルト', [n >= 3 ? '三人とも助かったと聞いた。……ありがとう。あとは監督官だ。2階の看守長から鍵を。' : '救われた仲間は' + n + '人。まだ鎖につながれた者がいる。', 'ここに師匠ハケイの手紙が届いている。「資金管理の試練」——損失を管理する考え方は、この町の再建にも通じると書いてあった。石碑に触れてみるといい。']); } },
      { id: 'hideout_member', x: 12, y: 2, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('抵抗組織の男', ['おれたちは武器を持ってない。持ってるのは帳簿の写しと、数えた数字だけだ。', '監督官は「数字」でおれたちを縛った。だからおれたちも数字で、奴の嘘を暴く。']); } }
    ] });

  /* ---------- 監督官の館（解放前は門番。倒した後は入れる） ---------- */
  add({ id: 'verum_overseer_house', name: '監督官の館', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKK____KKK#', '#__________#', '#_TTTT_____#', '#__________#', '#__t____t__#', '#__________#', '#E________q#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 10, to: 'verum_town', tx: 40, ty: 8 }],
    chests: [{ id: 'oh1', x: 9, y: 2, item: 'ledger_page', qty: 1 }, { id: 'oh2', x: 2, y: 8, gold: 800 }, { id: 'oh3', x: 9, y: 8, item: 'knight_helm', qty: 1 }],
    events: [{ x: 3, y: 2, type: 'inspect', solid: false, text: ['監督官の机。帳簿が広げられたままだ。', '「納入量 不足分は借金に計上。逃亡者 3名 猟犬に処理を命ず」', '「砦への鉱石輸送 今月 4,200。将軍殿は満足されよう」', '……数字の横に、名前は一つも書かれていない。'] }],
    npcs: [{ id: 'oh_clerk', x: 7, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.remark('lucia', ['帳簿の数字は、未来を保証しない。師匠がよく言っていた。', '「波を読む」とは当てることじゃない。数字の向こうにいる人を、見失わないことだ。'], 'lucia_remark_verum'); if (c.flag('verum_liberated')) await c.say('元・帳簿係', ['おれは監督官の帳簿を書いていた。書かされていた、と言いたいが……書いたのはおれの手だ。', '今は自治会の帳簿を書いている。今度は、名前を書く。全員の名前を。']); else await c.say('帳簿係', ['ひっ……監督官はもういない。おれは命じられて書いていただけだ！', '……帳簿の切れ端？ 奥の本棚に隠した。持っていけ。おれには、もう書く手がない。']); } }] });

  /* ---------- 鉱石工場 ---------- */
  add({ id: 'verum_factory', name: '鉱石工場', kind: 'interior', bgm: 'dungeon', rows: [
    '############', '#zzz____zzz#', '#__________#', '#_TT____TT_#', '#__________#', '#qq______qq#', '#__________#', '#__t____t__#', '#__________#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 10, to: 'verum_town', tx: 8, ty: 8 }],
    chests: [{ id: 'fc1', x: 9, y: 7, item: 'ledger_page', qty: 1 }, { id: 'fc2', x: 1, y: 7, item: 'iron_club', qty: 1 }],
    events: [{ x: 5, y: 1, type: 'inspect', solid: false, text: ['砕かれた鉱石が山になっている。淡く赤い光を放つ。', '「均衡のクリスタルへ送る分」と札が付いている。'] }],
    npcs: [
      { id: 'fc_foreman', x: 5, y: 4, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { if (c.flag('verum_liberated')) await c.say('元・工場長', ['工場は止めた。鉱石を砦に送るのはもう終わりだ。', 'これからは道具を作る。鍬と、鍋と、学び舎の机だ。']); else if (c.flag('verum_overseer_defeated')) await c.say('工場長', ['監督官が倒れた……。帳簿の切れ端なら事務室の箱だ。おれが隠した。', 'あれを公開されたら、おれも裁かれる。……それでも、持っていってくれ。']); else await c.say('工場長', ['鉱石を砕き、砦へ送る。それだけの場所だ。質問は受け付けない。', '……働け。数字が足りないと、おれも責められる。']); } },
      { id: 'fc_worker', x: 2, y: 6, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.remark('seris', ['この鉱石……魔力の脈動が、忘却の洞窟の欠片と同じ。', '「均衡のクリスタルへ送る」——魔物が結晶に何かを流し込んでいる。研究者として、見過ごせない。'], 'seris_remark_verum'); if (c.flag('verum_liberated')) await c.say('女工', ['機械を止めた日、はじめて自分の手を見た。傷だらけだった。', '今はこの手で、自分のために働く。']); else await c.say('女工', ['十二時間、鉱石を砕く。手が動かなくなったら配給が減る。', '逃げた妹は……猟犬に。もう、何も考えないようにしてる。']); } }
    ] });

  /* ---------- 配給所（解放前：印章がないと配給なし／解放後：店） ---------- */
  add({ id: 'verum_ration', name: '配給所', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKK_qq_KKK#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#__zz______#', '#__t____t__#', '#__________#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'verum_town', tx: 35, ty: 18 }],
    npcs: [{ id: 'ration_keeper', x: 5, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) {
      if (c.flag('verum_liberated')) { await c.say('配給所の女', ['配給所は「市場」に変わった。値は自治会が決める。', '薬草と包帯、鉱山で使うランプもある。']); await c.shop('item', ['herb', 'potion', 'hi_potion', 'antidote', 'calm_water', 'wake_bell', 'tent', 'phoenix_feather']); return; }
      if (c.has('overseer_seal')) { await c.say('配給所の女', ['監督官の印章……！ あの人を、倒したの？', '……配給の鍵を開けるわ。全部持っていって。もう「数字」で渡す必要はない。']); if (!c.flag('ration_opened')) { c.setFlag('ration_opened', true); c.give('potion', 3); c.give('herb', 5); await c.msg(['ポーション×3、薬草×5を受け取った！']); } return; }
      await c.say('配給所の女', ['配給は監督官の印章か、鉱石の納入証がないと渡せない。……ごめんなさい。', '私だって、ここの子に渡したい。でも私の配給も、数字で決まるの。']); await c.remark('lina', ['宿舎に熱のある人がいました。薬草があれば……でも、ここには薬草ひとつ配れない。', '祈るだけでは治せない。資金も、時間も、足りない。……それでも、できることをします。'], 'lina_remark_verum'); } }] });

  K.innInterior('verum_inn', '坑夫の宿', 'verum_town', 7, 28, 10);

  /* ---------- 学び舎（解放後） ---------- */
  add({ id: 'verum_school', name: 'ヴェルムの学び舎', kind: 'interior', bgm: 'town', rows: [
    '############', '#KKKKKKKKKK#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#_t_t_t_t__#', '#__________#', '#_t_t_t_t__#', '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'verum_town', tx: 33, ty: 31 }],
    npcs: [
      { id: 'school_teacher', x: 5, y: 2, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('教師ハルト', ['昼は自治会、夜は学び舎だ。最初の授業は「数の読み方」。', '帳簿を読めなければ、また誰かの数字に支配される。……それと、師匠ハケイの「損切り」の話もする。失敗を小さく、早く認める。町の再建も同じだ。']); } },
      { id: 'school_kid', x: 3, y: 6, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('生徒', ['おとうさんの名前を書けるようになった！ 帳簿にも、ちゃんと名前があるんだって。']); } }
    ] });

  /* ---------- 鉄冠将軍の砦（封鎖：第5章では入れない） ---------- */
  add({ id: 'iron_fort_gate', name: '鉄冠将軍の砦・門前', kind: 'dungeon', bgm: 'boss_area', fallback: 'ash', rows: [
    'CCCCCCCCCCCC', 'C8888LL8888C', 'C8888888888C', 'C8i88888i88C', 'C8888888888C', 'C8888888888C', 'C8888888888C', 'C8888888888C', 'C8888888888C', 'CCCCC88CCCCC'
  ], warps: [{ x: 5, y: 9, to: 'world_grania', tx: 106, ty: 28 }, { x: 6, y: 9, to: 'world_grania', tx: 106, ty: 28 }],
    events: [{ x: 5, y: 1, type: 'locked', solid: true, doneFlag: 'iron_fort_open', key: 'iron_fort_key', text: ['鉄の門は固く閉ざされている。中から、鎖と機械の音が響く。', '（鉄冠将軍グロートの砦。この先は今後の章で）'] }] });

  /* ---------- 鉄鎖鉱山 1階（労働区：労働者救出） ---------- */
  add({ id: 'iron_mine_1', name: '鉄鎖鉱山 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGigggGGGGGgGG',
    'GGGGGGGGGGGGGGGGGGkgggggggggGG',
    'GGGGGGGGGGGGGGGGGGGgggGGGGGGGG',
    'GGGGGgggkGGGGGGGGGGGgGGGGGGGGG',
    'GGGGigggggggggGGGGGGgGGGGGGGGG',
    'GGGGGgggGGGGGgGGGGGGgGGGGGGGGG',
    'GGGGGGgGGGGGGgGGGGGGgGGGGGGGGG',
    'GGGGGGgGGGGGGggggggGgGGkGGGGGG',
    'GGGGGGgGGGGGiggggggggggggggGGG',
    'GGGGGGgGGGGGGggggggGGGGGGGgGGG',
    'GGGGGGgGGGGGGgGGGGGGGGGGGGgGGG',
    'GGGGGGgGGGGGgggGGGGGGGGGGgggGG',
    'GGGGGGgGGGGGgggGGGGGGGGGGgggGG',
    'gggggggGGGGGgggGGGGGGGGGGgggGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 0, y: 14, to: 'world_grania', tx: 86, ty: 36, name: '鉱山の外へ' }, { x: 27, y: 1, to: 'iron_mine_2', tx: 1, ty: 1 }],
  chests: [{ id: 'im1_1', x: 7, y: 4, item: 'potion', qty: 2 }, { id: 'im1_2', x: 19, y: 1, item: 'iron_claw', qty: 1 }],
  events: [{ x: 14, y: 12, type: 'inspect', solid: false, text: ['壁に刻まれた文字。「ここで死んだ者の名」——数十人分の名前が並ぶ。', '最後の行は、まだ新しい。'] }],
  npcs: [
    { id: 'im_chained1', x: 5, y: 6, sprite: 'villager_m', dir: 'down', wander: 0, hideIf: 'rescued_1', talk: async function (c) { await c.say('鎖につながれた男', ['……助けてくれるのか。看守が来る、気をつけろ！']); var r = await c.battle(['chain_warden'], {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return; c.setFlag('rescued_1', true); root.State.count('verum_rescued'); await c.msg(['鎖を断ち切った！ 男は町へ逃げていった。（救出 ' + root.State.data.counters.verum_rescued + '/3）']); } },
    { id: 'im_chained2', x: 18, y: 10, sprite: 'villager_f', dir: 'down', wander: 0, hideIf: 'rescued_2', talk: async function (c) { await c.say('鎖につながれた女', ['妹は……猟犬に追われて。わたしはもう走れない。', '看守は鉱石を数えてる。今なら——']); var r = await c.battle(['chain_warden', 'ore_bat'], {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return; c.setFlag('rescued_2', true); root.State.count('verum_rescued'); await c.msg(['鎖を断ち切った！ 女は町へ逃げていった。（救出 ' + root.State.data.counters.verum_rescued + '/3）']); } },
    { id: 'im_chained3', x: 27, y: 13, sprite: 'villager_m', dir: 'down', wander: 0, hideIf: 'rescued_3', talk: async function (c) { await c.say('鎖につながれた老人', ['わしはもういい。若い者を……いや、わしも帰りたい。孫の顔を見たい。', '看守長は2階だ。鍵を持っている。……来るぞ！']); var r = await c.battle(['chain_warden', 'mine_imp', 'mine_imp'], {}); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return; c.setFlag('rescued_3', true); root.State.count('verum_rescued'); await c.msg(['鎖を断ち切った！ 老人は町へ向かった。（救出 ' + root.State.data.counters.verum_rescued + '/3）']); } }
  ],
  encounters: { rate: 0.04, zones: [{ name: '鉄鎖鉱山', test: function () { return true; }, groups: [['mine_imp', 'mine_imp'], ['ore_bat', 'ore_bat'], ['chain_hound'], ['mine_imp', 'ore_bat'], ['iron_beetle', 'mine_imp'], ['chain_warden'], ['ore_bat', 'ore_bat', 'ore_bat']], level: 11 }] } });

  /* ---------- 鉄鎖鉱山 2階（看守長：鉱山の鍵） ---------- */
  add({ id: 'iron_mine_2', name: '鉄鎖鉱山 2階', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GgggggGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGgGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGgGGGGGGGGGGiggggggggGGGGG',
    'GgggigGGGGkgggGGGgGGGGGGgGGGGG',
    'GgggggggggggggGGGgGGGGGGgGGGGG',
    'GgggGGGGGGGgggGGGgGGGGGGgGGGGG',
    'GGGGGGGGGGGGgGGgggggGGGGgGGGGG',
    'GGGGGGGGGGGGggggggggGGGGgGGGGG',
    'GGGGGGGGGGGGGGigggggGGGGgGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGgggGGGG',
    'GGGGGGGGGGGGGGGGGGGgggggggGGGG',
    'GGGGGGGGGGGGGGGGGGGgGGGgggkGGG',
    'GGGGGGGGGGGGGGGGGGGgggggggggGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGggG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 1, y: 1, to: 'iron_mine_1', tx: 27, ty: 2 }, { x: 28, y: 14, to: 'iron_mine_3', tx: 1, ty: 1, needFlag: 'mine_gate' }],
  chests: [{ id: 'im2_1', x: 1, y: 4, item: 'ledger_page', qty: 1 }, { id: 'im2_2', x: 25, y: 10, item: 'hi_ether', qty: 1 }],
  events: [
    { x: 27, y: 14, type: 'locked', solid: true, doneFlag: 'mine_gate', key: 'mine_key', text: ['鉄の扉。鎖で何重にも封じられている。看守長が鍵を持っているはずだ。'] },
    { x: 17, y: 7, type: 'boss', solid: false, doneFlag: 'mine_captain', enemies: ['chain_warden', 'chain_warden', 'mine_imp'], intro: ['看守長「鎖を切った者がいると聞いた。……お前か」', '看守長「監督官殿は数字しか見ない。だが俺は、お前の顔を覚えた」'], after: ['看守長は倒れ、腰から鍵が落ちた。', '鉱山の鍵を手に入れた！'], reward: { item: 'mine_key', qty: 1 } },
    { x: 11, y: 6, type: 'learn', solid: false, learnId: 'practice_mine' }
  ],
  encounters: { rate: 0.04, zones: [{ name: '鉄鎖鉱山', test: function () { return true; }, groups: [['chain_warden'], ['mine_imp', 'mine_imp', 'ore_bat'], ['drill_golem'], ['chain_hound', 'chain_hound'], ['iron_beetle', 'iron_beetle'], ['ash_golem', 'mine_imp']], level: 12 }] } });

  /* ---------- 鉄鎖鉱山 最深部（監督官ザルグ） ---------- */
  add({ id: 'iron_mine_3', name: '鉄鎖鉱山 最深部', kind: 'dungeon', bgm: 'boss_area', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGG',
    'GgggggGGGGGGGGGGGGGGGGGG',
    'GGGGGgGGGGGGGGGGGGGGGGGG',
    'GGGGGggggggggGGGGGGGGGGG',
    'GGGGGGGgggXXgggggggGGGGG',
    'GGGGGGigggggggggggiGGGGG',
    'GGGGGGGgggggggggggGGGGGG',
    'GGGGGGGgggggggggggGGGGGG',
    'GGGGGGGgggggggggggGGGGGG',
    'GGGGGGigggggggggggiGGGGG',
    'GGGGGGGgggggggggggGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 1, y: 1, to: 'iron_mine_2', tx: 27, ty: 13 }],
  chests: [{ id: 'im3_1', x: 16, y: 9, item: 'elixir', qty: 1 }],
  events: [
    { x: 12, y: 8, type: 'boss', solid: false, doneFlag: 'verum_overseer_defeated', enemy: 'boss_overseer',
      intro: ['赤く光る鉱石の山の前に、鎖を幾重にも巻いた魔人が立っていた。', '監督官ザルグ「……労働力が三つ減った。損失だ。お前が補填しろ」', 'ザルグ「数字だ。この町の人間は、鉱石の納入量という数字だ。名前など要らぬ」'],
      after: ['ザルグは膝をつき、鎖が音を立てて崩れた。', 'ザルグ「……数字が、合わぬ……将軍殿に……」', 'そのとき、坑道の奥から巨大な影が現れた。鉄の冠をかぶった魔人——鉄冠将軍グロート。', 'グロート「ザルグは人間のやり方を真似すぎた。人間を数字で縛るのは、人間の発明だ」', 'グロート「お前たちは人間を救ったつもりだろう。だが我らの下級魔物も、かつて人間に使役されていた。……いずれ砦で話そう」', '影は坑道の奥へ消えた。監督官の印章が残されている。', '監督官の印章を手に入れた！'], reward: { item: 'overseer_seal', qty: 1 } },
    { x: 9, y: 5, type: 'inspect', solid: false, text: ['鉱石の山。砦へ送られるはずだったものだ。淡く脈打つように光っている。', '鉱石に触れると、頭の中に声が流れ込む。「損をしたくない……二度と……」'] }
  ],
  encounters: { rate: 0.035, zones: [{ name: '鉄鎖鉱山', test: function () { return true; }, groups: [['drill_golem'], ['chain_warden', 'mine_imp'], ['smoke_wraith', 'smoke_wraith'], ['ash_golem', 'ore_bat']], level: 13 }] } });

  /* ---------- 灰の峠（グラニア → カリオン徴収連邦。第5章ヴェルム解放後に関所が開く） ---------- */
  add({ id: 'grania_pass', name: '灰の峠', kind: 'dungeon', bgm: 'dungeon', fallback: 'grass', rows: [
    'mmmmmmmmmmmmmmmm',
    'mmmmmmm.mmmmmmmm',
    'mmmmmmm.mmmmmmmm',
    'mmmmmm...mmmmmmm',
    'mmmmmm.....mmmmm',
    'mmmmmm...m.mhmmm',
    'mm...mmmm...mmmm',
    'mm..........mmmm',
    'mm...mmmm...mmmm',
    'mmm.mhmmmmmmmmmm',
    'mmm.mmmmmmmmmmmm',
    'mmm.....mmmmmmmm',
    'mmhmmmm.mmmmmmmm',
    'mmmmmmm.mmmmmmmm',
    'mmmmmmm.mmmmmmmm',
    'mmmmmmmmmmmmmmmm'
  ],
  warps: [{ x: 7, y: 14, to: 'world_grania', tx: 60, ty: 26, name: 'グラニア側へ' }, { x: 7, y: 1, to: 'world_kalion', tx: 60, ty: 105, name: 'カリオン側へ' }],
  chests: [{ id: 'gp1', x: 6, y: 4, item: 'hi_potion', qty: 2 }, { id: 'gp2', x: 2, y: 7, gold: 500 }],
  events: [
    { x: 3, y: 9, type: 'gate', solid: true, doneFlag: 'kalion_open', needFlag: 'verum_liberated', questStart: 'main_6', text: ['連邦の関所。「魔災復興税の納付証なき者、通行を禁ず」', '柵の向こうに兵の影はない。……ヴェルムの自治会が発行する通行証があれば通れるだろう。'], openText: ['ヴェルム自治会の通行証を見せた。柵が開く。', 'この先はカリオン徴収連邦——腐敗した政府の都市だ。'] },
    { x: 7, y: 4, type: 'inspect', solid: false, text: ['峠の石碑。「ここより北、カリオン徴収連邦」', '誰かが削った跡がある。「税は人を守らない」'] }
  ],
  encounters: { rate: 0.04, zones: [{ name: 'エマール山脈', test: function () { return true; }, groups: [['mountain_hawk', 'mountain_hawk'], ['rock_lizard'], ['ash_golem'], ['chain_hound', 'chain_hound'], ['bandit_archer', 'bandit'], ['harpy']], level: 12 }] } });
})(typeof window !== 'undefined' ? window : globalThis);
