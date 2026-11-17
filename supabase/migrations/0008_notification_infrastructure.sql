-- ImobiAO notification foundation: in-app alerts + WhatsApp outbox.
-- This migration queues messages only. Actual WhatsApp delivery is enabled later
-- through the official WhatsApp Business Platform and a server-side worker.

create unique index if not exists payments_org_id_uidx on public.payments(organization_id, id);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('payment_received','rent_due_soon','rent_due_today','rent_overdue')),
  title text not null,
  body text not null,
  related_charge_id uuid,
  related_payment_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, related_charge_id)
    references public.rent_charges(organization_id, id) on delete cascade,
  foreign key (organization_id, related_payment_id)
    references public.payments(organization_id, id) on delete cascade
);

create index if not exists app_notifications_user_created_idx
  on public.app_notifications(user_id, created_at desc);
create index if not exists app_notifications_org_created_idx
  on public.app_notifications(organization_id, created_at desc);

alter table public.app_notifications enable row level security;

drop policy if exists "Users can view their own organization notifications" on public.app_notifications;
create policy "Users can view their own organization notifications"
on public.app_notifications for select to authenticated
using (user_id = auth.uid() and public.is_org_member(organization_id));

drop policy if exists "Users can mark their own notifications as read" on public.app_notifications;
create policy "Users can mark their own notifications as read"
on public.app_notifications for update to authenticated
using (user_id = auth.uid() and public.is_org_member(organization_id))
with check (user_id = auth.uid() and public.is_org_member(organization_id));

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null,
  charge_id uuid not null,
  channel text not null default 'whatsapp' check (channel = 'whatsapp'),
  event_type text not null check (event_type in ('rent_due_soon','rent_due_today','rent_overdue','payment_received')),
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','sent','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  payment_id uuid references public.payments(id) on delete cascade,
  provider_message_id text,
  last_error text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, tenant_id)
    references public.tenants(organization_id, id) on delete cascade,
  foreign key (organization_id, charge_id)
    references public.rent_charges(organization_id, id) on delete cascade,
);

create unique index if not exists notification_outbox_reminder_uidx
  on public.notification_outbox(charge_id, event_type, channel)
  where event_type <> 'payment_received';
create unique index if not exists notification_outbox_payment_uidx
  on public.notification_outbox(payment_id, channel)
  where payment_id is not null;

create index if not exists notification_outbox_queue_idx
  on public.notification_outbox(status, scheduled_at)
  where status in ('queued','failed');

alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public, anon, authenticated;
revoke all on public.app_notifications from anon;

-- When a payment is recorded, notify the organization's owners/managers and
-- queue a tenant WhatsApp confirmation only when explicit consent is enabled.
create or replace function public.enqueue_payment_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charge public.rent_charges%rowtype;
  v_tenant public.tenants%rowtype;
  v_property_name text;
  v_unit_name text;
begin
  select * into v_charge
  from public.rent_charges
  where id = new.charge_id and organization_id = new.organization_id;

  if not found then return new; end if;

  select t.* into v_tenant
  from public.leases l
  join public.tenants t
    on t.id = l.tenant_id and t.organization_id = l.organization_id
  where l.id = v_charge.lease_id and l.organization_id = new.organization_id;

  select p.name, u.name into v_property_name, v_unit_name
  from public.leases l
  join public.units u
    on u.id = l.unit_id and u.organization_id = l.organization_id
  join public.properties p
    on p.id = u.property_id and p.organization_id = u.organization_id
  where l.id = v_charge.lease_id and l.organization_id = new.organization_id;

  insert into public.app_notifications (
    organization_id, user_id, event_type, title, body,
    related_charge_id, related_payment_id
  )
  select new.organization_id, m.user_id, 'payment_received',
    'Pagamento registado',
    'Foi registado um pagamento de ' ||
      to_char(new.amount, 'FM999G999G999G990D00') || ' Kz para ' ||
      coalesce(v_tenant.full_name, 'o inquilino') || '.',
    new.charge_id, new.id
  from public.memberships m
  where m.organization_id = new.organization_id
    and m.role in ('owner','manager')
  on conflict do nothing;

  if v_tenant.whatsapp_notifications_enabled
     and v_tenant.whatsapp_phone is not null then
    insert into public.notification_outbox (
      organization_id, tenant_id, charge_id, event_type, recipient, payload, payment_id
    ) values (
      new.organization_id, v_tenant.id, new.charge_id, 'payment_received',
      v_tenant.whatsapp_phone,
      jsonb_build_object(
        'tenant_name', v_tenant.full_name,
        'payment_amount', new.amount,
        'payment_date', new.payment_date,
        'currency', 'AOA',
        'property_name', v_property_name,
        'unit_name', v_unit_name,
        'receipt_note', 'O recibo está disponível na plataforma ImobiAO.'
      ),
      new.id
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists enqueue_payment_notifications on public.payments;
create trigger enqueue_payment_notifications
after insert on public.payments
for each row execute function public.enqueue_payment_notifications();

-- Daily job queues tenant reminders at 5 days before due date, on due date,
-- and once on the first day overdue. It never sends a message by itself.
create or replace function public.enqueue_rent_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
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

revoke all on function public.enqueue_payment_notifications() from public, anon, authenticated;
revoke all on function public.enqueue_rent_reminders() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.unschedule('imobiao-rent-reminder-queue')
where exists (
  select 1 from cron.job where jobname = 'imobiao-rent-reminder-queue'
);

select cron.schedule(
  'imobiao-rent-reminder-queue',
  '10 0 * * *',
  $$select public.enqueue_rent_reminders();$$
);
