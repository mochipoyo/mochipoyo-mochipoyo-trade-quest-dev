/* =========================================================
   Data / v7.6 パン（パン屋の露店で買える）：回復しつつ、次の戦闘3回まで能力が少し上がる（js/rpg/meal76.js）
   ・1人に1つだけ（新しく食べると入れ替わる）。戦闘中に食べると、その戦闘から数える
   ・値段（v7.9 で見直し）：HP 1 につき 1G ＋ MP 1 につき 4G ＋ 能力アップ 1% につき 10G（10G 単位）。
     前は同じ回復量の食べ物とほぼ同じ値段で、3 回の戦闘の能力アップがほぼ無料だった（丸パン 40G → 120G・勇者のバゲット 280G → 460G）
   ========================================================= */
(function (root) {
  'use strict';
  var ITEMS = root.ITEMS; if (!ITEMS) return;
  var B = function (id, name, price, eff, buff, desc) { if (ITEMS[id]) return; ITEMS[id] = { id: id, name: name, cat: 'consumable', price: price, effect: Object.assign({}, eff, { meal: { buff: buff, battles: 3 } }), desc: desc, food: 'food', bread76: true }; };
  B('bread_round', '丸パン', 120, { hp: 60 }, { atk: 0.06 }, 'HPを60回復。次の戦闘3回まで攻撃力+6%');
  B('bread_milk', 'ミルクパン', 160, { hp: 80 }, { def: 0.08 }, 'HPを80回復。次の戦闘3回まで守備力+8%');
  B('bread_honey', 'はちみつパン', 220, { hp: 100, mp: 10 }, { agi: 0.08 }, 'HP100・MP10回復。次の戦闘3回まで素早さ+8%');
  B('bread_herb', '香草のパン', 340, { hp: 120, mp: 20 }, { mag: 0.08, mdef: 0.06 }, 'HP120・MP20回復。次の戦闘3回まで魔力+8%・魔法防御+6%');
  B('bread_date', 'なつめやしのパン', 280, { hp: 150 }, { atk: 0.08, agi: 0.05 }, 'HPを150回復。次の戦闘3回まで攻撃力+8%・素早さ+5%（砂漠の名物）');
  B('bread_fish', '港の魚サンド', 290, { hp: 160 }, { def: 0.08, mdef: 0.05 }, 'HPを160回復。次の戦闘3回まで守備力+8%・魔法防御+5%（港の名物）');
  B('bread_baguette', '勇者のバゲット', 460, { hp: 220, mp: 20 }, { atk: 0.10, def: 0.06 }, 'HP220・MP20回復。次の戦闘3回まで攻撃力+10%・守備力+6%');
  root.BREAD76 = {
    rivel_town: ['bread_round', 'bread_milk', 'bread_honey', 'bread_baguette'],
    harbor_town: ['bread_round', 'bread_milk', 'bread_fish'],
    sahar_city: ['bread_round', 'bread_honey', 'bread_herb', 'bread_date']
  };
})(typeof window !== 'undefined' ? window : globalThis);
