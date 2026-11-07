// v8.2 coverage.json を作る：node coverage82.js <出力 coverage.json> [証拠のディレクトリの json]
// 列：mapId, parentTown, role, themeId, recipeId, status, beforeImage, afterImagePC, afterImageMobile, routeTest, saveTest, notes
// status の決め方（証拠のないものは上げない）
//   design_only：作り方の表だけ（組み立てた記録がない）
//   implemented：3D で組み立てた記録がある（after の画面の撮影で、レシピがあり失敗なし）
//   visual_checked：PC の画面の画像があり、目で見た（目で見た一覧 VIEWED に入っている）
//   gameplay_checked：出入口の往復（route82_test）がその地図のワープ全部で OK（または前からの NG だけ）
//   verified：visual_checked と gameplay_checked の両方、かつスマホの画像も目で見た
const fs = require('fs'); const path = require('path'); const load = require('../v78/load78.js');
const outFile = process.argv[2] || 'docs/arch82/coverage.json'; const E = JSON.parse(fs.readFileSync(process.argv[3] || 'docs/arch82/evidence.json', 'utf8'));
const { w } = load({}); const D = w.MAP_DEFS; const L = w.Layout82;
const NEW = Object.keys(D).filter((k) => D[k].castle82 || D[k].academy82);
const ids = Array.from(new Set(Object.keys(L.owner).concat(NEW))).filter((k) => D[k]).sort();
const shot = (dir, tag, id) => { const f = path.join(E.shotRoot, dir, tag + '_' + id + '.jpg'); return fs.existsSync(f) ? path.join(E.publish, dir, id + '.jpg') : null; };
const res = (file) => { try { return JSON.parse(fs.readFileSync(path.join(E.shotRoot, file), 'utf8')).res.reduce((o, r) => { o[r.id] = r; return o; }, {}); } catch (e) { return {}; } };
const after = res('after_int/after_pc_result.json'), afterSp = res('after_sp/after_sp_result.json');
const route = {}; (fs.readFileSync(E.routeLog, 'utf8').split('\n')).forEach((ln) => { const m = /^NG {2}([a-z0-9_]+)\(/.exec(ln); if (m) (route[m[1]] = route[m[1]] || []).push(ln.slice(4)); });
const preNG = new Set(E.routePreexisting || []);
const saveMaps = {}; (fs.readFileSync(E.saveLog, 'utf8').split('\n')).forEach((ln) => { const m = /^(OK|NG) {2}.*→ ([a-z0-9_]+) /.exec(ln); if (m) saveMaps[m[2]] = (saveMaps[m[2]] === 'NG' || m[1] === 'NG') ? 'NG' : 'OK'; });
const viewed = new Set(E.viewedPC || []), viewedSp = new Set(E.viewedSP || []);
const rows = ids.map((id) => {
  const info = L.info(id) || {}; const town = info.town || (D[id].castle82 ? D[id].castle82.town : null); const r = after[id] || {}; const sp = afterSp[id] || {};
  const rc = r.recipe || ''; const themeId = /^interior82:/.test(rc) ? rc.split(':')[1] : /^castle82:/.test(rc) ? 'castle82:' + rc.split(':')[1] : /\|i82$/.test(rc) ? 'rivel_castle_approach' : null;
  const rt = route[id] ? (route[id].every((s) => preNG.has(s)) ? 'OK（前からの NG ' + route[id].length + '：' + route[id].join(' / ') + '）' : 'NG：' + route[id].join(' / ')) : 'OK';
  const st = saveMaps[id] || '-';
  const impl = !!(r.recipe && !r.err && !r.errs); const pc = shot('after_int', 'after_pc', id), mob = shot('after_sp', 'after_sp', id);
  let status = impl ? 'implemented' : (themeId ? 'design_only' : 'design_only');
  const vis = impl && pc && viewed.has(id); const game = !/^NG/.test(rt);
  if (vis) status = 'visual_checked'; if (vis && game) status = 'gameplay_checked'; if (vis && game && mob && viewedSp.has(id)) status = 'verified';
  const notes = [];
  if (D[id]._l82) notes.push('間取り：' + D[id]._l82.role + (D[id]._l82.sub ? '/' + D[id]._l82.sub : '') + '（置いた物 ' + D[id]._l82.pieces + '）'); else if (L.skipped[id]) notes.push('間取りは変えない：' + L.skipped[id]);
  if (NEW.indexOf(id) >= 0) notes.push('v8.2 の新しい地図'); if (r.err) notes.push('3D：' + r.err); if (!r.id) notes.push('PC の画面の撮影なし');
  return { mapId: id, parentTown: town, role: info.role || (D[id].castle82 ? 'castle_district' : null), themeId, recipeId: r.recipe || null, status,
    beforeImage: shot('before_int', 'before_pc', id), afterImagePC: pc, afterImageMobile: mob, routeTest: rt, saveTest: st, notes: notes.join('／') };
});
const count = {}; rows.forEach((r) => { count[r.status] = (count[r.status] || 0) + 1; });
fs.writeFileSync(outFile, JSON.stringify({ generated: new Date().toISOString(), rule: 'status は証拠のあるものだけ上げる（docs/tools/v82/coverage82.js の先頭）', count, rows }, null, 1));
console.log('地図', rows.length, JSON.stringify(count));
