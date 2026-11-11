/* =========================================================
   UI / Menu : メインメニュー（ステータス・道具・装備・特技・仲間・クエスト・図鑑・記録・セーブ・設定）
   ========================================================= */
(function (root) {
  'use strict';

  var Win = root.Win, State = root.State, ITEMS = root.ITEMS, SKILLS = root.SKILLS, JOBS = root.JOBS, Actors = root.Actors, World = root.World, QUESTS = root.QUESTS, ENEMIES = root.ENEMIES, COMPANIONS = root.COMPANIONS, Combat = root.Combat;
  var esc = Win.esc;
  var Menu = {};

  // v8.8 メインメニュー：目的別の 5 つの分類（タブ）＋よく使う 4 つ（どうぐ・そうび・目的地・セーブ）は上のボタンから 1 回で開く
  //   ・まだ手に入れていない乗り物・機能は出さない（今までどおり）。項目の名前は今までと同じ（テスト・説明書と合わせる）
  //   ・前に開いた分類を覚えておく（この遊んでいる間だけ）
  var MENU_TABS = [{ id: 'adv', label: '冒険' }, { id: 'party', label: 'パーティ' }, { id: 'item', label: 'どうぐ' }, { id: 'trade', label: 'トレード' }, { id: 'sys', label: 'システム' }];
  Menu.TABS = MENU_TABS; Menu._tab = 0;
  Menu.entries = function () {
    var d = State.data; var E = { adv: [], party: [], item: [], trade: [], sys: [] };
    E.adv.push({ label: 'クエスト', run: function () { return Menu.quests(); } });
    E.adv.push({ label: '次の目的地', run: async function () { if (await Menu.objective() === 'map') return 'map'; } });
    if (root.Minimap && root.Minimap.openBig) E.adv.push({ label: 'ワールドマップ', sub: '全体マップ（N / Tab キーでも開く）', run: function () { return 'map'; } });
    E.adv.push({ label: 'ファストトラベル', run: async function () { if (await Menu.travel()) return 'close'; } });
    if (root.Astra && root.Astra.owned()) E.adv.push({ label: 'アストラ号', run: function () { return root.Astra.menu(); } });
    if (root.Carriage && root.Carriage.owned()) E.adv.push({ label: root.Carriage.wanted() ? '馬車を降りる' : '馬車に乗る', sub: 'C キーでも乗り降り', run: function () { if (root.Carriage.toggle()) return 'close'; } });
    if (root.AirshipCall86 && root.AirshipCall86.owned() && d.aboard !== 'airship') E.adv.push({ label: '飛空艇を呼ぶ', sub: 'F キーでも呼べる', run: function () { if (root.AirshipCall86.call()) return 'close'; } });
    E.adv.push({ label: '図鑑', run: function () { return Menu.encyclopedia(); } });
    if (Win.backlog) E.adv.push({ label: '会話の履歴', sub: '読み飛ばした会話・説明を読み返す（メッセージ中は ↑ キーでも）', run: function () { return Win.backlog(); } });   // v9.3
    E.party.push({ label: 'ステータス', run: async function () { if (await Menu.status() === 'warp') return 'close'; } });   // v9.2 ステータスから［じゅもん・とくぎ］→ 帰還の術で移動したとき
    E.party.push({ label: 'なかま', sub: '隊列・入れ替え', run: function () { return Menu.party(); } });
    E.party.push({ label: 'そうび', run: function () { return Menu.equip(); } });
    E.party.push({ label: 'じゅもん・とくぎ', run: async function () { if (await Menu.skills() === 'warp') return 'close'; } });
    E.party.push({ label: 'さくせん', sub: 'オート戦闘での仲間ごとの考え方', run: function () { return Menu.tactics(); } });   // v9.3
    E.party.push({ label: 'まんたん', sub: '回復の呪文・道具で全員のHPを満タンに', run: function () { return Menu.fullHeal(); } });   // v9.3
    if (root.BondsUI && root.Bonds) {   // v9.4 仲間の絆（js/rpg/bonds94.js・js/ui/bonds94ui.js）
      var bn = root.Bonds.talkable().filter(function (id) { return root.Bonds.hasNew(id); }).length + (root.Bonds.readyEpisodes('hero').length ? 1 : 0);
      E.party.push({ label: '仲間と話す', sub: bn ? '新しい話あり（' + bn + '人）' : '町・宿屋・酒場・野営地で、加入した仲間と話す', run: function () { return root.BondsUI.talk({ fromMenu: true }); } });
      E.party.push({ label: '仲間の思い出', sub: '人物の記録・選んだこと・記念品・思い出の再生', run: function () { return root.BondsUI.notebook(); } });
    }
    E.item.push({ label: 'どうぐ', sub: 'すべての持ち物', run: async function () { if (await Menu.items() === 'warp') return 'close'; } });
    E.item.push({ label: '回復の道具', sub: 'HP回復の道具だけ', run: async function () { if (await Menu.items({ genre: 'hp' }) === 'warp') return 'close'; } });
    E.item.push({ label: '最近使った・お気に入り', run: async function () { if (await Menu.items({ fav: true }) === 'warp') return 'close'; } });
    E.item.push({ label: '重要アイテム', run: async function () { if (await Menu.items({ genre: 'key' }) === 'warp') return 'close'; } });
    E.trade.push({ label: 'トレード修行', run: function () { return Menu.training(); } });
    if (root.PracticeUI) E.trade.push({ label: 'もちぽよ実践トレード道場', sub: '環境認識→待つ→条件の確認→注文→管理→振り返り（架空の相場）', run: function () { return root.PracticeUI.menu(); } });   // v9.0
    if (root.Ultimates && root.TraderDojo && (root.Ultimates.count(d) > 0 || Object.keys((d.ultimate && d.ultimate.masters) || {}).length)) E.trade.push({ label: '必殺技', run: function () { return root.TraderDojo.menu(); } });
    E.trade.push({ label: 'トレード成績・振り返り', run: function () { return Menu.tradeRecord ? Menu.tradeRecord() : Menu.rankPanel(); } });
    E.sys.push({ label: 'セーブ', run: function () { return Menu.save(); } });
    E.sys.push({ label: '設定', run: async function () { if (await Menu.settings() === 'title') return 'title'; } });
    E.sys.push({ label: 'データ管理', sub: '書き出し・読み込み・クラウドセーブ・バックアップ', run: function () { return Menu.dataManagement(); } });
    E.sys.push({ label: 'タイトルに戻る', run: async function () { if (await Menu.toTitle()) return 'title'; } });
    return E;
  };
  var SHORTCUTS = [{ id: 'items', label: 'どうぐ' }, { id: 'equip', label: 'そうび' }, { id: 'goal', label: '目的地' }, { id: 'save', label: 'セーブ' }];
  Menu.toTitle = async function () { var c = await Win.choice('タイトルに戻る？（オートセーブ済み）', ['戻る', 'やめる'], { initial: 1 }); if (c === 0) { State.autosave(); root.Title.show(); return true; } return false; };
  Menu.open = async function () {
    if (World.busy) return; World.busy = true; var openMap = false;
    try {
      while (true) {
        var d = State.data; var E = Menu.entries(); var tid = MENU_TABS[Menu._tab].id; var list = E[tid];
        var r = await Win.list(list.map(function (e) { return { label: e.label, sub: e.sub, disabled: e.disabled }; }), { title: 'メニュー　' + d.gold + 'G　' + World.map.name, cls: 'main-menu', key: 'main:' + tid,
          tabs: MENU_TABS.map(function (t) { return { label: t.label, count: E[t.id].length }; }), tab: Menu._tab, tools: SHORTCUTS });
        if (r === -1) break;
        var res;
        if (r && typeof r === 'object') {
          if (r.tab !== undefined) { Menu._tab = r.tab; continue; }
          if (r.tool === 'items') res = (await Menu.items()) === 'warp' ? 'close' : null;
          else if (r.tool === 'equip') res = await Menu.equip();
          else if (r.tool === 'goal') res = (await Menu.objective()) === 'map' ? 'map' : null;
          else if (r.tool === 'save') res = await Menu.save();
        } else if (list[r]) res = await list[r].run();
        if (res === 'title') return;
        if (res === 'map') { openMap = true; break; }
        if (res === 'close') break;
      }
    } catch (e) { root.Engine.onError(e); }
    if (Menu._afterClose) { var af = Menu._afterClose; Menu._afterClose = null; try { await af(); } catch (e2) { root.Engine.onError(e2); } }   // v9.4 メニューを閉じてからする事（仲間と話す：3D のカメラが見えるように）
    World.busy = false; World.updateHud(); State.autosave();
    if (openMap && root.Minimap) root.Minimap.openBig();   // v6.2「次の目的地」→「全体マップで見る」／v8.8「ワールドマップ」
  };

  // v8.8 画面の使い勝手の記録（State.data.ui。旧セーブにない時もここで補う）
  Menu.ui = function () { var d = State.data; if (!d.ui || typeof d.ui !== 'object') d.ui = {}; var u = d.ui; if (!Array.isArray(u.recentItems)) u.recentItems = []; if (!u.favItems || typeof u.favItems !== 'object') u.favItems = {}; if (!u.favSkills || typeof u.favSkills !== 'object') u.favSkills = {}; if (!u.lastCmd || typeof u.lastCmd !== 'object') u.lastCmd = {}; return u; };
  Menu.noteItemUse = function (id) { var u = Menu.ui(); u.recentItems = [id].concat(u.recentItems.filter(function (x) { return x !== id; })).slice(0, 8); };

  // v9.2 ステータス・そうび・じゅもん・とくぎの「仲間の切り替え」（戦闘メンバー。戦闘不能の仲間も含む）
  //   Menu._member：最後に見ていた仲間の id（この遊んでいる間だけ。セーブには入れない）。仲間を選ぶ一覧の最初のカーソルに使う
  function members() { return State.partyActors(); }
  function memberBar(list, a, arrows) { return { list: list.map(function (x) { return { label: x.name, sub: 'Lv' + x.level, dead: !!x.dead }; }), cur: Math.max(0, list.indexOf(a)), arrows: !!arrows }; }
  Menu.memberBar = memberBar;
  function noteMember(a) { if (a) Menu._member = a.id; return a; }
  function lastMember(a) { var L = members(); for (var i = 0; i < L.length; i++) if (L[i].id === Menu._member) return L[i]; return a; }

  // v8.8 need：'hp' | 'mp' | 'revive' のとき、足りない量を見せて、いちばん必要な人に最初のカーソルを置く（使うかどうかは自分で決める）
  // v9.2 remember：最後に見ていた仲間に最初のカーソルを置き、選んだ仲間を覚える（ステータス・そうび・じゅもん・とくぎ）
  async function pickActor(title, includeDead, need, remember) {
    var list = State.partyActors().filter(function (a) { return includeDead || !a.dead; });
    var init = 0, best = -1;
    if (need) list.forEach(function (a, k) { var s = Actors.stats(a); var v = need === 'revive' ? (a.dead ? 1 : 0) : a.dead ? -1 : need === 'mp' ? (s.maxMp ? 1 - a.mp / s.maxMp : 0) : need === 'hp' ? 1 - a.hp / s.maxHp : 0; if (v > best) { best = v; init = k; } });
    else if (remember) { var li = list.map(function (a) { return a.id; }).indexOf(Menu._member); if (li >= 0) init = li; }
    var i = await Win.list(list.map(function (a) { var s = Actors.stats(a); var lackH = s.maxHp - a.hp, lackM = s.maxMp - a.mp; var lack = a.dead ? '' : need === 'hp' && lackH > 0 ? '　（HP あと' + lackH + '）' : need === 'mp' && lackM > 0 ? '　（MP あと' + lackM + '）' : ''; return { label: a.name, right: JOBS[a.job].name + ' Lv' + a.level, sub: 'HP ' + a.hp + '/' + s.maxHp + '  MP ' + a.mp + '/' + s.maxMp + (a.dead ? '  戦闘不能' : '') + lack }; }), { title: title, initial: init });
    return i < 0 ? null : remember ? noteMember(list[i]) : list[i];
  }
  Menu.pickActor = pickActor;

  Menu.statusHtml = function (a) {
    var s = Actors.stats(a); var j = JOBS[a.job];
    var eq = Object.keys(a.equip).map(function (slot) { return ({ weapon: '武器', armor: '鎧', shield: '盾', head: '頭', acc: '装飾' })[slot] + '：' + (a.equip[slot] ? ITEMS[a.equip[slot]].name : '―'); }).join('<br>');
    var jl = Object.keys(a.jobLevels).map(function (k) { return JOBS[k].name + 'Lv' + a.jobLevels[k]; }).join('・');
    return '<div class="rw-title">' + esc(a.name) + '　' + esc(j.name) + ' Lv' + a.level + (a.id === 'hero' && root.Growth ? '　<span class="title-badge">' + esc(root.Growth.title()) + '</span>' : '') + '</div>' + (root.Assets ? root.Assets.portraitTagFor(a, 'portrait status-portrait', 150) : '') + '<div class="stat-grid"><div>HP<b>' + a.hp + '/' + s.maxHp + '</b></div><div>MP<b>' + a.mp + '/' + s.maxMp + '</b></div><div>攻撃<b>' + s.atk + '</b></div><div>防御<b>' + s.def + '</b></div><div>素早さ<b>' + s.agi + '</b></div><div>魔力<b>' + s.mag + '</b></div></div><div class="muted small">次のレベルまで ' + (Actors.expForLevel(a.level) - a.exp) + '　状態：' + (a.dead ? '戦闘不能' : Object.keys(a.status).map(function (k) { return Combat.STATUS_NAME[k]; }).join('・') || '正常') + '</div><div class="muted small">固有：' + esc(j.trait) + '　役割：' + esc(j.role) + '</div><h3>装備</h3><div>' + eq + '</div>' + (root.Meal76 && root.Meal76.status(a) ? '<div class="small">食べ物の効果：' + esc(root.Meal76.status(a)) + '</div>' : '') + '<div class="muted small">職業レベル：' + jl + '</div>';
  };
  // v9.2 ステータス：画面を閉じずに仲間を切り替える（←→・Q／E・上の名前のタップ）。
  //   ［そうびを変える］［じゅもん・とくぎ］で、いま見ている仲間のその画面へ。閉じるとステータスへ戻る（そちらで切り替えた仲間のまま）
  function statusScreen(a) {
    var list = members(); var idx = Math.max(0, list.indexOf(a)); var node = null;
    function draw() {
      if (!node) return; a = noteMember(list[idx]); var M = memberBar(list, a, true); var mb = node.querySelector('.st-mem');
      mb.innerHTML = Win.memberBarHtml(M); Win.bindMemberBar(mb, M, go);
      node.querySelector('.st-body').innerHTML = Menu.statusHtml(a);
    }
    function go(i) { var n = list.length; if (n < 2) return; idx = ((i % n) + n) % n; draw(); }
    var html = '<div class="st-mem"></div><div class="st-body"></div><div class="st-foot"><span class="rw-act" role="button" tabindex="0" data-go="equip">そうびを変える</span><span class="rw-act" role="button" tabindex="0" data-go="skills">じゅもん・とくぎ</span><span class="rw-panel-close" role="button" tabindex="0">閉じる（Enter / ✕）</span></div>';
    var fin = null;
    return Win.panel(html, { cls: 'status-panel rw-tall', noClose: true,
      onOk: function () { if (fin) fin(0); }, onCancel: function () { if (fin) fin(-1); },
      onKey: function (k) { if (k === 'left') go(idx - 1); else if (k === 'right') go(idx + 1); else if (node && (k === 'up' || k === 'down')) node.scrollTop += k === 'down' ? 60 : -60; },
      onPage: function (d) { go(idx + d); },
      setup: function (n, close) {
        node = n; fin = close;
        n.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); close(b.getAttribute('data-go')); }); });
        var x = document.createElement('div'); x.className = 'rw-close'; x.setAttribute('role', 'button'); x.setAttribute('tabindex', '0'); x.setAttribute('aria-label', '閉じる'); x.textContent = '✕'; n.appendChild(x);
        x.addEventListener('click', function (e) { e.stopPropagation(); close(-1); });
        draw();
      } });
  }
  Menu.status = async function (a0) {
    var a = a0 ? noteMember(a0) : await pickActor('ステータスを見る', true, null, true); if (!a) return;
    while (true) {
      var r = await statusScreen(a); a = lastMember(a);
      if (r === 'equip') { await Menu.equip(a); a = lastMember(a); continue; }
      if (r === 'skills') { if (await Menu.skills(a) === 'warp') return 'warp'; a = lastMember(a); continue; }
      return;
    }
  };

  /* ---------- どうぐ（v6.4 ジャンル別・並び替え・使えるものだけ・詳細と装備比較） ---------- */
  var ITEM_SORTS = [{ id: 'kind', name: '種類順' }, { id: 'name', name: '名前順' }, { id: 'count', name: '所持数順' }];
  var TARGET_NAME = { ally: '味方1人', dead_ally: '戦闘不能の味方1人', party: '味方全員', self: '自分', enemies: '敵全体' };
  function itemTarget(it) { if (it.target) return TARGET_NAME[it.target] || ''; var e = it.effect || {}; return e.damage ? '敵全体' : e.revive ? '戦闘不能の味方1人' : e.all ? '味方全員' : e.warpTown ? '全員（移動）' : e.dungeonExit ? '全員（ダンジョンの入口の外へ）' : '味方1人'; }
  function inTown() { return World.map && (World.map.kind === 'town' || World.map.kind === 'interior'); }
  function canUseNow(id) { var it = ITEMS[id]; if (!it || it.cat !== 'consumable' || it.battleOnly) return false; if (it.effect && it.effect.dungeonExit) return !!(root.DungeonExit && root.DungeonExit.check(World.map).ok); if (it.fieldOnly && inTown() && !it.effect.warpTown) return false; return true; }
  Menu.itemDetail = function (id) {
    var it = ITEMS[id]; if (!it) return ''; var IC = root.ItemCat; var S = root.Services; var d = State.data;
    var g = IC ? IC.GENRES.filter(function (x) { return x.id === IC.of(id); })[0] : null;
    var art = root.ItemIcons ? root.ItemIcons.detailHtml(id) : '';   // v9.5 選んだ品の大きい絵（隣に名前・所持数・性能や効果）
    var h = '<div class="it-detail' + (art ? ' has-art' : '') + '">' + art + '<div class="it-text"><div class="it-name">' + esc(it.name) + ' <span class="muted small">' + esc(g ? g.name : '') + '　所持 ' + (d.inventory[id] || 0) + '</span></div>';
    h += '<div>' + esc(it.bossExclusive && it.lore ? it.lore : (it.desc || '')) + '</div>';   // v8.7 ボス固有装備は由来だけ（固有効果は下の欄に出すので二重にしない）
    if (it.cat === 'consumable') h += '<div class="muted small">使える場面：' + esc(IC.scene(id)) + '　対象：' + esc(itemTarget(it)) + (it.price ? '　値段 ' + it.price + 'G' : '') + '</div>';
    else if (it.cat === 'weapon' || it.cat === 'armor') {
      if (S && S.statLine) h += '<div class="small">' + esc(S.statLine(it)) + '</div>';
      if (S && S.equipJobs) h += '<div class="muted small">装備できる職業：' + esc((it.bossExclusive && root.BossGear ? root.BossGear.jobsText(it) : S.equipJobs(it).join('・')) || 'なし') + '</div>';
      if (S && S.compareInfo) h += '<div class="it-cmp small">' + S.compareInfo(it).replace(/^<div class="muted">[\s\S]*?<\/div>(<div>[\s\S]*?<\/div>)?/, '') + '</div>';
      if (root.BossGear) h += root.BossGear.detailHtml(id);   // v8.7 ボス固有装備：固有効果・入手先・非売品（基礎値の比較とは別の欄）
    } else h += '<div class="muted small">' + (it.subcategory === 'material' ? '素材：鍛冶などで使う。使ったり売ったりはできない' : '重要アイテム：使ったり売ったりはできない') + '</div>';
    return h + '</div></div>';
  };
  // v8.8 opts.genre：最初に開くジャンル（'hp'・'key' など）／opts.fav：最近使った・お気に入りだけ
  //      行をタップ＝選んで詳細を見る → ［使う・見る］で実行。［★お気に入り］で印をつける（State.data.ui.favItems）
  Menu.items = async function (opts) {
    opts = opts || {};
    var IC = root.ItemCat; var G = IC.GENRES;
    var tab = 0, sort = 0, usableOnly = false, favOnly = !!opts.fav, initial;
    if (opts.genre) G.forEach(function (g, k) { if (g.id === opts.genre) tab = k; });
    while (true) {
      var d = State.data; var u = Menu.ui(); var all = Object.keys(d.inventory).filter(function (id) { return ITEMS[id]; });
      var order = {}; G.forEach(function (g, i) { order[g.id] = i; });
      var ids = all.filter(function (id) { return G[tab].id === 'all' || IC.of(id) === G[tab].id; });
      if (usableOnly) ids = ids.filter(canUseNow);
      var sid = ITEM_SORTS[sort].id;
      ids.sort(function (a, b) { if (sid === 'name') return ITEMS[a].name.localeCompare(ITEMS[b].name, 'ja'); if (sid === 'count') return (d.inventory[b] || 0) - (d.inventory[a] || 0); return (order[IC.of(a)] - order[IC.of(b)]) || ((ITEMS[a].tier || 0) - (ITEMS[b].tier || 0)); });
      if (favOnly) { var rec = u.recentItems.filter(function (id) { return ids.indexOf(id) >= 0; }); ids = rec.concat(ids.filter(function (id) { return u.favItems[id] && rec.indexOf(id) < 0; })); }
      var rows = ids.map(function (id) { var it = ITEMS[id]; var tag = (u.favItems[id] ? '★' : '') + (favOnly && u.recentItems.indexOf(id) >= 0 ? '（最近）' : ''); return { label: (tag ? tag + ' ' : '') + it.name, right: '×' + d.inventory[id], sub: (it.cat === 'consumable' ? (canUseNow(id) ? '' : '【' + IC.scene(id) + '】') : '') + (it.desc || ''), cls: 'g-' + IC.of(id) + (it.cat === 'key' ? ' key' : ''), itemId: id }; });
      if (!rows.length) rows = [{ label: favOnly ? '（最近使った道具・お気に入りはまだない。道具を選んで［★お気に入り］で印をつけられる）' : usableOnly ? '（いま使えるものはない）' : '（このジャンルの持ち物はない）', disabled: true }];
      var counts = G.map(function (g) { return g.id === 'all' ? all.length : all.filter(function (id) { return IC.of(id) === g.id; }).length; });
      var key = 'items:' + G[tab].id + (favOnly ? ':fav' : '') + (usableOnly ? ':use' : '') + ':' + sort;
      var r = await Win.list(rows, { title: 'どうぐ', cls: 'items-menu rw-fixed', tabs: G.map(function (g, i) { return { label: g.name, count: counts[i] }; }), tab: tab,
        tools: [{ id: 'sort', label: '並び：' + ITEM_SORTS[sort].name }, { id: 'usable', label: '使えるものだけ', on: usableOnly }, { id: 'fav', label: '★最近・お気に入り', on: favOnly }],
        key: key, initial: initial !== undefined ? Math.min(initial, Math.max(0, ids.length - 1)) : undefined, info: function (k) { return ids[k] ? Menu.itemDetail(ids[k]) : ''; },
        okLabel: '使う・見る', actions: ids.length ? [{ id: 'fav', label: '★お気に入り' }] : [] });
      initial = undefined;
      if (r === -1) return;
      if (r && typeof r === 'object') {
        if (r.tab !== undefined) { tab = r.tab; } else if (r.tool === 'sort') sort = (sort + 1) % ITEM_SORTS.length; else if (r.tool === 'usable') usableOnly = !usableOnly; else if (r.tool === 'fav') favOnly = !favOnly;
        else if (r.action === 'fav' && ids[r.index]) { var fid = ids[r.index]; if (u.favItems[fid]) delete u.favItems[fid]; else u.favItems[fid] = true; Win.toast(ITEMS[fid].name + (u.favItems[fid] ? 'をお気に入りにした' : 'のお気に入りを外した')); initial = r.index; }
        continue;
      }
      if (!ids.length) continue; initial = r;
      var used = ids[r]; var before = d.inventory[used] || 0;
      var res = await Menu.useItem(used);
      if ((State.data.inventory[used] || 0) < before && ITEMS[used] && ITEMS[used].cat === 'consumable') Menu.noteItemUse(used);   // 実際に使えたときだけ「最近使った」に入れる
      if (res === 'warp') return 'warp';
    }
  };
  Menu.useItem = async function (id) {
    var d = State.data; var it = ITEMS[id]; if (!it) return;
    if (it.cat === 'consumable') {
      if (it.battleOnly) { await Win.message(['戦闘中にしか使えない。']); return; }
      var ef = it.effect;
      if (ef.warpTown) { var a0 = await Win.choice(it.name + 'を使って最後に泊まった町へ戻る？', ['使う', 'やめる']); if (a0 === 0) { State.addItem(it.id, -1); var li = d.lastInn; await Win.message(['翼が光り、体がふわりと浮いた……']); World.enterMap(li.map, li.x, li.y, 'down'); return 'warp'; } return; }
      if (ef.dungeonExit) return await Menu.dungeonExit(it.name, function () { State.addItem(it.id, -1); }, ['羽がふわりと舞い上がり、光の道が入口へ伸びた……']);   // v6.5 脱出の羽
      if (it.fieldOnly && inTown()) { await Win.message(['ここでは使えない（フィールドやダンジョンで使う）。']); return; }
      if (ef.all) { State.addItem(it.id, -1); State.partyActors().forEach(function (a) { if (!a.dead) { var s = Actors.stats(a); a.hp = s.maxHp; a.mp = s.maxMp; } }); await Win.message(['テントを張って休んだ。全員のHPとMPが回復した！']); if (root.Bonds) { root.Bonds.markCamp(); if (root.BondsUI && root.BondsUI.afterInn) await root.BondsUI.afterInn(); } return; }   // v9.4 テントの場所は少しのあいだ「話せる場所」（v9.4.1 知らせは小さなトーストだけ）
      if (ef.partyHeal) { State.addItem(it.id, -1); var hl = []; State.partyActors().forEach(function (a) { if (a.dead) return; var s = Actors.stats(a); var h0 = a.hp, m0 = a.mp; a.hp = Math.min(s.maxHp, a.hp + Math.round(s.maxHp * ef.partyHeal)); a.mp = Math.min(s.maxMp, a.mp + Math.round(s.maxMp * ef.partyHeal)); hl.push(a.name + '：HP+' + (a.hp - h0) + '　MP+' + (a.mp - m0)); }); if (root.Audio) root.Audio.sfx('heal'); await Win.message(['宿営セットを広げて一息ついた。'].concat(hl)); World.updateHud(); return; }   // v6.4 携帯宿営セット
      if (ef.repel) { State.addItem(it.id, -1); d.counters.repel_steps = Math.max(d.counters.repel_steps || 0, ef.repel); await Win.message(['鐘を鳴らした。魔物の気配に気づきやすくなった（' + ef.repel + '歩のあいだ、陸の敵に出会いにくい）']); return; }   // v6.4 危険察知の鐘
      if (ef.seaRepel) { State.addItem(it.id, -1); d.counters.seacharm_steps = Math.max(d.counters.seacharm_steps || 0, ef.seaRepel); await Win.message(['潮風の護符を掲げた（船に乗っているあいだ' + ef.seaRepel + '歩、海の敵に出会いにくい）']); return; }   // v6.4 潮風の護符
      if (ef.grow && root.Growth73) { var gt = await pickActor(it.name + 'を誰に使う？', true); if (!gt) return; State.addItem(it.id, -1); var gn = root.Growth73.apply(gt, ef.grow); if (root.Audio) root.Audio.sfx('heal'); await Win.message([it.name + 'を使った。', gt.name + 'の' + root.Growth73.STAT_NAME[ef.grow] + 'の最大値が ' + gn + ' 上がった！']); World.updateHud(); return; }   // v7.3
      var target = await pickActor(it.name + 'を誰に使う？', !!ef.revive, ef.revive ? 'revive' : (ef.hp || ef.fullHp) ? 'hp' : (ef.mp || ef.fullMp) ? 'mp' : null); if (!target) return;
      var s = Actors.stats(target); var lines = [];
      if (ef.revive) { if (!target.dead) { await Win.message(['効果がない。']); return; } target.dead = false; target.hp = Math.max(1, Math.round(s.maxHp * ef.revive)); target.status = {}; lines.push(target.name + 'が復活した！'); }
      else if (target.dead) { await Win.message(['倒れている仲間には効果がない。']); return; }
      if (ef.hp) { var bh = target.hp; target.hp = Math.min(s.maxHp, target.hp + ef.hp); lines.push(target.name + 'のHPが' + (target.hp - bh) + '回復した'); }
      if (ef.mp) { var bm = target.mp; target.mp = Math.min(s.maxMp, target.mp + ef.mp); lines.push(target.name + 'のMPが' + (target.mp - bm) + '回復した'); }
      if (ef.fullHp) { target.hp = s.maxHp; lines.push(target.name + 'のHPが全回復した'); }   // v6.8 伝説のポークビッツ丼
      if (ef.fullMp) { target.mp = s.maxMp; lines.push(target.name + 'のMPが全回復した'); }
      if (ef.meal && root.Meal76) root.Meal76.eat(target, it, false).forEach(function (l) { lines.push(l); });   // v7.6 パン：次の戦闘3回まで能力が上がる
      if (ef.buff) lines.push('（攻撃力などが上がる効果は、戦闘中に使ったときだけ）');
      if (ef.cure) { var cured = []; ef.cure.forEach(function (c) { if (target.status[c]) { delete target.status[c]; cured.push(Combat.STATUS_NAME[c]); } }); lines.push(cured.length ? target.name + 'の' + cured.join('・') + 'が治った' : '状態異常はなかった'); }
      State.addItem(it.id, -1); if (root.Audio) root.Audio.sfx('heal');
      await Win.message(lines); World.updateHud();
    } else if (it.cat === 'weapon' || it.cat === 'armor') {
      if (id === 'b19_crossroads_blade' && root.BossGear) { var cc87 = await Win.choice(it.name + 'をどうする？', ['装備する', '契約を選ぶ（いま：' + (root.BossGear.contractMode() === 'attack' ? '攻勢' : '守勢') + '）', 'やめる']); if (cc87 === 1) { await root.BossGear.contractChoose(); return; } if (cc87 !== 0) return; }   // v8.7 選択の契約
      var cands = State.partyActors().filter(function (x) { return Actors.canEquip(x, it.id); });
      if (!cands.length) { await Win.message(['誰も装備できない。（装備できる職業：' + ((root.Services.equipJobs && root.Services.equipJobs(it).join('・')) || 'なし') + '）']); return; }
      var ci = await Win.choice(it.name + 'を誰が装備する？', cands.map(function (x) { return x.name; }).concat(['やめる'])); if (ci < 0 || ci >= cands.length) return;
      root.Services.equipItem(cands[ci], it.id); await Win.message([cands[ci].name + 'は' + it.name + 'を装備した。']);
    } else if (typeof it.read === 'function') { await it.read(); }   // v6.9 読める重要アイテム（母の帳簿・母の手紙・千年の記録帳など）。売れない・なくならない
    else await Win.message([it.desc, it.subcategory === 'material' ? '（素材。使ったり売ったりはできない）' : '（重要アイテム。使ったり売ったりはできない）']);
  };

  // v8.8 そうび：候補を選ぶと「装備する前 → 後」を能力ごとに並べ、属性耐性・状態異常・固有効果・装備できる職業は数値と分けて出す
  //      ［おすすめ候補］は、攻撃重視・耐久重視・魔法重視のどれかで「持っている中の点数の高い候補」を一覧で見せるだけ（自動では装備しない）
  var EQ_SLOTS = ['weapon', 'armor', 'shield', 'head', 'acc']; var EQ_NAMES = { weapon: '武器', armor: '鎧', shield: '盾', head: '頭', acc: '装飾' };
  var STAT_ROWS = [['maxHp', 'HP'], ['maxMp', 'MP'], ['atk', '攻撃'], ['def', '防御'], ['agi', '素早さ'], ['mag', '魔力'], ['mdef', '魔法防御']];
  var EL_JA = { fire: '炎', ice: '氷', thunder: '雷', wind: '風', light: '光', dark: '闇' };
  function statsWith(a, slot, id) { var keep = a.equip[slot]; a.equip[slot] = id || null; try { return Actors.stats(a); } finally { a.equip[slot] = keep; } }
  function fxText(it) {
    var out = []; var fx = it.fx || {};
    if (fx.resist) out.push('属性耐性：' + Object.keys(fx.resist).map(function (k) { var v = fx.resist[k]; return (EL_JA[k] || k) + (v === 0 ? '無効' : '受けるダメージ×' + v); }).join('・'));
    if (it.immune && it.immune.length) out.push('状態異常を防ぐ：' + it.immune.map(function (k) { return (Combat.STATUS_NAME && Combat.STATUS_NAME[k]) || k; }).join('・'));
    if (fx.statusResist) out.push('状態異常にかかりにくい（' + Math.round(fx.statusResist * 100) + '%）');
    if (it.element && EL_JA[it.element]) out.push('攻撃の属性：' + EL_JA[it.element]);
    if (fx.bonusElem) out.push('追加の属性ダメージ：' + (EL_JA[fx.bonusElem.element] || fx.bonusElem.element) + ' +' + Math.round(fx.bonusElem.mult * 100) + '%');
    if (fx.pierce) out.push('相手の防御の ' + Math.round(fx.pierce * 100) + '% を無視');
    return out;
  }
  Menu.equipCompareHtml = function (a, slot, id) {
    var before = Actors.stats(a), after = statsWith(a, slot, id); var it = id ? ITEMS[id] : null; var curId = a.equip[slot];
    var rows = STAT_ROWS.map(function (r) { var b = before[r[0]] || 0, f = after[r[0]] || 0, df = f - b; return '<tr' + (df ? ' class="' + (df > 0 ? 'eq-up' : 'eq-down') + '"' : '') + '><td>' + r[1] + '</td><td>' + b + '</td><td>→</td><td><b>' + f + '</b></td><td>' + (df > 0 ? '▲+' + df : df < 0 ? '▼' + df : '±0') + '</td></tr>'; }).join('');
    // v9.5 変更先の大きい絵。隣に名前・いまの装備（小さい絵）・変わる能力（下の表と同じ数字。スマホでも絵の隣で見える）。「はずす」・空きは品物ではないので絵にしない
    var II = root.ItemIcons, arts = '';
    if (II) {
      var chg = STAT_ROWS.map(function (r) { var df = (after[r[0]] || 0) - (before[r[0]] || 0); return df ? '<span class="' + (df > 0 ? 'eq-up' : 'eq-down') + '">' + r[1] + ' ' + (df > 0 ? '▲+' + df : '▼' + df) + '</span>' : ''; }).filter(Boolean);
      arts = '<div class="eq-arts">' + (it ? II.detailHtml(id) : '<span class="eq-none">はずす</span>') + '<div class="eq-side"><div class="eq-new-name">' + esc(it ? it.name : '（はずす）') + '</div>' +
        '<div class="eq-now"><span class="muted small">いま</span>' + (curId ? II.html(curId, { size: 32 }) : '<span class="eq-none">なし</span>') + '</div>' +
        '<div class="eq-chg">' + (chg.length ? chg.join('') : '<span class="muted">能力の数値は変わらない</span>') + '</div></div></div>';
    }
    var EA = root.EquipmentAppearance, tryOn = '';   // v9.6 試着：装備のコピー（いまの装備＋この候補）で全身を見せる。決めるまで本人の装備は変わらない
    if (EA && EA.supports(a, EA.menuView(a))) { var te = {}; te[slot] = id || null; tryOn = '<div class="eq-try">' + EA.hostHtml(a.id, root.Assets ? root.Assets.portraitTagFor(a, 'portrait eq-try-img', 140) : '', { view: 'menu', equip: te, cls: 'eq-try-fig' }) + '<div class="eq-try-cap muted small">' + (id ? '試着' : 'はずすと') + '</div></div>'; }
    if (tryOn) arts = '<div class="eq-top">' + tryOn + arts + '</div>';
    var h = '<div class="eq-cmp">' + arts + '<div class="small muted">' + esc(a.name) + '：' + esc(curId ? ITEMS[curId].name : '（なし）') + ' → <b>' + esc(it ? it.name : '（はずす）') + '</b></div><table class="tbl eq-tbl"><tr><th>能力</th><th>いま</th><th></th><th>装備後</th><th>差</th></tr>' + rows + '</table>';
    if (it) {
      var ft = fxText(it); if (ft.length) h += '<div class="eq-fx"><b>数値のほかの効果</b><ul>' + ft.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      if (it.bossExclusive && root.BossGear) h += root.BossGear.detailHtml(id);
      else if (it.desc) h += '<div class="small muted">' + esc(it.desc) + '</div>';
      if (root.Services && root.Services.equipJobs) h += '<div class="small muted">装備できる職業：' + esc((it.bossExclusive && root.BossGear ? root.BossGear.jobsText(it) : root.Services.equipJobs(it).join('・')) || 'なし') + '</div>';
    }
    return h + '</div>';
  };
  var FOCUS = [{ id: 'atk', name: '攻撃重視', w: { atk: 1, agi: 0.3, def: 0.15, maxHp: 0.03 } }, { id: 'def', name: '耐久重視', w: { def: 1, mdef: 0.6, maxHp: 0.2, agi: 0.1 } }, { id: 'mag', name: '魔法重視', w: { mag: 1, maxMp: 0.15, mdef: 0.4, def: 0.15 } }];
  Menu.equipFocus = FOCUS;
  // 点数（基礎の能力だけ）。固有効果・属性耐性は点数に入れない＝一覧で注意を出す
  Menu.recommend = function (a, focusId) {
    var F = FOCUS.filter(function (f) { return f.id === focusId; })[0] || FOCUS[0]; var inv = State.data.inventory;
    function sc(slot, id) { var st = statsWith(a, slot, id); var base = statsWith(a, slot, null); var v = 0; Object.keys(F.w).forEach(function (k) { v += ((st[k] || 0) - (base[k] || 0)) * F.w[k]; }); return v; }
    return EQ_SLOTS.map(function (slot) {
      var cands = Object.keys(inv).filter(function (id) { return inv[id] > 0 && Actors.slotOf(id) === slot && Actors.canEquip(a, id); });
      var cur = a.equip[slot]; var pool = cur ? cands.concat([cur]) : cands; var best = null, bs = -Infinity;
      pool.forEach(function (id) { var v = sc(slot, id); if (v > bs + 1e-9) { bs = v; best = id; } });
      return { slot: slot, cur: cur || null, best: best, better: best && best !== cur && bs > (cur ? sc(slot, cur) : 0) + 1e-9, special: !!(best && (ITEMS[best].bossExclusive || ITEMS[best].fx || ITEMS[best].immune)) || !!(cur && (ITEMS[cur].bossExclusive || ITEMS[cur].fx || ITEMS[cur].immune)) };
    });
  };
  Menu.recommendHtml = function (a, focusId) {
    var F = FOCUS.filter(function (f) { return f.id === focusId; })[0] || FOCUS[0]; var R = Menu.recommend(a, F.id);
    return '<div class="rw-title">おすすめ候補（' + esc(F.name) + '）　' + esc(a.name) + '</div><div class="small muted">持っている装備の中で、基礎の能力の点数が高いものを並べただけです。自動では装備しません。属性耐性・状態異常・固有効果は点数に入れていないので、詳しくは各欄の比較で確かめてください。</div><table class="tbl eq-rec"><tr><th>枠</th><th>いま</th><th>候補</th></tr>' +
      R.map(function (x) { return '<tr><td>' + EQ_NAMES[x.slot] + '</td><td>' + esc(x.cur ? ITEMS[x.cur].name : '―') + '</td><td>' + (x.better ? '<b>' + esc(ITEMS[x.best].name) + '</b>' : '<span class="muted">いまのままが最も高い</span>') + (x.special ? '<div class="small eq-note">※ 特別な効果のある装備が関わる（比較で確認）</div>' : '') + '</td></tr>'; }).join('') + '</table>';
  };
  // v9.2 そうび：画面を閉じずに仲間を切り替える（←→・Q／E・上の名前のタップ）。枠の一覧はカーソルの枠のまま、候補の一覧は同じ枠のまま切り替わる
  Menu.equip = async function (a0) {
    var a = a0 ? noteMember(a0) : await pickActor('装備を変える', true, null, true); if (!a) return;
    var focus = null;
    while (true) {
      var mem = members(); if (mem.indexOf(a) < 0) return;
      var s = Actors.stats(a); var rec = focus ? Menu.recommend(a, focus) : null;
      var rows = EQ_SLOTS.map(function (sl, k) { var r0 = rec && rec[k]; return { label: EQ_NAMES[sl], right: a.equip[sl] ? ITEMS[a.equip[sl]].name : '―', sub: r0 && r0.better ? 'おすすめ候補：' + ITEMS[r0.best].name : undefined, itemId: a.equip[sl] || undefined }; });   // v9.5 装備している枠だけ絵（空き枠は品物ではない）
      rows.push({ label: 'おすすめ候補を見る', sub: '攻撃重視・耐久重視・魔法重視（見るだけ。自動では装備しない）' });
      var EAq = root.EquipmentAppearance; var eqHead = EAq && EAq.supports(a, EAq.menuView(a)) ? '<div class="eq-body-head">' + EAq.hostHtml(a.id, root.Assets ? root.Assets.portraitTagFor(a, 'portrait eq-body-img', 120) : '', { view: 'menu', cls: 'eq-body-fig' }) + '<div class="muted small">いまの装備の見た目</div></div>' : '';   // v9.6 同じ人物の全身
      var i = await Win.list(rows, { title: a.name + 'の装備　HP' + s.maxHp + ' MP' + s.maxMp + ' 攻' + s.atk + ' 防' + s.def + ' 速' + s.agi + ' 魔' + s.mag, cls: 'equip-menu', key: 'equip:slots', members: memberBar(mem, a, true), head: eqHead || undefined });
      if (i && typeof i === 'object') { if (i.member !== undefined && mem[i.member]) a = noteMember(mem[i.member]); continue; }   // 枠のカーソルは key で覚えている
      if (i < 0) return;
      if (i === EQ_SLOTS.length) { var fi = await Win.choice('どの考え方で候補を見る？', FOCUS.map(function (f) { return f.name; }).concat(['やめる'])); if (fi >= 0 && fi < FOCUS.length) { focus = FOCUS[fi].id; await Win.panel(Menu.recommendHtml(a, focus), { cls: 'eq-rec-panel' }); } continue; }
      a = await Menu.equipSlot(a, EQ_SLOTS[i], focus) || a;
    }
  };
  // 1 つの枠の候補の一覧（比較つき）。仲間を切り替えると、同じ枠・同じ装備（その仲間も装備できれば）にカーソルを置く。戻り値：最後に見ていた仲間
  Menu.equipSlot = async function (a, slot, focus) {
    var keep = null; var si = EQ_SLOTS.indexOf(slot);
    while (true) {
      var mem = members(); var inv = State.data.inventory;
      var rec = focus ? Menu.recommend(a, focus) : null; var rb = rec && rec[si] && rec[si].better ? rec[si].best : null;
      var cands = Object.keys(inv).filter(function (id) { return Actors.slotOf(id) === slot && Actors.canEquip(a, id); });
      var opts = cands.map(function (id) { var it = ITEMS[id]; var key = it.cat === 'weapon' ? 'atk' : 'def'; var cur = a.equip[slot] ? ITEMS[a.equip[slot]][key] || 0 : 0; var diff = (it[key] || 0) - cur; return { label: (id === rb ? '◎ ' : '') + it.name, right: (key === 'atk' ? '攻' : '防') + (diff >= 0 ? '+' : '') + diff, sub: it.bossExclusive && it.uniqueName ? '固有効果【' + it.uniqueName + '】' + it.uniqueText : it.desc, itemId: id }; });   // v8.7 ボス固有装備：右＝基礎値の差、下＝固有効果（分けて出す）
      if (a.equip[slot]) opts.push({ label: 'はずす', right: '' });
      var none = !opts.length; if (none) opts.push({ label: '（' + a.name + 'が' + EQ_NAMES[slot] + 'に装備できるものを持っていない）', disabled: true });
      var init = keep === null ? 0 : keep === '' ? (a.equip[slot] ? cands.length : 0) : Math.max(0, cands.indexOf(keep));
      var k = await Win.list(opts, { title: a.name + 'の' + EQ_NAMES[slot] + 'を選ぶ' + (rb ? '（◎＝おすすめ候補）' : ''), cls: 'eq-list rw-fixed', okLabel: '装備する', initial: init, members: memberBar(mem, a, true),
        info: function (q) { return none ? '<div class="muted">持っている装備の中に、' + esc(a.name) + '（' + esc(JOBS[a.job].name) + '）が' + EQ_NAMES[slot] + 'に装備できるものはない。上の名前で、ほかの仲間に切り替えられる。</div>' : Menu.equipCompareHtml(a, slot, q < cands.length ? cands[q] : null); } });
      if (k && typeof k === 'object') { if (k.member !== undefined && mem[k.member]) { keep = k.index < cands.length ? cands[k.index] : ''; a = noteMember(mem[k.member]); } continue; }
      if (k < 0 || none) return a;
      if (k >= cands.length) { State.addItem(a.equip[slot], 1); a.equip[slot] = null; return a; }
      root.Services.equipItem(a, cands[k]); if (root.Audio) root.Audio.sfx('equip');
      return a;
    }
  };

  /* ---------- じゅもん・とくぎ（v6.4 分類表示：攻撃魔法・物理特技・回復・補助） ---------- */
  var SKILL_GROUPS = [{ id: 'all', name: 'すべて' }, { id: 'magic', name: '攻撃魔法' }, { id: 'attack', name: '物理特技' }, { id: 'heal', name: '回復・蘇生' }, { id: 'support', name: '補助・妨害' }];
  function skillGroup(sk) { return sk.kind === 'magic' ? 'magic' : sk.kind === 'attack' ? 'attack' : (sk.kind === 'heal' || sk.kind === 'revive' || sk.kind === 'cure' || sk.kind === 'mp_heal') ? 'heal' : 'support'; }
  Menu.skillGroup = function (id) { return SKILLS[id] ? skillGroup(SKILLS[id]) : 'support'; };
  var SK_TARGET = { enemy: '敵1体', enemies: '敵全体', ally: '味方1人', allies: '味方全体', self: '自分', dead_ally: '戦闘不能の味方' };
  var EL_NAME = { fire: '炎', ice: '氷', thunder: '雷', wind: '風', light: '光', dark: '闇' };
  /* ---------- v9.3 サウンドテスト：BGM（js/data/bgm93.js の曲）を選んで聞く。閉じると元の曲に戻す ---------- */
  // v9.3 修正：BGM の状態（鳴らないときに見る）。0.5 秒ごとに書き直す。［もう一度鳴らす］で今の場面の曲を鳴らし直す
  Menu.bgmDiag = async function () {
    var A = root.Audio; if (!A) return;
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var body = function () {
      var s = A.settings(), st = A.bgmState ? A.bgmState() : {}, B = root.BGM93, lv = A.bgmLevel ? A.bgmLevel() : 0, db = lv > 0 ? Math.round(20 * Math.log(lv) / Math.LN10) : null;
      var tr = st.cur && B && B.TRACKS[st.cur] ? B.TRACKS[st.cur].title : (A.current && !/^file:/.test(A.current) ? 'レトロ（' + A.current + '）' : 'なし');
      var stateJa = st.state === 'loading' ? '読み込み中' + (st.wait ? '（' + st.wait + ' 秒）' : '') : ({ playing: '鳴らしている', error: '読めなかった' }[st.state] || st.state || '—');
      var rows = [['音（設定）', s.mute ? 'OFF（消している）' : 'ON'], ['音の準備（WebAudio）', A.ctx ? A.ctx.state : 'まだ（画面をクリック・タップすると準備する）'], ['BGM の種類', s.bgmKind === 'retro' ? 'レトロ' : 'フリー音源の曲'],
        ['鳴らし方', st.engine === 'buffer' ? '読み込んでから鳴らす' : st.engine === 'stream' ? '流しながら鳴らす（<audio>）' : '—'], ['場面', (A.lastKey || '—') + '（' + ((root.World && root.World.map && root.World.map.id) || '—') + '）'],
        ['曲', tr], ['状態', stateJa + (st.err ? '：' + st.err : '')], ['位置', st.t ? st.t.toFixed(1) + ' 秒' : '—'], ['出ている音の大きさ', db === null ? '0（無音）' + (st.engine === 'stream' && st.playing ? '。無音が続くときは「BGM の鳴らし方」を「読み込んでから鳴らす」に' : '') : db + ' dB　' + '■'.repeat(Math.max(0, Math.min(10, Math.round((db + 70) / 6))))]];
      return '<table class="bgmdiag-t">' + rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
    };
    var done = Win.panel('<div class="rw-title">BGM の状態</div><div class="bgmdiag-body">' + body() + '</div><div class="bgmdiag-btns"><span class="rw-chip bgmdiag-retry">もう一度鳴らす</span></div><p class="small muted">鳴らないときは、この画面の写真を送ってください（原因を調べるのに使います）。設定「BGM の鳴らし方」を切り替えると直ることがあります。</p>', { cls: 'bgm-diag rw-tall' });
    var panel = [].slice.call(document.querySelectorAll('#ui .bgm-diag')).pop();
    var timer = setInterval(function () { var b = panel && panel.querySelector('.bgmdiag-body'); if (!b || !document.body.contains(panel)) { clearInterval(timer); return; } b.innerHTML = body(); }, 500);
    var rb = panel && panel.querySelector('.bgmdiag-retry'); if (rb) rb.addEventListener('click', function (e) { e.stopPropagation(); if (A.unlock) A.unlock(); if (A.retryFiles) A.retryFiles(); var k = A.lastKey; if (k) { A.stopBgm(); A.playBgm(k); } });
    await done; clearInterval(timer);
  };
  Menu.soundTest = async function () {
    var A = root.Audio, B = root.BGM93; if (!A || !B) return;
    var back = A.lastKey; var ids = Object.keys(B.TRACKS); var where = {};
    Object.keys(B.SCENE).forEach(function (k) { var id = B.SCENE[k]; (where[id] = where[id] || []).push({ title: 'タイトル', ending: 'エンディング', battle: '戦闘', battle_late: '戦闘（後半の地方）', boss: 'ボス戦', boss_area: 'ボスの近く', church: '教会', tavern: '酒場', castle: '城', sea: '船', sky: '飛空艇' }[k] || k); });
    Object.keys(B.TOWN).forEach(function (k) { var m = root.MAP_DEFS && root.MAP_DEFS[k]; if (m) (where[B.TOWN[k]] = where[B.TOWN[k]] || []).push(m.name); });
    Object.keys(B.FIELD).forEach(function (k) { var m = root.MAP_DEFS && root.MAP_DEFS[k]; if (m) (where[B.FIELD[k]] = where[B.FIELD[k]] || []).push(m.name); });
    B.DUNGEON_POOL.forEach(function (id) { (where[id] = where[id] || []).push('ダンジョン'); });
    var st = State.data.settings; var cur = 0;
    if (st.mute) await Win.message(['音が OFF になっている。設定の「音（BGM・効果音）」を ON にすると聞ける。']);
    while (true) {
      var i = await Win.list(ids.map(function (id) { var w = where[id] || []; return { label: B.TRACKS[id].title, right: A.bgmFile === id ? '♪ 再生中' : '', sub: w.length ? w.slice(0, 4).join('・') + (w.length > 4 ? ' ほか' : '') : '' }; }), { title: 'BGM を聞く（' + ids.length + ' 曲・0 A.D.）', cls: 'soundtest', initial: cur, key: 'soundtest' });
      if (i < 0 || typeof i !== 'number') break;
      cur = i; A.playFile && A.playFile(ids[i]);
    }
    if (A.stopBgm) { A.stopBgm(); if (back) A.playBgm(back); }
  };

  /* ---------- v9.3 さくせん（仲間ごとのオート戦闘の考え方。js/rpg/combat.js の Combat.TACTICS） ---------- */
  Menu.tactics = async function () {
    var T = Combat.TACTICS;
    while (true) {
      var L = State.partyActors();
      var rows = L.map(function (a) { var t = Combat.tacticOf(a); return { label: a.name, right: Combat.tacticName(a), sub: T.filter(function (x) { return x.id === t; })[0].desc }; });
      rows.push({ label: 'みんな同じ作戦にする', sub: '戦闘メンバー全員の作戦をまとめて変える' });
      var i = await Win.list(rows, { title: 'さくせん（オート戦闘での考え方）', cls: 'tactics-menu', key: 'tactics' });
      if (i < 0 || typeof i !== 'number') return;
      var who = i < L.length ? [L[i]] : L; var curT = i < L.length ? Combat.tacticOf(L[i]) : null;
      var ti = await Win.list(T.map(function (x) { return { label: x.name, right: x.id === curT ? '今の作戦' : '', sub: x.desc }; }), { title: (i < L.length ? L[i].name + 'の作戦' : 'みんなの作戦'), initial: Math.max(0, T.map(function (x) { return x.id; }).indexOf(curT || 'balance')) });
      if (ti >= 0 && ti < T.length) { who.forEach(function (a) { a.tactic = T[ti].id; }); if (Win.toast) Win.toast((i < L.length ? L[i].name : 'みんな') + '：' + T[ti].name); }
    }
  };
  /* ---------- v9.3 まんたん：回復の呪文（MPあたりの回復が大きい順）と、選べば回復の道具で、生きている仲間のHPを満タンにする ----------
     ・道具は HP だけを回復するもの（MP も回復する・食事の効果・全回復（999）・蘇生の道具は使わない）。足りない量にいちばん近いものから
     ・戦闘不能の仲間は回復しない（教会か蘇生の呪文で）。最初に確かめる */
  function lackHp(x) { return Math.max(0, Actors.stats(x).maxHp - x.hp); }
  Menu.fullHealItem = function (id) { var it = ITEMS[id]; var ef = it && it.effect; return !!(it && it.cat === 'consumable' && ef && ef.hp > 0 && ef.hp < 999 && !ef.mp && !ef.meal && !ef.revive && !ef.all && !ef.buff && !ef.cure && !ef.partyHeal && !ef.fullHp && !it.battleOnly && !it.fieldOnly); };
  Menu.fullHeal = async function () {
    var party = State.partyActors(); var alive = party.filter(function (a) { return !a.dead; }); var dead = party.filter(function (a) { return a.dead; });
    var need = alive.reduce(function (t, a) { return t + lackHp(a); }, 0);
    if (!need) { await Win.message(['みんなのHPは満タンだ。' + (dead.length ? '（戦闘不能：' + dead.map(function (a) { return a.name; }).join('・') + '。教会か蘇生の呪文で）' : '')]); return; }
    var c = await Win.choice('まんたん：足りないHPは合計 ' + need + '。どうやって回復する？', ['呪文と道具で回復する', '呪文だけで回復する', 'やめる']);
    if (c !== 0 && c !== 1) return;
    var res = Menu.fullHealRun(c === 0);
    if (root.Audio && (res.spells.length || res.items.length)) root.Audio.sfx('heal');
    await Win.message(res.lines); if (World.updateHud) World.updateHud();
  };
  // 実行（画面なし。テストからも呼ぶ）。戻り値 { spells, items, lines, full }
  Menu.fullHealRun = function (useItems) {
    var party = State.partyActors(); var alive = party.filter(function (a) { return !a.dead; }); var dead = party.filter(function (a) { return a.dead; });
    var cost = function (a, sk) { return Combat.skillCost ? Combat.skillCost(a, sk) : sk.mp; };
    var spellLog = {}, itemLog = {}, order = [];
    for (var n = 0; n < 300; n++) {
      var hurt = alive.filter(function (x) { return lackHp(x) > 0; }).sort(function (p, q) { return lackHp(q) - lackHp(p); }); if (!hurt.length) break;
      var best = null;
      alive.forEach(function (ca) {
        if (ca.status && ca.status.silence) return;
        Actors.allSkills(ca).forEach(function (id) {
          var sk = SKILLS[id]; if (!sk || sk.kind !== 'heal' || (sk.target !== 'ally' && sk.target !== 'allies')) return; var mp = cost(ca, sk); if (mp > ca.mp) return;
          var ex = Combat.fieldHealExpect(ca, sk); var eff = sk.target === 'allies' ? alive.reduce(function (t, x) { return t + Math.min(ex, lackHp(x)); }, 0) : Math.min(ex, lackHp(hurt[0]));
          var score = eff / Math.max(1, mp); if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && mp < best.mp)) best = { ca: ca, sk: sk, mp: mp, score: score };
        });
      });
      if (best) {
        best.ca.mp -= best.mp; var tg = best.sk.target === 'allies' ? alive : [hurt[0]];
        tg.forEach(function (t) { var st = Actors.stats(t); t.hp = Math.min(st.maxHp, t.hp + Combat.fieldHealAmount(best.ca, best.sk)); });
        var k = best.ca.id + '|' + best.sk.id; if (!spellLog[k]) { spellLog[k] = { a: best.ca, sk: best.sk, n: 0, mp: 0 }; order.push(['s', k]); } spellLog[k].n++; spellLog[k].mp += best.mp; continue;
      }
      if (!useItems) break;
      var inv = State.data.inventory; var t0 = hurt[0], L0 = lackHp(t0);
      var ids = Object.keys(inv).filter(function (id) { return inv[id] > 0 && Menu.fullHealItem(id); });
      if (!ids.length) break;
      var enough = ids.filter(function (id) { return ITEMS[id].effect.hp >= L0; }).sort(function (p, q) { return ITEMS[p].effect.hp - ITEMS[q].effect.hp || (ITEMS[p].price || 0) - (ITEMS[q].price || 0); });
      var pick = enough.length ? enough[0] : ids.sort(function (p, q) { return ITEMS[q].effect.hp - ITEMS[p].effect.hp; })[0];
      var stt = Actors.stats(t0); t0.hp = Math.min(stt.maxHp, t0.hp + ITEMS[pick].effect.hp); State.addItem(pick, -1);
      if (!itemLog[pick]) { itemLog[pick] = 0; order.push(['i', pick]); } itemLog[pick]++;
    }
    var lines = [], spells = [], items = [];
    order.forEach(function (o) { if (o[0] === 's') { var L = spellLog[o[1]]; spells.push({ actorId: L.a.id, skillId: L.sk.id, n: L.n, mp: L.mp }); lines.push(L.a.name + 'は' + L.sk.name + 'を' + L.n + '回唱えた（MP−' + L.mp + '）'); } else { items.push({ id: o[1], n: itemLog[o[1]] }); lines.push(ITEMS[o[1]].name + 'を' + itemLog[o[1]] + '個使った'); } });
    var left = alive.filter(function (x) { return lackHp(x) > 0; });
    if (!left.length) lines.push('生きている仲間のHPが満タンになった！');
    else lines.push((spells.length || items.length ? '' : '回復の呪文を使える仲間・MP' + (useItems ? '・道具' : '') + 'がない。') + '満タンにできなかった：' + left.map(function (x) { return x.name + ' HP' + x.hp + '/' + Actors.stats(x).maxHp; }).join('　'));
    if (dead.length) lines.push('戦闘不能の仲間（' + dead.map(function (a) { return a.name; }).join('・') + '）は回復できない（教会か蘇生の呪文で）。');
    return { spells: spells, items: items, lines: lines, full: !left.length };
  };

  // v9.2 じゅもん・とくぎ：画面を閉じずに仲間を切り替える（Q／E・上の名前のタップ。←→ は今までどおり分類のタブ）
  Menu.skills = async function (a0) {
    var a = a0 ? noteMember(a0) : await pickActor('じゅもん・とくぎを見る', true, null, true); if (!a) return;
    var tab = 0;
    while (true) {
      var mem = members(); var cur = a;
      var list = root.Actors.allSkills(a).filter(function (s) { return SKILLS[s]; });
      var ids = list.filter(function (s) { return SKILL_GROUPS[tab].id === 'all' || skillGroup(SKILLS[s]) === SKILL_GROUPS[tab].id; });
      var rows = ids.map(function (s) { var sk = SKILLS[s]; return { label: sk.name, right: 'MP' + (root.Combat && root.Combat.skillCost ? root.Combat.skillCost(cur, sk) : cur.job === 'sage' ? Math.ceil(sk.mp * 0.8) : sk.mp), sub: (SK_TARGET[sk.target] || '') + (sk.element && EL_NAME[sk.element] ? '・' + EL_NAME[sk.element] : '') + '　' + sk.desc }; });
      if (!rows.length) rows = [{ label: list.length ? '（この分類の特技はない）' : '（' + a.name + 'はまだ呪文・特技を覚えていない）', disabled: true }];
      var counts = SKILL_GROUPS.map(function (g) { return g.id === 'all' ? list.length : list.filter(function (s) { return skillGroup(SKILLS[s]) === g.id; }).length; });
      var r = await Win.list(rows, { title: a.name + 'の特技', cls: 'skills-menu rw-fixed', tabs: SKILL_GROUPS.map(function (g, i) { return { label: g.name, count: counts[i] }; }), tab: tab, members: memberBar(mem, a, false) });
      if (r === -1) return;
      if (r && typeof r === 'object') { if (r.tab !== undefined) tab = r.tab; else if (r.member !== undefined && mem[r.member]) a = noteMember(mem[r.member]); continue; }
      var fsk = typeof r === 'number' && ids[r] && SKILLS[ids[r]];   // v6.5 フィールドで使う呪文（帰還の術）
      if (fsk && fsk.field === 'dungeon_exit') { var res = await Menu.castField(a, fsk); if (res === 'warp') return 'warp'; }
    }
  };
  // v6.5 フィールドで唱える呪文：今は「帰還の術」（ダンジョンの入口の外へ）。賢者は消費MPが8割（戦闘と同じ）
  Menu.castField = async function (a, sk) {
    var cost = root.Combat && root.Combat.skillCost ? root.Combat.skillCost(a, sk) : a.job === 'sage' ? Math.ceil(sk.mp * 0.8) : sk.mp;
    if (a.dead) { await Win.message([a.name + 'は戦闘不能で、呪文を唱えられない。']); return; }
    if (a.mp < cost) { await Win.message(['MPが足りない。（' + sk.name + '：MP' + cost + '　' + a.name + '：MP' + a.mp + '）']); return; }
    return await Menu.dungeonExit(a.name + 'の' + sk.name, function () { a.mp -= cost; World.updateHud(); }, [a.name + 'は' + sk.name + 'を唱えた！', '光の道が入口へ伸びた……']);
  };
  // v6.5 脱出の羽・帰還の術の共通：使えるか確かめ → 行き先を見せて確認 → 消費 → 入口の外へ
  Menu.dungeonExit = async function (what, consume, lines) {
    var DX = root.DungeonExit; if (!DX) return;
    var ck = DX.check(World.map);
    if (!ck.ok) { await Win.message([ck.reason]); return; }
    var c = await Win.choice(what + 'で「' + ck.dest.label + '」へ戻る？', ['使う', 'やめる']); if (c !== 0) return;
    consume(); await Win.message(lines);
    DX.go(ck.dest); return 'warp';
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
      var EA = root.EquipmentAppearance; if (EA && EA.supports(a, EA.menuView(a))) tag = EA.hostHtml(a.id, tag || '<div class="pt-noart">立ち絵なし</div>', { view: 'menu', fit: 'body', cls: 'ea-pt' });   // v9.6 装備した見た目（合成ができるまでは今までの立ち絵）
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
        var ic = it && root.ItemIcons ? root.ItemIcons.html(id, { size: 44 }) : '';   // v9.5 装備している品だけ絵
        return '<div class="pt-eq' + (ic ? ' has-icon' : '') + '">' + ic + (ic ? '<div>' : '') + '<span class="pt-slot">' + SLOT_NAME[sl] + '</span><b>' + (it ? esc(it.name) : '―') + '</b>' + (ic ? '</div>' : '') + (it ? '<div class="muted small">' + esc(root.Services && root.Services.statLine ? root.Services.statLine(it) : '') + (it.desc ? '　' + esc(it.desc) : '') + '</div>' : '') + '</div>'; }).join('');
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
      node.querySelector('.pt-acts').innerHTML = (canMove ? '<span class="pt-btn" data-mv="-1"' + (pos <= 1 ? ' data-off="1"' : '') + '>▲ 隊列で前へ</span><span class="pt-btn" data-mv="1"' + (pos >= d.party.length - 1 ? ' data-off="1"' : '') + '>▼ 隊列で後ろへ</span>' : '<span class="muted small">' + (a.id === 'hero' ? '主人公は隊列の先頭です' : '待機メンバーとの入れ替えは酒場で行えます') + '</span>') +
        (pos >= 0 ? '<span class="pt-btn pt-go" data-go="equip">そうびを変える</span>' : '');   // v9.2 この仲間の装備の画面へ（閉じると、なかまの画面へ戻る）
      node.querySelectorAll('.pt-row').forEach(function (r) { r.addEventListener('click', function (e) { e.stopPropagation(); if (busy) return; var i = order.indexOf(r.getAttribute('data-id')); if (i >= 0) { sel = i; render(); } }); });
      node.querySelectorAll('.pt-btn').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); if (busy || b.getAttribute('data-off')) return; if (b.getAttribute('data-go')) { if (done) done({ go: b.getAttribute('data-go') }); return; } move(parseInt(b.getAttribute('data-mv'), 10)); }); });   // v9.2 隊列の確認（小さい窓）を開いている間は、後ろの画面を押しても動かない
      var cr = node.querySelector('.pt-row.cur'); if (cr && cr.scrollIntoView) try { cr.scrollIntoView({ block: 'nearest' }); } catch (e) { }
    }
    function move(delta) { var a = cur(); if (a && Menu.moveInParty(a.id, delta)) { order = Menu.partyOrder(); sel = order.indexOf(a.id); render(); if (root.World && root.World.updateHud) root.World.updateHud(); } }
    var busy = false;
    async function formation() { var a = cur(); if (!a || d.party.indexOf(a.id) < 1 || busy) return; busy = true; var c = await Win.choice(a.name + 'の隊列', ['前へ', '後ろへ', 'やめる']); busy = false; if (c === 0) move(-1); else if (c === 1) move(1); }
    var html = '<div class="pt-wrap"><div class="pt-list"></div><div class="pt-art"></div><div class="pt-side"><div class="pt-tabs">' + PT_TABS.map(function (t, i) { return '<span class="pt-tab" data-t="' + i + '">' + esc(t) + '</span>'; }).join('') + '</div><div class="pt-body"></div><div class="pt-acts"></div></div></div><div class="pt-foot"><span class="muted small">↑↓（Q・E）仲間　←→ タブ　Enter 隊列の変更　Esc 閉じる</span><span class="pt-close">閉じる</span></div>';
    while (true) {
      node = null; done = null;
      var res = await Win.panel(html, { cls: 'party-screen rw-tall', noClose: true,
        onCancel: function () { if (!busy && done) done(-1); }, onOk: function () { formation(); },
        onKey: function (k) { if (busy) return; if (k === 'up') { sel = (sel + order.length - 1) % order.length; render(); } else if (k === 'down') { sel = (sel + 1) % order.length; render(); } else if (k === 'left') { tab = (tab + PT_TABS.length - 1) % PT_TABS.length; render(); } else if (k === 'right') { tab = (tab + 1) % PT_TABS.length; render(); } },
        onPage: function (dd) { if (busy) return; sel = (sel + dd + order.length) % order.length; render(); },   // v9.2 Q・E でも仲間を切り替える（ほかの画面とそろえる）
        setup: function (n, fin) { node = n; done = fin; n.querySelectorAll('.pt-tab').forEach(function (t) { t.addEventListener('click', function (e) { e.stopPropagation(); if (busy) return; tab = parseInt(t.getAttribute('data-t'), 10); render(); }); }); n.querySelector('.pt-close').addEventListener('click', function (e) { e.stopPropagation(); if (busy) return; fin(-1); }); render(); } });
      if (res && res.go === 'equip') { var ea = cur(); if (ea && d.party.indexOf(ea.id) >= 0) { await Menu.equip(ea); order = Menu.partyOrder(); var si = order.indexOf(Menu._member); if (si >= 0) sel = si; } continue; }   // v9.2 装備の画面で切り替えた仲間のまま戻る
      return;
    }
  };

  Menu.quests = async function () {
    var d = State.data; var ids = Object.keys(d.quests);
    if (!ids.length) { await Win.message(['受注しているクエストはない。']); return; }
    ids.sort(function (a, b) { var sa = d.quests[a].state === 'done' ? 1 : 0, sb = d.quests[b].state === 'done' ? 1 : 0; return sa - sb; });
    var N = root.Nav, init = 0;
    while (true) {   // v6.5 サブクエストを選ぶと「次の目的地」で案内できる
      var r = await Win.list(ids.map(function (id) { var q = QUESTS[id]; var st = d.quests[id]; var prog = root.Events.questProgress(id); var obj = st.state === 'active' ? root.Events.questObjective(id) : ''; var tr = d.navTrack === id && st.state === 'active'; return { label: (q.main ? '【メイン】' : q.master ? '【師匠】' : '【サブ】') + q.title + (tr ? '　［案内中］' : ''), right: st.state === 'done' ? '達成' : (prog || '進行中'), sub: (obj ? obj + '　' : '') + q.desc + (N && N.canTrack(id) && !tr ? '　（選ぶと「次の目的地」で案内できる）' : ''), cls: st.state === 'done' ? 'done' : '' }; }), { title: 'クエスト', initial: init });
      if (typeof r !== 'number' || r < 0) return; init = r; var qid = ids[r];
      if (!N || !N.canTrack(qid)) continue;
      var on = d.navTrack === qid;
      var c = await Win.choice('「' + QUESTS[qid].title + '」', [on ? '案内をやめる（メインの目的地に戻す）' : 'このクエストを「次の目的地」で案内する', 'もどる']);
      if (c === 0) { N.track(on ? null : qid); Win.toast(on ? '案内をメインの目的地に戻した' : '「' + QUESTS[qid].title + '」を案内する'); if (World.updateHud) World.updateHud(); }
    }
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
      if (b.scanned || kills >= 1) detail += '<div class="bs-line muted">HP ' + e.hp + '　攻 ' + e.atk + '　防 ' + e.def + '　速 ' + e.agi + '　EXP ' + e.exp + '　' + e.gold + 'G' + (e.boss ? '' : '<br>（基本の値。出る地域が先へ進むほど、HP・攻撃・守備は上がる）') + '</div>';
      if (known && e.desc) detail += '<div class="bs-desc">' + esc(e.desc) + '</div>';
      return '<div class="bs-row' + (e.boss ? ' boss' : '') + '" data-id="' + id + '"><div class="bs-no">' + (n + 1) + '</div><div class="bs-img" data-id="' + id + '"></div><div class="bs-body"><div class="bs-name">' + esc(e.name) + (e.boss ? ' <span class="bs-tag">BOSS</span>' : '') + (e.rare ? ' <span class="bs-tag rare">レア</span>' : '') + '<span class="bs-kills">討伐 ' + kills + '</span></div><div class="bs-sub muted">' + esc(e.family) + '　' + esc(e.area) + (e.legacyName && e.legacyName !== e.name ? '　（以前の名前：' + esc(e.legacyName) + '）' : '') + '</div>' + detail + '</div></div>';
    }).join('');
    var html = '<div class="rw-title">モンスター図鑑</div><div class="bs-head">発見 ' + seen.length + '/' + ids.length + '（' + pct + '%）　討伐済み ' + defeated.length + '種<div class="bar"><span style="width:' + pct + '%"></span></div></div><div class="bs-list">' + rows + '</div>';
    var io = null;   // 図鑑の新しい画像：見えた欄から読む（閉じたら止める）
    await Win.panel(html, { cls: 'bestiary', setup: function (node) {
      var BA = root.BossArt; var bossQ = Promise.resolve();
      // 通常敵164体の新しい画像（js/core/enemyart.js）：画面に見えた欄から読む（全部を一度に読まない）。読めなければ従来の絵
      var EA = root.EnemyArt; var eaBox = [];
      var showNew = function (box) { var id = box.getAttribute('data-id'); return EA.load(id).then(function (v) { if (!box.isConnected) return; if (!v) { drawOld(box, ENEMIES[id]); return; } var f = Math.min(104 / v.img.width, 104 / v.img.height, 1); var c3 = document.createElement('canvas'); c3.width = Math.max(1, Math.round(v.img.width * f)); c3.height = Math.max(1, Math.round(v.img.height * f)); var x3 = c3.getContext('2d'); x3.imageSmoothingEnabled = true; x3.imageSmoothingQuality = 'high'; x3.drawImage(v.img, 0, 0, c3.width, c3.height); c3.className = 'bs-canvas bs-new'; box.innerHTML = ''; box.appendChild(c3); }); };
      io = (EA && typeof root.IntersectionObserver === 'function') ? new root.IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); showNew(en.target); } }); }, { root: null, rootMargin: '200px' }) : null;
      node.querySelectorAll('.bs-img[data-id]').forEach(function (box) {
        var e = ENEMIES[box.getAttribute('data-id')];
        if (EA && EA.adopted(e.id)) { if (io) io.observe(box); else eaBox.push(box); return; }
        drawOld(box, e);
      });
      eaBox.reduce(function (q, box) { return q.then(function () { return showNew(box); }); }, Promise.resolve());   // IntersectionObserver がない環境：上から順に1枚ずつ
      function drawOld(box, e) {
        var img;
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
      }
    } });
    if (io) io.disconnect();
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
  // v8.8 トレード成績・振り返り：いまある記録から集計するだけ（記録がない項目は「まだ記録がない」と出す。作り話の数字は出さない）
  Menu.tradeRecordHtml = function () {
    var d = State.data; var TE = root.TradeEval; var h = '<div class="rw-title">トレード成績・振り返り</div>';
    var r = TE && TE.rank ? TE.rank(d.trade) : null; if (r) h += '<div>トレーダーランク <b>' + esc(r.letter) + '</b>　' + esc(r.title || '') + '<span class="muted small">（詳細モードの試練・講義の分野別の正解率から）</span></div>';
    var sum = TE && TE.topicSummary ? TE.topicSummary(d.trade) : [];
    var weak = TE && TE.weakTopics ? TE.weakTopics(d.trade).filter(function (t) { return t.plays > 0; }).slice(0, 3) : [];
    h += '<h3 class="tr-h">苦手そうな分野（3 回以上の挑戦で正解率が低い順）</h3>' + (weak.length ? '<ul class="small">' + weak.map(function (t) { return '<li>' + esc(t.label) + '：正解 ' + t.correct + '/' + t.plays + (t.level ? '（' + esc(t.level) + '）' : '') + '</li>'; }).join('') + '</ul>' : '<div class="small muted">まだ記録が少ない（詳細モードの試練で分野ごとの記録がたまる）</div>');
    var untried = sum.filter(function (t) { return !t.plays; }).map(function (t) { return t.label; }); if (untried.length) h += '<div class="small muted">まだ挑戦していない分野：' + esc(untried.join('・')) + '</div>';
    var u = d.ultimate && d.ultimate.stats; if (u) { var nT = u.trades || 0; h += '<h3 class="tr-h">チャートバトル（必殺技・修行・試験・対戦）</h3><div class="small">エントリー ' + nT + ' 回（利益 ' + (u.wins || 0) + '・損失 ' + (u.losses || 0) + '・同値 ' + (u.flats || 0) + '）／自分で見送り ' + Math.max(0, (u.skips || 0) - (u.autoSkips || 0)) + ' 回・時間切れ ' + (u.autoSkips || 0) + ' 回' + (nT ? '／損益÷ATR の合計 ' + (Math.round((u.sumR || 0) * 100) / 100) : '') + '</div><div class="small muted">※ 1 回ごとの損益は運にも左右されます。判断の質は振り返りの「③ 判断の過程の評価」で確かめてください。</div>'; }
    var q = d.trade && d.trade.quick; h += '<h3 class="tr-h">戦闘中の相場の試練（簡易）</h3>' + (q && q.plays ? '<div class="small">' + q.plays + ' 回　行動が場面の読みどおり ' + q.actionOk + ' 回・理由も合った ' + q.reasonOk + ' 回</div>' : '<div class="small muted">まだ記録がない</div>');
    // 学習した日（記録に日時が残っているものだけ：チャートの振り返り・簡易の試練）
    var days = {}; var addT = function (t) { if (!t) return; var dt = new Date(t); days[dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate()] = true; };
    ((d.ultimate && d.ultimate.reviews) || []).forEach(function (x) { addT(x.t); }); ((q && q.log) || []).forEach(function (x) { addT(x.t); });
    var nowD = new Date(); var streak = 0; for (var k = 0; k < 60; k++) { var dd = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate() - k); var key = dd.getFullYear() + '-' + (dd.getMonth() + 1) + '-' + dd.getDate(); if (days[key]) streak++; else if (k > 0) break; }
    h += '<h3 class="tr-h">続けて学習した日</h3><div class="small">' + (Object.keys(days).length ? '記録のある日 ' + Object.keys(days).length + ' 日・いまの連続 ' + streak + ' 日' : 'まだ記録がない') + '<span class="muted">（日時が残る記録＝チャートの振り返り（最近 ' + ((root.Ultimates && root.Ultimates.REVIEW_MAX) || 10) + ' 回分）・簡易の試練（最近 20 回分）だけから数える）</span></div>';
    if (weak.length) h += '<div class="small">おすすめ：修行場の「復習」で <b>' + esc(weak[0].label) + '</b> を練習する</div>';
    return h;
  };
  Menu.tradeRecord = async function () {
    while (true) {
      var d = State.data; var nRev = ((d.ultimate && d.ultimate.reviews) || []).length;
      var acts = [{ label: '振り返りの一覧（判断した時点とその後を並べる）', right: nRev + '件', disabled: !nRev || !root.TraderDojo, sub: nRev ? undefined : 'チャートバトルをすると増える' }, { label: '詳しい成績（詳細モードの試練）' }, { label: 'トレーダーランク' }, { label: '閉じる' }];
      var i = await Win.list(acts, { title: 'トレード成績・振り返り', head: Menu.tradeRecordHtml(), cls: 'trade-record' });
      if (i < 0 || i === 3) return;
      if (i === 0) await root.TraderDojo.reviews(); else if (i === 1) await root.TradeUI.showRecord(); else if (i === 2) await Menu.rankPanel();
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
      var bg87 = root.BossGear ? root.BossGear.collection() : [];
      var i = await Win.choice('図鑑', ['モンスター図鑑', 'アイテム図鑑', '職業一覧', '冒険の記録', 'オーパーツ（' + (root.Ooparts ? root.Ooparts.count() + '/' + root.Ooparts.total() : '0') + '）', 'カジノ・学院の記録', 'クイズモンスター図鑑', 'ボス固有装備（' + bg87.filter(function (x) { return x.claimed || x.owned; }).length + '/' + bg87.length + '）', 'やめる']);
      if (i < 0 || i === 8) return;
      if (i === 7) { if (root.BossGear) await root.BossGear.listPanel(); continue; }   // v8.7 ボス固有装備の一覧（分母はいま遊べるボスだけ）
      if (i === 6) { if (root.QuizBattleUI) await root.QuizBattleUI.bestiary(); continue; }   // トレードクイズモンスター5体
      if (i === 4) { if (root.OopartsUI) await root.OopartsUI.list(); continue; }   // v6.1
      if (i === 5) { await Menu.studyRecord(); continue; }   // v6.1
      var d = State.data;
      if (i === 0) { await Menu.bestiary(); }
      else if (i === 1) { var iids = root.ITEM_LIST; await Win.list(iids.map(function (id) { var it = ITEMS[id]; var known = d.inventory[id] || d.flags['seen_item_' + id] || State.partyActors().some(function (a) { return Object.keys(a.equip).some(function (s) { return a.equip[s] === id; }); }); return known ? { label: it.name, right: ({ weapon: '武器', armor: '防具', consumable: '道具', key: '大事なもの' })[it.cat], sub: it.desc || '', itemId: id } : { label: '？？？', disabled: true, sub: '未入手' }; }), { title: 'アイテム図鑑' }); }   // v9.5 知っている行だけ絵（未入手は名前も絵も出さない）
      else if (i === 2) { await Win.list(root.JOB_LIST.map(function (j) { var J = JOBS[j]; return { label: J.name, right: J.role, sub: J.desc + '　固有：' + J.trait }; }), { title: '職業一覧' }); }
      else if (i === 3) { var ch = root.STORY_CHAPTERS.filter(function (c) { return !c.flag || d.flags[c.flag]; }); var cur = ch[ch.length - 1]; await Win.panel('<div class="rw-title">冒険の記録</div><div>現在：' + esc(cur.title) + '</div><div class="muted small">歩数 ' + d.steps + '　訪れた場所 ' + Object.keys(d.visited).length + '　開けた宝箱 ' + Object.keys(d.chests).length + '　仲間 ' + (Object.keys(d.companions).length + 1) + '人　預金 ' + d.bank + 'G</div><div class="muted small">クリスタルの欠片：' + (d.inventory.crystal_shard || 0) + (d.flags.shard_returned ? '（王に届けた）' : '') + '</div>'); }
    }
  };

  Menu.save = async function () {
    var slots = [1, 2, 3].map(function (s) { return root.SaveUI ? root.SaveUI.slotItem(s) : { label: 'スロット' + s }; });   // v6.5 名前・レベル・場所・日時・プレイ時間・クラウドの状態
    var i = await Win.list(slots, { title: 'セーブ（オートセーブも常時動作）', key: 'save:slots' });
    if (i < 0) return;
    if (State.slotInfo && State.slotInfo(i + 1)) { var cf = await Win.choice('スロット' + (i + 1) + 'のデータに上書きする？（元のデータは消える）', ['上書きする', 'やめる']); if (cf !== 0) return; }   // v8.8 1 回タップで選べるので、上書きの前に確かめる
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

  // v8.8 設定：「音」「表示」「操作」「戦闘・トレード」「データ管理」に分け、項目を選ぶと値の一覧から今の値を確かめて選ぶ（押すたびに回る方式をやめた）
  //      保存する値・名前は今までと同じ（旧セーブの値もそのまま読める）。一覧にない古い値はそのまま一覧に足して出す
  var SET_TABS = [{ id: 'sound', label: '音' }, { id: 'view', label: '表示' }, { id: 'ctrl', label: '操作' }, { id: 'battle', label: '戦闘・トレード' }, { id: 'data', label: 'データ管理' }];
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function volOpts(cur) { var o = []; for (var k = 0; k <= 10; k++) o.push(k / 10); if (o.every(function (x) { return Math.abs(x - cur) > 1e-6; })) o.push(cur); o.sort(function (x, y) { return x - y; }); return o.map(function (v) { return { v: v, l: pct(v) }; }); }
  Menu.SETTINGS = function () {
    var st = State.data.settings; var A = root.Audio;
    var L = [
      { cat: 'sound', label: '音（BGM・効果音）', key: 'mute', opts: [{ v: false, l: 'ON' }, { v: true, l: 'OFF' }], after: function () { if (A) { A.apply(); if (!st.mute) A.sfx('coin'); } } },
      { cat: 'sound', label: 'BGM音量', key: 'bgm', opts: volOpts(st.bgm), fmt: pct, after: function () { if (A) A.apply(); } , note: '選ぶとすぐに今の曲の音量が変わる' },
      { cat: 'sound', label: '効果音音量', key: 'se', opts: volOpts(st.se), fmt: pct, after: function () { if (A) { A.apply(); A.sfx('coin'); } }, note: '選ぶと試しの音を鳴らす' },
      { cat: 'sound', label: 'BGM の種類', key: 'bgmKind', def: 'file', opts: [{ v: 'file', l: 'フリー音源の曲（0 A.D.）' }, { v: 'retro', l: 'レトロ（自作の電子音）' }], after: function () { if (A && A.lastKey) { var k = A.lastKey; A.stopBgm(); A.playBgm(k); } }, note: '曲は場所（町・フィールド・ダンジョン）と戦闘で変わる。読めないときは自作の曲になる' },   // v9.3
      { cat: 'sound', label: 'BGM の鳴らし方', key: 'bgmEngine', def: 'auto', opts: [{ v: 'auto', l: '自動（読み込んでから鳴らす）' }, { v: 'buffer', l: '読み込んでから鳴らす（効果音と同じ仕組み）' }, { v: 'stream', l: '流しながら鳴らす（<audio>。端末によっては音が出ない）' }], set: function (v) { if (v === 'auto') delete st.bgmEngine; else st.bgmEngine = v; }, after: function () { if (A && A.retryFiles) A.retryFiles(); if (A && A.lastKey) { var k = A.lastKey; A.stopBgm(); A.playBgm(k); } }, note: 'BGM が鳴らないときに切り替える。読み込んでから鳴らすは、曲を全部読み込むまで（1〜数秒）鳴らない。流しながら鳴らすは、iPhone などで音が出ないことがある' },   // v9.3 修正
      { cat: 'sound', label: 'BGM の状態を見る（鳴らないとき）', action: 'bgmdiag', right: '' },   // v9.3 修正
      { cat: 'sound', label: 'BGM を聞く（サウンドテスト）', action: 'soundtest', right: '' },   // v9.3
      { cat: 'sound', label: 'BGM のクレジット', action: 'bgmcredit', right: 'CC BY-SA 3.0' },   // v9.3
      { cat: 'view', label: '文字の大きさ', key: 'uiScale', def: 'normal', opts: [{ v: 'normal', l: '標準' }, { v: 'large', l: '大きい' }], after: function () { Menu.applyUiScale(); } },
      { cat: 'view', label: '文字速度', key: 'textSpeed', opts: [{ v: 'normal', l: 'ふつう' }, { v: 'fast', l: 'はやい' }, { v: 'instant', l: '一瞬' }] },
      { cat: 'view', label: 'ミニマップ', key: 'minimap', def: 'on', opts: [{ v: 'on', l: '表示する' }, { v: 'off', l: '表示しない' }], set: function (v) { if (root.Minimap && root.Minimap.setVisible) root.Minimap.setVisible(v !== 'off', true); else st.minimap = v; } },
      { cat: 'view', label: 'ミニマップの大きさ', key: 'minimapSize', def: 'normal', opts: [{ v: 'normal', l: 'ふつう' }, { v: 'large', l: '大きい' }], after: function () { if (root.Minimap) root.Minimap.resize(); } },
      { cat: 'view', label: '目的地ナビ（赤丸）', key: 'nav', def: 'on', opts: [{ v: 'on', l: 'ON' }, { v: 'off', l: 'OFF' }] },
      { cat: 'view', label: 'ヒント表示', key: 'navHint', def: 'low', opts: [{ v: 'low', l: '控えめ' }, { v: 'detail', l: '詳細' }] },
      { cat: 'view', label: '仲間の隊列表示（後ろをついて歩く）', key: 'followers', def: 'on', opts: [{ v: 'on', l: '表示する' }, { v: 'off', l: '表示しない' }] },
      { cat: 'view', label: '戦闘背景の品質', key: 'battleBg', def: 'auto', opts: [{ v: 'auto', l: '自動（スマホは標準）' }, { v: 'high', l: '高' }, { v: 'normal', l: '標準' }, { v: 'low', l: '軽量（動く粒なし）' }], set: function (v) { if (v === 'auto') delete st.battleBg; else st.battleBg = v; } },
      { cat: 'view', label: '敵のHPバー', key: 'enemyHpBar', def: 'off', opts: [{ v: 'on', l: '表示する' }, { v: 'off', l: '表示しない' }] },
      { cat: 'view', label: 'マップの間取り（v7.6）', action: 'layout', right: root.EnvLayout ? (root.EnvLayout.enabled ? '新しい間取り' : '元の間取り') : '-', note: '切り替えるとページを再読み込みする（オートセーブしてから）' },
      { cat: 'ctrl', label: '歩く速度', key: 'walkSpeed', def: 'fast', opts: [{ v: 'normal', l: 'ふつう' }, { v: 'fast', l: 'はやい' }, { v: 'faster', l: 'とてもはやい' }], after: function () { World.applyWalkSpeed(); } },
      { cat: 'ctrl', label: 'スマホの移動操作', key: 'pad', def: 'stick', opts: [{ v: 'stick', l: 'スティック' }, { v: 'dpad', l: '十字キー' }] },
      { cat: 'ctrl', label: 'スマホの操作ボタンの位置', key: 'padSide', def: 'normal', opts: [{ v: 'normal', l: '移動を左・決定を右' }, { v: 'swap', l: '移動を右・決定を左' }] },
      { cat: 'ctrl', label: 'スマホの操作ボタンの濃さ', key: 'padOpacity', def: 1, opts: [{ v: 1, l: 'ふつう' }, { v: 0.75, l: 'うすい' }, { v: 0.5, l: 'とてもうすい' }] },
      { cat: 'ctrl', label: 'スマホの操作ボタンの大きさ', key: 'padScale', def: 1, opts: [{ v: 0.85, l: '小さい' }, { v: 1, l: 'ふつう' }, { v: 1.15, l: '大きい' }] },
      { cat: 'battle', label: '戦闘速度', key: 'battleSpeed', def: 'normal', opts: [{ v: 'normal', l: 'ふつう' }, { v: 'fast', l: 'はやい' }, { v: 'veryfast', l: 'とてもはやい' }] },   // v9.3 とてもはやい
      { cat: 'battle', label: '戦闘の演出', key: 'battleFx', def: 'auto', opts: [{ v: 'auto', l: '自動（はなやか。端末の「動きを減らす」のときは控えめ）' }, { v: 'rich', l: 'はなやか' }, { v: 'calm', l: '控えめ（画面の揺れ・光を抑える）' }], set: function (v) { if (v === 'auto') delete st.battleFx; else st.battleFx = v; }, note: '呪文・特技の光・粒・魔法陣・画面の揺れ。控えめは画面の揺れ・画面全体の光をなくし、粒を減らす' },   // v9.3
      { cat: 'battle', label: '呪文・特技の効き目の表示', key: 'effHint', def: 'on', opts: [{ v: 'on', l: '表示する' }, { v: 'off', l: '表示しない' }], note: '技・対象を選ぶときに「ばつぐん／いまいち／きかない」を出す' },   // v9.3
      { cat: 'battle', label: 'チャート試練のリスク%', key: 'riskPercent', opts: root.CONFIG.risk.riskOptions.map(function (v) { return { v: v, l: v + '%' }; }) },
      { cat: 'battle', label: 'ZigZag表示', key: 'showZigzag', opts: [{ v: true, l: 'ON' }, { v: false, l: 'OFF' }] },
      { cat: 'battle', label: '戦闘中の相場の試練', key: 'battleTrial', def: 'detail', opts: [{ v: 'quick', l: '簡易（買い・売り・見送り＋理由）' }, { v: 'detail', l: '詳細（5つの分析・高値安値・注文）' }], note: 'ボス戦・修行場・学院・進行イベントの試練は、いつも詳細' },
      { cat: 'battle', label: 'チャートバトルの判断時間（通常）', key: 'chartTime', def: 20, opts: [20, 25, 30].map(function (v) { return { v: v, l: v + '秒' }; }), note: '修行の「通常」で使う。試験・必殺技は下の「必殺技の判断時間」' },
      { cat: 'battle', label: '必殺技の判断時間', key: 'ultTime', def: 12, opts: ((root.ChartBattleUI && root.ChartBattleUI.TIME_OPTIONS) || [8, 12, 16, 20, 30]).map(function (v) { return { v: v, l: v + '秒' }; }) },
      { cat: 'battle', label: '必殺技のチャートの更新', key: 'ultChart', def: 'normal', opts: [{ v: 'normal', l: '標準' }, { v: 'light', l: '軽量（描画を減らす）' }] },
      { cat: 'battle', label: '必殺技の演出', key: 'ultFx', def: 'normal', opts: [{ v: 'normal', l: 'ふつう' }, { v: 'calm', l: '控えめ' }] },
      { cat: 'data', label: 'データ管理（書き出し・読み込み・初期化）', action: 'data' },
      { cat: 'data', label: 'タイトルに戻る', action: 'title' }
    ];
    // v9.3 iPhone・iPad の Safari（音の扱いを選べるブラウザだけ表示）：マナーモード（消音）のとき、このゲームの音（WebAudio）は鳴らない。ON にすると動画と同じように鳴らす
    if (root.navigator && root.navigator.audioSession) { var si = L.map(function (x) { return x.cat; }).lastIndexOf('sound'); L.splice(si + 1, 0, { cat: 'sound', label: 'マナーモード（消音）でも鳴らす', key: 'silentPlay', def: 'off', opts: [{ v: 'off', l: 'OFF（消音なら鳴らさない）' }, { v: 'on', l: 'ON（動画と同じように鳴らす）' }], after: function () { if (A) A.apply(); }, note: 'iPhone・iPad の Safari 向け。ON のとき、ほかのアプリの音楽は止まることがある' }); }
    if (Menu.extraSettings) Menu.extraSettings(L, st);   // 後の段階（チャート・スマホ操作）で足す項目
    return L;
  };
  function setVal(st, S) { var v = st[S.key]; if (v === undefined) v = S.def; return v; }
  function setLabel(st, S) { if (S.action) return S.right; var v = setVal(st, S); var o = S.opts.filter(function (x) { return x.v === v; })[0]; return o ? o.l : (S.fmt ? S.fmt(v) : String(v)); }
  Menu.settings = async function () {
    var tab = 0;
    while (true) {
      var st = State.data.settings; var ALL = Menu.SETTINGS(); var L = ALL.filter(function (x) { return x.cat === SET_TABS[tab].id; });
      var r = await Win.list(L.map(function (S) { return { label: S.label, right: setLabel(st, S), sub: S.note }; }), { title: '設定', cls: 'settings-menu', key: 'settings:' + SET_TABS[tab].id, tabs: SET_TABS.map(function (t) { return { label: t.label, count: ALL.filter(function (x) { return x.cat === t.id; }).length }; }), tab: tab });
      if (r === -1) return;
      if (r && typeof r === 'object') { if (r.tab !== undefined) tab = r.tab; continue; }
      var S = L[r]; if (!S) continue;
      if (S.action === 'data') { await Menu.dataManagement(); continue; }
      if (S.action === 'soundtest') { await Menu.soundTest(); continue; }   // v9.3
      if (S.action === 'bgmdiag') { await Menu.bgmDiag(); continue; }   // v9.3 修正
      if (S.action === 'bgmcredit' && root.BGM93) { await Win.panel(root.BGM93.creditsHtml(), { cls: 'bgm-credit' }); continue; }   // v9.3
      if (S.action === 'title') { if (await Menu.toTitle()) return 'title'; continue; }
      if (S.action === 'layout' && root.EnvLayout) {   // v7.6 間取りの切り替え：2D版・3D版の両方。マップを作り直すので、再読み込みで反映する
        var lon = !root.EnvLayout.enabled; var lc = await Win.choice((lon ? '新しい間取り（町の通り・広場、ダンジョンの広間、建物の中の用途ごとの間取り）' : '元の間取り') + 'に切り替える？ 2D版・3D版の両方に効く。ページの再読み込みで反映する（オートセーブから再開できる。立ち位置が塞がっていれば近くの通れる所へ移る）', ['切り替えて再読み込み', 'やめる'], { initial: 1 });
        if (lc === 0) { root.EnvLayout.setEnabled(lon); var okSave = State.autosave(); if (okSave === false) { await Win.message(['オートセーブに失敗したため、再読み込みをやめた。セーブ（システム → セーブ）で保存してからもう一度選んでください。']); continue; } try { root.location.reload(); } catch (e) { /* 再読み込みできない環境 */ } }
        continue;
      }
      var cur = setVal(st, S); var ci = 0; S.opts.forEach(function (o, k) { if (o.v === cur) ci = k; });
      var pick = await Win.choice(S.label + '（いま：' + setLabel(st, S) + '）', S.opts.map(function (o) { return (o.v === cur ? '● ' : '　') + o.l; }), { initial: ci });
      if (pick < 0) continue; var nv = S.opts[pick].v;
      if (S.set) S.set(nv); else st[S.key] = nv;
      if (S.after) S.after();
      Win.toast(S.label + '：' + S.opts[pick].l);
      State.autosave();
    }
  };
  // v8.8 文字の大きさ：設定（セーブごと）と、この端末の最後の設定（タイトル画面用）
  Menu.applyUiScale = function () {
    var st = State.data && State.data.settings; var v = st && st.uiScale; if (!v) { try { v = root.localStorage.getItem('mtq-ui-scale') || 'normal'; } catch (e) { v = 'normal'; } } else { try { root.localStorage.setItem('mtq-ui-scale', v); } catch (e) { } }
    if (root.document && root.document.documentElement) root.document.documentElement.classList.toggle('ui-large', v === 'large');
  };
  try { Menu.applyUiScale(); } catch (e) { }
  if (World && World.start && !World.start._ux88) { var ws88 = World.start; World.start = function () { var r = ws88.apply(this, arguments); try { Menu.applyUiScale(); } catch (e) { } return r; }; World.start._ux88 = true; }

  Menu.dataManagement = async function () {
    while (true) {
      var i = await Win.choice('データ管理', ['セーブデータをJSONで書き出す', 'JSONを読み込む', 'スロットを削除', 'やめる', 'クラウドセーブ（PC・スマホで共有）', 'バックアップ・ファイル', 'プレイ記録（バランス調整用）']);
      if (i < 0 || i === 3) return;
      if (i === 6) { if (root.PlayLog) await root.PlayLog.menu(); continue; }   // 遊んだ記録（この端末だけ。セーブデータとは別のキー）
      if (i === 4) { await root.SaveUI.cloud(); continue; }   // v6.5
      if (i === 5) { await root.SaveUI.backups(); continue; }   // v6.5
      if (i === 0) { var blob = new Blob([State.exportJSON()], { type: 'application/json' }); var u = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = u; a.download = 'mochipoyo-trade-quest-save.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); await Win.message(['書き出した。ブラウザの保存データを消すと進行が失われるので、JSONを保管しておこう。']); }
      if (i === 1) { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; var text = await new Promise(function (res) { inp.onchange = function () { var f = inp.files[0]; if (!f) return res(null); var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsText(f); }; inp.click(); setTimeout(function () { res(null); }, 60000); }); if (!text) continue; try { var dd = State.importJSON(text); State.data = dd; State.autosave(); await Win.message(['読み込んだ。マップを再読み込みする。']); World.start(); return; } catch (e) { await Win.message(['読み込みに失敗：' + e.message]); } }
      if (i === 2) { var s = await Win.choice('どのスロットを削除する？', ['スロット1', 'スロット2', 'スロット3', 'やめる']); if (s >= 0 && s < 3) { var c = await Win.choice('本当に削除する？（元に戻せない）', ['削除', 'やめる']); if (c === 0) { State.deleteSlot(s + 1); await Win.message(['削除した。']); } } }
    }
  };

  root.Menu = Menu;
})(typeof window !== 'undefined' ? window : globalThis);
