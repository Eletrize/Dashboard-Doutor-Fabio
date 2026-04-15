-- Arquivo: SUPABASE_CREATE_USER_FABIO5SNEW.sql
-- Objetivo: configurar acesso do usuário fabio5snew@icloud.com
-- Regras aplicadas:
--   - Sem acesso de administrador
--   - Com acesso a cenários (can_create_scenes = true)
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

  -- Sincroniza o registro de dispositivos por ambiente
  -- (necessario para perfis restritos conseguirem enviar comandos sem 403)
  delete from public.environment_device_registry
   where environment_key in (
     'ambiente1',
     'ambiente2',
     'ambiente3',
     'ambiente4',
     'ambiente5',
     'ambiente6',
     'ambiente7',
     'ambiente8',
     'ambiente9',
     'ambiente10'
   );

  insert into public.environment_device_registry (
    environment_key,
    device_id,
    device_type,
    device_name
  )
  values
    ('ambiente1', '12243', 'lights', 'Spots Painel'),
    ('ambiente1', '12229', 'lights', 'Spots'),
    ('ambiente1', '2', 'comfort', 'Home'),
    ('ambiente1', '12298', 'curtains', 'Cortina'),
    ('ambiente1', '4', 'tv', 'Televisao'),
    ('ambiente1', '5', 'bluray', 'Blu-ray'),
    ('ambiente1', '6', 'appletv', 'Apple TV'),
    ('ambiente1', '7', 'clarotv', 'NET'),
    ('ambiente1', '12409', 'music', 'Denon'),

    ('ambiente2', '12244', 'lights', 'Canjiquinha'),
    ('ambiente2', '12245', 'lights', 'Entrada'),
    ('ambiente2', '12246', 'lights', 'Spots'),
    ('ambiente2', '12247', 'lights', 'Sanca'),
    ('ambiente2', '12233', 'lights', 'Lustre'),
    ('ambiente2', '12231', 'lights', 'Spots Dimmer'),
    ('ambiente2', '9', 'curtains', 'Corredor'),
    ('ambiente2', '12', 'curtains', 'Varanda'),
    ('ambiente2', '10', 'comfort', 'Living'),

    ('ambiente3', '12248', 'lights', 'Spots'),
    ('ambiente3', '12249', 'lights', 'Churrasqueira'),
    ('ambiente3', '12230', 'lights', 'Pendente'),
    ('ambiente3', '11', 'curtains', 'Churrasqueira'),
    ('ambiente3', '13', 'curtains', 'Central Esquerda'),
    ('ambiente3', '15', 'curtains', 'Central Direita'),
    ('ambiente3', '14', 'curtains', 'Corredor'),
    ('ambiente3', '16', 'comfort', 'Varanda'),
    ('ambiente3', '12675', 'roku', 'Roku'),
    ('ambiente3', '123', 'games', 'Games'),
    ('ambiente3', '18', 'music', 'Denon'),
    ('ambiente3', '19', 'tv', 'Televisao'),
    ('ambiente3', '270', 'system', 'Pool Light'),
    ('ambiente3', '152', 'system', 'Cascata'),
    ('ambiente3', '153', 'system', 'Hidromassagem'),
    ('ambiente3', '161', 'system', 'Deck'),
    ('ambiente3', '162', 'system', 'Toldo'),
    ('ambiente3', '114', 'system', 'Controle'),

    ('ambiente4', '12250', 'lights', 'Espetos Corredor'),
    ('ambiente4', '12252', 'lights', 'Piscina'),
    ('ambiente4', '12450', 'lights', 'LED Piscina'),
    ('ambiente4', '12449', 'lights', 'LED Mode'),

    ('ambiente5', '12388', 'comfort', 'Escritorio'),
    ('ambiente5', '21', 'curtains', 'Cortina'),

    ('ambiente6', '12258', 'lights', 'Trilho'),
    ('ambiente6', '12459', 'lights', 'Copa'),

    ('ambiente7', '12593', 'comfort', 'Brinquedoteca'),
    ('ambiente7', '12606', 'tv', 'Televisao'),

    ('ambiente8', '12638', 'comfort', 'Suite Milena'),
    ('ambiente8', '12646', 'curtains', 'Cortina Abre'),
    ('ambiente8', '12647', 'curtains', 'Cortina Fecha'),
    ('ambiente8', '12674', 'curtains', 'Cortina Banheiro'),
    ('ambiente8', '12636', 'tv', 'Televisao'),
    ('ambiente8', '54', 'music', 'Musica'),
    ('ambiente8', '55', 'clarotv', 'Claro TV'),

    ('ambiente9', '12613', 'comfort', 'Suite Fabio'),
    ('ambiente9', '12616', 'curtains', 'Cortina'),

    ('ambiente10', '12622', 'comfort', 'Suite Laura'),
    ('ambiente10', '12619', 'curtains', 'Cortina')
  on conflict (environment_key, device_id) do update
  set
    device_type = excluded.device_type,
    device_name = excluded.device_name;

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
    (v_user_id, 'ambiente1', true, true, true),
    (v_user_id, 'ambiente2', true, true, true),
    (v_user_id, 'ambiente3', true, true, true),
    (v_user_id, 'ambiente4', true, true, true),
    (v_user_id, 'ambiente5', true, true, true),
    (v_user_id, 'ambiente6', true, true, true),
    (v_user_id, 'ambiente7', true, true, true),
    (v_user_id, 'ambiente8', true, true, true),
    (v_user_id, 'ambiente9', true, true, true),
    (v_user_id, 'ambiente10', true, true, true)
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
