import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { fecha } = req.query
  if (!fecha) return badRequest(res, 'fecha es requerida (YYYY-MM-DD)')

  const { data, error } = await adminClient.from('asistencias').select(`
    id, fecha, presente, observacion,
    inscripcion:inscripciones!asistencias_inscripcion_id_fkey(
      id,
      alumno:usuarios!inscripciones_alumno_id_fkey(id, nombre, apellido)
    )
  `).eq('fecha', fecha as string).eq('inscripcion.turno_id', id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
