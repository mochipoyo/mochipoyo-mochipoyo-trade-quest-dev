// v8.7 ボス固有装備の全件表（docs/arch87/TABLE87.md）を、読み込んだデータから作る：node report_table87.js
const load = require('../v78/load78.js'); const fs = require('fs'); const path = require('path');
const E = load({}).w; const T2 = load({ earth: false, join: false }).w;
const G = E.BOSS_UNIQUE_GEAR, I = E.ITEMS, EN = E.ENEMIES, M = E.MAP_DEFS, U = E.BossGear;
const bal = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../../arch87/logs/balance87.json'), 'utf8')); } catch (e) { return null; } })();
const st = (o) => { const N = { atk: '攻撃', def: '防御', mag: '魔力', mdef: '魔防', agi: '素早さ', hp: 'HP', mp: 'MP' }; return Object.keys(N).filter((k) => o && o[k]).map((k) => N[k] + o[k]).join('・') || '―'; };
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '／').replace(/\n/g, ' ');
const lines = ['# v8.7 ボス固有装備 全件表（74 行）', '', '自動生成：`node docs/tools/v87/report_table87.js`（読み込んだゲームデータから作る）。', '',
  '- 「2D」：2D 版（地球型オフ）で遊べるか（○＝現役・－＝その版には戦う場所がない）。収集率の分母は 3D 版 ' + U.activeRows().length + '・2D 版 ' + T2.BossGear.activeRows().length,
  '- 「基礎値」：既存 26 点は変えていない。新規で見直した行は「提案 → 実装」。比は、同じころの店の同じ枠の最強装備に対する点数の比（推定。docs/tools/v87/balance87.js）',
  '- 「補填の根拠」：旧セーブの補填で使う証拠。フラグ＝撃破の専用フラグ／図鑑＝そのボスの図鑑の撃破数（正規のボス戦にしか出ない A〜D のボスだけ）。E は通常の敵と ID を共有するため、フラグだけ',
  '- 「確かめ」：自動テスト（docs/tools/v87/rewards87_test.js・effects87_test.js）で通した項目。全行共通：初回の正規勝利で 1 個・2 回目 0 個・売れない・店／宝箱／敵のドロップに出ない', '',
  '| No | 区分 | ボス／encounter ID | 敵 | 戦う場所（地図 ID） | 装備 ID | 装備名（種類） | 新規／既存 | 基礎値 | 比 | 固有効果 | 既存の仕組みの効果 | 補填の根拠 | 2D | 確かめ |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
const KIND = { sword: '剣', axe: '斧', spear: '槍', staff: '杖', bow: '弓', claw: '爪', club: '槌', dagger: '短剣', heavy: '重鎧', light: '軽鎧', robe: '法衣', shield: '盾', helm: '兜', hat: '帽子', acc: '装飾' };
const FXN = (fx) => !fx ? '' : Object.keys(fx).map((k) => { const v = fx[k]; if (k === 'resist') return '属性耐性 ' + Object.keys(v).map((e) => e + '×' + v[e]).join('・'); if (k === 'bonusElem') return '追加属性 ' + v.element + ' +' + Math.round(v.mult * 100) + '%' + (v.floorResist ? '（耐性下限1）' : ''); if (k === 'pierce') return '防御無視 ' + Math.round(v * 100) + '%'; if (k === 'autoScan') return '戦闘開始時に解析'; return k + ':' + JSON.stringify(v); }).join('・');
G.rows.forEach((r) => {
  const res = r.availability === 'reserved'; const it = I[r.itemId]; const e = EN[r.enemyIds[0]];
  const name = res ? r.reserved.name + '（' + (KIND[r.reserved.type] || r.reserved.type) + '）' : it.name + '（' + (KIND[it.type] || it.type) + '）';
  const where = r.sourceMapIds.map((m) => (M[m] ? M[m].name : '?') + '（' + m + '）').join('・');
  let base; if (res) base = '予約：' + st(r.reserved.st); else if (r.status === 'existing') base = st(r.before) + '（既存のまま）'; else if (r.tunedSt) base = '提案 ' + st(r.proposedSt) + ' → **' + st(r.tunedSt) + '**'; else base = st(r.proposedSt || it);
  const b = bal && bal.base.find((x) => x.key === r.key); const ratio = b && b.best && b.best.ratio ? b.best.ratio.toFixed(2) : '―';
  const ev = res ? '―（付与しない）' : r.group === 'E' ? 'フラグ ' + r.defeatFlags.join('・') : 'フラグ ' + (r.defeatFlags.join('・') || 'なし') + (U.bestiaryEligible(r) ? '／図鑑' : '');
  const in2d = res ? '－' : (T2.BossGear.activeRows().some((x) => x.key === r.key) ? '○' : '－');
  const check = res ? 'ITEMS に入れない（入手不可）を確認' : (r.group === 'E' ? '台本の戦闘で 1 個・通常の出現で 0 個' : r.group === 'D' ? 'onWin と二重にならない・道具 2 個／G／契約印は維持' : /demon_/.test(r.key) ? '3 形態：負け→読み込み直し→再開で各 1 個' : 'ボス戦で 1 個');
  lines.push('| ' + [r.no, r.group, '`' + r.key + '`', esc(e ? e.name : '?'), esc(where), '`' + r.itemId + '`', esc(name), res ? '予約' : r.status === 'new' ? '新規' : '既存強化', esc(base), ratio, res ? '―' : '【' + esc(r.unique.name) + '】' + esc(r.unique.text), esc(FXN(r.fxAdded) + (r.immuneAdded ? '・無効 ' + r.immuneAdded.join('・') : '') + (r.movedFx ? '（既存の反撃 ' + JSON.stringify(r.movedFx) + ' は固有効果へ移した）' : '')), esc(ev), in2d, esc(check)].join(' | ') + ' |');
});
lines.push('', '既存の専用ドロップから外したもの（読み込み時に敵の drops から外し、初回報酬に一本化）：' + G.movedDrops.join('、'));
fs.writeFileSync(path.join(__dirname, '../../arch87/TABLE87.md'), lines.join('\n') + '\n');
console.log('書き出し：docs/arch87/TABLE87.md（' + G.rows.length + ' 行）');
