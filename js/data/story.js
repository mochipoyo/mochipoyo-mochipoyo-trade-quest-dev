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
    lucia: { name: 'ルシア', job: 'waveblade', sprite: 'lucia', joinLevel: 9, personality: '静かで負けず嫌い', background: '師匠ハケイの一番弟子。波を読む力をさらに高めたいと願う。', bio: '波形を読む剣技の使い手。' }
  };

  var QUESTS = {
    main_1: { title: '王に会う', desc: 'リヴェル城下町へ行き、リヴェル王に謁見する。', main: true, reward: { exp: 20 } },
    main_2: { title: '迷いの森の魔物', desc: '迷いの森の奥にある祠で「トレンド迷子」を討ち、祠を調べる。', main: true, reward: { exp: 120, gold: 200 } },
    main_3: { title: '忘却の洞窟の欠片', desc: '忘却の洞窟の封印扉を開け、最深部で「欲望のゴーレム」からクリスタルの欠片を取り戻す。', main: true, reward: { exp: 300, gold: 400 } },
    main_4: { title: '時の神殿領へ', desc: '港町マリナの船を直し、エマール山脈の向こうを目指す。（この先は今後の更新で追加）', main: true, reward: { exp: 0 } },
    sub_bandit: { title: '街道の山賊', desc: 'エマール山道のアジトにいる山賊の頭目ガロンを倒す。', reward: { exp: 150, gold: 500, item: 'ring_speed' } },
    learn_pullback: { title: '押し目を見極めよ', desc: '修行場で「上昇トレンド中の押し目」の試練に3回成功する。', counter: 'trial_ok:up_pullback', need: 3, reward: { exp: 100, gold: 150, item: 'amulet_mind' } },
    learn_range: { title: 'レンジを見送れ', desc: '修行場で「レンジ相場」の試練に2回成功する（見送りが正解）。', counter: 'trial_ok:range', need: 2, reward: { exp: 80, gold: 100, item: 'ether' } },
    learn_hidden: { title: 'ヒドゥンダイバージェンスを見つけよ', desc: '修行場で「ヒドゥンダイバージェンス」の試練に2回成功する。', counter: 'trial_ok:hidden', need: 2, reward: { exp: 150, gold: 200, item: 'time_amulet' } },
    learn_stoploss: { title: '損切り位置を極めよ', desc: '修行場の試練で「損切り位置」を5回正しく設定する。', counter: 'trial_sl_ok', need: 5, reward: { exp: 120, gold: 150, item: 'stoploss_shield' } }
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
    { id: 4, title: '第四章　海を渡る準備', flag: 'shard_returned' }
  ];

  root.COMPANIONS = COMPANIONS; root.QUESTS = QUESTS; root.LECTURES = LECTURES; root.STORY_CHAPTERS = CHAPTERS;
})(typeof window !== 'undefined' ? window : globalThis);
