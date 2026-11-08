#!/bin/bash
cd /home/claude/envwork/docs/tools
O=/home/claude/work/v83ver
run() { local name=$1; shift; timeout 2400 "$@" > $O/$name.log 2>&1; echo "== $name: $(grep -E '結果|部屋・地図|NG [0-9]|ちがう町|作り直した部屋|エラー|地図 [0-9]' $O/$name.log | tail -2 | tr '\n' ' ' | cut -c1-260) EXIT $?" >> $O/summary.txt; }
: > $O/summary.txt
run route83_earth node v83/route83_test.js
run route83_2d node v83/route83_test.js 2d
FLAGS=palace_open run route83_po_earth node v83/route83_test.js
run route83_walk node v83/route83_test.js walk rivel_town,sentra_capital,magicka_city,volatilia
run switch82_earth node v82/switch82_test.js
run switch82_2d node v82/switch82_test.js 2d
run layout82_check_earth node v82/layout82_check.js
run layout82_reach_earth node v82/layout82_reach.js
run remake81_earth node v81/remake81_check.js ""
run remake81_2d node v81/remake81_check.js "" 2d
run pocket81_earth node v81/pocket81_check.js
run pocket81_2d node v81/pocket81_check.js 2d
run town81_earth node v81/town81_test.js rivel_town,sentra_capital,magicka_city,volatilia,kalion_city,harbor_town
run town81_2d node v81/town81_test.js rivel_town,sentra_capital,magicka_city,volatilia,kalion_city,harbor_town 2d
run academy83_earth node v83/academy83_test.js
run academy83_2d node v83/academy83_test.js 2d
run tm83_place_earth node v83/tm83_place.js
run tm83_place_2d node v83/tm83_place.js 2d
run tm83_logic node v83/tm83_duel_logic.js
run theme82_diff node v82/theme82_diff.mjs
run navnew_earth node v83/navnew83.js
run vol_migrate node v83/vol83_migrate_test.js /tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/vol_r811.json "" 1
echo DONE >> $O/summary.txt
