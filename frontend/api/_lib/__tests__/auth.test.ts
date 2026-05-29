import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../auth0', () => ({ verifyAuth0Token: vi.fn() }))
vi.mock('../supabase', () => ({ adminClient: { from: vi.fn() } }))

import { verifyAuth0Token } from '../auth0'
import { adminClient } from '../supabase'
import { verifyToken } from '../auth'

const mockReq = (token?: string) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
} as any)

// Builds a chainable mock for adminClient.from('usuarios')
function mockUsuarios(opts: {
  byEmail?: any            // row returned by .select().eq('email').maybeSingle()
  insertResult?: any       // row returned by .insert().select().single()
  updateResult?: any       // row returned by .update().eq().select().single()
}) {
  vi.mocked(adminClient.from).mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: opts.byEmail ?? null, error: null }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: opts.insertResult ?? null, error: opts.insertResult ? null : new Error('x') }),
      }),
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: opts.updateResult ?? null, error: opts.updateResult ? null : new Error('x') }),
        }),
      }),
    }),
  } as any)
}

describe('verifyToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AUTH0_DOMAIN = 'tenant.us.auth0.com'
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns null when no authorization header', async () => {
    expect(await verifyToken(mockReq())).toBeNull()
  })

  it('returns null when the Auth0 token is invalid', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue(null)
    expect(await verifyToken(mockReq('bad'))).toBeNull()
  })

  it('returns the existing user mapped by auth0_sub', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|1', payload: {} } as any)
    // First .from() call: lookup by auth0_sub
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: () =>
        Promise.resolve({ data: { id: 'u1', rol: 'admin', activo: true }, error: null }) }) }),
    } as any)
    const result = await verifyToken(mockReq('good'))
    expect(result).toEqual({ id: 'u1', rol: 'admin', activo: true })
  })

  it('returns null when the mapped user is inactive', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|1', payload: {} } as any)
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: () =>
        Promise.resolve({ data: { id: 'u1', rol: 'alumno', activo: false }, error: null }) }) }),
    } as any)
    expect(await verifyToken(mockReq('good'))).toBeNull()
  })

  it('provisions by relinking an existing row with matching email (preserves rol)', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|new', payload: {} } as any)
    // 1st from(): lookup by auth0_sub → not found
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    } as any)
    // userinfo returns the email of an existing seed admin
    vi.mocked(fetch as any).mockResolvedValue({ ok: true, json: () =>
      Promise.resolve({ email: 'admin@hsp70.com', name: 'Admin User' }) })
    // 2nd from(): lookup by email → existing row with rol admin and no auth0_sub
    // 3rd from(): update → returns the relinked row
    vi.mocked(adminClient.from)
      .mockReturnValueOnce({
        select: () => ({ eq: () => ({ maybeSingle: () =>
          Promise.resolve({ data: { id: 'u9', rol: 'admin', activo: true, auth0_sub: null }, error: null }) }) }),
      } as any)
      .mockReturnValueOnce({
        update: () => ({ eq: () => ({ select: () => ({ single: () =>
          Promise.resolve({ data: { id: 'u9', rol: 'admin', activo: true }, error: null }) }) }) }),
      } as any)
    const result = await verifyToken(mockReq('good'))
    expect(result).toEqual({ id: 'u9', rol: 'admin', activo: true })
  })

  it('provisions a new alumno when no row exists for the email', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|new', payload: {} } as any)
    vi.mocked(fetch as any).mockResolvedValue({ ok: true, json: () =>
      Promise.resolve({ email: 'nuevo@x.com', given_name: 'Ana', family_name: 'Gómez' }) })
    vi.mocked(adminClient.from)
      .mockReturnValueOnce({ // lookup by auth0_sub → none
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      } as any)
      .mockReturnValueOnce({ // lookup by email → none
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      } as any)
      .mockReturnValueOnce({ // insert → new row
        insert: () => ({ select: () => ({ single: () =>
          Promise.resolve({ data: { id: 'u10', rol: 'alumno', activo: true }, error: null }) }) }),
      } as any)
    const result = await verifyToken(mockReq('good'))
    expect(result).toEqual({ id: 'u10', rol: 'alumno', activo: true })
  })

  it('returns null when userinfo has no email', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|new', payload: {} } as any)
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    } as any)
    vi.mocked(fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    expect(await verifyToken(mockReq('good'))).toBeNull()
  })
})
