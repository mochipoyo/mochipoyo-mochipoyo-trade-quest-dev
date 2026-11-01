/* =========================================================
   クラウドセーブの接続先（Supabase）。ここに入れるのは「公開してよい値」だけ：
     url            … プロジェクトの URL（例 https://xxxxxxxx.supabase.co）
     publishableKey … 公開用のキー（sb_publishable_ で始まる。Supabase のダッシュボードの Settings → API Keys）
                      ※旧来の anon キーも使えるが、Supabase は2026年末までに廃止予定と案内している
   秘密の鍵（sb_secret_… や service_role）は絶対に入れない
   空のままなら、クラウドセーブは「未設定」になり、ゲームは今までどおり端末のセーブだけで遊べる
   設定の手順：docs/cloud/README.md
   ========================================================= */
window.MTQ_CLOUD = window.MTQ_CLOUD || { url: 'https://telvknsnsoeoyieapwzn.supabase.co', publishableKey: 'sb_publishable_Tg93SDigVqnCEcJHmKUNYA_OwUya6Qa' };
