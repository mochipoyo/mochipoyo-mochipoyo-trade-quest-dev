#!/bin/bash
# v7.0 回帰テスト一式（2D・jsdom）：regress65（52本）＋ 追加（v6.7〜v6.9）＋ v7.0 の新しいテスト
cd /home/claude/work
LOGP=r70 EXTRA="bg65test astra65test" bash regress65.sh
OUT=r70_extra.out; rm -f $OUT
for t in chatter67test companion67test companion68test bg68test tweak68test; do timeout 1500 node $t.js > r70_$t.log 2>&1; echo "== $t: EXIT $? $(grep -E '結果' r70_$t.log | tail -1 | cut -c1-160)" >> $OUT; done
for t in v67/quiz67test ult/quiz_test ult/quiz_place_test s3121/prologue2d s3121/chapters2d s3121/qcheck v70/kalionnav v70/rename2d v70/sea2d v70/seareach v70/warpmark2d v70/widen2d v70/stuckcheck2 v70/solidwarps; do n=$(echo $t | tr '/' '_'); timeout 1500 node $t.js > r70_$n.log 2>&1; echo "== $t: EXIT $? $(grep -E '結果|NG|件数' r70_$n.log | tail -1 | cut -c1-160)" >> $OUT; done
echo DONE >> $OUT
