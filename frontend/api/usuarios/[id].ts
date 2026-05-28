import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound, forbidden } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    if (auth.rol === 'alumno' && auth.id !== id) return forbidden(res)

    const { data, error } = await adminClient.from('usuarios').select('*').eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT') {
    if (auth.rol !== 'admin' && auth.id !== id) return forbidden(res)

    const allowedFields = auth.rol === 'admin'
      ? ['nombre', 'apellido', 'telefono', 'dni', 'fecha_nacimiento', 'rol', 'activo', 'creditos']
      : ['nombre', 'apellido', 'telefono']

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) updates[field] = req.body[field]
    }

    const { data, error } = await adminClient
      .from('usuarios').update(updates).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
