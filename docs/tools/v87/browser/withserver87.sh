#!/bin/bash
# 確認の間だけ、作業中のフォルダを 8791 番で配る（終わったら止める）。使い方：withserver87.sh node 確認.js
cd /home/claude/envwork || exit 1
python3 -m http.server 8791 --directory /home/claude/envwork > /dev/null 2>&1 &
SRV=$!
until curl -s -o /dev/null http://localhost:8791/index.html; do sleep 0.3; done
cd /home/claude/work/p3d && NODE_PATH=$(npm root -g) "$@"
RC=$?
kill $SRV
exit $RC
