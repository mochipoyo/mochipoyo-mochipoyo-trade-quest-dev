/* =========================================================
   RPG / Carriage79（v7.9）：馬車
   ・入手：リヴェル城の厩舎番（王に一度会ったあと。js/data/carriage79-data.js）
   ・フィールド（地図の種類 field）でだけ使える。町・ダンジョン・建物の中、船・飛空艇に乗っているあいだは歩く
     乗っている設定（State.data.carriage.on）は覚えておき、町から出たり船を降りたりしてフィールドに戻ると、また馬車で進む
   ・乗り降り：C キー（スマホは操作パネルの「馬車」）。メニューの「馬車」からも
   ・効果：移動の速さ ×1.6（2D 版はマスを進む速さ、3D 版は自由移動の速さ）・ランダムエンカウント ×0.8（20% 出会いにくい）
     （ほかの出会いにくくする効果（聖水・危険察知の鐘）と重ねられる。ボス・イベントの戦闘は変わらない）
   ・見た目：2D 版は馬と幌馬車の絵（js/ui/vehicleart.js）、3D 版は馬と幌馬車の模型（three-src/src/world/Carriage3D.js）。仲間は馬車の中（隊列を出さない）
   ・セーブ：State.data.carriage = { owned, on }（ないセーブは「持っていない」）。2D 版・3D 版で同じ
   ========================================================= */
(function (root) {
  'use strict';
  var C = root.Carriage = { SPEED: 1.6, ENC: 0.8 };
  function D() { return root.State && root.State.data; }
  C.owned = function () { var d = D(); return !!(d && d.carriage && d.carriage.owned); };
  C.wanted = function () { var d = D(); return !!(C.owned() && d.carriage.on); };
  // その地図で馬車を使えるか（フィールドで、船・飛空艇に乗っていない）
  C.fieldOk = function (map) { var d = D(); map = map || (root.World && root.World.map); return !!(map && map.kind === 'field' && !(d && d.aboard) && !(map.def && map.def.noCarriage)); };
  C.riding = function (map) { return C.wanted() && C.fieldOk(map); };
  C.give = function () { var d = D(); if (!d) return; d.carriage = d.carriage || {}; d.carriage.owned = true; if (d.carriage.on === undefined) d.carriage.on = false; C.updateUI(); };
  C.apply = function () { var W = root.World; if (W && W.player && W.walkSpeed) W.player.speed = W.walkSpeed(); C.updateUI(); };
  C.toggle = function () {
    var W = root.World, Win = root.Win, d = D(); if (!d || !W || !W.map) return false;
    var say = function (t) { if (Win && Win.toast) Win.toast(t); };
    if (!C.owned()) { say('馬車を持っていない（リヴェル城の厩舎番がゆずってくれる）'); return false; }
    if (d.aboard) { say('船・飛空艇に乗っているあいだは、馬車は使えない'); return false; }
    if (!C.fieldOk(W.map)) { say('馬車はフィールドでだけ使える（町・ダンジョン・建物の中は歩く）'); return false; }
    d.carriage.on = !d.carriage.on; C.apply();
    say(d.carriage.on ? '馬車に乗った（速く進み、魔物に出会いにくい）　C キーで降りる' : '馬車を降りた（歩いて進む）');
    if (root.Audio && root.Audio.sfx) { try { root.Audio.sfx(d.carriage.on ? 'door' : 'step'); } catch (e) { /* 音がなくても続ける */ } }
    if (root.State && root.State.autosave) root.State.autosave();
    return true;
  };
  // スマホの操作パネルの「馬車」ボタン：持っているときだけ出す。乗っているときは光らせる
  C.updateUI = function () {
    if (typeof document === 'undefined') return; var b = document.getElementById('mp-carriage'); if (!b) return;
    var own = C.owned(); b.style.display = own ? '' : 'none'; b.classList.toggle('on78', C.riding());
  };
  // 移動の速さ・地図を変えたときの速さの付け直し（World の関数を包む）
  C.install = function () {
    var W = root.World; if (!W || W._carriage79) return; W._carriage79 = true;
    var ws0 = W.walkSpeed; W.walkSpeed = function () { var v = ws0.apply(this, arguments); return C.riding() ? v * C.SPEED : v; };
    var em0 = W.enterMap; W.enterMap = function () { var r = em0.apply(this, arguments); try { C.apply(); } catch (e) { /* 速さの付け直しに失敗しても進める */ } return r; };
    var os0 = W.onStep; W.onStep = function () { var r = os0.apply(this, arguments); try { if (W.player) W.player.speed = W.walkSpeed(); } catch (e) { /* 同上 */ } return r; };   // 船に乗った・降りた（乗り物の決まり）のあとも
  };
  C.install();
})(typeof window !== 'undefined' ? window : globalThis);
