/* =========================================================
   Data / enemyskills76（v7.6）：通常敵・ボスが固有の技と呪文を使う
   ・通常敵（全部）：その敵だけの「得意技」を1つ足す（名前は敵の名前の言葉＋種族・属性の技の言葉）。
     強さは通常攻撃の 1.2〜1.3 倍ほど（物理。竜の息は全体 0.45 倍）／その敵の呪文と同じくらい。出る割合は行動全体の 2 割ほど
   ・共通の呪文・特技（火球・雷撃・毒刃など）を使う敵は、その敵の名前のついた同じ性能の技に置きかえる（名前だけ固有。強さは同じ）
   ・ボス（44体）：手書きの固有技を2つ（単体の得意技・HP 半分以下で使う全体の大技）。強さは前の版に近づける：
     得意技は物理 1.1 倍／呪文は攻撃力の 0.9 倍ほど（魔力の高いボスは mult で弱める）。全体の大技は物理 0.4 倍・呪文は攻撃力の 0.35 倍ほど、
     状態異常は単体 25%・全体 12%。得意技の重みのぶん、ふつうの攻撃の重みを 1 減らす（確認：boss64test のシミュレーション）
   ・敵の技は MP を使わない（spell：呪文。沈黙で使えない）。特殊行動（溜め・仲間を呼ぶ など）は変えない
   ・敵のID・能力・出現・報酬は変えない。前の版の行動は ENEMIES[id].actions0（JSON に出ない）に残す。戦闘の演出（FX65）は技の種類・属性から作る（置きかえた技は元の技と同じ演出）
   ・確認：docs/tools/v76/enemyskills_check.js
   ========================================================= */
(function (root) {
  'use strict';
  var E = root.ENEMIES, S = root.SKILLS; if (!E || !S) return;
  var EL = { n: 'none', f: 'fire', i: 'ice', t: 'thunder', w: 'wind', l: 'light', d: 'dark' };
  var ANIM = { none: 'dark', fire: 'fire', ice: 'ice', thunder: 'thunder', wind: 'wind', light: 'light', dark: 'dark' };
  var ST = { sp: 'poison', ss: 'sleep', sz: 'paralyze', sc: 'confuse' };
  // ---- ボス：'名前|種類|属性|追加'。種類 w 単体物理・s 単体呪文・W 全体物理・S 全体呪文。1つ目＝得意技、2つ目＝HP 半分以下の大技
  var BOSS = {
    boss_lost_trend: ['迷い道の霧|s|d|sc', '方向喪失の大渦|S|d'], boss_greed_golem: ['欲望の鉄拳|w|n|p', '黄金の地響き|W|n|sz'], boss_bandit_chief: ['頭目の大鉈|w|n|c', '山賊団の総攻撃|W|n'],
    boss_greed_demon: ['強欲の爪|w|d', '欲望の業火|S|f'], wolf_king: ['王狼の牙|w|n|c', '森の王の咆哮|W|n|sc'], crystal_golem: ['水晶の槍|w|n|p', '結晶の散弾|W|i'],
    boss_tide_serpent: ['潮巻き|w|i|sz', '大海の牙|S|i'], boss_overseer: ['監督の鞭|w|n|sz', '強制労働の号令|W|n'], boss_grote: ['鉄冠の大剣|w|n|p', '鉄冠軍の進撃|W|n'],
    boss_ledger_guardian: ['帳簿の封印|s|d|sz', '総勘定の嵐|S|n'], boss_valen: ['騎士団長の剣|w|n|c', '王国騎士剣・十字陣|W|l'], boss_royal_captain: ['親衛の連突き|w|n|h2', '王都防衛の大号令|W|n'],
    boss_ledger_core: ['数値改竄光線|s|t|sc', '中枢演算の雷|S|t'], boss_ruin_memory: ['忘れられた炎|s|f', '廃墟の追憶|S|d|ss'], boss_library_guardian: ['禁書の頁刃|s|n', '書庫崩落|S|n|sz'],
    boss_time_guardian: ['時の針|s|n|sz', '時間逆流|S|d'], boss_drone_swarm: ['一斉照準|w|t', '集中砲火|W|f'], boss_core_defense: ['防衛レーザー|s|t', '中枢防衛弾幕|S|t|sz'],
    boss_minister: ['裏切りの毒刃|w|d|sp', '簒奪の闇雷|S|d'], boss_sky_guardian: ['天空の光槍|s|l', '天界の審判|S|l'], boss_zarg_remnant: ['残滓の鞭|w|d', '怨嗟の監督令|S|d|sc'],
    boss_sevran_shadow: ['影の剣|w|d|c', '虚ろの夜|S|d|ss'], boss_grote_2: ['黒鉄冠の大剣|w|d|p', '魔王軍・鉄冠進撃|W|d'], boss_demon_fear: ['恐怖の囁き|s|d|sc', '総悲観の暴落|S|d'],
    boss_demon_greed: ['強欲の黄金爪|w|n|c', '狂乱の熱狂相場|S|f'], boss_demon_fixed: ['固定観念の鎖|s|n|sz', '固定の大檻|S|d'], sphinx: ['謎かけの石眼|s|l|sz', '砂の審判|S|n'],
    kraken: ['大触腕の締めつけ|w|i|sz', '深海の大渦|S|i'], dragon_red: ['紅竜の爪|w|f|c', '紅蓮の竜息|S|f'], demon_lord: ['魔王の暗黒剣|w|d|p', '相場崩壊|S|d'],
    boss_storm_chief: ['砂嵐の曲刀|w|w', '大砂嵐|S|w'], boss_mirage_lord: ['蜃気楼の幻刃|s|n|sc', '幻影の大波|S|w'], boss_magma_wyrm: ['溶岩の牙|w|f', '溶岩流|S|f'],
    boss_primal_flame: ['原初の焔爪|w|f|p', '創世の炎|S|f'], boss_frost_spirit: ['氷霊の槍|s|i', '永久凍土の吹雪|S|i|sz'], boss_memory_keeper: ['記憶の抜き取り|s|d|sc', '忘却の帳|S|d|ss'],
    boss_clock_warden: ['凍れる秒針|s|i|sz', '時の氷結|S|i'], boss_ash_lord: ['灰の拳|w|f', '灰燼の嵐|S|f'], boss_ghost_captain: ['亡霊のサーベル|w|d|c', '幽霊船の一斉砲撃|W|d'],
    boss_old_core: ['旧演算の雷|s|t', '都市崩壊プロトコル|S|t'], boss_gull_admiral: ['提督のくちばし|w|w|c', 'かもめ海賊団の急降下|W|w'], observer_echo: ['観測の眼光|s|l|sz', '収束する残響|S|n'],
    soul_warden: ['魂刈りの鎌|w|d|c', '冥界の門|S|d'], zero_echo: ['零点の響き|s|n', 'ゼロポイント崩壊|S|n']
  };
  // ---- 通常敵：種族ごとの技の言葉（物理）と、属性ごとの呪文の言葉
  var FAM_W = {
    'スライム系': ['体当たり', 'のしかかり', 'ぷるぷる打ち', 'とろけ弾'], '昆虫系': ['毒針', '大顎', '毒の鎌'], '虫系': ['毒針', '糸しばり', '大顎'], '植物系': ['つる鞭', '胞子撃ち', '根っこ打ち'],
    '獣系': ['噛みつき', '引き裂き', '突進', '爪連撃'], '爬虫類系': ['毒牙', '尾撃', '締めつけ'], '人間系': ['強打', '斬り込み', '急所突き'], 'アンデッド系': ['呪いの爪', '骨砕き', '怨念の手'],
    '不死系': ['呪いの爪', '怨念の手'], 'ゴーレム系': ['圧殺', '岩拳', '重撃'], '人形系': ['重撃', '刃舞い', '関節打ち'], '悪魔系': ['魔爪', '邪拳', '地獄突き'], '魔物系': ['剛腕', '邪拳', '踏みつけ'],
    '相場の魔物系': ['乱高下', '窓開け突進', '逆行打ち'], '水棲系': ['水圧弾', '鋏打ち', '締めつけ'], '両生類系': ['舌打ち', '水鉄砲'], '鳥系': ['急降下', 'くちばし突き', '羽ばたき'],
    '精霊系': ['霊気打ち', '精霊の手'], '魔法生物系': ['魔力打ち', '念動打ち'], '機械系': ['ドリル', 'アーム打撃', '射撃'], 'ドラゴン系': ['竜爪', '尾の一撃'], '竜系': ['竜爪', '首の連撃'], '異星人系': ['光線', '謎の電波']
  };
  var EL_S = { fire: ['火球', '爆炎', '火柱', '焦熱弾'], ice: ['氷槍', '凍気', '氷の礫', '霜柱'], thunder: ['雷撃', '稲妻', '放電', '雷球'], wind: ['風刃', 'かまいたち', '突風', '旋風'], light: ['光弾', '閃光', '光の矢'], dark: ['闇弾', '呪縛', '影の刃', '黒い霧'], none: ['魔弾', '念波', '衝撃波'] };
  var BREATH = { fire: '灼熱の息', ice: '凍える息', thunder: '雷の息', wind: '嵐の息', light: '光の息', dark: '闇の息', none: '竜の息' };
  // 共通の技の言葉（置きかえるときの名前）
  var CLONE = { fireball: '火球', ice: '氷槍', thunder: '雷撃', wind_blade: '風刃', firestorm: '炎の嵐', blizzard: '吹雪', dark_bolt: '闇弾', meteor: '星落とし', holy_light: '光槍', sleep: '眠りの歌', confuse: '惑わしの声', poison_mist: '毒霧',
    poison_edge: '毒の刃', steal_strike: 'かすめ取り', full_slash: '渾身斬り', paralyze_shot: 'しびれ撃ち', shield_bash: '盾打ち', war_cry: '雄叫び', weaken: '萎えの呪い', armor_break: '鎧砕き', spin_slash: '薙ぎ払い',
    double_slash: '二段斬り', rush: '連続突き', vital_strike: '急所突き', rain_arrow: '矢の雨', snipe: '狙い撃ち', storm_arrow: '嵐の矢', heal: '癒しの術', protect: '守りの術', haste: '加速の術' };
  // 名前から合言葉（その敵だけの言葉）
  var SUFFIX = ['スライム', 'ゴーレム', 'トカゲ', 'モグラ', 'ビートル', 'バット', 'ウルフ', 'ゴースト', 'ヘビ', 'ガエル', 'ガメ', 'ザメ', 'グモ', 'フクロウ', 'イノシシ', 'ヒツジ', 'エイ', 'クラゲ', 'ナイト', 'ドローン', '砲台', '騎士', '結晶', '体', '鏡', '書', '狐', '猫', 'ゾンビ', 'ゴブリン', 'オーガ', 'ファントム', 'メイジ', 'ドラゴン', 'トロール', '星人', 'ヒューマン', '官僚', '議員', '市長', '侍', '亡霊', '者', '人', '像', 'ヒドラ', 'サラマンダー', 'サボテン', '雪だるま', 'トロッコ', '番兵', '衛士', '鐘', '大亀', 'ドラゴン', 'の信徒', '屋', '頭', 'インプ'];
  var KW = { skeleton: '骸骨', imp: '小鬼', golem: '石塊', lizard: 'ダマシ', mole: '反転', bug_poison: '猛毒', fear_shadow: '恐怖', tq_add_robber: '強盗', tq_add_keyboard_crushers: '打鍵', tq_add_wakame_head: 'ワカメ', tq_add_glutton_arienti: '大喰らい', tq_add_galantic_alien: 'ギャランティック', tq_add_alien_invasion_merchant: '侵略商', simple_cultist: 'シンプル教', abyss_maw: '深淵', dragon_red: '紅竜', demon_lord: '魔王', boss_demon_fear: '恐怖', boss_demon_greed: '欲望', boss_demon_fixed: '固定', boss_frost_spirit: '氷霊', boss_overseer: 'ザルグ', boss_zarg_remnant: '残滓', boss_drone_swarm: '監視機', boss_core_defense: '防衛機構', boss_lost_trend: '迷子', zero_echo: '零点', flame_grimoire: '炎書', flame_salamander: '火蜥蜴', lava_tortoise: '溶岩甲', chain_cart: '鎖トロッコ', memory_fox: '忘れ狐', tq_add_ungrateful_ghost: '忘恩', tq_add_one_who_stopped_learning: '停滞', tq_add_ai_surveillance_drone: '監視AI', tq_add_population_control_drone: '人口調整', tq_add_propaganda_host: '洗脳メディア', tq_add_loan_shark_enforcer: '闇金', tq_add_earth1992_invader: '侵略者', meadow_frog: '野原', acorn_turtle: 'ドングリ', glitch_cat: 'バグ', despair_knight: '絶望', void_mirror: '虚無', spell_mirror: '呪文', mirage_mirror: '蜃気楼', chaos_hydra: '混沌', blank_snowman: 'のっぺら', frost_crystal: '氷晶', prism_crystal: 'プリズム', aurora_crystal: '極光' };
  var kanji = function (ch) { return /[一-鿿぀-ゟ0-9]/.test(ch); };
  function kwOf(id, e) {
    if (KW[id]) return KW[id]; var n = e.name || id;
    var p = n.indexOf('の'); if (p > 0 && p <= 5) return n.slice(0, p);
    for (var i = 0; i < SUFFIX.length; i++) { var s = SUFFIX[i]; if (n.length > s.length && n.slice(-s.length) === s) { var k = n.slice(0, -s.length); if (k.length >= 1 && k.length <= 7) return k; } }
    return n.length <= 6 ? n : n.slice(0, 4);
  }
  function join(kw, noun) { var kata = function (ch) { return /[\u30a0-\u30ffA-Za-z]/.test(ch); }; return kata(kw.slice(-1)) && kata(noun.charAt(0)) ? kw + noun : kw + 'の' + noun; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function elemOf(e) {
    var r = e.resist || {}; var best = null; ['fire', 'ice', 'thunder', 'wind', 'light', 'dark'].forEach(function (k) { if (r[k] !== undefined && r[k] <= 0.5 && (!best || r[k] < r[best])) best = k; });
    if (best) return best; var n = e.name || '';
    if (/[炎火熔灼燠焔炉燼溶]/.test(n)) return 'fire'; if (/[氷雪霜凍冷]/.test(n)) return 'ice'; if (/[雷電]/.test(n)) return 'thunder'; if (/[風嵐]/.test(n)) return 'wind'; if (/[光陽星虹]/.test(n)) return 'light'; if (/[闇影夜黒虚]/.test(n)) return 'dark';
    return 'none';
  }
  function maxMagic(acts, all) { return acts.reduce(function (m, a) { var k = a.type === 'skill' && S[a.id]; return k && k.kind === 'magic' && (k.target === 'enemies') === !!all ? Math.max(m, k.power || 0) : m; }, 0); }
  var made = [], clones = [], names = {}; Object.keys(S).forEach(function (k) { if (S[k] && S[k].name) names[S[k].name] = 1; });
  function uniq(name, alt) { var nm = name, k = 0; while (names[nm]) { k++; nm = alt && alt[k - 1] ? alt[k - 1] : name + '・' + 'ⅡⅢⅣⅤⅥ'.charAt(Math.min(4, k - 1)); } names[nm] = 1; return nm; }
  function addSkill(id, o) { if (S[id]) throw new Error('enemyskills76: ID が重複 ' + id); o.id = id; o.e76 = true; S[id] = o; made.push(id); return o; }
  function totalW(acts) { return acts.reduce(function (s, a) { return s + (a.hpBelow !== undefined || a.hpAbove !== undefined ? 0 : (a.w || 0)); }, 0); }
  var ids = Object.keys(E);
  // 前の版の行動（記録・確認用。JSON には出さない）
  ids.forEach(function (id) { var e = E[id]; if (e.actions && !e.actions0) Object.defineProperty(e, 'actions0', { value: JSON.parse(JSON.stringify(e.actions)), enumerable: false, configurable: true }); });
  function mark(e, n) { Object.defineProperty(e, 'skills76', { value: n, enumerable: false, configurable: true, writable: true }); }
  // 1) 共通の技 → その敵の名前の技（同じ性能）
  ids.forEach(function (id) {
    var e = E[id]; if (!e.actions) return; var kw = kwOf(id, e);
    e.actions = e.actions.map(function (a) {
      if (a.type !== 'skill' || !S[a.id] || S[a.id].e76 || S[a.id].v76) return a;
      var cid = 'e76c_' + id + '_' + a.id; if (!S[cid]) { var o = JSON.parse(JSON.stringify(S[a.id])); o.name = uniq(join(kw, CLONE[a.id] || S[a.id].name)); o.base = a.id; o.owner = id; if (S[a.id].mp > 0 && (S[a.id].kind === 'magic' || S[a.id].kind === 'status')) o.spell = true; addSkill(cid, o); clones.push(cid); }
      return Object.assign({}, a, { id: cid });
    });
  });
  // 2) 得意技（通常敵）／固有技2つ（ボス）
  ids.forEach(function (id) {
    var e = E[id]; var acts = (e.actions || [{ type: 'attack', w: 1 }]).map(function (a) { return Object.assign({}, a); });
    var kw = kwOf(id, e); var el = elemOf(e); var atk = e.atk || 10, mag = e.mag || 0;
    if (e.boss && BOSS[id]) {
      BOSS[id].forEach(function (line, k) {
        var p = line.split('|'); var t = p[1], ele = EL[p[2]] || 'none'; var o = { name: uniq(p[0]), element: ele, mp: 0, owner: id, desc: e.name + 'の固有技' };
        if (t === 'w' || t === 'W') { o.kind = 'attack'; o.target = t === 'W' ? 'enemies' : 'enemy'; o.power = t === 'W' ? 0.4 : 1.1; o.anim = ele === 'none' ? 'slash' : ANIM[ele]; }
        else { o.kind = 'magic'; o.target = t === 'S' ? 'enemies' : 'enemy'; o.spell = true; o.anim = ANIM[ele]; o.power = t === 'S' ? Math.max(8, Math.round(0.35 * atk - 1.2 * mag)) : Math.max(12, Math.round(0.85 * atk - 1.2 * mag)); { const m = (t === 'S' ? 0.35 : 0.9) * atk / (o.power + 1.2 * mag); if (m < 1) o.mult = Math.round(m * 100) / 100; } }   // 強さ：単体は攻撃力の 0.9 倍・全体は 0.35 倍ほど（魔力の高いボスは mult で弱める）
        p.slice(3).forEach(function (x) { if (x === 'h2') { o.hits = 2; o.power = Math.round(o.power * 0.65 * 100) / 100; } else if (x === 'p') o.pierce = 0.3; else if (x === 'c') o.crit = 0.3; else if (ST[x]) o.status = { id: ST[x], chance: o.target === 'enemies' ? 0.12 : 0.25 }; });
        var sid = 'e76_' + id + '_' + (k + 1); addSkill(sid, o);
        acts.push(k === 0 ? { type: 'skill', id: sid, w: 1 } : { type: 'skill', id: sid, w: 1, hpBelow: 0.5 });
      });
      var atkA = acts.filter(function (a) { return a.type === 'attack' && a.hpBelow === undefined && a.hpAbove === undefined; })[0]; if (atkA && atkA.w >= 2) atkA.w -= 1;   // 得意技のぶん、ふつうの攻撃を少し減らす（強さを前の版に近づける）
      e.actions = acts; mark(e, BOSS[id].length); return;
    }
    // 通常敵（ボスで手書きのないものも、ここで1つ）
    var fam = e.family || ''; var caster = mag >= atk * 0.8 || acts.some(function (a) { return a.type === 'skill' && S[a.id] && S[a.id].kind === 'magic'; });
    var h = hash(id); var o = { element: el, mp: 0, owner: id, target: 'enemy' };
    var dragon = /ドラゴン系|竜系/.test(fam);
    if (dragon) { o.kind = 'attack'; o.target = 'enemies'; o.power = 0.45; o.name = join(kw, BREATH[el === 'none' ? 'fire' : el]); o.element = el === 'none' ? 'fire' : el; o.anim = ANIM[o.element]; }
    else if (caster) { var pool = EL_S[el]; o.kind = 'magic'; o.spell = true; o.anim = ANIM[el]; o.power = Math.max(10, Math.round(0.95 * atk - 1.2 * mag), maxMagic(acts)); o.name = join(kw, pool[h % pool.length]); }
    else { var pw = FAM_W[fam] || ['強打', '突撃']; o.kind = 'attack'; o.power = e.arche === 'glass' ? 1.2 : 1.3; o.anim = el === 'none' ? (/獣|鳥|虫|爬虫|竜/.test(fam) ? 'slash' : 'hit') : ANIM[el]; o.name = join(kw, pw[h % pw.length]);
      if (/獣系|鳥系/.test(fam)) { o.hits = 2; o.power = 0.65; } else if (/ゴーレム系|人形系|機械系/.test(fam)) o.pierce = 0.25; else if (/人間系/.test(fam)) o.crit = 0.25; }
    if (/昆虫系|虫系|爬虫類系/.test(fam) && !o.status) o.status = { id: 'poison', chance: 0.35 };
    else if (/植物系/.test(fam)) o.status = { id: 'sleep', chance: 0.25 };
    else if (/機械系/.test(fam) && el === 'thunder') o.status = { id: 'paralyze', chance: 0.25 };
    else if (/アンデッド系|不死系|相場の魔物系|異星人系/.test(fam) && h % 3 === 0) o.status = { id: 'confuse', chance: 0.25 };
    o.name = uniq(o.name, (FAM_W[fam] || []).concat(EL_S[el] || []).map(function (nn) { return join(kw, nn); }));
    o.desc = e.name + 'の得意技';
    var sid = 'e76_' + id + '_1'; addSkill(sid, o);
    var tw = totalW(acts); if (tw < 3) acts.forEach(function (a) { if (a.w) a.w *= 3; }); tw = totalW(acts);
    acts.push({ type: 'skill', id: sid, w: Math.max(1, Math.round(tw * 0.25)) });
    e.actions = acts; mark(e, 1);
  });
  // 演出（FX65）：作った技の演出を作り直し、置きかえた技は元の技の演出をそのまま使う
  if (root.FX65 && root.FX65.rebuild) { root.FX65.rebuild(); clones.forEach(function (cid) { var b = S[cid].base; if (root.FX65.DEFS[b]) root.FX65.DEFS[cid] = Object.assign({}, root.FX65.DEFS[b], { id: cid }); }); }
  root.EnemySkills76 = { made: made, clones: clones, kwOf: kwOf, BOSS: BOSS };
})(typeof window !== 'undefined' ? window : globalThis);
