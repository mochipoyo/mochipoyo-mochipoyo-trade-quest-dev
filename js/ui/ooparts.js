/* =========================================================
   UI / Ooparts (v6.1) : オーパーツの一覧画面と、古代遺物収集家との会話
   ・一覧：見つけた遺物は名前と説明、まだの遺物は「？？？」と地域・場所のヒントだけ（ネタバレしない）
   ・未配置の遺物は一覧にも合計にも入れない（取得できるものとして表示しない）
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win; var esc = Win.esc;
  var OopartsUI = {};
  function O() { return root.Ooparts; }
  OopartsUI.list = function () {
    var all = O().list().filter(O().placed); var regions = []; all.forEach(function (e) { if (regions.indexOf(e.regionName) < 0) regions.push(e.regionName); });
    var filter = 'all';
    function body() {
      var c = O().count(), t = O().total(); var pct = t ? Math.round(c / t * 100) : 0; var rw = O().state().rewards;
      var head = '<div class="bs-head">見つけた遺物 ' + c + '/' + t + '（' + pct + '%）<div class="bar"><span style="width:' + pct + '%"></span></div></div>' +
        '<div class="op-rewards">' + O().REWARDS.map(function (R) { var it = root.ITEMS[R.item]; var got = rw[R.n]; return '<span class="op-rw' + (got ? ' got' : c >= R.n ? ' ready' : '') + '">' + R.n + '個：' + (got || c >= R.n ? esc(it.name) : '？？？') + (got ? ' ✓' : c >= R.n ? '（受け取れる）' : '') + '</span>'; }).join('') + '</div>' +
        '<div class="cs-row wrap op-filter"><button class="cs-btn' + (filter === 'all' ? ' on' : '') + '" data-f="all">すべて</button>' + regions.map(function (r, i) { return '<button class="cs-btn' + (filter === String(i) ? ' on' : '') + '" data-f="' + i + '">' + esc(r) + '</button>'; }).join('') + '</div>';
      var rows = all.filter(function (e) { return filter === 'all' || e.regionName === regions[+filter]; }).map(function (e) {
        var got = O().has(e.id); var no = 'No.' + String(e.no).padStart(3, '0');
        return got ? '<div class="op-row got"><span class="op-no">' + no + '</span><span class="op-name">' + esc(e.name) + '</span><span class="op-reg">' + esc(e.regionName) + '</span><div class="op-desc">' + esc(e.desc) + '</div></div>'
          : '<div class="op-row"><span class="op-no">' + no + '</span><span class="op-name muted">？？？</span><span class="op-reg">' + esc(e.regionName) + '</span><div class="op-desc muted">ヒント：' + esc(e.where) + '</div></div>';
      }).join('');
      return head + '<div class="op-list">' + rows + '</div>';
    }
    return Win.panel('<div class="rw-title">オーパーツ（古代文明の遺物）</div><div data-body>' + body() + '</div>', { cls: 'op-panel', setup: function (node) {
      node.addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; filter = b.getAttribute('data-f'); node.querySelector('[data-body]').innerHTML = body(); });
    } });
  };
  // 古代遺物収集家
  OopartsUI.collector = async function (c) {
    var Oo = O(); var n = Oo.count(), t = Oo.total();
    if (!c.flag('collector_met')) { c.setFlag('collector_met', true); await c.say('古代遺物収集家ドルフ', ['わしはドルフ。世界中の「時代に合わない遺物」——オーパーツを集めておる。', '地面で淡く光る場所、壺や井戸の中、建物の裏、行き止まり……遺物はどこにでも眠っている。', '見つけた数に応じて、わしの蔵から礼の品を出そう。10、25、50、75、100個じゃ。どの品も一度ずつな。']); }
    var ready = Oo.claimable();
    if (ready.length) {
      for (var i = 0; i < ready.length; i++) { var R = Oo.claim(ready[i].n); if (!R) continue; if (root.Audio) root.Audio.sfx('chest'); await c.say('古代遺物収集家ドルフ', [R.n + '個も見つけたか！ 約束の礼じゃ。']); await c.msg([root.ITEMS[R.item].name + 'を受け取った！', root.ITEMS[R.item].desc]); }
      root.State.autosave();
    }
    var nx = Oo.nextReward();
    await c.say('古代遺物収集家ドルフ', ['今の収集は ' + n + '/' + t + '個。' + (nx ? 'あと ' + (nx.n - n) + '個で次の礼の品じゃ。' : (n >= t ? 'すべてそろった……わしの一生の夢じゃった。' : '礼の品はもう全部渡したな。')), 'ボラティリティア学院の古代文明研究室に見せれば、研究も進むはずじゃ。']);
    var a = await c.choice('ドルフ「一覧を見ていくか？」', ['見る', 'やめる']); if (a === 0) await OopartsUI.list();
  };
  // 収集家：リヴェル城下町の冒険者ギルド（rivel_guild）。既存のNPCとぶつからない空きマス
  if (root.MAP_DEFS && root.MAP_DEFS.rivel_guild) (root.MAP_DEFS.rivel_guild.npcs = root.MAP_DEFS.rivel_guild.npcs || []).push({ id: 'oopart_collector', x: 8, y: 5, sprite: 'npc_treasurer', dir: 'down', wander: 0, talk: function (c) { return OopartsUI.collector(c); } });
  root.OopartsUI = OopartsUI;
})(typeof window !== 'undefined' ? window : globalThis);
