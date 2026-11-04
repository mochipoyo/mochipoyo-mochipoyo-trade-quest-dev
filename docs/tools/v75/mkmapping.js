// 追加の敵35体の対応表（docs/enemies-add35-mapping.md）を作る：正式名 → 最終ID → 画像 → 実際の出現（マップ・出現表・適正レベル）
const load = require('../rpgload.js'); const { w } = load(); const fs = require('fs');
const X = w.ENEMY_ADD35, D = w.MAP_DEFS, EN = w.ENEMIES;
const where = {}; Object.keys(D).forEach((mid) => { const d = D[mid]; ((d.encounters && d.encounters.zones) || []).forEach((z) => { z.groups.forEach((g) => g.forEach((id) => { if (!X.list.some((r) => r.id === id)) return; (where[id] = where[id] || new Map()).set(mid + '|' + z.name, { mid, name: d.name || mid, zone: z.name, lv: z.level, hidden: /^a\d_/.test(mid) }); })); }); });
const L = [];
L.push('| 番号 | 正式名（name_ja） | 区分 | 最終ID | 画像（ゲームが読むもの） | 実際の出現（マップ名［マップID］・出現表・適正レベル） | Lv | 体格 |');
L.push('|---|---|---|---|---|---|---|---|');
X.list.forEach((r) => {
  const e = EN[r.id]; const ws = [...(where[r.id] || new Map()).values()];
  const main = ws.filter((q) => !q.hidden).map((q) => q.name + '［' + q.mid + '］・' + q.zone + '・' + q.lv); const hid = ws.filter((q) => q.hidden).map((q) => q.mid);
  L.push('| ' + String(r.no).padStart(3, '0') + ' | ' + r.name + ' | ' + (r.reuse ? '既存IDを使う' : '新規登録') + ' | `' + r.id + '`' + (r.reuse ? '（提案ID `' + r.packId + '` は使わない）' : '') + ' | `' + r.file + '` | ' + main.join('<br>') + (hid.length ? '<br>（同じ出現表を使う隠し区画：' + hid.join('・') + '）' : '') + ' | ' + e.lv + ' | ' + r.size + (r.floating ? '・浮遊' : '') + ' |');
});
fs.writeFileSync(process.argv[2], L.join('\n') + '\n'); console.log(L.length - 2, 'rows');
