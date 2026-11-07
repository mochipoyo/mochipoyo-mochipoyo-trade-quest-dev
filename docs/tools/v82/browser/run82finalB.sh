#!/bin/bash
# v8.2 最終：B＝スマホの撮影（390×844）と、回帰の残り（最終のスナップショット /home/claude/envsnap_a82t4）
S=/tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/ao
R=/home/claude/work/p3d/shots/v82
cd /home/claude/work/p3d
python3 -m http.server 8796 --directory /home/claude/envsnap_a82t4 > /dev/null 2>&1 &
SRV=$!
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:8796/3d/index.html && break; sleep 0.3; done
echo "B start $(date +%T)" >> $S/final_progress.txt
PORT=8796 IDS=$(cat $S/ids_t2_sp.txt) TAG=after_sp VP=390x844 Q=low SHOT=$R/after_sp/ timeout 4000 node shots82.js > $S/final_after_sp.log 2>&1
echo "sp $(date +%T)" >> $S/final_progress.txt
kill $SRV
bash /tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/reg82t3/run.sh
echo "B DONE $(date +%T)" >> $S/final_progress.txt
