-- Renew a lease atomically while preserving the previous contract and its financial records.
create or replace function public.renew_lease(
  p_lease_id uuid,
  p_start_date date,
  p_end_date date,
  p_monthly_rent numeric,
  p_deposit_amount numeric,
  p_due_day smallint,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old public.leases%rowtype;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_start_date is null or p_monthly_rent is null or p_monthly_rent < 0
     or p_deposit_amount is null or p_deposit_amount < 0
     or p_due_day is null or p_due_day < 1 or p_due_day > 28
     or (p_end_date is not null and p_end_date < p_start_date)
     or length(coalesce(p_notes, '')) > 2000 then
    raise exception 'Invalid renewal data';
  end if;

  select * into v_old
  from public.leases
  where id = p_lease_id
  for update;

  if not found then
    raise exception 'Lease not found';
  end if;
  if not public.has_org_role(v_old.organization_id, array['owner','manager']::public.member_role[]) then
    raise exception 'Permission denied';
  end if;
  if v_old.status <> 'active' then
    raise exception 'Only active leases can be renewed';
  end if;
  if p_start_date <= v_old.start_date then
    raise exception 'Renewal must start after the original start date';
  end if;

  -- Close the old lease the day before the renewal begins, unless it had already ended earlier.
  update public.leases
  set end_date = case
        when end_date is null or end_date >= p_start_date then p_start_date - 1
        else end_date
      end,
      status = 'ended'::public.lease_status
  where id = v_old.id;

  insert into public.leases (
    organization_id, unit_id, tenant_id, start_date, end_date,
    monthly_rent, deposit_amount, due_day, status, notes
  ) values (
    v_old.organization_id, v_old.unit_id, v_old.tenant_id, p_start_date, p_end_date,
    p_monthly_rent, p_deposit_amount, p_due_day, 'active'::public.lease_status,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke all on function public.renew_lease(uuid,date,date,numeric,numeric,smallint,text) from public, anon;
grant execute on function public.renew_lease(uuid,date,date,numeric,numeric,smallint,text) to authenticated;
