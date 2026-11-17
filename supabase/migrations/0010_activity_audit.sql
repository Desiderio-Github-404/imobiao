-- ImobiAO audit trail: records authenticated changes to core business data.
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id uuid,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_org_created_idx
  on public.activity_logs(organization_id, created_at desc);
create index if not exists activity_logs_org_table_idx
  on public.activity_logs(organization_id, table_name, created_at desc);

alter table public.activity_logs enable row level security;
drop policy if exists "Organization members can read activity logs" on public.activity_logs;
create policy "Organization members can read activity logs"
on public.activity_logs for select to authenticated
using (public.is_org_member(organization_id));

revoke insert, update, delete, truncate, references, trigger on public.activity_logs from anon, authenticated;
grant select on public.activity_logs to authenticated;

create or replace function public.capture_activity_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_record_id uuid;
  v_old jsonb;
  v_new jsonb;
begin
  if TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);
    v_org_id := (v_old ->> 'organization_id')::uuid;
    v_record_id := (v_old ->> 'id')::uuid;
  elsif TG_OP = 'UPDATE' then
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_org_id := (v_new ->> 'organization_id')::uuid;
    v_record_id := (v_new ->> 'id')::uuid;
  else
    v_new := to_jsonb(NEW);
    v_org_id := (v_new ->> 'organization_id')::uuid;
    v_record_id := (v_new ->> 'id')::uuid;
  end if;

  if v_org_id is not null then
    insert into public.activity_logs (
      organization_id, actor_id, table_name, record_id, operation, old_data, new_data
    ) values (
      v_org_id, auth.uid(), TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new
    );
  end if;

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

drop trigger if exists audit_properties on public.properties;
create trigger audit_properties after insert or update or delete on public.properties
for each row execute function public.capture_activity_log();
drop trigger if exists audit_units on public.units;
create trigger audit_units after insert or update or delete on public.units
for each row execute function public.capture_activity_log();
drop trigger if exists audit_tenants on public.tenants;
create trigger audit_tenants after insert or update or delete on public.tenants
for each row execute function public.capture_activity_log();
drop trigger if exists audit_leases on public.leases;
create trigger audit_leases after insert or update or delete on public.leases
for each row execute function public.capture_activity_log();
drop trigger if exists audit_rent_charges on public.rent_charges;
create trigger audit_rent_charges after insert or update or delete on public.rent_charges
for each row execute function public.capture_activity_log();
drop trigger if exists audit_payments on public.payments;
create trigger audit_payments after insert or update or delete on public.payments
for each row execute function public.capture_activity_log();

revoke all on function public.capture_activity_log() from public, anon, authenticated;
