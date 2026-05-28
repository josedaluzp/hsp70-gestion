# HSP-70 — Migración a Supabase: Diseño Aprobado

**Fecha:** 2026-05-28
**Estado:** Aprobado — listo para implementar

---

## Contexto

El backend actual (FastAPI + SQLite) se elimina completamente. Se reemplaza por:
- **Supabase** — base de datos PostgreSQL + autenticación
- **Vercel API Routes** (TypeScript) — lógica de negocio y endpoints REST
- **React frontend** — sin cambios en UI, solo AuthContext y api.ts

---

## Decisiones de arquitectura

| Decisión | Elección | Razón |
|----------|----------|-------|
| Auth | Supabase Auth | Integrado con DB, maneja sessions, refresh tokens automático |
| DB | Supabase PostgreSQL | Mismo proyecto, RLS disponible, PostgREST para introspección |
| API layer | Vercel API Routes (TypeScript) | Todo en Vercel, sin servidor separado |
| Permisos | Service role key + validación de rol en cada route | Más simple que RLS complejo |
| Créditos atómicos | Postgres RPC functions | Evita race conditions en inscripciones simultáneas |
| Tests unitarios | Vitest | Ya en el stack Vite |
| Tests integración | Supabase local dev | Entorno controlado sin afectar producción |
| Tipos | Compartidos en `_lib/types.ts` | Frontend y API Routes usan los mismos tipos |

---

## Stack final

- **Frontend:** React 19 + TypeScript + TailwindCSS v4 + Vite
- **API:** Vercel Serverless Functions (TypeScript) en `frontend/api/`
- **Auth:** `@supabase/supabase-js` (cliente) + Supabase Admin SDK (servidor)
- **DB:** Supabase PostgreSQL
- **Tests:** Vitest + Supabase CLI local
- **Deploy:** Vercel (frontend + API Routes) + Supabase (DB + Auth)

---

## Variables de entorno requeridas

### Frontend (`frontend/.env.local`)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Vercel API Routes (`frontend/.env.local` también, sin VITE_ prefix)
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Estructura de archivos

```
frontend/
├── api/
│   ├── _lib/
│   │   ├── supabase.ts        # cliente anon + admin client
│   │   ├── auth.ts            # middleware: verifyToken, requireRole
│   │   ├── errors.ts          # helpers: notFound, forbidden, badRequest
│   │   └── types.ts           # tipos compartidos (Usuario, Turno, etc.)
│   ├── auth/
│   │   ├── me.ts              # GET /api/auth/me
│   │   └── register.ts        # POST /api/auth/register
│   ├── usuarios/
│   │   ├── index.ts           # GET /api/usuarios
│   │   ├── profesores.ts      # GET /api/usuarios/profesores
│   │   └── [id].ts            # GET PUT /api/usuarios/:id
│   │   └── [id]/toggle-activo.ts  # PUT /api/usuarios/:id/toggle-activo
│   ├── actividades/
│   │   ├── index.ts           # GET POST /api/actividades
│   │   └── [id].ts            # GET PUT DELETE /api/actividades/:id
│   ├── turnos/
│   │   ├── index.ts           # GET POST /api/turnos
│   │   ├── [id].ts            # GET PUT DELETE /api/turnos/:id
│   │   └── [id]/inscritos.ts  # GET /api/turnos/:id/inscritos
│   │   └── [id]/asistencias.ts # GET /api/turnos/:id/asistencias
│   ├── inscripciones/
│   │   ├── index.ts           # POST /api/inscripciones
│   │   └── [id].ts            # DELETE /api/inscripciones/:id
│   ├── alumnos/
│   │   └── [id]/
│   │       ├── inscripciones.ts  # GET /api/alumnos/:id/inscripciones
│   │       ├── asistencias.ts    # GET /api/alumnos/:id/asistencias
│   │       ├── evaluaciones.ts   # GET /api/alumnos/:id/evaluaciones
│   │       └── rutinas.ts        # GET /api/alumnos/:id/rutinas
│   ├── asistencias/
│   │   ├── index.ts           # POST /api/asistencias
│   │   └── [id].ts            # PUT /api/asistencias/:id
│   ├── evaluaciones/
│   │   ├── index.ts           # POST /api/evaluaciones
│   │   └── [id].ts            # GET /api/evaluaciones/:id
│   ├── planes/
│   │   ├── index.ts           # GET POST /api/planes
│   │   └── [id].ts            # GET PUT DELETE /api/planes/:id
│   ├── rutinas/
│   │   ├── index.ts           # GET POST /api/rutinas
│   │   ├── [id].ts            # GET PUT DELETE /api/rutinas/:id
│   │   ├── [id]/asignar.ts    # POST DELETE /api/rutinas/:id/asignar
│   │   └── [id]/asignaciones.ts # GET /api/rutinas/:id/asignaciones
│   ├── ejercicios/
│   │   ├── index.ts           # GET POST /api/ejercicios
│   │   └── [id].ts            # GET PUT DELETE /api/ejercicios/:id
│   ├── notificaciones/
│   │   ├── index.ts           # GET /api/notificaciones
│   │   ├── [id]/leer.ts       # PUT /api/notificaciones/:id/leer
│   │   └── leer-todas.ts      # PUT /api/notificaciones/leer-todas
│   └── stats/
│       └── dashboard.ts       # GET /api/stats/dashboard
├── src/
│   ├── lib/
│   │   └── supabase.ts        # cliente supabase para el frontend
│   ├── context/
│   │   └── AuthContext.tsx    # reemplazado con Supabase Auth
│   └── services/
│       └── api.ts             # token desde supabase.auth.getSession()
└── supabase/
    └── migrations/
        ├── 001_enums.sql
        ├── 002_usuarios.sql
        ├── 003_actividades_turnos.sql
        ├── 004_inscripciones.sql
        ├── 005_creditos.sql
        ├── 006_rutinas_ejercicios.sql
        ├── 007_resto.sql
        ├── 008_triggers.sql
        ├── 009_rpc_functions.sql
        └── 010_seed.sql
```

---

## Schema de base de datos

### Enums
```sql
CREATE TYPE rol_usuario AS ENUM ('admin', 'profesor', 'recepcionista', 'alumno');
CREATE TYPE estado_inscripcion AS ENUM ('activa', 'cancelada', 'lista_espera');
CREATE TYPE dia_semana AS ENUM ('lunes','martes','miercoles','jueves','viernes','sabado','domingo');
CREATE TYPE tipo_transaccion AS ENUM ('compra','consumo','devolucion','ajuste_manual');
```

### Tabla: usuarios
```sql
CREATE TABLE usuarios (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  apellido    text NOT NULL,
  email       text NOT NULL UNIQUE,
  telefono    text,
  dni         text UNIQUE,
  fecha_nacimiento date,
  rol         rol_usuario NOT NULL DEFAULT 'alumno',
  activo      boolean NOT NULL DEFAULT true,
  creditos    integer NOT NULL DEFAULT 0 CHECK (creditos >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### Tabla: actividades
```sql
CREATE TABLE actividades (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre       text NOT NULL UNIQUE,
  descripcion  text,
  cupo_maximo  integer NOT NULL CHECK (cupo_maximo > 0),
  duracion_min integer NOT NULL CHECK (duracion_min > 0),
  activa       boolean NOT NULL DEFAULT true
);
```

### Tabla: turnos
```sql
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

### Tabla: inscripciones
```sql
CREATE TABLE inscripciones (
  id               bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  alumno_id        uuid NOT NULL REFERENCES usuarios(id),
  turno_id         bigint NOT NULL REFERENCES turnos(id),
  estado           estado_inscripcion NOT NULL DEFAULT 'activa',
  fecha_inscripcion timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, turno_id)
);
```

### Tabla: lista_espera
```sql
CREATE TABLE lista_espera (
  id        bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  alumno_id uuid NOT NULL REFERENCES usuarios(id),
  turno_id  bigint NOT NULL REFERENCES turnos(id),
  posicion  integer NOT NULL,
  fecha     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, turno_id)
);
```

### Tabla: asistencias
```sql
CREATE TABLE asistencias (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  inscripcion_id bigint NOT NULL REFERENCES inscripciones(id),
  fecha          date NOT NULL,
  presente       boolean NOT NULL DEFAULT false,
  observacion    text,
  UNIQUE(inscripcion_id, fecha)
);
```

### Tabla: planes
```sql
CREATE TABLE planes (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre      text NOT NULL UNIQUE,
  creditos    integer NOT NULL CHECK (creditos > 0),
  precio      numeric(10,2) NOT NULL CHECK (precio >= 0),
  descripcion text
);
```

### Tabla: transacciones_creditos
```sql
CREATE TABLE transacciones_creditos (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id),
  tipo        tipo_transaccion NOT NULL,
  cantidad    integer NOT NULL,
  descripcion text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### Tablas: rutinas, ejercicios, evaluaciones, notificaciones
Se crean con estructura idéntica al modelo actual SQLAlchemy, adaptadas a PostgreSQL.

---

## RPC Functions (lógica atómica)

### `inscribir_alumno(p_alumno_id, p_turno_id)`
```sql
-- Ejecuta en una transacción:
-- 1. Verifica creditos >= 1
-- 2. Verifica no inscripto ya
-- 3. Cuenta activos vs cupo_maximo
-- 4a. Si hay cupo: creditos -= 1, inserta inscripcion ACTIVA, registra transaccion CONSUMO
-- 4b. Si no hay cupo: inserta lista_espera (sin consumir crédito)
-- Retorna: { resultado: 'inscripto' | 'en_lista_espera', inscripcion_id? }
```

### `cancelar_inscripcion(p_inscripcion_id, p_usuario_id)`
```sql
-- 1. Verifica que la inscripcion pertenece al alumno (o es admin/recepcionista)
-- 2. Calcula próxima ocurrencia del turno (dia_semana + hora_inicio)
-- 3. Si faltan >= 24h: creditos += 1, registra transaccion DEVOLUCION
-- 4. Marca inscripcion como CANCELADA
-- 5. Toma primer alumno de lista_espera:
--    a. Descuenta su crédito
--    b. Crea inscripcion ACTIVA para él
--    c. Elimina de lista_espera
--    d. Reordena posiciones restantes
--    e. Inserta notificacion "Cupo disponible"
-- Retorna: { credito_devuelto: bool, promovido_id?: uuid }
```

---

## Flujo de autenticación

```
1. Login:
   supabase.auth.signInWithPassword({ email, password })
   → Supabase devuelve { session: { access_token, user } }
   → GET /api/auth/me con Bearer token
   → Devuelve usuario completo con rol desde public.usuarios

2. Registro público:
   POST /api/auth/register { nombre, apellido, email, password, ... }
   → API Route llama supabase.auth.admin.createUser()
   → Trigger inserta en public.usuarios con rol='alumno'
   → Devuelve usuario

3. Sesión persistente:
   supabase.auth.onAuthStateChange() mantiene la sesión
   Refresh token automático

4. API Route auth:
   const token = req.headers.authorization?.split(' ')[1]
   const { data: { user } } = await supabase.auth.getUser(token)
   const { data: usuario } = await adminClient
     .from('usuarios').select('*').eq('id', user.id).single()
```

---

## Sistema de créditos

- `usuarios.creditos` — saldo actual (nunca puede ser negativo, CHECK constraint)
- `transacciones_creditos` — historial auditable de cada operación
- Toda modificación de créditos pasa por las RPC functions (atómicas)
- El admin puede hacer `ajuste_manual` desde el panel (para pagos en efectivo)
- El saldo visible en el panel del alumno es `usuarios.creditos`

---

## Regla de cancelación (24 horas)

Para calcular si faltan ≥24h, se calcula la próxima ocurrencia del turno:
- Se toma `dia_semana` y `hora_inicio` del turno
- Se calcula la próxima fecha con ese día de la semana desde `now()`
- Si `proxima_ocurrencia - now() >= interval '24 hours'` → crédito devuelto

---

## Migración de datos (SQLite → Supabase)

Script TypeScript (`scripts/migrate.ts`) que:
1. Lee `hsp70.db` con `better-sqlite3`
2. Migra (en orden): profesores (admin + profesor) → actividades → turnos → planes
3. Los alumnos de prueba **no se migran** (datos falsos)
4. Crea los usuarios en Supabase Auth + `public.usuarios` con contraseñas conocidas
5. Verifica integridad: cuenta registros migrados vs esperados

---

## Módulos de implementación

| Módulo | Contenido | Tests |
|--------|-----------|-------|
| M1 | Setup: deps, env, `_lib/` helpers, supabase client | Vitest: client inicializa, auth middleware rechaza token inválido |
| M2 | SQL migrations + RPC functions + seed real | Supabase local: tablas, constraints, trigger, RPCs |
| M3 | Auth: AuthContext, api.ts, `/api/auth/me`, `/api/auth/register` | Login, logout, registro crea alumno, roles correctos |
| M4 | Usuarios + Actividades CRUD | Permisos por rol, paginación, filtros |
| M5 | Turnos + Planes CRUD | Admin-only para mutaciones |
| M6 | Inscripciones + créditos (RPC) | Cupo lleno → waitlist, crédito consumido, cancelación 24h, promoción waitlist |
| M7 | Asistencias + Evaluaciones | Permisos profesor/admin, UNIQUE constraint |
| M8 | Rutinas + Ejercicios | Owner-only para mutaciones, asignaciones |
| M9 | Stats + Notificaciones | Agregaciones correctas, mark as read |
| M10 | Script migración datos | Profesores reales en Supabase, actividades, turnos |
| M11 | Limpieza: eliminar FastAPI, actualizar vercel.json | Build pasa sin errores, `tsc --noEmit` limpio |

---

## Lo que NO entra en este sub-proyecto

- Stripe / pagos online → Sub-proyecto 2
- Emails (Resend) → Sub-proyecto 3
- WhatsApp API → Sub-proyecto 3
- Reportes Excel/PDF → Backlog
