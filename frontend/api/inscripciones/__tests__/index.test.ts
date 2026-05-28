import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../_lib/supabase', () => ({
  adminClient: { rpc: vi.fn() }
}))
vi.mock('../../_lib/auth', () => ({
  requireAuth: vi.fn()
}))

import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import handler from '../index'

function mockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('POST /api/inscripciones', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 405 for GET', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    const res = mockRes()
    await handler({ method: 'GET', query: {}, body: {}, headers: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 400 when missing turno_id', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: {}, headers: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('calls RPC and returns 201 on successful enrollment', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    vi.mocked(adminClient.rpc).mockResolvedValue({
      data: { resultado: 'inscripto', inscripcion_id: 42 }, error: null
    } as any)
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { turno_id: 1 }, headers: {} } as any, res)
    expect(adminClient.rpc).toHaveBeenCalledWith('inscribir_alumno', { p_alumno_id: 'a1', p_turno_id: 1 })
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('returns 200 with lista_espera result', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    vi.mocked(adminClient.rpc).mockResolvedValue({
      data: { resultado: 'en_lista_espera', posicion: 2 }, error: null
    } as any)
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { turno_id: 1 }, headers: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('returns 400 when alumno has no credits', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    vi.mocked(adminClient.rpc).mockResolvedValue({
      data: null, error: { message: 'sin_creditos' }
    } as any)
    const res = mockRes()
    await handler({ method: 'POST', query: {}, body: { turno_id: 1 }, headers: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Créditos insuficientes' })
  })

  it('returns 403 when alumno tries to enroll another alumno', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: 'a1', rol: 'alumno', activo: true })
    const res = mockRes()
    await handler({
      method: 'POST', query: {}, body: { turno_id: 1, alumno_id: 'other-id' }, headers: {}
    } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
