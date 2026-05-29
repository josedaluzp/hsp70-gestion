# Architecture Source-of-Truth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el conjunto de documentos canónicos de arquitectura (fuente de verdad) y alinear los docs existentes con el stack real.

**Architecture:** Un `ARCHITECTURE.md` maestro en la raíz como fuente de verdad, con docs de apoyo (`CLAUDE.md`, `README.md`, `DESIGN.md`, `docs/PLAN.md`) que lo referencian y dejan de contradecir el código. Solo se produce documentación; las correcciones de código (eliminar recepcionista, legado, bugs) quedan agendadas en `docs/PLAN.md`.

**Tech Stack:** Markdown. Verificación con `grep`/`rg` y `ls`. Git para commits.

**Spec de referencia:** `docs/planes/2026-05-29-architecture-source-of-truth-design.md`

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---------|-----------------|--------|
| `ARCHITECTURE.md` (raíz) | Fuente de verdad maestra: stack, flujo, estructura, recetas, modelo de datos, auth, roles, decisiones | Crear (Task 1) |
| `docs/PLAN.md` | Roadmap real: hecho / sub-proyectos / deuda | Crear (Task 2) |
| `README.md` | Setup e instrucciones reales (Vercel + Supabase) | Reescribir (Task 3) |
| `.claude/CLAUDE.md` | Puntero automático a ARCHITECTURE.md + stack corregido | Actualizar (Task 4) |
| `DESIGN.md` | Nota de encabezado aclarando su rol (referencia visual canónica) | Editar (Task 5) |

Trabajamos en la rama `feat/architecture-docs` (ya creada).

---

### Task 1: Crear `ARCHITECTURE.md` (maestro)

**Files:**
- Create: `ARCHITECTURE.md`

- [ ] **Step 1: Escribir el documento maestro**

Crear `ARCHITECTURE.md` en la raíz con exactamente este contenido:

````markdown
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

- `src/`, `app/` — backend FastAPI anterior.
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
  dni, fecha_nacimiento, `rol`, activo, creditos, created_at.
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
````

- [ ] **Step 2: Verificar secciones y ausencia de stack obsoleto**

Run: `rg -c "^## " ARCHITECTURE.md`
Expected: `12`

Run: `rg -i "uvicorn|aiosqlite|fastapi" ARCHITECTURE.md`
Expected: solo aparece "FastAPI" en contexto de **legado** (líneas de §3 "Legado" y D1). Si aparece como stack vigente, corregir.

- [ ] **Step 3: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs: add ARCHITECTURE.md as architecture source of truth"
```

---

### Task 2: Crear `docs/PLAN.md` (roadmap real)

**Files:**
- Create: `docs/PLAN.md`

- [ ] **Step 1: Escribir el roadmap**

Crear `docs/PLAN.md` con exactamente este contenido:

````markdown
# HSP-70 Gestión — Roadmap & Estado

> Fuente de verdad del estado y la planificación. Reemplaza al obsoleto
> `.tareas/plan.md`. Para la arquitectura, ver [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Hecho

- CRUDs: usuarios, actividades, turnos, planes.
- Inscripciones + lista de espera + liberación de cupo.
- Asistencias / check-in.
- Evaluaciones de salud (IMC).
- Rutinas y ejercicios; asignación a alumnos.
- Notificaciones internas.
- Dashboards básicos por rol (alumno, profesor, admin).
- Landing page.
- Migración de stack a Vercel serverless + Supabase.

## Sub-proyectos pendientes (en orden)

1. **Design System de arquitectura** — este conjunto de documentos.
   *(en curso)*
2. **Auth con Auth0** — reemplaza Supabase Auth. Rama propia. Define el mapeo de
   identidad `usuarios.id` ↔ Auth0.
3. **Dashboard de métricas Admin** — altas, bajas, inactivos, horarios pico,
   morosos/vencimientos, retención. Incluye arreglar el contrato de
   `/stats/dashboard`.

## Deuda técnica / bugs detectados

- **Contrato roto en `/stats/dashboard`.** La API devuelve camelCase
  (`totalAlumnos`, `totalTurnos`, `inscripcionesActivas`, `actividades`) pero el
  frontend espera snake_case (`total_alumnos`, `total_profesores`, `turnos_hoy`,
  `inscripciones_activas`, `asistencia_semanal`). Faltan `total_profesores`,
  `turnos_hoy` y `asistencia_semanal`. → Se resuelve en el sub-proyecto 3.
- **Links rotos en dashboard de alumno.** `/alumno/actividades`,
  `/alumno/inscripciones` y `/alumno/pagos` no existen en `App.tsx`.
- **Inconsistencia de tema.** Layout y dashboard admin oscuros vs alumno/profesor
  claros. → Unificar en claro "amp" (D3).
- **Eliminar rol `recepcionista`.** Alterar enum `rol_usuario` (migración) y
  quitarlo de `/stats/dashboard` (hoy lo permite).
- **Eliminar legado.** `src/`, `app/`, `hsp70.db`, `.tareas/plan.md`.
````

- [ ] **Step 2: Verificar referencias clave**

Run: `rg -c "Auth0|recepcionista|stats/dashboard" docs/PLAN.md`
Expected: ≥ 3 (cada término aparece al menos una vez).

- [ ] **Step 3: Commit**

```bash
git add docs/PLAN.md
git commit -m "docs: add docs/PLAN.md roadmap, replacing stale .tareas/plan.md"
```

---

### Task 3: Reescribir `README.md`

**Files:**
- Modify: `README.md` (reemplazo completo)

- [ ] **Step 1: Reescribir el README con el setup real**

Reemplazar todo el contenido de `README.md` por:

````markdown
# HSP-70 Gestión

Sistema de gestión integral para el centro de salud y fitness **HSP-70**:
alumnos, profesores, actividades, turnos, inscripciones, rutinas, evaluaciones de
salud y planes de membresía.

> **Arquitectura:** ver [`ARCHITECTURE.md`](ARCHITECTURE.md) (fuente de verdad).
> **Roadmap y estado:** ver [`docs/PLAN.md`](docs/PLAN.md).

## Tech Stack

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, React Router |
| API | Funciones serverless en Vercel (catch-all `frontend/api/[...path].ts`) |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth (migración a Auth0 planificada) |
| Despliegue | Vercel |

## Requisitos previos

- Node.js >= 20.19 (o >= 22 LTS recomendado)
- npm >= 10
- Cuenta de Supabase y proyecto creado
- Vercel CLI (opcional, para correr funciones serverless en local)

## Configuración de entorno

Crear `frontend/.env.local` con:

```
VITE_SUPABASE_URL=<url de tu proyecto Supabase>
VITE_SUPABASE_ANON_KEY=<anon key>
```

Para las funciones serverless (entorno de Vercel / `.env` local de funciones):

```
SUPABASE_URL=<url de tu proyecto Supabase>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

> Nunca commitear `.env*` ni claves.

## Instalación

```bash
cd frontend
npm install
```

## Base de datos

Aplicar las migraciones de `frontend/supabase/migrations/` (en orden) sobre tu
proyecto Supabase, vía el SQL editor o la CLI de Supabase.

## Ejecución en local

```bash
cd frontend
npm run dev
```

La SPA queda en `http://localhost:5173`. Para ejecutar las funciones serverless
junto con el frontend, usar `vercel dev` desde `frontend/`.

## Estructura del proyecto

Ver [`ARCHITECTURE.md`](ARCHITECTURE.md) §5.

## Despliegue

El proyecto se despliega en Vercel. Las variables de entorno
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) se configuran en el dashboard de Vercel.

## Roles

| Rol | Permisos |
|-----|----------|
| Admin | Acceso total: usuarios, actividades, turnos, planes, métricas. |
| Profesor | Ve sus turnos y alumnos; toma asistencia; crea evaluaciones y rutinas. |
| Alumno | Ve sus clases, planes, rutinas y perfil; se inscribe a turnos. |

## Licencia

Proyecto privado. Todos los derechos reservados.
````

- [ ] **Step 2: Verificar que no quedan instrucciones del stack legado**

Run: `rg -i "uvicorn|aiosqlite|app.main|app.seed|pip install" README.md`
Expected: sin resultados (exit code 1).

Run: `rg -c "Supabase|Vercel" README.md`
Expected: ≥ 2.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for Vercel + Supabase stack"
```

---

### Task 4: Actualizar `.claude/CLAUDE.md`

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Leer el archivo actual**

Run: `cat .claude/CLAUDE.md`
Localizar la sección `## Tech Stack` que contiene `- **Stack:** python`.

- [ ] **Step 2: Reemplazar la sección Tech Stack**

Reemplazar la línea:

```
- **Stack:** python
```

por:

```
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **API:** Funciones serverless en Vercel (catch-all `frontend/api/[...path].ts`)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (migración a Auth0 planificada)
```

- [ ] **Step 3: Agregar puntero a la fuente de verdad**

Inmediatamente debajo del título `# hsp70-gestion`, agregar:

```
> **Fuente de verdad de arquitectura:** consultar `ARCHITECTURE.md` (raíz) antes
> de implementar cualquier feature. Estado y roadmap en `docs/PLAN.md`.
```

- [ ] **Step 4: Verificar**

Run: `rg "ARCHITECTURE.md" .claude/CLAUDE.md`
Expected: ≥ 1 resultado.

Run: `rg "Stack:.*python" .claude/CLAUDE.md`
Expected: sin resultados (exit code 1).

- [ ] **Step 5: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: point CLAUDE.md to ARCHITECTURE.md and fix stack"
```

---

### Task 5: Aclarar el rol de `DESIGN.md`

**Files:**
- Modify: `DESIGN.md` (agregar nota de encabezado)

- [ ] **Step 1: Insertar nota tras la primera línea**

Después de la primera línea (`# amp — Style Reference`), insertar este bloque:

```
> **Rol de este documento:** referencia visual canónica del proyecto (tema claro
> "amp"). Toda la app interna (dashboards) se unifica a este lenguaje. Los tokens
> implementados viven en `frontend/src/index.css`. Para la arquitectura general,
> ver `ARCHITECTURE.md`.
```

- [ ] **Step 2: Verificar**

Run: `rg "referencia visual canónica|ARCHITECTURE.md" DESIGN.md`
Expected: ≥ 1 resultado.

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md
git commit -m "docs: clarify DESIGN.md role as canonical visual reference"
```

---

### Task 6: Barrido final de coherencia

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Verificar que todos los docs referencian la fuente de verdad**

Run: `rg -l "ARCHITECTURE.md" README.md docs/PLAN.md DESIGN.md .claude/CLAUDE.md`
Expected: los 4 archivos aparecen.

- [ ] **Step 2: Verificar que no queda el stack legado como vigente**

Run: `rg -i "stack.*python|uvicorn" README.md .claude/CLAUDE.md ARCHITECTURE.md`
Expected: sin resultados (exit code 1).

- [ ] **Step 3: Verificar existencia de los 5 entregables**

Run: `ls ARCHITECTURE.md docs/PLAN.md README.md DESIGN.md .claude/CLAUDE.md`
Expected: los 5 existen.

- [ ] **Step 4: Commit final (si hubo ajustes) o cierre**

Si el barrido detectó algo y se corrigió:
```bash
git add -A
git commit -m "docs: fix cross-references in architecture docs"
```
Si no hubo cambios, no hay nada que commitear.

---

## Self-Review (cobertura del spec)

- Spec §4 (conjunto de 5 docs) → Tasks 1–5. ✅
- Spec §4.1 (outline 12 secciones ARCHITECTURE) → Task 1, verificado en Step 2. ✅
- Spec §4.2 (matriz 3 roles, sin recepcionista) → Task 1 §7. ✅
- Spec §4.3 (CLAUDE.md puntero + stack) → Task 4. ✅
- Spec §4.4 (README reescrito) → Task 3. ✅
- Spec §4.5 (DESIGN.md nota de rol) → Task 5. ✅
- Spec §4.6 (docs/PLAN.md roadmap + bugs) → Task 2. ✅
- Spec §5 (ADR-lite D1–D5) → Task 1 §12. ✅
- Spec §6 (solo documentación; correcciones agendadas) → Task 2 (deuda). ✅
