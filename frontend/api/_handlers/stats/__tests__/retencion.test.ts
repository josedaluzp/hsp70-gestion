import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../_lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('../../../_lib/supabase', () => ({ adminClient: { from: vi.fn() } }))

import { requireRole } from '../../../_lib/auth'
import { adminClient } from '../../../_lib/supabase'
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
