import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'recepcionista'])
  if (!auth) return

  if (req.method === 'GET') {
    const { rol, activo, search, page = '1', limit = '20' } = req.query
    let query = adminClient.from('usuarios').select('*', { count: 'exact' })

    if (rol) query = query.eq('rol', rol as string)
    if (activo !== undefined) query = query.eq('activo', activo === 'true')
    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    const pageNum = parseInt(page as string) || 1
    const limitNum = Math.min(parseInt(limit as string) || 20, 100)
    query = query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1)
    query = query.order('apellido')

    const { data, error, count } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data, total: count, page: pageNum, limit: limitNum })
  }

  if (req.method === 'POST') {
    if (auth.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear usuarios' })

    const { nombre, apellido, email, password, rol, telefono, dni, fecha_nacimiento } = req.body ?? {}
    if (!nombre || !apellido || !email || !password || !rol) {
      return badRequest(res, 'nombre, apellido, email, password y rol son requeridos')
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido }
    })
    if (error) return res.status(400).json({ error: error.message })

    await adminClient.from('usuarios').update({
      rol,
      telefono: telefono ?? null,
      dni: dni ?? null,
      fecha_nacimiento: fecha_nacimiento ?? null
    }).eq('id', data.user!.id)

    const { data: usuario } = await adminClient
      .from('usuarios').select('*').eq('id', data.user!.id).single()
    return res.status(201).json(usuario)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
