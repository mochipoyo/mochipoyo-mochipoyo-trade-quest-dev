/* =========================================================
   UI / Debug (v5.6) : 確認用メニュー。URL の末尾に ?debug=1 を付けたときだけ表示する
   ・各地域・各拠点へ直接移動、旅の準備（乗り物・仲間・Lv40・装備）、その場で飛空艇、全回復
   ・セーブは通常のデータとは別の場所（state.js の debug 用キー）。通常のセーブは「読むだけ」
   ・?debug=1 がなければ何もしない（通常のプレイには影響しない）
   ========================================================= */
(function (root) {
  'use strict';
  var Debug = { on: !!(root.State && root.State.debug), VERSION: 'v5.9' };
  root.MTQDebug = Debug;
  if (!Debug.on) return;

  var S = function () { return root.State; }, W = function () { return root.World; };
  var REGIONS = ['world', 'world_grania', 'world_kalion', 'world_islands', 'world_desert', 'world_snow', 'world_tempus', 'world_machine', 'world_magicka', 'world_dragon', 'world_sky', 'world_dark'];

  // 地域マップの拠点（LOCATIONS）を探す
  function locOf(region, to) { var def = root.MAP_DEFS[region]; var l = def && (def.locations || []).filter(function (x) { return x.to === to; })[0]; return l ? [l.to, l.tx, l.ty] : null; }
  // v5.5〜v5.6 で追加した場所（地域の拠点からたどれない奥の階も含む）
  function newPlaces() {
    var P = [
      ['【v5.6】氷港シエル', locOf('world_snow', 'ciel_port')], ['【v5.6】記憶を売る町フロスト', locOf('world_snow', 'frost_town')],
      ['【v5.6】記憶市場', ['memory_market', 5, 6]], ['【v5.6】記憶庫', ['memory_vault', 10, 14]],
      ['【v5.6】精霊の森', locOf('world_snow', 'spirit_forest_1')], ['【v5.6】精霊の森・奥（アステル）', ['spirit_forest_2', 2, 14]],
      ['【v5.6】凍結時計塔 1階', ['frozen_tower_1', 2, 13]], ['【v5.6】凍結時計塔 最上階', ['frozen_tower_4', 10, 12]],
      ['【v5.6】灰の洞窟（隠し1）', locOf('world_grania', 'ash_cave_1')], ['【v5.6】灰の洞窟 2階', ['ash_cave_2', 9, 9]],
      ['【v5.6】沈没船の礁（隠し2）', locOf('world_grania', 'sunken_reef_1')], ['【v5.6】沈没船 船長室', ['sunken_reef_2', 7, 9]],
      ['【v5.6】旧都市 深層（隠し4）', ['old_city_deep_1', 2, 12]], ['【v5.6】旧都市 深層・演算核', ['old_city_deep_2', 8, 11]],
      ['【v5.6】海賊カモメの巣', locOf('world_grania', 'pirate_nest')], ['【v5.6】灰の岬', locOf('world_grania', 'ash_cape')],
      ['【v5.5】砂都サハル', locOf('world_desert', 'sahar_city')], ['【v5.5】鏡の市場', locOf('world_desert', 'mirror_market')],
      ['【v5.5】砂嵐の回廊', locOf('world_desert', 'sandstorm_corridor_1')], ['【v5.5】蜃気楼神殿', locOf('world_desert', 'mirage_temple_1')],
      ['【v5.5】鍛冶街イグナス', locOf('world_dragon', 'ignas_town')], ['【v5.5】火口の祭壇', locOf('world_dragon', 'crater_altar')],
      ['【v5.5】竜脈洞窟', locOf('world_dragon', 'dragon_vein_1')], ['【v5.5】竜脈の最深部（隠し5）', ['dragon_vein_deep_1', 2, 12]]
    ];
    return P.filter(function (p) { return p[1] && root.MAP_DEFS[p[1][0]]; });
  }

  function canOpen() { var St = S(), Wo = W(); return !!(St && St.data && Wo && Wo.map && !Wo.busy && root.Engine.top() === Wo.scene); }

  function warp(map, x, y) {
    var d = S().data; if (d.aboard && root.Vehicle) root.Vehicle.disembark();   // 乗り物はその場に残して降りる
    W().enterMap(map, x, y, 'down'); S().autosave();
  }

  // 旅の準備：乗り物3種、仲間全員（Lv40）、店売りの上位装備、所持金
  var GEAR = ['rune_blade', 'astral_spear', 'dragon_axe', 'flame_claw', 'star_bow', 'arcane_staff', 'balance_mace', 'chrono_staff', 'ice_staff', 'gear_bow', 'halberd',
    'rune_mail', 'sky_robe', 'temporal_robe', 'knight_armor', 'fur_coat', 'aegis_shield', 'knight_shield', 'star_helm', 'arcane_hat', 'knight_helm', 'wizard_hat', 'ring_guard'];
  function score(it) { return (it.atk || 0) + (it.def || 0) + (it.mag || 0) * 1.2; }
  function prepare() {
    var St = S(), d = St.data, A = root.Actors;
    ['ship_ready', 'galleon_ready', 'airship_owned'].forEach(function (f) { d.flags[f] = true; });
    if (root.Vehicle) root.Vehicle.unlockIfReady();
    Object.keys(root.COMPANIONS).forEach(function (id) { St.joinCompanion(id); });
    var all = [d.hero].concat(Object.keys(d.companions).map(function (k) { return d.companions[k]; }));
    all.forEach(function (a) {
      if (a.level < 40) a.level = 40; A.refreshSkills(a);
      ['weapon', 'armor', 'shield', 'head', 'acc'].forEach(function (slot) {
        var best = null; GEAR.forEach(function (id) { var it = root.ITEMS[id]; if (!it || A.slotOf(id) !== slot || !A.canEquip(a, id)) return; if (!best || score(it) > score(root.ITEMS[best])) best = id; });
        var cur = a.equip[slot] && root.ITEMS[a.equip[slot]]; if (best && (!cur || score(root.ITEMS[best]) > score(cur))) a.equip[slot] = best;
      });
      A.fullHeal(a);
    });
    if (d.gold < 50000) d.gold = 50000;
    REGIONS.forEach(function (id) { if (root.MAP_DEFS[id]) d.visited[id] = true; });
  }

  function boardAirship() {
    var d = S().data, V = root.Vehicle, Wo = W(), p = Wo.player;
    if (!V || !root.VEHICLES.airship) return false;
    d.flags.airship_owned = true; V.unlockIfReady();
    if (!V.owned('airship')) d.vehicles.airship = { owned: true, map: Wo.map.id, x: p.x, y: p.y, port: { map: Wo.map.id, x: p.x, y: p.y } };
    if (Wo.map.kind !== 'field') return false;
    V.board('airship', Wo.map, p.x, p.y); p.sprite = d.hero.sprite; return true;
  }

  function versionLines() {
    var M = root.MAP_DEFS || {}, Q = root.QUESTS || {};
    // v5.7：オート戦闘・ワールドマップの大きな町と城・迷いの森の旅人の位置・経験値
    var lf = M.lost_forest && (M.lost_forest.npcs || []).filter(function (n) { return n.id === 'lf_lost'; })[0];
    var v57 = !!(root.Landmarks && root.Combat && root.Combat.autoCommand && lf && lf.x === 9 && root.Actors && root.Actors.expForLevel(10) === 628);
    // v5.8：修行場の中断・ひとりのときの出現数・序盤補正・最初の武器
    var v58 = !!(root.World && root.World.soloCap && root.Combat && root.Combat.earlyAssist && root.STARTER_WEAPON && root.Win && root.Win.confirmQuit && root.Services && root.Services.quitNote);
    // v5.9：追加モンスター10種・本棚の本・地域の地図で全地域の地形
    var v59 = !!(root.ENEMIES && root.ENEMIES.yosen_slime && root.ENEMIES.indicator_mage && root.Books && root.Minimap && root.Minimap.viewRegionId);
    var ok = !!M.world_snow && !!M.frozen_tower_1 && !!M.old_city_deep_1;
    return ['このページが読み込んでいるデータ：マップ ' + Object.keys(M).length + '／クエスト ' + Object.keys(Q).length + '／敵 ' + Object.keys(root.ENEMIES || {}).length + '／職業 ' + Object.keys(root.JOBS || {}).length,
      ok ? '忘却の雪原・凍結時計塔・旧都市 深層のデータあり → v5.6 のファイルが読み込まれています（v5.6 の想定：マップ226・クエスト85）。' : '忘却の雪原などのデータがありません → v5.6 のファイルが読み込まれていません（アップロード漏れ、または古いキャッシュ）。', v57 ? 'v5.7 の変更あり（オート戦闘・大きな町と城・迷いの森の通り道・レベルの上がりやすさ）。' : 'v5.7 の変更が見つかりません（js/core/landmarks.js・js/rpg/combat.js などが古い可能性）。', v58 ? 'v5.8 の変更あり（修行場の中断・ひとりのときの出現数1〜2体・序盤の与ダメージ／被ダメージ補正・職業に合う最初の武器）。' : 'v5.8 の変更が見つかりません（js/rpg/world.js・js/rpg/combat.js・js/ui/windows.js・js/ui/services.js などが古い可能性）。', v59 ? 'v5.9 の変更あり（追加モンスター10種・本棚の本・地域の地図で全地域の地形）。' : 'v5.9 の変更が見つかりません（js/data/enemies.js・js/data/learning.js・js/ui/minimap.js・assets/monsters などが古い可能性）。'];
  }

  async function regionMenu() {
    var Win = root.Win, d = S().data;
    var regs = REGIONS.filter(function (id) { return root.MAP_DEFS[id]; });
    var i = await Win.list(regs.map(function (id) { var m = root.MAP_DEFS[id]; return { label: m.name, right: d.visited[id] ? '訪問済み' : '', sub: (m.locations || []).map(function (l) { return l.name; }).slice(0, 4).join('・') }; }), { title: '地域へ移動' });
    if (i < 0) return false;
    var reg = regs[i], def = root.MAP_DEFS[reg], locs = def.locations || [];
    var items = [{ label: '（' + def.name + 'の地図に出る）', sub: locs[0] ? locs[0].name + 'の近く' : '' }].concat(locs.map(function (l) { return { label: l.name, sub: l.to }; }));
    var j = await Win.list(items, { title: def.name });
    if (j < 0) return false;
    if (j === 0) { var l0 = locs[0]; warp(reg, l0 ? l0.x : 80, l0 ? l0.y + 1 : 60); return true; }
    var L = locs[j - 1]; warp(L.to, L.tx, L.ty); return true;
  }

  Debug.open = async function () {
    if (!canOpen()) { if (root.Win) root.Win.toast('ゲームを始めて、会話・戦闘・メニューを閉じてから使えます'); return; }
    var Wo = W(), Win = root.Win; Wo.busy = true;
    try {
      while (true) {
        var i = await Win.list([
          { label: '地域へ移動', sub: '12地域の地図・町・ダンジョンへ直接移動' },
          { label: 'v5.5〜v5.6 で追加した場所', sub: '雪原・隠しダンジョン・海の小島・砂漠・竜炎' },
          { label: '旅の準備', sub: '乗り物3種・仲間全員・Lv40・上位装備・50000G・全地域を訪問済みに' },
          { label: '飛空艇にその場で乗る', sub: '地域の地図の上でだけ。決定キーで平地に着陸' },
          { label: '全回復' },
          { label: '通常のセーブを読み込む', sub: '読むだけ。このあとの保存は確認用の場所へ' },
          { label: 'このページの版を確認' }
        ], { title: '確認用メニュー（debug）' });
        if (i < 0) break;
        if (i === 0) { if (await regionMenu()) break; }
        else if (i === 1) {
          var P = newPlaces(); var k = await Win.list(P.map(function (p) { return { label: p[0], sub: p[1][0] }; }), { title: 'v5.5〜v5.6 で追加した場所' });
          if (k >= 0) { warp(P[k][1][0], P[k][1][1], P[k][1][2]); break; }
        }
        else if (i === 2) { prepare(); Wo.updateHud(); await Win.message(['旅の準備をした。乗り物3種・仲間全員（Lv40）・装備・50000G。', '仲間は「なかま」で入れ替えられる。']); }
        else if (i === 3) { if (boardAirship()) { await Win.message(['飛空艇に乗った。']); break; } else await Win.message(['飛空艇は、地域の地図（町やダンジョンの外）でだけ呼べる。']); }
        else if (i === 4) { S().partyActors().forEach(function (a) { root.Actors.fullHeal(a); }); await Win.message(['全員のHP・MPを回復した。']); }
        else if (i === 5) {
          var slots = [0, 1, 2, 3].map(function (n) { return { n: n, info: S().normalSlotInfo(n) }; });
          var sel = await Win.list(slots.map(function (s) { return { label: s.n === 0 ? 'オートセーブ' : 'スロット' + s.n, right: s.info ? (s.info.name + ' Lv' + s.info.level) : '（なし）', disabled: !s.info, sub: s.info ? (root.MAP_DEFS[s.info.map] ? root.MAP_DEFS[s.info.map].name : s.info.map) : '' }; }), { title: '通常のセーブを読み込む（読むだけ）' });
          if (sel >= 0 && slots[sel].info) { var nd = S().loadNormal(slots[sel].n); if (nd) { S().data = nd; Wo.busy = false; Wo.start(); S().autosave(); return; } await Win.message(['読み込めなかった。']); }
        }
        else if (i === 6) { await Win.message(versionLines()); }
      }
    } catch (e) { root.Engine.onError(e); }
    Wo.busy = false; Wo.updateHud(); S().autosave();
  };

  // 画面上部のボタンと、キーボードの G キー
  function init() {
    if (!document.body || document.getElementById('dbg-btn')) return;
    var b = document.createElement('button'); b.id = 'dbg-btn'; b.type = 'button';
    b.textContent = '確認用メニュー（debug ' + Debug.VERSION + '）';
    b.title = 'G キーでも開けます。セーブは通常のデータとは別の場所に保存されます';
    var touch = root.matchMedia && root.matchMedia('(pointer: coarse)').matches;   // スマホ・タブレットは画面下の空いている所に置く
    b.style.cssText = 'position:fixed;' + (touch ? 'bottom:10px;' : 'top:4px;') + 'left:50%;transform:translateX(-50%);z-index:9999;padding:4px 12px;border-radius:12px;border:1px solid #ffd24a;background:rgba(20,24,48,.88);color:#ffd24a;font-size:12px;font-family:inherit;cursor:pointer;';
    b.addEventListener('click', function (e) { e.stopPropagation(); b.blur(); Debug.open(); });
    document.body.appendChild(b);
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey && !e.altKey) { var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; Debug.open(); }
    });
    setTimeout(function () { if (root.Win) root.Win.toast('確認用モード：セーブは通常のデータとは別の場所に保存されます', 3200); }, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
