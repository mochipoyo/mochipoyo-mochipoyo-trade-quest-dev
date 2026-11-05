/* =========================================================
   Data / skills76（v7.6）：職業ごと・キャラごとの全体攻撃の特技と呪文（各10種）
   ・職業（21）：JOBS[job].skills の後ろに足す（レベル LV で覚える。転職しても覚えた技は残る＝従来どおり）
   ・キャラ（主人公＋仲間16）：CHAR_SKILLS76[キャラID]（Actors.refreshSkills がキャラのレベル LVC で覚える。職業を変えても残る）
   ・旧セーブ：State.migrate が、いまのレベルまでに覚える技だけを足す（ほかの技・項目は変えない）
   ・強さ：同じレベルで覚える既存の全体技（回転斬り 1.1・火炎嵐 28 など）を超えないよう、段ごとの値（PW・MG）で決める
   ・1行：'名前|種類|属性|追加'。種類 w＝特技（物理・攻撃力の倍率）／s＝呪文（魔法・基礎値）
     属性 n なし・f 炎・i 氷・t 雷・w 風・l 光・d 闇。追加：h2＝2回（1回の威力は 0.6 倍）・p＝防御無視25%・c＝会心+25%・
     sp 毒・ss 眠り・sz 麻痺・sc 混乱（各30%）
   ========================================================= */
(function (root) {
  'use strict';
  var SKILLS = root.SKILLS, JOBS = root.JOBS;
  if (!SKILLS || !JOBS) return;
  var LV = [4, 8, 13, 18, 24, 30, 37, 45, 54, 65];          // 職業の技を覚えるレベル
  var LVC = [6, 11, 16, 21, 27, 33, 40, 48, 57, 68];        // キャラの技を覚えるレベル
  var PW = [0.75, 0.85, 0.95, 1.05, 1.15, 1.25, 1.35, 1.5, 1.65, 1.85], MPW = [5, 7, 9, 11, 14, 17, 20, 24, 28, 34];
  var MG = [14, 18, 23, 28, 34, 41, 49, 58, 68, 82], MPS = [5, 7, 9, 12, 15, 18, 22, 26, 31, 38];
  var EL = { n: 'none', f: 'fire', i: 'ice', t: 'thunder', w: 'wind', l: 'light', d: 'dark' };
  var ANIM_S = { none: 'light', fire: 'fire', ice: 'ice', thunder: 'thunder', wind: 'wind', light: 'light', dark: 'dark' };
  var BOW = { hunter: 1, surveyor: 1, iris: 1 };

  var JOB76 = {
    warrior: ['薙ぎ払い|w|n', '地割り|w|n|sz', '旋風斬|w|w', '剛断輪|w|n|p', '烈火薙ぎ|w|f', '闘気の炎陣|s|f', '天地両断|w|n|c', '雷鳴大車輪|w|t', '覇王旋風陣|w|w|p', '闘神の咆哮|s|n'],
    mage: ['火の粉の雨|s|f', '氷礫の舞|s|i', '雷の網|s|t', '疾風の鎖|s|w', '紅蓮の渦|s|f', '魔杖旋打|w|n', '凍て星|s|i', '天雷槌|s|t', '星屑の嵐|s|n', '終焉の灼光|s|f'],
    priest: ['清めの光輪|s|l', '祈りの鐘|s|l|ss', '聖なる風|s|w', '浄化の雨|s|i', '聖鎚の波紋|w|l', '天の裁き|s|l', '雷の祈り|s|t', '祝福の閃光|s|l|sc', '大聖光陣|s|l', '天使の審判|s|l'],
    monk: ['連脚旋風|w|w|h2', '爆砕掌|w|n', '気功波|s|n', '旋風脚|w|w', '百烈乱舞|w|n|h2', '烈火拳|w|f', '雷神掌|w|t', '闘気爆発|s|n', '天翔脚|w|w|c', '極・無双乱舞|w|n|h2'],
    thief: ['影縫いの刃|w|d|sz', '投げナイフの雨|w|n', '毒霧の刃|w|n|sp', '疾風乱舞|w|w|h2', '盗賊の閃光弾|s|l|sc', '闇夜の舞|w|d', '千本投げ|w|n|h2', '宵闇の幻影|s|d|sc', '影走り乱斬|w|d|p', '影分身乱舞|w|d|c'],
    merchant: ['銭の雨|w|n', '金貨つぶて|w|n|h2', '商魂の旋風|w|w', '算盤乱打|w|n', '値札の嵐|s|n|sc', '黄金の閃光|s|l', '大商い旋風|w|w|p', '富の光雨|s|l', '為替の渦|s|d', '豪商の大号令|w|n|c'],
    hunter: ['拡散矢|w|n', '火矢の雨|w|f', '氷矢連射|w|i|h2', '雷矢の網|w|t|sz', '疾風千矢|w|w', '毒矢の雨|w|n|sp', '森の精霊弓|s|w', '星落とし射|w|l', '天穿つ矢|w|n|p', '千里流星矢|w|l|c'],
    knight: ['盾突進|w|n|sz', '聖騎士の薙ぎ|w|l', '鉄壁旋回|w|n', '守護の閃光|s|l', '騎士の突撃|w|n|p', '十字斬り|w|l', '城砦崩し|w|n|p', '誓いの光波|s|l', '王騎の大旋風|w|w', 'グランドクロス|s|l'],
    sage: ['光と炎の輪|s|f', '賢者の氷結陣|s|i', '叡智の雷|s|t', '理の風|s|w', '杖術・円月|w|n', '星辰の光|s|l', '冥府の門|s|d', '六芒の嵐|s|n', '真理の閃光|s|l', '原初の詩|s|n'],
    magicknight: ['火炎剣舞|w|f', '氷刃旋風|w|i', '雷光剣|w|t', '魔力の刃波|s|n', '風刃剣舞|w|w', '光闇の双剣|w|d|h2', '魔法剣・獄炎|w|f|p', '凍界剣|w|i|sz', '雷神剣陣|s|t', '魔剣・星墜|w|n|c'],
    waveblade: ['押し目斬り|w|n', '高値更新の閃|w|l', 'トレンド薙ぎ|w|w', '波動三連|w|n|h2', '反転の太刀|w|d|sc', 'ブレイクアウト斬|w|n|p', '波形の大波|s|i', '第三波の嵐|w|w|c', '大局の一閃|w|l', '波形極意・天波|w|n|p'],
    master: ['規律の光|s|l', '忍耐の波紋|s|n', '損切りの風|s|w', '導師の杖撃|w|n', '静寂の鐘|s|d|ss', '結界破砕|s|n', '相場観の雷|s|t', '心眼の光雨|s|l|sc', '均衡の大結界波|s|n', '悟りの一閃|s|l'],
    auditor: ['監査の閃光|s|l', '帳簿の嵐|s|n', '粉飾暴き|s|d|sc', '契約の鎖|s|n|sz', '監査槌の連打|w|n|h2', '査察の雷|s|t', '不正摘発の光|s|l', '差し押さえ|w|n|p', '決算の大嵐|s|w', '監査結論・断罪|s|l'],
    oath_knight: ['誓いの盾撃|w|n|sz', '守護の薙ぎ|w|n', '誓約の光波|s|l', '反撃の嵐|w|w', '鉄誓の突進|w|n|p', '盟約の十字|w|l', '不屈の大旋回|w|n', '誓いの雷槌|w|t', '守護神の裁き|s|l', '永誓の大聖陣|s|l'],
    navigator: ['潮しぶき|s|i', '帆風の刃|w|w', '渦潮の牙|s|i', '錨振り回し|w|n|sz', '嵐の航跡|s|w', '高波|s|i', '稲妻の海|s|t', '大渦巻|s|i|sc', '疾風の帆走斬|w|w|c', '大海嘯|s|i'],
    surveyor: ['測距射|w|n', '三角測量射|w|n|h2', '地形落とし|s|n', '方位の矢雨|w|w', '等高線の罠|s|n|sz', '遠隔一斉射|w|n|p', '測地の雷|s|t', '地図裂き|w|d', '子午線の光|s|l', '天測流星射|w|l|c'],
    chronomancer: ['刻の砂|s|n|ss', '時の刃|s|n', '逆行の渦|s|d', '秒針の雨|s|n', '停滞の霧|s|i|sz', '未来視の光|s|l', '時空断層|s|d', '永劫の鐘|s|n|sc', '時の大河|s|i', '時間崩壊|s|n'],
    mechanist: ['機巧弾・散|w|n', '歯車の嵐|w|n|h2', '電撃網|s|t|sz', '蒸気噴射|s|f', '解析照射|s|l', '機巧砲・拡散|w|f', '磁力嵐|s|t', '自走機雷|w|n|p', '機巧竜の咆哮|s|f', '全弾発射|w|n|h2'],
    artisan: ['金槌旋回|w|n', '鉄床落とし|w|n|sz', '火花散らし|w|f', '鋳造の熱波|s|f', '楔打ち|w|n|p', '鍛冶の大炎|s|f', '歯車砕き|w|n', '雷の溶接|s|t', '名匠の大旋回|w|n|c', '匠の極み・千鎚|w|n|h2'],
    spirit_warden: ['火の精霊の舞|s|f', '水の精霊の歌|s|i', '雷の精霊の鼓|s|t', '風の精霊の笛|s|w', '精霊槍の舞|w|n', '光の精霊の環|s|l', '大地の精霊の怒り|s|n|sz', '四精霊の輪舞|s|n', '精霊王の息吹|s|w', '精霊界の門|s|l'],
    loop_trader: ['窓開けの雷|s|t', '寄り付きの波|s|n', '損切りの刃|s|d', '利確の光|s|l', 'ボラティリティの嵐|s|w', '逆指値の罠|s|n|sz', '往復ビンタ相場|w|n|h2', 'ギャップの深淵|s|d', '大相場の奔流|s|i', '時渡りの大相場|s|n']
  };
  var CHAR76 = {
    hero: ['波形の一閃|w|n', '勇者の剣風|w|w', 'ライン突破斬|w|n|p', '勇気の炎|s|f', '波形の雷光|s|t', '均衡の光輪|s|l', '勇者の大旋風|w|w', '波動の剣|w|n|c', '未来線の光|s|l', '波形の勇者・極光斬|w|l|p'],
    lina: ['祈りの花吹雪|s|w', '癒し手の光輪|s|l', '巡礼の鐘|s|l|ss', '清き雷|s|t', '守り手の杖舞|w|n', '白百合の嵐|s|w', '慈愛の閃光|s|l', '聖歌の波|s|n', '天使の羽ばたき|s|w', '巡礼者の奇跡|s|l'],
    kyle: ['不器用な大振り|w|n', '盾ぶん回し|w|n|sz', '義理の突進|w|n', '鉄壁の衝撃波|s|n', '騎士見習いの十字|w|l', '意地の旋風|w|w', '曲げない槍|w|n|p', '守り抜く光|s|l', '大盾の雪崩|w|n', 'カイル渾身の一撃|w|n|c'],
    mina: ['ちゃっかり乱れ投げ|w|n|h2', '宝探しの閃光|s|l|sc', 'すばしっこ斬り|w|w', 'ミナ式煙玉|s|n|ss', 'ナイフの花火|w|f', 'いたずら旋風|w|w', '抜け目ない毒刃|w|n|sp', '夜の猫足|w|d', '黄金の盗み風|w|w', '大泥棒の一夜|w|d|c'],
    seris: ['知識の炎|s|f', '冷静な氷|s|i', '論理の雷|s|t', '書架の嵐|s|w', '研究の光|s|l', '禁書の闇|s|d', '魔導理論・爆|s|n', '絶対零度の講義|s|i', '星の公式|s|n', 'セリスの最終定理|s|n'],
    gald: ['豪快大振り|w|n', '酒樽投げ|w|n|sz', 'ガルド旋風|w|w', '面倒見の一喝|s|n|sc', '大地揺るがし|w|n|sz', '豪炎斧|w|f', '兄貴の突進|w|n|p', '雷鳴の大笑|s|t', '山崩し|w|n', '豪傑無双|w|n|c'],
    lucia: ['静波斬|w|i', '負けず嫌いの連撃|w|n|h2', '凪の太刀|w|w', '月影の波|s|d', '引き波の一閃|w|n|p', '波紋の舞|w|i', '逆波|w|d', '満ち潮の剣|s|i', '波頭断ち|w|n|c', 'ルシア・終の波|w|i'],
    elna: ['正確無比の監査光|s|l', '情けの帳消し|s|n', '数字の嵐|s|n', '照合の雷|s|t', '監査印の雨|w|n', '冷徹な査定|s|i', '赤字の炎|s|f', '公正の天秤|s|l', '帳簿の大波|s|i', 'エルナ監査報告|s|l'],
    nagi: ['波乗り斬り|w|i', '物怖じしない突撃|w|n', '潮風ブーメラン|w|w', '船乗りの大声|s|n|sc', '嵐呼び|s|w', '波しぶき連打|w|i|h2', '海鳴りの雷|s|t', '大航海の風|s|w', '竜巻の帆|s|w', 'ナギ流・大渦|s|i'],
    iris: ['無言の一射|w|n', '観察者の矢雨|w|n', '視線の稲妻|s|t', '等高線の雨|w|n', '測量杭の雨|w|n|p', '遠望の星|s|l', '地脈の震え|s|n|sz', '精密三連射|w|n|h2', '地平の光|s|l', 'イーリスの全天測量|w|l|c'],
    sophia: ['たぶん雷|s|t', 'もしもの炎|s|f', 'かもしれない氷|s|i', '揺らぎの時|s|n', '可能性の光|s|l', '選ばれなかった未来|s|d', '曖昧な嵐|s|w', '確率の雨|s|n', '時の分岐|s|d|sc', 'ソフィアの多世界|s|n'],
    io: ['なぜなに電撃|s|t', '試作弾・散|w|n', '問いの歯車|w|n', '蒸気ぼうや|s|f', '分解ドリル|w|n|p', '試験管の嵐|s|n|sp', '回路の稲妻|s|t', '自作ロボの突撃|w|n', '好奇心の光|s|l', 'イオ式全弾発射|w|n|h2'],
    ganes: ['黙々と一振り|w|n', '頑固槌|w|n|sz', '炉の熱波|s|f', '釘の雨|w|n|h2', '鉄の雪崩|w|n', '火入れの炎|s|f', '職人の楔|w|n|p', '鍛え雷|s|t', '大鋸の旋回|w|n', 'ガネス一世一代の作|w|n|c'],
    aster: ['精霊のささやき|s|w', '穏やかな光|s|l', '森の息吹|s|w', '芯の強い炎|s|f', '静かな雷雨|s|t', '精霊たちの合唱|s|n', '霜の精の舞|s|i', '大地の鼓動|s|n|sz', '星の精霊|s|l', 'アステルの聖域|s|l'],
    ord: ['誓いの一閃|w|n', '寡黙な盾撃|w|n|sz', '誠実なる十字|w|l', '守護の衝撃波|s|n', '不動の反撃陣|w|n', '鉄の誓い|w|n|p', '夜明けの誓光|s|l', '盾の雪崩|w|n', '誓約の雷鳴|s|t', 'オルドの永き誓い|w|l|c'],
    kazuto: ['実直な一撃|w|n', '仲間を守る旋回|w|n', '剣圧の波|s|n', '盾になる突進|w|n|sz', '修練の連斬|w|n|h2', '燃える闘志|w|f', '一念岩通し|w|n|p', '雷の気合|s|t', '武士道の大旋風|w|w', 'カズト渾身・天地斬|w|n|c'],
    mochipoyo: ['のんびり波動|s|n', '目つきが変わる雷|s|t', 'アラート一斉発報|s|l|sc', 'RCIの逆流|s|d', '波形を読む光|s|l', '時を渡る嵐|s|w', '未来チャートの雷|s|t', '反転サインの雨|s|n', '大相場の予言|s|i', '謎の時渡り大相場|s|n']
  };
  var DESC_W = { none: '敵全体を攻撃する', fire: '炎の力で敵全体を攻撃する', ice: '冷気で敵全体を攻撃する', thunder: '雷の力で敵全体を攻撃する', wind: '風の力で敵全体を攻撃する', light: '光の力で敵全体を攻撃する', dark: '闇の力で敵全体を攻撃する' };
  var DESC_S = { none: '敵全体に魔力をぶつける呪文', fire: '敵全体を焼く炎の呪文', ice: '敵全体を凍らせる氷の呪文', thunder: '敵全体に雷を落とす呪文', wind: '敵全体を切り裂く風の呪文', light: '敵全体を光で撃つ呪文', dark: '敵全体を闇で包む呪文' };
  var ST = { sp: 'poison', ss: 'sleep', sz: 'paralyze', sc: 'confuse' }; var STN = { poison: '毒', sleep: '眠り', paralyze: '麻痺', confuse: '混乱' };
  var made = [], names = {};
  function make(id, line, tier, owner) {
    var p = line.split('|'); var name = p[0], kind = p[1], el = EL[p[2]] || 'none', ex = p.slice(3);
    var sk = { id: id, name: name, target: 'enemies', element: el, v76: true, tier: tier + 1 };
    if (kind === 'w') { sk.kind = 'attack'; sk.power = PW[tier]; sk.mp = MPW[tier]; sk.anim = BOW[owner] ? 'arrow' : (el === 'none' ? (/打|撃|掌|槌|突|振|投|雪崩|落とし|揺|崩|砕/.test(name) ? 'hit' : 'slash') : ANIM_S[el]); sk.desc = DESC_W[el]; }
    else { sk.kind = 'magic'; sk.power = MG[tier]; sk.mp = MPS[tier]; sk.anim = ANIM_S[el]; sk.desc = DESC_S[el]; }
    ex.forEach(function (e) {
      if (e === 'h2') { sk.hits = 2; if (sk.kind === 'attack') sk.power = Math.round(sk.power * 0.6 * 100) / 100; sk.desc += '（2回）'; }
      else if (e === 'p') { sk.pierce = 0.25; sk.desc += '。防御を25%無視'; }
      else if (e === 'c') { sk.crit = 0.25; sk.desc += '。会心が出やすい'; }
      else if (ST[e]) { sk.status = { id: ST[e], chance: 0.3 }; sk.desc += '。' + STN[ST[e]] + 'にすることがある'; }
    });
    if (kind === 's') sk.spell = true;   // 呪文（沈黙で使えない・敵の「呪文封じ」の対象）
    if (SKILLS[id]) throw new Error('skills76: ID が重複 ' + id);
    if (names[name]) throw new Error('skills76: 名前が重複 ' + name);
    names[name] = id; SKILLS[id] = sk; made.push(id); return sk;
  }
  Object.keys(JOB76).forEach(function (job) { var J = JOBS[job]; if (!J) return; JOB76[job].forEach(function (line, i) { var id = 'j76_' + job + '_' + (i + 1); make(id, line, i, job); J.skills.push({ lv: LV[i], id: id, v76: true }); }); });
  var CH = root.CHAR_SKILLS76 = {};
  Object.keys(CHAR76).forEach(function (cid) { CH[cid] = CHAR76[cid].map(function (line, i) { var id = 'c76_' + cid + '_' + (i + 1); make(id, line, i, cid); return { lv: LVC[i], id: id }; }); });
  // キャラの技（Actors.refreshSkills から）と、旧セーブの補い（State.migrate から）
  root.Skills76 = {
    LV: LV, LVC: LVC, made: made,
    learn: function (a) {   // a：キャラ（hero・仲間）。いまのレベルまでの職業の技（v76）とキャラの技を足す（ほかの技は変えない）
      if (!a || !a.skills) return 0; var n = 0; var J = JOBS[a.job];
      if (J) J.skills.forEach(function (s) { if (s.v76 && a.level >= s.lv && a.skills.indexOf(s.id) < 0) { a.skills.push(s.id); n++; } });
      (CH[a.id] || []).forEach(function (s) { if (a.level >= s.lv && a.skills.indexOf(s.id) < 0) { a.skills.push(s.id); n++; } });
      return n;
    },
    sync: function (d) { if (!d || !d.hero) return; [d.hero].concat(Object.keys(d.companions || {}).map(function (k) { return d.companions[k]; })).forEach(function (a) { root.Skills76.learn(a); }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
