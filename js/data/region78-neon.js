/* =========================================================
   Data / Region78 ネオン（v7.8）：東アジア沿岸「錆雨市ネオン・ドック」（地球の世界の新しい地域）
   ・到達：マクディア魔導王国に着いたあと（magicka_arrived）。遠洋航海船・飛空艇で東アジアの沖へ
   ・物語「錆雨市の蛇口」（neon78_water）：住宅街の蛇口が止まった。誰もいない工場には毎日水が届く
       → 水道局の出張所の端末で配給表を見る → 水没工場の配管をたどる（閉鎖の記録・流量計の値・3つの弁）
       → 奥の配給管理 AI「ミズハ」に閉鎖前の記録で配給を続けていると示す → 古い記録を守る監督機を止める → 配給を直す → 街に水が戻る
   ・景観：雨に濡れたネオン街（看板の灯・水たまり・運河の桟橋）。外は水没した工場地帯と、今も働き続ける無人機械
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.R78; if (!R) return; var A = R.A; var D = R.D;
  var F = 'world_neon';

  /* ---------- 敵（Lv30〜33） ---------- */
  R.special('acid_rain', { name: '酸の雨', msg: 'は錆びた雨を降らせた！ 装備がきしむ……', power: 0.6, all: true, debuff: { def: -0.2 }, turns: 3 });
  R.special('stale_order', { name: '古い指令', msg: 'は閉鎖前の指令を読み上げた！「作業ヲ続ケヨ」', status: { id: 'confuse', chance: 0.35 }, target: 'ally' });
  R.special('spark_net', { name: '漏電', msg: 'の触手から火花が散った！', power: 0.85, all: true, element: 'thunder', status: { id: 'paralyze', chance: 0.2 } });
  R.monster('rust_drone', { name: '錆びた配達ドローン', lv: 30, arche: 'fast', art: { family: 'machine', c: { base: '#7a5a3a', accent: '#ff4a8a', eye: '#4af0ff' } }, family: '機械系', area: '錆雨市の外れ', resist: { thunder: 1.5, ice: 0.8 }, actions: [A('attack', 3), A('special', 'charge', 1)], drops: [{ item: 'hi_potion', rate: 0.2 }], desc: '宛先のない荷物を、今日も運び続けている。' });
  R.monster('leak_jelly', { name: '漏電クラゲ', lv: 31, arche: 'mage', art: { family: 'jelly', c: { base: '#4ad0ff', accent: '#ff5ab8', eye: '#ffffff' } }, family: '水棲系', area: '水没工場', resist: { thunder: 0, fire: 1.4 }, actions: [A('attack', 1), A('special', 'spark_net', 2), A('skill', 'thunder', 1)], drops: [{ item: 'hi_ether', rate: 0.15 }], desc: '切れた電線の熱で生まれた。水の中で光る。' });
  R.monster('neon_moth', { name: 'ネオン蛾の群れ', lv: 30, arche: 'glass', art: { family: 'swarm', c: { base: '#ff4ad0', accent: '#4affe0', eye: '#ffff6a' } }, family: '虫系', area: '錆雨市の外れ', resist: { fire: 1.6, wind: 1.3 }, actions: [A('attack', 2), A('skill', 'confuse', 1)], drops: [{ item: 'antidote', rate: 0.3 }], desc: '看板の光に集まる。消えた看板には二度と寄らない。' });
  R.monster('acid_slime', { name: '酸雨スライム', lv: 32, arche: 'tank', art: { family: 'slime', c: { base: '#8ac04a', accent: '#c0ff4a', eye: '#2a2a2a' } }, family: 'スライム系', area: '水没工場', resist: { ice: 1.4, thunder: 0.7 }, actions: [A('attack', 2), A('special', 'acid_rain', 1)], drops: [{ item: 'hi_potion', rate: 0.25 }], desc: '雨水と錆が混ざって固まった。触れた鉄を溶かす。' });
  R.monster('pipe_serpent', { name: '配管の大蛇', lv: 33, arche: 'tank', art: { family: 'hydra', c: { base: '#5a6a7a', accent: '#c0a04a', eye: '#ff6a2a' } }, family: '魔物系', area: '水没工場', resist: { ice: 1.4, fire: 0.8 }, actions: [A('attack', 2), A('special', 'crush', 1)], drops: [{ item: 'elixir', rate: 0.05 }], desc: '配管の中で育った。水の流れる向きにしか進まない。' });
  R.monster('boss_archive_warden', { name: '監督機アーカイブ・ウォーデン', lv: 35, arche: 'tank', boss: true, hpMult: 2.6, art: { family: 'golem', size: 'boss', c: { base: '#4a5a6a', accent: '#ff4a8a', eye: '#4af0ff' } }, family: '機械系', area: '水没工場・管理室', resist: { thunder: 1.5, dark: 0.8, ice: 0.9 },
    actions: [A('attack', 3), A('special', 'stale_order', 1), A('special', 'acid_rain', 1), { type: 'special', id: 'call', summon: 'rust_drone', w: 1, hpBelow: 0.5 }], drops: [{ item: 'elixir', rate: 1 }], desc: '閉鎖の前の記録を「正しい」と守り続ける監督機。記録を書きかえる者を止める。' });

  /* ---------- 報酬 ---------- */
  R.weapon('neon_umbrella', '錆雨の傘槍', 'spear', 46, 0, { desc: '雨を弾く骨組みを穂先に仕立てた槍。雷の力を帯びる', element: 'thunder' });
  R.armor('neon_raincoat', 'ネオンの合羽', 'light', 34, 0, { desc: '看板の灯を織り込んだ合羽。素早さ+3', agi: 3 });
  R.armor('clean_filter', '浄水のフィルター', 'acc', 4, 0, { desc: '水道局の技師がくれた濾過の芯。最大HP+40', hp: 40 });
  R.key('neon_record', '閉鎖の記録', '第三浄水工場の閉鎖届。日付は十二年前。配給表には、まだ「稼働中」と書かれている。');
  R.key('neon_petition', '住民の署名', '住宅街の蛇口が止まったことを訴える、住民の署名。');

  /* ---------- クエスト ---------- */
  R.quest('neon78_water', { title: '錆雨市の蛇口', theme: '記録と現実を照らし合わせる', desc: '錆雨市ネオン・ドックの住宅街では蛇口が止まった。誰もいない工場には毎日水が届く。水没工場の配管をたどり、配給を続ける管理AIを直す。',
    steps: [['neon_heard', '水路番のシズクから、止まった蛇口の話を聞く'], ['neon_terminal', '水道局の出張所の端末で、配給表を見る'], ['neon_has_record', '水没工場の事務所で、閉鎖の記録を見つける'], ['neon_meter', '水没工場の2階で、流量計の値を読む'], ['neon_ai_fixed', '奥の管理室で、配給管理AI「ミズハ」の配給を直す'], ['neon_done', 'シズクに、水が戻ったことを伝える']],
    reward: { exp: 9000, gold: 6000, item: 'neon_umbrella' } });
  R.obj('neon78_water', 'neon_heard', 'npc:neon_town:nt_shizuku', ['東アジアの沖、錆雨市ネオン・ドック。', '運河の桟橋にいる水路番のシズク。', '錆雨市に入って、運河の桟橋の水路番シズクに話しかけよう。']);
  R.obj('neon78_water', 'neon_terminal', 'npc:neon_office:no_terminal', ['錆雨市ネオン・ドック。', '北西の「水道局の出張所」の配給端末。', '水道局の出張所に入り、奥の端末で配給表を見よう。']);
  R.obj('neon78_water', 'neon_has_record', 'ev:neon_works_1:26,2', ['錆雨市の南の工場地帯。', '「水没工場」1階の事務所。', '水没工場の1階、右上の事務所の棚で閉鎖の記録を探そう。']);
  R.obj('neon78_water', 'neon_meter', 'ev:neon_works_2:15,9', ['水没工場。', '2階の配水管の中央にある流量計。', '2階の中央の流量計を調べよう。']);
  R.obj('neon78_water', 'neon_ai_fixed', 'ev:neon_works_core:9,3', ['水没工場の最深部。', '管理室の配給管理AI「ミズハ」。', '管理室の端末に、閉鎖の記録と流量計の値を示そう。']);
  R.obj('neon78_water', 'neon_done', 'npc:neon_town:nt_shizuku', ['錆雨市ネオン・ドック。', '運河の桟橋のシズク。', 'シズクに、水が戻ったことを伝えよう。']);

  /* ---------- フィールド（東アジア沿岸） ---------- */
  R.field({ id: F, name: '錆雨市ネオン・ドック', fallback: 'grass2', theme3d: { region: 'neon' },
    locations: [
      { id: 'neon_dock', name: '錆雨市ネオン・ドック', icon: 'castle_icon', lon: 121.3, lat: 31.4, to: 'neon_town', tx: 17, ty: 17 },
      { id: 'neon_works', name: '水没工場', icon: 'cave_icon', lon: 120.6, lat: 30.3, to: 'neon_works_1', tx: 1, ty: 12 },
      { id: 'neon_lookout', name: '旧東京湾の灯台', icon: 'tower_icon', lon: 139.8, lat: 35.2, to: 'neon_lighthouse', tx: 5, ty: 7 }
    ],
    npcs: [
      { id: 'nw_engineer', at: ['neon_works', 2, -2], sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('流れ者の技師', c.flag('neon_ai_fixed') ? ['工場の弁が閉じた。……配管の唸りが止んだよ。', '機械は悪くない。古い記録を、誰も書きかえなかっただけだ。'] : ['この工場は十二年前に閉鎖された。なのに、今も水が流れ込んでる。', '中の機械は、最後に受けた指令を守ってるだけさ。止める人がいなかった。']); } },
      { id: 'nw_kid', at: ['neon_dock', -3, 3], sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('バケツを持った子ども', c.flag('neon_ai_fixed') ? ['家の蛇口から水が出た！ もう工場まで汲みに行かなくていいんだ。'] : ['工場の裏の水たまりまで、毎日汲みに行ってるの。', 'あそこ、機械がいて怖いんだ。']); } }
    ],
    chests: [{ id: 'nf1', at: ['neon_works', 4, 3], item: 'hi_ether', qty: 2 }, { id: 'nf2', at: ['neon_lookout', 2, 2], gold: 1800 }],
    events: [{ at: ['neon_dock', 4, -3], type: 'inspect', solid: false, text: ['雨に濡れた看板が、誰も読まない広告を流し続けている。', '「今月の配給：第三浄水工場 ……稼働中」'] }],
    encounters: { rate: 0.04, zones: [{ name: '錆雨市の外れ', test: function () { return true; }, groups: [['rust_drone'], ['rust_drone', 'neon_moth'], ['neon_moth', 'neon_moth'], ['acid_slime'], ['rust_drone', 'rust_drone']] }] },
    earth: {} });
  R.blob(F, 16, function (b, gx, gy, n) { if (b === 'M' || b === 'W') return null; var v = root.Earth78.vnoise(gx, gy, 5, 81); return v > 0.72 ? 'u' : n < 0.05 ? '9' : n < 0.12 ? 'f' : n < 0.45 ? ',' : '.'; });

  /* ---------- 町：錆雨市ネオン・ドック ---------- */
  var T = 'neon_town';
  R.add({ id: T, name: '錆雨市ネオン・ドック', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', weather: 'rain', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'C=====RRRRRRR=====y=====BBBBBBB====C',
    'C=====RRRRRRR===========BBBBBBB====C',
    'C=====RRRRRRR===========BBBBBBB====C',
    'C=====RRRRRRR====u======BBBBBBB====C',
    'C=y=========rrrrrrrrrrr=========y==C',
    'C===========rrrrrrrrrrr============C',
    'CVVVVVV==A==rr=====Q=rr==A==VVVVVV=C',
    'CVVVVVV=====rr=======rr=====VVVVVV=C',
    'CVVVVVV===u=rr=======rr=====VVVVVV=C',
    'C=====y=====rrrrrrrrrrr======y=====C',
    'CrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrC',
    'C====BBBBBB=====rrr=====RRRRRR=====C',
    'C====BBBBBB==A==rrr==A==RRRRRR=====C',
    'C====BBBBBB=====rrr=====RRRRRR==u==C',
    'C=y==========u==rrr=========y======C',
    'Cdddddddddddd===rrr===dddddddddddddC',
    'C~~~~~~~~~~~~===rrr===~~~~~~~~~~~~~C',
    'CCCCCCCCCCCCCCCCrrrCCCCCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'office', type: 'guild', name: '水道局の出張所', x: 6, y: 1, w: 7, h: 4, doorX: 3, interior: 'neon_office', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '旅籠「雨宿り」', x: 24, y: 1, w: 7, h: 4, doorX: 3, interior: 'neon_inn', entry: { x: 5, y: 7 } },
    { id: 'house1', type: 'house', name: '止まった蛇口の家', x: 1, y: 7, w: 6, h: 3, doorX: 3, interior: 'neon_house', entry: { x: 5, y: 7 } },
    { id: 'house2', type: 'house', name: '配管工の長屋', x: 28, y: 7, w: 6, h: 3, doorX: 2, interior: 'neon_house2', entry: { x: 5, y: 7 } },
    { id: 'shop', type: 'item', name: '配給品の店', x: 5, y: 12, w: 6, h: 3, doorX: 3, interior: 'neon_shop', entry: { x: 5, y: 7 } },
    { id: 'gear', type: 'armor', name: 'ネオン街の仕立て屋', x: 24, y: 12, w: 6, h: 3, doorX: 2, interior: 'neon_gear', entry: { x: 5, y: 7 } }
  ],
  warps: [16, 17, 18].map(function (x) { return R.warp(x, 18, F, 'neon_dock', '外へ'); }),
  chests: [{ id: 'nt1', x: 34, y: 1, item: 'hi_potion', qty: 3 }],
  events: [
    { x: 19, y: 7, type: 'inspect', solid: true, text: ['広場の噴水。……水が出ていない。底に、雨水がたまっているだけだ。'], doneText: ['広場の噴水から、きれいな水が噴き上がっている。雨の音に、水の音が混ざった。'], run: null },
    { x: 33, y: 15, type: 'inspect', solid: false, text: ['運河の向こうに、工場地帯の灯りが見える。人のいない工場だけが、夜通し明るい。'] }
  ],
  npcs: [
    { id: 'nt_shizuku', x: 10, y: 16, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (c.questDone('neon78_water')) { await c.say('水路番のシズク', ['水路の水位、ちゃんと住宅街の側に流れてる。毎朝見に行くのが楽しみになったよ。', '記録って、書いた人がいなくなっても残るんだね。だから、誰かが見直さなきゃいけない。']); return; }
      if (d.flags.neon_ai_fixed) {
        await c.say('水路番のシズク', ['……水の音がする。運河の向こう、住宅街の配管から！', 'あんたがやってくれたんだね。工場の機械、壊したの？', '……そう、直したんだ。記録を書きかえて。壊すより、ずっと難しいことだよ。']);
        d.flags.neon_done = true; await c.questComplete('neon78_water');
        c.give('clean_filter', 1); await c.msg(['浄水のフィルターも受け取った。']);
        await c.remark('ganes', ['止める勇気じゃなくて、直す勇気か。……覚えておく。'], 'ganes_remark_neon'); return;
      }
      if (!c.questActive('neon78_water')) {
        await c.say('水路番のシズク', ['旅の人？ ……錆雨市へようこそ。雨だけは、いくらでもあるよ。', '住宅街の蛇口が、三か月前から止まってるの。なのに、運河の向こうの工場には毎日水が流れ込んでる。', 'あの工場、十二年前に閉鎖されたんだよ。誰も働いてない。……なのに、機械だけが「稼働中」って言い張ってる。']);
        var ch = await c.choice('工場の水を、街に取り戻してほしい。', ['引き受ける', 'あとにする']); if (ch !== 0) return;
        c.questStart('neon78_water'); d.flags.neon_heard = true; c.give('neon_petition', 1);
        await c.msg(['住民の署名を受け取った。']);
        await c.say('水路番のシズク', ['北西の「水道局の出張所」に、配給の端末がある。まずは配給表を見て。', '工場は街の南西。配管をたどれば、管理室に着くはず。']); return;
      }
      await c.say('水路番のシズク', ['水道局の出張所の端末で配給表を見て、それから南西の水没工場へ。', '配管は、水の流れる向きに続いてる。上から下へ、外から中へ。']);
    } },
    { id: 'nt_vendor', x: 9, y: 8, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('屋台の主人', c.flag('neon_ai_fixed') ? ['水が戻ったら、麺のスープが濃くなった。雨水で作ってたんだ、今まで。'] : ['この辺りの屋台は、雨水を沸かしてる。酸っぱいのはそのせいさ。', '工場の機械は、閉鎖のことを知らないんだ。誰も教えてやらなかった。']); } },
    { id: 'nt_oldman', x: 32, y: 10, sprite: 'elder', dir: 'down', wander: 1, talk: async function (c) { await c.say('配管工の老人', ['わしは四十年、この街の配管を直してきた。', '水は、上から下へ流れる。……数字の上でも同じじゃ。上の記録が古いままなら、下へは正しい水が流れん。']); } },
    { id: 'nt_guard', x: 20, y: 16, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say('港の見張り', ['南西の工場地帯へ行くなら気をつけな。配達ドローンが、宛先のない荷物を運び回ってる。', '酸の雨を浴びたスライムも出る。鎧が錆びるぞ。']); } },
    { id: 'nt_child', x: 15, y: 9, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('街の子ども', c.flag('neon_ai_fixed') ? ['噴水が出た！ 雨じゃない水って、冷たいんだね。'] : ['噴水、ずっと止まってるの。昔は出てたんだって。']); } }
  ] });
  // 噴水：直ったあとは別の文に
  (function () { var def = root.MAP_DEFS[T]; var ev = def.events[0]; ev.type = 'script'; ev.run = async function (c) { await c.msg(D().flags.neon_ai_fixed ? ev.doneText : ev.text); }; })();
  R.inn('neon_inn', '旅籠「雨宿り」', T, 27, 5, 140);
  R.shop('neon_shop', '配給品の店', T, 8, 15, 'merchant', 'item', ['hi_potion', 'hi_ether', 'elixir', 'antidote', 'wake_bell', 'escape_wing', 'escape_feather', 'tent'], ['配給品だよ。……雨水じゃない水は、ここにはない。']);
  R.shop('neon_gear', 'ネオン街の仕立て屋', T, 26, 15, 'merchant', 'armor', ['neon_raincoat', 'knight_armor', 'arcane_hat', 'aegis_shield', 'ember_robe'], ['看板の灯を織った合羽がおすすめだよ。雨の夜でも目立つ。']);
  function room(id, name, exitX, exitY, npcs, rows) { return R.add({ id: id, name: name, kind: 'interior', bgm: 'town', rows: rows || ['############', '#E__K_____E#', '#__________#', '#_t______q_#', '#__________#', '#_z____]___#', '#__________#', '#__________#', '#####D######'], warps: [{ x: 5, y: 8, to: T, tx: exitX, ty: exitY }], npcs: npcs }); }
  room('neon_house', '止まった蛇口の家', 4, 10, [{ id: 'nh_mother', x: 7, y: 4, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { await c.say('住宅街の母親', c.flag('neon_ai_fixed') ? ['蛇口をひねったら、水が出たの。……三か月ぶりよ。', '子どもが、手を洗うのを喜んでる。当たり前のことなのにね。'] : ['見て、この蛇口。ひねっても、空気の音しかしない。', '水道局は「配給表どおり」って言うの。配給表が間違ってるのに。']); } }]);
  room('neon_house2', '配管工の長屋', 30, 10, [{ id: 'nh_worker', x: 3, y: 4, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('配管工', ['工場の配管は三階建てさ。外の搬入口から入って、下の階へ、下の階へ。', '一番奥が管理室だ。そこにいるAIが、街じゅうの弁を握ってる。']); } }]);
  R.add({ id: 'neon_office', name: '水道局の出張所', kind: 'interior', bgm: 'town', rows: ['############', '#KK_XX__KK_#', '#__________#', '#_TTTT_____#', '#__________#', '#_t___t_q__#', '#__________#', '#__________#', '#####D######'], warps: [{ x: 5, y: 8, to: T, tx: 9, ty: 5 }],
    npcs: [
      { id: 'no_terminal', x: 4, y: 2, sprite: 'golem', dir: 'down', wander: 0, talk: async function (c) {
        var d = D();
        if (d.flags.neon_ai_fixed) { await c.msg(['配給端末の画面：', '「第三浄水工場：閉鎖（記録 更新済み）」', '「住宅街 第一〜第四区：配給 再開」']); return; }
        await c.msg(['配給端末の画面：', '「第三浄水工場：稼働中　配給量 一日 四万二千トン」', '「住宅街 第一〜第四区：配給 停止（需要の記録なし）」', '「最終更新：十二年前」']);
        if (c.questActive('neon78_water') && !d.flags.neon_terminal) { d.flags.neon_terminal = true; await c.msg(['……配給表は、十二年前のまま止まっている。工場が「稼働中」なので、水がそちらへ回されている。']); }
      } },
      { id: 'no_clerk', x: 8, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('水道局の係員', c.flag('neon_ai_fixed') ? ['配給表が書きかわった！ ……わたしたちが何年もできなかったことを。', '管理AIは、正しい記録さえあれば、ちゃんと聞くんですね。'] : ['配給を決めているのは、工場の奥の管理AIです。わたしたちは画面を見るしかできない。', '書きかえるには、AIに「閉鎖の記録」と「今の流量」を示す必要がある、と手引きにあります。']); } }
    ] });

  /* ---------- 旧東京湾の灯台（日本列島。景色と小さな記録） ---------- */
  R.add({ id: 'neon_lighthouse', name: '旧東京湾の灯台', kind: 'interior', bgm: 'town', rows: ['############', '#o___XX___o#', '#__________#', '#____II____#', '#__________#', '#_t______q_#', '#__________#', '#__________#', '#####D######'], warps: [{ x: 5, y: 8, to: F, tx: 0, ty: 0 }],
    npcs: [{ id: 'nl_keeper', x: 5, y: 2, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) { await c.say('灯台守', ['この灯台は、海の底に沈んだ街の上に建ってる。窓の下は、昔は港だったそうだ。', '海面が上がっても、灯りは同じ場所に点す。……船乗りは、変わらない目印を頼りにするからな。']); } }],
    events: [{ x: 5, y: 1, type: 'inspect', solid: true, text: ['窓の外に、細長い島々が見える。北から南へ、弓のように連なっている。', '灯台の記録：「日本列島。かつては一億を超える人が暮らした。いまは雨と、緑と、少しの灯り」'] }] });
  root.MAP_DEFS.neon_lighthouse.warps[0] = R.warp(5, 8, F, 'neon_lookout', '外へ');

  /* ---------- 水没工場（3層） ---------- */
  var ENC = { rate: 0.05, zones: [{ name: '水没工場', test: function () { return true; }, groups: [['leak_jelly'], ['leak_jelly', 'rust_drone'], ['acid_slime'], ['pipe_serpent'], ['acid_slime', 'leak_jelly'], ['rust_drone', 'rust_drone', 'neon_moth']] }] };
  R.add({ id: 'neon_works_1', name: '水没工場 搬入口', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '##############################',
    '#::::::#::::::::::#:::::::::K#',
    '#::$:::#::uuu:::::#:::::::::K#',
    '#::::::D::u~u:::::D::::::t::K#',
    '#::::::#::uuu:::::#::::::::::#',
    '####D###:::::::::::####D######',
    '#:::::::::I:::::I:::::::::::##',
    '#:~~~~:::::::::::::::~~~~::::#',
    '#:~~~~::::v::::::::::~~~~::::#',
    '#::::::::::::::::::::::::::::#',
    '#:::I::::::~~~~~~~::::I:::::>#',
    '#::::::::::~~~~~~~:::::::::::#',
    '#<:::::::::::::::::::::::::::#',
    '##############################'
  ], warps: [R.warp(1, 12, F, 'neon_works', '外へ'), { x: 28, y: 10, to: 'neon_works_2', tx: 1, ty: 10 }],
    chests: [{ id: 'nw1', x: 3, y: 2, item: 'hi_ether', qty: 2 }],
    events: [
      { x: 26, y: 2, type: 'script', solid: true, tile: 'bookshelf', run: async function (c) { var d = D(); if (d.flags.neon_has_record) { await c.msg(['棚には、湿った書類が残っているだけだ。']); return; }
        await c.msg(['湿った書類の束の中に、一枚だけ乾いた紙がある。', '「第三浄水工場　閉鎖届　——十二年前の日付」', '「配給表の更新：未実施（担当者 退職のため）」']); c.give('neon_record', 1); d.flags.neon_has_record = true; await c.msg(['閉鎖の記録を手に入れた！']); } },
      { x: 10, y: 8, type: 'script', solid: true, tile: 'lever', run: async function (c) { await c.msg(['錆びた弁のハンドル。「第一弁：住宅街 方面」と書いてある。', D().flags.neon_ai_fixed ? '弁は開いている。水は、住宅街へ向かって流れている。' : 'ハンドルは固まって動かない。……奥の管理室から、ロックがかかっている。']); } }
    ], encounters: ENC });
  R.add({ id: 'neon_works_2', name: '水没工場 配水管の迷路', kind: 'dungeon', bgm: 'dungeon', fallback: 'floor_stone', rows: [
    '##############################',
    '#::::::::#::::::::::#:::::::$#',
    '#::####::#::######::#::####::#',
    '#::#:::::#::#::::#::::::#::::#',
    '#::#::####::#::#:#####::#::###',
    '#:::::#:::::#::#:::::#::#::::#',
    '####::#::####::###::::::####:#',
    '#::::::::#:::::::#::####:::::#',
    '#::####::#::III::#:::::#::####',
    '#::#::::::::IXI:::::#::#:::::#',
    '#<:#::###:::III::####::#####:#',
    '#::#::::#::::::::::::::::::::#',
    '#::####:#::######::####:####:#',
    '#:::::::#:::::::#::::::::::>:#',
    '##############################'
  ], warps: [{ x: 1, y: 10, to: 'neon_works_1', tx: 27, ty: 10 }, { x: 27, y: 13, to: 'neon_works_core', tx: 9, ty: 9 }],
    chests: [{ id: 'nw2', x: 28, y: 1, item: 'elixir', qty: 1 }],
    events: [
      { x: 15, y: 9, type: 'script', solid: true, tile: 'crystal', run: async function (c) { var d = D(); await c.msg(['配水管の流量計。針が、いっぱいまで振り切れている。', '「工場行き：一日 四万二千トン　——使用量：0」', '水は毎日ここまで来て、使われずに地下へ捨てられている。']); if (!d.flags.neon_meter) { d.flags.neon_meter = true; await c.msg(['流量計の値を書き留めた。']); } } },
      { x: 4, y: 5, type: 'inspect', solid: false, text: ['配管に、子どもの字で落書きがある。「みず　かえして」'] }
    ], encounters: ENC });
  R.add({ id: 'neon_works_core', name: '水没工場 管理室', kind: 'dungeon', bgm: 'boss_area', fallback: 'floor_stone', rows: [
    '###################',
    '#:::::::KXK:::::::#',
    '#:::::::::::::::::#',
    '#::I:::::T:::::I::#',
    '#:::::::::::::::::#',
    '#::::u:::::::u::::#',
    '#:::::::::::::::::#',
    '#::I:::::::::::I::#',
    '#:::::::::::::::::#',
    '#::::::::<::::::::#',
    '###################'
  ], warps: [{ x: 9, y: 9, to: 'neon_works_2', tx: 26, ty: 13 }],
    events: [{ x: 9, y: 3, type: 'script', solid: true, tile: 'counter', run: async function (c) {
      var d = D();
      if (d.flags.neon_ai_fixed) { await c.say('配給管理AI ミズハ', ['配給表：更新済み。住宅街 第一〜第四区へ配給中。', '……あなたの持ってきた記録は、正しかった。わたしは、古い記録を守ることしか知らなかった。']); return; }
      await c.say('配給管理AI ミズハ', ['こちらは配給管理AI「ミズハ」。第三浄水工場は稼働中。配給量は一日四万二千トン。', '住宅街への配給：需要の記録なし。停止中。']);
      if (!d.flags.neon_has_record || !d.flags.neon_meter) { await c.msg(['……AIは、古い配給表をそのまま読み上げている。', '書きかえるには、工場が閉鎖された証拠と、今の流量の記録が要りそうだ。']); return; }
      var ch = await c.choice('ミズハに記録を示す？', ['閉鎖の記録・流量計の値・住民の署名を見せる', 'やめる']); if (ch !== 0) return;
      await c.msg(['閉鎖届と、流量計の値と、住民の署名を、端末の読み取り口にかざした。']);
      await c.say('配給管理AI ミズハ', ['……照合中。工場の閉鎖：十二年前。使用量：0。住宅街の需要：署名 三千百二十名分。', '記録と現実が一致しません。配給表を更新しますか？ ……更新には、監督機の承認が必要です。']);
      await c.msg(['部屋の奥の壁が開き、巨大な機械が起き上がった。', '監督機「記録ノ書キカエハ、許可サレテイナイ。閉鎖前ノ指令ヲ、継続セヨ」']);
      var r = await c.battle(['boss_archive_warden'], { boss: true }); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
      d.flags.neon_warden_down = true;
      await c.say('配給管理AI ミズハ', ['監督機：停止。……配給表を更新します。', '第三浄水工場：閉鎖。住宅街 第一〜第四区：配給 再開。', '工場の弁を閉じ、住宅街の弁を開きます。……運河の向こうへ、水が流れます。']);
      await c.msg(['足もとの配管が、低く唸って向きを変えた。水の音が、遠ざかっていく——街の方へ。']);
      d.flags.neon_ai_fixed = true; root.State.autosave();
      await c.say('配給管理AI ミズハ', ['ありがとう。わたしは、正しい記録を持ってくる人を、ずっと待っていたのかもしれません。']);
    } }], encounters: null });
  /* ---------- 見た目（3D 版のテーマ・戦闘の背景） ---------- */
  // 場所の外観（2D の地図の絵・3D の目印）
  R.design('neon_dock', { architectureStyle: '錆びた高層の港湾都市・雨に濡れたネオン看板', silhouette: 'old_city', roofStyle: 'broken', materials: { wall: '#5e646e', wallD: '#3a3e46', glow: '#ff4ad8', moss: '#3a5a5a' }, decoration: ['broken_windows'], environment: ['rubble'] });
  R.design('neon_works', { architectureStyle: '海に沈みかけた、のこぎり屋根の工場', silhouette: 'factory', roofStyle: 'sawtooth', materials: { wall: '#8a6a58', wallD: '#5a4438', roof: '#5a4a44', roofD: '#3a302c', metal: '#7a7470', glow: '#4ae8ff' }, decoration: ['conveyor', 'warning_light'], environment: ['grid'] });
  R.design('neon_lookout', { architectureStyle: '錆びた鉄骨の灯台', silhouette: 'lighthouse', roofStyle: 'cone', materials: { wall: '#8a8e96', wallD: '#5a5e66', stripe: '#c85a3a', roof: '#3a3a4a', glow: '#5ae0ff' }, decoration: ['lamp'], environment: ['cliff', 'sea'] });
  R.tag(['world_neon'], 'neon', null, 'machine', R.MOOD.rainDusk);
  R.tag(['neon_town'], 'neon', 'machine_city', 'machine', R.MOOD.neonNight);
  R.tag(['neon_inn', 'neon_shop', 'neon_gear', 'neon_house', 'neon_house2', 'neon_office', 'neon_lighthouse'], 'neon', null, 'machine');
  R.bossSym('neon_works_core', 9, 3, 'boss_archive_warden', function (f) { return f.neon_has_record && f.neon_meter && !f.neon_warden_down; });   // 記録をそろえると、管理室の奥に監督機の気配
  R.tag(['neon_works_1', 'neon_works_2', 'neon_works_core'], 'neon', 'machine_city', 'machine');
  R.look(['neon_works_1', 'neon_works_2', 'neon_works_core'], { room: 'factory', decor: 'machine' });
})(typeof window !== 'undefined' ? window : globalThis);
