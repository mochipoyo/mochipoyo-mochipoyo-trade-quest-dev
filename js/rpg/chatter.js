/* =========================================================
   RPG / Chatter（v6.7）：町の人（モブ）の会話を増やす
   ・対象：ふつうの町人・兵士・商人などの見た目（MOB_SPRITES）で、会話の中で店・宿・仲間・戦闘などを動かさない NPC
     （仲間・師匠・王などの登場人物、店主の役目をする NPC、ゲームの仕組みを直接さわる会話は対象外＝いままでどおり）
   ・流れ（NPC ごと）：
       1. 何かが起きる会話（フラグ・アイテム・クエスト・仲間のひと言など）＝「重要な会話」はいままでどおり
       2. そのあとの「いつもの会話」を1回聞いたら、
       3. 話しかけるたびに 3種類の別の会話（その地域の話・その人の話・相場の小話）を順に話し、4回目でいつもの会話に戻る
       ・物語が進んでいつもの会話の中身が変わったら、また 2. から
   ・判定のしかた：本物の会話の前に、記録だけする「下見」で会話を動かす（say・msg を記録。フラグやアイテムを変える呼び出しがあれば
     その場で止めて「重要な会話」とみなす）。下見はゲームの状態を何も変えない
   ・記録：セーブの d.chat（NPC ごとに [いつもの会話の印, 回数]）。古いセーブにはないので、なければ作る
   ・会話の文：js/data/chatter67.js（CHATTER67）。生活・健康の豆知識おばさんもここで話す
   ========================================================= */
(function (root) {
  'use strict';
  var CH = {};
  var MOB_SPRITES = { villager_m: 'man', villager_f: 'woman', elder: 'elder', child: 'child', guard: 'guard', federal_soldier: 'guard', royal_guard: 'guard', rune_knight: 'guard', merchant: 'merchant', scholar: 'scholar', sailor: 'sailor', bartender: 'host', innkeeper: 'host', priest: 'priest' };
  var ACTS = ['choice', 'setFlag', 'give', 'take', 'addGold', 'join', 'questStart', 'questComplete', 'shop', 'inn', 'church', 'tavern', 'guild', 'bank', 'dojo', 'trial', 'battle', 'warp', 'heal'];
  var ACT = { act: true };
  function D() { return root.State && root.State.data; }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h; }
  function strip(src) { return String(src).replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""'); }

  // 会話の関数の外にある変数への代入・++/--、物の中身（.x = や [i] =）の書きかえがあるか（文字列は除いた本文で調べる）
  CH.writesOutside = function (b) {
    var local = {}; var m, re;
    var head = /^\s*(?:async\s+)?(?:function\s*[\w$]*\s*)?\(([^)]*)\)/.exec(b); if (head) head[1].split(',').forEach(function (p) { p = p.replace(/=.*$/, '').trim(); if (p) local[p] = 1; });
    re = /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g; while ((m = re.exec(b))) local[m[1]] = 1;
    if (/[.\]]\s*(?:[+\-*\/%]?=)(?![=>])/.test(b) || /[.\]]\s*(?:\+\+|--)/.test(b)) return true;
    re = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*(?:[+\-*\/%]?=)(?![=>])/g; while ((m = re.exec(b))) if (!local[m[1]]) return true;
    re = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*(?:\+\+|--)|(?:\+\+|--)\s*([A-Za-z_$][\w$]*)/g; while ((m = re.exec(b))) if (!local[m[1] || m[2]]) return true;
    return false;
  };
  CH.roleOf = function (npc) { return (npc && MOB_SPRITES[npc.sprite]) || null; };
  // 対象の NPC か（会話の関数が変わったら判定し直す）
  CH.isMob = function (npc) {
    if (!npc || typeof npc.talk !== 'function') return false;
    if (npc._mobFn === npc.talk) return npc._mob;
    var ok = !!CH.roleOf(npc) && !npc.noChatter && !(root.COMPANIONS && root.COMPANIONS[npc.id]);
    if (ok) {
      var b = strip(npc.talk);
      if (/root\.|State\.|World\.|Win\.|Engine\.|Events\.|\bD\(\)|\bd\.\w+(\.\w+)*\s*=[^=]/.test(b)) ok = false;   // ゲームの仕組みを直接さわる会話
      if (/c\.(shop|inn|church|tavern|dojo|guild|bank|trial|battle|join|warp|heal)\(/.test(b)) ok = false;   // 店・宿などの役目
      if (ok && CH.writesOutside(b)) ok = false;   // 会話の外の変数や物を書きかえる会話（下見で2回動くと困る）
    }
    npc._mob = ok; npc._mobFn = npc.talk; return ok;
  };

  // 下見：会話の中身（say・msg）を記録する。状態を変える呼び出しがあれば null（＝重要な会話）
  CH.preview = function (npc, real) {
    var rec = { lines: [], name: null };
    var c = {
      say: function (name, lines) { if (rec.name === null) rec.name = name || ''; rec.lines.push(String(name) + '\u0001' + [].concat(lines || []).join('\u0002')); return Promise.resolve(); },
      msg: function (lines) { rec.lines.push('\u0001' + [].concat(lines || []).join('\u0002')); return Promise.resolve(); },
      flag: real.flag, has: real.has, hasCompanion: real.hasCompanion, questActive: real.questActive, questDone: real.questDone, party: real.party,
      remark: function (id, lines, once) {
        var d = D(); if (!d || !d.companions[id] || d.party.indexOf(id) < 0) return Promise.resolve(false);
        if (once) { if (d.flags[once]) return Promise.resolve(false); throw ACT; }   // まだ出ていない仲間のひと言＝重要な会話
        rec.lines.push('@' + id + '\u0001' + [].concat(lines || []).join('\u0002')); return Promise.resolve(true);
      }
    };
    Object.defineProperty(c, 'gold', { get: function () { var d = D(); return d ? d.gold : 0; } });
    ACTS.forEach(function (k) { c[k] = function () { throw ACT; }; });
    return Promise.resolve().then(function () { return npc.talk(c); }).then(function () { return rec; }, function () { return null; });
  };

  // 会話の場所の名前（建物の中なら、出口の先の町の名前）
  CH.placeName = function (m) {
    var MD = root.MAP_DEFS || {}; var def = (m && (m.def || MD[m.id])) || {};
    if (m && m.kind === 'interior' && def.warps && def.warps[0] && MD[def.warps[0].to]) return MD[def.warps[0].to].name || def.name || '';
    return def.name || '';
  };
  // 別の会話（k＝0：地域の話、1：その人の話、2：相場の小話）
  CH.lines = function (npc, m, k) {
    var P = root.CHATTER67; if (!P || !m) return null;
    var region = (root.BattleBG65 && root.BattleBG65.regionOf(m.id)) || 'arcadia';
    var pool = k === 0 ? (P.region[region] || P.region.arcadia) : k === 1 ? (P.role[CH.roleOf(npc)] || P.role.man) : P.tips;
    if (!pool || !pool.length) return null;
    // 同じマップの対象の NPC には、なるべく別の文が当たるようにする（マップごとに始まりの位置をずらし、NPC の並び順で進める）
    var mobs = (m.npcs || []).filter(function (n) { return CH.roleOf(n); }); var idx = Math.max(0, mobs.indexOf(npc));
    var i = (hash(m.id + '#' + k) + idx) % pool.length;
    var place = CH.placeName(m);
    return pool[i].map(function (s) { return s.replace(/\{place\}/g, place || 'この町'); });
  };

  // 話しかけたとき（World.talk から呼ぶ）。対象外なら null（＝いままでどおり npc.talk）
  CH.talk = function (npc, real, m) {
    if (!m || !CH.isMob(npc) || !root.CHATTER67) return null;
    return CH.preview(npc, real).then(function (rec) {
      if (!rec || !rec.lines.length) return npc.talk(real);   // 重要な会話（または何も話さない）→ いままでどおり
      var d = D(); if (!d) return npc.talk(real);
      var st = d.chat || (d.chat = {}); var key = m.id + ':' + npc.id; var sig = hash(rec.lines.join('\u0003')).toString(36);
      var r = st[key]; if (!Array.isArray(r) || r[0] !== sig) r = st[key] = [sig, 0];
      var n = r[1] | 0; r[1] = n + 1;
      if (n === 0) return npc.talk(real);   // いつもの会話（1回目）
      var k = (n - 1) % 4; if (k === 3) return npc.talk(real);   // 3つ話したら、いつもの会話に戻る
      var lines = CH.lines(npc, m, k); if (!lines) return npc.talk(real);
      return rec.name ? real.say(rec.name, lines) : real.msg(lines);
    });
  };

  // ---------- 生活・健康の豆知識おばさん ----------
  CH.aunt = function (c, mapId) {
    var P = root.CHATTER67; var A = P && P.aunts && P.aunts[mapId]; if (!A) return Promise.resolve();
    var d = D(); var st = d.chat || (d.chat = {}); var key = 'aunt:' + mapId; var n = st[key] | 0; st[key] = n + 1;
    var tips = A.tips.map(function (id) { return P.auntTips[id]; }).filter(Boolean); if (!tips.length) return Promise.resolve();
    var tip = tips[n % tips.length].slice();
    if (n === 0) tip = ['あら、旅の人かい。わたしは' + A.name + '。', '暮らしと体の豆知識なら、まかせておくれ。'].concat(tip);
    if (n % tips.length === tips.length - 1) tip = tip.concat(['……わたしの知ってる豆知識は、これでひと回りだよ。また聞きにおいで。']);
    if (n % 3 === 2) tip = tip.concat(['具合が悪いときは、無理をしないで、ちゃんと診てもらうんだよ。']);
    return c.say(A.name, tip);
  };

  root.Chatter = CH;
})(typeof window !== 'undefined' ? window : globalThis);
