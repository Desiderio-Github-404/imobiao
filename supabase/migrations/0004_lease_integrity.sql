-- Prevent two active contracts from occupying the same unit.
create unique index if not exists leases_one_active_per_unit
on public.leases (organization_id, unit_id)
where status = 'active';

create index if not exists leases_org_status_start_idx
on public.leases (organization_id, status, start_date);

-- Keep unit availability aligned when a contract becomes active or ends.
create or replace function public.sync_unit_status_from_lease()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'active' and new.status <> 'active' then
    update public.units
      set status = 'available'
      where organization_id = old.organization_id
        and id = old.unit_id
        and status = 'occupied';
  end if;

  if new.status = 'active' then
    update public.units
      set status = 'occupied'
      where organization_id = new.organization_id
        and id = new.unit_id
        and status in ('available', 'occupied');
  end if;

  return new;
end;
$$;

drop trigger if exists sync_unit_status_from_lease on public.leases;
create trigger sync_unit_status_from_lease
after insert or update of status, unit_id on public.leases
for each row execute function public.sync_unit_status_from_lease();
