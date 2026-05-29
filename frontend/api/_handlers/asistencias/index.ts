import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { inscripcion_id, fecha, presente, observacion } = req.body ?? {}
  if (!inscripcion_id || !fecha) return badRequest(res, 'inscripcion_id y fecha son requeridos')

  const { data, error } = await adminClient.from('asistencias').upsert({
    inscripcion_id, fecha, presente: presente ?? false, observacion: observacion ?? null
  }, { onConflict: 'inscripcion_id,fecha' }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
}
