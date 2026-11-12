# 装備の外見（ドット絵の差分）の対応表（v9.7〜v9.8・自動生成）

appear_pixel_test.js が js/data/equip-pixels.js とゲームの装備（ITEMS）から作る。手で書き換えない。

## 人物ID・向き → 部品

| 人物ID | 向き | 元の絵 | 足もとの基準点 | 握る位置（武器） | 盾の位置 |
|---|---|---|---|---|---|
| hero | job:warrior | assets/characters/jobs/warrior.png | 64, 197 | 22, 117（剣：拳の上に鍔（剣を後に描く）／杖・槍：柄の上に拳を描き直す） | 105, 125（盾：腕の上（体の後に描く）） |
| hero | front | assets/characters/party-directions-v3/sprites/hero/front.png | 160, 304 | 117, 221（剣：拳の上に鍔（剣を後に描く）／杖・槍：柄の上に拳を描き直す） | 200, 229（盾：腕の上（体の後に描く）） |
| hero | back | assets/characters/party-directions-v3/sprites/hero/back.png | 160, 304 | 205, 213（剣：拳の上に鍔／杖・槍：柄の上に拳を描き直す） | 108, 222（盾：左腕の外側（体の後に描く）） |
| lina | menu | assets/characters/companions/lina.png | 97, 271 | 48, 121（杖：柄の上に手を描き直す） | —（盾の部品なし） |
| lina | front | assets/characters/party-directions-v3/sprites/lina/front.png | 160, 304 | 111, 151（杖：柄の上に手を描き直す） | —（盾の部品なし） |
| lina | back | assets/characters/party-directions-v3/sprites/lina/back.png | 160, 304 | 225, 152（杖：柄の上に手を描き直す） | —（盾の部品なし） |
| gald | menu | assets/characters/companions/gald.png | 128, 274 | 37, 137（斧：柄の上に拳を描き直す） | —（盾の部品なし） |
| gald | front | assets/characters/party-directions-v3/sprites/gald/front.png | 160, 304 | 70, 164（斧：柄の上に拳を描き直す） | —（盾の部品なし） |
| gald | back | assets/characters/party-directions-v3/sprites/gald/back.png | 160, 304 | 246, 156（斧：柄の上に拳を描き直す） | —（盾の部品なし） |

ほかの人物・向き：部品なし（本人の従来の絵）。

## 部品の種類 → 重ね方

| 種類 | 重ね順（z） | 素の絵（頭にかぶるときに替える） | 部品（tint＝品の色で塗る灰色の層） | 長柄（手を上に描き直す） |
|---|---|---|---|---|
| armor_light（（全員）） | 10 | —（変えない） | armor_shape_f、armor_light_t（tint:main） |  |
| armor_heavy（（全員）） | 10 | —（変えない） | armor_shape_f、armor_heavy_t（tint:main・灰色の品は塗らない） |  |
| armor_robe（（全員）） | 10 | —（変えない） | armor_robe_x（消す）、armor_robe_t（tint:main）、armor_robe_f |  |
| head_helm（（全員）） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（（全員）） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| shield（（全員）） | 30 | —（変えない） | shield |  |
| weapon_sword（（全員）） | 40 | —（変えない） | weapon_sword |  |
| weapon_staff（（全員）） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| weapon_spear（（全員）） | 40 | —（変えない） | weapon_spear | はい |
| armor_light（lina） | 10 | —（変えない） | armor_light_t（tint:main） |  |
| armor_light（gald） | 10 | —（変えない） | armor_light_t（tint:main） |  |
| weapon_axe（gald） | 40 | —（変えない） | weapon_axe | はい |

## 装備ID → 部品の種類

| 枠 | 形（type/sub） | 部品の種類 | 品の数 | 装備ID |
|---|---|---|---|---|
| acc | acc/amulet | （描かない） | 11 | amulet_life, amulet_mind, antidote_charm, time_amulet, amulet_macd, charm_stoploss, wave_charm, lln_charm, streak_charm, reversal_warning, td_margin_charm |
| acc | acc/anklet | （描かない） | 1 | nonslip_charm |
| acc | acc/bell | （描かない） | 2 | market_bell, b19_silent_bell |
| acc | acc/bracelet | （描かない） | 4 | bracelet_reverse, ev_bracelet, allocation_bangle, bu_desire_seal_bracer |
| acc | acc/brooch | （描かない） | 8 | auditor_seal, academy_crest, breakeven_crest, thinice_brooch, b19_balance_star, b19_all_seal, earth_globe, bu_hald_audit_badge |
| acc | acc/chain | （描かない） | 1 | oath_chain |
| acc | acc/circlet | （描かない） | 1 | iron_crown |
| acc | acc/compass | （描かない） | 5 | compass_wave, navigator_compass, star_compass, astral_lodestone, bu_trend_compass |
| acc | acc/earring | （描かない） | 2 | vol_earring, surf_earring |
| acc | acc/filter | （描かない） | 1 | clean_filter |
| acc | acc/gear | （描かない） | 1 | io_core |
| acc | acc/glasses | （描かない） | 4 | glasses_htf, observer_lens, td_divergence_lens, bu_observer_lens |
| acc | acc/lantern | （描かない） | 2 | bu_soul_warden_lamp, bu_fear_seal_lantern |
| acc | acc/necklace | （描かない） | 3 | necklace_skip, target_pendant, memory_drop |
| acc | acc/piece | （描かない） | 1 | b19_check_piece |
| acc | acc/ring | （描かない） | 13 | ring_power, ring_guard, ring_speed, ring_rci, surveyor_ring, lucky_ring, scalein_ring, stoporder_ring, pivot_ring, explorer_ring, star_ring, bu_ledger_core_ring, bu_entangled_ring |
| acc | acc/scale | （描かない） | 1 | scale_rr |
| acc | acc/scroll | （描かない） | 1 | td_stoploss_pledge |
| acc | acc/shard | （描かない） | 3 | dragon_heart, candle_stone, reactor_shard |
| acc | acc/watch | （描かない） | 3 | td_session_watch, conductor_watch, bu_time_guardian_watch |
| armor | heavy/chain | armor_heavy | 1 | chain_mail |
| armor | heavy/cuirass | armor_heavy | 1 | ashiron_plate |
| armor | heavy/plate | armor_heavy | 25 | iron_armor, knight_armor, rune_mail, armor_risk, armor_patience, oath_mail, legend_gambler_armor, copperwall_armor, prob_armor, federal_plate, deepsea_armor, final_plate, b19_bronze_desire_mail, t68_islands_heavy, t68_tempus_heavy, t68_desert_heavy, t68_machine_heavy, t68_snow_heavy, t68_dragon_heavy, t68_dark_heavy, spacetime_armor, coral_mail, bu_greed_crystal_mail, bu_core_barrier_mail, bu_archive_backup_mail |
| armor | heavy/scale | armor_heavy | 2 | dragon_mail, bu_magma_warden_mail |
| armor | light/cloak | armor_light | 8 | star_cloak, cloak_volatility, dune_cloak, gambler_cloak, sandstorm_cloak, b19_bare_face_cloak, neon_raincoat, bu_742_memory_cloak |
| armor | light/cloth | armor_light | 3 | cloth, trader_coat, auditor_coat |
| armor | light/coat | armor_light | 3 | sea_coat, fur_coat, ashshore_coat |
| armor | light/leather | armor_light | 11 | leather_armor, scale_armor, surf_armor, seabreeze_leather, stardrift_mail, t68_islands_light, t68_tempus_light, t68_desert_light, t68_machine_light, t68_snow_light, t68_dark_light |
| armor | light/ninja | armor_light | 1 | ninja_garb |
| armor | robe/robe | armor_robe | 23 | robe, silk_robe, sage_robe, temporal_robe, sky_robe, robe_skip, ember_robe, healer_robe, statistician_robe, antiretro_vestment, iceport_robe, chrono_formal, voidward_robe, td_risk_robe, b19_dark_matter_veil, t68_islands_robe, t68_desert_robe, t68_machine_robe, t68_snow_robe, t68_dragon_robe, t68_dark_robe, bu_frost_spirit_robe, bu_sevran_blank_robe |
| armor | robe/veil | armor_robe | 3 | mirage_veil, b19_porcelain_robe, aeria_robe |
| head | hat/bicorne | （なし→その部位を描かない） | 1 | bu_gull_admiral_hat |
| head | hat/cap | （なし→その部位を描かない） | 9 | leather_cap, hilo_hat, desert_star_hat, t68_islands_hat, t68_tempus_hat, t68_desert_hat, t68_machine_hat, t68_dragon_hat, t68_dark_hat |
| head | hat/circlet | （なし→その部位を描かない） | 1 | bu_control_seal_circlet |
| head | hat/crown | （なし→その部位を描かない） | 1 | bu_memory_keeper_helm |
| head | hat/feather | （なし→その部位を描かない） | 1 | feather_hat |
| head | hat/hood | （なし→その部位を描かない） | 1 | icecrystal_hood |
| head | hat/turban | （なし→その部位を描かない） | 1 | sand_turban |
| head | hat/witch | head_hat | 3 | wizard_hat, arcane_hat, td_rci_hat |
| head | helm/crown | head_helm | 2 | mentor_crown, td_dow_crown |
| head | helm/dragon | head_helm | 2 | dragon_helm, t68_dragon_helm |
| head | helm/helm | head_helm | 15 | iron_helm, knight_helm, star_helm, helm_timeframe, smoked_helm, seachart_helm, math_helm, b19_rate_gauge_helm, t68_islands_helm, t68_desert_helm, t68_machine_helm, t68_snow_helm, t68_dark_helm, bu_anchor_gravity_helm, bu_mine_captain_helm |
| shield | shield/barrier | shield | 1 | mana_barrier_shield |
| shield | shield/buckler | shield | 1 | dow_buckler |
| shield | shield/heater | shield | 17 | iron_shield, knight_shield, stoploss_shield, aegis_shield, shield_risk, golden_shield, pullback_shield, doom_guard_shield, t68_islands_shield, t68_tempus_shield, t68_desert_shield, t68_machine_shield, t68_snow_shield, t68_dragon_shield, t68_dark_shield, orbit_shield, bu_ledger_shield |
| shield | shield/round | shield | 4 | wooden_shield, td_mirror_buckler, ancient_shield, bu_signal_shield |
| shield | shield/tower | shield | 4 | ironcastle_shield, b19_unsmiling_aegis, bu_dorek_bastion, bu_fear_break_shield |
| weapon | axe/axe | weapon_axe | 5 | sky_axe, dragon_axe, momentum_axe, chainbreak_axe, b19_expected_value_axe |
| weapon | axe/battleaxe | weapon_axe | 6 | battle_axe, crater_axe, crash_axe, t68_dark_axe, bu_garon_axe, bu_zarg_chainbreaker |
| weapon | axe/handaxe | weapon_axe | 1 | hand_axe |
| weapon | bow/bow | （なし→その部位を描かない） | 15 | hunter_bow, survey_bow, star_bow, caravan_bow, zero_bow, breakconfirm_bow, range_bow, prob_hunt_bow, t68_islands_bow, t68_tempus_bow, t68_desert_bow, t68_snow_bow, t68_dark_bow, orbit_bow, bu_zaid_sand_bow |
| weapon | bow/longbow | （なし→その部位を描かない） | 4 | long_bow, azure_longbow, td_swing_longbow, b19_amber_memory_bow |
| weapon | bow/mechbow | （なし→その部位を描かない） | 6 | gear_bow, rci_bow, rci_bow_2, t68_machine_bow, bu_drone_link_bow, bu_orbis_orbit_bow |
| weapon | bow/shortbow | （なし→その部位を描かない） | 1 | short_bow |
| weapon | claw/claw | （なし→その部位を描かない） | 14 | leather_claw, iron_claw, tiger_claw, shadow_claw, flame_claw, retro_claw, thunder_claw, losscut_claw, b19_sober_claw, t68_tempus_claw, t68_snow_claw, t68_dragon_claw, t68_dark_claw, bu_wolf_king_claw |
| weapon | claw/gauntlet | （なし→その部位を描かない） | 2 | bu_zarg_remnant_claw, bu_greed_limit_gauntlet |
| weapon | claw/twinclaw | （なし→その部位を描かない） | 1 | obsidian_twin |
| weapon | club/club | （なし→その部位を描かない） | 1 | club |
| weapon | club/hammer | （なし→その部位を描かない） | 9 | balance_mace, ash_hammer, candle_hammer, margin_hammer, scale_mace, t68_islands_club, t68_desert_club, t68_dragon_club, t68_dark_club |
| weapon | club/kine | （なし→その部位を描かない） | 1 | b19_golden_kine |
| weapon | club/mace | （なし→その部位を描かない） | 1 | holy_mace |
| weapon | club/rod | （なし→その部位を描かない） | 2 | iron_club, basis_rod |
| weapon | dagger/dagger | （なし→その部位を描かない） | 15 | dagger, assassin_dagger, tide_dagger, void_dagger, stoploss_dagger, stoploss_dagger_2, pinbar_dagger, breakout_dagger, contrarian_blade, b19_present_jewel_blade, b19_two_faced_dagger, t68_islands_dagger, t68_tempus_dagger, t68_machine_dagger, t68_dark_dagger |
| weapon | dagger/knife | （なし→その部位を描かない） | 3 | bronze_dagger, silent_knife, td_scalper_knife |
| weapon | dagger/twin | （なし→その部位を描かない） | 2 | macd_twin, macd_twin_2 |
| weapon | spear/banner | weapon_spear | 1 | guide_flag_spear |
| weapon | spear/clockhand | weapon_spear | 1 | clock_hand_spear |
| weapon | spear/halberd | weapon_spear | 2 | halberd, td_breakout_halberd |
| weapon | spear/spear | weapon_spear | 18 | spear, iron_spear, astral_spear, ema_trident, ema_trident_2, sun_spear, pullback_spear, ryumyaku_spear, star_cycle_spear, b19_hold_fast_lance, t68_islands_spear, t68_tempus_spear, t68_desert_spear, t68_machine_spear, t68_snow_spear, t68_dark_spear, bu_urga_spear, bu_sky_guardian_spear |
| weapon | spear/trident | weapon_spear | 2 | takeprofit_trident, bu_tides_coral_trident |
| weapon | spear/umbrella | weapon_spear | 1 | neon_umbrella |
| weapon | staff/book | weapon_staff | 2 | bu_library_archive_staff, bu_volk_forbidden_staff |
| weapon | staff/crystal | weapon_staff | 2 | ice_staff, bu_crystal_resonance_staff |
| weapon | staff/key | weapon_staff | 1 | tidegate_staff |
| weapon | staff/staff | weapon_staff | 21 | mage_staff, sage_staff, chrono_staff, arcane_staff, hidden_staff, hidden_staff_2, ev_staff, compound_staff, stats_staff, oracle_staff, spacetime_staff, td_ema_staff, t68_islands_staff, t68_tempus_staff, t68_desert_staff, t68_machine_staff, t68_snow_staff, t68_dragon_staff, t68_dark_staff, starseer_staff, bu_zero_echo_staff |
| weapon | staff/tablet | weapon_staff | 1 | b19_ember_tablet_staff |
| weapon | staff/wood | weapon_staff | 1 | oak_staff |
| weapon | sword/forked | weapon_sword | 1 | b19_crossroads_blade |
| weapon | sword/greatsword | weapon_sword | 3 | dow_greatsword, dow_greatsword_2, bu_valen_oathblade |
| weapon | sword/saber | weapon_sword | 2 | scimitar, captain_saber |
| weapon | sword/sword | weapon_sword | 24 | copper_sword, iron_sword, steel_sword, knight_sword, wave_sword, rune_blade, ryumyaku_blade, prob_sword, fate_blade, yang_sword, yin_sword, resistance_blade, equilibrium_sword, td_zeno_blade, b19_seal_justice_sword, t68_islands_sword, t68_tempus_sword, t68_desert_sword, t68_machine_sword, t68_dragon_sword, t68_dark_sword, archeion_blade, azure_sword, bu_open_future_blade |
| weapon | sword/wood | weapon_sword | 1 | wooden_sword |

## 人物ごとに描ける種類（その人の部品がある種類。ない種類の品は、その部位だけ描かない）

| 人物ID | 描ける種類 |
|---|---|
| hero | armor_light、armor_heavy、armor_robe、head_helm、head_hat、weapon_sword、weapon_staff、weapon_spear、shield |
| lina | armor_light、armor_robe、weapon_staff |
| gald | armor_light、armor_heavy、weapon_axe |
