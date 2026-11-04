#!/bin/bash
# v7.4（戦闘背景39枚）3D の確認一式（ポート 8771 の配信で順に動かす。ヘッドレス Chromium・ソフトウェア描画）
cd /home/claude/mochipoyo-trade-quest && python3 -m http.server 8771 > /dev/null 2>&1 & SRV=$!
sleep 1; cd /home/claude/work/p3d; export PORT=8771; L=/home/claude/work/v74/3d
for t in p74b_fallback p73a_variety p72a_towns p71a_sky p71b_dungeon p70b_warpmarks p70a_exits p70c_sea p69a_prologue3d p69c_reload3d p68d_follow p68b_newcomp p70_bossname; do timeout 2400 node $t.js > $L/$t.log 2>&1; echo "== $t: EXIT $? $(grep -E '結果' $L/$t.log | tail -1 | cut -c1-160)"; done
for e in A B; do ENDING=$e timeout 1800 node p69b_ending3d.js > $L/p69b_$e.log 2>&1; echo "== p69b_ending3d $e: EXIT $? $(grep -E '結果' $L/p69b_$e.log | tail -1 | cut -c1-160)"; done
timeout 5400 node p70e_decor.js > $L/p70e_decor.log 2>&1; echo "== p70e_decor（テーマごとの飾り・既定の65か所）: EXIT $? $(grep -E '結果' $L/p70e_decor.log | tail -1 | cut -c1-160)"
kill $SRV; echo DONE3D
