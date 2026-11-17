begin;
create schema if not exists calendar_private;
revoke all on schema calendar_private from public, anon, authenticated;
create table calendar_private.access_links (
  key_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table calendar_private.access_links enable row level security;
revoke all on calendar_private.access_links from public, anon, authenticated;
create function public.calendar_with_link(
  access_key text,
  operation text default 'list',
  entry_date date default null,
  entry_score integer default null,
  entry_note text default ''
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; result jsonb;
begin
  if access_key is null or access_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid private link' using errcode = '28000';
  end if;
  select user_id into owner_id from calendar_private.access_links
    where key_hash = encode(extensions.digest(access_key, 'sha256'), 'hex');
  if owner_id is null then
    raise exception 'Invalid private link' using errcode = '28000';
  end if;
  if operation = 'list' then
    select jsonb_build_object('entries', coalesce(jsonb_agg(jsonb_build_object(
      'date', date, 'score', score, 'note', note, 'updated_at', updated_at) order by date), '[]'::jsonb))
    into result from public.as_entries where user_id = owner_id;
    return result;
  elsif operation = 'save' then
    insert into public.as_entries(user_id, date, score, note)
      values(owner_id, entry_date, entry_score, coalesce(entry_note, ''))
      on conflict(user_id,date) do update set score=excluded.score,note=excluded.note
      returning jsonb_build_object('entry',jsonb_build_object('date',date,'score',score,'note',note,'updated_at',updated_at)) into result;
    return result;
  elsif operation = 'delete' then
    delete from public.as_entries where user_id=owner_id and date=entry_date;
    return jsonb_build_object('ok',true);
  end if;
  raise exception 'Unsupported operation';
end;
$$;
revoke all on function public.calendar_with_link(text,text,date,integer,text) from public;
grant execute on function public.calendar_with_link(text,text,date,integer,text) to anon;
commit;
