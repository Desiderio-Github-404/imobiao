-- Add a dedicated finance role. Keep this migration separate because PostgreSQL
-- requires a newly-added enum value to be committed before it can be used.
alter type public.member_role add value if not exists 'finance';
