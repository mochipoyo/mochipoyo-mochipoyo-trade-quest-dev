#!/bin/bash
# v9.1 回帰テスト一式を「その時点の写し」で動かす：bash docs/tools/tl2/snapshot_regress.sh <ログ> [写しの場所 /home/claude/snap...]
#  ・動かしている途中で作業中のファイルを書き換えても結果が混ざらないように、リポジトリの写し（.git・three-src/node_modules・docs の大半を除く。smooth89 は three-src/src を読む）を作ってから動かす
#  ・既存の一式（v8.9 の regress89.sh・v9.0 の regress_tl.sh）は元のまま動かす（既知の NG もそのまま出る）。続けて tl2 の更新版テストと tl2 の新しいテストを動かす
#  ・作業用のテスト（/home/claude/work）は RPG_DIR で写しに向ける
#  ・このスクリプトを写して動かすときは、動かすたびに別の名前に写す（動いている途中で同じ名前に上書きすると、bash が途中から読み違える）
L=${1:?log}; SNAP=${2:-/home/claude/snap_adv}
case "$SNAP" in /home/claude/snap*) ;; *) echo "写しの場所は /home/claude/snap で始める"; exit 1;; esac
SRC=${SRC:-$(cd "$(dirname "$0")/../../.." && pwd)}   # 写して別の場所から動かすときは SRC=リポジトリ を付ける
[ -f "$SRC/index.html" ] && [ -f "$SRC/js/practice.js" ] || { echo "SRC がリポジトリではない：$SRC"; exit 1; }
[ -d "$SNAP" ] && rm -rf -- "$SNAP"
mkdir -p "$SNAP/docs" && cd "$SRC" && tar --exclude=./.git --exclude=./three-src/node_modules --exclude=./three-src/blender --exclude=./docs -cf - . | tar -xf - -C "$SNAP" && cp -r docs/tools "$SNAP/docs/" && mkdir -p "$SNAP/docs/ux88/logs" "$SNAP/docs/perf89/logs" && cp -r docs/ux88/logs/. "$SNAP/docs/ux88/logs/" 2>/dev/null; mkdir -p "$SNAP/docs/trading-learning" && cp -r docs/trading-learning/logs "$SNAP/docs/trading-learning/" 2>/dev/null   # tl_p5 が tm_adv_stats.json を読む
grep -rl '/home/claude/envwork' "$SNAP/docs/tools" | xargs sed -i "s#/home/claude/envwork#$SNAP#g"
: > $L; echo "写し：$SNAP（元 $SRC・$(cd $SRC && git rev-parse --short HEAD 2>/dev/null)＋作業中の変更）" >> $L
bash "$SNAP/docs/tools/v89/regress89.sh" $L.89 >/dev/null 2>&1; echo "##### v8.9 一式（regress89.sh）" >> $L; cat $L.89 >> $L
bash "$SNAP/docs/tools/tl/regress_tl.sh" $L.tl >/dev/null 2>&1; echo "##### v9.0 一式（regress_tl.sh）" >> $L; cat $L.tl >> $L
echo "##### tl2 の更新版（既知の NG の分類：docs/trade-advanced/PHASE0_AUDIT.md）" >> $L
cd /home/claude/work && for t in tradiatest learntest dojo_test; do echo "=== tl2/updated-tests/$t" >> $L; RPG_DIR=$SNAP/ timeout 1200 node $SNAP/docs/tools/tl2/updated-tests/$t.js 2>&1 | grep -E "結果|errors|ERRORS|CRASH|fails|NG |ALL" | tail -4 >> $L; done
cd $SNAP && for c in "tl2/updated-tests/tl_ui_test.js" "tl2/updated-tests/tl_ui_test.js 2d"; do echo "=== $c" >> $L; timeout 1200 node docs/tools/$c 2>&1 | grep -E "^結果|  NG |FAIL" | tail -4 >> $L; done
echo "##### tl2 の新しいテスト" >> $L
cd $SNAP && for t in $(ls docs/tools/tl2/tl*_test.js 2>/dev/null); do for m in "" 2d; do case "$t" in *ui*|*save*) ;; *) [ -n "$m" ] && continue;; esac; echo "=== $t $m" >> $L; timeout 1800 node $t $m 2>&1 | grep -E "^結果|  NG |FAIL" | tail -6 >> $L; done; done
echo done >> $L
