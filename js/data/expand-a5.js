/* =========================================================
   Data / Phase A 第5段階（v6.4）：フィールド（12の地域）の見た目と生活圏
   ・道：L字の角を丸め、長い直線の途中を1マスずらして蛇行させる（道と地面はどちらも通れるので、通れる場所は変わらない）
   ・生活圏：村・町の入口のまわりの草地に畑（通れる）を2か所まで
   ・遺跡：地域ごとに2か所、道の近くに古い石畳（通れる）と、調べると地域の昔の話が読める所
   ・通れるマス・通れないマスは1つも変えない。海・浅瀬・橋・桟橋・場所の入口・宝箱・人・イベント・ワープも変えない（テストで全マス比べる）
   ・川・湖・山・森の配置は変えていない（通れる場所が変わり、航路と陸路の確認が大きくなるため。この段階では見送り）
   ========================================================= */
(function (root) {
  'use strict';
  var M = root.MAP_DEFS;
  var EX = root.EXPAND_A = root.EXPAND_A || { maps: [], patched: [] }; var S5 = EX.stage5 = { fields: [], ruins: [], farms: 0, bends: 0, meanders: 0 };
  var PLAIN = { '.': 1, ',': 1, 's': 1, 'n': 1, '8': 1, '+': 1 };
  var LORE = {
    world: [['古い関所の跡。石畳に、荷車の轍が二本、深く刻まれている。', '行きと帰りで、轍の深さが少し違う。重い荷を運んだのは、どちらの向きだったのだろう。'], ['崩れた道標。「←リヴェル　ダウ→」', '下に小さく、誰かの字で「迷ったら、来た道を一度ふり返れ」。']],
    world_grania: [['灰に埋もれた道標。「鉱山へ　三里」', '誰かが「三里」を消して、「遠い」と書き直している。'], ['古い配給所の礎石。配給の量を刻んだ目盛りが並んでいる。', '下の目盛りほど、指でなぞられてすり減っている。']],
    world_kalion: [['徴収所の跡。壁はなく、帳簿を置いた石の台だけが残っている。'], ['小さな石碑。「この道を通る者は、通行税を払うこと」', '税の額の所だけ、何度も彫り直した跡がある。']],
    world_islands: [['灯台の土台の跡。ここにも昔、灯りがあったらしい。', '石の隙間に、燃え残った芯が一本はさまっている。'], ['漂着物を積んだ石塚。いちばん上に、割れた羅針盤が置いてある。', '針は、まだ北を指している。']],
    world_tempus: [['古い日時計。影の目盛りが二重に刻まれている。', '片方の目盛りは、もう片方より少しずつずれている。……どちらが正しいかは、書いていない。'], ['石の暦。「鐘が鳴る日は、ここで休め。急ぐ者ほど、時を失う」']],
    world_machine: [['止まった中継柱の跡。台座に「識別票の読み取り範囲：ここまで」と刻まれている。', 'その線のすぐ外側に、小さな花が咲いている。'], ['古い配給の受け渡し所。石の台に、名前ではなく番号だけが並んでいる。']],
    world_magicka: [['魔導の測量石。魔力の流れの向きを示す矢印が、いくつも重ねて刻まれている。', 'いちばん新しい矢印だけ、ほかと逆を向いている。'], ['崩れた見張り塔の土台。「王立学院まで　北へ」']],
    world_sky: [['雲の上の石畳。誰が、いつ、どうやって敷いたのかはわからない。', '石の目地に、地上の土が少しだけ詰まっている。'], ['風見の台座。風見そのものは、とうに飛ばされている。', '台座には「風は読むもので、決めるものではない」。']],
    world_dark: [['義勇兵の野営の跡。焚き火の石が、国ごとに違う組み方で並んでいる。'], ['黒い岩に刻まれた名前の列。', 'どの名前の横にも、同じ言葉。「ここまで来た」']],
    world_desert: [['隊商の井戸の跡。底は乾いている。', '縁の石に、毎年の水位の線が刻まれている。線は、四十本ほどで終わっている。'], ['砂に半分埋もれた道標。「次の水まで　二日」']],
    world_dragon: [['火山灰に埋もれた祠の跡。鍛冶の神に、打ち損じの刃を納めた場所らしい。', '割れた刃の一本一本に、失敗の理由が刻んである。'], ['溶岩の流れた跡を示す石。「ここより先、地面が熱い日は進むな」']],
    world_snow: [['雪に埋もれた石の暦。冬の日数を数える刻みが、びっしりと並ぶ。', '一番長い冬の刻みの横に「それでも春は来た」。'], ['古い山小屋の土台。壁はないが、風よけの石だけが残っている。']]
  };
  function hash(x, y, s) { var h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >> 13)) * 1274126177; h = h ^ (h >> 16); return ((h >>> 0) % 10000) / 10000; }

  var DEFS = Object.keys(M).map(function (k) { return M[k]; }); if (root.WORLD_DEF && DEFS.indexOf(root.WORLD_DEF) < 0) DEFS.push(root.WORLD_DEF);   // 最初の大陸（world）は MAP_DEFS とは別に持っている
  DEFS.forEach(function (def) {
    var id = def.id; if (def.kind !== 'field' || typeof def.rows !== 'function') return;
    var orig = def.rows; var base = orig(); var H = base.length, Wd = base[0].length; var g = base.map(function (r) { return r.split(''); });
    var seed = id.length * 97 + id.charCodeAt(id.length - 1);
    var prot = {}; function protect(x, y, r) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) prot[(x + dx) + ',' + (y + dy)] = 1; }
    (def.locations || []).forEach(function (L) { protect(L.x, L.y, 2); });
    (root.SEARCH_POINTS || []).filter(function (p) { return p.map === id; }).forEach(function (p) { protect(p.x, p.y, 1); });   // 光る場所・壺・オーパーツ
    var VH = root.VEHICLES || {}; Object.keys(VH).forEach(function (k) { var h = VH[k] && VH[k].home; if (h && h.map === id) protect(h.x, h.y, 2); });   // 乗り物の初期位置
    (root.SEA_ROUTES || []).forEach(function (r) { [r.from, r.to].forEach(function (e) { if (e && e.map === id && e.x !== undefined) protect(e.x, e.y, 2); }); });
    (def.warps || []).concat(def.chests || [], def.npcs || [], def.events || []).forEach(function (o) { protect(o.x, o.y, 1); });
    for (var y = 0; y < H; y++) for (var x = 0; x < Wd; x++) { var c = g[y][x]; if (c === 'b' || c === 'd' || c === '1' || c === '2' || c === '3' || c === '4') protect(x, y, 1); }
    function at(x, y) { return (x < 0 || y < 0 || x >= Wd || y >= H) ? '~' : g[y][x]; }
    function plain(x, y) { return !!PLAIN[at(x, y)] && !prot[x + ',' + y]; }
    function landChar(x, y) { var cnt = {}; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var c = at(x + dx, y + dy); if (PLAIN[c]) cnt[c] = (cnt[c] || 0) + 1; } var best = null; Object.keys(cnt).forEach(function (k) { if (!best || cnt[k] > cnt[best]) best = k; }); return best || ({ sand: 's', snow: 'n', ash: '8' }[def.fallback] || '.'); }
    var isR = function (x, y) { return at(x, y) === 'r'; };
    // ---- 道：長い直線の途中を1マスずらす（横・縦）
    var meanders = 0;
    for (var pass = 0; pass < 2; pass++) {
      var horiz = pass === 0;
      for (var a = 0; a < (horiz ? H : Wd); a++) {
        var b = 0; var lim = horiz ? Wd : H;
        while (b < lim) {
          var X = function (i) { return horiz ? i : a; }, Y = function (i) { return horiz ? a : i; };
          if (!isR(X(b), Y(b))) { b++; continue; }
          var s = b; while (b < lim && isR(X(b), Y(b)) && !(horiz ? (isR(X(b), a - 1) || isR(X(b), a + 1)) : (isR(a - 1, Y(b)) || isR(a + 1, Y(b))))) b++;
          var e = b - 1; if (b === s) { b++; continue; }
          if (e - s + 1 >= 12) {
            var s2 = s + 4, e2 = e - 4; var sides = hash(s, a, seed) < 0.5 ? [1, -1] : [-1, 1];
            for (var si = 0; si < 2; si++) { var dd = sides[si]; var okk = true;
              for (var i = s2 - 1; i <= e2 + 1 && okk; i++) { var tx = horiz ? i : a + dd, ty = horiz ? a + dd : i; if (i >= s2 && i <= e2) { if (!plain(tx, ty)) okk = false; } var ox = horiz ? i : a + 2 * dd, oy = horiz ? a + 2 * dd : i; if (at(ox, oy) === 'r' || at(ox, oy) === 'b') okk = false; }
              for (var j = s2; j <= e2 && okk; j++) if (prot[(horiz ? j : a) + ',' + (horiz ? a : j)]) okk = false;
              if (!okk) continue;
              for (var k = s2; k <= e2; k++) { var px = horiz ? k : a, py = horiz ? a : k; var nx = horiz ? k : a + dd, ny = horiz ? a + dd : k; var lc = landChar(nx, ny); g[ny][nx] = 'r'; g[py][px] = lc; }
              meanders++; break; }
          }
        }
      }
    }
    // ---- 道：L字の角を丸める（角のマスを地面に、内側の斜めのマスを道に）
    var bends = 0;
    for (var y2 = 1; y2 < H - 1; y2++) for (var x2 = 1; x2 < Wd - 1; x2++) {
      if (!isR(x2, y2) || prot[x2 + ',' + y2]) continue;
      var hs = [-1, 1].filter(function (d) { return isR(x2 + d, y2); }), vs = [-1, 1].filter(function (d) { return isR(x2, y2 + d); });
      if (hs.length !== 1 || vs.length !== 1) continue;
      var ix = x2 + hs[0], iy = y2 + vs[0]; if (!plain(ix, iy)) continue;
      if (isR(x2 - hs[0], y2 - vs[0])) continue;
      var lc2 = landChar(x2 - hs[0], y2 - vs[0]); g[iy][ix] = 'r'; g[y2][x2] = lc2; bends++;
    }
    // ---- 生活圏：村・町の入口のまわりの草地に畑（3×2 か 2×3、2か所まで）
    var farms = 0;
    (def.locations || []).filter(function (L) { return L.icon === 'village'; }).forEach(function (L) {
      var cands = [];
      [[3, 2], [2, 3]].forEach(function (sz) { for (var dy = -6; dy <= 6; dy++) for (var dx = -6; dx <= 6; dx++) { var x0 = L.x + dx, y0 = L.y + dy; var dist = Math.max(Math.abs(dx), Math.abs(dy)); if (dist < 3) continue;
        var okf = true; for (var yy = y0 - 1; yy <= y0 + sz[1] && okf; yy++) for (var xx = x0 - 1; xx <= x0 + sz[0] && okf; xx++) { var inside = yy >= y0 && yy < y0 + sz[1] && xx >= x0 && xx < x0 + sz[0]; var c = at(xx, yy); if (inside ? !((c === '.' || c === ',') && !prot[xx + ',' + yy]) : (c === 'r' || c === 'b' || c === 'H' || c === '~' || c === 'w')) okf = false; }
        if (okf) cands.push({ x: x0, y: y0, w: sz[0], h: sz[1], d: dist + hash(x0, y0, seed) }); } });
      cands.sort(function (p, q) { return p.d - q.d; }); var used = [];
      cands.forEach(function (cd) { if (used.length >= 2) return; if (used.some(function (u) { return cd.x < u.x + u.w + 2 && cd.x + cd.w + 2 > u.x && cd.y < u.y + u.h + 2 && cd.y + cd.h + 2 > u.y; })) return;
        for (var yy = cd.y; yy < cd.y + cd.h; yy++) for (var xx = cd.x; xx < cd.x + cd.w; xx++) { g[yy][xx] = 'H'; prot[xx + ',' + yy] = 1; } used.push(cd); farms++; });
    });
    // ---- 遺跡：道の近く（2マス以内）・場所から6マス以上離れた平地に、古い石畳（十字）と調べる所。2か所まで、互いに20マス以上離す
    var lore = LORE[id] || []; var spots = [];
    var cand2 = [];
    for (var y3 = 2; y3 < H - 2; y3++) for (var x3 = 2; x3 < Wd - 2; x3++) {
      var okr = true; for (var dy3 = -1; dy3 <= 1 && okr; dy3++) for (var dx3 = -1; dx3 <= 1 && okr; dx3++) if (!plain(x3 + dx3, y3 + dy3)) okr = false;
      if (!okr) continue;
      if ((def.locations || []).some(function (L) { return Math.max(Math.abs(L.x - x3), Math.abs(L.y - y3)) < 6; })) continue;
      var nearRoad = false; for (var dy4 = -3; dy4 <= 3 && !nearRoad; dy4++) for (var dx4 = -3; dx4 <= 3; dx4++) if (Math.max(Math.abs(dx4), Math.abs(dy4)) >= 2 && at(x3 + dx4, y3 + dy4) === 'r') { nearRoad = true; break; }
      if (nearRoad) cand2.push({ x: x3, y: y3, k: hash(x3, y3, seed + 7) });
    }
    cand2.sort(function (p, q) { return p.k - q.k; });
    cand2.forEach(function (cd) { if (spots.length >= lore.length) return; if (spots.some(function (s) { return Math.abs(s.x - cd.x) + Math.abs(s.y - cd.y) < 20; })) return; spots.push(cd); });
    spots.forEach(function (sp, i) {
      g[sp.y][sp.x] = ':'; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { g[sp.y + d[1]][sp.x + d[0]] = '='; }); protect(sp.x, sp.y, 1);
      def.events = def.events || []; def.events.push({ x: sp.x, y: sp.y, type: 'inspect', solid: false, text: lore[i], a5ruin: true });
      S5.ruins.push({ map: id, x: sp.x, y: sp.y });
    });
    var out = g.map(function (r) { return r.join(''); });
    def.rows = function () { return out; }; def.rows.a5 = true; def.a5Base = base;
    S5.fields.push(id); S5.farms += farms; S5.bends += bends; S5.meanders += meanders;
    if (EX.patched.indexOf(id) < 0) EX.patched.push(id);
  });
})(typeof window !== 'undefined' ? window : globalThis);
