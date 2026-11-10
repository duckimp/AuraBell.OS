create table if not exists public.remote_audio_libraries (
  node_id text primary key,
  tracks jsonb not null default '[]'::jsonb,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now(),
  constraint remote_audio_libraries_node_id_check
    check (node_id ~ '^[a-z0-9-]{1,48}$'),
  constraint remote_audio_libraries_tracks_check
    check (jsonb_typeof(tracks) = 'array')
);

alter table public.remote_audio_libraries enable row level security;
drop policy if exists "Authenticated users can read remote audio libraries"
  on public.remote_audio_libraries;
create policy "Authenticated users can read remote audio libraries"
  on public.remote_audio_libraries
  for select
  to authenticated
  using (true);

revoke all on public.remote_audio_libraries from anon, authenticated;
grant select on public.remote_audio_libraries to authenticated;

create table if not exists public.remote_audio_commands (
  id uuid primary key default gen_random_uuid(),
  target_node_id text not null,
  action text not null check (action in ('play', 'pause', 'stop')),
  track_id text,
  created_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  claimed_by uuid references auth.users (id),
  claimed_at timestamptz,
  completed_at timestamptz,
  failure_message text,
  constraint remote_audio_commands_node_id_check
    check (target_node_id ~ '^[a-z0-9-]{1,48}$'),
  constraint remote_audio_commands_track_check
    check (
      (action = 'play' and track_id is not null and char_length(btrim(track_id)) between 1 and 128)
      or (action in ('pause', 'stop') and track_id is null)
    )
);

alter table public.remote_audio_commands enable row level security;
drop policy if exists "Authenticated users can read remote audio commands"
  on public.remote_audio_commands;
create policy "Authenticated users can read remote audio commands"
  on public.remote_audio_commands
  for select
  to authenticated
  using (true);

revoke all on public.remote_audio_commands from anon, authenticated;
grant select on public.remote_audio_commands to authenticated;

create or replace function public.publish_remote_audio_library(
  p_node_id text,
  p_tracks jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan untuk memperbarui pustaka audio remote.';
  end if;
  if p_node_id is null or p_node_id !~ '^[a-z0-9-]{1,48}$' then
    raise exception 'Tujuan perangkat tidak valid.';
  end if;
  if p_tracks is null or jsonb_typeof(p_tracks) <> 'array' or jsonb_array_length(p_tracks) > 200 then
    raise exception 'Pustaka audio harus berupa daftar maksimal 200 lagu.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_tracks) as track(value)
    where jsonb_typeof(track.value) <> 'object'
      or coalesce(track.value ->> 'id', '') = ''
      or char_length(track.value ->> 'id') > 128
      or char_length(btrim(coalesce(track.value ->> 'title', ''))) not between 1 and 160
      or char_length(coalesce(track.value ->> 'category', '')) > 80
      or char_length(coalesce(track.value ->> 'duration', '')) > 16
  ) then
    raise exception 'Metadata lagu tidak valid.';
  end if;

  insert into public.remote_audio_libraries (node_id, tracks, receiver_id, updated_at)
  values (p_node_id, p_tracks, auth.uid(), now())
  on conflict (node_id) do update
  set tracks = excluded.tracks,
      receiver_id = excluded.receiver_id,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.get_remote_audio_library(p_node_id text)
returns table (tracks jsonb, updated_at timestamptz, is_online boolean)
language sql
security definer
set search_path = ''
as $$
  select
    library.tracks,
    library.updated_at,
    library.updated_at > now() - interval '90 seconds'
  from public.remote_audio_libraries as library
  where auth.uid() is not null
    and library.node_id = p_node_id;
$$;

create or replace function public.deactivate_remote_audio_library(p_node_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan untuk menonaktifkan pustaka audio remote.';
  end if;

  delete from public.remote_audio_libraries as library
  where library.node_id = p_node_id
    and library.receiver_id = auth.uid();
end;
$$;

create or replace function public.send_remote_audio_command(
  p_node_id text,
  p_action text,
  p_track_id text default null
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
    raise exception 'Login diperlukan untuk mengontrol audio remote.';
  end if;
  if p_node_id is null or p_node_id !~ '^[a-z0-9-]{1,48}$' then
    raise exception 'Tujuan perangkat tidak valid.';
  end if;
  if p_action not in ('play', 'pause', 'stop') then
    raise exception 'Aksi audio tidak valid.';
  end if;
  if p_action = 'play' then
    if p_track_id is null or char_length(btrim(p_track_id)) not between 1 and 128 then
      raise exception 'Pilih lagu yang tersedia di pustaka komputer tujuan.';
    end if;
    if not exists (
      select 1
      from public.remote_audio_libraries as library,
           jsonb_array_elements(library.tracks) as track(value)
      where library.node_id = p_node_id
        and library.updated_at > now() - interval '90 seconds'
        and track.value ->> 'id' = p_track_id
    ) then
      raise exception 'Lagu tidak tersedia atau receiver komputer tujuan sedang offline.';
    end if;
  elsif p_track_id is not null then
    raise exception 'Aksi jeda/berhenti tidak memakai ID lagu.';
  end if;

  insert into public.remote_audio_commands (target_node_id, action, track_id, created_by)
  values (p_node_id, p_action, p_track_id, auth.uid())
  returning id into new_command_id;

  return new_command_id;
end;
$$;

create or replace function public.claim_remote_audio_command(
  p_command_id uuid,
  p_node_id text
)
returns table (id uuid, action text, track_id text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan untuk menerima kontrol audio remote.';
  end if;

  return query
  update public.remote_audio_commands as command
  set status = 'processing',
      claimed_by = auth.uid(),
      claimed_at = now()
  where command.id = p_command_id
    and command.target_node_id = p_node_id
    and command.status = 'pending'
    and command.expires_at > now()
  returning command.id, command.action, command.track_id;
end;
$$;

create or replace function public.complete_remote_audio_command(
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
    raise exception 'Login diperlukan untuk menyelesaikan kontrol audio remote.';
  end if;

  update public.remote_audio_commands as command
  set status = case when p_failure is null then 'completed' else 'failed' end,
      completed_at = now(),
      failure_message = left(p_failure, 500)
  where command.id = p_command_id
    and command.status = 'processing'
    and command.claimed_by = auth.uid();

  if not found then
    raise exception 'Perintah audio tidak ditemukan atau sudah diproses.';
  end if;
end;
$$;

revoke all on function public.publish_remote_audio_library(text, jsonb) from public, anon;
revoke all on function public.get_remote_audio_library(text) from public, anon;
revoke all on function public.deactivate_remote_audio_library(text) from public, anon;
revoke all on function public.send_remote_audio_command(text, text, text) from public, anon;
revoke all on function public.claim_remote_audio_command(uuid, text) from public, anon;
revoke all on function public.complete_remote_audio_command(uuid, text) from public, anon;
grant execute on function public.publish_remote_audio_library(text, jsonb) to authenticated;
grant execute on function public.get_remote_audio_library(text) to authenticated;
grant execute on function public.deactivate_remote_audio_library(text) to authenticated;
grant execute on function public.send_remote_audio_command(text, text, text) to authenticated;
grant execute on function public.claim_remote_audio_command(uuid, text) to authenticated;
grant execute on function public.complete_remote_audio_command(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'remote_audio_commands'
  ) then
    alter publication supabase_realtime add table public.remote_audio_commands;
  end if;
end;
$$;
