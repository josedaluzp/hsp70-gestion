import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../_lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('../../../../_lib/supabase', () => ({
  adminClient: { from: vi.fn() },
}))

import { requireRole } from '../../../../_lib/auth'
import { adminClient } from '../../../../_lib/supabase'
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
