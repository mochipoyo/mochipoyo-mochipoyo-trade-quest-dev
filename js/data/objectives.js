/* =========================================================
   Data / Objectives (v6.2) : メインストーリーの「次の目的地」レジストリ（2D/3D 共通）
   ・1件 = 1つの目的（questId と、その達成条件 done）。上から順に、まだ達成していない最初の目的が「いまの目的」
     done：ステップのフラグ（QUESTS[q].steps の flag と同じ）。steps のない第1〜3章は、王の会話で立つフラグを使う
     '_start'：前の章を終えてから、次の章が始まるまで（クエストがまだ受注されていないとき）の案内
   ・t（目的地）は既存の定義への参照だけで書く。座標は実行時に MAP_DEFS から引く（推測した座標は書かない）
       npc:地図:NPCのid / ev:地図:x,y（その座標のイベント） / chest:地図:宝箱id / loc:地域:場所id / map:地図（その地図に入る）
   ・pre：先にすること（need を満たしていなければ、t へ案内する）。any：どれから行ってもよい候補（未達成のものを全部表示）
   ・group：同じ group の目的は順番自由（最初の未達成を主目標、残りを「その他の候補」として表示）
   ・h：ヒント3段階（1＝大まかな地域 / 2＝町・建物・人の名前 / 3＝詳しい場所と、すること）
   ・テスト（work/navtest.js）で、全ての参照が実在する NPC・イベント・宝箱・場所を指すことを確認する
   ========================================================= */
(function (root) {
  'use strict';
  var O = [];
  function E(q, done, t, h, opt) { var o = { q: q, done: done, t: t, h: h || [] }; if (opt) for (var k in opt) o[k] = opt[k]; O.push(o); return o; }

  /* ---------- 第1章：王に会う ---------- */
  E('main_1', '_start', 'npc:poyo_elder_house:elder_mochizo', ['ポヨ村の中。', '村の北西にある「村長の家」の村長モチゾウ。', '村長の家に入って、村長モチゾウに話しかけよう。']);
  E('main_1', 'king_quest1', 'npc:rivel_castle:king', ['ポヨ村の北（やや東）にある城下町。', 'リヴェル城下町の奥の「リヴェル城」にいるリヴェル王。', 'ポヨ村を出て北へ。リヴェル城下町に入り、北の城の玉座でリヴェル王に話しかけよう。']);
  /* ---------- 第2章：迷いの森の魔物 ---------- */
  E('main_2', 'forest_boss', 'ev:lost_forest_shrine:7,5', ['城下町の東、ダウの大森林の中。', '「迷いの森」の奥にある「森の祠」。', '迷いの森の試練の扉を越えて祠へ。祠の中央にいる魔物「トレンド迷子」を倒そう。']);
  E('main_2', 'king_quest2', 'npc:rivel_castle:king', ['リヴェル城下町。', 'リヴェル城のリヴェル王に報告する。', 'リヴェル城の玉座の間で、王に森の魔物を倒したことを伝えよう。']);
  /* ---------- 第3章：忘却の洞窟の欠片 ---------- */
  E('main_3', 'cave_boss', 'ev:oblivion_cave_3:12,11', ['ポヨ村の南東にある洞窟。', '「忘却の洞窟」の最深部。', '1階の封印扉は王にもらった洞窟の鍵で開く。最深部の手前の試練の扉を越え、「欲望のゴーレム」を倒そう。']);
  E('main_3', 'shard_returned', 'npc:rivel_castle:king', ['リヴェル城下町。', 'リヴェル城のリヴェル王にクリスタルの欠片を届ける。', 'リヴェル城の玉座の間で、王に欠片を渡そう。']);
  /* ---------- 第4章：海を渡る準備 ---------- */
  E('main_4', 'compass_given', 'npc:harbor_town:harbor_fisher', ['大陸の西の海辺の町。', '港町マリナの漁師。', '港町マリナで、王の親書を持って漁師に話しかけ、羅針盤を受け取ろう。']);
  E('main_4', 'harbor_boss', 'npc:harbor_town:sailor', ['港町マリナ。', '港町マリナの船乗り（帆布と羅針盤を届ける）。', '帆布・羅針盤・王の親書をそろえて船乗りに話しかけよう。港を守る魔物との戦いになる。'],
    { pre: [{ need: 'item:sailcloth|flag:harbor_boss', t: 'chest:harbor_warehouse:wh2', text: '港の倉庫で帆布を探す' }] });
  E('main_4', 'ship_ready', 'npc:harbor_town:sailor', ['港町マリナ。', '港町マリナの船乗り。', '船乗りに話して船を出してもらおう。']);
  /* ---------- 第5章：鉄鎖の町を解放せよ ---------- */
  E('main_5', 'verum_arrived', 'npc:ash_shore_hut:shore_keeper', ['海の向こう、グラニア鉱業地方の西岸。マリナの西の海に泊めた船で、大陸の東の端の海路へ。', '西岸の「灰の浜の桟橋」のすぐ東にある「灰の浜の番小屋」の番人ロウ。', '海路を抜けたら、西岸の灰の浜の桟橋に船を停めて上陸。東へすぐの番小屋で番人ロウに話を聞こう。'], { area: 'グラニア鉱業地方・西岸' });
  E('main_5', 'hideout_met', 'npc:verum_hideout:hideout_leader', ['灰鉱町ヴェルム。番小屋から東へ続く道の先。', 'ヴェルムの「労働者の宿舎」の奥にある地下の集会所の、ハルト。', 'まず町で労働者の妻ミラの話を聞き、宿舎の奥から地下の集会所へ下りてハルトに会おう。'],
    { pre: [{ need: 'flag:hideout_known', t: 'npc:verum_town:vt_worker2', text: '労働者の妻ミラの話を聞く' }] });
  E('main_5', 'rescued_3', 'npc:iron_mine_1:im_chained3', ['灰鉱町ヴェルムの北東にある鉱山。', '「鉄鎖鉱山」1階の、鎖につながれた労働者3人。', '鉄鎖鉱山1階を探索し、鎖につながれた3人に話しかけて助けよう。'],
    { any: [{ t: 'npc:iron_mine_1:im_chained1', done: 'rescued_1' }, { t: 'npc:iron_mine_1:im_chained2', done: 'rescued_2' }, { t: 'npc:iron_mine_1:im_chained3', done: 'rescued_3' }] });
  E('main_5', 'mine_captain', 'ev:iron_mine_2:17,7', ['鉄鎖鉱山。', '鉄鎖鉱山2階の看守長。', '2階の奥にいる看守長を倒して、鉱山の鍵を奪おう。']);
  E('main_5', 'verum_overseer_defeated', 'ev:iron_mine_3:12,8', ['鉄鎖鉱山の一番奥。', '鉄鎖鉱山の最深部にいる監督官ザルグ。', '2階の鍵の扉を鉱山の鍵で開け、最深部で監督官ザルグを倒そう。']);
  E('main_5', 'verum_evidence', 'npc:verum_hideout:hideout_leader', ['灰鉱町ヴェルムと鉄鎖鉱山。', '帳簿の切れ端（監督官の館・鉱石工場・鉱山2階）を集めて、ハルトへ。', '3か所の宝箱から帳簿の切れ端を3枚集め、地下の集会所のハルトに渡そう。'],
    { pre: [{ need: 'item:ledger_page>=3|flag:verum_evidence', any: ['chest:verum_overseer_house:oh1', 'chest:verum_factory:fc1', 'chest:iron_mine_2:im2_1'], text: '帳簿の切れ端を探す' }] });
  E('main_5', 'verum_supply_done', 'npc:ash_shore_hut:shore_keeper', ['グラニア鉱業地方の西岸。', '灰の浜の番小屋の番人ロウ（物資の注文書を届ける）。', 'ハルトからもらった物資の注文書を、番小屋の番人ロウに渡そう。'],
    { pre: [{ need: 'item:supply_order|flag:verum_supply_done', t: 'npc:verum_hideout:hideout_leader', text: 'ハルトから物資の注文書を受け取る' }] });
  E('main_5', 'verum_council', 'npc:verum_hideout:hideout_leader', ['灰鉱町ヴェルム。', '地下の集会所のハルト。', 'ハルトと話して、町の自治組織の形を決めよう。']);
  E('main_5', 'verum_liberated', 'npc:verum_hideout:hideout_leader', ['灰鉱町ヴェルム。', '地下の集会所のハルト。', 'もう一度ハルトに話しかけて、町の解放を見届けよう。']);
  /* ---------- 第6章：黒い帳簿 ---------- */
  E('main_6', '_start', 'ev:grania_pass:3,9', ['グラニア鉱業地方の北。', '「灰の峠」の中にある連邦の関所。', 'ヴェルムの北の灰の峠（南口）に入り、関所を通ってカリオン徴収連邦へ向かおう。']);
  E('main_6', 'kalion_arrived', 'npc:kalion_city:kc_gate_soldier', ['灰の峠を越えた先、カリオン徴収連邦。', '「徴収都市カリオン」の入口の連邦兵。', '峠を北へ抜けて徴収都市カリオンへ。町の入口で連邦兵に話しかけよう。']);
  E('main_6', 'elna_rescued', 'npc:kalion_city:kc_chaser', ['徴収都市カリオン。', 'カリオンの南区の路地で、追われている女。', '町の南西の路地で、女を追っている連邦兵に話しかけよう。']);
  E('main_6', 'ledger_1', 'npc:kalion_finance:kf_clerk', ['徴収都市カリオン。', '「財務局」の書記。', '財務局に入り、書記からエルナの机の照合記録を回収しよう。'], { group: 'ledger' });
  E('main_6', 'ledger_2', 'npc:kalion_city:kc_klaus', ['徴収都市カリオン。', '商業区の大商人クラウス。', '町の北東の商業区で大商人クラウスと話し、裏帳簿を手に入れよう。'], { group: 'ledger' });
  E('main_6', 'ledger_3', 'ev:kalion_archive_2:11,7', ['徴収都市カリオンの地下。', '財務局の奥から下りる「地下記録庫」の2階。', '財務局の奥の階段から地下記録庫へ。2階の黒い帳簿の守護者を倒そう。'], { group: 'ledger' });
  E('main_6', 'hald_confronted', 'npc:kalion_finance:kf_hald', ['徴収都市カリオン。', '財務局の財務局長ハルド。', '三つの記録をそろえて、財務局長ハルドに突きつけよう。']);
  E('main_6', 'kalion_choice_done', 'npc:kalion_finance:kf_hald', ['徴収都市カリオン。', '財務局の財務局長ハルド。', '集めた証拠をどう扱うか（公開／監察官／被害者）を決めよう。']);
  /* ---------- 第7章：奪われた財産 ---------- */
  E('main_7', 'sentra_arrived', 'npc:sentra_capital:sc_guard', ['カリオン徴収連邦の北。', '「王都セントラ」の親衛隊。', 'カリオンから北へ進んで王都セントラに入り、親衛隊に話しかけよう。']);
  E('main_7', 'riev_met', 'npc:sentra_office:so_riev', ['王都セントラ。', '「監察官の事務所」の監察官リーヴ。', '王都の東にある監察官の事務所でリーヴに会おう。']);
  E('main_7', 'testimony_1', 'npc:sentra_capital:sc_camp_old', ['王都セントラ。', '城壁の外のテント村の老人。', '王都の南側（城壁の外）のテント村で、老人の証言を聞こう。'], { group: 'testimony' });
  E('main_7', 'testimony_2', 'npc:sentra_capital:sc_camp_merchant', ['王都セントラ。', 'テント村の没収された商人。', 'テント村の東側にいる商人の証言を聞こう。'], { group: 'testimony' });
  E('main_7', 'testimony_3', 'npc:sentra_tavern:st_exsoldier', ['王都セントラ。', '「王都の酒場」の元兵士。', '王都の酒場に入り、元兵士の証言を聞こう。'], { group: 'testimony' });
  E('main_7', 'kyle_oath_done', 'npc:sentra_knights:sk_valen', ['王都セントラ。', '「騎士団詰所」のヴァレン団長。', '王都の西の騎士団詰所でヴァレン団長と一騎打ちし、王宮の通行証を得よう。']);
  E('main_7', 'palace_open', 'ev:sentra_capital:23,7', ['王都セントラ。', '王宮の門。', '王宮の門を調べて、通行証で開けよう。']);
  E('main_7', 'royal_captain_defeated', 'ev:sentra_palace_1:11,9', ['王都セントラの王宮。', '王宮の中の親衛隊長ドレク。', '王宮に入り、親衛隊長ドレクを倒そう。']);
  E('main_7', 'ledger_core_stopped', 'ev:sentra_palace_2:7,5', ['王宮の奥。', '「帳簿中枢・玉座の間」の守護機構。', '王宮の奥の帳簿中枢で、守護機構を止めよう。']);
  E('main_7', 'sevran_fallen', 'npc:sentra_palace_2:sp_sevran', ['王宮の奥。', '玉座の間の大宰相セヴラン。', '守護機構を止めたあと、大宰相セヴランと対峙して処遇を決めよう。']);
  E('main_7', 'kalion_reformed', 'npc:kalion_finance:kf_riev', ['徴収都市カリオン。', '財務局にいる監察官リーヴ。', 'カリオンの財務局へ戻り、リーヴと財産返還令を執行しよう。']);
  /* ---------- 第8章：灰灯島の灯火 ---------- */
  E('main_8', '_start', 'npc:harbor_town:harbor_nagi', ['アルカディア相場大陸の港。', '港町マリナの船着き場にいるナギ。', '港町マリナへ戻り、船着き場でナギに話しかけよう。']);
  E('main_8', 'nagi_joined', 'npc:harbor_town:harbor_nagi', ['港町マリナ。', '船着き場のナギ。', 'ナギに話しかけよう。']);
  E('main_8', 'galleon_ready', 'npc:harbor_town:harbor_shipwright', ['港町マリナと、灰鉱町ヴェルム。', 'ヴェルムのハルトから鉄の竜骨をもらい、マリナの船大工へ。', '地下の集会所のハルトから鉄の竜骨を受け取り、港町マリナの船大工に渡そう。'],
    { pre: [{ need: 'item:ship_keel|flag:keel_given', t: 'npc:verum_hideout:hideout_leader', text: 'ハルトから鉄の竜骨を受け取る' }] });
  E('main_8', 'aruna_arrived', 'npc:aruna_village:av_yorn', ['アルカディア相場大陸の南の外海の先、断裂群島。', '「灰灯島アルナ・生存者の村」のヨルン老人。', '遠洋航海船で大陸の南の端の遠洋航路を抜け、灰灯島アルナの村でヨルン老人に会おう。']);
  E('main_8', 'lighthouse_part_1', 'ev:ruins_post:2,3', ['灰灯島アルナ。', '「廃墟の街」の郵便局跡。', '廃墟の街の郵便局跡で、灯台のレンズを探そう。'], { group: 'lighthouse' });
  E('main_8', 'lighthouse_part_2', 'ev:aruna_ruins_2:7,3', ['灰灯島アルナ。', '廃墟の街の「時計塔」2階。', '時計塔の2階で、止まった時計の機構から歯車を外そう（廃墟の記憶との戦いになる）。'], { group: 'lighthouse' });
  E('main_8', 'lighthouse_part_3', 'ev:ruins_store:7,3', ['灰灯島アルナ。', '廃墟の街の倉庫跡。', '倉庫跡で、灯台の油を探そう。'], { group: 'lighthouse' });
  E('main_8', 'lighthouse_lit', 'ev:aruna_lighthouse_top:5,4', ['灰灯島アルナ。', '「灰灯島の灯台」の最上階。', '灯台の最上階で、集めた部品を取り付けよう。']);
  E('main_8', 'iris_joined', 'npc:aruna_house_iris:ih_iris', ['灰灯島アルナ。', '生存者の村の「測量士の家」のイーリス。', '村の測量士の家でイーリスに会い、地下施設の場所を聞こう。']);
  E('main_8', 'undercity_record', 'ev:aruna_underground_2:12,4', ['灰灯島アルナ。', '廃墟の街の奥から下りる「地下施設」の最深部。', '廃墟の街の北東の入口から地下施設へ。最深部の観測室で記録を読もう。']);
  E('main_8', 'yorn_letter_done', 'npc:aruna_village:av_yorn', ['灰灯島アルナ。', '生存者の村のヨルン老人。', '郵便局跡で見つけた手紙を、ヨルン老人に届けよう。'],
    { pre: [{ need: 'item:yorn_letter|flag:yorn_letter_done', t: 'ev:ruins_post:8,3', text: '郵便局跡で手紙を探す' }] });
  /* ---------- 第9章：海底の記憶 ---------- */
  E('main_9', 'submarine_owned', 'ev:aruna_underground_2:12,4', ['灰灯島アルナ。', '地下施設の最深部。', '地下施設の最深部で、古代の潜航装置を手に入れよう。']);
  E('main_9', 'elmina_arrived', 'ev:elmina_undersea:10,17', ['灰灯島アルナの南の海の底。', '灰灯島の南岸の台座から潜る「海底都市エルミナ」。', '灰灯島の南岸にある台座を調べて潜航し、海底都市エルミナへ向かおう。']);
  E('main_9', 'library_1', 'ev:memory_library:2,2', ['海底都市エルミナ。', '「記憶の図書館」の第一区画。', '記憶の図書館の左上の区画で、予測の記録を読もう。'], { group: 'library' });
  E('main_9', 'library_2', 'ev:memory_library:18,2', ['海底都市エルミナ。', '記憶の図書館の第二区画。', '記憶の図書館の右上の区画で、避難の記録を読もう。'], { group: 'library' });
  E('main_9', 'library_3', 'ev:memory_library:2,8', ['海底都市エルミナ。', '記憶の図書館の第三区画。', '記憶の図書館の左側の区画で、失敗の記録を読もう。'], { group: 'library' });
  E('main_9', 'seal_opened', 'ev:memory_library:10,2', ['海底都市エルミナ。', '記憶の図書館の封印区画の扉（司書の残像から鍵をもらう）。', '図書館の中央にいる司書の残像から封印区画の鍵を受け取り、北の扉を開けよう。'],
    { pre: [{ need: 'item:seal_key|flag:seal_opened', t: 'npc:memory_library:ml_librarian', text: '司書の残像から封印区画の鍵を受け取る' }] });
  E('main_9', 'library_guardian_defeated', 'ev:memory_library_seal:6,6', ['海底都市エルミナ。', '記憶の図書館・封印区画の守護機構。', '封印区画に入り、守護機構を倒そう。']);
  E('main_9', 'mina_father_record', 'ev:memory_library_seal:6,2', ['海底都市エルミナ。', '封印区画の奥の、最後の記録。', '封印区画の一番奥で最後の記録を読み、記憶の扱いを決めよう。']);
  /* ---------- 第10章：選ばれなかった未来 ---------- */
  E('main_10', '_start', 'npc:tempus_city:tc_gate', ['断裂群島の東の遠洋航路の先、時の神殿領。', '「鐘都テンプス」の門番。', '遠洋航海船で断裂群島の東の端の遠洋航路を抜け、鐘都テンプスの入口で門番に話しかけよう。']);
  E('main_10', 'tempus_arrived', 'npc:tempus_city:tc_gate', ['時の神殿領。', '鐘都テンプスの門番。', '鐘都テンプスの入口で門番に話しかけよう。']);
  E('main_10', 'time_bank_freed', 'ev:time_bank_vault_2:7,4', ['鐘都テンプス。', '「時間銀行」の地下契約室。', '時間銀行の契約係から話を聞き、地下契約室の最深部で契約書を書き換えよう。'],
    { pre: [{ need: 'flag:time_bank_quest', t: 'npc:time_bank:tb_clerk', text: '時間銀行の契約係に話を聞く' }] });
  E('main_10', 'corridor_1', 'ev:temple_of_time_1:9,4', ['時の神殿領の東。', '「時の神殿」第一の回廊。', '時の神殿に入り、第一の回廊で栄える未来を見よう。']);
  E('main_10', 'corridor_2', 'ev:temple_of_time_2:14,3', ['時の神殿。', '第二の回廊。', '第二の回廊で滅ぶ未来を見よう。']);
  E('main_10', 'corridor_3', 'ev:temple_of_time_3:7,10', ['時の神殿。', '最深部・第三の回廊。', '最深部の手前で、何も決まっていない未来を見よう。']);
  E('main_10', 'time_guardian_defeated', 'ev:temple_of_time_3:7,6', ['時の神殿。', '最深部の時の守護者。', '時の神殿の最深部で、時の守護者を倒そう。']);
  E('main_10', 'temple_trial_passed', 'ev:temple_of_time_3:10,3', ['時の神殿。', '最深部の守護者の石碑（時間軸の試練）。', '最深部の石碑で、マルチタイムフレームの試練に合格しよう。'],
    { pre: [{ need: 'flag:learn_mtf', t: 'ev:temple_of_time_3:7,3', text: '時間軸の試練（マルチタイムフレーム）を受ける' }] });
  E('main_10', 'sophia_joined', 'ev:temple_of_time_3:10,3', ['時の神殿。', '最深部の時詠み師ソフィア。', '試練のあと、ソフィアと話そう。']);
  /* ---------- 第11章：理想の島 ---------- */
  E('main_11', 'zeromea_arrived', 'loc:world_tempus:dimension_gate', ['時の神殿領の南東。', '「転移門」。', '時の神殿領の南東にある転移門をくぐり、ゼロメアへ入ろう。']);
  E('main_11', 'interview_1', 'npc:node_city:nc_resident', ['ゼロメア。', '「演算都市ノード」の住民。', '演算都市ノードの北側で、都市の女の話を聞こう。'], { group: 'interview' });
  E('main_11', 'interview_2', 'npc:scheduled_district:sd_man', ['ゼロメア。', '「第7居住区」の住民。', 'ゼロメアの南西の第7居住区で、居住区の男の話を聞こう。'], { group: 'interview' });
  E('main_11', 'interview_3', 'npc:no_failure_school:sc_student', ['ゼロメア。', '演算都市ノードの「学校」の生徒。', 'ノードの北東の学校で、生徒の話を聞こう。'], { group: 'interview' });
  E('main_11', 'io_met', 'npc:school_roof:roof_io', ['演算都市ノード。', '学校の屋上の人工生命体イオ。', '学校の奥から屋上へ上がり、イオに会おう。']);
  E('main_11', 'drone_swarm_defeated', 'ev:old_city_2:4,7', ['ゼロメアの北。', '「廃棄された旧都市」の記録庫（深層）。', '旧都市の奥の記録庫で、監視ドローン群を倒そう。']);
  E('main_11', 'old_city_record', 'ev:old_city_2:11,7', ['廃棄された旧都市。', '旧都市の記録庫の記録。', 'ドローン群を倒したあと、記録庫の記録を読もう。']);
  E('main_11', 'io_key', 'npc:school_roof:roof_io', ['演算都市ノード。', '学校の屋上のイオ。', '旧都市の記録をイオに見せ、中枢の認証鍵を受け取ろう。']);
  /* ---------- 第12章：オラクルの真実 ---------- */
  E('main_12', 'core_1', 'ev:oracle_core_1:10,11', ['演算都市ノード。', '「オラクル中枢」第1層。', 'ノードの北のオラクル中枢へ。第1層の扉を認証鍵で開けよう。']);
  E('main_12', 'core_2', 'ev:oracle_core_2:11,7', ['オラクル中枢。', '第2層（記録層）のテオドルの記録。', '第2層で、テオドルの記録を読もう。']);
  E('main_12', 'core_3', 'ev:oracle_core_3:7,8', ['オラクル中枢。', '第3層（演算核）の中枢防衛機構。', '第3層で中枢防衛機構を倒そう。']);
  E('main_12', 'overfit_seen', 'ev:oracle_core_3:7,4', ['オラクル中枢。', '第3層の「誤差ゼロの予測」の試練。', '第3層の試練の石碑（過剰最適化）を受けてから、奥のオラクルへ。'],
    { pre: [{ need: 'flag:learn_overfit', t: 'ev:oracle_core_3:4,5', text: '誤差ゼロの予測の試練を受ける' }] });
  E('main_12', 'oracle_dialogue', 'ev:oracle_core_3:7,4', ['オラクル中枢。', '第3層の奥のオラクル。', 'オラクルと対話しよう。']);
  E('main_12', 'zeromea_choice_done', 'ev:oracle_core_3:7,4', ['オラクル中枢。', '第3層の奥のオラクル。', '統治の再設計（権限制限／段階的移行／現状維持）を選ぼう。']);
  E('main_12', 'io_joined', 'npc:school_roof:roof_io', ['演算都市ノード。', '学校の屋上のイオ。', '学校の屋上へ戻り、イオと話そう。']);
  /* ---------- 第13章：魔導王国の秘密 ---------- */
  E('main_13', '_start', 'npc:magicka_city:mc_gate', ['時の神殿領の東の遠洋航路の先、マクディア魔導王国。', '「魔導都マクディア」の入口の魔導騎士。', '遠洋航海船で時の神殿領の東の端の遠洋航路を抜け、魔導都マクディアに入ろう。']);
  E('main_13', 'magicka_arrived', 'npc:magicka_city:mc_gate', ['マクディア魔導王国。', '魔導都マクディアの入口の魔導騎士。', '魔導都マクディアの入口で魔導騎士に話しかけよう。']);
  E('main_13', 'archive_permit', 'npc:magicka_academy:ma_mireille', ['魔導都マクディア。', '「王立学院」の学院長ミレイユ。', '町の北西の王立学院で学院長に会い、禁書庫の入館許可をもらおう。']);
  E('main_13', 'tome_1', 'ev:forbidden_archive_1:8,7', ['魔導都マクディアの北の丘。', '「禁書庫」1階の古文書。', '入館許可証を持って禁書庫へ。1階で古文書の第一巻を読もう。']);
  E('main_13', 'tome_2', 'ev:forbidden_archive_2:3,7', ['魔導都マクディアの北の丘の禁書庫。', '禁書庫2階の古文書。', '2階で古文書の第二巻を読もう。']);
  E('main_13', 'tome_3', 'ev:forbidden_archive_3:8,3', ['魔導都マクディアの北の丘の禁書庫。', '禁書庫の最深部の古文書。', '最深部で古文書の第三巻を読もう。']);
  E('main_13', 'minister_defeated', 'ev:forbidden_archive_3:8,5', ['魔導都マクディアの北の丘の禁書庫。', '禁書庫の最深部の大臣ヴォルク。', '最深部で大臣ヴォルクの裏切りを止めよう。']);
  E('main_13', 'learn_macd', 'ev:forbidden_archive_3:13,3', ['魔導都マクディアの北の丘の禁書庫。', '禁書庫の最深部の石碑（MACDと複合分析の試練）。', '最深部の石碑で、MACDと複合分析の試練に合格しよう。']);
  E('main_13', 'origin_notes', 'ev:origin_lab_2:2,2', ['マクディア魔導王国の東。', '「起源の実験室」の最深部。', '起源の実験室の最深部で、テオドルの手記を読もう。']);
  E('main_13', 'magicka_choice_done', 'npc:magicka_palace:mp_king', ['魔導都マクディア。', '「魔導王宮」の魔導王。', '魔導王宮で国王に報告し、研究の扱いを決めよう。']);
  /* ---------- 第14章：天空への航路 ---------- */
  E('main_14', 'airship_owned', 'ev:origin_lab_2:12,3', ['マクディア魔導王国の東。', '起源の実験室の格納庫。', '起源の実験室の最深部の格納庫で、欠片3つを使って飛空艇を復活させよう。']);
  E('main_14', 'sky_arrived', 'map:world_sky', ['アルカディア相場大陸の北の空。', '飛空艇の空路の先の「天空群島」。', '飛空艇でアルカディア相場大陸へ行き、大陸の北の端の空路を抜けて天空群島へ向かおう。']);
  E('main_14', 'sky_1', 'ev:world_sky:54,82', ['天空群島。', '星見島の記録碑。', '星見島の記録碑を読もう。'], { group: 'skystone' });
  E('main_14', 'sky_2', 'ev:world_sky:112,64', ['天空群島。', '風の島の記録碑（飛空艇で渡る）。', '飛空艇で風の島へ渡り、記録碑を読もう。'], { group: 'skystone' });
  E('main_14', 'sky_3', 'ev:world_sky:68,32', ['天空群島。', '神殿島の記録碑。', '神殿島の記録碑を読もう。'], { group: 'skystone' });
  E('main_14', 'camp_talk', 'ev:star_camp:9,6', ['天空群島。', '「星見塔の野営地」の焚き火。', '星見塔の野営地で、焚き火を囲んで仲間と話そう。']);
  E('main_14', 'sky_record', 'npc:star_tower_2:st_recorder', ['天空群島。', '「星見塔」の最上階の記録者。', '星見塔を登り、最上階で記録者と話そう。']);
  E('main_14', 'sky_guardian_defeated', 'ev:sky_temple_2:7,7', ['天空群島の北の島。', '「天空神殿」の守護者。', '天空神殿に入り、守護者を倒そう。']);
  E('main_14', 'control_room', 'ev:sky_temple_2:7,3', ['天空神殿。', '天空神殿の制御装置の間。', '制御装置の間を調べよう。']);
  /* ---------- 第15章：暗黒大陸 ---------- */
  E('main_15', 'dark_arrived', 'npc:dark_camp:dc_captain', ['天空群島の北の空路の先、暗黒大陸。', '「虚無の荒野の前線基地」の隊長。', '飛空艇で天空群島の北の端の闇の空路を抜け、前線基地の隊長に話しかけよう。']);
  E('main_15', 'hald_met', 'npc:dark_tent_hald:dt_hald', ['暗黒大陸の前線基地。', '前線基地の「外れの天幕」のハルド。', '前線基地の外れの天幕でハルドと話そう。']);
  E('main_15', 'zarg_remnant', 'ev:void_wasteland_1:17,8', ['暗黒大陸。', '「虚無の荒野」1階。', '虚無の荒野の1階で、ザルグの残滓と向き合おう。']);
  E('main_15', 'sevran_shadow', 'ev:void_wasteland_2:10,6', ['虚無の荒野。', '虚無の荒野の深部。', '深部で、セヴランの影と向き合おう。']);
  E('main_15', 'grote_rematch', 'ev:demon_castle_gate:9,10', ['暗黒大陸の北。', '「魔王城の門」の前の鉄冠将軍グロート。', '魔王城の門の前で、鉄冠将軍グロートと戦おう。']);
  E('main_15', 'learn_emotion', 'ev:demon_castle_gate:13,5', ['魔王城の門。', '門の右の石碑（感情に支配されない判断の試練）。', '門の石碑で、感情に支配されない判断の試練に合格しよう。']);
  E('main_15', 'castle_gate_open', 'ev:demon_castle_gate:9,2', ['魔王城の門。', '魔王城の門。', '門を調べて、魔王城の門を開こう。']);
  /* ---------- 第16章：均衡の天秤 ---------- */
  E('main_16', 'castle_seal_1', 'ev:demon_castle_2:9,4', ['暗黒大陸の北の魔王城。', '魔王城2階・欲望の間。', '2階の欲望の間の封印を解こう。']);
  E('main_16', 'castle_seal_2', 'ev:demon_castle_3:9,4', ['暗黒大陸の北の魔王城。', '魔王城3階・恐怖の間。', '3階の恐怖の間の封印を解こう。']);
  E('main_16', 'castle_seal_3', 'ev:demon_castle_4:9,4', ['暗黒大陸の北の魔王城。', '魔王城4階・支配の間。', '4階の支配の間の封印を解こう。']);
  E('main_16', 'demon_fear', 'ev:demon_castle_5:8,3', ['暗黒大陸の北の魔王城。', '魔王城の玉座の間。', '玉座の間で、相場魔王と戦おう。']);
  E('main_16', 'demon_greed', 'ev:demon_castle_5:8,3', ['暗黒大陸の北の魔王城。', '魔王城の最上階・玉座の間。', '玉座の間の戦いを続けよう。']);
  E('main_16', 'demon_fixed', 'ev:demon_castle_5:8,3', ['暗黒大陸の北の魔王城。', '魔王城の最上階・玉座の間。', '玉座の間の戦いを続けよう。']);
  E('main_16', 'crystal_choice_done', 'ev:demon_castle_5:8,3', ['暗黒大陸の北の魔王城。', '魔王城の最上階・玉座の間。', '玉座の間で、クリスタルをどうするか選ぼう。']);
  E('main_16', 'game_cleared', 'ev:demon_castle_5:8,3', ['暗黒大陸の北の魔王城。', '魔王城の最上階・玉座の間。', '玉座の間で、最後の選択の結末を見届けよう。']);

  root.OBJECTIVES = O;
})(typeof window !== 'undefined' ? window : globalThis);
