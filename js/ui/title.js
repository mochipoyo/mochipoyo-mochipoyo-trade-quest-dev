/* =========================================================
   UI / Title : タイトル画面・主人公作成・ロード
   ========================================================= */
(function (root) {
  'use strict';

  var Engine = root.Engine, Win = root.Win, State = root.State, JOBS = root.JOBS, Chars = root.Chars, World = root.World, Tiles = root.Tiles;
  var esc = Win.esc;
  var Title = {};

  function TitleScene() { this.t = 0; }
  TitleScene.prototype.update = function (dt) { this.t += dt; };
  TitleScene.prototype.draw = function (ctx) {
    var W = ctx.canvas.width, H = ctx.canvas.height, t = this.t;
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#050a1e'); g.addColorStop(0.6, '#1b2a4a'); g.addColorStop(1, '#2d4a3e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; for (var i = 0; i < 40; i++) { var x = (i * 173) % W, y = (i * 97) % (H * 0.5); ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t / 700 + i)); ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1;
    // 地面
    var TS = Engine.TS; var rows = Math.ceil(H / TS); for (var yy = rows - 3; yy < rows; yy++) for (var xx = 0; xx < Engine.VIEW_W + 1; xx++) ctx.drawImage(Tiles.get(((xx + yy) % 5 === 0) ? 'grass2' : 'grass'), xx * TS, yy * TS);
    for (var k = 0; k < 6; k++) ctx.drawImage(Tiles.get('tree'), (k * 110 + 20) % W, (rows - 4) * TS);
    // 歩く勇者たち
    var keys = ['hero_warrior', 'hero_mage', 'hero_priest', 'hero_thief'];
    keys.forEach(function (key, i) { var px = ((t / 12) + i * 90) % (W + 64) - 32; var fr = Math.floor(t / 180 + i) % 2; ctx.drawImage(Chars.frame(key, 'right', fr), px, (rows - 3) * TS - 8); });
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = '#3a2a0a'; ctx.strokeText('もちぽよFXクエスト', W / 2, H * 0.3); ctx.fillStyle = '#e8c15a'; ctx.fillText('もちぽよFXクエスト', W / 2, H * 0.3);
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#cfe3ff'; ctx.fillText('～波形の勇者と相場の魔王～', W / 2, H * 0.3 + 32);
    ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('チャートはすべて学習用の人工データです', W / 2, H - 8);
  };

  Title.show = function () {
    Engine.replace(new TitleScene());
    document.getElementById('hud').innerHTML = '';
    var ui = document.getElementById('ui'); while (ui.firstChild) ui.removeChild(ui.firstChild);
    root.World.busy = false;
    if (root.Audio) root.Audio.playBgm('title');
    Title.menu();
  };
  Title.menu = async function () {
    while (true) {
      var hasAny = [0, 1, 2, 3].some(function (s) { return State.slotInfo(s); });
      var legacy = State.legacyInfo();
      var opts = [{ label: 'はじめから' }, { label: 'つづきから', disabled: !hasAny }, { label: 'データ管理' }];
      if (legacy) opts.push({ label: '旧バージョンのデータを確認' });
      var i = await Win.list(opts, { title: 'タイトル', cancel: false, cls: 'title-menu' });
      if (i === 0) { var ok = await Title.newGame(); if (ok) return; }
      if (i === 1) { var ld = await Title.load(); if (ld) return; }
      if (i === 2) { await Title.data(); }
      if (i === 3) { await Win.message(['旧バージョン（第1作）のセーブデータが見つかった：' + (legacy.name || '名前なし') + '（Lv' + (legacy.level || '?') + '）', '新しいゲームでは「はじめから」で主人公を作ったあと、修行場の師匠から「旧データの引き継ぎ」ができる。引き継げるのはトレード学習の成績・修了した講義・一部の設定。旧レベルやアイテムは引き継げない。', '旧データ自体は消えずに残る。']); }
    }
  };
  Title.newGame = async function () {
    var name = await Win.prompt('主人公の名前（8文字まで）', '勇者', 8); if (!name) name = '勇者';
    var jobs = root.STARTER_JOBS;
    var ji = await Win.list(jobs.map(function (j) { var J = JOBS[j]; return { label: J.name, right: J.role, sub: J.desc }; }), { title: name + 'の職業を選ぶ（あとで転職できる）', info: function (k) { var J = JOBS[jobs[k]]; return (root.Assets ? root.Assets.portraitTag('hero_' + jobs[k], 'portrait info-portrait', 120) : '') + '<div class="muted small">固有：' + esc(J.trait) + '　武器：' + J.weapons.join('/') + '</div><div class="muted small">HP' + J.stats.hp + ' MP' + J.stats.mp + ' 攻' + J.stats.atk + ' 防' + J.stats.def + ' 速' + J.stats.agi + ' 魔' + J.stats.mag + '</div>'; } });
    if (ji < 0) return false;
    var c = await Win.choice(name + '（' + JOBS[jobs[ji]].name + '）で冒険を始める？', ['始める', 'やり直す']);
    if (c !== 0) return false;
    State.newGame(name, jobs[ji]);
    var legacy = State.legacyInfo();
    if (legacy) { var li = await Win.choice('旧バージョンのデータが見つかった。トレード学習の成績と修了した講義を引き継ぐ？（旧データは消えない）', ['引き継ぐ', '引き継がない']); if (li === 0) { var r = State.importLegacy(); await Win.message(['引き継いだ：' + r.migrated.join('／'), '引き継げない：' + r.skipped.join('／')]); } }
    await Win.message(['——プロローグ：失われた天秤——', '数百年前、世界を豊かにするため、魔導士たちは「均衡のクリスタル」を完成させた。人々の約束と資源の分配を記録し、争いを減らすための結晶だった。', 'だが大災害が起こり、世界の一部は海に沈み、多くの記録が失われた。災害の最後に、一人の魔導士が結晶へ願いを封じ込めた。', '「もう二度と、誰にも大切なものを失わせないでほしい」', 'その願いが、やがて世界を変える。']);
    await Win.message(['……冷たい風が頬を撫でる。', '遠くで誰かが呼んでいる。「波を読む者よ、目を覚ませ」', 'ここは——アルカディア相場大陸。']);
    World.start();
    return true;
  };
  Title.load = async function () {
    var slots = [0, 1, 2, 3].map(function (s) { var info = State.slotInfo(s); return { label: s === 0 ? 'オートセーブ' : 'スロット' + s, right: info ? info.name + ' ' + JOBS[info.job].name + ' Lv' + info.level : '（空き）', disabled: !info, sub: info ? (root.MAP_DEFS[info.map] ? root.MAP_DEFS[info.map].name : 'フィールド') + '　' + info.gold + 'G　' + new Date(info.savedAt).toLocaleString('ja-JP') : '' }; });
    var i = await Win.list(slots, { title: 'つづきから' });
    if (i < 0) return false;
    var d = State.load(i); if (!d) { await Win.message(['読み込めなかった。']); return false; }
    State.data = d; World.start(); return true;
  };
  Title.data = async function () {
    var i = await Win.choice('データ管理', ['JSONを読み込んで再開', 'スロットを削除', 'やめる']);
    if (i === 0) { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; var text = await new Promise(function (res) { inp.onchange = function () { var f = inp.files[0]; if (!f) return res(null); var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsText(f); }; inp.click(); setTimeout(function () { res(null); }, 60000); }); if (!text) return; try { State.data = State.importJSON(text); State.autosave(); World.start(); } catch (e) { await Win.message(['読み込みに失敗：' + e.message]); } }
    if (i === 1) { var s = await Win.choice('どのスロットを削除する？', ['オートセーブ', 'スロット1', 'スロット2', 'スロット3', 'やめる']); if (s >= 0 && s < 4) { var c = await Win.choice('本当に削除する？', ['削除', 'やめる']); if (c === 0) { State.deleteSlot(s); await Win.message(['削除した。']); } } }
  };

  root.Title = Title;
})(typeof window !== 'undefined' ? window : globalThis);
