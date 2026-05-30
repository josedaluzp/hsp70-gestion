import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../_lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('../../../_lib/supabase', () => ({ adminClient: { from: vi.fn() } }))

import { requireRole } from '../../../_lib/auth'
import { adminClient } from '../../../_lib/supabase'
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
