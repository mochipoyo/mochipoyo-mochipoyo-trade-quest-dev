/* =========================================================
   UI / v8.1 町の環境音（水の音）：地図の定義 waterSound81 = [{ x, y, r }]（マスの座標・聞こえる半径）
   ・音は合成（音のファイルなし）：くり返す雑音を帯域で絞り、ゆっくり揺らして「水路を流れる水・汲み場の水」の音にする
   ・音量：いちばん近い音の元までの距離で決める（半径の外は 0）。効果音の音量（設定の se）と消音（mute）に従う（Audio.seGain につなぐ）
   ・2D 版・3D 版どちらでも動く（World.map と World.player だけを見る）。音が使えない環境（jsdom など）では何もしない
   ========================================================= */
(function (root) {
  'use strict';
  var A = {}; root.Ambient81 = A;
  A.state = { on: false, map: null, vol: 0, target: 0, src: null };
  function audio() { var Au = root.Audio; return Au && Au.ctx && Au.unlocked && Au.seGain ? Au : null; }
  // くり返す雑音（2 秒）。ブラウン雑音（低い音が多い）に、ときどき小さな粒（しずく）を混ぜる
  function makeBuffer(ctx) {
    var n = Math.floor(ctx.sampleRate * 2), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0, seed = 12345;
    var rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (var i = 0; i < n; i++) { var w = rnd() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    for (var k = 0; k < 14; k++) { var at = Math.floor(rnd() * (n - 400)), f = 900 + rnd() * 1400, a = 0.12 + rnd() * 0.12; for (var j = 0; j < 400; j++) d[at + j] += Math.sin(j / ctx.sampleRate * f * 2 * Math.PI) * a * Math.exp(-j / 90); }
    // つなぎ目をなめらかに
    for (var e = 0; e < 600; e++) { var t = e / 600; d[e] = d[e] * t + d[n - 600 + e] * (1 - t); }
    return b;
  }
  function start(Au) {
    var ctx = Au.ctx; var s = A.state; if (s.src) return;
    var src = ctx.createBufferSource(); src.buffer = A.buf || (A.buf = makeBuffer(ctx)); src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    var g = ctx.createGain(); g.gain.value = 0;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.23; var lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency);
    src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(Au.seGain); src.start(); lfo.start();
    s.src = src; s.gain = g; s.lfo = lfo; s.nodes = [src, hp, bp, g, lfo, lg];
  }
  function stop() { var s = A.state; if (!s.src) return; try { s.src.stop(); s.lfo.stop(); } catch (e) { /* 止まっている */ } s.nodes.forEach(function (n) { try { n.disconnect(); } catch (e) { /* なし */ } }); s.src = null; s.gain = null; s.nodes = null; }
  // いまの場所での音量（0〜1）。音の元がない地図は 0
  A.levelAt = function (map, x, y) {
    var L = map && map.def && map.def.waterSound81; if (!L || !L.length) return 0; var best = 0;
    L.forEach(function (p) { var d = Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y)); var r = p.r || 8; var v = d >= r ? 0 : Math.pow(1 - d / r, 1.5) * (p.v || 1); if (v > best) best = v; });
    return Math.min(1, best);
  };
  A.tick = function () {
    var W = root.World, s = A.state; if (!W || !W.map || !W.player) return;
    var lv = A.levelAt(W.map, W.player.x, W.player.y); s.target = lv; s.map = W.map.id;
    var Au = audio(); if (!Au) return;
    if (lv > 0.001 && !s.src) start(Au);
    if (s.gain) { var now = Au.ctx.currentTime; s.gain.gain.cancelScheduledValues(now); s.gain.gain.setTargetAtTime(lv * 0.55, now, 0.35); s.vol = lv * 0.55; }
    if (lv <= 0.001 && s.src && s.vol <= 0.001 && !A._off) A._off = setTimeout(function () { A._off = null; if (A.state.target <= 0.001) stop(); }, 1500);   // 聞こえない所が続いたら止める
  };
  A.init = function () { if (A._iv) return; A._iv = setInterval(function () { try { A.tick(); } catch (e) { /* 音なしで続ける */ } }, 250); };
  if (typeof document !== 'undefined' && (root.AudioContext || root.webkitAudioContext)) A.init();   // 音の使えない環境（jsdom の確かめなど）では回さない
})(typeof window !== 'undefined' ? window : globalThis);
