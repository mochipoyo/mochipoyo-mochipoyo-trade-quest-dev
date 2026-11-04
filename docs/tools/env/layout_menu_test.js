// v7.6：設定「マップの間取り（v7.6）」の切り替え（jsdom。Win.list・Win.choice を差し替えて選ぶ）
//   使い方：RPG_DIR=<リポジトリ>/ node layout_menu_test.js
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w, errors } = load();
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const { State, Menu, Win, EnvLayout } = w; State.newGame('t', 'warrior');
  let lists = [], choices = [], seen = [];
  Win.list = async (items) => { seen.push(items.map((x) => x.label + '=' + (x.right || ''))); return lists.length ? lists.shift() : -1; };
  Win.choice = async (q, opts) => { seen.push(['Q:' + q, ...opts]); return choices.length ? choices.shift() : 1; };
  let reloaded = 0; const oe = console.error; console.error = (...a) => { const t = String((a[0] && a[0].message) || a[0]); if (/navigation to another Document/.test(t)) reloaded++; else oe(...a); };   // jsdom は再読み込みを「未実装」と知らせる＝呼ばれた印
  // 1) 一覧に項目がある・既定は新しい間取り
  lists = [-1]; await Menu.settings(); const row = seen[0].find((s) => /マップの間取り/.test(s)); ok(!!row && /新しい間取り/.test(row), '設定の一覧に「マップの間取り（v7.6）＝新しい間取り」：' + row);
  const idx = seen[0].findIndex((s) => /マップの間取り/.test(s)); ok(idx === 21, '項目の位置は末尾（既存の項目の番号は変わらない）：' + idx);
  // 2) やめる → 変わらない
  seen = []; lists = [21, -1]; choices = [1]; await Menu.settings(); ok(EnvLayout.enabled === true && w.localStorage.getItem('mtq-layout') === null, '「やめる」なら変わらない');
  // 3) 切り替え → 元の間取り（端末に保存・再読み込み）
  seen = []; lists = [21, -1]; choices = [0]; await Menu.settings(); ok(EnvLayout.enabled === false && w.localStorage.getItem('mtq-layout') === 'off', '切り替えると元の間取り（mtq-layout=off）');
  ok(reloaded === 1, '再読み込みを1回呼んだ'); ok(seen.some((s) => s[0] && /2D版・3D版の両方/.test(s[0])), '確認の文に「2D版・3D版の両方に効く」');
  // 4) もう一度 → 新しい間取り
  seen = []; lists = [21, -1]; choices = [0]; await Menu.settings(); ok(EnvLayout.enabled === true && w.localStorage.getItem('mtq-layout') === 'on', 'もう一度で新しい間取り（mtq-layout=on）');
  ok(!errors.length, 'ページのエラーなし ' + JSON.stringify(errors.slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
