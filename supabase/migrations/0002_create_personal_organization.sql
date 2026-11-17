-- Bootstrap an owner's first organization atomically.
-- Call this RPC after sign-up; it creates the organization and owner membership together.

create or replace function public.create_personal_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  new_org_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if org_name is null or length(trim(org_name)) < 2 then
    raise exception 'Organization name must contain at least 2 characters';
  end if;

  insert into public.organizations (name, created_by)
  values (trim(org_name), current_user_id)
  returning id into new_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (new_org_id, current_user_id, 'owner');

  insert into public.profiles (id)
  values (current_user_id)
  on conflict (id) do nothing;

  return new_org_id;
end;
$$;

revoke all on function public.create_personal_organization(text) from public;
grant execute on function public.create_personal_organization(text) to authenticated;
