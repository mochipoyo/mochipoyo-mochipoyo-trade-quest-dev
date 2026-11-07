#!/bin/bash
# v8.2 最終の撮影と動画（スナップショット /home/claude/envsnap_a82t4）
S=/tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/ao
R=/home/claude/work/p3d/shots/v82
cd /home/claude/work/p3d
python3 -m http.server 8795 --directory /home/claude/envsnap_a82t4 > /dev/null 2>&1 &
SRV=$!
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:8795/3d/index.html && break; sleep 0.3; done
echo "start $(date +%T)" > $S/final_progress.txt
# C：ふつうのカメラで、町から見た城（楼門の南）・城郭区画の前庭・学院の本館の前（PC とスマホ）
GAT="rivel_town:35:19:up,sentra_capital:33:14:up,magicka_city:32:13:up,rivel_castle_approach:32:30:up,sentra_palace_approach:30:30:up,magicka_palace_approach:28:30:up,volatilia:10:29:up"
PORT=8795 IDS=rivel_town,sentra_capital,magicka_city,rivel_castle_approach,sentra_palace_approach,magicka_palace_approach,volatilia AT=$GAT TAG=gate_pc VP=1920x1080 Q=low SHOT=$R/after_view/ timeout 1800 node shots82.js > $S/final_gate_pc.log 2>&1
PORT=8795 IDS=rivel_town,sentra_capital,magicka_city,rivel_castle_approach,sentra_palace_approach,magicka_palace_approach,volatilia AT=$GAT TAG=gate_sp VP=390x844 Q=low SHOT=$R/after_view/ timeout 1800 node shots82.js > $S/final_gate_sp.log 2>&1
# D：見せ場のカメラ（はじめて来たときの城の全景・町から見上げる城）
PORT=8795 IDS=rivel_castle_approach,sentra_palace_approach,magicka_palace_approach,rivel_town,sentra_capital,magicka_city CINE=rivel_castle_approach:32:22:64:15,sentra_palace_approach:30:22:64:15,magicka_palace_approach:28:22:64:15,rivel_town:35:19:60:13,sentra_capital:33:14:60:13,magicka_city:32:13:60:13 TAG=cine_pc VP=1920x1080 Q=low SHOT=$R/after_view/ timeout 1800 node shots82.js > $S/final_cine.log 2>&1
echo "views $(date +%T)" >> $S/final_progress.txt
# 動画（ソフトウェア描画）
for M in ticker ticker_town ship chunks leak; do PORT=8795 MODE=$M OUT=$R/video/ timeout 1500 node video82.js > $S/final_video_$M.log 2>&1; echo "video $M $? $(date +%T)" >> $S/final_progress.txt; done
# A：全部の屋内・町・新しい地図（PC 1920×1080）
PORT=8795 IDS=$(cat $S/ids_t2_pc.txt) TAG=after_pc VP=1920x1080 Q=low SHOT=$R/after_int/ timeout 7000 node shots82.js > $S/final_after_pc.log 2>&1
echo "pc $(date +%T)" >> $S/final_progress.txt
kill $SRV
echo DONE >> $S/final_progress.txt
