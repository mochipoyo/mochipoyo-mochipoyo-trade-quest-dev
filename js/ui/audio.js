/* =========================================================
   UI / Audio : WebAudio によるレトロ風BGM・効果音（すべてオリジナルの自作シーケンス）
   初期状態はミュート。ユーザー操作後にのみ再生する。音が出なくてもゲームは動く。
   ========================================================= */
(function (root) {
  'use strict';

  var Audio = { ctx: null, current: null, timer: null, master: null, bgmGain: null, seGain: null, unlocked: false };

  var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(n) { if (n === '-' || !n) return 0; var m = n.match(/^([A-G]#?)(\d)$/); if (!m) return 0; var semi = NOTE[m[1]] + (parseInt(m[2], 10) - 4) * 12; return 440 * Math.pow(2, (semi - 9) / 12); }

  // 各曲：bpm、メロディ（音名,拍）、ベース（音名,拍）、波形
  var TRACKS = {
    title: { bpm: 96, wave: 'square', mel: 'E4 1 G4 1 B4 2 A4 1 G4 1 E4 2 D4 1 E4 1 G4 2 A4 1 G4 1 E4 2 C4 1 D4 1 E4 2 G4 1 E4 1 D4 2 E4 1 D4 1 C4 4', bass: 'C3 2 G2 2 A2 2 E2 2 F2 2 C3 2 G2 2 G2 2' },
    field: { bpm: 128, wave: 'square', mel: 'G4 1 A4 1 B4 1 D5 1 B4 1 A4 1 G4 2 E4 1 G4 1 A4 1 B4 1 A4 1 G4 1 E4 2 D4 1 E4 1 G4 1 A4 1 G4 1 E4 1 D4 2 E4 1 G4 1 A4 1 B4 1 D5 2 B4 2', bass: 'G2 2 D3 2 E2 2 B2 2 C3 2 G2 2 D3 2 G2 2' },
    town: { bpm: 104, wave: 'triangle', mel: 'C5 1 E5 1 G5 2 E5 1 C5 1 D5 2 B4 1 D5 1 G5 2 F5 1 E5 1 D5 2 C5 1 E5 1 G5 1 A5 1 G5 2 E5 2 D5 1 C5 1 D5 2 C5 4', bass: 'C3 2 E3 2 G2 2 G2 2 C3 2 F2 2 G2 2 C3 2' },
    castle: { bpm: 84, wave: 'triangle', mel: 'D4 2 F4 2 A4 2 D5 2 C5 2 A4 2 F4 2 D4 2 E4 2 G4 2 B4 2 E5 2 D5 2 B4 2 A4 2 G4 2', bass: 'D3 4 D3 4 A2 4 A2 4 E3 4 E3 4 B2 4 A2 4' },
    dungeon: { bpm: 100, wave: 'sawtooth', mel: 'E3 2 - 1 G3 1 A#3 2 - 2 E3 1 D3 1 E3 2 - 2 G3 2 F3 2 E3 2 - 2 A#3 2 A3 2 G3 2 E3 2', bass: 'E2 4 E2 4 D2 4 E2 4 C2 4 C2 4 D2 4 E2 4' },
    boss_area: { bpm: 90, wave: 'sawtooth', mel: 'A3 2 C4 1 B3 1 A3 2 E3 2 F3 2 A3 1 G3 1 F3 2 E3 2 D3 2 F3 1 E3 1 D3 2 A2 2 E3 4 - 4', bass: 'A2 4 A2 4 F2 4 F2 4 D2 4 D2 4 E2 4 E2 4' },
    battle: { bpm: 150, wave: 'square', mel: 'E4 1 E4 1 G4 1 E4 1 A4 1 G4 1 E4 2 D4 1 D4 1 F4 1 D4 1 G4 1 F4 1 D4 2 C4 1 E4 1 G4 1 C5 1 B4 1 G4 1 E4 2 F4 1 G4 1 A4 1 B4 1 C5 2 B4 2', bass: 'E2 1 E2 1 E2 1 E2 1 D2 1 D2 1 D2 1 D2 1 C2 1 C2 1 C2 1 C2 1 B1 1 B1 1 B1 1 B1 1' },
    boss: { bpm: 160, wave: 'sawtooth', mel: 'A3 1 A3 1 C4 1 A3 1 D#4 1 D4 1 C4 2 A3 1 A3 1 F4 1 E4 1 D4 1 C4 1 A3 2 G3 1 A3 1 C4 1 D4 1 F4 1 E4 1 D4 2 C4 1 D4 1 E4 1 F4 1 G4 2 E4 2', bass: 'A1 1 A1 1 A1 1 A1 1 F2 1 F2 1 F2 1 F2 1 G1 1 G1 1 G1 1 G1 1 E2 1 E2 1 E2 1 E2 1' },
    church: { bpm: 70, wave: 'sine', mel: 'C5 2 E5 2 G5 4 F5 2 E5 2 D5 4 E5 2 G5 2 C6 4 B5 2 G5 2 E5 4', bass: 'C3 4 C3 4 F2 4 G2 4 C3 4 C3 4 G2 4 C3 4' },
    tavern: { bpm: 120, wave: 'triangle', mel: 'G4 1 G4 1 B4 1 D5 1 C5 1 B4 1 A4 2 F4 1 F4 1 A4 1 C5 1 B4 1 A4 1 G4 2 E4 1 G4 1 C5 1 E5 1 D5 1 C5 1 B4 2 A4 1 B4 1 C5 1 D5 1 G4 2 - 2', bass: 'G2 2 D3 2 F2 2 C3 2 C3 2 G2 2 A2 2 G2 2' },
    ending: { bpm: 88, wave: 'triangle', mel: 'E4 2 G4 2 A4 4 B4 2 A4 2 G4 4 E4 2 G4 2 B4 2 D5 2 C5 4 B4 4 A4 2 B4 2 C5 2 D5 2 E5 8', bass: 'C3 4 C3 4 A2 4 A2 4 F2 4 F2 4 G2 4 C3 4' }
  };
  var JINGLES = {
    // v9.3 勝利・レベルアップは下の FANFARE（金管・ベルなどの合成）で鳴らす。次の 2 つは、合成に使う部品がないブラウザのときだけ使う（今までの音）
    victory: { bpm: 140, wave: 'square', mel: 'C5 1 C5 1 C5 1 C5 2 G4 2 A4 2 C5 2 - 1 A4 1 C5 4' },
    levelup: { bpm: 160, wave: 'square', mel: 'G4 1 B4 1 D5 1 G5 2 D5 1 G5 3' },
    inn: { bpm: 100, wave: 'triangle', mel: 'C5 1 E5 1 G5 1 C6 2 G5 1 E5 1 C5 2' },
    chest: { bpm: 180, wave: 'square', mel: 'C5 1 E5 1 G5 2' }
  };

  function parse(s) { var t = s.trim().split(/\s+/); var out = []; for (var i = 0; i < t.length; i += 2) out.push([t[i], parseFloat(t[i + 1])]); return out; }

  Audio.init = function () {
    // v9.3 スマホ（タッチ）では、指を置いた瞬間（pointerdown）は「操作」に数えられず、音を出す許可が下りない（指を離したとき＝pointerup・touchend・click が操作）。
    //   そのため、どれでも呼ぶ（許可が下りるまで、毎回もう一度試す）
    ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, Audio.unlock, { passive: true }); });
  };
  Audio.unlock = function () {
    try {
      if (!Audio.ctx) { Audio.ctx = new (root.AudioContext || root.webkitAudioContext)(); Audio.master = Audio.ctx.createGain(); Audio.master.connect(Audio.ctx.destination); Audio.bgmGain = Audio.ctx.createGain(); Audio.bgmGain.connect(Audio.master); Audio.seGain = Audio.ctx.createGain(); Audio.seGain.connect(Audio.master); }
      if (Audio.ctx.state !== 'running' && Audio.ctx.resume) { var rs = Audio.ctx.resume(); if (rs && rs.catch) rs.catch(function () { }); }
      Audio.unlocked = true; primeFiles(); Audio.apply();
      if (Audio.pending) { var p = Audio.pending; Audio.pending = null; Audio.playBgm(p); }
      else if (FILE.cur) { var ce = FILE.els[FILE.act]; if (ce && ce.paused) { try { var pr = ce.play(); if (pr && pr.catch) pr.catch(function () { }); } catch (e2) { } } }   // v9.3 前に許可が下りずに止まっていた曲を、この操作でもう一度
    } catch (e) { /* 音なしで続行 */ }
  };
  // v9.3 タイトル画面の［♪ 音］：セーブを読む前（タイトル）の音の ON／OFF。この端末に覚える（localStorage 'mtq-title-sound'）。新しいゲームの初期値にもなる
  //   v9.3 修正：まだ選んでいない（記録がない）ときは ON（最初のクリック・タップから BGM が鳴る。［♪ 音］で OFF にできる）
  Audio.titleSound = function () { try { return !root.localStorage || root.localStorage.getItem('mtq-title-sound') !== 'off'; } catch (e) { return true; } };
  Audio.setTitleSound = function (on) { try { root.localStorage.setItem('mtq-title-sound', on ? 'on' : 'off'); } catch (e) { } Audio.apply(); if (on && Audio.lastKey) { var k = Audio.lastKey; Audio.current = null; Audio.playBgm(k); } };
  Audio.settings = function () { return (root.State && root.State.data) ? root.State.data.settings : { mute: !Audio.titleSound(), bgm: 0.5, se: 0.5 }; };
  Audio.apply = function () {
    if (!Audio.ctx) return; var s = Audio.settings();
    Audio.master.gain.value = s.mute ? 0 : 1; Audio.bgmGain.gain.value = s.bgm * 0.25; Audio.seGain.gain.value = s.se * 0.5;
    try { var AS = root.navigator && root.navigator.audioSession; if (AS) AS.type = s.silentPlay === 'on' && !s.mute ? 'playback' : 'auto'; } catch (e) { }   // v9.3 iPhone・iPad の Safari：設定「マナーモードでも鳴らす」
    if (s.mute && bgmCur()) { var k0 = Audio.lastKey; bgmStopFile(); Audio.current = null; Audio.pending = k0; }   // v9.3 音を消したら曲の読み込み・再生も止める（次に音を出したときに続きから）
    if (!s.mute && !Audio.current && Audio.pending) { var p = Audio.pending; Audio.pending = null; Audio.playBgm(p); }
  };

  /* ---------- v9.3 フリー音源の BGM（js/data/bgm93.js・assets/music/） ----------
     ・<audio> を 2 つ使い、曲の切り替えは 0.8 秒で入れ替える（前の曲は小さくして止める）。音量は WebAudio の BGM の音量（設定）に従う
     ・町・フィールドの曲は、戦闘から戻ったときに続きから流す（戦闘・ボスの曲は毎回はじめから）
     ・最初のタップ（Audio.unlock）で 2 つの <audio> を無音で一度鳴らしておく（スマホで後から曲を流せるように）
     ・音を消している間は読み込まない。曲が読めない（ファイルがない・通信の失敗）ときは、その場面は今までの自作の BGM にする
     ・設定「BGM の種類」＝レトロ（settings.bgmKind='retro'）のときは今までどおり */
  var SILENT = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABgAAAykAWlpaWlpaWlpaWlpaWlpaWnt7e3t7e3t7e3t7e3t7e3t7nJycnJycnJycnJycnJycnL29vb29vb29vb29vb29vb293t7e3t7e3t7e3t7e3t7e3t7/////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCowAAAAAAAAMpso+sIAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
  var FILE = { els: [], gains: [], act: 0, cur: null, pos: {}, failed: {}, primed: false };
  Audio.FILE = FILE;
  Audio.fileMode = function () { var s = Audio.settings(); return !!root.BGM93 && s.bgmKind !== 'retro' && !Audio.noFile; };
  // 無音を一度鳴らす（その再生器に、あとで曲を流す許可をもらう）。許可が下りなかったら、次の操作でもう一度
  function primeOne(el) {
    if (el._ok) return; if (el.getAttribute('src') !== SILENT) { el._ok = true; return; }
    try { var pr = el.play(); if (pr && pr.then) pr.then(function () { el._ok = true; if (el.getAttribute('src') === SILENT) try { el.pause(); } catch (e) { } }, function () { }); else el._ok = true; } catch (e) { }
  }
  function primeFiles() {
    if (!root.document) return;
    if (FILE.els.length) { FILE.els.forEach(primeOne); return; }
    for (var i = 0; i < 2; i++) {
      var el = document.createElement('audio'); el.preload = 'auto'; el.loop = true; var g = null;
      try { var node = Audio.ctx.createMediaElementSource(el); g = Audio.ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(Audio.bgmGain); } catch (e) { g = null; }
      (function (el) { el.addEventListener('error', function () { var id = el._id; if (!id || !el.getAttribute('src') || el.getAttribute('src') === SILENT) return; FILE.failed[id] = true; if (FILE.cur === id) { var k = Audio.lastKey; FILE.cur = null; Audio.current = null; retroPlay(k); } }); })(el);
      FILE.els.push(el); FILE.gains.push(g);
      try { el.src = SILENT; primeOne(el); } catch (e) { }   // 最初のタップの中で一度鳴らす（無音。鳴らせたら止める＝無音をくり返し再生し続けない）
    }
  }
  var LOUD = 3.2;   // 曲（MP3）の音量の倍率：BGM の音量（設定）× 0.25 × 3.2 ＝ 設定 × 0.8
  function ramp(i, to, sec) { var g = FILE.gains[i], el = FILE.els[i]; if (g) { var t = Audio.ctx.currentTime; try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(to, t + sec); } catch (e) { g.gain.value = to; } } else if (el) { var s = Audio.settings(); el.volume = Math.max(0, Math.min(1, s.mute ? 0 : to / LOUD * s.bgm)); } }
  function fileStop() { if (FILE.cur) { var el = FILE.els[FILE.act]; try { FILE.pos[FILE.cur] = el.currentTime; } catch (e) { } } FILE.cur = null; FILE.els.forEach(function (el, i) { ramp(i, 0, 0.3); (function (el) { setTimeout(function () { if (FILE.els.indexOf(el) !== FILE.act || !FILE.cur) try { el.pause(); } catch (e) { } }, 350); })(el); }); }
  function filePlay(id, restart) {
    if (!FILE.els.length) primeFiles(); if (!FILE.els.length) return false;
    var url = root.BGM93.url(id); if (!url) return false;
    if (FILE.cur === id) {   // 同じ曲をもう一度（タイトルで音を ON にしたときなど）：もう 1 つの再生器で重ねて鳴らさない。今の再生器のまま（戦闘・ボスは頭から）
      var ce = FILE.els[FILE.act]; if (restart) { try { ce.currentTime = 0; } catch (e) { } }
      ramp(FILE.act, LOUD, 0.3); if (ce.paused) { try { var pp = ce.play(); if (pp && pp.catch) pp.catch(function () { }); } catch (e) { return false; } }
      return true;
    }
    var prev = FILE.act, cur = FILE.els[prev];
    if (FILE.cur) { try { FILE.pos[FILE.cur] = cur.currentTime; } catch (e) { } }
    var nx = FILE.cur ? 1 - prev : prev; var el = FILE.els[nx];
    if (FILE.cur && FILE.cur !== id) { ramp(prev, 0, 0.8); setTimeout(function () { if (FILE.act !== prev) try { cur.pause(); } catch (e) { } }, 850); }
    FILE.act = nx; FILE.cur = id; el._id = id;
    var start = restart ? 0 : (FILE.pos[id] || 0);
    if (el.getAttribute('src') !== url) { el.src = url; if (start > 0) el.addEventListener('loadedmetadata', function f() { el.removeEventListener('loadedmetadata', f); try { if (el.duration && start < el.duration - 1) el.currentTime = start; } catch (e) { } }); }
    else { try { el.currentTime = start; } catch (e) { } }
    if (FILE.gains[nx]) FILE.gains[nx].gain.value = 0; ramp(nx, LOUD, 0.8);
    try { var pr = el.play(); if (pr && pr.catch) pr.catch(function (err) { if (FILE.cur !== id) return; if (err && err.name === 'NotAllowedError') { FILE.cur = null; Audio.current = null; Audio.pending = Audio.lastKey; } }); } catch (e) { return false; }
    return true;
  }
  // 戦闘の曲を先に読み込んでおく（フィールドに入ったとき。音を出しているときだけ）
  Audio.prefetch = function (id) {
    if (Audio.ctx && useBuf()) { if (!Audio.fileMode() || Audio.settings().mute || !id || BUF.failed[id]) return; BUF.keep = id; bufLoad(id).catch(function () { }); return; }   // 読み込んでから鳴らす：戦闘の曲を先に読み込んでおく
    if (!Audio.fileMode() || Audio.settings().mute || !id || FILE.failed[id] || !FILE.els.length) return; var other = FILE.els[1 - FILE.act]; if (!other || (FILE.cur && FILE.els.indexOf(other) === FILE.act)) return; var url = root.BGM93.url(id); if (other.getAttribute('src') !== url && other.paused) { other._id = id; other.src = url; other.preload = 'auto'; try { other.load(); } catch (e) { } } };
  /* ---------- v9.3 修正：BGM の鳴らし方「読み込んでから鳴らす」（buffer。PC の初期値） ----------
     ・Windows の Chrome の 3D 版で、<audio> の曲だけが鳴らなかった（効果音は鳴る）とのご報告。原因は確かめられていないが、
       効果音と同じ WebAudio の仕組みで鳴らせば、<audio> の再生の仕組みを通らない
     ・曲のファイルを全部読み込み（fetch）、音の形に直して（decodeAudioData。22.05kHz に下げてメモリを抑える）、AudioBufferSourceNode でくり返し鳴らす
     ・読み込みが終わるまで鳴らない（1 曲 0.8〜2.4MB）。覚えておく曲は PC 最大 3 曲（今の曲・戦闘の曲・前の曲）、スマホ・タブレット最大 2 曲（今の曲・戦闘の曲）。1 曲 最大 約 55MB
     ・設定「BGM の鳴らし方」：自動（＝読み込んでから鳴らす）／読み込んでから鳴らす／流しながら鳴らす（<audio>。今までの作り）
     ・v9.3 修正：iPhone で「流しながら鳴らす」が、曲は進むのに WebAudio に音が届かない（出ている音の大きさ 0）ことが分かったため、スマホ・タブレットも自動は「読み込んでから鳴らす」 */
  var BUF = { cache: {}, order: [], cur: null, node: null, gain: null, t0: 0, off: 0, dur: 0, pos: {}, failed: {}, keep: null, state: '', err: '' };
  Audio.BUF = BUF;
  var RATE = 22050;
  function touchOnly() { try { return !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches && !root.matchMedia('(pointer: fine)').matches); } catch (e) { return false; } }
  function keepN() { return touchOnly() ? 2 : 3; }   // スマホ・タブレットはメモリを抑える
  Audio.bgmEngine = function () {
    var s = Audio.settings(); if (s.bgmEngine === 'stream' || s.bgmEngine === 'buffer') return s.bgmEngine === 'buffer' && !canBuf() ? 'stream' : s.bgmEngine;
    if (!canBuf()) return 'stream';
    return 'buffer';
  };
  function canBuf() { return !!(root.fetch && root.Promise && Audio.ctx && Audio.ctx.decodeAudioData && Audio.ctx.createBufferSource); }
  function useBuf() { return Audio.bgmEngine() === 'buffer'; }
  function bufTouch(id) { var i = BUF.order.indexOf(id); if (i >= 0) BUF.order.splice(i, 1); BUF.order.push(id); }
  function bufTrim() { while (BUF.order.length > keepN()) { var old = null; for (var i = 0; i < BUF.order.length; i++) { var k = BUF.order[i]; if (k !== BUF.cur && k !== BUF.keep) { old = k; break; } } if (!old) break; BUF.order.splice(BUF.order.indexOf(old), 1); delete BUF.cache[old]; } }
  function bufDecode(ab) {
    return new Promise(function (res, rej) {
      var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext, dc = Audio.ctx;
      try { if (OAC) dc = new OAC(2, 1, RATE); } catch (e) { dc = Audio.ctx; }
      try { var pr = dc.decodeAudioData(ab, res, rej); if (pr && pr.then) pr.then(res, rej); } catch (e) { rej(e); }
    });
  }
  function bufLoad(id) {
    var c = BUF.cache[id]; if (c) { bufTouch(id); return c.p; }
    var url = root.BGM93.url(id); c = BUF.cache[id] = { p: null, buf: null };
    c.p = root.fetch(url).then(function (r) { if (!r.ok) throw new Error('通信 ' + r.status); return r.arrayBuffer(); }).then(bufDecode).then(function (b) { c.buf = b; return b; });
    c.p.catch(function () { if (BUF.cache[id] === c) { delete BUF.cache[id]; var i = BUF.order.indexOf(id); if (i >= 0) BUF.order.splice(i, 1); } });
    bufTouch(id); bufTrim(); return c.p;
  }
  function bufPos() { if (!BUF.node || !BUF.dur) return BUF.off || 0; return (BUF.off + (Audio.ctx.currentTime - BUF.t0)) % BUF.dur; }
  function bufStopNode(fade) {
    var n = BUF.node, g = BUF.gain; BUF.node = null; BUF.gain = null; if (!n) return;
    try { var t = Audio.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); n.stop(t + fade + 0.05); } catch (e) { try { n.stop(); } catch (e2) { } }
  }
  function bufStart(id, b, off) {
    var c = Audio.ctx, n = c.createBufferSource(), g = c.createGain(); n.buffer = b; n.loop = true; g.gain.value = 0; n.connect(g); g.connect(Audio.bgmGain);
    off = b.duration ? (off % b.duration) : 0; n.start(0, off || 0); var t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(LOUD, t + 0.8);
    BUF.node = n; BUF.gain = g; BUF.t0 = t; BUF.off = off || 0; BUF.dur = b.duration; BUF.state = 'playing';
  }
  function bufPlay(id, restart) {
    if (BUF.cur === id) { if (restart && BUF.node) { var b0 = BUF.node.buffer; bufStopNode(0.05); bufStart(id, b0, 0); } return true; }
    if (BUF.cur) BUF.pos[BUF.cur] = bufPos();
    bufStopNode(0.8); BUF.cur = id; BUF.state = 'loading'; BUF.err = ''; BUF.since = Date.now();
    var start = restart ? 0 : (BUF.pos[id] || 0);
    bufLoad(id).then(function (b) { if (BUF.cur !== id || BUF.node) return; if (Audio.settings().mute) return; bufStart(id, b, start); },
      function (e) { BUF.err = String((e && e.message) || e); if (BUF.cur !== id) return; BUF.failed[id] = true; FILE.failed[id] = true; BUF.cur = null; var k = Audio.lastKey; Audio.current = null; retroPlay(k); BUF.state = 'error'; });   // 「読めなかった」をレトロの音に切り替えたあとも残す（BGM の状態を見る）
    return true;
  }
  function bufStop() { if (BUF.cur) BUF.pos[BUF.cur] = bufPos(); BUF.cur = null; BUF.state = ''; bufStopNode(0.3); }
  // 2 つの鳴らし方をまとめる
  function bgmPlayFile(id, restart) { if (useBuf()) { if (FILE.cur) fileStop(); return bufPlay(id, restart); } if (BUF.cur) bufStop(); return filePlay(id, restart); }
  function bgmStopFile() { bufStop(); fileStop(); }
  function bgmCur() { return BUF.cur || FILE.cur; }
  // 今の BGM の様子（設定の「BGM の状態」・確かめ用）
  // 読めなかった曲をもう一度読む（設定の［もう一度鳴らす］・鳴らし方の切り替え）
  Audio.retryFiles = function () { FILE.failed = {}; BUF.failed = {}; BUF.err = ''; if (BUF.state === 'error') BUF.state = ''; };
  Audio.bgmState = function () {
    var eng = Audio.ctx ? Audio.bgmEngine() : '';
    if (BUF.cur || (eng === 'buffer' && !FILE.cur)) return { engine: 'buffer', cur: BUF.cur, state: BUF.state, playing: !!BUF.node, t: BUF.node ? +bufPos().toFixed(2) : 0, err: BUF.err, cached: Object.keys(BUF.cache), wait: BUF.state === 'loading' && BUF.since ? Math.round((Date.now() - BUF.since) / 1000) : 0 };
    var e = FILE.els[FILE.act]; return { engine: 'stream', cur: FILE.cur, state: e ? 'readyState ' + e.readyState : '', playing: !!(e && FILE.cur && !e.paused && e.readyState >= 3), t: e ? +e.currentTime.toFixed(2) : 0, err: e && e.error ? 'MEDIA_ERR ' + e.error.code : '' };
  };
  // BGM の音の大きさ（実際に出ている音。0〜1 の RMS）。設定の「BGM の状態」と確かめで使う
  Audio.bgmLevel = function () {
    if (!Audio.ctx || !Audio.bgmGain) return 0;
    if (!Audio._an) { try { Audio._an = Audio.ctx.createAnalyser(); Audio._an.fftSize = 2048; Audio.bgmGain.connect(Audio._an); } catch (e) { return 0; } }
    var b = new Float32Array(Audio._an.fftSize); Audio._an.getFloatTimeDomainData(b); var s = 0; for (var i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.sqrt(s / b.length);
  };
  // サウンドテスト用：曲を id で直接流す（js/ui/menu.js の Menu.soundTest）
  Audio.playFile = function (id) { if (!Audio.ctx || !Audio.unlocked || !root.BGM93 || !root.BGM93.TRACKS[id]) return false; clearTimeout(Audio.timer); Audio.timer = null; if (bgmPlayFile(id, true)) { Audio.current = 'file:' + id; Audio.bgmFile = id; return true; } return false; };
  Audio.stopBgm = function () { clearTimeout(Audio.timer); Audio.timer = null; Audio.current = null; bgmStopFile(); };
  Audio.playBgm = function (key) {
    Audio.lastKey = key;
    var id = null;
    if (Audio.fileMode()) { try { id = root.BGM93.pick(key, root.World && root.World.map, root.State && root.State.data); } catch (e) { id = null; } if (id && (FILE.failed[id] || BUF.failed[id])) id = null; }
    var curKey = id ? 'file:' + id : key;
    if (Audio.current === curKey) return;
    if (!Audio.ctx || !Audio.unlocked) { Audio.pending = key; return; }
    if (id) {
      if (Audio.settings().mute) { Audio.pending = key; return; }   // 音を消している間は読み込まない
      clearTimeout(Audio.timer); Audio.timer = null;
      if (bgmPlayFile(id, key === 'battle' || key === 'boss')) { Audio.current = curKey; Audio.bgmFile = id; if (key !== 'battle' && key !== 'boss') Audio.prefetch(root.BGM93.pick('battle', null, null)); return; }
    }
    retroPlay(key);
  };
  function retroPlay(key) {
    bgmStopFile(); Audio.bgmFile = null;
    var tr = TRACKS[key]; if (!tr) { clearTimeout(Audio.timer); Audio.timer = null; Audio.current = null; return; }
    clearTimeout(Audio.timer); Audio.timer = null; Audio.current = key;
    var mel = parse(tr.mel), bass = parse(tr.bass); var beat = 60 / tr.bpm;
    function loop() {
      if (Audio.current !== key) return;
      var t = Audio.ctx.currentTime + 0.05; var total = 0;
      mel.forEach(function (n) { if (n[0] !== '-') tone(freq(n[0]), t + total * beat, n[1] * beat * 0.9, tr.wave, Audio.bgmGain, 0.5); total += n[1]; });
      var bt = 0; bass.forEach(function (n) { if (n[0] !== '-') tone(freq(n[0]), t + bt * beat, n[1] * beat * 0.95, 'triangle', Audio.bgmGain, 0.6); bt += n[1]; });
      Audio.timer = setTimeout(loop, total * beat * 1000 - 20);
    }
    loop();
  }
  /* v9.3 勝利・レベルアップのファンファーレ（自作の短い曲。ほかのゲームの曲の写しではない）
     ・WebAudio で金管（のこぎり波 2 つ＋フィルター）・ベル・ティンパニ・シンバル・弦・ベースを合成し、残響（自作のインパルス応答）とコンプレッサーを通す
     ・勝利 約 2.1 秒、レベルアップ 約 2.0 秒（＋余韻）。続けて鳴らすときは前のファンファーレが終わってから鳴る（重ならない）
     ・鳴っている間は BGM を小さくする（戦闘の勝利では、戦闘の BGM を止めてから鳴らす：battle.js）
     ・書き方：[楽器, 音名（空白区切りで和音）, 始まり（拍）, 長さ（拍）, 大きさ] */
  var FANFARE = {
    victory: { bpm: 160, ev: [
      ['lead', 'G4', 0, 0.17, 0.10], ['lead', 'A4', 0.17, 0.17, 0.11], ['lead', 'B4', 0.33, 0.17, 0.12],
      ['lead', 'C5', 0.5, 0.9, 0.15], ['brass', 'E4 G4', 0.5, 0.9, 0.06], ['bass', 'C3', 0.5, 0.9, 0.22], ['timp', 'C2', 0.5, 1, 0.5], ['crash', '-', 0.5, 1.6, 0.05],
      ['lead', 'G4', 1.5, 0.45, 0.12], ['brass', 'E4', 1.5, 0.45, 0.05], ['bass', 'C3', 1.5, 0.45, 0.18],
      ['lead', 'C5', 2.0, 0.45, 0.13], ['brass', 'F4 A4', 2.0, 0.45, 0.055], ['bass', 'F2', 2.0, 0.45, 0.2],
      ['lead', 'D5', 2.5, 0.45, 0.14], ['brass', 'G4 B4', 2.5, 0.45, 0.055], ['bass', 'G2', 2.5, 0.45, 0.2], ['timp', 'G2', 2.5, 1, 0.35],
      ['lead', 'E5', 3.0, 2.5, 0.15], ['brass', 'G4 C5', 3.0, 2.5, 0.06], ['pad', 'C4 E4 G4', 3.0, 2.5, 0.035], ['bass', 'C2 C3', 3.0, 2.5, 0.18], ['timp', 'C2', 3.0, 1, 0.55], ['crash', '-', 3.0, 2.2, 0.07],
      ['bell', 'C6', 3.0, 1.6, 0.09], ['bell', 'E6', 3.12, 1.5, 0.08], ['bell', 'G6', 3.25, 1.4, 0.07], ['bell', 'C7', 3.37, 1.6, 0.06]
    ] },
    levelup: { bpm: 168, gain: 0.8, ev: [
      ['lead', 'D4', 0, 0.25, 0.10], ['lead', 'E4', 0.25, 0.25, 0.11], ['lead', 'F#4', 0.5, 0.25, 0.12],
      ['lead', 'A4', 0.75, 0.7, 0.15], ['brass', 'D4 F#4', 0.75, 0.7, 0.055], ['bass', 'D3', 0.75, 0.7, 0.2], ['timp', 'D2', 0.75, 1, 0.4], ['bell', 'A5', 0.75, 1.0, 0.08],
      ['lead', 'E4', 1.5, 0.25, 0.11], ['lead', 'F#4', 1.75, 0.25, 0.12], ['lead', 'G#4', 2.0, 0.25, 0.13],
      ['lead', 'B4', 2.25, 0.7, 0.15], ['brass', 'E4 G#4', 2.25, 0.7, 0.055], ['bass', 'E3', 2.25, 0.7, 0.2], ['timp', 'E2', 2.25, 1, 0.4], ['bell', 'B5', 2.25, 1.0, 0.08],
      ['lead', 'C#5', 3.0, 0.25, 0.13], ['lead', 'D5', 3.25, 0.25, 0.14],
      ['lead', 'E5', 3.5, 2.0, 0.15], ['brass', 'A4 C#5', 3.5, 2.0, 0.06], ['pad', 'A3 C#4 E4', 3.5, 2.0, 0.035], ['bass', 'A2 A1', 3.5, 2.0, 0.18], ['timp', 'A1', 3.5, 1, 0.55], ['crash', '-', 3.5, 2.0, 0.07],
      ['bell', 'A5', 3.5, 1.5, 0.08], ['bell', 'C#6', 3.62, 1.4, 0.075], ['bell', 'E6', 3.75, 1.4, 0.07], ['bell', 'A6', 3.87, 1.6, 0.06]
    ] }
  };
  function noiseBuf(c) { if (c._mtqNoise) return c._mtqNoise; var n = Math.floor(c.sampleRate * 1.5), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; c._mtqNoise = b; return b; }
  function irBuf(c) {   // 残響：だんだん小さくなる雑音（左右で別）＝小さめのホール
    if (c._mtqIR) return c._mtqIR; var sr = c.sampleRate, n = Math.floor(sr * 1.6), b = c.createBuffer(2, n, sr), fade = Math.floor(sr * 0.01);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.5) * (i < fade ? i / fade : 1); }
    c._mtqIR = b; return b;
  }
  function adsr(g, t, a, peak, d, sus, end, rel) {   // end（離す時）は t + a + d より後
    var s0 = Math.max(0.0001, peak * sus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(s0, t + a + d); g.gain.exponentialRampToValueAtTime(end - t > 0.6 ? s0 * 0.6 : s0, end); g.gain.exponentialRampToValueAtTime(0.0001, end + rel);   // 長くのばす音は少しずつ小さく
  }
  function vib(c, o, t, end) { var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(10, t + 0.35); l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(end + 0.2); }
  function fBrass(c, out, f, t, dur, vol, bright) {   // 金管：少しずらした 2 つののこぎり波 → 開いていくフィルター
    var sh = dur < 0.15, a = sh ? 0.008 : 0.025, dk = sh ? 0.04 : 0.12, g = c.createGain(), lp = c.createBiquadFilter(), top = Math.min(8000, f * bright), end = Math.max(t + dur, t + a + dk + 0.005);   // 短い音（速い上がり）は立ち上がり・消えを短く
    lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.setValueAtTime(f * 1.3, t); lp.frequency.exponentialRampToValueAtTime(top, t + 0.05); lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2, top * 0.6), t + 0.3);
    lp.connect(g); g.connect(out); adsr(g, t, a, vol, dk, 0.75, end, sh ? 0.05 : dur > 0.5 ? 0.4 : 0.12);   // 最後の長い音は自然に消える
    [-8, 8].forEach(function (ct) { var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = ct; if (dur > 0.5) vib(c, o, t + 0.2, end); o.connect(lp); o.start(t); o.stop(end + 0.45); });
  }
  function fBell(c, out, f, t, vol, len) {   // ベル（グロッケン）：倍音が少しずれた正弦波
    [[1, 1], [2.76, 0.3], [5.4, 0.1]].forEach(function (p) { var o = c.createOscillator(), g = c.createGain(), l = Math.max(0.15, len / Math.sqrt(p[0])); o.type = 'sine'; o.frequency.value = f * p[0]; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * p[1], t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + l); o.connect(g); g.connect(out); o.start(t); o.stop(t + l + 0.05); });
  }
  function fTimp(c, out, f, t, vol) {   // ティンパニ：音程が少し下がる低い音（小さいスピーカーでも聞こえるよう 2 倍の音も）＋打つ音
    [[1, 1], [2, 0.35]].forEach(function (p) { var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * p[0] * 1.5, t); o.frequency.exponentialRampToValueAtTime(f * p[0], t + 0.06); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * p[1], t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.95); });
    var n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); n.buffer = noiseBuf(c); nf.type = 'lowpass'; nf.frequency.value = 900; ng.gain.setValueAtTime(vol * 0.4, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t); n.stop(t + 0.1);
  }
  function fCrash(c, out, t, vol, len) {   // シンバル：高い雑音がゆっくり消える
    var n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); n.buffer = noiseBuf(c); n.loop = true; hp.type = 'highpass'; hp.frequency.value = 5500;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len); n.connect(hp); hp.connect(g); g.connect(out); n.start(t); n.stop(t + len + 0.05);
  }
  function fPad(c, out, f, t, dur, vol) {   // 弦：やわらかいのこぎり波の和音
    var g = c.createGain(), lp = c.createBiquadFilter(), end = t + Math.max(dur, 0.3); lp.type = 'lowpass'; lp.frequency.value = Math.min(2400, f * 5); lp.connect(g); g.connect(out); adsr(g, t, 0.09, vol, 0.2, 0.85, end, 0.45);
    [-10, 10].forEach(function (ct) { var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = ct; o.connect(lp); o.start(t); o.stop(end + 0.5); });
  }
  function fBass(c, out, f, t, dur, vol) {   // ベース：三角波＋少しだけ明るさ（小さいスピーカー用）
    var g = c.createGain(), lp = c.createBiquadFilter(), end = Math.max(t + dur, t + 0.17); lp.type = 'lowpass'; lp.frequency.value = Math.min(1200, f * 6); lp.connect(g); g.connect(out); adsr(g, t, 0.012, vol, 0.15, 0.7, end, 0.1);
    var o1 = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(); o1.type = 'triangle'; o1.frequency.value = f; o2.type = 'sawtooth'; o2.frequency.value = f; g2.gain.value = 0.25; o1.connect(lp); o2.connect(g2); g2.connect(lp); o1.start(t); o2.start(t); o1.stop(end + 0.15); o2.stop(end + 0.15);
  }
  function canFanfare(c) { return !!(c && c.createOscillator && c.createConvolver && c.createDynamicsCompressor && c.createBiquadFilter && c.createBuffer); }
  // c（音の準備）の dest へ、t0 から key のファンファーレを鳴らす。戻り値：{ len: 曲の長さ（秒。余韻を除く）, out: 最後の出口 }
  function fanfareTo(c, dest, key, t0) {
    var F = FANFARE[key]; if (!F || !canFanfare(c)) return null; var beat = 60 / F.bpm, len = 0;
    var bus = c.createGain(), comp = c.createDynamicsCompressor(), conv = c.createConvolver(), wet = c.createGain();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    conv.buffer = irBuf(c); wet.gain.value = 0.28; bus.gain.value = F.gain || 1;
    bus.connect(comp); bus.connect(conv); conv.connect(wet); wet.connect(comp); comp.connect(dest);
    F.ev.forEach(function (e) {
      var inst = e[0], t = t0 + e[2] * beat, d = e[3] * beat, v = e[4]; len = Math.max(len, e[2] + e[3]);
      if (inst === 'crash') { fCrash(c, bus, t, v, d); return; }
      e[1].split(' ').forEach(function (n) {
        var f = freq(n); if (!f) return;
        if (inst === 'lead') fBrass(c, bus, f, t, d, v, 7); else if (inst === 'brass') fBrass(c, bus, f, t, d, v, 4); else if (inst === 'bell') fBell(c, bus, f, t, v, d);
        else if (inst === 'timp') fTimp(c, bus, f, t, v); else if (inst === 'pad') fPad(c, bus, f, t, d, v); else if (inst === 'bass') fBass(c, bus, f, t, d, v);
      });
    });
    return { len: len * beat, out: comp };
  }
  Audio.fanfareTo = fanfareTo;   // 確かめ用（OfflineAudioContext で書き出して、長さ・大きさ・音割れを調べる）
  Audio.fanfareKeys = function () { return Object.keys(FANFARE); };
  function duck(t0, len) {   // ファンファーレの間、BGM を小さくする
    var c = Audio.ctx, g = Audio.bgmGain; if (!c || !g) return; var base = Audio.settings().bgm * 0.25, now = c.currentTime;
    try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(base * 0.15, Math.max(now + 0.06, t0)); g.gain.setValueAtTime(base * 0.15, t0 + len); g.gain.linearRampToValueAtTime(base, t0 + len + 0.6); } catch (e) { }
  }
  // 鳴らす。戻り値：鳴り始めるまでのミリ秒（鳴らないときは -1）
  Audio.playJingle = function (key) {
    if (!Audio.ctx || !Audio.unlocked) return -1; var c = Audio.ctx;
    if (FANFARE[key] && canFanfare(c)) {
      var t0 = Math.max(c.currentTime + 0.03, Audio.jingleUntil || 0), r = fanfareTo(c, Audio.seGain, key, t0); if (!r) return -1;
      Audio.jingleUntil = t0 + r.len + 0.1; duck(t0, r.len + 0.3);
      setTimeout(function () { try { r.out.disconnect(); } catch (e) { } }, Math.round((t0 - c.currentTime + r.len + 3) * 1000));   // 鳴り終わったら外す
      return Math.round((t0 - c.currentTime) * 1000);
    }
    var j = JINGLES[key]; if (!j) return -1;
    var mel = parse(j.mel); var beat = 60 / j.bpm; var t = Audio.ctx.currentTime + 0.02; var total = 0;
    mel.forEach(function (n) { if (n[0] !== '-') tone(freq(n[0]), t + total * beat, n[1] * beat * 0.9, j.wave, Audio.seGain, 0.6); total += n[1]; });
    return 0;
  };
  function tone(f, start, dur, wave, dest, vol) {
    if (!f) return; var c = Audio.ctx; var o = c.createOscillator(), g = c.createGain(); o.type = wave; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(vol, start + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest); o.start(start); o.stop(start + dur + 0.02);
  }
  var SFX = {
    select: [[880, 0.04, 'square']], hit: [[200, 0.06, 'square'], [120, 0.1, 'sawtooth']], crit: [[300, 0.05, 'square'], [600, 0.05, 'square'], [150, 0.15, 'sawtooth']], hurt: [[150, 0.12, 'sawtooth']],
    magic: [[523, 0.06, 'sine'], [784, 0.06, 'sine'], [1046, 0.12, 'sine']], heal: [[659, 0.08, 'sine'], [880, 0.08, 'sine'], [1318, 0.16, 'sine']], die: [[220, 0.1, 'sawtooth'], [110, 0.25, 'sawtooth']],
    coin: [[1200, 0.05, 'square'], [1600, 0.08, 'square']], equip: [[600, 0.05, 'square'], [900, 0.08, 'square']], door: [[300, 0.08, 'triangle'], [200, 0.15, 'triangle']], step: [[400, 0.03, 'triangle']],
    win: [[523, 0.08, 'square'], [659, 0.08, 'square'], [784, 0.16, 'square']], chest: [[784, 0.06, 'square'], [1046, 0.12, 'square']],
    bossnear: [[98, 0.22, 'sawtooth'], [92, 0.3, 'sawtooth'], [73, 0.5, 'triangle']], bossroar: [[150, 0.07, 'sawtooth'], [118, 0.12, 'sawtooth'], [82, 0.42, 'sawtooth']]   // v6.5 ボスの気配・ボス戦の導入
  };
  Audio.sfx = function (key) {
    if (!Audio.ctx || !Audio.unlocked) return; var seq = SFX[key]; if (!seq) return; var t = Audio.ctx.currentTime;
    seq.forEach(function (n) { tone(n[0], t, n[1], n[2], Audio.seGain, 0.5); t += n[1]; });
  };

  root.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
