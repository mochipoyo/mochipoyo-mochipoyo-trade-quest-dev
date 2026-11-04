// 戦闘背景の画像（v6.6）の確認：node tools/check-battle-backgrounds.js
//   ・docs/battle-backgrounds-manifest.json のキー ＝ js/ui/battlebg65.js の BattleBG65.PLACES（14種）か
//   ・BattleBG65.PHOTO / PHOTO_VARIANT のファイル名 ＝ マニフェストのパスか
//   ・画像ファイルがあり、WebP として読め、寸法がマニフェストどおり（1672×941）か
//   ・v7.4 39ダンジョンの専用の背景：docs/battle-backgrounds-dungeons39.json（ご提供のパックの対応表）＝ js/data/battlebg39.js か（39枚・116マップ・ファイル・SHA-256・寸法・地平線の値）
//   戻り値：問題があれば終了コード 1
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); let bad = 0; const ng = (m) => { bad++; console.log('NG  ' + m); }; const ok = (m) => console.log('OK  ' + m);
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-backgrounds-manifest.json'), 'utf8'));
const sb = { console: { warn() {}, log() {} } }; sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data/battlebg39.js'), 'utf8'), sb);   // v7.4 39ダンジョンの背景（battlebg65 が読む）
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
// v7.4 39ダンジョンの専用の背景
{
  const crypto = require('crypto'); const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-backgrounds-dungeons39.json'), 'utf8')); const D = sb.BATTLE_BG39;
  if (!D) ng('js/data/battlebg39.js を読み込めない');
  else {
    const seen = {}; let nmap = 0, t39 = 0;
    for (const a of pack.assets) {
      const k = a.variant; const js = D.files[k]; const vf = BG.PHOTO_VARIANT[k];
      if (!js || vf !== js) { ng(k + '：battlebg39.js / PHOTO_VARIANT に対応がない'); continue; }
      if (BG.PHOTO_DIR + js !== a.file) ng(k + '：パスが違う（js=' + BG.PHOTO_DIR + js + ' / pack=' + a.file + '）');
      const p = path.join(ROOT, a.file); if (!fs.existsSync(p)) { ng(k + '：ファイルがない ' + a.file); continue; }
      const buf = fs.readFileSync(p); t39 += buf.length; const sz = webpSize(buf); const sha = crypto.createHash('sha256').update(buf).digest('hex');
      if (!sz || sz[0] !== a.width || sz[1] !== a.height) ng(k + '：寸法 ' + (sz ? sz.join('×') : '読めない'));
      if (sha !== a.sha256 || buf.length !== a.bytes) ng(k + '：ご提供のファイルと中身が違う（SHA-256・大きさ）');
      const hz = BG.PHOTO_HORIZON && BG.PHOTO_HORIZON[k]; if (!(hz >= 0.3 && hz <= 0.7)) ng(k + '：地平線の値がない・範囲外 ' + hz);
      for (const m of a.maps) { nmap++; if (seen[m.mapId]) ng(m.mapId + '：2つの絵に割り当て'); seen[m.mapId] = 1; if (D.maps[m.mapId] !== k) ng(m.mapId + '：対応が違う（js=' + D.maps[m.mapId] + ' / pack=' + k + '）'); if (BG.dungeonVariant(m.mapId, 'dungeon', null) !== k) ng(m.mapId + '：BattleBG65.dungeonVariant が ' + k + ' を返さない'); }
    }
    const extra = Object.keys(D.maps).filter((id) => !seen[id]); if (extra.length) ng('パックにないマップの対応：' + extra.join(','));
    if (pack.assets.length !== 39 || Object.keys(D.files).length !== 39 || nmap !== 116 || Object.keys(D.maps).length !== 116) ng('数が違う：絵 ' + Object.keys(D.files).length + '・マップ ' + Object.keys(D.maps).length);
    else ok('39ダンジョンの専用の背景：39枚（' + (t39 / 1048576).toFixed(2) + 'MB）・116マップ・ファイルの SHA-256・寸法・地平線の値・選び方がご提供の対応表どおり');
    total += t39;
  }
}
console.log('合計 ' + (total / 1048576).toFixed(2) + 'MB');
if (bad) { console.log(bad + ' 件の問題'); process.exit(1); } else console.log('問題なし');
