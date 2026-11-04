#!/bin/bash
# v7.6 追加作業の最後の確認：最終のスナップショット（/home/claude/envsnap_final）を、このシェルだけ本来の場所に重ねて（mount --bind）2D の回帰一式と、3D の一部を動かす
mount --bind /home/claude/envsnap_final /home/claude/mochipoyo-trade-quest || exit 9
cd /home/claude/work && bash v76/run_all_env.sh > v76/run_all_final.log 2>&1; cp r76_extra.out v76/r76_extra_final.out; echo "2D DONE"
python3 -m http.server 8774 --directory /home/claude/mochipoyo-trade-quest > /dev/null 2>&1 & SRV=$!
sleep 1; cd /home/claude/work/p3d; export PORT=8774; L=/home/claude/work/v76/3d_final; mkdir -p $L
for t in p69c_reload3d p75b_save p71b_dungeon p70a_exits p72a_towns p70b_warpmarks p68d_follow p68c_shipbg; do timeout 2400 node $t.js > $L/$t.log 2>&1; echo "== $t: EXIT $? $(grep -E '結果' $L/$t.log | tail -1 | cut -c1-160)"; done
kill $SRV; echo "3D DONE"
