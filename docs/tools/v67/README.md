# v6.7 の作業用の道具とテスト（作業環境で使ったものの写し）

- `zonesim.js`・`zonetune.js`・`zoneverify.js`：出現地帯ごとの通常戦のシミュレーション・倍率探し・確認（`docs/balance-v67.md` の 1.）
- `bosstune67.js`・`tune3.js`：アルカディアのボスを3人で合わせ直す（`docs/balance-v67.md` の 3.）。`bosstune67.js` は v6.4 の道具（作業環境の `v64/bosstune.js`・`v64/bosswin.js`）を写して、第3〜4章の仲間をリーナ・カイルの2人にしたもの
- `quizplace.js`・`auntplace.js`：クイズモンスター・豆知識おばさんの置き場所探し
- `quiz67test.js`・`chatter67test.js`・`companion67test.js`：jsdom のテスト。`quizart_sheet.js`：クイズモンスターの絵の一覧（Playwright）

どれも作業環境の読み込み補助 `rpgload.js`（jsdom でゲームを読み込む。リポジトリには入れていない）と、v6.4 の道具を前提にしているので、このままでは動きません。中身の確認と、同じ手順を再現するための記録です。
