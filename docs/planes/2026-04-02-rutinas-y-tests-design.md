# Rutinas/Ejercicios + Tests Backend — Design Spec

## Scope

Two tasks:
1. **Tarea #26** — Verify and complete backend test coverage (437 tests already pass)
2. **Nueva feature** — Rutinas de entrenamiento con ejercicios y videos YouTube

Mercado Pago (#29) is explicitly deferred.

---

## 1. Tests Backend (#26)

### Current State
- 437 tests passing across 19 test files
- Covers: auth, usuarios, actividades, turnos, inscripciones, asistencias, evaluaciones, pagos, authorization, models, schemas, security, health, reportes, stats, vencimientos, seed

### Action
- Run coverage report to identify gaps
- Add tests for any uncovered modules/endpoints
- Target: 80%+ coverage on all modules
- Mark task #26 as done once verified

---

## 2. Rutinas y Ejercicios (New Feature)

### Data Models

**Ejercicio**
- `id`: Integer, PK
- `nombre`: String, unique, not null
- `video_url`: String, not null (YouTube URL)
- `created_at`: DateTime, default now

**Rutina**
- `id`: Integer, PK
- `nombre`: String, not null
- `descripcion`: String, nullable
- `profesor_id`: Integer, FK → Usuario.id, not null
- `created_at`: DateTime, default now
- Relationships: ejercicios (via RutinaEjercicio), asignaciones, profesor

**RutinaEjercicio** (join table)
- `id`: Integer, PK
- `rutina_id`: Integer, FK → Rutina.id, not null
- `ejercicio_id`: Integer, FK → Ejercicio.id, not null
- `orden`: Integer, not null
- Unique constraint: (rutina_id, ejercicio_id)

**RutinaAsignacion**
- `id`: Integer, PK
- `rutina_id`: Integer, FK → Rutina.id, not null
- `alumno_id`: Integer, FK → Usuario.id, not null
- `fecha_asignacion`: DateTime, default now
- Unique constraint: (rutina_id, alumno_id)

### Backend Endpoints

**Ejercicios** (`/api/ejercicios`) — Admin, Profesor
- `GET /api/ejercicios` — List all exercises (search by nombre)
- `GET /api/ejercicios/{id}` — Get exercise detail
- `POST /api/ejercicios` — Create exercise (nombre, video_url)
- `PUT /api/ejercicios/{id}` — Update exercise
- `DELETE /api/ejercicios/{id}` — Delete exercise

**Rutinas** (`/api/rutinas`) — Admin, Profesor
- `GET /api/rutinas` — List all routines (search, filter by profesor_id)
- `GET /api/rutinas/{id}` — Get routine with exercises (ordered)
- `POST /api/rutinas` — Create routine (nombre, descripcion, ejercicios: [{ejercicio_id, orden}])
- `PUT /api/rutinas/{id}` — Update routine (nombre, descripcion, ejercicios)
- `DELETE /api/rutinas/{id}` — Delete routine

**Asignaciones** — Admin, Profesor
- `POST /api/rutinas/{id}/asignar` — Assign routine to student (alumno_id)
- `DELETE /api/rutinas/{id}/asignar/{alumno_id}` — Remove assignment

**Alumno view** — Alumno (own data only)
- `GET /api/alumnos/{id}/rutinas` — List assigned routines with exercise count and profesor name
- `GET /api/alumnos/{id}/rutinas/{rutina_id}` — Get routine detail with ordered exercises

### Frontend — Alumno

**Route:** `/alumno/rutinas`

**Mis Rutinas (list view):**
- Clean list style (consistent with existing UI)
- Each row: colored icon, routine name, exercise count, professor name, chevron
- Click → navigate to routine detail

**Routine Detail:**
- Header: back button, icon, routine name, exercise count, professor
- Numbered list of exercises, each with play button
- Click exercise → centered modal overlay with embedded YouTube video
- Modal: dark overlay, white modal with title + embedded YouTube iframe, close button

### Frontend — Admin/Profesor

**Route:** `/admin/rutinas` (admin), `/profesor/rutinas` (profesor)

**Ejercicios management:**
- Table/list of exercises with nombre and video_url
- Create/edit form: nombre + video_url (YouTube link)
- Delete with confirmation

**Rutinas management:**
- Table/list of routines with nombre, profesor, exercise count
- Create/edit form: nombre, descripcion, select exercises from catalog, drag/reorder
- Assign to students: select alumno from list

### Permissions

| Role | Ejercicios | Rutinas | Asignaciones | Ver rutinas asignadas |
|------|-----------|---------|-------------|----------------------|
| Admin | CRUD | CRUD | CRUD | All students |
| Profesor | CRUD | CRUD (own) | CRUD (own) | Own students |
| Alumno | — | — | — | Own only |
| Recepcionista | — | — | — | — |

### UI Design Decisions (from mockups)
- **Mis Rutinas:** Clean list (not card grid)
- **Exercise list:** Numbered list with play button (not thumbnail grid)
- **Video display:** Centered modal overlay (not slide-up panel)
