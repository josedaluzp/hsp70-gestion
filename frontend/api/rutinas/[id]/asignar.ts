import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor'])
  if (!auth) return

  const { id } = req.query as { id: string }
  const { alumno_id } = req.body ?? {}
  if (!alumno_id) return badRequest(res, 'alumno_id es requerido')

  if (req.method === 'POST') {
    const { data, error } = await adminClient.from('rutinas_alumnos').insert({
      rutina_id: parseInt(id), alumno_id
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'DELETE') {
    const { error } = await adminClient.from('rutinas_alumnos')
      .delete().eq('rutina_id', id).eq('alumno_id', alumno_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
