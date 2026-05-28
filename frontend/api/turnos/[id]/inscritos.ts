import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data, error } = await adminClient.from('inscripciones').select(`
    id, estado, fecha_inscripcion,
    alumno:usuarios!inscripciones_alumno_id_fkey(id, nombre, apellido, email, dni)
  `).eq('turno_id', id).eq('estado', 'activa').order('fecha_inscripcion')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
