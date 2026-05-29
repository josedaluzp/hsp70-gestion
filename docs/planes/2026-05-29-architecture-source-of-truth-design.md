# Design — Fuente de verdad de arquitectura (Architecture Source of Truth)

**Fecha:** 2026-05-29
**Tipo:** Sub-proyecto 1 de 3 (fundación) — `Design System de arquitectura`
**Estado:** Aprobado, pendiente de plan de implementación

---

## 1. Contexto y problema

El proyecto HSP-70 Gestión sufrió una migración de stack (FastAPI/SQLite → Vercel
serverless + Supabase, commits M1–M11) que dejó la documentación **desactualizada y
contradictoria**:

- `README.md` describe un backend FastAPI/SQLite que **ya no existe**.
- `.claude/CLAUDE.md` declara `Stack: python`, incorrecto para el sistema vivo.
- El plan viejo (`.tareas/plan.md`) no refleja el estado real.
- Conviven artefactos legados (`src/`, `app/`, `hsp70.db`) con el sistema real
  (`frontend/`), sin que ningún documento marque qué es qué.
- No existe un punto de entrada único que un desarrollador (humano o agente)
  pueda consultar para entender cómo está construido el sistema.

**Consecuencia:** cada feature se implementa sin una referencia común, lo que
reintroduce inconsistencias (ej.: el bug de contrato camelCase/snake_case en
`/stats/dashboard`, o links a rutas inexistentes en el dashboard de alumno).

## 2. Objetivo

Establecer un **conjunto de documentos canónicos** que sea la fuente de verdad de
la arquitectura del proyecto, de modo que **toda feature futura lo consulte y lo
actualice**. El foco es **arquitectura** (stack, flujo, estructura, modelo de
datos, auth, convenciones, roadmap), no diseño visual de componentes.

### No-objetivos (YAGNI)

- No es un design system visual (paleta/componentes); la dirección visual se
  registra como decisión, pero el detalle de tokens vive en `DESIGN.md` y `index.css`.
- No se implementa Auth0 ni el dashboard admin en este sub-proyecto; solo se
  documentan como direcciones y puntos de integración.
- No se borra código legado en este sub-proyecto (solo se marca como legado y se
  agenda su eliminación en el roadmap).

## 3. Estado real del sistema (lo que se documentará)

### Stack real

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, React Router |
| API | Funciones serverless en Vercel — un catch-all `frontend/api/[...path].ts` que enruta a `frontend/api/_handlers/**` |
| Base de datos | Supabase (PostgreSQL) — migraciones SQL + RPC + triggers + seed |
| Auth (actual) | Supabase Auth (JWT). Cliente: `@supabase/supabase-js` |
| Auth (target) | **Auth0** (migración planificada — sub-proyecto 2) |
| Despliegue | Vercel |

### Legado (a marcar y agendar eliminación)

- `src/`, `app/` — backend FastAPI anterior.
- `hsp70.db` — base SQLite anterior.
- `.tareas/plan.md` — plan obsoleto (reemplazado por `docs/PLAN.md`).

### Flujo de request

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

### Modelo de datos (14 tablas)

`usuarios` (id uuid = auth.users.id, nombre, apellido, email, telefono, dni,
fecha_nacimiento, rol, activo, creditos, created_at), `actividades`, `turnos`,
`inscripciones`, `lista_espera`, `asistencias`, `transacciones_creditos`,
`planes`, `ejercicios`, `rutinas`, `ejercicios_rutina`, `rutinas_alumnos`,
`evaluaciones`, `notificaciones`.

**Enums:** `rol_usuario`, `estado_inscripcion` (activa/cancelada/lista_espera),
`dia_semana`, `tipo_transaccion` (compra/consumo/devolucion/ajuste_manual).

### Modelo de Auth (actual)

- Frontend: `@supabase/supabase-js` con anon key. `signInWithPassword`,
  `getSession`, `onAuthStateChange`.
- API: `Bearer` token → `adminClient.auth.getUser(token)` valida el JWT →
  consulta `usuarios` para `rol` + `activo`. Si `!activo`, se rechaza.
- Identidad 1:1: `usuarios.id` = `auth.users.id`.
- Autorización: `requireRole(req, res, [roles])` en cada handler.

## 4. Diseño de la solución: conjunto de documentos

| Archivo | Rol | Acción |
|---------|-----|--------|
| `ARCHITECTURE.md` (raíz) | **Maestro / fuente de verdad.** Índice + arquitectura real | Crear |
| `.claude/CLAUDE.md` | Se carga automáticamente cada sesión → apunta a ARCHITECTURE.md; corrige stack | Actualizar |
| `README.md` | Setup e instrucciones reales (Vercel + Supabase) | Reescribir |
| `DESIGN.md` | Referencia visual canónica (tema claro "amp"); se aclara su rol | Aclarar/encabezar |
| `docs/PLAN.md` | Roadmap real con estado + 3 sub-proyectos + bugs detectados | Crear |

### 4.1. `ARCHITECTURE.md` — outline

1. **Propósito y cómo usar este doc** — regla explícita: toda feature consulta esto
   antes de implementar y lo actualiza si cambia una decisión.
2. **Visión del producto** — qué es HSP-70 (centro de salud/fitness; gestión de
   alumnos, profesores, actividades, turnos, inscripciones, rutinas, evaluaciones,
   planes, notificaciones).
3. **Stack real** (tabla de §3) + **Legado** (qué es y que será eliminado).
4. **Arquitectura de request** — diagrama de §3.
5. **Estructura de carpetas** — `frontend/src` (components, pages por rol, services,
   context, layouts, lib), `frontend/api` (`[...path].ts`, `_handlers`, `_lib`),
   `frontend/supabase/migrations`.
6. **Cómo se agrega algo** (recetas):
   - **Endpoint nuevo:** crear `_handlers/<recurso>/<...>.ts` + registrar ruta en
     `[...path].ts` (incluir `requireAuth`/`requireRole`).
   - **Página nueva:** crear `pages/<rol>/<Pagina>.tsx` + ruta en `App.tsx`
     (dentro del `ProtectedRoute` del rol) + ítem de nav en `MainLayout`.
   - **Migración nueva:** archivo numerado en `supabase/migrations/`.
7. **Modelo de datos** — 14 entidades, enums, relaciones + **matriz de
   roles/permisos**.
8. **Modelo de Auth** — estado actual (Supabase) y target (Auth0): puntos de
   integración (dónde se verifica el token, dónde vive el mapeo de identidad
   `usuarios.id` ↔ proveedor), sin diseñar la migración (eso es sub-proyecto 2).
9. **Dirección visual** — tema **claro "amp"** como única fuente de tokens; los
   dashboards internos se unifican a este lenguaje. Fuente: `DESIGN.md` + `index.css`.
10. **Convenciones** — código, commits, tests, guardrails (referencia a CLAUDE.md).
11. **Roadmap & estado** — link a `docs/PLAN.md`.
12. **Decisiones de arquitectura (ADR-lite)** — log de las decisiones §5.

### 4.2. Matriz de roles/permisos (3 roles)

`recepcionista` **se elimina** (decisión D4). Roles activos: **admin, profesor,
alumno**.

| Recurso / acción | admin | profesor | alumno |
|------------------|:-----:|:--------:|:------:|
| Usuarios (CRUD, activar/baja) | ✅ | — | — |
| Actividades / Turnos / Planes (CRUD) | ✅ | — | — |
| Métricas / dashboard admin | ✅ | — | — |
| Sus turnos + alumnos por turno | ✅ | ✅ (propios) | — |
| Tomar asistencia | ✅ | ✅ (propios) | — |
| Evaluaciones (crear/ver) | ✅ | ✅ | ver propias |
| Rutinas (crear/asignar) | ✅ | ✅ | ver asignadas |
| Inscribirse a turnos | — | — | ✅ |
| Ver sus clases/planes/perfil | — | — | ✅ |
| Notificaciones propias | ✅ | ✅ | ✅ |

### 4.3. `.claude/CLAUDE.md` — cambios

- Corregir `Stack: python` → stack real (frontend React/Vite + API Vercel
  serverless + Supabase; Auth0 target).
- Agregar puntero explícito: "La fuente de verdad de arquitectura es
  `ARCHITECTURE.md`; consultarlo antes de implementar cualquier feature."
- Mantener guardrails existentes (no tocar `.env`, `*.lock`, `.tareas/tareas.db`).

### 4.4. `README.md` — reescritura

Setup real: requisitos (Node), instalación de `frontend/`, variables de entorno
Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`), cómo correr en local, cómo desplegar en Vercel,
estructura, link a `ARCHITECTURE.md` y `docs/PLAN.md`. Eliminar instrucciones
FastAPI/uvicorn/SQLite.

### 4.5. `DESIGN.md` — aclaración de rol

Anteponer una nota que declare: este documento es la **referencia visual
canónica** (tema claro "amp"); la app interna (dashboards) se unifica a este
lenguaje; los tokens viven en `frontend/src/index.css`.

### 4.6. `docs/PLAN.md` — roadmap real

- **Hecho:** CRUDs (usuarios, actividades, turnos, planes), inscripciones + lista
  de espera, asistencias, evaluaciones, rutinas/ejercicios, notificaciones, landing.
- **Sub-proyectos pendientes (en orden):**
  1. Design System de arquitectura (este doc).
  2. Auth con Auth0 (rama propia).
  3. Dashboard de métricas Admin (altas, bajas, inactivos, horarios pico,
     morosos/vencimientos, retención).
- **Bugs detectados (deuda):**
  - Contrato roto en `/stats/dashboard` (API camelCase vs frontend snake_case;
    faltan `total_profesores`, `turnos_hoy`, `asistencia_semanal`).
  - Links rotos en dashboard de alumno (`/alumno/actividades`,
    `/alumno/inscripciones`, `/alumno/pagos` no existen en `App.tsx`).
  - Inconsistencia de tema (layout/admin oscuro vs alumno/profesor claro).
  - Eliminar rol `recepcionista` (enum + endpoint stats).
  - Eliminar legado (`src/`, `app/`, `hsp70.db`).

## 5. Decisiones de arquitectura (ADR-lite)

- **D1 — Stack.** React/Vite SPA + Vercel serverless (catch-all) + Supabase
  PostgreSQL. FastAPI/SQLite quedan como legado a eliminar.
- **D2 — Auth.** Migrar a **Auth0** desde Supabase Auth (sub-proyecto 2).
- **D3 — Tema visual.** Unificar toda la app en **claro "amp"**; una sola fuente
  de tokens.
- **D4 — Roles.** Eliminar `recepcionista`. Roles activos: admin, profesor, alumno.
  Requiere migración para alterar el enum `rol_usuario` y ajustar el endpoint
  `/stats/dashboard` (hoy permite recepcionista).
- **D5 — Identidad.** Hoy `usuarios.id` = `auth.users.id` (Supabase). Con Auth0 se
  definirá el mapeo de identidad en el sub-proyecto 2.

## 6. Alcance de implementación

Esta entrega produce **solo documentación** (los 5 archivos de §4). La eliminación
del rol `recepcionista`, del código legado, y la corrección de los bugs quedan
**agendados en `docs/PLAN.md`**, no se ejecutan aquí.

## 7. Criterios de éxito

- Existe `ARCHITECTURE.md` en la raíz como fuente de verdad, con las 12 secciones.
- `CLAUDE.md`, `README.md`, `DESIGN.md` y `docs/PLAN.md` son coherentes entre sí y
  con el código real (sin menciones a FastAPI/SQLite como stack vigente).
- Un lector puede, solo con estos documentos, entender el stack, agregar un
  endpoint/página, y conocer el roadmap y las decisiones tomadas.
