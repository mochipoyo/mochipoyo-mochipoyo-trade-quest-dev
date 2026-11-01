/* =========================================================
   Data / enemy-redesign（既存の通常敵164体の新しい表示名・戦闘画像）
   ・素材：trade_quest_redesign_001_164（enemy_name_mapping.json の number・id・display_name・png_512）
   ・敵ID・能力・出現・報酬・行動・属性は変えない。変えるのは表示名（ENEMIES[id].name）と戦闘・図鑑の画像だけ
   ・oldName：差し替え前の表示名（記録用。ゲームの中では ENEMIES[id].name を使う）
   ・status：adopted＝新しい名前と画像を使う／held＝検品で問題があったため、旧名・旧画像のまま（reason に理由）
   ・bbox：512px 画像の中の不透明部分（alpha>16）の外接矩形 [x, y, 幅, 高さ]。戦闘ではここを切り出して表示する
   ・draw：戦闘画面（640×416）での基本の表示サイズ [幅, 高さ]（縦横比は画像のまま。敵の数が多いときは戦闘画面がさらに縮める）
   ・size：small / normal / big（今までの絵の大きさから決めた体格）／lift：飛んでいる敵を地面から浮かせる量（px）
   ・1024px 版は戦闘・図鑑の表示サイズ（最大 236×170）に対して大きすぎるため、ゲームには入れていない（検品にだけ使った）
   ・自動生成：work/r164/build_data.py
   ========================================================= */
(function (root) {
  'use strict';
  root.ENEMY_REDESIGN = {
 "version": 1,
 "pack": "trade_quest_redesign_001_164",
 "list": [
  {
   "no": "001",
   "id": "slime",
   "name": "蒼葉の雫精",
   "oldName": "スライム",
   "file": "assets/enemies_redesign/001_slime.png",
   "src": "png_512/001_slime.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    75,
    77,
    361,
    358
   ],
   "size": "small",
   "draw": [
    119,
    118
   ],
   "lift": 0
  },
  {
   "no": "002",
   "id": "slime_red",
   "name": "灼核の熔妖",
   "oldName": "レッドスライム",
   "file": "assets/enemies_redesign/002_slime_red.png",
   "src": "png_512/002_slime_red.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    107,
    364,
    298
   ],
   "size": "small",
   "draw": [
    144,
    118
   ],
   "lift": 0
  },
  {
   "no": "003",
   "id": "bee",
   "name": "碧金の刃蜂",
   "oldName": "キラービー",
   "file": "assets/enemies_redesign/003_bee.png",
   "src": "png_512/003_bee.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    73,
    364,
    365
   ],
   "size": "small",
   "draw": [
    118,
    118
   ],
   "lift": 12
  },
  {
   "no": "004",
   "id": "mushroom",
   "name": "朽茸の菌鬼",
   "oldName": "まよいキノコ",
   "file": "assets/enemies_redesign/004_mushroom.png",
   "src": "png_512/004_mushroom.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    93,
    74,
    326,
    364
   ],
   "size": "normal",
   "draw": [
    129,
    144
   ],
   "lift": 0
  },
  {
   "no": "005",
   "id": "bug",
   "name": "深緑の鎌跳獣",
   "oldName": "レンジバッタ",
   "file": "assets/enemies_redesign/005_bug.png",
   "src": "png_512/005_bug.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    80,
    364,
    351
   ],
   "size": "small",
   "draw": [
    122,
    118
   ],
   "lift": 0
  },
  {
   "no": "006",
   "id": "bat",
   "name": "紫煙の幻翼",
   "oldName": "乖離コウモリ",
   "file": "assets/enemies_redesign/006_bat.png",
   "src": "png_512/006_bat.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    73,
    113,
    365,
    286
   ],
   "size": "small",
   "draw": [
    151,
    118
   ],
   "lift": 12
  },
  {
   "no": "007",
   "id": "wolf",
   "name": "蒼紋の呪狼",
   "oldName": "グレイウルフ",
   "file": "assets/enemies_redesign/007_wolf.png",
   "src": "png_512/007_wolf.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    108,
    364,
    295
   ],
   "size": "normal",
   "draw": [
    178,
    144
   ],
   "lift": 0
  },
  {
   "no": "008",
   "id": "snake",
   "name": "蔓鱗の森蛇",
   "oldName": "ならびヘビ",
   "file": "assets/enemies_redesign/008_snake.png",
   "src": "png_512/008_snake.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    79,
    364,
    353
   ],
   "size": "small",
   "draw": [
    122,
    118
   ],
   "lift": 0
  },
  {
   "no": "009",
   "id": "bandit",
   "name": "荒野の曲刀賊",
   "oldName": "山賊",
   "file": "assets/enemies_redesign/009_bandit.png",
   "src": "png_512/009_bandit.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    102,
    74,
    308,
    363
   ],
   "size": "normal",
   "draw": [
    122,
    144
   ],
   "lift": 0
  },
  {
   "no": "010",
   "id": "ghost",
   "name": "時囚の亡影",
   "oldName": "5分足ゴースト",
   "file": "assets/enemies_redesign/010_ghost.png",
   "src": "png_512/010_ghost.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    99,
    73,
    314,
    365
   ],
   "size": "normal",
   "draw": [
    124,
    144
   ],
   "lift": 14
  },
  {
   "no": "011",
   "id": "skeleton",
   "name": "骨装の墓守",
   "oldName": "スケルトン",
   "file": null,
   "src": "png_512/011_skeleton.png",
   "status": "held",
   "reason": "体のまわりに白っぽい半透明の背景の残り（暗い背景で灰色の縁として見える。足もとで直線的に切れている）",
   "bbox": [
    123,
    73,
    267,
    369
   ],
   "size": "big",
   "draw": [
    123,
    170
   ],
   "lift": 0
  },
  {
   "no": "012",
   "id": "lizard",
   "name": "偽紋の鱗蜥",
   "oldName": "ダマシトカゲ",
   "file": null,
   "src": "png_512/012_lizard.png",
   "status": "held",
   "reason": "別の素材の印（水色の円とひし形のマーク）が混入。左端・下端が直線的に切れている。拡大でぼやけている",
   "bbox": [
    72,
    87,
    368,
    339
   ],
   "size": "normal",
   "draw": [
    156,
    144
   ],
   "lift": 0
  },
  {
   "no": "013",
   "id": "mole",
   "name": "地脈の反転獣",
   "oldName": "反転モグラ",
   "file": null,
   "src": "png_512/013_mole.png",
   "status": "held",
   "reason": "右端と下端が直線的に切れている（体が欠けている）。拡大でぼやけている",
   "bbox": [
    72,
    84,
    382,
    345
   ],
   "size": "small",
   "draw": [
    131,
    118
   ],
   "lift": 0
  },
  {
   "no": "014",
   "id": "golem",
   "name": "岩脈の巨兵",
   "oldName": "ストーンゴーレム",
   "file": null,
   "src": "png_512/014_golem.png",
   "status": "held",
   "reason": "体のまわりの半透明の残りが、右と下で直線的に切れている（暗い背景で縦・横の線として見える）",
   "bbox": [
    117,
    72,
    280,
    370
   ],
   "size": "big",
   "draw": [
    129,
    170
   ],
   "lift": 0
  },
  {
   "no": "015",
   "id": "imp",
   "name": "灼角の小鬼",
   "oldName": "インプ",
   "file": null,
   "src": "png_512/015_imp.png",
   "status": "held",
   "reason": "左右が直線的に切れている。右側に枠線の残り（縦の点線）。白い縁どりが残っている",
   "bbox": [
    72,
    78,
    368,
    356
   ],
   "size": "small",
   "draw": [
    122,
    118
   ],
   "lift": 0
  },
  {
   "no": "016",
   "id": "dark_mage",
   "name": "影紋の禁術師",
   "oldName": "闇の魔道士",
   "file": "assets/enemies_redesign/016_dark_mage.png",
   "src": "png_512/016_dark_mage.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    118,
    70,
    276,
    372
   ],
   "size": "normal",
   "draw": [
    107,
    144
   ],
   "lift": 0
  },
  {
   "no": "017",
   "id": "slime_metal",
   "name": "銀鏡の流体精",
   "oldName": "メタルスライム",
   "file": "assets/enemies_redesign/017_slime_metal.png",
   "src": "png_512/017_slime_metal.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    94,
    72,
    322,
    368
   ],
   "size": "small",
   "draw": [
    103,
    118
   ],
   "lift": 0
  },
  {
   "no": "018",
   "id": "bug_poison",
   "name": "毒棘の甲虫",
   "oldName": "ポイズンビートル",
   "file": null,
   "src": "png_512/018_bug_poison.png",
   "status": "held",
   "reason": "右の羽の先が縦の直線で切れている（羽が欠けている）",
   "bbox": [
    111,
    73,
    291,
    369
   ],
   "size": "normal",
   "draw": [
    114,
    144
   ],
   "lift": 0
  },
  {
   "no": "019",
   "id": "fear_shadow",
   "name": "恐慌の黒影",
   "oldName": "恐怖の影",
   "file": null,
   "src": "png_512/019_fear_shadow.png",
   "status": "held",
   "reason": "左端に、本体から離れた縦長の帯（枠・隣のコマの残り）が混入。下端が直線的に切れている",
   "bbox": [
    116,
    73,
    278,
    369
   ],
   "size": "normal",
   "draw": [
    108,
    144
   ],
   "lift": 0
  },
  {
   "no": "020",
   "id": "crab",
   "name": "礁岩の鋏獣",
   "oldName": "岩ガニ",
   "file": "assets/enemies_redesign/020_crab.png",
   "src": "png_512/020_crab.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    73,
    81,
    369,
    350
   ],
   "size": "small",
   "draw": [
    124,
    118
   ],
   "lift": 0
  },
  {
   "no": "021",
   "id": "bat_fire",
   "name": "火口の炉翼蝠",
   "oldName": "ファイアバット",
   "file": "assets/enemies_redesign/021_bat_fire.png",
   "src": "png_512/021_bat_fire.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    72,
    360,
    341
   ],
   "size": "small",
   "draw": [
    125,
    118
   ],
   "lift": 12
  },
  {
   "no": "022",
   "id": "sand_mole",
   "name": "砂鐘の掘削獣",
   "oldName": "砂モグラ",
   "file": "assets/enemies_redesign/022_sand_mole.png",
   "src": "png_512/022_sand_mole.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    86,
    103,
    348,
    300
   ],
   "size": "small",
   "draw": [
    137,
    118
   ],
   "lift": 0
  },
  {
   "no": "023",
   "id": "snake_ice",
   "name": "氷鏡の環蛇",
   "oldName": "フロストサーペント",
   "file": "assets/enemies_redesign/023_snake_ice.png",
   "src": "png_512/023_snake_ice.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    96,
    73,
    341,
    365
   ],
   "size": "small",
   "draw": [
    110,
    118
   ],
   "lift": 0
  },
  {
   "no": "024",
   "id": "wolf_dark",
   "name": "影縫いの裂尾狼",
   "oldName": "シャドウウルフ",
   "file": "assets/enemies_redesign/024_wolf_dark.png",
   "src": "png_512/024_wolf_dark.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    70,
    361,
    366
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "025",
   "id": "golem_iron",
   "name": "鋲炉の鉄歩兵",
   "oldName": "アイアンゴーレム",
   "file": "assets/enemies_redesign/025_golem_iron.png",
   "src": "png_512/025_golem_iron.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    73,
    360,
    358
   ],
   "size": "big",
   "draw": [
    171,
    170
   ],
   "lift": 0
  },
  {
   "no": "026",
   "id": "ghost_dark",
   "name": "喪鐘の帳霊",
   "oldName": "ダークレイス",
   "file": "assets/enemies_redesign/026_ghost_dark.png",
   "src": "png_512/026_ghost_dark.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    108,
    70,
    328,
    371
   ],
   "size": "normal",
   "draw": [
    127,
    144
   ],
   "lift": 14
  },
  {
   "no": "027",
   "id": "bug_armor",
   "name": "峰盾の重甲虫",
   "oldName": "アーマービートル",
   "file": "assets/enemies_redesign/027_bug_armor.png",
   "src": "png_512/027_bug_armor.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    82,
    83,
    351,
    338
   ],
   "size": "normal",
   "draw": [
    150,
    144
   ],
   "lift": 0
  },
  {
   "no": "028",
   "id": "slime_gold",
   "name": "金箔の折鶴精",
   "oldName": "ゴールドスライム",
   "file": "assets/enemies_redesign/028_slime_gold.png",
   "src": "png_512/028_slime_gold.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    85,
    358,
    343
   ],
   "size": "small",
   "draw": [
    123,
    118
   ],
   "lift": 0
  },
  {
   "no": "029",
   "id": "slime_green",
   "name": "翠脈の胞嚢獣",
   "oldName": "グリーンスライム",
   "file": "assets/enemies_redesign/029_slime_green.png",
   "src": "png_512/029_slime_green.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    105,
    74,
    319,
    358
   ],
   "size": "small",
   "draw": [
    105,
    118
   ],
   "lift": 0
  },
  {
   "no": "030",
   "id": "rabbit",
   "name": "月鋏の草跳兎",
   "oldName": "ツノウサギ",
   "file": "assets/enemies_redesign/030_rabbit.png",
   "src": "png_512/030_rabbit.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    103,
    73,
    323,
    361
   ],
   "size": "small",
   "draw": [
    106,
    118
   ],
   "lift": 0
  },
  {
   "no": "031",
   "id": "sparrow_hawk",
   "name": "銅羽の風切鷹",
   "oldName": "ハイタカ",
   "file": "assets/enemies_redesign/031_sparrow_hawk.png",
   "src": "png_512/031_sparrow_hawk.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    76,
    368,
    352
   ],
   "size": "small",
   "draw": [
    123,
    118
   ],
   "lift": 12
  },
  {
   "no": "032",
   "id": "petal",
   "name": "花弁紡ぎの糸車",
   "oldName": "ハナビラ",
   "file": "assets/enemies_redesign/032_petal.png",
   "src": "png_512/032_petal.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    70,
    357,
    369
   ],
   "size": "small",
   "draw": [
    114,
    118
   ],
   "lift": 0
  },
  {
   "no": "033",
   "id": "slime_blue_big",
   "name": "群青の潮織獣",
   "oldName": "ビッグスライム",
   "file": "assets/enemies_redesign/033_slime_blue_big.png",
   "src": "png_512/033_slime_blue_big.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    70,
    372,
    366
   ],
   "size": "big",
   "draw": [
    173,
    170
   ],
   "lift": 0
  },
  {
   "no": "034",
   "id": "crow",
   "name": "黒樹皮の鍵烏",
   "oldName": "森ガラス",
   "file": "assets/enemies_redesign/034_crow.png",
   "src": "png_512/034_crow.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    90,
    69,
    339,
    365
   ],
   "size": "small",
   "draw": [
    110,
    118
   ],
   "lift": 0
  },
  {
   "no": "035",
   "id": "boar",
   "name": "赤土の犂牙獣",
   "oldName": "イノシシ",
   "file": "assets/enemies_redesign/035_boar.png",
   "src": "png_512/035_boar.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    81,
    81,
    358,
    348
   ],
   "size": "normal",
   "draw": [
    148,
    144
   ],
   "lift": 0
  },
  {
   "no": "036",
   "id": "maneater",
   "name": "牙籠の罠花",
   "oldName": "マンイーター",
   "file": "assets/enemies_redesign/036_maneater.png",
   "src": "png_512/036_maneater.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    94,
    69,
    338,
    372
   ],
   "size": "normal",
   "draw": [
    131,
    144
   ],
   "lift": 0
  },
  {
   "no": "037",
   "id": "mushroom_king",
   "name": "菌傘の巡礼王",
   "oldName": "キノコ大王",
   "file": "assets/enemies_redesign/037_mushroom_king.png",
   "src": "png_512/037_mushroom_king.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    89,
    75,
    345,
    361
   ],
   "size": "big",
   "draw": [
    162,
    170
   ],
   "lift": 0
  },
  {
   "no": "038",
   "id": "forest_fairy",
   "name": "若枝の灯織り",
   "oldName": "森の精霊",
   "file": "assets/enemies_redesign/038_forest_fairy.png",
   "src": "png_512/038_forest_fairy.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    86,
    70,
    348,
    375
   ],
   "size": "small",
   "draw": [
    110,
    118
   ],
   "lift": 12
  },
  {
   "no": "039",
   "id": "treant",
   "name": "洞木の歩廊守",
   "oldName": "トレント",
   "file": "assets/enemies_redesign/039_treant.png",
   "src": "png_512/039_treant.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    88,
    68,
    346,
    375
   ],
   "size": "big",
   "draw": [
    157,
    170
   ],
   "lift": 0
  },
  {
   "no": "040",
   "id": "vulture",
   "name": "白炉の葬翼",
   "oldName": "ハゲワシ",
   "file": "assets/enemies_redesign/040_vulture.png",
   "src": "png_512/040_vulture.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    68,
    369,
    371
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 0
  },
  {
   "no": "041",
   "id": "scorpion",
   "name": "琥珀針の砂鋏",
   "oldName": "サソリ",
   "file": "assets/enemies_redesign/041_scorpion.png",
   "src": "png_512/041_scorpion.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    76,
    67,
    365,
    363
   ],
   "size": "normal",
   "draw": [
    145,
    144
   ],
   "lift": 0
  },
  {
   "no": "042",
   "id": "wild_dog",
   "name": "風笛耳の斥候犬",
   "oldName": "ワイルドドッグ",
   "file": "assets/enemies_redesign/042_wild_dog.png",
   "src": "png_512/042_wild_dog.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    88,
    74,
    352,
    362
   ],
   "size": "small",
   "draw": [
    115,
    118
   ],
   "lift": 0
  },
  {
   "no": "043",
   "id": "mimic",
   "name": "蝶番顎の旅鞄",
   "oldName": "ミミック",
   "file": "assets/enemies_redesign/043_mimic.png",
   "src": "png_512/043_mimic.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    93,
    71,
    345,
    366
   ],
   "size": "normal",
   "draw": [
    136,
    144
   ],
   "lift": 0
  },
  {
   "no": "044",
   "id": "sand_lizard",
   "name": "乾裂紋の走蜥",
   "oldName": "荒野トカゲ",
   "file": "assets/enemies_redesign/044_sand_lizard.png",
   "src": "png_512/044_sand_lizard.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    82,
    81,
    356,
    346
   ],
   "size": "normal",
   "draw": [
    148,
    144
   ],
   "lift": 0
  },
  {
   "no": "045",
   "id": "cave_crab",
   "name": "蒼晶背の洞鋏",
   "oldName": "洞窟ガニ",
   "file": "assets/enemies_redesign/045_cave_crab.png",
   "src": "png_512/045_cave_crab.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    73,
    359,
    359
   ],
   "size": "small",
   "draw": [
    118,
    118
   ],
   "lift": 0
  },
  {
   "no": "046",
   "id": "stalactite_golem",
   "name": "石筍肋の洞守",
   "oldName": "鍾乳石ゴーレム",
   "file": "assets/enemies_redesign/046_stalactite_golem.png",
   "src": "png_512/046_stalactite_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    97,
    69,
    340,
    373
   ],
   "size": "normal",
   "draw": [
    131,
    144
   ],
   "lift": 0
  },
  {
   "no": "047",
   "id": "zombie",
   "name": "亡札の相場師",
   "oldName": "ゾンビトレーダー",
   "file": "assets/enemies_redesign/047_zombie.png",
   "src": "png_512/047_zombie.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    68,
    356,
    371
   ],
   "size": "normal",
   "draw": [
    138,
    144
   ],
   "lift": 0
  },
  {
   "no": "048",
   "id": "floating_eye",
   "name": "瞼環の望遠蟲",
   "oldName": "ウォッチャー",
   "file": "assets/enemies_redesign/048_floating_eye.png",
   "src": "png_512/048_floating_eye.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    66,
    362,
    375
   ],
   "size": "normal",
   "draw": [
    139,
    144
   ],
   "lift": 0
  },
  {
   "no": "049",
   "id": "ore_slime",
   "name": "鉱脈織りの晶繭",
   "oldName": "鉱石スライム",
   "file": "assets/enemies_redesign/049_ore_slime.png",
   "src": "png_512/049_ore_slime.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    79,
    79,
    361,
    357
   ],
   "size": "small",
   "draw": [
    119,
    118
   ],
   "lift": 0
  },
  {
   "no": "050",
   "id": "candle_golem",
   "name": "陽陰炉の柱兵",
   "oldName": "ローソク足ゴーレム",
   "file": "assets/enemies_redesign/050_candle_golem.png",
   "src": "png_512/050_candle_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    137,
    69,
    254,
    373
   ],
   "size": "normal",
   "draw": [
    98,
    144
   ],
   "lift": 0
  },
  {
   "no": "051",
   "id": "bear_shadow",
   "name": "熊爪の影裂き",
   "oldName": "ベアの影",
   "file": "assets/enemies_redesign/051_bear_shadow.png",
   "src": "png_512/051_bear_shadow.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    90,
    70,
    341,
    367
   ],
   "size": "big",
   "draw": [
    158,
    170
   ],
   "lift": 0
  },
  {
   "no": "052",
   "id": "bandit_archer",
   "name": "楔弓の崖盗",
   "oldName": "山賊弓兵",
   "file": "assets/enemies_redesign/052_bandit_archer.png",
   "src": "png_512/052_bandit_archer.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    69,
    364,
    368
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "053",
   "id": "rock_lizard",
   "name": "岩扇の盾蜥",
   "oldName": "ロックリザード",
   "file": "assets/enemies_redesign/053_rock_lizard.png",
   "src": "png_512/053_rock_lizard.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    72,
    72,
    370,
    365
   ],
   "size": "normal",
   "draw": [
    146,
    144
   ],
   "lift": 0
  },
  {
   "no": "054",
   "id": "mountain_hawk",
   "name": "山稜の帆翼鷹",
   "oldName": "山鷹",
   "file": "assets/enemies_redesign/054_mountain_hawk.png",
   "src": "png_512/054_mountain_hawk.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    90,
    68,
    353,
    371
   ],
   "size": "normal",
   "draw": [
    137,
    144
   ],
   "lift": 0
  },
  {
   "no": "055",
   "id": "mountain_cat",
   "name": "鈴石踏みの山猫",
   "oldName": "ヤマネコ",
   "file": "assets/enemies_redesign/055_mountain_cat.png",
   "src": "png_512/055_mountain_cat.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    99,
    76,
    339,
    358
   ],
   "size": "normal",
   "draw": [
    136,
    144
   ],
   "lift": 0
  },
  {
   "no": "056",
   "id": "rock_golem",
   "name": "断層肩の岩運び",
   "oldName": "ロックゴーレム",
   "file": "assets/enemies_redesign/056_rock_golem.png",
   "src": "png_512/056_rock_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    105,
    70,
    316,
    370
   ],
   "size": "big",
   "draw": [
    145,
    170
   ],
   "lift": 0
  },
  {
   "no": "057",
   "id": "harpy",
   "name": "歌骨の羽奏者",
   "oldName": "ハーピー",
   "file": "assets/enemies_redesign/057_harpy.png",
   "src": "png_512/057_harpy.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    75,
    68,
    365,
    375
   ],
   "size": "big",
   "draw": [
    165,
    170
   ],
   "lift": 0
  },
  {
   "no": "058",
   "id": "slime_rainbow",
   "name": "虹膜の光帆獣",
   "oldName": "レインボースライム",
   "file": "assets/enemies_redesign/058_slime_rainbow.png",
   "src": "png_512/058_slime_rainbow.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    83,
    68,
    359,
    369
   ],
   "size": "small",
   "draw": [
    115,
    118
   ],
   "lift": 0
  },
  {
   "no": "059",
   "id": "jelly_float",
   "name": "浮鐘の透海月",
   "oldName": "フロートジェリー",
   "file": "assets/enemies_redesign/059_jelly_float.png",
   "src": "png_512/059_jelly_float.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    76,
    66,
    366,
    371
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 14
  },
  {
   "no": "060",
   "id": "reef_crab",
   "name": "葉舟背の汀鋏",
   "oldName": "リーフクラブ",
   "file": "assets/enemies_redesign/060_reef_crab.png",
   "src": "png_512/060_reef_crab.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    82,
    363,
    339
   ],
   "size": "normal",
   "draw": [
    154,
    144
   ],
   "lift": 0
  },
  {
   "no": "061",
   "id": "gull_pirate",
   "name": "潮笛の略奪鴎",
   "oldName": "カモメ海賊",
   "file": "assets/enemies_redesign/061_gull_pirate.png",
   "src": "png_512/061_gull_pirate.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    79,
    77,
    358,
    362
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "062",
   "id": "sea_serpent",
   "name": "海図鱗の環蛇",
   "oldName": "シーサーペント",
   "file": "assets/enemies_redesign/062_sea_serpent.png",
   "src": "png_512/062_sea_serpent.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    70,
    70,
    372,
    371
   ],
   "size": "big",
   "draw": [
    170,
    170
   ],
   "lift": 0
  },
  {
   "no": "063",
   "id": "smoke_wraith",
   "name": "煤面の煙突霊",
   "oldName": "煤煙の亡霊",
   "file": "assets/enemies_redesign/063_smoke_wraith.png",
   "src": "png_512/063_smoke_wraith.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    114,
    69,
    300,
    372
   ],
   "size": "normal",
   "draw": [
    116,
    144
   ],
   "lift": 14
  },
  {
   "no": "064",
   "id": "iron_beetle",
   "name": "鋲殻の炉甲虫",
   "oldName": "鉄甲虫",
   "file": "assets/enemies_redesign/064_iron_beetle.png",
   "src": "png_512/064_iron_beetle.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    73,
    70,
    367,
    368
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "065",
   "id": "chain_hound",
   "name": "軛鎖の追跡犬",
   "oldName": "鎖の猟犬",
   "file": "assets/enemies_redesign/065_chain_hound.png",
   "src": "png_512/065_chain_hound.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    75,
    85,
    364,
    342
   ],
   "size": "normal",
   "draw": [
    153,
    144
   ],
   "lift": 0
  },
  {
   "no": "066",
   "id": "ash_golem",
   "name": "灰窯の歩行炉",
   "oldName": "灰のゴーレム",
   "file": "assets/enemies_redesign/066_ash_golem.png",
   "src": "png_512/066_ash_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    67,
    362,
    374
   ],
   "size": "normal",
   "draw": [
    139,
    144
   ],
   "lift": 0
  },
  {
   "no": "067",
   "id": "mine_imp",
   "name": "鉱灯耳の坑鬼",
   "oldName": "鉱山インプ",
   "file": "assets/enemies_redesign/067_mine_imp.png",
   "src": "png_512/067_mine_imp.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    110,
    69,
    299,
    373
   ],
   "size": "normal",
   "draw": [
    115,
    144
   ],
   "lift": 0
  },
  {
   "no": "068",
   "id": "ore_bat",
   "name": "晶洞翼の夜蝠",
   "oldName": "鉱石コウモリ",
   "file": "assets/enemies_redesign/068_ore_bat.png",
   "src": "png_512/068_ore_bat.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    73,
    371,
    337
   ],
   "size": "small",
   "draw": [
    130,
    118
   ],
   "lift": 12
  },
  {
   "no": "069",
   "id": "chain_warden",
   "name": "環鎖の牢番",
   "oldName": "鎖の看守",
   "file": "assets/enemies_redesign/069_chain_warden.png",
   "src": "png_512/069_chain_warden.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    83,
    67,
    354,
    373
   ],
   "size": "normal",
   "draw": [
    137,
    144
   ],
   "lift": 0
  },
  {
   "no": "070",
   "id": "drill_golem",
   "name": "螺旋杭の掘進兵",
   "oldName": "ドリルゴーレム",
   "file": "assets/enemies_redesign/070_drill_golem.png",
   "src": "png_512/070_drill_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    73,
    359,
    362
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 0
  },
  {
   "no": "071",
   "id": "tax_hound",
   "name": "封蝋鼻の徴収犬",
   "oldName": "徴税猟犬",
   "file": "assets/enemies_redesign/071_tax_hound.png",
   "src": "png_512/071_tax_hound.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    97,
    69,
    341,
    360
   ],
   "size": "normal",
   "draw": [
    136,
    144
   ],
   "lift": 0
  },
  {
   "no": "072",
   "id": "paper_wraith",
   "name": "勘定綴じの帳霊",
   "oldName": "帳簿の亡霊",
   "file": "assets/enemies_redesign/072_paper_wraith.png",
   "src": "png_512/072_paper_wraith.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    69,
    366,
    372
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 14
  },
  {
   "no": "073",
   "id": "coin_golem",
   "name": "穴銭輪の転兵",
   "oldName": "金貨ゴーレム",
   "file": "assets/enemies_redesign/073_coin_golem.png",
   "src": "png_512/073_coin_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    75,
    75,
    363,
    362
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "074",
   "id": "federal_soldier",
   "name": "銅票盾の連兵",
   "oldName": "連邦兵",
   "file": "assets/enemies_redesign/074_federal_soldier.png",
   "src": "png_512/074_federal_soldier.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    67,
    371,
    373
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 0
  },
  {
   "no": "075",
   "id": "federal_captain",
   "name": "藍章の旗槍長",
   "oldName": "連邦隊長",
   "file": "assets/enemies_redesign/075_federal_captain.png",
   "src": "png_512/075_federal_captain.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    68,
    67,
    373,
    375
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 0
  },
  {
   "no": "076",
   "id": "ledger_mimic",
   "name": "算盤牙の帳喰い",
   "oldName": "帳簿ミミック",
   "file": "assets/enemies_redesign/076_ledger_mimic.png",
   "src": "png_512/076_ledger_mimic.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    77,
    363,
    357
   ],
   "size": "normal",
   "draw": [
    146,
    144
   ],
   "lift": 0
  },
  {
   "no": "077",
   "id": "archive_golem",
   "name": "書庫梁の鍵番",
   "oldName": "記録庫の守衛",
   "file": "assets/enemies_redesign/077_archive_golem.png",
   "src": "png_512/077_archive_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    81,
    67,
    362,
    371
   ],
   "size": "normal",
   "draw": [
    141,
    144
   ],
   "lift": 0
  },
  {
   "no": "078",
   "id": "royal_guard",
   "name": "白封の近衛槍",
   "oldName": "親衛隊",
   "file": "assets/enemies_redesign/078_royal_guard.png",
   "src": "png_512/078_royal_guard.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    68,
    373,
    373
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "079",
   "id": "salt_wolf",
   "name": "潮泡鬣の浜狼",
   "oldName": "潮風の狼",
   "file": "assets/enemies_redesign/079_salt_wolf.png",
   "src": "png_512/079_salt_wolf.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    93,
    75,
    346,
    362
   ],
   "size": "normal",
   "draw": [
    138,
    144
   ],
   "lift": 0
  },
  {
   "no": "080",
   "id": "rust_crab",
   "name": "錆錨の横歩き",
   "oldName": "錆びガニ",
   "file": "assets/enemies_redesign/080_rust_crab.png",
   "src": "png_512/080_rust_crab.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    72,
    364,
    363
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "081",
   "id": "ruin_shade",
   "name": "崩梁の影縫い",
   "oldName": "廃墟の影",
   "file": "assets/enemies_redesign/081_ruin_shade.png",
   "src": "png_512/081_ruin_shade.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    69,
    360,
    368
   ],
   "size": "normal",
   "draw": [
    141,
    144
   ],
   "lift": 0
  },
  {
   "no": "082",
   "id": "lantern_wisp",
   "name": "燈芯角の灯蛾",
   "oldName": "ランタンの火",
   "file": "assets/enemies_redesign/082_lantern_wisp.png",
   "src": "png_512/082_lantern_wisp.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    88,
    75,
    350,
    360
   ],
   "size": "normal",
   "draw": [
    140,
    144
   ],
   "lift": 14
  },
  {
   "no": "083",
   "id": "drift_golem",
   "name": "舟肋の漂木兵",
   "oldName": "流木のゴーレム",
   "file": "assets/enemies_redesign/083_drift_golem.png",
   "src": "png_512/083_drift_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    90,
    71,
    346,
    363
   ],
   "size": "normal",
   "draw": [
    137,
    144
   ],
   "lift": 0
  },
  {
   "no": "084",
   "id": "pirate_raider",
   "name": "帆布面の外海賊",
   "oldName": "外海の海賊",
   "file": "assets/enemies_redesign/084_pirate_raider.png",
   "src": "png_512/084_pirate_raider.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    66,
    371,
    373
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 0
  },
  {
   "no": "085",
   "id": "storm_ray",
   "name": "雷帆の飛電鱝",
   "oldName": "嵐エイ",
   "file": "assets/enemies_redesign/085_storm_ray.png",
   "src": "png_512/085_storm_ray.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    73,
    368,
    362
   ],
   "size": "normal",
   "draw": [
    146,
    144
   ],
   "lift": 14
  },
  {
   "no": "086",
   "id": "kraken_arm",
   "name": "断潮の腕冠",
   "oldName": "クラーケンの腕",
   "file": "assets/enemies_redesign/086_kraken_arm.png",
   "src": "png_512/086_kraken_arm.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    84,
    68,
    352,
    370
   ],
   "size": "big",
   "draw": [
    162,
    170
   ],
   "lift": 0
  },
  {
   "no": "087",
   "id": "deep_guard",
   "name": "深灯の潜門衛",
   "oldName": "深海の番人",
   "file": "assets/enemies_redesign/087_deep_guard.png",
   "src": "png_512/087_deep_guard.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    69,
    347,
    376
   ],
   "size": "normal",
   "draw": [
    133,
    144
   ],
   "lift": 14
  },
  {
   "no": "088",
   "id": "coral_wraith",
   "name": "珊瑚笛の葬霊",
   "oldName": "珊瑚の亡霊",
   "file": "assets/enemies_redesign/088_coral_wraith.png",
   "src": "png_512/088_coral_wraith.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    96,
    68,
    324,
    373
   ],
   "size": "normal",
   "draw": [
    125,
    144
   ],
   "lift": 14
  },
  {
   "no": "089",
   "id": "archive_eel",
   "name": "刻文鰭の巻鰻",
   "oldName": "記録ウナギ",
   "file": "assets/enemies_redesign/089_archive_eel.png",
   "src": "png_512/089_archive_eel.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    72,
    361,
    366
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 14
  },
  {
   "no": "090",
   "id": "chrono_moth",
   "name": "秒針翅の宵蛾",
   "oldName": "時蛾",
   "file": "assets/enemies_redesign/090_chrono_moth.png",
   "src": "png_512/090_chrono_moth.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    72,
    68,
    371,
    375
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 14
  },
  {
   "no": "091",
   "id": "hourglass_golem",
   "name": "落砂腰の時守",
   "oldName": "砂時計のゴーレム",
   "file": "assets/enemies_redesign/091_hourglass_golem.png",
   "src": "png_512/091_hourglass_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    98,
    70,
    322,
    371
   ],
   "size": "normal",
   "draw": [
    125,
    144
   ],
   "lift": 0
  },
  {
   "no": "092",
   "id": "bell_wraith",
   "name": "鐘舌衣の響霊",
   "oldName": "鐘の亡霊",
   "file": "assets/enemies_redesign/092_bell_wraith.png",
   "src": "png_512/092_bell_wraith.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    90,
    71,
    346,
    368
   ],
   "size": "normal",
   "draw": [
    135,
    144
   ],
   "lift": 14
  },
  {
   "no": "093",
   "id": "debt_collector",
   "name": "余刻刈りの徴収官",
   "oldName": "時間の取立人",
   "file": "assets/enemies_redesign/093_debt_collector.png",
   "src": "png_512/093_debt_collector.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    76,
    68,
    366,
    374
   ],
   "size": "normal",
   "draw": [
    141,
    144
   ],
   "lift": 0
  },
  {
   "no": "094",
   "id": "patrol_drone",
   "name": "巡視環の翼機",
   "oldName": "監視ドローン",
   "file": "assets/enemies_redesign/094_patrol_drone.png",
   "src": "png_512/094_patrol_drone.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    69,
    66,
    374,
    366
   ],
   "size": "normal",
   "draw": [
    147,
    144
   ],
   "lift": 14
  },
  {
   "no": "095",
   "id": "sentry_unit",
   "name": "三盾脚の門機",
   "oldName": "警備ユニット",
   "file": "assets/enemies_redesign/095_sentry_unit.png",
   "src": "png_512/095_sentry_unit.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    70,
    66,
    373,
    379
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "096",
   "id": "repair_bot",
   "name": "縫接針の補修虫",
   "oldName": "修理ボット",
   "file": "assets/enemies_redesign/096_repair_bot.png",
   "src": "png_512/096_repair_bot.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    75,
    73,
    368,
    365
   ],
   "size": "normal",
   "draw": [
    145,
    144
   ],
   "lift": 0
  },
  {
   "no": "097",
   "id": "data_leech",
   "name": "符号吸いの硝子蛭",
   "oldName": "データリーチ",
   "file": "assets/enemies_redesign/097_data_leech.png",
   "src": "png_512/097_data_leech.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    75,
    72,
    364,
    355
   ],
   "size": "normal",
   "draw": [
    148,
    144
   ],
   "lift": 0
  },
  {
   "no": "098",
   "id": "rust_sentinel",
   "name": "酸化甲の廃哨兵",
   "oldName": "錆びた番兵",
   "file": "assets/enemies_redesign/098_rust_sentinel.png",
   "src": "png_512/098_rust_sentinel.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    66,
    66,
    379,
    379
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "099",
   "id": "core_defender",
   "name": "隔壁殻の核衛機",
   "oldName": "中枢防衛ユニット",
   "file": "assets/enemies_redesign/099_core_defender.png",
   "src": "png_512/099_core_defender.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    82,
    71,
    358,
    366
   ],
   "size": "normal",
   "draw": [
    141,
    144
   ],
   "lift": 0
  },
  {
   "no": "100",
   "id": "rune_knight",
   "name": "刻紋刃の碑騎士",
   "oldName": "ルーンの騎士",
   "file": "assets/enemies_redesign/100_rune_knight.png",
   "src": "png_512/100_rune_knight.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    73,
    66,
    372,
    373
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "101",
   "id": "grimoire",
   "name": "頁翼の飛書獣",
   "oldName": "飛び回る魔導書",
   "file": "assets/enemies_redesign/101_grimoire.png",
   "src": "png_512/101_grimoire.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    70,
    68,
    374,
    367
   ],
   "size": "normal",
   "draw": [
    147,
    144
   ],
   "lift": 14
  },
  {
   "no": "102",
   "id": "mana_golem",
   "name": "魔脈導管の歩塔",
   "oldName": "マナゴーレム",
   "file": "assets/enemies_redesign/102_mana_golem.png",
   "src": "png_512/102_mana_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    93,
    67,
    331,
    373
   ],
   "size": "normal",
   "draw": [
    128,
    144
   ],
   "lift": 0
  },
  {
   "no": "103",
   "id": "arcane_eye",
   "name": "虹彩儀の浮眼",
   "oldName": "魔導の眼",
   "file": "assets/enemies_redesign/103_arcane_eye.png",
   "src": "png_512/103_arcane_eye.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    105,
    67,
    324,
    377
   ],
   "size": "normal",
   "draw": [
    124,
    144
   ],
   "lift": 14
  },
  {
   "no": "104",
   "id": "summoned_chimera",
   "name": "三相角の継獣",
   "oldName": "召喚魔獣キマイラ",
   "file": "assets/enemies_redesign/104_summoned_chimera.png",
   "src": "png_512/104_summoned_chimera.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    80,
    363,
    353
   ],
   "size": "big",
   "draw": [
    175,
    170
   ],
   "lift": 0
  },
  {
   "no": "105",
   "id": "storm_harpy",
   "name": "雷弦翼の嵐歌姫",
   "oldName": "嵐のハーピー",
   "file": "assets/enemies_redesign/105_storm_harpy.png",
   "src": "png_512/105_storm_harpy.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    70,
    69,
    372,
    372
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 14
  },
  {
   "no": "106",
   "id": "cloud_slime",
   "name": "雲帆の浮航獣",
   "oldName": "クラウドスライム",
   "file": "assets/enemies_redesign/106_cloud_slime.png",
   "src": "png_512/106_cloud_slime.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    76,
    363,
    354
   ],
   "size": "normal",
   "draw": [
    148,
    144
   ],
   "lift": 14
  },
  {
   "no": "107",
   "id": "star_sentinel",
   "name": "星盤角の夜番",
   "oldName": "星見の番人",
   "file": "assets/enemies_redesign/107_star_sentinel.png",
   "src": "png_512/107_star_sentinel.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    85,
    69,
    353,
    372
   ],
   "size": "normal",
   "draw": [
    137,
    144
   ],
   "lift": 0
  },
  {
   "no": "108",
   "id": "greed_shade",
   "name": "願貨の反響貝",
   "oldName": "欲望の残響",
   "file": "assets/enemies_redesign/108_greed_shade.png",
   "src": "png_512/108_greed_shade.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    85,
    77,
    356,
    356
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "109",
   "id": "fear_shade",
   "name": "怯声の折耳獣",
   "oldName": "恐怖の残響",
   "file": "assets/enemies_redesign/109_fear_shade.png",
   "src": "png_512/109_fear_shade.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    85,
    83,
    348,
    354
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "110",
   "id": "control_shade",
   "name": "王令の共鳴冠",
   "oldName": "支配の残響",
   "file": "assets/enemies_redesign/110_control_shade.png",
   "src": "png_512/110_control_shade.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    72,
    363,
    365
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 0
  },
  {
   "no": "111",
   "id": "void_beast",
   "name": "空洞肋の夜行獣",
   "oldName": "虚無の獣",
   "file": "assets/enemies_redesign/111_void_beast.png",
   "src": "png_512/111_void_beast.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    79,
    71,
    356,
    364
   ],
   "size": "big",
   "draw": [
    166,
    170
   ],
   "lift": 0
  },
  {
   "no": "112",
   "id": "cactus",
   "name": "水甕胴の棘仙掌",
   "oldName": "サボテンマン",
   "file": "assets/enemies_redesign/112_cactus.png",
   "src": "png_512/112_cactus.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    75,
    78,
    365,
    352
   ],
   "size": "small",
   "draw": [
    122,
    118
   ],
   "lift": 0
  },
  {
   "no": "113",
   "id": "mummy",
   "name": "砂布の織骸",
   "oldName": "ミイラ",
   "file": "assets/enemies_redesign/113_mummy.png",
   "src": "png_512/113_mummy.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    116,
    77,
    322,
    357
   ],
   "size": "normal",
   "draw": [
    130,
    144
   ],
   "lift": 0
  },
  {
   "no": "114",
   "id": "snow_wolf",
   "name": "霜針鬣の雪狼",
   "oldName": "スノーウルフ",
   "file": "assets/enemies_redesign/114_snow_wolf.png",
   "src": "png_512/114_snow_wolf.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    71,
    366,
    365
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "115",
   "id": "ice_spirit",
   "name": "氷琴羽の薄精",
   "oldName": "氷の精霊",
   "file": "assets/enemies_redesign/115_ice_spirit.png",
   "src": "png_512/115_ice_spirit.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    71,
    355,
    368
   ],
   "size": "normal",
   "draw": [
    139,
    144
   ],
   "lift": 14
  },
  {
   "no": "116",
   "id": "yeti",
   "name": "雪庇肩の白毛巨獣",
   "oldName": "イエティ",
   "file": "assets/enemies_redesign/116_yeti.png",
   "src": "png_512/116_yeti.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    81,
    81,
    356,
    359
   ],
   "size": "big",
   "draw": [
    169,
    170
   ],
   "lift": 0
  },
  {
   "no": "117",
   "id": "gargoyle",
   "name": "雨樋翼の石伏獣",
   "oldName": "ガーゴイル",
   "file": "assets/enemies_redesign/117_gargoyle.png",
   "src": "png_512/117_gargoyle.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    69,
    73,
    373,
    359
   ],
   "size": "normal",
   "draw": [
    150,
    144
   ],
   "lift": 0
  },
  {
   "no": "118",
   "id": "magitek",
   "name": "呪盤胸の装甲兵",
   "oldName": "魔導機兵",
   "file": "assets/enemies_redesign/118_magitek.png",
   "src": "png_512/118_magitek.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    93,
    67,
    343,
    376
   ],
   "size": "normal",
   "draw": [
    131,
    144
   ],
   "lift": 0
  },
  {
   "no": "119",
   "id": "bull_shadow",
   "name": "雄角の影突き",
   "oldName": "ブルの影",
   "file": "assets/enemies_redesign/119_bull_shadow.png",
   "src": "png_512/119_bull_shadow.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    73,
    78,
    370,
    352
   ],
   "size": "big",
   "draw": [
    179,
    170
   ],
   "lift": 0
  },
  {
   "no": "120",
   "id": "chart_wraith",
   "name": "蝋線衣の相場霊",
   "oldName": "チャートの亡霊",
   "file": "assets/enemies_redesign/120_chart_wraith.png",
   "src": "png_512/120_chart_wraith.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    104,
    67,
    322,
    372
   ],
   "size": "small",
   "draw": [
    102,
    118
   ],
   "lift": 0
  },
  {
   "no": "121",
   "id": "demon_knight",
   "name": "燼刃の獄騎士",
   "oldName": "デーモンナイト",
   "file": "assets/enemies_redesign/121_demon_knight.png",
   "src": "png_512/121_demon_knight.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    77,
    70,
    366,
    374
   ],
   "size": "big",
   "draw": [
    166,
    170
   ],
   "lift": 0
  },
  {
   "no": "122",
   "id": "dark_slime",
   "name": "夜膜の折扇獣",
   "oldName": "ダークスライム",
   "file": "assets/enemies_redesign/122_dark_slime.png",
   "src": "png_512/122_dark_slime.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    82,
    76,
    357,
    357
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "123",
   "id": "wisp",
   "name": "燐糸巻きの灯虫",
   "oldName": "ウィスプ",
   "file": "assets/enemies_redesign/123_wisp.png",
   "src": "png_512/123_wisp.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    85,
    75,
    350,
    357
   ],
   "size": "small",
   "draw": [
    116,
    118
   ],
   "lift": 12
  },
  {
   "no": "124",
   "id": "pirate",
   "name": "錨鉤の甲板賊",
   "oldName": "海賊",
   "file": "assets/enemies_redesign/124_pirate.png",
   "src": "png_512/124_pirate.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    68,
    368,
    373
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "125",
   "id": "ruin_guardian",
   "name": "碑鍵腕の遺構衛",
   "oldName": "遺跡の守護者",
   "file": "assets/enemies_redesign/125_ruin_guardian.png",
   "src": "png_512/125_ruin_guardian.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    68,
    372,
    371
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "126",
   "id": "sand_worm",
   "name": "砂潜りの筒顎虫",
   "oldName": "砂潜りワーム",
   "file": "assets/enemies_redesign/126_sand_worm.png",
   "src": "png_512/126_sand_worm.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    69,
    366,
    373
   ],
   "size": "big",
   "draw": [
    167,
    170
   ],
   "lift": 0
  },
  {
   "no": "127",
   "id": "mirage_fox",
   "name": "陽炎尾の玻璃狐",
   "oldName": "蜃気楼ギツネ",
   "file": "assets/enemies_redesign/127_mirage_fox.png",
   "src": "png_512/127_mirage_fox.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    85,
    74,
    356,
    359
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 0
  },
  {
   "no": "128",
   "id": "dune_scorpion",
   "name": "砂帆尾の丘鋏",
   "oldName": "砂丘サソリ",
   "file": "assets/enemies_redesign/128_dune_scorpion.png",
   "src": "png_512/128_dune_scorpion.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    73,
    70,
    370,
    365
   ],
   "size": "normal",
   "draw": [
    146,
    144
   ],
   "lift": 0
  },
  {
   "no": "129",
   "id": "dust_djinn",
   "name": "砂紋の風編み",
   "oldName": "砂塵の精",
   "file": "assets/enemies_redesign/129_dust_djinn.png",
   "src": "png_512/129_dust_djinn.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    73,
    73,
    370,
    365
   ],
   "size": "normal",
   "draw": [
    146,
    144
   ],
   "lift": 14
  },
  {
   "no": "130",
   "id": "caravan_raider",
   "name": "瓢荷狙いの隊商賊",
   "oldName": "隊商荒らし",
   "file": "assets/enemies_redesign/130_caravan_raider.png",
   "src": "png_512/130_caravan_raider.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    91,
    69,
    334,
    368
   ],
   "size": "normal",
   "draw": [
    131,
    144
   ],
   "lift": 0
  },
  {
   "no": "131",
   "id": "rumor_mimic",
   "name": "耳殻の噂喰い",
   "oldName": "噂のミミック",
   "file": "assets/enemies_redesign/131_rumor_mimic.png",
   "src": "png_512/131_rumor_mimic.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    76,
    73,
    363,
    367
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "132",
   "id": "temple_sentinel",
   "name": "奉砂の仮面像",
   "oldName": "神殿の砂像",
   "file": "assets/enemies_redesign/132_temple_sentinel.png",
   "src": "png_512/132_temple_sentinel.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    98,
    69,
    339,
    372
   ],
   "size": "normal",
   "draw": [
    131,
    144
   ],
   "lift": 0
  },
  {
   "no": "133",
   "id": "fire_drake",
   "name": "火笛喉の赤翼竜",
   "oldName": "ファイアドレイク",
   "file": "assets/enemies_redesign/133_fire_drake.png",
   "src": "png_512/133_fire_drake.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    70,
    74,
    372,
    366
   ],
   "size": "normal",
   "draw": [
    146,
    144
   ],
   "lift": 0
  },
  {
   "no": "134",
   "id": "magma_slime",
   "name": "熔玻璃の脚輪獣",
   "oldName": "マグマスライム",
   "file": "assets/enemies_redesign/134_magma_slime.png",
   "src": "png_512/134_magma_slime.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    70,
    78,
    373,
    350
   ],
   "size": "normal",
   "draw": [
    153,
    144
   ],
   "lift": 0
  },
  {
   "no": "135",
   "id": "cinder_bird",
   "name": "火種頬の燠鳥",
   "oldName": "火の粉鳥",
   "file": "assets/enemies_redesign/135_cinder_bird.png",
   "src": "png_512/135_cinder_bird.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    67,
    367,
    372
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "136",
   "id": "obsidian_golem",
   "name": "黒鏡肩の石衛",
   "oldName": "黒曜石のゴーレム",
   "file": "assets/enemies_redesign/136_obsidian_golem.png",
   "src": "png_512/136_obsidian_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    90,
    68,
    341,
    368
   ],
   "size": "normal",
   "draw": [
    133,
    144
   ],
   "lift": 0
  },
  {
   "no": "137",
   "id": "flame_spirit",
   "name": "熱紗の火舞精",
   "oldName": "炎の精",
   "file": "assets/enemies_redesign/137_flame_spirit.png",
   "src": "png_512/137_flame_spirit.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    100,
    68,
    316,
    376
   ],
   "size": "normal",
   "draw": [
    121,
    144
   ],
   "lift": 0
  },
  {
   "no": "138",
   "id": "vein_wyrmling",
   "name": "竜脈灯の幼角竜",
   "oldName": "竜脈の幼竜",
   "file": "assets/enemies_redesign/138_vein_wyrmling.png",
   "src": "png_512/138_vein_wyrmling.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    71,
    371,
    363
   ],
   "size": "normal",
   "draw": [
    147,
    144
   ],
   "lift": 0
  },
  {
   "no": "139",
   "id": "frost_wolf",
   "name": "凍霞脚の氷原狼",
   "oldName": "フロストウルフ",
   "file": "assets/enemies_redesign/139_frost_wolf.png",
   "src": "png_512/139_frost_wolf.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    73,
    370,
    366
   ],
   "size": "normal",
   "draw": [
    146,
    144
   ],
   "lift": 0
  },
  {
   "no": "140",
   "id": "ice_wraith",
   "name": "氷葬衣の漂霊",
   "oldName": "アイスレイス",
   "file": "assets/enemies_redesign/140_ice_wraith.png",
   "src": "png_512/140_ice_wraith.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    88,
    66,
    339,
    378
   ],
   "size": "normal",
   "draw": [
    129,
    144
   ],
   "lift": 14
  },
  {
   "no": "141",
   "id": "snow_golem",
   "name": "雪輪腹の圧雪兵",
   "oldName": "スノーゴーレム",
   "file": "assets/enemies_redesign/141_snow_golem.png",
   "src": "png_512/141_snow_golem.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    71,
    66,
    372,
    372
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "142",
   "id": "frost_harpy",
   "name": "白風羽の雪唱者",
   "oldName": "吹雪のハーピー",
   "file": "assets/enemies_redesign/142_frost_harpy.png",
   "src": "png_512/142_frost_harpy.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    77,
    81,
    358,
    355
   ],
   "size": "normal",
   "draw": [
    145,
    144
   ],
   "lift": 14
  },
  {
   "no": "143",
   "id": "memory_eater",
   "name": "思い出紡錘の喰蛾",
   "oldName": "記憶喰い",
   "file": "assets/enemies_redesign/143_memory_eater.png",
   "src": "png_512/143_memory_eater.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    76,
    84,
    364,
    349
   ],
   "size": "normal",
   "draw": [
    150,
    144
   ],
   "lift": 14
  },
  {
   "no": "144",
   "id": "clock_soldier",
   "name": "歯車襟の時衛兵",
   "oldName": "時計仕掛けの衛兵",
   "file": "assets/enemies_redesign/144_clock_soldier.png",
   "src": "png_512/144_clock_soldier.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    68,
    359,
    374
   ],
   "size": "normal",
   "draw": [
    138,
    144
   ],
   "lift": 0
  },
  {
   "no": "145",
   "id": "ash_wraith",
   "name": "灰帳の弔い霊",
   "oldName": "灰の亡霊",
   "file": "assets/enemies_redesign/145_ash_wraith.png",
   "src": "png_512/145_ash_wraith.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    80,
    68,
    365,
    370
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 14
  },
  {
   "no": "146",
   "id": "cinder_hound",
   "name": "燠脊の焦跡犬",
   "oldName": "燃えさしの猟犬",
   "file": "assets/enemies_redesign/146_cinder_hound.png",
   "src": "png_512/146_cinder_hound.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    75,
    366,
    358
   ],
   "size": "normal",
   "draw": [
    147,
    144
   ],
   "lift": 0
  },
  {
   "no": "147",
   "id": "drowned_sailor",
   "name": "塩縄衣の沈船員",
   "oldName": "溺れた水夫",
   "file": "assets/enemies_redesign/147_drowned_sailor.png",
   "src": "png_512/147_drowned_sailor.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    113,
    69,
    318,
    373
   ],
   "size": "normal",
   "draw": [
    123,
    144
   ],
   "lift": 0
  },
  {
   "no": "148",
   "id": "reef_lurker",
   "name": "礁穴の鉤腕貝",
   "oldName": "礁に潜むもの",
   "file": "assets/enemies_redesign/148_reef_lurker.png",
   "src": "png_512/148_reef_lurker.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    72,
    68,
    365,
    369
   ],
   "size": "normal",
   "draw": [
    142,
    144
   ],
   "lift": 0
  },
  {
   "no": "149",
   "id": "core_sentinel",
   "name": "深圧殻の門番",
   "oldName": "深層の番兵",
   "file": "assets/enemies_redesign/149_core_sentinel.png",
   "src": "png_512/149_core_sentinel.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    72,
    70,
    370,
    369
   ],
   "size": "normal",
   "draw": [
    144,
    144
   ],
   "lift": 0
  },
  {
   "no": "150",
   "id": "data_phantom",
   "name": "欠番符の漂霊",
   "oldName": "データの亡霊",
   "file": "assets/enemies_redesign/150_data_phantom.png",
   "src": "png_512/150_data_phantom.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    94,
    69,
    345,
    364
   ],
   "size": "normal",
   "draw": [
    136,
    144
   ],
   "lift": 14
  },
  {
   "no": "151",
   "id": "yosen_slime",
   "name": "朱陽の伸柱蟲",
   "oldName": "陽線スライム",
   "file": "assets/enemies_redesign/151_yosen_slime.png",
   "src": "png_512/151_yosen_slime.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    75,
    72,
    362,
    366
   ],
   "size": "small",
   "draw": [
    117,
    118
   ],
   "lift": 0
  },
  {
   "no": "152",
   "id": "insen_slime",
   "name": "蒼陰の垂錘獣",
   "oldName": "陰線スライム",
   "file": "assets/enemies_redesign/152_insen_slime.png",
   "src": "png_512/152_insen_slime.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    72,
    73,
    371,
    361
   ],
   "size": "small",
   "draw": [
    121,
    118
   ],
   "lift": 0
  },
  {
   "no": "153",
   "id": "contrarian_bat",
   "name": "逆波翼の返り蝠",
   "oldName": "逆張りバット",
   "file": "assets/enemies_redesign/153_contrarian_bat.png",
   "src": "png_512/153_contrarian_bat.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    79,
    68,
    365,
    369
   ],
   "size": "small",
   "draw": [
    117,
    118
   ],
   "lift": 12
  },
  {
   "no": "154",
   "id": "stoploss_zombie",
   "name": "断札鋏の亡者",
   "oldName": "損切りゾンビ",
   "file": "assets/enemies_redesign/154_stoploss_zombie.png",
   "src": "png_512/154_stoploss_zombie.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    85,
    70,
    355,
    366
   ],
   "size": "normal",
   "draw": [
    140,
    144
   ],
   "lift": 0
  },
  {
   "no": "155",
   "id": "nanpin_goblin",
   "name": "買増袋の坑小鬼",
   "oldName": "ナンピンゴブリン",
   "file": "assets/enemies_redesign/155_nanpin_goblin.png",
   "src": "png_512/155_nanpin_goblin.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    102,
    67,
    337,
    373
   ],
   "size": "small",
   "draw": [
    107,
    118
   ],
   "lift": 0
  },
  {
   "no": "156",
   "id": "simple_cultist",
   "name": "一線杖の修験者",
   "oldName": "シンプル教信徒",
   "file": "assets/enemies_redesign/156_simple_cultist.png",
   "src": "png_512/156_simple_cultist.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    113,
    68,
    296,
    372
   ],
   "size": "normal",
   "draw": [
    115,
    144
   ],
   "lift": 0
  },
  {
   "no": "157",
   "id": "fullleva_ogre",
   "name": "過積錘の巨漢",
   "oldName": "フルレバオーガ",
   "file": "assets/enemies_redesign/157_fullleva_ogre.png",
   "src": "png_512/157_fullleva_ogre.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    71,
    369,
    349
   ],
   "size": "big",
   "draw": [
    180,
    170
   ],
   "lift": 0
  },
  {
   "no": "158",
   "id": "kotsukotsu_knight",
   "name": "積銭鎧の崩騎士",
   "oldName": "コツコツドカンナイト",
   "file": "assets/enemies_redesign/158_kotsukotsu_knight.png",
   "src": "png_512/158_kotsukotsu_knight.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    72,
    69,
    371,
    373
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 0
  },
  {
   "no": "159",
   "id": "pojipoji_phantom",
   "name": "注文環の迷走霊",
   "oldName": "ポジポジファントム",
   "file": "assets/enemies_redesign/159_pojipoji_phantom.png",
   "src": "png_512/159_pojipoji_phantom.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    92,
    68,
    347,
    371
   ],
   "size": "normal",
   "draw": [
    135,
    144
   ],
   "lift": 14
  },
  {
   "no": "160",
   "id": "indicator_mage",
   "name": "多針盤の盲術師",
   "oldName": "インジケーター依存メイジ",
   "file": "assets/enemies_redesign/160_indicator_mage.png",
   "src": "png_512/160_indicator_mage.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    74,
    68,
    367,
    365
   ],
   "size": "normal",
   "draw": [
    145,
    144
   ],
   "lift": 0
  },
  {
   "no": "161",
   "id": "lab_drone",
   "name": "干渉輪の観測機",
   "oldName": "観測ドローン",
   "file": "assets/enemies_redesign/161_lab_drone.png",
   "src": "png_512/161_lab_drone.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    103,
    72,
    337,
    360
   ],
   "size": "normal",
   "draw": [
    135,
    144
   ],
   "lift": 0
  },
  {
   "no": "162",
   "id": "superposition_cat",
   "name": "二相尾の重映猫",
   "oldName": "重ね合わせ猫",
   "file": "assets/enemies_redesign/162_superposition_cat.png",
   "src": "png_512/162_superposition_cat.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    66,
    72,
    376,
    367
   ],
   "size": "normal",
   "draw": [
    148,
    144
   ],
   "lift": 0
  },
  {
   "no": "163",
   "id": "quantum_shade",
   "name": "確率膜の影渡り",
   "oldName": "量子の影",
   "file": "assets/enemies_redesign/163_quantum_shade.png",
   "src": "png_512/163_quantum_shade.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    78,
    71,
    363,
    366
   ],
   "size": "normal",
   "draw": [
    143,
    144
   ],
   "lift": 14
  },
  {
   "no": "164",
   "id": "zero_wisp",
   "name": "真空鈴の微光精",
   "oldName": "ゼロ点の鬼火",
   "file": "assets/enemies_redesign/164_zero_wisp.png",
   "src": "png_512/164_zero_wisp.png",
   "status": "adopted",
   "reason": null,
   "bbox": [
    84,
    68,
    358,
    374
   ],
   "size": "small",
   "draw": [
    113,
    118
   ],
   "lift": 12
  }
 ]
};
})(typeof window !== 'undefined' ? window : globalThis);
