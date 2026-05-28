# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace FastAPI + SQLite backend with Supabase (PostgreSQL + Auth) + Vercel API Routes (TypeScript), module by module, each tested before proceeding.

**Architecture:** Vercel serves both frontend (React) and API Routes (`frontend/api/`). All DB operations use Supabase admin client with service role key. Auth uses Supabase Auth; tokens validated in every API route via `verifyToken`.

**Tech Stack:** React 19 + TypeScript + Vite + TailwindCSS v4 (frontend), Vercel Serverless Functions (API), Supabase PostgreSQL + Auth (DB), Vitest (unit tests), Supabase CLI local (integration tests)

---

## M1: Setup — Dependencies, Config, `_lib/` Helpers

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/api/_lib/supabase.ts`
- Create: `frontend/api/_lib/auth.ts`
- Create: `frontend/api/_lib/errors.ts`
- Create: `frontend/api/_lib/types.ts`
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/api/_lib/__tests__/auth.test.ts`

### Task M1.1: Install dependencies

- [ ] **Step 1: Install npm packages**

```bash
cd frontend
npm install @supabase/supabase-js @vercel/node
npm install --save-dev vitest @vitest/coverage-v8
```

- [ ] **Step 2: Verify packages installed**

```bash
cat package.json | grep -E '"@supabase|@vercel/node|vitest'
```
Expected: entries for `@supabase/supabase-js`, `@vercel/node`, `vitest`

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add supabase, vercel/node, vitest dependencies"
```

### Task M1.2: Create vitest config

- [ ] **Step 1: Create `frontend/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['api/**/*.ts'],
      exclude: ['api/**/*.test.ts', 'api/_lib/__tests__/**'],
      thresholds: { lines: 80 }
    }
  }
})
```

- [ ] **Step 2: Add test scripts to `frontend/package.json`**

In the `"scripts"` section, add:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: Verify vitest runs**

```bash
cd frontend && npx vitest run --reporter=verbose 2>&1 | head -20
```
Expected: "No test files found" (acceptable at this stage)

### Task M1.3: Create `_lib/supabase.ts`

- [ ] **Step 1: Create `frontend/api/_lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```

### Task M1.4: Create `_lib/errors.ts`

- [ ] **Step 1: Create `frontend/api/_lib/errors.ts`**

```typescript
import type { VercelResponse } from '@vercel/node'

export function unauthorized(res: VercelResponse, message = 'No autorizado') {
  return res.status(401).json({ error: message })
}

export function forbidden(res: VercelResponse, message = 'Acceso denegado') {
  return res.status(403).json({ error: message })
}

export function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ error: message })
}

export function notFound(res: VercelResponse, message = 'No encontrado') {
  return res.status(404).json({ error: message })
}

export function internalError(res: VercelResponse, message = 'Error interno') {
  return res.status(500).json({ error: message })
}
```

### Task M1.5: Create `_lib/types.ts`

- [ ] **Step 1: Create `frontend/api/_lib/types.ts`**

```typescript
export type RolUsuario = 'admin' | 'profesor' | 'recepcionista' | 'alumno'
export type EstadoInscripcion = 'activa' | 'cancelada' | 'lista_espera'
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
export type TipoTransaccion = 'compra' | 'consumo' | 'devolucion' | 'ajuste_manual'

export interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  dni: string | null
  fecha_nacimiento: string | null
  rol: RolUsuario
  activo: boolean
  creditos: number
  created_at: string
}

export interface Actividad {
  id: number
  nombre: string
  descripcion: string | null
  cupo_maximo: number
  duracion_min: number
  activa: boolean
}

export interface Turno {
  id: number
  actividad_id: number
  profesor_id: string
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin: string
  sala: string | null
  activo: boolean
}

export interface Inscripcion {
  id: number
  alumno_id: string
  turno_id: number
  estado: EstadoInscripcion
  fecha_inscripcion: string
}

export interface Asistencia {
  id: number
  inscripcion_id: number
  fecha: string
  presente: boolean
  observacion: string | null
}

export interface Plan {
  id: number
  nombre: string
  creditos: number
  precio: number
  descripcion: string | null
}

export interface TransaccionCredito {
  id: number
  usuario_id: string
  tipo: TipoTransaccion
  cantidad: number
  descripcion: string | null
  created_at: string
}

export interface Rutina {
  id: number
  nombre: string
  descripcion: string | null
  profesor_id: string
  created_at: string
}

export interface Ejercicio {
  id: number
  nombre: string
  descripcion: string | null
  grupo_muscular: string | null
  video_url: string | null
}

export interface EjercicioRutina {
  id: number
  rutina_id: number
  ejercicio_id: number
  series: number | null
  repeticiones: number | null
  duracion_seg: number | null
  descanso_seg: number | null
  orden: number
  notas: string | null
}

export interface Evaluacion {
  id: number
  alumno_id: string
  profesor_id: string
  fecha: string
  peso_kg: number | null
  altura_cm: number | null
  imc: number | null
  grasa_corporal_pct: number | null
  notas: string | null
}

export interface Notificacion {
  id: number
  usuario_id: string
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
}

export interface AuthenticatedUser {
  id: string
  rol: RolUsuario
  activo: boolean
}
```

### Task M1.6: Create `_lib/auth.ts`

- [ ] **Step 1: Create `frontend/api/_lib/auth.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from './supabase'
import type { AuthenticatedUser, RolUsuario } from './types'
import { unauthorized, forbidden, internalError } from './errors'

export async function verifyToken(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await adminClient.auth.getUser(token)
  if (error || !user) return null

  const { data: usuario, error: dbError } = await adminClient
    .from('usuarios')
    .select('id, rol, activo')
    .eq('id', user.id)
    .single()

  if (dbError || !usuario) return null
  if (!usuario.activo) return null

  return { id: usuario.id, rol: usuario.rol as RolUsuario, activo: usuario.activo }
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthenticatedUser | null> {
  const user = await verifyToken(req)
  if (!user) {
    unauthorized(res)
    return null
  }
  return user
}

export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  roles: RolUsuario[]
): Promise<AuthenticatedUser | null> {
  const user = await requireAuth(req, res)
  if (!user) return null

  if (!roles.includes(user.rol)) {
    forbidden(res)
    return null
  }
  return user
}
```

### Task M1.7: Create frontend Supabase client

- [ ] **Step 1: Create `frontend/src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Task M1.8: Write and run auth middleware unit tests

- [ ] **Step 1: Create `frontend/api/_lib/__tests__/auth.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../supabase', () => ({
  adminClient: {
    auth: { getUser: vi.fn() },
    from: vi.fn()
  }
}))

import { adminClient } from '../supabase'
import { verifyToken } from '../auth'

const mockReq = (token?: string) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {}
} as any)

describe('verifyToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when no authorization header', async () => {
    const result = await verifyToken(mockReq())
    expect(result).toBeNull()
  })

  it('returns null when token is invalid', async () => {
    vi.mocked(adminClient.auth.getUser).mockResolvedValue({
      data: { user: null }, error: new Error('invalid')
    } as any)
    const result = await verifyToken(mockReq('bad-token'))
    expect(result).toBeNull()
  })

  it('returns null when user is inactive', async () => {
    vi.mocked(adminClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'uuid-1' } }, error: null
    } as any)
    const selectMock = { data: { id: 'uuid-1', rol: 'alumno', activo: false }, error: null }
    vi.mocked(adminClient.from).mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve(selectMock) }) })
    } as any)
    const result = await verifyToken(mockReq('token'))
    expect(result).toBeNull()
  })

  it('returns user when token is valid and user is active', async () => {
    vi.mocked(adminClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'uuid-1' } }, error: null
    } as any)
    const selectMock = { data: { id: 'uuid-1', rol: 'alumno', activo: true }, error: null }
    vi.mocked(adminClient.from).mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve(selectMock) }) })
    } as any)
    const result = await verifyToken(mockReq('good-token'))
    expect(result).toEqual({ id: 'uuid-1', rol: 'alumno', activo: true })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run api/_lib/__tests__/auth.test.ts --reporter=verbose
```
Expected: 4 tests pass

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat(M1): setup vitest, _lib helpers, supabase clients"
```

---

## M2: SQL Migrations + RPC Functions + Seed

**Files:**
- Create: `frontend/supabase/migrations/001_enums.sql`
- Create: `frontend/supabase/migrations/002_usuarios.sql`
- Create: `frontend/supabase/migrations/003_actividades_turnos.sql`
- Create: `frontend/supabase/migrations/004_inscripciones.sql`
- Create: `frontend/supabase/migrations/005_creditos.sql`
- Create: `frontend/supabase/migrations/006_rutinas_ejercicios.sql`
- Create: `frontend/supabase/migrations/007_resto.sql`
- Create: `frontend/supabase/migrations/008_triggers.sql`
- Create: `frontend/supabase/migrations/009_rpc_functions.sql`
- Create: `frontend/supabase/migrations/010_seed.sql`

### Task M2.1: Create enum migrations

- [ ] **Step 1: Create `frontend/supabase/migrations/001_enums.sql`**

```sql
CREATE TYPE rol_usuario AS ENUM ('admin', 'profesor', 'recepcionista', 'alumno');
CREATE TYPE estado_inscripcion AS ENUM ('activa', 'cancelada', 'lista_espera');
CREATE TYPE dia_semana AS ENUM ('lunes','martes','miercoles','jueves','viernes','sabado','domingo');
CREATE TYPE tipo_transaccion AS ENUM ('compra','consumo','devolucion','ajuste_manual');
```

### Task M2.2: Create usuarios table

- [ ] **Step 1: Create `frontend/supabase/migrations/002_usuarios.sql`**

```sql
CREATE TABLE usuarios (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre           text NOT NULL,
  apellido         text NOT NULL,
  email            text NOT NULL UNIQUE,
  telefono         text,
  dni              text UNIQUE,
  fecha_nacimiento date,
  rol              rol_usuario NOT NULL DEFAULT 'alumno',
  activo           boolean NOT NULL DEFAULT true,
  creditos         integer NOT NULL DEFAULT 0 CHECK (creditos >= 0),
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

### Task M2.3: Create actividades and turnos

- [ ] **Step 1: Create `frontend/supabase/migrations/003_actividades_turnos.sql`**

```sql
CREATE TABLE actividades (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre       text NOT NULL UNIQUE,
  descripcion  text,
  cupo_maximo  integer NOT NULL CHECK (cupo_maximo > 0),
  duracion_min integer NOT NULL CHECK (duracion_min > 0),
  activa       boolean NOT NULL DEFAULT true
);

CREATE TABLE turnos (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  actividad_id bigint NOT NULL REFERENCES actividades(id),
  profesor_id  uuid NOT NULL REFERENCES usuarios(id),
  dia_semana   dia_semana NOT NULL,
  hora_inicio  time NOT NULL,
  hora_fin     time NOT NULL,
  sala         text,
  activo       boolean NOT NULL DEFAULT true
);
```

### Task M2.4: Create inscripciones and lista_espera

- [ ] **Step 1: Create `frontend/supabase/migrations/004_inscripciones.sql`**

```sql
CREATE TABLE inscripciones (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  alumno_id         uuid NOT NULL REFERENCES usuarios(id),
  turno_id          bigint NOT NULL REFERENCES turnos(id),
  estado            estado_inscripcion NOT NULL DEFAULT 'activa',
  fecha_inscripcion timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, turno_id)
);

CREATE TABLE lista_espera (
  id        bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  alumno_id uuid NOT NULL REFERENCES usuarios(id),
  turno_id  bigint NOT NULL REFERENCES turnos(id),
  posicion  integer NOT NULL,
  fecha     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, turno_id)
);
```

### Task M2.5: Create creditos and asistencias

- [ ] **Step 1: Create `frontend/supabase/migrations/005_creditos.sql`**

```sql
CREATE TABLE transacciones_creditos (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id),
  tipo        tipo_transaccion NOT NULL,
  cantidad    integer NOT NULL,
  descripcion text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE asistencias (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  inscripcion_id bigint NOT NULL REFERENCES inscripciones(id),
  fecha          date NOT NULL,
  presente       boolean NOT NULL DEFAULT false,
  observacion    text,
  UNIQUE(inscripcion_id, fecha)
);
```

### Task M2.6: Create rutinas and ejercicios

- [ ] **Step 1: Create `frontend/supabase/migrations/006_rutinas_ejercicios.sql`**

```sql
CREATE TABLE ejercicios (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre         text NOT NULL UNIQUE,
  descripcion    text,
  grupo_muscular text,
  video_url      text
);

CREATE TABLE rutinas (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre      text NOT NULL,
  descripcion text,
  profesor_id uuid NOT NULL REFERENCES usuarios(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ejercicios_rutina (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  rutina_id     bigint NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  ejercicio_id  bigint NOT NULL REFERENCES ejercicios(id),
  series        integer,
  repeticiones  integer,
  duracion_seg  integer,
  descanso_seg  integer,
  orden         integer NOT NULL DEFAULT 0,
  notas         text,
  UNIQUE(rutina_id, ejercicio_id)
);

CREATE TABLE rutinas_alumnos (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  rutina_id  bigint NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  alumno_id  uuid NOT NULL REFERENCES usuarios(id),
  asignada_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rutina_id, alumno_id)
);
```

### Task M2.7: Create planes, evaluaciones, notificaciones

- [ ] **Step 1: Create `frontend/supabase/migrations/007_resto.sql`**

```sql
CREATE TABLE planes (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre      text NOT NULL UNIQUE,
  creditos    integer NOT NULL CHECK (creditos > 0),
  precio      numeric(10,2) NOT NULL CHECK (precio >= 0),
  descripcion text
);

CREATE TABLE evaluaciones (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  alumno_id         uuid NOT NULL REFERENCES usuarios(id),
  profesor_id       uuid NOT NULL REFERENCES usuarios(id),
  fecha             date NOT NULL,
  peso_kg           numeric(5,2),
  altura_cm         numeric(5,2),
  imc               numeric(5,2),
  grasa_corporal_pct numeric(5,2),
  notas             text
);

CREATE TABLE notificaciones (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  titulo     text NOT NULL,
  mensaje    text NOT NULL,
  leida      boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Task M2.8: Create triggers

- [ ] **Step 1: Create `frontend/supabase/migrations/008_triggers.sql`**

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, apellido, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.email,
    'alumno'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Task M2.9: Create RPC functions

- [ ] **Step 1: Create `frontend/supabase/migrations/009_rpc_functions.sql`**

```sql
-- Inscribir alumno: atomic enrollment or waitlist
CREATE OR REPLACE FUNCTION inscribir_alumno(
  p_alumno_id uuid,
  p_turno_id  bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creditos       integer;
  v_cupo_maximo    integer;
  v_activos        integer;
  v_ya_inscripto   boolean;
  v_inscripcion_id bigint;
  v_posicion       integer;
BEGIN
  SELECT creditos INTO v_creditos FROM usuarios WHERE id = p_alumno_id FOR UPDATE;
  IF v_creditos IS NULL THEN
    RAISE EXCEPTION 'alumno_not_found';
  END IF;
  IF v_creditos < 1 THEN
    RAISE EXCEPTION 'sin_creditos';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM inscripciones
    WHERE alumno_id = p_alumno_id AND turno_id = p_turno_id AND estado = 'activa'
  ) INTO v_ya_inscripto;
  IF v_ya_inscripto THEN
    RAISE EXCEPTION 'ya_inscripto';
  END IF;

  SELECT cupo_maximo INTO v_cupo_maximo FROM actividades a
    JOIN turnos t ON t.actividad_id = a.id WHERE t.id = p_turno_id;
  SELECT COUNT(*) INTO v_activos FROM inscripciones
    WHERE turno_id = p_turno_id AND estado = 'activa';

  IF v_activos < v_cupo_maximo THEN
    UPDATE usuarios SET creditos = creditos - 1 WHERE id = p_alumno_id;
    INSERT INTO inscripciones (alumno_id, turno_id, estado)
      VALUES (p_alumno_id, p_turno_id, 'activa')
      RETURNING id INTO v_inscripcion_id;
    INSERT INTO transacciones_creditos (usuario_id, tipo, cantidad, descripcion)
      VALUES (p_alumno_id, 'consumo', 1, 'Inscripción a turno ' || p_turno_id);
    RETURN jsonb_build_object('resultado', 'inscripto', 'inscripcion_id', v_inscripcion_id);
  ELSE
    SELECT COALESCE(MAX(posicion), 0) + 1 INTO v_posicion
      FROM lista_espera WHERE turno_id = p_turno_id;
    INSERT INTO lista_espera (alumno_id, turno_id, posicion)
      VALUES (p_alumno_id, p_turno_id, v_posicion);
    RETURN jsonb_build_object('resultado', 'en_lista_espera', 'posicion', v_posicion);
  END IF;
END;
$$;

-- Cancelar inscripcion: refund + waitlist promotion
CREATE OR REPLACE FUNCTION cancelar_inscripcion(
  p_inscripcion_id bigint,
  p_usuario_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insc           RECORD;
  v_turno          RECORD;
  v_rol            rol_usuario;
  v_proxima        timestamptz;
  v_devolver       boolean := false;
  v_promovido      RECORD;
  v_diff_days      integer;
  v_dia_num        integer;
  v_hoy_num        integer;
BEGIN
  SELECT i.*, t.dia_semana, t.hora_inicio, t.turno_id
    INTO v_insc
    FROM inscripciones i
    JOIN turnos t ON t.id = i.turno_id
    WHERE i.id = p_inscripcion_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  SELECT rol INTO v_rol FROM usuarios WHERE id = p_usuario_id;
  IF v_insc.alumno_id != p_usuario_id AND v_rol NOT IN ('admin', 'recepcionista') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Calculate next occurrence of this turno
  v_dia_num := CASE v_insc.dia_semana
    WHEN 'lunes' THEN 1 WHEN 'martes' THEN 2 WHEN 'miercoles' THEN 3
    WHEN 'jueves' THEN 4 WHEN 'viernes' THEN 5 WHEN 'sabado' THEN 6 WHEN 'domingo' THEN 0
  END;
  v_hoy_num := EXTRACT(DOW FROM now())::integer;
  v_diff_days := (v_dia_num - v_hoy_num + 7) % 7;
  IF v_diff_days = 0 AND now()::time >= v_insc.hora_inicio THEN
    v_diff_days := 7;
  END IF;
  v_proxima := date_trunc('day', now()) + (v_diff_days || ' days')::interval + v_insc.hora_inicio;

  IF v_proxima - now() >= interval '24 hours' THEN
    UPDATE usuarios SET creditos = creditos + 1 WHERE id = v_insc.alumno_id;
    INSERT INTO transacciones_creditos (usuario_id, tipo, cantidad, descripcion)
      VALUES (v_insc.alumno_id, 'devolucion', 1, 'Cancelación inscripción ' || p_inscripcion_id);
    v_devolver := true;
  END IF;

  UPDATE inscripciones SET estado = 'cancelada' WHERE id = p_inscripcion_id;

  -- Promote first from waitlist
  SELECT * INTO v_promovido FROM lista_espera
    WHERE turno_id = v_insc.turno_id
    ORDER BY posicion ASC LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE usuarios SET creditos = creditos - 1 WHERE id = v_promovido.alumno_id;
    INSERT INTO inscripciones (alumno_id, turno_id, estado)
      VALUES (v_promovido.alumno_id, v_insc.turno_id, 'activa');
    INSERT INTO transacciones_creditos (usuario_id, tipo, cantidad, descripcion)
      VALUES (v_promovido.alumno_id, 'consumo', 1, 'Promoción desde lista espera turno ' || v_insc.turno_id);
    DELETE FROM lista_espera WHERE id = v_promovido.id;
    UPDATE lista_espera SET posicion = posicion - 1 WHERE turno_id = v_insc.turno_id;
    INSERT INTO notificaciones (usuario_id, titulo, mensaje)
      VALUES (v_promovido.alumno_id, 'Cupo disponible',
        'Te inscribimos automáticamente al turno que estabas esperando.');
    RETURN jsonb_build_object('credito_devuelto', v_devolver, 'promovido_id', v_promovido.alumno_id);
  END IF;

  RETURN jsonb_build_object('credito_devuelto', v_devolver, 'promovido_id', null);
END;
$$;

-- Ajustar créditos manualmente (admin)
CREATE OR REPLACE FUNCTION ajustar_creditos(
  p_usuario_id uuid,
  p_cantidad   integer,
  p_descripcion text DEFAULT 'Ajuste manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios SET creditos = creditos + p_cantidad WHERE id = p_usuario_id;
  INSERT INTO transacciones_creditos (usuario_id, tipo, cantidad, descripcion)
    VALUES (p_usuario_id, 'ajuste_manual', p_cantidad, p_descripcion);
END;
$$;
```

### Task M2.10: Create seed data

- [ ] **Step 1: Create `frontend/supabase/migrations/010_seed.sql`**

```sql
-- Planes iniciales (can be customized in admin panel)
INSERT INTO planes (nombre, creditos, precio, descripcion) VALUES
  ('Plan Básico',    8,  15000, '8 clases por mes'),
  ('Plan Estándar', 12, 20000, '12 clases por mes'),
  ('Plan Premium',  20, 30000, '20 clases por mes — acceso ilimitado a todas las actividades');
```

- [ ] **Step 2: Apply migrations to Supabase**

In Supabase Dashboard → SQL Editor, run each migration file in order (001 through 010).

Verify by running in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```
Expected: actividades, asistencias, ejercicios, ejercicios_rutina, evaluaciones, inscripciones, lista_espera, notificaciones, planes, rutinas, rutinas_alumnos, transacciones_creditos, turnos, usuarios

- [ ] **Step 3: Verify RPC functions exist**

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```
Expected: ajustar_creditos, cancelar_inscripcion, handle_new_user, inscribir_alumno

- [ ] **Step 4: Commit migration files**

```bash
git add frontend/supabase/
git commit -m "feat(M2): add SQL migrations, RPC functions, seed data"
```

---

## M3: Auth — AuthContext + api.ts + `/api/auth/me` + `/api/auth/register`

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/services/api.ts`
- Create: `frontend/api/auth/me.ts`
- Create: `frontend/api/auth/register.ts`
- Create: `frontend/api/auth/__tests__/me.test.ts`

### Task M3.1: Rewrite AuthContext

- [ ] **Step 1: Read current AuthContext**

```bash
cat frontend/src/context/AuthContext.tsx
```

- [ ] **Step 2: Replace with Supabase Auth**

Replace the entire file content of `frontend/src/context/AuthContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import api from '../services/api'

export interface AuthUser {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: 'admin' | 'profesor' | 'recepcionista' | 'alumno'
  activo: boolean
  creditos: number
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadUser() {
    try {
      const data = await api.get('/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser().finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await loadUser()
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    await loadUser()
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function refreshUser() {
    await loadUser()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export default function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

### Task M3.2: Rewrite api.ts

- [ ] **Step 1: Replace `frontend/src/services/api.ts`**

```typescript
import { supabase } from '../lib/supabase'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
}

export default api
```

### Task M3.3: Create `/api/auth/me`

- [ ] **Step 1: Create `frontend/api/auth/me.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { data: usuario, error } = await adminClient
    .from('usuarios')
    .select('*')
    .eq('id', auth.id)
    .single()

  if (error || !usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

  return res.status(200).json(usuario)
}
```

### Task M3.4: Create `/api/auth/register`

- [ ] **Step 1: Create `frontend/api/auth/register.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { badRequest, internalError } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nombre, apellido, email, password, telefono, dni, fecha_nacimiento } = req.body ?? {}

  if (!nombre || !apellido || !email || !password) {
    return badRequest(res, 'nombre, apellido, email y password son requeridos')
  }
  if (password.length < 8) {
    return badRequest(res, 'La contraseña debe tener al menos 8 caracteres')
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido, telefono: telefono ?? null, dni: dni ?? null }
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return badRequest(res, 'El email ya está registrado')
    }
    return internalError(res, error.message)
  }

  // Update extra fields that the trigger doesn't set
  if (data.user) {
    await adminClient.from('usuarios').update({
      telefono: telefono ?? null,
      dni: dni ?? null,
      fecha_nacimiento: fecha_nacimiento ?? null
    }).eq('id', data.user.id)
  }

  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('*')
    .eq('id', data.user!.id)
    .single()

  return res.status(201).json(usuario)
}
```

### Task M3.5: Test auth endpoints manually

- [ ] **Step 1: Set env vars for local test**

Create `frontend/.env.local` with:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 2: Run dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Test register endpoint**

```bash
curl -X POST http://localhost:5173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","apellido":"User","email":"test@example.com","password":"Test1234"}'
```
Expected: `201` with usuario object, `rol: "alumno"`

- [ ] **Step 4: Test login via Supabase directly in browser console**

Open browser, navigate to `http://localhost:5173`, then in console:
```javascript
const { supabase } = await import('./src/lib/supabase')
const { data, error } = await supabase.auth.signInWithPassword({email:'test@example.com', password:'Test1234'})
console.log(data.session.access_token)
```

- [ ] **Step 5: Test /api/auth/me with that token**

```bash
curl http://localhost:5173/api/auth/me \
  -H "Authorization: Bearer <token_from_step4>"
```
Expected: `200` with full usuario object

- [ ] **Step 6: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/services/api.ts \
  frontend/src/lib/supabase.ts frontend/api/auth/
git commit -m "feat(M3): rewrite AuthContext to Supabase, add /api/auth/* routes"
```

---

## M4: Usuarios + Actividades CRUD

**Files:**
- Create: `frontend/api/usuarios/index.ts`
- Create: `frontend/api/usuarios/profesores.ts`
- Create: `frontend/api/usuarios/[id].ts`
- Create: `frontend/api/usuarios/[id]/toggle-activo.ts`
- Create: `frontend/api/actividades/index.ts`
- Create: `frontend/api/actividades/[id].ts`
- Create: `frontend/api/usuarios/__tests__/index.test.ts`

### Task M4.1: Usuarios list and create

- [ ] **Step 1: Create `frontend/api/usuarios/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'recepcionista'])
  if (!auth) return

  if (req.method === 'GET') {
    const { rol, activo, search, page = '1', limit = '20' } = req.query
    let query = adminClient.from('usuarios').select('*', { count: 'exact' })

    if (rol) query = query.eq('rol', rol)
    if (activo !== undefined) query = query.eq('activo', activo === 'true')
    if (search) query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`)

    const pageNum = parseInt(page as string) || 1
    const limitNum = Math.min(parseInt(limit as string) || 20, 100)
    query = query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1)
    query = query.order('apellido')

    const { data, error, count } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data, total: count, page: pageNum, limit: limitNum })
  }

  if (req.method === 'POST') {
    const adminOnly = await requireRole(req, res, ['admin'])
    if (!adminOnly) return

    const { nombre, apellido, email, password, rol, telefono, dni, fecha_nacimiento } = req.body ?? {}
    if (!nombre || !apellido || !email || !password || !rol) {
      return badRequest(res, 'nombre, apellido, email, password y rol son requeridos')
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido }
    })
    if (error) return res.status(400).json({ error: error.message })

    await adminClient.from('usuarios').update({
      rol, telefono: telefono ?? null, dni: dni ?? null,
      fecha_nacimiento: fecha_nacimiento ?? null
    }).eq('id', data.user!.id)

    const { data: usuario } = await adminClient.from('usuarios').select('*').eq('id', data.user!.id).single()
    return res.status(201).json(usuario)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

### Task M4.2: Usuarios profesores list

- [ ] **Step 1: Create `frontend/api/usuarios/profesores.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data, error } = await adminClient
    .from('usuarios')
    .select('id, nombre, apellido, email')
    .eq('rol', 'profesor')
    .eq('activo', true)
    .order('apellido')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

### Task M4.3: Usuario by ID (GET + PUT)

- [ ] **Step 1: Create `frontend/api/usuarios/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound, forbidden } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    // Alumnos can only see themselves; admin/recepcionista see all
    if (auth.rol === 'alumno' && auth.id !== id) return forbidden(res)

    const { data, error } = await adminClient.from('usuarios').select('*').eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT') {
    // Admin can edit anyone; users can edit themselves (limited fields)
    if (auth.rol !== 'admin' && auth.id !== id) return forbidden(res)

    const allowed = auth.rol === 'admin'
      ? ['nombre', 'apellido', 'telefono', 'dni', 'fecha_nacimiento', 'rol', 'activo', 'creditos']
      : ['nombre', 'apellido', 'telefono']

    const updates: Record<string, any> = {}
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }

    const { data, error } = await adminClient.from('usuarios').update(updates).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

### Task M4.4: Toggle activo

- [ ] **Step 1: Create `frontend/api/usuarios/[id]/toggle-activo.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { notFound } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data: current } = await adminClient.from('usuarios').select('activo').eq('id', id).single()
  if (!current) return notFound(res)

  const { data, error } = await adminClient
    .from('usuarios')
    .update({ activo: !current.activo })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

### Task M4.5: Actividades CRUD

- [ ] **Step 1: Create `frontend/api/actividades/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const { activa } = req.query
    let query = adminClient.from('actividades').select('*').order('nombre')
    if (activa !== undefined) query = query.eq('activa', activa === 'true')
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    const { nombre, descripcion, cupo_maximo, duracion_min } = req.body ?? {}
    if (!nombre || !cupo_maximo || !duracion_min) {
      return badRequest(res, 'nombre, cupo_maximo y duracion_min son requeridos')
    }

    const { data, error } = await adminClient.from('actividades').insert({
      nombre, descripcion: descripcion ?? null, cupo_maximo, duracion_min
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 2: Create `frontend/api/actividades/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('actividades').select('*').eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('actividades').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { nombre, descripcion, cupo_maximo, duracion_min, activa } = req.body ?? {}
    const { data, error } = await adminClient.from('actividades').update({
      nombre, descripcion, cupo_maximo, duracion_min, activa
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

### Task M4.6: Write and run unit tests for usuarios

- [ ] **Step 1: Create `frontend/api/usuarios/__tests__/index.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../_lib/supabase', () => ({
  adminClient: { from: vi.fn() }
}))
vi.mock('../../_lib/auth', () => ({
  requireRole: vi.fn()
}))

import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import handler from '../index'

function mockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

function mockReq(method: string, query = {}, body = {}) {
  return { method, query, body, headers: {} } as any
}

describe('GET /api/usuarios', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireRole).mockResolvedValue(null)
    const res = mockRes()
    await handler(mockReq('GET'), res)
    expect(requireRole).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(200)
  })

  it('returns paginated list when authenticated as admin', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'admin-id', rol: 'admin', activo: true })
    const mockData = [{ id: 'u1', nombre: 'Test' }]
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 })
    }
    vi.mocked(adminClient.from).mockReturnValue(chainMock as any)

    const res = mockRes()
    await handler(mockReq('GET'), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run api/usuarios/__tests__/index.test.ts --reporter=verbose
```
Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/api/usuarios/ frontend/api/actividades/
git commit -m "feat(M4): add usuarios and actividades CRUD endpoints"
```

---

## M5: Turnos + Planes CRUD

**Files:**
- Create: `frontend/api/turnos/index.ts`
- Create: `frontend/api/turnos/[id].ts`
- Create: `frontend/api/turnos/[id]/inscritos.ts`
- Create: `frontend/api/turnos/[id]/asistencias.ts`
- Create: `frontend/api/planes/index.ts`
- Create: `frontend/api/planes/[id].ts`

### Task M5.1: Turnos list and create

- [ ] **Step 1: Create `frontend/api/turnos/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const { actividad_id, dia_semana, activo } = req.query
    let query = adminClient.from('turnos').select(`
      *,
      actividad:actividades(id, nombre, cupo_maximo),
      profesor:usuarios!turnos_profesor_id_fkey(id, nombre, apellido)
    `).order('dia_semana').order('hora_inicio')

    if (actividad_id) query = query.eq('actividad_id', actividad_id)
    if (dia_semana) query = query.eq('dia_semana', dia_semana)
    if (activo !== undefined) query = query.eq('activo', activo === 'true')

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    const { actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin, sala } = req.body ?? {}
    if (!actividad_id || !profesor_id || !dia_semana || !hora_inicio || !hora_fin) {
      return badRequest(res, 'actividad_id, profesor_id, dia_semana, hora_inicio y hora_fin son requeridos')
    }

    const { data, error } = await adminClient.from('turnos').insert({
      actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin, sala: sala ?? null
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

### Task M5.2: Turno by ID

- [ ] **Step 1: Create `frontend/api/turnos/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('turnos').select(`
      *,
      actividad:actividades(id, nombre, cupo_maximo, duracion_min),
      profesor:usuarios!turnos_profesor_id_fkey(id, nombre, apellido)
    `).eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('turnos').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin, sala, activo } = req.body ?? {}
    const { data, error } = await adminClient.from('turnos').update({
      actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin, sala, activo
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

### Task M5.3: Turno inscritos and asistencias

- [ ] **Step 1: Create `frontend/api/turnos/[id]/inscritos.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data, error } = await adminClient.from('inscripciones').select(`
    id, estado, fecha_inscripcion,
    alumno:usuarios!inscripciones_alumno_id_fkey(id, nombre, apellido, email, dni)
  `).eq('turno_id', id).eq('estado', 'activa').order('fecha_inscripcion')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

- [ ] **Step 2: Create `frontend/api/turnos/[id]/asistencias.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { fecha } = req.query
  if (!fecha) return badRequest(res, 'fecha es requerida (YYYY-MM-DD)')

  const { data, error } = await adminClient.from('asistencias').select(`
    id, fecha, presente, observacion,
    inscripcion:inscripciones!asistencias_inscripcion_id_fkey(
      id, alumno:usuarios!inscripciones_alumno_id_fkey(id, nombre, apellido)
    )
  `).eq('inscripcion.turno_id', id).eq('fecha', fecha)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

### Task M5.4: Planes CRUD

- [ ] **Step 1: Create `frontend/api/planes/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('planes').select('*').order('precio')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    const { nombre, creditos, precio, descripcion } = req.body ?? {}
    if (!nombre || !creditos || precio === undefined) {
      return badRequest(res, 'nombre, creditos y precio son requeridos')
    }

    const { data, error } = await adminClient.from('planes').insert({
      nombre, creditos, precio, descripcion: descripcion ?? null
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 2: Create `frontend/api/planes/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('planes').select('*').eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('planes').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { nombre, creditos, precio, descripcion } = req.body ?? {}
    const { data, error } = await adminClient.from('planes').update({
      nombre, creditos, precio, descripcion
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/api/turnos/ frontend/api/planes/
git commit -m "feat(M5): add turnos and planes CRUD endpoints"
```

---

## M6: Inscripciones + Créditos (RPC)

**Files:**
- Create: `frontend/api/inscripciones/index.ts`
- Create: `frontend/api/inscripciones/[id].ts`
- Create: `frontend/api/alumnos/[id]/inscripciones.ts`
- Create: `frontend/api/usuarios/[id]/creditos.ts`
- Create: `frontend/api/inscripciones/__tests__/index.test.ts`

### Task M6.1: Inscripciones create

- [ ] **Step 1: Create `frontend/api/inscripciones/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'
import { badRequest, forbidden } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { alumno_id, turno_id } = req.body ?? {}
  if (!turno_id) return badRequest(res, 'turno_id es requerido')

  // Alumnos can only enroll themselves; admin/recepcionista can enroll anyone
  const targetAlumnoId = alumno_id ?? auth.id
  if (auth.rol === 'alumno' && targetAlumnoId !== auth.id) return forbidden(res)

  const { data, error } = await adminClient.rpc('inscribir_alumno', {
    p_alumno_id: targetAlumnoId,
    p_turno_id: parseInt(turno_id)
  })

  if (error) {
    if (error.message.includes('sin_creditos')) return badRequest(res, 'Créditos insuficientes')
    if (error.message.includes('ya_inscripto')) return badRequest(res, 'Ya estás inscripto en este turno')
    if (error.message.includes('alumno_not_found')) return badRequest(res, 'Alumno no encontrado')
    return res.status(500).json({ error: error.message })
  }

  const statusCode = data?.resultado === 'inscripto' ? 201 : 200
  return res.status(statusCode).json(data)
}
```

### Task M6.2: Inscripciones delete (cancelar)

- [ ] **Step 1: Create `frontend/api/inscripciones/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data, error } = await adminClient.rpc('cancelar_inscripcion', {
    p_inscripcion_id: parseInt(id),
    p_usuario_id: auth.id
  })

  if (error) {
    if (error.message.includes('not_found')) return res.status(404).json({ error: 'Inscripción no encontrada' })
    if (error.message.includes('forbidden')) return res.status(403).json({ error: 'No autorizado' })
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(data)
}
```

### Task M6.3: Alumno inscripciones

- [ ] **Step 1: Create `frontend/api/alumnos/[id]/inscripciones.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import { forbidden } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  if (auth.rol === 'alumno' && auth.id !== id) return forbidden(res)

  const { data, error } = await adminClient.from('inscripciones').select(`
    id, estado, fecha_inscripcion,
    turno:turnos(
      id, dia_semana, hora_inicio, hora_fin, sala,
      actividad:actividades(id, nombre, duracion_min)
    )
  `).eq('alumno_id', id).order('fecha_inscripcion', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

### Task M6.4: Créditos ajuste manual (admin)

- [ ] **Step 1: Create `frontend/api/usuarios/[id]/creditos.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { cantidad, descripcion } = req.body ?? {}

  if (cantidad === undefined || typeof cantidad !== 'number') {
    return badRequest(res, 'cantidad (number) es requerida')
  }

  const { error } = await adminClient.rpc('ajustar_creditos', {
    p_usuario_id: id,
    p_cantidad: cantidad,
    p_descripcion: descripcion ?? 'Ajuste manual'
  })

  if (error) return res.status(500).json({ error: error.message })

  const { data: usuario } = await adminClient.from('usuarios').select('id, creditos').eq('id', id).single()
  return res.status(200).json(usuario)
}
```

### Task M6.5: Write and run inscripciones tests

- [ ] **Step 1: Create `frontend/api/inscripciones/__tests__/index.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../_lib/supabase', () => ({
  adminClient: { rpc: vi.fn() }
}))
vi.mock('../../_lib/auth', () => ({
  requireAuth: vi.fn()
}))

import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import handler from '../index'

function mockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('POST /api/inscripciones', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 405 for GET', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    const res = mockRes()
    await handler({ method: 'GET', query: {}, body: {}, headers: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 400 when missing turno_id', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: {}, headers: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('calls RPC and returns 201 on success', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    vi.mocked(adminClient.rpc).mockResolvedValue({
      data: { resultado: 'inscripto', inscripcion_id: 42 }, error: null
    } as any)
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { turno_id: 1 }, headers: {} } as any, res)
    expect(adminClient.rpc).toHaveBeenCalledWith('inscribir_alumno', { p_alumno_id: 'a1', p_turno_id: 1 })
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('returns 400 when alumno has no credits', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    vi.mocked(adminClient.rpc).mockResolvedValue({
      data: null, error: { message: 'sin_creditos' }
    } as any)
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { turno_id: 1 }, headers: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run api/inscripciones/__tests__/index.test.ts --reporter=verbose
```
Expected: 4 tests pass

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/api/inscripciones/ frontend/api/alumnos/ frontend/api/usuarios/[id]/
git commit -m "feat(M6): add inscripciones and creditos endpoints with RPC"
```

---

## M7: Asistencias + Evaluaciones

**Files:**
- Create: `frontend/api/asistencias/index.ts`
- Create: `frontend/api/asistencias/[id].ts`
- Create: `frontend/api/evaluaciones/index.ts`
- Create: `frontend/api/evaluaciones/[id].ts`
- Create: `frontend/api/alumnos/[id]/asistencias.ts`
- Create: `frontend/api/alumnos/[id]/evaluaciones.ts`

### Task M7.1: Asistencias CRUD

- [ ] **Step 1: Create `frontend/api/asistencias/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { inscripcion_id, fecha, presente, observacion } = req.body ?? {}
  if (!inscripcion_id || !fecha) return badRequest(res, 'inscripcion_id y fecha son requeridos')

  const { data, error } = await adminClient.from('asistencias').upsert({
    inscripcion_id, fecha, presente: presente ?? false, observacion: observacion ?? null
  }, { onConflict: 'inscripcion_id,fecha' }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
}
```

- [ ] **Step 2: Create `frontend/api/asistencias/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { presente, observacion } = req.body ?? {}

  const { data, error } = await adminClient.from('asistencias').update({
    presente, observacion
  }).eq('id', id).select().single()

  if (error || !data) return notFound(res)
  return res.status(200).json(data)
}
```

### Task M7.2: Evaluaciones CRUD

- [ ] **Step 1: Create `frontend/api/evaluaciones/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor'])
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { alumno_id, fecha, peso_kg, altura_cm, grasa_corporal_pct, notas } = req.body ?? {}
  if (!alumno_id || !fecha) return badRequest(res, 'alumno_id y fecha son requeridos')

  const imc = peso_kg && altura_cm
    ? parseFloat((peso_kg / Math.pow(altura_cm / 100, 2)).toFixed(2))
    : null

  const { data, error } = await adminClient.from('evaluaciones').insert({
    alumno_id, profesor_id: auth.id, fecha,
    peso_kg: peso_kg ?? null, altura_cm: altura_cm ?? null,
    imc, grasa_corporal_pct: grasa_corporal_pct ?? null, notas: notas ?? null
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
}
```

- [ ] **Step 2: Create `frontend/api/evaluaciones/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'alumno'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { data, error } = await adminClient.from('evaluaciones').select('*').eq('id', id).single()
  if (error || !data) return notFound(res)

  if (auth.rol === 'alumno' && data.alumno_id !== auth.id) return res.status(403).json({ error: 'Acceso denegado' })
  return res.status(200).json(data)
}
```

### Task M7.3: Alumno asistencias and evaluaciones

- [ ] **Step 1: Create `frontend/api/alumnos/[id]/asistencias.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import { forbidden } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  if (auth.rol === 'alumno' && auth.id !== id) return forbidden(res)

  const { data, error } = await adminClient.from('asistencias').select(`
    id, fecha, presente, observacion,
    inscripcion:inscripciones!asistencias_inscripcion_id_fkey(
      id, turno:turnos(id, dia_semana, hora_inicio, actividad:actividades(nombre))
    )
  `).eq('inscripcion.alumno_id', id).order('fecha', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

- [ ] **Step 2: Create `frontend/api/alumnos/[id]/evaluaciones.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import { forbidden } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  if (auth.rol === 'alumno' && auth.id !== id) return forbidden(res)

  const { data, error } = await adminClient.from('evaluaciones').select(`
    *,
    profesor:usuarios!evaluaciones_profesor_id_fkey(id, nombre, apellido)
  `).eq('alumno_id', id).order('fecha', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/api/asistencias/ frontend/api/evaluaciones/ frontend/api/alumnos/
git commit -m "feat(M7): add asistencias and evaluaciones endpoints"
```

---

## M8: Rutinas + Ejercicios

**Files:**
- Create: `frontend/api/rutinas/index.ts`
- Create: `frontend/api/rutinas/[id].ts`
- Create: `frontend/api/rutinas/[id]/asignar.ts`
- Create: `frontend/api/rutinas/[id]/asignaciones.ts`
- Create: `frontend/api/ejercicios/index.ts`
- Create: `frontend/api/ejercicios/[id].ts`
- Create: `frontend/api/alumnos/[id]/rutinas.ts`

### Task M8.1: Ejercicios CRUD

- [ ] **Step 1: Create `frontend/api/ejercicios/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const { grupo_muscular } = req.query
    let query = adminClient.from('ejercicios').select('*').order('nombre')
    if (grupo_muscular) query = query.eq('grupo_muscular', grupo_muscular)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const staffCheck = await requireRole(req, res, ['admin', 'profesor'])
    if (!staffCheck) return

    const { nombre, descripcion, grupo_muscular, video_url } = req.body ?? {}
    if (!nombre) return badRequest(res, 'nombre es requerido')

    const { data, error } = await adminClient.from('ejercicios').insert({
      nombre, descripcion: descripcion ?? null,
      grupo_muscular: grupo_muscular ?? null, video_url: video_url ?? null
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 2: Create `frontend/api/ejercicios/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('ejercicios').select('*').eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const staffCheck = await requireRole(req, res, ['admin', 'profesor'])
    if (!staffCheck) return

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('ejercicios').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { nombre, descripcion, grupo_muscular, video_url } = req.body ?? {}
    const { data, error } = await adminClient.from('ejercicios').update({
      nombre, descripcion, grupo_muscular, video_url
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

### Task M8.2: Rutinas CRUD

- [ ] **Step 1: Create `frontend/api/rutinas/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const staffRoles = ['admin', 'profesor']
    const isStaff = staffRoles.includes(auth.rol)

    let query = adminClient.from('rutinas').select(`
      *,
      profesor:usuarios!rutinas_profesor_id_fkey(id, nombre, apellido),
      ejercicios:ejercicios_rutina(
        id, orden, series, repeticiones, duracion_seg, descanso_seg, notas,
        ejercicio:ejercicios(id, nombre, grupo_muscular)
      )
    `).order('nombre')

    if (!isStaff) query = query.eq('profesor_id', auth.id)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const staffCheck = await requireRole(req, res, ['admin', 'profesor'])
    if (!staffCheck) return

    const { nombre, descripcion, ejercicios } = req.body ?? {}
    if (!nombre) return badRequest(res, 'nombre es requerido')

    const { data: rutina, error } = await adminClient.from('rutinas').insert({
      nombre, descripcion: descripcion ?? null, profesor_id: auth.id
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })

    if (ejercicios && Array.isArray(ejercicios) && ejercicios.length > 0) {
      const items = ejercicios.map((e: any, idx: number) => ({
        rutina_id: rutina.id, ejercicio_id: e.ejercicio_id,
        series: e.series ?? null, repeticiones: e.repeticiones ?? null,
        duracion_seg: e.duracion_seg ?? null, descanso_seg: e.descanso_seg ?? null,
        orden: e.orden ?? idx, notas: e.notas ?? null
      }))
      await adminClient.from('ejercicios_rutina').insert(items)
    }

    const { data: full } = await adminClient.from('rutinas').select(`
      *, ejercicios:ejercicios_rutina(*, ejercicio:ejercicios(*))
    `).eq('id', rutina.id).single()

    return res.status(201).json(full)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

### Task M8.3: Rutina by ID and asignar/asignaciones

- [ ] **Step 1: Create `frontend/api/rutinas/[id].ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound, forbidden } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('rutinas').select(`
      *,
      profesor:usuarios!rutinas_profesor_id_fkey(id, nombre, apellido),
      ejercicios:ejercicios_rutina(
        id, orden, series, repeticiones, duracion_seg, descanso_seg, notas,
        ejercicio:ejercicios(id, nombre, descripcion, grupo_muscular, video_url)
      )
    `).eq('id', id).single()

    if (error || !data) return notFound(res)
    if (auth.rol === 'alumno') return res.status(200).json(data)
    if (auth.rol === 'profesor' && data.profesor_id !== auth.id) return forbidden(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const staffCheck = await requireRole(req, res, ['admin', 'profesor'])
    if (!staffCheck) return

    const { data: rutina } = await adminClient.from('rutinas').select('profesor_id').eq('id', id).single()
    if (!rutina) return notFound(res)
    if (auth.rol === 'profesor' && rutina.profesor_id !== auth.id) return forbidden(res)

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('rutinas').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { nombre, descripcion } = req.body ?? {}
    const { data, error } = await adminClient.from('rutinas').update({
      nombre, descripcion
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 2: Create `frontend/api/rutinas/[id]/asignar.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { badRequest, notFound } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor'])
  if (!auth) return

  const { id } = req.query as { id: string }
  const { alumno_id } = req.body ?? {}
  if (!alumno_id) return badRequest(res, 'alumno_id es requerido')

  if (req.method === 'POST') {
    const { data, error } = await adminClient.from('rutinas_alumnos').insert({
      rutina_id: parseInt(id), alumno_id
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'DELETE') {
    const { error } = await adminClient.from('rutinas_alumnos')
      .delete().eq('rutina_id', id).eq('alumno_id', alumno_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 3: Create `frontend/api/rutinas/[id]/asignaciones.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data, error } = await adminClient.from('rutinas_alumnos').select(`
    id, asignada_at,
    alumno:usuarios!rutinas_alumnos_alumno_id_fkey(id, nombre, apellido, email)
  `).eq('rutina_id', id).order('asignada_at')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

- [ ] **Step 4: Create `frontend/api/alumnos/[id]/rutinas.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import { forbidden } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  if (auth.rol === 'alumno' && auth.id !== id) return forbidden(res)

  const { data, error } = await adminClient.from('rutinas_alumnos').select(`
    id, asignada_at,
    rutina:rutinas(
      id, nombre, descripcion,
      profesor:usuarios!rutinas_profesor_id_fkey(id, nombre, apellido),
      ejercicios:ejercicios_rutina(
        id, orden, series, repeticiones, duracion_seg, descanso_seg, notas,
        ejercicio:ejercicios(id, nombre, grupo_muscular, video_url)
      )
    )
  `).eq('alumno_id', id).order('asignada_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/api/rutinas/ frontend/api/ejercicios/ frontend/api/alumnos/
git commit -m "feat(M8): add rutinas and ejercicios endpoints"
```

---

## M9: Stats + Notificaciones

**Files:**
- Create: `frontend/api/stats/dashboard.ts`
- Create: `frontend/api/notificaciones/index.ts`
- Create: `frontend/api/notificaciones/[id]/leer.ts`
- Create: `frontend/api/notificaciones/leer-todas.ts`

### Task M9.1: Dashboard stats

- [ ] **Step 1: Create `frontend/api/stats/dashboard.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireRole } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const [
    { count: totalAlumnos },
    { count: alumnosActivos },
    { count: totalTurnos },
    { count: inscripcionesActivas },
    { data: actividadesTop }
  ] = await Promise.all([
    adminClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'alumno'),
    adminClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'alumno').eq('activo', true),
    adminClient.from('turnos').select('*', { count: 'exact', head: true }).eq('activo', true),
    adminClient.from('inscripciones').select('*', { count: 'exact', head: true }).eq('estado', 'activa'),
    adminClient.from('actividades').select('id, nombre, inscripciones:inscripciones(count)').eq('activa', true).limit(5)
  ])

  return res.status(200).json({
    totalAlumnos,
    alumnosActivos,
    totalTurnos,
    inscripcionesActivas,
    actividadesTop: actividadesTop ?? []
  })
}
```

### Task M9.2: Notificaciones

- [ ] **Step 1: Create `frontend/api/notificaciones/index.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data, error } = await adminClient.from('notificaciones')
    .select('*')
    .eq('usuario_id', auth.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

- [ ] **Step 2: Create `frontend/api/notificaciones/[id]/leer.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import { notFound, forbidden } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data: notif } = await adminClient.from('notificaciones').select('usuario_id').eq('id', id).single()
  if (!notif) return notFound(res)
  if (notif.usuario_id !== auth.id) return forbidden(res)

  const { data, error } = await adminClient.from('notificaciones')
    .update({ leida: true }).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

- [ ] **Step 3: Create `frontend/api/notificaciones/leer-todas.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { error } = await adminClient.from('notificaciones')
    .update({ leida: true }).eq('usuario_id', auth.id).eq('leida', false)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).end()
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/api/stats/ frontend/api/notificaciones/
git commit -m "feat(M9): add stats dashboard and notificaciones endpoints"
```

---

## M10: Data Migration Script (SQLite → Supabase)

**Files:**
- Create: `scripts/migrate.ts`
- Modify: `frontend/package.json` (add script)

### Task M10.1: Create migration script

- [ ] **Step 1: Install script dependencies**

```bash
npm install --save-dev better-sqlite3 tsx @types/better-sqlite3 dotenv
```

- [ ] **Step 2: Create `scripts/migrate.ts`**

```typescript
import Database from 'better-sqlite3'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const db = new Database(path.resolve(__dirname, '../hsp70.db'), { readonly: true })

interface SqliteUsuario {
  id: number; email: string; nombre: string; apellido: string;
  telefono: string | null; dni: string | null; rol: string; activo: number;
}

interface SqliteActividad {
  id: number; nombre: string; descripcion: string | null;
  cupo_maximo: number; duracion_min: number; activa: number;
}

interface SqliteTurno {
  id: number; actividad_id: number; profesor_id: number;
  dia_semana: string; hora_inicio: string; hora_fin: string; sala: string | null; activo: number;
}

interface SqlitePlan {
  id: number; nombre: string; creditos: number; precio: number; descripcion: string | null;
}

async function migrateActividades() {
  console.log('\n→ Migrating actividades...')
  const actividades = db.prepare('SELECT * FROM actividades').all() as SqliteActividad[]

  for (const act of actividades) {
    const { error } = await supabase.from('actividades').upsert({
      nombre: act.nombre, descripcion: act.descripcion,
      cupo_maximo: act.cupo_maximo, duracion_min: act.duracion_min, activa: !!act.activa
    }, { onConflict: 'nombre' })
    if (error) console.error(`  Error migrating actividad ${act.nombre}:`, error.message)
    else console.log(`  ✓ ${act.nombre}`)
  }
  return actividades.length
}

async function migratePlanes() {
  console.log('\n→ Migrating planes...')
  const planes = db.prepare('SELECT * FROM planes').all() as SqlitePlan[]

  for (const plan of planes) {
    const { error } = await supabase.from('planes').upsert({
      nombre: plan.nombre, creditos: plan.creditos, precio: plan.precio,
      descripcion: plan.descripcion
    }, { onConflict: 'nombre' })
    if (error) console.error(`  Error migrating plan ${plan.nombre}:`, error.message)
    else console.log(`  ✓ ${plan.nombre}`)
  }
  return planes.length
}

async function migrateProfesores(): Promise<Map<number, string>> {
  console.log('\n→ Migrating profesores and admins...')
  const usuarios = db.prepare(
    "SELECT * FROM usuarios WHERE rol IN ('admin', 'profesor', 'recepcionista')"
  ).all() as SqliteUsuario[]

  const idMap = new Map<number, string>()
  const defaultPassword = 'HSP70temp2024!'

  for (const u of usuarios) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { nombre: u.nombre, apellido: u.apellido }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        const { data: existing } = await supabase.auth.admin.listUsers()
        const found = existing?.users.find(x => x.email === u.email)
        if (found) {
          idMap.set(u.id, found.id)
          console.log(`  ↔ ${u.email} (already exists, mapped)`)
        }
      } else {
        console.error(`  Error creating user ${u.email}:`, error.message)
      }
      continue
    }

    if (data.user) {
      await supabase.from('usuarios').update({
        rol: u.rol, telefono: u.telefono, dni: u.dni, activo: !!u.activo
      }).eq('id', data.user.id)
      idMap.set(u.id, data.user.id)
      console.log(`  ✓ ${u.email} (${u.rol})`)
    }
  }
  return idMap
}

async function migrateTurnos(profesorIdMap: Map<number, string>) {
  console.log('\n→ Migrating turnos...')
  const turnos = db.prepare('SELECT * FROM turnos').all() as SqliteTurno[]

  const { data: actividades } = await supabase.from('actividades').select('id, nombre')
  const { data: actividadesOld } = await Promise.resolve({
    data: db.prepare('SELECT id, nombre FROM actividades').all() as { id: number; nombre: string }[]
  })

  const actMap = new Map<number, number>()
  for (const old of actividadesOld) {
    const match = actividades?.find(a => a.nombre === old.nombre)
    if (match) actMap.set(old.id, match.id)
  }

  for (const t of turnos) {
    const profesorSupabaseId = profesorIdMap.get(t.profesor_id)
    const actividadSupabaseId = actMap.get(t.actividad_id)

    if (!profesorSupabaseId || !actividadSupabaseId) {
      console.warn(`  ⚠ Skipping turno id=${t.id}: missing refs`)
      continue
    }

    const { error } = await supabase.from('turnos').insert({
      actividad_id: actividadSupabaseId, profesor_id: profesorSupabaseId,
      dia_semana: t.dia_semana, hora_inicio: t.hora_inicio,
      hora_fin: t.hora_fin, sala: t.sala, activo: !!t.activo
    })
    if (error) console.error(`  Error migrating turno id=${t.id}:`, error.message)
    else console.log(`  ✓ Turno ${t.dia_semana} ${t.hora_inicio}`)
  }
}

async function verify() {
  console.log('\n→ Verification...')
  const [
    { count: actividades },
    { count: turnos },
    { count: planes },
    { data: { users } }
  ] = await Promise.all([
    supabase.from('actividades').select('*', { count: 'exact', head: true }),
    supabase.from('turnos').select('*', { count: 'exact', head: true }),
    supabase.from('planes').select('*', { count: 'exact', head: true }),
    supabase.auth.admin.listUsers()
  ])
  console.log(`  Actividades: ${actividades}`)
  console.log(`  Turnos: ${turnos}`)
  console.log(`  Planes: ${planes}`)
  console.log(`  Auth users: ${users?.length ?? 0}`)
}

async function main() {
  console.log('HSP-70 Migration: SQLite → Supabase')
  console.log('=====================================')

  const profesorIdMap = await migrateProfesores()
  await migrateActividades()
  await migrateTurnos(profesorIdMap)
  await migratePlanes()
  await verify()

  console.log('\n✓ Migration complete!')
  console.log(`  Default password for all migrated users: HSP70temp2024!`)
  console.log('  IMPORTANT: Ask users to change their passwords after first login.')
  db.close()
}

main().catch(console.error)
```

### Task M10.2: Add migration script command

- [ ] **Step 1: Add script to root `package.json` or create one**

In the project root, if there's no `package.json`, create `scripts/package.json`:
```json
{
  "name": "hsp70-scripts",
  "private": true,
  "scripts": {
    "migrate": "tsx migrate.ts"
  }
}
```

Or add to root `package.json` if it exists:
```json
"migrate": "tsx scripts/migrate.ts"
```

### Task M10.3: Run migration

- [ ] **Step 1: Verify SQLite DB exists**

```bash
ls -la hsp70.db
```
Expected: file exists

- [ ] **Step 2: Run migration (dry run mentally first)**

Review the script output types, then run:
```bash
npx tsx scripts/migrate.ts
```

- [ ] **Step 3: Verify in Supabase Dashboard**

In Supabase → Table Editor:
- `actividades` → check rows exist
- `turnos` → check rows exist with correct profesor references
- `planes` → check rows exist
- `auth.users` → verify staff users were created

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "feat(M10): add SQLite to Supabase data migration script"
```

---

## M11: Cleanup — Remove FastAPI, Update vercel.json

**Files:**
- Delete: `app/` directory (entire FastAPI backend)
- Delete: `railway.json`
- Delete: `Procfile`
- Delete: `requirements.txt`
- Delete: `pyproject.toml`
- Modify: `frontend/vercel.json`
- Modify: `frontend/vite.config.ts` (remove proxy)

### Task M11.1: Update vercel.json

- [ ] **Step 1: Read current vercel.json**

```bash
cat frontend/vercel.json
```

- [ ] **Step 2: Update to exclude /api from SPA rewrite**

Replace content of `frontend/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

### Task M11.2: Remove vite proxy

- [ ] **Step 1: Read current vite.config.ts**

```bash
cat frontend/vite.config.ts
```

- [ ] **Step 2: Remove the server.proxy block**

Remove any `server: { proxy: { ... } }` block from vite.config.ts. If the file has no other server config, remove the `server` key entirely.

### Task M11.3: Verify TypeScript compiles

- [ ] **Step 1: Run tsc**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors

### Task M11.4: Delete FastAPI backend files

- [ ] **Step 1: Delete app/ directory**

```bash
rm -rf app/
```

- [ ] **Step 2: Delete Railway/Python config files**

```bash
rm -f railway.json Procfile requirements.txt pyproject.toml
```

- [ ] **Step 3: Verify git status**

```bash
git status
```
Confirm deleted files are shown

### Task M11.5: Full build verification

- [ ] **Step 1: Build frontend**

```bash
cd frontend && npm run build
```
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 2: Run all tests**

```bash
npx vitest run --reporter=verbose
```
Expected: All tests pass

- [ ] **Step 3: Final commit**

```bash
cd ..
git add -A
git commit -m "feat(M11): remove FastAPI backend, finalize Vercel deployment config"
```

### Task M11.6: Deploy to Vercel

- [ ] **Step 1: Push to branch**

```bash
git push origin feat/rutinas-ejercicios
```

- [ ] **Step 2: In Vercel Dashboard**

Go to Vercel → Project → Settings → Environment Variables and add:
```
VITE_SUPABASE_URL = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
SUPABASE_URL = https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ...
```

- [ ] **Step 3: Trigger deploy**

Vercel auto-deploys on push. Check the deploy log for errors.

- [ ] **Step 4: Smoke test production**

1. Visit the deployed URL
2. Register a new account → should create alumno
3. Log in → should reach dashboard
4. Admin login → should see admin dashboard

---

## Summary of env vars needed

When user provides credentials, populate `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

And in Vercel Dashboard → Environment Variables → add the same 4 variables.
