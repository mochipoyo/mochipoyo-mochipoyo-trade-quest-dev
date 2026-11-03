/* =========================================================
   Data / v6.8 追加の仲間：カズト・もちぽよ・神聖犬ポン太
   ・カズト（戦士・MP高め）：マクディア魔導王国の「魔導士の酒場」。王立学院の学院長から禁書庫の入館許可をもらったあとに話しかけると加入
       職業は戦士のまま。本人だけの上乗せ（COMPANIONS.kazuto.statBonus）で最大MPが高い（Actors.stats）
   ・もちぽよ（強力なトレード呪文を多用できる）：相場都市トレディア（v6.8 でマクディア地方へ移した）の酒場「損切り亭」。トレード闘技場の12人のうち
       7人にそれぞれ1回以上勝ち、伝説のポークビッツ丼を3つ渡すと加入。2035年という過去の時代からタイムループしてきたトレーダー
       専用の職業「時渡りのトレーダー」（loop_trader）：トレード呪文7種。トレード呪文の消費MPは本人が -40%（Combat.skillCost）
   ・神聖犬ポン太：天空群島の「星見塔の野営地」。トレーダーランクが A 以上のときに話しかけると、戦闘の手助けをしてくれる
       4人のパーティとは別枠（d.party には入らない。記録は d.flags.ponta_joined だけ）。戦闘の処理は js/rpg/combat.js（Combat.PET）
   ・新しいアイテム：伝説のポークビッツ丼（HP・MPを全回復し、戦闘中なら攻撃力が3ターン2倍。トレディアの酒場「損切り亭」でだけ 20000G で買える）
   ・町の配置を変えないよう、NPC は町の飾り・建物の配置が決まったあとで足す（companions67.js と同じ考え方）
   ・絵：戦闘の4方向は assets/characters/party-directions-add68/（3D版の PartyDirections）。立ち絵は assets/characters/companions/、
       フィールドの歩行は assets/characters/overworld/（カズト・もちぽよ＝ docs/tools/walker.js、ポン太＝4方向の絵を縮めたもの）
   ・既存のセーブ：何も足さない（フラグがなければ未加入）。既存のストーリー・仲間・職業・装備・アイテムは変えない
   ========================================================= */
(function (root) {
  'use strict';
  var JOBS = root.JOBS, SKILLS = root.SKILLS, ITEMS = root.ITEMS, CP = root.COMPANIONS, MD = root.MAP_DEFS || {}, AM = root.ASSET_MANIFEST || {};
  function D() { return root.State && root.State.data; }

  /* ---------- 仲間 ---------- */
  CP.kazuto = { name: 'カズト', job: 'warrior', sprite: 'kazuto', joinLevel: 28, personality: '実直で、仲間の盾になりたがる',
    background: 'マクディア魔導王国で剣と魔法の両方を学ぶ戦士。「仲間を守るための魔力」を求め、王立学院の禁書庫に入る機会を待っていた。', bio: '戦士。MPが多く、戦士の特技を何度も使える。',
    statBonus: { mp: [12, 1.9] } };   // 最大MP ＋（12 ＋ 1.9×(Lv−1)）。戦士の最大MP（4 ＋ 0.8×(Lv−1)）に上乗せ。転職しても本人の上乗せは残る
  // v7.0 表示名を「もちぽよ」から「謎のタイムトラベラーM」へ（ID mochipoyo・画像・フラグはそのまま。旧セーブの名前は State.migrate が置きかえる）
  CP.mochipoyo = { name: '謎のタイムトラベラーM', job: 'loop_trader', sprite: 'mochipoyo', joinLevel: 28, personality: 'のんびりしているが、相場の話になると目つきが変わる',
    background: '2035年という過去の時代から、タイムループしてこの世界へ来たトレーダー。相場の波形を読む技を、呪文として使える。好物は伝説のポークビッツ丼。', bio: '時渡りのトレーダー。強力なトレード呪文を、少ないMPで何度も使える。',
    tradeMpCut: 0.4 };   // トレード呪文（trade: true）の消費MP −40%（本人。職業を変えても残る）

  /* ---------- 職業：時渡りのトレーダー ---------- */
  JOBS.loop_trader = { name: '時渡りのトレーダー', sprite: 'hero_master', desc: '未来と過去の相場を見てきたトレーダー。トレード呪文で戦う。', role: 'トレード呪文',
    stats: { hp: 26, mp: 22, atk: 5, def: 6, agi: 8, mag: 12 }, growth: { hp: 5.4, mp: 4.2, atk: 1.2, def: 1.4, agi: 1.6, mag: 2.9 },
    weapons: ['staff', 'dagger', 'club'], armors: ['robe', 'light', 'hat', 'acc'],
    skills: [{ lv: 1, id: 'trend_ray' }, { lv: 5, id: 'rci_storm' }, { lv: 10, id: 'dow_thunder' }, { lv: 14, id: 'stoploss_aegis' }, { lv: 18, id: 'macd_cross_burst' }, { lv: 22, id: 'loop_foresight' }, { lv: 28, id: 'time_loop_wave' }],
    trait: 'トレード呪文の消費MP-20%（謎のタイムトラベラーM本人は-40%）', tradeMpCut: 0.2, unlock: { level: 15, flag: 'mochipoyo_joined' } };
  if (root.JOB_LIST && root.JOB_LIST.indexOf('loop_trader') < 0) root.JOB_LIST.push('loop_trader');

  /* ---------- トレード呪文（trade: true・school: 'spell'） ---------- */
  function S(id, o) { if (SKILLS[id]) throw new Error('companions68: スキルIDが重複 ' + id); o.id = id; o.trade = true; o.school = 'spell'; o.v68 = true; SKILLS[id] = o; }
  S('trend_ray', { name: 'トレンドレイ', kind: 'magic', target: 'enemy', mp: 5, power: 26, element: 'light', desc: '上昇トレンドの光線で敵1体を撃つ', anim: 'light' });
  S('rci_storm', { name: 'RCIストーム', kind: 'magic', target: 'enemies', mp: 10, power: 26, element: 'thunder', desc: '3本のRCIが嵐になり、敵全体を打つ', anim: 'thunder' });
  S('dow_thunder', { name: 'ダウ理論の雷', kind: 'magic', target: 'enemy', mp: 12, power: 50, element: 'thunder', desc: '高値と安値の切り上げを雷に変えて、敵1体に落とす', anim: 'thunder' });
  S('stoploss_aegis', { name: '損切りの盾陣', kind: 'buff', target: 'allies', mp: 10, buff: { def: 0.3, mdef: 0.3 }, turns: 3, desc: '味方全体の守備と魔法防御を上げる（損失を小さく抑える陣）', anim: 'buff' });
  S('macd_cross_burst', { name: 'MACDクロスバースト', kind: 'magic', target: 'enemies', mp: 18, power: 42, element: 'light', desc: '2本の線が交わる瞬間の光を、敵全体へ放つ', anim: 'light' });
  S('loop_foresight', { name: '2035年の相場観', kind: 'buff', target: 'allies', mp: 14, buff: { atk: 0.2, mag: 0.2, agi: 0.15 }, turns: 3, desc: '過去の時代で見た相場の記憶で、味方全体の攻撃力・魔力・素早さを上げる', anim: 'buff' });
  S('time_loop_wave', { name: '時渡りの波形砲', kind: 'magic', target: 'enemies', mp: 30, power: 70, element: 'none', desc: '時をめぐって集めた波形を、敵全体へ撃ち込む', anim: 'light' });
  // 演出（js/data/fx65.js の種類を使う）
  var F = root.FX65;   // 雷の呪文（RCIストーム・ダウ理論の雷）は雷の演出（落雷・放電）にする（ほかの雷の技と同じ決まり）
  if (F) {
    var U = { trend_ray: { fx: 'macd', motion: 'cast', color: '#ffd24a', color2: '#7fe3a5' }, rci_storm: { fx: 'discharge', motion: 'cast', color: '#ff8a5a', color2: '#7fd0ff', area: 'all' },
      dow_thunder: { fx: 'bolt', motion: 'cast', color: '#ffe24a', color2: '#4ad08a', big: true }, stoploss_aegis: { fx: 'risk_shield', motion: 'pray', color: '#e05a5a', color2: '#ffd24a', area: 'all' },
      macd_cross_burst: { fx: 'macd', motion: 'cast', color: '#7fd0ff', color2: '#ff6a8a', area: 'all', big: true }, loop_foresight: { fx: 'clock', motion: 'pray', color: '#3fd0c8', color2: '#ffd24a', area: 'all' },
      time_loop_wave: { fx: 'meteor', motion: 'cast', color: '#3fd0c8', color2: '#ffd24a', area: 'all', big: true } };
    Object.keys(U).forEach(function (id) { if (!F.KINDS[U[id].fx]) return; var sk = SKILLS[id]; F.DEFS[id] = Object.assign({ area: sk.target === 'enemies' || sk.target === 'allies' ? 'all' : 'single', hits: 1 }, U[id], { id: id, unique: true }); });   // FX65.rebuild は呼ばない（ほかのファイルが足した演出を消さないため）
    // ポン太の行動（スキルではないので SKILLS には入れない）
    F.DEFS.ponta_tackle = { id: 'ponta_tackle', fx: F.KINDS.heavy ? 'heavy' : 'slash', motion: 'swing', color: '#fff6c8', color2: '#ffd24a', area: 'single', hits: 1, unique: true };   // 体当たり（3D版では相手の前まで跳ぶ）
    F.DEFS.ponta_heal = { id: 'ponta_heal', fx: F.KINDS.heal_glow ? 'heal_glow' : 'slash', motion: 'pray', color: '#fff6c8', color2: '#ffd24a', area: 'single', hits: 1, unique: true };
  }

  /* ---------- アイテム：伝説のポークビッツ丼（ID は porkbits_don のまま。持っているセーブもそのまま使える） ----------
     ・HP・MPを全回復。戦闘中に食べると、攻撃力が3ターンのあいだ2倍（＋100%）。フィールドではHP・MPの全回復だけ
     ・トレディアの酒場「損切り亭」でだけ 20000G で買える（道具屋では売らない） */
  if (!ITEMS.porkbits_don) {
    ITEMS.porkbits_don = { id: 'porkbits_don', name: '伝説のポークビッツ丼', cat: 'consumable', price: 20000, effect: { fullHp: true, fullMp: true, buff: { atk: 1.0 }, turns: 3 }, desc: 'HP・MPを全回復。戦闘中に食べると攻撃力が3ターン2倍。謎のタイムトラベラーMの大好物（損切り亭でだけ買える）', food: 'food' };
    if (root.ITEM_LIST && root.ITEM_LIST.indexOf('porkbits_don') < 0) root.ITEM_LIST.push('porkbits_don');
  }
  var FS = root.FOOD_STANDS = root.FOOD_STANDS || {}; FS.tradia_tavern = (FS.tradia_tavern || ['onigiri', 'yakitori', 'ramen', 'curry_rice', 'green_tea', 'coffee', 'fruit_juice']).concat(['porkbits_don']);

  /* ---------- 画像の登録（2D版：立ち絵・フィールドの歩行） ---------- */
  function portrait(id, name, w, h) { AM.companions = AM.companions || {}; AM.companions[id] = { name: name, kind: 'portrait', spriteId: id, anchor: 'bottom-center', w: w, h: h, path: 'assets/characters/companions/' + id + '.png', status: 'replaced', use: true, fallback: 'chars', note: 'v6.8 ご提供の画像（正面）から切り出し' }; }
  function walk(id, name, fw, fh, note) { AM.overworld = AM.overworld || {}; AM.overworld[id] = { name: name, kind: 'walk', spriteId: id, anchor: 'bottom-center', frameW: fw, frameH: fh, cols: 3, rows: 4, dirOrder: ['down', 'left', 'right', 'up'], frames: ['idle', 'left_foot', 'right_foot'], scale: 2, path: 'assets/characters/overworld/' + id + '.png', w: fw * 3, h: fh * 4, status: 'replaced', use: true, fallback: 'chars', style: 'procedural', note: note }; }
  portrait('kazuto', 'カズト', 249, 258); portrait('mochipoyo', '謎のタイムトラベラーM', 272, 278); portrait('ponta', '神聖犬ポン太', 221, 201);
  walk('kazuto', 'カズト', 16, 24, 'ドット絵生成器（docs/tools/walker.js の kazuto）で作成'); walk('mochipoyo', '謎のタイムトラベラーM', 16, 24, 'ドット絵生成器（docs/tools/walker.js の mochipoyo）で作成');
  walk('ponta', '神聖犬ポン太', 22, 20, 'ご提供の4方向の絵を縮めて作成（仮の歩行。足踏みのコマはなく、1ドット上下するだけ）');
  // 時渡りのトレーダーの職業の立ち絵・主人公の歩行の絵はまだない → ほかの職業と同じく「missing」として登録し、コード描画で表示する（asset-manifest.js の v5.1 と同じ形）
  AM.jobs = AM.jobs || {}; if (!AM.jobs.loop_trader) AM.jobs.loop_trader = { name: '時渡りのトレーダー', kind: 'portrait', spriteId: 'hero_loop_trader', anchor: 'bottom-center', path: null, status: 'missing', use: false, fallback: 'chars', style: 'procedural', note: 'v6.8 追加。画像未作成のためコード描画' };
  if (!AM.overworld.hero_loop_trader) AM.overworld.hero_loop_trader = { name: '時渡りのトレーダー', kind: 'walk', spriteId: 'hero_loop_trader', anchor: 'bottom-center', path: null, status: 'missing', use: false, fallback: 'chars', style: 'procedural', note: 'v6.8 追加。画像未作成のためコード描画' };
  // 2D版の簡易ドット（歩行の絵を読めないとき）。色は歩行の絵に合わせる（ポン太は人の形の簡易ドットがないので、歩行の絵だけ）
  var CH = root.Chars && root.Chars.PALS; var SK = '#f0c8a0', EY = '#2a2d4a';
  if (CH) {
    if (!CH.kazuto) CH.kazuto = { H: '#e4e6ee', F: SK, E: EY, B: '#b8bcc8', A: '#a8282a', S: SK, L: '#4a4a5a', T: '#2a2a3a' };
    if (!CH.mochipoyo) CH.mochipoyo = { H: '#e8b84a', F: SK, E: '#2a7a4a', B: '#1f2440', A: '#2f7a5a', S: SK, L: '#2a2a3a', T: '#1a1a2a' };
  }

  /* ---------- 加入の場所（町の配置が決まったあとで足す） ---------- */
  var PD3 = 'assets/characters/party-directions-add68/sprites/';
  function npc(mapId, o) { var m = MD[mapId]; if (!m) return; m.npcs = m.npcs || []; if (m.npcs.some(function (n) { return n.id === o.id; })) return; m.npcs.push(o); }

  // カズト：魔導都マクディアの「魔導士の酒場」。条件：学院長から禁書庫の入館許可をもらったあと（archive_permit）
  npc('magicka_tavern', { id: 'kazuto', x: 9, y: 6, sprite: 'kazuto', dir: 'left', wander: 0, art3d: { dir: PD3 + 'kazuto/', ratio: 1.04 }, noChatter: true, talk: async function (c) {
    var d = D(); if (c.hasCompanion('kazuto')) return;
    if (!d.flags.archive_permit) {
      await c.say('カズト', ['俺はカズト。剣しか知らなかった戦士だ。', '仲間を守れる魔力がほしくて、この国へ来た。……王立学院の禁書庫に、その手がかりがあるはずなんだ。', 'だが、入館の許可は十年、誰にも出ていないらしい。', '学院長に会えるなら、話を聞いてみてくれ。']);
      return;
    }
    await c.say('カズト', ['禁書庫の入館許可証……！ 学院長が、許可を出したのか。', '頼む、俺も連れていってくれ。剣の腕は保証する。', '魔力も、少しは鍛えた。戦士の技なら、何度だって振るえるぜ。']);
    var a = await c.choice('カズトを仲間にしますか？', ['はい', 'いいえ']);
    if (a === 0) { c.join('kazuto'); c.setFlag('kazuto_joined', true); await c.msg(['カズトが仲間になった！（戦士・MPが多い）']); }
    else await c.say('カズト', ['そうか……。気が変わったら、この酒場にいる。']);
  } });

  // もちぽよ：相場都市トレディアの酒場「損切り亭」。条件：トレード闘技場の12人のうち7人にそれぞれ1回以上勝つ ＋ 伝説のポークビッツ丼を3つ渡す
  var NEED_WINS = 7;
  root.COMPANION_RENAMES = Object.assign(root.COMPANION_RENAMES || {}, { mochipoyo: ['もちぽよ'] });   // v7.0 旧セーブに残っている古い表示名（State.migrate が今の名前に置きかえる）
  function tradiaWins() { var d = D(); var w = (d && d.tradia && d.tradia.wins) || {}; var ids = root.TRADER_IDS || Object.keys(w); return ids.filter(function (k) { return (w[k] || 0) > 0; }).length; }
  npc('tradia_tavern', { id: 'mochipoyo', x: 11, y: 7, sprite: 'mochipoyo', dir: 'left', wander: 0, art3d: { dir: PD3 + 'mochipoyo/', ratio: 1.0 }, noChatter: true, talk: async function (c) {
    var d = D(); if (c.hasCompanion('mochipoyo')) return;
    if (!d.flags.mochipoyo_met) {
      d.flags.mochipoyo_met = true;
      await c.say('謎のタイムトラベラーM', ['……ん？ ああ、ごめん。チャートを見てた。', 'ぼくのことは「M」とでも呼んで。信じてもらえないと思うけど、2035年って時代から来たんだ。', 'あっちで相場を見ていたら、気づいたら同じ日を何度もくり返していて……タイムループを抜けたら、この世界だった。', '過去の時代の相場の知識なら、少しは役に立つと思う。']);
    }
    var nw = tradiaWins();
    if (nw < NEED_WINS) {
      await c.say('謎のタイムトラベラーM', ['ただ、一緒に旅をするなら、相場の判断を見せてほしいな。', '町の北西のトレード闘技場には、12人のトレーダーがいる。そのうち7人に、それぞれ1回ずつ勝ってきて。', '7人に勝てたら、また話そう。']);
      await c.msg(['（トレード闘技場で勝ったトレーダー：' + nw + '人／' + NEED_WINS + '人）']);
      return;
    }
    var n = (d.inventory && d.inventory.porkbits_don) || 0;
    await c.say('謎のタイムトラベラーM', ['闘技場で7人に勝ったんだってね。見送りと損切りの判断、ちゃんとできてた。', 'それと……実は、お腹がすいてて。', '伝説のポークビッツ丼を3つ持ってきてくれたら、ついていくよ。この店でしか食べられない、特別な丼なんだ。']);
    if (n < 3) { await c.msg(['（伝説のポークビッツ丼：' + n + '／3。この酒場で 20000G）']); return; }
    var a = await c.choice('伝説のポークビッツ丼を3つ渡して、謎のタイムトラベラーMを仲間にしますか？', ['渡す', 'やめる']);
    if (a !== 0) { await c.say('謎のタイムトラベラーM', ['うん、いつでもいいよ。ここで待ってる。']); return; }
    c.take('porkbits_don', 3);
    await c.say('謎のタイムトラベラーM', ['……おいしい！ この丼のためなら、どの時代でもがんばれる。', 'よろしくね。トレード呪文なら、まかせて。']);
    c.join('mochipoyo'); c.setFlag('mochipoyo_joined', true);
    await c.msg(['謎のタイムトラベラーMが仲間になった！（時渡りのトレーダー）', '転職の条件：謎のタイムトラベラーMの加入後、Lv15以上で「時渡りのトレーダー」に転職できる']);
  } });

  // 神聖犬ポン太：天空群島「星見塔の野営地」。条件：トレーダーランク A 以上で話しかける。加入すると4人とは別枠で戦闘を手助けする
  npc('star_camp', { id: 'ponta', x: 5, y: 11, sprite: 'ponta', dir: 'down', wander: 0, hideIf: 'ponta_joined', art3d: { dir: PD3 + 'ponta/', ratio: 0.7 }, noChatter: true, talk: async function (c) {
    var d = D(); if (d.flags.ponta_joined) return;
    var TE = root.TradeEval; var r = TE && d.trade ? TE.rank(d.trade) : null; var idx = r ? r.index : 0; var A = 5;   // TradeEval.RANKS：F,E,D,C,B,A,S
    await c.msg(['金色の輪を頭にのせた、白い翼の犬がいる。', '……じっと、こちらの目を見ている。']);
    if (idx < A) {
      await c.say('野営地の番人', ['その犬はポン太。雲の上で、ずっと誰かを待っている神聖な犬だ。', '相場を本当に読める者にしか、ついていかないと言われている。', '（トレーダーランクが A になったら、もう一度話しかけてみよう。いま：' + (r ? r.letter : '-') + '）']);
      return;
    }
    await c.msg(['ポン太が、しっぽを大きく振った。', '「ワン！」']);
    d.flags.ponta_joined = true; if (root.World && root.World.applyState) root.World.applyState(root.World.map);
    await c.msg(['神聖犬ポン太が仲間になった！', '（パーティの4人とは別枠で戦闘に加わり、ときどき攻撃してくれる。仲間が危ないときは、聖なる光で回復することもある）']);
  } });

  root.COMPANIONS68 = { ids: ['kazuto', 'mochipoyo'], pet: 'ponta', tradiaWins: tradiaWins, needWins: NEED_WINS };
})(typeof window !== 'undefined' ? window : globalThis);
