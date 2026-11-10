-- Additive changes only: preserve existing bookings, customers, and role assignments.
create table if not exists public.attendance_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  cycle_performed text not null check (cycle_performed in ('IC1','IC2','IC3','P1','P2','Aresta')),
  ultra_dourado boolean not null,
  next_cycle text check (next_cycle is null or next_cycle in ('IC1','IC2','IC3','P1','P2','Aresta')),
  next_duration_seconds integer check (next_duration_seconds is null or next_duration_seconds > 0),
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check ((next_cycle is null and next_duration_seconds is null) or (next_cycle is not null and next_duration_seconds is not null))
);
create index if not exists attendance_history_booking_created_idx on public.attendance_history(booking_id, created_at desc);
alter table public.attendance_history enable row level security;
grant select, insert on public.attendance_history to authenticated;

drop policy if exists attendance_history_admin_insert on public.attendance_history;
create policy attendance_history_admin_insert on public.attendance_history for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'::public.app_role) and recorded_by = auth.uid());
drop policy if exists attendance_history_admin_read on public.attendance_history;
create policy attendance_history_admin_read on public.attendance_history for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

create or replace function public.get_my_attendance_history()
returns table (
  history_id uuid,
  booking_id uuid,
  booking_date date,
  slot_time time,
  booking_code text,
  booking_status public.booking_status,
  cycle_performed text,
  ultra_dourado boolean,
  next_cycle text,
  next_duration_seconds integer,
  recorded_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select h.id, b.id, b.booking_date, b.slot_time, b.code, b.status,
         h.cycle_performed, h.ultra_dourado, h.next_cycle, h.next_duration_seconds, h.created_at
  from public.attendance_history h
  join public.bookings b on b.id = h.booking_id
  join public.customers c on c.id = b.customer_id
  where c.auth_user_id = auth.uid()
  order by h.created_at desc;
$$;
revoke all on function public.get_my_attendance_history() from public;
grant execute on function public.get_my_attendance_history() to authenticated;

create table if not exists public.pending_admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id)
);
alter table public.pending_admin_invites enable row level security;
-- Only trusted server-side service-role code manages invite records.
revoke all on public.pending_admin_invites from anon, authenticated;
grant all on public.pending_admin_invites to service_role;

create or replace function public.accept_pending_admin_invite()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare invite_id uuid;
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email is distinct from new.email) then
    update public.pending_admin_invites
       set accepted_at = now(), accepted_user_id = new.id
     where lower(email) = lower(new.email) and accepted_at is null
     returning id into invite_id;
    if invite_id is not null and not exists (
      select 1 from public.user_roles r where r.user_id = new.id and r.role = 'admin'::public.app_role
    ) then
      insert into public.user_roles(user_id, role) values (new.id, 'admin'::public.app_role);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists accept_pending_admin_invite on auth.users;
create trigger accept_pending_admin_invite after update of email_confirmed_at, email on auth.users
for each row execute function public.accept_pending_admin_invite();
