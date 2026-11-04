/* =========================================================
   Data / v7.5 追加の通常敵35体（素材：trade_quest_additional_enemies_35_20261104 の manifest.json）
   ・名前（name_ja）・画像・提案ID（tq_add_*）はパックの manifest.json が正本。001〜035 はパックの中の番号（ゲームの通し番号・配列の位置ではない）
   ・そのうち10体は、ゲームにもとからいる敵と同じ人物（以前の名前が同じ・同じ考え方の敵）なので、新しいIDは作らず既存のIDを使う：
       陽線スライム yosen_slime／陰線スライム insen_slime／逆張りバット contrarian_bat／損切りゾンビ stoploss_zombie／ナンピンゴブリン nanpin_goblin／
       シンプル教の信徒 simple_cultist／フルレバオーガ fullleva_ogre／コツコツドカンナイト kotsukotsu_knight／ポジポジファントム pojipoji_phantom／インジ依存メイジ indicator_mage
     この10体は、能力・出現・報酬・物語での使われ方を変えない。表示名と戦闘・図鑑の画像だけをこのパックのものにする（v7.2 の新しい名前・画像 js/data/enemy-redesign.js より優先）。
     外見に合わせた個性として、4体には行動を「足した」（もとの行動は消していない）：
       フルレバオーガ＝一撃のあとに隙／コツコツドカンナイト＝「ドカン」の前に予告（溜め）／ナンピンゴブリン＝攻撃力の重ねがけ／逆張りバット＝通常攻撃への反撃の構え
   ・残りの25体は新しい通常敵（ID は tq_add_*）。強さは既存の敵と同じ式（enemies.js の statsFor：レベル＋型）。レベルは出す地帯の level に合わせた。
     ランダムの戦闘では、ほかの通常敵と同じく地帯の倍率（js/data/enemy-scale67.js）がかかる
   ・出現表：既存のグループは消さない。新しい敵のグループを足すだけ（ADD の表。隠し区画など同じ出現表を共有するマップにも出る）
   ・新しい特殊行動（ENEMY_SPECIALS）は、効果・対象・成功率・続くターン・解除の方法をコメントに書いた。状態異常は既存の5つ（毒・眠り・麻痺・混乱・沈黙）だけを使う
     （魅了・呪いの新しい状態異常は作らない。混乱は3ターン・沈黙は4ターンで治り、かかっている間は重ねてかからない＝行動できない状態が続かない）
   ・お金を奪う敵（強盗・裏金官僚・闇金取り立て屋・侵略宇宙商人・貪欲の盲者）：奪うのは所持金だけ。1回の上限・1回の戦闘の上限あり。
     その戦闘で倒せば全部取り返せる。その敵が逃げた・味方が逃げた・全滅したときは戻らない（処理は js/rpg/combat.js の stealGold）
   ・人間・組織・宇宙人はゲームの中の架空の存在（現実の人物・宗教・民族・団体の設定は書かない）
   ・画像の表（ART）：自動生成 docs/tools/v75/build_add35.py（パックの visible_bbox・ground_anchor から、切り出す範囲・足もと・表示の大きさを出した）
   ========================================================= */
(function (root) {
  'use strict';
  var EN = root.ENEMIES, SP = root.ENEMY_SPECIALS, MAPS = root.MAP_DEFS;
  if (!EN || !SP) return;
  function statsFor(lv, arche) {   // enemies.js・monsters65.js と同じ式
    var s = { hp: Math.round(18 + lv * 9.5), atk: Math.round(5 + lv * 2.2), def: Math.round(2 + lv * 1.3), agi: Math.round(3 + lv * 0.9), mag: Math.round(lv * 0.8), exp: Math.round(3 + lv * lv * 0.9), gold: Math.round(3 + lv * 1.7) };
    if (arche === 'tank') { s.hp = Math.round(s.hp * 1.5); s.def = Math.round(s.def * 1.8); s.agi = Math.round(s.agi * 0.6); s.exp = Math.round(s.exp * 1.3); }
    if (arche === 'fast') { s.hp = Math.round(s.hp * 0.75); s.agi = Math.round(s.agi * 1.9); s.atk = Math.round(s.atk * 0.9); }
    if (arche === 'mage') { s.hp = Math.round(s.hp * 0.85); s.mag = Math.round(lv * 2.2 + 4); s.mp = 20 + lv * 3; s.exp = Math.round(s.exp * 1.2); }
    if (arche === 'glass') { s.hp = Math.round(s.hp * 0.6); s.atk = Math.round(s.atk * 1.5); }
    return s;
  }
  var A = function (type, idOrW, w) { return type === 'attack' ? { type: 'attack', w: idOrW } : { type: type, id: idOrW, w: w }; };
  var ADDED = [];
  function M(id, o) {
    if (EN[id]) throw new Error('enemies-add35: ID が重複しています ' + id);
    var s = statsFor(o.lv, o.arche); Object.keys(s).forEach(function (k) { if (o[k] === undefined) o[k] = s[k]; });
    if (o.hpMult) o.hp = Math.round(o.hp * o.hpMult); if (o.atkMult) o.atk = Math.round(o.atk * o.atkMult); if (o.goldMult) o.gold = Math.round(o.gold * o.goldMult);
    o.id = id; o.mp = o.mp || 0; o.mag = o.mag || 0; o.resist = o.resist || {}; o.drops = o.drops || []; o.actions = o.actions || [A('attack', 1)]; o.region = 'reachable'; o.v75 = true;
    o.weak = Object.keys(o.resist).filter(function (k) { return o.resist[k] > 1; });
    EN[id] = o; ADDED.push(id);
  }

  /* ---------- 新しい特殊行動（処理は js/rpg/combat.js の execEnemy。データの項目：power 威力・hits 回数・all 全員・status 状態異常（chance 成功率）・
       debuff 味方の能力を下げる（turns ターン。−50%まで・時間で戻る）・buff＋self 自分を強化・stack 重ねがけの上限・heal 回復・drain 吸収・
       call＋summon 仲間を呼ぶ・steal お金を奪う・charge 溜め（次の行動でその技）・counterStance 反撃の構え（威力）・selfAfter 攻撃のあとの自分の隙）
       状態異常の成功率は、味方の耐性（装備・職業）で下がる。解除：毒＝毒消し草・解毒／眠り＝目覚ましの鈴・攻撃を受ける／麻痺＝清めの水・筋肉ほぐしの薬／
       混乱＝清めの水・神経安定の香／沈黙＝万能解毒薬・調和など。どれも数ターンで自然に治る ---------- */
  var NEWSP = {
    // 飽性の小悪魔：おもちゃを投げる（1人・威力0.8・当たると素早さ−20% 3ターン）／あくび（何もしない＝隙）
    toy_toss: { name: '飽きたおもちゃ', msg: 'は飽きたおもちゃを投げつけた！', power: 0.8, debuff: { agi: -0.2 }, turns: 3 },
    bored_yawn: { name: 'あくび', msg: 'はあくびをして、そっぽを向いた。（何もしない）', idle: true },
    // ワカメ頭：巻きつく（1人・威力0.7・麻痺30%）
    kelp_bind: { name: 'ワカメ巻き', msg: 'はぬるぬるのワカメを巻きつけた！', power: 0.7, status: { id: 'paralyze', chance: 0.3 } },
    // サイバーヒューマン：プラズマの刃（1人・威力1.3）／回路の加速（自分の素早さ+50% 2ターン）
    cyber_blade: { name: 'プラズマの刃', msg: 'は腕のプラズマの刃で斬りつけた！', power: 1.3 },
    overclock: { name: '回路の加速', msg: 'の回路が光り、動きが速くなった！', buff: { agi: 0.5 }, turns: 2, self: true },
    // 悪徳議員：封筒（1人・混乱30%）／長い演説（味方全員の素早さ−25% 3ターン）
    bribe_envelope: { name: '分厚い封筒', msg: 'は分厚い封筒をちらつかせた！「悪いようにはしないよ」', status: { id: 'confuse', chance: 0.3 }, target: 'ally' },
    filibuster: { name: '長い演説', msg: 'は長々と演説を始めた！ 聞いているだけで動きが鈍る……', debuff: { agi: -0.25 }, turns: 3, target: 'allies' },
    // 裏金官僚：帳簿の書き換え（1人・威力0.8・当たると所持金の3%・1回50Gまで・1戦闘100Gまでを奪う）／隠蔽（自分の守備・魔法防御+40% 3ターン）
    slush_skim: { name: '帳簿の書き換え', msg: 'は帳簿の数字をこっそり書き換えた！', power: 0.8, steal: { rate: 0.03, cap: 50, battleCap: 100 } },
    cover_up: { name: '隠蔽', msg: 'は「記録は残っておりません」と言い張った！ 守りが固くなった', buff: { def: 0.4, mdef: 0.4 }, turns: 3, self: true },
    // 汚職市長：小槌（1人・威力1.3）／手下を呼ぶ（徴収犬。HP60%以下のとき）
    gavel_smash: { name: '宝石の小槌', msg: 'は宝石つきの小槌で殴りつけた！', power: 1.3 },
    mayor_call: { name: '手下を呼ぶ', msg: 'は「おい、取り立てに行け！」と手下を呼んだ！', call: true },
    // 洗脳メディア司会者：催眠の電波（全員・混乱25%）／煽り文句（全員・威力0.6）
    hypno_broadcast: { name: '催眠の電波', msg: 'は催眠の電波を流した！「みなさん、信じるだけでいいんです」', status: { id: 'confuse', chance: 0.25 }, target: 'allies' },
    hype_spin: { name: '煽り文句', msg: 'は根拠のない煽り文句を浴びせた！', power: 0.6, all: true },
    // 強盗：すり取り（1人・威力0.9・当たると所持金の5%・1回30Gまで・1戦闘60Gまでを奪う）。奪ったあとは逃げることがある（flee＋ifStolen）
    pickpocket: { name: 'すり取り', msg: 'は素早く懐に手を伸ばした！', power: 0.9, steal: { rate: 0.05, cap: 30, battleCap: 60 } },
    // 闇金取り立て屋：取り立て（1人・威力1.0・所持金の4%・1回120Gまで・1戦闘200Gまで）／脅し（1人・攻撃力−20% 3ターン）
    debt_squeeze: { name: '取り立て', msg: 'は「利息の分、払ってもらおうか」と取り立てた！', power: 1.0, steal: { rate: 0.04, cap: 120, battleCap: 200 } },
    ledger_threat: { name: '黒い帳簿', msg: 'は黒い帳簿を突きつけて脅した！', debuff: { atk: -0.2 }, turns: 3, target: 'ally' },
    // ギャランティック星人：星の光（全員・威力0.6）
    star_crest: { name: '星の冠', msg: 'は三日月の冠から、星の光を降らせた！', power: 0.6, all: true },
    // 洗脳グレイ：命令の信号（1人・混乱35%）／命令待ち（何もしない＝隙）
    mind_signal: { name: '命令の信号', msg: 'の頭の装置が光り、命令の信号を送ってきた！', status: { id: 'confuse', chance: 0.35 }, target: 'ally' },
    puppet_stiff: { name: '命令待ち', msg: 'は命令を待って固まっている……（何もしない）', idle: true },
    // レプタイプヒューマン：冷たい目（1人・素早さ−30% 3ターン）。かみつきは既存の毒の牙（toxic_bite）
    cold_stare: { name: '冷たい目', msg: 'は細い瞳で冷たくにらみつけた！ 体がすくむ……', debuff: { agi: -0.3 }, turns: 3, target: 'ally' },
    // 侵略宇宙商人：押し売り（1人・威力0.8・所持金の2%・1回200Gまで・1戦闘300Gまで）／星の玉（全員・威力0.55）
    hard_sell: { name: '押し売り', msg: 'は「この星の品、まとめて買い取りましょう」と押し売りしてきた！', power: 0.8, steal: { rate: 0.02, cap: 200, battleCap: 300 } },
    planet_orb: { name: '檻の中の星', msg: 'は檻に入った星の玉をかざした！ 重い光が降りそそぐ', power: 0.55, all: true },
    // 失念の戦国侍：抜き忘れ（何もしない＝隙）／思い出した居合い（1人・威力1.7）
    forget_draw: { name: '抜き忘れ', msg: 'は刀を抜こうとして……抜くのを忘れた！（何もしない）', idle: true },
    iai_recall: { name: '思い出し居合い', msg: 'は思い出したように居合い斬りを放った！', power: 1.7 },
    // 地球1992からの侵略者：レトロな光線銃（1人・威力0.9・麻痺25%）。時の重り（time_weight）は既存
    retro_ray: { name: 'レトロ光線銃', msg: 'はレトロな光線銃を撃った！ ビビビッ', power: 0.9, status: { id: 'paralyze', chance: 0.25 } },
    // 学びを辞めた者：聞く耳なし（自分の守備・魔法防御+50% 3ターン）／知ったかぶり（1人・沈黙35%）
    closed_mind: { name: '聞く耳なし', msg: 'は「もう学ぶことはない」と腕を組んだ！ 守りが固くなった', buff: { def: 0.5, mdef: 0.5 }, turns: 3, self: true },
    know_it_all: { name: '知ったかぶり', msg: 'は「そんなの知ってる」と話をさえぎった！', status: { id: 'silence', chance: 0.35 }, target: 'ally' },
    // 感謝を忘れた亡霊：もっとよこせ（1人・威力0.9・与えたダメージの半分を吸収）／冷たい視線（全員・攻撃力−20% 3ターン）
    ingrate_drain: { name: 'もっとよこせ', msg: 'は「もっとよこせ」と手を伸ばし、力を奪った！', power: 0.9, drain: true },
    cold_shoulder: { name: '冷たい視線', msg: 'は冷たい視線を向けた！ 力が抜けていく……', debuff: { atk: -0.2 }, turns: 3, target: 'allies' },
    // 大喰らいのアリエンティ：鍋の残り（自分のHPを20%回復。HP70%以下のとき）。丸のみは既存（devour）
    snack: { name: '鍋の残り', msg: 'は鍋の残りを平らげた！', heal: 0.2 },
    // 人口調整用ドローン：なぎ払う光（全員・威力0.6）／標的の固定（自分の攻撃力+30% 2ターン）
    cull_beam: { name: 'なぎ払う光', msg: 'は下向きの発射口から、なぎ払う光を放った！', power: 0.6, all: true },
    target_lock: { name: '標的の固定', msg: 'の赤い目が標的を固定した！ 攻撃力が上がった', buff: { atk: 0.3 }, turns: 2, self: true },
    // 裏切りトロール：にこやかな握手（溜め。次の行動で必ず「裏切りの一撃」。1人・威力1.9）
    false_handshake: { name: 'にこやかな握手', msg: 'はにこやかに手を差し出してきた……？（背中に棍棒が見える）', charge: 'betrayal_club' },
    betrayal_club: { name: '裏切りの一撃', msg: 'は背中に隠した棍棒で殴りかかってきた！（裏切りの一撃）', power: 1.9 },
    // 肉欲の愚者：見せびらかし（1人・混乱30%。魅了の代わりに既存の混乱を使う）／ポーズ（何もしない＝隙）
    desire_gaze: { name: '見せびらかし', msg: 'はハートの宝石をかざして見せびらかした！ 目が離せない……', status: { id: 'confuse', chance: 0.3 }, target: 'ally' },
    vain_pose: { name: '自分に見とれる', msg: 'は自分の姿に見とれて、ポーズを決めている……（何もしない）', idle: true },
    // 貪欲の盲者：わしづかみ（1人・威力0.9・所持金の3%・1回250Gまで・1戦闘400Gまで）／抱え込み（自分の守備+50% 3ターン）
    greed_grab: { name: 'わしづかみ', msg: 'は金貨の杖で殴り、財布をつかみ取ろうとした！', power: 0.9, steal: { rate: 0.03, cap: 250, battleCap: 400 } },
    hoard_guard: { name: '抱え込み', msg: 'は財宝の袋を抱え込んだ！ 守りが固くなった', buff: { def: 0.5 }, turns: 3, self: true },
    // 祟られ人：黒い縄（1人・威力0.8・守備−20% 3ターン。呪いの代わりに能力の低下）／紫の炎（全員・威力0.6）
    curse_cords: { name: '黒い縄', msg: 'の体から黒い縄が伸び、からみついた！', power: 0.8, debuff: { def: -0.2 }, turns: 3 },
    tatari_flame: { name: '紫の炎', msg: 'のまわりで紫の炎が広がった！', power: 0.6, all: true },
    // キーボードクラッシャーズ：連打（1人・威力0.5×3回）／ケーブルのむち（1人・威力0.8・麻痺20%）
    key_smash: { name: 'キーボード連打', msg: 'はキーボードを振り回して連打した！', power: 0.5, hits: 3 },
    cable_whip: { name: 'ケーブルのむち', msg: 'はケーブルをむちのように振るった！', power: 0.8, status: { id: 'paralyze', chance: 0.2 } },
    // 人間監視用AIドローン：スキャン（全員・素早さ−25% 3ターン）／警報（HP70%以下のとき、同じ地帯の巡視ドローン patrol_drone を呼ぶ）
    scan_mark: { name: '監視スキャン', msg: 'は青い光で全員をスキャンした！ 動きを読まれている……', debuff: { agi: -0.25 }, turns: 3, target: 'allies' },
    alert_call: { name: '警報', msg: 'は警報を鳴らして、応援を呼んだ！', call: true },
    // ---- 既存の敵に足す個性 ----
    // ナンピンゴブリン：買い増し（自分の攻撃力+15%。重ねがけで+45%まで。4ターン）
    nanpin_stack: { name: '買い増し', msg: 'は「平均単価を下げるぞ」と買い増しした！', buff: { atk: 0.15 }, stack: 0.45, turns: 4, self: true },
    // コツコツドカンナイト：ドカンの予告（溜め。次の行動で必ず既存の「ドカン」（1人・威力2.2）。防御で軽くできる）
    dokan_charge: { name: 'ドカンの構え', msg: 'はコインの盾を構え、力を溜めはじめた……！（次の行動で「ドカン」が来る）', charge: 'dokan' },
    // 逆張りバット：逆張りの構え（次の自分の行動まで、通常攻撃で殴られたら1回だけ反撃。威力0.9。呪文・特技では反撃しない）
    contrarian_stance: { name: '逆張りの構え', msg: 'は翼を逆向きにたたんで構えた！（通常攻撃をすると反撃してくる）', counterStance: 0.9 }
  };
  Object.keys(NEWSP).forEach(function (k) { if (SP[k]) throw new Error('enemies-add35: 特殊行動が重複 ' + k); SP[k] = NEWSP[k]; });
  // フルレバオーガ：既存の「フルレバ一撃」（威力1.8）はそのまま。撃ったあと2ターン、自分の守備−40%・素早さ−30%（隙）
  if (SP.full_leverage) { SP.full_leverage.selfAfter = { def: -0.4, agi: -0.3 }; SP.full_leverage.selfTurns = 2; SP.full_leverage.afterMsg = 'は大振りのあと、体勢を崩した！（守りと素早さが下がっている）'; }

  /* ---------- 25体の新しい通常敵（レベルは出す地帯の level。area は図鑑に出す出現場所） ---------- */
  // ---- アルカディア（序盤）
  M('tq_add_boredom_imp', { name: '飽性の小悪魔', lv: 5, art: { family: 'demon', size: 'small', c: { base: '#8a4a9a', accent: '#c9a24a', eye: '#ffd24a' } }, family: '悪魔系', area: '忘却の洞窟', resist: { light: 1.5, dark: 0.5 },
    actions: [A('attack', 3), A('special', 'toy_toss', 2), A('special', 'bored_yawn', 1)], drops: [{ item: 'herb', rate: 0.2 }, { item: 'wake_bell', rate: 0.06 }], desc: 'すぐに飽きてしまう小さな悪魔。おもちゃを投げつけて動きを鈍らせるが、ときどき飽きてそっぽを向く。やり方をすぐに乗り換えると、何も身につかない。光に弱い。' });
  M('tq_add_robber', { name: '強盗', lv: 8, arche: 'fast', art: { family: 'demon', c: { base: '#5a4a3a', accent: '#a03a2a', eye: '#ffd24a' } }, family: '人間系', area: 'エマール山脈・エマール山道',
    actions: [A('attack', 3), A('special', 'pickpocket', 2), { type: 'special', id: 'flee', w: 2, ifStolen: true }], drops: [{ item: 'potion', rate: 0.12 }, { item: 'herb', rate: 0.2 }], desc: '山道で旅人を待ち伏せる覆面の強盗。所持金を少しすり取り、うまくいくと逃げ出す。逃げられる前に倒せば、奪われたお金は取り返せる。' });
  // ---- グラニア
  M('tq_add_forgetful_samurai', { name: '失念の戦国侍', lv: 12, art: { family: 'undead', c: { base: '#3a4a7a', accent: '#d07a2a', eye: '#ffd24a' } }, family: '人間系', area: 'グラニアの灰野・灰の峠', resist: { thunder: 1.3 },
    actions: [A('attack', 2), A('special', 'forget_draw', 2), A('special', 'iai_recall', 1)], drops: [{ item: 'onigiri', rate: 0.15 }, { item: 'potion', rate: 0.12 }], desc: '鎧にたくさんの覚え書きを結んだ侍。刀を抜くのをよく忘れるが、思い出したときの居合いは鋭い。大事な決まりごとは、忘れないように書いて残そう。' });
  // ---- カリオン
  M('tq_add_corrupt_mayor', { name: '汚職市長', lv: 13, hpMult: 1.2, goldMult: 1.6, art: { family: 'magical', c: { base: '#2a6a3a', accent: '#e8c15a', eye: '#1a1a2a' } }, family: '人間系', area: 'カリオン平野',
    actions: [A('attack', 2), A('special', 'gavel_smash', 1), { type: 'special', id: 'mayor_call', summon: 'tax_hound', w: 1, hpBelow: 0.6 }], drops: [{ item: 'potion', rate: 0.15 }, { item: 'calm_water', rate: 0.08 }], desc: '金貨をこぼしながら歩く、ある地方の町の市長（架空の人物）。宝石の小槌で殴り、傷つくと手下を呼ぶ。' });
  M('tq_add_slush_fund_bureaucrat', { name: '裏金官僚', lv: 14, goldMult: 1.5, art: { family: 'magical', c: { base: '#2a3a5a', accent: '#c0c0d0', eye: '#1a1a2a' } }, family: '人間系', area: '地下記録庫', resist: { dark: 0.8 },
    actions: [A('attack', 2), A('special', 'slush_skim', 2), A('special', 'cover_up', 1)], drops: [{ item: 'ether', rate: 0.12 }], desc: '黒い鞄を抱えた役人（架空の人物）。帳簿を書き換えて所持金を少しずつ抜き取る。倒せば取り返せる。' });
  M('tq_add_corrupt_politician', { name: '悪徳議員', lv: 15, goldMult: 1.6, art: { family: 'magical', c: { base: '#7a1a2a', accent: '#e8c15a', eye: '#1a1a2a' } }, family: '人間系', area: '王都周辺・王宮', resist: { light: 1.3, dark: 0.8 },
    actions: [A('attack', 3), A('special', 'bribe_envelope', 1), A('special', 'filibuster', 1)], drops: [{ item: 'calm_water', rate: 0.15 }, { item: 'hi_potion', rate: 0.05 }], desc: '背中に分厚い封筒を隠した議員（架空の人物）。封筒で判断を狂わせ、長い演説で動きを鈍らせる。甘い話には裏がある。' });
  // ---- 断裂群島
  M('tq_add_wakame_head', { name: 'ワカメ頭', lv: 18, hpMult: 1.2, art: { family: 'plant', size: 'small', c: { base: '#2a5a2a', accent: '#c9a24a', eye: '#ffb03a' } }, family: '植物系', area: '断裂群島（灰灯島の草地・霧の島）', resist: { fire: 1.5, thunder: 1.3, ice: 0.6 },
    actions: [A('attack', 3), A('special', 'kelp_bind', 2), A('special', 'heal_self', 1)], drops: [{ item: 'muscle_relaxant', rate: 0.15 }, { item: 'seafood_hotpot', rate: 0.04 }], desc: '頭がまるごとワカメでできた、いたずら好きの生き物。ぬるぬるのワカメを巻きつけて動きを止める。火と雷に弱い。' });
  M('tq_add_ungrateful_ghost', { name: '感謝を忘れた亡霊', lv: 19, art: { family: 'undead', ghost: true, c: { base: '#b0a0d0', eye: '#3a3a6a' } }, family: 'アンデッド系', area: '廃墟の街・時計塔', resist: { light: 2, dark: 0, fire: 1.3 },
    actions: [A('attack', 2), A('special', 'ingrate_drain', 2), A('special', 'cold_shoulder', 1)], drops: [{ item: 'calm_water', rate: 0.15 }], desc: 'しおれた花束と古い贈り物を抱えた亡霊。もらうばかりで、ありがとうを言わなかった。手を伸ばして力を奪う。光に弱い。' });
  M('tq_add_cursed_one', { name: '祟られ人', lv: 20, art: { family: 'undead', c: { base: '#3a3a4a', accent: '#a05ad0', eye: '#c9a2ff' } }, family: '人間系', area: '霧の島・廃墟側の荒地', resist: { light: 1.6, dark: 0.4 },
    actions: [A('attack', 2), A('special', 'curse_cords', 2), A('special', 'tatari_flame', 1)], drops: [{ item: 'calm_water', rate: 0.12 }, { item: 'antidote', rate: 0.1 }], desc: '黒い縄と紫の炎にまとわりつかれた旅人。縄をからめて守りを下げる。光に弱い。' });
  M('tq_add_reptile_human', { name: 'レプタイプヒューマン', lv: 20, arche: 'fast', art: { family: 'reptile', c: { base: '#2a7a4a', accent: '#c9a24a', eye: '#ffd24a' } }, family: '爬虫類系', area: '地下施設', resist: { ice: 1.5, fire: 0.8 },
    actions: [A('attack', 3), A('special', 'toxic_bite', 2), A('special', 'cold_stare', 1)], drops: [{ item: 'antidote', rate: 0.25 }, { item: 'hi_potion', rate: 0.06 }], desc: '外交官の上着を着た、うろこの人型。毒の牙と冷たい目で相手をすくませる（架空の種族）。氷に弱い。' });
  M('tq_add_one_who_stopped_learning', { name: '学びを辞めた者', lv: 21, arche: 'tank', art: { family: 'magical', c: { base: '#6a4a2a', accent: '#8a8a9a', eye: '#1a1a2a' } }, family: '人間系', area: '記憶の図書館', resist: { light: 1.3, dark: 0.8 },
    actions: [A('attack', 3), A('special', 'closed_mind', 1), A('special', 'know_it_all', 1)], drops: [{ item: 'ether', rate: 0.12 }, { item: 'mana_tea', rate: 0.04 }], desc: '鎖で閉じた本を背負い、腕を組んだまま動かない者。「もう学ぶことはない」と守りを固め、話をさえぎって呪文を封じる。' });
  // ---- 時の神殿領
  M('tq_add_loan_shark_enforcer', { name: '闇金取り立て屋', lv: 22, hpMult: 1.2, art: { family: 'magical', c: { base: '#2a2a3a', accent: '#8a3ad0', eye: '#1a1a2a' } }, family: '人間系', area: '地下契約室・鐘都の平野', resist: { light: 1.3 },
    actions: [A('attack', 3), A('special', 'debt_squeeze', 2), A('special', 'ledger_threat', 1)], drops: [{ item: 'hi_potion', rate: 0.1 }, { item: 'calm_water', rate: 0.1 }], desc: '黒い帳簿と鉄の棍棒を持った取り立て屋（架空の人物）。所持金を少し取り立てる。倒せば取り返せる。' });
  // ---- リシア砂漠
  M('tq_add_glutton_arienti', { name: '大喰らいのアリエンティ', lv: 24, hpMult: 1.3, art: { family: 'slime', big: true, c: { base: '#7a3a9a', accent: '#f2e0b0', eye: '#ffb03a' } }, family: '異星人系', area: '南の砂漠・砂嵐の回廊', resist: { ice: 1.4, fire: 0.8 },
    actions: [A('attack', 2), A('special', 'devour', 2), { type: 'special', id: 'snack', w: 1, hpBelow: 0.7 }], drops: [{ item: 'curry_rice', rate: 0.08 }, { item: 'hi_potion', rate: 0.1 }], desc: '大きなスプーンと空の鍋を持った異星の生き物。なんでも丸のみにして体力を吸い取る。氷に弱い。' });
  // ---- ゼロメア・地下実験施設
  M('tq_add_ai_surveillance_drone', { name: '人間監視用AIドローン', lv: 24, arche: 'fast', art: { family: 'machine', c: { base: '#e8eef8', accent: '#3ab0ff', eye: '#3ab0ff' } }, family: '機械系', area: 'ゼロメアの平野・自動工場', resist: { thunder: 2, wind: 1.3 },
    actions: [A('attack', 2), A('special', 'scan_mark', 2), { type: 'special', id: 'alert_call', summon: 'patrol_drone', w: 1, hpBelow: 0.7 }], drops: [{ item: 'ether', rate: 0.12 }], desc: '大きな青い目で動くものを記録する監視用の機械。全員を読み取って動きを鈍らせ、傷つくと警報で巡視の機械を呼ぶ。雷が弱点。' });
  M('tq_add_cyber_human', { name: 'サイバーヒューマン', lv: 25, art: { family: 'machine', c: { base: '#3a3a4a', accent: '#3ae0d0', eye: '#3ae0d0' } }, family: '機械系', area: '旧都市の崖・オラクル中枢', resist: { thunder: 1.5, ice: 0.8, dark: 0.8 },
    actions: [A('attack', 3), A('special', 'cyber_blade', 2), A('special', 'overclock', 1)], drops: [{ item: 'hi_potion', rate: 0.1 }, { item: 'ether', rate: 0.08 }], desc: '体の半分を機械に置き換えた執行者。腕のプラズマの刃で斬りかかり、回路を加速させて素早くなる。雷に弱い。' });
  M('tq_add_brainwashed_grey', { name: '洗脳グレイ', lv: 25, art: { family: 'magical', size: 'small', c: { base: '#a0a8b8', accent: '#a05aff', eye: '#1a1a2a' } }, family: '異星人系', area: '地下実験施設', resist: { thunder: 1.5, dark: 0.7 },
    actions: [A('attack', 2), A('special', 'mind_signal', 2), A('special', 'puppet_stiff', 1)], drops: [{ item: 'calm_incense', rate: 0.15 }], desc: '頭に命令の装置をつけられた小さな宇宙人（架空）。信号で判断を狂わせるが、命令が来ないと固まってしまう。' });
  M('tq_add_earth1992_invader', { name: '地球1992からの侵略者', lv: 25, art: { family: 'machine', c: { base: '#e8e0d0', accent: '#2a9a8a', eye: '#1a1a2a' } }, family: '異星人系', area: '旧都市・旧都市の崖', resist: { thunder: 1.5, ice: 0.8 },
    actions: [A('attack', 2), A('special', 'retro_ray', 2), A('special', 'time_weight', 1)], drops: [{ item: 'ether', rate: 0.12 }, { item: 'muscle_relaxant', rate: 0.1 }], desc: 'もうひとつの「1992年の地球」から来たという、古めかしい宇宙服の侵略者（架空）。レトロな光線銃でしびれさせ、時間を重くする。' });
  M('tq_add_keyboard_crushers', { name: 'キーボードクラッシャーズ', lv: 25, arche: 'fast', art: { family: 'demon', c: { base: '#d07a2a', accent: '#3a6ad0', eye: '#ffd24a' } }, family: '魔物系', area: '旧都市・自動工場', resist: { thunder: 1.3 },
    actions: [A('attack', 2), A('special', 'key_smash', 2), A('special', 'cable_whip', 1)], drops: [{ item: 'ether', rate: 0.1 }, { item: 'muscle_relaxant', rate: 0.1 }], desc: '壊れたキーボードとケーブルを振り回す、怒りっぽい小鬼の二人組（1体の敵として出る）。負けた腹いせに道具を壊しても、次の勝ちにはつながらない。' });
  M('tq_add_population_control_drone', { name: '人口調整用ドローン', lv: 26, arche: 'tank', art: { family: 'machine', big: true, c: { base: '#2a2a2a', accent: '#ffb02a', eye: '#ff3a3a' } }, family: '機械系', area: '自動工場・オラクル中枢', resist: { thunder: 2, wind: 1.3, fire: 0.8 },
    actions: [A('attack', 2), A('special', 'cull_beam', 1), A('special', 'target_lock', 1)], drops: [{ item: 'hi_ether', rate: 0.05 }, { item: 'ether', rate: 0.12 }], desc: 'ゼロメアのAIが「数を管理する」という名目で巡回させている戦闘用の機械（架空）。全員をなぎ払う光を放つ。雷が弱点。' });
  M('tq_add_propaganda_host', { name: '洗脳メディア司会者', lv: 26, arche: 'mage', art: { family: 'magical', c: { base: '#c02a7a', accent: '#c0c0d0', eye: '#1a1a2a' } }, family: '人間系', area: 'オラクル中枢', resist: { thunder: 0.7, light: 1.3 },
    actions: [A('attack', 1), A('special', 'hypno_broadcast', 1), A('special', 'hype_spin', 2), A('skill', 'thunder', 1)], drops: [{ item: 'calm_incense', rate: 0.12 }], desc: 'マイクを杖のように持つ番組の司会者（架空の人物）。催眠の電波で判断を狂わせる。大きな声で言われたことほど、自分で確かめよう。' });
  // ---- 忘却の雪原
  M('tq_add_betrayal_troll', { name: '裏切りトロール', lv: 26, arche: 'tank', atkMult: 1.1, art: { family: 'beast', big: true, c: { base: '#6a8a4a', accent: '#c9a24a', eye: '#ffd24a' } }, family: '魔物系', area: '精霊の森', resist: { fire: 1.5, ice: 0.7 },
    actions: [A('attack', 3), A('special', 'false_handshake', 1), A('special', 'harden', 1)], drops: [{ item: 'hi_potion', rate: 0.12 }], desc: 'にこやかに手を差し出しながら、背中に棍棒を隠しているトロール。手を差し出したら、次は裏切りの一撃。防御して備えよう。火に弱い。' });
  // ---- 天空群島・竜炎火山群島
  M('tq_add_galantic_alien', { name: 'ギャランティック星人', lv: 31, arche: 'mage', art: { family: 'magical', c: { base: '#3a2a8a', accent: '#e8c15a', eye: '#ffd24a' } }, family: '異星人系', area: '星見塔・天空神殿の島', resist: { light: 0.5, dark: 1.5, thunder: 0.7 },
    actions: [A('attack', 1), A('special', 'star_crest', 1), A('skill', 'thunder', 1), A('skill', 'ice', 1)], drops: [{ item: 'mana_tea', rate: 0.08 }, { item: 'hi_ether', rate: 0.05 }], desc: '三日月の冠と四つの目を持つ、星から来た使者（架空）。星の光と雷・氷の呪文を使う。闇に弱い。' });
  M('tq_add_alien_invasion_merchant', { name: '侵略宇宙商人', lv: 31, hpMult: 1.3, atkMult: 0.85, goldMult: 1.8, art: { family: 'slime', big: true, c: { base: '#3ab0a0', accent: '#8a3ad0', eye: '#ffd24a' } }, family: '異星人系', area: '天空群島・星見塔', resist: { light: 1.3, dark: 0.7 },
    actions: [A('attack', 2), A('special', 'hard_sell', 2), A('special', 'planet_orb', 1)], drops: [{ item: 'hi_ether', rate: 0.06 }, { item: 'elixir', rate: 0.02 }], desc: '四本の腕で取引をもちかける異星の商人（架空）。押し売りで所持金を少し持っていく。倒せば取り返せる。' });
  M('tq_add_blinded_by_greed', { name: '貪欲の盲者', lv: 31, hpMult: 1.3, goldMult: 2, art: { family: 'demon', c: { base: '#8a7a2a', accent: '#e8c15a', eye: '#e8c15a' } }, family: '悪魔系', area: '竜脈洞窟', resist: { light: 1.5, dark: 0.5 },
    actions: [A('attack', 2), A('special', 'greed_grab', 2), A('special', 'hoard_guard', 1)], drops: [{ item: 'dragon_scale', rate: 0.04 }, { item: 'hi_potion', rate: 0.12 }], desc: '金貨の帯で目をふさいだ守銭奴の悪魔。財布をつかみ取り、財宝の袋を抱えて守る。倒せば奪われたお金は戻る。光に弱い。' });
  // ---- 暗黒大陸
  M('tq_add_fool_of_desire', { name: '肉欲の愚者', lv: 37, acts: 2, hpMult: 1.3, goldMult: 1.2, art: { family: 'demon', c: { base: '#8a1a3a', accent: '#e8a0a0', eye: '#ffd24a' } }, family: '悪魔系', area: '魔王城・魔王城の山麓', resist: { light: 1.5, dark: 0.3 },
    actions: [A('attack', 3), A('special', 'desire_gaze', 1), A('special', 'vain_pose', 1)], drops: [{ item: 'phoenix_feather', rate: 0.05 }, { item: 'hi_potion', rate: 0.15 }], desc: '欲望のままに着飾った悪魔の廷臣。ハートの宝石で目を奪うが、自分の姿に見とれて隙だらけになることも。1ターンに2回動く。光に弱い。' });

  /* ---------- 既存の10体（同じ人物）：能力・出現・報酬は変えない。外見に合わせた行動を足す（もとの行動は残す） ---------- */
  var REUSE = ['yosen_slime', 'insen_slime', 'contrarian_bat', 'stoploss_zombie', 'nanpin_goblin', 'simple_cultist', 'fullleva_ogre', 'kotsukotsu_knight', 'pojipoji_phantom', 'indicator_mage'];
  REUSE.forEach(function (id) { if (!EN[id]) throw new Error('enemies-add35: 既存の敵がない ' + id); });
  var TUNE = [];
  function addAct(id, act, note) { EN[id].actions.push(act); TUNE.push(id + '：' + note); }
  addAct('nanpin_goblin', A('special', 'nanpin_stack', 1), '買い増し（攻撃力の重ねがけ）を足した');
  addAct('contrarian_bat', A('special', 'contrarian_stance', 1), '逆張りの構え（通常攻撃への反撃）を足した');
  // コツコツドカンナイト：「ドカン」をいきなり撃つ代わりに、予告（溜め）してから撃つ（威力2.2はそのまま）
  EN.kotsukotsu_knight.actions.forEach(function (a) { if (a.type === 'special' && a.id === 'dokan') { a.id = 'dokan_charge'; TUNE.push('kotsukotsu_knight：ドカンの前に予告（溜め）を入れた'); } });
  TUNE.push('fullleva_ogre：フルレバ一撃のあとに隙（2ターン 守備−40%・素早さ−30%）');

  /* ---------- 出現表：[マップ, 出現表の名前（zone.name）, 足すグループ...]（既存のグループはそのまま） ---------- */
  var ADD = [
    ['oblivion_cave_1', '忘却の洞窟', ['tq_add_boredom_imp', 'tq_add_boredom_imp'], ['tq_add_boredom_imp', 'bat']],
    ['oblivion_cave_2', '忘却の洞窟', ['tq_add_boredom_imp', 'imp'], ['tq_add_boredom_imp', 'ghost']],
    ['world', 'エマール山脈', ['tq_add_robber', 'tq_add_robber'], ['tq_add_robber', 'bandit']],
    ['emal_pass', 'エマール山道', ['tq_add_robber', 'bandit_archer'], ['tq_add_robber', 'tq_add_robber']],
    ['world_grania', 'グラニアの灰野', ['tq_add_forgetful_samurai'], ['tq_add_forgetful_samurai', 'smoke_wraith']],
    ['grania_pass', 'エマール山脈', ['tq_add_forgetful_samurai'], ['tq_add_forgetful_samurai', 'bandit']],
    ['world_kalion', 'カリオン平野', ['tq_add_corrupt_mayor'], ['tq_add_corrupt_mayor', 'federal_soldier']],
    ['kalion_archive_1', '地下記録庫', ['tq_add_slush_fund_bureaucrat', 'paper_wraith']],
    ['kalion_archive_2', '地下記録庫', ['tq_add_slush_fund_bureaucrat', 'paper_wraith'], ['tq_add_slush_fund_bureaucrat', 'ledger_mimic']],
    ['world_kalion', '王都周辺', ['tq_add_corrupt_politician', 'federal_soldier'], ['tq_add_corrupt_politician', 'royal_guard']],
    ['sentra_palace_1', '王宮', ['tq_add_corrupt_politician', 'royal_guard']],
    ['world_islands', '灰灯島の草地', ['tq_add_wakame_head'], ['tq_add_wakame_head', 'reef_jelly']],
    ['mist_isle', '霧の島', ['tq_add_wakame_head', 'salt_wolf'], ['tq_add_cursed_one', 'salt_wolf'], ['tq_add_cursed_one', 'lantern_wisp']],
    ['aruna_ruins', '廃墟の街', ['tq_add_ungrateful_ghost', 'ruin_shade']],
    ['aruna_ruins_1', '時計塔', ['tq_add_ungrateful_ghost', 'drift_golem'], ['tq_add_ungrateful_ghost', 'lantern_wisp']],
    ['world_islands', '廃墟側の荒地', ['tq_add_cursed_one', 'drift_golem'], ['tq_add_cursed_one', 'ruin_shade']],
    ['aruna_underground_1', '地下施設', ['tq_add_reptile_human', 'tq_add_reptile_human'], ['tq_add_reptile_human', 'deep_guard']],
    ['memory_library', '記憶の図書館', ['tq_add_one_who_stopped_learning'], ['tq_add_one_who_stopped_learning', 'archive_eel']],
    ['time_bank_vault_1', '契約室', ['tq_add_loan_shark_enforcer'], ['tq_add_loan_shark_enforcer', 'debt_collector']],
    ['world_tempus', '鐘都の平野', ['tq_add_loan_shark_enforcer'], ['tq_add_loan_shark_enforcer', 'bell_wraith']],
    ['world_desert', '南の砂漠', ['tq_add_glutton_arienti'], ['tq_add_glutton_arienti', 'dune_scorpion']],
    ['sandstorm_corridor_2', '砂嵐の回廊', ['tq_add_glutton_arienti', 'sand_worm']],
    ['world_machine', 'ゼロメアの平野', ['tq_add_ai_surveillance_drone', 'tq_add_ai_surveillance_drone'], ['tq_add_ai_surveillance_drone', 'patrol_drone']],
    ['auto_factory_1', '自動工場', ['tq_add_ai_surveillance_drone', 'repair_bot']],
    ['world_machine', '旧都市の崖', ['tq_add_cyber_human'], ['tq_add_earth1992_invader'], ['tq_add_cyber_human', 'rust_sentinel']],
    ['old_city_1', '旧都市', ['tq_add_earth1992_invader'], ['tq_add_keyboard_crushers', 'glitch_cat'], ['tq_add_keyboard_crushers', 'data_leech']],
    ['auto_factory_2', '自動工場', ['tq_add_keyboard_crushers', 'repair_bot'], ['tq_add_population_control_drone']],
    ['oracle_core_1', '中枢', ['tq_add_population_control_drone', 'sentry_unit'], ['tq_add_propaganda_host', 'patrol_drone'], ['tq_add_propaganda_host', 'data_leech']],
    ['oracle_core_2', '中枢', ['tq_add_cyber_human', 'core_defender'], ['tq_add_propaganda_host', 'core_defender']],
    ['vol_under_1', '地下実験施設', ['tq_add_brainwashed_grey'], ['tq_add_brainwashed_grey', 'lab_drone']],
    ['vol_under_2', '地下実験施設 2階', ['tq_add_brainwashed_grey', 'quantum_shade']],
    ['spirit_forest_1', '精霊の森', ['tq_add_betrayal_troll'], ['tq_add_betrayal_troll', 'frost_wolf']],
    ['star_tower_1', '星見塔', ['tq_add_galantic_alien'], ['tq_add_alien_invasion_merchant']],
    ['world_sky', '天空神殿の島', ['tq_add_galantic_alien'], ['tq_add_galantic_alien', 'storm_harpy']],
    ['world_sky', '天空群島', ['tq_add_alien_invasion_merchant'], ['tq_add_alien_invasion_merchant', 'cloud_ram']],
    ['dragon_vein_1', '竜脈洞窟', ['tq_add_blinded_by_greed'], ['tq_add_blinded_by_greed', 'fire_drake']],
    ['dragon_vein_2', '竜脈洞窟', ['tq_add_blinded_by_greed', 'obsidian_golem']],
    ['demon_castle_2', '魔王城', ['tq_add_fool_of_desire', 'control_shade'], ['tq_add_fool_of_desire', 'greed_shade']],
    ['world_dark', '魔王城の山麓', ['tq_add_fool_of_desire', 'fear_shade']]
  ];
  var applied = [], missing = [];
  ADD.forEach(function (r) {
    var def = MAPS && MAPS[r[0]]; var zones = def && def.encounters && def.encounters.zones; var z = zones && zones.filter(function (q) { return q.name === r[1]; })[0];
    if (!z) { missing.push(r[0] + ':' + r[1]); return; }
    r.slice(2).forEach(function (g) { g.forEach(function (id) { if (!EN[id]) throw new Error('enemies-add35: 出現表に未定義の敵 ' + id); }); z.groups.push(g.slice()); });
    applied.push(r[0] + ':' + r[1]);
  });
  if (root.ENEMY_LIST) ADDED.forEach(function (id) { if (root.ENEMY_LIST.indexOf(id) < 0) root.ENEMY_LIST.push(id); });   // 図鑑の並び：既存の敵のあと（既存の番号はずれない）

  /* ---------- 画像の表（js/core/enemyart.js が読む）：
       file：assets/enemies_add35/（パックの assets/webp/ の 1024×1024 透過WebP をそのまま。加工・再圧縮なし。PNG版は使わない）
       ref：座標の基準の画像の大きさ（1024）／bbox：切り出す範囲 [x, y, 幅, 高さ]（パックの visible_bbox＝アルファ32以上の範囲を8px広げた。外にはアルファ4未満の画素しかない）
       anchor：足もと（パックの ground_anchor）／draw：戦闘画面（640×416）での基本の大きさ（体格 size ごとに、見える部分の高さを small 118・normal 144・big 170）
       lift：浮いている敵を地面から浮かせる量／foot：切り出した画像の下端から足もとまでの割合（足もとを地面の線に合わせる） ---------- */
  var ART = [
    { no: 1, id: "tq_add_cyber_human", packId: "tq_add_cyber_human", reuse: false, name: "サイバーヒューマン", file: "assets/enemies_add35/001_tq_add_cyber_human.webp", sha256: "609fa9d148521c7ca122b6510c1cb6e138589e712885385f4199fac6594f81a3", ref: 1024, bbox: [250, 115, 520, 793], visible: [258, 123, 504, 777], anchor: [510.0, 900.0], size: "normal", draw: [96, 147], lift: 0, foot: 0.0101, floating: false, status: 'adopted' },
    { no: 2, id: "tq_add_boredom_imp", packId: "tq_add_boredom_imp", reuse: false, name: "飽性の小悪魔", file: "assets/enemies_add35/002_tq_add_boredom_imp.webp", sha256: "90c9fe297970dea39eb438217feb568f2bc22aac3be697637c127f51ab554a7a", ref: 1024, bbox: [131, 107, 716, 809], visible: [139, 115, 700, 793], anchor: [489.0, 908.0], size: "small", draw: [107, 120], lift: 0, foot: 0.0099, floating: false, status: 'adopted' },
    { no: 3, id: "tq_add_wakame_head", packId: "tq_add_wakame_head", reuse: false, name: "ワカメ頭", file: "assets/enemies_add35/003_tq_add_wakame_head.webp", sha256: "7deae5e1b21a5394189cb189193b890765f2a77838a569361cddddb76ee9d84c", ref: 1024, bbox: [153, 170, 726, 682], visible: [161, 178, 710, 666], anchor: [516.0, 844.0], size: "small", draw: [129, 121], lift: 0, foot: 0.0117, floating: false, status: 'adopted' },
    { no: 4, id: "yosen_slime", packId: "tq_add_bullish_slime", reuse: true, name: "陽線スライム", file: "assets/enemies_add35/004_tq_add_bullish_slime.webp", sha256: "7ef1984ce34f941ee42e97159e9f3ef67ed7945ad0233892f21bebcac49925b8", ref: 1024, bbox: [139, 180, 746, 639], visible: [147, 188, 730, 623], anchor: [512.0, 811.0], size: "small", draw: [141, 121], lift: 0, foot: 0.0125, floating: false, status: 'adopted' },
    { no: 5, id: "insen_slime", packId: "tq_add_bearish_slime", reuse: true, name: "陰線スライム", file: "assets/enemies_add35/005_tq_add_bearish_slime.webp", sha256: "afdda0919442bd6a16066ab0544fb82baf257829fb7e97c336c128e19c718f71", ref: 1024, bbox: [134, 173, 756, 639], visible: [142, 181, 740, 623], anchor: [512.0, 804.0], size: "small", draw: [143, 121], lift: 0, foot: 0.0125, floating: false, status: 'adopted' },
    { no: 6, id: "simple_cultist", packId: "tq_add_simplicity_acolyte", reuse: true, name: "シンプル教の信徒", file: "assets/enemies_add35/006_tq_add_simplicity_acolyte.webp", sha256: "8c822b17b568f7378439df2a9c3951356ace6e90fee835e764c0fb9fb89cb599", ref: 1024, bbox: [268, 121, 443, 786], visible: [276, 129, 427, 770], anchor: [489.5, 899.0], size: "normal", draw: [83, 147], lift: 0, foot: 0.0102, floating: false, status: 'adopted' },
    { no: 7, id: "stoploss_zombie", packId: "tq_add_stoploss_zombie", reuse: true, name: "損切りゾンビ", file: "assets/enemies_add35/007_tq_add_stoploss_zombie.webp", sha256: "22f4ad66a78a75545996948f98048df08daff3503e6245eabbcd21bb6b37880f", ref: 1024, bbox: [161, 162, 707, 723], visible: [169, 170, 691, 707], anchor: [514.5, 877.0], size: "normal", draw: [144, 147], lift: 0, foot: 0.0111, floating: false, status: 'adopted' },
    { no: 8, id: "nanpin_goblin", packId: "tq_add_averaging_goblin", reuse: true, name: "ナンピンゴブリン", file: "assets/enemies_add35/008_tq_add_averaging_goblin.webp", sha256: "a14215c192412b11494d68d607f54cc949b6665422074f5b587cb940ebe55ad1", ref: 1024, bbox: [172, 150, 665, 741], visible: [180, 158, 649, 725], anchor: [504.5, 883.0], size: "small", draw: [108, 121], lift: 0, foot: 0.0108, floating: false, status: 'adopted' },
    { no: 9, id: "fullleva_ogre", packId: "tq_add_full_leverage_ogre", reuse: true, name: "フルレバオーガ", file: "assets/enemies_add35/009_tq_add_full_leverage_ogre.webp", sha256: "5430e36a911673fc24d69e3cec7638e579a7c825990845d335ea965f7835e580", ref: 1024, bbox: [108, 131, 802, 762], visible: [116, 139, 786, 746], anchor: [509.0, 885.0], size: "big", draw: [183, 174], lift: 0, foot: 0.0105, floating: false, status: 'adopted' },
    { no: 10, id: "contrarian_bat", packId: "tq_add_contrarian_bat", reuse: true, name: "逆張りバット", file: "assets/enemies_add35/010_tq_add_contrarian_bat.webp", sha256: "f28049ae7803dda7680d701bae9528282aa3ea52f3f83c701379f4951abfe149", ref: 1024, bbox: [135, 144, 762, 733], visible: [143, 152, 746, 717], anchor: [516.0, 869.0], size: "small", draw: [125, 121], lift: 12, foot: 0.0109, floating: true, status: 'adopted' },
    { no: 11, id: "kotsukotsu_knight", packId: "tq_add_boom_bust_knight", reuse: true, name: "コツコツドカンナイト", file: "assets/enemies_add35/011_tq_add_boom_bust_knight.webp", sha256: "ceaa6a4d67e98fdb3e40f0d3d1cb3000c227f969b25b8629756678b65ce59553", ref: 1024, bbox: [131, 149, 759, 730], visible: [139, 157, 743, 714], anchor: [510.5, 871.0], size: "normal", draw: [153, 147], lift: 0, foot: 0.011, floating: false, status: 'adopted' },
    { no: 12, id: "pojipoji_phantom", packId: "tq_add_overtrading_phantom", reuse: true, name: "ポジポジファントム", file: "assets/enemies_add35/012_tq_add_overtrading_phantom.webp", sha256: "2fe65c046bf2ae8e4984d67faabf50cd7d2a2a4cb467b98ed692d374259c9953", ref: 1024, bbox: [170, 138, 698, 759], visible: [178, 146, 682, 743], anchor: [519.0, 889.0], size: "normal", draw: [135, 147], lift: 14, foot: 0.0105, floating: true, status: 'adopted' },
    { no: 13, id: "indicator_mage", packId: "tq_add_indicator_mage", reuse: true, name: "インジ依存メイジ", file: "assets/enemies_add35/013_tq_add_indicator_mage.webp", sha256: "7c8cb3f49044e61532a15fd439680367243e68001bd4e7c1429d328209ecb36c", ref: 1024, bbox: [161, 154, 668, 731], visible: [169, 162, 652, 715], anchor: [495.0, 877.0], size: "normal", draw: [135, 147], lift: 0, foot: 0.0109, floating: false, status: 'adopted' },
    { no: 14, id: "tq_add_corrupt_politician", packId: "tq_add_corrupt_politician", reuse: false, name: "悪徳議員", file: "assets/enemies_add35/014_tq_add_corrupt_politician.webp", sha256: "101495b2c43525509fe3758d7f621140b6b787466076f93b42df9e92c8cd43e7", ref: 1024, bbox: [161, 124, 670, 781], visible: [169, 132, 654, 765], anchor: [496.0, 897.0], size: "normal", draw: [126, 147], lift: 0, foot: 0.0102, floating: false, status: 'adopted' },
    { no: 15, id: "tq_add_slush_fund_bureaucrat", packId: "tq_add_slush_fund_bureaucrat", reuse: false, name: "裏金官僚", file: "assets/enemies_add35/015_tq_add_slush_fund_bureaucrat.webp", sha256: "c63d58e909a15338093b7304a4543fd267713a94035ae13cf85a5a164a8f2a13", ref: 1024, bbox: [250, 113, 523, 802], visible: [258, 121, 507, 786], anchor: [511.5, 907.0], size: "normal", draw: [96, 147], lift: 0, foot: 0.01, floating: false, status: 'adopted' },
    { no: 16, id: "tq_add_corrupt_mayor", packId: "tq_add_corrupt_mayor", reuse: false, name: "汚職市長", file: "assets/enemies_add35/016_tq_add_corrupt_mayor.webp", sha256: "5463913a08915c94b1ecc10ab30c0014ea6be498f378feb16a1d0a039a491ff0", ref: 1024, bbox: [152, 122, 712, 785], visible: [160, 130, 696, 769], anchor: [508.0, 899.0], size: "normal", draw: [133, 147], lift: 0, foot: 0.0102, floating: false, status: 'adopted' },
    { no: 17, id: "tq_add_propaganda_host", packId: "tq_add_propaganda_host", reuse: false, name: "洗脳メディア司会者", file: "assets/enemies_add35/017_tq_add_propaganda_host.webp", sha256: "24b0e65d67b5c2c6a096a0536f412e94c34059a0852b4e644ecf0fcacc79d1fe", ref: 1024, bbox: [208, 113, 609, 798], visible: [216, 121, 593, 782], anchor: [512.5, 903.0], size: "normal", draw: [112, 147], lift: 0, foot: 0.01, floating: false, status: 'adopted' },
    { no: 18, id: "tq_add_robber", packId: "tq_add_robber", reuse: false, name: "強盗", file: "assets/enemies_add35/018_tq_add_robber.webp", sha256: "07ed64ab23680d774fb5e6bbd3c0c99d79f659688314e7bf490330573715a1f4", ref: 1024, bbox: [176, 157, 625, 741], visible: [184, 165, 609, 725], anchor: [488.5, 890.0], size: "normal", draw: [124, 147], lift: 0, foot: 0.0108, floating: false, status: 'adopted' },
    { no: 19, id: "tq_add_loan_shark_enforcer", packId: "tq_add_loan_shark_enforcer", reuse: false, name: "闇金取り立て屋", file: "assets/enemies_add35/019_tq_add_loan_shark_enforcer.webp", sha256: "e6393b9530ea01537dea96615164fccdcd155944fe6c2b5e90ce6a14117fa21c", ref: 1024, bbox: [215, 125, 592, 783], visible: [223, 133, 576, 767], anchor: [511.0, 900.0], size: "normal", draw: [111, 147], lift: 0, foot: 0.0102, floating: false, status: 'adopted' },
    { no: 20, id: "tq_add_galantic_alien", packId: "tq_add_galantic_alien", reuse: false, name: "ギャランティック星人", file: "assets/enemies_add35/020_tq_add_galantic_alien.webp", sha256: "045d8141748ea5038906a29daacddb45e5cbc457943a9c2848b8bc4c00eea00f", ref: 1024, bbox: [181, 119, 663, 789], visible: [189, 127, 647, 773], anchor: [512.5, 900.0], size: "normal", draw: [124, 147], lift: 0, foot: 0.0101, floating: false, status: 'adopted' },
    { no: 21, id: "tq_add_brainwashed_grey", packId: "tq_add_brainwashed_grey", reuse: false, name: "洗脳グレイ", file: "assets/enemies_add35/021_tq_add_brainwashed_grey.webp", sha256: "454ffde1467debe79a518588e83098bff6abf6759a380b2b05fca63755d65701", ref: 1024, bbox: [208, 119, 587, 782], visible: [216, 127, 571, 766], anchor: [501.5, 893.0], size: "small", draw: [90, 120], lift: 0, foot: 0.0102, floating: false, status: 'adopted' },
    { no: 22, id: "tq_add_reptile_human", packId: "tq_add_reptile_human", reuse: false, name: "レプタイプヒューマン", file: "assets/enemies_add35/022_tq_add_reptile_human.webp", sha256: "16634ea7058edffdd93218fdb2d267e2d04d35c6efcaf4b46c38a1526573f8d7", ref: 1024, bbox: [221, 108, 582, 808], visible: [229, 116, 566, 792], anchor: [512.0, 908.0], size: "normal", draw: [106, 147], lift: 0, foot: 0.0099, floating: false, status: 'adopted' },
    { no: 23, id: "tq_add_alien_invasion_merchant", packId: "tq_add_alien_invasion_merchant", reuse: false, name: "侵略宇宙商人", file: "assets/enemies_add35/023_tq_add_alien_invasion_merchant.webp", sha256: "aa887062e192d0a7380d9d65728ad1faf6352a77f08eab7fd419638304f668ac", ref: 1024, bbox: [116, 119, 791, 780], visible: [124, 127, 775, 764], anchor: [511.5, 891.0], size: "big", draw: [176, 174], lift: 0, foot: 0.0103, floating: false, status: 'adopted' },
    { no: 24, id: "tq_add_forgetful_samurai", packId: "tq_add_forgetful_samurai", reuse: false, name: "失念の戦国侍", file: "assets/enemies_add35/024_tq_add_forgetful_samurai.webp", sha256: "c06d072d6e6569503f85d1b5043eaf4e8c7874cd817b1b1ba5c64679b19cd05f", ref: 1024, bbox: [262, 116, 466, 792], visible: [270, 124, 450, 776], anchor: [495.0, 900.0], size: "normal", draw: [86, 147], lift: 0, foot: 0.0101, floating: false, status: 'adopted' },
    { no: 25, id: "tq_add_earth1992_invader", packId: "tq_add_earth1992_invader", reuse: false, name: "地球1992からの侵略者", file: "assets/enemies_add35/025_tq_add_earth1992_invader.webp", sha256: "0b1ad3cc358459fed48ca053f8448a4cffb76f7682ca1d0ec9785de2f12400cc", ref: 1024, bbox: [224, 119, 492, 775], visible: [232, 127, 476, 759], anchor: [470.0, 886.0], size: "normal", draw: [93, 147], lift: 0, foot: 0.0103, floating: false, status: 'adopted' },
    { no: 26, id: "tq_add_one_who_stopped_learning", packId: "tq_add_one_who_stopped_learning", reuse: false, name: "学びを辞めた者", file: "assets/enemies_add35/026_tq_add_one_who_stopped_learning.webp", sha256: "98229bcd9dbf9fbe051939a305f4bdf6301f864e11fd096360d78b6d568da635", ref: 1024, bbox: [262, 119, 500, 783], visible: [270, 127, 484, 767], anchor: [512.0, 894.0], size: "normal", draw: [94, 147], lift: 0, foot: 0.0102, floating: false, status: 'adopted' },
    { no: 27, id: "tq_add_ungrateful_ghost", packId: "tq_add_ungrateful_ghost", reuse: false, name: "感謝を忘れた亡霊", file: "assets/enemies_add35/027_tq_add_ungrateful_ghost.webp", sha256: "397369353f8c7ad89c25f26b28b77f116a17af7059e27904b8815d5f7296cd3c", ref: 1024, bbox: [182, 112, 654, 802], visible: [190, 120, 638, 786], anchor: [509.0, 906.0], size: "normal", draw: [120, 147], lift: 14, foot: 0.01, floating: true, status: 'adopted' },
    { no: 28, id: "tq_add_glutton_arienti", packId: "tq_add_glutton_arienti", reuse: false, name: "大喰らいのアリエンティ", file: "assets/enemies_add35/028_tq_add_glutton_arienti.webp", sha256: "1fccfc744e880ae8b26249ebe517d50f4a1162506fa93a05a0aac487d2ecd802", ref: 1024, bbox: [120, 109, 786, 799], visible: [128, 117, 770, 783], anchor: [513.0, 900.0], size: "big", draw: [171, 173], lift: 0, foot: 0.01, floating: false, status: 'adopted' },
    { no: 29, id: "tq_add_population_control_drone", packId: "tq_add_population_control_drone", reuse: false, name: "人口調整用ドローン", file: "assets/enemies_add35/029_tq_add_population_control_drone.webp", sha256: "474848c7c6af812d523bfade3b731c2277dd2d48a676715497046adec3d29dff", ref: 1024, bbox: [131, 168, 766, 665], visible: [139, 176, 750, 649], anchor: [514.0, 825.0], size: "big", draw: [201, 174], lift: 17, foot: 0.012, floating: true, status: 'adopted' },
    { no: 30, id: "tq_add_betrayal_troll", packId: "tq_add_betrayal_troll", reuse: false, name: "裏切りトロール", file: "assets/enemies_add35/030_tq_add_betrayal_troll.webp", sha256: "6078980ef6f77102d9dcef668de5aabb03f437655236ae7dcb5904bb6bb1b530", ref: 1024, bbox: [131, 123, 752, 781], visible: [139, 131, 736, 765], anchor: [507.0, 896.0], size: "big", draw: [167, 174], lift: 0, foot: 0.0102, floating: false, status: 'adopted' },
    { no: 31, id: "tq_add_fool_of_desire", packId: "tq_add_fool_of_desire", reuse: false, name: "肉欲の愚者", file: "assets/enemies_add35/031_tq_add_fool_of_desire.webp", sha256: "2339fc0902c1e6aa0ffe88332687ddba90f8b5447ea408fa38387d1d66e63d25", ref: 1024, bbox: [131, 107, 748, 803], visible: [139, 115, 732, 787], anchor: [505.0, 902.0], size: "normal", draw: [137, 147], lift: 0, foot: 0.01, floating: false, status: 'adopted' },
    { no: 32, id: "tq_add_blinded_by_greed", packId: "tq_add_blinded_by_greed", reuse: false, name: "貪欲の盲者", file: "assets/enemies_add35/032_tq_add_blinded_by_greed.webp", sha256: "6c8dc229722a782da0e6cb34de5e1c0185e8dd267eee2a3656585cf52fbcc702", ref: 1024, bbox: [116, 114, 796, 800], visible: [124, 122, 780, 784], anchor: [514.0, 906.0], size: "normal", draw: [146, 147], lift: 0, foot: 0.01, floating: false, status: 'adopted' },
    { no: 33, id: "tq_add_cursed_one", packId: "tq_add_cursed_one", reuse: false, name: "祟られ人", file: "assets/enemies_add35/033_tq_add_cursed_one.webp", sha256: "c3dc3fcd31dda7d743f55aa139e00f890b2981d8c193c3f9e5aac5178dc9e4cc", ref: 1024, bbox: [201, 135, 612, 764], visible: [209, 143, 596, 748], anchor: [507.0, 891.0], size: "normal", draw: [118, 147], lift: 0, foot: 0.0105, floating: false, status: 'adopted' },
    { no: 34, id: "tq_add_keyboard_crushers", packId: "tq_add_keyboard_crushers", reuse: false, name: "キーボードクラッシャーズ", file: "assets/enemies_add35/034_tq_add_keyboard_crushers.webp", sha256: "78c5c5f4ee9c02bd13acba14aad1b04e50b0522481aa0827453d6b77eb6a899b", ref: 1024, bbox: [141, 164, 738, 717], visible: [149, 172, 722, 701], anchor: [510.0, 873.0], size: "normal", draw: [152, 147], lift: 0, foot: 0.0112, floating: false, status: 'adopted' },
    { no: 35, id: "tq_add_ai_surveillance_drone", packId: "tq_add_ai_surveillance_drone", reuse: false, name: "人間監視用AIドローン", file: "assets/enemies_add35/035_tq_add_ai_surveillance_drone.webp", sha256: "99804057d0e8b36aa409938625c0c22f5df67ca7f3a6c8eec6e30e53baf1b75b", ref: 1024, bbox: [151, 158, 722, 704], visible: [159, 166, 706, 688], anchor: [512.0, 854.0], size: "small", draw: [124, 121], lift: 12, foot: 0.0114, floating: true, status: 'adopted' }
  ];
  root.ENEMY_ADD35 = { version: 1, pack: 'trade_quest_additional_enemies_35_20261104', list: ART, added: ADDED.slice(), reuse: REUSE.slice(), tune: TUNE, specials: Object.keys(NEWSP), zones: applied, missing: missing };
})(typeof window !== 'undefined' ? window : globalThis);
