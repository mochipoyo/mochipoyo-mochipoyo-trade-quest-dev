/* =========================================================
   Data / BGM93（v9.3）：フリー音源の BGM の一覧と、場所ごとの割り当て
   ・曲：0 A.D.（Wildfire Games）の音楽。CC BY-SA 3.0。assets/music/（MP3 64kbps に変換）。クレジット：assets/music/CREDITS.md・設定の「BGM のクレジット」
   ・割り当て：町ごと・フィールド（地方）ごと・ダンジョンごと・戦闘（通常・ボス）・城・教会・酒場・海・空・タイトル・エンディング
     建物の中（家・店・宿屋）は外の曲のまま。同じダンジョンの中（階を移っても）は同じ曲のまま
   ・曲は聞いて選んだのではなく、0 A.D. での使い方（平和な場面・戦闘・メニュー）・曲名・テンポや音量の測定から選んだ（差し替えは下の表を書き換えるだけ）
   ・js/ui/audio.js が使う（BGM93.pick）。曲が読めないとき・設定「BGM の種類＝レトロ」のときは、今までの自作の BGM（audio.js の TRACKS）
   ========================================================= */
(function (root) {
  'use strict';
  var BGM = { BASE: 'assets/music/', LICENSE: 'CC BY-SA 3.0', LICENSE_URL: 'https://creativecommons.org/licenses/by-sa/3.0/', AUTHOR: 'Wildfire Games（0 A.D.）', AUTHOR_URL: 'https://www.wildfiregames.com/' };
  // 曲の一覧：id → [ファイル, 原曲名]
  var T = BGM.TRACKS = {};
  [['calm_before_the_storm', 'Calm Before the Storm'], ['taiko_1', 'Taiko 1'], ['taiko_2', 'Taiko 2'], ['honor_bound', 'Honor Bound'], ['red_dawn', 'Red Dawn'], ['juno_protect_you', 'Juno Protect You'],
    ['tavern_in_the_mist', 'Tavern in the Mist'], ['the_governor', 'The Governor'], ['mediterranean_waves', 'Mediterranean Waves'], ['sunrise', 'Sunrise'], ['albian_nocturne', 'Albian Nocturne'], ['mirage', 'Mirage'],
    ['hill_of_sorrows', 'Hill of Sorrows'], ['karmic_confluence', 'Karmic Confluence'], ['point_of_no_return', 'Point of No Return'], ['the_road_ahead', 'The Road Ahead'], ['peaks_of_atlas', 'Peaks of Atlas'],
    ['tale_of_warriors', 'Tale of Warriors'], ['sands_of_time', 'Sands of Time'], ['alba_longa_burns', 'Alba Longa Burns'], ['midwinter', 'Midwinter'], ['celtica', 'Celtica'], ['an_old_warhorse_goes_to_pasture', 'An old Warhorse goes to Pasture'],
    ['the_fledgling_kingdom', 'The Fledgling Kingdom'], ['forging_a_city_state', 'Forging a City-State'], ['highland_mist', 'Highland Mist'], ['waters_edge', "Water's Edge"], ['harsh_lands_rugged_people', 'Harsh Lands Rugged People'],
    ['rise_of_macedon', 'Rise of Macedon'], ['in_the_shadow_of_olympus', 'In the Shadow of Olympus'], ['cradle_of_civilization', 'Cradle of Civilization'], ['ammon_ra', 'Ammon-Ra'], ['solstice_festival', 'Solstice Festival'],
    ['from_every_corner', 'From Every Corner'], ['northern_frontier', 'Northern Frontier'], ['whistler', 'Whistler']
  ].forEach(function (x) { T[x[0]] = { id: x[0], file: '0ad-' + x[0].replace(/_/g, '-') + '.mp3', title: x[1] }; });

  // 場面ごとの曲（固定）
  BGM.SCENE = { title: 'calm_before_the_storm', ending: 'the_road_ahead', battle: 'taiko_2', battle_late: 'taiko_1', boss: 'honor_bound', boss_area: 'red_dawn', church: 'juno_protect_you', tavern: 'tavern_in_the_mist', castle: 'the_governor', sea: 'mediterranean_waves', sky: 'sunrise' };
  // 町ごと
  BGM.TOWN = {
    poyo_village: 'the_fledgling_kingdom', rivel_town: 'forging_a_city_state', rivel_artisan: 'forging_a_city_state', dow_village: 'highland_mist', harbor_town: 'waters_edge', verum_town: 'harsh_lands_rugged_people',
    kalion_city: 'rise_of_macedon', erased_village: 'albian_nocturne', sentra_capital: 'rise_of_macedon', aruna_village: 'hill_of_sorrows', tempus_city: 'in_the_shadow_of_olympus', node_city: 'cradle_of_civilization',
    scheduled_district: 'cradle_of_civilization', magicka_city: 'celtica', star_camp: 'whistler', dark_camp: 'red_dawn', sahar_city: 'ammon_ra', mirror_market: 'ammon_ra', ignas_town: 'harsh_lands_rugged_people',
    ciel_port: 'northern_frontier', frost_town: 'northern_frontier', luxbell: 'solstice_festival', volatilia: 'in_the_shadow_of_olympus', tradia: 'from_every_corner', tradia_sky: 'sunrise', asana_village: 'highland_mist',
    asana_rebuilt: 'solstice_festival', neon_town: 'cradle_of_civilization', meridian_shelter: 'whistler', nereia_city: 'waters_edge', nereia_old_hi: 'waters_edge', nereia_old_lo: 'waters_edge',
    rivel_castle_approach: 'the_governor', sentra_palace_approach: 'the_governor', magicka_palace_approach: 'the_governor'
  };
  BGM.TOWN_POOL = ['the_fledgling_kingdom', 'highland_mist', 'forging_a_city_state', 'solstice_festival', 'whistler'];
  // フィールド（地方）ごと
  BGM.FIELD = {
    world: 'the_road_ahead', world_grania: 'peaks_of_atlas', world_kalion: 'tale_of_warriors', world_islands: 'mediterranean_waves', world_tempus: 'an_old_warhorse_goes_to_pasture', world_machine: 'karmic_confluence',
    world_magicka: 'celtica', world_sky: 'sunrise', world_dark: 'point_of_no_return', world_desert: 'sands_of_time', world_dragon: 'alba_longa_burns', world_snow: 'midwinter', world_neon: 'cradle_of_civilization',
    world_meridian: 'whistler', world_nereia: 'waters_edge'
  };
  // 地球の配置（w78_*）のフィールド：名前で決める（海・大洋＝海の曲）
  BGM.FIELD_BY_NAME = [[/海|大洋/, 'mediterranean_waves'], [/エルドラン/, 'the_road_ahead'], [/グランメリア/, 'tale_of_warriors'], [/ソルディア/, 'sands_of_time'], [/シルヴァーナ/, 'celtica'], [/ルベラ/, 'alba_longa_burns'], [/ニヴェリス/, 'midwinter'], [/白鯨島/, 'peaks_of_atlas']];
  BGM.LATE_FIELDS = { world_dark: 1, world_dragon: 1, world_machine: 1, world_snow: 1, world_neon: 1, world_meridian: 1, world_nereia: 1, world_sky: 1 };   // 後半の地方：通常戦闘の曲を変える
  BGM.DUNGEON_POOL = ['albian_nocturne', 'mirage', 'hill_of_sorrows', 'karmic_confluence', 'point_of_no_return'];

  function hash(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  BGM.state = { outdoor: null, dungeon: null, dungeonFrom: null, region: null };
  function fieldTrack(map) { var id = map.id; if (BGM.FIELD[id]) return BGM.FIELD[id]; var nm = map.name || (map.def && map.def.name) || ''; for (var i = 0; i < BGM.FIELD_BY_NAME.length; i++) if (BGM.FIELD_BY_NAME[i][0].test(nm)) return BGM.FIELD_BY_NAME[i][1]; return BGM.FIELD.world; }
  function townTrack(map) { return BGM.TOWN[map.id] || BGM.TOWN_POOL[hash(map.id) % BGM.TOWN_POOL.length]; }
  // key：呼び出し側の曲の種類（'town'・'field'・'dungeon'・'boss_area'・'castle'・'church'・'tavern'・'inn'・'battle'・'boss'・'title'・'ending'）。map：今のマップ（World.map）
  // 戻り値：曲の id（BGM.TRACKS）か null（自作の BGM のまま）
  BGM.pick = function (key, map, data) {
    var S = BGM.state; var aboard = data && data.aboard;
    if (key === 'title' || key === 'ending' || key === 'boss' || key === 'boss_area' || key === 'church' || key === 'tavern' || key === 'castle') return BGM.SCENE[key];
    if (key === 'battle') return S.region && BGM.LATE_FIELDS[S.region] ? BGM.SCENE.battle_late : BGM.SCENE.battle;
    if (!map) return key === 'field' ? BGM.FIELD.world : key === 'town' ? BGM.TOWN_POOL[0] : key === 'dungeon' ? BGM.DUNGEON_POOL[0] : null;
    var kind = map.kind || (map.def && map.def.kind) || 'town';
    if (kind === 'field') {
      S.region = map.id; S.dungeon = null;
      var f = aboard === 'airship' ? BGM.SCENE.sky : aboard && aboard !== 'carriage' ? BGM.SCENE.sea : fieldTrack(map); S.outdoor = f; return f;   // 船（boat・sailboat・galleon・ship）は海の曲
    }
    if (key === 'dungeon' || kind === 'dungeon') {
      if (key !== 'dungeon' && key !== 'field' && key !== 'town') return BGM.pick(key, null, data);
      if (!S.dungeon) S.dungeon = BGM.DUNGEON_POOL[hash(map.id) % BGM.DUNGEON_POOL.length];   // 入った最初の階で決め、中を移っても同じ曲
      return S.dungeon;
    }
    S.dungeon = null;
    if (kind === 'interior') return S.outdoor || townTrack(map);   // 家・店・宿屋：外の曲のまま
    var t = townTrack(map); S.outdoor = t; return t;
  };
  BGM.url = function (id) { var t = T[id]; if (!t) return null; var base = (root.Assets && root.Assets.base) || ''; return base + BGM.BASE + t.file; };
  BGM.creditsHtml = function () {
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    return '<div class="rw-title">BGM のクレジット</div><p>BGM は、オープンソースのゲーム「0 A.D.」の音楽を使っています。</p>' +
      '<p>原作者：<b>' + esc(BGM.AUTHOR) + '</b>（' + esc(BGM.AUTHOR_URL) + '）<br>ライセンス：<b>' + esc(BGM.LICENSE) + '</b>（' + esc(BGM.LICENSE_URL) + '）<br>変更：MP3（64kbps）に変換。曲の中身は変えていません。</p>' +
      '<div class="small muted">' + Object.keys(T).map(function (k) { return esc(T[k].title); }).join('・') + '</div>';
  };
  root.BGM93 = BGM;
})(typeof window !== 'undefined' ? window : globalThis);
