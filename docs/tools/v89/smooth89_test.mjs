// v8.9 なめらかさ優先（Smooth89）の決まりの確かめ（node。画面は使わない）：node smooth89_test.mjs
import { Smooth89, SMOOTH89 } from '../../../three-src/src/engine/Smooth89.js';
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const run = (s, fn, frames) => { const out = []; for (let i = 0; i < frames; i++) { const r = s.feed(fn(s, i)); if (r !== null) out.push(r); } return out; };
// 1) GPU が重い端末：解像度に比例して重い（1.25 で 30ms）→ 下げると速くなる → 下げたまま（1 段か 2 段）。上下に揺れない
{ const s = new Smooth89(1.25, 0.9); const ch = run(s, (st) => 30 * (st.pr / 1.25) ** 2, 2000);
  T(ch.length >= 1 && ch.every((v, i) => i === 0 || v <= ch[i - 1]), 'GPU が重い：解像度を下げる方向だけに変わる ' + JSON.stringify(ch) + ' ' + JSON.stringify(s.log));
  T(s.pr < 1.25 && s.pr >= 0.9, 'GPU が重い：下げた値 ' + s.pr + '（0.9 以上）'); }
// 2) 速い端末：変えない
{ const s = new Smooth89(1.25, 0.9); const ch = run(s, () => 16.7, 2000); T(ch.length === 0 && s.pr === 1.25, '速い端末（60 コマ）：変えない'); }
// 3) 30 コマに固定（省電力）：下げても速くならない → 1 回試して戻し、その地図ではもう下げない
{ const s = new Smooth89(1.25, 0.9); const ch = run(s, () => 33.3, 3000); T(ch.length === 2 && ch[0] < 1.25 && ch[1] === 1.25 && s.pr === 1.25 && s.noLower, '30 コマ固定：1 回下げて効かないので戻す・以後は下げない ' + JSON.stringify(ch));
  s.reset(); const ch2 = run(s, () => 33.3, 400); T(ch2.length === 2 && s.pr === 1.25, '地図が変わったら、もう一度だけ確かめる ' + JSON.stringify(ch2)); }
// 4) CPU が重い（解像度に関係なく 28ms）：下げて効かないので戻す
{ const s = new Smooth89(1.25, 0.9); run(s, () => 28, 3000); T(s.pr === 1.25 && s.noLower, 'CPU が重い：解像度は元のまま ' + JSON.stringify(s.log)); }
// 5) 重い場所から軽い場所へ（地図が変わる）：reset 後に速ければ戻る
{ const s = new Smooth89(1.25, 0.9); run(s, (st) => 30 * (st.pr / 1.25) ** 2, 1500); const low = s.pr; s.reset(); run(s, () => 12, 3000); T(low < 1.25 && s.pr === 1.25, '軽い地図へ移ると元の解像度へ戻る（' + low + ' → ' + s.pr + '）'); }
// 6) 長い止まり（組み立て・画面が隠れていた）は数えない
{ const s = new Smooth89(1.25, 0.9); run(s, (st, i) => (i % 10 === 0 ? 400 : 16.7), 2000); T(s.pr === 1.25, '250ms を超える止まりは数えない'); }
console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng)); process.exit(ng.length ? 1 : 0);
