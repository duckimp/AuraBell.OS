create table if not exists public.remote_announcements (
  id uuid primary key default gen_random_uuid(),
  target_node_id text not null,
  announcement_text text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  claimed_by uuid references auth.users (id),
  claimed_at timestamptz,
  completed_at timestamptz,
  failure_message text,
  constraint remote_announcements_node_id_check
    check (target_node_id ~ '^[a-z0-9-]{1,48}$'),
  constraint remote_announcements_text_check
    check (char_length(btrim(announcement_text)) between 1 and 1000)
);

alter table public.remote_announcements enable row level security;

drop policy if exists "Authenticated users can read remote announcements"
  on public.remote_announcements;
create policy "Authenticated users can read remote announcements"
  on public.remote_announcements
  for select
  to authenticated
  using (true);

revoke all on public.remote_announcements from anon, authenticated;
grant select on public.remote_announcements to authenticated;

create or replace function public.send_remote_announcement(
  p_node_id text,
  p_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_command_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan untuk mengirim pengumuman.';
  end if;
  if p_node_id is null or p_node_id !~ '^[a-z0-9-]{1,48}$' then
    raise exception 'Tujuan perangkat tidak valid.';
  end if;
  if p_text is null or char_length(btrim(p_text)) not between 1 and 1000 then
    raise exception 'Teks pengumuman harus berisi 1 sampai 1000 karakter.';
  end if;

  insert into public.remote_announcements (target_node_id, announcement_text, created_by)
  values (p_node_id, btrim(p_text), auth.uid())
  returning id into new_command_id;

  return new_command_id;
end;
$$;

create or replace function public.claim_remote_announcement(
  p_command_id uuid,
  p_node_id text
)
returns table (id uuid, announcement_text text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan untuk menerima pengumuman.';
  end if;

  return query
  update public.remote_announcements as command
  set status = 'processing',
      claimed_by = auth.uid(),
      claimed_at = now()
  where command.id = p_command_id
    and command.target_node_id = p_node_id
    and command.status = 'pending'
    and command.expires_at > now()
  returning command.id, command.announcement_text;
end;
$$;

create or replace function public.complete_remote_announcement(
  p_command_id uuid,
  p_failure text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan untuk menyelesaikan pengumuman.';
  end if;

  update public.remote_announcements as command
  set status = case when p_failure is null then 'completed' else 'failed' end,
      completed_at = now(),
      failure_message = left(p_failure, 500)
  where command.id = p_command_id
    and command.status = 'processing'
    and command.claimed_by = auth.uid();

  if not found then
    raise exception 'Pengumuman tidak ditemukan atau sudah diproses.';
  end if;
end;
$$;

revoke all on function public.send_remote_announcement(text, text) from public, anon;
revoke all on function public.claim_remote_announcement(uuid, text) from public, anon;
revoke all on function public.complete_remote_announcement(uuid, text) from public, anon;
grant execute on function public.send_remote_announcement(text, text) to authenticated;
grant execute on function public.claim_remote_announcement(uuid, text) to authenticated;
grant execute on function public.complete_remote_announcement(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'remote_announcements'
  ) then
    alter publication supabase_realtime add table public.remote_announcements;
  end if;
end;
$$;
