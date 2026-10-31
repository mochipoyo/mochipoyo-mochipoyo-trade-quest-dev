/* =========================================================
   Data / Phase A 第3段階（v6.4）：町に「入れる民家」を足す（18の町に1軒ずつ＋空きのない3つの町は建物の奥に部屋を1つ）
   ・家には住民・家具・本棚（読むと「読んだ本」に数える）・光る場所・調べる物・1回だけの贈り物。会話は町の物語と進み具合（既存のフラグ）に合わせる
   ・置き場所は作業用スクリプト（work/v64/homefinder.js）で「町の地面の上・道や小道の上でない・ワープ・宝箱・人・調べる所から離れている・
     置いても町に着いた所から行ける場所が足もと以外は1つも減らない」所を探して固定した
   ・ポヨ村（3D版で 3D で描く村）・リヴェル城下町（第1段階で職人通りを足した）・トレディア（新しい町）は対象外
   セーブの互換：既存のマップID・座標は変えない。既存の町に増えるのは建物1つ（足もとのマスが通れなくなる）だけ。
     旧セーブでその足もとに立っていた場合は、マップに入るときの既存の処理（World.enterMap の nearestFree）でいちばん近い通れるマスへ移る
   ========================================================= */
(function (root) {
  'use strict';
  var M = root.MAP_DEFS; var add = root.TownKit.add;
  function D() { return root.State.data; }
  function flag(k) { return !!(D() && D().flags[k]); }
  var EX = root.EXPAND_A = root.EXPAND_A || { maps: [], patched: [] }; var S3 = EX.stage3 = { maps: [], patched: [], homes: [] };
  function reg(def) { add(def); EX.maps.push(def.id); S3.maps.push(def.id); return def; }
  function patched(id) { if (EX.patched.indexOf(id) < 0) EX.patched.push(id); if (S3.patched.indexOf(id) < 0) S3.patched.push(id); }
  function setRow(def, x, y, ch) { var r = def.rows[y]; def.rows[y] = r.slice(0, x) + ch + r.slice(x + 1); }

  /* ---------- 家の中の間取り（12×9。入口は下の (5,8)、入ってすぐ (5,7)） ---------- */
  var T = {
    farm: ['############', '#E__E___qqz#', '#__________#', '#_tt___K___#', '#__________#', '#_z______a_#', '#__________#', '#__________#', '#####D######'],
    miner: ['############', '#E_E_E__zzq#', '#__________#', '#_t_____KK_#', '#__________#', '#zz______q_#', '#__________#', '#__________#', '#####D######'],
    noble: ['############', '#KKK_pp_KKK#', '#____pp____#', '#_t__pp__E_#', '#____pp____#', '#_a__pp__a_#', '#____pp____#', '#____pp____#', '#####D######'],
    scholar: ['############', '#KKKK__KKKK#', '#__________#', '#_t_t__t_t_#', '#__________#', '#K________E#', '#K_________#', '#__________#', '#####D######'],
    merchant: ['############', '#qqz_KK_zqq#', '#__________#', '#_TTT____E_#', '#__________#', '#_z_____t__#', '#__________#', '#__________#', '#####D######'],
    tent: ['############', '#E___i___E_#', '#__________#', '#__t___zq__#', '#__________#', '#_K________#', '#__________#', '#__________#', '#####D######'],
    ruin: ['############', '#W_zz__W_K_#', '#_____W____#', '#_z__t_____#', '#W_______zW#', '#___q______#', '#__________#', '#__________#', '#####D######'],
    snow: ['############', '#E_E_i__KK_#', '#__________#', '#_tt____q__#', '#__________#', '#a______z__#', '#__________#', '#__________#', '#####D######'],
    smith: ['############', '#i_TTT__zz_#', '#__________#', '#_q_____K__#', '#__________#', '#E_______z_#', '#__________#', '#__________#', '#####D######'],
    district: ['############', '#E_E_E_E_K_#', '#__________#', '#_t_t__t_t_#', '#__________#', '#__________#', '#q________z#', '#__________#', '#####D######']
  };
  var DESK = { farm: [2, 3], miner: [2, 3], noble: [2, 3], scholar: [2, 3], merchant: [2, 3], tent: [3, 3], ruin: [5, 3], snow: [2, 3], smith: [2, 3], district: [2, 3] };

  // 町に家を1軒：spot＝[x, y, 幅, 高さ, 入口の位置]、o＝{ name, layout, people:[…], desk:[…文], spark:{ loot }, gift:{ item, qty, text } }
  function home(town, key, spot, o) {
    var def = M[town]; if (!def) return;
    var b = { id: 'a3_' + key, type: o.type || 'house', name: o.name, x: spot[0], y: spot[1], w: spot[2], h: spot[3], doorX: spot[4], interior: 'a3_' + key, entry: { x: 5, y: 7 } };
    var door = { x: b.x + b.doorX, y: b.y + b.h - 1 };
    def.buildings = def.buildings || []; def.buildings.push(b); patched(town);
    var dk = DESK[o.layout]; var npcs = (o.people || []).map(function (p, i) { return Object.assign({ id: 'a3_' + key + '_' + (i + 1), x: i === 0 ? 3 : 8, y: i === 0 ? 4 : 6, dir: 'down', wander: i === 0 ? 1 : 0 }, p); });
    var events = [];
    if (o.desk) events.push({ x: dk[0], y: dk[1], type: 'inspect', solid: true, text: o.desk });
    if (o.gift) npcs[0].talk = (function (orig, g, fk) { return async function (c) { await orig(c); if (!c.flag(fk)) { c.setFlag(fk, true); if (g.text) await c.say(npcs[0].name || '住人', g.text); c.give(g.item, g.qty || 1); await c.msg([root.ITEMS[g.item].name + (g.qty > 1 ? '×' + g.qty : '') + 'を手に入れた！']); } }; })(npcs[0].talk, o.gift, 'a3_' + key + '_gift');
    reg({ id: 'a3_' + key, name: o.iname || o.name, kind: 'interior', bgm: 'town', rows: T[o.layout].slice(), warps: [{ x: 5, y: 8, to: town, tx: door.x, ty: door.y + 1 }], events: events, npcs: npcs });
    if (o.spark) root.SEARCH_POINTS = (root.SEARCH_POINTS || []).concat([{ id: 'sp_a3_' + key, map: 'a3_' + key, x: 9, y: 7, kind: 'sparkle', loot: o.spark }]);
    S3.homes.push({ town: town, map: 'a3_' + key, building: b.id });
  }
  function say(name, lines) { return async function (c) { await c.say(name, typeof lines === 'function' ? lines(c) : lines); }; }

  /* =========================================================
     18の町
     ========================================================= */
  home('dow_village', 'dow_hunter', [7, 12, 6, 4, 2], { name: '狩人の家', layout: 'farm',
    people: [{ name: '狩人の妻', sprite: 'villager_f', talk: say('狩人の妻', function (c) { return c.flag('forest_boss') ? ['森の迷子の魔物が倒れてから、夫は毎日獲物を持って帰ってくるわ。', '「獣道は、一度できたらしばらく続く。途中で逆を向いたら、まず立ち止まれ」……夫の口ぐせよ。'] : ['夫は狩りに出たまま。迷いの森の奥は、獣道さえ途中で消えるんですって。', '……道が消えたら、無理に進まずに引き返す。それがこの村の決まりよ。']; }) },
      { name: '狩人の子', sprite: 'child', wander: 1, talk: say('狩人の子', ['父ちゃんはね、足あとの向きで獲物がどっちへ行ったかわかるんだ。', '「足あとが重なってたら、そっちが本道」だって！']) }],
    desk: ['机の上に、手描きの獣道の地図。', '太い線と細い線。細い線には「ここで逆向きの足あと。追うな」と書き込みがある。'], spark: { item: 'onigiri', qty: 1 },
    gift: { item: 'herb', qty: 3, text: ['これ、森で摘んだ薬草。旅のお守りに持っていって。'] } });

  home('harbor_town', 'harbor_net', [15, 4, 6, 4, 2], { name: '網元の家', layout: 'farm',
    people: [{ name: '網元の老人', sprite: 'elder', talk: say('網元の老人', function (c) { return c.flag('ship_ready') ? ['船が直ったそうだな。出るなら、潮が満ちきる前だ。', '潮は満ちて引く。引きはじめに慌てて出る者が、いちばん沖で困る。'] : ['わしはこの港で五十年、網を引いてきた。', '潮は満ちて引く。いつ引くかは潮見表でだいたいわかるが、「だいたい」を忘れた者から海に呑まれる。']; }) },
      { name: '網を繕う娘', sprite: 'villager_f', talk: say('網を繕う娘', ['網の目がひとつ破れると、魚はそこから全部逃げるの。', 'だから毎晩、ひとつずつ確かめて繕う。……地味だけど、いちばん大事な仕事。']) }],
    desk: ['壁に潮見表。満潮と干潮の時刻が、ひと月分ならんでいる。', '端に赤い字で「嵐の日は表を信じるな」。'], spark: { item: 'yakitori', qty: 1 },
    gift: { item: 'potion', qty: 2, text: ['ほれ、船乗りの常備薬だ。持っていけ。'] } });

  home('verum_town', 'verum_row', [15, 1, 6, 4, 2], { name: '坑夫の長屋', layout: 'miner',
    people: [{ name: '老坑夫', sprite: 'villager_m', talk: say('老坑夫', function (c) { return c.flag('verum_liberated') ? ['自治会ができてから、配給の札は自分たちで刷っている。札の数と粥の量が合っているか、毎晩みんなで数えるんだ。', '……数えるのは面倒だ。だが、数えない者に任せた結果を、わしらは知っている。'] : c.flag('verum_overseer_defeated') ? ['監督官が倒れた……らしい。だが鎖はまだ外れていない。', '急に自由と言われても、何から決めればいいのか。わしらは、ずっと決められる側だった。'] : ['……この長屋に住んで三十年。灰の降らない日は、一日もなかった。', '働かぬ者に食料はない。……働いても、足りたことはない。']; }) },
      { name: '坑夫の子', sprite: 'child', talk: say('坑夫の子', ['坑道の奥で、カナリアが鳴きやんだら、すぐ逃げるんだよ。', '父ちゃんが言ってた。「鳴きやんでから考えるやつは、間に合わない」って。']) }],
    desk: ['机の上に、配給の札の束。', '一枚ごとに日付と名前。破れた札は、紐で丁寧に綴じてある。'], spark: { item: 'curry_rice', qty: 1 },
    gift: { item: 'antidote', qty: 2, text: ['坑道のガスに当たったら、これを噛め。持っていきな。'] } });

  home('kalion_city', 'kalion_estate', [42, 1, 4, 4, 1], { name: '北区の屋敷', layout: 'noble',
    people: [{ name: '屋敷の主人', sprite: 'merchant', talk: say('屋敷の主人', function (c) { return c.flag('kalion_reformed') ? ['返還令で、私の資産も調べられたよ。……結果は「適正」。', '正しく払ってきた記録が、最後に私を守ってくれた。南区の人たちには、守ってくれる記録がなかったのだがね。'] : ['北区の屋敷へようこそ。税は重いが、私は一度も滞らせたことがない。', '……南区の連中は「払えない」と言う。払えないのか、払わないのか。私には見分けがつかない。']; }) },
      { name: '屋敷の使用人', sprite: 'villager_f', talk: say('屋敷の使用人', function (c) { return c.flag('kalion_reformed') ? ['わたし、南区の生まれなの。返還令で、家族の織機が戻ってきたわ。', 'ここの仕事は続けてる。旦那様は、南区の話を前より聞いてくれるようになった。'] : ['わたしは南区の生まれ。ここで働いて、家族に仕送りしているの。', '……旦那様には内緒よ。南区の話をすると、機嫌が悪くなるから。']; }) }],
    desk: ['机の上に、納税証明の束。十年分、一枚も欠けていない。', '束の下に、南区の地図。赤い印がいくつも付いている。'], spark: { item: 'coffee', qty: 1 },
    gift: { item: 'hi_potion', qty: 1, text: ['旅の方か。これを。……施しではない、通行税の払い戻しだと思ってくれ。'] } });

  home('sentra_capital', 'sentra_noble', [32, 2, 6, 4, 2], { name: '老貴族の屋敷', layout: 'noble',
    people: [{ name: '老貴族', sprite: 'elder', talk: say('老貴族', function (c) { return c.flag('sevran_fallen') ? ['大宰相が倒れて、屋敷の門から親衛隊がいなくなった。……静かすぎて眠れんよ。', '没収品の倉庫に、わしの父の剣があるそうだ。返してもらうか迷っている。あれは、税の代わりに差し出したものだからな。'] : ['王宮の隣に住むというのは、窓から親衛隊の槍が見えるということだ。', '大宰相セヴラン閣下は、飢饉の年に家族を亡くされた。……だから「すべてを記録する」とおっしゃる。わしには、反対する言葉がない。']; }) },
      { name: '家庭教師', sprite: 'scholar', talk: say('家庭教師', ['この家の孫に、読み書きと帳簿を教えています。', '帳簿は「何が起きたか」を書くもので、「何が起きるか」を決めるものではない。……その違いが、一番教えにくい。']) }],
    desk: ['壁に古い肖像画。王冠を戴いた人物と、その横に若い日の老貴族。', '王がまだ「王」だった頃の絵だ。'], spark: { item: 'curry_rice', qty: 1 },
    gift: { item: 'ether', qty: 2, text: ['若い人、これを持っていきなさい。わしにはもう、使う魔力もない。'] } });

  home('aruna_village', 'aruna_hut', [26, 1, 4, 4, 1], { name: '漂着者の小屋', layout: 'farm',
    people: [{ name: '漂着した船大工', sprite: 'sailor', talk: say('漂着した船大工', function (c) { return c.flag('lighthouse_lit') ? ['灯台に灯がともってから、交易船がこの島を見つけてくれるようになった。', '俺はもう帰れる。……でも、ここで船を直す仕事を続けることにしたよ。灯りの下なら、また誰かが流れ着いても見つけられる。'] : ['嵐で船が割れて、気がついたらこの島の浜にいた。', '灯台が灯らないから、交易船はこの島を素通りする。……灯りがないと、ここにいることすら伝わらないんだ。']; }) }],
    desk: ['流木を削って作った、小さな船の模型。', '船底に「次は、嵐でも割れない船を」と刻んである。'], spark: { item: 'fruit_juice', qty: 1 },
    gift: { item: 'hi_potion', qty: 1, text: ['浜に流れ着いた薬箱の中身だ。俺より、あんたたちのほうが役に立てる。'] } });

  home('aruna_ruins', 'ruins_keeper', [22, 16, 5, 4, 2], { name: '灯守りの家', iname: '灯守りの家（中は荒れている）', layout: 'ruin', type: 'house',
    people: [{ name: '影', sprite: 'shadow', hideIf: 'lighthouse_lit', talk: say('影', ['……油……油を……絶やすな……', '……灯りが……見えなく……なったら……誰も……帰って……こない……']) }],
    desk: ['灯守りの日誌。最後のページ。', '「油の値が上がり、灯をひと晩おきにした。ひと晩なら大丈夫だと思った。その晩に、船が三隻、岩に乗り上げた」'], spark: { item: 'ether', qty: 1 } });

  home('tempus_city', 'tempus_clock', [14, 12, 4, 4, 1], { name: '時計職人の家', layout: 'scholar',
    people: [{ name: '時計職人', sprite: 'elder', talk: say('時計職人', function (c) { return c.flag('time_bank_freed') ? ['時の銀行の契約が消えてから、町の時計がまた同じ速さで動き出した。', '時計は未来を決めない。今が何時かを教えるだけだ。……それで十分なんだ。'] : ['この町では、時計が狂う。わしの作った時計でさえ、鐘が鳴るたびに少しずつずれる。', '「明日」を担保に金を借りる者が増えた。……時計職人として言わせてもらえば、明日は売り物じゃない。']; }) },
      { name: '時計職人の弟子', sprite: 'villager_m', talk: say('時計職人の弟子', ['師匠は、ずれた時計を直すとき、いきなり針を動かさないんです。', '「まず、どれだけずれているかを毎日記録しろ。直すのは、そのあとだ」って。']) }],
    desk: ['止まった振り子時計。振り子の下に、ずれの記録の紙が何枚も挟んである。', '「一日に三分。鐘の日は七分」……几帳面な字だ。'], spark: { item: 'coffee', qty: 1 },
    gift: { item: 'wake_bell', qty: 2, text: ['目覚ましの鈴だ。時計がなくても、これなら起きられる。'] } });

  home('node_city', 'node_family', [14, 11, 4, 4, 1], { name: '識別票のない家', layout: 'district',
    people: [{ name: '母親', sprite: 'villager_f', talk: say('母親', function (c) { return c.flag('zeromea_reformed') ? ['識別票は、つけるかどうかを自分で選べるようになったの。', 'うちはまだつけていない。……選べるようになって初めて、ゆっくり考えられる気がするの。'] : ['うちは識別票をつけていないの。だから、配給はいつも最後。', 'オラクルの計算では、うちの家族は「いない」ことになっている。……いないはずの子が、毎朝おなかをすかせて起きてくるのよ。']; }) },
      { name: '子ども', sprite: 'child', talk: say('子ども', ['ドローンが来たら、じっとしてるんだよ。動くと「異常」って言われるから。', '……でも、ほんとはね、走るの大好き。']) }],
    desk: ['机の上に、手書きの配給の記録。「もらえた日」「もらえなかった日」。', 'もらえなかった日のほうが、少しずつ減ってきている。'], spark: { item: 'mana_soda', qty: 1 },
    gift: { item: 'ether', qty: 2, text: ['これ、配給の余り。……余りなんて、初めて出たのよ。'] } });

  home('scheduled_district', 'district_9', [26, 10, 4, 4, 1], { name: '9号棟', layout: 'district',
    people: [{ name: '保守係の老人', sprite: 'elder', talk: say('保守係の老人', function (c) { return c.flag('zeromea_reformed') ? ['保守係は、居住区の配管や灯りを直す係だ。オラクルが割り当てなくなっても、壊れるものは壊れる。', '……明日の予定表が空欄？ 空欄でいい。壊れた所を見つけたら、そこに書けばいいんだ。'] : ['わしは保守係だ。居住区の配管と灯りを直している。オラクルが割り当てた仕事だ。', '割り当てられた仕事でも、直した灯りがつくと、うれしいものだよ。']; }) }],
    desk: ['壁の予定表。上の段はびっしり埋まっていて、下の段は真っ白。', '真っ白な欄の隅に、子どもの字で「たんけん」と書いてある。'], spark: { item: 'ramen', qty: 1 },
    gift: { item: 'hi_ether', qty: 1, text: ['配管の点検で見つけたものだ。わしより、あんたたちに必要だろう。'] } });

  home('magicka_city', 'magicka_crafter', [15, 15, 5, 4, 2], { name: '魔導具職人の家', layout: 'smith',
    people: [{ name: '魔導具職人', sprite: 'master', talk: say('魔導具職人', function (c) { return c.flag('magicka_choice_done') ? ['研究の扱いが決まってから、魔導具の注文票に「使い道」の欄ができた。', '書きたくない客もいる。……書かない客には、売らないことにしたよ。'] : ['魔導具はよく売れる。誰に売れているかは……あまり考えないようにしている。', '道具は道具だ。……そう言い聞かせて、今日も炉に火を入れる。']; }) },
      { name: '見習い', sprite: 'villager_m', talk: say('見習い', ['親方の魔導ランプは、明るさを三段階に変えられるんです。', 'いちばん明るくすると、すぐ魔力が切れる。「明るすぎる灯りは、長くはもたない」って。']) }],
    desk: ['作業台の上の試作品。魔力の灯りで光る小さなランプ。', '札に「民生用。武器への転用は不可」と、太い字で書いてある。'], spark: { item: 'mana_soda', qty: 1 },
    gift: { item: 'mana_soda', qty: 2, text: ['試作の魔力のソーダだ。味の感想を聞かせてくれよ。'] } });

  home('star_camp', 'star_tent', [1, 1, 6, 4, 2], { name: '観測者の天幕', layout: 'tent',
    people: [{ name: '星の観測者', sprite: 'scholar', talk: say('星の観測者', ['星見塔に登る前の夜は、ここで星図を見ていくといい。', '同じ星でも、毎晩少しずつ位置がずれる。一晩だけ見て「動かない」と決めた者は、だいたい道に迷う。']) }],
    desk: ['机の上に、何十枚も重ねた星図。', '同じ星に、毎晩小さな点が打ってある。点をつなぐと、ゆっくりとした弧になる。'], spark: { item: 'green_tea', qty: 1 },
    gift: { item: 'ether', qty: 2, text: ['夜の観測は魔力を使う。余りものだが、持っていきなさい。'] } });

  home('sahar_city', 'sahar_water', [13, 11, 6, 4, 2], { name: '水売りの家', layout: 'merchant',
    people: [{ name: '水売り', sprite: 'merchant', talk: say('水売り', ['水の値段？ 隊商の季節は上がって、去ると下がる。……それは毎年のことだ。', 'でも、四十年分の帳面を並べると、底の値段が少しずつ上がっている。季節の波の下に、ゆっくりした流れがあるんだ。']) },
      { name: '水売りの祖母', sprite: 'elder', talk: say('水売りの祖母', ['わたしが子どものころ、オアシスの水は井戸のふちまであったんだよ。', '一年ではわからない。十年で、やっとわかる。……そういう変わり方もあるのさ。']) }],
    desk: ['水がめの内側に、毎年の水位が刻んである。', 'いちばん上の線と、いちばん下の線の間に、四十本の細い線。'], spark: { item: 'fruit_juice', qty: 1 },
    gift: { item: 'fruit_juice', qty: 2, text: ['砂漠を歩くなら、水より甘いものがいい日もある。持っていきな。'] } });

  home('mirror_market', 'mirror_changer', [5, 2, 6, 4, 2], { name: '両替商の家', layout: 'merchant',
    people: [{ name: '両替商', sprite: 'merchant', talk: say('両替商', ['この市場の値段は、噂で毎日変わる。', 'だがな、噂で上がった値は、噂で戻る。わしは「噂の前の値段」を帳面につけておく。戻る先がわかれば、慌てずにすむ。']) }],
    desk: ['古い相場帳。毎日の値段の横に、小さく「噂あり」「噂なし」と書き分けてある。', '「噂あり」の日の値動きは大きく、三日もすると「噂なし」の値段の近くに戻っている。'], spark: { item: 'yakitori', qty: 1 },
    gift: { item: 'hi_potion', qty: 1, text: ['市場で余った薬だ。噂では高く売れるそうだが……噂だからな。持っていけ。'] } });

  home('ignas_town', 'ignas_smith_home', [11, 20, 5, 3, 2], { name: '鍛冶師の家', layout: 'smith',
    people: [{ name: '鍛冶師の妻', sprite: 'villager_f', talk: say('鍛冶師の妻', function (c) { return c.flag('festival_lit') ? ['火祭りの炎がともってから、夫は前より遅くまで炉の前にいるわ。', '「いい火があると、焦らずに打てる」んですって。'] : ['夫は鍛冶街でいちばん頑固な鍛冶師よ。', '打ち損じた剣は、絶対に売らない。全部この家の棚に飾ってあるの。……戒めなんですって。']; }) },
      { name: '鍛冶師の子', sprite: 'child', talk: say('鍛冶師の子', ['父ちゃんの失敗作の剣、ぜんぶ名前がついてるんだ。「焦り」「欲ばり」「寝不足」……！']) }],
    desk: ['棚に、刃のゆがんだ剣が何本も飾ってある。', 'それぞれの札に「焦り」「欲ばり」「寝不足」「人の言いなり」……失敗の理由が書いてある。'], spark: { item: 'deluxe_steak', qty: 1 },
    gift: { item: 'hi_potion', qty: 1, text: ['鍛冶場のやけどに使う薬よ。旅にも役立つはず。'] } });

  home('frost_town', 'frost_keeper', [13, 12, 6, 4, 2], { name: '記憶を売らなかった家', layout: 'snow',
    people: [{ name: '老婦人', sprite: 'elder', talk: say('老婦人', function (c) { return c.flag('memory_core_done') ? ['記憶の取引が止まって、町の人がまた自分の思い出話をするようになったよ。', '下手な話でもいい。自分の記憶は、自分の口で話すから意味があるんだ。'] : ['この町では記憶が売れる。夏の記憶、恋の記憶、母の記憶……いい値がつくそうだね。', 'わたしは一つも売らなかった。苦い記憶もね。苦い記憶がないと、同じ失敗をもう一度するから。']; }) }],
    desk: ['壁一面に刻まれた、一族の歴史。', '良いことも悪いことも、同じ大きさの字で刻んである。いちばん新しい行は「今年の冬は寒い。薪を早めに」。'], spark: { item: 'coffee', qty: 1 },
    gift: { item: 'hi_ether', qty: 1, text: ['寒さで頭が回らなくなったら、これを飲みなさい。'] } });

  home('luxbell', 'luxbell_dice', [3, 1, 6, 4, 2], { name: 'サイコロ職人の家', layout: 'merchant',
    people: [{ name: 'サイコロ職人', sprite: 'master', talk: say('サイコロ職人', ['うちはカジノのサイコロを作っている。公平かどうかは、六百回振って確かめるんだ。', '十回振って六が四回出ても、それだけでは何もわからない。……人は十回で「わかった」気になる。そこが一番危ない。']) },
      { name: '職人の娘', sprite: 'villager_f', talk: say('職人の娘', ['父さんは、ひとつのサイコロを決めるのに丸一日かけるの。', '「速く決めたいときほど、回数を増やせ」って。変でしょ？ でも、間違ったことは一度もないのよ。']) }],
    desk: ['試験記録の帳面。「六百回：一の目98・二の目103・三の目97・四の目101・五の目99・六の目102　合格」', '別のページ：「十回：六の目4　判定せず」'], spark: { item: 'fruit_juice', qty: 1 },
    gift: { item: 'hi_potion', qty: 1, text: ['カジノの景品の余りよ。賭けなくてももらえるのが、うちのいいところ。'] } });

  home('volatilia', 'vol_lodging', [14, 20, 5, 4, 2], { name: '研究生の下宿', layout: 'scholar',
    people: [{ name: '下宿の学生', sprite: 'scholar', talk: say('下宿の学生', ['実験の結果が一回だけ出た。……でも、もう一度やったら出なかった。', 'アルマ先生には「再現できない結果は、結果ではない」と言われたよ。悔しいけど、その通りなんだ。']) },
      { name: '下宿のおかみ', sprite: 'innkeeper', talk: say('下宿のおかみ', ['うちの下宿人は、夜中まで机に向かってる子ばかりさ。', 'ご飯だけは決まった時間に出すの。研究はぶれても、ご飯の時間はぶれないようにね。']) }],
    desk: ['書きかけの論文。表題は「一回きりの成功について」。', '余白に赤字で「試行回数は？」「比べる相手は？」「偶然でない根拠は？」'], spark: { item: 'coffee', qty: 1 },
    gift: { item: 'ether', qty: 2, text: ['夜ふかしの下宿人の差し入れ用だけど、あんたたちにもあげる。'] } });

  /* =========================================================
     空きのない3つの町：既存の建物の奥に部屋を1つ（建物の中の床1マスを階段・出入口にする）
     ========================================================= */
  function backRoom(interior, at, ch, roomId, name, rows, back, o) {
    var def = M[interior]; if (!def || def.rows[at[1]][at[0]] !== (o.was || '_')) return;
    setRow(def, at[0], at[1], ch); def.warps.push({ x: at[0], y: at[1], to: roomId, tx: back.tx, ty: back.ty, name: name }); patched(interior);
    reg({ id: roomId, name: name, kind: 'interior', bgm: o.bgm || 'town', rows: rows, warps: [{ x: back.x, y: back.y, to: interior, tx: o.ret[0], ty: o.ret[1], name: o.retName }], events: o.events || [], npcs: o.npcs || [], chests: o.chests || [] });
    if (o.spark) root.SEARCH_POINTS = (root.SEARCH_POINTS || []).concat([{ id: 'sp_a3_' + roomId, map: roomId, x: o.spark.x, y: o.spark.y, kind: 'sparkle', loot: o.spark.loot }]);
    S3.homes.push({ town: o.town, map: roomId, via: interior });
  }
  // 地図から消えた村：村長の家の地下＝村が自分で残してきた記録
  backRoom('erased_elder', [10, 7], '>', 'a3_erased_cellar', '村長の家・地下の書庫', ['############', '#KKK__KKK_<#', '#__________#', '#_t__t_____#', '#__________#', '#K__z____K_#', '#__________#', '############'], { x: 10, y: 1, tx: 9, ty: 1 },
    { town: 'erased_village', ret: [9, 7], retName: '村長の家へ', bgm: 'dungeon',
      events: [{ x: 2, y: 3, type: 'script', solid: true, run: async function () { await root.ExpandA3.erasedLedger(); } }],
      npcs: [{ id: 'a3_erased_scribe', x: 6, y: 4, sprite: 'child', dir: 'up', wander: 1, talk: say('村長の孫', ['ここはね、村の「ほんとの記録」の部屋。', '地図から消されても、生まれた子と、取れた麦と、亡くなった人は、ぜんぶここに書いてあるんだよ。']) }],
      spark: { x: 8, y: 6, loot: { item: 'onigiri', qty: 2 } } });
  // 前線基地：武器庫の奥＝作戦天幕
  backRoom('dark_armory', [11, 7], 'D', 'a3_dark_command', '作戦天幕', ['############', '#K__TTTT__K#', '#__________#', '#_t______t_#', '#__________#', '#q___X____z#', '#__________#', 'D__________#', '############'], { x: 0, y: 7, tx: 1, ty: 7 },
    { town: 'dark_camp', was: '#', ret: [10, 7], retName: '武器庫へ',
      events: [{ x: 5, y: 5, type: 'inspect', solid: true, text: ['作戦卓の上の地図。虚無の荒野に、各国の義勇兵の印が並んでいる。', 'カリオン・ヴェルム・ゼロメア・マクディア……かつて争った国の印が、同じ線の上にある。'] }],
      npcs: [{ id: 'a3_dark_staff', x: 6, y: 2, sprite: 'guard', dir: 'down', wander: 0, talk: say('作戦参謀', ['ここは作戦天幕。義勇兵の配置と補給を決めている。', '一番もめるのは補給だ。前に出る者ほど多く欲しがるが、全員に行き渡らなければ、前の者もいずれ倒れる。']) }],
      spark: { x: 8, y: 6, loot: { item: 'ether', qty: 1 } } });
  // 氷港シエル：港の詰所の2階＝見張り台
  backRoom('ciel_harbor', [10, 7], '<', 'a3_ciel_lookout', '港の詰所・見張り台', ['############', '#_______KK_#', '#_X______t_#', '#__________#', '#__________#', '#q________>#', '#__________#', '############'], { x: 10, y: 5, tx: 9, ty: 5 },
    { town: 'ciel_port', ret: [9, 7], retName: '詰所へ',
      events: [{ x: 2, y: 2, type: 'inspect', solid: true, text: ['見張り用の望遠鏡。凍った海の向こうに、流氷の帯がゆっくり動いている。', '流氷の帯の切れ目を毎日記録した帳面が、横に置いてある。'] }],
      npcs: [{ id: 'a3_ciel_watch', x: 5, y: 3, sprite: 'sailor', dir: 'up', wander: 1, talk: say('見張りの船乗り', ['流氷の切れ目は、毎日少しずつ場所が変わる。', '昨日通れた道が、今日も通れるとは限らない。だから毎朝ここに登って、自分の目で確かめるんだ。']) }],
      spark: { x: 8, y: 6, loot: { item: 'coffee', qty: 1 } } });

  /* ---------- 出来事 ---------- */
  var A3 = root.ExpandA3 = {};
  A3.erasedLedger = async function () {
    var d = D(); var l = ['分厚い記録帳。「誕生」「死亡」「収穫」「借り」「返し」。', '十年分。一日も欠けずに、村の人の字で書いてある。'];
    l.push(d.flags.erased_choice_done ? '最後のページに、新しい行：「記録を持って、外へ出ることを決めた日」。' : '最後のページは、まだ白い。');
    await root.Win.message(l);
  };
})(typeof window !== 'undefined' ? window : globalThis);
