import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../_lib/supabase', () => ({
  adminClient: { from: vi.fn() }
}))
vi.mock('../../_lib/auth', () => ({
  requireRole: vi.fn()
}))

import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import handler from '../index'

function mockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

function mockReq(method: string, query = {}, body = {}) {
  return { method, query, body, headers: {} } as any
}

describe('GET /api/usuarios', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns early when not authenticated', async () => {
    vi.mocked(requireRole).mockResolvedValue(null)
    const res = mockRes()
    await handler(mockReq('GET'), res)
    expect(requireRole).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(200)
  })

  it('returns paginated list when authenticated as admin', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'admin-id', rol: 'admin', activo: true })
    const mockData = [{ id: 'u1', nombre: 'Test', apellido: 'User' }]
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 })
    }
    vi.mocked(adminClient.from).mockReturnValue(chainMock as any)

    const res = mockRes()
    await handler(mockReq('GET'), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: mockData, total: 1 })
    )
  })

  it('filters by rol when provided', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'admin-id', rol: 'admin', activo: true })
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
    }
    vi.mocked(adminClient.from).mockReturnValue(chainMock as any)

    const res = mockRes()
    await handler(mockReq('GET', { rol: 'alumno' }), res)
    expect(chainMock.eq).toHaveBeenCalledWith('rol', 'alumno')
  })

  it('returns 405 for unsupported method', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'admin-id', rol: 'admin', activo: true })
    const res = mockRes()
    await handler(mockReq('DELETE'), res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
