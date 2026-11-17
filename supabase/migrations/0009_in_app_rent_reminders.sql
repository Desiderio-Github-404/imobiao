-- ImobiAO: in-app rent reminders for owners and managers.
-- Safe to run once; the unique index and function replacement are idempotent.

create unique index if not exists app_notifications_rent_event_uidx
  on public.app_notifications(organization_id, user_id, related_charge_id, event_type)
  where related_charge_id is not null and event_type <> 'payment_received';

create or replace function public.enqueue_rent_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  -- Notify organization owners/managers inside the ImobiAO dashboard.
  -- This is independent of WhatsApp consent and does not send external messages.
  insert into public.app_notifications (
    organization_id, user_id, event_type, title, body, related_charge_id
  )
  select
    rc.organization_id,
    m.user_id,
    case
      when rc.due_date = current_date + 5 then 'rent_due_soon'
      when rc.due_date = current_date then 'rent_due_today'
      else 'rent_overdue'
    end,
    case
      when rc.due_date = current_date + 5 then 'Renda a vencer em 5 dias'
      when rc.due_date = current_date then 'Renda vence hoje'
      else 'Renda em atraso'
    end,
    'A cobrança de ' ||
      coalesce(t.full_name, 'um inquilino') ||
      ' (' || coalesce(p.name, 'imóvel') || ' / ' || coalesce(u.name, 'unidade') ||
      ') tem um saldo de ' ||
      to_char(rc.amount_due - rc.amount_paid, 'FM999G999G999G990D00') ||
      ' Kz. Vencimento: ' || to_char(rc.due_date, 'DD/MM/YYYY') || '.',
    rc.id
  from public.rent_charges rc
  join public.leases l
    on l.id = rc.lease_id and l.organization_id = rc.organization_id
  join public.tenants t
    on t.id = l.tenant_id and t.organization_id = l.organization_id
  join public.units u
    on u.id = l.unit_id and u.organization_id = l.organization_id
  join public.properties p
    on p.id = u.property_id and p.organization_id = u.organization_id
  join public.memberships m
    on m.organization_id = rc.organization_id and m.role in ('owner','manager')
  where rc.status in ('pending','partially_paid','overdue')
    and rc.amount_due > rc.amount_paid
    and (
      rc.due_date = current_date + 5
      or rc.due_date = current_date
      or rc.due_date = current_date - 1
    )
  on conflict (organization_id, user_id, related_charge_id, event_type)
    where related_charge_id is not null and event_type <> 'payment_received'
    do nothing;

  -- Queue WhatsApp reminders only for tenants with explicit consent.
  -- A separate worker and Meta credentials are required for actual delivery.
  insert into public.notification_outbox (
    organization_id, tenant_id, charge_id, event_type, recipient, payload
  )
  select
    rc.organization_id, t.id, rc.id,
    case
      when rc.due_date = current_date + 5 then 'rent_due_soon'
      when rc.due_date = current_date then 'rent_due_today'
      else 'rent_overdue'
    end,
    t.whatsapp_phone,
    jsonb_build_object(
      'tenant_name', t.full_name,
      'amount_due', rc.amount_due,
      'amount_paid', rc.amount_paid,
      'balance', rc.amount_due - rc.amount_paid,
      'due_date', rc.due_date,
      'currency', 'AOA',
      'property_name', p.name,
      'unit_name', u.name
    )
  from public.rent_charges rc
  join public.leases l
    on l.id = rc.lease_id and l.organization_id = rc.organization_id
  join public.tenants t
    on t.id = l.tenant_id and t.organization_id = l.organization_id
  join public.units u
    on u.id = l.unit_id and u.organization_id = l.organization_id
  join public.properties p
    on p.id = u.property_id and p.organization_id = u.organization_id
  where rc.status in ('pending','partially_paid','overdue')
    and rc.amount_due > rc.amount_paid
    and t.whatsapp_notifications_enabled = true
    and t.whatsapp_phone is not null
    and (
      rc.due_date = current_date + 5
      or rc.due_date = current_date
      or rc.due_date = current_date - 1
    )
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.enqueue_rent_reminders() from public, anon, authenticated;
