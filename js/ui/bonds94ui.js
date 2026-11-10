/* =========================================================
   UI / Bonds（v9.4 仲間の絆）：メニュー「仲間と話す」「仲間の思い出」
   ・仲間と話す：加入済みの仲間（戦闘メンバー・待機メンバーとも）＋神聖犬ポン太＋「自分のこと」（主人公の話）
       一覧の右の欄に「絆」「思い出 n／3話」「新しい話」「最後に選んだこと」を出す。選ぶと、話す（日常会話を1つ）／新しい話／関係イベント
       話の再生はメニューを閉じてから（3D のカメラが見えるように。Menu._afterClose）。宿屋・酒場から呼んだときはその場で
   ・仲間の思い出（手帳）：顔・名前・紹介・加入した場所・好きなもの・性格・思い出（未解放は「？？？」と自然なヒント）・選択の履歴・
       ほかの仲間との関係・記念品・個人の話の達成。見た話はいつでも再生できる（再生は記録を変えない：Bonds.play の replay）
   ========================================================= */
(function (root) {
  'use strict';
  var UI = {};
  function B() { return root.Bonds; }
  function DATA() { return root.BONDS94 || { PROFILE: {}, EP: {}, PAIRS: {} }; }
  function W() { return root.Win; }
  function D() { return root.State && root.State.data; }
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function img(id, h) { var u = B().portrait(id); return u ? '<img class="portrait info-portrait bond-portrait" src="' + esc(u) + '" alt="" style="height:' + (h || 120) + 'px">' : ''; }

  // 一覧に出す人（仲間と話す）：加入順ではなく、決まった順（BONDS94 の IDS）
  UI.people = function () { var b = B(); return b.IDS.filter(function (id) { return id !== 'hero' && b.joined(id); }); };

  function statusHtml(id) {
    var b = B(), s = b.summary(id);
    var rows = [['絆', s.label], ['思い出', s.seen + '／' + s.total + '話'], ['新しい話', s.isNew ? 'あり' : s.away.length ? s.away[0] + 'で見られそう' : 'なし']];
    if (id !== 'hero') rows.push(['最後に選んだこと', s.last || '—']);
    return '<div class="bond-status"><div class="bond-name">' + esc(s.name) + '</div>' + rows.map(function (r) { return '<div class="bond-row"><span class="k">' + esc(r[0]) + '</span><span class="v' + (r[0] === '新しい話' && s.isNew ? ' new' : '') + '">' + esc(r[1]) + '</span></div>'; }).join('') + '</div>';
  }

  /* ---------- 仲間と話す ---------- */
  // opts.fromMenu：メニューから（話の再生はメニューを閉じてから。戻り値 'close'）
  UI.talk = async function (opts) {
    opts = opts || {}; var b = B(), M = W(); if (!b || !M) return null; b.ensure();
    if (opts.fromMenu && !b.safeHere()) {
      await M.message(['ここは、落ち着いて話せる場所ではない。', '町・村・宿屋・酒場・野営地などで話せる。', 'フィールドやダンジョンでは、テントを張ると、焚き火のそばで話せる。']);
      return null;
    }
    var ids = UI.people(); var heroEps = b.episodes('hero');
    var list = ids.slice(); if (heroEps.length && ids.length) list.push('hero');
    if (!list.length) { await M.message(['まだ旅の仲間がいない。']); return null; }
    while (true) {
      var items = list.map(function (id) {
        var s = b.summary(id);
        return { label: (s.isNew ? '★ ' : '') + (id === 'hero' ? s.name + '（自分のこと）' : s.name), right: s.isNew ? '新しい話' : s.away.length ? '（' + s.away[0] + 'で）' : '', sub: s.label + '　思い出 ' + s.seen + '／' + s.total };
      });
      var i = await M.list(items, { title: '仲間と話す', cls: 'bond-list', key: 'bonds:talk', okLabel: '話す', info: function (k) { var id = list[k]; return img(id, 120) + statusHtml(id); } });
      if (i < 0 || typeof i === 'object') return null;
      var id = list[i]; var act = await UI.actions(id); if (!act) continue;
      if (opts.fromMenu && root.Menu) { root.Menu._afterClose = function () { return UI.run(act); }; return 'close'; }
      await UI.run(act); return 'done';
    }
  };
  // その人とできること：話す（日常会話）・新しい話・関係イベント
  UI.actions = async function (id) {
    var b = B(), M = W(); var acts = [], labels = [];
    var eps = b.readyEpisodes(id); var pairs = id === 'hero' ? [] : b.readyPairs(id);
    eps.forEach(function (e) { acts.push({ kind: 'ep', scene: e }); labels.push('新しい話「' + e.title + '」'); });
    pairs.forEach(function (p) { var other = p.a === id ? p.b : p.a; acts.push({ kind: 'pair', scene: p }); labels.push(b.shortName(other) + 'と一緒に「' + p.title + '」'); });
    if (id !== 'hero') { var nx = b.nextChat(id); acts.push({ kind: 'chat', id: id }); labels.push(id === 'ponta' ? 'そばに行く' : '話す（' + (nx ? b.TOPIC_NAMES[nx.topic] : 'いつもの話') + '）'); }
    else if (!eps.length) { await M.message(b.episodes('hero').every(function (e) { return b.seen(e.id); }) ? ['自分の話は、ぜんぶ仲間と分け合った。', '（仲間の思い出から、いつでも振り返れる）'] : ['今は、自分のことを話す時ではない気がする。', '（旅が進むと、仲間から話しかけてくることがある）']); return null; }
    acts.push(null); labels.push('やめる');
    var aw = b.awayEpisodes(id).map(function (e) { return '（' + e.place.label + 'へ行くと、新しい話が見られそう）'; }).join('');
    var a = await M.choice(b.name(id) + (id === 'hero' ? '（自分のこと）' : '') + '　絆：' + b.stageLabel(id) + aw, labels);
    return acts[a] || null;
  };
  UI.run = async function (act) {
    var b = B(); if (!act) return;
    if (act.kind === 'chat') { await b.chat(act.id); return; }
    var r = await b.play(act.scene, {});
    if (r && r.done && root.Win && root.Win.toast) root.Win.toast('思い出「' + act.scene.title + '」を仲間の思い出に記録した');
  };

  /* ---------- 仲間の思い出（手帳） ---------- */
  function profileHtml(id) {
    var b = B(), P = DATA().PROFILE[id] || {}, C = (root.COMPANIONS || {})[id] || {};
    if (!b.joined(id)) return '<div class="bond-book"><div class="bond-name">？？？</div><div class="muted">' + esc(P.hint || 'まだ出会っていない。旅の先で出会うかもしれない。') + '</div></div>';
    var eps = b.episodes(id), stage = b.stage(id);
    var mem = eps.map(function (e) { var st = b.epState(e); return '<li class="' + st + '">' + (st === 'seen' ? '第' + e.n + '話「' + esc(e.title) + '」' : '第' + e.n + '話　？？？' + (st === 'away' ? '<span class="muted small">　' + esc(e.place.label) + 'で見られそう</span>' : e.hint ? '<span class="muted small">　' + esc(b.fmt(e.hint)) + '</span>' : '')) + (st === 'ready' ? ' <b class="bond-new">新しい話</b>' : '') + '</li>'; }).join('');
    var hist = (b.ensure().hist[id] || []).slice(-6).reverse().map(function (h) { return '<li>' + esc(h.t) + '</li>'; }).join('') || '<li class="muted">まだない</li>';
    var rel = id === 'hero' ? '' : b.pairsOf(id).map(function (p) { var o = p.a === id ? p.b : p.a; var st = b.pairState(p); if (!b.joined(o)) return '<li class="muted">？？？</li>'; return '<li>' + esc(b.shortName(o)) + '：' + (st === 'seen' ? '「' + esc(p.title) + '」' + (p.rel ? '　' + esc(p.rel) : '') : st === 'ready' ? '<b class="bond-new">一緒に話せそう</b>' : '？？？') + '</li>'; }).join('');
    var keep = b.keepsakes(id).map(function (k) { return '<li><b>' + esc(k.name) + '</b>　<span class="muted small">' + esc(k.desc) + '</span></li>'; }).join('') || '<li class="muted">まだない</li>';
    var row = function (k, v) { return v ? '<div class="bond-row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>' : ''; };
    return '<div class="bond-book"><div class="bond-name">' + esc(b.name(id)) + '</div>' +
      '<div class="bond-intro">' + esc(b.fmt(P.intro || C.background || '')) + '</div>' +
      row('加入した場所', P.joinPlace) + row('好きなもの', P.likes ? b.fmt(P.likes) : '') + row('性格', b.fmt(P.personality || C.personality || '')) + row('絆', b.stageLabel(id)) + row('個人の話', stage + '／' + eps.length + '話') +
      '<div class="bond-sec">思い出</div><ul class="bond-ul">' + mem + '</ul>' +
      (id === 'hero' ? '' : '<div class="bond-sec">主人公と選んだこと</div><ul class="bond-ul">' + hist + '</ul>') +
      (rel ? '<div class="bond-sec">ほかの仲間との関係</div><ul class="bond-ul">' + rel + '</ul>' : '') +
      '<div class="bond-sec">記念品</div><ul class="bond-ul">' + keep + '</ul></div>';
  }
  UI.notebook = async function () {
    var b = B(), M = W(); if (!b || !M) return; b.ensure();
    var list = b.IDS.filter(function (id) { return id !== 'hero'; }).concat(['hero']);
    while (true) {
      var items = list.map(function (id) { var j = b.joined(id); var s = b.summary(id); return { label: j ? (id === 'hero' ? s.name + '（自分）' : s.name) : '？？？', right: j ? s.seen + '／' + s.total : '', sub: j ? s.label : '', disabled: false }; });
      var i = await M.list(items, { title: '仲間の思い出', cls: 'bond-list bond-notebook', key: 'bonds:book', okLabel: '思い出を再生', info: function (k) { var id = list[k]; return (b.joined(list[k]) ? img(id, 110) : '') + profileHtml(id); } });
      if (i < 0 || typeof i === 'object') return;
      var id = list[i]; if (!b.joined(id)) { await M.message(['まだ出会っていない人の記録は、白いページのままだ。']); continue; }
      await UI.replayList(id);
    }
  };
  UI.replayList = async function (id) {
    var b = B(), M = W();
    var scenes = b.episodes(id).filter(function (e) { return b.seen(e.id); }).concat(id === 'hero' ? [] : b.pairsOf(id).filter(function (p) { return b.seen(p.id); }));
    if (!scenes.length) { await M.message(['まだ、振り返る思い出がない。', '（「仲間と話す」で新しい話が見られる）']); return; }
    while (true) {
      var i = await M.list(scenes.map(function (s) { var other = s.who ? null : (s.a === id ? s.b : s.a); return { label: (s.who ? '第' + s.n + '話「' : (b.shortName(other) + 'と「')) + s.title + '」', sub: s.who ? '個人の話' : '関係の話' }; }), { title: b.name(id) + 'の思い出（再生）', cls: 'bond-list', okLabel: '再生する' });
      if (i < 0 || typeof i === 'object') return;
      await M.message(['（思い出の再生。持ち物・経験値・記録は変わらない）']);
      await b.play(scenes[i], { replay: true, noCam: true });
    }
  };

  /* ---------- 宿屋・酒場から ---------- */
  // 宿に泊まったあと：新しい話がある仲間がいれば、一言だけ知らせる（割り込みはしない）
  UI.afterInn = async function () {
    var b = B(), M = W(); if (!b || !M || !b.anyNew()) return;
    var who = UI.people().filter(function (id) { return b.hasNew(id); })[0] || (b.readyEpisodes('hero').length ? 'hero' : null); if (!who) return;
    var msg = who === 'ponta' ? '（神聖犬ポン太が、こちらを見て尻尾を振っている）' : who === 'hero' ? '（食堂で、仲間たちがこちらを見ている。何か聞きたそうだ）' : '（' + b.shortName(who) + 'が、何か話したそうにしている）';
    var a = await M.choice(msg, ['仲間と話す', 'そのまま出発する']);
    if (a === 0) await UI.talk({});
  };

  root.BondsUI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
