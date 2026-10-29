/* =========================================================
   UI / Services : 店・宿屋・教会・酒場・ギルド（転職・掲示板）・銀行・修行場
   ========================================================= */
(function (root) {
  'use strict';

  var Win = root.Win, State = root.State, ITEMS = root.ITEMS, JOBS = root.JOBS, Actors = root.Actors, World = root.World, QUESTS = root.QUESTS, COMPANIONS = root.COMPANIONS, LEARNING = root.LEARNING, LECTURES = root.LECTURES, Events = root.Events;
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
      var i = await Win.list(items, { title: 'パーティー編成（最大4人）', info: function (k) { var id = ['hero'].concat(ids)[k]; var c = COMPANIONS[id]; return c ? '<div class="muted">' + esc(c.bio) + '</div><div class="muted small">' + esc(c.background) + '</div>' : '<div class="muted">主人公は外せない</div>'; } });
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
    var ji = await Win.list(items, { title: actor.name + 'の転職先', info: function (k) { var j = JOBS[jobs[k]]; var u = j.unlock; return '<div>' + esc(j.desc) + '</div><div class="muted small">固有：' + esc(j.trait) + '</div><div class="muted small">武器：' + j.weapons.join('/') + '</div>' + (u ? '<div class="muted small">条件：' + (u.jobsAny ? u.jobsAny.map(function (x) { return JOBS[x].name; }).join('か') + 'でLv' + u.level : (u.flag ? '修行場で「' + (u.flag === 'learned_dow' ? 'ダウ理論' : '資金管理') + '」を修了しLv' + u.level : 'Lv' + u.level)) + '</div>' : ''); } });
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
  Services.dojo = async function (where) {
    var d = State.data;
    if (!d.flags.met_master) { await Win.message(['私は師匠ハケイ。相場の波を読む術を教えている。', 'この修行場では「講義」で考え方を学び、「チャートの試練」で判断を練習できる。試練のチャートは学習用に作られたもので、何度失敗しても資金は減らない。', '学んだ者にしか就けない職業もある。焦らず、一つずつだ。'], { name: '師匠ハケイ' }); d.flags.met_master = true; }
    while (true) {
      var a = await Win.choice('何をする？', ['講義を受ける', 'チャートの試練（練習）', '学習クエストを受ける', 'トレード記録を見る', 'やめる']);
      if (a === 0) await lecture(where);
      else if (a === 1) await practice();
      else if (a === 2) await learningQuests();
      else if (a === 3) await root.TradeUI.showRecord();
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
    var items = [{ label: 'おまかせ（ランダム）', sub: '14種類の場面から出題' }].concat(defs.map(function (s) { var r = d.trade.stats.byScenario[s.id]; return { label: s.title, right: r ? r.correct + '/' + r.plays : '―', sub: '正解：' + (s.correct === 'skip' ? '見送り' : s.correct === 'buy' ? '買い' : '売り') + '（答えを見ずに挑もう）' }; }));
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
