import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../_lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('../../../_lib/supabase', () => ({ adminClient: { from: vi.fn() } }))

import { requireRole } from '../../../_lib/auth'
import { adminClient } from '../../../_lib/supabase'
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
      order: () => builder,
      limit: () => builder,
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
