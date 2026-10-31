/* =========================================================
   Data / Items : 武器・防具・道具・大事なもの
   cat: weapon / armor / consumable / key
   weapon.type: sword dagger spear axe bow staff club claw
   armor.type: heavy light robe shield helm hat acc
   price: 購入価格（売却は半額）。price 0 は非売品
   ========================================================= */
(function (root) {
  'use strict';

  var ITEMS = {};
  function W(id, name, type, atk, price, extra) { ITEMS[id] = Object.assign({ id: id, name: name, cat: 'weapon', type: type, atk: atk, price: price }, extra || {}); }
  function A(id, name, type, def, price, extra) { ITEMS[id] = Object.assign({ id: id, name: name, cat: 'armor', type: type, def: def, price: price }, extra || {}); }
  function C(id, name, price, effect, desc, extra) { ITEMS[id] = Object.assign({ id: id, name: name, cat: 'consumable', price: price, effect: effect, desc: desc }, extra || {}); }
  function K(id, name, desc) { ITEMS[id] = { id: id, name: name, cat: 'key', price: 0, desc: desc }; }

  // ---- 武器 ----
  W('wooden_sword', '木の剣', 'sword', 4, 60, { desc: '練習用の木剣' });
  W('copper_sword', '銅の剣', 'sword', 8, 180, { desc: '駆け出し冒険者の定番' });
  W('iron_sword', '鉄の剣', 'sword', 14, 520, { desc: '鍛冶屋が丁寧に打った剣' });
  W('steel_sword', '鋼の剣', 'sword', 22, 1400, { desc: '鋼を重ねた頑丈な剣' });
  W('knight_sword', '騎士の剣', 'sword', 30, 3200, { desc: '王国騎士団の支給品' });
  W('wave_sword', '波形の剣', 'sword', 38, 0, { desc: '刀身に波形が刻まれた伝説の剣。ダウの森の奥に眠る', element: 'wind' });
  W('dagger', '短剣', 'dagger', 5, 70, { desc: '小回りの利く刃', agi: 2 });
  W('bronze_dagger', '青銅のナイフ', 'dagger', 9, 220, { desc: '素早い者向け', agi: 3 });
  W('assassin_dagger', '暗殺者の短剣', 'dagger', 18, 1100, { desc: '毒を仕込める短剣', agi: 5 });
  W('spear', '槍', 'spear', 10, 260, { desc: '間合いが広い' });
  W('iron_spear', '鉄の槍', 'spear', 17, 760, { desc: '重く鋭い' });
  W('halberd', 'ハルバード', 'spear', 27, 2600, { desc: '斧と槍を兼ねた長柄武器' });
  W('hand_axe', '手斧', 'axe', 9, 200, { desc: '薪割りにも使える' });
  W('battle_axe', '戦斧', 'axe', 19, 900, { desc: '両手で振るう重い斧' });
  W('short_bow', '短弓', 'bow', 7, 150, { desc: '狩人の初めての弓' });
  W('hunter_bow', '狩人の弓', 'bow', 13, 480, { desc: '森の狩人が使う弓' });
  W('long_bow', '長弓', 'bow', 21, 1300, { desc: '遠くまで届く' });
  W('oak_staff', '樫の杖', 'staff', 3, 80, { desc: '魔力をわずかに高める', mag: 2 });
  W('mage_staff', '魔道士の杖', 'staff', 6, 350, { desc: '先端に水晶がついた杖', mag: 5 });
  W('sage_staff', '賢者の杖', 'staff', 10, 1500, { desc: '古代の文字が刻まれた杖', mag: 10 });
  W('club', '棍棒', 'club', 6, 90, { desc: '硬い木の棒' });
  W('iron_club', '鉄棍', 'club', 12, 420, { desc: '鉄を巻いた棍' });
  W('holy_mace', '聖なるメイス', 'club', 20, 1600, { desc: '教会で清められた', element: 'light', mag: 4 });
  W('leather_claw', '革の爪', 'claw', 6, 110, { desc: '武闘家の手甲', agi: 2 });
  W('iron_claw', '鉄の爪', 'claw', 13, 500, { desc: '鋭い鉄の爪', agi: 3 });
  W('tiger_claw', '虎の爪', 'claw', 24, 1800, { desc: '猛虎の牙を加工した爪', agi: 5 });

  // ---- 防具 ----
  A('cloth', '布の服', 'light', 2, 50, { desc: '村人の普段着' });
  A('leather_armor', '革の鎧', 'light', 6, 220, { desc: '軽くて動きやすい' });
  A('scale_armor', '鱗の鎧', 'light', 12, 800, { desc: 'トカゲの鱗を縫い込んだ' });
  A('ninja_garb', '忍び装束', 'light', 16, 1500, { desc: '闇にまぎれる', agi: 4 });
  A('chain_mail', '鎖帷子', 'heavy', 10, 600, { desc: '金属の輪を編んだ鎧' });
  A('iron_armor', '鉄の鎧', 'heavy', 18, 1600, { desc: '重いが頼もしい', agi: -2 });
  A('knight_armor', '騎士の鎧', 'heavy', 26, 3800, { desc: '王国騎士団の鎧', agi: -2 });
  A('robe', '旅人のローブ', 'robe', 3, 90, { desc: '魔法使いの定番' });
  A('silk_robe', '絹のローブ', 'robe', 7, 420, { desc: '魔力を通しやすい', mag: 3 });
  A('sage_robe', '賢者のローブ', 'robe', 13, 1700, { desc: '古い魔法が織り込まれた', mag: 6, mdef: 6 });
  A('wooden_shield', '木の盾', 'shield', 3, 90, { desc: '軽い盾' });
  A('iron_shield', '鉄の盾', 'shield', 7, 380, { desc: '矢を弾く' });
  A('knight_shield', '騎士の盾', 'shield', 12, 1200, { desc: '紋章入りの大盾' });
  A('stoploss_shield', '損切りの盾', 'shield', 15, 0, { desc: '致命傷を防ぐ盾。資金管理の試練の報酬', mdef: 5 });
  A('leather_cap', '革の帽子', 'hat', 2, 60, { desc: '軽い帽子' });
  A('feather_hat', '羽根帽子', 'hat', 4, 240, { desc: '素早さが上がる', agi: 2 });
  A('wizard_hat', '魔法使いの帽子', 'hat', 5, 500, { desc: '魔力が上がる', mag: 3 });
  A('iron_helm', '鉄の兜', 'helm', 5, 300, { desc: '頭を守る' });
  A('knight_helm', '騎士の兜', 'helm', 9, 900, { desc: '騎士団の兜' });
  A('ring_power', '力の指輪', 'acc', 0, 800, { desc: '攻撃力+5', atk: 5 });
  A('ring_guard', '守りの指輪', 'acc', 4, 800, { desc: '防御力+4' });
  A('ring_speed', '疾風の指輪', 'acc', 0, 900, { desc: '素早さ+6', agi: 6 });
  A('amulet_life', '命のお守り', 'acc', 2, 700, { desc: '最大HP+20', hp: 20 });
  A('amulet_mind', '知恵のお守り', 'acc', 1, 700, { desc: '最大MP+10', mp: 10 });
  A('antidote_charm', '毒消しの護符', 'acc', 1, 600, { desc: '毒を防ぐ', immune: ['poison'] });
  A('time_amulet', '時間軸の護符', 'acc', 3, 0, { desc: '上位足を忘れない護符。眠りを防ぐ', immune: ['sleep'], mag: 3 });

  // ---- 道具 ----
  C('herb', '薬草', 20, { hp: 30 }, 'HPを30回復');
  C('potion', 'ポーション', 60, { hp: 80 }, 'HPを80回復');
  C('hi_potion', 'ハイポーション', 200, { hp: 200 }, 'HPを200回復');
  C('ether', 'エーテル', 120, { mp: 20 }, 'MPを20回復');
  C('hi_ether', 'ハイエーテル', 400, { mp: 60 }, 'MPを60回復');
  C('antidote', '毒消し草', 25, { cure: ['poison'] }, '毒を治す');
  C('wake_bell', '目覚ましの鈴', 30, { cure: ['sleep'] }, '眠りを覚ます');
  C('calm_water', '清めの水', 40, { cure: ['paralyze', 'confuse'] }, '麻痺と混乱を治す');
  C('phoenix_feather', '不死鳥の羽', 500, { revive: 0.5 }, '戦闘不能の仲間をHP半分で復活');
  C('bomb', '火炎瓶', 80, { damage: 40, element: 'fire', target: 'enemies' }, '敵全体に炎のダメージ', { battleOnly: true });
  C('escape_wing', '帰還の翼', 150, { warpTown: true }, '最後に泊まった町へ戻る', { fieldOnly: true });
  C('tent', 'テント', 300, { hp: 999, mp: 999, all: true }, 'フィールド・ダンジョンで全員を全回復', { fieldOnly: true });   // v6.4 Phase E：120→300G（どこでも宿屋と同じ全快になるのに、第6章以降は4人の宿代より安く、半分回復の携帯宿営セット150Gより安かったため。序盤に手が届かなくなりすぎないよう 300G。docs/balance-v64.md）
  C('elixir', 'エリクサー', 1500, { hp: 999, mp: 999 }, '1人のHPとMPを全回復');
  // ---- v6.1 飲食物：食べ物＝HP回復、飲み物＝MP回復（店・酒場・食堂・宝箱・探索で手に入る） ----
  C('onigiri', 'おにぎり', 12, { hp: 20 }, 'HPを20回復。旅の基本', { food: 'food' });
  C('yakitori', '焼き鳥', 18, { hp: 30 }, 'HPを30回復。香ばしい串焼き', { food: 'food' });
  C('ramen', 'ラーメン', 55, { hp: 80 }, 'HPを80回復。湯気ごと元気になる', { food: 'food' });
  C('curry_rice', 'カレーライス', 70, { hp: 100 }, 'HPを100回復。冒険者の定番', { food: 'food' });
  C('deluxe_steak', '豪華ステーキ', 190, { hp: 200 }, 'HPを200回復。分厚い一枚', { food: 'food' });
  C('legend_bento', '伝説の特製弁当', 800, { hp: 999 }, '1人のHPを全回復。中身は日によって違うらしい', { food: 'food' });
  C('green_tea', 'お茶', 80, { mp: 15 }, 'MPを15回復。心が落ち着く', { food: 'drink' });
  C('coffee', 'コーヒー', 150, { mp: 30 }, 'MPを30回復。目が冴える', { food: 'drink' });
  C('fruit_juice', 'フルーツジュース', 240, { mp: 50 }, 'MPを50回復。南の島の果物', { food: 'drink' });
  C('mana_soda', '魔力のソーダ', 480, { mp: 100 }, 'MPを100回復。はじける魔力', { food: 'drink' });
  C('mystic_water', '神秘の霊水', 1200, { mp: 999 }, '1人のMPを全回復。学院の泉で汲まれる', { food: 'drink' });

  // ---- 大事なもの ----
  K('crystal_shard', '均衡のクリスタルの欠片', '世界を支えていたクリスタルの破片。淡く光る');
  K('forest_key', '森の鍵', '迷いの森の奥にある扉の鍵');
  K('royal_letter', '王の親書', 'リヴェル王から隣国への手紙');
  K('cave_key', '洞窟の鍵', '忘却の洞窟の封印扉を開く鍵');
  K('chart_book', '波形の書', '師匠から授かった分析の教本。トレード修行場で使える');
  // v5.0 第4〜5章の重要アイテム（売却不可）
  K('sailcloth', '帆布', '港の倉庫に眠っていた丈夫な帆布。船の修理に使う');
  K('old_compass', '古い羅針盤', '漁師が譲ってくれた羅針盤。針は今も北を指す');
  K('ledger_page', '帳簿の切れ端', '鉱山の監督官が隠していた賃金台帳の一部。「魔災税」の名目で奪われた額が記されている');
  K('mine_key', '鉱山の鍵', '鉄鎖鉱山の深部へ通じる扉の鍵。看守から奪った');
  K('overseer_seal', '監督官の印章', '監督官ザルグの印。これで町の配給所と門が開く');
  K('supply_order', '物資の注文書', '灰の浜の番人に渡す注文書。マリナからの食料と薬を運んでもらう');
  // v5.1 第6〜7章
  K('ledger_record', '黒い帳簿の記録', '徴収政府の帳簿から抜き取った記録。存在しない復興事業への支出が記されている');
  K('audit_ledger', '古代の監査帳簿', 'エルナが隠し持っていた監査用の帳簿。あらゆる帳簿の矛盾を照らし出す');
  K('palace_pass', '王宮の通行証', '騎士団長ヴァレンが渡した通行証。王宮の門を開く');
  // v5.2 第8〜9章
  K('sea_chart', '父の航路図', 'ナギの父が残した外海の航路図。断裂群島への道が描かれている');
  K('ship_keel', '鉄の竜骨', 'ヴェルムの自治会が鍛えた遠洋航海船の竜骨');
  K('lighthouse_lens', '灯台のレンズ', '廃墟の郵便局に保管されていた灯台の予備レンズ');
  K('lighthouse_gear', '灯台の歯車', '時計塔の機構から外した大歯車');
  K('lighthouse_oil', '灯台の油', '廃墟の倉庫に残っていた灯油の樽');
  K('yorn_letter', 'ヨルンの手紙', '災害の日に届かなかった、ヨルンの息子からの手紙');
  K('balance_mirror', '天秤の鏡', '地下施設の記録装置。災害の真相が記されている');
  K('submarine', '古代の潜航装置', '地下施設で見つかった、海底都市エルミナへ潜る装置');
  K('lost_chart', '失われた航海図', '断裂群島の全域と、その先の海域が描かれた古代の航海図');
  K('seal_key', '封印区画の鍵', '記憶の図書館の司書が守っていた鍵');
  K('undersea_record', '海底都市の記録', '記憶の図書館から持ち帰った、災害とクリスタルの異常に関する記録');
  // v5.3 第10〜12章
  K('time_contract', '時間銀行の契約書', '住民の「明日」を担保にした契約書。地下契約室で書き換えられる');
  K('future_fragment', '未来の断片', '時の神殿の回廊で見た未来の記憶。ひとつも確定していない');
  K('auth_key', 'AI中枢の認証鍵', 'イオが旧都市の記録から復元した、オラクル中枢への認証鍵');
  K('theodor_record', 'テオドルの記録', 'セリスの師テオドルが残した、オラクルの基礎理論の研究記録');
  K('oracle_charter', '統治再設計の憲章', 'オラクルと住民が合意した、権限の制限と監査の取り決め');
  // v5.4 第13〜16章
  K('archive_permit_doc', '禁書庫の入館許可証', '王立学院の学院長が発行した許可証');
  K('ancient_tome', '古文書', '禁書庫の古文書。クリスタルとオラクルの起源が記されている');
  K('theodor_notes', 'テオドルの手記', '起源の実験室に残された、セリスの師の最後の手記');
  K('sky_navigator', '天空の航行装置', '天空神殿の制御装置の間で見つけた航行装置。暗黒大陸への空路を示す');
  K('balance_scale', '均衡の天秤', '魔王城の門を開いたときに現れた小さな天秤。片方の皿は空のまま');
  K('final_proof', '最後の選択の証', 'クリスタルをどうするかを選んだ証');
  K('restitution_order', '財産返還令', '大宰相セヴラン失脚後に発せられた返還令。財務局で執行される');
  W('tide_dagger', '潮目の短剣', 'dagger', 24, 1800, { desc: '航海士の短剣。素早さ+4', agi: 4 });
  W('survey_bow', '測量士の弓', 'bow', 27, 2000, { desc: '距離を測る目盛りの刻まれた弓' });
  A('sea_coat', '航海士のコート', 'light', 20, 1700, { desc: '潮風を通さないコート', agi: 3 });
  W('chrono_staff', '時詠みの杖', 'staff', 26, 2200, { desc: '時詠み師の杖。魔力+5', mag: 5 });
  W('gear_bow', '機巧弓', 'bow', 30, 2600, { desc: 'ゼロメア製の機巧弓。素早さ+3', agi: 3 });
  A('temporal_robe', '時のローブ', 'robe', 22, 2000, { desc: '時の神殿のローブ。魔法防御が高い', mdef: 6 });
  W('rune_blade', 'ルーンブレード', 'sword', 46, 6000, { desc: '雷のルーンを刻んだ魔導剣' });
  W('arcane_staff', '魔導の杖', 'staff', 34, 5000, { desc: '魔導都の杖。魔力+8', mag: 8 });
  W('star_bow', '星見の弓', 'bow', 42, 5500, { desc: '星の位置で狙いをつける弓。素早さ+4', agi: 4 });
  W('void_dagger', '虚無の短剣', 'dagger', 38, 5000, { desc: '闇を切り裂く短剣。素早さ+5', agi: 5 });
  W('astral_spear', '星界の槍', 'spear', 44, 5800, { desc: '天空の金属で作られた槍' });
  W('sky_axe', '天空の斧', 'axe', 48, 6200, { desc: '雲を割る大斧' });
  W('shadow_claw', '影の爪', 'claw', 40, 5200, { desc: '暗黒大陸の獣の爪から作った武器' });
  W('balance_mace', '均衡の槌', 'club', 42, 5400, { desc: '天秤の意匠の槌。魔力+4', mag: 4 });
  A('rune_mail', 'ルーンメイル', 'heavy', 36, 6000, { desc: 'ルーンを刻んだ重鎧' });
  A('star_cloak', '星のマント', 'light', 30, 5200, { desc: '星明かりを織り込んだマント。素早さ+4', agi: 4 });
  A('sky_robe', '天空のローブ', 'robe', 30, 5000, { desc: '天空群島の織物。魔法に強い', mdef: 8 });
  A('aegis_shield', 'イージスの盾', 'shield', 28, 5500, { desc: '天空神殿の盾' });
  A('star_helm', '星の兜', 'helm', 15, 3500, { desc: '星見の番人の兜' });
  A('arcane_hat', '魔導帽', 'hat', 10, 3200, { desc: '魔力が上がる帽子', mag: 6 });
  A('iron_crown', '鉄の冠', 'acc', 8, 0, { desc: 'グロートが最後に託した冠。最大HP+40', hp: 40 });
  // ===== v5.5 トレード装備（ゲーム内の戦闘・探索にだけ作用する。現実のトレードの利益を保証するものではない） =====
  W('dow_greatsword', 'ダウの大剣', 'sword', 42, 0, { desc: '高値と安値の切り上げを刻んだ大剣。特技「波形崩し」：敵の防御を2ターン崩す', grantSkills: ['dow_break'], trade: true });
  W('ema_trident', 'EMA三重槍', 'spear', 36, 0, { desc: '20・30・40の三本の穂先。通常攻撃が3回ヒット（各0.5倍）', fx: { multiHit: { n: 3, mult: 0.5 } }, trade: true });
  W('rci_bow', 'RCI転輪弓', 'bow', 34, 0, { desc: '命中した敵の素早さを2ターン25%下げる', fx: { onHit: { agi: -0.25, turns: 2 } }, trade: true });
  W('macd_twin', 'MACD双剣', 'dagger', 30, 4200, { desc: '前のターンにも攻撃していれば追撃（0.6倍）', fx: { followUp: 0.6 }, trade: true });
  W('hidden_staff', 'ヒドゥンの魔杖', 'staff', 18, 0, { desc: '魔力+12。補助魔法を使った次のターン、攻撃魔法が1.5倍', mag: 12, fx: { supportBoost: 1.5 }, trade: true });
  W('stoploss_dagger', '損切りの短剣', 'dagger', 26, 1500, { desc: '防御した次のターン、通常攻撃の威力+30%', fx: { afterDefend: 0.3 }, trade: true });
  A('armor_risk', '資金管理の鎧', 'heavy', 24, 0, { desc: '最大HPの25%を超える一撃を30%軽減する', fx: { bigHitCut: { over: 0.25, cut: 0.3 } }, trade: true });
  A('robe_skip', '見送りの法衣', 'robe', 12, 1400, { desc: '防御したとき、最大MPの10%を回復', fx: { defendMp: 0.1 }, trade: true });
  A('cloak_volatility', '変動相場のマント', 'light', 16, 0, { desc: '敵の単体攻撃を15%の確率でかわす', fx: { evade: 0.15 }, trade: true });
  A('helm_timeframe', '時間軸の兜', 'helm', 10, 3000, { desc: '混乱・睡眠・沈黙にかからない', immune: ['confuse', 'sleep', 'silence'], trade: true });
  A('armor_patience', '忍耐の鎧', 'heavy', 22, 0, { desc: 'HPが50%以下のとき防御力+40%', fx: { lowHpDef: { below: 0.5, mult: 0.4 } }, trade: true });
  A('compass_wave', '波形の羅針盤', 'acc', 2, 0, { desc: 'ダンジョンで階段・扉・鍵扉の位置がミニマップに最初から見える', fx: { compass: true }, trade: true });
  A('ring_rci', 'RCIの指輪', 'acc', 2, 0, { desc: '素早さ+8', agi: 8, trade: true });
  A('amulet_macd', 'MACDの護符', 'acc', 2, 3800, { desc: '魔力+8', mag: 8, trade: true });
  A('scale_rr', 'リスクリワードの天秤', 'acc', 1, 0, { desc: 'HPを失わずに勝つと報酬G+20%、戦闘不能者が出ると−10%', fx: { rrScale: { win: 0.2, loss: 0.1 } }, trade: true });
  A('charm_stoploss', '損切りのお守り', 'acc', 2, 0, { desc: '倒れるダメージを30%の確率でHP1で踏みとどまる（戦闘中1回）', fx: { guts: 0.3 }, trade: true });
  A('glasses_htf', '上位足の眼鏡', 'acc', 1, 0, { desc: 'ダンジョンのミニマップで見える範囲+2', fx: { sight: 2 }, trade: true });
  A('necklace_skip', '見送りの首飾り', 'acc', 2, 0, { desc: '防御中の被ダメージをさらに40%軽減', fx: { defendCut: 0.4 }, trade: true });
  A('bracelet_reverse', '反転の腕輪', 'acc', 2, 3500, { desc: '状態異常が治ったとき、攻撃力+20%（2ターン）', fx: { cureAtk: { atk: 0.2, turns: 2 } }, trade: true });
  // 鍛冶街イグナスで鍛え直したトレード武器（+1）
  W('dow_greatsword_2', 'ダウの大剣＋', 'sword', 54, 0, { desc: '鍛え直したダウの大剣。特技「波形崩し」', grantSkills: ['dow_break'], trade: true });
  W('ema_trident_2', 'EMA三重槍＋', 'spear', 46, 0, { desc: '通常攻撃が3回ヒット（各0.6倍）', fx: { multiHit: { n: 3, mult: 0.6 } }, trade: true });
  W('rci_bow_2', 'RCI転輪弓＋', 'bow', 44, 0, { desc: '命中した敵の素早さを2ターン35%下げる', fx: { onHit: { agi: -0.35, turns: 2 } }, trade: true });
  W('macd_twin_2', 'MACD双剣＋', 'dagger', 40, 0, { desc: '前のターンにも攻撃していれば追撃（0.8倍）', fx: { followUp: 0.8 }, trade: true });
  W('hidden_staff_2', 'ヒドゥンの魔杖＋', 'staff', 24, 0, { desc: '魔力+18。補助魔法を使った次のターン、攻撃魔法が1.7倍', mag: 18, fx: { supportBoost: 1.7 }, trade: true });
  W('stoploss_dagger_2', '損切りの短剣＋', 'dagger', 36, 0, { desc: '防御した次のターン、通常攻撃の威力+45%', fx: { afterDefend: 0.45 }, trade: true });
  K('shift_log', '作業日誌', '鉄鎖鉱山第三坑道の、落盤の日の作業日誌');
  K('ore_chunk', '赤い鉱石', 'ヴェルムの鉱山で採れる、淡く光る鉱石。工匠が武器に使う');
  K('dragon_scale', '竜の鱗', '竜脈洞窟で見つかる鱗。鍛冶街イグナスで武器を鍛え直すのに使う');
  // ---- v5.5 リシア砂漠（第9章〜）・竜炎火山群島（第13章〜）の装備 ----
  W('scimitar', '砂漠の曲刀', 'sword', 34, 3400, { desc: '砂都サハルの鍛冶が打つ曲刀' });
  W('sun_spear', '陽炎の槍', 'spear', 32, 3200, { desc: '陽炎のように揺らめく穂先' });
  W('caravan_bow', '隊商の弓', 'bow', 29, 2800, { desc: '隊商の護衛が使う短く強い弓' });
  A('dune_cloak', '砂避けのマント', 'light', 22, 2400, { desc: '砂嵐を防ぐ厚手のマント。素早さ+2', agi: 2 });
  A('sand_turban', '砂漠のターバン', 'hat', 7, 1400, { desc: '日差しと砂を防ぐ布' });
  A('mirage_veil', '蜃気楼のヴェール', 'robe', 24, 0, { desc: '蜃気楼神殿の祭司の衣。魔力+6', mag: 6 });
  W('dragon_axe', '竜骨の斧', 'axe', 50, 6600, { desc: '竜の骨を芯にした大斧' });
  W('flame_claw', '炎の爪', 'claw', 42, 5600, { desc: '火山の鉄で打った爪' });
  A('dragon_mail', '竜鱗の鎧', 'heavy', 38, 6800, { desc: '竜の鱗を重ねた鎧' });
  A('ember_robe', '熾火のローブ', 'robe', 30, 5200, { desc: '熱に強い糸で織ったローブ。魔力+4', mag: 4 });
  A('dragon_helm', '竜の兜', 'helm', 14, 3400, { desc: '竜の角をかたどった兜' });
  W('ryumyaku_blade', '竜脈の剣', 'sword', 60, 0, { desc: '竜脈の最深部で眠っていた剣。「流れに逆らわぬ者の剣」' });
  K('festival_ember', '祭りの火種', 'イグナスの火入れの祭りで、火口の祭壇の聖火を点し直す火種');
  // ---- v5.6 忘却の雪原 ----
  W('ice_staff', '氷晶の杖', 'staff', 30, 3000, { desc: '精霊守の杖を真似て作った杖。魔力+6', mag: 6 });
  A('fur_coat', '毛皮のコート', 'light', 24, 2800, { desc: '雪原の寒さを防ぐ厚いコート' });
  W('clock_hand_spear', '時計の針の槍', 'spear', 56, 0, { desc: '凍結時計塔の大時計の針。止まった時を、もう一度進める槍' });
  A('wave_charm', '波形の護符', 'acc', 4, 0, { desc: '師匠ハケイが「達人」に渡す護符。素早さ+5・魔力+5', agi: 5, mag: 5 });
  A('mentor_crown', '導師の冠', 'helm', 16, 0, { desc: '「波形の導師」の証。魔力+6、混乱・睡眠・沈黙を無効', mag: 6, immune: ['confuse', 'sleep', 'silence'] });
  W('ash_hammer', '灰鉄の大槌', 'club', 34, 0, { desc: '灰の王の中から出てきた大槌' });
  W('captain_saber', '船長のサーベル', 'sword', 36, 0, { desc: '沈没船の船長が最後まで手放さなかった剣' });
  W('zero_bow', '零誤差の弓', 'bow', 58, 0, { desc: '旧都市の演算核の部品で作られた弓。「誤差をなくすな。扱え」' });
  K('father_log', 'ハヤテの航海日誌', 'ナギの父ハヤテが沈没船に残した航海日誌');
  // ---- v5.6 サブクエスト・仲間の個別クエスト ----
  A('healer_robe', '癒し手の法衣', 'robe', 18, 0, { desc: 'スラムの診療所の医者が仕立て直した法衣。魔力+4', mag: 4 });
  A('auditor_seal', '監査官の印', 'acc', 3, 0, { desc: 'エルナが最初の監査で使っていた印。魔力+5', mag: 5 });
  A('oath_mail', '誓約の鎧', 'heavy', 30, 0, { desc: '野営地の人々の名を裏地に刻んだ鎧' });
  A('surveyor_ring', '測量士の指輪', 'acc', 2, 0, { desc: 'イーリスが測量標の数字を刻んだ指輪。素早さ+4・魔力+4', agi: 4, mag: 4 });
  A('navigator_compass', 'ハヤテの羅針盤', 'acc', 3, 0, { desc: 'ナギの父の羅針盤。素早さ+6', agi: 6 });
  A('io_core', '最初の歯車', 'acc', 3, 0, { desc: 'イオの製造時の最初の歯車。魔力+4・素早さ+4', mag: 4, agi: 4 });
  K('wave_book_copy', '波形の書の写し', '師匠ハケイが写した「波形の書」。ヴェルムの学び舎へ');
  K('cape_box', '灯台守の小箱', '灰の岬の岩場にあった、灯台守ロウの小箱');
  K('family_record', '没収の記録', 'カリオンの財務局にあった、南区の家族の財産の記録');
  K('old_letter', '届かなかった手紙', '災害の日の朝に書かれた手紙');
  K('broken_clock', '止まった懐中時計', '廃墟の時計塔に落ちていた懐中時計');
  K('old_supplies', '届けられなかった物資', '災害の日に届くはずだった物資の箱');
  K('lost_volume', '散逸した記録', '記憶の図書館から散らばった記録の巻');
  K('bell_gear', '鐘楼の歯車', '鐘都テンプスの鐘楼から持ち去られた歯車');
  K('water_record', '水位の記録', 'サハルの水番所に残る、四十年分の井戸の水位の記録');
  A('shield_risk', 'リスク分散の盾', 'shield', 20, 0, { desc: '単体攻撃の被ダメージを20%軽減する盾。「ひとつの攻撃に全てを賭けない」', dmgReduce: 0.2 });

  var ITEM_LIST = Object.keys(ITEMS);
  root.ITEMS = ITEMS; root.ITEM_LIST = ITEM_LIST;
  if (typeof module !== 'undefined' && module.exports) module.exports = ITEMS;
})(typeof window !== 'undefined' ? window : globalThis);
