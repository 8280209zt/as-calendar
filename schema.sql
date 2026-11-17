begin;
create table public.as_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  score integer not null check (score between 0 and 100),
  note text not null default '' check (char_length(note) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.as_entries enable row level security;
revoke all on public.as_entries from anon;
grant select, insert, update, delete on public.as_entries to authenticated;
create policy "Read own entries" on public.as_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own entries" on public.as_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own entries" on public.as_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own entries" on public.as_entries for delete to authenticated using ((select auth.uid()) = user_id);
create function public.validate_as_entry() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.date > (now() at time zone 'Asia/Shanghai')::date then
    raise exception 'Cannot record a future date';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
create trigger validate_as_entry before insert or update on public.as_entries for each row execute function public.validate_as_entry();
commit;
