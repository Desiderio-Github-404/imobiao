-- WhatsApp contact and explicit consent for tenant notifications.
alter table public.tenants
  add column if not exists whatsapp_phone text,
  add column if not exists whatsapp_notifications_enabled boolean not null default false;

alter table public.tenants
  add constraint tenants_whatsapp_phone_format
  check (whatsapp_phone is null or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$');
