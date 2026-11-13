#!/bin/bash
# v9.8〜v9.8.2 装備の外見（ドット絵の差分）：確かめ一式（主人公の v9.7 の確かめ ＋ 仲間 リーナ・ガルド ＋ v9.8.1 の剣・盾・斧・帽子 ＋ v9.8.2 カイル・カズト）を順に動かして、結果の行を 1 つの記録にまとめる
#   bash docs/tools/appear/run_v98.sh <記録ファイル>
#   前提：8894 に静かなサーバー（docs/tools/rpg93/rangeserver.js）。別のサイトの確かめ用に 8895（cors）・8896（nocors）を立てて、終わったら止める
#   v9.6 の確かめ（vector・別のサイト・3Dモデル）の画面写真・記録は docs/appear/pixel/regress/ に書く（v9.6 の報告の記録は書き換えない）
cd "$(dirname "$0")/../../.." || exit 2
LOG=${1:-docs/appear/pixel/logs/tests_v98.log}; mkdir -p "$(dirname "$LOG")"
RG=docs/appear/pixel/regress/; mkdir -p "$RG"
V=$(sed -n "s/.*MTQ_VERSION = '\([0-9a-f]*\)'.*/\1/p" js/core/version.js 2>/dev/null)
echo "v9.8 の確かめ $(date '+%Y-%m-%d %H:%M') 版 $V" > "$LOG"
ONE=$(mktemp)
run() { echo "=== $1" >> "$LOG"; shift; "$@" > "$ONE" 2>&1; local rc=$?; grep -E "結果|^  NG  |CRASH|FAIL" "$ONE" >> "$LOG"; [ $rc -ne 0 ] && echo "（終了コード $rc）" >> "$LOG"; }
node docs/tools/appear/browser/xorigin_server.js . 8895 cors > /dev/null 2>&1 & X1=$!
node docs/tools/appear/browser/xorigin_server.js . 8896 nocors > /dev/null 2>&1 & X2=$!
sleep 1
run "appear/appear_pixel_test.js（jsdom・3D と同じ読み込み）" node docs/tools/appear/appear_pixel_test.js
run "ブラウザ 主人公と仲間の装備できる品と、描く／描かない品（docs/appear/pixel/SURVEY.md）" env PORT=8894 node docs/tools/appear/browser/appear_survey.js
run "appear/appear_pixel_test.js 2d" node docs/tools/appear/appear_pixel_test.js 2d
run "appear/appear_test.js（v9.6 の描き足し vector）" node docs/tools/appear/appear_test.js
run "appear/appear_test.js 2d（vector）" node docs/tools/appear/appear_test.js 2d
run "icons/icons_test.js" node docs/tools/icons/icons_test.js
run "menu92/menu92_test.js 2d" node docs/tools/menu92/menu92_test.js 2d
run "ブラウザ pixel 3d（メニュー・戦闘の背面）" env KIND=3d PORT=8894 node docs/tools/appear/browser/appear_pixel.js
run "ブラウザ pixel 2d（メニュー）" env KIND=2d PORT=8894 node docs/tools/appear/browser/appear_pixel.js
run "ブラウザ 合成の絵の書き出し" env PORT=8894 node docs/tools/appear/browser/appear_pixel_dump.js
run "ブラウザ ふつうの手順（装備メニューで変更・解除 → そのまま戦闘）PC" env VIEW=pc PORT=8894 node docs/tools/appear/browser/appear_pixel_ui.js
run "ブラウザ ふつうの手順 スマホ縦（390×664）" env VIEW=phone PORT=8894 node docs/tools/appear/browser/appear_pixel_ui.js
run "ブラウザ 仲間（リーナ・ガルド）開発用の切り替え 3d" env KIND=3d PORT=8894 node docs/tools/appear/browser/appear_pixel_comp.js
run "ブラウザ 仲間（リーナ・ガルド）開発用の切り替え 2d" env KIND=2d PORT=8894 node docs/tools/appear/browser/appear_pixel_comp.js
run "ブラウザ 仲間 ふつうの手順（装備メニューで確定・解除・キャンセル → 戦闘 → 勝利 → メニュー）PC" env VIEW=pc PORT=8894 node docs/tools/appear/browser/appear_pixel_comp_ui.js
run "ブラウザ 仲間 ふつうの手順 スマホ縦（390×664）" env VIEW=phone PORT=8894 node docs/tools/appear/browser/appear_pixel_comp_ui.js
run "ブラウザ 仲間 そうび画面（上の立ち絵・品の一覧の試着の枠）PC" env VIEW=pc PORT=8894 node docs/tools/appear/browser/appear_pixel_comp_equip.js
run "ブラウザ 仲間 そうび画面 スマホ縦" env VIEW=phone PORT=8894 node docs/tools/appear/browser/appear_pixel_comp_equip.js
run "ブラウザ v9.8.2 カイル・カズト 開発用の切り替え 3d" env WHO=kyle,kazuto KIND=3d PORT=8894 node docs/tools/appear/browser/appear_pixel_comp.js
run "ブラウザ v9.8.2 カイル・カズト 開発用の切り替え 2d" env WHO=kyle,kazuto KIND=2d PORT=8894 node docs/tools/appear/browser/appear_pixel_comp.js
run "ブラウザ v9.8.2 カイル・カズト ふつうの手順（確定・解除・キャンセル → 戦闘 → 勝利 → メニュー）PC" env VIEW=pc PORT=8894 node docs/tools/appear/browser/appear_pixel_knight_ui.js
run "ブラウザ v9.8.2 カイル・カズト ふつうの手順 スマホ縦（390×664）" env VIEW=phone PORT=8894 node docs/tools/appear/browser/appear_pixel_knight_ui.js
run "ブラウザ v9.8.2 カイル・カズト そうび画面 PC" env PAIR=knight VIEW=pc PORT=8894 node docs/tools/appear/browser/appear_pixel_comp_equip.js
run "ブラウザ v9.8.2 カイル・カズト そうび画面 スマホ縦" env PAIR=knight VIEW=phone PORT=8894 node docs/tools/appear/browser/appear_pixel_comp_equip.js
run "ブラウザ v9.8.4 結果の窓：4 人編成・複数人のレベルアップ PC" env VIEW=pc PORT=8894 node docs/tools/appear/browser/appear_result4.js
run "ブラウザ v9.8.4 結果の窓：4 人編成・複数人のレベルアップ スマホ縦" env VIEW=phone PORT=8894 node docs/tools/appear/browser/appear_result4.js
run "ブラウザ v9.8.4 ミナ（弓・短剣）開発用の切り替え 3d" env WHO=mina KIND=3d PORT=8894 node docs/tools/appear/browser/appear_pixel_comp.js
run "ブラウザ v9.8.4 ミナ（弓・短剣）開発用の切り替え 2d" env WHO=mina KIND=2d PORT=8894 node docs/tools/appear/browser/appear_pixel_comp.js
run "ブラウザ v9.8.4 ミナ ふつうの手順（確定・キャンセル・解除 → 戦闘 → 勝利 → メニュー・セーブの読み直し）PC" env VIEW=pc PORT=8894 node docs/tools/appear/browser/appear_pixel_mina_ui.js
run "ブラウザ v9.8.4 ミナ ふつうの手順 スマホ縦（390×664）" env VIEW=phone PORT=8894 node docs/tools/appear/browser/appear_pixel_mina_ui.js
run "ブラウザ v9.8.6 主人公の転職（戦士→狩人→盗賊→戦士・着脱・キャンセル・セーブ→つづきから）PC" env VIEW=pc PORT=8894 node docs/tools/appear/browser/appear_pixel_herojob_ui.js
run "ブラウザ v9.8.6 主人公の転職 スマホ縦（390×664）" env VIEW=phone PORT=8894 node docs/tools/appear/browser/appear_pixel_herojob_ui.js
run "ブラウザ 別のサイト pixel 3d cors" env MODE=pixel KIND=3d XMODE=cors XPORT=8895 PORT=8894 OUT=$RG node docs/tools/appear/browser/appear_xorigin.js
run "ブラウザ 別のサイト pixel 3d nocors" env MODE=pixel KIND=3d XMODE=nocors XPORT=8896 PORT=8894 OUT=$RG node docs/tools/appear/browser/appear_xorigin.js
run "ブラウザ 別のサイト pixel 2d cors" env MODE=pixel KIND=2d XMODE=cors XPORT=8895 PORT=8894 OUT=$RG node docs/tools/appear/browser/appear_xorigin.js
run "ブラウザ 別のサイト pixel 2d nocors" env MODE=pixel KIND=2d XMODE=nocors XPORT=8896 PORT=8894 OUT=$RG node docs/tools/appear/browser/appear_xorigin.js
run "ブラウザ 別のサイト vector 3d cors" env MODE=vector KIND=3d XMODE=cors XPORT=8895 PORT=8894 OUT=$RG node docs/tools/appear/browser/appear_xorigin.js
run "ブラウザ vector 2d pc（v9.6 の確かめ）" env KIND=2d VIEW=pc PORT=8894 OUT=$RG node docs/tools/appear/browser/appear_browser.js
run "ブラウザ vector 3d pc（v9.6 の確かめ）" env KIND=3d VIEW=pc PORT=8894 OUT=$RG node docs/tools/appear/browser/appear_browser.js
run "ブラウザ 3Dモデル（?party=model）" env PORT=8894 OUT=$RG node docs/tools/appear/browser/appear_model3d.js
kill $X1 $X2 2>/dev/null; wait $X1 $X2 2>/dev/null; rm -f "$ONE"
python3 docs/tools/appear/pixel_sheets.py >> "$LOG" 2>&1
python3 docs/tools/appear/pixel_sheets_comp.py >> "$LOG" 2>&1
python3 docs/tools/appear/pixel_sheets_comp.py knight >> "$LOG" 2>&1
python3 docs/tools/appear/pixel_sheets_comp.py mina >> "$LOG" 2>&1
python3 docs/tools/appear/pixel_sheets_comp.py herojob >> "$LOG" 2>&1
echo "--- まとめ" >> "$LOG"; echo "NG・失敗の行：$(grep -cE '^  NG  |終了コード|CRASH|FAIL' "$LOG")" >> "$LOG"
