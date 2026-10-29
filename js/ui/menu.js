/* =========================================================
   UI / Menu : メインメニュー（ステータス・道具・装備・特技・仲間・クエスト・図鑑・記録・セーブ・設定）
   ========================================================= */
(function (root) {
  'use strict';

  var Win = root.Win, State = root.State, ITEMS = root.ITEMS, SKILLS = root.SKILLS, JOBS = root.JOBS, Actors = root.Actors, World = root.World, QUESTS = root.QUESTS, ENEMIES = root.ENEMIES, COMPANIONS = root.COMPANIONS, Combat = root.Combat;
  var esc = Win.esc;
  var Menu = {};

  Menu.open = async function () {
    if (World.busy) return; World.busy = true;
    try {
      while (true) {
        var d = State.data;
        var i = await Win.list([{ label: 'ステータス' }, { label: 'どうぐ' }, { label: 'そうび' }, { label: 'じゅもん・とくぎ' }, { label: 'なかま' }, { label: 'クエスト' }, { label: '図鑑' }, { label: 'トレード記録' }, { label: 'セーブ' }, { label: '設定' }], { title: 'メニュー　' + d.gold + 'G　' + World.map.name, cls: 'main-menu' });
        if (i < 0) break;
        if (i === 0) await Menu.status();
        else if (i === 1) await Menu.items();
        else if (i === 2) await Menu.equip();
        else if (i === 3) await Menu.skills();
        else if (i === 4) await Menu.party();
        else if (i === 5) await Menu.quests();
        else if (i === 6) await Menu.encyclopedia();
        else if (i === 7) await root.TradeUI.showRecord();
        else if (i === 8) await Menu.save();
        else if (i === 9) { var r = await Menu.settings(); if (r === 'title') return; }
      }
    } catch (e) { root.Engine.onError(e); }
    World.busy = false; World.updateHud(); State.autosave();
  };

  async function pickActor(title, includeDead) {
    var list = State.partyActors().filter(function (a) { return includeDead || !a.dead; });
    var i = await Win.list(list.map(function (a) { var s = Actors.stats(a); return { label: a.name, right: JOBS[a.job].name + ' Lv' + a.level, sub: 'HP ' + a.hp + '/' + s.maxHp + '  MP ' + a.mp + '/' + s.maxMp + (a.dead ? '  戦闘不能' : '') }; }), { title: title });
    return i < 0 ? null : list[i];
  }

  Menu.status = async function () {
    var a = await pickActor('ステータスを見る', true); if (!a) return;
    var s = Actors.stats(a); var j = JOBS[a.job];
    var eq = Object.keys(a.equip).map(function (slot) { return ({ weapon: '武器', armor: '鎧', shield: '盾', head: '頭', acc: '装飾' })[slot] + '：' + (a.equip[slot] ? ITEMS[a.equip[slot]].name : '―'); }).join('<br>');
    var jl = Object.keys(a.jobLevels).map(function (k) { return JOBS[k].name + 'Lv' + a.jobLevels[k]; }).join('・');
    await Win.panel('<div class="rw-title">' + esc(a.name) + '　' + esc(j.name) + ' Lv' + a.level + '</div><div class="stat-grid"><div>HP<b>' + a.hp + '/' + s.maxHp + '</b></div><div>MP<b>' + a.mp + '/' + s.maxMp + '</b></div><div>攻撃<b>' + s.atk + '</b></div><div>防御<b>' + s.def + '</b></div><div>素早さ<b>' + s.agi + '</b></div><div>魔力<b>' + s.mag + '</b></div></div><div class="muted small">次のレベルまで ' + (Actors.expForLevel(a.level) - a.exp) + '　状態：' + (a.dead ? '戦闘不能' : Object.keys(a.status).map(function (k) { return Combat.STATUS_NAME[k]; }).join('・') || '正常') + '</div><div class="muted small">固有：' + esc(j.trait) + '　役割：' + esc(j.role) + '</div><h3>装備</h3><div>' + eq + '</div><div class="muted small">職業レベル：' + jl + '</div>');
  };

  Menu.items = async function () {
    while (true) {
      var d = State.data; var ids = Object.keys(d.inventory).filter(function (id) { return ITEMS[id]; });
      ids.sort(function (a, b) { var ca = ITEMS[a].cat, cb = ITEMS[b].cat; return ca === cb ? 0 : ca === 'consumable' ? -1 : cb === 'consumable' ? 1 : ca === 'key' ? 1 : cb === 'key' ? -1 : 0; });
      var i = await Win.list(ids.map(function (id) { var it = ITEMS[id]; return { label: it.name, right: '×' + d.inventory[id], sub: it.desc || '' }; }), { title: 'どうぐ' });
      if (i < 0) return;
      var it = ITEMS[ids[i]];
      if (it.cat === 'consumable') {
        if (it.battleOnly) { await Win.message(['戦闘中にしか使えない。']); continue; }
        var ef = it.effect;
        if (ef.warpTown) { var a0 = await Win.choice(it.name + 'を使って最後に泊まった町へ戻る？', ['使う', 'やめる']); if (a0 === 0) { State.addItem(it.id, -1); var li = d.lastInn; await Win.message(['翼が光り、体がふわりと浮いた……']); World.enterMap(li.map, li.x, li.y, 'down'); return; } continue; }
        if (ef.all) { if (World.map.kind === 'town' || World.map.kind === 'interior') { await Win.message(['ここでは使えない（フィールドやダンジョンで使う）。']); continue; } State.addItem(it.id, -1); State.partyActors().forEach(function (a) { if (!a.dead) { var s = Actors.stats(a); a.hp = s.maxHp; a.mp = s.maxMp; } }); await Win.message(['テントを張って休んだ。全員のHPとMPが回復した！']); continue; }
        var target = await pickActor(it.name + 'を誰に使う？', !!ef.revive); if (!target) continue;
        var s = Actors.stats(target); var lines = [];
        if (ef.revive) { if (!target.dead) { await Win.message(['効果がない。']); continue; } target.dead = false; target.hp = Math.max(1, Math.round(s.maxHp * ef.revive)); target.status = {}; lines.push(target.name + 'が復活した！'); }
        else if (target.dead) { await Win.message(['倒れている仲間には効果がない。']); continue; }
        if (ef.hp) { var bh = target.hp; target.hp = Math.min(s.maxHp, target.hp + ef.hp); lines.push(target.name + 'のHPが' + (target.hp - bh) + '回復した'); }
        if (ef.mp) { var bm = target.mp; target.mp = Math.min(s.maxMp, target.mp + ef.mp); lines.push(target.name + 'のMPが' + (target.mp - bm) + '回復した'); }
        if (ef.cure) { var cured = []; ef.cure.forEach(function (c) { if (target.status[c]) { delete target.status[c]; cured.push(Combat.STATUS_NAME[c]); } }); lines.push(cured.length ? target.name + 'の' + cured.join('・') + 'が治った' : '状態異常はなかった'); }
        State.addItem(it.id, -1); if (root.Audio) root.Audio.sfx('heal');
        await Win.message(lines); World.updateHud();
      } else if (it.cat === 'weapon' || it.cat === 'armor') {
        var cands = State.partyActors().filter(function (x) { return Actors.canEquip(x, it.id); });
        if (!cands.length) { await Win.message(['誰も装備できない。']); continue; }
        var ci = await Win.choice(it.name + 'を誰が装備する？', cands.map(function (x) { return x.name; }).concat(['やめる'])); if (ci < 0 || ci >= cands.length) continue;
        root.Services.equipItem(cands[ci], it.id); await Win.message([cands[ci].name + 'は' + it.name + 'を装備した。']);
      } else await Win.message([it.desc]);
    }
  };

  Menu.equip = async function () {
    var a = await pickActor('装備を変える', true); if (!a) return;
    while (true) {
      var slots = ['weapon', 'armor', 'shield', 'head', 'acc']; var names = { weapon: '武器', armor: '鎧', shield: '盾', head: '頭', acc: '装飾' };
      var s = Actors.stats(a);
      var i = await Win.list(slots.map(function (sl) { return { label: names[sl], right: a.equip[sl] ? ITEMS[a.equip[sl]].name : '―' }; }), { title: a.name + 'の装備　攻' + s.atk + ' 防' + s.def + ' 速' + s.agi + ' 魔' + s.mag });
      if (i < 0) return;
      var slot = slots[i]; var inv = State.data.inventory;
      var cands = Object.keys(inv).filter(function (id) { return Actors.slotOf(id) === slot && Actors.canEquip(a, id); });
      var opts = cands.map(function (id) { var it = ITEMS[id]; var key = it.cat === 'weapon' ? 'atk' : 'def'; var cur = a.equip[slot] ? ITEMS[a.equip[slot]][key] || 0 : 0; var diff = (it[key] || 0) - cur; return { label: it.name, right: (diff >= 0 ? '+' : '') + diff, sub: it.desc }; });
      if (a.equip[slot]) opts.push({ label: 'はずす', right: '' });
      if (!opts.length) { await Win.message(['装備できるものがない。']); continue; }
      var k = await Win.list(opts, { title: names[slot] + 'を選ぶ' }); if (k < 0) continue;
      if (k >= cands.length) { State.addItem(a.equip[slot], 1); a.equip[slot] = null; continue; }
      root.Services.equipItem(a, cands[k]); if (root.Audio) root.Audio.sfx('equip');
    }
  };

  Menu.skills = async function () {
    var a = await pickActor('じゅもん・とくぎを見る', true); if (!a) return;
    var list = a.skills.filter(function (s) { return SKILLS[s]; });
    if (!list.length) { await Win.message([a.name + 'はまだ特技を覚えていない。']); return; }
    await Win.list(list.map(function (s) { var sk = SKILLS[s]; return { label: sk.name, right: 'MP' + sk.mp, sub: sk.desc }; }), { title: a.name + 'の特技' });
  };

  Menu.party = async function () {
    var d = State.data;
    var ids = ['hero'].concat(Object.keys(d.companions));
    var i = await Win.list(ids.map(function (id) { var a = State.actor(id); var inP = d.party.indexOf(id) >= 0; return { label: (inP ? '● ' : '○ ') + a.name, right: JOBS[a.job].name + ' Lv' + a.level, sub: (inP ? '戦闘メンバー' : '待機中（酒場で入れ替え）') }; }), { title: 'なかま', info: function (k) { var c = COMPANIONS[ids[k]]; return c ? '<div>' + esc(c.bio) + '</div><div class="muted small">' + esc(c.background) + '　性格：' + esc(c.personality) + '</div>' : '<div class="muted">主人公。相場の波を読む力を持つ。</div>'; } });
    if (i < 0) return;
    if (i === 0) return;
    // 並び替え（先頭以外）
    var id = ids[i]; if (d.party.indexOf(id) < 0) { await Win.message(['待機メンバーの入れ替えは酒場で行える。']); return; }
    var pos = d.party.indexOf(id);
    var c = await Win.choice(State.actor(id).name + 'の並び', ['前へ', '後ろへ', 'やめる']);
    if (c === 0 && pos > 1) { d.party.splice(pos, 1); d.party.splice(pos - 1, 0, id); }
    if (c === 1 && pos < d.party.length - 1) { d.party.splice(pos, 1); d.party.splice(pos + 1, 0, id); }
  };

  Menu.quests = async function () {
    var d = State.data; var ids = Object.keys(d.quests);
    if (!ids.length) { await Win.message(['受注しているクエストはない。']); return; }
    ids.sort(function (a, b) { var sa = d.quests[a].state === 'done' ? 1 : 0, sb = d.quests[b].state === 'done' ? 1 : 0; return sa - sb; });
    await Win.list(ids.map(function (id) { var q = QUESTS[id]; var st = d.quests[id]; return { label: (q.main ? '【メイン】' : '【サブ】') + q.title, right: st.state === 'done' ? '達成' : (q.counter ? (d.counters[q.counter] || 0) + '/' + q.need : '進行中'), sub: q.desc, cls: st.state === 'done' ? 'done' : '' }; }), { title: 'クエスト' });
  };

  /* ---------- モンスター図鑑 ---------- */
  var EL = { fire: '炎', ice: '氷', thunder: '雷', wind: '風', light: '光', dark: '闇', none: '物理' };
  Menu.bestiary = async function () {
    var d = State.data; var all = root.ENEMY_LIST;
    var ids = all.filter(function (id) { return ENEMIES[id].region !== 'future' || d.bestiary[id]; });
    var seen = ids.filter(function (id) { return d.bestiary[id]; });
    var defeated = ids.filter(function (id) { return d.bestiary[id] && d.bestiary[id].defeated > 0; });
    var pct = Math.round(seen.length / ids.length * 100);
    var rows = ids.map(function (id, n) {
      var e = ENEMIES[id]; var b = d.bestiary[id];
      if (!b) return '<div class="bs-row unknown"><div class="bs-no">' + (n + 1) + '</div><div class="bs-img"></div><div class="bs-body"><div class="bs-name">？？？</div><div class="bs-sub muted">未発見　' + esc(e.area) + '</div></div></div>';
      var kills = b.defeated || 0; var known = kills > 0 || b.scanned;
      var weak = Object.keys(e.resist).filter(function (k) { return e.resist[k] > 1; }).map(function (k) { return EL[k] || k; });
      var res = Object.keys(e.resist).filter(function (k) { return e.resist[k] < 1; }).map(function (k) { return (EL[k] || k) + (e.resist[k] === 0 ? '無効' : ''); });
      var drops = e.drops.map(function (dr) { return ITEMS[dr.item] ? ITEMS[dr.item].name : dr.item; });
      var detail = '';
      if (known) detail += '<div class="bs-line">弱点：' + (weak.length ? weak.join('・') : 'なし') + '　耐性：' + (res.length ? res.join('・') : 'なし') + '</div>';
      if (b.scanned || kills >= 3) detail += '<div class="bs-line">落とす：' + (drops.length ? drops.join('・') : 'なし') + '</div>';
      else if (known && drops.length) detail += '<div class="bs-line muted">落とす：？？？（3体倒すか「スキャン」で判明）</div>';
      if (b.scanned || kills >= 1) detail += '<div class="bs-line muted">HP ' + e.hp + '　攻 ' + e.atk + '　防 ' + e.def + '　速 ' + e.agi + '　EXP ' + e.exp + '　' + e.gold + 'G</div>';
      if (known && e.desc) detail += '<div class="bs-desc">' + esc(e.desc) + '</div>';
      return '<div class="bs-row' + (e.boss ? ' boss' : '') + '" data-id="' + id + '"><div class="bs-no">' + (n + 1) + '</div><div class="bs-img" data-id="' + id + '"></div><div class="bs-body"><div class="bs-name">' + esc(e.name) + (e.boss ? ' <span class="bs-tag">BOSS</span>' : '') + (e.rare ? ' <span class="bs-tag rare">レア</span>' : '') + '<span class="bs-kills">討伐 ' + kills + '</span></div><div class="bs-sub muted">' + esc(e.family) + '　' + esc(e.area) + '</div>' + detail + '</div></div>';
    }).join('');
    var html = '<div class="rw-title">モンスター図鑑</div><div class="bs-head">発見 ' + seen.length + '/' + ids.length + '（' + pct + '%）　討伐済み ' + defeated.length + '種<div class="bar"><span style="width:' + pct + '%"></span></div></div><div class="bs-list">' + rows + '</div>';
    await Win.panel(html, { cls: 'bestiary', setup: function (node) {
      node.querySelectorAll('.bs-img[data-id]').forEach(function (box) {
        var e = ENEMIES[box.getAttribute('data-id')]; var img;
        if (e.art && root.MonsterArt) img = root.MonsterArt.image(e.art, 1, 0);
        else if (root.Sprites && root.Sprites.has(e.sprite)) { img = document.createElement('canvas'); root.Sprites.draw(img, e.sprite, 3, false); }
        if (!img) return; var c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); c.className = 'bs-canvas'; box.appendChild(c);
      });
    } });
  };

  Menu.encyclopedia = async function () {
    while (true) {
      var i = await Win.choice('図鑑', ['モンスター図鑑', 'アイテム図鑑', '職業一覧', '冒険の記録', 'やめる']);
      if (i < 0 || i === 4) return;
      var d = State.data;
      if (i === 0) { await Menu.bestiary(); }
      else if (i === 1) { var iids = root.ITEM_LIST; await Win.list(iids.map(function (id) { var it = ITEMS[id]; var known = d.inventory[id] || d.flags['seen_item_' + id] || State.partyActors().some(function (a) { return Object.keys(a.equip).some(function (s) { return a.equip[s] === id; }); }); return known ? { label: it.name, right: ({ weapon: '武器', armor: '防具', consumable: '道具', key: '大事なもの' })[it.cat], sub: it.desc || '' } : { label: '？？？', disabled: true, sub: '未入手' }; }), { title: 'アイテム図鑑' }); }
      else if (i === 2) { await Win.list(root.JOB_LIST.map(function (j) { var J = JOBS[j]; return { label: J.name, right: J.role, sub: J.desc + '　固有：' + J.trait }; }), { title: '職業一覧' }); }
      else if (i === 3) { var ch = root.STORY_CHAPTERS.filter(function (c) { return !c.flag || d.flags[c.flag]; }); var cur = ch[ch.length - 1]; await Win.panel('<div class="rw-title">冒険の記録</div><div>現在：' + esc(cur.title) + '</div><div class="muted small">歩数 ' + d.steps + '　訪れた場所 ' + Object.keys(d.visited).length + '　開けた宝箱 ' + Object.keys(d.chests).length + '　仲間 ' + (Object.keys(d.companions).length + 1) + '人　預金 ' + d.bank + 'G</div><div class="muted small">クリスタルの欠片：' + (d.inventory.crystal_shard || 0) + (d.flags.shard_returned ? '（王に届けた）' : '') + '</div>'); }
    }
  };

  Menu.save = async function () {
    var slots = [1, 2, 3].map(function (s) { var info = State.slotInfo(s); return { label: 'スロット' + s, right: info ? info.name + ' Lv' + info.level : '（空き）', sub: info ? (root.MAP_DEFS[info.map] ? root.MAP_DEFS[info.map].name : info.map) + '　' + new Date(info.savedAt).toLocaleString('ja-JP') : '' }; });
    var i = await Win.list(slots, { title: 'セーブ（オートセーブも常時動作）' });
    if (i < 0) return;
    var ok = State.save(i + 1);
    await Win.message([ok ? 'スロット' + (i + 1) + 'にセーブした。' : 'セーブに失敗した（ブラウザの保存領域を確認してください）。']);
  };

  Menu.settings = async function () {
    while (true) {
      var st = State.data.settings;
      var i = await Win.list([
        { label: '音（BGM・効果音）', right: st.mute ? 'OFF' : 'ON' }, { label: 'BGM音量', right: Math.round(st.bgm * 100) + '%' }, { label: '効果音音量', right: Math.round(st.se * 100) + '%' },
        { label: '文字速度', right: ({ normal: 'ふつう', fast: 'はやい', instant: '一瞬' })[st.textSpeed] }, { label: '戦闘速度', right: st.battleSpeed === 'fast' ? 'はやい' : 'ふつう' },
        { label: 'チャート試練のリスク%', right: st.riskPercent + '%' }, { label: 'ZigZag表示', right: st.showZigzag ? 'ON' : 'OFF' },
        { label: 'データ管理（書き出し・読み込み・初期化）' }, { label: 'タイトルに戻る' }
      ], { title: '設定' });
      if (i < 0) return;
      if (i === 0) { st.mute = !st.mute; if (root.Audio) root.Audio.apply(); }
      if (i === 1) { st.bgm = Math.round(((st.bgm + 0.25) % 1.25) * 100) / 100; if (st.bgm > 1) st.bgm = 0; if (root.Audio) root.Audio.apply(); }
      if (i === 2) { st.se = Math.round(((st.se + 0.25) % 1.25) * 100) / 100; if (st.se > 1) st.se = 0; if (root.Audio) root.Audio.apply(); }
      if (i === 3) { st.textSpeed = ({ normal: 'fast', fast: 'instant', instant: 'normal' })[st.textSpeed]; }
      if (i === 4) { st.battleSpeed = st.battleSpeed === 'fast' ? 'normal' : 'fast'; }
      if (i === 5) { var ro = root.CONFIG.risk.riskOptions; st.riskPercent = ro[(ro.indexOf(st.riskPercent) + 1) % ro.length]; }
      if (i === 6) { st.showZigzag = !st.showZigzag; }
      if (i === 7) { await Menu.dataManagement(); }
      if (i === 8) { var c = await Win.choice('タイトルに戻る？（オートセーブ済み）', ['戻る', 'やめる']); if (c === 0) { State.autosave(); root.Title.show(); return 'title'; } }
      State.autosave();
    }
  };

  Menu.dataManagement = async function () {
    while (true) {
      var i = await Win.choice('データ管理', ['セーブデータをJSONで書き出す', 'JSONを読み込む', 'スロットを削除', 'やめる']);
      if (i < 0 || i === 3) return;
      if (i === 0) { var blob = new Blob([State.exportJSON()], { type: 'application/json' }); var u = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = u; a.download = 'mochipoyo-trade-quest-save.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); await Win.message(['書き出した。ブラウザの保存データを消すと進行が失われるので、JSONを保管しておこう。']); }
      if (i === 1) { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; var text = await new Promise(function (res) { inp.onchange = function () { var f = inp.files[0]; if (!f) return res(null); var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsText(f); }; inp.click(); setTimeout(function () { res(null); }, 60000); }); if (!text) continue; try { var dd = State.importJSON(text); State.data = dd; State.autosave(); await Win.message(['読み込んだ。マップを再読み込みする。']); World.start(); return; } catch (e) { await Win.message(['読み込みに失敗：' + e.message]); } }
      if (i === 2) { var s = await Win.choice('どのスロットを削除する？', ['スロット1', 'スロット2', 'スロット3', 'やめる']); if (s >= 0 && s < 3) { var c = await Win.choice('本当に削除する？（元に戻せない）', ['削除', 'やめる']); if (c === 0) { State.deleteSlot(s + 1); await Win.message(['削除した。']); } } }
    }
  };

  root.Menu = Menu;
})(typeof window !== 'undefined' ? window : globalThis);
