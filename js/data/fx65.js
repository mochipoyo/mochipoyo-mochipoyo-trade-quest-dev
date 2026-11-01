/* =========================================================
   Data / FX65（v6.5 Phase C）：全呪文・全特技の演出データと、2D・3D 共通の演出タイムライン
   ・FX65.DEFS[スキルID] = { fx: 演出の種類, motion: 使う人の動き, color, color2, area: 'single'|'all', unique: 固有の演出か, hits }
     → 全スキル（既存・追加分すべて）に登録。決まり（種類・属性・対象・武器）で作ったうえで、主な技は固有の演出で上書き
   ・FX65.timeline(def, opts) = { windup, hitAt, impacts[], total }（ミリ秒）。2D の描画（js/ui/fx2d.js）も、
     3D の描画（Phase D で接続）も、この同じ時刻表で「命中の瞬間」をそろえる。数字と HP の変化は impacts の時刻に出す
   ・演出の種類が描けない・読み込めない場合も、時刻表だけは返す（戦闘は止まらない）
   ・通常攻撃：武器の種類（剣・短剣・槍・斧・弓・杖・こん棒・爪・素手）で動きと演出を変える
   ・敵の行動：特殊行動のデータ（攻撃・状態異常・強化・回復）と、敵の種族から演出を選ぶ
   ========================================================= */
(function (root) {
  'use strict';
  var FX = { DEFS: {}, KINDS: {}, listeners: [] };

  /* ---------- 演出の種類ごとの長さ（普通の速さ・ミリ秒）。hit＝命中の瞬間、travel＝飛んでいく時間 ---------- */
  var K = FX.KINDS;
  function kind(name, dur, hit, o) { K[name] = Object.assign({ dur: dur, hit: hit }, o || {}); }
  // 物理
  kind('slash', 520, 250); kind('slash_multi', 620, 230, { gap: 120 }); kind('pierce', 520, 270); kind('heavy', 640, 340); kind('arrow', 620, 380, { travel: true });
  kind('arrow_rain', 760, 420, { travel: true }); kind('claws', 560, 240, { gap: 90 }); kind('fist', 560, 200, { gap: 80 }); kind('spin', 640, 300); kind('shield_hit', 520, 260);
  kind('throw', 600, 340, { travel: true }); kind('coins', 760, 420, { travel: true }); kind('shadow_dash', 560, 260); kind('gear_shot', 600, 330, { travel: true, gap: 110 });
  // 攻撃呪文
  kind('fireball', 700, 430, { travel: true }); kind('fire_lance', 680, 400, { travel: true }); kind('explosion', 820, 460); kind('pale_flame', 820, 460);
  kind('icicle', 640, 380, { travel: true }); kind('blizzard', 860, 480); kind('icicle_rain', 860, 500); kind('whirlpool', 860, 480);
  kind('bolt', 560, 300); kind('discharge', 760, 420); kind('wind_blade', 640, 360, { travel: true }); kind('tornado', 860, 480);
  kind('holy_beam', 640, 360); kind('holy_burst', 800, 440); kind('aurora', 900, 500); kind('dark_orb', 680, 400, { travel: true }); kind('dark_mist', 820, 460); kind('void_bolt', 640, 340);
  kind('clock', 900, 480); kind('time_stop', 900, 500); kind('rewind', 900, 500); kind('meteor', 980, 600); kind('stardust', 900, 520); kind('arcane', 700, 400);
  // 回復・補助・弱体
  kind('heal_glow', 700, 380); kind('heal_rain', 900, 480); kind('revive_pillar', 1000, 560); kind('purify', 760, 400); kind('mana', 700, 380);
  kind('barrier', 700, 360); kind('weapon_glow', 640, 340); kind('haste', 640, 340); kind('aura', 700, 360); kind('regen', 700, 380);
  kind('debuff_aura', 700, 380); kind('sleep_mist', 760, 420); kind('poison_mist', 760, 420); kind('confuse_stars', 700, 380); kind('seal', 700, 380);
  kind('scan', 700, 380); kind('smoke', 600, 300); kind('cover', 600, 300); kind('counter_stance', 600, 300); kind('steal', 560, 280);
  // トレード（チャートを使った演出）
  kind('candles', 760, 420); kind('ema_line', 760, 400, { gap: 110 }); kind('wave', 820, 440); kind('rci', 780, 420); kind('macd', 820, 440, { gap: 140 });
  kind('trend_break', 860, 480); kind('resistance_break', 760, 420); kind('chart_eye', 760, 400); kind('ledger', 760, 420); kind('risk_shield', 760, 400);

  var COL = { fire: ['#ff6a2a', '#ffd24a'], ice: ['#9fe0ff', '#ffffff'], thunder: ['#ffe24a', '#ffffff'], wind: ['#7fe3a5', '#d8fff0'], light: ['#fff6c8', '#ffd24a'], dark: ['#8a4ad0', '#2a0a3a'], none: ['#ffffff', '#ffd24a'] };

  /* ---------- 決まりで作る ---------- */
  function byRule(s) {
    var el = s.element && s.element !== 'none' ? s.element : null; var all = s.target === 'enemies' || s.target === 'allies';
    var c = COL[el || 'none']; var d = { fx: 'slash', motion: 'swing', color: c[0], color2: c[1], area: all ? 'all' : 'single', hits: s.hits || 1 };
    if (s.kind === 'attack') {
      if (s.anim === 'arrow') { d.fx = all ? 'arrow_rain' : 'arrow'; d.motion = 'shoot'; }
      else if (s.anim === 'hit') { d.fx = (s.hits || 1) > 2 ? 'fist' : 'heavy'; d.motion = (s.hits || 1) > 2 ? 'punch' : 'chop'; }
      else if (el === 'fire' || el === 'ice' || el === 'thunder') { d.fx = 'slash'; d.motion = 'swing'; d.overlay = el; }
      else if (el === 'wind') { d.fx = all ? 'tornado' : 'wind_blade'; d.motion = 'swing'; }
      else if (el === 'light') { d.fx = 'slash'; d.overlay = 'light'; }
      else if (el === 'dark') { d.fx = 'shadow_dash'; d.motion = 'dash'; }
      else { d.fx = all ? 'spin' : ((s.hits || 1) > 1 ? 'slash_multi' : 'slash'); d.motion = 'swing'; }
      if (s.pierce) d.fx = 'pierce';
    } else if (s.kind === 'magic') {
      d.motion = 'cast';
      d.fx = { fire: all ? 'explosion' : 'fireball', ice: all ? 'blizzard' : 'icicle', thunder: all ? 'discharge' : 'bolt', wind: all ? 'tornado' : 'wind_blade', light: all ? 'holy_burst' : 'holy_beam', dark: all ? 'dark_mist' : 'dark_orb' }[el] || (all ? 'stardust' : 'arcane');
    } else if (s.kind === 'heal') { d.motion = 'pray'; d.fx = all ? 'heal_rain' : 'heal_glow'; d.color = '#7fe3a5'; d.color2 = '#ffe9a0'; }
    else if (s.kind === 'revive') { d.motion = 'pray'; d.fx = 'revive_pillar'; d.color = '#fff6c8'; d.color2 = '#ffd24a'; }
    else if (s.kind === 'cure') { d.motion = 'pray'; d.fx = 'purify'; d.color = '#c8f4ff'; d.color2 = '#ffffff'; }
    else if (s.kind === 'mp_heal') { d.motion = 'pray'; d.fx = 'mana'; d.color = '#6fb0ff'; d.color2 = '#c8e4ff'; }
    else if (s.kind === 'buff') {
      d.motion = 'pray'; var b = s.buff || {}; var keys = Object.keys(b);
      d.fx = (b.def || b.mdef || b.guard) ? 'barrier' : b.atk ? 'weapon_glow' : (b.agi || b.evade) ? 'haste' : s.regen ? 'regen' : 'aura';
      d.color = d.fx === 'barrier' ? '#9fd0ff' : d.fx === 'weapon_glow' ? '#ff9a4a' : d.fx === 'haste' ? '#7fe3a5' : '#ffd24a'; d.color2 = '#ffffff';
      if (!keys.length && (s.cover || s.counter)) d.fx = s.cover ? 'cover' : 'counter_stance';
    } else if (s.kind === 'debuff') { d.motion = 'cast'; d.fx = 'debuff_aura'; d.color = '#8a4ad0'; d.color2 = '#2a0a3a'; }
    else if (s.kind === 'status') { d.motion = 'cast'; var st = (s.status && s.status.id) || ''; d.fx = st === 'sleep' ? 'sleep_mist' : st === 'poison' ? 'poison_mist' : st === 'confuse' ? 'confuse_stars' : st === 'silence' ? 'seal' : 'debuff_aura'; d.color = '#a07ad0'; d.color2 = '#e0c8ff'; }
    else if (s.kind === 'special') {
      d.motion = 'cast'; d.fx = s.steal ? 'steal' : s.escape || s.escapeBonus ? 'smoke' : s.scan || s.expose ? 'scan' : s.gold ? 'coins' : s.cover ? 'cover' : s.counter ? 'counter_stance' : s.dispel ? 'purify' : 'aura';
      if (s.gold) d.motion = 'throw'; d.color = '#ffd24a'; d.color2 = '#ffffff';
    } else if (s.kind === 'field') { d.motion = 'pray'; d.fx = 'revive_pillar'; d.color = '#9fd0ff'; d.color2 = '#ffffff'; }
    return d;
  }

  /* ---------- 主な技の固有の演出（決まりで作ったものを上書き） ---------- */
  var U = {
    // トレードの技：ローソク足・EMA・波形・RCI・MACD をそのまま見せる
    dow_blade: { fx: 'wave', motion: 'swing', color: '#7fd0ff', color2: '#ffffff' }, ema_slash: { fx: 'ema_line', motion: 'swing', color: '#ffd24a', color2: '#ff6a8a', hits: 3 },
    wave_slash: { fx: 'wave', motion: 'swing', color: '#7fe3a5', color2: '#d8fff0', area: 'all' }, rci_reversal: { fx: 'rci', motion: 'chop', color: '#ff8a5a', color2: '#7fd0ff' },
    macd_strike: { fx: 'macd', motion: 'cast', color: '#7fd0ff', color2: '#ff6a8a' }, hidden_burst: { fx: 'candles', motion: 'swing', color: '#4ad08a', color2: '#e05a5a' },
    rci_counter: { fx: 'rci', motion: 'cast', color: '#8a4ad0', color2: '#ff8a5a' }, ema_blessing: { fx: 'ema_line', motion: 'pray', color: '#ffd24a', color2: '#7fe3a5', area: 'all' },
    higher_tf_eye: { fx: 'chart_eye', motion: 'cast', color: '#7fd0ff', color2: '#ffffff' }, dow_eye: { fx: 'chart_eye', motion: 'cast', color: '#ffd24a', color2: '#ffffff' },
    dow_break: { fx: 'wave', motion: 'chop', color: '#e05a5a', color2: '#ffffff' }, macd_hidden_strike: { fx: 'macd', motion: 'swing', color: '#ffd24a', color2: '#7fd0ff' },
    trend_breakthrough: { fx: 'trend_break', motion: 'dash', color: '#4ad08a', color2: '#ffffff' }, resistance_crush: { fx: 'resistance_break', motion: 'chop', color: '#e05a5a', color2: '#ffd24a' },
    rising_triple: { fx: 'candles', motion: 'swing', color: '#4ad08a', color2: '#ffffff', hits: 3 }, spread_tear: { fx: 'candles', motion: 'claw', color: '#e05a5a', color2: '#ffffff' },
    stop_ambush: { fx: 'shadow_dash', motion: 'dash', color: '#8a4ad0', color2: '#ffd24a' }, range_snipe: { fx: 'arrow', motion: 'shoot', color: '#7fd0ff', color2: '#ffffff', band: true },
    lowcut_arrow: { fx: 'arrow', motion: 'shoot', color: '#e05a5a', color2: '#ffffff', band: true }, profit_lock: { fx: 'coins', motion: 'chop', color: '#ffd24a', color2: '#ffffff' },
    pullback_flash: { fx: 'trend_break', motion: 'dash', color: '#7fd0ff', color2: '#ffffff' }, retrace_blade: { fx: 'wave', motion: 'swing', color: '#7fe3a5', color2: '#e05a5a' },
    macd_cross: { fx: 'macd', motion: 'swing', color: '#ffd24a', color2: '#7fd0ff', hits: 2 }, triple_wave_finale: { fx: 'wave', motion: 'swing', color: '#ffd24a', color2: '#ff6a8a', big: true },
    instant_reversal: { fx: 'rci', motion: 'guard', color: '#7fd0ff', color2: '#ffffff' }, fakeout_read: { fx: 'chart_eye', motion: 'guard', color: '#c8a0ff', color2: '#ffffff' },
    ev_appraise: { fx: 'ledger', motion: 'cast', color: '#ffd24a', color2: '#ffffff' }, fund_allocation: { fx: 'coins', motion: 'pray', color: '#ffd24a', color2: '#7fe3a5', area: 'all' },
    diversify_formation: { fx: 'risk_shield', motion: 'pray', color: '#7fd0ff', color2: '#ffd24a', area: 'all' }, loss_limit_ward: { fx: 'risk_shield', motion: 'pray', color: '#e05a5a', color2: '#ffffff', area: 'all' },
    stoploss_shield: { fx: 'risk_shield', motion: 'pray', color: '#e05a5a', color2: '#ffd24a' }, risk_barrier: { fx: 'risk_shield', motion: 'pray', color: '#7fd0ff', color2: '#ffffff', area: 'all' },
    patience_stance: { fx: 'counter_stance', motion: 'guard', color: '#7fd0ff', color2: '#ffffff' }, ledger_bolt: { fx: 'ledger', motion: 'cast', color: '#fff6c8', color2: '#ffd24a' },
    final_ledger: { fx: 'ledger', motion: 'cast', color: '#ffd24a', color2: '#ffffff', area: 'all', big: true }, audit_eye: { fx: 'chart_eye', motion: 'cast', color: '#ffd24a', color2: '#ffffff' },
    full_audit: { fx: 'ledger', motion: 'cast', color: '#7fd0ff', color2: '#ffffff', area: 'all' }, contract_break: { fx: 'seal', motion: 'cast', color: '#e05a5a', color2: '#ffd24a', area: 'all' },
    // 炎
    fireball: { fx: 'fireball' }, flame_lance: { fx: 'fire_lance', color: '#ff8a2a', color2: '#ffffff' }, firestorm: { fx: 'explosion' }, pale_flame: { fx: 'pale_flame', color: '#9fd0ff', color2: '#ffffff' },
    meteor: { fx: 'meteor', color: '#ff6a2a', color2: '#ffd24a' }, celestial_impact: { fx: 'meteor', color: '#c8a0ff', color2: '#ffffff', big: true }, flame_blade: { fx: 'slash', overlay: 'fire', motion: 'swing' },
    // 氷・水
    ice: { fx: 'icicle' }, blizzard: { fx: 'blizzard' }, freezing_rain: { fx: 'icicle_rain' }, maelstrom: { fx: 'whirlpool', color: '#5ab0ff', color2: '#e0f4ff' }, tide_slash: { fx: 'wave', motion: 'swing', color: '#5ab0ff', color2: '#ffffff' },
    // 雷・風
    thunder: { fx: 'bolt' }, thunder_array: { fx: 'discharge', big: true }, overdrive: { fx: 'discharge', color: '#ffb02a', color2: '#ffffff' }, wind_blade: { fx: 'wind_blade', area: 'all' }, gale_fault: { fx: 'tornado', big: true },
    storm_arrow: { fx: 'arrow_rain', overlay: 'wind' },
    // 光・闇・時間・星
    holy_light: { fx: 'holy_beam' }, aurora: { fx: 'aurora', color: '#a0ffd8', color2: '#c8a0ff' }, chrono_burst: { fx: 'clock', color: '#ffd24a', color2: '#9fd0ff', area: 'all' },
    time_stop: { fx: 'time_stop', color: '#9fd0ff', color2: '#ffffff' }, time_rewind: { fx: 'rewind', motion: 'pray', color: '#ffd24a', color2: '#9fd0ff' }, delay: { fx: 'clock', color: '#8a7ab0', color2: '#ffd24a' },
    slow_mist: { fx: 'clock', color: '#8a7ab0', color2: '#c8c8ff', area: 'all' }, foresight: { fx: 'clock', motion: 'pray', color: '#9fd0ff', color2: '#ffffff' }, time_blessing: { fx: 'clock', motion: 'pray', color: '#ffd24a', color2: '#ffffff', area: 'all' },
    future_shield: { fx: 'barrier', color: '#9fd0ff', color2: '#ffd24a' }, imaginary_bolt: { fx: 'void_bolt', color: '#c8a0ff', color2: '#2a0a3a' }, dark_bolt: { fx: 'dark_orb' },
    stardust_rain: { fx: 'stardust', color: '#ffe08a', color2: '#ffffff' }, star_clock_reboot: { fx: 'clock', motion: 'pray', color: '#ffe08a', color2: '#ffffff', area: 'all', big: true },
    // 回復・蘇生
    heal: { fx: 'heal_glow' }, big_heal: { fx: 'heal_glow', big: true }, heal_all: { fx: 'heal_rain' }, drop_heal: { fx: 'heal_glow', color: '#7fd0ff' }, torrent_heal: { fx: 'heal_glow', color: '#5ab0ff', big: true },
    gentle_rain: { fx: 'heal_rain', color: '#7fd0ff' }, great_rain: { fx: 'heal_rain', color: '#5ab0ff', big: true }, healing_wind: { fx: 'heal_rain', color: '#7fe3a5', wind: true },
    revive: { fx: 'revive_pillar' }, life_lamp: { fx: 'revive_pillar', color: '#ffb05a' }, rebirth_prayer: { fx: 'revive_pillar', big: true }, soul_return: { fx: 'revive_pillar', color: '#c8a0ff', big: true }, spirit_rebirth: { fx: 'revive_pillar', color: '#7fe3a5' },
    purify_ring: { fx: 'purify', area: 'all' }, mana_cycle: { fx: 'mana' }, calm_light: { fx: 'purify', color: '#fff6c8' },
    // 守り・強化
    iron_wall: { fx: 'barrier', color: '#c0c8d8' }, magic_barrier: { fx: 'barrier', color: '#c8a0ff' }, haste: { fx: 'haste' }, war_cry: { fx: 'weapon_glow', motion: 'shout' }, protect: { fx: 'barrier', color: '#fff6c8' },
    oath_wall: { fx: 'barrier', color: '#ffd24a' }, oath_bastion: { fx: 'barrier', color: '#ffd24a', big: true }, discipline_wall: { fx: 'barrier', color: '#7fd0ff', big: true },
    // 物理の固有
    hundred_fists: { fx: 'fist', motion: 'punch', hits: 5 }, wave_combo: { fx: 'fist', motion: 'punch', color: '#7fd0ff', hits: 4 }, rush: { fx: 'pierce', motion: 'thrust', hits: 3 },
    spin_slash: { fx: 'spin' }, shield_bash: { fx: 'shield_hit', motion: 'bash' }, shadow_step: { fx: 'shadow_dash', motion: 'dash' }, gold_rush: { fx: 'coins', motion: 'throw', area: 'all' }, coin_toss: { fx: 'coins', motion: 'throw' },
    gear_barrage: { fx: 'gear_shot', motion: 'shoot', hits: 3 }, gear_shot: { fx: 'gear_shot', motion: 'shoot' }, meteor_arrows: { fx: 'arrow_rain', motion: 'shoot', color: '#ff8a2a', big: true },
    masterwork: { fx: 'heavy', motion: 'chop', big: true }, iron_hammer: { fx: 'heavy', motion: 'chop' }, gear_crush: { fx: 'heavy', motion: 'chop', color: '#c0c8d8' }
  };

  function build() {
    var S = root.SKILLS || {};
    Object.keys(S).forEach(function (id) {
      var s = S[id]; var d = byRule(s); var u = U[id];
      if (u) { Object.keys(u).forEach(function (k) { d[k] = u[k]; }); d.unique = true; }
      if (u && u.fx && s.kind === 'magic' && !u.motion) d.motion = 'cast';
      if (!K[d.fx]) d.fx = 'slash';   // 念のため（描ける種類だけ）
      d.id = id; FX.DEFS[id] = d;
    });
  }
  build(); FX.rebuild = build;

  // 通常攻撃（武器の種類で変える）
  var WEAPON = { sword: ['swing', 'slash'], dagger: ['swing', 'slash'], spear: ['thrust', 'pierce'], axe: ['chop', 'heavy'], club: ['chop', 'heavy'], staff: ['swing', 'heavy'], bow: ['shoot', 'arrow'], claw: ['claw', 'claws'], none: ['punch', 'fist'] };
  FX.attack = function (actor) {
    var it = actor && actor.equip && actor.equip.weapon && root.ITEMS && root.ITEMS[actor.equip.weapon]; var t = it ? it.type : 'none'; var w = WEAPON[t] || WEAPON.none;
    return { id: 'attack:' + t, fx: w[1], motion: w[0], color: '#ffffff', color2: '#ffd24a', area: 'single', hits: 1, weapon: t };
  };
  // 敵の行動
  var FAMILY_FX = { '獣系': 'claws', '鳥系': 'claws', '虫系': 'claws', '爬虫類系': 'claws', '竜系': 'claws', '両生類系': 'heavy', '水棲系': 'heavy', 'ゴーレム系': 'heavy', '機械系': 'heavy', '人形系': 'slash', '人間系': 'slash' };
  FX.enemy = function (e, act) {
    var def = (root.ENEMIES || {})[e && e.defId] || {}; var fam = def.family || '';
    if (act && act.skillId && FX.DEFS[act.skillId]) return Object.assign({}, FX.DEFS[act.skillId], { enemy: true });
    var sp = act && act.special && root.ENEMY_SPECIALS ? root.ENEMY_SPECIALS[act.special] : null;
    if (sp) {
      if (sp.heal) return { fx: 'heal_glow', motion: 'cast', color: '#7fe3a5', color2: '#ffffff', area: 'single', enemy: true };
      if (sp.buff && sp.self) return { fx: sp.buff.def ? 'barrier' : 'weapon_glow', motion: 'shout', color: '#ff8a5a', color2: '#ffffff', area: 'single', enemy: true };
      if (sp.call) return { fx: 'aura', motion: 'shout', color: '#ffd24a', color2: '#ffffff', area: 'single', enemy: true };
      if (sp.power) return { fx: sp.all ? 'spin' : (sp.hits || 1) > 1 ? 'claws' : 'heavy', motion: 'lunge', color: sp.status ? '#a07ad0' : '#ffffff', color2: '#ff6a6a', area: sp.all ? 'all' : 'single', hits: sp.hits || 1, enemy: true };
      if (sp.status || sp.debuff) { var st = sp.status && sp.status.id; return { fx: st === 'sleep' ? 'sleep_mist' : st === 'poison' ? 'poison_mist' : st === 'confuse' ? 'confuse_stars' : st === 'silence' ? 'seal' : st === 'paralyze' ? 'discharge' : 'debuff_aura', motion: 'cast', color: '#a07ad0', color2: '#e0c8ff', area: sp.target === 'allies' ? 'all' : 'single', enemy: true }; }
    }
    return { fx: FAMILY_FX[fam] || 'heavy', motion: 'lunge', color: '#ffffff', color2: '#ff6a6a', area: 'single', hits: 1, enemy: true };
  };

  /* ---------- 時刻表（2D・3D 共通） ---------- */
  // opts: { fast: 速い戦闘, hits: 命中の回数 }。windup＝構え（使う人の動き）、hitAt＝最初の命中、impacts＝各命中、total＝全体
  FX.timeline = function (def, opts) {
    opts = opts || {}; var k = K[def && def.fx] || K.slash; var sc = opts.fast ? 0.55 : 1; if (def && def.big) sc *= 1.15;
    var hits = Math.max(1, Math.min(6, opts.hits || (def && def.hits) || 1)); var gap = Math.round((k.gap || 130) * sc);
    var windup = Math.round(Math.min(k.hit, 180) * sc); var hitAt = Math.round(k.hit * sc);
    var impacts = []; for (var i = 0; i < hits; i++) impacts.push(hitAt + i * gap);
    var total = Math.max(Math.round(k.dur * sc), impacts[impacts.length - 1] + Math.round(160 * sc));
    return { windup: windup, hitAt: hitAt, impacts: impacts, total: total, travel: !!k.travel, fx: def ? def.fx : 'slash' };
  };
  // 描画側（2D の fx2d.js、3D の描画）への知らせ。描画で失敗しても戦闘は止めない
  FX.on = function (fn) { FX.listeners.push(fn); };
  FX.emit = function (type, data) { FX.listeners.forEach(function (fn) { try { fn(type, data); } catch (e) { if (root.console) console.warn('FX', e); } }); };
  FX.coverage = function () { var S = root.SKILLS || {}; var ids = Object.keys(S); var has = ids.filter(function (id) { return FX.DEFS[id] && K[FX.DEFS[id].fx]; }); return { total: ids.length, defined: has.length, unique: has.filter(function (id) { return FX.DEFS[id].unique; }).length }; };

  root.FX65 = FX;
})(typeof window !== 'undefined' ? window : globalThis);
