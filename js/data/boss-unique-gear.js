/* =========================================================
   Data / BossUniqueGear（v8.7）：すべてのボス・隠しボス・裏ボス・イベントの中ボスの「固有装備」
   ・正本：設計書「トレードクエスト 全ボス固有装備 追加実装プロンプト」（2026-11-08・参照コミット 33eca51）の全件設計表（A〜F の 74 行）
   ・現役 68 行（A 本編・地域 27／B 隠し 11／C 地球型の追加地域 5／D 異界の門 19／E 通常敵を使うイベント中ボス 6）＋予約 6 行（F：region:'future' の敵。入手できない）
   ・装備の新規 42 点はここで ITEMS に足す。既存 26 点（専用ドロップ 7 点＋異界の門 19 点）は ID・名前・装備枠・基礎値を変えず、固有効果と印だけを足す
   ・効果：
     fx  … 既存の戦闘計算（js/rpg/combat.js）と同じ意味の効果（属性の被ダメージ・追加の属性ダメージ・防御無視・戦闘開始の解析・混乱無効）。既存の仕組みでそのまま計算される
     ug  … 固有効果（js/rpg/boss-unique-gear.js の BossGear が計算する）。type ごとに処理があり、上限（直接ダメージ×1.75・一般軽減40%・MP軽減25%・自動回復）をまとめて守る
   ・入手：初回の正規勝利で必ず 1 個（js/rpg/boss-unique-gear.js の grantOnce）。店・宝箱・盗み・通常敵・交換・クラフトからは出ない。売却・破棄不可
   ・数値は設計書の提案値（初期実装）。戦闘のシミュレーション（docs/tools/v87/）で見直した値は docs/arch87/REPORT87.md に記録
   ・名前・効果・由来はゲームの中の創作。現実の売買の利益を保証するものではない。学院・魂・量子・暗黒物質の能力は現実の科学の説明ではない
   ========================================================= */
(function (root) {
  'use strict';
  var ITEMS = root.ITEMS; if (!ITEMS) return;

  // 行：[番号, 区分, bossKey（敵ID または encounter ID）, 敵ID の配列, 撃破の根拠（フラグ）, 戦う場所（地図ID）, 装備（下の G）]
  //   区分：A 本編・地域／B 隠し・任意／C 地球型の追加地域／D 異界の門／E 通常敵を使うイベント中ボス／F 予約（未使用の敵定義。入手できない）
  var G = {};
  // G[itemId] = { name, cat, type, st（基礎値）, status: 'new'|'existing', u: 固有名, text: 固有効果の説明, fx: 既存の仕組み, ug: 固有効果, lore: 由来, col: [地色, 差し色] }
  function g(id, o) { G[id] = o; }

  /* ---------------- A 本編・地域のボス 27 ---------------- */
  g('bu_trend_compass', { name: '迷い晴らしの羅針盤', cat: 'armor', type: 'acc', st: { def: 3, agi: 3 }, status: 'new', u: '方向確定',
    text: '防御した次のターンの通常攻撃+25%。混乱の付与成功率を50%減らす',
    ug: [{ id: 'bu01_after_defend', type: 'afterDefendNormal', v: 0.25 }, { id: 'bu01_confuse_cut', type: 'statusCut', v: { confuse: 0.5 } }],
    lore: '森で迷い続けた魔物の胸にあった羅針盤。針は、もう一度同じ方向を指して止まった', col: ['#7a9a5a', '#e8d070'] });
  g('bu_greed_crystal_mail', { name: '黄金結晶の戒め鎧', cat: 'armor', type: 'heavy', st: { def: 20, hp: 15 }, status: 'new', u: '欲望の上限',
    text: '1回で最大HPの30%を超える被ダメージを25%軽減。ダメージを受けて生き残ると、次の通常攻撃+15%（重ならない・次のターンの終わりまで）',
    ug: [{ id: 'bu02_big_hit_cut', type: 'bigHitCut', over: 0.30, v: 0.25 }, { id: 'bu02_after_hurt', type: 'afterHurtNormal', v: 0.15 }],
    lore: '欲望のゴーレムの結晶を、これ以上ふくらまないように戒めの鎖で留めた鎧', col: ['#c8a040', '#6a4a20'] });
  g('bu_garon_axe', { name: 'ガロンの戦利斧', cat: 'weapon', type: 'axe', st: { atk: 24 }, status: 'new', u: '頭目の一撃',
    text: '戦闘で最初の通常攻撃+35%。直接攻撃で敵を倒した行動のあと、自分の最大HPの5%回復（1行動1回）',
    ug: [{ id: 'bu03_first_normal', type: 'firstNormal', v: 0.35 }, { id: 'bu03_kill_heal', type: 'killHeal', v: 0.05 }],
    lore: '山賊の頭目ガロンが、奪わずに守ると決めた日に研ぎ直した斧', col: ['#8a5a3a', '#d0c0a0'] });
  g('bu_urga_spear', { name: '潮牙槍ウルガ', cat: 'weapon', type: 'spear', st: { atk: 28, mdef: 4 }, status: 'new', u: '潮返し',
    text: '通常攻撃のあと、氷属性の追加ダメージ（与えたダメージの20%）。氷属性の被ダメージ25%軽減',
    fx: { bonusElem: { element: 'ice', mult: 0.2 }, resist: { ice: 0.75 } },
    lore: '潮の大蛇ウルガの牙。満ち潮の冷たさを、いまも刃先にためている', col: ['#2a6a9a', '#c8e8ff'] });
  g('bu_zarg_chainbreaker', { name: '解放の断鎖斧', cat: 'weapon', type: 'axe', st: { atk: 32, hp: 20 }, status: 'new', u: '労役を断つ',
    text: '通常攻撃が当たると、敵の防御を2ターン20%下げる（重ならない）。自分への攻撃力低下の強さを50%にする',
    ug: [{ id: 'bu05_normal_def_down', type: 'normalHitDebuff', stat: 'def', v: -0.2, turns: 2 }, { id: 'bu05_atk_debuff_cut', type: 'debuffCut', v: { atk: 0.5 } }],
    lore: '鉄鎖鉱山の鎖を断った斧。監督官ザルグの鞭の鉄を打ち直してある', col: ['#5a5a6a', '#ff8a3a'] });
  g('bu_ledger_shield', { name: '黒帳の監査盾', cat: 'armor', type: 'shield', st: { def: 16, mdef: 8 }, status: 'new', u: '記録照合',
    text: '戦闘の始めに敵の弱点と耐性を解析（図鑑の「解析済み」と同じ。会っていない敵の情報は出さない）。解析済みの敵から受ける直接ダメージを10%軽減',
    fx: { autoScan: true }, ug: [{ id: 'bu06_scanned_cut', type: 'scannedCut', v: 0.10 }],
    lore: '帳簿の守護者の黒い表紙。書かれた数字と実際が合っているかを照らす', col: ['#2a2a3a', '#c8a040'] });
  g('bu_valen_oathblade', { name: 'ヴァレンの誓約剣', cat: 'weapon', type: 'sword', st: { atk: 38, def: 5 }, status: 'new', u: '守る誓い',
    text: '防御した次のターンの通常攻撃+40%。「かばう」で引き受けたダメージをさらに15%軽減（自動でかばう効果はない）',
    ug: [{ id: 'bu07_after_defend', type: 'afterDefendNormal', v: 0.40 }, { id: 'bu07_cover_cut', type: 'coverCut', v: 0.15 }],
    lore: '騎士団長ヴァレンが、王ではなく民に誓い直した剣', col: ['#3a4a8a', '#e0e0f0'] });
  g('bu_dorek_bastion', { name: 'ドレクの王宮大盾', cat: 'armor', type: 'shield', st: { def: 20, hp: 25 }, status: 'new', u: '門前の砦',
    text: '敵の全体攻撃から受ける直接ダメージを20%軽減。防御中はさらに10%軽減（全体攻撃に対して合わせて30%）',
    ug: [{ id: 'bu08_aoe_cut', type: 'aoeCut', v: 0.20, defending: 0.30 }],
    lore: '親衛隊長ドレクが王宮の門の前で構え続けた大盾', col: ['#8a2a2a', '#ffd24a'] });
  g('bu_ledger_core_ring', { name: '中枢照合の指輪', cat: 'armor', type: 'acc', st: { def: 5, mag: 5, mp: 20 }, status: 'new', u: '誤記訂正',
    text: '自分に最初に付く能力低下を1回だけ打ち消す（1戦1回。いくつかの能力が一度に下がる技は1回分として打ち消す）。消費MP5%軽減',
    ug: [{ id: 'bu09_debuff_block', type: 'debuffBlockOnce' }, { id: 'bu09_mp_cut', type: 'mpCut', v: 0.05 }],
    lore: '帳簿中枢の照合装置の輪。間違った記録を、最初の一件だけ必ず見つける', col: ['#4a6a8a', '#c8e0ff'] });
  g('bu_742_memory_cloak', { name: '七時四十二分の外套', cat: 'armor', type: 'light', st: { def: 29, mdef: 8 }, status: 'new', u: '次の一分',
    text: '敵の行動で初めてHPが50%以下になったとき、その行動の終わりに最大HPの15%回復（生きているときだけ・1戦1回）。闇属性の被ダメージ20%軽減',
    fx: { resist: { dark: 0.8 } }, ug: [{ id: 'bu10_half_heal', type: 'halfHpHeal', v: 0.15 }],
    lore: '廃墟の時計塔に残っていた外套。止まった針の、次の一分を待っている', col: ['#6a6a7a', '#e8c070'] });
  g('bu_library_archive_staff', { name: '万巻記録の書杖', cat: 'weapon', type: 'staff', st: { atk: 16, mag: 14, mp: 25 }, status: 'new', u: '読解の成果',
    text: '弱点を突いた攻撃呪文のダメージ+15%。その行動で1体以上に弱点のダメージを与えると、消費MPの20%を戻す（1行動1回・払ったMPまで）',
    ug: [{ id: 'bu11_weak_spell', type: 'weakSpell', v: 0.15 }, { id: 'bu11_weak_refund', type: 'weakRefund', v: 0.20 }],
    lore: '記憶の図書館の守護機構が守っていた書見台の芯', col: ['#6a4a2a', '#f0e0b0'] });
  g('bu_zaid_sand_bow', { name: '砂嵐を裂く弓', cat: 'weapon', type: 'bow', st: { atk: 43, agi: 5 }, status: 'new', u: '砂の狩人',
    text: '通常攻撃の会心率+8%（装備の会心率は合わせて25%まで）。自分より素早い敵への直接の物理ダメージ+20%',
    ug: [{ id: 'bu12_normal_crit', type: 'normalCrit', v: 0.08 }, { id: 'bu12_faster_foe', type: 'fasterFoePhys', v: 0.20 }],
    lore: '砂嵐の頭目ザイードが、嵐の向こうの獲物を射抜いた弓', col: ['#c8a070', '#5a3a2a'] });
  g('mirage_veil', { name: '蜃気楼のヴェール', status: 'existing', u: '蜃気楼の身代わり',
    text: '戦闘で最初に受ける単体の直接攻撃のダメージを50%軽減（1戦1回）。単体の物理攻撃をかわす率+8%（装備の回避は合わせて25%まで）',
    ug: [{ id: 'bu13_first_single', type: 'firstSingleCut', v: 0.50 }, { id: 'bu13_evade_single', type: 'evadeSingle', v: 0.08 }],
    lore: '蜃気楼神殿の祭司の衣。最初の一撃だけは、映った姿のほうが受ける', col: ['#e8c070', '#5ab0ff'] });
  g('bu_time_guardian_watch', { name: '時守りの懐中時計', cat: 'armor', type: 'acc', st: { def: 4, agi: 6, mp: 20 }, status: 'new', u: '三拍子',
    text: '戦闘の3・6・9…ターン目に行う最初の直接攻撃の行動（通常攻撃・攻撃の特技・攻撃呪文）のダメージ+25%。自分への素早さ低下を受けない',
    ug: [{ id: 'bu14_cycle', type: 'cycleDirect', n: 3, v: 0.25 }, { id: 'bu14_agi_immune', type: 'debuffImmune', keys: ['agi'] }],
    lore: '時の守護者が刻んでいた三拍子。急がず、遅れず', col: ['#c8a040', '#3a3a5a'] });
  g('bu_frost_spirit_robe', { name: '名を取り戻す氷霊衣', cat: 'armor', type: 'robe', st: { def: 32, mag: 8, mdef: 12 }, status: 'new', u: '雪解けの慈愛',
    text: '自分が使うHP回復呪文の回復量+20%（同じ意味の装備とは大きいほうだけ）。氷属性の被ダメージ30%軽減',
    fx: { resist: { ice: 0.7 } }, ug: [{ id: 'bu15_heal', type: 'healBoost', v: 0.20 }],
    lore: '凍てついた大精霊が名前を取り戻したときに脱いだ衣', col: ['#c8e8ff', '#5a8ab0'] });
  g('bu_memory_keeper_helm', { name: '追憶封じの冠', cat: 'armor', type: 'hat', st: { def: 17, mag: 6, mp: 25 }, status: 'new', u: '記憶を守る',
    text: '混乱・沈黙の付与成功率を各60%減らす。最初に受ける「MPを減らす攻撃」の減少量を0にする（1戦1回。自分で使うMPは対象外。今のゲームではMPを減らす攻撃を使う敵はいない）',
    ug: [{ id: 'bu16_status_cut', type: 'statusCut', v: { confuse: 0.6, silence: 0.6 } }, { id: 'bu16_mp_guard', type: 'mpLossGuard' }],
    lore: '記憶庫の番人の冠。忘れたくないことを、内側に閉じこめておく', col: ['#5a4a8a', '#d0c0ff'] });
  g('bu_drone_link_bow', { name: '群眼の追尾弓', cat: 'weapon', type: 'bow', st: { atk: 46, agi: 5 }, status: 'new', u: '追尾照準',
    text: '前のターンにも同じ敵を通常攻撃していれば、その敵への通常攻撃+25%。それが決まった行動のあと、その敵の素早さを2ターン15%下げる（重ならない）',
    ug: [{ id: 'bu17_same_target', type: 'sameTargetNormal', v: 0.25, slow: -0.15, turns: 2 }],
    lore: '監視ドローン群の照準装置を束ねた弓', col: ['#4a5a6a', '#ff4a4a'] });
  g('bu_core_barrier_mail', { name: '中枢防衛装甲', cat: 'armor', type: 'heavy', st: { def: 43, mdef: 12, hp: 30 }, status: 'new', u: '適応防壁',
    text: '属性つきの直接ダメージを受けたあと、その属性の被ダメージを次のターンの終わりまで25%軽減（覚える属性は最後の1つだけ）',
    ug: [{ id: 'bu18_adaptive', type: 'adaptiveResist', v: 0.25 }],
    lore: 'オラクル中枢の防衛機構の外殻。受けた攻撃の形を覚えて、次に備える', col: ['#3a6a8a', '#8ae0ff'] });
  g('bu_volk_forbidden_staff', { name: '禁書大臣の魔導杖', cat: 'weapon', type: 'staff', st: { atk: 22, mag: 20 }, status: 'new', u: '禁書解読',
    text: '沈黙している敵への攻撃呪文のダメージ+25%。単体の攻撃呪文でダメージを与えた敵に15%で沈黙（1行動1回の判定・敵の耐性あり）',
    ug: [{ id: 'bu19_silenced_spell', type: 'silencedSpell', v: 0.25 }, { id: 'bu19_spell_silence', type: 'spellSilence', chance: 0.15 }],
    lore: '裏切りの大臣ヴォルクが禁書を読むのに使った杖。もう、隠すためには使わない', col: ['#3a2a5a', '#c080ff'] });
  g('bu_magma_warden_mail', { name: '溶岩番竜の重鱗鎧', cat: 'armor', type: 'heavy', st: { def: 46, hp: 35 }, status: 'new', u: '溶岩の皮膜',
    text: '炎属性の被ダメージ35%軽減。単体の物理攻撃を受けて生き残ったとき、受けたHPの10%を相手に返す（自分の最大HPの5%まで・返したダメージは連鎖しない）',
    fx: { resist: { fire: 0.65 } }, ug: [{ id: 'bu20_reflect', type: 'reflectPhys', v: 0.10, cap: 0.05 }],
    lore: '竜脈洞窟の番竜の鱗。溶岩の熱を、相手の側へ押し返す', col: ['#a03a1a', '#ffb03a'] });
  g('bu_sky_guardian_spear', { name: '天穹審判の槍', cat: 'weapon', type: 'spear', st: { atk: 55, agi: 5 }, status: 'new', u: '天穹の祝福',
    text: '自分のHPが80%以上なら通常攻撃+25%。光・風属性の被ダメージを各20%軽減',
    fx: { resist: { light: 0.8, wind: 0.8 } }, ug: [{ id: 'bu21_high_hp', type: 'highHpNormal', above: 0.8, v: 0.25 }],
    lore: '天空神殿の守護者が掲げていた槍。曇りのない日にいちばんよく光る', col: ['#e8ecff', '#5ab0ff'] });
  g('bu_zarg_remnant_claw', { name: '残鎖を断つ手甲', cat: 'weapon', type: 'claw', st: { atk: 58, agi: 6 }, status: 'new', u: '解放の反撃',
    text: '状態異常が治ったとき、次の直接の物理攻撃+30%（重ならない・次のターンの終わりまで）。毒・麻痺の付与成功率を各40%減らす',
    ug: [{ id: 'bu22_cured', type: 'curedNextPhys', v: 0.30 }, { id: 'bu22_status_cut', type: 'statusCut', v: { poison: 0.4, paralyze: 0.4 } }],
    lore: '虚無の荒野に残っていた鎖の残滓を、断ち切ったあとに巻いた手甲', col: ['#4a4a5a', '#ff6a3a'] });
  g('bu_sevran_blank_robe', { name: '白紙の宰相衣', cat: 'armor', type: 'robe', st: { def: 40, mdef: 16, mag: 12 }, status: 'new', u: '数字の向こう側',
    text: '回復呪文で味方のHPを実際に回復すると、その味方の被ダメージを2ターン10%軽減。能力が下がっている味方への回復量+20%',
    ug: [{ id: 'bu23_grant_cut', type: 'healGrantCut', v: 0.10, turns: 2 }, { id: 'bu23_heal_debuffed', type: 'healDebuffed', v: 0.20 }],
    lore: 'セヴランの影が脱ぎ捨てた宰相の衣。帳簿の数字の向こうにいた人の名が、裏地に書かれている', col: ['#f0f0f0', '#3a3a5a'] });
  g('iron_crown', { name: '鉄の冠', status: 'existing', u: '解放者の意志',
    text: '混乱しない。自分のHPが50%以下の間、受ける直接ダメージを20%軽減（名前・アクセサリーの枠はそのまま）',
    immune: ['confuse'], ug: [{ id: 'bu24_low_hp_cut', type: 'lowHpCut', below: 0.5, v: 0.20 }],
    lore: 'グロートが最後に託した冠。支配のためではなく、解き放つために戴く', col: ['#2a2a3a', '#ffd24a'] });
  g('bu_fear_break_shield', { name: '恐怖を越える大盾', cat: 'armor', type: 'shield', st: { def: 31, mdef: 14, hp: 40 }, status: 'new', u: '損失限定',
    text: '最大HPの30%以上ある状態で受けた敵の1回の直接攻撃の行動で倒れるとき、その行動の残りの攻撃も含めてHP1で残る（1戦1回。毒・自分の代償のダメージは対象外）',
    ug: [{ id: 'bu25_lethal_save', type: 'lethalSave', from: 0.30 }],
    lore: '相場魔王〈恐怖〉の影を受け止めた盾。失うものの大きさを、先に決めておく', col: ['#2a2a4a', '#8a8ac0'] });
  g('bu_greed_limit_gauntlet', { name: '欲望を律する爪', cat: 'weapon', type: 'claw', st: { atk: 65, agi: 7 }, status: 'new', u: '利を積む手',
    text: '前のターンにも通常攻撃していれば通常攻撃+25%。通常攻撃で与えたダメージ（倒しすぎた分は除く）の5%のHPを吸収（1行動で最大HPの8%まで）',
    ug: [{ id: 'bu26_prev_normal', type: 'prevNormalNormal', v: 0.25 }, { id: 'bu26_lifesteal', type: 'lifesteal', v: 0.05, cap: 0.08 }],
    lore: '相場魔王〈欲望〉の金色の手を、握りしめすぎないように打ち直した爪', col: ['#c8a040', '#8a2a2a'] });
  g('bu_open_future_blade', { name: '未来を選ぶ聖剣', cat: 'weapon', type: 'sword', st: { atk: 70, mag: 12, mp: 30 }, status: 'new', u: '固定を断つ',
    text: '通常攻撃は敵の防御を25%無視。前のターンと違う種類の行動（通常攻撃・攻撃の特技・攻撃呪文・支援・防御）を選ぶと、直接攻撃ならダメージ+20%、支援なら消費MP10%軽減（1ターン目は発動しない）',
    fx: { pierce: 0.25 }, ug: [{ id: 'bu27_switch', type: 'switchStyle', direct: 0.20, mp: 0.10 }],
    lore: '固定された未来を断ち、もう一度選び直すための剣', col: ['#f0f0ff', '#c8a040'] });

  /* ---------------- B 隠し・任意のボス 11 ---------------- */
  g('bu_wolf_king_claw', { name: '白銀狼王の爪', cat: 'weapon', type: 'claw', st: { atk: 22, agi: 5 }, status: 'new', u: '群れの呼吸',
    text: '戦闘の始めに、生きている味方全員の素早さ+10%（2ターン目の終わりまで・重ならない）。自分の通常攻撃の会心率+6%（装備の会心率は合わせて25%まで）',
    ug: [{ id: 'bu28_pack', type: 'packAura', v: 0.10, turns: 2 }, { id: 'bu28_normal_crit', type: 'normalCrit', v: 0.06 }],
    lore: '迷いの森の狼王の爪。群れで走るとき、いちばん前を走る者の爪', col: ['#d0d8e8', '#5a6a8a'] });
  g('bu_crystal_resonance_staff', { name: '結晶共鳴の杖', cat: 'weapon', type: 'staff', st: { atk: 10, mag: 10, mp: 15 }, status: 'new', u: '結晶共鳴',
    text: '攻撃呪文を使った次のターンに防御すると、最大MPの8%回復。光属性の被ダメージ25%軽減',
    fx: { resist: { light: 0.75 } }, ug: [{ id: 'bu29_spell_defend_mp', type: 'spellDefendMp', v: 0.08 }],
    lore: '忘却の洞窟のクリスタルゴーレムのかけら。静かにしていると、響きがたまる', col: ['#c8e0ff', '#8a5ac8'] });
  g('bu_gull_admiral_hat', { name: '海賊カモメの提督帽', cat: 'armor', type: 'hat', st: { def: 10, agi: 5 }, status: 'new', u: '追い風航路',
    text: '風属性の被ダメージ25%軽減。戦闘で最初の通常攻撃+30%（船の操縦や出航には関係しない）',
    fx: { resist: { wind: 0.75 } }, ug: [{ id: 'bu30_first_normal', type: 'firstNormal', v: 0.30 }],
    lore: '海賊カモメの頭がかぶっていた帽子。追い風の日にだけ羽根がそろう', col: ['#f0f0f0', '#2a4a8a'] });
  g('ash_hammer', { name: '灰鉄の大槌', status: 'existing', u: '灰の圧壊',
    text: '通常攻撃は敵の防御を30%無視。防御した次のターンの通常攻撃+45%（連続して行動する効果はない）',
    fx: { pierce: 0.30 }, ug: [{ id: 'bu31_after_defend', type: 'afterDefendNormal', v: 0.45 }],
    lore: '灰の王の中から出てきた大槌。ためた一撃で、灰の壁を砕く', col: ['#5e5a56', '#ff6a3a'] });
  g('captain_saber', { name: '船長のサーベル', status: 'existing', u: '帰港の誓い',
    text: '通常攻撃のあと、光属性の追加ダメージ（与えたダメージの20%）。直接攻撃で敵を倒した行動のあと、最大MPの5%回復（1行動1回）。闇属性の被ダメージ20%軽減',
    fx: { bonusElem: { element: 'light', mult: 0.2 }, resist: { dark: 0.8 } }, ug: [{ id: 'bu32_kill_mp', type: 'killMp', v: 0.05 }],
    lore: '沈没船の船長が最後まで手放さなかった剣。やっと港に帰れた', col: ['#5a7a9a', '#ffd24a'] });
  g('bu_observer_lens', { name: '観測者のレンズ', cat: 'armor', type: 'acc', st: { def: 5, mag: 6, mdef: 8 }, status: 'new', u: '観測で得る手掛かり',
    text: '戦闘の始めに敵の弱点と耐性を解析。解析済みの敵の弱点を突くと、直接ダメージ+15%',
    fx: { autoScan: true }, ug: [{ id: 'bu33_scanned_weak', type: 'scannedWeak', v: 0.15 }],
    lore: '学院の地下の観測装置に残っていたレンズ。見たものを、確かめてから使う', col: ['#8ac0e0', '#2a3a5a'] });
  g('bu_soul_warden_lamp', { name: '魂守りの灯', cat: 'armor', type: 'acc', st: { def: 6, mdef: 10, mp: 25 }, status: 'new', u: '灯をつなぐ',
    text: '自分が蘇生の呪文を成功させると、その味方の最大HPの15%をさらに回復し、2ターン被ダメージを20%軽減（1戦2回まで）',
    ug: [{ id: 'bu34_revive', type: 'reviveBoost', hp: 0.15, cut: 0.20, turns: 2, max: 2 }],
    lore: '学院の地下の魂の番人が守っていた灯。消えかけた火を、隣の芯へ渡す', col: ['#ffe8a0', '#5a4a8a'] });
  g('bu_zero_echo_staff', { name: '零点共鳴杖', cat: 'weapon', type: 'staff', st: { atk: 20, mag: 20, mp: 35 }, status: 'new', u: '静止の余白',
    text: '1ターンMPを使わずに行動を終えると、次のターンで最初にMPを使う呪文だけ、消費MP20%軽減・攻撃またはHP回復の量+15%（続けて休んでも重ならない）',
    ug: [{ id: 'bu35_stillness', type: 'stillness', mp: 0.20, v: 0.15 }],
    lore: 'ゼロポイントの残響が残した杖。何もしない一拍が、次の一手を整える', col: ['#1a1a2a', '#8ae0ff'] });
  g('ryumyaku_blade', { name: '竜脈の剣', status: 'existing', u: '原初の脈動',
    text: '通常攻撃のあと、炎属性の追加ダメージ（与えたダメージの30%。敵の炎への耐性が1より小さくても、追加分は1として計算）。炎属性の被ダメージ35%軽減',
    fx: { bonusElem: { element: 'fire', mult: 0.3, floorResist: 1 }, resist: { fire: 0.65 } },
    lore: '竜脈の最深部で眠っていた剣。「流れに逆らわぬ者の剣」', col: ['#ffb03a', '#c94a2a'] });
  g('clock_hand_spear', { name: '時計の針の槍', status: 'existing', u: '動き出す時',
    text: '通常攻撃の行動を3回するごとに、3回目の通常攻撃（全部の当たり）が1.5倍（当たりの数ではなく行動の数で数える）。自分への素早さ低下を受けない。麻痺の付与成功率を50%減らす',
    ug: [{ id: 'bu37_third', type: 'everyThirdNormal', v: 0.5 }, { id: 'bu37_agi_immune', type: 'debuffImmune', keys: ['agi'] }, { id: 'bu37_para_cut', type: 'statusCut', v: { paralyze: 0.5 } }],
    lore: '凍結時計塔の大時計の針。止まった時を、もう一度進める槍', col: ['#c9d8f0', '#ffd24a'] });
  g('zero_bow', { name: '零誤差の弓', status: 'existing', u: '誤差を扱う',
    text: '通常攻撃のダメージの振れ幅をなくす（いつも基準の値。会心・敵の耐性はふつうどおり。必ず当たる・ダメージを保証するという意味ではない）。通常攻撃は敵の防御を35%無視',
    fx: { pierce: 0.35 }, ug: [{ id: 'bu38_fixed_roll', type: 'fixedRoll' }],
    lore: '旧都市の演算核の部品で作られた弓。「誤差をなくすな。扱え」', col: ['#2a2a3a', '#ff3a3a'] });

  /* ---------------- C 地球型の追加地域のボス 5 ---------------- */
  g('bu_tides_coral_trident', { name: '大潮王の珊瑚三叉槍', cat: 'weapon', type: 'spear', st: { atk: 48, mag: 7 }, status: 'new', u: '満ち引き',
    text: '奇数ターンは通常攻撃+20%、偶数ターンは自分が受ける直接ダメージを15%軽減。氷属性の被ダメージ20%軽減',
    fx: { resist: { ice: 0.8 } }, ug: [{ id: 'bu39_tides', type: 'tides', odd: 0.20, even: 0.15 }],
    lore: '海底神殿の潮門の番人ティデスの三叉槍。満ちるときと引くときを知っている', col: ['#2a8a9a', '#ff8a7a'] });
  g('bu_signal_shield', { name: '閉塞解除の信号盾', cat: 'armor', type: 'shield', st: { def: 24, mdef: 8 }, status: 'new', u: '停止と進行',
    text: '防御を選ぶと最大HPの5%回復（1ターン1回）。その次のターンの最初の直接攻撃（通常攻撃・攻撃の特技・攻撃呪文）+30%',
    ug: [{ id: 'bu40_defend_heal', type: 'defendHeal', v: 0.05 }, { id: 'bu40_next_direct', type: 'defendNextDirect', v: 0.30 }],
    lore: '路線図にない駅の信号機の灯。止まることも、進むための合図', col: ['#2a8a4a', '#ff4a4a'] });
  g('bu_archive_backup_mail', { name: 'アーカイブ復旧装甲', cat: 'armor', type: 'heavy', st: { def: 49, hp: 40, mdef: 12 }, status: 'new', u: '復旧点',
    text: 'HP60%以上の状態から受けた敵の直接攻撃の行動で、その行動の終わりにHP30%未満で生き残っていたら、HPを最大HPの30%まで戻す（1戦1回）。雷属性の被ダメージ20%軽減',
    fx: { resist: { thunder: 0.8 } }, ug: [{ id: 'bu41_restore', type: 'restorePoint', from: 0.60, below: 0.30, to: 0.30 }],
    lore: '水没工場の監督機が守っていた記録の控え。壊れても、ここまでは戻れる', col: ['#4a5a3a', '#e0ff8a'] });
  g('bu_orbis_orbit_bow', { name: '周回軌道の監視弓', cat: 'weapon', type: 'bow', st: { atk: 68, agi: 7 }, status: 'new', u: '軌道追撃',
    text: '通常攻撃のあと、最初に狙った敵へ無属性の追撃（その通常攻撃で与えたダメージの合計の25%・1行動1回）。敵が倒れていたら追撃しない。光属性の被ダメージ20%軽減',
    fx: { resist: { light: 0.8 } }, ug: [{ id: 'bu42_follow', type: 'orbitFollow', v: 0.25 }],
    lore: '警報衛星の守衛AIの照準。同じ軌道を、もう一度回ってくる', col: ['#e8ecf4', '#4a8aff'] });
  g('bu_anchor_gravity_helm', { name: '重力錨の蒼穹兜', cat: 'armor', type: 'helm', st: { def: 28, mdef: 15, hp: 50 }, status: 'new', u: '不動の錨',
    text: '自分への防御・素早さの低下を受けない。敵の全体攻撃から受ける直接ダメージを25%軽減',
    ug: [{ id: 'bu43_immune', type: 'debuffImmune', keys: ['def', 'agi'] }, { id: 'bu43_aoe_cut', type: 'aoeCut', v: 0.25 }],
    lore: '浮力炉の暴走炉心を止めた重力の錨。空の上でも、足もとがぶれない', col: ['#3a5a8a', '#c8e0ff'] });

  /* ---------------- D 異界の門：既存 19 装備の強化（既存の効果は維持） ---------------- */
  g('b19_golden_kine', { status: 'existing', u: 'もちもち連打', text: '通常攻撃は2回当たる（各0.62倍・既存）。2回とも当たって自分が生きていれば、行動のあとに最大HPの4%回復（1行動1回）',
    ug: [{ id: 'bu44_double_heal', type: 'doubleHitHeal', v: 0.04 }], lore: 'デラックス・モチコの金の杵。ぺったん、ぺったん、もう一回' });
  g('b19_silent_bell', { status: 'existing', u: '不安の鎮静', text: '状態異常にかかりにくい（30%・既存）。自分に状態異常があるとき、そのターンの終わりに1つ治す（1戦1回。毒・麻痺・沈黙・混乱・眠りの順）',
    ug: [{ id: 'bu45_cleanse', type: 'statusCleanseOnce' }], lore: '鳴らない鈴。不安の伝道師の警鐘のかけら。鳴らさないことで、心を静める' });
  g('b19_present_jewel_blade', { status: 'existing', u: '目先より根拠', text: '会心率+8%・戦闘で得るゴールド+15%（既存・パーティの上限内）。防御した次のターンの通常攻撃+25%',
    ug: [{ id: 'bu46_after_defend', type: 'afterDefendNormal', v: 0.25 }], lore: '欲姫のメサキが手を伸ばした宝石をはめこんだ短剣。目の前の輝きより、根拠を見る' });
  g('b19_dark_matter_veil', { status: 'existing', u: '事象の薄膜', text: 'すべての属性のダメージ-10%・呪文の威力+8%（既存）。最大HPの35%を超える単体の直接ダメージをさらに25%軽減（1ターンで最初の1回。無属性にも効く）',
    ug: [{ id: 'bu47_big_single', type: 'bigSingleCut', over: 0.35, v: 0.25 }], lore: 'ダークマター生命体Xの殻を織った衣。見えない重さを、薄い膜で受け流す' });
  g('b19_two_faced_dagger', { status: 'existing', u: '仮面の裏を断つ', text: '敵の防御を25%無視・当たると20%で沈黙（既存。沈黙の判定は1行動1回）。沈黙している敵への直接の物理ダメージ+20%',
    ug: [{ id: 'bu48_silenced_phys', type: 'silencedPhys', v: 0.20 }, { id: 'bu48_roll_once', type: 'onHitOncePerAction' }], lore: '裏切りの宣教師の袖にあった短剣。仮面の裏の言葉を、断ち切る' });
  g('b19_bronze_desire_mail', { status: 'existing', u: '満ち足りる器', text: '2ターン目から毎ターン守備+5%（最大+25%・既存）。上限に届いたあとは、ターンの終わりに最大HPの3%回復（生きているときだけ）',
    ug: [{ id: 'bu49_ramp_heal', type: 'rampHeal', v: 0.03 }], lore: '変わらぬ人の欲望の青銅の手を打ち直した鎧。満ちたあとは、こぼさず満たす' });
  g('b19_hold_fast_lance', { status: 'existing', u: '撤退線を決める', text: '倒れるダメージを35%でHP1で踏みとどまる（既存・1戦1回）。HP50%以下で防御した次のターンの通常攻撃+40%（HPが減るだけでは上がらない）',
    ug: [{ id: 'bu50_low_defend', type: 'lowHpDefendNormal', below: 0.5, v: 0.40 }], lore: 'ナンピン皇子が折らずに持ちこたえた槍。どこで引くかを、先に決めてある' });
  g('b19_ember_tablet_staff', { status: 'existing', u: '砕けた支配の残火', text: '呪文の威力+12%・毎ターン最大MPの3%回復（既存）。戦闘で初めて使う属性の攻撃呪文はさらに+10%（属性ごとに1行動。無属性は除く）',
    ug: [{ id: 'bu51_first_element', type: 'firstElementSpell', v: 0.10 }], lore: '砕けた石板と残り火を封じた杖。支配の火は消え、灯りだけが残った' });
  g('b19_unsmiling_aegis', { status: 'existing', u: '沈黙の城壁', text: '最大HPの25%を超える一撃を35%軽減（既存）。単体の物理攻撃を受けると12%で反撃（1ターン1回・倒れているときはしない）。反撃したあと、次に受ける単体の直接ダメージを20%軽減（次のターンの終わりまで）',
    ug: [{ id: 'bu52_counter', type: 'counterOnce', chance: 0.12 }, { id: 'bu52_after_counter', type: 'afterCounterCut', v: 0.20 }], lore: '無表情の石面が彫られた大盾。笑わないのは、ゆるがないため' });
  g('b19_check_piece', { status: 'existing', u: '詰み筋を読む', text: '会心率+10%（既存）。戦闘で最初の通常攻撃+30%（既存。先手を取る確率ではない）。力を溜めている敵への直接ダメージ+20%',
    ug: [{ id: 'bu53_vs_charging', type: 'vsCharging', v: 0.20 }], lore: 'ゲームマスターの黒い駒。相手が溜めているときこそ、詰み筋が見える' });
  g('b19_porcelain_robe', { status: 'existing', u: '欠けても輝く', text: '回復呪文の効果+20%・回避+5%（既存）。HPが30%以下の味方へのHP回復呪文はさらに+15%（回復する前のHPで判定）',
    ug: [{ id: 'bu54_low_target', type: 'lowTargetHeal', below: 0.3, v: 0.15 }], lore: '美の堕天使マンジャロの白磁の羽で織った衣。欠けたところから、光がもれる' });
  g('b19_rate_gauge_helm', { status: 'existing', u: '金利の切り替え', text: 'ダメージの下振れがない・防御した次のターンの通常攻撃+30%（既存）。防御すると最大MPの4%回復（1ターン1回）',
    ug: [{ id: 'bu55_defend_mp', type: 'defendMp', v: 0.04 }], lore: '金利の番人フォムシーの計器を組みこんだ兜。上げるときと下げるときを切り替える' });
  g('b19_seal_justice_sword', { status: 'existing', u: '執行する前に検証', text: '光属性。通常攻撃のあと光の追加ダメージ（20%）・当たると12%で麻痺（既存。麻痺の判定は1行動1回）。攻撃力か魔力が上がっている敵への直接ダメージ+15%',
    ug: [{ id: 'bu56_vs_buffed', type: 'vsBuffed', v: 0.15 }, { id: 'bu56_roll_once', type: 'onHitOncePerAction' }], lore: '正義の番人サイバーンの封印の剣。裁く前に、確かめる' });
  g('b19_amber_memory_bow', { status: 'existing', u: '森の記憶', text: '会心率+5%・当たると15%で眠り（既存。眠りの判定は1行動1回）。通常攻撃のあと、生きている味方（自分を含む）でHPの割合がいちばん低い1人を最大HPの3%回復（1行動1回）',
    ug: [{ id: 'bu57_forest_heal', type: 'forestHeal', v: 0.03 }, { id: 'bu57_roll_once', type: 'onHitOncePerAction' }], lore: '追憶の森のウブドの角でつくった弓。森は、いちばん弱った者から先に包む' });
  g('b19_bare_face_cloak', { status: 'existing', u: '評価からの解放', text: '状態異常にかかりにくい（30%）・回避+6%（既存）。自分への防御・魔法防御の低下の強さを50%にする',
    ug: [{ id: 'bu58_debuff_cut', type: 'debuffCut', v: { def: 0.5, mdef: 0.5 } }], lore: '醜悪の堕天使ルッキズムの仮面を外した外套。誰かの評価で、自分の守りは変わらない' });
  g('b19_sober_claw', { status: 'existing', u: '醒めた快楽', text: '当たると15%で眠り・状態異常にかかりにくい（15%）（既存。眠りの判定は1行動1回）。自分に状態異常がないとき、通常攻撃+15%',
    ug: [{ id: 'bu59_clean', type: 'cleanNormal', v: 0.15 }, { id: 'bu59_roll_once', type: 'onHitOncePerAction' }], lore: '快楽の魔人ヴェロの香炉の金具を削った鉤爪。酔わずにいられることが、いちばんの力' });
  g('b19_expected_value_axe', { status: 'existing', u: '試行を重ねる', text: '会心率+12%・前のターンにも攻撃していれば威力+20%（既存）。会心が出なかった通常攻撃の行動を2回すると、次の通常攻撃の行動だけ会心率+8%（装備の会心率の上限25%の内側・出たら数え直す。必ず会心になるわけではない）',
    ug: [{ id: 'bu60_crit_pity', type: 'critPity', after: 2, v: 0.08 }], lore: '確率の化身の水晶の腕を刃にした斧。一回の結果でなく、回数で考える' });
  g('b19_balance_star', { status: 'existing', u: '均衡の軌道', text: 'すべての属性のダメージ-10%・倒れるダメージを25%でHP1で踏みとどまる（既存）。行動を始めたときのHPが60%以上なら直接ダメージ+12%、60%未満なら受ける直接ダメージを15%軽減',
    ug: [{ id: 'bu61_balance', type: 'balance', above: 0.6, dmg: 0.12, cut: 0.15 }], lore: '重力の天秤の皿の縁から作った記章。傾いたら、傾いたなりの釣り合いを取る' });
  g('b19_crossroads_blade', { status: 'existing', u: '選択の契約', text: 'HPが減った敵ほど通常攻撃の威力が上がる（最大+50%・既存）。戦闘の前に契約を選ぶ：攻勢（直接ダメージ+10%・受ける直接ダメージ+10%）／守勢（直接ダメージ-5%・受ける直接ダメージ-10%）。選んでいなければ守勢。戦闘中は変えられない（図鑑の「ボス固有装備」・どうぐから選ぶ）',
    ug: [{ id: 'bu62_contract', type: 'contract', attack: { dmg: 0.10, taken: 0.10 }, guard: { dmg: -0.05, taken: -0.10 } }], lore: 'クロスロードの悪魔の契約札を刃に溶かした魔剣。どちらの道を選んでも、自分で選んだ道' });

  /* ---------------- E 通常敵を使うイベント中ボス 6（イベント専用。通常の出現では出ない） ---------------- */
  g('bu_mine_captain_helm', { name: '看守長の断鎖兜', cat: 'armor', type: 'helm', st: { def: 12, hp: 15 }, status: 'new', u: '鎖に負けない',
    text: '麻痺の付与成功率を50%減らす。自分への素早さ低下の強さを50%にする',
    ug: [{ id: 'bu63_para_cut', type: 'statusCut', v: { paralyze: 0.5 } }, { id: 'bu63_agi_cut', type: 'debuffCut', v: { agi: 0.5 } }],
    lore: '鉄鎖鉱山の看守長がかぶっていた兜。鎖を外した日から、軽くなった', col: ['#5a5a6a', '#c8c8c8'] });
  g('bu_hald_audit_badge', { name: '徴税隊長の監査徽章', cat: 'armor', type: 'acc', st: { def: 6, mdef: 4 }, status: 'new', u: '不正な徴収を防ぐ',
    text: '戦闘中に敵に奪われるゴールドを50%減らす（パーティ全体・何人がつけても重ならない）。自分が戦闘で最初に受ける単体の直接ダメージを30%軽減（1戦1回）',
    ug: [{ id: 'bu64_steal_cut', type: 'stealCut', v: 0.50 }, { id: 'bu64_first_single', type: 'firstSingleCut', v: 0.30 }],
    lore: '財務局の守備隊長がつけていた徽章。取り立てるためでなく、取りすぎを防ぐために返された', col: ['#c8a040', '#2a3a5a'] });
  g('bu_entangled_ring', { name: 'もつれ相関の指輪', cat: 'armor', type: 'acc', st: { def: 5, mag: 5, mp: 15 }, status: 'new', u: '同調',
    text: '味方に支援の呪文を使った行動のあと、自分と主な対象のMPを各最大MPの2%回復（1行動1回・それぞれ払ったMPの半分まで。対象が自分なら1回だけ）',
    ug: [{ id: 'bu65_entangle', type: 'entangle', v: 0.02 }],
    lore: '学院のもつれ測定装置の影から出てきた指輪。二つの輪が、離れても同じ向きに回る（ゲームの中の創作）', col: ['#8a5ac8', '#5ac8c0'] });
  g('bu_desire_seal_bracer', { name: '欲望封じの腕輪', cat: 'armor', type: 'acc', st: { def: 7, atk: 6 }, status: 'new', u: '足るを知る',
    text: '自分のHPが80%以上なら通常攻撃+20%。この戦闘で自分が初めて敵を倒したとき、最大HPの10%回復（1戦1回）',
    ug: [{ id: 'bu66_high_hp', type: 'highHpNormal', above: 0.8, v: 0.20 }, { id: 'bu66_first_kill', type: 'firstKillHeal', v: 0.10 }],
    lore: '魔王城の欲望の間の金貨を溶かして作った腕輪。運べる分だけでいい', col: ['#c8a040', '#5a3a1a'] });
  g('bu_fear_seal_lantern', { name: '恐怖を照らすランタン', cat: 'armor', type: 'acc', st: { def: 6, mdef: 10 }, status: 'new', u: '一歩を選ぶ',
    text: '闇属性の被ダメージ30%軽減。防御した次のターンに使う回復呪文の効果+25%',
    fx: { resist: { dark: 0.7 } }, ug: [{ id: 'bu67_defend_heal', type: 'defendThenHeal', v: 0.25 }],
    lore: '魔王城の恐怖の間の闇を照らしたランタン。足もとの一歩分だけ、明るい', col: ['#2a2a3a', '#ffd88a'] });
  g('bu_control_seal_circlet', { name: '支配断ちの額環', cat: 'armor', type: 'hat', st: { def: 22, mdef: 12 }, status: 'new', u: '自分で決める',
    text: '混乱しない。戦闘の3・6・9…ターン目の終わりに、自分の能力低下を1つ消す（攻撃・防御・魔力・魔法防御・素早さの順）',
    immune: ['confuse'], ug: [{ id: 'bu68_clear', type: 'periodicDebuffClear', n: 3 }],
    lore: '魔王城の支配の間の鎖を断って作った額環。何を選ぶかは、自分で決める', col: ['#5a5a7a', '#e0e0ff'] });

  /* ---------------- F 予約（未使用の敵定義 region:'future'。入手できない。ITEMS に足さない） ---------------- */
  var RESERVED = {
    bu_legacy_greed_amulet: { name: '渇望を鎮める護符', type: 'acc', st: { def: 5, hp: 20 }, u: '渇望の制御', text: '防御した次のターンの通常攻撃+30%。受けるHP吸収の量を50%減らす（受けるダメージは変えない）' },
    bu_legacy_grote_shield: { name: '鉄冠将軍の軍盾', type: 'shield', st: { def: 20, hp: 20 }, u: '軍勢の壁', text: '敵の全体攻撃から受ける直接ダメージを15%軽減。防御中は受ける直接ダメージをさらに10%軽減' },
    bu_legacy_sphinx_circlet: { name: '謎解きの砂冠', type: 'hat', st: { def: 12, mag: 6 }, u: '問う者の知恵', text: '通常の戦闘の相場の試練に成功すると、次の攻撃呪文+25%（次のターンの終わりまで・重ならない）。間違いを直すわけではない' },
    bu_legacy_kraken_spear: { name: '深淵八腕の槍', type: 'spear', cat: 'weapon', st: { atk: 34 }, u: '八腕の拘束', text: '通常攻撃は2回当たる（各0.60倍）。当たったあと、その敵の素早さを2ターン15%下げる（1行動1回）' },
    bu_legacy_red_mail: { name: '赤竜の炎鱗鎧', type: 'heavy', st: { def: 30, hp: 20 }, u: '紅蓮の鱗', text: '炎属性の被ダメージ30%軽減。炎属性の攻撃を受けた次のターンの通常攻撃+20%（重ならない）' },
    bu_legacy_demon_staff: { name: '旧き魔王の相場杖', type: 'staff', cat: 'weapon', st: { atk: 20, mag: 16 }, u: '不確実性の器', text: '攻撃呪文+12%。消費MP8%軽減' }
  };

  // 全件の表（設計書の番号順）。defeatFlags：旧セーブの補填の根拠（そのボス戦の勝利でだけ立つフラグ。docs/arch87/REPORT87.md で確認した）
  var T = [
    [1, 'A', 'boss_lost_trend', ['boss_lost_trend'], ['forest_boss'], ['lost_forest_shrine'], 'bu_trend_compass'],
    [2, 'A', 'boss_greed_golem', ['boss_greed_golem'], ['cave_boss'], ['oblivion_cave_3'], 'bu_greed_crystal_mail'],
    [3, 'A', 'boss_bandit_chief', ['boss_bandit_chief'], ['bandit_boss'], ['bandit_hideout'], 'bu_garon_axe'],
    [4, 'A', 'boss_tide_serpent', ['boss_tide_serpent'], ['harbor_boss'], ['harbor_town'], 'bu_urga_spear'],
    [5, 'A', 'boss_overseer', ['boss_overseer'], ['verum_overseer_defeated'], ['iron_mine_3'], 'bu_zarg_chainbreaker'],
    [6, 'A', 'boss_ledger_guardian', ['boss_ledger_guardian'], ['ledger_3'], ['kalion_archive_2'], 'bu_ledger_shield'],
    [7, 'A', 'boss_valen', ['boss_valen'], ['kyle_oath_done'], ['sentra_knights'], 'bu_valen_oathblade'],
    [8, 'A', 'boss_royal_captain', ['boss_royal_captain'], ['royal_captain_defeated'], ['sentra_palace_1'], 'bu_dorek_bastion'],
    [9, 'A', 'boss_ledger_core', ['boss_ledger_core'], ['ledger_core_stopped'], ['sentra_palace_2'], 'bu_ledger_core_ring'],
    [10, 'A', 'boss_ruin_memory', ['boss_ruin_memory'], ['ruin_memory_defeated'], ['aruna_ruins_2'], 'bu_742_memory_cloak'],
    [11, 'A', 'boss_library_guardian', ['boss_library_guardian'], ['library_guardian_defeated'], ['memory_library_seal'], 'bu_library_archive_staff'],
    [12, 'A', 'boss_storm_chief', ['boss_storm_chief'], ['caravan_done'], ['sandstorm_corridor_2'], 'bu_zaid_sand_bow'],
    [13, 'A', 'boss_mirage_lord', ['boss_mirage_lord'], ['mirage_lord'], ['mirage_temple_4'], 'mirage_veil'],
    [14, 'A', 'boss_time_guardian', ['boss_time_guardian'], ['time_guardian_defeated'], ['temple_of_time_3'], 'bu_time_guardian_watch'],
    [15, 'A', 'boss_frost_spirit', ['boss_frost_spirit'], ['frost_spirit_freed'], ['spirit_forest_2'], 'bu_frost_spirit_robe'],
    [16, 'A', 'boss_memory_keeper', ['boss_memory_keeper'], ['memory_keeper_defeated'], ['memory_vault'], 'bu_memory_keeper_helm'],
    [17, 'A', 'boss_drone_swarm', ['boss_drone_swarm'], ['drone_swarm_defeated'], ['old_city_2'], 'bu_drone_link_bow'],
    [18, 'A', 'boss_core_defense', ['boss_core_defense'], ['core_3'], ['oracle_core_3'], 'bu_core_barrier_mail'],
    [19, 'A', 'boss_minister', ['boss_minister'], ['minister_defeated'], ['forbidden_archive_3'], 'bu_volk_forbidden_staff'],
    [20, 'A', 'boss_magma_wyrm', ['boss_magma_wyrm'], ['magma_wyrm_defeated'], ['dragon_vein_2'], 'bu_magma_warden_mail'],
    [21, 'A', 'boss_sky_guardian', ['boss_sky_guardian'], ['sky_guardian_defeated'], ['sky_temple_2'], 'bu_sky_guardian_spear'],
    [22, 'A', 'boss_zarg_remnant', ['boss_zarg_remnant'], ['zarg_remnant'], ['void_wasteland_1'], 'bu_zarg_remnant_claw'],
    [23, 'A', 'boss_sevran_shadow', ['boss_sevran_shadow'], ['sevran_shadow'], ['void_wasteland_2'], 'bu_sevran_blank_robe'],
    [24, 'A', 'boss_grote_2', ['boss_grote_2'], ['grote_rematch'], ['demon_castle_gate'], 'iron_crown'],
    [25, 'A', 'boss_demon_fear', ['boss_demon_fear'], ['demon_fear'], ['demon_castle_5'], 'bu_fear_break_shield'],
    [26, 'A', 'boss_demon_greed', ['boss_demon_greed'], ['demon_greed'], ['demon_castle_5'], 'bu_greed_limit_gauntlet'],
    [27, 'A', 'boss_demon_fixed', ['boss_demon_fixed'], ['demon_fixed'], ['demon_castle_5'], 'bu_open_future_blade'],
    [28, 'B', 'wolf_king', ['wolf_king'], ['forest_hidden_boss'], ['lost_forest_treasure'], 'bu_wolf_king_claw'],
    [29, 'B', 'crystal_golem', ['crystal_golem'], ['cave_hidden_boss'], ['oblivion_cave_3'], 'bu_crystal_resonance_staff'],
    [30, 'B', 'boss_gull_admiral', ['boss_gull_admiral'], ['gull_admiral_defeated'], ['pirate_nest'], 'bu_gull_admiral_hat'],
    [31, 'B', 'boss_ash_lord', ['boss_ash_lord'], ['ash_lord_defeated'], ['ash_cave_2'], 'ash_hammer'],
    [32, 'B', 'boss_ghost_captain', ['boss_ghost_captain'], ['ghost_captain_defeated'], ['sunken_reef_2'], 'captain_saber'],
    [33, 'B', 'observer_echo', ['observer_echo'], ['acad_c_echo'], ['vol_under_1'], 'bu_observer_lens'],
    [34, 'B', 'soul_warden', ['soul_warden'], ['acad_s_warden'], ['vol_under_2'], 'bu_soul_warden_lamp'],
    [35, 'B', 'zero_echo', ['zero_echo'], ['acad_z_boss'], ['vol_under_2'], 'bu_zero_echo_staff'],
    [36, 'B', 'boss_primal_flame', ['boss_primal_flame'], ['primal_flame_defeated'], ['dragon_vein_deep_2'], 'ryumyaku_blade'],
    [37, 'B', 'boss_clock_warden', ['boss_clock_warden'], ['clock_warden_defeated'], ['frozen_tower_4'], 'clock_hand_spear'],
    [38, 'B', 'boss_old_core', ['boss_old_core'], ['old_core_defeated'], ['old_city_deep_2'], 'zero_bow'],
    [39, 'C', 'boss_tides', ['boss_tides'], ['ner_gate'], ['nereia_temple_2'], 'bu_tides_coral_trident'],
    [40, 'C', 'boss_block_signal', ['boss_block_signal'], ['mer_why'], ['meridian_station'], 'bu_signal_shield'],
    [41, 'C', 'boss_archive_warden', ['boss_archive_warden'], ['neon_warden_down'], ['neon_works_core'], 'bu_archive_backup_mail'],
    [42, 'C', 'boss_sentinel_orbis', ['boss_sentinel_orbis'], ['orb_sat'], ['orbis_sat'], 'bu_orbis_orbit_bow'],
    [43, 'C', 'boss_anchor_core', ['boss_anchor_core'], ['aer_reactor'], ['aeria_reactor'], 'bu_anchor_gravity_helm'],
    [44, 'D', 'tq_boss_deluxe_mochiko', ['tq_boss_deluxe_mochiko'], ['b19_mochiko'], ['lair19_mochiko'], 'b19_golden_kine'],
    [45, 'D', 'tq_boss_apostle_of_anxiety', ['tq_boss_apostle_of_anxiety'], ['b19_anxiety'], ['lair19_anxiety'], 'b19_silent_bell'],
    [46, 'D', 'tq_boss_princess_mesaki', ['tq_boss_princess_mesaki'], ['b19_mesaki'], ['lair19_mesaki'], 'b19_present_jewel_blade'],
    [47, 'D', 'tq_boss_dark_matter_lifeform_x', ['tq_boss_dark_matter_lifeform_x'], ['b19_darkmatter'], ['lair19_darkmatter'], 'b19_dark_matter_veil'],
    [48, 'D', 'tq_boss_missionary_of_betrayal', ['tq_boss_missionary_of_betrayal'], ['b19_betrayal'], ['lair19_betrayal'], 'b19_two_faced_dagger'],
    [49, 'D', 'tq_boss_enduring_human_desire', ['tq_boss_enduring_human_desire'], ['b19_desire'], ['lair19_desire'], 'b19_bronze_desire_mail'],
    [50, 'D', 'tq_boss_averaging_prince', ['tq_boss_averaging_prince'], ['b19_nanpin'], ['lair19_nanpin'], 'b19_hold_fast_lance'],
    [51, 'D', 'tq_boss_former_sauron_consciousness', ['tq_boss_former_sauron_consciousness'], ['b19_remnant'], ['lair19_remnant'], 'b19_ember_tablet_staff'],
    [52, 'D', 'tq_boss_unsmiling_greatshield', ['tq_boss_unsmiling_greatshield'], ['b19_shield'], ['lair19_shield'], 'b19_unsmiling_aegis'],
    [53, 'D', 'tq_boss_game_master', ['tq_boss_game_master'], ['b19_gamemaster'], ['lair19_gamemaster'], 'b19_check_piece'],
    [54, 'D', 'tq_boss_fallen_angel_manjaro', ['tq_boss_fallen_angel_manjaro'], ['b19_manjaro'], ['lair19_manjaro'], 'b19_porcelain_robe'],
    [55, 'D', 'tq_boss_rate_warden_fomsy', ['tq_boss_rate_warden_fomsy'], ['b19_fomsy'], ['lair19_fomsy'], 'b19_rate_gauge_helm'],
    [56, 'D', 'tq_boss_justice_guardian_cybern', ['tq_boss_justice_guardian_cybern'], ['b19_cybern'], ['lair19_cybern'], 'b19_seal_justice_sword'],
    [57, 'D', 'tq_boss_ubud_of_remembrance', ['tq_boss_ubud_of_remembrance'], ['b19_ubud'], ['lair19_ubud'], 'b19_amber_memory_bow'],
    [58, 'D', 'tq_boss_fallen_angel_lookism', ['tq_boss_fallen_angel_lookism'], ['b19_lookism'], ['lair19_lookism'], 'b19_bare_face_cloak'],
    [59, 'D', 'tq_boss_pleasure_djinn_velo', ['tq_boss_pleasure_djinn_velo'], ['b19_velo'], ['lair19_velo'], 'b19_sober_claw'],
    [60, 'D', 'tq_boss_avatar_of_probability', ['tq_boss_avatar_of_probability'], ['b19_probability'], ['lair19_probability'], 'b19_expected_value_axe'],
    [61, 'D', 'tq_boss_gravitational_balance', ['tq_boss_gravitational_balance'], ['b19_balance'], ['lair19_balance'], 'b19_balance_star'],
    [62, 'D', 'tq_boss_crossroads_devil', ['tq_boss_crossroads_devil'], ['b19_crossroads'], ['lair19_crossroads'], 'b19_crossroads_blade'],
    [63, 'E', 'enc_mine_captain', ['chain_warden', 'chain_warden', 'mine_imp'], ['mine_captain'], ['iron_mine_2'], 'bu_mine_captain_helm'],
    [64, 'E', 'enc_hald_guards', ['federal_captain', 'federal_soldier', 'federal_soldier'], ['hald_confronted'], ['kalion_finance'], 'bu_hald_audit_badge'],
    [65, 'E', 'enc_quantum_shades', ['quantum_shade', 'quantum_shade'], ['acad_e_shade'], ['vol_quantum'], 'bu_entangled_ring'],
    [66, 'E', 'enc_castle_seal_1', ['greed_shade', 'greed_shade', 'void_beast'], ['castle_seal_1'], ['demon_castle_2'], 'bu_desire_seal_bracer'],
    [67, 'E', 'enc_castle_seal_2', ['fear_shade', 'fear_shade', 'control_shade'], ['castle_seal_2'], ['demon_castle_3'], 'bu_fear_seal_lantern'],
    [68, 'E', 'enc_castle_seal_3', ['control_shade', 'control_shade', 'void_beast'], ['castle_seal_3'], ['demon_castle_4'], 'bu_control_seal_circlet'],
    [69, 'F', 'boss_greed_demon', ['boss_greed_demon'], [], [], 'bu_legacy_greed_amulet'],
    [70, 'F', 'boss_grote', ['boss_grote'], [], [], 'bu_legacy_grote_shield'],
    [71, 'F', 'sphinx', ['sphinx'], [], [], 'bu_legacy_sphinx_circlet'],
    [72, 'F', 'kraken', ['kraken'], [], [], 'bu_legacy_kraken_spear'],
    [73, 'F', 'dragon_red', ['dragon_red'], [], [], 'bu_legacy_red_mail'],
    [74, 'F', 'demon_lord', ['demon_lord'], [], [], 'bu_legacy_demon_staff']
  ];
  // E のイベント：どの呼び出しで戦うか（encounter ID を渡す場所）
  var ENC_SOURCE = {
    enc_mine_captain: '鉄鎖鉱山 2階の看守長（ボスのイベント doneFlag: mine_captain）',
    enc_hald_guards: '財務局でハルドを問いつめたときの守備隊（js/data/kalion.js）',
    enc_quantum_shades: '量子物理研究室のもつれ測定装置の影（js/data/academy.js）',
    enc_castle_seal_1: '魔王城 2階 欲望の間の封印（js/data/finale.js）', enc_castle_seal_2: '魔王城 3階 恐怖の間の封印（js/data/finale.js）', enc_castle_seal_3: '魔王城 4階 支配の間の封印（js/data/finale.js）'
  };
  // ---------- 基礎値の見直し（v8.7 の釣り合いの確かめ：docs/tools/v87/balance87.js → docs/arch87/REPORT87.md） ----------
  //   新規の装備だけ（既存 26 点の基礎値は変えない）。設計書の提案値（st）はそのまま記録し、ここの値で ITEMS を作る
  //   目安：序盤（想定 Lv30 まで）は、同じころ店で買える同じ枠の最強装備の点数の 1.15 倍まで。中盤以降は 1.30 倍まで（固有効果で差をつける）
  //   点数＝攻撃×1（魔法の職業は×0.3）＋魔力×0.2（魔法の職業は×1）＋防御×0.8＋魔法防御×0.4＋最大HP×0.15＋素早さ×0.3（＋最大MP×0.1 魔法の職業）
  var TUNE = {
    bu_greed_crystal_mail: { def: 15, hp: 10 },          // 提案 防御20・HP15（店の最強の 1.55 倍）→ 1.14 倍
    bu_garon_axe: { atk: 23 },                           // 提案 攻撃24（1.20 倍）→ 1.15 倍
    bu_urga_spear: { atk: 21, mdef: 4 },                 // 提案 攻撃28・魔防4（1.48 倍）→ 1.13 倍
    bu_zarg_chainbreaker: { atk: 31, hp: 20 },           // 提案 攻撃32・HP20（1.17 倍）→ 1.13 倍
    bu_ledger_shield: { def: 13, mdef: 3 },              // 提案 防御16・魔防8（1.54 倍）→ 1.12 倍
    bu_valen_oathblade: { atk: 32, def: 3 },             // 提案 攻撃38・防御5（1.40 倍）→ 1.15 倍
    bu_dorek_bastion: { def: 13, hp: 10 },               // 提案 防御20・HP25（1.90 倍）→ 1.14 倍
    bu_ledger_core_ring: { def: 5, mag: 5, mp: 15 },     // 提案 防御5・魔力5・MP20（1.18 倍）→ 1.13 倍
    bu_wolf_king_claw: { atk: 20, agi: 5 },              // 提案 攻撃22・素早さ5（1.24 倍）→ 1.14 倍
    bu_crystal_resonance_staff: { atk: 8, mag: 9, mp: 5 },  // 提案 攻撃10・魔力10・MP15（1.39 倍）→ 1.14 倍
    bu_gull_admiral_hat: { def: 7, agi: 3 },             // 提案 防御10・素早さ5（1.64 倍）→ 1.12 倍
    bu_mine_captain_helm: { def: 7, hp: 5 },             // 提案 防御12・HP15（2.12 倍）→ 1.13 倍
    bu_memory_keeper_helm: { def: 14, mag: 6, mp: 20 },  // 提案 防御17・魔力6・MP25（1.42 倍）→ 1.23 倍
    bu_observer_lens: { def: 4, mag: 6, mdef: 6 },       // 提案 防御5・魔力6・魔防8（1.38 倍）→ 1.21 倍
    bu_archive_backup_mail: { def: 45, mdef: 10, hp: 30 },  // 提案 防御49・魔防12・HP40（1.45 倍）→ 1.29 倍
    bu_sevran_blank_robe: { def: 37, mag: 10, mdef: 14 },   // 提案 防御40・魔力12・魔防16（1.41 倍）→ 1.26 倍
    bu_fear_break_shield: { def: 31, mdef: 10, hp: 30 },    // 提案 防御31・魔防14・HP40（1.38 倍）→ 1.26 倍
    bu_anchor_gravity_helm: { def: 16, mdef: 8, hp: 15 }    // 提案 防御28・魔防15・HP50（2.49 倍）→ 1.27 倍
  };

  var GROUP_NAME = { A: '本編・地域のボス', B: '隠し・任意のボス', C: '地球型の追加地域のボス', D: '異界の門', E: 'イベントの中ボス', F: '予約（未使用）' };

  // ---------- 装備の定義（新規）と強化（既存） ----------
  var ROWS = [], BY_KEY = {}, BY_ITEM = {}, BY_DONE = {};
  var errors = [];
  T.forEach(function (r) {
    var row = { no: r[0], group: r[1], key: r[2], enemyIds: r[3], defeatFlags: r[4], sourceMapIds: r[5], itemId: r[6], encounter: r[2].indexOf('enc_') === 0 ? r[2] : null,
      availability: r[1] === 'F' ? 'reserved' : 'active', schemaVersion: 1 };
    if (row.encounter) row.encSource = ENC_SOURCE[row.encounter];
    var gd = row.availability === 'reserved' ? RESERVED[row.itemId] : G[row.itemId];
    if (!gd) { errors.push('装備の定義がない ' + row.itemId); return; }
    row.unique = { name: gd.u, text: gd.text };
    row.effects = (gd.ug || []).map(function (e) { return Object.assign({}, e); });
    row.fxAdded = gd.fx ? JSON.parse(JSON.stringify(gd.fx)) : null; row.immuneAdded = gd.immune ? gd.immune.slice() : null;
    row.lore = gd.lore || ''; row.col = gd.col || null; row.status = gd.status || 'reserved';
    if (row.availability === 'reserved') { row.reserved = { name: gd.name, type: gd.type, cat: gd.cat || 'armor', st: gd.st }; }
    else if (gd.status === 'new') {
      if (ITEMS[row.itemId]) { errors.push('新規のはずの ID が既にある ' + row.itemId); return; }
      var it = { id: row.itemId, name: gd.name, cat: gd.cat, type: gd.type, price: 0, noShop: true, rare: 'legend' };
      var st87 = TUNE[row.itemId] || gd.st || {}; row.proposedSt = Object.assign({}, gd.st || {}); if (TUNE[row.itemId]) row.tunedSt = Object.assign({}, TUNE[row.itemId]);
      Object.keys(st87).forEach(function (k) { it[k] = st87[k]; });
      if (gd.fx) it.fx = JSON.parse(JSON.stringify(gd.fx)); if (gd.immune) it.immune = gd.immune.slice();
      ITEMS[row.itemId] = it; if (root.ITEM_LIST && root.ITEM_LIST.indexOf(row.itemId) < 0) root.ITEM_LIST.push(row.itemId);
    } else {
      var ex = ITEMS[row.itemId]; if (!ex) { errors.push('既存のはずの装備がない ' + row.itemId); return; }
      row.before = { name: ex.name, cat: ex.cat, type: ex.type, atk: ex.atk || 0, def: ex.def || 0, mag: ex.mag || 0, mdef: ex.mdef || 0, agi: ex.agi || 0, hp: ex.hp || 0, mp: ex.mp || 0, element: ex.element || null, fx: ex.fx ? JSON.parse(JSON.stringify(ex.fx)) : null, desc: ex.desc || '' };
      if (gd.fx) ex.fx = Object.assign({}, ex.fx || {}, JSON.parse(JSON.stringify(gd.fx)));
      if (gd.immune) ex.immune = (ex.immune || []).concat(gd.immune.filter(function (k) { return (ex.immune || []).indexOf(k) < 0; }));
      // 笑わぬ大盾の反撃（既存 counterChance 12%）は、固有効果の反撃（1ターン1回・proc つき）に移す（同じ意味を二重に計算しない）
      if (row.itemId === 'b19_unsmiling_aegis' && ex.fx && ex.fx.counterChance) { row.movedFx = { counterChance: ex.fx.counterChance }; delete ex.fx.counterChance; }
      ex.price = 0; ex.noShop = true; if (!ex.rare) ex.rare = 'legend';
    }
    if (row.availability === 'active') {
      var item = ITEMS[row.itemId];
      item.bossExclusive = true; item.sourceBossKey = row.key; item.sellable = false; item.discardable = false; item.unique = true; item.ugRow = row.no;
      item.ug = row.effects; item.uniqueName = gd.u; item.uniqueText = gd.text; item.lore = gd.lore || '';
      item.desc = (gd.lore ? gd.lore + '。' : '') + '【' + gd.u + '】' + gd.text;
    }
    ROWS.push(row); BY_KEY[row.key] = row; BY_ITEM[row.itemId] = row;
    row.defeatFlags.forEach(function (f) { BY_DONE[f] = row; });
  });
  // 既存の専用ドロップ 7 点：ボスの通常の drops から外す（固有報酬の付与に一本化。ほかの drops はそのまま）
  Object.keys(TUNE).forEach(function (k) { if (!G[k] || G[k].status !== 'new') errors.push('基礎値の見直しは新規の装備だけ ' + k); });
  var EN = root.ENEMIES || {}; var movedDrops = [];
  ROWS.forEach(function (row) {
    if (row.availability !== 'active' || row.group === 'E') return;
    row.enemyIds.forEach(function (eid) { var e = EN[eid]; if (!e || !e.drops) return; var n0 = e.drops.length; e.drops = e.drops.filter(function (d) { return d.item !== row.itemId; }); if (e.drops.length !== n0) movedDrops.push(eid + '→' + row.itemId); });
  });
  root.BOSS_UNIQUE_GEAR = { schemaVersion: 1, rows: ROWS, byKey: BY_KEY, byItem: BY_ITEM, byDoneFlag: BY_DONE, groups: GROUP_NAME, reserved: RESERVED, movedDrops: movedDrops, errors: errors };
  if (errors.length && root.console) console.warn('BOSS_UNIQUE_GEAR', errors);
})(typeof window !== 'undefined' ? window : globalThis);
