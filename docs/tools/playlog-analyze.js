// プレイ記録（設定 → データ管理 →「プレイ記録（バランス調整用）」で書き出した JSON）を集計する
// 使い方: node docs/tools/playlog-analyze.js mochipoyo-playlog-YYYYMMDD.json [さらにファイル...]
// 出力：戦闘の勝率とターン数（マップ別）、必殺技の結果と威力の倍率（技・流派別）、チャートの判断（モード別）、試験の合格率、クイズモンスターの正答率と奪われた額
'use strict';
const fs = require('fs');
const files = process.argv.slice(2); if (!files.length) { console.log('使い方: node playlog-analyze.js <書き出した JSON> [...]'); process.exit(1); }
let log = []; files.forEach(f => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); log = log.concat(Array.isArray(j) ? j : (j.log || [])); });
const by = t => log.filter(e => e.type === t); const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-'; const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100) / 100 : '-';
function group(arr, key) { const g = {}; arr.forEach(e => { const k = typeof key === 'function' ? key(e) : e[key]; (g[k] = g[k] || []).push(e); }); return g; }
console.log('記録 ' + log.length + '件（' + files.length + 'ファイル）');
const bt = by('battle'); console.log('\n■ 戦闘 ' + bt.length + '回'); Object.entries(group(bt, 'map')).sort((a, b) => b[1].length - a[1].length).forEach(([m, a]) => console.log(`  ${m}: ${a.length}回 勝ち${pct(a.filter(e => e.result === 'won').length, a.length)} 全滅${a.filter(e => e.result === 'lost').length} 平均${avg(a.map(e => e.turns))}ターン 主人公Lv${avg(a.map(e => e.lv || 0))}`));
const ul = by('ult'); console.log('\n■ 必殺技 ' + ul.length + '回'); Object.entries(group(ul, 'id')).forEach(([id, a]) => console.log(`  ${id}: ${a.length}回 利益${pct(a.filter(e => e.outcome === 'profit').length, a.length)} 見送り${pct(a.filter(e => e.outcome === 'skip').length, a.length)} 平均倍率${avg(a.map(e => e.mult || 0))} 根拠どおり${pct(a.filter(e => e.process).length, a.length)}`));
const tr = by('trade'); console.log('\n■ チャートの判断 ' + tr.length + '回'); Object.entries(group(tr, 'mode')).forEach(([m, a]) => { const ent = a.filter(e => e.outcome !== 'skip'); console.log(`  ${m}: ${a.length}回 エントリー${pct(ent.length, a.length)} 勝率${pct(ent.filter(e => e.outcome === 'profit').length, ent.length)} 平均R ${avg(ent.map(e => e.r || 0))} 時間切れ${a.filter(e => e.auto).length}`); });
const ex = by('exam'); console.log('\n■ 試験 ' + ex.length + '回'); Object.entries(group(ex, e => e.mid + ':' + e.kind)).forEach(([k, a]) => console.log(`  ${k}: ${a.length}回 合格${pct(a.filter(e => e.pass).length, a.length)} 平均${avg(a.map(e => e.avg))}点`));
const qz = by('quiz'); console.log('\n■ クイズモンスター ' + qz.length + '回'); Object.entries(group(qz, 'mid')).forEach(([k, a]) => console.log(`  ${k}: ${a.length}回 正解${pct(a.filter(e => e.ok).length, a.length)} 奪われた計${a.reduce((s, e) => s + (e.stolen || 0), 0)}G ヒントあり${a.filter(e => e.hint).length}回 主人公Lv${avg(a.map(e => e.lv || 0))}`));
const wrongQ = group(qz.filter(e => !e.ok), 'qid'); const top = Object.entries(wrongQ).sort((a, b) => b[1].length - a[1].length).slice(0, 10); if (top.length) console.log('  間違いの多い問題：' + top.map(([q, a]) => q + '×' + a.length).join('、'));
const vs = by('visit'); if (vs.length) { console.log('\n■ はじめて入ったマップ（順番・その時の主人公Lv・所持金）'); vs.forEach(e => console.log(`  ${new Date(e.t).toISOString().slice(0, 16)} ${e.to} Lv${e.lv} ${e.gold}G`)); }
