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
  C('tent', 'テント', 120, { hp: 999, mp: 999, all: true }, 'フィールド・ダンジョンで全員を全回復', { fieldOnly: true });
  C('elixir', 'エリクサー', 1500, { hp: 999, mp: 999 }, '1人のHPとMPを全回復');

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
  K('restitution_order', '財産返還令', '大宰相セヴラン失脚後に発せられた返還令。財務局で執行される');
  W('tide_dagger', '潮目の短剣', 'dagger', 24, 1800, { desc: '航海士の短剣。素早さ+4', agi: 4 });
  W('survey_bow', '測量士の弓', 'bow', 27, 2000, { desc: '距離を測る目盛りの刻まれた弓' });
  A('sea_coat', '航海士のコート', 'light', 20, 1700, { desc: '潮風を通さないコート', agi: 3 });
  A('shield_risk', 'リスク分散の盾', 'shield', 20, 0, { desc: '単体攻撃の被ダメージを20%軽減する盾。「ひとつの攻撃に全てを賭けない」', dmgReduce: 0.2 });

  var ITEM_LIST = Object.keys(ITEMS);
  root.ITEMS = ITEMS; root.ITEM_LIST = ITEM_LIST;
  if (typeof module !== 'undefined' && module.exports) module.exports = ITEMS;
})(typeof window !== 'undefined' ? window : globalThis);
