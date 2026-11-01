-- =========================================================
-- もちぽよトレードクエスト：クラウドセーブ用の設定（Supabase の SQL Editor に貼って1回だけ実行）
-- ・セーブ本体 mtq_saves（ユーザー×スロットで1行）と、上書き前の版 mtq_save_history（スロットごとに最新5件）
-- ・行単位のアクセス制限（RLS）：自分の行（user_id = auth.uid()）しか読めない・書けない
-- ・書き込みは関数 mtq_put_save だけ。サーバー側のリビジョン番号で競合を判定する（端末の時計は使わない）
-- ・秘密鍵（service_role）はゲームに入れない。ゲームが使うのは公開用の anon キーと、ログインしたユーザーのトークンだけ
-- =========================================================

create table if not exists public.mtq_saves (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  slot       smallint    not null check (slot between 0 and 9),   -- 0 = オートセーブ、1〜3 = スロット（4〜9 は予備）
  revision   bigint      not null default 1 check (revision >= 1),
  data       jsonb       not null,                                 -- ゲームの進行データ（共通形式）
  meta       jsonb       not null default '{}'::jsonb,             -- 一覧に出す情報（名前・レベル・場所・プレイ時間など）
  device     text,                                                 -- 保存した端末の名前（表示用）
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create table if not exists public.mtq_save_history (
  id          bigserial   primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  slot        smallint    not null,
  revision    bigint      not null,
  data        jsonb       not null,
  meta        jsonb       not null default '{}'::jsonb,
  device      text,
  saved_at    timestamptz not null,
  archived_at timestamptz not null default now()
);
create index if not exists mtq_save_history_user_slot on public.mtq_save_history (user_id, slot, archived_at desc);

alter table public.mtq_saves enable row level security;
alter table public.mtq_save_history enable row level security;

-- 読み取り：自分の行だけ
drop policy if exists mtq_saves_select_own on public.mtq_saves;
create policy mtq_saves_select_own on public.mtq_saves for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists mtq_history_select_own on public.mtq_save_history;
create policy mtq_history_select_own on public.mtq_save_history for select to authenticated using ((select auth.uid()) = user_id);
-- 書き込み：自分の行だけ（念のため。実際の書き込みは下の関数 mtq_put_save だけで、関数は auth.uid() の行しか触らない）
drop policy if exists mtq_saves_insert_own on public.mtq_saves;
create policy mtq_saves_insert_own on public.mtq_saves for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists mtq_saves_update_own on public.mtq_saves;
create policy mtq_saves_update_own on public.mtq_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- 削除のポリシーは作らない（ゲームからクラウドのセーブを消さない。消すときはダッシュボードから）

-- 直接の書き込みは関数経由だけにする（表への insert / update の権限を外す。select は残す）
revoke insert, update, delete on public.mtq_saves from anon, authenticated;
revoke insert, update, delete on public.mtq_save_history from anon, authenticated;
grant select on public.mtq_saves to authenticated;
grant select on public.mtq_save_history to authenticated;
revoke all on public.mtq_saves from anon;
revoke all on public.mtq_save_history from anon;

-- 上書きの前の版を履歴へ（スロットごとに最新5件まで）
create or replace function public.mtq_archive_save() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.mtq_save_history (user_id, slot, revision, data, meta, device, saved_at)
  values (old.user_id, old.slot, old.revision, old.data, old.meta, old.device, old.updated_at);
  delete from public.mtq_save_history h
   where h.user_id = old.user_id and h.slot = old.slot
     and h.id not in (select h2.id from public.mtq_save_history h2 where h2.user_id = old.user_id and h2.slot = old.slot order by h2.archived_at desc, h2.id desc limit 5);
  return new;
end $$;
revoke all on function public.mtq_archive_save() from public, anon, authenticated;
drop trigger if exists mtq_saves_archive on public.mtq_saves;
create trigger mtq_saves_archive before update on public.mtq_saves for each row execute function public.mtq_archive_save();

-- 保存（リビジョンの確認つき）
-- ・p_base_revision：この端末が最後に知っているクラウドのリビジョン（クラウドにまだないときは 0）
-- ・一致すれば保存してリビジョン+1、違えば保存せずに ok=false とクラウド側の情報を返す（＝別の端末が先に更新した）
create or replace function public.mtq_put_save(p_slot integer, p_base_revision bigint, p_data jsonb, p_meta jsonb, p_device text)
returns table (ok boolean, rev bigint, server_meta jsonb, server_device text, server_updated timestamptz)
language plpgsql security definer set search_path = public as $$   -- 表への直接の書き込み権限は外してあるので、関数の持ち主の権限で書く。対象は必ず auth.uid() の行だけ
declare
  uid uuid := auth.uid();
  cur public.mtq_saves%rowtype;
  n integer;
begin
  if uid is null then raise exception 'ログインが必要です' using errcode = '42501'; end if;
  if p_slot < 0 or p_slot > 9 then raise exception 'スロットの番号が正しくありません' using errcode = '22023'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'セーブデータの形式が正しくありません' using errcode = '22023'; end if;
  if octet_length(p_data::text) > 1500000 then raise exception 'セーブデータが大きすぎます' using errcode = '22023'; end if;

  select * into cur from public.mtq_saves s where s.user_id = uid and s.slot = p_slot for update;
  if not found then
    if p_base_revision <> 0 then
      return query select false, 0::bigint, null::jsonb, null::text, null::timestamptz; return;
    end if;
    insert into public.mtq_saves (user_id, slot, revision, data, meta, device)
    values (uid, p_slot, 1, p_data, coalesce(p_meta, '{}'::jsonb), p_device)
    on conflict (user_id, slot) do nothing;
    get diagnostics n = row_count;
    if n = 0 then   -- ほぼ同時に別の端末が最初の保存をした
      select * into cur from public.mtq_saves s where s.user_id = uid and s.slot = p_slot;
      return query select false, cur.revision, cur.meta, cur.device, cur.updated_at; return;
    end if;
    return query select true, 1::bigint, coalesce(p_meta, '{}'::jsonb), p_device, now(); return;
  end if;

  if cur.revision <> p_base_revision then
    return query select false, cur.revision, cur.meta, cur.device, cur.updated_at; return;
  end if;

  update public.mtq_saves s
     set revision = cur.revision + 1, data = p_data, meta = coalesce(p_meta, '{}'::jsonb), device = p_device, updated_at = now()
   where s.user_id = uid and s.slot = p_slot;
  return query select true, cur.revision + 1, coalesce(p_meta, '{}'::jsonb), p_device, now();
end $$;
revoke all on function public.mtq_put_save(integer, bigint, jsonb, jsonb, text) from public, anon;
grant execute on function public.mtq_put_save(integer, bigint, jsonb, jsonb, text) to authenticated;
