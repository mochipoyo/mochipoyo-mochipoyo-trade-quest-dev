/* =========================================================
   UI / Services : 店・宿屋・教会・酒場・ギルド（転職・掲示板）・銀行・修行場
   ========================================================= */
(function (root) {
  'use strict';

  var Win = root.Win, State = root.State, ITEMS = root.ITEMS, JOBS = root.JOBS, Actors = root.Actors, World = root.World, QUESTS = root.QUESTS, COMPANIONS = root.COMPANIONS, LEARNING = root.LEARNING, LECTURES = root.LECTURES, Events = root.Events, TradeEval = root.TradeEval;
  var esc = Win.esc;

  var Services = {};

  function priceFor(it, buying) { var p = it.price; var merchant = State.partyActors().some(function (a) { return a.job === 'merchant'; }); if (buying && merchant) p = Math.round(p * 0.9); return buying ? p : Math.floor(p / 2); }
  function statLine(it) {
    var parts = [];
    if (it.atk) parts.push('攻撃+' + it.atk); if (it.def) parts.push('防御+' + it.def); if (it.agi) parts.push('素早さ' + (it.agi > 0 ? '+' : '') + it.agi); if (it.mag) parts.push('魔力+' + it.mag); if (it.mdef) parts.push('魔防+' + it.mdef); if (it.hp) parts.push('HP+' + it.hp); if (it.mp) parts.push('MP+' + it.mp);
    if (it.element) parts.push('属性:' + ({ fire: '炎', ice: '氷', thunder: '雷', wind: '風', light: '光', dark: '闇' })[it.element]);
    return parts.join(' ');
  }
  // 装備品の比較情報（パーティー各員の装備可否と性能差）
  function compareInfo(it) {
    if (it.cat !== 'weapon' && it.cat !== 'armor') return '<div class="muted">' + esc(it.desc || '') + '</div>';
    var slot = Actors.slotOf(it.id);
    var rows = State.partyActors().map(function (a) {
      if (!Actors.canEquip(a, it.id)) return '<div class="cmp no">' + esc(a.name) + '：装備不可</div>';
      var cur = a.equip[slot] ? ITEMS[a.equip[slot]] : null;
      var key = it.cat === 'weapon' ? 'atk' : 'def'; var diff = (it[key] || 0) - (cur ? (cur[key] || 0) : 0);
      return '<div class="cmp ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : '') + '">' + esc(a.name) + '：' + (cur ? esc(cur.name) : 'なし') + ' → ' + (diff > 0 ? '+' : '') + diff + (a.equip[slot] === it.id ? '（装備中）' : '') + '</div>';
    }).join('');
    return '<div class="muted">' + esc(it.desc || '') + '</div><div>' + esc(statLine(it)) + '</div>' + rows;
  }

  /* ---------- 店 ---------- */
  Services.shop = async function (kind, stock) {
    var d = State.data;
    while (true) {
      var a = await Win.choice('いらっしゃい。何をする？（所持金 ' + d.gold + 'G）', ['買う', '売る', 'やめる']);
      if (a === 2 || a === -1) { await Win.message(['またどうぞ。']); return; }
      if (a === 0) await buyLoop(stock); else await sellLoop();
    }
  };
  async function buyLoop(stock) {
    var d = State.data;
    while (true) {
      var items = stock.map(function (id) { var it = ITEMS[id]; return { label: it.name, right: priceFor(it, true) + 'G', disabled: d.gold < priceFor(it, true), sub: (d.inventory[id] ? '所持' + d.inventory[id] + ' ' : '') + statLine(it) }; });
      var i = await Win.list(items, { title: '買う（所持金 ' + d.gold + 'G）', info: function (k) { return compareInfo(ITEMS[stock[k]]); } });
      if (i < 0) return;
      var it = ITEMS[stock[i]]; var p = priceFor(it, true);
      var maxQty = Math.min(9, Math.floor(d.gold / p));
      var qtyOpts = []; for (var q = 1; q <= maxQty; q++) qtyOpts.push(q + 'つ（' + p * q + 'G）');
      var qi = await Win.choice(it.name + 'をいくつ買う？', qtyOpts.concat(['やめる']));
      if (qi < 0 || qi >= maxQty) continue;
      var qty = qi + 1; d.gold -= p * qty; State.addItem(it.id, qty);
      if (root.Audio) root.Audio.sfx('coin');
      await Win.message([it.name + 'を' + qty + 'つ買った！（残り ' + d.gold + 'G）']);
      // 装備品ならその場で装備するか聞く
      if ((it.cat === 'weapon' || it.cat === 'armor')) {
        var cands = State.partyActors().filter(function (x) { return Actors.canEquip(x, it.id); });
        if (cands.length) { var ci = await Win.choice('誰が装備する？', cands.map(function (x) { return x.name; }).concat(['あとで'])); if (ci >= 0 && ci < cands.length) { equipItem(cands[ci], it.id); await Win.message([cands[ci].name + 'は' + it.name + 'を装備した。']); } }
      }
      World.updateHud();
    }
  }
  function equipItem(a, itemId) {
    var slot = Actors.slotOf(itemId); var prev = a.equip[slot];
    if (prev) State.addItem(prev, 1);
    a.equip[slot] = itemId; State.addItem(itemId, -1);
  }
  Services.equipItem = equipItem;
  async function sellLoop() {
    var d = State.data;
    while (true) {
      var ids = Object.keys(d.inventory).filter(function (id) { return ITEMS[id] && ITEMS[id].price > 0; });
      if (!ids.length) { await Win.message(['売れるものを持っていない。']); return; }
      var items = ids.map(function (id) { var it = ITEMS[id]; return { label: it.name + ' ×' + d.inventory[id], right: priceFor(it, false) + 'G', sub: it.desc || statLine(it) }; });
      var i = await Win.list(items, { title: '売る（所持金 ' + d.gold + 'G）' });
      if (i < 0) return;
      var it = ITEMS[ids[i]]; var p = priceFor(it, false);
      var a = await Win.choice(it.name + 'を' + p + 'Gで売る？', ['1つ売る', '全部売る（' + p * d.inventory[it.id] + 'G）', 'やめる']);
      if (a === 0) { d.gold += p; State.addItem(it.id, -1); await Win.message([it.name + 'を売った。']); }
      else if (a === 1) { var n = d.inventory[it.id]; d.gold += p * n; State.addItem(it.id, -n); await Win.message([it.name + 'を' + n + 'つ売った。']); }
      World.updateHud();
    }
  }

  /* ---------- 宿屋 ---------- */
  Services.inn = async function (price) {
    var d = State.data; var party = State.partyActors(); var total = price * party.length;
    var a = await Win.choice('宿屋へようこそ。1人' + price + 'G、' + party.length + '人で' + total + 'Gだよ。泊まっていくかい？', ['泊まる', 'やめる']);
    if (a !== 0) { await Win.message(['またおいで。']); return; }
    if (d.gold < total) { await Win.message(['お金が足りないみたいだね……']); return; }
    d.gold -= total;
    var fade = document.getElementById('fade'); if (fade) fade.classList.add('on');
    if (root.Audio) root.Audio.playJingle('inn');
    await Win.sleep(900);
    party.forEach(function (x) { if (!x.dead) { Actors.fullHeal(x); } });
    d.timeOfDay = 0.3; d.lastInn = { map: World.map.def.warps[0].to, x: World.map.def.warps[0].tx, y: World.map.def.warps[0].ty };
    if (fade) fade.classList.remove('on');
    World.updateHud();
    await Win.message(['おはよう！ ぐっすり眠れたかい？ HPとMPが回復した。', '（戦闘不能の仲間は教会で治してもらおう）']);
    State.autosave();
  };

  /* ---------- 教会 ---------- */
  Services.church = async function () {
    var d = State.data;
    while (true) {
      var dead = State.partyActors().filter(function (x) { return x.dead; });
      var sick = State.partyActors().filter(function (x) { return !x.dead && Object.keys(x.status).length; });
      var opts = ['生き返らせる（' + (dead.length ? dead.map(function (x) { return x.name; }).join('・') + '：' + dead.length * 50 * d.hero.level + 'G' : 'なし') + '）', '状態異常を治す（' + (sick.length ? sick.length * 20 + 'G' : 'なし') + '）', 'お話を聞く', 'やめる'];
      var a = await Win.choice('神のご加護を。どのようなご用件ですか？', opts);
      if (a === 0) { if (!dead.length) { await Win.message(['倒れている仲間はいません。']); continue; } var cost = dead.length * 50 * d.hero.level; if (d.gold < cost) { await Win.message(['お布施が足りません……']); continue; } d.gold -= cost; dead.forEach(function (x) { x.dead = false; x.hp = Math.max(1, Math.round(Actors.stats(x).maxHp * 0.5)); x.status = {}; }); if (root.Audio) root.Audio.sfx('heal'); await Win.message([dead.map(function (x) { return x.name; }).join('・') + 'が息を吹き返した！']); World.updateHud(); }
      else if (a === 1) { if (!sick.length) { await Win.message(['状態異常の仲間はいません。']); continue; } var c2 = sick.length * 20; if (d.gold < c2) { await Win.message(['お布施が足りません……']); continue; } d.gold -= c2; sick.forEach(function (x) { x.status = {}; }); await Win.message(['祈りによって状態異常が治った。']); World.updateHud(); }
      else if (a === 2) { await Win.message(['均衡のクリスタルは、人の欲望と恐怖の均衡を保っていました。', '砕けた今、欲望は「もっと稼ぎたい」という魔物に、恐怖は「負けを認められない」という魔物になって人を襲います。', '魔物に打ち勝つには、剣の力だけでなく、相場の波を正しく読み、無理をしない心が必要です。']); }
      else return;
    }
  };

  /* ---------- 酒場（パーティー編成） ---------- */
  Services.tavern = async function () {
    var d = State.data;
    while (true) {
      var ids = Object.keys(d.companions);
      if (!ids.length) { await Win.message(['酒場へようこそ。仲間ができたら、ここで編成を変えられるよ。']); return; }
      var items = ['hero'].concat(ids).map(function (id) { var a = State.actor(id); var inP = d.party.indexOf(id) >= 0; return { label: (inP ? '● ' : '○ ') + a.name, right: JOBS[a.job].name + ' Lv' + a.level, sub: inP ? '戦闘メンバー' : '待機中', disabled: id === 'hero' }; });
      var i = await Win.list(items, { title: 'パーティー編成（最大4人）', info: function (k) { var id = ['hero'].concat(ids)[k]; var c = COMPANIONS[id]; var pt = root.Assets ? root.Assets.portraitTagFor(State.actor(id), 'portrait info-portrait', 120) : ''; return pt + (c ? '<div class="muted">' + esc(c.bio) + '</div><div class="muted small">' + esc(c.background) + '</div>' : '<div class="muted">主人公は外せない</div>'); } });
      if (i < 0) return;
      var id = ['hero'].concat(ids)[i];
      if (d.party.indexOf(id) >= 0) { if (d.party.length <= 1) continue; d.party.splice(d.party.indexOf(id), 1); await Win.message([State.actor(id).name + 'は待機メンバーになった。']); }
      else { if (d.party.length >= 4) { await Win.message(['戦闘メンバーは4人まで。誰かを待機させよう。']); continue; } d.party.push(id); await Win.message([State.actor(id).name + 'が戦闘メンバーに加わった！']); }
      World.updateHud();
    }
  };

  /* ---------- 冒険者ギルド（転職・掲示板） ---------- */
  Services.guild = async function () {
    while (true) {
      var a = await Win.choice('冒険者ギルドへようこそ。', ['転職する', 'クエスト掲示板を見る', '転職について聞く', 'やめる']);
      if (a === 0) await Services.jobChange();
      else if (a === 1) await Services.questBoard();
      else if (a === 2) await Win.message(['転職すると、新しい職業のレベル1から始まる。ただし以前の職業のレベルは記録され、またその職に戻せば元のレベルで戦える。', '覚えた特技は転職後も使える（MPがあればだが）。HP・MPは他の職で上げた分の一部が引き継がれる。', '上級職には条件がある。賢者は魔法使いか僧侶でLv15、波形剣士はダウ理論を修めてLv12、相場の導師は資金管理を修めてLv12だ。']);
      else return;
    }
  };
  Services.jobChange = async function () {
    var d = State.data; var party = ['hero'].concat(Object.keys(d.companions)).map(State.actor);
    var pi = await Win.choice('誰が転職する？', party.map(function (a) { return a.name + '（' + JOBS[a.job].name + ' Lv' + a.level + '）'; }).concat(['やめる']));
    if (pi < 0 || pi >= party.length) return;
    var actor = party[pi];
    var jobs = root.JOB_LIST.filter(function (j) { return j !== actor.job; });
    var items = jobs.map(function (j) { var ok = Actors.jobUnlocked(actor, j, d.flags); return { label: JOBS[j].name, right: ok ? ('Lv' + (actor.jobLevels[j] || 1)) : '条件未達', disabled: !ok, sub: JOBS[j].role }; });
    var ji = await Win.list(items, { title: actor.name + 'の転職先', info: function (k) { var j = JOBS[jobs[k]]; var u = j.unlock; return (root.Assets ? root.Assets.portraitTag('hero_' + jobs[k], 'portrait info-portrait', 120) : '') + '<div>' + esc(j.desc) + '</div><div class="muted small">固有：' + esc(j.trait) + '</div><div class="muted small">武器：' + j.weapons.join('/') + '</div>' + (u ? '<div class="muted small">条件：' + (u.jobsAny ? u.jobsAny.map(function (x) { return JOBS[x].name; }).join('か') + 'でLv' + u.level : (u.flag ? '修行場で「' + (u.flag === 'learned_dow' ? 'ダウ理論' : '資金管理') + '」を修了しLv' + u.level : 'Lv' + u.level)) + '</div>' : ''); } });
    if (ji < 0) return;
    var job = jobs[ji]; var cost = 100 * actor.level;
    var c = await Win.choice(JOBS[job].name + 'に転職する？（費用' + cost + 'G。レベルは' + (actor.jobLevels[job] || 1) + 'から）', ['転職する', 'やめる']);
    if (c !== 0) return;
    if (d.gold < cost) { await Win.message(['お金が足りない。']); return; }
    d.gold -= cost; Actors.changeJob(actor, job);
    var lines = [actor.name + 'は' + JOBS[job].name + 'になった！'];
    if (actor._unequipped && actor._unequipped.length) { actor._unequipped.forEach(function (id) { State.addItem(id, 1); }); lines.push('装備できない' + actor._unequipped.map(function (id) { return ITEMS[id].name; }).join('・') + 'を外した。'); actor._unequipped = []; }
    if (root.Audio) root.Audio.playJingle('levelup');
    await Win.message(lines); World.updateHud();
  };
  Services.questBoard = async function () {
    var d = State.data;
    var ids = Object.keys(QUESTS);
    var items = ids.map(function (id) { var q = QUESTS[id]; var st = d.quests[id]; var tag = !st ? '未受注' : st.state === 'done' ? '達成' : '進行中'; var prog = q.counter && st && st.state === 'active' ? '（' + (d.counters[q.counter] || 0) + '/' + q.need + '）' : ''; return { label: (q.main ? '【メイン】' : '【サブ】') + q.title, right: tag + prog, sub: q.desc, cls: st && st.state === 'done' ? 'done' : '' }; });
    var i = await Win.list(items, { title: 'クエスト掲示板', info: function (k) { var q = QUESTS[ids[k]]; var r = q.reward || {}; return '<div class="muted small">報酬：' + [r.exp ? '経験値' + r.exp : '', r.gold ? r.gold + 'G' : '', r.item ? ITEMS[r.item].name : ''].filter(Boolean).join('・') + '</div>'; } });
    if (i < 0) return;
    var id = ids[i]; var q = QUESTS[id];
    if (!d.quests[id] && !q.main) { var a = await Win.choice('「' + q.title + '」を受注する？', ['受注する', 'やめる']); if (a === 0) { Events.questStart(id); await Win.message(['クエストを受注した。進行状況はメニューの「クエスト」で確認できる。']); } }
    else await Win.message([q.desc]);
  };

  /* ---------- 銀行 ---------- */
  Services.bank = async function () {
    var d = State.data;
    while (true) {
      var a = await Win.choice('銀行へようこそ。預金 ' + d.bank + 'G／所持金 ' + d.gold + 'G', ['預ける', '引き出す', 'やめる']);
      if (a === 0) { var opts = [100, 500, 1000, 5000].filter(function (v) { return v <= d.gold; }); if (!opts.length) { await Win.message(['預けられるお金がありません。']); continue; } var i = await Win.choice('いくら預ける？', opts.map(function (v) { return v + 'G'; }).concat(['全額（' + d.gold + 'G）', 'やめる'])); if (i < 0 || i > opts.length) continue; var v = i === opts.length ? d.gold : opts[i]; d.gold -= v; d.bank += v; await Win.message([v + 'Gを預けた。預金は全滅しても減らない。']); }
      else if (a === 1) { var o2 = [100, 500, 1000, 5000].filter(function (v) { return v <= d.bank; }); if (!o2.length) { await Win.message(['預金がありません。']); continue; } var j = await Win.choice('いくら引き出す？', o2.map(function (v) { return v + 'G'; }).concat(['全額（' + d.bank + 'G）', 'やめる'])); if (j < 0 || j > o2.length) continue; var v2 = j === o2.length ? d.bank : o2[j]; d.bank -= v2; d.gold += v2; await Win.message([v2 + 'Gを引き出した。']); }
      else return;
      World.updateHud();
    }
  };

  /* ---------- 修行場（講義・チャートの試練・学習クエスト） ---------- */
  /* ---------- はじめてのトレード（チュートリアル：師匠ハケイ） ---------- */
  var TUTORIAL_LESSONS = [
    ['ローソク足の基本', ['ローソク足は、ある時間（5分・15分・4時間など）の値動きを1本で表す。', '太い部分（実体）は「始値→終値」。終値が上なら陽線（上昇）、下なら陰線（下降）。細い線（ヒゲ）はその時間の最高値・最安値だ。', '大事なのは1本ではなく「並び」。高値と安値がどう動いているかを見る。']],
    ['買いと売り・損切り', ['FXでは「買い（上がると思う）」と「売り（下がると思う）」の両方ができる。', 'そして必ず「ここまで来たら負けを認める」価格＝損切りを先に決める。損切りなしは一番危険だ。', '利確（目標）は損切り幅の1.5〜3倍が参考値。これがリスクリワードだ。']],
    ['上昇・下降・レンジ', ['高値も安値も切り上がっていれば上昇、切り下がっていれば下降。揃わないならレンジ（方向感なし）。', 'EMA20・30・40の並びも手がかりだ。上から20＞30＞40なら上昇の並び、逆なら下降の並び。', '上昇なら買い、下降なら売り、レンジや根拠が揃わないときは「見送り」。見送りも立派な判断だ。', 'では実際にチャートを見て、分析→判断→理由の順に選んでみよう。4時間足も確認するのを忘れずに。']]
  ];
  Services.tutorial = async function (opts) {
    opts = opts || {}; var d = State.data;
    var replay = !!d.trade.tutorialDone;
    var mode = await Win.choice(replay ? 'チュートリアルを復習する？' : '「はじめてのトレード」を始める？', ['説明を聞いてから挑戦', '説明を短縮して挑戦', 'やめる']);
    if (mode < 0 || mode === 2) return false;
    if (mode === 0) { for (var i = 0; i < TUTORIAL_LESSONS.length; i++) { await Win.panel('<div class="rw-title">' + (i + 1) + '. ' + Win.esc(TUTORIAL_LESSONS[i][0]) + '</div><div class="lesson">' + TUTORIAL_LESSONS[i][1].map(Win.esc).join('\n') + '</div>' + (i === 0 ? candleFigure() : ''), { closeLabel: '次へ' }); } }
    else await Win.message(['要点だけ：高値・安値の切り上げ＝上昇、切り下げ＝下降、揃わなければレンジ。上位足の方向に合わせ、損切りを先に決める。', 'では、分析→判断→理由の順に選んでみよう。'], { name: '師匠ハケイ' });
    var res = await root.TradeUI.trial(['clear_up'], { title: 'はじめてのトレード', tutorial: true, scenarioId: 'clear_up' });
    if (!res) return false;
    if (!d.trade.tutorialDone) {
      d.trade.tutorialDone = true; d.flags.tutorial_done = true;
      d.gold += 100; State.addItem('herb', 2); State.partyActors().forEach(function (a) { root.Actors.gainExp(a, 15); });
      await Win.message(['初回学習報酬：100G・薬草×2・経験値15を受け取った！', 'メニューの「トレード修行」からいつでも復習や練習ができる。次のおすすめは講義「相場の基本」と「ダウ理論と波形」だ。'], { name: '師匠ハケイ' });
      await Events.checkCounterQuests();
    } else await Win.message([res.score >= 70 ? 'よく覚えているな。次は別の場面にも挑んでみよう。' : '焦らなくていい。分析の順番を思い出しながら、もう一度やってみよう。'], { name: '師匠ハケイ' });
    World.updateHud(); State.autosave(); return true;
  };
  function candleFigure() {
    // ローソク足の説明図（陽線・陰線）
    return '<svg viewBox="0 0 220 90" width="220" height="90" style="display:block;margin:6px auto;background:rgba(0,0,0,.25);border-radius:4px"><line x1="55" y1="8" x2="55" y2="82" stroke="#4cc38a" stroke-width="2"/><rect x="43" y="28" width="24" height="36" fill="#4cc38a"/><text x="55" y="88" fill="#9fe0a8" font-size="9" text-anchor="middle">陽線（終値＞始値）</text><text x="12" y="31" fill="#ccc" font-size="8">終値</text><text x="12" y="66" fill="#ccc" font-size="8">始値</text><text x="70" y="12" fill="#ccc" font-size="8">高値</text><text x="70" y="82" fill="#ccc" font-size="8">安値</text>' +
      '<line x1="160" y1="8" x2="160" y2="82" stroke="#e5484d" stroke-width="2"/><rect x="148" y="28" width="24" height="36" fill="#e5484d"/><text x="160" y="88" fill="#ffb0b0" font-size="9" text-anchor="middle">陰線（終値＜始値）</text><text x="178" y="31" fill="#ccc" font-size="8">始値</text><text x="178" y="66" fill="#ccc" font-size="8">終値</text></svg>';
  }
  Services.lectureAt = function (where) { return lecture(where); };
  Services.practice = function () { return practice(); };
  // 苦手分野の復習：分野を選び、その分野に向く場面から出題
  Services.reviewWeak = async function () {
    var d = State.data; var weak = TradeEval.weakTopics(d.trade); var all = TradeEval.topicSummary(d.trade);
    var list = (weak.length ? weak : all).slice(0, 6);
    var i = await Win.list(list.map(function (t) { return { label: t.label, right: t.plays ? Math.round(t.acc * 100) + '%（' + t.plays + '回）' : '未挑戦', sub: '習熟度：' + t.level + (t.hintRate > 0.5 && t.plays >= 3 ? '　ヒント依存が高い' : '') }; }), { title: '苦手分野の復習（正解率の低い順）' });
    if (i < 0) return;
    var ids = TradeEval.scenariosForTopic(list[i].key);
    await root.TradeUI.trial(ids, { title: '復習：' + list[i].label, practice: true });
    await Events.checkCounterQuests();
  };
  Services.dojo = async function (where) {
    var d = State.data;
    if (!d.flags.met_master && !d.trade.tutorialDone) { d.flags.met_master = true; await Win.message(['私は師匠ハケイ。相場の波を読む術を教えている。', 'まずは「はじめてのトレード」で、チャートの見方と判断の順番を体験してみよう。'], { name: '師匠ハケイ' }); await Services.tutorial(); }
    if (!d.flags.met_master) { await Win.message(['私は師匠ハケイ。相場の波を読む術を教えている。', 'この修行場では「講義」で考え方を学び、「チャートの試練」で判断を練習できる。試練のチャートは学習用に作られたもので、何度失敗しても資金は減らない。', '学んだ者にしか就けない職業もある。焦らず、一つずつだ。'], { name: '師匠ハケイ' }); d.flags.met_master = true; }
    while (true) {
      var a = await Win.choice('何をする？', ['はじめてのトレード（チュートリアル）', '講義を受ける', 'チャートの試練（練習）', '苦手分野の復習', '学習クエストを受ける', 'トレード記録を見る', 'やめる']);
      if (a === 0) await Services.tutorial();
      else if (a === 1) await lecture(where);
      else if (a === 2) await practice();
      else if (a === 3) await Services.reviewWeak();
      else if (a === 4) await learningQuests();
      else if (a === 5) await root.TradeUI.showRecord();
      else { await Win.message(['無理に戦わぬことも、立派な判断だ。']); return; }
    }
  };
  async function lecture(where) {
    var d = State.data;
    var avail = LECTURES.filter(function (L) { return L.where.indexOf(where) >= 0; });
    var items = avail.map(function (L) { var done = d.flags[L.id]; return { label: L.title, right: done ? '修了' : '未修了', sub: LEARNING.chapters[L.chapter - 1].theme }; });
    var i = await Win.list(items, { title: '講義を選ぶ' });
    if (i < 0) return;
    var L = avail[i]; var ch = LEARNING.chapters[L.chapter - 1];
    // 講義：教材を1項目ずつ表示 → 練習問題
    for (var k = 0; k < ch.lessons.length; k++) { await Win.panel('<div class="rw-title">' + esc(L.title) + '（' + (k + 1) + '/' + ch.lessons.length + '）</div><h3>' + esc(ch.lessons[k].title) + '</h3><p class="lesson">' + esc(ch.lessons[k].text) + '</p>'); }
    var correct = 0;
    for (var q = 0; q < ch.quiz.length; q++) {
      var qz = ch.quiz[q]; var ans = await Win.choice('問' + (q + 1) + '：' + qz.q, qz.options, { cancel: false });
      var ok = ans === qz.answer; if (ok) correct++;
      await Win.message([(ok ? '正解！ ' : '不正解…… ') + qz.explain]);
    }
    if (correct >= Math.ceil(ch.quiz.length * 0.75)) {
      if (!d.flags[L.id]) { d.flags[L.id] = true; d.trade.lectures[L.id] = true; await Win.message(['講義「' + L.title + '」を修了した！（' + correct + '/' + ch.quiz.length + '問正解）'], { name: '師匠ハケイ' }); var exp = 40 * L.chapter; State.partyActors().forEach(function (x) { Actors.gainExp(x, exp); }); await Win.message(['パーティー全員が経験値' + exp + 'を得た！']); if (root.Audio) root.Audio.playJingle('levelup'); }
      else await Win.message(['復習ご苦労。' + correct + '/' + ch.quiz.length + '問正解だ。'], { name: '師匠ハケイ' });
    } else await Win.message([correct + '/' + ch.quiz.length + '問正解。もう一度、教えを読み返してみるといい。'], { name: '師匠ハケイ' });
    State.autosave();
  }
  async function practice() {
    var defs = root.Scenarios.defs; var d = State.data;
    var items = [{ label: 'おまかせ（ランダム）', sub: defs.length + '種類の場面から出題' }].concat(defs.map(function (s) { var r = d.trade.stats.byScenario[s.id]; return { label: s.title, right: r ? '正解 ' + r.correct + '/' + r.plays : '未挑戦', sub: '第' + s.chapter + '章の題材' + (r && r.plays ? '' : '　※正解は回答後に表示') }; }));   // v4: 正解の事前表示はしない
    var i = await Win.list(items, { title: 'チャートの試練（練習）' });
    if (i < 0) return;
    var ids = i === 0 ? defs.map(function (s) { return s.id; }) : [defs[i - 1].id];
    await root.TradeUI.trial(ids, { title: '修行場の試練', practice: true });
    await Events.checkCounterQuests();
  }
  async function learningQuests() {
    var d = State.data; var ids = ['learn_pullback', 'learn_range', 'learn_hidden', 'learn_stoploss'];
    var items = ids.map(function (id) { var q = QUESTS[id]; var st = d.quests[id]; return { label: q.title, right: !st ? '未受注' : st.state === 'done' ? '達成' : (d.counters[q.counter] || 0) + '/' + q.need, sub: q.desc }; });
    var i = await Win.list(items, { title: '学習クエスト', info: function (k) { var r = QUESTS[ids[k]].reward; return '<div class="muted small">報酬：経験値' + r.exp + '・' + r.gold + 'G・' + ITEMS[r.item].name + '</div>'; } });
    if (i < 0) return;
    var id = ids[i];
    if (!d.quests[id]) { var a = await Win.choice('「' + QUESTS[id].title + '」を受ける？', ['受ける', 'やめる']); if (a === 0) { Events.questStart(id); await Win.message(['試練で成功すると進行する。「チャートの試練」で練習しよう。'], { name: '師匠ハケイ' }); } }
    else await Win.message([QUESTS[id].desc]);
  }

  root.Services = Services;
})(typeof window !== 'undefined' ? window : globalThis);
