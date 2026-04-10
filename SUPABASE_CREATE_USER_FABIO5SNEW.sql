-- Arquivo: SUPABASE_CREATE_USER_FABIO5SNEW.sql
-- Objetivo: configurar acesso do usuário fabio5snew@icloud.com
-- Regras aplicadas:
--   - Sem acesso de administrador
--   - Sem acesso a cenários (can_create_scenes = false)
--   - Acesso de visualização e controle para todos os ambientes

begin;

do $$
declare
  v_user_id uuid;
begin
  select id
    into v_user_id
    from auth.users
   where lower(email) = lower('fabio5snew@icloud.com')
   limit 1;

  if v_user_id is null then
    raise exception 'Usuario fabio5snew@icloud.com nao encontrado em auth.users. Crie primeiro em Authentication > Users.';
  end if;

  insert into public.user_access_profiles (
    user_id,
    role,
    display_name,
    is_admin
  )
  values (
    v_user_id,
    'morador',
    'Fabio 5',
    false
  )
  on conflict (user_id) do update
  set
    role = excluded.role,
    display_name = excluded.display_name,
    is_admin = excluded.is_admin;

  delete from public.user_environment_access
   where user_id = v_user_id;

  insert into public.user_environment_access (
    user_id,
    environment_key,
    can_view,
    can_control,
    can_create_scenes
  )
  values
    (v_user_id, 'ambiente1', true, true, false),
    (v_user_id, 'ambiente2', true, true, false),
    (v_user_id, 'ambiente3', true, true, false),
    (v_user_id, 'ambiente4', true, true, false),
    (v_user_id, 'ambiente5', true, true, false),
    (v_user_id, 'ambiente6', true, true, false),
    (v_user_id, 'ambiente7', true, true, false),
    (v_user_id, 'ambiente8', true, true, false),
    (v_user_id, 'ambiente9', true, true, false),
    (v_user_id, 'ambiente10', true, true, false)
  on conflict (user_id, environment_key) do update
  set
    can_view = excluded.can_view,
    can_control = excluded.can_control,
    can_create_scenes = excluded.can_create_scenes;
end $$;

commit;

-- Validacao rapida (rode apos o script)
-- select
--   p.user_id,
--   p.role,
--   p.is_admin,
--   a.environment_key,
--   a.can_view,
--   a.can_control,
--   a.can_create_scenes
-- from public.user_access_profiles p
-- join public.user_environment_access a on a.user_id = p.user_id
-- where p.user_id = (
--   select id from auth.users where lower(email) = lower('fabio5snew@icloud.com')
-- )
-- order by a.environment_key;
