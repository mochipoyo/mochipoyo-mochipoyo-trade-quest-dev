/* =========================================================
   Data / v7.0 場所ごとの「個性」（飾りのテーマ）
   ・町・城・施設（屋内）・ダンジョン・フィールドに、テーマ（近未来・機械・魔導・王都・港・鉱山…）を1つずつ決める
   ・3D 版はこのテーマで、壁の飾り（画面・配管・旗・歯車・水晶など）・町の外の遠景（高い塔・灯台・煙突など）・床の小さな飾りを足す
     （three-src/src/world/DecorBuilder3D.js。当たり判定は 2D 版のタイルのまま＝飾りで通れなくなる場所はない）
   ・2D 版の地図の見た目は変えない（このデータを読むだけ）
   ・決め方：maps に書いた場所 → 屋内はつながっている町のテーマ（店・宿など。教会・図書館などは名前で決める）→ ダンジョンは ID の前半 → なし
   ・ポヨ村と、その中の家（専用に作り込んだ3D）・アサナ村（v6.9 の物語の場面）には足さない
   ========================================================= */
(function (root) {
  'use strict';
  var THEMES = {
    tech: { name: '近未来の相場都市', accent: '#46e0ff', accent2: '#ff4a8a' },
    machine: { name: '機械と配管の都市', accent: '#ffb040', accent2: '#4ad8ff' },
    arcane: { name: '魔導の都', accent: '#c08aff', accent2: '#5ad8ff' },
    royal: { name: '王都・城', accent: '#3a5aa8', accent2: '#e8c050' },
    bureau: { name: '徴税の都（役所と掲示）', accent: '#a83a3a', accent2: '#e8d8b0' },
    clock: { name: '時計と鐘', accent: '#e8c060', accent2: '#8ab0d8' },
    harbor: { name: '港', accent: '#e84a3a', accent2: '#f4f0e0' },
    mine: { name: '鉱山', accent: '#ffb050', accent2: '#8a6a44' },
    cave: { name: '洞窟の水晶', accent: '#5ae0ff', accent2: '#9aff8a' },
    library: { name: '書庫', accent: '#e8c890', accent2: '#8a4a2a' },
    temple: { name: '祈りの場', accent: '#ffe0a0', accent2: '#c8c0b0' },
    sea: { name: '海の底', accent: '#ff8aa8', accent2: '#5ae0e0' },
    dark: { name: '闇と瘴気', accent: '#a060ff', accent2: '#ff3a6a' },
    desert: { name: '砂漠の市', accent: '#e8a040', accent2: '#3a8ab8' },
    forge: { name: '鍛冶と火山', accent: '#ff6a20', accent2: '#ffc060' },
    frost: { name: '氷と雪', accent: '#a8e8ff', accent2: '#ffffff' },
    casino: { name: '娯楽都市', accent: '#ff4ab8', accent2: '#ffd24a' },
    academy: { name: '学院', accent: '#58c890', accent2: '#e8e0c0' },
    sky: { name: '天空', accent: '#fff0a0', accent2: '#8ac8ff' },
    forest: { name: '森の光', accent: '#b8ff8a', accent2: '#ffe08a' },
    ruins: { name: '廃墟', accent: '#8aa870', accent2: '#b0a898' },
    pastoral: { name: '素朴な村', accent: '#e8c050', accent2: '#c8584a' }
  };
  // 町・城・施設・ダンジョン（明示）
  var MAPS = {
    rivel_town: 'royal', rivel_artisan: 'royal', rivel_castle: 'royal', rivel_castle_2f: 'royal', rivel_castle_3f: 'royal', rivel_castle_b1: 'royal',
    dow_village: 'forest', harbor_town: 'harbor', verum_town: 'mine', kalion_city: 'bureau', sentra_capital: 'bureau', erased_village: 'ruins',
    aruna_village: 'harbor', aruna_ruins: 'ruins', tempus_city: 'clock', node_city: 'machine', scheduled_district: 'machine', magicka_city: 'arcane',
    star_camp: 'sky', dark_camp: 'dark', sahar_city: 'desert', mirror_market: 'desert', ignas_town: 'forge', ciel_port: 'harbor', frost_town: 'frost',
    luxbell: 'casino', volatilia: 'academy', tradia: 'tech',
    // 施設（屋内）：町と違うテーマにするもの
    kalion_finance: 'bureau', kalion_tax: 'bureau', sentra_office: 'bureau', time_bank: 'clock', tempus_bell: 'clock', magicka_academy: 'arcane', magicka_palace: 'arcane', magicka_palace_2f: 'arcane', magicka_palace_b1: 'arcane',
    luxbell_casino: 'casino', luxbell_labs: 'machine', vol_library: 'library', vol_observatory: 'sky', vol_quantum: 'machine', vol_mind: 'machine', vol_under_gate: 'machine',
    tradia_foundation: 'tech', rivel_wave_temple: 'temple', verum_factory: 'machine', aruna_lighthouse: 'harbor', aruna_lighthouse_top: 'harbor', ignas_forge: 'forge', memory_market: 'frost',
    sentra_palace_west: 'royal', sentra_palace_vault: 'bureau',
    // ダンジョン
    kalion_archive_1: 'library', kalion_archive_2: 'library', sentra_palace_1: 'royal', sentra_palace_2: 'bureau', iron_fort_gate: 'royal',
    memory_library: 'library', memory_library_seal: 'library', memory_vault: 'library', forest_hidden_room: 'library', lost_forest_shrine: 'temple', lost_forest_treasure: 'cave',
    elmina_undersea: 'sea', pirate_nest: 'harbor', ash_cape: 'harbor', kalion_lab: 'machine', frozen_tower_1: 'frost', frozen_tower_2: 'frost', frozen_tower_3: 'frost', frozen_tower_4: 'frost'
  };
  // ダンジョン：ID の前半で決める（上の MAPS が先）
  var PREFIX = [
    [/^(lost_forest|spirit_forest|a4_lf_|a4_sf_)/, 'forest'], [/^(oblivion_cave|bandit_hideout|verum_hideout|ash_cave|cave_hidden|a4_ac_|a4_au_|a6_bd_|a6_vh_|a6_mi_)/, 'cave'],
    [/^(iron_mine|a4_im_)/, 'mine'], [/^(time_bank_vault|temple_of_time|aruna_ruins_|a4_tt_|a6_ar_|a6_tb_)/, 'clock'],
    [/^(forbidden_archive|a4_fa_|a4_ml_|a6_ka_|a6_mv_)/, 'library'], [/^(old_city|auto_factory|oracle_core|aruna_underground|vol_under|a6_kl_|a6_oc_|a6_af_|a6_or_|a6_od_|a6_vu_)/, 'machine'],
    [/^(origin_lab|a6_ol_)/, 'arcane'], [/^(star_tower|sky_temple|a6_st_|a6_sk_)/, 'sky'], [/^(void_wasteland|demon_castle|a6_vw_|a6_dc_)/, 'dark'],
    [/^(sandstorm_corridor|mirage_temple|a4_sc_|a6_mt_)/, 'desert'], [/^(crater_altar|dragon_vein|a4_dv_|a6_ca_|a6_dd_)/, 'forge'],
    [/^(sunken_reef|a6_el_|a6_sr_)/, 'sea'], [/^(a6_pn_|a6_ap_)/, 'harbor'], [/^(a6_fg_)/, 'royal'], [/^(a6_ft_)/, 'frost'], [/^(a6_em_|a6_gp_)/, 'mine']
  ];
  // 足さない場所（専用3D・v6.9 の物語の場面）
  var SKIP = /^(poyo_|asana_)/;
  // フィールド（地方ごと）
  var FIELDS = { world: 'pastoral', world_grania: 'mine', world_kalion: 'bureau', world_islands: 'harbor', world_tempus: 'clock', world_machine: 'machine', world_magicka: 'arcane', world_sky: 'sky', world_dark: 'dark', world_desert: 'desert', world_dragon: 'forge', world_snow: 'frost' };

  var parentCache = {};
  function parentTown(id) {
    if (Object.prototype.hasOwnProperty.call(parentCache, id)) return parentCache[id];
    var D = root.MAP_DEFS || {}; var seen = {}; var q = [[id, 0]]; var found = null; seen[id] = 1;
    // 町の建物（buildings.interior）から逆に引く → 屋内のワープをたどる（2段まで）
    while (q.length && !found) {
      var c = q.shift(); var cid = c[0];
      Object.keys(D).some(function (k) { var d = D[k]; if ((d.kind || 'town') !== 'town') return false; if ((d.buildings || []).some(function (b) { return b.interior === cid; })) { found = k; return true; } return false; });
      if (found || c[1] >= 2) break;
      ((D[cid] && D[cid].warps) || []).forEach(function (w) { if (!w || seen[w.to] || !D[w.to]) return; seen[w.to] = 1; if ((D[w.to].kind || 'town') === 'town') { if (!found) found = w.to; } else if ((D[w.to].kind) === 'interior') q.push([w.to, c[1] + 1]); });
    }
    parentCache[id] = found; return found;
  }
  function forMap(id) {
    if (!id || SKIP.test(id)) return null;
    if (FIELDS[id]) return FIELDS[id];
    if (MAPS[id]) return MAPS[id];
    var d = root.MAP_DEFS && root.MAP_DEFS[id]; if (!d || d.s3121) return null;
    var kind = d.kind || 'town';
    if (kind === 'interior') {
      if (/church|chapel|shrine|祠/.test(id + (d.name || '')) || /教会|祠|聖堂/.test(d.name || '')) return 'temple';
      if (/library|archive/.test(id) || /図書|書庫/.test(d.name || '')) return 'library';
      var p = parentTown(id); if (p && !SKIP.test(p)) return MAPS[p] || null;
      return null;
    }
    if (kind === 'dungeon') { for (var i = 0; i < PREFIX.length; i++) if (PREFIX[i][0].test(id)) return PREFIX[i][1]; return null; }
    return null;
  }
  root.PLACE_DECOR = { THEMES: THEMES, MAPS: MAPS, FIELDS: FIELDS, forMap: forMap, parentTown: parentTown, theme: function (id) { var k = forMap(id); return k ? Object.assign({ key: k }, THEMES[k]) : null; } };
})(typeof window !== 'undefined' ? window : globalThis);
