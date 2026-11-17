-- Automatically create the current month's rent charge for every active lease.
-- Runs daily so newly activated leases are picked up without owner intervention.
-- The unique constraint on (lease_id, period_start) makes this safe to retry.

create or replace function public.generate_current_month_rent_charges()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period_start date := date_trunc('month', current_date)::date;
  v_period_end date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_created integer := 0;
begin
  insert into public.rent_charges (
    organization_id,
    lease_id,
    period_start,
    due_date,
    amount_due,
    amount_paid,
    status,
    description
  )
  select
    l.organization_id,
    l.id,
    v_period_start,
    make_date(
      extract(year from v_period_start)::integer,
      extract(month from v_period_start)::integer,
      least(l.due_day::integer, extract(day from v_period_end)::integer)
    ),
    l.monthly_rent,
    0,
    case
      when make_date(
        extract(year from v_period_start)::integer,
        extract(month from v_period_start)::integer,
        least(l.due_day::integer, extract(day from v_period_end)::integer)
      ) < current_date then 'overdue'::public.charge_status
      else 'pending'::public.charge_status
    end,
    'Renda referente a ' || to_char(v_period_start, 'MM/YYYY')
  from public.leases l
  where l.status = 'active'
    and l.start_date <= current_date
    and (l.end_date is null or l.end_date >= v_period_start)
  on conflict (lease_id, period_start) do nothing;

  get diagnostics v_created = row_count;
  return v_created;
end;
$$;

revoke all on function public.generate_current_month_rent_charges() from public, anon, authenticated;


-- Also generate the current month's charge immediately when a lease is activated
-- or its billing terms change, rather than waiting for the daily schedule.
create or replace function public.on_lease_billing_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
begin
  if new.status = 'active' then
    perform public.generate_current_month_rent_charges();
  end if;
  return new;
end;
$func$;

drop trigger if exists on_lease_billing_change on public.leases;
create trigger on_lease_billing_change
after insert or update of status, start_date, end_date, monthly_rent, due_day
on public.leases
for each row execute function public.on_lease_billing_change();

-- Supabase projects support pg_cron. The job runs at 00:05 UTC (01:05 in Angola).
create extension if not exists pg_cron;

select cron.unschedule('imobiao-monthly-rent-charges')
where exists (
  select 1 from cron.job where jobname = 'imobiao-monthly-rent-charges'
);

select cron.schedule(
  'imobiao-monthly-rent-charges',
  '5 0 * * *',
  $$select public.generate_current_month_rent_charges();$$
);

-- Run once immediately so the current month is not left waiting for tomorrow's schedule.
select public.generate_current_month_rent_charges() as charges_created;
