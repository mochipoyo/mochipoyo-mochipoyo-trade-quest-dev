// 基準のコードと変更後のコードで、旧セーブを読み込んだ結果を比べる（時刻の値＝ultimate.learned.*.t は除く）
const a = require(process.argv[2]), b = require(process.argv[3]); let bad = 0;
function diff(x, y, p, out) { if (/ultimate\.learned\.[^.]+\.t$/.test(p)) return; if (JSON.stringify(x) === JSON.stringify(y)) return; if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) diff(x[k], y[k], p + '.' + k, out); } else out.push(p + ': ' + JSON.stringify(x) + ' -> ' + JSON.stringify(y)); }
for (const k of Object.keys(a)) { const out = []; diff(a[k], b[k], k, out); if (out.length) bad++; console.log((out.length ? 'NG  ' : 'OK  ') + k + '：' + (out.length ? out.slice(0, 6).join(' | ') : '基準のコードと同じ（場所 ' + a[k].map + ' ' + a[k].x + ',' + a[k].y + '・フラグ・クエスト・仲間・持ち物・お金・トレードの記録）')); }
console.log('結果：' + (Object.keys(a).length - bad) + ' OK / ' + bad + ' NG'); process.exit(bad ? 1 : 0);
