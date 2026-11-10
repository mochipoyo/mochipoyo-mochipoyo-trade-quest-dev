// v9.3 勝利・レベルアップのファンファーレの確かめ（ヘッドレス Chromium。実機ではない。耳では聞いていない）
//   A 書き出し：OfflineAudioContext で勝利・レベルアップを書き出し、長さ・一番大きいところ・音割れ（±1 を超える）・大きさ（RMS）を測る。今までの音（矩形波）も同じ作りで書き出して比べる
//     KIND=2d VIEW=pc のときだけ、聞いて確かめる用の音（docs/rpg93/audio/*.mp3）と波形・周波数の図を書き出す
//   B 実際の戦闘（自動戦闘・とてもはやい）：勝つと 戦闘の BGM が止まる → 勝利のファンファーレ → （レベルアップがあれば）勝利が終わってからレベルアップ（重ならない）
//     → 「LEVEL UP!」が鳴り始めに合わせて光る → 効果音の出口で音が出ている → ［次へ］で戦闘を終えると場所の BGM に戻る
//   自動再生の許可は付けない（最初の 1 回は実際のクリック／タップ）
//   KIND=2d|3d  VIEW=pc|m390  PORT=…  OUT=…
const { chromium } = require('playwright'); const fs = require('fs'); const { execFileSync } = require('child_process');
const PORT = process.env.PORT || 8850; const KIND = process.env.KIND || '2d'; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/rpg93/';
const URL = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html') + '?nosw';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
function wav(path, sr, ch, b64) { const pcm = Buffer.from(b64, 'base64'); const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * ch * 2, 28); h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40); fs.writeFileSync(path, Buffer.concat([h, pcm])); }
(async () => {
  const br = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const ctx = await br.newContext(VIEW === 'pc' ? { viewport: { width: 1280, height: 720 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto(URL); if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });

  // ---- A 書き出し
  const R = await p.evaluate(async () => {
    const SR = 48000, out = {};
    const meas = (buf, lenSec) => { const L = buf.getChannelData(0), Rr = buf.getChannelData(1); let peak = 0, clip = 0, ss = 0, first = -1, last = 0, win = Math.floor(SR * 0.4), best = 0, acc = 0; const sq = new Float64Array(L.length);
      for (let i = 0; i < L.length; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(Rr[i])); if (a > peak) peak = a; if (a >= 1) clip++; const s2 = (L[i] * L[i] + Rr[i] * Rr[i]) / 2; ss += s2; sq[i] = s2; if (a > 0.01 && first < 0) first = i; if (a > 0.003) last = i; }
      for (let i = 0; i < L.length; i++) { acc += sq[i]; if (i >= win) acc -= sq[i - win]; if (acc > best) best = acc; }
      return { len: +(lenSec || 0).toFixed(2), start: +(first / SR).toFixed(3), audibleEnd: +(last / SR).toFixed(2), peak: +peak.toFixed(3), clip, rms: +Math.sqrt(ss / L.length).toFixed(4), loudest400ms: +Math.sqrt(best / win).toFixed(4) }; };
    const pcm = (buf) => { const L = buf.getChannelData(0), Rr = buf.getChannelData(1), a = new Int16Array(L.length * 2); for (let i = 0; i < L.length; i++) { a[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; a[2 * i + 1] = Math.max(-1, Math.min(1, Rr[i])) * 32767; } const u = new Uint8Array(a.buffer); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    for (const key of Audio.fanfareKeys()) {
      const oc = new OfflineAudioContext(2, SR * 4.5, SR); const r = Audio.fanfareTo(oc, oc.destination, key, 0.05); const buf = await oc.startRendering();
      out[key] = Object.assign(meas(buf, r && r.len), { pcm: pcm(buf) });
    }
    // 今までの音（Audio.playJingle の矩形波の作りを同じように書き出す：音量 0.6・各音の長さ 0.9 拍）
    const OLD = { victory: { bpm: 140, mel: 'C5 1 C5 1 C5 1 C5 2 G4 2 A4 2 C5 2 - 1 A4 1 C5 4' }, levelup: { bpm: 160, mel: 'G4 1 B4 1 D5 1 G5 2 D5 1 G5 3' } };
    const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }; const fq = (n) => { const m = n.match(/^([A-G]#?)(\d)$/); return m ? 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] - 4) * 12 - 9) / 12) : 0; };
    for (const key of Object.keys(OLD)) {
      const j = OLD[key], oc = new OfflineAudioContext(2, SR * 6.5, SR), beat = 60 / j.bpm, t0 = 0.05; let tot = 0; const tk = j.mel.split(/\s+/);
      for (let i = 0; i < tk.length; i += 2) { const n = tk[i], d = +tk[i + 1]; const f = fq(n); if (f) { const st = t0 + tot * beat, du = d * beat * 0.9, o = oc.createOscillator(), g = oc.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(0.6, st + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, st + du); o.connect(g); g.connect(oc.destination); o.start(st); o.stop(st + du + 0.02); } tot += d; }
      const buf = await oc.startRendering(); out['old_' + key] = Object.assign(meas(buf, tot * beat), { pcm: pcm(buf) });
    }
    return out;
  });
  const show = (k) => { const x = Object.assign({}, R[k]); delete x.pcm; return JSON.stringify(x); };
  for (const k of ['victory', 'levelup']) {
    const n = R[k], o = R['old_' + k];
    S(n && n.len >= 1.5 && n.len <= 2.5 && n.audibleEnd <= 3.6, (k === 'victory' ? '勝利' : 'レベルアップ') + 'のファンファーレの長さ ' + n.len + ' 秒（余韻まで ' + n.audibleEnd + ' 秒）。今までは ' + o.len + ' 秒（' + o.audibleEnd + ' 秒）');
    S(n.clip === 0 && n.peak < 0.98 && n.peak > 0.2, (k === 'victory' ? '勝利' : 'レベルアップ') + '：音割れなし（一番大きいところ ' + n.peak + '・±1 を超えた数 ' + n.clip + '）');
    S(n.loudest400ms > o.loudest400ms * 0.35 && n.loudest400ms < o.loudest400ms * 1.2, (k === 'victory' ? '勝利' : 'レベルアップ') + '：大きさ（一番大きい 0.4 秒の RMS）は今までの音と近い（新 ' + n.loudest400ms + '・今まで ' + o.loudest400ms + '。新しい方が大きすぎない）');
    console.log('    ' + k + ' ' + show(k) + ' / old ' + show('old_' + k));
  }
  if (KIND === '2d' && VIEW === 'pc') {   // 聞いて確かめる用の音（mp3）と図（作業用）
    const AD = OUT + 'audio/'; fs.mkdirSync(AD, { recursive: true }); const SP = process.env.SP || '/tmp';
    for (const k of ['victory', 'levelup', 'old_victory', 'old_levelup']) {
      const w = `${SP}/fanfare93_${k}.wav`; wav(w, 48000, 2, R[k].pcm);
      try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', w, '-codec:a', 'libmp3lame', '-b:a', '128k', `${AD}fanfare93_${k}.mp3`]); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', w, '-lavfi', 'showspectrumpic=s=900x360:legend=1:scale=log,format=rgb24', `${SP}/fanfare93_${k}_spec.png`]); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', w, '-lavfi', 'showwavespic=s=900x200:split_channels=1', `${SP}/fanfare93_${k}_wave.png`]); } catch (e) { console.log('    ffmpeg: ' + String(e.message).slice(0, 120)); }
    }
  }

  // ---- B 実際の戦闘
  const tap = async (h) => { const b = await h.boundingBox(); if (VIEW === 'pc') await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); else await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(250); };
  await tap(await p.$('#ui .title-menu .rw-title'));   // 最初の操作（音の許可）
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = false; d.settings.bgm = 0.5; d.settings.se = 0.5; d.settings.soundAsk93 = true; World.start(); });
  if (KIND === '3d') await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 });
  await p.waitForFunction(() => window.World && World.map, null, { timeout: 120000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; Audio.unlock(); Audio.apply(); Audio.playBgm(World.map.def.bgm || 'field'); });
  await p.waitForFunction(() => { const st = Audio.bgmState(); return st.playing && st.t > 1; }, null, { timeout: 90000, polling: 500 }).catch(() => { });
  const before = await p.evaluate(() => Audio.bgmState()); S(before.playing, '戦闘の前：場所の曲が鳴っている（' + before.cur + '）');
  // 記録：ジングル・BGM の停止・効果音の出口の音の大きさ
  await p.evaluate(() => {
    window.__fx = { j: [], stop: [], lv: [] }; const pj = Audio.playJingle, sb = Audio.stopBgm;
    Audio.playJingle = function (k) { const r = pj.apply(Audio, arguments); __fx.j.push({ k, ret: r, at: performance.now(), ct: Audio.ctx.currentTime, until: Audio.jingleUntil, cur: Audio.bgmState().cur, current: Audio.current }); return r; };
    Audio.stopBgm = function () { __fx.stop.push({ at: performance.now(), cur: Audio.bgmState().cur }); return sb.apply(Audio, arguments); };
    const an = Audio.ctx.createAnalyser(); an.fftSize = 2048; Audio.seGain.connect(an); const a = new Float32Array(an.fftSize);
    setInterval(() => { an.getFloatTimeDomainData(a); let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; __fx.lv.push({ at: performance.now(), rms: Math.sqrt(s / a.length) }); }, 50);
    new MutationObserver(() => { const g = document.querySelector('#ui .rs-levelup.rs-lv-go'); if (g && !__fx.glow) __fx.glow = performance.now(); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
  });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; }); await p.waitForTimeout(500);
  const en = await p.evaluate(() => Object.keys(ENEMIES).filter((id) => !ENEMIES[id].boss && !/flee/.test(JSON.stringify(ENEMIES[id]))).sort((a, b) => ENEMIES[a].hp - ENEMIES[b].hp)[0]);
  await p.evaluate((id) => { const d = State.data; d.settings.autoBattle = true; d.settings.battleSpeed = 'veryfast'; [d.hero].concat(Object.values(d.companions || {})).forEach((a) => { if (a && a.level) a.exp = Actors.expForLevel(a.level) - 1; }); window.__bt = BattleUI.start([id], {}).then((r) => { window.__btRes = r; }); }, en);
  await p.waitForFunction(() => BattleUI.battle && BattleUI.battle.enemies, null, { timeout: 60000 }); await p.evaluate(() => { BattleUI.battle.enemies.forEach((e) => { e.hp = 1; }); });
  // 戦闘の様子を 5 秒ごとに記録（止まったときに原因を調べるため）
  for (let i = 0; i < 24; i++) { const dbg = await p.evaluate(() => ({ st: BattleUI.battle && BattleUI.battle.state, turn: BattleUI.battle && BattleUI.battle.turn, en: BattleUI.battle && BattleUI.battle.enemies.map((e) => e.hp), scenes: Engine.scenes.length, ui: [...document.querySelectorAll('#ui > *')].map((n) => n.className + ':' + n.textContent.slice(0, 40)).join(' / '), cur: Audio.bgmState().cur, j: __fx.j.length })); console.log('    戦闘 ' + (i * 5) + '秒 ' + JSON.stringify(dbg)); if (dbg.j) break; await p.waitForTimeout(5000); }
  await p.waitForSelector('#ui .result-victory', { timeout: 60000 }).catch(() => { });
  await p.waitForTimeout(4500); await p.screenshot({ path: `${OUT}shots/fanfare93_${KIND}_${VIEW}_result.jpg`, type: 'jpeg', quality: 72 });
  const fx = await p.evaluate(() => { const v = __fx.j.find((x) => x.k === 'victory'), l = __fx.j.find((x) => x.k === 'levelup'); const lvOf = (a, b) => Math.max(0, ...__fx.lv.filter((x) => x.at >= a && x.at <= b).map((x) => x.rms)); const st = __fx.stop.filter((x) => v && x.at <= v.at + 5).pop();
    return { v, l, stopBefore: st || null, glow: __fx.glow ? Math.round(__fx.glow - (l ? l.at : 0)) : null, vLevel: v ? +lvOf(v.at, v.at + 2000).toFixed(4) : 0, lLevel: l ? +lvOf(l.at + l.ret, l.at + l.ret + 2000).toFixed(4) : 0, quietBefore: v ? +lvOf(v.at - 3000, v.at - 1500).toFixed(4) : 0 }; });
  const v = fx.v, l = fx.l; console.log('    ' + JSON.stringify(fx));
  S(v && fx.stopBefore && !v.cur && v.current === null, '勝つと戦闘の BGM を止めてから勝利のファンファーレ（止める前の曲 ' + (fx.stopBefore && fx.stopBefore.cur) + '）');
  S(v && v.ret >= 0 && v.ret < 100 && fx.vLevel > 0.005, '勝利のファンファーレがすぐ鳴り、効果音の出口で音が出ている（鳴り始めまで ' + (v && v.ret) + 'ms・大きさ ' + fx.vLevel + '）');
  const vEnd = v ? (v.until - v.ct) * 1000 : 0; const lStartFromV = l ? (l.at - v.at) + l.ret : 0;
  S(l && lStartFromV >= vEnd - 30, 'レベルアップのファンファーレは勝利が終わってから鳴る（勝利の終わり ' + Math.round(vEnd) + 'ms・レベルアップの鳴り始め ' + Math.round(lStartFromV) + 'ms。重ならない）');
  S(l && fx.lLevel > 0.005, 'レベルアップのファンファーレで音が出ている（大きさ ' + fx.lLevel + '）');
  S(l && fx.glow !== null && fx.glow >= l.ret - 60 && fx.glow <= l.ret + 400, '「LEVEL UP!」がレベルアップの鳴り始めに合わせて光る（鳴り始め ' + (l && l.ret) + 'ms・光った ' + fx.glow + 'ms）');
  // ［次へ］で戦闘を終える → 場所の曲に戻る
  for (let i = 0; i < 6 && await p.evaluate(() => !window.__btRes); i++) { const nx = await p.$('#ui .rw-panel-close'); if (nx) await tap(nx); else await p.keyboard.press('Enter'); await p.waitForTimeout(700); }
  await p.waitForFunction(() => { const st = Audio.bgmState(); return st.playing && st.t > 0.5; }, null, { timeout: 90000, polling: 500 }).catch(() => { });
  const after = await p.evaluate(async () => { Audio.bgmLevel(); await new Promise((r) => setTimeout(r, 400)); return Object.assign({ res: window.__btRes, level: +Audio.bgmLevel().toFixed(4) }, Audio.bgmState()); });
  S(after.res === 'won' && after.playing && after.level > 0.0005, '［次へ］で戦闘を終えると場所の曲に戻る（' + after.cur + '・' + after.t + '秒・大きさ ' + after.level + '）');
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length; fs.mkdirSync(OUT + 'logs', { recursive: true });
  fs.writeFileSync(`${OUT}logs/fanfare93_${KIND}_${VIEW}.json`, JSON.stringify({ KIND, VIEW, ok: steps.length - ng, ng, steps }, null, 1));
  console.log(`結果 ${KIND} ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(2); });
