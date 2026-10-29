/* =========================================================
   UI / Battle : 戦闘シーン（描画・コマンド入力・演出）
   ロジックは rpg/combat.js。ここはイベントの再生とUI。
   ========================================================= */
(function (root) {
  'use strict';

  var Engine = root.Engine, Win = root.Win, State = root.State, Combat = root.Combat, SKILLS = root.SKILLS, ITEMS = root.ITEMS, Actors = root.Actors, Sprites = root.Sprites, JOBS = root.JOBS, ENEMIES = root.ENEMIES;
  var esc = Win.esc;

  var BattleUI = { battle: null, scene: null };

  var BG = { field: ['#2b5a8a', '#3f9a3f'], town: ['#2b5a8a', '#4a7a4a'], dungeon: ['#1a1a2a', '#3a3a4a'], interior: ['#2a2a3a', '#5a4a3a'] };

  function BattleScene(b, kind) { this.b = b; this.kind = kind; this.pops = []; this.shake = {}; this.flash = 0; this.anims = []; this.t = 0; }
  BattleScene.prototype.update = function (dt) { this.t += dt; this.pops = this.pops.filter(function (p) { p.t += dt; return p.t < 900; }); this.anims = this.anims.filter(function (a) { a.t += dt; return a.t < a.dur; }); if (this.flash > 0) this.flash -= dt; };
  BattleScene.prototype.draw = function (ctx) {
    var W = ctx.canvas.width, H = ctx.canvas.height; var b = this.b;
    var g = ctx.createLinearGradient(0, 0, 0, H); var cols = BG[this.kind] || BG.field; g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, H * 0.62, W, H * 0.38);
    // 敵
    var alive = b.enemies; var n = alive.length; var slot = W / (n + 1);
    var self = this;
    alive.forEach(function (e, i) {
      if (e.dead && !self.anims.some(function (a) { return a.type === 'die' && a.idx === i; })) return;
      var scale = e.boss ? 9 : 6; var size = 16 * scale;
      var x = slot * (i + 1) - size / 2, y = H * 0.56 - size;
      var sh = self.shake[i]; if (sh && sh > 0) { x += Math.sin(sh / 20) * 6; self.shake[i] = sh - 16; }
      var die = self.anims.filter(function (a) { return a.type === 'die' && a.idx === i; })[0];
      ctx.save();
      if (die) ctx.globalAlpha = 1 - die.t / die.dur;
      if (e.status.sleep) ctx.globalAlpha *= 0.7;
      ctx.drawImage(enemyImage(e.sprite, scale), Math.round(x), Math.round(y + Math.sin(self.t / 500 + i) * 2));
      ctx.restore();
      // HPバー
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y + size + 4, size, 6); ctx.fillStyle = e.hp / e.maxHp > 0.3 ? '#4cc38a' : '#e5484d'; ctx.fillRect(x, y + size + 4, size * e.hp / e.maxHp, 6);
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.name + (e.exposed ? '（弱点露出）' : '') + (Object.keys(e.status).map(function (k) { return Combat.STATUS_NAME[k]; }).join('') ? '［' + Object.keys(e.status).map(function (k) { return Combat.STATUS_NAME[k]; }).join('') + '］' : ''), x + size / 2, y - 6);
      // エフェクト
      self.anims.filter(function (a) { return a.side === 'enemy' && a.idx === i && a.type === 'fx'; }).forEach(function (a) { drawFx(ctx, a, x + size / 2, y + size / 2); });
    });
    // 味方側のエフェクト（画面下部）
    this.anims.filter(function (a) { return a.side === 'party' && a.type === 'fx'; }).forEach(function (a) { var i = Math.max(0, b.party.map(function (p) { return p.id; }).indexOf(a.id)); drawFx(ctx, a, (W / (b.party.length + 1)) * (i + 1), H * 0.8); });
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, this.flash / 200) + ')'; ctx.fillRect(0, 0, W, H); }
    // ダメージ数値
    this.pops.forEach(function (p) { var i = p.idx; var x = p.side === 'enemy' ? slot * (i + 1) : (W / (b.party.length + 1)) * (i + 1); var y = p.side === 'enemy' ? H * 0.3 : H * 0.75; y -= p.t / 12; ctx.font = 'bold ' + (p.crit ? 26 : 20) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(p.text, x, y); ctx.fillStyle = p.color; ctx.fillText(p.text, x, y); });
  };
  var imgCache = {};
  function enemyImage(key, scale) { var k = key + ':' + scale; if (imgCache[k]) return imgCache[k]; var c = document.createElement('canvas'); Sprites.draw(c, key, scale, false); imgCache[k] = c; return c; }
  function drawFx(ctx, a, cx, cy) {
    var p = a.t / a.dur; ctx.save(); ctx.globalAlpha = 1 - p;
    var kind = a.anim;
    if (kind === 'slash') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 40 + p * 20, cy - 40); ctx.lineTo(cx + 40 - p * 20, cy + 40); ctx.stroke(); ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(cx + 30, cy - 30); ctx.lineTo(cx - 30, cy + 30); ctx.stroke(); }
    else if (kind === 'hit') { ctx.fillStyle = '#fff'; for (var i = 0; i < 6; i++) { var ang = i * Math.PI / 3; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * p * 40, cy + Math.sin(ang) * p * 40, 5, 0, Math.PI * 2); ctx.fill(); } }
    else if (kind === 'fire') { ctx.fillStyle = '#ff6a2a'; for (var j = 0; j < 8; j++) { ctx.beginPath(); ctx.arc(cx + Math.sin(j * 1.3 + p * 6) * 25, cy - p * 60 + Math.cos(j) * 20, 10 - p * 8, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, cy - p * 30, 14 - p * 10, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'ice') { ctx.strokeStyle = '#9fe0ff'; ctx.lineWidth = 3; for (var k2 = 0; k2 < 6; k2++) { var a2 = k2 * Math.PI / 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a2) * 40 * p, cy + Math.sin(a2) * 40 * p); ctx.stroke(); } }
    else if (kind === 'thunder') { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + 10, cy - 120); ctx.lineTo(cx - 10, cy - 40); ctx.lineTo(cx + 10, cy - 30); ctx.lineTo(cx - 5, cy + 20); ctx.stroke(); }
    else if (kind === 'wind') { ctx.strokeStyle = '#9fe0a8'; ctx.lineWidth = 3; for (var w = 0; w < 3; w++) { ctx.beginPath(); ctx.arc(cx, cy, 20 + w * 15 + p * 30, p * 6 + w, p * 6 + w + 2); ctx.stroke(); } }
    else if (kind === 'light') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (var l = 0; l < 8; l++) { var al = l * Math.PI / 4 + p; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(al) * 60 * p, cy + Math.sin(al) * 60 * p); ctx.stroke(); } }
    else if (kind === 'dark') { ctx.fillStyle = '#5a1a8a'; ctx.beginPath(); ctx.arc(cx, cy, 10 + p * 40, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'heal') { ctx.fillStyle = '#7fe3a5'; for (var h = 0; h < 6; h++) { ctx.beginPath(); ctx.arc(cx + Math.cos(h) * 25, cy - p * 50 + Math.sin(h * 2) * 10, 4, 0, Math.PI * 2); ctx.fill(); } }
    else if (kind === 'buff') { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 20 + p * 30, 0, Math.PI * 2); ctx.stroke(); }
    else if (kind === 'arrow') { ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 60 + p * 60, cy + 60 - p * 60); ctx.lineTo(cx - 40 + p * 60, cy + 40 - p * 60); ctx.stroke(); }
    else if (kind === 'poison') { ctx.fillStyle = '#8a5ad0'; ctx.beginPath(); ctx.arc(cx, cy - p * 30, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  /* ---------- 開始 ---------- */
  BattleUI.start = async function (enemyIds, opts) {
    opts = opts || {};
    var d = State.data; var party = State.partyActors();
    var b = Combat.create(enemyIds, party, opts);
    var mapKind = root.World.map ? root.World.map.kind : 'field';
    var scene = new BattleScene(b, mapKind); BattleUI.battle = b; BattleUI.scene = scene;
    Engine.push(scene);
    if (root.Audio) root.Audio.playBgm(opts.boss ? 'boss' : 'battle');
    var pw = document.getElementById('battle-party'); pw.classList.add('on');
    var mw = document.getElementById('battle-msg'); mw.classList.add('on'); mw.textContent = '';
    renderParty(b);
    var names = b.enemies.map(function (e) { return e.name; });
    await bmsg(uniq(names).join('、') + 'が現れた！', 700);
    var result = null;
    while (b.state === 'command') {
      var cmds = await collectCommands(b);
      if (cmds === null) continue;
      var ev = Combat.runTurn(b, cmds);
      await playEvents(b, ev, scene);
      renderParty(b);
    }
    result = b.state;
    if (result === 'won') {
      if (root.Audio) root.Audio.playJingle('victory');
      await bmsg('戦いに勝利した！', 600);
      var ups = Combat.distribute(b); var r = b.result;
      var lines = ['経験値' + r.exp + 'と' + r.gold + 'Gを手に入れた！'];
      r.drops.forEach(function (id) { lines.push(ITEMS[id].name + 'を手に入れた！'); });
      ups.forEach(function (u) { u.ups.forEach(function (x) { lines.push(u.actor.name + 'はレベル' + x.level + 'に上がった！' + (x.newSkills.length ? ' ' + x.newSkills.map(function (s) { return SKILLS[s].name; }).join('・') + 'を覚えた！' : '')); }); });
      renderParty(b);
      if (ups.length && root.Audio) root.Audio.playJingle('levelup');
      await Win.message(lines);
    } else if (result === 'lost') { await bmsg('全滅してしまった……', 900); }
    else if (result === 'escaped') { await Win.sleep(300); }
    b.party.forEach(Actors.clearBattleState);
    pw.classList.remove('on'); mw.classList.remove('on');
    Engine.pop();
    if (root.Audio) root.Audio.playBgm(root.World.map ? (root.World.map.def.bgm || 'field') : 'field');
    State.autosave();
    return result;
  };
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }).map(function (x) { return x.replace(/[A-D]$/, ''); }).filter(function (x, i, arr) { return arr.indexOf(x) === i; }); }

  function renderParty(b) {
    var pw = document.getElementById('battle-party');
    pw.innerHTML = b.party.map(function (a) { var s = Actors.stats(a); var st = Object.keys(a.status).map(function (k) { return Combat.STATUS_NAME[k]; }).join(''); return '<div class="bp ' + (a.dead ? 'dead' : a.hp < s.maxHp * 0.3 ? 'low' : '') + '" data-id="' + a.id + '"><div class="bp-name">' + esc(a.name) + (st ? '<span class="st">' + esc(st) + '</span>' : '') + (a.defending ? '<span class="st">防</span>' : '') + '</div><div class="bp-hp">HP <b>' + a.hp + '</b>/' + s.maxHp + '</div><div class="bar hp"><span style="width:' + (a.hp / s.maxHp * 100) + '%"></span></div><div class="bp-mp">MP ' + a.mp + '/' + s.maxMp + '</div></div>'; }).join('');
  }
  function bmsg(text, ms) { var mw = document.getElementById('battle-msg'); mw.textContent = text; var speed = State.data.settings.battleSpeed; return Win.sleep(speed === 'fast' ? Math.round((ms || 500) * 0.45) : (ms || 500)); }

  /* ---------- コマンド入力 ---------- */
  async function collectCommands(b) {
    var cmds = []; var alive = b.party.filter(function (a) { return !a.dead; });
    for (var i = 0; i < alive.length; i++) {
      var a = alive[i];
      if (a.status.sleep || (a.status.paralyze && Math.random() < 0.3)) { cmds.push({ actorId: a.id, type: 'defend' }); continue; }
      highlight(a.id);
      var c = await commandFor(b, a);
      if (c === 'back') { if (i > 0) { i -= 2; cmds.pop(); continue; } else { i = -1; cmds = []; continue; } }
      cmds.push(c);
    }
    highlight(null);
    return cmds;
  }
  function highlight(id) { document.querySelectorAll('#battle-party .bp').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-id') === id); }); }

  async function commandFor(b, a) {
    while (true) {
      var skills = a.skills.filter(function (s) { return SKILLS[s]; });
      var opts = [{ label: 'たたかう' }, { label: 'じゅもん・とくぎ', disabled: !skills.length }, { label: 'どうぐ' }, { label: 'ぼうぎょ' }, { label: 'にげる', disabled: !b.canEscape }];
      var sel = await Win.list(opts, { title: a.name + 'の行動', cancel: true, cls: 'cmd-list' });
      if (sel < 0) return 'back';
      if (sel === 0) { var t = await pickEnemy(b); if (t < 0) continue; return { actorId: a.id, type: 'attack', target: { side: 'enemy', idx: t } }; }
      if (sel === 1) {
        var items = skills.map(function (s) { var sk = SKILLS[s]; var cost = a.job === 'sage' ? Math.ceil(sk.mp * 0.8) : sk.mp; return { label: sk.name, right: 'MP' + cost + (sk.gold ? '/' + sk.gold + 'G' : ''), sub: sk.desc, disabled: a.mp < cost }; });
        var si = await Win.list(items, { title: 'じゅもん・とくぎ' }); if (si < 0) continue;
        var sk = SKILLS[skills[si]]; var target = null;
        if (sk.target === 'enemy') { var te = await pickEnemy(b); if (te < 0) continue; target = { side: 'enemy', idx: te }; }
        else if (sk.target === 'ally') { var ta = await pickAlly(b, false); if (!ta) continue; target = { side: 'party', id: ta }; }
        else if (sk.target === 'dead_ally') { var td = await pickAlly(b, true); if (!td) continue; target = { side: 'party', id: td }; }
        return { actorId: a.id, type: 'skill', skillId: sk.id, target: target };
      }
      if (sel === 2) {
        var inv = State.data.inventory; var ids = Object.keys(inv).filter(function (id) { return ITEMS[id] && ITEMS[id].cat === 'consumable' && !ITEMS[id].fieldOnly; });
        if (!ids.length) { await Win.message(['使える道具がない。']); continue; }
        var ii = await Win.list(ids.map(function (id) { return { label: ITEMS[id].name, right: '×' + inv[id], sub: ITEMS[id].desc }; }), { title: 'どうぐ' }); if (ii < 0) continue;
        var it = ITEMS[ids[ii]]; var tg = null;
        if (!it.effect.damage) { var tid = await pickAlly(b, !!it.effect.revive); if (!tid) continue; tg = { side: 'party', id: tid }; }
        return { actorId: a.id, type: 'item', itemId: it.id, target: tg };
      }
      if (sel === 3) return { actorId: a.id, type: 'defend' };
      if (sel === 4) return { actorId: a.id, type: 'escape' };
    }
  }
  async function pickEnemy(b) {
    var alive = b.enemies.filter(function (e) { return !e.dead; });
    if (alive.length === 1) return alive[0].idx;
    var i = await Win.list(alive.map(function (e) { return { label: e.name, right: 'HP ' + e.hp + '/' + e.maxHp }; }), { title: '対象' });
    return i < 0 ? -1 : alive[i].idx;
  }
  async function pickAlly(b, dead) {
    var list = b.party.filter(function (a) { return dead ? a.dead : !a.dead; });
    if (!list.length) { await Win.message([dead ? '倒れている仲間はいない。' : '対象がいない。']); return null; }
    var i = await Win.list(list.map(function (a) { var s = Actors.stats(a); return { label: a.name, right: 'HP ' + a.hp + '/' + s.maxHp }; }), { title: '対象' });
    return i < 0 ? null : list[i].id;
  }

  /* ---------- イベント再生 ---------- */
  async function playEvents(b, ev, scene) {
    var fast = State.data.settings.battleSpeed === 'fast';
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.type === 'msg') { await bmsg(e.text, 420); }
      else if (e.type === 'damage') {
        if (e.side === 'enemy') { scene.shake[e.idx] = 240; scene.anims.push({ type: 'fx', side: 'enemy', idx: e.idx, anim: e.anim || 'hit', t: 0, dur: 420 }); scene.pops.push({ side: 'enemy', idx: e.idx, text: e.value === 0 ? 'MISS' : String(e.value), color: e.crit ? '#ffd24a' : e.weak ? '#ff8a3a' : '#fff', crit: e.crit, t: 0 }); if (root.Audio) root.Audio.sfx(e.crit ? 'crit' : 'hit'); }
        else { var idx = b.party.map(function (p) { return p.id; }).indexOf(e.id); scene.pops.push({ side: 'party', idx: idx, text: String(e.value), color: '#ffb0b0', t: 0 }); scene.flash = 120; scene.anims.push({ type: 'fx', side: 'party', id: e.id, anim: e.anim || 'hit', t: 0, dur: 400 }); if (root.Audio) root.Audio.sfx('hurt'); var el = document.querySelector('#battle-party .bp[data-id="' + e.id + '"]'); if (el) { el.classList.add('shake'); setTimeout(function () { el.classList.remove('shake'); }, 400); } }
        renderParty(b); await Win.sleep(fast ? 120 : 260);
      }
      else if (e.type === 'heal') { var hi = b.party.map(function (p) { return p.id; }).indexOf(e.id); scene.pops.push({ side: 'party', idx: hi, text: '+' + e.value, color: '#7fe3a5', t: 0 }); scene.anims.push({ type: 'fx', side: 'party', id: e.id, anim: 'heal', t: 0, dur: 500 }); if (root.Audio) root.Audio.sfx('heal'); renderParty(b); await Win.sleep(fast ? 120 : 260); }
      else if (e.type === 'anim') { if (e.side === 'enemy') scene.anims.push({ type: 'fx', side: 'enemy', idx: e.idx, anim: e.anim, t: 0, dur: 450 }); else if (e.target === 'self' || e.target === 'ally' || e.target === 'allies' || e.target === 'dead_ally') scene.anims.push({ type: 'fx', side: 'party', id: e.id, anim: e.anim, t: 0, dur: 450 }); if (root.Audio) root.Audio.sfx('magic'); await Win.sleep(fast ? 100 : 220); }
      else if (e.type === 'enemy_dead' || e.type === 'flee') { scene.anims.push({ type: 'die', idx: e.idx, t: 0, dur: 500 }); if (root.Audio) root.Audio.sfx('die'); await Win.sleep(fast ? 200 : 450); }
      else if (e.type === 'actor_dead') { renderParty(b); await Win.sleep(300); }
      else if (e.type === 'revive') { renderParty(b); }
      else if (e.type === 'trial') {
        var enemy = b.enemies[e.idx];
        await bmsg(enemy.name + 'の相場の試練！ チャートを読み、正しい行動を選べ！', 700);
        var scs = enemy.trialScenarios || ['clear_up', 'clear_down', 'range', 'up_pullback', 'down_rally'];
        var res = await root.TradeUI.trial(scs, { title: enemy.name + 'の相場の試練' });
        var ev2 = Combat.applyTrialResult(b, e.idx, res ? res.score : 0);
        await playEvents(b, ev2, scene);
      }
      else if (e.type === 'end') { await Win.sleep(200); }
    }
  }

  root.BattleUI = BattleUI;
})(typeof window !== 'undefined' ? window : globalThis);
