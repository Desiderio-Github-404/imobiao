-- Contract termination with an auditable reason and effective date.
alter table public.leases
  add column if not exists termination_reason text,
  add column if not exists terminated_at timestamptz;

create or replace function public.terminate_lease(
  p_lease_id uuid,
  p_termination_date date,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lease public.leases%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_termination_date is null
     or length(trim(coalesce(p_reason, ''))) < 5
     or length(p_reason) > 1000 then
    raise exception 'Invalid termination data';
  end if;

  select * into v_lease
  from public.leases
  where id = p_lease_id
  for update;

  if not found then
    raise exception 'Lease not found';
  end if;
  if not public.has_org_role(
    v_lease.organization_id,
    array['owner','manager']::public.member_role[]
  ) then
    raise exception 'Permission denied';
  end if;
  if v_lease.status <> 'active' then
    raise exception 'Only active leases can be terminated';
  end if;
  if p_termination_date < v_lease.start_date then
    raise exception 'Termination date cannot precede lease start';
  end if;

  update public.leases
  set status = 'terminated'::public.lease_status,
      end_date = p_termination_date,
      termination_reason = trim(p_reason),
      terminated_at = now()
  where id = p_lease_id;
end;
$$;

revoke all on function public.terminate_lease(uuid,date,text) from public, anon;
grant execute on function public.terminate_lease(uuid,date,text) to authenticated;
