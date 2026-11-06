/* =========================================================
   Data / Region78 オルビス（v7.8）：地球周回軌道「環星ステーション・オルビス」（地球の上の別の空間）
   ・到達：暗黒大陸の「虚無の荒野の前線基地」の転送門。開く条件は第15章「暗黒大陸」の完了（main_15。宇宙船の有無は問わない）。転送門で往復できる
   ・居住環（窓の外を地球が流れる）→ 無重力の観測棟（2 区画）→ 警報衛星の制御室。クリアのあと、地球を一望できる展望室が開く
   ・無重力の区画：明るい床（石の床）に乗ると、その向きに、壁か磁気の床（じゅうたん）に当たるまで流される（2D 版・3D 版とも World.onStep から）
   ・物語「途絶えた警報衛星」（orbis78_signal）：地上との通信が途絶えた警報衛星を復旧する
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.R78; if (!R) return; var A = R.A; var D = R.D;
  function open() { return R.questDone('main_15'); }   // 転送門の条件：暗黒大陸の攻略完了（第15章「暗黒大陸」）
  root.R78.orbisOpen = open;

  /* ---------- 敵（Lv37〜40） ---------- */
  R.special('solar_flare', { name: '太陽風', msg: 'は太陽風を浴びせた！', power: 0.8, all: true, element: 'fire' });
  R.special('false_alarm', { name: '誤った警報', msg: 'は鳴り止まない警報を響かせた！ 頭が割れそうだ……', status: { id: 'confuse', chance: 0.35 }, target: 'allies' });
  R.special('vacuum_pull', { name: '真空の吸い込み', msg: 'の周りの空気が抜けていく……！', power: 0.7, all: true, debuff: { agi: -0.25 }, turns: 2 });
  R.monster('drift_drone', { name: '漂流ドローン', lv: 37, arche: 'fast', art: { family: 'machine', c: { base: '#c0c8d8', accent: '#4a8aff', eye: '#ff4a4a' } }, family: '機械系', area: '環星ステーション', resist: { thunder: 1.5, ice: 0.8 }, actions: [A('attack', 3), A('skill', 'thunder', 1)], drops: [{ item: 'hi_ether', rate: 0.15 }], desc: '持ち場を失って、ステーションの中を漂っている。' });
  R.monster('vacuum_wraith', { name: '真空の霊', lv: 38, arche: 'mage', art: { family: 'spirit', c: { base: '#2a2a4a', accent: '#8a8aff', eye: '#ffffff' } }, family: '精霊系', area: '無重力の観測棟', resist: { light: 1.5, dark: 0 }, actions: [A('attack', 1), A('special', 'vacuum_pull', 2), A('skill', 'dark_bolt', 1)], drops: [{ item: 'hi_ether', rate: 0.2 }], desc: '音のない場所に生まれた影。' });
  R.monster('solar_jelly', { name: '太陽風のクラゲ', lv: 38, arche: 'mage', art: { family: 'jelly', c: { base: '#ffb04a', accent: '#fff0a0', eye: '#ff3a3a' } }, family: '精霊系', area: '無重力の観測棟', resist: { ice: 1.5, fire: 0 }, actions: [A('attack', 1), A('special', 'solar_flare', 2)], drops: [{ item: 'elixir', rate: 0.04 }], desc: '太陽の風に乗って、窓から入り込んだ。' });
  R.monster('meteor_golem', { name: '隕石ゴーレム', lv: 39, arche: 'tank', art: { family: 'golem', c: { base: '#5a4a4a', accent: '#ff8a3a', eye: '#ffd24a' } }, family: '魔法生物系', area: '環星ステーション', resist: { thunder: 0.6, ice: 1.4 }, actions: [A('attack', 2), A('special', 'crush', 1)], drops: [{ item: 'hi_potion', rate: 0.3 }], desc: '外壁にぶつかった隕石が、形を持った。' });
  R.monster('stardust_swarm', { name: '星屑の群れ', lv: 37, arche: 'glass', art: { family: 'swarm', c: { base: '#e0e8ff', accent: '#ffe08a', eye: '#4a8aff' } }, family: '精霊系', area: '無重力の観測棟', resist: { wind: 1.5, dark: 1.3 }, actions: [A('attack', 2), A('skill', 'sleep', 1)], drops: [{ item: 'calm_water', rate: 0.3 }], desc: '光る塵の群れ。近づくと眠くなる。' });
  R.monster('boss_sentinel_orbis', { name: '守衛AIセンチネル・オルビス', lv: 41, arche: 'tank', boss: true, hpMult: 18.2, atkMult: 2.0, magMult: 2.0, art: { family: 'turret', size: 'boss', c: { base: '#d0d8e8', accent: '#ff3a3a', eye: '#4affff' } }, family: '機械系', area: '警報衛星の制御室', resist: { thunder: 1.5, dark: 0.7, light: 0.8 },
    actions: [A('attack', 2), A('special', 'false_alarm', 1), A('special', 'solar_flare', 1), A('skill', 'thunder', 1), { type: 'special', id: 'call', summon: 'drift_drone', w: 1, hpBelow: 0.5 }], drops: [{ item: 'elixir', rate: 1 }], desc: '誤った警報を「脅威」と判定し、地上との回線を切り続けた守衛AI。' });

  /* ---------- 報酬 ---------- */
  R.weapon('orbit_bow', '周回軌道の弓', 'bow', 52, 0, { desc: '衛星の軌道を描く弓。素早さ+5', agi: 5, element: 'light' });
  R.armor('orbit_shield', '軌道の盾', 'shield', 32, 7200, { desc: 'ステーションの外壁の板で作った盾' });
  R.armor('star_ring', '星環の指輪', 'acc', 6, 0, { desc: '地球を回る輪を写した指輪。最大MP+20・魔法防御+4', mp: 20, mdef: 4 });

  /* ---------- クエスト ---------- */
  R.quest('orbis78_signal', { title: '途絶えた警報衛星', theme: '誤った警報を、正しく直す', desc: '地球を周回する環星ステーション・オルビス。地上へ災害を知らせる警報衛星の通信が途絶えている。無重力の観測棟を抜け、警報衛星の制御室で通信を復旧する。',
    steps: [['orb_arrived', '居住環で、管理AIノアの話を聞く'], ['orb_code_a', '無重力の観測棟（第1区画）の端末で、鍵コードの前半を得る'], ['orb_code_b', '無重力の観測棟（第2区画）の端末で、鍵コードの後半を得る'], ['orb_sat', '警報衛星の制御室で、守衛AIを止める'], ['orb_restored', '地上との通信を復旧する'], ['orb_done', '管理AIノアに報告する（展望室が開く）']],
    reward: { exp: 16000, gold: 9000, item: 'orbit_bow' } });
  R.obj('orbis78_signal', 'orb_arrived', 'npc:orbis_ring:or_noah', ['暗黒大陸の前線基地の転送門の先、地球の周回軌道。', '環星ステーション・オルビスの居住環。管理AIノア。', '前線基地の転送門でオルビスへ。居住環の広場の管理AIノアに話しかけよう。']);
  R.obj('orbis78_signal', 'orb_code_a', 'ev:orbis_obs_1:2,9', ['居住環の東。', '無重力の観測棟・第1区画の端末。', '観測棟の第1区画の左下の端末を調べよう。明るい床に乗ると流される。']);
  R.obj('orbis78_signal', 'orb_code_b', 'ev:orbis_obs_2:13,2', ['観測棟。', '第2区画の右上の端末。', '第2区画の右上の端末を調べよう。']);
  R.obj('orbis78_signal', 'orb_sat', 'ev:orbis_sat:8,2', ['観測棟の先。', '警報衛星の制御室の守衛AI。', '鍵コードで制御室の扉を開け、守衛AIを止めよう。']);
  R.obj('orbis78_signal', 'orb_restored', 'ev:orbis_sat:8,2', ['警報衛星の制御室。', '制御盤。', '制御盤で、地上との回線をつなぎ直そう。']);
  R.obj('orbis78_signal', 'orb_done', 'npc:orbis_ring:or_noah', ['居住環。', '管理AIノア。', 'ノアに、通信を復旧したことを伝えよう。']);

  /* ---------- 無重力：明るい床（石の床 '='）に乗ると、その向きに、止まれる所まで流される ---------- */
  var DRIFT = { stone: 1 };
  function driftEnd(m, x, y, dx, dy) { var d = D(); var n = 0; while (n < 40) { var nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) break; if (!m.passable(nx, ny, d) || m.npcAt(nx, ny) || m.warpAt(nx, ny)) break; var ev = m.eventAt(nx, ny); if (ev && ev.solid) break; x = nx; y = ny; n++; if (!DRIFT[m.tiles[y][x]]) break; } return { x: x, y: y, n: n }; }
  (function patch() { var W = root.World; if (!W || W._orbis78) return; W._orbis78 = true; var os = W.onStep;
    W.onStep = function () { var r = os.apply(this, arguments); try { var m = W.map, p = W.player; if (m && m.def && m.def.zeroG && !W.busy && DRIFT[m.tiles[p.y][p.x]]) { var dd = W.delta(p.dir); var e = driftEnd(m, p.x, p.y, dd[0], dd[1]); if (e.n > 0) { if (root.Win && root.Win.toast) root.Win.toast('無重力：流された！'); W.enterMap(m.id, e.x, e.y, p.dir, { raw: true }); } } } catch (e) { if (root.console) console.error(e); } return r; };
  })();

  /* ---------- 居住環 ---------- */
  var RING = 'orbis_ring';
  R.add({ id: RING, name: '環星ステーション・オルビス 居住環', kind: 'dungeon', bgm: 'town', fallback: 'floor_stone', orbit78: true, rows: [
    '##################################',
    '#oooooooooooooooooooooooooooooooo#',
    '#::::::::::::::::::::::::::::::::#',
    '#::############################::#',
    '#::#E:E:E:#::::#XX#::::#KK::TT#::#',
    '#::#::::::D::::#::#::::D::::::#::#',
    '#::#::::::#::::####::::#::::::#::#',
    '#::########::::::::::::########::#',
    '#::::::::::::::::::::::::::::::>:#',
    '#ooooooooooooooLooooooooooooooooo#',
    '##################################'
  ], warps: [{ x: 1, y: 8, to: 'dark_camp', tx: 6, ty: 16 }, { x: 31, y: 8, to: 'orbis_obs_1', tx: 13, ty: 2 }, { x: 15, y: 9, to: 'orbis_lounge', tx: 7, ty: 6 }],
    chests: [{ id: 'or1', x: 5, y: 6, item: 'elixir', qty: 1 }],
    events: [
      { x: 15, y: 9, type: 'gate', solid: true, doneFlag: 'orb_lounge_open', needFlag: 'orb_done', text: ['「展望室」——扉は閉じている。（警報衛星を復旧すると開く）'], openText: ['展望室の扉が開いた。'] },
      { x: 9, y: 1, type: 'inspect', solid: true, text: ['窓の外を、青い地球がゆっくりと流れていく。', '雲の渦の下に、大陸の形が見える。……さっきまで歩いていた場所だ。'] },
      { x: 24, y: 9, type: 'inspect', solid: true, text: ['足もとの窓の向こうに、夜の側の地球。街の灯りが、点のように散らばっている。'] }
    ],
    npcs: [
      { id: 'or_noah', x: 13, y: 5, sprite: 'golem', dir: 'down', wander: 0, talk: async function (c) {
        var d = D();
        if (c.questDone('orbis78_signal')) { await c.say('管理AIノア', ['展望室は開いています。どうぞ、地球をご覧ください。', '警報衛星は、いまも地上を見ています。……正しく鳴るために。']); return; }
        if (d.flags.orb_restored) { await c.say('管理AIノア', ['地上との回線を確認。……前線基地、鍛冶街、環状都市、灰岸の避難所。応答があります。', '警報衛星は、十年ぶりに地上と話しています。誤った警報は止まり、正しい警報だけが届くようになりました。', '感謝を。展望室を開きます。地球を、一度に見てください。']); d.flags.orb_done = true; await c.questComplete('orbis78_signal'); c.give('star_ring', 1); await c.msg(['星環の指輪も受け取った。']); return; }
        if (!c.questActive('orbis78_signal')) {
          await c.say('管理AIノア', ['ようこそ、環星ステーション・オルビスへ。わたしは管理AIのノア。', 'このステーションは、地球を回りながら、地上へ災害の警報を送るために造られました。', '十年前、警報衛星が「誤った警報」を受け取り続けて、守衛AIが脅威と判定しました。守衛AIは、地上との回線を切ったままです。']);
          var ch = await c.choice('地上との通信を、取り戻してほしい。', ['引き受ける', 'あとにする']); if (ch !== 0) return;
          c.questStart('orbis78_signal'); d.flags.orb_arrived = true;
          await c.say('管理AIノア', ['制御室の扉には、鍵コードが要ります。前半と後半は、東の観測棟の二つの区画の端末に。', '観測棟は無重力です。明るい床に乗ると、壁か磁気の床まで流されます。……流れに逆らわず、流れを使ってください。']); return;
        }
        await c.say('管理AIノア', ['東の観測棟の二つの端末で鍵コードを。明るい床では流され、じゅうたんの床で止まれます。']);
      } },
      { id: 'or_engineer', x: 21, y: 5, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('最後の技師', ['わたしは、交代の船が来なくなってから、ここに残った。', '地上の誰かが、転送門を見つけてくれると信じていた。……前線基地から来たのか。あそこに門があったとはね。']); } },
      { id: 'or_botanist', x: 26, y: 5, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) { var ch = await c.choice('温室係「休んでいく？ 休眠カプセルなら空いてる」', ['休む（200G）', '話を聞く', 'やめる']); if (ch === 0) { await c.inn(200); return; } if (ch === 1) await c.say('温室係', ['この温室の苗は、地上から持ってきた種。窓の外の大陸と、同じ植物が育ってる。', '地球を見ながら土をいじると、変な気持ちになるよ。全部、あそこから来たんだなって。']); } },
      { id: 'or_kid', x: 12, y: 2, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('ステーションの子ども', ['ぼく、ここで生まれたんだ。地面って、ずっと動かないんでしょ？ 変なの。', '窓のいちばん青い所が海。白い所が氷。……ぼく、いつか氷の上を歩いてみたい。']); } },
      { id: 'or_vendor', x: 27, y: 6, sprite: 'golem', dir: 'down', wander: 0, talk: async function (c) { await c.shop('item', ['hi_potion', 'hi_ether', 'elixir', 'phoenix_feather', 'wake_bell', 'antidote']); } },
      { id: 'or_armory', x: 17, y: 7, sprite: 'golem', dir: 'down', wander: 0, talk: async function (c) { await c.shop('armor', ['orbit_shield', 'aegis_shield', 'dragon_mail', 'arcane_hat']); } }
    ], encounters: null });

  /* ---------- 無重力の観測棟（2 区画） ---------- */
  var OB_ENC = { rate: 0.045, zones: [{ name: '無重力の観測棟', test: function () { return true; }, groups: [['vacuum_wraith'], ['solar_jelly', 'stardust_swarm'], ['drift_drone', 'drift_drone'], ['meteor_golem'], ['vacuum_wraith', 'stardust_swarm']] }] };
  R.add({ id: 'orbis_obs_1', name: '無重力の観測棟 第1区画', kind: 'dungeon', bgm: 'dungeon', fallback: 'carpet', zeroG: true, rows: [
    '################',
    '#pp=====#====pp#',
    '#p#=#=#=#=#=#p<#',
    '#p#=#=#===#=#pp#',
    '#p===========pp#',
    '#pp#=#=#p#=#=#p#',
    '#p==p======p==p#',
    '#p#=#=#p#=#=#=p#',
    '#p===========pp#',
    '#pX#=#=#p#=#=#p#',
    '#pp=====>====pp#',
    '################'
  ], warps: [{ x: 14, y: 2, to: RING, tx: 30, ty: 8 }, { x: 8, y: 10, to: 'orbis_obs_2', tx: 2, ty: 9 }],
    chests: [{ id: 'ob1', x: 8, y: 5, item: 'hi_ether', qty: 2 }],
    events: [{ x: 2, y: 9, type: 'script', solid: true, tile: 'crystal', run: async function (c) { var d = D(); if (d.flags.orb_code_a) { await c.msg(['端末：「鍵コード 前半：送信済み」']); return; } await c.msg(['観測の端末。画面に、地球の雲の動きが流れている。', '端末：「制御室 鍵コード 前半——ORB-1」']); d.flags.orb_code_a = true; await c.msg(['鍵コードの前半を書き留めた。']); } },
      { x: 8, y: 1, type: 'inspect', solid: true, text: ['観測窓。地球の縁が、青く光っている。……その上を、細い光の輪が回っている。'] }],
    encounters: OB_ENC });
  R.add({ id: 'orbis_obs_2', name: '無重力の観測棟 第2区画', kind: 'dungeon', bgm: 'dungeon', fallback: 'carpet', zeroG: true, rows: [
    '################',
    '#pp====#=====pp#',
    '#p#=#=#p#=#=#Xp#',
    '#p===========pp#',
    '#pp#=#=#p#=#=#p#',
    '#p===========pp#',
    '#p#=#=#p#=#=#=p#',
    '#p===========pp#',
    '#pp#=#=#p#=#=#p#',
    '#<=====p==pppU>#',
    '################'
  ], warps: [{ x: 1, y: 9, to: 'orbis_obs_1', tx: 7, ty: 10 }, { x: 14, y: 9, to: 'orbis_sat', tx: 7, ty: 7 }],
    chests: [{ id: 'ob2', x: 8, y: 2, item: 'elixir', qty: 1 }],
    events: [{ x: 13, y: 2, type: 'script', solid: true, tile: 'crystal', run: async function (c) { var d = D(); if (d.flags.orb_code_b) { await c.msg(['端末：「鍵コード 後半：送信済み」']); return; } await c.msg(['観測の端末。画面に、警報衛星の軌道が描かれている。', '端末：「制御室 鍵コード 後半——BIS-7」']); d.flags.orb_code_b = true; await c.msg(['鍵コードの後半を書き留めた。']); } }],
    encounters: OB_ENC });
  root.MAP_DEFS.orbis_obs_2.events.push({ x: 13, y: 9, type: 'gate', solid: true, doneFlag: 'orb_door_open', needFlag: 'orb_codes', text: ['制御室の扉。「鍵コードを入力してください（前半・後半）」'], openText: ['鍵コード「ORB-1」「BIS-7」を入力した。制御室の扉が開いた。'] });
  // 鍵コードがそろったら扉の条件のフラグ
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function () { var d = D(); if (d && d.flags && d.flags.orb_code_a && d.flags.orb_code_b) d.flags.orb_codes = true; });

  /* ---------- 警報衛星の制御室 ---------- */
  R.add({ id: 'orbis_sat', name: '警報衛星の制御室', kind: 'dungeon', bgm: 'boss_area', fallback: 'carpet', orbit78: true, rows: [
    '###############',
    '#ooooooooooooo#',
    '#pppppppKppppp#',
    '#pppIpppppppIp#',
    '#ppppppppppppp#',
    '#pp~~~ppp~~~pp#',
    '#ppppppppppppp#',
    '#pppIpppppIppp#',
    '#pppppp<pppppp#',
    '###############'
  ], warps: [{ x: 7, y: 8, to: 'orbis_obs_2', tx: 12, ty: 9 }],
    events: [{ x: 8, y: 2, type: 'script', solid: true, tile: 'counter', run: async function (c) {
      var d = D(); if (d.flags.orb_restored) { await c.msg(['制御盤：「地上回線：接続中。警報：正常」']); return; }
      if (!d.flags.orb_sat) {
        await c.msg(['制御盤の上に、白い守衛AIが浮かんでいる。赤い警告灯が、ずっと点滅している。', '守衛AI「警報、警報。地上ヨリ脅威。回線ヲ遮断セヨ。遮断セヨ」', '……十年前の誤った警報を、今も「脅威」と判定し続けている。']);
        var r = await c.battle(['boss_sentinel_orbis'], { boss: true }); if (r === 'lost') { await root.World.gameOver(); return; } if (r !== 'won') return;
        d.flags.orb_sat = true; await c.msg(['守衛AIの警告灯が、ゆっくりと消えた。', '制御盤に記録が残っている：「警報の発信元：地上の観測所の故障。脅威ではない」']); root.State.autosave();
      }
      var ch = await c.choice('地上との回線をつなぎ直す？', ['つなぎ直す', 'まだ']); if (ch !== 0) return;
      await c.msg(['回線のスイッチを入れた。ザ……ザザ……', '「……こちら、虚無の荒野の前線基地……聞こえるか……オルビス……」', '地上の声が、十年ぶりに届いた。警報衛星のアンテナが、地球の方へ向き直る。']);
      d.flags.orb_restored = true; root.State.autosave();
    } }], encounters: null });

  /* ---------- 展望室（クリアのあと） ---------- */
  R.add({ id: 'orbis_lounge', name: '展望室', kind: 'dungeon', bgm: 'town', fallback: 'carpet', orbit78: true, rows: [
    '###############',
    '#ooooooooooooo#',
    '#ppppppppppppp#',
    '#ppeppppppeppp#',
    '#ppppppppppppp#',
    '#ppeppppppeppp#',
    '#ppppppppppppp#',
    '#pppppp<pppppp#',
    '###############'
  ], warps: [{ x: 7, y: 7, to: RING, tx: 15, ty: 8 }],
    events: [{ x: 7, y: 1, type: 'script', solid: true, run: async function (c) {
      await c.msg(['壁一面の窓の向こうに、地球が丸ごと浮かんでいる。', '南北アメリカ、ユーラシア、アフリカ、オーストラリア、南極。……そして、弓のように連なる日本列島。', '歩いてきた道、船で渡った海、飛んだ空。全部が、一つの青い球の上にあった。']);
      var ch = await c.choice('窓から、世界の地図を見渡す？', ['見渡す', 'やめる']); if (ch !== 0) return;
      var MM = root.Minimap; if (MM && MM.openBig) { MM.openBig(); if (MM.setMode) MM.setMode('world'); if (MM.home) MM.home(); if (MM.drawBig) MM.drawBig(); }
    } }], npcs: [{ id: 'ol_noah', x: 11, y: 6, sprite: 'golem', dir: 'down', wander: 0, talk: async function (c) { await c.say('管理AIノア', ['この窓は、ステーションを造った人たちが、いちばんこだわった場所だそうです。', '「地球を一度に見られる場所が、一つはあるべきだ」と。']); } }], encounters: null });

  /* ---------- 前線基地の転送門（第15章「暗黒大陸」のあと） ---------- */
  (function () { var def = root.MAP_DEFS.dark_camp; if (!def) return; if (!(root.World76 && root.World76.earth)) return;   // 3D 版の地球の世界のときだけ（2D 版の前線基地は変えない）
    def.events = def.events || []; def.npcs = def.npcs || [];
    def.events.push({ x: 5, y: 17, type: 'script', solid: true, tile: 'crystal', orbisGate: true, run: async function (c) {
      if (!open()) { await c.msg(['結晶の柱が、地面に半分埋まっている。表面に、輪の形の紋章。……今は眠っているようだ。', '（暗黒大陸の攻略を終えると、目を覚ますようだ）']); return; }
      var ch = await c.choice('転送門が青く光っている。行き先：「環星ステーション・オルビス」', ['転送する', 'やめる']); if (ch !== 0) return;
      if (root.Audio) root.Audio.sfx('magic'); await c.msg(['体が光に包まれ、足もとの重さが消えた——']);
      root.World.enterMap('orbis_ring', 2, 8, 'right', { raw: true });
    } });
    def.npcs.push({ id: 'dc_gatetech', x: 7, y: 16, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('転送門の技師', open() ? ['転送門が目を覚ました！ 行き先は……地球を回る輪、「環星ステーション・オルビス」だ。', '宇宙船がなくても、門で行き来できる。帰りも、向こうの門から戻ってこられるよ。'] : ['ゼロメアから来た技師だ。この結晶の柱は、古い転送門らしい。', '荒野の魔物の気配が強すぎて、門が眠ったままだ。……暗黒大陸の攻略が終われば、目を覚ますかもしれない。']); } });
  })();
  /* ---------- 見た目（3D 版のテーマ・戦闘の背景） ---------- */
  R.bossSym('orbis_sat', 8, 2, 'boss_sentinel_orbis', function (f) { return !f.orb_sat; });
  R.tag(['orbis_ring', 'orbis_obs_1', 'orbis_obs_2', 'orbis_sat', 'orbis_lounge'], 'orbis', 'machine_city', 'machine');
  ['orbis_ring', 'orbis_obs_1', 'orbis_obs_2', 'orbis_sat', 'orbis_lounge'].forEach(function (id) { var df = root.MAP_DEFS[id]; if (df) df.space76 = true; });   // 3D：空を星空に（宇宙の駅）
  if (root.MAP_DEFS.orbis_lounge) root.MAP_DEFS.orbis_lounge.earthWindow78 = true;   // 3D：窓の外に地球（three-src/src/world/Effects78.js）
  R.look(['orbis_ring', 'orbis_obs_1', 'orbis_obs_2', 'orbis_sat', 'orbis_lounge'], { room: 'cyber', decor: 'tech' });
})(typeof window !== 'undefined' ? window : globalThis);
