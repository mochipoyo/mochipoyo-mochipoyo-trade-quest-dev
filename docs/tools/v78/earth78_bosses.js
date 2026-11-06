// v7.8 新しいボス5体の勝率（章の想定レベル・オート戦闘・アイテムなし・その章の店の最強装備）。/home/claude/work の bosstune67.js（v6.7）と、読み込みだけ地球の世界にする hook を使う
// 使い方：cd /home/claude/work && node -r docs/tools/v78/earth78_hook.js docs/tools/v78/earth78_bosses.js（N=60 で各60戦）
process.env.RPG_DIR = process.env.RPG_DIR || '/home/claude/envwork/';
const T = require('/home/claude/work/v67/bosstune67.js'); const w = T.world(); const N = +(process.env.N || 40);
const rows = JSON.parse(process.env.ROWS || 'null') || [['boss_tides', 8, ['boss_tides'], 'side', 0], ['boss_block_signal', 9, ['boss_block_signal'], 'side', 0], ['boss_archive_warden', 13, ['boss_archive_warden'], 'side', 0], ['boss_sentinel_orbis', 16, ['boss_sentinel_orbis'], 'side', 0], ['boss_anchor_core', 16, ['boss_anchor_core'], 'side', 0]];
const mul = JSON.parse(process.env.MUL || '{}');
console.log('earth', !!(w.World76 && w.World76.earth), 'has', rows.map((r) => !!w.ENEMIES[r[0]]).join(','));
rows.forEach((row) => { const e = w.ENEMIES[row[0]]; const r1 = T.rate(row, mul, 0, N), r2 = T.rate(row, mul, 1, N); console.log(row[0], 'ch' + row[1], 'lv' + e.lv, 'hp' + e.hp, 'atk' + e.atk, 'F1 ' + Math.round(r1.win * 100) + '% ' + r1.turns.toFixed(1) + 't', 'F2 ' + Math.round(r2.win * 100) + '% ' + r2.turns.toFixed(1) + 't'); });
