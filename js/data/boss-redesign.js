/* =========================================================
   Data / BossRedesign：ボス44体の新しい戦闘画像（素材パック trade_quest_bosses_44_redesign、2026-11-01）
   ・素材の images_512/<敵ID>.png をそのまま assets/bosses_v2/<敵ID>.png に置いた（ハッシュは素材の image_qa.json と一致）
   ・敵ID・名前・能力・行動・報酬・出現・物語・セーブは変えない。変えるのは ASSET_MANIFEST.monsters[id] の画像の項目だけ
   ・v6.3 のパック（assets/bosses_new）の画像の情報は v63 に残す（?bossart=v63 でそちらを表示。ファイルは消していない）
   ・旧素材用の表示時の加工（clean：枠線・白い背景・切り口の除去）と古い bbox は新画像には使わない
   ・bbox：不透明部分（アルファ>40）の外接矩形 [x, y, 幅, 高さ]（512px）。ピクセルを読めない環境で切り抜きに使う
   ・fit：縦横比を保って収める最大の [幅, 高さ]（scale 1。拡大はしない）。draw は目安の表示サイズ（1体のとき）
   ・lift：浮いているボスを地面から浮かせる量（px）。final：魔王（3形態と旧定義）は少し大きく
   ・1024px版はゲームでは使わない（戦闘の表示は最大でおよそ 290×208）
   ========================================================= */
(function (root) {
  'use strict';
  root.BOSS_REDESIGN = { version: 1, pack: 'trade_quest_bosses_44_redesign', list: [{"no":"B001","id":"boss_lost_trend","name":"トレンド迷子","file":"assets/bosses_v2/boss_lost_trend.png","status":"adopted","bbox":[108,80,296,352],"fit":[260,186],"draw":[157,186],"lift":14,"float":true,"final":false,"note":""},
    {"no":"B002","id":"boss_greed_golem","name":"欲望のゴーレム","file":"assets/bosses_v2/boss_greed_golem.png","status":"adopted","bbox":[83,100,347,318],"fit":[260,200],"draw":[218,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B003","id":"boss_bandit_chief","name":"山賊の頭目ガロン","file":"assets/bosses_v2/boss_bandit_chief.png","status":"adopted","bbox":[146,83,266,345],"fit":[260,200],"draw":[155,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B004","id":"boss_greed_demon","name":"欲望の魔人","file":"assets/bosses_v2/boss_greed_demon.png","status":"adopted","bbox":[110,80,311,352],"fit":[260,200],"draw":[177,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B005","id":"wolf_king","name":"森の狼王","file":"assets/bosses_v2/wolf_king.png","status":"adopted","bbox":[105,83,328,345],"fit":[260,200],"draw":[190,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B006","id":"crystal_golem","name":"クリスタルゴーレム","file":"assets/bosses_v2/crystal_golem.png","status":"adopted","bbox":[101,92,313,326],"fit":[260,200],"draw":[192,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B007","id":"boss_tide_serpent","name":"潮の大蛇ウルガ","file":"assets/bosses_v2/boss_tide_serpent.png","status":"adopted","bbox":[92,87,331,338],"fit":[260,200],"draw":[196,200],"lift":0,"float":false,"final":false,"note":"素材の1024px版は壊れたファイル（途中で切れている。ハッシュ不一致）。ゲームは512px版を使うので影響なし"},
    {"no":"B008","id":"boss_overseer","name":"監督官ザルグ","file":"assets/bosses_v2/boss_overseer.png","status":"adopted","bbox":[82,81,344,344],"fit":[260,200],"draw":[200,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B009","id":"boss_grote","name":"鉄冠将軍グロート","file":"assets/bosses_v2/boss_grote.png","status":"adopted","bbox":[103,80,322,351],"fit":[260,200],"draw":[184,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B010","id":"boss_ledger_guardian","name":"帳簿の守護者","file":"assets/bosses_v2/boss_ledger_guardian.png","status":"adopted","bbox":[87,101,345,314],"fit":[260,200],"draw":[219,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B011","id":"boss_valen","name":"騎士団長ヴァレン","file":"assets/bosses_v2/boss_valen.png","status":"adopted","bbox":[147,83,264,345],"fit":[260,200],"draw":[154,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B012","id":"boss_royal_captain","name":"親衛隊長ドレク","file":"assets/bosses_v2/boss_royal_captain.png","status":"adopted","bbox":[101,86,307,332],"fit":[260,200],"draw":[185,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B013","id":"boss_ledger_core","name":"帳簿中枢の守護機構","file":"assets/bosses_v2/boss_ledger_core.png","status":"adopted","bbox":[100,80,321,347],"fit":[260,200],"draw":[185,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B014","id":"boss_ruin_memory","name":"廃墟の記憶","file":"assets/bosses_v2/boss_ruin_memory.png","status":"adopted","bbox":[121,81,271,349],"fit":[260,186],"draw":[145,186],"lift":14,"float":true,"final":false,"note":""},
    {"no":"B015","id":"boss_library_guardian","name":"図書館の守護機構","file":"assets/bosses_v2/boss_library_guardian.png","status":"adopted","bbox":[86,89,344,335],"fit":[260,200],"draw":[205,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B016","id":"boss_time_guardian","name":"時の守護者","file":"assets/bosses_v2/boss_time_guardian.png","status":"adopted","bbox":[94,80,323,350],"fit":[260,200],"draw":[185,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B017","id":"boss_drone_swarm","name":"監視ドローン群","file":"assets/bosses_v2/boss_drone_swarm.png","status":"adopted","bbox":[82,82,349,330],"fit":[260,186],"draw":[197,186],"lift":14,"float":true,"final":false,"note":""},
    {"no":"B018","id":"boss_core_defense","name":"中枢防衛機構","file":"assets/bosses_v2/boss_core_defense.png","status":"adopted","bbox":[86,105,340,301],"fit":[260,200],"draw":[226,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B019","id":"boss_minister","name":"裏切りの大臣ヴォルク","file":"assets/bosses_v2/boss_minister.png","status":"adopted","bbox":[134,82,246,346],"fit":[260,200],"draw":[143,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B020","id":"boss_sky_guardian","name":"天空の守護者","file":"assets/bosses_v2/boss_sky_guardian.png","status":"adopted","bbox":[85,93,336,329],"fit":[260,186],"draw":[190,186],"lift":14,"float":true,"final":false,"note":""},
    {"no":"B021","id":"boss_zarg_remnant","name":"ザルグの残滓","file":"assets/bosses_v2/boss_zarg_remnant.png","status":"adopted","bbox":[93,82,326,348],"fit":[260,186],"draw":[174,186],"lift":14,"float":true,"final":false,"note":""},
    {"no":"B022","id":"boss_sevran_shadow","name":"セヴランの影","file":"assets/bosses_v2/boss_sevran_shadow.png","status":"adopted","bbox":[100,82,312,350],"fit":[260,200],"draw":[179,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B023","id":"boss_grote_2","name":"鉄冠将軍グロート","file":"assets/bosses_v2/boss_grote_2.png","status":"adopted","bbox":[91,82,333,348],"fit":[260,200],"draw":[191,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B024","id":"boss_demon_fear","name":"相場魔王〈恐怖〉","file":"assets/bosses_v2/boss_demon_fear.png","status":"adopted","bbox":[94,82,328,349],"fit":[290,208],"draw":[196,208],"lift":0,"float":false,"final":true,"note":""},
    {"no":"B025","id":"boss_demon_greed","name":"相場魔王〈欲望〉","file":"assets/bosses_v2/boss_demon_greed.png","status":"adopted","bbox":[96,81,329,348],"fit":[290,208],"draw":[197,208],"lift":0,"float":false,"final":true,"note":""},
    {"no":"B026","id":"boss_demon_fixed","name":"相場魔王〈固定〉","file":"assets/bosses_v2/boss_demon_fixed.png","status":"adopted","bbox":[95,81,321,347],"fit":[290,194],"draw":[180,194],"lift":14,"float":true,"final":true,"note":""},
    {"no":"B027","id":"sphinx","name":"スフィンクス像","file":"assets/bosses_v2/sphinx.png","status":"adopted","bbox":[115,85,314,334],"fit":[260,200],"draw":[188,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B028","id":"kraken","name":"クラーケン","file":"assets/bosses_v2/kraken.png","status":"adopted","bbox":[91,90,337,331],"fit":[260,200],"draw":[204,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B029","id":"dragon_red","name":"レッドドラゴン","file":"assets/bosses_v2/dragon_red.png","status":"adopted","bbox":[85,86,344,338],"fit":[260,200],"draw":[204,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B030","id":"demon_lord","name":"相場魔王","file":"assets/bosses_v2/demon_lord.png","status":"adopted","bbox":[107,85,309,340],"fit":[290,208],"draw":[189,208],"lift":0,"float":false,"final":true,"note":""},
    {"no":"B031","id":"boss_storm_chief","name":"砂嵐の頭目ザイード","file":"assets/bosses_v2/boss_storm_chief.png","status":"adopted","bbox":[87,81,337,350],"fit":[260,200],"draw":[193,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B032","id":"boss_mirage_lord","name":"蜃気楼の主","file":"assets/bosses_v2/boss_mirage_lord.png","status":"adopted","bbox":[109,78,294,357],"fit":[260,186],"draw":[154,186],"lift":14,"float":true,"final":false,"note":"原画で上下の細い先端が端から1〜3pxまで近い（薄い先端。目視で欠けは見られない）"},
    {"no":"B033","id":"boss_magma_wyrm","name":"溶岩の番竜","file":"assets/bosses_v2/boss_magma_wyrm.png","status":"adopted","bbox":[85,115,347,283],"fit":[260,200],"draw":[245,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B034","id":"boss_primal_flame","name":"原初の炎竜","file":"assets/bosses_v2/boss_primal_flame.png","status":"adopted","bbox":[96,86,325,343],"fit":[260,200],"draw":[190,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B035","id":"boss_frost_spirit","name":"凍てついた大精霊","file":"assets/bosses_v2/boss_frost_spirit.png","status":"adopted","bbox":[121,86,271,341],"fit":[260,200],"draw":[159,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B036","id":"boss_memory_keeper","name":"記憶庫の番人","file":"assets/bosses_v2/boss_memory_keeper.png","status":"adopted","bbox":[102,82,311,347],"fit":[260,200],"draw":[179,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B037","id":"boss_clock_warden","name":"凍結の時計守","file":"assets/bosses_v2/boss_clock_warden.png","status":"adopted","bbox":[91,98,333,316],"fit":[260,200],"draw":[211,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B038","id":"boss_ash_lord","name":"灰の王","file":"assets/bosses_v2/boss_ash_lord.png","status":"adopted","bbox":[113,79,281,350],"fit":[260,200],"draw":[161,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B039","id":"boss_ghost_captain","name":"幽霊船長","file":"assets/bosses_v2/boss_ghost_captain.png","status":"adopted","bbox":[91,84,335,342],"fit":[260,200],"draw":[196,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B040","id":"boss_old_core","name":"旧都市の演算核","file":"assets/bosses_v2/boss_old_core.png","status":"adopted","bbox":[97,106,319,302],"fit":[260,186],"draw":[196,186],"lift":14,"float":true,"final":false,"note":""},
    {"no":"B041","id":"boss_gull_admiral","name":"海賊カモメの頭","file":"assets/bosses_v2/boss_gull_admiral.png","status":"adopted","bbox":[96,82,323,349],"fit":[260,200],"draw":[185,200],"lift":0,"float":false,"final":false,"note":"くちばしがカモメよりワシに近い見た目（名前・設定どおりの海賊の海鳥の提督）"},
    {"no":"B042","id":"observer_echo","name":"観測者の残響","file":"assets/bosses_v2/observer_echo.png","status":"adopted","bbox":[103,85,313,340],"fit":[260,186],"draw":[171,186],"lift":14,"float":true,"final":false,"note":""},
    {"no":"B043","id":"soul_warden","name":"魂の番人","file":"assets/bosses_v2/soul_warden.png","status":"adopted","bbox":[150,80,234,350],"fit":[260,200],"draw":[134,200],"lift":0,"float":false,"final":false,"note":""},
    {"no":"B044","id":"zero_echo","name":"ゼロポイントの残響","file":"assets/bosses_v2/zero_echo.png","status":"adopted","bbox":[96,81,329,349],"fit":[260,186],"draw":[175,186],"lift":14,"float":true,"final":false,"note":""}] };
  var MF = root.ASSET_MANIFEST; if (!MF || !MF.monsters) return;
  var MON = MF.monsters;
  function v63(e) { return { path: e.path, clean: e.clean, bbox: e.bbox, scale: e.scale, fit: e.fit, status: e.status, use: e.use }; }
  root.BOSS_REDESIGN.list.forEach(function (r) {
    if (r.status !== 'adopted') return;
    var e = MON[r.id]; if (!e) return;
    var ent;
    if (e.pack === 'boss49') { ent = e; ent.v63 = v63(e); }                                   // v6.3 で採用していた（prev は元の画像のまま）
    else if (e.candidate && e.candidate.pack === 'boss49') {                                 // v6.3 では既存画像を優先していた → 新画像を採用し、既存画像を prev に
      ent = Object.assign({}, e.candidate); ent.v63 = v63(e.candidate); delete ent.candidate;
      if (e.path) { ent.prev = { path: e.path, w: e.w, h: e.h, scale: e.scale }; ent.fallback = 'prev'; } else ent.fallback = e.fallback || 'monsterart';
      MON[r.id] = ent;
    } else return;
    ent.path = r.file; ent.w = 512; ent.h = 512; ent.clean = null; ent.bbox = r.bbox; ent.scale = 1; ent.fit = r.fit; ent.lift = r.lift;
    ent.status = 'replaced'; ent.use = true; ent.lazy = true; ent.version = 2; ent.number = r.no;
  });
})(typeof window !== 'undefined' ? window : globalThis);
