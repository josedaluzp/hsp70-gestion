import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data, error } = await adminClient.from('rutinas_alumnos').select(`
    id, asignada_at,
    alumno:usuarios!rutinas_alumnos_alumno_id_fkey(id, nombre, apellido, email)
  `).eq('rutina_id', id).order('asignada_at')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
