-- ImobiAO: initial database schema
-- Apply this migration before 0002_create_personal_organization.sql.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'manager', 'staff');
create type public.property_type as enum ('residential', 'commercial', 'mixed', 'land', 'other');
create type public.unit_status as enum ('available', 'occupied', 'maintenance', 'inactive');
create type public.lease_status as enum ('draft', 'active', 'ended', 'terminated');
create type public.charge_status as enum ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled');
create type public.payment_method as enum ('cash', 'bank_transfer', 'multicaixa_express', 'other');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  property_type public.property_type not null default 'residential',
  address text,
  municipality text,
  province text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null,
  name text not null,
  floor text,
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(3,1) check (bathrooms is null or bathrooms >= 0),
  monthly_rent numeric(14,2) not null default 0 check (monthly_rent >= 0),
  status public.unit_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, property_id)
    references public.properties(organization_id, id) on delete cascade
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  identity_document text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  unit_id uuid not null,
  tenant_id uuid not null,
  start_date date not null,
  end_date date,
  monthly_rent numeric(14,2) not null check (monthly_rent >= 0),
  deposit_amount numeric(14,2) not null default 0 check (deposit_amount >= 0),
  due_day smallint not null default 1 check (due_day between 1 and 28),
  status public.lease_status not null default 'draft',
  contract_file_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, unit_id)
    references public.units(organization_id, id) on delete restrict,
  foreign key (organization_id, tenant_id)
    references public.tenants(organization_id, id) on delete restrict,
  check (end_date is null or end_date >= start_date)
);

create table public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lease_id uuid not null,
  period_start date not null,
  due_date date not null,
  amount_due numeric(14,2) not null check (amount_due >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  status public.charge_status not null default 'pending',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (lease_id, period_start),
  foreign key (organization_id, lease_id)
    references public.leases(organization_id, id) on delete restrict,
  check (amount_paid <= amount_due)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  charge_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method public.payment_method not null default 'other',
  reference text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, charge_id)
    references public.rent_charges(organization_id, id) on delete restrict
);

create index memberships_user_id_idx on public.memberships(user_id);
create index properties_org_idx on public.properties(organization_id);
create index units_org_property_idx on public.units(organization_id, property_id);
create index tenants_org_idx on public.tenants(organization_id);
create index leases_org_unit_idx on public.leases(organization_id, unit_id);
create index leases_org_tenant_idx on public.leases(organization_id, tenant_id);
create index rent_charges_org_due_date_idx on public.rent_charges(organization_id, due_date);
create index payments_org_charge_idx on public.payments(organization_id, charge_id);

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, public.member_role[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.member_role[]) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['organizations','profiles','properties','units','tenants','leases','rent_charges']
  loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.leases enable row level security;
alter table public.rent_charges enable row level security;
alter table public.payments enable row level security;

create policy "Members can view their organizations"
on public.organizations for select to authenticated
using (public.is_org_member(id));

create policy "Users can create an organization for themselves"
on public.organizations for insert to authenticated
with check (created_by = auth.uid());

create policy "Members can view organization memberships"
on public.memberships for select to authenticated
using (public.is_org_member(organization_id));

create policy "Owners and managers can manage memberships"
on public.memberships for all to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "Users can insert their own profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "Organization members can view properties"
on public.properties for select to authenticated
using (public.is_org_member(organization_id));
create policy "Managers can manage properties"
on public.properties for all to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

create policy "Organization members can view units"
on public.units for select to authenticated
using (public.is_org_member(organization_id));
create policy "Managers can manage units"
on public.units for all to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

create policy "Organization members can view tenants"
on public.tenants for select to authenticated
using (public.is_org_member(organization_id));
create policy "Managers can manage tenants"
on public.tenants for all to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

create policy "Organization members can view leases"
on public.leases for select to authenticated
using (public.is_org_member(organization_id));
create policy "Managers can manage leases"
on public.leases for all to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

create policy "Organization members can view rent charges"
on public.rent_charges for select to authenticated
using (public.is_org_member(organization_id));
create policy "Managers can manage rent charges"
on public.rent_charges for all to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

create policy "Organization members can view payments"
on public.payments for select to authenticated
using (public.is_org_member(organization_id));
create policy "Managers can manage payments"
on public.payments for all to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
