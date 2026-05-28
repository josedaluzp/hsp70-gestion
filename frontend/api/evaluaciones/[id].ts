import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { data, error } = await adminClient.from('evaluaciones').select(`
    *,
    profesor:usuarios!evaluaciones_profesor_id_fkey(id, nombre, apellido)
  `).eq('id', id).single()

  if (error || !data) return notFound(res)
  if (auth.rol === 'alumno' && data.alumno_id !== auth.id) {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  return res.status(200).json(data)
}
