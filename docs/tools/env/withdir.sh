#!/bin/bash
# 使い方：bash withdir.sh <配信するディレクトリ> <ポート> <コマンド...>
D=$1; P=$2; shift 2
python3 -m http.server $P --directory $D > /dev/null 2>&1 & SRV=$!
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:$P/3d/index.html && break; sleep 0.3; done
cd /home/claude/work/p3d && PORT=$P "$@"; RC=$?
kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; exit $RC
