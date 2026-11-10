/* =========================================================
   RPG / Bonds（v9.4 仲間の絆）：個人ストーリー・関係イベント・日常会話・選択の記憶
   ・対象：仲間16人（lina … mochipoyo）＋神聖犬ポン太（ponta）＋主人公（hero）＝18。各3話（BONDS94.EP）
   ・絆の段階は「好感度の数値」ではなく、見届けた話の数（0：加入直後／1：日常の一面を知る／2：大事な出来事を一緒に経験／3：変化を見届けた）
       段階の呼び名は人ごと（BONDS94.PROFILE[id].stages）。数値が高いから何かが起きる・恋人になる、という仕組みはない。戦力の上下もない
   ・解放の条件（cond）：加入・既存のクエストの達成・本編の章の達成など。前の話を見ていることも条件（1話→2話→3話）
       関係イベント（BONDS94.PAIRS）が未達成でも、本編・個人の話は止まらない（関係イベントは個人の話の条件にしない）
   ・記録：セーブの d.bonds（旧セーブにはないので State.migrate の初期値と Bonds.ensure が作る）
       seen：見た話（安定した ID → 日時）／later：「今日はやめておく」で先送りした話／mem：小さな選択の記憶（後の話・会話・エピローグで戻ってくる）
       last・hist：仲間ごとの「最後に選んだこと」と履歴／keep：記念品（持ち物ではない記録だけ）／chat：日常会話の順番／camp：テントを張った場所
   ・再生（思い出手帳から）：記録・アイテム・経験値・フラグを一切変えない。選択は再生の中だけで反映する
   ・会話の窓：名前・立ち絵・気持ち（emo：joy／sad／angry／surprise／puzzled／shy／anxious／relief／resolve／fond。2D・3D とも立ち絵の動き）
       3D：MTQ3D.cine（既存のイベント用カメラ）で、主人公と話す仲間（隊列に見えている仲間）の間に寄る。主人公の気持ちは MTQ3D.emote（既存のモーション）だけ
       隊列に見えていない仲間（待機中）・ポン太の 3D の動きはない（カメラ・間・文章で表す）
   ・話せる場所：町・村・建物の中（宿屋・酒場を含む）・野営地、またはテントを張った直後のその場所（Bonds.safeHere）。メインの導入（プロローグ）の最中は話せない
   ========================================================= */
(function (root) {
  'use strict';
  var B = { V: 1 };
  var IDS = ['lina', 'kyle', 'mina', 'seris', 'gald', 'lucia', 'elna', 'ganes', 'nagi', 'iris', 'sophia', 'io', 'aster', 'ord', 'kazuto', 'mochipoyo', 'ponta', 'hero'];
  B.IDS = IDS;
  B.EMOS = ['joy', 'sad', 'angry', 'surprise', 'puzzled', 'shy', 'anxious', 'relief', 'resolve', 'fond'];
  function D() { return root.State && root.State.data; }
  function DATA() { return root.BONDS94 || { EP: {}, PAIRS: {}, PROFILE: {}, CHAT: {}, KEEP: {} }; }
  function W() { return root.Win; }
  function now() { return Date.now(); }

  /* ---------- 記録 ---------- */
  B.defaults = function () { return { v: 1, seen: {}, later: {}, mem: {}, last: {}, hist: {}, keep: {}, chat: {}, camp: null }; };
  B.ensure = function (d) {
    d = d || D(); if (!d) return null;
    if (!d.bonds || typeof d.bonds !== 'object' || Array.isArray(d.bonds)) d.bonds = B.defaults();
    var b = d.bonds, t = B.defaults();
    ['seen', 'later', 'mem', 'last', 'hist', 'keep', 'chat'].forEach(function (k) { if (!b[k] || typeof b[k] !== 'object' || Array.isArray(b[k])) b[k] = t[k]; });
    if (b.camp && (typeof b.camp !== 'object' || typeof b.camp.map !== 'string')) b.camp = null;
    if (b.camp === undefined) b.camp = null;
    Object.keys(b.hist).forEach(function (k) { if (!Array.isArray(b.hist[k])) b.hist[k] = []; });
    Object.keys(b.keep).forEach(function (k) { if (!Array.isArray(b.keep[k])) b.keep[k] = []; });
    b.v = 1; return b;
  };
  function BD() { return B.ensure(); }

  /* ---------- 人・状態 ---------- */
  B.joined = function (id) {
    var d = D(); if (!d) return false;
    if (id === 'hero') return true;
    if (id === 'ponta') return !!(d.flags && d.flags.ponta_joined);
    return !!(d.companions && d.companions[id]);
  };
  B.name = function (id) {
    var d = D(); var C = root.COMPANIONS || {};
    if (id === 'hero') return (d && d.hero && d.hero.name) || '勇者';
    if (id === 'ponta') return '神聖犬ポン太';
    var a = d && d.companions && d.companions[id]; return (a && a.name) || (C[id] && C[id].name) || id;
  };
  B.shortName = function (id) { if (id === 'hero' || id === 'ponta') return id === 'hero' ? B.name('hero') : 'ポン太'; var P = DATA().PROFILE[id]; return (P && P.short) || B.name(id); };
  B.portrait = function (id) {
    var A = root.Assets, d = D(); if (!A) return null;
    try {
      if (id === 'hero') return d && d.hero ? A.portraitUrlFor(d.hero) : null;
      if (id === 'ponta') return (A.url && A.url('companions', 'ponta')) || null;
      var a = d && d.companions && d.companions[id];
      if (a) return A.portraitUrlFor(a);
      var C = root.COMPANIONS && root.COMPANIONS[id]; if (A.url && A.url('companions', id)) return A.url('companions', id);
      return C ? A.portraitUrl(C.sprite) : null;
    } catch (e) { return null; }
  };
  B.inParty = function (id) { var d = D(); return !!(d && d.party && d.party.indexOf(id) >= 0); };
  // 今の章（js/data/story.js の STORY_CHAPTERS の flag が立っている一番後ろの章）
  B.chapter = function () {
    var d = D(), CH = root.STORY_CHAPTERS || []; var c = 1; if (!d) return c;
    CH.forEach(function (x) { if (!x.flag || d.flags[x.flag]) c = Math.max(c, x.id); }); return c;
  };
  B.questDone = function (id) { var d = D(); return !!(d && d.quests && d.quests[id] && d.quests[id].state === 'done'); };
  B.mainDone = function (n) { return B.questDone('main_' + n); };
  B.cleared = function () { var d = D(); return !!(d && d.flags && d.flags.game_cleared); };
  B.region = function () { var W0 = root.World; var id = W0 && W0.map && W0.map.id; if (!id) return null; try { return root.Nav && root.Nav.regionOf ? root.Nav.regionOf(id) : null; } catch (e) { return null; } };

  /* ---------- 条件 ---------- */
  // { join:[id], q:[quest], main:n, ch:n, flag:[f], noflag:[f], ep:[epId], pair:[pairId], clear:true, mem:{k:v}, memHas:[k], region:[r], any:[cond…], not:cond, inParty:[id] }
  B.cond = function (c, mem) {
    if (!c) return true; var d = D(); if (!d) return false; mem = mem || BD().mem;
    if (Array.isArray(c)) return c.every(function (x) { return B.cond(x, mem); });
    var ok = true;
    if (c.join) ok = ok && c.join.every(B.joined);
    if (c.q) ok = ok && c.q.every(B.questDone);
    if (c.main) ok = ok && B.mainDone(c.main);
    if (c.ch) ok = ok && B.chapter() >= c.ch;
    if (c.flag) ok = ok && c.flag.every(function (f) { return !!d.flags[f]; });
    if (c.noflag) ok = ok && c.noflag.every(function (f) { return !d.flags[f]; });
    if (c.ep) ok = ok && c.ep.every(function (e) { return !!BD().seen[e]; });
    if (c.pair) ok = ok && c.pair.every(function (e) { return !!BD().seen[e]; });
    if (c.clear) ok = ok && B.cleared();
    if (c.inParty) ok = ok && c.inParty.every(B.inParty);
    if (c.region) { var r = B.region(); ok = ok && c.region.indexOf(r) >= 0; }
    if (c.mem) ok = ok && Object.keys(c.mem).every(function (k) { return mem[k] === c.mem[k]; });
    if (c.memHas) ok = ok && c.memHas.every(function (k) { return mem[k] !== undefined && mem[k] !== null && mem[k] !== ''; });
    if (c.any) ok = ok && c.any.some(function (x) { return B.cond(x, mem); });
    if (c.not) ok = ok && !B.cond(c.not, mem);
    return ok;
  };

  /* ---------- 個人の話（3話）・関係イベント ---------- */
  B.episodes = function (id) { var E = DATA().EP; return [1, 2, 3].map(function (n) { return E[id + '_' + n]; }).filter(Boolean); };
  B.epById = function (eid) { return DATA().EP[eid] || DATA().PAIRS[eid] || null; };
  B.seen = function (eid) { return !!BD().seen[eid]; };
  // 個人の話：'seen'（見た）／'ready'（見られる）／'locked'（まだ）
  B.epState = function (ep) {
    if (!ep) return 'locked'; if (B.seen(ep.id)) return 'seen';
    if (!B.joined(ep.who)) return 'locked';
    var n = ep.n || 1; if (n > 1 && !B.seen(ep.who + '_' + (n - 1))) return 'locked';
    if (ep.need && !ep.need.every(B.joined)) return 'locked';
    if (!B.cond(ep.cond)) return 'locked';
    return B.placeOk(ep.place) ? 'ready' : 'away';   // 'away'：見られるが、その場所（地域）へ行ってから
  };
  // 場所が決まっている話（place = { regions:[地域], label:'表示名' }）。決まっていなければどこでも
  B.placeOk = function (pl) { if (!pl || !pl.regions) return true; var r = B.region(); return pl.regions.indexOf(r) >= 0; };
  B.pairsOf = function (id) { var P = DATA().PAIRS; return Object.keys(P).map(function (k) { return P[k]; }).filter(function (p) { return p.a === id || p.b === id; }); };
  B.pairState = function (p) {
    if (!p) return 'locked'; if (B.seen(p.id)) return 'seen';
    if (!B.joined(p.a) || !B.joined(p.b)) return 'locked';   // どちらかが未加入なら保留（ほかの話は止めない）
    return B.cond(p.cond) ? 'ready' : 'locked';
  };
  B.stage = function (id) { return B.episodes(id).filter(function (e) { return B.seen(e.id); }).length; };
  B.stageLabel = function (id) { var P = DATA().PROFILE[id]; var s = B.stage(id); return (P && P.stages && P.stages[s]) || ['旅の仲間', '日常を知る仲間', '大事な時を共にした仲間', '変化を見届けた仲間'][s]; };
  B.readyEpisodes = function (id) { return B.episodes(id).filter(function (e) { return B.epState(e) === 'ready'; }); };
  B.awayEpisodes = function (id) { return B.episodes(id).filter(function (e) { return B.epState(e) === 'away'; }); };
  B.readyPairs = function (id) { return B.pairsOf(id).filter(function (p) { return B.pairState(p) === 'ready'; }); };
  B.hasNew = function (id) { return B.joined(id) && (B.readyEpisodes(id).length > 0 || B.readyPairs(id).length > 0); };
  B.anyNew = function () { return IDS.some(function (id) { return id !== 'hero' && B.hasNew(id); }) || B.readyEpisodes('hero').length > 0; };
  B.talkable = function () { return IDS.filter(function (id) { return id !== 'hero' && B.joined(id); }); };
  B.summary = function (id) {
    var b = BD(); var eps = B.episodes(id);
    return { id: id, name: B.name(id), stage: B.stage(id), label: B.stageLabel(id), seen: eps.filter(function (e) { return B.seen(e.id); }).length, total: eps.length,
      isNew: B.hasNew(id), away: B.awayEpisodes(id).map(function (e) { return e.place.label; }), last: b.last[id] || null };
  };

  /* ---------- 話せる場所 ---------- */
  B.CAMP_STEPS = 40;
  B.markCamp = function () { var d = D(), W0 = root.World; if (!d || !W0 || !W0.map) return; BD().camp = { map: W0.map.id, steps: d.steps || 0 }; };
  B.camping = function () { var d = D(), W0 = root.World, c = BD().camp; return !!(c && W0 && W0.map && c.map === W0.map.id && (d.steps || 0) - (c.steps || 0) <= B.CAMP_STEPS); };
  B.safeHere = function () {
    var d = D(), W0 = root.World; if (!d || !W0 || !W0.map || !W0.map.def) return false;
    if (root.Story3121 && root.Story3121.inPrologue && root.Story3121.inPrologue()) return false;
    if (d.aboard) return B.camping();
    var k = W0.map.def.kind; if (k === 'town' || k === 'interior') return true;
    return B.camping();
  };

  /* ---------- 文の差し込み：{hero} {n:id} {m:記憶のキー|なかったとき} ---------- */
  B.fmt = function (s, mem) {
    mem = mem || BD().mem;
    return String(s).replace(/\{hero\}/g, B.name('hero')).replace(/\{n:([a-z]+)\}/g, function (_, id) { return B.shortName(id); })
      .replace(/\{m:([a-z0-9_]+)(?:\|([^}]*))?\}/g, function (_, k, def) { var v = mem[k]; return v === undefined || v === null || v === '' ? (def || '') : String(v); });
  };

  /* ---------- 3D の寄り（既存のイベント用カメラ MTQ3D.cine だけを使う） ---------- */
  var CAM = { close: { dist: 8, pitch: 30 }, normal: { dist: 10, pitch: 34 }, wide: { dist: 14, pitch: 42 } };   // 近すぎると木や壁でさえぎられやすい（ヘッドレスの画面で確かめて調整）
  function heroTile() { var d = D(); return d && d.pos ? { x: d.pos.x, y: d.pos.y } : null; }
  function followerTile(id) { try { var F = root.Follow; if (!F || !F.positions) return null; var f = F.positions().filter(function (p) { return p.id === id; })[0]; return f ? { x: f.x - 0.5, y: f.y - 0.5 } : null; } catch (e) { return null; } }
  B.cam3d = function (mode, who) {
    var A = root.MTQ3D; if (!A || !A.cine) return false;
    try {
      if (!mode || mode === 'off') { A.cine(null); return true; }
      var h = heroTile(); if (!h) return false; var c = CAM[mode] || CAM.normal; var t = h;
      var f = who && who !== 'hero' ? followerTile(who) : null; if (f) t = { x: (h.x + f.x) / 2, y: (h.y + f.y) / 2 };
      A.cine({ x: t.x, y: t.y, dist: c.dist, pitch: c.pitch }); return true;
    } catch (e) { return false; }
  };
  var HERO_EMOTE = { joy: 'Victory', surprise: 'Hit', resolve: 'Defend' };   // 主人公のモデルにあるモーションだけ（three-src/src/assets/manifest.js の ANIMS）
  function heroEmote(emo) { var A = root.MTQ3D, n = HERO_EMOTE[emo]; if (!n || !A || !A.emote) return; try { A.emote(n); } catch (e) { /* 演出だけ */ } }

  /* ---------- 場面の再生 ----------
     手順（steps）：['n', 文]（地の文）／['s', 人, 文, 気持ち]（台詞）／['a', 人, 文, 気持ち]（しぐさ：名前なし・立ち絵あり。ポン太はこれだけ）
       ／['h', 文, 気持ち]（主人公の台詞。性別・一人称を決めない）／['c', 問い, [{ t, mem, last, keep, later, then:[…] }]]（選択）
       ／['if', 条件, [手順], [そうでないときの手順]]／['p', ミリ秒]（間）／['cam', 'close'|'normal'|'wide'|'off']（3D の寄り）／['mem', {k:v}]／['keep', 記念品ID] */
  B.playing = false;
  B.play = async function (scene, opts) {
    opts = opts || {}; var replay = !!opts.replay; var b = BD(); var M = W(); if (!scene || !M) return { done: false };
    var mem = replay ? JSON.parse(JSON.stringify(b.mem)) : b.mem;   // 再生では記録を変えない（写しを使う）
    var st = { stop: false, later: false, camMode: scene.cam || 'normal', choices: [] };
    var who0 = scene.who || scene.a || null; var cam = opts.noCam ? function () { return false; } : B.cam3d;
    B.playing = true;
    try {
      cam(st.camMode, who0);
      if (!replay && b.later[scene.id] && scene.resume) await run(scene.resume);
      await run(scene.steps || []);
    } finally { B.playing = false; cam('off'); }
    if (st.later) { if (!replay) b.later[scene.id] = (b.later[scene.id] || 0) + 1; return { done: false, later: true }; }
    if (!replay) {
      b.seen[scene.id] = now(); delete b.later[scene.id];
      if (root.State && root.State.autosave) try { root.State.autosave(); } catch (e) { /* 保存の失敗で止めない */ }
    }
    return { done: true, choices: st.choices };

    async function run(steps) {
      for (var i = 0; i < steps.length && !st.stop; i++) await step(steps[i]);
    }
    function lines(x) { return (Array.isArray(x) ? x : [x]).map(function (s) { return B.fmt(s, mem); }); }
    async function step(s) {
      var k = s[0];
      if (k === 'n') { await M.message(lines(s[1])); return; }
      if (k === 's') { cam(st.camMode, s[1]); await M.message(lines(s[2]), { name: B.name(s[1]), portrait: B.portrait(s[1]), emo: s[3] || null }); return; }
      if (k === 'a') { cam(st.camMode, s[1]); await M.message(lines(s[2]), { portrait: B.portrait(s[1]), emo: s[3] || null }); return; }
      if (k === 'h') { if (s[2] && !opts.noCam) heroEmote(s[2]); await M.message(lines(s[1]), { name: B.name('hero'), portrait: B.portrait('hero'), emo: s[2] || null }); return; }
      if (k === 'p') { if (M.sleep) await M.sleep(Math.min(2000, s[1] || 500)); return; }
      if (k === 'cam') { st.camMode = s[1]; cam(st.camMode, who0); return; }
      if (k === 'mem') { Object.keys(s[1] || {}).forEach(function (key) { mem[key] = s[1][key]; }); return; }
      if (k === 'keep') { if (!replay) addKeep(scene, s[1]); return; }
      if (k === 'if') { await run(B.cond(s[1], mem) ? (s[2] || []) : (s[3] || [])); return; }
      if (k === 'c') {
        var o = (s[2] || []).filter(function (x) { return !x.when || B.cond(x.when, mem); });
        var a = await M.choice(B.fmt(s[1] || '', mem), o.map(function (x) { return B.fmt(x.t, mem); }));
        var pick = o[a] || o[o.length - 1]; if (!pick) return;
        st.choices.push(pick.t);
        if (pick.mem) Object.keys(pick.mem).forEach(function (key) { mem[key] = pick.mem[key]; });
        if (pick.last && !replay) remember(scene, B.fmt(pick.last, mem));
        if (pick.keep && !replay) addKeep(scene, pick.keep);
        if (pick.then) await run(pick.then);
        if (pick.later) { st.later = true; st.stop = true; }
        if (pick.end) st.stop = true;
        return;
      }
    }
  };
  function owners(scene) { return scene.who ? [scene.who] : [scene.a, scene.b].filter(Boolean); }
  function remember(scene, text) {
    var b = BD(); owners(scene).forEach(function (id) { if (id === 'hero') return; b.last[id] = text; var h = b.hist[id] || (b.hist[id] = []); h.push({ ep: scene.id, t: text, at: now() }); if (h.length > 30) h.splice(0, h.length - 30); });
    if (scene.who === 'hero') { var hh = b.hist.hero || (b.hist.hero = []); hh.push({ ep: scene.id, t: text, at: now() }); if (hh.length > 30) hh.splice(0, hh.length - 30); b.last.hero = text; }
  }
  function addKeep(scene, kid) {
    var b = BD(); var owner = scene.keepTo || scene.who || scene.a; if (!owner || !kid) return;
    var list = b.keep[owner] || (b.keep[owner] = []); if (list.indexOf(kid) < 0) list.push(kid);
  }
  B.keepsakes = function (id) { var K = DATA().KEEP; return (BD().keep[id] || []).map(function (k) { return K[k] ? { id: k, name: K[k].name, desc: B.fmt(K[k].desc) } : null; }).filter(Boolean); };

  /* ---------- 日常会話（BONDS94.CHAT[id]）：話題を順番に。1回に1つだけ ---------- */
  // 話題：daily（雑談）／food（食べ物・趣味）／region（今いる地域）／battle（最近の戦い）／others（ほかの仲間。関係イベントのあとは変わる）／post（クリア後）
  B.TOPICS = ['daily', 'food', 'region', 'battle', 'others', 'post'];
  B.TOPIC_NAMES = { daily: 'いつもの話', food: '食べ物・趣味の話', region: 'この辺りの話', battle: '最近の戦いの話', others: 'ほかの仲間の話', post: '旅のあとの話' };
  function okEntry(e) { if (!e) return false; if (Array.isArray(e)) return true; return B.cond(e.when); }
  function entryLines(e) { return Array.isArray(e) ? e : (e.lines || []); }
  B.chatCandidates = function (id) {
    var C = DATA().CHAT[id]; if (!C) return {};
    var out = {};
    B.TOPICS.forEach(function (t) {
      var list = [];
      if (t === 'region') { var r = B.region(); var R = C.region || {}; list = (r && R[r]) ? R[r].slice() : (R._ || []).slice(); }
      else if (t === 'others') {
        var O = C.others || {};
        Object.keys(O).forEach(function (other) { if (!B.joined(other)) return; (O[other] || []).forEach(function (e) { list.push(e); }); });
      } else list = (C[t] || []).slice();
      if (t === 'post' && !B.cleared()) list = [];
      if (t !== 'post' && B.cleared() && C.post && C.post.length && t === 'daily') { /* クリア後も雑談は続ける */ }
      list = list.filter(okEntry);
      // 関係イベントのあとの会話（pairAfter）は、その話題の先頭に出す
      if (t === 'others' && C.pairAfter) Object.keys(C.pairAfter).forEach(function (pid) { if (B.seen(pid)) (C.pairAfter[pid] || []).filter(okEntry).forEach(function (e) { list.unshift(e); }); });
      if (list.length) out[t] = list;
    });
    return out;
  };
  // 次に話す1つ（順番：話題を1つずつ回し、話題の中のバリエーションも1つずつ回す）
  B.nextChat = function (id) {
    var cand = B.chatCandidates(id); var topics = B.TOPICS.filter(function (t) { return cand[t]; }); if (!topics.length) return null;
    var b = BD(); var n = b.chat[id] || 0;
    if (B.cleared() && cand.post) topics = ['post'].concat(topics.filter(function (t) { return t !== 'post'; }));
    var t = topics[n % topics.length]; var list = cand[t]; var v = Math.floor(n / topics.length) % list.length;
    return { topic: t, entry: list[v], index: v, count: list.length };
  };
  B.chat = async function (id) {
    var c = B.nextChat(id); var M = W(); if (!c || !M) { if (M) await M.message([B.name(id) + 'は、いつものように隣にいる。']); return null; }
    var e = c.entry; var emo = Array.isArray(e) ? null : e.emo || null;
    if (id === 'ponta') await M.message(entryLines(e).map(function (s) { return B.fmt(s); }), { portrait: B.portrait('ponta'), emo: emo });
    else if (!Array.isArray(e) && e.steps) await B.play({ id: 'chat_' + id, who: id, steps: e.steps, cam: 'normal' }, { replay: true });
    else { B.cam3d('normal', id); await M.message(entryLines(e).map(function (s) { return B.fmt(s); }), { name: B.name(id), portrait: B.portrait(id), emo: emo }); B.cam3d('off'); }
    var b = BD(); b.chat[id] = (b.chat[id] || 0) + 1;
    return c.topic;
  };

  /* ---------- エンディング：変化を見届けた仲間との思い出（finale.js の Finale.epilogue から） ---------- */
  B.epilogueLines = function () {
    var P = DATA().PROFILE; var out = [];
    IDS.forEach(function (id) { if (id === 'hero' || !B.joined(id)) return; var p = P[id]; if (!p || !p.epilogue) return; if (B.stage(id) < 3) return; out.push(B.fmt(p.epilogue)); });
    var H = P.hero; if (H && H.epilogue && B.stage('hero') >= 3) out.push(B.fmt(H.epilogue));
    return out;
  };

  /* ---------- 確かめ用：データの形 ---------- */
  B.check = function () {
    var E = DATA().EP, P = DATA().PAIRS, errs = [];
    IDS.forEach(function (id) { [1, 2, 3].forEach(function (n) { var e = E[id + '_' + n]; if (!e) errs.push('話がない ' + id + '_' + n); else { if (e.who !== id || e.n !== n || e.id !== id + '_' + n) errs.push('ID の食い違い ' + id + '_' + n); if (!e.title || !e.steps || !e.steps.length) errs.push('題・手順がない ' + e.id); } }); });
    Object.keys(P).forEach(function (k) { var p = P[k]; if (p.id !== k || IDS.indexOf(p.a) < 0 || IDS.indexOf(p.b) < 0 || !p.title || !p.steps) errs.push('関係イベントの形 ' + k); });
    return errs;
  };

  root.Bonds = B;
})(typeof window !== 'undefined' ? window : globalThis);
