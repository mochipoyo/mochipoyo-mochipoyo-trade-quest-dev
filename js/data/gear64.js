/* =========================================================
   Data / Gear v6.4（Phase B）：武器32・防具28・アクセサリー20・消費アイテム20 と、その入手先
   ・既存の ITEMS に追加するだけ（既存のIDは変えない・消さない）。IDの重複は tests（work/gear64test.js）で確認
   ・性能は章ごとの段階（tier）に合わせる：T1＝第1〜2章、T2＝第3〜5章、T3＝第6〜8章、T4＝第9〜12章、T5＝第13〜14章、T6＝第15〜16章・隠し
   ・特殊効果（fx）は js/rpg/combat.js で実際に計算する（下の FX_DOC に一覧）。同じ効果の重ね掛けには上限（FX_CAP）
   ・入手先：GEAR64_SOURCES（店は SHOP_ADD として Services.shop が品ぞろえの後ろに足す。after は「そのメインクエストを達成したあと」）
   ・ゲーム内の戦闘・探索にだけ作用する。名前にトレード用語があっても、現実の売買の利益を保証するものではない
   ========================================================= */
(function (root) {
  'use strict';
  var ITEMS = root.ITEMS;
  var NEW = [];
  function add(id, o) {
    if (ITEMS[id]) throw new Error('gear64: ID が重複しています ' + id);
    ITEMS[id] = Object.assign({ id: id }, o); NEW.push(id);
    if (root.ITEM_LIST && root.ITEM_LIST.indexOf(id) < 0) root.ITEM_LIST.push(id);
  }
  function W(id, name, type, atk, price, tier, extra) { add(id, Object.assign({ name: name, cat: 'weapon', type: type, atk: atk, price: price, tier: tier }, extra || {})); }
  function A(id, name, type, def, price, tier, extra) { add(id, Object.assign({ name: name, cat: 'armor', type: type, def: def, price: price, tier: tier }, extra || {})); }
  function C(id, name, price, tier, effect, desc, extra) { add(id, Object.assign({ name: name, cat: 'consumable', price: price, tier: tier, effect: effect, desc: desc }, extra || {})); }

  /* ---------- 武器 32 ---------- */
  // 剣
  W('yang_sword', '陽線の剣', 'sword', 18, 1100, 2, { element: 'fire', fx: { bonusElem: { element: 'fire', mult: 0.25 } }, desc: '赤い陽線を刻んだ剣。炎属性。通常攻撃のあと、炎の追加ダメージ（与えたダメージの25%）' });
  W('yin_sword', '陰線の剣', 'sword', 27, 2600, 3, { element: 'ice', fx: { onHit: { agi: -0.2, turns: 2 } }, desc: '青い陰線を刻んだ剣。氷属性。当たった敵の素早さを2ターン20%下げる' });
  W('resistance_blade', 'レジスタンスブレード', 'sword', 35, 4200, 4, { def: 4, fx: { pierce: 0.15 }, desc: '抵抗線を断つ剣。防御+4。通常攻撃が敵の防御を15%無視する' });
  W('equilibrium_sword', '均衡断ちの聖剣', 'sword', 64, 0, 6, { element: 'light', fx: { critUp: 0.05, bonusElem: { element: 'light', mult: 0.2 } }, rare: 'legend', desc: '魔王城に眠っていた聖剣。光属性。会心率+5%、通常攻撃のあと光の追加ダメージ（20%）' });
  // 短剣
  W('pinbar_dagger', 'ピンバー短剣', 'dagger', 12, 650, 1, { agi: 3, fx: { critUp: 0.1 }, desc: '長いヒゲのような刃。素早さ+3。会心率+10%' });
  W('breakout_dagger', 'ブレイクアウトダガー', 'dagger', 22, 2200, 3, { agi: 4, fx: { pierce: 0.3 }, desc: '壁を突き抜ける短剣。素早さ+4。通常攻撃が敵の防御を30%無視する' });
  W('contrarian_blade', '逆張りの刃', 'dagger', 31, 3900, 4, { agi: 4, fx: { reversal: 0.8 }, desc: 'HPが減った敵ほど威力が上がる（最大+80%）。銘「相場の逆張りは根拠と損切りが先。この刃は魔物にだけ使え」' });
  W('silent_knife', '無音のアサシンナイフ', 'dagger', 43, 6400, 5, { agi: 6, fx: { critUp: 0.08, onHitStatus: { id: 'poison', chance: 0.2 } }, desc: '音のない刃。素早さ+6。会心率+8%、当たると20%で毒' });
  // 槍
  W('pullback_spear', '押し目の長槍', 'spear', 20, 1300, 2, { fx: { afterDefend: 0.35 }, desc: '防御した次のターン、通常攻撃の威力+35%（押し目を待ってから突く）' });
  W('takeprofit_trident', '利確の三叉槍', 'spear', 30, 3000, 3, { fx: { killMp: 0.06 }, desc: '敵を倒すと、最大MPの6%を回復する' });
  W('ryumyaku_spear', '竜脈穿ちの槍', 'spear', 50, 7200, 5, { element: 'fire', fx: { pierce: 0.2 }, desc: '竜脈の熱を宿す槍。炎属性。通常攻撃が敵の防御を20%無視する' });
  W('star_cycle_spear', '星周期の槍', 'spear', 58, 0, 6, { fx: { cycle: { n: 3, mult: 1.6 } }, rare: 'legend', desc: '星の周期を刻んだ槍。3ターンごと（3・6・9…ターン目）の通常攻撃が1.6倍' });
  // 斧
  W('momentum_axe', 'モメンタムアックス', 'axe', 20, 1350, 2, { fx: { momentum: 0.25 }, desc: '前のターンにも攻撃していれば、威力+25%（勢いに乗る）' });
  W('chainbreak_axe', '鉄鎖破りの斧', 'axe', 29, 2900, 3, { fx: { onHitDef: { def: -0.2, turns: 2 } }, desc: 'ヴェルムの鍛冶が鎖を断つために打った斧。当たった敵の防御を2ターン20%下げる' });
  W('crater_axe', '火口の戦斧', 'axe', 51, 7000, 5, { element: 'fire', desc: '火口の溶岩で焼き入れした戦斧。炎属性' });
  W('crash_axe', '暴落粉砕斧', 'axe', 62, 0, 6, { agi: -3, fx: { familyMult: { families: ['相場の魔物系'], mult: 1.3 } }, rare: 'legend', desc: '素早さ-3。相場の魔物系に1.3倍のダメージ' });
  // 弓
  W('breakconfirm_bow', 'ブレイク確認の弓', 'bow', 17, 1150, 2, { fx: { firstStrike: 0.4 }, desc: '戦闘で最初の通常攻撃の威力+40%（確認してから射る）' });
  W('range_bow', '値幅測定の弓', 'bow', 27, 2700, 3, { agi: 2, fx: { steady: true }, desc: '目盛り付きの弓。素早さ+2。ダメージの下振れがなくなる' });
  W('prob_hunt_bow', '確率の狩弓', 'bow', 35, 4300, 4, { fx: { critUp: 0.08 }, desc: '会心率+8%。狙いが安定する狩人の弓' });
  W('azure_longbow', '蒼天の長弓', 'bow', 48, 7000, 5, { agi: 4, element: 'wind', desc: '空の色をした長弓。風属性。素早さ+4' });
  // 杖
  W('compound_staff', '複利の杖', 'staff', 8, 1200, 2, { mag: 8, fx: { mpRegen: 0.03 }, desc: '魔力+8。毎ターンの終わりに最大MPの3%を回復（少しずつ積み上がる）' });
  W('stats_staff', '統計の魔杖', 'staff', 12, 2800, 3, { mag: 13, mdef: 4, fx: { spellMult: 1.08 }, desc: '魔力+13・魔防+4。攻撃魔法の威力+8%' });
  W('oracle_staff', 'オラクル解析杖', 'staff', 18, 4600, 4, { mag: 18, fx: { autoScan: true }, desc: '魔力+18。戦闘の始めに、敵の弱点と耐性を表示する' });
  W('spacetime_staff', '時空観測の杖', 'staff', 26, 0, 6, { mag: 30, mp: 30, fx: { spellMult: 1.12, mpRegen: 0.03 }, rare: 'legend', desc: '魔力+30・最大MP+30。攻撃魔法の威力+12%、毎ターン最大MPの3%を回復' });
  // 棍棒・槌
  W('candle_hammer', 'ローソクの鉄槌', 'club', 15, 900, 2, { fx: { onHitStatus: { id: 'paralyze', chance: 0.15 } }, desc: 'ローソク足の形の鉄槌。当たると15%で麻痺' });
  W('margin_hammer', 'マージンハンマー', 'club', 28, 2800, 3, { fx: { highHp: { above: 0.8, mult: 0.2 } }, desc: '自分のHPが80%以上のとき、威力+20%（余裕があるときに振る）' });
  W('basis_rod', '根拠の鉄棍', 'club', 34, 4100, 4, { def: 4, mag: 6, fx: { steady: true }, desc: '防御+4・魔力+6。ダメージの下振れがなくなる' });
  W('scale_mace', '天秤の聖槌', 'club', 46, 6800, 5, { element: 'light', mag: 6, fx: { healMult: 1.15 }, desc: '光属性・魔力+6。回復呪文の回復量+15%' });
  // 爪
  W('retro_claw', '逆行の爪', 'claw', 18, 1200, 2, { agi: 3, fx: { counterChance: 0.15 }, desc: '素早さ+3。敵の攻撃を受けたとき、15%で反撃する' });
  W('thunder_claw', '雷迅の鉤爪', 'claw', 28, 2900, 3, { agi: 4, element: 'thunder', desc: '雷属性。素早さ+4' });
  W('losscut_claw', '損失遮断の爪', 'claw', 36, 4200, 4, { agi: 4, fx: { afterAtkDef: { def: 0.2, turns: 2 } }, desc: '素早さ+4。通常攻撃のあと、自分の防御力が2ターン20%上がる' });
  W('obsidian_twin', '黒曜の双爪', 'claw', 46, 0, 5, { agi: 5, element: 'dark', fx: { multiHit: { n: 2, mult: 0.6 } }, rare: 'rare', desc: '闇属性・素早さ+5。通常攻撃が2回当たる（各0.6倍）' });

  /* ---------- 防具 28 ---------- */
  // 重鎧（物理防御が高く、素早さが下がる）
  A('copperwall_armor', '銅壁の鎧', 'heavy', 14, 1100, 2, { agi: -1, desc: '銅板を重ねた鎧。素早さ-1' });
  A('ashiron_plate', '灰鉄の胸甲', 'heavy', 17, 1500, 2, { agi: -2, fx: { resist: { fire: 0.85 } }, desc: '灰鉄で打った胸甲。素早さ-2。炎のダメージ-15%' });
  A('prob_armor', '確率装甲', 'heavy', 24, 3300, 3, { agi: -2, fx: { evade: 0.05 }, desc: '素早さ-2。敵の単体攻撃を5%でそらす' });
  A('federal_plate', '連邦重甲', 'heavy', 28, 3900, 3, { agi: -3, mdef: 2, desc: 'カリオン連邦の重装兵の鎧。素早さ-3・魔防+2' });
  A('deepsea_armor', '深海装甲', 'heavy', 33, 0, 4, { agi: -3, fx: { resist: { ice: 0.75 } }, rare: 'rare', desc: '海底都市の潜水鎧。素早さ-3。氷のダメージ-25%' });
  A('final_plate', '終局のプレート', 'heavy', 48, 0, 6, { agi: -3, mdef: 8, fx: { bigHitCut: { over: 0.25, cut: 0.3 } }, rare: 'legend', desc: '素早さ-3・魔防+8。最大HPの25%を超える一撃を30%軽減' });
  // 軽鎧・服（素早さ寄り）
  A('trader_coat', '旅商人の上衣', 'light', 5, 280, 1, { agi: 1, fx: { goldUp: 0.05 }, desc: '素早さ+1。戦闘で得るGが+5%（商人なら+10%）' });
  A('surf_armor', '波乗りの軽鎧', 'light', 12, 1100, 2, { agi: 3, fx: { resist: { ice: 0.9 } }, desc: '素早さ+3。氷のダメージ-10%' });
  A('seabreeze_leather', '潮風の革鎧', 'light', 14, 1300, 2, { agi: 2, fx: { resist: { wind: 0.8 } }, desc: '素早さ+2。風のダメージ-20%' });
  A('auditor_coat', '監査官の上着', 'light', 20, 2600, 3, { agi: 2, mag: 4, fx: { statusResist: 0.2 }, desc: '素早さ+2・魔力+4。状態異常にかかる確率-20%' });
  A('sandstorm_cloak', '砂嵐の外套', 'light', 25, 3500, 4, { agi: 3, fx: { resist: { wind: 0.75 } }, desc: '素早さ+3。風のダメージ-25%' });
  A('stardrift_mail', '星渡りの軽鎧', 'light', 34, 6800, 5, { agi: 5, mdef: 6, desc: '素早さ+5・魔防+6' });
  // ローブ（魔法耐性に優れる）
  A('statistician_robe', '統計学者のローブ', 'robe', 8, 1000, 2, { mag: 4, mdef: 6, desc: '魔力+4・魔防+6' });
  A('antiretro_vestment', '逆行耐性の法衣', 'robe', 15, 2700, 3, { mag: 5, mdef: 8, immune: ['confuse'], desc: '魔力+5・魔防+8。混乱しない' });
  A('iceport_robe', '氷港の魔導衣', 'robe', 23, 4600, 5, { mag: 6, mdef: 10, fx: { resist: { ice: 0.75 } }, desc: '魔力+6・魔防+10。氷のダメージ-25%' });
  A('chrono_formal', '時詠みの礼装', 'robe', 26, 5200, 4, { mag: 8, mdef: 12, agi: 3, desc: '魔力+8・魔防+12・素早さ+3' });
  A('voidward_robe', '虚無を払う法衣', 'robe', 34, 0, 6, { mag: 10, mdef: 16, fx: { resist: { dark: 0.7 } }, rare: 'legend', desc: '魔力+10・魔防+16。闇のダメージ-30%' });
  // 盾
  A('dow_buckler', 'ダウの小盾', 'shield', 5, 300, 1, { agi: 1, desc: '高値と安値の印の小盾。素早さ+1' });
  A('pullback_shield', '押し目の盾', 'shield', 13, 2000, 3, { dmgReduce: 0.1, desc: '単体攻撃の被ダメージ-10%' });
  A('ironcastle_shield', '鉄城の大盾', 'shield', 22, 4200, 4, { agi: -2, dmgReduce: 0.15, desc: '素早さ-2。単体攻撃の被ダメージ-15%' });
  A('mana_barrier_shield', 'マナ防壁', 'shield', 20, 6400, 5, { mdef: 14, fx: { resistAll: 0.9 }, desc: '魔防+14。すべての属性のダメージ-10%' });
  A('doom_guard_shield', '終末の守護盾', 'shield', 32, 0, 6, { mdef: 12, fx: { statusResist: 0.3 }, rare: 'legend', desc: '魔防+12。状態異常にかかる確率-30%' });
  // 兜
  A('smoked_helm', '燻銀の兜', 'helm', 7, 650, 2, { desc: '燻した銀の兜' });
  A('seachart_helm', '海図の兜', 'helm', 12, 2600, 4, { agi: 2, fx: { seaEnc: 0.85 }, desc: '素早さ+2。船に乗っているときの敵の出現-15%' });
  A('math_helm', '数理の兜', 'helm', 16, 4500, 5, { mag: 4, immune: ['confuse'], desc: '魔力+4。混乱しない' });
  // 帽子
  A('hilo_hat', '高値安値の帽子', 'hat', 4, 550, 2, { agi: 2, mag: 2, desc: '素早さ+2・魔力+2' });
  A('desert_star_hat', '砂漠の星帽', 'hat', 9, 2900, 4, { mag: 5, fx: { resist: { fire: 0.85 } }, desc: '魔力+5。炎のダメージ-15%' });
  A('icecrystal_hood', '氷晶の頭巾', 'hat', 12, 4400, 5, { mag: 6, fx: { resist: { ice: 0.7 } }, desc: '魔力+6。氷のダメージ-30%' });

  /* ---------- アクセサリー 20 ---------- */
  A('scalein_ring', '分割利確の指輪', 'acc', 2, 2400, 3, { fx: { rampDef: { per: 0.05, max: 0.25 } }, desc: '戦闘が長引くほど防御力が上がる（2ターン目から毎ターン+5%、最大+25%）' });
  A('stoporder_ring', '逆指値の指輪', 'acc', 1, 0, 4, { fx: { guts: 0.25 }, rare: 'rare', desc: '倒れるダメージを25%でHP1で踏みとどまる（戦闘中1回）' });
  A('ev_bracelet', '期待値の腕輪', 'acc', 1, 3000, 4, { fx: { critUp: 0.05 }, desc: '会心率+5%' });
  A('streak_charm', '連敗耐性の護符', 'acc', 2, 2600, 3, { fx: { statusResist: 0.3 }, desc: '状態異常にかかる確率-30%' });
  A('star_compass', '航海星図のコンパス', 'acc', 1, 1800, 3, { fx: { seaEnc: 0.7 }, desc: '船に乗っているときの敵の出現-30%' });
  A('nonslip_charm', '滑落防止の靴飾り', 'acc', 1, 1600, 2, { agi: 7, desc: '素早さ+7' });
  A('target_pendant', '利確標的のペンダント', 'acc', 1, 2200, 3, { atk: 2, fx: { steady: true }, desc: '攻撃+2。狙いが安定し、ダメージの下振れがなくなる' });
  A('breakeven_crest', '損益分岐の紋章', 'acc', 5, 3600, 4, { mdef: 8, desc: '防御+5・魔防+8' });
  A('thinice_brooch', '薄氷のブローチ', 'acc', 1, 2800, 5, { fx: { resist: { ice: 0.6 } }, desc: '氷のダメージ-40%' });
  A('dragon_heart', 'ドラゴンの心核', 'acc', 2, 0, 5, { hp: 50, fx: { resist: { fire: 0.6 } }, rare: 'rare', desc: '最大HP+50。炎のダメージ-40%' });
  A('observer_lens', '観測者のレンズ', 'acc', 1, 3200, 4, { mag: 2, fx: { autoScan: true }, desc: '魔力+2。戦闘の始めに、敵の弱点と耐性を表示する' });
  A('memory_drop', '記憶のしずく', 'acc', 1, 2400, 3, { mp: 25, desc: '最大MP+25' });
  A('market_bell', 'マーケットベル', 'acc', 1, 3000, 3, { fx: { goldUp: 0.1 }, desc: '戦闘で得るGが+10%（商人なら+20%）' });
  A('vol_earring', 'ボラティリティの耳飾り', 'acc', 1, 3400, 4, { agi: 5, fx: { evade: 0.05 }, desc: '素早さ+5。敵の単体攻撃を5%でかわす' });
  A('candle_stone', 'ローソクの守り石', 'acc', 2, 4800, 5, { fx: { resistAll: 0.85 }, desc: 'すべての属性のダメージ-15%' });
  A('pivot_ring', 'ピボットリング', 'acc', 0, 3800, 4, { atk: 8, desc: '攻撃+8' });
  A('allocation_bangle', '資金配分の腕輪', 'acc', 6, 2600, 3, { hp: 30, desc: '防御+6・最大HP+30' });
  A('oath_chain', '誓いの鎖', 'acc', 3, 0, 3, { fx: { coverCut: 0.3 }, rare: 'rare', desc: '仲間をかばっているとき、受けるダメージ-30%' });
  A('reversal_warning', '反転注意の護符', 'acc', 1, 1500, 2, { immune: ['confuse'], desc: '混乱しない' });
  A('astral_lodestone', '星界の羅針石', 'acc', 2, 0, 6, { agi: 3, fx: { compass: true, sight: 2 }, rare: 'legend', desc: '素早さ+3。ダンジョンで階段・扉の位置が見え、見える範囲+2' });

  /* ---------- 消費アイテム 20 ---------- */
  // use: any（いつでも）/ battle（戦闘中だけ）/ field（フィールド・ダンジョンだけ）  target: ally / dead_ally / party / self
  C('small_vial', '小さな薬瓶', 35, 1, { hp: 40 }, 'HPを40回復', { use: 'any', target: 'ally' });
  C('healing_salve', '治癒膏', 110, 2, { hp: 120 }, 'HPを120回復', { use: 'any', target: 'ally' });
  C('field_kit', '野戦救護箱', 420, 4, { hp: 300 }, 'HPを300回復', { use: 'any', target: 'ally' });
  C('herb_soup', '薬草スープ', 40, 1, { hp: 45 }, 'HPを45回復。苦いが体が温まる', { use: 'any', target: 'ally', food: 'food' });
  C('mountain_stew', '山岳シチュー', 130, 3, { hp: 140 }, 'HPを140回復。峠の宿の名物', { use: 'any', target: 'ally', food: 'food' });
  C('seafood_hotpot', '海鮮鍋', 380, 4, { hp: 320 }, 'HPを320回復。港の漁師の鍋', { use: 'any', target: 'ally', food: 'food' });
  C('spice_soup', '香辛料スープ', 140, 4, { hp: 150 }, 'HPを150回復。砂都の屋台の味', { use: 'any', target: 'ally', food: 'food' });
  C('hot_milk', '氷港のホットミルク', 100, 5, { mp: 25 }, 'MPを25回復。凍える港の朝の一杯', { use: 'any', target: 'ally', food: 'drink' });
  C('spirit_drop', '精霊の雫', 900, 5, { mp: 120 }, 'MPを120回復', { use: 'any', target: 'ally' });
  C('mana_tea', '魔力の茶葉', 300, 3, { mp: 60 }, 'MPを60回復', { use: 'any', target: 'ally', food: 'drink' });
  C('sleep_cure', '眠気覚まし薬', 30, 1, { cure: ['sleep'] }, '眠りを治す', { use: 'any', target: 'ally' });
  C('calm_incense', '神経安定の香', 45, 2, { cure: ['confuse'] }, '混乱を治す', { use: 'any', target: 'ally' });
  C('panacea', '万能解毒薬', 160, 3, { cure: ['poison', 'sleep', 'paralyze', 'confuse', 'silence'] }, '毒・眠り・麻痺・混乱・沈黙をすべて治す', { use: 'any', target: 'ally' });
  C('muscle_relaxant', '筋肉ほぐしの薬', 40, 1, { cure: ['paralyze'] }, '麻痺を治す', { use: 'any', target: 'ally' });
  C('revive_lantern', '蘇生の灯火', 300, 3, { revive: 0.25 }, '戦闘不能の仲間をHP25%で復活', { use: 'any', target: 'dead_ally' });
  C('phoenix_ash', '不死鳥の灰', 2400, 5, { revive: 0.8 }, '戦闘不能の仲間をHP80%で復活。店では売っていない希少品', { use: 'any', target: 'dead_ally', rare: 'rare' });
  C('retreat_smoke', '撤退の煙玉', 90, 1, { escape: true }, '通常の戦闘から確実に逃げる（ボス戦では使えない）', { use: 'battle', target: 'self', battleOnly: true });
  C('camp_kit', '携帯宿営セット', 150, 2, { partyHeal: 0.5 }, 'フィールド・ダンジョンで全員のHPとMPを最大の50%ぶん回復', { use: 'field', target: 'party', fieldOnly: true });
  C('danger_bell', '危険察知の鐘', 200, 2, { repel: 150 }, '150歩のあいだ、陸の敵に出会いにくくなる（出現-65%）', { use: 'field', target: 'party', fieldOnly: true });
  C('seabreeze_charm', '潮風の護符', 240, 2, { seaRepel: 200 }, '200歩のあいだ、海の敵に出会いにくくなる（出現-60%）', { use: 'field', target: 'party', fieldOnly: true });

  /* ---------- 既存アイテムの表示用の分類（cat は変えない） ---------- */
  ['ore_chunk', 'dragon_scale'].forEach(function (id) { if (ITEMS[id]) ITEMS[id].subcategory = 'material'; });

  /* ---------- 入手先 ----------
     shop: [マップID（店の建物）, after（そのメインクエスト達成後。なしは最初から）]
     chest: [マップID, 宝箱ID, x, y]（行き止まりのマスに置く。通路をふさがない） drop: [敵ID, 確率]  reward: 文章 */
  var S = root.GEAR64_SOURCES = {
    // 武器
    yang_sword: { ch: 3, shop: [['rivel_weapon_shop', 'main_3']] },
    yin_sword: { ch: 6, shop: [['kalion_weapon', null]] },
    resistance_blade: { ch: 9, shop: [['sahar_weapon', null]] },
    equilibrium_sword: { ch: 16, chest: [['demon_castle_4', 'g64_dc4']] },
    pinbar_dagger: { ch: 2, shop: [['dow_weapon_shop', null]] },
    breakout_dagger: { ch: 6, shop: [['kalion_weapon', null]] },
    contrarian_blade: { ch: 10, shop: [['tempus_weapon', null]] },
    silent_knife: { ch: 13, shop: [['magicka_weapon', null]] },
    pullback_spear: { ch: 3, shop: [['dow_weapon_shop', 'main_3']] },
    takeprofit_trident: { ch: 7, shop: [['kalion_weapon', 'main_6']] },
    ryumyaku_spear: { ch: 13, shop: [['ignas_forge', null]] },
    star_cycle_spear: { ch: 14, chest: [['sky_temple_2', 'g64_st2']] },
    momentum_axe: { ch: 3, shop: [['rivel_weapon_shop', 'main_3']] },
    chainbreak_axe: { ch: 5, chest: [['iron_mine_2', 'g64_im3']], shop: [['kalion_weapon', null]] },
    crater_axe: { ch: 13, shop: [['ignas_forge', null]] },
    crash_axe: { ch: 16, chest: [['demon_castle_2', 'g64_dc2']] },
    breakconfirm_bow: { ch: 3, shop: [['dow_weapon_shop', 'main_3']] },
    range_bow: { ch: 6, shop: [['kalion_weapon', null]] },
    prob_hunt_bow: { ch: 9, shop: [['sahar_weapon', null]] },
    azure_longbow: { ch: 13, shop: [['magicka_weapon', null]] },
    compound_staff: { ch: 3, shop: [['rivel_weapon_shop', 'main_3']] },
    stats_staff: { ch: 6, shop: [['kalion_weapon', null]] },
    oracle_staff: { ch: 11, shop: [['node_market', null]] },
    spacetime_staff: { ch: 16, chest: [['demon_castle_3', 'g64_dc3']] },
    candle_hammer: { ch: 3, shop: [['rivel_weapon_shop', 'main_2']] },
    margin_hammer: { ch: 6, shop: [['kalion_weapon', null]] },
    basis_rod: { ch: 10, shop: [['tempus_weapon', null]] },
    scale_mace: { ch: 13, shop: [['magicka_weapon', null]] },
    retro_claw: { ch: 3, shop: [['dow_weapon_shop', 'main_3']] },
    thunder_claw: { ch: 6, shop: [['kalion_weapon', null]] },
    losscut_claw: { ch: 9, shop: [['sahar_weapon', null]] },
    obsidian_twin: { ch: 13, chest: [['old_city_deep_2', 'g64_ocd2']], drop: [['obsidian_golem', 0.02]] },
    // 防具
    copperwall_armor: { ch: 3, shop: [['rivel_armor_shop', 'main_3']] },
    ashiron_plate: { ch: 5, chest: [['grania_pass', 'g64_gp']] },
    prob_armor: { ch: 6, shop: [['kalion_armor', null]] },
    federal_plate: { ch: 7, shop: [['kalion_armor', 'main_6']] },
    deepsea_armor: { ch: 9, chest: [['elmina_undersea', 'g64_eu']] },
    final_plate: { ch: 16, chest: [['demon_castle_1', 'g64_dc1']] },
    trader_coat: { ch: 1, shop: [['rivel_armor_shop', null]] },
    surf_armor: { ch: 4, shop: [['rivel_armor_shop', 'main_3']] },
    seabreeze_leather: { ch: 4, shop: [['dow_weapon_shop', 'main_4']] },
    auditor_coat: { ch: 7, shop: [['kalion_armor', 'main_6']] },
    sandstorm_cloak: { ch: 9, shop: [['sahar_armor', null]] },
    stardrift_mail: { ch: 13, shop: [['magicka_armor', null]] },
    statistician_robe: { ch: 3, shop: [['rivel_armor_shop', 'main_3']] },
    antiretro_vestment: { ch: 7, shop: [['sentra_armor', null]] },
    iceport_robe: { ch: 13, shop: [['frost_armor', null]] },
    chrono_formal: { ch: 10, shop: [['tempus_armor', 'main_10']] },
    voidward_robe: { ch: 15, chest: [['void_wasteland_2', 'g64_vw2']] },
    dow_buckler: { ch: 1, shop: [['rivel_armor_shop', null]] },
    pullback_shield: { ch: 6, shop: [['kalion_armor', null]] },
    ironcastle_shield: { ch: 10, shop: [['tempus_armor', null]] },
    mana_barrier_shield: { ch: 13, shop: [['magicka_armor', null]] },
    doom_guard_shield: { ch: 16, chest: [['demon_castle_5', 'g64_dc5']] },
    smoked_helm: { ch: 3, shop: [['rivel_armor_shop', 'main_3']] },
    seachart_helm: { ch: 10, shop: [['tempus_armor', null]] },
    math_helm: { ch: 13, shop: [['magicka_armor', null]] },
    hilo_hat: { ch: 3, shop: [['dow_weapon_shop', 'main_3']] },
    desert_star_hat: { ch: 9, shop: [['sahar_armor', null]] },
    icecrystal_hood: { ch: 13, shop: [['frost_armor', null]] },
    // アクセサリー
    scalein_ring: { ch: 6, shop: [['kalion_armor', null]] },
    stoporder_ring: { ch: 10, chest: [['time_bank_vault_1', 'g64_tb1']] },
    ev_bracelet: { ch: 9, shop: [['sahar_armor', null]] },
    streak_charm: { ch: 7, shop: [['sentra_armor', null]] },
    star_compass: { ch: 8, shop: [['aruna_item', null]] },
    nonslip_charm: { ch: 4, shop: [['dow_weapon_shop', 'main_4']] },
    target_pendant: { ch: 6, shop: [['kalion_armor', null]] },
    breakeven_crest: { ch: 10, shop: [['tempus_armor', null]] },
    thinice_brooch: { ch: 13, shop: [['frost_armor', null]] },
    dragon_heart: { ch: 13, chest: [['dragon_vein_deep_2', 'g64_dvd2']] },
    observer_lens: { ch: 11, shop: [['node_armor', null]] },
    memory_drop: { ch: 9, chest: [['memory_library', 'g64_ml']] },
    market_bell: { ch: 7, shop: [['luxbell_item', null], ['kalion_item', 'main_6']] },
    vol_earring: { ch: 10, shop: [['tempus_armor', null]] },
    candle_stone: { ch: 13, shop: [['magicka_armor', null]] },
    pivot_ring: { ch: 9, shop: [['sahar_armor', null]] },
    allocation_bangle: { ch: 7, shop: [['sentra_armor', null]] },
    oath_chain: { ch: 6, chest: [['kalion_archive_2', 'g64_ka2']] },
    reversal_warning: { ch: 4, shop: [['rivel_armor_shop', 'main_4']] },
    astral_lodestone: { ch: 14, chest: [['star_tower_2', 'g64_stt2']] },
    // 消費アイテム
    small_vial: { ch: 1, shop: [['poyo_item_shop', null], ['rivel_item_shop', null]] },
    healing_salve: { ch: 3, shop: [['rivel_item_shop', 'main_3'], ['harbor_item_shop', null], ['kalion_item', null]] },
    field_kit: { ch: 9, shop: [['sahar_item', null], ['tempus_item', null], ['magicka_item', null], ['dark_shop', null]] },
    herb_soup: { ch: 1, shop: [['rivel_item_shop', null]] },
    mountain_stew: { ch: 6, shop: [['kalion_item', null], ['sentra_item', null]] },
    seafood_hotpot: { ch: 8, shop: [['aruna_item', null], ['ciel_item', null]] },
    spice_soup: { ch: 9, shop: [['sahar_item', null]] },
    hot_milk: { ch: 13, shop: [['ciel_item', null], ['frost_item', null]] },
    spirit_drop: { ch: 13, shop: [['magicka_item', null], ['frost_item', null], ['dark_shop', null]] },
    mana_tea: { ch: 6, shop: [['kalion_item', 'main_6'], ['sentra_item', null], ['tempus_item', null]] },
    sleep_cure: { ch: 1, shop: [['rivel_item_shop', null]] },
    calm_incense: { ch: 4, shop: [['harbor_item_shop', null]] },
    panacea: { ch: 6, shop: [['kalion_item', null], ['sentra_item', null], ['tempus_item', null], ['magicka_item', null]] },
    muscle_relaxant: { ch: 1, shop: [['rivel_item_shop', null]] },
    revive_lantern: { ch: 6, shop: [['kalion_item', null], ['sentra_item', null], ['aruna_item', null]] },
    phoenix_ash: { ch: 13, chest: [['frozen_tower_4', 'g64_ft4'], ['sky_temple_1', 'g64_skt1']], drop: [['void_beast', 0.02]] },
    retreat_smoke: { ch: 1, shop: [['rivel_item_shop', null], ['harbor_item_shop', null]] },
    camp_kit: { ch: 3, shop: [['rivel_item_shop', 'main_3'], ['harbor_item_shop', null], ['kalion_item', null]] },
    danger_bell: { ch: 4, shop: [['harbor_item_shop', null], ['kalion_item', null], ['tempus_item', null]] },
    seabreeze_charm: { ch: 4, shop: [['harbor_item_shop', null], ['aruna_item', null]] }
  };

  /* ---------- 店への追加（SHOP_ADD[店のマップID] = [{ id, after }]） ---------- */
  var SA = root.SHOP_ADD = root.SHOP_ADD || {};
  Object.keys(S).forEach(function (id) { (S[id].shop || []).forEach(function (s) { (SA[s[0]] = SA[s[0]] || []).push({ id: id, after: s[1] || null }); }); });
  // 宝箱の座標（work/gear64place.js で「入口から行ける行き止まり」を選んで固定。行き止まりなので通路をふさがない）
  var CHEST_POS = {
    g64_dc4: [1, 1], g64_st2: [1, 1], g64_im3: [19, 7], g64_dc2: [1, 1], g64_dc3: [1, 1], g64_ocd2: [1, 1], g64_gp: [4, 6], g64_eu: [16, 13], g64_dc1: [1, 1], g64_vw2: [18, 1], g64_dc5: [1, 1], g64_tb1: [14, 7], g64_dvd2: [1, 1], g64_ml: [19, 7], g64_ka2: [18, 9], g64_stt2: [9, 1], g64_ft4: [14, 6], g64_skt1: [1, 1]
  };
  root.GEAR64_CHEST_POS = CHEST_POS;
  var MAPS = root.MAP_DEFS || {};
  Object.keys(S).forEach(function (id) {
    (S[id].chest || []).forEach(function (c) {
      var m = MAPS[c[0]]; var pos = CHEST_POS[c[1]]; if (!m || !pos || (!pos[0] && !pos[1])) return;
      m.chests = m.chests || []; if (m.chests.some(function (x) { return x.id === c[1]; })) return;
      m.chests.push({ id: c[1], x: pos[0], y: pos[1], item: id, qty: 1, v64: true });
    });
    (S[id].drop || []).forEach(function (d) { var e = root.ENEMIES && root.ENEMIES[d[0]]; if (e) { e.drops = e.drops || []; if (!e.drops.some(function (x) { return x.item === id; })) e.drops.push({ item: id, rate: d[1] }); } });
  });

  /* ---------- 効果の重ね掛けの上限 ---------- */
  root.FX_CAP = { critUp: 0.25, evade: 0.25, guts: 0.45, statusResist: 0.6, goldUp: 0.3, sight: 3, resistFloor: 0.4, seaEncFloor: 0.4 };

  /* ---------- アイテムの分類（どうぐ画面のジャンル表示用。cat は変えない） ---------- */
  var GENRES = [
    { id: 'all', name: 'すべて' }, { id: 'hp', name: 'HP回復' }, { id: 'mp', name: 'MP回復' }, { id: 'cure', name: '状態異常・蘇生' }, { id: 'battle', name: '戦闘用' }, { id: 'field', name: '探索用' },
    { id: 'weapon', name: '武器' }, { id: 'armor', name: '防具' }, { id: 'acc', name: 'アクセサリー' }, { id: 'material', name: '素材' }, { id: 'key', name: '重要アイテム' }
  ];
  function genreOf(it) {
    if (!it) return 'key';
    if (it.subcategory) return it.subcategory;
    if (it.cat === 'weapon') return 'weapon';
    if (it.cat === 'armor') return it.type === 'acc' ? 'acc' : 'armor';
    if (it.cat === 'key') return 'key';
    var e = it.effect || {};
    if (e.revive || e.cure) return 'cure';
    if (e.all || it.fieldOnly) return 'field';
    if (e.hp) return 'hp';
    if (e.mp) return 'mp';
    if (e.damage || e.escape || it.battleOnly) return 'battle';
    if (e.warpTown || e.partyHeal || e.repel || e.seaRepel || it.fieldOnly) return 'field';
    return 'battle';
  }
  function sceneOf(it) { if (!it || it.cat !== 'consumable') return ''; return it.battleOnly ? '戦闘中だけ' : it.fieldOnly ? 'フィールド・ダンジョン（町の外）' : 'いつでも'; }
  root.ItemCat = { GENRES: GENRES, of: function (id) { return genreOf(ITEMS[id]); }, scene: function (id) { return sceneOf(ITEMS[id]); }, NEW64: NEW };
})(typeof window !== 'undefined' ? window : globalThis);
