import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from './supabase'
import { verifyAuth0Token } from './auth0'
import type { AuthenticatedUser, RolUsuario } from './types'
import { unauthorized, forbidden } from './errors'

function bearer(req: VercelRequest): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

interface UserInfo {
  email?: string
  name?: string
  given_name?: string
  family_name?: string
}

async function fetchUserInfo(token: string): Promise<UserInfo | null> {
  const domain = process.env.AUTH0_DOMAIN
  if (!domain) return null
  const res = await fetch(`https://${domain}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json() as Promise<UserInfo>
}

function splitName(info: UserInfo): { nombre: string; apellido: string } {
  const nombre = info.given_name ?? info.name?.split(' ')[0] ?? 'Usuario'
  const apellido = info.family_name ?? info.name?.split(' ').slice(1).join(' ') ?? ''
  return { nombre, apellido }
}

function toAuthUser(row: { id: string; rol: string; activo: boolean }): AuthenticatedUser | null {
  if (!row.activo) return null
  return { id: row.id, rol: row.rol as RolUsuario, activo: row.activo }
}

// First login: relink an existing row by email (preserving its rol), or create a new alumno.
async function provisionUser(sub: string, token: string): Promise<AuthenticatedUser | null> {
  const info = await fetchUserInfo(token)
  if (!info?.email) return null

  const { data: existing } = await adminClient
    .from('usuarios')
    .select('id, rol, activo, auth0_sub')
    .eq('email', info.email)
    .maybeSingle()

  if (existing) {
    if (existing.auth0_sub && existing.auth0_sub !== sub) return null // email taken by another identity
    const { data: relinked, error } = await adminClient
      .from('usuarios')
      .update({ auth0_sub: sub })
      .eq('id', existing.id)
      .select('id, rol, activo')
      .single()
    if (error || !relinked) return null
    return toAuthUser(relinked)
  }

  const { nombre, apellido } = splitName(info)
  const { data: created, error } = await adminClient
    .from('usuarios')
    .insert({ auth0_sub: sub, email: info.email, nombre, apellido, rol: 'alumno' })
    .select('id, rol, activo')
    .single()
  if (error || !created) return null
  return toAuthUser(created)
}

export async function verifyToken(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const token = bearer(req)
  if (!token) return null

  const claims = await verifyAuth0Token(token)
  if (!claims) return null

  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('id, rol, activo')
    .eq('auth0_sub', claims.sub)
    .maybeSingle()

  if (usuario) return toAuthUser(usuario)

  return provisionUser(claims.sub, token)
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthenticatedUser | null> {
  const user = await verifyToken(req)
  if (!user) {
    unauthorized(res)
    return null
  }
  return user
}

export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  roles: RolUsuario[],
): Promise<AuthenticatedUser | null> {
  const user = await requireAuth(req, res)
  if (!user) return null
  if (!roles.includes(user.rol)) {
    forbidden(res)
    return null
  }
  return user
}
