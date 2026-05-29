import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'JWKS'),
  jwtVerify: vi.fn(),
}))

import { jwtVerify } from 'jose'
import { verifyAuth0Token } from '../auth0'

describe('verifyAuth0Token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AUTH0_DOMAIN = 'tenant.us.auth0.com'
    process.env.AUTH0_AUDIENCE = 'https://api.hsp70'
  })

  it('returns sub + payload when jose verifies the token', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'auth0|1', foo: 'bar' } } as any)
    const result = await verifyAuth0Token('good')
    expect(result).toEqual({ sub: 'auth0|1', payload: { sub: 'auth0|1', foo: 'bar' } })
  })

  it('passes the correct issuer and audience to jwtVerify', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'auth0|1' } } as any)
    await verifyAuth0Token('good')
    expect(jwtVerify).toHaveBeenCalledWith('good', 'JWKS', {
      issuer: 'https://tenant.us.auth0.com/',
      audience: 'https://api.hsp70',
    })
  })

  it('returns null when jose throws (invalid token)', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid signature'))
    const result = await verifyAuth0Token('bad')
    expect(result).toBeNull()
  })

  it('returns null when payload has no sub', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { foo: 'bar' } } as any)
    const result = await verifyAuth0Token('nosub')
    expect(result).toBeNull()
  })
})
