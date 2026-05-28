import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const { grupo_muscular } = req.query
    let query = adminClient.from('ejercicios').select('*').order('nombre')
    if (grupo_muscular) query = query.eq('grupo_muscular', grupo_muscular as string)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const staffCheck = await requireRole(req, res, ['admin', 'profesor'])
    if (!staffCheck) return

    const { nombre, descripcion, grupo_muscular, video_url } = req.body ?? {}
    if (!nombre) return badRequest(res, 'nombre es requerido')

    const { data, error } = await adminClient.from('ejercicios').insert({
      nombre,
      descripcion: descripcion ?? null,
      grupo_muscular: grupo_muscular ?? null,
      video_url: video_url ?? null
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
