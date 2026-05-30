# HSP-70 Gestión — Arquitectura (Fuente de Verdad)

> **Este documento es la fuente de verdad de la arquitectura del proyecto.**
> Antes de implementar cualquier feature, consultá este documento. Si una
> decisión de arquitectura cambia, actualizá este documento en el mismo PR.

## 1. Propósito y cómo usar este doc

HSP-70 Gestión es un sistema de gestión para un centro de salud/fitness. Este
documento describe cómo está construido el sistema realmente, para que toda
feature se apoye en una referencia común y no reintroduzca inconsistencias.

Reglas:
- Toda feature consulta este documento antes de empezar.
- Si cambia el stack, el modelo de datos, el modelo de auth o una convención,
  se actualiza este documento en el mismo cambio.
- El roadmap y el estado viven en [`docs/PLAN.md`](docs/PLAN.md).

## 2. Visión del producto

Gestión integral de un centro de salud/fitness: alumnos, profesores,
actividades, turnos, inscripciones (con lista de espera), asistencias,
evaluaciones de salud, rutinas de entrenamiento, planes de membresía (créditos)
y notificaciones internas. Roles: **admin, profesor, alumno**.

## 3. Stack real

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, React Router |
| API | Funciones serverless en Vercel — catch-all `frontend/api/[...path].ts` que enruta a `frontend/api/_handlers/**` |
| Base de datos | Supabase (PostgreSQL) — migraciones SQL + RPC + triggers + seed en `frontend/supabase/migrations/` |
| Auth (actual) | Supabase Auth (JWT), cliente `@supabase/supabase-js` |
| Auth (target) | **Auth0** — migración planificada (sub-proyecto 2) |
| Despliegue | Vercel |

### Legado (NO usar; a eliminar — ver `docs/PLAN.md`)

- `src/` — solo artefactos de build Python (`.egg-info`) del backend FastAPI anterior; sin código fuente y sin trackear en git. (El backend `app/` ya fue eliminado en M11.)
- `hsp70.db` — base SQLite anterior.
- `.tareas/plan.md` — plan obsoleto (reemplazado por `docs/PLAN.md`).

## 4. Arquitectura de request

```
Navegador
  └─ SPA (Vite, React Router)
       ├─ Supabase JS  ── login/sesión (signInWithPassword, getSession)
       └─ fetch /api/* con header Authorization: Bearer <token>
            └─ Vercel: frontend/api/[...path].ts  (catch-all)
                 └─ enruta por segmentos → _handlers/<recurso>/<...>.ts
                      ├─ _lib/auth.ts  → verifyToken / requireAuth / requireRole
                      └─ _lib/supabase.ts → adminClient (service role)
                           └─ Supabase (PostgreSQL)
```

## 5. Estructura de carpetas

```
frontend/
├── src/
│   ├── components/   # UI reutilizable (components/ui) + landing
│   ├── pages/        # por rol: admin/, profesor/, alumno/ + Login, Landing, etc.
│   ├── layouts/      # MainLayout (sidebar + nav por rol)
│   ├── context/      # AuthContext
│   ├── services/     # clientes API (axios/fetch): adminApi, alumnoApi, etc.
│   └── lib/          # supabase client (anon)
├── api/
│   ├── [...path].ts  # catch-all: enruta a los handlers
│   ├── _handlers/    # un archivo por endpoint, agrupados por recurso
│   └── _lib/         # auth.ts, supabase.ts (adminClient), errors.ts, types.ts
└── supabase/
    └── migrations/   # 001_*.sql … (esquema, RPC, triggers, seed)
```

## 6. Cómo se agrega algo (recetas)

### Endpoint nuevo
1. Crear `frontend/api/_handlers/<recurso>/<archivo>.ts` (default export
   `handler(req, res)`).
2. Proteger con `requireAuth(req, res)` o `requireRole(req, res, [roles])`
   de `_lib/auth.ts`.
3. Registrar la ruta por segmentos en `frontend/api/[...path].ts`.

### Página nueva
1. Crear `frontend/src/pages/<rol>/<Pagina>.tsx`.
2. Agregar la ruta en `frontend/src/App.tsx`, dentro del `ProtectedRoute` del
   rol correspondiente.
3. Agregar el ítem de navegación en `frontend/src/layouts/MainLayout.tsx`
   (`ALUMNO_NAV_ITEMS` / `PROFESOR_NAV_ITEMS` / `ADMIN_NAV_ITEMS`).

### Migración nueva
1. Crear archivo numerado en `frontend/supabase/migrations/` (ej. `011_*.sql`).

## 7. Modelo de datos

14 tablas (PostgreSQL):

- **usuarios** — `id uuid` (= `auth.users.id`), nombre, apellido, email, telefono,
  dni, fecha_nacimiento, `rol`, activo, creditos, created_at, `en_pausa`
  (pausa temporal marcada por profesor), `baja_at` (fecha de baja).
- **actividades** — nombre, descripcion, cupo_maximo, duracion_min, activa.
- **turnos** — actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin,
  sala, activo.
- **inscripciones** — alumno_id, turno_id, fecha_inscripcion, estado.
- **lista_espera** — alumno_id, turno_id, posicion, fecha.
- **asistencias** — inscripcion_id, fecha, presente, observacion.
- **transacciones_creditos** — usuario_id, tipo, cantidad, descripcion, created_at.
- **planes** — nombre, creditos, precio, descripcion.
- **ejercicios** — nombre, descripcion, grupo_muscular, video_url.
- **rutinas** — nombre, descripcion, profesor_id, created_at.
- **ejercicios_rutina** — rutina_id, ejercicio_id, series, repeticiones,
  duracion_seg, descanso_seg, orden, notas.
- **rutinas_alumnos** — rutina_id, alumno_id, asignada_at.
- **evaluaciones** — alumno_id, profesor_id, fecha, peso_kg, altura_cm, imc,
  grasa_corporal_pct, notas.
- **notificaciones** — usuario_id, titulo, mensaje, leida, created_at.

**Enums:** `rol_usuario`, `estado_inscripcion` (activa/cancelada/lista_espera),
`dia_semana`, `tipo_transaccion` (compra/consumo/devolucion/ajuste_manual).

> Nota: `rol_usuario` contiene `recepcionista`, pendiente de eliminación (ver
> `docs/PLAN.md`). Los roles activos son admin, profesor, alumno.

### Matriz de roles/permisos

| Recurso / acción | admin | profesor | alumno |
|------------------|:-----:|:--------:|:------:|
| Usuarios (CRUD, baja) | ✅ | — | — |
| Actividades / Turnos / Planes (CRUD) | ✅ | — | — |
| Métricas / dashboard admin | ✅ | — | — |
| Sus turnos + alumnos por turno | ✅ | ✅ (propios) | — |
| Tomar asistencia | ✅ | ✅ (propios) | — |
| Evaluaciones (crear/ver) | ✅ | ✅ | ver propias |
| Rutinas (crear/asignar) | ✅ | ✅ | ver asignadas |
| Inscribirse a turnos | — | — | ✅ |
| Ver sus clases/planes/perfil | — | — | ✅ |
| Notificaciones propias | ✅ | ✅ | ✅ |

## 8. Modelo de Auth

### Actual (Supabase Auth)
- Frontend: `@supabase/supabase-js` con anon key. `signInWithPassword`,
  `getSession`, `onAuthStateChange` (ver `src/context/AuthContext.tsx`).
- API: header `Bearer <token>` → `adminClient.auth.getUser(token)` valida el JWT
  → consulta `usuarios` para `rol` + `activo`. Si `!activo`, rechaza
  (ver `api/_lib/auth.ts`).
- Identidad 1:1: `usuarios.id` = `auth.users.id`.
- Autorización por handler: `requireRole(req, res, [roles])`.

### Target (Auth0 — sub-proyecto 2)
- Puntos de integración a definir en su propio spec: verificación del token en
  `api/_lib/auth.ts`, login/sesión en `AuthContext`, y el **mapeo de identidad**
  `usuarios.id` ↔ identidad de Auth0.

## 9. Dirección visual

Tema unificado: **claro "amp"** ("warmly lit athletic minimalism"). Es la única
fuente de tokens; toda la app interna (dashboards) se alinea a este lenguaje.
- Referencia de tokens: [`DESIGN.md`](DESIGN.md) y `frontend/src/index.css`.

## 10. Convenciones

Código claro y autodocumentado; funciones que hacen una cosa (~40 líneas);
errores explícitos; early returns; tests por feature; commits en imperativo
(≤72 chars). Guardrails y detalle en [`.claude/CLAUDE.md`](.claude/CLAUDE.md).

## 11. Roadmap & estado

Ver [`docs/PLAN.md`](docs/PLAN.md).

## 12. Decisiones de arquitectura (ADR-lite)

- **D1 — Stack.** React/Vite SPA + Vercel serverless (catch-all) + Supabase
  PostgreSQL. FastAPI/SQLite = legado a eliminar.
- **D2 — Auth.** Migrar a Auth0 desde Supabase Auth (sub-proyecto 2).
- **D3 — Tema visual.** Unificar toda la app en claro "amp"; una sola fuente de tokens.
- **D4 — Roles.** Eliminar `recepcionista`. Roles activos: admin, profesor, alumno.
- **D5 — Identidad.** Hoy `usuarios.id` = `auth.users.id`. Con Auth0 se definirá el mapeo.
