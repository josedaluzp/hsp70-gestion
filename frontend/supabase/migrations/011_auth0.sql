-- 011_auth0.sql — Desacoplar identidad de Supabase Auth, preparar para Auth0

-- 1. Columna para el identificador externo de Auth0 (sub)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth0_sub text UNIQUE;

-- 2. id deja de depender de auth.users: lo genera la app
ALTER TABLE usuarios ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Quitar la FK a auth.users (el nombre por defecto es usuarios_id_fkey;
--    confirmar con \d usuarios si difiere)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_id_fkey;

-- 4. Eliminar el trigger y la función que creaban usuarios desde auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
