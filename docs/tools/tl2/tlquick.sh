#!/bin/bash
# v9.1 の手早い確かめ：bash docs/tools/tl2/tlquick.sh <ログ>
#  tl_ui_test は tl2/updated-tests の更新版（「予想最大損失」→「通常約定時の推定損失」の表示名の変更だけを反映。理由は docs/trade-advanced/PHASE0_AUDIT.md）
L=${1:?log}; : > $L; R=$(cd "$(dirname "$0")/../../.." && pwd)
cd $R && for c in "tl/tl_p1_test.js" "tl/tl_p2_test.js" "tl/tl_p3_test.js" "tl/tl_p4_test.js" "tl/tl_p5_test.js" "tl/tl_save_test.js" "tl/tl_save_test.js 2d" "tl2/updated-tests/tl_ui_test.js" "tl2/updated-tests/tl_ui_test.js 2d" $TL2EXTRA; do echo "=== $c" >> $L; timeout 1200 node docs/tools/$c 2>&1 | grep -E "^結果|  NG |FAIL" | tail -4 >> $L; done
for t in $(ls docs/tools/tl2/tl[0-9a-z]*_test.js 2>/dev/null); do echo "=== $t" >> $L; timeout 1200 node $t 2>&1 | grep -E "^結果|  NG |FAIL" | tail -4 >> $L; done
echo done >> $L
