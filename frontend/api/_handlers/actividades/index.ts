import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth, requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const { activa } = req.query
    let query = adminClient.from('actividades').select('*').order('nombre')
    if (activa !== undefined) query = query.eq('activa', activa === 'true')
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    const { nombre, descripcion, cupo_maximo, duracion_min } = req.body ?? {}
    if (!nombre || !cupo_maximo || !duracion_min) {
      return badRequest(res, 'nombre, cupo_maximo y duracion_min son requeridos')
    }

    const { data, error } = await adminClient.from('actividades').insert({
      nombre, descripcion: descripcion ?? null, cupo_maximo, duracion_min
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
