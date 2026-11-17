-- ImobiAO | Initial schema
-- Run this migration in the Supabase SQL Editor.
-- All business records are scoped to an organization and protected by RLS.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'manager', 'staff');
create type public.property_type as enum ('building', 'house', 'apartment', 'commercial', 'land', 'other');
create type public.unit_status as enum ('available', 'occupied', 'maintenance', 'inactive');
create type public.lease_status as enum ('draft', 'active', 'ended', 'terminated');
create type public.charge_status as enum ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled');
create type public.payment_method as enum ('cash', 'bank_transfer', 'multicaixa_express', 'deposit', 'other');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  currency text not null default 'AOA' check (currency = 'AOA'),
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
  unique (id, organization_id)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  property_type public.property_type not null default 'building',
  description text,
  province text not null default 'Luanda',
  municipality text,
  neighborhood text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null,
  code text not null,
  unit_type text not null default 'Apartamento',
  bedrooms smallint check (bedrooms is null or bedrooms >= 0),
  bathrooms smallint check (bathrooms is null or bathrooms >= 0),
  monthly_rent numeric(14,2) not null default 0 check (monthly_rent >= 0),
  status public.unit_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (property_id, code),
  foreign key (property_id, organization_id)
    references public.properties(id, organization_id) on delete cascade
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  bi_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  unit_id uuid not null,
  tenant_id uuid not null,
  start_date date not null,
  end_date date,
  rent_amount numeric(14,2) not null check (rent_amount > 0),
  billing_day smallint not null default 1 check (billing_day between 1 and 28),
  billing_frequency text not null default 'monthly' check (billing_frequency in ('monthly', 'quarterly', 'semiannual', 'annual')),
  deposit_amount numeric(14,2) not null default 0 check (deposit_amount >= 0),
  status public.lease_status not null default 'draft',
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (unit_id, organization_id)
    references public.units(id, organization_id) on delete restrict,
  foreign key (tenant_id, organization_id)
    references public.tenants(id, organization_id) on delete restrict,
  check (end_date is null or end_date >= start_date)
);

create table public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lease_id uuid not null,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  amount_due numeric(14,2) not null check (amount_due > 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  status public.charge_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lease_id, period_start),
  unique (id, organization_id),
  foreign key (lease_id, organization_id)
    references public.leases(id, organization_id) on delete restrict,
  check (period_end >= period_start),
  check (amount_paid <= amount_due)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  charge_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method public.payment_method not null default 'other',
  reference text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (charge_id, organization_id)
    references public.rent_charges(id, organization_id) on delete restrict
);

create index memberships_user_idx on public.memberships(user_id);
create index properties_org_idx on public.properties(organization_id);
create index units_org_property_idx on public.units(organization_id, property_id);
create index tenants_org_idx on public.tenants(organization_id);
create index leases_org_status_idx on public.leases(organization_id, status);
create index charges_org_due_idx on public.rent_charges(organization_id, due_date, status);
create index payments_org_paid_idx on public.payments(organization_id, paid_at desc);

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org and m.user_id = (select auth.uid())
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
      and m.user_id = (select auth.uid())
      and m.role = any(allowed_roles)
  );
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

create policy "Users can view their organizations"
on public.organizations for select to authenticated
using (public.is_org_member(id));

create policy "Authenticated users can create an organization for themselves"
on public.organizations for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "Owners and managers can update organization"
on public.organizations for update to authenticated
using (public.has_org_role(id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(id, array['owner','manager']::public.member_role[]));

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Users can create their own profile"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Members can view organization memberships"
on public.memberships for select to authenticated
using (public.is_org_member(organization_id));

create policy "Owners can add memberships"
on public.memberships for insert to authenticated
with check (public.has_org_role(organization_id, array['owner']::public.member_role[]));

create policy "Owners can update memberships"
on public.memberships for update to authenticated
using (public.has_org_role(organization_id, array['owner']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner']::public.member_role[]));

create policy "Owners can remove memberships"
on public.memberships for delete to authenticated
using (public.has_org_role(organization_id, array['owner']::public.member_role[]));

create policy "Members can view properties"
on public.properties for select to authenticated using (public.is_org_member(organization_id));
create policy "Managers can insert properties"
on public.properties for insert to authenticated with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
create policy "Managers can update properties"
on public.properties for update to authenticated using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
create policy "Owners can delete properties"
on public.properties for delete to authenticated using (public.has_org_role(organization_id, array['owner']::public.member_role[]));

create policy "Members can view units"
on public.units for select to authenticated using (public.is_org_member(organization_id));
create policy "Managers can insert units"
on public.units for insert to authenticated with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
create policy "Managers can update units"
on public.units for update to authenticated using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
create policy "Owners can delete units"
on public.units for delete to authenticated using (public.has_org_role(organization_id, array['owner']::public.member_role[]));

create policy "Members can view tenants"
on public.tenants for select to authenticated using (public.is_org_member(organization_id));
create policy "Managers can insert tenants"
on public.tenants for insert to authenticated with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
create policy "Managers can update tenants"
on public.tenants for update to authenticated using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
create policy "Owners can delete tenants"
on public.tenants for delete to authenticated using (public.has_org_role(organization_id, array['owner']::public.member_role[]));

create policy "Members can view leases"
on public.leases for select to authenticated using (public.is_org_member(organization_id));
create policy "Managers can insert leases"
on public.leases for insert to authenticated with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
create policy "Managers can update leases"
on public.leases for update to authenticated using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));
create policy "Owners can delete draft leases"
on public.leases for delete to authenticated using (
  status = 'draft' and public.has_org_role(organization_id, array['owner']::public.member_role[])
);

create policy "Members can view rent charges"
on public.rent_charges for select to authenticated using (public.is_org_member(organization_id));
create policy "Managers can manage rent charges"
on public.rent_charges for all to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

create policy "Members can view payments"
on public.payments for select to authenticated using (public.is_org_member(organization_id));
create policy "Managers can record payments"
on public.payments for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','manager','staff']::public.member_role[])
  and (recorded_by is null or recorded_by = (select auth.uid()))
);
create policy "Owners and managers can correct payments"
on public.payments for update to authenticated
using (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','manager']::public.member_role[]));

create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger properties_updated_at before update on public.properties
for each row execute function public.set_updated_at();
create trigger units_updated_at before update on public.units
for each row execute function public.set_updated_at();
create trigger tenants_updated_at before update on public.tenants
for each row execute function public.set_updated_at();
create trigger leases_updated_at before update on public.leases
for each row execute function public.set_updated_at();
create trigger rent_charges_updated_at before update on public.rent_charges
for each row execute function public.set_updated_at();

-- IMPORTANT: first-organization creation and invitation flows will be added
-- through trusted server-side code before production onboarding is enabled.
