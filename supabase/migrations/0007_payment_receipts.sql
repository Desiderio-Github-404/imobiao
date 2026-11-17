-- Unique receipt numbers for every recorded rent payment.
create sequence if not exists public.payment_receipt_number_seq;

alter table public.payments
  add column if not exists receipt_number text;

-- Backfill existing payments before enforcing NOT NULL.
update public.payments
set receipt_number = 'IMB-' || to_char(payment_date, 'YYYY') || '-' ||
  lpad(nextval('public.payment_receipt_number_seq')::text, 6, '0')
where receipt_number is null;

alter table public.payments
  alter column receipt_number set not null;

create unique index if not exists payments_receipt_number_uidx
  on public.payments(receipt_number);

create or replace function public.assign_payment_receipt_number()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.receipt_number is null or trim(new.receipt_number) = '' then
    new.receipt_number := 'IMB-' || to_char(coalesce(new.payment_date, current_date), 'YYYY') || '-' ||
      lpad(nextval('public.payment_receipt_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_payment_receipt_number on public.payments;
create trigger assign_payment_receipt_number
before insert on public.payments
for each row execute function public.assign_payment_receipt_number();

grant usage, select on sequence public.payment_receipt_number_seq to authenticated;
