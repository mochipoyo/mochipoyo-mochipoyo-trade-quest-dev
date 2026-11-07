// v8.2 coverage.json を作る：node docs/tools/v82/coverage82.js [出力 coverage.json] [証拠の json]
// 列：mapId, parentTown, role, themeId, recipeId, status, beforeImage, afterImagePC, afterImageMobile, routeTest, saveTest, notes
// 行：町に属する全部の部屋（Layout82.owner）＋ v8.2 の新しい地図（城郭区画・学院の本校舎）＋ 町 35 ＋ 野外の見せ場（浮遊マクディア・城の輪郭）＋ 地図を持たない物（大洋のリング・空の城アエリア）
// status の決め方（証拠のないものは上げない）
//   design_only：作り方の表だけ（3D で組み立てた記録がない／v8.2 で変えていない）
//   implemented：3D で組み立てた記録がある（最終のスナップショットでの PC の撮影で、レシピがあり失敗なし）
//   visual_checked：PC の画面の画像があり、目で見た（証拠の viewedPC に入っている）
//   gameplay_checked：visual_checked かつ 出入口の往復（route82_test）がその地図のワープ全部で OK（前からの NG だけのときは OK 扱い・notes に書く）
//   verified：gameplay_checked かつ スマホ（390×844）の画像も目で見た（viewedSP）
const fs = require('fs'); const path = require('path'); const load = require('../v78/load78.js');
const outFile = process.argv[2] || 'docs/arch82/coverage.json'; const E = JSON.parse(fs.readFileSync(process.argv[3] || 'docs/arch82/evidence.json', 'utf8'));
const { w } = load({}); const D = w.MAP_DEFS; const L = w.Layout82;
const NEW = Object.keys(D).filter((k) => D[k].castle82 || D[k].academy82);
const TOWNS = E.towns || []; const FIELDS = E.fields || {}; const EXT = new Set(E.townExt || []);
const ids = Array.from(new Set(Object.keys(L.owner).concat(NEW).concat(TOWNS).concat(Object.keys(FIELDS)))).filter((k) => D[k]).sort();
const shot = (dir, tag, id) => { const f = path.join(E.shotRoot, dir, tag + '_' + id + '.jpg'); return fs.existsSync(f) ? path.join(E.publish, dir, id + '.jpg') : null; };
const res = (file) => { try { return JSON.parse(fs.readFileSync(path.join(E.shotRoot, file), 'utf8')).res.reduce((o, r) => { o[r.id] = r; return o; }, {}); } catch (e) { return {}; } };
const after = res('after_int/after_pc_result.json'), afterSp = res('after_sp/after_sp_result.json');
const ngOf = (file) => { const o = {}; if (!file || !fs.existsSync(file)) return o; fs.readFileSync(file, 'utf8').split('\n').forEach((ln) => { const m = /^NG {2}([a-z0-9_]+)\(/.exec(ln); if (m) (o[m[1]] = o[m[1]] || []).push(ln.slice(4)); }); return o; };
const route = ngOf(E.routeLog), routeOpen = ngOf(E.routeLogOpen); const routeScope = new Set(Object.keys(L.owner).concat(NEW).concat(['rivel_town', 'sentra_capital', 'magicka_city', 'volatilia']));   // route82_test.js と同じ対象
const preNG = new Set(E.routePreexisting || []);
const saveMaps = {}; (fs.readFileSync(E.saveLog, 'utf8').split('\n')).forEach((ln) => { const m = /^(OK|NG) {2}.*→ ([a-z0-9_]+) /.exec(ln); if (m) saveMaps[m[2]] = (saveMaps[m[2]] === 'NG' || m[1] === 'NG') ? 'NG' : 'OK'; });
const viewed = new Set(E.viewedPC || []), viewedSp = new Set(E.viewedSP || []);
const rows = ids.map((id) => {
  const def = D[id]; const info = L.info(id) || {}; const isTown = TOWNS.indexOf(id) >= 0; const field = FIELDS[id];
  const town = isTown ? id : field ? null : (info.town || (def.castle82 ? def.castle82.town : def.academy82 ? 'volatilia' : null));
  const r = after[id] || {}; const rc = r.recipe || '';
  const themeId = /^interior82:/.test(rc) ? rc.split(':')[1] : def.castle82 ? def.castle82.style + '（城郭区画）' : (isTown && EXT.has(id)) ? 'TOWN_EXT82:' + id : null;
  let rt;
  if (!routeScope.has(id)) rt = '-（往復の確かめの対象外：' + (isTown ? '町（楼門・本館の扉は対象）' : field ? '野外' : '—') + '）';
  else if (!route[id]) rt = 'OK';
  else if (route[id].every((s) => preNG.has(s))) rt = 'OK（前からの NG ' + route[id].length + '：' + route[id].join(' / ') + '）';
  else if (!routeOpen[id] || routeOpen[id].every((s) => preNG.has(s))) rt = 'OK（物語の鍵を開けた状態。開ける前は通れない：' + route[id].filter((s) => !preNG.has(s)).join(' / ') + '）';
  else rt = 'NG：' + route[id].join(' / ');
  if (isTown && (def.buildings || []).some((b) => b.gate82 || b.academy82 || b.id === 'va_main') && routeScope.has(id) && rt === 'OK') rt = 'OK（楼門・本館の扉）';
  const st = saveMaps[id] || '-';
  const pc = shot('after_int', 'after_pc', id), mob = shot('after_sp', 'after_sp', id);
  const changed = !!(def._l82 || NEW.indexOf(id) >= 0 || /^interior82:/.test(rc) || (isTown && EXT.has(id)) || field || /castle82|i82/.test(rc));
  const impl = changed && !!(r.recipe && !r.err && !r.errs);
  let status = impl ? 'implemented' : 'design_only';
  const vis = impl && pc && viewed.has(id); const game = !/^NG/.test(rt);
  if (vis) status = 'visual_checked'; if (vis && game && routeScope.has(id)) status = 'gameplay_checked'; if (status === 'gameplay_checked' && mob && viewedSp.has(id)) status = 'verified';
  const notes = [];
  if (def._l82) notes.push('間取り：' + def._l82.role + (def._l82.sub ? '/' + def._l82.sub : '') + '（置いた物 ' + def._l82.pieces + '）'); else if (L.skipped[id]) notes.push('間取りは変えない：' + L.skipped[id]);
  if (NEW.indexOf(id) >= 0) notes.push('v8.2 の新しい地図');
  if (isTown) notes.push(EXT.has(id) ? '町の外観を v8.2 で上書き（壁・屋根・道・灯り）' : '外観は前からの地域の作り方のまま（v8.2 の外観の上書きなし）');
  if (field) notes.push(field);
  if (!changed && !isTown) notes.push('v8.2 で 3D の作り方を変えていない（' + (rc || 'レシピ不明') + '）');
  if (r.err) notes.push('3D：' + r.err); if (!r.id) notes.push('PC の画面の撮影なし'); if (pc && !viewed.has(id)) notes.push('PC の画像は目で見ていない');
  if (routeScope.has(id) && !/^OK/.test(rt) && rt[0] !== '-') notes.push('往復の確かめに NG あり');
  return { mapId: id, parentTown: town, role: isTown ? 'town' : field ? 'field_landmark' : (info.role || (def.castle82 ? 'castle_district' : def.academy82 ? 'academy_main' : null)), themeId, recipeId: r.recipe || null, status,
    beforeImage: shot('before_int', 'before_pc', id) || shot('before', 'before_pc', id), afterImagePC: pc, afterImageMobile: mob, routeTest: rt, saveTest: st, notes: notes.join('／') };
});
(E.extra || []).forEach((x) => rows.push(x));   // 地図を持たない物（大洋のリング・空の城）：証拠の json に書いた行
const count = {}; rows.forEach((r) => { count[r.status] = (count[r.status] || 0) + 1; });
fs.writeFileSync(outFile, JSON.stringify({ generated: new Date().toISOString(), commit: E.commit, rule: 'status は証拠のあるものだけ上げる（docs/tools/v82/coverage82.js の先頭）', count, rows }, null, 1));
console.log('行', rows.length, JSON.stringify(count));
