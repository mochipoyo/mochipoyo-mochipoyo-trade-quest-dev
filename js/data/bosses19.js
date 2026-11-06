/* =========================================================
   Data / Bosses19（v8.0）：新しいボス 19 体（素材：trade_quest_bosses_19 の bosses.json・webp）
   ・表示名（display_name）・画像・敵ID（素材ID案 tq_boss_* をそのまま使う。既存の敵と重ならないことを読み込み時に確かめる）はパックが正本
   ・出る場所：3D 版の地球の世界の「町のない大陸」（外の地図 w78_*）の 19 か所の「異界の門」→ ボスの間（js/data/bosslair19.js）
   ・強さ：その場所の出現地帯の level（z）から、ボスのレベル＝z＋3。能力は既存の敵と同じ式（statsFor：レベル＋型）にボスの倍率を掛ける。
     倍率は作業用の戦闘シミュレーション（docs/tools/v80/boss19_tune.js）で、その場所の推奨レベルの上の数（＝地帯の想定レベル）で勝率 50% 前後、
     それより 6 レベル上で 85% 以上になるように決めた（通常の章のボスは、想定レベルで勝率 88% 以上・少ないレベルで 62% を目安にしている＝新しいボスは強め）
   ・報酬：勝つと、そのボスだけの装備（武器・防具・アクセサリー）・能力の最大値を上げる道具 2 つ・ゴールド。19 体すべてに勝つと「十九の契約印」
   ・行動：既存の呪文・特殊行動に、見た目に合わせた特殊行動（下の SP。効果はすべて既存の仕組み：ダメージ・状態異常・弱体化・溜め・反撃の構え・回復）
   ・2D 版（地球の世界を使わない設定）には異界の門がない（外の地図がないため）。ボスの敵の定義は外す（js/data/bosslair19.js → R78.finish。図鑑の数に入れない）。アイテムの定義は残す（セーブの互換）
   ・名前はゲームの中の架空の存在（現実の人物・団体・商品を表すものではない）
   ========================================================= */
(function (root) {
  'use strict';
  var EN = root.ENEMIES, SP = root.ENEMY_SPECIALS, ITEMS = root.ITEMS;
  if (!EN || !SP || !ITEMS) return;
  function statsFor(lv, arche) {   // enemies.js・monsters65.js・region78-kit.js と同じ式
    var s = { hp: Math.round(18 + lv * 9.5), atk: Math.round(5 + lv * 2.2), def: Math.round(2 + lv * 1.3), agi: Math.round(3 + lv * 0.9), mag: Math.round(lv * 0.8), exp: Math.round(3 + lv * lv * 0.9), gold: Math.round(3 + lv * 1.7) };
    if (arche === 'tank') { s.hp = Math.round(s.hp * 1.5); s.def = Math.round(s.def * 1.8); s.agi = Math.round(s.agi * 0.6); s.exp = Math.round(s.exp * 1.3); }
    if (arche === 'fast') { s.hp = Math.round(s.hp * 0.75); s.agi = Math.round(s.agi * 1.9); s.atk = Math.round(s.atk * 0.9); }
    if (arche === 'mage') { s.hp = Math.round(s.hp * 0.85); s.mag = Math.round(lv * 2.2 + 4); s.mp = 20 + lv * 3; s.exp = Math.round(s.exp * 1.2); }
    return s;
  }
  var A = function (type, idOrW, w, o) { var a = type === 'attack' ? { type: 'attack', w: idOrW } : { type: type, id: idOrW, w: w }; if (o) Object.keys(o).forEach(function (k) { a[k] = o[k]; }); return a; };   // o：{ hpBelow: 0.5 } など（HP が半分を切ってから使う）

  /* ---------- 画像の表（パックの webp 1024×1024 をそのまま。bbox＝見える範囲（アルファ>40）を 8px 広げた範囲 [x, y, 幅, 高さ]・
       anchor＝足もと（見える範囲の下の中央）・draw＝戦闘画面（640×416）での大きさ（縦横比を保って 260×200 に収める。浮いているボスは 186 で、lift だけ浮かせる）） ---------- */
  var ART = [
    {"no": 1, "id": "tq_boss_deluxe_mochiko", "name": "デラックス・モチコ", "file": "assets/bosses_19/01_tq_boss_deluxe_mochiko.webp", "sha256": "12892907ba1691c1cc2e2562c11772a6c03f06641a40d312491893162b340275", "ref": 1024, "bbox": [108, 106, 810, 807], "visible": [116, 114, 794, 791], "anchor": [513.0, 905.0], "size": "boss", "draw": [201, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "白桃色の三段の餅と漆器の甲冑をまとい、巨大な金杵を担ぐ餅の女帝。"},
    {"no": 2, "id": "tq_boss_apostle_of_anxiety", "name": "不安の伝道師", "file": "assets/bosses_19/02_tq_boss_apostle_of_anxiety.webp", "sha256": "09c01f08f23d51a96549e003aa59d047964227d6ee3fbffe27e0cf622d411798", "ref": 1024, "bbox": [139, 124, 738, 784], "visible": [147, 132, 722, 768], "anchor": [508.0, 900.0], "size": "boss", "draw": [188, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "鳴りかけた警鐘を胸に抱き、片手を耳に当てて囁く青灰色の巡礼者。"},
    {"no": 3, "id": "tq_boss_princess_mesaki", "name": "欲姫のメサキ", "file": "assets/bosses_19/03_tq_boss_princess_mesaki.webp", "sha256": "e67de753867dac94a0d38c65f5f9b25f26b8789b579baaa84c509e50fa9b216b", "ref": 1024, "bbox": [114, 127, 796, 771], "visible": [122, 135, 780, 755], "anchor": [512.0, 890.0], "size": "boss", "draw": [206, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "目先の宝石へ手を伸ばし、割れた宝冠を背負う紅珊瑚の姫。"},
    {"no": 4, "id": "tq_boss_dark_matter_lifeform_x", "name": "ダークマター生命体X", "file": "assets/bosses_19/04_tq_boss_dark_matter_lifeform_x.webp", "sha256": "a2a75f16e578559eeb1b45a05897cd54a712b3c683cbd9786414491fca283252", "ref": 1024, "bbox": [142, 157, 732, 722], "visible": [150, 165, 716, 706], "anchor": [508.0, 871.0], "size": "boss", "draw": [189, 186], "lift": 14, "floating": true, "status": "adopted", "concept": "黒い核を囲んで四つの鉱殻が浮遊する、非生物めいた宇宙生命体。"},
    {"no": 5, "id": "tq_boss_missionary_of_betrayal", "name": "裏切りの宣教師", "file": "assets/bosses_19/05_tq_boss_missionary_of_betrayal.webp", "sha256": "164c8a1fbbc13fab63c62e212c3bc9bbf7babd8106e6fd35df317e492848a0ef", "ref": 1024, "bbox": [173, 105, 664, 807], "visible": [181, 113, 648, 791], "anchor": [505.0, 904.0], "size": "boss", "draw": [165, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "差し出した白い仮面と、法衣の陰の短剣が対をなす偽りの宣教師。"},
    {"no": 6, "id": "tq_boss_enduring_human_desire", "name": "変わらぬ人の欲望", "file": "assets/bosses_19/06_tq_boss_enduring_human_desire.webp", "sha256": "6d7b6f128dde56387ab71029716ad3373d3246e75d7ffe2f04ea71e9b8e4f908", "ref": 1024, "bbox": [142, 115, 726, 783], "visible": [150, 123, 710, 767], "anchor": [505.0, 890.0], "size": "boss", "draw": [185, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "空洞の心臓へいくつもの青銅の手が伸び続ける、人の欲望の集合体。"},
    {"no": 7, "id": "tq_boss_averaging_prince", "name": "ナンピン皇子", "file": "assets/bosses_19/07_tq_boss_averaging_prince.webp", "sha256": "555ae98838321756065283dcb3cf84196fff2191dad86edd0cf3c47f246e8b8b", "ref": 1024, "bbox": [109, 108, 807, 792], "visible": [117, 116, 791, 776], "anchor": [512.5, 892.0], "size": "boss", "draw": [204, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "下の段ほど重い三段の貨幣鎧を着込み、折れかけた槍で踏みとどまる皇子。"},
    {"no": 8, "id": "tq_boss_former_sauron_consciousness", "name": "かつてサウロンだった意識", "file": "assets/bosses_19/08_tq_boss_former_sauron_consciousness.webp", "sha256": "743cf82232c14afcb51ca2bbe906ce97adc60a917d801342417d82549177bd77", "ref": 1024, "bbox": [153, 126, 715, 748], "visible": [161, 134, 699, 732], "anchor": [510.5, 866.0], "size": "boss", "draw": [178, 186], "lift": 14, "floating": true, "status": "adopted", "concept": "砕けた石板の間に亡き支配者の横顔が浮かぶ、肉体を失った意識。"},
    {"no": 9, "id": "tq_boss_unsmiling_greatshield", "name": "笑わぬ大盾", "file": "assets/bosses_19/09_tq_boss_unsmiling_greatshield.webp", "sha256": "0a6794bcc334987818667d81803ac21dede939a6b8ed2e0b2cd7c0001165a40d", "ref": 1024, "bbox": [181, 127, 649, 769], "visible": [189, 135, 633, 753], "anchor": [505.5, 888.0], "size": "boss", "draw": [169, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "無表情の石面が彫られた大盾が、鉄の脚で立つ自律甲冑。"},
    {"no": 10, "id": "tq_boss_game_master", "name": "ゲームマスター", "file": "assets/bosses_19/10_tq_boss_game_master.webp", "sha256": "edaeb2b8da05848561195042d6c455ed9a799c002aaf5c53d85adebdd40c8411", "ref": 1024, "bbox": [144, 146, 742, 750], "visible": [152, 154, 726, 734], "anchor": [515.0, 888.0], "size": "boss", "draw": [198, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "盤面をマントに織り込み、黒い駒を操る仮面のゲームマスター。"},
    {"no": 11, "id": "tq_boss_fallen_angel_manjaro", "name": "美の堕天使マンジャロ", "file": "assets/bosses_19/11_tq_boss_fallen_angel_manjaro.webp", "sha256": "bf026cf4014a6e27505be69ae5231b0b3189392a42788a7f1203567dc907c9c2", "ref": 1024, "bbox": [168, 110, 693, 807], "visible": [176, 118, 677, 791], "anchor": [514.5, 909.0], "size": "boss", "draw": [172, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "白磁の翼と割れた姿見を携え、理想の姿を映そうとする堕天使。"},
    {"no": 12, "id": "tq_boss_rate_warden_fomsy", "name": "金利の番人フォムシー", "file": "assets/bosses_19/12_tq_boss_rate_warden_fomsy.webp", "sha256": "095a509a168dce8e70a6782badbafb6d1ad8f6863ea864ee1b1eeb1806c8f03c", "ref": 1024, "bbox": [116, 156, 787, 696], "visible": [124, 164, 771, 680], "anchor": [509.5, 844.0], "size": "boss", "draw": [226, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "利上げと利下げを指し分ける真鍮の計器を胸に組み込んだ時計仕掛けの門番。"},
    {"no": 13, "id": "tq_boss_justice_guardian_cybern", "name": "正義の番人サイバーン", "file": "assets/bosses_19/13_tq_boss_justice_guardian_cybern.webp", "sha256": "fe962fa13ca2dd492a440d563c67753dcdac738ab1e0ad1a0046ec2fdcdf0c6c", "ref": 1024, "bbox": [125, 115, 759, 789], "visible": [133, 123, 743, 773], "anchor": [504.5, 896.0], "size": "boss", "draw": [192, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "白い装甲に群青の司法官マントを重ね、電子封印を押すサイバー執行官。"},
    {"no": 14, "id": "tq_boss_ubud_of_remembrance", "name": "追憶の森のウブド", "file": "assets/bosses_19/14_tq_boss_ubud_of_remembrance.webp", "sha256": "cdcea27358e4e3086e4c4784a597b831a9423fb7f7368b35c1710c7ea9471c39", "ref": 1024, "bbox": [173, 132, 672, 759], "visible": [181, 140, 656, 743], "anchor": [509.0, 883.0], "size": "boss", "draw": [177, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "古木の角に琥珀の記憶を宿し、苔の毛皮をまとう森の霊獣。"},
    {"no": 15, "id": "tq_boss_fallen_angel_lookism", "name": "醜悪の堕天使ルッキズム", "file": "assets/bosses_19/15_tq_boss_fallen_angel_lookism.webp", "sha256": "2b120cbe47414c3c9651d39c791eb93251138dd2649348d3da832b96140bb63c", "ref": 1024, "bbox": [122, 134, 777, 762], "visible": [130, 142, 761, 746], "anchor": [510.5, 888.0], "size": "boss", "draw": [204, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "他者を品定めする仮面が何層も連なり、翼にまで鏡の棘が生えた堕天使。"},
    {"no": 16, "id": "tq_boss_pleasure_djinn_velo", "name": "快楽の魔人ヴェロ", "file": "assets/bosses_19/16_tq_boss_pleasure_djinn_velo.webp", "sha256": "c98836b73326cf9ab165908f2faa2a47dff00aaffddcf8bc245436b27b1e9f8d", "ref": 1024, "bbox": [150, 113, 724, 802], "visible": [158, 121, 708, 786], "anchor": [512.0, 907.0], "size": "boss", "draw": [181, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "極彩色の香炉から立ちのぼり、鈴を鳴らして相手を酔わせる魔人。"},
    {"no": 17, "id": "tq_boss_avatar_of_probability", "name": "確率の化身", "file": "assets/bosses_19/17_tq_boss_avatar_of_probability.webp", "sha256": "1f57fa28e71c41ffdac34ab7aaa185424cf74338d07a341a51aeb85140b2f351", "ref": 1024, "bbox": [151, 122, 758, 777], "visible": [159, 130, 742, 761], "anchor": [530.0, 891.0], "size": "boss", "draw": [181, 186], "lift": 14, "floating": true, "status": "adopted", "concept": "ひとつの出目が決まる瞬間を、分岐した水晶の腕と多面体の核で表した化身。"},
    {"no": 18, "id": "tq_boss_gravitational_balance", "name": "重力の天秤", "file": "assets/bosses_19/18_tq_boss_gravitational_balance.webp", "sha256": "923e1e294024c2aad0ddc6fa4a9263d763f4a6f2a98c36feba9fdac06a8a3877", "ref": 1024, "bbox": [202, 262, 614, 456], "visible": [210, 270, 598, 440], "anchor": [509.0, 710.0], "size": "boss", "draw": [250, 186], "lift": 14, "floating": true, "status": "adopted", "concept": "白色矮星と黒い特異点を左右の皿に載せた、意志を持つ星の天秤。"},
    {"no": 19, "id": "tq_boss_crossroads_devil", "name": "クロスロードの悪魔", "file": "assets/bosses_19/19_tq_boss_crossroads_devil.webp", "sha256": "650df3ce78473e91d153e23db20eec6f706c891e9c301c89557cd9a321596c4a", "ref": 1024, "bbox": [156, 111, 709, 802], "visible": [164, 119, 693, 786], "anchor": [510.5, 905.0], "size": "boss", "draw": [177, 200], "lift": 0, "floating": false, "status": "adopted", "concept": "分かれ道を象った二又の角と、左右で色の異なる契約札を持つ選択の悪魔。"}
  ];

  /* ---------- 新しい特殊行動（効果は既存の仕組みだけ。状態異常は既存の 5 つ） ---------- */
  var NEWSP = {
    b19_mochi_stretch: { name: '伸びる餅', msg: 'は伸びる餅を投げつけた！ 体にからみつく……', power: 0.7, all: true, debuff: { agi: -0.3 }, turns: 3 },
    b19_golden_mallet: { name: '黄金の杵', msg: 'は金の杵を大きく振り下ろした！', power: 1.75 },
    b19_mochi_feast: { name: '餅の宴', msg: 'は大きな餅をほおばった！', heal: 0.1 },
    b19_alarm_bell: { name: '警鐘', msg: 'は胸の警鐘を打ち鳴らした！ 胸がざわつく……', status: { id: 'confuse', chance: 0.3 }, target: 'allies' },
    b19_whisper: { name: '不安のささやき', msg: 'は耳もとで「まだ下がるかもしれない」とささやいた！', debuff: { atk: -0.25 }, turns: 3, target: 'allies' },
    b19_jewel_glint: { name: '目先の輝き', msg: 'は手の中の宝石をきらめかせた！ 目が離せない……', status: { id: 'confuse', chance: 0.35 } },
    b19_snatch: { name: '目先取り', msg: 'は素早く手を伸ばした！', power: 1.0, steal: { rate: 0.03, cap: 60, battleCap: 150 } },
    b19_event_horizon: { name: '事象の地平', msg: 'は黒い核へ光をのみこんだ！ 体が引きずられる……', power: 1.05, all: true, debuff: { agi: -0.25 }, turns: 2 },
    b19_dark_mass: { name: '暗黒質量', msg: 'は見えない重さで押しつぶしてきた！', power: 1.6, drain: true },
    b19_false_mask: { name: '偽りの微笑み', msg: 'は白い仮面をやさしく差し出した……', status: { id: 'confuse', chance: 0.4 } },
    b19_hidden_dagger: { name: '袖の短剣', msg: 'の法衣の陰で、短剣が赤く光った！', power: 1.8 },
    b19_grasping_hands: { name: '欲望の手', msg: 'の青銅の手が、次々と伸びてきた！', power: 0.55, hits: 4 },
    b19_average_down: { name: 'ナンピン', msg: 'は貨幣の鎧をもう一段重ねた！（攻撃力が上がっていく）', buff: { atk: 0.2 }, self: true, stack: 0.6, turns: 9 },
    b19_last_stand: { name: '踏みとどまり', msg: 'は折れかけた槍で踏みとどまった！', buff: { def: 0.4 }, self: true, turns: 3 },
    b19_tablet_fall: { name: '石板落とし', msg: 'のまわりの石板が、頭上から落ちてきた！', power: 1.5 },
    b19_ember_pulse: { name: '残り火の脈動', msg: 'の顔のすき間で、赤い光がまたたいた……', power: 0.85, all: true, status: { id: 'silence', chance: 0.2 } },
    b19_stone_face: { name: '笑わぬ構え', msg: 'は大盾を構えて、じっと動かない……（攻撃すると反撃してくる）', counterStance: 1.3 },
    b19_shield_bash: { name: '大盾の殴打', msg: 'は大盾ごと体当たりしてきた！', power: 1.55, status: { id: 'paralyze', chance: 0.2 } },
    b19_check: { name: '王手', msg: 'は黒い駒を進めた。「王手」……（次に強力な一手が来る）', charge: 'b19_checkmate' },
    b19_checkmate: { name: 'チェックメイト', msg: 'の駒が盤上を貫いた！「詰みだ」', power: 2.2 },
    b19_pawn_storm: { name: '歩兵の行進', msg: 'の黒い歩兵が押し寄せた！', power: 0.5, hits: 4 },
    b19_gambit: { name: '揺さぶりの一手', msg: 'は盤面をひっくり返すような一手を指した！ 頭が混乱する……', status: { id: 'confuse', chance: 0.35 } },
    b19_ideal_mirror: { name: '理想の姿見', msg: 'は割れた姿見をこちらへ向けた！ 映った姿がゆがんで見える……', debuff: { def: -0.25 }, turns: 3, target: 'allies' },
    b19_white_wing: { name: '白磁の羽ばたき', msg: 'は白磁の翼を大きく羽ばたかせた！', power: 0.8, all: true },
    b19_rate_hike: { name: '利上げ', msg: 'の計器の針が右へ振れた！（利上げ）体が重い……', debuff: { agi: -0.3 }, turns: 3, target: 'allies' },
    b19_rate_cut: { name: '利下げ', msg: 'の計器の針が左へ振れた！（利下げ）歯車が軽やかに回る', heal: 0.08 },
    b19_e_seal: { name: '電子封印', msg: 'は電子の封印を押しつけた！', status: { id: 'silence', chance: 0.35 }, target: 'allies' },
    b19_verdict: { name: '執行', msg: 'は執行の宣告とともに斬りつけた！', power: 1.7 },
    b19_amber_memory: { name: '琥珀の追憶', msg: 'の角の琥珀が光った……なつかしい景色が浮かぶ', status: { id: 'sleep', chance: 0.3 }, target: 'allies' },
    b19_antler_charge: { name: '古木の角', msg: 'は古木の角を低く構えて突進してきた！', power: 1.6 },
    b19_appraise: { name: '品定め', msg: 'の仮面がいっせいに、こちらを品定めした！', debuff: { def: -0.2, mdef: -0.2 }, turns: 3, target: 'allies' },
    b19_mirror_thorns: { name: '鏡の棘', msg: 'の翼の鏡の棘が逆立った！（攻撃すると反撃してくる）', counterStance: 1.1 },
    b19_intoxicate: { name: '酔いの鈴', msg: 'は鈴を鳴らした……甘い音に、まぶたが重くなる', status: { id: 'sleep', chance: 0.33 }, target: 'allies' },
    b19_incense: { name: '快楽の香煙', msg: 'の香炉から、極彩色の煙が立ちのぼった！', power: 0.5, all: true, status: { id: 'poison', chance: 0.4 } },
    b19_dice: { name: '出目', msg: 'の多面体が回った……出目が決まる！', power: 1.45 },
    b19_branching: { name: '分岐する腕', msg: 'の水晶の腕が、いくつにも分かれて襲いかかった！', power: 0.55, hits: 3 },
    b19_white_dwarf: { name: '白色矮星', msg: 'の左の皿の白い星が、強く輝いた！', power: 1.0, all: true },
    b19_singularity: { name: '特異点', msg: 'の右の皿の黒い点へ、すべてが落ちていく……', power: 1.5, drain: true },
    b19_tilt: { name: '天秤の傾き', msg: 'の天秤が大きく傾いた！ 足もとが傾く……', debuff: { agi: -0.35 }, turns: 3, target: 'allies' },
    b19_contract: { name: '契約札', msg: 'は二枚の契約札を差し出した。「どちらを選んでも、代償はいただく」', buff: { atk: 0.3, mag: 0.3 }, self: true, turns: 3 },
    b19_two_paths: { name: '分かれ道', msg: 'の二又の角が、二つの道を切り裂いた！', power: 1.3, hits: 2 }
  };
  Object.keys(NEWSP).forEach(function (k) { if (SP[k]) throw new Error('bosses19: 特殊行動が重複 ' + k); SP[k] = NEWSP[k]; });

  /* ---------- ボス 19 体：場所（外の地図・経度・緯度）・地帯の level（z）・型・倍率（シミュレーションで決めた値）・行動・属性・報酬 ---------- */
  //   z：その外の地図の出現地帯の level（Earth78 の climateEnc：いちばん近い地域の地帯）。ボスのレベル＝z＋3
  //   hp/atk/mag：statsFor の値に掛ける倍率。grow：勝ったときにもらう能力の最大値を上げる道具（2 つ）
  var B = [
    { no: 1, id: 'tq_boss_deluxe_mochiko', key: 'mochiko', map: 'w78_28_4', lon: 127.88, lat: 57.30, z: 27, arche: 'tank', hp: 23.8, atk: 2.92, mag: 2.1, mp: 200,
      resist: { fire: 1.3, ice: 0.7, thunder: 1.0 }, family: '魔物系', art: { family: 'slime', c: { base: '#f4d8e0', accent: '#c8a040', eye: '#3a1a2a' } },
      actions: [A('attack', 2), A('special', 'b19_golden_mallet', 2), A('special', 'b19_mochi_stretch', 2), A('special', 'b19_mochi_feast', 1), A('special', 'rage', 1), A('special', 'harden', 1)], grow: 'energy_drink_eternal' },
    { no: 2, id: 'tq_boss_apostle_of_anxiety', key: 'anxiety', map: 'w78_12_0', lon: -35.63, lat: 73.75, z: 7, arche: 'mage', hp: 28.1, atk: 1.36, mag: 1.2, mp: 120,
      resist: { dark: 0.6, light: 1.4 }, family: '不死系', art: { family: 'undead', c: { base: '#8a98b0', accent: '#c8a050', eye: '#e0f0ff' } },
      actions: [A('attack', 2), A('special', 'b19_alarm_bell', 1), A('special', 'b19_whisper', 2), A('skill', 'dark_bolt', 2)], grow: 'elixir_endure' },
    { no: 3, id: 'tq_boss_princess_mesaki', key: 'mesaki', map: 'w78_18_9', lon: 20.38, lat: 31.09, z: 10, arche: 'fast', hp: 25.0, atk: 1.52, mag: 1.2, mp: 120,
      resist: { wind: 0.6, ice: 1.3 }, family: '人型', art: { family: 'knight', c: { base: '#e05a4a', accent: '#2ab0a8', eye: '#ffd24a' } },
      actions: [A('attack', 3), A('special', 'b19_snatch', 2), A('special', 'b19_jewel_glint', 1), A('skill', 'wind_blade', 2), A('special', 'double_attack', 1)], grow: 'elixir_decide' },
    { no: 4, id: 'tq_boss_dark_matter_lifeform_x', key: 'darkmatter', map: 'w78_23_25', lon: 76.13, lat: -74.91, z: 36, arche: 'mage', hp: 54, atk: 1.65, mag: 1.26, mp: 400,
      resist: { dark: 0.3, light: 1.4, fire: 0.8, ice: 0.8 }, family: '魔法生物系', art: { family: 'crystal', c: { base: '#2a1a4a', accent: '#a080ff', eye: '#e0d0ff' } },
      actions: [A('attack', 1), A('special', 'b19_event_horizon', 2), A('special', 'b19_dark_mass', 2), A('skill', 'dark_bolt', 2), A('skill', 'meteor', 1), A('special', 'heal_self', 1, { hpBelow: 0.5 })], grow: 'elixir_crystal' },
    { no: 5, id: 'tq_boss_missionary_of_betrayal', key: 'betrayal', map: 'w78_8_4', lon: -72.38, lat: 54.27, z: 25, arche: 'fast', hp: 47.5, atk: 3.67, mag: 2.45, mp: 200,
      resist: { light: 0.7, dark: 0.7, fire: 1.2 }, family: '人型', art: { family: 'knight', c: { base: '#f0e8d8', accent: '#a02020', eye: '#ff4a4a' } },
      actions: [A('attack', 2), A('special', 'b19_hidden_dagger', 2), A('special', 'b19_false_mask', 1), A('special', 'silence', 1), A('skill', 'dark_bolt', 1), A('special', 'double_attack', 1)], grow: 'elixir_decide' },
    { no: 6, id: 'tq_boss_enduring_human_desire', key: 'desire', map: 'w78_22_7', lon: 61.63, lat: 42.40, z: 22, arche: 'tank', hp: 36.4, atk: 2.47, mag: 1.56, mp: 150,
      resist: { thunder: 1.4, ice: 0.8, fire: 0.8 }, family: '魔法生物系', art: { family: 'golem', c: { base: '#6a8a6a', accent: '#c88a3a', eye: '#ffb04a' } },
      actions: [A('attack', 2), A('special', 'b19_grasping_hands', 2), A('special', 'crush', 1), A('special', 'harden', 1), A('special', 'rage', 1)], grow: 'elixir_resolve' },
    { no: 7, id: 'tq_boss_averaging_prince', key: 'nanpin', map: 'w78_20_6', lon: 51.13, lat: 51.12, z: 12, arche: 'tank', hp: 30.4, atk: 1.6, mag: 1.2, mp: 100,
      resist: { thunder: 1.3, wind: 0.8 }, family: '人型', art: { family: 'knight', c: { base: '#2a3a6a', accent: '#c8a040', eye: '#ffffff' } },
      actions: [A('attack', 3), A('special', 'b19_average_down', 2), A('special', 'b19_last_stand', 1), A('special', 'crush', 1)], grow: 'elixir_endure' },
    { no: 8, id: 'tq_boss_former_sauron_consciousness', key: 'remnant', map: 'w78_24_4', lon: 91.13, lat: 54.09, z: 25, arche: 'mage', hp: 78.0, atk: 1.6, mag: 1.4, mp: 300,
      resist: { dark: 0.4, fire: 0.6, light: 1.4, thunder: 1.2 }, family: '霊体', art: { family: 'spirit', c: { base: '#c8c8c8', accent: '#c83a2a', eye: '#ff6a3a' } },
      actions: [A('attack', 1), A('special', 'b19_ember_pulse', 2), A('special', 'b19_tablet_fall', 2), A('skill', 'firestorm', 1), A('skill', 'dark_bolt', 1), A('special', 'silence', 1)], grow: 'elixir_crystal' },
    { no: 9, id: 'tq_boss_unsmiling_greatshield', key: 'shield', map: 'w78_4_4', lon: -108.63, lat: 54.09, z: 25, arche: 'tank', hp: 28.7, atk: 3.24, mag: 1.75, mp: 100,
      resist: { thunder: 1.5, fire: 0.7, ice: 0.7, wind: 0.7 }, family: '魔法生物系', art: { family: 'golem', c: { base: '#4a6a4a', accent: '#c8a040', eye: '#e0e0c0' } },
      actions: [A('attack', 2), A('special', 'b19_stone_face', 2), A('special', 'b19_shield_bash', 2), A('special', 'harden', 1)], grow: 'elixir_endure' },
    { no: 10, id: 'tq_boss_game_master', key: 'gamemaster', map: 'w78_8_10', lon: -68.13, lat: 5.86, z: 26, arche: 'mage', hp: 51.5, atk: 3.6, mag: 2.8, mp: 300,
      resist: { dark: 0.6, light: 1.3 }, family: '人型', art: { family: 'mirror', c: { base: '#3a2a5a', accent: '#f0f0f0', eye: '#c080ff' } },
      actions: [A('attack', 1), A('special', 'b19_check', 1), A('special', 'b19_pawn_storm', 2), A('skill', 'dark_bolt', 1), A('special', 'b19_gambit', 1)], grow: 'elixir_crystal' },
    { no: 11, id: 'tq_boss_fallen_angel_manjaro', key: 'manjaro', map: 'w78_11_15', lon: -54.13, lat: -21.32, z: 23, arche: 'mage', hp: 39.0, atk: 2.21, mag: 1.82, mp: 250,
      resist: { light: 0.4, wind: 0.6, dark: 1.4 }, family: '天使', art: { family: 'bird', c: { base: '#f4ece0', accent: '#e8c070', eye: '#c08060' } },
      actions: [A('attack', 1), A('special', 'b19_ideal_mirror', 1), A('special', 'b19_white_wing', 2), A('skill', 'holy_light', 2), A('special', 'heal_self', 1, { hpBelow: 0.5 })], grow: 'magic_tequila' },
    { no: 12, id: 'tq_boss_rate_warden_fomsy', key: 'fomsy', map: 'w78_4_8', lon: -104.63, lat: 32.89, z: 26, arche: 'tank', hp: 31, atk: 3.15, mag: 2.2, mp: 200,
      resist: { thunder: 1.4, fire: 0.8, ice: 1.1 }, family: '機械系', art: { family: 'machine', c: { base: '#c8a040', accent: '#2a6a4a', eye: '#ff4a4a' } },
      actions: [A('attack', 2), A('special', 'b19_rate_hike', 2), A('special', 'b19_rate_cut', 1), A('skill', 'thunder', 2), A('special', 'crush', 1)], grow: 'elixir_decide' },
    { no: 13, id: 'tq_boss_justice_guardian_cybern', key: 'cybern', map: 'w78_26_9', lon: 101.38, lat: 26.25, z: 29, arche: 'tank', hp: 34, atk: 2.5, mag: 1.8, mp: 250,
      resist: { thunder: 0.5, light: 0.6, dark: 1.3, ice: 1.2 }, family: '機械系', art: { family: 'machine', c: { base: '#e8ecf4', accent: '#3a4aa0', eye: '#4ad8ff' } },
      actions: [A('attack', 2), A('special', 'b19_verdict', 2), A('special', 'b19_e_seal', 1), A('skill', 'thunder', 2), A('special', 'harden', 1)], grow: 'elixir_resolve' },
    { no: 14, id: 'tq_boss_ubud_of_remembrance', key: 'ubud', map: 'w78_11_11', lon: -54.38, lat: -0.64, z: 18, arche: 'tank', hp: 36, atk: 2.34, mag: 1.69, mp: 150,
      resist: { wind: 0.6, thunder: 0.8, fire: 1.4 }, family: '獣系', art: { family: 'ram', c: { base: '#6a8a3a', accent: '#e8a030', eye: '#ffd24a' } },
      actions: [A('attack', 2), A('special', 'b19_antler_charge', 2), A('special', 'b19_amber_memory', 1), A('skill', 'wind_blade', 1)], grow: 'energy_drink_eternal' },
    { no: 15, id: 'tq_boss_fallen_angel_lookism', key: 'lookism', map: 'w78_19_12', lon: 32.88, lat: 0.86, z: 22, arche: 'mage', hp: 51.5, atk: 3.5, mag: 2.8, mp: 250,
      resist: { dark: 0.4, light: 1.4, wind: 0.8 }, family: '天使', art: { family: 'mirror', c: { base: '#3a3048', accent: '#a0a0b8', eye: '#c040ff' } },
      actions: [A('attack', 1), A('special', 'b19_appraise', 1), A('special', 'b19_mirror_thorns', 1), A('skill', 'dark_bolt', 2), A('special', 'silence', 1)], grow: 'elixir_endure' },
    { no: 16, id: 'tq_boss_pleasure_djinn_velo', key: 'velo', map: 'w78_15_12', lon: 2.63, lat: 11.32, z: 24, arche: 'mage', hp: 57.4, atk: 2.01, mag: 1.61, mp: 250,
      resist: { fire: 0.5, wind: 0.7, ice: 1.4 }, family: '魔人', art: { family: 'spirit', c: { base: '#8a4ac8', accent: '#f0b040', eye: '#ff8ae0' } },
      actions: [A('attack', 1), A('special', 'b19_intoxicate', 1), A('special', 'b19_incense', 2), A('skill', 'firestorm', 2), A('special', 'drain', 1)], grow: 'magic_tequila' },
    { no: 17, id: 'tq_boss_avatar_of_probability', key: 'probability', map: 'w78_30_15', lon: 135.88, lat: -24.17, z: 24, arche: 'fast', hp: 47.5, atk: 3.9, mag: 2.8, mp: 200,
      resist: { thunder: 0.7, ice: 0.7, fire: 1.2 }, family: '魔法生物系', art: { family: 'crystal', c: { base: '#e8ecf0', accent: '#2a8a4a', eye: '#ffd24a' } },
      actions: [A('attack', 2), A('special', 'b19_dice', 2), A('special', 'b19_branching', 2), A('skill', 'blizzard', 1)], grow: 'elixir_resolve' },
    { no: 18, id: 'tq_boss_gravitational_balance', key: 'balance', map: 'w78_26_27', lon: 111.13, lat: -78.39, z: 34, arche: 'mage', hp: 66.6, atk: 1.71, mag: 1.3, mp: 400,
      resist: { dark: 0.6, light: 0.6, fire: 1.0, thunder: 1.3 }, family: '魔法生物系', art: { family: 'bell', c: { base: '#c8a040', accent: '#6a3aa0', eye: '#ffffff' } },
      actions: [A('attack', 1), A('special', 'b19_white_dwarf', 2), A('special', 'b19_singularity', 2), A('special', 'b19_tilt', 1), A('skill', 'meteor', 1)], grow: 'energy_drink_eternal' },
    { no: 19, id: 'tq_boss_crossroads_devil', key: 'crossroads', map: 'w78_12_12', lon: -44.13, lat: -8.12, z: 22, arche: 'fast', hp: 73.5, atk: 2.6, mag: 1.82, mp: 200,
      resist: { fire: 0.6, dark: 0.6, light: 1.4, ice: 1.2 }, family: '悪魔系', art: { family: 'fox', c: { base: '#a02a2a', accent: '#1a1a1a', eye: '#ffd24a' } },
      actions: [A('attack', 2), A('special', 'b19_contract', 1), A('special', 'b19_two_paths', 2), A('skill', 'firestorm', 1), A('skill', 'dark_bolt', 1)], grow: 'elixir_resolve' }
  ];
  var ARTBY = {}; ART.forEach(function (r) { ARTBY[r.id] = r; });
  var ADDED = [];
  B.forEach(function (b) {
    if (EN[b.id]) throw new Error('bosses19: 敵の ID が重複しています ' + b.id);
    var r = ARTBY[b.id]; if (!r) throw new Error('bosses19: 画像の表にない ' + b.id);
    var lv = b.z + 3; var s = statsFor(lv, b.arche);
    var o = { id: b.id, name: r.name, lv: lv, boss: true, b19: true, hp: Math.round(s.hp * b.hp), atk: Math.round(s.atk * b.atk), def: s.def, agi: s.agi, mag: Math.round(Math.max(s.mag, lv * 1.2) * b.mag), mp: b.mp,
      exp: Math.round(s.exp * 3), gold: lv * 60, resist: b.resist || {}, drops: [], actions: b.actions, family: b.family, art: b.art, area: '異界の門', region: 'reachable', desc: r.concept || '' };
    o.weak = Object.keys(o.resist).filter(function (k) { return o.resist[k] > 1; });
    b.lv = lv; EN[b.id] = o; ADDED.push(b.id);
  });

  /* ---------- 報酬の装備（そのボスだけ）：性能は「その場所に行けるころの店の段階（tier）の 1 つ上」の同じ種類の装備と同じくらい＋そのボスらしい特殊効果 ---------- */
  function add(id, o) { if (ITEMS[id]) throw new Error('bosses19: アイテムの ID が重複しています ' + id); ITEMS[id] = Object.assign({ id: id, price: 0, noShop: true, rare: 'legend', b19: true }, o); if (root.ITEM_LIST && root.ITEM_LIST.indexOf(id) < 0) root.ITEM_LIST.push(id); }
  function W(id, name, type, atk, extra) { add(id, Object.assign({ name: name, cat: 'weapon', type: type, atk: atk }, extra || {})); }
  function Ar(id, name, type, def, extra) { add(id, Object.assign({ name: name, cat: 'armor', type: type, def: def }, extra || {})); }
  var REWARD = {
    mochiko: 'b19_golden_kine', anxiety: 'b19_silent_bell', mesaki: 'b19_present_jewel_blade', darkmatter: 'b19_dark_matter_veil', betrayal: 'b19_two_faced_dagger', desire: 'b19_bronze_desire_mail',
    nanpin: 'b19_hold_fast_lance', remnant: 'b19_ember_tablet_staff', shield: 'b19_unsmiling_aegis', gamemaster: 'b19_check_piece', manjaro: 'b19_porcelain_robe', fomsy: 'b19_rate_gauge_helm',
    cybern: 'b19_seal_justice_sword', ubud: 'b19_amber_memory_bow', lookism: 'b19_bare_face_cloak', velo: 'b19_sober_claw', probability: 'b19_expected_value_axe', balance: 'b19_balance_star', crossroads: 'b19_crossroads_blade'
  };
  W('b19_golden_kine', '黄金の餅つき杵', 'club', 48, { hp: 20, fx: { multiHit: { n: 2, mult: 0.62 } }, desc: 'デラックス・モチコの金の杵。最大HP+20。通常攻撃が2回ヒット（各0.62倍）。ぺったん、ぺったん' });
  Ar('b19_silent_bell', '静寂の鈴', 'acc', 6, { mdef: 6, fx: { statusResist: 0.3 }, desc: '鳴らない鈴。不安の伝道師の警鐘のかけら。防御+6・魔法防御+6。状態異常にかかりにくい（30%）' });
  W('b19_present_jewel_blade', '今を見る宝刃', 'dagger', 27, { agi: 3, fx: { critUp: 0.08, goldUp: 0.15 }, desc: '欲姫のメサキが手を伸ばした宝石をはめこんだ短剣。素早さ+3。会心率+8%・戦闘で得るゴールド+15%' });
  Ar('b19_dark_matter_veil', '暗黒物質の衣', 'robe', 37, { mdef: 14, mag: 10, fx: { resistAll: 0.9, spellMult: 1.08 }, desc: 'ダークマター生命体Xの殻を織った衣。魔法防御+14・魔力+10。すべての属性のダメージ-10%・呪文の威力+8%' });
  W('b19_two_faced_dagger', '表裏の短剣', 'dagger', 45, { agi: 5, fx: { pierce: 0.25, onHitStatus: { id: 'silence', chance: 0.2 } }, desc: '裏切りの宣教師の袖にあった短剣。素早さ+5。敵の防御を25%無視し、当たると20%で沈黙' });
  Ar('b19_bronze_desire_mail', '青銅の欲望鎧', 'heavy', 41, { hp: 30, fx: { rampDef: { per: 0.05, max: 0.25 } }, desc: '変わらぬ人の欲望の青銅の手を打ち直した鎧。最大HP+30。ターンが進むほど守備が上がる（1ターン5%・最大25%）' });
  W('b19_hold_fast_lance', '踏みとどまる皇子の槍', 'spear', 33, { def: 3, fx: { guts: 0.35 }, desc: 'ナンピン皇子が折らずに持ちこたえた槍。防御+3。倒れるダメージを35%の確率でHP1で踏みとどまる' });
  W('b19_ember_tablet_staff', '残り火の石板杖', 'staff', 22, { mag: 14, mp: 30, fx: { spellMult: 1.12, mpRegen: 0.03 }, desc: '砕けた石板と残り火を封じた杖。魔力+14・最大MP+30。呪文の威力+12%・毎ターン最大MPの3%回復' });
  Ar('b19_unsmiling_aegis', '笑わぬ大盾', 'shield', 26, { mdef: 6, fx: { bigHitCut: { over: 0.25, cut: 0.35 }, counterChance: 0.12 }, desc: '無表情の石面が彫られた大盾。魔法防御+6。最大HPの25%を超える一撃を35%軽減・攻撃を受けると12%で反撃' });
  Ar('b19_check_piece', '王手の駒', 'acc', 4, { agi: 6, fx: { critUp: 0.1, firstStrike: 0.3 }, desc: 'ゲームマスターの黒い駒。素早さ+6。会心率+10%・戦闘のはじめに30%で先手を取る' });
  Ar('b19_porcelain_robe', '白磁の羽衣', 'robe', 32, { mdef: 10, mag: 6, fx: { healMult: 1.2, evade: 0.05 }, desc: '美の堕天使マンジャロの白磁の羽で織った衣。魔法防御+10・魔力+6。回復呪文の効果+20%・回避+5%' });
  Ar('b19_rate_gauge_helm', '金利計の兜', 'helm', 18, { mdef: 6, fx: { steady: true, afterDefend: 0.3 }, desc: '金利の番人フォムシーの計器を組みこんだ兜。魔法防御+6。ダメージの下振れがなくなり、防御した次のターンの通常攻撃+30%' });
  W('b19_seal_justice_sword', '電子封印の正義剣', 'sword', 62, { element: 'light', fx: { bonusElem: { element: 'light', mult: 0.2 }, onHitStatus: { id: 'paralyze', chance: 0.12 } }, desc: '正義の番人サイバーンの封印の剣。光属性。通常攻撃のあと光の追加ダメージ（20%）・当たると12%で麻痺' });
  W('b19_amber_memory_bow', '琥珀の追憶弓', 'bow', 37, { agi: 3, fx: { critUp: 0.05, onHitStatus: { id: 'sleep', chance: 0.15 } }, desc: '追憶の森のウブドの角でつくった弓。素早さ+3。会心率+5%・当たると15%で眠り' });
  Ar('b19_bare_face_cloak', '素顔の外套', 'light', 35, { agi: 4, fx: { statusResist: 0.3, evade: 0.06 }, desc: '醜悪の堕天使ルッキズムの仮面を外した外套。素早さ+4。状態異常にかかりにくい（30%）・回避+6%' });
  W('b19_sober_claw', '酔わずの鉤爪', 'claw', 47, { agi: 4, fx: { onHitStatus: { id: 'sleep', chance: 0.15 }, statusResist: 0.15 }, desc: '快楽の魔人ヴェロの香炉の金具を削った鉤爪。素早さ+4。当たると15%で眠り・状態異常にかかりにくい（15%）' });
  W('b19_expected_value_axe', '期待値の斧', 'axe', 52, { fx: { critUp: 0.12, momentum: 0.2 }, desc: '確率の化身の水晶の腕を刃にした斧。会心率+12%・前のターンにも攻撃していれば威力+20%' });
  Ar('b19_balance_star', '星の天秤章', 'acc', 6, { hp: 50, mdef: 8, fx: { resistAll: 0.9, guts: 0.25 }, desc: '重力の天秤の皿の縁から作った記章。最大HP+50・魔法防御+8。すべての属性のダメージ-10%・倒れるダメージを25%でHP1で踏みとどまる' });
  W('b19_crossroads_blade', '分かれ道の魔剣', 'sword', 51, { element: 'dark', fx: { reversal: 0.5 }, desc: 'クロスロードの悪魔の契約札を刃に溶かした魔剣。闇属性。HPが減った敵ほど威力が上がる（最大+50%）' });
  Ar('b19_all_seal', '十九の契約印', 'acc', 8, { hp: 60, mp: 30, atk: 6, mag: 6, agi: 6, mdef: 8, fx: { critUp: 0.05, guts: 0.2, statusResist: 0.2 }, desc: '異界の門のボス 19 体すべてに勝った証。最大HP+60・最大MP+30・攻撃+6・魔力+6・素早さ+6・魔法防御+8・防御+8。会心率+5%・くいしばり20%・状態異常にかかりにくい（20%）' });

  root.BOSS19 = { version: 1, pack: 'trade_quest_bosses_19', list: ART, bosses: B, added: ADDED, reward: REWARD, allReward: 'b19_all_seal', specials: Object.keys(NEWSP) };
})(typeof window !== 'undefined' ? window : globalThis);
