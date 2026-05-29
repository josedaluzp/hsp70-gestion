import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth, requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const { actividad_id, dia_semana, activo } = req.query
    let query = adminClient.from('turnos').select(`
      *,
      actividad:actividades(id, nombre, cupo_maximo),
      profesor:usuarios!turnos_profesor_id_fkey(id, nombre, apellido)
    `).order('dia_semana').order('hora_inicio')

    if (actividad_id) query = query.eq('actividad_id', actividad_id as string)
    if (dia_semana) query = query.eq('dia_semana', dia_semana as string)
    if (activo !== undefined) query = query.eq('activo', activo === 'true')

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    const { actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin, sala } = req.body ?? {}
    if (!actividad_id || !profesor_id || !dia_semana || !hora_inicio || !hora_fin) {
      return badRequest(res, 'actividad_id, profesor_id, dia_semana, hora_inicio y hora_fin son requeridos')
    }

    const { data, error } = await adminClient.from('turnos').insert({
      actividad_id, profesor_id, dia_semana, hora_inicio, hora_fin, sala: sala ?? null
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
