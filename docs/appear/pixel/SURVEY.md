# 装備の外見：主人公と仲間の装備できる品と、描く／描かない品（自動生成）

`docs/tools/appear/browser/appear_survey.js` がゲームのデータから作る。手で書き換えない。装飾品は数えない（外見を描かない決まり）。

## 初期装備

- 主人公：作ったときは何も装備していない。最初に村長と話すと、職業の初めの武器（戦士は wooden_sword）をもらって、その場で装備する（js/data/towns.js）
- 仲間：加入したとき（State.joinCompanion → Actors.create）は何も装備していない（下の表は Actors.create で作って確かめた装備）

| 人物 | 職業 | 加入のレベル（下限） | 装備 |
|---|---|---|---|
| リーナ（僧侶） | priest | 2 | weapon:なし armor:なし shield:なし head:なし acc:なし |
| ガルド（戦士） | warrior | 6 | weapon:なし armor:なし shield:なし head:なし acc:なし |
| カイル（騎士） | knight | 4 | weapon:なし armor:なし shield:なし head:なし acc:なし |
| カズト（戦士） | warrior | 28 | weapon:なし armor:なし shield:なし head:なし acc:なし |

## 職業で装備できる種類

| 人物 | 職業 | 武器 | 防具 |
|---|---|---|---|
| 主人公（戦士） | 戦士 | sword・axe・spear | heavy・light・shield・helm・acc |
| リーナ（僧侶） | 僧侶 | staff・club | robe・light・hat・shield・acc |
| ガルド（戦士） | 戦士 | sword・axe・spear | heavy・light・shield・helm・acc |
| カイル（騎士） | 騎士 | sword・spear | heavy・light・shield・helm・acc |
| カズト（戦士） | 戦士 | sword・axe・spear | heavy・light・shield・helm・acc |

## 種類ごとの品の数（描く／描かない）

| 人物 | 枠：形 | 部品の種類 | 描く | 描かない | 店で買える品（町） |
|---|---|---|---|---|---|
| 主人公（戦士） | armor:heavy | armor_heavy | 29 | 0 | 鎖帷子（600G）：kalion_city/rivel_town、鉄の鎧（1600G）：kalion_city/sentra_capital、騎士の鎧（3800G）：sahar_city/ignas_town/kalion_city/sentra_capital/magicka_city/ciel_port/frost_town/tempus_city/node_city、ルーンメイル（6000G）：dark_camp/magicka_city、竜鱗の鎧（6800G）：ignas_town/region78-orbis.js:87、連邦重甲（3900G）：tradia |
| 主人公（戦士） | armor:light | armor_light | 26 | 0 | 布の服（50G）：rivel_town、革の鎧（220G）：rivel_town/dow_village、鱗の鎧（800G）：kalion_city/dow_village、忍び装束（1500G）：kalion_city/sentra_capital/tempus_city/node_city、航海士のコート（1700G）：tempus_city/node_city、星のマント（5200G）：dark_camp/magicka_city、砂避けのマント（2400G）：sahar_city、毛皮のコート（2800G）：ciel_port/frost_town、監査官の上着（2600G）：tradia |
| 主人公（戦士） | head:helm | head_helm | 19 | 0 | 鉄の兜（300G）：kalion_city/rivel_town、騎士の兜（900G）：sahar_city/kalion_city/sentra_capital/ciel_port/frost_town/tempus_city/node_city/tradia、星の兜（3500G）：dark_camp/magicka_city、時間軸の兜（3000G）：tempus_city、竜の兜（3400G）：ignas_town |
| 主人公（戦士） | shield:shield | shield | 27 | 0 | 木の盾（90G）：rivel_town、鉄の盾（380G）：kalion_city/rivel_town、騎士の盾（1200G）：sahar_city/kalion_city/sentra_capital/frost_town/tempus_city/node_city、イージスの盾（5500G）：ignas_town/dark_camp/magicka_city/region78-orbis.js:87、押し目の盾（2000G）：tradia、軌道の盾（7200G）：region78-orbis.js:87 |
| 主人公（戦士） | weapon:axe | weapon_axe | 12 | 0 | 手斧（200G）：rivel_town、戦斧（900G）：kalion_city、天空の斧（6200G）：dark_camp、竜骨の斧（6600G）：dragon.js:114、鉄鎖破りの斧（2900G）：tradia |
| 主人公（戦士） | weapon:spear | weapon_spear | 25 | 0 | 槍（260G）：rivel_town/dow_village、鉄の槍（760G）：kalion_city、ハルバード（2600G）：sahar_city/islands.js:103/kalion_city/magicka_city/ciel_port/frost_town/tempus_city/tempus.js:294、星界の槍（5800G）：dragon.js:114/dark_camp/magicka_city、陽炎の槍（3200G）：sahar_city、利確の三叉槍（3000G）：tradia |
| 主人公（戦士） | weapon:sword | weapon_sword | 31 | 0 | 木の剣（60G）：rivel_town、銅の剣（180G）：rivel_town/dow_village、鉄の剣（520G）：kalion_city/rivel_town/dow_village、鋼の剣（1400G）：kalion_city、騎士の剣（3200G）：islands.js:103/kalion_city/magicka_city/tempus_city/tempus.js:294/tradia、ルーンブレード（6000G）：dark_camp/magicka_city、砂漠の曲刀（3400G）：sahar_city、陰線の剣（2600G）：tradia、レジスタンスブレード（4200G）：tradia |
| リーナ（僧侶） | shield:shield | shield | 0 | 27 | 木の盾（90G）：rivel_town、鉄の盾（380G）：kalion_city/rivel_town、騎士の盾（1200G）：sahar_city/kalion_city/sentra_capital/frost_town/tempus_city/node_city、イージスの盾（5500G）：ignas_town/dark_camp/magicka_city/region78-orbis.js:87、押し目の盾（2000G）：tradia、軌道の盾（7200G）：region78-orbis.js:87 |
| リーナ（僧侶） | weapon:club | （なし） | 0 | 14 | 棍棒（90G）：rivel_town、鉄棍（420G）：dow_village、聖なるメイス（1600G）：sahar_city/islands.js:103/kalion_city/tempus_city、均衡の槌（5400G）：dragon.js:114/dark_camp/magicka_city |
| リーナ（僧侶） | head:hat/witch | head_hat | 0 | 3 | 魔法使いの帽子（500G）：kalion_city/sentra_capital/frost_town/tempus_city/node_city/tradia、魔導帽（3200G）：ignas_town/dark_camp/magicka_city/region78-orbis.js:87 |
| リーナ（僧侶） | head:hat/bicorne | （なし） | 0 | 1 | — |
| リーナ（僧侶） | head:hat/circlet | （なし） | 0 | 1 | — |
| リーナ（僧侶） | head:hat/crown | （なし） | 0 | 1 | — |
| リーナ（僧侶） | head:hat/feather | （なし） | 0 | 1 | 羽根帽子（240G）：rivel_town/dow_village |
| リーナ（僧侶） | head:hat/hood | （なし） | 0 | 1 | — |
| リーナ（僧侶） | head:hat/turban | （なし） | 0 | 1 | 砂漠のターバン（1400G）：sahar_city |
| リーナ（僧侶） | armor:light | armor_light | 26 | 0 | 布の服（50G）：rivel_town、革の鎧（220G）：rivel_town/dow_village、鱗の鎧（800G）：kalion_city/dow_village、忍び装束（1500G）：kalion_city/sentra_capital/tempus_city/node_city、航海士のコート（1700G）：tempus_city/node_city、星のマント（5200G）：dark_camp/magicka_city、砂避けのマント（2400G）：sahar_city、毛皮のコート（2800G）：ciel_port/frost_town、監査官の上着（2600G）：tradia |
| リーナ（僧侶） | armor:robe | armor_robe | 26 | 0 | 旅人のローブ（90G）：rivel_town、絹のローブ（420G）：kalion_city、賢者のローブ（1700G）：kalion_city/sentra_capital/tempus_city/node_city、時のローブ（2000G）：sahar_city/magicka_city/ciel_port/frost_town/tempus_city/node_city、天空のローブ（5000G）：dark_camp/magicka_city、見送りの法衣（1400G）：sidequests.js:65、熾火のローブ（5200G）：ignas_town、逆行耐性の法衣（2700G）：tradia |
| リーナ（僧侶） | head:hat/cap | head_cap | 9 | 0 | 革の帽子（60G）：rivel_town |
| リーナ（僧侶） | weapon:staff | weapon_staff | 28 | 0 | 樫の杖（80G）：rivel_town、魔道士の杖（350G）：rivel_town、賢者の杖（1500G）：islands.js:103/kalion_city/tempus_city、時詠みの杖（2200G）：sahar_city/magicka_city/frost_town/tempus_city/tempus.js:294、魔導の杖（5000G）：dragon.js:114/dark_camp/magicka_city、氷晶の杖（3000G）：ciel_port/frost_town |
| ガルド（戦士） | weapon:spear | weapon_spear | 0 | 25 | 槍（260G）：rivel_town/dow_village、鉄の槍（760G）：kalion_city、ハルバード（2600G）：sahar_city/islands.js:103/kalion_city/magicka_city/ciel_port/frost_town/tempus_city/tempus.js:294、星界の槍（5800G）：dragon.js:114/dark_camp/magicka_city、陽炎の槍（3200G）：sahar_city、利確の三叉槍（3000G）：tradia |
| ガルド（戦士） | head:helm | head_helm | 0 | 19 | 鉄の兜（300G）：kalion_city/rivel_town、騎士の兜（900G）：sahar_city/kalion_city/sentra_capital/ciel_port/frost_town/tempus_city/node_city/tradia、星の兜（3500G）：dark_camp/magicka_city、時間軸の兜（3000G）：tempus_city、竜の兜（3400G）：ignas_town |
| ガルド（戦士） | armor:heavy | armor_heavy | 29 | 0 | 鎖帷子（600G）：kalion_city/rivel_town、鉄の鎧（1600G）：kalion_city/sentra_capital、騎士の鎧（3800G）：sahar_city/ignas_town/kalion_city/sentra_capital/magicka_city/ciel_port/frost_town/tempus_city/node_city、ルーンメイル（6000G）：dark_camp/magicka_city、竜鱗の鎧（6800G）：ignas_town/region78-orbis.js:87、連邦重甲（3900G）：tradia |
| ガルド（戦士） | armor:light | armor_light | 26 | 0 | 布の服（50G）：rivel_town、革の鎧（220G）：rivel_town/dow_village、鱗の鎧（800G）：kalion_city/dow_village、忍び装束（1500G）：kalion_city/sentra_capital/tempus_city/node_city、航海士のコート（1700G）：tempus_city/node_city、星のマント（5200G）：dark_camp/magicka_city、砂避けのマント（2400G）：sahar_city、毛皮のコート（2800G）：ciel_port/frost_town、監査官の上着（2600G）：tradia |
| ガルド（戦士） | shield:shield | shield | 27 | 0 | 木の盾（90G）：rivel_town、鉄の盾（380G）：kalion_city/rivel_town、騎士の盾（1200G）：sahar_city/kalion_city/sentra_capital/frost_town/tempus_city/node_city、イージスの盾（5500G）：ignas_town/dark_camp/magicka_city/region78-orbis.js:87、押し目の盾（2000G）：tradia、軌道の盾（7200G）：region78-orbis.js:87 |
| ガルド（戦士） | weapon:axe | weapon_axe | 12 | 0 | 手斧（200G）：rivel_town、戦斧（900G）：kalion_city、天空の斧（6200G）：dark_camp、竜骨の斧（6600G）：dragon.js:114、鉄鎖破りの斧（2900G）：tradia |
| ガルド（戦士） | weapon:sword | weapon_sword | 31 | 0 | 木の剣（60G）：rivel_town、銅の剣（180G）：rivel_town/dow_village、鉄の剣（520G）：kalion_city/rivel_town/dow_village、鋼の剣（1400G）：kalion_city、騎士の剣（3200G）：islands.js:103/kalion_city/magicka_city/tempus_city/tempus.js:294/tradia、ルーンブレード（6000G）：dark_camp/magicka_city、砂漠の曲刀（3400G）：sahar_city、陰線の剣（2600G）：tradia、レジスタンスブレード（4200G）：tradia |
| カイル（騎士） | head:helm | head_helm | 0 | 19 | 鉄の兜（300G）：kalion_city/rivel_town、騎士の兜（900G）：sahar_city/kalion_city/sentra_capital/ciel_port/frost_town/tempus_city/node_city/tradia、星の兜（3500G）：dark_camp/magicka_city、時間軸の兜（3000G）：tempus_city、竜の兜（3400G）：ignas_town |
| カイル（騎士） | armor:heavy | armor_heavy | 29 | 0 | 鎖帷子（600G）：kalion_city/rivel_town、鉄の鎧（1600G）：kalion_city/sentra_capital、騎士の鎧（3800G）：sahar_city/ignas_town/kalion_city/sentra_capital/magicka_city/ciel_port/frost_town/tempus_city/node_city、ルーンメイル（6000G）：dark_camp/magicka_city、竜鱗の鎧（6800G）：ignas_town/region78-orbis.js:87、連邦重甲（3900G）：tradia |
| カイル（騎士） | armor:light | armor_light | 26 | 0 | 布の服（50G）：rivel_town、革の鎧（220G）：rivel_town/dow_village、鱗の鎧（800G）：kalion_city/dow_village、忍び装束（1500G）：kalion_city/sentra_capital/tempus_city/node_city、航海士のコート（1700G）：tempus_city/node_city、星のマント（5200G）：dark_camp/magicka_city、砂避けのマント（2400G）：sahar_city、毛皮のコート（2800G）：ciel_port/frost_town、監査官の上着（2600G）：tradia |
| カイル（騎士） | shield:shield | shield | 27 | 0 | 木の盾（90G）：rivel_town、鉄の盾（380G）：kalion_city/rivel_town、騎士の盾（1200G）：sahar_city/kalion_city/sentra_capital/frost_town/tempus_city/node_city、イージスの盾（5500G）：ignas_town/dark_camp/magicka_city/region78-orbis.js:87、押し目の盾（2000G）：tradia、軌道の盾（7200G）：region78-orbis.js:87 |
| カイル（騎士） | weapon:spear | weapon_spear | 25 | 0 | 槍（260G）：rivel_town/dow_village、鉄の槍（760G）：kalion_city、ハルバード（2600G）：sahar_city/islands.js:103/kalion_city/magicka_city/ciel_port/frost_town/tempus_city/tempus.js:294、星界の槍（5800G）：dragon.js:114/dark_camp/magicka_city、陽炎の槍（3200G）：sahar_city、利確の三叉槍（3000G）：tradia |
| カイル（騎士） | weapon:sword | weapon_sword | 31 | 0 | 木の剣（60G）：rivel_town、銅の剣（180G）：rivel_town/dow_village、鉄の剣（520G）：kalion_city/rivel_town/dow_village、鋼の剣（1400G）：kalion_city、騎士の剣（3200G）：islands.js:103/kalion_city/magicka_city/tempus_city/tempus.js:294/tradia、ルーンブレード（6000G）：dark_camp/magicka_city、砂漠の曲刀（3400G）：sahar_city、陰線の剣（2600G）：tradia、レジスタンスブレード（4200G）：tradia |
| カズト（戦士） | head:helm | head_helm | 0 | 19 | 鉄の兜（300G）：kalion_city/rivel_town、騎士の兜（900G）：sahar_city/kalion_city/sentra_capital/ciel_port/frost_town/tempus_city/node_city/tradia、星の兜（3500G）：dark_camp/magicka_city、時間軸の兜（3000G）：tempus_city、竜の兜（3400G）：ignas_town |
| カズト（戦士） | armor:heavy | armor_heavy | 29 | 0 | 鎖帷子（600G）：kalion_city/rivel_town、鉄の鎧（1600G）：kalion_city/sentra_capital、騎士の鎧（3800G）：sahar_city/ignas_town/kalion_city/sentra_capital/magicka_city/ciel_port/frost_town/tempus_city/node_city、ルーンメイル（6000G）：dark_camp/magicka_city、竜鱗の鎧（6800G）：ignas_town/region78-orbis.js:87、連邦重甲（3900G）：tradia |
| カズト（戦士） | armor:light | armor_light | 26 | 0 | 布の服（50G）：rivel_town、革の鎧（220G）：rivel_town/dow_village、鱗の鎧（800G）：kalion_city/dow_village、忍び装束（1500G）：kalion_city/sentra_capital/tempus_city/node_city、航海士のコート（1700G）：tempus_city/node_city、星のマント（5200G）：dark_camp/magicka_city、砂避けのマント（2400G）：sahar_city、毛皮のコート（2800G）：ciel_port/frost_town、監査官の上着（2600G）：tradia |
| カズト（戦士） | shield:shield | shield | 27 | 0 | 木の盾（90G）：rivel_town、鉄の盾（380G）：kalion_city/rivel_town、騎士の盾（1200G）：sahar_city/kalion_city/sentra_capital/frost_town/tempus_city/node_city、イージスの盾（5500G）：ignas_town/dark_camp/magicka_city/region78-orbis.js:87、押し目の盾（2000G）：tradia、軌道の盾（7200G）：region78-orbis.js:87 |
| カズト（戦士） | weapon:axe | weapon_axe | 12 | 0 | 手斧（200G）：rivel_town、戦斧（900G）：kalion_city、天空の斧（6200G）：dark_camp、竜骨の斧（6600G）：dragon.js:114、鉄鎖破りの斧（2900G）：tradia |
| カズト（戦士） | weapon:spear | weapon_spear | 25 | 0 | 槍（260G）：rivel_town/dow_village、鉄の槍（760G）：kalion_city、ハルバード（2600G）：sahar_city/islands.js:103/kalion_city/magicka_city/ciel_port/frost_town/tempus_city/tempus.js:294、星界の槍（5800G）：dragon.js:114/dark_camp/magicka_city、陽炎の槍（3200G）：sahar_city、利確の三叉槍（3000G）：tradia |
| カズト（戦士） | weapon:sword | weapon_sword | 31 | 0 | 木の剣（60G）：rivel_town、銅の剣（180G）：rivel_town/dow_village、鉄の剣（520G）：kalion_city/rivel_town/dow_village、鋼の剣（1400G）：kalion_city、騎士の剣（3200G）：islands.js:103/kalion_city/magicka_city/tempus_city/tempus.js:294/tradia、ルーンブレード（6000G）：dark_camp/magicka_city、砂漠の曲刀（3400G）：sahar_city、陰線の剣（2600G）：tradia、レジスタンスブレード（4200G）：tradia |
