/* =========================================================
   RPG / AirshipCall86（v8.6）：飛空艇を呼ぶ（2D 版・3D 版 共通）
   ・飛空艇を手に入れたあと（Vehicle.owned('airship')＝第十四章 起源の実験室の格納庫で復活させたあと）、
     フィールド（地図の種類 field）で呼ぶと、飛空艇が今いるマスへ来て、そのまま乗る（飛び立つ）
   ・呼び方：F キー（Ctrl・Alt・⌘ と一緒のときは反応しない＝ページ内検索の Ctrl＋F などはそのまま）
             スマホは操作パネルの「飛空艇」ボタン（持っているときだけ出す）・メニューの「飛空艇を呼ぶ」
   ・呼べないとき（短い通知だけ出す）：持っていない／町・ダンジョン・建物の中／船に乗っている／もう飛空艇に乗っている
     会話・戦闘・メニューの間に押した F は捨てる（あとで勝手に呼ばない）。2D 版で歩いている途中に押したときは、その 1 歩が終わってから呼ぶ
   ・やること：飛空艇の置き場所（State.data.vehicles.airship の map・x・y・port）を今いるマスにして乗る（Vehicle.board と同じ）
     セーブの形は変えない（古いセーブもそのまま）。着陸（決定キー・平地のみ）・母港へ戻す（ファストトラベル）・全滅で港へ戻る、は今までどおり
   ========================================================= */
(function (root) {
  'use strict';
  var AC = root.AirshipCall86 = { ID: 'airship' };
  function D() { return root.State && root.State.data; }
  function say(t) { if (root.Win && root.Win.toast) root.Win.toast(t); }
  function touch() { var b = typeof document !== 'undefined' && document.body; return !!(b && b.classList && b.classList.contains('mobile')); }
  AC.owned = function () { var V = root.Vehicle; if (!D()) return false; return !!(V && root.VEHICLES && root.VEHICLES[AC.ID] && V.owned(AC.ID)); };   // 起動直後（データがまだない）は持っていない扱い
  // 今ここで呼べるか：{ ok, why }
  AC.check = function () {
    var W = root.World, d = D(); if (!d || !W || !W.map || !W.player) return { ok: false, why: '' };
    if (!AC.owned()) return { ok: false, why: '呼べる乗り物がない' };
    var okKey = touch() ? '決定ボタン' : '決定キー';
    if (d.aboard === AC.ID) return { ok: false, why: 'もう飛空艇に乗っている（' + okKey + 'で着陸。草原・砂地・道などの平地のみ）' };
    if (d.aboard) return { ok: false, why: ((root.VEHICLES[d.aboard] || {}).name || '船') + 'を降りて、陸に上がってから呼ぶ' };
    if (W.map.kind !== 'field') return { ok: false, why: '飛空艇は外のフィールドでだけ呼べる（町・ダンジョン・建物の中では呼べない）' };
    return { ok: true };
  };
  // 呼んで乗る。戻り値 true＝乗った
  AC.call = function () {
    var W = root.World, V = root.Vehicle, d = D(); var c = AC.check(); if (!c.ok) { if (c.why) say(c.why); return false; }
    var m = W.map, p = W.player;
    V.board(AC.ID, m, p.x, p.y);   // 置き場所を今いるマスにして乗る（港＝最後に乗った所も、ここ）
    AC.lastCall = { t: Date.now(), map: m.id, x: p.x, y: p.y };   // 3D 版：空から降りてくる見せ方に使う（GameBridge.updateVehicles）。2D 版は使わない
    if (root.Carriage && root.Carriage.apply) root.Carriage.apply(); else if (W.walkSpeed) p.speed = W.walkSpeed();   // 馬車に乗っていたら、飛空艇の間は降りた扱い（設定は覚えたまま）
    if (W.updatePlaceLabel) W.updatePlaceLabel(); if (W.updateHud) W.updateHud();
    if (root.Minimap && root.Minimap.onStep) { try { root.Minimap.onStep(m, p); } catch (e) { /* ミニマップがなくても続ける */ } }
    say('飛空艇を呼んで乗った　' + (touch() ? '決定ボタン' : '決定キー') + 'で着陸（平地のみ）');
    if (root.Audio && root.Audio.sfx) { try { root.Audio.sfx('door'); } catch (e) { /* 音がなくても続ける */ } }
    if (root.State && root.State.autosave) root.State.autosave();
    AC.updateUI();
    return true;
  };
  // 入力：F キー（Input の 'airship'）。探索の場面の handleInput から呼ぶ（2D 版 js/rpg/world.js・3D 版 GameBridge.handleInput）
  //   busy：会話・戦闘中なら押した F を捨てる。moving：2D 版で 1 歩の途中なら、終わってから呼ぶ。戻り値 true＝この回の入力はここで終わり
  AC.input = function (busy, moving) {
    var I = root.Engine && root.Engine.Input; if (!I) return false; var W = root.World;
    if (busy) { I.consume('airship'); AC._pending = false; return false; }
    if (I.consume('airship')) { if (moving) { AC._pending = true; return false; } AC._pending = false; AC.call(); return true; }
    if (AC._pending && !moving) { AC._pending = false; AC.call(); return true; }
    return false;
  };
  // スマホの操作パネルの「飛空艇」ボタン：持っているときだけ出す。乗っているときは光らせる
  AC.updateUI = function () {
    if (typeof document === 'undefined') return; var b = document.getElementById('mp-airship'); if (!b) return;
    var own = AC.owned(); var v = own ? '' : 'none'; if (b.style.display !== v) b.style.display = v; var d = D(); b.classList.toggle('on78', !!(d && d.aboard === AC.ID));
  };
  // 手に入れた・乗った・降りた・地図を変えたときにボタンを付け直す（World の関数を包む。馬車 js/rpg/carriage79.js と同じやり方）
  AC.install = function () {
    var W = root.World; if (!W || W._air86) return; W._air86 = true;
    var em0 = W.enterMap; W.enterMap = function () { var r = em0.apply(this, arguments); try { AC.updateUI(); } catch (e) { /* ボタンの付け直しに失敗しても進める */ } return r; };
    var os0 = W.onStep; W.onStep = function () { var r = os0.apply(this, arguments); try { AC.updateUI(); } catch (e) { /* 同上 */ } return r; };
    var ia0 = W.interact; if (ia0) W.interact = function () { var r = ia0.apply(this, arguments); try { AC.updateUI(); } catch (e) { /* 着陸したあと */ } return r; };
  };
  AC.install();
})(typeof window !== 'undefined' ? window : globalThis);
