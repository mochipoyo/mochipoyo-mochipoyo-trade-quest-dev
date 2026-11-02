// 戦闘背景の画像（v6.6）の確認：node tools/check-battle-backgrounds.js
//   ・docs/battle-backgrounds-manifest.json のキー ＝ js/ui/battlebg65.js の BattleBG65.PLACES（14種）か
//   ・BattleBG65.PHOTO / PHOTO_VARIANT のファイル名 ＝ マニフェストのパスか
//   ・画像ファイルがあり、WebP として読め、寸法がマニフェストどおり（1672×941）か
//   戻り値：問題があれば終了コード 1
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); let bad = 0; const ng = (m) => { bad++; console.log('NG  ' + m); }; const ok = (m) => console.log('OK  ' + m);
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-backgrounds-manifest.json'), 'utf8'));
const sb = { console: { warn() {}, log() {} } }; sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/ui/battlebg65.js'), 'utf8'), sb);
const BG = sb.BattleBG65; if (!BG) { console.log('NG  BattleBG65 を読み込めない'); process.exit(1); }
const places = BG.PLACES.slice().sort(), keys = Object.keys(man.entries).sort();
if (JSON.stringify(places) === JSON.stringify(keys)) ok('マニフェストのキー（' + keys.length + '）＝ BattleBG65.PLACES'); else ng('キーが違う：PLACES=' + places.join(',') + ' / manifest=' + keys.join(','));
function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null; const ch = buf.toString('ascii', 12, 16);
  if (ch === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (ch === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (ch === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  return null;
}
const W = man.imageSize.width, H = man.imageSize.height; let total = 0;
const all = Object.assign({}, man.entries, man.optionalVariants || {});
for (const k of Object.keys(all)) {
  const e = all[k]; const p = path.join(ROOT, e.path); const js = BG.PHOTO[k] || BG.PHOTO_VARIANT[k];
  if (!js) { ng(k + '：battlebg65.js に対応がない'); continue; }
  if (BG.PHOTO_DIR + js !== e.path) ng(k + '：パスが違う（js=' + BG.PHOTO_DIR + js + ' / manifest=' + e.path + '）');
  if (!fs.existsSync(p)) { ng(k + '：ファイルがない ' + e.path); continue; }
  const buf = fs.readFileSync(p); total += buf.length; const sz = webpSize(buf);
  if (!sz) { ng(k + '：WebP として読めない'); continue; }
  if (sz[0] !== W || sz[1] !== H) ng(k + '：寸法 ' + sz.join('×') + '（期待 ' + W + '×' + H + '）'); else ok(k.padEnd(19) + e.path.padEnd(52) + sz.join('×') + '  ' + Math.round(buf.length / 1024) + 'KB');
}
console.log('合計 ' + (total / 1048576).toFixed(2) + 'MB');
if (bad) { console.log(bad + ' 件の問題'); process.exit(1); } else console.log('問題なし');
