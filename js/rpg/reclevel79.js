/* =========================================================
   RPG / RecLevel79（v7.9.3）：その場所の推奨レベル（2D/3D 共通）
   ・フィールド・ダンジョン（と船の上）の、いまいる出現地帯の「推奨レベル」を、画面左上の地名のとなりにいつも出す（町・建物の中は出さない）
   ・フィールド・地域・ダンジョンへ移ったとき（地図が変わった・出現地帯が変わった）は、画面の上に「地名　推奨レベル Lv 10〜12」を数秒出す
   ・推奨レベルの出どころ：出現地帯の level（敵の強さ。js/data/enemy-scale67.js と同じ値）を、docs/balance-v67.md の 1. の表
     （その地帯に来るころの想定レベル＝上の数・少ないレベルで試した数＝下の数。オート戦闘・アイテムなし・その章の店の最強装備のシミュレーション）で読みかえる。
     level のない地帯（地球の世界の新しい地域）は、出てくる敵の Lv の平均を level とみなす。表より上は、表の終わりの傾きでのばす（推定）
   ・パーティーの平均レベルと比べて色を変える（下の数より低い＝赤・上の数より 5 以上高い＝灰色）
   ・セーブには何も書かない（表示だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.RecLevel = {};
  // [地帯の level, 少ないレベル, 想定レベル]（docs/balance-v67.md の 1. の表から。同じ level の地帯は同じ数になっている）
  var CURVE = R.CURVE = [[1, 2, 2], [3, 5, 5], [4, 6, 6], [5, 6, 7], [7, 8, 10], [8, 9, 11], [10, 10, 12], [11, 12, 15], [12, 14, 17], [13, 18, 22], [14, 20, 24], [15, 21, 26], [16, 23, 28],
    [18, 25, 31], [19, 27, 33], [21, 31, 38], [22, 33, 40], [23, 34, 42], [24, 37, 45], [25, 39, 47], [26, 41, 50], [27, 42, 51], [28, 43, 53], [29, 44, 54], [30, 45, 55], [31, 47, 57], [32, 48, 58], [34, 50, 61], [36, 52, 63], [37, 53, 65]];
  function D() { return root.State && root.State.data; }
  // 地帯の level → [下, 上]
  R.range = function (lv) {
    if (!(lv > 0)) return null; var C = CURVE, n = C.length, lo, hi;
    if (lv <= C[0][0]) { lo = C[0][1]; hi = C[0][2]; }
    else if (lv >= C[n - 1][0]) { var a = C[n - 4], b = C[n - 1]; var k1 = (b[1] - a[1]) / (b[0] - a[0]), k2 = (b[2] - a[2]) / (b[0] - a[0]); lo = b[1] + (lv - b[0]) * k1; hi = b[2] + (lv - b[0]) * k2; }
    else { for (var i = 1; i < n; i++) { if (lv <= C[i][0]) { var p = C[i - 1], q = C[i], t = (lv - p[0]) / (q[0] - p[0]); lo = p[1] + (q[1] - p[1]) * t; hi = p[2] + (q[2] - p[2]) * t; break; } } }
    lo = Math.max(1, Math.min(99, Math.round(lo))); hi = Math.max(lo, Math.min(99, Math.round(hi))); return [lo, hi];
  };
  // 出現地帯の level（ないときは出てくる敵の Lv の平均）
  R.zoneLevel = function (z) {
    if (!z) return 0; if (z.level) return z.level; var n = 0, t = 0;
    (z.groups || []).forEach(function (g) { (g || []).forEach(function (e) { var en = root.ENEMIES && root.ENEMIES[e]; if (en && en.lv) { n++; t += en.lv; } }); });
    return n ? Math.round(t / n) : 0;
  };
  // いまの場所の出現地帯（船の上は乗り物の出現表）
  R.zoneAt = function (map, x, y) {
    var d = D(); if (!map) return null; var enc = null;
    try { enc = d && d.aboard && root.Vehicle ? root.Vehicle.encounters() : map.encounters; } catch (e) { enc = null; }
    if (!enc || !enc.zones || !(enc.rate > 0 || (enc.rate79 > 0))) return null;
    for (var i = 0; i < enc.zones.length; i++) { var z = enc.zones[i]; try { if (z.test(x, y, map)) return z; } catch (e) { /* 次の地帯 */ } }
    return null;
  };
  // いまの場所の推奨レベル：{ lo, hi, level, zone, map } または null（町・建物の中・敵の出ない所）
  R.at = function (map, x, y) {
    var W = root.World; map = map || (W && W.map); if (!map) return null; var p = W && W.player;
    if (x === undefined && p) { x = p.x; y = p.y; }
    var d = D(); var kind = map.kind || (map.def && map.def.kind) || 'town';
    if (!(d && d.aboard) && kind !== 'field' && kind !== 'dungeon') return null;
    var fx = map.def && map.def.recLevel; if (fx && !(d && d.aboard)) return { lo: fx[0], hi: fx[1], level: 0, zone: '', map: map.id, kind: kind, fixed: true };   // v8.0 地図ごとに決めた推奨レベル（異界のボスの間）
    var z = R.zoneAt(map, x, y); if (!z) return null; var lv = R.zoneLevel(z); var r = R.range(lv); if (!r) return null;
    return { lo: r[0], hi: r[1], level: lv, zone: z.name || '', map: map.id, kind: d && d.aboard ? 'sea' : kind };
  };
  R.text = function (r) { return r ? ('推奨Lv ' + (r.lo === r.hi ? r.lo : r.lo + '〜' + r.hi)) : ''; };
  // パーティーの平均レベル（生きている戦闘メンバー）
  R.partyLevel = function () { var S = root.State; if (!S || !S.partyActors) return 0; var a = S.partyActors().filter(function (q) { return q && !q.dead; }); if (!a.length) a = S.partyActors(); if (!a.length) return 0; return Math.round(a.reduce(function (s, q) { return s + (q.level || 1); }, 0) / a.length); };
  R.grade = function (r, pl) { if (!r) return ''; pl = pl === undefined ? R.partyLevel() : pl; return pl < r.lo ? 'hard' : pl > r.hi + 5 ? 'easy' : 'ok'; };
  R.gradeText = { hard: 'きびしめ', ok: 'ちょうどよい', easy: '楽' };

  /* ---------- 画面の表示 ---------- */
  function esc(s) { return root.Win && root.Win.esc ? root.Win.esc(s) : String(s); }
  // 地名のとなりの表示（World.updateHud のあと）
  R.hud = function () {
    if (typeof document === 'undefined') return; var h = document.getElementById('hud'); if (!h) return; var top = h.querySelector('.hud-top'); if (!top) return;
    var old = top.querySelector('.hud-rec'); var r = R.at(); if (!r) { if (old) old.remove(); return; }
    var g = R.grade(r); var html = esc(R.text(r)); var el = old || document.createElement('div');
    el.className = 'hud-rec rl-' + g; el.title = (r.zone ? r.zone + '：' : '') + '推奨レベル ' + r.lo + '〜' + r.hi + '（いまの平均 Lv ' + R.partyLevel() + '）';
    if (el.innerHTML !== html) el.innerHTML = html; if (!old) { var loc = top.querySelector('.hud-loc'); if (loc && loc.nextSibling) top.insertBefore(el, loc.nextSibling); else top.appendChild(el); }
  };
  // 場所が変わったときの表示（画面の上に数秒）
  R._key = null; R.last = null;
  R.keyOf = function (map, r) { if (!r) return null; return (r.kind === 'dungeon' ? '' : (map && map.name || '') + '|') + r.zone + '|' + r.lo + '-' + r.hi; };
  R.announce = function (r, map) {
    R.last = { at: Date.now(), map: map && map.id, text: R.bannerText(r, map), grade: R.grade(r) };
    if (typeof document === 'undefined') return; var st = document.getElementById('stage') || document.body; if (!st) return;
    var el = document.getElementById('rec-banner'); if (!el) { el = document.createElement('div'); el.id = 'rec-banner'; st.appendChild(el); }
    var g = R.grade(r); el.className = 'rl-' + g; el.innerHTML = '<span class="rb-place">' + esc(R.placeName(r, map)) + '</span><span class="rb-lv">推奨レベル <b>Lv ' + (r.lo === r.hi ? r.lo : r.lo + '〜' + r.hi) + '</b></span><span class="rb-pl">いまの平均 Lv ' + R.partyLevel() + '（' + R.gradeText[g] + '）</span>';
    var inBattle = function () { var B = root.BattleUI; return !!(B && B.scene); };   // v8.0 戦闘が始まったら消す（ボスの間に入ってすぐボスに話しかけたときなど、戦闘の画面に重ならない）
    var show = function () { if (inBattle()) return; void el.offsetWidth; el.classList.add('show'); clearTimeout(el._t); clearInterval(el._b); var t1 = Date.now();
      el._b = setInterval(function () { var b = inBattle(); if (b || Date.now() - t1 > 3400) { clearInterval(el._b); if (b) el.classList.remove('show'); } }, 150);
      el._t = setTimeout(function () { el.classList.remove('show'); }, 3200); };
    // 3D 版：地図の 3D を組み立てているあいだ（読み込みの表示中）は待って、できてから出す（最大 20 秒）
    clearInterval(R._wait); var A3 = root.MTQ3D; var W0 = root.World;
    var in3d = function () { try { return !!(A3 && !A3.disabled && A3.mode3D && A3.mode3D()); } catch (e) { return false; } };
    var ready = function () { var cm = A3 && A3.current && A3.current.map; return !in3d() || (!!cm && !!(W0 && W0.map) && cm.id === W0.map.id && !A3.building); };
    if (ready()) show(); else { var t0 = Date.now(); R._wait = setInterval(function () { if (ready() || Date.now() - t0 > 20000) { clearInterval(R._wait); if (R._key === R.keyOf(W0 && W0.map, R.at())) show(); } }, 200); }
  };
  R.placeName = function (r, map) { var nm = map && map.name || ''; if (r.kind === 'sea') { var V = root.Vehicle; var vn = V && V.aboard && V.aboard() && root.VEHICLES[V.aboard()] ? root.VEHICLES[V.aboard()].name : '船'; return vn + '・' + (r.zone || nm); } return r.zone && r.zone !== nm && nm.indexOf(r.zone) < 0 ? nm + '・' + r.zone : nm; };
  R.bannerText = function (r, map) { return R.placeName(r, map) + '　推奨レベル Lv ' + (r.lo === r.hi ? r.lo : r.lo + '〜' + r.hi) + '（いまの平均 Lv ' + R.partyLevel() + '）'; };
  R.check = function () {
    var W = root.World; if (!W || !W.map || !W.player) return; var r = R.at(); var k = R.keyOf(W.map, r);
    if (k && k !== R._key) R.announce(r, W.map);
    R._key = k;
  };

  /* ---------- つなぐ ---------- */
  R.install = function () {
    var W = root.World; if (!W || W._rec79) return; W._rec79 = true;
    var uh = W.updateHud; W.updateHud = function () { var v = uh.apply(this, arguments); try { R.hud(); R.check(); } catch (e) { /* 表示だけなので続ける */ } return v; };
  };
  R.install();
})(typeof window !== 'undefined' ? window : globalThis);
