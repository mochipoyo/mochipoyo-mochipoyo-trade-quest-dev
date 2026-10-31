/* =========================================================
   UI / Menu : メインメニュー（ステータス・道具・装備・特技・仲間・クエスト・図鑑・記録・セーブ・設定）
   ========================================================= */
(function (root) {
  'use strict';

  var Win = root.Win, State = root.State, ITEMS = root.ITEMS, SKILLS = root.SKILLS, JOBS = root.JOBS, Actors = root.Actors, World = root.World, QUESTS = root.QUESTS, ENEMIES = root.ENEMIES, COMPANIONS = root.COMPANIONS, Combat = root.Combat;
  var esc = Win.esc;
  var Menu = {};

  Menu.open = async function () {
    if (World.busy) return; World.busy = true; var openMap = false;
    try {
      while (true) {
        var d = State.data;
        var MENU = ['ステータス', 'どうぐ', 'そうび', 'じゅもん・とくぎ', 'なかま', 'クエスト', '次の目的地', '図鑑', 'トレード修行', 'ファストトラベル', 'セーブ', '設定'];   // v6.2「次の目的地」を追加（項目名で振り分け）
        var i = await Win.list(MENU.map(function (l) { return { label: l }; }), { title: 'メニュー　' + d.gold + 'G　' + World.map.name, cls: 'main-menu' });
        if (i < 0) break; var lb = MENU[i];
        if (lb === 'ステータス') await Menu.status();
        else if (lb === 'どうぐ') await Menu.items();
        else if (lb === 'そうび') await Menu.equip();
        else if (lb === 'じゅもん・とくぎ') await Menu.skills();
        else if (lb === 'なかま') await Menu.party();
        else if (lb === 'クエスト') await Menu.quests();
        else if (lb === '次の目的地') { if (await Menu.objective() === 'map') { openMap = true; break; } }
        else if (lb === '図鑑') await Menu.encyclopedia();
        else if (lb === 'トレード修行') await Menu.training();
        else if (lb === 'ファストトラベル') { if (await Menu.travel()) break; }   // v6.1 移動したらメニューを閉じる
        else if (lb === 'セーブ') await Menu.save();
        else if (lb === '設定') { var r = await Menu.settings(); if (r === 'title') return; }
      }
    } catch (e) { root.Engine.onError(e); }
    World.busy = false; World.updateHud(); State.autosave();
    if (openMap && root.Minimap) root.Minimap.openBig();   // v6.2「次の目的地」→「全体マップで見る」
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
    await Win.panel('<div class="rw-title">' + esc(a.name) + '　' + esc(j.name) + ' Lv' + a.level + (a.id === 'hero' && root.Growth ? '　<span class="title-badge">' + esc(root.Growth.title()) + '</span>' : '') + '</div>' + (root.Assets ? root.Assets.portraitTagFor(a, 'portrait status-portrait', 150) : '') + '<div class="stat-grid"><div>HP<b>' + a.hp + '/' + s.maxHp + '</b></div><div>MP<b>' + a.mp + '/' + s.maxMp + '</b></div><div>攻撃<b>' + s.atk + '</b></div><div>防御<b>' + s.def + '</b></div><div>素早さ<b>' + s.agi + '</b></div><div>魔力<b>' + s.mag + '</b></div></div><div class="muted small">次のレベルまで ' + (Actors.expForLevel(a.level) - a.exp) + '　状態：' + (a.dead ? '戦闘不能' : Object.keys(a.status).map(function (k) { return Combat.STATUS_NAME[k]; }).join('・') || '正常') + '</div><div class="muted small">固有：' + esc(j.trait) + '　役割：' + esc(j.role) + '</div><h3>装備</h3><div>' + eq + '</div><div class="muted small">職業レベル：' + jl + '</div>');
  };

  /* ---------- どうぐ（v6.4 ジャンル別・並び替え・使えるものだけ・詳細と装備比較） ---------- */
  var ITEM_SORTS = [{ id: 'kind', name: '種類順' }, { id: 'name', name: '名前順' }, { id: 'count', name: '所持数順' }];
  var TARGET_NAME = { ally: '味方1人', dead_ally: '戦闘不能の味方1人', party: '味方全員', self: '自分', enemies: '敵全体' };
  function itemTarget(it) { if (it.target) return TARGET_NAME[it.target] || ''; var e = it.effect || {}; return e.damage ? '敵全体' : e.revive ? '戦闘不能の味方1人' : e.all ? '味方全員' : e.warpTown ? '全員（移動）' : '味方1人'; }
  function inTown() { return World.map && (World.map.kind === 'town' || World.map.kind === 'interior'); }
  function canUseNow(id) { var it = ITEMS[id]; if (!it || it.cat !== 'consumable' || it.battleOnly) return false; if (it.fieldOnly && inTown() && !it.effect.warpTown) return false; return true; }
  Menu.itemDetail = function (id) {
    var it = ITEMS[id]; if (!it) return ''; var IC = root.ItemCat; var S = root.Services; var d = State.data;
    var g = IC ? IC.GENRES.filter(function (x) { return x.id === IC.of(id); })[0] : null;
    var h = '<div class="it-detail"><div class="it-name">' + esc(it.name) + ' <span class="muted small">' + esc(g ? g.name : '') + '　所持 ' + (d.inventory[id] || 0) + '</span></div>';
    h += '<div>' + esc(it.desc || '') + '</div>';
    if (it.cat === 'consumable') h += '<div class="muted small">使える場面：' + esc(IC.scene(id)) + '　対象：' + esc(itemTarget(it)) + (it.price ? '　値段 ' + it.price + 'G' : '') + '</div>';
    else if (it.cat === 'weapon' || it.cat === 'armor') {
      if (S && S.statLine) h += '<div class="small">' + esc(S.statLine(it)) + '</div>';
      if (S && S.equipJobs) h += '<div class="muted small">装備できる職業：' + esc(S.equipJobs(it).join('・') || 'なし') + '</div>';
      if (S && S.compareInfo) h += '<div class="it-cmp small">' + S.compareInfo(it).replace(/^<div class="muted">[\s\S]*?<\/div>(<div>[\s\S]*?<\/div>)?/, '') + '</div>';
    } else h += '<div class="muted small">' + (it.subcategory === 'material' ? '素材：鍛冶などで使う。使ったり売ったりはできない' : '重要アイテム：使ったり売ったりはできない') + '</div>';
    return h + '</div>';
  };
  Menu.items = async function () {
    var tab = 0, sort = 0, usableOnly = false, initial = 0;
    var IC = root.ItemCat; var G = IC.GENRES;
    while (true) {
      var d = State.data; var all = Object.keys(d.inventory).filter(function (id) { return ITEMS[id]; });
      var order = {}; G.forEach(function (g, i) { order[g.id] = i; });
      var ids = all.filter(function (id) { return G[tab].id === 'all' || IC.of(id) === G[tab].id; });
      if (usableOnly) ids = ids.filter(canUseNow);
      var sid = ITEM_SORTS[sort].id;
      ids.sort(function (a, b) { if (sid === 'name') return ITEMS[a].name.localeCompare(ITEMS[b].name, 'ja'); if (sid === 'count') return (d.inventory[b] || 0) - (d.inventory[a] || 0); return (order[IC.of(a)] - order[IC.of(b)]) || ((ITEMS[a].tier || 0) - (ITEMS[b].tier || 0)); });
      var rows = ids.map(function (id) { var it = ITEMS[id]; return { label: it.name, right: '×' + d.inventory[id], sub: (it.cat === 'consumable' ? (canUseNow(id) ? '' : '【' + IC.scene(id) + '】') : '') + (it.desc || ''), cls: 'g-' + IC.of(id) + (it.cat === 'key' ? ' key' : '') }; });
      if (!rows.length) rows = [{ label: usableOnly ? '（いま使えるものはない）' : '（このジャンルの持ち物はない）', disabled: true }];
      var counts = G.map(function (g) { return g.id === 'all' ? all.length : all.filter(function (id) { return IC.of(id) === g.id; }).length; });
      var r = await Win.list(rows, { title: 'どうぐ', cls: 'items-menu', tabs: G.map(function (g, i) { return { label: g.name, count: counts[i] }; }), tab: tab,
        tools: [{ id: 'sort', label: '並び：' + ITEM_SORTS[sort].name }, { id: 'usable', label: '使えるものだけ', on: usableOnly }],
        initial: Math.min(initial, Math.max(0, ids.length - 1)), info: function (k) { return ids[k] ? Menu.itemDetail(ids[k]) : ''; } });
      if (r === -1) return;
      if (r && typeof r === 'object') { if (r.tab !== undefined) { tab = r.tab; initial = 0; } else if (r.tool === 'sort') sort = (sort + 1) % ITEM_SORTS.length; else if (r.tool === 'usable') usableOnly = !usableOnly; continue; }
      if (!ids.length) continue; initial = r;
      if (await Menu.useItem(ids[r]) === 'warp') return;
    }
  };
  Menu.useItem = async function (id) {
    var d = State.data; var it = ITEMS[id]; if (!it) return;
    if (it.cat === 'consumable') {
      if (it.battleOnly) { await Win.message(['戦闘中にしか使えない。']); return; }
      var ef = it.effect;
      if (ef.warpTown) { var a0 = await Win.choice(it.name + 'を使って最後に泊まった町へ戻る？', ['使う', 'やめる']); if (a0 === 0) { State.addItem(it.id, -1); var li = d.lastInn; await Win.message(['翼が光り、体がふわりと浮いた……']); World.enterMap(li.map, li.x, li.y, 'down'); return 'warp'; } return; }
      if (it.fieldOnly && inTown()) { await Win.message(['ここでは使えない（フィールドやダンジョンで使う）。']); return; }
      if (ef.all) { State.addItem(it.id, -1); State.partyActors().forEach(function (a) { if (!a.dead) { var s = Actors.stats(a); a.hp = s.maxHp; a.mp = s.maxMp; } }); await Win.message(['テントを張って休んだ。全員のHPとMPが回復した！']); return; }
      if (ef.partyHeal) { State.addItem(it.id, -1); var hl = []; State.partyActors().forEach(function (a) { if (a.dead) return; var s = Actors.stats(a); var h0 = a.hp, m0 = a.mp; a.hp = Math.min(s.maxHp, a.hp + Math.round(s.maxHp * ef.partyHeal)); a.mp = Math.min(s.maxMp, a.mp + Math.round(s.maxMp * ef.partyHeal)); hl.push(a.name + '：HP+' + (a.hp - h0) + '　MP+' + (a.mp - m0)); }); if (root.Audio) root.Audio.sfx('heal'); await Win.message(['宿営セットを広げて一息ついた。'].concat(hl)); World.updateHud(); return; }   // v6.4 携帯宿営セット
      if (ef.repel) { State.addItem(it.id, -1); d.counters.repel_steps = Math.max(d.counters.repel_steps || 0, ef.repel); await Win.message(['鐘を鳴らした。魔物の気配に気づきやすくなった（' + ef.repel + '歩のあいだ、陸の敵に出会いにくい）']); return; }   // v6.4 危険察知の鐘
      if (ef.seaRepel) { State.addItem(it.id, -1); d.counters.seacharm_steps = Math.max(d.counters.seacharm_steps || 0, ef.seaRepel); await Win.message(['潮風の護符を掲げた（船に乗っているあいだ' + ef.seaRepel + '歩、海の敵に出会いにくい）']); return; }   // v6.4 潮風の護符
      var target = await pickActor(it.name + 'を誰に使う？', !!ef.revive); if (!target) return;
      var s = Actors.stats(target); var lines = [];
      if (ef.revive) { if (!target.dead) { await Win.message(['効果がない。']); return; } target.dead = false; target.hp = Math.max(1, Math.round(s.maxHp * ef.revive)); target.status = {}; lines.push(target.name + 'が復活した！'); }
      else if (target.dead) { await Win.message(['倒れている仲間には効果がない。']); return; }
      if (ef.hp) { var bh = target.hp; target.hp = Math.min(s.maxHp, target.hp + ef.hp); lines.push(target.name + 'のHPが' + (target.hp - bh) + '回復した'); }
      if (ef.mp) { var bm = target.mp; target.mp = Math.min(s.maxMp, target.mp + ef.mp); lines.push(target.name + 'のMPが' + (target.mp - bm) + '回復した'); }
      if (ef.cure) { var cured = []; ef.cure.forEach(function (c) { if (target.status[c]) { delete target.status[c]; cured.push(Combat.STATUS_NAME[c]); } }); lines.push(cured.length ? target.name + 'の' + cured.join('・') + 'が治った' : '状態異常はなかった'); }
      State.addItem(it.id, -1); if (root.Audio) root.Audio.sfx('heal');
      await Win.message(lines); World.updateHud();
    } else if (it.cat === 'weapon' || it.cat === 'armor') {
      var cands = State.partyActors().filter(function (x) { return Actors.canEquip(x, it.id); });
      if (!cands.length) { await Win.message(['誰も装備できない。（装備できる職業：' + ((root.Services.equipJobs && root.Services.equipJobs(it).join('・')) || 'なし') + '）']); return; }
      var ci = await Win.choice(it.name + 'を誰が装備する？', cands.map(function (x) { return x.name; }).concat(['やめる'])); if (ci < 0 || ci >= cands.length) return;
      root.Services.equipItem(cands[ci], it.id); await Win.message([cands[ci].name + 'は' + it.name + 'を装備した。']);
    } else await Win.message([it.desc, it.subcategory === 'material' ? '（素材。使ったり売ったりはできない）' : '（重要アイテム。使ったり売ったりはできない）']);
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

  /* ---------- じゅもん・とくぎ（v6.4 分類表示：攻撃魔法・物理特技・回復・補助） ---------- */
  var SKILL_GROUPS = [{ id: 'all', name: 'すべて' }, { id: 'magic', name: '攻撃魔法' }, { id: 'attack', name: '物理特技' }, { id: 'heal', name: '回復・蘇生' }, { id: 'support', name: '補助・妨害' }];
  function skillGroup(sk) { return sk.kind === 'magic' ? 'magic' : sk.kind === 'attack' ? 'attack' : (sk.kind === 'heal' || sk.kind === 'revive' || sk.kind === 'cure' || sk.kind === 'mp_heal') ? 'heal' : 'support'; }
  Menu.skillGroup = function (id) { return SKILLS[id] ? skillGroup(SKILLS[id]) : 'support'; };
  var SK_TARGET = { enemy: '敵1体', enemies: '敵全体', ally: '味方1人', allies: '味方全体', self: '自分', dead_ally: '戦闘不能の味方' };
  var EL_NAME = { fire: '炎', ice: '氷', thunder: '雷', wind: '風', light: '光', dark: '闇' };
  Menu.skills = async function () {
    var a = await pickActor('じゅもん・とくぎを見る', true); if (!a) return;
    var list = root.Actors.allSkills(a).filter(function (s) { return SKILLS[s]; });
    if (!list.length) { await Win.message([a.name + 'はまだ特技を覚えていない。']); return; }
    var tab = 0;
    while (true) {
      var ids = list.filter(function (s) { return SKILL_GROUPS[tab].id === 'all' || skillGroup(SKILLS[s]) === SKILL_GROUPS[tab].id; });
      var rows = ids.map(function (s) { var sk = SKILLS[s]; return { label: sk.name, right: 'MP' + (a.job === 'sage' ? Math.ceil(sk.mp * 0.8) : sk.mp), sub: (SK_TARGET[sk.target] || '') + (sk.element && EL_NAME[sk.element] ? '・' + EL_NAME[sk.element] : '') + '　' + sk.desc }; });
      if (!rows.length) rows = [{ label: '（この分類の特技はない）', disabled: true }];
      var counts = SKILL_GROUPS.map(function (g) { return g.id === 'all' ? list.length : list.filter(function (s) { return skillGroup(SKILLS[s]) === g.id; }).length; });
      var r = await Win.list(rows, { title: a.name + 'の特技', tabs: SKILL_GROUPS.map(function (g, i) { return { label: g.name, count: counts[i] }; }), tab: tab });
      if (r === -1) return;
      if (r && typeof r === 'object' && r.tab !== undefined) { tab = r.tab; continue; }
    }
  };

  /* ---------- なかま（v6.4 Phase F：立ち絵・ステータス・装備・呪文と特技・紹介・隊列の変更） ----------
     PC：左に一覧、中央に立ち絵と紹介、右にステータス・装備・じゅもんとくぎ（タブ）。スマホ：縦に並べてスクロール
     ・上下キー／タップで仲間を選ぶ、左右キー／タップでタブ、Enter で隊列の変更（前へ・後ろへ）、Esc で閉じる
     ・主人公は先頭のまま。待機メンバーとの入れ替えと戦闘メンバーの上限は従来どおり酒場で（ここでは変えない）
     ・旧版は info を2回指定していて立ち絵が表示されていなかった（後の info で上書き）→ 1つの画面にまとめて修正 */
  var PT_TABS = ['ステータス', '装備', 'じゅもん・とくぎ'];
  var SLOT_NAME = { weapon: '武器', armor: '鎧', shield: '盾', head: '頭', acc: '装飾' };
  Menu.partyOrder = function () { var d = State.data; var waiting = Object.keys(d.companions).filter(function (id) { return d.party.indexOf(id) < 0; }); return d.party.slice().concat(waiting); };
  Menu.partyHtml = {
    row: function (a, cur) {
      var d = State.data; var s = Actors.stats(a); var inP = d.party.indexOf(a.id) >= 0; var pos = d.party.indexOf(a.id);
      var hpPct = Math.max(0, Math.min(100, Math.round(a.hp / Math.max(1, s.maxHp) * 100)));
      return '<div class="pt-row' + (cur ? ' cur' : '') + (inP ? '' : ' waiting') + (a.dead ? ' dead' : '') + '" data-id="' + esc(a.id) + '"><div class="pt-rn"><span class="pt-mark">' + (inP ? (pos + 1) : '待') + '</span>' + esc(a.name) + '</div><div class="pt-rj">' + esc(JOBS[a.job].name) + ' Lv' + a.level + (a.dead ? '　<b class="bad">戦闘不能</b>' : '') + '</div><div class="pt-hp"><span style="width:' + hpPct + '%"></span></div></div>';
    },
    art: function (a) {
      var c = root.COMPANIONS && root.COMPANIONS[a.id]; var tag = root.Assets ? root.Assets.portraitTagFor(a, 'portrait pt-portrait', 300) : '';
      var title = a.id === 'hero' && root.Growth ? '<span class="title-badge">' + esc(root.Growth.title()) + '</span>' : '';
      var bio = c ? '<div class="pt-bio">' + esc(c.bio || '') + '</div>' + (c.background || c.personality ? '<div class="pt-bio2 muted small">' + esc(c.background || '') + (c.personality ? '　性格：' + esc(c.personality) : '') + '</div>' : '') : '<div class="pt-bio">主人公。相場の波を読む力を持つ。</div>';
      return '<div class="pt-artbox">' + (tag || '<div class="pt-noart">立ち絵なし</div>') + '</div><div class="pt-name">' + esc(a.name) + ' ' + title + '</div><div class="pt-job">' + esc(JOBS[a.job].name) + ' Lv' + a.level + '</div>' + bio;
    },
    status: function (a) {
      var s = Actors.stats(a); var j = JOBS[a.job];
      var st = a.dead ? '戦闘不能' : (Object.keys(a.status || {}).map(function (k) { return Combat.STATUS_NAME[k] || k; }).join('・') || '正常');
      var jl = Object.keys(a.jobLevels || {}).filter(function (k) { return JOBS[k]; }).map(function (k) { return JOBS[k].name + ' Lv' + a.jobLevels[k]; }).join('・');
      return '<div class="pt-stats"><div>HP<b>' + a.hp + ' / ' + s.maxHp + '</b></div><div>MP<b>' + a.mp + ' / ' + s.maxMp + '</b></div><div>攻撃力<b>' + s.atk + '</b></div><div>防御力<b>' + s.def + '</b></div><div>素早さ<b>' + s.agi + '</b></div><div>魔力<b>' + s.mag + '</b></div><div>魔法防御<b>' + s.mdef + '</b></div><div>次のレベルまで<b>' + Math.max(0, Actors.expForLevel(a.level) - a.exp) + '</b></div></div>' +
        '<div class="pt-line"><span>状態</span>' + esc(st) + '</div><div class="pt-line"><span>固有能力</span>' + esc(j.trait || '―') + '</div><div class="pt-line"><span>役割</span>' + esc(j.role || '―') + '</div><div class="pt-line"><span>職業レベル</span>' + esc(jl || '―') + '</div>';
    },
    equip: function (a) {
      return Object.keys(SLOT_NAME).map(function (sl) { var id = a.equip && a.equip[sl]; var it = id && ITEMS[id];
        return '<div class="pt-eq"><span class="pt-slot">' + SLOT_NAME[sl] + '</span><b>' + (it ? esc(it.name) : '―') + '</b>' + (it ? '<div class="muted small">' + esc(root.Services && root.Services.statLine ? root.Services.statLine(it) : '') + (it.desc ? '　' + esc(it.desc) : '') + '</div>' : '') + '</div>'; }).join('');
    },
    skills: function (a) {
      var list = Actors.allSkills(a).filter(function (k) { return SKILLS[k]; }); if (!list.length) return '<div class="muted">まだ呪文・特技を覚えていない。</div>';
      var own = a.skills || [];
      return SKILL_GROUPS.filter(function (g) { return g.id !== 'all'; }).map(function (g) { var ids = list.filter(function (k) { return skillGroup(SKILLS[k]) === g.id; }); if (!ids.length) return '';
        return '<div class="pt-skg"><div class="pt-skh">' + esc(g.name) + '（' + ids.length + '）</div>' + ids.map(function (k) { var sk = SKILLS[k]; return '<div class="pt-sk"><b>' + esc(sk.name) + '</b><span class="pt-mp">MP' + (a.job === 'sage' ? Math.ceil(sk.mp * 0.8) : sk.mp) + '</span>' + (own.indexOf(k) < 0 ? '<span class="pt-tag">装備</span>' : '') + '<div class="muted small">' + esc((SK_TARGET[sk.target] || '') + (sk.element && EL_NAME[sk.element] ? '・' + EL_NAME[sk.element] : '') + '　' + (sk.desc || '')) + '</div></div>'; }).join('') + '</div>'; }).join('');
    }
  };
  // 隊列（戦闘メンバーの並び）を1つ動かす。主人公は先頭のまま。戻り値：動いたら true
  Menu.moveInParty = function (id, delta) { var d = State.data; var pos = d.party.indexOf(id); if (pos < 1) return false; var np = pos + delta; if (np < 1 || np >= d.party.length) return false; d.party.splice(pos, 1); d.party.splice(np, 0, id); return true; };
  Menu.party = async function () {
    var d = State.data; var order = Menu.partyOrder(); var sel = 0, tab = 0; var node = null, done = null;
    function cur() { return State.actor(order[sel]); }
    function render() {
      if (!node) return; order = Menu.partyOrder(); if (sel >= order.length) sel = order.length - 1; var a = cur(); if (!a) return;
      node.querySelector('.pt-list').innerHTML = '<div class="pt-lh">戦闘メンバー</div>' + order.map(function (id, i) { var x = State.actor(id); return (i === d.party.length ? '<div class="pt-lh">待機（酒場で入れ替え）</div>' : '') + Menu.partyHtml.row(x, i === sel); }).join('');
      node.querySelector('.pt-art').innerHTML = Menu.partyHtml.art(a);
      node.querySelectorAll('.pt-tab').forEach(function (t, i) { t.classList.toggle('cur', i === tab); });
      node.querySelector('.pt-body').innerHTML = tab === 0 ? Menu.partyHtml.status(a) : tab === 1 ? Menu.partyHtml.equip(a) : Menu.partyHtml.skills(a);
      var pos = d.party.indexOf(a.id); var canMove = pos >= 1;
      node.querySelector('.pt-acts').innerHTML = canMove ? '<span class="pt-btn" data-mv="-1"' + (pos <= 1 ? ' data-off="1"' : '') + '>▲ 隊列で前へ</span><span class="pt-btn" data-mv="1"' + (pos >= d.party.length - 1 ? ' data-off="1"' : '') + '>▼ 隊列で後ろへ</span>' : '<span class="muted small">' + (a.id === 'hero' ? '主人公は隊列の先頭です' : '待機メンバーとの入れ替えは酒場で行えます') + '</span>';
      node.querySelectorAll('.pt-row').forEach(function (r) { r.addEventListener('click', function (e) { e.stopPropagation(); var i = order.indexOf(r.getAttribute('data-id')); if (i >= 0) { sel = i; render(); } }); });
      node.querySelectorAll('.pt-btn').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); if (b.getAttribute('data-off')) return; move(parseInt(b.getAttribute('data-mv'), 10)); }); });
      var cr = node.querySelector('.pt-row.cur'); if (cr && cr.scrollIntoView) try { cr.scrollIntoView({ block: 'nearest' }); } catch (e) { }
    }
    function move(delta) { var a = cur(); if (a && Menu.moveInParty(a.id, delta)) { order = Menu.partyOrder(); sel = order.indexOf(a.id); render(); if (root.World && root.World.updateHud) root.World.updateHud(); } }
    var busy = false;
    async function formation() { var a = cur(); if (!a || d.party.indexOf(a.id) < 1 || busy) return; busy = true; var c = await Win.choice(a.name + 'の隊列', ['前へ', '後ろへ', 'やめる']); busy = false; if (c === 0) move(-1); else if (c === 1) move(1); }
    var html = '<div class="pt-wrap"><div class="pt-list"></div><div class="pt-art"></div><div class="pt-side"><div class="pt-tabs">' + PT_TABS.map(function (t, i) { return '<span class="pt-tab" data-t="' + i + '">' + esc(t) + '</span>'; }).join('') + '</div><div class="pt-body"></div><div class="pt-acts"></div></div></div><div class="pt-foot"><span class="muted small">↑↓ 仲間　←→ タブ　Enter 隊列の変更　Esc 閉じる</span><span class="pt-close">閉じる</span></div>';
    await Win.panel(html, { cls: 'party-screen', noClose: true,
      onCancel: function () { if (!busy && done) done(-1); }, onOk: function () { formation(); },
      onKey: function (k) { if (busy) return; if (k === 'up') { sel = (sel + order.length - 1) % order.length; render(); } else if (k === 'down') { sel = (sel + 1) % order.length; render(); } else if (k === 'left') { tab = (tab + PT_TABS.length - 1) % PT_TABS.length; render(); } else if (k === 'right') { tab = (tab + 1) % PT_TABS.length; render(); } },
      setup: function (n, fin) { node = n; done = fin; n.querySelectorAll('.pt-tab').forEach(function (t) { t.addEventListener('click', function (e) { e.stopPropagation(); tab = parseInt(t.getAttribute('data-t'), 10); render(); }); }); n.querySelector('.pt-close').addEventListener('click', function (e) { e.stopPropagation(); fin(-1); }); render(); } });
  };

  Menu.quests = async function () {
    var d = State.data; var ids = Object.keys(d.quests);
    if (!ids.length) { await Win.message(['受注しているクエストはない。']); return; }
    ids.sort(function (a, b) { var sa = d.quests[a].state === 'done' ? 1 : 0, sb = d.quests[b].state === 'done' ? 1 : 0; return sa - sb; });
    await Win.list(ids.map(function (id) { var q = QUESTS[id]; var st = d.quests[id]; var prog = root.Events.questProgress(id); var obj = st.state === 'active' ? root.Events.questObjective(id) : ''; return { label: (q.main ? '【メイン】' : q.master ? '【師匠】' : '【サブ】') + q.title, right: st.state === 'done' ? '達成' : (prog || '進行中'), sub: (obj ? obj + '　' : '') + q.desc, cls: st.state === 'done' ? 'done' : '' }; }), { title: 'クエスト' });
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
      var BA = root.BossArt; var bossQ = Promise.resolve();
      node.querySelectorAll('.bs-img[data-id]').forEach(function (box) {
        var e = ENEMIES[box.getAttribute('data-id')]; var img;
        // v6.3 ボス画像パック：まず従来の絵を出し、新画像が読めたら差し替える（1枚ずつ順に読む。読めなければ従来の絵のまま）
        if (BA && BA.isBossId(e.id) && BA.wants(e.id)) bossQ = bossQ.then(function () { return BA.load(e.id); }).then(function (v) {
          if (!v || !box.isConnected) return; var f = Math.min(104 / v.img.width, 104 / v.img.height, 1); var c2 = document.createElement('canvas'); c2.width = Math.max(1, Math.round(v.img.width * f)); c2.height = Math.max(1, Math.round(v.img.height * f));
          var x2 = c2.getContext('2d'); x2.imageSmoothingEnabled = true; x2.imageSmoothingQuality = 'high'; x2.drawImage(v.img, 0, 0, c2.width, c2.height); c2.className = 'bs-canvas bs-boss'; box.innerHTML = ''; box.appendChild(c2);
        }).catch(function () { });
        var pu = BA && BA.prevUrl ? BA.prevUrl(e.id) : null;
        if (pu) { var pim = document.createElement('img'); pim.src = pu; pim.alt = ''; pim.className = 'bs-photo'; pim.draggable = false; box.appendChild(pim); return; }   // 採用前の画像（新画像を使わない・読めないとき）
        var au = root.Assets && root.Assets.image('monsters', e.id) ? root.Assets.url('monsters', e.id) : null;
        if (au) { var im = document.createElement('img'); im.src = au; im.alt = ''; im.className = 'bs-photo'; im.draggable = false; box.appendChild(im); return; }   // 戦闘と同じアセット管理を参照
        if (e.art && root.MonsterArt) img = root.MonsterArt.image(e.art, 1, 0);
        else if (root.Sprites && root.Sprites.has(e.sprite)) { img = document.createElement('canvas'); root.Sprites.draw(img, e.sprite, 3, false); }
        if (!img) return; var c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); c.className = 'bs-canvas'; box.appendChild(c);
      });
    } });
  };

  /* ---------- トレード修行（学習への入口をメニューに） ---------- */
  Menu.training = async function () {
    var d = State.data; var TE = root.TradeEval; var LECT = root.LECTURES; var Services = root.Services;
    while (true) {
      var rank = TE.rank(d.trade); var weak = TE.weakTopics(d.trade);
      var nextLecture = LECT.filter(function (L) { return !d.trade.lectures[L.id] && !d.flags[L.id]; })[0];
      var nextEv = root.Learning.nextRecommended();
      var theme = !d.trade.tutorialDone ? 'はじめてのトレード（チュートリアル）' : nextEv ? '第' + nextEv.chapter + '章「' + nextEv.title + '」（' + nextEv.region + '）' : nextLecture ? '第' + nextLecture.chapter + '章「' + nextLecture.title + '」' : (weak.length && weak[0].plays ? '復習：' + weak[0].label : '全講義修了。場面練習で精度を上げよう');
      var items = [
        { label: '今の学習テーマ', right: '', sub: theme },
        { label: 'はじめてのトレード（チュートリアル）', right: d.trade.tutorialDone ? '復習できる' : '未完了', sub: 'ローソク足・買いと売り・損切り・上昇/下降/レンジを2〜4分で体験' },
        { label: '講義を受ける', right: nextLecture ? '次：' + nextLecture.title : '修了', sub: '師匠ハケイの講義（どこからでも受けられる）' },
        { label: 'チャート練習', right: (d.trade.stats.scoreCount || 0) + '回', sub: root.Scenarios.defs.length + '場面（初級・中級・上級）から出題。分析→高値安値の指定→判断→理由の順に答える' },
        { label: '苦手分野の復習', right: weak.length && weak[0].plays ? weak[0].label : '―', sub: '正解率の低い分野に合う場面を出題' },
        { label: 'トレーダーランク', right: rank.letter + ' ' + rank.title, sub: (rank.needText ? '次のランクへ：' + rank.needText : '最高ランク') + '　称号：' + root.Growth.title() },
        { label: '師匠の特別クエスト', right: mqRight(), sub: 'ランク到達で解放される師匠ハケイからの課題' },
        { label: '学習実績', right: root.Growth.achievementList().filter(function (a) { return a.done; }).length + '/' + root.LEARN_ACHIEVEMENTS.length, sub: '判断の質で解除される実績と報酬' },
        { label: '学習進捗・記録', right: '', sub: '分野別の挑戦数・正解率・ヒント利用率・習熟度・苦手な判断・復習履歴' },
        { label: '章ごとの学習イベント', right: root.Learning.progress().filter(function (p) { return p.status === 'done'; }).length + '/' + root.Learning.progress().length + ' 達成', sub: '必修イベントの場所・任意練習・解放される能力' },
        { label: '読んだ本', right: (Services.booksReadCount ? Services.booksReadCount() : 0) + '/' + (root.Books ? root.Books.all.length : 0) + '冊', sub: '各地の本棚で読んだトレードのヒント・相場格言・伝承を読み返す' }
      ];
      function mqRight() { var ids = Object.keys(root.QUESTS).filter(function (k) { return root.QUESTS[k].master; }); var open = ids.filter(function (k) { return root.Growth.questAvailable(root.QUESTS[k]); }); var active = ids.filter(function (k) { return d.quests[k] && d.quests[k].state === 'active'; }); var done = ids.filter(function (k) { return d.quests[k] && d.quests[k].state === 'done'; }); return active.length ? '進行中 ' + active.length : (open.length > done.length ? '受けられる' : done.length + '/' + ids.length + ' 達成'); }
      var i = await Win.list(items, { title: 'トレード修行', cls: 'main-menu' });
      if (i < 0) return;
      if (i === 0) await Win.message(['今のおすすめ：' + theme, !d.trade.tutorialDone ? 'まずチュートリアルで判断の順番（上位足→波形→EMA→RCI→MACD→判断→理由→損切り）を体験しよう。' : '講義で考え方を学び、練習で判断を磨き、苦手分野を復習する。ランクは回数ではなく、分析の正確さ・ヒントなしの正解・異なる場面への対応で上がる。'], { name: '師匠ハケイ' });
      else if (i === 1) await Services.tutorial();
      else if (i === 2) await Services.lectureAt('dow');
      else if (i === 3) await Services.practice();
      else if (i === 4) await Services.reviewWeak();
      else if (i === 5) await Menu.rankPanel();
      else if (i === 6) await Services.learningQuests();
      else if (i === 7) await Menu.achievements();
      else if (i === 8) await root.TradeUI.showRecord();
      else if (i === 9) await Menu.learnProgress();
      else if (i === 10) await Services.bookList();   // v5.9
    }
  };
  Menu.learnProgress = async function () {
    var P = root.Learning.progress();
    var html = '<div class="rw-title">章ごとの学習イベント</div>' + P.map(function (p) { var e = p.event; var st = p.status === 'done' ? '<span class="ok-text">達成</span>' : p.status === 'open' ? '<span class="gold-text">挑戦できる</span>' : '<span class="muted">未解放の地域</span>'; var place = e.tutorial ? 'ポヨ村の修行場（師匠ハケイ）／メニュー' : e.mapId ? ({ lost_forest: '迷いの森の扉', emal_pass: 'エマール山道の石碑', oblivion_cave_3: '忘却の洞窟 最深部の扉', verum_hideout: '灰鉱町ヴェルム 地下の集会所の石碑（第5章）', kalion_finance: '徴収都市カリオン 財務局の石碑（第6章）', aruna_house_iris: '灰灯島アルナ 測量士の家の石碑（第8章）', temple_of_time_3: '時の神殿 最深部の石碑（第10章）', oracle_core_3: 'オラクル中枢 第3層の石碑（第12章）', forbidden_archive_3: '禁書庫 最深部の石碑（第13章）', demon_castle_gate: '魔王城の門の石碑（第15章）' })[e.mapId] || e.mapId : e.region + '（未実装）'; var pr = p.practices.length ? '<div class="small muted">任意練習：' + p.practices.map(function (x) { return esc(x.title) + (x.done ? '✓' : ''); }).join('・') + '</div>' : ''; var ab = p.ability ? '<div class="small">解放される能力：' + esc(p.ability.name) + (p.abilityOn ? '（習得済み）' : '（達成＋分野の理解で解放）') + '</div>' : ''; return '<div class="learn-row"><div><b>第' + e.chapter + '章 ' + esc(e.title) + '</b>　' + st + '</div><div class="small">' + esc(e.summary || '') + '</div><div class="small muted">場所：' + esc(place) + '</div>' + pr + ab + '</div>'; }).join('');
    await Win.panel(html + '<p class="muted small">能力は「必修イベントの達成」と「その分野の理解（3回以上挑戦し直近の正解率60%以上）」で解放されます。丸暗記では解放されません。</p>');
  };
  Menu.rankPanel = async function () {
    var d = State.data; var TE = root.TradeEval; var r = TE.rank(d.trade); var c = r.crit;
    var pct = function (v) { return Math.round((v || 0) * 100) + '%'; };
    var rows = [['分析の正確さ（上位足・波形・EMA・RCI・MACD）', pct(c.analysis)], ['上位足の環境認識', pct(c.mtf)], ['エントリー／見送り判断', pct(c.action)], ['損切り・資金管理／見送りの規律', pct(c.risk)], ['ヒントなしでの正解率', pct(c.noHint)], ['異なる場面での正解（分析3項目以上）', c.variety + ' / ' + root.Scenarios.ids().length + ' 場面'], ['挑戦回数・平均点', c.plays + '回・' + Math.round(c.avgScore) + '点']];
    var best = root.Growth.rankBest();
    var ladder = TE.RANKS.map(function (x, i) { return '<span class="' + (i === r.index ? 'cur' : i < r.index ? 'done' : '') + '">' + x[0] + '</span>'; }).join(' → ');
    var unl = '<h3>ランクで解放されるもの</h3><table class="tbl unlock-tbl">' + root.RANK_UNLOCKS.filter(function (u) { return u.index > 0; }).map(function (u) { var rw = u.reward ? [u.reward.gold ? u.reward.gold + 'G' : '', u.reward.item ? ITEMS[u.reward.item].name + (u.reward.qty > 1 ? '×' + u.reward.qty : '') : ''].filter(Boolean).join('・') : '―'; return '<tr class="' + (best >= u.index ? 'got' : '') + '"><td><b>' + u.letter + '</b> ' + esc(u.title) + '</td><td>' + esc(rw) + '</td><td>' + (u.unlocks || []).map(esc).join('<br>') + '</td><td>' + (best >= u.index ? '<span class="ok-text">到達</span>' : '') + '</td></tr>'; }).join('') + '</table>';
    await Win.panel('<div class="rw-title">トレーダーランク</div><div class="rank-box"><div class="rank-letter">' + esc(r.letter) + '</div><div><b>' + esc(r.title) + '</b>　<span class="muted small">称号：' + esc(root.Growth.title()) + '（最高到達 ' + root.RANK_UNLOCKS[best].letter + '）</span><div class="muted small">' + ladder + '</div><div class="small">' + (r.needText ? '次のランクへ：' + esc(r.needText) : '最高ランクです') + '</div></div></div><table class="tbl">' + rows.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td><b>' + esc(x[1]) + '</b></td></tr>'; }).join('') + '</table>' + unl + '<p class="muted small">回数や仮想利益ではなく、判断の過程・ヒントなしの正解・異なる場面への対応で評価されます。同じ場面の繰り返しだけではランクは上がりません。称号・解放済みの内容は、ランクが一時的に下がっても失われません。</p>');
  };

  Menu.achievements = async function () {
    var list = root.Growth.achievementList(); var n = list.filter(function (a) { return a.done; }).length;
    var html = '<div class="rw-title">学習実績　' + n + ' / ' + list.length + '</div><div class="ach-list">' + list.map(function (a) { var rw = a.def.reward || {}; var rs = [rw.gold ? rw.gold + 'G' : '', rw.exp ? '経験値' + rw.exp : '', rw.item ? ITEMS[rw.item].name + (rw.qty > 1 ? '×' + rw.qty : '') : ''].filter(Boolean).join('・'); return '<div class="ach ' + (a.done ? 'done' : '') + '"><span class="mark">' + (a.done ? '★' : '☆') + '</span><div><b>' + esc(a.def.name) + '</b><div class="small">' + esc(a.def.desc) + '</div><div class="muted small">報酬：' + esc(rs || '―') + (a.done ? '　達成 ' + new Date(a.at).toLocaleDateString('ja-JP') : '') + '</div></div></div>'; }).join('') + '</div><p class="muted small">実績は判断の質（ヒントなしの正解・分析の正確さ・異なる場面・見送りと損切りの規律）で解除されます。報酬は1回限りです。</p>';
    await Win.panel(html);
  };

  Menu.encyclopedia = async function () {
    while (true) {
      var i = await Win.choice('図鑑', ['モンスター図鑑', 'アイテム図鑑', '職業一覧', '冒険の記録', 'オーパーツ（' + (root.Ooparts ? root.Ooparts.count() + '/' + root.Ooparts.total() : '0') + '）', 'カジノ・学院の記録', 'やめる']);
      if (i < 0 || i === 6) return;
      if (i === 4) { if (root.OopartsUI) await root.OopartsUI.list(); continue; }   // v6.1
      if (i === 5) { await Menu.studyRecord(); continue; }   // v6.1
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

  // v6.1 ファストトラベル：訪れた町・村・城・ダンジョン入口の一覧（地域ごと）。移動したら true
  // v6.2 次の目的地：いまの目的・場所・段階式ヒント（最初はヒント1だけ。「詳細」設定なら全部）
  Menu.objective = async function () {
    var N = root.Nav; if (!N) return; var esc = Win.esc; var st = State.data.settings;
    var shown = N.detail() ? 3 : 1;
    while (true) {
      var p = N.panel();
      if (!p || p.none) { await Win.message([p && p.text ? p.text : '今は、メインストーリーの目的地はない。']); return; }
      var hs = p.hints.slice(0, shown).map(function (h, k) { return '<div class="nav-hint"><b>ヒント' + (k + 1) + '：</b>' + esc(h) + '</div>'; }).join('');
      var html = '<div class="nav-panel"><div class="nav-h">' + esc(p.header) + '</div>' +
        '<div class="nav-l">現在の目的：</div><div class="nav-v">' + esc(p.objective) + (p.objective !== p.step ? '<div class="small muted">（そのあと：' + esc(p.step) + '）</div>' : '') + '</div>' +
        '<div class="nav-l">場所：</div><div class="nav-v">' + esc(shown >= 2 ? p.placeDetail : p.place) + '</div>' + hs +
        (p.note ? '<div class="nav-note">' + esc(p.note) + '</div>' : '') +
        (p.others ? '<div class="small muted">ほかに行ける候補が ' + p.others + ' か所ある（地図では点線の赤丸）。順番は自由。</div>' : '') +
        (p.side.length ? '<div class="small muted">同時に進行中：' + p.side.map(esc).join(' ／ ') + '</div>' : '') +
        (st.nav === 'off' ? '<div class="small muted">目的地ナビは OFF（地図に赤丸を出さない）。</div>' : '<div class="small muted">ミニマップ・全体マップ（N / Tab）・世界地図の赤丸が目的地。</div>') + '</div>';
      var acts = [];
      if (shown < 3 && p.hints.length > shown) acts.push({ label: 'ヒント' + (shown + 1) + 'を見る', right: shown === 1 ? '町・建物・人の名前' : '詳しい場所とすること', act: 'more' });
      acts.push({ label: '全体マップで見る', act: 'map' });
      acts.push({ label: '目的地ナビ（赤丸）', right: st.nav === 'off' ? 'OFF → ON にする' : 'ON → OFF にする', act: 'toggle' });
      acts.push({ label: '閉じる', act: 'close' });
      var i = await Win.list(acts, { title: '次の目的地', head: html, cls: 'nav-menu' });
      if (i < 0 || acts[i].act === 'close') return;
      if (acts[i].act === 'more') shown++;
      else if (acts[i].act === 'toggle') { st.nav = st.nav === 'off' ? 'on' : 'off'; State.autosave(); }
      else if (acts[i].act === 'map') return 'map';
    }
  };

  Menu.travel = async function () {
    var T = root.Travel; if (!T) return false;
    var cu = T.canUse(null, { fromMenu: true }); if (!cu.ok) { await Win.message([cu.reason + '。']); return false; }
    var defs = root.MAP_DEFS; var all = T.points().filter(function (p) { return !p.hidden || T.unlocked(p); });
    var open = all.filter(function (p) { return T.unlocked(p); }); var locked = all.length - open.length;
    var KIND = { town: '町・村', castle: '城・都市', dungeon: 'ダンジョン入口' };
    var here = World.map && World.map.id;
    var items = open.map(function (p) { return { label: p.name + (p.to === here ? '（いまいる場所）' : ''), right: (defs[p.region] && defs[p.region].name) || '', sub: KIND[p.kind] || '', disabled: p.to === here }; });
    if (root.Harbors && root.Harbors.awayFromHome().length) items.push({ label: '（乗り物を母港へ戻す）', right: root.Harbors.awayFromHome().length + '台', sub: '船・飛空艇を置いてきたとき' });   // v6.2
    if (!items.length) { await Win.message(['まだ移動できる場所がない。町や村を訪れると、ここから移動できるようになる。']); return false; }
    var i = await Win.list(items, { title: 'ファストトラベル（訪れた場所 ' + open.length + '）', footer: '<span class="muted small">' + (locked ? 'まだ訪れていない場所 ' + locked + ' か所（名前は訪れると表示）。' : '') + 'ダンジョンは入口へ移動します。</span>' });
    if (i < 0) return false;
    if (i >= open.length) { await Menu.recallVehicle(); return false; }
    return await T.go(open[i].id, { fromMenu: true });
  };
  // v6.2 取り残した船・飛空艇を母港へ戻す（乗っていないときだけ。乗り物の解放条件は変えない）
  Menu.recallVehicle = async function () {
    var H = root.Harbors; if (!H) return;
    var away = H.awayFromHome(); if (!away.length) { await Win.message(['どの乗り物も母港にいる。']); return; }
    var home = function (v) { var h = H.homeOf(v); var md = root.MAP_DEFS[h.map]; return (md ? md.name : h.map); };
    var j = await Win.list(away.map(function (v) { var st = root.Vehicle.state(v); var md = root.MAP_DEFS[st.map]; return { label: root.VEHICLES[v].name + 'を母港へ戻す', right: '母港：' + home(v), sub: 'いまの場所：' + (md ? md.name : st.map) + '（' + st.x + ', ' + st.y + '）' }; }), { title: '乗り物を母港へ戻す' });
    if (j < 0) return;
    var r = H.recallHome(away[j]); await Win.message(r ? [root.VEHICLES[away[j]].name + 'を母港（' + home(away[j]) + '）へ戻した。'] : ['今は戻せない（停める場所が見つからない）。']); if (r) root.State.autosave();
  };

  // v6.1 カジノ・研究室・学院の記録（コイン残高・遊んだ結果・学習の記念・研究クエスト）
  Menu.studyRecord = function () {
    var d = State.data; var C = root.Casino; var st = C ? C.stats() : {}; var lab = (C && C.state().lab) || {}; var rw = lab.rewards || {};
    function g(k, label) { var x = st[k]; return '<tr><td>' + label + '</td><td>' + (x ? x.plays + '回' : '―') + '</td><td>' + (x ? x.bet : 0) + '</td><td>' + (x ? x.paid : 0) + '</td><td>' + (x && x.bet ? (x.paid / x.bet * 100).toFixed(1) + '%' : '―') + '</td></tr>'; }
    var labs = [['lln', '大数の法則の実験'], ['ev', '期待値の問題'], ['fallacy', 'ギャンブラーの誤謬'], ['martingale', 'マーチンゲール法の実験'], ['strategy', '増し玉シミュレーター']].map(function (x) { return '<li>' + esc(x[1]) + '：' + (rw[x[0]] ? '修了' : '未修了') + '</li>'; }).join('');
    var aq = ['academy_consciousness', 'academy_entangle', 'academy_ancient', 'academy_cosmos', 'academy_soul', 'academy_zero'].map(function (id) { var q = QUESTS[id]; if (!q) return ''; var s = d.quests[id]; return '<li>' + esc(q.title) + '：' + (s ? (s.state === 'done' ? '達成' : '進行中　' + esc(root.Events.questObjective(id))) : '未受注') + '</li>'; }).join('');
    var html = '<div class="rw-title">カジノ・学院の記録</div>' +
      '<div>カジノコイン <b>' + (C ? C.coins() : 0) + '</b>枚（コインはゴールドに戻せません）</div>' +
      '<table class="tbl cs-tbl"><tr><th>ゲーム</th><th>回数</th><th>賭けた</th><th>戻った</th><th>実際の還元</th></tr>' + g('slot', 'スロット') + g('roulette', 'ルーレット') + g('card', 'ハイ＆ロー') + '</table>' +
      '<div class="small gold-text">確率研究室・投資戦略研究室（ラックスベル）</div><ul class="small">' + labs + '</ul>' +
      '<div class="small gold-text">ボラティリティア学院</div><ul class="small">' + (d.flags.academy_visited ? aq : '<li>まだ訪れていない</li>') + '<li>講義「統計学」：' + (d.flags.academy_stats ? '修了（チャートの試練に損益分岐の勝率を表示）' : '未修了') + '</li></ul>';
    return Win.panel(html, { cls: 'lab-panel' });
  };

  Menu.settings = async function () {
    while (true) {
      var st = State.data.settings;
      var i = await Win.list([
        { label: '音（BGM・効果音）', right: st.mute ? 'OFF' : 'ON' }, { label: 'BGM音量', right: Math.round(st.bgm * 100) + '%' }, { label: '効果音音量', right: Math.round(st.se * 100) + '%' },
        { label: '文字速度', right: ({ normal: 'ふつう', fast: 'はやい', instant: '一瞬' })[st.textSpeed] }, { label: '戦闘速度', right: st.battleSpeed === 'fast' ? 'はやい' : 'ふつう' }, { label: '歩く速度', right: ({ normal: 'ふつう', fast: 'はやい', faster: 'とてもはやい' })[st.walkSpeed] || 'はやい' },
        { label: 'チャート試練のリスク%', right: st.riskPercent + '%' }, { label: 'ZigZag表示', right: st.showZigzag ? 'ON' : 'OFF' },
        { label: 'ミニマップ', right: st.minimap === 'off' ? '表示しない' : '表示する' }, { label: 'ミニマップの大きさ', right: st.minimapSize === 'large' ? '大きい' : 'ふつう' },
        { label: 'スマホの移動操作', right: st.pad === 'dpad' ? '十字キー' : 'スティック' },
        { label: '目的地ナビ（赤丸）', right: st.nav === 'off' ? 'OFF' : 'ON' }, { label: 'ヒント表示', right: st.navHint === 'detail' ? '詳細' : '控えめ' },
        { label: '仲間の隊列表示（後ろをついて歩く）', right: st.followers === 'off' ? '表示しない' : '表示する' },
        { label: 'データ管理（書き出し・読み込み・初期化）' }, { label: 'タイトルに戻る' }
      ], { title: '設定' });
      if (i < 0) return;
      if (i === 0) { st.mute = !st.mute; if (root.Audio) root.Audio.apply(); }
      if (i === 1) { st.bgm = Math.round(((st.bgm + 0.25) % 1.25) * 100) / 100; if (st.bgm > 1) st.bgm = 0; if (root.Audio) root.Audio.apply(); }
      if (i === 2) { st.se = Math.round(((st.se + 0.25) % 1.25) * 100) / 100; if (st.se > 1) st.se = 0; if (root.Audio) root.Audio.apply(); }
      if (i === 3) { st.textSpeed = ({ normal: 'fast', fast: 'instant', instant: 'normal' })[st.textSpeed]; }
      if (i === 4) { st.battleSpeed = st.battleSpeed === 'fast' ? 'normal' : 'fast'; }
      if (i === 5) { st.walkSpeed = ({ normal: 'fast', fast: 'faster', faster: 'normal' })[st.walkSpeed] || 'fast'; World.applyWalkSpeed(); }
      if (i === 6) { var ro = root.CONFIG.risk.riskOptions; st.riskPercent = ro[(ro.indexOf(st.riskPercent) + 1) % ro.length]; }
      if (i === 7) { st.showZigzag = !st.showZigzag; }
      if (i === 8) { if (root.Minimap && root.Minimap.setVisible) root.Minimap.setVisible(st.minimap === 'off', true); else st.minimap = st.minimap === 'off' ? 'on' : 'off'; }
      if (i === 9) { st.minimapSize = st.minimapSize === 'large' ? 'normal' : 'large'; if (root.Minimap) root.Minimap.resize(); }
      if (i === 10) { st.pad = st.pad === 'dpad' ? 'stick' : 'dpad'; }   // v6.1
      if (i === 11) { st.nav = st.nav === 'off' ? 'on' : 'off'; Win.toast(st.nav === 'off' ? '目的地ナビ：OFF（赤丸を出さない）' : '目的地ナビ：ON'); }   // v6.2
      if (i === 12) { st.navHint = st.navHint === 'detail' ? 'low' : 'detail'; }
      if (i === 13) { st.followers = st.followers === 'off' ? 'on' : 'off'; Win.toast(st.followers === 'off' ? '仲間の隊列：表示しない' : '仲間の隊列：表示する'); }   // v6.4 Phase F
      if (i === 14) { await Menu.dataManagement(); }
      if (i === 15) { var c = await Win.choice('タイトルに戻る？（オートセーブ済み）', ['戻る', 'やめる']); if (c === 0) { State.autosave(); root.Title.show(); return 'title'; } }
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
