// v7.6 環境リデザイン：マップごとの状態（STATUS.md と production_backlog の状態）を、実際の確認の結果から作る
//   使い方：node status.js <all_v1.json（p76_all.js の結果）> <リポジトリ>
//   状態：design_only（レシピなし＝従来の表示）→ integrated（レシピを当て、組み立てで失敗しない・歩けるマスに形が入らない、を自動で確認）
//         → visual_checked（画面を撮って目で見た）→ gameplay_checked（前後の比較で歩けるマスに形が入らない・論理を変えたマップは行ける所が減らない・3Dの回帰一式）
//         → verified（実機・GPU・速さまで。この作業環境ではしていない＝0）
const fs = require('fs'); const path = require('path');
const [allPath, repo, layoutPath] = process.argv.slice(2);   // layoutPath（任意）：layout_check.js の結果＝論理の間取りの作り直し
const LAY = layoutPath ? JSON.parse(fs.readFileSync(layoutPath, 'utf8')) : {};
const layNote = (id) => { const v = LAY[id]; if (!v) return '-'; if (v.skip) return '対象外（' + v.skip + '）'; if (!v.changed) return '変更なし'; const lm = v.landmark ? '・目印 ' + v.landmark.kind : ''; const sec = Array.isArray(v.sections) ? '・' + v.sections.join(' ') : ''; return v.changed + 'マス' + lm + sec; };
const { plan, res } = JSON.parse(fs.readFileSync(allPath, 'utf8'));
const VISUAL = ['poyo_village', 'rivel_castle', 'iron_mine_1', 'node_city', 'tradia',
  'rivel_town', 'sahar_city', 'frost_town', 'verum_town', 'kalion_city', 'aruna_village', 'magicka_city', 'ignas_town', 'dark_camp', 'tempus_city',
  'oblivion_cave_1', 'iron_mine_2', 'sentra_palace_1', 'forbidden_archive_1', 'demon_castle_1', 'auto_factory_1', 'rivel_inn', 'kalion_church', 'scheduled_district',
  // 追加作業（2026-11-04）：町の目印・フィールド・近未来と娯楽の町・屋外のダンジョン・城の部屋・ポヨ村の屋内・PBR の撮り比べ
  'harbor_town', 'world', 'world_grania', 'world_islands', 'world_tempus', 'world_machine', 'world_magicka', 'luxbell', 'tradia_sky', 'lost_forest', 'sky_temple_1',
  'a6_dc_statues', 'ignas_house_1', 'magicka_palace', 'poyo_inn', 'poyo_item_shop', 'rivel_castle_b1', 'sentra_palace_2', 'rivel_castle_library', 'emal_pass', 'grania_pass', 'mist_isle', 'aruna_item'];
// 前後（env=off と v1）を同じ場所で比べ、レシピ・建物の形が歩けるマスに入っていないことを確かめたマップ（p76_walk.js）
const WALK_COMPARED = ['poyo_village', 'rivel_castle', 'iron_mine_1', 'node_city', 'tradia', 'rivel_town', 'sahar_city', 'frost_town', 'dark_camp', 'kalion_city', 'harbor_town', 'tempus_city', 'magicka_city', 'ignas_town', 'aruna_village', 'verum_town',
  'oblivion_cave_1', 'iron_mine_2', 'sentra_palace_1', 'auto_factory_1', 'rivel_inn', 'kalion_church', 'demon_castle_1', 'forbidden_archive_1', 'mirage_temple_1', 'sunken_reef_1',
  'aruna_ruins', 'scheduled_district', 'erased_village', 'dow_village', 'ciel_port', 'sentra_capital', 'star_camp', 'volatilia', 'mirror_market', 'rivel_artisan', 'asana_village', 'asana_ruins',
  // 追加作業（2026-11-04〜05）
  'world', 'world_grania', 'world_islands', 'world_tempus', 'world_machine', 'world_magicka', 'world_sky', 'world_dark', 'world_desert', 'world_dragon', 'world_snow', 'world_kalion',
  'luxbell', 'tradia_sky', 'lost_forest', 'sky_temple_1', 'rivel_castle_b1', 'rivel_castle_library', 'magicka_palace', 'sentra_palace_2',
  'poyo_church', 'poyo_dojo', 'poyo_item_shop', 'poyo_inn', 'poyo_elder_house', 'poyo_house', 'poyo_mill', 'poyo_watch', 'poyo_watch_2f', 'poyo_watch_3f', 'poyo_barn', 'poyo_barn_2f', 'poyo_hall', 'poyo_hall_2f', 'poyo_elder_house_2f', 'poyo_inn_2f', 'poyo_church_2f', 'poyo_church_3f',
  'emal_pass', 'grania_pass', 'mist_isle', 'a6_em_hut', 'a6_gp_shelter', 'a6_mi_spring', 'aruna_item', 'aruna_lighthouse'];
const FLAGSHIP = ['poyo_village', 'rivel_castle', 'iron_mine_1', 'node_city', 'tradia'];
const rows = []; const count = {};
for (const id of Object.keys(plan).sort()) {
  const p = plan[id], r = res[id]; let st = 'design_only', note = '';
  if (p.recipe) {
    if (r && r.ok) st = 'integrated'; else { st = 'design_only'; note = r ? '自動の確認で NG：' + JSON.stringify(r).slice(0, 160) : '組み立ての確認をしていない'; }
    if (st === 'integrated' && VISUAL.includes(id)) st = 'visual_checked';
    if (st === 'visual_checked' && FLAGSHIP.includes(id) && WALK_COMPARED.includes(id)) st = 'gameplay_checked';
  } else note = 'レシピなし（従来の表示）';
  rows.push({ id, kind: p.kind, recipe: p.recipe || '-', status: st, walkCompared: WALK_COMPARED.includes(id), note, layout: layNote(id) });
  count[st] = (count[st] || 0) + 1;
}
const byKind = {}; rows.forEach((r) => { const k = r.kind; byKind[k] = byKind[k] || {}; byKind[k][r.status] = (byKind[k][r.status] || 0) + 1; });
const md = ['# 環境リデザイン：マップごとの状態（自動生成：docs/tools/env/status.js）', '',
  '状態の意味：design_only（レシピなし・従来の表示）／integrated（レシピを当て、全マップの自動の確認＝組み立てで失敗しない・ページのエラーなし・レシピと建物の形が歩けるマスの体の高さに入らない）／visual_checked（画面を撮って目で確認）／gameplay_checked（env=off と v1 の比較・論理を変えたマップの行ける所・3Dの回帰一式）／verified（実機・GPU・速さ。**この作業環境ではしていない＝0**）', '',
  '## 数', '', '| 種類 | ' + ['design_only', 'integrated', 'visual_checked', 'gameplay_checked', 'verified'].join(' | ') + ' |', '|---|---|---|---|---|---|',
  ...Object.keys(byKind).sort().map((k) => '| ' + k + ' | ' + ['design_only', 'integrated', 'visual_checked', 'gameplay_checked', 'verified'].map((s) => byKind[k][s] || 0).join(' | ') + ' |'),
  '| 合計 | ' + ['design_only', 'integrated', 'visual_checked', 'gameplay_checked', 'verified'].map((s) => count[s] || 0).join(' | ') + ' |', '',
  '## マップごと', '', '| マップID | 種類 | レシピ | 状態 | 前後の比較 | 論理の間取り（envlayout） | メモ |', '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.id} | ${r.kind} | ${r.recipe} | ${r.status} | ${r.walkCompared ? '済' : '-'} | ${r.layout} | ${r.note} |`)];
fs.writeFileSync(path.join(repo, 'docs/environment/STATUS.md'), md.join('\n') + '\n');
// production_backlog（パックの形）を実績で更新した版。パックにないマップ（v7.2〜v7.5 で増えたもの）も足す
const pack = JSON.parse(fs.readFileSync(path.join(repo, 'docs/environment/pack/data/production_backlog.json'), 'utf8'));
const old = {}; (pack.maps || []).forEach((m) => { old[m.mapId] = m; });
const maps = rows.map((r) => Object.assign({}, old[r.id] || { mapId: r.id, name: null, priority: null, requiredWork: [] }, { status: r.status, integration: r.status !== 'design_only', visualChecked: ['visual_checked', 'gameplay_checked', 'verified'].includes(r.status), gameplayChecked: ['gameplay_checked', 'verified'].includes(r.status), performanceChecked: false, recipe: r.recipe === '-' ? null : r.recipe, inPack: !!old[r.id], note: r.note || undefined }));
fs.writeFileSync(path.join(repo, 'docs/environment/production_backlog_status.json'), JSON.stringify({ generatedBy: 'docs/tools/env/status.js', note: 'performanceChecked はすべて false（実機・GPU で測っていない）', maps, additionalHeroAssets: pack.additionalHeroAssets }, null, 1));
console.log(JSON.stringify(count), JSON.stringify(byKind));
