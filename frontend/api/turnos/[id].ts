import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('turnos').select(`
      *,
      actividad:actividades(id, nombre, cupo_maximo, duracion_min),
      profesor:usuarios!turnos_profesor_id_fkey(id, nombre, apellido)
    `).eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('turnos').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin, sala, activo } = req.body ?? {}
    const { data, error } = await adminClient.from('turnos').update({
      actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin, sala, activo
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
