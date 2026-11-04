# 環境リデザイン（TradeQuest_Environment_Overhaul_v1）作業計画・進み具合

素材：`TradeQuest_Environment_Overhaul_v1.zip`（2026-11-04 17:35 受領）。指示：パックの `01_CLAUDE_START_HERE.md`。
ブランチ：`feature/env-overhaul`（作業用の worktree：/home/claude/envwork）。土台＝`feature/enemies35`（追加の敵35体）。push は dev だけ。

## 方針（この版で決めたこと）
- パックの確認コミット 62900a3 より、いまのゲームは進んでいる（v7.1〜v7.5）。いまのデータを正とする（パックの snapshot で巻き戻さない）。
- マップ数：パックは330件。いまは597件（field 12・town 30・interior 429・dungeon 126。v7.2/v7.3 の町の拡張で屋内が増えた）。差分は `docs/environment/ID_DIFF.md`。
- 切り替え：localStorage `mtq3d-env`＝`v1`（新しい環境）／`off`（従来の表示）。URL `?env=off|v1` でも同じ。旧表示へ戻せる。
- 論理（タイル・当たり判定・ワープ・NPC・宝箱・イベント）は2D版と共通のデータ。3Dだけ座標をずらさない。見た目の作り直しは、論理のタイルに合わせた3Dの builder（建物・壁・床・地形・目印）で行う。
- 状態の区別：design_only → integrated → visual_checked → gameplay_checked → verified（`data/production_backlog` を実績で更新）。

## 段階
- A 監査と基盤：パックのコード・素材の配置、プロファイルの解決（未登録IDは開発時に検出）、切り替え、全マップのスナップショット（タイル・ワープ）、基準の撮影
- B 5地点：rivel_castle → iron_mine_1 → poyo_village → node_city → tradia（FLAGSHIP_SCENES に沿う。builder 本体を作り直す）
- C 全体へ展開（町25＋→城/主要ダンジョン→残りのダンジョン→屋内→フィールド）
- D 検証とビルド

## 進み具合（ここを更新する）
- [x] A 監査と基盤：パックの部品・画像・プロファイル（597マップ）、切り替え（?env=off|v1）、未登録IDの検出、論理のスナップショットと比較（`docs/tools/env/logic_snapshot.js`）、監査（`AUDIT.md`）。基準の撮影は env=off で同じカメラ（`REPORT.md` の画像）
- [x] B 5地点：rivel_castle・iron_mine_1・poyo_village・node_city・tradia の専用レシピ（builder 本体にフック・建物の style・作り直した形）。論理を変えたのは城と村の2マップ14マス（`js/data/env76.js`）
- [~] C 全体展開：町（town_kit 24町＋第7居住区）・ダンジョンと屋内（room_kit）を integrated。**町の目印・街路、ダンジョンの空間の流れ、屋内の地域×用途、フィールドは未着手**（`NEXT.md`）
- [x] D 検証とビルド：パックのテスト 13/13、2D の回帰、3D の回帰、全マップの組み立てと歩けるマスの確認（533 マップ）、前後の比較（38 マップ）、到達性、ビルドと版の印。**実機・GPU は未検証**（`REPORT.md`）

## 追加作業（2026-11-04 21:23 の依頼）
依頼：フィールド12・近未来と娯楽の町2・屋外のダンジョン・ポヨ村の屋内／町ごとの目印と街路の組み直し・ダンジョンの空間の流れ・屋内の地域×用途・城の部屋ごとの作り分け／法線・AO（PBR）。論理のタイルは「広く変える」（回答）。
- [x] フィールド12（field_kit：地方ごとの目印・下草）・近未来と娯楽の町2（town_kit の casino・skyterrace）・屋外のダンジョン（outdoor_kit：森・空）・ポヨ村の屋内18（poyo_interior）
- [x] 町の街路と目印（js/rpg/envlayout.js・landmarks.js）、ダンジョンの空間の流れ（同）。論理を変える。不変条件の確認（layout_check.js）・古いセーブ（save_layout_test.js）・設定で元に戻す（layout_menu_test.js）
- [x] 屋内の地域×用途・城の部屋（room_kit）
- [~] PBR：コードで描く模様は手続き的なPBR（ProcPBR.js・高画質だけ）。パックの写真風の6枚は、パックの注意に従い未制作（仕様＝`PBR_SPEC.md`）
- [~] 確認：2D・3D の回帰、全マップの組み立て、前後の比較、画面（実行中）。**実機・GPU は未検証**
