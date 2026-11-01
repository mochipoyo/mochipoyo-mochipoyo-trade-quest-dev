/* =========================================================
   Data / astra65（v6.5 Phase E）：星界航行船アストラ号の解放イベント・クエスト・観測記録の完了イベント
   ・解放：本編クリア（game_cleared）のあと。星見塔の最上階の「記録者」（クリスタルを作った者たちの最後の一人の影）から
     既存の会話（天空神殿への道を開く）は、クリア前はそのまま。クリア後だけ新しい会話を足す
   ・クエスト「星界航行船アストラ号」（サブクエスト）：記録者に会う → 飛び立つ → 12の地域の上空を飛んで観測記録をそろえる
     クリア後にマップへ入ると受注（1回だけ）。報酬は1回だけ（Events.questComplete は2回目を渡さない）
   ・フラグはすべて astra_ で始まる。セーブの置き場所は State.data.astra（js/rpg/astra.js）
   ========================================================= */
(function (root) {
  'use strict';
  var Q = root.QUESTS, ITEMS = root.ITEMS;
  function D() { return root.State.data; }
  if (ITEMS && !ITEMS.astra_log) ITEMS.astra_log = { id: 'astra_log', name: '星界の観測記録', cat: 'key', price: 0, desc: 'アストラ号が12の地域の上空で記録した、世界のひとつながりの姿。' };
  Q.astra_voyage = { title: '星界航行船アストラ号', side: true, theme: '世界をひとつに見る', desc: '星見塔の記録者が、クリアのあとで伝えたいことがあるという。古代の船で、12の地域の上空を飛び、世界の観測記録をそろえる。',
    reward: { exp: 3000, gold: 5000, item: 'astra_log' }, steps: [['astra_owned', '星見塔の最上階で、記録者の話を聞く'], ['astra_first_flight', 'アストラ号で飛び立つ'], ['astra_log_done', '12の地域の上空を飛び、観測記録をそろえる']] };

  // 記録者の会話（クリア後だけ新しい話）
  (function () {
    var def = root.MAP_DEFS.star_tower_2; if (!def) return; var n = (def.npcs || []).filter(function (x) { return x.id === 'st_recorder'; })[0]; if (!n) return; var orig = n.talk;
    n.talk = async function (c) {
      var d = D(); if (!d.flags.game_cleared) { await orig(c); return; }
      if (!d.flags.astra_owned) {
        await c.say('記録者', ['……結末を選んだのね。波のない世界ではなく、波のある世界を。', '最後の記録を渡すわ。クリスタルを作った者たちは、地上を歩いて測るだけでは足りないと知っていた。', 'だから、世界の全部を一度に見る船を造った。星界航行船アストラ。この塔の上の空に、ずっと眠っている。']);
        await c.msg(['塔の天井が音もなく開き、星の光が差しこんだ。', '雲のあいだから、銀の船体がゆっくりと降りてくる。青いクリスタルの核が、手の中の「最後の選択の証」と同じ光で脈打っている。']);
        await c.say('記録者', ['アストラは、選んだ者の判断にだけ応える。未来を固定するためではなく、見るために飛ぶ船よ。', '地域と地域は、地上では海と空路で分かれている。でも上から見れば、ひとつの世界。', 'まだ足を踏み入れていない空域には、近づけない。自分の足で確かめた場所にだけ、降りられる。……それが、この船の約束。']);
        root.Astra.grant(); d.flags.astra_owned = true; if (root.Events && !d.quests.astra_voyage) root.Events.questStart('astra_voyage');
        await c.msg(['星界航行船アストラ号を手に入れた！', 'アストラ号は星見塔の前（天空群島）に降りている。船へ歩いて進むと飛び立てる。', '飛んでいるあいだ：方向キーで飛ぶ／決定キーで近くの町・村・城・ダンジョンのそばに降りる／Xキーでメニュー（着陸地点を選ぶ・高度・観測記録・セーブ）', '降りたあとは、メニューの「アストラ号」→「ここへ呼ぶ」で、今いる地域へ呼べる。']);
        if (c.remark) await c.remark('sophia', ['上から見る世界……。きっと、境界線なんてどこにもない。', '行こう。今度は、全部を見に。'], 'sophia_remark_astra');
        root.State.autosave(); return;
      }
      var s = root.Astra.state(); var n2 = root.Astra.logCount();
      if (d.flags.astra_log_done) { await c.say('記録者', ['記録はそろったのね。……世界はひとつ。分けたのは、人の地図のほうだった。', 'アストラは、これからもあなたの船よ。']); return; }
      await c.say('記録者', ['観測記録は ' + n2 + '/12。地域の上空を飛べば、アストラが勝手に記録する。', s && s.flying ? '' : 'アストラは ' + (((root.MAP_DEFS[s.map] || {}).name) || '') + ' に止めてあるわ。'].filter(Boolean));
    };
  })();

  // 観測記録がそろったとき（飛行中の画面から呼ばれる）
  root.AstraEvents = {
    logComplete: async function () {
      var d = D(); if (d.flags.astra_log_done) return; d.flags.astra_log_done = true;
      await root.Win.message(['12の地域の観測記録がそろった。', 'アストラ号の記録装置が、ひとつの映像を映した。……海も、空路も、国境もない、ひとつながりの世界。', '波は、どの大陸でも同じように寄せては返していた。違っていたのは、それを見る人の立ち位置だけだった。'], { name: 'アストラ号の記録装置' });
      if (root.Events) { if (!d.quests.astra_voyage) d.quests.astra_voyage = { state: 'active', at: Date.now() }; await root.Events.questComplete('astra_voyage'); }
    }
  };

  // クリアのあと、マップに入ったら受注（1回だけ。乗り物・会話の途中でも、受注のお知らせだけ）
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function () { var d = D(); if (d && d.flags && d.flags.game_cleared && !d.quests.astra_voyage && root.Events) root.Events.questStart('astra_voyage'); });

  // 次の目的地（サブクエスト）
  var O = root.OBJECTIVES = root.OBJECTIVES || [];
  function E(q, done, t, h) { O.push({ q: q, done: done, t: t, h: h, side: true }); }
  E('astra_voyage', 'astra_owned', 'npc:star_tower_2:st_recorder', ['天空群島の星見塔。', '星見塔の最上階の記録者。', '星見塔を登り、最上階の記録者に話しかけよう。']);
  E('astra_voyage', 'astra_first_flight', 'astra:ship', ['アストラ号のところ。', 'アストラ号は星見塔の前（または最後に降りた場所）。', 'アストラ号へ歩いて進むと飛び立てる。メニュー「アストラ号」→「ここへ呼ぶ」でも呼べる。']);
  E('astra_voyage', 'astra_log_done', 'astra:log', ['12の地域の上空。', 'まだ記録していない地域の上空。', 'アストラ号で、まだ観測記録のない地域の上を飛ぼう（メニュー「アストラ号」→「観測記録」で確かめられる）。']);
})(typeof window !== 'undefined' ? window : globalThis);
