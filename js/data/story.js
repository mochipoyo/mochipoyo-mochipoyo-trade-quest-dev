/* =========================================================
   Data / Story : 仲間キャラクター・クエスト・修行場の講義・章タイトル
   ========================================================= */
(function (root) {
  'use strict';

  var COMPANIONS = {
    lina: { name: 'リーナ', job: 'priest', sprite: 'lina', joinLevel: 2, personality: '優しく芯が強い', background: '巡礼の旅の途中で魔物に襲われ、ポヨ村に身を寄せた僧侶。', bio: '回復魔法が得意。仲間の無茶を止める役。' },
    kyle: { name: 'カイル', job: 'knight', sprite: 'kyle', joinLevel: 4, personality: '不器用で義理堅い', background: '元リヴェル騎士団。迷いの森で部下を失い、酒場で燻っていた。', bio: '高い防御力で前線を支える騎士。' },
    mina: { name: 'ミナ', job: 'thief', sprite: 'mina', joinLevel: 5, personality: '明るく抜け目がない', background: 'ダウの村を拠点にする宝探し。宝箱と逃げ足に自信がある。', bio: '素早い盗賊。宝箱で追加アイテムを見つけることがある。' },
    seris: { name: 'セリス', job: 'mage', sprite: 'seris', joinLevel: 8, personality: '冷静で知識欲が強い', background: 'マクディア魔導王国の魔法使い。クリスタルの研究のため大陸を旅している。', bio: '強力な攻撃魔法の使い手。' },
    gald: { name: 'ガルド', job: 'warrior', sprite: 'gald', joinLevel: 6, personality: '豪快で面倒見がいい', background: '港町で船を待つ傭兵。戦えるならそれでいい、と言う。', bio: '高いHPと攻撃力の戦士。' },
    lucia: { name: 'ルシア', job: 'waveblade', sprite: 'lucia', joinLevel: 9, personality: '静かで負けず嫌い', background: '師匠ハケイの一番弟子。波を読む力をさらに高めたいと願う。', bio: '波形を読む剣技の使い手。' },
    // v5.1 新しい仲間（第6〜7章）
    elna: { name: 'エルナ', job: 'auditor', sprite: 'scholar', joinLevel: 14, personality: '冷静で正確、しかし情に厚い', background: 'カリオン徴収政府の元財務官。帳簿の不正を見つけ、証拠を隠したことで追われている。', bio: '監査官。敵の弱点と強化を見抜く支援役。' },
    // v5.2 新しい仲間（第8章）
    nagi: { name: 'ナギ', job: 'navigator', sprite: 'sailor', joinLevel: 19, personality: '快活で物怖じしない', background: '港町マリナ育ちの船乗り。父が残した外海の航路図を継ぎ、断裂群島への航海を夢見てきた。', bio: '航海士。海上のエンカウントを減らし、味方の回避を上げる。' },
    iris: { name: 'イーリス', job: 'surveyor', sprite: 'villager_f', joinLevel: 20, personality: '無口だが観察が鋭い', background: '灰灯島の生き残り。ヨルン老人の孫。災害で失われた街の地図を描き続けている。', bio: '測量士。ダンジョンの宝箱の位置が見え、遠距離攻撃が得意。' },
    // v5.3 新しい仲間（第10・12章）
    sophia: { name: 'ソフィア', job: 'chronomancer', sprite: 'priest', joinLevel: 23, personality: '静かで、断言しない', background: '時の神殿の守護者。未来の可能性を見るが、どれも確定していないことを知っている。', bio: '時詠み師。味方の行動順を操り、全体を支援する。' },
    io: { name: 'イオ', job: 'mechanist', sprite: 'child', joinLevel: 25, personality: '素直で、問いが多い', background: 'オラクル製の人工生命体。命令に従うだけだったが、主人公たちとの出会いで「自分の意思」を考え始める。', bio: '機巧師。解析と機巧弾で戦う。' },
    ord: { name: 'オルド', job: 'oath_knight', sprite: 'guard', joinLevel: 17, personality: '寡黙で誠実', background: '王都の親衛隊にいた騎士。命令で民の財産を没収した過去を償うため、主人公に剣を預ける。', bio: '誓約騎士。仲間をかばい、反撃する盾役。' }
  };

  var QUESTS = {
    main_1: { title: '王に会う', desc: 'リヴェル城下町へ行き、リヴェル王に謁見する。', main: true, reward: { exp: 20 } },
    main_2: { title: '迷いの森の魔物', desc: '迷いの森の奥にある祠で「トレンド迷子」を討ち、祠を調べる。', main: true, reward: { exp: 120, gold: 200 } },
    main_3: { title: '忘却の洞窟の欠片', desc: '忘却の洞窟の封印扉を開け、最深部で「欲望のゴーレム」からクリスタルの欠片を取り戻す。', main: true, reward: { exp: 300, gold: 400 } },
    main_4: { title: '海を渡る準備', desc: '港町マリナの船を直す。倉庫の「帆布」と漁師の「羅針盤」を船乗りに届け、港を守る魔物を倒す。', main: true, reward: { exp: 150, gold: 300 },
      steps: [['compass_given', '漁師から羅針盤を受け取る'], ['harbor_boss', '帆布と羅針盤を船乗りに届け、港の魔物を倒す'], ['ship_ready', '船で海へ出る（浜から海へ進むと乗れる）']] },
    // ===== v5.0 第5章〜第16章（第5章は実装済み。第6章以降はデータのみ：開始条件を満たすまで受注されない） =====
    main_5: { title: '鉄鎖の町を解放せよ', desc: '海路を東へ進み、グラニア鉱業地方の灰鉱町ヴェルムへ。鉱山で働かされる労働者を救い、監督官を倒し、町が自分たちで回る仕組みを作る。', main: true, chapter: 5, reward: { exp: 600, gold: 1500, item: 'ring_power' }, next: 'main_6', learn: 'learn_risk',
      steps: [['verum_arrived', '船でグラニア西岸に上陸し、灰の浜の番小屋を訪ねる'], ['hideout_met', 'ヴェルムの宿舎から地下の抵抗組織（ハルト）に会う'], ['rescued_3', '鉄鎖鉱山1階で鎖につながれた労働者3人を救う'], ['mine_captain', '2階の看守長から鉱山の鍵を奪う'], ['verum_overseer_defeated', '最深部で監督官ザルグを倒す'], ['verum_evidence', '帳簿の切れ端を3枚集めてハルトに渡す（館・工場・鉱山2階）'], ['verum_supply_done', '物資の注文書を灰の浜の番人ロウに届ける'], ['verum_council', 'ハルトと自治組織の形を決める'], ['verum_liberated', 'ハルトに報告し、町を解放する']],
      after: '監督官の監視が消え、配給所が市場になり、学び舎ができる。住民の会話が変わる。' },
    main_6: { title: '黒い帳簿', desc: '灰の峠を越えてカリオン徴収連邦へ。徴収都市で追われる元財務官エルナを救い、財務局・商業区・地下記録庫の三つの記録を照合して政府の不正の証拠を揃える。', main: true, chapter: 6, reward: { exp: 600, gold: 1200, item: 'audit_ledger' }, next: 'main_7', startFlag: 'kalion_open', learn: 'learn_record',
      steps: [['kalion_arrived', '灰の峠を越え、徴収都市カリオンに入る'], ['elna_rescued', '南区の路地で追われている女（エルナ）を助ける'], ['ledger_1', '財務局の書記に会い、エルナの机の照合記録を回収する'], ['ledger_2', '商業区の大商人クラウスから裏帳簿を手に入れる'], ['ledger_3', '財務局の奥から地下記録庫へ下り、黒い帳簿の守護者を倒す'], ['hald_confronted', '財務局長ハルドに三つの記録を突きつける'], ['kalion_choice_done', '証拠の扱いを決める（公開／監察官／被害者）']],
      after: '証拠の扱いによって南区の空気が変わる。王都セントラへの道が開く。' },
    main_7: { title: '奪われた財産', desc: '王都セントラで監察官リーヴと被害者の証言を集め、騎士団長ヴァレンから王宮の通行証を得る。帳簿中枢を止め、大宰相セヴランと対峙し、財産返還令を徴収都市で執行する。', main: true, chapter: 7, reward: { exp: 900, gold: 2000, item: 'shield_risk' }, next: 'main_8',
      steps: [['sentra_arrived', '王都セントラに入る'], ['riev_met', '監察官の事務所でリーヴに会う'], ['testimony_1', '城壁の外のテント村の老人の証言を聞く'], ['testimony_2', 'テント村の没収された商人の証言を聞く'], ['testimony_3', '王都の酒場の元兵士の証言を聞く'], ['kyle_oath_done', '騎士団詰所でヴァレン団長と一騎打ちし、通行証を得る'], ['palace_open', '王宮の門を通行証で開く'], ['royal_captain_defeated', '王宮で親衛隊長ドレクを倒す'], ['ledger_core_stopped', '帳簿中枢の守護機構を止める'], ['sevran_fallen', '大宰相セヴランと対峙し、処遇を決める'], ['kalion_reformed', '徴収都市の財務局で財産返還令を執行する']],
      after: '徴収都市から兵の監視が消え、自治組織と新しい商人が現れる。一部の住民は不安を口にする。' },
    main_8: { title: '灰灯島の灯火', desc: 'ナギの航路図とヴェルムの鉄で遠洋航海船を建造し、外海を越えて灰灯島アルナへ。消えた灯台の部品を廃墟で集めて灯りを戻し、地下施設で災害の真相を知る。', main: true, chapter: 8, reward: { exp: 1200, gold: 2500, item: 'lost_chart' }, next: 'main_9', learn: 'learn_review',
      steps: [['nagi_joined', '港町マリナの船着き場でナギに会う'], ['galleon_ready', '灰鉱町ヴェルムのハルトから鉄の竜骨をもらい、ナギに渡して遠洋航海船を建造する'], ['aruna_arrived', '遠洋航海船で南の遠洋航路を抜け、灰灯島アルナの村でヨルン老人に会う'], ['lighthouse_part_1', '廃墟の郵便局で灯台のレンズを見つける'], ['lighthouse_part_2', '時計塔の機構から歯車を外す（廃墟の記憶と戦う）'], ['lighthouse_part_3', '廃墟の倉庫で灯台の油を見つける'], ['lighthouse_lit', '灯台の最上階で部品を取り付け、灯りを戻す'], ['iris_joined', '測量士イーリスに会い、地下施設の場所を聞く'], ['undercity_record', '地下施設の最深部で「天秤の鏡」の記録を読む'], ['yorn_letter_done', 'ヨルン老人に手紙を届ける']],
      after: '灯台に光が戻り、船が訪れるようになる。商人が戻り、村の会話が変わる。' },
    main_9: { title: '海底の記憶', desc: '地下施設で見つけた古代の潜航装置で、沈んだ都エルミナへ。記憶の図書館の3つの区画を読み、封印区画でミナの父の最後の記録を見つける。', main: true, chapter: 9, reward: { exp: 1400, gold: 3000, item: 'undersea_record' }, next: 'main_10',
      steps: [['submarine_owned', '地下施設で古代の潜航装置を手に入れる'], ['elmina_arrived', '灰灯島の南岸の台座から潜航し、海底都市エルミナに着く'], ['library_1', '記憶の図書館・第一区画（予測の記録）を読む'], ['library_2', '第二区画（避難の記録）を読む'], ['library_3', '第三区画（失敗の記録）を読む'], ['seal_opened', '司書の残像から封印区画の鍵を受け取り、扉を開ける'], ['library_guardian_defeated', '図書館の守護機構を倒す'], ['mina_father_record', '封印区画の最後の記録を読み、記憶の扱いを決める']],
      after: '大災害がクリスタルの異常（未来を固定する試み）と関係していたことを知る。' },
    main_10: { title: '選ばれなかった未来', desc: '断裂群島の東の遠洋航路で時の神殿領へ。時間を担保にする銀行を調べ、時の神殿の三つの回廊で「栄える未来」「滅ぶ未来」「決まらない未来」を見る。守護者と時間軸の試練を越え、転移門を開く。', main: true, chapter: 10, reward: { exp: 1600, gold: 3500, item: 'crystal_shard' }, next: 'main_11', learn: 'learn_mtf',
      steps: [['tempus_arrived', '鐘都テンプスに入り、時間銀行の噂を聞く'], ['time_bank_freed', '時間銀行の地下契約室で契約書を書き換え、預けられた時間を返す'], ['corridor_1', '時の神殿 第一の回廊：栄える未来を見る'], ['corridor_2', '第二の回廊：滅ぶ未来を見る'], ['corridor_3', '第三の回廊：何も決まっていない未来を見る'], ['time_guardian_defeated', '最深部で時の守護者を倒す'], ['temple_trial_passed', '守護者の石碑で時間軸の試練（マルチタイムフレーム）に合格する'], ['sophia_joined', '時詠み師ソフィアと話す']],
      after: '転移門が開く。鐘都の人々は「確実な未来」の代わりに、自分で選ぶ明日を持て余す。' },
    main_11: { title: '理想の島', desc: '転移門の先、異空間の島ゼロメア。AI「オラクル」が職業も移動も決める都市で、監視ドローンを避けながら住民の話を聞き、人工生命体イオと出会い、旧都市でオラクル以前の記録を見つける。', main: true, chapter: 11, reward: { exp: 1800, gold: 4000, item: 'auth_key' }, next: 'main_12',
      steps: [['zeromea_arrived', '転移門からゼロメアに入る（未登録個体としてドローンに追われる）'], ['interview_1', '演算都市ノードの住民の話を聞く'], ['interview_2', '第7居住区の住民の話を聞く'], ['interview_3', '失敗を禁止された学校の生徒の話を聞く'], ['io_met', '学校の屋上で人工生命体イオと出会う'], ['drone_swarm_defeated', '旧都市の最深部で監視ドローン群を倒す'], ['old_city_record', '旧都市の記録（オラクル以前の島）を読む'], ['io_key', 'イオに旧都市の記録を見せ、中枢の認証鍵を受け取る']],
      after: 'イオが「自分の意思」を考え始める。中枢への扉が開く。' },
    main_12: { title: 'オラクルの真実', desc: 'オラクル中枢の3層を登り、AIと対話する。セリスの師テオドルの記録を読み、統治をどう再設計するかを選ぶ。「AIによる予測の限界・過剰最適化」の試練。', main: true, chapter: 12, reward: { exp: 2000, gold: 5000, item: 'oracle_charter' }, next: 'main_13', learn: 'learn_overfit',
      steps: [['core_1', 'オラクル中枢 第1層を越える'], ['core_2', '第2層でテオドルの記録を読む'], ['core_3', '第3層で中枢防衛機構を倒す'], ['overfit_seen', 'オラクルの「誤差ゼロの予測」の試練（過剰最適化）を受ける'], ['oracle_dialogue', 'オラクルと対話する'], ['zeromea_choice_done', '統治の再設計を選ぶ（権限制限／段階的移行／現状維持）'], ['io_joined', 'イオと話す']],
      after: '選択によって、ゼロメアの住民の生活と対立が変わる。イオが仲間になる。' },
    main_13: { title: '魔導王国の秘密', desc: 'マクディア魔導王国の禁書庫でクリスタルの起源を発見する。（今後の更新）', main: true, chapter: 13, future: true, reward: { exp: 2200, gold: 5000 }, next: 'main_14' },
    main_14: { title: '天空への航路', desc: 'クリスタルの欠片を集め、古代の飛空艇を復活させる。（今後の更新）', main: true, chapter: 14, future: true, reward: { exp: 2500, gold: 6000 }, next: 'main_15' },
    main_15: { title: '暗黒大陸', desc: '飛空艇で暗黒大陸へ。魔王城への道を開く。（今後の更新）', main: true, chapter: 15, future: true, reward: { exp: 3000, gold: 7000 }, next: 'main_16' },
    main_16: { title: '均衡の天秤', desc: '相場魔王との最終決戦と、クリスタルをどうするかの選択。（今後の更新）', main: true, chapter: 16, future: true, reward: { exp: 5000, gold: 10000 }, next: null },
    // ===== 第10〜12章のサブクエスト =====
    time_bank: { title: '時間銀行の契約', desc: '鐘都テンプスの時間銀行。明日を担保に取られた住民の契約書を、地下契約室で書き換える。', reward: { exp: 500, gold: 1500, item: 'temporal_robe' } },
    sophia_lucia: { title: '見える未来と選ぶ未来', desc: 'ソフィアとルシアを連れて時の神殿の第三の回廊へ。「読む」ことと「決める」ことについて語り合う。', reward: { exp: 400, gold: 0, item: 'chrono_staff' }, companion: 'lucia' },
    no_failure_school: { title: '失敗を禁止された学校', desc: 'ゼロメアの学校で、失敗が記録されない授業を見る。生徒に「失敗の記録」の意味を伝える。', reward: { exp: 500, gold: 1200, item: 'gear_bow' } },
    seris_master: { title: 'セリスの師', desc: 'セリスを連れてオラクル中枢の第2層へ。師テオドルの記録を読み、「師は正しかったのか」に向き合う。', reward: { exp: 500, gold: 0, item: 'amulet_mind' }, companion: 'seris' },
    // ===== 第8〜9章のサブクエスト =====
    castaway: { title: '漂流者の帰還', desc: '断裂群島の東の小島で見つけた漂流者を、灰灯島アルナの村まで送り届ける。', reward: { exp: 300, gold: 600, item: 'sea_coat' } },
    lantern_night: { title: '港の灯り', desc: '毎晩ひとりで港に灯りをともすヨルン老人の話を聞き、廃墟で息子の手紙を見つけて届ける。', reward: { exp: 400, gold: 0, item: 'amulet_life' } },
    mina_father: { title: 'ミナの父', desc: 'ミナを連れて海底都市の記憶の図書館へ。封印区画で父の最後の記録を読む。', reward: { exp: 400, gold: 0, item: 'ring_speed' }, companion: 'mina' },
    mist_isle: { title: '霧の島の測量', desc: 'イーリス加入後に地図に現れる霧の島へ渡り、古い測量標を調べる。', reward: { exp: 350, gold: 800, item: 'survey_bow' } },
    // ===== 第6〜7章のサブクエスト =====
    erased_village: { title: '地図から消えた村', desc: 'カリオン平野の西の森の奥、記録から抹消された村。病人のために、村を記録に戻すか、消えたままにするかを村長と決める。', reward: { exp: 250, gold: 300, item: 'amulet_life' } },
    kyle_oath: { title: 'カイルの誓い', desc: 'カイルを連れて王都の騎士団詰所へ。かつての上官ヴァレン団長と向き合う。', reward: { exp: 300, gold: 0, item: 'knight_helm' }, companion: 'kyle' },
    sentra_rebuild: { title: '帳簿の書き換え', desc: '政府改革後の徴収都市で、自治組織の世話役の依頼で帳簿の照合を3件手伝う（南区の男・南区の女・大商人クラウス）。', reward: { exp: 200, gold: 800, item: 'ring_guard' } },
    // ===== 第5章のサブクエスト =====
    verum_ledger: { title: '奪われた賃金の証拠', desc: '監督官の館・鉱石工場の事務室・鉄鎖鉱山2階に隠された「帳簿の切れ端」を3枚集め、ハルトに渡す。', reward: { exp: 200, gold: 500, item: 'amulet_mind' } },
    verum_supply: { title: '物流を回復せよ', desc: 'ハルトの書いた物資の注文書を、灰の浜の番人ロウに届ける。', reward: { exp: 150, gold: 300, item: 'tent' } },
    gald_reunion: { title: 'ガルドの帰郷', desc: 'ヴェルム解放後、ガルドを連れて労働者の宿舎を訪ね、かつての部下ベルクと向き合う。', reward: { exp: 300, gold: 0, item: 'battle_axe' }, companion: 'gald' },
    sub_bandit: { title: '街道の山賊', desc: 'エマール山道のアジトにいる山賊の頭目ガロンを倒す。', reward: { exp: 150, gold: 500, item: 'ring_speed' } },
    learn_pullback: { title: '押し目を見極めよ', desc: '修行場で「上昇トレンド中の押し目」の試練に3回成功する。', counter: 'trial_ok:up_pullback', need: 3, reward: { exp: 100, gold: 150, item: 'amulet_mind' } },
    learn_range: { title: 'レンジを見送れ', desc: '修行場で「レンジ相場」の試練に2回成功する（見送りが正解）。', counter: 'trial_ok:range', need: 2, reward: { exp: 80, gold: 100, item: 'ether' } },
    learn_hidden: { title: 'ヒドゥンダイバージェンスを見つけよ', desc: '修行場で「ヒドゥンダイバージェンス」の試練に2回成功する。', counter: 'trial_ok:hidden', need: 2, reward: { exp: 150, gold: 200, item: 'time_amulet' } },
    learn_stoploss: { title: '損切り位置を極めよ', desc: '修行場の試練で「損切り位置」を5回正しく設定する。', counter: 'trial_sl_ok', need: 5, reward: { exp: 120, gold: 150, item: 'stoploss_shield' } },
    // v4.2: 師匠の特別クエスト（トレーダーランク到達で解放。複数条件 needs = [[カウンター, 必要数], ...]）
    mq_eye: { title: '自分の眼で見よ', master: true, rank: 1, desc: 'ヒントを使わずに5回正しい判断をし、5項目の分析をすべて正しく行った試練を2回達成する。', needs: [['trial_nohint_ok', 5, 'ヒントなし正解'], ['trial_analysis_full', 2, '分析5項目すべて正解']], reward: { exp: 120, gold: 250, item: 'feather_hat' } },
    mq_env: { title: '環境を読め', master: true, rank: 2, desc: '上位足の環境認識を8回正しく判断し、「上位足と下位足の不一致」の場面を2回正しく見送る。', needs: [['trial_mtf_ok', 8, '上位足の認識'], ['trial_ok:mtf_conflict', 2, '不一致場面の見送り']], reward: { exp: 200, gold: 400, item: 'ring_guard' } },
    mq_discipline: { title: '規律の証', master: true, rank: 3, desc: '根拠の揃わない場面を4回正しく見送り、損切り位置を8回正しく置く。', needs: [['trial_skip_ok', 4, '正しい見送り'], ['trial_sl_ok', 8, '損切り位置']], reward: { exp: 300, gold: 600, item: 'knight_shield' } },
    mq_master: { title: '導師への道', master: true, rank: 4, desc: '90点以上を3回、ヒントなしの正解を20回、そして異なる14場面で正解する。', needs: [['trial_perfect', 3, '90点以上'], ['trial_nohint_ok', 20, 'ヒントなし正解'], ['trial_unique', 14, '異なる場面で正解']], reward: { exp: 500, gold: 1200, item: 'elixir' } }
  };

  // 修行場の講義（既存教材 LEARNING.chapters を参照）。講義を修了するとフラグが立つ
  var LECTURES = [
    { id: 'learned_basic', chapter: 1, title: '相場の基本', where: ['poyo', 'dow'] },
    { id: 'learned_dow', chapter: 2, title: 'ダウ理論と波形', where: ['poyo', 'dow'] },
    { id: 'learned_ema', chapter: 3, title: 'EMAとグランビルの法則', where: ['poyo', 'dow'] },
    { id: 'learned_mtf', chapter: 4, title: 'マルチタイムフレーム', where: ['dow'] },
    { id: 'learned_rci', chapter: 5, title: 'RCI（期間9）', where: ['dow'] },
    { id: 'learned_macd', chapter: 6, title: 'MACDとダイバージェンス', where: ['dow'] },
    { id: 'learned_risk', chapter: 7, title: '資金管理', where: ['poyo', 'dow'] }
  ];

  var CHAPTERS = [
    { id: 1, title: '第一章　目覚めた旅人', flag: null },
    { id: 2, title: '第二章　迷いの森', flag: 'king_quest1' },
    { id: 3, title: '第三章　欲望の洞窟', flag: 'king_quest2' },
    { id: 4, title: '第四章　海を渡る準備', flag: 'shard_returned' },
    { id: 5, title: '第五章　灰鉱の町と鎖につながれた人々', flag: 'ship_ready' },
    { id: 6, title: '第六章　黒い帳簿の都市', flag: 'kalion_open' },
    { id: 7, title: '第七章　奪われた財産と王国の裁定', flag: 'kalion_capital_open' },
    { id: 8, title: '第八章　半分が死んだ島', flag: 'galleon_ready' },
    { id: 9, title: '第九章　海底の記憶', flag: 'submarine_owned' },
    { id: 10, title: '第十章　時の神殿と選ばれなかった未来', flag: 'tempus_arrived' },
    { id: 11, title: '第十一章　AIが統治する理想の島', flag: 'zeromea_arrived' },
    { id: 12, title: '第十二章　誤差のない未来', flag: 'core_1' },
    { id: 13, title: '第十三章　魔導王国の裏切り', flag: 'magicka_open', future: true },
    { id: 14, title: '第十四章　天空の境界', flag: 'airship_ready', future: true },
    { id: 15, title: '第十五章　暗黒大陸と最後の選択', flag: 'dark_open', future: true },
    { id: 16, title: '第十六章　均衡の天秤を壊す者', flag: 'final_open', future: true }
  ];

  root.COMPANIONS = COMPANIONS; root.QUESTS = QUESTS; root.LECTURES = LECTURES; root.STORY_CHAPTERS = CHAPTERS;
})(typeof window !== 'undefined' ? window : globalThis);
