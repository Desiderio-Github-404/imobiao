-- ImobiAO team management and finance role.
alter type public.member_role add value if not exists 'finance';

drop policy if exists "Owners and managers can manage memberships" on public.memberships;
create policy "Only owners can manage memberships"
on public.memberships for all to authenticated
using (public.has_org_role(organization_id, array['owner']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner']::public.member_role[]));

drop policy if exists "Finance can manage rent charges" on public.rent_charges;
create policy "Finance can manage rent charges"
on public.rent_charges for all to authenticated
using (public.has_org_role(organization_id, array['finance']::public.member_role[]))
with check (public.has_org_role(organization_id, array['finance']::public.member_role[]));

drop policy if exists "Finance can manage payments" on public.payments;
create policy "Finance can manage payments"
on public.payments for all to authenticated
using (public.has_org_role(organization_id, array['finance']::public.member_role[]))
with check (public.has_org_role(organization_id, array['finance']::public.member_role[]));

create or replace function public.list_org_members()
returns table(user_id uuid, email text, full_name text, role public.member_role, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, p.full_name, m.role, m.created_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = (
    select mine.organization_id from public.memberships mine
    where mine.user_id = auth.uid()
    order by mine.created_at asc limit 1
  )
  and exists (
    select 1 from public.memberships own
    where own.organization_id = m.organization_id
      and own.user_id = auth.uid()
  )
  order by case m.role when 'owner' then 0 when 'manager' then 1 when 'finance' then 2 else 3 end, m.created_at;
$$;

create or replace function public.add_org_member(p_email text, p_role public.member_role)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_user uuid;
begin
  select organization_id into v_org
  from public.memberships
  where user_id = auth.uid()
  order by created_at asc limit 1;

  if v_org is null or not public.has_org_role(v_org, array['owner']::public.member_role[]) then
    raise exception 'Only organization owners can manage team members';
  end if;
  if p_email is null or length(trim(p_email)) < 5 or p_role not in ('manager','finance','staff') then
    raise exception 'Invalid email or role';
  end if;

  select id into v_user from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user is null then
    raise exception 'No account exists for this email. The person must register first.';
  end if;

  insert into public.memberships(organization_id,user_id,role)
  values(v_org,v_user,p_role)
  on conflict (organization_id,user_id)
  do update set role = excluded.role;

  return v_user;
end;
$$;

create or replace function public.update_org_member_role(p_user_id uuid, p_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org uuid; v_target_role public.member_role;
begin
  select organization_id into v_org from public.memberships
  where user_id = auth.uid() order by created_at asc limit 1;
  if v_org is null or not public.has_org_role(v_org, array['owner']::public.member_role[]) then
    raise exception 'Only organization owners can manage team members';
  end if;
  if p_role not in ('manager','finance','staff') then raise exception 'Invalid role'; end if;

  select role into v_target_role from public.memberships
  where organization_id = v_org and user_id = p_user_id for update;
  if not found then raise exception 'Member not found'; end if;
  if v_target_role = 'owner' then raise exception 'Owner role cannot be changed here'; end if;

  update public.memberships set role = p_role
  where organization_id = v_org and user_id = p_user_id;
end;
$$;

create or replace function public.remove_org_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org uuid; v_target_role public.member_role;
begin
  select organization_id into v_org from public.memberships
  where user_id = auth.uid() order by created_at asc limit 1;
  if v_org is null or not public.has_org_role(v_org, array['owner']::public.member_role[]) then
    raise exception 'Only organization owners can manage team members';
  end if;
  if p_user_id = auth.uid() then raise exception 'You cannot remove your own owner account'; end if;

  select role into v_target_role from public.memberships
  where organization_id = v_org and user_id = p_user_id for update;
  if not found then raise exception 'Member not found'; end if;
  if v_target_role = 'owner' then raise exception 'Owner account cannot be removed here'; end if;

  delete from public.memberships where organization_id = v_org and user_id = p_user_id;
end;
$$;

revoke all on function public.list_org_members() from public, anon;
revoke all on function public.add_org_member(text, public.member_role) from public, anon;
revoke all on function public.update_org_member_role(uuid, public.member_role) from public, anon;
revoke all on function public.remove_org_member(uuid) from public, anon;
grant execute on function public.list_org_members() to authenticated;
grant execute on function public.add_org_member(text, public.member_role) to authenticated;
grant execute on function public.update_org_member_role(uuid, public.member_role) to authenticated;
grant execute on function public.remove_org_member(uuid) to authenticated;
