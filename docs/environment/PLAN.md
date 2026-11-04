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
- [ ] A
- [ ] B
- [ ] C
- [ ] D
