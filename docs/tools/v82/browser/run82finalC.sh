#!/bin/bash
# v8.2 最終：C＝トレディアの広場の帯を下げた直し（コミット 86ae17c・スナップショット envsnap_a82t5）の後の撮り直し
#   トレディア（PC）・広場と証券市場のふつうのカメラ（PC・スマホ）・広場の帯の動画
S=/tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/ao
R=/home/claude/work/p3d/shots/v82
cd /home/claude/work/p3d
python3 -m http.server 8798 --directory /home/claude/envsnap_a82t5 > /dev/null 2>&1 &
SRV=$!
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:8798/3d/index.html && break; sleep 0.3; done
echo "C start $(date +%T)" >> $S/final_progress.txt
cp $R/after_int/after_pc_result.json $R/after_int/after_pc_result_main.json
PORT=8798 IDS=tradia TAG=after_pc VP=1920x1080 Q=low SHOT=$R/after_int/ timeout 1200 node shots82.js > $S/finalC_tradia_pc.log 2>&1
cp $R/after_int/after_pc_result.json $R/after_int/after_pc_result_fixC.json
python3 - <<'PY'
import json
R = '/home/claude/work/p3d/shots/v82/after_int/'
main = json.load(open(R + 'after_pc_result_main.json')); fix = json.load(open(R + 'after_pc_result_fixC.json'))
fx = {r['id']: dict(r, refix='86ae17c で撮り直し（広場の帯）') for r in fix['res']}
main['res'] = [fx.get(r['id'], r) for r in main['res']]; main['refix'] = list(fx.keys())
json.dump(main, open(R + 'after_pc_result.json', 'w'), ensure_ascii=False, indent=1)
PY
PORT=8798 IDS=tradia,tradia_exchange AT=tradia:35:9:down,tradia_exchange:12:9:up TAG=ticker_pc VP=1920x1080 Q=low SHOT=$R/after_view/ timeout 1200 node shots82.js > $S/finalC_ticker.log 2>&1
PORT=8798 IDS=tradia,tradia_exchange AT=tradia:35:9:down,tradia_exchange:12:9:up TAG=ticker_sp VP=390x844 Q=low SHOT=$R/after_view/ timeout 1200 node shots82.js >> $S/finalC_ticker.log 2>&1
PORT=8798 MODE=ticker_town OUT=$R/video_fixC/ timeout 1500 node video82.js > $S/finalC_video.log 2>&1
for M in aeria ring_shot; do PORT=8798 MODE=$M OUT=$R/video_fixC/ timeout 900 node video82.js > $S/finalC_$M.log 2>&1; done
kill $SRV
echo "C DONE $(date +%T)" >> $S/final_progress.txt
