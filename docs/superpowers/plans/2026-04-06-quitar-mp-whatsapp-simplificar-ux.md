# Remove MercadoPago, Add WhatsApp Redirect & Simplify UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all MercadoPago payment integration, replace with WhatsApp redirect for payments, and simplify navigation/UX for alumno, profesor, and admin roles.

**Architecture:** Surgical removal of payment-related backend code (models, services, routers, tests) and frontend pages. Replace alumno Pagos page with a Planes showcase page with WhatsApp CTA buttons. Fuse alumno Actividades + Inscripciones into a single MisClases page. Simplify navigation across all roles. Clean up admin dashboard stats and reportes.

**Tech Stack:** Python/FastAPI (backend), React 19/TypeScript/Tailwind CSS 4 (frontend), Vite 8

---

### Task 1: Remove backend payment files

**Files:**
- Delete: `app/api/mercadopago.py`
- Delete: `app/api/pagos.py`
- Delete: `app/api/vencimientos.py`
- Delete: `app/services/mercadopago_service.py`
- Delete: `app/services/pago_service.py`
- Delete: `app/services/vencimiento_service.py`
- Delete: `app/schemas/pago.py`
- Delete: `app/schemas/vencimiento.py`
- Delete: `app/models/pago.py`
- Delete: `app/tests/test_mercadopago.py`
- Delete: `app/tests/test_pagos.py`

- [ ] **Step 1: Delete all payment-related backend files**

```bash
rm app/api/mercadopago.py app/api/pagos.py app/api/vencimientos.py
rm app/services/mercadopago_service.py app/services/pago_service.py app/services/vencimiento_service.py
rm app/schemas/pago.py app/schemas/vencimiento.py
rm app/models/pago.py
rm app/tests/test_mercadopago.py app/tests/test_pagos.py
```

- [ ] **Step 2: Commit deletion**

```bash
git add -A
git commit -m "refactor: remove all payment-related backend files

Delete MercadoPago router, service, payment model, schemas,
and tests. Payment flow moves to WhatsApp + n8n externally."
```

---

### Task 2: Update backend imports and config

**Files:**
- Modify: `app/main.py` (lines 6, 12, 19, 44, 46, 53, 59-62)
- Modify: `app/core/config.py` (lines 17-19)
- Modify: `app/models/__init__.py` (lines 4-11, 16, 22-43)
- Modify: `app/models/enums.py` (lines 17-32)
- Modify: `pyproject.toml` (line 15)
- Modify: `.env.example` (line 5)

- [ ] **Step 1: Update `app/main.py` — remove payment router imports and includes**

Remove these import lines:
```python
from app.api.mercadopago import router as mercadopago_router
from app.api.pagos import router as pagos_router
from app.api.vencimientos import router as vencimientos_router
```

Remove these include lines:
```python
app.include_router(mercadopago_router)
app.include_router(pagos_router)
app.include_router(vencimientos_router)
```

Update the startup model imports — remove `Pago` from the import:
```python
    from app.models import (  # noqa: F401
        Actividad, Asistencia, Ejercicio, EvaluacionSalud, Inscripcion,
        ListaEspera, Notificacion, Plan, Rutina, RutinaAsignacion,
        RutinaEjercicio, Turno, Usuario,
    )
```

- [ ] **Step 2: Update `app/core/config.py` — remove MP settings**

Remove these three lines (17-19):
```python
    MP_ACCESS_TOKEN: str = ""
    MP_PUBLIC_KEY: str = ""
    MP_WEBHOOK_SECRET: str = ""
```

- [ ] **Step 3: Update `app/models/__init__.py` — remove payment imports and exports**

Remove from imports:
```python
    EstadoPago,
    MetodoPago,
    TipoPago,
```
and:
```python
from app.models.pago import Pago
```

Remove from `__all__`:
```python
    "EstadoPago",
    "MetodoPago",
    "Pago",
    "TipoPago",
```

- [ ] **Step 4: Update `app/models/enums.py` — remove payment enums**

Remove `EstadoPago` class (lines 17-21), `MetodoPago` class (lines 24-27), and `TipoPago` class (lines 30-32). Keep `RolUsuario`, `EstadoInscripcion`, and `DiaSemana`.

Final file should be:
```python
import enum


class RolUsuario(str, enum.Enum):
    ALUMNO = "alumno"
    PROFESOR = "profesor"
    RECEPCIONISTA = "recepcionista"
    ADMIN = "admin"


class EstadoInscripcion(str, enum.Enum):
    ACTIVA = "activa"
    CANCELADA = "cancelada"
    LISTA_ESPERA = "lista_espera"


class DiaSemana(str, enum.Enum):
    LUNES = "lunes"
    MARTES = "martes"
    MIERCOLES = "miercoles"
    JUEVES = "jueves"
    VIERNES = "viernes"
    SABADO = "sabado"
    DOMINGO = "domingo"
```

- [ ] **Step 5: Update `app/models/usuario.py` — remove pagos relationship**

Remove lines 34-36:
```python
    pagos: Mapped[list["Pago"]] = relationship(  # noqa: F821
        back_populates="alumno", foreign_keys="Pago.alumno_id"
    )
```

- [ ] **Step 6: Update `app/models/plan.py` — remove precio_suscripcion and pagos relationship**

Remove `precio_suscripcion` column (lines 16-18):
```python
    precio_suscripcion: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True, default=None
    )
```

Remove pagos relationship (lines 21-23):
```python
    pagos: Mapped[list["Pago"]] = relationship(  # noqa: F821
        back_populates="plan"
    )
```

- [ ] **Step 7: Update `app/schemas/plan.py` — remove precio_suscripcion from all schemas**

Remove `precio_suscripcion` from `PlanCreate` (line 8), `PlanUpdate` (line 17), and `PlanRead` (line 29).

- [ ] **Step 8: Update `pyproject.toml` — remove mercadopago dependency**

Remove line 15:
```
    "mercadopago>=2.2",
```

- [ ] **Step 9: Update `.env.example` — remove MP_ACCESS_TOKEN**

Remove the line:
```
MP_ACCESS_TOKEN=
```

- [ ] **Step 10: Update `app/services/stats_service.py` — remove payment stats**

Remove imports of `EstadoPago` and `Pago`. Remove functions `_count_active_students`, `_count_pagos_by_estado`, `_sum_ingresos_mes`. Update `get_dashboard_stats` to not include payment fields.

Replace with simplified version:
```python
"""Service layer for admin dashboard statistics."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.actividad import Actividad
from app.models.enums import (
    DiaSemana,
    EstadoInscripcion,
    RolUsuario,
)
from app.models.inscripcion import Inscripcion
from app.models.turno import Turno
from app.models.usuario import Usuario
from app.schemas.stats import DashboardStats

WEEKDAY_MAP = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
    5: DiaSemana.SABADO,
    6: DiaSemana.DOMINGO,
}


async def _count_users_by_role(
    db: AsyncSession, role: RolUsuario
) -> int:
    result = await db.execute(
        select(func.count(Usuario.id)).where(
            Usuario.rol == role, Usuario.activo.is_(True)
        )
    )
    return result.scalar_one()


async def _count_actividades(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(Actividad.id)).where(Actividad.activa.is_(True))
    )
    return result.scalar_one()


async def _count_turnos_hoy(db: AsyncSession) -> int:
    today_dia = WEEKDAY_MAP[date.today().weekday()]
    result = await db.execute(
        select(func.count(Turno.id)).where(
            Turno.dia_semana == today_dia, Turno.activo.is_(True)
        )
    )
    return result.scalar_one()


async def _count_inscripciones_activas(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(Inscripcion.id)).where(
            Inscripcion.estado == EstadoInscripcion.ACTIVA
        )
    )
    return result.scalar_one()


async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
    """Gather all dashboard statistics in a single call."""
    return DashboardStats(
        total_alumnos=await _count_users_by_role(db, RolUsuario.ALUMNO),
        total_profesores=await _count_users_by_role(db, RolUsuario.PROFESOR),
        total_actividades=await _count_actividades(db),
        turnos_hoy=await _count_turnos_hoy(db),
        inscripciones_activas=await _count_inscripciones_activas(db),
    )
```

- [ ] **Step 11: Update `app/schemas/stats.py` — remove payment fields**

```python
"""Dashboard statistics response schema."""

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_alumnos: int
    total_profesores: int
    total_actividades: int
    turnos_hoy: int
    inscripciones_activas: int
```

- [ ] **Step 12: Update `app/services/reporte_service.py` — remove payment imports**

Remove these imports:
```python
from app.models.enums import EstadoInscripcion, EstadoPago, RolUsuario
from app.models.pago import Pago
```
Replace with:
```python
from app.models.enums import EstadoInscripcion, RolUsuario
```

Also search the file for any functions that use `Pago` or `EstadoPago` and remove them (e.g., `pagos_excel`, `morosos_excel`). Keep `alumnos_excel`, `asistencias_excel`, `alumno_ficha_pdf`.

- [ ] **Step 13: Update `app/api/reportes.py` — remove payment report endpoints**

Search for and remove any endpoints that call `reporte_service.pagos_excel` or `reporte_service.morosos_excel`. Keep `alumnos_excel`, `asistencias_excel`, `alumno_ficha_pdf`.

- [ ] **Step 14: Verify backend compiles**

```bash
cd app && python -c "from app.main import app; print('OK')"
```

Expected: `OK` with no import errors.

- [ ] **Step 15: Run existing backend tests**

```bash
pytest app/tests/ -v --tb=short 2>&1 | head -60
```

Expected: All remaining tests pass. Fix any import errors in tests that reference removed modules.

- [ ] **Step 16: Commit backend cleanup**

```bash
git add -A
git commit -m "refactor: clean up backend imports after payment removal

Remove payment enums, model relationships, config vars,
mercadopago dependency, and payment-related stats/reports."
```

---

### Task 3: Update frontend — remove payment code and update API services

**Files:**
- Delete: `frontend/src/pages/alumno/Pagos.tsx`
- Delete: `frontend/src/pages/admin/Reportes.tsx`
- Modify: `frontend/src/services/alumnoApi.ts` (lines 30-50, 152-163)
- Modify: `frontend/src/services/adminApi.ts` (lines 82-99, 212-233, 237-251)

- [ ] **Step 1: Delete frontend pages that are being removed or replaced**

```bash
rm frontend/src/pages/alumno/Pagos.tsx
rm frontend/src/pages/admin/Reportes.tsx
```

- [ ] **Step 2: Update `frontend/src/services/alumnoApi.ts` — remove payment types and mercadopago module**

Remove the `Pago` interface (lines 30-42), `PagoList` interface (lines 44-50), and the entire `mercadopago` export (lines 152-163).

- [ ] **Step 3: Update `frontend/src/services/adminApi.ts` — remove payment types and APIs**

In `Plan` interface (lines 82-90), remove `precio_suscripcion`:
```typescript
export interface Plan {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_dias: number;
  max_actividades: number;
}
```

In `PlanForm` interface (lines 92-99), remove `precio_suscripcion`:
```typescript
export interface PlanForm {
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion_dias: number;
  max_actividades: number;
}
```

In `reportes` object (lines 212-233), remove `pagosExcel` and `morososExcel`:
```typescript
export const reportes = {
  alumnosExcel: () =>
    api.get("/reportes/alumnos/excel", { responseType: "blob" }),

  asistenciasExcel: (fechaInicio: string, fechaFin: string) =>
    api.get("/reportes/asistencias/excel", {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      responseType: "blob",
    }),

  alumnoFichaPdf: (alumnoId: number) =>
    api.get(`/reportes/alumno/${alumnoId}/pdf`, { responseType: "blob" }),
};
```

In `DashboardStats` interface (lines 237-248), remove payment fields:
```typescript
export interface DashboardStats {
  total_alumnos: number;
  total_profesores: number;
  total_actividades: number;
  turnos_hoy: number;
  inscripciones_activas: number;
}
```

- [ ] **Step 4: Commit frontend API cleanup**

```bash
git add -A
git commit -m "refactor: remove payment types and APIs from frontend services

Delete Pagos page, Reportes page. Clean up alumnoApi and
adminApi to remove MercadoPago and payment-related code."
```

---

### Task 4: Create alumno Planes page with WhatsApp CTA

**Files:**
- Create: `frontend/src/pages/alumno/Planes.tsx`

- [ ] **Step 1: Create the Planes showcase page**

Create `frontend/src/pages/alumno/Planes.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Spinner } from "../../components/ui";
import { planesAlumno } from "../../services/alumnoApi";
import type { Plan } from "../../services/adminApi";
import useAuth from "../../hooks/useAuth";

const WHATSAPP_NUMBER = "542975027842";

function buildWhatsAppUrl(plan: Plan, nombreAlumno: string): string {
  const msg = encodeURIComponent(
    `Hola! Quiero contratar el plan ${plan.nombre} ($${plan.precio}/mes). Mi nombre es ${nombreAlumno}.`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function Planes() {
  const { user } = useAuth();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlanes() {
      try {
        const res = await planesAlumno.list();
        setPlanes(res.data.items);
      } catch {
        setError("No se pudieron cargar los planes.");
      } finally {
        setLoading(false);
      }
    }
    fetchPlanes();
  }, []);

  const nombreCompleto = user ? `${user.nombre} ${user.apellido}` : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Nuestros Planes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Elegí el plan que mejor se adapte a tus objetivos
        </p>
      </div>

      {/* Plans grid */}
      {planes.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
          <p className="text-neutral-500">No hay planes disponibles en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {planes.map((plan) => (
            <div
              key={plan.id}
              className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 transition-all duration-200 hover:border-primary-300 hover:shadow-lg"
            >
              {/* Plan name */}
              <h3 className="text-lg font-bold text-neutral-900">{plan.nombre}</h3>

              {/* Price */}
              <div className="mt-3">
                <span className="text-3xl font-bold text-primary-600">
                  {formatCurrency(plan.precio)}
                </span>
                <span className="text-sm text-neutral-500">/mes</span>
              </div>

              {/* Description */}
              {plan.descripcion && (
                <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
                  {plan.descripcion}
                </p>
              )}

              {/* Features */}
              <ul className="mt-4 space-y-2 flex-1">
                <li className="flex items-center gap-2 text-sm text-neutral-700">
                  <CheckIcon className="h-4 w-4 text-primary-500 shrink-0" />
                  {plan.duracion_dias} días de duración
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-700">
                  <CheckIcon className="h-4 w-4 text-primary-500 shrink-0" />
                  Hasta {plan.max_actividades} actividad{plan.max_actividades > 1 ? "es" : ""}
                </li>
              </ul>

              {/* WhatsApp CTA */}
              <a
                href={buildWhatsAppUrl(plan, nombreCompleto)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1da851]"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Contratar por WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors related to Planes.tsx.

- [ ] **Step 3: Commit new Planes page**

```bash
git add frontend/src/pages/alumno/Planes.tsx
git commit -m "feat: add alumno Planes page with WhatsApp CTA

Shows available plans as cards with price, description, and
features. Each card has a WhatsApp redirect button that opens
a pre-filled message with plan details and student name."
```

---

### Task 5: Create alumno MisClases page (fuse Actividades + Inscripciones)

**Files:**
- Create: `frontend/src/pages/alumno/MisClases.tsx`
- Delete: `frontend/src/pages/alumno/Actividades.tsx`
- Delete: `frontend/src/pages/alumno/Inscripciones.tsx`

- [ ] **Step 1: Read current Actividades.tsx and Inscripciones.tsx fully**

Read both files completely to understand all state, effects, handlers, and JSX before writing the merged version.

- [ ] **Step 2: Create `frontend/src/pages/alumno/MisClases.tsx`**

This page has two sections:
1. **Mis clases inscriptas** — shows enrolled classes with cancel button
2. **Clases disponibles** — shows available classes with enroll button, filterable by day

The page combines the data-fetching and handlers from both Actividades.tsx and Inscripciones.tsx into a single component. Use the existing API methods: `actividadesAlumno.list()`, `turnosAlumno.list()`, `inscripciones.list()`, `inscripciones.crear()`, `inscripciones.cancelar()`.

Key elements to merge:
- From Actividades: activity list, turno detail fetch, day filter, inscribirse handler
- From Inscripciones: inscription list, cancel handler, status badges
- Layout: section header "Mis clases inscriptas" on top, "Clases disponibles" below with day filter chips

The full code should be written when implementing — read both source files first and merge the logic. Target ~400 lines (vs 303+313=616 current).

- [ ] **Step 3: Delete old pages**

```bash
rm frontend/src/pages/alumno/Actividades.tsx
rm frontend/src/pages/alumno/Inscripciones.tsx
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: fuse Actividades + Inscripciones into MisClases page

Single page showing enrolled classes (with cancel) and available
classes (with enroll), replacing two separate pages."
```

---

### Task 6: Update App.tsx routes

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update imports**

Remove:
```typescript
import AlumnoActividades from "./pages/alumno/Actividades";
import AlumnoInscripciones from "./pages/alumno/Inscripciones";
import AlumnoPagos from "./pages/alumno/Pagos";
import Notificaciones from "./pages/admin/Notificaciones";
import Reportes from "./pages/admin/Reportes";
```

Add:
```typescript
import AlumnoMisClases from "./pages/alumno/MisClases";
import AlumnoPlanes from "./pages/alumno/Planes";
```

- [ ] **Step 2: Update alumno routes**

Replace:
```tsx
<Route path="alumno/actividades" element={<AlumnoActividades />} />
<Route path="alumno/inscripciones" element={<AlumnoInscripciones />} />
<Route path="alumno/pagos" element={<AlumnoPagos />} />
```

With:
```tsx
<Route path="alumno/clases" element={<AlumnoMisClases />} />
<Route path="alumno/planes" element={<AlumnoPlanes />} />
```

- [ ] **Step 3: Remove deleted routes**

Remove:
```tsx
<Route path="reportes" element={<Reportes />} />
```

Remove from admin routes:
```tsx
<Route path="admin/ejercicios" element={<AdminEjercicios />} />
```

Remove from profesor routes:
```tsx
<Route path="profesor/ejercicios" element={<AdminEjercicios />} />
```

If `AdminEjercicios` import is no longer used, remove its import too.

Remove shared notificaciones route:
```tsx
<Route path="notificaciones" element={<Notificaciones />} />
```

- [ ] **Step 4: Verify no unused imports remain**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "refactor: update routes for simplified navigation

Replace actividades/inscripciones/pagos with clases/planes.
Remove reportes, notificaciones, and standalone ejercicios routes."
```

---

### Task 7: Update MainLayout.tsx navigation

**Files:**
- Modify: `frontend/src/layouts/MainLayout.tsx` (lines 13-44)

- [ ] **Step 1: Update NAV_ITEMS — remove Notificaciones**

```typescript
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: DashboardIcon },
];
```

- [ ] **Step 2: Update ALUMNO_NAV_ITEMS — simplified**

```typescript
const ALUMNO_NAV_ITEMS: NavItem[] = [
  { to: "/alumno/dashboard", label: "Mi Panel", icon: DashboardIcon, section: "alumno" },
  { to: "/alumno/clases", label: "Mis Clases", icon: CalendarIcon, section: "alumno" },
  { to: "/alumno/planes", label: "Planes", icon: PlanIcon, section: "alumno" },
  { to: "/alumno/rutinas", label: "Mi Rutina", icon: ClipboardDocIcon, section: "alumno" },
  { to: "/alumno/perfil", label: "Mi Perfil", icon: UserProfileIcon, section: "alumno" },
];
```

- [ ] **Step 3: Update PROFESOR_NAV_ITEMS — rename Turnos, remove Ejercicios**

```typescript
const PROFESOR_NAV_ITEMS: NavItem[] = [
  { to: "/profesor/dashboard", label: "Mi Panel", icon: DashboardIcon, section: "profesor" },
  { to: "/profesor/turnos", label: "Mis Clases", icon: CalendarIcon, section: "profesor" },
  { to: "/profesor/asistencia", label: "Asistencia", icon: CheckCircleIcon, section: "profesor" },
  { to: "/profesor/evaluaciones", label: "Evaluaciones", icon: ClipboardDocIcon, section: "profesor" },
  { to: "/profesor/rutinas", label: "Rutinas", icon: ClipboardDocIcon, section: "profesor" },
];
```

- [ ] **Step 4: Update ADMIN_NAV_ITEMS — remove Ejercicios and Reportes**

```typescript
const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "Mi Panel", icon: DashboardIcon, adminOnly: true, section: "admin" },
  { to: "/admin/usuarios", label: "Usuarios", icon: AdminUsersIcon, adminOnly: true, section: "admin" },
  { to: "/admin/actividades", label: "Actividades", icon: ActivityIcon, adminOnly: true, section: "admin" },
  { to: "/admin/turnos", label: "Turnos", icon: CalendarIcon, adminOnly: true, section: "admin" },
  { to: "/admin/planes", label: "Planes", icon: PlanIcon, adminOnly: true, section: "admin" },
  { to: "/admin/rutinas", label: "Rutinas", icon: ClipboardDocIcon, adminOnly: true, section: "admin" },
];
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layouts/MainLayout.tsx
git commit -m "refactor: simplify navigation for all roles

Alumno: 4 items (Panel, Clases, Planes, Rutina, Perfil).
Profesor: 5 items (Panel, Clases, Asistencia, Evaluaciones, Rutinas).
Admin: 6 items (Panel, Usuarios, Actividades, Turnos, Planes, Rutinas)."
```

---

### Task 8: Update admin Dashboard — remove payment stats

**Files:**
- Modify: `frontend/src/pages/admin/Dashboard.tsx`

- [ ] **Step 1: Remove payment stat cards**

Remove from "Primary stats" grid the `Ingresos del mes` StatCard (lines 86-90).

Remove from "Secondary stats" grid the `Pagos pendientes` (lines 95-99) and `Pagos vencidos` (lines 100-104) StatCards.

Remove the `formatCurrency` function (lines 8-14) if no longer used.

- [ ] **Step 2: Remove "Ver Reportes" quick action**

Remove the QuickAction for Reportes (lines 148-152) and its ChartIcon.

- [ ] **Step 3: Update DashboardStats usage**

The component references `data?.alumnos_activos` but we removed that field. Remove the "Alumnos activos" StatCard or replace it with a different stat. Replace with:

Primary stats grid:
```tsx
<StatCard label="Total alumnos" value={data?.total_alumnos ?? 0} color="default" />
<StatCard label="Total profesores" value={data?.total_profesores ?? 0} color="primary" />
<StatCard label="Turnos hoy" value={data?.turnos_hoy ?? 0} color="accent" />
<StatCard label="Inscripciones activas" value={data?.inscripciones_activas ?? 0} color="primary" />
```

Remove the entire secondary stats grid (lines 93-115), since we only have 4 stats now.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/Dashboard.tsx
git commit -m "refactor: remove payment stats from admin dashboard

Show only: total alumnos, profesores, turnos hoy, inscripciones activas.
Remove payment KPIs and reportes quick action."
```

---

### Task 9: Update admin Planes page — remove precio_suscripcion

**Files:**
- Modify: `frontend/src/pages/admin/Planes.tsx`

- [ ] **Step 1: Read the full Planes.tsx**

Read the complete file to find all references to `precio_suscripcion`.

- [ ] **Step 2: Remove precio_suscripcion from the form and table**

In `emptyForm` constant, remove `precio_suscripcion: null`.

In the form JSX, remove the input field for `precio_suscripcion`.

In the table columns definition, remove the `precio_suscripcion` column.

In any place where the form state is set from an existing plan (edit mode), remove `precio_suscripcion`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/Planes.tsx
git commit -m "refactor: remove precio_suscripcion from admin Planes page

No more subscription pricing — only single price per plan."
```

---

### Task 10: Clean up — delete unused frontend files

**Files:**
- Delete: `frontend/src/pages/admin/Notificaciones.tsx` (if notificaciones route was removed)
- Delete: `frontend/src/pages/admin/Ejercicios.tsx` (if ejercicios routes were removed)

- [ ] **Step 1: Verify these files are no longer imported anywhere**

```bash
cd frontend && grep -r "Notificaciones" src/ --include="*.tsx" --include="*.ts" -l
cd frontend && grep -r "admin/Ejercicios" src/ --include="*.tsx" --include="*.ts" -l
```

If they only appear in themselves (or nowhere), they're safe to delete.

- [ ] **Step 2: Delete unused files**

```bash
rm frontend/src/pages/admin/Notificaciones.tsx
rm frontend/src/pages/admin/Ejercicios.tsx
```

Note: Only delete if confirmed unused in step 1. If the admin Ejercicios component is still referenced by admin/Rutinas page (for exercise management within routines), keep it and only remove the standalone route.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused Notificaciones and Ejercicios pages"
```

---

### Task 11: Full verification

**Files:** None (verification only)

- [ ] **Step 1: Run backend tests**

```bash
pytest app/tests/ -v --tb=short
```

Expected: All remaining tests pass.

- [ ] **Step 2: Check frontend TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run frontend build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Manual smoke test**

```bash
cd .. && uvicorn app.main:app --port 8000 &
cd frontend && npm run dev &
```

Check in browser:
- Login as alumno → verify "Mis Clases" and "Planes" pages load
- Verify WhatsApp button opens correct link with plan details
- Login as admin → verify dashboard shows 4 stats (no payment stats)
- Verify admin Planes page has no precio_suscripcion field
- Verify profesor nav shows "Mis Clases" instead of "Mis Turnos"

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
