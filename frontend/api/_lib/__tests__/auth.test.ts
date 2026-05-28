import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../supabase', () => ({
  adminClient: {
    auth: { getUser: vi.fn() },
    from: vi.fn()
  }
}))

import { adminClient } from '../supabase'
import { verifyToken } from '../auth'

const mockReq = (token?: string) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {}
} as any)

describe('verifyToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when no authorization header', async () => {
    const result = await verifyToken(mockReq())
    expect(result).toBeNull()
  })

  it('returns null when token is invalid', async () => {
    vi.mocked(adminClient.auth.getUser).mockResolvedValue({
      data: { user: null }, error: new Error('invalid')
    } as any)
    const result = await verifyToken(mockReq('bad-token'))
    expect(result).toBeNull()
  })

  it('returns null when user is inactive', async () => {
    vi.mocked(adminClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'uuid-1' } }, error: null
    } as any)
    const selectMock = { data: { id: 'uuid-1', rol: 'alumno', activo: false }, error: null }
    vi.mocked(adminClient.from).mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve(selectMock) }) })
    } as any)
    const result = await verifyToken(mockReq('token'))
    expect(result).toBeNull()
  })

  it('returns user when token is valid and user is active', async () => {
    vi.mocked(adminClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'uuid-1' } }, error: null
    } as any)
    const selectMock = { data: { id: 'uuid-1', rol: 'alumno', activo: true }, error: null }
    vi.mocked(adminClient.from).mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve(selectMock) }) })
    } as any)
    const result = await verifyToken(mockReq('good-token'))
    expect(result).toEqual({ id: 'uuid-1', rol: 'alumno', activo: true })
  })
})
