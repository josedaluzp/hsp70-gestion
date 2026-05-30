# Admin Metrics Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir el dashboard admin con métricas reales (altas, bajas, en pausa, morosos, horarios pico, retención), arreglando el contrato roto de `/stats/dashboard`, e incorporar el flag "en pausa" marcable por el profesor.

**Architecture:** Endpoints de stats con queries en TypeScript (patrón `_handlers` + `adminClient`), agregación en TS, tests con vitest mockeando `adminClient`. El dashboard admin se reescribe contra contratos que el plan controla (listas embebidas en la respuesta para evitar los desajustes de shape preexistentes). El flag `en_pausa` se agrega con columna + endpoint (profesor+admin) + checkbox en la vista Asistencia (arreglando de paso la carga de esa página).

**Tech Stack:** Vercel serverless, Supabase (Postgres), React 19 + TS + Vite + Tailwind 4, Recharts, Vitest.

**Spec:** `docs/planes/2026-05-29-admin-dashboard-design.md`
**Branch/worktree:** `feat/admin-dashboard` en `.worktrees/admin-dashboard`

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---------|-----------------|--------|
| `frontend/supabase/migrations/012_metricas.sql` | `en_pausa`, `baja_at` | Crear (T1) |
| `frontend/api/_handlers/usuarios/id/pausa.ts` | Toggle `en_pausa` (profesor+admin) | Crear (T2) |
| `frontend/api/_handlers/usuarios/id/toggle-activo.ts` | Setear/limpiar `baja_at` | Modificar (T2) |
| `frontend/api/_handlers/stats/dashboard.ts` | Contadores + semanal + listas | Reescribir (T3) |
| `frontend/api/_handlers/stats/horarios-pico.ts` | Asistencia por día×hora | Crear (T4) |
| `frontend/api/_handlers/stats/retencion.ts` | Mensual altas/bajas/asistentes | Crear (T5) |
| `frontend/api/[...path].ts` | Registrar rutas nuevas | Modificar (T6) |
| `frontend/src/services/adminApi.ts` | Tipos + fns de stats | Modificar (T7) |
| `frontend/src/services/profesorApi.ts` | `pausa.toggle` + en_pausa en inscritos | Modificar (T7) |
| `frontend/src/pages/admin/Dashboard.tsx` | Reescritura del dashboard | Reescribir (T8) |
| `frontend/src/pages/profesor/Asistencia.tsx` | Fix carga + checkbox en pausa | Modificar (T9) |
| `frontend/api/_handlers/turnos/id/inscritos.ts` | Incluir `en_pausa` | Modificar (T9) |
| `ARCHITECTURE.md`, `docs/PLAN.md` | Doc + deuda | Modificar (T10) |

> **Nota de testing:** las tareas de backend (T2–T5) se hacen con TDD real (vitest, `environment: node`). El frontend (T7–T9) se verifica con `npm run build` (no hay infra de tests de componentes; desviación consistente con el proyecto). T1 (SQL) y la aplicación de la migración en Supabase son pasos manuales del humano.

---

### Task 1: Migración SQL `012_metricas.sql`

**Files:**
- Create: `frontend/supabase/migrations/012_metricas.sql`

- [ ] **Step 1: Crear la migración**

Crear `frontend/supabase/migrations/012_metricas.sql`:

```sql
-- 012_metricas.sql — Flag de pausa (inactivo) y marca temporal de baja

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS en_pausa boolean NOT NULL DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS baja_at timestamptz;
```

- [ ] **Step 2: Verificar y commitear** (la aplicación en Supabase la hace el humano)

Run (desde la raíz del worktree): `rg -c "en_pausa|baja_at" frontend/supabase/migrations/012_metricas.sql`
Expected: `2`

```bash
git add frontend/supabase/migrations/012_metricas.sql
git commit -m "feat(metricas): add en_pausa and baja_at columns migration"
```

---

### Task 2: Endpoint pausa + baja_at en toggle-activo (TDD)

**Files:**
- Create: `frontend/api/_handlers/usuarios/id/pausa.ts`
- Modify: `frontend/api/_handlers/usuarios/id/toggle-activo.ts`
- Test: `frontend/api/_handlers/usuarios/id/__tests__/pausa.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `frontend/api/_handlers/usuarios/id/__tests__/pausa.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../_lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('../../../_lib/supabase', () => ({
  adminClient: { from: vi.fn() },
}))

import { requireRole } from '../../../_lib/auth'
import { adminClient } from '../../../_lib/supabase'
import handler from '../pausa'

function mockRes() {
  const res: any = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}
const mockReq = (id: string, method = 'POST') => ({ method, query: { id } } as any)

describe('POST /usuarios/:id/pausa', () => {
  beforeEach(() => vi.clearAllMocks())

  it('toggles en_pausa and returns the updated user', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'p1', rol: 'profesor', activo: true } as any)
    // first from(): read current en_pausa
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { en_pausa: false }, error: null }) }) }),
    } as any)
    // second from(): update
    vi.mocked(adminClient.from).mockReturnValueOnce({
      update: () => ({ eq: () => ({ select: () => ({ single: () =>
        Promise.resolve({ data: { id: 'a1', en_pausa: true }, error: null }) }) }) }),
    } as any)
    const res = mockRes()
    await handler(mockReq('a1'), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ id: 'a1', en_pausa: true })
  })

  it('returns early (no body) when requireRole denies (alumno)', async () => {
    // requireRole already wrote the 403 and returned null
    vi.mocked(requireRole).mockResolvedValue(null as any)
    const res = mockRes()
    await handler(mockReq('a1'), res)
    // handler must not attempt any DB work
    expect(adminClient.from).not.toHaveBeenCalled()
  })

  it('405 on non-POST', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'p1', rol: 'admin', activo: true } as any)
    const res = mockRes()
    await handler(mockReq('a1', 'GET'), res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run (desde `frontend/`): `npx vitest run api/_handlers/usuarios/id/__tests__/pausa.test.ts`
Expected: FAIL — `Cannot find module '../pausa'`.

- [ ] **Step 3: Implementar `pausa.ts`**

Crear `frontend/api/_handlers/usuarios/id/pausa.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../../_lib/supabase'
import { requireRole } from '../../../_lib/auth'
import { notFound } from '../../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor'])
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data: current } = await adminClient
    .from('usuarios').select('en_pausa').eq('id', id).single()
  if (!current) return notFound(res)

  const { data, error } = await adminClient
    .from('usuarios')
    .update({ en_pausa: !current.en_pausa })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
```

- [ ] **Step 4: Modificar `toggle-activo.ts` para setear `baja_at`**

En `frontend/api/_handlers/usuarios/id/toggle-activo.ts`, reemplazar el bloque del
update (líneas del `.update({ activo: !current.activo })`) por una versión que
calcula el nuevo estado y setea `baja_at`:

```ts
  const nuevoActivo = !current.activo

  const { data, error } = await adminClient
    .from('usuarios')
    .update({ activo: nuevoActivo, baja_at: nuevoActivo ? null : new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
```

(El resto del archivo —imports, `requireRole(['admin'])`, lectura de `current`,
manejo de error— queda igual.)

- [ ] **Step 5: Correr el test y verificar que pasa**

Run (desde `frontend/`): `npx vitest run api/_handlers/usuarios/id/__tests__/pausa.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/api/_handlers/usuarios/id/pausa.ts frontend/api/_handlers/usuarios/id/toggle-activo.ts frontend/api/_handlers/usuarios/id/__tests__/pausa.test.ts
git commit -m "feat(metricas): add pausa toggle endpoint and baja_at on deactivate"
```

---

### Task 3: `/stats/dashboard` reescrito (contadores + semanal + listas) (TDD)

**Files:**
- Modify: `frontend/api/_handlers/stats/dashboard.ts` (reescritura)
- Test: `frontend/api/_handlers/stats/__tests__/dashboard.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `frontend/api/_handlers/stats/__tests__/dashboard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../_lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('../../_lib/supabase', () => ({ adminClient: { from: vi.fn() } }))

import { requireRole } from '../../_lib/auth'
import { adminClient } from '../../_lib/supabase'
import handler from '../dashboard'

function mockRes() {
  const res: any = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

// Each call to adminClient.from(...) returns a builder. We queue results in order.
function queueFrom(results: Array<{ data: any; count?: number | null }>) {
  let i = 0
  vi.mocked(adminClient.from).mockImplementation(() => {
    const result = results[i++] ?? { data: [], count: 0 }
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      gte: () => builder,
      lt: () => builder,
      not: () => builder,
      then: (resolve: any) => resolve({ data: result.data ?? [], count: result.count ?? null, error: null }),
    }
    return builder
  })
}

describe('GET /stats/dashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('403 path: requireRole denies -> handler does nothing', async () => {
    vi.mocked(requireRole).mockResolvedValue(null as any)
    const res = mockRes()
    await handler({ method: 'GET', query: {} } as any, res)
    expect(adminClient.from).not.toHaveBeenCalled()
  })

  it('returns snake_case stats with counts and lists', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'x', rol: 'admin', activo: true } as any)
    // The handler issues count queries (return {count}) and list queries (return {data}).
    // Order must match the handler implementation (see Step 3).
    queueFrom([
      { data: null, count: 10 },  // total_alumnos (activos)
      { data: null, count: 3 },   // total_profesores
      { data: null, count: 5 },   // total_actividades
      { data: null, count: 2 },   // turnos_hoy
      { data: null, count: 8 },   // inscripciones_activas
      { data: [{ fecha: '2026-05-20', presente: true }, { fecha: '2026-05-20', presente: false }] }, // asistencias 7d
      { data: [{ id: 'u1', nombre: 'Ana', apellido: 'P', email: 'a@x.com' }] },  // altas_lista
      { data: [{ id: 'u2', nombre: 'Bob', apellido: 'Q', email: 'b@x.com' }] },  // bajas_lista
      { data: [] },  // en_pausa_lista
      { data: [{ id: 'u3', nombre: 'Cyn', apellido: 'R', email: 'c@x.com' }] },  // morosos_lista
    ])
    const res = mockRes()
    await handler({ method: 'GET', query: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const body = (res.json as any).mock.calls[0][0]
    expect(body.total_alumnos).toBe(10)
    expect(body.total_profesores).toBe(3)
    expect(body.total_actividades).toBe(5)
    expect(body.turnos_hoy).toBe(2)
    expect(body.inscripciones_activas).toBe(8)
    expect(body.altas_30d).toBe(1)
    expect(body.bajas).toBe(1)
    expect(body.en_pausa).toBe(0)
    expect(body.morosos).toBe(1)
    expect(Array.isArray(body.asistencia_semanal)).toBe(true)
    expect(body.altas_lista[0].nombre).toBe('Ana')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run (desde `frontend/`): `npx vitest run api/_handlers/stats/__tests__/dashboard.test.ts`
Expected: FAIL (la implementación actual devuelve camelCase y otro shape).

- [ ] **Step 3: Reescribir `dashboard.ts`**

Reemplazar TODO el contenido de `frontend/api/_handlers/stats/dashboard.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function isoDateDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const hoy = DIAS[new Date().getDay()]
  const desde30 = isoDaysAgo(30)
  const desde7 = isoDateDaysAgo(7)

  const LIST_LIMIT = 50
  const mini = 'id, nombre, apellido, email'

  // Counts (head:true → solo count)
  const [
    rAlumnos, rProfes, rActs, rTurnosHoy, rInscr,
    rAsist, rAltas, rBajas, rPausa, rMorosos,
  ] = await Promise.all([
    adminClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'alumno').eq('activo', true),
    adminClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'profesor'),
    adminClient.from('actividades').select('*', { count: 'exact', head: true }).eq('activa', true),
    adminClient.from('turnos').select('*', { count: 'exact', head: true }).eq('activo', true).eq('dia_semana', hoy),
    adminClient.from('inscripciones').select('*', { count: 'exact', head: true }).eq('estado', 'activa'),
    adminClient.from('asistencias').select('fecha, presente').gte('fecha', desde7),
    adminClient.from('usuarios').select(mini).eq('rol', 'alumno').gte('created_at', desde30).order('created_at', { ascending: false }).limit(LIST_LIMIT),
    adminClient.from('usuarios').select(mini).eq('rol', 'alumno').eq('activo', false).order('baja_at', { ascending: false }).limit(LIST_LIMIT),
    adminClient.from('usuarios').select(mini).eq('rol', 'alumno').eq('en_pausa', true).limit(LIST_LIMIT),
    adminClient.from('usuarios').select(mini).eq('rol', 'alumno').eq('activo', true).eq('creditos', 0).limit(LIST_LIMIT),
  ])

  // Weekly attendance: presentes/ausentes por fecha
  const semanaMap = new Map<string, { presentes: number; ausentes: number }>()
  for (const row of (rAsist.data ?? []) as { fecha: string; presente: boolean }[]) {
    const cur = semanaMap.get(row.fecha) ?? { presentes: 0, ausentes: 0 }
    if (row.presente) cur.presentes++
    else cur.ausentes++
    semanaMap.set(row.fecha, cur)
  }
  const asistencia_semanal = [...semanaMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, v]) => ({ fecha, presentes: v.presentes, ausentes: v.ausentes }))

  return res.status(200).json({
    total_alumnos: rAlumnos.count ?? 0,
    total_profesores: rProfes.count ?? 0,
    total_actividades: rActs.count ?? 0,
    turnos_hoy: rTurnosHoy.count ?? 0,
    inscripciones_activas: rInscr.count ?? 0,
    asistencia_semanal,
    altas_30d: (rAltas.data ?? []).length,
    bajas: (rBajas.data ?? []).length,
    en_pausa: (rPausa.data ?? []).length,
    morosos: (rMorosos.data ?? []).length,
    altas_lista: rAltas.data ?? [],
    bajas_lista: rBajas.data ?? [],
    en_pausa_lista: rPausa.data ?? [],
    morosos_lista: rMorosos.data ?? [],
  })
}
```

> Nota: los contadores de altas/bajas/en_pausa/morosos se derivan del `length` de
> la lista (capada a 50). Para este sistema (decenas de alumnos) es exacto; si
> creciera por encima de 50 habría que separar count de lista. Documentado como
> límite conocido.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run (desde `frontend/`): `npx vitest run api/_handlers/stats/__tests__/dashboard.test.ts`
Expected: PASS (2 tests).

> Si el test falla porque el orden de los resultados encolados no coincide con el
> orden de las queries en `Promise.all`, ajustar el orden en `queueFrom([...])`
> del test para que matchee la implementación (counts primero en el orden de arriba,
> luego asistencias, luego las 4 listas). No cambiar la implementación por esto.

- [ ] **Step 5: Commit**

```bash
git add frontend/api/_handlers/stats/dashboard.ts frontend/api/_handlers/stats/__tests__/dashboard.test.ts
git commit -m "feat(stats): rewrite dashboard endpoint with correct contract and lists"
```

---

### Task 4: `/stats/horarios-pico` (TDD)

**Files:**
- Create: `frontend/api/_handlers/stats/horarios-pico.ts`
- Test: `frontend/api/_handlers/stats/__tests__/horarios-pico.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `frontend/api/_handlers/stats/__tests__/horarios-pico.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../_lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('../../_lib/supabase', () => ({ adminClient: { from: vi.fn() } }))

import { requireRole } from '../../_lib/auth'
import { adminClient } from '../../_lib/supabase'
import handler from '../horarios-pico'

function mockRes() {
  const res: any = {}
  res.status = vi.fn(() => res); res.json = vi.fn(() => res)
  return res
}

function fromReturns(data: any) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    then: (resolve: any) => resolve({ data, error: null }),
  }
  vi.mocked(adminClient.from).mockReturnValue(builder)
}

describe('GET /stats/horarios-pico', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aggregates presentes by dia_semana x hour', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'x', rol: 'admin', activo: true } as any)
    fromReturns([
      { inscripcion: { turno: { dia_semana: 'lunes', hora_inicio: '08:30:00' } } },
      { inscripcion: { turno: { dia_semana: 'lunes', hora_inicio: '08:00:00' } } },
      { inscripcion: { turno: { dia_semana: 'martes', hora_inicio: '18:15:00' } } },
    ])
    const res = mockRes()
    await handler({ method: 'GET', query: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const body = (res.json as any).mock.calls[0][0]
    const lunes8 = body.celdas.find((c: any) => c.dia === 'lunes' && c.hora === 8)
    expect(lunes8.total).toBe(2)
    const martes18 = body.celdas.find((c: any) => c.dia === 'martes' && c.hora === 18)
    expect(martes18.total).toBe(1)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run (desde `frontend/`): `npx vitest run api/_handlers/stats/__tests__/horarios-pico.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `horarios-pico.ts`**

Crear `frontend/api/_handlers/stats/horarios-pico.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data, error } = await adminClient
    .from('asistencias')
    .select(`
      inscripcion:inscripciones!asistencias_inscripcion_id_fkey(
        turno:turnos!inscripciones_turno_id_fkey(dia_semana, hora_inicio)
      )
    `)
    .eq('presente', true)

  if (error) return res.status(500).json({ error: error.message })

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as any[]) {
    const turno = row?.inscripcion?.turno
    if (!turno?.dia_semana || !turno?.hora_inicio) continue
    const hora = parseInt(String(turno.hora_inicio).slice(0, 2), 10)
    const key = `${turno.dia_semana}|${hora}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const celdas = [...counts.entries()].map(([key, total]) => {
    const [dia, hora] = key.split('|')
    return { dia, hora: Number(hora), total }
  })

  return res.status(200).json({ celdas })
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run (desde `frontend/`): `npx vitest run api/_handlers/stats/__tests__/horarios-pico.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/api/_handlers/stats/horarios-pico.ts frontend/api/_handlers/stats/__tests__/horarios-pico.test.ts
git commit -m "feat(stats): add horarios-pico endpoint"
```

---

### Task 5: `/stats/retencion` (TDD)

**Files:**
- Create: `frontend/api/_handlers/stats/retencion.ts`
- Test: `frontend/api/_handlers/stats/__tests__/retencion.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `frontend/api/_handlers/stats/__tests__/retencion.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../_lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('../../_lib/supabase', () => ({ adminClient: { from: vi.fn() } }))

import { requireRole } from '../../_lib/auth'
import { adminClient } from '../../_lib/supabase'
import handler from '../retencion'

function mockRes() {
  const res: any = {}
  res.status = vi.fn(() => res); res.json = vi.fn(() => res)
  return res
}
function queueFrom(results: any[]) {
  let i = 0
  vi.mocked(adminClient.from).mockImplementation(() => {
    const data = results[i++] ?? []
    const builder: any = {
      select: () => builder, eq: () => builder, gte: () => builder, not: () => builder,
      then: (resolve: any) => resolve({ data, error: null }),
    }
    return builder
  })
}

describe('GET /stats/retencion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('buckets altas, bajas and unique attendees by month', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'x', rol: 'admin', activo: true } as any)
    queueFrom([
      [{ created_at: '2026-05-10T00:00:00Z' }, { created_at: '2026-05-15T00:00:00Z' }], // altas
      [{ baja_at: '2026-05-20T00:00:00Z' }],                                            // bajas
      [{ fecha: '2026-05-02', inscripcion: { alumno_id: 'a1' } },                        // asistencias
       { fecha: '2026-05-03', inscripcion: { alumno_id: 'a1' } },
       { fecha: '2026-05-04', inscripcion: { alumno_id: 'a2' } }],
    ])
    const res = mockRes()
    await handler({ method: 'GET', query: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const body = (res.json as any).mock.calls[0][0]
    const mayo = body.meses.find((m: any) => m.mes === '2026-05')
    expect(mayo.altas).toBe(2)
    expect(mayo.bajas).toBe(1)
    expect(mayo.asistentes_unicos).toBe(2) // a1, a2
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run (desde `frontend/`): `npx vitest run api/_handlers/stats/__tests__/retencion.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `retencion.ts`**

Crear `frontend/api/_handlers/stats/retencion.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

function monthKey(iso: string): string {
  return iso.slice(0, 7) // YYYY-MM
}

function isoMonthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  d.setDate(1)
  return d.toISOString()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const desde = isoMonthsAgo(5) // ventana de 6 meses (mes actual + 5)

  const [rAltas, rBajas, rAsist] = await Promise.all([
    adminClient.from('usuarios').select('created_at').eq('rol', 'alumno').gte('created_at', desde),
    adminClient.from('usuarios').select('baja_at').eq('rol', 'alumno').not('baja_at', 'is', null).gte('baja_at', desde),
    adminClient.from('asistencias').select(`
      fecha,
      inscripcion:inscripciones!asistencias_inscripcion_id_fkey(alumno_id)
    `).eq('presente', true).gte('fecha', desde.slice(0, 10)),
  ])

  const meses = new Map<string, { altas: number; bajas: number; asistentes: Set<string> }>()
  const bucket = (k: string) => {
    let m = meses.get(k)
    if (!m) { m = { altas: 0, bajas: 0, asistentes: new Set() }; meses.set(k, m) }
    return m
  }

  for (const r of (rAltas.data ?? []) as { created_at: string }[]) bucket(monthKey(r.created_at)).altas++
  for (const r of (rBajas.data ?? []) as { baja_at: string }[]) bucket(monthKey(r.baja_at)).bajas++
  for (const r of (rAsist.data ?? []) as any[]) {
    const alumno = r?.inscripcion?.alumno_id
    if (alumno) bucket(monthKey(r.fecha)).asistentes.add(alumno)
  }

  const result = [...meses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, altas: v.altas, bajas: v.bajas, asistentes_unicos: v.asistentes.size }))

  return res.status(200).json({ meses: result })
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run (desde `frontend/`): `npx vitest run api/_handlers/stats/__tests__/retencion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/api/_handlers/stats/retencion.ts frontend/api/_handlers/stats/__tests__/retencion.test.ts
git commit -m "feat(stats): add retencion endpoint"
```

---

### Task 6: Registrar rutas en el catch-all

**Files:**
- Modify: `frontend/api/[...path].ts`

- [ ] **Step 1: Agregar imports y rutas**

En `frontend/api/[...path].ts` (leer primero):
- Junto a `import statsDashboard ...`, agregar:
```ts
import statsHorariosPico from './_handlers/stats/horarios-pico'
import statsRetencion from './_handlers/stats/retencion'
import usuariosPausa from './_handlers/usuarios/id/pausa'
```
- En el bloque `// /api/stats`, agregar después de la línea de `stats/dashboard`:
```ts
    if (r0 === 'stats' && r1 === 'horarios-pico') return statsHorariosPico(req, res)
    if (r0 === 'stats' && r1 === 'retencion') return statsRetencion(req, res)
```
- En el bloque `// /api/usuarios`, agregar (junto a las otras rutas con `r2`):
```ts
    if (r0 === 'usuarios' && r1 && r2 === 'pausa') return usuariosPausa(injectId(req, r1), res)
```

- [ ] **Step 2: Verificar**

Run (desde `frontend/`): `rg "horarios-pico|statsRetencion|usuariosPausa" api/[...path].ts`
Expected: las 3 referencias aparecen (import + ruta).

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores nuevos por estos imports.

- [ ] **Step 3: Commit**

```bash
git add "frontend/api/[...path].ts"
git commit -m "feat(stats): register horarios-pico, retencion and pausa routes"
```

---

### Task 7: Servicios frontend (adminApi stats + profesorApi pausa)

**Files:**
- Modify: `frontend/src/services/adminApi.ts`
- Modify: `frontend/src/services/profesorApi.ts`

- [ ] **Step 1: Ampliar tipos y fns de stats en `adminApi.ts`**

En `frontend/src/services/adminApi.ts`, reemplazar la sección `// ─── Stats ───`
(la interfaz `DashboardStats` y el objeto `stats`) por:

```ts
// ─── Stats ──────────────────────────────────────────────────────────────────

export interface AttendanceDay {
  fecha: string;
  presentes: number;
  ausentes: number;
}

export interface UsuarioMini {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

export interface DashboardStats {
  total_alumnos: number;
  total_profesores: number;
  total_actividades: number;
  turnos_hoy: number;
  inscripciones_activas: number;
  asistencia_semanal: AttendanceDay[];
  altas_30d: number;
  bajas: number;
  en_pausa: number;
  morosos: number;
  altas_lista: UsuarioMini[];
  bajas_lista: UsuarioMini[];
  en_pausa_lista: UsuarioMini[];
  morosos_lista: UsuarioMini[];
}

export interface HorarioCelda {
  dia: string;
  hora: number;
  total: number;
}

export interface RetencionMes {
  mes: string;
  altas: number;
  bajas: number;
  asistentes_unicos: number;
}

export const stats = {
  dashboard: () => api.get<DashboardStats>("/stats/dashboard"),
  horariosPico: () => api.get<{ celdas: HorarioCelda[] }>("/stats/horarios-pico"),
  retencion: () => api.get<{ meses: RetencionMes[] }>("/stats/retencion"),
};
```

- [ ] **Step 2: Agregar `pausa` y `en_pausa` en `profesorApi.ts`**

En `frontend/src/services/profesorApi.ts`:
- En `InscripcionDetail`, agregar el campo: `en_pausa?: boolean;`
- Al final del archivo, agregar:
```ts
// ─── Pausa (inactivo temporal) ───────────────────────────────────────────────

export const pausa = {
  toggle: (alumnoId: string) =>
    api.post<{ id: string; en_pausa: boolean }>(`/usuarios/${alumnoId}/pausa`),
};
```

- [ ] **Step 3: Verificar typecheck**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores en `adminApi.ts` / `profesorApi.ts`. (Puede haber errores en
`admin/Dashboard.tsx` / `profesor/Asistencia.tsx` que aún usan la API vieja — se
arreglan en T8/T9.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/adminApi.ts frontend/src/services/profesorApi.ts
git commit -m "feat(stats): add stats and pausa service methods"
```

---

### Task 8: Reescribir el dashboard admin

**Files:**
- Modify: `frontend/src/pages/admin/Dashboard.tsx` (reescritura del componente)

- [ ] **Step 1: Reescribir `Dashboard.tsx`**

Reemplazar TODO el contenido de `frontend/src/pages/admin/Dashboard.tsx` con el
siguiente componente (tema claro "amp", Recharts; tarjetas base + tarjetas de
estado con listas expandibles + asistencia semanal + heatmap + retención):

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Spinner } from "../../components/ui";
import { stats } from "../../services/adminApi";
import type {
  DashboardStats,
  UsuarioMini,
  HorarioCelda,
  RetencionMes,
} from "../../services/adminApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DIAS_LABEL: Record<string, string> = {
  lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue",
  viernes: "Vie", sabado: "Sáb", domingo: "Dom",
};
const HORAS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 a 22:00

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardStats | null>(null);
  const [horarios, setHorarios] = useState<HorarioCelda[]>([]);
  const [retencion, setRetencion] = useState<RetencionMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [d, h, r] = await Promise.all([
          stats.dashboard(),
          stats.horariosPico(),
          stats.retencion(),
        ]);
        setData(d.data);
        setHorarios(h.data.celdas);
        setRetencion(r.data.meses);
      } catch {
        setError("No se pudieron cargar los datos. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function verUsuario(u: UsuarioMini) {
    navigate(`/admin/usuarios?search=${encodeURIComponent(u.email)}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-600">
        {error ?? "Sin datos"}
      </div>
    );
  }

  const baseCards = [
    { label: "Alumnos activos", value: data.total_alumnos },
    { label: "Profesores", value: data.total_profesores },
    { label: "Actividades", value: data.total_actividades },
    { label: "Turnos hoy", value: data.turnos_hoy },
    { label: "Inscripciones activas", value: data.inscripciones_activas },
  ];

  const statusCards = [
    { key: "altas", label: "Altas (30 días)", value: data.altas_30d, lista: data.altas_lista, tone: "success" as const },
    { key: "bajas", label: "Bajas", value: data.bajas, lista: data.bajas_lista, tone: "danger" as const },
    { key: "pausa", label: "En pausa", value: data.en_pausa, lista: data.en_pausa_lista, tone: "warning" as const },
    { key: "morosos", label: "Sin créditos", value: data.morosos, lista: data.morosos_lista, tone: "neutral" as const },
  ];

  const maxHeat = Math.max(1, ...horarios.map((c) => c.total));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-1">
          Panel de administración
        </p>
        <h1 className="text-3xl font-black uppercase tracking-wide text-neutral-900">
          Hola, {user?.nombre}
        </h1>
      </div>

      {/* Base cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {baseCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-black text-neutral-900">{c.value}</p>
            <p className="mt-1 text-xs font-semibold text-neutral-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Status cards with expandable lists */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((c) => (
          <StatusCard key={c.key} {...c} onVerUsuario={verUsuario} />
        ))}
      </div>

      {/* Weekly attendance */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-black uppercase tracking-wide text-neutral-900">
          Asistencia semanal
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.asistencia_semanal} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="fecha" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="presentes" name="Presentes" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="ausentes" name="Ausentes" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Peak hours heatmap */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 overflow-x-auto">
        <h2 className="mb-4 text-lg font-black uppercase tracking-wide text-neutral-900">
          Horarios pico
        </h2>
        <div className="min-w-[640px]">
          <div className="grid" style={{ gridTemplateColumns: `48px repeat(${HORAS.length}, 1fr)` }}>
            <div />
            {HORAS.map((h) => (
              <div key={h} className="text-center text-[10px] text-neutral-400 pb-1">{h}</div>
            ))}
            {DIAS.map((dia) => (
              <HeatRow key={dia} dia={dia} horarios={horarios} maxHeat={maxHeat} />
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-400">Asistencias registradas por día y hora de inicio del turno.</p>
        </div>
      </div>

      {/* Retention */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-black uppercase tracking-wide text-neutral-900">
          Evolución mensual
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={retencion} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="altas" name="Altas" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="bajas" name="Bajas" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="asistentes_unicos" name="Asistentes" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  success: "text-success-600",
  danger: "text-danger-600",
  warning: "text-warning-600",
  neutral: "text-neutral-700",
};

function StatusCard({
  label, value, lista, tone, onVerUsuario,
}: {
  label: string; value: number; lista: UsuarioMini[];
  tone: "success" | "danger" | "warning" | "neutral";
  onVerUsuario: (u: UsuarioMini) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left cursor-pointer"
      >
        <div>
          <p className={`text-2xl font-black ${TONE[tone]}`}>{value}</p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">{label}</p>
        </div>
        <span className="text-xs text-neutral-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3">
          {lista.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin registros.</p>
          ) : (
            lista.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onVerUsuario(u)}
                className="block w-full truncate text-left text-xs text-neutral-600 hover:text-primary-600 cursor-pointer"
              >
                {u.nombre} {u.apellido}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HeatRow({ dia, horarios, maxHeat }: { dia: string; horarios: HorarioCelda[]; maxHeat: number }) {
  return (
    <>
      <div className="flex items-center text-[11px] text-neutral-500 pr-2">{DIAS_LABEL[dia]}</div>
      {HORAS.map((h) => {
        const cell = horarios.find((c) => c.dia === dia && c.hora === h);
        const total = cell?.total ?? 0;
        const intensity = total === 0 ? 0 : 0.15 + 0.85 * (total / maxHeat);
        return (
          <div key={h} className="aspect-square m-[1px] rounded-sm" title={`${DIAS_LABEL[dia]} ${h}:00 — ${total}`}
            style={{ backgroundColor: total === 0 ? "#f1f5f9" : `rgba(249,115,22,${intensity})` }} />
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Verificar build**

Run (desde `frontend/`): `npm run build`
Expected: `tsc -b && vite build` sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/Dashboard.tsx
git commit -m "feat(stats): rebuild admin dashboard with metrics, heatmap and retention"
```

---

### Task 9: Profesor Asistencia — fix carga + checkbox "en pausa"

**Files:**
- Modify: `frontend/api/_handlers/turnos/id/inscritos.ts`
- Modify: `frontend/src/services/profesorApi.ts` (consumo del array crudo)
- Modify: `frontend/src/pages/profesor/Asistencia.tsx`

- [ ] **Step 1: Incluir `en_pausa` en el handler de inscritos**

En `frontend/api/_handlers/turnos/id/inscritos.ts`, ampliar el select del alumno
para incluir `en_pausa`:

```ts
  const { data, error } = await adminClient.from('inscripciones').select(`
    id, estado, fecha_inscripcion,
    alumno:usuarios!inscripciones_alumno_id_fkey(id, nombre, apellido, email, dni, en_pausa)
  `).eq('turno_id', id).eq('estado', 'activa').order('fecha_inscripcion')
```

- [ ] **Step 2: Adaptar el consumo en `Asistencia.tsx`**

El handler `/turnos/:id/inscritos` devuelve un **array crudo** de
`{ id, estado, fecha_inscripcion, alumno: { id, nombre, apellido, email, dni, en_pausa } }`,
y `/turnos/:id/asistencias` un **array crudo** de
`{ id, fecha, presente, observacion, inscripcion: { id, alumno: {...} } }`.
El código actual asume `.data.items` (roto). Reescribir el `useEffect` de carga de
asistencia (`loadAttendance`) y el tipo de fila para consumir los arrays reales y
trackear `enPausa`. Reemplazar la interfaz `AttendanceRow` y la función
`loadAttendance` por:

```tsx
interface AttendanceRow {
  inscripcionId: number;
  alumnoId: string;
  nombre: string;
  enPausa: boolean;
  presente: boolean;
  observacion: string;
  asistenciaId: number | null;
  dirty: boolean;
  pausaSaving: boolean;
}
```

```tsx
    async function loadAttendance() {
      setLoadingData(true);
      setError(null);
      setSaveMsg(null);
      try {
        const turnoId = Number(selectedTurno);
        const [inscRes, asistRes] = await Promise.all([
          inscritosApi.list(turnoId, { page_size: 100 }),
          asistenciasApi.listByTurno(turnoId, fecha),
        ]);

        const inscArray = (inscRes.data as any[]) ?? [];
        const asistArray = (asistRes.data as any[]) ?? [];

        const asistMap = new Map<number, { id: number; presente: boolean; observacion: string | null }>();
        for (const a of asistArray) {
          const inscId = a?.inscripcion?.id;
          if (inscId != null) asistMap.set(inscId, { id: a.id, presente: a.presente, observacion: a.observacion });
        }

        const newRows: AttendanceRow[] = inscArray
          .filter((i) => i.estado === "activa")
          .map((insc) => {
            const existing = asistMap.get(insc.id);
            const alumno = insc.alumno ?? {};
            return {
              inscripcionId: insc.id,
              alumnoId: alumno.id,
              nombre: alumno.nombre ? `${alumno.nombre} ${alumno.apellido ?? ""}`.trim() : `Alumno #${insc.id}`,
              enPausa: Boolean(alumno.en_pausa),
              presente: existing?.presente ?? false,
              observacion: existing?.observacion ?? "",
              asistenciaId: existing?.id ?? null,
              dirty: false,
              pausaSaving: false,
            };
          });

        newRows.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setRows(newRows);
      } catch {
        setError("No se pudo cargar la lista de asistencia.");
      } finally {
        setLoadingData(false);
      }
    }
```

Asimismo, en el `handleSave`, reemplazar el re-fetch que usa `.items` por el array
crudo:

```ts
      const turnoId = Number(selectedTurno);
      const asistRes = await asistenciasApi.listByTurno(turnoId, fecha);
      const asistMap = new Map<number, { id: number }>();
      for (const a of (asistRes.data as any[]) ?? []) {
        const inscId = a?.inscripcion?.id;
        if (inscId != null) asistMap.set(inscId, { id: a.id });
      }

      setRows((prev) =>
        prev.map((r) => {
          const updated = asistMap.get(r.inscripcionId);
          return { ...r, asistenciaId: updated?.id ?? r.asistenciaId, dirty: false };
        }),
      );
```

- [ ] **Step 3: Agregar el handler de toggle pausa y el checkbox en la fila**

En `Asistencia.tsx`:
- Importar `pausa` del servicio: en el import de `profesorApi`, agregar `pausa as pausaApi`.
- Agregar el handler (junto a `togglePresente`):

```tsx
  const togglePausa = useCallback(async (inscripcionId: number, alumnoId: string) => {
    setRows((prev) => prev.map((r) =>
      r.inscripcionId === inscripcionId ? { ...r, pausaSaving: true } : r));
    try {
      const res = await pausaApi.toggle(alumnoId);
      setRows((prev) => prev.map((r) =>
        r.inscripcionId === inscripcionId ? { ...r, enPausa: res.data.en_pausa, pausaSaving: false } : r));
    } catch {
      setRows((prev) => prev.map((r) =>
        r.inscripcionId === inscripcionId ? { ...r, pausaSaving: false } : r));
    }
  }, []);
```

- En el render de cada fila (`rows.map((row) => ...`), dentro del bloque de la
  fila, agregar un control "En pausa" después del `<label>` del nombre y antes del
  input de observación:

```tsx
                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={row.enPausa}
                    disabled={row.pausaSaving}
                    onChange={() => togglePausa(row.inscripcionId, row.alumnoId)}
                    className="h-4 w-4 rounded border-neutral-300 text-warning-500 focus:ring-warning-500"
                  />
                  En pausa
                </label>
```

- [ ] **Step 4: Verificar build**

Run (desde `frontend/`): `npm run build`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/api/_handlers/turnos/id/inscritos.ts frontend/src/pages/profesor/Asistencia.tsx
git commit -m "feat(metricas): profesor can mark alumno en pausa; fix asistencia loading"
```

---

### Task 10: Docs — ARCHITECTURE + PLAN

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `docs/PLAN.md`

- [ ] **Step 1: Actualizar `docs/PLAN.md`**

En `docs/PLAN.md`:
- Mover "Dashboard de métricas Admin" de pendientes a Hecho.
- En la sección de deuda, marcar resuelto el contrato de `/stats/dashboard`.
- Agregar una nueva línea de deuda descubierta:
  `- **Contratos frontend↔API desalineados.** Varios handlers post-migración devuelven arrays crudos o \`{data,total}\` mientras los servicios esperan \`{items,...}\` (ej. \`/turnos/:id/inscritos\`, \`/turnos/:id/asistencias\`, \`/usuarios\`). Asistencia quedó arreglada en el dashboard sub-proyecto; el resto sigue pendiente.`

- [ ] **Step 2: Actualizar `ARCHITECTURE.md`**

En `ARCHITECTURE.md` §7 (Modelo de datos), en la descripción de `usuarios`, agregar
los campos `en_pausa` (pausa temporal marcada por profesor) y `baja_at` (fecha de
baja). En §11/§12 no hace falta cambio.

- [ ] **Step 3: Verificar y commit**

Run (desde la raíz del worktree): `rg -c "en_pausa|Contratos frontend" docs/PLAN.md`
Expected: ≥ 1.

```bash
git add ARCHITECTURE.md docs/PLAN.md
git commit -m "docs: mark admin dashboard done and record contract debt"
```

---

## Self-Review (cobertura del spec)

- Spec §6 (migración en_pausa/baja_at) → T1. ✅
- Spec §7 (feature en pausa: endpoint + toggle-activo baja_at + checkbox profesor) → T2, T9. ✅
- Spec §8.1 (/stats/dashboard arreglado + ampliado, rol admin) → T3. ✅
- Spec §8.2 (horarios-pico) → T4. ✅
- Spec §8.3 (retencion) → T5. ✅
- Spec §8.4 (listas accionables) → embebidas en /stats/dashboard (T3) + navegación a /admin/usuarios?search= (T8). *(Refina M4: en vez de reusar /usuarios —cuyo shape está desalineado— las listas van embebidas; más robusto.)*
- Spec §9 (dashboard viz: cards, semanal, heatmap, retención, listas) → T8. ✅
- Spec §10 (testing API TDD + frontend build) → T2–T5 (TDD), T7–T9 (build). ✅
- Spec §11 M5 (quitar recepcionista de /stats/dashboard) → T3 (requireRole(['admin'])). ✅
- Rutas nuevas → T6. Servicios → T7. Docs → T10. ✅
