/* =========================================================
   Data / Dragon (v5.5 Phase 7-1) : 竜炎火山群島——鍛冶街イグナス（竜の鍛冶）、火口の祭壇（火入れの祭り）、竜脈洞窟（古竜）、竜脈の最深部（隠しダンジョン5）
   ・到達：マクディア魔導王国の南端から「南の遠洋航路」（遠洋航海船／飛空艇。魔導都に入ったあと）
   ・ignas_forge「竜の鍛冶」：トレード武器6種を、竜の鱗1枚＋3000Gで _2（強化版）に鍛え直す。装備中の武器もそのまま鍛え直せる
   ・ignas_festival「火口の祭り」：炎の揺らぎ（−100〜+100。RCIの±70のように底と天井の目安がある学習用の演出）が
       −70より下で底を打ち、上がりはじめたところで点火する。沈んでいる途中・上がりきってからは失敗（何度でもやり直せる）
   ・ignas_dragon「竜脈の古竜」：番竜を倒し、古竜の三つの問い（波形の転換／資金管理／見送り）に答える
   ・hidden_dragon_vein「竜脈の最深部」：古竜の間の奥、波形の紋章の扉（トレーダーランクB）→ 原初の炎竜（任意の強敵）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add;
  function D() { return root.State.data; }
  function inParty(id) { var d = D(); return !!(d.companions[id] && d.party.indexOf(id) >= 0); }
  function esc(s) { return root.Win ? root.Win.esc(s) : String(s); }
  function allActors() { var d = D(); return [d.hero].concat(Object.keys(d.companions).map(function (k) { return d.companions[k]; })); }

  /* =========================================================
     鍛冶街イグナス
     ========================================================= */
  add({ id: 'ignas_town', name: '鍛冶街イグナス', kind: 'town', bgm: 'town', fallback: 'ash', style: 'basalt', rows: [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'C888888888888BBBBBBBBBB888888888888C',
    'C888888888888BBBBBBBBBB888888888888C',
    'C88BBBBBBBBB8BBBBBBBBBB88BBBBBBBB88C',
    'C88BBBBBBBBB8BBBBBBBBBB88BBBBBBBB88C',
    'C88BBBBBBBBB8BBBBBBBBBB88BBBBBBBB88C',
    'C88BBBBBBBBB8BBBBBBBBBB88BBBBBBBB88C',
    'C88BBBBBBBBB88888rr888888BBBBBBBB88C',
    'C88888888888888y8rr8y88888888888888C',
    'C8rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr8C',
    'C8rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr8C',
    'C8888888888888888rr8888888888888888C',
    'C888888888888A888rr888A888888888888C',
    'C88BBBBBBBB88lll8rr8lll88BBBBBBBB88C',
    'C88BBBBBBBB88lll8rr8lll88BBBBBBBB88C',
    'C88BBBBBBBB8illl8rr8llli8BBBBBBBB88C',
    'C88BBBBBBBB888888rr888888BBBBBBBB88C',
    'C8rBBBBBBBBrrrrrrrrrrrrrrBBBBBBBBr8C',
    'C8rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr8C',
    'C8888888888888888rr8888888888888888C',
    'C88BBBBBB88888888rr88888888BBBBBB88C',
    'C88BBBBBB88888888rr88888888BBBBBB88C',
    'C88BBBBBB88888z88rr88q88888BBBBBB88C',
    'C88BBBBBB88888888rr88888888BBBBBB88C',
    'C8888888888888888rr8888888888888888C',
    'CCCCCCCCCCCCCCCCCrrCCCCCCCCCCCCCCCCC'
  ],
  buildings: [
    { id: 'hall', type: 'guild', name: '祭りの集会所', x: 13, y: 1, w: 10, h: 6, doorX: 4, interior: 'ignas_hall', entry: { x: 5, y: 7 } },
    { id: 'forge', type: 'weapon', name: '竜の鍛冶場', x: 3, y: 3, w: 9, h: 5, doorX: 4, interior: 'ignas_forge', entry: { x: 5, y: 7 } },
    { id: 'armor', type: 'armor', name: '竜鱗の防具店', x: 25, y: 3, w: 8, h: 5, doorX: 3, interior: 'ignas_armor', entry: { x: 5, y: 7 } },
    { id: 'item', type: 'item', name: '火山の道具屋', x: 3, y: 13, w: 8, h: 5, doorX: 3, interior: 'ignas_item', entry: { x: 5, y: 7 } },
    { id: 'inn', type: 'inn', name: '熾火の宿', x: 25, y: 13, w: 8, h: 5, doorX: 3, interior: 'ignas_inn', entry: { x: 5, y: 7 } },
    { id: 'house1', type: 'house', name: '鍛冶職人の家', x: 3, y: 20, w: 6, h: 4, doorX: 2, interior: 'ignas_house_1', entry: { x: 5, y: 7 } },
    { id: 'house2', type: 'elder', name: '長老の家', x: 27, y: 20, w: 6, h: 4, doorX: 2, interior: 'ignas_house_2', entry: { x: 5, y: 7 } }
  ],
  warps: [17, 18].map(function (x) { return { x: x, y: 25, to: 'world_dragon', tx: 30, ty: 63, name: '島へ' }; }),
  chests: [{ id: 'ig1', x: 34, y: 1, item: 'hi_ether', qty: 2 }],
  events: [{ x: 16, y: 14, type: 'inspect', solid: false, text: ['町の真ん中を流れる溶岩の水路。鍛冶場の炉へ熱を運んでいる。', '縁の石に「急ぐな。冷める前に打つな」と彫ってある。'] }],
  npcs: [
    { id: 'ig_gate', x: 19, y: 23, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) {
      if (!c.flag('dragon_arrived')) c.setFlag('dragon_arrived', true);
      await c.say('イグナスの門番', ['鍛冶街イグナスへようこそ。竜炎火山群島で一番の鍛冶の町だ。', '鍛冶長イグナは、竜の鱗で武器を鍛え直してくれる。鱗は東の島の竜脈洞窟で見つかる。……剥ぐんじゃないぞ、落ちたのを拾うんだ。']);
      await c.remark('ganes', ['鍛冶の町か。……炉の音が、工場とは違う。急かされてない音だ。'], 'ganes_remark_ignas_gate');
    } },
    { id: 'ig_kid', x: 10, y: 11, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('イグナスの子ども', c.flag('festival_lit') ? ['祭りの火、見た？ 山のてっぺんまで光ってた！', '炎がいちばん低くなって、上がりはじめたときに点けるんだって。かっこいい！'] : ['お祭りの火が、今年は弱いんだって。', '火口の祭壇に火を点す人が、まだ決まってないの。']); } },
    { id: 'ig_smith', x: 23, y: 11, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('鍛冶職人', ['いい武器ってのは、強い武器じゃない。持ち主が、自分の力で扱いきれる武器だ。', '重すぎる剣は、振るたびに自分の体勢を崩す。……資金も同じだって、旅の商人が言ってたな。']); } },
    { id: 'ig_woman', x: 30, y: 19, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('イグナスの女', c.flag('festival_lit') ? ['今年の祭りは、ここ十年でいちばんの火だった。', '長老さまも泣いてたわ。'] : ['竜脈洞窟の奥で、番竜が暴れてるらしいの。', '昔、人が竜の鱗を剥いで売ってた頃から、竜は人を信じていないのよ。']); } }
  ] });
  K.shopInterior('ignas_armor', '竜鱗の防具店', 'ignas_town', 28, 8, 'merchant', 'armor', ['dragon_mail', 'ember_robe', 'dragon_helm', 'knight_armor', 'aegis_shield', 'arcane_hat'], ['竜の鱗を重ねた鎧だ。熱にも刃にも強い。']);
  K.shopInterior('ignas_item', '火山の道具屋', 'ignas_town', 6, 18, 'merchant', 'item', ['hi_potion', 'hi_ether', 'elixir', 'phoenix_feather', 'antidote', 'calm_water', 'wake_bell', 'tent', 'escape_wing'], ['火山に行くなら、薬は多めにな。']);
  K.innInterior('ignas_inn', '熾火の宿', 'ignas_town', 28, 18, 80);
  function smallHouse(id, name, exitX, exitY, npcs) {
    return add({ id: id, name: name, kind: 'interior', bgm: 'town', rows: ['############', '#E__KK___E_#', '#__________#', '#_t______q_#', '#__________#', '#_z________#', '#__________#', '#__________#', '#####D######'], warps: [{ x: 5, y: 8, to: 'ignas_town', tx: exitX, ty: exitY }], npcs: npcs });
  }
  smallHouse('ignas_house_1', '鍛冶職人の家', 5, 24, [{ id: 'ih_wife', x: 6, y: 3, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('鍛冶職人の妻', ['夫は一日に一本しか打たないの。昔、魔導王国から千本の注文が来たときも、断った。', '「千本打てば、千本とも半端になる」って。……おかげで貧乏だけど、この町の剣は折れないわ。']); } }]);
  smallHouse('ignas_house_2', '長老の家', 29, 24, [{ id: 'ih_elder', x: 6, y: 3, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) {
    if (c.questDone('ignas_dragon')) { await c.say('イグナスの長老', ['古竜と話したのか……。わしの祖父の代から、誰も話せなかった。', '竜は、焦る者が嫌いじゃ。待てる者とだけ、話す。']); return; }
    await c.say('イグナスの長老', ['東の島の竜脈洞窟の奥に、古竜が眠っておる。その手前を番竜が守っておってな、近づく者を確かめもせず焼く。', '昔、この町の者が竜の鱗を剥いで売った。高く売れたからの。竜は怒り、山を焼いた。', '今は、落ちた鱗だけを拾う。……古竜と話せる者がいるなら、町の詫びを伝えてほしい。']);
    if (!c.questActive('ignas_dragon')) c.questStart('ignas_dragon');
  } }]);

  /* ---------- 竜の鍛冶場（鍛冶長イグナ） ---------- */
  var UPGRADE = ['dow_greatsword', 'ema_trident', 'rci_bow', 'macd_twin', 'hidden_staff', 'stoploss_dagger'];
  var FORGE_GOLD = 3000;
  async function forge(c) {
    var d = D(); var ITEMS = root.ITEMS;
    var owned = UPGRADE.filter(function (id) { return (d.inventory[id] || 0) > 0 || allActors().some(function (a) { return a.equip && a.equip.weapon === id; }); });
    if (!owned.length) { await c.say('鍛冶長イグナ', ['鍛え直せるのは、波形の名を持つ武器だけだ。ダウの大剣、EMA三重槍、RCI転輪弓、MACD双剣、ヒドゥンの魔杖、損切りの短剣。', '持ってきたら、竜の鱗1枚と' + FORGE_GOLD + 'Gで打ち直してやる。']); return; }
    var i = await c.choice('どれを鍛え直す？（竜の鱗1枚＋' + FORGE_GOLD + 'G。竜の鱗 ' + (d.inventory.dragon_scale || 0) + '枚）', owned.map(function (id) { return ITEMS[id].name + ' → ' + ITEMS[id + '_2'].name; }).concat(['やめる']));
    if (i < 0 || i >= owned.length) return;
    var id = owned[i];
    if (!c.has('dragon_scale')) { await c.say('鍛冶長イグナ', ['竜の鱗がないな。竜脈洞窟で、落ちている鱗を拾ってこい。竜の幼生が落とすこともある。']); return; }
    if (d.gold < FORGE_GOLD) { await c.say('鍛冶長イグナ', ['炉の薪代が足りないね。' + FORGE_GOLD + 'Gだ。']); return; }
    var ok = await c.choice(ITEMS[id].name + 'を' + ITEMS[id + '_2'].name + 'に鍛え直しますか？', ['頼む', 'やめる']); if (ok !== 0) return;
    d.gold -= FORGE_GOLD; c.take('dragon_scale', 1);
    if ((d.inventory[id] || 0) > 0) { c.take(id, 1); c.give(id + '_2', 1); }
    else { var a = allActors().filter(function (x) { return x.equip && x.equip.weapon === id; })[0]; a.equip.weapon = id + '_2'; }
    await c.msg(['イグナは鱗を炉にくべ、一度だけ、深く息を吐いた。', '……長い時間をかけて、一本だけ打った。', ITEMS[id + '_2'].name + 'ができあがった！（' + ITEMS[id + '_2'].desc + '）']);
    await c.say('鍛冶長イグナ', ['焦って打てば割れる。待って打てば、粘る。……あんたの使い方も、そうだといいね。']);
    if (!c.questDone('ignas_forge')) await c.questComplete('ignas_forge');
  }
  add({ id: 'ignas_forge', name: '竜の鍛冶場', kind: 'interior', bgm: 'town', rows: ['############', '#KK_qqii_KK#', '#__________#', '#_TTTTTTTT_#', '#__________#', '#_z______q_#', '#__t____t__#', '#__________#', '#####D######'],
  warps: [{ x: 5, y: 8, to: 'ignas_town', tx: 7, ty: 8 }],
  npcs: [
    { id: 'if_igna', x: 5, y: 2, sprite: 'villager_f', dir: 'down', wander: 0, talk: async function (c) {
      if (!c.questActive('ignas_forge') && !c.questDone('ignas_forge')) {
        await c.say('鍛冶長イグナ', ['鍛冶長のイグナだ。この炉は、竜脈の熱で燃えている。', '竜の鱗を混ぜると、鉄が粘る。折れにくくなる。……波形の名を持つ武器なら、竜の鱗1枚で、もう一段鍛えられる。']);
        c.questStart('ignas_forge');
      }
      var ch = await c.choice('鍛冶長イグナ', ['トレード武器を鍛え直す', '武器を買う', 'やめる']);
      if (ch === 0) await forge(c);
      else if (ch === 1) await c.shop('weapon', ['dragon_axe', 'flame_claw', 'astral_spear', 'star_bow', 'balance_mace', 'arcane_staff']);
      await c.remark('ganes', ['……一本ずつ、か。俺も、そういう打ち方を覚えたい。'], 'ganes_remark_forge');
    } }
  ] });

  /* ---------- 祭りの集会所（火口の祭り） ---------- */
  add({ id: 'ignas_hall', name: '祭りの集会所', kind: 'interior', bgm: 'town', rows: ['############', '#I___XX___I#', '#__________#', '#_tt____tt_#', '#__________#', '#_q______z_#', '#__________#', '#__________#', '#####D######'],
  warps: [{ x: 5, y: 8, to: 'ignas_town', tx: 17, ty: 7 }],
  npcs: [
    { id: 'ih_volka', x: 5, y: 2, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) {
      var d = D();
      if (c.questDone('ignas_festival')) { await c.say('祭りの世話役ボルカ', ['今年の火は、ここ十年でいちばんだった。ありがとう。', '来年の火入れの人には、あんたの点け方を教えておくよ。底を打って、上がりはじめたところ。']); return; }
      if (d.flags.festival_started) { await c.say('祭りの世話役ボルカ', ['火種を持って、火口の祭壇へ。山の中腹だ。', '炎の揺らぎが−70より下まで沈んで、そこから上がりはじめた瞬間に点すんだ。', '沈んでいる途中に点けると、火種ごと消える。上がりきってから点けても、もう遅い。']); return; }
      await c.say('祭りの世話役ボルカ', ['イグナスの火入れの祭りは、百年続いてる。火口の祭壇の聖火を、新しい火種で点し直すんだ。', 'ところが今年は火が弱くて、炎の精があふれてる。火入れの役も、怖がって誰もやりたがらない。', '……旅の人。火入れを、やってくれないか。']);
      var ch = await c.choice('火入れの役を引き受けますか？', ['引き受ける', 'あとにする']); if (ch !== 0) return;
      c.questStart('ignas_festival'); d.flags.festival_started = true; c.give('festival_ember', 1);
      await c.msg(['祭りの火種を受け取った。']);
      await c.say('祭りの世話役ボルカ', ['祭壇の炎は、波みたいに揺れている。低く沈んで、また高く上がる。', '−70より下まで沈んで、そこから上がりはじめた瞬間——そこで点す。焦っても、遅れても、火はつかない。']);
    } }
  ] });

  /* =========================================================
     火口の祭壇（炎の揺らぎ：底からの反転で点火）
     ========================================================= */
  var FLAME = [-30, -55, -72, -85, -78, -60, -35, 10];
  function flameSvg(n) {
    var W = 220, H = 110; function X(i) { return 12 + i * (W - 24) / (FLAME.length - 1); } function Y(v) { return 8 + (100 - v) / 200 * (H - 16); }
    var pts = FLAME.slice(0, n + 1).map(function (v, i) { return Math.round(X(i)) + ',' + Math.round(Y(v)); }).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" style="background:#1a0e0a;border:1px solid #c9a24a;border-radius:4px">' +
      '<line x1="8" y1="' + Y(70) + '" x2="' + (W - 8) + '" y2="' + Y(70) + '" stroke="#ff7a6a" stroke-dasharray="4 3"/><line x1="8" y1="' + Y(-70) + '" x2="' + (W - 8) + '" y2="' + Y(-70) + '" stroke="#5ab0ff" stroke-dasharray="4 3"/>' +
      '<text x="' + (W - 10) + '" y="' + (Y(70) - 3) + '" fill="#ff7a6a" font-size="9" text-anchor="end">+70</text><text x="' + (W - 10) + '" y="' + (Y(-70) + 11) + '" fill="#5ab0ff" font-size="9" text-anchor="end">−70</text>' +
      '<polyline points="' + pts + '" fill="none" stroke="#ffb03a" stroke-width="3" stroke-linejoin="round"/><circle cx="' + Math.round(X(n)) + '" cy="' + Math.round(Y(FLAME[n])) + '" r="4" fill="#ffd24a"/></svg>';
  }
  async function flameRitual(c) {
    for (var i = 0; i < FLAME.length; i++) {
      var prev = i ? FLAME[i - 1] : null, v = FLAME[i];
      await root.Win.panel('<div class="rw-title">炎の揺らぎ</div><div style="text-align:center">' + flameSvg(i) + '</div><p>いまの揺らぎ：<b>' + (v > 0 ? '+' : '') + v + '</b>' + (prev === null ? '' : (v > prev ? '（上がった）' : '（下がった）')) + '</p><p class="muted small">−100〜+100で表した炎の揺らぎ（学習用の演出）。RCIの±70のように、底と天井の目安の線を引いてある。</p>');
      var ch = await c.choice('聖火を点しますか？', ['点火する', '待つ']);
      if (ch !== 0) continue;
      if (prev !== null && prev <= -70 && v > prev && v <= -50) return { ok: true, at: v };
      if (prev === null || v <= prev) return { ok: false, why: ['炎はまだ沈んでいく途中だった。火種の火が、吸い込まれるように消えかけた。', '……底を打ったのを確かめてからだ。'] };
      return { ok: false, why: ['炎はもう半ばまで上がっていた。火種を投げ込んでも、勢いに弾かれた。', '……上がりきってから追いかけても、遅い。'] };
    }
    return { ok: false, why: ['炎は高く燃え上がり、点す瞬間を逃してしまった。'] };
  }
  add({ id: 'crater_altar', name: '火口の祭壇', kind: 'dungeon', bgm: 'dungeon', fallback: 'ash', rows: [
    'GGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGlilGGGGGGGGG',
    'GGGGGG8888888GGGGGGG',
    'GGGGGG8GGGGGGGGGGGGG',
    'GGGGGG888888888GGGGG',
    'GGGGGGGGGGGllG8GGGGG',
    'GGGGGGGGGGGGGG8GGGGG',
    'GGGG88888888888888GG',
    'GGGG8GGGGGGGGGGG88GG',
    'GGGG8GGllGGGGGGG88GG',
    'GGGG8GGGGGGGGGGGGGGG',
    'GGGG888888GGGGGGGGGG',
    'GGGGGGGGG8GGGGGGGGGG',
    'GGGGGGGGG<GGGGGGGGGG'
  ],
  warps: [{ x: 9, y: 13, to: 'world_dragon', tx: 50, ty: 47, name: '山を下りる' }],
  chests: [{ id: 'ca1', x: 17, y: 9, item: 'hi_ether', qty: 2 }, { id: 'ca2', x: 12, y: 2, item: 'phoenix_feather', qty: 1 }],
  events: [{ x: 9, y: 1, type: 'script', solid: true, run: async function (c) { var d = D();
    if (d.flags.festival_lit) { await c.msg(['聖火が力強く燃えている。麓のイグナスから、太鼓の音が聞こえる。']); return; }
    if (!d.flags.festival_started || !c.has('festival_ember')) { await c.msg(['祭壇の聖火は、今にも消えそうに揺れている。', '……火入れの役は、イグナスの祭りの集会所で決めるらしい。']); return; }
    await c.msg(['祭壇の聖火が、波のように揺れている。低く沈んでは、また高く上がる。', '火種を構えた。……揺らぎを見よう。']);
    var r = await flameRitual(c);
    if (!r.ok) { await c.msg(r.why.concat(['火種はまだ残っている。もう一度、揺らぎが沈むのを待とう。'])); return; }
    d.flags.festival_lit = true; c.take('festival_ember', 1);
    await c.msg(['揺らぎが ' + r.at + ' まで戻った瞬間、火種を投げ込んだ。', '——聖火が、天を突くように燃え上がった！', '麓のイグナスから、歓声と太鼓の音が上がる。祭りが始まった。']);
    await c.questComplete('ignas_festival');
    await c.remark('lucia', ['底で拾うんじゃない。底を打ったのを確かめてから。……RCIの−70と、同じ。'], 'lucia_remark_festival');
    await c.remark('lina', ['焦らなかったね。……見てて、ちょっと手に汗かいた。'], 'lina_remark_festival');
  } }],
  encounters: { rate: 0.045, zones: [{ name: '火口の祭壇', test: function () { return true; }, groups: [['flame_spirit'], ['flame_spirit', 'magma_slime'], ['cinder_bird', 'flame_spirit'], ['magma_slime', 'magma_slime']], level: 30 }] } });

  /* =========================================================
     竜脈洞窟（2階層）：番竜 → 古竜の三つの問い → 波形の紋章の扉（隠しダンジョン5）
     ========================================================= */
  var VEIN_ENC = { rate: 0.04, zones: [{ name: '竜脈洞窟', test: function () { return true; }, groups: [['fire_drake'], ['vein_wyrmling'], ['obsidian_golem'], ['magma_slime', 'fire_drake'], ['vein_wyrmling', 'cinder_bird']], level: 31 }] };
  add({ id: 'dragon_vein_1', name: '竜脈洞窟', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGllGGGGGGGGGGGGGGG>G',
    'GGGGGGGGGGGGGGGGGGGGGGkGGGGGgG',
    'GGGgggggggggggggGGGGGGGGGGGGgG',
    'GGGgGGGGGGgGGGGgGGGGGGGGgggggG',
    'GGGgGGkGGGgGGGGgGGGGGGGGgGGGGG',
    'GGGgGGGGGGgGGGGggggggGGGgGGGGG',
    'GGGgGGGGGGGGGGGgGGgggGGGgGGGGG',
    'GGGgGGGGGGGGGGGgGGGGGGGGgGllGG',
    'GGGggggggGGGGGGgGGGGGGGGgGlGGG',
    'GGGGGGGGgGGGGGGgGGGGGGGGgGGGGG',
    'GGGGGGGGgGGGGGGggggggggggGGGGG',
    'GGGGGggGgGGGGGGGGGGGgGGGGGGGGG',
    'GGGGGggGgGGGGGGGGllGgGGGGGGGGG',
    'gggggggggGGGGGGGGGGGgGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 0, y: 14, to: 'world_dragon', tx: 118, ty: 71, name: '洞窟の外へ' }, { x: 28, y: 1, to: 'dragon_vein_2', tx: 1, ty: 14 }],
  chests: [{ id: 'dv1', x: 10, y: 6, item: 'dragon_scale', qty: 1 }, { id: 'dv2', x: 20, y: 14, item: 'hi_potion', qty: 3 }, { id: 'dv3', x: 5, y: 12, gold: 2500 }, { id: 'dv4', x: 20, y: 7, item: 'dragon_scale', qty: 1 }],
  events: [{ x: 3, y: 4, type: 'inspect', solid: false, text: ['岩肌に、竜の鱗が一枚、刺さっている。剥がされた跡ではない。自然に落ちたものだ。', '……そのまま、そっとしておいた。'] }],
  encounters: VEIN_ENC });
  var QUESTIONS = [
    ['炎の流れが変わるとき、最初に起こるのは何だ？', ['炎がいちばん高く燃え上がる', '前の高さを越えられず、前の谷を割り込む', '誰かが「流れが変わった」と叫ぶ'], 1, '高く燃え上がるのは、流れが続いている印だ。叫び声は、噂にすぎぬ。前の高さを越えられず、前の谷を割る——それが、流れが変わる最初の兆しだ。'],
    ['一度の戦いに、どれだけを賭ける？', ['勝てると思えば、持てるすべて', '負けても、次の戦いを続けられる分だけ', '前の負けを取り返せる分だけ'], 1, 'すべてを賭けた者は、一度の負けで終わる。取り返そうとする者は、負けを大きくする。……負けても続けられる分だけ。それが、長く生きる者の賭け方だ。'],
    ['勝てそうに見える。だが、根拠が揃わない。どうする？', ['見送って、揃うのを待つ', '勢いがあるうちに飛び込む', '半分だけ賭けてみる'], 0, '根拠の揃わぬ戦いに、半分を賭けるのも、勢いに飛び込むのも同じことだ。……待て。揃うまで待てる者だけが、揃ったときに戦える。']
  ];
  add({ id: 'dragon_vein_2', name: '竜脈洞窟 古竜の間', kind: 'dungeon', bgm: 'boss_area', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGXXXGGGGG',
    'GGGGGGGGGGGGggggXXXgggGG',
    'GGGGGGGGGGGGggggggggggGG',
    'GGGGGGGGGGGGgggggggggg>G',
    'GGGGGGGGGGGGggggggggggGG',
    'GGGGGGGGGGGGllggggggglGG',
    'GGGGGGGGGGGGGGgGGGGGGGGG',
    'GGGGGGgggggggggGGGGGGGGG',
    'GGGGGGgGGGGGGGGGGGGGGGGG',
    'GGGkGGgGGllGGGGGGGGGGGGG',
    'GGGGGGgGGlGGGGGGGGGGGGGG',
    'GGGGGGgGGGGGGGGGGGGGGGGG',
    'GGGGGGgGGGGGGGGGGGGGGGGG',
    'gggggggGGGGGGGGGGGGGGGGG',
    'GGggGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 0, y: 14, to: 'dragon_vein_1', tx: 28, ty: 2 }, { x: 22, y: 4, to: 'dragon_vein_deep_1', tx: 2, ty: 12 }],
  chests: [{ id: 'dv5', x: 2, y: 15, item: 'elixir', qty: 1 }, { id: 'dv6', x: 12, y: 2, item: 'dragon_scale', qty: 1 }],
  events: [
    { x: 10, y: 8, type: 'boss', solid: true, doneFlag: 'magma_wyrm_defeated', enemy: 'boss_magma_wyrm', intro: ['溶岩の川から、赤黒い竜が首をもたげた。', '溶岩の番竜「……ニンゲン。鱗ヲ、剥ギニ来タカ」'], after: ['番竜は溶岩の中へ沈んでいった。', '洞窟の奥から、低い声が響く。「……通せ。その者たちと、話がしたい」'] },
    { x: 21, y: 4, type: 'rank_door', solid: true, doneFlag: 'dragon_vein_open', rank: 4, text: ['古竜の間の東の壁に、波形の紋章が刻まれた扉がある。奥から、熱い風が吹いてくる。'] },
    { x: 17, y: 2, type: 'script', solid: true, run: async function (c) { var d = D();
      if (!d.flags.magma_wyrm_defeated) { await c.msg(['巨大な結晶の中に、竜の影が眠っている。', '……番竜が、ここへ近づく者を見張っている。']); return; }
      if (!c.questActive('ignas_dragon') && !c.questDone('ignas_dragon')) c.questStart('ignas_dragon');
      if (d.flags.dragon_answered) { await c.say('竜脈の古竜', ['また来たか。……奥の扉は、規律を身につけた者にだけ開く。その先に、原初の炎が眠っている。', '勝てる戦いだけを選べ。それができる者にだけ、あれは剣を渡す。']); return; }
      await c.msg(['結晶の中の竜が、ゆっくりと目を開いた。']);
      await c.say('竜脈の古竜', ['わしは竜脈の古竜。この島の炎の流れを、千年見てきた。', '人はかつて、わしの鱗を剥いで売った。高く売れる、今売れる、と。……流れを見ず、目の前の値だけを見て。', 'おまえたちが同じでないなら、三つの問いに答えよ。']);
      for (var i = 0; i < QUESTIONS.length; i++) {
        var q = QUESTIONS[i];
        var a = await c.choice('古竜の問い（' + (i + 1) + '/3）：' + q[0], q[1]);
        if (a !== q[2]) { await c.say('竜脈の古竜', [q[3], '……出直してこい。問いは、何度でも同じだ。']); return; }
        await c.say('竜脈の古竜', [['……そうだ。', 'よかろう。', '……待てる者か。'][i]]);
      }
      d.flags.dragon_answered = true;
      await c.say('竜脈の古竜', ['人の子よ。イグナスの長老の詫びは、受け取った。', 'この鱗を持っていけ。剥いだものではない。わしが落としたものだ。', '奥の扉は、規律を身につけた者にだけ開く。その先に、原初の炎が眠っている。……勝てる戦いだけを選べ。']);
      c.give('dragon_scale', 3); await c.msg(['竜の鱗を3枚受け取った！']);
      await c.questComplete('ignas_dragon');
      await c.remark('gald', ['剥がずに、待つ。……鉱山でも、そうできたらよかった。'], 'gald_remark_dragon');
      await c.remark('sophia', ['千年見てきても、未来は決めつけない。……竜も、待つんだね。'], 'sophia_remark_dragon');
    } }
  ],
  encounters: VEIN_ENC });

  /* ---------- 竜脈の最深部（隠しダンジョン5：トレーダーランクB） ---------- */
  add({ id: 'dragon_vein_deep_1', name: '竜脈の最深部', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGggggggggggggGGG>gggGG',
    'GGGgGGGGGGGGGGgGGGGGGgGG',
    'GGGgGGGGGGGlGGgGGGGGGgGG',
    'GGGgGGGGGGGllGgGGGGGGgGG',
    'GGGggggggGGGGGgGGllGGgGG',
    'GGGGGGGGgGGGGGgGGGGGGgGG',
    'GGGGGllGgGGGGGgGGGGGGgGG',
    'GGGGGlGGgGggggggggggggGG',
    'GGGGGGGGgGgggGGGGGGGGGGG',
    'GGGGGGGGgGgggGGGGllGGGGG',
    'G<gggggggGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 1, y: 12, to: 'dragon_vein_2', tx: 20, ty: 4 }, { x: 18, y: 2, to: 'dragon_vein_deep_2', tx: 8, ty: 11 }],
  chests: [{ id: 'dd1', x: 11, y: 11, item: 'elixir', qty: 2 }, { id: 'dd2', x: 10, y: 11, item: 'dragon_scale', qty: 1 }],
  encounters: { rate: 0.045, zones: [{ name: '竜脈の最深部', test: function () { return true; }, groups: [['vein_wyrmling', 'vein_wyrmling'], ['obsidian_golem', 'fire_drake'], ['fire_drake', 'fire_drake', 'cinder_bird'], ['vein_wyrmling', 'obsidian_golem']], level: 36 }] } });
  add({ id: 'dragon_vein_deep_2', name: '竜脈の最深部 原初の炎', kind: 'dungeon', bgm: 'boss_area', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGG',
    'GggggggXXXggggggG',
    'GglggggggggggglgG',
    'GgggggggggggggggG',
    'GgggggggggggggggG',
    'GgggggggggggggggG',
    'GgggggggggggggggG',
    'GgggggggggggggggG',
    'GgggggggggggggggG',
    'GgggggggggggggggG',
    'GglggggggggggglgG',
    'GgggggggggggggggG',
    'GGGGGGGG<GGGGGGGG'
  ],
  warps: [{ x: 8, y: 12, to: 'dragon_vein_deep_1', tx: 19, ty: 2 }],
  events: [
    { x: 8, y: 5, type: 'boss', solid: true, optional: true, doneFlag: 'primal_flame_defeated', enemy: 'boss_primal_flame', intro: ['竜脈の流れが一点に集まり、炎の竜の形をとった。', '原初の炎竜「……勝てる戦いだけを選べ、と言われたはずだ。おまえは、選んだのか」'], after: ['原初の炎竜は、竜脈の流れへ還っていった。', '流れの中から、一振りの剣が浮かび上がった。'], questComplete: 'hidden_dragon_vein' },
    { x: 8, y: 1, type: 'inspect', solid: true, text: ['竜脈の結晶。島じゅうの炎の流れが、ここで一つにまとまっている。', '流れは、止まらない。速くも遅くもならない。ただ、流れている。'] }
  ],
  encounters: null });
})(typeof window !== 'undefined' ? window : globalThis);
