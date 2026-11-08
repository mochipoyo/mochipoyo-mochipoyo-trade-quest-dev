#!/bin/bash
cd /home/claude/work/p3d
PORT=8791 MODE=leak LEAKN=5 LEAKSEQ=tradia_exchange:12:9,vol_library:11:12,volatilia:41:55,kalion_city:40:30,magicka_inn:7:9,vol_classroom2:7:9 OUT=/home/claude/work/p3d/shots/v83/leak/ timeout 3000 node video82.js > shots/v83/leak.log 2>&1
IDS=$(cat /tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/lum_sub.txt) PORT=8791 VP=640x360 TAG=after Q=low SHOT=/home/claude/work/p3d/shots/v83/lum/ timeout 4000 node shots82.js > shots/v83/lum/after_run.log 2>&1
C='verum_town:32:20:48:50,tempus_city:35:18:53:50,sahar_city:30:22:45:50,frost_town:33:18:50:50,ignas_town:31:18:47:50,dark_camp:25:15:38:50,star_camp:21:8:32:50,aruna_ruins:30:15:45:50,asana_ruins:14:11:21:50,luxbell:32:20:48:50,tradia_sky:20:15:30:50,neon_town:18:10:27:50,meridian_shelter:15:10:23:50,nereia_city:16:10:24:50,nereia_old_hi:14:8:21:50,nereia_old_lo:14:8:21:50'; I=$(echo $C | sed 's/:[^,]*//g')
CINE=$C IDS=$I PORT=8791 VP=960x540 TAG=a2 Q=high SHOT=/home/claude/work/p3d/shots/v83/towns2/ timeout 3000 node shots82.js > shots/v83/towns2/a2.log 2>&1
echo DONE > shots/v83/browser83.done
