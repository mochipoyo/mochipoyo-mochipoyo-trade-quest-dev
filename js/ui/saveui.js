/* =========================================================
   UI / SaveUI（v6.5）：セーブ一覧の表示、バックアップ、ファイルの書き出し・読み込み、クラウドセーブの画面
   （タイトルの「データ管理」と、メニューの「データ管理」の両方から開く）
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win, State = root.State, Saves = root.Saves, Cloud = root.Cloud;
  var esc = Win.esc;
  var SaveUI = {};
  function slotName(n) { return n === 0 ? 'オートセーブ' : 'スロット' + n; }

  /* ---------- スロット一覧の1行（名前・レベル・場所・日時・プレイ時間＋クラウドの状態） ---------- */
  SaveUI.cloudBadge = function (n) {
    if (!Cloud || !Cloud.configured() || Cloud.status !== 'signedin') return '';
    var st = Cloud.slotState(n); if (!st.linked) return '';
    return st.conflict ? '☁ 競合あり' : st.pending ? '☁ 未送信' : '☁ 同期済み';
  };
  SaveUI.slotItem = function (n, opts) {
    var m = Saves.slotMeta(n); var badge = SaveUI.cloudBadge(n);
    return { label: slotName(n), right: m ? m.name + ' Lv' + m.level : '（空き）', disabled: !!(opts && opts.needData && !m),
      sub: m ? m.place + '　' + Saves.fmtDate(m.savedAt) + '　プレイ ' + Saves.fmtTime(m.playTime) + (badge ? '　' + badge : '') : (badge || '') };
  };

  /* ---------- 比べる画面 ---------- */
  function metaRows(m, extra) {
    if (!m) return '<div class="muted">（データなし）</div>';
    return '<div>' + esc(m.name) + '　' + esc(m.jobName || '') + ' Lv<b>' + m.level + '</b></div><div>場所：' + esc(m.place || '') + '</div>' + (m.chapter ? '<div>' + esc(m.chapter) + '</div>' : '') +
      '<div>所持金：' + (m.gold || 0) + 'G　仲間 ' + (m.party || 1) + '人</div><div>保存：' + Saves.fmtDate(m.savedAt) + '</div><div>プレイ時間：' + Saves.fmtTime(m.playTime) + '</div>' + (extra || '');
  }
  SaveUI.comparePanel = function (n, cmp) {
    var html = '<div class="rw-title">' + slotName(n) + '：この端末とクラウドを比べる</div><div class="cmp-grid">' +
      '<div class="cmp-col"><h3>この端末（' + esc(Cloud.device()) + '）</h3>' + metaRows(cmp.local) + '</div>' +
      '<div class="cmp-col"><h3>クラウド</h3>' + metaRows(cmp.cloud, cmp.cloud ? '<div class="muted small">リビジョン ' + cmp.cloudRev + (cmp.cloudDevice ? '・' + esc(cmp.cloudDevice) + 'で保存' : '') + (cmp.cloudUpdated ? '・サーバーの記録 ' + Saves.fmtDate(Date.parse(cmp.cloudUpdated)) : '') + '</div>' : '') + '</div></div>' +
      '<div class="muted small">どちらを選んでも、選ばなかった方は消えません（この端末のデータは端末内のバックアップへ、クラウドのデータはクラウドの履歴へ残ります）。</div>';
    return Win.panel(html, { cls: 'cloud-compare' });
  };

  /* ---------- バックアップ ---------- */
  SaveUI.backups = async function () {
    while (true) {
      var list = Saves.backups();
      var i = await Win.choice('バックアップ（この端末の中・最大5回分）', ['今すぐバックアップを作る', 'バックアップから戻す（' + list.length + '件）', 'すべてのセーブをファイルに書き出す（2D版と3D版）', 'ファイルから読み込む', 'もどる']);
      if (i < 0 || i === 4) return;
      if (i === 0) { var b = Saves.backup('手動'); await Win.message([b ? 'バックアップを作った（' + b.slots.map(function (x) { return slotName(x.slot); }).join('・') + '）。' : 'バックアップできなかった（セーブがないか、保存領域がいっぱいです）。']); }
      if (i === 1) {
        if (!list.length) { await Win.message(['バックアップはまだない。']); continue; }
        var k = await Win.list(list.map(function (x) { return { label: Saves.fmtDate(x.at), right: x.slots.length + 'スロット', sub: x.reason }; }), { title: 'どのバックアップから戻す？' }); if (k < 0) continue;
        var bk = list[k]; var s = await Win.list(bk.slots.map(function (x) { return { label: slotName(x.slot) + 'の写し', right: x.meta ? x.meta.name + ' Lv' + x.meta.level : '', sub: x.meta ? Saves.line(x.meta) : '' }; }), { title: 'どのデータを戻す？' }); if (s < 0) continue;
        var to = await Win.choice('戻す先のスロット（いまの中身は先にバックアップします）', ['オートセーブ', 'スロット1', 'スロット2', 'スロット3', 'やめる']); if (to < 0 || to > 3) continue;
        var ok = Saves.restore(bk.id, bk.slots[s].slot, to); await Win.message([ok ? slotName(to) + 'へ戻した。' : '戻せなかった。']);
      }
      if (i === 2) {
        var text = Saves.exportAll(); var blob = new Blob([text], { type: 'application/json' }); var u = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = u; a.download = 'mochipoyo-trade-quest-backup-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
        await Win.message(['書き出した（2D版・3D版のすべてのスロット）。ファイルは大切に保管してください。']);
      }
      if (i === 3) await SaveUI.importFile();
    }
  };
  SaveUI.pickFile = function () {
    return new Promise(function (res) { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = function () { var f = inp.files[0]; if (!f) return res(null); var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsText(f); }; inp.click(); setTimeout(function () { res(null); }, 120000); });
  };
  SaveUI.importFile = async function (text) {
    text = text || await SaveUI.pickFile(); if (!text) return false;
    var list; try { list = Saves.parseFile(text); } catch (e) { await Win.message(['読み込めなかった：' + e.message]); return false; }
    var k = list.length === 1 ? 0 : await Win.list(list.map(function (x) { return { label: (x.origin === '3d' ? '3D版 ' : x.origin === '2d' ? '2D版 ' : '') + (x.slot === null ? 'セーブ' : slotName(x.slot)), right: x.meta ? x.meta.name + ' Lv' + x.meta.level : '', sub: x.meta ? Saves.line(x.meta) : '' }; }), { title: 'どのデータを読み込む？' });
    if (k < 0) return false;
    var to = await Win.choice('この端末のどこへ入れる？（いまの中身は先にバックアップします）', ['オートセーブ', 'スロット1', 'スロット2', 'スロット3', 'やめる']); if (to < 0 || to > 3) return false;
    var ok = Saves.importTo(list[k], to); await Win.message([ok ? slotName(to) + 'に入れた。「つづきから」で遊べます。' : '保存できなかった（保存領域がいっぱいかもしれません）。']);
    return ok;
  };

  /* ---------- クラウドセーブ ---------- */
  SaveUI.cloud = async function () {
    if (!Cloud || !Cloud.configured()) { await Win.message(['クラウドセーブは、まだ接続先が設定されていません（設定待ち）。', '端末のセーブ・バックアップ・ファイルへの書き出しは使えます。']); return; }
    while (true) {
      if (Cloud.status !== 'signedin') {
        var c = await Win.choice('クラウドセーブ：ログインしていません', ['メールでログイン', 'メールの6桁のコードを入力', 'もどる']);
        if (c < 0 || c === 2) return;
        if (c === 0) { await SaveUI.login(); continue; }
        if (c === 1) { await SaveUI.code(); continue; }
      }
      var rows = null, err = '';
      try { rows = await Cloud.list(); } catch (e) { err = e.message; }
      var byN = {}; (rows || []).forEach(function (r) { byN[r.slot] = r; });
      var items = [0, 1, 2, 3].map(function (n) {
        var it = SaveUI.slotItem(n); if (!rows) { it.sub = (it.sub ? it.sub + '　' : '') + '（クラウドの状態は確認できません）'; return it; }
        var cmp = Cloud.compare(n, byN[n]); var L = { empty: '端末にもクラウドにもなし', 'local-only': 'クラウドにはまだない', 'cloud-only': 'クラウドだけにある', conflict: '⚠ 競合（両方が更新されている）', 'cloud-newer': 'クラウドの方が新しい', 'local-newer': 'この端末の方が新しい（未送信）', same: '同期済み' }[cmp.kind];
        it.sub = (it.sub ? it.sub + '　' : '') + '☁ ' + L + (cmp.st.linked ? '' : '（自動同期オフ）'); return it;
      });
      items.push({ label: 'ログアウト', sub: Cloud.user && Cloud.user.email ? 'ログイン中：' + Cloud.user.email : '' }, { label: 'もどる' });
      var i = await Win.list(items, { title: 'クラウドセーブ' + (err ? '（' + err + '）' : '') });
      if (i < 0 || i === 5) return;
      if (i === 4) { var q = await Win.choice('ログアウトする？（この端末のセーブは消えません）', ['ログアウト', 'やめる']); if (q === 0) { await Cloud.signOut(); await Win.message(['ログアウトした。']); return; } continue; }
      if (!rows) { await Win.message(['クラウドにつながらないため、操作できません。', err]); continue; }
      await SaveUI.cloudSlot(i, byN[i]);
    }
  };
  SaveUI.login = async function () {
    var saved = ''; try { saved = root.localStorage.getItem('mtq-cloud-email') || ''; } catch (e) { /* なし */ }
    var email = await Win.prompt('ログインに使うメールアドレス', saved, 80); if (!email) return;
    try { await Cloud.sendLink(email); } catch (e) { await Win.message(['送れなかった：' + e.message]); return; }
    await Win.message(['ログイン用のメールを送った。', '届いたメールのリンクを、このゲームを開いているブラウザで開いてください（PC とスマホで同じメールアドレスを使うと、同じセーブを使えます）。',
      'メールのアプリの中でリンクが開いてしまうときは、メールの6桁のコードを「コードを入力」から入れてください。']);
    var c = await Win.choice('', ['コードを入力する', 'あとで']); if (c === 0) await SaveUI.code(email);
  };
  SaveUI.code = async function (email) {
    if (!email) { try { email = root.localStorage.getItem('mtq-cloud-email') || ''; } catch (e) { email = ''; } email = await Win.prompt('メールアドレス', email, 80); if (!email) return; }
    var code = await Win.prompt('メールに書かれた6桁のコード', '', 10); if (!code) return;
    try { await Cloud.verifyCode(email, code); await Win.message(['ログインした（' + email + '）。']); } catch (e) { await Win.message(['ログインできなかった：' + e.message]); }
  };
  SaveUI.cloudSlot = async function (n, row) {
    var cmp = Cloud.compare(n, row); var st = cmp.st; var opts = [], acts = [];
    if (cmp.local && cmp.cloud) { opts.push('比べて選ぶ（この端末／クラウド）'); acts.push('compare'); }
    if (cmp.local) { opts.push(cmp.cloud ? 'この端末のデータでクラウドを上書き' : 'クラウドへ保存（アップロード）'); acts.push('up'); }
    if (cmp.cloud) { opts.push(cmp.local ? 'クラウドのデータでこの端末を上書き' : 'クラウドから読み込む（ダウンロード）'); acts.push('down'); }
    if (row) { opts.push('クラウドの前の版（履歴）から戻す'); acts.push('hist'); }
    if (cmp.local || cmp.cloud) { opts.push(st.linked ? '自動同期をオフにする' : '自動同期をオンにする'); acts.push('link'); }
    opts.push('もどる'); acts.push('back');
    var i = await Win.choice(slotName(n) + '：' + ({ conflict: '両方が更新されています', 'cloud-newer': 'クラウドの方が新しい', 'local-newer': 'この端末の方が新しい', same: '同期済み', 'local-only': 'クラウドにはまだない', 'cloud-only': 'クラウドだけにある', empty: '空き' }[cmp.kind] || ''), opts);
    var act = acts[i]; if (!act || act === 'back') return;
    if (act === 'compare') { await SaveUI.comparePanel(n, cmp); var k = await Win.choice('どちらを使う？', ['この端末のデータを使う（クラウドへ送る）', 'クラウドのデータを使う（この端末へ読み込む）', 'あとで決める']); act = k === 0 ? 'up' : k === 1 ? 'down' : null; if (!act) return; }
    if (act === 'up') {
      if (cmp.cloud && (cmp.kind === 'conflict' || cmp.kind === 'cloud-newer')) { var y = await Win.choice('クラウドの方が新しいデータです。この端末のデータで上書きする？（クラウドの今のデータは履歴に残ります）', ['上書きする', 'やめる']); if (y !== 0) return; }
      try { var r = await Cloud.upload(n, row ? +row.revision : 0); await Win.message([r.ok ? slotName(n) + 'をクラウドへ保存した（リビジョン ' + r.rev + '）。' : 'その間に別の端末がクラウドを更新しました。もう一度比べてください。']); } catch (e) { await Win.message(['送れなかった：' + e.message]); }
      return;
    }
    if (act === 'down') {
      if (cmp.local && (cmp.kind === 'conflict' || cmp.kind === 'local-newer')) { var y2 = await Win.choice('この端末のデータの方が新しいか、クラウドに送っていない進行があります。クラウドのデータで上書きする？（この端末のデータはバックアップに残ります）', ['上書きする', 'やめる']); if (y2 !== 0) return; }
      try { var d = await Cloud.download(n, row && row.data ? row : null); await SaveUI.afterDownload(n, d); } catch (e) { await Win.message(['読み込めなかった：' + e.message]); }
      return;
    }
    if (act === 'hist') {
      var h; try { h = await Cloud.history(n); } catch (e) { await Win.message(['読み込めなかった：' + e.message]); return; }
      if (!h.length) { await Win.message(['クラウドの履歴はまだない（上書きされると、前の版が5回分まで残ります）。']); return; }
      var hi = await Win.list(h.map(function (x) { return { label: Saves.fmtDate(Date.parse(x.saved_at)), right: x.meta ? x.meta.name + ' Lv' + x.meta.level : '', sub: (x.meta ? Saves.line(x.meta) : '') + (x.device ? '　' + x.device : '') }; }), { title: 'どの版をこの端末へ読み込む？' }); if (hi < 0) return;
      try { var hd = await Cloud.historyData(h[hi].id); var dd = Saves.unpack(hd.data, Saves.viewOf(n)); if (Saves.rawSlot(n)) Saves.backup('クラウドの履歴から読み込む前（スロット' + n + '）', [n]); Saves.writeRaw(n, JSON.stringify(dd)); Cloud.setLinked(n, false); await Win.message(['前の版を' + slotName(n) + 'に読み込んだ。自動同期はオフにした（クラウドを上書きしたいときは「クラウドへ保存」）。']); await SaveUI.afterDownload(n, dd, true); } catch (e) { await Win.message(['読み込めなかった：' + e.message]); }
      return;
    }
    if (act === 'link') { Cloud.setLinked(n, !st.linked); await Win.message([slotName(n) + 'の自動同期を' + (!st.linked ? 'オン' : 'オフ') + 'にした。']); if (!st.linked) Cloud.afterLocalSave(n); }
  };
  SaveUI.afterDownload = async function (n, d, quiet) {
    if (!quiet) await Win.message([slotName(n) + 'へクラウドのデータを読み込んだ。']);
    if (root.World && root.World.map && State.data) { var c = await Win.choice('読み込んだデータで再開する？（いまの冒険はセーブしていなければ失われます）', ['再開する', 'あとで']); if (c === 0) { State.data = d; root.World.start(); return true; } }
    return false;
  };
  // タイトルの「つづきから」の前に：クラウドの方が新しいスロットがあれば知らせる（つながらなければ何もしない）
  SaveUI.titleNotice = async function () {
    if (!Cloud || !Cloud.configured() || Cloud.status !== 'signedin') return;
    var rows; try { rows = await Promise.race([Cloud.list(), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 5000); })]); } catch (e) { return; }
    var byN = {}; rows.forEach(function (r) { byN[r.slot] = r; });
    var news = [0, 1, 2, 3].filter(function (n) { var k = Cloud.compare(n, byN[n]).kind; return k === 'cloud-newer' || k === 'conflict' || k === 'cloud-only'; });
    if (!news.length) return;
    var c = await Win.choice('クラウドに、この端末より新しいデータがあります（' + news.map(slotName).join('・') + '）。クラウドセーブの画面を開く？', ['開く', 'あとで']);
    if (c === 0) await SaveUI.cloud();
  };

  root.SaveUI = SaveUI;
})(typeof window !== 'undefined' ? window : globalThis);
