// v8.2 町ごとの屋内の作り方の差（色を数えない）：node theme82_diff.mjs
// ・theme82.js の TOWN82 の全部の組で、壁の作り・腰板・床の張り方・窓・天井・灯り・家具の系統・暖炉・間仕切り・敷物・その町の品（2 つ以上ちがう）の差の数
// ・状態の地図（base を持つ：襲撃の夜・壊滅後・復興・満潮・干潮）は、もとの町との差も出す
// ・「各町で色以外に最低 4 種類の差」：前（v8.1）の共通の作り（しっくいと腰板の部屋・同じ家具）との差は、全部の町で数える
import { TOWN82, Theme82 } from '../../../three-src/src/environment/theme82.js';
const ids = Object.keys(TOWN82); let minPair = { n: 99 }; const low = []; const fam = [];
const FAM = { rivel_castle_approach: 'rivel_town', sentra_palace_approach: 'sentra_capital', magicka_palace_approach: 'magicka_city' }; const root = (id) => FAM[id] || TOWN82[id].base || id;   // 同じ所の家族（城郭区画と城下町・状態の地図ともとの町）
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const r = Theme82.diff(ids[i], ids[j]); const same = root(ids[i]) === root(ids[j]); if (same) { fam.push(ids[i] + '×' + ids[j] + ' ' + r.n + ' ' + r.keys.join('/')); continue; } if (r.n < minPair.n) minPair = { n: r.n, a: ids[i], b: ids[j], keys: r.keys }; if (r.n < 4) low.push(ids[i] + '×' + ids[j] + ' ' + r.n + ' ' + r.keys.join('/')); }
// 前の共通の作り（v8.1 の room_kit の家）との差
const OLD = { wall: 'plaster', wain: 'plank', floor: 'plank', win: 'sash', ceil: 'beams', light: 'lantern', furn: 'glb_common', fire: 'stone_mantel', part: '-', rug: 'plain' };
const vsOld = ids.map((id) => { const t = TOWN82[id]; let n = 0; const k = [];
  const c = (key, v) => { if (v !== OLD[key]) { n++; k.push(key); } };
  c('wall', t.wall.kind); c('wain', t.wall.wain ? t.wall.wain.kind : '-'); c('floor', t.floor.kind); c('win', t.win.kind); c('ceil', t.ceil.kind); c('light', t.light.kind); c('furn', t.furn); c('fire', t.fire); c('part', t.part); c('rug', t.rug ? t.rug.kind : '-');
  return { id, n, k: k.join('/') }; });
console.log('町（作り方）', ids.length, '組', ids.length * (ids.length - 1) / 2, '差がいちばん少ない組', JSON.stringify(minPair));
console.log('ちがう町どうしで差が 4 より少ない組', low.length); low.forEach((s) => console.log('  ' + s));
console.log('同じ所の家族の組（城郭区画と城下町・状態の地図ともとの町。数えない）', fam.length); fam.forEach((s) => console.log('  ' + s));
console.log('前の共通の作りとの差（最小）', Math.min(...vsOld.map((v) => v.n))); vsOld.sort((a, b) => a.n - b.n).slice(0, 5).forEach((v) => console.log('  ' + v.id + ' ' + v.n + ' ' + v.k));
