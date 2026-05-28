import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from './supabase'
import type { AuthenticatedUser, RolUsuario } from './types'
import { unauthorized, forbidden } from './errors'

export async function verifyToken(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await adminClient.auth.getUser(token)
  if (error || !user) return null

  const { data: usuario, error: dbError } = await adminClient
    .from('usuarios')
    .select('id, rol, activo')
    .eq('id', user.id)
    .single()

  if (dbError || !usuario) return null
  if (!usuario.activo) return null

  return { id: usuario.id, rol: usuario.rol as RolUsuario, activo: usuario.activo }
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
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
  roles: RolUsuario[]
): Promise<AuthenticatedUser | null> {
  const user = await requireAuth(req, res)
  if (!user) return null

  if (!roles.includes(user.rol)) {
    forbidden(res)
    return null
  }
  return user
}
