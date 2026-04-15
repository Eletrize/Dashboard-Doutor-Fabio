-- Arquivo: SUPABASE_UPDATE_ROKU_VARANDA_ID.sql
-- Objetivo: atualizar o Roku da Varanda para o novo device_id 12675
-- na tabela public.environment_device_registry.

begin;

insert into public.environment_device_registry (
  environment_key,
  device_id,
  device_type,
  device_name
)
values (
  'ambiente3',
  '12675',
  'roku',
  'Roku'
)
on conflict (environment_key, device_id) do update
set
  device_type = excluded.device_type,
  device_name = excluded.device_name;

-- Remove qualquer registro antigo de Roku no ambiente3
-- para evitar permissao em device_id legado.
delete from public.environment_device_registry
where environment_key = 'ambiente3'
  and device_type = 'roku'
  and device_id <> '12675';

commit;

-- Validacao rapida:
-- select environment_key, device_id, device_type, device_name
-- from public.environment_device_registry
-- where environment_key = 'ambiente3' and device_type = 'roku';
