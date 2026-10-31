/* =========================================================
   Data / Tradia（v6.4 Phase D）：相場都市トレディア（寄り道の都市。第6章のカリオン徴収連邦から行ける）
   ・世界のトレーダー・投資家・研究者・商人・投機家が集まる経済都市。町の中心に証券市場、まわりに闘技場・取引所・研究所・銀行・ギルド
   ・施設14：トレード闘技場／レバレッジ取引所／投資家ギルド／相場研究所／証券市場／銀行／トレーダーの酒場／高級武器店／防具店／道具屋／宿屋／住宅街／富豪の屋敷／破産者の集まる裏通り
   ・ラックスベル（カジノ＝確率と期待値）・ボラティリティア学院（講義）とは役割を分ける：ここは「チャートで判断を比べる」「証拠金とロスカットを体験する」町
   ・トレーダー12人とのトレードバトル（js/rpg/tradebattle.js）、レバレッジ取引ゲーム（js/rpg/leverage.js）。画面は js/ui/tradia.js
   ・レバレッジ取引ゲームの資金はゲーム専用の「トレディアG」。ゴールド・現実のお金・暗号資産・ポイントとの交換はできない
   ・ワールドの入口：world_kalion (36,88)。徴収都市カリオンから西への道（js/data/world-kalion.js）
   ========================================================= */
(function (root) {
  'use strict';
  var K = root.TownKit; var add = K.add; var ITEMS = root.ITEMS; var Q = root.QUESTS;

  /* ---------- 建物の種類（見た目） ---------- */
  var BT = root.Buildings && root.Buildings.TYPES;
  if (BT) {
    BT.exchange = BT.exchange || { label: '証券市場', roof: '#2a5a4a', roofL: '#3f8a6f', roofD: '#173a30', icon: 'chart', banner: '#4cc38a', stoneFront: true, flags: true, lit: true };
    BT.arena = BT.arena || { label: '闘技場', roof: '#8a2a2a', roofL: '#c04a3a', roofD: '#5a1414', icon: 'sword', banner: '#ffd24a', flags: true };
    BT.levex = BT.levex || { label: '取引所', roof: '#4a2a7a', roofL: '#7a4ab8', roofD: '#2a1446', icon: 'chart', banner: '#c9a2ff', stoneFront: true, lit: true };
    BT.lab = BT.lab || { label: '研究所', roof: '#2a4a7a', roofL: '#4a78b8', roofD: '#142a4a', icon: 'scroll', banner: '#8fb8ff', tower: true };
    BT.mansion = BT.mansion || { label: '屋敷', roof: '#5a3a6a', roofL: '#8a5a9a', roofD: '#2e1a38', icon: 'crown', banner: '#ffd24a', stoneFront: true, chimney: true };
  }

  /* ---------- 地域マップの絵（js/data/designs.js と同じ形式。列柱の証券市場と取引所の塔） ---------- */
  if (root.LOCATION_DESIGNS && !root.LOCATION_DESIGNS.tradia) root.LOCATION_DESIGNS.tradia = { id: 'tradia', architectureStyle: '列柱の証券市場と、相場の板を掲げた取引所の塔が並ぶ経済都市', silhouette: 'admin_city', roofStyle: 'flat',
    materials: { wall: '#e8e4d8', wallD: '#b8b2a0', mortar: '#cfc8b4', roof: '#2a6a52', roofD: '#174a38', accent: '#ffd24a', banner: '#4cc38a' }, decoration: ['banners'], environment: ['road'],
    entrance: { map: 'world_kalion', x: 36, y: 88, face: 'south', to: 'tradia' } };

  /* ---------- トレーダー12人の見た目（歩行キャラの色） ---------- */
  var CH = root.Chars && root.Chars.PALS; var SK = '#f0c8a0', EY = '#2a2d4a';
  if (CH) {
    var P = function (id, H, B, A, L, T, M, E) { if (!CH[id]) CH[id] = { H: H, F: SK, E: E || EY, B: B, A: A, S: SK, L: L, T: T, M: M }; };
    P('td_ren', '#ff8a3a', '#2a2a3a', '#ff8a3a', '#2a2a3a', '#1a1a2a');                 // 橙の短髪・黒の軽装
    P('td_kai', '#3a2a1a', '#3f6fc9', '#f0f0f8', '#2a2d4a', '#1a1a2a');                 // 白シャツ・紺のベスト
    P('td_leo', '#c9a24a', '#6a4a2a', '#e8c15a', '#4a3a2a', '#2a1a0a');                 // 金髪・茶の外套
    P('td_mira', '#e8e8f0', '#8a1a3a', '#1a1a2a', '#3a1a2a', '#1a1a2a', null, '#c94a4a'); // 銀髪・深紅の服
    P('td_jin', '#1a1a2a', '#c94a2a', '#ffd24a', '#2a2a3a', '#1a1a2a');                 // 黒髪・赤い上着
    P('td_dow', '#f0f0f0', '#2a2d4a', '#c9a24a', '#2a2d4a', '#1a1a2a', '#2a2d4a');      // 白髪・紺の長衣（帽子）
    P('td_emma', '#3a8a5a', '#f0f0f8', '#3a8a5a', '#2a5a3a', '#2a1a0a');                // 緑の髪・白衣
    P('td_lisia', '#8a3aa0', '#2a1a3a', '#c94ad0', '#2a1a3a', '#1a1a2a', '#2a1a3a', '#c94ad0'); // 紫の髪・魔女の帽子
    P('td_max', '#5a5a6a', '#d0d0dc', '#3f6fc9', '#3a3a4a', '#1a1a2a', null, '#3f6fc9'); // 灰の髪・白衣と青
    P('td_galva', '#8a5a2a', '#c9a24a', '#8a1a1a', '#5a3a1a', '#2a1a0a');               // 金の上着（くたびれた）
    P('td_seil', '#2a2a3a', '#1f3a66', '#e8e8f0', '#1f3a66', '#1a1a2a', null, '#5ab0ff'); // 紺の礼服
    P('td_zeno', '#d0d0d0', '#1a1a2a', '#ffd24a', '#1a1a2a', '#1a1a2a', '#1a1a2a', '#ffd24a'); // 黒の外套・金の縁取り
  }

  /* ---------- 限定装備（トレーダーに初めて勝ったときの報酬。店では買えない） ---------- */
  var LIMITED = [];
  function eq(id, o) { if (ITEMS[id]) throw new Error('tradia: ID が重複しています ' + id); ITEMS[id] = Object.assign({ id: id, price: 0, limited: 'tradia' }, o); LIMITED.push(id); if (root.ITEM_LIST && root.ITEM_LIST.indexOf(id) < 0) root.ITEM_LIST.push(id); }
  eq('td_scalper_knife', { name: '刹那のスキャルナイフ', cat: 'weapon', type: 'dagger', atk: 26, agi: 5, tier: 3, fx: { firstStrike: 0.3 }, desc: 'スキャルパー・レンの短剣。素早さ+5。戦闘で最初の通常攻撃の威力+30%' });
  eq('td_session_watch', { name: '立会いの懐中時計', cat: 'armor', type: 'acc', def: 3, agi: 4, tier: 3, fx: { critUp: 0.06 }, desc: 'デイトレーダー・カイの時計。素早さ+4。会心率+6%' });
  eq('td_swing_longbow', { name: '上位足の長弓', cat: 'weapon', type: 'bow', atk: 34, tier: 4, fx: { firstStrike: 0.25, steady: true }, desc: 'スイングトレーダー・レオの弓。最初の通常攻撃+25%、ダメージの下振れなし' });
  eq('td_mirror_buckler', { name: '逆張りの鏡盾', cat: 'armor', type: 'shield', def: 15, tier: 3, fx: { counterChance: 0.12 }, desc: '逆張りのミラの盾。敵の攻撃を受けたとき、12%で反撃する' });
  eq('td_breakout_halberd', { name: '節目破りの斧槍', cat: 'weapon', type: 'spear', atk: 33, tier: 3, fx: { pierce: 0.2 }, desc: 'ブレイクアウトのジンの斧槍。通常攻撃が敵の防御を20%無視する' });
  eq('td_dow_crown', { name: '賢人の波形冠', cat: 'armor', type: 'helm', def: 17, tier: 4, fx: { rampDef: { per: 0.05, max: 0.2 } }, desc: 'ダウ理論の賢人の冠。長い戦いほど防御が上がる（1ターンごとに+5%、最大+20%）' });
  eq('td_ema_staff', { name: '三本線の杖', cat: 'weapon', type: 'staff', atk: 11, mag: 21, tier: 3, fx: { spellMult: 1.06 }, desc: 'EMA使いのエマの杖。魔力+21。攻撃魔法の威力+6%' });
  eq('td_rci_hat', { name: '過熱を読む魔女帽', cat: 'armor', type: 'hat', def: 12, mag: 9, tier: 4, fx: { statusResist: 0.2 }, desc: 'RCIの魔女リシアの帽子。魔力+9。状態異常にかかる確率-20%' });
  eq('td_divergence_lens', { name: '乖離のレンズ', cat: 'armor', type: 'acc', def: 2, mag: 8, tier: 4, fx: { autoScan: true }, desc: 'MACD研究者マクスのレンズ。魔力+8。戦闘の始めに敵の弱点と耐性を表示する' });
  eq('td_stoploss_pledge', { name: '損切りの誓約書', cat: 'armor', type: 'acc', def: 3, hp: 40, tier: 3, fx: { guts: 0.15 }, desc: 'ナンピン王ガルバが負けて書いた誓約書。最大HP+40。倒れるダメージを15%でHP1で踏みとどまる（戦闘中1回）' });
  eq('td_risk_robe', { name: '資金管理の法衣', cat: 'armor', type: 'robe', def: 30, mdef: 12, tier: 4, fx: { guts: 0.2, statusResist: 0.15 }, desc: '資金管理の導師セイルの法衣。魔防+12。HP1で踏みとどまる（20%・1回）、状態異常の確率-15%' });
  eq('td_zeno_blade', { name: '相場師ゼノの剣', cat: 'weapon', type: 'sword', atk: 50, tier: 5, fx: { critUp: 0.08, steady: true }, rare: 'legend', desc: '伝説の相場師ゼノの剣。会心率+8%、ダメージの下振れなし。「勝ち方を一つに決めるな。負け方は一つに決めろ」' });
  eq('td_margin_charm', { name: '証拠金の守り札', cat: 'armor', type: 'acc', def: 4, hp: 30, tier: 3, fx: { statusResist: 0.1 }, desc: 'レバレッジ取引所の講習を終えた証。最大HP+30。状態異常の確率-10%' });
  root.TRADIA_LIMITED = LIMITED;

  /* ---------- トレーダー12人 ---------- */
  // tier：★の数（1〜5）。pool：勝負に使う学習シナリオ。need：挑戦できる条件（勝った人数）
  var T = root.TRADERS = {
    ren: { name: 'スキャルパー・レン', sprite: 'td_ren', tier: 1, where: 'tradia_arena', pool: ['clear_up_5m', 'clear_down_5m', 'up_pullback_5m', 'down_rally_5m', 'jump_in', 'jump_in_down'],
      bio: '数分で入って数分で出る短期売買の名手。反射神経には自信がある。', past: 'トレディアの裏通りで育ち、露店の値引き合戦で「値の勢い」を覚えた。', strategy: '直近の勢いとEMAの傾きだけで入る。損切りも利確も近い（1:1）',
      lines: ['迷ったら負け、考えたら遅い。勢いが全部だ。', '……と言いたいところだが、あんたは上位足から見るタイプか？　面白い。'], win: ['くっ、近すぎる損切りは、ただの「刈られ待ち」だったか。'], lose: ['ほら、速いほうが勝つんだよ！……今回はな。'],
      reward: { exp: 1500, gold: 600, item: 'td_scalper_knife', title: '刹那を見切る者' } },
    kai: { name: 'デイトレーダー・カイ', sprite: 'td_kai', tier: 2, where: 'tradia_arena', pool: ['clear_up', 'clear_down', 'up_pullback', 'down_rally', 'range'],
      bio: '朝の取引開始から夕方の終了まで、15分足のトレンドだけを追う。', past: '元は銀行の窓口係。毎日同じ時間に同じ手順で判断することを信条にしている。', strategy: '15分足の波形とEMAが同じ向きなら順張り',
      lines: ['日をまたいだポジションは持たない主義でね。', '今日の流れに乗れるかどうか、勝負しよう。'], win: ['上位足を見ないと、日中の流れも読み違えるのか……。'], lose: ['トレンドに沿えば、だいたい何とかなる。'],
      reward: { exp: 2400, gold: 900, item: 'td_session_watch', title: '一日の流れを読む者' } },
    leo: { name: 'スイングトレーダー・レオ', sprite: 'td_leo', tier: 3, where: 'tradia_exchange', pool: ['mtf_conflict', 'mtf_conflict_up', 'up_pullback_1h', 'up_pullback', 'down_rally', 'div_against_htf'],
      bio: '数日から数週間かけて大きな波を取る。上位足が逆なら、どんな好機も見送る。', past: '若いころ、15分足だけを見て大きく負けた。それ以来、まず日足と4時間足を開く。', strategy: '上位足と下位足の向きが一致したときだけ入る',
      lines: ['上位足が東を向いているのに、下位足で西へ走ってはいけない。', 'さあ、同じチャートを見よう。'], win: ['見送りの判断まで含めて、きみのほうが上だった。'], lose: ['上位足を先に見る。それだけのことが、意外と難しい。'],
      reward: { exp: 4000, gold: 1500, item: 'td_swing_longbow', title: '上位足を仰ぐ者' } },
    mira: { name: '逆張りのミラ', sprite: 'td_mira', tier: 1, where: 'tradia_tavern', pool: ['range', 'range_high', 'rci_hot_trend', 'rci_cold_trend', 'false_breakout', 'false_breakdown'],
      bio: '「行き過ぎた価格は必ず戻る」が口ぐせ。RCIが±70に届けば反対に入る。', past: 'レンジ相場で連戦連勝した過去がある。……強いトレンドの年までは。', strategy: 'RCIが+70なら売り、−70なら買い（逆張り）',
      lines: ['みんなが買うときに売る。それが大人のやり方よ。', 'あら、トレンドの中でそれをやると？……さあ、どうかしら。'], win: ['トレンドの中の「買われすぎ」は、まだ上がる途中……ね。覚えておくわ。'], lose: ['ほらね、行き過ぎは戻るのよ。'],
      reward: { exp: 1500, gold: 600, item: 'td_mirror_buckler', title: '行き過ぎを疑う者' } },
    jin: { name: 'ブレイクアウトのジン', sprite: 'td_jin', tier: 2, where: 'tradia_arena', pool: ['false_breakout', 'false_breakdown', 'breakout_retest', 'jump_in', 'jump_in_down'],
      bio: '節目を抜けた瞬間に飛び乗る。大きな波の初動を逃さないのが自慢。', past: '一度の大きなブレイクで名を上げた。ダマシに何度も焼かれたことは、あまり話さない。', strategy: '直近の高値（安値）を抜けた方向へすぐ入る',
      lines: ['壁を抜けたら、乗る。考えるのはその後だ！', '……ダマシ？　そんなもの、当たったときの利益で取り返せばいい。'], win: ['抜けたあとの「戻り」を待つ……か。それができれば苦労しない。'], lose: ['初動に乗った者だけが、大きな波を取れるんだ。'],
      reward: { exp: 2400, gold: 900, item: 'td_breakout_halberd', title: '節目を見極める者' } },
    dow: { name: 'ダウ理論の賢人', sprite: 'td_dow', tier: 3, where: 'tradia_lab', pool: ['reversal_confirmed_up', 'reversal_confirmed_down', 'clear_up', 'clear_down', 'range'],
      bio: '相場研究所の最古参。高値と安値の並びだけで、百年分のチャートを語る老人。', past: '若い研究員たちに「線を引く前に、山と谷を数えよ」と教え続けている。', strategy: '確定した高値・安値の切り上げ／切り下げに従う。上位足と逆なら見送る',
      lines: ['トレンドは、転換の明確な合図が出るまで続く。', '山と谷を、正しく数えられるかな。'], win: ['よろしい。山と谷を数え、上位足に聞き、そして待った。'], lose: ['まだ山と谷を数え急いでおる。確定を待ちなさい。'],
      reward: { exp: 4000, gold: 1500, item: 'td_dow_crown', title: '山と谷を数える者' } },
    emma: { name: 'EMA使いのエマ', sprite: 'td_emma', tier: 1, where: 'tradia_exchange', pool: ['up_ema_bounce', 'down_ema_reject', 'clear_up', 'clear_down', 'whipsaw'],
      bio: '20・30・40の3本のEMAの並びと傾きだけを見る、証券市場の分析係。', past: '計算の速さで市場に雇われた。線が絡み合うと、つい焦ってしまう。', strategy: 'EMAの上昇配列で買い、下降配列で売り。絡み合いは見送り',
      lines: ['線の並びは、相場の気分です。', 'きれいに並んでいれば、迷いません。……並んでいなければ、迷います。'], win: ['線だけでなく、波形と上位足も……なるほど。'], lose: ['ほら、3本の線がきれいに並んでいたでしょう？'],
      reward: { exp: 1500, gold: 600, item: 'td_ema_staff', title: '三本の線を束ねる者' } },
    lisia: { name: 'RCIの魔女リシア', sprite: 'td_lisia', tier: 3, where: 'tradia_lab', pool: ['rci_hot_trend', 'rci_cold_trend', 'up_pullback', 'down_rally', 'range_high'],
      bio: 'RCIの「過熱」と「反転」を読み分ける研究者。魔女と呼ばれるのは、その的中率のせい。', past: 'RCIだけで逆張りして失敗した過去から、「向きはEMA、タイミングはRCI」を編み出した。', strategy: 'トレンドの向きの押し目・戻りで、RCIが±70から反転したときに入る',
      lines: ['RCIは「どこで入るか」を教えてくれる。「どちらへ」は教えてくれない。', 'さあ、魔女の目と比べてごらんなさい。'], win: ['あなたにも見えているのね。過熱と反転の違いが。'], lose: ['+70は「売れ」ではなく「強い」という意味よ。'],
      reward: { exp: 4000, gold: 1500, item: 'td_rci_hat', title: '過熱と反転を見分ける者' } },
    max: { name: 'MACD研究者マクス', sprite: 'td_max', tier: 3, where: 'tradia_lab', pool: ['regular_bull', 'regular_bear', 'hidden_bull', 'hidden_bear', 'div_against_htf', 'div_bear_against_htf'],
      bio: 'ダイバージェンスの研究に人生をかける研究者。ノートは千冊を超える。', past: '「上位足に逆らうダイバージェンス」で何度も失敗し、それを分類して論文にした。', strategy: '上位足と同じ向きのダイバージェンスだけで入る',
      lines: ['価格とMACDの食い違い……そこに相場の本音がある。', 'ただし、上位足に逆らう本音は、ただの独り言だ。'], win: ['見事だ。ダイバージェンスを上位足でふるいにかけたな。'], lose: ['ダイバージェンスは「必ず反転する」合図ではない。'],
      reward: { exp: 4000, gold: 1500, item: 'td_divergence_lens', title: '本音を読む者' } },
    galva: { name: 'ナンピン王ガルバ', sprite: 'td_galva', tier: 1, where: 'tradia_alley', pool: ['clear_down', 'clear_up', 'range', 'jump_in', 'whipsaw'],
      bio: '下がったら買い増し、さらに下がったらまた買い増す。損切りは「負けを認めること」だから、しない。', past: 'かつては屋敷に住む大富豪だった。今は裏通りで、昔の勝ち話をくり返している。', strategy: '動いた方向の反対に、損切りなしで資金の5%を入れる',
      lines: ['損切り？　あれは負け犬のすることだ。下がったら買えば、平均の値段が下がる！', '……屋敷？　あれは、ちょっと貸しているだけさ。'], win: ['……損切りしていれば、屋敷は残っていたのかもしれんな。', 'この誓約書を持っていけ。わしにはもう、守れんかもしれんが。'], lose: ['ほら見ろ、最後は戻ってくるんだ！……今回はな。'],
      reward: { exp: 1500, gold: 600, item: 'td_stoploss_pledge', title: '損切りを誓う者' } },
    seil: { name: '資金管理の導師セイル', sprite: 'td_seil', tier: 4, where: 'tradia_guild', need: 5, pool: ['bad_rr', 'bad_rr_sell', 'pullback_tight_sl', 'jump_in', 'whipsaw', 'mtf_conflict'],
      bio: '投資家ギルドの相談役。勝ち方より先に負け方を決める。1回のリスクは資金の0.5%。', past: '大きく勝ったことも、大きく負けたこともない。ただ、三十年一度も市場から退場していない。', strategy: '根拠が4つ以上そろい、損切りと損失の大きさを先に決められるときだけ入る',
      lines: ['入る理由を探す前に、間違いを認める場所を決めなさい。', 'トレーダーを五人倒したあなたなら、話が通じるでしょう。'], win: ['結構。退場しない者だけが、次の機会に立ち会えます。'], lose: ['入らない勇気も、技術のうちです。'],
      reward: { exp: 6000, gold: 2500, item: 'td_risk_robe', title: '退場しない者' } },
    zeno: { name: '伝説の相場師ゼノ', sprite: 'td_zeno', tier: 5, where: 'tradia_mansion', need: 9, needWin: 'seil', pool: ['hidden_bull', 'hidden_bear', 'mtf_conflict', 'false_breakout', 'rci_hot_trend', 'reversal_confirmed_down', 'bad_rr', 'whipsaw', 'div_against_htf', 'pullback_tight_sl'],
      bio: 'トレディアを築いた商人たちの最後の生き残り。あらゆる手法を使いこなし、使わないことも知っている。', past: '若いころは一つの手法に賭けて破産した。富豪の屋敷の主は、今は彼に部屋を貸している。', strategy: '上位足・波形・EMA・RCI・MACD・急変・損切りの位置を全部見て、そろったときだけ入る',
      lines: ['十二人目まで来たか。……わしは、勝ち方を一つに決めていない。', '負け方だけは一つに決めている。損切りだ。'], win: ['見事。わしの剣を持っていけ。道具は増やしても、手順は増やすな。'], lose: ['そろうまで待て。そろわなければ、待ち続けろ。'],
      reward: { exp: 10000, gold: 5000, item: 'td_zeno_blade', title: '相場都市の覇者' } }
  };
  Object.keys(T).forEach(function (id) { T[id].id = id; });
  root.TRADER_IDS = ['ren', 'kai', 'leo', 'mira', 'jin', 'dow', 'emma', 'lisia', 'max', 'galva', 'seil', 'zeno'];

  /* ---------- クエスト ---------- */
  if (Q) {
    Q.tradia_twelve = { title: 'トレディアの十二人', desc: '相場都市トレディアのトレーダー12人に、トレードバトルで勝つ（それぞれ1回）。勝敗は損益だけでなく、判断の質と資金管理で決まる。', counter: 'tradia_wins', need: 12, reward: { exp: 3000, gold: 3000, item: 'elixir' } };
    Q.tradia_margin = { title: '証拠金の講習', desc: 'レバレッジ取引所で、損切りを置き、損切りに当たったときの損失を残高の2%以内にした取引を3回する（損益は問わない。高いレバレッジに得点はない）。', counter: 'lev_disciplined', need: 3, reward: { exp: 1200, gold: 800, item: 'td_margin_charm' } };
  }

  /* ---------- 小さな地図ビルダー ---------- */
  function Grid(W, H, ch) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push(ch); } return {
    set: function (x, y, c) { if (g[y] && g[y][x] !== undefined) g[y][x] = c; return this; },
    rect: function (x, y, w, h, c) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) this.set(xx, yy, c); return this; },
    border: function (c) { for (var x = 0; x < W; x++) { g[0][x] = c; g[H - 1][x] = c; } for (var y = 0; y < H; y++) { g[y][0] = c; g[y][W - 1] = c; } return this; },
    rows: function () { return g.map(function (r) { return r.join(''); }); } }; }
  function UI() { return root.TradiaUI; }
  function challenge(id) { return async function (c) { await UI().talkTrader(id, c); }; }

  /* ---------- 相場都市トレディア（48×40） ---------- */
  var t = Grid(48, 40, '=').border('x');
  t.rect(22, 39, 4, 1, 'r');                                  // 南の出入口
  t.rect(22, 8, 4, 31, 'r');                                  // 大通り（南北）
  t.rect(1, 17, 46, 2, 'r'); t.rect(1, 26, 46, 2, 'r');        // 東西の通り（2本）
  t.rect(14, 2, 20, 6, 'B');                                  // 証券市場
  t.rect(36, 2, 10, 6, 'B');                                  // 富豪の屋敷
  t.rect(2, 2, 5, 4, 'B'); t.rect(8, 2, 5, 4, 'B');            // 住宅街（北西）
  t.rect(2, 9, 11, 6, 'B');                                   // トレード闘技場
  t.rect(14, 10, 7, 5, 'B'); t.rect(27, 10, 7, 5, 'B');        // 投資家ギルド・相場研究所
  t.rect(35, 9, 11, 6, 'B');                                  // レバレッジ取引所
  t.rect(2, 20, 8, 5, 'B'); t.rect(12, 20, 8, 5, 'B');         // 銀行・トレーダーの酒場
  t.rect(28, 20, 8, 5, 'B'); t.rect(38, 20, 8, 5, 'B');        // 高級武器店・防具店
  t.rect(28, 30, 8, 5, 'B'); t.rect(38, 30, 8, 5, 'B');        // 道具屋・宿屋
  t.rect(14, 30, 5, 4, 'B');                                  // 住宅街（南）
  // 破産者の集まる裏通り（南西）：細い路地と木箱・樽
  t.rect(2, 29, 9, 9, ','); t.rect(5, 28, 1, 1, ','); t.rect(3, 30, 1, 7, 'r'); t.rect(3, 36, 7, 1, 'r');
  [[2, 29], [6, 30], [8, 31], [9, 33], [5, 34], [7, 35], [10, 30]].forEach(function (p) { t.set(p[0], p[1], 'z'); }); [[2, 33], [6, 32], [9, 36], [4, 37]].forEach(function (p) { t.set(p[0], p[1], 'q'); });
  // 広場：噴水と花壇、街灯、ベンチ、屋台
  t.set(19, 22, 'Q'); [[17, 21], [21, 21]].forEach(function (p) { t.set(p[0], p[1], 'a'); });
  [[21, 9], [26, 9], [21, 15], [26, 15], [21, 24], [26, 24], [21, 33], [26, 33], [13, 16], [34, 16], [13, 28], [34, 28]].forEach(function (p) { t.set(p[0], p[1], 'y'); });
  [[17, 23], [21, 23], [27, 36], [30, 37]].forEach(function (p) { t.set(p[0], p[1], 'e'); });
  [[28, 37], [33, 37], [36, 37]].forEach(function (p) { t.set(p[0], p[1], 'A'); });
  [[44, 36], [45, 37], [13, 37], [16, 37]].forEach(function (p) { t.set(p[0], p[1], '6'); });
  add({ id: 'tradia', name: '相場都市トレディア', kind: 'town', bgm: 'town', fallback: 'stone', style: 'stone', rows: t.rows(),
    buildings: [
      { id: 'td_exchange', type: 'exchange', name: 'トレディア証券市場', x: 14, y: 2, w: 20, h: 6, doorX: 10, interior: 'tradia_exchange', entry: { x: 12, y: 10 } },
      { id: 'td_mansion', type: 'mansion', name: '富豪の屋敷', x: 36, y: 2, w: 10, h: 6, doorX: 5, interior: 'tradia_mansion', entry: { x: 9, y: 10 } },
      { id: 'td_house1', type: 'house', name: '住宅街の家', x: 2, y: 2, w: 5, h: 4, doorX: 2, interior: 'tradia_house', entry: { x: 5, y: 7 } },
      { id: 'td_house2', type: 'house', name: '住宅街の家', x: 8, y: 2, w: 5, h: 4, doorX: 2 },
      { id: 'td_arena', type: 'arena', name: 'トレード闘技場', x: 2, y: 9, w: 11, h: 6, doorX: 5, interior: 'tradia_arena', entry: { x: 11, y: 12 } },
      { id: 'td_guild', type: 'guild', name: '投資家ギルド', x: 14, y: 10, w: 7, h: 5, doorX: 3, interior: 'tradia_guild', entry: { x: 8, y: 8 } },
      { id: 'td_lab', type: 'lab', name: '相場研究所', x: 27, y: 10, w: 7, h: 5, doorX: 3, interior: 'tradia_lab', entry: { x: 9, y: 8 } },
      { id: 'td_levex', type: 'levex', name: 'レバレッジ取引所', x: 35, y: 9, w: 11, h: 6, doorX: 5, interior: 'tradia_levex', entry: { x: 10, y: 10 } },
      { id: 'td_bank', type: 'bank', name: 'トレディア銀行', x: 2, y: 20, w: 8, h: 5, doorX: 3, interior: 'tradia_bank', entry: { x: 5, y: 7 } },
      { id: 'td_tavern', type: 'tavern', name: 'トレーダーの酒場「損切り亭」', x: 12, y: 20, w: 8, h: 5, doorX: 3, interior: 'tradia_tavern', entry: { x: 6, y: 8 } },
      { id: 'td_weapon', type: 'weapon', name: '高級武器店', x: 28, y: 20, w: 8, h: 5, doorX: 3, interior: 'tradia_weapon', entry: { x: 5, y: 7 } },
      { id: 'td_armor', type: 'armor', name: 'トレディア防具店', x: 38, y: 20, w: 8, h: 5, doorX: 3, interior: 'tradia_armor', entry: { x: 5, y: 7 } },
      { id: 'td_item', type: 'item', name: 'トレディア道具屋', x: 28, y: 30, w: 8, h: 5, doorX: 3, interior: 'tradia_item', entry: { x: 5, y: 7 } },
      { id: 'td_inn', type: 'inn', name: '宿屋「満期の宿」', x: 38, y: 30, w: 8, h: 5, doorX: 3, interior: 'tradia_inn', entry: { x: 5, y: 7 } },
      { id: 'td_house3', type: 'house', name: '住宅街の家', x: 14, y: 30, w: 5, h: 4, doorX: 2 }
    ],
    warps: [22, 23, 24, 25].map(function (x) { return { x: x, y: 39, to: 'world_kalion', tx: 36, ty: 89, name: '町の外へ' }; }),
    chests: [{ id: 'td1', x: 45, y: 38, item: 'hi_ether', qty: 2 }, { id: 'td2', x: 2, y: 37, item: 'revive_lantern', qty: 1 }],
    events: [
      { x: 25, y: 37, type: 'inspect', solid: false, text: ['案内板：「相場都市トレディア——北：証券市場・富豪の屋敷　西：トレード闘技場・投資家ギルド・銀行・酒場　東：相場研究所・レバレッジ取引所・武器と防具の店　南東：道具屋・宿屋　南西：裏通り」', '小さな字で：「この町のトレディアGは取引所の中だけで使う仮想資金です。ゴールドとは交換できません」'] },
      { x: 19, y: 8, type: 'script', solid: true, run: async function () { await UI().board(); } },   // 証券市場の前の大きな板（左右）
      { x: 29, y: 8, type: 'script', solid: true, run: async function () { await UI().board(); } }
    ],
    npcs: [
      { id: 'td_guide', x: 21, y: 37, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) {
        if (!c.flag('tradia_visited')) c.setFlag('tradia_visited', true);
        await c.say('町の案内人', ['相場都市トレディアへようこそ。世界中のトレーダー、投資家、研究者、商人が集まる町だ。', '腕試しなら西の闘技場、証拠金の仕組みを体で覚えるなら東のレバレッジ取引所へ。', '腕自慢のトレーダーは十二人。町のあちこちにいるから、話しかけてみるといい。']);
        if (!c.questActive('tradia_twelve') && !c.questDone('tradia_twelve')) c.questStart('tradia_twelve'); } },
      { id: 'td_crier', x: 24, y: 12, sprite: 'merchant', dir: 'down', wander: 1, talk: async function (c) { await c.say('相場の呼び込み', ['証券市場の大きな板を見ていかないか？　入口の前の板に、今日の値動きが映っている！', '……今日の値動き？　研究所の連中が作った「学習用の値動き」さ。本物の相場じゃないから、安心して眺めていきな。']); } },
      { id: 'td_investor', x: 30, y: 18, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('若い投資家', ['この町では「いくら儲けたか」より「どう判断したか」で人を見るの。', '闘技場の勝ち負けも、損益だけじゃ決まらないのよ。資金の5%を一度に賭ける人は、大きく勝っても褒められない。']); } },
      { id: 'td_child', x: 18, y: 25, sprite: 'child', dir: 'down', wander: 1, talk: async function (c) { await c.say('町の子ども', ['お父さんはね、毎日「今日はやめておこう」って言う日があるんだって。', 'それも仕事なんだって。変なの。']); } },
      { id: 'td_merchant', x: 32, y: 27, sprite: 'merchant', dir: 'down', wander: 1, talk: async function (c) { await c.say('旅の商人', ['カリオンの税が落ち着いてから、この町に人が戻ってきた。', '高級武器店の品ぞろえは大陸でも指折りだ。闘技場の勝者だけがもらえる装備もあるらしいぞ。']); } },
      { id: 'td_galva', x: 6, y: 33, sprite: 'td_galva', dir: 'down', wander: 0, talk: challenge('galva') },
      { id: 'td_bankrupt1', x: 4, y: 31, sprite: 'villager_m', dir: 'right', wander: 0, talk: async function (c) { await c.say('裏通りの男', ['……レバレッジを上げれば、早く取り返せると思ったんだ。', '取引所の画面に「ロスカットまで 8pips」って出てたのに、見ないふりをした。8pipsなんて、15分で動く。']); } },
      { id: 'td_bankrupt2', x: 8, y: 35, sprite: 'villager_f', dir: 'up', wander: 0, talk: async function (c) { await c.say('裏通りの女', ['損切りの注文は入れてたのよ。でも重要な発表で値段が飛んで、損切りの値段より、ずっと悪いところで決済された。', '損切りは「その値段で必ず止まる」約束じゃないの。だから、1回に賭ける額を小さくするしかないのよ。']); } },
      { id: 'td_bankrupt3', x: 9, y: 29, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('裏通りの老人', ['わしはナンピンで三度破産した。三度とも「次は戻る」と思っておった。', '取引所は破産しても学習用の資金をくれる。だが本物の世界では、くれる者はおらん。……ここで覚えておけ。']); } }
    ] });

  /* ---------- 証券市場（26×12）：大きな値動きの板。EMA使いのエマ、スイングトレーダー・レオ ---------- */
  var ex = Grid(26, 12, ':').border('#');
  ex.rect(3, 1, 20, 1, 'K'); ex.rect(2, 4, 4, 1, 'T'); ex.rect(20, 4, 4, 1, 'T'); ex.rect(11, 3, 4, 1, 'T');
  ex.set(8, 7, 't').set(17, 7, 't').set(1, 1, 'I').set(24, 1, 'I').set(1, 9, 'I').set(24, 9, 'I'); ex.rect(12, 5, 2, 6, 'p'); ex.set(12, 11, 'D');
  add({ id: 'tradia_exchange', name: 'トレディア証券市場', kind: 'interior', bgm: 'town', rows: ex.rows(), warps: [{ x: 12, y: 11, to: 'tradia', tx: 24, ty: 8 }],
    events: [8, 12, 16].map(function (x) { return { x: x, y: 1, type: 'script', solid: true, run: async function () { await UI().board(); } }; }),
    npcs: [
      { id: 'td_ex_clerk', x: 12, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('市場の係員', ['ここは証券市場。上の大きな板には、研究所が作った学習用の値動きが映っている。', '板を調べると、今日の値動きを時間足ごとに見られる。売り買いの注文は東のレバレッジ取引所で。']); } },
      { id: 'td_emma', x: 4, y: 3, sprite: 'td_emma', dir: 'down', wander: 0, talk: challenge('emma') },
      { id: 'td_leo', x: 21, y: 3, sprite: 'td_leo', dir: 'down', wander: 0, talk: challenge('leo') },
      { id: 'td_ex_watcher', x: 7, y: 8, sprite: 'villager_m', dir: 'up', wander: 1, talk: async function (c) { await c.say('板を見上げる男', ['上がってる……いや、4時間足だと下がってる？　どっちなんだ。', '……レオさんが言うには、「上の時間足が東を向いていたら、西へは走るな」だとさ。']); } }
    ] });

  /* ---------- トレード闘技場（22×14）：レン・カイ・ジン、勝敗の記録 ---------- */
  var ar = Grid(22, 14, '_').border('#');
  ar.rect(6, 3, 10, 6, 'p'); ar.rect(5, 2, 12, 1, 'x'); ar.rect(5, 9, 12, 1, 'x'); ar.rect(5, 2, 1, 8, 'x'); ar.rect(16, 2, 1, 8, 'x'); ar.set(10, 9, 'p').set(11, 9, 'p');
  ar.rect(1, 11, 4, 1, 'T'); ar.set(1, 1, 'I').set(20, 1, 'I'); ar.set(18, 11, 'K').set(19, 11, 'K'); ar.set(11, 13, 'D');
  add({ id: 'tradia_arena', name: 'トレード闘技場', kind: 'interior', bgm: 'town', rows: ar.rows(), warps: [{ x: 11, y: 13, to: 'tradia', tx: 7, ty: 15 }],
    events: [{ x: 18, y: 11, type: 'script', solid: true, run: async function () { await UI().roster(); } }, { x: 19, y: 11, type: 'script', solid: true, run: async function () { await UI().roster(); } }],
    npcs: [
      { id: 'td_arena_master', x: 2, y: 10, sprite: 'king', dir: 'down', wander: 0, talk: async function (c) {
        await c.say('闘技場の主', ['トレード闘技場へようこそ。ここでは剣ではなく、チャートで勝負する。', '同じ場面を見て、買い・売り・見送りを決め、損切りと利確を置く。勝ち負けは「判断の質」「結果」「規律」の合計で決まる。', '資金の2%を超えるリスクや、損切りなしの取引は、どれだけ儲けても40点までだ。', 'トレーダーの相手は、その時点までの足だけを見て決める。未来の足を先に見る者は、ここにはおらん。']);
        await UI().roster(); } },
      { id: 'td_ren', x: 8, y: 5, sprite: 'td_ren', dir: 'down', wander: 0, talk: challenge('ren') },
      { id: 'td_kai', x: 13, y: 5, sprite: 'td_kai', dir: 'down', wander: 0, talk: challenge('kai') },
      { id: 'td_jin', x: 10, y: 7, sprite: 'td_jin', dir: 'down', wander: 0, talk: challenge('jin') },
      { id: 'td_arena_fan', x: 18, y: 6, sprite: 'villager_f', dir: 'left', wander: 1, talk: async function (c) { await c.say('観客', ['ジンさんが勝つときは派手なのよ。負けるときも派手だけど。', 'カイさんは毎回同じ。地味だけど、同じことを続けられるのが一番強いのかも。']); } }
    ] });

  /* ---------- 投資家ギルド（18×10）：資金管理の導師セイル、トレーダーの記録 ---------- */
  var gd = Grid(18, 10, ':').border('#');
  gd.rect(2, 2, 6, 1, 'T'); gd.rect(11, 1, 6, 1, 'K'); gd.set(12, 5, 't').set(15, 5, 't').set(4, 6, 't'); gd.set(1, 8, 'I').set(16, 8, 'I'); gd.set(8, 9, 'D');
  add({ id: 'tradia_guild', name: '投資家ギルド', kind: 'interior', bgm: 'town', rows: gd.rows(), warps: [{ x: 8, y: 9, to: 'tradia', tx: 17, ty: 15 }],
    events: [12, 14].map(function (x) { return { x: x, y: 1, type: 'script', solid: true, run: async function () { await UI().roster(); } }; }),
    npcs: [
      { id: 'td_guild_master', x: 4, y: 1, sprite: 'master', dir: 'down', wander: 0, talk: async function (c) {
        await c.say('ギルドの受付', ['投資家ギルドへようこそ。トレーダーたちの記録と、あなたの称号はここで確かめられます。', '五人に勝つと、相談役のセイル様が相手をしてくださいます。十二人目の方は……富豪の屋敷にいらっしゃるそうです。']);
        await UI().roster(); } },
      { id: 'td_seil', x: 14, y: 3, sprite: 'td_seil', dir: 'down', wander: 0, talk: challenge('seil') },
      { id: 'td_guild_member', x: 6, y: 7, sprite: 'scholar', dir: 'up', wander: 1, talk: async function (c) { await c.say('ギルドの会員', ['連勝より「退場しないこと」。ここの会員証の裏には、そう書いてある。']); } }
    ] });

  /* ---------- 相場研究所（20×10）：ダウ理論の賢人・RCIの魔女リシア・MACD研究者マクス ---------- */
  var lb = Grid(20, 10, '_').border('#');
  lb.rect(1, 1, 18, 1, 'K'); lb.set(4, 4, 't').set(9, 4, 't').set(15, 4, 't').set(4, 7, 't').set(15, 7, 't'); lb.set(9, 9, 'D');
  add({ id: 'tradia_lab', name: '相場研究所', kind: 'interior', bgm: 'town', rows: lb.rows(), warps: [{ x: 9, y: 9, to: 'tradia', tx: 30, ty: 15 }],
    events: [
      { x: 3, y: 1, type: 'inspect', solid: true, text: ['研究所の黒板：「ダウ理論——高値と安値がともに切り上がれば上昇、切り下がれば下降。転換の明確な合図が出るまで、トレンドは続くと考える」'] },
      { x: 9, y: 1, type: 'inspect', solid: true, text: ['研究所の黒板：「RCI——±70は『過熱』であって『反転』ではない。トレンドの中の+70は、強さの表れのことが多い」'] },
      { x: 15, y: 1, type: 'inspect', solid: true, text: ['研究所の黒板：「ダイバージェンス——価格とMACDの食い違い。上位足と同じ向きのものは継続や押し目の手がかり、逆向きのものは見送りの理由になりやすい」'] }
    ],
    npcs: [
      { id: 'td_dow', x: 4, y: 3, sprite: 'td_dow', dir: 'down', wander: 0, talk: challenge('dow') },
      { id: 'td_lisia', x: 9, y: 3, sprite: 'td_lisia', dir: 'down', wander: 0, talk: challenge('lisia') },
      { id: 'td_max', x: 15, y: 3, sprite: 'td_max', dir: 'down', wander: 0, talk: challenge('max') },
      { id: 'td_lab_assistant', x: 11, y: 6, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('研究助手', ['ここの値動きは、5分足を細かい刻みから作った学習用のデータです。実在の相場や、特定の日の再現ではありません。', '同じ番号（シード）なら、何度でも同じ値動きになります。研究には、それが大事なんです。']); } }
    ] });

  /* ---------- レバレッジ取引所（20×12） ---------- */
  var lx = Grid(20, 12, ':').border('#');
  lx.rect(2, 2, 16, 1, 'T'); lx.set(3, 5, 't').set(7, 5, 't').set(12, 5, 't').set(16, 5, 't').set(3, 8, 't').set(16, 8, 't'); lx.rect(9, 6, 2, 5, 'p'); lx.set(1, 1, 'I').set(18, 1, 'I'); lx.set(10, 11, 'D');
  add({ id: 'tradia_levex', name: 'レバレッジ取引所', kind: 'interior', bgm: 'town', rows: lx.rows(), warps: [{ x: 10, y: 11, to: 'tradia', tx: 40, ty: 15 }],
    events: [
      { x: 2, y: 2, type: 'script', solid: true, run: async function () { await UI().leverageRules(); } },
      { x: 17, y: 2, type: 'script', solid: true, run: async function () { await UI().leverageRecord(); } }
    ],
    npcs: [
      { id: 'td_lev_clerk', x: 10, y: 1, sprite: 'innkeeper', dir: 'down', wander: 0, talk: async function (c) {
        if (!c.flag('tradia_lev_intro')) { c.setFlag('tradia_lev_intro', true);
          await c.say('取引所の係員', ['レバレッジ取引所へようこそ。ここでは学習用の仮想資金「トレディアG」を使って、証拠金の取引を体験できます。', 'はじめに100,000トレディアGをお渡しします。ゴールドとは交換できませんし、現実のお金とも関係ありません。', '左の掲示板にこの取引所の決まり（架空のルール）を書いています。ロスカットの水準も、この取引所だけのものです。']);
          if (!c.questActive('tradia_margin') && !c.questDone('tradia_margin')) c.questStart('tradia_margin'); }
        await UI().leverage(); } },
      { id: 'td_lev_teacher', x: 4, y: 7, sprite: 'scholar', dir: 'down', wander: 0, talk: async function (c) { await c.say('取引所の講師', ['888倍にすると、必要な証拠金は1/888。でも、残高に対する損益の振れ幅は888倍になる。', '注文の画面には「ロスカットまで何pips」が出る。888倍だと、ふつうの15分足1本の動きより小さいことがある。', '高いレバレッジで勝っても、この取引所では評価もボーナスもない。見るのは損切りと、1回の損失の大きさだけだ。']); } },
      { id: 'td_lev_trader', x: 15, y: 9, sprite: 'villager_m', dir: 'up', wander: 1, talk: async function (c) { await c.say('取引所の客', ['破産しても学習用の資金をまたもらえる……ありがたいけど、破産の回数は記録に残るんだよな。']); } }
    ] });

  /* ---------- 富豪の屋敷（20×12）：伝説の相場師ゼノ ---------- */
  var ms = Grid(20, 12, 'p').border('#');
  ms.rect(1, 1, 18, 1, 'K'); ms.set(4, 4, 't').set(15, 4, 't').set(2, 8, 'E').set(17, 8, 'E'); ms.set(1, 5, 'I').set(18, 5, 'I'); ms.set(9, 11, 'D');
  add({ id: 'tradia_mansion', name: '富豪の屋敷', kind: 'interior', bgm: 'town', rows: ms.rows(), warps: [{ x: 9, y: 11, to: 'tradia', tx: 41, ty: 8 }],
    npcs: [
      { id: 'td_rich', x: 6, y: 3, sprite: 'king', dir: 'down', wander: 0, talk: async function (c) { await c.say('屋敷の主', ['この屋敷は、昔ガルバという男のものだった。わしが買い取った。', '奥の部屋の客人は、この町を作った商人たちの最後の一人だ。腕の立つ者しか会わんよ。']); } },
      { id: 'td_butler', x: 13, y: 9, sprite: 'bartender', dir: 'up', wander: 0, talk: async function (c) { await c.say('執事', ['ゼノ様は、トレーダーを九人以上破り、セイル様にも勝った方とだけ勝負なさいます。']); } },
      { id: 'td_zeno', x: 15, y: 2, sprite: 'td_zeno', dir: 'down', wander: 0, talk: challenge('zeno') }
    ] });

  /* ---------- 銀行・酒場・店・宿・住宅 ---------- */
  var bk = Grid(12, 9, ':').border('#'); bk.rect(1, 2, 10, 1, 'T'); bk.set(1, 6, 'I').set(10, 6, 'I'); bk.set(5, 8, 'D');
  add({ id: 'tradia_bank', name: 'トレディア銀行', kind: 'interior', bgm: 'town', rows: bk.rows(), warps: [{ x: 5, y: 8, to: 'tradia', tx: 5, ty: 25 }],
    npcs: [{ id: 'td_banker', x: 5, y: 1, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('銀行員', ['トレディア銀行です。ゴールドの預け入れと引き出しができます。', '取引所のトレディアGは仮想資金なので、ここでは扱っていません。']); await c.bank(); } },
      { id: 'td_bank_guest', x: 8, y: 5, sprite: 'villager_f', dir: 'up', wander: 1, talk: async function (c) { await c.say('銀行の客', ['預けたお金は増えも減りもしないけど、眠れるのよ。']); } }] });
  var tv = Grid(14, 10, '_').border('#'); tv.rect(1, 2, 6, 1, 'T'); tv.set(9, 3, 't').set(12, 3, 't').set(9, 6, 't').set(12, 6, 't').set(3, 6, 't'); tv.set(12, 1, 'q').set(1, 8, 'z'); tv.set(6, 9, 'D');
  add({ id: 'tradia_tavern', name: 'トレーダーの酒場「損切り亭」', kind: 'interior', bgm: 'tavern', rows: tv.rows(), warps: [{ x: 6, y: 9, to: 'tradia', tx: 15, ty: 25 }],
    npcs: [
      { id: 'td_bartender', x: 3, y: 1, sprite: 'bartender', dir: 'down', wander: 0, talk: async function (c) { await c.say('酒場の主人', ['損切り亭へようこそ。店の名前は、わしが若いころにできなかったことだ。', '仲間の入れ替えもここでできるよ。']); await c.tavern(); } },
      { id: 'td_mira', x: 10, y: 4, sprite: 'td_mira', dir: 'down', wander: 0, talk: challenge('mira') },
      { id: 'td_tavern_guest', x: 4, y: 7, sprite: 'villager_m', dir: 'up', wander: 1, talk: async function (c) { await c.say('酒場の客', ['今日は見送った。……見送った日の酒は、意外とうまい。']); } }
    ] });
  K.shopInterior('tradia_weapon', '高級武器店', 'tradia', 31, 25, 'merchant', 'weapon', ['knight_sword', 'yin_sword', 'resistance_blade', 'breakout_dagger', 'contrarian_blade', 'takeprofit_trident', 'chainbreak_axe'].filter(function (id) { return ITEMS[id]; }), ['いらっしゃいませ。大陸でも指折りの品をそろえております。', '闘技場の勝者に贈られる品は、当店でも扱っておりません。']);
  K.shopInterior('tradia_armor', 'トレディア防具店', 'tradia', 41, 25, 'merchant', 'armor', ['federal_plate', 'pullback_shield', 'knight_helm', 'auditor_coat', 'antiretro_vestment', 'wizard_hat', 'allocation_bangle'].filter(function (id) { return ITEMS[id]; }));
  K.shopInterior('tradia_item', 'トレディア道具屋', 'tradia', 31, 35, 'merchant', 'item', ['potion', 'hi_potion', 'ether', 'phoenix_feather', 'revive_lantern', 'healing_salve', 'panacea', 'camp_kit', 'tent', 'escape_wing'].filter(function (id) { return ITEMS[id]; }));
  K.innInterior('tradia_inn', '宿屋「満期の宿」', 'tradia', 41, 35, 50);
  var hs = Grid(12, 9, '_').border('#'); hs.set(1, 1, 'E').set(10, 1, 'K').set(4, 4, 't').set(8, 6, 'q'); hs.set(5, 8, 'D');
  add({ id: 'tradia_house', name: '住宅街の家', kind: 'interior', bgm: 'town', rows: hs.rows(), warps: [{ x: 5, y: 8, to: 'tradia', tx: 4, ty: 6 }],
    npcs: [{ id: 'td_house_wife', x: 6, y: 3, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('住宅街の住人', ['夫はトレーダーなの。毎朝、取引を始める前に「今日いちばん損をしてもいい額」を紙に書いてから出ていくのよ。', 'その紙を見せてもらったことがあるけど、思ったより小さい数字だったわ。']); } }] });
})(typeof window !== 'undefined' ? window : globalThis);
