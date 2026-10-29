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
    victory: { bpm: 140, wave: 'square', mel: 'C5 1 C5 1 C5 1 C5 2 G4 2 A4 2 C5 2 - 1 A4 1 C5 4' },
    levelup: { bpm: 160, wave: 'square', mel: 'G4 1 B4 1 D5 1 G5 2 D5 1 G5 3' },
    inn: { bpm: 100, wave: 'triangle', mel: 'C5 1 E5 1 G5 1 C6 2 G5 1 E5 1 C5 2' },
    chest: { bpm: 180, wave: 'square', mel: 'C5 1 E5 1 G5 2' }
  };

  function parse(s) { var t = s.trim().split(/\s+/); var out = []; for (var i = 0; i < t.length; i += 2) out.push([t[i], parseFloat(t[i + 1])]); return out; }

  Audio.init = function () {
    document.addEventListener('pointerdown', Audio.unlock, { once: false });
    document.addEventListener('keydown', Audio.unlock, { once: false });
  };
  Audio.unlock = function () {
    try {
      if (!Audio.ctx) { Audio.ctx = new (root.AudioContext || root.webkitAudioContext)(); Audio.master = Audio.ctx.createGain(); Audio.master.connect(Audio.ctx.destination); Audio.bgmGain = Audio.ctx.createGain(); Audio.bgmGain.connect(Audio.master); Audio.seGain = Audio.ctx.createGain(); Audio.seGain.connect(Audio.master); }
      if (Audio.ctx.state === 'suspended') Audio.ctx.resume();
      Audio.unlocked = true; Audio.apply();
      if (Audio.pending) { var p = Audio.pending; Audio.pending = null; Audio.playBgm(p); }
    } catch (e) { /* 音なしで続行 */ }
  };
  Audio.settings = function () { return (root.State && root.State.data) ? root.State.data.settings : { mute: true, bgm: 0.5, se: 0.5 }; };
  Audio.apply = function () {
    if (!Audio.ctx) return; var s = Audio.settings();
    Audio.master.gain.value = s.mute ? 0 : 1; Audio.bgmGain.gain.value = s.bgm * 0.25; Audio.seGain.gain.value = s.se * 0.5;
    if (!s.mute && !Audio.current && Audio.pending) { var p = Audio.pending; Audio.pending = null; Audio.playBgm(p); }
  };

  Audio.stopBgm = function () { clearTimeout(Audio.timer); Audio.timer = null; Audio.current = null; };
  Audio.playBgm = function (key) {
    if (Audio.current === key) return;
    if (!Audio.ctx || !Audio.unlocked) { Audio.pending = key; return; }
    var tr = TRACKS[key]; if (!tr) { Audio.stopBgm(); return; }
    Audio.stopBgm(); Audio.current = key;
    var mel = parse(tr.mel), bass = parse(tr.bass); var beat = 60 / tr.bpm;
    function loop() {
      if (Audio.current !== key) return;
      var t = Audio.ctx.currentTime + 0.05; var total = 0;
      mel.forEach(function (n) { if (n[0] !== '-') tone(freq(n[0]), t + total * beat, n[1] * beat * 0.9, tr.wave, Audio.bgmGain, 0.5); total += n[1]; });
      var bt = 0; bass.forEach(function (n) { if (n[0] !== '-') tone(freq(n[0]), t + bt * beat, n[1] * beat * 0.95, 'triangle', Audio.bgmGain, 0.6); bt += n[1]; });
      Audio.timer = setTimeout(loop, total * beat * 1000 - 20);
    }
    loop();
  };
  Audio.playJingle = function (key) {
    if (!Audio.ctx || !Audio.unlocked) return; var j = JINGLES[key]; if (!j) return;
    var mel = parse(j.mel); var beat = 60 / j.bpm; var t = Audio.ctx.currentTime + 0.02; var total = 0;
    mel.forEach(function (n) { if (n[0] !== '-') tone(freq(n[0]), t + total * beat, n[1] * beat * 0.9, j.wave, Audio.seGain, 0.6); total += n[1]; });
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
    win: [[523, 0.08, 'square'], [659, 0.08, 'square'], [784, 0.16, 'square']], chest: [[784, 0.06, 'square'], [1046, 0.12, 'square']]
  };
  Audio.sfx = function (key) {
    if (!Audio.ctx || !Audio.unlocked) return; var seq = SFX[key]; if (!seq) return; var t = Audio.ctx.currentTime;
    seq.forEach(function (n) { tone(n[0], t, n[1], n[2], Audio.seGain, 0.5); t += n[1]; });
  };

  root.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
