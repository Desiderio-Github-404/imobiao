-- Allow finance team members to record payments through the atomic payment RPC.
create or replace function public.record_rent_payment(
  p_charge_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method public.payment_method,
  p_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_charge public.rent_charges%rowtype;
  v_payment_id uuid;
  v_new_paid numeric(14,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid payment amount'; end if;
  if p_payment_date is null or p_payment_date > current_date then raise exception 'Invalid payment date'; end if;

  select * into v_charge from public.rent_charges where id = p_charge_id for update;
  if not found then raise exception 'Charge not found'; end if;

  if not public.has_org_role(v_charge.organization_id, array['owner','manager','finance']::public.member_role[]) then
    raise exception 'Permission denied';
  end if;

  v_new_paid := v_charge.amount_paid + p_amount;
  if v_new_paid > v_charge.amount_due then raise exception 'Payment exceeds outstanding balance'; end if;

  insert into public.payments (
    organization_id, charge_id, amount, payment_date, payment_method,
    reference, notes, recorded_by
  ) values (
    v_charge.organization_id, v_charge.id, p_amount, p_payment_date,
    p_payment_method, nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), auth.uid()
  ) returning id into v_payment_id;

  update public.rent_charges
  set amount_paid = v_new_paid,
      status = case
        when v_new_paid = amount_due then 'paid'::public.charge_status
        when v_charge.due_date < p_payment_date then 'overdue'::public.charge_status
        else 'partially_paid'::public.charge_status
      end
  where id = v_charge.id;
  return v_payment_id;
end;
$$;

revoke all on function public.record_rent_payment(uuid,numeric,date,public.payment_method,text,text) from public, anon;
grant execute on function public.record_rent_payment(uuid,numeric,date,public.payment_method,text,text) to authenticated;
