// v8.7 ボス固有装備：現行コードの走査（jsdom で読み込んだデータ＋ソースの battle( 呼び出し）
const fs = require('fs'), path = require('path');
const load = require('../v78/load78.js');
const ROOT = path.resolve(__dirname, '../../..');
const mode = process.argv[2] || 'earth';
const A = load(mode === '2d' ? { earth: false, join: false } : {}); const w = A.w;
const EN = w.ENEMIES, MD = w.MAP_DEFS;
const out = { mode, bossDefs: [], bossEvents: [], scriptBattles: [], symbols: [], b19: [] };
Object.keys(EN).forEach((id) => { const e = EN[id]; if (e.boss) out.bossDefs.push({ id, name: e.name, region: e.region || '', area: e.area || '', lv: e.lv, drops: (e.drops || []).map((d) => d.item + '@' + d.rate).join(' ') }); });
// マップの boss イベント（作り直し後の def も含め、World.getMap を通さず MAP_DEFS を見る）
Object.keys(MD).forEach((mid) => { const m = MD[mid]; (m.events || []).forEach((ev) => { if (ev.type === 'boss') out.bossEvents.push({ map: mid, x: ev.x, y: ev.y, enemies: (ev.enemies || [ev.enemy]).join(','), doneFlag: ev.doneFlag, requireFlag: ev.requireFlag || '', optional: !!ev.optional, reward: ev.reward ? ev.reward.item : '', onWin: !!ev.onWin, questComplete: ev.questComplete || '' }); }); });
if (w.BossSymbol && w.BossSymbol.REGISTRY) out.symbols = Object.keys(w.BossSymbol.REGISTRY);
if (w.BOSS19) out.b19 = w.BOSS19.bosses.map((b) => ({ id: b.id, key: b.key, reward: w.BOSS19.reward[b.key] }));
// ソースの battle( 呼び出し（index.html の読み込み順のファイル）
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const files = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map((m) => m[1]);
files.forEach((f) => { const src = fs.readFileSync(path.join(ROOT, f), 'utf8'); const lines = src.split('\n');
  lines.forEach((ln, i) => { const re = /battle\(\s*(\[[^\]]*\]|[A-Za-z_.]+)\s*,\s*(\{[^}]*\}|[A-Za-z_]+)?/g; let m; while ((m = re.exec(ln))) { if (/BattleUI\.start = |battle: async function/.test(ln)) continue; const ctx = ln.slice(Math.max(0, m.index - 0), m.index + 600); const flags = [...ctx.matchAll(/d\.flags\.([a-z0-9_]+)\s*=\s*true|flags\[['"]([a-z0-9_]+)['"]\]\s*=\s*true|setFlag\(['"]([a-z0-9_]+)/g)].map((x) => x[1] || x[2] || x[3]).slice(0, 4);
    out.scriptBattles.push({ file: f, line: i + 1, ids: m[1], opts: (m[2] || '').replace(/\s+/g, ' '), flagsAfter: flags.join(' ') }); } }); });
fs.writeFileSync(path.join(__dirname, 'audit87_' + mode + '.json'), JSON.stringify(out, null, 1));
console.log('mode', mode, 'bossDefs', out.bossDefs.length, 'bossEvents', out.bossEvents.length, 'scriptBattles', out.scriptBattles.length, 'symbols', out.symbols.length, 'b19', out.b19.length, 'errors', A.errors.length);
