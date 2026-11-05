/* =========================================================
   RPG / Meal76（v7.6）：パンなどの「腹持ちの効果」＝回復しつつ、次の戦闘 3 回まで能力が少し上がる
   ・道具の effect.meal：{ buff: { atk: 0.08, ... }, battles: 3 }（能力の名前は Combat と同じ：atk・def・agi・mag・mdef）
   ・食べた人の meal76 に記録（セーブに入る。古いセーブには無い＝効果なし）。1人に1つだけ（新しく食べると入れ替わる）
   ・戦闘の始め（Combat.setup のあと）に buffs へ入れる（turns 999）。戦闘の終わりに残りを1減らし、0 で消える（知らせる）
   ・品物：js/data/bread76.js
   ========================================================= */
(function (root) {
  'use strict';
  var NAME = { atk: '攻撃力', def: '守備力', agi: '素早さ', mag: '魔力', mdef: '魔法防御' };
  var Meal = root.Meal76 = { NAME: NAME };
  Meal.describe = function (meal) { if (!meal || !meal.buff) return ''; return Object.keys(meal.buff).map(function (k) { return (NAME[k] || k) + '+' + Math.round(meal.buff[k] * 100) + '%'; }).join('・'); };
  // 食べる（フィールドでも戦闘中でも）。戻り値：表示する文
  Meal.eat = function (a, item, inBattle) {
    var ef = item && item.effect && item.effect.meal; if (!a || !ef) return [];
    var had = a.meal76 && a.meal76.battles > 0 ? a.meal76 : null;
    a.meal76 = { id: item.id, name: item.name, buff: Object.assign({}, ef.buff), battles: ef.battles || 3 };
    if (inBattle) { a.buffs = a.buffs || {}; Object.keys(ef.buff).forEach(function (k) { a.buffs[k] = { value: ef.buff[k], turns: 999 }; }); a._meal76Used = true; }   // 戦闘中に食べたら、この戦闘も1回に数える
    var lines = [a.name + 'は' + Meal.describe(a.meal76) + '（次の戦闘' + a.meal76.battles + '回' + (inBattle ? '・この戦闘から' : '') + '）'];
    if (had && had.id !== item.id) lines.push('（' + had.name + 'の効果と入れ替わった）');
    return lines;
  };
  Meal.beforeBattle = function (party) {
    (party || []).forEach(function (a) { var m = a && a.meal76; if (!m || !(m.battles > 0) || !m.buff) return; a.buffs = a.buffs || {}; Object.keys(m.buff).forEach(function (k) { a.buffs[k] = { value: m.buff[k], turns: 999 }; }); a._meal76Used = true; });
  };
  Meal.afterBattle = function (party, result) {
    var ended = [];
    (party || []).forEach(function (a) { var m = a && a.meal76; if (!a) return; var used = a._meal76Used; delete a._meal76Used; if (!m || !used) return; m.battles = (m.battles || 0) - 1; if (m.battles <= 0) { ended.push(a.name); delete a.meal76; } });
    if (ended.length && root.Win && root.Win.toast) root.Win.toast(ended.join('・') + 'のパンの効果が切れた');
    return ended;
  };
  Meal.status = function (a) { var m = a && a.meal76; return m && m.battles > 0 ? m.name + '：' + Meal.describe(m) + '（あと' + m.battles + '戦）' : ''; };
})(typeof window !== 'undefined' ? window : globalThis);
