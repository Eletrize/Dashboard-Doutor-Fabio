-- Arquivo: SUPABASE_ENABLE_SCENES_FABIO5SNEW.sql
-- Objetivo: habilitar exibicao da aba de Cenarios e criacao de cenarios
-- para o usuario fabio5snew@icloud.com.

begin;

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('fabio5snew@icloud.com')
  limit 1
)
update public.user_environment_access as uea
set
  can_view = true,
  can_control = true,
  can_create_scenes = true
where uea.user_id = (select id from target_user);

commit;

-- Validacao rapida:
-- select
--   a.environment_key,
--   a.can_view,
--   a.can_control,
--   a.can_create_scenes
-- from public.user_environment_access a
-- where a.user_id = (
--   select id from auth.users where lower(email) = lower('fabio5snew@icloud.com')
-- )
-- order by a.environment_key;
