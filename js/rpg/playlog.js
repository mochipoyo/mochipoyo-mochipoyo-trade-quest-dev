/* =========================================================
   RPG / PlayLog：実際に遊んだ記録（バランス調整用）。この端末のブラウザの中だけに保存し、どこにも送らない
   ・保存先は専用の LocalStorage キー（mochipoyo_playlog_v1）。セーブデータのキーとは別（セーブデータは読み書きしない）。2D 版・3D 版で同じ記録に追記する（page で区別）
   ・記録するもの：戦闘の結果（勝敗・ターン数・敵・パーティーのレベル）、必殺技（結果・威力の倍率・根拠どおりか）、
     チャートの判断（修行・試験・戦闘）、試験の結果、クイズモンスター（問題・正誤・奪われた額）、はじめて入ったマップ
   ・新しい順に最大1500件。設定 → データ管理 →「プレイ記録（バランス調整用）」で、件数の確認・JSON の書き出し・記録を止める・消す
   ・書き出した JSON は docs/tools/playlog-analyze.js で集計できる（次のバランス調整に使う）
   ========================================================= */
(function (root) {
  'use strict';
  var PL = { KEY: 'mochipoyo_playlog_v1', MAX: 1500, VERSION: 1 };
  function D() { return root.State && root.State.data; }
  function store() { try { return root.localStorage || null; } catch (e) { return null; } }
  PL.page = (function () { try { return /\/3d\//.test(root.location.pathname) ? '3d' : '2d'; } catch (e) { return '2d'; } })();
  PL.enabled = function () { var d = D(); return !(d && d.settings && d.settings.playLog === 'off'); };
  PL.read = function () { var s = store(); if (!s) return []; try { var a = JSON.parse(s.getItem(PL.KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  PL.add = function (type, data) {
    if (!PL.enabled()) return false; var s = store(); if (!s) return false;
    try {
      var d = D(); var h = d && d.hero; var W = root.World;
      var e = { t: Date.now(), type: type, page: PL.page, lv: h ? h.level : null, map: W && W.map ? W.map.id : null };
      if (data) Object.keys(data).forEach(function (k) { e[k] = data[k]; });
      var a = PL.read(); a.push(e); if (a.length > PL.MAX) a = a.slice(-PL.MAX);
      s.setItem(PL.KEY, JSON.stringify(a)); return true;
    } catch (er) { return false; }   // 容量が足りないときなどは記録しない（ゲームは止めない）
  };
  PL.clear = function () { var s = store(); if (s) try { s.removeItem(PL.KEY); } catch (e) { } };
  PL.summary = function () { var a = PL.read(); var by = {}; a.forEach(function (e) { by[e.type] = (by[e.type] || 0) + 1; }); return { n: a.length, by: by, from: a.length ? a[0].t : null, to: a.length ? a[a.length - 1].t : null }; };
  PL.exportJSON = function () { return JSON.stringify({ app: 'mochipoyo-trade-quest', kind: 'playlog', v: PL.VERSION, exported: new Date().toISOString(), note: 'この端末のブラウザに保存された遊びの記録（バランス調整用）。個人情報・セーブデータは含まない。', summary: PL.summary(), log: PL.read() }); };

  // はじめて入ったマップ（進み方の目安）
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) { var d = D(); if (m && d && d.visited && !d.visited[m.id]) PL.add('visit', { to: m.id, gold: d.gold }); });

  /* ---------- 画面（設定 → データ管理） ---------- */
  PL.menu = async function () {
    var Win = root.Win, d = D(); if (!Win || !d) return;
    while (true) {
      var sm = PL.summary(); var on = PL.enabled();
      var names = { battle: '戦闘', ult: '必殺技', trade: 'チャートの判断', exam: '試験', quiz: 'クイズモンスター', visit: 'はじめてのマップ' };
      var detail = Object.keys(sm.by).map(function (k) { return (names[k] || k) + ' ' + sm.by[k]; }).join('・') || 'なし';
      var i = await Win.choice('プレイ記録（バランス調整用）：' + sm.n + '件（' + detail + '）。この端末のブラウザの中だけに保存し、どこにも送りません。', ['記録をJSONで書き出す', on ? '記録を止める' : '記録する', '記録を消す', 'やめる']);
      if (i < 0 || i === 3) return;
      if (i === 0) {
        try { var blob = new Blob([PL.exportJSON()], { type: 'application/json' }); var u = URL.createObjectURL(blob); var a = document.createElement('a'); var dt = new Date(); a.href = u; a.download = 'mochipoyo-playlog-' + dt.getFullYear() + ('0' + (dt.getMonth() + 1)).slice(-2) + ('0' + dt.getDate()).slice(-2) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000); Win.toast('プレイ記録を書き出した'); }
        catch (e) { await Win.message(['書き出しに失敗しました（ブラウザがファイルの保存に対応していない可能性があります）。']); }
      }
      if (i === 1) { d.settings.playLog = on ? 'off' : 'on'; Win.toast(on ? 'プレイ記録：止めた' : 'プレイ記録：記録する'); if (root.State) root.State.autosave(); }
      if (i === 2) { var c = await Win.choice('プレイ記録をすべて消す？（セーブデータは消えません）', ['消す', 'やめる'], { initial: 1 }); if (c === 0) { PL.clear(); Win.toast('プレイ記録を消した'); } }
    }
  };
  root.PlayLog = PL;
})(typeof window !== 'undefined' ? window : globalThis);
